-- ---------------------------------------------------------------------------
-- Ninth canonical batch: Audit outbox foundation migration
-- (transactional store).
--
-- Per ADR-014 (Audit Store and Integrity Strategy) and the ninth
-- canonical batch specification, the transactional outbox pattern is
-- the ratified durable delivery mechanism from the transactional
-- store to the dedicated audit store. This migration creates the
-- `audit_outbox_events` table in the transactional database.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and
-- CODING_STANDARDS.md §14 (Migration Review Requirements), this
-- migration is reviewed raw SQL. It is PostgreSQL-first and uses
-- features that Prisma 7 cannot express in the schema language:
-- - Partial indexes for pending-row lookup and lease-sweep.
--
-- The migration creates:
-- 1. The `audit_outbox_events` table.
-- 2. The unique constraint on `event_id` (idempotent delivery at
--    the outbox level).
-- 3. The composite index on `(delivered_at, available_at)` for
--    pending-row claiming.
-- 4. The partial index on `delivered_at` (null-only) for
--    efficient pending-row lookup.
-- 5. The partial index on `lease_expires_at` (non-null) for
--    lease-sweep.
-- 6. The index on `created_at` for operational queries.
--
-- The migration does NOT:
-- - Insert any rows. The outbox is empty after migration.
-- - Add any foreign keys. The outbox is independent of the other
--   transactional-store tables; an outbox row may reference an
--   event that occurred in a session that has since been revoked
--   or deleted, and the outbox row must remain pending until
--   delivered.
-- - Add any triggers. The outbox is mutable; no immutability
--   controls apply.
-- ---------------------------------------------------------------------------

CREATE TABLE "audit_outbox_events" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_version" INTEGER NOT NULL,
    "canonical_event_draft" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMPTZ,
    "last_failure_code" VARCHAR(60),
    "last_failure_at" TIMESTAMPTZ,
    "lease_owner" VARCHAR(80),
    "lease_expires_at" TIMESTAMPTZ,

    CONSTRAINT "audit_outbox_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_outbox_events_event_id_key" UNIQUE ("event_id"),
    -- The attempt_count must be non-negative.
    CONSTRAINT "audit_outbox_events_attempt_count_check"
        CHECK ("attempt_count" >= 0),
    -- The event_version must be positive.
    CONSTRAINT "audit_outbox_events_event_version_check"
        CHECK ("event_version" > 0),
    -- The delivered_at, when non-null, must be after created_at.
    -- (Defence-in-depth; the application layer enforces this too.)
    CONSTRAINT "audit_outbox_events_delivered_after_created_check"
        CHECK (
            "delivered_at" IS NULL
            OR "delivered_at" >= "created_at"
        )
);

-- Composite index for pending-row claiming. The dispatcher queries
-- `WHERE delivered_at IS NULL AND available_at <= NOW() ORDER BY
-- available_at LIMIT N FOR UPDATE SKIP LOCKED`. This composite
-- index supports the filter and the sort.
CREATE INDEX "audit_outbox_events_delivered_at_available_at_idx"
    ON "audit_outbox_events" ("delivered_at", "available_at");

-- Partial index for efficient pending-row lookup. The dispatcher's
-- most common query is `WHERE delivered_at IS NULL`; this partial
-- index makes that query fast.
CREATE INDEX "audit_outbox_events_delivered_at_null_idx"
    ON "audit_outbox_events" ("available_at")
    WHERE "delivered_at" IS NULL;

-- Partial index for lease-sweep. The dispatcher sweep queries
-- `WHERE lease_expires_at IS NOT NULL AND lease_expires_at < NOW()`;
-- this partial index makes that query fast.
CREATE INDEX "audit_outbox_events_lease_expires_at_not_null_idx"
    ON "audit_outbox_events" ("lease_expires_at")
    WHERE "lease_expires_at" IS NOT NULL;

-- Index on created_at for operational queries (e.g. "show me
-- outbox rows from the last hour").
CREATE INDEX "audit_outbox_events_created_at_idx"
    ON "audit_outbox_events" ("created_at");
