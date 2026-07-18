# ADR-002: Modular Architecture
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to ratify the modular monolith as the default deployment model for the Ibn Hayan platform. Modules communicate through in-process contracts (commands, queries, events) within a single deployment unit. Modules may be extracted to separately deployable services when justified by operational requirements — independent scaling, independent deployment cadence, regulatory isolation — but extraction is a deployment choice, not an architectural commitment. Pure monolithic and pure microservices deployment models are rejected as defaults.
>
> **Status:** Ratified · **ADR Number:** 002 · **Version:** 2.0.0 · **Last Updated:** 2026-07-18
> **Supersedes:** ADR-002 v1.0.0 (initial modular decomposition framing) · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 4 (Principles P4, P8, P16), 7 (Domain-Driven Architecture), 9 (Modular Architecture), 13 (Module Architecture)
> **Related Product Reference:** `PRODUCT_BIBLE.md` Section 6 (Design Principle D-9, Composable, Not Monolithic)
> **Related ADRs:** ADR-001 (Configuration-Driven Architecture), ADR-004 (Multi-Tenant Strategy), ADR-006 (Database Strategy)
>
> This Architectural Decision Record (ADR) documents a significant architectural
> decision made for the Ibn Hayan Healthcare Operating System. ADRs are
> immutable historical records — once a decision is superseded, a new ADR
> is created rather than editing this one.

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

### 1.1 Decision Statement

The Ibn Hayan platform is deployed as a modular monolith by default. Modules are autonomous units aligned to bounded contexts, each exposing an explicit contract surface — commands, queries, domain events, and a configuration schema — and keeping its internal implementation private. Modules communicate through in-process contracts within a single deployment unit; direct cross-module data access is forbidden and is rejected at code review. A module may be extracted to a separately deployable service when an Architecture Decision Record justifies the extraction on operational grounds such as independent scaling, independent deployment cadence, or regulatory isolation; such extraction is a deployment choice, not an architectural commitment, and the extracted module continues to honor the same contract surface. The default model preserves in-process performance, preserves transactional consistency for clinical workflows, and reduces the operational footprint while preserving the option to extract modules later when justified. Pure monolithic deployment without module boundaries and pure microservices deployment in which every module is a separate service are both rejected as default models.

### 1.2 Scope of the Decision

The decision applies to the default deployment topology of the Ibn Hayan platform and to the rules that govern module interaction within that topology. It binds every module catalogued in `SYSTEM_ARCHITECTURE.md` Section 9.3 and every bounded context enumerated in Section 7.2. The decision does not prescribe a specific implementation technology, a specific process boundary, or a specific data store topology; those are downstream concerns owned by ADR-006 (Database Strategy) and by module-level documentation. The decision also does not foreclose extraction; it establishes that extraction is permitted only through ADR ratification against the criteria documented in §6.1.

| Aspect | Decision |
|---|---|
| Default deployment unit | Single deployment unit containing all Generally Available modules |
| Module boundary | Explicit contract surface; private internals |
| Module communication | In-process commands, queries, and events by default |
| Cross-module data access | Forbidden; rejected at code review and at build time |
| Extraction to a service | Permitted only through ADR ratification against §6.1 criteria |
| Module lifecycle | As defined in `SYSTEM_ARCHITECTURE.md` Section 9.6 |
| Contract surface | Commands, queries, events, configuration schemas per Section 13.3 |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Medium — extraction is reversible at engineering cost; collapse of an extracted service back into the monolith is also reversible |
| Cost of Wrong Decision | High — pure microservices by default produces operational complexity disproportionate to scale; pure monolith by default produces coupling that constrains evolution over the decade horizon |
| Affected Layers | Platform services layer, domain layer, integration layer, deployment topology |
| ADR Required | Yes — this ADR; each module extraction additionally requires its own ADR |

---

## 2. Context

### 2.1 The Deployment Topology Problem

