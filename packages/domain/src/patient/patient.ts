/**
 * Patient domain model.
 *
 * The Patient bounded context (BC01) owns patient identity, demographics,
 * consent, and the medical record lifecycle reference. This file implements
 * the minimal canonical Patient persistence and repository foundation required
 * for other bounded contexts, especially Appointments, to verify that a
 * patient reference genuinely exists within the authenticated tenant scope.
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
 * `active`: Patient can be referenced in appointments and encounters.
 * `inactive`: Patient is no longer active but records remain for audit.
 * `archived`: Patient has been archived. Archived patients are not visible
 * in normal operations but records are retained for regulatory compliance.
 */
export type PatientLifecycleStatus = 'active' | 'inactive' | 'archived';

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
 *   a tenant.
 * - `status`: current lifecycle status.
 * - `createdAt`: timezone-aware timestamp; set by persistence layer.
 * - `updatedAt`: timezone-aware timestamp; updated by persistence layer.
 *
 * Deliberately excluded fields (not in this minimal foundation):
 * - Demographics (name, date of birth, sex, gender, language)
 * - Contact information (address, telephone, email, emergency contact)
 * - Insurance coverage details
 * - Consent records
 * - Medical history
 * - Family/payer relationships
 *
 * These fields are out of scope for the reference foundation. They will
 * be added in subsequent batches as patient registration and demographics
 * are implemented.
 */
export interface Patient {
  readonly id: PatientId;
  readonly tenantId: TenantId;
  readonly medicalRecordNumber: string;
  readonly status: PatientLifecycleStatus;
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
