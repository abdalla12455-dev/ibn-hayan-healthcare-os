# ADR-012: Application Platform and Repository Structure
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-012: Application Platform and Repository Structure |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Accepted Decision |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review when any ratified technology is superseded, when the modular monolith is considered for extraction into deployable services, or when a secondary store (analytical, cache, object, audit) is ready for ratification |
| Audience | Senior software architects, engineering leadership, frontend and backend module owners, platform infrastructure owners, developer-experience owners, product council, security council |
| Scope | The decision to ratify the application platform, repository structure, primary frameworks, persistence foundation, validation foundation, styling foundation, testing foundation, and prototype-disposition rules for the Ibn Hayan canonical implementation. This ADR governs the structural shape of the first implementation and the boundaries that the first vertical slice must respect. It does not ratify deployment topology, cloud provider, orchestration, or any secondary-store technology. |
| Out of Scope | Deployment topology, container orchestration, cloud provider selection, analytical store, cache store, object store, dedicated audit-store technology, exact package patch versions (recorded in the implementation manifest and lockfile, not in this ADR), the non-pharmacy inventory module packaging decision (deferred to a future ADR referenced by ADR-010 Section 6.1) |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md`, `SOFTWARE_ARCHITECTURE.md`, `MODULE_ARCHITECTURE.md`, or `CONFIGURATION_ARCHITECTURE.md` is resolved in favour of the canonical spine until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR or an explicit version increment of this ADR, recorded in the platform CHANGELOG |

> **Document Purpose:** This ADR ratifies the application platform, repository structure, and primary technology foundations for the canonical Ibn Hayan implementation. It confirms a TypeScript monorepo with `apps/web` (Next.js with App Router, React, strict TypeScript) as a thin client and `apps/api` (NestJS, strict TypeScript) as the backend, with five shared packages (`contracts`, `domain`, `configuration`, `observability`, `testing`). It ratifies PostgreSQL as the transactional system of record, Prisma as the initial ORM with explicit safeguards (domain isolation, repository interfaces, reviewed raw SQL for PostgreSQL features Prisma cannot express), Zod for contract and boundary validation, Tailwind CSS with project-owned accessible UI components for web styling, and Vitest / NestJS testing utilities + Supertest / Playwright as the testing foundation. It records the disposition of the existing `download/mediflow/` and `download/mediflow-pro/` prototypes as reference-only. It defers deployment topology, orchestration, cloud provider, and all secondary-store technology selections to future ADRs.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 1.2 (downstream authority — `docs/01_ARCHITECTURE/`), Section 4 (Architectural Principles — P1, P2, P3, P5, P10, P13, P14, P18), Section 5 (High-Level Architecture), Section 6 (Platform Layers — Experience Layer, Platform Services Layer, Domain Layer, Data Layer), Section 7 (Domain-Driven Architecture — bounded context ownership), Section 8 (Configuration-Driven Architecture), Section 14 (Feature Flag Strategy — ADR-007 packaging), Section 19 (Integration Architecture), Section 20 (Security Architecture), Section 26 (Localization Architecture), Section 27 (Audit Architecture). `SOFTWARE_ARCHITECTURE.md` Section 3 (Layered Architecture), Section 6 (Dependency Management), Section 10 (Technology Stack — selection criteria, not technology commitments). `MODULE_ARCHITECTURE.md` Section 2 (Module Catalogue — 19 modules). `CONFIGURATION_ARCHITECTURE.md` Section 5.7 (v1 implementation packaging — ADR-007).

> **Related Product Bible Sections:** `PRODUCT_BIBLE.md` Section 5 (Core Principles — P-2 Configuration Before Customization, P-3 One Platform), Section 6 (Design Principles — D-1 Healthcare First, D-5 Enterprise Scalability, D-10 Observable, Auditable, Accountable), Section 19 (Module Catalogue — 19 modules), Section 26 (Accessibility Strategy), Section 27 (Security Philosophy), Section 29 (Integration Philosophy).

> **Related ADRs:** ADR-001 (Configuration-Driven Architecture — informs the role of `packages/configuration`), ADR-002 (Modular Architecture — informs bounded-context package boundaries), ADR-003 (Local-First Strategy — the first slice is online-first but must preserve identifiers and contracts for the future local-first substrate), ADR-004 (Multi-Tenant Strategy — informs tenant context propagation in `packages/contracts` and `apps/api`), ADR-005 (UI Design Philosophy — thin-client-over-platform-contracts, healthcare-native, role-aware, accessibility-first, localization-first), ADR-006 (Database Strategy — PostgreSQL as the transactional store; analytical, cache, object, and audit stores remain deferred), ADR-007 (Feature Flags Packaging — v1 management surface packaged inside M15 Configuration; BC18 remains conceptually separate), ADR-008 (No Façade Modules; Reception as Workflow — informs workflow vs module boundaries in `packages/domain`), ADR-009 (Subscriptions as Billing Capability — informs BC07 Billing use cases in `packages/domain`), ADR-010 (Inventory BC and Module Packaging — BC09 owns Inventory; non-pharmacy inventory module packaging deferred to a future ADR referenced by ADR-010 Section 6.1), ADR-013 (Authentication and Session Strategy — accepted concurrently; governs the auth boundary implemented in `apps/api` and consumed by `apps/web`).

> **Predecessor:** None. **Supersedes:** None. **Superseded by:** None.

> This Architectural Decision Record (ADR) documents a significant architectural decision made for the Ibn Hayan Healthcare Operating System. ADRs are immutable historical records — once a decision is superseded, a successor ADR is created rather than editing this one in place.

---

## Table of Contents

1. Decision Statement
2. Context
3. Alternatives Considered
4. Consequences
5. Status
6. Future Notes

---

## 1. Decision Statement

### 1.1 The Decision

The Ibn Hayan canonical implementation is a TypeScript monorepo managed with pnpm workspaces, organised into two applications and five shared packages. The two applications are `apps/web` — a Next.js application using the App Router, React, and strict TypeScript, serving as a thin client that consumes published API contracts — and `apps/api` — a separate NestJS application using strict TypeScript, composing domain use cases and persistence adapters behind published REST contracts. Next.js route handlers are not used as the primary enterprise backend; the web application is a thin client, and authoritative business rules live in `apps/api` and the `packages/domain` package. The initial API style is versioned REST over JSON with an OpenAPI specification.

The five shared packages are: `packages/contracts` (API contracts, request/response schemas, error envelopes — Zod-defined and consumed by both `apps/web` and `apps/api`), `packages/domain` (bounded-context domain models, use cases, and repository interfaces — pure TypeScript with no framework or ORM dependencies), `packages/configuration` (configuration schema and evaluation helpers aligned with ADR-001 and the eight-layer precedence model), `packages/observability` (structured logging, audit emission, metrics, and PHI-redaction helpers), and `packages/testing` (test fixtures, factories, and shared test utilities).

PostgreSQL is the transactional system of record. Prisma is the initial ORM and migration tool, with four explicit safeguards: domain code must not depend directly on Prisma-generated types; persistence must remain behind repository interfaces declared in `packages/domain`; reviewed raw SQL migrations may be used for PostgreSQL features, constraints, indexes, row-level security, and extensions that Prisma cannot express adequately; and database design remains PostgreSQL-first, not ORM-limited. Zod is used for contract and boundary validation at every external surface — API request and response boundaries, configuration loading, and any boundary where untrusted data crosses into trusted code.

The web styling foundation uses Tailwind CSS and accessible, project-owned UI components. Generated component code (for example, output from scaffolding tools or shadcn/ui-style generators) must be reviewed and owned by the repository; generated code is not accepted as a runtime dependency on a third-party generator. Arabic and English, RTL and LTR behaviour, accessibility, keyboard navigation, and localisation are first-class requirements from the first implemented screen. No patient or protected-health-information data may be persisted in browser localStorage.

The existing `download/mediflow/` and `download/mediflow-pro/` applications are prototype references only. They are not the canonical implementation. Their business logic and persistence code must not be ported. Selected visual patterns, wording, RTL behaviour, and workflow ideas may inform the new implementation after review. They must not be moved or deleted by this ADR; their disposition is governed by Section 6.5.

The first implementation is a modular monolith with clear bounded-context and package boundaries. It must preserve a future path to extracting deployable services without prematurely creating distributed services. The first vertical slice may be online-first, but it must not contradict ADR-003; it must preserve identifiers, contracts, audit semantics, and architectural extension points needed for a future sanctioned local-first synchronisation substrate.

### 1.2 Scope of Application

The decision binds every engineer, every contributor, and every scaffolding step that touches the canonical implementation. It governs the choice of language (TypeScript with strict mode), the package manager (pnpm workspaces), the repository layout (`apps/web`, `apps/api`, `packages/contracts`, `packages/domain`, `packages/configuration`, `packages/observability`, `packages/testing`), the frontend framework (Next.js with App Router), the backend framework (NestJS), the API style (versioned REST over JSON with OpenAPI), the transactional store (PostgreSQL), the ORM (Prisma with the four safeguards in Section 1.4), the validation library (Zod), the styling foundation (Tailwind CSS with project-owned accessible components), the testing foundation (Vitest, NestJS testing utilities + Supertest, Playwright), the disposition of the existing prototypes (reference-only), and the architectural posture of the first implementation (modular monolith, online-first but local-first-compatible).

The decision does not commit exact package patch versions. Exact versions are pinned in the lockfile and recorded in the generated implementation manifest; they are not part of this ADR's architectural identity. When scaffolding occurs, current supported stable releases must be used; temporary patch versions must not be hardcoded into this ADR as permanent architectural identity.

The decision defers deployment topology, container orchestration, cloud provider, and all secondary-store technology selections (analytical store, cache store, object store, dedicated audit-store technology) to future ADRs. This ADR does not invent ADRs for those concerns; it explicitly leaves them open.

### 1.3 Repository Structure

The ratified repository structure for the canonical implementation is:

```
apps/
├── web/        # Next.js (App Router) + React + strict TypeScript — thin client
└── api/        # NestJS + strict TypeScript — authoritative backend

