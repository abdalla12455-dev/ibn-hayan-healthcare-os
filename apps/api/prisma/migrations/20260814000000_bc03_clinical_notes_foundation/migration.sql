-- ---------------------------------------------------------------------------
-- BC03: Clinical Notes Foundation (Clinical Documentation)
--
-- Forward-only, non-destructive migration that adds the minimum
-- persistence infrastructure required for the Clinical Note bounded
-- context (BC03) to represent, sign, amend, and preserve clinical
-- documentation attached to the already-implemented Encounter (BC02)
-- workflow.
--
-- Per the architecture gate:
--
-- - BC03 owns ClinicalNote state exclusively. The note references — but
--   does NOT foreign-key to — the Encounter (BC02), Patient (BC01), and
--   author Provider (BC10). Those contexts own their own authoritative
--   state; these tables hold logical UUID identifiers only, per the
--   cross-BC state-isolation rule ("Direct data access across context
--   boundaries is a defect and is rejected at code review"). No foreign
--   keys cross BC boundaries.
-- - New `ClinicalNoteType`, `ClinicalNoteStatus`, `ClinicalNoteAuthorRole`,
--   and `ClinicalNoteRevisionAction` enums are created (ENUMS.md §4.2,
--   STATUS_CODES.md §5.3).
-- - `clinical_notes` and `clinical_note_revisions` tables are created.
--   A `clinical_note_revisions` row IS foreign-keyed to its owning
--   `clinical_notes` row (same bounded context — BC03 owns both). No
--   foreign key crosses a BC boundary.
-- - A signed note is never destructively rewritten: signing, amendment,
--   addendum, and withdrawal each APPEND a new revision row; prior
--   revisions are retained verbatim (immutable, history-preserving
--   medico-legal record). The `(clinical_note_id, revision_number)`
--   partial unique index enforces the 1-based per-note revision sequence.
-- - The canonical lifecycle is enforced at the application/repository
--   boundary via a conditional UPDATE ... WHERE status IN (...), NOT by a
--   database CHECK constraint. The database stores the status; the
--   repository enforces permitted source -> target transitions atomically
--   and appends a new revision within the same SERIALIZABLE transaction.
-- - No DROP, no TRUNCATE, no destructive type rewrite, no backfill.
-- - Existing Patient, Appointment, Encounter, Provider, Consent, and
--   historical data remain valid. No existing migration is edited.
--
-- Per download/docs/03_DOMAIN/ENUMS.md §4.2:
-- - ClinicalNoteType (Open-with-Council): progress, history, physical,
--   consultation, discharge, procedure, nursing (default progress)
-- - ClinicalNoteStatus (Closed): draft, in_progress, signed, amended,
--   addendum, withdrawn (default draft; terminal: addendum, withdrawn)
-- - ClinicalNoteAuthorRole (Open-with-Council): physician, nurse,
--   pharmacist, therapist, midlevel, student (default physician)
--
-- Per download/docs/03_DOMAIN/STATUS_CODES.md §5.3 (ClinicalNoteStatus
-- transition map):
--   draft       -> in_progress | signed | withdrawn
--   in_progress -> signed | withdrawn
--   signed      -> amended | addendum
--   amended     -> addendum (rare)
--   addendum    -> (terminal)
--   withdrawn   -> (terminal)
--
-- Per BR-BC03-CLIN-031 (signing authority) and BR-BC03-CLIN-032
-- (amendment requires reason + author), the lifecycle authority and the
-- mandatory amendment reason are enforced at the service layer.
-- ---------------------------------------------------------------------------

-- 1. Create the enums.

CREATE TYPE "ClinicalNoteType" AS ENUM (
  'progress',
  'history',
  'physical',
  'consultation',
  'discharge',
  'procedure',
  'nursing'
);

CREATE TYPE "ClinicalNoteStatus" AS ENUM (
  'draft',
  'in_progress',
  'signed',
  'amended',
  'addendum',
  'withdrawn'
);

CREATE TYPE "ClinicalNoteAuthorRole" AS ENUM (
  'physician',
  'nurse',
  'pharmacist',
  'therapist',
  'midlevel',
  'student'
);

CREATE TYPE "ClinicalNoteRevisionAction" AS ENUM (
  'draft_created',
  'signed',
  'amended',
  'addendum_added',
  'withdrawn'
);

-- 2. Create the `clinical_notes` table.
--
-- encounterId, patientId are logical cross-BC references stored as UUIDs
-- WITHOUT foreign keys (BC02 owns Encounter state, BC01 owns Patient
-- state). The author providerId is carried per-revision (on
-- clinical_note_revisions), also a logical UUID reference to BC10
-- Workforce/Provider state.

CREATE TABLE "clinical_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "organisation_id" UUID NOT NULL,
  "facility_id" UUID NOT NULL,
  "encounter_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "note_type" "ClinicalNoteType" NOT NULL DEFAULT 'progress',
  "author_role" "ClinicalNoteAuthorRole" NOT NULL DEFAULT 'physician',
  "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'draft',
  "signed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: composite (tenant_id, organisation_id, facility_id,
-- id) for scoped lookups, consistent with the Encounter model's composite
-- scope key. A note outside the authenticated tenant/organisation/
-- facility scope is indistinguishable from "does not exist" (no
-- cross-scope existence leak).
CREATE UNIQUE INDEX "clinical_notes_tenant_org_facility_id_key"
  ON "clinical_notes" ("tenant_id", "organisation_id", "facility_id", "id");

