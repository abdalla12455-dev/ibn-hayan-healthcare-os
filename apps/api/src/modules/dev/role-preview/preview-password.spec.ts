import { describe, it, expect } from 'vitest';
import {
  MIN_PREVIEW_PASSWORD_LENGTH,
  PREVIEW_PASSWORD_ENV_VAR,
  PreviewPasswordMissingError,
  isValidPreviewPassword,
  readPreviewPasswordFromEnv,
} from './preview-password.js';

/**
 * Unit tests for the server-only preview password architecture.
 *
 * These tests verify the Secure Demo Role Preview Mode v1 correction
 * specification's password requirements:
 *
 * 1. Preview disabled does not require a password (verified by the
 *    feature-config tests; the password module itself is
 *    unconditionally validating — the gate decides when to call it).
 * 2. Preview enabled without a password fails safely.
 * 3. Preview enabled with a valid server-only password works.
 * 4. Production remains disabled even with a password and flag
 *    (verified by the feature-config tests).
 * 5. Password is absent from API responses (verified by the
 *    contracts schema tests; the password module never returns the
 *    password to a caller — only the seed script receives it for
 *    hashing).
 * 6. Password is absent from frontend bundles (verified by
 *    inspection: no `NEXT_PUBLIC_*` prefix; the password module is
 *    server-only).
 * 7. Password is absent from audit events (verified by inspection:
 *    the audit metadata carries only `endpoint` and `roleCode`).
 * 8. Password is absent from logs (verified by inspection: the
 *    password module never calls `console.*` or `Logger.*` with the
 *    value).
 * 9. No tracked fixed preview password remains (verified by the
 *    catalogue tests; the constant was removed).
 */

describe('isValidPreviewPassword', () => {
  it('returns true for a non-empty string of at least MIN_PREVIEW_PASSWORD_LENGTH characters', () => {
    const candidate = 'a'.repeat(MIN_PREVIEW_PASSWORD_LENGTH);
    expect(isValidPreviewPassword(candidate)).toBe(true);
  });

  it('returns true for a longer password with mixed characters', () => {
    const candidate = 'preview-password-2026-securely-generated-locally';
    expect(isValidPreviewPassword(candidate)).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(isValidPreviewPassword(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidPreviewPassword(null)).toBe(false);
  });

  it('returns false for a non-string value', () => {
    expect(isValidPreviewPassword(123456789012)).toBe(false);
    expect(isValidPreviewPassword({ length: 12 })).toBe(false);
    expect(isValidPreviewPassword(['a'.repeat(12)])).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidPreviewPassword('')).toBe(false);
  });

  it('returns false for a whitespace-only string (whitespace-only value rejected)', () => {
    expect(isValidPreviewPassword('            ')).toBe(false);
    expect(isValidPreviewPassword('\t\t\t\t\t\t\t\t\t\t\t\t')).toBe(false);
    expect(isValidPreviewPassword('   \n   \n   \n   ')).toBe(false);
  });

  it('returns false for a string shorter than MIN_PREVIEW_PASSWORD_LENGTH after trimming', () => {
    expect(isValidPreviewPassword('short')).toBe(false);
    expect(
      isValidPreviewPassword('a'.repeat(MIN_PREVIEW_PASSWORD_LENGTH - 1)),
    ).toBe(false);
  });

  it('returns true for a string exactly MIN_PREVIEW_PASSWORD_LENGTH characters long', () => {
    expect(
      isValidPreviewPassword('a'.repeat(MIN_PREVIEW_PASSWORD_LENGTH)),
    ).toBe(true);
  });

  it('returns true for a string that is long after trimming even if it has surrounding whitespace', () => {
    const inner = 'a'.repeat(MIN_PREVIEW_PASSWORD_LENGTH);
    expect(isValidPreviewPassword(`  ${inner}  `)).toBe(true);
  });
});

