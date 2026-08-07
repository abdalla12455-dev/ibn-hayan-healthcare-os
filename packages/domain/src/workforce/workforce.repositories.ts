/**
 * Provider repository ports.
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
  Provider,
  ProviderId,
  ProviderFacilityAssignment,
  ProviderFacilityAssignmentId,
} from './provider.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { FacilityId } from '../tenancy/facility.js';

/**
 * Repository port for the Workforce bounded context (BC10).
 *
 * Provides existence checking for providers within a tenant scope and
 * facility assignment validation. Other bounded contexts (especially
 * Appointments) use this to validate that a provider:
 * 1. Exists in the correct tenant
 * 2. Is active (or otherwise eligible per lifecycle rules)
 * 3. Is assigned to the requested authenticated facility
 *
 * Per download/docs/07_MODULES/DOCTORS.md Section 4.1:
 * - Provider data is tenant-isolated by default
 * - A provider registered in tenant A is not visible to tenant B
 *
 * Per DOCTORS.md Section 4.2:
 * - A provider's schedule may span multiple facilities
 * - The appointment context must verify that the provider is assigned
 *   to the requested facility
 *
 * The existence check is the minimum capability required for BC10 to
 * serve as a reference foundation. Full provider CRUD operations will
 * be implemented in subsequent batches.
 */
export interface ProviderRepository {
  /**
   * Check if a provider exists in a given tenant.
   *
   * This method verifies that a provider with the given ID genuinely
   * exists within the specified tenant scope.
   *
   * Security guarantees:
   * - A provider ID from tenant B does NOT return true for tenant A
   * - A non-existent provider ID returns false (not an error)
   * - Caller-supplied tenantId is authoritative (derived from auth context)
   *
   * @param tenantId The tenant to check within.
   * @param providerId The provider ID to check.
   * @returns true if the provider exists in the tenant, false otherwise.
   */
  existsInTenant(tenantId: TenantId, providerId: ProviderId): Promise<boolean>;

  /**
   * Find a provider by their ID within a tenant scope.
   *
   * Returns null if the provider does not exist, belongs to a different
   * tenant, or is not in an eligible status for scheduling.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID to find.
   * @returns The provider if found and eligible, null otherwise.
   */
  findById(tenantId: TenantId, providerId: ProviderId): Promise<Provider | null>;

  /**
   * Check if a provider is eligible for scheduling at a specific facility.
   *
   * A provider is eligible if:
   * 1. They exist in the tenant
   * 2. Their status is 'active'
   * 3. They have an active (non-revoked) assignment to the facility
   *
   * Per DOCTORS.md Section 4.2:
   * - "The appointment context must verify that the provider is assigned
   *   to the requested facility"
   *
   * Security guarantees:
   * - Cross-tenant facility queries return false
   * - Cross-facility queries return false
   * - Caller-supplied tenantId and facilityId are authoritative
   *
   * @param tenantId The tenant to check within.
   * @param providerId The provider ID to check.
   * @param facilityId The facility to check assignment for.
   * @returns true if the provider is eligible for the facility, false otherwise.
   */
  isEligibleForFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
  ): Promise<boolean>;

  /**
   * Find a provider's active facility assignments.
   *
   * Returns all active (non-revoked) assignments for a provider within
   * a tenant. This supports determining which facilities a provider
   * can work at.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID to find assignments for.
   * @returns Array of active assignments, empty array if none exist.
   */
  findActiveFacilityAssignments(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<ProviderFacilityAssignment[]>;
}

/**
 * Repository port for ProviderFacilityAssignment.
 *
 * Provides read access to provider facility assignments.
 * This is a subordinate port used by ProviderRepository.
 */
export interface ProviderFacilityAssignmentRepository {
  /**
   * Find an assignment by its ID within a tenant scope.
   *
   * @param tenantId The tenant to search within.
   * @param assignmentId The assignment ID to find.
   * @returns The assignment if found and active, null otherwise.
   */
  findById(
    tenantId: TenantId,
    assignmentId: ProviderFacilityAssignmentId,
  ): Promise<ProviderFacilityAssignment | null>;

  /**
   * Find a provider's assignment to a specific facility.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID.
   * @param facilityId The facility ID.
   * @returns The assignment if found and active, null otherwise.
   */
  findByProviderAndFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
  ): Promise<ProviderFacilityAssignment | null>;

  /**
   * Find all active assignments for a provider within a tenant.
   *
   * @param tenantId The tenant to search within.
   * @param providerId The provider ID.
   * @returns Array of active assignments.
   */
  findActiveByProvider(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<ProviderFacilityAssignment[]>;
}
