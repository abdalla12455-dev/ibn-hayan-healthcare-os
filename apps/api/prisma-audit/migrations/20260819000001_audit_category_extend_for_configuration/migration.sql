-- ---------------------------------------------------------------------------
-- Audit store category CHECK constraint extension for the Configuration
-- audit category (first canonical Configuration vertical slice, BC16).
--
-- The `configuration` category registers Configuration administration
-- events (effective-value reads and override create/update writes). Per
-- the audit architecture (ADR-014), the category must be registered in
-- the `audit_events_category_check` CHECK constraint of the immutable
-- `audit_events` table before any Configuration audit event can be
-- projected from the transactional outbox into the audit store.
--
-- The TypeScript counterpart adds `configuration` to the
-- `AuditEventCategory` union in
-- `packages/observability/src/audit/categories.ts`. The source prefix
-- mapping in `inferCategoryFromAction` maps `configuration.` actions
-- to this category.
--
-- Per ADR-012 §1.4 safeguard 3 (reviewed raw SQL) and CODING_STANDARDS.md
-- §14 (Migration Review Requirements), this migration is reviewed raw
-- SQL. It reuses the idempotent DROP + ADD pair established by
-- `20260726000000_audit_category_extend_for_role_preview`.
-- ---------------------------------------------------------------------------

ALTER TABLE "audit_events"
    DROP CONSTRAINT IF EXISTS "audit_events_category_check";

ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_category_check"
    CHECK ("category" IN (
        'security',
        'authorization',
        'tenant_context',
        'organisation_context',
        'facility_context',
        'rbac',
        'audit',
        'role_preview',
        'configuration'
    ));
