# Ibn Hayan Healthcare Operating System — Workflows

| Field | Value |
|---|---|
| Document Title | Workflows |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Product Elaboration — Workflow Engine Reference |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a workflow pattern or component is ratified |
| Audience | Product leadership, engineering leadership, implementation consultants, configuration architects, clinical informatics leads, customers evaluating Ibn Hayan's workflow surface |
| Scope | Workflow philosophy, workflow engine overview, workflow categories, workflow components, state machine, configuration, composition, validation, execution, monitoring, lifecycle, extension points, sample workflows |
| Out of Scope | Implementation details, source code, workflow engine internals, workflow definition API contracts, execution runtime topology |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. Workflow model definitions in this document elaborate Section 22 of PRODUCT_BIBLE (Configuration-Driven Philosophy) and align with Section 16 of SYSTEM_ARCHITECTURE (Workflow Engine Philosophy). |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (stub with section placeholders only) |

---

## Table of Contents

1. Workflow Overview
2. Patient Journey Workflow
3. Appointment Workflow
4. Clinical Encounter Workflow
5. Billing & Payment Workflow
6. Inventory Workflow
7. Laboratory Workflow
8. Pharmacy Workflow
9. Reporting Workflow
10. Notification Workflow
11. Custom Workflow Engine
12. Workflow Configuration
13. Related Documents

---

## 1. Workflow Overview

### 1.1 Purpose of the Workflow Engine

The workflow engine is Ibn Hayan's mechanism for coordinating multi-step processes that span bounded contexts, as stated in `SYSTEM_ARCHITECTURE.md` Section 16.1. The engine is the operational expression of the platform's commitment to configuration-driven behaviour (Principle P-2) and is the mechanism through which the platform's clinical, operational, financial, integration, and notification workflows are defined, executed, and evolved. Workflows are not features; they are first-class architectural concerns with their own contracts, configuration surface, and lifecycle. This document elaborates Section 16 of `SYSTEM_ARCHITECTURE.md` and Section 22 of `PRODUCT_BIBLE.md` and defines the workflow engine's structure, components, configuration, execution, and governance.

### 1.2 Workflow Definition Posture

Workflow definitions are declarative, not procedural, as stated in `SYSTEM_ARCHITECTURE.md` Section 16.2. A workflow definition specifies the steps, the conditions, the actors, the inputs, the outputs, and the exception handling through configuration; it does not specify the implementation. Workflow definitions are not code; a workflow that requires source-level implementation is not a workflow, it is a feature, and is rejected by the workflow engine's posture. This posture is a direct consequence of Principle P-2 (Configuration Before Customization) and is the operational expression of Design Principle D-2. Workflow definitions are versioned, validated, and auditable, in keeping with the configuration-driven architecture stated in `SYSTEM_ARCHITECTURE.md` Section 8.

### 1.3 Workflow Execution Posture

Workflow execution is governed by the Orchestration Layer (Section 6.4 of `SYSTEM_ARCHITECTURE.md`), as stated in Section 16.3 of the same document. The workflow engine coordinates the execution of steps across bounded contexts, handling state management, error handling, compensation, and audit. Execution is stateful (workflow state is durable across execution steps), auditable (every workflow step is recorded in the audit trail), recoverable (workflows recover from failures, with compensation or retry as configured), observable (workflow execution is observable through telemetry), and tenant-scoped (workflows execute within a single tenant). These properties are normative for all workflow executions; deviations are defects and are corrected through the amendment mechanism.

### 1.4 Workflow Reading Order

This document is organized as both a linear read and a reference. Readers new to Ibn Hayan's workflow model should read Sections 1, 11, and 12 to understand the overview, custom engine, and configuration. Readers evaluating Ibn Hayan for a specific workflow should read the relevant workflow section (Sections 2 through 10). Readers planning a custom workflow should read Sections 11 and 12. Section 13 lists the upstream and downstream documents that this model references and that elaborate workflow-specific concerns.

---

## 2. Patient Journey Workflow

### 2.1 Workflow Purpose

The patient journey workflow is the longitudinal workflow that tracks a patient's relationship with a healthcare organization over time, from initial registration through ongoing care. The workflow is not a single linear process; it is a coordination framework that ensures the patient's care history, care plan, and care team are maintained coherently across encounters. The patient journey workflow is the operational expression of Ibn Hayan's commitment to longitudinal patient care (Principle P-1, Healthcare First) and is the framework within which clinic-specific encounter workflows operate.

### 2.2 Workflow Stages

The patient journey workflow comprises the stages stated in the table below. The stages are not strictly sequential; a patient may be in multiple stages simultaneously (e.g., a patient with an active chronic disease management plan who presents for an acute visit). The stages are coordination points, not state machine states; the workflow engine tracks each stage independently.

