# Ibn Hayan Healthcare Operating System — Human Resources Module (M11)

| Field | Value |
|---|---|
| Document Title | HR Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Product leaders, HR domain owners, healthcare operations executives, facility administrators, compliance officers, integration architects |
| Scope | Human Resources capability: employee lifecycle, employment contracts, payroll configuration, leave, performance reviews, training, benefits, time and attendance, organizational structure, HR document management, onboarding, and offboarding |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, UI component catalogues, deployment runbooks, vendor selection, third-party payroll provider contracts, country-specific labour-law legal interpretation |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through product or architectural governance. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Employee Records
5. Attendance Management
6. Payroll
7. Leave Management
8. Performance Reviews
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

### 1.1 Purpose of the Module

The HR module is the administrative home for every person who works inside an Ibn Hayan customer organization, regardless of whether that person is a clinician, an allied health professional, a receptionist, a biller, a facility administrator, or a member of the executive team. The module exists because healthcare delivery is fundamentally a labour-intensive activity, and the discipline required to manage that labour — employment contracts, payroll, leave, performance, training, benefits, and compliance with labour law — is distinct from the discipline required to schedule clinical shifts or to credential clinicians for patient care. Ibn Hayan separates HR from workforce scheduling intentionally: HR owns the employment relationship end to end, from the day a candidate accepts an offer to the day the employment relationship ends, while the Workforce module owns the operational patterns of who works which shift on which unit. The two modules collaborate where their concerns intersect, but they do not collapse into each other, because collapsing them would force HR to inherit operational concerns it is not designed to carry and would force the Workforce module to inherit employment-law concerns it is not designed to carry.

The module's contribution to the Ibn Hayan platform is the trustworthy, auditable, configurable management of the employment lifecycle. Every consequential action — hiring, contract amendment, payroll execution, leave approval, performance review completion, training assignment, benefit enrollment, offboarding — is recorded in the audit trail with the actor, the time, the scope, and the previous and new state. The audit posture is not optional; it is the architectural expression of Principle P13 (Auditability as Primitive) and is the basis on which Ibn Hayan customers demonstrate labour-law compliance to regulators and demonstrate payroll accuracy to employees and finance auditors. The module is the single authoritative source for who is employed by the customer organization at any given moment, and that authority is what makes every other module that depends on employee identity — Billing, Accounting, Workforce, Identity & Access — coherent across the Ibn Hayan platform.

### 1.2 Bounded Context Alignment

The HR module aligns with bounded context BC12 (HR), category Administrative, as defined in SYSTEM_ARCHITECTURE Section 7.2. The bounded context is responsible for human resources, payroll, and employee records; the module is the deployable expression of that responsibility. The alignment is one-to-one per the default convention in SYSTEM_ARCHITECTURE Section 7.7, with no documented deviations. The context exposes four contract types per SYSTEM_ARCHITECTURE Section 7.4 — Commands, Queries, Events, and Configuration Schemas — and the module's contract surface is versioned and governed by the deprecation policy documented in MODULE_ARCHITECTURE Section 8.

The HR context is a customer of the Identity & Access context (BC15) for the relationship between an employee and their platform user account; a customer of the Configuration context (BC16) for the layered configuration that drives payroll rules, leave policies, and performance review cycles; and a customer of the Audit context (BC17) for the immutable record of every consequential HR action. The HR context is a supplier to the Workforce context (BC10), which consumes employee identity and employment status when computing shift eligibility and credential alignment; to the Accounting context (BC08), which consumes payroll run outputs for posting to the general ledger; and to the Billing context (BC07), which consumes practitioner identity when invoicing for services rendered. These customer-supplier relationships are governed by the dependency rules in SYSTEM_ARCHITECTURE Section 13.4 and the communication patterns in MODULE_ARCHITECTURE Section 7.

### 1.3 Business Value

The business value of the HR module is measured in three outcomes that matter to the customer's executive team and to Ibn Hayan's commercial posture. First, employment compliance: the module ensures that every employee has a current contract, every payroll run is documented, every leave entitlement is honoured, and every regulatory filing that depends on employment data is generated from the same authoritative source that produces payroll. Second, payroll accuracy: payroll is the single largest operational expense for most healthcare organizations, and an Ibn Hayan module that produces correct, auditable payroll runs on the first attempt prevents both overpayment and the employee-trust damage that follows underpayment. Third, talent lifecycle continuity: when an employee is hired, transferred, promoted, or offboarded, the module ensures that the corresponding changes ripple through Identity & Access, Workforce, Accounting, and Benefits administration without manual re-entry, eliminating the data drift that plagues HR systems that operate in isolation from the operational platform.

For Ibn Hayan itself, the module is a precondition for serving the Professional and Enterprise editions, both of which include HR capability per PRODUCT_BIBLE Section 16. The module is also a precondition for serving large hospital customers whose HR operations span multiple facilities, multiple employment types (full-time, part-time, contract, locum), and multiple regulatory frameworks within the same tenant. The module's configuration-driven design allows a single tenant to operate HR differently per facility and per country without forking the platform, honouring Principle P3 (One Platform, Many Organizations) and Principle P17 (Regional Adaptation Without Forking).

### 1.4 Position in the Platform

The HR module sits in the Administrative category alongside CRM and Workforce. It depends on Platform modules — Identity & Access, Configuration, Audit, Localization, Integration, Reporting — and on the Patient module only in the indirect sense that practitioners who are employees also act as care providers in patient encounters. It does not depend on clinical modules, financial modules, or operational modules; the dependency direction flows the other way, because Workforce, Accounting, and Billing all consume HR outputs. The module's contract surface is consumed by other modules through synchronous query, asynchronous event, and the outbox pattern, with the pattern selected per interaction per MODULE_ARCHITECTURE Section 7.6.

The module is enabled per tenant per edition packaging rules in PRODUCT_BIBLE Section 16.7 and SYSTEM_ARCHITECTURE Section 9.7. The module is not part of the Trial or Essential editions; it is part of the Professional and Enterprise editions, where its presence reflects the operational maturity of customers at those tiers. Customers at the Essential tier typically operate with a headcount small enough that HR functions are discharged through external payroll providers and manual records; customers at the Professional and Enterprise tiers typically have a dedicated HR function that requires the module's capability surface.

---

## 2. Module Purpose & Scope

### 2.1 In-Scope Capabilities

The module's in-scope capabilities span the full employment lifecycle. The module records employee identity, employment contracts, payroll configuration, leave entitlements and requests, performance reviews, training assignments and completions, benefit enrollments, time and attendance records, and organizational structure. The module produces payroll runs as auditable, versioned outputs that can be posted to the Accounting module's general ledger. The module drives onboarding workflows that span HR, Identity & Access, and Workforce, ensuring that a new hire receives a platform user account, a shift assignment, and a benefits enrollment in a coordinated sequence rather than as disconnected manual steps. The module drives offboarding workflows that revoke access, finalize payroll, recover organizational assets, and produce the documentation required by labour-law frameworks.

The module is responsible for the configuration surface that governs employment rules: pay structures, leave policies, performance review cycles, training requirements, benefit plans, attendance rules, and organizational hierarchy definitions. These configuration keys are part of the module's contract surface and are versioned, validated, and audited per the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). The module is also responsible for the HR document library — employment contracts, offer letters, performance review forms, training certificates, and exit documentation — through integration with the Documents module, which owns the document lifecycle.

### 2.2 Out-of-Scope Items

Several HR-adjacent concerns are explicitly out of scope for the HR module and belong to other modules. Clinical scheduling — who works which shift on which unit — is owned by the Workforce module, which consumes HR's employment-status data but does not replicate it. Provider credentialing for clinical-practice eligibility is owned by the Workforce module, which tracks professional licences, board certifications, and scope-of-practice limits. Payroll execution — the actual disbursement of funds to employee bank accounts — is owned by external payroll providers that the HR module integrates with through the Integration module; Ibn Hayan does not itself move money. General-ledger posting is owned by the Accounting module, which consumes HR's payroll-run outputs.

