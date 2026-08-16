-- ---------------------------------------------------------------------------
-- BC10: User→Provider Identity Binding Foundation
--
-- This migration adds the minimum persistence infrastructure required for
-- BC10 to own the binding between a platform User (an authenticated
-- identity) and a Provider (a clinical-capacity identity). It is the
-- foundation for the server-side clinical-actor resolver that lets a
-- clinical operation obtain a TRUSTED Provider identity from
-- (tenant_id, user_id) alone, without trusting any caller-supplied
-- Provider identifier.
--
-- Ratified cardinality (one-to-one INSIDE each tenant):
--   - one ACTIVE Provider per User per tenant;
--   - one ACTIVE User per Provider per tenant;
--   - the same global User may bind to different Providers in different
--     tenants (uniqueness is per-tenant, not global);
--   - NO automatic or backfill binding. Historical Users/Providers remain
--     valid without a binding.
--
-- Lifecycle:
--   - An active binding has revoked_at IS NULL.
--   - Revoking sets revoked_at; a revoked binding is never returned by the
--     active-resolution path. Historical revoked bindings are preserved.
--   - Re-binding after revocation is allowed.
--
-- It also adds the nullable, trusted `clinical_author_role` column to
-- providers, using the canonical ClinicalNoteAuthorRole catalogue
-- (Physician, Nurse, Pharmacist, Therapist, Midlevel, Student) per
-- ENUMS.md §4.2. The clinical author role is a TRUSTED attribute set by
-- workforce administration; it is NEVER derived from the platform
-- roleCode (R01–R14). `student` is supported, but interactive Student
-- authoring is deferred to BC03.
--
-- Forward-only and additive: no DROP, no TRUNCATE, no reset, no backfill,
-- no historical migration edits. Existing providers/users rows remain
-- valid; clinical_author_role defaults to NULL.
--
-- Database Integrity Constraints:
--   - Simple FK: user_provider_bindings.user_id → users.id
--     The User is global, so no tenant composite FK applies to user_id.
--   - Simple FK: user_provider_bindings.provider_id → providers.id
--     (Prisma convenience).
--   - Composite FK: (tenant_id, provider_id) → providers(tenant_id, id)
--     Ensures the Provider belongs to the same tenant as the binding.
--   - Partial unique index on (tenant_id, user_id) WHERE revoked_at IS NULL:
--     enforces one ACTIVE binding per user per tenant.
--   - Partial unique index on (tenant_id, provider_id) WHERE revoked_at IS NULL:
--     enforces one ACTIVE binding per provider per tenant.
--
-- All timestamps use PostgreSQL timestamptz for UTC storage.
-- All indexes follow the repository naming convention (table_column_idx).
-- ---------------------------------------------------------------------------

-- 1. Create ClinicalNoteAuthorRole enum (canonical BC03 catalogue, referenced
--    by BC10 as a trusted Provider attribute).

CREATE TYPE "ClinicalNoteAuthorRole" AS ENUM (
  'physician',
  'nurse',
  'pharmacist',
  'therapist',
  'midlevel',
  'student'
);

-- 2. Add nullable trusted clinical_author_role to providers.
--    Additive: existing rows default to NULL (no clinical author role configured).
--    A NULL clinicalAuthorRole means the Provider may not author clinical notes
--    that require a clinical author role (R05 Allied Health may author only
--    when its bound Provider has a valid, non-null clinicalAuthorRole).

ALTER TABLE "providers"
  ADD COLUMN "clinical_author_role" "ClinicalNoteAuthorRole";

-- Index to support filtering providers by clinical author role within a tenant.
CREATE INDEX "providers_tenant_id_clinical_author_role_idx"
  ON "providers" ("tenant_id", "clinical_author_role");

-- 3. Create user_provider_bindings table.

CREATE TABLE "user_provider_bindings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "activated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_provider_bindings_pkey" PRIMARY KEY ("id")
);

-- Simple FK: user must exist (Prisma convenience). ON DELETE RESTRICT so a
-- User with an active binding cannot be silently deleted.
ALTER TABLE "user_provider_bindings"
  ADD CONSTRAINT "user_provider_bindings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Simple FK: provider must exist (Prisma convenience).
ALTER TABLE "user_provider_bindings"
  ADD CONSTRAINT "user_provider_bindings_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Composite FK: tenant integrity for provider.
-- Ensures the provider's tenant matches the binding's tenant. A binding cannot
-- reference a provider that belongs to a different tenant.
ALTER TABLE "user_provider_bindings"
  ADD CONSTRAINT "user_provider_bindings_tenant_provider_fkey"
  FOREIGN KEY ("tenant_id", "provider_id") REFERENCES "providers"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Partial unique index: only one ACTIVE (non-revoked) binding per user per
-- tenant. Historical revoked bindings are preserved for audit; re-binding
-- after revocation is allowed. This enforces "one active Provider per User
-- per tenant".
CREATE UNIQUE INDEX "user_provider_bindings_tenant_user_active_key"
  ON "user_provider_bindings" ("tenant_id", "user_id")
  WHERE "revoked_at" IS NULL;

-- Partial unique index: only one ACTIVE (non-revoked) binding per provider
-- per tenant. This enforces "one active User per Provider per tenant".
CREATE UNIQUE INDEX "user_provider_bindings_tenant_provider_active_key"
  ON "user_provider_bindings" ("tenant_id", "provider_id")
  WHERE "revoked_at" IS NULL;

-- Index for tenant-scoped queries.
CREATE INDEX "user_provider_bindings_tenant_id_idx"
  ON "user_provider_bindings" ("tenant_id");

-- Index for finding the active binding for a user within a tenant.
CREATE INDEX "user_provider_bindings_tenant_id_user_id_idx"
  ON "user_provider_bindings" ("tenant_id", "user_id");

-- Index for finding bindings for a provider within a tenant.
CREATE INDEX "user_provider_bindings_tenant_id_provider_id_idx"
  ON "user_provider_bindings" ("tenant_id", "provider_id");

-- Index for finding active bindings for a user (where revoked_at IS NULL).
CREATE INDEX "user_provider_bindings_tenant_user_revoked_idx"
  ON "user_provider_bindings" ("tenant_id", "user_id", "revoked_at");
