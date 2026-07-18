# Ibn Hayan Healthcare Operating System
## Appointments Module

| Field | Value |
|---|---|
| Document Title | Appointments Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, regulators, implementation partners, clinical operations leads |
| Scope | Appointment scheduling, multi-resource booking, slot templates, recurring appointments, waitlist management, no-show tracking, walk-in handling, telehealth scheduling, patient self-scheduling, reminders, and schedule overrides for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, encounter lifecycle management, clinical documentation, billing transaction execution, dispatch of reminders (owned by Notifications module) |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Calendar Management
5. Booking Rules & Validation
6. Reminders & Notifications
7. No-Show Management
8. Recurring Appointments
9. User Roles
10. Workflows
11. Data Models
12. Integrations
13. Configuration
14. Permissions
15. Reports
16. API Surface
17. Future Enhancements
18. Related Documents

---

## 1. Module Overview

### 1.1 Module Identity and Strategic Position

The Appointments module (M02 in this documentation suite, aligned with the Scheduling bounded context BC06 as catalogued in SYSTEM_ARCHITECTURE Section 7.2) is the operational scheduling engine of the Ibn Hayan Healthcare Operating System. Every patient-facing encounter that is not an unscheduled emergency passes through this module: the appointment is the operational bridge between the patient's intent to receive care and the provider's allocation of time, room, and equipment to deliver it. Without a functioning scheduling capability, a healthcare organization cannot match demand to capacity, cannot honor patient commitments, and cannot use its clinical resources efficiently.

Ibn Hayan treats scheduling as a first-class operational concern rather than as a peripheral calendar utility. This positioning has direct architectural consequences: scheduling is owned by a single bounded context, accessed by every module that needs to book or query appointments through published contracts, and protected by conflict-detection and override-management guarantees that prevent double-booking, resource contention, and schedule corruption. An appointment created in Ibn Hayan is a long-lived commitment whose lifecycle (booked, confirmed, arrived, in-progress, completed, cancelled, no-show) is governed by configurable state machines, not by ad hoc status changes.

### 1.2 Purpose and Business Value

The Appointments module exists to match patient demand for care with provider and resource capacity, in a way that respects patient time, provider time, clinical safety, and operational efficiency. Business value is realized through four mechanisms. First, slot template management eliminates the manual overhead of recurring schedule setup — a provider's weekly availability is templated, not re-entered. Second, multi-resource scheduling ensures that an appointment has all the resources it needs (provider, room, equipment) at the time it is booked, not at the time the patient arrives. Third, waitlist management recovers value from cancellations by automatically offering freed slots to waiting patients. Fourth, no-show tracking and reminders reduce the operational cost of missed appointments, which is one of the largest sources of lost capacity in outpatient healthcare.

For customers, the Appointments module is the front door of the clinic: a patient who cannot book an appointment cannot be seen, and a provider whose schedule is mismanaged cannot deliver care efficiently. For regulators, the Appointments module is the source of truth for visit-volume reporting and for access-to-care metrics. For patients, the Appointments module — through the patient portal and reminder channels — is often the most frequent point of contact with the healthcare organization between visits.

### 1.3 Bounded Context Alignment

The Appointments module aligns one-to-one with the Scheduling bounded context BC06, as catalogued in SYSTEM_ARCHITECTURE Section 7.2 and elaborated in MODULE_ARCHITECTURE Section 2.2. BC06 owns appointment lifecycle, slot templates, resource scheduling, waitlist management, and no-show tracking; it does not own encounter clinical content (BC02), patient identity (BC01), or notification dispatch (BC14). The Scheduling bounded context is a customer in customer-supplier relationships with the Patient, Workforce, and Notifications contexts; it is a supplier in customer-supplier relationships with the Encounter, Billing, and Reporting contexts.

This alignment is stable. Per Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8), the Scheduling bounded context is not reorganized to accommodate features. New scheduling-related capabilities — for example, a new appointment type, a new resource category, a new reminder channel — are accommodated within the existing context through configuration, not through structural change. Customers can rely on this stability when planning integrations with external scheduling systems and when building operational workflows that depend on appointment data.

### 1.4 Module Composition

The Appointments module is composed of the following capability areas, each elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: calendar and slot template management, multi-provider and multi-resource scheduling, recurring appointments, waitlist management, no-show tracking, walk-in handling, emergency slot override, telehealth slot designation, patient self-scheduling, appointment reminders, resource conflict detection, overbooking rules, and schedule overrides (leave, holidays). The module does not own encounter clinical content, patient identity, provider credentialing, or notification dispatch; it owns the appointment that ties those modules together operationally. The module participates in workflows owned by other modules through its published event and query contracts.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the appointment as its organizing concept; capabilities that do not share this organizing concept belong in other modules. Reminders, for example, are managed by the Appointments module in terms of timing and trigger conditions, but the actual dispatch is owned by the Notifications module, because dispatch is a channel-and-delivery concern, not a scheduling concern. This separation prevents the Appointments module from accumulating channel-specific logic that would compromise its contract stability over time.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The Appointments module owns appointment lifecycle from booking through completion, cancellation, or no-show. It owns slot templates that define provider and resource availability patterns, recurring appointment series, waitlist management for filling cancelled slots, no-show recording and tracking, walk-in appointment handling, emergency slot override for urgent clinical needs, telehealth slot designation that flags appointments as virtual, patient self-scheduling through the patient portal, appointment reminder scheduling (with dispatch owned by the Notifications module), resource conflict detection across provider, room, and equipment dimensions, overbooking rules that allow controlled over-allocation where clinically appropriate, and schedule overrides for provider leave, holidays, and facility closures.