packages/
├── contracts/        # Zod-defined API contracts, request/response schemas, error envelopes
├── domain/           # Bounded-context domain models, use cases, repository interfaces (pure TypeScript)
├── configuration/    # Configuration schema and evaluation helpers (ADR-001, eight-layer precedence)
├── observability/    # Structured logging, audit emission, metrics, PHI redaction
└── testing/          # Test fixtures, factories, shared test utilities
```

The responsibility of each entry, the allowed dependency direction, and the boundary rules are elaborated in `FOLDER_STRUCTURE.md`. This ADR ratifies the structure; `FOLDER_STRUCTURE.md` records the day-to-day rules engineers must follow. The existing documentation tree under `download/docs/` and the prototype tree under `download/mediflow/` and `download/mediflow-pro/` remain outside the canonical implementation workspace. The canonical implementation workspace root will be established at scaffolding time; its precise path within the repository is recorded in `FOLDER_STRUCTURE.md`, not in this ADR.

### 1.4 Prisma Safeguards

Prisma is ratified as the initial ORM and migration tool, subject to four safeguards that are non-negotiable for the first implementation:

| Safeguard | Description |
|---|---|
| Domain isolation | Code in `packages/domain` must not import from `@prisma/client` or any Prisma-generated type. Domain types are authored by hand in `packages/domain` and mapped to Prisma types at the persistence-adapter boundary in `apps/api`. |
| Repository interfaces | Persistence must remain behind repository interfaces declared in `packages/domain`. The API layer depends on the interface; the Prisma-backed implementation is injected at composition root. The implementation lives in `apps/api` infrastructure, not in `packages/domain`. |
| Reviewed raw SQL | Reviewed raw SQL migrations may be used for PostgreSQL features, constraints, indexes, row-level security policies, and extensions that Prisma cannot express adequately. Raw SQL migrations require explicit review; they are not a default. The review process is defined in `CODING_STANDARDS.md`. |
| PostgreSQL-first design | Database design remains PostgreSQL-first, not ORM-limited. When Prisma's schema language cannot express a PostgreSQL concept that the design requires, the design is PostgreSQL-correct first and the Prisma schema is annotated or supplemented with raw SQL second. |

These safeguards exist to preserve the architectural commitment in ADR-006 that store technologies are implementation decisions, not architectural identity. If Prisma is replaced by a different ORM or query builder in the future, the safeguards ensure the replacement touches only `apps/api` infrastructure, not `packages/domain`.

### 1.5 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Medium — framework and ORM replacement is expensive but bounded by the repository-interface safeguard; the monorepo structure itself is highly reversible |
| Cost of Wrong Decision | High — wrong platform choice produces rework across every layer; wrong repository structure produces dependency drift and integration friction |
| Affected Layers | All implementation layers — Experience (apps/web), Platform Services and Domain (apps/api, packages/domain), Data (apps/api infrastructure with Prisma), Cross-cutting (packages/contracts, packages/configuration, packages/observability, packages/testing) |
| Affected Principles | P1 (Healthcare First), P2 (Configuration Before Customization), P3 (One Platform), P5 (Consistency Over Availability for Clinical Data), P10 (Multi-Tenancy), P13 (Auditability), P14 (Performance), P18 (Decade-Horizon Viability) |
| ADR Required | Yes — this ADR |

### 1.6 Decision Boundaries

This ADR ratifies the structural and platform-foundation choices for the first implementation. It does not ratify every specific API endpoint, every specific database table, every specific Zod schema, or every specific UI component. Those are owned by their respective canonical documents (`10_API/ENDPOINTS.md`, `04_DATABASE/TABLES.md`, `05_UI_UX/COMPONENT_LIBRARY.md`) and by the implementation itself. This ADR does not commit the platform to a specific deployment topology, cloud provider, or orchestration system; those are deferred to future ADRs. This ADR does not commit the platform to a specific analytical store, cache store, object store, or dedicated audit-store technology; those are deferred to future ADRs per ADR-006's per-category selection model. This ADR does not commit exact package patch versions; those are pinned in the lockfile and recorded in the implementation manifest.

---

## 2. Context

### 2.1 The Implementation-Foundation Problem

The Ibn Hayan canonical spine (Product Bible, four architecture documents, ten ratified ADRs) provides the architectural frame for the platform but defers all technology selection to implementation-level ADRs. Before any application code can be written, the Architecture Council must ratify the application platform, repository structure, primary frameworks, persistence foundation, validation foundation, styling foundation, testing foundation, and prototype disposition. Without these ratifications, engineers would make ad-hoc technology choices that accumulate as architectural debt and that may conflict with the canonical spine's commitments. This ADR closes that gap by ratifying the minimum foundation required for scaffolding and for the first vertical slice.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Thin-client philosophy | ADR-005 ratifies thin-client-over-platform-contracts. The web application must consume published API contracts and must not contain authoritative business rules. The platform choice must enforce this boundary structurally, not by convention. |
| Bounded-context purity | ADR-002 and `SYSTEM_ARCHITECTURE.md` Section 7 ratify 19 bounded contexts. The implementation structure must let each bounded context own its domain models, use cases, and repository interfaces without leaking framework or ORM concerns into the domain. |
| Local-first compatibility | ADR-003 ratifies a future local-first synchronisation substrate. The first vertical slice is online-first, but identifiers, contracts, audit semantics, and extension points must preserve a future sanctioned local-first path. |
| Multi-tenancy | ADR-004 ratifies multi-tenancy as the default delivery model. Tenant context propagation, server-side membership verification, and tenant-scoped data access must be structurally enforced from the first slice. |
| Configuration-driven adaptation | ADR-001 ratifies configuration as the primary adaptation mechanism. The `packages/configuration` package must be a first-class shared package, not an afterthought in `apps/api`. |
| Auditability | ADR-006 and `SYSTEM_ARCHITECTURE.md` Section 27 ratify audit as a primitive. The `packages/observability` package must provide structured audit emission from the first slice; audit must not be retrofitted. |
| Decade-horizon viability | Principle P18 requires the platform to remain viable for ten or more years. The technology selection must avoid choices that lock the platform into a single vendor, a single ORM, or a non-replaceable framework abstraction. The Prisma safeguards in Section 1.4 are a direct consequence. |
| Healthcare-native accessibility and localisation | ADR-005 ratifies accessibility-first and localisation-first. The web styling foundation must support RTL and LTR, keyboard navigation, and Arabic/English from the first implemented screen. Tailwind CSS with project-owned accessible components supports this commitment without locking the platform into a single component library. |
| Prototype disposition | The existing `download/mediflow/` and `download/mediflow-pro/` prototypes are architecturally non-conformant (thick-client, no backend, no auth, no multi-tenancy). Their disposition must be explicit to prevent engineers from porting their business logic into the canonical implementation. |
| Implementation readiness | The implementation-readiness audit identified six technology-selection ADRs as a precondition for scaffolding. This ADR consolidates the platform, repository, persistence, validation, styling, and testing foundations into a single ADR to minimise ADR overhead while preserving governance. Authentication and session strategy are split into ADR-013 for clarity. |

### 2.3 Constraints Bounding the Decision

The decision is bounded by several explicit constraints inherited from upstream authority. ADR-005's thin-client philosophy forbids placing authoritative business rules in the web application. ADR-006's per-category store selection forbids committing a single database technology for every store type; this ADR commits PostgreSQL only for the transactional store. ADR-003's local-first strategy forbids design choices that preclude a future synchronisation substrate. ADR-004's multi-tenant strategy forbids any persistence or context-propagation choice that does not enforce tenant boundaries. The canonical spine's principle P18 forbids technology choices that produce unpayable debt over the decade horizon. These constraints are binding on every alternative evaluated in Section 3.

### 2.4 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md`, `SOFTWARE_ARCHITECTURE.md`, `MODULE_ARCHITECTURE.md`, `CONFIGURATION_ARCHITECTURE.md`, `PRODUCT_BIBLE.md`, and ADRs 001 through 010. Where this ADR ratifies a specific technology choice, the choice is an implementation decision that satisfies the architectural commitment of the upstream authority; it does not amend the upstream authority. Where this ADR defers a decision (deployment topology, secondary stores), the deferral is consistent with ADR-006's per-category selection model and with `SYSTEM_ARCHITECTURE.md`'s explicit deferral of implementation choices to implementation-level ADRs.

