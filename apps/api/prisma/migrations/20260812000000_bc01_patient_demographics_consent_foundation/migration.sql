-- BC01 Patient Demographics / Registration / Consent Foundation
--
-- Forward-only, non-destructive migration that extends the minimal
-- Patient reference foundation into a usable patient-registration and
-- treatment-consent vertical slice. Per the architecture gate:
--
-- - All new demographic columns on `patients` are NULLABLE so that
--   existing minimal Patient rows remain valid (architecture gate 24).
-- - The `PatientStatus` enum is expanded ADDITIVELY with `deceased` and
--   `transferred_out` (no value removed; forward-only expansion).
-- - New `PatientSex`, `PatientGenderIdentity`, `PatientIdentifierType`,
--   `ConsentType`, `ConsentStatus`, `ConsentScope`, `ConsentDuration`,
--   and `ConsentCaptureMethod` enums are created.
-- - `patient_identifiers` and `patient_consents` tables are created with
--   foreign keys to `patients` (within BC01, an FK to Patient is
--   permitted — same bounded context).
-- - Deterministic duplicate prevention uses partial unique indexes
--   (NationalID/Passport identifier uniqueness; one-active-treatment-
--   consent uniqueness) written as raw SQL because Prisma 7 cannot
--   express partial unique indexes in the schema language.
-- - No DROP, no TRUNCATE, no destructive type rewrite, no backfill of
--   demographics for historical rows.

-- 1. Expand the PatientStatus enum with the canonical `deceased` and
--    `transferred_out` values. ALTER TYPE ... ADD VALUE is
--    non-transactional in PostgreSQL for enum types but is forward-only
--    and additive; existing rows remain valid because no value is removed.
ALTER TYPE "PatientStatus" ADD VALUE IF NOT EXISTS 'deceased';
ALTER TYPE "PatientStatus" ADD VALUE IF NOT EXISTS 'transferred_out';

-- 2. Create the new enums.
CREATE TYPE "PatientSex" AS ENUM (
  'male',
  'female',
  'intersex',
  'unknown',
  'not_declared'
);

CREATE TYPE "PatientGenderIdentity" AS ENUM (
  'male',
  'female',
  'transgender_male',
  'transgender_female',
  'non_binary',
  'prefer_not_to_say',
  'other'
);

CREATE TYPE "PatientIdentifierType" AS ENUM (
  'national_id',
  'passport',
  'medical_record_number',
  'insurance_number',
  'driver_licence'
);

CREATE TYPE "ConsentType" AS ENUM (
  'treatment',
  'information_disclosure',
  'research',
  'marketing',
  'data_sharing'
);

CREATE TYPE "ConsentStatus" AS ENUM (
  'granted',
  'withdrawn',
  'pending',
  'expired'
);

CREATE TYPE "ConsentScope" AS ENUM (
  'general',
  'specific',
  'emergency'
);

CREATE TYPE "ConsentDuration" AS ENUM (
  'indefinite',
  'fixed_term',
  'single_encounter'
);

CREATE TYPE "ConsentCaptureMethod" AS ENUM (
  'in_person',
  'written',
  'verbal',
  'electronic',
  'guardian_authorization'
);

-- 3. Add the nullable demographic columns to the `patients` table. All
--    are nullable so historical minimal Patient rows remain valid.
ALTER TABLE "patients" ADD COLUMN "legal_given_name" VARCHAR(100),
  ADD COLUMN "legal_middle_name" VARCHAR(100),
  ADD COLUMN "legal_family_name" VARCHAR(100),
  ADD COLUMN "preferred_name" VARCHAR(100),
  ADD COLUMN "date_of_birth" DATE,
  ADD COLUMN "sex" "PatientSex",
  ADD COLUMN "gender_identity" "PatientGenderIdentity",
  ADD COLUMN "gender_identity_detail" VARCHAR(100);

-- 4. Indexes on the demographic columns for bounded name-prefix search
--    (architecture gate 16). Tenant-scoped.
CREATE INDEX "patients_tenant_id_legal_family_name_idx"
  ON "patients" ("tenant_id", "legal_family_name");
