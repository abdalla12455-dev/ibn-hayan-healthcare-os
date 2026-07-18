# ADR-010: Inventory Bounded Context and Module Packaging
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-010: Inventory Bounded Context and Module Packaging |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Ratified Decision |
| Version | 1.0.0 |
| Status | Proposed |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review when non-pharmacy inventory module packaging is ready for ratification |
| Audience | Senior software architects, engineering leadership, M05 Pharmacy module owners, BC09 Inventory bounded context owners, supply chain and stock movement domain owners, product council, customer system administrators |
| Scope | The decision to confirm BC09 Inventory as its own bounded context (not absorbed into BC05 Pharmacy), to confirm that Pharmacy (M05) does not universally own all inventory, to confirm that medication inventory may integrate tightly with Pharmacy, to defer the non-pharmacy inventory module packaging decision to a future ADR, and to require that `docs/07_MODULES/INVENTORY.md` (or any successor document) must not claim M07 or any other module code until the future ADR ratifies a module surface for non-pharmacy inventory. The Inventory domain concept is not deleted. |
| Out of Scope | The specific non-pharmacy inventory module packaging decision (deferred to a future ADR); the specific inventory data schema; the specific stock movement workflow; the specific supply chain integration contracts; the future ADR that will ratify non-pharmacy inventory module packaging |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md` is resolved in favour of `SYSTEM_ARCHITECTURE.md` until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR (e.g., ADR-011 or later) that ratifies non-pharmacy inventory module packaging |

> **Document Purpose:** This ADR ratifies the bounded-context status of Inventory and defers the non-pharmacy inventory module packaging decision. BC09 Inventory remains its own bounded context per `SYSTEM_ARCHITECTURE.md` Section 7.2, with domain responsibility for inventory management, supply chain, and stock movement. Pharmacy (M05) does not universally own all inventory; medication inventory may integrate tightly with Pharmacy, but non-pharmacy inventory (e.g., medical supplies, consumables, capital equipment, office supplies) is not universally owned by Pharmacy. The non-pharmacy inventory module packaging decision — whether non-pharmacy inventory is accommodated within M05 Pharmacy via configuration, distributed across multiple modules, or housed in a dedicated module — is deferred to a future ADR. The downstream file `docs/07_MODULES/INVENTORY.md` must not claim M07 (canonical Documents) or any other module code until the future ADR ratifies a module surface for non-pharmacy inventory. The Inventory domain concept is not deleted; BC09 Inventory remains a first-class bounded context with its own data ownership, contracts, and audit trail.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 7.2 (bounded context catalogue — BC09 Inventory), Section 7.5 (contexts own their data), Section 7.7 (bounded-context-to-module mapping deviations — BC09 Inventory within M05 Pharmacy for medication inventory), Section 9 (Modular Architecture), Section 13 (Module Architecture). `MODULE_ARCHITECTURE.md` Section 2.4 (deviation catalogue). `PRODUCT_BIBLE.md` Section 19.2 (19-module catalogue — M05 Pharmacy, M07 Documents; no Inventory module).

> **Related ADRs:** ADR-002 (Modular Architecture), ADR-005 (Module Architecture), ADR-006 (Database Strategy). Future ADR (e.g., ADR-011) will ratify non-pharmacy inventory module packaging.

> **Predecessor:** None. **Supersedes:** None. **Superseded by:** None (future ADR-011 pending for non-pharmacy inventory module packaging).

> **Audit Findings Resolved:** F-05 (duplicated BC09 Inventory ownership between `MODULE_ARCHITECTURE.md` Section 2.4 and `INVENTORY.md`), F-03 part 2 (INVENTORY.md claims M07 module identity, colliding with canonical Documents), MBV-2 (INVENTORY.md claims M07 module identity and BC09 ownership, contradicting `MODULE_ARCHITECTURE.md` Section 2.4). This ADR resolves the ownership dispute by confirming BC09 as its own bounded context and deferring the module packaging decision.

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

The Inventory bounded context (BC09), as defined in `SYSTEM_ARCHITECTURE.md` Section 7.2, retains its full status as a first-class bounded context. BC09 owns its own domain responsibility (inventory management, supply chain, stock movement), its own data (inventory items, stock levels, stock movements, supplier records, purchase orders), its own query contracts (stock-level lookups, movement-history queries, supplier queries), and its own event contracts (stock-changed, reorder-point-reached, purchase-order-received). The bounded context is not absorbed into BC05 Pharmacy; it is not merged with any other bounded context; it does not lose its identity as a first-class domain.

Pharmacy (M05) does not universally own all inventory. The pre-ADR state of `MODULE_ARCHITECTURE.md` Section 2.4 — which stated that "non-pharmacy inventory is accommodated within M05's inventory capability surface or, where deployment requires, as a configuration of M05 rather than as a separate module" — is rejected as overly broad. Medication inventory may integrate tightly with Pharmacy (because medication inventory has pharmacy-specific concerns: dispensing, controlled substance tracking, expiration, lot tracing), but non-pharmacy inventory (medical supplies, consumables, capital equipment, office supplies) is not universally a Pharmacy concern.

The non-pharmacy inventory module packaging decision is deferred to a future ADR (proposed ADR-011). The future ADR will decide whether non-pharmacy inventory is (a) accommodated within M05 Pharmacy via configuration, (b) distributed across multiple modules (e.g., supplies in M18 Reporting's consumables tracking, capital equipment in a future asset management module), or (c) housed in a dedicated module (assigned a new M-code, e.g., M20 or M21). Until the future ADR is ratified, no module code is assigned to non-pharmacy inventory.

The downstream file `docs/07_MODULES/INVENTORY.md` must not claim M07 (canonical Documents) or any other module code. The file's M07 claim is a defect that must be corrected. The Inventory domain concept is not deleted; BC09 Inventory remains a bounded context, and the inventory content of `INVENTORY.md` is to be preserved (in a relocated BC reference document) pending the future ADR.

### 1.2 Scope of Application

The decision applies to the bounded-context status of Inventory and to the module packaging of non-pharmacy inventory. It binds every downstream document that currently claims a module identity for Inventory, every future downstream document that might be tempted to claim such an identity, and every engineer or documentation author who must decide where to document inventory capabilities. The decision does not prescribe the specific inventory data schema, the specific stock movement workflow, or the specific supply chain integration contracts; those are owned by the BC09 Inventory bounded context reference documentation.

The decision is scoped to the current state of inventory in the platform. It does not foreclose the future ratification of a non-pharmacy inventory module via ADR-011 (or a successor); it explicitly defers that decision. The bounded-context status of BC09 Inventory is ratified permanently (subject to a future ADR that might merge BC09 with another bounded context, which is not currently anticipated); the module packaging is deferred.

### 1.3 Inventory as a Bounded Context

The confirmation of BC09 Inventory as its own bounded context has the following consequences:

| Aspect | Absorbed into Pharmacy (rejected) | Own Bounded Context (ratified) |
|---|---|---|
| Bounded context identity | BC09 would be absorbed into BC05 Pharmacy; BC09 would cease to exist | BC09 retains its identity as a separate bounded context |
| Data ownership | Pharmacy would own inventory data; no separate inventory data ownership | BC09 owns inventory data (items, stock levels, movements, suppliers, purchase orders) |
| Query contracts | Pharmacy would expose inventory queries as part of its contract surface | BC09 exposes its own query contracts (stock-level lookups, movement-history queries, supplier queries) |
| Event contracts | Pharmacy would emit inventory events as part of its event surface | BC09 emits its own events (stock-changed, reorder-point-reached, purchase-order-received) |
| Module surface | M05 Pharmacy would expose inventory management alongside medication management | BC09 may or may not have its own module surface (deferred); medication inventory may integrate tightly with M05 Pharmacy |
| Audit trail | Inventory operations would be audited under BC05 Pharmacy | Inventory operations are audited under BC09 Inventory, separately from pharmacy dispensing operations |
| Domain responsibility | Pharmacy would own "inventory management, supply chain, stock movement" | BC09 owns "inventory management, supply chain, stock movement"; Pharmacy owns "medication dispensing, prescription management, controlled substance tracking" |

The right column is ratified by this ADR. The left column is explicitly rejected.

### 1.4 Medication Inventory Integration with Pharmacy

Medication inventory may integrate tightly with Pharmacy (M05). Medication inventory has pharmacy-specific concerns that justify tight integration:

| Concern | Description |
|---|---|
| Dispensing Workflow | Medication inventory is consumed by the pharmacy dispensing workflow. The dispensing workflow decrements medication stock levels, validates prescription validity, and records dispensing events. Tight integration between medication inventory and the dispensing workflow is operationally necessary. |
| Controlled Substance Tracking | Controlled substances have regulatory tracking requirements (e.g., DEA Form 222 in the United States, controlled drug registers in the United Kingdom). Medication inventory for controlled substances must track receipt, dispensing, and disposal with regulatory-grade audit. |
| Expiration Management | Medications have expiration dates that must be tracked and enforced. Expired medications must be quarantined and disposed of. The inventory system must enforce first-expiry-first-out (FEFO) picking for medications. |
| Lot and Batch Tracing | Medications are tracked by lot and batch for recall management. The inventory system must record lot and batch for every medication receipt and dispensing event. |
| Formulary Management | Medication inventory is constrained by the formulary (the list of medications approved for use at a facility). Formulary management is a pharmacy concern that intersects with medication inventory. |

These concerns justify tight integration between medication inventory and M05 Pharmacy. The integration may be implemented as: medication inventory data owned by BC09 Inventory but exposed through the M05 Pharmacy module surface for medication-specific operations (dispensing, controlled substance tracking, expiration management, lot tracing, formulary). The integration pattern is similar to the v1 Feature Flags packaging in ADR-007 — implementation packaging without domain ownership merger. The integration pattern will be documented in the future ADR-011 (or in BC09 / M05 reference documentation, whichever is more appropriate).

### 1.5 Non-Pharmacy Inventory Module Packaging Deferred

Non-pharmacy inventory (medical supplies, consumables, capital equipment, office supplies) does not have the pharmacy-specific concerns that justify tight integration with M05 Pharmacy. Non-pharmacy inventory is operationally distinct from medication inventory: it has different suppliers, different reorder rules, different regulatory requirements, and different consuming workflows.

The module packaging decision for non-pharmacy inventory is deferred to a future ADR (proposed ADR-011). The future ADR will evaluate the following options:

| Option | Description | Trade-off |
|---|---|---|
| A — Accommodate within M05 Pharmacy via configuration | Non-pharmacy inventory is managed through the M05 Pharmacy module surface, configured to handle non-medication items. | Low module catalogue churn; but conflates pharmacy and non-pharmacy operations in a single module surface |
| B — Distribute across multiple modules | Non-pharmacy inventory capabilities are distributed: medical supplies in a future Supplies module; capital equipment in a future Asset Management module; office supplies in a future Procurement module. | Clean separation of concerns; but introduces multiple new modules and dependencies |
| C — Dedicated Inventory module | Non-pharmacy inventory is housed in a dedicated module (M20 or M21), with BC09 Inventory as its bounded context. | Clean one-to-one BC↔module mapping; but adds a 20th module to the catalogue |
| D — Hybrid | Medication inventory is packaged within M05 Pharmacy (per §1.4); non-pharmacy inventory is housed in a dedicated module. | Reflects the operational reality; but requires two inventory surfaces |

The future ADR will select one of these options (or a variant) based on the requirements at the time of ratification.

### 1.6 Decision Properties

| Property | Value |
|---|---|
| Reversibility | High for the module packaging deferral (a future ADR can ratify any of the options); Medium for the bounded-context confirmation (BC09 is ratified as its own bounded context, but a future ADR could merge it with another BC if warranted) |
| Cost of Wrong Decision | Low — the deferral preserves optionality; the bounded-context confirmation aligns with canonical `SYSTEM_ARCHITECTURE.md` Section 7.2 |
| Affected Layers | Module layer (no Inventory module at v1; medication inventory may integrate with M05 Pharmacy); Domain layer (BC09 Inventory confirmed); Documentation layer (INVENTORY.md must not claim M07) |
| Affected Principles | P4 (Modular Boundaries — the decision respects bounded context boundaries; BC09 is not absorbed), P8 (Contract-Based Communication — BC09 retains its own contracts), P13 (Audit as Primitive — inventory operations are audited under BC09), P18 (Decade-Horizon Viability — the deferral preserves optionality for long-term evolution) |
| ADR Required | Yes — this ADR; future ADR-011 required for non-pharmacy inventory module packaging |

### 1.7 Decision Boundaries

The decision ratifies the bounded-context status of BC09 Inventory and defers the non-pharmacy inventory module packaging decision; it does not ratify the specific inventory data schema, the specific stock movement workflow, or the specific supply chain integration contracts. The decision does not modify the canonical 19-module catalogue; the catalogue is preserved unchanged. The decision does not preclude a future extraction ADR; it explicitly preserves the option to ratify a dedicated Inventory module. The decision does not delete the Inventory domain concept; BC09 Inventory remains a first-class bounded context. The decision requires that `docs/07_MODULES/INVENTORY.md` (or any successor document) must not claim M07 or any other module code until the future ADR ratifies a module surface for non-pharmacy inventory.

---

## 2. Context

### 2.1 The Inventory Bounded Context

`SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC09 Inventory as a first-class bounded context with domain responsibility "inventory management, supply chain, stock movement." The bounded context owns inventory items (item master, descriptions, units of measure, classifications), stock levels (on-hand, on-order, reserved, available), stock movements (receipts, issues, transfers, adjustments), supplier records (supplier master, lead times, contract terms), and purchase orders (PO header, line items, receipts, invoices). The bounded context exposes query contracts (stock-level lookups, movement-history queries, supplier queries, PO queries) and emits event contracts (stock-changed, reorder-point-reached, PO-received, PO-overdue).

