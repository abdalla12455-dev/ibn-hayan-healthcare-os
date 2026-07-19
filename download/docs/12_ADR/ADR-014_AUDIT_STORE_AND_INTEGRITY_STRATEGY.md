# ADR-014: Audit Store and Integrity Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-014: Audit Store and Integrity Strategy |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Accepted Decision |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review when the audit-store technology is changed, when a separate audit cluster is promoted to production, when key-rotation workflow is ratified, or when a future legal-hold or retention-disposal ADR is proposed |
| Audience | Senior software architects, security council, audit owners, compliance officers, backend module owners, infrastructure owners, integration architects |
| Scope | The decision to ratify a dedicated PostgreSQL audit database separate from the transactional store, a transactional outbox for durable delivery, HMAC-SHA-256 chained integrity records with one independent chain per tenant plus one platform chain, immutable database enforcement through triggers and privileges, idempotent delivery by stable event identifier, framework-agnostic audit contracts in `packages/observability`, and the explicit deferral of public audit querying, retention disposal, legal-hold management, audit exports, compliance reports, offline audit synchronisation, alerting and security-operations integration, and key-rotation workflow beyond key-version support. |
| Out of Scope | Specific retention periods (governed by `09_SECURITY/COMPLIANCE/DATA_RETENTION.md`), legal-hold workflow (deferred to a future ADR), compliance-report formats (governed by region-specific compliance documents), alerting and SIEM integration (deferred to a future ADR), exact production infrastructure topology (deferred to a deployment ADR), exact key-rotation cadence (governed by operational policy), public audit query surface (deferred to a future batch) |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md`, `09_SECURITY/AUDIT.md`, `09_SECURITY/COMPLIANCE/DATA_RETENTION.md`, ADR-006 (Database Strategy), or ADR-012 (Application Platform and Repository Structure) is resolved in favour of the canonical spine until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR or an explicit version increment of this ADR, recorded in the platform CHANGELOG |

> **Document Purpose:** This ADR ratifies the audit-store and integrity strategy for the Ibn Hayan canonical implementation. The audit store is a dedicated PostgreSQL 17 database, logically and operationally separated from the transactional database, accessed through a separate connection string, deployable to separate infrastructure later without changing audit contracts. No cross-database foreign keys exist between the transactional store and the audit store. Durable delivery is provided by a transactional outbox in the transactional store: a state mutation and its outbox record commit atomically; a separate dispatcher reads the outbox and appends to the audit store; delivery is idempotent by stable event identifier. Tamper-evidence is provided by HMAC-SHA-256 chained integrity records: one independent chain per tenant (scope `tenant:<tenantId>`) and one platform chain (scope `platform`) for events without a tenant. The chain head is tracked in a mutable `AuditChainHead` table used as implementation metadata only; it is not an audit record. Immutability is enforced at the database level through triggers that reject `UPDATE`, `DELETE`, and `TRUNCATE` on the audit-event table; the runtime database role has only `INSERT` and `SELECT` privileges on audit tables. Failed-login identifiers are HMAC-hashed with a separate identifier key; raw attempted email addresses are never persisted. No password, token, CSRF value, cookie, authorization header, or secret is ever persisted in audit data.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 4 (Architectural Principles — P1 Healthcare First, P5 Consistency Over Availability for Clinical Data, P13 Auditability as Primitive), Section 17 (State Management Philosophy), Section 20 (Security Architecture), Section 27 (Audit Architecture). `SOFTWARE_ARCHITECTURE.md` Section 7 (Cross-Cutting Concerns). `MODULE_ARCHITECTURE.md` Section 2 (Module Catalogue — M14 Identity & Access, M16 Audit).

> **Related Product Bible Sections:** `PRODUCT_BIBLE.md` Section 5 (Core Principles), Section 6 (Design Principles — D-10 Observable, Auditable, Accountable), Section 27 (Security Philosophy), Section 31 (Audit Posture).

> **Related Security Documents:** `09_SECURITY/AUDIT.md`, `09_SECURITY/AUTHENTICATION.md`, `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, `09_SECURITY/COMPLIANCE/DATA_RETENTION.md`. This ADR ratifies the implementation-grade decisions; the security documents remain the authoritative narrative references. Where this ADR and the security documents conflict, the security documents prevail until amended through the Architecture Council.

> **Related ADRs:** ADR-002 (Modular Architecture — the audit bounded context BC17 is consumed by every other context through documented contracts), ADR-004 (Multi-Tenant Strategy — tenant-scoped audit chains), ADR-006 (Database Strategy — the audit store is one of the five ratified store types; the outbox pattern is documented in §4.4), ADR-012 (Application Platform and Repository Structure — `packages/observability` provides framework-agnostic audit emission and PHI-redaction helpers), ADR-013 (Authentication and Session Strategy — authentication, session, and context lifecycle events are audited).

> **Predecessor:** None. **Supersedes:** None. **Superseded by:** None.

> This Architectural Decision Record (ADR) documents a significant architectural decision made for the Ibn Hayan Healthcare Operating System. ADRs are immutable historical records — once a decision is superseded, a successor ADR is created rather than editing this one in place.

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

