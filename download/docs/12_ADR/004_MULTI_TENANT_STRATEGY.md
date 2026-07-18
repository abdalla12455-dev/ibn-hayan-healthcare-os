# ADR-004: Multi-Tenant Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to ratify logical multi-tenancy as the default delivery model for Ibn Hayan. The platform is delivered as a logically multi-tenant SaaS: every customer operates as a tenant within a shared platform, with logical isolation of data, configuration, and operational state. Single-tenancy is available as a deployment choice (physical isolation level) for customers with regulatory or contractual requirements, but it runs the same code paths as multi-tenancy. The platform does not maintain customer-specific code branches.
>
> **Version:** 2.0.0 · **Status:** Ratified · **ADR Number:** 004 · **Last Updated:** 2026-07-18
> **Supersedes:** ADR-004 v1.0.0 (2026-07-18) · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 4 (P3, P10), 10, 23
> **Related Product Sections:** `PRODUCT_BIBLE.md` Sections 13 (Differentiator 3), 23 (Multi-Tenant Philosophy)
> **Related ADRs:** ADR-001 (Configuration-Driven Architecture), ADR-002 (Modular Architecture)
>
> This Architectural Decision Record (ADR) documents a significant architectural decision made for the Ibn Hayan Healthcare Operating System. ADRs are immutable historical records — once a decision is superseded, a new ADR is created rather than editing this one.

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

The Ibn Hayan platform is delivered as a logically multi-tenant SaaS by default. Every customer operates as a tenant within a shared platform, with logical isolation of data, configuration, and operational state. Single-tenancy is available as a deployment choice (physical isolation level) for customers with regulatory or contractual requirements, but it runs the same code paths as multi-tenancy. The platform does not maintain customer-specific code branches, customer-specific build flags, or customer-specific deployment topologies that diverge from the shared runtime. This decision is the architectural expression of Architectural Principle P3 (One Platform, Many Organizations) and Architectural Principle P10 (Multi-Tenancy as Default), as ratified in `SYSTEM_ARCHITECTURE.md` Section 4.

Logical multi-tenancy means that tenant isolation is achieved through tenant-scoped storage, tenant-aware access controls, and tenant-context propagation through every layer of the platform. It does not depend on physical separation of infrastructure, although physical separation is available as a deployment choice when a customer's regulatory or contractual regime requires it. The relationship between logical isolation (the architectural default) and physical isolation (a deployment variation) is defined in `SYSTEM_ARCHITECTURE.md` Section 10.2 and Section 23.2. Product-level commitments that flow from this decision are stated in `PRODUCT_BIBLE.md` Section 23 (Multi-Tenant Philosophy) and Section 13.4 (Differentiator 3 — One Platform, Many Organizations).

### 1.2 Scope of the Decision

The decision applies to all platform layers, all modules, all services, all data stores, all workflows, all audit records, all integrations, and all client surfaces. It governs how tenants are isolated, how tenant context is established and propagated, how tenant lifecycle transitions are managed, and how deployment models relate to the multi-tenant architecture. The decision also governs the relationship between isolation levels and deployment models: the choice of isolation level is a deployment decision, not an architectural decision, and never produces a code branch.

| Aspect | Decision |
|---|---|
| Default isolation model | Logical multi-tenancy on shared infrastructure |
| Available isolation levels | IL1 Logical, IL2 Logical with Dedicated Compute, IL3 Physical (per `SYSTEM_ARCHITECTURE.md` Section 10.2) |
| Tenant context | Established at the edge, propagated through all layers, enforced at the data layer |
| Tenant lifecycle | Provisioned → Onboarding → Active → Expansion → Suspension → Offboarding → Decommissioned (per Section 10.4) |
| Deployment models | DM1 Multi-Tenant SaaS (default); DM2 Single-Tenant Dedicated; DM3 Hybrid; DM4 Air-Gapped; DM5 Region-Specific (per Section 23.2) |
| Code paths | Same multi-tenant code paths for all isolation levels and all deployment models; no per-model forks |
| Customer-specific code | Forbidden; variation expressed only through configuration (per ADR-001) and module composition (per ADR-002) |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Very low — multi-tenancy is foundational; conversion to single-tenancy requires re-platforming across data, configuration, and operational layers |
| Cost of wrong decision | Very high — wrong choice produces either isolation failures (catastrophic in healthcare) or unsustainable economics that collapse the edition tier structure |
| Affected layers | All layers, from experience through offline substrate, including data, integration, audit, and observability |
| ADR required | Yes — this ADR, ratified by the Architecture Council |
| Predecessor | ADR-004 v1.0.0 (superseded) |