The module also owns the configuration surface for scheduling-related behaviour, including slot template definitions, appointment type catalogues, reminder cadence rules, no-show thresholds, overbooking percentages, and waitlist offer ordering. Configuration is layered per the model in PRODUCT_BIBLE Section 22.3 and SYSTEM_ARCHITECTURE Section 15.2, with platform defaults inherited by edition, tenant, facility, department, care team, and session overrides where applicable.

### 2.2 Out of Scope

The Appointments module does not own encounter clinical content, clinical documentation, or clinical decision-making; these belong to the Encounter and Clinical Documentation bounded contexts. It does not own patient identity or demographics; these belong to the Patient bounded context, queried at booking time to verify the patient exists and to retrieve contact information for reminders. It does not own provider credentialing, privilege management, or payroll; these belong to the Workforce bounded context, queried at slot template creation to verify the provider is qualified for the appointment type. It does not own notification dispatch — the Appointments module schedules reminders and triggers their dispatch through events, but the Notifications module owns the channel selection, message rendering, and delivery machinery.

The module also does not own billing for appointments (that belongs to the Billing bounded context, triggered by encounter completion), patient access authorization for self-scheduling (that belongs to the Identity & Access bounded context), or audit storage (that belongs to the Audit bounded context). The Appointments module publishes events that the Audit module records, but it does not store audit records itself.

### 2.3 Appointment as Operational Bridge

The appointment is the operational bridge between patient demand and provider capacity in the Ibn Hayan platform. Every scheduled patient encounter begins as an appointment; every appointment consumes provider time, room time, and equipment time; every appointment, when completed, generates an encounter that consumes clinical documentation, orders, and billing capacity. The Appointments module is the canonical source of appointment state; every other module that needs appointment information queries this module's contracts or subscribes to its events.

This central positioning imposes responsibilities on the Appointments module. The module's state must be strongly consistent within a resource's schedule, because double-booking produces operational chaos and patient safety risk when two patients arrive for the same slot (Principle P5, SYSTEM_ARCHITECTURE Section 4.6). The module's conflict detection must be comprehensive, covering provider, room, and equipment dimensions simultaneously, because a conflict in any dimension invalidates the appointment. The module's audit must be complete, because every appointment change (booking, reschedule, cancellation, no-show) has downstream financial and clinical consequences that must be traceable.

### 2.4 Multi-Tenant and Multi-Facility Scheduling

Appointment schedules are tenant-isolated by default. A provider's schedule in tenant A is not visible to tenant B, even when the provider is the same natural person (a provider who practices at multiple organizations, each on Ibn Hayan, has separate schedules per tenant). Within a tenant, schedules are facility-scoped: a provider's schedule at facility A is distinct from the same provider's schedule at facility B, with cross-facility conflict detection preventing the provider from being double-booked across facilities. Multi-facility tenants rely on cross-facility conflict detection as a primary operational safeguard; without it, a provider practising at two facilities on the same day could be double-booked.

Cross-tenant schedule sharing is not supported. A provider who practices at multiple organizations maintains separate schedules, separate appointment types, and separate slot templates in each tenant. This isolation honors Principle P10 (Multi-Tenancy as Default, SYSTEM_ARCHITECTURE Section 4.10) and prevents the privacy and operational complications that would arise from cross-tenant schedule visibility.

---

## 3. Key Features

### 3.1 Multi-Provider Scheduling

Multi-provider scheduling allows appointments to be booked with any provider in the tenant, subject to the provider's availability, qualifications, and patient panel assignment. The Appointments module queries the Workforce module for provider qualifications and the Patient module for any patient-panel restrictions before confirming a booking. Multi-provider scheduling supports team-based care models where a patient may see different providers within a care team across visits, and supports primary care networks where a patient may be seen at multiple facilities under shared ownership.

### 3.2 Multi-Resource Scheduling

Multi-resource scheduling allows appointments to book not only provider time but also room time and equipment time. A surgical appointment requires an operating room, a surgeon, an anesthesiologist, and specific equipment; an imaging appointment requires a scanner, a technician, and a reading radiologist; a chemotherapy appointment requires an infusion chair, a nurse, and a pharmacist. The Appointments module treats all resources uniformly through a resource abstraction, with each resource having its own availability, its own conflict detection, and its own slot template. Multi-resource scheduling is essential for clinic types where the room or equipment is the binding constraint, not the provider.

### 3.3 Slot Templates

Slot templates define recurring availability patterns for providers and resources. A template specifies the days, start times, end times, appointment types, and durations available for a provider or resource over a defined period (typically a week, repeated for weeks or months). Slot templates eliminate the manual overhead of recurring schedule setup and ensure that availability patterns are consistent and predictable. Templates are versioned, with effective-dating for changes; a provider's template change takes effect on the configured date, with already-booked appointments preserved.

### 3.4 Recurring Appointments

Recurring appointments allow a series of appointments to be booked as a single action — for example, a patient receiving weekly chemotherapy for twelve weeks, or a patient receiving monthly psychiatric follow-up for a year. The recurring appointment series is treated as a single entity for booking, modification, and cancellation, but each appointment in the series is an independent entity for reminder, no-show, and encounter purposes. Recurring appointments reduce the booking overhead for chronic care management and improve patient adherence by ensuring follow-up slots are reserved before the patient leaves the clinic.

### 3.5 Waitlist Management

Waitlist management maintains a queue of patients who would accept an earlier appointment if one becomes available, and automatically offers freed slots to waitlist patients when a cancellation occurs. The waitlist is ordered by clinical priority, by patient preference (sooner appointment preferred, specific provider preferred, specific time-of-day preferred), and by wait time. When a slot is freed, the Appointments module queries the waitlist for matching patients and offers the slot through the patient's preferred channel, with a response window after which the offer expires and the next waitlist patient is offered the slot.

