import { Injectable } from '@nestjs/common';
import type {
  Provider,
  ProviderId,
  ProviderRepository,
  ProviderFacilityAssignment,
  TenantId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import {
  providerFromPrisma,
  providerFacilityAssignmentFromPrisma,
} from '../mappers/provider.mapper.js';

/**
 * Prisma-backed implementation of {@link ProviderRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10, every read method takes `tenantId` as a
 * required parameter. The repository enforces tenant isolation: looking up
 * a provider ID from a different tenant returns null, not that tenant's provider.
 *
 * Per DOCTORS.md Section 4.1:
 * - Provider data is tenant-isolated by default
 * - A provider registered in tenant A is not visible to tenant B
 *
 * Per DOCTORS.md Section 4.2:
 * - A provider's schedule may span multiple facilities
 * - The appointment context must verify that the provider is assigned
 *   to the requested facility
 *
 * Security guarantees:
 * - Cross-tenant lookups return null (not an error)
 * - Cross-facility lookups return false
 * - Caller-supplied tenantId is authoritative (derived from auth context)
 * - No sensitive provider data is exposed through this interface
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 */
@Injectable()
export class PrismaProviderRepository implements ProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsInTenant(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<boolean> {
    // Use count with tenantId filter to verify provider belongs to the caller tenant.
    // This returns 0 for non-existent providers AND for providers in other tenants.
    const count = await this.prisma.provider.count({
      where: { id: providerId, tenantId },
    });
    return count > 0;
  }

  async findById(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<Provider | null> {
    // Tenant-scoped lookup: returns null for providers in other tenants.
    const row = await this.prisma.provider.findFirst({
      where: { id: providerId, tenantId },
    });
    return row ? providerFromPrisma(row) : null;
  }

  async isEligibleForFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: string,
  ): Promise<boolean> {
    // A provider is eligible for a facility if:
    // 1. They exist in the tenant (existsInTenant check)
    // 2. Their status is 'active'
    // 3. They have an active (non-revoked) assignment to the facility

    // First check: provider exists and is active in the tenant
    const provider = await this.prisma.provider.findFirst({
      where: { id: providerId, tenantId, status: 'active' },
    });
    if (!provider) {
      return false;
    }

    // Second check: provider has an active assignment to the facility
    // revokedAt IS NULL means the assignment is active
    const assignment = await this.prisma.providerFacilityAssignment.findFirst({
      where: {
        tenantId,
        providerId,
        facilityId,
        revokedAt: null,
      },
    });
    return assignment !== null;
  }

  async findActiveFacilityAssignments(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<ProviderFacilityAssignment[]> {
    // Find all active (non-revoked) assignments for a provider within a tenant.
    const rows = await this.prisma.providerFacilityAssignment.findMany({
      where: {
        tenantId,
        providerId,
        revokedAt: null,
      },
    });
    return rows.map(providerFacilityAssignmentFromPrisma);
  }
}