A healthcare platform of Ibn Hayan's scope — nineteen product modules, fourteen user roles, thirty clinic types, four editions, and multiple regulatory regimes — must be decomposed into units that can evolve independently while remaining operable as a whole. The architectural question is how those units are deployed and how they communicate. Three structural axes intersect: autonomy, the ability of a unit to evolve on its own cadence; performance, the cost of inter-unit communication; and operational complexity, the number of moving parts that must be deployed, observed, and secured. No single topology maximizes all three; the choice is a trade-off, and the trade-off must be made explicitly with the rejected alternatives documented. The decade horizon (Principle P18) compounds the difficulty: a choice optimal today may be unsupportable in five years, and a future-proof choice may impose unacceptable cost today.

### 2.2 Forces Driving the Decision

The decision is driven by the interaction of several architectural forces, each rooted in the architectural principles defined in `SYSTEM_ARCHITECTURE.md` Section 4 or in the product commitments defined in `PRODUCT_BIBLE.md` Section 6. No single force is decisive; the decision is the resolution of the forces in aggregate.

| Force | Description |
|---|---|
| Domain complexity | Healthcare domains are deep and terminologically rich; a single shared model becomes a compromise. Bounded contexts (Section 7) require explicit boundaries, which require module boundaries. |
| Decade-horizon viability | Principle P18 requires choices that remain viable across technology shifts. The default topology must not foreclose future extraction or future recombination. |
| Operational simplicity | Principle P14 (Simplicity Over Complexity) rejects operational complexity that is not justified by a documented requirement. A multi-service default imposes operational cost without proven benefit at current scale. |
| Transactional consistency | Principle P5 (Consistency for Clinical Data) is easier to guarantee within a single deployment unit. Distributed transactions across services are expensive, fragile, and frequently inappropriate for clinical workflows. |
| Tenant composition | Product Bible Design Principle D-9 requires customers to compose the platform by enabling modules. The deployment topology must support enablement and disablement without forking the platform. |
| Offline-first default | Principle P11 (Offline-First) is hostile to fine-grained service decomposition at the edge; a single deployment unit is easier to operate offline. |
| Configuration-driven architecture | ADR-001 requires per-module configuration schemas; this presupposes modules as identifiable, contract-bearing units, which the modular monolith provides. |

### 2.3 Constraints and Precedents

The decision is constrained by architectural principles P4 (Loose Coupling, High Cohesion), P8 (Bounded Contexts Are Stable), and P16 (Composable, Not Monolithic), all defined in `SYSTEM_ARCHITECTURE.md` Section 4. P4 forbids coupling through direct data access and forbids circular dependencies; this constraint is independent of whether modules are deployed in one unit or in many, and it is the structural property that distinguishes the modular monolith from a pure monolith. P8 establishes that bounded context boundaries are stable and outlast implementations; this stability is what makes the modular monolith viable, because the contracts that mediate between contexts do not need to be renegotiated as implementations evolve. P16 explicitly endorses composition over both monolithic and marketplace models. Product Bible Design Principle D-9 (Section 6.10) reinforces the same stance at the product level. ADR-001 (Configuration-Driven Architecture) is the companion decision: configuration drives within-module variation, and modular composition drives between-module variation; neither is viable without the other.

---

## 3. Alternatives Considered

### 3.1 Comparative Evaluation

The four alternatives were evaluated against seven criteria that span autonomy, performance, operational complexity, transactional consistency, and alignment with the architectural principles. The criteria are not equally weighted: alignment with P4, P8, and P16 is structural and cannot be compensated by performance or operational convenience. Detailed treatment of each alternative follows in §3.2 through §3.5.

| Criterion | Pure Monolith | Pure Microservices | Modular Monolith | Hybrid |
|---|---|---|---|---|
| Module boundary enforcement | Low | High | Medium (discipline-enforced) | Mixed |
| Inter-module performance | High | Low (network) | High (in-process) | Mixed |
| Operational complexity | Low | High | Low | High |
| Transactional consistency | Easy | Hard | Easy | Mixed |
| Independent deployment | None | Full | None (whole-platform release) | Partial |
| Extraction option preserved | No (already collapsed) | Already extracted | Yes | Yes |
| Alignment with P4, P8, P16 | Rejects P16 | Favors P16 | Favors P16 | Favors P16 |

