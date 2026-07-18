# Ibn Hayan Healthcare Operating System — Subscriptions Module (M19)

| Field | Value |
|---|---|
| Document Title | Subscriptions Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Product leaders, commercial-domain owners, healthcare operations executives, customer-success leaders, finance leaders, compliance officers, integration architects |
| Scope | Subscriptions capability: plan catalogue, subscription lifecycle (trial, paid, upgrade, downgrade, cancel, renew), usage tracking, quota enforcement, overage handling, proration, renewal automation, dunning management, payment-method management, subscription analytics |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, UI component catalogues, deployment runbooks, vendor selection, payment-processor contracts, tax determination, currency-conversion strategy |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through product or architectural governance. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Subscription Plans
5. Billing Cycles
6. Upgrades & Downgrades
7. Trial Management
8. Subscription Analytics
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

The Subscriptions module is the platform's commercial engine: it manages the relationships between Ibn Hayan's customers and the editions they subscribe to, the usage they consume, the quotas they are subject to, the upgrades and downgrades they request, and the renewals and cancellations that conclude or extend their commercial relationship with the platform. The module exists because a SaaS platform's commercial model is operationally distinct from its clinical, operational, and administrative domains, and the discipline required to manage subscriptions correctly — accurate invoicing, correct proration, reliable renewal, graceful dunning, fair quota enforcement — is distinct from the discipline of the modules that produce the underlying usage. Ibn Hayan treats subscriptions as a module (M19) that consumes the Billing module's invoicing capability and that is consumed by every other module through quota-enforcement contracts.

The module's contribution to the Ibn Hayan platform is the trustworthy, auditable, configurable management of the commercial lifecycle. Every consequential action — plan purchase, upgrade, downgrade, renewal, cancellation, refund, dunning escalation — is recorded in the audit trail with the actor, the time, the scope, the previous and new state, and the financial impact. The audit posture is non-negotiable and is the basis on which Ibn Hayan demonstrates revenue recognition accuracy to its auditors, demonstrates billing correctness to its customers, and demonstrates tax-compliance to tax authorities. The module is the single authoritative source for what each customer is subscribed to at any given moment, and that authority is what makes the platform's multi-tenant enablement coherent — a tenant's edition packaging (PRODUCT_BIBLE Section 16.7, SYSTEM_ARCHITECTURE Section 9.7) is driven by the subscription state managed by this module.

### 1.2 Bounded Context Alignment

The Subscriptions module has no dedicated bounded context in the catalogue defined in SYSTEM_ARCHITECTURE Section 7.2. The absence reflects the fact that subscriptions is a commercial-domain capability that is implemented through collaboration with several existing bounded contexts: the Billing context (BC07) for invoicing, the Accounting context (BC08) for revenue recognition, the Configuration context (BC16) for edition packaging, and the Identity & Access context (BC15) for tenant identity. The module is a deployable unit that orchestrates these contexts to deliver the commercial lifecycle. The deviation from the default one-to-one bounded-context-to-module mapping is documented implicitly through the bounded-context catalogue's scope (commercial concerns are not listed as a bounded context) and is governed by the standard amendment process; if a future ADR ratifies a Subscriptions bounded context, the module will align one-to-one.

The Subscriptions module is a customer of the Billing context (BC07) for invoice generation and payment posting; a customer of the Accounting context (BC08) for revenue recognition and deferred-revenue management; a customer of the Configuration context (BC16) for edition packaging and plan configuration; a customer of the Identity & Access context (BC15) for tenant identity and subscription-to-tenant linkage; a customer of the Audit context (BC17) for the immutable record of every subscription action; and a customer of the Notifications context (BC14) for renewal reminders, payment-failure notices, and subscription-status notifications. The Subscriptions module is a supplier to every other module through quota-enforcement contracts: when a module performs an action that consumes a quota (e.g., creating a new patient record, sending a notification, generating a report), it queries the Subscriptions module to verify that the quota has not been exceeded.

### 1.3 Business Value

The business value of the Subscriptions module is measured in three outcomes that matter to Ibn Hayan's commercial operations and to the customer's commercial relationship with the platform. First, revenue accuracy: the module ensures that every customer is invoiced correctly for the edition they subscribe to, the usage they consume, and the overages they incur, with revenue recognized in accordance with accounting standards. Without revenue accuracy, the platform's financial reporting is unreliable, which compromises investor trust, regulatory compliance, and operational planning. Second, customer success: the module supports the trial-to-paid conversion path, the upgrade path as customers grow, and the renewal path that retains customers over time, all of which are essential to the platform's commercial sustainability. Third, fair usage enforcement: the module enforces quotas consistently across customers, ensuring that no customer consumes more than their subscription entitles them to and that the platform's shared resources are allocated fairly.

For Ibn Hayan itself, the module is the operational expression of the platform's SaaS commercial model (PRODUCT_BIBLE Section 13, Section 16). Without a unified subscriptions module, the platform's commercial operations would fragment into per-edition billing scripts, per-customer quota spreadsheets, and per-region renewal calendars, with the predictable consequences: inconsistent invoicing, fragmented audit, impossible-to-enforce quotas, and degraded customer experience. The module's unified surface is the foundation of the platform's claim that it operates as a single SaaS platform across the customer spectrum.

### 1.4 Position in the Platform

The Subscriptions module sits in the Platform category alongside Configuration, Audit, Identity & Access, Integration, Reporting, and Localization. It depends on Platform modules — Identity & Access, Configuration, Audit, Localization, Integration, Reporting, Notifications — and on the Billing module for invoice generation. The dependency direction flows the other way in a limited sense: every other module consumes the Subscriptions module's quota-enforcement contracts, querying the module before performing quota-consuming actions. The module's contract surface is consumed by other modules through synchronous query (for quota checks), asynchronous event (for subscription-state changes that affect module behaviour), and configuration-schema consumption (for edition packaging rules).

The module is enabled per tenant per edition packaging rules in PRODUCT_BIBLE Section 16.7 and SYSTEM_ARCHITECTURE Section 9.7. The Subscriptions capability is available in all editions, including the Trial edition, because subscription management is essential to operating the Trial-to-paid conversion path. The module's depth does not vary by edition: the same capability manages all editions, including the management of the Trial edition itself. The uniform depth is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to commercial operations: the same commercial engine serves all customers, with variation expressed through configuration rather than through edition-specific capability.

---

## 2. Module Purpose & Scope

### 2.1 In-Scope Capabilities

The module's in-scope capabilities span the full subscription lifecycle. The module records subscription plans, subscription instances, billing cycles, invoices (through integration with the Billing module), usage records, quotas, upgrade/downgrade requests, and trial conversions. The module supports a plan catalogue that maps to the four editions defined in PRODUCT_BIBLE Section 16: Trial (E0), Essential (E1), Professional (E2), and Enterprise (E3). The module supports the full subscription lifecycle: trial initiation, trial conversion to paid, paid subscription operation, upgrade to a higher edition, downgrade to a lower edition, renewal at the end of a billing cycle, and cancellation.

The module is responsible for usage tracking: recording the customer's consumption of quota-limited resources (patients, encounters, notifications, reports, storage, API calls) and aggregating the consumption for invoicing and for quota enforcement. The module is responsible for quota enforcement: querying by other modules before performing quota-consuming actions and denying actions that would exceed the quota. The module is responsible for overage handling: computing overage charges when a customer exceeds their quota, with the overage charges added to the next invoice. The module is responsible for proration: computing the credit for the unused portion of the previous plan and the charge for the used portion of the new plan when a customer upgrades or downgrades mid-cycle. The module is responsible for renewal automation: generating renewal invoices, processing renewal payments, and handling renewal failures. The module is responsible for dunning management: retrying failed payments, escalating dunning through configured stages, and ultimately suspending or cancelling the subscription if dunning fails.

