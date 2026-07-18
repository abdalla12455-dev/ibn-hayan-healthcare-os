/**
 * Public auth-contract entry point.
 *
 * Re-exports the Zod schemas and the inferred TypeScript types so that
 * consumers import from `@ibn-hayan/contracts` (or from the package
 * root) without reaching into internal file paths.
 *
 * Per ADR-013 §1.3, the session record does not include the raw
 * session token, the password, the password hash, or any credential
 * material. These schemas never include `passwordHash`, `token`,
 * `tokenHash`, `csrfHash`, or any credential field.
 */

export {
  LoginRequestSchema,
  type LoginRequest,
  AuthenticatedUserSchema,
  type AuthenticatedUser,
  TenantMembershipSummarySchema,
  type TenantMembershipSummary,
  SessionResponseSchema,
  type SessionResponse,
  CsrfResponseSchema,
  type CsrfResponse,
  LogoutResponseSchema,
  type LogoutResponse,
  AuthErrorResponseSchema,
  type AuthErrorResponse,
} from './auth.schema.js';