The Ibn Hayan canonical implementation ratifies a dedicated PostgreSQL 17 audit database as the platform's audit store, separate from the transactional database ratified in ADR-006 and ADR-012. The audit store is accessed through a separate connection string (`AUDIT_DATABASE_URL`) and is managed by an independent Prisma schema and migration history under `apps/api/prisma-audit/`. The audit store may run on the same PostgreSQL cluster as the transactional database in development and tests, and may be deployed to separate infrastructure in production without changing audit contracts. The audit store holds no models from the transactional database and no foreign keys to transactional-store tables; cross-database referential integrity is not used because PostgreSQL does not enforce foreign keys across databases and because audit must remain appendable even when the transactional store is unavailable.

Durable delivery from the transactional store to the audit store is provided by a transactional outbox pattern. An `AuditOutboxEvent` table is added to the transactional database; a state mutation (e.g. session creation, session rotation, logout, context selection, context clearing, role assignment) and its outbox record commit atomically in the same transaction. The mutation cannot commit without its outbox record. A separate dispatcher process reads pending outbox records using PostgreSQL-safe claiming (`FOR UPDATE SKIP LOCKED`), appends them to the audit store, and marks them delivered only after successful audit-store insertion. An existing `eventId` in the audit store is treated as an idempotent success: the outbox record is marked delivered without producing a duplicate audit record. Failed delivery leaves the outbox record pending; bounded retry is applied. Multiple dispatcher instances are safe because claiming is row-locked.

Tamper-evidence is provided by HMAC-SHA-256 chained integrity records. Each audit event belongs to exactly one chain: `tenant:<tenantId>` for tenant-scoped events, `platform` for tenant-less events (e.g. pre-authentication events). Within a chain, events are ordered by a monotonic `chainSequence` allocated atomically by the chain-head table. The `integrityHash` of each event binds at least: the integrity key version, the chain scope, the chain sequence, the previous event's integrity hash (null for the first event in a chain), and the canonical payload hash. The canonical payload hash is SHA-256 of a deterministic canonical serialization of the event's logical fields; the same logical event always produces the same canonical payload regardless of JavaScript object insertion order. The integrity key is versioned (`AUDIT_INTEGRITY_KEY_VERSION`); key rotation is supported by allowing multiple key versions to verify simultaneously, with each record carrying the version that produced it. Key-rotation workflow beyond key-version support is deferred to a future ADR.

Immutability is enforced at the database level. The audit store's `audit_events` table has triggers that reject `UPDATE`, `DELETE`, and `TRUNCATE` operations on any row. Application code exposes no update or delete repository method. The runtime database role has only `INSERT` and `SELECT` privileges on audit tables; the migration role is the only role with `ALTER` and `TRUNCATE` privileges, and the migration role is not used at runtime. A separate `AuditChainHead` table is mutable but is treated as implementation metadata, not as an audit record; it is excluded from the integrity chain.

Privacy and secret-redaction are enforced at multiple layers. The audit-emission API in `packages/observability` rejects metadata that contains forbidden keys (password, passwordHash, token, tokenHash, secret, csrf, cookie, authorization, privateKey, connectionString, databaseUrl, and case-insensitive substring matches). The API also enforces maximum object depth, maximum array length, maximum string length, and maximum serialized payload size. For failed-login events, the raw attempted email is never persisted; instead, an HMAC of the normalised identifier is stored using a separate identifier key (`AUDIT_IDENTIFIER_HMAC_KEY`), which is distinct from the integrity key. No password, password hash, raw session token, session-token hash, CSRF token, cookie, authorization header, private key, connection string, environment-variable value, or raw request/response body is ever persisted in audit data. The same generic client response is preserved for failed logins; the audit record does not reveal whether the account exists.

The framework-agnostic audit contracts live in `packages/observability` per ADR-012. The package exports: audit-event draft types, event categories, actor types, outcomes, source types, a stable action-code catalogue, a canonical serializer, a safe metadata validator, a forbidden-key detector, an identifier HMAC helper, an integrity-hash helper, an audit-emitter port, an audit-outbox port, and audit-verification result types. The package does not import NestJS, Prisma, React, or generated database types. The API implements the ports; the audit store and outbox are infrastructure adapters.

Integrity verification is provided by a verifier that can verify a single tenant chain, the platform chain, or all chains. The verifier detects: modified payload, modified previous hash, invalid sequence, missing sequence, duplicated sequence, incorrect key version, and chain fork. The verifier returns a typed result without exposing integrity keys. Every completed verification that the audit store is healthy produces an audit event of its own (`audit.integrity.verified` or `audit.integrity.verification_failed`); the verifier avoids infinite recursion by not auditing verification-of-verification.

