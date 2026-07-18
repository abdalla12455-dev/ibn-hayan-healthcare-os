# Ibn Hayan Healthcare Operating System — Software Architecture

| Field | Value |
|---|---|
| Document Title | Software Architecture |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Implementation-Grade Architectural Specification |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 2.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Senior software architects, module owners, engineering managers, principal engineers, integration architects |
| Scope | Software-structural architecture: patterns, layering, service decomposition, module decomposition, dependency management, cross-cutting concerns, design principles, technology categories, framework selection, trade-offs, technical debt |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, UI component catalogues, deployment runbooks, vendor selection, technology commits |
| Conflict Resolution | SYSTEM_ARCHITECTURE.md prevails. Any conflict between this document and SYSTEM_ARCHITECTURE.md is resolved in favour of SYSTEM_ARCHITECTURE.md until SYSTEM_ARCHITECTURE.md is amended through an ADR. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record (ADR); recorded in CHANGELOG with explicit version increment |
| Predecessor | v1.0.0 (initial elaboration) |
| Supersedes | All prior software-architecture drafts and internal memos |

---

## Table of Contents

1. Software Architecture Overview
2. Architectural Patterns
3. Layered Architecture
4. Service Architecture
5. Module Decomposition
6. Dependency Management
7. Cross-Cutting Concerns
8. SOLID Principles Application
9. DRY and KISS Principles
10. Technology Stack
11. Framework Selection Criteria
12. Architectural Trade-offs
13. Technical Debt Management

---

## 1. Software Architecture Overview

### 1.1 Purpose and Scope

This document defines the implementation-grade software architecture of the Ibn Hayan Healthcare Operating System. It elaborates the structural commitments of `SYSTEM_ARCHITECTURE.md` — specifically how the platform is organized into layers, services, modules, and components, and how those elements interact through contracts. Where `SYSTEM_ARCHITECTURE.md` is technology-agnostic and abstract, this document specifies the architectural patterns, the layering discipline, the service taxonomy, the module decomposition rules, the dependency rules, and the cross-cutting concern mechanisms that implementations must honour.

The scope of this document is the software-structural surface of the platform. It does not specify source code, database schemas, API endpoint specifications, or UI components; those are governed by `CODING_STANDARDS.md`, `FOLDER_STRUCTURE.md`, the database documentation, and the UI specification respectively. It does not ratify technology choices; specific technologies are selected through the criteria in Sections 10 and 11 and recorded in implementation guides and ADRs. It does, however, govern every structural decision that an implementer faces when translating the system architecture into running software.

This document honours the product posture defined in `PRODUCT_BIBLE.md` — healthcare-native, configuration-driven, multi-tenant, offline-first, auditable, decade-horizon. Every structural commitment in this document is traceable to a product principle or an architectural principle in `SYSTEM_ARCHITECTURE.md` Section 4.

### 1.2 Relationship to System Architecture

This document elaborates specific sections of `SYSTEM_ARCHITECTURE.md` and must not contradict them. The elaboration map is as follows:

| SYSTEM_ARCHITECTURE Section | Elaborated Here |
|---|---|
| Section 4 (Architectural Principles P1–P18) | Section 8 (SOLID), Section 9 (DRY/KISS), Section 12 (Trade-offs) |
| Section 5 (High-Level Architecture) | Sections 2, 3, 4 |
| Section 6 (Platform Layers) | Section 3 (Layered Architecture) |
| Section 7 (Domain-Driven Architecture) | Section 5 (Module Decomposition) |
| Section 9 (Modular Architecture) | Sections 4, 5, 6 |
| Section 13 (Module Architecture) | Section 5 (refer to `MODULE_ARCHITECTURE.md` for module-internal detail) |
| Section 19 (Integration Architecture) | Section 2 (Anti-Corruption Layer, Adapter patterns) |
| Section 22 (Extensibility Strategy) | Section 5 (Module Decomposition), Section 12 (Trade-offs) |
| Section 27 (Audit Architecture) | Section 7 (Cross-Cutting Concerns) |
| Section 30 (Future Evolution Strategy) | Section 13 (Technical Debt Management) |

Where this document and `SYSTEM_ARCHITECTURE.md` appear to conflict, `SYSTEM_ARCHITECTURE.md` prevails. This document is amended only through the ADR process; ad-hoc deviations are defects and are corrected on discovery.

### 1.3 Audience

The primary audience is senior software architects and principal engineers who design and govern the platform's software structure, and engineering managers who own modules and must enforce structural discipline within their teams. The secondary audience is engineers implementing features, who must understand the structural boundaries within which their work operates. The document assumes literacy in distributed systems, domain-driven design, multi-tenant SaaS architecture, and healthcare-grade operational rigour; it does not explain foundational concepts.

Integration architects, security architects, and SRE leaders should read Sections 3, 4, 6, and 7 to understand the structural commitments that integration code, security code, and operational tooling must honour. Module owners should read Sections 4, 5, 6, and 8 to understand the rules their modules are governed by.

### 1.4 Document Conventions

Sections are numbered for stable cross-referencing. Tables summarize decisions where prose would obscure them; prose carries the rationale that tables cannot. Where a principle has exceptions, the exceptions are stated explicitly and never left to inference. The verbs *must*, *should*, and *may* are used in their normative sense: *must* denotes a non-negotiable rule; *should* denotes a default from which deviation requires documented justification; *may* denotes permission, not encouragement.

Cross-references to `SYSTEM_ARCHITECTURE.md` use the form "SYSTEM_ARCHITECTURE Section N" or "SYSTEM_ARCHITECTURE Section N.M". Cross-references to `PRODUCT_BIBLE.md` use the form "PRODUCT_BIBLE Principle P-N" or "PRODUCT_BIBLE Design Principle D-N". Cross-references to ADRs use the form "ADR-NNN". Cross-references to peer documents use the form "MODULE_ARCHITECTURE Section N" or "CONFIGURATION_ARCHITECTURE Section N".

### 1.5 Authority and Amendment

This document is authoritative for software architecture. It prevails over downstream implementation documents — `CODING_STANDARDS.md`, `FOLDER_STRUCTURE.md`, per-module specifications, per-domain specifications — but is subordinate to `SYSTEM_ARCHITECTURE.md`. A downstream document that contradicts this document is defective; the remedy is to correct the downstream document or to amend this document through an ADR.

Amendment is by Architecture Council ratification only. A proposed amendment is recorded as an ADR, reviewed by the Architecture Council, and ratified or rejected. Ratification is recorded in the ADR's status and in the platform's CHANGELOG, with an explicit version increment. Off-cycle amendment is permitted when a ratified ADR requires it; routine amendment occurs at the quarterly review cadence.

---

## 2. Architectural Patterns

### 2.1 Pattern Catalog

Ibn Hayan uses a defined set of architectural patterns, each chosen to address a specific structural concern. Patterns are not mixed arbitrarily; each pattern has a stated purpose, applicability conditions, and consequences that must be understood before adoption. The catalog is stable; new patterns are added only through ADR ratification, with the rationale, alternatives, and consequences documented.

| Pattern | Purpose | Where Applied | Governing Principle |
|---|---|---|---|
| Layered Architecture | Separate concerns horizontally; enforce dependency direction | Across the platform (Section 3) | P4 (Loose Coupling) |
| Modular Monolith | Decompose the platform into autonomous modules with explicit contracts | Domain Layer (ADR-002) | P16 (Composable) |
| Bounded Context | Decompose the domain into coherent, autonomous contexts with ubiquitous language | Domain Layer (SYSTEM_ARCHITECTURE Section 7) | P8 (Contexts Stable) |
| Anti-Corruption Layer | Translate between external and internal models at integration boundaries | Integration Layer (SYSTEM_ARCHITECTURE Section 19.4) | P4, P12 (Open Standards) |
| Domain Events | Communicate state changes across contexts without tight coupling | Cross-context integration (SYSTEM_ARCHITECTURE Section 18) | P4 |
| CQRS (selective) | Separate read models from write models where workloads diverge | Reporting; high-read contexts | P5 (Consistency for Clinical Data) |
| Event Sourcing (selective) | Persist state as a sequence of events where complete auditability is required | Audit context (SYSTEM_ARCHITECTURE Section 27.5) | P13 (Auditability) |
| Saga | Coordinate long-running transactions across contexts | Billing; multi-step clinical workflows | P5 |
| Outbox | Reliably emit domain events in coordination with state changes | All contexts that emit events (SYSTEM_ARCHITECTURE Section 18.4) | P13, P5 |
| Circuit Breaker | Stop attempting operations that are consistently failing | Integration adapters; cross-service calls | P1 (Healthcare Safety) |
| Backpressure | Signal overload to upstream callers | All services under load | P1 |
| Idempotent Consumer | Process events exactly-once in effect, despite at-least-once delivery | All event consumers | P5 |
| Strangler Fig | Incrementally replace legacy components with new ones | Migration scenarios (SYSTEM_ARCHITECTURE Section 30.5) | P18 (Decade-Horizon) |

