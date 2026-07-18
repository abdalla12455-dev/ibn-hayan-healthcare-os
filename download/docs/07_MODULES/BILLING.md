# Ibn Hayan Healthcare Operating System
## Billing Module

| Field | Value |
|---|---|
| Document Title | Billing Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, regulators, revenue cycle leads, compliance officers |
| Scope | Invoice generation, payment processing, insurance claim lifecycle, denial management, refunds, adjustments, statements, co-pay collection, deductible tracking, aging, and revenue cycle KPIs for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, general ledger accounting, payroll, bank reconciliation, claim clearinghouse connectivity (owned by Integration module) |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Invoice Generation
5. Payment Processing
6. Insurance Claims
7. Refunds & Adjustments
8. Financial Reporting
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

The Billing module (M06 in this documentation suite, aligned with the Billing bounded context BC07 as catalogued in SYSTEM_ARCHITECTURE Section 7.2) is the revenue cycle engine of the Ibn Hayan Healthcare Operating System. Every clinical encounter that produces a chargeable service flows through this module: the encounter's services are translated into invoice line items, the patient's insurance coverage is applied, claims are prepared and submitted to payers, payments are posted and allocated, denials are managed and appealed, and statements are generated for patient responsibility. The Billing module is the operational bridge between clinical activity and financial realization; without a functioning billing capability, a healthcare organization cannot convert clinical work into revenue.

Ibn Hayan treats billing as a clinical-adjacent concern rather than as a purely financial utility. This positioning has direct architectural consequences: billing is owned by a single bounded context, accessed by every module that produces chargeable services through published contracts, and protected by audit and reconciliation guarantees that prevent revenue leakage, fraudulent claim submission, and inaccurate patient statements. An invoice generated in Ibn Hayan is a long-lived financial commitment whose lifecycle (draft, ready, submitted, partially paid, paid, written off, refunded) is governed by configurable state machines, not by ad hoc status changes.

### 1.2 Purpose and Business Value

The Billing module exists to convert clinical activity into accurate, timely, compliant revenue, in a way that respects payer requirements, patient financial responsibility, regulatory constraints, and organizational cash flow. Business value is realized through four mechanisms. First, claim generation accuracy reduces denials — a claim that is correctly coded, correctly patient-attributed, and correctly coverage-attributed is more likely to be paid on first submission. Second, denial management recovers revenue that would otherwise be lost — a denied claim that is appealed successfully recovers the revenue, with the denial reason feeding back into process improvement. Third, patient statement accuracy reduces billing inquiries and disputes — a patient who understands their statement is more likely to pay promptly and less likely to require costly billing support. Fourth, revenue cycle KPIs surface operational bottlenecks for management attention.

For customers, the Billing module is the financial backbone: a clinic that cannot bill cannot sustain operations, regardless of clinical quality. For regulators, the Billing module is the source of truth for claim accuracy, fraud prevention, and patient financial protection. For patients, the Billing module — through statements and payment channels — is the financial face of the healthcare organization.

### 1.3 Bounded Context Alignment

The Billing module aligns one-to-one with the Billing bounded context BC07, as catalogued in SYSTEM_ARCHITECTURE Section 7.2 and elaborated in MODULE_ARCHITECTURE Section 2.2. BC07 owns invoice lifecycle, claim lifecycle, payment posting, denial management, refund processing, and statement generation; it does not own general ledger accounting (BC08), patient identity (BC01), encounter clinical content (BC02), or payment channel connectivity (owned by the Integration module). The Billing bounded context is a customer in customer-supplier relationships with the Patient, Encounter, Orders & Results, and Configuration contexts; it is a supplier in customer-supplier relationships with the Accounting and Reporting contexts.

This alignment is stable. Per Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8), the Billing bounded context is not reorganized to accommodate features. New billing-related capabilities — for example, a new claim format, a new payment method, a new denial reason code set — are accommodated within the existing context through configuration, not through structural change. Customers can rely on this stability when planning integrations with payer systems, clearinghouses, and bank payment rails.

### 1.4 Module Composition

The Billing module is composed of the following capability areas, each elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: service pricing, invoice generation, insurance claim generation and submission tracking, denial management, payment posting, refund processing, statement generation, adjustment and write-off management, multi-payer billing, self-pay billing, co-pay collection, deductible tracking, aging reports, and revenue cycle KPIs. The module does not own encounter clinical content, general ledger accounting, or payment channel connectivity; it owns the financial transactions that connect clinical work to revenue. The module participates in workflows owned by other modules through its published event and query contracts.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the invoice and claim as organizing concepts; capabilities that do not share these organizing concepts belong in other modules. General ledger accounting, for example, lives in the Accounting module because it organizes financial transactions at the enterprise level, not at the patient-encounter level; the Billing module publishes events that the Accounting module consumes to record journal entries, but the Billing module does not own the ledger.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The Billing module owns invoice lifecycle from generation through final settlement, including all adjustments, refunds, and write-offs. It owns insurance claim lifecycle from generation through submission, adjudication, payment, denial, appeal, or write-off. It owns payment posting and allocation — applying received payments to the correct invoices and line items, with split allocation across multiple invoices where a single payment covers multiple services. It owns patient statement generation and delivery coordination (with dispatch owned by the Notifications module). It owns co-pay collection at the point of service, deductible tracking against the patient's annual deductible, and aging reports that surface overdue accounts. It owns the configuration surface for billing-related behaviour, including fee schedules, payer rules, denial reason code mappings, statement templates, and write-off authority limits.

