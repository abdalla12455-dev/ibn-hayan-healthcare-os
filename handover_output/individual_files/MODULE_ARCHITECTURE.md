# Ibn Hayan Healthcare Operating System — Module Architecture

| Field | Value |
|---|---|
| Document Title | Module Architecture |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Implementation-Grade Architectural Specification |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 2.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Senior software architects, module owners, engineering managers, principal engineers, integration architects, security architects |
| Scope | Module architecture: catalogue, boundaries, contracts, dependencies, lifecycle, communication patterns, versioning, extension points, configuration surface, isolation strategy, testing strategy, governance |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, UI component catalogues, deployment runbooks, vendor selection, technology commits |
| Conflict Resolution | SYSTEM_ARCHITECTURE.md prevails. Any conflict between this document and SYSTEM_ARCHITECTURE.md is resolved in favour of SYSTEM_ARCHITECTURE.md until SYSTEM_ARCHITECTURE.md is amended through an ADR. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record (ADR); recorded in CHANGELOG with explicit version increment |
| Predecessor | v1.0.0 (initial elaboration) |
| Supersedes | All prior module-architecture drafts and internal memos |

---

## Table of Contents

1. Module Architecture Overview
2. Module Catalogue
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
13. Module Governance

---

## 1. Module Architecture Overview

### 1.1 Purpose and Scope

This document defines the implementation-grade module architecture of the Ibn Hayan Healthcare Operating System. It elaborates the module-level commitments of `SYSTEM_ARCHITECTURE.md` — specifically the catalogue of modules, the boundaries that separate them, the contracts they expose, the dependencies they declare, the lifecycle they follow, the communication patterns they employ, the versioning rules they obey, the extension points they offer, the configuration surface they accept, the isolation they enforce, the testing discipline they require, and the governance that holds them accountable. Where `SYSTEM_ARCHITECTURE.md` states what the platform commits to at the modular level, this document specifies how those commitments are realized in structural and operational terms.

The scope of this document is the module surface of the platform. It does not specify source code, database schemas, API endpoint specifications, or UI components; those are governed by `CODING_STANDARDS.md`, `FOLDER_STRUCTURE.md`, the database documentation, and the UI specification respectively. It does not ratify technology choices; specific technologies are implementation decisions governed by `SOFTWARE_ARCHITECTURE.md` Sections 10 and 11. It does, however, govern every structural decision that an implementer faces when translating a bounded context into a deployable module with a contract surface, a dependency graph, and an operational posture.

This document honours the product posture defined in `PRODUCT_BIBLE.md` — healthcare-native, configuration-driven, multi-tenant, offline-first, auditable, decade-horizon. Every commitment in this document is traceable to a product principle in `PRODUCT_BIBLE.md` or an architectural principle in `SYSTEM_ARCHITECTURE.md` Section 4. Where a module-level decision appears to conflict with one of those principles, the principle prevails and this document is amended to honour it.

### 1.2 Relationship to System Architecture

This document elaborates specific sections of `SYSTEM_ARCHITECTURE.md` and must not contradict them. The elaboration map is as follows:

| SYSTEM_ARCHITECTURE Section | Elaborated Here |
|---|---|
| Section 4 (Architectural Principles P1–P18) | Sections 3, 4, 5, 9, 11, 13 (each section binds its commitments to the governing principle) |
| Section 7 (Domain-Driven Architecture) | Section 2 (Module and Bounded Context Alignment), Section 3 (Boundary principles) |
| Section 8 (Configuration-Driven Architecture) | Section 10 (Module Configuration Surface) |
| Section 9 (Modular Architecture) | Sections 2, 3, 4, 5, 6, 8 (catalogue, boundaries, contracts, dependencies, lifecycle, versioning) |
| Section 13 (Module Architecture) | Sections 3 through 12 (full module-internal treatment) |
| Section 18 (Event-Driven Concepts) | Section 7 (Module Communication Patterns), Section 4.5 (Domain Event Contracts) |
| Section 22 (Extensibility Strategy) | Section 9 (Module Extension Points) |
| Section 27 (Audit Architecture) | Section 4 (audit as contract dimension), Section 11 (isolation), Section 13 (compliance) |
| Section 30 (Future Evolution Strategy) | Section 6 (Module Lifecycle), Section 8 (Versioning and Deprecation) |

Where this document and `SYSTEM_ARCHITECTURE.md` appear to conflict, `SYSTEM_ARCHITECTURE.md` prevails. This document is amended only through the ADR process; ad-hoc deviations are defects and are corrected on discovery. The same posture applies to `PRODUCT_BIBLE.md` Section 19: where this document and the Product Bible's module catalogue conflict, the Product Bible prevails until it is amended through product governance.

### 1.3 Audience

The primary audience is senior software architects and principal engineers who design and govern module boundaries, contracts, and dependencies, and engineering managers who own modules and must enforce structural discipline within their teams. The secondary audience is engineers implementing module internals, who must understand the structural boundaries their work operates within. The document assumes literacy in domain-driven design, modular monolith architecture, contract-driven integration, multi-tenant SaaS delivery, and healthcare-grade operational rigour; it does not explain foundational concepts.

Integration architects, security architects, and SRE leaders should read Sections 4, 7, 10, and 11 to understand the contract surface, communication patterns, configuration surface, and isolation posture that integration code, security code, and operational tooling must honour. Module owners should read Sections 3 through 8 and Section 13 to understand the full set of rules their modules are governed by. ADR authors should read Section 8 and Section 13 to understand the versioning and governance constraints that proposed decisions must satisfy.

### 1.4 Document Conventions

Sections are numbered for stable cross-referencing. Tables summarize decisions where prose would obscure them; prose carries the rationale that tables cannot. Where a rule has exceptions, the exceptions are stated explicitly and never left to inference. The verbs *must*, *should*, and *may* are used in their normative sense: *must* denotes a non-negotiable rule; *should* denotes a default from which deviation requires documented justification; *may* denotes permission, not encouragement.

Cross-references to `SYSTEM_ARCHITECTURE.md` use the form "SYSTEM_ARCHITECTURE Section N" or "SYSTEM_ARCHITECTURE Section N.M". Cross-references to `PRODUCT_BIBLE.md` use the form "PRODUCT_BIBLE Principle P-N", "PRODUCT_BIBLE Design Principle D-N", or "PRODUCT_BIBLE Section N". Cross-references to ADRs use the form "ADR-NNN". Cross-references to peer documents use the form "SOFTWARE_ARCHITECTURE Section N" or "CONFIGURATION_ARCHITECTURE Section N". Module identifiers use the form "MNN Module Name" (e.g., "M01 Patient"); bounded context identifiers use the form "BCNN" (e.g., "BC01").

### 1.5 Authority and Amendment

This document is authoritative for module architecture. It prevails over downstream implementation documents — per-module specifications under `docs/07_MODULES/`, per-domain specifications, integration contracts — but is subordinate to `SYSTEM_ARCHITECTURE.md` and `PRODUCT_BIBLE.md`. A downstream document that contradicts this document is defective; the remedy is to correct the downstream document or to amend this document through an ADR.

Amendment is by Architecture Council ratification only. A proposed amendment is recorded as an ADR, reviewed by the Architecture Council, and ratified or rejected. Ratification is recorded in the ADR's status and in the platform's CHANGELOG, with an explicit version increment. Off-cycle amendment is permitted when a ratified ADR requires it; routine amendment occurs at the quarterly review cadence. Amendments that affect the module catalogue (Section 2) require additional ratification by the Product Council, because the module catalogue is jointly owned by architecture and product governance.

---

## 2. Module Catalogue

### 2.1 Catalogue Authority and Derivation

The module catalogue is the canonical reference for the platform's module-level capability surface. It defines what modules exist, what each module is responsible for, and how each module aligns with the bounded context catalogue defined in SYSTEM_ARCHITECTURE Section 7.2. The catalogue is jointly governed by architecture and product: architecture governs the bounded context alignment, the boundary integrity, and the contract surface; product governs the capability scope, the edition packaging, and the customer-visible module identity. The catalogue is the architectural expression of the product commitment documented in PRODUCT_BIBLE Section 19 (Product Modules Overview).

The catalogue is stable. Modules are not added, removed, renamed, or reclassified to accommodate features; features are accommodated within the existing module structure or, when an enduring domain responsibility is identified that does not fit any existing module, a new module is added through deliberate ADR ratification (SYSTEM_ARCHITECTURE Section 7.8, Principle P8). Catalogue stability is a direct consequence of bounded context stability; the two catalogues are aligned and evolve together.

The catalogue comprises 19 modules organized into five categories. The five categories — Clinical, Operational, Financial, Administrative, Platform — are the in-scope capability categories defined in PRODUCT_BIBLE Section 11.2. Each module belongs to exactly one category; cross-category membership is forbidden and is treated as a structural defect indicating that the module's boundary has been compromised.

### 2.2 Module Inventory

The platform's module catalogue comprises the 19 modules listed below, each aligned with its owning bounded context (SYSTEM_ARCHITECTURE Section 7.2). The alignment is one-to-one in most cases; documented exceptions are noted in the Bounded Context column and explained in Section 2.4.

| Code | Module | Category | Bounded Context | Primary Responsibility |
|---|---|---|---|---|
| M01 | Patient | Clinical | BC01 | Patient identity, demographics, consent, medical record lifecycle |
| M02 | Encounter | Clinical | BC02 | Encounter management across outpatient, inpatient, emergency, telehealth |
| M03 | Clinical Documentation | Clinical | BC03 | Clinical notes, structured documentation, templates, assessments |
| M04 | Orders & Results | Clinical | BC04 | Diagnostic and therapeutic orders, result management, decision support |
| M05 | Pharmacy | Clinical | BC05; consumes BC09 contracts for medication inventory (ADR-010) | Medication management, dispensing, clinical pharmacy; integrates with BC09 for medication inventory |
| M06 | Scheduling | Operational | BC06 | Appointment scheduling, resource scheduling, queue management |
| M07 | Documents | Operational | BC13 | Document management, document templates, document workflow |
| M08 | Notifications | Operational | BC14 | Notifications, reminders, alerts across channels; consumed by all other modules |
| M09 | Billing | Financial | BC07 | Billing, claims, payments, insurance submission, subscription billing (per ADR-009) |
| M10 | Accounting | Financial | BC08 | General ledger, accounts payable, accounts receivable, financial reporting |
| M11 | CRM | Administrative | BC11 | Patient relationships, outreach, marketing, communications |
| M12 | HR | Administrative | BC12 | Human resources, payroll inputs, employee records, benefits |
| M13 | Workforce | Administrative | BC10 | Workforce scheduling, time and attendance, credentials |
| M14 | Identity & Access | Platform | BC15 | Authentication, authorization, identity, session management |
| M15 | Configuration | Platform | BC16; hosts the BC18 management surface for v1 packaging only (ADR-007) | Configuration management, validation, versioning, audit; exposes Feature Flags management without owning BC18 |
| M16 | Audit | Platform | BC17 | Audit trail, audit query, audit reporting |
| M17 | Integration | Platform | Integration Layer surface (no dedicated BC) | Integration framework, connectors, partner surfaces, anticorruption layers |
| M18 | Reporting | Platform | Reporting Layer surface (no dedicated BC) | Operational, analytical, regulatory reporting |
| M19 | Localization | Platform | BC19 | Language, calendar, regulatory framework, clinical coding system adaptation |

This catalogue is the architectural reference for module identity. Per-module specifications under `docs/07_MODULES/` must align with this catalogue; a per-module specification that introduces a module not present in this catalogue is defective, and a per-module specification that contradicts the alignment in this catalogue is defective.

### 2.3 Module Classification

Modules are classified by their role in the platform. The classification governs dependency direction (Section 5), edition packaging (Section 2.5), and operational expectations (Section 13). Classification is stable; a module does not change category without an ADR, and category changes are rare because they indicate that the module's domain responsibility has materially shifted.