### 2.2 Pattern Selection Criteria

A pattern is adopted only when its benefits justify its costs. The selection criteria are applied as a sequence of tests; a pattern that fails any test is not adopted, regardless of its popularity or theoretical appeal.

| Criterion | Test |
|---|---|
| Structural need | The pattern addresses a real, identified structural concern — not a hypothetical one |
| Cost acceptance | The pattern's complexity, performance overhead, and operational burden are acceptable relative to the concern addressed |
| Team capability | The team adopting the pattern understands it and can operate it through its lifecycle |
| Architectural alignment | The pattern aligns with the architectural principles (SYSTEM_ARCHITECTURE Section 4) and does not violate any |
| Documented decision | The pattern's adoption is recorded, with rationale, in the module's documentation or an ADR |
| Reversibility | The pattern can be reversed if it proves wrong, or the irreversibility is acknowledged explicitly |

The CQRS and Event Sourcing patterns are marked "selective" because they are powerful but expensive; they are adopted only where the structural concern — divergent read/write workloads or complete auditability — justifies the cost. Adopting them broadly would violate Principle P14 (Simplicity Over Complexity) and is rejected.

### 2.3 Pattern Combinations and Conflicts

Some patterns combine well; others conflict. Known combinations and their disposition are documented to prevent teams from rediscovering the same trade-offs:

| Combination | Compatibility | Notes |
|---|---|---|
| Layered + Modular Monolith | Compatible | Default platform structure; layers organize responsibilities, modules organize the domain layer |
| Bounded Context + Domain Events | Compatible | Default cross-context integration; events decouple producer from consumer |
| CQRS + Event Sourcing | Compatible | Used selectively for audit; event sourcing provides the write model, CQRS the read models |
| Saga + Event Sourcing | Compatible but complex | Avoid unless the workflow genuinely requires both; the complexity is rarely justified |
| Circuit Breaker + Retry | Compatible with care | Retry must operate within circuit-breaker thresholds; otherwise retry amplifies failure |
| Outbox + Domain Events | Required | Events are emitted through the outbox; direct emission without the outbox is a defect |
| Strangler Fig + Anti-Corruption Layer | Compatible | The anti-corruption layer mediates the strangulation boundary |

A pattern combination not listed here requires Architecture Council review before adoption. The burden is on the proposing team to demonstrate that the combination is coherent and that its consequences are understood.

### 2.4 Pattern Governance

Patterns are governed through three mechanisms: documentation, review, and enforcement. Every pattern adoption is documented in the adopting module's specification, with the structural concern, the chosen pattern, the alternatives considered, and the consequences. New pattern adoptions are reviewed by the architecture organization before implementation. Enforcement is through code review, architectural review, and where feasible static analysis.

A pattern that has been adopted but no longer serves its structural concern is a candidate for removal. Removal follows the same discipline as adoption: an ADR documents the decision, the alternatives considered, and the migration path. Pattern removal without an ADR is a defect.

### 2.5 Anti-Patterns

The following anti-patterns are explicitly forbidden. Their presence in a module is a build-blocking defect and is corrected before the module is shipped:

| Anti-Pattern | Why Forbidden |
|---|---|
| Distributed Monolith | Modules that are nominally separate but coupled through shared databases, synchronous dependencies, or coordinated deployments — defeats the purpose of modular decomposition |
| God Object | A single class or component that handles many unrelated responsibilities — violates Single Responsibility (Section 8.1) and obstructs evolution |
| Spaghetti Dependencies | Unstructured dependencies that make the system impossible to reason about — violates the acyclic-dependency rule (Section 6.1) |
| Hidden Coupling | Coupling through shared mutable state, implicit assumptions, or undocumented behaviour — violates the contract-based coupling rule (Section 6.1) |
| Magic | Behaviour that is not discoverable from the code (e.g., reflection-based dispatch without documentation) — violates the documented-before-implemented principle (P7) |
| Premature Optimization | Optimization before profiling has identified the bottleneck — violates P14 (Simplicity) and YAGNI (Section 9.4) |
| Gold Plating | Capabilities built without a demonstrated need — violates YAGNI and Principle P14 |
| Reinvented Cross-Cutting Concern | A module that implements its own logging, audit, or authentication instead of consuming the platform primitives (Section 7) — violates P15 (Observability) and P13 (Auditability) |

---

## 3. Layered Architecture

### 3.1 Layer Inventory and Responsibilities

Ibn Hayan uses an eight-layer architecture, as defined in SYSTEM_ARCHITECTURE Section 6. The layers, repeated here for completeness, organize the platform's responsibilities horizontally; each layer has a single, cohesive responsibility and does not take on another layer's responsibility. The inventory is stable; the addition or removal of a layer is an architectural amendment ratified through an ADR.

| Layer | Responsibility | Elaborates |
|---|---|---|
| Experience | Render results; capture user intent | SYSTEM_ARCHITECTURE Section 6.2 |
| Edge | Authentication; tenant resolution; rate limiting; request routing | SYSTEM_ARCHITECTURE Section 6.3 |
| Orchestration | Workflow coordination; saga management; task scheduling | SYSTEM_ARCHITECTURE Section 6.4 |
| Domain | Bounded contexts; business logic; authoritative state | SYSTEM_ARCHITECTURE Section 6.5 |
| Platform Services | Cross-cutting services: identity, configuration, audit, feature flags, localization, notifications | SYSTEM_ARCHITECTURE Section 6.6 |
| Integration | Adapters to external systems; anticorruption layers | SYSTEM_ARCHITECTURE Section 6.7 |
| Data | Durable storage, segmented by access pattern | SYSTEM_ARCHITECTURE Section 6.8 |
| Offline Substrate | Local stores; synchronization engine; conflict resolution; offline audit | SYSTEM_ARCHITECTURE Section 6.9 |

### 3.2 Dependency Direction Rules

Dependencies flow downward and inward. The dependency direction is the single most consequential structural rule in the platform; violations produce the coupling that defeats decade-horizon viability (P18). The rules are:

1. **No upward dependencies.** A lower layer may not depend on a higher layer. The Data Layer does not invoke Domain Layer logic; the Domain Layer does not invoke Orchestration Layer logic.
2. **No lateral dependencies except through contracts.** Bounded contexts within the Domain Layer may invoke each other only through published contracts (commands, queries) or through domain events.
3. **Platform Services may be depended upon by Domain and Orchestration Layers, but not vice versa.** Platform Services do not depend on Domain contexts; they are primitives consumed by the Domain Layer.
4. **The Integration Layer depends on Domain contracts (for translation) but not on Domain internals.** The anticorruption layer translates external models to internal models at the boundary.
5. **The Experience Layer depends on Edge and Domain contracts, but not on their internals.** The Experience Layer is thin; it holds no business state.
6. **The Offline Substrate is bidirectional with the Domain and Platform Services Layers**, for synchronization, but does not bypass the conflict resolution and audit mechanisms (SYSTEM_ARCHITECTURE Section 25.2).

These rules are enforced through architectural review and through static analysis tooling where available. A dependency violation is a build-blocking defect.

### 3.3 Layer Internal Structure

Within each layer, internal structure follows the same discipline: components have explicit responsibilities, dependencies flow in a defined direction, and cross-component interaction occurs through contracts. The specific internal structure varies by layer — the Domain Layer is decomposed into bounded contexts; the Platform Services Layer is decomposed into services; the Integration Layer is decomposed into adapters — but the discipline is consistent. A layer whose internal structure is undisciplined is a defect, regardless of how clean its external contracts appear.

Internal structure is documented per layer in the layer's architectural description. The Domain Layer's internal structure is documented in `MODULE_ARCHITECTURE.md`; the Platform Services Layer's internal structure is documented in the platform-services specifications; the Integration Layer's internal structure is documented in the integration documentation. The Data Layer's internal structure is documented in the database documentation.