### 2.5 Why a Single ADR

The implementation-readiness audit recommended six technology-selection ADRs (client framework, server framework, transactional store, ORM, authentication, deployment topology). This ADR consolidates the first four into a single ADR because they are tightly coupled — the choice of TypeScript monorepo, the choice of Next.js for web, the choice of NestJS for API, the choice of PostgreSQL, and the choice of Prisma are not independent decisions. They form a coherent foundation. Authentication and session strategy are split into ADR-013 because authentication has its own security-critical surface and deserves its own ADR. Deployment topology and secondary-store technologies are deferred because they are not required for the first vertical slice and ratifying them prematurely would foreclose options.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Next.js Fullstack (route handlers as the backend)

**Description:** Use Next.js route handlers (or server actions) as the entire backend. `apps/web` becomes a fullstack application; there is no separate `apps/api`.

**Verdict:** Rejected. ADR-005 ratifies thin-client-over-platform-contracts. While Next.js route handlers can serve API contracts, the result is that the web application co-locates authoritative business rules with rendering code. Over the decade horizon, this co-location produces coupling between UI evolution and backend evolution that violates the canonical spine's layering discipline. A separate NestJS API enforces the thin-client boundary structurally. The performance cost of a separate API is negligible for a healthcare platform where practitioner latency is dominated by clinical workflow, not by an extra network hop within the same data centre.