### 3.6 No-Show Tracking

No-show tracking records appointments where the patient did not arrive and did not cancel in advance, and uses the no-show history to inform future scheduling decisions. A patient with a high no-show rate may be subject to scheduling restrictions (same-day appointments only, or deposit-required appointments) configured by the tenant. No-show data is also used for operational reporting — no-show rates by provider, by clinic type, by day-of-week, by time-of-day — to identify scheduling patterns that correlate with non-attendance. No-show recording is itself an audited action, because a misclassified no-show (a patient who arrived but was marked as no-show) has billing and clinical consequences.

### 3.7 Walk-In Handling

Walk-in handling allows patients to be seen without a prior appointment, while still creating an appointment record for the visit. A walk-in appointment is created at the time of patient arrival, with the provider, room, and equipment allocated from current availability rather than from a slot template. Walk-in appointments are common in urgent care, emergency, and primary care walk-in clinics; the Appointments module supports walk-in as a first-class appointment type, with its own configuration for prioritization (walk-ins may be interleaved with scheduled appointments or may be served only between scheduled appointments, per tenant configuration).

### 3.8 Emergency Slot Override

Emergency slot override allows a slot to be overbooked or pre-empted when a clinical emergency requires immediate provider attention. The override is a controlled action: it requires explicit authorization, it is recorded with the justification, and the displaced appointment (if any) is automatically rescheduled with priority. Emergency slot override is the operational expression of Principle P1 (Healthcare Safety Overrides All Others, SYSTEM_ARCHITECTURE Section 4.2) applied to scheduling: when a patient's safety requires immediate attention, schedule integrity yields to clinical necessity, with the operational consequences managed through automated rescheduling.

### 3.9 Telehealth Slot Designation

Telehealth slot designation flags appointments as virtual rather than in-person, and triggers the appropriate operational workflows — telehealth link generation (through the Integration module), telehealth-specific reminders (through the Notifications module), telehealth-specific documentation templates (through the Clinical Documentation module). Telehealth slots may be mixed with in-person slots in a provider's schedule, or may be segregated into telehealth-only sessions, per tenant configuration. The designation is configurable per appointment type, per provider, per clinic type, and per facility.

### 3.10 Patient Self-Scheduling

Patient self-scheduling allows patients to book their own appointments through the patient portal, subject to configurable constraints — only certain appointment types are self-bookable, only certain providers are self-bookable, only certain time windows are self-bookable, and patients with outstanding balances or recent no-shows may be blocked from self-scheduling. Self-scheduling reduces reception workload, improves patient satisfaction, and increases booking conversion (patients who would not call during business hours can book at their convenience). Self-scheduling is gated by patient portal authentication (owned by the Identity & Access module) and by patient identity verification (owned by the Patients module).

### 3.11 Appointment Reminders

Appointment reminders are scheduled by the Appointments module and dispatched by the Notifications module. The reminder cadence is configurable — a typical configuration sends a reminder 24 hours before the appointment and a second reminder 2 hours before, with the cadence adjustable per appointment type, per clinic type, and per patient preference. Reminder content is rendered by the Notifications module from templates configured in the Appointments module. Reminders are critical for reducing no-show rates; tenants that disable reminders typically see no-show rates double, with corresponding capacity loss.

### 3.12 Resource Conflict Detection

Resource conflict detection prevents double-booking of providers, rooms, and equipment. When an appointment is booked, the Appointments module checks that the provider, room, and equipment are all available for the appointment's duration; if any resource is already booked, the booking is rejected or routed to alternative resources per tenant configuration. Conflict detection is performed at booking time (synchronous, to prevent the user from completing an invalid booking) and continuously (asynchronous, to detect conflicts introduced by schedule overrides and to surface them for resolution).

### 3.13 Overbooking Rules

Overbooking rules allow controlled over-allocation of slots where clinically appropriate, to compensate for anticipated no-shows. Overbooking is configurable per appointment type, per provider, and per clinic type; a primary care clinic with a 10% no-show rate may configure 10% overbooking for routine appointments, while a surgical clinic with a near-zero no-show rate configures no overbooking. Overbooking rules are subject to clinical safety validation — overbooking that would compromise patient safety (for example, overbooking a procedure that requires dedicated equipment time) is rejected by validation.

### 3.14 Schedule Overrides

Schedule overrides manage provider and facility availability exceptions: provider leave (vacation, sick, conference), facility holidays, facility closures for maintenance, and temporary schedule changes. An override blocks the affected slots from booking and, where applicable, triggers rescheduling of already-booked appointments. Overrides are versioned, audited, and configurable per provider, per facility, per date range, and per override reason. Override management is essential for maintaining schedule integrity over time, as provider and facility availability is not static.

---

## 4. Calendar Management

### 4.1 Calendar Views

Calendar views present appointment data in formats suited to operational workflows. The provider view shows a single provider's schedule for a day, week, or month. The resource view shows a single resource's (room, equipment) schedule. The facility view shows all providers and resources at a facility for a day. The patient view shows a single patient's appointment history and upcoming appointments. Views are read-only presentations of appointment state; they do not modify state. Views are generated through query contracts, with the Appointments module returning the appointment data and the calling surface rendering it.

### 4.2 Slot Template Management

Slot template management defines recurring availability patterns for providers and resources. A slot template specifies the days of the week, the start and end times, the appointment types accepted, the appointment duration, the booking lead time, and the effective period. Templates are versioned, with effective-dating for changes; a template change does not affect already-booked appointments, which are preserved against their original template. Template management is a configuration activity governed by the Configuration module's validation and audit; a template that conflicts with an existing template (for example, two templates that claim the same provider's time) is rejected at validation time.

### 4.3 Calendar Navigation

