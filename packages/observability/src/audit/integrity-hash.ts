/**
 * HMAC-SHA-256 integrity-hash helper for audit events.
 *
 * Per ADR-014 §11, the integrity hash of an audit event is
 * `HMAC-SHA-256(integrity_key, integrity_input)`, where
 * `integrity_input` is the canonical serialization of:
 *
 * - `integrity_key_version` (integer)
 * - `chain_scope` (text)
 * - `chain_sequence` (biginteger)
 * - `previous_integrity_hash` (text or null)
 * - `payload_hash` (text)
 *
 * The integrity hash binds the record's payload, the prior record's
 * integrity hash, the chain scope, the chain sequence, and the
 * integrity key version. Modification of any field breaks the chain.
 *
 * The integrity key is NOT stored in the audit database. The
 * integrity key is supplied to the dispatcher (at append time) and
 * to the verifier (at verification time) through
 * `AUDIT_INTEGRITY_HMAC_KEY` and `AUDIT_INTEGRITY_KEY_VERSION`.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. It uses only the Node.js
 * `crypto` module.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalSerialize } from './canonical-serializer.js';

/**
 * The bound fields that the integrity hash covers. These are the
 * fields that, if modified, must break the chain.
 *
 * The `previousIntegrityHash` field is `null` for the first record
 * in a chain.
 */
export interface IntegrityInput {
  readonly integrityKeyVersion: number;
  readonly chainScope: string;
  readonly chainSequence: number;
  readonly previousIntegrityHash: string | null;
  readonly payloadHash: string;
}

/**
 * Compute the HMAC-SHA-256 integrity hash for an audit event.
 *
 * The `integrityKey` is the raw key bytes (a Buffer or a string). If
 * a string is supplied, it is UTF-8 encoded. The caller is
 * responsible for ensuring the key has at least 256 bits of entropy
 * (32 bytes); the key-validation helper in `key-validation.ts`
 * enforces this at startup.
 *
 * Returns a lowercase hexadecimal string of length 64.
 */
export function computeIntegrityHash(
  integrityKey: Buffer | string,
  input: IntegrityInput,
): string {
  const canonicalInput = canonicalSerialize({
    integrityKeyVersion: input.integrityKeyVersion,
    chainScope: input.chainScope,
    chainSequence: input.chainSequence,
    previousIntegrityHash: input.previousIntegrityHash,
    payloadHash: input.payloadHash,
  });
  const keyBuffer =
    typeof integrityKey === 'string'
      ? Buffer.from(integrityKey, 'utf8')
      : integrityKey;
  return createHmac('sha256', keyBuffer).update(canonicalInput, 'utf8').digest('hex');
}

/**
 * Verify that a supplied integrity hash matches the recomputed
 * integrity hash for the given input.
 *
 * Uses `timingSafeEqual` to prevent timing side-channels.
 *
 * Returns `true` if the hashes match, `false` otherwise. Never
 * throws on a hash mismatch; the caller is responsible for
 * surfacing the failure as a verification result.
 */
export function verifyIntegrityHash(
  integrityKey: Buffer | string,
  input: IntegrityInput,
  expectedHash: string,
): boolean {
  // Defence-in-depth: if the expected hash is not a 64-character
  // lowercase hex string, it cannot be a valid integrity hash.
  if (!/^[0-9a-f]{64}$/.test(expectedHash)) {
    return false;
  }
  const actual = computeIntegrityHash(integrityKey, input);
  const actualBuf = Buffer.from(actual, 'utf8');
  const expectedBuf = Buffer.from(expectedHash, 'utf8');
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqualBuffers(actualBuf, expectedBuf);
}

/**
 * Compute the chain scope for a tenant-scoped event. Returns
 * `tenant:<tenantId>`.
 */
export function tenantChainScope(tenantId: string): string {
  return `tenant:${tenantId}`;
}

/**
 * The chain scope for platform-scoped events. Returns `platform`.
 */
export const PLATFORM_CHAIN_SCOPE = 'platform' as const;

/**
 * Timing-safe buffer comparison. Wraps `crypto.timingSafeEqual` and
 * returns false (instead of throwing) when the buffers have
 * different lengths.
 */
function timingSafeEqualBuffers(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