BC09 is consumed by multiple modules: M05 Pharmacy (for medication inventory), M18 Reporting (for inventory reports), M12 HR (for staff supply allocation), and potentially future modules for asset management and procurement.

### 2.2 The Pre-ADR State of the BC09↔Module Mapping

`SYSTEM_ARCHITECTURE.md` Section 7.7 describes the BC09↔module mapping as follows: "BC09 Inventory is implemented within the Pharmacy module (M05) for pharmacy inventory and as a separate module for non-pharmacy inventory." The canonical text mentions a "separate module for non-pharmacy inventory" but does not name the module or assign it an M-code.

`MODULE_ARCHITECTURE.md` Section 2.4 resolves this ambiguity in favour of "no separate module": "non-pharmacy inventory is accommodated within M05's inventory capability surface or, where deployment requires, as a configuration of M05 rather than as a separate module."

`docs/07_MODULES/INVENTORY.md` contradicts `MODULE_ARCHITECTURE.md` Section 2.4 by claiming M07 module identity for Inventory (colliding with canonical M07 Documents) and by stating that "non-pharmacy inventory is a separate M07 module." Both documents cite `SYSTEM_ARCHITECTURE.md` Section 7.7 as their authority, but the canonical text is ambiguous and the two elaboration documents have resolved the ambiguity in opposite directions.

