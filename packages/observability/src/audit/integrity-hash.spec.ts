import { describe, it, expect } from 'vitest';
import {
  computeIntegrityHash,
  verifyIntegrityHash,
  tenantChainScope,
  PLATFORM_CHAIN_SCOPE,
  type IntegrityInput,
} from './integrity-hash.js';

/**
 * Unit tests for the integrity-hash helper.
 */
describe('computeIntegrityHash', () => {
  const key = 'test-integrity-key-with-sufficient-entropy-32bytes';

  it('produces a 64-character lowercase hex string', () => {
    const input: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const hash = computeIntegrityHash(key, input);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces identical hashes for identical inputs', () => {
    const input: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const hash1 = computeIntegrityHash(key, input);
    const hash2 = computeIntegrityHash(key, input);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different key versions', () => {
    const input1: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const input2: IntegrityInput = { ...input1, integrityKeyVersion: 2 };
    expect(computeIntegrityHash(key, input1)).not.toBe(
      computeIntegrityHash(key, input2),
    );
  });

  it('produces different hashes for different chain scopes', () => {
    const input1: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const input2: IntegrityInput = {
      ...input1,
      chainScope: tenantChainScope('tenant-1'),
    };
    expect(computeIntegrityHash(key, input1)).not.toBe(
      computeIntegrityHash(key, input2),
    );
  });

  it('produces different hashes for different chain sequences', () => {
    const input1: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const input2: IntegrityInput = { ...input1, chainSequence: 2 };
    expect(computeIntegrityHash(key, input1)).not.toBe(
      computeIntegrityHash(key, input2),
    );
  });

  it('produces different hashes for different previous integrity hashes', () => {
    const input1: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 2,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const input2: IntegrityInput = {
      ...input1,
      previousIntegrityHash: 'def456',
    };
    expect(computeIntegrityHash(key, input1)).not.toBe(
      computeIntegrityHash(key, input2),
    );
  });

  it('produces different hashes for different payload hashes', () => {
    const input1: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const input2: IntegrityInput = { ...input1, payloadHash: 'def456' };
    expect(computeIntegrityHash(key, input1)).not.toBe(
      computeIntegrityHash(key, input2),
    );
  });

  it('produces different hashes for different keys', () => {
    const input: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const key1 = 'test-integrity-key-with-sufficient-entropy-32bytes';
    const key2 = 'different-integrity-key-with-sufficient-entropy!';
    expect(computeIntegrityHash(key1, input)).not.toBe(
      computeIntegrityHash(key2, input),
    );
  });
});

describe('verifyIntegrityHash', () => {
  const key = 'test-integrity-key-with-sufficient-entropy-32bytes';

  it('returns true for a matching hash', () => {
    const input: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const hash = computeIntegrityHash(key, input);
    expect(verifyIntegrityHash(key, input, hash)).toBe(true);
  });

  it('returns false for a non-matching hash', () => {
    const input: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    expect(verifyIntegrityHash(key, input, '0'.repeat(64))).toBe(false);
  });

  it('returns false for a malformed hash', () => {
    const input: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    expect(verifyIntegrityHash(key, input, 'not-a-hash')).toBe(false);
  });

  it('returns false when the key is wrong', () => {
    const input: IntegrityInput = {
      integrityKeyVersion: 1,
      chainScope: PLATFORM_CHAIN_SCOPE,
      chainSequence: 1,
      previousIntegrityHash: null,
      payloadHash: 'abc123',
    };
    const hash = computeIntegrityHash(key, input);
    const wrongKey = 'different-integrity-key-with-sufficient-entropy!';
    expect(verifyIntegrityHash(wrongKey, input, hash)).toBe(false);
  });
});

describe('tenantChainScope', () => {
  it('produces "tenant:<tenantId>"', () => {
    expect(tenantChainScope('tenant-123')).toBe('tenant:tenant-123');
  });
});