---

## 2. Context

### 2.1 The Multi-Tenancy Problem

Ibn Hayan serves a customer spectrum from solo practitioners to multinational hospital networks and public health systems. Each customer's data, configuration, and operational state must be isolated from every other customer's, with isolation strength appropriate to the customer's regulatory, contractual, and clinical context. The architectural question is how that isolation is achieved without compromising the platform's economic model, its operational uniformity, or its decade-horizon viability. The platform cannot serve the customer spectrum described in `PRODUCT_BIBLE.md` Section 13.4 if isolation is achieved through customer-specific deployments, because the cost of provisioning, upgrading, and operating a dedicated stack per customer is disproportionate to the revenue available from small-clinic customers.

Three isolation mechanisms are available in principle: logical isolation (tenant-scoped storage and access controls on shared infrastructure), physical isolation (dedicated infrastructure per tenant), and hybrid isolation (some tenants on shared infrastructure, some on dedicated). The platform could in principle select any of these as its default, or default to per-tenant database silos with shared compute. Each selection produces a different operational posture, a different economic profile, and a different upgrade path. This ADR ratifies the selection of logical multi-tenancy as the default, with physical isolation available as a deployment choice, and rejects the alternatives on the grounds documented in Section 3.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Customer spectrum | `PRODUCT_BIBLE.md` Section 13.4 commits the platform to serving customers from T1 (Solo) through T6 (Hospital Network) on a single code base. Single-tenancy as default cannot serve this spectrum economically. |
| Edition economics | The Essentials edition and the small-clinic tier depend on infrastructure amortization across tenants. Per-tenant infrastructure cost breaks the tier structure. |
| Time-to-value | Self-service onboarding is feasible under logical multi-tenancy; per-customer provisioning is not. Onboarding speed is a product commitment, not an operational preference. |
| Upgrade uniformity | Platform-wide upgrades apply to all tenants simultaneously under logical multi-tenancy. Per-customer upgrade management produces release-gridlock within the decade horizon. |
| Decade horizon | Architectural Principle P18 (Decade-Horizon Viability) requires that the isolation model remain viable as the customer base grows by orders of magnitude. Only logical multi-tenancy survives that growth without re-platforming. |
| One-platform principle | Architectural Principle P3 (One Platform, Many Organizations) forbids customer-specific branches. Any isolation model that produces per-customer code or per-customer deployment topologies as the default violates P3. |
| Operational uniformity | A single operational runtime across all customers produces a uniform operational posture, which simplifies incident response, capacity planning, and compliance demonstration. |
| Regulatory accommodation | Logical isolation, properly implemented and audited, satisfies most regulatory regimes. Physical isolation is reserved for regimes that require it, and is delivered as a deployment variation rather than an architectural fork. |

### 2.3 Constraints

The decision is constrained by the product and architectural commitments ratified elsewhere in the documentation framework. The constraints are not negotiable within this ADR; they are inputs. First, `PRODUCT_BIBLE.md` Section 23 commits the platform to multi-tenant SaaS as a load-bearing product differentiator and to tenant isolation as a primitive rather than a feature. Second, `SYSTEM_ARCHITECTURE.md` Section 4 ratifies P3 (One Platform, Many Organizations) and P10 (Multi-Tenancy as Default) as co-equal principles governing tenant isolation strategy. Third, ADR-001 (Configuration-Driven Architecture) requires that all customer-specific variation be expressed as configuration, which presupposes a single runtime capable of evaluating that configuration; this presupposes multi-tenancy. Fourth, ADR-002 (Modular Architecture) requires that modules expose multi-tenant contracts by construction, which presupposes a multi-tenant runtime in which those modules operate. Fifth, the decade-horizon commitment (P18) requires that the isolation model remain operationally and economically viable as the tenant count grows by orders of magnitude, which constrains the choice to models that scale sub-linearly in infrastructure cost.

