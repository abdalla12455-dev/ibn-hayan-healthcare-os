# Ibn Hayan Healthcare Operating System — Inventory Module (M07)

| Field | Value |
|---|---|
| Document Title | Inventory Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Product leaders, pharmacy and supply-chain domain owners, healthcare operations executives, facility administrators, compliance officers, integration architects |
| Scope | Inventory capability: stock items, stock locations, stock movements, purchase orders, suppliers, reorder automation, lot/batch tracking, expiry management, stock takes, valuation, ABC analysis, and the pharmacy specialization of these capabilities |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, UI component catalogues, deployment runbooks, vendor selection, supplier-contract negotiation, third-party logistics provider contracts |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through product or architectural governance. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Stock Management
5. Procurement
6. Supplier Management
7. Stocktaking
8. Expiry Tracking
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

The Inventory module is the platform's general-purpose capability for tracking physical stock — medications, consumables, supplies, reagents, office materials, and small equipment — across the locations a customer operates. The module exists because healthcare delivery consumes physical goods at scale, and the discipline required to know what stock is on hand, where it is, who owns it, when it expires, and when it must be reordered is distinct from the clinical discipline of prescribing or dispensing and distinct from the financial discipline of accounting for inventory value. Ibn Hayan treats inventory as a bounded context (BC09) and as a module (M07), with a documented deviation from the one-to-one bounded-context-to-module mapping: the Inventory context is implemented within the Pharmacy module for medication inventory and as a separate module for non-pharmacy inventory, per SYSTEM_ARCHITECTURE Section 7.7. This deviation reflects the operational reality that medication inventory is tightly coupled to clinical pharmacy workflows — dispensing, compounding, controlled-substance tracking — while general inventory applies to a broader set of goods that do not require clinical coupling.

The module's contribution to the Ibn Hayan platform is the trustworthy, auditable, configurable management of physical stock across the customer's locations. Every consequential action — receipt, transfer, dispensation, return, adjustment, disposal — is recorded in the audit trail with the actor, the time, the location, the lot and batch where applicable, and the previous and new state. The audit posture is non-negotiable and is the basis on which Ibn Hayan customers demonstrate supply-chain integrity to regulators, demonstrate controlled-substance handling to narcotics authorities, and demonstrate cost-of-goods accuracy to finance auditors. The module is the single authoritative source for what stock a customer holds at any given moment, and that authority is what makes every other module that depends on stock state — Billing, Accounting, Pharmacy, Reporting — coherent.

### 1.2 Bounded Context Alignment

The Inventory module aligns with bounded context BC09 (Inventory), category Operational, as defined in SYSTEM_ARCHITECTURE Section 7.2. The bounded context is responsible for inventory management, supply chain, and stock movement. The alignment between the bounded context and the module follows the documented deviation in SYSTEM_ARCHITECTURE Section 7.7: the Inventory context is implemented within the Pharmacy module (M05) for medication inventory and as a separate module (M07) for non-medication inventory. The deviation is structural rather than semantic: the domain model is shared, the contracts are shared, and the configuration surface is shared; the deployment boundary differs to honour the operational coupling between medication inventory and clinical pharmacy.

The Inventory context is a customer of the Configuration context (BC16) for the layered configuration that drives reorder rules, valuation methods, and expiry-alert thresholds; a customer of the Audit context (BC17) for the immutable record of every consequential stock action; and a customer of the Localization context (BC19) for locale-specific units of measure, terminology, and formatting. The Inventory context is a supplier to the Pharmacy context (BC05), which consumes stock state when fulfilling medication orders; to the Billing context (BC07), which consumes stock-consumption events when invoicing for dispensed items; to the Accounting context (BC08), which consumes stock-valuation events for inventory-asset accounting; and to the Reporting context, which consumes stock movements for operational, analytical, and regulatory reports. These customer-supplier relationships are governed by the dependency rules in SYSTEM_ARCHITECTURE Section 13.4.

### 1.3 Business Value

The business value of the Inventory module is measured in three outcomes that matter to the customer's executive team and to Ibn Hayan's operational reputation. First, stock availability: the module ensures that the right stock is available at the right location at the right time, preventing stockouts that disrupt clinical operations and preventing overstock that ties up capital and risks expiry. Second, stock integrity: the module ensures that every stock movement is recorded, every lot and batch is traceable, every expiry is monitored, and every controlled substance is accounted for, supporting regulatory compliance and supply-chain integrity. Third, cost accuracy: the module ensures that the cost of goods consumed is accurately reflected in financial reports, supporting accurate service costing, accurate insurance claims, and accurate inventory-asset accounting for the Ibn Hayan customer.

For Ibn Hayan itself, the module is a precondition for serving customers whose operations depend on physical stock — which is essentially all healthcare organizations that the Ibn Hayan platform serves. The module's configuration-driven design allows a single tenant to operate inventory differently per location and per stock category without forking the platform, honouring Principle P3 (One Platform, Many Organizations) and Principle P17 (Regional Adaptation Without Forking). The module's pharmacy specialization, expressed through configuration rather than through code branching, ensures that the same Ibn Hayan platform serves both medication and non-medication inventory without duplicating the domain model.

### 1.4 Position in the Platform

The Inventory module sits in the Operational category. It depends on Platform modules — Identity & Access, Configuration, Audit, Localization, Integration, Reporting — and does not depend on clinical modules in the general case. The pharmacy specialization of the Inventory context does depend on the Pharmacy module for medication-specific concerns (dispensing rules, controlled-substance rules, clinical-formulary alignment), but that dependency is part of the documented deviation in SYSTEM_ARCHITECTURE Section 7.7 and does not apply to non-medication inventory. The module's contract surface is consumed by other modules through synchronous query, asynchronous event, and the outbox pattern, with the pattern selected per interaction per MODULE_ARCHITECTURE Section 7.6.

The module is enabled per tenant per edition packaging rules in PRODUCT_BIBLE Section 16.7 and SYSTEM_ARCHITECTURE Section 9.7. The Inventory capability is available in the Professional and Enterprise editions; the Trial and Essential editions include a reduced inventory surface sufficient for evaluation and small-practice operation. The pharmacy specialization of the Inventory context is gated by the Pharmacy module's edition availability, ensuring that medication inventory is enabled only where clinical pharmacy is also enabled.

---

## 2. Module Purpose & Scope

### 2.1 In-Scope Capabilities

The module's in-scope capabilities span the full inventory lifecycle. The module records stock items, stock locations, stock movements, purchase orders, suppliers, reorder rules, lots and batches, and expiry dates. The module supports stock movements of multiple types — receipt (from supplier), transfer (between locations), dispensation (to patient or department), return (from patient or department), adjustment (gain or loss), and disposal (destruction or write-off). The module supports multi-location inventory, allowing a single tenant to operate stock across multiple facilities, multiple departments within facilities, and multiple storage units within departments. The module supports lot and batch tracking for traceability, expiry tracking for safety, and valuation for financial accuracy.

The module is responsible for the configuration surface that governs inventory rules: reorder points and quantities, valuation methods (FIFO, weighted average), ABC-analysis classifications, expiry-alert thresholds, and storage-location hierarchies. These configuration keys are part of the module's contract surface and are versioned, validated, and audited per the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). The module is also responsible for the supplier-relationship configuration that drives procurement, including supplier lead times, minimum-order quantities, and contracted pricing where applicable.

### 2.2 Out-of-Scope Items

Several inventory-adjacent concerns are explicitly out of scope. Clinical-formulary management — which medications a customer recognizes as prescribable — is owned by the Pharmacy module, which consumes inventory's stock-item data but does not replicate it. Medication-dispensing workflow — the act of preparing and handing a medication to a patient — is owned by the Pharmacy module, which consumes inventory's stock state but does not modify it directly. Fixed-asset management — capital equipment that is tracked for depreciation rather than consumed — is out of scope and is handled through the Accounting module. Supplier-contract negotiation — the commercial relationship with suppliers — is out of scope and is handled through external procurement processes.