Country-specific labour-law legal interpretation is out of scope. The module encodes labour-law obligations through configuration, and the configuration keys reflect the obligations; but the legal interpretation of those obligations — for example, what constitutes overtime under a particular country's labour code — is a customer- or partner-supplied decision. Ibn Hayan provides the configuration framework; the customer populates the values, typically with legal counsel. This boundary is the same boundary the platform draws for clinical decision support: the platform provides the capability to encode clinical rules, but the rules themselves are the practitioner's responsibility.

### 2.3 Edition Availability

| Edition | Code | HR Module Availability | Notes |
|---|---|---|---|
| Trial | E0 | Not available | Trial tenants operate with a synthetic employee record sufficient for evaluation; HR is not provisioned. |
| Essential | E1 | Not available | Essential-tier customers typically operate with external payroll providers; HR is not packaged. |
| Professional | E2 | Available | Full HR capability; configuration depth supports multi-facility within a single tenant. |
| Enterprise | E3 | Available | Full HR capability; configuration depth supports multi-facility, multi-region, multi-currency, and multi-regulatory-framework operation. |

The edition packaging reflects the operational reality that smaller practices typically do not require integrated HR, while mid-sized and large practices do. The packaging also reflects the integration footprint: HR generates significant volume in events, audit records, and document artifacts, which is appropriate for customers whose volume justifies the operational cost.

### 2.4 Clinic Type Relevance

The 30 clinic types defined in PRODUCT_BIBLE Section 17 have different HR needs. The table below summarizes the relevance of the HR module to representative clinic types; the full 30-type list is treated analogously.

| Clinic Type Category | Representative Types | HR Relevance | Rationale |
|---|---|---|---|
| Solo and small practice | Solo Practitioner Clinic, Small Group Practice | Low | Headcount is small; external payroll is typical. |
| Mid-size practice | Multi-Specialty Group, Dental Group, Physiotherapy Chain | Medium | Headcount justifies integrated HR; multi-site operation benefits from a single employee record. |
| Hospital | General Hospital, Specialty Hospital, Teaching Hospital | High | Headcount is large; multiple employment types; complex labour-law exposure. |
| Network | Hospital Network, Multi-Region Network | Critical | Multi-facility, multi-region, multi-regulatory-framework operation requires a unified HR system. |
| Specialized | Long-Term Care, Mental Health Facility, Rehabilitation Center | High | Regulatory exposure around staffing ratios makes integrated HR and Workforce operation consequential. |

### 2.5 Module Lifecycle Posture

The HR module is at the General Availability lifecycle stage per MODULE_ARCHITECTURE Section 6.1. The module has passed the Candidate and Pilot stages and is available to all customers on the Professional and Enterprise editions per their edition packaging. The module's contract surface is at version 1.x, with no breaking changes planned. The module follows the platform's standard evolution discipline: contract evolution through versioning, capability addition through extension points, and deprecation only through the documented ADR process.

The module's configuration surface is mature. The configuration keys that govern payroll rules, leave policies, performance review cycles, and benefit plans have been validated against multiple regulatory frameworks and multiple facility types. New configuration keys are added when an enduring requirement is identified; speculative configuration keys are not added (MODULE_ARCHITECTURE Section 10.2, criterion Minimal). The module's extension surface supports customer-specific integrations with external payroll providers, country-specific labour-law calculators, and learning-management systems through the platform's standard extension points (MODULE_ARCHITECTURE Section 9).

---

## 3. Key Features

### 3.1 Capability Catalogue

The HR module's capability surface is organized into twelve capability areas. Each area is a coherent set of capabilities that serves a single HR concern; the areas are listed in the table below and elaborated in Sections 4 through 8 and in cross-cutting sections.

| # | Capability Area | Description |
|---|---|---|
| C1 | Employee Lifecycle | Hire-to-retire management of the employment relationship. |
| C2 | Contract Management | Employment-contract definition, amendment, renewal, and termination. |
| C3 | Payroll Configuration | Pay-structure definition, allowance and deduction rules, payroll-run generation. |
| C4 | Leave Management | Leave-type definition, entitlement calculation, request and approval workflow. |
| C5 | Performance Reviews | Review-cycle definition, review execution, rating, and outcome recording. |
| C6 | Training Tracking | Training-requirement definition, assignment, completion, and certification. |
| C7 | Benefits Administration | Benefit-plan definition, enrollment, change, and termination. |
| C8 | Time and Attendance | Time-clock capture, attendance-rule enforcement, exception handling. |
| C9 | Organizational Structure | Department, facility, reporting-line definition and history. |
| C10 | HR Document Management | Employment-contract storage, certificate storage, exit-document storage (via Documents module). |
| C11 | Onboarding | Coordinated hire workflow spanning HR, Identity & Access, Workforce, Benefits. |
| C12 | Offboarding | Coordinated exit workflow spanning HR, Identity & Access, Workforce, Accounting, Benefits. |

### 3.2 Capability Cross-Reference

The capability areas are not consumed in isolation. The table below cross-references each capability area to the primary module sections where the capability is elaborated and to the primary roles that consume it.

| Capability Area | Elaborated In | Primary Roles |
|---|---|---|
| Employee Lifecycle | Section 4 | R11 HR Manager, R09 Administrator |
| Contract Management | Section 4 | R11 HR Manager |
| Payroll Configuration | Section 6 | R11 HR Manager, R10 Compliance Officer |
| Leave Management | Section 7 | R11 HR Manager, all employees as requestors |
| Performance Reviews | Section 8 | R11 HR Manager, R12 Executive, all reviewers and reviewees |
| Training Tracking | Section 4, Section 7 | R11 HR Manager |
| Benefits Administration | Section 4, Section 7 | R11 HR Manager |
| Time and Attendance | Section 5 | R11 HR Manager, all employees |
| Organizational Structure | Section 4 | R11 HR Manager, R09 Administrator |
| HR Document Management | Section 12 | R11 HR Manager |
| Onboarding | Section 10 | R11 HR Manager, R13 System Administrator |
| Offboarding | Section 10 | R11 HR Manager, R13 System Administrator |

### 3.3 Configuration-Driven Posture

Every capability area in the catalogue is configurable rather than coded. Pay structures are defined through configuration keys, not through source-level pay-calculating code. Leave policies are defined through configuration keys, not through hard-coded leave rules. Performance review cycles, training requirements, benefit plans, attendance rules, and organizational hierarchies are all defined through configuration. This posture is the architectural expression of Principle P2 (Configuration Before Customization) and is non-negotiable: a customer that needs a pay-structure variant that cannot be expressed through configuration is a candidate for platform evolution, not for source-level customization. The configuration surface per capability area is documented in Section 13.

---

## 4. Employee Records

### 4.1 Employee Identity

The Employee is the primary entity of the HR module. An employee record captures the identity of a person who is, has been, or is about to be in an employment relationship with the customer organization. Employee identity in the HR module is distinct from user identity in the Identity & Access module, but the two are linked: an employee may have zero, one, or more user accounts over the course of their employment, and a user account may persist briefly after employment ends to support handoff and audit. The link is maintained through a reference rather than through shared identity, preserving the boundary between the two contexts. Employee identity in the HR module is also distinct from practitioner identity in the Workforce module, where the same person is represented as a care provider with credentials and shift eligibility; the two modules synchronize through events rather than through a shared record.

Employee records carry the demographic information required for employment administration: legal name, preferred name, date of birth, national identifier where applicable, contact information, emergency contact, and the photographs and identification documents required for compliance. The module does not carry clinical information about employees as patients; an employee who is also a patient has a separate Patient record in the Patient module, and the link between the two is governed by consent and privacy rules per PRODUCT_BIBLE Section 25. The boundary protects employee privacy and prevents HR users from accessing clinical information they have no authorization to view.