Calendar navigation supports forward and backward traversal through time, with the navigation range bounded by the tenant's configuration. A tenant may configure the booking horizon (how far in advance appointments can be booked) and the historical view horizon (how far back appointments can be reviewed). Navigation supports zoom between day, week, and month views, with the underlying appointment data remaining consistent across views. Navigation is a presentation concern; the underlying query contracts return appointment data for any time range, with the calling surface determining the navigation experience.

### 4.4 Calendar Export

Calendar export allows appointment data to be exported in standard calendar formats (iCalendar) for integration with personal calendar applications and external scheduling systems. Export is read-only and is scoped to the caller's authority — a provider can export their own schedule, a patient can export their own appointments, but neither can export another's calendar without authorization. Calendar export is mediated by the Integration module's contracts; the Appointments module publishes appointment events that the Integration module translates to the external format.

---

## 5. Booking Rules & Validation

### 5.1 Booking Rule Categories

Booking rules govern what appointments can be booked, by whom, for whom, and under what conditions. Rule categories include patient eligibility (is the patient eligible for this appointment type?), provider eligibility (is the provider qualified for this appointment type and patient?), resource availability (are the required resources available for the duration?), lead time (is the booking within the configured lead time window?), cancellation policy (is the patient subject to cancellation restrictions based on prior no-shows?), and overbooking policy (is overbooking permitted for this appointment type and provider?). Rules are configurable per tenant, per facility, per clinic type, and per appointment type.

### 5.2 Validation Pipeline

Booking validation is performed as a pipeline, with each rule evaluated in sequence and the booking rejected if any rule fails. The pipeline order is significant: eligibility rules are evaluated before availability rules, because eligibility failures are typically less expensive to evaluate and produce more actionable feedback for the user. Validation failures are returned with diagnostic information that allows the calling surface to guide the user to a valid booking — for example, suggesting alternative providers, alternative time slots, or alternative appointment types. Validation is itself audited; a booking that fails validation is recorded with the failure reason, for operational analysis of booking friction.

### 5.3 Conflict Detection

Conflict detection is the most operationally critical validation rule. It checks that the provider, room, and equipment required for an appointment are all available for the appointment's duration, considering existing bookings, schedule overrides, and resource maintenance windows. Conflict detection is performed synchronously at booking time (to prevent invalid bookings from being completed) and asynchronously after booking (to detect conflicts introduced by subsequent schedule changes). Synchronous conflict detection must be fast — booking is a user-facing operation, and a slow conflict check degrades the booking experience — so the Appointments module maintains indexed availability projections that support sub-second conflict checks even for high-volume tenants.

### 5.4 Override and Exception Handling

Override and exception handling allows validated bookings to proceed despite rule failures, in controlled circumstances. An override requires explicit authorization, a documented justification, and produces an audit record. Overrides are used for clinical necessity (a patient who does not meet standard eligibility but who requires urgent care), for operational necessity (a VIP patient whose booking must proceed despite lead-time rules), and for legacy data migration (historical appointments that do not conform to current rules). Override authority is configurable per role, with the compliance officer role having visibility into all overrides for review.

---

## 6. Reminders & Notifications

### 6.1 Reminder Scheduling

Reminder scheduling is owned by the Appointments module. The module computes reminder times based on the appointment time and the configured cadence — typically 24 hours before and 2 hours before, with the cadence configurable per appointment type, per clinic type, and per patient preference. Reminder times are computed at booking time and are recomputed when the appointment is rescheduled. The module publishes reminder-trigger events at the computed times, with the Notifications module consuming the events and dispatching the reminders through the patient's preferred channels.

### 6.2 Reminder Channel Selection

Reminder channel selection is owned by the Notifications module, which consults the Patients module's communication preference contracts before dispatch. The Appointments module does not know which channel will be used; it knows only that a reminder is scheduled. This separation allows the reminder dispatch to respect the patient's channel preferences (a patient who has opted out of SMS reminders receives the reminder through email or portal message instead) without requiring the Appointments module to track channel preferences. Channel selection is itself audited, with the selected channel recorded for each dispatched reminder.

### 6.3 Reminder Content

Reminder content is rendered by the Notifications module from templates configured in the Appointments module. Templates include appointment date, time, provider name, facility address, telehealth link (for telehealth appointments), preparation instructions (for appointments that require fasting, medication hold, or other preparation), and cancellation instructions. Templates are localized through the Localization module's contracts; a tenant operating in multiple languages renders reminders in the patient's preferred language. Template changes are versioned and audited, with the version used for each dispatched reminder recorded.

### 6.4 Reminder Failure Handling

Reminder failure handling manages cases where a reminder cannot be dispatched — the patient's preferred channel is unavailable (telephone number invalid, email bounced), the patient has opted out of all reminder channels, or the dispatch system is experiencing an outage. Failure is recorded with the failure reason, and the failure is visible to operational staff who can take alternative action (telephone the patient, send a portal message). Reminder failures do not change the appointment status; an appointment with a reminder failure is still an appointment, and the patient's non-attendance (if it occurs) is recorded as a no-show, not as a reminder-failure consequence.

---

## 7. No-Show Management

### 7.1 No-Show Recording

No-show recording marks an appointment as a no-show when the patient did not arrive within the configured grace period and did not cancel in advance. No-show recording is a manual action by reception or clinical staff, with the module enforcing a configurable grace period before the appointment can be marked as a no-show (typically 15-30 minutes after the scheduled start time, configurable per clinic type). No-show recording is itself audited, with the recorder, the time, and the justification (if required) recorded. A no-show can be reversed if recorded in error; the reversal is also audited.

### 7.2 No-Show History

