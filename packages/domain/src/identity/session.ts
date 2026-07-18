/**
 * Session domain model.
 *
 * A Session is a server-side record representing an authenticated
 * browser session. Per ADR-013 (Authentication and Session Strategy)
 * §1.1 and §1.3, sessions are server-managed and opaque: the browser
 * holds only an opaque, high-entropy session identifier in an HttpOnly
 * cookie; the server holds the session record (this type) in the
 * transactional store.
 *
 * The session record deliberately does NOT include the raw session
 * token, the password, the password hash, or any credential material.
 * Only a SHA-256 hash of the opaque session token is persisted, in the
 * `tokenHash` field. This means a read-only database leak does not
 * immediately yield live session cookies: an attacker would need to
 * pre-image a SHA-256 hash to forge a session. This is the structural
 * enforcement of ADR-013 §1.3: "The session record does not include
 * the password, the password hash, the session secret, or any
 * credential material."
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, argon2, or any framework. The persistence
 * adapter in `apps/api/src/infrastructure/database/` is responsible
 * for mapping between Prisma row types and this domain type.
 */

import type { UserId } from './user.js';
import type { TenantMembershipId } from './membership.js';

/**
 * Stable identifier for a Session. Branded so it cannot be confused
 * with UserId, TenantId, or TenantMembershipId at the type level.
 * Erased at runtime.
 */
export type SessionId = string & { readonly __brand: 'SessionId' };

/**
 * Hexadecimal SHA-256 hash of the opaque session token. Always
 * lowercase, 64 characters (256 bits / 4 bits per hex character).
 * The brand prevents the raw token (which is base64url-encoded and
 * 43 characters for 256 bits of entropy) from being confused with
 * the hash at the type level.
 *
 * The brand is erased at runtime.
 */
export type SessionTokenHash = string & {
  readonly __brand: 'SessionTokenHash';
};

/**
 * Input for creating a new Session. The persistence layer assigns
 * `id` and `createdAt`; the caller supplies the session-establishment
 * fields.
 *
 * `tokenHash` is the SHA-256 hash of the opaque session token. The
 * raw token is NEVER passed to the persistence layer; it lives only
 * in the cookie and in process memory between generation and
 * cookie-setting. The persistence layer enforces a unique constraint
 * on `tokenHash`.
 *
 * `expiresAt` is the absolute expiry timestamp. A session is
 * considered expired once `now >= expiresAt`; the session-lookup
 * query filters these out.
 *
 * `lastSeenAt` is initialised to the creation timestamp and updated
 * on every session-validation touch (subject to the idle-touch
 * interval).
 */
export interface CreateSessionInput {
  readonly userId: UserId;
  readonly tokenHash: SessionTokenHash;
  readonly expiresAt: Date;
  readonly lastSeenAt: Date;
}

/**
 * The canonical Session domain model. A readonly snapshot of a
 * session's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded.
 * - `userId`: the User this session belongs to. Foreign key to the
 *   User row; restricted deletion (a User with sessions cannot be
 *   deleted — sessions must be revoked first).
 * - `tokenHash`: SHA-256 hash of the opaque session token. Unique.
 *   The raw token is never persisted.
 * - `activeTenantMembershipId`: the TenantMembership this session has
 *   selected as its active Tenant context, or `null` when no context
 *   is selected. Per the fifth canonical batch specification, the
 *   active context is session-specific (different sessions for the
 *   same user have independent context), is selected by
 *   TenantMembership ID (never by an arbitrary Tenant ID), and is
 *   enforced at the database level to reference a membership that
 *   belongs to this session's user. A `null` value means "no active
 *   context"; the session remains valid. Per ADR-013 §1.3, the
 *   session record carries active Tenant context; the fifth batch
 *   introduces active Tenant context only (no active Organisation or
 *   Facility context, no role or permission context).
 * - `expiresAt`: absolute expiry timestamp. Once `now >= expiresAt`,
 *   the session is no longer active.
 * - `lastSeenAt`: timestamp of the most recent session-validation
 *   touch. Used by the idle-timeout check.
 * - `rotatedAt`: timestamp of the most recent token rotation, or
 *   `null` if the session has never been rotated. Used to decide
 *   when the next rotation is due.
 * - `revokedAt`: timestamp of explicit revocation, or `null` if the
 *   session is not revoked. Once set, the session is no longer
 *   active regardless of `expiresAt`.
 * - `createdAt`: timezone-aware timestamp recording when the session
 *   row was inserted. Set by the persistence layer; never mutated.
 */
export interface Session {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly tokenHash: SessionTokenHash;
  readonly activeTenantMembershipId: TenantMembershipId | null;
  readonly expiresAt: Date;
  readonly lastSeenAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
}
