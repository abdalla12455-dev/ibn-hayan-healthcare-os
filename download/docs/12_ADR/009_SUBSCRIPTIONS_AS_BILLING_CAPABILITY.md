# ADR-009: Subscriptions as a Billing Capability
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-009: Subscriptions as a Billing Capability |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Ratified Decision |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review if subscription billing complexity grows to exceed the M09 Billing module surface |
| Audience | Senior software architects, engineering leadership, M09 Billing module owners, BC07 Billing bounded context owners, product council, customer system administrators, finance operations team |
| Scope | The decision to classify subscription billing as a capability under the M09 Billing module rather than as a first-class module. Subscription billing (recurring invoicing, plan-based pricing, dunning, entitlement-state computation, proration, plan upgrade/downgrade) is a Billing capability. The canonical 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 is preserved unchanged. |
| Out of Scope | The specific subscription plan schema, the specific dunning workflow, the specific proration formula, the specific entitlement enforcement mechanism (entitlement enforcement is a BC18 Feature Flags concern per ADR-007), the future ADR that may extract Subscriptions into its own module if complexity warrants |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md` is resolved in favour of `SYSTEM_ARCHITECTURE.md` until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR that either continues the Billing-capability classification or extracts Subscriptions into its own module surface |

> **Document Purpose:** This ADR ratifies the classification of subscription billing as a capability under the M09 Billing module. Subscriptions is not a first-class module; it does not appear in the canonical 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2; it does not have its own M-code; it does not have its own bounded context. Subscription billing capabilities — recurring invoicing, plan-based pricing, dunning, entitlement-state computation, proration, plan upgrade/downgrade logic — are owned by the BC07 Billing bounded context and exposed through the M09 Billing module surface. The downstream file `docs/07_MODULES/SUBSCRIPTIONS.md` is to have its useful content merged into `docs/07_MODULES/BILLING.md` as a "Subscription Billing" section, after which `SUBSCRIPTIONS.md` is to be deleted from the module directory. The M19 module slot, which `SUBSCRIPTIONS.md` erroneously claimed, is freed for the canonical M19 Localization module (one of the seven missing canonical module files identified in audit F-04).

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 7.2 (bounded context catalogue — BC07 Billing), Section 7.7 (bounded-context-to-module mapping deviations — no Subscription deviation), Section 9 (Modular Architecture), Section 13 (Module Architecture). `PRODUCT_BIBLE.md` Section 19.2 (19-module catalogue — M09 Billing, no Subscriptions module), Section 17 (Business Model — subscription billing as a capability), Section 19.4 (dependency hierarchy — Financial layer).

> **Related ADRs:** ADR-002 (Modular Architecture), ADR-005 (Module Architecture), ADR-007 (Feature Flags Packaging — entitlement enforcement is a BC18 concern), ADR-008 (Rejection of Façade Module Category — both ADRs reinforce the rejection of new module categories).

> **Predecessor:** None. **Supersedes:** None. **Superseded by:** None.

> **Audit Findings Resolved:** F-03 part 3 (SUBSCRIPTIONS.md claims M19 module identity, colliding with canonical Localization), MBV-3 (SUBSCRIPTIONS.md claims M19 module identity, colliding with canonical Localization; Subscriptions consumes BC07 Billing but claims its own module surface without canonical ratification). This ADR replaces the invented module identity with a Billing-capability classification.

> This Architectural Decision Record (ADR) documents a significant architectural decision made for the Ibn Hayan Healthcare Operating System. ADRs are immutable historical records — once a decision is superseded, a new ADR is created rather than editing this one in place.

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

Subscription billing is a capability under the M09 Billing module, not a first-class module. The canonical 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 is preserved unchanged; no Subscriptions module is added, and no M-code is assigned to Subscriptions. Subscription billing capabilities — recurring invoicing, plan-based pricing, dunning, entitlement-state computation, proration, plan upgrade/downgrade logic — are owned by the BC07 Billing bounded context and exposed through the M09 Billing module surface. The downstream file `docs/07_MODULES/SUBSCRIPTIONS.md` is to have its useful content merged into `docs/07_MODULES/BILLING.md` as a "Subscription Billing" section; after the merge, `SUBSCRIPTIONS.md` is to be deleted from the module directory. The M19 module slot, erroneously claimed by `SUBSCRIPTIONS.md`, is freed for the canonical M19 Localization module.

This decision is reversible. A future ADR may extract Subscriptions into its own module surface (assigned a new M-code, e.g., M20 or M21) when one of the triggers documented in §6.1 fires. The extraction will preserve BC07's contract surface; downstream consumers will not experience a contract break, only a relocation of the surface through which they access subscription billing contracts.

### 1.2 Scope of Application

The decision applies to the classification of subscription billing capabilities in the Ibn Hayan platform. It binds every downstream document that currently claims a module identity for Subscriptions, every future downstream document that might be tempted to claim such an identity, and every engineer or documentation author who must decide where to document subscription billing capabilities. The decision does not prescribe the specific subscription plan schema, the specific dunning workflow, the specific proration formula, or the specific entitlement enforcement mechanism; those are owned by the BC07 Billing bounded context reference documentation and by the M09 Billing module reference documentation.

The decision is scoped to the current state of subscription billing in the platform. It does not foreclose the future extraction of Subscriptions into its own module via a new ADR if warranted (see §6.1). The classification as a Billing capability is the default posture for v1 and remains the posture until a successor ADR extracts Subscriptions into its own module.

### 1.3 Subscription Billing as a Billing Capability

The classification of subscription billing as a Billing capability has the following consequences:

| Aspect | First-Class Module (rejected) | Billing Capability (ratified) |
|---|---|---|
| Module identity | Subscriptions would be M19 (or another M-code) | Subscriptions has no M-code; it is not in the module catalogue |
| Bounded context ownership | Subscriptions would own a bounded context (BC-??) | Subscription billing capabilities are owned by BC07 Billing |
| Data ownership | Subscriptions would own subscription data (plans, subscriptions, invoices, dunning state) | Subscription data is owned by BC07 Billing; subscription plans are billing plans; subscription invoices are billing invoices; dunning state is billing dunning state |
| Contract surface | Subscriptions would expose its own contracts | Subscription billing contracts are exposed through the M09 Billing module surface |
| Documentation location | `docs/07_MODULES/SUBSCRIPTIONS.md` | Subscription billing content is merged into `docs/07_MODULES/BILLING.md` as a "Subscription Billing" section |
| Metadata table | Module metadata (M-code, BC ownership, dependency declarations) | Section metadata within the Billing module reference (capability name, owning BC, consuming modules) |
| Audit trail | Subscription audit category (would have been required) | Audit entries for subscription operations are attributed to BC07 Billing |
| Permission policy | Subscription-specific permission policy | Subscription billing operations are gated by BC07 Billing permission policies |
| Dependency declarations | Other modules would declare a dependency on the Subscriptions module | Other modules declare a dependency on M09 Billing (which they likely already declare for transactional billing) |

The right column is ratified by this ADR. The left column is explicitly rejected.

### 1.4 Subscription Billing Capabilities Owned by BC07

The following subscription billing capabilities are owned by BC07 Billing and exposed through M09 Billing:

| Capability | Description |
|---|---|
| Subscription Plan Lifecycle | Creation, modification, deprecation, and cancellation of subscription plans. A subscription plan defines the recurring billing terms (price, billing interval, included features, trial period) for a product offering. |
| Recurring Invoice Generation | Automatic generation of invoices at the billing interval defined by the subscription plan. Invoices are owned by BC07 Billing and follow the standard invoice lifecycle. |
| Plan-Based Pricing Rules | Application of plan-specific pricing rules (tiered pricing, per-seat pricing, usage-based pricing, flat-rate pricing) to recurring invoices. Pricing rules are owned by BC07 Billing. |
| Dunning Workflow | Management of failed payment retries, dunning notices, and subscription suspension/cancellation after repeated failures. Dunning state is owned by BC07 Billing. |
| Entitlement-State Computation | Computation of which features a tenant is entitled to based on their subscription plan. Entitlement state is computed by BC07 Billing and enforced by BC18 Feature Flags (per ADR-007). The computation is a Billing concern; the enforcement is a Feature Flags concern. |
| Proration Rules | Computation of prorated charges when a subscription is upgraded, downgraded, or cancelled mid-cycle. Proration is owned by BC07 Billing. |
| Plan Upgrade/Downgrade Logic | Processing of plan changes, including proration, entitlement-state recomputation, and immediate or scheduled effect. Plan changes are owned by BC07 Billing. |

### 1.5 Decision Properties

| Property | Value |
|---|---|
| Reversibility | High — extraction is a future ADR away; contract surface is preserved |
| Cost of Wrong Decision | Low — if subscription billing complexity grows beyond what M09 can accommodate, extraction is bounded and contract-preserving |
| Affected Layers | Module layer (M09 surface expands to include subscription billing); Experience layer (subscription management UI is co-located with billing UI); Financial layer (subscription billing is in the Financial layer alongside transactional billing) |
| Affected Principles | P2 (Configuration Before Customization — subscription plans are configuration data), P4 (Modular Boundaries — the classification respects module boundaries; BC07 contracts are not violated), P10 (Multi-Tenancy — subscription state is tenant-scoped), P13 (Audit as Primitive — subscription operations are audited under BC07) |
| ADR Required | Yes — this ADR |

### 1.6 Decision Boundaries

The decision ratifies the classification of subscription billing as a Billing capability; it does not ratify the specific subscription plan schema, the specific dunning workflow, the specific proration formula, or the specific entitlement enforcement mechanism. Those are owned by the BC07 Billing bounded context reference documentation and by the M09 Billing module reference documentation. The decision does not modify the canonical 19-module catalogue; the catalogue is preserved unchanged. The decision does not preclude a future extraction ADR; it explicitly preserves extractability. The decision does not merge a Subscriptions bounded context into BC07 Billing; no Subscriptions bounded context exists in `SYSTEM_ARCHITECTURE.md` Section 7.2, and none is created by this ADR.

---

## 2. Context

### 2.1 The Billing Bounded Context

`SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC07 Billing as a first-class bounded context with domain responsibility "invoice lifecycle, payment processing, accounts receivable, dunning." The bounded context owns invoices (invoice header, line items, totals, tax, payment terms), payments (payment attempts, payment methods, refunds), accounts receivable (customer balances, aging, write-offs), and dunning (failed payment retries, dunning notices, suspension/cancellation). BC07 is exposed through the M09 Billing module, which provides the administrative experience for billing management and the runtime contracts for billing evaluation.

