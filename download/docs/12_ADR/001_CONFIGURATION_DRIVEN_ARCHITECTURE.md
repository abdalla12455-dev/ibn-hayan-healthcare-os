# ADR-001: Configuration-Driven Architecture
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-001: Configuration-Driven Architecture |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Ratified Decision |
| Version | 2.0.0 |
| Status | Ratified |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment |
| Audience | Senior software architects, engineering leadership, module owners, configuration service team, product council, customer system administrators |
| Scope | The decision to adopt configuration as the primary adaptation mechanism for the Ibn Hayan platform; the alternatives considered with explicit verdicts; the positive, negative, and neutral consequences; and the conditions under which the decision may be revisited |
| Out of Scope | Implementation details of the configuration service, configuration schema definitions, configuration tooling specifications, configuration validation rule implementations, the specific configuration key catalogue |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md` is resolved in favour of `SYSTEM_ARCHITECTURE.md` until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR or an explicit version increment of this ADR, recorded in the platform CHANGELOG |

> **Document Purpose:** This ADR ratifies configuration as the primary adaptation mechanism for the Ibn Hayan Healthcare Operating System. It rejects customization-driven and composition-only alternatives, defers sandboxed extension as a future escape hatch for capability that cannot be expressed through configuration, and treats the configuration surface as a first-class architectural concern with its own layer, validation framework, and audit trail. ADRs are immutable historical records — once a decision is superseded, a successor ADR is created rather than editing this one in place.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Sections 2.2, 4.3 (P2), 4.4 (P3), 4.10 (P10), 4.18 (P18), 8, 9, 15, 22, 27, 30.5; `PRODUCT_BIBLE.md` Sections 5.3 (P-2), 5.4 (P-3), 6.3 (D-2), 6.4 (D-3), 13.

> **Predecessor:** v1.0.0 (initial ratification). **Supersedes:** v1.0.0 in full. **Superseded by:** None.

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

The Ibn Hayan Healthcare Operating System adapts to customer-specific requirements exclusively through declarative, version-controlled, tenant-scoped configuration. Source-level customization is rejected as a delivery mechanism: the platform does not maintain customer-specific branches, customer-specific builds, or customer-specific patches. Every behavioural variation that differs across customers, editions, regions, facilities, and care teams is expressed as configuration data that is validated, versioned, audited, and evaluated by the platform at runtime. This decision ratifies what `PRODUCT_BIBLE.md` Section 5.3 (Core Principle P-2) commits to at the product level and what `SYSTEM_ARCHITECTURE.md` Sections 4.3 (Principle P2), 8, and 15 elaborate at the architectural level. Configuration is not a settings file appended to a customizable product; it is the platform's primary adaptation surface and a load-bearing architectural concern in its own right.

### 1.2 Scope of Application

The decision applies to every customer-specific adaptation request, every module extension decision, every integration scope decision, and every regional adaptation requirement. The variation surface includes clinical workflow definitions, documentation templates, forms and field sets, business rules, permission policies, notification templates, pricing schedules, regulatory regime overlays, module enablement, and feature exposure. Where adaptation cannot be expressed through configuration, the appropriate response is platform evolution through a ratified ADR — not a customer-specific customization. The decision does not preclude a future sandboxed extension as a deferred escape hatch (Section 6.1), but it does preclude per-customer source modification as a routine or exceptional delivery mechanism. This scope is binding on engineering, on professional services, and on customer onboarding.

### 1.3 Configuration as First-Class Architectural Concern

The configuration surface is treated as a first-class architectural concern with its own layer in the platform architecture (`SYSTEM_ARCHITECTURE.md` Section 15), its own validation framework with five rule categories (Structural, Referential, Semantic, Contextual, Regulatory), and its own audit trail distinct from operational audit (`SYSTEM_ARCHITECTURE.md` Sections 8.6, 15.6). The platform maintains a configuration key catalogue as a canonical reference, an eight-layer precedence model (platform default → edition → tenant → facility → department → care team → user → session), and a configuration sandbox for testing changes before production application. These commitments are not optional refinements; they are the structural expression of the decision. A platform that adopts configuration-driven adaptation without these commitments accrues an unbounded configuration surface that cannot be governed, validated, or audited, and therefore fails the decision's purpose.

### 1.4 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — once customers depend on the configuration surface, reverting requires a platform-wide migration |
| Cost of Wrong Decision | High — wrong choice produces either a customization-driven services business or a frozen product that cannot adapt |
| Affected Layers | All layers above the data layer (Experience, Edge, Orchestration, Domain, Platform Services) |
| Affected Principles | P2 (Configuration Before Customization), P3 (One Platform), P10 (Multi-Tenancy), P18 (Decade-Horizon Viability) |
| ADR Required | Yes — this ADR |

### 1.5 Decision Boundaries

The decision ratifies configuration as the primary adaptation mechanism; it does not ratify every specific configuration key, schema, or tool. The configuration surface itself is defined in `CONFIGURATION_ARCHITECTURE.md` and evolves under the platform's configuration governance, not under this ADR. The decision does not commit the platform to a specific configuration storage technology, a specific configuration evaluation engine, or a specific configuration tooling stack — those are implementation choices governed by selection criteria, not architectural commitments. The decision also does not preclude a future sandboxed extension framework; it defers that framework as a non-primary escape hatch, with the default and the burden of proof remaining on pure configuration. The boundaries of this decision are therefore structural, not implementational.

---

## 2. Context

### 2.1 The Adaptation Problem

Healthcare organizations vary along many dimensions: specialty, size, region, regulatory regime, payment model, care model, integration landscape, organizational structure, and clinical practice. A platform that serves this spectrum — from a solo practitioner to a multinational hospital network — must adapt to each customer's specific shape. The architectural question is *how* that adaptation occurs: through per-customer source modification, through composition of pre-built modules, through declarative configuration, or through some combination. The platform's commitment to serving four editions, six customer size tiers, and thirty clinic types on one code base (`PRODUCT_BIBLE.md` Section 5.4, Core Principle P-3) sharpens this question. Any adaptation mechanism that cannot scale across that spectrum without forking the platform is architecturally infeasible for Ibn Hayan.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Decade Horizon | The platform must remain viable for ten or more years per customer (`SYSTEM_ARCHITECTURE.md` Section 2.2). Customization debt accumulates and becomes unsupportable within that horizon. |
| Multi-Tenancy | A multi-tenant platform cannot support per-tenant code paths without forking per tenant, which destroys the multi-tenant model (`SYSTEM_ARCHITECTURE.md` Section 4.10, P10). |
| Upgradability | Customizations break on upgrade. Customers who customize cannot adopt new releases without re-implementing customizations, producing release-gridlock. |
| Auditability | Regulatory investigations require reconstruction of system configuration at the time of a clinical event. Customizations are not reliably auditable; configuration is (`SYSTEM_ARCHITECTURE.md` Section 27). |
| Supportability | Per-tenant code paths cannot be supported at scale. The support organization cannot reason about behaviour that exists only for one customer. |
| One-Platform Principle | `PRODUCT_BIBLE.md` Section 5.4 (P-3) and `SYSTEM_ARCHITECTURE.md` Section 4.4 (P3) commit to a single code base serving all customers; per-customer customization violates this commitment directly. |

### 2.3 Constraints Bounding the Decision

The decision is bounded by several explicit constraints inherited from upstream authority. The Product Bible's commitment to configuration-over-customization as a product differentiator (`PRODUCT_BIBLE.md` Section 5.3) makes customization architecturally forbidden, not merely discouraged. The Product Bible's commitment to one platform serving all customer tiers (`PRODUCT_BIBLE.md` Section 6.4, Design Principle D-3) makes per-customer forks a violation of product identity. The architectural principle of multi-tenancy by default (`SYSTEM_ARCHITECTURE.md` Section 4.10, P10) forbids per-tenant code paths in shared services. The decade-horizon principle (`SYSTEM_ARCHITECTURE.md` Section 4.18, P18) forbids architectural choices that accumulate unpayable debt. These constraints are not negotiable in this ADR; they are inherited and binding on every alternative evaluated in Section 3.

### 2.4 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md` and `PRODUCT_BIBLE.md`. `PRODUCT_BIBLE.md` Section 5.3 (Core Principle P-2) commits the product to configuration-before-customization; Section 6.3 (Design Principle D-2) elaborates the architectural consequence — a layered configuration model, a validation framework, and an audit trail. `SYSTEM_ARCHITECTURE.md` Section 4.3 (Principle P2) ratifies configuration as the primary adaptation surface; Section 8 defines the configuration-driven architecture; Section 15 defines the configuration strategy with the eight-layer model and the five validation rule categories. This ADR does not introduce new architectural commitments; it ratifies the decision implied by those upstream authorities, documents the alternatives considered, and records the conditions under which the decision may be revisited.

