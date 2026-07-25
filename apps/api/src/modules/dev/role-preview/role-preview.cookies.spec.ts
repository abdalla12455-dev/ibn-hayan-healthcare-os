import { describe, it, expect } from 'vitest';
import {
  BOOTSTRAP_COOKIE_NAME,
  BOOTSTRAP_MAX_AGE_MS,
  buildBootstrapCookieOptions,
  buildBootstrapCookieClearOptions,
} from './role-preview.cookies.js';

/**
 * Unit tests for the bootstrap cookie helpers.
 *
 * These tests verify the Secure Logged-Out Demo Role Bootstrap
 * specification's cookie requirements:
 *
 * - Bootstrap cookie is HttpOnly.
 * - Bootstrap cookie is SameSite=Strict.
 * - Bootstrap cookie's Secure attribute follows the environment
 *   rules (true in production, false in development).
 * - Bootstrap cookie's Max-Age does not exceed five minutes.
 * - Bootstrap cookie's Path is /api/v1/dev/role-preview.
 * - The clear helper produces Max-Age=0 with the same Path so the
 *   browser deletes the cookie.
 */
describe('BOOTSTRAP_COOKIE_NAME', () => {
  it('is the canonical bootstrap cookie name', () => {
    expect(BOOTSTRAP_COOKIE_NAME).toBe('ibn_hayan_role_preview_bootstrap');
  });
});

describe('BOOTSTRAP_MAX_AGE_MS', () => {
  it('is exactly five minutes (300 000 ms)', () => {
    expect(BOOTSTRAP_MAX_AGE_MS).toBe(5 * 60 * 1000);
    expect(BOOTSTRAP_MAX_AGE_MS).toBe(300_000);
  });
});

describe('buildBootstrapCookieOptions', () => {
  it('returns HttpOnly: true', () => {
    const opts = buildBootstrapCookieOptions(false, BOOTSTRAP_MAX_AGE_MS);
    expect(opts.httpOnly).toBe(true);
  });

  it('returns SameSite: strict', () => {
    const opts = buildBootstrapCookieOptions(false, BOOTSTRAP_MAX_AGE_MS);
    expect(opts.sameSite).toBe('strict');
  });

  it('returns Secure: false in development', () => {
    const opts = buildBootstrapCookieOptions(false, BOOTSTRAP_MAX_AGE_MS);
    expect(opts.secure).toBe(false);
  });

  it('returns Secure: true in production', () => {
    const opts = buildBootstrapCookieOptions(true, BOOTSTRAP_MAX_AGE_MS);
    expect(opts.secure).toBe(true);
  });

  it('returns Path: /api/v1/dev/role-preview', () => {
    const opts = buildBootstrapCookieOptions(false, BOOTSTRAP_MAX_AGE_MS);
    expect(opts.path).toBe('/api/v1/dev/role-preview');
  });

  it('returns Max-Age equal to the supplied maxAgeMs when it does not exceed the cap', () => {
    const opts = buildBootstrapCookieOptions(false, 60_000);
    expect(opts.maxAge).toBe(60_000);
  });

  it('clamps Max-Age to BOOTSTRAP_MAX_AGE_MS when the supplied maxAgeMs exceeds the cap', () => {
    const opts = buildBootstrapCookieOptions(false, 10 * 60 * 1000);
    expect(opts.maxAge).toBe(BOOTSTRAP_MAX_AGE_MS);
  });

  it('never returns a Max-Age exceeding 300 000 ms', () => {
    for (const maxAge of [
      0, 1, 1000, 60_000, 120_000, 300_000, 600_000, 3_600_000,
    ]) {
      const opts = buildBootstrapCookieOptions(false, maxAge);
      expect(opts.maxAge).toBeLessThanOrEqual(BOOTSTRAP_MAX_AGE_MS);
    }
  });

  it('does NOT set a domain (so the cookie is bound to the exact origin)', () => {
    const opts = buildBootstrapCookieOptions(false, BOOTSTRAP_MAX_AGE_MS);
    expect(opts.domain).toBeUndefined();
  });
});

describe('buildBootstrapCookieClearOptions', () => {
  it('returns HttpOnly: true', () => {
    const opts = buildBootstrapCookieClearOptions(false);
    expect(opts.httpOnly).toBe(true);
  });

  it('returns SameSite: strict', () => {
    const opts = buildBootstrapCookieClearOptions(false);
    expect(opts.sameSite).toBe('strict');
  });

  it('returns Secure: false in development', () => {
    const opts = buildBootstrapCookieClearOptions(false);
    expect(opts.secure).toBe(false);
  });

  it('returns Secure: true in production', () => {
    const opts = buildBootstrapCookieClearOptions(true);
    expect(opts.secure).toBe(true);
  });

  it('returns Path: /api/v1/dev/role-preview (matching the set options)', () => {
    const setOpts = buildBootstrapCookieOptions(false, BOOTSTRAP_MAX_AGE_MS);
    const clearOpts = buildBootstrapCookieClearOptions(false);
    expect(clearOpts.path).toBe(setOpts.path);
  });

  it('returns Max-Age: 0 (so the browser deletes the cookie)', () => {
    const opts = buildBootstrapCookieClearOptions(false);
    expect(opts.maxAge).toBe(0);
  });

  it('does NOT set a domain', () => {
    const opts = buildBootstrapCookieClearOptions(false);
    expect(opts.domain).toBeUndefined();
  });
});
