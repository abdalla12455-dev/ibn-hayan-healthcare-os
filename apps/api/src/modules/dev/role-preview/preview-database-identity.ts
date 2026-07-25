/**
 * Database-identity gate for the Demo Role Preview Mode seed, the
 * logged-out bootstrap flow, and the PostgreSQL 17 integration-test
 * bootstrap.
 *
 * Per the Secure Logged-Out Demo Role Bootstrap specification, every
 * preview-aware entry point must verify BOTH:
 *
 * 1. `DATABASE_URL` positively identifies an isolated role-preview
 *    transactional database.
 * 2. `AUDIT_DATABASE_URL` positively identifies a SEPARATE isolated
 *    role-preview audit database.
 *
 * The two URLs must NOT resolve to the same database name; ADR-014
 * (Audit Store and Integrity Strategy) requires the audit store to
 * be a dedicated database separate from the transactional store.
 *
 * ---
 *
 * ## Why this module exists (root-cause correction)
 *
 * The previous implementation used a case-insensitive substring
 * match on the FULL URL: `url.toLowerCase().includes('role_preview')`.
 * That check is unsafe because the substring can appear anywhere in
 * the URL — in the username (`role_preview_user:pass@host/prod`),
 * in the hostname (`role-preview-db.example.com/prod`), or in the
 * query string (`?schema=role_preview`). None of those prove the
 * DATABASE NAME is preview-specific. A misconfigured environment
 * could therefore pass the gate while pointing at a production
 * database.
 *
 * The previous implementation also validated ONLY `DATABASE_URL`;
 * `AUDIT_DATABASE_URL` was never checked by the seed. This left the
 * audit database free to point at any value, including a production
 * audit database.
 *
 * This module corrects both gaps by:
 *
 * 1. Parsing the URL with the native `URL` parser (no regex, no
 *    substring match on the full URL).
 * 2. Deriving the database name from `url.pathname` (the part after
 *    the leading `/`). Only the database name is checked for the
 *    preview identifier — never the username, hostname, or query.
 * 3. Validating BOTH `DATABASE_URL` and `AUDIT_DATABASE_URL`.
 * 4. Comparing the two parsed database names and rejecting identical
 *    names.
 *
 * The module is pure: it never logs the URL, never returns a
 * credential, never returns the full URL, and never connects to the
 * database. The structured result carries only safe fields:
 * - `ok: boolean` — the decision.
 * - `reason: string` — a safe failure code (no credential, no URL).
 * - `databaseName: string | undefined` — the parsed database name
 *   (safe to log because it is the pathname only, never the
 *   credentials or host).
 */

/**
 * The set of approved preview-database-name identifiers. A database
 * name must contain at least one of these substrings to be accepted
 * as a preview database.
 *
 * Both `role_preview` and `preview_role` are accepted so that
 * operators can choose either naming convention
 * (e.g. `role_preview_db`, `role_preview_audit`, `preview_role_db`).
 *
 * The check is performed on the parsed database name ONLY — never on
 * the username, hostname, query string, or full URL.
 */
export const PREVIEW_DATABASE_NAME_IDENTIFIERS = [
  'role_preview',
  'preview_role',
] as const;

/**
 * The set of URL schemes accepted as PostgreSQL-compatible. Both
 * `postgresql://` (the canonical IANA-registered scheme) and
 * `postgres://` (the legacy libpq scheme) are accepted.
 */
const ACCEPTED_URL_SCHEMES = new Set(['postgresql:', 'postgres:']);

/**
 * The result of validating a single preview database URL.
 *
 * The result is safe to log: it never carries the URL, the
 * credentials, the username, the password, the hostname, or the
 * query string. The only potentially-sensitive field is
 * `databaseName`, which is the pathname of the URL (the database
 * name). Database names are not credentials; they are safe to
 * include in operator logs and error messages.
 */