### 2.5 Adaptation Spectrum Coverage

The decision must serve the full Ibn Hayan customer spectrum: four editions (Essentials, Professional, Enterprise, Public Sector), six customer size tiers from solo practitioner to multinational hospital network, and thirty clinic types spanning primary care, specialty care, dental, mental health, allied health, and institutional care (`PRODUCT_BIBLE.md` Sections 14, 15, 16). Each cell in this spectrum has distinct operational reality — different regulatory regimes, different payment models, different care-team compositions, different integration landscapes. An adaptation mechanism that serves one cell but not another fails the one-platform commitment. Configuration-driven adaptation is the only mechanism evaluated in Section 3 that can serve the entire spectrum without forking the platform per cell, per edition, or per region.

---

## 3. Alternatives Considered

### 3.1 Comparison of Alternatives

Four adaptation mechanisms were considered against six criteria drawn from the architectural principles and the decade horizon. The comparison is summarized below; each alternative is then examined in detail with an explicit verdict.

| Criterion | Customization-Driven | Composition-Only | Configuration-Driven | Sandboxed Extension |
|---|---|---|---|---|
| Multi-tenancy compatibility | Incompatible | Compatible | Compatible | Compatible if sandbox enforced |
| Upgradability | Low — breaks on upgrade | High — modules versioned | High — config versioned | Medium — sandboxed code requires maintenance |
| Adaptability to customer reality | High — anything buildable | Low — no within-module variation | High — within configurable surface | High — escapes config ceiling |
| Decade-horizon viability | Fails — unbounded customization debt | Survives but cannot serve spectrum | Survives — bounded, recoverable | Survives if disciplined; fails if abused |
| Auditability | Low — customizations not reliably captured | High — limited variation | High — versioned and audited | Medium — sandboxed code is isolatable but opaque |
| Verdict | REJECTED | REJECTED | ACCEPTED | DEFERRED |

