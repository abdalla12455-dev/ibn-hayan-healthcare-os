-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "status" "OrganisationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(200) NOT NULL,
    "status" "FacilityStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "organisations_tenant_id_idx" ON "organisations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_tenant_id_code_key" ON "organisations"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_tenant_id_id_key" ON "organisations"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "facilities_tenant_id_idx" ON "facilities"("tenant_id");

-- CreateIndex
CREATE INDEX "facilities_tenant_id_organisation_id_idx" ON "facilities"("tenant_id", "organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_tenant_id_organisation_id_code_key" ON "facilities"("tenant_id", "organisation_id", "code");

-- AddForeignKey
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------------
-- Reviewed raw SQL supplement (per ADR-012 §1.4 safeguard 3 and
-- CODING_STANDARDS.md §14).
--
-- Prisma 7 cannot express a composite foreign key in its schema
-- language. The composite foreign key below is required by the third
-- canonical batch specification: it enforces that a Facility cannot
-- be attached to an Organisation in a different Tenant. Without this
-- constraint, a caller could insert a Facility row whose `tenant_id`
-- does not match its Organisation's `tenant_id`, producing a
-- cross-tenant data leak.
--
-- The composite foreign key references the unique constraint
-- `organisations_tenant_id_id_key` (created above) on
-- `organisations(tenant_id, id)`. The unique constraint is required
-- for the composite foreign key to be valid.
--
-- The constraint uses ON DELETE RESTRICT and ON UPDATE RESTRICT to
-- match the restricted-delete behaviour of the single-column foreign
-- keys above. Deleting an Organisation that still has Facilities is
-- rejected; updating an Organisation's `tenant_id` or `id` while
-- Facilities still reference it is rejected.
--
-- This migration is idempotent only when run against a database that
-- has just executed the Prisma-generated section above. It is not
-- idempotent against an arbitrary database state; the Prisma migration
-- runner applies migrations in order, so this is acceptable.
-- ---------------------------------------------------------------------------

-- AddCompositeForeignKey: facilities(tenant_id, organisation_id) -> organisations(tenant_id, id)
ALTER TABLE "facilities"
  ADD CONSTRAINT "facilities_tenant_id_organisation_id_fkey"
  FOREIGN KEY ("tenant_id", "organisation_id")
  REFERENCES "organisations" ("tenant_id", "id")
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;