| Stage | Code | Description | Triggering Workflow |
|---|---|---|---|
| Patient registration | PJ1 | Patient registered in the platform | Registration workflow |
| Initial assessment | PJ2 | Patient's initial clinical assessment completed | Encounter workflow |
| Care plan establishment | PJ3 | Patient's longitudinal care plan established | Care plan workflow |
| Ongoing care | PJ4 | Patient receiving ongoing care per care plan | Encounter workflow (recurring) |
| Care plan revision | PJ5 | Patient's care plan revised based on clinical change | Care plan revision workflow |
| Acute episode | PJ6 | Patient experiences an acute episode | Acute encounter workflow |
| Referral coordination | PJ7 | Patient referred to another clinic type or specialty | Referral workflow |
| Care transition | PJ8 | Patient transitions between care settings | Transition workflow |
| Discharge or closure | PJ9 | Patient discharged from active care | Discharge workflow |

### 2.3 Workflow Components

The patient journey workflow's components include triggers (events that initiate a stage), conditions (rules that govern stage progression), actions (operations performed during a stage), transitions (rules that govern movement between stages), and exception handling (rules for handling deviations from the expected journey). Each component is defined declaratively through configuration, per the workflow definition posture stated in Section 1.2. The components are documented per stage in the patient journey workflow definition; the full definition is documented in the per-module documentation under `docs/11_MODULES/M01_Patient/`.

### 2.4 Workflow and Clinic Type Interaction

The patient journey workflow interacts with clinic type overlays (per `CLINIC_TYPES.md` Section 5) to produce clinic-type-specific journey patterns. A primary care patient journey differs from an oncology patient journey; the differences are expressed through clinic-type-specific stage definitions, conditions, and actions composed on top of the platform-default patient journey workflow. The composition is governed by the configuration layer model stated in `SYSTEM_ARCHITECTURE.md` Section 15.2; clinic-type-specific workflow definitions override platform-default definitions where the clinic type's operational reality requires.

### 2.5 Workflow Audit and Monitoring

The patient journey workflow is auditable end-to-end. Every stage transition is recorded in the audit trail, capturing the patient, the stage, the trigger, the configurator (where the transition was configuration-initiated), the actor (where the transition was user-initiated), and the time. Workflow monitoring tracks stage duration, stage transition frequency, and exception frequency; deviations from expected patterns are flagged for review by the customer's clinical leadership. Audit and monitoring are critical for healthcare quality assurance and are non-negotiable elements of the patient journey workflow.

---

## 3. Appointment Workflow

### 3.1 Workflow Purpose

The appointment workflow is the operational workflow that manages appointment scheduling, confirmation, reminder, check-in, encounter handoff, and check-out. The workflow is the front door to clinical care; its efficiency directly affects patient experience, practitioner productivity, and facility throughput. The appointment workflow is implemented by the Scheduling module (M06) and coordinates with the Patient module (M01), Encounter module (M02), Notifications module (M08), and Billing module (M09) for handoffs.

### 3.2 Workflow Stages

The appointment workflow comprises the stages stated in the table below. The stages are largely sequential but may include parallel branches (e.g., appointment confirmation and appointment reminder may run in parallel during the pre-appointment window).

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Appointment request | AW1 | Patient or staff requests an appointment | Patient self-schedule or staff-initiated |
| Slot availability check | AW2 | System verifies slot availability with scheduling rules | Appointment request received |
| Appointment confirmation | AW3 | Appointment confirmed with patient | Slot available |
| Pre-appointment preparation | AW4 | Pre-appointment tasks (e.g., insurance verification, pre-visit forms) | Confirmation completed |
| Appointment reminder | AW5 | Patient reminded of upcoming appointment | Defined time before appointment |
| Patient check-in | AW6 | Patient arrives and checks in | Patient arrival |
| Encounter handoff | AW7 | Patient handed off to clinical encounter | Check-in completed |
| Encounter completion | AW8 | Clinical encounter completed | Encounter workflow completion |
| Check-out and billing handoff | AW9 | Patient checks out; billing handoff initiated | Encounter completion |
| Post-appointment follow-up | AW10 | Post-appointment follow-up (e.g., results, next appointment) | Defined time after appointment |

### 3.3 Workflow Patterns

The appointment workflow uses several workflow patterns defined in `SYSTEM_ARCHITECTURE.md` Section 16.4. The patterns and their use in the appointment workflow are stated in the table below.

| Pattern | Use in Appointment Workflow |
|---|---|
| Sequential | Stages AW1 → AW2 → AW3 → AW4 (sequential preparation) |
| Parallel | Stages AW4 and AW5 (parallel preparation and reminder) |
| Conditional | Stage AW6 (conditional on patient arrival; if patient does not arrive, stage AW7 does not execute) |
| Looping | Stage AW5 (looping reminder if patient does not confirm) |
| Saga | Stages AW7 → AW8 → AW9 (saga with compensation: if encounter cannot be completed, billing handoff is rolled back) |

### 3.4 Workflow and Notifications Integration

The appointment workflow integrates with the Notifications module (M08) for patient communications. Notifications are sent at defined points in the workflow: appointment confirmation (AW3), appointment reminder (AW5), check-in ready (AW6), and post-appointment follow-up (AW10). The integration is governed by the patient's notification preferences (per `USER_ROLES.md` Section 7.5) and by regional regulatory frameworks governing patient communications. The integration is defined declaratively through configuration; the appointment workflow definition specifies which notifications are sent at which stages, with the notification content defined separately in the Notifications module.

### 3.5 Workflow Exceptions and Compensation

The appointment workflow includes defined exception handling for common deviations: patient no-show, late arrival, cancellation, rescheduling, and walk-in patients. Each exception is handled by a defined compensation pathway: no-show triggers a no-show billing workflow and a follow-up reminder workflow; late arrival triggers a slot adjustment workflow; cancellation triggers a slot release workflow; rescheduling triggers a re-execution of the appointment workflow from stage AW1; walk-in triggers a parallel appointment workflow with the slot availability check skipped. Exception handling is defined declaratively through configuration and is auditable end-to-end.

---

## 4. Clinical Encounter Workflow

### 4.1 Workflow Purpose

The clinical encounter workflow is the core clinical workflow that manages the documentation, ordering, treatment, and disposition of a patient encounter. The workflow is the operational expression of clinical care delivery and is the most complex workflow Ibn Hayan supports. The clinical encounter workflow is implemented by the Encounter module (M02) and coordinates with the Clinical Documentation module (M03), Orders & Results module (M04), Pharmacy module (M05), Documents module (M07), and Billing module (M09) for handoffs.

### 4.2 Workflow Stages

The clinical encounter workflow comprises the stages stated in the table below. The stages are largely sequential but include conditional branches based on the encounter's clinical course.

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Encounter initiation | CE1 | Encounter created and assigned to clinician | Appointment handoff or walk-in |
| Clinical assessment | CE2 | Clinician performs clinical assessment | Encounter initiation |
| Order entry | CE3 | Clinician enters orders (lab, imaging, medication, referral) | Clinical assessment |
| Result review | CE4 | Clinician reviews results and incorporates into assessment | Result availability |
| Treatment administration | CE5 | Treatment administered per orders | Order execution |
| Clinical documentation | CE6 | Encounter documented in clinical record | Continuous through encounter |
| Encounter disposition | CE7 | Patient dispositioned (discharge, admit, transfer) | Clinical decision |
| Encounter closure | CE8 | Encounter closed; record finalized | Disposition completion |
| Billing handoff | CE9 | Encounter handed off to billing | Closure completion |

### 4.3 Workflow and Clinical Decision Support

The clinical encounter workflow integrates with clinical decision support at multiple stages. Order entry (CE3) triggers decision support review for high-risk orders (e.g., drug-drug interaction checks, allergy checks, dose range checks). Result review (CE4) triggers decision support review for abnormal results (e.g., critical value alerts, trend analysis). Treatment administration (CE5) triggers decision support review for administration safety (e.g., correct patient, correct medication, correct dose, correct route, correct time). The integration is defined declaratively through configuration; the encounter workflow definition specifies which decision support reviews are triggered at which stages.

### 4.4 Workflow and Documentation Templates

The clinical encounter workflow uses documentation templates defined by the Clinical Documentation module (M03) and refined by clinic type overlays (per `CLINIC_TYPES.md` Section 5). The templates structure the encounter documentation to ensure that all required elements are captured and that documentation is consistent across encounters. The template selection is governed by the active clinic type, the encounter type (outpatient, inpatient, emergency, telehealth), and the patient's clinical context. Template selection is defined declaratively through configuration and is auditable end-to-end.

### 4.5 Workflow and Encounter Types

The clinical encounter workflow supports multiple encounter types: outpatient, inpatient, emergency, and telehealth. Each encounter type has a variation of the workflow with type-specific stages and conditions. Outpatient encounters follow the standard workflow; inpatient encounters add admission, daily care, and discharge stages; emergency encounters add triage and rapid disposition stages; telehealth encounters add virtual visit coordination stages. The variations are defined declaratively through configuration, with the variation selected based on the encounter type at initiation.

### 4.6 Workflow Exceptions and Compensation

The clinical encounter workflow includes defined exception handling for clinical deviations: order cancellation, result discrepancy, treatment contraindication, encounter re-opening, and clinical incident. Each exception is handled by a defined compensation pathway: order cancellation triggers a notification to the ordering clinician and a refund workflow if billing has occurred; result discrepancy triggers a result correction workflow and a notification to the treating clinician; treatment contraindication triggers a treatment hold workflow and a notification to the prescribing clinician; encounter re-opening triggers a re-execution of the workflow from the relevant stage; clinical incident triggers an incident reporting workflow and a notification to the clinical lead.

---

## 5. Billing & Payment Workflow

### 5.1 Workflow Purpose

The billing and payment workflow is the financial workflow that manages claim generation, claim submission, payment posting, denial management, and patient billing. The workflow is the operational expression of Ibn Hayan's commitment to financial accuracy and is implemented by the Billing module (M09) with coordination from the Patient module (M01), Encounter module (M02), Accounting module (M10), and Integration module (M17) for external payer interfaces.

### 5.2 Workflow Stages

