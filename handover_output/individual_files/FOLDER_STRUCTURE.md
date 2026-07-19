# Ibn Hayan Healthcare Operating System
## Folder Structure

> **Document Purpose:** The canonical repository layout for the Ibn Hayan Healthcare Operating System implementation — top-level directories, application structure, shared-package responsibilities, dependency direction, test organisation, and the boundary rules that engineers must follow. This document elaborates the repository structure ratified by ADR-012 to implementation-grade detail. It is the day-to-day reference for engineers; ADR-012 is the authoritative decision record.
>
> **Status:** Ratified · **Version:** 1.0.0 · **Last Updated:** 2026-07-18
>
> This document is part of the official Ibn Hayan Healthcare Operating System
> documentation framework and serves as the authoritative reference for its
> respective domain. It is intended for the entire product, engineering,
> design, clinical, and operations teams.

---

## Table of Contents

1. Repository Layout Overview
2. Top-Level Directories
3. Application Structure
4. Shared Package Structure
5. Dependency Direction and Boundary Rules
6. Test Organisation
7. Documentation and Prototype Layout
8. Configuration Files
9. Build Artifacts and Generated Code
10. Naming Conventions
11. Monorepo vs Polyrepo Strategy
12. Related Documents

---

## 1. Repository Layout Overview

The Ibn Hayan canonical implementation is a TypeScript monorepo managed with pnpm workspaces, ratified by ADR-012. The repository contains two applications, five shared packages, the documentation tree, and the existing prototype references. The top-level layout is:

```
ibn-hayan-healthcare-os/
├── apps/                       # Deployable applications
│   ├── web/                    # Next.js (App Router) + React + strict TypeScript — thin client
│   └── api/                    # NestJS + strict TypeScript — authoritative backend
├── packages/                   # Shared packages consumed by applications
│   ├── contracts/              # Zod-defined API contracts, request/response schemas, error envelopes
│   ├── domain/                 # Bounded-context domain models, use cases, repository interfaces
│   ├── configuration/          # Configuration schema and evaluation helpers (ADR-001, eight-layer precedence)
│   ├── observability/          # Structured logging, audit emission, metrics, PHI redaction
│   └── testing/                # Test fixtures, factories, shared test utilities
├── tests/                      # Cross-application end-to-end tests (Playwright)
│   └── e2e/
├── docs/                       # Existing documentation tree (download/docs/ at scaffolding time)
├── download/                   # Existing prototypes and documentation (preserved per ADR-012 §6.5)
│   ├── docs/                   # Canonical documentation framework
│   ├── mediflow/               # Prototype reference (reference-only per ADR-012 §6.5)
│   └── mediflow-pro/           # Prototype reference (reference-only per ADR-012 §6.5)
├── scripts/                    # Build scripts, scaffolding scripts, documentation generators
├── .github/
│   └── workflows/              # CI workflows
├── package.json                # Workspace root
├── pnpm-workspace.yaml         # Workspace declaration
├── tsconfig.base.json          # Shared TypeScript strict configuration
├── eslint.config.mjs           # Shared ESLint configuration (with package-boundary linting)
├── prettier.config.mjs         # Shared Prettier configuration
├── .env.example                # Documented environment variables (placeholders only)
├── .gitignore
└── README.md
```

The canonical implementation workspace is established at scaffolding time. The `apps/`, `packages/`, and `tests/` directories are created by the scaffolding step authorised by ADR-012 Section 5.3. The existing `download/docs/` documentation tree and the `download/mediflow/` and `download/mediflow-pro/` prototypes remain in their current locations per ADR-012 Section 6.5; they are not moved, renamed, isolated, or deleted by ADR-012 or by this document. The `scripts/` directory continues to hold the existing documentation generators and may hold new scaffolding scripts.

The `apps/` and `packages/` directories are the canonical implementation workspace. Every line of code in these directories is governed by `CODING_STANDARDS.md`. Code outside these directories (the documentation tree, the prototypes, the scripts) is not governed by `CODING_STANDARDS.md`.

---

## 2. Top-Level Directories

