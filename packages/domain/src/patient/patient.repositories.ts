/**
 * Patient repository ports.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * repository interfaces are declared in the domain package and
 * implemented by persistence adapters in
 * `apps/api/src/infrastructure/database/`. The API layer depends on
 * the interface; the Prisma-backed implementation is injected at the
 * composition root.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type {
  PatientId,
  Patient,
  RegisterPatientInput,
  RegisterPatientResult,
  UpdatePatientDemographicsInput,
} from './patient.js';
import type { PatientIdentifier } from './patient-identifier.js';
import type { TenantId } from '../tenancy/tenant.js';

/**
 * Bounded patient-search criteria (architecture gate 16). Search is
 * deterministic only: exact MRN, exact external identifier, or bounded
 * name prefix. No fuzzy matching, no Elasticsearch, no cross-tenant
 * leakage. All criteria are tenant-scoped.
 */
export interface PatientSearchCriteria {
  readonly medicalRecordNumber?: string;
  readonly identifierType?: string;
  readonly identifierValue?: string;
  readonly namePrefix?: string;
}

/**
 * Repository port for the Patient bounded context (BC01).
 *
 * Provides existence checking, registration, view, bounded search, and
 * controlled demographic update for patients within a tenant scope.
 *
 * Per download/docs/07_MODULES/PATIENTS.md:
 * - Patient records are tenant-isolated by default
 * - A patient created in tenant A is not visible to tenant B
 * - The repository enforces tenant isolation at the contract level
 *
 * The existence check remains the minimum capability required for other
 * bounded contexts (Appointments, Encounters) to validate that a patient
 * reference genuinely exists within the authenticated tenant scope. The
 * registration, search, and update methods are the BC01 vertical-slice
 * capabilities added in the Demographics/Registration/Consent stage.
 */
export interface PatientRepository {
  /**
   * Check if a patient exists in a given tenant.
   *
   * This method is the canonical existence check for the BC01 Patient
   * reference foundation. It verifies that a patient with the given ID
   * genuinely exists within the specified tenant scope.
   *
   * Security guarantees:
   * - A patient ID from tenant B does NOT return true for tenant A
   * - A non-existent patient ID returns false (not an error)
   * - Caller-supplied tenantId is authoritative (derived from auth context)
   *
   * @param tenantId The tenant to check within.
   * @param patientId The patient ID to check.
   * @returns true if the patient exists in the tenant, false otherwise.
   */
  existsInTenant(tenantId: TenantId, patientId: PatientId): Promise<boolean>;

  /**
   * Find a patient by their ID within a tenant scope.
   *
   * Returns null if the patient does not exist or belongs to a different
   * tenant. This is the canonical lookup method for when the full patient
   * record is needed (not just existence).
   *
   * @param tenantId The tenant to search within.
   * @param patientId The patient ID to find.
   * @returns The patient if found, null otherwise.
   */
  findById(tenantId: TenantId, patientId: PatientId): Promise<Patient | null>;

  /**
   * Find a patient by their medical record number within a tenant scope.
   *
   * The MRN is tenant-wide and unique. This method supports cross-facility
   * patient identity resolution as described in PATIENTS.md Section 3.2.
   *
   * @param tenantId The tenant to search within.
   * @param medicalRecordNumber The MRN to find.
   * @returns The patient if found, null otherwise.
   */
  findByMedicalRecordNumber(
    tenantId: TenantId,
    medicalRecordNumber: string,
  ): Promise<Patient | null>;

  /**
   * Register a new patient with demographics (architecture gate 8, 14).
   *
   * Creates the Patient row with the demographic columns populated in a
   * single atomic operation. The caller supplies the tenantId (derived
   * from the authenticated session), the medicalRecordNumber, and the
   * demographic fields. The persistence layer assigns `id`, `status`
   * (defaulting to `active`), `createdAt`, and `updatedAt`.
   *
   * Duplicate prevention (architecture gate 6H): the MRN uniqueness
   * constraint on `(tenantId, medicalRecordNumber)` is enforced at the
   * database level. A deterministic duplicate on MRN returns
   * `duplicate_mrn` (the existing patient is returned so the service can
   * map the error without a second read; it is NOT returned to the
   * caller — no cross-tenant existence leak). A deterministic duplicate
   * on a supplied external identifier returns `duplicate_identifier`.
   *
   * Concurrency safety: the existence check and insert are performed
   * within a SERIALIZABLE transaction with bounded retry for P2034 /
   * DriverAdapterError-TransactionWriteConflict errors. Two concurrent
   * registrations with the same MRN resolve to one `registered` and one
   * `duplicate_mrn`.
   *
   * @param input The registration input (tenantId, MRN, demographics).
   * @returns The registration result (see {@link RegisterPatientResult}).
   */
  register(input: RegisterPatientInput): Promise<RegisterPatientResult>;