### 3.2 Alternative A: Pure Monolith — REJECTED

In a pure monolith, the platform is a single codebase with all domains in one deployable unit and no enforced module boundaries. Domains are organized as packages or namespaces; cross-domain access is permitted by convention but is not enforced at build time or at runtime. A pure monolith optimizes for short-term development velocity and minimal operational footprint, but it does so by foregoing the structural commitments that the architectural principles require. Over the decade horizon, the absence of enforced boundaries leads to coupling accumulation, and coupling accumulation leads to a codebase in which no change is locally bounded.

| Criterion | Pure Monolith | Verdict |
|---|---|---|
| Boundary enforcement | Insufficient; coupling accumulates | Rejects |
| Performance | Excellent (in-process) | Favors |
| Tenant composition | Inflexible; cannot partially enable | Rejects |
| Decade-horizon viability | Fails; cannot absorb module replacement | Rejects |
| Alignment with P16 | Explicitly rejected by the principle | Rejects |

**Verdict:** Rejected. A pure monolith does not enforce the boundaries that P4, P8, and P16 require, and the absence of enforced boundaries leads to coupling that constrains evolution over the decade horizon. The performance advantage is real but is also available in the modular monolith, which preserves in-process communication without sacrificing boundary discipline.

### 3.3 Alternative B: Pure Microservices — REJECTED

In a pure microservices model, every bounded context is an independently deployable service with its own data store, communicating over a network through APIs. This model maximizes independent deployment and team autonomy at the cost of substantial operational complexity, distributed-systems overhead, and harder transactional consistency. Every cross-module workflow becomes a distributed workflow, and every cross-module transaction becomes a saga or an eventually consistent exchange.

| Criterion | Pure Microservices | Verdict |
|---|---|---|
| Independent deployment | Full | Favors |
| Operational complexity | Disproportionate to current scale | Rejects |
| Transactional consistency | Hard; sagas required for cross-service workflows | Rejects |
| Performance | Network latency on every inter-module call | Rejects |
| Offline-first compatibility | Hostile; many services are infeasible at the edge | Rejects |
| Decade-horizon viability | Survives but at high operational cost | Mixed |

**Verdict:** Rejected as the default. Pure microservices impose operational and performance costs disproportionate to the platform's current scale and conflict with the offline-first default established by Principle P11. The architecture reserves the right to extract individual modules to services when operational requirements justify extraction, but extraction is a per-module decision documented in its own ADR, not a default platform stance.

### 3.4 Alternative C: Modular Monolith — ACCEPTED

In a modular monolith, modules are autonomous units with explicit contract surfaces and private internals, deployed together in a single process. Modules communicate through in-process contract invocation — commands, queries, and events — rather than through network calls. The boundary discipline that the pure monolith lacks is supplied through contracts, code review, build-time dependency validation, and mandatory contract testing. The same contract surface survives extraction: if a module is later promoted to a service, the in-process transport is replaced with a network transport without renegotiating the contract.

| Criterion | Modular Monolith | Verdict |
|---|---|---|
| Boundary enforcement | Enforced through contracts and review | Favors |
| Performance | Excellent (in-process) | Favors |
| Operational complexity | Low | Favors |
| Transactional consistency | Easy within the deployment unit | Favors |
| Tenant composition | Supported; modules enable and disable per tenant | Favors |
| Extraction option preserved | Yes; contracts survive extraction | Favors |
| Alignment with P4, P8, P16 | All three favored | Favors |

**Verdict:** Accepted. The modular monolith is the default deployment model. It enforces module boundaries through contracts, preserves in-process performance, simplifies operations, preserves transactional consistency for clinical workflows, and retains the option to extract any module to a service when an ADR justifies the extraction. This is the structural expression of Principle P16 in `SYSTEM_ARCHITECTURE.md` Section 4.16 and of Design Principle D-9 in `PRODUCT_BIBLE.md` Section 6.10.

### 3.5 Alternative D: Hybrid (Mixed Topology) — DEFERRED

