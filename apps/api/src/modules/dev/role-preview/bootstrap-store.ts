import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Server-side in-memory store for one-time Demo Role Preview Mode
 * bootstrap challenges.
 *
 * The store is the authoritative server-side state for the
 * logged-out preview bootstrap flow. It is consulted by the
 * role-preview controller when:
 * - `GET /api/v1/dev/role-preview/bootstrap` issues a fresh
 *   challenge.
 * - `POST /api/v1/dev/role-preview/select` consumes a challenge to
 *   create the first preview session without requiring the operator
 *   to log in first.
 *
 * Design (per the Secure Logged-Out Demo Role Bootstrap
 * specification):
 *
 * - **Cryptographically random nonce.** Each challenge's nonce is
 *   32 random bytes from `node:crypto.randomBytes` (CSPRNG),
 *   base64url-encoded (43 ASCII characters, ~256 bits of entropy).
 *   The nonce is NEVER stored in plaintext; only its SHA-256 hash
 *   is retained.
 *
 * - **Server-side opaque identifier.** Each challenge also has a
 *   separate opaque `challengeId` (16 random bytes, base64url,
 *   ~22 ASCII characters, ~128 bits of entropy). The `challengeId`
 *   is returned to the client and is NOT secret. The client sends
 *   it back to the server in the `POST /select` body so that the
 *   server can look up the challenge. The lookup is by
 *   `challengeId`, but the verification requires the nonce (read
 *   from the bootstrap cookie). This is defence-in-depth: an
 *   attacker who intercepts the response body but not the cookie
 *   cannot consume the challenge.
 *
 * - **Hashed storage.** Both the nonce and the challengeId are
 *   hashed with SHA-256 before being stored as the lookup key.
 *   This means an attacker who reads the in-memory map cannot
 *   reconstruct the raw nonce or challengeId.
 *
 * - **Short-lived.** Each challenge has a maximum lifetime of five
 *   minutes (300 000 ms). The expiry is set at issue time and is
 *   not extended. Expired challenges are rejected at consume time.
 *
 * - **One-time use.** Each challenge can be consumed exactly once.
 *   The `consumed` flag is set atomically inside the `consume`
 *   method; a second call returns `replay`. The consumed flag is
 *   not cleared until the challenge is garbage-collected.
 *
 * - **Garbage collection.** A best-effort `cleanup()` method
 *   removes expired and consumed entries. It is called from
 *   `issue()` so that the map does not grow unboundedly. The
 *   cleanup is best-effort; the consume method also handles expired
 *   entries correctly.
 *
 * - **No persistence.** The store is in-memory. Restarting the API
 *   invalidates all outstanding challenges; the operator must
 *   request a fresh bootstrap. This is acceptable for a
 *   development-only feature.
 *
 * - **No database schema change.** The store does not touch the
 *   database. Per the specification, no persistent bootstrap table
 *   is created unless inspection proves no safe ephemeral mechanism
 *   is possible; this in-memory store IS the safe ephemeral
 *   mechanism.
 *
 * - **No session binding.** The store does not consult the
 *   application session. A challenge can be issued to a logged-out
 *   browser and consumed by the same browser after the bootstrap
 *   cookie auto-attaches to the `POST /select` request. Once
 *   consumed, the challenge is invalid; the new application session
 *   takes over.
 *
 * - **Constant-time comparison.** The nonce comparison uses
 *   `crypto.timingSafeEqual` on the SHA-256 hashes. This prevents
 *   timing side-channels on the nonce verification.
 *
 * - **No logging of secret material.** The store logs only
 *   non-sensitive identifiers (challengeId hash prefix, issue
 *   count, consume outcome). The raw nonce, the nonce hash, and
 *   the raw challengeId are NEVER logged.
 */
@Injectable()
export class BootstrapChallengeStore {
  private readonly logger = new Logger(BootstrapChallengeStore.name);

