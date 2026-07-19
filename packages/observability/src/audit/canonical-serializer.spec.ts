import { describe, it, expect } from 'vitest';
import {
  canonicalSerialize,
  canonicalPayloadHash,
} from './canonical-serializer.js';

/**
 * Unit tests for the canonical serializer.
 *
 * The canonical serializer MUST produce the same output for the
 * same logical value regardless of JavaScript object insertion
 * order. The output MUST be valid JSON. The serializer MUST reject
 * `undefined`, `BigInt`, `Symbol`, `Function`, `NaN`, `Infinity`,
 * and `-Infinity`.
 */
describe('canonicalSerialize', () => {
  it('produces identical output for the same object regardless of key insertion order', () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    expect(canonicalSerialize(a)).toBe(canonicalSerialize(b));
  });

  it('sorts keys lexicographically at every depth', () => {
    const value = { b: { d: 1, a: 2 }, a: 3 };
    const serialized = canonicalSerialize(value);
    // The top-level keys are 'a' then 'b'. The nested keys are 'a'
    // then 'd'.
    expect(serialized).toBe('{"a":3,"b":{"a":2,"d":1}}');
  });

  it('preserves array order', () => {
    const value = [3, 1, 2];
    expect(canonicalSerialize(value)).toBe('[3,1,2]');
  });

  it('serializes null, booleans, and numbers correctly', () => {
    expect(canonicalSerialize(null)).toBe('null');
    expect(canonicalSerialize(true)).toBe('true');
    expect(canonicalSerialize(false)).toBe('false');
    expect(canonicalSerialize(0)).toBe('0');
    expect(canonicalSerialize(42)).toBe('42');
    expect(canonicalSerialize(-1.5)).toBe('-1.5');
  });

  it('serializes strings with JSON escaping', () => {
    expect(canonicalSerialize('hello')).toBe('"hello"');
    expect(canonicalSerialize('hello "world"')).toBe('"hello \\"world\\""');
    expect(canonicalSerialize('line\nbreak')).toBe('"line\\nbreak"');
  });

  it('serializes -0 as 0', () => {
    expect(canonicalSerialize(-0)).toBe('0');
  });

  it('rejects undefined', () => {
    expect(() => canonicalSerialize(undefined)).toThrow();
  });

  it('rejects undefined values in objects', () => {
    expect(() => canonicalSerialize({ a: undefined })).toThrow();
  });

  it('rejects NaN', () => {
    expect(() => canonicalSerialize(NaN)).toThrow();
  });

  it('rejects Infinity', () => {
    expect(() => canonicalSerialize(Infinity)).toThrow();
  });

  it('rejects -Infinity', () => {
    expect(() => canonicalSerialize(-Infinity)).toThrow();
  });

  it('rejects BigInt', () => {
    expect(() => canonicalSerialize(BigInt(1))).toThrow();
  });

  it('rejects Symbol', () => {
    expect(() => canonicalSerialize(Symbol('x'))).toThrow();
  });

  it('rejects Function', () => {
    expect(() => canonicalSerialize(() => 0)).toThrow();
  });

  it('handles empty objects and arrays', () => {
    expect(canonicalSerialize({})).toBe('{}');
    expect(canonicalSerialize([])).toBe('[]');
  });

  it('handles deeply nested objects', () => {
    const value = { a: { b: { c: { d: 1 } } } };
    expect(canonicalSerialize(value)).toBe('{"a":{"b":{"c":{"d":1}}}}');
  });
});

describe('canonicalPayloadHash', () => {
  it('produces a 64-character lowercase hex string', () => {
    const hash = canonicalPayloadHash({ a: 1 });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces identical hashes for identical logical values regardless of key order', () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    expect(canonicalPayloadHash(a)).toBe(canonicalPayloadHash(b));
  });

  it('produces different hashes for different values', () => {
    const a = { a: 1 };
    const b = { a: 2 };
    expect(canonicalPayloadHash(a)).not.toBe(canonicalPayloadHash(b));
  });
});