### 2.2 Subscription Billing in the Product Bible

`PRODUCT_BIBLE.md` Section 17 (Business Model) describes the Ibn Hayan subscription billing model: customers subscribe to one of four editions (Trial, Essentials, Professional, Enterprise), pay recurring fees based on plan and quantity, and may upgrade or downgrade their plan. The Business Model treats subscription billing as a capability of the platform's commercial operations, not as a module. The Business Model does not assign a module identity to Subscriptions; it describes subscription billing as a billing concern.

### 2.3 The Pre-ADR State of SUBSCRIPTIONS.md

The downstream file `docs/07_MODULES/SUBSCRIPTIONS.md` (written during the Wave 1 documentation generation) claims M19 module identity for Subscriptions. The file documents subscription plan lifecycle, recurring invoice generation, plan-based pricing rules, dunning workflow, entitlement-state computation, proration rules, and plan upgrade/downgrade logic — all of which are Billing capabilities owned by BC07 Billing. The file consumes contracts from BC07 Billing but presents as a separate module surface, colliding with the canonical M19 Localization module.

The defect is the claim of module identity for a capability that is naturally a Billing concern. The content of `SUBSCRIPTIONS.md` is substantive and useful (652 lines); the useful content is to be merged into `docs/07_MODULES/BILLING.md` as a "Subscription Billing" section before `SUBSCRIPTIONS.md` is deleted.

