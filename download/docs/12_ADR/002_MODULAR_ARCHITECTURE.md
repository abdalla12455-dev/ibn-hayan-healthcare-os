# ADR-002: Modular Architecture
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to decompose the Ibn Hayan platform into autonomous modules with explicit contracts, where modules correspond to bounded contexts, own their authoritative state, depend on each other only through published contracts, and can be added, removed, or replaced without re-platforming.
>
> **Status:** Accepted · **ADR Number:** 002 · **Last Updated:** 2026-07-18
> **Supersedes:** None · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 3, 4 (P2, P6), 7, 9, 13
>
> This Architectural Decision Record (ADR) documents a significant architectural
> decision made for the Ibn Hayan Healthcare Operating System. ADRs are
> immutable historical records — once a decision is superseded, a new ADR
> is created rather than editing this one.

---

## Table of Contents

1. Decision
2. Context
3. Alternatives
4. Consequences
5. Status
6. Future Notes

---

## 1. Decision

### 1.1 Decision Statement

Ibn Hayan adopts a modular architecture in which the platform is decomposed into autonomous modules, each realizing one bounded context, owning its authoritative state, and exposing a versioned contract surface consisting of commands, queries, domain events, and a configuration schema. Modules depend on each other only through published contracts; internal implementation is private. Tenants compose their platform by enabling modules within edition constraints.

### 1.2 Scope of the Decision

The decision applies to the structural decomposition of the platform across all bounded contexts (SYSTEM_ARCHITECTURE.md Section 7.2) and to the rules governing module interaction, dependency, lifecycle, and composition.

| Aspect | Decision |
|---|---|
| Decomposition unit | Module, corresponding one-to-one (typically) with a bounded context |
| Module boundary | Published contract surface (commands, queries, events, configuration schema) |
| Module internals | Private; not relied upon by other modules |
| Dependency direction | Downward and inward only; no upward dependencies, no lateral dependencies except through contracts and events |
| Module composition | Tenant-driven, within edition constraints, satisfying dependency requirements |
| Module lifecycle | Proposed → Implemented → Generally Available → Optional → Deprecated → Retired |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — once modules are decomposed and contracts published, merging them back is expensive |
| Cost of Wrong Decision | High — wrong decomposition produces either a distributed monolith (coupled modules) or an over-fragmented platform (excessive integration overhead) |
| Affected Layers | Domain layer, platform services layer, integration layer |
| ADR Required | Yes — this ADR |

---

## 2. Context

### 2.1 The Decomposition Problem

A healthcare platform encompasses many domains: patient management, clinical documentation, orders and results, scheduling, billing, inventory, pharmacy, workforce, CRM, accounting, HR, documents, notifications, plus cross-cutting platform services. The architectural question is how these domains are structured within the platform — as a single monolithic codebase, as a set of autonomous modules, as independently deployable microservices, or as some hybrid.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Domain complexity | Healthcare is a complex domain with deep terminology and rich behavior. A single model cannot serve all domains without becoming a compromise. |
| Independent evolution | Modules must evolve at different rates. Clinical documentation may change frequently; accounting may change rarely. A monolith forces coordinated evolution. |
| Team autonomy | Teams must own modules end-to-end. A monolith forces coordination across teams, producing bottlenecks. |
| Tenant composition | Tenants must be able to enable and disable modules. A monolith cannot be partially enabled. |
| Decade horizon | The platform must absorb module additions, removals, and replacements over a decade. A monolith cannot absorb such change without rewrites. |
| Configuration-driven architecture | ADR-001 requires modules to expose configuration schemas; this requires modules to be identifiable units. |
| Multi-tenancy | ADR-004 requires that modules be multi-tenant by default; this requires modules to be the unit of multi-tenant construction. |

### 2.3 Constraints

The decision is constrained by:

- The Product Bible's commitment to 17 product modules serving 14 user roles and 30 clinic types.
- The Product Bible's commitment to composition as a differentiator (one platform, many configurations).
- The architectural principle of bounded contexts (P2) and loose coupling with high cohesion (P6).
- The decade horizon, which requires that modules be replaceable without re-platforming.

---

## 3. Alternatives

### 3.1 Alternative A: Monolithic Architecture

In a monolithic architecture, the platform is a single codebase with all domains in one deployable unit. Domains are organized as packages or namespaces but share a single process, a single data store, and a single deployment lifecycle.

| Criterion | Monolith | Verdict |
|---|---|---|
| Development simplicity | High — no inter-module contracts to design | Favors |
| Performance | High — no inter-process communication | Favors |
| Independent evolution | Low — all domains evolve together | Rejects |
| Team autonomy | Low — coordinated releases required | Rejects |
| Tenant composition | Low — monolith cannot be partially enabled | Rejects |
| Decade horizon | Fails — monolith cannot absorb domain replacement | Rejects |
| Multi-tenancy | Compatible but inflexible | Mixed |

**Verdict:** Rejected. Monolithic architecture cannot serve the customer spectrum, cannot absorb decade-scale change, and cannot support tenant composition.

### 3.2 Alternative B: Microservices Architecture

In a microservices architecture, each bounded context is an independently deployable service with its own data store, communicating over a network through APIs.

| Criterion | Microservices | Verdict |
|---|---|---|
| Independent evolution | High — services evolve and deploy independently | Favors |
| Team autonomy | High — services are independently owned | Favors |
| Tenant composition | Medium — services can be enabled/disabled but with operational overhead | Mixed |
| Performance | Low — network communication adds latency to every inter-module call | Rejects |
| Operational complexity | High — service discovery, distributed tracing, network failure handling | Rejects |
| Multi-tenancy | Compatible | Favors |
| Decade horizon | Survives but at high operational cost | Mixed |
| Offline-first | Hostile — offline operation with many services is infeasible | Rejects |

**Verdict:** Rejected as the default. Microservices impose operational and performance costs that are not justified for most modules, and they are hostile to offline-first operation. The architecture reserves the right to extract a module into a microservice where justified (e.g., extreme scale, distinct deployment cadence, regulatory isolation), but this is an exception, not the default.

### 3.3 Alternative C: Modular Monolith

In a modular monolith, modules are autonomous units with explicit contracts and private internals, but they run in a single process and may share a data store. Modules communicate through in-process contract invocation, not network calls.

| Criterion | Modular Monolith | Verdict |
|---|---|---|
| Development simplicity | Medium — contracts must be designed but no network overhead | Favors |
| Performance | High — in-process calls are fast | Favors |
| Independent evolution | Medium — modules can evolve internally but must deploy together | Mixed |
| Team autonomy | Medium — modules are independently owned but co-deployed | Mixed |
| Tenant composition | High — modules can be enabled/disabled | Favors |
| Decade horizon | Survives — modules can be extracted to services if needed | Favors |
| Multi-tenancy | Compatible | Favors |
| Offline-first | Compatible — single process is easier to operate offline | Favors |

**Verdict:** Accepted. The modular monolith is the default module architecture. Modules are autonomous units with explicit contracts; they run in a shared process; they can be extracted to services when justified.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Domain coherence preserved | Each module owns a coherent domain with its own ubiquitous language and model. |
| Independent internal evolution | Modules can be refactored internally without coordinated platform-wide change. |
| Tenant composition enabled | Tenants enable modules within edition constraints; the platform adapts to customer size and specialty. |
| Decade horizon preserved | Modules can be added, deprecated, retired, or extracted to services over the platform's lifetime. |
| Contract-based testing | Modules are tested at their contract boundary, preserving autonomy. |
| Clear ownership | Each module has a clear owner (team), supporting accountability. |
| Configuration surface per module | Each module exposes its own configuration schema, supporting ADR-001. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Contract design overhead | Contracts must be designed, versioned, and evolved under backward-compatibility rules. |
| Distributed state | State that spans modules is distributed and requires event-driven coordination (SYSTEM_ARCHITECTURE.md Section 18). |
| Deployment coupling | Modules deploy together; a change to one module requires a platform release. |
| Cross-module transactions | Transactions that span modules require sagas or eventual consistency, with explicit consistency contracts. |
| Contract testing discipline | Consumer-side and provider-side contract tests are required; without them, contracts drift. |
| Module boundary mistakes | Wrong boundaries are expensive to correct once customers depend on the contracts. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Module registry as platform service | A module registry tracks module lifecycle state, dependencies, and composition rules. |
| Shared kernel discipline | A small shared kernel (tenant identifier, audit context, locale) is used across modules with coordinated review. |
| In-process communication as default | Inter-module communication is in-process by default; network communication is reserved for extracted services. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Contract design overhead | Architectural review of new contracts; contract templates; documentation of contract patterns. |
| Distributed state | Event-driven architecture (SYSTEM_ARCHITECTURE.md Section 18); explicit consistency contracts per interaction. |
| Deployment coupling | Feature flags (ADR-001, SYSTEM_ARCHITECTURE.md Section 14) decouple deployment from release; staged rollouts. |
| Cross-module transactions | Saga pattern for long-running transactions; idempotent operations; declared consistency contracts. |
| Contract testing | Contract test suites as part of module definition; consumer-driven contract tests. |
| Boundary mistakes | Bounded context mapping (SYSTEM_ARCHITECTURE.md Section 7.4) before contract publication; ADR ratification for new modules. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This decision is in effect and governs the structural decomposition of the platform. It is referenced by SYSTEM_ARCHITECTURE.md Sections 3, 4 (P2, P6), 7, 9, and 13, and is realized in detail by MODULE_ARCHITECTURE.md.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Review cadence | Annual, or upon a proposal to extract a module to a microservice |
| Supersession criteria | Demonstrated infeasibility of the modular monolith model, or a structural change to module decomposition |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. Module teams own their respective modules. The architecture organization owns the module registry and the cross-module contract review process.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Module extraction criteria | Under what conditions is a module extracted from the modular monolith to an independently deployable service? |
| Shared data store vs per-module stores | Should modules share a data store (with logical separation) or have physically separate stores? |
| Module team ownership model | How are modules assigned to teams, and how are ownership transfers handled? |
| Module deprecation timelines | What is the standard deprecation window for retiring a module? |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if:

- A module demonstrates that the modular monolith model cannot meet its scalability, isolation, or deployment cadence requirements, justifying extraction to a microservice.
- The module decomposition proves to be wrong at scale, requiring a structural re-decomposition.
- A new architectural pattern emerges that superiorly balances autonomy, performance, and operational simplicity.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Depends on this ADR — configuration schemas are exposed per module. |
| ADR-004 (Multi-Tenant Strategy) | Depends on this ADR — modules are the unit of multi-tenant construction. |
| ADR-006 (Database Strategy) | Constrained by this ADR — data store organization follows module boundaries. |
| Future ADR: Module Extraction Criteria | Will define when and how a module is extracted to a microservice. |
