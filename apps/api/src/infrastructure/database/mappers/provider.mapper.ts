import type {
  Provider,
  ProviderId,
  ProviderLifecycleStatus,
  ProviderFacilityAssignment,
  ProviderFacilityAssignmentId,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  Provider as PrismaProvider,
  ProviderFacilityAssignment as PrismaProviderFacilityAssignment,
  ProviderStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `Provider` row type and the
 * framework-independent `Provider` domain type.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 */

function prismaStatusToDomain(status: ProviderStatus): ProviderLifecycleStatus {
  return status;
}

export function providerFromPrisma(row: PrismaProvider): Provider {
  return {
    id: row.id as ProviderId,
    tenantId: row.tenantId as TenantId,
    status: prismaStatusToDomain(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Maps between the Prisma-generated `ProviderFacilityAssignment` row type and
 * the framework-independent `ProviderFacilityAssignment` domain type.
 */
export function providerFacilityAssignmentFromPrisma(
  row: PrismaProviderFacilityAssignment,
): ProviderFacilityAssignment {
  return {
    id: row.id as ProviderFacilityAssignmentId,
    providerId: row.providerId as ProviderId,
    tenantId: row.tenantId as TenantId,
    organisationId: row.organisationId,
    facilityId: row.facilityId,
    assignedAt: row.assignedAt,
    revokedAt: row.revokedAt,
  };
}
