# Ibn Hayan Healthcare Operating System
## Doctors Module

| Field | Value |
|---|---|
| Document Title | Doctors Module Reference (Workforce — Providers and Staff) |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, workforce planners, credentialing officers, operations leads |
| Scope | Provider and staff profiles, credentialing and privilege management, schedule and shift planning, time-off management, productivity tracking, patient panel management, on-call rotation, performance metrics, and compensation rules for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, payroll execution (owned by HR module), appointment scheduling execution (owned by Scheduling module), clinical documentation authoring |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Doctor Profiles
5. Specializations & Credentials
6. Schedules & Availability
7. Performance Metrics
8. Compensation Management
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

The Doctors module (M09 in this documentation suite, aligned with the Workforce bounded context BC10 as catalogued in SYSTEM_ARCHITECTURE Section 7.2) is the workforce management engine of the Ibn Hayan Healthcare Operating System. Every clinical and operational resource that delivers care or supports care delivery — physicians, nurses, allied health professionals, technicians, pharmacists, receptionists, schedulers — is registered, credentialed, scheduled, and performance-tracked through this module. The Doctors module is the operational foundation for human resource allocation in healthcare; without a functioning workforce capability, a healthcare organization cannot match clinical capacity to patient demand.

Ibn Hayan treats workforce management as a clinical-adjacent concern rather than as a peripheral HR utility. This positioning has direct architectural consequences: workforce is owned by a single bounded context, accessed by every module that needs provider or staff information through published contracts, and integrated with the scheduling, billing, and clinical documentation modules that depend on provider attribution. A provider registered in Ibn Hayan is a long-lived workforce entity whose credentials, privileges, schedule, and performance history are tracked over the provider's entire tenure with the organization.

### 1.2 Purpose and Business Value

The Doctors module exists to ensure that the right provider with the right credentials is available at the right time to deliver the right care, in a way that respects clinical safety, regulatory requirements, provider well-being, and operational efficiency. Business value is realized through four mechanisms. First, credentialing and privilege management prevents the operational and legal risk of providers delivering care outside their authorized scope — a provider without current credentialing cannot be scheduled for clinical work, enforced at the Scheduling module level. Second, schedule and shift management matches workforce capacity to patient demand, minimizing both over-staffing (wasted cost) and under-staffing (compromised access and provider burnout). Third, productivity tracking surfaces high-performing providers for recognition and low-performing providers for support, with productivity metrics computed consistently across the organization. Fourth, patient panel management enables continuity of care by maintaining the provider-patient relationship over time.

For customers, the Doctors module is the operational workforce layer: a clinic that cannot manage its workforce cannot deliver care reliably. For regulators, the Doctors module is the source of truth for provider credentialing, scope of practice, and workload compliance. For providers, the Doctors module — through schedule visibility, time-off requests, and performance feedback — shapes the provider's daily work experience.

### 1.3 Bounded Context Alignment

The Doctors module aligns one-to-one with the Workforce bounded context BC10, as catalogued in SYSTEM_ARCHITECTURE Section 7.2 and elaborated in MODULE_ARCHITECTURE Section 2.2. BC10 owns provider and staff profiles, credentials and privileges, schedules and shifts, time-off management, productivity tracking, patient panel management, on-call rotation, and performance metrics; it does not own payroll (BC12 HR), appointment scheduling execution (BC06 Scheduling), or clinical documentation (BC03 Clinical Documentation). The Workforce bounded context is a customer in customer-supplier relationships with the Patient, Configuration, and Localization contexts; it is a supplier in customer-supplier relationships with the Scheduling, Billing, Clinical Documentation, and Reporting contexts.

This alignment is stable. Per Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8), the Workforce bounded context is not reorganized to accommodate features. New workforce-related capabilities — for example, a new credential type, a new shift pattern, a new productivity metric — are accommodated within the existing context through configuration, not through structural change.

### 1.4 Module Composition

The Doctors module is composed of the following capability areas, each elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: provider and staff profiles, credentialing and privilege management, schedule and shift planning, time-off management, productivity tracking, patient panel management, on-call rotation, coverage rules, performance metrics, and compensation rules. The module does not own payroll execution, appointment scheduling, or clinical documentation; it owns the workforce identity and capacity that those modules reference. The module participates in workflows owned by other modules through its published event and query contracts.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the provider or staff member as organizing concepts; capabilities that do not share these organizing concepts belong in other modules. Compensation rules, for example, live in the Doctors module because compensation is configured per provider role and per productivity metric; payroll execution lives in the HR module because payroll is an enterprise financial process, not a workforce capacity concern. This separation prevents the Doctors module from accumulating financial execution logic that would compromise its contract stability over time.

The boundary between the Doctors module and the HR module is particularly important to document clearly, because both modules deal with workforce-related concerns and could easily blur without architectural discipline. The Doctors module owns what the provider is (identity, credentials, schedule, productivity); the HR module owns what the organization owes the provider (payroll, benefits, tax). The two modules communicate through compensation events, with each module evolving independently within its bounded context.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The Doctors module owns provider and staff lifecycle from onboarding through separation. It owns credentialing and privilege management — tracking credentials (medical licenses, board certifications, DEA registrations, malpractice insurance), privileges (facility-specific authorizations to perform specific procedures or care for specific patient populations), and credentialing status (application pending, verified, expiring, expired, revoked). It owns schedule and shift management — defining shift templates, assigning providers to shifts, managing schedule overrides, and surfacing coverage gaps. It owns time-off requests and approvals, with configurable approval workflows per role and per time-off category (vacation, sick, conference, personal). It owns productivity tracking — capturing provider activity (encounters, procedures, relative value units) and computing productivity metrics per configurable definitions. It owns patient panel management — maintaining the provider-patient relationship for continuity of care and panel-based performance reporting.