### 4.2 Employment Contracts

An Employment Contract is the legal instrument that defines the employment relationship. The HR module records each contract's type (permanent full-time, permanent part-time, fixed-term, locum, contractor, intern), its start and end dates, its notice period, its pay basis (salary, hourly, per-session, per-procedure), its pay rate, its working-hours expectation, its leave entitlement, its reporting line, and its benefits eligibility. A contract may be amended during employment, with each amendment versioned and audited; the audit trail shows who amended what, when, and with what authorization. A contract ends through resignation, termination, non-renewal, retirement, or death, with the ending recorded as a contract-termination event.

Contracts are the basis for payroll calculation, leave entitlement, benefits eligibility, and access provisioning. Every payroll run is anchored to a contract; every leave entitlement is calculated from a contract; every benefits enrollment is gated by a contract's benefits eligibility. The module's configuration surface defines the contract types that a customer recognizes and the rules that govern each type, allowing the same platform to serve organizations with very different employment patterns. Contract templates are maintained in the Documents module and referenced from the HR module; the HR module does not own the document lifecycle but does own the contract record.

### 4.3 Organizational Structure

The module records the customer's organizational structure as a hierarchy of facilities, departments, and reporting lines. Each employee is assigned to a facility and a department at minimum, and optionally to a care team or sub-unit. Reporting lines are recorded as references to other employees, allowing the module to answer organizational queries — "who reports to whom", "who is in this department", "who is in this facility" — without external reference. The hierarchy is versioned: when an employee transfers, the module records the transfer as a dated change rather than as an overwrite, preserving the historical organizational structure for audit and analytics.

Organizational structure is a configuration concern. The hierarchy itself is configurable per tenant, with the customer's system administrator responsible for maintaining it. The module enforces referential integrity: a reporting line must reference an active employee; a department must reference a facility that exists. The hierarchy is consumed by the Workforce module for shift-eligibility computation, by the Reporting module for organizational rollups, and by the Identity & Access module for scoped permissions. The hierarchy is not consumed by clinical modules; clinical modules care about care teams, which are recorded separately in the Workforce module.

### 4.4 Training Records

A Training Record captures the training assignments and completions for an employee. The module records training requirements — mandatory trainings, role-specific trainings, recurring trainings — and tracks each employee's completion status, completion date, certificate number where applicable, and expiry date. Training records are auditable: who assigned the training, when the training was completed, who verified completion, and when the certificate expires. The module generates alerts when a training is approaching expiry or has expired, with the alert consumed by the Notifications module for delivery to the employee and their manager.

Training records are consumed by the Workforce module for credential alignment, where they supplement professional-licence tracking. The two modules collaborate: Workforce tracks professional credentials that are required for clinical practice (licences, board certifications); HR tracks organizational trainings that are required for employment compliance (fire safety, infection control, code of conduct). Both are required for a practitioner to be considered eligible to practise, but they are owned by different modules to preserve domain cohesion. The boundary between the two is governed by the customer's configuration, which specifies which trainings belong to which module.

---

## 5. Attendance Management

### 5.1 Time and Attendance Records

A Time Attendance Record captures the times at which an employee started and ended work on a given day, the breaks taken, and the resulting worked-hours total. The module records attendance through multiple capture mechanisms — manual entry by an employee, manager entry on behalf of an employee, integration with a time-clock system, integration with the Workforce module's shift-roster data — with the capture mechanism recorded as part of the attendance record for audit. Attendance records are versioned: corrections are recorded as amendments, not as overwrites, preserving the original record and the correction history.

Attendance records are the basis for payroll calculation when the contract's pay basis is hourly or per-session, and they are the basis for overtime calculation when the contract's pay basis is salary with overtime eligibility. Attendance records are also the basis for absence tracking: an attendance record that shows zero worked hours on a scheduled workday is an absence, which is reconciled against leave records to determine whether the absence is authorized or unauthorized. The reconciliation is automatic where the leave records are complete; where they are not, the module flags the discrepancy for HR review.

### 5.2 Attendance Rules

Attendance rules are configurable. The module defines what constitutes a full workday, a half-day, a late start, an early departure, and a missed shift. The rules are defined per facility, per department, and per role, allowing the same platform to serve organizations with very different attendance patterns — a hospital with 24-hour shifts, a clinic with standard office hours, a call centre with rotating shifts. The rules are versioned and audited per the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). Attendance rules are enforced at attendance-record creation; a record that violates a rule is flagged for review, not silently accepted.

Attendance-rule enforcement is the operational expression of the customer's labour-policy choices. The module does not impose a particular attendance policy; it imposes the framework within which the customer's attendance policy is expressed. A customer that wishes to track lateness with a five-minute tolerance configures the tolerance at five minutes; a customer that wishes to track lateness with a one-minute tolerance configures the tolerance at one minute. The module's responsibility is to apply the configured rule consistently and to record the result auditably.

### 5.3 Exception Handling

Attendance exceptions are records that deviate from the configured rule and require human review. The module supports exception workflows: a missed clock-in generates an exception; a clock-in without a matching clock-out generates an exception; a worked-hours total that exceeds the contracted maximum generates an exception. Exceptions are routed to the employee's manager for review and disposition, with the disposition recorded for audit. The workflow engine coordinates the exception-handling process per SYSTEM_ARCHITECTURE Section 16, with each step — exception detection, manager review, disposition, payroll impact — recorded as a workflow step.

Exception handling is where the HR module's audit posture has the most direct operational impact. An exception that is mishandled — a missed clock-in that is silently forgiven, a worked-hours total that is silently reduced — produces a payroll error that compounds across pay periods. The audit trail ensures that every exception is visible, every disposition is recorded, and every payroll impact is traceable. The module's reporting surface (Section 15) exposes exception trends, allowing HR to identify employees or units where exceptions are frequent and to address the underlying cause.

---

## 6. Payroll

### 6.1 Pay Structure Configuration

Pay structures are the configurable rules that govern how an employee's pay is calculated. A pay structure defines the pay basis (salary, hourly, per-session, per-procedure), the pay rate, the allowances (housing, transport, meal, on-call), the deductions (tax, social insurance, pension, garnishment), and the rules that govern each. Pay structures are defined per contract type, per role, per facility, and per regulatory framework, allowing the same platform to serve organizations that operate under multiple labour codes. The configuration surface is versioned: a change to a pay structure is recorded as a new version, with the effective date and the authorization recorded, and the previous version retained for audit and historical payroll recalculation.

Pay structure configuration is governed by the platform's configuration validation framework (SYSTEM_ARCHITECTURE Section 15.4). Structural validation ensures the configuration conforms to the schema. Referential validation ensures that referenced entities (roles, facilities, allowance types) exist. Semantic validation ensures the configuration is internally consistent (e.g., a deduction cannot exceed gross pay). Contextual validation ensures the configuration is consistent with its scope (a facility-level pay structure cannot contradict a tenant-level invariant). Regulatory validation ensures the configuration is consistent with the regulatory framework in force for the tenant's region. A configuration that fails any of the five validations is not applied.

### 6.2 Payroll Run Generation

A Payroll Run is the module's output: a set of calculated pay entries for a set of employees for a defined pay period. The module generates payroll runs on a configurable schedule — monthly, bi-weekly, weekly — and on demand for off-cycle runs. A payroll run consumes employee records, employment contracts, attendance records, leave records, and the configured pay structures; it produces a set of pay entries, each with gross pay, allowances, deductions, and net pay. The run is versioned: a re-run produces a new version, with the previous version retained for audit. The run is auditable: who initiated the run, when, with what scope, and with what result.

Payroll runs are posted to the Accounting module through an event-driven integration (Section 12). The posting produces general-ledger entries that reflect the payroll run's pay entries, with the chart-of-accounts mapping configured per tenant. The posting is idempotent: a payroll run cannot be posted twice, preventing double-counting in the general ledger. The posting is auditable: the audit record captures the payroll run, the general-ledger entries produced, and the time of posting. The posting is reversible: a payroll run that is incorrect can be reversed, with the reversal producing offsetting general-ledger entries and the reversal itself recorded for audit.

