/**
 * Safe metadata validator and forbidden-key detector for audit
 * events.
 *
 * Per ADR-014 §1.1 and the ninth canonical batch specification,
 * audit emission must reject or sanitise forbidden keys including
 * names containing:
 *
 * - password
 * - passwordHash
 * - token
 * - tokenHash
 * - secret
 * - csrf
 * - cookie
 * - authorization
 * - privateKey
 * - connectionString
 * - databaseUrl
 *
 * The detector is case-insensitive and matches on substrings: a key
 * named `userPassword`, `x_csrf_token`, or `Authorization` is
 * rejected. The detector also enforces maximum object depth, maximum
 * array length, maximum string length, and maximum serialized
 * payload size.
 *
 * The validator is framework-agnostic and is consumed by the
 * audit-emission API in `apps/api/src/modules/audit/`. The validator
 * runs at emission time (before the outbox row is created) and at
 * audit-store-append time (defence-in-depth).
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import { canonicalSerialize } from './canonical-serializer.js';

// ---------------------------------------------------------------------------
// Forbidden-key detector
// ---------------------------------------------------------------------------

/**
 * The forbidden substrings. A metadata key is rejected if it
 * contains any of these substrings, case-insensitively.
 *
 * The list is intentionally broad: a false positive (rejecting a
 * safe key) is preferable to a false negative (persisting a secret).
 * The list can be extended in future batches without breaking
 * historical verification.
 */
export const FORBIDDEN_KEY_SUBSTRINGS: readonly string[] = [
  'password',
  'tokenhash',
  'token',
  'secret',
  'csrf',
  'cookie',
  'authorization',
  'privatekey',
  'connectionstring',
  'databaseurl',
] as const;

/**
 * Verify that a metadata key is not forbidden. Returns `true` if the
 * key is allowed, `false` if it is forbidden.
 *
 * The check is case-insensitive and matches on substrings. A key
 * named `userPassword`, `x_csrf_token`, or `Authorization` is
 * rejected.
 */
