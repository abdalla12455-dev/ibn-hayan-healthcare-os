/**
 * Audit event outcomes for the Ibn Hayan Healthcare Operating System.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * supported outcomes are:
 *
 * - `success`: The action completed successfully.
 * - `failure`: The action was attempted but failed (e.g. wrong
 *   password, invalid session, audit-store unavailable).
 * - `denied`: The action was denied by a security control (e.g.
 *   authorization denied, Origin denied, CSRF denied).
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

/**
 * The audit event outcomes implemented in the ninth canonical batch.
 *
 * The values are stable machine-readable strings. They are stored in
 * the `outcome` column of the `audit_events` table in the dedicated
 * audit database.
 */
export type AuditEventOutcome = 'success' | 'failure' | 'denied';

/**
 * The complete list of audit event outcomes implemented in this batch.
 */
export const AUDIT_EVENT_OUTCOMES: readonly AuditEventOutcome[] = [
  'success',
  'failure',
  'denied',
] as const;

/**
 * Verify that a value is a valid audit event outcome.
 */
export function isAuditEventOutcome(
  value: unknown,
): value is AuditEventOutcome {
  if (typeof value !== 'string') {
    return false;
  }
  return (AUDIT_EVENT_OUTCOMES as readonly string[]).includes(value);
}