### 6.3 Payroll Execution Boundary

The HR module generates payroll runs; it does not execute payroll. Payroll execution — the actual disbursement of funds to employee bank accounts — is performed by an external payroll provider or banking integration that the HR module integrates with through the Integration module. The boundary is deliberate: moving money requires banking infrastructure, regulatory licensing, and fraud-prevention capability that the Ibn Hayan platform does not own. The platform's contribution is the auditable, correct payroll run that the payroll provider consumes; the provider's contribution is the disbursement.

The integration with the payroll provider is governed by a contract that the Integration module maintains. The contract specifies the data format the provider expects, the schedule on which the provider expects the data, and the confirmation the provider returns. The HR module produces the payroll-run output in the format the contract specifies; the Integration module handles the transport and the confirmation. The HR module does not communicate with the payroll provider directly, preserving the boundary between domain logic and integration logic. This separation is the architectural expression of the Anticorruption Layer pattern in SYSTEM_ARCHITECTURE Section 7.3.

---

## 7. Leave Management

### 7.1 Leave Types and Entitlements

Leave types are the configurable categories of leave that the customer recognizes: annual leave, sick leave, maternity leave, paternity leave, bereavement leave, unpaid leave, study leave, sabbatical. Each leave type has a defined entitlement — the number of days or hours an employee is entitled to per year — and a defined accrual rule — how the entitlement accrues over the year (front-loaded, accrued per pay period, accrued per month). Leave types and entitlements are defined per contract type, per role, per facility, and per regulatory framework. The configuration surface is versioned and audited per the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15).

Entitlement calculation is the module's responsibility. For each employee, the module computes the current entitlement based on the employee's contract, the leave-type configuration, and the employee's tenure. The computation is deterministic: the same inputs produce the same output, and the output is reproducible for audit. The computation is versioned: when the configuration changes, the entitlement is recalculated from the effective date, with the previous entitlement retained for historical leave-balance reporting. The computation is auditable: who changed the configuration, when, with what effect on each affected employee's entitlement.

### 7.2 Leave Requests and Approvals

A Leave Request is an employee's request to take leave of a specific type for a specific period. The module records the request, validates it against the employee's entitlement and the unit's staffing requirements, and routes it for approval. The approval workflow is configurable: requests may require one or more approvals, with the approver chain defined by the employee's reporting line, the leave type, and the leave duration. The workflow engine coordinates the approval process per SYSTEM_ARCHITECTURE Section 16, with each step — request submission, validation, approval, denial, cancellation — recorded as a workflow step.

Leave approvals interact with the Workforce module's shift roster. A leave request that covers scheduled shifts triggers a check against the unit's staffing requirements; a request that would leave the unit understaffed is flagged for managerial review. The flag does not auto-deny the request; it surfaces the staffing impact to the approver, who decides whether to approve, deny, or request the employee to find coverage. The interaction is governed by the customer-supplier relationship between the HR and Workforce contexts, with the Workforce module's staffing rules consumed by the HR module's leave-approval workflow.

### 7.3 Leave Balance and Carryover

The module maintains each employee's leave balance: the current entitlement, the leave taken, the leave pending approval, and the leave remaining. The balance is updated in real time as leave requests are submitted, approved, taken, and cancelled. The balance is exposed to the employee through self-service queries and to the manager through reporting queries. The balance is auditable: every change is recorded, with the actor, the time, the previous balance, and the new balance.

Leave carryover is the practice of moving unused leave from one year to the next. The module supports carryover through configuration: the customer defines whether carryover is allowed, the maximum carryover amount, the period during which carried-over leave must be used, and whether carried-over leave expires. The carryover is executed at year-end as a configurable process that updates each employee's balance, with the execution recorded for audit. The carryover interacts with the regulatory framework: some jurisdictions require carryover; some forbid it; some allow it with limits. The module's configuration surface accommodates the variation without code change.

---

## 8. Performance Reviews

### 8.1 Review Cycles

Performance reviews are conducted on configurable cycles. The module supports annual reviews, semi-annual reviews, quarterly reviews, and ad-hoc reviews, with the cycle defined per role, per facility, and per review type. A review cycle defines the review period, the participants (reviewee, reviewer, secondary reviewer, skip-level reviewer), the review form, the rating scale, and the deadlines. The cycle is versioned: a change to the cycle is recorded as a new version, with the effective date and the authorization recorded. The cycle is auditable: who configured the cycle, when, with what scope.

Review cycles are coordinated by the workflow engine per SYSTEM_ARCHITECTURE Section 16. The workflow orchestrates the sequence: reviewee self-assessment, reviewer assessment, calibration meeting, final rating, reviewee acknowledgement, development-plan agreement. Each step is a workflow step, with the step's state, actor, and timestamp recorded. The workflow supports parallel steps (e.g., self-assessment and peer feedback collected simultaneously) and conditional steps (e.g., skip-level review only for senior roles). The workflow is configurable: a customer may add, remove, or reorder steps through configuration, not code.

### 8.2 Review Execution

Review execution is the actual conduct of the review. The module captures the reviewee's self-assessment, the reviewer's assessment, the calibration discussion notes, the final rating, the reviewee's acknowledgement, and the agreed development plan. Each captured input is versioned: a reviewer who revises their assessment before submission produces a new version, with the previous version retained. The module supports structured forms — rating scales, competency assessments, goal-completion ratings — and free-text fields for narrative feedback. The form structure is configurable per review type, per role, and per facility.

Review execution is governed by the platform's permission framework. The reviewee sees their own self-assessment and the final rating; the reviewer sees the reviewee's self-assessment, their own assessment, and the calibration discussion notes; the HR manager sees all reviews in their scope; the executive sees aggregate review results. The permission framework enforces these visibility rules, with violations treated as defects. The framework honours Principle P13 (Auditability as Primitive): every view of a review record is audited, ensuring that unauthorized access is detectable after the fact.

### 8.3 Review Outcomes

Review outcomes are the consequences of the review: salary adjustments, promotion decisions, transfer decisions, development-plan assignments, and performance-improvement plans. The module records each outcome, links it to the review that produced it, and routes it to the modules that execute it. A salary adjustment routes to the Employment Contract module as a contract amendment. A promotion routes to the Employment Contract module as a contract amendment and to the Identity & Access module as a permission update. A development-plan assignment routes to the Training module as a training assignment.

Review outcomes are auditable: who recorded the outcome, when, with what authorization, with what effect. The audit trail is the basis for compliance with labour-law requirements around performance documentation. In jurisdictions where employers are required to demonstrate that a termination was based on documented performance issues, the audit trail provides the documentation. The audit trail is also the basis for analytics: the Reporting module consumes review outcomes to produce reports on rating distributions, promotion rates, and development-plan completion, which support workforce-planning decisions.

---

## 9. User Roles

### 9.1 Primary HR Roles

The HR module is consumed by the roles defined in PRODUCT_BIBLE Section 20. The table below summarizes the primary roles and their HR interactions.

| Role Code | Role | HR Interaction |
|---|---|---|
| R11 | HR Manager | Configures pay structures, leave policies, review cycles, benefit plans; manages employee records; oversees payroll runs; reviews audit trail. |
| R09 | Administrator | Oversees facility-level HR configuration; consumes HR reports; coordinates with HR Manager on organizational structure. |
| R10 | Compliance Officer | Reviews HR audit trail; consumes compliance reports; verifies labour-law compliance. |
| R12 | Executive | Consumes aggregate HR reports; oversees HR strategy; approves executive-level hires and departures. |
| R13 | System Administrator | Manages HR module enablement; manages integration configuration with payroll providers; manages configuration versioning and rollback. |
| R01–R05 | Clinical roles | Self-service access to own leave balance, attendance records, pay slips, performance reviews, training assignments. |
| R06–R08 | Operational roles | Self-service access to own HR records as employees. |