This ADR resolves the ambiguity by: (a) confirming BC09 as its own bounded context (rejecting absorption into BC05 Pharmacy); (b) confirming that Pharmacy does not universally own all inventory (rejecting the `MODULE_ARCHITECTURE.md` Section 2.4 claim that non-pharmacy inventory is accommodated within M05); (c) deferring the non-pharmacy inventory module packaging decision to a future ADR; (d) requiring that `INVENTORY.md` must not claim M07 or any other module code until the future ADR ratifies a module surface.

### 2.3 The Architectural Question

The architectural question is how to resolve the contradiction between `MODULE_ARCHITECTURE.md` Section 2.4 and `INVENTORY.md` regarding BC09 Inventory ownership and module packaging. The question is load-bearing because it determines the bounded-context status of Inventory and the module surface through which inventory capabilities are exposed.

### 2.4 Forces Driving the Decision

| Force | Description |
|---|---|
| Bounded Context Purity | BC09 Inventory has a distinct domain responsibility (inventory management, supply chain, stock movement) that is different from BC05 Pharmacy's domain responsibility (medication dispensing, prescription management). Absorbing BC09 into BC05 would conflate two distinct domains. |
| Data Ownership Coherence | Inventory data (items, stock levels, movements, suppliers, POs) is naturally inventory data, not pharmacy data. Creating a separate Subscriptions bounded context would require splitting the inventory data model, producing data ownership incoherence. |
| Medication Inventory Pharmacy-Specific Concerns | Medication inventory has pharmacy-specific concerns (dispensing, controlled substances, expiration, lot tracing, formulary) that justify tight integration with M05 Pharmacy. The integration is implementation packaging, not domain ownership merger. |
| Non-Pharmacy Inventory Operational Distinctness | Non-pharmacy inventory (medical supplies, consumables, capital equipment, office supplies) is operationally distinct from medication inventory. Forcing non-pharmacy inventory into M05 Pharmacy would conflate pharmacy and non-pharmacy operations. |
| Module Catalogue Stability | The 19-module catalogue is already at the upper bound of cognitive manageability. Adding a 20th module for Inventory increases the catalogue surface, but the cost is justified if non-pharmacy inventory complexity warrants a dedicated module. |
| Deferral Preserves Optionality | The non-pharmacy inventory module packaging decision can be deferred without blocking v1 general availability. The deferral preserves optionality for the Architecture Council to make the decision with better information. |
| M07 Slot Recovery | Requiring that `INVENTORY.md` must not claim M07 frees the M07 slot for the canonical Documents module, which is one of the seven missing canonical module files identified in audit F-04. The slot recovery unblocks downstream module file creation. |
| Inventory Domain Concept Preservation | The Inventory domain concept is real and necessary. The decision must not delete the domain concept; it must preserve BC09 Inventory as a bounded context with its own data ownership, contracts, and audit trail. |

