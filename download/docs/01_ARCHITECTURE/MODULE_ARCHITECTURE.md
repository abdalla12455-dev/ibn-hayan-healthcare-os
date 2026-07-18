# Ibn Hayan Healthcare Operating System
## Module Architecture

> **Document Purpose:** The internal architecture of Ibn Hayan modules — catalog, boundaries, contracts, dependencies, lifecycle, communication patterns, versioning, extension points, configuration surface, isolation strategy, and testing strategy. This document elaborates the module-level aspects of `SYSTEM_ARCHITECTURE.md` Sections 9 and 13 and must align with them.
>
> **Status:** Authoritative · **Version:** 1.0.0 · **Last Updated:** 2026-07-18
> **Document Owner:** Office of the Chief Software Architect
> **Review Cadence:** Quarterly, with off-cycle revision when a related ADR is ratified
>
> This document is part of the official Ibn Hayan Healthcare Operating System
> documentation framework and serves as the authoritative reference for its
> architectural domain. It is intended for the entire engineering, architecture,
> security, and operations organizations.

---

## Table of Contents

1. Module Architecture Overview
2. Module Catalog
3. Module Boundaries
4. Module Contracts
5. Module Dependencies
6. Module Lifecycle
7. Module Communication Patterns
8. Module Versioning
9. Module Extension Points
10. Module Configuration Surface
11. Module Isolation Strategy
12. Module Testing Strategy
13. Related Documents

---

## 1. Module Architecture Overview

### 1.1 Purpose and Scope

This document defines the internal architecture of Ibn Hayan modules. It elaborates the module-level aspects of the platform — what modules exist, how they are bounded, how they contract with each other, how they evolve, and how they are tested. It is constrained by, and must align with, `SYSTEM_ARCHITECTURE.md`, particularly Sections 9 (Modular Architecture) and 13 (Module Architecture).

Where this document and `SYSTEM_ARCHITECTURE.md` appear to conflict, `SYSTEM_ARCHITECTURE.md` prevails. This document is amended through the same ADR process.

### 1.2 Audience

The primary audience is software architects, module owners, principal engineers, and engineering managers who design and govern modules. The secondary audience is engineers implementing modules, who must understand the structural boundaries their work operates within.

### 1.3 Foundational Decisions

This document is governed by the following ADRs:

| ADR | Decision |
|---|---|
| ADR-001 | Configuration-driven architecture (modules expose configuration schemas) |
| ADR-002 | Modular architecture (modules are autonomous units with explicit contracts) |
| ADR-004 | Multi-tenant strategy (modules are multi-tenant by construction) |
| ADR-006 | Database strategy (modules own their authoritative state) |

### 1.4 Document Conventions

Sections are numbered for stable cross-referencing. Tables summarize decisions where prose would obscure them. The verbs *must*, *should*, and *may* are used in their normative sense. Module names are capitalized (e.g., the Patient module).

---

## 2. Module Catalog

### 2.1 Module Inventory

Ibn Hayan's modules correspond to the bounded contexts defined in `SYSTEM_ARCHITECTURE.md` Section 7.2. The catalog below lists the modules, their owning context, and their primary responsibility.

| Module | Owning Context | Primary Responsibility |
|---|---|---|
| Patient | Patient | Patient identity, demographics, consents, identifiers |
| Encounter | Encounter | Patient–provider interactions across time and settings |
| Clinical Documentation | Clinical Documentation | Charts, notes, assessments, observations, care plans |
| Orders & Results | Orders & Results | Diagnostic and therapeutic orders and their results |
| Scheduling | Scheduling | Appointments, resources, calendars, slots |
| Billing | Billing | Charges, claims, invoices, payments, adjustments |
| Inventory | Inventory | Medical and consumable stock, movements, lots |
| Pharmacy | Pharmacy | Medications, prescriptions, dispensing |
| Workforce | Workforce | Practitioners, staff, roles, credentials |
| CRM | CRM | Prospects, leads, campaigns, communications |
| Accounting | Accounting | Ledgers, accounts, postings, reconciliations |
| HR | HR | Employees, payroll inputs, leave, attendance |
| Documents | Documents | Clinical and administrative documents, templates, signatures |
| Notifications | Notifications | Notification templates, delivery, preferences |
| Identity & Access | Identity & Access (platform service) | Users, sessions, roles, permissions |
| Configuration | Configuration (platform service) | Configuration schemas, values, versions |
| Audit | Audit (platform service) | Audit events, audit context |
| Feature Flags | Feature Flags (platform service) | Flag definitions, evaluations |
| Localization | Localization (platform service) | Translations, locale catalogs |

