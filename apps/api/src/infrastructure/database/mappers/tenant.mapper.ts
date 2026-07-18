import type {
  Tenant,
  TenantId,
  TenantLifecycleStatus,
} from '@ibn-hayan/domain';
import type {
  Tenant as PrismaTenant,
  TenantStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `Tenant` row type and the
 * framework-independent `Tenant` domain type.
 *
 * Per CODING_STANDARDS.md §5 ("Persistence mapping is explicit and
 * tested"), the mapping is explicit (no implicit conversion) and is
 * tested. A change to the Prisma schema that breaks the mapping is
 * caught by the mapping tests.
 *
 * The Prisma-generated `TenantStatus` enum and the domain's
 * `TenantLifecycleStatus` union type use the same string values, so
 * the mapping is a value-preserving cast. The cast is explicit so
 * that a future change to either side cannot silently break the
 * mapping.
 */

/**
 * Cast a Prisma `TenantStatus` enum value to the domain's
 * `TenantLifecycleStatus` union type. The two types use the same
 * string values, so the cast is value-preserving. If a future Prisma
 * migration adds a new status value, this cast will produce a
 * type error (because the new value is not in
 * `TenantLifecycleStatus`), which is the desired signal: the domain
 * must be updated to ratify the new value before the cast compiles.
 */
function prismaStatusToDomain(status: TenantStatus): TenantLifecycleStatus {
  // The explicit `as` here is intentional: the two types share the
  // same string values today, but a future schema change could
  // diverge them. The explicit cast makes the divergence a compile
  // error rather than a silent runtime conversion.
  return status;
}

/**
 * Map a Prisma-generated `Tenant` row to a framework-independent
 * `Tenant` domain value. Returns a readonly snapshot; mutations are
 * issued through use cases that produce new snapshots, not by
 * mutating the returned object.
 *
 * The branded `TenantId` is created by casting the UUID string. The
 * brand is a compile-time-only type intersection; at runtime the
 * value is just a string.
 */
export function tenantFromPrisma(row: PrismaTenant): Tenant {
  return {
    id: row.id as TenantId,
    slug: row.slug,
    displayName: row.displayName,
    status: prismaStatusToDomain(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
