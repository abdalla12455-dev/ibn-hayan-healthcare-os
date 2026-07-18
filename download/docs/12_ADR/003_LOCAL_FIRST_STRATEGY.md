# ADR-003: Local-First Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to ratify local-first client architecture as the default operational mode for Ibn Hayan client surfaces. Clients maintain durable local stores, operate fully offline when connectivity is unavailable, and synchronize bidirectionally with the central platform when connectivity is restored. Offline-first is not a fallback mode; it is the primary operational mode. Online-only operation is a special case.
>
> **Status:** Ratified · **Version:** 2.0.0 · **ADR Number:** 003 · **Last Updated:** 2026-07-18
> **Supersedes:** ADR-003 v1.0.0 (2026-07-18) · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 4 (Principle P11), 6.9 (Offline Substrate), 24 (Offline-First Architecture), 25 (Synchronization Strategy)
> **Related Product Sections:** `PRODUCT_BIBLE.md` Section 28 (Offline Strategy), Section 13.6 (Differentiator 5 — Globally Adaptable)
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

### 1.1 Decision to Ratify

The Ibn Hayan platform's client surfaces operate local-first by default. Clients maintain durable local stores, operate fully offline when connectivity is unavailable, and synchronize bidirectionally with the central platform when connectivity is restored. Offline-first is not a fallback mode; it is the primary operational mode of the platform's client surfaces. Online-only operation is treated as a special case in which the synchronization engine operates continuously rather than in queue-and-flush mode. This decision is the architectural ratification of Principle P11 (Offline-First as Default) as defined in `SYSTEM_ARCHITECTURE.md` Section 4.11, and it is the structural realization of the offline strategy defined in `PRODUCT_BIBLE.md` Section 28.

The decision accepts significant synchronization, conflict-resolution, and offline-audit complexity as the cost of clinical safety in connectivity-challenged settings. It rejects the proposition that simpler online-only or cache-first alternatives are acceptable substitutes, on the grounds that they fail clinical safety when connectivity is lost. It also rejects offline-as-fallback alternatives on the grounds that mode transitions are unreliable and that a fallback posture cannot be relied upon when needed.

### 1.2 Scope of the Decision

The decision applies to all interactive client surfaces of the platform, including web, mobile, and desktop clients, and to all data that practitioners read or write through those clients. It applies to the Offline Substrate component defined in `SYSTEM_ARCHITECTURE.md` Section 6.9 and to the synchronization engine, conflict resolution framework, and offline audit facilities defined in Sections 24 and 25. It does not apply to integration-only consumers, which synchronize through integration adapters rather than through the local-first sync engine.

| Aspect | Decision |
|---|---|
| Authoritative source while offline | Client's local store |
| Authoritative source while online | Server, with client as cache and offline fallback |
| Operational mode | Local-first by default; online-only as special case |
| Synchronization direction | Bidirectional for shared data; unidirectional for reference data |
| Conflict resolution | Declared per data type (Last-Write-Wins, Field-Level Merge, Manual Resolution) |
| Audit capture | Client-side, synchronized to central audit trail on reconnection |
| Configuration changes | Not supported offline; require connectivity |
| Reporting | Limited offline support for pre-cached reports; full reporting requires connectivity |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — once clients are local-first, reverting to online-only requires client re-architecture |
| Cost of Wrong Decision | High — wrong choice produces either data loss in connectivity-challenged environments or operational fragility |
| Affected Layers | Experience layer, edge layer (sync ingress), domain layer (conflict resolution), data layer (local stores), offline substrate |
| ADR Required | Yes — this ADR |
| Supersedes | ADR-003 v1.0.0 |

---

## 2. Context

### 2.1 The Connectivity Problem

Many of Ibn Hayan's target healthcare settings have unreliable or absent internet connectivity. Rural clinics, mobile outreach units, disaster response operations, certain public health operations, and air-gapped environments are all within the platform's target customer spectrum. A platform that requires continuous connectivity to operate cannot serve these settings, and the Product Bible explicitly commits to serving the global healthcare market rather than only the connectivity-rich portion of it (`PRODUCT_BIBLE.md` Section 13.6, Differentiator 5 — Globally Adaptable).

