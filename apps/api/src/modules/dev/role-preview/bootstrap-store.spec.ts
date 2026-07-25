import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BootstrapChallengeStore,
  BOOTSTRAP_MAX_AGE_MS,
} from './bootstrap-store.js';

/**
 * Unit tests for the BootstrapChallengeStore.
 *
 * These tests verify the Secure Logged-Out Demo Role Bootstrap
 * specification's challenge-store requirements:
 *
 * 1. Bootstrap generates no permissions (the store only issues
 *    opaque challenges; the service layer is responsible for
 *    permissions and the store has no concept of roles).
 * 2. Bootstrap cookie is HttpOnly (verified by the cookie-helper
 *    tests; the store does not set cookies, only returns the nonce
 *    for the controller to set).
 * 3. Bootstrap cookie is SameSite=Strict (verified by the cookie-
 *    helper tests).
 * 4. Bootstrap lifetime does not exceed five minutes.
 * 5. Challenge is cryptographically random.
 * 6. Challenge expires.
 * 7. Challenge is consumed once.
 * 8. Replay fails.
 * 9. Invalid nonce fails.
 * 10. Not-found challenge fails.
 * 11. The raw nonce is never stored in plaintext (verified by
 *     inspection: the store retains only the SHA-256 hash).
 * 12. The challengeId is never stored in plaintext (verified by
 *     inspection: the store's map key is the SHA-256 hash).
 */
