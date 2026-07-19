-- ---------------------------------------------------------------------------
-- Corrective migration for the eighth canonical batch: add a
-- database-level CHECK constraint on
-- `tenant_role_assignments.role_code` limiting it to the fourteen
-- canonical platform role codes ratified in PRODUCT_BIBLE.md §20
-- and ROLES_AND_PERMISSIONS.md §1.2.
--
-- Why this migration exists
-- -------------------------
-- The original Batch 8 migration
-- (`20260719110000_rbac_authorization_foundation`) created the
-- `tenant_role_assignments` table with `role_code VARCHAR(40)` but
-- did NOT add a database-level CHECK constraint limiting the value
-- to the fourteen canonical codes. Application-level TypeScript and
-- Zod validation (`PlatformRoleCodeSchema` in
-- `@ibn-hayan/contracts`) catch unknown codes at the API boundary,
-- but a SQL INSERT/UPDATE that bypasses the application layer — for
-- example, an operator running a one-off script, a future batch
-- job, a restore from a logical backup, or a Prisma client bug —
-- could otherwise persist an unknown role code. The authorization
-- layer would later silently deny the unknown role (fail-closed),
-- but the row would persist as a data-integrity defect.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and the eighth
-- canonical batch's final verification requirements, the rejection
-- of unknown role codes must be STRUCTURAL at the database level,
-- not merely enforced by application code. This migration adds
-- that structural enforcement.
--
-- Why a new migration rather than editing the original
-- ------------------------------------------------------
-- The original migration may already have been applied to
-- development databases. Editing an applied migration would cause
-- Prisma's migration history to disagree with the database schema
-- (the `_prisma_migrations` table records the migration name and
-- checksum). Prisma's `migrate deploy` would refuse to apply the
-- edited migration because the checksum would not match the
-- already-applied record. The correct procedure is to add a new
-- migration that ALTERs the table to add the constraint.
--
-- Idempotence
-- -----------
-- This migration is NOT idempotent on its own — running it twice
-- would fail because the constraint already exists. Prisma's
-- migration runner applies each migration exactly once and records
-- the application in `_prisma_migrations`, so this is acceptable.
--
-- Fail-closed behaviour
-- ---------------------
-- The constraint does NOT modify any existing rows. If any
-- `tenant_role_assignments` row already has a `role_code` outside
-- the allowed set, the ALTER TABLE would fail with
-- SQLSTATE 23514 (check_violation). This is the desired
-- fail-closed posture: the operator must manually resolve the
-- offending rows (typically by deleting them, since unknown roles
-- grant no permissions) before the migration can be applied.
--
-- The constraint allows exactly these fourteen canonical codes:
--   R01_PHYSICIAN
--   R02_NURSE
--   R03_PHARMACIST
--   R04_TECHNICIAN
--   R05_ALLIED_HEALTH_PROFESSIONAL
--   R06_RECEPTIONIST
--   R07_SCHEDULER
--   R08_BILLER
--   R09_ADMINISTRATOR
--   R10_COMPLIANCE_OFFICER
--   R11_HR_MANAGER
--   R12_EXECUTIVE
--   R13_SYSTEM_ADMINISTRATOR
--   R14_INTEGRATION_ACCOUNT
-- ---------------------------------------------------------------------------

ALTER TABLE "tenant_role_assignments"
  ADD CONSTRAINT "tenant_role_assignments_role_code_check"
  CHECK ("role_code" IN (
    'R01_PHYSICIAN',
    'R02_NURSE',
    'R03_PHARMACIST',
    'R04_TECHNICIAN',
    'R05_ALLIED_HEALTH_PROFESSIONAL',
    'R06_RECEPTIONIST',
    'R07_SCHEDULER',
    'R08_BILLER',
    'R09_ADMINISTRATOR',
    'R10_COMPLIANCE_OFFICER',
    'R11_HR_MANAGER',
    'R12_EXECUTIVE',
    'R13_SYSTEM_ADMINISTRATOR',
    'R14_INTEGRATION_ACCOUNT'
  ));