Even in connectivity-rich environments, transient connectivity loss is common. A clinic's internet drops during a patient encounter; a tablet loses Wi-Fi between rooms; a mobile device roams between cell towers; a regional outage takes a facility offline for hours. A platform that fails open — losing data, blocking operations, or behaving inconsistently on transient connectivity loss — is unsuitable for clinical use, because clinician work cannot pause while network conditions recover.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Clinical safety | A clinician must be able to record a patient encounter regardless of connectivity. Losing an encounter to a connectivity failure is unacceptable. |
| Practitioner experience | The platform must respond at local speed for routine actions; network latency must not be on the critical path of clinical work (`PRODUCT_BIBLE.md` Section 28.2). |
| Connectivity-challenged markets | The Product Bible targets customers across regions with varying connectivity, including connectivity-challenged markets (`PRODUCT_BIBLE.md` Section 13.6). |
| Air-gapped deployment | `SYSTEM_ARCHITECTURE.md` Section 23 commits to air-gapped deployment for restricted environments; air-gapped is the extreme case of offline. |
| Auditability | Operations performed offline must be auditable with the same completeness as online operations (`SYSTEM_ARCHITECTURE.md` Section 24.6, `PRODUCT_BIBLE.md` Section 28.5). |
| Multi-device operation | Users operate multiple devices; data must be consistent across devices after synchronization. |
| Decade horizon | Connectivity will improve over the decade, but the platform must remain viable in connectivity-challenged settings throughout (`SYSTEM_ARCHITECTURE.md` Section 4.18). |

### 2.3 Constraints

The decision is constrained by the platform's architectural principles and product commitments. Principle P1 (Healthcare Safety Overrides All Others) requires that the platform not lose clinical data to connectivity failure. Principle P5 (Consistency Over Availability for Clinical Data) requires that clinical data synchronization prefer delay over compromise (`SYSTEM_ARCHITECTURE.md` Section 25.7). Principle P11 (Offline-First as Default) directly mandates the posture ratified here. Principle P13 (Auditability as Primitive) requires that offline operations be auditable with the same rigour as online operations.

The decade horizon (`SYSTEM_ARCHITECTURE.md` Section 4.18) forbids architectural choices that cannot serve connectivity-challenged settings throughout the platform's lifetime. The Product Bible's commitment to serving the global healthcare market (`PRODUCT_BIBLE.md` Section 13.6) extends the same constraint from a product-strategy perspective. Together these constraints eliminate any architecture that cannot operate fully offline when required.

### 2.4 Architectural Posture

The Offline Substrate (`SYSTEM_ARCHITECTURE.md` Section 6.9) is the architectural component that realizes this decision. It comprises the local store, the sync engine, the conflict resolution framework, and the offline audit trail as first-class platform concerns. The Offline Substrate is not a fallback module bolted onto an online-first core; it is a load-bearing substrate on which the client experience is built.

The synchronization strategy (`SYSTEM_ARCHITECTURE.md` Section 25) governs how offline state is reconciled with central platform state. The strategy supports three conflict resolution strategies — Last-Write-Wins (CR1), Field-Level Merge (CR2), and Manual Resolution (CR3) — selected per data type through configuration. The local-first posture ratified here is the operational envelope within which the synchronization strategy operates.

---

## 3. Alternatives Considered

### 3.1 Comparison of Alternatives

Four alternatives were considered. The comparison below summarizes their fit against the criteria that govern this decision; each alternative is then examined in detail in the subsections that follow.

| Criterion | Online-Only | Cache-First | Local-First | Offline-as-Fallback |
|---|---|---|---|---|
| Operates fully offline | No | Reads only | Yes | Yes, when activated |
| Clinical safety during outage | Fails | At risk | Preserved | Unreliable |
| Practitioner-felt latency | Network-bound | Mixed | Local speed | Mode-dependent |
| Write capability while offline | None | Queued, may be rejected | Full | Unreliable |
| Synchronization complexity | None | Medium | High | High plus mode transitions |
| Mode-transition reliability | N/A | N/A | None needed | Unreliable |
| Connectivity-challenged settings | Cannot serve | Partial | Fully served | Partial |
| Verdict | Rejected | Rejected | Accepted | Rejected |

### 3.2 Alternative A: Online-Only — REJECTED

In an online-only architecture, clients require continuous connectivity to the server. Operations are sent to the server, which evaluates them and returns the result. The client is a thin rendering surface; no authoritative state lives on the client. This is the simplest architecture to specify, build, and operate, and it is the implicit default for most enterprise SaaS software.