### 3.2 Alternative B — Single application (no monorepo)

**Description:** A single Next.js application with API routes and a single Prisma schema, organised by directory rather than by package.

**Verdict:** Rejected. A single-application structure cannot enforce the bounded-context purity required by ADR-002. Without package boundaries, framework and ORM concerns leak into domain code. The monorepo structure with `packages/domain` as a separate package enforces the boundary at the package-import level — domain code that imports Prisma fails to compile. This enforcement is the structural expression of ADR-006's "store technologies are implementation decisions, not architectural identity".

### 3.3 Alternative C — Polyrepo (separate repositories for web, API, each package)

**Description:** Each application and each shared package lives in its own repository, versioned and released independently.

**Verdict:** Rejected for the first implementation. Polyrepo is a viable future state for a platform that has extracted deployable services, but it is premature for the first implementation. The first implementation is a modular monolith (Section 1.1, point 15); a polyrepo structure would force distributed-service coordination costs onto a codebase that is intentionally a single deployable unit. The monorepo structure preserves a future path to polyrepo extraction without paying the coordination cost now.

### 3.4 Alternative D — Different ORM (Drizzle, TypeORM, Kysely)

**Description:** Use a different ORM or query builder instead of Prisma.

**Verdict:** Rejected for the first implementation, but the rejection is qualified. Prisma is ratified as the *initial* ORM, not as the permanent ORM. The four safeguards in Section 1.4 (domain isolation, repository interfaces, reviewed raw SQL, PostgreSQL-first design) ensure that Prisma can be replaced by any of these alternatives in the future without touching `packages/domain`. The choice of Prisma for the first implementation is based on its schema-first authoring model, its first-class migration tooling, its TypeScript type generation, and its alignment with the `fullstack-dev` skill that will be used for scaffolding. Drizzle, TypeORM, and Kysely remain viable future replacements; this ADR does not foreclose them.