The comparison is read across rows, not down columns. A single failure on a structural criterion (multi-tenancy, decade-horizon viability) is sufficient to reject an alternative regardless of its strengths on other criteria. Composition-only fails on adaptability to customer reality; customization-driven fails on every structural criterion; sandboxed extension is deferred not because it fails any criterion but because it is not yet needed and its activation carries governance costs that should be incurred only when configuration is demonstrably insufficient. The configuration-driven alternative is the only one that passes all six criteria simultaneously, which is why it is accepted as the primary mechanism.

### 3.2 Customization-Driven — REJECTED

In a customization-driven architecture, customer need is met by modifying the platform's source code per customer. Each customer receives a fork, a branch, or a set of customer-specific patches. This is the model historically used by traditional enterprise healthcare software, where implementations accumulate customer-specific code over years of on-site engagement. The criterion-by-criterion evaluation rejects this alternative on every structural axis: it is incompatible with multi-tenancy, it breaks on upgrade, it is not reliably auditable, and it accumulates customization debt that becomes unpayable within the decade horizon. Most fundamentally, it violates `PRODUCT_BIBLE.md` Section 5.3 (P-2) and `SYSTEM_ARCHITECTURE.md` Section 4.3 (P2) directly: these principles do not merely rank customization below configuration; they reject customization outright as a delivery mechanism. **Verdict: Rejected.**

### 3.3 Composition-Only — REJECTED

In a composition-only architecture, customer need is met by selecting and assembling pre-built modules, with no behavioural variation within a module. A cardiology clinic and a dental clinic would receive different modules but identical behaviour within each module. Composition is necessary — Ibn Hayan's modular architecture (`SYSTEM_ARCHITECTURE.md` Section 9; ADR-002) adopts it — but it is not sufficient. Behavioural variation within a module is required to express specialty-specific workflows, regional regulatory overlays, facility-level operating procedures, and care-team-level preferences. A composition-only platform cannot serve the customer spectrum that `PRODUCT_BIBLE.md` Section 5.4 (P-3) commits to serving on one platform. This alternative is therefore rejected as insufficient, while composition itself is retained as the module-level adaptation mechanism that complements configuration. **Verdict: Rejected as insufficient.**