### 3.4 Cross-Layer Concerns

Some concerns cross all layers: observability, security, audit, localization, tenant context propagation, configuration, and feature flags. These are not layers; they are dimensions that cut across the layered architecture. Cross-layer concerns are implemented through platform-wide mechanisms — a telemetry framework, an authentication propagation mechanism, an audit capture mechanism — not through per-layer reinvention.

Cross-layer concerns are governed by Principle P15 (Observability as Primitive), P13 (Auditability as Primitive), and P10 (Multi-Tenancy as Default). A layer that reinvents a cross-cutting concern is defective; the remedy is to consume the platform primitive. The detailed treatment of cross-layer concerns is in Section 7 of this document.

### 3.5 Layer Evolution

Layers evolve independently to the extent their contracts allow. The Data Layer may be re-platformed without affecting the Domain Layer, as long as the Data Layer's contract with the Domain Layer is preserved. The Experience Layer may be re-platformed without affecting Orchestration and Domain Layers, as long as the Experience Layer's contract with lower layers is preserved. The Offline Substrate may adopt new sync strategies without affecting the Experience Layer.

Layers evolve at different rates, as documented in SYSTEM_ARCHITECTURE Section 6.11. The Experience Layer evolves quickly, as user-experience expectations shift; the Domain Layer evolves slowly, as healthcare semantics are stable; the Data Layer evolves at the pace of data infrastructure. This varying evolution rate is why the layered architecture exists — a monolithic architecture forces uniform evolution, while a layered architecture allows each layer to evolve at its natural rate, preserving decade-horizon viability (P18).

### 3.6 Layer Independence and Technology Refresh

Layer independence is the architectural mechanism by which the platform absorbs technology refresh over the decade horizon (SYSTEM_ARCHITECTURE Section 30.6). A technology refresh that affects one layer — for example, replacing the transactional data store, or re-platforming the web client — must not force changes in other layers, provided the layer's contracts are preserved. Contract preservation is the load-bearing commitment that makes technology refresh feasible.

When a technology refresh requires a contract change, the change follows the platform's deprecation policy (SYSTEM_ARCHITECTURE Section 30.5). The old contract is supported through a defined transition window, with both old and new contracts operating in parallel. A contract change without a transition window is a defect and erodes customer trust; it is rejected.

---

## 4. Service Architecture

### 4.1 Service Types

Ibn Hayan distinguishes several types of services, each with its own characteristics, lifecycle, and deployment posture. The distinction is not nominal; it determines how a service is scaled, how it is operated, and how it evolves. A service whose type is unclear is a candidate for architectural review, because unclear type produces unclear operational expectations.

| Service Type | Description | Default Deployment | Governing Principle |
|---|---|---|---|
| Domain Service | Realizes a bounded context; owns authoritative state | In-process (modular monolith) | P8, P16 |
| Platform Service | Provides cross-cutting capability (identity, configuration, audit, etc.) | In-process by default; extractable if justified | P10, P13, P15 |
| Orchestration Service | Coordinates workflows across contexts | In-process | P4, P5 |
| Integration Adapter | Translates between external and internal models at an integration boundary | In-process; extractable for high-throughput integrations | P4, P12 |
| Sync Service | Manages client-server synchronization | Separate service (stateful) | P11 (Offline-First) |
| Reporting Service | Manages the analytical pipeline and report generation | Separate service | P5, P13 |

The default deployment for most service types is in-process, in keeping with the modular monolith commitment (ADR-002). Service extraction to a separate process is a deployment choice, not an architectural commitment; extraction is justified by operational requirements, not by aesthetic preference.

### 4.2 Service Boundaries

Service boundaries follow bounded context boundaries (SYSTEM_ARCHITECTURE Section 7). A service owns one or more bounded contexts; contexts are not split across services, because splitting a context across services produces the distributed-monolith anti-pattern (Section 2.5). Where a service owns multiple contexts, the contexts remain internally separated through contracts, even though they share a process.

Service boundaries are stable. A service boundary that is reorganized to accommodate a feature violates Principle P8 (Bounded Contexts Are Stable) and is rejected. Boundary reorganization is a structural change ratified through an ADR, with the migration path documented.

### 4.3 Service Communication Mechanisms

Services communicate through three mechanisms, chosen per interaction. The default is in-process communication, which is fast and avoids the operational overhead of network calls. Network communication is reserved for services that have been extracted to separate processes for scaling, isolation, or deployment cadence reasons.

| Mechanism | When Used | Trade-off |
|---|---|---|
| In-process contract invocation | Default for module-to-module communication within the modular monolith | Fast; no network overhead; but couples services into a single deployment |
| Domain events | For asynchronous notification of state changes across contexts | Decouples producer from consumer; introduces eventual consistency |
| Network-based contract invocation | For communication with services extracted to separate processes | Enables independent scaling and deployment; introduces network failure modes |

The choice of mechanism is per interaction, not per service. A service may use in-process invocation for some interactions and events for others. The choice is documented in the service's specification.

### 4.4 Service Statelessness

Most services are stateless (SYSTEM_ARCHITECTURE Section 21.4); state lives in the Data Layer. Stateless services scale horizontally — additional instances are added as load increases, with a load balancer distributing requests. Stateless services do not hold session state; session state is externalized to a session store.

Stateful services are exceptions, used where state cannot be externalized without unacceptable cost. The stateful service inventory is small and is treated as operational specialties, not as the default:

| Stateful Service | Why Stateful | Scaling Strategy |
|---|---|---|
| Sync Service | Manages long-lived sync state per client | Sharding by client |
| Workflow Engine | Manages in-flight workflow state | Sharding by tenant and workflow |
| Session Service | Manages user sessions | Replication; sticky routing |
| Cache | Holds cached state by definition | Sharding; replication |

Stateful services have explicit scaling strategies (SYSTEM_ARCHITECTURE Section 21.5), documented per service. A stateful service without a documented scaling strategy is a defect.

### 4.5 Service Lifecycle

Services follow a lifecycle that governs their evolution. The lifecycle is the same as the module lifecycle (SYSTEM_ARCHITECTURE Section 9.6): Candidate, Pilot, General Availability, Mature, Deprecation Candidate, Deprecated, Retired. Lifecycle transitions are governed by ADRs and communicated through release notes.

Service retirement follows the deprecation policy (SYSTEM_ARCHITECTURE Section 30.5), with a defined window during which consumers migrate. Silent retirement — removing a service without deprecation — is forbidden and is a defect. Consumers of a deprecated service are notified through the platform's change-management channel and are supported through the transition.

### 4.6 Service Extraction Criteria

A service is extracted from the modular monolith to a separate process only when justified by operational requirements. Extraction is not undertaken for aesthetic reasons or for fashion; the cost of network communication, deployment complexity, and operational overhead is real and must be justified. The extraction criteria are:

| Criterion | Test |
|---|---|
| Scaling pressure | The service experiences load that exceeds what the shared deployment can absorb, and the load profile differs materially from other services |
| Isolation requirement | The service requires operational isolation (e.g., for compliance, for failure isolation, for security) that the shared deployment cannot provide |
| Deployment cadence | The service benefits from a deployment cadence that differs from the platform's default cadence |
| Team ownership | The service is owned by a team whose release cadence differs from the platform's release cadence |

Extraction requires ADR ratification. The ADR documents the criterion satisfied, the alternatives considered (including remaining in-process with horizontal scaling), the operational consequences, and the migration path. An extraction that proves wrong is reversed through the same discipline; reversibility is preserved where feasible (P6).

---

## 5. Module Decomposition

### 5.1 Decomposition Approach

Module decomposition follows bounded context decomposition (SYSTEM_ARCHITECTURE Section 7). Each bounded context is realized by one module; a small number of contexts are realized by multiple cooperating modules where the context's internal cohesion justifies the split. The decomposition is governed by ADR-002 and is detailed in `MODULE_ARCHITECTURE.md`. This document governs the decomposition discipline; `MODULE_ARCHITECTURE.md` governs the module-internal detail.

The one-to-one mapping between bounded contexts and modules is the default. Deviations from the default — one context realized by multiple modules, or one module realizing multiple contexts — are documented per case and ratified through an ADR. The deviations are rare; the default is preferred because it preserves the structural simplicity that Principle P14 (Simplicity) requires.

### 5.2 Decomposition Criteria

A new module is justified only when the decomposition criteria are satisfied. The criteria are applied as a conjunction: a module is justified only when multiple criteria hold simultaneously. A single criterion, in isolation, is insufficient justification.

| Criterion | Test |
|---|---|
| Distinct ubiquitous language | The domain has a vocabulary that differs meaningfully from existing modules |
| Distinct invariants | The domain has consistency rules that are not shared with existing modules |
| Distinct lifecycle | The domain evolves at a different rate than existing modules |
| Distinct ownership | The domain is owned by a different team than existing modules |
| Distinct deployment cadence | The domain benefits from independent deployment |

Where these criteria do not hold, the domain should be part of an existing module, not a new one. Over-decomposition produces integration overhead without ownership benefits and violates Principle P14 (Simplicity). Under-decomposition produces god-objects (Section 2.5) and violates Principle P4 (Loose Coupling, High Cohesion).

### 5.3 Module Sizes and Cohesion

Modules are not uniform in size, and uniformity is not a goal. The Patient module is large — it owns patient identity, demographics, consents, and identifiers; the Notifications module is smaller — it owns notification templates and delivery. Size is not a primary concern; cohesion and autonomy are. A small, cohesive module is preferable to a large, fragmented one; a large, cohesive module is preferable to two small, coupled ones.

Cohesion is measured by the degree to which a module's responsibilities form a single, coherent domain. A module whose responsibilities span multiple domains has low cohesion, regardless of its size. Cohesion is assessed at architectural review and at module-specification review; a module whose cohesion has eroded is a candidate for refactoring (Section 5.5).

### 5.4 Module Boundary Design

Module boundaries are the published contract surface — commands, queries, events, and configuration schemas. Everything inside the boundary is private; everything on the boundary is public. Boundary design is the most consequential module-level decision, because boundaries are expensive to change once consumers depend on them.

Boundary design follows four rules. First, the boundary exposes the minimum surface necessary for consumers to interact with the module; excess surface is debt. Second, the boundary is expressed in the module's ubiquitous language, not in implementation terms. Third, the boundary is versioned from the first release; unversioned boundaries cannot evolve safely. Fourth, the boundary is documented as part of the module's definition of done; undocumented boundaries are defective.

### 5.5 Refactoring Module Boundaries

Module boundaries may be refactored, but only through a deliberate process. Boundary refactoring is expensive — consumers must migrate, contracts must be supported in parallel, and the migration window must be staffed — and is undertaken only when the cost of not refactoring exceeds the cost of refactoring.

The refactoring process is:

1. **Justification.** The refactoring is justified by a structural concern (e.g., a context that has grown too large, a context that should be split for ownership reasons, a context whose cohesion has eroded).
2. **ADR.** The refactoring is ratified through an ADR, with the alternatives considered and the migration path documented.
3. **Migration path.** A migration path is defined for existing consumers, with a transition window.
4. **Deprecation.** The old boundary is deprecated, with a defined window during which both old and new operate (SYSTEM_ARCHITECTURE Section 30.5).
5. **Retirement.** The old boundary is retired after the deprecation window.

A boundary refactoring that bypasses this process — for example, a silent breaking change — is a defect and erodes customer trust.

### 5.6 Decomposition Anti-Patterns

The following decomposition anti-patterns are forbidden. Their presence is a build-blocking defect:

| Anti-Pattern | Why Forbidden |
|---|---|
| Feature-based decomposition | Modules organized by feature rather than by domain — produces modules that change whenever features change, violating context stability (P8) |
| Layer-based decomposition | Modules organized by layer (a "data access module", a "UI module") — confuses layers with modules and violates cohesion |
| Team-based decomposition | Modules organized by team rather than by domain — produces modules that change whenever teams reorganize |
| Anaemic module | A module with no domain logic, only data — violates Single Responsibility (Section 8.1) and produces an anaemic domain model |
| Over-decomposition | Modules too small to justify their boundaries — produces integration overhead without ownership benefits |
| God module | A module whose responsibilities span multiple domains — violates cohesion and produces a coupling sink |

---

## 6. Dependency Management

### 6.1 Dependency Rules

Module dependencies follow strict rules (SYSTEM_ARCHITECTURE Section 9.4). The rules are repeated here because they are the most consequential operational rules in the platform and the most frequently violated:

| Rule | Description |
|---|---|
| Acyclic | Module dependencies are acyclic; circular dependencies are forbidden and are build-blocking |
| Explicit | Dependencies are explicit, documented, and validated at build time |
| Contract-based | Modules communicate through contracts, never through direct data access |
| Hierarchical | Platform modules may be depended upon by all other modules; category-specific modules depend on Platform modules and on Patient where appropriate |
| Versioned | Dependencies are versioned; breaking changes follow the deprecation policy |
| Downward-only | Modules may depend on Platform Services; Platform Services may not depend on Domain modules |
| Internal-inaccessible | A module may not depend on another module's internals; only the contract surface is accessible |

### 6.2 Dependency Direction Enforcement

Dependencies are enforced through multiple mechanisms, layered so that no single mechanism's failure produces a dependency violation in production:

| Mechanism | Description |
|---|---|
| Architectural review | New dependencies are reviewed before they are added; the review confirms the dependency satisfies the rules in Section 6.1 |
| Static analysis | Tools detect dependency violations (cycles, upward dependencies, lateral dependencies bypassing contracts) at build time |
| Contract testing | Consumers depend on contracts, not implementations; contract tests catch violations when implementations change |
| Module boundaries | Modules expose only their contract surface; internals are inaccessible outside the module |
| Runtime checks | Where static analysis is insufficient, runtime checks verify that tenant context, audit context, and security context are propagated correctly |

A dependency violation detected at any mechanism is a build-blocking defect. The violation is corrected or, in exceptional cases, ratified as an explicit exception through an ADR.

### 6.3 Dependency Versioning

Module dependencies are versioned. A consuming module declares which version range of a dependency it accepts. Backward-compatible changes — new optional fields, new operations, new events — do not require consumer changes and increment the minor version. Backward-incompatible changes — removed fields, changed semantics, changed operation signatures — increment the major version and follow the deprecation policy (SYSTEM_ARCHITECTURE Section 30.5).

Versioning is mandatory from a module's first release. A module that releases an unversioned contract cannot evolve safely and is a defect. The versioning scheme is documented in `MODULE_ARCHITECTURE.md`; this document governs only the rule that versioning is mandatory.

### 6.4 Transitive Dependencies

Transitive dependencies (A depends on B, B depends on C) are managed through declared contracts. A does not depend on C directly; it depends on B's contract, which may internally depend on C. If A needs C's capability, it must declare a direct dependency on C, not rely on transitive access.

This rule prevents hidden coupling through transitive dependencies, which is a common source of fragility in modular systems. A transitive dependency that becomes load-bearing — where A's behaviour depends on C's behaviour through B — is a defect; the remedy is to declare the dependency directly or to expose the needed capability through B's contract.

### 6.5 External Dependencies

External dependencies — third-party libraries, frameworks, services — are managed with discipline, because they introduce risk that is outside the platform's direct control. The discipline is:

| Step | Requirement |
|---|---|
| Justification | Each external dependency is justified; it solves a problem the platform cannot reasonably solve itself |
| License review | External dependencies' licenses are reviewed for compatibility with the platform's licensing model |
| Security review | External dependencies are reviewed for known vulnerabilities and security posture |
| Version pinning | External dependencies are version-pinned to avoid unexpected changes |
| Upgrade cadence | External dependencies are upgraded on a defined cadence, with security upgrades prioritized |
| Replacement plan | For critical external dependencies, a replacement plan exists in case the dependency becomes unsupportable |

An external dependency introduced without these steps is a defect. The Architecture Council reviews external dependencies quarterly and may require replacement of dependencies that have eroded in license, security, or maintainability.

### 6.6 Dependency Inversion at Boundaries

Dependency Inversion (Section 8.5) is applied at module boundaries: modules depend on abstractions (contracts), not on concretions (implementations). The abstraction is owned by the consuming module or by a shared kernel; the implementation is owned by the providing module. This inverts the natural dependency direction and decouples the consumer from the provider's implementation.