| Category | Modules | Characteristics | Typical Consumers |
|---|---|---|---|
| Clinical | M01, M02, M03, M04, M05 | Healthcare-native; clinical safety is paramount; consistency prevails over availability (Principle P5); audit is non-negotiable (Principle P13) | Operational, Financial, Administrative modules |
| Operational | M06, M07, M08 | Support daily operations; clinical-adjacent; may tolerate brief unavailability under P5 carve-out for non-clinical data | Clinical, Financial, Administrative modules |
| Financial | M09, M10 | Regulatory compliance; financial integrity; reconciliation-critical | Administrative modules; integration adapters (payment gateways, claims clearinghouses) |
| Administrative | M11, M12, M13 | Back-office; cross-references Clinical for patient and practitioner identity | Platform modules; cross-references Clinical through contracts |
| Platform | M14, M15, M16, M17, M18, M19 | Cross-cutting; depended upon by all other modules; themselves depend on the data layer and on each other in defined ways | All other modules; the Experience Layer; the Orchestration Layer |

The Platform category holds a special position: Platform modules are depended upon by all other modules and must not depend on category-specific modules (Section 5.1). This rule preserves the acyclic dependency graph and ensures that Platform modules remain reusable across every edition, every tenant, and every deployment topology.

### 2.4 Module and Bounded Context Alignment

The alignment between modules and bounded contexts is governed by SYSTEM_ARCHITECTURE Section 7.7. A bounded context is a domain responsibility area; a module is a deployable unit that implements one or more bounded contexts. The typical mapping is one-to-one, but the architecture permits one-to-many and many-to-one mappings where justified by deployment or evolution requirements.

The current alignment has documented deviations from strict one-to-one mapping, each ratified by ADR. First, the Inventory bounded context (BC09) remains its own bounded context (ADR-010); medication inventory integrates tightly with the Pharmacy module (M05) for pharmacy-specific inventory flows, while non-pharmacy inventory module packaging is deferred and no Inventory M-code is assigned. The Pharmacy module does not universally own the Inventory context. Second, the Feature Flags bounded context (BC18) remains conceptually separate from Configuration (ADR-007); for v1, its management surface is packaged inside the Configuration module (M15) as an implementation decision, not a domain ownership transfer. BC18's independent contracts, audit semantics, and future extractability are preserved, and the flag lifecycle remains owned by BC18. Third, the Integration module (M17) does not correspond to a dedicated bounded context; it is the deployable expression of the Integration Layer (SYSTEM_ARCHITECTURE Section 19) and hosts the anticorruption layers, adapters, and partner surfaces that connect the platform to external systems. Fourth, the Reporting module (M18) does not correspond to a dedicated bounded context; it is the deployable expression of the Reporting Layer (SYSTEM_ARCHITECTURE Section 28) and consumes read models projected from other modules' state.

These deviations are stable and documented. New deviations require ADR ratification, with the rationale explicit, the alternatives considered recorded, and the transition plan documented (Principle P8). A deviation that emerges without ratification is a defect and is corrected either by aligning the module to the bounded context or by ratifying the deviation through an ADR.

### 2.5 Module Edition Packaging

Modules are packaged into editions per PRODUCT_BIBLE Section 16. Edition packaging determines which modules are enabled by default for a customer; it does not modify module internals. All editions run the same code; editions differ only in configuration. This is a direct consequence of Principle P3 (One Platform, Many Organizations) and is the architectural expression of the configuration-driven posture (Principle P2).

A module that is not in a customer's edition is not enabled for that customer, but it is still present in the code base and is still subject to the platform's build, test, and release discipline. Edition packaging is a configuration concern, not a code branching concern. The configuration surface (Section 10) governs how edition packaging is expressed and how a customer's edition can be upgraded or extended without forking the platform.

Edition packaging interacts with module lifecycle (Section 6) and module dependencies (Section 5). A module in Pilot (LC2) may be packaged into a subset of editions for validation; a module in General Availability (LC3) is packaged into the editions defined by product governance; a module in Deprecated (LC6) remains packaged through its transition window to give existing customers time to migrate. Module dependencies are honoured by edition packaging: an edition that includes a module must also include every module that the included module depends on, or the edition is defective.

### 2.6 Module Ownership and Custodianship

Each module has a clear owner — a team responsible for the module's design, implementation, operation, and evolution. Ownership is recorded in the module registry (Section 13.3) and is updated through defined handover processes. A module without a clear owner is a defect; ownership gaps are surfaced at quarterly review and are closed by assignment, not by abandonment. Module ownership is distinct from code ownership: code ownership tracks who may modify a code path; module ownership tracks who is accountable for the module's contract surface, its dependencies, its lifecycle, and its operational health.

Custodianship is the architectural counterpart to ownership. The Architecture Council is the custodian of every module's boundary, contract surface, and dependency posture; module owners may propose changes, but the Council ratifies them. This separation preserves catalogue stability (Principle P8) and ensures that module evolution honours the architectural principles rather than the immediate preferences of the owning team.

Where ownership and custodianship conflict, custodianship prevails for structural decisions and ownership prevails for implementation decisions. The boundary between structural and implementation decisions is itself governed by this document: anything governed by Sections 3 through 13 is structural; anything else is implementation. The Architecture Council is the arbiter of the boundary; a dispute that cannot be resolved at the Council level is escalated to the Office of the Chief Software Architect.

---

## 3. Module Boundaries

### 3.1 Boundary Definition

A module boundary is the surface between a module and the rest of the platform. Everything inside the boundary is private to the module; everything on the boundary is public. The boundary is defined by the module's contract surface (Section 4) and is the only legitimate surface through which other modules, the Orchestration Layer, and the Experience Layer may interact with the module. Boundary integrity is the most consequential module-level commitment; a well-designed boundary enables independent evolution, while a compromised boundary creates coupling that propagates through the dependency graph.

Boundary design is governed by bounded context alignment (SYSTEM_ARCHITECTURE Section 13.2). A module's boundary aligns with its owning bounded context's boundary; a module that exposes capability outside its bounded context is over-reaching, and a module that consumes another module's internals is leaking. Both are defects. Boundary integrity is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) and is enforced through contract testing, static analysis, and architectural review (Section 11.2).

The boundary is the unit of evolution. A module evolves by changing its internals without changing its boundary (backward-compatible evolution) or by changing its boundary through documented version increments (Section 8). A module that changes its boundary without versioning is breaking its contract; this is a defect and is corrected either by reverting the change or by ratifying the change as a breaking change with a documented deprecation window.

### 3.2 Boundary Design Criteria

A module boundary should satisfy the following design criteria. Each criterion is a default, not an absolute; deviation requires documented justification through an ADR.

| Criterion | Description | Governing Principle |
|---|---|---|
| Cohesive capability | The capabilities exposed on the boundary are related and serve a coherent purpose | P4 (Loose Coupling, High Cohesion) |
| Implementation privacy | Internal data structures, algorithms, and processes are not visible on the boundary | P4 (Loose Coupling, High Cohesion) |
| Stability | The boundary evolves through backward-compatible changes; breaking changes follow the deprecation policy | P8 (Bounded Contexts Are Stable), P6 (Reversibility) |
| Minimality | The boundary exposes only what consumers need; speculative capabilities are not exposed | P14 (Simplicity Over Complexity) |
| Documentation | Each capability on the boundary is documented with its contract, semantics, and failure modes | P7 (Documented Before Implemented) |
| Auditability | Every consequential capability on the boundary produces an audit record | P13 (Auditability as Primitive) |
| Healthcare safety | Clinical capabilities honour clinical safety constraints, including consistency and offline operation | P1 (Healthcare Safety), P5 (Consistency for Clinical Data) |

A boundary that satisfies all seven criteria is well-formed. A boundary that satisfies five or six is acceptable with documented justification for the gap. A boundary that satisfies fewer than five is defective and is corrected through boundary refactoring (Section 3.4). The criteria are not weighted equally: healthcare safety is absolute (Principle P1) and overrides every other criterion; auditability is co-equal with healthcare safety for consequential actions (Principle P13); the remaining criteria are co-equal and trade off against each other in normal architectural discourse.

### 3.3 Boundary Anti-Patterns

The following anti-patterns compromise boundary integrity. Each is forbidden; each is detected through review, contract testing, or static analysis; each is corrected through boundary refactoring.

| Anti-Pattern | Description | Why Forbidden | Detection |
|---|---|---|---|
| Leaky abstraction | The boundary exposes implementation details (internal data structures, internal identifiers, internal sequencing) | Couples consumers to implementation; defeats independent evolution | Architectural review; contract test review |
| God contract | A single contract handles many unrelated responsibilities | Violates single responsibility; creates a coupling magnet | Cohesion analysis; contract review |
| Chatty boundary | Consumers must make many calls to accomplish one operation | Inefficient; brittle; couples consumer to producer's sequencing | Interaction profiling; integration test review |
| Anemic boundary | The boundary exposes data but no behavior | Reduces the module to a data store; defeats domain encapsulation | Contract review; data-flow analysis |
| Undocumented boundary | Capabilities are not documented | Consumers guess at behavior; defects emerge at integration | Documentation audit; definition-of-done check |
| Unstable boundary | The boundary changes frequently in breaking ways | Consumers cannot depend on it; trust erodes | Version history review; deprecation cadence review |
| Cross-context leakage | The boundary exposes capability that belongs to another bounded context | Violates bounded context alignment; defeats catalogue stability | Bounded context mapping; architectural review |

A module exhibiting one or more anti-patterns is flagged for refactoring. Refactoring priority is set by the anti-pattern's blast radius: cross-context leakage and leaky abstraction are high-priority because they propagate coupling; god contract and chatty boundary are medium-priority because they impose operational cost; anemic boundary and undocumented boundary are lower-priority but must still be addressed within the module's next release cycle. Unstable boundary is treated as a process defect and is corrected through versioning discipline (Section 8) rather than through refactoring.

### 3.4 Boundary Refactoring

Module boundaries may be refactored, but only through a deliberate process. Boundary refactoring is expensive — it propagates through consumers, through documentation, through tests, and through operational tooling — and is undertaken only when the cost of not refactoring exceeds the cost of refactoring. The process is governed by SOFTWARE_ARCHITECTURE Section 5 (architectural evolution) and by Principle P6 (Reversibility Over Permanence).

| Step | Activity | Output |
|---|---|---|
| 1 | Justification | Documented case that the current boundary imposes unacceptable cost |
| 2 | ADR | Architecture Decision Record ratifying the refactoring, with alternatives and consequences |
| 3 | Migration path | Documented path from the current boundary to the target boundary, including consumer migration |
| 4 | Parallel running | Old and new boundaries operate in parallel through a deprecation window |
| 5 | Consumer migration | Consumers migrate from the old boundary to the new boundary |
| 6 | Old boundary retirement | The old boundary is retired when its deprecation window closes |

A refactoring that bypasses this process is a defect. A refactoring that fails to document its migration path is a defect. A refactoring that retires the old boundary before consumers have migrated is a defect and is treated as a breaking change without a deprecation window — a violation of Principle P6 that is escalated to the Architecture Council.

### 3.5 Boundary Stability and Evolution

Boundary stability is the architectural commitment that a module's contract surface evolves predictably. Stability does not mean immutability; it means evolution through backward-compatible changes by default and through documented breaking changes by exception. Stability is achieved by conservative contract design (Section 4.2), by versioning discipline (Section 8), and by architectural review that resists speculative expansion of the boundary.

Boundary evolution follows three trajectories. The first is additive: new capabilities are added to the boundary without modifying existing capabilities; this is the default trajectory and is always backward-compatible. The second is corrective: an existing capability is modified to correct a defect or to refine its semantics; this is backward-compatible when the correction is a strict generalization and is a breaking change when the correction narrows the contract. The third is reductive: a capability is removed from the boundary; this is always a breaking change and follows the deprecation policy.

The platform favours additive evolution and resists reductive evolution. Reductive changes are reserved for capabilities that have proven harmful (e.g., a capability that compromises clinical safety) or that have been superseded by a successor capability with a documented migration path. Reductive changes without a documented successor are forbidden; they leave consumers without a migration target and violate Principle P6 (Reversibility).

---

## 4. Module Contracts

### 4.1 Contract Surface

