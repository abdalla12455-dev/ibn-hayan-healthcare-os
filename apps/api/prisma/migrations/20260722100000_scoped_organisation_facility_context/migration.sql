-- ---------------------------------------------------------------------------
-- ADR-015 batch: scoped organisation and facility context migration.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and
-- CODING_STANDARDS.md §14 (Migration Review Requirements), this
-- migration is reviewed raw SQL. It is PostgreSQL-first and uses
-- features that Prisma 7 cannot express in the schema language
-- (partial unique indexes with NULL predicates, composite foreign
-- keys, CHECK constraints with implication logic, conditional
-- composite foreign keys enforced via NULLable composite columns).
--
-- Changes:
-- 1. Add four new columns to `tenant_role_assignments`:
--    `tenant_id` (UUID, initially nullable, then NOT NULL),
--    `scope_level` (NOT NULL VARCHAR(20) DEFAULT 'tenant'),
--    `scope_organisation_id` (nullable UUID),
--    `scope_facility_id` (nullable UUID).
-- 2. Backfill `tenant_id` from `tenant_memberships.tenant_id` via
--    `tenant_membership_id`. The backfill is performed via an
--    UPDATE FROM SELECT join. After the backfill, a DO block
--    verifies that no row remains NULL and raises an exception if
--    any row is still NULL (fail-closed migration).
-- 3. Set `tenant_id` to NOT NULL after the backfill verification.
-- 4. Backfill existing rows: every existing row receives
--    `scope_level = 'tenant'`, `scope_organisation_id = NULL`,
--    `scope_facility_id = NULL`. This is the migration of legacy
--    tenant-scoped assignments to explicit tenant scope.
-- 5. Drop the original unique index
--    `tenant_role_assignments_membership_role_key` on
--    `(tenant_membership_id, role_code)`. This index does not
--    account for scope; keeping it would prevent the same role from
--    being assigned at multiple scope levels (e.g. R09 at tenant
--    scope and R09 at facility scope).
-- 6. Add three partial unique indexes (one per scope level) that
--    enforce "no duplicate assignments at the same scope" while
--    allowing the same role to be assigned at multiple scope levels.
--    PostgreSQL treats NULL as distinct in a unique index, which
--    would defeat the constraint for tenant-scoped rows; the partial
--    indexes with explicit NULL predicates are the structural
--    enforcement.
-- 7. Add a CHECK constraint `tenant_role_assignments_scope_level_check`
--    that limits `scope_level` to 'tenant', 'organisation', 'facility'.
-- 8. Add a CHECK constraint
--    `tenant_role_assignments_scope_target_consistency_check` that
--    enforces the scope-target implications:
--    - `scope_level = 'tenant'` IMPLIES `scope_organisation_id IS NULL
--      AND scope_facility_id IS NULL`.
--    - `scope_level = 'organisation'` IMPLIES `scope_organisation_id
--      IS NOT NULL AND scope_facility_id IS NULL`.
--    - `scope_level = 'facility'` IMPLIES `scope_organisation_id IS
--      NOT NULL AND scope_facility_id IS NOT NULL`.
-- 9. Add a composite unique constraint on
--    `tenant_memberships(id, tenant_id)`. This unique constraint is
--    required for the composite foreign key added below.
-- 10. Add a composite unique constraint on
--     `facilities(tenant_id, organisation_id, id)`. This unique
--     constraint is required for the composite foreign key added
--     below. The composite unique constraint on
--     `organisations(tenant_id, id)` already exists (added by the
--     third canonical batch).
-- 11. Add single-column foreign keys `scope_organisation_id` ->
--     `organisations.id` and `scope_facility_id` -> `facilities.id`,
--     both with `ON DELETE RESTRICT` and `ON UPDATE RESTRICT`. These
--     single-column FKs are retained for Prisma relation compatibility
--     and as defence-in-depth; the composite FKs added below are the
--     structural enforcement of tenant consistency.
-- 12. Add a composite foreign key
--     `tenant_role_assignments(tenant_membership_id, tenant_id)` ->
--     `tenant_memberships(id, tenant_id)`, with `ON DELETE RESTRICT`
--     and `ON UPDATE RESTRICT`. The composite FK enforces at the
--     database level that the assignment's derived `tenant_id` matches
--     the membership's `tenant_id`. A SQL INSERT that supplies a
--     mismatched `tenant_id` is rejected.
-- 13. Add a composite foreign key
--     `tenant_role_assignments(tenant_id, scope_organisation_id)` ->
--     `organisations(tenant_id, id)`, with `ON DELETE RESTRICT` and
--     `ON UPDATE RESTRICT`. Because PostgreSQL treats a composite
--     foreign key as unenforced when any referencing column is NULL,
--     this composite FK applies only to rows where
--     `scope_organisation_id` is non-null (i.e. organisation-scoped
--     and facility-scoped assignments). It enforces at the database
--     level that the scope-organisation belongs to the assignment's
--     tenant.
-- 14. Add a composite foreign key
--     `tenant_role_assignments(tenant_id, scope_organisation_id,
--     scope_facility_id)` -> `facilities(tenant_id, organisation_id,
--     id)`, with `ON DELETE RESTRICT` and `ON UPDATE RESTRICT`. The
--     composite FK applies only to rows where both `scope_organisation_id`
--     and `scope_facility_id` are non-null (i.e. facility-scoped
--     assignments). It enforces at the database level that the
--     scope-facility belongs to the assignment's tenant and to the
--     scope-organisation.
-- 15. Add two new columns to `auth_sessions`:
--     `active_organisation_id` (nullable UUID),
--     `active_facility_id` (nullable UUID).
-- 16. Add single-column foreign keys `active_organisation_id` ->
--     `organisations.id` and `active_facility_id` -> `facilities.id`,
--     both with `ON DELETE RESTRICT` and `ON UPDATE RESTRICT`.
-- 17. Add a composite unique constraint on
--     `facilities(id, organisation_id)`. This unique constraint is
--     required for the composite foreign key added below to be valid
--     in PostgreSQL.
-- 18. Add a reviewed composite foreign key
--     `auth_sessions(active_facility_id, active_organisation_id)` ->
--     `facilities(id, organisation_id)`, with `ON DELETE RESTRICT` and
--     `ON UPDATE RESTRICT`. The composite FK enforces at the database
--     level that the active facility belongs to the active
--     organisation.
-- 19. Add a CHECK constraint `auth_sessions_facility_requires_organisation_check`
--     that enforces `active_facility_id IS NULL OR
--     active_organisation_id IS NOT NULL` -- a facility cannot remain
--     active without an active organisation.
-- 20. Add indexes on `auth_sessions.active_organisation_id` and
--     `auth_sessions.active_facility_id` for efficient reverse
--     lookups (e.g. "which sessions have this organisation active?").
-- 21. Add indexes on `tenant_role_assignments.scope_organisation_id`
--     and `tenant_role_assignments.scope_facility_id` for efficient
--     scope-filtered reads.
-- 22. Add a composite index on
--     `tenant_role_assignments(tenant_membership_id, role_code, scope_level)`
--     for the authorisation layer's hot path (load a membership's
--     role assignments filtered by scope).
-- 23. Add an index on `tenant_role_assignments.tenant_id` for
--     tenant-scoped reads.
--
-- The migration does NOT:
-- - Insert any rows. Existing role assignments are backfilled to
--   explicit tenant scope; no new assignments are created.
-- - Modify the existing `tenant_memberships`, `users`,
--   `local_credentials`, `tenants`, `organisations`, or `facilities`
--   tables (other than adding the back-relations implicitly via the
--   new foreign keys and adding the composite unique constraints on
--   `tenant_memberships` and `facilities`).
-- - Add any CASCADE behaviour. All foreign keys use RESTRICT.
-- - Add any RLS policy.
-- - Add any seed data.
-- - Implement cross-tenant Platform Super Admin authorisation.
-- - Implement Department or Care-Team scope levels.
--
-- Fail-closed migration behaviour:
-- - Existing tenant-scoped role assignments remain tenant-scoped
--   after this migration. Their `tenant_id` is backfilled from the
--   membership; their behaviour is unchanged.
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
-- Part 1: tenant_role_assignments scope columns (including tenant_id)
-- ---------------------------------------------------------------------------

