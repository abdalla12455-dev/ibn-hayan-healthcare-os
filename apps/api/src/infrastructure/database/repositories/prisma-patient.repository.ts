import { Injectable } from '@nestjs/common';
import type {
  Patient,
  PatientId,
  PatientRepository,
  PatientSearchCriteria,
  RegisterPatientInput,
  RegisterPatientResult,
  UpdatePatientDemographicsInput,
  TenantId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { patientFromPrisma } from '../mappers/patient.mapper.js';

/**
 * Maximum number of retries for SERIALIZABLE transaction conflicts.
 * P2034 / DriverAdapterError-TransactionWriteConflict errors are retried
 * up to this many times (3 total attempts), matching the appointment and
 * encounter repositories. Do not regress this.
 */
const MAX_SERIALIZATION_RETRIES = 3;

/**
 * Short delay between retries in milliseconds. Keeps retries bounded
 * while allowing the conflicting transaction to complete.
 */
const RETRY_DELAY_MS = 50;

/**
 * Checks if an error is a Prisma serialization/write conflict that is
 * safe to retry under SERIALIZABLE isolation. Recognises both forms used
 * by the repository (Prisma P2034 and DriverAdapterError with
 * cause.kind === 'TransactionWriteConflict').
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
 * Convert an ISO 8601 calendar date string (YYYY-MM-DD) to a Date at UTC
 * midnight, matching how Prisma reads a DATE column. The DATE column has
 * no timezone; constructing the Date at UTC midnight avoids off-by-one
 * day drift when stored.
 */
function calendarDateToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00.000Z');
}

