-- ---------------------------------------------------------------------------
-- Ninth canonical batch: Audit store foundation migration.
--
-- Per ADR-014 (Audit Store and Integrity Strategy), the audit store
-- is a dedicated PostgreSQL 17 database separate from the
-- transactional database. This migration creates the audit store's
-- tables, indexes, immutability triggers, runtime-role grants, and
-- CHECK constraints.
--
-- Per ADR-012 §1.4 safeguard 3 (Reviewed raw SQL) and
-- CODING_STANDARDS.md §14 (Migration Review Requirements), this
-- migration is reviewed raw SQL. It is PostgreSQL-first and uses
-- features that Prisma 7 cannot express in the schema language:
-- - CHECK constraints on enum-like columns.
-- - BEFORE UPDATE OR DELETE triggers for immutability.
-- - BEFORE TRUNCATE triggers for immutability.
-- - GRANT statements for the runtime role.
--
-- The migration creates:
-- 1. The `audit_events` table with the fields documented in
--    ADR-014 §1.3.
-- 2. The `audit_chain_heads` table for chain-head tracking.
-- 3. The required indexes on `audit_events`.
-- 4. The unique constraint on `audit_events.event_id` (idempotent
--    delivery).
-- 5. The CHECK constraints on enum-like columns.
-- 6. The `audit_events_immutable` trigger that rejects UPDATE and
--    DELETE.
-- 7. The `audit_events_no_truncate` trigger that rejects TRUNCATE.
-- 8. GRANT statements for the runtime role.
--
-- The migration does NOT:
-- - Insert any rows. The audit store is empty after migration.
-- - Create a runtime role. The runtime role is expected to exist
--   before the migration is applied; the migration only grants
--   privileges. In development and tests, the runtime role is the
--   same as the migration role (the cluster superuser); in
--   production, the runtime role is a separate, lower-privilege
--   role created by the deployment.
-- - Add any foreign keys to the transactional store. The audit
--   store is independent.
-- - Add any retention or legal-hold metadata. Those are deferred to
--   future batches.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. audit_events table
-- ---------------------------------------------------------------------------

CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_version" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID,
    "chain_scope" VARCHAR(80) NOT NULL,
    "chain_sequence" BIGINT NOT NULL,
    "previous_integrity_hash" CHAR(64),
    "payload_hash" CHAR(64) NOT NULL,
    "integrity_hash" CHAR(64) NOT NULL,
    "integrity_key_version" INTEGER NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "subject_identifier_hash" CHAR(64),
    "session_id" UUID,
    "resource_type" VARCHAR(60),
    "resource_id" VARCHAR(120),
    "permission_code" VARCHAR(60),
    "role_codes" TEXT[] NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "reason_code" VARCHAR(60),
    "source" VARCHAR(20) NOT NULL,
    "request_id" VARCHAR(80) NOT NULL,
    "correlation_id" VARCHAR(80),
    "ip_address" INET,
    "user_agent" VARCHAR(600),
    "scope" VARCHAR(200) NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_events_event_id_key" UNIQUE ("event_id")
);

-- ---------------------------------------------------------------------------
-- 2. audit_chain_heads table
-- ---------------------------------------------------------------------------

CREATE TABLE "audit_chain_heads" (
    "chain_scope" VARCHAR(80) NOT NULL,
    "last_sequence" BIGINT NOT NULL,
    "last_integrity_hash" CHAR(64),
    "last_event_id" UUID,
    "last_event_recorded_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_chain_heads_pkey" PRIMARY KEY ("chain_scope")
);

-- ---------------------------------------------------------------------------
-- 3. Indexes on audit_events
-- ---------------------------------------------------------------------------

CREATE INDEX "audit_events_occurred_at_idx"
    ON "audit_events" ("occurred_at");

CREATE INDEX "audit_events_tenant_id_occurred_at_idx"
    ON "audit_events" ("tenant_id", "occurred_at");

CREATE INDEX "audit_events_actor_id_idx"
    ON "audit_events" ("actor_id");

CREATE INDEX "audit_events_action_idx"
    ON "audit_events" ("action");

CREATE INDEX "audit_events_category_idx"
    ON "audit_events" ("category");

CREATE INDEX "audit_events_resource_type_resource_id_idx"
    ON "audit_events" ("resource_type", "resource_id");

CREATE INDEX "audit_events_outcome_idx"
    ON "audit_events" ("outcome");

CREATE INDEX "audit_events_request_id_idx"
    ON "audit_events" ("request_id");

-- The (chain_scope, chain_sequence) index is the chain-walk index:
-- the verifier uses it to read a chain's events in order.
CREATE INDEX "audit_events_chain_scope_chain_sequence_idx"
    ON "audit_events" ("chain_scope", "chain_sequence");

-- ---------------------------------------------------------------------------
-- 4. CHECK constraints on enum-like columns
-- ---------------------------------------------------------------------------

-- The category column is limited to the categories implemented in
-- the ninth canonical batch. Future batches may extend the list.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_category_check"
    CHECK ("category" IN (
        'security',
        'authorization',
        'tenant_context',
        'rbac',
        'audit'
    ));

-- The actor_type column is limited to the four ratified actor
-- types.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_actor_type_check"
    CHECK ("actor_type" IN (
        'USER',
        'SYSTEM',
        'INTEGRATION',
        'ANONYMOUS'
    ));

-- The outcome column is limited to the three ratified outcomes.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_outcome_check"
    CHECK ("outcome" IN (
        'success',
        'failure',
        'denied'
    ));

-- The source column is limited to the four ratified source types.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_source_check"
    CHECK ("source" IN (
        'api',
        'dispatcher',
        'bootstrap',
        'verifier'
    ));

