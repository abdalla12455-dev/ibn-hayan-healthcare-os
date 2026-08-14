import { Injectable } from '@nestjs/common';
import type {
  PatientConsent,
  PatientConsentRepository,
  PatientConsentId,
  GrantTreatmentConsentInput,
  GrantTreatmentConsentResult,
  WithdrawTreatmentConsentResult,
  PatientId,
  TenantId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { patientConsentFromPrisma } from '../mappers/patient-consent.mapper.js';

/**
 * Maximum number of retries for SERIALIZABLE transaction conflicts.
 * Matches the appointment, encounter, patient, and identifier
 * repositories.
 */
const MAX_SERIALIZATION_RETRIES = 3;
const RETRY_DELAY_MS = 50;

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
 * Prisma-backed implementation of {@link PatientConsentRepository} from
 * `@ibn-hayan/domain`.
 *
 * Consent expiry / unique-constraint gate (architecture gate 6J): the
 * one-active-treatment-consent invariant is enforced by a partial unique
 * index on `(tenant_id, patient_id) WHERE consent_type = 'treatment' AND
 * status = 'granted'` (created by the migration). The
 * transactional reconciliation-before-grant strategy (run by the grant
 * method within a SERIALIZABLE transaction) ensures expired rows
 * transition to `status = 'expired'` BEFORE a new granted record is
 * inserted, so re-consent after expiry works. No NOW()/current-time
 * predicate is used in the partial unique index (the predicate is
 * `status = 'granted'`, immutable per-row state). Concurrent grant
 * requests cannot create two active treatment consents: the partial
 * unique index catches the second insert; the SERIALIZABLE retry
 * re-observes the committed granted row and resolves as
 * `duplicate_active_consent`.
 */
@Injectable()
export class PrismaPatientConsentRepository implements PatientConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async grant(
    tenantId: TenantId,
    input: GrantTreatmentConsentInput,
  ): Promise<GrantTreatmentConsentResult> {
    const transactionLogic = async (): Promise<GrantTreatmentConsentResult> => {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const now = new Date();

          // 1. Reconcile: transition any existing granted treatment
          //    consent whose `expiresAt < now` to `status = 'expired'`.
          //    This ensures an expired row transitions durably to
          //    `expired` BEFORE the new granted record is inserted, so
          //    the expired row no longer occupies the partial unique
          //    index and does not block legitimate re-consent
          //    (architecture gate 6J). The reconciliation is conditional
          //    on `status = 'granted'` AND `expiresAt < now` so only
          //    truly-expired rows are transitioned.
          await tx.patientConsent.updateMany({
            where: {
              tenantId,
              patientId: input.patientId,
              consentType: 'treatment',
              status: 'granted',
              expiresAt: { lt: now },
            },
            data: { status: 'expired' },
          });

          // 2. Check for an existing granted treatment consent. After
          //    reconciliation, any remaining granted row is not expired
          //    (its expiresAt >= now, or it is indefinite). If one
          //    exists, return duplicate_active_consent. Under
          //    SERIALIZABLE isolation, two concurrent grants both see
          //    "no existing" initially, but the second insert hits the
          //    partial unique index and the transaction is retried; on
          //    retry the committed granted row is observed and the
          //    result resolves as duplicate_active_consent.
          const existing = await tx.patientConsent.findFirst({
            where: {
              tenantId,
              patientId: input.patientId,
              consentType: 'treatment',
              status: 'granted',
            },
          });
          if (existing !== null) {
            return {
              outcome: 'duplicate_active_consent' as const,
              consent: patientConsentFromPrisma(existing),
            };
          }

          // 3. Insert the new granted treatment consent. The partial
          //    unique index catches a concurrent insert (the loser
          //    retries, re-observes the committed granted row, and
          //    resolves as duplicate_active_consent).
          const created = await tx.patientConsent.create({
            data: {
              tenantId,
              patientId: input.patientId,
              consentType: 'treatment',
              status: 'granted',
              scope: input.scope,
              duration: input.duration,
              grantedAt: now,
              expiresAt: input.expiresAt ?? null,
              capturedBy: input.capturedBy,
              captureMethod: input.captureMethod,
              policyVersion: input.policyVersion,
              guardianName: input.guardianName ?? null,
              guardianRelationship: input.guardianRelationship ?? null,
              guardianCaptureMethod: input.guardianCaptureMethod ?? null,
            },
          });

          return {
            outcome: 'granted' as const,
            consent: patientConsentFromPrisma(created),
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

  async withdraw(
    tenantId: TenantId,
    patientId: PatientId,
    consentId: PatientConsentId,
  ): Promise<WithdrawTreatmentConsentResult> {
    const transactionLogic =
      async (): Promise<WithdrawTreatmentConsentResult> => {
        const result = await this.prisma.$transaction(
          async (tx) => {
            // Tenant-scoped + patient-scoped lookup. A consent in another
            // tenant/patient returns not_found (no existence leak).
            const row = await tx.patientConsent.findFirst({
              where: { id: consentId, tenantId, patientId },
            });
            if (row === null) {
              return { outcome: 'not_found' as const };
            }
            if (row.status === 'withdrawn') {
              // Idempotent no-op: an already-withdrawn consent is a no-op
              // (no mutation, the service emits no audit event).
              return {
                outcome: 'already_withdrawn' as const,
                consent: patientConsentFromPrisma(row),
              };
            }
            if (row.status !== 'granted') {
              // A non-granted consent (e.g. expired) cannot be withdrawn.
              return {
                outcome: 'not_granted' as const,
              };
            }

            // Transition granted → withdrawn. The record is retained
            // (history-preserving; no delete). The withdrawnAt timestamp
            // is recorded.
            const updated = await tx.patientConsent.update({
              where: { id: consentId },
              data: {
                status: 'withdrawn',
                withdrawnAt: new Date(),
              },
            });

            return {
              outcome: 'withdrawn' as const,
              consent: patientConsentFromPrisma(updated),
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

  async listForPatient(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<readonly PatientConsent[]> {
    // Tenant-scoped: a patient in another tenant returns an empty array
    // (no existence leak). Returns ALL records (history-preserving), in
    // chronological order by grantedAt descending (most recent first).
    const rows = await this.prisma.patientConsent.findMany({
      where: { tenantId, patientId },
      orderBy: { grantedAt: 'desc' },
    });
    return rows.map((row) => patientConsentFromPrisma(row));
  }
}