The module also owns on-call rotation management — defining on-call schedules, managing on-call coverage during off-hours, and tracking on-call activity for compensation and performance reporting. It owns coverage rules — defining how coverage is maintained when a provider is unavailable (cross-coverage by another provider, temporary reassignment, external locum coverage). It owns performance metrics — beyond productivity, including patient satisfaction scores, clinical quality metrics, and peer review outcomes. It owns compensation rules — configurable rules that define how provider compensation is computed from productivity and performance metrics, with the actual payroll execution owned by the HR module.

### 2.2 Out of Scope

The Doctors module does not own payroll execution, tax withholding, or benefit administration; these belong to the HR bounded context (BC12). It does not own appointment scheduling execution — the Doctors module owns provider availability (when the provider is scheduled to work), but the Scheduling module owns appointment booking (which patients are scheduled during those work hours). It does not own clinical documentation, clinical decision-making, or clinical outcomes authoring; these belong to the Clinical Documentation and Encounter bounded contexts, with the Doctors module providing provider attribution. It does not own patient identity; this belongs to the Patient bounded context, with the Doctors module providing provider identity for the patient-provider relationship.

The module also does not own recruitment (a pre-onboarding capability that may use external systems), training content authoring (a learning management capability), or audit storage (that belongs to the Audit bounded context). The Doctors module publishes events that the Audit module records, but it does not store audit records itself.

### 2.3 Provider as Clinical Capacity

The provider is the clinical capacity unit in the Ibn Hayan platform. Every appointment, every encounter, every clinical document, every order carries a provider attribution that links back to a provider identity owned by this module. The Doctors module is the canonical source of provider identity; every other module that needs provider information queries this module's contracts or subscribes to its events.

This central positioning imposes responsibilities on the Doctors module. The module's data must be strongly consistent within a provider's profile, because inconsistent credential or privilege data produces scheduling and billing errors that may have regulatory consequences (Principle P5, SYSTEM_ARCHITECTURE Section 4.6). The module's credentialing and privilege state must be current, because expired credentials or revoked privileges must immediately prevent the provider from being scheduled for affected clinical work. The module's audit must be complete, because credentialing decisions and privilege grants are subject to regulatory scrutiny.

### 2.4 Multi-Tenant and Multi-Facility Workforce

Provider and staff data is tenant-isolated by default. A provider registered in tenant A is not visible to tenant B, even when the provider is the same natural person (a provider who practices at multiple organizations, each on Ibn Hayan, has separate provider profiles per tenant). Within a tenant, providers are facility-scoped: a provider may be credentialed at one facility but not at another, may have privileges at one facility that they do not have at another, and may have different schedules at different facilities. Multi-facility tenants rely on facility-level credentialing and privilege management as a primary regulatory safeguard.

Cross-tenant provider sharing is not supported. A provider who practices at multiple organizations maintains separate profiles, separate credentialing records, and separate schedules in each tenant. This isolation honors Principle P10 (Multi-Tenancy as Default, SYSTEM_ARCHITECTURE Section 4.10) and prevents the privacy and credentialing complications that would arise from cross-tenant provider visibility.

---

## 3. Key Features

### 3.1 Provider Profiles

Provider profiles maintain the identity, qualifications, and operational attributes of every clinical and operational resource in the tenant. A provider profile includes demographic information (name, contact, photograph), professional identity (license number, NPI or regional equivalent, board certifications), organizational attributes (facility, department, role, reporting structure), and operational attributes (schedule template, patient panel, on-call rotation). Profiles are versioned, with effective-dating for changes; a provider's role change takes effect on the configured date, with historical data preserved.

### 3.2 Credentialing

Credentialing tracks the provider's professional credentials — medical licenses, board certifications, DEA registrations, malpractice insurance, controlled substance certificates, and other credentials required by the tenant's regulatory framework. Each credential has a type, an issuing authority, an issue date, an expiration date, and a verification status (application pending, primary-source verified, expiring, expired, revoked). Credentialing status drives scheduling eligibility — a provider without current credentialing cannot be scheduled for clinical work that requires that credential, enforced at the Scheduling module level through query contracts to the Doctors module.

### 3.3 Privilege Management

Privilege management tracks the provider's facility-specific authorizations to perform specific procedures or care for specific patient populations. Privileges differ from credentials — credentials are issued by external authorities (licensing boards, certification bodies), while privileges are granted by the facility's medical staff office. A provider may be credentialed to perform a procedure in general but not privileged to perform it at a specific facility. Privilege management includes privilege application, privilege committee review, privilege grant, privilege expiration, and privilege revocation workflows, with full audit of each step.

### 3.4 Schedule Management

Schedule management defines the provider's working hours — when the provider is scheduled to be available for clinical work, administrative work, or on-call duty. Schedules are defined through shift templates that specify recurring availability patterns (similar to the Scheduling module's slot templates, but at the provider-shift level rather than the patient-appointment level). Schedule changes are versioned and effective-dated; a schedule change does not affect already-booked appointments, which are preserved against their original schedule.

### 3.5 Shift Planning