### 3.4 Configuration-Driven — ACCEPTED

The configuration-driven alternative meets every structural criterion. It is compatible with multi-tenancy because every tenant runs the same code paths and varies only through configuration data. It preserves upgradability because configuration is versioned and tenants adopt new releases without re-implementing their adaptations. It is auditable because every configuration change is recorded with the configurator, time, scope, previous value, new value, and validation result (`SYSTEM_ARCHITECTURE.md` Section 15.6). It survives the decade horizon because configuration debt is bounded by the configuration surface and recoverable through rollback. It serves the full customer spectrum because the configuration surface is deep enough — by design and by sustained investment — to express operational reality across specialties, regions, and organizational structures. This alternative is accepted as the primary adaptation mechanism for the platform. **Verdict: Accepted.**

### 3.5 Sandboxed Extension — DEFERRED

A sandboxed extension framework would allow tenant-authored code to run within a controlled sandbox, isolated from platform internals and bounded by resource and capability limits. This alternative is not rejected: the architecture must not preclude it as a future capability (`SYSTEM_ARCHITECTURE.md` Section 22). It is, however, deferred. The default remains pure configuration. Sandboxed extension is reserved for capability that genuinely cannot be expressed through configuration and that cannot wait for platform evolution through a ratified ADR. Activating this escape hatch would require a successor ADR defining the sandbox contract, the capability limits, the security model, the support posture, and the conditions under which a customer may invoke the escape hatch. Until that successor ADR is ratified, sandboxed extension is not an available adaptation mechanism; it is an architectural option preserved for future use. **Verdict: Deferred.**

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Upgrades preserve customer adaptations | All tenants adopt new releases without re-implementing adaptations, because adaptations are configuration data carried forward by the configuration versioning framework. |
| One code base serves all customers | A single code base, a single configuration model, and a single operational runtime serve every customer, satisfying Principle P3 (`SYSTEM_ARCHITECTURE.md` Section 4.4). |
| Customization debt does not accumulate | Because source modification is not a delivery mechanism, the platform cannot accrue per-customer code debt. Configuration debt is bounded by the configuration surface and recoverable through rollback. |
| Decade-horizon viability preserved | The platform remains supportable across the decade horizon (`SYSTEM_ARCHITECTURE.md` Section 2.2; Principle P18) because no customer accumulates unsupportable per-tenant code paths. |
| Auditability preserved | Every configuration change is recorded in an immutable audit trail, supporting compliance reporting and incident reconstruction (`SYSTEM_ARCHITECTURE.md` Sections 15.6 and 27). |
| Product differentiation realized | Configuration-over-customization is a load-bearing differentiator against customization-dependent competitors (`PRODUCT_BIBLE.md` Section 13). |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Configuration surface investment | The configuration surface must be deep enough to express operational reality. This requires sustained investment in configuration architecture, schema design, tooling, and documentation (`CONFIGURATION_ARCHITECTURE.md`). |
| Validation framework rigor | Configuration validation must be rigorous across all five rule categories (Structural, Referential, Semantic, Contextual, Regulatory). Weak validation permits unsafe configuration; overly strict validation blocks legitimate adaptation. |
| No source-level changes for customers | Customers who require source-level changes cannot be served. Some prospects will decline to purchase the platform on this basis. This is an accepted cost of the decision, not a defect to be mitigated away. |
| Configuration governance burden | Configuration governance — change approval, compliance review, sandbox testing, change communication — becomes a continuous operational cost borne by the customer and supported by platform tooling. |
| Configuration surface evolution | The configuration surface evolves under backward-compatibility rules. Schema evolution requires discipline, deprecation windows, and migration paths to avoid breaking existing tenant configurations. |
| Runtime evaluation overhead | Runtime evaluation of configuration adds latency and computational overhead. Caching, efficient evaluation, and observability of configuration resolution are required engineering investments. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Configuration as product surface | The configuration surface is itself a product, with its own roadmap, owned by the product organization. This is neither positive nor negative; it is a structural fact of the decision. |
| Configuration service as critical dependency | The configuration service becomes a load-bearing platform dependency. Its availability and performance are platform-critical and are governed by the platform's reliability posture. |
| Customer governance responsibility | Configuration governance becomes a customer responsibility, supported by platform tooling. The platform provides the framework; the customer exercises governance within it. |
| Configuration tooling as first-class investment | Configuration editors, validators, diff tools, migration tools, and rollback tools become first-class platform investments, not peripheral utilities. |

