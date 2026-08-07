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

import type { PatientId, Patient } from './patient.js';
import type { TenantId } from '../tenancy/tenant.js';

/**
 * Repository port for the Patient bounded context (BC01).
 *
 * Provides existence checking for patients within a tenant scope.
 * Other bounded contexts (especially Appointments) use this to validate
 * that a patient exists before creating references.
 *
 * Per download/docs/07_MODULES/PATIENTS.md:
 * - Patient records are tenant-isolated by default
 * - A patient created in tenant A is not visible to tenant B
 * - The repository enforces tenant isolation at the contract level
 *
 * The existence check is the minimum capability required for BC01 to
 * serve as a reference foundation. Full patient CRUD operations will
 * be implemented in subsequent batches.
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
}
