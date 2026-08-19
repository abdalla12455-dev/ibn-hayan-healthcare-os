-- ---------------------------------------------------------------------------
-- BC16 Configuration foundation: generic configuration value store and
-- append-only version history for the first canonical Configuration
-- vertical slice.
--
-- Implements the generic persistence model required by the operator-
-- ratified Configuration vertical-slice decisions:
--   - `configuration_values`: current value of each registered
--     Configuration key at one layer within one scope. The value column
--     is generic JSONB — a per-type column (e.g. `value_int`) is
--     deliberately NOT used, so future typed keys need no schema change.
--   - `configuration_value_versions`: append-only, immutable version
--     history. Every successful create/update appends exactly one version
--     record in the same transaction. Rollback and comparison endpoints
--     are deferred.
--
-- Supported layers in this slice: L1 (Platform Default, platform-seeded,
-- immutable through the administration API), L3 (Tenant), L4 (Facility).
-- L2 (Edition) and L5–L8 (Department/Care Team/User/Session) remain part
-- of the canonical eight-layer model but are NOT persistence scopes here;
-- the `layer` CHECK constraint limits stored rows to `L1`, `L3`, `L4`.
--
-- Scope coherence is enforced structurally at the database:
--   - L1 rows carry all three scope identifiers NULL.
--   - L3 rows carry `tenant_id` NOT NULL; organisation and facility NULL.
--   - L4 rows carry all three scope identifiers NOT NULL; the composite
--     foreign key on (tenant_id, organisation_id, facility_id) against
--     `facilities` enforces hierarchy coherence (PostgreSQL treats a
--     composite foreign key as unenforced if any referencing column is
--     NULL, so L1/L3 rows pass safely).
--
-- Duplicate active values are prevented by three partial unique indexes,
-- one per scope level (the partial-index pattern established by
-- `user_provider_bindings_tenant_user_active_key`).
--
-- The L1 seed for the first registered key
-- `scheduling.appointment.noShowGracePeriod` = 15 minutes (integer bounds
-- 5..120) is inserted here deterministically (fixed UUIDs and a fixed
-- timestamp literal) so the migration is re-runnable and production-safe.
-- A matching version-history row is inserted so that the append-only
-- invariant holds from the seed. ON CONFLICT DO NOTHING keeps the seed
-- migration-safe for databases that already carry the row.
--
-- Per ADR-012 §1.4 safeguard 3 (reviewed raw SQL) and CODING_STANDARDS.md
-- §14 (Migration Review Requirements), this migration is reviewed raw SQL.
-- It is forward-only and non-destructive: no DROP, no data alteration, no
-- migration-history rewrite.
-- ---------------------------------------------------------------------------

CREATE TABLE "configuration_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(160) NOT NULL,
    "layer" VARCHAR(2) NOT NULL,
    "tenant_id" UUID,
    "organisation_id" UUID,
    "facility_id" UUID,
    "value" JSONB NOT NULL,
    "value_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "configuration_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "configuration_value_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "configuration_value_id" UUID NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "layer" VARCHAR(2) NOT NULL,
    "tenant_id" UUID,
    "organisation_id" UUID,
    "facility_id" UUID,
    "value" JSONB NOT NULL,
    "value_version" INTEGER NOT NULL,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "configuration_value_versions_pkey" PRIMARY KEY ("id")
);

-- Layer CHECK constraints on both tables. Supported layers in this slice:
-- L1, L3, L4. L2 and L5–L8 are part of the canonical model but not
-- persistence scopes yet.
ALTER TABLE "configuration_values"
    ADD CONSTRAINT "configuration_values_layer_check"
    CHECK ("layer" IN ('L1', 'L3', 'L4'));

ALTER TABLE "configuration_value_versions"
    ADD CONSTRAINT "configuration_value_versions_layer_check"
    CHECK ("layer" IN ('L1', 'L3', 'L4'));

-- Scope coherence CHECK constraints on both tables:
--   L1 ⇒ all scope NULL; L3 ⇒ tenant_id NOT NULL with organisation and
--   facility NULL; L4 ⇒ all three NOT NULL.
ALTER TABLE "configuration_values"
    ADD CONSTRAINT "configuration_values_scope_coherence_check"
    CHECK (
        ("layer" = 'L1' AND "tenant_id" IS NULL AND "organisation_id" IS NULL AND "facility_id" IS NULL)
        OR
        ("layer" = 'L3' AND "tenant_id" IS NOT NULL AND "organisation_id" IS NULL AND "facility_id" IS NULL)
        OR
        ("layer" = 'L4' AND "tenant_id" IS NOT NULL AND "organisation_id" IS NOT NULL AND "facility_id" IS NOT NULL)
    );