Every module exposes a contract surface consisting of four elements. The contract surface is the only legitimate interaction surface between the module and the rest of the platform; internal implementation is not part of the contract and is not accessible to consumers. The four contract elements are defined in SYSTEM_ARCHITECTURE Section 7.4 and Section 13.3 and are restated here for completeness.

| Contract Element | Purpose | Examples |
|---|---|---|
| Commands | Operations that change state | RegisterPatient, ScheduleAppointment, SubmitClaim, DispenseMedication |
| Queries | Operations that return state without changing it | GetPatient, ListAppointments, GetClaimStatus, GetMedicationProfile |
| Domain Events | Notifications of state changes | PatientRegistered, AppointmentScheduled, ClaimSubmitted, MedicationDispensed |
| Configuration Schemas | Declarative definitions of configurable behaviour | Patient validation rules, appointment slot durations, billing rate cards |

A module may not expose any other surface. Internal data structures, internal identifiers, internal sequencing, and internal algorithms are not part of the contract. A consumer that depends on an internal is coupled to an unstable surface and is defective; the remedy is to either promote the internal to a documented contract or to refactor the consumer to use the documented contract surface.

Contracts are versioned (Section 8) and documented as part of the module's definition of done (PRODUCT_BIBLE Principle P-7). An undocumented contract is a defect; a contract whose documentation diverges from its implementation is a defect. Both are corrected through the module's release discipline.

### 4.2 Contract Definition Elements

Each contract — whether command, query, event, or configuration schema — is defined explicitly with the following elements. The elements are mandatory; a contract missing any element is incomplete and is defective.

| Element | Description |
|---|---|
| Name | A stable, descriptive identifier, namespaced by the module |
| Version | Semantic version (major.minor.patch) of the contract, tracked independently of the module version |
| Inputs | Parameters with types and constraints; for events, the payload schema |
| Outputs | Return values with types and constraints; for commands, the acknowledgement or result |
| Errors | Possible errors with codes and meanings; both business errors and infrastructure errors |
| Preconditions | Conditions that must hold for the operation to be valid |
| Postconditions | Conditions that hold after the operation succeeds |
| Idempotency | Whether the operation is idempotent and, if so, the idempotency key strategy |
| Authorization | Required permissions, scoped by tenant and by role |
| Audit | What is captured in the audit log on success, on failure, and on authorization denial |
| Observability | What telemetry is emitted on execution, including tracing and metric identifiers |

Contracts are defined in a standard format and are version-controlled alongside the module's source code. The standard format is governed by `CODING_STANDARDS.md`; this document governs the elements that must be present but not the format in which they are expressed. Contract definitions are part of the module's published documentation and are reviewed at architectural review (Section 13.2).

### 4.3 Command Contracts

Commands are operations that change state. Every command is named in the imperative (e.g., `RegisterPatient`, not `PatientRegistration`), carries a unique identifier for idempotency, is authorized before execution, is validated before execution, is audited on execution, and emits one or more domain events on success. The set of events a command may emit is part of the command's contract; a command that emits an undocumented event is defective.

Commands may be synchronous or asynchronous. A synchronous command returns its result to the caller within the same invocation; an asynchronous command acknowledges receipt and returns its result later, typically through an event or a follow-up query. The choice is part of the command's contract and is governed by the operational characteristics of the operation: short, deterministic operations default to synchronous; long-running or non-deterministic operations default to asynchronous. The default is synchronous because it is simpler (Principle P14); deviation to asynchronous requires documented justification.

Commands that change clinical state (commands issued by M01–M05) are governed by Principle P5 (Consistency Over Availability for Clinical Data). Such commands must execute atomically with their state change and with the persistence of their events to the outbox (Section 7.4). A clinical command that returns success to the caller before its events are persisted is defective; this is the dual-write problem, and the outbox pattern is the architectural mitigation.

### 4.4 Query Contracts

Queries are operations that return state without changing it. Every query is named in the interrogative or as a noun (e.g., `GetPatient`, `PatientList`), is authorized before execution, is tenant-scoped by default, is cacheable where appropriate, and does not emit domain events. Queries are side-effect-free with respect to module state; a query that mutates state is defective and is either refactored into a command or removed from the contract surface.

Queries may be paginated, filtered, sorted, and projected. The query contract defines the supported parameters and their semantics, including the maximum page size, the supported filter operators, the supported sort keys, and the supported projection shapes. A query that accepts arbitrary parameters is a leaky abstraction (Section 3.3) and is corrected by constraining the parameter surface.

Queries that read clinical state (queries against M01–M05) are governed by Principle P5. Such queries must reflect the most recently committed state and may not return stale data from a cache that has not been invalidated. Queries that read non-clinical state may return cached data with explicit staleness bounds, and the staleness bound is part of the query's contract. A query that returns stale data without documenting its staleness bound is defective.

### 4.5 Domain Event Contracts

Domain events are notifications of state changes. Every event is named in the past tense (e.g., `PatientRegistered`, `AppointmentScheduled`), carries a unique identifier for idempotent consumption, carries a timestamp of when the event occurred, carries a tenant identifier for tenant-scoped consumption, carries a producer identifier naming the module that emitted it, carries a payload describing the state change, and carries a schema version for evolution. Events are emitted by the module that owns the state change, through the outbox pattern (Section 7.4), and are delivered to subscribers at least once.

Events are categorized by purpose into three types (SYSTEM_ARCHITECTURE Section 18.2): domain events for cross-module communication, integration events for external system consumption, and audit events for audit recording. A single state change may produce events of multiple types; for example, a patient registration may produce a domain event for CRM consumption, an integration event for an external master patient index, and an audit event for the audit trail. The three event types have different consumer contracts and different lifecycle governance, but they share the same reliability guarantees (Section 7.4).

Event payloads are minimal. An event carries the identifiers and the change summary necessary for a consumer to decide whether to react and, if so, to fetch the full state through a query. An event that carries the full state of the changed aggregate is a snapshot event; snapshot events are permitted but are governed by the schema evolution rules (Section 8) because they couple the consumer to the producer's internal state shape. The default posture is to carry minimal payloads and to require consumers to fetch full state through queries; this preserves producer autonomy and minimizes the cost of schema evolution.

### 4.6 Configuration Schema Contracts

Configuration schemas define what configuration a module accepts. Every schema declares configuration keys with types, defaults, and constraints; declares validation rules across five categories (structural, referential, semantic, contextual, regulatory — see CONFIGURATION_ARCHITECTURE Section 6); declares inheritance behaviour across the configuration layer model (SYSTEM_ARCHITECTURE Section 15); declares default values used when no value is provided; and is versioned alongside the module's other contracts.

Configuration schemas are governed by SYSTEM_ARCHITECTURE Section 8 (Configuration-Driven Architecture) and are detailed in `CONFIGURATION_ARCHITECTURE.md`. This document governs the module-level commitment: every module exposes its configuration surface as a documented, versioned contract; the configuration surface is part of the module's definition of done; configuration changes are validated before application and are audited on application (Principle P13). A module that accepts configuration without a published schema is defective; a module that accepts configuration outside its schema is defective.

Configuration schema evolution is governed by the same versioning rules as other contracts (Section 8). Backward-compatible changes (adding an optional key with a default, relaxing a constraint, adding a new validation rule that accepts a superset of prior values) are minor version increments. Breaking changes (removing a key, tightening a constraint, changing a default in a way that alters behaviour for existing tenants) are major version increments and follow the deprecation policy. Breaking changes to configuration schemas are particularly consequential because they may alter the platform's behaviour for existing tenants; such changes are ratified by ADR and are accompanied by tenant communication and migration tooling.

---

## 5. Module Dependencies

### 5.1 Dependency Rules

Module dependencies follow the rules in SYSTEM_ARCHITECTURE Section 9.4 and the dependency direction in SYSTEM_ARCHITECTURE Section 13.4. The rules are normative: violation is a defect and is treated as a build failure. The rules are:

| Rule | Description |
|---|---|
| Acyclic | Module dependencies are acyclic; circular dependencies are forbidden |
| Explicit | Dependencies are explicit, documented, and validated at build time |
| Contract-based | Modules communicate through contracts, not through direct data access |
| Hierarchical | Platform modules may be depended upon by all other modules; category-specific modules depend on Platform modules and on appropriate upstream domain modules |
| Versioned | Dependencies are versioned; breaking changes follow the deprecation policy |
| Minimal | Modules declare only the dependencies they actually use; speculative dependencies are forbidden |

The acyclic rule is the most consequential. A circular dependency makes the modules involved impossible to reason about independently, impossible to deploy independently, and impossible to evolve independently. The platform's dependency graph is validated continuously through static analysis; a cycle is a build failure and is corrected either by breaking the cycle through contract refactoring or by extracting the shared capability into a downstream module.

The contract-based rule prohibits direct data access across module boundaries (SYSTEM_ARCHITECTURE Section 9.5). A module that reads another module's data store directly is defective; the remedy is to use the other module's query contract. The rule applies to every kind of data store: transactional, analytical, cache, object, audit. Direct data access bypasses the contract's authorization, audit, and validation, and is therefore both a structural defect and a security incident.

### 5.2 Dependency Direction by Module Category

Dependencies flow downward and inward (SOFTWARE_ARCHITECTURE Section 3). The typical dependency direction by module category is:

| Source Module Category | May Depend On | May Not Depend On |
|---|---|---|
| Clinical (M01–M05) | Platform modules (M14–M19); other Clinical modules through contracts | Operational, Financial, Administrative modules; the Experience Layer; the Orchestration Layer |
| Operational (M06–M08) | Platform modules; Clinical modules through contracts; other Operational modules through contracts | Financial, Administrative modules; the Experience Layer; the Orchestration Layer |
| Financial (M09–M10) | Platform modules; Clinical and Operational modules through contracts; integration adapters (e.g., payment gateways) | Administrative modules; the Experience Layer; the Orchestration Layer |
| Administrative (M11–M13) | Platform modules; Clinical and Operational modules through contracts | Financial modules (Administrative does not depend on Financial); the Experience Layer; the Orchestration Layer |
| Platform (M14–M19) | The Data Layer; other Platform modules through contracts | Any category-specific module; the Experience Layer; the Orchestration Layer |

The table is normative. A dependency that violates the table is a defect and is corrected either by removing the dependency or by ratifying the deviation through an ADR. The most common violations are Platform modules depending on category-specific modules (forbidden because Platform must remain reusable across every category) and Clinical modules depending on Operational modules (forbidden because Clinical must remain a stable foundation for Operational to build upon).

Within categories, dependencies are permitted but governed by the acyclic rule (Section 5.1). For example, within Clinical, Pharmacy (M05) may depend on Orders & Results (M04) for medication orders, and Orders & Results may depend on Patient (M01) for patient identity. Such dependencies are documented in the module's dependency inventory (Section 5.3) and are validated at build time.

### 5.3 Dependency Inventory and Manifest

Each module maintains a dependency inventory — a documented list of modules it depends on, the contracts it depends on, and the contract versions it accepts. The inventory is version-controlled alongside the module's source code, is reviewed during architectural review, and is the basis for impact analysis when a contract changes. A module that depends on a contract not listed in its inventory is defective; the inventory is the source of truth for the module's dependency surface.

The dependency inventory is expressed as a manifest at build time. The manifest enumerates the module's direct dependencies, the acceptable version range for each dependency, and the contracts within each dependency that the module consumes. The manifest is validated at build time against the platform's dependency graph; a manifest that violates the dependency rules (Section 5.1) is a build failure. The manifest is also validated at deployment time against the deployment's edition packaging; a deployment that includes a module without including its dependencies is defective and is rejected by the deployment tooling.

Transitive dependencies are tracked but are not direct dependencies of the module. A module that consumes a contract exposed by a transitive dependency is defective; the remedy is to either promote the transitive dependency to a direct dependency or to refactor the module to consume only its direct dependencies' contracts. This rule preserves the module's dependency surface as a faithful expression of its actual coupling.

### 5.4 Forbidden Dependencies

The following dependencies are explicitly forbidden and are detected through static analysis at build time. Each is a build failure; each is corrected before the module can be released.

| Forbidden Dependency | Why |
|---|---|
| Domain module → Experience Layer | The Experience Layer is a rendering surface, not a capability source; depending on it inverts the dependency direction |
| Domain module → Orchestration Layer | The Orchestration Layer coordinates domain modules; the reverse inverts the dependency direction |
| Domain module → Another module's internals | Internals are private; only contracts are public (Principle P4) |
| Domain module → Another module's data store | Direct data access bypasses authorization, audit, and validation (Principle P4, P13) |
| Platform module → Domain module | Platform modules are depended upon by domains, not vice versa; the reverse creates a cycle through the dependency graph |
| Circular dependency | Cycles make the system impossible to reason about and to deploy independently (Principle P4) |
| Cross-category upward dependency | A lower-tier category may not depend on a higher-tier category (e.g., Clinical may not depend on Operational) |

Forbidden dependencies are non-negotiable. A team that argues for an exception is required to either refactor to eliminate the dependency or to ratify the exception through an ADR with explicit rationale, alternatives, and consequences. Ratification of a forbidden-dependency exception is rare and is escalated to the Office of the Chief Software Architect.

### 5.5 Dependency Validation and Enforcement

Dependencies are validated at three points in the development lifecycle. At design time, architectural review (Section 13.2) verifies that a proposed contract change does not introduce a forbidden dependency or a cycle. At build time, static analysis validates the module's manifest against the platform's dependency graph; violations are build failures. At deployment time, the deployment tooling validates that the deployment includes every module in the deployment's transitive dependency closure; missing dependencies are deployment failures.

Validation is automated wherever possible. Manual validation is brittle and erodes under schedule pressure (Principle P14 acknowledges simplicity, but automation is the correct response to schedule pressure, not manual review). The platform's continuous integration pipeline enforces dependency validation on every commit; the platform's release pipeline enforces dependency validation on every release candidate. A release that has not passed dependency validation is not a release.

Dependency violations are tracked in the module's health metrics (Section 13.4). A module with a history of dependency violations is flagged for architectural review and may be required to refactor its dependency surface before being permitted to add new dependencies. This enforcement posture preserves the integrity of the dependency graph over time and is the operational expression of Principle P4.

### 5.6 Dependency Evolution and Migration

Dependencies evolve. A module's dependency on another module's contract may be replaced by a dependency on a different contract, by a dependency on a different module, or by elimination of the dependency through internalization of the capability. Dependency evolution is governed by the same versioning and deprecation rules as contract evolution (Section 8): backward-compatible evolution is the default; breaking evolution is exceptional and follows the deprecation policy.

Dependency migration is the process of moving a module from one dependency surface to another. Migration is undertaken when a dependency is being deprecated (Section 6.4), when a successor module is being introduced, or when a contract is being replaced by a more appropriate contract. Migration follows a documented path: the new dependency is introduced, the module is updated to consume both the old and the new dependency during a transition window, the module is updated to consume only the new dependency, and the old dependency is retired.

Migration is the responsibility of the consuming module's owner, not the producing module's owner. The producing module's owner is responsible for publishing the new contract, documenting the migration path, and supporting consumers through the transition window. The consuming module's owner is responsible for executing the migration within the transition window. A consumer that fails to migrate within the window is in defect and is escalated to the Architecture Council.

---

## 6. Module Lifecycle

### 6.1 Lifecycle States

Modules follow a defined lifecycle (SYSTEM_ARCHITECTURE Section 9.6, PRODUCT_BIBLE Section 19.5). The lifecycle governs a module's availability, its support posture, and its evolution trajectory. Lifecycle states are stable; a module does not transition between states without ratification by the Architecture Council (and, for transitions affecting edition packaging, by the Product Council).

| Stage | Code | Description | Edition Packaging | Support Posture |
|---|---|---|---|---|
| Candidate | LC1 | Module under design; not available to customers | Not packaged | Best-effort; no operational support |
| Pilot | LC2 | Module deployed to pilot customers for validation | Packaged for pilot editions only | Pilot support; incident response during business hours |
| General Availability | LC3 | Module available to all customers per edition packaging | Packaged per product governance | Full support; 24×7 incident response for clinical modules |
| Mature | LC4 | Module in steady-state; long-term support commitment | Packaged per product governance | Full support; long-term stability commitment |
| Deprecation Candidate | LC5 | Module considered for deprecation; transition planning underway | Packaged per product governance | Full support; deprecation timeline under preparation |
| Deprecated | LC6 | Module deprecated; new customers cannot enable; existing customers supported through transition window | Packaged for existing customers only | Full support for existing customers; no new enablement |
| Retired | LC7 | Module removed from the platform; transition window closed | Not packaged | No support; archival and purge per retention policy |

The transition from General Availability (LC3) to Mature (LC4) is automatic after a defined period of stable operation, typically four consecutive quarters without a contract-breaking change. Other transitions are explicit and are ratified by the Architecture Council. The transition from Mature (LC4) to Deprecation Candidate (LC5) is undertaken only when a successor is available or when the module's capability is being structurally reconsidered.

### 6.2 Lifecycle Transitions

Lifecycle transitions are governed by the following triggers and requirements. Each transition is recorded in the module's documentation and in the platform's CHANGELOG; each transition that affects edition packaging is also recorded in the Product Council's minutes.

| Transition | Trigger | Requirements |
|---|---|---|
| LC1 → LC2 | Implementation complete; pilot customer identified | Contract tests pass; documentation complete; security review passed; pilot customer onboarded |
| LC2 → LC3 | Sufficient stability and adoption across pilot customers | Operational readiness criteria met; performance validated; documentation published; product governance ratification |
| LC3 → LC4 | Defined period of stable operation (typically four quarters) | No contract-breaking changes during the period; no Severity-1 incidents attributable to the module; documentation current |
| LC4 → LC5 | Successor available or structural reconsideration | Successor ADR ratified (if applicable); deprecation timeline drafted; affected editions identified |
| LC5 → LC6 | Deprecation timeline finalized and communicated | Deprecation timeline published; affected tenants notified; migration tooling available |
| LC6 → LC7 | Deprecation window elapsed | All tenants migrated; data preserved per retention policy; contracts removed; archival completed |

Transitions that skip states are forbidden. A module may not move from LC1 directly to LC3; pilot validation is required for any module whose contract surface is novel. A module may not move from LC3 directly to LC6; the Deprecation Candidate stage (LC5) is mandatory to ensure that deprecation timelines are deliberate and that affected tenants are notified before deprecation takes effect.

### 6.3 Module Promotion (LC1 to LC4)

Module promotion is the process of moving a module from Candidate (LC1) through Pilot (LC2) and General Availability (LC3) to Mature (LC4). Promotion is governed by operational readiness criteria that verify the module is fit for the next stage. The criteria are cumulative: a module at LC3 must satisfy every criterion required at LC1, LC2, and LC3, plus the additional criteria for LC3.

The promotion criteria include contract test coverage, documentation completeness, security review, performance validation, disaster-recovery validation, observability instrumentation, and pilot customer feedback. Each criterion has a measurable threshold; criteria without thresholds are defective and are corrected by defining thresholds. The thresholds are reviewed annually to ensure they remain appropriate as the platform evolves.

Promotion is the responsibility of the module owner, with custodial oversight by the Architecture Council. The module owner assembles the promotion case; the Architecture Council reviews it; the Product Council ratifies the LC2-to-LC3 transition because it affects edition packaging. Promotion is recorded in the module registry (Section 13.3) and is announced through the platform's release notes.

### 6.4 Module Deprecation and Retirement (LC5 to LC7)

Module deprecation and retirement are the most consequential lifecycle transitions. Deprecation signals that a module's capability will eventually be unavailable; retirement makes the unavailability permanent. Both are governed by Principle P6 (Reversibility Over Permanence): deprecation is reversible (a module may be un-deprecated if circumstances change), retirement is irreversible (once retired, a module's data is archived or purged and its contracts are removed).

The deprecation timeline is announced at the LC5-to-LC6 transition, not at the LC6-to-LC7 transition. The timeline is long enough for every affected tenant to migrate — typically measured in quarters, not weeks — and is documented with a per-tenant migration plan. Tenants with custom integrations to the deprecated module are given additional time and migration support. The timeline is reviewed at every quarterly review until the retirement is complete.

Retirement is undertaken only when every tenant has migrated or when the retention window for non-migrated tenants has elapsed. Data preservation is governed by the platform's retention policy: contractual data is preserved per the tenant's contract; audit data is preserved per the regulatory retention window; operational data is archived and then purged per the platform's data lifecycle. Retirement is recorded in the module registry, in the platform's CHANGELOG, and in the audit trail (Principle P13).

### 6.5 Lifecycle and Edition Interplay

Module lifecycle interacts with edition packaging (Section 2.5) and with tenant enablement. An LC2 (Pilot) module is packaged only for pilot editions and is not enabled for tenants outside the pilot cohort. An LC3 (General Availability) module is packaged per product governance and may be enabled by any tenant whose edition includes it. An LC6 (Deprecated) module remains packaged for existing customers but is not enabled for new customers; the platform's enablement tooling refuses new enablements of LC6 modules.

The interplay creates three constraints on edition composition. First, an edition may not include an LC1 module; LC1 modules are not packaged. Second, an edition may include an LC2 module only if the edition is explicitly a pilot edition and the tenant is in the pilot cohort. Third, an edition may include an LC6 module only for tenants that had the module enabled before deprecation; new tenants are refused.

These constraints are enforced by the platform's edition configuration tooling and are validated at tenant provisioning time. A tenant provisioning request that violates the constraints is rejected. The constraints preserve catalogue stability across the lifecycle: a module's lifecycle state determines its availability, and availability is enforced structurally rather than left to operational discipline.

---

## 7. Module Communication Patterns

### 7.1 Communication Mechanisms

Modules communicate through the mechanisms defined in SYSTEM_ARCHITECTURE Section 9.5 and Section 13.5. Each mechanism is appropriate to a different class of interaction; the choice is governed by the use case's latency requirements, reliability requirements, and coupling tolerance. The four mechanisms are:

| Mechanism | Coupling | Latency | Reliability | When Used |
|---|---|---|---|---|
| Synchronous command | Synchronous; consumer blocked until result | Sub-second typically | Consumer fails if producer fails | When the consumer needs immediate confirmation |
| Synchronous query | Synchronous; consumer blocked until result | Sub-second typically | Consumer fails or degrades if producer fails | When the consumer needs to read another module's state |
| Asynchronous event | Asynchronous; consumer reacts to past events | Eventual; seconds to minutes | Reliable via outbox pattern (Section 7.4) | When the consumer does not need immediate response |
| Outbox-pattern event | Asynchronous; producer writes event with state change | Eventual; seconds to minutes | Atomic with state change; reliable delivery | When event reliability must match state-change reliability |

Direct data access across module boundaries is forbidden (Section 5.1). A module that accesses another module's data store directly is defective and is rejected at code review. The prohibition applies to every data store category (transactional, analytical, cache, object, audit) and to every access mode (read, write, schema introspection).

The default mechanism is synchronous command or query, because synchronous is simpler (Principle P14). Deviation to asynchronous requires documented justification: the use case must either tolerate eventual consistency, require decoupling of producer and consumer availability, or require reliable event emission that matches state-change reliability. Synchronous is the default; asynchronous is the exception with a documented rationale.

### 7.2 Synchronous Command and Query

Synchronous communication (in-process command, in-process query, or network-based command/query for extracted services) is used when the consumer needs the result immediately, when the operation is short-lived, or when the consumer and producer are in the same transactional context. Synchronous communication couples the consumer to the producer's availability and performance; where the producer is unavailable or slow, the consumer must fail, degrade, or retry.

Synchronous commands that change clinical state are governed by Principle P5 (Consistency Over Availability for Clinical Data). Such commands must execute atomically with their state change and with the persistence of their events to the outbox. A clinical command that returns success to the caller before its state is durably persisted is defective. Synchronous commands that change non-clinical state may use weaker consistency, with the consistency level documented in the command's contract.

