# ADR-004: Multi-Tenant Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to adopt multi-tenancy as the default isolation model for the Ibn Hayan platform, with logical isolation as the default mechanism and physical isolation available for tenants with strict requirements. All services, data stores, workflows, and audit records are multi-tenant by construction, not retrofitted.
>
> **Status:** Accepted · **ADR Number:** 004 · **Last Updated:** 2026-07-18
> **Supersedes:** None · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 3, 4 (P12), 10, 11, 23
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

Ibn Hayan adopts multi-tenancy as the default isolation model. One platform serves many tenant organizations; tenant data is isolated through tenant-scoped storage and tenant-aware access controls. Logical isolation is the default; physical isolation (single-tenant dedicated deployment) is available for tenants with strict regulatory, performance, or data residency requirements. All services, data stores, workflows, and audit records are multi-tenant by construction, not retrofitted to support multi-tenancy.

### 1.2 Scope of the Decision

The decision applies to all platform layers, all services, all data stores, all workflows, and all audit records. It governs how tenants are isolated, how tenant context is propagated, how tenant lifecycle is managed, and how deployment models relate to the multi-tenant architecture.

| Aspect | Decision |
|---|---|
| Default isolation | Logical (tenant-scoped storage, tenant-aware access controls) |
| Available isolation | Logical + dedicated compute; physical (single-tenant dedicated deployment) |
| Tenant context | Established at the edge, propagated through all layers, enforced at the data layer |
| Tenant lifecycle | Provisioned → Onboarded → Active → Suspended → Migrating → Archived → Purged |
| Deployment models | Multi-tenant SaaS (default); single-tenant dedicated (exception); hybrid; air-gapped; region-specific |
| Code paths | Same multi-tenant code paths for all deployment models; no per-model forks |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Very low — multi-tenancy is foundational; converting to single-tenancy requires re-platforming |
| Cost of Wrong Decision | Very high — wrong choice produces either isolation failures (catastrophic in healthcare) or unsustainable economics |
| Affected Layers | All layers |
| ADR Required | Yes — this ADR |

---

## 2. Context

### 2.1 The Isolation Problem

Ibn Hayan serves a customer spectrum from solo practices to public health systems. Each customer's data must be isolated from every other customer's data, with the strength of isolation appropriate to the customer's regulatory and contractual requirements. The architectural question is how that isolation is achieved.

Three isolation mechanisms are available in principle: logical isolation (tenant-scoped storage and access controls on shared infrastructure), physical isolation (dedicated infrastructure per tenant), and hybrid isolation (some tenants on shared infrastructure, some on dedicated). Ibn Hayan uses logical isolation as the default, with physical isolation available as a deployment choice.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Customer spectrum | The Product Bible targets customers from solo practices to public health systems. Single-tenancy cannot serve this spectrum economically. |
| Economics | Multi-tenancy amortizes infrastructure cost across tenants, enabling the Essentials edition and small-clinic customers. |
| Time-to-value | Multi-tenancy enables self-service onboarding; single-tenancy requires per-customer provisioning. |
| Upgrades | Multi-tenancy enables platform-wide upgrades; single-tenancy requires per-customer upgrade management. |
| Decade horizon | Multi-tenancy preserves the ability to add customers without per-customer infrastructure scaling. |
| Product differentiation | Multi-tenant SaaS is a load-bearing differentiator against single-tenant competitors. |
| Regulatory compliance | Logical isolation, properly implemented, satisfies most regulatory requirements; physical isolation is available for strict cases. |

### 2.3 Constraints

The decision is constrained by:

- The Product Bible's commitment to four editions serving six customer size tiers, all on one platform.
- The Product Bible's commitment to multi-tenant SaaS as a product differentiator.
- The architectural principle of multi-tenancy by default (P12).
- The decade horizon, which requires that the isolation model remain viable as the customer base grows.

---

## 3. Alternatives

### 3.1 Alternative A: Single-Tenancy as Default

In a single-tenant default, each customer receives dedicated infrastructure. The platform code is the same across customers, but each customer has a separate deployment.

| Criterion | Single-Tenant Default | Verdict |
|---|---|---|
| Isolation strength | High — physical separation | Favors |
| Economics | Low — infrastructure cost per customer | Rejects |
| Time-to-value | Low — per-customer provisioning | Rejects |
| Upgrades | Low — per-customer upgrade management | Rejects |
| Customer spectrum | Fails — cannot serve small clinics economically | Rejects |
| Decade horizon | Fails — infrastructure scaling is unsustainable | Rejects |
| Multi-tenancy principle | Violates P12 | Rejects |

**Verdict:** Rejected. Single-tenancy as the default is economically unsustainable and incompatible with the customer spectrum and the Product Bible's commitments. Single-tenancy is available as a deployment choice for tenants who require it, but it is not the default.

### 3.2 Alternative B: Per-Tenant Database (Silo Model)

In a silo model, each tenant has a separate database, but the application tier is shared. Tenant context is established at the edge and used to route to the correct database.

| Criterion | Silo Model | Verdict |
|---|---|---|
| Isolation strength | High — separate databases | Favors |
| Economics | Medium — application tier is shared, but per-database overhead | Mixed |
| Time-to-value | Medium — per-tenant database provisioning | Mixed |
| Upgrades | Medium — schema migrations per database | Mixed |
| Cross-tenant operations | Difficult — cross-database queries are expensive | Rejects |
| Operational complexity | High — many databases to manage | Rejects |
| Decade horizon | Survives but at high operational cost | Mixed |

