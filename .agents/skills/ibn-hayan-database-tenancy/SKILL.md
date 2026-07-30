---
name: ibn-hayan-database-tenancy
description: >
  Database, Prisma, migration, tenancy, organisation, facility, appointments,
  and data-integrity rules for the Ibn Hayan Healthcare Operating System.
metadata:
  project: ibn-hayan-healthcare-os
  version: "1.0.0"
triggers:
  - prisma
  - schema
  - migration
  - database
  - tenant
  - tenancy
  - organisation
  - organization
  - facility
  - appointment
  - appointments
  - قاعدة البيانات
  - مخطط
  - ترحيل
  - مستأجر
  - منشأة
  - مواعيد
---

# Ibn Hayan Database and Tenancy Rules

Use this skill together with `AGENTS.md` and the implementation guardian.

## Canonical inspection

Before changing database code:

- Inspect the current Prisma schema, relevant migrations, canonical database documentation, ADRs, and module documentation.
- Reuse established naming, ID, timestamp, relation, index, constraint, and migration conventions.
- Determine whether a migration is pending, locally applied, applied to a shared environment, or in production.
- Stop if migration history or canonical ownership rules are ambiguous.

## Multi-tenant integrity

- Tenant isolation is non-negotiable.
- Enforce canonical ownership chains across tenant, organisation, and facility boundaries.
- Where a child record stores tenant, organisation, and facility identifiers, verify that database constraints prevent cross-tenant and cross-organisation mismatches.
- Prefer canonical composite constraints when required by the architecture.
- Do not add redundant constraints or indexes without a documented query or integrity purpose.
- Never weaken authorization or tenant isolation for convenience.

## Module ownership

- Do not create fake domain models to satisfy a temporary feature.
- Patient identity belongs to the Patient module.
- Provider and workforce identity belong to the Workforce module.
- Billing and payment data belong to their owning modules.
- Appointments may keep logical patient and provider identifiers until canonical owning modules and relationships exist.
- Do not add foreign keys to future domain tables unless the architecture explicitly authorizes them.

## Time and timezone

- Persist timestamps in UTC.
- Store configured facility timezones as valid IANA identifiers.
- A nullable facility timezone must remain distinguishable from a configured timezone.
- For facility-local “today” workflows, a missing facility timezone is a configuration-required state.
- Do not silently fall back to tenant timezone, UTC, server timezone, browser timezone, or a hard-coded timezone unless a later approved canonical decision explicitly changes this rule.

## Migration safety

- Create non-destructive, forward-only migrations.
- Do not reset or recreate databases.
- Never use `DROP`, `TRUNCATE`, migration reset, or destructive data changes without explicit approval.
- Never rewrite migration history after a migration has been applied to a shared environment.
- If an unapplied migration needs correction before merge, replace or amend it only when repository policy permits and after confirming it was not applied.
- If migration application fails, inspect the actual database state and use the reviewed Prisma failed-migration workflow.
- If an applied migration needs correction, create a forward corrective migration.

## Validation

Run as applicable:

- Prisma format
- Prisma schema validation
- Prisma client generation
- migration SQL inspection
- PostgreSQL column-order and type review
- unique-constraint and referential-action review
- focused persistence tests
- API typecheck and lint
- PostgreSQL 17 migration and integration checks through repository CI
- `git diff --check`

Never claim PostgreSQL execution passed unless it ran against a real compatible database.