### 4.4 Mitigations

The negative consequences are addressed through structural mitigations rather than through relaxation of the decision. Configuration surface complexity is mitigated by sustained investment in `CONFIGURATION_ARCHITECTURE.md`, schema documentation, and configuration tooling. Schema evolution is mitigated by strict backward-compatibility rules and a deprecation policy (Section 6.3, `SYSTEM_ARCHITECTURE.md` Section 30.5). Runtime overhead is mitigated by multi-level caching, efficient evaluation, and observability of configuration resolution. Governance burden is mitigated by tiered governance: low-risk changes delegated to tenant administrators, high-risk changes reviewed by customer governance bodies, with audit trail throughout. The "no source-level changes" consequence is not mitigated; it is accepted as the defining cost of the decision and as the structural commitment that makes the positive consequences possible.

### 4.5 Consequence Acceptance

The negative consequences are accepted as the cost of the decision, not as defects to be engineered away. The investment required to build a configuration surface deep enough to express operational reality is the price of multi-tenancy at scale. The customers who decline the platform because it will not accept source-level changes are customers the platform has chosen not to serve. The governance burden placed on customers is the price of auditability and of decade-horizon viability. Accepting these costs explicitly — rather than treating them as temporary problems to be solved later — is what distinguishes a ratified decision from a strategic aspiration. The Architecture Council reaffirms this acceptance on v2.0.0.

---

## 5. Status

### 5.1 Current Status

Ratified. This decision is in effect and governs all behavioural variation in the platform. It is referenced by `SYSTEM_ARCHITECTURE.md` Sections 4.3 (Principle P2), 8 (Configuration-Driven Architecture), and 15 (Configuration Strategy), and is realized in detail by `CONFIGURATION_ARCHITECTURE.md`. The decision is binding on all modules, all integrations, all customer onboarding engagements, and all professional-services activities. Ad-hoc deviations are defects and are corrected, not accommodated; a deviation that has been accommodated is a defect that has been institutionalized and must be reversed through the amendment mechanism in Section 5.4.

### 5.2 Ratification and Reaffirmation

This decision was originally ratified by the Architecture Council on v1.0.0 of this ADR. It is hereby reaffirmed on v2.0.0, with the alternatives re-examined, the consequences restated against the current state of the platform, and the future notes updated to reflect the current understanding of the sandboxed-extension escape hatch. The reaffirmation does not change the decision; it records that the decision has been re-examined in light of platform evolution and remains correct. The reaffirmation also folds the v1.0.0 header block into the v2.0.0 metadata-table format adopted across the architecture documentation framework, without altering any substantive commitment.

| Property | Value |
|---|---|
| Original ratification | Architecture Council, v1.0.0 |
| Reaffirmation | Architecture Council, v2.0.0 |
| Supersession criteria | Demonstrated infeasibility at scale, or emergence of a superior adaptation mechanism ratified through a successor ADR |

### 5.3 Ownership and Custodianship

The Architecture Council owns this decision. The Office of the Chief Software Architect is custodian of this ADR and is responsible for its content, its evolution, and its alignment with `SYSTEM_ARCHITECTURE.md`. The configuration service team owns the realization of the configuration-driven architecture. The product organization owns the configuration surface as a product, including its roadmap and its alignment with customer needs. These ownership boundaries are structural; they are not reassigned by reorganization, and they survive transitions of the individuals currently holding them. Conflicts among the owners are escalated to the Architecture Council for adjudication.

### 5.4 Review and Amendment

This ADR is reviewed on amendment, not on a fixed cadence. An amendment is triggered by a material change to the configuration model, by ratification of a successor ADR (notably a future ADR on sandboxed extension), or by demonstrated infeasibility at scale. Amendments are ratified by the Architecture Council and are recorded in the platform CHANGELOG with an explicit version increment. Editorial corrections that do not change the decision do not require ratification; substantive changes do. The boundary between editorial and substantive is itself adjudicated by the Architecture Council when ambiguous.

### 5.5 Companion and Dependent Decisions