The billing and payment workflow comprises the stages stated in the table below. The stages are largely sequential but include parallel branches for insurance claim and patient billing.

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Charge capture | BW1 | Charges captured from encounter documentation | Encounter closure |
| Claim generation | BW2 | Claim generated from captured charges | Charge capture completion |
| Claim validation | BW3 | Claim validated for completeness and accuracy | Claim generation |
| Claim submission | BW4 | Claim submitted to payer (insurance or patient) | Validation completion |
| Payment posting | BW5 | Payment received and posted to claim | Payment receipt |
| Denial management | BW6 | Denied claims reviewed and reworked or appealed | Denial receipt |
| Patient billing | BW7 | Patient responsibility portion billed to patient | Insurance adjudication completion |
| Payment reconciliation | BW8 | Payments reconciled with accounting | Payment posting |
| Account closure | BW9 | Encounter account closed | Reconciliation completion |

### 5.3 Workflow and Integration

The billing and payment workflow integrates with external payer systems through the Integration module (M17). Integration accounts (per `USER_ROLES.md` Section 8.1) are used for system-to-system communication, with credentials scoped to the specific payer integration. The integration is defined declaratively through configuration; the workflow definition specifies which integration to use for which payer, with the integration's contract defining the data exchanged. Integration failures trigger defined exception handling (Section 5.5).

### 5.4 Workflow and Regional Payment Models

The billing and payment workflow is adapted to regional payment models through the Localization module (M19). Regional adaptations include the payer model (single-payer, multi-payer, out-of-pocket, hybrid), the claim format, the coding system, and the regulatory requirements. The adaptations are expressed through configuration overlays rather than through separate workflow definitions; the workflow definition is stable, the configuration is regional. This posture allows Ibn Hayan to support multiple regional payment models without forking the workflow, in keeping with Principle P-17 (Regional Adaptation Without Forking).

### 5.5 Workflow Exceptions and Compensation

The billing and payment workflow includes defined exception handling for financial deviations: claim rejection, payment discrepancy, denial appeal, refund processing, and write-off. Each exception is handled by a defined compensation pathway: claim rejection triggers a claim correction workflow and re-submission; payment discrepancy triggers a payment investigation workflow; denial appeal triggers an appeal workflow with documented appeal rationale; refund processing triggers a refund workflow with accounting handoff; write-off triggers a write-off workflow with compliance review. Exception handling is defined declaratively through configuration and is auditable end-to-end.

### 5.6 Workflow and Financial Audit

The billing and payment workflow is subject to enhanced financial audit. Every stage transition is recorded in the audit trail, capturing the claim, the stage, the actor, the financial amount, and the time. Financial audit records are immutable and are subject to extended retention periods as required by regional regulatory frameworks. The audit trail is the basis for financial compliance reporting, for financial incident investigation, and for financial trend analysis. Financial audit is a primitive of the billing and payment workflow and is non-negotiable.

---

## 6. Inventory Workflow

### 6.1 Workflow Purpose

The inventory workflow manages the lifecycle of inventory items in Ibn Hayan, including stock receipt, storage, dispensing, depletion, replenishment, and reconciliation. The workflow is the operational expression of Ibn Hayan's commitment to inventory accuracy and is implemented by the Pharmacy module (M05) for medication inventory and by a future Inventory module for general inventory. The workflow coordinates with the Orders & Results module (M04), the Billing module (M09), and the Integration module (M17) for supplier interfaces.

### 6.2 Workflow Stages

The inventory workflow comprises the stages stated in the table below. The stages include both operational stages (receipt, storage, dispensing) and management stages (replenishment, reconciliation).

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Stock receipt | IW1 | Stock received from supplier | Supplier delivery |
| Stock verification | IW2 | Stock verified against purchase order | Receipt completion |
| Stock storage | IW3 | Stock stored in appropriate location | Verification completion |
| Stock dispensing | IW4 | Stock dispensed per order | Dispensing order |
| Stock depletion tracking | IW5 | Stock depletion tracked as items are dispensed | Dispensing events |
| Replenishment trigger | IW6 | Replenishment triggered when stock falls below threshold | Threshold breach |
| Purchase order generation | IW7 | Purchase order generated and sent to supplier | Replenishment trigger |
| Stock reconciliation | IW8 | Stock reconciled with physical count | Scheduled reconciliation |
| Discrepancy resolution | IW9 | Discrepancies investigated and resolved | Reconciliation discrepancy |

### 6.3 Workflow and Controlled Substances

The inventory workflow includes specialized handling for controlled substances, per `PRODUCT_BIBLE.md` Section 21. Controlled substance inventory is subject to enhanced tracking, with every receipt, storage, dispensing, and disposal event recorded with the regulatory-required fields. Controlled substance discrepancies trigger an immediate investigation workflow with compliance notification. The enhanced handling is defined declaratively through configuration and is enforced at the platform layer; it cannot be overridden through configuration.

### 6.4 Workflow and Expiration Management

The inventory workflow includes expiration management for items with expiration dates (e.g., medications, reagents). Expiration tracking is automated; items approaching expiration trigger a notification workflow to the inventory manager. Expired items trigger a disposal workflow with documented disposal recording. Expiration management is critical for patient safety (expired medications must not be dispensed) and for regulatory compliance (expired item disposal must be documented).