In a hybrid model, some modules remain deployed within the monolith and others are deployed as separate services, with the topology determined per module against documented criteria. This alternative is not rejected; it is the anticipated evolution path once one or more modules justify extraction on operational grounds. The hybrid model is not selected as the default because no module currently meets the extraction criteria documented in §6.1, and selecting hybrid as the default would commit the platform to a topology it has not yet justified.

| Criterion | Hybrid | Verdict |
|---|---|---|
| Operational fit | Justified only when extraction criteria are met | Deferred |
| Complexity | Higher than monolith, lower than full microservices | Mixed |
| Extraction option | Preserved | Favors |
| Default suitability | Premature as a default | Rejects as default |

**Verdict:** Deferred. The hybrid model is available as an evolution path. A module is extracted to a service only through ADR ratification against the criteria in §6.1, and the resulting topology is documented as a deviation from the default, not as a replacement of it. The modular monolith is designed to permit extraction, not to prevent it.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| In-process communication performance | Inter-module calls do not incur network latency; clinical workflows that span modules remain responsive. |
| Simpler operational footprint | One deployment unit, one observability surface, one security boundary to maintain at the platform level. |
| Transactional consistency preserved | Cross-module workflows that require consistency can use local transactions; distributed sagas are reserved for the cases that genuinely require them. |
| Extraction option preserved | Because modules communicate through contracts, extraction to a service replaces the in-process transport with a network transport without renegotiating the contract. |
| Boundary discipline enforced | Contracts, build-time dependency validation, and contract testing make boundary violations visible at build time and at review time. |
| Composition preserved | Tenants enable and disable modules within edition constraints (D-9); the deployment unit does not constrain composition. |
| Configuration surface intact | Per-module configuration schemas required by ADR-001 are unaffected by the deployment topology. |

### 4.2 Negative Consequences

The negative consequences below are the structural costs accepted in exchange for the positive consequences in §4.1. The mitigations in §4.4 reduce their impact but do not remove them.

| Consequence | Description |
|---|---|
| Boundary enforcement is discipline-based | No runtime mechanism automatically prevents a module from reaching into another module's internals; enforcement relies on contracts, code review, build-time validation, and contract testing. Without these, the modular monolith degrades toward a pure monolith. |
| Whole-platform redeployment | A change to any module requires a platform release. Feature flags (ADR-001, `SYSTEM_ARCHITECTURE.md` Section 14) decouple deployment from release but do not eliminate the redeployment cost. |
| Single failure domain | A fault in one module can affect the entire deployment unit. Failure isolation (Section 13.8) mitigates but does not eliminate this. |
| Scaling is whole-unit | Independent scaling of a single module is not available within the modular monolith; modules that require independent scaling must be extracted through an ADR. |
| Contract evolution discipline | Contracts must evolve under backward-compatibility rules; consumers must be updated before producers can break a contract, and this discipline must be enforced across all module teams. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Module registry as platform service | A registry tracks module lifecycle state, dependencies, contracts, and composition rules. The registry exists regardless of topology but is especially load-bearing in the modular monolith because composition and lifecycle are managed in-process. |
| Shared kernel discipline | A small shared kernel (tenant identifier, audit context, locale, principal) is used across modules with coordinated review. The shared kernel is the minimal coupling the modular monolith accepts. |
| Extraction as documented evolution path | Extraction to microservices is neither an exception nor a defect; it is a documented evolution path with explicit criteria. The modular monolith is designed to permit extraction, not to prevent it. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Discipline-based enforcement | Build-time dependency graph validation (Section 9.4); contract test suites as a mandatory module deliverable (Section 13.9); architectural review of new and changed contracts. |
| Whole-platform redeployment | Feature flags decouple deployment from release; staged rollouts; canary deployment by tenant cohort. |
| Single failure domain | Bulkheading, circuit breaking, and graceful degradation per Section 13.8; module-level health checks; module-level resource quotas. |
| Whole-unit scaling | Monitor per-module load; trigger an extraction ADR when a module consistently requires independent scaling (§6.1). |
| Contract evolution | Strict backward-compatibility rules; documented deprecation windows; consumer-driven contract tests run in the producer's pipeline. |