export interface PreviewDatabaseUrlValidation {
  /** Whether the URL positively identifies an isolated preview database. */
  readonly ok: boolean;
  /**
   * A safe failure code (no credential, no URL). Present only when
   * `ok === false`.
   *
   * - `missing` — the URL was `undefined`, `null`, or an empty string.
   * - `malformed` — the URL could not be parsed by the native `URL`
   *   parser.
   * - `unsupported_protocol` — the URL parsed but the scheme is not
   *   `postgresql:` or `postgres:`.
   * - `empty_database_name` — the URL parsed but the pathname did
   *   not yield a non-empty database name.
   * - `non_preview_database_name` — the URL parsed and yielded a
   *   database name, but the name does not contain an approved
   *   preview identifier.
   */
  readonly reason?:
    | 'missing'
    | 'malformed'
    | 'unsupported_protocol'
    | 'empty_database_name'
    | 'non_preview_database_name';
  /**
   * The parsed database name (the URL pathname with the leading `/`
   * stripped). Present only when the URL parsed successfully and
   * yielded a non-empty database name. Safe to log.
   */
  readonly databaseName?: string;
}

/**
 * The result of validating the transactional + audit URL pair.
 *
 * The result is safe to log: it never carries a full URL, a
 * credential, a username, a password, a hostname, or a query
 * string. The structured per-URL results may carry `databaseName`
 * (safe to log).
 */
export interface PreviewDatabaseIdentityResult {
  /** Whether BOTH URLs pass and resolve to distinct database names. */
  readonly ok: boolean;
  /** The transactional-URL validation result. */
  readonly transactional: PreviewDatabaseUrlValidation;
  /** The audit-URL validation result. */
  readonly audit: PreviewDatabaseUrlValidation;
  /**
   * Whether the two parsed database names are distinct. Present only
   * when both URLs individually pass. `false` means the two URLs
   * resolve to the same database name (a violation of ADR-014).
   */
  readonly distinct?: boolean;
  /**
   * A safe failure code for the pair. Present only when `ok === false`.
   *
   * - `transactional_invalid` — the transactional URL failed its
   *   individual validation.
   * - `audit_invalid` — the audit URL failed its individual
   *   validation.
   * - `databases_not_distinct` — both URLs individually pass but
   *   resolve to the same database name.
   */
  readonly reason?:
    'transactional_invalid' | 'audit_invalid' | 'databases_not_distinct';
}

/**
 * Validate a single preview database URL.
 *
 * The function is pure: it does NOT log, does NOT throw, and does
 * NOT connect to the database. The caller decides how to react to a
 * non-`ok` result.
 *
 * The validation steps are:
 * 1. The URL must be a non-empty string.
 * 2. The URL must parse with the native `URL` parser.
 * 3. The URL scheme must be `postgresql:` or `postgres:`.
 * 4. The URL pathname must yield a non-empty database name (the
 *    leading `/` is stripped; the remainder must be non-empty).
 * 5. The database name (lowercased) must contain at least one
 *    approved preview identifier (`role_preview` or `preview_role`).
 *
 * The function NEVER performs a substring match on the full URL.
 * Only the parsed database name is checked. This prevents false
 * positives from usernames, hostnames, or query strings that happen
 * to contain the preview identifier.
 *
 * @param url The candidate URL (typically `process.env.DATABASE_URL`
 *   or `process.env.AUDIT_DATABASE_URL`).
 * @returns A safe structured validation result.
 */