### 9.2 Self-Service Posture

Every employee, regardless of their primary role, has self-service access to their own HR records. An employee can view their leave balance, submit a leave request, view their attendance records, view their pay slips, view their performance reviews, view their training assignments and completions, and view their benefit enrollments. The self-service posture is a deliberate design choice: it reduces HR's administrative load, it improves employee trust by giving employees visibility into their own records, and it produces a cleaner audit trail because employees are the source of truth for many of their own data points (leave requests, attendance corrections).

Self-service access is permission-governed. An employee sees only their own records; a manager sees their direct reports' records; an HR manager sees all records in their scope. The permission framework enforces these rules, with violations treated as defects. Self-service actions are auditable: every view, every submission, every correction is recorded, with the actor, the time, and the action captured.

### 9.3 Audit Events Generated

The HR module generates audit events for every consequential action, per Principle P13 and SYSTEM_ARCHITECTURE Section 27. The table below summarizes the audit-event categories the module produces.

| Audit Category | Examples |
|---|---|
| Employee lifecycle | Hire, transfer, promotion, contract amendment, termination, retirement. |
| Payroll actions | Payroll-run initiation, payroll-run approval, payroll-run posting, payroll-run reversal. |
| Leave actions | Leave request submission, leave approval, leave denial, leave cancellation, leave carryover. |
| Performance actions | Review-cycle initiation, review submission, rating assignment, outcome recording. |
| Benefits actions | Benefit-plan enrollment, benefit-plan change, benefit-plan termination. |
| Configuration actions | Pay-structure change, leave-policy change, review-cycle change, attendance-rule change. |

Every audit event is recorded in the platform's audit store with the standard audit-record structure defined in SYSTEM_ARCHITECTURE Section 27.4: timestamp, actor, action, resource, tenant, scope, previous state, new state, authorization, result, and context. Audit records are immutable, append-only, and tamper-evident, and they are retained per the regulatory framework's requirements. Audit records are queryable through the Audit module's query contracts, with queries themselves audited.

---

## 10. Workflows

### 10.1 Onboarding Workflow

The onboarding workflow coordinates the activities that follow a candidate's acceptance of an offer. The workflow is defined declaratively through configuration, per SYSTEM_ARCHITECTURE Section 16.2; it is not implemented as source code. A typical onboarding workflow comprises the steps listed in the table below, with the customer's configuration determining which steps apply, in what order, and with what deadlines.

| Step | Owner | Description |
|---|---|---|
| Offer acceptance | HR Manager | Records the candidate's acceptance and converts the candidate to an employee. |
| Contract execution | HR Manager | Records the signed contract and stores it via the Documents module. |
| Employee record creation | HR module | Creates the employee record with all required fields. |
| User account provisioning | Identity & Access | Creates a platform user account and links it to the employee record. |
| Role assignment | Identity & Access | Assigns the platform role(s) corresponding to the employee's position. |
| Shift assignment | Workforce | Adds the employee to the shift roster for their unit. |
| Benefits enrollment | HR module | Enrolls the employee in the benefit plans they have elected. |
| Training assignment | HR module | Assigns the mandatory and role-specific trainings. |
| Welcome notification | Notifications | Sends a welcome notification to the employee's contact details. |

The workflow engine coordinates the steps, handling state management, error handling, compensation, and audit. The workflow is recoverable: if a step fails, the workflow resumes from its last durable state. The workflow is observable: each step's state and timestamp are visible to the HR Manager through reporting. The workflow is auditable: each step's execution is recorded in the audit trail.

### 10.2 Offboarding Workflow

The offboarding workflow coordinates the activities that follow an employee's departure. The workflow mirrors onboarding in reverse but adds steps that onboarding does not require, such as asset recovery, exit interview, final payroll calculation, and access revocation. A typical offboarding workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Resignation or termination recording | HR Manager | Records the departure and the effective date. |
| Notice-period handling | HR module | Tracks the notice period and the employee's continued work during notice. |
| Final leave calculation | HR module | Calculates the final leave balance and any payout or recovery. |
| Asset recovery | Workforce | Coordinates recovery of physical assets (keys, equipment, devices). |
| Access revocation | Identity & Access | Revokes platform access, scheduled for the departure date. |
| Final payroll calculation | HR module | Calculates the final payroll, including leave payout and any severance. |
| Final payroll execution | Payroll provider | Executes the final payroll disbursement via integration. |
| Exit interview | HR Manager | Conducts the exit interview and records the notes. |
| Offboarding notification | Notifications | Notifies relevant modules and roles of the departure. |
| Employee record archival | HR module | Archives the employee record per the retention policy. |

The offboarding workflow is more consequential than onboarding because the consequences of error are more severe: an employee whose access is not revoked on time is a security incident; an employee whose final payroll is incorrect is a labour-law exposure. The workflow's audit trail is the basis for demonstrating that the offboarding was handled correctly.

### 10.3 Payroll Workflow

The payroll workflow coordinates the activities that produce a payroll run. The workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Attendance record finalization | HR module | Finalizes attendance records for the pay period, resolving exceptions. |
| Leave record finalization | HR module | Finalizes leave records for the pay period. |
| Payroll-run generation | HR module | Generates the payroll run from finalized attendance, leave, and pay structures. |
| Payroll-run review | HR Manager | Reviews the payroll run for accuracy. |
| Payroll-run approval | HR Manager or Executive | Approves the payroll run for execution. |
| Payroll-run posting | HR module | Posts the payroll run to the Accounting module. |
| Payroll-run execution | Payroll provider | Executes the disbursement via integration. |
| Pay-slip distribution | Notifications | Distributes pay slips to employees via configured channels. |

The payroll workflow is the most consequential workflow the HR module coordinates, because it touches every employee and every general-ledger account. The workflow's audit trail is the basis for finance audit and labour-law compliance demonstration. The workflow's recoverability is critical: a failed payroll run must be recoverable without manual re-entry, and the platform's outbox pattern (MODULE_ARCHITECTURE Section 7.4) ensures that the events the workflow publishes are reliably delivered to consuming modules.

---

## 11. Data Models

### 11.1 Key Entities

This section lists the HR module's primary domain entities by name. Entity schemas, data-store representations, and persistence details are out of scope for this document and are governed by the platform's data architecture documentation. The list below is the canonical reference for what entities the HR module owns.

| Entity | Description |
|---|---|
| Employee | The person in an employment relationship with the customer organization. |
| Employment Contract | The legal instrument defining the employment relationship. |
| Payroll Run | The calculated pay entries for a set of employees for a defined pay period. |
| Leave Request | An employee's request to take leave. |
| Leave Balance | The current entitlement, taken, pending, and remaining leave for an employee. |
| Performance Review | The record of a performance review cycle execution. |
| Training Record | The assignment and completion of a training for an employee. |
| Benefit Enrollment | The enrollment of an employee in a benefit plan. |
| Time Attendance Record | The start, end, breaks, and worked hours for an employee on a given day. |
| Organizational Unit | A facility, department, or care team in the customer's hierarchy. |
| Pay Structure | The configured rules that govern pay calculation. |
| Leave Type | A configured category of leave. |
| Performance Review Cycle | The configured cycle that governs performance reviews. |
| Benefit Plan | A configured benefit offering. |

### 11.2 Entity Ownership and Boundaries

Each entity in the table above is owned by the HR module. Ownership means the HR module is the authoritative source for the entity; other modules that need the entity's data obtain it through the HR module's query contracts or by subscribing to the HR module's events. Direct data access across the boundary is forbidden per MODULE_ARCHITECTURE Section 11.3 and is detected through static analysis. The boundary preserves the HR module's ability to evolve its internal representation without coordinating with consumers, as long as it honours its contracts.