### 2.2 Out-of-Scope Items

Several subscription-adjacent concerns are explicitly out of scope. Payment processing — the actual movement of funds from the customer's bank account or credit card to Ibn Hayan's bank account — is out of scope and is performed by external payment processors that the Subscriptions module integrates with through the Integration module and the Billing module. The boundary is the same boundary the platform draws for payroll execution: the platform produces the auditable, correct invoice; the payment processor executes the payment. Tax determination — computing the applicable taxes (VAT, sales tax, withholding tax) for an invoice based on the customer's location and the platform's tax-registration status — is out of scope and is performed by external tax-determination services. Currency conversion — converting invoices and payments between currencies when a customer's billing currency differs from the platform's accounting currency — is out of scope and is governed by the Accounting module.

Contract negotiation — the commercial terms between Ibn Hayan and its customers, particularly for Enterprise edition customers with custom pricing, custom terms, and custom SLAs — is out of scope and is handled through Ibn Hayan's sales and legal processes. The module records the outcome of the negotiation (the custom plan, the custom terms) but does not participate in the negotiation itself. Marketing campaigns — promotional offers, discount codes, referral programs — are out of scope and are handled through external marketing-automation platforms that integrate with the Subscriptions module for redemption tracking.

### 2.3 Edition Availability

| Edition | Code | Subscriptions Module Availability | Notes |
|---|---|---|---|
| Trial | E0 | Available | Manages the Trial edition itself; converts trials to paid editions. |
| Essential | E1 | Available | Manages Essential subscriptions; standard quota enforcement. |
| Professional | E2 | Available | Manages Professional subscriptions; advanced quota enforcement; proration for upgrades. |
| Enterprise | E3 | Available | Manages Enterprise subscriptions; custom-plan support; advanced dunning; multi-region invoicing. |

The Subscriptions module's availability across all editions is essential because the module must manage the lifecycle of every edition, including the edition in which the customer is currently subscribed. A customer at the Trial edition has their Trial subscription managed by the module; a customer at the Enterprise edition has their Enterprise subscription managed by the same module.

### 2.4 Clinic Type Relevance

The 30 clinic types defined in PRODUCT_BIBLE Section 17 all engage with the Subscriptions module, but the engagement pattern varies by clinic type. The table below summarizes the relevance to representative clinic types.

| Clinic Type Category | Representative Types | Subscription Pattern | Typical Edition |
|---|---|---|---|
| Solo practice | Solo Practitioner Clinic, Small Group Practice | Monthly or annual; self-service purchase; credit-card payment. | Essential (E1) after Trial. |
| Mid-size practice | Multi-Specialty Group, Dental Group | Annual; sales-assisted purchase; invoice payment. | Professional (E2). |
| Hospital | General Hospital, Specialty Hospital, Teaching Hospital | Annual or multi-year; sales-led negotiation; invoice payment; custom terms. | Enterprise (E3). |
| Network | Hospital Network, Multi-Region Network | Multi-year; executive negotiation; custom pricing; multi-region invoicing. | Enterprise (E3). |
| Specialized | Long-Term Care, Mental Health Facility | Annual; sales-assisted; invoice payment. | Professional (E2) or Enterprise (E3). |
| Telehealth | Telehealth Provider | Monthly or annual; self-service or sales-assisted; credit-card or invoice. | Professional (E2). |

### 2.5 Module Lifecycle Posture

The Subscriptions module is at General Availability (LC3) per MODULE_ARCHITECTURE Section 6.1. The module's contract surface is at version 1.x, with no breaking changes planned. The module follows the platform's standard evolution discipline: contract evolution through versioning, capability addition through extension points, and deprecation only through the documented ADR process. The module's plan catalogue evolves as the platform's edition packaging evolves, with new plans added and obsolete plans deprecated through the standard product-governance process.

The module's configuration surface is mature. The configuration keys that govern plan definitions, billing cycles, quota rules, proration formulas, and dunning stages have been validated against multiple operational scenarios and multiple regional requirements. New configuration keys are added when an enduring requirement is identified; speculative configuration keys are not added per MODULE_ARCHITECTURE Section 10.2, criterion Minimal. The module's extension surface supports customer-specific plan variants, customer-specific quota rules, and customer-specific dunning workflows through the platform's standard extension points.

---

## 3. Key Features

### 3.1 Capability Catalogue

The Subscriptions module's capability surface is organized into twelve capability areas. The areas are listed in the table below and elaborated in Sections 4 through 8 and in cross-cutting sections.

| # | Capability Area | Description |
|---|---|---|
| C1 | Plan Catalogue | Management of subscription plans, mapped to the four editions. |
| C2 | Subscription Lifecycle | Trial initiation, trial conversion, paid operation, upgrade, downgrade, renewal, cancellation. |
| C3 | Usage Tracking | Recording and aggregation of quota-limited resource consumption. |
| C4 | Quota Enforcement | Per-module quota checks before quota-consuming actions. |
| C5 | Overage Handling | Computation of overage charges when quota is exceeded. |
| C6 | Proration | Credit and charge computation for mid-cycle upgrades and downgrades. |
| C7 | Renewal Automation | Automatic invoice generation and payment processing at cycle end. |
| C8 | Dunning Management | Failed-payment retry, escalation, suspension, cancellation. |
| C9 | Payment Method Management | Storage and update of customer payment methods (via Billing module). |
| C10 | Subscription Analytics | Operational and analytical reporting on subscription state and trends. |
| C11 | Multi-Tenant Subscription Model | One-tenant-one-subscription default; multi-tenant customer support. |
| C12 | Trial Conversion | Conversion-path management from Trial to paid editions. |

### 3.2 Capability Cross-Reference

The capability areas are consumed in different combinations by different roles and workflows. The table below cross-references each capability area to the primary module sections where the capability is elaborated.

| Capability Area | Elaborated In | Primary Roles |
|---|---|---|
| Plan Catalogue | Section 4 | Ibn Hayan platform team, R13 System Administrator. |
| Subscription Lifecycle | Section 6, Section 7 | R13 System Administrator, customer authorized contacts. |
| Usage Tracking | Section 8 | R13 System Administrator, R12 Executive. |
| Quota Enforcement | Section 5 | All modules (consuming quota checks). |
| Overage Handling | Section 5 | R13 System Administrator, R08 Biller. |
| Proration | Section 6 | R13 System Administrator, R08 Biller. |
| Renewal Automation | Section 5 | R13 System Administrator, R08 Biller. |
| Dunning Management | Section 5 | R13 System Administrator, customer authorized contacts. |
| Payment Method Management | Section 5 | Customer authorized contacts. |
| Subscription Analytics | Section 8 | R12 Executive, Ibn Hayan platform team. |
| Multi-Tenant Subscription Model | Section 4 | R13 System Administrator. |
| Trial Conversion | Section 7 | Customer authorized contacts, Ibn Hayan customer success. |

### 3.3 Configuration-Driven Posture

Every capability area is configurable rather than coded. Plan definitions are declarative — they specify the edition, the price, the billing cycle, the quota limits, the included modules, the configuration depth — not procedural. Billing cycles are configurable per plan, with the cycle (monthly, quarterly, annual, multi-year) selected through configuration. Quota rules are configurable per plan and per resource, with the limit and the overage-handling rule defined through configuration. Proration formulas are configurable, with the formula (daily proration, monthly proration, no proration) selected through configuration. Dunning stages are configurable, with the number of stages, the interval between stages, the action per stage, and the final action defined through configuration. This posture is the architectural expression of Principle P2 (Configuration Before Customization) and is non-negotiable.