---

## 5. Status

### 5.1 Current Status

**Ratified.** This decision is in effect and governs the default deployment topology of the Ibn Hayan platform. It is referenced by `SYSTEM_ARCHITECTURE.md` Sections 4 (Principles P4, P8, P16), 7 (Domain-Driven Architecture), 9 (Modular Architecture, especially §9.2), and 13 (Module Architecture). It is realized in detail by `MODULE_ARCHITECTURE.md` and is binding on every module catalogued in `SYSTEM_ARCHITECTURE.md` Section 9.3. Deviation from this decision — specifically, the extraction of a module to a separately deployable service — is permitted only through a module-specific ADR that satisfies the extraction criteria in §6.1.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Version | 2.0.0 |
| Supersedes | ADR-002 v1.0.0 |
| Review cadence | Annual, or upon a proposal to extract a module to a service |
| Supersession criteria | Demonstrated infeasibility of the modular monolith model at platform scale, or a structural change to module decomposition ratified by the Architecture Council |

### 5.3 Ownership

The Office of the Chief Software Architect owns this decision. Module teams own the contracts and internals of their respective modules. The Architecture Council owns the cross-module contract review process and is the ratifying body for any module extraction ADR. The Site Reliability Engineering organization owns the deployment topology in production but does not own the architectural commitment; operational concerns that conflict with this decision are escalated to the Architecture Council rather than resolved unilaterally.

---

## 6. Future Notes

### 6.1 Module Extraction Criteria

A module is a candidate for extraction from the modular monolith to a separately deployable service when one or more of the following criteria are met and documented in a module-specific ADR. The criteria are intentionally high-bar; the default presumption is that a module remains in the monolith unless extraction is justified by operational evidence. A module that meets a criterion transiently — for example, a temporary load spike — is not a candidate; the criterion must be sustained and structural.

| Criterion | Description |
|---|---|
| Independent scaling | The module's load profile diverges materially from the platform average and is not manageable through whole-unit scaling. |
| Independent deployment cadence | The module requires a release cadence materially different from the platform cadence, and the divergence is justified by operational requirement. |
| Regulatory isolation | The module is subject to a regulatory regime that requires isolation (separate data store, separate network zone, separate audit boundary) that cannot be satisfied within the shared deployment unit. |
| Failure isolation requirement | The module's failure modes are sufficiently severe that co-location with the rest of the platform is unacceptable, and bulkheading within the monolith is insufficient. |
| Independent security boundary | The module requires a security posture — separate credential scope, separate network exposure, separate cryptographic boundary — that the shared deployment unit cannot provide. |

Extraction is never undertaken casually. An extraction ADR must identify the criterion met, document the operational evidence, specify the contract-preserving extraction plan, and define the post-extraction observability and rollback strategy.

### 6.2 Extraction Candidates and Evolution Triggers

Extraction candidates are identified in module-level documentation, not in this ADR. The module documentation records, per module, whether the module is a current extraction candidate, which criterion would justify extraction, and what operational evidence would trigger an extraction ADR. This ADR will be amended or superseded if the modular monolith model proves infeasible at platform scale, if a structural change to module decomposition is ratified, or if a superior topology emerges that better balances autonomy, performance, and operational simplicity within the constraints of P4, P8, P11, P14, P16, and P18. A change to the default topology is itself an ADR-level decision and is not undertaken as a routine operational choice.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Companion decision. Configuration drives within-module variation; this ADR defines the between-module topology that exposes per-module configuration schemas. |
| ADR-004 (Multi-Tenant Strategy) | Depends on this ADR. Modules are the unit of multi-tenant construction; the modular monolith supports multi-tenancy within a single deployment unit. |
| ADR-006 (Database Strategy) | Constrained by this ADR. Data store organization follows module boundaries; whether modules share a physical store or have separate stores is a deployment concern within ADR-006's scope. |
| Future ADR: Module Extraction Criteria | Will define the standard extraction plan, the contract-preserving transport replacement, and the post-extraction observability requirements when a module is promoted to a service. |

---

*End of ADR-002.*