### 6.5 Workflow and Supplier Integration

The inventory workflow integrates with supplier systems through the Integration module (M17). Integration accounts are used for purchase order submission and shipment notification. The integration is defined declaratively through configuration; the workflow definition specifies which integration to use for which supplier. Integration failures trigger defined exception handling (manual order placement, supplier notification).

---

## 7. Laboratory Workflow

### 7.1 Workflow Purpose

The laboratory workflow manages the lifecycle of laboratory tests in Ibn Hayan, including order receipt, sample collection, sample processing, result production, result certification, and result reporting. The workflow is the operational expression of Ibn Hayan's commitment to laboratory accuracy and is implemented by the Orders & Results module (M04) and the laboratory-specific extensions of the Clinical Documentation module (M03). The workflow coordinates with the Patient module (M01), Encounter module (M02), Notifications module (M08), and Integration module (M17) for instrument interfaces.

### 7.2 Workflow Stages

The laboratory workflow comprises the stages stated in the table below. The stages are largely sequential but include parallel branches for sample processing and result production.

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Order receipt | LW1 | Laboratory order received from ordering clinician | Order entry |
| Sample collection | LW2 | Sample collected from patient | Order receipt |
| Sample labeling | LW3 | Sample labeled with tracking identifier | Collection completion |
| Sample transport | LW4 | Sample transported to laboratory | Labeling completion |
| Sample accessioning | LW5 | Sample accessioned in laboratory information system | Sample arrival |
| Sample processing | LW6 | Sample processed per test requirements | Accessioning completion |
| Result production | LW7 | Result produced by instrument or technician | Processing completion |
| Result certification | LW8 | Result certified by supervising clinician | Result production |
| Result reporting | LW9 | Result reported to ordering clinician | Certification completion |
| Result archiving | LW10 | Result archived in patient record | Reporting completion |

### 7.3 Workflow and Critical Results

The laboratory workflow includes specialized handling for critical results. Critical results (e.g., critically abnormal lab values) trigger an immediate notification workflow to the ordering clinician, with documented acknowledgement required. The notification is escalated if acknowledgement is not received within a defined timeframe. Critical result handling is a patient safety control and is non-negotiable; the handling is defined declaratively through configuration and is enforced at the platform layer.

### 7.4 Workflow and Quality Control

The laboratory workflow includes quality control workflows for instrument calibration, reagent verification, and proficiency testing. Quality control workflows run on defined schedules and produce quality control records that are subject to regulatory review. Quality control failures trigger an instrument hold workflow that prevents result production until the failure is resolved. Quality control is critical for laboratory accuracy and is non-negotiable.

### 7.5 Workflow and Instrument Integration

The laboratory workflow integrates with laboratory instruments through the Integration module (M17). Integration accounts are used for instrument communication, with the integration's contract defining the data exchanged (orders, results, quality control data). The integration is defined declaratively through configuration; the workflow definition specifies which integration to use for which instrument. Integration failures trigger defined exception handling (manual result entry, instrument hold).

---

## 8. Pharmacy Workflow

### 8.1 Workflow Purpose

The pharmacy workflow manages the lifecycle of medication dispensing in Ibn Hayan, including prescription receipt, verification, dispensing, counselling, and recording. The workflow is the operational expression of Ibn Hayan's commitment to medication safety and is implemented by the Pharmacy module (M05). The workflow coordinates with the Patient module (M01), Orders & Results module (M04), Inventory workflow (Section 6), Notifications module (M08), and Billing module (M09).

### 8.2 Workflow Stages

The pharmacy workflow comprises the stages stated in the table below. The stages include both clinical stages (verification, counselling) and operational stages (dispensing, recording).

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Prescription receipt | PW1 | Prescription received from prescribing clinician | Prescription order |
| Prescription verification | PW2 | Pharmacist verifies prescription (clinical, legal, insurance) | Receipt completion |
| Insurance adjudication | PW3 | Insurance adjudication for prescription coverage | Verification completion |
| Medication selection | PW4 | Medication selected from inventory | Adjudication completion |
| Medication dispensing | PW5 | Medication dispensed per prescription | Selection completion |
| Patient counselling | PW6 | Pharmacist provides patient counselling | Dispensing completion |
| Dispensing recording | PW7 | Dispensing event recorded in patient record | Counselling completion |
| Billing handoff | PW8 | Dispensing handed off to billing | Recording completion |

### 8.3 Workflow and Controlled Substances

The pharmacy workflow includes specialized handling for controlled substance prescriptions, per `PRODUCT_BIBLE.md` Section 21. Controlled substance dispensing is subject to enhanced tracking, with every dispensing event recorded with the regulatory-required fields. Controlled substance dispensing may require additional verification (e.g., prescription monitoring programme check) before dispensing is permitted. The enhanced handling is defined declaratively through configuration and is enforced at the platform layer; it cannot be overridden through configuration.

### 8.4 Workflow and Medication Safety

