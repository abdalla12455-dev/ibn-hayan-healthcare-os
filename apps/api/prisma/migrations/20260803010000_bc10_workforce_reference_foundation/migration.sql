-- ---------------------------------------------------------------------------
-- BC10: Workforce Reference Foundation
--
-- This migration adds the minimum persistence infrastructure required for the
-- Workforce bounded context (BC10) to serve as a canonical reference foundation
-- for other bounded contexts, especially Appointments.
--
-- Per download/docs/07_MODULES/DOCTORS.md Section 4.1:
-- - Provider and staff data is tenant-isolated by default
-- - A provider registered in tenant A is not visible to tenant B
--
-- Per DOCTORS.md Section 4.2:
-- - A provider's schedule may span multiple facilities
-- - The appointment context must verify that the provider is assigned
--   to the requested facility
--
-- Per DOCTORS.md Section 11:
-- - Lifecycle stages: candidate, onboarded, active, suspended, separated
-- - Active providers are fully credentialed and authorized for clinical work
-- - Eligibility for scheduling requires active status AND valid facility assignment
--
-- Changes:
-- 1. Create ProviderStatus enum with lifecycle values.
-- 2. Create providers table with tenant scoping.
-- 3. Create provider_facility_assignments table for multi-facility support.
--
-- All timestamps use PostgreSQL timestamptz for UTC storage.
-- All indexes follow the repository naming convention (table_column_idx).
-- ---------------------------------------------------------------------------

-- 1. Create ProviderStatus enum.

CREATE TYPE "ProviderStatus" AS ENUM (
  'candidate',
  'onboarded',
  'active',
  'suspended',
  'separated'
);

-- 2. Create providers table.

CREATE TABLE "providers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "status" "ProviderStatus" NOT NULL DEFAULT 'candidate',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- Index for tenant-scoped queries (findById, existsInTenant).
CREATE INDEX "providers_tenant_id_idx" ON "providers" ("tenant_id");

-- Index for status filtering (eligible providers with active status).
CREATE INDEX "providers_tenant_id_status_idx" ON "providers" ("tenant_id", "status");

-- 3. Create provider_facility_assignments table.

CREATE TABLE "provider_facility_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "facility_id" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ,
  CONSTRAINT "provider_facility_assignments_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: a provider can only have one active assignment per facility.
-- A revoked assignment is kept for audit purposes.
CREATE UNIQUE INDEX "provider_facility_assignments_provider_id_facility_id_key"
  ON "provider_facility_assignments" ("provider_id", "facility_id");

-- Foreign key: provider must exist and be deleted only when no assignments remain.
ALTER TABLE "provider_facility_assignments"
  ADD CONSTRAINT "provider_facility_assignments_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Foreign key: facility must exist and be deleted only when no assignments reference it.
ALTER TABLE "provider_facility_assignments"
  ADD CONSTRAINT "provider_facility_assignments_facility_id_fkey"
  FOREIGN KEY ("facility_id") REFERENCES "facilities"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Index for tenant-scoped queries.
CREATE INDEX "provider_facility_assignments_tenant_id_idx"
  ON "provider_facility_assignments" ("tenant_id");

-- Index for finding all assignments for a provider.
CREATE INDEX "provider_facility_assignments_tenant_id_provider_id_idx"
  ON "provider_facility_assignments" ("tenant_id", "provider_id");

-- Index for finding all providers assigned to a facility.
CREATE INDEX "provider_facility_assignments_tenant_id_facility_id_idx"
  ON "provider_facility_assignments" ("tenant_id", "facility_id");

-- Index for finding active assignments for a provider (where revoked_at IS NULL).
CREATE INDEX "provider_facility_assignments_tenant_provider_revoked_idx"
  ON "provider_facility_assignments" ("tenant_id", "provider_id", "revoked_at");