The first vertical slice of the audit primitive instruments only the consequential actions that exist today: authentication (login success, login failure, login throttled when safely interceptable, logout, session invalid, session expired, session rotated), request security (Origin denied, CSRF denied), authorization (every allow and deny decision for the existing context permissions), tenant context (viewed, selected, cleared), RBAC (R13 role assignment in the development bootstrap), and the audit system itself (delivery failure, integrity verified, integrity verification failed). No patient, encounter, appointment, billing, inventory, configuration, feature-flag, or audit-management UI functionality is implemented in this batch.

No public audit UI, audit export, regulatory reporting, retention deletion, legal-hold management, customer-facing audit query endpoint, offline audit synchronisation, audit search UI, or arbitrary metadata search is implemented in this batch. Internal repository queries needed for tests and verification are permitted but are not exposed through the public API.

### 1.2 Scope of Application

The decision binds every engineer, every contributor, and every implementation step that touches audit emission, audit storage, audit delivery, audit integrity, audit verification, or audit contracts. It governs the implementation in `apps/api` (where the audit outbox, dispatcher, verifier, and instrumentation live), in `packages/observability` (where the framework-agnostic contracts live), and in `apps/api/prisma-audit/` (where the dedicated audit Prisma schema and migrations live).

The decision does not commit the production infrastructure topology (single PostgreSQL cluster with two databases, separate clusters, managed service, or self-hosted). The decision does not commit the production key-management infrastructure (KMS, HSM, secrets manager, or environment-variable injection). The decision does not commit the dispatcher's runtime topology (in-process periodic timer, separate worker process, or external scheduler); the first slice uses an in-process periodic timer plus an explicit `audit:dispatch` command, both invoking the same dispatcher service. The decision does not commit retention periods (governed by `DATA_RETENTION.md`). The decision does not commit legal-hold workflow (deferred to a future ADR). The decision does not commit the public audit query surface (deferred to a future batch).

### 1.3 Audit-Store Schema Summary

The audit store's `audit_events` table has fields equivalent to:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key. |
| `event_id` | UUID | Stable event identifier for idempotent delivery. Unique. |
| `event_version` | INTEGER | Schema version of the event draft. |
| `occurred_at` | TIMESTAMPTZ | When the action occurred (caller-supplied). |
| `recorded_at` | TIMESTAMPTZ | When the audit store appended the record. |
| `tenant_id` | UUID, nullable | Null for platform-scoped events. |
| `chain_scope` | TEXT | `tenant:<tenantId>` or `platform`. |
| `chain_sequence` | BIGINT | Monotonic within the chain. |
| `previous_integrity_hash` | TEXT, nullable | Null for the first record in a chain. |
| `payload_hash` | TEXT | SHA-256 of the canonical payload. |
| `integrity_hash` | TEXT | HMAC-SHA-256 of the bound fields. |
| `integrity_key_version` | INTEGER | Version of the integrity key that produced `integrity_hash`. |
| `category` | TEXT | Event category (e.g. `security`, `authorization`). |
| `action` | TEXT | Stable action code (e.g. `authentication.login.succeeded`). |
| `actor_type` | TEXT | `USER`, `SYSTEM`, `INTEGRATION`, `ANONYMOUS`. |
| `actor_id` | UUID, nullable | Null for anonymous actors. |
| `subject_identifier_hash` | TEXT, nullable | HMAC of a normalised identifier for failed-login privacy. |
| `session_id` | UUID, nullable | The session involved, when applicable. |
| `resource_type` | TEXT, nullable | The resource type affected, when applicable. |
| `resource_id` | TEXT, nullable | The resource identifier affected, when applicable. |
| `permission_code` | TEXT, nullable | The permission evaluated, for authorization events. |
| `role_codes` | TEXT[] | Roles held by the actor for this event. |
| `outcome` | TEXT | `success`, `failure`, `denied`. |
| `reason_code` | TEXT, nullable | Stable reason code (e.g. `invalid_credentials`, `unknown`). |
| `source` | TEXT | `api`, `dispatcher`, `bootstrap`, `verifier`. |
| `request_id` | TEXT | Stable request identifier. |
| `correlation_id` | TEXT, nullable | Optional correlation identifier. |
| `ip_address` | INET, nullable | Client IP when available. |
| `user_agent` | TEXT, nullable | Bounded, sanitized user-agent string. |
| `scope` | TEXT | Organisational scope description. |
| `previous_state` | JSONB, nullable | State before the action, for state-changing actions. |
| `new_state` | JSONB, nullable | State after the action, for state-changing actions. |
| `metadata` | JSONB | Sanitised, allowlisted metadata. |

Required indexes: `occurred_at`, `(tenant_id, occurred_at)`, `actor_id`, `action`, `category`, `(resource_type, resource_id)`, `outcome`, `request_id`, `(chain_scope, chain_sequence)`. `event_id` is unique.

### 1.4 Outbox Schema Summary

