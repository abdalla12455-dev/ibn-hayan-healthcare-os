# ADR-006: Database Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to ratify a segmented data architecture for the Ibn Hayan platform in which durable state is partitioned by data class across five store types — transactional, analytical, cache, object, and audit. Each bounded context owns its authoritative state and exposes it through declared query contracts; direct data access across context boundaries is forbidden. Store technologies are selected per category as implementation decisions, not committed as architectural identity.
>
> **Status:** Ratified · **ADR Number:** 006 · **Version:** 2.0.0 · **Last Updated:** 2026-07-18
> **Supersedes:** ADR-006 v1.0.0 (2026-07-18) · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 4 (P5, P13), 6.8, 17, 27
> **Related Product Bible Sections:** `PRODUCT_BIBLE.md` Sections 22, 27
> **Related ADRs:** ADR-002 (Modular Architecture), ADR-004 (Multi-Tenant Strategy)
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

Ibn Hayan ratifies a segmented data architecture in which durable platform state is partitioned by data class across five store types: a transactional store for clinical, operational, and financial data with strong consistency; an analytical store for aggregated and historical data used by reporting; a cache store for ephemeral data used to accelerate hot paths; an object store for documents, images, and exports; and an audit store for the immutable audit trail. Each bounded context owns its authoritative state and exposes it to other contexts exclusively through declared query contracts. Direct data access across context boundaries — whether through shared tables, cross-context joins, or back-channel reads — is forbidden and is treated as an architectural defect.

The segmentation is a direct consequence of Principle P5 (Consistency Over Availability for Clinical Data) and Principle P13 (Auditability as Primitive), as defined in `SYSTEM_ARCHITECTURE.md` Section 4. These principles impose divergent requirements on different data classes: clinical and financial state demands strong consistency and low-latency writes; analytical workloads demand query optimization isolated from transactional traffic; audit state demands immutability and tamper-evidence. No single store can serve all three without compromising at least one. The segmentation is the architectural answer to that divergence.

Store technologies are selected per category as implementation decisions, governed by selection criteria documented in the database documentation. The architecture does not commit to a specific database technology for any store type; technology choices may evolve across the decade horizon without constituting architectural change, provided the store continues to satisfy its category's contract. The contract per category — consistency model, durability, isolation, query surface — is the architectural commitment; the technology that satisfies it is not.

### 1.2 Scope of the Decision

The decision applies to the Data Layer defined in `SYSTEM_ARCHITECTURE.md` Section 6.8 and to the manner in which all upper layers interact with durable state. It governs store segmentation, context ownership, contract exposure, consistency models per data class, and the boundaries within which store technology may be selected. It does not govern tenant isolation topology (handled by ADR-004), bounded context decomposition (handled by ADR-002), or the local-first substrate (handled by ADR-003), although it constrains all three by defining where authoritative state lives and how it may be accessed.

| Aspect | Decision |
|---|---|
| Store segmentation | Five store types, partitioned by data class |
| Context ownership | Each bounded context owns its authoritative state in the transactional store |
| Cross-context access | Query contracts only; shared tables and direct reads are forbidden |
| Consistency model | Strong within a context's transactional boundary; eventual across contexts via declared contracts |
| Audit store | Append-only, immutable, tamper-evident; dedicated store, not a transactional table |
| Store technology | Selected per category as implementation decision; not architectural identity |
| Schema evolution | Backward-compatible by default; breaking changes follow the platform deprecation policy |

### 1.3 Store Type Catalogue

The five store types, the data classes they serve, their architectural characteristics, and the principles that govern them are summarized below. The characteristics in this table are architectural commitments; specific technology selection is deferred to per-category criteria documented in the database documentation and is not named in this ADR.

| Store Type | Data Class Served | Primary Characteristics | Governing Principles |
|---|---|---|---|
| Transactional store | Clinical, operational, financial state | Strong consistency, low-latency reads and writes, ACID within aggregates | P1, P5, P10 |
| Analytical store | Aggregated, historical, reporting data | Query-optimized, eventually consistent via pipeline, isolated from transactional traffic | P5, P15 |
| Cache store | Ephemeral hot-path data | Low-latency reads, replaceable, best-effort invalidation | P14 |
| Object store | Documents, images, exports, large binaries | Immutable or append-only blobs, metadata-indexed, durable | P12 |
| Audit store | Audit trail of consequential actions | Immutable, append-only, tamper-evident, investigation-query-optimized | P1, P13 |

