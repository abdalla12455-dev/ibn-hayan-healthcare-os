import { Injectable } from '@nestjs/common';
import type {
  AppointmentRepository,
  AppointmentReadProjection,
  Appointment,
  AppointmentCancelResult,
  AppointmentCreateInput,
  AppointmentId,
  TenantId,
  OrganisationId,
  FacilityId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import {
  appointmentRowFromPrisma,
  appointmentFromPrisma,
} from '../mappers/appointment.mapper.js';

/**
 * The canonical appointment statuses that do NOT reserve a provider's
 * time slot for overlap purposes.
 *
 * Per STATUS_CODES.md §4.1, `cancelled` and `no_show` are terminal
 * statuses whose slots are freed for rebooking:
 * - `cancelled`: "Appointment has been cancelled before arrival" —
 *   terminal; APPOINTMENTS.md §3.5 / §8.3 confirm a cancelled slot is
 *   offered to waitlist patients (the slot is freed).
 * - `no_show`: "Patient did not arrive and did not cancel" — terminal;
 *   APPOINTMENTS.md §7.3 confirms a no-show slot is recoverable
 *   (offered to waitlist, adjacent appointments extended).
 *
 * Only these two terminal statuses are excluded. Other terminal or
 * in-flight statuses (completed, in_progress, etc.) are NOT excluded
 * from overlap detection in this stage; they remain blocking. This is
 * the minimal status-exclusion correction required for cancellation to
 * free a slot for rebooking, and does NOT assume additional
 * non-blocking statuses beyond those verified against canonical
 * documentation.
 */
const NON_BLOCKING_STATUSES = ['cancelled', 'no_show'] as const;

/**
 * Error thrown when a provider has an overlapping appointment.
 */
export class AppointmentOverlapError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly conflictingAppointmentId: string,
  ) {
    super(
      `Provider ${providerId} has a conflicting appointment ${conflictingAppointmentId}`,
    );
    this.name = 'AppointmentOverlapError';
  }
}

/**
 * Maximum number of retries for SERIALIZABLE transaction conflicts.
 * P2034 errors are retried up to this many times.
 */
const MAX_SERIALIZATION_RETRIES = 3;

/**
 * Short delay between retries in milliseconds.
 * Keeps retries bounded while allowing the conflicting transaction to complete.
 */
const RETRY_DELAY_MS = 50;

/**
 * Checks if an error is a Prisma serialization/write conflict (P2034).
 */
function isSerializationConflict(error: unknown): boolean {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code: string }).code;
    return code === 'P2034';
  }
  return false;
}

/**
 * Sleep utility for bounded retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prisma-backed implementation of {@link AppointmentRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10, every read method takes tenantId,
 * organisationId, and facilityId as required parameters. The query
 * uses a half-open interval for the scheduled start time:
 * `scheduledStart >= startUtc AND scheduledStart < endUtc`.
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 *
 * The query uses a `select` clause to load only the fields required
 * by the AppointmentReadProjection, avoiding unnecessary column reads.
 *
 * Per Stage 1C, the create method implements concurrency-safe provider
 * overlap prevention using a transaction with SERIALIZABLE isolation.
 *
 * SERIALIZABLE transaction conflicts (Prisma P2034) are retried up to
 * {@link MAX_SERIALIZATION_RETRIES} times to handle concurrent overlapping
 * requests gracefully. On retry, the transaction re-executes, potentially
 * observing a newly committed conflicting appointment and throwing
 * {@link AppointmentOverlapError}.
 */
