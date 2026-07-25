import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { RolePreviewFeatureConfig } from './role-preview-feature.config.js';

/**
 * Unit tests for the Demo Role Preview Mode feature gate.
 *
 * These tests verify the specification's environment and production
 * safety requirements (Phase 9 items 1–6):
 *
 * 1. Preview mode defaults to false.
 * 2. Preview mode disabled returns unavailable.
 * 3. Production mode rejects preview enablement.
 * 4. Preview routes are not registered or return a safe unavailable
 *    result in production (covered by the controller returning 404;
 *    this test verifies the gate returns `false`).
 * 5. Preview switcher absent when disabled (covered by the frontend
 *    tests; this test verifies the gate).
 * 6. Preview identities are not automatically seeded (covered by
 *    the seed script's environment checks; this test verifies the
 *    gate).
 *
 * The tests construct a real `RolePreviewFeatureConfig` with a
 * `ConfigService` that wraps a plain object. They override
 * `process.env.NODE_ENV` directly because the gate reads it from
 * `process.env` (not from `ConfigService`) so that test overrides
 * take effect without needing to construct a new `ConfigService`.
 */

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: <T>(key: string): T | undefined => {
      const v = values[key];
      return v === undefined ? undefined : (v as unknown as T);
    },
  } as unknown as ConfigService;
}

describe('RolePreviewFeatureConfig', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    delete process.env['NODE_ENV'];
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });

  it('defaults to disabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is unset', () => {
    const config = makeConfig({});
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(false);
  });

  it('defaults to disabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is empty', () => {
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: '' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(false);
  });

  it('is disabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is "false"', () => {
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'false' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(false);
  });

  it('is disabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is "1" (only exact "true" accepted)', () => {
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: '1' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(false);
  });

  it('is disabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is "yes" (only exact "true" accepted)', () => {
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'yes' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(false);
  });

  it('is disabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is "TRUE" (case-sensitive)', () => {
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'TRUE' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(false);
  });

  it('is enabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is "true" and NODE_ENV is "development"', () => {
    process.env['NODE_ENV'] = 'development';
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(true);
  });

  it('is enabled when IBN_HAYAN_ROLE_PREVIEW_ENABLED is "true" and NODE_ENV is unset', () => {
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(true);
  });

  it('is disabled in production even when IBN_HAYAN_ROLE_PREVIEW_ENABLED is "true" (fail-closed)', () => {
    process.env['NODE_ENV'] = 'production';
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: 'true' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(false);
  });

  it('trims whitespace around the flag value', () => {
    process.env['NODE_ENV'] = 'development';
    const config = makeConfig({ IBN_HAYAN_ROLE_PREVIEW_ENABLED: '  true  ' });
    const gate = new RolePreviewFeatureConfig(config);
    expect(gate.isRolePreviewEnabled()).toBe(true);
  });
});