### 2.2 Module Classification

Modules are classified by their role in the platform:

| Classification | Modules | Characteristics |
|---|---|---|
| Clinical modules | Patient, Encounter, Clinical Documentation, Orders & Results, Pharmacy | Healthcare-native; clinical safety is paramount |
| Operational modules | Scheduling, Inventory, Workforce, Documents, Notifications | Support daily operations; clinical-adjacent |
| Business modules | Billing, CRM, Accounting, HR | Financial and administrative; regulatory compliance |
| Platform service modules | Identity & Access, Configuration, Audit, Feature Flags, Localization | Cross-cutting; depended upon by all other modules |

### 2.3 Module Ownership

Each module has a clear owner — a team responsible for the module's design, implementation, operation, and evolution. Ownership is recorded in the module registry and is updated through defined handover processes. A module without a clear owner is a defect.

### 2.4 Module Maturity

Modules vary in maturity. Some are generally available and stable; some are newer and still stabilizing; some are being deprecated in favor of successors. Module maturity is tracked in the module registry and is communicated through release notes.

---

## 3. Module Boundaries

### 3.1 Boundary Definition

A module boundary is the surface between a module and the rest of the platform. Everything inside the boundary is private to the module; everything on the boundary is public. The boundary is defined by the module's contract surface (Section 4).

Boundary design is the most consequential module-level decision. A well-designed boundary enables independent evolution; a poorly designed boundary creates coupling that impedes evolution. Boundaries are designed before they are published; once published, they are expensive to change.

### 3.2 Boundary Design Criteria

A module boundary should:

1. **Expose cohesive capabilities.** The capabilities exposed on the boundary are related and serve a coherent purpose.
2. **Hide implementation details.** Internal data structures, algorithms, and processes are not visible on the boundary.
3. **Be stable.** The boundary evolves through backward-compatible changes; breaking changes are rare and follow the deprecation policy.
4. **Be minimal.** The boundary exposes only what consumers need; speculative capabilities are not exposed.
5. **Be documented.** Each capability on the boundary is documented with its contract, semantics, and failure modes.

### 3.3 Boundary Anti-Patterns

| Anti-Pattern | Description | Why Forbidden |
|---|---|---|
| Leaky abstraction | The boundary exposes implementation details (e.g., internal data structures) | Couples consumers to implementation |
| God contract | A single contract handles many unrelated responsibilities | Violates single responsibility |
| Chatty boundary | Consumers must make many calls to accomplish one operation | Inefficient and brittle |
| Anemic boundary | The boundary exposes data but no behavior | Reduces modules to data stores |
| Undocumented boundary | Capabilities are not documented | Consumers guess at behavior |
| Unstable boundary | The boundary changes frequently in breaking ways | Consumers cannot depend on it |

### 3.4 Boundary Refactoring

Module boundaries may be refactored, but only through a deliberate process (SOFTWARE_ARCHITECTURE.md Section 5.5): justification, ADR, migration path, deprecation, retirement. Boundary refactoring is expensive and is undertaken only when the cost of not refactoring exceeds the cost of refactoring.

---

## 4. Module Contracts

### 4.1 Contract Surface

Every module exposes a contract surface consisting of four elements (SYSTEM_ARCHITECTURE.md Section 9.2):

| Contract Element | Purpose | Examples |
|---|---|---|
| Commands | Operations that change state | RegisterPatient, ScheduleAppointment, SubmitClaim |
| Queries | Operations that return data without changing state | GetPatient, ListAppointments, GetClaimStatus |
| Domain Events | Notifications of state changes | PatientRegistered, AppointmentScheduled, ClaimSubmitted |
| Configuration Schema | Configuration the module accepts | Patient validation rules, Appointment slot durations |

