# Ibn Hayan Healthcare Operating System
## Coding Standards

> **Document Purpose:** The mandatory coding standards governing all source code in the Ibn Hayan Healthcare Operating System — TypeScript strictness, naming, module and dependency boundaries, domain isolation, validation, error handling, logging, audit, tenant scope, testing, accessibility, localisation, secrets handling, migration review, generated-code review, and commit size. These standards are the implementation-grade baseline required for scaffolding and for the first vertical slice; they are not a complete coding handbook.
>
> **Status:** Ratified · **Version:** 1.0.0 · **Last Updated:** 2026-07-18
>
> This document is part of the official Ibn Hayan Healthcare Operating System
> documentation framework and serves as the authoritative reference for its
> respective domain. It is intended for the entire product, engineering,
> design, clinical, and operations teams.

---

## Table of Contents

1. General Principles
2. TypeScript Standards
3. Naming Conventions
4. Module and Dependency-Boundary Rules
5. Domain Isolation from Framework and ORM Types
6. Validation at External Boundaries
7. Error Handling Standards
8. Logging and PHI Redaction
9. Audit Requirements
10. Tenant-Scope Requirements
11. Testing Standards
12. Accessibility and Localisation Requirements
13. Secrets and Environment-Variable Handling
14. Migration Review Requirements
15. Generated-Code Review Requirements
16. Commit Size and Reviewability
17. Related Documents

---

## 1. General Principles

These coding standards are the implementation-grade baseline required by ADR-012 for scaffolding and for the first vertical slice. They are not a complete coding handbook; they are the minimum rules that every engineer must follow from the first commit. Where a rule is not stated here, the canonical spine (`SYSTEM_ARCHITECTURE.md`, `SOFTWARE_ARCHITECTURE.md`, `MODULE_ARCHITECTURE.md`, `CONFIGURATION_ARCHITECTURE.md`) and the ratified ADRs prevail.

Three principles govern these standards. First, the standards exist to make the canonical spine's commitments enforceable in code; a standard that does not serve a canonical commitment is debt. Second, the standards are minimal but non-negotiable; an engineer who finds a standard inconvenient must raise the inconvenience through the Architecture Council, not ignore the standard. Third, the standards are versioned; changes to these standards require Architecture Council ratification through a version increment of this document, recorded in the platform CHANGELOG.

These standards apply to every line of code in the canonical implementation: `apps/web`, `apps/api`, and every package under `packages/`. They do not apply to the existing prototypes under `download/mediflow/` and `download/mediflow-pro/`, which are reference-only per ADR-012 Section 6.5 and are not part of the canonical implementation. They do not apply to the documentation tree under `download/docs/`, which is governed by documentation conventions, not coding standards.

---

## 2. TypeScript Standards

TypeScript is ratified as the implementation language for both `apps/web` and `apps/api` and for every package under `packages/` per ADR-012. The following TypeScript rules are mandatory.

**Strict mode is mandatory.** Every `tsconfig.json` in the repository must enable `"strict": true`. This enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, and `alwaysStrict`. Strict mode is not optional; disabling any strict flag requires Architecture Council ratification through an ADR.

**No implicit `any`.** The `noImplicitAny` flag must remain enabled. Function parameters, return types, and variables must not implicitly resolve to `any`. Where the type is genuinely unknown (for example, when parsing untrusted input), the code must use `unknown` and narrow the type explicitly. The use of `any` as an explicit type annotation requires a justifying comment and is a code-review blocker unless the justification is accepted.

