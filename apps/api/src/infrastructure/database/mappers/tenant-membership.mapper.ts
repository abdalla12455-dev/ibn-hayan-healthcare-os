import type {
  TenantMembership,
  TenantMembershipId,
  TenantMembershipStatus,
  TenantId,
  UserId,
} from '@ibn-hayan/domain';
import type {
  TenantMembership as PrismaTenantMembership,
  TenantMembershipStatus as PrismaTenantMembershipStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `TenantMembership` row type and the
 * framework-independent `TenantMembership` domain type.
 *
 * Per CODING_STANDARDS.md §5 ("Persistence mapping is explicit and
 * tested"), the mapping is explicit (no implicit conversion) and is
 * tested.
 *
 * The Prisma-generated `TenantMembershipStatus` enum and the domain's
 * `TenantMembershipStatus` union type use the same string values
 * (`active`, `suspended`), so the status mapping is a value-preserving
 * cast. The cast is explicit so divergence becomes a compile error.
 */

function prismaStatusToDomain(
  status: PrismaTenantMembershipStatus,
): TenantMembershipStatus {
  return status;
}

/**
 * Map a Prisma-generated `TenantMembership` row to a
 * framework-independent `TenantMembership` domain value.
 */
export function tenantMembershipFromPrisma(
  row: PrismaTenantMembership,
): TenantMembership {
  return {
    id: row.id as TenantMembershipId,
    tenantId: row.tenantId as TenantId,
    userId: row.userId as UserId,
    status: prismaStatusToDomain(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