### 3.5 Alternative E — Different database (MySQL, SQLite for development)

**Description:** Use a different transactional store technology.

**Verdict:** Rejected. PostgreSQL is ratified as the transactional system of record. MySQL lacks several PostgreSQL features that the canonical spine implies (row-level security for tenant isolation, JSONB for configuration storage, partitioning for audit tables). SQLite is suitable for development but not for a multi-tenant production transactional store; using it for development while using PostgreSQL for production produces a class of bugs that only appear in production. PostgreSQL is used for both development and production to eliminate this class of bugs. ADR-006 remains the authoritative source for store-segmentation decisions; this ADR commits only the transactional store.

### 3.6 Alternative F — Different styling foundation (CSS-in-JS, plain CSS, Styled Components)

**Description:** Use a different styling approach instead of Tailwind CSS.

**Verdict:** Rejected for the first implementation. Tailwind CSS is ratified as the styling foundation because it supports the canonical spine's accessibility-first and localisation-first commitments (RTL and LTR are first-class in Tailwind's utility model), because it produces a small production CSS bundle without runtime overhead, and because it integrates cleanly with project-owned accessible UI components. CSS-in-JS approaches introduce runtime overhead that conflicts with the canonical spine's performance commitment. Plain CSS is viable but produces slower iteration and less consistency. Tailwind is the initial choice; it is not permanent architectural identity, but replacing it would require a future ADR.