Third-party logistics provider operations are out of scope. The module integrates with third-party logistics providers through the Integration module, but the providers' internal operations — warehouse management, picking, packing, shipping — are not governed by Ibn Hayan. The boundary is the same boundary the platform draws for payroll execution: the platform produces the auditable, correct stock movement that the logistics provider consumes; the provider's contribution is the physical movement. This separation preserves the module's ability to evolve its domain model and to switch logistics providers without ripple effects.

### 2.3 Edition Availability

| Edition | Code | Inventory Module Availability | Notes |
|---|---|---|---|
| Trial | E0 | Reduced surface | Single-location inventory, manual reorder, no lot/batch tracking. |
| Essential | E1 | Reduced surface | Single-location inventory, manual reorder, lot/batch tracking optional. |
| Professional | E2 | Full capability | Multi-location inventory, automated reorder, lot/batch tracking, expiry management, valuation. |
| Enterprise | E3 | Full capability | Multi-location, multi-region, multi-currency; advanced valuation; ABC analysis; regulatory reporting. |

The pharmacy specialization of the Inventory context is available wherever the Pharmacy module is enabled. Customers who do not operate medication inventory — for example, non-clinical wellness clinics — do not require the pharmacy specialization and operate the general Inventory module for their consumables and supplies.

### 2.4 Clinic Type Relevance

The 30 clinic types defined in PRODUCT_BIBLE Section 17 have different inventory needs. The table below summarizes the relevance of the Inventory module to representative clinic types.

| Clinic Type Category | Representative Types | Inventory Relevance | Rationale |
|---|---|---|---|
| Clinical | General Hospital, Specialty Hospital, Teaching Hospital | Critical | Medication inventory, consumables, reagents, surgical supplies; multi-location; regulatory exposure. |
| Clinical | Multi-Specialty Group, Dental Group | High | Medication inventory (sample medications), consumables, reagents; moderate volume. |
| Clinical | Long-Term Care, Rehabilitation Center | High | Medication inventory at scale; consumables for ongoing care. |
| Clinical | Mental Health Facility | Medium | Limited medication inventory; mostly consumables and office supplies. |
| Diagnostic | Imaging Center, Laboratory | High | Reagents, contrast media, consumables; lot/batch critical for reagents. |
| Wellness | Wellness Clinic, Aesthetic Clinic | Low to Medium | Limited consumables; no medication inventory typically. |
| Solo | Solo Practitioner Clinic | Low | Minimal stock; manual reorder typically sufficient. |
| Network | Hospital Network, Multi-Region Network | Critical | Multi-location, multi-region, multi-regulatory-framework operation requires unified inventory. |

### 2.5 Module Lifecycle Posture

The Inventory module is at the General Availability lifecycle stage per MODULE_ARCHITECTURE Section 6.1. The module's contract surface is at version 1.x, with no breaking changes planned. The module follows the platform's standard evolution discipline: contract evolution through versioning, capability addition through extension points, and deprecation only through the documented ADR process. The pharmacy specialization of the Inventory context is at the same lifecycle stage as the Pharmacy module; the two evolve together to preserve the documented deviation.

The module's configuration surface is mature. The configuration keys that govern reorder rules, valuation methods, and expiry thresholds have been validated against multiple regulatory frameworks and multiple stock categories. New configuration keys are added when an enduring requirement is identified; speculative configuration keys are not added per MODULE_ARCHITECTURE Section 10.2, criterion Minimal. The module's extension surface supports customer-specific integrations with supplier electronic-data-interchange systems, third-party logistics providers, and regulatory-reporting portals through the platform's standard extension points.

---

## 3. Key Features

### 3.1 Capability Catalogue

The Inventory module's capability surface is organized into thirteen capability areas. The areas are listed in the table below and elaborated in Sections 4 through 8 and in cross-cutting sections.

| # | Capability Area | Description |
|---|---|---|
| C1 | Stock Item Management | Definition and maintenance of stock-item master data. |
| C2 | Stock Location Management | Hierarchical definition of storage locations. |
| C3 | Stock Movements | Receipt, transfer, dispensation, return, adjustment, disposal. |
| C4 | Multi-Location Inventory | Stock state per location, with cross-location visibility. |
| C5 | Purchase Orders | Creation, approval, dispatch, receipt, and closure of purchase orders. |
| C6 | Supplier Management | Supplier master data, performance tracking, contracted pricing. |
| C7 | Reorder Automation | Reorder-point and reorder-quantity rules, automatic purchase-order generation. |
| C8 | Lot/Batch Tracking | Lot and batch identification, traceability through the supply chain. |
| C9 | Expiry Management | Expiry-date tracking, expiry-alert thresholds, disposal workflow. |
| C10 | Stock Takes | Periodic physical-count processes with reconciliation. |
| C11 | Valuation | FIFO and weighted-average cost calculation for stock consumption. |
| C12 | ABC Analysis | Classification of stock by value and volume for prioritized management. |
| C13 | Pharmacy Specialization | Medication-specific stock concerns, expressed through configuration. |

### 3.2 Capability Cross-Reference

The capability areas are consumed in different combinations by different roles and workflows. The table below cross-references each capability area to the primary module sections where the capability is elaborated.

| Capability Area | Elaborated In | Primary Roles |
|---|---|---|
| Stock Item Management | Section 4 | R03 Pharmacist (medication), R09 Administrator (general). |
| Stock Location Management | Section 4 | R09 Administrator, R13 System Administrator. |
| Stock Movements | Section 4 | R03 Pharmacist, R04 Technician, R09 Administrator. |
| Multi-Location Inventory | Section 4 | R09 Administrator, R12 Executive. |
| Purchase Orders | Section 5 | R09 Administrator, R11 HR Manager (rarely). |
| Supplier Management | Section 6 | R09 Administrator, R10 Compliance Officer. |
| Reorder Automation | Section 5 | R09 Administrator, R13 System Administrator. |
| Lot/Batch Tracking | Section 8 | R03 Pharmacist, R04 Technician, R10 Compliance Officer. |
| Expiry Management | Section 8 | R03 Pharmacist, R09 Administrator. |
| Stock Takes | Section 7 | R09 Administrator, R03 Pharmacist. |
| Valuation | Section 4 | R08 Biller, R10 Compliance Officer, R12 Executive. |
| ABC Analysis | Section 4 | R09 Administrator, R12 Executive. |
| Pharmacy Specialization | Section 4, Section 12 | R03 Pharmacist, R02 Nurse, R01 Physician. |

### 3.3 Configuration-Driven Posture

Every capability area is configurable rather than coded. Reorder rules are defined through configuration keys, not through source-level reorder logic. Valuation methods are defined through configuration keys, not through hard-coded cost calculations. Expiry thresholds are defined through configuration keys, not through hard-coded alert rules. This posture is the architectural expression of Principle P2 (Configuration Before Customization) and is non-negotiable: a customer that needs a valuation-method variant that cannot be expressed through configuration is a candidate for platform evolution, not for source-level customization. The configuration surface per capability area is documented in Section 13.

The pharmacy specialization deserves particular emphasis. Medication-specific stock concerns — controlled-substance tracking, cold-chain monitoring, formulary alignment — are expressed through configuration, not through a separate code branch. The same Inventory module that tracks office supplies tracks controlled substances; the difference is configuration. This design choice preserves the bounded context's cohesion and prevents the divergence that would result from maintaining separate medication and non-medication inventory code bases. The design choice is documented as part of the deviation in SYSTEM_ARCHITECTURE Section 7.7 and is governed by the standard amendment process.

---

## 4. Stock Management

### 4.1 Stock Items and Stock Locations

A Stock Item is the master record for a physical good that the customer tracks. A stock item captures the item's name, description, category, unit of measure, default storage location, default supplier, valuation method, reorder rules, and any safety-critical attributes (controlled substance, refrigerated, hazardous). Stock items are versioned: a change to a stock item's master data is recorded as a new version, with the previous version retained for historical traceability. A stock item may be linked to a clinical-formulary entry in the Pharmacy module through a reference rather than through shared identity, preserving the boundary between the Inventory and Pharmacy contexts.

