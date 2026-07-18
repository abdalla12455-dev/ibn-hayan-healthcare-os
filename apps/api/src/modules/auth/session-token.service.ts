import { Injectable } from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { SessionTokenHash } from '@ibn-hayan/domain';
import { SESSION_TOKEN_ENTROPY_BYTES } from './auth.constants.js';

/**
 * Session-token service.
 *
 * Generates opaque session tokens, hashes them with SHA-256 for
 * storage, and provides constant-time comparison for any direct
 * comparison that occurs.
 *
 * Per ADR-013 §1.1 and §1.3:
 * - Session tokens are generated using Node cryptographic randomness
 *   (`crypto.randomBytes`).
 * - Minimum 256 bits of entropy (32 bytes).
 * - Encoded safely for cookies (base64url — URL-safe, no padding).
 * - Hashed with SHA-256 before storage.
 * - Constant-time comparison where direct comparison occurs.
 * - The raw token is NEVER persisted; only the SHA-256 hash is
 *   stored in the `auth_sessions.token_hash` column.
 *
 * The raw token lives only in:
 * 1. Process memory between generation and cookie-setting.
 * 2. The HttpOnly cookie sent to the browser.
 *
 * The token is never logged, never persisted, and never returned in
 * a JSON response.
 */
@Injectable()
export class SessionTokenService {
  /**
   * Generate a fresh opaque session token.
   *
   * Returns the raw token as a base64url string (43 characters for
   * 32 bytes of entropy). The caller:
   * 1. Sets the token in the HttpOnly cookie.
   * 2. Calls `hash` to compute the SHA-256 hash.
   * 3. Persists the hash via `SessionRepository.create`.
   * 4. Discards the raw token from process memory.
   */
  generate(): string {
    const bytes = randomBytes(SESSION_TOKEN_ENTROPY_BYTES);
    return bytes.toString('base64url');
  }

  /**
   * Hash a raw session token with SHA-256.
   *
   * Returns the hash as a 64-character lowercase hexadecimal string,
   * typed as `SessionTokenHash` to prevent confusion with the raw
   * token at the type level.
   *
   * The hash is what gets persisted in the `auth_sessions.token_hash`
   * column. The raw token is never persisted.
   */
  hash(token: string): SessionTokenHash {
    const hash = createHash('sha256').update(token).digest('hex');
    return hash as SessionTokenHash;
  }

  /**
   * Constant-time comparison of two session-token hashes.
   *
   * Used only when a direct comparison is unavoidable (e.g. comparing
   * a submitted CSRF token's hash against the stored hash). In
   * practice, the database's unique index on `token_hash` performs
   * the lookup; this method is provided for defence-in-depth and for
   * the CSRF token comparison.
   *
   * Returns `true` if the hashes are equal, `false` otherwise.
   * Returns `false` if either hash is not exactly 64 characters
   * (defence-in-depth: a malformed hash should never reach this
   * point).
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== 64 || b.length !== 64) {
      return false;
    }
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}

/**
 * Internal type used by `SessionTokenService` to carry both the raw
 * token and its hash together between generation and persistence.
 * The raw token is set in the cookie; the hash is persisted. After
 * persistence, the raw token should not be retained in any longer-
 * lived structure.
 */
export interface GeneratedSessionToken {
  readonly raw: string;
  readonly hash: SessionTokenHash;
}

/**
 * Convenience: generate a token and its hash in one call.
 * Returns both for the caller to distribute (raw → cookie, hash →
 * persistence). Exported as a free function so it can be used
 * outside the service if needed; the service methods `generate`
 * and `hash` are the canonical entry points.
 */
export function generateSessionTokenAndHash(
  service: SessionTokenService,
): GeneratedSessionToken {
  const raw = service.generate();
  const hash = service.hash(raw);
  return { raw, hash };
}