### 3.7 Alternative G — JWT-based browser authentication

**Description:** Use long-lived browser-stored JWTs for authentication instead of server-managed opaque sessions.

**Verdict:** Rejected. This is the subject of ADR-013, ratified concurrently. The rejection is recorded there.

### 3.8 Alternative H — Defer all technology decisions to implementation time

**Description:** Do not ratify technology selections in an ADR; let engineers choose at scaffolding time.

**Verdict:** Rejected. The canonical spine's principle P18 (Decade-Horizon Viability) and the architectural commitment that "no architectural decision is implemented until it is documented" (`SYSTEM_ARCHITECTURE.md` Section 4.16) require that technology selections of this consequence be ratified by ADR before implementation. Deferring the decisions to implementation time would produce ad-hoc choices that accumulate as architectural debt and that may conflict with the canonical spine's commitments.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Structural enforcement of thin-client boundary | The separation of `apps/web` and `apps/api` into separate applications, with `packages/contracts` as the only shared API surface, structurally enforces ADR-005's thin-client philosophy. The web application cannot accidentally acquire authoritative business rules because the rules live in a different application. |
| Structural enforcement of domain isolation | The `packages/domain` package, with no framework or ORM imports, structurally enforces ADR-006's commitment that store technologies are implementation decisions. Prisma-generated types are mapped to domain types at the persistence-adapter boundary; the domain remains pure. |
| Future-replaceable ORM | The four Prisma safeguards ensure that Prisma can be replaced by Drizzle, TypeORM, Kysely, or another ORM in the future without touching `packages/domain`. The replacement would touch only `apps/api` infrastructure. |
| Future-extractable services | The modular-monolith structure with clear bounded-context package boundaries preserves a future path to extracting deployable services. When (and if) a bounded context's scale or availability requirements justify extraction, the extraction is a packaging decision, not a re-architecture. |
| Local-first compatibility | The first vertical slice is online-first but preserves identifiers, contracts, audit semantics, and extension points for the future local-first substrate. No design choice in this ADR contradicts ADR-003. |
| Accessibility and localisation from day one | The web styling foundation (Tailwind CSS with project-owned accessible components) and the explicit requirement that Arabic/English, RTL/LTR, accessibility, and keyboard navigation are first-class from the first screen ensure that the canonical spine's accessibility-first and localisation-first commitments are structurally enforced. |
| Audit and observability from day one | The `packages/observability` package is a first-class shared package from the first slice. Audit emission is not retrofitted. |
| Prototype disposition is explicit | The reference-only disposition of `download/mediflow/` and `download/mediflow-pro/` is explicit. Engineers know that the prototypes are visual references, not code to port. |
| Testing foundation is established | Vitest, NestJS testing utilities + Supertest, and Playwright are ratified as the testing foundation. The first slice can write tests from the first commit. |
| Secondary stores remain deferred | ADR-006's per-category selection model is preserved. Analytical, cache, object, and audit-store technologies are not prematurely committed. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Two applications to maintain | The separation of `apps/web` and `apps/api` into two applications produces coordination overhead: API changes must be reflected in `packages/contracts` and then consumed by `apps/web`. The overhead is intentional and is the cost of the thin-client boundary. |
| Prisma's schema language limits | Prisma's schema language cannot express every PostgreSQL concept (row-level security policies, certain index types, certain constraint types, extensions). The reviewed-raw-SQL safeguard in Section 1.4 addresses this, but it requires engineer discipline and review rigour. |
| Monorepo tooling complexity | pnpm workspaces require engineer familiarity with workspace protocols (`workspace:*`), with package linking, and with workspace-scoped scripts. The complexity is bounded and is the cost of the package-boundary enforcement. |
| No offline support in the first slice | The first vertical slice is online-first. Offline support arrives with the local-first substrate in a future ADR. Practitioners using the first slice require network connectivity. |
| No analytical store in the first slice | The analytical store is deferred. Reporting in the first slice reads from the transactional store, which is acceptable for small datasets but will require the analytical store as data volume grows. |
| No dedicated audit store in the first slice | The dedicated audit store is deferred. Audit events in the first slice are stored in the transactional store (in an append-only audit table) with the same immutability and tamper-evidence guarantees. Migration to a dedicated audit store is a future ADR. |
| Prototype code remains in the repository | The `download/mediflow/` and `download/mediflow-pro/` prototypes remain in the repository as reference material. They are not moved or deleted by this ADR. Their continued presence may confuse new engineers; the reference-only disposition in Section 1.1 and Section 6.5 addresses this through documentation, not through file operations. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| TypeScript across the stack | TypeScript is used for both frontend and backend. This is a neutral consequence; it could have been Python or Go for the backend, but TypeScript's type system and the shared `packages/contracts` package produce end-to-end type safety that reduces integration bugs. |
| pnpm as the package manager | pnpm is used for workspace management. This is a neutral consequence; npm and yarn also support workspaces. pnpm is chosen for its disk-efficiency and its strict dependency resolution, which helps enforce the package boundaries. |
| OpenAPI as the API specification format | OpenAPI is used for the REST API specification. This is a neutral consequence; gRPC or GraphQL were viable alternatives. REST over JSON with OpenAPI is chosen for its broad tooling support and its alignment with the canonical spine's integration architecture. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This ADR was accepted by the Architecture Council on
2026-07-18. The decision is authoritative and binding on all downstream
documentation and on the first implementation. Any future change or
reversal requires a superseding ADR accepted through the Architecture
Council.