### 2.4 The Architectural Question

The architectural question is whether to ratify Subscriptions as a first-class module (expanding the 19-module catalogue to 20) or to classify subscription billing as a capability under M09 Billing (preserving the 19-module catalogue). The question is load-bearing because it determines the shape of the module catalogue and the location of subscription billing documentation.

### 2.5 Forces Driving the Decision

| Force | Description |
|---|---|
| Catalogue Stability | The 19-module catalogue is already at the upper bound of cognitive manageability. Adding a 20th module for Subscriptions increases the catalogue surface without proportional architectural benefit. |
| Operational Adjacency | Subscription billing and transactional billing are operationally adjacent — both are financial operations, both produce invoices, both manage accounts receivable, both interact with payment gateways. Co-locating them in a single module surface mirrors how finance operations teams think about billing. |
| Industry Convention | Production SaaS platforms conventionally co-locate subscription billing with transactional billing in the billing module. Deviating from this convention would impose a learning cost without proportional architectural benefit. |
| Data Ownership Coherence | Subscription billing data (plans, subscriptions, invoices, dunning state) is naturally billing data. Creating a separate Subscriptions bounded context would require splitting the billing data model across two bounded contexts, producing data ownership incoherence. |
| Entitlement Enforcement Separation | Entitlement enforcement is a BC18 Feature Flags concern per ADR-007. Subscription billing computes entitlement state (which plan a tenant is on, which features are unlocked); BC18 enforces entitlement (which features are actually exposed to the tenant). The computation is a Billing concern; the enforcement is a Feature Flags concern. This separation is preserved by classifying subscription billing under M09. |
| M19 Slot Recovery | Rejecting the Subscriptions module identity frees the M19 slot for the canonical Localization module, which is one of the seven missing canonical module files identified in audit F-04. The slot recovery unblocks downstream module file creation. |
| Single Dependency Declaration | Consumer modules that need subscription billing contracts (e.g., to check entitlement state) declare a single dependency on M09 Billing (which they likely already declare for transactional billing) and access both transactional and subscription billing contracts through the M09 surface. The dependency graph is simpler. |

