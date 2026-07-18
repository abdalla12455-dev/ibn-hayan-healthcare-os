# Ibn Hayan Healthcare Operating System
## Reception Module

| Field | Value |
|---|---|
| Document Title | Reception Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, reception operations leads, facility administrators, patient experience officers |
| Scope | Patient check-in, queue management, walk-in handling, visitor management, room assignment, transfer coordination, check-out, point-of-service payment collection, document handoff, and wayfinding assistance for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, appointment booking execution (owned by Scheduling module), patient registration execution (owned by Patients module), invoice generation (owned by Billing module) |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Patient Check-In
5. Queue Management
6. Walk-In Handling
7. Visitor Management
8. User Roles
9. Workflows
10. Data Models
11. Integrations
12. Configuration
13. Permissions
14. Reports
15. API Surface
16. Future Enhancements
17. Related Documents

---

## 1. Module Overview

### 1.1 Module Identity and Strategic Position

The Reception module (M14 in this documentation suite) is the front-desk operational engine of the Ibn Hayan Healthcare Operating System. Reception is not a separate bounded context in the canonical catalogue (SYSTEM_ARCHITECTURE Section 7.2); it is a cross-cutting operational capability that draws from the Scheduling bounded context (BC06) for appointment state, the Patient bounded context (BC01) for patient identity, and the Notifications bounded context (BC14) for queue state communication. The Reception module exposes a cohesive operational surface for reception staff by aggregating contracts from these underlying bounded contexts, without owning the underlying data.

Ibn Hayan treats reception as a first-class operational surface rather than as a peripheral utility, because the reception desk is the patient's first in-person touchpoint with the healthcare organization. This positioning has direct architectural consequences: the Reception module is the integration point where appointment state, patient identity, queue state, and payment collection converge into a single workflow surface; reception staff interact with this surface rather than with the underlying bounded contexts directly. The Reception module's contracts are aggregations of peer-module contracts, presented in a cohesive operational context.

### 1.2 Purpose and Business Value

The Reception module exists to manage the patient's physical presence in the healthcare facility, from arrival through departure, in a way that respects patient time, clinical workflow, and operational efficiency. Business value is realized through four mechanisms. First, check-in transforms an appointment booking into an operational visit, triggering the clinical workflow that produces care. Second, queue management minimizes patient wait time and surfaces bottlenecks for intervention, improving patient experience and operational throughput. Third, walk-in handling accommodates patients without prior appointments, ensuring that urgent and emergent needs are met regardless of scheduling status. Fourth, point-of-service payment collection captures co-pays and outstanding balances while the patient is present, improving collection rate and reducing billing follow-up cost.

For customers, the Reception module is the operational front door: a clinic that cannot manage reception cannot deliver care efficiently, regardless of clinical quality. For patients, the Reception module — through queue visibility, wayfinding assistance, and check-out coordination — shapes the patient's experience as a visitor to the healthcare facility. For regulators, the Reception module is the source of truth for visit-volume reporting, access-to-care metrics, and visitor tracking (where applicable).

The Reception module's business value is particularly evident in high-volume clinic types where reception throughput is the operational bottleneck. An emergency department that cannot check in patients rapidly cannot deliver timely care; an urgent care clinic that cannot manage walk-in volume cannot serve its patient population; a primary care clinic with a poorly managed queue produces patient dissatisfaction that drives attrition. Reception is therefore treated as a strategic operational capability in Ibn Hayan, not as a peripheral utility, and its performance is monitored through operational metrics that surface for executive review.

### 1.3 Bounded Context Alignment

The Reception module is a cross-cutting capability that draws from multiple bounded contexts rather than aligning one-to-one with a single bounded context. The Scheduling bounded context (BC06) provides appointment state, slot availability, and schedule context. The Patient bounded context (BC01) provides patient identity, demographics, and contact information. The Notifications bounded context (BC14) provides queue state communication through patient-preferred channels. The Reception module's own contracts are aggregations of these peer-module contracts, presented in a cohesive operational context for reception staff. The Reception module does not own any of the underlying data; it owns the operational surface that integrates peer-module data for reception workflows.

This cross-cutting alignment is deliberate. Reception is an operational function, not a domain responsibility; it does not have its own enduring domain model. Treating reception as a separate bounded context would produce a context that duplicates data owned by peer contexts, violating the bounded context ownership principle (SYSTEM_ARCHITECTURE Section 7.5). Treating reception as part of the Scheduling bounded context would conflate patient-booking concerns with patient-presence concerns, compromising the cohesion of each. The cross-cutting capability approach honors the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5) by keeping each bounded context cohesive while exposing an integrated operational surface for reception.

### 1.4 Module Composition

The Reception module is composed of the following capability areas, each elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: patient check-in, queue management, walk-in handling, visitor management, room assignment, transfer between departments, check-out, payment collection at desk, document handoff, and wayfinding assistance. The module does not own appointment booking, patient registration, invoice generation, or clinical care delivery; it owns the reception workflows that connect those modules operationally. The module participates in workflows owned by other modules through its published event and query contracts.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the patient's physical presence in the facility as the organizing concept; capabilities that do not share this organizing concept belong in other modules. Payment collection at desk, for example, is managed by the Reception module in terms of presenting the payment opportunity to the patient; the actual payment processing is owned by the Billing module, because payment processing is a financial transaction concern, not a reception workflow concern. This separation prevents the Reception module from accumulating financial execution logic that would compromise its contract stability over time.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The Reception module owns the patient's visit lifecycle from arrival through departure, for both scheduled appointments and walk-in visits. It owns check-in workflow — verifying patient identity, confirming appointment, capturing co-pay, updating appointment status to "arrived," and triggering the clinical workflow. It owns queue management — maintaining the queue of waiting patients, prioritizing by appointment time and clinical urgency, surfacing wait time estimates to patients and staff, and managing queue state transitions (waiting, called, in-room, completed). It owns walk-in handling — creating walk-in appointments, allocating providers and rooms from current availability, and integrating walk-ins into the queue.

