/**
 * Database-identity gate for the Demo Role Preview Mode logged-out
 * bootstrap flow.
 *
 * Per the Secure Logged-Out Demo Role Bootstrap specification, the
 * bootstrap flow operates ONLY when ALL of the following are true:
 *
 * 1. `NODE_ENV !== 'production'` (checked by the feature gate).
 * 2. `IBN_HAYAN_ROLE_PREVIEW_ENABLED=true` (checked by the feature
 *    gate).
 * 3. `IBN_HAYAN_ROLE_PREVIEW_PASSWORD` is present and valid
 *    server-side (checked by the password validator).
 * 4. `DATABASE_URL` is positively identified as an isolated
 *    role-preview transactional database (checked here).
 * 5. `AUDIT_DATABASE_URL` is positively identified as an isolated
 *    role-preview audit database (checked here).
 *
 * This module implements checks 4 and 5. The checks are
 * defence-in-depth: they prevent the bootstrap flow from running
 * against a database whose URL does not identify it as the
 * isolated preview database. This is the same defence used by the
 * preview seed script (`role-preview-seed-dev.ts`), extended here
 * to the bootstrap flow.
 *
 * The check is conservative: the URL must contain the substring
 * `role_preview` OR `preview_role` (case-insensitive). This
 * matches the seed script's check exactly, so the bootstrap flow
 * and the seed are gated by the same database-identity rule.
 *
 * The check is pure: it does NOT connect to the database, does NOT
 * log the URL, and does NOT throw. The caller decides how to react
 * to a `false` return value.
 */

/**
 * Returns `true` when the supplied `DATABASE_URL` positively
 * identifies an isolated role-preview transactional database.
 *
 * The check is case-insensitive substring match on `role_preview`
 * or `preview_role`. This mirrors the seed script's check exactly.
 *
 * Returns `false` for:
 * - `undefined` or empty string
 * - any URL that does not contain the required substring
 *
 * The function NEVER logs the URL. The caller is responsible for
 * logging only the boolean decision (e.g. at debug level).
 */
export function isPreviewTransactionalDatabaseUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0) {
    return false;
  }
  const lower = url.toLowerCase();
  return lower.includes('role_preview') || lower.includes('preview_role');
}

/**
 * Returns `true` when the supplied `AUDIT_DATABASE_URL` positively
 * identifies an isolated role-preview audit database.
 *
 * The check is the same as the transactional check: the URL must
 * contain `role_preview` or `preview_role` (case-insensitive).
 *
 * Returns `false` for `undefined`, empty string, or any URL that
 * does not contain the required substring.
 *
 * The function NEVER logs the URL.
 */
export function isPreviewAuditDatabaseUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0) {
    return false;
  }
  const lower = url.toLowerCase();
  return lower.includes('role_preview') || lower.includes('preview_role');
}

/**
 * Returns `true` when BOTH the transactional and the audit database
 * URLs positively identify isolated role-preview databases. This is
 * the convenience helper used by the controller's bootstrap and
 * select routes.
 *
 * Reads the URLs from the supplied env-like record (typically
 * `process.env`). NEVER logs the URLs.
 */
export function isPreviewDatabaseIdentityValid(
  env: NodeJS.ProcessEnv,
): boolean {
  return (
    isPreviewTransactionalDatabaseUrl(env['DATABASE_URL']) &&
    isPreviewAuditDatabaseUrl(env['AUDIT_DATABASE_URL'])
  );
}