---

## 3. Alternatives Considered

### 3.1 Comparison Summary

Four alternatives were considered. The comparison below summarizes each against the criteria that govern the decision. Detailed treatment of each alternative follows in Sections 3.2 through 3.5.

| Criterion | A: Single-Tenancy Default | B: Per-Tenant DB Silo | C: Logical Multi-Tenancy | D: Hybrid Deployment |
|---|---|---|---|---|
| One-platform principle (P3) | Violated | Partially violated | Honoured | Honoured |
| Multi-tenancy principle (P10) | Violated | Partially honoured | Honoured | Honoured |
| Infrastructure economics | Unsustainable | Mixed | Sub-linear | Sub-linear |
| Time-to-value | Low (per-customer) | Medium | High (self-service) | High |
| Upgrade path | Per-customer | Per-database migration | Platform-wide | Platform-wide |
| Cross-tenant operations | Difficult | Difficult | Native | Native |
| Operational complexity | High (many stacks) | High (many databases) | Low | Medium |
| Decade-horizon viability | Fails | Survives at high cost | Survives | Survives |
| Verdict | Rejected | Rejected | Accepted (default) | Accepted (deployment variation) |

### 3.2 Alternative A — Single-Tenancy Default (Rejected)

Under a single-tenant default, each customer receives a dedicated deployment. The platform code is nominally the same across customers, but each customer operates a separate runtime, a separate data store, and a separate operational surface. Upgrades are per-customer, incident response is per-customer, capacity planning is per-customer, and compliance demonstration is per-customer. The model is incompatible with the customer spectrum defined in `PRODUCT_BIBLE.md` Section 13.4 because the per-customer cost of provisioning and operation exceeds the revenue available from small-clinic customers, collapsing the Essentials edition and the T1–T3 customer tiers.

The model also violates Architectural Principle P3 (One Platform, Many Organizations) and Architectural Principle P10 (Multi-Tenancy as Default), as ratified in `SYSTEM_ARCHITECTURE.md` Section 4. Although the code is shared, the runtime is not, which produces operational divergence across customers within the decade horizon. Upgrade burden accumulates: each customer must be upgraded independently, and customers who fall behind on upgrades eventually become unsupportable. Single-tenancy is available as a deployment choice (DM2 Single-Tenant Dedicated, per `SYSTEM_ARCHITECTURE.md` Section 23.4) for customers whose regulatory or contractual regime requires physical separation, but it is not the default, and it runs the same code paths as multi-tenancy.

### 3.3 Alternative B — Per-Tenant Database Silo (Rejected)

Under a silo model, each tenant has a separate database, while the application tier is shared. Tenant context is established at the edge and used to route requests to the correct database. The model offers stronger data-level isolation than logical multi-tenancy, at the cost of multiplied schema migration overhead, multiplied backup and recovery surfaces, and the loss of native cross-tenant query capability. Cross-tenant operations — platform-wide reporting, aggregate analytics, platform operations telemetry, security incident response across tenants — become cross-database operations, which are expensive, fragile, and slow.

The model is rejected as the default on operational and economic grounds. The schema migration overhead multiplied by tenant count produces an upgrade burden that approaches single-tenancy in aggregate, even though the application tier is shared. Cross-tenant operations become a first-class engineering concern rather than a query, which compromises the uniform operational posture that the platform requires. The silo model is not forbidden as a deployment variation for individual tenants with strict data-isolation requirements; it is rejected as the default. The default remains logical multi-tenancy on shared storage, with per-tenant database isolation available as a deployment choice where a customer's regulatory regime requires it and the commercial relationship supports the additional operational cost.

### 3.4 Alternative C — Logical Multi-Tenancy (Accepted — Default)

Under logical multi-tenancy, all tenants share infrastructure across application, data, and platform service tiers. Tenant data is isolated through tenant-scoped storage — every record carries a tenant identifier, every query is tenant-scoped, every access is checked against tenant context. Tenant context is established at the edge and propagated through every layer, as defined in `SYSTEM_ARCHITECTURE.md` Section 10.3. The model honours Architectural Principle P3 (One Platform, Many Organizations) and Architectural Principle P10 (Multi-Tenancy as Default), and is the architectural expression of `PRODUCT_BIBLE.md` Section 23 (Multi-Tenant Philosophy) and Section 13.4 (Differentiator 3).

The model is accepted as the default. It produces sub-linear infrastructure scaling, native cross-tenant operations, platform-wide upgrades, and a uniform operational posture. Its weakness — that isolation depends on implementation discipline rather than physical separation — is addressed through layered enforcement (Section 10.3), continuous isolation validation (Section 4.4), and the availability of physical isolation as a deployment choice for tenants whose regime requires it. Physical isolation is delivered as a deployment variation (DM2, per Section 23.4) that runs the same code paths; the choice of isolation level is a deployment decision, not an architectural decision.

The model is also the only alternative that is consistent with ADR-001 (Configuration-Driven Architecture) and ADR-002 (Modular Architecture) as ratified decisions. ADR-001 presupposes a single runtime capable of evaluating tenant-scoped configuration; ADR-002 presupposes a runtime in which modules expose multi-tenant contracts by construction. Both presuppositions are satisfied only by logical multi-tenancy on a shared runtime. The other alternatives either fragment the runtime (Alternative A) or fragment the data tier (Alternative B), and either fragmentation undermines the configuration and module contracts that the platform has already ratified.

### 3.5 Alternative D — Hybrid Deployment Variation (Accepted — Deployment Variation)

Under a hybrid model, some tenants operate on shared infrastructure (IL1 Logical) and some on dedicated infrastructure (IL3 Physical), with the same code base, the same configuration model, and the same operational runtime. A customer may operate some facilities on shared infrastructure and other facilities on dedicated infrastructure, with synchronization between the two where required. Customers may transition between isolation levels over time based on changes in regulatory regime, contractual posture, or operational requirements, without code change and without re-platforming. This model is the deployment expression of `SYSTEM_ARCHITECTURE.md` Section 23.5 (Hybrid Deployment) and Section 23.8 (Deployment and Architecture Independence).

The hybrid model is accepted as a deployment variation, not as an alternative default. The default remains logical multi-tenancy; the hybrid model is the mechanism by which customers with mixed requirements are accommodated without violating the one-platform principle. The model is feasible precisely because the architecture does not branch on isolation level: a tenant on IL1 and a tenant on IL3 run the same code, the same configuration, and the same audit model. Transition between isolation levels is a deployment operation, not an architectural change, as stated in `SYSTEM_ARCHITECTURE.md` Section 23.8.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| One code base serves all customers | The platform's code, configuration model, and operational runtime are uniform across customers and across isolation levels. No per-customer branches are maintained. |
| Sub-linear infrastructure scaling | Infrastructure cost is amortized across tenants. Adding a tenant does not require provisioning a dedicated stack; capacity is added to the shared platform as aggregate load grows. |
| Uniform operational posture | Incident response, capacity planning, observability, and compliance demonstration are uniform across customers. The platform operator reasons about one runtime, not many. |
| Upgrade path preserved for all customers | Platform-wide upgrades apply to all tenants on shared infrastructure simultaneously. Customers on dedicated infrastructure receive the same upgrade, on their own cadence, against the same code base. |
| Native cross-tenant operations | Platform-wide reporting, aggregate analytics, security incident response, and platform operations telemetry are native queries, not cross-database engineering projects. |
| Decade-horizon viability | The isolation model remains viable as the tenant count grows by orders of magnitude. No re-platforming is required to absorb growth. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Tenant isolation depends on rigorous enforcement | Cross-tenant data leakage is the most catastrophic failure mode in healthcare SaaS. Preventing it requires discipline at every layer, with no exceptions and no opt-outs. |
| Noisy-neighbour risk | A tenant that consumes excessive resources can degrade service for other tenants on shared infrastructure. The risk is structural to shared infrastructure and cannot be eliminated, only mitigated. |
| Security incidents potentially affect multiple tenants | A vulnerability in the shared runtime potentially affects all tenants on that runtime. The blast radius of a security incident is the platform, not the tenant. |
| Compliance demonstration burden | Demonstrating isolation compliance to regulators requires additional controls, documentation, and audit evidence compared to physical isolation, where separation is self-evident. |
| Migration between isolation levels is operational | While migration is a deployment operation, not an architectural change, it remains a significant operational undertaking that requires planning, data integrity verification, and audit continuity. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Physical isolation available as deployment choice | Customers with regulatory or contractual requirements for physical separation receive DM2 Single-Tenant Dedicated deployment. The choice is commercial and regulatory, not architectural. |
| Customers may transition between isolation levels | A customer may begin on shared infrastructure and transition to dedicated infrastructure (or vice versa) without code change, without configuration rework, and without data migration project. The transition is a deployment operation. |
| Tenant context is a load-bearing platform primitive | Tenant context is established at the edge and propagated through every layer. It is not an optional field; it is a primitive that every module, every service, and every query must honour. |
| Tenant lifecycle governance is a first-class concern | Provisioning, onboarding, expansion, suspension, offboarding, and decommissioning are governed by documented processes, auditable end-to-end, as defined in `SYSTEM_ARCHITECTURE.md` Section 10.4. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Isolation enforcement discipline | Layered enforcement per `SYSTEM_ARCHITECTURE.md` Section 10.3 (edge, orchestration, domain, platform services, integration, data, offline substrate). A module that does not enforce tenant isolation is defective and is not shipped. |
| Noisy-neighbour risk | Per-tenant rate limiting at the edge; per-tenant resource quotas at the service level; per-tenant workload separation for resource-intensive operations (Section 10.7). |
| Cross-tenant security incident blast radius | Defence in depth across layers; tenant-scoped encryption keys; zero-trust posture; rapid platform-wide patch distribution enabled by single code base. |
| Compliance demonstration | Per-region compliance documentation; auditable tenant isolation controls; third-party audit of isolation enforcement; continuous isolation validation as an operational practice. |
| Migration complexity | Defined migration tooling; data integrity verification; audit continuity preserved across migration; transition treated as a deployment operation per Section 23.8. |

---

## 5. Status

### 5.1 Current Status

**Ratified.** This decision is in effect and governs the multi-tenant delivery model across the Ibn Hayan platform. It is referenced by `SYSTEM_ARCHITECTURE.md` Section 4 (Principles P3 and P10), Section 10 (Multi-Tenant Architecture), and Section 23 (Deployment Models), and is realized in detail by the tenant management, security, and operational documentation. It supersedes ADR-004 v1.0.0, which described the same decision at a lower level of rigour; v2.0.0 ratifies the decision with explicit alternatives, consequences, and cross-references consistent with the ADR framework established by ADR-001 and ADR-002.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Review cadence | Annual, or upon a tenant isolation incident, or upon a regulatory regime change that affects the default isolation model for a region |
| Supersession criteria | Demonstrated structural weakness in logical isolation; regulatory regime requiring a different default; emergence of an isolation mechanism that superiorly balances economics, isolation strength, and operational simplicity |
| Predecessor | ADR-004 v1.0.0 (superseded) |

### 5.3 Ownership

