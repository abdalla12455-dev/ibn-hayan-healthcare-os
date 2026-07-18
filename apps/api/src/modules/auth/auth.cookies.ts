import type { CookieOptions } from 'express';

/**
 * Cookie-configuration helpers for the auth module.
 *
 * Per ADR-013 §1.1 and §5.2: "Session identifiers are stored only
 * in cookies configured with HttpOnly, Secure (outside local
 * development), SameSite protection, explicit expiry and rotation,
 * and narrow path and domain scope where applicable."
 *
 * The cookie is ALWAYS HttpOnly (JavaScript cannot read it). The
 * `secure` flag is `false` in development (so the cookie is sent
 * over HTTP on localhost) and `true` in production (so the cookie
 * is sent only over HTTPS). `sameSite` is `'lax'` in both
 * environments: the cookie is sent on same-site navigations and
 * same-origin requests, but NOT on cross-site POST requests. This
 * is a CSRF defence in addition to the explicit CSRF token check.
 *
 * The `path` is `'/'` so the cookie is sent to all API routes.
 * Narrowing the path to `/api/v1/auth` would prevent the cookie
 * from being sent to other API routes, but it would also prevent
 * the session-validation flow from running on those routes. We use
 * the root path and rely on HttpOnly + SameSite=Lax + the explicit
 * CSRF token check for security.
 *
 * No `domain` is set: the cookie is bound to the exact origin that
 * set it. Setting a domain would relax the origin binding and is
 * not needed in this batch.
 */

/**
 * Build the cookie options for the session cookie.
 *
 * @param isProduction - whether the API is running in production
 *   (NODE_ENV=production). In production, `secure: true` and the
 *   cookie is sent only over HTTPS.
 * @param maxAgeMs - the cookie's max-age in milliseconds. Set to
 *   the session's absolute TTL at login; set to 0 at logout (to
 *   clear the cookie).
 */
export function buildSessionCookieOptions(
  isProduction: boolean,
  maxAgeMs: number,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

/**
 * Build the cookie options for clearing the session cookie at logout.
 *
 * The options match the cookie's original options except `maxAge` is
 * 0 (which causes the browser to delete the cookie immediately).
 * The `path` MUST match the original cookie's path, otherwise the
 * browser will not delete the cookie.
 */
export function buildSessionCookieClearOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };
}