describe('readPreviewPasswordFromEnv', () => {
  it('returns the trimmed password when the env var is a valid non-empty string of sufficient length', () => {
    const candidate = 'preview-password-2026-securely-generated-locally';
    const env = { [PREVIEW_PASSWORD_ENV_VAR]: candidate } as NodeJS.ProcessEnv;
    expect(readPreviewPasswordFromEnv(env)).toBe(candidate);
  });

  it('returns the trimmed password (surrounding whitespace removed)', () => {
    const inner = 'preview-password-2026-securely-generated-locally';
    const env = {
      [PREVIEW_PASSWORD_ENV_VAR]: `  ${inner}  `,
    } as NodeJS.ProcessEnv;
    expect(readPreviewPasswordFromEnv(env)).toBe(inner);
  });

  it('throws PreviewPasswordMissingError when the env var is unset', () => {
    expect(() => readPreviewPasswordFromEnv({})).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws PreviewPasswordMissingError when the env var is undefined', () => {
    const env = { [PREVIEW_PASSWORD_ENV_VAR]: undefined } as NodeJS.ProcessEnv;
    expect(() => readPreviewPasswordFromEnv(env)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws PreviewPasswordMissingError when the env var is empty (no default, no fallback)', () => {
    const env = { [PREVIEW_PASSWORD_ENV_VAR]: '' } as NodeJS.ProcessEnv;
    expect(() => readPreviewPasswordFromEnv(env)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws PreviewPasswordMissingError when the env var is whitespace-only (whitespace-only value rejected)', () => {
    const env = {
      [PREVIEW_PASSWORD_ENV_VAR]: '   \t   \n   ',
    } as NodeJS.ProcessEnv;
    expect(() => readPreviewPasswordFromEnv(env)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws PreviewPasswordMissingError when the env var is shorter than MIN_PREVIEW_PASSWORD_LENGTH', () => {
    const env = {
      [PREVIEW_PASSWORD_ENV_VAR]: 'a'.repeat(MIN_PREVIEW_PASSWORD_LENGTH - 1),
    } as NodeJS.ProcessEnv;
    expect(() => readPreviewPasswordFromEnv(env)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws an error whose message names the env var but does NOT contain the supplied value', () => {
    // Supply a too-short value so the function throws. The error
    // message must name the env var but must NOT echo back the
    // supplied (invalid) value, to prevent accidental leakage of
    // a partial password through logs.
    const invalidValue = 'xyz';
    const env = {
      [PREVIEW_PASSWORD_ENV_VAR]: invalidValue,
    } as NodeJS.ProcessEnv;
    let caught: unknown = null;
    try {
      readPreviewPasswordFromEnv(env);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PreviewPasswordMissingError);
    const message = (caught as PreviewPasswordMissingError).message;
    expect(message).toContain(PREVIEW_PASSWORD_ENV_VAR);
    expect(message).not.toContain(invalidValue);
  });

  it('throws an error whose message states the minimum length requirement', () => {
    const env = {} as NodeJS.ProcessEnv;
    let caught: unknown = null;
    try {
      readPreviewPasswordFromEnv(env);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PreviewPasswordMissingError);
    const message = (caught as PreviewPasswordMissingError).message;
    expect(message).toContain(String(MIN_PREVIEW_PASSWORD_LENGTH));
  });

  it('throws an error whose message states that production fails closed', () => {
    const env = {} as NodeJS.ProcessEnv;
    let caught: unknown = null;
    try {
      readPreviewPasswordFromEnv(env);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PreviewPasswordMissingError);
    const message = (caught as PreviewPasswordMissingError).message;
    expect(message.toLowerCase()).toContain('production');
    expect(message.toLowerCase()).toContain('fail');
  });
});

describe('PREVIEW_PASSWORD_ENV_VAR', () => {
  it('is the exact string "IBN_HAYAN_ROLE_PREVIEW_PASSWORD"', () => {
    expect(PREVIEW_PASSWORD_ENV_VAR).toBe('IBN_HAYAN_ROLE_PREVIEW_PASSWORD');
  });

  it('does NOT start with NEXT_PUBLIC_ (server-only; never exposed to frontend bundles)', () => {
    expect(PREVIEW_PASSWORD_ENV_VAR.startsWith('NEXT_PUBLIC_')).toBe(false);
  });
});

describe('MIN_PREVIEW_PASSWORD_LENGTH', () => {
  it('is at least 12 (matches the platform password policy, ADR-013 §1.1)', () => {
    expect(MIN_PREVIEW_PASSWORD_LENGTH).toBeGreaterThanOrEqual(12);
  });
});