-- AddColumn: tenant_role_assignments.tenant_id (initially nullable;
-- backfilled below, then set NOT NULL).
ALTER TABLE "tenant_role_assignments"
  ADD COLUMN "tenant_id" UUID;

-- AddColumn: tenant_role_assignments.scope_level
ALTER TABLE "tenant_role_assignments"
  ADD COLUMN "scope_level" VARCHAR(20) NOT NULL DEFAULT 'tenant';

-- AddColumn: tenant_role_assignments.scope_organisation_id
ALTER TABLE "tenant_role_assignments"
  ADD COLUMN "scope_organisation_id" UUID;

-- AddColumn: tenant_role_assignments.scope_facility_id
ALTER TABLE "tenant_role_assignments"
  ADD COLUMN "scope_facility_id" UUID;

-- Backfill: tenant_id from tenant_memberships.tenant_id via
-- tenant_membership_id. The join is performed in a single UPDATE
-- statement; the FROM clause provides the membership row's tenant_id.
UPDATE "tenant_role_assignments" AS tra
  SET "tenant_id" = tm."tenant_id"
  FROM "tenant_memberships" AS tm
  WHERE tra."tenant_membership_id" = tm."id";

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

-- Verify: no row remains with a NULL tenant_id. This is the
-- fail-closed backfill verification. If any row is still NULL,
-- the migration aborts with an exception (the migration is
-- applied inside a single transaction by Prisma migrate, so the
-- entire migration rolls back).
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "tenant_role_assignments" WHERE "tenant_id" IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Backfill verification failed: % rows in tenant_role_assignments have NULL tenant_id after backfill from tenant_memberships. The migration is aborted; investigate the orphaned role-assignment rows before re-running.', null_count
      USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- Set tenant_id NOT NULL after the backfill verification.
ALTER TABLE "tenant_role_assignments"
  ALTER COLUMN "tenant_id" SET NOT NULL;

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