A Stock Location is a physical place where stock is stored. Locations are hierarchical: a facility contains departments, departments contain storage rooms, storage rooms contain shelves or bins. The hierarchy is configurable per tenant, with the customer's system administrator responsible for maintaining it. Stock state is recorded per location: an item may be in stock at one location and out of stock at another, and the module reflects this through per-location stock records rather than through a single aggregate. The hierarchical structure supports multi-location operation, cross-location visibility, and location-scoped permissions.

### 4.2 Stock Movements

A Stock Movement is a record of stock entering, leaving, or moving within the customer's locations. The module supports the movement types listed in the table below, each with its own workflow, audit requirements, and financial impact.

| Movement Type | Description | Financial Impact |
|---|---|---|
| Receipt | Stock received from a supplier against a purchase order. | Inventory-asset increase; accounts-payable increase. |
| Transfer | Stock moved between locations within the customer. | No financial impact; location-level rebalance. |
| Dispensation | Stock dispensed to a patient or consumed in a procedure. | Inventory-asset decrease; cost-of-goods increase. |
| Return | Stock returned by a patient or department. | Inventory-asset increase; cost-of-goods decrease (if reversal) or stock-movement record (if new). |
| Adjustment | Stock gain or loss identified through stock take or correction. | Inventory-asset adjustment; expense or gain. |
| Disposal | Stock destroyed or written off (expired, damaged, recalled). | Inventory-asset decrease; expense. |

Each movement is recorded with the actor, the time, the source and destination locations, the stock item, the quantity, the lot and batch where applicable, the expiry date where applicable, and the reason. Movements are immutable once recorded; corrections are made through compensating movements (returns, adjustments), not through edits. The audit posture is the architectural expression of Principle P13 (Auditability as Primitive) and is the basis for supply-chain integrity demonstration.

### 4.3 Multi-Location Inventory

The module supports multi-location inventory by maintaining per-location stock state and per-location valuation. A single stock item may be present at multiple locations, with each location's quantity and cost tracked independently. Cross-location visibility is provided through aggregate queries: a customer can ask "how much of this item do I have across all locations" and receive the sum of per-location quantities. Cross-location transfers are first-class movements, with their own workflow and audit trail; they are not treated as a dispensation followed by a receipt, which would distort cost-of-goods and accounts-payable.

Multi-location inventory is essential for hospital networks, where stock moves between facilities regularly. The module's configuration surface defines the locations that may transfer to each other, the approval rules for transfers, and the valuation rules that apply on transfer (transfer at cost, transfer at transferred-cost-plus, transfer at standard cost). The configuration allows the same platform to serve organizations with very different transfer policies, from tightly controlled centralized procurement to decentralized facility-level procurement.

### 4.4 Valuation and ABC Analysis

Valuation is the calculation of the cost of stock consumed. The module supports multiple valuation methods per stock item, with the method selected through configuration. The table below summarizes the supported methods.

| Method | Description | Typical Use |
|---|---|---|
| FIFO (First-In-First-Out) | Cost assigned based on the earliest purchased stock. | Perishable goods; medications; default for most stock. |
| Weighted Average | Cost assigned based on the weighted average of all purchases. | Consumables; supplies; stock where individual lot cost is not material. |
| Standard Cost | Cost assigned based on a configured standard, with variances recorded. | Items with stable cost; items where actual-cost tracking is not material. |
| Specific Identification | Cost assigned based on the specific lot's actual cost. | High-value items; controlled substances; items where traceability is regulatory. |

ABC analysis is the classification of stock by value and volume. The module classifies stock into three categories: A items (high value, low volume — typically 20% of items representing 80% of value), B items (moderate value, moderate volume), and C items (low value, high volume). The classification is configurable per tenant and is consumed by the reorder-automation rules (A items managed tightly, C items managed loosely), the stock-take rules (A items counted frequently, C items counted rarely), and the reporting surface (ABC distribution reports for executive review).

---

## 5. Procurement

### 5.1 Purchase Orders

A Purchase Order is the customer's commitment to purchase stock from a supplier. The module supports the full purchase-order lifecycle: creation, approval, dispatch to the supplier, partial or full receipt, and closure. Each purchase order captures the supplier, the ordering location, the line items (stock item, quantity, unit cost, expected delivery date), the approval history, and the receipt history. Purchase orders are versioned: a change to a purchase order after dispatch is recorded as an amendment, with the supplier notified per the configured communication rules. Purchase orders are auditable: who created the order, who approved it, who dispatched it, who received against it, and who closed it.

The purchase-order workflow is governed by the platform's workflow engine per SYSTEM_ARCHITECTURE Section 16. The workflow defines the approval chain, the dispatch mechanism, the receipt process, and the closure rules. The workflow is configurable: a customer may require single approval or multi-level approval, may dispatch through electronic data interchange or through email, may receive in full or in partial shipments, and may close automatically on full receipt or require manual closure. The workflow's audit trail is the basis for procurement-compliance demonstration and for supplier-performance analytics.

### 5.2 Reorder Automation

Reorder automation is the module's capability to generate purchase orders automatically when stock falls below configured thresholds. The module evaluates reorder rules on a configurable schedule — typically daily — and generates draft purchase orders for items whose stock has fallen below their reorder point. The draft purchase orders are routed for approval through the standard purchase-order workflow, ensuring that automated reordering does not bypass procurement governance. The reorder rules are configurable per stock item, per location, and per supplier, allowing the same platform to serve organizations with very different procurement patterns.

Reorder rules define the reorder point (the stock level at which a reorder is triggered), the reorder quantity (the quantity to order), the supplier (the default supplier for the reorder), and the lead time (the supplier's typical delivery time, used to calculate the reorder point to avoid stockout during lead time). The rules may be seasonal (higher reorder point during high-demand periods), may be quantity-discount-aware (reorder quantity rounded to take advantage of supplier discounts), and may be constrained by minimum-order quantities. The rules' configuration surface is part of the module's contract and is versioned and audited per the platform's configuration strategy.

### 5.3 Procurement Compliance

Procurement compliance is the practice of ensuring that purchasing decisions follow the customer's governance rules. The module supports compliance through several mechanisms. First, approval workflows ensure that purchases above defined thresholds require defined approvals. Second, supplier master data ensures that purchases are made only from approved suppliers, with new suppliers requiring compliance review before activation. Third, contracted pricing ensures that purchases are made at negotiated prices where contracts exist, with deviations flagged for review. Fourth, audit trails ensure that every purchase decision is traceable to the actor who made it, the time it was made, and the authorization basis.

Procurement compliance is governed by the customer's compliance officer, who configures the approval thresholds, the supplier-approval rules, and the contracted-pricing enforcement rules. The module's role is to enforce the configured rules consistently and to surface violations for review. Compliance reporting is produced through the Reporting module, which consumes procurement events and produces reports on approval-cycle times, supplier performance, contracted-pricing adherence, and procurement-spend distribution.

---

## 6. Supplier Management

### 6.1 Supplier Master Data

A Supplier is the master record for an external entity that sells stock to the customer. A supplier record captures the supplier's name, contact information, tax identifiers, payment terms, lead times, contracted pricing (where applicable), and compliance status. Suppliers are versioned: a change to a supplier's master data is recorded as a new version, with the previous version retained for historical traceability. Suppliers are activated and deactivated through a governed workflow, with new suppliers requiring compliance review and existing suppliers requiring periodic re-review. A deactivated supplier cannot appear on new purchase orders but remains referenceable from historical orders.

Supplier master data is consumed by the purchase-order workflow (for supplier selection and dispatch), by the reorder-automation rules (for default-supplier selection), by the receipt workflow (for supplier-performance tracking), and by the Accounting module (for accounts-payable posting). The supplier record is the authoritative source for supplier identity; other modules that need supplier data obtain it through the Inventory module's query contracts or by subscribing to the Inventory module's events. Direct data access across the boundary is forbidden per MODULE_ARCHITECTURE Section 11.3.

### 6.2 Supplier Performance Tracking

The module tracks supplier performance through metrics derived from purchase-order and receipt data. The metrics include on-time delivery rate (the percentage of purchase orders delivered by the expected date), fill rate (the percentage of ordered quantity actually delivered), quality-acceptance rate (the percentage of delivered quantity accepted without return), and lead-time variability (the standard deviation of actual lead time versus quoted lead time). The metrics are computed automatically from the purchase-order and receipt events, with the computation governed by configurable rules (e.g., what counts as "on time" — exact date, within one day, within three days).

Supplier-performance metrics are exposed through the Reporting module's analytical surface, allowing procurement teams to identify underperforming suppliers, to negotiate improvements, and to make sourcing decisions. The metrics are also exposed to the supplier through the Integration module's supplier-portal capability, where applicable, allowing suppliers to monitor their own performance and to address issues proactively. The exposure is governed by the customer's configuration, which specifies which metrics are shared and at what frequency.

### 6.3 Contracted Pricing

Contracted pricing is the practice of recording negotiated prices with suppliers and applying them automatically to purchase orders. The module supports contracted pricing through a pricing-rule configuration that maps a stock item, a supplier, and a quantity range to a unit cost. When a purchase order is created for the stock item from the supplier at a quantity in the range, the contracted price is applied automatically, with the application recorded for audit. Deviations from contracted pricing — for example, where the supplier has unilaterally increased the price — are flagged for review and require approval before the purchase order is dispatched.

Contracted-pricing rules are versioned and audited per the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). A new contract replaces an existing contract on the configured effective date, with the previous contract retained for historical orders and for audit. Contracts may be seasonal (effective only during a defined period), may be volume-tiered (different prices at different quantity thresholds), and may be conditional (effective only when other conditions are met, such as a minimum annual purchase volume). The configuration surface accommodates the variation without code change, honouring Principle P2.

---

## 7. Stocktaking

### 7.1 Stock Take Process

A Stock Take is the periodic process of physically counting stock at a location and reconciling the count with the module's recorded state. The module supports the full stock-take lifecycle: planning (defining the scope, the date, the counters), execution (recording the physical counts), reconciliation (comparing physical counts to recorded state), and disposition (recording adjustments to align recorded state with physical reality). The stock-take workflow is governed by the platform's workflow engine per SYSTEM_ARCHITECTURE Section 16, with each step recorded for audit.

Stock takes may be full (every item at the location is counted) or cycle (a subset of items is counted on a rotating schedule, with the full inventory covered over a defined period). The choice is configurable per location and per stock category, with ABC analysis typically driving the schedule: A items counted frequently (monthly or quarterly), B items counted less frequently (semi-annually), C items counted rarely (annually). The configurable schedule ensures that stock-take effort is proportional to risk, with high-value items receiving more attention than low-value items.

### 7.2 Reconciliation and Adjustments

Reconciliation is the comparison of physical counts to recorded state. Where the two match, no action is taken; where they differ, an adjustment is recorded. Adjustments are stock movements of type Adjustment (Section 4.2), with the reason recorded as "stock-take variance" and the magnitude and direction of the variance captured. Adjustments are auditable: who recorded the adjustment, when, with what authorization, with what magnitude. Adjustments are financially impactful: a positive adjustment (physical count higher than recorded) increases inventory assets and reduces cost-of-goods; a negative adjustment reduces inventory assets and increases cost-of-goods.

Adjustments above defined thresholds require approval, with the approval workflow configurable per location and per stock category. The approval ensures that significant variances are reviewed by a manager or compliance officer before being recorded, preventing the silent absorption of shrinkage, theft, or process defects. The approval's audit trail is the basis for shrinkage investigation and for process-improvement decisions.

### 7.3 Stock-Take Compliance

Stock-take compliance is the practice of conducting stock takes on the schedule defined by the customer's governance rules. The module tracks stock-take compliance through metrics that compare the actual stock-take schedule to the configured schedule, with deviations flagged for review. The metrics are exposed through the Reporting module, allowing the compliance officer to identify locations or stock categories where stock takes are overdue and to address the underlying cause.

Stock-take compliance is particularly consequential for controlled substances and for high-value items, where regulatory frameworks typically require frequent stock takes and rigorous variance investigation. The module's configuration surface allows the customer to define stricter stock-take rules for these categories, with the rules enforced consistently across all locations. The audit trail of stock takes and adjustments is the basis for regulatory inspection and for narcotics-authority reporting.

---

## 8. Expiry Tracking

### 8.1 Lot and Batch Tracking

A Lot or Batch is a quantity of stock that shares a common origin — typically a single purchase from a supplier, or a single manufacturing run. The module records lot and batch identifiers for stock items where traceability is required: medications, reagents, biological products, and any stock subject to recall. Lot and batch identifiers are recorded at receipt and propagated through every subsequent movement, ensuring that the module can answer the question "where is this lot now" and "which patients received stock from this lot" without manual reconstruction. The traceability is essential for recall management and for regulatory investigation.

Lot and batch tracking is configurable per stock item, with the customer's configuration determining which items require lot/batch tracking. Items that do not require tracking — typically low-value consumables — are not burdened with the additional data entry. The configuration surface allows the same platform to serve organizations with very different traceability requirements, from minimal (small clinic with no medications) to comprehensive (hospital with full medication and reagent tracking). The configuration is governed by the customer's compliance officer, who sets the requirements in accordance with the applicable regulatory framework.

### 8.2 Expiry Date Management

Expiry Date is the date beyond which stock is no longer safe or effective to use. The module records expiry dates for stock items where expiry applies: medications, reagents, biological products, and any stock with a defined shelf life. Expiry dates are recorded at receipt and propagated through every subsequent movement, ensuring that the module can answer the question "what stock is expiring in the next 30 days" without manual reconstruction. Expiry management is essential for patient safety (preventing the use of expired stock) and for cost control (allowing stock to be used before it expires, reducing write-offs).

Expiry management is governed by configurable alert thresholds. The module generates alerts when stock is approaching expiry, with the alert threshold configurable per stock item and per location. The alerts are consumed by the Notifications module for delivery to the responsible roles, with the delivery configurable per role and per stock category. The alerts drive action: stock approaching expiry may be prioritized for use (first-expiry-first-out), transferred to a location with higher turnover, returned to the supplier where contracts allow, or disposed of where no other option exists.

### 8.3 Recall Management

A Recall is the process of identifying and removing stock that has been identified as defective or unsafe by the supplier or a regulatory authority. The module supports recall management through its lot/batch tracking capability: given a recall notice that identifies a specific lot, the module can identify where the lot is currently held, which patients received stock from the lot (where dispensation records are linked to the lot), and which purchase orders brought the lot into the customer's locations. The identification is the basis for the recall workflow, which coordinates stock removal, patient notification, and supplier return.

Recall management is a regulatory obligation in most jurisdictions, and the module's audit trail is the basis for demonstrating compliance. The recall workflow is governed by the platform's workflow engine per SYSTEM_ARCHITECTURE Section 16, with each step — recall receipt, stock identification, stock removal, patient notification, supplier return, recall closure — recorded for audit. The recall workflow is a saga pattern per MODULE_ARCHITECTURE Section 7.4, with compensation handling for steps that fail (e.g., a patient who cannot be reached for notification).

---

## 9. User Roles

### 9.1 Primary Inventory Roles

The Inventory module is consumed by the roles defined in PRODUCT_BIBLE Section 20. The table below summarizes the primary roles and their inventory interactions.