@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByScheduledStartRange(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    startUtc: Date,
    endUtc: Date,
  ): Promise<AppointmentReadProjection[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        organisationId,
        facilityId,
        scheduledStart: {
          gte: startUtc,
          lt: endUtc,
        },
      },
      orderBy: [{ scheduledStart: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        patientId: true,
        providerId: true,
        scheduledStart: true,
        scheduledEnd: true,
        status: true,
        typeCode: true,
      },
    });
    return rows.map(appointmentRowFromPrisma);
  }

  /**
   * Execute the SERIALIZABLE transaction with bounded retry for P2034 errors.
   *
   * The transaction logic is provided as a callback so it can be retried
   * on serialization conflicts.
   */
  private async executeWithSerializationRetry<T>(
    transactionLogic: () => Promise<T>,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await transactionLogic();
      } catch (error) {
        // If this is a serialization conflict and we have retries left, retry
        if (
          isSerializationConflict(error) &&
          attempt < MAX_SERIALIZATION_RETRIES
        ) {
          // Brief delay before retry to allow the conflicting transaction to complete
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        // For AppointmentOverlapError or any other error, propagate immediately
        throw error;
      }
    }
  }

  async create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: AppointmentCreateInput,
  ): Promise<Appointment> {
    const transactionLogic = async () => {
      // Use a transaction with SERIALIZABLE isolation for concurrency safety.
      // The overlap check and insert are atomic, preventing race conditions
      // where two concurrent requests could both create overlapping appointments.
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Check for overlapping appointments for the same provider.
          // Overlap condition: existingStart < requestedEnd AND existingEnd > requestedStart
          // This is the standard overlap rule. Adjacent appointments where
          // one ends exactly when another begins are NOT considered overlapping.
          //
          // Status-exclusion (Stage 1D): appointments in canonical
          // non-blocking terminal statuses (cancelled, no_show) do NOT
          // reserve the slot, so a cancelled or no_show appointment does
          // not block a new booking at the same time. See
          // NON_BLOCKING_STATUSES for the canonical rationale.
          const conflicting = await tx.appointment.findFirst({
            where: {
              tenantId,
              organisationId,
              facilityId,
              providerId: input.providerId,
              status: {
                notIn: [...NON_BLOCKING_STATUSES],
              },
              // Overlap: existingStart < requestedEnd AND existingEnd > requestedStart
              scheduledStart: {
                lt: input.scheduledEnd,
              },
              scheduledEnd: {
                gt: input.scheduledStart,
              },
            },
            select: {
              id: true,
            },
          });

          if (conflicting) {
            throw new AppointmentOverlapError(input.providerId, conflicting.id);
          }

          // Create the appointment
          const created = await tx.appointment.create({
            data: {
              tenantId,
              organisationId,
              facilityId,
              patientId: input.patientId,
              providerId: input.providerId,
              scheduledStart: input.scheduledStart,
              scheduledEnd: input.scheduledEnd,
              status: 'booked',
              typeCode: input.typeCode,
            },
          });

          return created;
        },
        {
          isolationLevel: 'Serializable',
        },
      );

      return result;
    };

    const result = await this.executeWithSerializationRetry(transactionLogic);
    return appointmentFromPrisma(result);
  }

  async findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    appointmentId: AppointmentId,
  ): Promise<Appointment | null> {
    const row = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
        organisationId,
        facilityId,
      },
    });
    return row === null ? null : appointmentFromPrisma(row);
  }

  async cancel(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    appointmentId: AppointmentId,
  ): Promise<AppointmentCancelResult> {
    const transactionLogic = async (): Promise<AppointmentCancelResult> => {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Scoped lookup: all three scope identifiers must match. An
          // appointment outside scope returns null, indistinguishable
          // from "does not exist" (no cross-scope existence leak).
          const row = await tx.appointment.findFirst({
            where: {
              id: appointmentId,
              tenantId,
              organisationId,
              facilityId,
            },
          });

          if (row === null) {
            return {
              outcome: 'not_found' as const,
            };
          }

          // Idempotent re-cancellation: already cancelled is a no-op.
          // No mutation, no timestamp/reason churn. The audit event is
          // NOT emitted for this case (the service uses `transitioned`
          // to decide).
          if (row.status === 'cancelled') {
            return {
              outcome: 'cancelled' as const,
              appointment: appointmentFromPrisma(row),
              transitioned: false,
            };
          }

          // Only `booked` is canonically cancellable in this stage.
          // Any other source state (confirmed, arrived, in_progress,
          // completed, no_show) is an invalid transition.
          if (row.status !== 'booked') {
            return {
              outcome: 'invalid_source_state' as const,
              appointment: appointmentFromPrisma(row),
            };
          }

          // Atomic conditional transition: only update rows still in
          // `booked`. Under SERIALIZABLE isolation, a concurrent
          // cancellation that already transitioned this row causes a
          // P2034 serialization conflict, which is retried by the
          // outer loop; on retry the row is observed as `cancelled`
          // and resolved as an idempotent success above. This
          // guarantees exactly one `transitioned: true` result per
          // appointment under concurrent cancellation.
          const updated = await tx.appointment.update({
            where: { id: appointmentId },
            data: { status: 'cancelled' },
          });

          return {
            outcome: 'cancelled' as const,
            appointment: appointmentFromPrisma(updated),
            transitioned: true,
          };
        },
        {
          isolationLevel: 'Serializable',
        },
      );

      return result;
    };

    return this.executeWithSerializationRetry(transactionLogic);
  }
}