The module also owns revenue cycle KPIs that surface billing operational performance for management. KPIs include first-pass claim acceptance rate, denial rate, days in accounts receivable, net collection rate, and write-off percentage. KPIs are computed from the module's transactional data and are surfaced through the Reporting module's contracts.

### 2.2 Out of Scope

The Billing module does not own general ledger accounting, chart of accounts, journal entry posting at the enterprise level, trial balance, or financial statements; these belong to the Accounting bounded context (BC08). It does not own patient identity, demographics, or insurance coverage master records; these belong to the Patient bounded context (BC01), queried at claim generation time to retrieve coverage information. It does not own encounter clinical content, clinical documentation, or clinical coding (ICD, CPT, HCPCS); these belong to the Clinical Documentation and Orders & Results bounded contexts, with the Billing module consuming the coded services through query contracts. It does not own payment channel connectivity — credit card processing, bank ACH, payer electronic funds transfer — which is owned by the Integration module's adapters.

The module also does not own payroll (that belongs to the HR bounded context), bank reconciliation (that belongs to the Accounting bounded context), or audit storage (that belongs to the Audit bounded context). The Billing module publishes events that the Audit module records, but it does not store audit records itself.

### 2.3 Invoice as Financial Commitment

The invoice is the financial commitment that connects clinical work to revenue in the Ibn Hayan platform. Every chargeable service flows into an invoice; every invoice generates claims to payers and statements to patients; every payment is allocated to invoices; every adjustment, refund, or write-off modifies an invoice. The Billing module is the canonical source of invoice state; every other module that needs financial information about a clinical service queries this module's contracts or subscribes to its events.

This central positioning imposes responsibilities on the Billing module. The module's state must be strongly consistent within an invoice, because inconsistent invoice state produces incorrect claims, incorrect statements, and incorrect accounting entries (Principle P5, SYSTEM_ARCHITECTURE Section 4.6). The module's audit must be complete, because every financial transaction is subject to regulatory scrutiny and dispute resolution. The module's data must be reconcilable, because billing data that does not reconcile to accounting data indicates a defect that must be investigated.

### 2.4 Multi-Payer and Multi-Currency Billing

Multi-payer billing allows the module to handle the full diversity of payer relationships that healthcare organizations maintain — commercial insurance, government insurance (Medicare, Medicaid, national health services), workers' compensation, auto insurance, and self-pay. Each payer has its own claim format, its own submission protocol, its own adjudication rules, and its own payment timing. The Billing module treats payers uniformly through a payer abstraction, with each payer having its own configuration profile that specifies claim format, submission protocol, and adjudication rules.

Multi-currency billing allows the module to handle tenants operating in multiple currency zones. A tenant operating in a region with a single national currency uses a single currency configuration; a tenant operating across multiple currency zones uses multi-currency configuration, with currency conversion applied at payment posting and at statement generation. Currency conversion rules are configurable per tenant, with the conversion rate source (central bank, commercial rate provider) specified in the tenant's configuration.

---

## 3. Key Features

### 3.1 Service Pricing