-- The integrity_key_version must be a positive integer. This is a
-- defence-in-depth check; the application layer also validates.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_integrity_key_version_check"
    CHECK ("integrity_key_version" > 0);

-- The chain_sequence must be a positive integer (starting from 1).
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_chain_sequence_check"
    CHECK ("chain_sequence" > 0);

-- The chain_scope must be either 'platform' or 'tenant:<uuid>'.
-- This is a defence-in-depth check; the application layer also
-- validates.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_chain_scope_check"
    CHECK (
        "chain_scope" = 'platform'
        OR "chain_scope" ~ '^tenant:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

-- The payload_hash and integrity_hash must be 64-character
-- lowercase hex strings. The column type is CHAR(64) which enforces
-- length; this CHECK enforces content.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_payload_hash_check"
    CHECK ("payload_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_integrity_hash_check"
    CHECK ("integrity_hash" ~ '^[0-9a-f]{64}$');

-- The subject_identifier_hash, when non-null, must be a 64-char
-- lowercase hex string.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_subject_identifier_hash_check"
    CHECK (
        "subject_identifier_hash" IS NULL
        OR "subject_identifier_hash" ~ '^[0-9a-f]{64}$'
    );

-- The previous_integrity_hash, when non-null, must be a 64-char
-- lowercase hex string.
ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_previous_integrity_hash_check"
    CHECK (
        "previous_integrity_hash" IS NULL
        OR "previous_integrity_hash" ~ '^[0-9a-f]{64}$'
    );

-- ---------------------------------------------------------------------------
-- 5. Immutability triggers on audit_events
-- ---------------------------------------------------------------------------

-- The BEFORE UPDATE OR DELETE trigger rejects any UPDATE or DELETE
-- on the audit_events table. The trigger raises an exception with
-- SQLSTATE 27010 (a custom, unassigned SQLSTATE chosen for
-- recognisability). The exception message is descriptive so the
-- operator can identify the source of the rejection.
CREATE OR REPLACE FUNCTION "audit_events_reject_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is immutable: UPDATE and DELETE are rejected (chain_scope=%, chain_sequence=%)',
        NEW.chain_scope, NEW.chain_sequence
        USING ERRCODE = '27010';
END;
$$;

CREATE TRIGGER "audit_events_immutable"
    BEFORE UPDATE OR DELETE ON "audit_events"
    FOR EACH ROW
    EXECUTE FUNCTION "audit_events_reject_mutation"();

-- The BEFORE TRUNCATE trigger rejects TRUNCATE on the audit_events
-- table. TRUNCATE is a DDL-like operation that bypasses row-level
-- triggers; a separate trigger is required.
CREATE OR REPLACE FUNCTION "audit_events_reject_truncate"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is immutable: TRUNCATE is rejected'
        USING ERRCODE = '27010';
END;
$$;

CREATE TRIGGER "audit_events_no_truncate"
    BEFORE TRUNCATE ON "audit_events"
    FOR EACH STATEMENT
    EXECUTE FUNCTION "audit_events_reject_truncate"();

-- ---------------------------------------------------------------------------
-- 6. Runtime-role grants
-- ---------------------------------------------------------------------------
--
-- In development and tests, the runtime role is the same as the
-- migration role (the cluster superuser). The grants below are
-- idempotent and harmless in that mode: GRANT to a role that
-- already has the privileges is a no-op.
--
-- In production, the runtime role is a separate, lower-privilege
-- role created by the deployment. The deployment creates the role
-- before applying this migration. The migration grants the runtime
-- role INSERT and SELECT on audit_events, and INSERT, UPDATE, and
-- SELECT on audit_chain_heads. The runtime role does NOT receive
-- UPDATE, DELETE, or TRUNCATE on audit_events; even if it did, the
-- triggers above would reject the operation.
--
-- The runtime-role name is configurable through the
-- `AUDIT_DATABASE_RUNTIME_ROLE` environment variable. When unset,
-- the default is `ibn_hayan_audit_runtime`. The migration uses a
-- DO block to read the variable and execute the GRANTs dynamically,
-- because PostgreSQL does not accept a parameterised role name in
-- a static GRANT statement.

DO $$
DECLARE
    runtime_role TEXT;
    role_exists BOOLEAN;
BEGIN
    runtime_role := COALESCE(
        current_setting('ibn_hayan.audit_runtime_role', true),
        'ibn_hayan_audit_runtime'
    );
    -- Check if the runtime role exists. In development and tests,
    -- the runtime role may not exist (the cluster superuser is
    -- used directly). In production, the deployment creates the
    -- runtime role before applying this migration. We only GRANT
    -- if the role exists, to avoid failing the migration in
    -- development and test environments.
    SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = runtime_role) INTO role_exists;
    IF role_exists THEN
        -- Grant INSERT and SELECT on audit_events. The runtime role
        -- cannot UPDATE or DELETE (the triggers would reject the
        -- attempt anyway, but we also do not grant the privilege).
        EXECUTE format('GRANT INSERT, SELECT ON "audit_events" TO %I', runtime_role);
        -- Grant INSERT, UPDATE, and SELECT on audit_chain_heads. The
        -- chain-head table is mutable implementation metadata.
        EXECUTE format('GRANT INSERT, UPDATE, SELECT ON "audit_chain_heads" TO %I', runtime_role);
    END IF;
    -- Grant USAGE on the sequences (if any) — the audit_events
    -- table uses UUID PKs, so there are no sequences to grant on.
    -- The audit_chain_heads table also uses no sequences.
END;
$$;