The module also owns visitor management — tracking non-patient visitors (family members, vendors, contractors) where the facility requires visitor tracking. It owns room assignment — assigning patients to specific rooms for their visit, with room state managed in coordination with the Scheduling module's resource management. It owns transfer coordination — managing patient transfers between departments within a facility (from reception to imaging, from imaging to laboratory, from laboratory to clinical consult). It owns check-out workflow — finalizing the visit, scheduling follow-up appointments, collecting outstanding payments, and providing document handoff. It owns wayfinding assistance — providing directions to patients within the facility, with wayfinding content configurable per facility.

### 2.2 Out of Scope

The Reception module does not own appointment booking; this belongs to the Scheduling bounded context (BC06), with the Reception module consuming appointment state through query contracts. It does not own patient registration; this belongs to the Patient bounded context (BC01), with the Reception module triggering registration through the Patients module's command contracts when a walk-in patient is not yet registered. It does not own invoice generation or payment processing; this belongs to the Billing bounded context (BC07), with the Reception module triggering payment capture through the Billing module's command contracts. It does not own clinical care delivery, clinical documentation, or clinical decision-making; these belong to the clinical bounded contexts (BC02, BC03, BC04).

The module also does not own notification dispatch (that belongs to the Notifications bounded context), audit storage (that belongs to the Audit bounded context), or facility access control (that belongs to the Identity & Access bounded context for staff access and to the Patients module's portal authentication for patient portal access). The Reception module publishes events that peer modules consume and consumes events that peer modules publish, but it does not own the underlying data.

### 2.3 Visit as Operational Bridge

The visit is the operational bridge between appointment booking and clinical care in the Ibn Hayan platform. A booked appointment is a future commitment; a visit is the present-tense realization of that commitment. The Reception module owns the visit lifecycle, transforming an appointment booking into an operational visit through check-in, managing the visit through queue and room state, and finalizing the visit through check-out. Every encounter in the platform begins as a visit managed by the Reception module.

This central positioning imposes responsibilities on the Reception module. The module's state must be strongly consistent within a visit, because inconsistent visit state produces clinical workflow errors (a patient marked as arrived who is not actually present, a room marked as occupied that is actually available). The module's contracts must be fast, because reception workflows are real-time and user-facing; a check-in that takes more than a few seconds degrades the reception experience and produces queue backup. The module's audit must be complete, because visit state has downstream clinical and financial consequences that must be traceable.

The visit lifecycle intersects with the appointment lifecycle and the encounter lifecycle, but it is distinct from both. An appointment may exist without a visit (a booking that the patient did not attend, recorded as a no-show). An encounter may exist without a visit (a telehealth encounter conducted remotely). A visit always involves a patient's physical presence at the facility, and it is this physical presence that the Reception module tracks. The distinction is enforced through the visit state model, which is independent of the appointment state model and the encounter state model, with state transitions coordinated through events but not merged into a single state machine.

### 2.4 Multi-Facility Reception

Reception operations are facility-scoped by default. A receptionist at facility A manages visits at facility A, with no visibility into facility B's queue or room state unless explicitly authorized. Multi-facility tenants maintain separate reception operations per facility, reflecting the operational reality that reception is a physical-presence workflow that cannot be centralized across geographically separate facilities. Cross-facility reception visibility is configurable for tenants with multi-facility operations under shared administration — a reception manager may have read access across facilities for operational oversight, but write access remains facility-scoped.

Multi-facility reception scoping honors Principle P10 (Multi-Tenancy as Default, SYSTEM_ARCHITECTURE Section 4.10) at the facility level, ensuring that reception staff at one facility cannot inadvertently affect operations at another. The scoping is enforced at the contract level; a receptionist's queries are scoped to their facility, and commands that would affect another facility are rejected at validation time.

---

## 3. Key Features

### 3.1 Patient Check-In

Patient check-in transforms an appointment booking into an operational visit. The check-in workflow verifies the patient's identity (using the verification mechanisms configured for the appointment type), confirms the appointment details (provider, time, purpose), captures the co-pay (where applicable, through the Billing module's command contracts), updates the appointment status to "arrived" (through the Scheduling module's command contracts), and adds the patient to the queue (through the Reception module's own queue management). Check-in is the most frequent reception workflow and is optimized for speed and accuracy.

Check-in optimization is a continuous operational concern, because check-in is the gateway to clinical care and any delay propagates to the entire visit. The Reception module's check-in workflow is designed to complete in under a minute for routine cases, with the workflow's critical path (identity verification, appointment confirmation, queue entry) optimized for speed and the non-critical path (co-pay capture, document preparation) performed in parallel where possible. Check-in performance is monitored as a module health metric, with sustained slowdowns triggering operational investigation into the underlying cause.

### 3.2 Queue Management

Queue management maintains the queue of waiting patients, with prioritization by appointment time, clinical urgency, and visit type. The queue is presented to reception staff (for queue management), to clinical staff (for patient call), and to patients (for wait time estimation, through patient-preferred channels via the Notifications module). Queue state transitions — waiting, called, in-room, completed, no-show — are tracked in real time, with transition events published for consumption by peer modules (especially the Scheduling module, for no-show recording).

### 3.3 Walk-In Handling

Walk-in handling accommodates patients without prior appointments, creating a walk-in appointment at the time of arrival. The walk-in workflow verifies the patient's identity (or triggers registration if the patient is not yet registered), allocates a provider and room from current availability (querying the Scheduling module for slot availability), creates a walk-in appointment, and adds the patient to the queue. Walk-in handling is essential for clinic types with significant unscheduled demand — urgent care, emergency, primary care walk-in.

### 3.4 Visitor Management

Visitor management tracks non-patient visitors to the facility — family members accompanying patients, vendors delivering supplies, contractors performing maintenance, researchers conducting studies. Visitor tracking includes visitor identity, visit purpose, host (the patient or staff member being visited), arrival time, departure time, and any access credentials issued (badges, key cards). Visitor management is configurable per facility — some facilities require visitor tracking for security or regulatory compliance, others do not.

### 3.5 Room Assignment

Room assignment allocates patients to specific rooms for their visit, with room state managed in coordination with the Scheduling module's resource management. Room assignment considers room availability, room type (examination room, procedure room, consultation room), room equipment (specific equipment required for the visit), and room cleanliness status (rooms being cleaned are not available). Room state transitions — available, assigned, occupied, being cleaned — are tracked in real time, with transitions visible to reception and clinical staff.

### 3.6 Transfer Between Departments

Transfer coordination manages patient transfers between departments within a facility — from reception to imaging, from imaging to laboratory, from laboratory to clinical consult. A transfer updates the patient's location, notifies the receiving department, and updates the queue state. Transfers are tracked for operational analysis (transfer wait time, transfer completion rate) and for patient experience (a transfer that exceeds the expected time triggers follow-up). Multi-department visits are common in specialty clinics and diagnostic centres.

### 3.7 Check-Out

Check-out finalizes the visit, with workflow steps including follow-up appointment scheduling (through the Scheduling module's command contracts), outstanding payment collection (through the Billing module's command contracts), document handoff (providing the patient with visit summaries, instructions, prescriptions), and visit status finalization. Check-out is the patient's last touchpoint with the facility during the visit and is optimized for completeness — a visit that is not properly checked out may produce downstream billing and follow-up gaps.

Check-out completeness is monitored as an operational metric, with visits that close without completing all check-out steps flagged for follow-up. The check-out workflow is designed to surface outstanding items before the patient leaves the facility — if the patient has an outstanding balance, the workflow surfaces it for collection; if the patient is due for a follow-up appointment, the workflow surfaces it for scheduling; if the patient has unread results, the workflow surfaces them for review. This proactive surfacing at check-out produces better operational outcomes than reactive follow-up after the patient has left.

### 3.8 Payment Collection at Desk

Payment collection at desk captures co-pays, outstanding balances, and self-pay amounts while the patient is present at the reception desk. Payment capture is performed through the Billing module's command contracts, with the Reception module presenting the payment opportunity to the patient and triggering the capture. Payment collection at desk is the highest-collection-rate channel for patient financial responsibility — patients are most likely to pay when the payment request is made in person and the service is being delivered.

### 3.9 Document Handoff

Document handoff provides the patient with visit-related documents at check-out — visit summary, after-visit instructions, prescription orders, referral letters, patient education materials. Documents are sourced from peer modules (visit summary from the Encounter module, prescriptions from the Pharmacy module, referrals from the Clinical Documentation module) and are presented to the patient through the patient's preferred delivery channel (printed, emailed, posted to patient portal). Document handoff is configurable per clinic type and per visit type.

Document handoff is operationally important because it closes the visit loop for the patient — a patient who leaves the facility without their visit documents may not follow through on instructions, may not fill prescriptions, may not attend referral appointments. Document handoff is tracked for completion, with visits that close without document handoff flagged for follow-up. The handoff workflow is optimized for the patient's preferred delivery channel — patients who prefer electronic delivery receive documents through the patient portal or email, patients who prefer printed delivery receive printed copies at check-out, with the workflow respecting the preference without requiring the receptionist to ask.

### 3.10 Wayfinding Assistance

Wayfinding assistance provides directions to patients within the facility — to the assigned room, to the laboratory, to the imaging centre, to the pharmacy, to the exit. Wayfinding content is configurable per facility, with content including facility maps, turn-by-turn directions, and accessibility-compliant routing (wheelchair-accessible paths, elevator directions, accessible entrance directions). Wayfinding is delivered through the patient's preferred channel (printed map, portal message, facility display screen).

