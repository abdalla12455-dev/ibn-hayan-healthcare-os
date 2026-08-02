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

import type { TenantId } from '../tenancy/tenant.js';
import type { PatientId } from '../scheduling/appointment.js';

/**
 * Repository port for the Patient bounded context (BC01).
 *
 * Provides existence checking for patients within a tenant scope.
 * The Scheduling bounded context uses this to validate that a patient
 * exists before creating an appointment.
 */
export interface PatientRepository {
  /**
   * Check if a patient exists in a given tenant.
   *
   * @param tenantId The tenant to check within.
   * @param patientId The patient ID to check.
   * @returns true if the patient exists in the tenant, false otherwise.
   */
  existsInTenant(tenantId: TenantId, patientId: PatientId): Promise<boolean>;
}
