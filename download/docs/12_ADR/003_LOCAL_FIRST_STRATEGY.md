# ADR-003: Local-First Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to adopt a local-first architecture in which clients capture data, enforce business rules, and audit operations against a local store as the authoritative source, synchronizing with the server when connectivity permits. Offline operation is a first-class operational mode with the same data integrity, auditability, and safety as online operation.
>
> **Status:** Accepted · **ADR Number:** 003 · **Last Updated:** 2026-07-18
> **Supersedes:** None · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 3, 4 (P5, P13), 24, 25
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

Ibn Hayan adopts a local-first architecture. Clients operate against a durable local store as the authoritative source during their operating window; data is synchronized with the server when connectivity permits. The platform's behavioral guarantees — state machine enforcement, business rule evaluation, audit capture, encryption at rest — apply equally to offline and online operation. Offline is not a degraded mode; it is a first-class operational mode.

### 1.2 Scope of the Decision

The decision applies to all interactive clients (web, mobile, desktop) and to all data that users read or write through those clients. It does not apply to integration-only consumers (which synchronize through integration adapters, not through the local-first sync engine).

| Aspect | Decision |
|---|---|
| Authoritative source while offline | Client's local store |
| Authoritative source while online | Server, with client as cache and offline fallback |
| Business rule enforcement | Client-side, using cached configuration |
| Audit capture | Client-side, with synchronization to server audit store |
| Authentication | Time-limited offline credentials, refreshed on reconnection |
| Conflict resolution | Declared per data type (last-write-wins, field-level merge, manual) |
| Sync direction | Bidirectional for shared data; unidirectional for reference data |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — once clients are local-first, reverting to online-only requires client re-architecture |
| Cost of Wrong Decision | High — wrong choice produces either data loss in connectivity-challenged environments or operational fragility |
| Affected Layers | Experience layer, edge layer (sync ingress), domain layer (conflict resolution), data layer (local stores) |
| ADR Required | Yes — this ADR |

---

## 2. Context

### 2.1 The Connectivity Problem

Many of Ibn Hayan's target healthcare settings have unreliable or absent internet connectivity: rural clinics, mobile outreach units, disaster response operations, certain public health operations, and air-gapped environments (SYSTEM_ARCHITECTURE.md Section 23.5). A platform that requires continuous connectivity to operate cannot serve these settings.

Even in connectivity-rich environments, transient connectivity loss is common: a clinic's internet drops during a patient encounter; a tablet loses Wi-Fi between rooms; a mobile device roams between cell towers. A platform that fails open (loses data, blocks operations, or behaves inconsistently) on transient connectivity loss is unsuitable for clinical use.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Customer spectrum | The Product Bible targets customers across regions with varying connectivity, including connectivity-challenged markets. |
| Clinical safety | A clinician must be able to record a patient encounter regardless of connectivity. Losing an encounter to a connectivity failure is unacceptable. |
| Air-gapped deployment | SYSTEM_ARCHITECTURE.md Section 23.5 commits to air-gapped deployment for restricted environments; air-gapped is the extreme case of offline. |
| Auditability | Operations performed offline must be auditable with the same context as online operations (SYSTEM_ARCHITECTURE.md Section 27.8). |
| Multi-device operation | Users operate multiple devices; data must be consistent across devices after synchronization. |
| Decade horizon | Connectivity will improve over the decade, but the platform must remain viable in connectivity-challenged settings throughout. |
| Product differentiation | Offline-first operation is a load-bearing differentiator against competitors who require continuous connectivity. |

### 2.3 Constraints

The decision is constrained by:

- The Product Bible's commitment to offline-first operation as a product capability.
- The architectural principle of consistency by design (P5) — offline operation must not produce silent inconsistency.
- The architectural principle of auditability by construction (P13) — offline operations must be auditable.
- The decade horizon, which forbids architectural choices that cannot serve connectivity-challenged settings throughout the platform's lifetime.

---

## 3. Alternatives

### 3.1 Alternative A: Online-Only Architecture

In an online-only architecture, clients require continuous connectivity to the server. Operations are sent to the server, which evaluates them and returns the result. The client is a thin rendering surface; no authoritative state lives on the client.

| Criterion | Online-Only | Verdict |
|---|---|---|
| Simplicity | High — no sync, no conflict resolution, no offline audit | Favors |
| Performance (online) | High — no local store to maintain | Favors |
| Performance (offline) | None — does not operate offline | Rejects |
| Connectivity-challenged settings | Cannot serve | Rejects |
| Air-gapped deployment | Cannot serve | Rejects |
| Clinical safety in connectivity loss | Fails — operations are lost or blocked | Rejects |
| Multi-device | Trivial (single source of truth) | Favors |
| Decade horizon | Fails in target markets | Rejects |

**Verdict:** Rejected. Online-only architecture cannot serve the customer spectrum and fails clinical safety in connectivity-challenged environments.

### 3.2 Alternative B: Offline-Capable (Cache-First) Architecture

In a cache-first architecture, clients cache data for performance and operate against the cache when connectivity is lost, but the server remains the authoritative source. Conflicts are resolved in favor of the server; client-side changes during offline operation may be rejected on synchronization.

| Criterion | Cache-First | Verdict |
|---|---|---|
| Simplicity | Medium — cache invalidation is non-trivial | Mixed |
| Performance (online) | High — cache hits are fast | Favors |
| Performance (offline) | Medium — reads work, writes are queued | Mixed |
| Connectivity-challenged settings | Partial — writes may be rejected | Mixed |
| Clinical safety in connectivity loss | Medium — writes are not guaranteed to be accepted | Mixed |
| Conflict resolution | Server-authoritative; client changes may be lost | Rejects |
| Auditability | Medium — offline operations may not be auditable if rejected | Mixed |