Shift planning assigns providers to specific shifts within a schedule, with shifts defined by start time, end time, role, and facility. Shift planning supports coverage rules — minimum staffing levels per role per shift, skill mix requirements (a shift must have at least one senior physician, at least two nurses), and continuity requirements (a shift should include providers who have recent experience with the unit's patients). Shift planning surfaces coverage gaps and skill mix violations for resolution before the shift begins.

### 3.6 Time-Off Requests

Time-off requests allow providers to request time off for vacation, sick leave, conference attendance, or personal reasons. Requests are submitted through the patient portal-like provider surface, are routed to the appropriate approver (typically the provider's supervisor or the schedule manager), and are approved or denied based on coverage rules and prior time-off commitments. Approved time-off requests produce schedule overrides that block the affected time from booking. Time-off requests are tracked for accrual and usage reporting.

### 3.7 Productivity Tracking

Productivity tracking captures provider activity — encounters completed, procedures performed, relative value units (RVUs) earned, hours worked — and computes productivity metrics per configurable definitions. Productivity metrics may include encounters per hour, RVUs per shift, panel size, no-show rate, and patient satisfaction score. Productivity tracking is the basis for compensation computation (where compensation is productivity-linked) and for performance feedback. Productivity data is sourced from peer modules — the Scheduling and Encounter modules provide encounter data, the Clinical Documentation module provides documentation data, the Billing module provides charge data.

### 3.8 Patient Panel Management

Patient panel management maintains the provider-patient relationship for continuity of care and panel-based performance reporting. A patient panel is the set of patients for whom a provider has primary care responsibility, with panel assignment recorded with effective-dating and change tracking. Panel management supports panel size monitoring (a provider with too large a panel cannot deliver timely care), panel composition analysis (a provider's panel by age, sex, condition), and panel-based performance reporting (a provider's outcomes for their panel).

### 3.9 On-Call Rotation

On-call rotation management defines the schedule of providers available for after-hours clinical needs, with on-call shifts assigned to providers on a rotating basis per configurable rules. On-call rotation includes primary on-call (first responder), secondary on-call (backup), and triage on-call (initial assessment before provider contact). On-call activity — calls received, calls returned, in-person visits — is tracked for compensation and for performance reporting. On-call rotation is essential for clinic types that provide after-hours coverage (emergency, hospitalist, surgical specialties).

### 3.10 Coverage Rules

Coverage rules define how clinical coverage is maintained when a provider is unavailable — scheduled time-off, unexpected absence, or surge demand. Coverage options include cross-coverage by another provider within the same facility, temporary reassignment from another facility, external locum coverage, and telehealth coverage. Coverage rules are configurable per role, per shift, per clinic type, and per facility, with rules prioritized by cost and clinical appropriateness. Coverage rule violations are surfaced for resolution before the coverage gap impacts patient care.

### 3.11 Performance Metrics

Performance metrics capture provider performance beyond productivity — patient satisfaction scores (from the CRM module's feedback data), clinical quality metrics (from the Clinical Documentation and Orders & Results modules), peer review outcomes, and adherence to clinical guidelines. Performance metrics are computed per configurable definitions, with metric definitions configurable per role, per clinic type, and per tenant. Performance metrics are the basis for performance feedback, for compensation-linked performance payments, and for credentialing and privilege renewal decisions.

### 3.12 Compensation Rules

Compensation rules define how provider compensation is computed from productivity and performance metrics. Compensation rules are highly configurable — a tenant may have a salary-only model (compensation independent of productivity), a productivity-linked model (compensation proportional to RVUs or encounters), a performance-linked model (compensation includes bonuses for quality metrics), or a hybrid model. Compensation rules are configurable per role, per provider, and per tenant. Compensation computation produces compensation events that the HR module consumes for payroll execution; the Doctors module does not execute payroll.

---

## 4. Doctor Profiles

### 4.1 Profile Composition

A provider profile is composed of demographic information (name, contact, photograph, biographical narrative for patient-facing display), professional identity (license number, NPI or regional equivalent, board certifications, education, training history), organizational attributes (facility, department, role, reporting structure, employment status), and operational attributes (schedule template, patient panel, on-call rotation, productivity metrics). Profile composition is configurable per role — a physician profile captures clinical credentials that a receptionist profile does not, a nurse profile captures nursing credentials that a scheduler profile does not. Profile composition is validated against regulatory constraints — capture of certain attributes (e.g., immigration status) may be prohibited in some jurisdictions.

### 4.2 Profile Lifecycle

A provider profile has a lifecycle from creation through separation. The lifecycle stages include candidate (pre-onboarding, not yet authorized for clinical work), onboarded (profile created, initial credentialing in progress), active (fully credentialed and authorized for clinical work), suspended (temporarily not authorized, pending investigation or administrative action), separated (no longer employed, profile preserved for historical reference). Lifecycle transitions are governed by configurable workflows — onboarding workflow includes credentialing verification and orientation; separation workflow includes offboarding, exit interview, and final payroll processing. Lifecycle transitions are audited, with the actor, the time, and the reason recorded.

### 4.3 Profile Visibility

Profile visibility is governed by the permission framework. A provider's full profile is visible to the provider themselves, to their supervisor, to HR staff, and to system administrators. A subset of the profile — name, role, photograph, biographical narrative, schedule availability — is visible to patients through the patient portal. Another subset — name, role, credentials, privileges, schedule — is visible to operational staff (receptionists, schedulers) for operational purposes. Profile visibility is configurable per role and per attribute, with sensitive attributes (compensation, performance metrics, disciplinary history) restricted to authorized roles.

### 4.4 Profile Updates and Audit

Profile updates are versioned and audited. Every profile change — demographic update, credential addition, privilege grant, role change, schedule modification — is recorded with the actor, the time, the previous value, the new value, and the authorization basis. Profile history is queryable; a provider's credential history, privilege history, and role history are available for compliance reporting and for dispute resolution. Profile changes that affect downstream workflows — a privilege grant, a schedule change, a separation — trigger events that peer modules consume.

Profile update audit is particularly consequential for credentialing and privilege changes, which are subject to regulatory scrutiny. A regulator investigating a clinical event may require reconstruction of the provider's credentialing and privilege state at the time of the event — was the provider's license current, was the provider privileged for the procedure performed, were there any pending disciplinary actions? The audit trail supports this reconstruction, with each credential and privilege change traceable to its actor, time, and authorization basis. Profile audit records are immutable, append-only, and tamper-evident, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

---

## 5. Specializations & Credentials

### 5.1 Credential Catalogue

The credential catalogue defines the credential types that the Doctors module tracks. Credential types include medical licenses (state, national, regional), board certifications (primary specialty, subspecialty), DEA registrations (for controlled substance prescribing), malpractice insurance (carrier, policy number, limits), controlled substance certificates, training certificates (ACLS, BLS, PALS, ATLS), and other credentials required by the tenant's regulatory framework or by the facility's medical staff bylaws. The credential catalogue is configurable per tenant, per facility, and per role, with credential requirements varying by clinic type and by jurisdiction.

### 5.2 Credential Verification

Credential verification confirms that a credential is valid and current, through primary-source verification (direct confirmation with the issuing authority). Verification status includes application pending (credential submitted, verification not yet complete), primary-source verified (issuing authority confirmed), expiring (verification expiring within a configured window), expired (verification has expired, credential not current), and revoked (credential has been revoked by the issuing authority). Verification cadence is configurable per credential type, with high-risk credentials (controlled substance, malpractice) verified more frequently than low-risk credentials.

### 5.3 Credential Expiration Management

Credential expiration management surfaces credentials that are approaching expiration, allowing the provider and the medical staff office to initiate renewal before expiration. Expiration warnings are dispatched at configurable intervals (90 days, 60 days, 30 days before expiration) through the Notifications module. A credential that has expired immediately affects the provider's scheduling eligibility — the Scheduling module queries the Doctors module's contracts before booking and refuses to book a provider without current credentialing for the appointment type. Expiration management is the operational safeguard against credentialing gaps that would compromise regulatory compliance.

### 5.4 Privilege Management Workflow

The privilege management workflow handles privilege applications, committee review, grant decisions, and renewal or revocation. A privilege application is initiated by the provider or by the medical staff office, with supporting documentation (case logs, training certificates, peer recommendations). The application is routed to the privilege committee for review, with the committee's decision recorded with the decision rationale. A privilege grant authorizes the provider to perform the privileged procedure or care for the privileged patient population at the facility. Privilege renewal occurs on a configurable cycle (typically every two years), with renewal requiring updated documentation and committee review. Privilege revocation is a serious action that immediately removes the provider's authorization, with revocation recorded with the reason and the actor.

Privilege management is distinguished from credentialing by the locus of authority — credentials are issued by external authorities (licensing boards, certification bodies), while privileges are granted by the facility's medical staff office. The Doctors module's privilege workflow enforces this distinction operationally: credential verification queries external sources through the Integration module, while privilege decisions are made by internal users with configured authority. The distinction is enforced through separate contract surfaces for credential verification and privilege management, preventing privilege decisions from being made through credential verification paths and vice versa.

---

## 6. Schedules & Availability

### 6.1 Schedule Templates

Schedule templates define recurring availability patterns for providers. A template specifies the days of the week, the start and end times, the shift type (clinical, administrative, on-call, telehealth), and the effective period. Templates are versioned, with effective-dating for changes; a template change does not affect already-booked appointments, which are preserved against their original template. Schedule templates are consumed by the Scheduling module, which uses them to generate bookable slots for patient appointments.

### 6.2 Shift Assignment

Shift assignment assigns providers to specific shifts within a schedule. A shift is a specific time period during which the provider is scheduled to work a specific role at a specific facility. Shift assignments are made by schedule managers (typically the scheduler role) based on coverage rules, skill mix requirements, and provider preferences. Shift assignments are versioned and audited; a shift change is recorded with the actor, the time, and the reason. Shift assignments are visible to the provider through their schedule view and to operational staff through the facility schedule view.

### 6.3 Availability Exceptions

Availability exceptions manage deviations from the schedule template — provider time-off, schedule overrides for special events, temporary reassignments, and unexpected absences. An exception blocks the affected time from booking and, where applicable, triggers rescheduling of already-booked appointments through the Scheduling module. Exceptions are versioned, audited, and configurable per provider, per facility, per date range, and per exception reason. Exception management is essential for maintaining schedule integrity over time, as provider availability is not static.

### 6.4 Coverage Management

Coverage management ensures that clinical coverage is maintained across all scheduled shifts, with coverage gaps surfaced for resolution before they impact patient care. Coverage rules specify minimum staffing levels per role per shift, skill mix requirements, and continuity requirements. Coverage management runs continuously, evaluating current and future shifts against coverage rules and surfacing violations. Coverage violations may be resolved through cross-coverage (another provider covers the shift), temporary reassignment (a provider from another facility covers), external locum coverage, or telehealth coverage, with the resolution tracked for cost and quality analysis.

Coverage management in Ibn Hayan is the operational expression of Principle P1 (Healthcare Safety Overrides All Others, SYSTEM_ARCHITECTURE Section 4.2) applied to workforce capacity. An uncovered shift is not merely an operational inconvenience; it is a patient safety risk, because patients who present during an uncovered shift may receive delayed care. Coverage violations are therefore surfaced with high priority, with notification routed to schedule managers and facility administrators for immediate resolution. Coverage violation trends are analyzed to identify systemic staffing shortfalls that may require workforce expansion.

---

## 7. Performance Metrics

### 7.1 Productivity Metrics

Productivity metrics capture the provider's clinical output — encounters completed, procedures performed, RVUs earned, hours worked, patients seen per hour, documentation turnaround time. Productivity metrics are computed from data sourced from peer modules — the Scheduling and Encounter modules provide encounter data, the Clinical Documentation module provides documentation data, the Billing module provides charge data. Productivity metrics are computed per configurable definitions, with definitions varying by role (a physician's productivity is measured differently from a nurse's productivity) and by clinic type (a primary care physician's productivity is measured differently from a surgeon's productivity).

### 7.2 Quality Metrics

Quality metrics capture the provider's clinical quality — adherence to clinical guidelines, outcome measures (mortality, readmission, complication rates), process measures (preventive care delivery, chronic disease management), and patient safety indicators. Quality metrics are computed from clinical data sourced from the Clinical Documentation, Orders & Results, and Pharmacy modules. Quality metrics are subject to regulatory reporting in many jurisdictions, with metric definitions aligned to regional regulatory frameworks. Quality metric computation is governed by clinical governance, with metric definitions reviewed by clinical leadership.

### 7.3 Patient Experience Metrics

Patient experience metrics capture the provider's patient experience performance — patient satisfaction scores, patient complaints, patient compliments, communication effectiveness ratings. Patient experience metrics are sourced from the CRM module's feedback data, with feedback attributed to the provider through encounter context. Patient experience metrics are trended over time to identify improvement or degradation, with significant degradation triggering operational review. Patient experience metrics are subject to regulatory reporting in some jurisdictions, particularly for value-based care programs.

### 7.4 Peer Review

Peer review captures the provider's peer evaluation — case reviews by peers, morbidity and mortality conference participation, peer committee service. Peer review outcomes may influence credentialing and privilege renewal decisions, with serious concerns escalated to the medical staff office and the credentialing committee. Peer review is governed by confidentiality and legal privilege in many jurisdictions, with peer review records subject to restricted access and special retention rules. The Doctors module's peer review capability is configured per region through the Localization module's configuration surface, expressing the regional legal framework.

Peer review records are subject to the strictest access controls in the Doctors module, because peer review content is legally protected in many jurisdictions and its disclosure could compromise the peer review process. Access to peer review records is restricted to peer committee members, the medical staff office, and the compliance officer role, with access audited at the record level (every access to a peer review record is itself audited). Peer review records are retained per the regulatory framework in force, with retention periods often longer than for other workforce records due to the legal protection they carry.

---

## 8. Compensation Management

### 8.1 Compensation Models

Compensation models define how provider compensation is computed. Models include salary-only (fixed compensation independent of productivity), productivity-linked (compensation proportional to RVUs, encounters, or other productivity measures), performance-linked (compensation includes bonuses for quality metrics, patient experience metrics, or other performance measures), and hybrid models combining multiple elements. Compensation models are configurable per role, per provider, and per tenant, with model selection driven by the organization's compensation philosophy and by market benchmarks.

### 8.2 Compensation Rule Configuration

Compensation rule configuration specifies the parameters of the compensation model — the base salary, the productivity rate per unit, the performance bonus thresholds, the cap on variable compensation, the periodicity of computation (per pay period, per month, per quarter, per year). Configuration is layered per the model in PRODUCT_BIBLE Section 22.3, with platform defaults inherited by edition, tenant, facility, department, and provider overrides where applicable. Compensation rules are versioned and audited; a rule change is recorded with the actor, the time, the previous rule, and the new rule, with effective-dating for the change.

### 8.3 Compensation Computation

Compensation computation applies the configured compensation rules to the provider's productivity and performance data, producing a compensation amount for the computation period. Computation is automated, with the Doctors module sourcing productivity data from peer modules, applying the configured rules, and producing compensation events. Computation is subject to validation — a compensation amount that exceeds configured thresholds is flagged for review, a computation that produces an unexpected result (a significant change from prior periods) is surfaced for investigation. Computation results are surfaced to the provider, to the provider's supervisor, and to HR for payroll execution.

### 8.4 Compensation Event Publication

Compensation event publication communicates compensation computation results to the HR module for payroll execution. The compensation event includes the provider, the computation period, the compensation amount, the components of the amount (base, productivity, performance), and the computation metadata (rule version, computation time). The HR module consumes the event and incorporates the compensation amount into the payroll cycle. Compensation event publication is audited; the event, the consumer, and the consumption confirmation are recorded. Compensation events are immutable once published; corrections are made through subsequent compensation events (positive or negative adjustments), preserving the audit trail.

The separation between compensation computation (owned by the Doctors module) and payroll execution (owned by the HR module) honors the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Compensation is a workforce concern — it is configured per provider role and computed from workforce productivity; payroll is an enterprise financial concern — it incorporates tax withholding, benefit deductions, garnishments, and other financial adjustments that are not workforce-specific. The two modules communicate through the compensation event contract, with each module evolving its internal logic without coordinating with the other, as long as the contract is honored.

---

## 9. User Roles

### 9.1 Roles That Interact with Workforce

The following roles interact with workforce through the Doctors module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2.

| Role Code | Role | Typical Workforce-Related Responsibilities |
|---|---|---|
| R01 | Physician | View own profile, schedule, performance; submit time-off requests |
| R02 | Nurse | View own profile, schedule; submit time-off requests |
| R03 | Pharmacist | View own profile, schedule; submit time-off requests |
| R04 | Technician | View own profile, schedule; submit time-off requests |
| R05 | Allied health professional | View own profile, schedule; submit time-off requests |
| R06 | Receptionist | View provider schedules for booking; view provider profile subset |
| R07 | Scheduler | Manage shift assignments; manage coverage; approve time-off |
| R09 | Administrator | Workforce oversight; credentialing management; performance review |
| R10 | Compliance officer | Credentialing audit; privilege review; performance audit |
| R11 | HR manager | Compensation rule oversight; separation management |
| R12 | Executive | Workforce strategy; productivity and performance review |
| R13 | System administrator | Tenant configuration of workforce behaviour |
| R14 | Integration account | System-to-system workforce data sync |

### 9.2 Permission Categories

Permissions on workforce resources are defined at the action level on the workforce resource, per PRODUCT_BIBLE Section 21.2. Read permissions include viewing provider profile, viewing schedule, viewing credentials, viewing privileges, viewing performance metrics, viewing compensation rules. Write permissions include creating provider profile, updating credentials, granting privileges, assigning shifts, approving time-off, recording performance. Execute permissions include productivity computation, compensation computation, credential verification. Administer permissions include configuring credential types, configuring privilege workflows, configuring compensation rules, configuring coverage rules.

### 9.3 Credentialing Authority

Credentialing authority governs who may verify credentials, grant privileges, and modify credentialing status. Authority is granted selectively — typically to the medical staff office, to the credentialing committee, and to senior clinical leadership — and is recorded with the credentialing decision, the decision rationale, and the authorization basis. Credentialing authority is reviewed periodically by the compliance officer, with frequent credentialing changes triggering investigation into the underlying credentialing process. Credentialing authority is governed by the Identity & Access module's contracts, with the Doctors module enforcing the authority scope and recording the audit event.

---

## 10. Workflows

### 10.1 Workflows the Module Triggers

The Doctors module triggers workflows in response to workforce lifecycle events. Provider onboarding triggers credentialing verification, schedule template creation, and patient panel initialization. Credential expiration triggers renewal reminder workflow and, if not renewed, scheduling eligibility restriction. Privilege grant triggers scheduling authorization update for the privileged procedures. Schedule change triggers Scheduling module slot template update and, where applicable, appointment rescheduling. Time-off approval triggers schedule override creation and appointment rescheduling. Separation triggers offboarding workflow, schedule cancellation, patient panel reassignment, and final compensation computation.

### 10.2 Workflows the Module Participates In

The Doctors module participates in workflows owned by other modules by responding to queries and by consuming events. The Scheduling module queries the Doctors module for provider qualifications and availability at booking time. The Encounter module queries the Doctors module for provider attribution when an encounter is opened. The Billing module queries the Doctors module for provider identity at claim generation. The Clinical Documentation module queries the Doctors module for provider context when a note is authored. The CRM module consumes provider data for performance attribution. The Reporting module consumes provider data for productivity and performance analytics. The HR module consumes compensation events for payroll execution.

### 10.3 Audit Events Generated

The Doctors module generates audit events for every consequential action, in keeping with the audit architecture defined in SYSTEM_ARCHITECTURE Section 27. Audit events include provider creation, profile update, credential addition, credential verification, credential expiration, credential revocation, privilege grant, privilege revocation, schedule template creation, schedule change, shift assignment, time-off request, time-off approval, time-off denial, on-call assignment, patient panel change, performance metric computation, compensation rule change, compensation computation, provider suspension, and provider separation. Every audit event includes the actor, the action, the resource, the tenant, the scope, the previous state, the new state, the authorization basis, the result, and the context, per the audit record structure in SYSTEM_ARCHITECTURE Section 27.4.

Workforce audit events are particularly important for regulatory compliance and clinical safety. Every credentialing decision is traceable from application through verification, grant, renewal, and revocation. Every privilege decision is traceable from application through committee review, grant, and revocation. Every compensation decision is traceable from rule configuration through computation to payroll execution. Workforce audit records are immutable, append-only, and tamper-evident, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

---

## 11. Data Models

### 11.1 Core Entities

The Doctors module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Provider | The canonical provider or staff identity |
| Staff Member | The non-clinical staff identity (where distinct from Provider) |
| Credential | A professional credential held by a provider |
| Schedule | A provider's availability over a period |
| Time Off | A recorded absence from scheduled work |
| Shift | A specific work assignment within a schedule |
| Assignment | A patient panel or facility assignment for a provider |
| Performance Review | A periodic review of a provider's performance |

### 11.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Privilege record documents a facility-specific authorization. The Shift Template defines recurring shift patterns. The Coverage Rule specifies minimum staffing and skill mix requirements. The On-Call Rotation defines the on-call schedule. The Productivity Metric captures provider activity data. The Quality Metric captures clinical quality data. The Compensation Rule defines how compensation is computed. The Compensation Event documents a compensation computation result. The Credential Verification record documents primary-source verification.

### 11.3 Entity Relationships

Core entities relate to the Provider entity as the central workforce object. A Credential references a Provider. A Schedule references a Provider and produces Shifts. A Shift references a Provider, a Schedule, a Facility, and a Role. A Time Off references a Provider and a Schedule. An Assignment references a Provider and (for patient panel assignments) a Patient (owned by the Patients module). A Performance Review references a Provider and includes Productivity Metrics, Quality Metrics, and patient experience data. References to peer-module entities are logical identifiers, not direct data-store references (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8).

The Provider entity is the aggregate root for the bounded context (per the aggregate boundary principle in MODULE_ARCHITECTURE Section 11.3). All other entities reference a Provider and cannot exist independently. A Credential without a Provider is a defect; a Shift without a Provider is a defect. The aggregate boundary ensures that workforce-related state changes are atomic — a credential update either completes successfully (with all related entities updated consistently) or fails completely. Atomicity is critical for clinical safety: a partial credential update that updates the credential record but not the scheduling eligibility record would allow a provider to be scheduled for clinical work they are not authorized to perform.

---

## 12. Integrations

### 12.1 Peer Module Integrations

The Doctors module integrates with peer modules through published contracts. The Scheduling module queries the Doctors module for provider qualifications, availability, and scheduling eligibility. The Encounter module queries the Doctors module for provider attribution. The Billing module queries the Doctors module for provider identity at claim generation, including the provider's NPI or regional equivalent for claim submission. The Clinical Documentation module queries the Doctors module for provider context. The CRM module consumes provider data for performance attribution in feedback and outreach. The HR module consumes compensation events for payroll execution. The Reporting module consumes provider data for productivity, performance, and workforce analytics.

### 12.2 External System Integrations

External system integrations are mediated by the Integration module (deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the Doctors module's contracts through integration adapters that align with healthcare workforce interoperability standards — HL7 FHIR for provider information exchange (Practitioner, PractitionerRole resources), regional credentialing verification interfaces, and external credentialing service interfaces. The Integration module also interfaces with external scheduling systems, time-clock systems, and payroll systems for data exchange. The Doctors module is not aware of the specific external systems; it is aware only of the Integration module's contracts.

### 12.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Synchronous command is used for profile updates, credential changes, and privilege grants where immediate confirmation is required. Synchronous query is used for provider availability, qualifications, and scheduling eligibility lookup. Asynchronous event is used for workforce lifecycle events (onboarding, credential change, separation) that peer modules consume. The outbox pattern is used for compensation events, ensuring that compensation computation results are reliably delivered to the HR module. Anticorruption layers translate between external workforce system models and the Ibn Hayan workforce model, preventing external model leakage per the context relationship pattern in SYSTEM_ARCHITECTURE Section 7.3.

---

## 13. Configuration

### 13.1 Configuration Categories

The Doctors module's configuration surface is organized into the categories defined in MODULE_ARCHITECTURE Section 10.3. Behavioural configuration includes credential type catalogues, privilege workflow definitions, schedule template rules, coverage rules, productivity metric definitions, quality metric definitions, and compensation rule templates. Structural configuration includes feature flags for capabilities like on-call rotation, patient panel management, and performance-linked compensation. Integration configuration includes external credentialing service endpoints, payroll system interfaces, and time-clock system interfaces. Localization configuration includes credential type naming per region, regional regulatory framework selection, and language preferences for provider-facing surfaces. Security configuration includes credentialing authority scoping, privilege approval workflow configuration, and compensation data access scoping. Regulatory configuration includes credentialing verification cadence per credential type, privilege renewal cycle, and credential retention policies.

### 13.2 Tenant-Configurable vs Platform-Configurable

The configuration surface distinguishes between tenant-configurable categories and platform-configurable categories, per MODULE_ARCHITECTURE Section 10.3. Tenant-configurable categories include credential type catalogues, schedule templates, coverage rules, and compensation rules; these may be overridden by tenant administrators within validation constraints. Platform-configurable categories include the provider state machine, the credentialing workflow invariants, the audit record structure, and the segregation-of-duty controls for credentialing decisions; these are reserved for the platform and may not be overridden by tenants. The distinction is enforced by the Configuration module's service and is part of the configuration schema published by the Doctors module.

### 13.3 Configuration Governance

Configuration governance follows the framework defined in MODULE_ARCHITECTURE Section 10.5 and SYSTEM_ARCHITECTURE Section 8.7. Every configuration change is validated before application, audited on application, reversible through rollback, and reviewable through the audit trail. Changes that affect clinical safety — for example, a change to coverage rules that might compromise patient safety — require compliance review. Changes that affect regulatory compliance — for example, a change to credentialing verification cadence — require compliance officer review. Changes that affect compensation — for example, a change to compensation rules — require HR and executive review. The governance posture is documented in the module's configuration schema and is reviewed at architectural review.

---

## 14. Permissions

### 14.1 Action-Level Permissions on Workforce Resources

Permissions are defined at the action level on the workforce resource, per PRODUCT_BIBLE Section 21.2. The permission matrix includes read, write, execute, and administer actions on provider, credential, privilege, schedule, shift, time-off, performance, and compensation resources. The matrix is large but stable. Direct user-permission assignment is forbidden; permissions are assigned through roles, per PRODUCT_BIBLE Section 21.3.

### 14.2 Scoping Rules

Permissions are scoped, not global, per PRODUCT_BIBLE Section 21.4. A schedule manager may have write permission on schedules at their facility without having write permission on schedules at another facility. Scoping is by organizational unit, by facility, by department, by care team, and by provider (a schedule manager may be scoped to manage specific providers' schedules). Compensation data scoping is particularly stringent — a provider's compensation data is visible only to the provider, to the provider's supervisor, to HR, and to executive leadership, with operational staff excluded from compensation visibility regardless of their general facility-level permissions.

### 14.3 Permission Inheritance and Segregation of Duties

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 6.6 and PRODUCT_BIBLE Section 21.5. Inheritance is explicit, documented, and auditable. Segregation-of-duty controls are layered on top of inheritance, preventing the same user from holding conflicting permissions on credentialing decisions. A user who initiates a credential verification cannot be the user who approves the credential; a user who grants a privilege cannot be the user who records the privilege committee decision for the same privilege. Segregation-of-duty exclusions are configured per role combination and per credentialing scope, with the compliance officer role having visibility into the exclusions for review.

---

## 15. Reports

### 15.1 Operational Reports

Operational reports surface workforce activity for daily operational management. Reports include daily schedule by facility, coverage status, credentialing expiration queue, time-off request queue, on-call rotation status, and productivity snapshot. Operational reports are generated through the Reporting module's contracts, with the Doctors module providing the underlying data. Reports are typically consumed by schedule managers, facility administrators, and medical staff offices for day-to-day decisions.

### 15.2 Analytical Reports

Analytical reports surface workforce trends for strategic planning. Reports include provider productivity trends, quality metric trends, patient panel composition analysis, credentialing cycle time, compensation analysis by role and tenure, and workforce retention and turnover analysis. Analytical reports are generated through the Reporting module's analytical pipeline, with workforce data aggregated over time and across facilities.

### 15.3 Regulatory Reports

Regulatory reports surface workforce-related compliance evidence. Reports include credentialing verification audit, privilege grant audit, coverage compliance report (verifying that minimum staffing levels were maintained), and compensation compliance report (verifying that compensation rules were applied consistently). Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8.

---

## 16. API Surface

### 16.1 Contract Categories

The Doctors module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the Doctors module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 16.2 Command Contracts

Command contracts are requests to perform an action that changes workforce state. Examples include CreateProvider, UpdateProfile, AddCredential, VerifyCredential, GrantPrivilege, RevokePrivilege, AssignShift, ApproveTimeOff, ComputeProductivity, ComputeCompensation, SuspendProvider, SeparateProvider. Commands are synchronous where the caller requires immediate confirmation, asynchronous where the caller does not. Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the audit trail. Commands are idempotent where the operation supports idempotency.

### 16.3 Query Contracts

Query contracts are requests to retrieve workforce state without changing it. Examples include GetProvider, GetProviderSchedule, GetCredentialingStatus, GetPrivileges, GetAvailability, GetPatientPanel, GetProductivityMetrics, GetCompensation. Queries are synchronous, returning the requested state or a not-found response. Queries are scoped to the caller's authority — a caller without read permission on a provider's compensation data receives a not-found response rather than the data.

### 16.4 Event Contracts

Event contracts are notifications that something has happened in the Doctors module. Examples include ProviderOnboarded, ProfileUpdated, CredentialAdded, CredentialVerified, CredentialExpired, PrivilegeGranted, PrivilegeRevoked, ScheduleChanged, ShiftAssigned, TimeOffApproved, ProductivityComputed, CompensationComputed, ProviderSuspended, ProviderSeparated. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which peer modules maintain their local projections of workforce data.

### 16.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the Doctors module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy.

---

## 17. Future Enhancements

### 17.1 Extension Points

The Doctors module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom credential types (for credentials not in the platform default catalogue), custom privilege workflows (for facilities whose workflows differ from the default), custom productivity metrics (for organizations whose productivity measures are non-standard), and custom compensation rules (for organizations whose compensation models exceed the platform defaults). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

### 17.2 Module Lifecycle

The Doctors module is at the Mature stage of the module lifecycle (LC4, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6). The module has been in General Availability since the platform's Professional edition launch, has completed the defined period of stable operation required for transition to Mature, and has a long-term support commitment. The module's contracts are stable; breaking changes follow the platform's deprecation policy.

### 17.3 Edition Availability

The Doctors module is included in selected editions of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) does not include the Doctors module. The Essential edition (E1) includes basic provider profiles and schedule management for single-facility operation. The Professional edition (E2) adds credentialing, privilege management, productivity tracking, and patient panel management. The Enterprise edition (E3) adds on-call rotation, performance-linked compensation rules, multi-facility workforce management, and integration with external credentialing and payroll systems. Edition packaging does not modify module internals; all editions run the same code.

### 17.4 Clinic Type Relevance

The Doctors module is relevant to every clinic type catalogued in PRODUCT_BIBLE Section 18.2 that employs providers or staff. The following clinic types have particular reliance on advanced workforce module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C9 Single hospital | Multi-facility credentialing; on-call rotation; complex shift planning |
| C10 Hospital network | Multi-facility workforce management; cross-coverage rules |
| C18 Emergency department | 24/7 shift coverage; on-call rotation; surge capacity management |
| C20 Day surgery | Procedure-specific privileging; surgical team coordination |
| C21 Inpatient ward | Shift-based coverage; resident and attending coordination |
| C22 Intensive care unit | Specialized credentialing; intensivist coverage; high acuity staffing |
| C30 Long-term care facility | Long-tenure staff management; caregiver continuity |

### 17.5 Operational Considerations

Operational considerations for the Doctors module include credentialing data accuracy, schedule change propagation, and compensation computation integrity. Credentialing data accuracy is critical — a credentialing error that allows a provider to be scheduled without current credentialing produces regulatory violations and potential patient safety incidents. The module's credentialing data is reconciled against external credentialing sources at configurable intervals, with discrepancies surfaced for investigation.

Schedule change propagation is a concern for tenants with high schedule volatility — schedule changes must propagate to the Scheduling module, to the Notifications module (for provider notifications), and to peer modules that maintain provider projections, with propagation latency minimized to prevent stale data from producing booking errors. Compensation computation integrity is the most critical financial concern — compensation errors produce payroll errors that damage provider trust and may produce legal liability. Compensation computations are validated against historical trends, with significant deviations flagged for review before publication to the HR module. Offline operation is supported for limited workforce functions — schedule viewing, time-off request submission, and credential viewing can be performed offline, with synchronization to the central platform when connectivity is restored, in keeping with the offline-first principle (P11, SYSTEM_ARCHITECTURE Section 4.11) for non-clinical data.

---

## 18. Related Documents

### 18.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (M13 Workforce, BC10)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P2, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC10 Workforce)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface

### 18.2 Peer Module References

- PATIENTS.md — Patient module (BC01); provides patient identity for patient panel assignments
- APPOINTMENTS.md — Scheduling module (BC06); consumes provider availability for slot generation
- BILLING.md — Billing module (BC07); consumes provider identity for claim attribution
- CRM.md — CRM module (BC11); consumes provider data for performance attribution
- RECEPTION.md — Reception module (subset of BC06 + BC01); consumes provider schedules for check-in
- ACCOUNTING.md — Accounting module (BC08); consumes compensation events for payroll recording
- AUDIT_LOGS.md — Audit module (BC17); records every consequential workforce-related action

### 18.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit
