import type { User, UserId, UserLifecycleStatus } from '@ibn-hayan/domain';
import type {
  User as PrismaUser,
  UserStatus,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `User` row type and the
 * framework-independent `User` domain type.
 *
 * Per CODING_STANDARDS.md §5 ("Persistence mapping is explicit and
 * tested"), the mapping is explicit (no implicit conversion) and is
 * tested. A change to the Prisma schema that breaks the mapping is
 * caught by the mapping tests.
 *
 * The Prisma-generated `UserStatus` enum and the domain's
 * `UserLifecycleStatus` union type use the same string values
 * (`active`, `disabled`), so the status mapping is a value-preserving
 * cast. The cast is explicit so that a future change to either side
 * cannot silently break the mapping.
 *
 * The Prisma `User` row carries `localCredential`, `memberships`, and
 * `sessions` relation fields. The domain `User` type deliberately
 * excludes these — the password hash never leaves the infrastructure
 * layer, and memberships/sessions are read through their own
 * repositories. The mapper drops these relation fields; the consumer
 * never sees them.
 */

/**
 * Cast a Prisma `UserStatus` enum value to the domain's
 * `UserLifecycleStatus` union type. The two types use the same string
 * values, so the cast is value-preserving. If a future Prisma
 * migration adds a new status value, this cast will produce a type
 * error (because the new value is not in `UserLifecycleStatus`),
 * which is the desired signal.
 */
function prismaStatusToDomain(status: UserStatus): UserLifecycleStatus {
  return status;
}

/**
 * Map a Prisma-generated `User` row to a framework-independent `User`
 * domain value. Returns a readonly snapshot.
 *
 * The branded `UserId` is created by casting the UUID string. The
 * brand is a compile-time-only type intersection; at runtime the
 * value is just a string.
 */
export function userFromPrisma(row: PrismaUser): User {
  return {
    id: row.id as UserId,
    email: row.email,
    normalisedEmail: row.normalisedEmail,
    displayName: row.displayName,
    status: prismaStatusToDomain(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
