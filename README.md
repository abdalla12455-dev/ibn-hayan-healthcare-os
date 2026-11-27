# Ibn Hayan Healthcare OS

**Multi-tenant healthcare operations platform**

Ibn Hayan Healthcare OS is a healthcare software platform under
active development. Its architecture is designed to support
organisations, facilities, users, permissions, and operational
workflows within a consistent multi-tenant system.

## Product Scope

The platform is designed around distinct administrative and
clinical operational responsibilities, with Arabic and English
interfaces and organisation-aware access boundaries.

The long-term product specifications cover several healthcare
workflows. A documented module is not automatically an available
production feature.

## Implemented Foundations

The current development branch contains:

- A Next.js and React web application.
- A NestJS API with TypeScript and shared API contracts.
- PostgreSQL 17 and Prisma persistence infrastructure.
- Tenant, organisation, facility, and user identity foundations.
- Session-based authentication and tenant-scoped authorization.
- An independent Platform Super Admin authorization boundary.
- Initial read-only platform administration overview and tenant list.
- Clinic administration overview infrastructure.
- Structured audit events, transactional outbox infrastructure,
  and associated security validation.
- Automated linting, typechecking, unit tests, build checks,
  and isolated PostgreSQL integration tests.

These statements describe implemented development foundations,
not a declaration of production readiness.

## Architecture

The repository uses a pnpm monorepo:

- apps/web: web application and localized interfaces.
- apps/api: API, authentication, permissions, persistence,
  audit integration, and server-side workflows.
- packages/contracts: shared data contracts.
- packages/domain: domain models and business rules.
- packages/configuration: shared configuration components.
- packages/observability: event and audit infrastructure.
- packages/testing: shared testing infrastructure.

Architecture decisions and module specifications are maintained
under download/docs/.

## Engineering Quality

Development follows documented repository standards,
reviewed migrations, tenant isolation requirements,
controlled Git workflows, and automated validation.

CI results demonstrate the checks executed for the relevant
commit. They do not constitute a security certification.

## Development Status

**Active development. Not approved for production or clinical use.**

Availability, security readiness, regulatory compliance, and
deployment requirements must be evaluated before any real-world
clinical rollout.

## Repository Documentation

- ENGINEERING_STANDARDS.md: engineering and security practices.
- PROJECT_CONTINUITY.md: development milestones and recovery record.
- download/docs/01_ARCHITECTURE/: system architecture.
- download/docs/02_PRODUCT/: product specifications.
- download/docs/05_UI_UX/: interface and design specifications.
- download/docs/09_SECURITY/: security specifications.
- download/docs/12_ADR/: architecture decision records.

## Project Identity

**Ibn Hayan Healthcare OS**
