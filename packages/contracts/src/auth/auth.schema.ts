import { z } from 'zod';
import { ActiveTenantContextSchema } from '../context/context.schema.js';

/**
 * Shared authentication contracts for the Ibn Hayan Healthcare
 * Operating System.
 *
 * This module is the single source of truth for the shape of the
 * authentication API request and response payloads. Both
 * `@ibn-hayan/api` (the NestJS backend that produces the responses)
 * and `@ibn-hayan/web` (the Next.js thin client that consumes them)
 * derive their types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript
 * types are inferred from the Zod schemas via `z.infer` — no separate
 * authoritative interfaces are maintained.
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. The `AuthErrorResponse` schema is intentionally generic:
 * it carries a single error code and message that do not distinguish
 * between "unknown email", "wrong password", "disabled user", and
 * "no active membership". All four conditions produce the same
 * response shape.
 *
 * Per ADR-013 §1.3, the session record does not include the raw
 * session token, the password, the password hash, or any credential
 * material. These schemas never include `passwordHash`, `token`,
 * `tokenHash`, `csrfHash`, or any credential field. The raw session
 * token is carried only in the HttpOnly cookie; the raw CSRF token
 * is returned only in the `CsrfResponse` JSON body (held in component
 * memory by the web client, never persisted to browser storage).
 */

// ---------------------------------------------------------------------------
// LoginRequest
// ---------------------------------------------------------------------------

/**
 * The canonical login request schema.
 *
 * `email` is the user's email address. The API trims and lowercases
 * it before lookup; the contract accepts mixed-case input so the
 * user can type their email naturally.
 *
 * `password` is the user's plaintext password. The API never logs
 * it, never persists it, and never returns it in a response. The
 * contract marks it `write-only` in OpenAPI via `@nestjs/swagger`
 * metadata at the controller level.
 *
 * Minimum password length: 12 characters. Maximum accepted password
 * length: 128 characters. No arbitrary composition rules (per
 * ADR-013 §1.1, composition rules hurt usability without improving
 * security; the length requirement is the primary defence).
 *
 * Email maximum length: 320 characters (RFC 5321 practical limit).
 *
 * `.strict()` rejects extra fields at the boundary.
 */
export const LoginRequestSchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(12).max(128),
  })
  .strict();

/**
 * The TypeScript type of a validated login request.
 */
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// ---------------------------------------------------------------------------
// AuthenticatedUser
// ---------------------------------------------------------------------------

/**
 * The canonical authenticated-user schema. Returned in `SessionResponse`
 * and `LoginRequest`'s successful response.
 *
 * Excludes `passwordHash`, `normalisedEmail` (internal lookup field),
 * and any credential material. The `email` field is the user's
 * preferred display email (preserving their original case).
 *
 * `status` is the user's lifecycle status. The values are `active`
 * and `disabled`. A `disabled` user cannot sign in; if a disabled
 * user's session is checked, the session endpoint returns 401.
 */
export const AuthenticatedUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().max(320),
    displayName: z.string().max(200),
    status: z.enum(['active', 'disabled']),
  })
  .strict();

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

// ---------------------------------------------------------------------------
// TenantMembershipSummary
// ---------------------------------------------------------------------------

/**
 * A summary of a tenant membership, returned as part of the session
 * response so the web client can display the user's tenant access.
 *
 * Excludes the membership's `createdAt` and `updatedAt` (not needed
 * by the client). Carries `tenantId`, `tenantSlug`, `tenantDisplayName`
 * for display, and `status` for the membership lifecycle.
 *
 * Per the fourth canonical batch specification, no role or permission
 * fields are included. The role/permission catalogue is deferred.
 */
export const TenantMembershipSummarySchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    tenantSlug: z.string().max(80),
    tenantDisplayName: z.string().max(200),
    status: z.enum(['active', 'suspended']),
  })
  .strict();

export type TenantMembershipSummary = z.infer<
  typeof TenantMembershipSummarySchema
>;

// ---------------------------------------------------------------------------
// SessionResponse
// ---------------------------------------------------------------------------

