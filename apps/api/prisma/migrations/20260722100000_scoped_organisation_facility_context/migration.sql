-- ---------------------------------------------------------------------------
-- ADR-015 batch: scoped organisation and facility context migration.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and
-- CODING_STANDARDS.md §14 (Migration Review Requirements), this
-- migration is reviewed raw SQL. It is PostgreSQL-first and uses
-- features that Prisma 7 cannot express in the schema language
-- (partial unique indexes with NULL predicates, composite foreign
-- keys, CHECK constraints with implication logic).
--
-- Changes:
-- 1. Add three new columns to `tenant_role_assignments`:
--    `scope_level` (NOT NULL VARCHAR(20) DEFAULT 'tenant'),
--    `scope_organisation_id` (nullable UUID),
--    `scope_facility_id` (nullable UUID).
-- 2. Backfill existing rows: every existing row receives
--    `scope_level = 'tenant'`, `scope_organisation_id = NULL`,
--    `scope_facility_id = NULL`. This is the migration of legacy
--    tenant-scoped assignments to explicit tenant scope.
-- 3. Drop the original unique index
--    `tenant_role_assignments_membership_role_key` on
--    `(tenant_membership_id, role_code)`. This index does not
--    account for scope; keeping it would prevent the same role from
--    being assigned at multiple scope levels (e.g. R09 at tenant
--    scope and R09 at facility scope).
-- 4. Add three partial unique indexes (one per scope level) that
--    enforce "no duplicate assignments at the same scope" while
--    allowing the same role to be assigned at multiple scope levels.
--    PostgreSQL treats NULL as distinct in a unique index, which
--    would defeat the constraint for tenant-scoped rows; the partial
--    indexes with explicit NULL predicates are the structural
--    enforcement.
-- 5. Add a CHECK constraint `tenant_role_assignments_scope_level_check`
--    that limits `scope_level` to 'tenant', 'organisation', 'facility'.
-- 6. Add a CHECK constraint
--    `tenant_role_assignments_scope_target_consistency_check` that
--    enforces the scope-target implications:
--    - `scope_level = 'tenant'` IMPLIES `scope_organisation_id IS NULL
--      AND scope_facility_id IS NULL`.
--    - `scope_level = 'organisation'` IMPLIES `scope_organisation_id
--      IS NOT NULL AND scope_facility_id IS NULL`.
--    - `scope_level = 'facility'` IMPLIES `scope_organisation_id IS
--      NOT NULL AND scope_facility_id IS NOT NULL`.
-- 7. Add single-column foreign keys `scope_organisation_id` →
--    `organisations.id` and `scope_facility_id` → `facilities.id`,
--    both with `ON DELETE RESTRICT` and `ON UPDATE RESTRICT`.
-- 8. Add two new columns to `auth_sessions`:
--    `active_organisation_id` (nullable UUID),
--    `active_facility_id` (nullable UUID).
-- 9. Add single-column foreign keys `active_organisation_id` →
--    `organisations.id` and `active_facility_id` → `facilities.id`,
--    both with `ON DELETE RESTRICT` and `ON UPDATE RESTRICT`.
-- 10. Add a composite unique constraint on
--     `facilities(id, organisation_id)`. This unique constraint is
--     required for the composite foreign key added below to be valid
--     in PostgreSQL.
-- 11. Add a reviewed composite foreign key
--     `auth_sessions(active_facility_id, active_organisation_id)` →
--     `facilities(id, organisation_id)`, with `ON DELETE RESTRICT` and
--     `ON UPDATE RESTRICT`. The composite FK enforces at the database
--     level that the active facility belongs to the active
--     organisation.
-- 12. Add a CHECK constraint `auth_sessions_facility_requires_organisation_check`
--     that enforces `active_facility_id IS NULL OR
--     active_organisation_id IS NOT NULL` — a facility cannot remain
--     active without an active organisation.
-- 13. Add indexes on `auth_sessions.active_organisation_id` and
--     `auth_sessions.active_facility_id` for efficient reverse
--     lookups (e.g. "which sessions have this organisation active?").
-- 14. Add indexes on `tenant_role_assignments.scope_organisation_id`
--     and `tenant_role_assignments.scope_facility_id` for efficient
--     scope-filtered reads.
-- 15. Add a composite index on
--     `tenant_role_assignments(tenant_membership_id, role_code, scope_level)`
--     for the authorisation layer's hot path (load a membership's
--     role assignments filtered by scope).
--
-- The migration does NOT:
-- - Insert any rows. Existing role assignments are backfilled to
--   explicit tenant scope; no new assignments are created.
-- - Modify the existing `tenant_memberships`, `users`,
--   `local_credentials`, `tenants`, `organisations`, or `facilities`
--   tables (other than adding the back-relations implicitly via the
--   new foreign keys).
-- - Add any CASCADE behaviour. All foreign keys use RESTRICT.
-- - Add any RLS policy.
-- - Add any seed data.
-- - Implement cross-tenant Platform Super Admin authorisation.
-- - Implement Department or Care-Team scope levels.
--
-- Fail-closed migration behaviour:
-- - Existing tenant-scoped role assignments remain tenant-scoped
--   after this migration. Their behaviour is unchanged.
-- - Existing sessions with no active organisation or facility context
--   remain unchanged; the new columns are nullable.
-- - The authorisation layer continues to default-deny. A membership
--   with no role assignments has no permissions. A principal with
--   no organisation-scoped or facility-scoped assignment cannot
--   select an organisation or facility context.
--
-- This migration is idempotent only when run against a database
-- that has executed the prior migrations
-- (`20260718170628_tenancy_foundation`,
-- `20260718194955_identity_session_foundation`,
-- `20260718220000_session_tenant_context`,
-- `20260719110000_rbac_authorization_foundation`, and
-- `20260719120000_rbac_role_code_check_constraint`). It is not
-- idempotent against an arbitrary database state; the Prisma
-- migration runner applies migrations in order, so this is
-- acceptable.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Part 1: tenant_role_assignments scope columns
-- ---------------------------------------------------------------------------

