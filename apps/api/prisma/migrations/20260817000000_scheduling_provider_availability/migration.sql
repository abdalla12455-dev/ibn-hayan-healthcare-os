-- Scheduling Completion Milestone: Provider Availability / Schedules
--
-- BC10 Workforce owns provider schedule/availability data (per
-- DOCTORS.md §2.2 and APPOINTMENTS.md §2.1: "Workforce publishes
-- provider availability changes that Appointments consumes").
--
-- This migration creates the `provider_schedules` table, the minimum
-- canonical weekly working-hours model per provider per facility,
-- required for appointment eligibility enforcement (BR-BC06-ADM-002:
-- "Practitioner must be available at requested time; if availability
-- cannot be verified, block booking").
--
-- Time semantics:
-- - `start_time` and `end_time` are local time-of-day values (TIME
--   without time zone) interpreted in the facility's configured IANA
--   timezone (facilities.timezone). A facility with a null timezone
--   is a configuration-required state; availability checks fail closed.
-- - `day_of_week` follows ISO 8601: 1 = Monday … 7 = Sunday.
--
-- Forward-only, additive. No existing table is modified, no data is
-- dropped or rewritten, and no already-merged migration is touched.
-- Existing Patient, Appointment, Encounter, Provider, Consent, and
-- Workforce data remain valid.

-- 1. Create the `provider_schedules` table.
CREATE TABLE "provider_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "facility_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "start_time" TIME NOT NULL,
  "end_time" TIME NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "provider_schedules_pkey" PRIMARY KEY ("id")
);

-- 2. CHECK constraints for data integrity.
-- ISO 8601 day of week: 1 (Monday) through 7 (Sunday).
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_day_of_week_check"
  CHECK ("day_of_week" >= 1 AND "day_of_week" <= 7);

-- End time must be strictly after start time (no zero-length or
-- backwards shifts).
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_time_order_check"
  CHECK ("end_time" > "start_time");

-- 3. Foreign keys.
-- Provider FK (simple). onDelete: CASCADE — if a provider is deleted,
-- their schedule entries are removed. This matches the Prisma relation
-- definition and does not affect appointment history (appointments
-- reference providers by logical UUID, not FK).
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- Facility FK (simple). onDelete: CASCADE — if a facility is deleted,
-- its schedule entries are removed.
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_facility_id_fkey"
  FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- 4. Indexes for the canonical query patterns.
-- Tenant isolation filter.
CREATE INDEX "provider_schedules_tenant_id_idx"
  ON "provider_schedules"("tenant_id");

-- Provider + facility lookup (find all schedule entries for a provider
-- at a facility).
CREATE INDEX "provider_schedules_tenant_provider_facility_idx"
  ON "provider_schedules"("tenant_id", "provider_id", "facility_id");

-- Availability lookup: the hot path used by booking/rescheduling to
-- check whether a provider is available on a specific day of week at
-- a facility. The column order (tenant, facility, provider, day)
-- matches the availability-check query's WHERE clause.
CREATE INDEX "provider_schedules_availability_lookup_idx"
  ON "provider_schedules"("tenant_id", "facility_id", "provider_id", "day_of_week");
