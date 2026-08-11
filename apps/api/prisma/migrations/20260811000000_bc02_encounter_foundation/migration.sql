-- ---------------------------------------------------------------------------
-- BC02: Encounter Foundation (Stage 2A)
--
-- This migration adds the minimum persistence infrastructure required for
-- the Encounter bounded context (BC02, M02 Encounter / Clinical) to
-- represent and safely progress a real clinical encounter.
--
-- The Encounter is the platform's central organizing entity for a single
-- clinical event. It is owned by BC02 and references — but does NOT
-- foreign-key to — the Patient (BC01), Workforce/Provider (BC10), and
-- Scheduling/Appointment (BC06) bounded contexts. Those contexts own
-- their own authoritative state; this table holds logical identifiers
-- only, per SYSTEM_ARCHITECTURE §7.5 and MODULE_ARCHITECTURE §11.3
-- (state isolation).
--
-- Per download/docs/03_DOMAIN/ENUMS.md §4.1:
-- - EncounterStatus (Closed): planned, arrived, in_progress, on_leave,
--   finished, cancelled
-- - EncounterType (Open-with-Council): outpatient, inpatient, emergency,
--   telehealth, home_health, day_care
-- - EncounterPriority (Closed): routine, urgent, emergency
--
-- Per download/docs/03_DOMAIN/STATUS_CODES.md §10.2 (Encounter Transition
-- Map), the canonical lifecycle is enforced at the application/repository
-- boundary via a conditional UPDATE ... WHERE status IN (...), NOT by a
-- database CHECK constraint. The database stores the status; the
-- repository enforces permitted source → target transitions atomically.
--
-- State isolation:
-- patientId, providerId, and appointmentId are stored as UUID references
-- WITHOUT relational foreign keys. This preserves bounded-context
-- ownership: BC02 does not mutate or constrain BC01/BC10/BC06-owned
-- state at the database level. The application layer validates these
-- references via the owning modules' repositories (PatientRepository,
-- ProviderRepository, AppointmentRepository) before persisting an
-- encounter.
--
-- Cardinality:
-- appointmentId is nullable (emergency/walk-in encounters have no
-- appointment). When present, a partial unique index ensures one
-- encounter per appointment (one appointment creates at most one
-- encounter). When null (no appointment), no uniqueness is enforced.
--
-- Scope:
-- The composite unique constraint (tenant_id, organisation_id,
-- facility_id, id) is consistent with the existing Provider model's
-- (tenant_id, id) pattern and enables scoped lookups.
--
-- All timestamps use PostgreSQL timestamptz for UTC storage.
-- All indexes follow the repository naming convention (table_column_idx).
--
-- This migration is forward-only and non-destructive. It creates new
-- objects only; it does not DROP, TRUNCATE, or modify any existing
-- table, enum, index, or constraint. It does not backfill encounters
-- for historical appointments.
-- ---------------------------------------------------------------------------

-- 1. Create EncounterStatus enum.

CREATE TYPE "EncounterStatus" AS ENUM (
  'planned',
  'arrived',
  'in_progress',
  'on_leave',
  'finished',
  'cancelled'
);

-- 2. Create EncounterType enum.

CREATE TYPE "EncounterType" AS ENUM (
  'outpatient',
  'inpatient',
  'emergency',
  'telehealth',
  'home_health',
  'day_care'
);

-- 3. Create EncounterPriority enum.

CREATE TYPE "EncounterPriority" AS ENUM (
  'routine',
  'urgent',
  'emergency'
);

-- 4. Create encounters table.

CREATE TABLE "encounters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "facility_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "appointment_id" UUID,
  "encounter_type" "EncounterType" NOT NULL DEFAULT 'outpatient',
  "status" "EncounterStatus" NOT NULL DEFAULT 'planned',
  "priority" "EncounterPriority" NOT NULL DEFAULT 'routine',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: composite (tenant_id, organisation_id, facility_id, id)
-- for scoped lookups, consistent with the Provider model's (tenant_id, id) pattern.
CREATE UNIQUE INDEX "encounters_tenant_org_facility_id_key"
  ON "encounters" ("tenant_id", "organisation_id", "facility_id", "id");

-- Partial unique index: one encounter per appointment.
-- appointment_id is nullable (emergency/walk-in encounters have no appointment).
-- When NOT NULL, the partial unique index ensures at most one encounter per
-- appointment within a tenant. This is the database-level enforcement of the
-- one-appointment-creates-at-most-one-encounter cardinality (APPOINTMENTS.md
-- §10.1). When NULL (no appointment), no uniqueness is enforced.
CREATE UNIQUE INDEX "encounters_tenant_id_appointment_id_key"
  ON "encounters" ("tenant_id", "appointment_id")
  WHERE "appointment_id" IS NOT NULL;

-- Index for tenant-scoped queries (findById, scoped transitions).
CREATE INDEX "encounters_tenant_id_idx" ON "encounters" ("tenant_id");

-- Index for tenant + organisation scoped queries.
CREATE INDEX "encounters_tenant_id_organisation_id_idx"
  ON "encounters" ("tenant_id", "organisation_id");

-- Index for tenant + facility scoped queries (the primary operational scope).
CREATE INDEX "encounters_tenant_id_facility_id_idx"
  ON "encounters" ("tenant_id", "facility_id");

-- Index for finding all encounters for a patient within a tenant.
CREATE INDEX "encounters_tenant_id_patient_id_idx"
  ON "encounters" ("tenant_id", "patient_id");

-- Index for finding all encounters for a provider within a tenant.
CREATE INDEX "encounters_tenant_id_provider_id_idx"
  ON "encounters" ("tenant_id", "provider_id");

-- Index for finding encounters by appointment within a tenant.
CREATE INDEX "encounters_tenant_id_appointment_id_idx"
  ON "encounters" ("tenant_id", "appointment_id");

-- Index for status filtering within a facility (operational dashboards).
CREATE INDEX "encounters_tenant_id_facility_id_status_idx"
  ON "encounters" ("tenant_id", "facility_id", "status");