-- AddColumn: tenant_role_assignments.scope_level
ALTER TABLE "tenant_role_assignments"
  ADD COLUMN "scope_level" VARCHAR(20) NOT NULL DEFAULT 'tenant';

-- AddColumn: tenant_role_assignments.scope_organisation_id
ALTER TABLE "tenant_role_assignments"
  ADD COLUMN "scope_organisation_id" UUID;

-- AddColumn: tenant_role_assignments.scope_facility_id
ALTER TABLE "tenant_role_assignments"
  ADD COLUMN "scope_facility_id" UUID;

-- Backfill: existing rows are tenant-scoped by implication (they
-- were created before scope levels existed). The DEFAULT 'tenant'
-- already populates the column for existing rows at ADD COLUMN
-- time, but we run an explicit UPDATE for clarity and to ensure
-- the column is non-null even if the DEFAULT were ever dropped.
UPDATE "tenant_role_assignments"
  SET "scope_level" = 'tenant',
      "scope_organisation_id" = NULL,
      "scope_facility_id" = NULL
  WHERE "scope_level" IS NULL
     OR "scope_organisation_id" IS NOT NULL
     OR "scope_facility_id" IS NOT NULL;

-- DropIndex: drop the original unique index on
-- (tenant_membership_id, role_code). This index does not account
-- for scope; keeping it would prevent the same role from being
-- assigned at multiple scope levels.
DROP INDEX IF EXISTS "tenant_role_assignments_membership_role_key";

-- CreateIndex: three partial unique indexes, one per scope level.
-- PostgreSQL treats NULL as distinct in a unique index, which would
-- defeat the constraint for tenant-scoped rows (where
-- scope_organisation_id and scope_facility_id are NULL). The
-- partial indexes with explicit NULL predicates are the structural
-- enforcement of "no duplicate assignments at the same scope".
CREATE UNIQUE INDEX "tenant_role_assignments_tenant_scope_uniq"
  ON "tenant_role_assignments"("tenant_membership_id", "role_code")
  WHERE "scope_level" = 'tenant'
    AND "scope_organisation_id" IS NULL
    AND "scope_facility_id" IS NULL;

CREATE UNIQUE INDEX "tenant_role_assignments_organisation_scope_uniq"
  ON "tenant_role_assignments"("tenant_membership_id", "role_code", "scope_organisation_id")
  WHERE "scope_level" = 'organisation'
    AND "scope_facility_id" IS NULL;

CREATE UNIQUE INDEX "tenant_role_assignments_facility_scope_uniq"
  ON "tenant_role_assignments"("tenant_membership_id", "role_code", "scope_organisation_id", "scope_facility_id")
  WHERE "scope_level" = 'facility';

-- AddConstraint: CHECK constraint limiting scope_level to the
-- ratified catalogue. Department and Care-Team scope levels are
-- deferred to a future ADR.
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_scope_level_check"
  CHECK ("scope_level" IN ('tenant', 'organisation', 'facility'));

-- AddConstraint: CHECK constraint enforcing the scope-target
-- implications. The constraint is a disjunction of three
-- implications, each of which is a (condition OR NOT antecedent)
-- clause. The overall constraint is satisfied when at least one
-- implication's antecedent is false OR its consequent is true.
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_scope_target_consistency_check"
  CHECK (
    (
      "scope_level" = 'tenant'
      AND "scope_organisation_id" IS NULL
      AND "scope_facility_id" IS NULL
    )
    OR (
      "scope_level" = 'organisation'
      AND "scope_organisation_id" IS NOT NULL
      AND "scope_facility_id" IS NULL
    )
    OR (
      "scope_level" = 'facility'
      AND "scope_organisation_id" IS NOT NULL
      AND "scope_facility_id" IS NOT NULL
    )
  );