Synchronous queries that read clinical state must return the most recently committed state. A query that returns stale clinical state is defective, unless the staleness is explicitly documented in the query's contract and the consumer has explicitly accepted the staleness bound. Synchronous queries that read non-clinical state may return cached data with explicit staleness bounds, governed by the query's contract and by the configuration surface (Section 10).

Cross-module synchronous calls are protected by circuit breakers, timeouts, and bulkheads (Section 11.4). A consumer that does not protect its synchronous calls is defective; an unprotected call propagates producer failure into consumer failure, defeating the failure isolation commitment. The protection mechanisms are governed by the consumer's contract with its own callers: a consumer that fails fast must declare fail-fast in its contract; a consumer that degrades must declare its degradation behaviour.

### 7.3 Asynchronous Event Communication

Asynchronous communication through domain events is used when the consumer does not need the result immediately, when the operation can tolerate eventual consistency, or when the producer should not be coupled to the consumer's availability or performance. Asynchronous communication decouples the producer from the consumer: the producer emits the event and continues; the consumer reacts at its own pace. This decoupling allows consumers to be added, removed, or modified without coordinating with the producer.

Events are categorized by purpose (SYSTEM_ARCHITECTURE Section 18.2): domain events for cross-module communication, integration events for external system consumption, audit events for audit recording. A module that emits events emits them through the outbox pattern (Section 7.4); direct event publication without the outbox is forbidden because it does not guarantee atomicity with state change.

Event consumers subscribe to events through a documented subscription contract. The subscription contract specifies the event types the consumer subscribes to, the consumer's idempotency strategy, the consumer's failure handling strategy, and the consumer's delivery guarantees. A consumer without a documented subscription contract is defective; the contract is part of the consumer's definition of done and is reviewed at architectural review.

Eventual consistency is the default for asynchronous communication. A consumer that requires stronger consistency must use synchronous communication or must explicitly document its consistency expectations and accept the operational cost. The platform does not provide synchronous-event semantics; a consumer that needs synchronous semantics must request them through a command, not through an event.

### 7.4 Outbox Pattern

The outbox pattern is used to reliably emit domain events in coordination with state changes. When a module changes state, it writes the state change and the corresponding event to the outbox in the same transaction. A separate process reads the outbox and publishes the events to the event infrastructure. The pattern is governed by SYSTEM_ARCHITECTURE Section 18.4 and is mandatory for every module that emits domain events.

The outbox pattern solves the dual-write problem. Without the outbox, a module that writes state and then publishes an event may fail between the two operations: the state is changed but the event is not published, or the event is published but the state change is rolled back. The outbox ensures atomicity: the state change and the event are written together in the same transaction, and the event is published asynchronously by the outbox processor. A producer that crashes after committing its transaction but before distributing its events will have its events distributed by the outbox processor.

All modules that emit domain events must use the outbox pattern. Direct event publication (without the outbox) is forbidden. A module that publishes events directly is defective and is corrected by refactoring to use the outbox. The prohibition applies to every event type: domain, integration, and audit events are all emitted through the outbox. Audit events emitted through the outbox are governed by Principle P13 (Auditability as Primitive) and are subject to additional integrity protections documented in SYSTEM_ARCHITECTURE Section 27.

The outbox processor is a platform-level component, not a module-level component. Modules write to the outbox; the platform reads from the outbox and distributes events. This separation ensures that every module's event emission honours the same reliability guarantees, regardless of the module's implementation. The outbox processor is operated by the platform's SRE function; its health is monitored as a platform-level metric.

### 7.5 Idempotent Consumption

Event consumers must be idempotent (SYSTEM_ARCHITECTURE Section 18.3). Processing the same event twice must produce the same outcome as processing it once. Idempotency is required because the event infrastructure delivers events at least once, not exactly once: a consumer that crashes after processing an event but before acknowledging it will receive the event again on restart.

Idempotency is achieved through three mechanisms. First, stable event identifiers: each event carries a unique identifier that the consumer uses for deduplication. Second, consumer-side deduplication: the consumer tracks processed event identifiers and skips duplicates. Third, idempotent state transitions: applying the same event twice produces the same state, even if deduplication fails. The three mechanisms are complementary; a consumer that relies on only one is fragile.

A consumer that is not idempotent is defective. Defects manifest as duplicate side effects: a notification sent twice, a charge applied twice, a record created twice. Such defects are detected through operational monitoring and are corrected by making the consumer idempotent. The correction is the consumer owner's responsibility; the platform does not provide exactly-once delivery because doing so would compromise the platform's scalability and reliability posture.

### 7.6 Communication Pattern Selection

The choice of communication pattern is governed by the use case's characteristics. The selection criteria are:

| Criterion | Favour Synchronous | Favour Asynchronous |
|---|---|---|
| Latency requirement | Consumer needs immediate result | Consumer tolerates eventual result |
| Consistency requirement | Consumer needs strong consistency | Consumer tolerates eventual consistency |
| Coupling tolerance | Consumer can tolerate producer's availability | Consumer must be decoupled from producer's availability |
| Reliability requirement | Consumer can retry on failure | Consumer needs reliable delivery via outbox |
| Transactional scope | Consumer and producer in same transaction | Consumer and producer in separate transactions |
| Volume characteristic | Low volume, low fan-out | High volume, high fan-out |

The selection is documented as part of the consuming module's contract with its own callers. A module that consumes another module's command or event without documenting the consumption pattern is defective; the documentation is the basis for impact analysis when the producer's contract changes. The selection is reviewed at architectural review; a selection that does not match the use case's characteristics is corrected by changing the pattern or by documenting the justification for the deviation.

The platform supports all four patterns (Section 7.1) and does not prescribe a single pattern for a given use case. The architectural commitment is that the pattern is selected deliberately, documented explicitly, and honoured consistently. A module that mixes patterns for the same use case — for example, sometimes calling a command synchronously and sometimes emitting an event for the same operation — is defective and is corrected by selecting one pattern and applying it consistently.

---

## 8. Module Versioning

### 8.1 Semantic Versioning

Module contracts are versioned using semantic versioning (SYSTEM_ARCHITECTURE Section 13.6). Semantic versioning expresses the nature of changes through three version components: major, minor, and patch. Each component signals a different class of change and triggers a different consumer response.

| Version Component | Incremented When | Consumer Impact |
|---|---|---|
| Major | A backward-incompatible change is introduced | Consumers must update to consume the new version |
| Minor | A backward-compatible capability is added | Consumers may update to consume the new capability; existing consumers are unaffected |
| Patch | A defect is corrected without changing capability | Consumers may update to receive the correction; existing consumers are unaffected |

Consumers depend on a contract version range and are protected from breaking changes within that range. A consumer that depends on a single exact version is fragile; a consumer that depends on an unbounded range is reckless. The platform's default version range is bounded: a consumer accepts minor and patch updates within a major version, but does not accept major-version updates without explicit migration.

Module versioning interacts with contract versioning. A module's contracts may evolve independently of the module's version, with contract versions tracked separately (SYSTEM_ARCHITECTURE Section 13.6). A module that has multiple contract versions in production must support all of them through their deprecation windows. The module's version reflects the cumulative state of its contracts; a major-version bump of any contract triggers a major-version bump of the module.

### 8.2 Backward Compatibility

A change is backward-compatible if existing consumers can continue to operate without modification. Backward-compatible changes are minor or patch version increments; they do not require consumer migration. Backward-incompatible changes are major version increments; they require consumer migration through a deprecation window (Section 8.3).

| Change | Backward-Compatible? | Version Increment |
|---|---|---|
| Adding an optional field to a command's input | Yes | Minor |
| Adding a new operation to a contract | Yes | Minor |
| Adding a new event type | Yes | Minor |
| Adding an optional field to an event's payload | Yes | Minor |
| Relaxing a validation constraint | Yes | Minor |
| Adding a new configuration key with a default | Yes | Minor |
| Correcting a defect without changing capability | Yes | Patch |
| Removing a field from a command's input | No | Major |
| Changing a field's type | No | Major |
| Removing an operation | No | Major |
| Changing an operation's semantics | No | Major |
| Tightening a validation constraint | No | Major |
| Removing a configuration key | No | Major |
| Changing a configuration key's default in a behaviour-altering way | No | Major |

The table is normative; a change that does not match a row in the table is escalated to the Architecture Council for classification. The default classification for ambiguous changes is "backward-incompatible" because the cost of an incorrect backward-compatible classification (broken consumers) exceeds the cost of an incorrect backward-incompatible classification (unnecessary migration). This default honours Principle P6 (Reversibility Over Permanence): conservative classification is reversible; aggressive classification is not.

### 8.3 Breaking Changes and Deprecation

Breaking changes follow the platform's deprecation policy (SYSTEM_ARCHITECTURE Section 30.5). The policy is:

1. The old contract version is deprecated; the deprecation is announced through the platform's release notes and through direct communication to affected consumers.
2. The new contract version is published alongside the old version; both versions operate in parallel through the transition window.
3. A migration path is documented, including any tooling that automates the migration.
4. Consumers migrate at their own pace during the deprecation window; the platform provides migration support.
5. After the deprecation window, the old contract version is retired; calls to the retired version are refused.

The deprecation window is long enough for consumers to migrate — typically measured in quarters, not weeks. The window is announced at deprecation time, not at retirement time. The window is reviewed at every quarterly review until the retirement is complete; extensions are granted for consumers with documented migration challenges, but extensions are not indefinite.

Breaking changes that affect clinical data or clinical workflows require additional ratification. Such changes may compromise patient safety if migration is incomplete at retirement; the Architecture Council ratifies the change with explicit attention to clinical safety (Principle P1). A breaking change to a clinical contract without clinical safety review is forbidden and is treated as a defect.

### 8.4 Contract Version Independence

Module contracts evolve independently of the module's version. A module's command contract may be at version 2.3.1, its query contract at version 1.4.0, its event contract at version 3.0.0, and its configuration schema at version 2.0.0. The module's version reflects the cumulative state of its contracts but does not constrain individual contract versions.

This independence has two consequences. First, a module that has multiple contract versions in production must support all of them through their deprecation windows. Supporting multiple versions is the cost of contract evolution; the platform accepts this cost as the price of decoupled consumer migration (Principle P6). Second, a contract version is retired independently of other contracts; a command contract may be retired while the module's query contract continues unchanged. Retirement is per-contract, not per-module.

Contract version independence requires disciplined record-keeping. The module's contract registry (Section 13.3) records every contract version, its lifecycle state, its deprecation timeline, and its consumers. The registry is the source of truth for impact analysis when a contract changes; a contract change without an up-to-date registry entry is defective and is corrected before the change can be released.

### 8.5 Version Compatibility Testing

Contract tests verify compatibility (SYSTEM_ARCHITECTURE Section 13.9). Three types of contract tests are required:

| Test Type | Purpose | Run When |
|---|---|---|
| Provider-side contract test | The module honours its published contracts | Every commit |
| Consumer-side contract test | The module's consumers honour the contracts they depend on | Every commit |
| Compatibility test | The new contract version is backward-compatible with the old version | On every contract version change |

Provider-side and consumer-side contract tests are part of the module's test suite and are run on every change (Section 12.2). A change that breaks a contract test is a breaking change and must follow the deprecation policy (Section 8.3); a change that bypasses contract tests is defective and is corrected by adding the tests.

Compatibility tests are run on every contract version change. The test verifies that a consumer of the old version can consume the new version without modification. A compatibility test that fails indicates a breaking change; the change is either reclassified as a major version increment with a deprecation window, or it is refactored to be backward-compatible. Compatibility tests are the primary defence against accidental breaking changes and are mandatory for every contract version change.

---

## 9. Module Extension Points

### 9.1 Extension Over Modification

Modules are extended, not modified (SYSTEM_ARCHITECTURE Section 13.7, Section 22). Extension is adaptation through published mechanisms — configuration overlays, workflow definitions, event subscriptions, integration adapters — that do not require modification of the module's source code. Modification is adaptation through source code changes; it is architecturally forbidden (ADR-001, Principle P2) and is the structural defect that most directly compromises Principle P3 (One Platform, Many Organizations). The modular-monolith default that hosts these extension points is ratified by ADR-002, which preserves the right to extract modules to separate services when justified by operational requirements; extraction is a deployment choice that does not alter the contract surface or the extension posture.

