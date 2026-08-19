-- Appointment No-Show Reason Persistence
--
-- Operator-ratified decision: persist the optional no-show
-- justification (free-text, max 500 chars) on the appointment row
-- itself, NOT in generic audit metadata.
--
-- Per APPOINTMENTS.md §7.1, no-show recording is "audited, with the
-- recorder, the time, and the justification (if required) recorded."
-- The audit metadata remains PHI-safe (only endpoint + appointmentId).
-- The free-text reason is stored in this dedicated nullable column,
-- written atomically with the FIRST confirmed|arrived -> no_show
-- transition. An idempotent re-mark never overwrites the original
-- value; an invalid transition never writes it.
--
-- Forward-only, additive. Adds a single nullable VARCHAR(500) column
-- to the existing `appointments` table. No existing column is
-- modified, no data is dropped, no constraint is removed. Existing
-- rows default to NULL (no no-show reason), which is correct for all
-- historical appointments.

ALTER TABLE "appointments"
  ADD COLUMN "no_show_reason" VARCHAR(500);
