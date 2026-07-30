-- ---------------------------------------------------------------------------
-- Stage 1A: Appointments persistence foundation.
--
-- This migration adds the minimum persistence infrastructure required for a
-- future read-only "Today's Appointments" feature for the R09 Clinic
-- Administrator role.
--
-- Changes:
-- 1. Add a nullable `timezone` column to `facilities` to store the
--    facility's IANA timezone identifier (e.g. 'Asia/Baghdad').
--    Null means timezone is unresolved and must fall back to a higher-level
--    default (tenant.identity.timezone or UTC). No backfill is performed;
--    existing facilities retain NULL until explicitly configured.
-- 2. Add `AppointmentStatus` enum with the canonical lifecycle values
--    from download/docs/07_MODULES/APPOINTMENTS.md Section 1:
--    booked, confirmed, arrived, in_progress, completed, cancelled, no_show.
-- 3. Add `appointments` table with tenant, organisation, facility scoping,
--    logical patient and provider identifiers, scheduled timestamps, status,
--    and type code. No foreign keys are created to Patient or Workforce
--    module tables; those modules own their own identity.
--
-- All timestamps use PostgreSQL timestamptz for UTC storage.
-- All indexes follow the repository naming convention (table_column_idx).
-- ---------------------------------------------------------------------------

-- 1. Add facility timezone column.
-- No backfill: existing facilities retain NULL until explicitly configured.

ALTER TABLE "facilities" ADD COLUMN "timezone" VARCHAR(60);

CREATE INDEX "facilities_timezone_idx" ON "facilities" ("timezone");

-- 2. Create AppointmentStatus enum.

CREATE TYPE "AppointmentStatus" AS ENUM (
  'booked',
  'confirmed',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

-- 3. Create appointments table.

CREATE TABLE "appointments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "facility_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "scheduled_start" TIMESTAMPTZ NOT NULL,
  "scheduled_end" TIMESTAMPTZ NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'booked',
  "type_code" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- Indexes for tenant, organisation, facility, and scheduled-start filtering.
-- These support the "Today’s Appointments" facility-day read query.

CREATE INDEX "appointments_tenant_id_idx" ON "appointments" ("tenant_id");
CREATE INDEX "appointments_tenant_id_organisation_id_idx" ON "appointments" ("tenant_id", "organisation_id");
CREATE INDEX "appointments_tenant_id_facility_id_idx" ON "appointments" ("tenant_id", "facility_id");
CREATE INDEX "appointments_tenant_id_scheduled_start_idx" ON "appointments" ("tenant_id", "scheduled_start");
CREATE INDEX "appointments_tenant_id_facility_id_scheduled_start_idx" ON "appointments" ("tenant_id", "facility_id", "scheduled_start");