This ADR is one of several ratified decisions that together define the platform's adaptation and delivery posture. ADR-002 (Modular Architecture) is a companion decision: composition handles module-level variation, and this ADR handles within-module variation through configuration. ADR-004 (Multi-Tenant Strategy) depends on this ADR: multi-tenancy at scale requires configuration as the adaptation mechanism, because per-tenant code paths would violate tenant isolation. The deferred sandboxed-extension framework referenced in Section 3.5 and Section 6.1 will, if activated, be governed by a successor ADR that defines its contract and its relationship to this decision. The relationships among these ADRs are not incidental; they form the structural spine of the platform's adaptation model.

---

## 6. Future Notes

This section records matters that are not part of the ratified decision but that the architecture expects to revisit under governance. None of the items below is active; all are deferred or anticipated. Recording them here prevents silent drift and ensures that future amendments to this ADR are initiated through the Architecture Council rather than through ad-hoc accommodation.

### 6.1 Sandboxed Extension as Escape Hatch

A sandboxed extension framework is preserved as a future escape hatch for capability that genuinely cannot be expressed through configuration and that cannot wait for platform evolution through a ratified ADR. The escape hatch is deferred, not active: no sandboxed extension mechanism is currently available, and none will be made available without a successor ADR defining the sandbox contract, the capability limits, the security model, the support posture, and the conditions under which a customer may invoke the escape hatch. The architecture must not preclude this future capability (`SYSTEM_ARCHITECTURE.md` Section 22), but it must not depend on it. The default remains pure configuration, and the burden of proof for activating the escape hatch rests on the proposer, not on the architecture.

### 6.2 Configuration Surface Depth Monitoring

The platform monitors the depth of the configuration surface against the operational reality of its customers. If configuration coverage falls below a threshold — measured by the frequency of adaptation requests that cannot be expressed through existing configuration and that therefore require platform evolution — the Architecture Council may activate the sandboxed-extension escape hatch or may prioritize investment in configuration surface expansion. The threshold, the measurement methodology, and the activation criteria are defined by the Architecture Council and recorded in a successor ADR when activated. This monitoring is the early-warning system that prevents the configuration surface from silently falling behind customer need, and it is the structural mechanism that connects this ADR's deferral of sandboxed extension (Section 3.5) to a concrete activation pathway.

### 6.3 Deprecation Policy for Configuration Keys

As the platform evolves, configuration keys are deprecated and replaced. The deprecation policy governs this evolution: deprecated keys are supported through a defined transition window, customers are notified through the platform's change-communication channels, and migration paths are documented. A deprecated key is not removed until the transition window closes and all affected customers have migrated. The deprecation policy is the configuration-surface equivalent of the source-code deprecation policy and is governed by the same architectural commitments (`SYSTEM_ARCHITECTURE.md` Section 30.5). The policy preserves customer trust in the configuration surface: a customer that has invested in configuration must not have that investment invalidated by platform evolution, and the platform's commitment to decade-horizon viability (`SYSTEM_ARCHITECTURE.md` Section 4.18, P18) extends to the customer's configuration investment.

### 6.4 Evolution Triggers

This ADR will be amended or superseded if any of the following triggers fire. First, a new adaptation mechanism emerges that is superior to configuration in adaptability, upgradability, and auditability. Second, the configuration surface becomes unsupportable at scale, requiring a structural change to the configuration model. Third, a regulatory regime requires adaptation that cannot be expressed through configuration, forcing a re-evaluation of the customization prohibition. Fourth, the sandboxed-extension escape hatch is activated through a successor ADR. Each trigger produces an explicit version increment of this ADR or a successor ADR; none is silent, and none is permitted to alter the decision without Architecture Council ratification recorded in the platform CHANGELOG.

### 6.5 Anticipated Successor ADRs

Three successor ADRs are anticipated, each of which would interact with this decision. The first is a future ADR activating the sandboxed-extension escape hatch (Section 6.1), defining the sandbox contract and the activation criteria. The second is a future ADR on configuration surface depth monitoring (Section 6.2), defining the coverage threshold, the measurement methodology, and the response pathway when coverage falls below threshold. The third is a future ADR formalizing the deprecation policy for configuration keys (Section 6.3), codifying the transition windows, the migration-path obligations, and the customer-notification requirements. None of these successor ADRs is currently ratified; their anticipation here records that the architecture expects to revisit each topic under governance, not under ad-hoc decision. The Architecture Council retains the authority to determine when each successor ADR is warranted and to scope its content at the time of ratification.
