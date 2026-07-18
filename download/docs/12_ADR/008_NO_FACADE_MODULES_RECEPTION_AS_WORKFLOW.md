# ADR-008: Rejection of Façade Module Category; Reception as Workflow
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-008: Rejection of Façade Module Category; Reception as Workflow |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Ratified Decision |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review if a future cross-cutting capability emerges that cannot be cleanly housed elsewhere |
| Audience | Senior software architects, engineering leadership, module owners, workflow documentation owners, product council, customer system administrators |
| Scope | The decision to reject the introduction of a façade module category in the Ibn Hayan module catalogue, and the related decision to reclassify Reception from a module to a workflow / operational process / experience surface. The 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 is preserved unchanged. |
| Out of Scope | The specific workflow documentation structure for Reception (owned by a separate downstream correction decision); the future ADR that may introduce a façade module category if warranted; the specific M14 Identity & Access module reference documentation (owned by a separate file creation in Phase 4) |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md` is resolved in favour of `SYSTEM_ARCHITECTURE.md` until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR that either continues the rejection or introduces a façade module category with defined criteria |

> **Document Purpose:** This ADR ratifies two related decisions. First, no façade module category is introduced into the Ibn Hayan module catalogue; the 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 remains the canonical and exhaustive set of modules, and every module corresponds one-to-one with a bounded context (subject to the deviations documented in `SYSTEM_ARCHITECTURE.md` Section 7.7). Second, Reception is not a module; it is a workflow / operational process / experience surface that aggregates capabilities owned by other bounded contexts (BC01 Patient, BC02 Encounter, BC06 Scheduling, BC07 Billing, BC13 Documents, BC14 Notifications) without owning data or claiming a module identity. The downstream file `docs/07_MODULES/RECEPTION.md` is to be relocated out of the module directory and reclassified as a workflow document.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 7.2 (bounded context catalogue — no Reception BC), Section 7.5 (contexts own their data; data is accessed through query contracts), Section 7.7 (bounded-context-to-module mapping deviations), Section 9 (Modular Architecture), Section 13 (Module Architecture). `MODULE_ARCHITECTURE.md` Section 2.4 (deviation catalogue). `PRODUCT_BIBLE.md` Section 19.2 (19-module catalogue), Section 19.4 (dependency hierarchy).

> **Related ADRs:** ADR-002 (Modular Architecture), ADR-005 (Module Architecture). Future ADR may introduce a façade module category if warranted; that ADR would supersede the rejection portion of this ADR.

> **Predecessor:** None. **Supersedes:** None. **Superseded by:** None.

> **Audit Findings Resolved:** F-03 part 1 (RECEPTION.md claims M14 module identity, colliding with canonical Identity & Access), MBV-1 (RECEPTION.md claims M14 module identity but aggregates capabilities owned by six other bounded contexts without canonical ratification of a façade module category). This ADR replaces the invented module identity with a workflow classification.

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

The Ibn Hayan Healthcare Operating System does not introduce a façade module category. A "façade module" would be a module that aggregates query contracts from multiple bounded contexts without owning data — a cross-cutting capability surface that does not correspond to a single bounded context. The 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 remains the canonical and exhaustive set of modules. Every module corresponds one-to-one with a bounded context, subject to the deviations documented in `SYSTEM_ARCHITECTURE.md` Section 7.7 (which are themselves governed by ADR ratification per Section 7.6). No fourth category of "façade module" is added alongside the existing categories of bounded-context-aligned modules, BC-without-module cases (e.g., M17 Integration, M18 Reporting), and module-without-dedicated-BC cases.

Reception is not a module. Reception is a workflow / operational process / experience surface that draws capabilities from multiple bounded contexts — patient check-in (BC01 Patient, BC02 Encounter), queue management (BC06 Scheduling), walk-in handling (BC06 Scheduling), room assignment (BC06 Scheduling), transfer coordination (BC02 Encounter), check-out (BC02 Encounter), point-of-service payment collection (BC07 Billing), document handoff (BC13 Documents), and queue state communication (BC14 Notifications). Reception does not own data; it consumes query contracts and emits commands against the bounded contexts that do own data. The downstream file `docs/07_MODULES/RECEPTION.md` is to be relocated out of the `docs/07_MODULES/` directory and reclassified as a workflow document. The M14 module slot, which `RECEPTION.md` erroneously claimed, is freed for the canonical M14 Identity & Access module (one of the seven missing canonical module files identified in audit F-04).

### 1.2 Scope of Application

The decision applies to the module catalogue architecture and to the classification of cross-cutting capabilities. It binds every downstream document that currently claims a module identity for a cross-cutting capability, every future downstream document that might be tempted to claim such an identity, and every engineer or documentation author who must decide where to document a cross-cutting capability. The decision does not prescribe the specific workflow documentation structure for Reception (that is a separate downstream correction decision owned by the remediation plan); it only prescribes that Reception is not a module and must not be documented as one.

The decision is scoped to the current state of the Ibn Hayan module catalogue. It does not foreclose the future introduction of a façade module category via a new ADR if warranted (see §6.1). The rejection is the default posture for v1 and remains the posture until a successor ADR introduces the category with defined criteria.

### 1.3 Reception as Workflow

Reception is reclassified as a workflow / operational process / experience surface. The reclassification has the following consequences:

| Aspect | Module (rejected) | Workflow (ratified) |
|---|---|---|
| Module identity | Reception would be M14 (or another M-code) | Reception has no M-code; it is not in the module catalogue |
| Bounded context ownership | Reception would own a bounded context (BC-??) | Reception owns no bounded context; it consumes contracts from BC01, BC02, BC06, BC07, BC13, BC14 |
| Data ownership | Reception would own reception data (queue state, check-in state) | Queue state is owned by BC06 Scheduling; check-in state is owned by BC02 Encounter; reception owns no data |
| Contract surface | Reception would expose its own contracts | Reception consumes contracts from the owning bounded contexts; it does not expose contracts of its own |
| Documentation location | `docs/07_MODULES/RECEPTION.md` | Relocated to a workflow document (destination decided in a separate downstream correction decision) |
| Metadata table | Module metadata (M-code, BC ownership, dependency declarations) | Workflow metadata (workflow ID, participating BCs, trigger conditions, exit conditions, participating roles) |
| Audit trail | Reception audit category (would have been required) | Audit entries are attributed to the owning bounded contexts (BC01, BC02, BC06, BC07, BC13, BC14); reception operations are audited under those categories |
| Permission policy | Reception-specific permission policy | Reception capabilities are gated by the permission policies of the owning bounded contexts; no reception-specific permission policy exists |

The right column is ratified by this ADR. The left column is explicitly rejected.

### 1.4 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Medium — the rejection can be reversed by a future ADR that introduces a façade module category; the reversal would require ratifying the category criteria, reclassifying Reception (and any other cross-cutting capabilities that have emerged), and amending the module catalogue |
| Cost of Wrong Decision | Low — if a façade module category proves necessary later, the introduction is bounded and does not require unwinding significant prior work |
| Affected Layers | Module layer (M14 slot freed for Identity & Access); Experience layer (Reception becomes a workflow surface, not a module surface); Documentation layer (Reception documentation relocates) |
| Affected Principles | P4 (Modular Boundaries — the rejection reinforces that modules correspond to bounded contexts; cross-cutting capabilities are not modules), P8 (Contract-Based Communication — Reception consumes contracts rather than owning them), P10 (Multi-Tenancy — Reception is tenant-scoped through its participating bounded contexts, not through its own module identity) |
| ADR Required | Yes — this ADR |

### 1.5 Decision Boundaries

The decision ratifies the rejection of a façade module category and the reclassification of Reception as a workflow; it does not ratify the specific workflow documentation structure for Reception, the specific destination directory for the Reception workflow document, or the specific workflow metadata schema. Those are owned by downstream correction decisions in the remediation plan. The decision does not modify the canonical 19-module catalogue; the catalogue is preserved unchanged. The decision does not modify the bounded context catalogue in `SYSTEM_ARCHITECTURE.md` Section 7.2; no Reception bounded context is added or removed (it was never there). The decision does not preclude a future ADR that introduces a façade module category; it establishes that no such category exists at v1 and that any future introduction requires explicit ADR ratification.

---

## 2. Context

### 2.1 The Module Catalogue

`PRODUCT_BIBLE.md` Section 19.2 defines the canonical module catalogue as 19 modules (M01–M19), each corresponding one-to-one with a bounded context defined in `SYSTEM_ARCHITECTURE.md` Section 7.2, subject to the deviations documented in Section 7.7. The catalogue is the authoritative list of modules in the platform; every module that exists is in the catalogue, and every entry in the catalogue is a module. There is no "façade module" category, no "cross-cutting module" category, and no "composite module" category. The catalogue is intentionally simple: a module is a bounded context with an implementation surface, and that is the only kind of module.

### 2.2 The Pre-ADR State of RECEPTION.md

The downstream file `docs/07_MODULES/RECEPTION.md` (written during the Wave 1 documentation generation) claims M14 module identity for Reception. The file acknowledges that Reception is not a bounded context — it states explicitly: "Reception is not a separate bounded context in the canonical catalogue (SYSTEM_ARCHITECTURE Section 7.2); it is a cross-cutting operational capability that draws from the Scheduling bounded context (BC06) for appointment state, the Patient bounded context (BC01) for patient identity, and the Notifications bounded context (BC14) for queue state communication." Despite this acknowledgment, the file claims M14, colliding with the canonical M14 Identity & Access module.

The file defines Reception as aggregating capabilities from six bounded contexts (BC01 Patient, BC02 Encounter, BC06 Scheduling, BC07 Billing, BC13 Documents, BC14 Notifications) without owning data. This is structurally a façade pattern — a surface that consumes contracts from multiple bounded contexts without owning data. The defect is not the façade pattern itself (which is architecturally sound); the defect is the claim of module identity for the façade without canonical ratification of a façade module category.

### 2.3 The Architectural Question

The architectural question is whether to ratify a façade module category to accommodate Reception (and potentially other cross-cutting capabilities) or to reject the category and reclassify Reception as a workflow. The question is load-bearing because it determines the shape of the module catalogue: a catalogue with a façade module category is more permissive (any cross-cutting capability can become a module) but more complex (engineers must learn two kinds of modules); a catalogue without a façade module category is simpler (modules correspond one-to-one with bounded contexts) but requires cross-cutting capabilities to be documented elsewhere.

### 2.4 Forces Driving the Decision

| Force | Description |
|---|---|
| Catalogue Simplicity | The 19-module catalogue is already at the upper bound of cognitive manageability. Adding a façade module category increases conceptual surface area without proportional benefit at v1. |
| Reception as the Only Candidate | Reception is the only current candidate for façade-module status. A category of one is over-engineering. If multiple cross-cutting capabilities emerge that cannot be cleanly housed elsewhere, the category decision can be revisited. |
| Workflow Documentation as Natural Home | Reception is operationally a workflow — a sequence of steps that reception staff perform (check-in, queue management, room assignment, check-out). Workflow documentation is the natural home for operational sequences. |
| Bounded Context Purity | The one-to-one correspondence between modules and bounded contexts (subject to documented deviations) is a load-bearing architectural principle. Introducing a façade module category erodes this principle by allowing modules that do not correspond to bounded contexts. |
| M14 Slot Recovery | Rejecting the Reception module identity frees the M14 slot for the canonical Identity & Access module, which is one of the seven missing canonical module files identified in audit F-04. The slot recovery unblocks downstream module file creation. |
| Audit Trail Clarity | Without a façade module category, audit entries are attributed to the bounded context that owns the data being acted upon. With a façade module category, audit entries could be attributed to the façade module, conflating the audit trail across multiple bounded contexts. |

### 2.5 Constraints Bounding the Decision

The decision is bounded by several explicit constraints. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines the bounded context catalogue; Reception is not in it. `PRODUCT_BIBLE.md` Section 19.2 defines the 19-module catalogue; Reception is not in it. `SYSTEM_ARCHITECTURE.md` Section 7.5 states "Contexts own their data. A context's data is not accessed directly by other contexts; it is accessed through the context's query contracts." Reception, as a façade, consumes query contracts — it does not own data, and the façade pattern itself does not violate this principle. The decision does not violate the principle; it merely refuses to ratify a module identity for the façade. ADR-002 (Modular Architecture) ratifies the modular monolith default; the rejection is consistent with this default (modules correspond to bounded contexts). ADR-005 (Module Architecture) defines module boundary rules; the rejection reinforces these rules by refusing to introduce a category that would blur module boundaries.

### 2.6 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md` and `PRODUCT_BIBLE.md`. `SYSTEM_ARCHITECTURE.md` Section 7.2 defines the bounded context catalogue (no Reception BC); Section 7.5 defines the data ownership principle; Section 7.7 defines the deviation catalogue (no Reception deviation). `PRODUCT_BIBLE.md` Section 19.2 defines the 19-module catalogue (no Reception module). This ADR does not introduce new architectural commitments; it ratifies a rejection decision that resolves the ambiguity in the pre-ADR state and replaces the invented module identity in `RECEPTION.md` with a workflow classification.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Ratify Façade Module Category; Reception as Façade Module