| Directory | Purpose | Governed By |
|---|---|---|
| `apps/` | Deployable applications: `web` and `api` | `CODING_STANDARDS.md`, ADR-012, ADR-013 |
| `packages/` | Shared packages: `contracts`, `domain`, `configuration`, `observability`, `testing` | `CODING_STANDARDS.md`, ADR-012 |
| `tests/` | Cross-application end-to-end tests (Playwright) | `CODING_STANDARDS.md` Section 11 |
| `docs/` | Implementation-guide documentation (created at scaffolding time; distinct from `download/docs/`) | Documentation conventions |
| `download/docs/` | Existing canonical documentation framework (preserved) | Documentation conventions, the canonical spine |
| `download/mediflow/` | Existing prototype reference (reference-only per ADR-012 §6.5) | ADR-012 §6.5 |
| `download/mediflow-pro/` | Existing prototype reference (reference-only per ADR-012 §6.5) | ADR-012 §6.5 |
| `scripts/` | Build scripts, scaffolding scripts, documentation generators | Script conventions |
| `.github/workflows/` | CI workflows | CI conventions |

The `docs/` directory at the repository root is distinct from `download/docs/`. The `docs/` directory holds implementation-guide documentation created at scaffolding time (for example, the implementation manifest that records exact package versions per ADR-012 Section 5.3). The `download/docs/` directory holds the canonical documentation framework that exists before scaffolding. Both directories coexist; neither is moved or merged.

---

## 3. Application Structure

### 3.1 `apps/web`

**Purpose.** `apps/web` is the Next.js web application. It is a thin client that consumes published API contracts from `apps/api` via `packages/contracts`. It contains no authoritative business rules per ADR-005 and ADR-012. Its responsibilities are: rendering UI, capturing user input, validating input at the form level (for user feedback; authoritative validation is at the API), calling API endpoints, managing client-side UI state, and supporting Arabic/English, RTL/LTR, accessibility, and keyboard navigation from the first screen.

**Framework.** Next.js with the App Router, React, and strict TypeScript per ADR-012. The App Router is used (not the Pages Router); server components are the default; client components are used only where interactivity requires them.

**Styling.** Tailwind CSS with project-owned accessible UI components per ADR-012. Generated component code (from shadcn/ui-style generators or other scaffolding tools) is reviewed and owned by the repository per `CODING_STANDARDS.md` Section 15.

**Internal structure.**

```
apps/web/
├── package.json
├── tsconfig.json                # Extends tsconfig.base.json; strict mode
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── playwright.config.ts         # Web-specific Playwright config (extends root)
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx           # Root layout with providers
│   │   ├── page.tsx             # Root page (redirects to /login or /dashboard)
│   │   ├── (auth)/              # Auth route group (no nav)
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/               # App route group (with nav)
│   │   │   ├── layout.tsx       # App layout with sidebar + org/clinic switcher
│   │   │   ├── dashboard/page.tsx
│   │   │   └── patients/
│   │   │       ├── page.tsx     # Patient list + search
│   │   │       ├── new/page.tsx # Create patient
│   │   │       └── [id]/page.tsx # Patient profile
│   │   └── api/                 # Next.js route handlers (NOT the primary backend)
│   │       └── health/route.ts  # Health check only; no business logic
│   ├── components/              # React components
│   │   ├── ui/                  # Project-owned base components (buttons, inputs, etc.)
│   │   ├── patient-form.tsx
│   │   ├── patient-list.tsx
│   │   ├── org-switcher.tsx
│   │   └── nav.tsx
│   ├── lib/                     # Web-only helpers (NOT business rules)
│   │   ├── api-client.ts        # Typed API client using packages/contracts
│   │   ├── i18n.ts              # Internationalisation helpers
│   │   └── format.ts            # Locale-aware formatting helpers
│   ├── middleware.ts            # Auth + locale middleware
│   └── styles/
│       └── globals.css          # Tailwind entrypoint
├── public/
│   ├── locales/
│   │   ├── en.json
│   │   └── ar.json
│   └── favicon.ico
└── test/
    └── integration/             # Web integration tests (Vitest)
```