The alternative is rejected on clinical-safety and market-fit grounds. A clinician working through a network outage cannot record an encounter, place an order, or administer a medication; the platform either blocks the operation or loses it. This is unacceptable in healthcare settings, where clinical work cannot pause for network conditions. The alternative also cannot serve the connectivity-challenged markets that the Product Bible explicitly targets (`PRODUCT_BIBLE.md` Section 13.6), and it cannot serve the air-gapped deployment model that `SYSTEM_ARCHITECTURE.md` Section 23 commits to. Practitioner experience is also degraded: every interaction incurs network latency, and the platform's perceived performance is bounded by network quality rather than by local hardware.

**Verdict:** Rejected. Online-only architecture cannot serve the customer spectrum, fails clinical safety in connectivity-challenged environments, and degrades practitioner experience with network-bound latency. It is retained only as a special case in which the synchronization engine operates continuously.

### 3.3 Alternative B: Cache-First — REJECTED

In a cache-first architecture, clients cache data for read performance and operate against the cache when connectivity is lost, but the server remains the authoritative source. Writes during offline operation are queued and submitted on reconnection; the server may reject them on the grounds of conflict, staleness, or business-rule violation. The client is a read cache and a write buffer; it is not an authoritative source.

The alternative is rejected because clinical actions cannot be deferred. If a clinician records a medication administration offline and the server later rejects the write, the clinical record diverges from the operational record; the patient received the medication, but the platform reports that they did not. This is a clinical safety failure, not a convenience failure. The possibility of rejection is itself the defect; a clinical write that the clinician was permitted to make offline must be accepted on synchronization, with conflicts resolved through declared strategies rather than by server-side rejection. The alternative also fails the auditability constraint: an offline operation that is rejected on synchronization cannot be audited with the same completeness as an accepted operation.

**Verdict:** Rejected. Cache-first architecture does not provide the guarantees required for clinical use. The possibility that a clinician's offline operation is rejected on synchronization is unacceptable, and clinical actions cannot be deferred to a future connectivity window.

### 3.4 Alternative C: Local-First — ACCEPTED

In a local-first architecture, the client's local store is the authoritative source during the operating window. Operations are committed locally first, then synchronized bidirectionally with the central platform when connectivity is available. Conflicts are resolved through declared strategies — Last-Write-Wins (CR1) for non-clinical data where recency is the primary concern; Field-Level Merge (CR2) for clinical documentation where multiple practitioners may edit different parts of a record concurrently; and Manual Resolution (CR3) for high-stakes conflicts where automated resolution is unsafe (`SYSTEM_ARCHITECTURE.md` Section 25.2). The server is the authoritative source across clients and over time, but the client is authoritative within its operating window.

The alternative is accepted because it preserves clinical safety during network outages, delivers practitioner-felt latency at local speed, and serves the full customer spectrum including connectivity-challenged markets. It also supports the air-gapped deployment model as the extreme case of offline operation. The cost is significant: a synchronization engine, a conflict resolution framework, an offline audit trail, offline authentication, and offline configuration caching are all required, and the operational surface of each is non-trivial. The platform accepts this cost as the price of clinical safety in connectivity-challenged settings, consistent with Principle P14 (Simplicity Over Complexity) being subordinate to Principle P11 (Offline-First as Default) per the precedence hierarchy in `SYSTEM_ARCHITECTURE.md` Section 4.19.

**Verdict:** Accepted. Local-first architecture provides the guarantees required for clinical use and serves the full customer spectrum, at the cost of significant architectural complexity that the platform accepts as the price of clinical safety.

### 3.5 Alternative D: Offline-as-Fallback — REJECTED

In an offline-as-fallback architecture, the client operates online by default and activates an offline mode only when connectivity is lost. The offline code path is exercised only on connectivity failure, and the transition between online and offline modes is a runtime concern. The appeal of this alternative is that the common case (online) is simple and the uncommon case (offline) is contained.

The alternative is rejected on reliability grounds. Mode transitions are the most failure-prone aspect of offline-capable systems: state must be transferred between modes, in-flight operations must be reconciled, and the offline mode must be entered and exited without data loss. An offline mode that is activated only on connectivity failure is exercised infrequently and is therefore under-tested in production conditions; practitioners cannot rely on it when they need it. The alternative also inverts the operational posture: the platform spends most of its time in the online mode, which is the simpler mode, and falls back to the offline mode, which is the more complex mode, precisely when conditions are worst. The local-first posture ratified here inverts this: the platform is always in the mode that handles connectivity loss gracefully, and online operation is the special case in which the synchronization engine runs continuously.