| Role Code | Role | Inventory Interaction |
|---|---|---|
| R03 | Pharmacist | Manages medication stock; records dispensations; conducts medication stock takes; manages controlled-substance inventory. |
| R04 | Technician | Records laboratory and imaging consumable movements; manages reagent inventory. |
| R09 | Administrator | Manages general stock; creates purchase orders; manages suppliers; conducts stock takes. |
| R10 | Compliance Officer | Reviews inventory audit trail; consumes compliance reports; verifies controlled-substance handling. |
| R12 | Executive | Consumes aggregate inventory reports; oversees procurement strategy. |
| R13 | System Administrator | Manages Inventory module enablement; manages integration configuration with suppliers and logistics providers. |
| R08 | Biller | Consumes stock-consumption events for cost-of-goods attribution. |

### 9.2 Role-Based Workflow Participation

Each role participates in inventory workflows in defined ways. The table below summarizes the role-to-workflow mapping.

| Workflow | Primary Roles | Secondary Roles |
|---|---|---|
| Purchase order creation and approval | R09 Administrator, R12 Executive | R10 Compliance Officer (for high-value) |
| Receipt | R09 Administrator, R04 Technician | R03 Pharmacist (medication) |
| Dispensation | R03 Pharmacist, R04 Technician | R02 Nurse (where authorized) |
| Transfer | R09 Administrator | R03 Pharmacist (medication) |
| Stock take | R09 Administrator, R03 Pharmacist | R10 Compliance Officer (for controlled substances) |
| Adjustment approval | R09 Administrator, R12 Executive | R10 Compliance Officer |
| Disposal | R03 Pharmacist, R09 Administrator | R10 Compliance Officer |
| Recall | R10 Compliance Officer, R03 Pharmacist | R09 Administrator |

### 9.3 Audit Events Generated

The Inventory module generates audit events for every consequential action, per Principle P13 and SYSTEM_ARCHITECTURE Section 27. The table below summarizes the audit-event categories the module produces.

| Audit Category | Examples |
|---|---|
| Stock movements | Receipt, transfer, dispensation, return, adjustment, disposal. |
| Purchase orders | Creation, approval, dispatch, receipt, closure, amendment. |
| Supplier changes | Supplier creation, activation, deactivation, contracted-pricing change. |
| Configuration changes | Reorder-rule change, valuation-method change, expiry-threshold change. |
| Stock takes | Stock-take initiation, count recording, adjustment recording. |
| Recalls | Recall receipt, stock identification, stock removal, patient notification, closure. |

Every audit event is recorded in the platform's audit store with the standard audit-record structure defined in SYSTEM_ARCHITECTURE Section 27.4. Audit records are immutable, append-only, and tamper-evident, and they are retained per the regulatory framework's requirements. Audit records for controlled-substance handling are subject to extended retention in most jurisdictions, with the retention period governed by the customer's compliance configuration.

---

## 10. Workflows

### 10.1 Procurement Workflow

The procurement workflow coordinates the activities that produce a purchase order and the resulting receipt. The workflow is defined declaratively through configuration, per SYSTEM_ARCHITECTURE Section 16.2. A typical procurement workflow comprises the steps listed in the table below, with the customer's configuration determining which steps apply, in what order, and with what deadlines.

| Step | Owner | Description |
|---|---|---|
| Reorder trigger | Inventory module | Automatic trigger from reorder rules, or manual trigger from a requester. |
| Draft purchase order | Inventory module | Generates draft purchase order with line items, quantities, and costs. |
| Approval | R09 Administrator or R12 Executive | Approves the purchase order per the configured approval chain. |
| Dispatch | Inventory module | Dispatches the purchase order to the supplier via the configured channel. |
| Receipt | R09 Administrator or R04 Technician | Receives stock against the purchase order, with partial receipts supported. |
| Quality check | R03 Pharmacist or R04 Technician | Verifies that received stock meets quality requirements. |
| Put-away | R09 Administrator | Moves received stock to its storage location. |
| Closure | Inventory module | Closes the purchase order on full receipt or manual closure. |

The workflow engine coordinates the steps, handling state management, error handling, compensation, and audit. The workflow is recoverable: if a step fails, the workflow resumes from its last durable state. The workflow is observable: each step's state and timestamp are visible to the requester and approver through reporting. The workflow is auditable: each step's execution is recorded in the audit trail.

### 10.2 Dispensation Workflow

The dispensation workflow coordinates the activities that produce a stock dispensation. The workflow is shared with the Pharmacy module for medication dispensation, with the Inventory module's role being to record the stock movement and to update stock state. The table below summarizes the workflow steps.

| Step | Owner | Description |
|---|---|---|
| Dispensation request | Pharmacy module | Receives a dispensation request from a clinical workflow. |
| Stock availability check | Inventory module | Verifies that the requested stock is available at the dispensing location. |
| Lot selection | Inventory module or R03 Pharmacist | Selects the lot to dispense (first-expiry-first-out by default). |
| Dispensation recording | Inventory module | Records the dispensation as a stock movement. |
| Stock state update | Inventory module | Updates the per-location stock state. |
| Cost attribution | Inventory module | Calculates the cost of goods consumed. |
| Event publication | Inventory module | Publishes the dispensation event for consumption by Billing, Accounting, and Reporting. |

The dispensation workflow is the most consequential workflow the Inventory module participates in, because it directly affects patient safety (the right medication must be dispensed in the right quantity from the right lot) and financial accuracy (the cost of goods consumed must be accurately attributed). The workflow's audit trail is the basis for clinical-safety investigation, for narcotics-authority reporting, and for cost-of-goods attribution.

### 10.3 Recall Workflow

The recall workflow coordinates the activities that follow a recall notice. The table below summarizes the steps.

| Step | Owner | Description |
|---|---|---|
| Recall receipt | R10 Compliance Officer or R03 Pharmacist | Receives the recall notice from the supplier or regulatory authority. |
| Stock identification | Inventory module | Identifies all stock of the affected lot currently held. |
| Patient identification | Inventory module | Identifies all patients who received stock from the affected lot (where dispensation records are linked). |
| Stock removal | R03 Pharmacist or R09 Administrator | Removes affected stock from circulation and quarantines it. |
| Patient notification | Notifications module | Notifies affected patients per the configured communication rules. |
| Supplier return | R09 Administrator | Returns affected stock to the supplier where contracts allow. |
| Disposal | R03 Pharmacist or R09 Administrator | Disposes of stock that cannot be returned. |
| Recall closure | R10 Compliance Officer | Closes the recall with documentation. |

The recall workflow is a saga pattern per MODULE_ARCHITECTURE Section 7.4, with compensation handling for steps that fail. A patient who cannot be reached for notification is recorded as an unresolved notification, with the unresolved status escalated for human follow-up. A supplier who refuses return is recorded, with the refusal documented for audit and for supplier-performance analytics.

---

## 11. Data Models

### 11.1 Key Entities

This section lists the Inventory module's primary domain entities by name. Entity schemas, data-store representations, and persistence details are out of scope for this document and are governed by the platform's data architecture documentation. The list below is the canonical reference for what entities the Inventory module owns.

| Entity | Description |
|---|---|
| Stock Item | The master record for a physical good that the customer tracks. |
| Stock Location | A physical place where stock is stored (facility, department, room, shelf, bin). |
| Stock Movement | A record of stock entering, leaving, or moving within the customer's locations. |
| Stock State | The current quantity and valuation of a stock item at a stock location. |
| Purchase Order | The customer's commitment to purchase stock from a supplier. |
| Purchase Order Line | A line item on a purchase order, specifying stock item, quantity, and unit cost. |
| Supplier | The master record for an external entity that sells stock to the customer. |
| Reorder Rule | The configured rule that governs automated reordering for a stock item at a location. |
| Lot/Batch | A quantity of stock that shares a common origin, identified for traceability. |
| Expiry Date | The date beyond which stock is no longer safe or effective to use. |
| Stock Take | A periodic physical-count process for a stock location. |
| Stock Take Count | A physical count recorded during a stock take. |
| Valuation Rule | The configured rule that governs cost calculation for a stock item. |
| ABC Classification | The configured classification of a stock item into A, B, or C category. |

### 11.2 Entity Ownership and Boundaries