### 2.6 Constraints Bounding the Decision

The decision is bounded by several explicit constraints. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC07 Billing as a bounded context; subscription billing capabilities fall within its domain responsibility. `PRODUCT_BIBLE.md` Section 19.2 defines the 19-module catalogue; Subscriptions is not in it. `PRODUCT_BIBLE.md` Section 17 describes subscription billing as a billing capability, not as a module. ADR-001 (Configuration-Driven Architecture) ratifies configuration as the primary adaptation mechanism; subscription plans are configuration data. ADR-002 (Modular Architecture) ratifies the modular monolith default; the classification is consistent with this default. ADR-007 (Feature Flags Packaging) establishes that entitlement enforcement is a BC18 concern; entitlement-state computation (the subscription billing side) is a BC07 concern.

### 2.7 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md` and `PRODUCT_BIBLE.md`. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC07 Billing as a bounded context; Section 9 defines the Modular Architecture; Section 13 defines the Module Architecture. `PRODUCT_BIBLE.md` Section 17 describes subscription billing as a capability; Section 19.2 defines the 19-module catalogue (no Subscriptions module). This ADR does not introduce new architectural commitments; it ratifies a classification decision that resolves the ambiguity in the pre-ADR state and replaces the invented module identity in `SUBSCRIPTIONS.md` with a Billing-capability classification.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Ratify Subscriptions as M20 (First-Class Module)

**Description:** Subscriptions is ratified as a first-class module with M-code M20. The 19-module catalogue is expanded to 20. Subscription billing capabilities are owned by a new BC20 Subscriptions bounded context. Consumer modules that need subscription billing contracts declare a dependency on M20.