### 2.5 Constraints Bounding the Decision

The decision is bounded by several explicit constraints. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC09 Inventory as a bounded context; this ADR confirms it. `SYSTEM_ARCHITECTURE.md` Section 7.5 states "Contexts own their data. A context's data is not accessed directly by other contexts; it is accessed through the context's query contracts." BC09 retains its data ownership. `PRODUCT_BIBLE.md` Section 19.2 defines the 19-module catalogue; this ADR does not modify it. ADR-002 (Modular Architecture) ratifies the modular monolith default; the decision is consistent with this default. ADR-005 (Module Architecture) defines module boundary rules; the decision respects these rules. ADR-006 (Database Strategy) governs the database layer; the inventory data schema is owned by BC09 reference documentation and by ADR-006's data layer rules.

### 2.6 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md` and `PRODUCT_BIBLE.md`. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines BC09 Inventory as a bounded context; Section 7.7 describes the BC09↔module mapping (ambiguously); Section 9 defines the Modular Architecture; Section 13 defines the Module Architecture. `PRODUCT_BIBLE.md` Section 19.2 defines the 19-module catalogue (no Inventory module). This ADR does not introduce new architectural commitments; it ratifies a bounded-context confirmation and a module-packaging deferral that resolve the ambiguity in the pre-ADR state and replace the invented module identity in `INVENTORY.md` with a bounded-context reference classification.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Absorb BC09 into BC05 Pharmacy

