/**
 * User domain model.
 *
 * A User is an authenticated identity that can sign in to the Ibn Hayan
 * Healthcare Operating System. Every session, membership, and audit
 * event belongs to exactly one User. A User is scoped to the platform
 * (not to a single Tenant); a User's tenant access is expressed through
 * TenantMembership records. Per ADR-013 (Authentication and Session
 * Strategy), authentication is separated from authorisation: this type
 * represents the authenticated identity only; authorisation is
 * evaluated per-operation through the verification chain (ADR-013 §1.4).
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, argon2, or any framework. It is the structural
 * expression of ADR-006's commitment that store technologies are
 * implementation decisions, not architectural identity (per
 * CODING_STANDARDS.md §5) and ADR-013's separation of authentication
 * from persistence (per ADR-013 §1.1).
 *
 * The User type is a readonly snapshot of a user's persistent state at
 * a point in time. It deliberately does NOT include the password hash
 * or any credential material. The password hash lives on the
 * infrastructure-only `LocalCredential` model (in
 * `apps/api/src/infrastructure/database/`) and is never exposed through
 * this domain type. This is the structural enforcement of ADR-013 §1.1
 * point 12: "No real patient data or production credentials may be used
 * in development, seeds, demonstrations, screenshots, or tests" and of
 * CODING_STANDARDS.md §13: "No secrets in code".
 *
 * The framework-independent shape defined here is what the persistence
 * adapter in `apps/api/src/infrastructure/database/` maps to and from
 * the Prisma-generated `User` row type.
 */

/**
 * Stable identifier for a User. Typed as a brand so that a UserId
 * cannot be confused with a TenantId, SessionId, or TenantMembershipId
 * at the type level, even though all are UUIDs at the database level.
 *
 * The brand is erased at runtime; the value is just a string.
 */
export type UserId = string & { readonly __brand: 'UserId' };

/**
 * User lifecycle status. Per the fourth canonical batch specification,
 * the User lifecycle has exactly two values: `active` and `disabled`.
 *
 * - `active`: the user may sign in, hold sessions, and exercise their
 *   tenant memberships. A login attempt for an active user with valid
 *   credentials succeeds (subject to throttling and membership checks).
 * - `disabled`: the user may not sign in. A login attempt for a
 *   disabled user returns the same generic 401 as any other failed
 *   login; the disabled state is not disclosed to the caller (per
 *   ADR-013 §1.1 — login errors must not reveal whether the account
 *   exists). Existing sessions for a disabled user are not automatically
 *   revoked by the disabled flag alone, but the per-operation session
 *   verification chain rejects a session whose user is disabled.
 *
 * The values are kebab-case string literals so that they are stable
 * across serialised and in-memory representations (per
 * CODING_STANDARDS.md §3 — "union type members use kebab-case string
 * literals for serialised values").
 *
 * Adding a new value (for example, `locked` for repeated failed-login
 * auto-lock) is a domain change that requires coordinated migration of
 * the persistence layer, the session-verification chain, and the login
 * response surface. It is not a silent addition.
 */
export type UserLifecycleStatus = 'active' | 'disabled';

/**
 * The canonical User domain model. A readonly snapshot of a user's
 * persistent state at a point in time. Excludes password hashes and
 * any credential material — those live on the infrastructure-only
 * `LocalCredential` row and are never surfaced through this type.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded so it cannot be confused
 *   with other UUID identifiers.
 * - `email`: the user's preferred email address for login and
 *   correspondence. Maximum 320 characters (RFC 5321 practical limit).
 *   Stored verbatim; the persistence layer also stores a
 *   `normalisedEmail` for case-insensitive unique lookup.
 * - `normalisedEmail`: the canonical form of `email` used for unique
 *   lookup. Produced by trimming surrounding whitespace and lowercasing
 *   the entire address. The persistence layer enforces a unique
 *   constraint on this column.
 * - `displayName`: human-readable name. Maximum 200 characters. Used
 *   in operator-facing displays (dashboard header, audit narratives).
 * - `status`: current lifecycle status. `active` users may sign in;
 *   `disabled` users may not.
 * - `createdAt`: timezone-aware timestamp recording when the user row
 *   was inserted. Set by the persistence layer; never mutated.
 * - `updatedAt`: timezone-aware timestamp recording when the user row
 *   was last modified. Updated by the persistence layer on every write
 *   (via Prisma's `@updatedAt`).
 */
export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly normalisedEmail: string;
  readonly displayName: string;
  readonly status: UserLifecycleStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new User. The persistence layer assigns `id`,
 * `createdAt`, and `updatedAt`; the caller supplies the human-authored
 * fields. The persistence layer derives `normalisedEmail` from `email`
 * by trimming and lowercasing.
 *
 * `email` and `displayName` are required. The persistence layer
 * enforces the unique constraint on `normalisedEmail` and the length
 * limits; the domain port does not duplicate that enforcement.
 *
 * `status` is optional. When omitted, the persistence layer defaults
 * to `active`. When present, it must be one of the values in
 * {@link UserLifecycleStatus}.
 *
 * Password hashes are NOT part of this input. The `LocalCredential`
 * row is created separately by the authentication service after the
 * password has been hashed through Argon2id. This separation is
 * deliberate: it keeps the domain `User` model free of credential
 * material and allows the credential lifecycle (password changes,
 * credential rotation) to evolve independently of the user lifecycle.
 */
export interface CreateUserInput {
  readonly email: string;
  readonly displayName: string;
  readonly status?: UserLifecycleStatus;
}