**Allowed dependencies.** `apps/web` may import from: `packages/contracts`, `packages/configuration`, `packages/observability` (for client-side logging only), `next`, `react`, `react-dom`, `tailwindcss`, `zod` (for form-level validation), and any UI-specific libraries ratified by a future ADR. `apps/web` must not import from: `apps/api`, `packages/domain`, `@prisma/client`, `@nestjs/*`, or any backend-specific library.

**Next.js route handlers.** Next.js route handlers in `apps/web/src/app/api/` are not the primary enterprise backend per ADR-012. They are used only for web-specific concerns (health checks, locale negotiation, static-asset optimisation). Authoritative business rules live in `apps/api`.

### 3.2 `apps/api`

**Purpose.** `apps/api` is the NestJS backend application. It is the authoritative backend per ADR-012. Its responsibilities are: implementing the API surface defined in `packages/contracts`, composing domain use cases from `packages/domain`, implementing persistence adapters that map between Prisma types and domain types, enforcing the per-operation verification chain (session, tenant membership, scope, permission, resource ownership per ADR-013 Section 1.4), emitting audit events through `packages/observability`, and handling errors with the structured error envelope.

**Framework.** NestJS with strict TypeScript per ADR-012. Modules are organised by bounded context (patient, organisation, audit, etc.); controllers handle HTTP; services compose use cases; repositories are implemented in the infrastructure layer.

**Persistence.** The Prisma schema lives at `apps/api/prisma/schema.prisma`. The Prisma client is generated into `apps/api/node_modules/.prisma/client` (managed by pnpm workspace). Migrations live in `apps/api/prisma/migrations/`. Raw SQL migrations (per ADR-012 Section 1.4, safeguard 3) live alongside Prisma migrations and are reviewed per `CODING_STANDARDS.md` Section 14.

**Internal structure.**

```
apps/api/
├── package.json
├── tsconfig.json                # Extends tsconfig.base.json; strict mode
├── nest-cli.json
├── vitest.config.ts             # Unit + integration test config
├── prisma/
│   ├── schema.prisma            # Prisma schema (PostgreSQL-first)
│   ├── migrations/              # Prisma migrations + reviewed raw SQL
│   └── seed.ts                  # Synthesised seed data only (per ADR-013 §1.1.12)
├── src/
│   ├── main.ts                  # Application bootstrap
│   ├── app.module.ts            # Root module
│   ├── common/                  # Cross-cutting concerns within the API
│   │   ├── filters/             # Exception filters (error envelope translation)
│   │   ├── interceptors/        # Audit interceptor, logging interceptor
│   │   ├── guards/              # Auth guard, tenant guard, permission guard
│   │   ├── decorators/          # @CurrentUser, @TenantContext, @RequirePermission
│   │   └── pipes/               # Zod validation pipes
│   ├── modules/                 # Bounded-context modules
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   └── strategies/      # Password strategy, future OIDC/SAML strategies
│   │   ├── patients/
│   │   │   ├── patients.controller.ts
│   │   │   ├── patients.service.ts    # Composes use cases from packages/domain
│   │   │   └── patients.module.ts
│   │   ├── organisations/
│   │   ├── audit/
│   │   └── ...
│   └── infrastructure/
│       └── persistence/         # Prisma-backed repository implementations
│           ├── prisma.service.ts      # Prisma client wrapper
│           ├── patients/
│           │   ├── prisma-patient-repository.ts  # Implements packages/domain interface
│           │   └── patient-mapper.ts             # Prisma type ↔ domain type
│           └── ...
└── test/
    ├── unit/                    # Unit tests (Vitest)
    └── integration/             # Integration tests (NestJS testing + Supertest)
```

**Allowed dependencies.** `apps/api` may import from: `packages/contracts`, `packages/domain`, `packages/configuration`, `packages/observability`, `@nestjs/*`, `@prisma/client`, `zod`, `argon2`, and any backend-specific libraries ratified by a future ADR. `apps/api` must not import from: `apps/web`, `next`, `react`, or any frontend-specific library.

**Per-operation verification chain.** The verification chain (session, tenant membership, scope, permission, resource ownership per ADR-013 Section 1.4) is implemented in `apps/api/src/common/guards/`. The chain runs on every protected operation; it is not cached across operations.

---

## 4. Shared Package Structure

