import type {
  Session,
  SessionId,
  SessionTokenHash,
  UserId,
  TenantMembershipId,
} from '@ibn-hayan/domain';
import type { AuthSession as PrismaAuthSession } from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `AuthSession` row type and the
 * framework-independent `Session` domain type.
 *
 * Per CODING_STANDARDS.md §5 ("Persistence mapping is explicit and
 * tested"), the mapping is explicit (no implicit conversion) and is
 * tested.
 *
 * The Prisma `AuthSession.tokenHash` column is `CHAR(64)` (64-character
 * lowercase hex SHA-256). The domain `SessionTokenHash` is a branded
 * string. The mapper applies the brand; the value is unchanged.
 *
 * The Prisma `AuthSession.activeTenantMembershipId` column is a
 * nullable UUID. The domain `Session.activeTenantMembershipId` is a
 * branded `TenantMembershipId | null`. The mapper applies the brand
 * when the value is non-null; `null` is preserved as `null`. This
 * field is the structural enforcement of the fifth canonical batch
 * specification: the active Tenant context is persisted on the
 * session row, never in a separate context table, and is referenced
 * by TenantMembership ID (never by an arbitrary Tenant ID).
 *
 * The Prisma `AuthSession.user` relation field is dropped by the
 * mapper. The domain `Session` type does not carry the user relation;
 * the user is read separately through `UserRepository.findById` when
 * needed.
 */

/**
 * Map a Prisma-generated `AuthSession` row to a framework-independent
 * `Session` domain value. Returns a readonly snapshot.
 */
export function sessionFromPrisma(row: PrismaAuthSession): Session {
  return {
    id: row.id as SessionId,
    userId: row.userId as UserId,
    tokenHash: row.tokenHash as SessionTokenHash,
    activeTenantMembershipId:
      row.activeTenantMembershipId === null
        ? null
        : (row.activeTenantMembershipId as TenantMembershipId),
    expiresAt: row.expiresAt,
    lastSeenAt: row.lastSeenAt,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}
