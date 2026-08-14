/**
 * Patient domain model.
 *
 * The Patient bounded context (BC01) owns patient identity, demographics,
 * consent, and the medical record lifecycle reference. This file implements
 * the canonical Patient domain model, extended in the BC01
 * Demographics/Registration/Consent stage from the minimal reference
 * foundation into a usable patient-registration vertical slice.
 *
 * Per download/docs/07_MODULES/PATIENTS.md Section 11:
 * - Patient records are tenant-isolated by default
 * - A patient created in tenant A is not visible to tenant B
 * - Cross-facility identity resolution means a patient identity is visible
 *   across all facilities within a tenant
 * - MRN (Medical Record Number) is a tenant-wide identifier
 *
 * Per download/docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md Section 12.6:
 * - Every clinical action is associated with a patient, which is associated
 *   with a facility, which is associated with a customer (tenant)
 *
 * Patient ownership model (architecture gate 6A): Patient remains a
 * TENANT-wide identity. No organisationId or facilityId is stored on the
 * Patient record — the facility/organisation where registration occurs is
 * session/audit provenance, not ownership of the Patient identity. This
 * preserves the cross-facility identity resolution invariant: a patient is
 * visible across all facilities within a tenant.
 *
 * Historical compatibility (architecture gate 24): the demographic columns
 * added in this stage are nullable at the database level so that existing
 * minimal Patient rows (created by the reference foundation) remain valid.
 * A new complete registration API requires the canonical identity
 * demographics (name, DOB, sex); a historical minimal Patient remains a
 * valid Patient reference for appointments and encounters. Database
 * nullability is separated from new-registration API validation.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';

/**
 * Stable identifier for a Patient. Branded so it cannot be confused
 * with other IDs at the type level.
 */
export type PatientId = string & { readonly __brand: 'PatientId' };

/**
 * Patient lifecycle status.
 *
 * Canonical PatientStatus (Closed) per download/docs/03_DOMAIN/ENUMS.md §3
 * and download/docs/03_DOMAIN/STATUS_CODES.md §3.
 *
 * `active`: Patient can be referenced in appointments and encounters.
 * `inactive`: Patient is no longer active but records remain for audit.
 * `deceased`: Patient is deceased. Records are retained for regulatory
 *   compliance; a deceased patient is not eligible for new appointments
 *   or encounters.
 * `transferred_out`: Patient has been transferred to another care
 *   provider. Records are retained; the patient is not eligible for new
 *   appointments or encounters at this tenant until reactivated.
 * `archived`: Patient has been archived. Archived patients are not visible
 * in normal operations but records are retained for regulatory compliance.
 *
 * The `deceased` and `transferred_out` values were added in the BC01
 * Demographics/Registration/Consent stage as a forward-only enum expansion.
 * They are additive: no existing value was removed, so historical rows
 * remain valid. This stage does NOT redesign the Patient lifecycle; it
 * only adds the canonical missing values so the status catalogue matches
 * the canonical enum.
 */
export type PatientLifecycleStatus =
  | 'active'
  | 'inactive'
  | 'deceased'
  | 'transferred_out'
  | 'archived';

/**
 * Canonical patient sex (biological sex) per download/docs/03_DOMAIN/
 * ENUMS.md §3 (PatientSex, Closed). Distinct from gender identity.
 *
 * The database stores lowercase values (matching the existing Prisma enum
 * convention). `unknown` and `not_declared` are explicit non-asserted
 * values, not missing data.
 */
export type PatientSex =
  | 'male'
  | 'female'
  | 'intersex'
  | 'unknown'
  | 'not_declared';

/**
 * Canonical patient gender identity per download/docs/03_DOMAIN/ENUMS.md
 * §3 (PatientGenderIdentity, Open-with-Council). Distinct from biological
 * sex. The `other` value is open-with-Council: the free-text `genderIdentityDetail`
 * may carry a self-described identity when the patient selects `other`.
 */
export type PatientGenderIdentity =
  | 'male'
  | 'female'
  | 'transgender_male'
  | 'transgender_female'
  | 'non_binary'
  | 'prefer_not_to_say'
  | 'other';

/**
 * The canonical Patient domain model. A readonly snapshot of a patient's
 * persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as PatientId.
 * - `tenantId`: the Tenant that owns this Patient. Per PATIENTS.md,
 *   patient records are tenant-isolated by default.
 * - `medicalRecordNumber`: the tenant-wide unique medical record number
 *   (MRN). Unique within a tenant; the same MRN may exist in different
 *   tenants. Used for cross-facility patient identity resolution within
 *   a tenant. MRN remains on the Patient table for backward
 *   compatibility; a separate PatientIdentifier model holds other
 *   identifiers (NationalID, Passport, InsuranceNumber).
 * - `status`: current lifecycle status.
 * - `legalGivenName`, `legalMiddleName`, `legalFamilyName`,
 *   `preferredName`: structured name columns (architecture gate 6C). A
 *   full multi-name PatientName entity is out of scope for this stage;
 *   the minimal structured columns suffice for registration. All name
 *   columns are nullable at the database level so historical minimal
 *   Patient rows remain valid; a new complete registration requires
 *   given and family name.
 * - `dateOfBirth`: exact date of birth (architecture gate 6D). No
 *   computed age is stored. No approximate/unknown DOB representation is
 *   canonically defined; a new complete registration requires an exact
 *   DOB. Nullable at the database level for historical compatibility.
 * - `sex`: biological sex (PatientSex). Defaults to `not_declared`.
 * - `genderIdentity`: gender identity (PatientGenderIdentity). Defaults
 *   to `prefer_not_to_say`. Distinct from `sex`.
 * - `genderIdentityDetail`: free-text self-described identity when
 *   `genderIdentity === 'other'`. Nullable.
 * - `createdAt`: timezone-aware timestamp; set by persistence layer.
 * - `updatedAt`: timezone-aware timestamp; updated by persistence layer.
 *
 * Deliberately excluded fields (not in this stage):
 * - Contact information (address, telephone, email, emergency contact)
 * - Insurance coverage details (PatientCoverage)
 * - Medical history
 * - Full PatientRelationship subsystem
 * - Communication preferences
 *
 * These fields are deferred to subsequent stages. Contact information
 * and the full address/contact-history subsystem are explicitly out of
 * scope for the BC01 Demographics/Registration/Consent stage.
 */