### 4.1 `packages/contracts`

**Purpose.** `packages/contracts` defines the API contracts shared between `apps/web` and `apps/api`. It contains Zod schemas for request and response payloads, the structured error envelope definition, the API versioning scheme, and the OpenAPI specification helpers. It is the single source of truth for the shape of data that crosses the API boundary.

**Allowed dependencies.** `packages/contracts` may import from: `zod`, `packages/domain` (for domain types referenced in contracts). It must not import from: `apps/web`, `apps/api`, `@prisma/client`, `next`, `react`, `@nestjs/*`, or any framework.

**Internal structure.**

```
packages/contracts/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Public API
│   ├── auth/                    # Auth contracts (login request/response, session)
│   ├── patients/                # Patient contracts (list, create, detail)
│   ├── organisations/           # Organisation contracts
│   ├── audit/                   # Audit query contracts
│   ├── errors/                  # Structured error envelope
│   └── versioning/              # API versioning scheme
└── test/
    └── unit/
```

### 4.2 `packages/domain`

**Purpose.** `packages/domain` contains the bounded-context domain models, use cases, and repository interfaces. It is pure TypeScript: it imports nothing framework-specific. It is the structural expression of ADR-002's modular architecture and ADR-006's commitment that store technologies are implementation decisions.

**Allowed dependencies.** `packages/domain` may import from: its own sub-packages, `packages/configuration` (for configuration-value types referenced in domain logic). It must not import from: `apps/web`, `apps/api`, `@prisma/client`, `next`, `react`, `@nestjs/*`, `zod` (Zod is for boundary validation, not domain invariant enforcement), or any framework or persistence library.

**Internal structure.**

```
packages/domain/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── patients/                # BC01 Patient bounded context
│   │   ├── models/              # Patient domain model (hand-authored)
│   │   ├── use-cases/           # CreatePatient, UpdatePatient, etc.
│   │   └── repositories/        # PatientRepository interface (no implementation)
│   ├── organisations/           # BC11 CRM and related contexts
│   ├── audit/                   # Audit domain model and use cases
│   └── ...
└── test/
    └── unit/
```

**Repository interfaces.** Repository interfaces are declared in `packages/domain/{context}/repositories/`. The interface declares methods that take and return domain types. The Prisma-backed implementation lives in `apps/api/src/infrastructure/persistence/{context}/` and is injected at the composition root. The separation is the structural guarantee that makes ORM replacement a bounded cost (per `CODING_STANDARDS.md` Section 5).

### 4.3 `packages/configuration`

**Purpose.** `packages/configuration` defines the configuration schema and evaluation helpers that implement ADR-001's configuration-driven architecture and the eight-layer precedence model. It is consumed by `apps/api` (which loads and evaluates configuration) and by `apps/web` (which reads configuration values surfaced through the API).

**Allowed dependencies.** `packages/configuration` may import from: `zod` (for configuration-value validation), `packages/domain` (for domain types referenced in configuration schema). It must not import from: `apps/web`, `apps/api`, `@prisma/client`, `next`, `react`, `@nestjs/*`, or any framework.

**Internal structure.**

```
packages/configuration/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── schema/                  # Configuration schema (Zod)
│   ├── precedence/              # Eight-layer precedence evaluation
│   ├── validation/              # Five-rule validation framework
│   └── types/                   # Configuration type definitions
└── test/
    └── unit/
```

### 4.4 `packages/observability`

**Purpose.** `packages/observability` provides structured logging, audit emission, metrics, and PHI-redaction helpers. It is consumed by `apps/api` (which emits logs and audit events) and by `apps/web` (which emits client-side logs). It is the structural expression of Principle P13 (Auditability as Primitive).

**Allowed dependencies.** `packages/observability` may import from: `zod` (for audit-event schema validation). It must not import from: `apps/web`, `apps/api`, `@prisma/client`, `next`, `react`, `@nestjs/*`, or any framework. The package provides framework-agnostic helpers; framework-specific integration (for example, a NestJS interceptor that uses the audit emitter) lives in the application, not in the package.

**Internal structure.**