The transactional store's `audit_outbox_events` table has fields equivalent to:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key. |
| `event_id` | UUID | Stable event identifier; unique. |
| `event_version` | INTEGER | Schema version of the event draft. |
| `canonical_event_draft` | JSONB | The full canonical event draft, sanitised. |
| `created_at` | TIMESTAMPTZ | When the outbox row was inserted. |
| `available_at` | TIMESTAMPTZ | When the row became available for dispatch. |
| `attempt_count` | INTEGER | Number of dispatch attempts. |
| `delivered_at` | TIMESTAMPTZ, nullable | When the audit store acknowledged the event. |
| `last_failure_code` | TEXT, nullable | Stable failure code from the last attempt. |
| `last_failure_at` | TIMESTAMPTZ, nullable | When the last attempt failed. |
| `lease_owner` | TEXT, nullable | Identifier of the dispatcher holding the lease. |
| `lease_expires_at` | TIMESTAMPTZ, nullable | When the lease expires. |

Required indexes: `delivered_at` (partial, null-only, for pending lookup), `(delivered_at, available_at)`, `event_id` (unique), `lease_expires_at` (partial, for abandoned-lease sweep).

### 1.5 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — the audit store is foundational; once audit events are flowing, migrating to a different store or a different integrity algorithm requires a documented migration plan and historical re-verification. The framework-agnostic contracts in `packages/observability` preserve some reversibility: the audit-store technology can change without changing emitting modules. |
| Cost of wrong decision | Very high — wrong choice produces audit gaps, audit integrity failures, or compliance defects that are expensive to remediate retroactively. |
| Affected layers | Data Layer (audit store, outbox), Platform Services Layer (dispatcher, verifier), Cross-cutting (audit emission, PHI redaction). |
| Affected principles | P1 (Healthcare First), P5 (Consistency Over Availability for Clinical Data — the outbox preserves audit completeness), P13 (Auditability as Primitive), P18 (Decade-Horizon Viability). |
| ADR required | Yes — this ADR. |

### 1.6 Decision Boundaries