**Description:** BC09 Inventory is absorbed into BC05 Pharmacy as a sub-capability. The bounded context catalogue in `SYSTEM_ARCHITECTURE.md` Section 7.2 is amended to remove BC09. Inventory data, query contracts, and event contracts become Pharmacy data, query contracts, and event contracts. The audit trail conflates inventory operations with pharmacy dispensing operations.

**Verdict:** Rejected. This alternative conflates two distinct domain responsibilities. Inventory management owns stock levels, movements, suppliers, and purchase orders; pharmacy dispensing owns prescriptions, controlled substances, and formulary. Merging them produces a bounded context with two distinct data models, two distinct validation frameworks, and two distinct audit categories — a bounded context that does not have a coherent identity. The merger also forecloses future extraction: once BC09 is absorbed, extracting it requires a domain-level decomposition that breaks contracts. This alternative is the domain ownership merger that §1.3 explicitly rejects.

### 3.2 Alternative B — Ratify M07 as a Separate Inventory Module (and Relocate Documents)

**Description:** BC09 Inventory is implemented through a dedicated M07 Inventory module. The canonical M07 Documents module is relocated to a new M-code (e.g., M21). `INVENTORY.md` is ratified as the M07 module reference. The 19-module catalogue is preserved at 19 modules but with a different mapping.

**Verdict:** Rejected. This alternative ratifies the `INVENTORY.md` defect rather than correcting it. The relocation of M07 Documents to a new M-code produces cascading churn across every downstream document that references M07. The benefit (a dedicated Inventory module) is not justified at v1; the deferral preserves the option to ratify a dedicated Inventory module later without the relocation churn.

### 3.3 Alternative C — Ratify Non-Pharmacy Inventory within M05 Pharmacy (per `MODULE_ARCHITECTURE.md` Section 2.4)

**Description:** `MODULE_ARCHITECTURE.md` Section 2.4 is ratified as the controlling interpretation. Non-pharmacy inventory is accommodated within M05 Pharmacy via configuration. `INVENTORY.md` is corrected to remove the M07 claim and to align with the M05 accommodation. No future ADR is required.