Some entities are shared with other modules in the sense that they are referenced by other modules' entities. The Employee entity is referenced by the Identity & Access module (user account), the Workforce module (practitioner), and the Accounting module (cost-centre assignment). These references are by identifier, not by data replication; the consuming module holds the identifier and queries the HR module for the current state. This is the standard read-model and projection pattern documented in MODULE_ARCHITECTURE Section 11.3.

### 11.3 Data Volume and Retention

The HR module's data volume is moderate relative to clinical modules. An organization with 10,000 employees produces on the order of 10,000 employee records, 10,000 to 30,000 contract versions over time, 10,000 payroll runs per year (assuming monthly), 50,000 leave requests per year, 10,000 performance reviews per year, and 30,000 time-attendance records per day. The volume is well within the capacity of the platform's standard data architecture, but the retention horizon is long: employment records must be retained for the period defined by the regulatory framework, which in many jurisdictions is the duration of employment plus seven to ten years.

Retention is governed by the platform's data retention configuration, which is part of the Configuration module's surface. The HR module exposes retention configuration per entity type, with the customer's compliance officer responsible for setting the retention period in accordance with the applicable regulatory framework. Records that are past their retention period are archived or purged per the configured policy, with the archival or purge recorded in the audit trail. The retention posture is the architectural expression of Principle P6 (Reversibility Over Permanence) balanced against regulatory retention obligations.

---

## 12. Integrations

### 12.1 Integration with Platform Modules

The HR module integrates with multiple platform modules. The table below summarizes the integrations.

| Integrated Module | Integration Purpose | Pattern |
|---|---|---|
| Identity & Access | Employee-to-user-account link; role assignment; access revocation. | Synchronous query; asynchronous event. |
| Workforce | Employee-to-practitioner link; shift assignment; staffing-rule check. | Asynchronous event; synchronous query. |
| Accounting | Payroll-run posting to general ledger; cost-centre assignment. | Asynchronous event (outbox). |
| Billing | Practitioner identity for service invoicing; cost-centre for revenue attribution. | Synchronous query. |
| Documents | Employment-contract storage; certificate storage; exit-document storage. | Synchronous command; synchronous query. |
| Notifications | Welcome notifications; pay-slip distribution; leave-status notifications; training-expiry alerts. | Asynchronous event (outbox). |
| Configuration | Pay-structure, leave-policy, review-cycle, benefit-plan configuration. | Configuration schema consumption. |
| Audit | Audit-event recording for all consequential HR actions. | Asynchronous event (outbox). |
| Reporting | HR data for operational, analytical, and regulatory reports. | Read-model projection; synchronous query. |
| Localization | Locale-specific templates, formats, terminology for HR documents. | Configuration schema consumption. |
| Integration | Integration with external payroll providers, time-clock systems, learning-management systems. | Anticorruption layer. |

### 12.2 Integration with External Systems

The HR module integrates with several categories of external systems through the Integration module. The table below summarizes the categories.

| External System Category | Integration Purpose | Pattern |
|---|---|---|
| Payroll provider | Payroll-run submission; disbursement confirmation. | Anticorruption layer; scheduled. |
| Time-clock system | Attendance-record capture. | Anticorruption layer; real-time or batch. |
| Learning-management system | Training-assignment synchronization; completion synchronization. | Anticorruption layer; bidirectional. |
| Background-check provider | Pre-employment background-check initiation and result. | Anticorruption layer; asynchronous. |
| Government labour portal | Regulatory reporting (e.g., new-hire reporting). | Anticorruption layer; scheduled. |

External-system integration is governed by the Anticorruption Layer pattern documented in SYSTEM_ARCHITECTURE Section 7.3. The HR module's domain model is not contaminated by the external system's model; the Integration module translates between the two, preventing external-model leakage into the HR module's contracts. The translation is governed by a contract that the Integration module owns; the HR module is unaware of the external system's specifics. This separation preserves the HR module's ability to evolve its domain model and to switch external providers without ripple effects.

### 12.3 Integration Contracts and Versioning

Integration contracts are versioned per MODULE_ARCHITECTURE Section 8. A contract change is recorded as a new version, with the previous version supported through a defined deprecation window. The HR module's contract evolution is governed by the platform's deprecation policy: breaking changes are announced with adequate lead time, old contracts are supported through the transition, and consumers are migrated at their own pace within the transition window. The HR module's contract surface is documented as part of the module's definition of done (PRODUCT_BIBLE Principle P-7); undocumented contracts are defective.

---

## 13. Configuration

### 13.1 Configuration Surface

The HR module's configuration surface is the primary mechanism through which the customer adapts the module to its specific HR operations. The configuration surface is part of the module's contract and is versioned with it. The surface is bounded by what can be expressed without source-level modification per MODULE_ARCHITECTURE Section 10.1; behaviours that would require source modification are candidates for platform evolution through the extension surface, not for customer-specific customization. The configuration surface is organized by capability area, with each capability area exposing a coherent set of configuration keys.

The configuration surface is governed by the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). Configuration keys are namespaced by module and by capability. Configuration values are validated before application, with five validation rule categories (SYSTEM_ARCHITECTURE Section 15.4). Configuration changes are versioned, audited, and reversible through rollback. Configuration is resolved by the platform's configuration service, not by the HR module, ensuring consistent resolution across modules. The HR module receives the resolved value for its context and may cache it with explicit invalidation rules per MODULE_ARCHITECTURE Section 10.4.

### 13.2 Configuration Categories

The HR module's configuration falls into several categories per MODULE_ARCHITECTURE Section 10.3. The table below summarizes the categories.

| Category | Examples | Typical Owner |
|---|---|---|
| Behavioural | Pay-structure rules, leave-policy rules, review-cycle rules, attendance rules. | HR Manager, customer system administrator. |
| Structural | Module-enabled flags per facility, capability-gating flags. | Customer system administrator. |
| Integration | Payroll-provider endpoints, time-clock endpoints, credentials, schedules. | Integration architect. |
| Localization | Locale-specific contract templates, pay-slip formats, terminology. | Localization specialist. |
| Security | HR-record access rules, self-service scope rules, audit-query scope rules. | Security architect. |
| Performance | Cache settings, batch sizes, payroll-run parallelism. | Operations. |
| Regulatory | Retention periods, regulatory-reporting templates, labour-law framework selection. | Compliance officer. |

### 13.3 Configuration Layers and Precedence

The HR module honours the platform's eight-layer configuration model (SYSTEM_ARCHITECTURE Section 15.2). Configuration values are resolved by combining values from each layer in precedence order: platform default (L1), edition default (L2), tenant override (L3), facility override (L4), department override (L5), care-team override (L6), user override (L7), session override (L8). A higher layer overrides a lower layer; overrides are validated, versioned, and auditable. Not all configuration keys are overridable at all layers; some keys are fixed at lower layers for safety, regulatory, or platform-integrity reasons.

The HR module's configuration surface documents, for each configuration key, which layers may override the key and which layers are prohibited from overriding it. For example, a pay-structure configuration key may be overridden at the tenant, facility, and department layers but not at the user or session layers, because pay is an organizational property, not a personal preference. A self-service scope configuration key may be overridden at the tenant layer but not at lower layers, because self-service scope is a tenant-wide policy. The layer restrictions are enforced by the configuration service, not by the HR module.

### 13.4 Configuration Sandbox and Promotion

The HR module's configuration supports the platform's configuration sandbox (SYSTEM_ARCHITECTURE Section 15.7). A configuration change is tested in a sandbox tenant before application to a production tenant. The sandbox tenant inherits from the production tenant, ensuring that sandbox testing reflects production reality. A configuration change that has not been tested in a sandbox is not applied to production, except for emergency changes that follow a documented expedited pathway. The sandbox requirement is a direct consequence of Principle P1 (Healthcare Safety): untested configuration changes to payroll or leave policies can compromise employee compensation, which is a labour-law exposure for an Ibn Hayan customer.