This ADR ratifies the audit-store and integrity strategy for the first vertical slice. It does not ratify every specific audit action code (the catalogue is maintained in `packages/observability` and grows as the platform's surface expands). It does not ratify retention disposal (governed by `DATA_RETENTION.md` and a future retention ADR). It does not ratify legal-hold workflow (deferred to a future ADR). It does not ratify the public audit query surface (deferred to a future batch). It does not ratify alerting or SIEM integration (deferred to a future ADR). It does not commit the production key-management infrastructure (KMS, HSM, secrets manager). It does not commit exact dispatcher scheduling parameters (centrally configured).

---

## 2. Context

### 2.1 The Audit-Store Problem

Audit is a primitive (P13) that governs every consequential action on the platform. The audit store must hold immutable, append-only, tamper-evident records that survive transactional-store outages, that cannot be modified by application code, and that can be verified cryptographically years after the fact. The transactional store cannot satisfy these requirements by construction: transactional tables are mutable, transactional rows are deleted during normal operation, transactional writes compete with audit writes for resources, and a transactional-store compromise would compromise any audit trail stored in the same tables.

The audit store must also be available when the transactional store is healthy: an audit event that cannot be persisted is treated as a critical defect (per `09_SECURITY/AUDIT.md` §4.1). The outbox pattern documented in ADR-006 §4.4 and `09_SECURITY/AUDIT.md` §4.5 is the durable delivery mechanism: a state mutation and its outbox record commit atomically; a separate dispatcher reads the outbox and appends to the audit store; the audit record is preserved even if the audit store is temporarily unavailable.

The audit store must support tenant-scoped integrity chains. A regulator investigating a single tenant must be able to verify that tenant's audit trail without verifying every other tenant's trail. A platform administrator investigating a pre-authentication event must be able to verify the platform chain. Cross-tenant chain contamination is a critical defect.

The audit store must support cryptographic tamper-evidence. An attacker who compromises the audit store must not be able to modify or delete records undetectably. HMAC-SHA-256 chained integrity records provide this property: each record's integrity hash binds the record's payload, the prior record's integrity hash, the chain scope, the chain sequence, and the integrity key version. Modification of any field breaks the chain. The integrity key is separate from the identifier key and is versioned to support rotation.

The audit store must support concurrent appends without forking the chain. Multiple dispatcher instances, multiple API processes, and multiple audit-emission paths may all append to the same chain concurrently. The chain-head table allocates monotonic sequence numbers atomically using row-level locking; concurrent appends produce unique sequence numbers and a single valid chain.

The audit store must not persist secrets. Passwords, password hashes, raw session tokens, session-token hashes, CSRF tokens, cookies, authorization headers, private keys, connection strings, environment-variable values, and raw request/response bodies are forbidden in audit data. Failed-login identifiers are HMAC-hashed with a separate identifier key; the raw attempted email is never persisted.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| P13 (Auditability as Primitive) | Audit is non-negotiable; the audit store must satisfy immutability, append-only, tamper-evidence, and tenant scoping from the first slice. |
| P5 (Consistency Over Availability for Clinical Data) | The outbox pattern preserves audit completeness even when the audit store is temporarily unavailable; a state mutation cannot commit without its outbox record. |
| Tenant isolation (ADR-004) | Audit chains are tenant-scoped; cross-tenant chain contamination is a critical defect. |
| Database strategy (ADR-006) | The audit store is one of the five ratified store types; the outbox pattern is documented in ADR-006 §4.4. |
| Application platform (ADR-012) | `packages/observability` is the ratified location for framework-agnostic audit emission and PHI-redaction helpers. |
| Authentication (ADR-013) | Login, logout, session, context, and RBAC events must be audited; failed-login identifiers must be HMAC-hashed. |
| Security architecture (SYSTEM_ARCHITECTURE §20) | Audit is tightly coupled with security; security-relevant actions are recorded in the audit trail. |
| Audit architecture (SYSTEM_ARCHITECTURE §27) | The audit store is a dedicated store separate from the transactional store, with immutability, append-only, tamper-evidence, and query optimization. |
| Compliance demonstration | Audit is the basis for compliance demonstration; the audit trail's integrity properties are the foundation of compliance. |
| Decade horizon (P18) | The audit store must remain verifiable for ten or more years; the integrity algorithm and key versioning must support rotation without re-architecture. |

### 2.3 Constraints Bounding the Decision

The decision is bounded by ADR-006 (the audit store is one of the five ratified store types; the outbox pattern is documented), ADR-012 (the application platform is TypeScript monorepo with `packages/observability` for audit emission), ADR-013 (authentication, session, and context lifecycle events are audited; failed-login identifiers are HMAC-hashed), and the canonical spine's principle P13 (audit is a primitive). The decision is bounded by the prohibition on SQLite, PGlite, mocks, and embedded databases as the audit store. The decision is bounded by the prohibition on Redis, Kafka, RabbitMQ, BullMQ, or another infrastructure system in this batch. The decision is bounded by the prohibition on editing previously applied migrations.

### 2.4 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md` (Sections 4, 17, 20, 27), `09_SECURITY/AUDIT.md`, ADR-006, ADR-012, and ADR-013. Where this ADR ratifies a specific implementation choice (dedicated PostgreSQL audit database, HMAC-SHA-256 chained integrity, transactional outbox), the choice is an implementation decision that satisfies the architectural commitment of the upstream authority; it does not amend the upstream authority.

### 2.5 Why a Single ADR

The audit-store decision, the integrity-strategy decision, the outbox decision, and the immutability-enforcement decision are tightly coupled — they form a coherent audit primitive. Splitting them across multiple ADRs would produce artificial boundaries and would require cross-ADR coordination that adds overhead without clarity. This ADR consolidates the four decisions into a single ADR for clarity and coherence.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Audit Records Inside the Transactional Tables

**Description:** Store audit records as rows in a mutable `audit_events` table inside the transactional database. The audit table is a normal Prisma model; audit emission inserts a row in the same transaction as the state mutation. No outbox, no separate database, no separate connection string.

| Criterion | Assessment | Verdict |
|---|---|---|
| Operational simplicity | High — one database to provision, monitor, and back up | Favors |
| Audit completeness | High — same-transaction insert guarantees the audit row commits with the mutation | Favors |
| Audit immutability | Low — the audit table is mutable like any other; immutability requires application discipline | Rejects |
| Audit tamper-evidence | Low — the audit table is in the same database as the transactional data; a transactional-store compromise compromises the audit trail | Rejects |
| Audit-store isolation | Low — audit writes compete with transactional writes for resources | Rejects |
| ADR-006 compliance | Rejects — ADR-006 §1.1 mandates a dedicated audit store separate from the transactional store | Rejects |
| SYSTEM_ARCHITECTURE §27.5 compliance | Rejects — the audit store is mandated to be separate | Rejects |

**Verdict: Rejected.** Audit records inside the transactional tables violate ADR-006 §1.1 and SYSTEM_ARCHITECTURE §27.5, which mandate a dedicated audit store separate from the transactional store. The operational simplicity gain is not worth the compromise on immutability, tamper-evidence, and isolation. The same-transaction insert guarantee is preserved by the outbox pattern without sacrificing isolation.

### 3.2 Alternative B — A Separate Schema Inside the Transactional Database

**Description:** Store audit records in a separate PostgreSQL schema (e.g. `audit.audit_events`) inside the transactional database. The schema separation provides logical isolation; the audit schema has its own grants and its own migration history. No separate connection string.

| Criterion | Assessment | Verdict |
|---|---|---|
| Operational simplicity | Medium — one database, one connection string, but a separate schema with its own grants | Mixed |
| Audit completeness | High — same-transaction insert via the outbox or direct insert | Favors |
| Audit immutability | Medium — schema-level grants can restrict UPDATE/DELETE/TRUNCATE, but a database superuser can still modify the rows | Mixed |
| Audit tamper-evidence | Low — the audit schema is in the same database as the transactional data; a database compromise compromises the audit trail | Rejects |
| Audit-store isolation | Low — audit writes compete with transactional writes for the same database's resources | Rejects |
| ADR-006 compliance | Mixed — a separate schema is "separate" at the logical level but not at the store level | Mixed |
| Production deployability | Low — cannot move the audit store to separate infrastructure without re-architecture | Rejects |

**Verdict: Rejected.** A separate schema inside the transactional database provides logical isolation but not operational or infrastructure isolation. A database compromise compromises both stores. The audit store cannot be moved to separate infrastructure without re-architecture. The schema-separation model is a half-measure that satisfies the letter of ADR-006 but not the spirit.

### 3.3 Alternative C — A Dedicated PostgreSQL Audit Database (Selected)

**Description:** Store audit records in a dedicated PostgreSQL 17 database, separate from the transactional database. The audit database has its own connection string (`AUDIT_DATABASE_URL`), its own Prisma schema, its own migration history, its own grants, and its own backup and recovery strategy. The audit database may run on the same PostgreSQL cluster as the transactional database in development and tests, and may be deployed to separate infrastructure in production without changing audit contracts. No cross-database foreign keys exist between the transactional store and the audit store. Durable delivery is provided by a transactional outbox in the transactional store.

| Criterion | Assessment | Verdict |
|---|---|---|
| Operational simplicity | Medium — two databases to provision, monitor, and back up; the outbox adds a dispatcher process | Acceptable |
| Audit completeness | High — the outbox preserves audit records even when the audit store is unavailable | Favors |
| Audit immutability | High — the audit database's runtime role has only INSERT and SELECT privileges; triggers reject UPDATE/DELETE/TRUNCATE | Favors |
| Audit tamper-evidence | High — HMAC-SHA-256 chained integrity records; the integrity key is separate from the identifier key and is not stored in the audit database | Favors |
| Audit-store isolation | High — the audit database is logically and operationally separated; a transactional-store compromise does not compromise the audit trail | Favors |
| ADR-006 compliance | Favors — a dedicated audit database is the ratified default | Favors |
| Production deployability | High — the audit database can be moved to separate infrastructure without changing audit contracts | Favors |
| Decade-horizon viability | High — the audit database can evolve independently of the transactional store | Favors |

**Verdict: Accepted.** A dedicated PostgreSQL audit database satisfies ADR-006 §1.1, SYSTEM_ARCHITECTURE §27.5, and the canonical spine's P13 commitment. The audit store is logically and operationally separated from the transactional store. The outbox pattern preserves audit completeness. The HMAC-SHA-256 chained integrity records provide tamper-evidence. The audit store can be deployed to separate infrastructure without changing audit contracts.

### 3.4 Alternative D — An External Audit/Event Vendor

**Description:** Send audit events to an external audit/event vendor (e.g. a managed SIEM, a managed log-aggregation service, or a managed audit-trail service). The vendor is responsible for immutability, tamper-evidence, retention, and query.

| Criterion | Assessment | Verdict |
|---|---|---|
| Operational simplicity | High — the vendor handles storage, retention, and query | Favors |
| Audit completeness | Medium — depends on the vendor's delivery guarantees; the outbox pattern is still required for the platform's own completeness | Mixed |
| Audit immutability | Medium — depends on the vendor's immutability guarantees; not verifiable by the platform | Mixed |
| Audit tamper-evidence | Low — the platform cannot verify the vendor's tamper-evidence claims; the integrity chain is in the vendor's hands | Rejects |
| Audit-store isolation | High — the vendor's infrastructure is separate from the platform's | Favors |
| Vendor lock-in | High — the audit trail is in the vendor's proprietary format; migration is expensive | Rejects |
| Decade-horizon viability | Low — vendors are acquired, change pricing, change APIs, or shut down; the audit trail must survive vendor changes | Rejects |
| Cost | High — vendor pricing is typically per-event or per-volume; a healthcare platform's audit volume is high | Rejects |

**Verdict: Rejected as the primary audit store.** An external audit/event vendor may be a future complementary consumer of audit events (e.g. for SIEM integration), but it is not the primary audit store. The platform must own its audit trail; the audit trail must survive vendor changes. The integrity chain must be in the platform's hands. SIEM integration is deferred to a future ADR.

### 3.5 Alternative E — A Generic Application Log Collector

**Description:** Send audit events to a generic application log collector (e.g. Elasticsearch, Loki, Datadog Logs). The log collector stores the events as log entries; query is through the log collector's query surface.

| Criterion | Assessment | Verdict |
|---|---|---|
| Operational simplicity | Medium — a log collector is typically already in place for application logs | Favors |
| Audit completeness | Low — log collectors are typically best-effort; events may be dropped under load | Rejects |
| Audit immutability | Low — log collectors are typically mutable; log rotation, retention, and deletion are configurable | Rejects |
| Audit tamper-evidence | Low — log collectors do not provide cryptographic tamper-evidence by default | Rejects |
| Audit-store isolation | Low — audit events are mixed with application logs; no isolation | Rejects |
| ADR-006 compliance | Rejects — a log collector is not a dedicated audit store | Rejects |
| `09_SECURITY/AUDIT.md` §4.6 compliance | Rejects — application logs are not a substitute for the audit store | Rejects |

**Verdict: Rejected.** A generic application log collector is not an audit store. Log collectors are mutable, best-effort, and do not provide cryptographic tamper-evidence. `09_SECURITY/AUDIT.md` §4.6 explicitly states that application logs are not a substitute for the audit store. A log collector may be a future complementary consumer of audit events (e.g. for security monitoring), but it is not the primary audit store.

### 3.6 Comparative Verdict Summary

| Alternative | Verdict | Primary Reason |
|---|---|---|
| A — Audit Records Inside Transactional Tables | Rejected | Violates ADR-006 §1.1 and SYSTEM_ARCHITECTURE §27.5; no immutability, no tamper-evidence, no isolation |
| B — Separate Schema in Transactional Database | Rejected | Logical isolation only; no operational or infrastructure isolation; cannot move to separate infrastructure without re-architecture |
| C — Dedicated PostgreSQL Audit Database | Accepted | Satisfies ADR-006 §1.1, SYSTEM_ARCHITECTURE §27.5, and P13; logical, operational, and infrastructure isolation; deployable to separate infrastructure without changing audit contracts |
| D — External Audit/Event Vendor | Rejected as primary | Vendor lock-in; decade-horizon viability risk; tamper-evidence not verifiable by the platform; may be a future complementary consumer |
| E — Generic Application Log Collector | Rejected | Not an audit store; mutable, best-effort, no tamper-evidence; violates `09_SECURITY/AUDIT.md` §4.6 |

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Audit immutability guaranteed | The dedicated audit database's runtime role has only INSERT and SELECT privileges; triggers reject UPDATE/DELETE/TRUNCATE. Immutability is structural, not application-discipline-based. |
| Audit tamper-evidence guaranteed | HMAC-SHA-256 chained integrity records; tampering is detectable by the verifier. The integrity key is separate from the identifier key and is not stored in the audit database. |
| Audit-store isolation | The audit database is logically and operationally separated from the transactional store; a transactional-store compromise does not compromise the audit trail. |
| Audit completeness | The transactional outbox preserves audit records even when the audit store is unavailable; a state mutation cannot commit without its outbox record. |
| Tenant-scoped integrity chains | Each tenant has an independent integrity chain; a regulator investigating a single tenant can verify that tenant's audit trail without verifying every other tenant's trail. |
| Idempotent delivery | Stable event identifiers ensure that duplicate dispatcher execution does not produce duplicate audit records. |
| Production deployability | The audit database can be moved to separate infrastructure without changing audit contracts; the framework-agnostic contracts in `packages/observability` preserve emitting-module stability. |
| Decade-horizon viability | The integrity algorithm and key versioning support rotation without re-architecture; the audit store can evolve independently of the transactional store. |
| Privacy and secret redaction | Forbidden keys are rejected at the audit-emission API; failed-login identifiers are HMAC-hashed; no secret is ever persisted in audit data. |
| Compliance demonstration | The audit trail's integrity properties are the foundation of compliance demonstration; the verifier produces auditable verification records. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Operational complexity | Two databases to provision, monitor, back up, and recover; the outbox adds a dispatcher process; the integrity keys add a key-management concern. |
| Cross-store transactional coordination | Operations that span the transactional store and the audit store require outbox coordination, not native ACID. The outbox pattern is documented in ADR-006 §4.4 and is the ratified coordination mechanism. |
| Key management | The integrity key and the identifier key must be provisioned, rotated, and protected. Key-rotation workflow beyond key-version support is deferred to a future ADR. |
| Dispatcher failure surface | The dispatcher is a separate failure surface; a dispatcher outage leaves outbox records pending. The dispatcher is bounded-retry and idempotent; bounded retry is the ratified posture. |
| Audit-store scaling | The audit database scales as audit volume grows; partitioning, archival, and retention are future concerns. Retention disposal is governed by `DATA_RETENTION.md` and is deferred to a future ADR. |
| Cost | Two databases incur more infrastructure cost than one, particularly at scale and across regions. |
| Schema evolution across stores | The audit-store schema must evolve independently of the transactional-store schema; the `event_version` field supports backward-compatible evolution. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Per-environment audit database | Each environment (development, test, staging, production) has its own audit database; the disposable test environment uses one PostgreSQL server with two databases. |
| Per-tenant chain initialisation | The first event for a tenant initialises the tenant's chain; the chain-head table is the implementation metadata that tracks the chain head. |
| Per-verification audit event | Every completed verification produces an audit event of its own; the verifier avoids infinite recursion by not auditing verification-of-verification. |
| Framework-agnostic contracts | `packages/observability` exports framework-agnostic audit contracts; the API implements the ports; the audit store and outbox are infrastructure adapters. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Operational complexity | Dedicated data platform team; automated provisioning, backup, and monitoring per database; the dispatcher is a small, well-tested component. |
| Cross-store coordination | Outbox pattern (ratified in ADR-006 §4.4); idempotent delivery; bounded retry. |
| Key management | Key versioning (`AUDIT_INTEGRITY_KEY_VERSION`); separate identifier key (`AUDIT_IDENTIFIER_HMAC_KEY`); key-rotation workflow deferred to a future ADR; placeholder values rejected outside tests; production refuses to start when required audit configuration is invalid. |
| Dispatcher failure surface | Bounded retry; idempotent delivery; abandoned-lease sweep; explicit `audit:dispatch` command for manual invocation; in-process periodic timer for automatic invocation. |
| Audit-store scaling | Indexes on hot query paths; partitioning and archival are future concerns; retention disposal is governed by `DATA_RETENTION.md`. |
| Cost | Capacity planning; tiered storage (hot, warm, cold) is a future concern; archival for stale audit data is a future concern. |
| Schema evolution | `event_version` field; backward-compatible evolution rules; deprecation policy for breaking changes. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This decision is in effect and governs the audit-store and integrity strategy across the Ibn Hayan platform. It is referenced by `SYSTEM_ARCHITECTURE.md` Section 27 (Audit Architecture), by `09_SECURITY/AUDIT.md`, and by the implementation in `apps/api/prisma-audit/`, `apps/api/src/modules/audit/`, and `packages/observability/`. The dedicated audit database, the transactional outbox, the HMAC-SHA-256 chained integrity records, the immutability triggers, the idempotent delivery, and the framework-agnostic contracts are binding on all platform teams. Any deviation requires a documented exception ratified by the Architecture Council.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-19 |
| Version | 1.0.0 |
| Predecessor | None |
| Review cadence | Annual, or upon an audit-store technology change, a separate-cluster promotion to production, a key-rotation workflow ratification, or a legal-hold or retention-disposal ADR |
| Supersession criteria | Demonstrated infeasibility at scale, emergence of a superior audit-store or integrity strategy that satisfies the same constraints, or a regulatory regime that requires a different audit-store model |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The audit team owns the audit store, the dispatcher, the verifier, and the integrity-key management. Backend module owners own the audit instrumentation in their modules. The data platform team owns the audit-database infrastructure. Ownership of audit-store technology selection is delegated to the data platform team under the selection criteria documented in the database documentation.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Key-rotation workflow | How are integrity keys rotated without breaking historical verification? The `integrity_key_version` field supports multiple key versions verifying simultaneously, but the operational workflow (cadence, approval, key-wrapping) is deferred to a future ADR. |
| Retention disposal | How are audit records disposed of at the end of their retention period? Governed by `DATA_RETENTION.md`; the disposal workflow is deferred to a future ADR. |
| Legal hold | How are audit records subject to legal hold preserved? Deferred to a future ADR. |
| Public audit query surface | How are audit records queried by compliance officers and regulators? Deferred to a future batch. |
| Alerting and SIEM integration | How are audit events streamed to a SIEM or alerting system? Deferred to a future ADR. |
| Audit-store partitioning | How does the audit store scale as audit volume grows? Partitioning, archival, and tiered storage are future concerns. |
| Offline audit synchronisation | How are offline audit records synchronised with the central audit trail? Governed by ADR-003; deferred to a future ADR. |
| Audit-store backup and recovery | How is the audit store backed up and recovered? Governed by `09_SECURITY/BACKUP.md` and `09_SECURITY/RECOVERY.md`; the audit-store-specific procedures are deferred to a future ADR. |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if any of the following occurs. The audit-store technology proves unsuitable at scale, requiring a different technology within the same category. A regulatory regime requires a different audit-store model that the current audit store cannot satisfy. A superior integrity algorithm emerges that provides stronger tamper-evidence with equivalent performance. A key-rotation workflow is ratified that requires changes to the integrity-key model. A legal-hold or retention-disposal ADR is ratified that requires changes to the audit-store schema or the immutability controls.

Any such amendment follows the Architecture Council ratification process defined in `SYSTEM_ARCHITECTURE.md`. Amendments increment this ADR's version and record the predecessor version. The dedicated-audit-database model itself is treated as the most stable element and is the last to be amended; the integrity algorithm and key-management model are the most volatile and may change with a successor ADR.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-002 (Modular Architecture) | Constrains this ADR — the audit bounded context BC17 is consumed by every other context through documented contracts. |
| ADR-004 (Multi-Tenant Strategy) | Constrains this ADR — audit chains are tenant-scoped; cross-tenant chain contamination is a critical defect. |
| ADR-006 (Database Strategy) | Constrains this ADR — the audit store is one of the five ratified store types; the outbox pattern is documented in ADR-006 §4.4. |
| ADR-012 (Application Platform and Repository Structure) | Constrains this ADR — `packages/observability` is the ratified location for framework-agnostic audit emission and PHI-redaction helpers. |
| ADR-013 (Authentication and Session Strategy) | Constrains this ADR — authentication, session, and context lifecycle events are audited; failed-login identifiers are HMAC-hashed. |
| Future ADR: Key Rotation Workflow | Will define the integrity-key and identifier-key rotation workflow. |
| Future ADR: Retention Disposal | Will define the audit-record retention and disposal workflow. |
| Future ADR: Legal Hold | Will define the legal-hold workflow for audit records. |
| Future ADR: SIEM Integration | Will define the streaming of audit events to a SIEM or alerting system. |
