-- ---------------------------------------------------------------------------
-- BC01: Patient Reference Foundation
--
-- This migration adds the minimum persistence infrastructure required for the
-- Patient bounded context (BC01) to serve as a canonical reference foundation
-- for other bounded contexts, especially Appointments.
--
-- Per download/docs/07_MODULES/PATIENTS.md:
-- - Patient records are tenant-isolated by default
-- - A patient created in tenant A is not visible to tenant B
-- - Cross-facility identity resolution means a patient identity is visible
--   across all facilities within a tenant
-- - MRN (Medical Record Number) is tenant-wide and unique
--
-- Changes:
-- 1. Create PatientStatus enum with lifecycle values: active, inactive, archived.
-- 2. Create patients table with tenant scoping and MRN uniqueness.
--
-- All timestamps use PostgreSQL timestamptz for UTC storage.
-- All indexes follow the repository naming convention (table_column_idx).
-- ---------------------------------------------------------------------------

-- 1. Create PatientStatus enum.

CREATE TYPE "PatientStatus" AS ENUM (
  'active',
  'inactive',
  'archived'
);

-- 2. Create patients table.

CREATE TABLE "patients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "medical_record_number" VARCHAR(50) NOT NULL,
  "status" "PatientStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: MRN is tenant-wide (not globally unique).
-- The same MRN may exist in different tenants.
CREATE UNIQUE INDEX "patients_tenant_id_medical_record_number_key"
  ON "patients" ("tenant_id", "medical_record_number");

-- Index for tenant-scoped queries (findById, existsInTenant).
CREATE INDEX "patients_tenant_id_idx" ON "patients" ("tenant_id");