**Verdict:** Rejected. Mode transitions are unreliable, fallback mode is under-tested in production conditions, and practitioners cannot rely on a fallback mode that activates only when needed. The local-first posture eliminates the mode-transition problem by making local-first the default and only mode.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Clinical safety preserved during outages | Operations are committed locally and preserved on reconnection; no clinical data is lost to connectivity failure. |
| Practitioner-felt latency at local speed | Routine reads and writes do not incur network round-trips; the platform's perceived performance is bounded by local hardware, not by network quality (`PRODUCT_BIBLE.md` Section 28.2). |
| Viable in connectivity-challenged regions | The platform serves rural clinics, mobile outreach, disaster response, and air-gapped environments, operationalizing Differentiator 5 — Globally Adaptable (`PRODUCT_BIBLE.md` Section 13.6). |
| Air-gapped deployment supported | The same architecture that supports intermittent connectivity supports full air-gapped operation as the extreme case (`SYSTEM_ARCHITECTURE.md` Section 23). |
| Auditability preserved | Offline operations are audited with full context, synchronized to the central audit trail on reconnection (`SYSTEM_ARCHITECTURE.md` Section 24.6, `PRODUCT_BIBLE.md` Section 28.5). |
| Multi-device operation supported | Users can operate across devices, with synchronization reconciling state across devices. |
| Product differentiation | Local-first is a load-bearing differentiator against online-only competitors in the healthcare software market. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Synchronization engine complexity | The sync engine is a load-bearing platform component with its own observability, failure modes, and operational requirements (`SYSTEM_ARCHITECTURE.md` Section 24.4). |
| Conflict resolution strategies required | Concurrent edits across clients and devices produce conflicts that must be resolved through declared strategies (CR1, CR2, CR3); the conflict surface is non-trivial (`SYSTEM_ARCHITECTURE.md` Section 25.2). |
| Local store encryption and security overhead | Offline data on client devices must be encrypted at rest; lost devices must be remotely wipeable; offline credentials must be time-limited (`SYSTEM_ARCHITECTURE.md` Section 24.3). |
| Offline audit trail synchronization complexity | Offline audit records must be synchronized to the central audit trail without loss, duplication, or tampering; the local audit store is append-only and tamper-evident (`SYSTEM_ARCHITECTURE.md` Section 24.6). |
| Eventual consistency for server-side consumers | Server-side state lags behind client-side state; consumers of server-side data must tolerate declared sync lag (`SYSTEM_ARCHITECTURE.md` Section 25.7). |
| Client storage and compute requirements | Clients must have sufficient storage and compute to operate the local store, business rules, and audit capture. |
| Sync failure modes | Sync failures must be recoverable; silent sync failure produces data loss and must be detected through observability. |
| Configuration cache freshness | Clients must cache configuration and refresh it; stale configuration may produce incorrect behavior (`SYSTEM_ARCHITECTURE.md` Section 24.8). |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Not all capabilities supported offline | Configuration changes require connectivity to the central platform; full reporting requires connectivity (`SYSTEM_ARCHITECTURE.md` Section 24.5, `PRODUCT_BIBLE.md` Section 28.3). These limits are inherent to the local-first posture, not defects to be removed. |
| Sync engine as platform service | The sync engine is a first-class platform service with its own observability, on-call rotation, and operational runbooks. |
| Conflict resolver as platform service | The conflict resolver is a platform component with declared strategies per data type, selected through configuration. |
| Client identity per device | Each device is a sync participant with its own identity, requiring device management, provisioning, and retirement. |
| Sync observability | The platform monitors sync status across clients and tenants, alerting on excessive lag, conflict rate, or failure rate (`SYSTEM_ARCHITECTURE.md` Section 25.8). |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Synchronization engine complexity | Detailed sync architecture (`SYSTEM_ARCHITECTURE.md` Section 25); sync engine as a first-class platform service with dedicated ownership. |
| Conflict resolution strategies required | Declared conflict resolution strategies per data type (CR1, CR2, CR3); manual resolution for high-stakes conflicts (`SYSTEM_ARCHITECTURE.md` Section 25.2). |
| Local store encryption and security overhead | Offline encryption at rest; remote wipe; time-limited offline credentials; key management integrated with the platform's key management service (`SYSTEM_ARCHITECTURE.md` Section 24.3). |
| Offline audit trail synchronization | Append-only, tamper-evident local audit store; synchronization preserves audit record integrity; conflicts resolved in favour of the original record (`SYSTEM_ARCHITECTURE.md` Section 24.6). |
| Eventual consistency | Declared consistency contracts per interaction; monitoring of sync lag with declared thresholds (`SYSTEM_ARCHITECTURE.md` Section 25.7, 25.8). |
| Sync failure modes | Retry with exponential backoff; dead-letter queues; explicit error reporting; sync observability with alerting on failure rate. |
| Configuration freshness | Configuration cache with versioning; refresh on reconnection; rule versioning for offline operation (`SYSTEM_ARCHITECTURE.md` Section 24.8). |

---

## 5. Status

### 5.1 Current Status

**Ratified.** This decision is in effect and governs the client architecture, synchronization strategy, and offline operation model of the Ibn Hayan platform. It is referenced by `SYSTEM_ARCHITECTURE.md` Sections 4 (Principle P11), 6.9 (Offline Substrate), 24 (Offline-First Architecture), and 25 (Synchronization Strategy), and it is realized in detail by the synchronization architecture documentation. It is the architectural ratification of `PRODUCT_BIBLE.md` Section 28 (Offline Strategy).

This version (2.0.0) supersedes ADR-003 v1.0.0. The decision itself is unchanged; the v2.0.0 revision aligns the ADR's structure, cross-references, and consequence analysis with SYSTEM_ARCHITECTURE.md v2.0.0 and PRODUCT_BIBLE.md v2.0.0, and it documents the fourth alternative (Offline-as-Fallback) that v1.0.0 did not consider explicitly.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Version | 2.0.0 |
| Review cadence | Annual, or upon material change to the sync model |
| Supersession criteria | Demonstrated infeasibility at scale, or a superior offline-capable architecture emerging |
| Predecessor | ADR-003 v1.0.0 (2026-07-18) |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The client architecture team owns the local-first client implementation. The sync engine team owns the synchronization service, including the conflict resolution framework and the offline audit synchronization facility. The platform security team owns the local store encryption and offline credential model. The Architecture Council reviews this ADR annually or upon material change to the synchronization model.

---

## 6. Future Notes

### 6.1 Synchronization Engine Performance Optimization

The synchronization engine is a load-bearing platform component whose performance directly affects practitioner experience and operational cost. Future work will focus on incremental synchronization of changed data only, prioritization of synchronization traffic when bandwidth is limited, and observability of synchronization latency, conflict rate, and failure rate against the targets defined in `SYSTEM_ARCHITECTURE.md` Section 25.8. Peer-to-peer synchronization between devices in a fully offline clinic is an open question that may reduce dependence on a central platform for facilities with intermittent connectivity; it is not currently committed but is not precluded by this ADR.

### 6.2 Expansion of Offline-Supported Capability Set

The set of capabilities supported offline is documented in `SYSTEM_ARCHITECTURE.md` Section 24.5 and `PRODUCT_BIBLE.md` Section 28.3. Configuration changes and full reporting are not supported offline and are unlikely to become offline-supported, because they depend on central platform state that cannot be safely cached locally. Other capabilities may expand their offline surface over time as the synchronization engine matures and as conflict resolution strategies are validated for additional data types. Expansion of the offline-supported capability set will be governed by per-capability ADRs rather than by amendment to this ADR.

### 6.3 Conflict Resolution Strategy Evolution

The three conflict resolution strategies — Last-Write-Wins (CR1), Field-Level Merge (CR2), and Manual Resolution (CR3) — are defined in `SYSTEM_ARCHITECTURE.md` Section 25.2. The assignment of strategies to data types is a configuration decision that will evolve based on operational experience: data types that exhibit low conflict rates under CR1 may be reassigned to CR2 if concurrent edits emerge; data types that exhibit high manual-resolution burden under CR3 may be candidates for automated resolution if a safe automated strategy can be defined. A future ADR will define per-data-type conflict resolution policy in detail; this ADR ratifies only the local-first posture within which that policy operates.

### 6.4 Local Store Size Management and Archival

The local store grows as the client accesses and produces data. Unbounded growth is unsustainable on client devices, particularly on mobile hardware. Future work will define a local store size management strategy, including archival of older state to the central platform, eviction of cold data from the local store, and recovery of archived data on demand. The strategy must preserve the local-first posture: eviction must not compromise offline operation for active patients, and archival must not compromise auditability of historical state. Local store size is one of the primary metrics monitored by the sync observability facility (`SYSTEM_ARCHITECTURE.md` Section 25.8).