Wayfinding is a small but operationally significant capability — patients who cannot find their destination experience longer wait times, miss appointments, and report lower satisfaction. Wayfinding content is maintained by facility administration, with content updates triggered by facility layout changes (renovations, signage updates, room relocations). Wayfinding is particularly important for large facilities (hospitals, multi-specialty clinics) and for clinics serving populations with wayfinding challenges (elderly patients, patients with cognitive impairments, patients who do not speak the facility's primary language).

---

## 4. Patient Check-In

### 4.1 Check-In Workflow

The check-in workflow transforms an appointment booking into an operational visit through a sequence of steps: patient identification (lookup by name, date of birth, or appointment identifier), appointment confirmation (verifying the patient has an appointment at the current time), identity verification (per the verification strictness configured for the appointment type), co-pay capture (where applicable, through the Billing module), appointment status update (through the Scheduling module, marking the appointment as "arrived"), and queue entry (adding the patient to the queue for the provider or room). The workflow is optimized for speed — a routine check-in should complete in under a minute — and for accuracy, with each step validated before proceeding.

### 4.2 Identity Verification at Check-In

Identity verification at check-in confirms that the person presenting is the patient named on the appointment. Verification strictness is configurable per appointment type — a routine follow-up may require only name and date of birth confirmation, while a procedure may require government-issued identification. Verification outcomes are recorded on the visit record and are visible to clinical staff, supporting clinical safety (a provider seeing the patient can confirm that identity was verified at check-in). Verification failures are surfaced for resolution — a patient whose identity cannot be verified may be asked to provide additional identification or may be referred to the supervisor.

### 4.3 Co-Pay Capture at Check-In

Co-pay capture at check-in collects the patient's co-payment before the visit begins, with the co-pay amount determined by the patient's insurance plan configuration. The Reception module queries the Billing module for the co-pay amount (based on the patient's coverage and the appointment type), presents the amount to the patient, and triggers payment capture through the Billing module's command contracts. Co-pay capture at check-in produces the highest collection rate for patient financial responsibility — patients are most likely to pay when the request is made in person before service delivery.

### 4.4 Self-Service Check-In

Self-service check-in allows patients to check themselves in through a kiosk or through the patient portal, without receptionist assistance. Self-service check-in is configurable per facility and per appointment type — routine follow-ups may be eligible for self-service, while new patient appointments may require receptionist assistance. Self-service check-in follows the same workflow as receptionist-assisted check-in (identification, confirmation, verification, co-pay, queue entry), with the workflow automated through the patient-facing surface. Self-service check-in reduces reception workload and is increasingly expected by patients, particularly in high-volume clinics.

Self-service check-in requires careful configuration of identity verification strictness — too strict, and patients cannot complete the workflow without receptionist intervention; too lax, and the verification safeguard is compromised. The default verification strictness for self-service is higher than for receptionist-assisted check-in, because the receptionist provides an additional verification layer through visual identification. Self-service check-in failures are surfaced to reception staff for assistance, ensuring that patients who cannot complete the self-service workflow are not stranded. Self-service adoption is monitored as an operational metric, with low adoption triggering investigation into the workflow's usability.

---

## 5. Queue Management

### 5.1 Queue State Model

The queue state model tracks each patient's progression through the visit: waiting (patient has checked in and is waiting to be called), called (the provider has called the patient and is waiting for the patient to proceed to the room), in-room (the patient is in the room with the provider), in-transfer (the patient is moving between departments), completed (the visit is complete and the patient has checked out), and no-show (the patient did not proceed with the visit). Queue state transitions are tracked in real time, with each transition recorded for operational analysis and audit.

### 5.2 Queue Prioritization

Queue prioritization determines the order in which waiting patients are called, with prioritization factors including appointment time (earlier appointments called first), clinical urgency (urgent appointments prioritized over routine), visit type (procedures may be prioritized over consultations to optimize room utilization), and patient factors (patients with mobility limitations may be prioritized to reduce waiting discomfort). Prioritization rules are configurable per clinic type, per provider, and per facility, with rules validated for fairness and operational efficiency.

### 5.3 Wait Time Estimation

Wait time estimation provides patients and staff with an estimate of how long a waiting patient will wait before being called. Estimation is based on the current queue length, the average wait time for the clinic type, the provider's historical wait time performance, and the current operational conditions (delays due to emergencies, provider running behind). Estimation is presented to patients through patient-preferred channels (queue display, portal message, SMS) and is updated as conditions change. Estimation accuracy is monitored — consistently inaccurate estimates indicate a need for estimation model refinement.

### 5.4 Queue State Communication

Queue state communication informs patients of their queue position and expected wait time through their preferred channels — queue display in the waiting room, portal message, SMS, or audio announcement. Communication is coordinated through the Notifications module, with the Reception module publishing queue state events and the Notifications module dispatching communications through configured channels. Communication respects patient privacy — queue displays use anonymized identifiers (queue numbers, not patient names) in public areas, with patient names displayed only on patient-facing surfaces (portal, SMS).

Queue state communication is a primary driver of patient experience during the waiting period. A patient who is informed of their queue position and expected wait time experiences the wait differently from a patient who is uninformed; the perceived wait is shorter, and the patient is less likely to leave without being seen (left-without-being-seen events are a key operational metric for high-volume clinics). Queue state communication is configured per clinic type and per patient preference, with patients who have opted out of SMS or portal notifications receiving queue updates through queue displays or audio announcements only.

---

## 6. Walk-In Handling

### 6.1 Walk-In Workflow

The walk-in workflow accommodates patients without prior appointments. The workflow verifies the patient's identity (or triggers registration through the Patients module if the patient is not yet registered), determines the reason for the walk-in (chief complaint, urgency level), allocates a provider and room from current availability (querying the Scheduling module for slot availability), creates a walk-in appointment (through the Scheduling module's command contracts), and adds the patient to the queue. Walk-in handling is essential for clinic types with significant unscheduled demand and is optimized for speed — a walk-in patient in distress cannot wait for an extended check-in process.

### 6.2 Triage Integration

Triage integration handles walk-in patients whose clinical urgency requires immediate assessment. A triage walk-in is routed to the triage workflow (owned by the Encounter module), which performs rapid clinical assessment and assigns the patient to the appropriate care pathway (immediate care, urgent care, routine care, referral to emergency department). Triage integration is essential for urgent care clinics, emergency departments, and primary care walk-in clinics. The Reception module's role in triage is to recognize the clinical urgency and route the patient to the triage workflow; the clinical assessment itself is owned by the Encounter module.

Triage integration is the operational expression of Principle P1 (Healthcare Safety Overrides All Others, SYSTEM_ARCHITECTURE Section 4.2) applied to reception. A patient in clinical distress cannot wait for the standard reception workflow; the Reception module's triage integration recognizes this and short-circuits the standard workflow, with the patient routed to clinical assessment before administrative tasks (registration, insurance verification, co-pay collection) are completed. The administrative tasks are completed after the patient's clinical situation is stabilized, with the workflow supporting retrospective registration and deferred payment collection. This short-circuit is documented and audited, with the triage routing recorded for operational analysis and regulatory reporting.

### 6.3 Walk-In Capacity Management

Walk-in capacity management monitors the facility's ability to accommodate walk-in patients, with capacity determined by current provider availability, room availability, and queue depth. When capacity is exceeded, walk-in patients may be redirected to another facility, asked to wait for an extended period, or referred to emergency services (for clinical urgencies that cannot wait). Capacity management is configurable per facility, with capacity thresholds set based on the facility's operational profile. Walk-in capacity data is published for operational reporting and for patient-facing capacity indicators (where the facility exposes walk-in wait times publicly).

### 6.4 Walk-In to Appointment Conversion

Walk-in to appointment conversion encourages walk-in patients to book future appointments, improving ongoing care continuity and reducing future walk-in demand. The conversion workflow offers the patient the opportunity to book a follow-up appointment before leaving the facility, with the booking performed through the Scheduling module's command contracts. Conversion rates are tracked for operational analysis — a high walk-in rate with low conversion rate may indicate that the facility's appointment booking process is too complex or that the patient population prefers walk-in care.

Conversion is particularly important for chronic care management — a walk-in patient with a chronic condition who does not convert to appointment-based care will continue to access care through walk-in, which is less efficient for the facility and which produces fragmented care for the patient. The conversion workflow surfaces the patient's care history and care gaps at check-out, supporting the receptionist's conversation about follow-up appointments. Conversion is also important for population health — patients who convert to appointment-based care receive preventive care and chronic disease management that they would not receive through episodic walk-in visits.

---

## 7. Visitor Management

### 7.1 Visitor Tracking

Visitor tracking records non-patient visitors to the facility — family members accompanying patients, vendors delivering supplies, contractors performing maintenance, researchers conducting studies. Visitor tracking captures visitor identity (name, organization, contact information), visit purpose, host (the patient or staff member being visited), arrival time, departure time, and any access credentials issued (badges, key cards). Visitor tracking is configurable per facility — some facilities require visitor tracking for security or regulatory compliance, others do not. Where required, visitor tracking is enforced at facility entry, with visitors unable to proceed past reception without completing the tracking workflow.

Visitor tracking in Ibn Hayan is designed to be minimally intrusive while meeting the facility's security and regulatory requirements. The tracking workflow captures only the information required by the facility's configuration — a facility with minimal visitor tracking requirements may capture only visitor name and host, while a facility with comprehensive requirements may capture visitor identity verification, vehicle information, and escorted-vs-unescorted status. The tracking surface is optimized for speed, because visitor tracking that takes too long produces queues at facility entry and encourages visitors to bypass the tracking workflow.

### 7.2 Access Credential Issuance

Access credential issuance provides visitors with badges or key cards that grant access to facility areas appropriate to their visit purpose. A vendor delivering supplies may receive a badge granting access to the loading dock and the supply room; a family member visiting a patient may receive a badge granting access to the patient's room and the visitor waiting area. Access credentials are time-bounded (expiring at the visitor's expected departure time) and are returned at check-out. Access credential issuance is coordinated with the Identity & Access module's facility access control, with the Reception module issuing the credential and the Identity & Access module enforcing access at facility access points.