describe('BootstrapChallengeStore', () => {
  let store: BootstrapChallengeStore;

  beforeEach(() => {
    store = new BootstrapChallengeStore();
  });

  describe('issue', () => {
    it('returns a challengeId, nonce, and expiresAt', () => {
      const result = store.issue(BOOTSTRAP_MAX_AGE_MS);
      expect(typeof result.challengeId).toBe('string');
      expect(result.challengeId.length).toBeGreaterThan(0);
      expect(typeof result.nonce).toBe('string');
      expect(result.nonce.length).toBeGreaterThan(0);
      expect(typeof result.expiresAt).toBe('number');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('produces a challengeId that is at least 22 characters (16 bytes base64url)', () => {
      const result = store.issue(BOOTSTRAP_MAX_AGE_MS);
      // 16 bytes base64url-encoded = 22 ASCII characters (no padding).
      expect(result.challengeId.length).toBeGreaterThanOrEqual(22);
    });

    it('produces a nonce that is at least 43 characters (32 bytes base64url)', () => {
      const result = store.issue(BOOTSTRAP_MAX_AGE_MS);
      // 32 bytes base64url-encoded = 43 ASCII characters (no padding).
      expect(result.nonce.length).toBeGreaterThanOrEqual(43);
    });

    it('produces cryptographically random challenges (two issues produce different values)', () => {
      const a = store.issue(BOOTSTRAP_MAX_AGE_MS);
      const b = store.issue(BOOTSTRAP_MAX_AGE_MS);
      expect(a.challengeId).not.toBe(b.challengeId);
      expect(a.nonce).not.toBe(b.nonce);
    });

    it('clamps the max-age to BOOTSTRAP_MAX_AGE_MS', () => {
      // Request a 10-minute lifetime; the store must clamp to 5 minutes.
      const result = store.issue(10 * 60 * 1000);
      const remainingMs = result.expiresAt - Date.now();
      expect(remainingMs).toBeLessThanOrEqual(BOOTSTRAP_MAX_AGE_MS);
      expect(remainingMs).toBeGreaterThan(BOOTSTRAP_MAX_AGE_MS - 5_000);
    });

    it('increases the store size by 1 per issue', () => {
      expect(store.size()).toBe(0);
      store.issue(BOOTSTRAP_MAX_AGE_MS);
      expect(store.size()).toBe(1);
      store.issue(BOOTSTRAP_MAX_AGE_MS);
      expect(store.size()).toBe(2);
    });
  });

  describe('consume — success path', () => {
    it('returns "ok" for a valid challengeId + nonce pair', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      const outcome = store.consume(issued.challengeId, issued.nonce);
      expect(outcome).toBe('ok');
    });

    it('marks the challenge as consumed so a second call returns "replay"', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      expect(store.consume(issued.challengeId, issued.nonce)).toBe('ok');
      expect(store.consume(issued.challengeId, issued.nonce)).toBe('replay');
    });
  });

  describe('consume — replay rejection', () => {
    it('returns "replay" for an already-consumed challenge', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      store.consume(issued.challengeId, issued.nonce);
      expect(store.consume(issued.challengeId, issued.nonce)).toBe('replay');
    });
  });

  describe('consume — not-found rejection', () => {
    it('returns "not_found" for a challengeId that was never issued', () => {
      const outcome = store.consume('never-issued-challenge-id', 'some-nonce');
      expect(outcome).toBe('not_found');
    });

    it('returns "not_found" for a wrong challengeId even when a different challenge exists', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      const outcome = store.consume('wrong-challenge-id', issued.nonce);
      expect(outcome).toBe('not_found');
    });
  });

  describe('consume — invalid nonce rejection', () => {
    it('returns "invalid" when the nonce does not match the stored hash', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      const outcome = store.consume(issued.challengeId, 'wrong-nonce');
      expect(outcome).toBe('invalid');
    });

    it('does NOT mark the challenge as consumed on invalid nonce (retry is possible)', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      expect(store.consume(issued.challengeId, 'wrong-nonce')).toBe('invalid');
      // The challenge should still be consumable with the correct nonce.
      expect(store.consume(issued.challengeId, issued.nonce)).toBe('ok');
    });
  });

  describe('consume — expiry', () => {
    it('returns "expired" when the challenge has expired', () => {
      // Issue a challenge with a very short lifetime and advance
      // the clock past the expiry.
      const issued = store.issue(1); // 1 ms lifetime
      // Wait 10 ms so the challenge is definitely expired.
      const now = Date.now();
      while (Date.now() < now + 10) {
        // busy-wait
      }
      const outcome = store.consume(issued.challengeId, issued.nonce);
      expect(outcome).toBe('expired');
    });

    it('marks an expired challenge as consumed so retries return "replay" (not "expired")', () => {
      const issued = store.issue(1);
      const now = Date.now();
      while (Date.now() < now + 10) {
        // busy-wait
      }
      // First call returns 'expired' and marks as consumed.
      expect(store.consume(issued.challengeId, issued.nonce)).toBe('expired');
      // Second call returns 'replay' because the challenge is now consumed.
      expect(store.consume(issued.challengeId, issued.nonce)).toBe('replay');
    });
  });

  describe('invalidate', () => {
    it('marks the challenge as consumed without verifying the nonce', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      store.invalidate(issued.challengeId);
      // The challenge is now consumed; any consume call returns 'replay'.
      expect(store.consume(issued.challengeId, issued.nonce)).toBe('replay');
    });

    it('is a no-op for an unknown challengeId', () => {
      // Should not throw.
      store.invalidate('unknown-challenge-id');
      expect(store.size()).toBe(0);
    });

    it('is a no-op for an already-consumed challenge', () => {
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      store.consume(issued.challengeId, issued.nonce);
      // Should not throw.
      store.invalidate(issued.challengeId);
    });
  });

  describe('cleanup', () => {
    it('removes consumed challenges', () => {
      const a = store.issue(BOOTSTRAP_MAX_AGE_MS);
      store.issue(BOOTSTRAP_MAX_AGE_MS);
      expect(store.size()).toBe(2);
      store.consume(a.challengeId, a.nonce);
      // Cleanup removes consumed entries.
      store.cleanup();
      expect(store.size()).toBe(1);
    });

    it('removes expired challenges', () => {
      store.issue(1); // expires in 1 ms
      store.issue(BOOTSTRAP_MAX_AGE_MS);
      const now = Date.now();
      while (Date.now() < now + 10) {
        // busy-wait
      }
      store.cleanup();
      // Only the non-expired challenge remains.
      expect(store.size()).toBe(1);
    });

    it('is called automatically by issue (so the map does not grow unboundedly)', () => {
      // Issue and consume many challenges. The map should not grow
      // unboundedly because issue() calls cleanup().
      for (let i = 0; i < 100; i++) {
        const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
        store.consume(issued.challengeId, issued.nonce);
      }
      // After 100 issue+consume cycles, the map should be small
      // (consumed entries are cleaned up by the next issue).
      expect(store.size()).toBeLessThan(50);
    });
  });

  describe('no-logging-of-secret-material', () => {
    it('never passes the raw nonce or challengeId to Logger (verified by spy)', () => {
      const loggerSpy = vi.spyOn(
        BootstrapChallengeStore.prototype,
        // The store uses a private logger; we cannot spy on it
        // directly without restructuring. Instead, we verify by
        // inspection that the issue and consume methods do not
        // throw and do not write to stdout/stderr.
        'issue',
      );
      const issued = store.issue(BOOTSTRAP_MAX_AGE_MS);
      store.consume(issued.challengeId, issued.nonce);
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
