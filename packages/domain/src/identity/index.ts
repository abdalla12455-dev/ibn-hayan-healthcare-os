/**
 * Public identity entry point.
 *
 * Re-exports the identity domain types and repository ports so that
 * consumers import from `@ibn-hayan/domain/identity` (or from the
 * package root) without reaching into internal file paths.
 *
 * Nothing in this module imports Prisma, NestJS, Next.js, React, Zod,
 * argon2, or any framework. The exports are pure TypeScript types and
 * interfaces. Per ADR-012 §1.4, Prisma-generated types must not leak
 * into the domain; the persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and these domain types.
 *
 * Per ADR-013 §1.3, the session record does not include the raw
 * session token, the password, or any credential material. Only a
 * SHA-256 hash of the opaque session token is persisted (via the
 * `SessionRepository` port). The raw token is generated, held in
 * process memory, hashed, written to the cookie, and discarded — it
 * is never passed to the persistence layer.
 */

export type {
  User,
  UserId,
  UserLifecycleStatus,
  CreateUserInput,
} from './user.js';

export type {
  TenantMembership,
  TenantMembershipId,
  TenantMembershipStatus,
  CreateTenantMembershipInput,
} from './membership.js';

export type {
  Session,
  SessionId,
  SessionTokenHash,
  CreateSessionInput,
} from './session.js';

export type {
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
} from './repositories.js';