Each entity in the table above is owned by the Inventory module. Ownership means the Inventory module is the authoritative source for the entity; other modules that need the entity's data obtain it through the Inventory module's query contracts or by subscribing to the Inventory module's events. Direct data access across the boundary is forbidden per MODULE_ARCHITECTURE Section 11.3 and is detected through static analysis. The boundary preserves the Inventory module's ability to evolve its internal representation without coordinating with consumers, as long as it honours its contracts.

The Stock Item entity is shared with the Pharmacy module in the sense that the Pharmacy module's clinical-formulary entries reference stock items. The reference is by identifier, not by data replication; the Pharmacy module holds the identifier and queries the Inventory module for the current state. This is the standard read-model and projection pattern documented in MODULE_ARCHITECTURE Section 11.3. The Stock Movement entity is shared with the Accounting module, which consumes stock-movement events for general-ledger posting; the consumption is by event subscription, with the Inventory module unaware of which consumers have subscribed.

### 11.3 Data Volume and Retention

The Inventory module's data volume is moderate relative to clinical modules. A hospital with 10,000 stock items and 50 storage locations produces on the order of 10,000 stock-item records, 500,000 stock-state records (one per stock item per location), 1 million stock movements per year, 100,000 purchase-order lines per year, and 1,000 stock takes per year. The volume is well within the capacity of the platform's standard data architecture. The retention horizon is long: stock-movement records must be retained for the period defined by the regulatory framework, which in many jurisdictions is seven to ten years for controlled substances and three to seven years for general stock.

Retention is governed by the platform's data retention configuration, which is part of the Configuration module's surface. The Inventory module exposes retention configuration per entity type, with the customer's compliance officer responsible for setting the retention period in accordance with the applicable regulatory framework. Records that are past their retention period are archived or purged per the configured policy, with the archival or purge recorded in the audit trail. The retention posture honours Principle P6 (Reversibility Over Permanence) balanced against regulatory retention obligations, with the balance explicit per entity type.

---

## 12. Integrations

### 12.1 Integration with Platform Modules

The Inventory module integrates with multiple platform modules. The table below summarizes the integrations.

| Integrated Module | Integration Purpose | Pattern |
|---|---|---|
| Pharmacy | Medication stock state; dispensation events; controlled-substance tracking. | Synchronous query; asynchronous event (outbox); shared domain model per SA Section 7.7. |
| Billing | Stock-consumption events for cost-of-goods attribution; consumable charges on invoices. | Asynchronous event (outbox). |
| Accounting | Stock-valuation events for inventory-asset accounting; purchase-order events for accounts-payable. | Asynchronous event (outbox). |
| Documents | Purchase-order storage; supplier-contract storage; stock-take report storage. | Synchronous command; synchronous query. |
| Notifications | Reorder alerts; expiry alerts; recall notifications; stock-take reminders. | Asynchronous event (outbox). |
| Configuration | Reorder rules, valuation methods, expiry thresholds, location hierarchy. | Configuration schema consumption. |
| Audit | Audit-event recording for all consequential stock actions. | Asynchronous event (outbox). |
| Reporting | Inventory data for operational, analytical, and regulatory reports. | Read-model projection; synchronous query. |
| Localization | Locale-specific units of measure, terminology, formatting. | Configuration schema consumption. |
| Integration | Integration with supplier EDI systems, third-party logistics providers, regulatory portals. | Anticorruption layer. |

### 12.2 Integration with External Systems

The Inventory module integrates with several categories of external systems through the Integration module. The table below summarizes the categories.

| External System Category | Integration Purpose | Pattern |
|---|---|---|
| Supplier electronic data interchange | Purchase-order dispatch; order acknowledgement; advance shipping notice; invoice receipt. | Anticorruption layer; scheduled and event-driven. |
| Third-party logistics provider | Stock movement synchronization; warehouse management; picking and shipping. | Anticorruption layer; bidirectional. |
| Regulatory reporting portal | Controlled-substance reporting; recall reporting; supply-chain integrity reporting. | Anticorruption layer; scheduled. |
| Barcode and RFID systems | Stock-item identification at receipt, dispensation, and stock take. | Anticorruption layer; real-time. |
| Cold-chain monitoring system | Temperature monitoring for refrigerated stock; alert on temperature excursion. | Anticorruption layer; event-driven. |

External-system integration is governed by the Anticorruption Layer pattern documented in SYSTEM_ARCHITECTURE Section 7.3. The Inventory module's domain model is not contaminated by the external system's model; the Integration module translates between the two, preventing external-model leakage into the Inventory module's contracts. The translation is governed by a contract that the Integration module owns; the Inventory module is unaware of the external system's specifics. This separation preserves the Inventory module's ability to evolve its domain model and to switch external providers without ripple effects.

### 12.3 Pharmacy Specialization Boundary

The pharmacy specialization of the Inventory context deserves explicit treatment because it is the documented deviation from the one-to-one bounded-context-to-module mapping (SYSTEM_ARCHITECTURE Section 7.7). The specialization is expressed through configuration and through a shared domain model, not through a separate code branch. The Pharmacy module consumes the Inventory module's stock-state queries when fulfilling medication orders, records dispensation events that the Inventory module consumes to update stock state, and adds medication-specific configuration (controlled-substance schedules, cold-chain requirements, formulary alignment) that the Inventory module enforces.

The boundary between the Inventory and Pharmacy contexts is governed by the customer-supplier relationship defined in SYSTEM_ARCHITECTURE Section 7.3. The Inventory context is the supplier for stock state; the Pharmacy context is the customer. The Pharmacy context does not modify stock state directly; it issues commands to the Inventory context, which executes them and publishes the resulting events. This separation preserves both contexts' cohesion and allows each to evolve independently within the constraints of the shared domain model.

---

## 13. Configuration

### 13.1 Configuration Surface

The Inventory module's configuration surface is the primary mechanism through which the customer adapts the module to its specific inventory operations. The configuration surface is part of the module's contract and is versioned with it. The surface is bounded by what can be expressed without source-level modification per MODULE_ARCHITECTURE Section 10.1; behaviours that would require source modification are candidates for platform evolution through the extension surface, not for customer-specific customization. The configuration surface is organized by capability area, with each capability area exposing a coherent set of configuration keys.

The configuration surface is governed by the platform's configuration strategy (SYSTEM_ARCHITECTURE Section 15). Configuration keys are namespaced by module and by capability. Configuration values are validated before application, with five validation rule categories (SYSTEM_ARCHITECTURE Section 15.4). Configuration changes are versioned, audited, and reversible through rollback. Configuration is resolved by the platform's configuration service, not by the Inventory module, ensuring consistent resolution across modules.

### 13.2 Configuration Categories

The Inventory module's configuration falls into several categories per MODULE_ARCHITECTURE Section 10.3. The table below summarizes the categories.

| Category | Examples | Typical Owner |
|---|---|---|
| Behavioural | Reorder rules, valuation methods, expiry thresholds, ABC classification rules. | Administrator, customer system administrator. |
| Structural | Location-hierarchy definition, capability-gating flags per location. | Customer system administrator. |
| Integration | Supplier EDI endpoints, logistics-provider endpoints, credentials, schedules. | Integration architect. |
| Localization | Locale-specific units of measure, terminology, formatting. | Localization specialist. |
| Security | Stock-record access rules, controlled-substance access rules, audit-query scope rules. | Security architect. |
| Performance | Cache settings, batch sizes, reorder-evaluation parallelism. | Operations. |
| Regulatory | Retention periods, controlled-substance schedules, regulatory-reporting templates. | Compliance officer. |

### 13.3 Configuration Layers and Precedence

The Inventory module honours the platform's eight-layer configuration model (SYSTEM_ARCHITECTURE Section 15.2). Configuration values are resolved by combining values from each layer in precedence order: platform default (L1), edition default (L2), tenant override (L3), facility override (L4), department override (L5), care-team override (L6), user override (L7), session override (L8). A higher layer overrides a lower layer; overrides are validated, versioned, and auditable. Not all configuration keys are overridable at all layers; some keys are fixed at lower layers for safety, regulatory, or platform-integrity reasons.