No-show history is maintained per patient and per provider. Patient no-show history is used to inform scheduling restrictions — a patient with a no-show rate above a configured threshold may be subject to same-day-only booking, deposit-required booking, or booking-only-through-reception restrictions. Provider no-show history is used for operational reporting, identifying providers whose scheduling patterns correlate with high no-show rates (which may indicate overbooking, inconvenient scheduling, or patient population factors). No-show history is retained per the tenant's retention policy, with the retention period configurable per regulatory framework.

### 7.3 No-Show Recovery

No-show recovery recovers operational value from a no-show slot by offering it to waitlist patients, by extending adjacent appointments, or by using the slot for documentation catch-up. Recovery actions are configurable; a tenant may configure automatic waitlist offers on no-show, automatic extension of adjacent appointments (with patient consent), or no automatic recovery (with the slot left vacant for operational simplicity). Recovery actions are recorded for operational analysis, identifying which recovery mechanisms produce the most value and which produce unintended consequences (for example, automatic waitlist offers that arrive too late to be useful).

### 7.4 No-Show Reporting

No-show reporting surfaces no-show data for operational management and quality improvement. Reports include no-show rate by provider, by clinic type, by day-of-week, by time-of-day, by appointment type, by patient demographic; no-show cost (estimated revenue lost to no-shows); no-show recovery rate (percentage of no-show slots that were refilled); and no-show trend over time. Reports are generated through the Reporting module's contracts, with the Appointments module providing the underlying no-show data through query contracts.

---

## 8. Recurring Appointments

### 8.1 Recurring Series Definition

Recurring series definition specifies the pattern of recurrence — daily, weekly, monthly, custom intervals — and the number of occurrences or the end date. The definition includes the appointment type, the provider, the resource, the duration, and the patient, with these attributes applied to every occurrence in the series. Series definitions are validated as a unit: if any occurrence would conflict with an existing booking, the entire series is rejected or the conflicting occurrences are skipped per tenant configuration. Series definitions are versioned; a series modification takes effect for future occurrences, with past occurrences preserved unchanged.

### 8.2 Series Modification

Series modification allows the series to be changed after creation — changing the provider, the duration, the resource, or the recurrence pattern. Modifications may apply to all future occurrences, to a subset of occurrences, or to a single occurrence (effectively breaking it out of the series). Modifications are validated against the same rules as initial booking, with conflicts surfaced for resolution. Series modifications are audited, with the modification scope (all occurrences, subset, single) and the modification reason (if required) recorded.

### 8.3 Series Cancellation

Series cancellation cancels all future occurrences in the series. Cancellations may be initiated by the patient, by the provider, or by the system (for example, when a provider leaves the practice). Cancellation triggers waitlist offers for the freed slots, per the standard waitlist workflow. Past occurrences in the series are not affected by cancellation; they remain as historical records. Series cancellations are audited, with the canceller, the time, and the reason recorded.

### 8.4 Series Exception Handling

Series exception handling manages occurrences that deviate from the series pattern — a single occurrence moved to a different time, a single occurrence with a different provider, a single occurrence cancelled. Exceptions are first-class entities within the series, with the series retaining its overall pattern and the exceptions recorded as deviations. Exception handling is essential for chronic care management, where a patient's treatment plan follows a general pattern but individual appointments are adjusted for clinical or operational reasons.

---

## 9. User Roles

### 9.1 Roles That Interact with Appointments

The following roles interact with appointments through the Appointments module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2.

| Role Code | Role | Typical Appointment-Related Responsibilities |
|---|---|---|
| R01 | Physician | View own schedule, block slots, manage appointment types |
| R02 | Nurse | View clinic schedule, manage room assignments |
| R03 | Pharmacist | View appointment-related medication schedules |
| R05 | Allied health professional | View own schedule, manage appointment types |
| R06 | Receptionist | Book, reschedule, cancel appointments; check-in; no-show recording |
| R07 | Scheduler | Manage slot templates, manage provider schedules, manage waitlist |
| R08 | Biller | View appointment status for billing eligibility |
| R09 | Administrator | Facility schedule oversight, override management |
| R10 | Compliance officer | Audit review of appointment overrides and no-show reversals |
| R13 | System administrator | Tenant configuration of scheduling behaviour |
| R14 | Integration account | System-to-system appointment queries and sync |

### 9.2 Permission Categories

Permissions on appointments are defined at the action level on the appointment resource, in keeping with the permission philosophy in PRODUCT_BIBLE Section 21.2. Read permissions include viewing appointment details, viewing schedule, viewing no-show history. Write permissions include booking, rescheduling, cancelling, recording no-show, creating slot templates. Execute permissions include conflict detection, waitlist offer, overbooking. Administer permissions include configuring appointment types, configuring slot templates, configuring reminder cadence, managing schedule overrides.

### 9.3 Emergency Override Authority

Emergency override authority allows specific roles to override booking rules in clinical emergency situations. The authority is granted selectively — typically to senior clinical roles (physician, charge nurse) and to operational roles (administrator, scheduler) — and is recorded with the override reason, the override scope, and the override approver. Override authority is reviewed periodically by the compliance officer, with frequent overrides triggering investigation into the underlying scheduling configuration that necessitates them. Emergency override is governed by the Identity & Access module's contracts, with the Appointments module enforcing the override scope and recording the audit event.

---

## 10. Workflows

### 10.1 Workflows the Module Triggers

The Appointments module triggers workflows in response to appointment lifecycle events. Booking triggers a confirmation communication (via the Notifications module) and a calendar update. Rescheduling triggers a reschedule notification and updates downstream workflows (encounter preparation, resource preparation). Cancellation triggers a waitlist offer workflow and a cancellation notification. No-show recording triggers a no-show follow-up workflow (which may include patient outreach, billing for the no-show where permitted, and no-show history update). Appointment completion triggers encounter finalization (via the Encounter module) and billing initiation (via the Billing module). Reminder scheduling triggers reminder dispatch at the configured times.