  /**
   * Update a patient's demographics (architecture gate 17).
   *
   * A bounded PATCH: only the explicitly editable demographic fields may
   * be mutated. The `id`, `tenantId`, and `medicalRecordNumber` are
   * immutable via this command. The update is scoped to the tenant: a
   * patient in another tenant returns `not_found` (no existence leak).
   *
   * @param tenantId The tenant to update within.
   * @param patientId The patient to update.
   * @param input The bounded demographic update input.
   * @returns The updated patient, or `null` if the patient does not
   *          exist or belongs to a different tenant.
   */
  updateDemographics(
    tenantId: TenantId,
    patientId: PatientId,
    input: UpdatePatientDemographicsInput,
  ): Promise<Patient | null>;

  /**
   * Bounded patient search (architecture gate 16).
   *
   * Search is deterministic only: exact MRN, exact external identifier
   * (type+value), or bounded name prefix. No fuzzy matching. No
   * cross-tenant leakage. The search is tenant-scoped.
   *
   * The response respects minimum-necessary output: only the canonical
   * patient fields are returned; sensitive identifiers are NOT returned
   * in the search response (the PatientIdentifier model is queried
   * separately through dedicated identifier commands).
   *
   * @param tenantId The tenant to search within.
   * @param criteria The bounded search criteria.
   * @returns A readonly array of matching patients (may be empty).
   */
  search(
    tenantId: TenantId,
    criteria: PatientSearchCriteria,
  ): Promise<readonly Patient[]>;
}

/**
 * Repository port for the PatientIdentifier model (BC01).
 *
 * A PatientIdentifier is a secondary identifier (NationalID, Passport,
 * InsuranceNumber) distinct from the MRN (which remains on the Patient
 * table for backward compatibility). Identifiers are tenant-scoped and
 * patient-scoped. Within BC01, an FK to Patient is permitted (same
 * bounded context); cross-bounded-context FKs remain prohibited.
 *
 * Per architecture gate 6O, sensitive identifiers (NationalID, Passport)
 * are stored as plaintext in the transactional database (consistent with
 * all other patient PHI — names, DOB — which are also plaintext),
 * protected by tenant isolation, authorization, and audit-metadata
 * forbidden-key rules. No custom field-level cryptography is invented.
 * Sensitive identifier values are NEVER placed in audit metadata or
 * application logs; the audit metadata forbidden-key detector enforces
 * this at emission time.
 */
export interface PatientIdentifierRepository {
  /**
   * Add a secondary identifier to a patient.
   *
   * The identifier is tenant-scoped and patient-scoped. Duplicate
   * prevention (architecture gate 6H): a deterministic duplicate on
   * `(tenantId, type, normalizedValue)` for NationalID or Passport is
   * enforced at the database level by a partial unique index. A
   * duplicate returns `duplicate` (the existing identifier is returned
   * so the service can map the error without a second read; it is NOT
   * returned to the caller — no cross-tenant existence leak).
   *
   * The value is normalised before comparison/storage according to the
   * canonical validation rules (trimmed, uppercased for NationalID and
   * Passport) so that deterministic duplicate detection is robust to
   * case/whitespace variation.
   *
   * @param tenantId The tenant to add within.
   * @param patientId The patient to add the identifier to.
   * @param type The identifier type.
   * @param value The identifier value (will be normalised).
   * @param issuingCountry The optional issuing country (ISO 3166-1 alpha-2).
   * @returns The created identifier, or `{ outcome: 'duplicate', identifier }`.
   */
  add(
    tenantId: TenantId,
    patientId: PatientId,
    type: string,
    value: string,
    issuingCountry?: string | null,
  ): Promise<
    | { readonly outcome: 'added'; readonly identifier: PatientIdentifier }
    | { readonly outcome: 'duplicate'; readonly identifier: PatientIdentifier }
  >;

  /**
   * Find an identifier by type and normalised value within a tenant.
   *
   * Used by the registration command's deterministic duplicate check
   * (architecture gate 6H) and by the bounded identifier search. Returns
   * null if no identifier matches (a non-existent identifier, or an
   * identifier in another tenant — no existence leak).
   *
   * @param tenantId The tenant to search within.
   * @param type The identifier type.
   * @param normalizedValue The normalised identifier value.
   * @returns The identifier if found, null otherwise.
   */
  findByTypeAndValue(
    tenantId: TenantId,
    type: string,
    normalizedValue: string,
  ): Promise<PatientIdentifier | null>;

  /**
   * List all identifiers for a patient within a tenant.
   *
   * Used by the identifier view endpoint. Tenant-scoped: a patient in
   * another tenant returns an empty array (no existence leak).
   *
   * @param tenantId The tenant to search within.
   * @param patientId The patient whose identifiers to list.
   * @returns A readonly array of identifiers (may be empty).
   */
  listForPatient(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<readonly PatientIdentifier[]>;
}