The distinction between extension and modification is the boundary between configuration and source. Configuration is the platform's primary adaptation surface (SYSTEM_ARCHITECTURE Section 8); source modification is excluded as an adaptation mechanism. An adaptation that requires source modification is, by definition, customization, and is rejected. An adaptation that exceeds the configuration surface is a candidate for platform evolution through the extension surface, not for customer-specific customization.

Extension points are first-class architectural concerns with their own contracts, their own validation, and their own lifecycle (Section 9.3, 9.5). An extension point that requires source modification of the extended module is, by definition, not an extension point; it is a customization hook, and is forbidden. The boundary between extension and customization is governed by the platform's extensibility strategy (SYSTEM_ARCHITECTURE Section 22) and is enforced through architectural review.

### 9.2 Extension Point Categories

The platform supports four extension point categories. Each category has a defined mechanism, governance posture, and lifecycle. Extension points are not created ad hoc; a new extension point category requires ADR ratification, with the rationale, alternatives, and consequences documented.

| Extension Point Category | Mechanism | Governance | Typical Use |
|---|---|---|---|
| Configuration Overlays | Tenant-specific configuration that adapts module behaviour | Configuration governance (CONFIGURATION_ARCHITECTURE Section 9) | Adapting validation rules, business rules, workflow definitions per tenant |
| Workflow Definitions | Custom workflows or modifications to module-provided workflows | Configuration governance; workflow review for clinical workflows | Custom encounter workflows, custom billing workflows, custom document workflows |
| Event Subscriptions | Subscriptions to the module's domain events | Event schema governance; consumer contract governance | Reacting to patient registration, reacting to claim submission, reacting to medication dispensing |
| Integration Adapters | Adapters to external systems, with anticorruption layer | Integration governance (SYSTEM_ARCHITECTURE Section 19) | Connecting to external laboratories, external pharmacies, external billing systems, external master patient indices |

The four categories cover the platform's complete extension surface. An adaptation that does not fit any category is a candidate for platform evolution: either a new extension point category is ratified through an ADR, or the platform's existing capability is extended to cover the adaptation. Customer-specific source modification is never the answer; the platform either adapts through configuration, extends through extension points, or evolves through platform development.

### 9.3 Extension Contracts

Each extension point has a contract that defines what the extension may do, what inputs it receives, what outputs it must produce, and what failure modes are permitted. The contract is versioned and evolves under the same backward-compatibility rules as module contracts (Section 8). An extension point without a contract is defective; an extension that violates its contract is defective and is rejected at deployment.

The extension contract specifies the extension's execution model: synchronous (the extension runs within the module's invocation and must return before the invocation completes), asynchronous (the extension runs after the module emits an event), or batch (the extension runs on a schedule). The execution model determines the extension's performance and reliability characteristics and is part of the contract.

The extension contract specifies the extension's isolation boundary (Section 9.4): what platform resources the extension may access, what module contracts the extension may invoke, and what data the extension may read or write. An extension that exceeds its isolation boundary is defective and is rejected at runtime. The isolation boundary is enforced by the extension sandbox.

### 9.4 Extension Sandboxing

Extensions execute within a sandbox that limits their access to module and platform resources (SYSTEM_ARCHITECTURE Section 22.4). The sandbox is enforced at runtime; an extension that attempts to exceed its sandbox is refused. The sandboxing posture is non-negotiable and is the architectural commitment that makes extension safe in a multi-tenant context (Principle P10).

| Sandbox Dimension | Constraint |
|---|---|
| Tenant scope | An extension may not access another tenant's data; tenant context is propagated and enforced |
| Configuration scope | An extension may not modify module-default configuration; it may only read configuration and propose overlays |
| Contract scope | An extension may invoke only the contracts documented in its extension contract; invocation of undocumented contracts is refused |
| Resource scope | An extension's CPU, memory, and time consumption are bounded; exceeding the bounds terminates the extension |
| Failure scope | An extension's failure is contained; it does not propagate to the module or to other extensions |

Sandboxing is enforced by the extension runtime, not by the extension itself. An extension that attempts to bypass the sandbox — for example, by reaching into another module's data store or by invoking platform-internal contracts — is terminated and is flagged for review. Repeated sandbox violations are escalated to the Architecture Council and may result in the extension being revoked.

The sandboxing posture honours Principle P1 (Healthcare Safety) and Principle P13 (Auditability). An extension that could compromise clinical safety or audit completeness is refused before it can execute. The sandbox is the architectural mechanism that makes extension safe in a healthcare context, where the cost of an extension gone wrong is measured in patient harm rather than in convenience.

### 9.5 Extension Lifecycle

Extensions follow a lifecycle: proposed, validated, deployed, monitored, deprecated, retired. The lifecycle is governed by the extension's category (Section 9.2). Configuration overlays follow configuration governance (CONFIGURATION_ARCHITECTURE Section 9). Workflow definitions follow workflow governance, with additional review for clinical workflows. Event subscriptions follow event schema governance. Integration adapters follow integration governance.

The lifecycle transitions are:

| Transition | Trigger | Requirements |
|---|---|---|
| Proposed → Validated | Extension proposed by tenant or by product | Extension contract honoured; validation tests pass |
| Validated → Deployed | Validation complete | Deployment to a non-production environment for verification |
| Deployed → Monitored | Verification complete | Deployment to production; monitoring active |
| Monitored → Deprecated | Extension no longer needed or extension contract being deprecated | Deprecation timeline published; affected tenants notified |
| Deprecated → Retired | Deprecation window elapsed | Extension removed; data preserved per retention policy |

Extensions are tracked in the platform's extension registry (Section 13.3). The registry records each extension's category, contract, lifecycle state, owning tenant, and operational metrics. A registry entry is the source of truth for the extension's existence and posture; an extension without a registry entry is defective and is removed.

Extension lifecycle interacts with module lifecycle (Section 6). When a module is deprecated, its extensions are also deprecated, with the deprecation timeline aligned to the module's. When a module is retired, its extensions are retired; data preserved by the extensions is migrated to successor extensions or is archived per retention policy. An extension that outlives its module is defective and is corrected by either retiring the extension or by reattaching it to a successor module.

---

## 10. Module Configuration Surface

### 10.1 Configuration Surface Definition

Each module exposes a configuration surface — the set of configuration keys the module accepts, with their types, defaults, validation rules, and inheritance behaviour (Section 4.6). The configuration surface is part of the module's contract and is versioned with it. The configuration surface is the primary mechanism through which the platform adapts to customer needs without source modification (Principle P2).

The configuration surface is bounded by what can be expressed without source-level modification. Behaviours that would require source modification are either out of scope or are candidates for platform evolution through the extension surface (Section 9). The boundary between configuration and source is explicit and is governed by the platform's extensibility strategy (SYSTEM_ARCHITECTURE Section 22). A behaviour that crosses the boundary is either promoted to configuration (if it can be expressed declaratively) or is recognized as requiring platform evolution (if it cannot).

The configuration surface is detailed in `CONFIGURATION_ARCHITECTURE.md`. This document governs the module-level commitment: every module exposes its configuration surface as a documented, versioned contract; the configuration surface is part of the module's definition of done; configuration changes are validated before application and are audited on application. A module that accepts configuration without a published schema is defective; a module that accepts configuration outside its schema is defective.

### 10.2 Configuration Surface Design Criteria

The configuration surface should satisfy the following design criteria. Each criterion is a default; deviation requires documented justification.

| Criterion | Description | Governing Principle |
|---|---|---|
| Cohesive | Configuration keys are related and serve the module's adaptation needs | P4 (Loose Coupling, High Cohesion) |
| Minimal | Only configuration that is genuinely needed is exposed; speculative configuration is not | P14 (Simplicity Over Complexity) |
| Documented | Each key is documented with its purpose, type, default, validation rules, and inheritance behaviour | P7 (Documented Before Implemented) |
| Stable | The configuration surface evolves through backward-compatible changes; breaking changes follow the deprecation policy | P8 (Bounded Contexts Are Stable), P6 (Reversibility) |
| Governed | Configuration changes follow the governance rules in `CONFIGURATION_ARCHITECTURE.md` | P2 (Configuration Before Customization) |
| Validated | Configuration values are validated before application, with five validation rule categories | P1 (Healthcare Safety), P13 (Auditability) |
| Audited | Configuration changes are audited, with the configurator, time, scope, previous value, and new value recorded | P13 (Auditability as Primitive) |

The criteria parallel the boundary design criteria (Section 3.2) because the configuration surface is part of the boundary. A configuration surface that satisfies all seven criteria is well-formed; a surface that satisfies fewer is corrected through configuration surface refactoring, which follows the same process as boundary refactoring (Section 3.4).

The validation criterion is particularly consequential for clinical modules. A configuration change that compromises clinical safety — for example, a change that disables a medication interaction check — is refused by validation. The validation rules that protect clinical safety are themselves governed by clinical safety review and are not overridable by tenant configuration. This honours Principle P1: healthcare safety overrides configuration convenience.

### 10.3 Configuration Categories per Module

A module's configuration typically falls into several categories. The categories are not mutually exclusive; a single configuration key may serve multiple categories. The categories are organizing concepts that help module owners design a coherent configuration surface.

| Category | Examples | Typical Modules |
|---|---|---|
| Behavioural | Workflow definitions, business rules, validation rules | All modules, especially Clinical and Operational |
| Structural | Feature toggles, capability gating | All modules |
| Integration | External system endpoints, credentials, schedules | M17 Integration; modules with integration adapters |
| Localization | Locale-specific templates, formats, terminology | M19 Localization; all modules consume localization configuration |
| Security | Authorization rules, access controls, session policies | M14 Identity & Access; all modules with role-based configuration |
| Performance | Cache settings, batch sizes, timeouts | All modules with operational performance concerns |
| Regulatory | Regulatory framework selection, retention policies, compliance rules | M16 Audit; M09 Billing; M10 Accounting; M05 Pharmacy |

The categories are governed by different stakeholders. Behavioural and structural configuration is typically governed by the module owner and by tenant administrators. Integration configuration is governed by integration architects. Localization configuration is governed by localization specialists. Security configuration is governed by security architects. Regulatory configuration is governed by compliance officers. The governance posture per category is documented in `CONFIGURATION_ARCHITECTURE.md`.

A module's configuration surface must distinguish between categories that are tenant-configurable and categories that are platform-configurable. Tenant-configurable categories may be overridden by tenant administrators within validation constraints; platform-configurable categories are reserved for the platform and may not be overridden by tenants. The distinction is enforced by the configuration service and is part of the configuration schema.

### 10.4 Configuration Resolution and Caching

Configuration is resolved by the configuration service (SYSTEM_ARCHITECTURE Section 6.6, Section 15), not by each module. Modules receive the resolved value for their context; they do not perform their own resolution. This centralizes the resolution logic, prevents inconsistency across modules, and ensures that the configuration layer model (SYSTEM_ARCHITECTURE Section 15) is honoured uniformly.

The resolution process honours the layered configuration model. Configuration values are resolved by combining values from each layer in precedence order: platform default, edition default, tenant override, clinic override (where applicable), and session override (where applicable). The resolution is deterministic: the same inputs produce the same output, and the output is reproducible for audit purposes.

Modules may cache configuration values for performance, with explicit invalidation rules. Cache invalidation is governed by the configuration service, which notifies modules when their configuration changes. A module that uses stale configuration is defective; the staleness may produce incorrect behaviour, and the defect is detected through configuration change monitoring. Cache invalidation is immediate for clinical configuration (Principle P5) and may be eventual for non-clinical configuration, with the eventual consistency bound documented in the module's configuration schema.

### 10.5 Configuration Governance per Module

Configuration governance is the practice of managing configuration change over time (SYSTEM_ARCHITECTURE Section 8.7). Governance is customer-scoped: the platform provides the tooling and the audit trail; the customer defines the governance workflow within the platform's framework. The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised.