The Inventory module's configuration surface documents, for each configuration key, which layers may override the key and which layers are prohibited from overriding it. For example, a valuation-method configuration key may be overridden at the tenant layer but not at lower layers, because valuation is a tenant-wide accounting policy. A reorder-threshold configuration key may be overridden at the facility and department layers, because reorder thresholds reflect local demand patterns. The layer restrictions are enforced by the configuration service, not by the Inventory module.

### 13.4 Configuration Sandbox and Promotion

The Inventory module's configuration supports the platform's configuration sandbox (SYSTEM_ARCHITECTURE Section 15.7). A configuration change is tested in a sandbox tenant before application to a production tenant. The sandbox tenant inherits from the production tenant, ensuring that sandbox testing reflects production reality. A configuration change that has not been tested in a sandbox is not applied to production, except for emergency changes that follow a documented expedited pathway. The sandbox requirement is a direct consequence of Principle P1 (Healthcare Safety): untested configuration changes to reorder rules or valuation methods can compromise stock availability or financial accuracy, both of which have safety or regulatory consequences for an Ibn Hayan customer.

Configuration promotion from sandbox to production is a governed process, with the customer's system administrator initiating the promotion, the customer's compliance officer reviewing regulatory-impacting changes, and the audit trail capturing the promotion. The promotion is reversible through rollback, with the rollback itself versioned and auditable. The promotion honours the customer's own governance workflow, which the Ibn Hayan platform supports but does not impose.

---

## 14. Permissions

### 14.1 Permission Categories

The Inventory module's permission surface is organized into the categories defined by the platform's permission framework. The table below summarizes the categories and the Inventory module's exposure in each.

| Permission Category | Inventory Module Exposure |
|---|---|
| Read | View stock items, stock state, stock movements, purchase orders, suppliers, stock takes. |
| Write | Create or amend stock items, stock movements, purchase orders, supplier records, stock-take counts. |
| Approve | Approve purchase orders, stock-take adjustments, disposals, recalls. |
| Configure | Modify reorder rules, valuation methods, expiry thresholds, location hierarchy. |
| Audit | Query the inventory audit trail; review audit records; export audit reports. |
| Integrate | Manage integrations with suppliers, logistics providers, regulatory portals. |

### 14.2 Role-to-Permission Mapping

The role-to-permission mapping is governed by the platform's permission framework. The table below summarizes the default mapping; customers may refine the mapping within the framework's constraints.

| Role | Read | Write | Approve | Configure | Audit | Integrate |
|---|---|---|---|---|---|---|
| R03 Pharmacist | Medication stock | Medication movements | Medication adjustments | Medication reorder rules | Medication audit | No |
| R04 Technician | Consumable stock in scope | Consumable movements | No | No | Consumable audit | No |
| R09 Administrator | All in facility | All in facility | All in facility | Facility-level only | All in facility | No |
| R10 Compliance Officer | All in tenant | No | No | No | All in tenant | No |
| R12 Executive | Aggregate only | No | High-value only | No | Aggregate only | No |
| R13 System Administrator | All | No | No | No | All | All |

### 14.3 Permission Enforcement and Audit

Permission enforcement is performed by the platform's permission framework, not by the Inventory module. The Inventory module declares the permission required for each operation; the framework enforces the declaration. The enforcement is consistent across surfaces: an operation performed through the user interface, through an integration, or through an administrative tool is governed by the same permission rule. This consistency is the architectural expression of Principle P13 (Auditability as Primitive) and is non-negotiable.

Permission checks are auditable. Every permission check is recorded in the audit trail when the check is for a consequential action, with the actor, the action, the permission required, the permission decision, and the authorization basis captured. A permission check that denies access is recorded with the same completeness as a permission check that grants access, ensuring that unauthorized access attempts are detectable. Permission audits are queryable through the Audit module's query contracts, with queries themselves audited.

### 14.4 Controlled-Substance Permissions

Controlled-substance inventory is subject to stricter permission rules than general inventory. The Inventory module's permission framework supports controlled-substance-specific permissions, with access limited to roles authorized by the customer's compliance configuration. Controlled-substance stock movements require dual authorization in many jurisdictions, with the authorization recorded in the audit trail. The dual-authorization rule is configurable per controlled-substance schedule, with the customer's compliance officer setting the requirements in accordance with the applicable regulatory framework.

Controlled-substance permissions are reviewed periodically, with the review's results exposed through the Reporting module. A role that has been granted controlled-substance permissions but has not used them in a defined period is flagged for review, ensuring that permissions do not accumulate unused. The review is the operational expression of the platform's least-privilege posture and is non-negotiable for controlled substances.

---

## 15. Reports

### 15.1 Report Categories

The Inventory module produces and contributes to reports in the three categories defined by SYSTEM_ARCHITECTURE Section 28.2: Operational, Analytical, and Regulatory. The table below summarizes the reports in each category.

| Category | Examples |
|---|---|
| Operational | Current stock state by location; pending purchase orders; pending receipts; expiry alerts; reorder alerts; stock-take status. |
| Analytical | Stock-consumption trends; supplier-performance trends; stockout-incident trends; valuation-method impact; ABC-distribution trends. |
| Regulatory | Controlled-substance handling reports; recall reports; supply-chain integrity reports; expired-stock disposal reports. |

### 15.2 Operational Reporting

Operational reporting supports daily inventory operations. Reports are generated from the transactional store, with minimal latency between data change and report availability. Operational reports are tenant-scoped and respect the organizational hierarchy: a pharmacist sees reports for their dispensing location; a facility administrator sees reports for their facility; an executive sees aggregate reports for the tenant. Permission scoping is enforced at the reporting layer per SYSTEM_ARCHITECTURE Section 28.3.

Operational reports are typically consumed through the Reporting module's dashboard surface, with the inventory manager's dashboard surfacing the metrics that matter to daily operations: current stock state, pending orders, expiry alerts, reorder alerts, stock-take status. The dashboard is configurable: the manager can compose a dashboard from the widget library, with the widgets selected and arranged per the manager's preferences. The dashboard's configuration is part of the user-layer configuration (L7) and is versioned and auditable per the platform's configuration strategy.

### 15.3 Analytical and Regulatory Reporting

Analytical reporting supports trend analysis and decision support. Reports are generated from the analytical store, which is populated from the transactional store through an ETL pipeline per SYSTEM_ARCHITECTURE Section 28.4. Analytical reports support procurement-strategy decisions: which suppliers to consolidate, which stock items to reorder more aggressively, which locations to rebalance. The analytical store is optimized for query performance, with denormalized data structures and pre-computed aggregates.

Regulatory reporting supports compliance with regulatory requirements. Reports are generated from the audit store and the transactional store, with the report format defined by the regulatory framework per SYSTEM_ARCHITECTURE Section 28.5. Regulatory reports are immutable once generated: a regulatory report that has been submitted to a regulator cannot be modified, even if subsequent data changes would produce a different report. The immutability is a compliance requirement and is enforced at the reporting layer. Regulatory-report generation is auditable, with the audit record capturing the report, the parameters, the data sources, and the submission.

### 15.4 Report Distribution and Subscription

Report distribution is governed by the report definition, per SYSTEM_ARCHITECTURE Section 28.7. Distribution mechanisms include on-demand, scheduled, event-driven, and subscription. Inventory reports commonly use scheduled distribution — for example, a weekly stock-state report delivered to the procurement team every Monday — and subscription distribution — for example, a monthly valuation report subscribed to by the CFO. Distribution is auditable and permission-governed.

---

## 16. API Surface

### 16.1 Contract Surface Overview

This section documents the Inventory module's contract surface — the set of commands, queries, events, and configuration schemas through which other modules interact with the Inventory module. Per MODULE_ARCHITECTURE Section 4.1, the contract surface is the module's only public interface; internals are private. Per the metadata table at the head of this document, specific API endpoint specifications are out of scope for this reference and are governed by the platform's integration documentation. The categories below are the structural commitments; specific endpoints are documented elsewhere.