### 5.2 Accepted Decision Conditions

The following conditions form part of the accepted decision:

- The Council confirms that the canonical implementation is a TypeScript monorepo with pnpm workspaces.
- The Council confirms that `apps/web` is a Next.js application with App Router, React, and strict TypeScript, serving as a thin client.
- The Council confirms that `apps/api` is a separate NestJS application with strict TypeScript, serving as the authoritative backend.
- The Council confirms that Next.js route handlers are not used as the primary enterprise backend.
- The Council confirms that the initial API style is versioned REST over JSON with an OpenAPI specification.
- The Council confirms that PostgreSQL is the transactional system of record.
- The Council confirms that Prisma is the initial ORM, subject to the four safeguards in Section 1.4: domain isolation, repository interfaces, reviewed raw SQL, and PostgreSQL-first design.
- The Council confirms that Zod is used for contract and boundary validation.
- The Council confirms that the web styling foundation uses Tailwind CSS with project-owned accessible UI components, and that generated code must be reviewed and owned by the repository.
- The Council confirms that Arabic and English, RTL and LTR, accessibility, keyboard navigation, and localisation are first-class requirements from the first implemented screen.
- The Council confirms that no patient or protected-health-information data may be persisted in browser localStorage.
- The Council confirms that the existing `download/mediflow/` and `download/mediflow-pro/` prototypes are reference-only; their business logic and persistence code must not be ported; they must not be moved or deleted by this ADR.
- The Council confirms that the first implementation is a modular monolith with a future path to extracting deployable services.
- The Council confirms that the first vertical slice may be online-first but must not contradict ADR-003 and must preserve identifiers, contracts, audit semantics, and extension points for a future local-first substrate.
- The Council confirms that exact package patch versions are not architectural identity; they are pinned in the lockfile and recorded in the implementation manifest.
- The Council confirms that Vitest, NestJS testing utilities + Supertest, and Playwright are the testing foundation.
- The Council confirms that deployment topology, orchestration, cloud provider, analytical store, cache, object storage, and dedicated audit-store technologies remain deferred to future ADRs.

### 5.3 Implementation Triggers

Upon acceptance, the following implementation work is authorised (but not performed by this ADR):

- **Scaffolding:** Initialise the pnpm workspace, the two applications, and the five shared packages, using current supported stable releases at scaffolding time.
- **Configuration:** Establish TypeScript strict configuration, ESLint configuration, Prettier configuration, and the package-boundary linting that enforces the dependency direction in `FOLDER_STRUCTURE.md`.
- **Prisma setup:** Establish the Prisma schema, the initial migration, and the repository-interface pattern that isolates domain types from Prisma-generated types.
- **Authentication foundation:** Implement the authentication and session strategy ratified by ADR-013.
- **First vertical slice:** Implement the login → select organisation or clinic → view patient list → search patients → create patient → view patient profile → record audit events slice.
- **Implementation manifest:** Record the exact package versions used at scaffolding time in an implementation manifest committed to the repository. The manifest is a record of the scaffolding-time state; it is not architectural identity.
- **Future ADRs:** Draft ADR-014 (or later) for deployment topology, ADR-015 (or later) for the analytical store, and so on, when each deferred concern becomes ready for ratification.

---

## 6. Future Notes

### 6.1 Triggers for Future ADRs

| Future ADR | Trigger |
|---|---|
| Deployment topology ADR | When the first implementation is ready to deploy to any environment beyond local development. |
| Analytical store ADR | When reporting query volume or data volume grows to a point where analytical queries compete with transactional traffic. |
| Cache store ADR | When hot-path latency requirements cannot be met by the transactional store alone. |
| Object store ADR | When document, image, or export storage requirements exceed what the transactional store can serve efficiently. |
| Dedicated audit-store ADR | When audit volume or audit-query requirements exceed what the transactional store can serve efficiently, or when tamper-evidence requirements demand a dedicated store. |
| Local-first substrate ADR | When the online-first first slice is stable and the local-first synchronisation substrate is ready for ratification. |
| Service extraction ADR | When a bounded context's scale or availability requirements justify extraction from the modular monolith into a deployable service. |
| ORM replacement ADR | If Prisma's limitations become material and a different ORM or query builder becomes the better choice. |
| Non-pharmacy inventory module packaging ADR | Reserved per ADR-010 Section 6.1. |