export function validatePreviewDatabaseUrl(
  url: unknown,
): PreviewDatabaseUrlValidation {
  if (typeof url !== 'string' || url.length === 0) {
    return { ok: false, reason: 'missing' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!ACCEPTED_URL_SCHEMES.has(parsed.protocol)) {
    return { ok: false, reason: 'unsupported_protocol' };
  }

  // The pathname begins with `/`. Strip the leading slash to
  // derive the database name. If the pathname is empty or just `/`,
  // the URL does not identify a database.
  const rawPath = parsed.pathname;
  if (rawPath.length === 0 || rawPath === '/') {
    return { ok: false, reason: 'empty_database_name' };
  }
  const databaseName = rawPath.replace(/^\//, '');
  if (databaseName.length === 0) {
    return { ok: false, reason: 'empty_database_name' };
  }

  const lower = databaseName.toLowerCase();
  const isPreview = PREVIEW_DATABASE_NAME_IDENTIFIERS.some((id) =>
    lower.includes(id),
  );
  if (!isPreview) {
    return { ok: false, reason: 'non_preview_database_name', databaseName };
  }

  return { ok: true, databaseName };
}

/**
 * Validate the transactional + audit URL pair.
 *
 * This is the canonical entry point for the database-identity gate.
 * It validates BOTH URLs individually and then verifies they resolve
 * to distinct database names.
 *
 * The function is pure: it does NOT log, does NOT throw, and does
 * NOT connect to the database. The caller decides how to react to a
 * non-`ok` result.
 *
 * @param env The environment record (typically `process.env`).
 * @returns A safe structured validation result.
 */
export function validatePreviewDatabaseIdentity(
  env: NodeJS.ProcessEnv,
): PreviewDatabaseIdentityResult {
  const transactional = validatePreviewDatabaseUrl(env['DATABASE_URL']);
  if (!transactional.ok) {
    return {
      ok: false,
      transactional,
      audit: validatePreviewDatabaseUrl(env['AUDIT_DATABASE_URL']),
      reason: 'transactional_invalid',
    };
  }

  const audit = validatePreviewDatabaseUrl(env['AUDIT_DATABASE_URL']);
  if (!audit.ok) {
    return {
      ok: false,
      transactional,
      audit,
      reason: 'audit_invalid',
    };
  }

  // Both URLs individually pass. Verify they resolve to distinct
  // database names. ADR-014 requires the audit store to be a
  // dedicated database separate from the transactional store.
  const distinct = transactional.databaseName !== audit.databaseName;
  if (!distinct) {
    return {
      ok: false,
      transactional,
      audit,
      distinct: false,
      reason: 'databases_not_distinct',
    };
  }

  return {
    ok: true,
    transactional,
    audit,
    distinct: true,
  };
}

// ---------------------------------------------------------------------------
// Backward-compatible boolean wrappers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the supplied `DATABASE_URL` positively
 * identifies an isolated role-preview transactional database.
 *
 * This is the boolean wrapper around {@link validatePreviewDatabaseUrl}
 * retained for callers that only need the decision (e.g. the
 * role-preview controller's bootstrap gate).
 *
 * The function NEVER logs the URL.
 */
export function isPreviewTransactionalDatabaseUrl(url: unknown): boolean {
  return validatePreviewDatabaseUrl(url).ok;
}

/**
 * Returns `true` when the supplied `AUDIT_DATABASE_URL` positively
 * identifies an isolated role-preview audit database.
 *
 * This is the boolean wrapper around {@link validatePreviewDatabaseUrl}
 * retained for callers that only need the decision.
 *
 * The function NEVER logs the URL.
 */
export function isPreviewAuditDatabaseUrl(url: unknown): boolean {
  return validatePreviewDatabaseUrl(url).ok;
}

/**
 * Returns `true` when BOTH the transactional and the audit database
 * URLs positively identify isolated role-preview databases AND the
 * two databases are distinct.
 *
 * This is the boolean wrapper around
 * {@link validatePreviewDatabaseIdentity} retained for callers that
 * only need the decision (e.g. the role-preview controller's
 * bootstrap gate).
 *
 * Reads the URLs from the supplied env-like record (typically
 * `process.env`). NEVER logs the URLs.
 */
export function isPreviewDatabaseIdentityValid(
  env: NodeJS.ProcessEnv,
): boolean {
  return validatePreviewDatabaseIdentity(env).ok;
}