**Verdict:** Rejected. This alternative forces non-pharmacy inventory into M05 Pharmacy, conflating pharmacy and non-pharmacy operations. The Architecture Council decision (D4 modified) explicitly states that "Pharmacy does not universally own all inventory." The deferral preserves the option to find a better home for non-pharmacy inventory.

### 3.4 Alternative D — Ratify a Dedicated Inventory Module Now (M20 or M21)

**Description:** BC09 Inventory is implemented through a dedicated M20 (or M21) Inventory module. The 19-module catalogue is expanded to 20. `INVENTORY.md` is corrected to use M20. Non-pharmacy inventory is housed in M20; medication inventory integrates tightly with M05 Pharmacy (per §1.4).

**Verdict:** Rejected for v1. The dedicated module is the architecturally cleaner long-term posture, but the Architecture Council decision (D4 modified) explicitly defers non-pharmacy inventory module packaging pending a future ADR. The deferral preserves optionality to evaluate the alternatives (within M05, distributed, dedicated, hybrid) with better information.

**Future Trigger:** This alternative is one of the options that the future ADR-011 will evaluate.

### 3.5 Alternative E — Defer the Entire Decision (Including Bounded-Context Status)

**Description:** The entire BC09 Inventory question — bounded-context status and module packaging — is deferred to a future ADR. `INVENTORY.md` is corrected to remove the M07 claim, but no decision is made about BC09's bounded-context status.

**Verdict:** Rejected. The bounded-context status of BC09 is defined in canonical `SYSTEM_ARCHITECTURE.md` Section 7.2; it does not need to be deferred. Confirming BC09 as its own bounded context resolves the absorption question (Alternative A) definitively. Only the module packaging question needs deferral.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Bounded Context Purity Preserved | BC09 Inventory retains its identity as a first-class bounded context. The one-to-one correspondence between bounded contexts and domain responsibilities is preserved. |
| Data Ownership Coherence | Inventory data (items, stock levels, movements, suppliers, POs) is owned coherently by BC09 Inventory. No data model split across bounded contexts. |
| Medication Inventory Integration Permitted | Medication inventory may integrate tightly with M05 Pharmacy, reflecting the pharmacy-specific concerns (dispensing, controlled substances, expiration, lot tracing, formulary). |
| Non-Pharmacy Inventory Not Forced into Pharmacy | Non-pharmacy inventory is not forced into M05 Pharmacy. The deferral preserves the option to find a better home (within M05, distributed, dedicated, hybrid). |
| M07 Slot Recovered | The M07 module slot, erroneously claimed by `INVENTORY.md`, is freed for the canonical Documents module. The Documents module file can be created in Phase 4 of the remediation plan without conflict. |
| Inventory Domain Concept Preserved | The Inventory domain concept is not deleted. BC09 Inventory remains a first-class bounded context with its own data ownership, contracts, and audit trail. |
| Future Optionality | The non-pharmacy inventory module packaging decision is reversible. A future ADR can ratify any of the options (within M05, distributed, dedicated, hybrid) without breaking BC09 contracts. |
| Audit Trail Coherence | Audit entries for inventory operations are attributed to BC09 Inventory, separately from pharmacy dispensing operations. No audit trail conflation. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Non-Pharmacy Inventory Module Surface Undefined | The module surface through which non-pharmacy inventory capabilities are exposed is undefined until ADR-011 is ratified. Consumer modules that need non-pharmacy inventory contracts must wait for the future ADR or access BC09 contracts directly (which is architecturally acceptable but produces a less clean module dependency graph). |
| `INVENTORY.md` Relocation Required | `docs/07_MODULES/INVENTORY.md` must be relocated out of the `docs/07_MODULES/` directory because it does not document a canonical module. The relocation is a downstream correction performed in Phase 2 of the remediation plan; this ADR authorises the relocation but does not perform it. |
| `INVENTORY.md` Content Reframing Required | The content of `INVENTORY.md` must be reframed as a BC09 Inventory bounded-context reference (not a module reference). The M07 claim must be removed. The reframing is a downstream correction performed in Phase 3 of the remediation plan. |
| Cross-References Must Be Updated | Downstream documents that currently link to `docs/07_MODULES/INVENTORY.md` (e.g., `docs/02_PRODUCT/MODULES.md`, `docs/03_DOMAIN/CONFIGURATION.md`, `docs/06_CLINIC_TYPES/PHARMACY.md`) must be updated to point to the new location. |
| Future ADR-011 Required | The non-pharmacy inventory module packaging decision requires a future ADR. The ADR is not drafted in this Phase 0; it is a separate future workstream. |
| `MODULE_ARCHITECTURE.md` Section 2.4 Amendment Required | `MODULE_ARCHITECTURE.md` Section 2.4 must be amended (in Phase 1 canonical amendment) to remove the claim that non-pharmacy inventory is accommodated within M05, and to reflect the deferral. |
| `SYSTEM_ARCHITECTURE.md` Section 7.7 Amendment Required | `SYSTEM_ARCHITECTURE.md` Section 7.7 must be amended (in Phase 1 canonical amendment) to clarify that BC09 is its own bounded context, that medication inventory may integrate tightly with M05 Pharmacy, and that non-pharmacy inventory module packaging is deferred per this ADR. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Bounded Context Catalogue Unchanged | `SYSTEM_ARCHITECTURE.md` Section 7.2 is unchanged. BC09 Inventory remains in the catalogue. |
| Module Catalogue Unchanged | `PRODUCT_BIBLE.md` Section 19.2 is unchanged. The 19-module catalogue is preserved. No new M-code is assigned to Inventory. |
| BC09 Contracts Unchanged | BC09's query contracts, event contracts, and data ownership are unchanged. The bounded-context confirmation does not modify BC09's contract surface. |