### 1.4 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Very low — data architecture is foundational; migrating across segmentation models is expensive and risky |
| Cost of wrong decision | Very high — wrong choice produces data integrity failures, audit gaps, or analytical starvation |
| Affected layers | Data Layer primarily; constrains the Domain, Platform Services, and Integration Layers |
| Architectural commitment | Store segmentation and context ownership; not store technology selection |
| ADR required | Yes — this ADR |

---

## 2. Context

### 2.1 The Data Architecture Problem

A healthcare platform's data architecture must serve multiple, often incompatible, requirements simultaneously. Clinical and financial operations demand transactional integrity: a medication administration, a charge capture, and an inventory decrement must each be atomic, consistent, and durably recorded. Reporting and analytics demand query optimization over large historical datasets, workloads that compete with transactional traffic if served from the same store. Hot paths demand low-latency reads that transactional stores cannot always provide under load. Documents, images, and exports demand large-object storage that row-oriented stores handle poorly. Audit demands immutability and tamper-evidence, properties that mutable transactional tables cannot guarantee by construction.

The architectural question is how these requirements are served: by a single store that compromises on at least one class; by a set of specialized stores partitioned by data class with each class served by an appropriate store type; or by per-context store selection in which each bounded context chooses its own store technology. This ADR selects the second option and ratifies its segmentation as the platform's binding data architecture.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Divergent data class requirements | Transactional, analytical, cache, object, and audit data classes have incompatible optimization, consistency, and integrity requirements |
| Bounded context ownership | ADR-002 requires each of the 19 bounded contexts to own its authoritative state; shared tables across contexts violate this ownership |
| Multi-tenant isolation | ADR-004 requires tenant-scoped storage and tenant-aware access controls enforced at every store, not retrofitted |
| Auditability as primitive | Principle P13 requires audit records to be immutable and tamper-evident, properties that demand a dedicated store |
| Analytical workload isolation | Analytical queries must not compete with transactional operations for compute, memory, or I/O |
| Large object handling | Documents, images, and exports require object storage; relational stores handle large binaries poorly |
| Decade horizon | Store technologies must be replaceable without rewriting the platform; segmentation by data class, not by technology, enables this |
| Configuration durability | `PRODUCT_BIBLE.md` Section 22 requires configuration records to be durable, versioned, validated, and audited; configuration state belongs in the transactional store under audit |

### 2.3 Architectural Constraints

The decision is constrained by the platform's ratified architectural commitments. `SYSTEM_ARCHITECTURE.md` Section 4 (P5) requires strong consistency for clinical data and forbids eventual consistency within an aggregate boundary. Section 4 (P13) requires auditability as a primitive, which precludes any architecture in which audit records share mutable storage with transactional records. Section 17.2 categorizes platform state into the five classes this ADR adopts and forbids treating them uniformly. Section 17.3 forbids direct data access across context boundaries, requiring query contracts as the only permitted cross-context surface. Section 27.5 mandates a dedicated audit store separate from the transactional store, with immutability, append-only writes, and tamper-evidence as architectural properties.

`PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy) requires configuration records to be durable, versioned, validated, and audited — placing configuration state within the transactional store's strong-consistency boundary, subject to audit. Section 27 (Security Philosophy) commits to defence in depth, encryption everywhere, and audit as a security control, which collectively require the audit store to be tamper-evident and isolated from operational mutation. ADR-002 requires context-owned authoritative state; ADR-004 requires tenant-scoped storage at every store. Both constrain this ADR's surface and are non-negotiable.

### 2.4 Cross-Reference Alignment

This ADR is the ratification of the data architecture defined at the architectural level in `SYSTEM_ARCHITECTURE.md` Section 6.8 and elaborated in Section 17 (State Management Philosophy) and Section 27 (Audit Architecture). The architecture document is the canonical source of truth for the segmentation model; this ADR ratifies it as a binding architectural decision, records the alternatives that were rejected, and documents the consequences. Where this ADR and the architecture document agree, they are consistent; where a future amendment to either is contemplated, the amendment mechanism defined in the architecture document governs, with this ADR's version incremented accordingly.

The configuration-driven philosophy (`PRODUCT_BIBLE.md` Section 22) and the security philosophy (`PRODUCT_BIBLE.md` Section 27) impose product-level constraints on this ADR. Configuration state is treated as transactional data subject to audit; security-relevant actions are treated as audit events subject to immutability. This ADR does not override those product commitments; it provides the data architecture that satisfies them.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Single Store

In a single-store architecture, all data classes — transactional, analytical, cache, object, and audit — are served by one database technology. Contexts share tables; analytical queries run against the same database as transactional operations; audit records are stored as rows in mutable tables; large objects are stored as binary columns or out-of-band files. The model optimizes for operational simplicity at the cost of every other concern.

| Criterion | Assessment | Verdict |
|---|---|---|
| Operational simplicity | High — one store to provision, monitor, and back up | Favors |
| Transactional integrity | High — ACID transactions within the store | Favors |
| Analytical performance | Low — analytical queries compete with transactional traffic | Rejects |
| Audit tamper-evidence | Low — audit rows are mutable like any other | Rejects |
| Large object handling | Low — relational stores handle large binaries poorly | Rejects |
| Context ownership | Low — shared tables violate ADR-002 | Rejects |
| Decade horizon | Fails — cannot serve divergent requirements at scale | Rejects |

**Verdict: Rejected.** A single store cannot serve the diversity of access patterns the platform requires. It compromises analytical performance, audit integrity, and large-object handling simultaneously, and violates context ownership by encouraging shared tables. The operational simplicity gain is not worth the compromise on P5, P13, and ADR-002.

### 3.2 Alternative B — Polyglot per Context

In a polyglot-per-context architecture, each bounded context selects its own store technology based on its local requirements. The Patient context might select a document store; the Billing context might select a relational store; the Audit context might select an append-only log; the Inventory context might select a key-value store. Cross-context queries are assembled by orchestration code that fans out to multiple heterogeneous stores and stitches the results.

| Criterion | Assessment | Verdict |
|---|---|---|
| Per-context optimization | High — each context selects its ideal store | Favors |
| Operational complexity | Very high — multiplied by 19 bounded contexts | Rejects |
| Cross-context query | Very complex — fan-out across heterogeneous stores | Rejects |
| Team expertise | High — operations teams must master many store technologies | Rejects |
| Consistency guarantees | Inconsistent — each store offers different guarantees | Rejects |
| Decade horizon | Survives but at unacceptable operational cost | Mixed |

**Verdict: Rejected.** Polyglot-per-context multiplies operational complexity by the number of bounded contexts (19 at present), produces inconsistent consistency guarantees across contexts, and makes cross-context analytical queries extremely complex. The per-context optimization gain is not worth the operational and consistency cost, and the model undermines the platform's commitment to consistent semantics across contexts.

### 3.3 Alternative C — Segmented by Data Class (Selected)

In a segmented-by-data-class architecture, the data layer is partitioned into five store types, each serving one data class. Each bounded context owns its authoritative state within the transactional store; cross-context access occurs through declared query contracts. Specialized stores serve the access patterns the transactional store cannot: the analytical store for reporting workloads, the cache store for hot-path reads, the object store for large binaries, and the audit store for the immutable audit trail.

| Criterion | Assessment | Verdict |
|---|---|---|
| Access pattern optimization | High — each store optimized for its data class | Favors |
| Transactional integrity | High — transactional store provides strong consistency | Favors |
| Analytical performance | High — analytical store is isolated from transactional traffic | Favors |
| Audit tamper-evidence | High — dedicated append-only audit store | Favors |
| Large object handling | High — dedicated object store | Favors |
| Context ownership | High — contexts own authoritative state in the transactional store | Favors |
| Operational complexity | Medium — five store types, each consistent within its category | Acceptable |
| Cross-context query | Medium — through contracts; cross-store analytical queries via the analytical store | Acceptable |
| Decade horizon | Served — store technologies replaceable per category without architectural change | Favors |

**Verdict: Accepted.** The segmented data architecture is the ratified default. Each data class is served by an appropriate store type; context ownership is preserved through contracts; store technologies are selected per category as implementation decisions, not as architectural identity. This alternative satisfies P5, P13, ADR-002, and ADR-004 simultaneously without forcing compromise on any single data class.

### 3.4 Alternative D — Hybrid with Per-Context Override

In a hybrid architecture, the segmentation by data class is the default, but a bounded context may override the default and select a different store for its own state when its requirements diverge from the standard. A context with unusually high write throughput might select a different transactional store technology; a context with specialized query patterns might select a different analytical representation. The override is documented and reviewed, not informal.

| Criterion | Assessment | Verdict |
|---|---|---|
| Flexibility for exceptional contexts | High — escape hatch available | Favors |
| Default simplicity | Medium — default is segmentation; override is the exception | Mixed |
| Operational complexity | Higher than pure segmentation when overrides are used | Caution |
| Consistency of architectural posture | Lower — overrides introduce per-context variation | Caution |
| Decade horizon | Preserved — overrides are documented and reviewed | Mixed |

**Verdict: Deferred.** The hybrid model is available for exceptional cases where a context's data class requirements genuinely diverge from the standard segmentation. It is not the default and is invoked only through a documented exception process with Architecture Council review. The default remains Alternative C; the override is an escape hatch, not a routine option.

### 3.5 Comparative Verdict Summary

| Alternative | Verdict | Primary Reason |
|---|---|---|
| A — Single Store | Rejected | Cannot serve divergent data class requirements; compromises analytical, audit, and object handling |
| B — Polyglot per Context | Rejected | Operational complexity multiplied by 19 contexts; cross-context query becomes intractable |
| C — Segmented by Data Class | Accepted | Each data class served by appropriate store; context ownership preserved; decade horizon protected |
| D — Hybrid with Override | Deferred | Available as documented exception; not the default; invoked under Architecture Council review |

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Per-class optimization | Each data class is served by a store optimized for its access pattern, avoiding the compromises of a single store |
| Audit immutability guaranteed | The dedicated audit store is append-only and tamper-evident by construction, satisfying P13 without relying on application discipline |
| Analytical query performance | Analytical workloads run against a store optimized for queries, isolated from transactional traffic |
| Context ownership preserved | Each bounded context owns its authoritative state in the transactional store; cross-context access occurs only through declared contracts |
| Large object handling | The object store handles documents, images, and exports efficiently, without burdening the transactional store |
| Decade-horizon portability | Store technologies are selected per category and replaceable without architectural change |
| Configuration durability | Configuration records, governed by `PRODUCT_BIBLE.md` Section 22, are stored as transactional state under audit, satisfying the configuration philosophy |
| Security-control audit | The audit store, governed by `PRODUCT_BIBLE.md` Section 27, serves as a tamper-evident security control for incident investigation and compliance demonstration |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Operational expertise required | Five store types must be provisioned, monitored, backed up, and recovered; each requires category-specific expertise |
| Data synchronization overhead | Synchronization from transactional to analytical store (ETL/ELT pipeline) introduces latency, complexity, and a failure surface |
| Cross-store transactional coordination | Operations that span stores (e.g., transactional write plus audit write) require outbox or saga coordination, not native ACID |
| Schema evolution across stores | Schema changes must propagate across transactional, analytical, and cache stores, with version alignment and backward compatibility |
| Cost | Five store types incur more infrastructure cost than a single store, particularly at scale and across regions |
| Cache invalidation discipline | Cache coherence is best-effort; incorrect invalidation produces stale reads that must be tolerated by consumers or detected by fallthrough |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Per-category technology selection | Store technology is an implementation decision per category, governed by selection criteria documented in the database documentation |
| Evolution without architectural change | Technologies may evolve across the decade horizon without amending this ADR, provided the category contract is satisfied |
| Per-store observability | Each store has its own observability surface, with cross-store correlation through trace IDs propagated from the orchestration layer |
| Per-store backup and recovery | Each store has its own backup and recovery strategy, aligned to its durability requirements and access pattern |
| Data layer abstraction | Upper layers interact with the Data Layer through contracts and do not know which store holds which data; store selection is invisible above the Data Layer |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Operational expertise | Dedicated data platform team; automated provisioning, backup, and monitoring per category |
| Data synchronization | ETL/ELT pipeline treated as first-class architectural component, with its own observability and SLAs |
| Cross-store coordination | Outbox pattern for transactional-plus-audit writes; saga coordination for cross-context transactions per `SYSTEM_ARCHITECTURE.md` Section 17.4 |
| Schema evolution | Backward-compatible evolution rules; deprecation policy for breaking changes; sandbox pre-production exercises |
| Cost | Capacity planning; tiered storage (hot, warm, cold); archival for stale analytical and audit data |
| Cache invalidation | Declared invalidation contracts; consumer tolerance for staleness; fallthrough to transactional store on cache miss |

---

## 5. Status

### 5.1 Current Status

**Ratified.** This decision is in effect and governs the data architecture across the Ibn Hayan platform. It is referenced by `SYSTEM_ARCHITECTURE.md` Sections 4 (P5, P13), 6.8, 17, and 27, and is realized in detail by the database documentation under `docs/04_DATABASE/`. The segmentation model, the context-ownership rules, and the contract-only cross-context access policy are binding on all platform teams. Any deviation requires a documented exception ratified by the Architecture Council.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Version | 2.0.0 |
| Predecessor | ADR-006 v1.0.0 (superseded) |
| Review cadence | Annual, or upon a store technology change, a new store type, or a material change to the segmentation model |
| Supersession criteria | Demonstrated infeasibility at scale, or emergence of a superior data architecture that satisfies the same constraints |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The data platform team owns the store implementations and the transactional-to-analytical pipeline. Bounded context teams own their authoritative state within the transactional store and the query contracts through which other contexts access it. The audit team owns the audit store and its tamper-evidence guarantees. Ownership of store technology selection per category is delegated to the data platform team under the selection criteria documented in the database documentation.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Store technology selection per category | What specific technology serves each of the five categories? Documented in the database documentation, not in this ADR |
| Transactional store topology | Will the transactional store be a single shared database with logical tenant separation, or sharded by tenant or by context? |
| Analytical store refresh latency | What is the maximum acceptable latency between a transactional commit and the corresponding analytical record? |
| Audit store scaling | How does the audit store scale as audit volume grows over the decade horizon, without compromising immutability or query performance? |
| Cross-store analytical query | What is the strategy for analytical queries that must combine transactional, object, and audit data in a single result? |
| Cache coherence across regions | How is cache coherence maintained across regions for globally distributed tenants? |
| Data residency per store | How is data residency enforced for tenants with strict regional requirements, across all five store types? |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if any of the following occurs. A store category proves unsuitable at scale, requiring a different technology or topology within the category. A new data class emerges that the current five-category segmentation cannot serve, requiring a sixth store type. A regulatory regime requires a different audit store model that the current audit store cannot satisfy. A new data architecture pattern emerges that superiorly balances access-pattern optimization, context ownership, and operational simplicity across the same constraints.

Any such amendment follows the Architecture Council ratification process defined in `SYSTEM_ARCHITECTURE.md`. Amendments increment this ADR's version and record the predecessor version. The segmentation model itself — partitioning by data class with context ownership through contracts — is treated as the most stable element and is the last to be amended; store technology selection per category is the most volatile and may change without amending this ADR at all.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-002 (Modular Architecture) | Constrains this ADR — bounded context decomposition requires context-owned authoritative state in the transactional store |
| ADR-004 (Multi-Tenant Strategy) | Constrains this ADR — tenant isolation is enforced at every store, not retrofitted |
| ADR-003 (Local-First Strategy) | Constrained by this ADR — local stores on clients are part of the data architecture; synchronization targets the transactional store |
| Future ADR: Transactional Store Topology | Will define sharding and tenant separation strategy for the transactional store |
| Future ADR: Analytical Store Pipeline | Will define the ETL/ELT pipeline contract between transactional and analytical stores |
| Future ADR: Audit Store Scaling | Will define the scaling and retention strategy for the audit store as audit volume grows |
