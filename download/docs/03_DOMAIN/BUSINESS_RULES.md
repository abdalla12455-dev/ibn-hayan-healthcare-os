# Ibn Hayan Healthcare Operating System — Business Rules

| Field | Value |
|---|---|
| Document Title | Business Rules |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a business rule amendment or ADR is ratified |
| Audience | Software architects, module owners, clinical informatics officers, compliance officers, business analysts, integration architects |
| Scope | Business rule catalogue across all bounded contexts of Ibn Hayan; rule definition standard, evaluation engine, conflict resolution, versioning, testing, documentation |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-rule serialization syntax, vendor-specific rule engines |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Business rule definitions in this document elaborate the workflow engine philosophy of SYSTEM_ARCHITECTURE Section 16 and the configuration-driven commitments of PRODUCT_BIBLE Section 22. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Business Rules Overview
2. Rule Definition Standard
3. Rule Catalog
4. Clinical Business Rules
5. Financial Business Rules
6. Administrative Business Rules
7. Regulatory Business Rules
8. Rule Ownership & Governance
9. Rule Evaluation Engine
10. Rule Conflict Resolution
11. Rule Versioning & Lifecycle
12. Rule Testing & Validation
13. Rule Documentation Standards
14. Related Documents

---

## 1. Business Rules Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for business rules used across the Ibn Hayan Healthcare Operating System. A business rule is a declarative statement that constrains or guides platform behaviour in support of clinical, financial, administrative, or regulatory objectives. A rule expresses what must be true, what must happen, or what is prohibited, independently of how the rule is enforced. The business rule catalogue is part of the platform's contract surface: bounded-context commands, queries, events, and configuration schemas reference business rules by their canonical identifier.

The discipline around business rules reflects the platform's broader posture on configuration and customization (PRODUCT_BIBLE Section 22). A business rule is a configuration artefact governed by the configuration lifecycle; rules are versioned, validated, and auditable, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. A rule that requires source-level implementation is not a business rule; it is a feature. The platform's commitment to configuration before customization (Principle P2) requires that the rule catalogue be expressive enough to cover the platform's behavioural surface without recourse to source modification.