/**
 * The canonical session response schema. Returned by the login
 * endpoint (after successful authentication) and by the session
 * endpoint (on session validation).
 *
 * Carries:
 * - `user`: the authenticated user's public profile.
 * - `memberships`: the user's active tenant memberships. A user with
 *   no active memberships receives an empty array; the login flow
 *   rejects such users with a generic 401 before this response is
 *   produced, but the session endpoint may return an empty array if
 *   the user's last membership is suspended between login and
 *   session check.
 * - `activeTenantContext`: the session's currently selected Tenant
 *   context, or `null` when no context is selected. Per the fifth
 *   canonical batch specification:
 *   - The active context is session-specific. Different sessions for
 *     the same user have independent context.
 *   - The shape is identical to `ActiveTenantContext` from the
 *     context contract; the field is re-used (not duplicated) by
 *     importing `ActiveTenantContextSchema`.
 *   - Login may return `activeTenantContext = null` because a fresh
 *     session has no selected context yet.
 *   - Session inspection returns the current valid context. If the
 *     selected membership becomes invalid (suspended membership,
 *     suspended Tenant), the session endpoint clears it server-side
 *     and returns `null` in the same response.
 *   - Session rotation preserves the active context (rotation is a
 *     token replacement, not a context change).
 * - `expiresAt`: the session's absolute expiry timestamp (ISO 8601
 *   string). The web client uses this to display session expiry and
 *   to decide when to refresh.
 *
 * The raw session token is NEVER included in this response. The
 * token is carried only in the HttpOnly cookie. The web client
 * cannot read the cookie value (it is HttpOnly); it relies on the
 * cookie being sent automatically with subsequent `credentials:
 * 'include'` requests.
 */
export const SessionResponseSchema = z
  .object({
    user: AuthenticatedUserSchema,
    memberships: z.array(TenantMembershipSummarySchema),
    activeTenantContext: ActiveTenantContextSchema.nullable(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

// ---------------------------------------------------------------------------
// CsrfResponse
// ---------------------------------------------------------------------------

/**
 * The canonical CSRF token response schema. Returned by the CSRF
 * endpoint.
 *
 * Carries the raw CSRF token in the `token` field. The web client
 * holds this value in component memory only (never in localStorage,
 * sessionStorage, or a readable cookie) and sends it back via the
 * `X-CSRF-Token` header on logout.
 *
 * The server stores only a SHA-256 hash of the CSRF token in
 * session-side state (a dedicated field on the session record, or
 * a session-bound derivation). The raw token is generated, returned
 * to the client, and discarded by the server; the server retains
 * only the hash for subsequent verification.
 *
 * Per ADR-013 §1.1, CSRF protection is mandatory for state-changing
 * browser requests. The token is session-bound: a CSRF token issued
 * for one session cannot be used with another session's logout
 * request.
 */
export const CsrfResponseSchema = z
  .object({
    token: z.string().min(32),
  })
  .strict();

export type CsrfResponse = z.infer<typeof CsrfResponseSchema>;

// ---------------------------------------------------------------------------
// LogoutResponse
// ---------------------------------------------------------------------------

/**
 * The canonical logout response schema. Returned by the logout
 * endpoint after the server-side session has been revoked and the
 * cookie cleared.
 *
 * Carries only a single `ok` field with value `true`. No session
 * metadata, no user identity, no timestamps. This is the strict
 * minimum the web client needs to confirm the logout succeeded.
 */
export const LogoutResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// ---------------------------------------------------------------------------
// AuthErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical authentication error response schema. Returned for:
 * - Unknown email at login.
 * - Wrong password at login.
 * - Disabled user at login.
 * - User with no active membership at login.
 * - Missing or invalid session at session endpoint.
 * - Expired session at session endpoint.
 * - Revoked session at session endpoint.
 * - Missing authentication at CSRF endpoint.
 * - Missing CSRF header at logout.
 * - Invalid CSRF token at logout.
 * - Disallowed Origin at logout.
 *
 * All of the above produce the same response shape. The `code` is
 * a stable machine-readable string; the `message` is a generic
 * human-readable string that does NOT distinguish between the
 * conditions. Per ADR-013 §1.1, login errors must not reveal whether
 * the account exists.
 *
 * The HTTP status code is 401 for authentication failures (unknown
 * email, wrong password, disabled user, no active membership,
 * missing/invalid/expired/revoked session) and 403 for authorisation
 * failures (missing/invalid CSRF, disallowed Origin). Both return
 * this same response shape; the client distinguishes by HTTP status.
 */
export const AuthErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'AUTH_INVALID_CREDENTIALS',
          'AUTH_SESSION_REQUIRED',
          'AUTH_CSRF_INVALID',
          'AUTH_ORIGIN_DISALLOWED',
          'CONTEXT_SELECTION_FORBIDDEN',
          'CONTEXT_REQUEST_INVALID',
        ]),
        message: z.string(),
      })
      .strict(),
  })
  .strict();

export type AuthErrorResponse = z.infer<typeof AuthErrorResponseSchema>;