-- AddForeignKey: tenant_role_assignments.scope_organisation_id → organisations.id
-- ON DELETE RESTRICT: deleting an Organisation that is referenced by
-- a role assignment is rejected. The application layer must delete
-- the role assignments first.
-- ON UPDATE RESTRICT: updating an Organisation's `id` while
-- referenced is rejected. In practice, IDs are immutable.
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_scope_organisation_id_fkey"
  FOREIGN KEY ("scope_organisation_id")
  REFERENCES "organisations" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- AddForeignKey: tenant_role_assignments.scope_facility_id → facilities.id
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_scope_facility_id_fkey"
  FOREIGN KEY ("scope_facility_id")
  REFERENCES "facilities" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- CreateIndex: index on scope_organisation_id for efficient
-- scope-filtered reads (e.g. "which assignments target this
-- organisation?").
CREATE INDEX "tenant_role_assignments_scope_organisation_id_idx"
  ON "tenant_role_assignments"("scope_organisation_id");

-- CreateIndex: index on scope_facility_id for efficient
-- scope-filtered reads.
CREATE INDEX "tenant_role_assignments_scope_facility_id_idx"
  ON "tenant_role_assignments"("scope_facility_id");

-- CreateIndex: composite index on
-- (tenant_membership_id, role_code, scope_level) for the
-- authorisation layer's hot path.
CREATE INDEX "tenant_role_assignments_membership_role_scope_idx"
  ON "tenant_role_assignments"("tenant_membership_id", "role_code", "scope_level");

-- ---------------------------------------------------------------------------
-- Part 2: auth_sessions active organisation and facility columns
-- ---------------------------------------------------------------------------

-- AddColumn: auth_sessions.active_organisation_id
ALTER TABLE "auth_sessions"
  ADD COLUMN "active_organisation_id" UUID;

-- AddColumn: auth_sessions.active_facility_id
ALTER TABLE "auth_sessions"
  ADD COLUMN "active_facility_id" UUID;

-- AddForeignKey: auth_sessions.active_organisation_id → organisations.id
-- ON DELETE RESTRICT: deleting an Organisation that is referenced by
-- an active session is rejected. The application layer must clear
-- the session's active organisation context before deleting the
-- organisation.
ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_active_organisation_id_fkey"
  FOREIGN KEY ("active_organisation_id")
  REFERENCES "organisations" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- AddForeignKey: auth_sessions.active_facility_id → facilities.id
ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_active_facility_id_fkey"
  FOREIGN KEY ("active_facility_id")
  REFERENCES "facilities" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- CreateIndex: composite unique constraint on
-- facilities(id, organisation_id). This unique constraint is
-- required for the composite foreign key added below to be valid
-- in PostgreSQL. PostgreSQL requires that the referenced columns
-- of a foreign key be backed by a unique constraint or primary key.
CREATE UNIQUE INDEX IF NOT EXISTS "facilities_id_organisation_id_key"
  ON "facilities"("id", "organisation_id");

-- AddCompositeForeignKey:
--   auth_sessions(active_facility_id, active_organisation_id) →
--   facilities(id, organisation_id)
-- This composite FK enforces at the database level that the active
-- facility belongs to the active organisation. Without this
-- constraint, a buggy or malicious application-layer call could
-- set the active facility to a facility that belongs to a different
-- organisation than the active organisation.
ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_active_facility_organisation_fkey"
  FOREIGN KEY ("active_facility_id", "active_organisation_id")
  REFERENCES "facilities" ("id", "organisation_id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- AddConstraint: CHECK constraint enforcing that a facility cannot
-- remain active without an active organisation. This is the
-- structural backstop for the cascade-clearing invariant
-- "clearing the organisation clears the facility". The application
-- layer performs the cascade in the same Prisma transaction; the
-- CHECK constraint is the database-level backstop that catches any
-- application-layer bug that leaves a facility active without an
-- organisation.
ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_facility_requires_organisation_check"
  CHECK ("active_facility_id" IS NULL OR "active_organisation_id" IS NOT NULL);

-- CreateIndex: index on auth_sessions.active_organisation_id for
-- efficient reverse lookups (e.g. "which sessions have this
-- organisation active?").
CREATE INDEX "auth_sessions_active_organisation_id_idx"
  ON "auth_sessions"("active_organisation_id");

-- CreateIndex: index on auth_sessions.active_facility_id for
-- efficient reverse lookups.
CREATE INDEX "auth_sessions_active_facility_id_idx"
  ON "auth_sessions"("active_facility_id");