### 7.3 Visitor Sign-Out

Visitor sign-out records the visitor's departure, with the sign-out workflow collecting the visitor's access credential, recording the departure time, and updating the visitor tracking record. Sign-out is enforced at facility exit, with visitors reminded to sign out through facility signage and through staff prompts. Visitors who do not sign out are flagged for follow-up, with the flag triggering an operational check (the visitor may have left without signing out, or may still be in the facility). Visitor sign-out data is used for visitor activity analysis, for security incident investigation, and for regulatory reporting where required.

### 7.4 Visitor Privacy

Visitor privacy governs the handling of visitor tracking data, with privacy rules configurable per facility and per regulatory framework. Visitor data is subject to general data protection regulations; it is not generally subject to healthcare-specific privacy regulations unless the visitor is also a patient. Visitor data is retained per the facility's retention policy, with retention periods typically shorter than for patient data. Visitor data is access-controlled, with access restricted to facility administration and to compliance officers for regulatory review. Visitor data is not shared across facilities without explicit authorization, honoring the multi-tenant isolation principle (Principle P10, SYSTEM_ARCHITECTURE Section 4.10) at the facility level.

Visitor privacy extends to the visitor's relationship with the patient they are visiting. A visitor's presence at the facility may reveal information about the patient's clinical situation (a visitor to an oncology ward reveals that the patient has cancer). The Reception module's visitor tracking capability is configured to minimize this incidental disclosure — visitor records are not linked to patient clinical records except through the patient's identity, and access to visitor records is restricted to roles that already have access to the patient's clinical record. This configuration honors the patient privacy commitments in PRODUCT_BIBLE Section 25 and the regulatory framework in force for the tenant's region.

---

## 8. User Roles

### 8.1 Roles That Interact with Reception

The following roles interact with reception through the Reception module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2.

| Role Code | Role | Typical Reception-Related Responsibilities |
|---|---|---|
| R01 | Physician | View queue, call patients, mark visit complete |
| R02 | Nurse | View queue, call patients, room management |
| R05 | Allied health professional | View queue, call patients |
| R06 | Receptionist | Check-in, queue management, payment collection, check-out |
| R07 | Scheduler | View schedule, manage walk-in allocation |
| R09 | Administrator | Reception oversight, visitor management, queue analytics |
| R10 | Compliance officer | Audit review of reception actions, visitor tracking audit |
| R13 | System administrator | Tenant configuration of reception behaviour |
| R14 | Integration account | System-to-system visitor and queue sync |

### 8.2 Permission Categories

Permissions on reception resources are defined at the action level on the reception resource, per PRODUCT_BIBLE Section 21.2. Read permissions include viewing queue, viewing room state, viewing visitor tracking, viewing visit status. Write permissions include check-in, queue management, room assignment, visitor tracking, transfer coordination, check-out. Execute permissions include payment capture, document handoff. Administer permissions include configuring queue prioritization rules, configuring visitor tracking requirements, configuring check-in workflow.

### 8.3 Reception Authority

Reception authority governs who may perform reception actions that have operational or financial consequences — check-in (which triggers clinical workflow), payment collection (which captures patient financial responsibility), check-out (which finalizes the visit), and visitor access credential issuance (which grants facility access). Authority is granted selectively — typically to the receptionist role and to operational roles (administrator, scheduler) — and is recorded with the action, the actor, and the authorization basis. Reception authority is governed by the Identity & Access module's contracts, with the Reception module enforcing the authority scope and recording the audit event.

Reception authority is particularly consequential for payment collection and access credential issuance, because these actions have direct financial and security consequences. A receptionist who collects a payment must be authorized to handle patient funds, with the authorization subject to segregation-of-duty controls (the user who collects a payment cannot be the user who reconciles the deposit). A receptionist who issues an access credential must be authorized to grant facility access, with the authorization subject to facility security policy. Authority grants are reviewed periodically by the compliance officer, with frequent authority changes triggering investigation into the underlying operational processes that necessitate them.

---

## 9. Workflows

### 9.1 Workflows the Module Triggers

The Reception module triggers workflows in response to visit lifecycle events. Check-in triggers appointment status update (via the Scheduling module), co-pay capture (via the Billing module), and queue entry. Walk-in arrival triggers appointment creation (via the Scheduling module), patient registration (via the Patients module if not registered), and queue entry. Transfer triggers location update, receiving department notification, and queue state update. Check-out triggers follow-up appointment scheduling (via the Scheduling module), outstanding payment collection (via the Billing module), document handoff (via the Notifications module for delivery), and visit status finalization. No-show detection triggers no-show recording (via the Scheduling module).

### 9.2 Workflows the Module Participates In

The Reception module participates in workflows owned by other modules by responding to queries and by consuming events. The Scheduling module notifies the Reception module of appointment status changes (cancellations, reschedules) that affect the queue. The Patients module provides patient identity, demographics, and contact information at check-in. The Billing module provides co-pay amounts and outstanding balance information at check-in and check-out. The Encounter module notifies the Reception module of visit completion, triggering check-out workflow. The Notifications module consumes queue state events and dispatches queue communications through patient-preferred channels.