**No unchecked type assertions.** Type assertions (`as Type`) are permitted only with justification. The preferred pattern is type narrowing via `typeof`, `instanceof`, or a type-guard function. Where a type assertion is unavoidable (for example, when bridging a third-party library's loose types), the assertion must be accompanied by a comment explaining why the assertion is safe and why narrowing is not possible. The use of `<Type>value` (angle-bracket assertion syntax) is forbidden in `.ts` files (it conflicts with JSX in `.tsx` files); `value as Type` is the only permitted assertion syntax.

**No non-null assertion operator.** The `!` (non-null assertion) operator is forbidden in domain code (`packages/domain`) and is discouraged elsewhere. Where a value may be `null` or `undefined`, the code must narrow the type explicitly. The use of `!` requires a justifying comment and is a code-review blocker unless the justification is accepted.

**`unknown` over `any` for untrusted input.** Data that crosses an external boundary (HTTP request body, query parameter, environment variable, file content, third-party API response) must be typed as `unknown` until it has been validated by a Zod schema (Section 6). The use of `any` for untrusted input is forbidden.

**Explicit return types on exported functions.** Exported functions must declare their return type explicitly. Inferred return types on exported functions are forbidden because they produce brittle public APIs: a refactor that changes an inferred return type silently changes the public API.

**`enum` is discouraged; union types are preferred.** TypeScript `enum` has runtime and structural quirks that produce bugs. String-literal union types (`type Status = 'active' | 'inactive' | 'revoked'`) are preferred. Where an `enum` is unavoidable (for example, when a library requires it), the `enum` must be declared `const enum` and must be reviewed.

---

## 3. Naming Conventions

Consistent naming reduces cognitive load and makes code searchable. The following conventions are mandatory.

**Files and directories.** File names use `kebab-case` for non-React files (`patient-repository.ts`, `audit-emitter.ts`) and `PascalCase` for React component files (`PatientForm.tsx`, `OrgSwitcher.tsx`). Directory names use `kebab-case`. Test files use the source file's name with a `.test` suffix (`patient-repository.test.ts`) or a `.spec` suffix for end-to-end tests (`login-flow.spec.ts`).

**Variables, functions, and methods.** Use `camelCase` for variables, functions, and methods. Boolean variables and predicates are prefixed with `is`, `has`, or `should` (`isActive`, `hasPermission`, `shouldRotate`). Single-letter variable names are forbidden except for loop indices (`i`, `j`, `k`) and coordinate axes (`x`, `y`).

**Types, interfaces, and classes.** Use `PascalCase` for types, interfaces, and classes. Interface names do not have an `I` prefix (the `I` prefix is a Hungarian-notation artefact that TypeScript does not need). Type names are singular (`Patient`, not `Patients`); collection types are suffixed with `List`, `Map`, or `Set` as appropriate (`PatientList`, `PatientMap`).

**Constants.** Use `SCREAMING_SNAKE_CASE` for module-level constants that are truly constant (`DEFAULT_PAGE_SIZE`, `MAX_LOGIN_ATTEMPTS`). Use `camelCase` for constants that are computed at runtime or that are configuration values loaded from environment or configuration.

**Enums and union types.** Union type members use `kebab-case` string literals (`type Status = 'active' | 'inactive' | 'revoked'`) for serialised values and `PascalCase` for in-memory-only values. When a union type is used for serialised values, the values must be stable across versions; renaming a serialised value is a breaking change.

**Database and API identifiers.** Database table names use `snake_case` (`patients`, `audit_logs`, `organisation_memberships`). Database column names use `snake_case` (`created_at`, `tenant_id`, `last_activity_at`). API URL paths use `kebab-case` (`/api/v1/organisation-memberships`). API JSON field names use `camelCase` (`organisationId`, `lastActivityAt`) for response payloads and accept `snake_case` aliases on request payloads only where a third-party integration requires it. The translation between `snake_case` database columns and `camelCase` API fields happens at the persistence-adapter boundary in `apps/api`, not in `packages/domain` (Section 5).

---

## 4. Module and Dependency-Boundary Rules

Module boundaries are the structural expression of the canonical spine's bounded-context architecture. The following rules are mandatory and are enforced by package-import linting where possible.

**Dependency direction is acyclic.** Module dependencies must form a directed acyclic graph. Circular dependencies are forbidden. Where a circular dependency appears to be necessary, the modules are mis-decomposed and must be refactored.

**`packages/domain` imports nothing framework-specific.** Code in `packages/domain` must not import from `apps/web`, `apps/api`, `@prisma/client`, `next`, `react`, `@nestjs/*`, or any UI or persistence framework. The `packages/domain` package contains pure TypeScript: domain models, use cases, and repository interfaces. The enforcement is structural — the package's `package.json` declares no framework dependencies, and an import-attempt fails to compile.

**`packages/contracts` imports only `zod`.** Code in `packages/contracts` may import from `zod` and from `packages/domain` (for domain types referenced in contracts). It must not import from `apps/web`, `apps/api`, `@prisma/client`, or any framework. Contracts are the shared boundary between `apps/web` and `apps/api`; they must remain framework-agnostic.

**`apps/web` imports from `packages/contracts` and `packages/configuration` only; not from `apps/api` or `packages/domain`.** The web application is a thin client per ADR-005 and ADR-012. It consumes API contracts; it does not compose domain use cases. The web application may import from `packages/observability` for client-side logging, but must not import from `packages/domain` or `apps/api`.

**`apps/api` composes domain use cases and persistence adapters.** The API application imports from `packages/domain`, `packages/contracts`, `packages/configuration`, `packages/observability`, and `@prisma/client`. It is the only application that imports from `@prisma/client`. The Prisma schema lives in `apps/api/prisma/schema.prisma`; the Prisma client is generated into `apps/api/node_modules/.prisma/client`; the repository implementations that map between Prisma types and domain types live in `apps/api/src/infrastructure/persistence/`.

**Cross-cutting helpers must not become a shared dumping ground.** A helper that is used by `apps/web`, `apps/api`, and `packages/domain` must live in the appropriate shared package (`packages/contracts`, `packages/configuration`, `packages/observability`, or `packages/testing`). A helper that is used by only one application lives in that application. The creation of a "utils" or "common" package is forbidden; cross-cutting helpers are classified into the four shared packages by concern, not dumped into a generic shared package.

**Feature directories, not layer directories.** Within `packages/domain` and within `apps/api/src`, code is organised by feature (bounded context), not by layer. `packages/domain/patients/` contains the Patient bounded context's models, use cases, and repository interfaces. `apps/api/src/patients/` contains the Patient API routes, request handlers, and persistence adapters. The layering is within the feature: `patients/models/`, `patients/use-cases/`, `patients/repositories/`. This organisation makes bounded-context boundaries visible in the file tree and makes it easy to extract a bounded context into a separate service in the future.

---

## 5. Domain Isolation from Framework and ORM Types

Domain isolation is the structural expression of ADR-006's commitment that store technologies are implementation decisions, not architectural identity. The following rules are mandatory and are the basis of the Prisma safeguards in ADR-012 Section 1.4.

**Domain types are authored by hand.** Types in `packages/domain` are authored by hand as TypeScript interfaces and types. They are not generated by an ORM, a schema tool, or a code generator. The domain types reflect the domain's ubiquitous language, not the database's table structure.

**Prisma types do not leak into the domain.** Code in `packages/domain` must not import from `@prisma/client` or any Prisma-generated type. The repository interface declares domain types; the Prisma-backed implementation in `apps/api/src/infrastructure/persistence/` maps between Prisma types and domain types. The mapping is explicit and is tested.

**Repository interfaces are declared in `packages/domain`.** The repository interface for each bounded context is declared in `packages/domain/{context}/repositories/`. The interface declares methods that take and return domain types. The Prisma-backed implementation is declared in `apps/api/src/infrastructure/persistence/{context}/` and is injected at the composition root. The API layer depends on the interface, not on the implementation.

**Persistence mapping is explicit and tested.** The mapping between Prisma types and domain types is explicit (no implicit conversion) and is tested (mapping tests live in `apps/api/src/infrastructure/persistence/{context}/*.test.ts`). A change to the Prisma schema that breaks the mapping is caught by the mapping tests.

**Domain invariants are enforced in the domain, not in the database.** Database constraints (foreign keys, unique constraints, check constraints) are a backstop, not the primary enforcement. Domain invariants (for example, "a patient's date of birth cannot be in the future") are enforced in `packages/domain` use cases. The database constraint is a defence-in-depth check; the domain check is the authoritative enforcement.

**Future ORM replacement is bounded.** If Prisma is replaced by a different ORM or query builder in the future (per ADR-012 Section 3.4), the replacement touches only `apps/api/src/infrastructure/persistence/` and the Prisma schema. `packages/domain` is unchanged. The repository interfaces remain the same; only the implementations change. This is the structural guarantee that makes ORM replacement a bounded cost.

---

## 6. Validation at External Boundaries

Validation at external boundaries is mandatory. Untrusted input is never trusted until it has been validated by a Zod schema. The following rules are mandatory.

**Zod is the validation library.** Zod is ratified as the validation library per ADR-012. Schemas are declared in `packages/contracts` for API request and response payloads, in `packages/configuration` for configuration values, and in `apps/api/src/{context}/` for context-internal validation. Zod schemas are the single source of truth for the shape of validated data; TypeScript types are inferred from Zod schemas via `z.infer<typeof schema>`.

**Every external boundary is validated.** The following boundaries require Zod validation: HTTP request bodies, query parameters, path parameters, and headers (in `apps/api`); API response payloads (in `apps/api`); configuration values loaded from environment or configuration store (in `packages/configuration`); third-party API responses (in `apps/api`); file contents parsed by the platform (in `apps/api`); and any data that crosses a process or trust boundary.

**`unknown` until validated.** Data that crosses an external boundary is typed as `unknown` until it has been validated. The use of `any` for untrusted input is forbidden (Section 2). Validation produces a typed value that can be trusted downstream.

**Validation failures are 400 Bad Request.** A validation failure at the API boundary is a 400 Bad Request response with a structured error envelope (Section 7). The error envelope includes the field path, the validation rule that failed, and a human-readable message. The error envelope does not include the rejected value if the value may contain PHI.

**Domain invariants are separate from boundary validation.** Boundary validation (Zod) checks that the input is well-formed (the right shape, the right types, the right format). Domain invariant validation (in `packages/domain` use cases) checks that the input is semantically valid (a date of birth is not in the future, a patient does not already exist with the same identifier). Boundary validation runs first; domain invariant validation runs second. Both are mandatory; neither is sufficient alone.

---

## 7. Error Handling Standards

Structured error handling is mandatory. The following rules govern error handling across the implementation.

**Errors are classified.** Every error is one of: a validation error (input is malformed), a domain invariant violation (input is well-formed but semantically invalid), a not-found error (the requested resource does not exist), an authorisation error (the user is not permitted to perform the operation), a conflict error (the operation conflicts with the current state), an internal error (an unexpected failure), or a downstream error (a dependency failed). The classification determines the HTTP status code and the error envelope.

**Structured error envelope.** API errors are returned as a structured JSON envelope:

```
{
  "error": {
    "code": "VALIDATION_ERROR" | "DOMAIN_INVARIANT_VIOLATION" | "NOT_FOUND" | "AUTHORISATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR" | "DOWNSTREAM_ERROR",
    "message": "Human-readable message in the response locale",
    "details": { /* optional, field-level details */ },
    "requestId": "unique-request-identifier",
    "timestamp": "ISO-8601 timestamp"
  }
}
```

The error envelope does not include stack traces, internal class names, or other implementation details in production. Development environments may include additional detail behind a feature flag.

**Errors are thrown, not returned.** Within `apps/api` and `packages/domain`, errors are thrown as typed error instances (`ValidationError`, `DomainInvariantViolationError`, `NotFoundError`, etc.). The API boundary catches the errors and translates them to the structured error envelope. The use of `{ error: ... }` return values is forbidden; the use of `Result<T, E>` types is permitted in `packages/domain` for operations where the error is part of the domain contract (for example, a use case that may return a domain invariant violation).

**No silent error swallowing.** A `catch` block that does not rethrow, log, or otherwise handle the error is forbidden. Every `catch` block must either rethrow the error, log the error with sufficient context, or transform the error into a domain-meaningful error. Empty `catch` blocks are forbidden.

**Audit on authorisation errors.** Authorisation errors (403 Forbidden) emit an audit event through `packages/observability`. The audit event includes the actor, the attempted operation, the resource, the reason for denial, and the request metadata. Repeated authorisation errors from the same actor may trigger security alerts.

**Internal errors are logged with context.** Internal errors (500 Internal Server Error) are logged with the request context (request ID, actor, operation, tenant) through `packages/observability`. The log entry does not include PHI. The stack trace is logged in development and in staging; in production, the stack trace is logged to a separate internal log channel, not to the API response.

---

## 8. Logging and PHI Redaction

Safe logging is mandatory. The following rules govern logging across the implementation.

**Structured logging.** All logs are structured JSON logs emitted through `packages/observability`. The log entry includes a timestamp, a log level (`debug`, `info`, `warn`, `error`), a message, a request ID, an actor ID (where applicable), a tenant ID (where applicable), and a context object. Unstructured `console.log` calls are forbidden in production code; they are permitted only in local development scripts.

**PHI redaction is mandatory.** Logs must not include protected health information. The following fields are forbidden in logs: patient name, patient date of birth, patient address, patient contact details, patient identifiers (medical record number, national ID, insurance ID), clinical notes, medication names, diagnosis codes, and any field labelled as PHI in `09_SECURITY/COMPLIANCE/`. The `packages/observability` logger redacts known PHI fields automatically; engineers must not bypass the redaction.

**Log levels.** `debug` is for development-only diagnostics. `info` is for normal operations (request received, request completed, audit event emitted). `warn` is for unusual but non-error conditions (rate-limit threshold approached, deprecated API used). `error` is for error conditions (validation failure, authorisation failure, internal error, downstream error). `fatal` is for conditions that require process restart; it is used sparingly.

**No credentials in logs.** Logs must not include passwords, session secrets, API keys, tokens, or any credential material. The `packages/observability` logger redacts known credential fields automatically; engineers must not bypass the redaction.

**Request-scoped logging.** Every request has a request ID (generated at the API boundary). All log entries for a request include the request ID. The request ID is returned in the API response (in the error envelope for errors; in a response header for successful responses). This enables request-scoped log queries.

**Log retention.** Log retention is governed by `09_SECURITY/COMPLIANCE/DATA_RETENTION.md` and by the deployment topology (deferred per ADR-012). The implementation must not enforce a specific retention policy; the deployment environment enforces retention.

---

## 9. Audit Requirements

Audit is a primitive per Principle P13. The following rules govern audit emission across the implementation.

**Audit events are emitted through `packages/observability`.** Audit events are not emitted directly to a database or a log; they are emitted through the audit emitter in `packages/observability`. The audit emitter is responsible for routing the event to the audit store (whose technology is deferred per ADR-006).

**Audit events are immutable.** Audit events are append-only. The implementation must not provide an update or delete operation on audit events. An audit event that contains an error is corrected by emitting a new audit event that references the original; the original is not modified.

**Audit events include the required fields.** Every audit event includes: actor (user identity), action (the operation performed), timestamp (when the event occurred), tenant context (the tenant in which the event occurred), organisation and facility context (where applicable), session identifier (not the session secret), request metadata (IP address, user agent), outcome (success or failure), and a detail object (operation-specific details). Audit events do not include passwords, session secrets, or any credential material.

**Consequential actions are audited.** The following actions emit audit events: authentication (login, logout, failed login, session rotation, session revocation); context changes (organisation or facility selection); patient CRUD (create, update, delete, view where the view is sensitive); configuration changes; permission changes; role changes; and any action labelled as consequential in `09_SECURITY/AUDIT.md`.

**Audit emission is synchronous within the request.** Audit emission happens within the request that performs the action, not in a background job. If the audit store is unavailable, the request fails (the action is not performed without an audit trail). The exception is read-only operations on non-sensitive data, where audit emission may be asynchronous if the audit store is unavailable; the audit event is queued and retried.

**Audit events are testable.** Audit emission is tested in integration tests. Every consequential action has an integration test that verifies the audit event was emitted with the required fields. Missing audit events are test failures.

---

## 10. Tenant-Scope Requirements

Tenant scope is mandatory per ADR-004 and ADR-013. The following rules govern tenant scope across the implementation.

**Tenant context is established server-side.** Tenant context is established from the authenticated session per ADR-013 Section 1.5. Browser-supplied tenant identifiers are untrusted input and are verified against the session's tenant membership before use.

**Every database query is tenant-scoped.** Every database query that touches tenant-scoped data includes a tenant filter. The filter is applied at the repository-implementation layer in `apps/api/src/infrastructure/persistence/`. The repository interface in `packages/domain` declares the tenant context as a parameter; the implementation applies the filter. A query that does not include a tenant filter is a defect.

**Row-level security is a backstop.** PostgreSQL row-level security policies are a backstop for tenant isolation, not the primary enforcement. The primary enforcement is the tenant filter in the repository implementation. Row-level security catches defects where the repository implementation forgets the tenant filter; it is not a substitute for the filter.

**Tenant context is propagated through the request.** The tenant context is established at the API boundary (from the session) and is propagated through the request via a request-scoped context object. The context object is passed to use cases, repositories, and audit emitters. The use of global state (a module-level variable) for tenant context is forbidden because it breaks under concurrent requests.

**Cross-tenant operations require an ADR.** Any operation that intentionally accesses data across tenants (for example, a platform-level administrative operation) requires an ADR that ratifies the operation, its authorisation requirements, its audit requirements, and its safeguards. The default is that operations are single-tenant; cross-tenant operations are exceptions.

---

## 11. Testing Standards

Testing is mandatory from the first commit. The following rules govern testing across the implementation.

**Test pyramid.** The test pyramid is: many unit tests (Vitest), fewer integration tests (NestJS testing utilities + Supertest for `apps/api`; Vitest for `packages/*`), and a small number of end-to-end tests (Playwright). The pyramid is a guideline, not a quota; the goal is that every consequential behaviour is tested at the appropriate level.

**Unit tests live next to the source.** Unit test files live next to the source file they test (`patient-repository.test.ts` next to `patient-repository.ts`). This makes tests easy to find and easy to run.

**Integration tests live in a dedicated directory.** Integration tests for `apps/api` live in `apps/api/test/integration/`. Integration tests for `apps/web` (testing the web application's integration with the API) live in `apps/web/test/integration/`. Integration tests for shared packages live in the package's `test/integration/` directory.

**End-to-end tests live in a dedicated directory.** End-to-end tests live in `tests/e2e/` at the repository root. End-to-end tests use Playwright and exercise the full stack from browser to database.

**Tests use synthesised data only.** Tests must not use real patient data or production credentials (per ADR-013 Section 1.1, point 12). Test fixtures and factories live in `packages/testing`. The use of production data snapshots in tests is forbidden.

**Tests are deterministic.** Tests must not depend on the current time, on network conditions, or on the order of test execution. The current time is injected via a clock abstraction; network calls are mocked; test order is independent.

**Tests are fast.** The unit test suite runs in under 30 seconds. The integration test suite runs in under 5 minutes. The end-to-end test suite runs in under 15 minutes. Tests that exceed these budgets are flagged for optimisation.

**Coverage is a signal, not a target.** Code coverage is measured but is not a target. The target is that every consequential behaviour is tested. Coverage is a signal for untested code; 100% coverage with weak assertions is worse than 80% coverage with strong assertions.

**CI runs the full test suite.** The CI workflow runs lint, type-check, unit tests, integration tests, end-to-end tests, and build on every pull request. A pull request is not mergeable until CI passes.

---

## 12. Accessibility and Localisation Requirements

Accessibility and localisation are first-class requirements from the first implemented screen per ADR-012 and ADR-005. The following rules are mandatory.

**Arabic and English from the first screen.** Every screen in `apps/web` must support Arabic and English from the first implementation. Strings are not hardcoded; they are loaded from a translation dictionary. The translation dictionary is keyed by a stable string identifier; the identifier does not change when the string is translated.

**RTL and LTR from the first screen.** Every screen in `apps/web` must support right-to-left and left-to-right layout from the first implementation. The `<html dir>` attribute is set based on the active locale. CSS uses logical properties (`margin-inline-start`, `padding-inline-end`) rather than physical properties (`margin-left`, `padding-right`) where the framework supports it.

**WCAG 2.1 AA is the baseline.** Every screen in `apps/web` must meet WCAG 2.1 AA from the first implementation. This includes: semantic HTML, ARIA attributes where necessary, keyboard navigation for every interactive element, visible focus indicators, sufficient colour contrast, and text alternatives for non-text content.

**Keyboard navigation is mandatory.** Every interactive element in `apps/web` must be operable with the keyboard. The Tab order is logical; the focus indicator is visible; modal dialogs trap focus; Escape closes modals. Mouse-only interactions are forbidden.

**Forms are accessible.** Every form field in `apps/web` has a label, an accessible name, and an accessible description. Validation errors are announced to assistive technology. Required fields are indicated semantically, not only visually.

**Localisation is not translation only.** Localisation includes number formatting, date formatting, time-zone handling, currency formatting, and plural rules. The implementation uses the `Intl` API for formatting; custom formatting logic is forbidden.

**Accessibility tests are part of the test suite.** End-to-end tests include accessibility assertions (axe-core checks via Playwright). A screen that fails an accessibility check is a test failure.

---

## 13. Secrets and Environment-Variable Handling

Secrets and environment variables are handled with care. The following rules are mandatory.

**No secrets in code.** Secrets (passwords, API keys, tokens, connection strings with credentials) must not appear in source code. Secrets are loaded from environment variables at runtime.

**Real `.env` files must not be committed.** A real `.env` file containing secret or environment-specific values must not be committed to the repository. The `.gitignore` file must include `.env`. Only `.env.example` files may be committed, and only with non-secret example values that document the required environment variables.

**A tracked `.env` file is a repository-hygiene violation.** A real `.env` file tracked by git is a repository-hygiene violation. Untracking the file, adding it to `.gitignore`, and creating a safe `.env.example` is a separate reviewed task that is not part of this document.

**Credential rotation is conditional.** Rotation is mandatory when the tracked value contains usable credentials, identifies an externally hosted sensitive service, or cannot reasonably be proven non-sensitive. Rotation is not automatically required merely because a file named `.env` exists in git history. The current safe audit found that the root `.env` file is tracked, that no embedded username or password credentials were detected, and that no recognised external host was detected; immediate credential rotation was therefore not established as necessary. The tracked value itself is not copied into this document.

**Future implementation-foundation task.** A future implementation-foundation task must remove `.env` from git tracking, preserve it in `.gitignore`, create a safe `.env.example`, verify whether the tracked value has ever been used by a real service, and decide separately whether history rewriting is necessary. This task does not modify `.env` during the current decision-package ratification and does not run `git filter-repo`.

**Environment variables are validated.** Environment variables are loaded and validated by a Zod schema at application startup. An invalid or missing environment variable causes the application to fail fast with a clear error message.

**Secrets are not logged.** Secrets must not appear in logs (Section 8). The `packages/observability` logger redacts known secret fields automatically; engineers must not bypass the redaction.

**Production secrets are not used in development.** Production credentials must not be used in development, seeds, demonstrations, screenshots, or tests (per ADR-013 Section 1.1, point 12). Development and test environments use synthesised credentials only.

---

## 14. Migration Review Requirements

Database migrations are reviewed with care. The following rules govern migration review.

**Migrations are reviewed.** Every database migration (Prisma migration or raw SQL migration) is reviewed by at least one engineer other than the author. The review verifies: the migration is reversible (or the irreversibility is justified), the migration does not break existing data, the migration does not lock the database for an unacceptable duration, and the migration respects tenant isolation.

**Raw SQL migrations require explicit review.** Raw SQL migrations (per ADR-012 Section 1.4, safeguard 3) require explicit review. The review verifies: the SQL is correct, the SQL uses PostgreSQL features that Prisma cannot express, the SQL is idempotent where possible, and the SQL is documented.

**Migrations are tested.** Migrations are tested by running them against a copy of the production schema (with synthesised data) in CI. A migration that fails or that corrupts data is a CI failure.

**Migrations are reversible where possible.** A migration should include a down-migration (a reversal) where reversal is possible. Irreversible migrations (for example, dropping a column) require a justifying comment and are flagged in review.

**Migrations are small.** A migration should make one change. A migration that makes multiple unrelated changes is split into multiple migrations. This makes review easier and makes rollback more granular.

**Migrations do not include PHI.** Seed migrations must not include real patient data (per ADR-013 Section 1.1, point 12). Seed migrations use synthesised data only.

---

## 15. Generated-Code Review Requirements

Generated code is reviewed and owned. The following rules govern generated code.

**Generated code is reviewed.** Code generated by a scaffolding tool, a component generator (e.g., shadcn/ui-style generators), or an AI coding assistant is reviewed by an engineer before merge. The review verifies: the code is correct, the code follows these coding standards, the code does not introduce unwanted dependencies, and the code is owned by the repository (not a runtime dependency on a generator).

**Generated code is committed.** Generated code is committed to the repository. The repository does not depend on a generator at runtime or at build time. The generator is a development-time tool only.

**Generated code is attributed.** Generated code includes a comment attributing the generator and the date of generation. The attribution makes it possible to track generated code and to regenerate it if the generator is updated.

**Generated code is tested.** Generated code is tested like hand-authored code. The fact that code is generated does not exempt it from testing.

**Generated code is refactored when appropriate.** Generated code is a starting point, not a final state. Engineers refactor generated code to fit the application's specific needs. The refactoring is reviewed.

**Prisma-generated types are not domain types.** Prisma-generated types (in `@prisma/client`) are not domain types. They are mapped to domain types at the persistence-adapter boundary (Section 5). The fact that Prisma generates types does not exempt the domain from authoring its own types.

---

## 16. Commit Size and Reviewability

Commits are small and reviewable. The following rules govern commit size.

**One concern per commit.** A commit addresses one concern. A commit that addresses multiple unrelated concerns is split into multiple commits. Examples of a single concern: a single ADR ratification, a single canonical document elaboration, a single application scaffold step, a single library addition with tests, a single API endpoint with tests, a single UI screen with tests.

**Commits are self-contained.** A commit leaves the repository in a working state. A commit that breaks the build, breaks tests, or leaves the repository in an unusable state is forbidden. The exception is a commit that is explicitly marked as work-in-progress (prefixed with `WIP:`); such commits are not merged to `main`.

**Commit messages are descriptive.** A commit message's first line is a short summary (under 72 characters) in the imperative mood ("Add patient creation API endpoint", not "Added patient creation API endpoint"). The body (where present) explains why the change is made, not what the change is (the diff shows what). The body wraps at 72 characters.

**Commits are reviewable in under 30 minutes.** A commit that takes more than 30 minutes to review is too large and is split into smaller commits. The 30-minute guideline is a target, not a quota; some commits (for example, a documentation elaboration) may take longer to review.

**Pull requests are small.** A pull request contains a small number of commits (typically 1 to 5). A pull request that contains many commits is split into multiple pull requests. The goal is that a reviewer can hold the entire pull request in their head.

**Squash merges are permitted.** A pull request may be squash-merged into `main` if the individual commits are not valuable as historical artefacts. The squash-merge commit message follows the same rules as a regular commit message.

---

## 17. Related Documents

- `SYSTEM_ARCHITECTURE.md` — Section 4 (Architectural Principles), Section 20 (Security Architecture), Section 27 (Audit Architecture)
- `SOFTWARE_ARCHITECTURE.md` — Section 3 (Layered Architecture), Section 6 (Dependency Management), Section 7 (Cross-Cutting Concerns)
- `MODULE_ARCHITECTURE.md` — Section 2 (Module Catalogue)
- `CONFIGURATION_ARCHITECTURE.md` — Section 5 (Configuration Strategy)
- `FOLDER_STRUCTURE.md` — ratified repository structure
- `09_SECURITY/AUTHENTICATION.md` — authentication narrative
- `09_SECURITY/AUTHORIZATION.md` — authorisation narrative
- `09_SECURITY/AUDIT.md` — audit narrative
- `09_SECURITY/COMPLIANCE/HIPAA.md` — PHI compliance
- `09_SECURITY/COMPLIANCE/PRIVACY_POLICY.md` — privacy policy
- `12_ADR/012_APPLICATION_PLATFORM_AND_REPOSITORY_STRUCTURE.md` — application platform and repository structure
- `12_ADR/013_AUTHENTICATION_AND_SESSION_STRATEGY.md` — authentication and session strategy