Dependency inversion is mandatory at module boundaries and is optional within modules. Within a module, direct dependencies on concretions are permitted where the indirection cost of inversion is not justified. The boundary is the load-bearing surface; the internals are the implementation's discretion.

---

## 7. Cross-Cutting Concerns

### 7.1 Concern Catalog

Cross-cutting concerns are capabilities that every layer and module participates in. They are not layers; they are dimensions that cut across the layered architecture. The catalog is stable; the addition of a new cross-cutting concern is an architectural amendment ratified through an ADR.

| Concern | Description | Implementation Mechanism | Governing Principle |
|---|---|---|---|
| Observability | Logs, metrics, traces, correlation | Platform-wide telemetry framework | P15 (Observability) |
| Security | Authentication, authorization, encryption | Platform-wide security framework | P1 (Healthcare Safety) |
| Audit | Capture of state-changing operations | Audit platform service | P13 (Auditability) |
| Localization | Locale-aware formatting and translation | Localization platform service | P17 (Regional Adaptation) |
| Tenant Context | Tenant identifier propagated through requests | Edge layer establishes; all layers consume | P10 (Multi-Tenancy) |
| Configuration | Configuration resolution and propagation | Configuration platform service | P2 (Configuration Before Customization) |
| Feature Flags | Capability exposure control | Feature flag platform service | P9 (Extensibility) |
| Error Handling | Consistent error reporting | Platform-wide error model | P14 (Simplicity) |
| Caching | Multi-level caching | Platform-wide cache framework | P14 |
| Performance | Latency and throughput monitoring | Platform-wide performance framework | P15, P18 |

### 7.2 Implementation Discipline

Cross-cutting concerns are implemented through platform-wide mechanisms, not reinvented per module. Each concern has a canonical implementation, a contract that modules use to interact with the concern, documentation describing how modules participate, and enforcement through review, tooling, or runtime checks.

A module that reinvents a cross-cutting concern — for example, implementing its own logging framework, its own audit capture, or its own authentication — is defective. The remedy is to consume the platform primitive. Reinvention fragments the concern's behaviour across modules, producing gaps that are difficult to detect and impossible to operate consistently. This is a direct consequence of Principles P13 (Auditability as Primitive) and P15 (Observability as Primitive): a concern that is primitive must be uniform across the platform.

### 7.3 Concern Composition and Ordering

Cross-cutting concerns compose through middleware, interceptors, or decorators — the specific mechanism is an implementation choice. A request flows through the middleware chain, with each concern participating at the appropriate point. The composition order is significant and is governed by the following rules:

| Concern | When Applied | Why |
|---|---|---|
| Tenant Context | At the edge, before any other concern | Every subsequent concern is tenant-scoped; tenant context must be established first |
| Authentication | After tenant context, before authorization | Authentication verifies the principal; the principal is needed before authorization |
| Authorization | After authentication, before the operation | The operation must not execute without authorization |
| Audit | After the operation commits, before response | Audit captures the outcome; the operation must complete first |
| Observability | Around the entire chain | Telemetry captures the full request lifecycle |
| Error Handling | Around the operation | Errors are caught, normalized, and reported consistently |

A concern applied out of order — for example, audit applied before the operation commits — produces incorrect audit records and is a defect. The composition order is documented per concern and is enforced at architectural review.

### 7.4 Concerns as Platform Primitives

Cross-cutting concerns are platform primitives, not module features. This means they are owned by the platform organization, not by module teams; they evolve through platform-level architectural decisions, not through module-level preferences; and they are consumed by modules through contracts, not implemented by modules.

The primitive posture is a direct consequence of Principle P13 (Auditability as Primitive) and P15 (Observability as Primitive), extended by analogy to all cross-cutting concerns. A primitive that is owned by no one is owned by everyone; a primitive that is everyone's responsibility is no one's responsibility. The platform organization owns the primitives; module teams consume them.

### 7.5 Concern Enforcement

Cross-cutting concerns are enforced through three mechanisms: review, tooling, and runtime checks. Architectural review confirms that a new module consumes the platform primitives and does not reinvent them. Tooling — static analysis, build-time checks — detects reinvention automatically and fails the build. Runtime checks — where static analysis is insufficient — verify that concerns are applied correctly at runtime, particularly for tenant context, audit, and authorization.

A concern that is not enforced is a concern that erodes. Enforcement is therefore not optional; it is part of the concern's definition. A concern whose enforcement mechanism has eroded is a defect in the concern, not in the modules that exploit the erosion.

---

## 8. SOLID Principles Application

### 8.1 Single Responsibility Application

The Single Responsibility Principle (SRP) states that a class or module has one reason to change. In Ibn Hayan, SRP is applied at the module level: each module has a single, cohesive domain responsibility, and changes to that responsibility are the module's only reason to change. SRP is also applied at the class and function level within modules, where it guides the decomposition of internal structure.

SRP is enforced through architectural review (for module-level responsibility) and through code review (for class- and function-level responsibility). A module that has multiple reasons to change — for example, a module that handles both clinical documentation and billing — has violated SRP and is a candidate for refactoring (Section 5.5). SRP conflicts with DRY (Section 9.1) when extracting shared logic would produce a class with multiple reasons to change; the conflict is resolved in favour of SRP, with limited duplication accepted.

### 8.2 Open-Closed Application

The Open-Closed Principle (OCP) states that software entities are open for extension and closed for modification. In Ibn Hayan, OCP is applied through the configuration-driven architecture (ADR-001, SYSTEM_ARCHITECTURE Section 8): modules are extended through configuration and through defined extension points (SYSTEM_ARCHITECTURE Section 22), not through source modification. A module that must be modified to accommodate a new capability has violated OCP and is a candidate for architectural review.

OCP is also applied at the contract level: contracts are designed to evolve through additive changes (new optional fields, new operations) without breaking existing consumers. Breaking changes follow the deprecation policy (SYSTEM_ARCHITECTURE Section 30.5). OCP is the principle that makes decade-horizon viability (P18) feasible — a platform whose modules must be modified for every new capability cannot absorb a decade of evolution.

### 8.3 Liskov Substitution Application

The Liskov Substitution Principle (LSP) states that subtypes must be substitutable for their base types. In Ibn Hayan, LSP is applied at the contract level: a contract's implementations must be substitutable for the contract without surprising consumers. A module that consumes a contract must not need to know which implementation it is consuming; the implementation's behaviour must conform to the contract's documented semantics.

LSP is enforced through contract testing. A contract has a published test suite that any implementation must pass; an implementation that passes the contract tests is substitutable, by construction. An implementation that passes the contract tests but exhibits surprising behaviour in production — for example, performance characteristics that differ materially from the contract's documented expectations — has violated LSP in spirit and is a candidate for review.

### 8.4 Interface Segregation Application

The Interface Segregation Principle (ISP) states that clients are not forced to depend on interfaces they do not use. In Ibn Hayan, ISP is applied at the contract level: module contracts are decomposed into cohesive interfaces, and consumers depend only on the interfaces they use. A monolithic contract that exposes all of a module's capability to every consumer violates ISP and is a candidate for decomposition.

ISP is enforced through contract review. A contract that has grown to expose unrelated capability is decomposed into cohesive sub-contracts, with consumers migrated to the sub-contracts that serve their needs. The decomposition follows the boundary refactoring process (Section 5.5) and is ratified through an ADR if the decomposition is breaking.

### 8.5 Dependency Inversion Application

The Dependency Inversion Principle (DIP) states that high-level modules depend on abstractions, not on low-level concretions. In Ibn Hayan, DIP is applied at module boundaries (Section 6.6): modules depend on contracts (abstractions), not on implementations (concretions). The contract is the abstraction; the implementation is the concretion.

DIP is mandatory at module boundaries and is optional within modules. Within a module, direct dependencies on concretions are permitted where the indirection cost of inversion is not justified — for example, in performance-critical internal paths. The boundary is the load-bearing surface; the internals are the implementation's discretion. DIP is the principle that makes contract versioning (Section 6.3) and module extraction (Section 4.6) feasible; without DIP, extraction would require rewriting consumers.

### 8.6 SOLID Conflicts and Resolutions

SOLID principles sometimes conflict. Common conflicts and their resolutions are:

| Conflict | Resolution |
|---|---|
| SRP vs. DRY | Extracting shared logic may violate SRP (the extracted class has multiple reasons to change). Prefer SRP; accept limited duplication if it preserves single responsibility. |
| OCP vs. KISS | The most extensible design is not the simplest. Prefer KISS for short-term needs; introduce extensibility when needed (YAGNI). |
| LSP vs. Performance | A substitutable implementation may be slower than a specialized one. Apply LSP at module boundaries; bypass it within performance-critical internal paths. |
| ISP vs. Contract Cohesion | Decomposing a contract may fragment a cohesive domain. Prefer cohesion; decompose only when the contract has genuinely unrelated capability. |
| DIP vs. Performance | Dependency inversion introduces indirection that affects performance. Apply DIP at module boundaries; bypass it within performance-critical internal paths. |

A conflict that is not resolved by these resolutions is escalated to the Architecture Council, which records the resolution in an ADR. Silent violation of a SOLID principle — without an explicit justification — is a defect.

---

## 9. DRY and KISS Principles

### 9.1 DRY Principle Application

The Don't Repeat Yourself (DRY) principle states that every piece of knowledge has a single, authoritative representation. In Ibn Hayan, DRY is applied across code, configuration, and documentation: a piece of knowledge — a business rule, a validation rule, a default value, a definition — is represented once and is referenced wherever it is needed.

DRY is not about avoiding code duplication mechanically; it is about avoiding knowledge duplication. Two pieces of code that look identical but represent different knowledge (because they change for different reasons) are not DRY violations. Two pieces of code that look different but represent the same knowledge (because they must change together) are DRY violations, regardless of their surface similarity. This distinction is critical and is enforced at code review.

DRY conflicts with SRP (Section 8.6) when extracting shared logic produces a class with multiple reasons to change. The conflict is resolved in favour of SRP; limited duplication is preferred over a class that changes for multiple reasons. Premature DRY extraction — extracting shared logic before the knowledge boundary is clear — produces耦合 that is harder to repay than the duplication would have been.

### 9.2 DRY Across Code, Configuration, and Documentation

DRY applies across the three representation surfaces:

| Surface | DRY Application |
|---|---|
| Code | A business rule is implemented once; consumers reference the implementation. Duplication across modules is a DRY violation. |
| Configuration | A configuration value is defined once at the appropriate layer (SYSTEM_ARCHITECTURE Section 15.2); lower layers inherit. Re-defining the same value at multiple layers is a DRY violation unless the override is intentional. |
| Documentation | A definition is stated once in the authoritative document; other documents reference it. Restating a definition across documents produces drift and is a DRY violation. |

The configuration surface is where DRY is most consequential, because configuration drift across the eight inheritance layers (SYSTEM_ARCHITECTURE Section 15.2) is difficult to detect and produces inconsistent platform behaviour. The configuration validation framework (SYSTEM_ARCHITECTURE Section 15.4) detects some drift; the remainder is detected at architectural review.

### 9.3 KISS Principle Application

The Keep It Simple, Stupid (KISS) principle states that simplicity is a feature; the simplest design that works is preferred. In Ibn Hayan, KISS is applied to every architectural decision: the simplest pattern, the simplest technology, the simplest decomposition that satisfies the requirements is chosen, and complexity is added only when justified by a documented requirement.

KISS is governed by Principle P14 (Simplicity Over Complexity). P14 is subordinate to P1 (Healthcare Safety), P5 (Consistency for Clinical Data), P11 (Offline-First), and P13 (Auditability); simplicity is valuable but not at the cost of safety, consistency, offline operation, or audit. A complex design that is justified by one of these subordinate principles is not a KISS violation; a complex design that is justified by convenience or fashion is.

KISS is enforced through architectural review. A proposed design's complexity must be justified by a documented requirement; unjustified complexity is rejected. The burden is on the proposer to justify complexity, not on the reviewer to disprove it.

### 9.4 YAGNI and Premature Generalization

The You Aren't Gonna Need It (YAGNI) principle states that capabilities should not be built until they are needed. In Ibn Hayan, YAGNI is applied to feature scope and to architectural generalization: speculative features and speculative generalization are rejected, and capability is built when a demonstrated need exists.

YAGNI conflicts with Principle P18 (Decade-Horizon Viability) when the decade horizon requires some future-proofing. The conflict is resolved by distinguishing between speculative generalization (forbidden by YAGNI) and load-bearing architectural commitments (required by P18). A speculative generalization is one that anticipates a need that may not materialize; a load-bearing commitment is one that the architecture depends on for its viability. The distinction is documented in the ADR that ratifies the commitment.

Premature optimization (Section 2.5) is a form of premature generalization: optimizing before profiling has identified the bottleneck. Premature optimization is forbidden and is corrected at code review.

### 9.5 Simplicity Versus Power Trade-off

Simplicity and power are in tension: a more powerful design is often less simple, and a simpler design is often less powerful. Ibn Hayan resolves this tension through the configuration-driven architecture (ADR-001): the platform's core is simple, and power is expressed through configuration, not through complexity in the core.

The trade-off is stated as follows. The platform's core handles the common case simply and well; the configuration surface handles the variation. A capability that cannot be expressed through configuration is a candidate for platform evolution, not for complexity in the core. This resolution honours PRODUCT_BIBLE Design Principle D-4 (Simplicity Without Sacrificing Power) and is the architectural expression of that principle.

The trade-off is reviewed at architectural review. A proposed design that adds complexity to the core to satisfy a specific customer is rejected; the customer's need is addressed through configuration, through extension points, or through platform evolution, in that order of preference.

---

## 10. Technology Stack

### 10.1 Technology-Agnostic Posture

`SYSTEM_ARCHITECTURE.md` commits to a technology-agnostic posture (SYSTEM_ARCHITECTURE Section 1.4): the architecture specifies capabilities, not technologies, wherever possible. This document respects that posture. The technology stack is an implementation concern, governed by the architecture but not specified by it. Specific technology selections are documented in implementation guides and are subject to change through the technology refresh process (SYSTEM_ARCHITECTURE Section 30.6).

This section defines the categories of technology the platform uses and the criteria for selecting specific technologies within each category. Specific products are not named; naming a specific product as an architectural commitment would violate the technology-agnostic posture and would compromise decade-horizon viability (P18), because technologies change on shorter cycles than the platform's viability horizon.

### 10.2 Technology Categories

The platform uses the following technology categories. Each category has a purpose and selection criteria; the specific product within a category is selected per the process in Section 10.3.

| Category | Purpose | Selection Criteria |
|---|---|---|
| Application platform | Runtime for application logic | Multi-tenancy support; performance; ecosystem; long-term support; team capability |
| Transactional data store | Operational state with strong consistency | ACID; multi-tenancy patterns; scalability; operational maturity; P5 compliance |
| Analytical data store | Reporting and analytics | Columnar or lakehouse; analytical query performance; integration with ETL/ELT |
| Cache store | Hot-path reads | Low latency; TTL support; distributed operation; eviction policies |
| Object store | Large binary artifacts | Durability; cost; integration with application platform; lifecycle policies |
| Audit store | Tamper-evident audit | Append-only; cryptographic tamper-evidence; queryability; P13 compliance |
| Message broker | Event distribution | At-least-once delivery; ordering guarantees; throughput; dead-letter handling |
| Search platform | Full-text and structured search | Relevance; multi-tenancy; performance; incremental indexing |
| Identity provider | Authentication and user management | Multi-factor authentication; standards compliance; federation; session management |
| Observability platform | Logs, metrics, traces | Correlation; queryability; retention; alerting; P15 compliance |
| Deployment platform | Compute, network, storage | Multi-region; autoscaling; operational maturity; P10 compliance |
| Key management service | Cryptographic key management | Rotation; audit; separation of duties; P1, P13 compliance |

### 10.3 Selection Process

Technology selections follow a defined process. The process is mandatory for any technology that becomes load-bearing — a technology whose replacement would require architectural rework. Non-load-bearing technologies (e.g., a utility library) follow a lighter process, documented in the implementation guides.

| Step | Activity | Output |
|---|---|---|
| Need identification | A specific need is identified that a technology category must serve | Documented need statement |
| Option evaluation | Candidate technologies are evaluated against the selection criteria | Evaluation matrix |
| Proof of concept | A proof of concept validates the technology against the platform's specific requirements | Proof-of-concept report |
| Decision | A decision is made, documented in an ADR if the choice is load-bearing | ADR (if load-bearing) |
| Adoption | The technology is adopted, with a migration path if replacing an existing technology | Migration plan |
| Review | The technology is reviewed on a defined cadence; replacement is considered if it no longer serves the platform's needs | Review record |

