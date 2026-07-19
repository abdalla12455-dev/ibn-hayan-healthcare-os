import { describe, it, expect } from 'vitest';
import {
  validateAuditMetadata,
  isMetadataKeyAllowed,
  METADATA_MAX_DEPTH,
  METADATA_MAX_ARRAY_LENGTH,
  METADATA_MAX_STRING_LENGTH,
} from './metadata-validator.js';

/**
 * Unit tests for the safe metadata validator and forbidden-key
 * detector.
 */
describe('isMetadataKeyAllowed', () => {
  it('allows ordinary keys', () => {
    expect(isMetadataKeyAllowed('foo')).toBe(true);
    expect(isMetadataKeyAllowed('bar_baz')).toBe(true);
    expect(isMetadataKeyAllowed('qux123')).toBe(true);
  });

  it('rejects keys containing "password" (case-insensitive)', () => {
    expect(isMetadataKeyAllowed('password')).toBe(false);
    expect(isMetadataKeyAllowed('userPassword')).toBe(false);
    expect(isMetadataKeyAllowed('PASSWORD')).toBe(false);
  });

  it('rejects keys containing "token" (case-insensitive)', () => {
    expect(isMetadataKeyAllowed('token')).toBe(false);
    expect(isMetadataKeyAllowed('accessToken')).toBe(false);
    expect(isMetadataKeyAllowed('x_csrf_token')).toBe(false);
  });

  it('rejects keys containing "secret"', () => {
    expect(isMetadataKeyAllowed('secret')).toBe(false);
    expect(isMetadataKeyAllowed('clientSecret')).toBe(false);
  });

  it('rejects keys containing "csrf"', () => {
    expect(isMetadataKeyAllowed('csrf')).toBe(false);
    expect(isMetadataKeyAllowed('csrfToken')).toBe(false);
  });

  it('rejects keys containing "cookie"', () => {
    expect(isMetadataKeyAllowed('cookie')).toBe(false);
    expect(isMetadataKeyAllowed('sessionCookie')).toBe(false);
  });

  it('rejects keys containing "authorization"', () => {
    expect(isMetadataKeyAllowed('authorization')).toBe(false);
    expect(isMetadataKeyAllowed('Authorization')).toBe(false);
  });

  it('rejects keys containing "privateKey"', () => {
    expect(isMetadataKeyAllowed('privateKey')).toBe(false);
    expect(isMetadataKeyAllowed('userPrivateKey')).toBe(false);
  });

  it('rejects keys containing "connectionString"', () => {
    expect(isMetadataKeyAllowed('connectionString')).toBe(false);
  });

  it('rejects keys containing "databaseUrl"', () => {
    expect(isMetadataKeyAllowed('databaseUrl')).toBe(false);
  });

  it('rejects keys containing "tokenHash"', () => {
    expect(isMetadataKeyAllowed('tokenHash')).toBe(false);
    expect(isMetadataKeyAllowed('sessionTokenHash')).toBe(false);
  });
});

describe('validateAuditMetadata', () => {
  it('accepts null', () => {
    const r = validateAuditMetadata(null);
    expect(r.ok).toBe(true);
  });

  it('accepts an empty object', () => {
    const r = validateAuditMetadata({});
    expect(r.ok).toBe(true);
  });

  it('accepts a simple object with allowed keys', () => {
    const r = validateAuditMetadata({ foo: 'bar', count: 42 });
    expect(r.ok).toBe(true);
  });

  it('rejects an object with a forbidden key', () => {
    const r = validateAuditMetadata({ password: 'secret' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('forbidden_key');
    }
  });

  it('rejects an object with a forbidden nested key', () => {
    const r = validateAuditMetadata({ user: { token: 'abc' } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('forbidden_key');
    }
  });

  it('rejects undefined', () => {
    const r = validateAuditMetadata(undefined);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('undefined_value');
    }
  });

  it('rejects an object with an undefined value', () => {
    const r = validateAuditMetadata({ a: undefined });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('undefined_value');
    }
  });

  it('rejects NaN', () => {
    const r = validateAuditMetadata(NaN);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unsupported_type');
    }
  });

  it('rejects BigInt', () => {
    const r = validateAuditMetadata(BigInt(1));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unsupported_type');
    }
  });

  it('rejects a string longer than METADATA_MAX_STRING_LENGTH', () => {
    const longString = 'a'.repeat(METADATA_MAX_STRING_LENGTH + 1);
    const r = validateAuditMetadata({ long: longString });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('max_string_length_exceeded');
    }
  });

  it('rejects an array longer than METADATA_MAX_ARRAY_LENGTH', () => {
    const longArray = new Array(METADATA_MAX_ARRAY_LENGTH + 1).fill(0);
    const r = validateAuditMetadata({ arr: longArray });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('max_array_length_exceeded');
    }
  });

  it('rejects an object deeper than METADATA_MAX_DEPTH', () => {
    // Build a nested object deeper than METADATA_MAX_DEPTH.
    let value: unknown = 1;
    for (let i = 0; i < METADATA_MAX_DEPTH + 1; i++) {
      value = { a: value };
    }
    const r = validateAuditMetadata(value);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('max_depth_exceeded');
    }
  });

  it('rejects a circular reference', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    const r = validateAuditMetadata(obj);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('circular_reference');
    }
  });
});
