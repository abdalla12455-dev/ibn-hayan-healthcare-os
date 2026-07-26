/**
 * Server-only preview password architecture for Demo Role Preview Mode.
 *
 * This module replaces the previously-tracked fixed plaintext preview
 * password (now removed from the repository) with a server-only
 * environment variable: `IBN_HAYAN_ROLE_PREVIEW_PASSWORD`.
 *
 * Per the Secure Demo Role Preview Mode v1 correction specification:
 *
 * - **No default value.** The password is NEVER defaulted. The
 *   operator must supply it explicitly when preview mode is enabled.
 * - **No fallback value.** When preview mode is enabled and the
 *   password is missing or invalid, the application refuses to
 *   start. There is no silent fallback.
 * - **Never exposed through a `NEXT_PUBLIC_*` variable.** The
 *   password is server-only. The frontend never sees it.
 * - **Never returned to frontend code.** No API response, no audit
 *   event, no log line, no error message contains the password.
 * - **Never printed or logged.** The password is read from the
 *   environment, used to derive an Argon2id hash, and discarded. It
 *   is never passed to `console.*`, `Logger.*`, or any telemetry
 *   sink.
 * - **Never written into `PROJECT_CONTINUITY.md` or `worklog.md`.**
 *   Documentation references only the environment variable name and
 *   the protected file location; the value lives outside the
 *   repository.
 * - **Required only when preview mode or the preview seed is being
 *   used.** When `IBN_HAYAN_ROLE_PREVIEW_ENABLED` is not `'true'`
 *   (or when `NODE_ENV === 'production'`), the password is not
 *   required and not validated.
 * - **Production fails closed.** Even if the password is present
 *   and the flag is `'true'`, production refuses to enable preview
 *   mode. The gate (`RolePreviewFeatureConfig.isRolePreviewEnabled`)
 *   is the authoritative production-disable.
 * - **Minimum reasonable length.** The password must be at least
 *   `MIN_PREVIEW_PASSWORD_LENGTH` (12) characters. This matches the
 *   platform's password policy (ADR-013 §1.1).
 * - **Whitespace-only value rejected.** A value that is empty after
 *   trimming is treated as missing.
 * - **Development preview startup fails safely when missing.** The
 *   `RolePreviewModule` validates the password at module-init time
 *   when the gate is enabled; an invalid password prevents the
 *   application from starting.
 * - **Normal production and normal development startup with preview
 *   disabled must not require it.** When the gate returns `false`,
 *   the password is not read, not validated, and not required.
 *
 * The actual runtime password lives outside the repository, in a
 * protected file with directory permissions `0700` and file
 * permissions `0600`. The operator loads the file into the
 * environment before starting the API or running the preview seed.
 */

/**
 * The minimum length required for the preview password. Matches the
 * platform's password policy (ADR-013 §1.1: ≥ 12 characters).
 */
export const MIN_PREVIEW_PASSWORD_LENGTH = 12;

/**
 * The name of the server-only environment variable that supplies
 * the preview password. The variable is NEVER prefixed with
 * `NEXT_PUBLIC_`; the frontend cannot read it.
 */
export const PREVIEW_PASSWORD_ENV_VAR = 'IBN_HAYAN_ROLE_PREVIEW_PASSWORD';

/**
 * Error thrown when the preview password is missing, empty, or too
 * short when preview mode is enabled. The error message deliberately
 * does NOT include the password value, the environment variable
 * name in any sensitive context, or any hint about the password's
 * contents.
 *
 * The error is a plain `Error` (not a NestJS exception) so that it
 * can be thrown from both the NestJS module-init path and the
 * standalone seed script without pulling in NestJS runtime
 * dependencies.
 */
export class PreviewPasswordMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreviewPasswordMissingError';
    // Restore the prototype chain after the super call; required
    // for `instanceof` to work correctly when targeting ES2022+.
    Object.setPrototypeOf(this, PreviewPasswordMissingError.prototype);
  }
}

/**
 * Validate that a candidate preview password is well-formed.
 *
 * Rules:
 * - Must be a string.
 * - Must not be empty after `String.prototype.trim()`.
 * - Must be at least `MIN_PREVIEW_PASSWORD_LENGTH` characters long
 *   (after trimming).
 *
 * Returns `true` when the password is well-formed; `false`
 * otherwise. This function does NOT throw; callers decide how to
 * react to an invalid password. The function NEVER logs the
 * password value.
 *
 * @param value The candidate password (read from the environment).
 */
export function isValidPreviewPassword(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (trimmed.length < MIN_PREVIEW_PASSWORD_LENGTH) {
    return false;
  }
  return true;
}

/**
 * Read and validate the preview password from a process-env-like
 * record.
 *
 * When the supplied `env` record contains a well-formed
 * `IBN_HAYAN_ROLE_PREVIEW_PASSWORD` value, the function returns the
 * trimmed password string. The caller is responsible for hashing
 * the password with Argon2id before persistence and for never
 * printing, logging, or returning the plaintext.
 *
 * When the value is missing, empty, or too short, the function
 * throws a {@link PreviewPasswordMissingError}. The error message
 * identifies the environment variable by name (which is safe — the
 * variable name is not a secret) and states the minimum length
 * requirement. The error message does NOT include the supplied
 * value, the trimmed value, or any prefix of the value.
 *
 * The function is pure: it does NOT read `process.env` directly.
 * Callers pass the environment record explicitly so that the
 * function is unit-testable without mutating global state.
 *
 * @param env The environment record (typically `process.env`).
 * @returns The validated, trimmed preview password.
 * @throws {PreviewPasswordMissingError} When the password is
 *   missing, empty, or too short.
 */
export function readPreviewPasswordFromEnv(env: NodeJS.ProcessEnv): string {
  const raw = env[PREVIEW_PASSWORD_ENV_VAR];
  if (!isValidPreviewPassword(raw)) {
    throw new PreviewPasswordMissingError(
      `${PREVIEW_PASSWORD_ENV_VAR} is required when Demo Role Preview ` +
        `Mode is enabled. The value must be a non-empty string of at ` +
        `least ${String(MIN_PREVIEW_PASSWORD_LENGTH)} characters. The ` +
        `value must be supplied through the protected environment ` +
        `file; it must never be committed to the repository, printed, ` +
        `logged, or returned in any API response. Production fails ` +
        `closed regardless of this value.`,
    );
  }
  return raw.trim();
}
