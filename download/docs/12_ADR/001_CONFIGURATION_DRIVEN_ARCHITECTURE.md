# ADR-001: Configuration-Driven Architecture
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

> **Document Purpose:** Decision to adopt a configuration-driven architecture in which modules, workflows, forms, business rules, and behavioral variations are declared through configuration data rather than hard-coded. The platform adapts to each tenant through configuration, not through customization, forking, or per-tenant code branches.
>
> **Status:** Accepted · **ADR Number:** 001 · **Last Updated:** 2026-07-18
> **Supersedes:** None · **Superseded by:** None
> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 3, 4 (P11), 8, 15
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

Ibn Hayan adopts configuration-driven architecture as the primary mechanism by which the platform adapts to tenant need. All behavioral variation that differs across tenants, editions, regions, facilities, and care teams is expressed as configuration data — versioned, validated, governed, and audited — and evaluated by the platform at runtime. Code is not modified per tenant; per-tenant branches, forks, and customizations are architecturally forbidden.

### 1.2 Scope of the Decision

The decision applies to all platform behavior that varies across customers, including but not limited to:

| Variation Surface | Realized Through Configuration |
|---|---|
| Clinical workflow definitions | Workflow definitions as configuration records |
| Documentation templates | Template definitions stored as configuration |
| Forms and field sets | Form schema configuration |
| Business rules | Rule definitions evaluated by the rules engine |
| Permission policies | Role-permission mappings as configuration |
| Notification templates | Template definitions and routing rules |
| Pricing schedules | Pricing rules as configuration |
| Regulatory regime overlays | Regional configuration overlays |
| Module enablement | Tenant composition configuration |
| Feature exposure | Feature flag configuration |

### 1.3 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — once customers depend on the configurable surface, reverting requires platform-wide migration |
| Cost of Wrong Decision | High — wrong choice produces either a customization-driven services business or a frozen product that cannot adapt |
| Affected Layers | All layers above the data layer |
| ADR Required | Yes — this ADR |

---

## 2. Context

### 2.1 The Adaptation Problem

Healthcare organizations vary along many dimensions: specialty, size, region, regulatory regime, payment model, care model, integration landscape, organizational structure, and clinical practice. A platform that serves this spectrum must adapt to each customer's specific shape. The architectural question is *how* that adaptation occurs.

Three adaptation mechanisms are available in principle: customization (per-customer code changes), configuration (data declared within supported schemas and evaluated at runtime), and composition (selection and assembly of pre-built modules). Ibn Hayan uses composition for module-level variation (ADR-002) and configuration for behavior-level variation within a module.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Decade Horizon | The platform must remain viable for ten or more years per customer. Customization debt accumulates and becomes unsupportable within that horizon. |
| Multi-Tenancy | A multi-tenant platform cannot support per-tenant code paths without forking the platform per tenant, which destroys the multi-tenant model. |
| Upgradability | Customizations break on upgrade. Customers who customize cannot adopt new releases without re-implementing their customizations, producing release-gridlock. |
| Auditability | Regulatory investigations require reconstruction of system configuration at the time of a clinical event. Customizations are not reliably auditable; configuration is. |
| Supportability | Per-tenant code paths cannot be supported at scale. The support organization cannot reason about behavior that exists only for one customer. |
| Time-to-Value | Customization is slow (engineering engagement per customer). Configuration is fast (tenant administrator applies existing capabilities). |
| Total Cost of Ownership | Customization's apparent lower upfront cost (build only what the customer needs) is offset by higher lifetime cost (maintenance, upgrade pain, support overhead). |

### 2.3 Constraints

The decision is constrained by:

