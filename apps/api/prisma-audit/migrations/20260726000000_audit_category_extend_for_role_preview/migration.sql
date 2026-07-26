-- ---------------------------------------------------------------------------
-- Audit store category CHECK constraint extension for the Demo Role
-- Preview Mode and the ADR-015 scoped-context categories.
--
-- This migration is the database-side counterpart of the TypeScript
-- change that added `organisation_context`, `facility_context`, and
-- `role_preview` to the `AuditEventCategory` union in
-- `packages/observability/src/audit/categories.ts`.
--
-- Root cause being fixed:
-- The original `audit_events_category_check` CHECK constraint (added
-- in migration `20260719130000_audit_store_foundation`) allowed only
-- five categories: `security`, `authorization`, `tenant_context`,
-- `rbac`, `audit`. The TypeScript category catalogue was later
-- extended with `organisation_context` and `facility_context` (ADR-015
-- scoped-context extension) and `role_preview` (Demo Role Preview
-- Mode extension), but the database CHECK constraint was never
-- updated to match.
--
-- The gap was not caught earlier because:
-- 1. The transactional `audit_outbox_events` table stores the
--    `canonical_event_draft` as JSONB and has NO CHECK constraint on
--    the category. Outbox inserts always succeed regardless of
--    category.
-- 2. The ADR-015 integration tests exercise the `organisation_context`
--    and `facility_context` categories through the outbox, but the
--    PostgreSQL 17 validation workflow for ADR-015 ran against a
--    migration snapshot that predated the dispatcher's full
--    projection path for those categories.
-- 3. The Demo Role Preview bootstrap flow is the FIRST end-to-end
--    path that emits a `role_preview` audit event AND projects it
--    through the dispatcher into the `audit_events` table. The
--    dispatcher's `auditStore.append()` calls `INSERT INTO
--    audit_events`, which triggers the CHECK constraint violation.
--    The violation is caught by the append repository's try/catch
--    and returned as `transient_failure` with failureCode
--    `audit_store_unavailable`. The dispatcher then records the
--    failure with a backoff, leaving the outbox row pending. The
--    integration tests `31. Audit projection succeeds`, `32. Audit
--    database receives the projected record`, `33. Audit database
--    record contains no secrets`, and `34. Transactional and audit
--    database isolation is proven` all fail because no projected
--    record appears.
--
-- This migration fixes the gap by replacing the CHECK constraint
-- with one that includes all eight categories from the current
-- TypeScript catalogue. The replacement is idempotent: it drops
-- the old constraint (if present) and adds the new one.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and
-- CODING_STANDARDS.md §14 (Migration Review Requirements), this
-- migration is reviewed raw SQL. It is PostgreSQL-first.
--
-- This migration does NOT:
-- - Insert any rows.
-- - Modify any existing audit_events rows (the table is immutable
--   anyway; the immutability triggers reject UPDATE and DELETE).
-- - Add or remove any column.
-- - Change any index, foreign key, or trigger.
-- - Modify the runtime-role grants.
--
-- Safety:
-- - The DROP CONSTRAINT + ADD CONSTRAINT pair runs in a single
--   transaction (Prisma's `migrate deploy` wraps each migration in
--   a transaction). If the ADD CONSTRAINT fails, the DROP is rolled
--   back, so the original constraint remains in place.
-- - No existing `audit_events` row can have a category outside the
--   new allowed set, because the old constraint was a subset of the
--   new constraint. The ADD CONSTRAINT cannot fail on existing data.
-- ---------------------------------------------------------------------------

-- Drop the old five-category CHECK constraint.
ALTER TABLE "audit_events"
    DROP CONSTRAINT IF EXISTS "audit_events_category_check";

-- Add the new eight-category CHECK constraint. The list matches the
-- `AuditEventCategory` union in
-- `packages/observability/src/audit/categories.ts` exactly:
--   security, authorization, tenant_context, organisation_context,
--   facility_context, rbac, audit, role_preview.
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
        'role_preview'
    ));