### 16.2 Commands, Queries, and Events

The Inventory module exposes commands for state-changing operations, queries for state-reading operations, and events for state-change notifications. The table below summarizes the surface.

| Contract Type | Examples |
|---|---|
| Commands | Receive stock; transfer stock; dispense stock; return stock; adjust stock; dispose stock; create purchase order; approve purchase order; dispatch purchase order; close purchase order; create supplier; activate supplier; initiate stock take; record stock-take count; record adjustment; initiate recall. |
| Queries | Get stock item by identifier; list stock items in scope; get stock state by location; list pending purchase orders; get supplier by identifier; list suppliers in scope; get stock-take status; get valuation by stock item; get ABC classification; trace lot; list expiring stock. |
| Events | Stock received; stock transferred; stock dispensed; stock returned; stock adjusted; stock disposed; purchase order created; purchase order approved; purchase order dispatched; purchase order received; supplier created; supplier activated; stock take initiated; adjustment recorded; recall initiated. |
| Configuration Schemas | Reorder-rule schema; valuation-method schema; expiry-threshold schema; location-hierarchy schema; controlled-substance-rule schema; ABC-classification schema. |

### 16.3 Contract Versioning and Deprecation

Contract versioning follows the platform's semantic-versioning policy per MODULE_ARCHITECTURE Section 8.1. Major versions indicate breaking changes; minor versions indicate backward-compatible additions; patch versions indicate backward-compatible fixes. A breaking change is announced with adequate lead time, with the previous contract version supported through a defined deprecation window. Consumers are migrated at their own pace within the window, with the migration tracked through the module's health metrics.

Contract deprecation is governed by the platform's deprecation policy per MODULE_ARCHITECTURE Section 8.3. A deprecated contract is supported through its deprecation window, after which it is removed. The removal is recorded in the platform's CHANGELOG, with an explicit version increment. A consumer that has not migrated by the end of the deprecation window experiences a contract failure, which is the consumer's defect.

---

## 17. Future Enhancements

### 17.1 Module Lifecycle Outlook

The Inventory module is at General Availability (LC3) per MODULE_ARCHITECTURE Section 6.1 and is on track to transition to Mature (LC4) after a defined period of stable operation. The transition is automatic per PRODUCT_BIBLE Section 19.5. No deprecation is anticipated; the inventory-management domain is enduring, and the module's bounded context is stable per Principle P8. Module evolution occurs through contract versioning, capability addition through extension points, and configuration-surface expansion.

### 17.2 Extension Points

The Inventory module exposes extension points per MODULE_ARCHITECTURE Section 9 that allow capability to be added without source modification. The table below summarizes the extension-point categories relevant to the Inventory module.

| Extension Point Category | Examples |
|---|---|
| Integration adapters | Adapters for supplier EDI variants, logistics-provider APIs, regulatory portals, barcode/RFID systems, cold-chain monitors. |
| Configuration-driven rules | Customer-specific valuation methods, reorder rules, expiry-threshold rules. |
| Document templates | Customer-specific purchase-order templates, stock-take report templates, recall-notification templates. |
| Report templates | Customer-specific operational, analytical, and regulatory report layouts. |
| Workflow definitions | Customer-specific procurement, dispensation, recall, and stock-take workflows. |

Extensions are first-class architectural concerns with their own contracts, validation, and lifecycle per MODULE_ARCHITECTURE Section 9.3. An extension that requires source modification of the Inventory module is, by definition, customization, and is rejected by Principle P2. Extensions are sandboxed per MODULE_ARCHITECTURE Section 9.4, with the sandbox dimensions enforced.

### 17.3 Anticipated Capability Evolution

Capability evolution is anticipated in several areas. Predictive demand forecasting — using historical consumption data to forecast future demand — is a candidate for addition through the extension surface, with the forecasting consuming inventory events and producing predictions that drive reorder rules. AI-assisted stock-take variance investigation — using historical variance data to suggest root causes for significant adjustments — is a candidate for addition through the extension surface, with the AI service consuming variance events and producing suggestions that are reviewed by human investigators.

Regulatory evolution is anticipated as new jurisdictions adopt supply-chain integrity requirements (e.g., track-and-trace requirements for medications, cold-chain documentation requirements for biological products). The module's configuration surface is designed to accommodate these through configuration rather than code change; where a new requirement cannot be expressed through existing configuration, the configuration surface is extended through the standard amendment process. The module's regional adaptation posture honours Principle P17 (Regional Adaptation Without Forking): the same platform serves all regions, with regional variation expressed through configuration.

### 17.4 Operational Considerations

Operational considerations for the Inventory module centre on three concerns. First, stock-state query performance: stock-state queries are issued at every dispensation and every stock movement, and the queries must be fast to avoid blocking clinical workflows. The module's stock-state read model is optimized for query performance, with the read model updated through event subscription to maintain eventual consistency. Second, audit-store volume: the module generates significant audit volume, especially in Ibn Hayan hospitals with high transaction rates. The Ibn Hayan audit store is sized accordingly, and audit-record retention is governed by the customer's compliance configuration. Third, integration reliability: the module's reliance on supplier EDI and logistics-provider integrations means that integration failures can disrupt procurement operations. The module's failure-isolation posture (MODULE_ARCHITECTURE Section 11.4) ensures that an integration failure degrades the module gracefully rather than cascading across the Ibn Hayan platform.

---

## 18. Related Documents

### 18.1 Canonical References

The Inventory module is governed by the following canonical references, which prevail over this document in case of conflict per the metadata table at the head of this document.

| Document | Relationship |
|---|---|
| `PRODUCT_BIBLE.md` | Defines product principles, edition packaging, clinic types, module overview (Section 19). |
| `SYSTEM_ARCHITECTURE.md` | Defines architectural principles, bounded contexts (Section 7), the documented deviation for inventory within Pharmacy (Section 7.7), configuration strategy (Section 15), workflow engine (Section 16), audit architecture (Section 27), reporting architecture (Section 28). |
| `MODULE_ARCHITECTURE.md` | Defines module architecture: catalogue, boundaries, contracts, dependencies, lifecycle, communication, versioning, extension points, configuration surface, isolation, testing, governance. |
| `CONFIGURATION_ARCHITECTURE.md` | Defines configuration internals: layer model, validation, versioning, audit, sandbox, hot-reload. |
| `SOFTWARE_ARCHITECTURE.md` | Defines implementation-grade architecture: layering, deployment, technology posture. |

### 18.2 Peer Module References

The Inventory module collaborates with the following peer modules. Each peer module's documentation provides the peer's contract surface, configuration surface, and integration posture.

| Peer Module | Collaboration |
|---|---|
| Pharmacy | Medication stock state; dispensation events; controlled-substance tracking; shared domain model per SA Section 7.7. |
| Billing | Stock-consumption events for cost-of-goods attribution. |
| Accounting | Stock-valuation events for inventory-asset accounting; purchase-order events for accounts-payable. |
| Documents | Purchase-order storage; supplier-contract storage; stock-take report storage. |
| Notifications | Reorder alerts; expiry alerts; recall notifications; stock-take reminders. |
| Audit | Audit-event recording for all consequential stock actions. |
| Reporting | Inventory data for operational, analytical, and regulatory reports. |
| Configuration | Layered configuration resolution for inventory configuration keys. |
| Identity & Access | Role-based access to inventory operations. |
| Localization | Locale-specific units of measure, terminology, formatting. |
| Integration | Integration with supplier EDI, logistics providers, regulatory portals, barcode/RFID, cold-chain monitors. |

### 18.3 Downstream References

The Inventory module's contract surface, configuration surface, and integration surface are elaborated in downstream documentation, including per-module specifications, integration contracts, and operational runbooks. Those downstream documents are subordinate to this document and to the canonical references above; conflicts are resolved in favour of the canonical references, then this document, then the downstream document. Downstream documents are amended through the standard change process when this document or a canonical reference is amended.
