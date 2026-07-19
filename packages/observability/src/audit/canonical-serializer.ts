/**
 * Deterministic canonical serialization for audit events.
 *
 * Per ADR-014 §1.1 and the ninth canonical batch specification, the
 * same logical audit event must always produce the same canonical
 * payload regardless of JavaScript object insertion order. The
 * canonical payload is SHA-256 hashed to produce `payload_hash`,
 * which is then bound into the HMAC-SHA-256 integrity hash.
 *
 * Rules (per ADR-014 §12 and the batch worklog):
 * - Object keys are sorted lexicographically at every depth, using
 *   UTF-16 code-unit order (consistent with
 *   `Array.prototype.sort` default).
 * - Arrays preserve their order.
 * - Strings are JSON-escaped per RFC 8259.
 * - Numbers are serialized in their `JSON.stringify` form.
 *   `NaN`, `Infinity`, and `-Infinity` are NOT permitted; the
 *   serializer throws on these values.
 * - Booleans are serialized as `true` or `false`.
 * - `null` is serialized as `null`.
 * - `undefined` is NOT permitted; the serializer throws on
 *   `undefined` values. (The metadata validator rejects `undefined`
 *   before serialization; this is a defence-in-depth check.)
 * - BigInt is NOT permitted; the serializer throws.
 * - Symbols are NOT permitted; the serializer throws.
 * - Functions are NOT permitted; the serializer throws.
 *
 * The serializer produces a UTF-8 encoded string. The caller is
 * responsible for hashing the string with SHA-256.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. It uses only the Node.js
 * `crypto` module for hashing.
 */

import { createHash } from 'node:crypto';

/**
 * Serialize a value into its canonical JSON form, with object keys
 * sorted lexicographically at every depth.
 *
 * Throws on `undefined`, `BigInt`, `Symbol`, `Function`, `NaN`,
 * `Infinity`, and `-Infinity`. These values are not permitted in
 * audit payloads because they cannot be round-tripped through JSON
 * and because their presence indicates a defect in the emitting
 * code.
 *
 * The output is a string. The caller is responsible for UTF-8
 * encoding the string for hashing.
 */
export function canonicalSerialize(value: unknown): string {
  return serializeValue(value);
}

/**
 * Compute the SHA-256 hash of the canonical serialization of a
 * value. Returns a lowercase hexadecimal string of length 64.
 *
 * This is the `payload_hash` of an audit event.
 */
export function canonicalPayloadHash(value: unknown): string {
  const serialized = canonicalSerialize(value);
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Internal serializer
// ---------------------------------------------------------------------------

/**
 * Internal recursive serializer. Produces the canonical JSON string
 * for a value.
 */
function serializeValue(value: unknown): string {
  // `undefined` is not permitted. JSON.stringify would omit the key
  // or convert to `null`, both of which would produce an ambiguous
  // canonical form. Throw to surface the defect.
  if (value === undefined) {
    throw new Error(
      'canonicalSerialize: undefined is not permitted in audit payloads.',
    );
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        'canonicalSerialize: NaN, Infinity, and -Infinity are not permitted in audit payloads.',
      );
    }
    // JSON.stringify produces the canonical number form for finite
    // numbers (e.g. `1` not `1.0`, `0` not `-0`). We use
    // `Object.is` to detect `-0` because `JSON.stringify(-0)`
    // returns `"0"` but we want to reject `-0` for unambiguity.
    if (Object.is(value, -0)) {
      return '0';
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'bigint') {
    throw new Error(
      'canonicalSerialize: BigInt is not permitted in audit payloads. Convert to string or number before serialization.',
    );
  }

  if (typeof value === 'symbol') {
    throw new Error(
      'canonicalSerialize: Symbol is not permitted in audit payloads.',
    );
  }

  if (typeof value === 'function') {
    throw new Error(
      'canonicalSerialize: Function is not permitted in audit payloads.',
    );
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return serializeArray(value);
  }

  if (typeof value === 'object') {
    return serializeObject(value as Record<string, unknown>);
  }

  // Exhaustiveness check. If a new primitive type is introduced in a
  // future ECMAScript version, this throw surfaces the defect.
  throw new Error(
    `canonicalSerialize: unsupported value type "${typeof value}".`,
  );
}

/**
 * Serialize an array. Elements are serialized in their original
 * order; no sorting is applied to array elements.
 */
function serializeArray(arr: readonly unknown[]): string {
  if (arr.length === 0) {
    return '[]';
  }
  const parts: string[] = [];
  for (const element of arr) {
    parts.push(serializeValue(element));
  }
  return '[' + parts.join(',') + ']';
}

/**
 * Serialize an object. Keys are sorted lexicographically at every
 * depth using UTF-16 code-unit order (consistent with
 * `Array.prototype.sort` default).
 */
function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return '{}';
  }
  keys.sort();
  const parts: string[] = [];
  for (const key of keys) {
    const value = obj[key];
    // `undefined` values are not permitted. We throw here too as a
    // defence-in-depth check; the metadata validator should have
    // rejected `undefined` earlier.
    if (value === undefined) {
      throw new Error(
        `canonicalSerialize: undefined value for key "${key}" is not permitted in audit payloads.`,
      );
    }
    parts.push(JSON.stringify(key) + ':' + serializeValue(value));
  }
  return '{' + parts.join(',') + '}';
}