This document sits below `SYSTEM_ARCHITECTURE.md` and aligns with `PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy), Section 28 (Offline Strategy), and Section 31 (Security Philosophy). Sibling documents include `STATUS_CODES.md` (which catalogues the status codes that rules transition), `CLINICAL_WORKFLOWS.md` (which catalogues the workflows that rules govern), and `CALCULATIONS.md` (which catalogues the calculations that rules invoke). Where this document and a sibling document appear to overlap, this document holds authority over rule definitions and evaluation semantics; STATUS_CODES.md holds authority over the status codes that rules transition; CLINICAL_WORKFLOWS.md holds authority over the workflow definitions that rules govern; CALCULATIONS.md holds authority over the calculations that rules invoke.

### 1.2 Business Rules vs Other Rules

Business rules in Ibn Hayan are distinct from other rule types. A business rule expresses a clinical, financial, administrative, or regulatory constraint on platform behaviour. A validation rule expresses a structural, referential, semantic, contextual, or regulatory constraint on configuration changes (SYSTEM_ARCHITECTURE Section 15.4). A permission rule expresses an authorization constraint on a principal's action (PRODUCT_BIBLE Section 21). A workflow rule expresses a sequencing constraint on workflow steps (SYSTEM_ARCHITECTURE Section 16). The four rule types are governed by different frameworks and are not interchangeable.

The distinction matters because the four rule types have different semantics, different enforcement points, and different audit implications. A business rule is evaluated by the business rule engine at the point of a consequential action; a validation rule is evaluated by the configuration validation engine at the point of a configuration change; a permission rule is evaluated by the authorization engine at the point of an access request; a workflow rule is evaluated by the workflow engine at the point of a workflow step. Mixing the four produces contracts that are ambiguous and audit trails that cannot be interpreted. The discipline of separating them is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) applied to the rule domain.

### 1.3 Business Rule Coverage

The business rule catalogue covers all bounded contexts of Ibn Hayan. Clinical business rules govern patient safety, clinical decision support, order appropriateness, and medication safety. Financial business rules govern billing accuracy, claim adjudication, payment posting, and accounting integrity. Administrative business rules govern scheduling, document management, notifications, and workforce management. Regulatory business rules govern compliance with regional regulatory frameworks, including data retention, audit reporting, and consent enforcement. The catalogue is comprehensive; a constraint on platform behaviour that is not a configuration validation rule, a permission rule, or a workflow rule is a business rule and is recorded in this catalogue.

The coverage is documented per rule category in Sections 4 through 7 of this document. Each section catalogues the rules in the corresponding category, with the rule's canonical identifier, name, owning module, trigger, condition, action, exception handling, and configuration surface. The catalogue is the binding reference for module specifications and integration contracts; a rule referenced by a module specification must be present in this catalogue.

### 1.4 Business Rule Posture

Ibn Hayan adopts a posture of disciplined business rule management. Four commitments govern this posture. First, business rules are declarative: a rule expresses what must be true, not how to make it true; the rule engine determines the enforcement mechanism. Second, business rules are versioned: a rule change is a new version of the rule, with the previous version retained for historical record interpretation. Third, business rules are auditable: every rule evaluation is recorded in the audit trail, including the rule, the input, the result, and the action triggered. Fourth, business rules are governed: a rule change is a configuration action ratified through the Architecture Council process.

The four commitments are the architectural floor for business rule management in Ibn Hayan. A module that enforces a business rule in source code is defective; the rule must be declared in the rule catalogue and evaluated by the rule engine. A module that evaluates a rule without audit is defective; the rule evaluation must be recorded in the audit trail. A module that uses an unregistered rule is defective; the rule must be present in the catalogue. The configuration service enforces these commitments at validation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.5 Ibn Hayan Identity and Business Rules

Business rules are part of the structural vocabulary by which Ibn Hayan maintains its one-platform identity (PRODUCT_BIBLE Section 1.5). A business rule recorded in a small clinic is the same rule recorded in a multi-national hospital network; the platform's rule engine treats them identically. This consistency is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to the rule domain. Where regional variation requires different rule semantics (for example, a regional regulatory framework may require an additional rule for consent verification), the variation is expressed through rule parameters and regional rule overlays registered through the Architecture Council, not through region-specific rule forks.

---

## 2. Rule Definition Standard

### 2.1 Rule Naming Conventions

Business rule names in Ibn Hayan follow a documented naming convention. The rule's canonical identifier is a stable code of the form `BR-{module}-{category}-{sequence}` (for example, `BR-BC04-CLIN-014` for the fourteenth clinical rule in the Orders & Results bounded context). The rule's display name is a human-readable summary of the rule's intent (for example, "Allergy Check Before Medication Order"). The rule's description is a one-sentence statement of the rule's purpose, including the constraint, the trigger, and the action. The three identifiers are stable; renaming a rule follows the deprecation policy documented in Section 11.

The naming convention is enforced by the Architecture Council at rule registration. A rule that does not follow the convention is rejected; the rejection is recorded with the rationale. The convention is the structural mechanism by which the platform's rule catalogue remains coherent and navigable across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 2.2 Rule Metadata

Each business rule is registered with a defined set of metadata. The metadata records the rule's canonical identifier, display name, description, owning module, owning bounded context, category (clinical, financial, administrative, regulatory), trigger, condition, action, exception handling, configuration surface, version, status (Active, Deprecated, Retired), and the ADR that ratified the rule. The metadata is the rule's authoritative definition; downstream consumers reference the metadata, not ad hoc definitions in module specifications.

The metadata is versioned. A change to the metadata (modifying the condition, modifying the action, deprecating the rule) is a new version of the rule. The previous version is retained for historical record interpretation. The metadata's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5, ensuring that the platform's rule adoption history is recoverable indefinitely.

### 2.3 Rule Structure

Each business rule is structured into four parts: trigger, condition, action, and exception handling. The trigger specifies when the rule is evaluated (for example, "before a medication order is submitted"). The condition specifies the constraint that the rule evaluates (for example, "the patient has an active allergy to the ordered medication's active ingredient"). The action specifies what the rule does if the condition is met (for example, "block the order and alert the prescriber"). The exception handling specifies what the rule does if the condition cannot be evaluated (for example, "if the allergy database is unavailable, allow the order with a warning and require manual sign-off").

The four-part structure is the rule's contract with the rule engine. The engine evaluates the trigger to determine when to invoke the rule; it evaluates the condition to determine the rule's result; it executes the action to enforce the rule; it executes the exception handling to handle evaluation failures. The structure is the architectural expression of Principle P14 (Simplicity Over Complexity) — a uniform rule structure is simpler to evaluate, audit, and evolve than ad hoc rule structures.

### 2.4 Rule Configuration Surface

Each business rule declares its configuration surface: the parameters that may be configured per tenant, per facility, or per department, and the parameters that are fixed at the platform level. For example, a rule that requires allergy check before medication order may permit the tenant to configure whether the rule is enforced as a hard block or a soft warning; the rule's trigger (before medication order) is fixed at the platform level. The configuration surface is documented in the rule's metadata and is governed by the configuration layer model documented in SYSTEM_ARCHITECTURE Section 15.2.

The configuration surface discipline is the architectural expression of Principle P2 (Configuration Before Customization) applied to the rule domain. A rule whose parameters are hard-coded in source code is defective; the parameters must be exposed through the configuration surface. A rule whose configuration surface is overly broad (permitting the tenant to disable the rule entirely where the rule is clinically necessary) is defective; the configuration surface must be scoped to parameters that the tenant may legitimately vary. The discipline is the structural mechanism by which the platform balances configurability with clinical safety.

### 2.5 Default Rule Posture

Each business rule declares a default posture: Enforced (the rule is active and blocks non-compliant actions), Advisory (the rule is active and warns but does not block), or Dormant (the rule is defined but not active). The default posture is chosen for safety: clinical safety rules default to Enforced; advisory rules default to Advisory; rules whose activation depends on tenant configuration default to Dormant. The default posture is documented in the rule's metadata and may be overridden through the configuration surface where the rule permits.

The default posture discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the rule domain. A clinical safety rule that defaults to Dormant would compromise patient safety; the platform defaults clinical safety rules to Enforced and requires explicit configuration to relax them. The discipline is the structural mechanism by which the platform's rule catalogue maintains its safety posture across the platform's deployment spectrum, from a solo practitioner clinic to a multi-national hospital network.

---

## 3. Rule Catalog

### 3.1 Catalog Structure

The business rule catalogue is organized into four categories: clinical, financial, administrative, and regulatory. Each category is documented in its own section (Sections 4 through 7). Within each category, rules are grouped by owning bounded context. Each rule is recorded with its canonical identifier, display name, owning module, trigger, condition, action, exception handling, and configuration surface. The catalogue is the platform's authoritative reference for business rules; downstream consumers reference the catalogue, not ad hoc rule definitions.

The catalogue is versioned. A change to the catalogue (a new rule, a rule modification, a rule deprecation) is a new version of the catalogue. The previous version is retained for historical record interpretation. The catalogue's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5, ensuring that the platform's rule catalogue history is recoverable indefinitely.

### 3.2 Catalogue Coverage Summary

The table below summarizes the rule catalogue by category and bounded context. The summary is the cross-context view that the Architecture Council uses to identify rule gaps, inconsistencies, and opportunities for rule harmonization. The detailed rule definitions are in Sections 4 through 7.

| Category | Bounded Contexts Covered | Approximate Rule Count | Posture |
|---|---|---|---|
| Clinical | BC01, BC02, BC03, BC04, BC05 | 60–80 | Predominantly Enforced; some Advisory |
| Financial | BC07, BC08 | 40–60 | Predominantly Enforced; some Advisory |
| Administrative | BC06, BC09, BC10, BC11, BC12, BC13, BC14 | 50–70 | Mixed Enforced and Advisory |
| Regulatory | All contexts (cross-cutting) | 30–50 | Enforced where mandated; Advisory where guidance |
| Platform | BC15, BC16, BC17, BC18, BC19 | 20–30 | Enforced; platform-level |

### 3.3 Rule Identification

Each business rule is identified by its canonical identifier of the form `BR-{module}-{category}-{sequence}`. The module code corresponds to the owning bounded context (for example, BC04 for Orders & Results). The category code is `CLIN` for clinical, `FIN` for financial, `ADM` for administrative, `REG` for regulatory, and `PLT` for platform. The sequence is a three-digit zero-padded number assigned in registration order. The identifier is stable; a rule's identifier does not change across versions.

The identification discipline ensures that rules are unambiguously referenced across the platform. A module specification that references `BR-BC04-CLIN-014` references a specific rule in the catalogue; the rule's full definition is recovered from the catalogue by its identifier. The discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) — rules are referenced by their contract (the identifier), not by their internals (the rule's definition).

### 3.4 Rule Cross-References

Business rules may cross-reference other rules, status codes, calculations, and workflows. A cross-reference is recorded in the rule's metadata. For example, a clinical rule that blocks a medication order based on an allergy may cross-reference the medication order status code (MedicationOrderStatus) documented in STATUS_CODES.md and the allergy check calculation documented in CALCULATIONS.md. The cross-references are the structural mechanism by which the platform's rule catalogue is integrated with the platform's broader contract surface.

Cross-references are bidirectional where appropriate. If rule A references status code S, the status code's documentation includes a back-reference to rule A. The bidirectional discipline ensures that the impact of a change to one artefact (for example, adding a new status value to a status code) is visible in the artefacts that depend on it (for example, the rules that transition to or from the status). The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every dependency is recorded, and every dependency's impact is recoverable.

---

## 4. Clinical Business Rules

### 4.1 Patient Safety Rules

Patient safety rules govern actions that may compromise patient safety if performed incorrectly. The rules are owned by the Patient bounded context (BC01), the Encounter bounded context (BC02), and the Clinical Documentation bounded context (BC03). The rules default to Enforced posture; relaxation requires explicit configuration through the configuration surface.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC01-CLIN-001 | Patient Identity Verification | BC01 | Before clinical action | Patient identity must be verified against two identifiers | Allow action; record verification | If verification cannot be performed, require break-glass access | Verification identifiers configurable per tenant |
| BR-BC01-CLIN-002 | Active Consent Check | BC01 | Before clinical encounter | Patient must have active treatment consent | Allow encounter; if no consent, prompt for consent capture | If consent cannot be verified, require manual sign-off | Consent type required configurable per region |
| BR-BC01-CLIN-003 | Confidentiality Access Verification | BC01 | Before accessing restricted patient record | User must have break-glass authorization or explicit access | Allow access; record access context | If authorization cannot be verified, deny access | Break-glass scope configurable per role |
| BR-BC01-CLIN-004 | Deceased Patient Action Restriction | BC01 | Before clinical action on deceased patient | Action must be permitted for deceased patients (e.g., record review, certificate issuance) | Allow permitted actions; block others | If action status is ambiguous, require manual sign-off | Permitted actions configurable per tenant |
| BR-BC01-CLIN-005 | Minor Patient Consent | BC01 | Before clinical action on minor | Consent must be granted by parent or guardian | Allow action with guardian consent | If guardian cannot be identified, require manual sign-off | Age of majority configurable per region |

### 4.2 Medication Safety Rules

Medication safety rules govern medication ordering, dispensing, and administration. The rules are owned by the Pharmacy bounded context (BC05) and interact with the Patient bounded context (BC01) for allergy and problem-list data. The rules default to Enforced posture; relaxation is prohibited for rules that protect against medication-related harm.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC05-CLIN-011 | Allergy Check Before Medication Order | BC05 | Before medication order submission | Patient must not have active allergy to medication's active ingredient | Block order; alert prescriber | If allergy database unavailable, allow with manual sign-off | Allergy severity threshold configurable |
| BR-BC05-CLIN-012 | Drug-Drug Interaction Check | BC05 | Before medication order submission | Ordered medication must not have severe interaction with patient's active medications | Block order; alert prescriber with interaction details | If interaction database unavailable, allow with manual sign-off | Interaction severity threshold configurable |
| BR-BC05-CLIN-013 | Dose Range Check | BC05 | Before medication order submission | Ordered dose must be within accepted range for patient's weight and age | Block order if outside range; warn if at range edge | If weight unavailable, prompt for weight entry | Range source configurable (pediatric vs adult) |
| BR-BC05-CLIN-014 | Controlled Substance Schedule Verification | BC05 | Before controlled substance dispensing | Dispensing must comply with controlled substance schedule requirements | Allow dispensing if compliant; block otherwise | If compliance cannot be verified, require manual sign-off | Schedule requirements configurable per region |
| BR-BC05-CLIN-015 | Medication Reconciliation at Admission | BC05 | At inpatient admission | Patient's home medications must be reconciled with ordered medications | Block admission progression if reconciliation incomplete | If reconciliation cannot be performed (e.g., unconscious patient), allow with documentation | Reconciliation scope configurable per facility |
| BR-BC05-CLIN-016 | High-Alert Medication Double Check | BC05 | Before high-alert medication administration | Administration must be verified by second qualified practitioner | Allow administration after double check; block otherwise | If second practitioner unavailable, allow with documentation and escalation | High-alert list configurable per facility |

### 4.3 Order Appropriateness Rules

Order appropriateness rules govern the appropriateness of diagnostic and therapeutic orders. The rules are owned by the Orders & Results bounded context (BC04). The rules default to Enforced or Advisory posture depending on the rule's safety impact.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC04-CLIN-021 | Duplicate Order Check | BC04 | Before order submission | Same order must not exist for same patient within duplicate window | Block duplicate; alert ordering practitioner | If duplicate check unavailable, allow with warning | Duplicate window configurable per order type |
| BR-BC04-CLIN-022 | Pre-Authorization Required | BC04 | Before order submission for specified services | Pre-authorization must be obtained for services requiring it | Block submission; prompt for pre-authorization | If pre-auth status unavailable, allow with documentation | Pre-auth list configurable per payer |
| BR-BC04-CLIN-023 | Result Follow-Up Notification | BC04 | On result availability | Ordering practitioner must be notified of result availability | Send notification; record notification | If notification cannot be sent, retry with escalation | Notification channel configurable per practitioner |
| BR-BC04-CLIN-024 | Critical Result Escalation | BC04 | On critical result availability | Critical result must be escalated to ordering practitioner within SLA | Escalate through notification and in-person alert | If escalation fails, escalate to designated alternate | SLA and escalation chain configurable per facility |
| BR-BC04-CLIN-025 | Result Acknowledgement Required | BC04 | On result viewing | Result must be acknowledged by ordering practitioner within SLA | Track acknowledgement; escalate if missed | If acknowledgement cannot be tracked, flag result as unacknowledged | SLA configurable per result criticality |

### 4.4 Clinical Documentation Rules

Clinical documentation rules govern the integrity and completeness of clinical documentation. The rules are owned by the Clinical Documentation bounded context (BC03). The rules default to Enforced posture for documentation that affects clinical safety; Advisory posture for documentation that affects completeness.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC03-CLIN-031 | Note Signing Authority | BC03 | Before clinical note signing | Signer must have signing authority for note type | Allow signing; record signer | If authority cannot be verified, block signing | Authority matrix configurable per facility |
| BR-BC03-CLIN-032 | Note Amendment Documentation | BC03 | On clinical note amendment | Amendment must include reason and author | Allow amendment with documentation | If reason not provided, block amendment | Reason code list configurable per tenant |
| BR-BC03-CLIN-033 | Discharge Summary Required | BC03 | At inpatient discharge | Discharge summary must be completed within SLA | Block discharge progression if summary incomplete | If summary cannot be completed (e.g., patient left AMA), document exception | SLA configurable per facility |
| BR-BC03-CLIN-034 | Allergy List Maintenance | BC03 | On allergy-relevant encounter | Allergy list must be reviewed and updated at allergy-relevant encounters | Prompt for allergy list review | If review cannot be performed, document exception | Allergy-relevant encounter types configurable per tenant |
| BR-BC03-CLIN-035 | Problem List Reconciliation | BC03 | At encounter discharge | Problem list must be reconciled with encounter findings | Prompt for reconciliation | If reconciliation cannot be performed, document exception | Reconciliation scope configurable per encounter type |

---

## 5. Financial Business Rules

### 5.1 Billing Rules

Billing rules govern the accuracy and integrity of invoices. The rules are owned by the Billing bounded context (BC07) and interact with the Encounter bounded context (BC02) for service delivery records. The rules default to Enforced posture.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC07-FIN-001 | Service Authorization Before Billing | BC07 | Before invoice line creation | Service must have been authorized (encounter, order, or pre-auth) | Allow line; record authorization | If authorization unavailable, block line | Authorization types configurable per tenant |
| BR-BC07-FIN-002 | Price List Application | BC07 | On invoice line creation | Price must be drawn from active price list for service and payer | Apply price; record price list version | If price list unavailable, block line | Price list selection configurable per tenant and payer |
| BR-BC07-FIN-003 | Tax Calculation | BC07 | On invoice line creation | Tax must be calculated per applicable tax rules | Apply tax; record tax rule | If tax rule unavailable, block line | Tax rules configurable per region |
| BR-BC07-FIN-004 | Discount Authorization | BC07 | On discount application | Discount must be authorized by configured authority | Apply discount; record authorization | If authorization unavailable, block discount | Authorization matrix configurable per tenant |
| BR-BC07-FIN-005 | Invoice Total Integrity | BC07 | On invoice issue | Invoice total must equal sum of line totals plus tax minus discount | Block issue if integrity check fails | If check cannot be performed, block issue | Tolerance configurable per tenant |
| BR-BC07-FIN-006 | Invoice Number Sequentiality | BC07 | On invoice issue | Invoice number must be sequential per tenant and invoice type | Assign next number; record assignment | If sequentiality cannot be ensured, block issue | Numbering scheme configurable per tenant |

### 5.2 Claim Rules

Claim rules govern the submission and adjudication of insurance claims. The rules are owned by the Billing bounded context (BC07) and interact with the integration architecture for payer exchange. The rules default to Enforced posture; rules that depend on payer-specific requirements are configurable.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC07-FIN-011 | Claim Format Compliance | BC07 | Before claim submission | Claim must conform to payer's required format (e.g., X12 837) | Allow submission; record format | If conformance cannot be verified, block submission | Payer formats configurable per tenant |
| BR-BC07-FIN-012 | Coding Completeness | BC07 | Before claim submission | Claim must have all required codes (diagnosis, procedure) | Allow submission; record completeness | If completeness cannot be verified, block submission | Required codes configurable per payer |
| BR-BC07-FIN-013 | Coordination of Benefits | BC07 | On claim with multiple coverages | Primary coverage must be billed before secondary | Bill primary first; record sequence | If primary cannot be determined, prompt for manual determination | Coverage priority rules configurable per tenant |
| BR-BC07-FIN-014 | Claim Submission Deadline | BC07 | On claim creation | Claim must be submitted within payer's timely-filing window | Allow submission; track deadline | If deadline cannot be determined, alert for manual review | Filing windows configurable per payer |
| BR-BC07-FIN-015 | Denial Reason Capture | BC07 | On claim denial | Denial must be recorded with payer's denial reason code | Record denial; trigger appeal workflow | If reason code unavailable, record with generic code | Code mapping configurable per payer |
| BR-BC07-FIN-016 | Appeal Deadline Tracking | BC07 | On claim denial with appeal option | Appeal must be filed within payer's appeal window | Track appeal deadline; alert on approach | If window cannot be determined, alert for manual review | Appeal windows configurable per payer |

### 5.3 Payment Rules

Payment rules govern the posting and reconciliation of payments. The rules are owned by the Billing bounded context (BC07) and interact with the Accounting bounded context (BC08) for ledger posting. The rules default to Enforced posture.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC07-FIN-021 | Payment Reconciliation | BC07 | On payment posting | Payment must reconcile to invoice or claim | Allow posting; record reconciliation | If reconciliation fails, post to suspense account | Suspense account configurable per tenant |
| BR-BC07-FIN-022 | Refund Authorization | BC07 | On refund initiation | Refund must be authorized by configured authority | Allow refund; record authorization | If authorization unavailable, block refund | Authorization matrix configurable per tenant |
| BR-BC07-FIN-023 | Write-Off Authorization | BC07 | On write-off initiation | Write-off must be authorized by configured authority | Allow write-off; record authorization | If authorization unavailable, block write-off | Authorization thresholds configurable per tenant |
| BR-BC07-FIN-024 | Payment Method Validation | BC07 | On payment posting | Payment method must be valid for payer and amount | Allow posting; record method | If method invalid, block posting | Valid methods configurable per tenant |

### 5.4 Accounting Rules

Accounting rules govern the integrity of the general ledger. The rules are owned by the Accounting bounded context (BC08) and follow double-entry accounting conventions. The rules default to Enforced posture.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC08-FIN-031 | Double-Entry Balance | BC08 | On journal entry posting | Debits must equal credits | Allow posting; record balance | If balance fails, block posting | — |
| BR-BC08-FIN-032 | Period Closing | BC08 | On fiscal period closing | All entries for period must be posted or reversed | Allow closing; record closure | If entries pending, block closing | Closing schedule configurable per tenant |
| BR-BC08-FIN-033 | Reversal Documentation | BC08 | On journal entry reversal | Reversal must include reason and authorization | Allow reversal; record documentation | If documentation unavailable, block reversal | Reason codes configurable per tenant |
| BR-BC08-FIN-034 | Account Reconciliation | BC08 | On scheduled reconciliation | Sub-ledger must reconcile to general ledger | Allow reconciliation; record result | If reconciliation fails, flag for investigation | Reconciliation schedule configurable per tenant |

---

## 6. Administrative Business Rules

### 6.1 Scheduling Rules

Scheduling rules govern the integrity of appointment scheduling. The rules are owned by the Scheduling bounded context (BC06). The rules default to Enforced posture for rules that prevent double-booking; Advisory posture for rules that guide optimal scheduling.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC06-ADM-001 | Double-Booking Prevention | BC06 | On appointment booking | Slot must not be already booked | Allow booking; record slot assignment | If slot unavailable, block booking | — |
| BR-BC06-ADM-002 | Practitioner Availability | BC06 | On appointment booking | Practitioner must be available at requested time | Allow booking; record availability check | If availability cannot be verified, block booking | Availability source configurable per tenant |
| BR-BC06-ADM-003 | Appointment Type Slot Match | BC06 | On appointment booking | Slot must match appointment type's required duration and resource | Allow booking; record match | If match fails, suggest alternative slot | Type-slot mapping configurable per tenant |
| BR-BC06-ADM-004 | Cancellation Notice | BC06 | On appointment cancellation | Cancellation must be within notice window to avoid no-show fee | Apply fee if outside window; record cancellation | If window cannot be determined, allow cancellation without fee | Notice window configurable per appointment type |
| BR-BC06-ADM-005 | No-Show Tracking | BC06 | On appointment no-show | No-show must be recorded for patient history | Record no-show; trigger follow-up workflow | If no-show cannot be confirmed, allow marking as no-show with documentation | Follow-up workflow configurable per tenant |

### 6.2 Document Management Rules

Document management rules govern the lifecycle of clinical and administrative documents. The rules are owned by the Documents bounded context (BC13). The rules default to Enforced posture for rules that affect document integrity.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC13-ADM-011 | Document Version Control | BC13 | On document update | Document update must create new version; previous version retained | Allow update; record version | If versioning cannot be performed, block update | Versioning scheme configurable per document type |
| BR-BC13-ADM-012 | Document Access Authorization | BC13 | On document access | User must have access authorization for document type and patient | Allow access; record authorization | If authorization unavailable, deny access | Authorization matrix configurable per role |
| BR-BC13-ADM-013 | Document Retention | BC13 | On document retention schedule | Document must be retained per regulatory retention period | Apply retention; record schedule | If retention period cannot be determined, retain indefinitely | Retention periods configurable per region |
| BR-BC13-ADM-014 | Document Disposal Authorization | BC13 | On document disposal | Disposal must be authorized per retention policy | Allow disposal; record authorization | If authorization unavailable, block disposal | Disposal authorization configurable per tenant |

### 6.3 Notification Rules

Notification rules govern the dispatch of notifications to patients, practitioners, and administrators. The rules are owned by the Notifications bounded context (BC14). The rules default to Enforced posture for rules that affect patient safety notifications; Advisory posture for rules that affect operational notifications.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC14-ADM-021 | Appointment Reminder Dispatch | BC14 | On appointment reminder schedule | Reminder must be dispatched through patient's preferred channel | Dispatch reminder; record dispatch | If dispatch fails, retry with fallback channel | Reminder schedule and channels configurable per tenant |
| BR-BC14-ADM-022 | Critical Result Notification | BC14 | On critical result availability | Notification must be dispatched to ordering practitioner within SLA | Dispatch notification; record dispatch | If dispatch fails, escalate through alternate channel | SLA and escalation chain configurable per facility |
| BR-BC14-ADM-023 | Patient Communication Preference | BC14 | Before notification dispatch | Notification must respect patient's communication preferences | Dispatch per preferences; record preferences | If preferences unavailable, use default channel | Default channel configurable per tenant |
| BR-BC14-ADM-024 | Notification Suppression | BC14 | Before notification dispatch | Notification must be suppressed if suppression criteria met (e.g., patient opted out) | Suppress notification; record suppression | If suppression criteria unavailable, dispatch with default | Suppression criteria configurable per tenant |

### 6.4 Workforce and HR Rules

Workforce and HR rules govern workforce scheduling, time and attendance, and human resources processes. The rules are owned by the Workforce bounded context (BC10) and the HR bounded context (BC12). The rules default to Enforced posture for rules that affect labor-law compliance; Advisory posture for rules that affect operational efficiency.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC10-ADM-031 | Shift Coverage | BC10 | On shift scheduling | Each scheduled shift must have required coverage by role | Allow schedule; record coverage | If coverage insufficient, alert for manual scheduling | Coverage requirements configurable per facility |
| BR-BC10-ADM-032 | Credential Verification | BC10 | On shift assignment | Assigned practitioner must have active credentials for shift's clinical scope | Allow assignment; record credential check | If credential check fails, block assignment | Credential requirements configurable per role |
| BR-BC12-ADM-033 | Payroll Calculation | BC12 | On payroll cycle | Payroll must be calculated per employment terms and applicable labor law | Calculate payroll; record calculation | If calculation fails, block payroll and alert | Calculation rules configurable per region |
| BR-BC12-ADM-034 | Leave Authorization | BC12 | On leave request | Leave must be authorized by configured authority | Allow leave; record authorization | If authorization unavailable, block leave | Authorization matrix configurable per tenant |

---

## 7. Regulatory Business Rules

### 7.1 Consent and Authorization Rules

Consent and authorization rules govern the platform's compliance with consent regulations. The rules are cross-cutting across bounded contexts but are coordinated by the Patient bounded context (BC01) and the Identity & Access bounded context (BC15). The rules default to Enforced posture.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC15-REG-001 | Consent Before Treatment | BC15 | Before clinical encounter | Patient must have granted treatment consent | Allow encounter; record consent | If consent unavailable, block encounter (except emergency) | Consent requirements configurable per region |
| BR-BC15-REG-002 | Consent Before Data Sharing | BC15 | Before data sharing with external party | Patient must have granted data-sharing consent | Allow sharing; record consent | If consent unavailable, block sharing | Sharing scope configurable per tenant |
| BR-BC15-REG-003 | Emergency Access Documentation | BC15 | On break-glass access | Break-glass access must be documented with reason | Allow access; record documentation | If documentation unavailable, allow access and require post-hoc documentation | Documentation requirements configurable per region |
| BR-BC15-REG-004 | Minor's Guardian Authorization | BC15 | Before clinical action on minor | Guardian must have authorization for action | Allow action; record guardian authorization | If authorization unavailable, block action (except emergency) | Guardian authorization rules configurable per region |

### 7.2 Data Retention Rules

Data retention rules govern the platform's compliance with data retention regulations. The rules are cross-cutting across bounded contexts. The rules default to Enforced posture; relaxation is prohibited for rules mandated by regulation.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC17-REG-011 | Audit Record Retention | BC17 | On audit record creation | Audit record must be retained per regulatory retention period | Retain record; schedule disposal at end of period | If retention period unavailable, retain indefinitely | Retention periods configurable per region |
| BR-BC01-REG-012 | Patient Record Retention | BC01 | On patient record creation | Patient record must be retained per regulatory retention period (often patient's lifetime plus a period) | Retain record; schedule disposal at end of period | If retention period unavailable, retain indefinitely | Retention periods configurable per region |
| BR-BC13-REG-013 | Clinical Document Retention | BC13 | On document creation | Document must be retained per regulatory retention period | Retain document; schedule disposal at end of period | If retention period unavailable, retain indefinitely | Retention periods configurable per document type and region |
| BR-BC07-REG-014 | Financial Record Retention | BC07 | On financial record creation | Financial record must be retained per regulatory retention period | Retain record; schedule disposal at end of period | If retention period unavailable, retain indefinitely | Retention periods configurable per region |

### 7.3 Reporting Rules

Reporting rules govern the platform's compliance with regulatory reporting requirements. The rules are cross-cutting across bounded contexts. The rules default to Enforced posture for mandatory reports; Advisory posture for optional reports.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC17-REG-021 | Mandatory Report Submission | BC17 | On report schedule | Mandatory report must be submitted to regulator within deadline | Generate report; submit; record submission | If submission fails, retry with escalation | Report schedules and formats configurable per region |
| BR-BC05-REG-022 | Controlled Substance Reporting | BC05 | On controlled substance dispensing | Dispensing must be reported to controlled-substance monitoring program | Generate report; submit; record submission | If submission fails, retry with escalation | Reporting requirements configurable per region |
| BR-BC04-REG-023 | Notifiable Disease Reporting | BC04 | On notifiable disease diagnosis | Diagnosis must be reported to public health authority within deadline | Generate report; submit; record submission | If submission fails, retry with escalation | Notifiable disease list and reporting requirements configurable per region |
| BR-BC17-REG-024 | Breach Notification | BC17 | On security breach detection | Breach must be reported to affected individuals and regulators within deadline | Generate notifications; submit; record submission | If notification fails, retry with escalation | Notification requirements configurable per region |

### 7.4 Privacy and Data Protection Rules

Privacy and data protection rules govern the platform's compliance with privacy regulations. The rules are cross-cutting across bounded contexts but are coordinated by the Identity & Access bounded context (BC15). The rules default to Enforced posture.

| Rule ID | Rule Name | Module | Trigger | Condition | Action | Exception Handling | Configuration Surface |
|---|---|---|---|---|---|---|---|
| BR-BC15-REG-031 | Minimum Necessary Access | BC15 | On access request | Access must be limited to minimum necessary for the user's purpose | Allow access; record scope | If scope cannot be determined, deny access | Scope rules configurable per role |
| BR-BC15-REG-032 | Data Subject Access Request | BC15 | On data subject access request | Request must be fulfilled within regulatory deadline | Generate response; submit; record response | If response cannot be generated, escalate | Response deadlines configurable per region |
| BR-BC15-REG-033 | Data Subject Erasure Request | BC15 | On data subject erasure request | Request must be fulfilled within regulatory deadline, subject to retention obligations | Erase data where permitted; retain where mandated; record response | If erasure cannot be performed, escalate | Erasure rules configurable per region |
| BR-BC15-REG-034 | Cross-Border Data Transfer | BC15 | On cross-border data transfer | Transfer must comply with cross-border transfer regulations | Allow transfer if compliant; block otherwise | If compliance cannot be verified, block transfer | Transfer rules configurable per region |

---

## 8. Rule Ownership & Governance

### 8.1 Governance Bodies

Business rule governance in Ibn Hayan is exercised by three bodies. The Architecture Council holds overall authority for rule registration, modification, and deprecation. The Clinical Informatics Council holds advisory authority for clinical rules, including clinical safety rules and clinical decision support rules. The Regional Council holds advisory authority for regional rules, including regulatory rules and region-specific business rules. All three bodies operate under the Architecture Council's ratification process documented in SYSTEM_ARCHITECTURE Section 1.2.

Governance is exercised through Architecture Decision Records. A rule registration, modification, or deprecation is ratified through an ADR. The ADR records the decision, the alternatives considered, the rationale, the consequences, and the amendment mechanism. The ADR is recorded in the CHANGELOG with the version increment. This discipline is the direct expression of Principle P7 (Documented Before Implemented) defined in SYSTEM_ARCHITECTURE Section 4.7.1.

### 8.2 Rule Ownership

Each business rule has a designated owner. The owner is the bounded context that owns the rule (for example, the Pharmacy bounded context owns medication safety rules). The owner is responsible for the rule's definition, the rule's evolution, the rule's testing, and the rule's operational behaviour. The owner is the contact point for questions about the rule and is the authority for rule changes within the Architecture Council process.

Ownership is recorded in the rule's metadata. A rule that does not have a designated owner is defective; the rule cannot be evolved or maintained without an owner. Ownership may be transferred between bounded contexts through an ADR, with the transfer recorded in the rule's metadata. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every rule has a traceable owner, and every rule change has a traceable authorization.

### 8.3 Rule Proposal Process

A business rule proposal is submitted to the Architecture Council with the following content: the rule's display name, description, owning bounded context, category, trigger, condition, action, exception handling, configuration surface, default posture, and rationale. The proposal is reviewed at the next Architecture Council meeting, with the decision recorded in an ADR. Approved rules are added to the catalogue in a new version, with the version increment recorded in the CHANGELOG.

The proposal process is the structural mechanism by which the platform's rule catalogue evolves with the platform's scope. A proposal that does not include the required content is rejected; the rejection is recorded with the rationale. The process is the architectural expression of Principle P7 (Documented Before Implemented) applied to the rule domain. The process is also the structural mechanism by which the platform's rule catalogue remains coherent: a rule that bypasses the proposal process may duplicate an existing rule or conflict with an existing rule, producing ambiguity and audit failures.

### 8.4 Rule Impact Assessment

Each rule proposal includes an impact assessment. The assessment covers the modules that the rule affects, the workflows that the rule governs, the integrations that the rule interacts with, the calculations that the rule invokes, the status codes that the rule transitions, and the configuration surface that the rule exposes. The assessment is the basis for the rule's testing plan: where the rule affects downstream consumers, the testing plan documents the validation required before the rule is activated.

The impact assessment discipline ensures that rules do not produce unintended consequences. A rule that blocks a medication order based on an allergy may produce a workflow that does not handle the block; a rule that requires pre-authorization may produce an integration that does not recognize the requirement. The impact assessment surfaces these consequences before the rule is ratified, in keeping with the platform's disciplined integration posture documented in PRODUCT_BIBLE Section 29.

---

## 9. Rule Evaluation Engine

### 9.1 Engine Architecture

The business rule evaluation engine is the platform's mechanism for evaluating business rules at the point of consequential actions. The engine is part of the Orchestration Layer documented in SYSTEM_ARCHITECTURE Section 6.4 and interacts with the bounded contexts through their command and event contracts (SYSTEM_ARCHITECTURE Section 7.4). The engine is not part of any single bounded context; it is a platform-level service consumed by all bounded contexts.

The engine architecture is governed by four design commitments. First, the engine is stateless: rule evaluations are not stored in engine state; the engine evaluates each rule on demand, using the rule's definition from the catalogue and the input from the caller. Second, the engine is deterministic: for a given rule, input, and rule version, the engine produces the same result. Third, the engine is auditable: every evaluation is recorded in the audit trail, including the rule, the input, the result, and the action triggered. Fourth, the engine is fast: rule evaluation does not produce unacceptable latency on the request path; rules that cannot be evaluated quickly are re-architected or moved to asynchronous evaluation.

### 9.2 Evaluation Triggers

Rule evaluation is triggered by one of four mechanisms. First, command interception: the engine intercepts a command before it is executed by a bounded context, evaluates the rules that govern the command, and either permits the command (with rule actions applied) or blocks it (with rejection recorded). Second, event reaction: the engine reacts to an event emitted by a bounded context, evaluates the rules that govern the event, and executes the rule actions. Third, schedule: the engine evaluates rules on a schedule (for example, a rule that checks for overdue invoices daily). Fourth, manual invocation: the engine evaluates a rule on manual invocation by an authorized user (for example, a rule that checks claim eligibility before submission).

The four trigger mechanisms cover the platform's rule evaluation needs. Command interception covers synchronous rules that must be evaluated before an action; event reaction covers asynchronous rules that respond to an action; schedule covers time-based rules; manual invocation covers on-demand rules. The engine supports all four mechanisms, with the mechanism selected per rule through configuration.

### 9.3 Evaluation Context

Rule evaluation is performed in a defined context. The context includes the rule version, the input (the action that triggered the evaluation), the patient or entity (where applicable), the tenant, the facility (where applicable), the user, and the session. The context is the basis for the rule's evaluation: the rule's condition is evaluated against the context, and the rule's action is executed in the context. The context is recorded in the audit trail alongside the rule's result.

The evaluation context discipline ensures that rule evaluations are reproducible. A rule evaluation recorded in the audit trail can be reproduced by re-evaluating the rule against the recorded context, producing the same result. This reproducibility is critical for audit investigation: a question about why a rule produced a particular result can be answered by re-evaluating the rule against the recorded context. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the rule domain.

### 9.4 Evaluation Performance

Rule evaluation performance is governed by the engine's caching strategy. The engine caches rule definitions, rule compilations (where the rule is compiled for evaluation), and rule evaluation results (where the same rule is evaluated against the same input within a cache window). The cache is invalidated on rule version change. The cache is scoped to the tenant, ensuring that one tenant's cache does not affect another tenant's performance.

The performance discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the rule domain. A more complex caching strategy that attempted to predict evaluation patterns would add complexity without proportionate benefit; the simple cache-with-invalidation strategy is sufficient. The strategy is reviewed at each quarterly Architecture Council review to confirm that it continues to meet the platform's performance commitments.

### 9.5 Evaluation Failure Handling

Rule evaluation may fail for one of three reasons: the rule's condition cannot be evaluated (for example, a referenced database is unavailable), the rule's action cannot be executed (for example, a referenced notification channel is unavailable), or the rule's exception handling cannot be executed (for example, the exception handling itself fails). The engine handles each failure type according to the rule's exception handling, with the failure recorded in the audit trail.

The failure handling discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the rule domain. A rule that fails open (permits the action despite the failure) where the rule protects against clinical harm would compromise patient safety; the rule's exception handling must be designed to fail safe (block the action and escalate). The discipline is the structural mechanism by which the platform's rule engine maintains its safety posture under failure conditions.

---

## 10. Rule Conflict Resolution

### 10.1 Conflict Types

Rule conflicts arise when two or more rules govern the same action and produce conflicting results. Ibn Hayan recognizes three conflict types. First, direct conflict: two rules evaluate the same action and produce opposite results (one permits, one blocks). Second, indirect conflict: two rules evaluate the same action and produce results that are individually valid but mutually inconsistent (for example, one rule applies a discount, another rule prohibits the discount). Third, temporal conflict: two rules evaluate the same action at different times and produce results that are inconsistent across time (for example, a rule that applies during business hours conflicts with a rule that applies after hours).

Conflict detection is performed by the rule engine at evaluation time. Direct conflicts are detected when the engine evaluates multiple rules for the same action and finds opposite results. Indirect conflicts are detected through the engine's consistency checks (where the engine verifies that the rule results are mutually consistent). Temporal conflicts are detected through the engine's temporal logic (where the engine tracks rule applicability across time). The conflict detection discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) — a uniform conflict detection mechanism is simpler than ad hoc conflict detection per rule.

### 10.2 Conflict Resolution Strategies

The rule engine supports four conflict resolution strategies. First, precedence: each rule has a precedence value; the rule with higher precedence prevails. Second, category priority: rules in higher-priority categories (clinical safety > regulatory > financial > administrative) prevail over rules in lower-priority categories. Third, specificity: rules that are more specific (for example, a rule that applies to a specific medication) prevail over rules that are more general (for example, a rule that applies to all medications). Fourth, manual: conflicts that cannot be resolved automatically are surfaced to an administrator for manual resolution, with the action blocked pending resolution.

The strategy is selected per conflict type. Direct conflicts are resolved by precedence, then category priority, then specificity, then manual. Indirect conflicts are resolved by category priority, then specificity, then manual. Temporal conflicts are resolved by the temporal logic's applicability rules, with manual resolution where the rules' applicability overlaps. The strategy selection is documented in the rule's metadata, ensuring that the resolution is predictable.

### 10.3 Conflict Audit

Rule conflicts are recorded in the audit trail, including the conflicting rules, the action that triggered the conflict, the resolution strategy applied, the resolution result, and the actor (where manual resolution was required). The conflict audit is the structural mechanism by which the platform's rule conflict behaviour is monitored and improved. Conflicts that recur are reviewed by the Architecture Council for rule revision; conflicts that require manual resolution are reviewed for automated resolution.

The conflict audit discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the rule domain. A conflict that is not audited would be invisible; the platform would be unable to detect recurring conflicts or to improve the rule catalogue's coherence. The discipline ensures that every conflict is recorded, and every conflict's resolution is recoverable.

### 10.4 Conflict Prevention

Conflict prevention is the practice of designing rules to avoid conflicts. The rule proposal process includes a conflict assessment: the proposer identifies existing rules that may conflict with the proposed rule and documents the resolution strategy. The Architecture Council reviews the conflict assessment during proposal review and may require the proposed rule to be revised to avoid conflict. The conflict prevention discipline is the structural mechanism by which the platform's rule catalogue remains coherent.

Conflict prevention is preferred over conflict resolution. A rule catalogue that relies on conflict resolution at evaluation time is more complex than a rule catalogue that is designed to avoid conflicts. The preference is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the rule domain. Where conflict is unavoidable (for example, where two regulatory frameworks mandate conflicting behaviour), the conflict is documented in the rule's metadata and the resolution strategy is explicit.

---

## 11. Rule Versioning & Lifecycle

### 11.1 Versioning Discipline

Business rule versioning in Ibn Hayan follows the platform's broader versioning discipline. Every rule evaluation is accompanied by the rule's version, recorded at the time of the evaluation. The version is the rule's published version identifier, incremented on each material change (a change to the condition, action, or exception handling). The version is immutable once recorded; an evaluation recorded against a version is interpreted in the context of that version indefinitely, regardless of subsequent rule changes.

The versioning discipline is the structural mechanism by which the platform preserves the interpretability of historical rule evaluations. An audit record that references a rule evaluation must be interpretable as an evaluation against the rule's version at the time of the audit record. The discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) and Principle P5 (Consistency Over Availability for Clinical Data) applied to the rule domain.

### 11.2 Rule Lifecycle Stages

Each business rule has a lifecycle with five stages. First, Proposed: the rule has been proposed but not ratified. Second, Active: the rule has been ratified and is being evaluated. Third, Deprecated: the rule is no longer recommended for new evaluations but remains active for historical record interpretation. Fourth, Retired: the rule is no longer active; the rule is retained in the catalogue for historical record interpretation. Fifth, Removed: the rule has been removed from the catalogue; this stage is rare and is undertaken only when the rule is found to be defective and is replaced by a successor rule.

The lifecycle is recorded in the rule's metadata. Each stage transition is ratified through an ADR. The previous stage is retained for historical record interpretation. The lifecycle discipline is the structural mechanism by which the platform's rule catalogue evolves without disrupting historical records. The discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) applied to the rule domain.

### 11.3 Deprecation Process

A rule deprecation is ratified through an ADR. The ADR records the deprecated rule, the rationale, the successor rule where one exists, the transition window, and the migration plan for existing evaluations where migration is appropriate. The ADR is recorded in the CHANGELOG with the version increment. The deprecation takes effect at the end of the transition window, at which point the rule is moved from Deprecated status to Retired status.

The deprecation process is the structural mechanism by which the platform's rule catalogue evolves without disrupting historical records. A deprecation that bypasses the process is defective; the platform's audit trail cannot demonstrate the deprecation's rationale, and downstream consumers cannot determine why the rule was deprecated. The process is the architectural expression of Principle P13 (Auditability as Primitive) applied to the rule domain.

### 11.4 Rule Migration

Where a rule is deprecated in favour of a successor rule, existing evaluations may need to be migrated. Migration is performed for evaluations that are still active (for example, a workflow that is in progress and depends on the deprecated rule). Migration is not performed for evaluations that have completed (for example, an invoice that has been paid); the historical evaluation is retained against the deprecated rule's version, with the rule's deprecation noted in the audit record.

The migration discipline preserves the platform's commitment to indefinite interpretability of historical records. A migration that overwrites the historical evaluation would compromise the audit trail; the platform's posture is that historical evaluations are retained against the rule's version at the time of the evaluation, with the migration recorded as a separate event. The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the rule domain.

---

## 12. Rule Testing & Validation

### 12.1 Testing Discipline

Business rule testing in Ibn Hayan follows a documented discipline. Each rule is tested before activation, with the test suite covering the rule's condition (positive and negative cases), the rule's action (execution and verification), the rule's exception handling (failure scenarios), and the rule's interaction with other rules (conflict scenarios). The test suite is versioned alongside the rule and is run on each rule version change.

The testing discipline is the structural mechanism by which the platform's rule catalogue maintains its quality. A rule that is activated without testing may produce unintended behaviour; the platform's commitment to clinical safety (Principle P1) requires that rules be tested before activation. The discipline is the architectural expression of Principle P7 (Documented Before Implemented) applied to the rule domain.

### 12.2 Test Case Design

Test cases are designed to cover the rule's full behavioural surface. Each test case specifies the input, the expected result, and the expected audit record. Test cases are derived from the rule's condition (one test case per condition branch), the rule's action (one test case per action variant), the rule's exception handling (one test case per exception scenario), and the rule's interaction with other rules (one test case per conflict scenario). Test cases are reviewed by the rule's owner and by the Architecture Council.

The test case design discipline ensures that the rule's behaviour is fully specified. A rule with an incomplete test suite may produce behaviour that is not specified, which is a defect. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every behaviour is testable, and every test is recoverable. The discipline is also the structural mechanism by which the platform's rule catalogue is maintainable: a rule with a comprehensive test suite can be modified with confidence that the modification does not produce unintended behaviour.

### 12.3 Sandbox Testing

Rule changes are tested in a configuration sandbox before application to production, in keeping with the configuration sandbox discipline documented in SYSTEM_ARCHITECTURE Section 15.7. The sandbox is a non-production tenant that inherits from the production tenant's configuration, ensuring that sandbox testing reflects production reality. The rule change is applied to the sandbox, the test suite is run, and the rule's behaviour is observed in the sandbox before the change is applied to production.

The sandbox testing discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the rule domain. A rule change that is applied to production without sandbox testing may compromise clinical safety; the platform's posture is that rule changes are tested in a sandbox before application to production, except for emergency changes that follow a documented expedited pathway. The discipline is the structural mechanism by which the platform's rule catalogue maintains its safety posture across the platform's deployment spectrum.

### 12.4 Rule Validation Framework

Rule validation is performed by the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. The framework applies five validation rule categories: Structural (the rule conforms to the rule schema), Referential (the rule's references resolve), Semantic (the rule is internally consistent), Contextual (the rule is consistent with its scope), and Regulatory (the rule is consistent with the regulatory framework in force for the tenant's region). A rule that fails validation is not applied.

The validation framework is the structural mechanism by which the platform's rule catalogue maintains its integrity. A rule that bypasses validation may produce behaviour that is not specified, which is a defect. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every rule is validated before application, and every validation result is recoverable. The discipline is also the structural mechanism by which the platform's rule catalogue is compliant: rules that fail regulatory validation are not applied, ensuring that the platform's rule behaviour complies with the regulatory framework in force for the tenant's region.

---

## 13. Rule Documentation Standards

### 13.1 Documentation Requirements

Each business rule is documented to a defined standard. The documentation includes the rule's canonical identifier, display name, description, owning bounded context, category, trigger, condition, action, exception handling, configuration surface, default posture, version, status, ADR reference, test suite reference, and cross-references. The documentation is the rule's authoritative definition; downstream consumers reference the documentation, not ad hoc definitions in module specifications.

The documentation requirements are enforced by the Architecture Council at rule registration. A rule that does not meet the documentation standard is rejected; the rejection is recorded with the rationale. The standard is the structural mechanism by which the platform's rule catalogue remains coherent and navigable across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 13.2 Documentation Location

Rule documentation is maintained in the business rule catalogue, which is part of the platform's documentation framework. The catalogue is the binding reference for module specifications, integration contracts, configuration schemas, and audit records. Module specifications reference the catalogue by rule identifier; they do not duplicate the rule's definition. The catalogue is versioned alongside the platform's release manifest, ensuring that a tenant operating on a specific platform release has a documented rule catalogue version.

The documentation location discipline ensures that the platform's rule documentation is consistent. A rule that is documented in multiple locations may produce inconsistencies; the platform's posture is that the catalogue is the single source of truth, and other documents reference the catalogue. The discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) applied to the rule domain.

### 13.3 Documentation Review

Rule documentation is reviewed at each quarterly Architecture Council review. The review covers the rule's continued relevance, the rule's accuracy (whether the documentation reflects the rule's actual behaviour), the rule's test suite (whether the test suite covers the rule's behavioural surface), and the rule's cross-references (whether the cross-references are current). The review is recorded in the catalogue's curation log.

The documentation review discipline ensures that the platform's rule documentation remains current. A rule whose documentation has drifted from the rule's actual behaviour is defective; the platform's commitment to auditability requires that the documentation accurately reflects the rule's behaviour. The discipline is the architectural expression of Principle P15 (Observability as Primitive) applied to the rule domain.

### 13.4 Documentation Access

Rule documentation is read-accessible to all platform components. Write access is restricted to the Architecture Council through the ADR process. Tenant administrators may read the documentation to understand the rule catalogue; they may not modify the documentation. Integrations may read the documentation through the rule service's read API to validate rules against the catalogue; they may not write to the documentation. The access discipline is enforced by the authorization model documented in SYSTEM_ARCHITECTURE Section 20.

The access discipline is the structural mechanism by which the documentation's integrity is preserved. A documentation that is modified outside the ADR process is defective; the platform's audit trail cannot demonstrate the modification's rationale, and downstream consumers cannot determine why the documentation was modified. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the rule domain.

---

## 14. Related Documents

### 14.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-1 (Healthcare First), D-2 (Configuration Before Customization), D-10 (Accountability) govern rule posture |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Business rules are configuration artefacts governed by the configuration lifecycle |
| PRODUCT_BIBLE.md | Section 28 (Offline Strategy) | Offline rule evaluation and audit |
| PRODUCT_BIBLE.md | Section 31 (Security Philosophy) | Rule authorization and audit |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P2 (Configuration Before Customization), P3 (One Platform), P4 (Loose Coupling), P5 (Consistency), P7 (Documented), P13 (Auditability), P14 (Simplicity), P18 (Decade-Horizon) govern rule posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Bounded contexts to which rules are bound |
| SYSTEM_ARCHITECTURE.md | Section 15 (Configuration Strategy) | Rule configuration surface and validation |
| SYSTEM_ARCHITECTURE.md | Section 16 (Workflow Engine Philosophy) | Rule engine architecture |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Rule evaluation audit records |
| CONFIGURATION_ARCHITECTURE.md | Section 7 (Configuration Validation) | Rule validation framework |
| CONFIGURATION_ARCHITECTURE.md | Section 8 (Configuration Lifecycle) | Rule lifecycle |

### 14.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references rules, the reference is to this document.

| Document | Relationship to Business Rules |
|---|---|
| TERMINOLOGY.md | Rule identifiers are local extensions governed by TERMINOLOGY Section 3 |
| ENUMS.md | Rules reference enum values for trigger conditions |
| STATUS_CODES.md | Rules transition status codes; transition conditions are business rules |
| CALCULATIONS.md | Rules invoke calculations; calculation inputs may be rule outputs |
| CLINICAL_WORKFLOWS.md | Clinical workflows are governed by business rules; rules trigger workflow transitions |
| CONFIGURATION.md | Rule configuration surface is part of the configuration model |
| FEATURE_FLAGS.md | Feature flags control rule activation; flag lifecycle applies |

### 14.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level rule usage and configuration |
| docs/04_INTEGRATIONS/*.md | External system rule exchange and mapping |
| docs/06_DATABASE/*.md | Rule storage and indexing |
| docs/09_DEPLOYMENT/*.md | Rule engine deployment topology |
| docs/03_SECURITY/*.md | Rule authorization and audit |

### 14.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when a rule amendment, a regulatory change, or an ADR requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification. Ibn Hayan's business rule catalogue is a structural element of the platform's contract surface and is treated with the discipline that structural elements warrant.