  /**
   * The in-memory challenge map. The key is the SHA-256 hash of the
   * `challengeId` (hex). The value is the challenge state.
   */
  private readonly challenges = new Map<
    string,
    {
      /** SHA-256 hash of the nonce (hex). */
      readonly nonceHash: string;
      /** Expiry time in milliseconds since the Unix epoch. */
      readonly expiresAt: number;
      /** Whether the challenge has been consumed. */
      consumed: boolean;
    }
  >();

  /**
   * Issue a fresh bootstrap challenge.
   *
   * Returns the raw `challengeId` and the raw `nonce` so that the
   * caller can:
   * - return the `challengeId` in the JSON response (safe — it is
   *   opaque and not secret on its own);
   * - set the `nonce` in the HttpOnly bootstrap cookie (so that the
   *   browser auto-attaches it to the subsequent `POST /select`).
   *
   * The store retains only the SHA-256 hashes of these values; the
   * raw values are NOT retained in memory beyond this method's
   * return.
   *
   * The caller is responsible for setting the bootstrap cookie with
   * `buildBootstrapCookieOptions()` and a `Max-Age` not exceeding
   * `BOOTSTRAP_MAX_AGE_MS`.
   *
   * @param maxAgeMs - the challenge's maximum lifetime in
   *   milliseconds. MUST NOT exceed `BOOTSTRAP_MAX_AGE_MS`. The
   *   caller is responsible for enforcing the cap.
   */
  issue(maxAgeMs: number): {
    readonly challengeId: string;
    readonly nonce: string;
    readonly expiresAt: number;
  } {
    // Best-effort cleanup of expired and consumed entries before
    // issuing a new challenge. This keeps the map from growing
    // unboundedly under abuse.
    this.cleanup();

    // Defence-in-depth: clamp the max-age to the specification cap.
    const clampedMaxAge = Math.min(maxAgeMs, BOOTSTRAP_MAX_AGE_MS);
    const now = Date.now();
    const expiresAt = now + clampedMaxAge;

    // Generate the raw values. randomBytes is the OS CSPRNG.
    const challengeIdBytes = randomBytes(16);
    const nonceBytes = randomBytes(32);

    // base64url encoding produces URL-safe ASCII that fits in a
    // cookie value and a JSON string without escaping.
    const challengeId = challengeIdBytes.toString('base64url');
    const nonce = nonceBytes.toString('base64url');

    // Hash both values for storage. SHA-256 is sufficient: the
    // raw values have ≥128 bits of entropy, so brute-force of the
    // hash is infeasible.
    const challengeIdHash = sha256Hex(challengeId);
    const nonceHash = sha256Hex(nonce);

    this.challenges.set(challengeIdHash, {
      nonceHash,
      expiresAt,
      consumed: false,
    });

    this.logger.debug(
      `Issued bootstrap challenge (challengeId hash prefix: ${challengeIdHash.slice(0, 8)}…). ` +
        `Active challenges: ${String(this.challenges.size)}.`,
    );

    return { challengeId, nonce, expiresAt };
  }