**Description:** A new module category "façade module" is introduced. Façade modules aggregate query contracts from multiple bounded contexts without owning data. Reception is ratified as the first façade module (M-F1 or similar). Future cross-cutting capabilities can be ratified as façade modules through ADR. The module catalogue expands to include the façade module category alongside the standard module category.

**Verdict:** Rejected for v1. The category is over-engineering for a single candidate. The cognitive cost of introducing a second module category (engineers must learn "standard modules" and "façade modules") is not justified by the benefit (accommodating Reception as a module). Reception is more naturally documented as a workflow. The category can be introduced later via a successor ADR if multiple candidates emerge.

**Future Trigger:** This alternative becomes the recommended path if three or more cross-cutting capabilities emerge that cannot be cleanly housed as workflows or as capabilities within existing modules.

### 3.2 Alternative B — Reclassify Reception as a Section Within an Existing Module

**Description:** Reception is documented as a section within an existing module file — most likely `docs/07_MODULES/PATIENTS.md` (M01) or a future `docs/07_MODULES/SCHEDULING.md` (M06, currently mislabelled as `APPOINTMENTS.md`). Reception capabilities are treated as a sub-surface of the host module.

**Verdict:** Rejected. Reception draws capabilities from six bounded contexts; housing it within a single module file would imply that the host module owns Reception, which is architecturally incorrect. The host module would appear to own capabilities that are actually owned by other bounded contexts. This alternative conflates module ownership with workflow documentation.

