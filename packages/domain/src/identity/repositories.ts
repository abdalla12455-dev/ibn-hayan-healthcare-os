/**
 * Identity repository ports.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * repository interfaces are declared in the domain package and
 * implemented by persistence adapters in
 * `apps/api/src/infrastructure/database/`. The API layer depends on
 * the interface; the Prisma-backed implementation is injected at the
 * composition root.
 *
 * Per ADR-013 (Authentication and Session Strategy):
 * - The session repository persists only a hash of the opaque session
 *   token, never the raw token (§1.1, §1.3).
 * - Revoked or expired sessions must not be treated as active (§1.3,
 *   §1.4). The `findActiveByTokenHash` port filters by `revokedAt`
 *   and `expiresAt` at the database level; the application layer
 *   re-checks in case of clock skew.
 * - `revokeAllForUser` supports the per-operation verification chain's
 *   requirement that a disabled user's sessions can be invalidated
 *   promptly (§1.4).
 *
 * The ports return domain values (User, TenantMembership, Session),
 * not Prisma-generated row types. The mapping between Prisma types
 * and domain types is explicit and tested in the persistence adapter.
 *
 * No use cases, API DTOs, controllers, or business workflows are
 * declared here. The ports are pure data-access interfaces.
 *
 * No generic repository abstraction is declared. Each bounded context
 * owns its own port; there is no `Repository<T>` base interface. This
 * is intentional: a generic abstraction encourages leaky scopes (for
 * example, a generic `findById(id)` that omits the user filter).
 *
 * No `LocalCredential` port is declared here. The credential row is
 * infrastructure-only: it stores the Argon2id password hash and is
 * never exposed through a domain type. The credential write/read
 * operations are performed by an infrastructure-only service in
 * `apps/api/src/infrastructure/database/` and are consumed by the
 * `PasswordService` and `AuthService` directly, not through a domain
 * port. This keeps the credential lifecycle (password changes,
 * credential rotation) decoupled from the user lifecycle and prevents
 * the password hash from leaking through the domain layer.
 *
 * No role or permission ports are declared here. The role/permission
 * catalogue is deferred to a subsequent batch per ADR-013 §1.1
 * ("Authentication and authorisation are separate concerns").
 */

import type {
  User,
  UserId,
  CreateUserInput,
} from './user.js';
import type {
  TenantMembership,
  TenantMembershipId,
  CreateTenantMembershipInput,
} from './membership.js';
import type {
  Session,
  SessionId,
  SessionTokenHash,
  CreateSessionInput,
} from './session.js';

/**
 * Repository port for the User bounded context.
 *
 * User reads are by `id` or by `normalisedEmail`. The `normalisedEmail`
 * lookup is used at login to resolve an email address (typed by the
 * caller) to a User row; the persistence layer performs the lookup
 * against the `normalised_email` column, which has a unique index.
 *
 * The port does not return password hashes. The `User` type does not
 * carry credential material; the credential row is read separately by
 * the infrastructure-only `LocalCredentialService`.
 */
export interface UserRepository {
  /**
   * Create a new User. Throws a domain error (translated to 409
   * Conflict at the API boundary) if a User with the same
   * `normalisedEmail` already exists.
   *
   * The persistence layer derives `normalisedEmail` from `email` by
   * trimming surrounding whitespace and lowercasing. The caller does
   * not pass `normalisedEmail` directly.
   */
  create(input: CreateUserInput): Promise<User>;

  /**
   * Find a User by its stable UUID identifier. Returns `null` if no
   * User exists with the given id.
   */
  findById(userId: UserId): Promise<User | null>;

  /**
   * Find a User by its normalised email address. Returns `null` if no
   * User exists with the given normalised email. The caller is
   * responsible for normalising the email (trim + lowercase) before
   * calling this method; the persistence layer does not re-normalise.
   *
   * This is the lookup used at login. The login service normalises
   * the submitted email and resolves it to a User; if no User is
   * found, the login service returns the same generic 401 as any
   * other failed login (per ADR-013 §1.1 — login errors must not
   * reveal whether the account exists).
   */
  findByNormalisedEmail(normalisedEmail: string): Promise<User | null>;
}