export interface Patient {
  readonly id: PatientId;
  readonly tenantId: TenantId;
  readonly medicalRecordNumber: string;
  readonly status: PatientLifecycleStatus;
  readonly legalGivenName: string | null;
  readonly legalMiddleName: string | null;
  readonly legalFamilyName: string | null;
  readonly preferredName: string | null;
  readonly dateOfBirth: string | null;
  readonly sex: PatientSex | null;
  readonly genderIdentity: PatientGenderIdentity | null;
  readonly genderIdentityDetail: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new Patient under a specific Tenant.
 *
 * The caller supplies `tenantId` and `medicalRecordNumber`. The persistence
 * layer assigns `id`, `status` (defaulting to `active`), `createdAt`,
 * and `updatedAt`.
 *
 * The persistence layer enforces:
 * - the unique constraint on `(tenantId, medicalRecordNumber)`.
 * - the length limit on `medicalRecordNumber`.
 */
export interface CreatePatientInput {
  readonly tenantId: TenantId;
  readonly medicalRecordNumber: string;
  readonly status?: PatientLifecycleStatus;
}

/**
 * Demographic fields for a new complete patient registration.
 *
 * Separated from {@link CreatePatientInput} (the minimal foundation
 * creation input) so that the reference-foundation callers that create a
 * minimal Patient (e.g. test fixtures, historical compatibility) are not
 * forced to supply demographics. The Patients registration command
 * composes both: it creates the Patient row AND populates the
 * demographic columns in a single atomic registration.
 *
 * Required fields for a new complete registration (architecture gate 6B):
 * - `legalGivenName`, `legalFamilyName`: canonical identity name.
 * - `dateOfBirth`: exact DOB (ISO 8601 calendar date `YYYY-MM-DD`). No
 *   computed age is stored.
 * - `sex`: canonical biological sex. `not_declared` is an explicit
 *   accepted value (the patient declines to state); the field itself is
 *   required so the record carries an explicit non-asserted value rather
 *   than missing data.
 *
 * Optional fields:
 * - `legalMiddleName`, `preferredName`: nullable name columns.
 * - `genderIdentity`: defaults to `prefer_not_to_say`.
 * - `genderIdentityDetail`: required when `genderIdentity === 'other'`.
 */
export interface PatientDemographicsInput {
  readonly legalGivenName: string;
  readonly legalMiddleName?: string | null;
  readonly legalFamilyName: string;
  readonly preferredName?: string | null;
  readonly dateOfBirth: string;
  readonly sex: PatientSex;
  readonly genderIdentity?: PatientGenderIdentity;
  readonly genderIdentityDetail?: string | null;
}

/**
 * Input for a new complete patient registration. Combines the minimal
 * foundation creation input with the demographic fields. The Patients
 * registration command consumes this and creates the Patient row with
 * demographics populated in a single atomic operation.
 */
export interface RegisterPatientInput {
  readonly tenantId: TenantId;
  readonly medicalRecordNumber: string;
  readonly demographics: PatientDemographicsInput;
}

/**
 * Bounded demographic update input (architecture gate 17). Only the
 * explicitly editable demographic fields may be mutated via the PATCH
 * endpoint. The following are immutable via this command:
 * - `id`, `tenantId`, `medicalRecordNumber` (never mutable here)
 * - `status` (use a dedicated status command if one exists; this stage
 *   does not expose a status-change endpoint)
 * - `dateOfBirth` correction is permitted here because DOB correction is
 *   a demographic correction, not a lifecycle change. The correction is
 *   audited once.
 *
 * All fields are optional: only the supplied fields are updated.
 */
export interface UpdatePatientDemographicsInput {
  readonly legalGivenName?: string;
  readonly legalMiddleName?: string | null;
  readonly legalFamilyName?: string;
  readonly preferredName?: string | null;
  readonly dateOfBirth?: string;
  readonly sex?: PatientSex;
  readonly genderIdentity?: PatientGenderIdentity;
  readonly genderIdentityDetail?: string | null;
}

/**
 * The result of a patient registration attempt. The `outcome` field
 * distinguishes a successful registration from a deterministic duplicate
 * rejection. A duplicate carries the existing patient so the service can
 * map the error without a second read; it is NOT returned to the caller
 * (no cross-tenant existence leak).
 */
export type RegisterPatientResult =
  | { readonly outcome: 'registered'; readonly patient: Patient; readonly transitioned: true }
  | {
      readonly outcome: 'duplicate_mrn';
      readonly patient: Patient;
    }
  | {
      readonly outcome: 'duplicate_identifier';
      readonly patient: Patient;
      readonly identifierType: string;
    };
