import type {
  Facility,
  FacilityId,
  FacilityLifecycleStatus,
  OrganisationId,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  Facility as PrismaFacility,
  FacilityStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `Facility` row type and the
 * framework-independent `Facility` domain type.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 */

function prismaStatusToDomain(status: FacilityStatus): FacilityLifecycleStatus {
  return status;
}

export function facilityFromPrisma(row: PrismaFacility): Facility {
  return {
    id: row.id as FacilityId,
    tenantId: row.tenantId as TenantId,
    organisationId: row.organisationId as OrganisationId,
    code: row.code,
    displayName: row.displayName,
    status: prismaStatusToDomain(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
