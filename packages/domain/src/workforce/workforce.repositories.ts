/**
 * Workforce repository ports.
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
import type { ProviderId } from '../scheduling/appointment.js';

/**
 * Repository port for the Workforce bounded context (BC10).
 *
 * Provides existence checking for providers within a tenant scope.
 * The Scheduling bounded context uses this to validate that a provider
 * exists before creating an appointment.
 */
export interface ProviderRepository {
  /**
   * Check if a provider exists in a given tenant.
   *
   * @param tenantId The tenant to check within.
   * @param providerId The provider ID to check.
   * @returns true if the provider exists in the tenant, false otherwise.
   */
  existsInTenant(tenantId: TenantId, providerId: ProviderId): Promise<boolean>;
}
