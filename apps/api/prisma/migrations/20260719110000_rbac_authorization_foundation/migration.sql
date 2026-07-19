-- ---------------------------------------------------------------------------
-- Eighth canonical batch: RBAC authorization foundation migration.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and
-- CODING_STANDARDS.md §14 (Migration Review Requirements), this
-- migration is reviewed raw SQL. It is PostgreSQL-first and uses
-- features that Prisma 7 can express in the schema language; no
-- composite foreign keys are required for this batch.
--
-- Changes:
-- 1. Create the `tenant_role_assignments` table.
-- 2. Add a unique constraint on
--    `(tenant_membership_id, role_code)` to prevent duplicate role
--    assignments to the same membership.
-- 3. Add an index on `tenant_membership_id` for efficient
--    membership-role lookups (used by the authorization layer to
--    compute the permission union for a membership).
-- 4. Add an index on `role_code` for efficient reverse lookups
--    (e.g. "which memberships hold the Physician role?").
-- 5. Add a foreign key
--    `tenant_role_assignments.tenant_membership_id` →
--    `tenant_memberships.id`, with `ON DELETE RESTRICT` and
--    `ON UPDATE RESTRICT`. The restricted-delete behaviour prevents
--    silent privilege loss when a membership is repurposed: a
--    membership with active role assignments cannot be deleted until
--    the assignments are deleted first.
--
-- The migration does NOT:
-- - Add a `role` column to `tenant_memberships`. The simplified
--   `owner`/`member`/`viewer` proposal in
--   `CURRENT_IMPLEMENTATION_HANDOVER.md` is explicitly rejected; it
--   conflicts with the ratified fourteen-role catalogue in
--   PRODUCT_BIBLE.md Section 20.2 and ROLES_AND_PERMISSIONS.md
--   Section 1.2.
-- - Insert any rows. Existing memberships remain without role
--   assignments. This is the fail-closed posture: a membership with
--   no assignments has no permissions. The development bootstrap
--   command is updated to explicitly assign R13 System
--   Administrator to the development membership.
-- - Add any role or permission context column to `auth_sessions`.
-- - Add any RLS policy.
-- - Add any seed data.
-- - Modify the existing `tenant_memberships`, `auth_sessions`,
--   `users`, `local_credentials`, `tenants`, `organisations`, or
--   `facilities` tables.
-- - Add any CASCADE behaviour. The foreign key uses RESTRICT.
--
-- Fail-closed migration behaviour:
-- - Existing memberships without role assignments remain without
--   permissions after this migration. The role-permission matrix
--   in `packages/domain/src/authorization/role-permissions.ts`
--   returns an empty permission set for a membership with no role
--   assignments. The authorization layer is default-deny.
-- - Operators with existing development databases must re-run the
--   development bootstrap command (or otherwise explicitly insert
--   `tenant_role_assignments` rows) after applying this migration
--   to grant roles to existing memberships.
--
-- This migration is idempotent only when run against a database
-- that has executed the prior migrations
-- (`20260718170628_tenancy_foundation`,
-- `20260718194955_identity_session_foundation`, and
-- `20260718220000_session_tenant_context`). It is not idempotent
-- against an arbitrary database state; the Prisma migration runner
-- applies migrations in order, so this is acceptable.
-- ---------------------------------------------------------------------------

-- CreateTable: tenant_role_assignments
CREATE TABLE "tenant_role_assignments" (
    "id" UUID NOT NULL,
    "tenant_membership_id" UUID NOT NULL,
    "role_code" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenant_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on (tenant_membership_id, role_code).
-- This is the persistence invariant that prevents duplicate role
-- assignments to the same membership. A duplicate insert raises
-- SQLSTATE 23505 (unique_violation), which Prisma surfaces as a
-- PrismaClientKnownRequestError with code P2002; the API exception
-- layer translates that to a 409 Conflict.
CREATE UNIQUE INDEX "tenant_role_assignments_membership_role_key"
  ON "tenant_role_assignments"("tenant_membership_id", "role_code");

-- CreateIndex: index on tenant_membership_id for efficient
-- membership-role lookups. The authorization layer loads a
-- membership's role assignments to compute the permission union;
-- this index makes that lookup O(log n) rather than O(n).
CREATE INDEX "tenant_role_assignments_tenant_membership_id_idx"
  ON "tenant_role_assignments"("tenant_membership_id");

-- CreateIndex: index on role_code for efficient reverse lookups
-- (e.g. "which memberships hold the Physician role?"). Not used by
-- the authorization layer's hot path, but useful for administrative
-- queries in future batches.
CREATE INDEX "tenant_role_assignments_role_code_idx"
  ON "tenant_role_assignments"("role_code");

-- AddForeignKey:
--   tenant_role_assignments.tenant_membership_id → tenant_memberships.id
-- ON DELETE RESTRICT: deleting a TenantMembership that is referenced
-- by a TenantRoleAssignment is rejected. The application layer must
-- delete the role assignments first. This prevents silent privilege
-- loss when a membership is repurposed.
-- ON UPDATE RESTRICT: updating a TenantMembership's `id` while
-- referenced is rejected. In practice, IDs are immutable.
ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_tenant_membership_id_fkey"
  FOREIGN KEY ("tenant_membership_id")
  REFERENCES "tenant_memberships" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;