A technology adopted without this process is a defect. The Architecture Council reviews the technology portfolio quarterly and may require replacement of technologies that have eroded in supportability, security, or alignment with the platform's principles.

### 10.4 Vendor Lock-In Avoidance

The platform avoids vendor lock-in through four mechanisms. First, where open standards exist (e.g., recognized healthcare interoperability standards, recognized query languages), the platform uses them. Second, the platform abstracts vendor-specific capabilities behind internal contracts, allowing vendors to be replaced without affecting consumers. Third, critical capabilities are tested for portability across at least two vendors, where feasible. Fourth, for each critical vendor, an exit strategy exists, even if it is never exercised.

Vendor lock-in is not always avoidable; where it is accepted, the acceptance is explicit and documented in an ADR. The ADR records the lock-in accepted, the rationale, the consequences, and the conditions under which the lock-in would be revisited. Silent lock-in — lock-in accepted without documentation — is a defect.

### 10.5 Technology Refresh

Technology refresh is the disciplined replacement of one technology with another within a category. Refresh is governed by SYSTEM_ARCHITECTURE Section 30.6 and is undertaken when a technology has eroded in supportability, security, or alignment, or when a successor technology offers material benefit. Refresh follows the same process as initial selection (Section 10.3), with an additional migration plan that documents the transition from the incumbent to the successor.

Refresh is paced to preserve operational stability. A refresh that disrupts customer operations is rejected unless the disruption is justified by a documented requirement. The decade horizon (P18) means that refresh is expected and planned for, not feared; the architecture absorbs refresh through layer independence (Section 3.6) and contract preservation.

---

## 11. Framework Selection Criteria

### 11.1 Frameworks as Implementation Choices

Frameworks are implementation choices, not architectural commitments. The architecture specifies capabilities (e.g., "a workflow engine that evaluates declarative definitions"); the framework that implements that capability is selected per the technology selection process (Section 10.3). A framework commitment recorded as an architectural commitment is a defect; it violates the technology-agnostic posture (SYSTEM_ARCHITECTURE Section 1.4).

Frameworks may be discussed in architectural trade-offs (Section 12) where the framework's design imposes structural constraints that affect the architecture. In such cases, the trade-off is documented in an ADR; otherwise, framework selection is an implementation concern and is not governed by this document.

### 11.2 Framework Categories

The platform uses the following framework categories. Each category has a purpose; the specific framework within a category is selected per the criteria in Section 11.3.

| Framework Category | Purpose | Architectural Concern |
|---|---|---|
| Web framework | HTTP request handling; routing; middleware | Must support the layered architecture (Section 3) and the cross-cutting concern composition (Section 7.3) |
| ORM / data access | Object-relational mapping; data access | Must preserve the Data Layer contract (SYSTEM_ARCHITECTURE Section 6.8); must not bypass tenant scoping |
| Workflow engine | Declarative workflow evaluation | Must execute configured workflows (SYSTEM_ARCHITECTURE Section 16); must not host custom code |
| Rules engine | Declarative business rule evaluation | Must support configuration-driven rules (ADR-001); must be auditable |
| Form engine | Form rendering from configuration | Must render forms from configuration (ADR-001); must support localization |
| Messaging framework | Event production and consumption | Must support the outbox pattern (Section 2.1); must support idempotent consumption |
| Authentication framework | Authentication flows; session management | Must integrate with the Identity & Access bounded context (BC15) |
| Authorization framework | Authorization checks; role-permission resolution | Must enforce tenant scoping (P10) and hierarchical permission scoping (SYSTEM_ARCHITECTURE Section 11.4) |
| Testing framework | Unit, integration, contract, end-to-end testing | Must support contract testing (Section 6.2) |
| Observability framework | Telemetry emission and correlation | Must support the platform's telemetry contract (P15) |

### 11.3 Framework Selection Criteria

Framework selection applies the technology selection criteria (Section 10.3) with additional criteria specific to frameworks, because frameworks impose structural constraints that libraries do not:

| Criterion | Description |
|---|---|
| Alignment with architecture | The framework supports the platform's architectural patterns (Section 2) and does not impose conflicting patterns |
| Multi-tenancy support | The framework supports multi-tenancy natively or through well-documented patterns; tenant context propagation is enforceable |
| Long-term support | The framework is actively maintained and has a sustainable support model on the decade horizon (P18) |
| Ecosystem | The framework has a healthy ecosystem of extensions, documentation, and community |
| Performance | The framework's performance is acceptable for the platform's workloads, including peak clinical workloads |
| Security posture | The framework has a strong security posture and a track record of timely security fixes |
| License compatibility | The framework's license is compatible with the platform's licensing model |
| Team capability | The team can operate the framework effectively through its lifecycle, including its failure modes |
| Reversibility | The framework can be replaced without architectural rework, or the irreversibility is acknowledged explicitly |

### 11.4 Framework Governance

Frameworks are governed like other external dependencies (Section 6.5), with additional discipline because frameworks impose structural constraints that libraries do not. The governance is:

| Discipline | Requirement |
|---|---|
| Architectural review | New frameworks are reviewed by the architecture organization before adoption; the review confirms the framework satisfies the selection criteria |
| Limitation per category | The platform uses a small number of frameworks per category, to avoid fragmentation; a category with more than two frameworks is a candidate for consolidation |
| Framework upgrades | Frameworks are upgraded on a defined cadence, with security upgrades prioritized over feature upgrades |
| Framework replacement | When a framework is replaced, a migration path is defined and executed over a defined window; the replacement follows the deprecation policy |
| Framework inventory | The framework inventory is documented and reviewed quarterly; frameworks that have eroded are scheduled for replacement |

### 11.5 Framework Replacement

Framework replacement is the disciplined substitution of one framework with another within a category. Replacement is undertaken when a framework has eroded in supportability, security, or alignment, or when a successor framework offers material benefit. Replacement follows the same process as initial selection (Section 10.3), with an additional migration plan that documents the transition from the incumbent to the successor.

Replacement is paced to preserve operational stability and to preserve the contract surface that consumers depend on. Where the incumbent and successor frameworks expose different interfaces, an adapter layer preserves the consumer-facing contract during the transition, and is removed when the transition is complete. A framework replacement that breaks consumer contracts without a transition window is a defect and erodes customer trust.

---

## 12. Architectural Trade-offs

### 12.1 Trade-off Catalog

Architectural decisions involve trade-offs. This section catalogs the most significant trade-offs in Ibn Hayan's software architecture, with the chosen resolution and rationale. The catalog is not exhaustive; it documents the trade-offs that recur and that architects must understand.

| Trade-off | Options | Chosen Resolution | Rationale | Governing ADR |
|---|---|---|---|---|
| Monolith vs. microservices | Single deployable vs. many deployables | Modular monolith | Balances autonomy, performance, and operational simplicity | ADR-002 |
| Strong vs. eventual consistency | ACID everywhere vs. eventual everywhere | Strong within aggregate; eventual across contexts | Matches clinical and financial correctness requirements (P5) | — |
| Configuration vs. flexibility | Limited configurable surface vs. arbitrary extension | Configuration-driven | Preserves upgradability, auditability, and multi-tenancy (P2) | ADR-001 |
| Offline vs. online | Online-only vs. local-first | Local-first | Serves connectivity-challenged settings and clinical safety (P11) | ADR-003 |
| Multi-tenant vs. single-tenant | Shared infrastructure vs. dedicated per customer | Multi-tenant default | Serves customer spectrum economically (P10, P3) | ADR-004 |
| Single store vs. segmented stores | One store for all data vs. specialized stores per access pattern | Segmented | Optimizes each access pattern; preserves audit integrity (P13) | ADR-006 |
| Synchronous vs. asynchronous integration | Blocking calls vs. messaging | Per integration | Matches external system capabilities (SYSTEM_ARCHITECTURE Section 19.2) | — |
| CQRS everywhere vs. selectively | Separate read/write models everywhere vs. where justified | Selectively | Avoids complexity where not justified (P14) | — |
| Event sourcing everywhere vs. selectively | Event-sourced state everywhere vs. where justified | Selectively (audit) | Avoids complexity where not justified (P14) | — |
| Coupling vs. redundancy | Shared abstraction vs. duplicated logic | Per case (Section 9.1) | Distinguishes knowledge duplication from incidental duplication | — |

