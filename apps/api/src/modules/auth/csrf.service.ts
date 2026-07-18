import { Injectable } from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { SessionId } from '@ibn-hayan/domain';
import { CSRF_TOKEN_ENTROPY_BYTES } from './auth.constants.js';

/**
 * CSRF service.
 *
 * Implements the CSRF-protection strategy ratified in ADR-013 §1.1
 * and §3.6: server-enforced protection for state-changing browser
 * requests, using a session-bound synchroniser token.
 *
 * Strategy (per the fourth canonical batch specification):
 *
 * 1. Verify the request `Origin` against the configured `WEB_ORIGIN`
 *    at every state-changing auth endpoint. A mismatch returns 403
 *    with `AUTH_ORIGIN_DISALLOWED`. This is the primary CSRF defence.
 *
 * 2. Provide a session-bound CSRF token through an authenticated
 *    endpoint (`GET /api/v1/auth/csrf`). The token is generated
 *    using `crypto.randomBytes` with 256 bits of entropy, encoded as
 *    base64url.
 *
 * 3. Store only the SHA-256 hash of the CSRF token in server-side
 *    session state. The raw token is returned to the client in the
 *    JSON body and held in component memory by the web client; it is
 *    NOT stored in localStorage, sessionStorage, IndexedDB, or a
 *    readable cookie.
 *
 * 4. Require the raw CSRF token in a custom request header
 *    (`X-CSRF-Token`) for logout. The server hashes the submitted
 *    token and compares the hash against the stored hash using
 *    constant-time comparison.
 *
 * 5. The CSRF token is session-bound: a token issued for one session
 *    cannot be used with another session's logout request. The
 *    stored hash is keyed by `sessionId`.
 *
 * Per ADR-013 §1.1, the CSRF protection mechanism is implementation-
 * defined; the requirement is that state-changing browser requests
 * are CSRF-protected from the first slice. This implementation uses
 * the synchroniser-token pattern (not the double-submit-cookie
 * pattern) because:
 * - The session is already server-side, so storing the token hash
 *   alongside the session is free.
 * - The synchroniser-token pattern is not vulnerable to the
 *   cookie-injection attacks that the double-submit-cookie pattern
 *   can be vulnerable to when subdomains are involved.
 *
 * In-memory storage: in this batch, the CSRF token hash is stored in
 * an in-memory `Map<SessionId, string>` on this service. This is
 * acceptable because:
 * - The CSRF token is short-lived (the web client requests a fresh
 *   token after every page reload).
 * - The in-memory map is per-process; in a multi-process deployment,
 *   a user's requests must be sticky-routed to the same process.
 *   A future batch may move the CSRF hash to the database (or derive
 *   it from the session token hash using HMAC) to remove the sticky-
 *   routing requirement. For this batch, the in-memory map is the
 *   simplest correct implementation.
 */
@Injectable()
export class CsrfService {
  private readonly tokens = new Map<SessionId, string>();

  /**
   * Generate a fresh CSRF token for a session.
   *
   * Returns the raw token as a base64url string (43 characters for
   * 32 bytes of entropy). The caller returns the raw token in the
   * JSON body; the server stores only the SHA-256 hash.
   *
   * If a token already exists for the session, it is replaced. The
   * previous token is invalidated immediately.
   */
  generate(sessionId: SessionId): string {
    const bytes = randomBytes(CSRF_TOKEN_ENTROPY_BYTES);
    const raw = bytes.toString('base64url');
    const hash = this.hash(raw);
    this.tokens.set(sessionId, hash);
    return raw;
  }

  /**
   * Verify a submitted CSRF token against the stored hash for a
   * session.
   *
   * Returns `true` if the token matches, `false` otherwise. Uses
   * constant-time comparison of the hashes to prevent timing
   * attacks.
   *
   * Returns `false` if no token has been issued for the session.
   * Returns `false` if the submitted token is malformed.
   */
  verify(sessionId: SessionId, submittedToken: string): boolean {
    const storedHash = this.tokens.get(sessionId);
    if (!storedHash) {
      return false;
    }
    const submittedHash = this.hash(submittedToken);
    if (submittedHash.length !== 64 || storedHash.length !== 64) {
      return false;
    }
    const bufA = Buffer.from(submittedHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) {
      return false;
    }
    // timingSafeEqual throws on length mismatch; we've already checked.
    return timingSafeEqual(bufA, bufB);
  }

  /**
   * Invalidate the CSRF token for a session. Called at logout so
   * that a captured CSRF token cannot be replayed after the session
   * is revoked.
   */
  invalidate(sessionId: SessionId): void {
    this.tokens.delete(sessionId);
  }

  /**
   * Hash a raw CSRF token with SHA-256.
   *
   * Returns the hash as a 64-character lowercase hexadecimal string.
   * The hash is what gets stored in the in-memory map; the raw token
   * is returned to the client and discarded by the server.
   */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