### 3.3 Alternative C — Keep RECEPTION.md in `docs/07_MODULES/` with a Header Note

**Description:** `RECEPTION.md` remains in `docs/07_MODULES/` but loses its M14 claim. A header note clarifies that Reception is a cross-cutting capability, not a canonical module. The file is treated as a "module-adjacent" reference.

**Verdict:** Rejected. This alternative creates a hybrid file type that does not fit cleanly into either the module directory or the workflow directory. It leaves `docs/07_MODULES/` with a file that is not a module, which is structurally inconsistent and confuses engineers navigating the directory. The clean option is to reclassify Reception as a workflow and relocate the file.

### 3.4 Alternative D — Defer the Decision

**Description:** Leave `RECEPTION.md` in `docs/07_MODULES/` with its M14 claim. Defer the reclassification decision to a future Architecture Council session.

**Verdict:** Rejected. The M14 claim collides with the canonical Identity & Access module, which is one of the seven missing canonical module files (audit F-04). Deferring the decision blocks the creation of the Identity & Access module file. The decision must be made now to unblock downstream work.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Module Catalogue Stability | The 19-module catalogue defined in `PRODUCT_BIBLE.md` Section 19.2 is preserved unchanged. No new module category is introduced. Engineers learning the catalogue at v1 general availability learn one kind of module, not two. |
| M14 Slot Recovered | The M14 module slot, erroneously claimed by `RECEPTION.md`, is freed for the canonical Identity & Access module. The Identity & Access module file can be created in Phase 4 of the remediation plan without conflict. |
| Bounded Context Purity Preserved | The one-to-one correspondence between modules and bounded contexts (subject to documented deviations) is preserved. No module exists that does not correspond to a bounded context. |
| Reception Documented in Natural Home | Reception is documented as a workflow / operational process / experience surface, which is its natural classification. The workflow documentation structure can accommodate the sequence of steps that reception staff perform (check-in, queue management, room assignment, check-out) without forcing the sequence into a module structure. |
| Audit Trail Clarity | Audit entries for reception operations are attributed to the bounded contexts that own the data being acted upon (BC01, BC02, BC06, BC07, BC13, BC14). No reception-specific audit category is introduced, and no audit trail conflation occurs. |
| Future Optionality | The rejection is reversible. If multiple cross-cutting capabilities emerge that cannot be cleanly housed as workflows, a future ADR can introduce a façade module category without unwinding significant prior work. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Reception Documentation Relocation Required | `docs/07_MODULES/RECEPTION.md` must be relocated out of the `docs/07_MODULES/` directory. The relocation is a downstream correction performed in Phase 2 of the remediation plan; this ADR authorises the relocation but does not perform it. |
| Workflow Documentation Structure Must Be Defined | The workflow documentation structure (metadata schema, section headings, cross-reference conventions) must be defined to accommodate the Reception workflow document. This is a separate downstream correction decision. |
| Cross-References Must Be Updated | Downstream documents that currently link to `docs/07_MODULES/RECEPTION.md` (e.g., `docs/02_PRODUCT/MODULES.md`, `docs/02_PRODUCT/FEATURES.md`) must be updated to point to the new location. This is a Phase 3 downstream correction. |
| Reception Loses Module-Level Visibility | In the module catalogue view (e.g., `docs/02_PRODUCT/MODULES.md`), Reception no longer appears as a module. Engineers looking for Reception capabilities must look in the workflow documentation instead. This is the intended consequence of the reclassification, but it requires clear cross-referencing to avoid orphaning the content. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Bounded Context Catalogue Unchanged | `SYSTEM_ARCHITECTURE.md` Section 7.2 is unchanged. No Reception bounded context is added or removed. |
| Module Catalogue Unchanged | `PRODUCT_BIBLE.md` Section 19.2 is unchanged. The 19-module catalogue is preserved. |
| `SYSTEM_ARCHITECTURE.md` Section 7.7 Unchanged | No façade module deviation is added to the deviation catalogue. Section 7.7 continues to document only the ratified deviations (BC09 Inventory, BC18 Feature Flags v1 packaging per ADR-007). |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This ADR was accepted by the Architecture Council on
2026-07-18. The decision is authoritative and binding on all downstream
documentation. Any future change or reversal requires a superseding ADR
accepted through the Architecture Council.

