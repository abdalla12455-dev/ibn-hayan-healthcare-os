/**
 * Audit actor types for the Ibn Hayan Healthcare Operating System.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * supported actor types are:
 *
 * - `USER`: An authenticated human user.
 * - `SYSTEM`: A platform-internal actor (e.g. the dispatcher, the
 *   verifier, the bootstrap).
 * - `INTEGRATION`: An integration account (R14).
 * - `ANONYMOUS`: An unauthenticated principal (e.g. a failed-login
 *   attempt).
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

/**
 * The actor types implemented in the ninth canonical batch.
 *
 * The values are stable machine-readable strings. They are stored in
 * the `actor_type` column of the `audit_events` table in the
 * dedicated audit database.
 */
export type AuditActorType = 'USER' | 'SYSTEM' | 'INTEGRATION' | 'ANONYMOUS';

/**
 * The complete list of audit actor types implemented in this batch.
 */
export const AUDIT_ACTOR_TYPES: readonly AuditActorType[] = [
  'USER',
  'SYSTEM',
  'INTEGRATION',
  'ANONYMOUS',
] as const;

/**
 * Verify that a value is a valid audit actor type.
 */
export function isAuditActorType(
  value: unknown,
): value is AuditActorType {
  if (typeof value !== 'string') {
    return false;
  }
  return (AUDIT_ACTOR_TYPES as readonly string[]).includes(value);
}
