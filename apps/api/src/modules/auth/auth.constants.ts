/**
 * Auth-module constants.
 *
 * Centralised constants for the authentication and session module.
 * Per ADR-013 §1.1 and §1.7, session-expiry durations, Argon2id
 * parameters, and rate-limit thresholds are "centrally configured"
 * rather than hardcoded as architectural identity. The constants
 * here are the in-module defaults; production deployments override
 * them through environment variables read at module construction.
 *
 * The values chosen are conservative and defensible:
 * - 12-hour absolute expiry: long enough for a clinical shift, short
 *   enough to limit the blast radius of a stolen cookie.
 * - 5-minute idle-touch interval: balances DB write load against
 *   idle-timeout accuracy.
 * - 30-minute rotation interval: limits the value of a stolen token
 *   hash to 30 minutes of activity.
 *
 * Per ADR-013 §1.1: "Server-managed sessions can be revoked
 * server-side immediately." Rotation revokes the previous token hash
 * immediately; revocation revokes the session entirely.
 */

/**
 * Absolute session expiry: 12 hours (in milliseconds).
 *
 * A session is considered expired once `now >= session.expiresAt`.
 * The expiry is set at session creation and does not extend on
 * activity. This is the absolute upper bound on a session's
 * lifetime; idle timeout may end it sooner.
 */
export const SESSION_ABSOLUTE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Idle-touch interval: 5 minutes (in milliseconds).
 *
 * The session's `lastSeenAt` is updated on session validation only
 * if at least this much time has elapsed since the last touch. This
 * avoids a database write on every request while still keeping the
 * idle timeout accurate to within 5 minutes.
 */
export const SESSION_IDLE_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Token-rotation interval: 30 minutes (in milliseconds).
 *
 * If the session's `rotatedAt` is more than this many milliseconds
 * ago (or `rotatedAt` is null and the session was created more than
 * this many milliseconds ago), the session-validation flow rotates
 * the token: a new opaque token is generated, its SHA-256 hash
 * replaces the stored `tokenHash`, the cookie is updated, and the
 * previous token is invalidated immediately.
 */
export const SESSION_ROTATION_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Session-token entropy: 256 bits (32 bytes).
 *
 * The opaque session token is generated using `crypto.randomBytes`
 * with this many bytes of entropy. Encoded as base64url, the token
 * is 43 characters long. The token is hashed with SHA-256 before
 * storage; the hash is 64 hex characters (256 bits).
 *
 * 256 bits is the minimum entropy for a session token. Brute-forcing
 * 2^256 possibilities is computationally infeasible.
 */
export const SESSION_TOKEN_ENTROPY_BYTES = 32;

/**
 * CSRF token entropy: 256 bits (32 bytes).
 *
 * The CSRF token is generated using `crypto.randomBytes` with this
 * many bytes of entropy. Encoded as base64url, the token is 43
 * characters long. The token is hashed with SHA-256 before storage;
 * the hash is 64 hex characters. The raw token is returned to the
 * client and held in component memory only.
 */
export const CSRF_TOKEN_ENTROPY_BYTES = 32;

/**
 * Cookie name for the opaque session token.
 *
 * The cookie is HttpOnly (not readable by JavaScript), Secure in
 * production (transmitted only over HTTPS), and SameSite=Lax (sent
 * on same-site navigations and same-origin requests, but not on
 * cross-site POST requests — this is a CSRF defence in addition to
 * the explicit CSRF token check).
 */
export const SESSION_COOKIE_NAME = 'ibn_hayan_session';

/**
 * Cookie name for the CSRF token.
 *
 * NOT used in this implementation. The CSRF token is returned in
 * the JSON body of the CSRF endpoint and held in component memory
 * by the web client. It is NOT stored in a cookie. This constant
 * is exported for documentation only; it is not used at runtime.
 */
export const CSRF_COOKIE_NAME = 'ibn_hayan_csrf';

/**
 * HTTP header name for the CSRF token.
 *
 * The web client sends the raw CSRF token in this header on
 * state-changing requests (logout). The server compares the SHA-256
 * hash of the submitted token against the stored hash.
 */
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Minimum password length: 12 characters.
 *
 * Per ADR-013 §1.1, no arbitrary composition rules. The length
 * requirement is the primary defence against brute-force attacks;
 * Argon2id is the primary defence against offline hash cracking.
 *
 * The contract schema (`LoginRequestSchema`) enforces this at the
 * boundary. The constant here is for use by the auth service when
 * validating passwords at user-creation time.
 */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Maximum accepted password length: 128 characters.
 *
 * Per ADR-013 §1.1. Longer passwords are rejected to prevent
 * denial-of-service via expensive Argon2id hashes of very long
 * inputs. The Argon2id implementation itself has a hard limit on
 * input length; this constant is well below that limit.
 */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Argon2id default parameters. Per ADR-013 §1.1 and §1.7, these are
 * "centrally configured" — production deployments may override them
 * through environment variables read at module construction.
 *
 * The defaults are the argon2 package's recommended values:
 * - memoryCost: 65,536 KiB (64 MiB) — the minimum recommended for
 *   production use.
 * - timeCost: 3 iterations.
 * - parallelism: 4 lanes.
 *
 * These values are also the defaults that the `argon2` npm package
 * uses when no options are supplied, but we set them explicitly so
 * that parameter changes are visible in code review and so that
 * environment overrides take effect cleanly.
 */
export const ARGON2_DEFAULT_MEMORY_COST = 65_536;
export const ARGON2_DEFAULT_TIME_COST = 3;
export const ARGON2_DEFAULT_PARALLELISM = 4;

/**
 * Login throttling defaults. Per ADR-013 §1.1, "Rate limiting and
 * progressive login throttling are mandatory at the authentication
 * boundary." The `@nestjs/throttler` module enforces these limits.
 *
 * - LIMIT: maximum number of login attempts per TTL window per IP.
 * - TTL: the window duration in milliseconds.
 *
 * The defaults are conservative: 10 attempts per 60 seconds per IP.
 * This is per-IP, not per-email, so a distributed attack from many
 * IPs could still attempt many passwords per email. Per-email
 * throttling is a future batch concern (it requires persisting
 * attempt counts and would itself need to avoid leaking account
 * existence).
 */
export const LOGIN_THROTTLE_DEFAULT_LIMIT = 10;
export const LOGIN_THROTTLE_DEFAULT_TTL_MS = 60 * 1000;
