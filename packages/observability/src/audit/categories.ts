/**
 * Audit event categories for the Ibn Hayan Healthcare Operating System.
 *
 * Per ADR-014 and `09_SECURITY/AUDIT.md` Section 3, audit events are
 * organized into categories that support query, review, and
 * compliance reporting. This file defines the categories implemented
 * in the ninth canonical batch (audit primitive foundation).
 *
 * Categories for clinical, financial, operational, configuration,
 * privacy, and compliance events will be added in future batches as
 * the platform's surface expands. No category is invented for a
 * module that does not exist.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. The persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and these types.
 */

/**
 * The audit event categories implemented in the ninth canonical
 * batch and the ADR-015 scoped-context extension.
 *
 * The values are stable machine-readable strings. They are stored in
 * the `category` column of the `audit_events` table in the dedicated
 * audit database. The category is used for category-based queries
 * (the most common audit query pattern, per `09_SECURITY/AUDIT.md`
 * Section 3.8).
 */
export type AuditEventCategory =
  | 'security'
  | 'authorization'
  | 'tenant_context'
  | 'organisation_context'
  | 'facility_context'
  | 'rbac'
  | 'audit';

/**
 * The complete list of audit event categories implemented in this
 * batch. Used by the metadata validator and the audit-emission API
 * to reject unknown categories at the boundary.
 */
export const AUDIT_EVENT_CATEGORIES: readonly AuditEventCategory[] = [
  'security',
  'authorization',
  'tenant_context',
  'organisation_context',
  'facility_context',
  'rbac',
  'audit',
] as const;

/**
 * Verify that a value is a valid audit event category.
 */
export function isAuditEventCategory(
  value: unknown,
): value is AuditEventCategory {
  if (typeof value !== 'string') {
    return false;
  }
  return (AUDIT_EVENT_CATEGORIES as readonly string[]).includes(value);
}