```
packages/observability/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── logger/                  # Structured logger with PHI redaction
│   ├── audit/                   # Audit emitter (routes events to the audit store)
│   ├── metrics/                 # Metrics helpers
│   └── redaction/               # PHI and credential redaction rules
└── test/
    └── unit/
```

### 4.5 `packages/testing`

**Purpose.** `packages/testing` provides test fixtures, factories, and shared test utilities. It is consumed by `apps/web`, `apps/api`, and the packages' own test suites. It enforces the rule that tests use synthesised data only (per ADR-013 Section 1.1, point 12).

**Allowed dependencies.** `packages/testing` may import from: `packages/contracts`, `packages/domain` (for domain types used in fixtures), and any test-only library. It must not import from: production code in `apps/web` or `apps/api`, `@prisma/client` (test fixtures use domain types, not Prisma types), or any framework. The package is a `devDependency` of every consumer.

**Internal structure.**

```
packages/testing/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── fixtures/                # Synthesised test data
│   ├── factories/               # Test-data factories
│   └── helpers/                 # Test helpers (clock abstraction, mock factories)
└── test/
    └── unit/
```

---

## 5. Dependency Direction and Boundary Rules

The dependency direction is the structural expression of the canonical spine's bounded-context architecture and of ADR-005's thin-client philosophy. The following eight dependency principles are mandatory.

### 5.1 Domain packages do not import web, API, NestJS, Next.js, Prisma, or UI framework code

Code in `packages/domain` must not import from `apps/web`, `apps/api`, `@prisma/client`, `next`, `react`, `@nestjs/*`, or any UI or persistence framework. The `packages/domain` package is pure TypeScript: domain models, use cases, and repository interfaces. The enforcement is structural: the package's `package.json` declares no framework dependencies, and an import-attempt fails to compile. This is the structural guarantee that makes ORM replacement a bounded cost (per `CODING_STANDARDS.md` Section 5) and that preserves ADR-006's commitment that store technologies are implementation decisions.

### 5.2 Contracts may be consumed by web and API

`packages/contracts` is the shared boundary between `apps/web` and `apps/api`. Both applications may import from `packages/contracts`. The contracts package is framework-agnostic: it imports only from `zod` and from `packages/domain` (for domain types referenced in contracts). The contracts package is the single source of truth for the shape of data that crosses the API boundary; both applications derive their types from the same Zod schemas.

### 5.3 The API application composes domain use cases and persistence adapters

`apps/api` imports from `packages/domain` (for use cases and repository interfaces), from `packages/contracts` (for API request and response shapes), and from `@prisma/client` (for persistence). The API's responsibility is to compose domain use cases, to inject Prisma-backed repository implementations at the composition root, to enforce the per-operation verification chain (per ADR-013 Section 1.4), and to translate between Prisma types and domain types at the persistence-adapter boundary. The API does not author domain logic; it composes domain logic.

### 5.4 The web application consumes contracts and must not contain authoritative business rules

`apps/web` imports from `packages/contracts` (for API request and response shapes) and from `packages/configuration` (for configuration values surfaced through the API). The web application does not import from `apps/api` or from `packages/domain`. The web application is a thin client per ADR-005 and ADR-012: it renders UI, captures user input, validates input at the form level (for user feedback), and calls API endpoints. Authoritative business rules live in `apps/api` and `packages/domain`. The enforcement is structural: the web application's `package.json` does not declare a dependency on `apps/api` or `packages/domain`, and an import-attempt fails to compile.

### 5.5 Prisma schema and adapters belong to the API infrastructure layer, not the domain package

The Prisma schema lives at `apps/api/prisma/schema.prisma`. The Prisma client is generated into `apps/api/node_modules/.prisma/client`. The Prisma-backed repository implementations live in `apps/api/src/infrastructure/persistence/{context}/`. The mapping between Prisma types and domain types lives in `apps/api/src/infrastructure/persistence/{context}/{context}-mapper.ts`. None of these artefacts live in `packages/domain`. The domain package declares repository interfaces; the API infrastructure layer provides the Prisma-backed implementations. This is the structural guarantee that makes ORM replacement a bounded cost (per `CODING_STANDARDS.md` Section 5).

### 5.6 Cross-cutting helpers must not become an ungoverned shared dumping ground