**Verdict:** Rejected for v1. The first-class module is the architecturally cleaner long-term posture if subscription billing complexity grows, but it imposes v1 costs that are not justified by current requirements: a 20-module catalogue at v1 general availability, a separate bounded context that splits the billing data model, and a separate dependency declaration for every consumer module. The first-class module is the right answer if and when subscription billing complexity grows beyond what M09 can accommodate; it is not the right answer at v1.

**Future Trigger:** This alternative becomes the recommended extraction path when the triggers in §6.1 fire.

### 3.2 Alternative B — Fold Subscriptions into a Future Identity & Access Module

**Description:** Subscription state (which plan a tenant is on, which features are unlocked) is conceptually adjacent to identity and entitlement. Subscriptions is folded into the future M14 Identity & Access module, which expands to cover entitlements alongside identity and access management.

**Verdict:** Rejected. This alternative conflates financial and identity domains. Subscription billing is fundamentally a financial concern (recurring invoicing, payment processing, dunning); folding it into Identity & Access would put financial operations in an identity module, violating the bounded context separation principle in `SYSTEM_ARCHITECTURE.md` Section 7.5. Entitlement-state computation is a Billing concern (it depends on plan and payment state); entitlement enforcement is a Feature Flags concern (per ADR-007). Neither is an Identity & Access concern.

### 3.3 Alternative C — Keep SUBSCRIPTIONS.md in `docs/07_MODULES/` with a Header Note

**Description:** `SUBSCRIPTIONS.md` remains in `docs/07_MODULES/` but loses its M19 claim. A header note clarifies that Subscriptions is a capability under M09 Billing, not a canonical module. The file is treated as a "module-adjacent" reference.

**Verdict:** Rejected. This alternative creates a hybrid file type that does not fit cleanly into the module directory. It leaves `docs/07_MODULES/` with a file that is not a module, which is structurally inconsistent and confuses engineers navigating the directory. The clean option is to merge the useful content into `BILLING.md` and delete `SUBSCRIPTIONS.md`.

### 3.4 Alternative D — Defer the Decision

**Description:** Leave `SUBSCRIPTIONS.md` in `docs/07_MODULES/` with its M19 claim. Defer the classification decision to a future Architecture Council session.