The pharmacy workflow integrates with clinical decision support for medication safety checks. Prescription verification (PW2) triggers decision support review for drug-drug interactions, drug-allergy interactions, dose range checks, and duplicate therapy checks. The integration is defined declaratively through configuration; the workflow definition specifies which decision support reviews are triggered at which stages. Medication safety is a patient safety control and is non-negotiable.

### 8.5 Workflow and Patient Counselling

The pharmacy workflow includes patient counselling as a defined stage (PW6). Counselling content is defined per medication category and per patient context (e.g., first-time prescription versus refill). Counselling is documented in the patient record with the counselling content, the patient's understanding acknowledgement, and the pharmacist's signature. Counselling documentation is subject to regulatory requirements and is non-negotiable.

### 8.6 Workflow Exceptions and Compensation

The pharmacy workflow includes defined exception handling for dispensing deviations: prescription clarification, insurance rejection, out-of-stock, dispensing error, and return to stock. Each exception is handled by a defined compensation pathway: prescription clarification triggers a clinician contact workflow; insurance rejection triggers a patient notification workflow and a re-adjudication workflow; out-of-stock triggers a substitution workflow or a backorder workflow; dispensing error triggers an error correction workflow with compliance notification; return to stock triggers a return workflow with inventory adjustment.

---

## 9. Reporting Workflow

### 9.1 Workflow Purpose

The reporting workflow manages the lifecycle of report generation in Ibn Hayan, including report request, data aggregation, report generation, report distribution, and report archival. The workflow is the operational expression of Ibn Hayan's reporting architecture, defined in `SYSTEM_ARCHITECTURE.md` Section 28, and is implemented by the Reporting module (M18). The workflow coordinates with all clinical, operational, financial, and administrative modules for data aggregation.

### 9.2 Workflow Categories

The reporting workflow supports three report categories, as defined in `SYSTEM_ARCHITECTURE.md` Section 28: operational, analytical, and regulatory. Each category has distinct latency requirements, data sources, and distribution patterns. The categories are stated in the table below.

| Category | Latency | Data Source | Distribution |
|---|---|---|---|
| Operational | Real-time or near-real-time | Transactional store | On-demand or scheduled |
| Analytical | Delayed (typically overnight) | Analytical store | Scheduled |
| Regulatory | Defined by regulatory framework | Multiple sources, validated | Scheduled with documented delivery |

### 9.3 Workflow Stages

The reporting workflow comprises the stages stated in the table below. The stages are largely sequential but include conditional branches based on the report category.

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Report request | RW1 | Report requested by user or schedule | User request or schedule trigger |
| Data aggregation | RW2 | Data aggregated from sources | Request received |
| Report generation | RW3 | Report generated from aggregated data | Aggregation completion |
| Report validation | RW4 | Report validated for completeness and accuracy | Generation completion |
| Report distribution | RW5 | Report distributed to requestor or audience | Validation completion |
| Report archival | RW6 | Report archived for future reference | Distribution completion |

### 9.4 Workflow and Data Residency

The reporting workflow respects data residency per `SYSTEM_ARCHITECTURE.md` Section 10.6. Reports that aggregate data across regions are subject to regional data residency rules; cross-region data aggregation is permitted only for documented operational reasons and is auditable. The workflow definition specifies the data residency constraints for each report; reports that would violate data residency constraints are rejected at the validation stage (RW4).

### 9.5 Workflow and Audit

The reporting workflow is auditable end-to-end. Every report generation is recorded in the audit trail, capturing the report, the requestor, the data sources, the generation time, and the distribution. Reporting audit records are the basis for compliance reporting (particularly for regulatory reports) and for incident investigation. Reporting audit records are immutable and are subject to extended retention periods as required by regional regulatory frameworks.

---

## 10. Notification Workflow

### 10.1 Workflow Purpose

The notification workflow manages the lifecycle of notifications in Ibn Hayan, including notification generation, channel selection, delivery, acknowledgement, and archival. The workflow is the operational expression of Ibn Hayan's commitment to patient and practitioner communication and is implemented by the Notifications module (M08). The workflow coordinates with all modules that produce notification-triggering events.

### 10.2 Workflow Channels

The notification workflow supports multiple channels, stated in the table below. Channel selection is governed by the notification type, the recipient's preferences, and the regional regulatory framework.

| Channel | Code | Description | Typical Use |
|---|---|---|---|
| In-app | NC1 | Notification within the Ibn Hayan application | Practitioner notifications |
| Email | NC2 | Notification via email | Patient and practitioner notifications |
| SMS | NC3 | Notification via SMS | Patient notifications (appointment reminders, critical results) |
| Push | NC4 | Notification via mobile application push | Patient notifications (mobile app users) |
| Postal | NC5 | Notification via postal mail | Patient notifications (formal communications) |
| Phone | NC6 | Notification via automated or manual phone call | Critical result notifications to practitioners |

### 10.3 Workflow Stages

The notification workflow comprises the stages stated in the table below. The stages are largely sequential but include parallel branches for multi-channel delivery.