-- AddForeignKey: tenant_role_assignments.tenant_id -> tenants.id
-- ON DELETE RESTRICT: deleting a Tenant that is referenced by a
-- role assignment is rejected. The application layer must delete
-- the role assignments first.
-- ON UPDATE RESTRICT: updating a Tenant's `id` while referenced is
-- rejected. In practice, IDs are immutable.
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id")
  REFERENCES "tenants" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- AddForeignKey: tenant_role_assignments.scope_organisation_id -> organisations.id
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

-- AddForeignKey: tenant_role_assignments.scope_facility_id -> facilities.id
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_scope_facility_id_fkey"
  FOREIGN KEY ("scope_facility_id")
  REFERENCES "facilities" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- CreateIndex: index on tenant_id for tenant-scoped reads.
CREATE INDEX "tenant_role_assignments_tenant_id_idx"
  ON "tenant_role_assignments"("tenant_id");

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
-- Part 2: composite unique constraints required for composite FKs
-- ---------------------------------------------------------------------------

-- CreateIndex: composite unique constraint on
-- tenant_memberships(id, tenant_id). This unique constraint is
-- required for the composite foreign key from tenant_role_assignments
-- to be valid in PostgreSQL. PostgreSQL requires that the referenced
-- columns of a foreign key be backed by a unique constraint or
-- primary key.
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_memberships_id_tenant_id_key"
  ON "tenant_memberships"("id", "tenant_id");

-- CreateIndex: composite unique constraint on
-- facilities(tenant_id, organisation_id, id). This unique constraint
-- is required for the composite foreign key from
-- tenant_role_assignments (scope_organisation_id, scope_facility_id,
-- tenant_id) to be valid in PostgreSQL.
CREATE UNIQUE INDEX IF NOT EXISTS "facilities_tenant_id_organisation_id_id_key"
  ON "facilities"("tenant_id", "organisation_id", "id");

-- The composite unique constraint on organisations(tenant_id, id)
-- already exists (added by the third canonical batch as
-- `organisations_tenant_id_id_key`). No action required here.

-- ---------------------------------------------------------------------------
-- Part 3: composite foreign keys on tenant_role_assignments
-- ---------------------------------------------------------------------------

-- AddCompositeForeignKey:
--   tenant_role_assignments(tenant_membership_id, tenant_id) ->
--   tenant_memberships(id, tenant_id)
-- This composite FK enforces at the database level that the
-- assignment's derived tenant_id matches the membership's tenant_id.
-- A SQL INSERT that supplies a mismatched tenant_id (i.e. a tenant_id
-- that does not match the membership's tenant_id) is rejected. This
-- is the structural enforcement of the invariant "tenantId is derived
-- server-side from TenantMembership; it must never be supplied
-- arbitrarily".
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_membership_tenant_id_fkey"
  FOREIGN KEY ("tenant_membership_id", "tenant_id")
  REFERENCES "tenant_memberships" ("id", "tenant_id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- AddCompositeForeignKey:
--   tenant_role_assignments(tenant_id, scope_organisation_id) ->
--   organisations(tenant_id, id)
-- This composite FK enforces at the database level that the
-- scope-organisation belongs to the assignment's tenant. Because
-- PostgreSQL treats a composite foreign key as unenforced when any
-- referencing column is NULL, this composite FK applies only to rows
-- where scope_organisation_id is non-null (i.e. organisation-scoped
-- and facility-scoped assignments). Tenant-scoped assignments (with
-- null scope_organisation_id) are not subject to this composite FK;
-- the single-column FK above already handles the null case.
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_tenant_organisation_id_fkey"
  FOREIGN KEY ("tenant_id", "scope_organisation_id")
  REFERENCES "organisations" ("tenant_id", "id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- AddCompositeForeignKey:
--   tenant_role_assignments(tenant_id, scope_organisation_id,
--   scope_facility_id) -> facilities(tenant_id, organisation_id, id)
-- This composite FK enforces at the database level that the
-- scope-facility belongs to the assignment's tenant and to the
-- scope-organisation. The composite FK applies only to rows where
-- both scope_organisation_id and scope_facility_id are non-null
-- (i.e. facility-scoped assignments).
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_tenant_organisation_facility_id_fkey"
  FOREIGN KEY ("tenant_id", "scope_organisation_id", "scope_facility_id")
  REFERENCES "facilities" ("tenant_id", "organisation_id", "id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------------
-- Part 4: auth_sessions active organisation and facility columns
-- ---------------------------------------------------------------------------

-- AddColumn: auth_sessions.active_organisation_id
ALTER TABLE "auth_sessions"
  ADD COLUMN "active_organisation_id" UUID;

-- AddColumn: auth_sessions.active_facility_id
ALTER TABLE "auth_sessions"
  ADD COLUMN "active_facility_id" UUID;

-- AddForeignKey: auth_sessions.active_organisation_id -> organisations.id
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

-- AddForeignKey: auth_sessions.active_facility_id -> facilities.id
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
--   auth_sessions(active_facility_id, active_organisation_id) ->
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
