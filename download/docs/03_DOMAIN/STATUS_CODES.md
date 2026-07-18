# Ibn Hayan Healthcare Operating System — Status Codes

| Field | Value |
|---|---|
| Document Title | Status Codes |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a status code amendment or ADR is ratified |
| Audience | Software architects, module owners, integration architects, workflow service team, compliance officers, clinical informatics officers |
| Scope | Status code catalogue across entities, workflows, transactions, and integrations of Ibn Hayan; transition maps, localization, audit semantics |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-state persistence syntax, vendor-specific state machines |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Status code definitions in this document elaborate the workflow engine philosophy of SYSTEM_ARCHITECTURE Section 16 and the state management philosophy of SYSTEM_ARCHITECTURE Section 17. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Status Codes Overview
2. Status Code Standard
3. Patient Status Codes
4. Appointment Status Codes
5. Encounter & Visit Status Codes
6. Order & Result Status Codes
7. Billing & Payment Status Codes
8. Inventory Status Codes
9. Subscription Status Codes
10. Status Transition Maps
11. Status Code Localization
12. Status Code Audit
13. Related Documents

---

## 1. Status Codes Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for status codes used across the Ibn Hayan Healthcare Operating System. A status code is a coded representation of an entity's lifecycle stage, a workflow's execution state, a transaction's processing stage, or an integration's exchange state. Status codes are the structural mechanism by which the platform tracks what is happening to an entity, what has happened, and what may happen next. The status code catalogue is part of the platform's contract surface: bounded-context commands, queries, events, and configuration schemas all reference status codes by their canonical identifier.

The discipline around status codes reflects the platform's broader posture on workflow and state management (SYSTEM_ARCHITECTURE Sections 16 and 17). A status code is not a free-form label; it is a state-machine position governed by transition rules. A status change that does not follow a permitted transition is rejected at validation, with the rejection recorded as an audit event. This discipline preserves the platform's ability to reason about entity state across modules, integrations, and audit investigations. Without it, the platform's audit trail would record state changes that cannot be interpreted consistently, and the platform's workflow engine would be unable to coordinate multi-step processes.