  /**
   * Verify and atomically consume a bootstrap challenge.
   *
   * Returns one of:
   * - `'ok'` — the challenge is valid, the nonce matches, the
   *   challenge was not previously consumed, and the challenge has
   *   not expired. The challenge is marked consumed so that a
   *   subsequent call with the same values returns `'replay'`.
   * - `'not_found'` — no challenge exists for the supplied
   *   `challengeId`. This is the case when the challenge was never
   *   issued, was already garbage-collected, or the `challengeId`
   *   is wrong.
   * - `'expired'` — the challenge exists but has expired. The
   *   challenge is marked consumed so that it cannot be retried.
   * - `'replay'` — the challenge was already consumed. This is the
   *   replay-rejection signal.
   * - `'invalid'` — the challenge exists but the supplied nonce
   *   does not match the stored hash. This is the proof-of-
   *   possession failure (e.g. the bootstrap cookie was not sent,
   *   or the wrong cookie was sent).
   *
   * The comparison of the nonce hash uses `timingSafeEqual` to
   * prevent timing side-channels.
   *
   * The method is `synchronous` so that the consume is atomic with
   * respect to other concurrent calls in the same Node.js event
   * loop tick. JavaScript's single-threaded event loop guarantees
   * that no other code runs between the `Map.get` and the
   * `Map.set`/property-assignment.
   */
  consume(
    challengeId: string,
    nonce: string,
  ): 'ok' | 'not_found' | 'expired' | 'replay' | 'invalid' {
    const challengeIdHash = sha256Hex(challengeId);
    const entry = this.challenges.get(challengeIdHash);
    if (entry === undefined) {
      return 'not_found';
    }

    if (entry.consumed) {
      return 'replay';
    }

    const now = Date.now();
    if (now >= entry.expiresAt) {
      // Mark as consumed so that a retry does not return 'expired'
      // again (which would be a slight information leak about
      // whether the challenge existed). Future cleanup will remove
      // the entry.
      entry.consumed = true;
      return 'expired';
    }

    // Constant-time comparison of the nonce hash.
    const suppliedNonceHash = sha256Hex(nonce);
    if (!constantTimeEqual(suppliedNonceHash, entry.nonceHash)) {
      // Do NOT mark as consumed: a legitimate client that sent the
      // wrong nonce by mistake (e.g. a stale cookie from a previous
      // bootstrap) should still be able to retry with the correct
      // cookie. However, the challenge will still expire normally.
      return 'invalid';
    }

    // Success: mark as consumed.
    entry.consumed = true;

    this.logger.debug(
      `Consumed bootstrap challenge (challengeId hash prefix: ${challengeIdHash.slice(0, 8)}…).`,
    );

    return 'ok';
  }

  /**
   * Invalidate a single challenge without consuming it. Used by
   * the `POST /select` success path to ensure that even if the
   * cookie is somehow replayed (e.g. by a proxy that re-sends the
   * request), the challenge is already invalid.
   *
   * This is a no-op if the challenge does not exist or has already
   * been consumed.
   */
  invalidate(challengeId: string): void {
    const challengeIdHash = sha256Hex(challengeId);
    const entry = this.challenges.get(challengeIdHash);
    if (entry !== undefined) {
      entry.consumed = true;
    }
  }

  /**
   * Remove all expired and consumed challenges from the map. This
   * is best-effort and is called from `issue()` so that the map
   * does not grow unboundedly.
   *
   * The cleanup is O(n) in the number of challenges. Because the
   * map is bounded by the number of outstanding (non-expired)
   * challenges, and challenges expire after at most five minutes,
   * the map size is bounded in practice.
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.challenges) {
      if (entry.consumed || now >= entry.expiresAt) {
        this.challenges.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(
        `Cleaned up ${String(removed)} expired/consumed bootstrap challenge(s). ` +
          `Active challenges: ${String(this.challenges.size)}.`,
      );
    }
  }

  /**
   * Return the current number of outstanding challenges (including
   * expired-but-not-yet-cleaned-up ones). Exposed for tests and for
   * the audit log; not for production monitoring.
   */
  size(): number {
    return this.challenges.size;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * The maximum lifetime of a bootstrap challenge, in milliseconds.
 * Per the specification, this MUST NOT exceed five minutes.
 *
 * Exported here (and re-exported from the module entry point) so
 * that the controller can pass it as the cookie's max-age.
 */
export const BOOTSTRAP_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Compute the SHA-256 hash of a string, returned as a lowercase
 * hex string. Used internally for hashing the nonce and the
 * challengeId before storage.
 */
function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two equal-length hex strings. Returns
 * `true` if the strings are equal, `false` otherwise. Throws if the
 * strings have different lengths (which would only happen if the
 * hash function produced different-length outputs — a programming
 * error).
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  // timingSafeEqual requires Buffer inputs of equal length.
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}
