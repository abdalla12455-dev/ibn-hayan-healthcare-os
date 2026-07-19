/**
 * Audit event source types for the Ibn Hayan Healthcare Operating
 * System.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * source identifies the platform component that emitted the audit
 * event. The source supports investigation: an auditor reviewing an
 * event can identify whether the event was emitted by the API, the
 * dispatcher, the bootstrap, or the verifier.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

/**
 * The audit event source types implemented in the ninth canonical
 * batch.
 *
 * The values are stable machine-readable strings. They are stored in
 * the `source` column of the `audit_events` table in the dedicated
 * audit database.
 */
export type AuditEventSource =
  | 'api'
  | 'dispatcher'
  | 'bootstrap'
  | 'verifier';

/**
 * The complete list of audit event source types implemented in this
 * batch.
 */
export const AUDIT_EVENT_SOURCES: readonly AuditEventSource[] = [
  'api',
  'dispatcher',
  'bootstrap',
  'verifier',
] as const;

/**
 * Verify that a value is a valid audit event source.
 */
export function isAuditEventSource(
  value: unknown,
): value is AuditEventSource {
  if (typeof value !== 'string') {
    return false;
  }
  return (AUDIT_EVENT_SOURCES as readonly string[]).includes(value);
}