A module may not expose any other surface. Internal implementation is not part of the contract.

### 4.2 Contract Definition

Contracts are defined explicitly, with:

1. **Name** — a stable, descriptive identifier.
2. **Version** — semantic version (major.minor.patch).
3. **Inputs** — parameters with types and constraints.
4. **Outputs** — return values with types and constraints.
5. **Errors** — possible errors with codes and meanings.
6. **Preconditions** — conditions that must hold for the operation to be valid.
7. **Postconditions** — conditions that hold after the operation succeeds.
8. **Idempotency** — whether the operation is idempotent.
9. **Authorization** — required permissions.
10. **Audit** — what is captured in the audit log.

Contracts are documented in a standard format and are version-controlled alongside the module's source code.

### 4.3 Command Contracts

Commands are operations that change state. Every command:

1. **Is named in the imperative** (e.g., `RegisterPatient`, not `PatientRegistration`).
2. **Has a unique identifier** (for idempotency).
3. **Is authorized** before execution.
4. **Is validated** before execution.
5. **Is audited** on execution.
6. **Emits domain events** on success.

Commands may be synchronous (the caller waits for the result) or asynchronous (the caller receives an acknowledgement and the result is delivered later). The choice is part of the command's contract.

### 4.4 Query Contracts

Queries are operations that return data without changing state. Every query:

1. **Is named in the interrogative or as a noun** (e.g., `GetPatient`, `PatientList`).
2. **Is authorized** before execution.
3. **Is tenant-scoped** by default.
4. **Is cacheable** where appropriate.
5. **Does not emit domain events** (queries are side-effect-free).

Queries may be paginated, filtered, sorted, and projected. The query contract defines the supported parameters and their semantics.

### 4.5 Domain Event Contracts

Domain events are notifications of state changes. Every event:

1. **Is named in the past tense** (e.g., `PatientRegistered`, `AppointmentScheduled`).
2. **Has a unique identifier** (for idempotent consumption).
3. **Has a timestamp** (when the event occurred).
4. **Has a tenant identifier** (for tenant-scoped consumption).
5. **Has a producer identifier** (which module emitted it).
6. **Has a payload** (the data the event carries).
7. **Has a schema version** (for evolution).

Events are emitted by the module that owns the state change, through the outbox pattern (Section 7.4), and are delivered to subscribers at least once.

### 4.6 Configuration Schema Contracts

Configuration schemas define what configuration a module accepts. Every schema:

1. **Declares configuration keys** with types, defaults, and constraints.
2. **Declares validation rules** (structural, referential, semantic, contextual, regulatory).
3. **Declares inheritance behavior** (how the value is resolved across configuration layers).
4. **Declares default values** (used when no value is provided).
5. **Is versioned** (for evolution).

Configuration schemas are documented in a standard format and are version-controlled alongside the module's source code. They are detailed in `CONFIGURATION_ARCHITECTURE.md`.

---

## 5. Module Dependencies

### 5.1 Dependency Rules

Module dependencies follow the rules in `SYSTEM_ARCHITECTURE.md` Section 9.3 and `SOFTWARE_ARCHITECTURE.md` Section 6.1:

1. Modules may depend on platform service modules.
2. Modules may depend on other domain modules through published contracts only.
3. Modules may depend on integration adapters through published contracts.
4. Modules may not depend on the experience layer.
5. Modules may not depend on the orchestration layer (except by being invoked by it).
6. Modules may not depend on another module's internals.
7. Dependency cycles are forbidden.

### 5.2 Dependency Direction

Dependencies flow downward and inward (SOFTWARE_ARCHITECTURE.md Section 3.2). The typical dependency direction is:

| Source Module | May Depend On |
|---|---|
| Clinical module (e.g., Patient) | Platform services (Identity & Access, Configuration, Audit, Feature Flags, Localization); other clinical modules through contracts |
| Operational module (e.g., Scheduling) | Platform services; clinical modules through contracts; other operational modules through contracts |
| Business module (e.g., Billing) | Platform services; clinical and operational modules through contracts; integration adapters (e.g., payment gateways) |
| Platform service module (e.g., Configuration) | Data layer; other platform services through contracts |

