import { Injectable } from '@nestjs/common';
import type {
  AppointmentRepository,
  AppointmentReadProjection,
  Appointment,
  AppointmentCreateInput,
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
          const conflicting = await tx.appointment.findFirst({
            where: {
              tenantId,
              organisationId,
              facilityId,
              providerId: input.providerId,
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
}