The framework requires that every configuration change is: validated before application (Section 10.2), audited on application (Principle P13), reversible through rollback, and reviewable through the audit trail. The framework supports but does not require: change approval workflows, compliance review for regulatory-impacting changes, sandbox testing before production application, and change communication to affected users.

Each module's governance posture is documented as part of its configuration schema. The posture specifies which categories require approval, which categories require compliance review, which categories require sandbox testing, and which categories require user communication. The posture is set by the module owner in consultation with security, compliance, and operations; it is reviewed at architectural review. A module without a documented governance posture is defective.

---

## 11. Module Isolation Strategy

### 11.1 Isolation Dimensions

Modules are isolated from each other in three dimensions (SYSTEM_ARCHITECTURE Section 13.8). Each dimension protects a different aspect of module autonomy; together, they ensure that a module's behaviour is determined by its own contracts and configuration, not by the behaviour of other modules. Isolation is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) and is the foundation of independent module evolution.

| Dimension | Description | Enforced Through |
|---|---|---|
| Contract isolation | Modules interact only through documented contracts; internal implementation is private | Contract testing; static analysis; architectural review |
| State isolation | Modules own their state; direct data access across module boundaries is forbidden | Data store ownership; query contracts; static analysis |
| Failure isolation | A module's failure does not cascade to other modules, except where dependency requires | Bulkheading; circuit breaking; graceful degradation; timeouts |

The three dimensions are independent. A module may have strong contract isolation and weak failure isolation (for example, a module that exposes clean contracts but has no circuit breakers on its synchronous calls). Such a module is partially isolated and is corrected by strengthening the weak dimension. Full isolation requires all three dimensions to be strong.

Isolation is not absolute. Modules depend on each other (Section 5), and dependencies create isolation compromises: a module that depends on another module's contract is coupled to that contract's stability, and a module that calls another module synchronously is coupled to that module's availability. Isolation manages these compromises; it does not eliminate them. The architectural commitment is that the compromises are explicit, documented, and bounded.

### 11.2 Contract Isolation

Contract isolation is enforced through four mechanisms. First, published contracts: modules expose only their contract surface; internals are inaccessible to other modules. Second, architectural review: new contracts are reviewed before they are added, with attention to whether the contract leaks internals. Third, static analysis: tools detect contract violations, such as a module reaching into another module's internals or accessing another module's data store directly. Fourth, contract testing: contract tests catch violations at the contract level, even when static analysis cannot.

Contract isolation is the most consequential isolation dimension because it is the foundation of independent evolution. A module with strong contract isolation can evolve its internals freely, as long as it honours its contracts. A module with weak contract isolation is coupled to its consumers' assumptions about its internals and cannot evolve without coordinating with consumers.

The enforcement posture is strict. A contract violation is a build failure (Section 5.5); a contract violation that escapes build-time detection is corrected on discovery, with the correction tracked in the module's health metrics. Repeated contract violations are escalated to the Architecture Council and may result in the module being required to refactor its contract surface before being permitted to add new contracts.

### 11.3 State Isolation

State isolation is enforced through three mechanisms. First, context-owned authoritative state: each module owns its authoritative state; other modules hold references or projections, not copies they may mutate. Second, aggregate boundaries: state changes are scoped to aggregates, which are owned by a single module; an aggregate does not span module boundaries. Third, event-driven updates: other modules update their projections by subscribing to domain events, not by directly mutating the source.

State isolation is the architectural expression of the bounded context ownership principle (SYSTEM_ARCHITECTURE Section 7.5). A module's data is not accessed directly by other modules; it is accessed through the module's query contracts. Direct data access across module boundaries is a defect (Section 5.4) and is detected through static analysis. The prohibition applies to every data store category: transactional, analytical, cache, object, audit. The segmented data architecture ratified by ADR-006 underwrites this prohibition by ensuring each data store category is governed by its own contract surface, so direct cross-module access to any category is both structurally forbidden and operationally detectable.

Read models and projections are the legitimate mechanism for cross-module data consumption. A module that needs another module's data subscribes to that module's domain events and maintains a local projection of the data it needs. The projection is owned by the consuming module; the producing module is unaware of the projection. Projections are eventually consistent with the source (Principle P5 carve-out for non-clinical data); a projection that requires strong consistency must use a synchronous query, not an event subscription.

### 11.4 Failure Isolation

Failure isolation is enforced through five mechanisms. The mechanisms are governed by the consumer's contract with its own callers: a consumer declares its failure modes, and the platform enforces them.

| Mechanism | Description | Governing Concern |
|---|---|---|
| Declared failure modes | Each module declares its failure modes (fail-fast, degrade, retry, circuit-break) per operation | Contract surface (Section 4) |
| Circuit breakers | Cross-module calls are protected by circuit breakers that stop attempting operations that are consistently failing | Operational stability |
| Timeouts | Cross-module calls have timeouts, preventing indefinite blocking | Operational stability |
| Bulkheads | Resources (threads, connections) are isolated per module, preventing one module's resource exhaustion from affecting others | Failure containment |
| Graceful degradation | Consumers degrade gracefully when producers fail, returning partial results with explicit indication of what is missing | User experience |

Failure isolation is the most operationally consequential isolation dimension. A module without circuit breakers propagates producer failure into consumer failure; a module without timeouts blocks indefinitely on slow producers; a module without bulkheads allows one module's resource exhaustion to take down the platform. Each of these is a defect and is corrected by adding the missing mechanism.

Clinical modules have additional failure isolation requirements. A clinical module that fails must not silently accept incorrect data (Principle P1, P5); it must fail safe, refusing to proceed when it cannot guarantee correctness. For example, a pharmacy module that cannot verify medication interactions must refuse to dispense, not dispense without verification. The fail-safe posture is part of the clinical module's contract and is enforced through clinical safety review.

### 11.5 Multi-Tenant Isolation Within Modules

Every module is multi-tenant by construction (ADR-004, Principle P10). Multi-tenant isolation within a module is enforced through four mechanisms. First, tenant context propagation: every request carries tenant context, established at the edge and propagated through the call chain. Second, tenant-scoped state: all state is associated with a tenant identifier; queries are tenant-scoped by default. Third, tenant-aware access controls: authorization checks include tenant scope. Fourth, tenant-resolved configuration: configuration values are resolved per tenant context.

A module that fails to enforce tenant isolation is defective and is a security incident. The defect is detected through security review, through tenant isolation testing, and through operational monitoring. A module that exhibits cross-tenant data leakage is escalated immediately and is remediated as a Severity-1 incident, regardless of the module's category.

Multi-tenant isolation within a module interacts with the platform's tenant isolation levels (SYSTEM_ARCHITECTURE Section 10.2). Logical isolation (IL1) relies entirely on within-module enforcement; logical with dedicated compute (IL2) and physical isolation (IL3) provide additional infrastructure-level isolation but do not relax the within-module requirements. Every module enforces multi-tenant isolation identically across all three levels; the level is a deployment choice, not an architectural choice.

The within-module enforcement is the foundation of multi-tenancy. A module that relies on infrastructure-level isolation to compensate for weak within-module enforcement is defective; the infrastructure-level isolation is defence in depth, not the primary defence. The primary defence is the module's own tenant isolation, enforced through the four mechanisms above.

---

## 12. Module Testing Strategy

### 12.1 Test Pyramid

Module testing follows the test pyramid (SYSTEM_ARCHITECTURE Section 13.9). The pyramid organizes tests by scope, frequency, and cost; the broad base of fast, cheap unit tests supports a narrower layer of integration tests and a still narrower layer of end-to-end tests. The pyramid is the architectural commitment to test discipline; a module with an inverted pyramid (many end-to-end tests, few unit tests) is fragile, slow, and expensive to maintain.

| Test Level | Scope | Frequency | Cost |
|---|---|---|---|
| Unit tests | Individual functions and classes in isolation | Every commit | Seconds; low cost |
| Contract tests | Module's contract surface | Every commit | Seconds to minutes; low cost |
| Integration tests | Module's interaction with dependencies | Every commit | Minutes; moderate cost |
| End-to-end tests | User-visible scenarios across modules | Pre-release | Tens of minutes; high cost |
| Operational tests | Module's behaviour under operational stress | Pre-release and periodically | Minutes to hours; high cost |
| Security tests | Module's security posture | Pre-release and periodically | Minutes to hours; high cost |

The pyramid is normative for test composition, not for test count. A module with many unit tests and few end-to-end tests is well-formed; a module with few unit tests and many end-to-end tests is defective. The defect is corrected by pushing tests down the pyramid: end-to-end tests are decomposed into integration tests, integration tests are decomposed into contract tests, contract tests are decomposed into unit tests.

Test coverage is monitored, with thresholds per module. Coverage is a necessary but not sufficient measure of test quality; high coverage with poor test design produces false confidence. Coverage thresholds are set per module based on risk — clinical modules have higher thresholds than non-clinical modules — and are reviewed periodically. A module below its coverage threshold is defective and is corrected by adding tests.

### 12.2 Contract Testing

Contract testing is the primary mechanism for verifying module boundaries (SYSTEM_ARCHITECTURE Section 13.9). Contract tests verify that the module's contracts behave as documented; they are the defence against accidental contract drift. Two types of contract tests are required:

| Test Type | Purpose | Run When |
|---|---|---|
| Provider-side contract test | The module honours its published contracts | Every commit |
| Consumer-side contract test | The module's consumers honour the contracts they depend on | Every commit |

Provider-side contract tests are owned by the module that exposes the contract. They verify that the module's implementation honours the contract's inputs, outputs, errors, preconditions, postconditions, idempotency, authorization, and audit. A provider-side test that fails indicates that the module's implementation has drifted from its contract; the drift is corrected either by fixing the implementation or by ratifying the drift as a contract change (Section 8).

Consumer-side contract tests are owned by the module that consumes the contract. They verify that the consumer's expectations match the provider's contract. A consumer-side test that fails indicates that the consumer's expectations have drifted from the provider's contract; the drift is corrected either by updating the consumer or by ratifying the drift as a contract change.

Contract tests are part of the module's test suite and are run on every change. A change that breaks a contract test is a breaking change and must follow the deprecation policy (Section 8.3). A change that bypasses contract tests is defective and is corrected by adding the tests. Contract tests are mandatory for contract evolution; a contract change without contract tests is not permitted to be released.

### 12.3 Integration and End-to-End Testing

Integration tests verify a module's interaction with its dependencies. They exercise the module's contracts in concert with the contracts of the modules it depends on, verifying that the interactions produce the expected outcomes. Integration tests are slower than unit and contract tests because they involve multiple modules, but they catch defects that unit and contract tests cannot — for example, defects in the assumptions a consumer makes about a provider's behaviour under specific conditions.

End-to-end tests verify user-visible scenarios that span multiple modules. They exercise the platform's capability surface as a user would, verifying that the platform produces the expected outcomes for representative workflows. End-to-end tests are slow and expensive; they are reserved for scenarios that cannot be verified adequately at lower levels. A platform with too many end-to-end tests is fragile; a platform with too few end-to-end tests is at risk of integration defects that lower-level tests cannot catch.

The boundary between integration tests and end-to-end tests is governed by the test's scope. A test that exercises a single workflow across two or three modules is an integration test; a test that exercises a complete user journey across many modules is an end-to-end test. The boundary is not always clear; ambiguous tests are classified by their primary purpose, and the classification is reviewed at test review.

Operational and security tests are run pre-release and periodically. Operational tests verify the module's behaviour under stress — load, failure, recovery. Security tests verify the module's security posture — authorization, authentication, data protection, vulnerability. Both are mandatory for clinical modules and for modules that handle regulated data; both are governed by the platform's operational and security review cadence.

### 12.4 Test Data and Fixtures

Test data is managed through four mechanisms. First, test fixtures: reusable test data, version-controlled alongside the tests, providing a stable basis for test assertions. Second, test data builders: code that constructs test data programmatically, supporting variation and reducing the cost of test data maintenance. Third, test data factories: factories that produce realistic test data, including edge cases that hand-written fixtures might miss. Fourth, synthetic data: for tests that require large datasets, synthetic data is generated, never real patient data.