| Stage | Code | Description | Triggering Event |
|---|---|---|---|
| Notification trigger | NW1 | Notification triggered by event | Triggering event |
| Notification generation | NW2 | Notification content generated from template | Trigger received |
| Channel selection | NW3 | Channel(s) selected based on preferences and rules | Generation completion |
| Notification delivery | NW4 | Notification delivered via selected channel(s) | Selection completion |
| Delivery confirmation | NW5 | Delivery confirmed (where channel supports) | Delivery attempt |
| Notification acknowledgement | NW6 | Notification acknowledged by recipient (where required) | Recipient action |
| Notification archival | NW7 | Notification archived for audit | Acknowledgement or timeout |

### 10.4 Workflow and Patient Preferences

The notification workflow respects patient notification preferences (per `USER_ROLES.md` Section 7.5). Patients can configure their preferred channels, opt out of non-essential notifications, and specify quiet hours. The preferences are enforced at the channel selection stage (NW3); notifications that would violate preferences are rerouted to alternative channels or held until the quiet hours expire. Exceptions exist for critical notifications (e.g., critical result notifications) that override patient preferences; the exceptions are defined by regulatory frameworks and are non-negotiable.

### 10.5 Workflow and Regulatory Compliance

The notification workflow is subject to regulatory compliance for patient communications. Certain notification types (e.g., appointment reminders, marketing communications) are subject to regional consent requirements; the workflow definition specifies the consent requirements for each notification type, and notifications are not sent if consent is not documented. Other notification types (e.g., critical result notifications) are subject to regional documentation requirements; the workflow records the notification, the channel, the delivery confirmation, and the acknowledgement for regulatory review.

---

## 11. Custom Workflow Engine

### 11.1 Custom Workflow Definition

Custom workflows are customer-defined workflows that compose platform-provided workflow components, per the workflow engine philosophy stated in `SYSTEM_ARCHITECTURE.md` Section 16. Custom workflows are tenant-scoped; a custom workflow defined by one customer is not available to other customers. Custom workflows are subject to the same lifecycle governance as platform-provided workflows, with the customer's system administrator responsible for workflow lifecycle within the tenant. Custom workflows do not bypass the platform's bounded context contracts; they orchestrate contract invocation, per Section 16.5 of `SYSTEM_ARCHITECTURE.md`.

### 11.2 Custom Workflow Components

Custom workflows compose the platform-provided workflow components: triggers, conditions, actions, transitions, and exception handlers. The components are documented in Section 12 and are exposed through the workflow engine's configuration surface. Custom workflows may also define custom components (e.g., a custom condition that evaluates a tenant-specific rule), subject to the configuration validation rules stated in `SYSTEM_ARCHITECTURE.md` Section 15.4. Custom components are defined declaratively through configuration; they do not require source-level implementation.

### 11.3 Custom Workflow Patterns

Custom workflows may use any of the workflow patterns defined in `SYSTEM_ARCHITECTURE.md` Section 16.4: sequential, parallel, conditional, looping, and saga. The pattern is selected per workflow through configuration; a custom workflow may use multiple patterns within its definition (e.g., a sequential workflow with a conditional branch that contains a parallel sub-workflow). The pattern selection is documented per workflow and is validated through the configuration validation framework.

### 11.4 Custom Workflow and Bounded Contexts

Custom workflows coordinate activity across bounded contexts, per `SYSTEM_ARCHITECTURE.md` Section 16.5. A custom workflow step typically invokes a command on a bounded context, waits for the result, and proceeds based on the result. Custom workflows do not bypass bounded context contracts; they orchestrate contract invocation. A bounded context's contract evolution may affect custom workflows that depend on it, with the effect managed through the platform's deprecation policy.

### 11.5 Custom Workflow and State Management

Custom workflow state is managed by the workflow engine, not by the bounded contexts that the workflow coordinates, per `SYSTEM_ARCHITECTURE.md` Section 16.6. This separation is critical: bounded contexts do not hold workflow state, and workflows do not hold domain state. Custom workflow state is durable; a custom workflow that is interrupted (e.g., by a system failure) can resume from its last durable state. The durability is governed by Principle P5 (Consistency Over Availability for Clinical Data) — workflow state is treated as clinical data when the workflow affects clinical outcomes.

### 11.6 Custom Workflow Examples

The table below provides illustrative examples of custom workflows. The examples are representative; the full custom workflow surface is documented in the per-tenant documentation.

| Custom Workflow | Purpose | Composed From |
|---|---|---|
| Quality measure reporting | Generate quality measure report on quarterly schedule | Reporting workflow + custom scheduling trigger |
| Care gap outreach | Identify patients with care gaps and trigger outreach | Patient journey workflow + notification workflow + CRM module |
| Medication reconciliation | Reconcile medications at care transition | Encounter workflow + pharmacy workflow + custom reconciliation logic |
| Population health intervention | Identify population cohort and trigger intervention | Patient journey workflow + reporting workflow + notification workflow |
| Specialty referral tracking | Track referrals across clinic types | Patient journey workflow + encounter workflow + custom referral logic |

---

## 12. Workflow Configuration

### 12.1 Configuration Surface