### 9.3 Audit Events Generated

The Reception module generates audit events for every consequential action, in keeping with the audit architecture defined in SYSTEM_ARCHITECTURE Section 27. Audit events include check-in, check-out, queue state transition, walk-in creation, transfer, room assignment, visitor tracking entry, visitor sign-out, access credential issuance, access credential return, payment collection at desk, and document handoff. Every audit event includes the actor, the action, the resource, the tenant, the scope, the previous state, the new state, the authorization basis, the result, and the context, per the audit record structure in SYSTEM_ARCHITECTURE Section 27.4.

Reception audit events are particularly important for visit-volume reporting, access-to-care metrics, and visitor tracking compliance. Every visit is traceable from check-in through queue progression to check-out, with the audit trail supporting operational analysis and regulatory reporting. Visitor tracking audit records are subject to regulatory scrutiny in facilities where visitor tracking is mandated, with the audit trail supporting regulatory verification. Reception audit records are immutable, append-only, and tamper-evident, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

The Reception module's audit events also support incident investigation — a patient complaint about wait time can be investigated by reconstructing the visit's queue progression through the audit trail; a security incident involving a visitor can be investigated by reconstructing the visitor's presence at the facility through visitor tracking audit records. The audit trail's completeness is the operational expression of Principle P13 (Auditability as Primitive, SYSTEM_ARCHITECTURE Section 4.13) applied to reception operations.

---

## 10. Data Models

### 10.1 Core Entities