### 12.2 Trade-off Evaluation Criteria

Trade-offs are evaluated against five criteria. The criteria are applied as a balanced assessment; no single criterion is decisive, and the criteria may conflict. When criteria conflict, the conflict is documented in the ADR's rationale, with the precedence applied recorded.

| Criterion | Test |
|---|---|
| Architectural principles | Does the resolution honour the architectural principles (SYSTEM_ARCHITECTURE Section 4)? |
| Decade horizon | Will the resolution remain viable over the platform's lifetime (P18)? |
| Operational burden | Is the operational burden of the resolution acceptable, given the platform's operational capacity? |
| Team capability | Can the team operate the resolution effectively through its lifecycle, including its failure modes? |
| Reversibility | Is the resolution reversible if it proves wrong (P6), or is the irreversibility acknowledged explicitly? |

A trade-off that fails one or more criteria is not automatically rejected; the failure is documented, and the resolution is justified by the criteria that it satisfies. A trade-off that fails all criteria is rejected.

### 12.3 Documenting Trade-offs

Significant trade-offs are documented in ADRs. The ADR records the trade-off, the options considered, the chosen resolution, the rationale, the criteria applied, and the consequences. The documentation supports future architects who need to understand why a decision was made and whether it remains valid.

An ADR is required for any trade-off that is load-bearing — a trade-off whose reversal would require architectural rework. Non-load-bearing trade-offs are documented in the module's specification. The distinction between load-bearing and non-load-bearing is made by the architect proposing the trade-off and is confirmed at architectural review.

### 12.4 Trade-off Reversibility

Trade-off reversibility is governed by Principle P6 (Reversibility Over Permanence). Reversibility is preferred where it does not compromise safety, consistency, or audit. Decisions that are difficult to reverse are made deliberately, with the irreversibility acknowledged in the ADR's rationale.

Reversibility is preserved through three mechanisms. First, contracts are versioned, so consumers can be migrated gradually. Second, the layered architecture allows components to be replaced without affecting other layers. Third, the extension surface (SYSTEM_ARCHITECTURE Section 22) allows capability to be added and removed without modifying the core. A trade-off that forecloses all three mechanisms is highly irreversible and is undertaken only with Architecture Council ratification.

### 12.5 Trade-off Review Cadence

Trade-offs are reviewed on the quarterly review cadence and off-cycle when a triggering event occurs. Triggering events include: a principle change (e.g., a new architectural principle is ratified); a technology change (e.g., a successor technology becomes viable); an operational event (e.g., an incident reveals a trade-off's hidden cost); or a customer event (e.g., a customer requirement exposes a trade-off's limitation).

A trade-off review does not automatically produce a change; it produces an assessment of whether the trade-off remains valid. A trade-off that remains valid is confirmed; a trade-off that no longer remains valid is scheduled for revisiting, with an ADR scoping the revision. A trade-off that has not been reviewed in the documented cadence is a documentation defect.

---

## 13. Technical Debt Management

### 13.1 Technical Debt Definition

Technical debt is the gap between the current implementation and the implementation that the architecture specifies. Debt arises from shortcuts taken under time pressure, from architectural decisions that proved wrong, from external dependencies that have become unsupportable, and from the natural evolution of the platform's understanding of itself. Debt is inevitable in a platform of Ibn Hayan's scope; unmanaged debt is not.

Not all debt is bad. Strategic debt — taken deliberately, with a documented repayment plan — is a normal part of software development and is acknowledged as such. Unstrategic debt — taken accidentally, without a repayment plan — is a defect and is corrected. The distinction is documented: strategic debt has an ADR or a debt-register entry; unstrategic debt does not.

Technical debt is governed by Principle P18 (Decade-Horizon Viability). Debt that compromises decade-horizon viability is high-priority and is repaid before debt that affects only the current quarter. The decade horizon is the test applied when prioritizing debt repayment.

### 13.2 Debt Categories

Debt is categorized to enable targeted repayment. The categories are not mutually exclusive; a single debt item may span multiple categories, but it is assigned a primary category for prioritization.

| Category | Description | Repayment Approach | Typical Priority |
|---|---|---|---|
| Architectural debt | Implementation diverges from the architecture | Refactoring toward the architecture; ADR-scoped initiatives | High — affects decade-horizon viability |
| Design debt | Implementation violates design principles (Section 8) | Refactoring toward the principles | Medium — affects maintainability |
| Dependency debt | External dependencies are outdated or unsupportable | Upgrade or replacement | High if security-impacting; Medium otherwise |
| Test debt | Insufficient test coverage or quality | Test additions and improvements | Medium — affects confidence |
| Documentation debt | Documentation is missing, outdated, or inaccurate | Documentation updates | Medium — affects onboarding and review |
| Configuration debt | Configuration has accumulated cruft (unused flags, stale records) | Configuration cleanup | Low — affects clarity |
| Operational debt | Operational tooling and runbooks are missing or outdated | Operational improvements | Medium — affects incident response |
| Security debt | Known security weaknesses | Remediation per security incident response | High — affects P1 |

### 13.3 Debt Tracking

Technical debt is tracked in a debt register, maintained by the architecture organization. The register is the single source of truth for debt; debt not in the register is not tracked and is therefore unstrategic. Each debt item records:

| Field | Description |
|---|---|
| Description | What the debt is, in concrete terms |
| Category | Which category (Section 13.2) the debt belongs to |
| Origin | When and why the debt was incurred |
| Impact | What the debt costs (performance, maintainability, risk, customer experience) |
| Repayment plan | How and when the debt will be repaid |
| Priority | Relative priority for repayment, considering impact and urgency |
| Owner | The team or individual responsible for repayment |
| Status | Current status (Open, In Progress, Repaid, Accepted) |

The register is reviewed quarterly by the Architecture Council. Debt items that have eroded in priority are reprioritized; debt items whose repayment plans have slipped are rescheduled with documented reasons. A debt item that has been Open for more than a year without progress is escalated for explicit acceptance or repayment.

### 13.4 Debt Repayment

Debt is repaid through four mechanisms, applied in combination:

| Mechanism | Description | When Applied |
|---|---|---|
| Dedicated repayment time | A portion of each engineering cycle is dedicated to debt repayment | Routinely, for medium-priority debt |
| Opportunistic repayment | Debt is repaid when nearby work is being done (the "boy scout rule") | Routinely, for low-priority debt |
| Targeted campaigns | Specific debt categories are targeted for focused repayment | Periodically, for accumulated debt in a category |
| Architectural initiatives | Significant architectural debt is repaid through dedicated initiatives, ratified through ADRs | For high-priority architectural debt |

Dedicated repayment time is protected. A cycle in which dedicated repayment time is consumed by feature work is a process defect and is recorded; repeated consumption escalates to the Architecture Council. Debt repayment is not optional; it is part of the platform's commitment to decade-horizon viability.

### 13.5 Debt Acceptance

Some debt is accepted as permanent. A legacy module that will never be fully refactored to current standards, because the cost of refactoring exceeds the benefit, is accepted debt. Accepted debt is documented, with the rationale, the cost of non-repayment, and the conditions under which the acceptance would be revisited.

Accepted debt is reviewed on the quarterly cadence. An acceptance that no longer holds — for example, because the legacy module has become load-bearing for a new capability — is revoked, and the debt is scheduled for repayment. Silent acceptance — debt that is implicitly accepted without documentation — is a defect; the remedy is to document the acceptance or to schedule the repayment.

### 13.6 Debt Prevention

Debt prevention is preferable to debt repayment. The platform prevents debt through three mechanisms. First, architectural review catches proposed designs that would incur debt before they are implemented. Second, the documented-before-implemented principle (P7) ensures that decisions are recorded before they are committed, making debt visible at inception. Third, the deprecation policy (SYSTEM_ARCHITECTURE Section 30.5) ensures that old capability is removed disciplinedly, preventing the accumulation of deprecated-but-not-removed debt.

Debt prevention is not perfect; some debt is incurred despite prevention, because of time pressure, unforeseen requirements, or genuine uncertainty. The platform's commitment is not to prevent all debt but to make all debt visible, documented, and managed. A debt item that is invisible — that exists only in the implementation, without a register entry or an ADR — is the defect that the debt management framework is designed to prevent.