---

## 5. Status

### 5.1 Current Status

**Proposed.** This ADR is drafted and submitted to the Architecture Council for ratification. Upon ratification, the Status field is updated to **Ratified**, the Version field is incremented to 1.0.0 (if ratified as-is) or 1.1.0 (if ratified with amendments), and the ADR is added to the canonical ADR index.

### 5.2 Ratification Criteria

The Architecture Council ratifies this ADR when:

- [ ] The Council confirms that BC09 Inventory is its own bounded context per `SYSTEM_ARCHITECTURE.md` Section 7.2.
- [ ] The Council confirms that Pharmacy (M05) does not universally own all inventory.
- [ ] The Council confirms that medication inventory may integrate tightly with Pharmacy (M05).
- [ ] The Council confirms that non-pharmacy inventory module packaging is deferred to a future ADR (proposed ADR-011).
- [ ] The Council confirms that `INVENTORY.md` must not claim M07 or any other module code until the future ADR ratifies a module surface.
- [ ] The Council confirms that the Inventory domain concept is not deleted; BC09 Inventory remains a first-class bounded context.

### 5.3 Implementation Triggers

Upon ratification, the following implementation work is authorised (but not performed by this ADR):

- **Phase 1 canonical amendment:** Amend `SYSTEM_ARCHITECTURE.md` Section 7.7 to clarify BC09's bounded-context status, permit medication inventory integration with M05 Pharmacy, and document the deferral of non-pharmacy inventory module packaging.
- **Phase 1 canonical amendment:** Amend `MODULE_ARCHITECTURE.md` Section 2.4 to remove the claim that non-pharmacy inventory is accommodated within M05 Pharmacy; replace with the deferral note citing this ADR.
- **Phase 2 downstream structural correction:** Relocate `docs/07_MODULES/INVENTORY.md` out of the `docs/07_MODULES/` directory. Destination decided in a separate downstream correction decision (proposed: `docs/03_DOMAIN/INVENTORY_BC_REFERENCE.md`).
- **Phase 3 downstream content correction:** Reframe the relocated Inventory document as a BC09 Inventory bounded-context reference (not a module reference). Remove the M07 module identity claim. Document BC09's domain responsibility, data ownership, query contracts, and event contracts. Note that non-pharmacy inventory module packaging is deferred per this ADR.
- **Phase 3 downstream content correction:** Update cross-references in `docs/02_PRODUCT/MODULES.md`, `docs/03_DOMAIN/CONFIGURATION.md`, `docs/06_CLINIC_TYPES/PHARMACY.md`, and any downstream doc that links to `INVENTORY.md`.
- **Phase 4 missing module file creation:** Create `docs/07_MODULES/DOCUMENTS.md` for the canonical M07 Documents module (no longer blocked by Inventory collision).
- **Future workstream:** Draft ADR-011 to ratify non-pharmacy inventory module packaging.

---

## 6. Future Notes

### 6.1 Triggers for ADR-011 (Non-Pharmacy Inventory Module Packaging)

The non-pharmacy inventory module packaging deferral continues until one of the following triggers fires. When a trigger fires, the Architecture Council must convene to draft ADR-011 (or a successor) that ratifies a module packaging approach.