A helper that is used by `apps/web`, `apps/api`, and `packages/domain` must live in the appropriate shared package: `packages/contracts` (for shared types and Zod schemas), `packages/configuration` (for configuration schema and evaluation), `packages/observability` (for logging and audit), or `packages/testing` (for test fixtures and helpers). A helper that is used by only one application lives in that application. The creation of a `utils/`, `common/`, or `shared/` package is forbidden; cross-cutting helpers are classified into the four shared packages by concern, not dumped into a generic shared package. This rule prevents the emergence of an ungoverned shared dumping ground that every module imports from and that accumulates unrelated helpers.

### 5.7 Tests are colocated where useful, with dedicated integration and E2E locations

Unit tests live next to the source file they test (`patient-repository.test.ts` next to `patient-repository.ts`). Integration tests for `apps/api` live in `apps/api/test/integration/`. Integration tests for `apps/web` live in `apps/web/test/integration/`. Integration tests for shared packages live in the package's `test/integration/` directory. End-to-end tests live in `tests/e2e/` at the repository root. This organisation makes tests easy to find, easy to run, and easy to scope to a specific layer of the test pyramid (per `CODING_STANDARDS.md` Section 11).

### 5.8 Existing documentation and prototype directories remain outside the canonical implementation workspace

The existing `download/docs/` documentation tree, the `download/mediflow/` prototype, and the `download/mediflow-pro/` prototype remain in their current locations. They are not moved, renamed, isolated, or deleted by ADR-012 or by this document. They are not part of the canonical implementation workspace (`apps/`, `packages/`, `tests/`). They are not referenced from the canonical implementation's build, test, or deployment pipeline. The prototypes are reference-only per ADR-012 Section 6.5; their business logic and persistence code must not be ported into the canonical implementation. The documentation tree continues to be governed by documentation conventions, not by `CODING_STANDARDS.md`.

---

## 6. Test Organisation

Tests are organised by the test pyramid (per `CODING_STANDARDS.md` Section 11).

| Test type | Location | Tool | Purpose |
|---|---|---|---|
| Unit tests | Next to source file (e.g., `apps/api/src/modules/patients/patients.service.test.ts`) | Vitest | Test a single unit in isolation |
| Package integration tests | `packages/{package}/test/integration/` | Vitest | Test a package's integration with its dependencies |
| API integration tests | `apps/api/test/integration/` | NestJS testing utilities + Supertest | Test API endpoints with the full NestJS stack |
| Web integration tests | `apps/web/test/integration/` | Vitest | Test web components' integration with the API client |
| End-to-end tests | `tests/e2e/` | Playwright | Test the full stack from browser to database |

Test fixtures and factories live in `packages/testing`. Tests use synthesised data only (per ADR-013 Section 1.1, point 12).

---

## 7. Documentation and Prototype Layout

The documentation tree at `download/docs/` is the canonical documentation framework that exists before scaffolding. It contains the Product Bible, the four architecture documents, the ADRs (including ADR-012 and ADR-013 ratified by this work), the security documents, the downstream module references, and the other documentation artefacts. The documentation tree is governed by documentation conventions and by the canonical spine; it is not governed by `CODING_STANDARDS.md`.

The implementation-guide documentation at `docs/` (created at scaffolding time) is distinct from `download/docs/`. The `docs/` directory holds the implementation manifest (recording exact package versions per ADR-012 Section 5.3), the implementation README, and any implementation-guide documentation that is not part of the canonical spine. The `docs/` directory is governed by documentation conventions.

The prototypes at `download/mediflow/` and `download/mediflow-pro/` are reference-only per ADR-012 Section 6.5. They are not moved, renamed, isolated, or deleted. They are not referenced from the canonical implementation's build, test, or deployment pipeline. Selected visual patterns, wording, RTL behaviour, and workflow ideas may inform the new implementation after review (per ADR-012 Section 6.5); the review is recorded in the implementation manifest or in a design note.

---

## 8. Configuration Files

Configuration files at the repository root are shared across the workspace.

