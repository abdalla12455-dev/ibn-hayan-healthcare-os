import { describe, expect, it } from 'vitest';

import { validatePlatformBootstrapEnvironment } from './platform-admin-bootstrap-policy.js';

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'development',
    ALLOW_DEV_PLATFORM_ADMIN_BOOTSTRAP: 'true',
    DATABASE_URL:
      'postgresql://local:example@127.0.0.1:55432/ibn_hayan_app_dev',
    AUDIT_DATABASE_URL:
      'postgresql://local:example@127.0.0.1:55432/ibn_hayan_audit_dev',
    DEV_PLATFORM_ADMIN_EMAIL: 'Admin@Example.test',
    DEV_PLATFORM_ADMIN_DISPLAY_NAME: 'Local Administrator',
    DEV_PLATFORM_ADMIN_PASSWORD: 'example-only-password-123',
  };
}

describe('Platform administrator bootstrap policy', () => {
  it('accepts an explicitly enabled local development target', () => {
    const result = validatePlatformBootstrapEnvironment(validEnvironment());

    expect(result.email).toBe('admin@example.test');
  });

  it('rejects production mode', () => {
    expect(() =>
      validatePlatformBootstrapEnvironment({
        ...validEnvironment(),
        NODE_ENV: 'production',
      }),
    ).toThrow('DEVELOPMENT_MODE_REQUIRED');
  });

  it('requires an explicit bootstrap flag', () => {
    expect(() =>
      validatePlatformBootstrapEnvironment({
        ...validEnvironment(),
        ALLOW_DEV_PLATFORM_ADMIN_BOOTSTRAP: 'false',
      }),
    ).toThrow('EXPLICIT_BOOTSTRAP_FLAG_REQUIRED');
  });

  it('rejects a remote application database', () => {
    expect(() =>
      validatePlatformBootstrapEnvironment({
        ...validEnvironment(),
        DATABASE_URL:
          'postgresql://local:example@remote.example:55432/ibn_hayan_app_dev',
      }),
    ).toThrow('DATABASE_TARGET_NOT_APPROVED');
  });

  it('rejects a wrong application database', () => {
    expect(() =>
      validatePlatformBootstrapEnvironment({
        ...validEnvironment(),
        DATABASE_URL: 'postgresql://local:example@127.0.0.1:55432/production',
      }),
    ).toThrow('DATABASE_IDENTITY_INVALID');
  });

  it('rejects an incorrect audit database', () => {
    expect(() =>
      validatePlatformBootstrapEnvironment({
        ...validEnvironment(),
        AUDIT_DATABASE_URL:
          'postgresql://local:example@127.0.0.1:55432/ibn_hayan_app_dev',
      }),
    ).toThrow('DATABASE_IDENTITY_INVALID');
  });

  it('rejects a weak password', () => {
    expect(() =>
      validatePlatformBootstrapEnvironment({
        ...validEnvironment(),
        DEV_PLATFORM_ADMIN_PASSWORD: 'short',
      }),
    ).toThrow('ADMIN_PASSWORD_INVALID');
  });

  it('rejects missing identity information', () => {
    expect(() =>
      validatePlatformBootstrapEnvironment({
        ...validEnvironment(),
        DEV_PLATFORM_ADMIN_EMAIL: '',
      }),
    ).toThrow('ADMIN_EMAIL_INVALID');
  });
});