Configuration promotion from sandbox to production is a governed process. The promotion is initiated by the customer's system administrator, reviewed by the customer's HR Manager and Compliance Officer, and recorded in the audit trail. The promotion is reversible through rollback, with the rollback itself versioned and auditable. The promotion is governed by the customer's own governance workflow, which the Ibn Hayan platform supports but does not impose; the platform's contribution is the framework, the audit trail, and the rollback capability.

---

## 14. Permissions

### 14.1 Permission Categories

The HR module's permission surface is organized into the categories defined by the platform's permission framework. The table below summarizes the categories and the HR module's exposure in each.

| Permission Category | HR Module Exposure |
|---|---|
| Read | View employee records, contracts, payroll runs, leave requests, performance reviews, training records, benefit enrollments, attendance records. |
| Write | Create or amend employee records, contracts, leave requests, performance reviews, training assignments, benefit enrollments. |
| Approve | Approve leave requests, payroll runs, performance-review outcomes, benefit-enrollment changes. |
| Configure | Modify pay structures, leave policies, review cycles, benefit plans, attendance rules. |
| Audit | Query the HR audit trail; review audit records; export audit reports. |
| Integrate | Manage integrations with payroll providers, time-clock systems, learning-management systems. |

### 14.2 Role-to-Permission Mapping

The role-to-permission mapping is governed by the platform's permission framework and is documented per role. The table below summarizes the default mapping; customers may refine the mapping within the framework's constraints.

| Role | Read | Write | Approve | Configure | Audit | Integrate |
|---|---|---|---|---|---|---|
| R11 HR Manager | All in scope | All in scope | All in scope | All in scope | All in scope | No |
| R09 Administrator | All in facility | No | No | Facility-level only | Facility-level only | No |
| R10 Compliance Officer | All in tenant | No | No | No | All in tenant | No |
| R12 Executive | Aggregate only | No | Executive-level only | No | Aggregate only | No |
| R13 System Administrator | All | No | No | No | All | All |
| Manager (any role with direct reports) | Direct reports | Direct reports (limited) | Direct reports' leave | No | Direct reports' audit | No |
| Employee (self) | Own | Own (limited) | No | No | Own audit | No |

### 14.3 Permission Enforcement and Audit

Permission enforcement is performed by the platform's permission framework, not by the HR module. The HR module declares the permission required for each operation; the framework enforces the declaration. The enforcement is consistent across surfaces: an operation performed through the user interface, through an integration, or through an administrative tool is governed by the same permission rule. This consistency is the architectural expression of Principle P13 (Auditability as Primitive) and is non-negotiable.

Permission checks are auditable. Every permission check is recorded in the audit trail when the check is for a consequential action, with the actor, the action, the permission required, the permission decision, and the authorization basis captured. A permission check that denies access is recorded with the same completeness as a permission check that grants access, ensuring that unauthorized access attempts are detectable. Permission audits are queryable through the Audit module's query contracts, with queries themselves audited.

### 14.4 Emergency Access

The HR module supports emergency access for scenarios where the normal permission framework would block a necessary action — for example, an offboarding that must be executed outside business hours and the normal approver is unavailable. Emergency access is governed by the platform's break-glass framework: the access is granted for a defined period, recorded with the justification, and reviewed after the fact by the customer's Compliance Officer. The framework honours Principle P1 (Healthcare Safety Overrides All Others): in a genuine emergency, the platform permits the action; the audit trail ensures that the action is visible and reviewable.

Emergency access is rare and is treated as an exception, not a routine pathway. A customer that uses emergency access frequently has a permission-design defect that is corrected by adjusting the normal permission mapping, not by widening emergency access. The audit trail exposes emergency-access frequency through reporting, allowing the Compliance Officer to identify and address overuse.

---

## 15. Reports

### 15.1 Report Categories

The HR module produces and contributes to reports in the three categories defined by SYSTEM_ARCHITECTURE Section 28.2: Operational, Analytical, and Regulatory. The table below summarizes the reports in each category.

| Category | Examples |
|---|---|
| Operational | Headcount by facility; current leave balance per employee; pending leave approvals; attendance exceptions for the current period; upcoming training expiries; payroll-run status. |
| Analytical | Headcount trends over time; turnover rate; absenteeism rate; training-completion rate; performance-rating distribution; payroll-cost trend; benefit-enrollment-rate trend. |
| Regulatory | New-hire reporting to government labour portal; payroll-tax filing; gender-pay-gap reporting; working-time-directive compliance reporting; training-compliance reporting for regulatory inspection. |

### 15.2 Operational Reporting

Operational reporting supports daily HR operations. Reports are generated from the transactional store, with minimal latency between data change and report availability. Operational reports are tenant-scoped and respect the organizational hierarchy: an HR Manager sees reports for their scope; a facility administrator sees reports for their facility; an executive sees aggregate reports for the tenant. Permission scoping is enforced at the reporting layer per SYSTEM_ARCHITECTURE Section 28.3.

Operational reports are typically consumed through the Reporting module's dashboard surface, with the HR Manager's dashboard surfacing the metrics that matter to daily HR operations: headcount, pending approvals, attendance exceptions, training expiries, payroll-run status. The dashboard is configurable: the HR Manager can compose a dashboard from the widget library, with the widgets selected and arranged per the manager's preferences. The dashboard's configuration is part of the user-layer configuration (L7) and is versioned and auditable per the platform's configuration strategy.

### 15.3 Analytical and Regulatory Reporting

Analytical reporting supports trend analysis and decision support. Reports are generated from the analytical store, which is populated from the transactional store through an ETL pipeline per SYSTEM_ARCHITECTURE Section 28.4. Analytical reports support workforce-planning decisions: where to add headcount, where to address turnover, where to invest in training, where to align pay with market. The analytical store is optimized for query performance, with denormalized data structures and pre-computed aggregates; the ETL pipeline introduces latency between transactional data change and analytical data availability, with the latency documented per data type.

Regulatory reporting supports compliance with regulatory requirements. Reports are generated from the audit store and the transactional store, with the report format defined by the regulatory framework per SYSTEM_ARCHITECTURE Section 28.5. Regulatory reports are immutable once generated: a regulatory report that has been submitted to a regulator cannot be modified, even if subsequent data changes would produce a different report. The immutability is a compliance requirement and is enforced at the reporting layer. Regulatory-report generation is auditable, with the audit record capturing the report, the parameters, the data sources, and the submission.

### 15.4 Report Distribution and Subscription

Report distribution is governed by the report definition, per SYSTEM_ARCHITECTURE Section 28.7. Distribution mechanisms include on-demand (generated on user request), scheduled (generated on a defined schedule), event-driven (generated in response to a defined event), and subscription (delivered to subscribers on a defined schedule). HR reports commonly use scheduled distribution — for example, a weekly headcount report delivered to the executive team every Monday — and subscription distribution — for example, a monthly payroll-cost report subscribed to by the CFO.

Report distribution is auditable. Every report generation and distribution is recorded in the audit trail, with the audit record capturing the report, the recipients, and the time. Distribution is permission-governed: a report is distributed only to recipients who are authorized to view it. Distribution failures are handled through retry, with the retry policy configured per report. The Notifications module handles the actual delivery, with the HR module's responsibility ending at the production of the report content.

---

## 16. API Surface

### 16.1 Contract Surface Overview

This section documents the HR module's contract surface — the set of commands, queries, events, and configuration schemas through which other modules interact with the HR module. Per MODULE_ARCHITECTURE Section 4.1, the contract surface is the module's only public interface; internals are private. Per the metadata table at the head of this document, specific API endpoint specifications are out of scope for this reference and are governed by the platform's integration documentation. The categories below are the structural commitments; specific endpoints are documented elsewhere.

### 16.2 Commands, Queries, and Events

The HR module exposes commands for state-changing operations, queries for state-reading operations, and events for state-change notifications. The table below summarizes the surface.