### 10.2 Workflows the Module Participates In

The Appointments module participates in workflows owned by other modules by responding to queries and by consuming events. The Reception module queries the Appointments module for the day's schedule and for check-in eligibility. The Encounter module queries the Appointments module for the appointment context when an encounter is opened. The Billing module queries the Appointments module for appointment status when a claim is prepared. The Workforce module publishes provider availability changes (leave, schedule changes) that the Appointments module consumes to update slot templates and to flag affected appointments for rescheduling. The Patients module publishes patient merge events that the Appointments module consumes to update appointment references.

### 10.3 Audit Events Generated

The Appointments module generates audit events for every consequential action, in keeping with the audit architecture defined in SYSTEM_ARCHITECTURE Section 27. Audit events include appointment booking, rescheduling, cancellation, no-show recording, no-show reversal, walk-in creation, emergency slot override, slot template creation, slot template modification, schedule override creation, waitlist offer, waitlist acceptance, waitlist expiry, recurring series creation, recurring series modification, recurring series cancellation, and overbooking. Every audit event includes the actor, the action, the resource, the tenant, the scope, the previous state, the new state, the authorization basis, the result, and the context, per the audit record structure in SYSTEM_ARCHITECTURE Section 27.4.

Audit events in the Appointments module are particularly important for financial accountability, because appointment status drives billing eligibility. A no-show recorded in error (or in fraud) may produce a billing event that should not have occurred; the audit trail allows compliance officers to investigate discrepancies between appointment status, encounter documentation, and billing claims. Appointment audit records are immutable, append-only, and tamper-evident, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

---

## 11. Data Models

### 11.1 Core Entities

The Appointments module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Appointment | The canonical appointment entity |
| Slot | A bookable unit of provider or resource time |
| Schedule | A provider or resource's availability over a period |
| Provider Schedule | A provider's schedule, derived from slot templates |
| Resource | A bookable room, equipment, or other resource |
| Recurring Appointment | A series of appointments defined by a recurrence pattern |
| Waitlist | A queue of patients seeking earlier appointments |
| No-Show Record | A record of a patient's failure to attend |

### 11.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Slot Template defines recurring availability patterns. The Schedule Override records exceptions to slot templates (leave, holidays, closures). The Appointment Type defines appointment categories (new patient, follow-up, procedure, telehealth) with their own duration, resource, and validation rules. The Booking Rule captures configurable validation rules. The Reminder Schedule records reminder times computed for an appointment. The Conflict Record documents detected conflicts and their resolution. The Waitlist Offer records an offer made to a waitlist patient, with the offer's status and expiry.

### 11.3 Entity Relationships

Core entities relate to the Appointment entity as the central scheduling object. An Appointment references a Patient (owned by the Patients module), a Provider (owned by the Workforce module), one or more Resources, and an Appointment Type. A Slot is a temporal unit that may be occupied by an Appointment or may be available. A Schedule is composed of Slots, derived from one or more Slot Templates. A Recurring Appointment is composed of multiple Appointments sharing a recurrence pattern. A Waitlist references multiple Patients and matches against freed Slots. A No-Show Record references an Appointment and a Patient. References to peer-module entities are logical identifiers, not direct data-store references (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8).

---

## 12. Integrations

### 12.1 Peer Module Integrations

The Appointments module integrates with peer modules through published contracts. The Patients module is queried for patient identity, contact, and communication preferences at booking and reminder time. The Workforce module is queried for provider qualifications, schedule, and availability changes. The Encounter module is notified when an appointment is completed, triggering encounter finalization. The Billing module is notified when an appointment is completed or no-showed, triggering billing eligibility evaluation. The Notifications module consumes reminder-trigger events and dispatches reminders through patient-preferred channels. The CRM module consumes appointment data for patient outreach and acquisition analytics. The Reporting module consumes appointment data for operational and analytical reports.

### 12.2 External System Integrations

