import type { CookieOptions } from 'express';

/**
 * Bootstrap-cookie helpers for the Demo Role Preview Mode
 * logged-out bootstrap flow.
 *
 * The bootstrap cookie is a SEPARATE cookie from the normal
 * application-session cookie. It carries a cryptographically random
 * one-time nonce that the server uses as proof-of-possession when
 * the operator selects a role from the `/role-preview` page WITHOUT
 * having previously logged in.
 *
 * Per the Secure Logged-Out Demo Role Bootstrap specification:
 * - The cookie is ALWAYS `HttpOnly` (JavaScript cannot read it).
 * - The cookie is `Secure` in production (sent only over HTTPS).
 * - The cookie is `SameSite=Strict` (NEVER sent on cross-site
 *   requests, even top-level navigations). This is stricter than
 *   the application-session cookie (which is `SameSite=Lax`) because
 *   the bootstrap cookie is itself the CSRF defense for the initial
 *   logged-out `POST /select` request. There is no session-bound
 *   CSRF token available yet.
 * - The cookie's `Path` is `/api/v1/dev/role-preview` so that it is
 *   sent only to the role-preview routes, not to every API route.
 * - The cookie's `Max-Age` is at most 5 minutes (300 seconds). The
 *   server-side challenge state has the same expiry; both are
 *   consumed atomically on first use.
 * - No `domain` is set: the cookie is bound to the exact origin
 *   that set it.
 *
 * The bootstrap cookie carries NO role, tenant, organisation,
 * facility, membership, permission, or application session. It is
 * ONLY a proof-of-possession nonce. The server-side challenge state
 * (in `BootstrapChallengeStore`) maps the nonce's hash to the
 * expiry and consumed flag.
 */

/**
 * The name of the bootstrap cookie. The name is deliberately
 * specific to the role-preview feature so that it does not collide
 * with any other cookie in the application.
 */
export const BOOTSTRAP_COOKIE_NAME = 'ibn_hayan_role_preview_bootstrap';

/**
 * The maximum lifetime of a bootstrap challenge, in milliseconds.
 * Per the specification, this MUST NOT exceed five minutes.
 */
export const BOOTSTRAP_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Build the cookie options for setting the bootstrap cookie.
 *
 * @param isProduction - whether the API is running in production
 *   (NODE_ENV=production). In production, `secure: true`.
 * @param maxAgeMs - the cookie's max-age in milliseconds. MUST NOT
 *   exceed `BOOTSTRAP_MAX_AGE_MS`. The caller is responsible for
 *   enforcing the cap.
 */
export function buildBootstrapCookieOptions(
  isProduction: boolean,
  maxAgeMs: number,
): CookieOptions {
  // Defence-in-depth: clamp the max-age to the specification cap.
  // Even if a caller passes a larger value, the cookie's max-age
  // will not exceed five minutes.
  const clampedMaxAge = Math.min(maxAgeMs, BOOTSTRAP_MAX_AGE_MS);
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/dev/role-preview',
    maxAge: clampedMaxAge,
  };
}

/**
 * Build the cookie options for clearing the bootstrap cookie.
 *
 * The options match the cookie's original options except `maxAge`
 * is 0 (which causes the browser to delete the cookie immediately).
 * The `path` MUST match the original cookie's path, otherwise the
 * browser will not delete the cookie.
 */
export function buildBootstrapCookieClearOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/v1/dev/role-preview',
    maxAge: 0,
  };
}