**Verdict:** Rejected as the default. The silo model is available as a deployment choice for tenants with strict data isolation requirements, but it is not the default. The operational complexity and the difficulty of cross-tenant operations (e.g., platform-wide reporting, aggregate analytics) make it unsuitable as the default.

### 3.3 Alternative C: Logical Multi-Tenancy with Shared Infrastructure

In a logical multi-tenant model, all tenants share infrastructure (application tier and data store). Tenant data is isolated through tenant-scoped storage (every record carries a tenant identifier; queries are tenant-scoped) and tenant-aware access controls (every access is checked against tenant context).

| Criterion | Logical Multi-Tenancy | Verdict |
|---|---|---|
| Isolation strength | Medium — depends on implementation discipline | Mixed |
| Economics | High — infrastructure amortized across tenants | Favors |
| Time-to-value | High — self-service onboarding | Favors |
| Upgrades | High — platform-wide upgrades | Favors |
| Cross-tenant operations | Easy — same database, tenant-scoped queries | Favors |
| Operational complexity | Low — one set of infrastructure to manage | Favors |
| Multi-tenancy principle | Honors P12 | Favors |
| Decade horizon | Served | Favors |

**Verdict:** Accepted. Logical multi-tenancy is the default isolation model. Physical isolation is available as a deployment choice for tenants who require it.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Economics | Infrastructure cost is amortized across tenants, enabling small-clinic customers and the Essentials edition. |
| Time-to-value | Self-service onboarding is feasible; new tenants can be provisioned without infrastructure scaling. |
| Upgrades | Platform-wide upgrades apply to all tenants simultaneously; no per-tenant upgrade management. |
| Cross-tenant operations | Platform-wide reporting, aggregate analytics, and platform operations are feasible. |
| Decade horizon | The isolation model remains viable as the customer base grows. |
| Product differentiation | Multi-tenant SaaS is a load-bearing differentiator. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Isolation depends on discipline | Cross-tenant data leakage is the most catastrophic failure mode; preventing it requires discipline at every layer. |
| Noisy neighbor risk | A tenant that consumes excessive resources can degrade service for other tenants. |
| Per-tenant performance variability | Shared infrastructure means per-tenant performance depends on other tenants' load. |
| Compliance demonstration | Demonstrating compliance to regulators may require additional controls and documentation. |
| Per-tenant key management | Tenant-specific encryption keys add key management complexity. |
| Migration complexity | Migrating a tenant between isolation levels (e.g., logical to physical) is a significant operational undertaking. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Tenant context as platform primitive | Tenant context is established at the edge and propagated through all layers; it is a load-bearing platform concept. |
| Tenant management service | A tenant management service handles tenant lifecycle, configuration, and migration. |
| Per-tenant quotas and rate limits | Quotas and rate limits are configured per tenant to prevent noisy neighbor issues. |
| Per-tenant observability | Telemetry is tenant-scoped, supporting per-tenant diagnosis and reporting. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Isolation discipline | Tenant context propagation (SYSTEM_ARCHITECTURE.md Section 10.3); tenant-scoped access controls at the data layer; defense in depth (Section 20.8); zero-trust posture (Section 20.9). |
| Noisy neighbor | Per-tenant rate limiting at the edge; per-tenant resource quotas at the service level; per-tenant workload separation for resource-intensive operations (Section 10.7). |
| Performance variability | Per-tenant performance monitoring; capacity planning; tenant-specific scaling for high-load tenants. |
| Compliance | Compliance documentation per region; audit trail of tenant isolation controls; third-party audits. |
| Key management | Tenant-specific keys managed through the key management service; key rotation without downtime. |
| Migration | Defined migration tooling; data integrity and audit continuity preserved across migration (SYSTEM_ARCHITECTURE.md Section 23.7). |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This decision is in effect and governs the isolation model across the platform. It is referenced by SYSTEM_ARCHITECTURE.md Sections 3, 4 (P12), 10, 11, and 23, and is realized in detail by the tenant management and security architecture documentation.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Review cadence | Annual, or upon a tenant isolation incident |
| Supersession criteria | Demonstrated isolation failure, or a regulatory regime that requires a different default |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The security architecture team owns the isolation controls. The tenant management service team owns the tenant lifecycle.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Per-tenant encryption keys | Will all tenants have tenant-specific encryption keys, or only tenants on certain editions? |
| Tenant-to-tenant data sharing | Will the platform support controlled tenant-to-tenant data sharing (e.g., for referral networks)? |
| Tenant migration automation | How automated is the migration between isolation levels? |
| Tenant observability boundaries | What tenant-level telemetry is visible to the tenant vs. only to the platform operator? |
| Public health system tenancy | How are national-scale public health system tenants modeled — as single tenants or as multi-level tenant hierarchies? |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if:

- A tenant isolation incident reveals a structural weakness in the logical isolation model.
- A regulatory regime requires a different default isolation model for a region.
- A new isolation mechanism emerges that superiorly balances economics, isolation strength, and operational simplicity.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Depends on this ADR — configuration is tenant-scoped. |
| ADR-002 (Modular Architecture) | Depends on this ADR — modules are multi-tenant by construction. |
| ADR-003 (Local-First Strategy) | Constrained by this ADR — offline data is tenant-scoped. |
| ADR-006 (Database Strategy) | Constrained by this ADR — data store organization is tenant-aware. |
| Future ADR: Tenant Isolation Controls | Will define the specific controls that enforce tenant isolation at each layer. |