The Reception module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Visit | The canonical visit entity (patient's presence at the facility) |
| Check-In | The check-in record for a visit |
| Check-Out | The check-out record for a visit |
| Queue Entry | A patient's entry in the facility queue |
| Waiting Room State | The state of the facility's waiting room |
| Walk-In | A walk-in visit record |
| Transfer | A patient transfer between departments |

### 10.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Room Assignment record documents the patient's room allocation. The Visitor Record captures non-patient visitor tracking data. The Access Credential record documents credentials issued to visitors. The Wayfinding Direction record provides directions for a specific patient journey within the facility. The Queue State Transition record documents each queue state change. The Document Handoff record documents documents provided to the patient at check-out.

### 10.3 Entity Relationships

Core entities relate to the Visit entity as the central reception object. A Visit references a Patient (owned by the Patients module) and an Appointment (owned by the Scheduling module). A Check-In references a Visit. A Check-Out references a Visit. A Queue Entry references a Visit. A Waiting Room State references multiple Queue Entries. A Walk-In references a Visit (with the visit created through a walk-in workflow). A Transfer references a Visit and documents the source and destination departments. References to peer-module entities are logical identifiers, not direct data-store references (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8).

The Visit entity is the aggregate root for the Reception module's data, even though the underlying patient and appointment data is owned by peer modules. The Visit owns the reception-specific state — check-in record, queue entries, room assignments, transfer records, check-out record — and references the peer-module entities through logical identifiers. This aggregate boundary ensures that reception-related state changes are atomic — a check-in either completes successfully (with all reception-side state created consistently) or fails completely (with no partial state left behind). Atomicity is critical for operational correctness: a partial check-in that created a queue entry but did not update the appointment status would produce a patient in the queue who the system does not recognize as arrived, blocking downstream clinical workflow.

---

## 11. Integrations

### 11.1 Peer Module Integrations

The Reception module integrates with peer modules through published contracts. The Patients module is queried for patient identity at check-in and is notified of patient registration needs for walk-in patients. The Scheduling module is queried for appointment state at check-in and is updated with appointment status changes (arrived, completed, no-show). The Scheduling module is also queried for slot availability for walk-in allocation. The Billing module is queried for co-pay amounts and outstanding balances and is triggered for payment capture. The Encounter module notifies the Reception module of visit completion, triggering check-out workflow. The Notifications module consumes queue state events and dispatches queue communications. The Reporting module consumes visit data for operational and analytical reports.

### 11.2 External System Integrations

External system integrations are mediated by the Integration module (deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the Reception module's contracts through integration adapters that align with healthcare reception interoperability patterns — queue state exchange with external patient flow systems, visitor tracking integration with facility access control systems, and wayfinding integration with facility mapping systems. The Reception module is not aware of the specific external systems; it is aware only of the Integration module's contracts.

### 11.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Synchronous command is used for check-in, check-out, and payment capture where immediate confirmation is required. Synchronous query is used for appointment state, queue state, and patient identity lookup. Asynchronous event is used for visit lifecycle events (check-in, check-out, transfer) that peer modules consume. The outbox pattern is used for queue state events, ensuring that queue communications are dispatched even in the presence of transient failures. Anticorruption layers translate between external system models and the Ibn Hayan reception model, preventing external model leakage per the context relationship pattern in SYSTEM_ARCHITECTURE Section 7.3.

The Reception module's integration patterns are particularly important for real-time performance, because reception workflows are user-facing and have low latency tolerance. Synchronous commands to peer modules (Scheduling, Patients, Billing) must complete in under a few seconds to maintain the receptionist's workflow pace; commands that take longer degrade the reception experience and produce queue backup. The module's contracts are designed for this latency tolerance, with command scope minimized to the essential state changes and with bulk operations (e.g., batch check-in for group appointments) supported where they reduce per-patient latency.

---

## 12. Configuration

### 12.1 Configuration Categories

The Reception module's configuration surface is organized into the categories defined in MODULE_ARCHITECTURE Section 10.3. Behavioural configuration includes check-in workflow definitions, queue prioritization rules, walk-in capacity thresholds, visitor tracking requirements, and check-out workflow definitions. Structural configuration includes feature flags for capabilities like self-service check-in, walk-in handling, and visitor management. Integration configuration includes external patient flow system endpoints and facility access control system endpoints. Localization configuration includes wayfinding content per facility, queue communication templates in multiple languages, and regional visitor tracking compliance rules. Security configuration includes reception authority scoping, access credential issuance authority, and visitor data access scoping. Regulatory configuration includes visitor tracking retention policies, visit data retention policies, and regulatory reporting templates.

### 12.2 Tenant-Configurable vs Platform-Configurable

The configuration surface distinguishes between tenant-configurable categories and platform-configurable categories, per MODULE_ARCHITECTURE Section 10.3. Tenant-configurable categories include check-in workflow defaults, queue prioritization rules, visitor tracking requirements, and wayfinding content; these may be overridden by tenant administrators within validation constraints. Platform-configurable categories include the visit state machine, the queue state model, the audit record structure, and the multi-tenant isolation rules; these are reserved for the platform and may not be overridden by tenants. The distinction is enforced by the Configuration module's service and is part of the configuration schema published by the Reception module.

### 12.3 Configuration Governance

Configuration governance follows the framework defined in MODULE_ARCHITECTURE Section 10.5 and SYSTEM_ARCHITECTURE Section 8.7. Every configuration change is validated before application, audited on application, reversible through rollback, and reviewable through the audit trail. Changes that affect operational efficiency — for example, a change to queue prioritization rules that might affect patient wait times — require operational review. Changes that affect regulatory compliance — for example, a change to visitor tracking requirements — require compliance officer review. Changes that affect patient experience — for example, a change to check-in workflow that might affect reception throughput — require operational review. The governance posture is documented in the module's configuration schema and is reviewed at architectural review.

The Reception module's configuration governance is particularly consequential for visitor tracking and access credential issuance, which are subject to facility security and regulatory requirements. A configuration change that compromises visitor tracking integrity — for example, a change that disables visitor sign-out enforcement — may produce security incidents and regulatory violations. The module's configuration schema marks such changes as requiring architectural review, with the review conducted by the Architecture Council rather than by tenant administrators alone. This is the operational expression of Principle P1 (Healthcare Safety Overrides All Others) and Principle P13 (Auditability as Primitive) applied to reception configuration.

---

## 13. Permissions

### 13.1 Action-Level Permissions on Reception Resources

Permissions are defined at the action level on the reception resource, per PRODUCT_BIBLE Section 21.2. The permission matrix includes read, write, execute, and administer actions on visit, queue, room assignment, visitor tracking, and transfer resources. The matrix is large but stable. Direct user-permission assignment is forbidden; permissions are assigned through roles, per PRODUCT_BIBLE Section 21.3.

### 13.2 Scoping Rules

Permissions are scoped, not global, per PRODUCT_BIBLE Section 21.4. A receptionist may have write permission on visits at their facility without having write permission on visits at another facility. Scoping is by organizational unit, by facility, by department, and by care team. Scoping is enforced at the action level; a receptionist without write permission on a specific visit cannot modify that visit through any surface. Multi-facility reception visibility is configurable for reception managers, with read access across facilities for operational oversight but write access remaining facility-scoped.

### 13.3 Permission Inheritance

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 6.6 and PRODUCT_BIBLE Section 21.5. Inheritance is explicit, documented, and auditable; it is not automatic. A role assigned at the organization level does not automatically propagate to lower levels; the role must be explicitly scoped to apply at lower levels, preventing accidental over-permissioning through inheritance misconfiguration. Reception authority is layered on top of inheritance, with specific reception actions (payment collection, access credential issuance) requiring explicit authority grants that are not implied by general facility-level permissions.

The Reception module's permission model includes a specific carve-out for cross-coverage scenarios, where a receptionist from one facility may temporarily cover reception at another facility (during staff shortages, training, or peak demand). Cross-coverage authority is granted explicitly, time-bounded, and audited, with the granting recorded with the granter, the recipient, the scope, and the duration. Cross-coverage authority expires automatically at the configured end time, preventing lingering authority from producing unauthorized access after the coverage need has passed. Cross-coverage is the operational expression of the emergency access model (PRODUCT_BIBLE Section 21.6) applied to reception operations.

---

## 14. Reports

### 14.1 Operational Reports

Operational reports surface reception activity for daily operational management. Reports include daily check-in volume, queue length and wait time, walk-in volume and conversion rate, room utilization, visitor tracking volume, and check-out completion rate. Operational reports are generated through the Reporting module's contracts, with the Reception module providing the underlying data. Reports are typically consumed by reception managers, facility administrators, and operations leads for day-to-day decisions.

### 14.2 Analytical Reports

Analytical reports surface reception trends for strategic planning. Reports include patient wait time trends, peak hour analysis, receptionist productivity, walk-in pattern analysis, and visitor activity trends. Analytical reports are generated through the Reporting module's analytical pipeline, with reception data aggregated over time and across facilities.

### 14.3 Regulatory Reports

Regulatory reports surface reception-related compliance evidence. Reports include visitor tracking audit (for facilities where visitor tracking is mandated), access-to-care metrics (wait times for urgent and emergent visits), and check-in accuracy audit (verifying that identity verification was performed at check-in). Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8.

Regulatory reporting for reception operations varies significantly by region and by clinic type. A tenant operating a hospital in a regulated jurisdiction may be required to report visitor tracking data for security compliance; a tenant operating a primary care clinic in a region with access-to-care standards may be required to report wait time metrics; a tenant operating an emergency department may be required to report triage wait times for regulatory monitoring. The Reception module's regulatory report templates are configurable per region through the Localization module's configuration surface, with templates aligned to the regional regulatory framework in force for the tenant.

---

## 15. API Surface

### 15.1 Contract Categories

The Reception module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the Reception module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 15.2 Command Contracts

Command contracts are requests to perform an action that changes visit state. Examples include CheckIn, CheckOut, AddToQueue, UpdateQueueState, AssignRoom, CreateWalkIn, TransferPatient, RecordVisitor, IssueAccessCredential, ReturnAccessCredential, CapturePaymentAtDesk, HandoffDocuments. Commands are synchronous where the caller requires immediate confirmation, asynchronous where the caller does not. Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the audit trail. Commands are idempotent where the operation supports idempotency.

### 15.3 Query Contracts

Query contracts are requests to retrieve visit state without changing it. Examples include GetVisit, GetQueueState, GetRoomAvailability, GetVisitorRecord, GetWaitTimeEstimate, GetWalkInCapacity. Queries are synchronous, returning the requested state or a not-found response. Queries are scoped to the caller's authority — a caller without read permission on a visit receives a not-found response rather than the visit's data.

### 15.4 Event Contracts

Event contracts are notifications that something has happened in the Reception module. Examples include PatientCheckedIn, PatientCheckedOut, QueueStateChanged, WalkInCreated, PatientTransferred, RoomAssigned, VisitorArrived, VisitorDeparted, PaymentCapturedAtDesk, DocumentsHandedOff. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which peer modules maintain their local projections of visit state.

### 15.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the Reception module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy.

The Reception module's configuration schema is published as part of the module's contract surface and is consumed by tenant administrators and by the Configuration module's service for validation. The schema distinguishes between configuration keys that are tenant-configurable (e.g., check-in workflow defaults, queue prioritization rules) and configuration keys that are platform-configurable (e.g., visit state machine invariants, audit record structure), with the distinction enforced by the Configuration module's service. A configuration change that attempts to modify a platform-configurable key is rejected at validation time, with the rejection recorded in the audit trail.

---

## 16. Future Enhancements

### 16.1 Extension Points

The Reception module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom check-in workflow steps (for clinics whose check-in requirements exceed the platform default), custom queue prioritization rules (for clinics whose prioritization needs are non-standard), custom visitor tracking fields (for facilities whose tracking requirements exceed the platform default), and custom wayfinding content (for facilities whose layouts are non-standard). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

Extension points in the Reception module are governed by the same lifecycle as platform features: defined, active, deprecated, retired. An extension point that has been deprecated is supported through a transition window, after which it is retired. Customers using a deprecated extension point are notified through the platform's change-management channel and are supported in migrating to the successor extension point or to platform-native capability. The lifecycle governance prevents extension point accumulation, which would otherwise compromise the module's contract stability over time and would complicate the receptionist's user experience with too many variations across clinics.

### 16.2 Module Lifecycle

The Reception module is at the General Availability stage of the module lifecycle (LC3, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6), progressing toward Mature. The module has been in General Availability since the platform's initial release. The module's contracts are stable; breaking changes follow the platform's deprecation policy, with old contracts supported through a defined transition window.

### 16.3 Edition Availability

The Reception module is included in every edition of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) provides basic check-in and queue management with limited data volume. The Essential edition (E1) provides full check-in, queue management, walk-in handling, and check-out for single-facility operation. The Professional edition (E2) adds visitor management, transfer coordination, self-service check-in, and multi-facility reception oversight. The Enterprise edition (E3) adds advanced queue analytics, integration with external patient flow systems, and integration with facility access control systems. Edition packaging does not modify module internals; all editions run the same code.

### 16.4 Clinic Type Relevance

The Reception module is relevant to every clinic type catalogued in PRODUCT_BIBLE Section 18.2 that operates a physical reception desk. The following clinic types have particular reliance on advanced reception module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C1 General practice | High-volume check-in; chronic care queue management |
| C4 Paediatrics | Family check-in; multi-child queue management |
| C18 Emergency department | Triage integration; high-acuity queue prioritization |
| C19 Urgent care clinic | Walk-in handling; high-volume check-in |
| C20 Day surgery | Pre-procedure check-in; transfer coordination |
| C21 Inpatient ward | Visitor management; long-stay coordination |
| C24 Laboratory | Walk-in handling; specimen collection queue |
| C25 Imaging centre | Walk-in handling; appointment-based queue; transfer coordination |
| C30 Long-term care facility | Visitor management; family coordination |

### 16.5 Operational Considerations

Operational considerations for the Reception module include check-in throughput, queue state consistency, and offline operation. Check-in throughput is critical for high-volume clinics — a reception desk that processes 100 patients per hour must complete each check-in in under a minute on average, requiring the check-in workflow to be optimized for speed. Check-in throughput is monitored as a module health metric, with sustained slowdowns triggering operational investigation.

Queue state consistency is a concern for tenants with multiple receptionists managing the same queue. The module's queue state must produce correct results under concurrent access, with locking or optimistic concurrency control ensuring that two receptionists do not assign the same room to different patients. Offline operation is supported for limited reception functions at facilities with intermittent connectivity — check-in, queue management, and visitor tracking can be performed offline, with synchronization to the central platform when connectivity is restored. Offline operations are subject to conflict resolution at synchronization time, with conflicts resolved per the tenant's conflict resolution policy, in keeping with the offline-first principle (P11, SYSTEM_ARCHITECTURE Section 4.11) for non-clinical data.

Disaster recovery for reception operations is a concern because reception is the operational entry point for clinical care. A facility that loses reception capability cannot check in patients, cannot manage the queue, and cannot coordinate visits. The Reception module's data is recoverable per the platform's data durability commitments, with reception state rebuilt from peer-module data (appointments from the Scheduling module, patients from the Patients module) where reception-specific state is lost. Recovery procedures are tested regularly, with recovery time objectives aligned to the tenant's edition (Essential, Professional, Enterprise).

---

## 17. Related Documents

### 17.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (cross-cutting capability drawing from BC06 Scheduling and BC01 Patient)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P2, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC06 Scheduling, BC01 Patient, BC14 Notifications)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface

The Reception module's canonical reference structure differs from peer modules in one important respect: the Reception module is not a bounded context in the canonical catalogue (SYSTEM_ARCHITECTURE Section 7.2) but rather a cross-cutting capability that draws from multiple bounded contexts. References to the Reception module in canonical documents therefore appear in the context of the Scheduling bounded context (BC06) and the Patient bounded context (BC01), with the Reception module's role as an integration surface documented in this module reference and in MODULE_ARCHITECTURE.md Section 2.2.

### 17.2 Peer Module References

- PATIENTS.md — Patient module (BC01); provides patient identity at check-in and registration
- APPOINTMENTS.md — Scheduling module (BC06); provides appointment state and slot availability
- BILLING.md — Billing module (BC07); provides co-pay amounts and captures payments at desk
- CRM.md — CRM module (BC11); consumes visit data for patient experience analysis
- DOCTORS.md — Workforce module (BC10); provides provider schedules for queue management
- ACCOUNTING.md — Accounting module (BC08); consumes payment events for bank reconciliation
- AUDIT_LOGS.md — Audit module (BC17); records every consequential reception-related action

### 17.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit
