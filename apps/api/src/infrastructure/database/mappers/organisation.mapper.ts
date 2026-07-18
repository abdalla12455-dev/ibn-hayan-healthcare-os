import type {
  Organisation,
  OrganisationId,
  OrganisationLifecycleStatus,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  Organisation as PrismaOrganisation,
  OrganisationStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `Organisation` row type and the
 * framework-independent `Organisation` domain type.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 */

function prismaStatusToDomain(
  status: OrganisationStatus,
): OrganisationLifecycleStatus {
  return status;
}

export function organisationFromPrisma(row: PrismaOrganisation): Organisation {
  return {
    id: row.id as OrganisationId,
    tenantId: row.tenantId as TenantId,
    code: row.code,
    displayName: row.displayName,
    status: prismaStatusToDomain(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