### 5.2 Accepted Decision Conditions

The following conditions form part of the accepted decision:

- The Council confirms that no façade module category is introduced at v1.
- The Council confirms that Reception is not a module and is to be reclassified as a workflow / operational process / experience surface.
- The Council confirms that the M14 module slot is freed for the canonical Identity & Access module.
- The Council commits to reviewing the decision if three or more cross-cutting capabilities emerge that cannot be cleanly housed as workflows or as capabilities within existing modules.
- The Council confirms that the rejection is reversible via a future ADR that introduces a façade module category with defined criteria.

### 5.3 Implementation Triggers

Upon ratification, the following implementation work is authorised (but not performed by this ADR):

- **Phase 2 downstream structural correction:** Relocate `docs/07_MODULES/RECEPTION.md` to a workflow document. Destination decided in a separate downstream correction decision.
- **Phase 3 downstream content correction:** Remove M14 module identity claim from the Reception workflow document; reframe as workflow with workflow metadata (workflow ID, participating BCs, trigger conditions, exit conditions, participating roles).
- **Phase 3 downstream content correction:** Update cross-references in `docs/02_PRODUCT/MODULES.md`, `docs/02_PRODUCT/FEATURES.md`, and any downstream doc that links to `RECEPTION.md`.
- **Phase 4 missing module file creation:** Create `docs/07_MODULES/IDENTITY_AND_ACCESS.md` for the canonical M14 Identity & Access module (no longer blocked by Reception collision).