The Office of the Chief Software Architect owns this decision and its evolution. The security architecture team owns the isolation controls referenced in Section 4.4 and is accountable for their continued effectiveness. The tenant management service team owns the tenant lifecycle defined in `SYSTEM_ARCHITECTURE.md` Section 10.4, including provisioning, suspension, offboarding, and decommissioning processes. The platform operations team owns the operational isolation controls (rate limiting, resource quotas, workload separation) referenced in Section 10.7. Ownership changes are recorded in the ADR amendment log; the decision itself is not amended without a new ADR.

---

## 6. Future Notes

### 6.1 Continuous Isolation Validation

Tenant isolation is not a one-time achievement; it is a continuous operational practice. As the platform evolves — new modules, new services, new integration surfaces, new data stores — the isolation enforcement surface evolves with it. Each change to the platform must be validated against the isolation contract defined in `SYSTEM_ARCHITECTURE.md` Section 10.3. Continuous isolation validation is expected to mature into an automated practice: isolation test suites executed on every change, isolation controls verified in production through synthetic cross-tenant probes, and isolation incidents escalated as P1 events regardless of whether leakage occurred. The practice is not yet defined at this level of detail; a future ADR on tenant isolation controls is anticipated.

### 6.2 Scaling Strategy Evolution

The platform's scaling strategy, as outlined in `SYSTEM_ARCHITECTURE.md` Section 21, is designed to maintain operational isolation under normal and peak load. As the tenant count grows by orders of magnitude, the strategy will require evolution: more granular resource partitioning, more sophisticated rate limiting, potentially tenant-aware workload scheduling, and tenant-specific capacity reservations for high-load tenants. The architecture is designed to absorb this evolution without re-platforming, because the multi-tenant primitive is stable. Scaling strategy evolution is operational and incremental; it does not require amendment of this ADR unless the logical multi-tenancy model itself is called into question.

### 6.3 Regional Data Residency Evolution

Regional data residency, as defined in `SYSTEM_ARCHITECTURE.md` Section 10.6 and Section 23.7, is enforced at the storage layer. As the platform's regional footprint expands, the residency model will require evolution: more regions, more residency regimes, cross-region disaster recovery arrangements, and tenant-level residency overrides for customers operating across borders. The architecture is designed to absorb this evolution without re-platforming, because residency is a deployment and storage-layer concern, not an architectural fork. Residency evolution may require amendment of the deployment model catalogue in Section 23.2; it does not require amendment of this ADR unless the logical multi-tenancy model itself is called into question.

### 6.4 Tenant Lifecycle Governance

Tenant lifecycle governance — provisioning, onboarding, expansion, suspension, offboarding, decommissioning — is defined at the stage level in `SYSTEM_ARCHITECTURE.md` Section 10.4 and `PRODUCT_BIBLE.md` Section 23.3. The detailed governance processes, including authorization, audit, data retention windows, offboarding export format, and post-decommissioning data purge, are expected to be elaborated in operational documentation and potentially in a future ADR on tenant lifecycle management. Open questions include the automation level of lifecycle transitions, the visibility of lifecycle state to the tenant versus the platform operator, and the modeling of national-scale public health system tenants — as single tenants or as multi-level tenant hierarchies.

### 6.5 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Mutual dependency — configuration is tenant-scoped; multi-tenancy is the runtime in which configuration is evaluated. |
| ADR-002 (Modular Architecture) | Mutual dependency — modules expose multi-tenant contracts by construction; multi-tenancy is the runtime in which modules operate. |
| ADR-003 (Local-First Strategy) | Constrained by this ADR — offline data is tenant-scoped; offline substrate is tenant-isolated per Section 10.3. |
| ADR-006 (Database Strategy) | Constrained by this ADR — data store organization is tenant-aware; tenant scoping is enforced at the data layer. |
| Future ADR: Tenant Isolation Controls | Will define the specific controls that enforce tenant isolation at each layer, as anticipated in Section 4.4. |
| Future ADR: Tenant Lifecycle Management | Will define the detailed governance processes anticipated in Section 6.4. |
