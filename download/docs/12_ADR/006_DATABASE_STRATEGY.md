# ADR-006: Database Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to adopt a segmented data architecture in which the data layer is partitioned by access pattern (transactional, analytical, cache, object, audit) rather than served by a single store, with tenant-scoped storage and tenant-aware access controls enforced at every store. Each bounded context owns its authoritative state; cross-context data sharing occurs through contracts and events, not through shared tables.
>
> **Status:** Accepted · **ADR Number:** 006 · **Last Updated:** 2026-07-18
> **Supersedes:** None · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 3, 4 (P3, P5), 6.8, 7, 10, 27, 28
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

Ibn Hayan adopts a segmented, tenant-scoped, context-owned data architecture. The data layer is partitioned by access pattern into five store types: a transactional store for operational state, an analytical store for reporting and analytics, a cache for hot-path reads, an object store for large binary artifacts, and an append-only audit store for tamper-evident audit records. Each bounded context owns its authoritative state within the transactional store; cross-context data sharing occurs through contracts and events, not through shared tables. All stores are multi-tenant by construction, with tenant-scoped storage and tenant-aware access controls.

### 1.2 Scope of the Decision

The decision applies to the data layer (SYSTEM_ARCHITECTURE.md Section 6.8) and to how all upper layers interact with it. It governs store segmentation, tenant isolation, context ownership, schema evolution, and consistency models.

| Aspect | Decision |
|---|---|
| Store segmentation | Five store types, by access pattern |
| Tenant isolation | Logical by default; tenant-scoped storage and tenant-aware access controls |
| Context ownership | Each bounded context owns its authoritative state; no shared tables across contexts |
| Cross-context data sharing | Contracts and events; not shared tables |
| Audit store | Append-only, tamper-evident, cryptographically protected |
| Schema evolution | Backward-compatible by default; breaking changes follow deprecation policy |
| Consistency model | Strong within an aggregate; eventual across contexts, with declared consistency contracts |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Very low — data architecture is foundational; migrating data stores is expensive and risky |
| Cost of Wrong Decision | Very high — wrong choice produces data integrity failures, performance bottlenecks, or vendor lock-in |
| Affected Layers | Data layer primarily; constrains all upper layers |
| ADR Required | Yes — this ADR |

---

## 2. Context

### 2.1 The Data Architecture Problem

A healthcare platform's data architecture must serve multiple, sometimes conflicting, requirements: transactional integrity for clinical and financial operations; analytical query performance for reporting; low-latency reads for hot paths; large object storage for documents and images; and tamper-evident audit for regulatory compliance. The architectural question is how these requirements are served — by a single store, by a set of specialized stores, or by some hybrid.

In addition, the data architecture must respect the bounded context decomposition (ADR-002) — each context owns its authoritative state — and the multi-tenant model (ADR-004) — tenant data is isolated.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Access pattern diversity | Transactional, analytical, cache, object, and audit access patterns have incompatible optimization requirements. |
| Multi-tenancy | ADR-004 requires tenant-scoped storage and tenant-aware access controls at every store. |
| Context ownership | ADR-002 requires that each bounded context own its authoritative state; shared tables across contexts violate this. |
| Auditability | Audit records must be tamper-evident and append-only; this requires a specialized store. |
| Analytical workload separation | Analytical queries must not compete with transactional operations for resources. |
| Large object storage | Documents and images require object storage, not row storage. |
| Decade horizon | Data stores must be re-platformable without rewriting the platform; this requires abstraction. |
| Vendor lock-in avoidance | The data architecture must not be locked to a specific vendor; this requires portability. |

### 2.3 Constraints

The decision is constrained by:

- The Product Bible's commitment to multi-tenant SaaS and to auditability as a product capability.
- The architectural principle of single source of truth per concept (P3).
- The architectural principle of consistency by design (P5).
- The architectural principle of auditability by construction (P13).
- ADR-002 (Modular Architecture), which requires context-owned authoritative state.
- ADR-004 (Multi-Tenant Strategy), which requires tenant-scoped storage.

---

## 3. Alternatives

### 3.1 Alternative A: Single Relational Store

In a single-store architecture, all data (transactional, analytical, cache, object, audit) lives in one relational database. Contexts share tables; analytical queries run against the same database as transactional operations.

| Criterion | Single Store | Verdict |
|---|---|---|
| Simplicity | High — one store to manage | Favors |
| Transactional integrity | High — ACID transactions | Favors |
| Analytical performance | Low — analytical queries compete with transactions | Rejects |
| Audit tamper-evidence | Low — audit tables are mutable like any other | Rejects |
| Large object storage | Low — relational stores handle large objects poorly | Rejects |
| Context ownership | Low — shared tables violate context ownership | Rejects |
| Vendor lock-in | Medium — relational standards are portable but practices are not | Mixed |
| Decade horizon | Fails — cannot serve diverse access patterns at scale | Rejects |

**Verdict:** Rejected. A single store cannot serve the diversity of access patterns, cannot provide tamper-evident audit, and cannot respect context ownership.

### 3.2 Alternative B: Polyglot Persistence per Context

In a polyglot architecture, each bounded context chooses its own store type based on its needs. The Patient context might use a document store; the Billing context might use a relational store; the Audit context might use an append-only log.

| Criterion | Polyglot per Context | Verdict |
|---|---|---|
| Per-context optimization | High — each context uses the best store for its needs | Favors |
| Operational complexity | Very high — many store types to manage | Rejects |
| Cross-context consistency | Low — cross-store transactions are difficult | Rejects |
| Team expertise | High — teams must master many store types | Rejects |
| Vendor lock-in | Low — diverse stores | Favors |
| Decade horizon | Survives but at high operational cost | Mixed |