CREATE INDEX "patients_tenant_id_legal_given_name_idx"
  ON "patients" ("tenant_id", "legal_given_name");

-- 5. Create the `patient_identifiers` table.
CREATE TABLE "patient_identifiers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "type" "PatientIdentifierType" NOT NULL,
  "normalized_value" VARCHAR(100) NOT NULL,
  "issuing_country" VARCHAR(2),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_identifiers_pkey" PRIMARY KEY ("id")
);

-- Simple FK to patients (within BC01, an FK to Patient is permitted).
ALTER TABLE "patient_identifiers"
  ADD CONSTRAINT "patient_identifiers_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Indexes for tenant-scoped and patient-scoped queries.
CREATE INDEX "patient_identifiers_tenant_id_idx"
  ON "patient_identifiers" ("tenant_id");
CREATE INDEX "patient_identifiers_tenant_id_patient_id_idx"
  ON "patient_identifiers" ("tenant_id", "patient_id");
CREATE INDEX "patient_identifiers_tenant_type_value_idx"
  ON "patient_identifiers" ("tenant_id", "type", "normalized_value");

-- Deterministic duplicate prevention (architecture gate 6H):
-- NationalID and Passport are deterministic dedup keys. A partial unique
-- index on (tenant_id, type, normalized_value) WHERE type IN
-- ('national_id', 'passport') ensures at most one of each per tenant.
-- InsuranceNumber and DriverLicence are NOT dedup keys in this stage.
CREATE UNIQUE INDEX "patient_identifiers_tenant_type_value_key"
  ON "patient_identifiers" ("tenant_id", "type", "normalized_value")
  WHERE "type" IN ('national_id', 'passport');

-- 6. Create the `patient_consents` table.
CREATE TABLE "patient_consents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "consent_type" "ConsentType" NOT NULL,
  "status" "ConsentStatus" NOT NULL DEFAULT 'granted',
  "scope" "ConsentScope" NOT NULL,
  "duration" "ConsentDuration" NOT NULL,
  "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawn_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "captured_by" UUID NOT NULL,
  "capture_method" "ConsentCaptureMethod" NOT NULL,
  "policy_version" VARCHAR(50) NOT NULL,
  "guardian_name" VARCHAR(100),
  "guardian_relationship" VARCHAR(50),
  "guardian_capture_method" "ConsentCaptureMethod",
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- Simple FK to patients (within BC01, an FK to Patient is permitted).
ALTER TABLE "patient_consents"
  ADD CONSTRAINT "patient_consents_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Indexes for tenant-scoped, patient-scoped, and consent-verification
-- queries.
CREATE INDEX "patient_consents_tenant_id_idx"
  ON "patient_consents" ("tenant_id");
CREATE INDEX "patient_consents_tenant_id_patient_id_idx"
  ON "patient_consents" ("tenant_id", "patient_id");
CREATE INDEX "patient_consents_tenant_patient_type_status_idx"
  ON "patient_consents" ("tenant_id", "patient_id", "consent_type", "status");

-- One-active-treatment-consent invariant (architecture gate 6J).
--
-- A partial unique index on (tenant_id, patient_id) WHERE consent_type =
-- 'treatment' AND status = 'granted' ensures at most one active granted
-- treatment consent per patient per tenant. The
-- transactional reconciliation-before-grant strategy (run by the
-- repository's grant method within a SERIALIZABLE transaction) transitions
-- any existing granted treatment consent whose expires_at < now to
-- status = 'expired' BEFORE inserting a new granted record, so the
-- expired row is removed from the partial index and does not block
-- legitimate re-consent. No NOW()/current-time predicate is used in the
-- partial index predicate — the predicate is `status = 'granted'`, which
-- is immutable per-row state, not time-dependent. Concurrent grant
-- requests cannot create two active treatment consents: the partial unique
-- index catches the second insert; the SERIALIZABLE retry re-observes the
-- committed granted row and resolves as duplicate_active_consent.
CREATE UNIQUE INDEX "patient_consents_treatment_active_key"
  ON "patient_consents" ("tenant_id", "patient_id")
  WHERE "consent_type" = 'treatment' AND "status" = 'granted';