- The Product Bible's commitment to four editions (Essentials, Professional, Enterprise, Public Sector) serving six customer size tiers and 30 clinic types — all on one platform.
- The Product Bible's commitment to configuration-over-customization as a product differentiator against Epic, Cerner, Athenahealth, Odoo Healthcare, ERPNext Healthcare, and generic Clinic Management Systems.
- The architectural principle of multi-tenancy by default (P12), which forbids per-tenant code paths in shared services.
- The decade horizon, which forbids architectural choices that accumulate unpayable debt.

---

## 3. Alternatives

### 3.1 Alternative A: Customization-Driven Architecture

In a customization-driven architecture, customer need is met by modifying the platform's code per customer. Each customer has a fork, a branch, or a set of customer-specific patches. This is the model used by traditional enterprise healthcare software (e.g., Epic's Chronicles-based customizations, Cerner's Millennium implementations).

| Criterion | Customization-Driven | Verdict |
|---|---|---|
| Adaptability to any customer need | High — anything can be built | Favors |
| Upgradability | Low — customizations break on upgrade | Rejects |
| Multi-tenancy | Incompatible | Rejects |
| Auditability | Low — customizations are not reliably captured | Rejects |
| Supportability | Low — per-customer code cannot be supported at scale | Rejects |
| Decade horizon | Fails — customization debt becomes unpayable | Rejects |
| Product Bible alignment | Explicitly forbidden as a differentiator | Rejects |

**Verdict:** Rejected. Customization-driven architecture is incompatible with multi-tenancy, with the decade horizon, and with the Product Bible's identity commitments.

### 3.2 Alternative B: Composition-Only Architecture

In a composition-only architecture, customer need is met by selecting and assembling pre-built modules, with no behavioral variation within a module. A cardiology clinic and a dental clinic would receive different modules but identical behavior within each module.

| Criterion | Composition-Only | Verdict |
|---|---|---|
| Adaptability within a specialty | Low — cannot express specialty-specific workflows | Rejects |
| Adaptability across regions | Low — cannot express regional regulatory variation | Rejects |
| Multi-tenancy | Compatible | Favors |
| Upgradability | High — modules are pre-built and versioned | Favors |
| Supportability | High — limited behavioral variation | Favors |
| Decade horizon | Survives but cannot serve the customer spectrum | Rejects |

**Verdict:** Rejected as insufficient. Composition is necessary but not sufficient; behavioral variation within a module is required to serve the customer spectrum. ADR-002 (Modular Architecture) adopts composition; this ADR adopts configuration as the within-module variation mechanism.

### 3.3 Alternative C: Hybrid Customization and Configuration

In a hybrid model, most adaptation is configuration, but a small set of customer needs is met through controlled customization (e.g., a "extensions framework" that allows tenant-specific code to run within a sandbox).

| Criterion | Hybrid | Verdict |
|---|---|---|
| Adaptability to edge cases | High — customization escapes the configuration ceiling | Favors |
| Upgradability | Medium — sandboxed customizations are less brittle than forks but still require maintenance | Mixed |
| Multi-tenancy | Compatible if sandbox is enforced | Favors |
| Supportability | Medium — sandboxed customizations are isolatable but not zero-cost | Mixed |
| Decade horizon | Survives if sandbox is disciplined; fails if sandbox becomes a customization channel in disguise | Risk |