Real patient data is never used in tests. Using real patient data in tests is a security incident and is escalated immediately. The prohibition applies to every test level, including tests that operate on anonymized or pseudonymized data; the platform's posture is that any data derived from real patient data carries residual privacy risk and is therefore not used in tests. Synthetic data generation is governed by the platform's data governance function and is reviewed periodically to ensure the synthetic data is realistic without being derivative.

Test data management is itself a discipline. A test suite with poorly managed test data is fragile: tests depend on specific data states that are difficult to reproduce, and test failures are difficult to diagnose. Test data management is part of the module's definition of done; a module without disciplined test data management is defective and is corrected by refactoring the test data.

### 12.5 Test Reliability and Performance

Tests must be reliable. Flaky tests — tests that pass or fail non-deterministically — are defects. A flaky test erodes confidence in the test suite, undermines the team's ability to detect real defects, and is itself a source of wasted engineering time. A flaky test is either fixed or quarantined; it is not ignored. Quarantined tests are tracked and are fixed within a defined timeframe; tests that cannot be fixed are removed, with the removal documented.

Tests must be fast. Slow tests discourage running them, which reduces their value. Unit and contract tests run in seconds; integration tests run in minutes; end-to-end tests run in tens of minutes. Tests that exceed their time budget are optimized or split. A test suite that takes hours to run is defective; the defect is corrected by pushing tests down the pyramid, by parallelizing test execution, and by eliminating redundant tests.

Test performance is monitored as a platform-level metric. A test suite whose runtime grows over time is at risk of crossing the threshold where developers stop running it locally; the platform's continuous integration pipeline catches regressions, but local execution is the first line of defence. Test performance regressions are treated as defects and are corrected through test optimization.

Test reliability and test performance are jointly governed by the platform's test discipline. The discipline is documented in the testing documentation; this document governs the architectural commitment: tests must be reliable and fast, and a module whose tests are not reliable or not fast is defective. The commitment is enforced through the platform's continuous integration pipeline and through architectural review.

---

## 13. Module Governance

### 13.1 Module Ownership and Custodianship

Module ownership and custodianship are distinct (Section 2.6). Ownership is the team-level accountability for a module's design, implementation, operation, and evolution. Custodianship is the architecture-level accountability for a module's boundary, contract surface, and dependency posture. Both are recorded in the module registry (Section 13.3); both are reviewed at quarterly review.

Module ownership is assigned by engineering leadership. The owner is a team, not an individual; individual owners create single points of failure and erode under team turnover. The owning team is responsible for the module's release discipline, its operational health, its test discipline, its documentation, and its lifecycle. The owning team is the first responder for incidents affecting the module; the owning team is the proposer of changes to the module's contract surface.

Custodianship is held by the Architecture Council. The Council ratifies contract changes, dependency changes, lifecycle transitions, and boundary refactoring. The Council does not propose changes; it ratifies proposals from owners. The Council's role is to ensure that proposals honour the architectural principles (SYSTEM_ARCHITECTURE Section 4) and the commitments in this document. The Council's decisions are recorded in the ADR register and are reviewable.

Where ownership and custodianship conflict, custodianship prevails for structural decisions and ownership prevails for implementation decisions (Section 2.6). The boundary between structural and implementation decisions is governed by this document: anything governed by Sections 3 through 13 is structural; anything else is implementation. The Architecture Council is the arbiter of the boundary; disputes are escalated to the Office of the Chief Software Architect.

### 13.2 Module Review and Approval

Module review is the process by which the Architecture Council ratifies changes to a module's structural posture. Review is required for new contracts, contract version changes (especially breaking changes), new dependencies, dependency removals, lifecycle transitions, boundary refactoring, and configuration surface changes. Review is not required for implementation changes that do not affect the module's structural posture.

| Review Trigger | Required artefacts | Decision Authority |
|---|---|---|
| New contract | Contract definition (Section 4.2); contract tests; documentation | Architecture Council |
| Contract version change (minor) | Updated contract definition; updated contract tests | Architecture Council (fast-track) |
| Contract version change (major) | ADR; migration path; consumer impact analysis | Architecture Council |
| New dependency | Dependency justification; manifest update; impact analysis | Architecture Council |
| Dependency removal | Removal plan; consumer impact analysis | Architecture Council |
| Lifecycle transition (LC2→LC3, LC4→LC5, LC5→LC6, LC6→LC7) | Transition plan; operational readiness criteria; tenant communication | Architecture Council + Product Council (for edition-affecting transitions) |
| Boundary refactoring | ADR; migration path; consumer impact analysis | Architecture Council |
| Configuration surface change | Schema update; validation rule update; governance posture update | Architecture Council (fast-track for additive changes) |

Review is conducted at the Architecture Council's regular cadence, with fast-track review available for non-breaking changes. Fast-track review verifies that the change is additive, that the contract tests pass, and that the documentation is updated; full review verifies the change's structural implications. A change that bypasses review is defective and is reverted; repeated bypass is escalated to the Office of the Chief Software Architect.

Review decisions are recorded in the ADR register (for major changes) or in the Architecture Council's minutes (for fast-track changes). The record includes the proposal, the alternatives considered, the rationale, and the decision. The record is the source of truth for the module's structural evolution and is reviewable by any stakeholder.

### 13.3 Module Registry

The module registry is the platform's authoritative record of module identity, ownership, custodianship, lifecycle state, contract versions, dependencies, configuration surface, and extension registry. The registry is the single source of truth for the module catalogue; a module not in the registry does not exist, and a registry entry that diverges from the module's actual state is a defect.

| Registry Field | Description |
|---|---|
| Module identifier | Code (M01–M19) and name |
| Category | Clinical, Operational, Financial, Administrative, Platform |
| Owning bounded context | BC01–BC19, with documented exceptions (Section 2.4) |
| Owner | Owning team |
| Custodian | Architecture Council |
| Lifecycle state | LC1–LC7 (Section 6.1) |
| Contract versions | Per-contract version register (Section 8.4) |
| Dependencies | Direct dependencies; transitive dependencies (computed) |
| Configuration surface | Schema version; governance posture |
| Extension registry | Extensions attached to the module (Section 9.5) |
| Health metrics | Current health metrics (Section 13.4) |
| Review history | Architecture Council review decisions |

The registry is maintained by the Architecture Council's secretariat and is updated within one business day of any structural change. The registry is queryable by any stakeholder; the registry is the basis for impact analysis, dependency analysis, and lifecycle planning. A registry that is out of date is a defect; the defect is corrected by the secretariat, with the correction tracked.

The registry is versioned. Historical registry states are preserved, allowing the platform to reconstruct the module catalogue's state at any point in time. Historical states are the basis for audit, for compliance reporting, and for incident investigation. A registry that does not preserve history is defective; the defect is corrected by enabling historical preservation.

### 13.4 Module Metrics and Health

Module health is monitored through a defined set of metrics. The metrics are the operational expression of the architectural commitments in this document; a module whose metrics violate the commitments is flagged for review. The metrics are gathered by the platform's observability infrastructure (Principle P15) and are reviewed at quarterly review.

| Metric Category | Examples | Threshold |
|---|---|---|
| Contract health | Contract test pass rate; contract drift incidents | 100% pass rate; zero drift incidents per quarter |
| Dependency health | Dependency violation count; cycle incidents | Zero violations; zero cycles |
| Lifecycle health | Lifecycle transition adherence; deprecation window adherence | 100% adherence |
| Operational health | Availability; latency; error rate; incident count | Per module's operational posture |
| Test health | Test coverage; flaky test count; test runtime | Per module's test thresholds (Section 12.5) |
| Configuration health | Configuration validation failure count; audit completeness | Zero validation failures; 100% audit completeness |
| Extension health | Extension sandbox violation count; extension lifecycle adherence | Zero violations; 100% adherence |
| Documentation health | Documentation currency; definition-of-done adherence | 100% current; 100% adherence |

Metrics are reviewed at quarterly review. A module with one or more metrics below threshold is flagged for remediation; remediation is the owning team's responsibility and is tracked to completion. A module that remains below threshold across two consecutive quarterly reviews is escalated to the Architecture Council for structural intervention — typically a boundary refactoring, a contract refactoring, or a lifecycle review.

Metrics are aggregated into a module health score that summarizes the module's overall posture. The score is communicated to engineering leadership, to product leadership, and to the Architecture Council. The score is not a performance management tool; it is an architectural health indicator that surfaces structural concerns before they become incidents.

### 13.5 Module Compliance and Audit

Module compliance is the practice of verifying that a module honours its architectural commitments. Compliance is verified through three mechanisms. First, automated verification: contract tests, static analysis, and dependency validation verify structural compliance on every commit. Second, architectural review: the Architecture Council verifies compliance at review (Section 13.2). Third, periodic audit: the platform's audit function verifies compliance at a defined cadence, with findings tracked to closure.

Compliance covers the architectural principles (SYSTEM_ARCHITECTURE Section 4), the module-level commitments in this document, the configuration governance commitments in `CONFIGURATION_ARCHITECTURE.md`, and the security commitments in the security documentation. A module that is non-compliant with any of these is defective; the defect is corrected through remediation, with the remediation tracked in the module's health metrics.

Module audit is governed by Principle P13 (Auditability as Primitive). Every consequential action a module takes is recorded in the audit trail, with the record including the actor, the time, the action, the inputs, the outputs, and the authorization decision. Audit records are immutable, are tamper-evident, and are preserved per the regulatory retention window. A module that does not produce audit records for consequential actions is defective and is corrected by adding the audit recording.

Audit records are the basis for compliance reporting, for incident investigation, and for regulatory examination. The platform's audit function produces compliance reports from audit records; the reports are reviewed at quarterly review and are provided to regulators on request. A module whose audit records are incomplete is a compliance incident and is escalated immediately.

### 13.6 Module Amendment Process

Module amendment is the process by which this document is changed to reflect the platform's evolving module architecture. Amendment is by Architecture Council ratification only; a proposed amendment is recorded as an ADR, reviewed by the Architecture Council, and ratified or rejected. Ratification is recorded in the ADR's status and in the platform's CHANGELOG, with an explicit version increment.

Amendments that affect the module catalogue (Section 2) require additional ratification by the Product Council, because the module catalogue is jointly owned by architecture and product governance (Section 2.1). Amendments that affect edition packaging (Section 2.5) require additional ratification by product governance, because edition packaging is a product concern. Amendments that affect clinical safety (Sections 4, 7, 11) require additional ratification by clinical safety review, because clinical safety is the highest architectural principle (Principle P1).

| Amendment Scope | Required Ratification |
|---|---|
| Module catalogue (Section 2) | Architecture Council + Product Council |
| Module boundaries (Section 3) | Architecture Council |
| Module contracts (Section 4) | Architecture Council; clinical safety review for clinical modules |
| Module dependencies (Section 5) | Architecture Council |
| Module lifecycle (Section 6) | Architecture Council; Product Council for edition-affecting transitions |
| Communication patterns (Section 7) | Architecture Council |
| Module versioning (Section 8) | Architecture Council |
| Extension points (Section 9) | Architecture Council; clinical safety review for clinical workflow extensions |
| Configuration surface (Section 10) | Architecture Council; configuration governance for governance posture |
| Isolation strategy (Section 11) | Architecture Council; security review for security dimensions |
| Testing strategy (Section 12) | Architecture Council |
| Governance (Section 13) | Architecture Council |

Off-cycle amendment is permitted when a ratified ADR requires it; routine amendment occurs at the quarterly review cadence. Amendments are versioned; this document's version reflects the cumulative state of its amendments. A major version increment indicates a structural change to the document; a minor version increment indicates an additive change; a patch version increment indicates a corrective change. Version increments are recorded in the CHANGELOG with a summary of the amendment and a reference to the ratifying ADR.

This document is subordinate to `SYSTEM_ARCHITECTURE.md` and to `PRODUCT_BIBLE.md`. An amendment that conflicts with either of those documents is defective and is either corrected to honour the upstream document or is escalated to amend the upstream document. Silent contradiction is not permitted; a contradiction that is discovered is recorded as a defect and is corrected through the amendment process.