ALTER TABLE "configuration_value_versions"
    ADD CONSTRAINT "configuration_value_versions_scope_coherence_check"
    CHECK (
        ("layer" = 'L1' AND "tenant_id" IS NULL AND "organisation_id" IS NULL AND "facility_id" IS NULL)
        OR
        ("layer" = 'L3' AND "tenant_id" IS NOT NULL AND "organisation_id" IS NULL AND "facility_id" IS NULL)
        OR
        ("layer" = 'L4' AND "tenant_id" IS NOT NULL AND "organisation_id" IS NOT NULL AND "facility_id" IS NOT NULL)
    );

-- Partial unique indexes: one active value per (key, layer, scope).
CREATE UNIQUE INDEX "configuration_values_l1_key"
    ON "configuration_values" ("key", "layer")
    WHERE "layer" = 'L1';

CREATE UNIQUE INDEX "configuration_values_l3_key"
    ON "configuration_values" ("key", "layer", "tenant_id")
    WHERE "layer" = 'L3';

CREATE UNIQUE INDEX "configuration_values_l4_key"
    ON "configuration_values" ("key", "layer", "tenant_id", "organisation_id", "facility_id")
    WHERE "layer" = 'L4';

-- Version-history uniqueness: one immutable row per (value id, version).
ALTER TABLE "configuration_value_versions"
    ADD CONSTRAINT "configuration_value_versions_value_id_version_key"
    UNIQUE ("configuration_value_id", "value_version");

-- Foreign keys for the current-value rows.
-- Single-column tenant foreign key, enforced for L3/L4 rows.
ALTER TABLE "configuration_values"
    ADD CONSTRAINT "configuration_values_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Triple-column composite foreign key to facilities: enforces that an L4
-- row's (tenant_id, organisation_id, facility_id) triple belongs to one
-- coherent hierarchy edge. Unenforced when any column is NULL (L1/L3 rows).
-- The target unique constraint
-- facilities_tenant_id_organisation_id_id_key (tenant_id, organisation_id, id)
-- was established by the tenancy foundation migration.
ALTER TABLE "configuration_values"
    ADD CONSTRAINT "configuration_values_tenant_organisation_facility_fkey"
    FOREIGN KEY ("tenant_id", "organisation_id", "facility_id")
    REFERENCES "facilities" ("tenant_id", "organisation_id", "id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Version rows reference exactly one immutable parent row.
ALTER TABLE "configuration_value_versions"
    ADD CONSTRAINT "configuration_value_versions_value_fkey"
    FOREIGN KEY ("configuration_value_id") REFERENCES "configuration_values" ("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Lookup indexes.
CREATE INDEX "configuration_values_key_idx" ON "configuration_values" ("key");
CREATE INDEX "configuration_values_tenant_id_idx" ON "configuration_values" ("tenant_id");
CREATE INDEX "configuration_value_versions_value_id_idx" ON "configuration_value_versions" ("configuration_value_id");
CREATE INDEX "configuration_value_versions_key_idx" ON "configuration_value_versions" ("key");

-- Deterministic L1 seed for the first registered key, plus its immutable
-- version-history row (fixed UUIDs and timestamp literal; ON CONFLICT DO
-- NOTHING keeps replay safe).
INSERT INTO "configuration_values" (
    "id",
    "key",
    "layer",
    "tenant_id",
    "organisation_id",
    "facility_id",
    "value",
    "value_version",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at"
)
VALUES (
    'cfee2b7e-9a05-4bf0-9e2c-afe0d7d10001',
    'scheduling.appointment.noShowGracePeriod',
    'L1',
    NULL,
    NULL,
    NULL,
    '15'::jsonb,
    1,
    NULL,
    NULL,
    '2026-08-19 00:00:00+00'::timestamptz,
    '2026-08-19 00:00:00+00'::timestamptz
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "configuration_value_versions" (
    "id",
    "configuration_value_id",
    "key",
    "layer",
    "tenant_id",
    "organisation_id",
    "facility_id",
    "value",
    "value_version",
    "actor_id",
    "created_at"
)
VALUES (
    'cfee2b7e-9a05-4bf0-9e2c-afe0d7d10002',
    'cfee2b7e-9a05-4bf0-9e2c-afe0d7d10001',
    'scheduling.appointment.noShowGracePeriod',
    'L1',
    NULL,
    NULL,
    NULL,
    '15'::jsonb,
    1,
    NULL,
    '2026-08-19 00:00:00+00'::timestamptz
)
ON CONFLICT ("id") DO NOTHING;