**Verdict:** Deferred, not rejected. A sandboxed extension framework is a future capability (SYSTEM_ARCHITECTURE.md Section 22.6) that the architecture must not preclude. The default remains pure configuration; sandboxed extension is a future escape hatch, not a current architectural commitment.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Multi-tenancy preserved | One platform serves all tenants without per-tenant code paths. |
| Upgradability preserved | All tenants can adopt new releases without re-implementing adaptations. |
| Auditability preserved | Configuration is versioned and audited; system state at any historical moment is reconstructable. |
| Time-to-value reduced | Tenant administrators apply existing capabilities without engineering engagement. |
| Supportability preserved | The support organization reasons about a finite, documented configurable surface. |
| Decade horizon preserved | Configuration debt is bounded and recoverable; customization debt is unbounded. |
| Product differentiation | Configuration-over-customization is a load-bearing differentiator against named competitors. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Configuration surface complexity | The configurable surface is large and must be designed, documented, governed, and tested as a first-class product. |
| Configuration schema evolution | Schemas evolve under backward-compatibility rules, requiring discipline and migration paths. |
| Configuration performance overhead | Runtime evaluation of configuration adds latency; caching and efficient evaluation are required. |
| Configuration governance overhead | Governance (review, authorization, audit) is a continuous operational cost. |
| Edge cases require platform extension | Some customer needs cannot be met through existing configuration and require platform extension through ADR ratification. |
| Learning curve for tenants | Tenant administrators must understand the configurable surface; documentation and tooling are required. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Configuration service as critical platform service | The configuration service becomes a load-bearing dependency; its availability and performance are platform-critical. |
| Configuration tooling investment | Configuration editors, validators, diff tools, and migration tools become first-class platform investments. |
| Configuration as product surface | The configurable surface is itself a product, with its own roadmap, owned by the product organization. |

### 4.4 Mitigations

| Negative Consequence | Mitigation |
|---|---|
| Configuration surface complexity | Invest in configuration architecture (CONFIGURATION_ARCHITECTURE.md), schema documentation, and configuration tooling. |
| Schema evolution | Adopt strict backward-compatibility rules and deprecation policy (SYSTEM_ARCHITECTURE.md Section 30.4). |
| Performance overhead | Multi-level caching, efficient evaluation, and observability of configuration resolution. |
| Governance overhead | Tiered governance: low-risk changes delegated, high-risk changes reviewed, with audit trail. |
| Edge cases | ADR process for platform extension; sandboxed extension framework as future escape hatch. |
| Learning curve | Tenant onboarding, configuration documentation, and configuration review tooling. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This decision is in effect and governs all behavioral variation in the platform. It is referenced by SYSTEM_ARCHITECTURE.md Sections 3, 4 (P11), 8, and 15, and is realized in detail by CONFIGURATION_ARCHITECTURE.md.

### 5.2 Ratification

| Property | Value |
|---|---|
| Ratified by | Architecture Council |
| Ratification date | 2026-07-18 |
| Review cadence | Annual, or upon material change to the configuration model |
| Supersession criteria | Demonstrated infeasibility at scale, or a superior adaptation mechanism emerging |

### 5.3 Owner

The Office of the Chief Software Architect owns this decision. The configuration service team owns its realization. The product organization owns the configurable surface as a product.

---

## 6. Future Notes

### 6.1 Open Questions

| Question | Notes |
|---|---|
| Extension framework scope | What tenant-authored extension mechanisms, if any, will be supported, and under what sandboxing? See SYSTEM_ARCHITECTURE.md Section 22.6. |
| Configuration marketplace | Will curated configuration packages be offered to tenants as a productized capability? |
| Configuration complexity budget | What is the maximum acceptable complexity of the configurable surface, and how is it measured? |
| AI-assisted configuration | Will AI features be used to recommend configuration to tenants based on their context? |

### 6.2 Evolution Triggers

This ADR will be amended or superseded if:

- A new adaptation mechanism emerges that is superior to configuration in adaptability, upgradability, and auditability.
- The configuration surface becomes unsupportable at scale, requiring a structural change to the configuration model.
- A regulatory regime requires adaptation that cannot be expressed through configuration, forcing a re-evaluation of the customization prohibition.

### 6.3 Related Decisions

| ADR | Relationship |
|---|---|
| ADR-002 (Modular Architecture) | Companion decision — composition handles module-level variation; this ADR handles within-module variation. |
| ADR-004 (Multi-Tenant Strategy) | Depends on this ADR — multi-tenancy requires configuration as the adaptation mechanism. |
| Future ADR: Extension Framework | Will define the sandboxed extension escape hatch (Section 3.3 of this ADR). |