The workflow configuration surface is the complete set of configurable behaviours exposed by the workflow engine. The surface is large — every workflow behaviour of consequence is, in principle, configurable — and is organized by workflow, by component, and by scope. The surface is documented as a contract, not as an internal artefact; customers and integrators can rely on the documented surface. The surface is governed by the configuration-driven architecture stated in `SYSTEM_ARCHITECTURE.md` Section 8 and is subject to the configuration layer model stated in Section 15.2 of the same document.

### 12.2 Configuration Layers

Workflow configuration inherits through the configuration layers, with the layer model stated in `SYSTEM_ARCHITECTURE.md` Section 15.2 governing precedence. The platform default layer (L1) provides the platform-default workflow definitions; the edition layer (L2) adjusts defaults per edition; the tenant layer (L3) and below allow customer refinement. The clinic type overlay (positioned between L7 and L8 in the standard layer model, per `SYSTEM_ARCHITECTURE.md` Section 12.3) provides clinic-type-specific workflow defaults. The full precedence order is documented in Section 12.3 of `CLINIC_TYPES.md`.

### 12.3 Configuration Validation

Workflow configuration is validated through the five validation rule categories stated in `SYSTEM_ARCHITECTURE.md` Section 15.4: structural, referential, semantic, contextual, and regulatory. Semantic validation is particularly important for workflows: a workflow's steps must form a valid graph (no orphan steps, no unreachable steps, no infinite loops without exit conditions). A workflow configuration that fails validation is not applied; the failure is reported to the configurator with diagnostic information. Validation failures are auditable.

### 12.4 Configuration Versioning

Workflow configuration is versioned, per `SYSTEM_ARCHITECTURE.md` Section 15.5. Every workflow change is versioned; the version history is immutable and is the basis for workflow audit, rollback, and change review. Workflow changes can be rolled back to any prior version, with the rollback itself versioned and auditable. Workflow versioning enables controlled evolution, controlled experimentation, and controlled recovery. A customer that applies a workflow change that produces undesired behaviour can roll back without engineering intervention, in keeping with Principle P-2 (Configuration Before Customization).

### 12.5 Configuration Audit

Workflow configuration is auditable, per `SYSTEM_ARCHITECTURE.md` Section 15.6. Every workflow change is recorded in the audit trail, including the configurator, the time, the scope, the previous version, the new version, and the validation result. Workflow audit records are immutable and are the basis for compliance reporting and for incident investigation. Workflow audit is distinct from workflow execution audit; workflow audit records how the platform was configured to execute workflows, while workflow execution audit records what the workflows did.

### 12.6 Configuration Governance

Workflow configuration is governed by the customer's own configuration governance process, supported by the platform's tooling. The platform provides configuration sandboxes for testing workflow changes before production application, configuration validation for verifying workflow consistency, configuration versioning for tracking workflow changes, and configuration audit for accountability. The customer's system administrator is responsible for using these tools to govern workflow configuration within the tenant. The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised, in keeping with the configuration governance posture stated in `PRODUCT_BIBLE.md` Section 22.7.

### 12.7 Configuration Examples

The table below provides illustrative examples of workflow configuration. The examples are representative; the full configuration surface is documented in the per-module documentation.

| Configuration Example | Layer | Effect |
|---|---|---|
| Adjust appointment reminder timing | Tenant | Reminder sent 48 hours before appointment instead of 24 hours |
| Add clinic-type-specific encounter template | Clinic type overlay | Encounter documentation uses cardiology-specific template |
| Define custom workflow for quality reporting | Tenant | Custom workflow generates quality measure report on schedule |
| Adjust critical result notification escalation | Department | Escalation timeframe reduced to 15 minutes from 30 minutes |
| Define custom exception handler for no-show | Care team | No-show triggers text message follow-up instead of phone call |
| Adjust pharmacy counselling documentation | Facility | Counselling documentation includes additional consent field |

---

## 13. Related Documents

### 13.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 22 (Configuration-Driven Philosophy) defines the configuration framework that workflows operate within; Section 21 (Permission Philosophy) defines the permission framework that governs workflow step execution; Section 19 (Product Modules Overview) defines the modules whose contracts workflows orchestrate |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 16 (Workflow Engine Philosophy) is the canonical workflow engine definition; Section 17 (State Management Philosophy) defines how workflow state is managed; Section 15 (Configuration Strategy) defines the configuration layer model that workflows inherit through |

### 13.2 Downstream Documents

The following downstream documents elaborate aspects of workflows referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue whose contracts workflows orchestrate |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Roles that participate in workflow steps |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework that governs workflow step execution |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability by workflow |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition-specific workflow depth |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Per-clinic-type workflow defaults and customization |
| Module Architecture | `docs/01_ARCHITECTURE/MODULE_ARCHITECTURE.md` | Module contracts that workflows orchestrate |
| Configuration Architecture | `docs/01_ARCHITECTURE/CONFIGURATION_ARCHITECTURE.md` | Configuration surface that workflows are defined through |

### 13.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Workflow model changes — pattern additions, component additions, category additions — are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