The configuration-driven posture is particularly consequential for the Subscriptions module because the module's behaviour varies significantly across customers, regions, and commercial segments. A customer at the Trial edition has different quota limits than a customer at the Enterprise edition; a customer in a region with strict tax-invoicing requirements has different invoicing configuration than a customer in a region with permissive requirements; a customer on a custom Enterprise contract has different pricing than a customer on the standard catalogue. The module's configuration surface accommodates the variation without code change, honouring Principle P3 and Principle P17.

---

## 4. Subscription Plans

### 4.1 Plan Catalogue

The plan catalogue is the module's curated collection of subscription plans, mapped to the four editions defined in PRODUCT_BIBLE Section 16. Each plan specifies the edition, the price, the billing cycle, the quota limits (per resource), the included modules, the configuration depth, the support level, and the SLA. Plans are versioned: a change to a plan is recorded as a new version, with the previous version retained for historical subscription reconstruction. A plan that has been subscribed to cannot be modified; the modification produces a new version, and the historical subscription retains the version that was in effect at subscription time.

Plan versioning is essential for revenue recognition and for audit compliance. An auditor who asks "what plan was this customer subscribed to on this date" must be able to retrieve the exact plan version that was in effect, not the current plan version. The module's audit trail captures the plan identifier and the plan version for every subscription action, ensuring that historical subscriptions are reconstructable. The versioning posture is the architectural expression of Principle P13 (Auditability as Primitive) applied to commercial operations.

### 4.2 Plan-to-Edition Mapping

The plan-to-edition mapping is the mechanism through which the platform's edition packaging is enforced. Each plan is associated with an edition (Trial, Essential, Professional, Enterprise), and the edition determines the modules that are enabled, the configuration depth that is available, and the support level that applies. The mapping is enforced at subscription creation: a customer who subscribes to a Professional plan receives the Professional edition's module enablement and configuration depth; a customer who subscribes to an Essential plan receives the Essential edition's module enablement and configuration depth. The mapping is documented in PRODUCT_BIBLE Section 16.7 and SYSTEM_ARCHITECTURE Section 9.7 and is non-negotiable.