### 6.2 Open Questions for Future ADRs

| Question | Description |
|---|---|
| Deployment target | Will the first deployment be on a cloud provider, on-premises, or in a hybrid configuration? |
| Container orchestration | Will the platform use Kubernetes, a simpler container runtime, or a serverless container service? |
| Analytical store technology | When the analytical store is ratified, will it be a columnar store (e.g., ClickHouse), a data warehouse (e.g., BigQuery, Snowflake), or a read-replica of the transactional store? |
| Audit store technology | When the dedicated audit store is ratified, will it be a dedicated PostgreSQL database, an append-only log store, or a purpose-built audit database? |
| Local-first substrate technology | When the local-first substrate is ratified, what synchronisation protocol and what local database will be used? |

### 6.3 Relationship to Other ADRs

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Compatible. `packages/configuration` is a first-class shared package that implements the configuration schema and evaluation helpers. ADR-001's eight-layer precedence model is implemented in this package. |
| ADR-002 (Modular Architecture) | Compatible. The bounded-context package boundaries in `packages/domain` are the structural expression of ADR-002's modular architecture. |
| ADR-003 (Local-First Strategy) | Compatible. The first slice is online-first but preserves identifiers, contracts, audit semantics, and extension points for the future local-first substrate. The local-first substrate is ratified by a future ADR. |
| ADR-004 (Multi-Tenant Strategy) | Compatible. Tenant context propagation is implemented in `packages/contracts` and `apps/api`; tenant membership is verified server-side at every protected operation per ADR-013. |
| ADR-005 (UI Design Philosophy) | Compatible. `apps/web` is a thin client consuming published API contracts. Tailwind CSS with project-owned accessible components supports the accessibility-first and localisation-first commitments. |
| ADR-006 (Database Strategy) | Compatible. PostgreSQL is the transactional store. Prisma is the initial ORM, with safeguards that preserve ADR-006's commitment that store technologies are implementation decisions. Analytical, cache, object, and audit stores remain deferred per ADR-006. |
| ADR-007 (Feature Flags Packaging) | Compatible. BC18 Feature Flags remains conceptually separate from Configuration (per ADR-007); the v1 management surface is packaged inside the Configuration module (M15) per ADR-007. The `packages/configuration` package owns configuration; a future package or module may own feature-flag evaluation, but the boundary is preserved. |
| ADR-008 (No Façade Modules; Reception as Workflow) | Compatible. Workflow vs module boundaries are reflected in `packages/domain` use-case organisation. |
| ADR-009 (Subscriptions as Billing Capability) | Compatible. Subscriptions is a capability under M09 Billing in `packages/domain`; there is no separate Subscriptions bounded context or module. |
| ADR-010 (Inventory BC and Module Packaging) | Compatible. BC09 Inventory is its own bounded context in `packages/domain`; non-pharmacy inventory module packaging is deferred per ADR-010 Section 6.1. |
| ADR-013 (Authentication and Session Strategy) | Compatible. ADR-013 is accepted concurrently and governs the authentication boundary implemented in `apps/api` and consumed by `apps/web`. |

### 6.5 Prototype Disposition

The existing `download/mediflow/` and `download/mediflow-pro/` applications remain in the repository as prototype references. This ADR does not move, rename, isolate, or delete them. Their disposition is governed by the following rules, which are binding on engineers:

- They are not the canonical implementation.
- Their business logic and persistence code must not be ported into `apps/web`, `apps/api`, or any package under `packages/`.
- Selected visual patterns, wording, RTL behaviour, and workflow ideas may inform the new implementation after review. The review must be recorded in the implementation manifest or in a design note; it must not be silent.
- They must not be moved or deleted by this ADR. A future ADR may ratify their relocation, isolation, or deletion; until then, they remain in their current location.
- They must not be referenced from the canonical implementation's build, test, or deployment pipeline. They are documentation-grade references, not build inputs.

---

> **End of ADR-012.** This ADR is an accepted decision record. Implementation work authorised by this ADR is performed in separate phases per the implementation sequence; this ADR does not perform that work. Future ADRs are required for deployment topology, secondary stores, the local-first substrate, and the non-pharmacy inventory module packaging decision.
