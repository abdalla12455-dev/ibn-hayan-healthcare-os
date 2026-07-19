/**
 * Identifier HMAC helper for failed-login privacy.
 *
 * Per ADR-014 §1.1 and the ninth canonical batch specification, the
 * raw attempted email address for a failed login is NEVER persisted
 * in audit data. Instead, an HMAC of the normalised identifier is
 * stored in `subject_identifier_hash` using a separate identifier
 * key (`AUDIT_IDENTIFIER_HMAC_KEY`), which is distinct from the
 * integrity key.
 *
 * The HMAC is deterministic: the same normalised identifier always
 * produces the same HMAC with the same key. This allows correlation
 * of failed-login attempts by identifier without revealing the
 * identifier itself. A regulator investigating a brute-force attack
 * can count attempts per HMAC; they cannot recover the email.
 *
 * The identifier key is NOT stored in the audit database. The
 * identifier key is supplied to the audit-emission API at emission
 * time. Key rotation is supported by treating the key as versioned
 * (a future key-rotation workflow may add a key-version field to
 * identifier hashing; this is deferred to a future ADR).
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. It uses only the Node.js
 * `crypto` module.
 */

import { createHmac } from 'node:crypto';

/**
 * Normalise an email address for identifier hashing.
 *
 * The normalisation is:
 * - Trim leading and trailing whitespace.
 * - Lowercase the entire string.
 * - Strip RTL/LTR direction marks and zero-width characters (these
 *   could otherwise be used to produce visually-identical but
 *   distinct identifiers).
 *
 * The normalisation is intentionally simple and stable. It must not
 * change over the platform's lifetime, because changing it would
 * break the correlation property (the same email would produce
 * different HMACs before and after the change).
 */
export function normaliseIdentifierForHashing(raw: string): string {
  let s = raw.trim().toLowerCase();
  // Strip Unicode bidi controls and zero-width characters. These
  // could be used to produce visually-identical but distinct
  // identifiers (a homograph-style attack on the hashing).
  //
  // The specific code points stripped are:
  // - U+200B (ZERO WIDTH SPACE)
  // - U+200C (ZERO WIDTH NON-JOINER)
  // - U+200D (ZERO WIDTH JOINER)
  // - U+200E (LEFT-TO-RIGHT MARK)
  // - U+200F (RIGHT-TO-LEFT MARK)
  // - U+202A (LEFT-TO-RIGHT EMBEDDING)
  // - U+202B (RIGHT-TO-LEFT EMBEDDING)
  // - U+202C (POP DIRECTIONAL FORMATTING)
  // - U+202D (LEFT-TO-RIGHT OVERRIDE)
  // - U+202E (RIGHT-TO-LEFT OVERRIDE)
  // - U+2066 (LEFT-TO-RIGHT ISOLATE)
  // - U+2067 (RIGHT-TO-LEFT ISOLATE)
  // - U+2068 (FIRST STRONG ISOLATE)
  // - U+2069 (POP DIRECTIONAL ISOLATE)
  // - U+FEFF (BYTE ORDER MARK / ZERO WIDTH NO-BREAK SPACE)
  s = s.replace(
    /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,
    '',
  );
  return s;
}

/**
 * Compute the HMAC-SHA-256 of a normalised identifier using the
 * identifier key.
 *
 * The `identifierKey` is the raw key bytes (a Buffer or a string).
 * If a string is supplied, it is UTF-8 encoded. The caller is
 * responsible for ensuring the key has at least 256 bits of entropy
 * (32 bytes); the key-validation helper in `key-validation.ts`
 * enforces this at startup.
 *
 * Returns a lowercase hexadecimal string of length 64.
 *
 * The raw identifier is NEVER returned or persisted. Only the HMAC
 * is returned. The caller is responsible for discarding the raw
 * identifier immediately after calling this function.
 */
export function computeIdentifierHash(
  identifierKey: Buffer | string,
  rawIdentifier: string,
): string {
  const normalised = normaliseIdentifierForHashing(rawIdentifier);
  const keyBuffer =
    typeof identifierKey === 'string'
      ? Buffer.from(identifierKey, 'utf8')
      : identifierKey;
  return createHmac('sha256', keyBuffer).update(normalised, 'utf8').digest('hex');
}