export function isMetadataKeyAllowed(key: string): boolean {
  const lower = key.toLowerCase();
  for (const forbidden of FORBIDDEN_KEY_SUBSTRINGS) {
    if (lower.includes(forbidden)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Size limits
// ---------------------------------------------------------------------------

/**
 * Maximum object depth for metadata. Objects deeper than this are
 * rejected. The limit prevents stack overflow in the canonical
 * serializer and prevents pathological metadata from consuming
 * audit-store resources.
 */
export const METADATA_MAX_DEPTH = 8;

/**
 * Maximum array length for metadata. Arrays longer than this are
 * rejected.
 */
export const METADATA_MAX_ARRAY_LENGTH = 100;

/**
 * Maximum string length (in UTF-16 code units) for any string in
 * metadata. Strings longer than this are rejected.
 */
export const METADATA_MAX_STRING_LENGTH = 4096;

/**
 * Maximum serialized payload size (in bytes) for the entire
 * metadata object. Metadata larger than this is rejected.
 */
export const METADATA_MAX_SERIALIZED_BYTES = 64 * 1024; // 64 KiB

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

/**
 * The result of metadata validation. On success, `ok` is `true` and
 * `value` is the validated metadata. On failure, `ok` is `false`
 * and `reason` is a stable machine-readable failure code.
 */
export type MetadataValidationResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: MetadataValidationFailureReason; readonly detail: string };

/**
 * The stable failure reasons for metadata validation.
 */
export type MetadataValidationFailureReason =
  | 'forbidden_key'
  | 'max_depth_exceeded'
  | 'max_array_length_exceeded'
  | 'max_string_length_exceeded'
  | 'max_serialized_bytes_exceeded'
  | 'undefined_value'
  | 'unsupported_type'
  | 'circular_reference';

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate a metadata value for audit persistence.
 *
 * The validator checks:
 * - No forbidden keys (case-insensitive substring match).
 * - Maximum object depth (`METADATA_MAX_DEPTH`).
 * - Maximum array length (`METADATA_MAX_ARRAY_LENGTH`).
 * - Maximum string length (`METADATA_MAX_STRING_LENGTH`).
 * - Maximum serialized size (`METADATA_MAX_SERIALIZED_BYTES`).
 * - No `undefined` values (the canonical serializer does not
 *   support `undefined`).
 * - No unsupported types (`BigInt`, `Symbol`, `Function`).
 * - No circular references.
 *
 * On success, returns `{ ok: true, value }`. The returned `value` is
 * the same reference as the input; the validator does not clone.
 *
 * On failure, returns `{ ok: false, reason, detail }`. The `detail`
 * is a human-readable string for diagnostic logging; it does not
 * contain the metadata value itself.
 */
export function validateAuditMetadata(
  metadata: unknown,
): MetadataValidationResult {
  // First pass: structural validation (forbidden keys, depth, array
  // length, string length, types, circular references).
  const structuralResult = validateStructurally(metadata, new WeakSet(), 0);
  if (!structuralResult.ok) {
    return structuralResult;
  }

  // Second pass: serialized-size validation. The structural pass
  // ensures the value is serializable; the size pass ensures the
  // serialized form fits within the limit.
  try {
    const serialized = canonicalSerialize(metadata);
    const serializedBytes = Buffer.byteLength(serialized, 'utf8');
    if (serializedBytes > METADATA_MAX_SERIALIZED_BYTES) {
      return {
        ok: false,
        reason: 'max_serialized_bytes_exceeded',
        detail: `Metadata serialized size ${serializedBytes} bytes exceeds limit ${METADATA_MAX_SERIALIZED_BYTES} bytes.`,
      };
    }
  } catch (err) {
    // The structural pass should have caught any serialization
    // issue. If we reach here, treat it as an unsupported-type
    // failure.
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: 'unsupported_type',
      detail: `Metadata could not be serialized: ${message}`,
    };
  }

  return { ok: true, value: metadata };
}

/**
 * Internal recursive structural validator.
 *
 * @param value - the value being validated.
 * @param seen - a WeakSet of objects already seen on the current
 *   branch, for circular-reference detection.
 * @param depth - the current object depth (0 for the root).
 */
function validateStructurally(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): MetadataValidationResult {
  if (value === undefined) {
    return {
      ok: false,
      reason: 'undefined_value',
      detail: 'undefined is not permitted in audit metadata.',
    };
  }

  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return {
        ok: false,
        reason: 'unsupported_type',
        detail: 'NaN, Infinity, and -Infinity are not permitted in audit metadata.',
      };
    }
    return { ok: true, value };
  }

  if (typeof value === 'string') {
    if (value.length > METADATA_MAX_STRING_LENGTH) {
      return {
        ok: false,
        reason: 'max_string_length_exceeded',
        detail: `String length ${value.length} exceeds limit ${METADATA_MAX_STRING_LENGTH}.`,
      };
    }
    return { ok: true, value };
  }

  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    return {
      ok: false,
      reason: 'unsupported_type',
      detail: `Type "${typeof value}" is not permitted in audit metadata.`,
    };
  }

  if (typeof value !== 'object') {
    return {
      ok: false,
      reason: 'unsupported_type',
      detail: `Unsupported value type "${typeof value}".`,
    };
  }

  // Object or array.
  if (depth >= METADATA_MAX_DEPTH) {
    return {
      ok: false,
      reason: 'max_depth_exceeded',
      detail: `Object depth exceeds limit ${METADATA_MAX_DEPTH}.`,
    };
  }

  // Circular-reference detection.
  if (seen.has(value as object)) {
    return {
      ok: false,
      reason: 'circular_reference',
      detail: 'Circular reference detected in audit metadata.',
    };
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    if (value.length > METADATA_MAX_ARRAY_LENGTH) {
      return {
        ok: false,
        reason: 'max_array_length_exceeded',
        detail: `Array length ${value.length} exceeds limit ${METADATA_MAX_ARRAY_LENGTH}.`,
      };
    }
    for (const element of value) {
      const r = validateStructurally(element, seen, depth + 1);
      if (!r.ok) {
        return r;
      }
    }
    return { ok: true, value };
  }

  // Plain object.
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!isMetadataKeyAllowed(key)) {
      return {
        ok: false,
        reason: 'forbidden_key',
        detail: `Metadata key "${key}" is forbidden (matches a forbidden substring).`,
      };
    }
    const r = validateStructurally(obj[key], seen, depth + 1);
    if (!r.ok) {
      return r;
    }
  }
  return { ok: true, value };
}
