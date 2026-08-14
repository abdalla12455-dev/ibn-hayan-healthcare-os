import { Injectable } from '@nestjs/common';
import type {
  PatientIdentifier,
  PatientIdentifierRepository,
  PatientIdentifierType,
  PatientId,
  TenantId,
} from '@ibn-hayan/domain';
import {
  normalizeIdentifierValue,
  isDeterministicIdentifierType,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { patientIdentifierFromPrisma } from '../mappers/patient-identifier.mapper.js';

/**
 * Maximum number of retries for SERIALIZABLE transaction conflicts.
 * Matches the appointment, encounter, and patient repositories.
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
 * Prisma-backed implementation of {@link PatientIdentifierRepository} from
 * `@ibn-hayan/domain`.
 *
 * Identifiers are tenant-scoped and patient-scoped. Duplicate prevention
 * (architecture gate 6H): NationalID and Passport have a partial unique
 * index on `(tenant_id, type, normalized_value)`. The value is normalised
 * (trimmed + uppercased for NationalID and Passport) before storage so
 * deterministic duplicate detection is robust to case/whitespace
 * variation.
 *
 * Per architecture gate 6O, sensitive identifier values are NEVER placed
 * in audit metadata or application logs. This repository does not log
 * values; the service layer excludes them from audit metadata, and the
 * audit metadata forbidden-key detector enforces this at emission time.
 */
@Injectable()
export class PrismaPatientIdentifierRepository implements PatientIdentifierRepository {
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

  async add(
    tenantId: TenantId,
    patientId: PatientId,
    type: string,
    value: string,
    issuingCountry?: string | null,
  ): Promise<
    | { readonly outcome: 'added'; readonly identifier: PatientIdentifier }
    | { readonly outcome: 'duplicate'; readonly identifier: PatientIdentifier }
  > {
    const identifierType = type as PatientIdentifierType;
    const normalizedValue = normalizeIdentifierValue(identifierType, value);

    const transactionLogic = async () => {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // For deterministic identifier types (NationalID, Passport),
          // check for an existing identifier with the same type and
          // normalised value in the same tenant. The partial unique index
          // provides database-level enforcement; the explicit check returns
          // the existing identifier so the service can map the error
          // without a second read. Under SERIALIZABLE isolation, two
          // concurrent adds with the same deterministic value both see "no
          // existing" initially, but the second insert hits the partial
          // unique index and the transaction is retried; on retry the
          // committed identifier is observed and the result resolves as
          // duplicate.
          if (isDeterministicIdentifierType(identifierType)) {
            const existing = await tx.patientIdentifier.findFirst({
              where: {
                tenantId,
                type: identifierType,
                normalizedValue,
              },
            });
            if (existing !== null) {
              return {
                outcome: 'duplicate' as const,
                identifier: patientIdentifierFromPrisma(existing),
              };
            }
          }

          const created = await tx.patientIdentifier.create({
            data: {
              tenantId,
              patientId,
              type: identifierType,
              normalizedValue,
              issuingCountry: issuingCountry ?? null,
            },
          });

          return {
            outcome: 'added' as const,
            identifier: patientIdentifierFromPrisma(created),
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

  async findByTypeAndValue(
    tenantId: TenantId,
    type: string,
    normalizedValue: string,
  ): Promise<PatientIdentifier | null> {
    const row = await this.prisma.patientIdentifier.findFirst({
      where: {
        tenantId,
        type: type as PatientIdentifierType,
        normalizedValue,
      },
    });
    return row ? patientIdentifierFromPrisma(row) : null;
  }

  async listForPatient(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<readonly PatientIdentifier[]> {
    // Tenant-scoped: a patient in another tenant returns an empty array
    // (no existence leak). The patientId + tenantId both filter.
    const rows = await this.prisma.patientIdentifier.findMany({
      where: { tenantId, patientId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => patientIdentifierFromPrisma(row));
  }
}