| Contract Type | Examples |
|---|---|
| Commands | Create employee; amend contract; submit leave request; approve leave request; initiate payroll run; assign training; enroll in benefit plan; record attendance; record performance review. |
| Queries | Get employee by identifier; list employees in scope; get leave balance; list pending leave approvals; get payroll-run status; get training-completion status; get performance-review history. |
| Events | Employee hired; contract amended; leave request submitted; leave request approved; payroll run initiated; payroll run posted; training completed; benefit enrollment changed; performance review completed. |
| Configuration Schemas | Pay-structure schema; leave-policy schema; review-cycle schema; benefit-plan schema; attendance-rule schema; organizational-hierarchy schema. |

### 16.3 Contract Versioning and Deprecation

Contract versioning follows the platform's semantic-versioning policy per MODULE_ARCHITECTURE Section 8.1. Major versions indicate breaking changes; minor versions indicate backward-compatible additions; patch versions indicate backward-compatible fixes. A breaking change is announced with adequate lead time, with the previous contract version supported through a defined deprecation window. Consumers are migrated at their own pace within the window, with the migration tracked through the module's health metrics.

Contract deprecation is governed by the platform's deprecation policy per MODULE_ARCHITECTURE Section 8.3. A deprecated contract is supported through its deprecation window, after which it is removed. The removal is recorded in the platform's CHANGELOG, with an explicit version increment. A consumer that has not migrated by the end of the deprecation window experiences a contract failure, which is the consumer's defect. The HR module's contract owners are responsible for communicating deprecation to consumers and for supporting migration; the consumers are responsible for migrating within the window.

---

## 17. Future Enhancements

### 17.1 Module Lifecycle Outlook

The HR module is at General Availability (LC3) per MODULE_ARCHITECTURE Section 6.1 and is on track to transition to Mature (LC4) after a defined period of stable operation. The transition is automatic per PRODUCT_BIBLE Section 19.5 and is recorded in the platform's CHANGELOG. No deprecation is anticipated; the employment-lifecycle domain is enduring, and the module's bounded context is stable per Principle P8 (Bounded Contexts Are Stable). Module evolution occurs through contract versioning, capability addition through extension points, and configuration-surface expansion, not through reorganization.

### 17.2 Extension Points

The HR module exposes extension points per MODULE_ARCHITECTURE Section 9 that allow capability to be added without source modification. The table below summarizes the extension-point categories relevant to the HR module.

| Extension Point Category | Examples |
|---|---|
| Integration adapters | Adapters for country-specific payroll providers, time-clock systems, learning-management systems. |
| Configuration-driven rules | Customer-specific pay calculations, leave-entitlement rules, attendance-rule variants. |
| Document templates | Customer-specific contract templates, pay-slip templates, performance-review forms. |
| Report templates | Customer-specific operational, analytical, and regulatory report layouts. |
| Workflow definitions | Customer-specific onboarding, offboarding, payroll, and review workflows. |

Extensions are first-class architectural concerns with their own contracts, validation, and lifecycle per MODULE_ARCHITECTURE Section 9.3. An extension that requires source modification of the HR module is, by definition, customization, and is rejected by Principle P2. Extensions are sandboxed per MODULE_ARCHITECTURE Section 9.4, with the sandbox dimensions (data, performance, security, audit) enforced. Extensions follow the standard lifecycle (defined, active, deprecated, retired) per MODULE_ARCHITECTURE Section 9.5.

### 17.3 Anticipated Capability Evolution

Capability evolution is anticipated in several areas, driven by customer demand and regulatory change. Predictive attrition analytics — using historical HR data to identify employees at elevated risk of departure — is a candidate for addition through the extension surface, with the analytics consuming HR events and producing predictions that are surfaced to HR managers. AI-assisted performance-review drafting — using historical review data to suggest narrative-feedback language — is a candidate for addition through the extension surface, with the AI service consuming HR data and producing suggestions that are reviewed by human reviewers per Principle P-1 of PRODUCT_BIBLE (healthcare first) and Section 29.6 of SYSTEM_ARCHITECTURE (AI and human oversight).

Regulatory evolution is anticipated as new jurisdictions adopt new labour-law frameworks (e.g., predictive-scheduling laws, pay-transparency laws, gig-worker classification rules). The module's configuration surface is designed to accommodate these through configuration rather than code change; where a new framework cannot be expressed through existing configuration, the configuration surface is extended through the standard amendment process, with the extension versioned and audited. The module's regional adaptation posture honours Principle P17 (Regional Adaptation Without Forking): the same platform serves all regions, with regional variation expressed through configuration.

### 17.4 Operational Considerations

Operational considerations for the HR module centre on three concerns. First, payroll-run performance: a payroll run for a large Ibn Hayan customer can involve tens of thousands of employees, and the run must complete within a defined window to meet disbursement schedules. The module's payroll-run engine is designed for parallelism, with the parallelism level configurable per tenant. Second, audit-store volume: the module generates significant audit volume, especially around payroll runs and performance-review cycles. The Ibn Hayan audit store is sized accordingly, and audit-record retention is governed by the customer's compliance configuration. Third, integration reliability: the module's reliance on external payroll providers and time-clock systems means that integration failures can disrupt operations. The module's failure-isolation posture (MODULE_ARCHITECTURE Section 11.4) ensures that an integration failure degrades the module gracefully rather than cascading across the Ibn Hayan platform.

---

## 18. Related Documents

### 18.1 Canonical References

The HR module is governed by the following canonical references, which prevail over this document in case of conflict per the metadata table at the head of this document.

| Document | Relationship |
|---|---|
| `PRODUCT_BIBLE.md` | Defines product principles, edition packaging, clinic types, module overview (Section 19). |
| `SYSTEM_ARCHITECTURE.md` | Defines architectural principles, bounded contexts (Section 7), configuration strategy (Section 15), workflow engine (Section 16), audit architecture (Section 27), reporting architecture (Section 28). |
| `MODULE_ARCHITECTURE.md` | Defines module architecture: catalogue, boundaries, contracts, dependencies, lifecycle, communication, versioning, extension points, configuration surface, isolation, testing, governance. |
| `CONFIGURATION_ARCHITECTURE.md` | Defines configuration internals: layer model, validation, versioning, audit, sandbox, hot-reload. |
| `SOFTWARE_ARCHITECTURE.md` | Defines implementation-grade architecture: layering, deployment, technology posture. |

### 18.2 Peer Module References

The HR module collaborates with the following peer modules. Each peer module's documentation provides the peer's contract surface, configuration surface, and integration posture.

| Peer Module | Collaboration |
|---|---|
| Patient | Employees as patients; consent-governed link between employee and patient records. |
| Workforce | Employee-to-practitioner link; shift assignment; staffing-rule check; credential tracking. |
| Billing | Practitioner identity for service invoicing; cost-centre for revenue attribution. |
| Accounting | Payroll-run posting to general ledger; cost-centre management. |
| Documents | Employment-contract storage; certificate storage; exit-document storage. |
| Notifications | Welcome notifications; pay-slip distribution; leave-status notifications; training-expiry alerts. |
| Audit | Audit-event recording for all consequential HR actions. |
| Reporting | HR data for operational, analytical, and regulatory reports. |
| Configuration | Layered configuration resolution for HR configuration keys. |
| Identity & Access | Employee-to-user-account link; role assignment; access revocation. |
| Localization | Locale-specific templates, formats, terminology for HR documents. |
| Integration | Integration with external payroll providers, time-clock systems, learning-management systems. |

### 18.3 Downstream References

The HR module's contract surface, configuration surface, and integration surface are elaborated in downstream documentation, including per-module specifications, integration contracts, and operational runbooks. Those downstream documents are subordinate to this document and to the canonical references above; conflicts are resolved in favour of the canonical references, then this document, then the downstream document. Downstream documents are amended through the standard change process when this document or a canonical reference is amended.