### 5.3 Dependency Inventory

Each module maintains a dependency inventory — a documented list of modules it depends on, the contracts it depends on, and the versions it accepts. The inventory is version-controlled alongside the module's source code and is reviewed during architectural review.

### 5.4 Forbidden Dependencies

The following dependencies are explicitly forbidden:

| Forbidden Dependency | Why |
|---|---|
| Domain module → Experience layer | Experience layer is a rendering surface, not a capability source |
| Domain module → Orchestration layer | Orchestration coordinates domain modules; the reverse would invert the dependency direction |
| Domain module → Another module's internals | Internals are private; only contracts are public |
| Platform service → Domain module | Platform services are depended upon by domains, not vice versa |
| Circular dependency | Cycles make the system impossible to reason about and to deploy independently |

---

## 6. Module Lifecycle

### 6.1 Lifecycle States

Modules follow a defined lifecycle (SYSTEM_ARCHITECTURE.md Section 9.4):

| State | Meaning |
|---|---|
| Proposed | The module is defined in an ADR but not yet implemented |
| Implemented | The module's contract is implemented and integrated |
| Generally Available | The module is enabled by default for new tenants |
| Optional | The module is available but not enabled by default; tenants may enable it |
| Deprecated | The module is scheduled for retirement; a deprecation timeline is published |
| Retired | The module is no longer available; existing tenants have been migrated |

### 6.2 Lifecycle Transitions

| Transition | Trigger | Requirements |
|---|---|---|
| Proposed → Implemented | Implementation complete | Contract tests pass; documentation complete; security review passed |
| Implemented → Generally Available | Sufficient stability and adoption | Operational readiness criteria met; performance validated; documentation published |
| Generally Available → Optional | Reduced demand or replacement by a successor | Successor available; migration path defined |
| Optional → Deprecated | Scheduled retirement | Deprecation timeline published; affected tenants notified |
| Deprecated → Retired | Deprecation window elapsed | All tenants migrated; data preserved per retention policy |

### 6.3 Module Retirement

Retiring a module is a significant undertaking. The retirement process:

1. **Justification.** The retirement is justified by a structural concern (e.g., the module's capability is replaced by a successor).
2. **ADR.** The retirement is ratified through an ADR.
3. **Tenant notification.** Affected tenants are notified with sufficient lead time.
4. **Migration path.** A migration path is defined and documented.
5. **Migration execution.** Tenants are migrated, with data preserved per retention policy.
6. **Deprecation window.** The module operates in deprecated state during the migration window.
7. **Retirement.** The module is retired; its contracts are removed; its data is archived or purged per retention policy.

---

## 7. Module Communication Patterns

### 7.1 Communication Mechanisms

Modules communicate through three mechanisms (SOFTWARE_ARCHITECTURE.md Section 4.3):

| Mechanism | When Used | Coupling |
|---|---|---|
| In-process contract invocation | Default for synchronous module-to-module calls | Synchronous; consumer blocked until result |
| Domain events | For asynchronous notification of state changes | Asynchronous; consumer reacts to past events |
| Network-based contract invocation | For communication with extracted services | Synchronous or asynchronous; depends on the contract |

### 7.2 Synchronous Communication

Synchronous communication (in-process or network) is used when:

1. The consumer needs the result immediately.
2. The operation is short-lived (sub-second).
3. The consumer and producer are in the same transactional context (rare; usually requires sagas).

Synchronous communication couples the consumer to the producer's availability and performance. Where the producer is unavailable or slow, the consumer must fail, degrade, or retry — all of which are part of the consumer's contract with its own callers.

### 7.3 Asynchronous Communication

Asynchronous communication (through domain events) is used when:

1. The consumer does not need the result immediately.
2. The operation can tolerate eventual consistency.
3. The producer should not be coupled to the consumer's availability or performance.

Asynchronous communication decouples the producer from the consumer. The producer emits the event and continues; the consumer reacts at its own pace. This decoupling allows consumers to be added, removed, or modified without coordinating with the producer.

### 7.4 Outbox Pattern

The outbox pattern is used to reliably emit domain events in coordination with state changes. When a module changes state, it writes the state change and the corresponding event to the outbox in the same transaction. A separate process reads the outbox and publishes the events to the event infrastructure.

The outbox pattern solves the dual-write problem: without it, a module that writes state and then publishes an event may fail between the two operations, leaving the state changed but the event not published (or vice versa). The outbox ensures atomicity: the state change and the event are written together, and the event is published asynchronously.

All modules that emit domain events must use the outbox pattern. Direct event publication (without the outbox) is forbidden.

### 7.5 Idempotent Consumption

Event consumers must be idempotent (SYSTEM_ARCHITECTURE.md Section 18.3): processing the same event twice must produce the same outcome as processing it once. Idempotency is achieved through:

1. **Stable event identifiers** — each event has a unique ID.
2. **Consumer-side deduplication** — the consumer tracks processed event IDs and skips duplicates.
3. **Idempotent state transitions** — applying the same event twice produces the same state.

Idempotency is required because the event infrastructure delivers events at least once, not exactly once.

---

## 8. Module Versioning

### 8.1 Semantic Versioning

Module contracts are versioned using semantic versioning (SYSTEM_ARCHITECTURE.md Section 13.2):

| Version Component | Incremented When |
|---|---|
| Major | A backward-incompatible change is introduced |
| Minor | A backward-compatible capability is added |
| Patch | A defect is corrected without changing capability |

Consumers depend on a contract version range and are protected from breaking changes within that range.

### 8.2 Backward Compatibility

A change is backward-compatible if existing consumers can continue to operate without modification. Examples:

| Change | Backward-Compatible? |
|---|---|
| Adding an optional field to a command's input | Yes |
| Adding a new operation to a contract | Yes |
| Adding a new event type | Yes |
| Adding an optional field to an event's payload | Yes |
| Removing a field from a command's input | No |
| Changing a field's type | No |
| Removing an operation | No |
| Changing an operation's semantics | No |

### 8.3 Breaking Changes

Breaking changes follow the deprecation policy (SYSTEM_ARCHITECTURE.md Section 30.3):

1. The old contract version is deprecated.
2. The new contract version is published alongside the old.
3. A migration path is documented.
4. Consumers migrate at their own pace during the deprecation window.
5. After the deprecation window, the old contract version is retired.

The deprecation window is long enough for consumers to migrate — typically months, not weeks. The window is announced at deprecation time, not at retirement time.

### 8.4 Version Compatibility Testing

Contract tests verify compatibility:

| Test Type | Purpose |
|---|---|
| Provider-side contract test | The provider honors its contract |
| Consumer-side contract test | The consumer honors the provider's contract |
| Compatibility test | The new contract version is backward-compatible with the old version |

Compatibility tests are part of the module's test suite and are run on every change.

---

## 9. Module Extension Points

### 9.1 Extension Over Modification

Modules are extended, not modified (SYSTEM_ARCHITECTURE.md Section 13.3). Extension is adaptation through published mechanisms — configuration overlays, workflow definitions, event subscriptions, integration adapters — that do not require modification of the module's code. Modification is adaptation through code changes; it is architecturally forbidden (ADR-001).

### 9.2 Extension Point Categories

| Extension Point Category | Mechanism | Governance |
|---|---|---|
| Configuration Overlays | Tenant-specific configuration that adapts module behavior | Configuration governance |
| Workflow Definitions | Custom workflows or modifications to module-provided workflows | Configuration governance; workflow review for clinical workflows |
| Event Subscriptions | Subscriptions to the module's domain events | Event schema governance; consumer contract governance |
| Integration Adapters | Adapters to external systems, with anti-corruption layer | Integration governance |

### 9.3 Extension Contracts

Each extension point has a contract that defines what the extension may do, what inputs it receives, what outputs it must produce, and what failure modes are permitted. The contract is versioned and evolves under the same backward-compatibility rules as module contracts (Section 8).

### 9.4 Extension Sandboxing

Extensions execute within a sandbox that limits their access to module resources (SYSTEM_ARCHITECTURE.md Section 22.4). An extension cannot access another tenant's data, modify module-default configuration, or invoke unauthorized contracts. The sandbox is enforced at runtime.

### 9.5 Extension Lifecycle

Extensions follow a lifecycle: proposed, validated, deployed, monitored, deprecated, retired. Lifecycle transitions are governed by the extension's category. The lifecycle is tracked in the platform's extension registry.

---

## 10. Module Configuration Surface

### 10.1 Configuration Surface Definition

Each module exposes a configuration surface — the set of configuration keys the module accepts, with their types, defaults, validation rules, and inheritance behavior. The configuration surface is part of the module's contract (Section 4.6) and is versioned with it.

### 10.2 Configuration Surface Design

The configuration surface should:

1. **Be cohesive.** Configuration keys are related and serve the module's adaptation needs.
2. **Be minimal.** Only configuration that is genuinely needed is exposed; speculative configuration is not.
3. **Be documented.** Each key is documented with its purpose, type, default, validation rules, and inheritance behavior.
4. **Be stable.** The configuration surface evolves through backward-compatible changes; breaking changes follow the deprecation policy.
5. **Be governed.** Configuration changes follow the governance rules in `CONFIGURATION_ARCHITECTURE.md`.

### 10.3 Configuration Categories per Module

A module's configuration typically falls into several categories:

| Category | Examples |
|---|---|
| Behavioral | Workflow definitions, business rules, validation rules |
| Structural | Feature toggles, capability gating |
| Integration | External system endpoints, credentials, schedules |
| Localization | Locale-specific templates, formats, terminology |
| Security | Authorization rules, access controls |
| Performance | Cache settings, batch sizes, timeouts |

### 10.4 Configuration Resolution

Configuration is resolved by the configuration service (SYSTEM_ARCHITECTURE.md Section 6.6), not by each module. Modules receive the resolved value for their context; they do not perform their own resolution. This centralizes the resolution logic and prevents inconsistency.

### 10.5 Configuration Caching

Modules may cache configuration values for performance, with explicit invalidation rules. Cache invalidation is governed by the configuration service, which notifies modules when their configuration changes. A module that uses stale configuration is defective.

---

## 11. Module Isolation Strategy

### 11.1 Isolation Dimensions

Modules are isolated from each other in three dimensions (SYSTEM_ARCHITECTURE.md Section 9.5):

| Dimension | Description |
|---|---|
| Contract isolation | Modules interact only through published contracts |
| State isolation | A module's authoritative state is owned by that module |
| Failure isolation | A module's failure does not cascade uncontrollably |

### 11.2 Contract Isolation

Contract isolation is enforced through:

1. **Published contracts.** Modules expose only their contract surface; internals are inaccessible.
2. **Architectural review.** New contracts are reviewed before they are added.
3. **Static analysis.** Tools detect contract violations (e.g., a module reaching into another module's internals).
4. **Contract testing.** Contract tests catch violations.

### 11.3 State Isolation

State isolation is enforced through:

1. **Context-owned authoritative state.** Each module owns its authoritative state; other modules hold references or projections, not copies they may mutate.
2. **Aggregate boundaries.** State changes are scoped to aggregates, which are owned by a single module.
3. **Event-driven updates.** Other modules update their projections by subscribing to domain events, not by directly mutating the source.

### 11.4 Failure Isolation

Failure isolation is enforced through:

1. **Declared failure modes.** Each module declares its failure modes (fail-fast, degrade, retry, circuit-break) per operation.
2. **Circuit breakers.** Cross-module calls are protected by circuit breakers that stop attempting operations that are consistently failing.
3. **Timeouts.** Cross-module calls have timeouts, preventing indefinite blocking.
4. **Bulkheads.** Resources (threads, connections) are isolated per module, preventing one module's resource exhaustion from affecting others.
5. **Graceful degradation.** Consumers degrade gracefully when producers fail, returning partial results with explicit indication of what is missing.

### 11.5 Multi-Tenant Isolation Within Modules

Every module is multi-tenant by construction (ADR-004). Within a module:

1. **Tenant context is propagated.** Every request carries tenant context, established at the edge.
2. **State is tenant-scoped.** All state is associated with a tenant identifier; queries are tenant-scoped.
3. **Access controls are tenant-aware.** Authorization checks include tenant scope.
4. **Configuration is tenant-resolved.** Configuration values are resolved per tenant context.

A module that fails to enforce tenant isolation is defective and is a security incident.

---

## 12. Module Testing Strategy

### 12.1 Test Pyramid

Module testing follows the test pyramid:

| Test Level | Scope | Frequency |
|---|---|---|
| Unit tests | Individual functions and classes | Every commit |
| Contract tests | Module's contract surface | Every commit |
| Integration tests | Module's interaction with dependencies | Every commit |
| End-to-end tests | User-visible scenarios across modules | Pre-release |
| Performance tests | Module's performance under load | Pre-release and periodically |
| Security tests | Module's security posture | Pre-release and periodically |

### 12.2 Contract Testing

Contract testing is the primary mechanism for verifying module boundaries (SYSTEM_ARCHITECTURE.md Section 13.6). Two types of contract tests are required:

| Test Type | Purpose |
|---|---|
| Provider-side contract test | The module honors its published contracts |
| Consumer-side contract test | The module's consumers honor the contracts they depend on |

Contract tests are part of the module's test suite and are run on every change. A change that breaks a contract test is a breaking change and must follow the deprecation policy (Section 8.3).

### 12.3 Test Data

Test data is managed through:

1. **Test fixtures.** Reusable test data, version-controlled alongside the tests.
2. **Test data builders.** Code that constructs test data programmatically, supporting variation.
3. **Test data factories.** Factories that produce realistic test data, including edge cases.
4. **Synthetic data.** For tests that require large datasets, synthetic data is generated, never real patient data.

Real patient data is never used in tests. Using real patient data in tests is a security incident.

### 12.4 Test Coverage

Test coverage is monitored, with thresholds per module. Coverage is a necessary but not sufficient measure of test quality; high coverage with poor test design produces false confidence. Coverage thresholds are set per module based on risk and are reviewed periodically.

### 12.5 Test Performance

Tests must be fast. Slow tests discourage running them, which reduces their value. Unit and contract tests run in seconds; integration tests run in minutes; end-to-end tests run in tens of minutes. Tests that exceed their time budget are optimized or split.

### 12.6 Test Reliability

Tests must be reliable. Flaky tests — tests that pass or fail non-deterministically — are defects. A flaky test is either fixed or quarantined; it is not ignored. Flaky tests erode confidence in the test suite and must be addressed promptly.

---

## 13. Related Documents

### 13.1 Upstream Documents

| Document | Relationship |
|---|---|
| `docs/00_PROJECT/PRODUCT_BIBLE.md` | Product authority that defines the 17 product modules |
| `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | System-level architectural authority; this document elaborates its module-level aspects |
| `docs/01_ARCHITECTURE/SOFTWARE_ARCHITECTURE.md` | Software-level architectural authority; this document elaborates its module-level aspects |

### 13.2 Peer Documents

| Document | Relationship |
|---|---|
| `docs/01_ARCHITECTURE/CONFIGURATION_ARCHITECTURE.md` | Configuration architecture; this document references it for module configuration surface detail |
| `docs/01_ARCHITECTURE/CODING_STANDARDS.md` | Implementation-level conventions; this document defines the structure they conform to |
| `docs/01_ARCHITECTURE/FOLDER_STRUCTURE.md` | Repository layout; this document defines the structure it reflects |
| `docs/02_PRODUCT/MODULES.md` | Product-level module descriptions; this document defines their architectural realization |
| `docs/02_PRODUCT/PERMISSIONS.md` | Permission model; this document defines the authorization architecture modules implement |

### 13.3 Downstream Documents

| Document | Relationship |
|---|---|
| `docs/07_MODULES/*` | Per-module specifications; must align with this document |
| `docs/12_ADR/*` | Architectural Decision Records; amend this document through ratified decisions |
| `docs/11_TESTING/*` | Testing strategy; must align with the testing discipline defined in Section 12 |

### 13.4 Document Authority

This document is authoritative for module architecture. Where a downstream document conflicts with this document, this document prevails until an ADR is ratified to amend it. ADRs are the only mechanism by which this document is changed; ad-hoc deviations are defects.