Service pricing maintains the fee schedule — the prices that the healthcare organization charges for each billable service. Fee schedules are configurable per tenant, per facility, per payer (a tenant may have different prices for the same service depending on the payer's contracted rate), and per clinic type. Pricing changes are versioned and effective-dated; a price change takes effect on the configured date, with invoices generated before the change preserving the original price. Pricing is validated against regulatory constraints — a price that exceeds a regulated maximum is rejected at validation time, and a price below cost is flagged for review.

### 3.2 Invoice Generation

Invoice generation translates clinical services into billable line items, applying the appropriate fee schedule, the appropriate coverage, and the appropriate billing rules. An invoice is generated when an encounter is closed (or at configured intervals for ongoing encounters), with the encounter's services, orders, and procedures aggregated into line items. Invoice generation is subject to clinical-coding validation — an invoice with missing or invalid codes is held for coding review before submission, preventing claim rejection.

### 3.3 Insurance Claim Generation

Insurance claim generation produces the claim file that is submitted to the payer, in the format required by the payer's configuration (HL7 FHIR Claim resource, X12 837 institutional/professional/dental, regional claim formats). Claim generation assembles the patient's identity, coverage, the encounter's services, the provider's identity, and the diagnosis codes into a structured claim, with validation ensuring the claim conforms to the payer's requirements before submission. Claims that fail validation are held for correction, with the validation failure reason documented for operational follow-up.

### 3.4 Claim Submission Tracking

Claim submission tracking monitors the status of submitted claims from submission through adjudication, payment, or denial. The Billing module publishes claim-submitted events and consumes claim-status events from the Integration module (which interfaces with clearinghouses and payer systems). Status tracking surfaces claims that are pending beyond the expected adjudication window, allowing billing staff to follow up with the payer. Status tracking also surfaces claims that have been acknowledged but not adjudicated, allowing proactive intervention before the claim ages into a denial.

### 3.5 Denial Management

Denial management handles claims that have been denied by the payer, with workflow for correction, appeal, or write-off. A denied claim is recorded with the denial reason code (mapped to a standardized code set for analysis), the denial category (coding error, eligibility error, medical necessity, coverage limitation, duplicate), and the recommended action (correct and resubmit, appeal, write off). Denial management tracks the denial through resolution, with appeal deadlines monitored and denial trends analyzed for process improvement.

### 3.6 Payment Posting

Payment posting applies received payments to the correct invoices and line items. Payments may be received from payers (electronic remittance with automated allocation), from patients (portal payment, in-person payment, mailed check), or from third parties (workers' comp, auto insurance). Automated allocation matches payments to invoices based on the remittance data; manual allocation is used where the remittance data is incomplete or where the payment does not match an invoice. Payment posting is subject to reconciliation — payments posted must reconcile to bank deposits, with discrepancies investigated.

### 3.7 Refund Processing

Refund processing handles refunds to patients or payers where an overpayment has been received — duplicate payment, payment in excess of the patient's responsibility, payment for a cancelled service. Refund requests are initiated by billing staff, validated against the invoice and payment history, approved per the tenant's refund authority limits, and dispatched through the appropriate payment channel. Refund processing is subject to regulatory constraints in some jurisdictions — refunds above a threshold may require reporting, and unclaimed refunds may be subject to escheatment.

### 3.8 Statement Generation

Statement generation produces patient statements for the patient's financial responsibility after insurance adjudication. Statements are generated on a configurable cadence (monthly, on-demand, on encounter close), with the statement content rendered from configurable templates. Statement generation coordinates with the Notifications module for delivery (postal mail, email, portal message), with the delivery channel selected based on the patient's preferences. Statement content includes the services rendered, the amount billed, the insurance payment, the adjustment, and the patient responsibility, with each line item dated and explained.

### 3.9 Adjustment and Write-off Management

Adjustment and write-off management handles invoice modifications that are not payments — contractual adjustments (the difference between the billed amount and the payer's contracted rate), bad-debt write-offs (invoices that cannot be collected), charity care write-offs (invoices forgiven under the organization's financial assistance policy), and small-balance write-offs (invoices below a threshold where continued collection effort is uneconomical). Each adjustment type has its own authority limits, its own accounting implications, and its own audit requirements. Write-offs are subject to compliance review for amounts above configured thresholds.

### 3.10 Multi-Payer Billing

Multi-payer billing allows the module to handle the diversity of payer relationships described in Section 2.4. The module's payer abstraction allows new payers to be added through configuration — a new payer's claim format, submission protocol, and adjudication rules are added to the payer configuration, and the module's claim generation, submission, and posting workflows honor the new configuration. Multi-payer billing is essential for healthcare organizations that serve patients across multiple insurance plans, which is the operational reality for nearly every healthcare organization.

### 3.11 Self-Pay Billing

Self-pay billing handles patients without insurance coverage or patients who choose to pay out-of-pocket despite having coverage. Self-pay invoices use the tenant's self-pay fee schedule (which may differ from the insurance fee schedule), with payment expected at the point of service or within a short payment window. Self-pay billing includes sliding-scale fee capabilities for tenants with financial assistance policies, with the patient's household income determining the applicable fee level. Self-pay billing is configurable per tenant, per clinic type, and per facility.

### 3.12 Co-pay Collection

Co-pay collection captures the patient's co-payment at the point of service, before the encounter begins. Co-pay amounts are determined by the patient's insurance plan configuration, with the Billing module querying the patient's coverage to determine the co-pay amount for the appointment type. Co-pay collection may be performed by reception staff at check-in (with the Reception module consuming the Billing module's contracts) or through the patient portal for telehealth and pre-paid appointments. Co-pay collection is recorded as a payment against the encounter's eventual invoice.

### 3.13 Deductible Tracking

Deductible tracking monitors the patient's accumulated spending against their annual deductible, both for the patient's information and for the billing workflow's use. When a patient has not met their deductible, the patient is responsible for the full allowed amount; when the patient has met their deductible, the insurance plan's cost-sharing provisions apply. Deductible tracking relies on the payer's eligibility verification (queried through the Integration module) and on the patient's accumulated claim history within the tenant. Deductible status is surfaced at the point of service to inform the patient of expected financial responsibility.

### 3.14 Aging Reports

Aging reports surface overdue accounts for collection action. Reports categorize outstanding invoices by age (current, 30 days, 60 days, 90 days, 120+ days), with the aging buckets configurable per tenant. Aging reports drive the collection workflow — invoices in the 30-day bucket receive a reminder statement, invoices in the 60-day bucket receive a follow-up call, invoices in the 90-day bucket are escalated to a collection agency or written off per the tenant's collection policy. Aging reports are generated through the Reporting module's contracts.

### 3.15 Revenue Cycle KPIs

Revenue cycle KPIs surface billing operational performance for management. KPIs include first-pass claim acceptance rate (percentage of claims paid on first submission, without resubmission), denial rate (percentage of claims denied, by denial category), days in accounts receivable (average days from service to payment), net collection rate (percentage of contractual amount collected), and write-off percentage (percentage of billed amount written off). KPIs are computed from the module's transactional data, are surfaced through the Reporting module's contracts, and are trended over time to identify operational improvement or degradation.

---

## 4. Invoice Generation

### 4.1 Invoice Generation Triggers

Invoice generation is triggered by encounter closure, by scheduled batch generation for ongoing encounters (inpatient, long-term care), by manual initiation for ad hoc billing, and by external system events (a laboratory result that produces a chargeable service). The trigger determines the invoice's initial content and the workflow that follows. Encounter-closure-triggered invoices are the most common and the most automated; the encounter's services, orders, and procedures are aggregated into line items, with validation ensuring all required coding is present. Batch-generated invoices are used for ongoing encounters where interim billing is required; the batch cadence is configurable per encounter type and per facility.

### 4.2 Line Item Aggregation

Line item aggregation translates clinical services into billable line items. Each line item references a service code (CPT, HCPCS, regional equivalent), a diagnosis code (ICD-10, regional equivalent) that justifies the service, the provider who rendered the service, the date of service, and the units (count or time). Line items are validated against coding rules — a service code without a supporting diagnosis code is held for coding review, a service code that is incompatible with the encounter type is flagged, and duplicate line items are consolidated. Line item aggregation preserves the link between the billable service and the clinical record that produced it, supporting audit and dispute resolution.

### 4.3 Fee Schedule Application

Fee schedule application determines the price for each line item based on the tenant's fee schedule configuration. The fee schedule is selected based on the patient's coverage (insurance fee schedule, self-pay fee schedule, sliding-scale fee schedule), the facility where the service was rendered, and the clinic type. The selected fee schedule's price for the service code is applied to the line item, with the price effective as of the date of service. Fee schedule application is audited; the fee schedule used, the version, and the price applied are recorded for each line item, supporting price-change reconciliation and dispute resolution.

### 4.4 Invoice Validation

Invoice validation ensures the generated invoice conforms to billing rules before submission. Validation categories include coding validation (all service codes are valid, all diagnosis codes are valid and support the services), coverage validation (the patient's coverage is active on the date of service), pricing validation (the prices applied are consistent with the fee schedule), and regulatory validation (the invoice conforms to the regulatory framework in force for the tenant's region). Validation failures are recorded with the failure reason and the invoice is held for correction, with billing staff notified through the operational workflow.

---

## 5. Payment Processing

### 5.1 Payment Capture Channels

Payment capture channels include in-person payment (credit card, cash, check at the reception desk), portal payment (credit card, bank transfer through the patient portal), mailed payment (check by postal mail), telephone payment (credit card through a secure IVR or agent-assisted channel), and payer electronic payment (automated through the Integration module's contracts with clearinghouses and bank rails). Each channel has its own configuration, its own reconciliation characteristics, and its own audit requirements. Channel availability is configurable per tenant, per facility, and per clinic type.

### 5.2 Payment Allocation

Payment allocation applies received payments to the correct invoices and line items. Automated allocation uses the remittance data that accompanies payer payments to match payments to invoices; manual allocation is used where the remittance data is incomplete or where the payment does not match an invoice (a patient payment without invoice reference, a check that covers multiple family members' invoices). Allocation is subject to validation — a payment allocated to an invoice that is already fully paid is flagged, an over-allocation that would produce a negative balance is rejected. Allocation is audited, with the allocator (automated or user), the time, the payment, and the target invoice recorded.

### 5.3 Payment Reconciliation

Payment reconciliation ensures that payments posted in the Billing module reconcile to deposits recorded in the Accounting module and to bank deposits recorded by the tenant's bank. Reconciliation is performed at configurable intervals (daily for high-volume tenants, weekly for lower-volume tenants), with discrepancies investigated and resolved. Reconciliation failures may indicate a posting error (a payment posted to the wrong invoice), a deposit error (a deposit recorded for the wrong amount), or a bank error (a deposit that did not arrive). Reconciliation is a primary control against revenue leakage and fraud; unreconciled payments are escalated for investigation.

### 5.4 Refund Initiation

Refund initiation handles refund requests from billing staff or from automated workflows that detect overpayments. A refund request is validated against the invoice and payment history to confirm the overpayment, is approved per the tenant's refund authority limits (small refunds may be auto-approved, large refunds require supervisor approval), and is dispatched through the appropriate payment channel. Refund processing is audited, with the initiator, the approver, the amount, the invoice, the payment being refunded, and the dispatch channel recorded. Refunds above regulatory thresholds are reported per the regulatory framework in force.

---

## 6. Insurance Claims

### 6.1 Claim Generation

Claim generation produces the claim file that is submitted to the payer. The claim file is assembled from the invoice's line items, the patient's identity and coverage, the provider's identity and qualifications, and the encounter's clinical context (diagnosis codes, service dates, place of service). The claim file is rendered in the format required by the payer's configuration — HL7 FHIR Claim resource for modern payer interfaces, X12 837 for US payer interfaces, regional claim formats for other jurisdictions. Claim generation is validated against the payer's requirements; a claim that fails validation is held for correction before submission.

### 6.2 Claim Submission

Claim submission dispatches the generated claim to the payer through the Integration module's contracts. The Integration module interfaces with clearinghouses (which route claims to payers) and with payer-direct submission channels. Submission is recorded with the submission time, the submission channel, the claim identifier, and the payer's acknowledgment (where immediately available). Submission failures (network errors, clearinghouse rejections) are surfaced for retry, with the retry cadence configurable per tenant. Submission tracking allows billing staff to monitor the claim's progress from submission through adjudication.

### 6.3 Claim Adjudication Tracking

Claim adjudication tracking monitors the claim's status as the payer processes it. The Integration module consumes claim-status events from the clearinghouse or payer-direct channel and forwards them to the Billing module, which updates the claim's status and triggers downstream workflows. Status transitions include submitted, acknowledged, in adjudication, partially paid, fully paid, denied, pended for information, and appealed. Adjudication tracking surfaces claims that are pending beyond the expected window, allowing billing staff to follow up proactively with the payer.

### 6.4 Denial and Appeal Management

Denial and appeal management handles claims that have been denied by the payer. A denied claim is recorded with the denial reason code (mapped to a standardized code set), the denial category (coding error, eligibility error, medical necessity, coverage limitation, duplicate, timely filing), and the recommended action. Correctable denials are corrected and resubmitted; appealable denials are appealed with supporting documentation; non-appealable denials are written off or transferred to patient responsibility per the denial category. Appeal deadlines are monitored, with appeals submitted before the deadline expires. Denial trends are analyzed for process improvement — a high denial rate for a specific denial category indicates a process defect that should be addressed at the source.

---

## 7. Refunds & Adjustments

### 7.1 Refund Workflow

The refund workflow initiates, validates, approves, and dispatches refunds to patients or payers. Initiation may be manual (billing staff identifies an overpayment) or automated (the module detects a duplicate payment or an overpayment above a configured threshold). Validation confirms the overpayment against the invoice and payment history. Approval is governed by the tenant's refund authority limits — small refunds may be auto-approved, larger refunds require supervisor approval, very large refunds require compliance review. Dispatch is through the appropriate payment channel (bank transfer, check, credit card reversal). The workflow is fully audited, with each step recorded for regulatory and dispute resolution purposes.

### 7.2 Adjustment Types

Adjustments modify an invoice's balance without a corresponding payment. Adjustment types include contractual adjustment (the difference between the billed amount and the payer's contracted rate, recorded when the payer's payment is less than the billed amount), bad-debt write-off (an invoice that cannot be collected, recorded when collection effort is exhausted), charity care write-off (an invoice forgiven under the organization's financial assistance policy, recorded after the patient's eligibility for the policy is verified), small-balance write-off (an invoice below a threshold where continued collection effort is uneconomical, recorded after the threshold check), and timely-filing write-off (a claim that was not submitted within the payer's timely filing window, recorded when the deadline is missed).

### 7.3 Write-off Authority

Write-off authority limits are configurable per tenant, per role, and per adjustment type. Small adjustments may be auto-approved by the system; larger adjustments require approval from a biller, supervisor, or compliance officer per the configured limits. Authority limits are subject to segregation-of-duty controls — the user who initiates an adjustment cannot be the user who approves it for adjustments above a configured threshold. Authority limits are audited; write-offs above regulatory thresholds are reported per the regulatory framework in force.

### 7.4 Adjustment Accounting

Adjustments have accounting implications that are communicated to the Accounting module through events. A contractual adjustment reduces revenue; a bad-debt write-off moves a receivable to bad-debt expense; a charity care write-off reduces revenue and is reported separately for regulatory purposes; a small-balance write-off is treated as a discount. The Accounting module consumes the adjustment events and records the appropriate journal entries, with the entry's accounts determined by the adjustment type's accounting configuration. Adjustment accounting is reconciled to invoice balances — adjustments posted in the Billing module must reconcile to journal entries recorded in the Accounting module.

---

## 8. Financial Reporting

### 8.1 Revenue Cycle Reports

Revenue cycle reports surface billing operational performance for management. Reports include charge summary by provider, facility, and clinic type; payment summary by payer and channel; denial analysis by category and payer; accounts receivable aging; collection rate trends; and write-off analysis by type and reason. Reports are generated through the Reporting module's contracts, with the Billing module providing the underlying data through query contracts and event subscriptions. Reports are typically consumed by billing managers, chief financial officers, and revenue cycle directors for operational and strategic decision-making.

### 8.2 Payer Performance Reports

Payer performance reports surface payer-specific metrics that inform payer relationship management. Reports include payer-specific denial rate, days-to-pay, reimbursement rate vs. contracted rate, and claim volume trends. Payer performance reports are used in payer contract negotiations — a payer with a high denial rate or slow payment may warrant renegotiation of contract terms or operational escalation. Payer performance reports are also used operationally — a sudden increase in denials from a specific payer may indicate a payer-side change that requires billing workflow adjustment.

### 8.3 Patient Financial Reports

Patient financial reports surface patient-level financial information for patient communication and dispute resolution. Reports include patient statement history, payment history, claim status, and outstanding balance. These reports are typically consumed by patient financial counsellors and billing support staff when responding to patient inquiries. Patient financial reports are subject to permission scoping — a billing support staff member may view a patient's financial history only for patients within their scope of authority, in keeping with the permission philosophy in PRODUCT_BIBLE Section 21.

### 8.4 Regulatory Financial Reports

Regulatory financial reports surface billing-related compliance evidence. Reports include claim accuracy reports (for regulators monitoring claim accuracy and fraud), charity care reports (for regulators monitoring community benefit), bad-debt reports (for regulators monitoring collection practices), and refund reports (for regulators monitoring overpayment handling). Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8.

---

## 9. User Roles

### 9.1 Roles That Interact with Billing

The following roles interact with billing through the Billing module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2.

| Role Code | Role | Typical Billing-Related Responsibilities |
|---|---|---|
| R01 | Physician | View service charges for own encounters; sign claim attestation |
| R02 | Nurse | Document chargeable services rendered |
| R05 | Allied health professional | Document chargeable services rendered |
| R06 | Receptionist | Co-pay collection at check-in; payment posting |
| R07 | Scheduler | Verify insurance eligibility at booking |
| R08 | Biller | Claim generation, submission, denial management, payment posting, refunds |
| R09 | Administrator | Billing oversight, write-off approval, payer relationship management |
| R10 | Compliance officer | Audit review of billing actions, fraud investigation |
| R12 | Executive | Revenue cycle KPI review, financial oversight |
| R13 | System administrator | Tenant configuration of billing behaviour |
| R14 | Integration account | System-to-system claim submission and payment posting |

### 9.2 Permission Categories

Permissions on billing resources are defined at the action level on the billing resource, in keeping with the permission philosophy in PRODUCT_BIBLE Section 21.2. Read permissions include viewing invoice, viewing claim, viewing payment, viewing statement, viewing adjustment. Write permissions include generating invoice, submitting claim, posting payment, initiating refund, recording adjustment. Execute permissions include claim validation, payment allocation, refund approval. Administer permissions include configuring fee schedules, configuring payer rules, configuring write-off authority limits.

### 9.3 Segregation of Duties

Billing operations are subject to segregation-of-duty controls to prevent fraud and error. The user who generates an invoice cannot be the user who posts the payment for that invoice; the user who initiates a refund cannot be the user who approves it; the user who records a write-off cannot be the user who approves it for adjustments above configured thresholds. Segregation-of-duty controls are enforced by the Identity & Access module's permission framework and are reviewed by the compliance officer role. Violations of segregation-of-duty controls are recorded in the audit trail and are surfaced for compliance review.

---

## 10. Workflows

### 10.1 Workflows the Module Triggers

The Billing module triggers workflows in response to billing lifecycle events. Invoice generation triggers claim generation and statement generation workflows. Claim submission triggers claim adjudication tracking. Payment posting triggers payment allocation and reconciliation workflows. Denial recording triggers denial management workflow with correction, appeal, or write-off paths. Refund initiation triggers refund approval and dispatch workflow. Adjustment recording triggers accounting event publication to the Accounting module. Aging threshold crossing triggers collection workflow with escalation paths.

### 10.2 Workflows the Module Participates In

The Billing module participates in workflows owned by other modules by responding to queries and by consuming events. The Encounter module notifies the Billing module when an encounter is closed, triggering invoice generation. The Patients module provides patient identity, coverage, and deductible information at claim generation. The Orders & Results module provides chargeable service information for orders and results. The Pharmacy module provides chargeable medication information. The Reception module queries the Billing module for co-pay amounts and posts payments at check-in. The Accounting module consumes billing events to record journal entries.

### 10.3 Audit Events Generated

The Billing module generates audit events for every consequential action, in keeping with the audit architecture defined in SYSTEM_ARCHITECTURE Section 27. Audit events include invoice generation, line item modification, claim generation, claim submission, claim status change, denial recording, denial appeal, payment posting, payment allocation, refund initiation, refund approval, refund dispatch, adjustment recording, write-off approval, statement generation, statement delivery, and fee schedule change. Every audit event includes the actor, the action, the resource, the tenant, the scope, the previous state, the new state, the authorization basis, the result, and the context, per the audit record structure in SYSTEM_ARCHITECTURE Section 27.4.

Billing audit events are particularly important for financial accountability and fraud prevention. Every financial transaction is traceable from clinical service through invoice, claim, payment, and accounting entry. The audit trail allows compliance officers and regulators to reconstruct any financial event, identify the actors involved, and verify the authorization basis. Billing audit records are immutable, append-only, and tamper-evident, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

---

## 11. Data Models

### 11.1 Core Entities

The Billing module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Invoice | The canonical invoice entity |
| Invoice Line Item | A billable service within an invoice |
| Payment | A received payment |
| Payment Method | The channel and instrument used for payment |
| Adjustment | A balance modification that is not a payment |
| Refund | A payment returned to the payer |
| Claim | An insurance claim submitted to a payer |
| Claim Line | A billable service within a claim |
| Denial | A payer's denial of a claim or claim line |
| Write-off | An invoice balance reduction for uncollectible amounts |
| Statement | A patient statement of financial responsibility |

### 11.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Fee Schedule defines prices for billable services. The Payer Configuration specifies claim format, submission protocol, and adjudication rules per payer. The Denial Reason Code maps payer-specific denial reasons to standardized categories. The Statement Template defines statement content and format. The Write-off Authority Limit specifies approval thresholds per role and adjustment type. The Remittance Record documents the payment remittance data received from a payer. The Allocation Record documents how a payment is allocated across invoices.

### 11.3 Entity Relationships

Core entities relate to the Invoice entity as the central billing object. An Invoice references a Patient (owned by the Patients module), an Encounter (owned by the Encounter module), and one or more Invoice Line Items. A Payment references one or more Invoices (through Allocation Records) and a Payment Method. A Claim references an Invoice and produces Claim Lines that correspond to Invoice Line Items. A Denial references a Claim or Claim Line. A Refund references a Payment. A Statement references a Patient and one or more Invoices. References to peer-module entities are logical identifiers, not direct data-store references (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8).

---

## 12. Integrations

### 12.1 Peer Module Integrations

The Billing module integrates with peer modules through published contracts. The Patients module is queried for patient identity, coverage, and deductible status at claim generation. The Encounter module notifies the Billing module of encounter closure, triggering invoice generation. The Orders & Results and Pharmacy modules provide chargeable service information. The Accounting module consumes billing events to record journal entries. The Notifications module consumes statement-generation events to dispatch patient statements through preferred channels. The Reporting module consumes billing data for operational, analytical, and regulatory reports. The Reception module queries the Billing module for co-pay amounts and posts payments at check-in.

### 12.2 External System Integrations

External system integrations are mediated by the Integration module (deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the Billing module's contracts through integration adapters that align with healthcare financial interoperability standards — HL7 FHIR for claim and payment exchange (Claim, ExplanationOfBenefit, PaymentNotice resources), X12 for US electronic data interchange (837 claim, 835 remittance, 820 payment, 270/271 eligibility), and regional claim and payment formats. The Integration module also interfaces with payment channel providers (credit card processors, bank ACH networks) for payment capture and refund dispatch. The Billing module is not aware of the specific external systems; it is aware only of the Integration module's contracts.

### 12.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Synchronous command is used for payment posting and refund initiation where immediate confirmation is required. Synchronous query is used for eligibility verification and claim status lookup. Asynchronous event is used for billing lifecycle events (invoice generation, claim submission, payment posting) that peer modules consume without requiring immediate response. The outbox pattern is used for claim submission events, ensuring that claims are submitted even in the presence of transient failures between the Billing module and the Integration module. Anticorruption layers translate between external payer and payment channel models and the Ibn Hayan billing model, preventing external model leakage per the context relationship pattern in SYSTEM_ARCHITECTURE Section 7.3.

---

## 13. Configuration

### 13.1 Configuration Categories

The Billing module's configuration surface is organized into the categories defined in MODULE_ARCHITECTURE Section 10.3. Behavioural configuration includes fee schedules, payer rules, denial reason code mappings, write-off authority limits, statement templates, and aging bucket definitions. Structural configuration includes feature flags for capabilities like automated claim submission, automated payment allocation, and sliding-scale self-pay billing. Integration configuration includes payer endpoints, clearinghouse credentials, and payment channel credentials. Localization configuration includes statement templates in multiple languages, regional claim formats, and currency conversion rules. Security configuration includes write-off authority scoping, refund approval thresholds, and segregation-of-duty rules. Regulatory configuration includes charity care policy parameters, bad-debt reporting thresholds, and refund reporting thresholds.

### 13.2 Tenant-Configurable vs Platform-Configurable

The configuration surface distinguishes between tenant-configurable categories and platform-configurable categories, per MODULE_ARCHITECTURE Section 10.3. Tenant-configurable categories include fee schedules, payer rules, statement templates, and write-off authority limits; these may be overridden by tenant administrators within validation constraints. Platform-configurable categories include the invoice state machine, the claim state machine, the audit record structure, and the segregation-of-duty controls; these are reserved for the platform and may not be overridden by tenants. The distinction is enforced by the Configuration module's service and is part of the configuration schema published by the Billing module.

### 13.3 Configuration Governance

Configuration governance follows the framework defined in MODULE_ARCHITECTURE Section 10.5 and SYSTEM_ARCHITECTURE Section 8.7. Every configuration change is validated before application, audited on application, reversible through rollback, and reviewable through the audit trail. Changes that affect financial accuracy — for example, a change to fee schedule prices — require compliance review. Changes that affect regulatory compliance — for example, a change to charity care policy parameters — require compliance officer review. Changes that affect segregation-of-duty controls — for example, a change to write-off authority limits — require architectural review. The governance posture is documented in the module's configuration schema and is reviewed at architectural review.

The Billing module's configuration governance is particularly stringent because of the module's financial accountability. A configuration change that compromises financial integrity — for example, a change to automated payment allocation that bypasses reconciliation — propagates to the Accounting module and may produce inaccurate financial statements. The module's configuration schema marks such changes as requiring architectural review, with the review conducted by the Architecture Council rather than by tenant administrators alone. This is the operational expression of Principle P1 (Healthcare Safety Overrides All Others) and Principle P13 (Auditability as Primitive) applied to financial configuration.

---

## 14. Permissions

### 14.1 Action-Level Permissions on Billing Resources

Permissions are defined at the action level on the billing resource, per PRODUCT_BIBLE Section 21.2. The permission matrix includes read, write, execute, and administer actions on invoice, claim, payment, adjustment, refund, statement, and fee schedule resources. The matrix is large but stable, because actions and resources evolve slowly. Direct user-permission assignment is forbidden; permissions are assigned through roles, per PRODUCT_BIBLE Section 21.3.

### 14.2 Scoping Rules

Permissions are scoped, not global, per PRODUCT_BIBLE Section 21.4. A biller may have write permission on invoices at their facility without having write permission on invoices at another facility. Scoping is by organizational unit, by facility, by department, by payer (a biller may be scoped to handle specific payers), and by invoice amount (a biller may be scoped to handle invoices below a threshold, with larger invoices requiring supervisor handling). Scoping is enforced at the action level; a biller without write permission on a specific invoice cannot modify that invoice through any surface.

### 14.3 Permission Inheritance and Segregation of Duties

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 6.6 and PRODUCT_BIBLE Section 21.5. Inheritance is explicit, documented, and auditable; it is not automatic. Segregation-of-duty controls are layered on top of inheritance, preventing the same user from holding conflicting permissions on the same financial scope. A user with write permission on invoice generation is excluded from holding write permission on payment posting for the same facility, regardless of inheritance rules. Segregation-of-duty exclusions are configured per role combination and per financial scope, with the compliance officer role having visibility into the exclusions for review.

---

## 15. Reports

### 15.1 Operational Reports

Operational reports surface billing activity for daily operational management. Reports include daily charge summary, daily payment summary, claim submission status, denial queue status, refund queue status, and statement generation status. Operational reports are generated through the Reporting module's contracts, with the Billing module providing the underlying data. Reports are typically consumed by billing managers and billing staff for day-to-day operational decisions.

### 15.2 Analytical Reports

Analytical reports surface revenue cycle trends for strategic planning. Reports include revenue cycle KPIs over time (first-pass acceptance rate, denial rate, days in AR, net collection rate, write-off percentage), payer performance comparison, provider productivity (charges and collections by provider), clinic type profitability, and patient payment behaviour analysis. Analytical reports are generated through the Reporting module's analytical pipeline, with billing data aggregated over time and across facilities.

### 15.3 Regulatory Reports

Regulatory reports surface billing-related compliance evidence. Reports include claim accuracy reports, charity care reports, bad-debt reports, refund reports, and Medicare/Medicaid cost reports (where applicable to the tenant's region). Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8. Regulatory report formats are configurable per regulatory framework, with the Localization module's configuration surface governing the regional selection.

---

## 16. API Surface

### 16.1 Contract Categories

The Billing module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the Billing module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 16.2 Command Contracts

Command contracts are requests to perform an action that changes billing state. Examples include GenerateInvoice, SubmitClaim, PostPayment, AllocatePayment, InitiateRefund, ApproveRefund, RecordAdjustment, ApproveWriteOff, GenerateStatement, CancelInvoice. Commands are synchronous where the caller requires immediate confirmation, asynchronous where the caller does not. Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the audit trail. Commands are idempotent where the operation supports idempotency, allowing safe retry in the presence of transient failures.

### 16.3 Query Contracts

Query contracts are requests to retrieve billing state without changing it. Examples include GetInvoice, GetClaim, GetClaimStatus, GetPatientBalance, GetPaymentHistory, GetAgingReport, GetFeeSchedule. Queries are synchronous, returning the requested state or a not-found response. Queries are scoped to the caller's authority — a caller without read permission on an invoice receives a not-found response rather than the invoice's data.

### 16.4 Event Contracts

Event contracts are notifications that something has happened in the Billing module. Examples include InvoiceGenerated, ClaimSubmitted, ClaimAdjudicated, PaymentPosted, RefundInitiated, RefundApproved, RefundDispatched, AdjustmentRecorded, StatementGenerated, FeeScheduleChanged. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which peer modules (especially the Accounting module) maintain their local projections of billing data.

### 16.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the Billing module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy.

---

## 17. Future Enhancements

### 17.1 Extension Points

The Billing module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom claim formats (for payers whose formats are not supported by the platform defaults), custom denial reason code mappings (for payer-specific denial reason codes), custom statement templates (for tenants whose statement requirements exceed the platform defaults), and custom fee schedule rules (for tenants whose pricing logic is non-standard). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

### 17.2 Module Lifecycle

The Billing module is at the Mature stage of the module lifecycle (LC4, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6). The module has been in General Availability since the platform's initial release, has completed the defined period of stable operation required for transition to Mature, and has a long-term support commitment. The module's contracts are stable; breaking changes follow the platform's deprecation policy.

### 17.3 Edition Availability

The Billing module is included in every edition of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) provides basic invoice generation with limited data volume. The Essential edition (E1) provides full invoice generation, claim submission, payment posting, and statement generation for single-payer configurations. The Professional edition (E2) adds multi-payer billing, denial management, refund processing, and aging reports. The Enterprise edition (E3) adds revenue cycle KPIs, payer performance analytics, advanced write-off management, and integration with external billing systems. Edition packaging does not modify module internals; all editions run the same code.

### 17.4 Clinic Type Relevance

The Billing module is relevant to every clinic type catalogued in PRODUCT_BIBLE Section 18.2 that bills for services. The following clinic types have particular reliance on advanced billing module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C1 General practice | Multi-payer billing; high-volume claim generation |
| C5 Obstetrics and gynaecology | Global payment billing for pregnancy; multi-service invoices |
| C6 Cardiology | Procedure billing; high-value services with complex coding |
| C11 Oncology | chemotherapy billing; drug acquisition cost tracking |
| C13 Orthopaedics | Procedure billing; implant billing |
| C18 Emergency department | Complex multi-payer billing; charity care and bad-debt management |
| C20 Day surgery | Procedure billing; facility fee and professional fee split |
| C23 Pharmacy | Pharmacy billing; drug-specific claim formats |
| C30 Long-term care facility | Periodic billing; long-stay invoice generation |

### 17.5 Operational Considerations

Operational considerations for the Billing module include claim submission volume, payment posting concurrency, and reconciliation integrity. Claim submission volume can be substantial for high-volume tenants — a tenant with 100,000 encounters per month may submit 100,000 or more claims, requiring the Integration module's clearinghouse interface to handle the volume. Submission failures are monitored; a sustained failure rate triggers operational investigation and may indicate a clearinghouse outage or a configuration issue.

Payment posting concurrency is a concern for tenants with multiple billers posting payments simultaneously. The module's payment allocation logic must produce correct results under concurrent access, with locking or optimistic concurrency control ensuring that two billers cannot allocate the same payment to different invoices. Reconciliation integrity is the most critical operational concern — billing data that does not reconcile to accounting data indicates a defect that must be investigated immediately, as unreconciled discrepancies may indicate fraud, error, or system malfunction. Reconciliation is performed at configurable intervals, with discrepancies escalated for investigation.

Offline operation is supported for limited billing functions at facilities with intermittent connectivity — payment capture at check-in, invoice viewing, and statement generation can be performed offline, with synchronization to the central platform when connectivity is restored. Claim submission is not supported offline, as it requires real-time communication with the clearinghouse; offline-captured claims are queued for submission when connectivity is restored, in keeping with the offline-first principle (P11, SYSTEM_ARCHITECTURE Section 4.11) for non-clinical data.

---

## 18. Related Documents

### 18.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (M09 Billing, BC07)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P2, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC07 Billing)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface

### 18.2 Peer Module References

- PATIENTS.md — Patient module (BC01); provides patient identity, coverage, and deductible status
- APPOINTMENTS.md — Scheduling module (BC06); provides encounter context for invoice generation
- ACCOUNTING.md — Accounting module (BC08); consumes billing events for journal entry recording
- RECEPTION.md — Reception module (subset of BC06 + BC01); consumes co-pay contracts at check-in
- DOCTORS.md — Workforce module (BC10); provides provider identity for claim attribution
- AUDIT_LOGS.md — Audit module (BC17); records every consequential billing-related action

### 18.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit
