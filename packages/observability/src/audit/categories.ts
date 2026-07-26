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
 * batch, the ADR-015 scoped-context extension, and the Demo Role
 * Preview Mode extension.
 *
 * The values are stable machine-readable strings. They are stored in
 * the `category` column of the `audit_events` table in the dedicated
 * audit database. The category is used for category-based queries
 * (the most common audit query pattern, per `09_SECURITY/AUDIT.md`
 * Section 3.8).
 *
 * `role_preview` is the category for Demo Role Preview Mode audit
 * events. It is inferred by `inferCategoryFromAction` for any
 * action whose prefix is `role_preview.` (e.g.
 * `role_preview.session.created`,
 * `role_preview.session.bootstrapped`,
 * `role_preview.session.ended`). The action codes are registered in
 * `action-codes.ts`; this category entry MUST be present so that
 * `buildAuditEventDraft` accepts the inferred category rather than
 * rejecting it with `unknown_category`. Without this entry, every
 * Role Preview audit emission fails inside its surrounding Prisma
 * transaction, which (per the `emitOrFail` atomicity contract)
 * rolls back the session creation and surfaces as an HTTP 500.
 *
 * NOTE on the absence of a `clinic_admin` category: the Clinic
 * Admin Overview surface at `/api/v1/clinic-admin/overview` emits
 * a `clinic_admin.overview.viewed` action code (registered in
 * `action-codes.ts` under `CLINIC_ADMIN_ACTION_CODES`), but this
 * action is mapped to the existing `facility_context` category by
 * `inferCategoryFromAction` — NOT to a new `clinic_admin` category.
 * The `facility_context` category IS accepted by the
 * `audit_events_category_check` CHECK constraint in the dedicated
 * audit database, so no migration is required. The mapping is the
 * narrowest semantically correct choice: the Overview is facility-
 * scoped (requires active facility, includes facilityDisplayName,
 * fails closed if facility is missing). This preserves both audit
 * signals for the endpoint — the guard's
 * `authorization.decision.allowed` event (proves authorization) and
 * the service's `clinic_admin.overview.viewed` event (proves the
 * Overview operation completed successfully) — matching the
 * established two-event pattern for read-only endpoints (cf. the
 * session-context module's `tenant_context.viewed` event).
 *
 * History: the original live-data batch (commit 67802eb) introduced
 * a `clinic_admin` category, which was NOT in the database CHECK
 * constraint. The first correction (commit ee95c8c) removed the
 * action code entirely, weakening the audit trail by losing the
 * "service completed successfully" signal. This restoration re-adds
 * the action code mapped to the existing `facility_context` category,
 * preserving both audit signals without requiring a database migration.
 */
export type AuditEventCategory =
  | 'security'
  | 'authorization'
  | 'tenant_context'
  | 'organisation_context'
  | 'facility_context'
  | 'rbac'
  | 'audit'
  | 'role_preview';

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
  'role_preview',
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