---

## 6. Future Notes

### 6.1 Triggers for Revisiting the Façade Module Category Rejection

The rejection continues until one of the following triggers fires. When a trigger fires, the Architecture Council must convene to either ratify a successor ADR that introduces a façade module category or explicitly extend the rejection.

| Trigger | Description |
|---|---|
| Multiple Cross-Cutting Capabilities Emerge | Three or more cross-cutting capabilities emerge that cannot be cleanly housed as workflows or as capabilities within existing modules. Each capability would be a candidate for façade-module status. |
| Workflow Documentation Becomes Unmanageable | The workflow documentation structure becomes unmanageable due to the volume or complexity of cross-cutting workflows. A façade module category would provide a more structured home. |
| Cross-Cutting Capability Requires Module-Level Visibility | A cross-cutting capability requires module-level visibility (e.g., it must appear in the module catalogue for permission policy or audit purposes) that the workflow documentation structure cannot provide. |
| Customer Demand | Customer demand for module-level treatment of a cross-cutting capability justifies introducing the category. |

### 6.2 Process for Introducing a Façade Module Category

If a trigger fires, the introduction proceeds as follows:

1. **Draft introduction ADR** citing the trigger that fired and the proposed category criteria.
2. **Define category criteria** — what qualifies as a façade module, what does not, how façade modules are distinguished from standard modules, how they are coded (e.g., M-F1, M-F2 or another convention).
3. **Amend `PRODUCT_BIBLE.md` Section 19.2** to add the façade module category and list any modules ratified under it.
4. **Amend `SYSTEM_ARCHITECTURE.md` Section 7.7** to document the new category and any deviations from the standard one-to-one BC↔module mapping.
5. **Reclassify existing workflows** as façade modules if they meet the criteria.
6. **Mark the rejection portion of this ADR as Superseded** by the introduction ADR. The Reception-as-workflow portion of this ADR may remain in force if Reception is not reclassified as a façade module.