/**
 * Prisma-backed implementation of {@link PatientRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10, every read method takes `tenantId` as a
 * required parameter. The repository enforces tenant isolation: looking up
 * a patient ID from a different tenant returns null, not that tenant's patient.
 *
 * Per PATIENTS.md Section 2.2:
 * - Patient records are tenant-isolated by default
 * - A patient created in tenant A is not visible to tenant B
 * - The repository enforces this at the contract level
 *
 * Security guarantees:
 * - Cross-tenant lookups return null (not an error)
 * - Caller-supplied tenantId is authoritative (derived from auth context)
 * - No sensitive patient data is exposed through this interface
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 */
@Injectable()
export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsInTenant(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<boolean> {
    // Use count with tenantId filter to verify patient belongs to the caller tenant.
    // This returns 0 for non-existent patients AND for patients in other tenants.
    const count = await this.prisma.patient.count({
      where: { id: patientId, tenantId },
    });
    return count > 0;
  }

  async findById(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<Patient | null> {
    // Tenant-scoped lookup: returns null for patients in other tenants.
    const row = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    return row ? patientFromPrisma(row) : null;
  }

  async findByMedicalRecordNumber(
    tenantId: TenantId,
    medicalRecordNumber: string,
  ): Promise<Patient | null> {
    // MRN is tenant-wide unique: the same MRN may exist in different tenants.
    // Filter by tenantId to enforce tenant isolation.
    const row = await this.prisma.patient.findFirst({
      where: { tenantId, medicalRecordNumber },
    });
    return row ? patientFromPrisma(row) : null;
  }

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

  async register(input: RegisterPatientInput): Promise<RegisterPatientResult> {
    const { tenantId, medicalRecordNumber, demographics } = input;

    const transactionLogic = async (): Promise<RegisterPatientResult> => {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Duplicate prevention (architecture gate 6H): check for an
          // existing patient with the same MRN in the same tenant. The
          // unique constraint (tenant_id, medical_record_number) provides
          // the database-level enforcement, but the explicit check returns
          // the existing patient so the service can map the error without a
          // second read. Under SERIALIZABLE isolation, two concurrent
          // registrations with the same MRN both see "no existing"
          // initially, but the second insert hits the unique constraint and
          // the transaction is retried; on retry the committed patient is
          // observed and the result resolves as duplicate_mrn.
          const existing = await tx.patient.findFirst({
            where: { tenantId, medicalRecordNumber },
          });
          if (existing !== null) {
            return {
              outcome: 'duplicate_mrn' as const,
              patient: patientFromPrisma(existing),
            };
          }

          // Insert the new patient with demographics in a single atomic
          // operation. The status defaults to `active` for a fresh
          // registration (the caller does NOT supply status). The
          // persistence layer assigns `id`, `createdAt`, and `updatedAt`.
          const created = await tx.patient.create({
            data: {
              tenantId,
              medicalRecordNumber,
              status: 'active',
              legalGivenName: demographics.legalGivenName,
              legalMiddleName: demographics.legalMiddleName ?? null,
              legalFamilyName: demographics.legalFamilyName,
              preferredName: demographics.preferredName ?? null,
              dateOfBirth: calendarDateToDate(demographics.dateOfBirth),
              sex: demographics.sex,
              genderIdentity:
                demographics.genderIdentity ?? 'prefer_not_to_say',
              genderIdentityDetail: demographics.genderIdentityDetail ?? null,
            },
          });

          return {
            outcome: 'registered' as const,
            patient: patientFromPrisma(created),
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

  async updateDemographics(
    tenantId: TenantId,
    patientId: PatientId,
    input: UpdatePatientDemographicsInput,
  ): Promise<Patient | null> {
    // Build the bounded update payload from only the supplied fields. The
    // `id`, `tenantId`, and `medicalRecordNumber` are immutable via this
    // command (never present in the payload). The update is tenant-scoped:
    // a patient in another tenant returns null (no existence leak).
    const data: Record<string, unknown> = {};
    if (input.legalGivenName !== undefined) {
      data.legalGivenName = input.legalGivenName;
    }
    if (input.legalMiddleName !== undefined) {
      data.legalMiddleName = input.legalMiddleName;
    }
    if (input.legalFamilyName !== undefined) {
      data.legalFamilyName = input.legalFamilyName;
    }
    if (input.preferredName !== undefined) {
      data.preferredName = input.preferredName;
    }
    if (input.dateOfBirth !== undefined) {
      data.dateOfBirth = calendarDateToDate(input.dateOfBirth);
    }
    if (input.sex !== undefined) {
      data.sex = input.sex;
    }
    if (input.genderIdentity !== undefined) {
      data.genderIdentity = input.genderIdentity;
    }
    if (input.genderIdentityDetail !== undefined) {
      data.genderIdentityDetail = input.genderIdentityDetail;
    }

    // Tenant-scoped update: returns null if the patient does not exist or
    // belongs to a different tenant (findFirst + update to avoid leaking
    // existence across tenants via a raw update count).
    const row = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (row === null) {
      return null;
    }

    const updated = await this.prisma.patient.update({
      where: { id: patientId },
      data,
    });
    return patientFromPrisma(updated);
  }

  async search(
    tenantId: TenantId,
    criteria: PatientSearchCriteria,
  ): Promise<readonly Patient[]> {
    // Bounded deterministic search (architecture gate 16). Tenant-scoped:
    // a patient in another tenant is never returned (no cross-tenant
    // leakage). Search is deterministic only: exact MRN, exact external
    // identifier (type+value), or bounded name prefix. No fuzzy matching.
    const where: Record<string, unknown> = { tenantId };

    if (criteria.medicalRecordNumber !== undefined) {
      where.medicalRecordNumber = criteria.medicalRecordNumber;
    }
    if (criteria.namePrefix !== undefined) {
      // Bounded name prefix search using a case-sensitive startsWith on
      // the legal family name (and given name) so the index is usable.
      // The prefix is NOT lowercased to keep the index usable; an exact
      // prefix match is deterministic.
      where.OR = [
        { legalFamilyName: { startsWith: criteria.namePrefix } },
        { legalGivenName: { startsWith: criteria.namePrefix } },
      ];
    }

    let rows: Awaited<ReturnType<typeof this.prisma.patient.findMany>>;

    if (
      criteria.identifierType !== undefined &&
      criteria.identifierValue !== undefined
    ) {
      // Identifier search: join through patient_identifiers. Use the
      // normalised value for deterministic matching. Tenant-scoped via
      // the patient's tenantId (the identifier's tenantId matches).
      rows = await this.prisma.patient.findMany({
        where: {
          ...where,
          identifiers: {
            some: {
              tenantId,
              type: criteria.identifierType as never,
              normalizedValue: criteria.identifierValue,
            },
          },
        },
        take: 50,
        orderBy: { legalFamilyName: 'asc' },
      });
    } else {
      rows = await this.prisma.patient.findMany({
        where,
        take: 50,
        orderBy: { legalFamilyName: 'asc' },
      });
    }

    return rows.map((row) => patientFromPrisma(row));
  }
}