**Verdict:** Rejected as the default. Polyglot persistence is available as an exception for contexts with specific needs (e.g., the Audit context uses an append-only log; the Search service may use a search index), but it is not the default. Most contexts use the shared transactional store.

### 3.3 Alternative C: Segmented Data Architecture with Context Ownership

In a segmented architecture, the data layer is partitioned by access pattern into specialized stores (transactional, analytical, cache, object, audit). Each context owns its authoritative state within the transactional store; cross-context data sharing occurs through contracts and events. Specialized stores (audit, object) are used where their properties are required.

| Criterion | Segmented Architecture | Verdict |
|---|---|---|
| Access pattern optimization | High — each store optimized for its access pattern | Favors |
| Transactional integrity | High — transactional store provides ACID | Favors |
| Analytical performance | High — analytical store is separate | Favors |
| Audit tamper-evidence | High — append-only audit store | Favors |
| Large object storage | High — object store | Favors |
| Context ownership | High — contexts own authoritative state in transactional store | Favors |
| Operational complexity | Medium — five store types, but each is consistent | Mixed |
| Cross-context consistency | Medium — eventual consistency with declared contracts | Mixed |
| Decade horizon | Served | Favors |

**Verdict:** Accepted. The segmented data architecture is the default. Context ownership is preserved by separating contexts within the transactional store; specialized stores serve access patterns that the transactional store cannot.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Access pattern optimization | Each store is optimized for its access pattern, avoiding the compromises of a single store. |
| Audit tamper-evidence | The audit store is append-only and cryptographically protected, supporting regulatory inquiry. |
| Analytical workload isolation | Analytical queries do not compete with transactional operations. |
| Context ownership preserved | Each context owns its authoritative state; cross-context sharing occurs through contracts. |
| Large object support | The object store handles documents and images efficiently. |
| Vendor portability | Stores are abstracted; vendors can be replaced without rewriting the platform. |
| Decade horizon preserved | The data architecture can absorb change through store evolution, not re-platforming. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Operational complexity | Five store types to manage, monitor, and back up. |
| Cross-context consistency | Eventual consistency across contexts requires declared contracts and consumer tolerance for lag. |
| Data pipeline complexity | The analytical store requires an ETL/ELT pipeline from the transactional store. |
| Schema evolution across stores | Schema changes must propagate across transactional, analytical, and cache stores. |
| Multi-store transactions | Transactions that span stores (e.g., transactional + audit) require coordination. |
| Cost | Five store types incur more cost than a single store, especially at scale. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Data layer abstraction | The data layer is abstracted behind contracts; upper layers do not know which store holds which data. |
| Per-store observability | Each store has its own observability, with cross-store correlation through trace IDs. |
| Per-store backup and recovery | Each store has its own backup and recovery strategy, aligned to its access pattern and durability requirements. |
| Per-store security | Each store enforces tenant isolation through its own mechanisms, with consistent controls across stores. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Operational complexity | Dedicated data platform team; automation of provisioning, backup, and monitoring. |
| Cross-context consistency | Declared consistency contracts (SYSTEM_ARCHITECTURE.md Section 17.5); monitoring of sync lag. |
| Data pipeline | Pipeline as first-class architectural component (SYSTEM_ARCHITECTURE.md Section 28.5); pipeline observability. |
| Schema evolution | Backward-compatible evolution rules; deprecation policy for breaking changes. |
| Multi-store transactions | Outbox pattern for transactional + audit coordination; sagas for cross-context transactions. |
| Cost | Capacity planning; tiered storage (hot, warm, cold); archival. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This decision is in effect and governs the data architecture across the platform. It is referenced by SYSTEM_ARCHITECTURE.md Sections 3, 4 (P3, P5), 6.8, 7, 10, 27, and 28, and is realized in detail by the database architecture documentation in `docs/04_DATABASE/*`.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Review cadence | Annual, or upon a data store vendor change or a new store type |
| Supersession criteria | Demonstrated infeasibility, or a superior data architecture emerging |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The data platform team owns the store implementations and the data pipeline. Context teams own their authoritative state within the transactional store.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Transactional store topology | Will the transactional store be a single shared database (with logical tenant separation) or sharded by tenant? |
| Analytical store technology | What technology serves the analytical store — a columnar database, a data lakehouse, or something else? |
| Audit store technology | What technology serves the audit store — an append-only log, a blockchain-style structure, or something else? |
| Cache invalidation strategy | What is the cache invalidation strategy across request-scoped, service-scoped, and distributed caches? |
| Data residency per store | How is data residency enforced for tenants with strict regional requirements, across multiple store types? |
| Schema evolution tooling | What tooling supports schema evolution across transactional, analytical, and cache stores? |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if:

- A store type proves unsuitable at scale, requiring a different technology or topology.
- A new access pattern emerges that the current segmentation cannot serve.
- A regulatory regime requires a different audit store model.
- A new data architecture pattern emerges that superiorly balances access pattern optimization, context ownership, and operational simplicity.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-002 (Modular Architecture) | Constrains this ADR — context ownership requires context-scoped authoritative state. |
| ADR-004 (Multi-Tenant Strategy) | Constrains this ADR — tenant isolation is enforced at every store. |
| ADR-003 (Local-First Strategy) | Constrained by this ADR — local stores on clients are part of the data architecture. |
| Future ADR: Transactional Store Topology | Will define sharding strategy for the transactional store. |
| Future ADR: Analytical Store Technology | Will define the technology and topology of the analytical store. |
| Future ADR: Audit Store Technology | Will define the technology and tamper-evidence mechanism of the audit store. |