/**
 * Repository port for the TenantMembership bounded context.
 *
 * Memberships are scoped to a User for read purposes: a User's
 * memberships are listed to populate the dashboard and to drive the
 * per-operation verification chain. There is no `listForTenant` port
 * in this batch — tenant-scoped user administration is deferred to a
 * subsequent batch.
 */
export interface TenantMembershipRepository {
  /**
   * Create a new TenantMembership. Throws a domain error (translated
   * to 409 Conflict at the API boundary) if a membership with the
   * same `(tenantId, userId)` pair already exists.
   */
  create(input: CreateTenantMembershipInput): Promise<TenantMembership>;

  /**
   * Find a TenantMembership by its stable UUID identifier. Returns
   * `null` if no membership exists with the given id.
   */
  findById(membershipId: TenantMembershipId): Promise<TenantMembership | null>;

  /**
   * List all TenantMemberships belonging to a specific User. The
   * result is user-scoped; no membership belonging to a different
   * User can appear in the result. Used by the dashboard to display
   * the user's tenant access and by the login flow to verify that
   * the user has at least one active membership.
   */
  listForUser(userId: UserId): Promise<TenantMembership[]>;
}

/**
 * Repository port for the Session bounded context.
 *
 * Sessions are looked up by the SHA-256 hash of the opaque session
 * token (never by the raw token). The lookup filters out revoked
 * and expired sessions at the database level; the application layer
 * re-checks in case of clock skew between the database and the
 * application process.
 *
 * Token rotation replaces the stored `tokenHash` and updates
 * `rotatedAt`. The previous token is invalidated immediately because
 * its hash no longer matches any row. Touching updates `lastSeenAt`
 * without rotating the token. Revocation sets `revokedAt`; a revoked
 * session is never returned by `findActiveByTokenHash`.
 */
export interface SessionRepository {
  /**
   * Create a new Session. Throws a domain error (translated to 409
   * Conflict at the API boundary) if a session with the same
   * `tokenHash` already exists. In practice this is astronomically
   * unlikely (256 bits of entropy) but the unique constraint is the
   * structural guarantee.
   */
  create(input: CreateSessionInput): Promise<Session>;

  /**
   * Find an active Session by the SHA-256 hash of its opaque token.
   * Returns `null` if no session exists with the given hash, or if
   * the session is revoked, or if the session has expired (relative
   * to `now`).
   *
   * This is the primary lookup used by the session-validation flow.
   * The application layer passes the current time as `now` so that
   * the expiry check is deterministic and testable (per
   * CODING_STANDARDS.md §11 — "The current time is injected via a
   * clock abstraction").
   */
  findActiveByTokenHash(
    tokenHash: SessionTokenHash,
    now: Date,
  ): Promise<Session | null>;

  /**
   * Rotate the session token. Replaces the stored `tokenHash` with
   * `newTokenHash` and updates `rotatedAt` to `rotatedAt`. The
   * previous token is invalidated immediately: its hash no longer
   * matches any row, so a subsequent `findActiveByTokenHash` with
   * the old hash returns `null`.
   *
   * The caller is responsible for generating the new token, hashing
   * it, and updating the cookie. This port only persists the new
   * hash.
   */
  rotateToken(
    sessionId: SessionId,
    newTokenHash: SessionTokenHash,
    rotatedAt: Date,
  ): Promise<Session | null>;

  /**
   * Touch the session's `lastSeenAt` timestamp. Used by the
   * session-validation flow to record activity without rotating the
   * token. The caller controls when to touch based on the idle-touch
   * interval (5 minutes by default); the port does not enforce the
   * interval.
   */
  touch(sessionId: SessionId, lastSeenAt: Date): Promise<Session | null>;

  /**
   * Revoke a single session. Sets `revokedAt` to `revokedAt`. The
   * session is no longer returned by `findActiveByTokenHash`. Used
   * by the logout flow and by explicit session-revocation flows.
   */
  revoke(sessionId: SessionId, revokedAt: Date): Promise<Session | null>;

  /**
   * Revoke all sessions belonging to a specific User. Sets
   * `revokedAt` on every non-revoked session for the user. Used when
   * a user is disabled, when a password is changed, or when the user
   * requests "sign out everywhere" (the last is a future batch).
   */
  revokeAllForUser(userId: UserId, revokedAt: Date): Promise<number>;
}
