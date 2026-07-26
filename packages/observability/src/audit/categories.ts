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
 * Admin Overview live-data batch originally introduced a
 * `clinic_admin` category and a `clinic_admin.overview.viewed`
 * action code. The category was added to this TypeScript union
 * but NO corresponding database migration was added to extend
 * the `audit_events_category_check` CHECK constraint in the
 * dedicated audit database (which allows only the eight categories
 * listed below). The result would have been: outbox INSERT
 * succeeds (the transactional `audit_outbox_events` table stores
 * the event as JSONB with no category CHECK), but the dispatcher's
 * projection into `audit_events` fails with a CHECK constraint
 * violation, leaving the outbox row pending forever and silently
 * breaking the audit trail. This is the exact bug pattern that
 * migration `20260726000000_audit_category_extend_for_role_preview`
 * fixed for `role_preview` — but the live-data task specification
 * forbade schema/migration changes. The correction removed the
 * `clinic_admin` category and the `clinic_admin.overview.viewed`
 * action code from the TypeScript catalogues and removed the
 * explicit audit emission from the Clinic Admin Overview service.
 * The audit trail for `/api/v1/clinic-admin/overview` is now
 * provided by the `AuthorizationGuard`'s existing
 * `authorization.decision.allowed` event (category `authorization`,
 * which IS in the database CHECK constraint), which is emitted for
 * every authorized request with `permissionCode='clinic_admin_overview:view'`,
 * the endpoint path, the HTTP method, the actor, the session, the
 * tenant, and the role codes. This is MORE metadata than the
 * removed explicit emission carried, so no audit signal is lost.
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
