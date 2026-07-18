-- ---------------------------------------------------------------------------
-- Fifth canonical batch: session tenant context migration.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and
-- CODING_STANDARDS.md §14 (Migration Review Requirements), this
-- migration is reviewed. It is PostgreSQL-first and uses features
-- that Prisma 7 cannot express in the schema language (composite
-- foreign keys).
--
-- Changes:
-- 1. Add `active_tenant_membership_id` nullable UUID column to
--    `auth_sessions`. The column is nullable: `null` means "no
--    active Tenant context"; the session remains valid.
-- 2. Add a composite unique constraint on
--    `tenant_memberships(id, user_id)`. This unique constraint is
--    required for the composite foreign key to be valid in
--    PostgreSQL.
-- 3. Add a normal foreign key:
--    `auth_sessions.active_tenant_membership_id` →
--    `tenant_memberships.id`, with `ON DELETE RESTRICT` and
--    `ON UPDATE RESTRICT`.
-- 4. Add a reviewed composite foreign key:
--    `auth_sessions(active_tenant_membership_id, user_id)` →
--    `tenant_memberships(id, user_id)`, with
--    `ON DELETE RESTRICT` and `ON UPDATE RESTRICT`. The composite
--    FK enforces at the database level that a session cannot
--    reference a membership owned by a different user. Without this
--    constraint, a buggy or malicious application-layer call could
--    set a session's active context to another user's membership.
-- 5. Add an index on `auth_sessions.active_tenant_membership_id`
--    for efficient reverse lookups (e.g. "which sessions have
--    selected this membership?").
--
-- The migration does NOT:
-- - Add any active Organisation or Facility context column. The
--   fifth batch introduces active Tenant context only.
-- - Add any role or permission context column.
-- - Add any raw Tenant slug, display name, or denormalised Tenant
--   field to `auth_sessions`. The session references the Tenant
--   transitively through the selected TenantMembership.
-- - Add any CASCADE behaviour. All foreign keys use RESTRICT.
-- - Add any RLS policy.
-- - Add any seed data.
-- - Add any new table. The nullable column on `auth_sessions` is
--   the simplest correct representation; no separate context
--   table is required.
--
-- This migration is idempotent only when run against a database
-- that has executed the prior migrations
-- (`20260718170628_tenancy_foundation` and
-- `20260718194955_identity_session_foundation`). It is not
-- idempotent against an arbitrary database state; the Prisma
-- migration runner applies migrations in order, so this is
-- acceptable.
-- ---------------------------------------------------------------------------

-- AddColumn: auth_sessions.active_tenant_membership_id
ALTER TABLE "auth_sessions" ADD COLUMN "active_tenant_membership_id" UUID;

-- CreateIndex: composite unique constraint on tenant_memberships(id, user_id).
-- This unique constraint is required for the composite foreign key
-- added below to be valid in PostgreSQL. PostgreSQL requires that
-- the referenced columns of a foreign key be backed by a unique
-- constraint or primary key.
CREATE UNIQUE INDEX "tenant_memberships_id_user_id_key"
  ON "tenant_memberships"("id", "user_id");

-- CreateIndex: index on auth_sessions.active_tenant_membership_id.
-- Used for efficient reverse lookups (e.g. finding all sessions that
-- have selected a given membership, useful for revocation cascades
-- when a membership is suspended).
CREATE INDEX "auth_sessions_active_tenant_membership_id_idx"
  ON "auth_sessions"("active_tenant_membership_id");

-- AddForeignKey: auth_sessions.active_tenant_membership_id → tenant_memberships.id.
-- ON DELETE RESTRICT: deleting a TenantMembership that is referenced
-- by an active session is rejected. The application layer must clear
-- the session's active context before deleting the membership.
-- ON UPDATE RESTRICT: updating a TenantMembership's `id` while
-- referenced is rejected. In practice, IDs are immutable.
ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_active_tenant_membership_id_fkey"
  FOREIGN KEY ("active_tenant_membership_id")
  REFERENCES "tenant_memberships" ("id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------------
-- Reviewed raw SQL supplement (per ADR-012 §1.4 safeguard 3 and
-- CODING_STANDARDS.md §14).
--
-- Prisma 7 cannot express a composite foreign key in its schema
-- language. The composite foreign key below is required by the
-- fifth canonical batch specification: it enforces that a session
-- cannot reference another user's membership. Without this
-- constraint, a buggy or malicious application-layer call could
-- set a session's active context to a TenantMembership owned by a
-- different user.
--
-- The composite foreign key references the unique constraint
-- `tenant_memberships_id_user_id_key` (created above) on
-- `tenant_memberships(id, user_id)`. The unique constraint is
-- required for the composite foreign key to be valid.
--
-- The constraint uses ON DELETE RESTRICT and ON UPDATE RESTRICT to
-- match the restricted-delete behaviour of the single-column
-- foreign key above. Deleting a TenantMembership that still has
-- sessions referencing it is rejected; updating a TenantMembership's
-- `id` or `user_id` while sessions still reference it is rejected.
--
-- This migration is idempotent only when run against a database
-- that has just executed the Prisma-generated section above.
-- ---------------------------------------------------------------------------

-- AddCompositeForeignKey:
--   auth_sessions(active_tenant_membership_id, user_id) → tenant_memberships(id, user_id)
ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_active_tenant_membership_id_user_id_fkey"
  FOREIGN KEY ("active_tenant_membership_id", "user_id")
  REFERENCES "tenant_memberships" ("id", "user_id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;