This document sits below `SYSTEM_ARCHITECTURE.md` and aligns with `PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy), Section 28 (Offline Strategy), and Section 31 (Security Philosophy). Sibling documents include `ENUMS.md` (which catalogues the enumerations from which status codes draw), `BUSINESS_RULES.md` (which catalogues the rules that govern status transitions), and `CLINICAL_WORKFLOWS.md` (which catalogues the clinical workflows that produce status transitions). Where this document and a sibling document appear to overlap, this document holds authority over status code definitions and transition maps; ENUMS.md holds authority over the enum value lists; BUSINESS_RULES.md holds authority over the conditions that trigger transitions.

### 1.2 Status Code vs Other Codes

Status codes are distinct from other coded values in Ibn Hayan. A status code represents a state-machine position; a category code represents a classification; a type code represents a discriminator; a result code represents an outcome. The four are not interchangeable. A field that holds a status code references a status enum; a field that holds a category code references a category enum; a field that holds a type code references a type enum; a field that holds a result code references a result enum. The distinction is enforced at contract definition, in keeping with Principle P4 (Loose Coupling, High Cohesion).

The distinction matters because the four code types have different semantics. A status code participates in transition rules; a category code does not. A status code triggers workflow events; a category code does not. A status code is audited on every change; a category code is audited on change but does not trigger transition-audit events. Mixing the four produces contracts that are ambiguous and audit trails that cannot be interpreted. The discipline of separating them is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the status-code domain.

### 1.3 Status Code Coverage

The status code catalogue covers all entities, workflows, transactions, and integrations in Ibn Hayan that have meaningful lifecycle state. Patient status codes govern the patient's overall status. Appointment status codes govern the appointment lifecycle. Encounter and visit status codes govern the clinical encounter lifecycle. Order and result status codes govern the diagnostic and therapeutic order lifecycle. Billing and payment status codes govern the financial transaction lifecycle. Inventory status codes govern the stock and movement lifecycle. Subscription status codes govern the customer's commercial relationship. Workflow and notification status codes govern the platform's behavioural processes. Integration status codes govern the exchange of data with external systems.

The coverage is documented per entity in Sections 3 through 9 of this document. Each section catalogues the status codes for the corresponding entity (or group of entities), with the code's display name, its meaning, the transitions permitted from it, and the audit implication of recording it. The catalogue is the binding reference for module specifications and integration contracts; a status code referenced by a module specification must be present in this catalogue.

### 1.4 Status Code Posture

Ibn Hayan adopts a posture of disciplined status management. Four commitments govern this posture. First, status codes are platform-owned: a status code is defined by the platform through the Architecture Council process; tenants do not add status codes at runtime. Second, status transitions are governed: a transition from one status to another is permitted only if the transition is in the entity's transition map; transitions that are not in the map are rejected at validation. Third, status changes are auditable: every status change is recorded in the audit trail, including the previous status, the new status, the actor, the timestamp, and the authorization basis. Fourth, status codes are localized: every status code has a display string in each supported language, with the display string resolved at render time.

The four commitments are the architectural floor for status management in Ibn Hayan. A module that records a status change without validating the transition is defective; a module that records a status change without audit is defective; a module that uses an unregistered status code is defective. The configuration service enforces these commitments at validation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.5 Ibn Hayan Identity and Status Codes

Status codes are part of the structural vocabulary by which Ibn Hayan maintains its one-platform identity (PRODUCT_BIBLE Section 1.5). A status code recorded in a small clinic is the same status code recorded in a multi-national hospital network; the platform's code paths treat them identically. This consistency is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to the status-code domain. Where regional variation requires different status semantics (for example, a regional regulatory framework may require an additional status for a specific claim lifecycle stage), the variation is expressed through terminology overlays and additional status codes registered through the Architecture Council, not through region-specific status code forks.

---

## 2. Status Code Standard

### 2.1 Status Code Naming Conventions

Status code names in Ibn Hayan follow a documented naming convention aligned with the enum naming convention documented in ENUMS.md Section 2.1. The name is in UpperCamelCase, begins with the owning entity's name (for example, `PatientStatus`, `AppointmentStatus`, `EncounterStatus`), and is unique within the platform's status code catalogue. The name is stable; renaming a status code follows the deprecation policy documented in ENUMS.md Section 11. The name is the status code's canonical identifier; modules and integrations reference the status code by its name, not by an internal numeric identifier.

Status code values follow the enum value convention. Each value has a canonical code (UpperCamelCase, no spaces), a display name (human-readable), and a description (one-sentence definition of the value's meaning and the lifecycle position it represents). The canonical code is the value's identifier in contracts and audit records; the display name is the value's identifier in user-facing rendering; the description is the value's documentation. The three are distinct, and changes to one do not affect the others.

The naming convention is enforced by the Architecture Council at status code registration. A status code that does not follow the convention is rejected; the rejection is recorded with the rationale. The convention is the structural mechanism by which the platform's status code catalogue remains coherent and navigable across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 2.2 Status Code Metadata

Each status code is registered with a defined set of metadata. The metadata records the status code's canonical name, owning entity, owning bounded context, version, status (Active, Deprecated, Retired), default value, value list (with each value's canonical code, display name, description, and lifecycle position), the transition map, and the ADR that ratified the status code. The metadata is the status code's authoritative definition; downstream consumers reference the metadata, not ad hoc definitions in module specifications.

The metadata is versioned. A change to the metadata (adding a value, deprecating a value, changing the transition map, changing the default) is a new version of the status code. The previous version is retained for historical record interpretation. The metadata's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5, ensuring that the platform's status code adoption history is recoverable indefinitely.

### 2.3 Transition Map Structure

A transition map is the structural definition of which status transitions are permitted for an entity. The map is a directed graph: nodes are status values, edges are permitted transitions. Each edge may carry conditions (the transition is permitted only if the conditions are met), actions (the transition triggers specified actions, such as dispatching a notification or invoking a workflow), and audit implications (the transition is recorded with specified audit metadata). The map is part of the status code's metadata and is versioned alongside the status code.

The transition map is enforced by the workflow engine documented in SYSTEM_ARCHITECTURE Section 16. A status change request that does not correspond to a permitted transition in the map is rejected at validation, with the rejection recorded as an audit event. The enforcement is structural, not advisory; a module that bypasses the transition map is defective. This centralization is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) — bounded contexts depend on the workflow engine's transition enforcement, not on their own enforcement logic.

### 2.4 Default and Initial Status

Each status code declares a default value and an initial value. The default value is used when a field that holds the status code is initialized without an explicit value (for example, when a record is created through an automated process and the status is not yet known). The initial value is the status value at which a new entity starts its lifecycle. The two are often the same but may differ: the default may be `Unknown` or `NotSpecified`, while the initial may be `Draft` or `Planned`. The default and initial values are chosen for safety and operational neutrality, in keeping with the discipline documented in ENUMS.md Section 2.5.

The default and initial value discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the status-code domain. A default status that implies a clinical commitment (for example, defaulting an encounter to `InProgress`) would compromise patient safety; the platform defaults to neutral statuses and requires the practitioner or the workflow engine to advance the status explicitly.

### 2.5 Terminal and Reversible Statuses

Each status code declares which values are terminal and which are reversible. A terminal status is one from which no further transitions are permitted; the entity has reached the end of its lifecycle. A reversible status is one from which the entity may return to a prior status, typically through a correction or amendment workflow. The terminal/reversible distinction is recorded in the status code's metadata and is enforced by the transition map.

The distinction matters for audit and compliance. A terminal status indicates that the entity's record is closed; subsequent changes require a new entity (for example, a new encounter) or a formal amendment workflow. A reversible status indicates that the entity's record is still open; subsequent changes are normal lifecycle progression. The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the status-code domain: a terminal status is preserved consistently, even under partition, because reverting it would compromise the integrity of the record.

---

## 3. Patient Status Codes

### 3.1 PatientStatus

The PatientStatus code governs the patient's overall status in the platform. The status is owned by the Patient bounded context (BC01) and is referenced by the Encounter bounded context (BC02) for encounter eligibility, by the Scheduling bounded context (BC06) for appointment eligibility, and by the Billing bounded context (BC07) for billing eligibility. The status is recorded at patient registration and is updated through the patient lifecycle.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Active | Active | BC01 | Patient is available for new encounters and services | Inactive, Deceased, TransferredOut, Archived | Status change recorded with actor, timestamp, authorization |
| Inactive | Inactive | BC01 | Patient is temporarily not available for new encounters | Active, Archived | Status change recorded with reason |
| Deceased | Deceased | BC01 | Patient has died; record retained indefinitely | Archived (rare; usually terminal) | Status change recorded with date and time of death, source of information |
| TransferredOut | Transferred Out | BC01 | Patient has transferred to another facility | Active (if returning), Archived | Status change recorded with receiving facility |
| Archived | Archived | BC01 | Patient record is archived; retained for historical interpretation | Active (if restored through governance workflow) | Status change recorded with archival rationale and retention period |

### 3.2 PatientConfidentiality

The PatientConfidentiality code governs the patient's confidentiality level. The code is owned by the Patient bounded context (BC01) and is referenced by the Identity & Access bounded context (BC15) for access-control decisions. The confidentiality level interacts with the break-glass access workflow documented in PRODUCT_BIBLE Section 21.6.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Normal | Normal | BC01 | Standard access controls apply | Restricted, VIP | Status change recorded with actor and rationale |
| Restricted | Restricted | BC01 | Access requires break-glass or explicit authorization | Normal, VIP | Every access recorded with break-glass flag if applicable |
| VIP | VIP | BC01 | Patient is a very important person; enhanced access logging | Normal, Restricted | Access logged with enhanced detail |

### 3.3 PatientCareLevel

The PatientCareLevel code governs the patient's current care level. The code is owned by the Patient bounded context (BC01) and is referenced by the Encounter bounded context (BC02) for workflow routing. The care level interacts with the clinical workflow catalogue documented in CLINICAL_WORKFLOWS.md.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Outpatient | Outpatient | BC01 | Patient is receiving outpatient care | Inpatient, Emergency, CriticalCare | Care level change recorded with encounter reference |
| Inpatient | Inpatient | BC01 | Patient is admitted to the facility | Outpatient (on discharge), Emergency, CriticalCare | Care level change recorded with admission/discharge reference |
| Emergency | Emergency | BC01 | Patient is receiving emergency care | Outpatient, Inpatient, CriticalCare | Care level change recorded with emergency-encounter reference |
| CriticalCare | Critical Care | BC01 | Patient is in critical care | Inpatient, Emergency, Outpatient (rare) | Care level change recorded with critical-care reference |

### 3.4 ConsentStatus

The ConsentStatus code governs the patient's consent records. The code is owned by the Patient bounded context (BC01) and is referenced by the Encounter and Orders bounded contexts for consent verification. The consent status interacts with the patient consent enums documented in ENUMS.md Section 3.3.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Pending | Pending | BC01 | Consent has been requested but not yet granted | Granted, Withdrawn | Consent request recorded with type and scope |
| Granted | Granted | BC01 | Consent has been granted by the patient or surrogate | Withdrawn, Expired | Consent grant recorded with actor, basis, duration |
| Withdrawn | Withdrawn | BC01 | Consent has been withdrawn by the patient or surrogate | Granted (re-grant) | Withdrawal recorded with actor, basis, scope |
| Expired | Expired | BC01 | Consent has reached its expiry date | Granted (re-grant), Pending | Expiry recorded automatically; re-grant recorded with new basis |

---

## 4. Appointment Status Codes

### 4.1 AppointmentStatus

The AppointmentStatus code governs the appointment lifecycle. The status is owned by the Scheduling bounded context (BC06) and is referenced by the Encounter bounded context (BC02) for encounter creation, by the Notifications bounded context (BC14) for reminder dispatch, and by the Billing bounded context (BC07) for no-show billing. The status is recorded at appointment creation and is updated through the appointment lifecycle.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Scheduled | Scheduled | BC06 | Appointment has been booked | Confirmed, Cancelled, Rescheduled, CheckedIn | Creation recorded with slot, patient, practitioner |
| Confirmed | Confirmed | BC06 | Patient or system has confirmed the appointment | Scheduled, CheckedIn, Cancelled, NoShow | Confirmation recorded with actor and channel |
| CheckedIn | CheckedIn | BC06 | Patient has arrived and checked in | InProgress, NoShow, Cancelled | Check-in recorded with arrival time |
| InProgress | In Progress | BC06 | Patient is being seen by the practitioner | Completed | Transition recorded with encounter reference |
| Completed | Completed | BC06 | Appointment has concluded | Terminal | Completion recorded with encounter outcome |
| NoShow | No Show | BC06 | Patient did not arrive and did not cancel | Terminal (or rebooked as new appointment) | No-show recorded with billing implication flag |
| Cancelled | Cancelled | BC06 | Appointment has been cancelled before arrival | Terminal (or rebooked as new appointment) | Cancellation recorded with reason and actor |
| Rescheduled | Rescheduled | BC06 | Appointment has been rescheduled to a new slot | New appointment created with Scheduled status; original marked Cancelled | Reschedule recorded with old slot, new slot, reason |

### 4.2 SlotStatus

The SlotStatus code governs the scheduling slot lifecycle. The status is owned by the Scheduling bounded context (BC06) and is referenced by the appointment booking workflow. The slot status interacts with the appointment status: a slot that is Booked corresponds to an appointment that is Scheduled, Confirmed, CheckedIn, or InProgress.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Open | Open | BC06 | Slot is available for booking | Held, Booked, Blocked | Slot creation recorded with practitioner, time |
| Held | Held | BC06 | Slot is temporarily held for a booking in progress | Open, Booked | Hold recorded with actor and hold duration |
| Booked | Booked | BC06 | Slot is booked for an appointment | Open (on cancellation), Blocked (rare) | Booking recorded with appointment reference |
| Blocked | Blocked | BC06 | Slot is unavailable for booking (e.g., practitioner leave) | Open (on unblock) | Block recorded with reason and actor |

### 4.3 ResourceAvailability

The ResourceAvailability code governs the availability of schedulable resources (practitioners, rooms, equipment). The code is owned by the Scheduling bounded context (BC06) and is referenced by the slot management workflow.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Available | Available | BC06 | Resource is available for scheduling | Busy, Unavailable | Status change recorded |
| Busy | Busy | BC06 | Resource is currently scheduled | Available, Unavailable | Status change recorded with appointment reference |
| Unavailable | Unavailable | BC06 | Resource is not available (leave, maintenance) | Available | Status change recorded with reason and duration |

---

## 5. Encounter & Visit Status Codes

### 5.1 EncounterStatus

The EncounterStatus code governs the clinical encounter lifecycle. The status is owned by the Encounter bounded context (BC02) and is referenced by the Clinical Documentation bounded context (BC03) for documentation authority, by the Orders & Results bounded context (BC04) for order eligibility, and by the Billing bounded context (BC07) for billing eligibility. The status is recorded at encounter creation and is updated through the encounter lifecycle.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Planned | Planned | BC02 | Encounter is scheduled but not yet begun | Arrived, Cancelled | Creation recorded with patient, practitioner, type |
| Arrived | Arrived | BC02 | Patient has arrived for the encounter | InProgress, Cancelled (rare) | Arrival recorded with check-in time |
| InProgress | In Progress | BC02 | Encounter is actively in progress | OnLeave, Finished, Cancelled (rare) | Transition recorded with practitioner |
| OnLeave | On Leave | BC02 | Encounter is temporarily on hold (e.g., patient procedure) | InProgress, Finished | On-leave recorded with reason |
| Finished | Finished | BC02 | Encounter has concluded | Terminal (or amended through documentation workflow) | Completion recorded with discharge disposition |
| Cancelled | Cancelled | BC02 | Encounter has been cancelled before starting | Terminal | Cancellation recorded with reason and actor |

### 5.2 EncounterAdmissionStatus

The EncounterAdmissionStatus code governs the inpatient admission lifecycle, distinct from the overall encounter status. The code is owned by the Encounter bounded context (BC02) and applies to inpatient encounters. The admission status interacts with the bed management workflow.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Admitted | Admitted | BC02 | Patient has been admitted to the facility | Discharged, Transferred | Admission recorded with bed, attending |
| Discharged | Discharged | BC02 | Patient has been discharged | Terminal | Discharge recorded with disposition, summary |
| Transferred | Transferred | BC02 | Patient has been transferred to another facility or service | Admitted (in new service), Discharged | Transfer recorded with receiving facility/service |

### 5.3 ClinicalNoteStatus

The ClinicalNoteStatus code governs the clinical note lifecycle. The code is owned by the Clinical Documentation bounded context (BC03) and is referenced by the Encounter bounded context for note authority. The note status interacts with the signing authority documented in ENUMS.md Section 4.2.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Draft | Draft | BC03 | Note is being authored | InProgress, Signed, Withdrawn | Draft creation recorded |
| InProgress | In Progress | BC03 | Note is being co-authored or reviewed | Signed, Withdrawn | Co-authorship recorded |
| Signed | Signed | BC03 | Note has been signed by an authorized practitioner | Amended, Addendum | Signing recorded with signer, timestamp |
| Amended | Amended | BC03 | Note has been amended after signing | Addendum (rare) | Amendment recorded with reason and author |
| Addendum | Addendum | BC03 | An addendum has been added to the note | Terminal | Addendum recorded with author and content |
| Withdrawn | Withdrawn | BC03 | Note has been withdrawn (e.g., authored in error) | Terminal | Withdrawal recorded with reason and author |

### 5.4 CarePlanStatus

The CarePlanStatus code governs the care plan lifecycle. The code is owned by the Clinical Documentation bounded context (BC03) and is referenced by the chronic disease management workflow documented in CLINICAL_WORKFLOWS.md.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Draft | Draft | BC03 | Care plan is being authored | Active, Cancelled | Draft creation recorded |
| Active | Active | BC03 | Care plan is active and being followed | OnHold, Completed, Cancelled | Activation recorded with author |
| OnHold | On Hold | BC03 | Care plan is temporarily on hold | Active, Cancelled | Hold recorded with reason |
| Completed | Completed | BC03 | Care plan has been completed | Terminal | Completion recorded with outcome |
| Cancelled | Cancelled | BC03 | Care plan has been cancelled | Terminal | Cancellation recorded with reason |

---

## 6. Order & Result Status Codes

### 6.1 OrderStatus

The OrderStatus code governs the order lifecycle for laboratory, imaging, procedure, referral, and consultation orders. The status is owned by the Orders & Results bounded context (BC04) and is referenced by the Encounter bounded context for order context, by the Pharmacy bounded context (BC05) for medication order fulfilment, and by the Billing bounded context for billing. The status is recorded at order entry and is updated through the order lifecycle.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Draft | Draft | BC04 | Order is being authored | Pending, Cancelled | Draft creation recorded |
| Pending | Pending | BC04 | Order is awaiting processing | Active, Held, Cancelled | Submission recorded with priority |
| Active | Active | BC04 | Order is being processed by the fulfilling service | Completed, Cancelled | Activation recorded with fulfilling service |
| Completed | Completed | BC04 | Order has been completed and result available | Terminal | Completion recorded with result reference |
| Cancelled | Cancelled | BC04 | Order has been cancelled | Terminal | Cancellation recorded with reason and actor |
| Held | Held | BC04 | Order is temporarily held (e.g., awaiting pre-authorization) | Active, Cancelled | Hold recorded with reason |

### 6.2 ResultStatus

The ResultStatus code governs the result lifecycle for laboratory and imaging results. The status is owned by the Orders & Results bounded context (BC04) and is referenced by the Clinical Documentation bounded context for result documentation and by the Notifications bounded context for result notification.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Preliminary | Preliminary | BC04 | Result is preliminary and may be updated | Final, Corrected, Cancelled | Preliminary result recorded with caveat |
| Final | Final | BC04 | Result is final and authoritative | Corrected, Amended | Final result recorded with signer |
| Corrected | Corrected | BC04 | Result has been corrected after finalization | Amended (rare) | Correction recorded with reason, original, corrected values |
| Amended | Amended | BC04 | Result has been amended with additional information | Terminal | Amendment recorded with author and content |
| Cancelled | Cancelled | BC04 | Result has been cancelled (e.g., specimen unsuitable) | Terminal | Cancellation recorded with reason |

### 6.3 SpecimenStatus

The SpecimenStatus code governs the specimen lifecycle for laboratory specimens. The status is owned by the Orders & Results bounded context (BC04) and is referenced by the laboratory workflow documented in CLINICAL_WORKFLOWS.md.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Collected | Collected | BC04 | Specimen has been collected from the patient | Received, Rejected | Collection recorded with collector, time |
| Received | Received | BC04 | Specimen has been received by the laboratory | InTesting, Rejected | Receipt recorded with receiver, time |
| InTesting | In Testing | BC04 | Specimen is being tested | Resulted, Rejected | Testing recorded with test reference |
| Resulted | Resulted | BC04 | Specimen has produced a result | Terminal | Result recording triggers ResultStatus update |
| Rejected | Rejected | BC04 | Specimen has been rejected (e.g., haemolysed) | Terminal | Rejection recorded with reason |

### 6.4 MedicationOrderStatus and AdministrationStatus

The MedicationOrderStatus and AdministrationStatus codes govern the medication order and administration lifecycles. The codes are owned by the Pharmacy bounded context (BC05). The medication order status interacts with the dispensing status; the administration status interacts with the medication administration record (MAR).

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Draft | Draft | BC05 | Medication order is being authored | Active, Cancelled | Draft creation recorded |
| Active | Active | BC05 | Medication order is active | OnHold, Dispensed, Administered, Completed, Cancelled | Activation recorded with prescriber |
| OnHold | On Hold | BC05 | Medication order is temporarily held | Active, Cancelled | Hold recorded with reason |
| Dispensed | Dispensed | BC05 | Medication has been dispensed | Administered, Completed | Dispensing recorded with dispenser, quantity |
| Administered | Administered | BC05 | Medication has been administered to the patient | Completed | Administration recorded with administrator, time |
| Completed | Completed | BC05 | Medication order has been completed | Terminal | Completion recorded |
| Cancelled | Cancelled | BC05 | Medication order has been cancelled | Terminal | Cancellation recorded with reason |

The AdministrationStatus code is recorded per dose, distinct from the MedicationOrderStatus which is recorded per order. A single medication order may have multiple AdministrationStatus records over its lifecycle.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Due | Due | BC05 | Dose is due to be administered | Given, Held, Refused | Due time recorded with schedule |
| Given | Given | BC05 | Dose has been administered | Terminal | Administration recorded with administrator, time, site |
| Held | Held | BC05 | Dose has been held (e.g., patient refusal, clinical reason) | Given (if later administered), Missed | Hold recorded with reason |
| Refused | Refused | BC05 | Patient has refused the dose | Terminal | Refusal recorded with patient explanation |
| Missed | Missed | BC05 | Dose was missed (e.g., not given within window) | Terminal | Miss recorded with reason |

---

## 7. Billing & Payment Status Codes

### 7.1 InvoiceStatus

The InvoiceStatus code governs the invoice lifecycle. The status is owned by the Billing bounded context (BC07) and is referenced by the Accounting bounded context (BC08) for ledger posting and by the Notifications bounded context (BC14) for invoice reminders. The status is recorded at invoice creation and is updated through the billing workflow.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Draft | Draft | BC07 | Invoice is being prepared | Issued, Cancelled | Draft creation recorded |
| Issued | Issued | BC07 | Invoice has been issued to the payer | PartiallyPaid, Paid, Disputed, WrittenOff, Cancelled | Issue recorded with issue date, payer |
| PartiallyPaid | Partially Paid | BC07 | Invoice has been partially paid | Paid, Disputed, WrittenOff | Partial payment recorded with amount |
| Paid | Paid | BC07 | Invoice has been paid in full | Terminal (or Reversed) | Payment recorded with method, amount, reference |
| WrittenOff | Written Off | BC07 | Invoice has been written off | Terminal | Write-off recorded with reason and authorization |
| Disputed | Disputed | BC07 | Invoice has been disputed by the payer | Paid, WrittenOff, Cancelled | Dispute recorded with reason |
| Cancelled | Cancelled | BC07 | Invoice has been cancelled | Terminal | Cancellation recorded with reason |

### 7.2 ClaimStatus

The ClaimStatus code governs the insurance claim lifecycle. The status is owned by the Billing bounded context (BC07) and is referenced by the integration architecture for payer exchange. The claim status interacts with the invoice status: a claim that is Paid triggers the invoice to be Paid or PartiallyPaid.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Draft | Draft | BC07 | Claim is being prepared | Submitted, Cancelled | Draft creation recorded |
| Submitted | Submitted | BC07 | Claim has been submitted to the payer | Accepted, Rejected, PartiallyPaid, Paid, Denied | Submission recorded with payer, submission ID |
| Accepted | Accepted | BC07 | Claim has been accepted for processing | PartiallyPaid, Paid, Denied | Acceptance recorded with payer acknowledgment |
| Rejected | Rejected | BC07 | Claim has been rejected (e.g., formatting error) | Submitted (resubmission), Cancelled | Rejection recorded with reason |
| PartiallyPaid | Partially Paid | BC07 | Claim has been partially paid | Paid, Appealed | Partial payment recorded with amount, adjudication |
| Paid | Paid | BC07 | Claim has been paid in full | Terminal (or Appealed) | Payment recorded with amount, remittance |
| Denied | Denied | BC07 | Claim has been denied | Appealed, WrittenOff | Denial recorded with reason, adjudication |
| Appealed | Appealed | BC07 | Claim has been appealed | Paid, Denied, WrittenOff | Appeal recorded with reason, supporting documentation |

### 7.3 PaymentStatus

The PaymentStatus code governs the payment lifecycle. The status is owned by the Billing bounded context (BC07) and is referenced by the Accounting bounded context for ledger reconciliation. The payment status interacts with the invoice and claim statuses.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Pending | Pending | BC07 | Payment is pending (e.g., awaiting clearance) | Posted, Reversed | Pending payment recorded with method, amount |
| Posted | Posted | BC07 | Payment has been posted to the ledger | Reversed, Refunded | Posting recorded with ledger reference |
| Reversed | Reversed | BC07 | Payment has been reversed (e.g., chargeback) | Refunded (rare) | Reversal recorded with reason |
| Refunded | Refunded | BC07 | Payment has been refunded to the payer | Terminal | Refund recorded with reason, amount |

### 7.4 PreAuthorizationStatus

The PreAuthorizationStatus code governs the pre-authorization lifecycle. The status is owned by the Billing bounded context (BC07) and is referenced by the Orders bounded context for service-delivery eligibility.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Requested | Requested | BC07 | Pre-authorization has been requested | Approved, Denied, Cancelled | Request recorded with service, payer |
| Approved | Approved | BC07 | Pre-authorization has been approved | Expired, Cancelled | Approval recorded with authorization number, period |
| Denied | Denied | BC07 | Pre-authorization has been denied | Appealed, Cancelled | Denial recorded with reason |
| Expired | Expired | BC07 | Pre-authorization has expired | Requested (re-request) | Expiry recorded automatically |
| Cancelled | Cancelled | BC07 | Pre-authorization has been cancelled | Terminal | Cancellation recorded with reason |

---

## 8. Inventory Status Codes

### 8.1 InventoryStatus

The InventoryStatus code governs the inventory item lifecycle. The status is owned by the Inventory bounded context (BC09) and is referenced by the Pharmacy bounded context for pharmacy inventory and by the Orders bounded context for order fulfilment.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Active | Active | BC09 | Item is active and available for use | Inactive, Quarantined, Recalled | Status change recorded |
| Inactive | Inactive | BC09 | Item is temporarily inactive | Active, Archived | Status change recorded with reason |
| Quarantined | Quarantined | BC09 | Item is quarantined pending investigation | Active, Recalled, Expired | Quarantine recorded with reason |
| Recalled | Recalled | BC09 | Item has been recalled by the manufacturer or regulator | Active (if cleared), Disposed | Recall recorded with recall reference |
| Expired | Expired | BC09 | Item has passed its expiry date | Disposed | Expiry recorded automatically |
| Archived | Archived | BC09 | Item has been archived (no longer stocked) | Terminal | Archival recorded with reason |

### 8.2 MovementStatus

The MovementStatus code governs the stock movement lifecycle. The status is owned by the Inventory bounded context (BC09) and is referenced by the Accounting bounded context for cost ledger updates.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Pending | Pending | BC09 | Movement is pending (e.g., transfer in transit) | Completed, Cancelled | Creation recorded with source, destination, items |
| Completed | Completed | BC09 | Movement has been completed | Reversed (rare) | Completion recorded with receiver, time |
| Cancelled | Cancelled | BC09 | Movement has been cancelled | Terminal | Cancellation recorded with reason |
| Reversed | Reversed | BC09 | Movement has been reversed (e.g., correction) | Terminal | Reversal recorded with reason, authorization |

### 8.3 PurchaseOrderStatus

The PurchaseOrderStatus code governs the purchase order lifecycle. The status is owned by the Inventory bounded context (BC09) and is referenced by the Accounting bounded context for accounts payable.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Draft | Draft | BC09 | Purchase order is being prepared | Sent, Cancelled | Draft creation recorded |
| Sent | Sent | BC09 | Purchase order has been sent to the supplier | PartiallyReceived, Received, Cancelled | Sent recorded with supplier, send time |
| PartiallyReceived | Partially Received | BC09 | Purchase order has been partially received | Received, Cancelled (rare) | Partial receipt recorded with received items |
| Received | Received | BC09 | Purchase order has been fully received | Terminal | Full receipt recorded |
| Cancelled | Cancelled | BC09 | Purchase order has been cancelled | Terminal | Cancellation recorded with reason |

### 8.4 ColdChainStatus and RecallStatus

The ColdChainStatus and RecallStatus codes are pharmacy-specific status codes that govern the cold-chain compliance and recall lifecycle for pharmacy inventory. The codes are owned by the Pharmacy bounded context (BC05) and extend the Inventory bounded context's status codes per the documented deviation in SYSTEM_ARCHITECTURE Section 7.7.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Compliant | Compliant | BC05 | Cold-chain temperature has been maintained | Excursion, Breach | Continuous monitoring recorded |
| Excursion | Excursion | BC05 | Temperature excursion detected (within tolerance) | Compliant (if resolved), Breach | Excursion recorded with duration, magnitude |
| Breach | Breach | BC05 | Temperature breach detected (beyond tolerance) | Disposed (typically) | Breach recorded with disposition decision |

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| NotAffected | Not Affected | BC05 | Lot is not affected by the recall | Terminal | Status recorded |
| Affected | Affected | BC05 | Lot is affected by the recall | UnderReview, Disposed | Recall recorded with recall reference |
| UnderReview | Under Review | BC05 | Lot is under review for recall impact | Affected, Cleared | Review recorded with reviewer |
| Cleared | Cleared | BC05 | Lot has been cleared (false alarm) | Terminal | Clearance recorded with rationale |

---

## 9. Subscription Status Codes

### 9.1 SubscriptionStatus

The SubscriptionStatus code governs the customer's commercial relationship with Ibn Hayan. The status is owned by the Subscriptions bounded context (orchestrated through BC07, BC08, BC15, BC16, BC17, BC14 per SYSTEM_ARCHITECTURE Section 7.7) and is referenced by the Identity & Access bounded context for tenant access and by the Configuration bounded context for tenant configuration.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Trial | Trial | Subscriptions | Subscription is in trial period | Active, Expired | Trial start recorded with end date |
| Active | Active | Subscriptions | Subscription is active and paid | PastDue, Suspended, Cancelled, Expired | Activation recorded with edition, billing |
| PastDue | Past Due | Subscriptions | Subscription is past due (payment outstanding) | Active (on payment), Suspended | Past-due recorded with amount, due date |
| Suspended | Suspended | Subscriptions | Subscription is suspended (no access) | Active (on payment and reactivation), Cancelled | Suspension recorded with reason |
| Cancelled | Cancelled | Subscriptions | Subscription has been cancelled | Expired (at end of billing period) | Cancellation recorded with reason, actor |
| Expired | Expired | Subscriptions | Subscription has expired | Terminal (or reactivated as new subscription) | Expiry recorded |

### 9.2 TenantLifecycleStage

The TenantLifecycleStage code governs the tenant's overall lifecycle. The code is aligned with the seven-stage lifecycle documented in PRODUCT_BIBLE Section 23.3 (TL1 through TL7). The tenant lifecycle is broader than the subscription lifecycle: it covers the tenant's existence from provisioning through archiving.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| TL1 | Provisioning | Subscriptions | Tenant is being provisioned | TL2 | Provisioning recorded with edition, region |
| TL2 | Onboarding | Subscriptions | Tenant is in onboarding (configuration, training) | TL3, TL7 (if cancelled) | Onboarding recorded with milestones |
| TL3 | Active | Subscriptions | Tenant is in steady-state operation | TL4, TL5, TL7 | Active state recorded with subscription reference |
| TL4 | Suspended | Subscriptions | Tenant is suspended (operational or commercial) | TL3 (on reactivation), TL7 | Suspension recorded with reason |
| TL5 | Offboarding | Subscriptions | Tenant is in offboarding (data export, decommission) | TL6, TL3 (if retracted) | Offboarding recorded with milestones |
| TL6 | Archived | Subscriptions | Tenant is archived; data retained per retention policy | Terminal (or TL3 on reactivation, rare) | Archival recorded with retention period |
| TL7 | Cancelled | Subscriptions | Tenant was cancelled before activation | Terminal | Cancellation recorded with reason |

### 9.3 EditionStatus

The EditionStatus code governs the edition lifecycle. The code is owned by the Subscriptions bounded context and is referenced by the Configuration bounded context for edition-level configuration. The edition lifecycle is broader than the subscription lifecycle: an edition may be in a lifecycle stage that is independent of any individual subscription.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| Announced | Announced | Subscriptions | Edition has been announced but not yet available | Available | Announcement recorded with availability date |
| Available | Available | Subscriptions | Edition is available for subscription | Deprecated, Retired | Availability recorded with effective date |
| Deprecated | Deprecated | Subscriptions | Edition is deprecated; not available for new subscriptions | Retired | Deprecation recorded with successor, transition window |
| Retired | Retired | Subscriptions | Edition is retired; existing subscriptions maintained per transition window | Terminal | Retirement recorded with end-of-support date |

### 9.4 FeatureFlagLifecycle

The FeatureFlagLifecycle code governs the feature flag lifecycle. The code is owned by the Feature Flags bounded context (BC18) and is aligned with the five-stage lifecycle documented in SYSTEM_ARCHITECTURE Section 14.3 (FFL1 through FFL5). The feature flag lifecycle is documented in detail in FEATURE_FLAGS.md.

| Code | Display Name | Module | Meaning | Allowed Transitions | Audit Implication |
|---|---|---|---|---|---|
| FFL1 | Defined | BC18 | Flag is defined; not yet evaluated | FFL2 | Definition recorded with type, owner |
| FFL2 | Active | BC18 | Flag is in use; evaluation produces a result | FFL3, FFL4 | Activation recorded with rollout strategy |
| FFL3 | Static-True | BC18 | Flag is permanently true; scheduled for removal | FFL5 | Static-true recorded with removal date |
| FFL4 | Static-False | BC18 | Flag is permanently false; scheduled for removal | FFL5 | Static-false recorded with removal date |
| FFL5 | Removed | BC18 | Flag has been removed from the platform | Terminal | Removal recorded with rationale |

---

## 10. Status Transition Maps

### 10.1 Transition Map Purpose

A status transition map is the structural definition of which status transitions are permitted for an entity. The map is part of the status code's metadata and is enforced by the workflow engine documented in SYSTEM_ARCHITECTURE Section 16. A transition that is not in the map is rejected at validation, with the rejection recorded as an audit event. The transition map discipline preserves the platform's ability to reason about entity state across modules, integrations, and audit investigations.

The transition map is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the status-code domain. A transition that is permitted inconsistently across modules would compromise the platform's ability to reason about entity state; the transition map ensures that the same transition is permitted or rejected consistently across the platform. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) — every transition is recorded, and every rejected transition is recorded.

### 10.2 Encounter Transition Map

The encounter transition map is the platform's most clinically significant transition map. The map governs the encounter lifecycle from Planned through Finished, with branches for cancellation and on-leave. The map is documented below as a transition table; the graphical representation is documented in the Encounter module specification.

| From | To | Condition | Action | Audit |
|---|---|---|---|---|
| Planned | Arrived | Patient check-in | Create encounter record; notify practitioner | Record arrival with time, actor |
| Planned | InProgress | Direct start (e.g., emergency) | Create encounter record | Record direct-start with rationale |
| Planned | Cancelled | Cancellation request | Release slot; notify patient | Record cancellation with reason |
| Arrived | InProgress | Practitioner starts encounter | Notify supporting services | Record start with practitioner |
| Arrived | Cancelled | Patient leaves before being seen | Release slot; record no-show if applicable | Record cancellation with reason |
| InProgress | OnLeave | Encounter temporarily paused | Pause clinical documentation | Record on-leave with reason |
| OnLeave | InProgress | Encounter resumes | Resume clinical documentation | Record resume |
| InProgress | Finished | Practitioner concludes encounter | Trigger discharge workflow; finalize documentation | Record completion with discharge disposition |
| InProgress | Cancelled | Encounter cancelled mid-progress (rare) | Cancel associated orders; record reason | Record cancellation with reason and authorization |

### 10.3 Order Transition Map

The order transition map governs the order lifecycle from Draft through Completed. The map is documented below as a transition table; the graphical representation is documented in the Orders & Results module specification.

| From | To | Condition | Action | Audit |
|---|---|---|---|---|
| Draft | Pending | Order submitted | Route to fulfilling service | Record submission with priority |
| Draft | Cancelled | Order cancelled before submission | None | Record cancellation with reason |
| Pending | Active | Fulfilling service accepts order | Begin fulfilment | Record acceptance with service |
| Pending | Held | Hold request (e.g., pre-auth required) | Pause fulfilment | Record hold with reason |
| Pending | Cancelled | Cancellation before fulfilment | Notify fulfilling service | Record cancellation with reason |
| Held | Active | Hold released | Resume fulfilment | Record release with authorization |
| Held | Cancelled | Cancellation while on hold | Notify fulfilling service | Record cancellation with reason |
| Active | Completed | Fulfilment complete | Make result available; trigger notification | Record completion with result reference |
| Active | Cancelled | Cancellation during fulfilment (rare) | Notify fulfilling service; record reason | Record cancellation with authorization |

### 10.4 Invoice Transition Map

The invoice transition map governs the invoice lifecycle from Draft through Paid or WrittenOff. The map is documented below as a transition table.

| From | To | Condition | Action | Audit |
|---|---|---|---|---|
| Draft | Issued | Invoice issued to payer | Issue document; schedule reminders | Record issue with date, payer |
| Draft | Cancelled | Invoice cancelled before issue | None | Record cancellation with reason |
| Issued | PartiallyPaid | Partial payment received | Post partial payment; update balance | Record partial payment with amount |
| Issued | Paid | Full payment received | Post payment; close invoice | Record payment with method, amount |
| Issued | Disputed | Payer disputes invoice | Pause dunning; investigate dispute | Record dispute with reason |
| Issued | WrittenOff | Invoice written off (e.g., bad debt) | Post write-off; close invoice | Record write-off with authorization |
| Issued | Cancelled | Invoice cancelled (e.g., issued in error) | Reverse issued document | Record cancellation with reason and authorization |
| PartiallyPaid | Paid | Remaining balance paid | Post payment; close invoice | Record final payment |
| PartiallyPaid | Disputed | Payer disputes partial invoice | Pause dunning; investigate | Record dispute with reason |
| PartiallyPaid | WrittenOff | Remaining balance written off | Post write-off; close invoice | Record write-off with authorization |
| Disputed | Paid | Dispute resolved; payment received | Post payment; close invoice | Record resolution and payment |
| Disputed | WrittenOff | Dispute resolved; balance written off | Post write-off; close invoice | Record resolution and write-off |

### 10.5 Claim Transition Map

The claim transition map governs the claim lifecycle from Draft through Paid, Denied, or Appealed. The map is documented below as a transition table.

| From | To | Condition | Action | Audit |
|---|---|---|---|---|
| Draft | Submitted | Claim submitted to payer | Transmit claim; record submission ID | Record submission with payer, transmission |
| Draft | Cancelled | Claim cancelled before submission | None | Record cancellation with reason |
| Submitted | Accepted | Payer accepts for processing | Await adjudication | Record acceptance with payer acknowledgment |
| Submitted | Rejected | Payer rejects (e.g., formatting) | Correct and resubmit | Record rejection with reason |
| Submitted | Denied | Payer denies outright | Consider appeal | Record denial with reason |
| Accepted | PartiallyPaid | Payer partially pays | Post partial payment; consider appeal | Record partial payment with adjudication |
| Accepted | Paid | Payer pays in full | Post payment; close claim | Record payment with remittance |
| Accepted | Denied | Payer denies after acceptance | Consider appeal | Record denial with reason |
| PartiallyPaid | Paid | Payer pays remaining | Post payment; close claim | Record final payment |
| PartiallyPaid | Appealed | Provider appeals partial payment | Submit appeal | Record appeal with reason |
| Paid | Appealed | Provider appeals payment amount | Submit appeal | Record appeal with reason |
| Denied | Appealed | Provider appeals denial | Submit appeal | Record appeal with reason |
| Appealed | Paid | Appeal succeeds; payer pays | Post payment; close claim | Record appeal outcome |
| Appealed | Denied | Appeal fails | Consider write-off | Record appeal outcome |

### 10.6 Transition Map Governance

Transition maps are governed by the Architecture Council. A change to a transition map (adding a transition, removing a transition, changing a condition or action) is a configuration action ratified through an ADR. The change is recorded in the CHANGELOG with the version increment. The previous version of the transition map is retained for historical record interpretation, ensuring that a transition recorded under a previous version is interpretable in the context of that version.

The transition map governance discipline is the architectural expression of Principle P7 (Documented Before Implemented) and Principle P13 (Auditability as Primitive) applied to the status-code domain. A transition map that is changed without documentation is defective; the platform's audit trail cannot demonstrate the change's rationale, and downstream consumers cannot determine why the transition map was changed. The discipline ensures that the platform's transition maps remain a recoverable artefact across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

---

## 11. Status Code Localization

### 11.1 Display String Resolution

Status code display strings are localized through the platform's localization architecture documented in SYSTEM_ARCHITECTURE Section 26. Each status code value has a display string in each supported language, with the display string resolved at render time through the localization pack in force for the tenant. The display string is not stored alongside the status code in the data record; the status code (canonical code) is stored, and the display string is resolved when the value is rendered. This discipline preserves the platform's cross-language comparability: a status code recorded in an English-speaking clinic is the same status code in an Arabic-speaking clinic; the display string differs, but the code does not.

The display string resolution is performed by the terminology service, in coordination with the localization service. The terminology service holds the canonical status code catalogue; the localization service holds the display string translations. The two services are distinct but coordinated: a status code value's display string is requested by the rendering layer from the localization service, with the terminology service consulted for the canonical code's metadata where needed.

### 11.2 Localization Pack Coverage

Each localization pack covers the status codes used in the tenant's region. The pack's coverage is documented in the regional profile (PRODUCT_BIBLE Section 25.3); a tenant that operates in a region with incomplete status code localization receives a warning at tenant configuration time, with the option to defer configuration until the pack's coverage is complete or to proceed with fallback display strings. The fallback display string is the status code value's canonical code, rendered in the platform's primary language; the fallback is recorded so that the rendering layer can surface the language discrepancy to the user where appropriate.

Localization pack coverage is reviewed at each quarterly Architecture Council review. Packs that have fallen behind the platform's status code catalogue are prioritized for completion. The completion is the responsibility of the Regional Council with Architecture Council oversight, in keeping with the governance discipline documented in TERMINOLOGY.md Section 5.

### 11.3 Patient-Facing Display Strings

Status codes that are displayed to patients (for example, appointment statuses, prescription statuses) have patient-facing display strings distinct from practitioner-facing display strings. The patient-facing display string is curated by the Clinical Informatics Council, with input from patient advocacy bodies where appropriate. The patient-facing display string is not a separate status code; it is a display string for the same status code, recorded in a separate display-string catalogue.

The separation of patient-facing from practitioner-facing display strings preserves the platform's commitment to patient comprehension while maintaining clinical fidelity. A patient who reads "ready for collection" instead of "dispensed" sees the same status code that the practitioner recorded, with the display string resolved for the patient's context. This treatment is the architectural expression of PRODUCT_BIBLE Design Principle D-4 (Simplicity Without Sacrificing Power) applied to the status-code domain.

### 11.4 Right-to-Left Display

Status code display strings in right-to-left languages (Arabic, Hebrew, Persian, Urdu) are subject to the directionality rules documented in TERMINOLOGY.md Section 7.5. The display string is rendered with the correct directionality, with the directionality metadata supplied by the localization service. Status code display strings that combine left-to-right and right-to-left content (for example, an Arabic display string that includes a Latin code) are handled through Unicode bidirectional algorithm support.

Right-to-left display is part of the platform's localization architecture and is documented here because status code display strings are subject to the rules. The discipline ensures that status code display strings render correctly in all supported languages, in keeping with the platform's regional adaptation posture documented in PRODUCT_BIBLE Section 25.

---

## 12. Status Code Audit

### 12.1 Status Change Audit Records

Every status change is recorded in the audit trail, in keeping with Principle P13 (Auditability as Primitive) documented in SYSTEM_ARCHITECTURE Section 4.13. The audit record captures the entity type, the entity identifier, the previous status, the new status, the actor (user, system, integration), the timestamp, the authorization basis, the transition reference (which transition in the map was invoked), the conditions evaluated, and the actions triggered. The audit record is immutable; once written, it cannot be modified or deleted.

The audit record for status changes is distinct from the audit record for the underlying data action. A data action (creating an encounter, posting an invoice) is audited by the bounded context that owns the data; the status change on that action is audited by the workflow engine. Both audit records are preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5 and are queryable by authorized roles.

### 12.2 Rejected Transition Audit

A status change that is rejected at validation (because the transition is not in the entity's transition map) is recorded in the audit trail as a security-relevant event. The audit record captures the attempted transition, the rejecting engine, the actor, and the rejection reason. The rejection is recorded regardless of whether the actor is a user, a system component, or an integration; the discipline is the structural mechanism by which the platform detects attempts to bypass the transition map.

The rejected transition audit discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the status-code domain. A rejected transition that is not audited would be invisible; the platform would be unable to detect attempts to bypass the transition map, and the platform's compliance posture would be compromised. The discipline ensures that every attempt, successful or not, is recorded.

### 12.3 Status Query Audit

A query for status history is recorded in the audit trail, in keeping with the audit query discipline documented in SYSTEM_ARCHITECTURE Section 27.6. The audit record captures the querier, the entity queried, the time range, and the result count. The query audit is itself auditable, ensuring that status history investigation is itself auditable. This discipline is the architectural expression of the platform's commitment to accountability (PRODUCT_BIBLE Design Principle D-10).

Status query audit interacts with the permission framework documented in PRODUCT_BIBLE Section 21. Only authorized roles can query status history; queries by unauthorized roles are rejected before execution, with the rejection recorded as a security-relevant audit event. The permission framework's data-scope categories (All, Cohort, Self, None) apply to status history queries: a role with Cohort scope can query status history for patients in its cohort; a role with Self scope can query only its own actions.

### 12.4 Status Audit and Compliance

Status audit records are the basis for compliance demonstration. Compliance reporting is generated from status audit records, with reports tailored to specific regulatory requirements. For example, a regulatory report on appointment no-show rates is generated from appointment status audit records; a regulatory report on claim denial rates is generated from claim status audit records. Compliance reports are themselves auditable, with report generation recorded in the audit trail.

The platform's compliance documentation defines, per region, what status audit records are required, how they are retained, and how they are made available to regulators. The platform's status audit architecture is designed to meet these requirements without architectural change, with regional variation expressed through configuration. This discipline is the architectural expression of Principle P17 (Regional Adaptation Without Forking) applied to the status-code domain.

### 12.5 Status Audit and Offline Operation

Status changes made offline are audited locally with the same completeness as online status changes, in keeping with the offline audit discipline documented in SYSTEM_ARCHITECTURE Section 27.7. The local audit trail is synchronized with the central audit trail when connectivity is restored, with conflict resolution ensuring audit completeness. Status audit records are immutable, including offline status audit records; an offline status audit record cannot be modified before synchronization.

The offline status audit discipline is the architectural expression of Principle P11 (Offline-First as Default) applied to the status-code domain. A status change made offline must be auditable with the same completeness as a status change made online; the platform's audit completeness commitment is not relaxed for offline operation. The discipline ensures that the platform's audit trail is complete regardless of the operational mode in which the status change was made.

---

## 13. Related Documents

### 13.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-1 (Healthcare First), D-10 (Accountability) govern status code posture |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Status transition maps are configuration artefacts governed by the configuration lifecycle |
| PRODUCT_BIBLE.md | Section 28 (Offline Strategy) | Offline status changes and audit |
| PRODUCT_BIBLE.md | Section 31 (Security Philosophy) | Status change authorization and audit |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P3 (One Platform), P5 (Consistency), P11 (Offline-First), P13 (Auditability), P17 (Regional Adaptation), P18 (Decade-Horizon) govern status code posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Bounded contexts to which status codes are bound |
| SYSTEM_ARCHITECTURE.md | Section 16 (Workflow Engine Philosophy) | Workflow engine enforces transition maps |
| SYSTEM_ARCHITECTURE.md | Section 17 (State Management Philosophy) | State categories and consistency |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Status change audit records |
| CONFIGURATION_ARCHITECTURE.md | Section 8 (Configuration Lifecycle) | Transition map lifecycle |

### 13.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references status codes, the reference is to this document.

| Document | Relationship to Status Codes |
|---|---|
| TERMINOLOGY.md | Status codes are local extensions governed by TERMINOLOGY Section 3 |
| ENUMS.md | Status code enums are documented in ENUMS.md; transition semantics are documented here |
| BUSINESS_RULES.md | Business rules govern status transitions; transition conditions are business rules |
| CALCULATIONS.md | Calculations may consume status as input (e.g., aging of invoices by status) |
| CLINICAL_WORKFLOWS.md | Clinical workflows produce status transitions; transition maps are workflow definitions |
| CONFIGURATION.md | Transition maps are configuration artefacts |
| FEATURE_FLAGS.md | Feature flag lifecycle (FFL1–FFL5) is a status code |

### 13.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level status code usage and transition map implementation |
| docs/04_INTEGRATIONS/*.md | External system status code exchange and mapping |
| docs/06_DATABASE/*.md | Status code storage and indexing |
| docs/09_DEPLOYMENT/*.md | Status service deployment topology |
| docs/03_SECURITY/*.md | Status change authorization and audit |

### 13.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when a status code amendment, a transition map change, or an ADR requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification. Ibn Hayan's status code catalogue is a structural element of the platform's contract surface and is treated with the discipline that structural elements warrant.