**Verdict:** Rejected. Cache-first architecture does not provide the guarantees required for clinical use. The possibility that a clinician's offline operation is rejected on synchronization is unacceptable.

### 3.3 Alternative C: Local-First Architecture

In a local-first architecture, the client's local store is the authoritative source during the operating window. Operations are committed locally first, then synchronized. Conflicts are resolved through declared strategies. The server is the authoritative source across clients and over time, but the client is authoritative within its operating window.

| Criterion | Local-First | Verdict |
|---|---|---|
| Simplicity | Low — sync, conflict resolution, offline audit, offline auth | Rejects |
| Performance (online) | High — local reads are fast | Favors |
| Performance (offline) | High — operations commit locally | Favors |
| Connectivity-challenged settings | Fully served | Favors |
| Air-gapped deployment | Served (extreme case) | Favors |
| Clinical safety in connectivity loss | High — operations are committed locally and preserved | Favors |
| Conflict resolution | Declared per data type; manual for clinical data | Favors |
| Auditability | High — offline operations are auditable with full context | Favors |
| Multi-device | Supported through multi-device sync | Favors |
| Decade horizon | Served | Favors |

**Verdict:** Accepted. Local-first architecture provides the guarantees required for clinical use and serves the full customer spectrum, at the cost of significant architectural complexity.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Connectivity-challenged settings served | The platform operates in rural clinics, mobile outreach, disaster response, and air-gapped environments. |
| Clinical safety in connectivity loss | Operations are preserved locally and committed on reconnection; no clinical data is lost to connectivity failure. |
| Performance | Local reads and writes are fast; server round-trips are not required for most operations. |
| Multi-device operation | Users can operate across devices with synchronization reconciling state. |
| Auditability preserved | Offline operations are audited with full context, synchronized to the server audit store. |
| Air-gapped deployment supported | The same architecture that supports intermittent connectivity supports full air-gapped operation. |
| Product differentiation | Local-first is a load-bearing differentiator against online-only competitors. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Architectural complexity | Sync engine, conflict resolution, offline authentication, offline audit, offline business rules — all are required. |
| Conflict surface | Concurrent edits across clients and devices produce conflicts that must be resolved. |
| Eventual consistency | Server-side state lags behind client-side state; consumers of server-side data must tolerate lag. |
| Client storage and compute requirements | Clients must have sufficient storage and compute to operate the local store and business rules. |
| Security surface | Offline data on client devices must be encrypted; lost devices must be remotely wipeable. |
| Sync failure modes | Sync failures must be recoverable; silent sync failure produces data loss. |
| Configuration cache freshness | Clients must cache configuration and refresh it; stale configuration may produce incorrect behavior. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Sync engine as platform service | The sync engine is a load-bearing platform component with its own observability and operational requirements. |
| Conflict resolver as platform service | The conflict resolver is a platform component with declared strategies per data type. |
| Client identity per device | Each device is a sync participant with its own identity, requiring device management. |
| Sync observability | The platform monitors sync status across clients and tenants, alerting on excessive lag or failure. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Architectural complexity | Detailed sync architecture (SYSTEM_ARCHITECTURE.md Section 25); sync engine as a first-class platform service. |
| Conflict surface | Declared conflict resolution strategies per data type; manual resolution for clinical data. |
| Eventual consistency | Declared consistency contracts per interaction; monitoring of sync lag. |
| Client requirements | Minimum client specifications; graceful degradation on under-resourced clients. |
| Security surface | Offline encryption (SYSTEM_ARCHITECTURE.md Section 24.4); remote wipe; time-limited offline credentials. |
| Sync failure modes | Retry with exponential backoff; dead-letter queues; explicit error reporting; sync observability. |
| Configuration freshness | Configuration cache with versioning; refresh on reconnection; rule versioning for offline operation. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This decision is in effect and governs the client architecture, synchronization strategy, and offline operation model. It is referenced by SYSTEM_ARCHITECTURE.md Sections 3, 4 (P5, P13), 24, and 25, and is realized in detail by the synchronization architecture documentation.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Review cadence | Annual, or upon material change to the sync model |
| Supersession criteria | Demonstrated infeasibility at scale, or a superior offline-capable architecture emerging |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The client architecture team owns the local-first client implementation. The sync engine team owns the synchronization service.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Conflict resolution UX | What user experience best supports manual conflict resolution for clinical data? |
| Sync prioritization | When bandwidth is limited, what data synchronizes first? |
| Offline configuration depth | How much configuration should be cached offline, and what is the refresh strategy? |
| Device management lifecycle | How are devices provisioned, retired, and remotely wiped? |
| Peer-to-peer sync | Should devices sync directly with each other (e.g., in a fully offline clinic) or only through the server? |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if:

- A superior offline-capable architecture emerges (e.g., CRDT-based sync that eliminates the conflict surface for most data types).
- The connectivity landscape changes such that offline operation is no longer a load-bearing requirement (unlikely within the decade horizon).
- Security or regulatory requirements emerge that cannot be met by the local-first model.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Constrains this ADR — offline configuration cache and rule versioning are required. |
| ADR-004 (Multi-Tenant Strategy) | Constrains this ADR — offline data is tenant-scoped; cross-tenant data on a single device is forbidden. |
| ADR-006 (Database Strategy) | Constrained by this ADR — local stores are part of the data architecture. |
| Future ADR: Conflict Resolution Policy | Will define per-data-type conflict resolution strategies in detail. |