**Verdict:** Rejected. The M19 claim collides with the canonical Localization module, which is one of the seven missing canonical module files (audit F-04). Deferring the decision blocks the creation of the Localization module file. The decision must be made now to unblock downstream work.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Module Catalogue Stability | The 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 is preserved unchanged. No module is added; no module is removed. |
| M19 Slot Recovered | The M19 module slot, erroneously claimed by `SUBSCRIPTIONS.md`, is freed for the canonical Localization module. The Localization module file can be created in Phase 4 of the remediation plan without conflict. |
| Data Ownership Coherence | Subscription billing data (plans, subscriptions, invoices, dunning state) is owned coherently by BC07 Billing. No data model split across bounded contexts. |
| Single Dependency Declaration | Consumer modules declare a single dependency on M09 Billing and access both transactional and subscription billing contracts through the M09 surface. |
| Entitlement Enforcement Separation Preserved | Entitlement-state computation (Billing concern) and entitlement enforcement (Feature Flags concern per ADR-007) remain cleanly separated. |
| Audit Trail Coherence | Audit entries for subscription operations are attributed to BC07 Billing, alongside transactional billing audit entries. No separate subscription audit category. |
| Useful Content Preserved | The substantive content of `SUBSCRIPTIONS.md` (652 lines covering subscription plan lifecycle, recurring invoicing, dunning, proration, plan changes) is preserved by merging into `BILLING.md` as a "Subscription Billing" section. No content is lost. |
| Future Extractability | The classification is reversible. A future ADR can extract Subscriptions into its own module without breaking contracts. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| BILLING.md Grows | The `docs/07_MODULES/BILLING.md` file expands to include subscription billing content. The file becomes longer and covers both transactional and subscription billing. The growth is bounded (the subscription content is ~600 lines) but non-zero. |
| Content Merge Required | The useful content of `SUBSCRIPTIONS.md` must be merged into `BILLING.md`. The merge is a downstream correction performed in Phase 3 of the remediation plan; this ADR authorises the merge but does not perform it. |
| SUBSCRIPTIONS.md Deletion Required | `docs/07_MODULES/SUBSCRIPTIONS.md` must be deleted after the content merge. The deletion is a downstream correction performed in Phase 2 of the remediation plan. |
| Cross-References Must Be Updated | Downstream documents that currently link to `docs/07_MODULES/SUBSCRIPTIONS.md` (e.g., `docs/02_PRODUCT/MODULES.md`, `docs/00_PROJECT/BUSINESS_MODEL.md`, `docs/02_PRODUCT/FEATURES.md`) must be updated to point to the "Subscription Billing" section of `BILLING.md`. |
| Subscriptions Loses Module-Level Visibility | In the module catalogue view (e.g., `docs/02_PRODUCT/MODULES.md`), Subscriptions no longer appears as a module. Engineers looking for subscription billing capabilities must look in the Billing module documentation instead. This is the intended consequence of the classification, but it requires clear cross-referencing to avoid orphaning the content. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Bounded Context Catalogue Unchanged | `SYSTEM_ARCHITECTURE.md` Section 7.2 is unchanged. No Subscriptions bounded context is added or removed. |
| Module Catalogue Unchanged | `PRODUCT_BIBLE.md` Section 19.2 is unchanged. The 19-module catalogue is preserved. |
| `SYSTEM_ARCHITECTURE.md` Section 7.7 Unchanged | No Subscriptions deviation is added to the deviation catalogue. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This ADR was accepted by the Architecture Council on
2026-07-18. The decision is authoritative and binding on all downstream
documentation. Any future change or reversal requires a superseding ADR
accepted through the Architecture Council.

### 5.2 Accepted Decision Conditions

The following conditions form part of the accepted decision:

- The Council confirms that Subscriptions is not a first-class module and is classified as a capability under M09 Billing.
- The Council confirms that the M19 module slot is freed for the canonical Localization module.
- The Council confirms that the useful content of `SUBSCRIPTIONS.md` is to be merged into `BILLING.md` as a "Subscription Billing" section.
- The Council confirms that entitlement-state computation is a BC07 Billing concern and entitlement enforcement is a BC18 Feature Flags concern (per ADR-007).
- The Council commits to reviewing the decision if subscription billing complexity grows beyond what M09 Billing can accommodate.

### 5.3 Implementation Triggers

Upon ratification, the following implementation work is authorised (but not performed by this ADR):

- **Phase 3 downstream content correction:** Merge useful content from `docs/07_MODULES/SUBSCRIPTIONS.md` into `docs/07_MODULES/BILLING.md` as a "Subscription Billing" section.
- **Phase 2 downstream structural correction:** Delete `docs/07_MODULES/SUBSCRIPTIONS.md` after the content merge is complete.
- **Phase 3 downstream content correction:** Update cross-references in `docs/02_PRODUCT/MODULES.md`, `docs/00_PROJECT/BUSINESS_MODEL.md`, `docs/02_PRODUCT/FEATURES.md`, and any downstream doc that links to `SUBSCRIPTIONS.md`.
- **Phase 4 missing module file creation:** Create `docs/07_MODULES/LOCALIZATION.md` for the canonical M19 Localization module (no longer blocked by Subscriptions collision).

---

## 6. Future Notes

### 6.1 Extraction Triggers

The Billing-capability classification continues until one of the following triggers fires. When a trigger fires, the Architecture Council must convene to either ratify a successor extraction ADR or explicitly extend the classification.