The plan-to-edition mapping is implemented through the Configuration module's edition-default layer (L2). When a subscription is created or changed, the Subscriptions module updates the customer's edition assignment in the Configuration module, which propagates the edition's defaults to all modules. The propagation is governed by the configuration service's resolution and caching framework (SYSTEM_ARCHITECTURE Section 15.8), with hot-reload ensuring that the change takes effect without service interruption. The interaction is governed by the customer-supplier relationship defined in SYSTEM_ARCHITECTURE Section 7.3, with the Subscriptions module as the customer (consuming the Configuration module's edition-default capability) and the Configuration module as the supplier.

### 4.3 Custom Plans

Custom plans are subscription plans that deviate from the standard catalogue, typically negotiated for Enterprise edition customers with specific requirements. A custom plan may include non-standard pricing, non-standard quota limits, non-standard module inclusion, non-standard SLA terms, or non-standard contractual terms. Custom plans are created through Ibn Hayan's sales and legal processes, with the outcome recorded in the Subscriptions module as a plan variant linked to the standard Enterprise plan. The custom plan is then managed through the same lifecycle as a standard plan, with the customizations applied consistently.

Custom plans are governed by the platform's product governance: a custom plan that requires source-level modification is rejected, and the requirement is addressed through platform evolution (if the customization can be expressed as a configuration variant) or through the standard amendment process (if the customization requires new capability). This boundary is the architectural expression of Principle P2 (Configuration Before Customization) applied to commercial operations: the platform supports commercial variation through configuration, not through code forks. A customer with a custom plan receives the same code base as a customer with a standard plan, with the variation expressed through configuration.

### 4.4 Multi-Tenant Subscription Model

The platform's default subscription model is one-tenant-one-subscription: a tenant is created with a single subscription, and the subscription governs the tenant's edition, quotas, and billing. The model is simple and matches the operational reality for most customers. The model is documented in PRODUCT_BIBLE Section 21 (Multi-Tenant Philosophy) and is the foundation of the platform's multi-tenant posture.

For customers with multiple tenants — typically hospital networks with multiple facilities, each operating as a separate tenant — the platform supports a customer-level subscription that aggregates multiple tenants. The customer-level subscription defines the edition and quota for the customer as a whole, and the per-tenant subscriptions inherit from the customer-level subscription. The inheritance is governed by the Configuration module's layer model, with the customer-level subscription at the tenant layer (L3) and the per-tenant subscriptions at the facility layer (L4). The model allows a customer to operate multiple tenants under a single commercial relationship, simplifying procurement and billing while preserving per-tenant operational independence.

---

## 5. Billing Cycles

### 5.1 Billing Cycle Configuration

A billing cycle is the period for which a subscription is invoiced. The module supports multiple billing cycles: monthly, quarterly, annual, and multi-year. The billing cycle is configured per plan, with the customer selecting the cycle at subscription time (where the plan offers multiple cycles) or accepting the plan's default cycle. The billing cycle determines the invoice frequency, the invoice amount (the plan's price multiplied by the cycle's duration, with discounts for longer cycles typically applied), and the renewal date (the date on which the next cycle begins).

Billing cycle configuration interacts with the Billing module, which generates the invoices. The Subscriptions module produces a billing-event record at the start of each cycle, with the record specifying the subscription, the plan, the cycle, the amount, and the billing date. The Billing module consumes the record, generates the invoice, and processes the payment. The interaction is governed by the customer-supplier relationship defined in SYSTEM_ARCHITECTURE Section 7.3, with the Subscriptions module as the customer (consuming the Billing module's invoicing capability) and the Billing module as the supplier.

### 5.2 Renewal Automation

Renewal automation is the module's capability for generating renewal invoices and processing renewal payments automatically at the end of each billing cycle. The renewal workflow comprises the steps listed in the table below, with each step recorded for audit.

| Step | Owner | Description |
|---|---|---|
| Renewal trigger | Subscriptions module | Triggers renewal a configurable number of days before cycle end. |
| Renewal notification | Notifications module | Notifies the customer of the upcoming renewal. |
| Invoice generation | Billing module | Generates the renewal invoice. |
| Payment processing | Payment processor | Processes the payment via the customer's payment method. |
| Payment confirmation | Billing module | Confirms payment success or failure. |
| Subscription extension | Subscriptions module | Extends the subscription's cycle-end date on successful payment. |
| Dunning initiation | Subscriptions module | Initiates dunning on failed payment. |

Renewal automation is the module's most consequential workflow because it directly affects revenue continuity. A renewal that fails silently produces a subscription lapse, which may cascade into tenant suspension and customer churn. The renewal workflow's audit trail is the basis for investigating renewal failures and for improving the renewal-automation posture. The workflow is recoverable: a failed step is retried per the configured retry policy, and the workflow resumes from its last durable state.

### 5.3 Dunning Management

Dunning management is the module's capability for handling failed payments. The dunning workflow comprises multiple stages, with each stage attempting to recover the payment and escalating the communication to the customer. The table below summarizes a typical dunning workflow.

| Stage | Action | Typical Interval |
|---|---|---|
| D1 | Retry the payment automatically. | 1 day after failure. |
| D2 | Notify the customer of the failure and request payment-method update. | 3 days after failure. |
| D3 | Notify the customer's authorized contact (executive sponsor) of the failure. | 7 days after failure. |
| D4 | Suspend the subscription (read-only access; no new transactions). | 14 days after failure. |
| D5 | Cancel the subscription and initiate offboarding. | 30 days after failure. |

The dunning stages are configurable per plan and per customer cohort, allowing the same platform to serve customers with very different dunning tolerances. A Trial customer may be cancelled after 7 days of dunning; an Enterprise customer may be dunned for 60 days before cancellation, reflecting the longer commercial relationship and the greater consequences of cancellation. The dunning workflow's audit trail is the basis for demonstrating that dunning was handled fairly and consistently.

### 5.4 Payment Method Management

Payment method management is the module's capability for storing and updating customer payment methods. The module supports multiple payment methods per customer (credit card, bank account, invoice billing), with the methods stored securely through the Billing module's integration with external payment processors. The module records the payment method's identifier, type, expiry, and billing address, with the actual payment-instrument data (card number, bank account number) stored by the payment processor and not by Ibn Hayan. The boundary is essential for PCI-DSS compliance and is non-negotiable.

Payment method updates are managed by the customer's authorized contacts through self-service, with the updates synchronized to the payment processor through the Billing module. The updates are auditable: who updated what, when, with what authorization. Payment method expiry is monitored, with the module generating expiry-approaching notifications to the customer, ensuring that renewals are not disrupted by expired payment methods.

---

## 6. Upgrades & Downgrades

### 6.1 Upgrade Path

An upgrade is a subscription change from a lower edition to a higher edition — for example, from Essential to Professional, or from Professional to Enterprise. The upgrade workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Upgrade request | Customer authorized contact or Ibn Hayan sales | Initiates the upgrade request. |
| Upgrade validation | Subscriptions module | Validates the request against plan rules and customer eligibility. |
| Proration computation | Subscriptions module | Computes the credit for the unused portion of the current plan and the charge for the remaining portion of the new plan. |
| Invoice generation | Billing module | Generates the upgrade invoice (charge net of credit). |
| Payment processing | Payment processor | Processes the upgrade payment. |
| Edition update | Configuration module | Updates the customer's edition to the new plan's edition. |
| Module enablement | All modules | Enables the modules included in the new edition. |
| Confirmation | Notifications module | Confirms the upgrade to the customer. |

The upgrade workflow's edition-update step is the mechanism through which the new edition's module enablement and configuration depth take effect. The Configuration module propagates the new edition's defaults to all modules through the configuration service's hot-reload framework, with the change taking effect without service interruption. The propagation is immediate for configuration keys that support hot-reload and deferred for keys that require module restart, with the deferral documented per consuming module.

### 6.2 Downgrade Path

A downgrade is a subscription change from a higher edition to a lower edition — for example, from Enterprise to Professional, or from Professional to Essential. The downgrade workflow is similar to the upgrade workflow but with additional steps to manage the consequences of reduced capability. The table below summarizes the additional steps.

| Step | Owner | Description |
|---|---|---|
| Data scope check | Subscriptions module | Verifies that the customer's data is within the new edition's quota limits. |
| Capability reduction notification | Notifications module | Notifies the customer of the capabilities that will be removed. |
| Grace period | Subscriptions module | Provides a grace period during which the customer can adjust operations to the reduced capability. |
| Edition update | Configuration module | Updates the customer's edition to the new plan's edition. |
| Module disablement | All modules | Disables the modules not included in the new edition. |

The downgrade workflow's data-scope check is essential because downgrading to an edition with lower quotas may leave the customer with data that exceeds the new quota. The module does not delete the excess data; it provides a grace period during which the customer can reduce their data (e.g., archive old records, delete unused tenants) to comply with the new quota. If the customer does not comply by the end of the grace period, the module applies overage charges or restricts new-data creation until the customer complies. The downgrade workflow's audit trail is the basis for demonstrating that the downgrade was handled fairly and that the customer was adequately notified.

### 6.3 Proration

Proration is the module's capability for computing the credit and charge that result from a mid-cycle upgrade or downgrade. The proration formula is configurable per plan, with the standard formula being daily proration: the credit for the unused portion of the current plan is computed as the plan's price multiplied by the number of remaining days in the cycle divided by the total days in the cycle; the charge for the new plan is computed similarly. The net amount (charge minus credit) is invoiced immediately for upgrades, and the credit is applied to the next cycle's invoice for downgrades (or refunded if the customer requests and the plan allows).

Proration interacts with the Billing module, which generates the proration invoice. The Subscriptions module's role is to compute the proration amounts and to provide them to the Billing module; the Billing module's role is to generate the invoice and to process the payment. The interaction is governed by the customer-supplier relationship defined in SYSTEM_ARCHITECTURE Section 7.3. The proration computation is auditable: who computed what, when, with what inputs, with what result. The audit trail is the basis for resolving proration disputes and for verifying proration accuracy.

---

## 7. Trial Management

### 7.1 Trial Initiation

Trial initiation is the module's capability for creating a Trial subscription for a prospect evaluating the platform. The Trial subscription is time-bounded, with the trial duration configurable per plan (typically 14, 30, or 60 days). The Trial subscription includes a subset of the Essential edition's modules, with limited data volume, limited user count, and no service-level commitment, per PRODUCT_BIBLE Section 16.3. The Trial subscription is created when the prospect signs up through the platform's self-service trial-signup flow, with the prospect's contact information, organization name, and trial parameters recorded.

Trial initiation is governed by the platform's anti-abuse framework: a prospect may not create unlimited Trial tenants, and the platform monitors for trial abuse (e.g., repeated trials from the same contact, trials from suspicious IP addresses). Anti-abuse is enforced through the Identity & Access module's risk-scoring capability, with high-risk trials flagged for review before activation. The anti-abuse posture is essential for protecting the platform's operational posture for paying customers (PRODUCT_BIBLE Section 16.3).

### 7.2 Trial Conversion

Trial conversion is the module's capability for converting a Trial subscription to a paid subscription at the end of the trial period. The conversion workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Conversion notification | Notifications module | Notifies the prospect of the approaching trial end. |
| Conversion offer | Ibn Hayan customer success or self-service | Offers the prospect a paid subscription. |
| Conversion acceptance | Prospect | Accepts the offer and selects a plan and billing cycle. |
| Payment setup | Customer authorized contact | Sets up the payment method. |
| Subscription creation | Subscriptions module | Creates the paid subscription. |
| Edition update | Configuration module | Updates the tenant's edition from Trial to the selected paid edition. |
| Data preservation | All modules | Preserves the data created during the trial. |
| Confirmation | Notifications module | Confirms the conversion to the customer. |

Trial conversion is the platform's primary customer-acquisition path, and the conversion rate is a critical product metric. The module supports the conversion path with proactive notifications, in-product conversion prompts, and customer-success outreach for high-value trials. The conversion path's audit trail is the basis for analyzing conversion effectiveness and for improving the conversion experience. Trials that are not converted by the end of the trial period are decommissioned per PRODUCT_BIBLE Section 16.3, with the tenant's data retained for a configurable period before deletion.

### 7.3 Trial Decommissioning

Trial decommissioning is the module's capability for decommissioning a Trial tenant that has not converted to a paid subscription by the end of the trial period. The decommissioning workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Decommissioning trigger | Subscriptions module | Triggers decommissioning at trial end if no conversion has occurred. |
| Final notification | Notifications module | Notifies the prospect of the imminent decommissioning. |
| Grace period | Subscriptions module | Provides a grace period (typically 7 days) during which the prospect can still convert. |
| Tenant suspension | Identity & Access module | Suspends the tenant, preventing user access. |
| Data archival | All modules | Archives the tenant's data per the retention policy. |
| Tenant deletion | Identity & Access module | Deletes the tenant after the archival period. |

Trial decommissioning is governed by the platform's data-retention posture (PRODUCT_BIBLE Section 26): the tenant's data is retained for a configurable period (typically 30 to 90 days) to allow for late conversion, after which the data is permanently deleted. The decommissioning workflow's audit trail is the basis for demonstrating that the prospect's data was handled appropriately and that the prospect was adequately notified.

---

## 8. Subscription Analytics

### 8.1 Usage Tracking

Usage tracking is the module's capability for recording the customer's consumption of quota-limited resources. The module records each quota-consuming action (patient created, notification sent, report generated, storage consumed, API call made) with the customer, the resource, the quantity, and the timestamp. The records are aggregated periodically (typically daily) into usage summaries, which are used for invoicing, for quota enforcement, and for analytics.

Usage tracking is governed by the platform's event-driven architecture (SYSTEM_ARCHITECTURE Section 18): quota-consuming actions produce events, the Subscriptions module subscribes to the events, and the module aggregates the events into usage records. The event-driven posture decouples the producing modules from the Subscriptions module, allowing the producing modules to operate without synchronous dependency on the Subscriptions module. The aggregation is eventually consistent, with the eventual consistency bound documented per resource type.

### 8.2 Quota Enforcement

Quota enforcement is the module's capability for preventing customers from consuming more than their subscription entitles them to. The module supports two enforcement modes: hard enforcement (the action is denied when the quota is exceeded) and soft enforcement (the action is allowed but overage charges are applied). The enforcement mode is configurable per resource and per plan, with hard enforcement typical for resources that have operational consequences (e.g., user count, which affects security) and soft enforcement typical for resources that have financial consequences (e.g., notification volume, which affects cost).

Quota enforcement is consumed by other modules through synchronous query. Before performing a quota-consuming action, a module queries the Subscriptions module to verify that the quota has not been exceeded. The query specifies the customer, the resource, and the proposed quantity; the response specifies whether the action is allowed and, if not, the reason. The query is fast, with the response cached for performance where appropriate. The query's result is recorded in the audit trail for consequential actions, ensuring that quota denials are visible for investigation.

### 8.3 Subscription Analytics Reports

Subscription analytics reports support Ibn Hayan's commercial operations and the customer's commercial relationship with the platform. The table below summarizes the report categories.

| Category | Examples | Audience |
|---|---|---|
| Operational | Current subscription state; pending renewals; pending dunning; quota utilization by customer. | Ibn Hayan customer success, finance operations. |
| Analytical | Subscription growth trends; churn trends; trial-conversion-rate trends; upgrade-rate trends; revenue-per-customer trends. | Ibn Hayan executives, product, finance. |
| Customer-facing | The customer's own subscription state; usage consumption; quota utilization; upcoming renewal; invoice history. | Customer authorized contacts. |

Subscription analytics reports are generated by the Reporting module, which consumes the Subscriptions module's data through read-model projections and synchronous queries. The reports are permission-governed: Ibn Hayan personnel see reports for the customers they are authorized to support; customers see reports for their own subscriptions only. The permission scoping is enforced at the reporting layer per SYSTEM_ARCHITECTURE Section 28.3.

### 8.4 Revenue Recognition

Revenue recognition is the practice of recognizing subscription revenue in accordance with accounting standards. The Subscriptions module supports revenue recognition through integration with the Accounting module, which owns the general ledger. The Subscriptions module produces revenue-recognition events at subscription creation (deferred revenue recognition), at invoice payment (revenue recognition for the invoiced period), and at subscription cancellation (recognition of any remaining deferred revenue or refund of unearned revenue). The Accounting module consumes the events and posts the corresponding general-ledger entries.

Revenue recognition is governed by the applicable accounting standards (e.g., IFRS 15, ASC 606), with the standards' requirements encoded in the configuration that governs the Subscriptions module's revenue-recognition rules. The configuration is maintained by Ibn Hayan's finance team in consultation with external auditors, with the configuration's accuracy verified at each audit cycle. The revenue-recognition audit trail is the basis for demonstrating compliance with accounting standards to auditors and to regulators.

---

## 9. User Roles

### 9.1 Primary Subscription Roles

The Subscriptions module is consumed by the roles defined in PRODUCT_BIBLE Section 20. The table below summarizes the primary roles and their subscription interactions.

| Role Code | Role | Subscription Interaction |
|---|---|---|
| R13 | System Administrator | Manages subscription state for the tenant; manages payment methods; consumes subscription analytics. |
| R12 | Executive (customer) | Oversees the customer's subscription; approves upgrades; consumes customer-facing analytics. |
| R14 | Integration Account | System-to-system subscription queries for quota enforcement. |
| Ibn Hayan Customer Success | External role | Monitors subscription health; drives trial conversion; supports renewals. |
| Ibn Hayan Finance | External role | Manages invoicing, payment processing, revenue recognition. |
| Ibn Hayan Executive | External role | Consumes aggregate subscription analytics; oversees commercial strategy. |

### 9.2 Customer Self-Service Posture

The customer's authorized contacts have self-service access to the subscription state for their tenant. An authorized contact can view the current subscription, view usage consumption, view quota utilization, view invoice history, update payment methods, request upgrades, and request downgrades. The self-service posture is a deliberate design choice: it reduces Ibn Hayan's operational load, it improves customer trust by giving customers visibility into their own commercial relationship, and it produces a cleaner audit trail because customers are the source of truth for many of their own subscription actions.

Self-service access is permission-governed. An authorized contact sees only their own tenant's subscription; Ibn Hayan personnel see subscriptions for the customers they are authorized to support. The permission framework enforces these rules, with violations treated as defects. Self-service actions are auditable: every subscription view, every payment-method update, every upgrade request is recorded.

### 9.3 Audit Events Generated

The Subscriptions module generates audit events for every consequential action, per Principle P13 and SYSTEM_ARCHITECTURE Section 27. The table below summarizes the audit-event categories the module produces.

| Audit Category | Examples |
|---|---|
| Subscription lifecycle | Subscription created; subscription upgraded; subscription downgraded; subscription renewed; subscription cancelled. |
| Trial events | Trial initiated; trial converted; trial decommissioned. |
| Billing events | Invoice generated; payment processed; payment failed; dunning initiated; dunning escalated. |
| Quota events | Quota check passed; quota check failed; overage applied. |
| Payment method events | Payment method added; payment method updated; payment method removed. |
| Configuration events | Plan definition changed; billing cycle changed; quota rule changed; dunning stage changed. |

Every audit event is recorded in the platform's audit store with the standard audit-record structure defined in SYSTEM_ARCHITECTURE Section 27.4. Audit records for subscription actions include the financial impact, ensuring that the audit trail is the basis for revenue-audit demonstration.

---

## 10. Workflows

### 10.1 Subscription Creation Workflow

The subscription creation workflow coordinates the activities that produce a new subscription. The workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Subscription request | Customer authorized contact or Ibn Hayan sales | Initiates the subscription request. |
| Plan selection | Customer | Selects the plan and billing cycle. |
| Validation | Subscriptions module | Validates the request against plan rules and customer eligibility. |
| Payment setup | Customer | Sets up the payment method. |
| Subscription creation | Subscriptions module | Creates the subscription record. |
| Edition assignment | Configuration module | Assigns the edition to the tenant. |
| Module enablement | All modules | Enables the modules included in the edition. |
| Invoice generation | Billing module | Generates the first invoice. |
| Payment processing | Payment processor | Processes the first payment. |
| Confirmation | Notifications module | Confirms the subscription to the customer. |

The workflow is governed by the platform's workflow engine per SYSTEM_ARCHITECTURE Section 16, with each step recorded for audit. The workflow is recoverable: a failed step is retried per the configured retry policy, and the workflow resumes from its last durable state. The workflow is observable: each step's state and timestamp are visible to the customer's authorized contact and to Ibn Hayan customer success through reporting.

### 10.2 Renewal Workflow

The renewal workflow was documented in Section 5.2 and is not repeated here. The renewal workflow is the module's highest-volume workflow because it executes for every active subscription at every cycle end. The workflow's reliability is essential for revenue continuity, and the workflow's audit trail is the basis for investigating renewal failures and for improving the renewal-automation posture.

### 10.3 Cancellation Workflow

The cancellation workflow coordinates the activities that conclude a subscription. The workflow comprises the steps listed in the table below.

| Step | Owner | Description |
|---|---|---|
| Cancellation request | Customer authorized contact or Ibn Hayan customer success | Initiates the cancellation request. |
| Cancellation validation | Subscriptions module | Validates the request against contract terms and notice-period requirements. |
| Final invoice | Billing module | Generates the final invoice, including any proration or early-termination fees. |
| Payment processing | Payment processor | Processes the final payment. |
| Subscription termination | Subscriptions module | Terminates the subscription. |
| Edition downgrade | Configuration module | Downgrades the tenant's edition to a terminated state. |
| Module disablement | All modules | Disables all modules. |
| Data archival | All modules | Archives the tenant's data per the retention policy. |
| Tenant deletion | Identity & Access module | Deletes the tenant after the archival period. |
| Confirmation | Notifications module | Confirms the cancellation to the customer. |

The cancellation workflow is the most consequential workflow the Subscriptions module coordinates, because the consequences of error are severe — a customer who is cancelled incorrectly loses access to their data, which may include clinical records subject to regulatory retention. The workflow's audit trail is the basis for demonstrating that the cancellation was handled correctly and that the customer's data was handled appropriately.

---

## 11. Data Models

### 11.1 Key Entities

This section lists the Subscriptions module's primary domain entities by name. Entity schemas, data-store representations, and persistence details are out of scope for this document. The list below is the canonical reference for what entities the Subscriptions module owns.

| Entity | Description |
|---|---|
| Subscription Plan | The configured plan, mapped to an edition, with price, billing cycle, quota limits, included modules. |
| Subscription Instance | A customer's active subscription, with plan, cycle, start date, end date, status. |
| Billing Cycle | The period for which a subscription is invoiced. |
| Invoice | The invoice generated for a billing cycle (owned by the Billing module; referenced by the Subscriptions module). |
| Usage Record | The record of a customer's consumption of a quota-limited resource. |
| Quota | The configured limit for a resource, per plan. |
| Quota Check | The result of a quota-enforcement query by a consuming module. |
| Upgrade/Downgrade Request | A customer's request to change subscription plan. |
| Trial Conversion | The record of a trial-to-paid conversion. |
| Dunning Stage | The current stage of a dunning workflow for a failed payment. |
| Payment Method | The customer's stored payment method (owned by the Billing module; referenced by the Subscriptions module). |
| Revenue Recognition Event | The event produced for revenue recognition, consumed by the Accounting module. |

### 11.2 Entity Ownership and Boundaries

Each entity in the table above is owned by the Subscriptions module, with the exception of Invoice and Payment Method, which are owned by the Billing module and referenced by the Subscriptions module. The reference is by identifier, not by data replication; the Subscriptions module holds the identifier and queries the Billing module for the current state. This is the standard read-model and projection pattern documented in MODULE_ARCHITECTURE Section 11.3.

The Subscription Instance entity is shared with the Configuration module in the sense that the subscription determines the tenant's edition, which is propagated through the Configuration module's edition-default layer (L2). The sharing is by event subscription: the Subscriptions module publishes subscription-state-change events, the Configuration module consumes the events, and the Configuration module updates the edition-default layer accordingly. The interaction is governed by the customer-supplier relationship defined in SYSTEM_ARCHITECTURE Section 7.3.

### 11.3 Data Volume and Retention

The Subscriptions module's data volume is low relative to operational modules. A platform with 1,000 customers produces on the order of 1,000 subscription instances, 10,000 invoices per year (assuming monthly billing), 100,000 usage records per day (assuming 100 quota-consuming actions per customer per day), and 1,000 quota checks per second (assuming active quota enforcement). The volume is well within the capacity of the platform's standard data architecture. The retention horizon is long: subscription records, invoices, and revenue-recognition events must be retained for the period defined by the regulatory framework, which in many jurisdictions is seven to ten years for financial records.

Retention is governed by the platform's data retention configuration, which is part of the Configuration module's surface. The Subscriptions module exposes retention configuration per entity type, with Ibn Hayan's finance and compliance teams responsible for setting the retention period in accordance with the applicable accounting and regulatory frameworks.

---

## 12. Integrations

### 12.1 Integration with Platform Modules

The Subscriptions module integrates with multiple platform modules. The table below summarizes the integrations.

| Integrated Module | Integration Purpose | Pattern |
|---|---|---|
| Billing | Invoice generation; payment processing; payment-method storage. | Synchronous command; asynchronous event (outbox). |
| Accounting | Revenue recognition; deferred-revenue management. | Asynchronous event (outbox). |
| Configuration | Edition-default propagation; plan-definition configuration. | Configuration schema consumption; asynchronous event. |
| Identity & Access | Tenant identity; subscription-to-tenant linkage; tenant suspension and deletion. | Synchronous query; asynchronous event. |
| All consuming modules | Quota-enforcement queries. | Synchronous query. |
| Notifications | Renewal reminders; payment-failure notices; subscription-status notifications. | Asynchronous event (outbox). |
| Audit | Audit-event recording for all subscription actions. | Asynchronous event (outbox). |
| Reporting | Subscription data for operational, analytical, and customer-facing reports. | Read-model projection; synchronous query. |
| Integration | Integration with payment processors, tax-determination services, ERP systems. | Anticorruption layer. |

### 12.2 Integration with External Systems

The Subscriptions module integrates with several categories of external systems through the Integration module. The table below summarizes the categories.

| External System Category | Integration Purpose | Pattern |
|---|---|---|
| Payment processor | Payment processing; payment-method storage; payment confirmation. | Anticorruption layer; real-time. |
| Tax-determination service | Tax computation for invoices based on customer location and product type. | Anticorruption layer; real-time. |
| ERP system | Revenue synchronization with Ibn Hayan's ERP for financial consolidation. | Anticorruption layer; scheduled. |
| CRM system | Customer-account synchronization with Ibn Hayan's CRM for sales and customer-success operations. | Anticorruption layer; bidirectional. |

External-system integration is governed by the Anticorruption Layer pattern documented in SYSTEM_ARCHITECTURE Section 7.3. The Subscriptions module's domain model is not contaminated by the external system's model; the Integration module translates between the two, preventing external-model leakage into the Subscriptions module's contracts.

### 12.3 Integration with the Billing Module

The integration with the Billing module deserves explicit treatment because it is the Subscriptions module's most consequential integration. The Subscriptions module produces billing-event records that the Billing module consumes to generate invoices; the Billing module produces payment-event records that the Subscriptions module consumes to update subscription state. The integration is bidirectional and asynchronous, with the outbox pattern (MODULE_ARCHITECTURE Section 7.4) ensuring reliable event delivery in both directions.

The integration's contract is governed by the platform's contract-versioning policy (MODULE_ARCHITECTURE Section 8). The contract evolves through versioning, with breaking changes announced with adequate lead time and old versions supported through the deprecation window. The Subscriptions module and the Billing module evolve independently within the constraints of the contract, allowing each module to improve without coordinating every change with the other.

---

## 13. Configuration

### 13.1 Configuration Surface

The Subscriptions module's configuration surface is the primary mechanism through which Ibn Hayan adapts the module to its commercial operations. The configuration surface is part of the module's contract and is versioned with it. The surface is bounded by what can be expressed without source-level modification per MODULE_ARCHITECTURE Section 10.1. The configuration surface is organized by capability area, with each capability area exposing a coherent set of configuration keys.

The configuration surface is governed by the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). Configuration keys are namespaced by module and by capability. Configuration values are validated before application, with five validation rule categories (SYSTEM_ARCHITECTURE Section 15.4). Configuration changes are versioned, audited, and reversible through rollback. Configuration is resolved by the platform's configuration service, not by the Subscriptions module, ensuring consistent resolution across modules.

### 13.2 Configuration Categories

The Subscriptions module's configuration falls into several categories per MODULE_ARCHITECTURE Section 10.3. The table below summarizes the categories.

| Category | Examples | Typical Owner |
|---|---|---|
| Behavioural | Plan definitions, billing cycles, quota rules, proration formulas, dunning stages. | Ibn Hayan product team, finance. |
| Structural | Plan-catalogue entries, capability-gating flags per edition. | Ibn Hayan product team. |
| Integration | Payment-processor endpoints, tax-service endpoints, ERP endpoints, credentials, schedules. | Integration architect. |
| Localization | Locale-specific invoice templates, currency formats, tax terminology. | Localization specialist. |
| Security | Subscription-access rules, audit-query scope rules. | Security architect. |
| Performance | Cache settings, quota-check parallelism, usage-aggregation batch sizes. | Operations. |
| Regulatory | Revenue-recognition rules, retention periods, regulatory-reporting templates. | Compliance officer, finance. |

### 13.3 Configuration Layers and Precedence

The Subscriptions module honours the platform's eight-layer configuration model (SYSTEM_ARCHITECTURE Section 15.2). Most subscription configuration is at the platform-default (L1) and edition-default (L2) layers, because subscription rules are platform-wide and edition-wide. Tenant-layer (L3) overrides are limited to customer-specific configurations (e.g., custom-plan variants for Enterprise customers, custom dunning workflows for specific cohorts). Lower-layer overrides (L4–L8) are typically not applicable, because subscription rules are tenant-wide rather than facility-, department-, or user-specific.

The Subscriptions module's configuration surface documents, for each configuration key, which layers may override the key. For example, a plan-definition configuration key is fixed at the platform layer (L1), because plan definitions are platform-wide; a custom-plan-variant configuration key may be overridden at the tenant layer (L3), because custom variants are customer-specific. The layer restrictions are enforced by the configuration service.

### 13.4 Configuration Sandbox and Promotion

The Subscriptions module's configuration supports the platform's configuration sandbox (SYSTEM_ARCHITECTURE Section 15.7). A configuration change — particularly a new plan definition or a modified dunning workflow — is tested in a sandbox tenant before application to production. The sandbox requirement is consequential for the Subscriptions module because a misconfigured plan can produce incorrect invoicing, which is a customer-trust incident and a revenue-recognition exposure. The sandbox ensures that the configuration is validated against realistic data before it is activated in production.

---

## 14. Permissions

### 14.1 Permission Categories

The Subscriptions module's permission surface is organized into the categories defined by the platform's permission framework. The table below summarizes the categories and the Subscriptions module's exposure in each.

| Permission Category | Subscriptions Module Exposure |
|---|---|
| Read | View subscription state, invoices, usage records, quota utilization. |
| Write | Update payment methods, request upgrades, request downgrades, request cancellations. |
| Approve | Approve subscription changes, dunning escalations, refunds. |
| Configure | Modify plan definitions, billing cycles, quota rules, dunning stages. |
| Audit | Query the subscription audit trail; review audit records; export audit reports. |
| Integrate | Manage integrations with payment processors, tax services, ERP systems. |

### 14.2 Role-to-Permission Mapping

| Role | Read | Write | Approve | Configure | Audit | Integrate |
|---|---|---|---|---|---|---|
| R13 System Administrator (customer) | Own tenant | Own tenant | No | No | Own tenant | No |
| R12 Executive (customer) | Own tenant | No | Approves upgrades | No | Own tenant | No |
| Ibn Hayan Customer Success | All assigned | No | No | No | All assigned | No |
| Ibn Hayan Finance | All | No | Approves refunds | No | All | No |
| Ibn Hayan Platform Team | All | No | No | All | All | All |

### 14.3 Permission Enforcement and Audit

Permission enforcement is performed by the platform's permission framework. The Subscriptions module declares the permission required for each operation; the framework enforces the declaration. The enforcement is consistent across surfaces: an operation performed through the customer self-service portal, through the Ibn Hayan internal interface, or through an integration is governed by the same permission rule. This consistency is the architectural expression of Principle P13 (Auditability as Primitive) and is non-negotiable.

Permission checks are auditable. Every permission check is recorded in the audit trail when the check is for a consequential action, with the actor, the action, the permission required, the permission decision, and the authorization basis captured. A permission check that denies access is recorded with the same completeness as a permission check that grants access, ensuring that unauthorized access attempts are detectable.

### 14.4 Customer Authorization

Customer authorization is the practice of determining which customer contacts are authorized to perform subscription actions on behalf of the customer. The module supports a customer-authorization framework that designates authorized contacts (typically the customer's executive sponsor, finance lead, and system administrator), with the designations recorded and auditable. Subscription actions performed by unauthorized contacts are denied, with the denial recorded in the audit trail. The framework honours the customer's own governance: the customer's executive sponsor may add or remove authorized contacts, with the changes recorded for audit.

Customer authorization is particularly consequential for cancellations, where the consequences of unauthorized action are severe. A cancellation performed by an unauthorized contact would terminate the customer's subscription, with potential cascading effects on tenant access and data retention. The module's permission framework prevents such cancellations, with the prevention enforced at the command layer and recorded in the audit trail.

---

## 15. Reports

### 15.1 Report Categories

The Subscriptions module produces and contributes to reports in the three categories defined by SYSTEM_ARCHITECTURE Section 28.2: Operational, Analytical, and Regulatory. The table below summarizes the reports in each category.

| Category | Examples |
|---|---|
| Operational | Current subscription state by customer; pending renewals; pending dunning; quota utilization by customer. |
| Analytical | Subscription growth trends; churn trends; trial-conversion-rate trends; upgrade-rate trends; revenue-per-customer trends; cohort-analysis reports. |
| Regulatory | Revenue-recognition reports; tax-compliance reports; audit-trail reports for subscription actions. |

### 15.2 Operational Reporting

Operational reporting supports daily commercial operations. Reports are generated from the transactional store, with minimal latency between data change and report availability. Operational reports are scoped by audience: Ibn Hayan customer success sees reports for their assigned customers; Ibn Hayan finance sees reports for all customers; customers see reports for their own subscriptions only. Permission scoping is enforced at the reporting layer per SYSTEM_ARCHITECTURE Section 28.3.

Operational reports are typically consumed through the Reporting module's dashboard surface, with the customer-success dashboard surfacing the metrics that matter to daily operations: current subscription state, pending renewals, pending dunning, quota utilization. The dashboard is configurable: the user can compose a dashboard from the widget library, with the widgets selected and arranged per the user's preferences.

### 15.3 Analytical and Regulatory Reporting

Analytical reporting supports trend analysis and decision support. Reports are generated from the analytical store, which is populated from the transactional store through an ETL pipeline per SYSTEM_ARCHITECTURE Section 28.4. Analytical reports support commercial-strategy decisions: which customer segments to invest in, which plans to refine, which dunning workflows to tune. The analytical store is optimized for query performance, with denormalized data structures and pre-computed aggregates.

Regulatory reporting supports compliance with regulatory requirements, particularly around revenue recognition and tax compliance. Reports are generated from the audit store and the transactional store, with the report format defined by the regulatory framework per SYSTEM_ARCHITECTURE Section 28.5. Regulatory reports are immutable once generated per SYSTEM_ARCHITECTURE Section 28.5. Regulatory-report generation is auditable, with the audit record capturing the report, the parameters, the data sources, and the submission.

### 15.4 Report Distribution and Subscription

Report distribution is governed by the report definition per SYSTEM_ARCHITECTURE Section 28.7. Subscription reports commonly use scheduled distribution — for example, a weekly subscription-state report delivered to Ibn Hayan customer success every Monday — and subscription distribution — for example, a monthly quota-utilization report subscribed to by each customer's executive sponsor. Distribution is auditable and permission-governed.

---

## 16. API Surface

### 16.1 Contract Surface Overview

This section documents the Subscriptions module's contract surface — the set of commands, queries, events, and configuration schemas through which other modules interact with the Subscriptions module. Per MODULE_ARCHITECTURE Section 4.1, the contract surface is the module's only public interface; internals are private. Per the metadata table at the head of this document, specific API endpoint specifications are out of scope for this reference and are governed by the platform's integration documentation.

### 16.2 Commands, Queries, and Events

| Contract Type | Examples |
|---|---|
| Commands | Create subscription; upgrade subscription; downgrade subscription; renew subscription; cancel subscription; update payment method; record usage; check quota; initiate dunning. |
| Queries | Get subscription by tenant; get subscription state; get invoice history; get usage summary; get quota utilization; get quota check result; get dunning status. |
| Events | Subscription created; subscription upgraded; subscription downgraded; subscription renewed; subscription cancelled; invoice generated; payment processed; payment failed; quota exceeded; dunning initiated. |
| Configuration Schemas | Plan-definition schema; billing-cycle schema; quota-rule schema; proration-formula schema; dunning-stage schema; revenue-recognition-rule schema. |

### 16.3 Contract Versioning and Deprecation

Contract versioning follows the platform's semantic-versioning policy per MODULE_ARCHITECTURE Section 8.1. Major versions indicate breaking changes; minor versions indicate backward-compatible additions; patch versions indicate backward-compatible fixes. Contract deprecation is governed by the platform's deprecation policy per MODULE_ARCHITECTURE Section 8.3, with deprecated contracts supported through their deprecation window before removal. Contract evolution is particularly consequential for the Subscriptions module because every consuming module depends on the quota-check contract; breaking changes to that contract require coordinated migration across all consuming modules.

---

## 17. Future Enhancements

### 17.1 Module Lifecycle Outlook

The Subscriptions module is at General Availability (LC3) per MODULE_ARCHITECTURE Section 6.1 and is on track to transition to Mature (LC4) after a defined period of stable operation. The transition is automatic per PRODUCT_BIBLE Section 19.5. No deprecation is anticipated; the commercial-domain operations are enduring, and the module's position as the platform's commercial engine is stable. Module evolution occurs through contract versioning, capability addition through extension points, and configuration-surface expansion.

### 17.2 Extension Points

The Subscriptions module exposes extension points per MODULE_ARCHITECTURE Section 9 that allow capability to be added without source modification. The table below summarizes the extension-point categories relevant to the Subscriptions module.

| Extension Point Category | Examples |
|---|---|
| Plan variants | Customer-specific plan variants for Enterprise customers; regional plan variants. |
| Integration adapters | Adapters for regional payment processors; adapters for regional tax-determination services; adapters for customer-specific ERP systems. |
| Configuration-driven rules | Customer-specific proration formulas; customer-specific dunning workflows; customer-specific quota rules. |
| Report templates | Customer-specific invoice layouts; customer-specific subscription-analytics reports. |
| Workflow definitions | Customer-specific subscription-creation workflows; customer-specific cancellation workflows. |

Extensions are first-class architectural concerns with their own contracts, validation, and lifecycle per MODULE_ARCHITECTURE Section 9.3. An extension that requires source modification of the Subscriptions module is, by definition, customization, and is rejected by Principle P2.

### 17.3 Anticipated Capability Evolution

Capability evolution is anticipated in several areas. AI-assisted churn prediction — using historical subscription data to identify customers at elevated risk of cancellation — is a candidate for addition through the extension surface, with the AI service consuming subscription history and producing predictions that are surfaced to customer success. AI-assisted dunning optimization — using historical dunning data to suggest optimal retry intervals and communication channels — is a candidate for addition through the extension surface, with the AI service consuming dunning history and producing suggestions that are reviewed by human operators.

Commercial evolution is anticipated as the platform's commercial model matures. Usage-based pricing — where customers are invoiced based on actual usage rather than on a fixed plan price — is a candidate for future support, with the module's usage-tracking capability already providing the data foundation. Value-based pricing — where customers are invoiced based on demonstrated outcomes — is a candidate for future support, with the module's integration with the Reporting module providing the outcome data. Both evolutions would be expressed through configuration and extension, not through fundamental re-architecture.

### 17.4 Operational Considerations

Operational considerations for the Subscriptions module centre on three concerns. First, quota-check performance: quota checks are issued at every quota-consuming action, and the checks must be fast to avoid blocking operational workflows. The module's quota-check path is optimized for performance, with quota state cached and cache invalidation governed by usage-record aggregation. Second, audit-store volume: the module generates significant audit volume, especially around quota checks. The audit store is sized accordingly, with quota-check audit records subject to lower retention than subscription-lifecycle audit records. Third, integration reliability: the module's reliance on external payment processors means that integration failures can disrupt renewal and invoicing operations. The module's failure-isolation posture (MODULE_ARCHITECTURE Section 11.4) ensures that an integration failure degrades the module gracefully rather than cascading.

---

## 18. Related Documents

### 18.1 Canonical References

The Subscriptions module is governed by the following canonical references, which prevail over this document in case of conflict per the metadata table at the head of this document.

| Document | Relationship |
|---|---|
| `PRODUCT_BIBLE.md` | Defines product principles, edition packaging (Section 16), business model (Section 13), SaaS strategy (Section 14), multi-tenant philosophy (Section 21), module overview (Section 19). |
| `SYSTEM_ARCHITECTURE.md` | Defines architectural principles, bounded contexts (Section 7), configuration strategy (Section 15), audit architecture (Section 27), reporting architecture (Section 28), module and edition packaging (Section 9.7). |
| `MODULE_ARCHITECTURE.md` | Defines module architecture: catalogue, boundaries, contracts, dependencies, lifecycle, communication, versioning, extension points, configuration surface, isolation, testing, governance. |
| `CONFIGURATION_ARCHITECTURE.md` | Defines configuration internals: layer model, validation, versioning, audit, sandbox, hot-reload. |
| `SOFTWARE_ARCHITECTURE.md` | Defines implementation-grade architecture: layering, deployment, technology posture. |

### 18.2 Peer Module References

The Subscriptions module collaborates with the following peer modules. Each peer module's documentation provides the peer's contract surface, configuration surface, and integration posture.

| Peer Module | Collaboration |
|---|---|
| Billing | Invoice generation; payment processing; payment-method storage. |
| Accounting | Revenue recognition; deferred-revenue management. |
| Configuration | Edition-default propagation; plan-definition configuration. |
| Identity & Access | Tenant identity; subscription-to-tenant linkage; tenant suspension and deletion. |
| All consuming modules | Quota-enforcement queries. |
| Notifications | Renewal reminders; payment-failure notices; subscription-status notifications. |
| Audit | Audit-event recording for all subscription actions. |
| Reporting | Subscription data for operational, analytical, and customer-facing reports. |
| Integration | Integration with payment processors, tax services, ERP systems, CRM systems. |

### 18.3 Downstream References

The Subscriptions module's contract surface, configuration surface, and integration surface are elaborated in downstream documentation, including per-module specifications, integration contracts, and operational runbooks. Those downstream documents are subordinate to this document and to the canonical references above; conflicts are resolved in favour of the canonical references, then this document, then the downstream document. Downstream documents are amended through the standard change process when this document or a canonical reference is amended.
