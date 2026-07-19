import { describe, it, expect } from 'vitest';
import {
  computeIdentifierHash,
  normaliseIdentifierForHashing,
} from './identifier-hmac.js';

/**
 * Unit tests for the identifier-HMAC helper.
 */
describe('normaliseIdentifierForHashing', () => {
  it('trims and lowercases', () => {
    expect(normaliseIdentifierForHashing('  Hello@Example.COM  ')).toBe(
      'hello@example.com',
    );
  });

  it('strips zero-width characters', () => {
    expect(normaliseIdentifierForHashing('hello\u200B@example.com')).toBe(
      'hello@example.com',
    );
  });

  it('strips RTL/LTR marks', () => {
    expect(normaliseIdentifierForHashing('hello\u200E@example.com')).toBe(
      'hello@example.com',
    );
  });

  it('strips bidi overrides', () => {
    expect(normaliseIdentifierForHashing('hello\u202E@example.com')).toBe(
      'hello@example.com',
    );
  });

  it('strips byte order mark', () => {
    expect(normaliseIdentifierForHashing('hello\uFEFF@example.com')).toBe(
      'hello@example.com',
    );
  });
});

describe('computeIdentifierHash', () => {
  const key = 'test-identifier-key-with-sufficient-entropy!';

  it('produces a 64-character lowercase hex string', () => {
    const hash = computeIdentifierHash(key, 'user@example.com');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces identical hashes for the same normalised identifier', () => {
    const hash1 = computeIdentifierHash(key, 'user@example.com');
    const hash2 = computeIdentifierHash(key, 'USER@EXAMPLE.COM');
    const hash3 = computeIdentifierHash(key, '  user@example.com  ');
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  it('produces different hashes for different identifiers', () => {
    const hash1 = computeIdentifierHash(key, 'user1@example.com');
    const hash2 = computeIdentifierHash(key, 'user2@example.com');
    expect(hash1).not.toBe(hash2);
  });

  it('produces different hashes for different keys', () => {
    const hash1 = computeIdentifierHash(key, 'user@example.com');
    const hash2 = computeIdentifierHash(
      'different-identifier-key-with-entropy!!',
      'user@example.com',
    );
    expect(hash1).not.toBe(hash2);
  });

  it('strips zero-width characters before hashing (homograph defence)', () => {
    const hash1 = computeIdentifierHash(key, 'user@example.com');
    const hash2 = computeIdentifierHash(key, 'user\u200B@example.com');
    expect(hash1).toBe(hash2);
  });
});