| Trigger | Description |
|---|---|
| Subscription Billing Complexity Growth | Subscription billing complexity (plan schema, pricing models, dunning workflow, proration rules) grows to a point where co-location with transactional billing in M09 produces a module surface that is no longer coherent. Threshold: `BILLING.md` exceeds 2,000 lines, or subscription billing content exceeds 50% of the module surface. |
| Independent Scaling | Subscription billing operations (e.g., recurring invoice generation, dunning campaigns) require independent scaling from transactional billing operations. Threshold: subscription billing CPU or I/O exceeds 30% of M09's resource budget. |
| Subscription-Specialised Roles | Subscription billing requires specialised roles (e.g., Subscription Operations Manager) that do not overlap with transactional billing roles. Threshold: subscription-specific permission policies exceed 20 distinct permissions. |
| Module Catalogue Pressure | The Architecture Council decides to expand the module catalogue for other reasons, making the marginal cost of adding M20 for Subscriptions acceptable. |
| Customer Demand | Customer demand for module-level treatment of subscription billing (e.g., for integration with external subscription management systems) justifies extraction. |
| v2 Major Release | The v2 major release planning cycle is a natural point to reconsider the classification, regardless of whether any specific trigger has fired. |

### 6.2 Extraction Process

When a trigger fires, the extraction proceeds as follows:

1. **Draft extraction ADR** citing the trigger that fired and the proposed extraction approach.
2. **Assign new M-code** to the extracted Subscriptions module (e.g., M20 or M21, depending on catalogue state at extraction time).
3. **Define BC20 Subscriptions bounded context** in `SYSTEM_ARCHITECTURE.md` Section 7.2, with domain responsibility for subscription plan lifecycle, recurring invoicing, dunning, proration, and plan changes. Note: entitlement-state computation may remain with BC07 Billing (as a query against subscription state) or migrate to BC20 (as a subscription-specific computation); the extraction ADR must decide.
4. **Amend `PRODUCT_BIBLE.md` Section 19.2** to add the new module to the catalogue.
5. **Migrate the M09 subscription billing surface** to the new module surface. Contract surface is preserved; downstream consumers experience a relocation, not a contract break.
6. **Update downstream documentation** to reference the new module surface instead of M09.
7. **Mark this ADR as Superseded** by the extraction ADR.

### 6.3 Open Questions for Downstream Correction Decisions

| Question | Description |
|---|---|
| Subscription Billing Section Structure | How should the "Subscription Billing" section within `BILLING.md` be structured? Proposed: subsections for plan lifecycle, recurring invoicing, pricing rules, dunning, proration, plan changes, entitlement-state computation. This is a downstream correction decision. |
| Entitlement-State Query Contract | What query contract should BC07 Billing expose for entitlement-state lookups? BC18 Feature Flags (per ADR-007) consumes this contract to enforce entitlements. The contract definition is owned by BC07 Billing reference documentation. |
| Cross-Reference Conventions | How should the subscription billing section in `BILLING.md` be cross-referenced from `docs/00_PROJECT/BUSINESS_MODEL.md` and `docs/02_PRODUCT/FEATURES.md`? This is a downstream correction decision. |

### 6.4 Relationship to Other ADRs

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Compatible. Subscription plans are configuration data; the classification does not violate configuration-over-customization. |
| ADR-002 (Modular Architecture) | Compatible. The classification is consistent with the modular monolith default. |
| ADR-005 (Module Architecture) | Compatible. The classification respects module boundary rules. |
| ADR-007 (Feature Flags Packaging) | Compatible. Entitlement-state computation (Billing) and entitlement enforcement (Feature Flags) are cleanly separated. |
| ADR-008 (Rejection of Façade Module Category) | Compatible. Both ADRs reinforce the rejection of new module categories; Subscriptions is folded into an existing module rather than becoming a façade module. |
| ADR-010 (Inventory Bounded Context and Module Packaging) | Independent. Inventory and Subscriptions are unrelated domain concerns. |

---

> **End of ADR-009.** This ADR is a ratified decision record. Implementation work authorised by this ADR is performed in separate phases per the remediation plan; this ADR does not perform that work.
