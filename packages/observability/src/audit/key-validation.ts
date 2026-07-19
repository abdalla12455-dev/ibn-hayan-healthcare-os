/**
 * Key validation helpers for the audit integrity and identifier
 * HMAC keys.
 *
 * Per ADR-014 §1.1 and §13, the integrity key has at least 256 bits
 * of entropy (32 bytes), the identifier key is separate from the
 * integrity key, insecure placeholder values are rejected outside
 * tests, and production refuses to start when required audit
 * configuration is invalid.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

/**
 * The documented placeholder value for the integrity key in
 * `.env.example`. The validator rejects this value outside tests.
 *
 * The placeholder is intentionally a recognisable string that would
 * never be confused for a real key. It is NOT a valid key for
 * production use; it exists only to make `.env.example` copy-paste-
 * able for local development.
 */
export const AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER =
  'PLACEHOLDER_AUDIT_INTEGRITY_HMAC_KEY_DO_NOT_USE_IN_PRODUCTION' as const;

/**
 * The documented placeholder value for the identifier key in
 * `.env.example`.
 */
export const AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER =
  'PLACEHOLDER_AUDIT_IDENTIFIER_HMAC_KEY_DO_NOT_USE_IN_PRODUCTION' as const;

/**
 * The minimum key length in bytes (256 bits = 32 bytes).
 */
export const MIN_AUDIT_KEY_BYTES = 32;

/**
 * The result of key validation. On success, `ok` is `true`. On
 * failure, `ok` is `false` and `reason` is a stable machine-readable
 * failure code.
 */
export type KeyValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'too_short'
        | 'placeholder_in_non_test'
        | 'identical_keys'
        | 'empty';
      readonly detail: string;
    };

/**
 * Validate a single audit key (integrity or identifier).
 *
 * @param keyValue - the raw key value (string or Buffer).
 * @param placeholderValue - the documented placeholder value for
 *   this key, to be rejected outside tests.
 * @param allowPlaceholder - whether the placeholder is allowed
 *   (typically only in tests).
 */
export function validateAuditKey(
  keyValue: string | Buffer | undefined,
  placeholderValue: string,
  allowPlaceholder: boolean,
): KeyValidationResult {
  if (keyValue === undefined || keyValue === '') {
    return {
      ok: false,
      reason: 'empty',
      detail: 'Audit key is empty or unset.',
    };
  }

  if (typeof keyValue === 'string') {
    if (!allowPlaceholder && keyValue === placeholderValue) {
      return {
        ok: false,
        reason: 'placeholder_in_non_test',
        detail: 'Audit key is the documented placeholder value; production requires a real key.',
      };
    }
    const byteLength = Buffer.byteLength(keyValue, 'utf8');
    if (byteLength < MIN_AUDIT_KEY_BYTES) {
      return {
        ok: false,
        reason: 'too_short',
        detail: `Audit key is ${byteLength} bytes; minimum is ${MIN_AUDIT_KEY_BYTES} bytes (256 bits).`,
      };
    }
    return { ok: true };
  }

  // Buffer
  if (keyValue.length < MIN_AUDIT_KEY_BYTES) {
    return {
      ok: false,
      reason: 'too_short',
      detail: `Audit key is ${keyValue.length} bytes; minimum is ${MIN_AUDIT_KEY_BYTES} bytes (256 bits).`,
    };
  }
  return { ok: true };
}

/**
 * Validate the integrity key and the identifier key together.
 *
 * The two keys must both be valid (per `validateAuditKey`) AND must
 * be distinct from each other. Identical keys are rejected because
 * the integrity key and the identifier key serve different purposes
 * and must be independently rotatable.
 *
 * @param integrityKey - the integrity key value.
 * @param identifierKey - the identifier key value.
 * @param allowPlaceholders - whether placeholders are allowed
 *   (typically only in tests).
 */
export function validateAuditKeyPair(
  integrityKey: string | Buffer | undefined,
  identifierKey: string | Buffer | undefined,
  allowPlaceholders: boolean,
): KeyValidationResult {
  const integrityResult = validateAuditKey(
    integrityKey,
    AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
    allowPlaceholders,
  );
  if (!integrityResult.ok) {
    return integrityResult;
  }

  const identifierResult = validateAuditKey(
    identifierKey,
    AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER,
    allowPlaceholders,
  );
  if (!identifierResult.ok) {
    return identifierResult;
  }

  // Distinctness check. Compare as strings (UTF-8 for Buffers).
  // `validateAuditKey` already rejected `undefined` and empty values,
  // so the casts here are safe.
  const ik: string | Buffer = integrityKey as string | Buffer;
  const idk: string | Buffer = identifierKey as string | Buffer;
  const integrityStr =
    typeof ik === 'string' ? ik : ik.toString('utf8');
  const identifierStr =
    typeof idk === 'string' ? idk : idk.toString('utf8');
  if (integrityStr === identifierStr) {
    return {
      ok: false,
      reason: 'identical_keys',
      detail: 'Audit integrity key and identifier key must be distinct.',
    };
  }

  return { ok: true };
}