| Trigger | Description |
|---|---|
| Non-Pharmacy Inventory Complexity Growth | Non-pharmacy inventory complexity (item types, supplier integrations, reorder rules, regulatory requirements) grows to a point where the lack of a module surface produces documentation or implementation gaps. |
| Customer Demand | Customer demand for non-pharmacy inventory management capabilities justifies ratifying a module surface. |
| v2 Major Release | The v2 major release planning cycle is a natural point to ratify non-pharmacy inventory module packaging, regardless of whether any specific trigger has fired. |
| Medication Inventory Extraction | If medication inventory is extracted from M05 Pharmacy into its own surface (per a future ADR), non-pharmacy inventory module packaging should be ratified concurrently to provide a coherent inventory module landscape. |
| Asset Management or Procurement Module Pressure | If the Architecture Council decides to introduce an Asset Management or Procurement module, non-pharmacy inventory module packaging should be ratified concurrently to clarify the relationship between inventory, assets, and procurement. |

### 6.2 Options for ADR-011

The future ADR-011 will evaluate the following options (initial list; the ADR may add or refine options):

| Option | Description | Trade-off |
|---|---|---|
| A — Accommodate within M05 Pharmacy via configuration | Non-pharmacy inventory is managed through M05 Pharmacy, configured for non-medication items. | Low churn; but conflates pharmacy and non-pharmacy operations |
| B — Distribute across multiple modules | Medical supplies in a future Supplies module; capital equipment in a future Asset Management module; office supplies in a future Procurement module. | Clean separation; but introduces multiple new modules |
| C — Dedicated Inventory module (M20 or M21) | Non-pharmacy inventory is housed in a dedicated module, with BC09 Inventory as its bounded context. Medication inventory may continue to integrate with M05 Pharmacy or may migrate to the dedicated module. | Clean one-to-one BC↔module mapping; but adds a 20th module |
| D — Hybrid | Medication inventory packaged within M05 Pharmacy (per §1.4); non-pharmacy inventory housed in a dedicated module. | Reflects operational reality; but requires two inventory surfaces |
| E — BC09 without module surface (similar to M17 Integration, M18 Reporting) | BC09 Inventory is a bounded context with no dedicated module surface; inventory capabilities are exposed through the modules that consume them (M05 Pharmacy for medication inventory, M18 Reporting for inventory reports, etc.). | Avoids adding a module; but produces a fragmented inventory surface |

### 6.3 Open Questions for ADR-011

| Question | Description |
|---|---|
| Medication Inventory Extraction | Should medication inventory be extracted from M05 Pharmacy into a dedicated Inventory module, or should it remain integrated with M05 Pharmacy? |
| Asset Management Relationship | How does non-pharmacy inventory relate to asset management (capital equipment tracking, depreciation, maintenance)? Are they the same module, separate modules, or related modules? |
| Procurement Relationship | How does non-pharmacy inventory relate to procurement (purchase order management, supplier management, contract management)? Are they the same module, separate modules, or related modules? |
| Consumables Tracking | How does non-pharmacy inventory relate to consumables tracking in M18 Reporting? Are they the same capability viewed from different angles, or distinct capabilities? |

### 6.4 Relationship to Other ADRs

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Compatible. Inventory configuration (reorder rules, stock thresholds, supplier lead times) is configuration data. |
| ADR-002 (Modular Architecture) | Compatible. The bounded-context confirmation is consistent with the modular monolith default. |
| ADR-005 (Module Architecture) | Compatible. The decision respects module boundary rules. |
| ADR-006 (Database Strategy) | Compatible. The inventory data schema is owned by BC09 reference documentation and by ADR-006's data layer rules. |
| ADR-007 (Feature Flags Packaging) | Independent. Inventory and Feature Flags are unrelated domain concerns. |
| ADR-008 (Rejection of Façade Module Category) | Compatible. Inventory is a bounded context, not a façade module. |
| ADR-009 (Subscriptions as a Billing Capability) | Independent. Inventory and Subscriptions are unrelated domain concerns. |
| Future ADR-011 | Successor ADR for non-pharmacy inventory module packaging. |

---

> **End of ADR-010.** This ADR is a ratified decision record. Implementation work authorised by this ADR is performed in separate phases per the remediation plan; this ADR does not perform that work. A future ADR-011 is required to ratify non-pharmacy inventory module packaging.