| File | Purpose |
|---|---|
| `package.json` | Workspace root; declares workspace scripts and shared devDependencies |
| `pnpm-workspace.yaml` | Declares the workspace packages (`apps/*`, `packages/*`) |
| `tsconfig.base.json` | Shared TypeScript strict configuration; extended by every package and application |
| `eslint.config.mjs` | Shared ESLint configuration; includes package-boundary linting (e.g., `eslint-plugin-import` or `dependency-cruiser`) to enforce Section 5 |
| `prettier.config.mjs` | Shared Prettier configuration |
| `.env.example` | Documented environment variables with placeholder values only; `.env` is gitignored |
| `.gitignore` | Includes `.env`, `node_modules/`, build artifacts, and other ignored paths |

Per-package and per-application configuration files (`tsconfig.json`, `package.json`, framework-specific config) live in the package or application directory. They extend the shared configuration at the repository root.

---

## 9. Build Artifacts and Generated Code

Build artifacts (`dist/`, `build/`, `.next/`) are gitignored. Generated code (Prisma client, generated types) is gitignored where the generator is deterministic and is run at build time; generated code is committed where the generator is non-deterministic or where committing is more reliable than regenerating (per `CODING_STANDARDS.md` Section 15). The Prisma client is gitignored (it is regenerated by `prisma generate`); Zod-inferred TypeScript types are not committed (they are inferred at compile time); scaffolding-tool-generated UI components are committed (they are owned by the repository per ADR-012 Section 1.1, point 11 and `CODING_STANDARDS.md` Section 15).

---

## 10. Naming Conventions

Naming conventions for files, directories, variables, types, and database and API identifiers are defined in `CODING_STANDARDS.md` Section 3. This document does not repeat them; engineers must follow `CODING_STANDARDS.md` Section 3 for all naming.

The repository's directory names follow these conventions: top-level directories use `lowercase` (`apps`, `packages`, `tests`, `docs`, `scripts`). Application and package names use `lowercase` (`web`, `api`, `contracts`, `domain`, `configuration`, `observability`, `testing`). Subdirectories within applications and packages use `kebab-case` (`patient-repository`, `org-switcher`). React component files use `PascalCase` (`PatientForm.tsx`); all other source files use `kebab-case` (`patient-repository.ts`).

---

## 11. Monorepo vs Polyrepo Strategy

The canonical implementation is a monorepo per ADR-012. The monorepo is the first-implementation structure; it is not a permanent architectural commitment. The modular-monolith architecture (per ADR-012 Section 1.1, point 15) preserves a future path to extracting deployable services. When (and if) a bounded context's scale or availability requirements justify extraction, the extraction is a packaging decision, not a re-architecture: the bounded context's package in `packages/domain/{context}/` becomes a separate service; the repository interface remains the same; the API in `apps/api/src/modules/{context}/` either remains in the monolith or migrates to the new service.

The polyrepo alternative was considered and rejected for the first implementation per ADR-012 Section 3.3. A future ADR may ratify polyrepo extraction for one or more bounded contexts when the extraction is justified. Until then, the monorepo is the structure.

The transition from monorepo to polyrepo is governed by the dependency-direction rules in Section 5. The rules are designed to make the extraction bounded: domain packages do not import framework code; contracts are shared; the API composes domain use cases. A bounded context that respects these rules can be extracted with bounded cost.

---

## 12. Related Documents

- `SYSTEM_ARCHITECTURE.md` — Section 5 (High-Level Architecture), Section 6 (Platform Layers), Section 7 (Domain-Driven Architecture)
- `SOFTWARE_ARCHITECTURE.md` — Section 3 (Layered Architecture), Section 6 (Dependency Management)
- `MODULE_ARCHITECTURE.md` — Section 2 (Module Catalogue)
- `CONFIGURATION_ARCHITECTURE.md` — Section 5 (Configuration Strategy)
- `CODING_STANDARDS.md` — implementation-grade coding standards (companion to this document)
- `12_ADR/012_APPLICATION_PLATFORM_AND_REPOSITORY_STRUCTURE.md` — authoritative ADR ratifying the structure described in this document
- `12_ADR/013_AUTHENTICATION_AND_SESSION_STRATEGY.md` — authentication and session strategy implemented in `apps/api` per this structure