External system integrations are mediated by the Integration module (deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the Appointments module's contracts through integration adapters that align with healthcare interoperability standards — HL7 FHIR for appointment exchange (Scheduling Resource), iCalendar for personal calendar integration, HL7 v2 for legacy scheduling interfaces, and IHE profiles for cross-facility scheduling (SWF, FADS). The Appointments module is not aware of the specific external systems; it is aware only of the Integration module's contracts.

### 12.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Synchronous command is used for booking, rescheduling, and cancellation where immediate confirmation is required. Synchronous query is used for conflict detection, schedule retrieval, and appointment status lookup. Asynchronous event is used for appointment lifecycle events (booking, rescheduling, cancellation, no-show) that peer modules consume without requiring immediate response. The outbox pattern is used for reminder-trigger events, ensuring that reminders are dispatched even in the presence of transient failures between the Appointments module and the Notifications module. Anticorruption layers translate between external scheduling system models and the Ibn Hayan appointment model, preventing external model leakage per the context relationship pattern in SYSTEM_ARCHITECTURE Section 7.3.

---

## 13. Configuration

### 13.1 Configuration Categories

The Appointments module's configuration surface is organized into the categories defined in MODULE_ARCHITECTURE Section 10.3. Behavioural configuration includes appointment type definitions, slot template rules, booking validation rules, reminder cadence, no-show thresholds, overbooking percentages, waitlist ordering rules. Structural configuration includes feature flags for capabilities like patient self-scheduling, telehealth designation, and recurring appointments. Integration configuration includes external scheduling system endpoints and credentials. Localization configuration includes reminder templates in multiple languages, appointment type naming per region, and time-zone handling. Security configuration includes booking authorization rules, override authority scoping, and self-scheduling access scope. Regulatory configuration includes no-show recording retention, appointment data retention, and regulatory reporting templates.

### 13.2 Tenant-Configurable vs Platform-Configurable

The configuration surface distinguishes between tenant-configurable categories and platform-configurable categories, per MODULE_ARCHITECTURE Section 10.3. Tenant-configurable categories include appointment type definitions, slot templates, reminder cadence, and waitlist rules; these may be overridden by tenant administrators within validation constraints. Platform-configurable categories include the appointment state machine, the conflict detection algorithm, and the audit record structure; these are reserved for the platform and may not be overridden by tenants. The distinction is enforced by the Configuration module's service and is part of the configuration schema published by the Appointments module.

### 13.3 Configuration Governance

Configuration governance follows the framework defined in MODULE_ARCHITECTURE Section 10.5 and SYSTEM_ARCHITECTURE Section 8.7. Every configuration change is validated before application, audited on application, reversible through rollback, and reviewable through the audit trail. Changes that affect clinical safety — for example, a change to overbooking rules that might compromise patient safety — require compliance review. Changes that affect regulatory compliance — for example, a change to no-show recording retention — require compliance officer review. Changes that affect patient self-scheduling access — for example, expanding the appointment types available for self-scheduling — require operational review. The governance posture is documented in the module's configuration schema and is reviewed at architectural review.

---

## 14. Permissions

### 14.1 Action-Level Permissions on Appointment Resources

Permissions are defined at the action level on the appointment resource, per PRODUCT_BIBLE Section 21.2. The permission matrix includes read, write, execute, and administer actions on appointment, slot, schedule, slot template, recurring appointment, waitlist, and no-show record resources. The matrix is large but stable, because actions and resources evolve slowly even as the platform's surface evolves quickly. Direct user-permission assignment is forbidden; permissions are assigned through roles, per PRODUCT_BIBLE Section 21.3.

### 14.2 Scoping Rules

Permissions are scoped, not global, per PRODUCT_BIBLE Section 21.4. A scheduler may have write permission on appointments at their facility without having write permission on appointments at another facility. Scoping is by organizational unit, by facility, by department, by care team, and by provider (a scheduler may be scoped to manage specific providers' schedules but not others). Scoping is enforced at the action level; a scheduler without write permission on a specific appointment cannot modify that appointment through any surface, including direct navigation, search, or bulk operations.

### 14.3 Permission Inheritance

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 6.6 and PRODUCT_BIBLE Section 21.5. A permission granted at the organization level applies to all facilities within the organization unless overridden. A permission granted at the facility level applies to all departments within the facility unless overridden. Inheritance is explicit, documented, and auditable; it is not automatic. A role assigned at the organization level does not automatically propagate to lower levels; the role must be explicitly scoped to apply at lower levels, preventing accidental over-permissioning through inheritance misconfiguration.

Provider-specific permissions are a critical extension of the inheritance model. A scheduler may have general write permission on appointments at their facility, but may have additional specific permission on a subset of providers (their assigned providers) and reduced permission on other providers (providers managed by other schedulers). Provider-specific permissions are scoped through scheduler-provider assignments and are enforced at the action level, regardless of general facility-level permissions.

---

## 15. Reports

### 15.1 Operational Reports

Operational reports surface appointment activity for daily operational management. Reports include daily schedule by provider and facility, booking conversion rate, cancellation rate, no-show rate, waitlist depth and conversion, slot utilization, and template adherence. Operational reports are generated through the Reporting module's contracts, with the Appointments module providing the underlying data through query contracts and event subscriptions. Reports are typically consumed by schedulers, receptionists, and facility administrators for day-to-day operational decisions.

### 15.2 Analytical Reports

Analytical reports surface scheduling patterns and trends for strategic planning. Reports include demand forecasting (predicted appointment volume by clinic type, by season, by day-of-week), capacity planning (provider and resource utilization vs. available capacity), access-to-care metrics (third-next-available appointment, a standard primary care access measure), patient panel composition by provider, and appointment outcome analysis (percentage of appointments resulting in encounter, in order, in referral). Analytical reports are generated through the Reporting module's analytical pipeline, with appointment data aggregated over time and across facilities.

### 15.3 Regulatory Reports

Regulatory reports surface appointment-related compliance evidence. Reports include appointment access metrics (for regulators monitoring access-to-care standards), telehealth utilization (for regulators monitoring telehealth adoption), no-show recording audit (for compliance officers verifying no-show recording accuracy), and override audit (for compliance officers reviewing emergency overrides and rule exceptions). Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8.

---

## 16. API Surface

### 16.1 Contract Categories

The Appointments module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the Appointments module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 16.2 Command Contracts

Command contracts are requests to perform an action that changes appointment state. Examples include BookAppointment, RescheduleAppointment, CancelAppointment, RecordNoShow, ReverseNoShow, CreateSlotTemplate, ModifySlotTemplate, CreateScheduleOverride, OfferWaitlistSlot, AcceptWaitlistOffer, CreateRecurringSeries. Commands are synchronous where the caller requires immediate confirmation, asynchronous where the caller does not. Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the audit trail. Commands are idempotent where the operation supports idempotency, allowing safe retry in the presence of transient failures.

### 16.3 Query Contracts

Query contracts are requests to retrieve appointment state without changing it. Examples include GetAppointment, GetSchedule, GetSlotAvailability, GetWaitlist, GetNoShowHistory, GetProviderSchedule, GetResourceSchedule, SearchAppointments. Queries are synchronous, returning the requested state or a not-found response. Queries are scoped to the caller's authority — a caller without read permission on an appointment receives a not-found response rather than the appointment's data, preventing information leakage through query responses.

### 16.4 Event Contracts

Event contracts are notifications that something has happened in the Appointments module. Examples include AppointmentBooked, AppointmentRescheduled, AppointmentCancelled, NoShowRecorded, SlotTemplateCreated, ScheduleOverrideCreated, WaitlistOffered, WaitlistAccepted, RecurringSeriesCreated. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which peer modules maintain their local projections of appointment data, in keeping with the state isolation pattern (read models and projections, MODULE_ARCHITECTURE Section 11.3).

### 16.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the Appointments module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy. The schema is published as part of the module's contract surface; tenant administrators and the Configuration module's service consume the schema to validate configuration changes before application.

---

## 17. Future Enhancements

### 17.1 Extension Points

The Appointments module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom booking validation rules (for clinic types whose validation requirements exceed the platform default), custom slot template patterns (for clinic types whose availability patterns are not standard), custom waitlist ordering rules (for patient populations with specialized prioritization needs), and custom reminder trigger conditions (for appointment types whose reminder timing is non-standard). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

Extension points in the Appointments module are governed by the same lifecycle as platform features: defined, active, deprecated, retired. An extension point that has been deprecated is supported through a transition window, after which it is retired. Customers using a deprecated extension point are notified through the platform's change-management channel and are supported in migrating to the successor extension point or to platform-native capability.

### 17.2 Module Lifecycle

The Appointments module is at the Mature stage of the module lifecycle (LC4, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6). The module has been in General Availability since the platform's initial release, has completed the defined period of stable operation required for transition to Mature, and has a long-term support commitment. The module's contracts are stable; breaking changes follow the platform's deprecation policy, with old contracts supported through a defined transition window. Lifecycle transitions would be ratified by the Architecture Council and documented in the platform's CHANGELOG.

### 17.3 Edition Availability

The Appointments module is included in every edition of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) provides basic booking with limited data volume. The Essential edition (E1) provides full booking, slot template management, reminders, and no-show tracking for single-facility operation. The Professional edition (E2) adds recurring appointments, waitlist management, patient self-scheduling, telehealth slot designation, and multi-facility scheduling. The Enterprise edition (E3) adds advanced overbooking rules, cross-facility conflict detection, schedule optimization analytics, and integration with external scheduling systems. Edition packaging does not modify module internals; all editions run the same code, with edition differences expressed as configuration.

### 17.4 Clinic Type Relevance

The Appointments module is relevant to every clinic type catalogued in PRODUCT_BIBLE Section 18.2 that operates by appointment. The following clinic types have particular reliance on advanced appointment module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C1 General practice | High-volume scheduling; chronic care recurring appointments |
| C4 Paediatrics | Family scheduling; immunization series; guardian coordination |
| C5 Obstetrics and gynaecology | Prenatal visit series; procedure scheduling |
| C11 Oncology | Multi-resource chemotherapy scheduling; infusion chair binding |
| C13 Orthopaedics | Procedure and imaging coordination; therapist scheduling |
| C18 Emergency department | Walk-in handling; emergency slot override; triage integration |
| C19 Urgent care clinic | Walk-in handling; high-volume booking |
| C20 Day surgery | Multi-resource scheduling (surgeon, anesthesiologist, room, equipment) |
| C26 Physical therapy | Recurring appointments; resource (room) scheduling |
| C30 Long-term care facility | Recurring appointments; caregiver coordination |

### 17.5 Operational Considerations

Operational considerations for the Appointments module include booking concurrency, schedule view performance, and reminder dispatch volume. Booking concurrency is a critical concern in high-volume clinics where multiple receptionists may be booking appointments simultaneously; the module's conflict detection must produce correct results under concurrent access, with locking or optimistic concurrency control ensuring that two receptionists cannot book the same slot for different patients. Schedule view performance is critical for the receptionist and provider experiences; a schedule view that takes more than a second to load degrades the operational workflow and is monitored as a module health metric.

Reminder dispatch volume can be substantial for large tenants — a tenant with 100,000 appointments per month may dispatch 200,000 or more reminders (with multiple reminders per appointment), requiring the Notifications module's dispatch infrastructure to handle the volume. The Appointments module's reminder scheduling is decoupled from the Notifications module's dispatch, allowing each to scale independently. Reminder dispatch failures are monitored; a sustained failure rate triggers operational investigation and may indicate a configuration issue (invalid patient contact information) or an infrastructure issue (channel outage).

Offline operation is supported for appointment viewing and limited booking at facilities with intermittent connectivity. A provider can view their schedule offline, with the schedule cached locally on the client device; new bookings made offline are queued for synchronization when connectivity is restored, with conflict detection performed at synchronization time. A booking made offline that conflicts with a booking made online by another user is resolved per the tenant's conflict resolution policy — typically, the offline booking is rejected and the user is notified, honoring Principle P5 (Consistency Over Availability for Clinical Data, SYSTEM_ARCHITECTURE Section 4.6) for appointment state.

---

## 18. Related Documents

### 18.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (M06 Scheduling, BC06)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P2, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC06 Scheduling)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface

### 18.2 Peer Module References

- PATIENTS.md — Patient module (BC01); provides patient identity, contact, and preferences for booking
- BILLING.md — Billing module (BC07); consumes appointment status for billing eligibility
- CRM.md — CRM module (BC11); consumes appointment data for outreach analytics
- DOCTORS.md — Workforce module (BC10); provides provider qualifications and schedule
- RECEPTION.md — Reception module (subset of BC06 + BC01); consumes appointment schedule for check-in
- ACCOUNTING.md — Accounting module (BC08); consumes appointment data for revenue recognition
- AUDIT_LOGS.md — Audit module (BC17); records every consequential appointment-related action

### 18.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit
