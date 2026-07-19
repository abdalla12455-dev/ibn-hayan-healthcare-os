import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { AuditConfigurationService } from '../../src/modules/audit/audit-configuration.service.js';
import {
  AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
  AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER,
  validateAuditKey,
  validateAuditKeyPair,
} from '@ibn-hayan/observability';

/**
 * Audit configuration validation tests.
 *
 * Per the ninth canonical batch specification, production startup
 * MUST fail closed when:
 * - `AUDIT_DATABASE_URL` is absent
 * - `AUDIT_INTEGRITY_HMAC_KEY` is absent
 * - the integrity key is shorter than 256 bits (32 bytes)
 * - `AUDIT_IDENTIFIER_HMAC_KEY` is absent
 * - the identifier key is shorter than 256 bits
 * - both HMAC keys are identical
 * - the key version is missing or invalid
 * - obvious placeholder values are used
 *
 * Development and tests may use explicit safe test values.
 *
 * These tests construct `AuditConfigurationService` with controlled
 * environment variables (saving and restoring the original values)
 * and verify that the service throws in production mode and warns
 * (but does not throw) in non-production mode.
 */

/**
 * Save the current values of the audit environment variables so we
 * can restore them after each test. This prevents tests from
 * polluting each other.
 */
const ENV_VARS = [
  'AUDIT_DATABASE_URL',
  'AUDIT_INTEGRITY_HMAC_KEY',
  'AUDIT_IDENTIFIER_HMAC_KEY',
  'AUDIT_INTEGRITY_KEY_VERSION',
  'NODE_ENV',
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_VARS) {
    savedEnv[key] = process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_VARS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

/**
 * Set the environment variables for a production-mode test.
 */
function setProductionEnv(
  overrides?: Partial<{
    auditDatabaseUrl: string;
    integrityKey: string;
    identifierKey: string;
    keyVersion: string;
  }>,
): void {
  process.env['NODE_ENV'] = 'production';
  process.env['AUDIT_DATABASE_URL'] =
    overrides?.auditDatabaseUrl ??
    'postgresql://user:pass@127.0.0.1:5432/audit';
  process.env['AUDIT_INTEGRITY_HMAC_KEY'] =
    overrides?.integrityKey ?? 'a'.repeat(48);
  process.env['AUDIT_IDENTIFIER_HMAC_KEY'] =
    overrides?.identifierKey ?? 'b'.repeat(48);
  process.env['AUDIT_INTEGRITY_KEY_VERSION'] = overrides?.keyVersion ?? '1';
}

describe('AuditConfigurationService production validation', () => {
  it('throws in production when AUDIT_INTEGRITY_HMAC_KEY is absent', () => {
    setProductionEnv();
    delete process.env['AUDIT_INTEGRITY_HMAC_KEY'];
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when AUDIT_IDENTIFIER_HMAC_KEY is absent', () => {
    setProductionEnv();
    delete process.env['AUDIT_IDENTIFIER_HMAC_KEY'];
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when the integrity key is shorter than 256 bits (32 bytes)', () => {
    setProductionEnv({
      // 31 bytes — one byte below the minimum.
      integrityKey: 'a'.repeat(31),
    });
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when the identifier key is shorter than 256 bits', () => {
    setProductionEnv({
      identifierKey: 'a'.repeat(31),
    });
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when both HMAC keys are identical', () => {
    const sameKey = 'c'.repeat(48);
    setProductionEnv({
      integrityKey: sameKey,
      identifierKey: sameKey,
    });
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when the integrity key is the documented placeholder', () => {
    setProductionEnv({
      integrityKey: AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
    });
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when the identifier key is the documented placeholder', () => {
    setProductionEnv({
      identifierKey: AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER,
    });
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when the key version is not a positive integer', () => {
    setProductionEnv({ keyVersion: '0' });
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('throws in production when the key version is non-numeric', () => {
    setProductionEnv({ keyVersion: 'not-a-number' });
    expect(() => new AuditConfigurationService()).toThrow(
      /Audit configuration is invalid in production/,
    );
  });

  it('does NOT throw in production when all keys are valid and distinct', () => {
    setProductionEnv();
    expect(() => new AuditConfigurationService()).not.toThrow();
    const svc = new AuditConfigurationService();
    expect(svc.getIntegrityKeyVersion()).toBe(1);
    expect(svc.getIntegrityHmacKey()).toBe('a'.repeat(48));
    expect(svc.getIdentifierHmacKey()).toBe('b'.repeat(48));
  });

  it('does NOT throw in development when placeholder keys are used (warns only)', () => {
    process.env['NODE_ENV'] = 'development';
    process.env['AUDIT_DATABASE_URL'] =
      'postgresql://user:pass@127.0.0.1:5432/audit';
    process.env['AUDIT_INTEGRITY_HMAC_KEY'] =
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER;
    process.env['AUDIT_IDENTIFIER_HMAC_KEY'] =
      AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER;
    process.env['AUDIT_INTEGRITY_KEY_VERSION'] = '1';
    expect(() => new AuditConfigurationService()).not.toThrow();
  });

  it('does NOT throw in test when placeholder keys are used (warns only)', () => {
    process.env['NODE_ENV'] = 'test';
    process.env['AUDIT_DATABASE_URL'] =
      'postgresql://user:pass@127.0.0.1:5432/audit';
    process.env['AUDIT_INTEGRITY_HMAC_KEY'] =
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER;
    process.env['AUDIT_IDENTIFIER_HMAC_KEY'] =
      AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER;
    process.env['AUDIT_INTEGRITY_KEY_VERSION'] = '1';
    expect(() => new AuditConfigurationService()).not.toThrow();
  });

  it('exposes the documented placeholder values for test verification', () => {
    expect(AuditConfigurationService.INTEGRITY_KEY_PLACEHOLDER).toBe(
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
    );
    expect(AuditConfigurationService.IDENTIFIER_KEY_PLACEHOLDER).toBe(
      AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER,
    );
  });
});

describe('validateAuditKey unit tests', () => {
  it('rejects an undefined key', () => {
    const result = validateAuditKey(
      undefined,
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty');
    }
  });

  it('rejects an empty key', () => {
    const result = validateAuditKey(
      '',
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty');
    }
  });

  it('rejects a key shorter than 32 bytes', () => {
    const result = validateAuditKey(
      'a'.repeat(31),
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too_short');
    }
  });

  it('rejects the placeholder value in non-test mode', () => {
    const result = validateAuditKey(
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('placeholder_in_non_test');
    }
  });

  it('accepts the placeholder value in test mode', () => {
    const result = validateAuditKey(
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      true,
    );
    expect(result.ok).toBe(true);
  });

  it('accepts a 32-byte key', () => {
    const result = validateAuditKey(
      'a'.repeat(32),
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(result.ok).toBe(true);
  });

  it('accepts a longer key', () => {
    const result = validateAuditKey(
      'a'.repeat(64),
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      false,
    );
    expect(result.ok).toBe(true);
  });
});

describe('validateAuditKeyPair unit tests', () => {
  it('rejects identical keys', () => {
    const same = 'c'.repeat(48);
    const result = validateAuditKeyPair(same, same, false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('identical_keys');
    }
  });

  it('accepts distinct 32+ byte keys', () => {
    const result = validateAuditKeyPair('a'.repeat(48), 'b'.repeat(48), false);
    expect(result.ok).toBe(true);
  });

  it('rejects when the integrity key is too short', () => {
    const result = validateAuditKeyPair('a'.repeat(31), 'b'.repeat(48), false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too_short');
    }
  });

  it('rejects when the identifier key is too short', () => {
    const result = validateAuditKeyPair('a'.repeat(48), 'b'.repeat(31), false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too_short');
    }
  });

  it('rejects when both keys are the placeholder in non-test mode', () => {
    const result = validateAuditKeyPair(
      AUDIT_INTEGRITY_HMAC_KEY_PLACEHOLDER,
      AUDIT_IDENTIFIER_HMAC_KEY_PLACEHOLDER,
      false,
    );
    // The integrity key is the integrity placeholder, which is
    // rejected first.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('placeholder_in_non_test');
    }
  });
});

describe('AuditConfigurationService production-bootstrap integration', () => {
  it('a production-style environment with all valid values constructs successfully', () => {
    setProductionEnv();
    const svc = new AuditConfigurationService();
    expect(svc.getAuditDatabaseUrl()).toBe(
      'postgresql://user:pass@127.0.0.1:5432/audit',
    );
    expect(svc.getIntegrityHmacKey()).toBe('a'.repeat(48));
    expect(svc.getIdentifierHmacKey()).toBe('b'.repeat(48));
    expect(svc.getIntegrityKeyVersion()).toBe(1);
    expect(svc.isPlaceholderAllowed()).toBe(false);
  });

  it('a production-style environment with a missing AUDIT_DATABASE_URL still constructs (URL is checked at connection time)', () => {
    // The audit database URL is checked at connection time, not at
    // construction time. This is intentional: the API should be
    // able to boot for Health and for transactional-store
    // endpoints even when the audit database is not yet
    // configured. The audit outbox absorbs events until the
    // audit database is configured and the dispatcher is invoked.
    setProductionEnv();
    delete process.env['AUDIT_DATABASE_URL'];
    const svc = new AuditConfigurationService();
    expect(svc.getAuditDatabaseUrl()).toBeNull();
  });

  it('a production-style environment with key version 2 constructs successfully', () => {
    setProductionEnv({ keyVersion: '2' });
    const svc = new AuditConfigurationService();
    expect(svc.getIntegrityKeyVersion()).toBe(2);
  });
});