### 6.3 Open Questions for Downstream Correction Decisions

| Question | Description |
|---|---|
| Reception Workflow Destination | Where should the Reception workflow document live? Options: section within `docs/03_DOMAIN/CLINICAL_WORKFLOWS.md`; dedicated file `docs/03_DOMAIN/RECEPTION_WORKFLOW.md`; new directory `docs/15_WORKFLOWS/`. This is a downstream correction decision, not an ADR-level decision. |
| Workflow Metadata Schema | What metadata fields should a workflow document have? Proposed: workflow ID, participating BCs, trigger conditions, exit conditions, participating roles, audit attribution. This is a downstream correction decision. |
| Cross-Reference Conventions | How should workflow documents be cross-referenced from module documents and from other workflow documents? This is a downstream correction decision. |

### 6.4 Relationship to Other ADRs

| ADR | Relationship |
|---|---|
| ADR-002 (Modular Architecture) | Compatible. The rejection reinforces the modular monolith default; modules correspond to bounded contexts. |
| ADR-005 (Module Architecture) | Compatible. The rejection reinforces module boundary rules; no category is introduced that would blur boundaries. |
| ADR-007 (Feature Flags Packaging) | Independent. Feature Flags packaging is implementation packaging within an existing module surface, not a façade pattern. |
| ADR-009 (Subscriptions as a Billing Capability) | Compatible. Subscriptions is folded into an existing module rather than becoming a façade module. Both ADRs reinforce the rejection of new module categories. |
| ADR-010 (Inventory Bounded Context and Module Packaging) | Independent. Inventory is a bounded context with deferred module packaging, not a façade pattern. |

---

> **End of ADR-008.** This ADR is a ratified decision record. Implementation work authorised by this ADR is performed in separate phases per the remediation plan; this ADR does not perform that work.
