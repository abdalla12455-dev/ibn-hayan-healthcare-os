import { Injectable } from '@nestjs/common';
import type {
  Encounter,
  EncounterCreateInput,
  EncounterCreateResult,
  EncounterTransitionInput,
  EncounterTransitionResult,
  EncounterId,
  EncounterRepository,
  TenantId,
  OrganisationId,
  FacilityId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { encounterFromPrisma } from '../mappers/encounter.mapper.js';

/**
 * Maximum number of retries for SERIALIZABLE transaction conflicts.
 * P2034 / DriverAdapterError-TransactionWriteConflict errors are
 * retried up to this many times (3 total attempts), matching the
 * appointment repository. Do not regress this.
 */
const MAX_SERIALIZATION_RETRIES = 3;

/**
 * Short delay between retries in milliseconds. Keeps retries bounded
 * while allowing the conflicting transaction to complete.
 */
const RETRY_DELAY_MS = 50;

/**
 * Checks if an error is a Prisma serialization/write conflict that is
 * safe to retry under SERIALIZABLE isolation.
 *
 * Two error shapes must be recognised (per the concurrency contract
 * in the Stage 2A specification, items 8O and 12):
 *
 * 1. **Prisma known-request error** — `error.code === 'P2034'`. This
 *    is the canonical Prisma serialization-failure code.
 *
 * 2. **Driver-adapter error** — when the `@prisma/adapter-pg` driver
 *    adapter is in use, a PostgreSQL `SQLSTATE 40001` (serialization
 *    failure) is surfaced as a `DriverAdapterError` whose `cause` is
 *    `{ kind: 'TransactionWriteConflict' }`. This form does NOT carry
 *    a `P2034` code; without recognising it the conflict would escape
 *    as an HTTP 500 instead of being retried.
 */
function isSerializationConflict(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if ('code' in error && (error as { code: unknown }).code === 'P2034') {
    return true;
  }
  if (
    error.name === 'DriverAdapterError' &&
    typeof (error as { cause?: unknown }).cause === 'object' &&
    (error as { cause?: { kind?: unknown } }).cause?.kind ===
      'TransactionWriteConflict'
  ) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prisma-backed implementation of {@link EncounterRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10 (Tenant-Scope Requirements), every read
 * and write method takes tenantId, organisationId, and facilityId as
 * required parameters. An encounter outside the authenticated scope
 * is indistinguishable from "does not exist" (no cross-scope existence
 * leak).
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 *
 * Concurrency safety (Stage 2A specification items 8O and 12):
 *
 * Both `create` (for appointment-attached encounters) and
 * `transitionStatus` use a transaction with SERIALIZABLE isolation.
 * SERIALIZABLE transaction conflicts (Prisma P2034 and
 * `@prisma/adapter-pg` `DriverAdapterError` with `cause.kind ===
 * 'TransactionWriteConflict'`) are retried with a bounded retry loop
 * (MAX_SERIALIZATION_RETRIES = 3 total attempts). On retry, the
 * transaction re-executes and re-observes the committed state, so a
 * concurrently-created or concurrently-transitioned encounter is
 * resolved deterministically (one `created`/`transitioned` result;
 * the loser resolves as `duplicate_appointment`, `already_at_target`,
 * or `invalid_source_state`). No expected serialization conflict
 * escapes as an HTTP 500.
 *
 * The lifecycle transition is enforced at the persistence boundary:
 * a conditional `UPDATE ... WHERE id = ? AND status IN (...)` (via
 * the Prisma findFirst + update within the SERIALIZABLE transaction)
 * ensures the encounter's current status is one of the canonically
 * permitted source states before transitioning. Invalid transitions
 * are prevented here, not only at the controller/service layer.
 */
@Injectable()
export class PrismaEncounterRepository implements EncounterRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute the SERIALIZABLE transaction with bounded retry for
   * P2034 / DriverAdapterError-TransactionWriteConflict errors.
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
        if (
          isSerializationConflict(error) &&
          attempt < MAX_SERIALIZATION_RETRIES
        ) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw error;
      }
    }
  }

  async create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: EncounterCreateInput,
  ): Promise<EncounterCreateResult> {
    const transactionLogic = async (): Promise<EncounterCreateResult> => {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Duplicate prevention: when appointmentId is non-null, check
          // for an existing encounter for the same appointment in the
          // same tenant. The partial unique index
          // (encounters_tenant_id_appointment_id_key WHERE
          // appointment_id IS NOT NULL) provides the database-level
          // enforcement, but the explicit check here returns the
          // existing encounter so the service can map the error
          // without a second read. Under SERIALIZABLE isolation, two
          // concurrent creations for the same appointment both see
          // "no existing" initially, but the second insert hits the
          // partial unique index and the transaction is retried; on
          // retry, the now-committed encounter is observed and the
          // result resolves as duplicate_appointment.
          if (input.appointmentId !== null) {
            const existing = await tx.encounter.findFirst({
              where: {
                tenantId,
                appointmentId: input.appointmentId,
              },
            });
            if (existing !== null) {
              return {
                outcome: 'duplicate_appointment' as const,
                encounter: encounterFromPrisma(existing),
              };
            }
          }

          // Insert the new encounter in the canonical initial
          // `planned` status. The caller does NOT supply scope, status,
          // or actor; scope is derived from the authenticated context
          // and the status is always `planned` for a fresh encounter.
          const created = await tx.encounter.create({
            data: {
              tenantId,
              organisationId,
              facilityId,
              patientId: input.patientId,
              providerId: input.providerId,
              appointmentId: input.appointmentId,
              encounterType: input.encounterType,
              priority: input.priority,
              status: 'planned',
            },
          });

          return {
            outcome: 'created' as const,
            encounter: encounterFromPrisma(created),
            transitioned: true as const,
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

  async findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    encounterId: EncounterId,
  ): Promise<Encounter | null> {
    const row = await this.prisma.encounter.findFirst({
      where: {
        id: encounterId,
        tenantId,
        organisationId,
        facilityId,
      },
    });
    return row === null ? null : encounterFromPrisma(row);
  }

  async transitionStatus(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    encounterId: EncounterId,
    input: EncounterTransitionInput,
  ): Promise<EncounterTransitionResult> {
    const transactionLogic = async (): Promise<EncounterTransitionResult> => {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Scoped lookup: all three scope identifiers must match.
          // An encounter outside scope returns not_found,
          // indistinguishable from "does not exist" (no cross-scope
          // existence leak).
          const row = await tx.encounter.findFirst({
            where: {
              id: encounterId,
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

          // Idempotent terminal-target re-application (e.g. finishing
          // an already-finished encounter, or cancelling an
          // already-cancelled encounter). This mirrors the appointment
          // completion/cancellation idempotency: no mutation, no audit
          // event. The service sets
          // `idempotentIfAlreadyAtTarget: true` only for the terminal
          // `finished` and `cancelled` targets. A non-terminal
          // same-state re-application (e.g. arriving at an
          // already-arrived encounter) falls through to the
          // invalid_source_state branch below, because the same-state
          // edge is not in the canonical transition map.
          if (
            input.idempotentIfAlreadyAtTarget &&
            row.status === input.targetStatus
          ) {
            return {
              outcome: 'already_at_target' as const,
              encounter: encounterFromPrisma(row),
            };
          }

          // Validate the canonical source-state → target-state edge.
          // The encounter's current status must be one of the
          // canonically-permitted source states for this transition.
          // A non-terminal same-state re-application falls through
          // here: the current status equals the target, which is NOT
          // in the allowed source states (the same-state edge is not
          // in the canonical transition map), so it resolves as
          // invalid_source_state.
          if (!input.allowedSourceStates.includes(row.status)) {
            return {
              outcome: 'invalid_source_state' as const,
              encounter: encounterFromPrisma(row),
            };
          }

          // Atomic conditional transition: update the status to the
          // target. Under SERIALIZABLE isolation, a concurrent
          // transition that already changed this row causes a P2034
          // / DriverAdapterError conflict, which is retried by the
          // outer loop; on retry the row is re-observed at its
          // committed status and resolved deterministically above.
          const updated = await tx.encounter.update({
            where: { id: encounterId },
            data: { status: input.targetStatus },
          });

          return {
            outcome: 'transitioned' as const,
            encounter: encounterFromPrisma(updated),
            transitioned: true as const,
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
