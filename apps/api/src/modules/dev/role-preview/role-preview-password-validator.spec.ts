import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { RolePreviewPasswordValidator } from './role-preview-password-validator.js';
import { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
import {
  PREVIEW_PASSWORD_ENV_VAR,
  MIN_PREVIEW_PASSWORD_LENGTH,
  PreviewPasswordMissingError,
} from './preview-password.js';

/**
 * Unit tests for {@link RolePreviewPasswordValidator}.
 *
 * These tests verify the Secure Demo Role Preview Mode v1 correction
 * specification's start-up safety requirements:
 *
 * - Preview disabled does not require a password (the validator
 *   construct succeeds silently when the gate returns false).
 * - Preview enabled without a password fails safely (the validator
 *   constructor throws `PreviewPasswordMissingError`).
 * - Preview enabled with a valid server-only password works (the
 *   validator constructor succeeds).
 * - Production remains disabled even with a password and flag (the
 *   gate returns false in production; the validator does not read
 *   the password).
 *
 * The tests construct a real `RolePreviewFeatureConfig` with a
 * mock `ConfigService` and override `process.env.NODE_ENV` and
 * `process.env[PREVIEW_PASSWORD_ENV_VAR]` directly. They restore
 * the original values in `afterEach` so that test isolation is
 * preserved.
 */

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: <T>(key: string): T | undefined => {
      const v = values[key];
      return v === undefined ? undefined : (v as unknown as T);
    },
  } as unknown as ConfigService;
}

describe('RolePreviewPasswordValidator', () => {
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalPassword = process.env[PREVIEW_PASSWORD_ENV_VAR];

  beforeEach(() => {
    delete process.env['NODE_ENV'];
    delete process.env[PREVIEW_PASSWORD_ENV_VAR];
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
    if (originalPassword === undefined) {
      delete process.env[PREVIEW_PASSWORD_ENV_VAR];
    } else {
      process.env[PREVIEW_PASSWORD_ENV_VAR] = originalPassword;
    }
  });

  it('constructs silently when preview is disabled (password not required)', () => {
    // Gate disabled: flag unset.
    const gate = new RolePreviewFeatureConfig(makeConfig({}));
    expect(() => new RolePreviewPasswordValidator(gate)).not.toThrow();
  });

  it('constructs silently when preview flag is "false" (password not required)', () => {
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'false' }),
    );
    expect(() => new RolePreviewPasswordValidator(gate)).not.toThrow();
  });

  it('constructs silently in production even when the flag is "true" and a password is set (production fails closed; password not read)', () => {
    process.env['NODE_ENV'] = 'production';
    process.env[PREVIEW_PASSWORD_ENV_VAR] = 'a'.repeat(
      MIN_PREVIEW_PASSWORD_LENGTH,
    );
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    // Gate is disabled in production regardless of the flag.
    expect(gate.isRolePreviewEnabled()).toBe(false);
    expect(() => new RolePreviewPasswordValidator(gate)).not.toThrow();
  });

  it('constructs silently in production even when the flag is "true" and the password is MISSING (production fails closed; password not read)', () => {
    process.env['NODE_ENV'] = 'production';
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    expect(gate.isRolePreviewEnabled()).toBe(false);
    expect(() => new RolePreviewPasswordValidator(gate)).not.toThrow();
  });

  it('throws PreviewPasswordMissingError when preview is enabled and the password env var is unset (fail-safe)', () => {
    process.env['NODE_ENV'] = 'development';
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    expect(gate.isRolePreviewEnabled()).toBe(true);
    expect(() => new RolePreviewPasswordValidator(gate)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws PreviewPasswordMissingError when preview is enabled and the password is empty (no default, no fallback)', () => {
    process.env['NODE_ENV'] = 'development';
    process.env[PREVIEW_PASSWORD_ENV_VAR] = '';
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    expect(() => new RolePreviewPasswordValidator(gate)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws PreviewPasswordMissingError when preview is enabled and the password is whitespace-only (whitespace-only value rejected)', () => {
    process.env['NODE_ENV'] = 'development';
    process.env[PREVIEW_PASSWORD_ENV_VAR] = '   \t   \n   ';
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    expect(() => new RolePreviewPasswordValidator(gate)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('throws PreviewPasswordMissingError when preview is enabled and the password is shorter than MIN_PREVIEW_PASSWORD_LENGTH', () => {
    process.env['NODE_ENV'] = 'development';
    process.env[PREVIEW_PASSWORD_ENV_VAR] = 'a'.repeat(
      MIN_PREVIEW_PASSWORD_LENGTH - 1,
    );
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    expect(() => new RolePreviewPasswordValidator(gate)).toThrow(
      PreviewPasswordMissingError,
    );
  });

  it('constructs successfully when preview is enabled and the password is a valid server-only value (works with a valid password)', () => {
    process.env['NODE_ENV'] = 'development';
    process.env[PREVIEW_PASSWORD_ENV_VAR] =
      'preview-password-2026-securely-generated-locally';
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    expect(gate.isRolePreviewEnabled()).toBe(true);
    expect(() => new RolePreviewPasswordValidator(gate)).not.toThrow();
  });

  it('constructs successfully when preview is enabled and the password is exactly MIN_PREVIEW_PASSWORD_LENGTH characters', () => {
    process.env['NODE_ENV'] = 'development';
    process.env[PREVIEW_PASSWORD_ENV_VAR] = 'a'.repeat(
      MIN_PREVIEW_PASSWORD_LENGTH,
    );
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    expect(() => new RolePreviewPasswordValidator(gate)).not.toThrow();
  });

  it('does NOT expose the password value through any property after successful construction', () => {
    process.env['NODE_ENV'] = 'development';
    const secret = 'preview-password-2026-securely-generated-locally';
    process.env[PREVIEW_PASSWORD_ENV_VAR] = secret;
    const gate = new RolePreviewFeatureConfig(
      makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' }),
    );
    const validator = new RolePreviewPasswordValidator(gate);
    // The validator must not store the password in any own property.
    const ownKeys = Object.keys(validator);
    for (const key of ownKeys) {
      const value = (validator as unknown as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        expect(value).not.toContain(secret);
      }
    }
  });
});
