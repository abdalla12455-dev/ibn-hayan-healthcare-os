/**
 * PatientIdentifier domain model.
 *
 * A secondary patient identifier (NationalID, Passport, InsuranceNumber)
 * distinct from the MRN (which remains on the Patient table for backward
 * compatibility, per architecture gate 6G). Identifiers are tenant-scoped
 * and patient-scoped. Within BC01, a foreign key to Patient is permitted
 * (same bounded context); cross-bounded-context FKs remain prohibited.
 *
 * Per download/docs/03_DOMAIN/ENUMS.md §3 (PatientIdentifierType,
 * Open-with-Council), the canonical identifier types include NationalID,
 * Passport, MedicalRecordNumber, InsuranceNumber, and DriverLicence. The
 * MRN type exists in the catalogue but the MRN value is NOT migrated out
 * of the Patient table — it remains on Patient for backward compatibility.
 * This model holds the non-MRN secondary identifiers.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { PatientId } from './patient.js';

/**
 * Stable identifier for a PatientIdentifier row. Branded so it cannot be
 * confused with other IDs at the type level.
 */
export type PatientIdentifierId = string & {
  readonly __brand: 'PatientIdentifierId';
};

/**
 * Canonical patient identifier type per download/docs/03_DOMAIN/ENUMS.md
 * §3 (PatientIdentifierType, Open-with-Council). The database stores
 * lowercase values (matching the existing Prisma enum convention).
 *
 * `medical_record_number` exists in the catalogue but is NOT used by
 * this model — the MRN remains on the Patient table. The accepted types
 * for the secondary-identifier model in this stage are `national_id`,
 * `passport`, and `insurance_number`. `driver_licence` is accepted as
 * a future-capable type but is not required by this stage's commands.
 */
export type PatientIdentifierType =
  | 'national_id'
  | 'passport'
  | 'insurance_number'
  | 'driver_licence';

/**
 * The canonical PatientIdentifier domain model. A readonly snapshot of a
 * secondary identifier's persistent state.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as PatientIdentifierId.
 * - `tenantId`: the Tenant that owns this identifier (matches the
 *   patient's tenant).
 * - `patientId`: the Patient this identifier belongs to.
 * - `type`: the canonical identifier type.
 * - `normalizedValue`: the normalised identifier value. NationalID and
 *   Passport values are trimmed and uppercased before storage so that
 *   deterministic duplicate detection is robust to case/whitespace
 *   variation. The raw input value is NOT stored separately; the
 *   normalised form is the canonical persisted form.
 * - `issuingCountry`: optional ISO 3166-1 alpha-2 country code.
 * - `createdAt`, `updatedAt`: timezone-aware timestamps.
 *
 * Sensitive identifier security (architecture gate 6O): the
 * `normalizedValue` for NationalID and Passport is sensitive PII. It is
 * stored as plaintext in the transactional database (consistent with all
 * other patient PHI), protected by tenant isolation, authorization, and
 * audit-metadata forbidden-key rules. It is NEVER placed in audit
 * metadata or application logs; the service layer is responsible for
 * excluding it from audit metadata, and the audit metadata forbidden-key
 * detector enforces this at emission time as defence-in-depth.
 */
export interface PatientIdentifier {
  readonly id: PatientIdentifierId;
  readonly tenantId: TenantId;
  readonly patientId: PatientId;
  readonly type: PatientIdentifierType;
  readonly normalizedValue: string;
  readonly issuingCountry: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * The identifier types for which deterministic duplicate protection is
 * enforced at the database level by a partial unique index on
 * `(tenant_id, type, normalized_value)`. NationalID and Passport are
 * deterministic dedup keys (architecture gate 6H). InsuranceNumber is
 * NOT a deterministic dedup key in this stage (insurance coverage
 * workflow is explicitly excluded); the canonical catalogue does not
 * name it as a dedup key, so a duplicate insurance number is permitted
 * to allow the same insurance number across patients/policies.
 */
export const DETERMINISTIC_IDENTIFIER_TYPES: readonly PatientIdentifierType[] = [
  'national_id',
  'passport',
] as const;

/**
 * Normalise an identifier value for deterministic comparison and storage.
 *
 * NationalID and Passport values are trimmed and uppercased so that
 * case/whitespace variation does not defeat deterministic duplicate
 * detection. InsuranceNumber and DriverLicence are trimmed only (their
 * canonical normalisation does not include case-folding because policy
 * numbers may be case-sensitive).
 *
 * @param type The identifier type.
 * @param value The raw identifier value.
 * @returns The normalised identifier value.
 */
export function normalizeIdentifierValue(
  type: PatientIdentifierType,
  value: string,
): string {
  const trimmed = value.trim();
  if (type === 'national_id' || type === 'passport') {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

/**
 * Returns `true` if the supplied identifier type has deterministic
 * duplicate protection (architecture gate 6H).
 */
export function isDeterministicIdentifierType(
  type: string,
): type is PatientIdentifierType {
  return (
    type === 'national_id' || type === 'passport'
  );
}