-- Indexes for tenant-scoped, organisation/facility-scoped, encounter-
-- scoped, patient-scoped, and status-scoped queries.
CREATE INDEX "clinical_notes_tenant_id_idx"
  ON "clinical_notes" ("tenant_id");
CREATE INDEX "clinical_notes_tenant_id_organisation_id_idx"
  ON "clinical_notes" ("tenant_id", "organisation_id");
CREATE INDEX "clinical_notes_tenant_id_facility_id_idx"
  ON "clinical_notes" ("tenant_id", "facility_id");
CREATE INDEX "clinical_notes_tenant_id_encounter_id_idx"
  ON "clinical_notes" ("tenant_id", "encounter_id");
CREATE INDEX "clinical_notes_tenant_id_patient_id_idx"
  ON "clinical_notes" ("tenant_id", "patient_id");
CREATE INDEX "clinical_notes_tenant_id_facility_id_status_idx"
  ON "clinical_notes" ("tenant_id", "facility_id", "status");

-- 3. Create the `clinical_note_revisions` table.
--
-- Revisions are append-only: a new revision is created for every
-- lifecycle action that changes the note's content or status. A signed
-- revision is never mutated; an amendment or addendum creates a NEW
-- revision with the corrected/supplementary content while the prior
-- signed revision is retained verbatim. The revisionNumber is a 1-based
-- sequence scoped to the note.

CREATE TABLE "clinical_note_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clinical_note_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "action" "ClinicalNoteRevisionAction" NOT NULL,
  "status" "ClinicalNoteStatus" NOT NULL,
  "body" TEXT NOT NULL,
  "author_id" UUID NOT NULL,
  "author_role" "ClinicalNoteAuthorRole" NOT NULL,
  "reason" TEXT,
  "signed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_note_revisions_pkey" PRIMARY KEY ("id")
);

-- Simple FK to clinical_notes (within BC03, an FK to the owning note is
-- permitted — same bounded context). ON DELETE RESTRICT: a note's
-- revisions are never deleted (the history is the medico-legal record).
ALTER TABLE "clinical_note_revisions"
  ADD CONSTRAINT "clinical_note_revisions_clinical_note_id_fkey"
  FOREIGN KEY ("clinical_note_id") REFERENCES "clinical_notes"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Per-note 1-based revision sequence uniqueness. A partial unique index
-- on (clinical_note_id, revision_number) ensures no two revisions of the
-- same note share a revision number. (Written as a unique index to match
-- the repository convention for partial unique constraints.)
CREATE UNIQUE INDEX "clinical_note_revisions_note_id_revision_number_key"
  ON "clinical_note_revisions" ("clinical_note_id", "revision_number");

-- Indexes for tenant-scoped and note-scoped revision queries, plus the
-- ascending-revision-number history retrieval path.
CREATE INDEX "clinical_note_revisions_tenant_id_idx"
  ON "clinical_note_revisions" ("tenant_id");
CREATE INDEX "clinical_note_revisions_clinical_note_id_idx"
  ON "clinical_note_revisions" ("clinical_note_id");
CREATE INDEX "clinical_note_revisions_note_id_revision_number_idx"
  ON "clinical_note_revisions" ("clinical_note_id", "revision_number");
