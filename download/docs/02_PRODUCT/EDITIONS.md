# Ibn Hayan Healthcare Operating System — Editions

| Field | Value |
|---|---|
| Document Title | Editions |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Product Elaboration — Edition Catalogue |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when an edition amendment is ratified |
| Audience | Product leadership, commercial leadership, customer-facing teams, implementation consultants, customers evaluating Ibn Hayan, finance partners |
| Scope | Edition catalogue, edition composition rules, per-edition purpose and scope, module availability, tenant and facility limits, storage and compute allocation, service tiers, pricing principles, upgrade and downgrade paths, edition governance, side-by-side comparison |
| Out of Scope | Implementation details, source code, deployment topology, vendor selection, per-customer negotiated pricing, marketing collateral, sales playbooks |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. Edition definitions in this document elaborate Section 16 of PRODUCT_BIBLE and do not override the edition composition rules stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (stub with section placeholders only) |

---

## Table of Contents

1. Edition Overview
2. Edition Strategy
3. Trial Edition (E0)
4. Essential Edition (E1)
5. Professional Edition (E2)
6. Enterprise Edition (E3)
7. Edition Comparison Matrix
8. Edition Upgrade Path
9. Edition Pricing Model
10. Edition Limitations & Quotas
11. Edition Customization
12. Related Documents

---

## 1. Edition Overview

### 1.1 What an Edition Is

An edition is a commercially packaged scope of enablement of the Ibn Hayan platform. Editions are not separate products and do not fork the code base; every edition runs the same runtime, the same configuration model, and the same operational surface as defined in `SYSTEM_ARCHITECTURE.md` Section 9 (Modular Architecture). What changes between editions is which modules are enabled by default, how much configuration depth is exposed out of the box, the size of the operational envelope (users, facilities, storage), and the service-level commitment backing the tenant. This packaging posture is the direct operational expression of Principle P-3 (One Platform, Many Organizations) and Differentiator 6 (Accessible Across Tiers), both stated in `PRODUCT_BIBLE.md` Section 16.

### 1.2 The Four-Edition Catalogue

The Ibn Hayan platform is packaged into four editions, codified in `PRODUCT_BIBLE.md` Section 16.2. The catalogue is stable; editions are not added or removed casually, and any change to the catalogue is recorded through the amendment mechanism defined in the document header. The four editions are listed below and elaborated in dedicated sections of this document.

| Code | Edition | Target Customer Tier | Default Module Scope | Service Tier |
|---|---|---|---|---|
| E0 | Trial | Prospects evaluating Ibn Hayan | Subset of Essential | Limited; no SLA |
| E1 | Essential | T1 (Solo) and T2 (Small Practice) | Core clinical and operational modules | Standard; business-hours SLA |
| E2 | Professional | T3 (Mid Practice) and T4 (Large Practice) | Essential modules plus advanced clinical, financial, and administrative | Enhanced; extended-hours SLA |
| E3 | Enterprise | T5 (Hospital) and T6 (Hospital Network) | Full module set | Premium; 24/7 SLA |

### 1.3 Editions versus Other Product Constructs

Editions interact with but are distinct from modules, configurations, and clinic type overlays. Modules are the unit of capability (see `MODULES.md`); editions determine which modules are enabled by default. Configuration layers (L1–L8, see `SYSTEM_ARCHITECTURE.md` Section 15.2) determine runtime behaviour; the edition layer (L2) is one of eight layers and not the dominant one. Clinic type overlays (see `CLINIC_TYPES.md` and `SYSTEM_ARCHITECTURE.md` Section 12.3) adjust encounter templates, order sets, and documentation structure; overlays are available in all editions and are not edition-gated. The clean separation between these constructs is what allows Ibn Hayan to offer editions without forking the product.

### 1.4 Edition Reading Order

This document is organized to be read both linearly and as a reference. Readers evaluating Ibn Hayan should read Sections 1, 2, 7, and 9 to understand the catalogue, strategy, comparison, and pricing posture. Readers implementing an edition for a customer should read the per-edition sections (3 through 6) in detail. Readers governing edition lifecycle should read Sections 8, 10, and 11. Section 12 lists the upstream and downstream documents that this catalogue references and that elaborate edition-specific concerns.

---

## 2. Edition Strategy

### 2.1 Strategic Intent of Edition Packaging

Edition packaging exists to make Ibn Hayan commercially viable across the full customer size spectrum described in `PRODUCT_BIBLE.md` Section 9 (Target Customers) without compromising platform coherence. A solo practitioner (T1) and a hospital network (T6) operate on fundamentally different commercial and operational footings; a single undifferentiated offering would either price Ibn Hayan out of the small-practice market or under-serve the hospital network. Editions resolve this tension by varying scope, scale, and service commitment while preserving architectural identity. The strategy aligns with Differentiator 10 (Transparent Pricing) and Differentiator 6 (Accessible Across Tiers), both enumerated in `PRODUCT_BIBLE.md` Section 13.

### 2.2 Edition Composition Rules

Edition composition is governed by the rules stated in `PRODUCT_BIBLE.md` Section 16.7. These rules are normative; deviations are defects and are corrected through the amendment mechanism, not through per-customer exception.

| Rule | Description |
|---|---|
| Single code base | All editions run the same code; editions differ only in configuration |
| Module enablement | Editions differ in which modules are enabled by default |
| Configuration depth | Editions differ in default configuration depth, not in configuration surface availability |
| Service tier | Editions differ in service-level commitment, not in platform quality |
| No feature forks | No edition has a feature that is structurally unavailable to other editions |
| Upgrade path | Customers can upgrade between editions without re-implementation |

### 2.3 Editions and Customer Maturity

Editions align with the customer size tier system defined in `PRODUCT_BIBLE.md` Section 9. The alignment is descriptive, not prescriptive; a customer may select an edition above or below their tier's typical match when their operational reality justifies it. The typical alignment is: T1 and T2 customers run Essential; T3 and T4 customers run Professional; T5 and T6 customers run Enterprise. Trial is the evaluation entry point regardless of tier, with the understanding that the trial tenant is decommissioned if no paid edition is activated within the trial window.

### 2.4 Edition Lifecycle

Editions have a lifecycle that mirrors the platform's broader product lifecycle but is more conservative. An edition is introduced only when a coherent customer segment emerges that the existing editions do not serve, and only after a validated configuration profile is produced through the intake process defined in `PRODUCT_BIBLE.md` Section 17.4. An edition is deprecated only with multi-year transition support for affected customers; the deprecation cannot strand customers in a posture that violates Principle P-1 (Healthcare First). Edition deprecation events are recorded in the platform CHANGELOG and communicated to affected customers with documented transition timelines.

### 2.5 Edition Strategy Alignment

The edition strategy aligns with the product principles as enumerated in `PRODUCT_BIBLE.md` Section 16.8. The alignment is summarized below for convenience, with the underlying principle text authoritative in `PRODUCT_BIBLE.md`.

| Principle | Edition Strategy Consequence |
|---|---|
| P-3 (One Platform, Many Organizations) | Editions are configuration of one product, not separate products |
| D-5 (Enterprise Scalability) | Editions scale across the customer spectrum without architectural change |
| Differentiator 6 (Accessible Across Tiers) | Essential edition makes Ibn Hayan viable at T1 and T2 |
| Differentiator 10 (Transparent Pricing) | Edition pricing is published, not negotiated |

---

## 3. Trial Edition (E0)

### 3.1 Purpose

The Trial edition is a non-production evaluation offering designed for prospects assessing Ibn Hayan against their operational reality. It is not a free tier and is not intended for any production use. The Trial edition exists to give prospect organizations — typically the implementation lead, the clinical lead, and the finance lead on the prospect side — a concrete environment in which to validate that Ibn Hayan's configuration surface can express their daily workflows. Per `PRODUCT_BIBLE.md` Section 16.3, the Trial edition is time-bounded; prospects either convert to a paid edition within the trial window or the trial tenant is decommissioned.

### 3.2 Target Customer

The Trial edition is targeted at prospect organizations of any size tier (T1 through T6) that are actively evaluating Ibn Hayan. The typical trial participant is a practice manager, a clinical lead, or a system administrator designated as the prospect's evaluation owner. Trial tenants are not provisioned for individuals evaluating Ibn Hayan for personal interest; a trial requires a sponsoring organization and a documented evaluation plan. The trial is structured, not open-ended; Ibn Hayan customer success engages with the prospect during the trial to ensure the evaluation produces a decision-grade outcome.

### 3.3 Feature Scope and Module Availability

The Trial edition provides access to a subset of Essential edition modules. The subset is selected to enable evaluation of the platform's core clinical and operational surface: Patient (M01), Encounter (M02), Clinical Documentation (M03), Orders & Results (M04), Scheduling (M06), and a read-only view of Reporting (M18). Modules that require external integrations, that touch financial systems, or that involve pharmacy dispensing are not enabled in the Trial edition, because enabling them in a non-production environment without validated configuration would produce misleading evaluation results. The module list is documented in the trial onboarding guide and is versioned alongside the platform.

### 3.4 Limits and Operational Envelope

The Trial edition operates under explicit limits designed to bound operational cost while preserving evaluation fidelity. The limits are stated in the table below and are enforced at the platform layer; exceeding a limit does not produce a billing event — it produces a clear message directing the prospect to convert to a paid edition.

| Limit Type | Trial Edition Value |
|---|---|
| Maximum users | 5 |
| Maximum facilities | 1 |
| Maximum patients registered | 100 |
| Maximum encounters per month | 200 |
| Maximum stored documents | 500 |
| Maximum active integrations | 0 |
| Maximum retention after trial end | 30 days, then decommissioned |
| SLA commitment | None |

### 3.5 Storage, Compute, and Support

The Trial edition runs on shared infrastructure with no dedicated compute allocation. Storage is capped at the limits stated in Section 3.4 and is not expandable through configuration. Support is limited to documentation, the knowledge base, and a single escalation channel for trial-blocking issues; the trial does not include implementation consulting, configuration review, or training credits. The intent of the Trial edition is evaluation, not operation; the support posture reflects that intent.

### 3.6 Upgrade Path

Trial-to-paid conversion is the only supported transition from Trial. The conversion preserves all configuration applied during the trial and all data entered during the trial, provided the target edition supports the modules in use. The conversion is initiated by the prospect and ratified by Ibn Hayan commercial operations; once ratified, the trial tenant is promoted to the target edition's tenant lifecycle stage TL2 (Onboarding) per `SYSTEM_ARCHITECTURE.md` Section 10.4. A trial that is not converted within the trial window is decommissioned; the prospect's data is exported to a portable format and delivered to the prospect before decommissioning, in keeping with Principle P-4 (Open Data, Open Standards).

---

## 4. Essential Edition (E1)

### 4.1 Purpose

The Essential edition is the entry-level production edition of Ibn Hayan, designed for solo practitioners and small practices. It provides the core clinical and operational modules required for primary care practice in a configuration that is conservative by default, in keeping with the typical maturity profile of T1 and T2 customers described in `PRODUCT_BIBLE.md` Section 16.4. The Essential edition is the platform's volume offering; it is priced to be accessible, onboarded primarily through self-service where the customer's maturity permits, and supported through a standard business-hours service tier.

### 4.2 Target Customer

The Essential edition targets T1 (Solo) and T2 (Small Practice) customers as defined in `PRODUCT_BIBLE.md` Section 9. Typical customers include solo practitioner clinics, single-specialty small practices, and small multi-specialty practices operating from a single facility. The edition is also appropriate for early-stage multi-location practices that have not yet reached the operational complexity that justifies the Professional edition. Customers in T3 may run Essential during a transition period but are expected to migrate to Professional as their facility count, user count, or module needs grow.

### 4.3 Feature Scope and Module Availability

The Essential edition enables the core clinical modules (M01 Patient, M02 Encounter, M03 Clinical Documentation, M04 Orders & Results, M05 Pharmacy in its basic dispensing configuration), the core operational modules (M06 Scheduling, M07 Documents, M08 Notifications), the Billing module (M09) in its basic configuration, and the platform modules (M14 Identity & Access, M15 Configuration, M16 Audit, M17 Integration, M18 Reporting, M19 Localization). Advanced financial modules (M10 Accounting), administrative modules (M11 CRM, M12 HR, M13 Workforce), and specialty-specific extensions are not enabled by default but can be added when the customer's needs require them. The default configuration depth is conservative, exposing only the configuration surface needed for typical primary care workflows; the full configuration surface remains available for customers that require deeper adaptation.

### 4.4 Limits and Operational Envelope

The Essential edition's operational envelope is sized for solo and small-practice operations. Limits are enforced at the platform layer and are visible in the tenant administration surface; exceeding a limit produces a notification, not a service interruption.

| Limit Type | Essential Edition Value |
|---|---|
| Maximum users | 25 |
| Maximum facilities | 3 |
| Maximum departments per facility | 5 |
| Maximum active clinic type overlays | 5 |
| Maximum stored patients | 25,000 |
| Maximum concurrent integrations | 3 |
| Maximum stored documents | 250,000 |
| SLA commitment | Business hours, 99.5% target uptime |

### 4.5 Storage, Compute, and Support

The Essential edition runs on shared multi-tenant infrastructure at isolation level IL1 (Logical) per `SYSTEM_ARCHITECTURE.md` Section 10.2. Storage allocation is sufficient for the operational envelope stated above, with archival of cold data governed by the platform's data lifecycle policy. Compute is shared across tenants with rate limiting per tenant to preserve operational isolation as defined in `PRODUCT_BIBLE.md` Section 23.6. Support is provided during business hours in the tenant's region, with the standard support tier including documentation, knowledge base, ticket-based support, and access to the platform's community resources.

### 4.6 Pricing Principles

The Essential edition is priced to be accessible and is published, not negotiated, in keeping with Differentiator 10 (Transparent Pricing). Pricing is per user per month with tiered volume discounts applied automatically as the customer's user count grows. Optional modules are priced separately, allowing customers to compose their edition scope without paying for capabilities they do not use. The pricing structure is documented in the commercial catalogue and is the same for all customers at the same tier; Ibn Hayan does not offer per-customer negotiated pricing for the Essential edition.

### 4.7 Upgrade and Downgrade Paths

Customers on Essential can upgrade to Professional without re-implementation; the upgrade is a configuration change that enables additional modules, expands the operational envelope, and updates the service tier. The upgrade is initiated by the customer and ratified by Ibn Hayan commercial operations. Downgrade from Professional to Essential is supported but constrained; modules not available in Essential must be disabled and their data either archived or migrated, with the customer acknowledging the data handling implications in writing before the downgrade is executed. Downgrade events are auditable and are governed by the same change-management process as configuration changes.

---

## 5. Professional Edition (E2)

### 5.1 Purpose

The Professional edition is Ibn Hayan's core commercial offering, designed for mid and large practices that have outgrown the Essential edition's scope but do not require the Enterprise edition's scale. Per `PRODUCT_BIBLE.md` Section 16.5, the Professional edition includes the Essential modules plus advanced clinical modules (specialty-specific extensions), advanced financial modules (Accounting, advanced Billing), and administrative modules (CRM, HR, Workforce). Configuration depth is fuller than Essential, and the edition supports multi-facility operation within a single tenant. The Professional edition is the typical entry point for T3 and T4 customers.

### 5.2 Target Customer

The Professional edition targets T3 (Mid Practice) and T4 (Large Practice) customers. Typical customers include multi-specialty group practices, single-specialty practices with multiple locations, diagnostic centres, and specialty clinics operating with significant patient volume. The edition is also appropriate for the operational subsidiaries of larger healthcare organizations — for example, a hospital network's outpatient clinic division may run Professional while the parent organization runs Enterprise. Customers typically arrive at Professional either through direct purchase or through upgrade from Essential as their operational complexity grows.

### 5.3 Feature Scope and Module Availability

The Professional edition enables all Essential modules plus the advanced financial and administrative modules. The full module set enabled by default is: M01 through M19 inclusive, with specialty-specific extensions enabled based on the customer's clinic type profile. The default configuration depth is fuller than Essential, exposing the configuration surface needed for multi-facility operation, multi-specialty workflows, and integrated financial operations. The platform modules (M14–M19) are fully exposed, allowing the customer's system administrator to define custom roles, custom workflows, and custom integrations within the configuration framework. Specialty-specific module extensions are available based on the clinic types in operation at the customer's facilities.

### 5.4 Limits and Operational Envelope

The Professional edition's operational envelope is sized for mid and large practice operations. Limits are stated in the table below and are enforced at the platform layer.

| Limit Type | Professional Edition Value |
|---|---|
| Maximum users | 250 |
| Maximum facilities | 25 |
| Maximum departments per facility | 20 |
| Maximum active clinic type overlays | 30 |
| Maximum stored patients | 500,000 |
| Maximum concurrent integrations | 25 |
| Maximum stored documents | 5,000,000 |
| SLA commitment | Extended hours, 99.9% target uptime |

### 5.5 Storage, Compute, and Support

The Professional edition runs on shared multi-tenant infrastructure at isolation level IL1 (Logical) by default, with isolation level IL2 (Logical with Dedicated Compute) available as a deployment choice for customers with specific performance or compliance needs per `SYSTEM_ARCHITECTURE.md` Section 10.2. Storage allocation is sized for the operational envelope, with tiered storage for cold data and configurable retention policies. Support is provided during extended hours in the tenant's region, with the enhanced support tier including documentation, knowledge base, ticket-based support with defined response times, access to a named customer success contact, and access to implementation consulting credits that can be applied to configuration review or training engagements.

### 5.6 Pricing Principles

The Professional edition is priced per user per month with tiered volume discounts, plus per-module pricing for specialty-specific extensions and per-facility pricing for additional facilities beyond the default allocation. Pricing is published in the commercial catalogue and is the same for all customers at the same tier. Implementation consulting is offered as a separate engagement, scoped based on the customer's complexity profile and operational maturity. The Professional edition's pricing structure is designed to be predictable; a customer should be able to forecast their annual cost based on their user count, facility count, and module selection without per-customer negotiation.

### 5.7 Upgrade and Downgrade Paths

Customers on Professional can upgrade to Enterprise without re-implementation; the upgrade enables the full module set, expands the operational envelope to enterprise scale, updates the service tier to premium 24/7, and may transition the customer to a higher isolation level if their contract requires it. Downgrade from Enterprise to Professional is supported but constrained by the same module and data handling considerations as the Essential-to-Professional downgrade. Customers who outgrow Professional are typically identified through the platform's operational telemetry; the customer success team engages proactively to plan the upgrade before the customer experiences operational friction.

---

## 6. Enterprise Edition (E3)

### 6.1 Purpose

The Enterprise edition is the top of the Ibn Hayan edition catalogue, designed for hospitals and hospital networks. Per `PRODUCT_BIBLE.md` Section 16.6, the Enterprise edition includes the full module set, full configuration depth, multi-facility and multi-region operation, dedicated support, and premium service-level commitments. The edition supports the operational rigour required by large healthcare organizations, including advanced audit, advanced security, and advanced integration capabilities. The Enterprise edition is priced for the operational commitment it represents; it is not a customization vehicle, and customers at this edition receive the same platform as customers at other editions, with broader module enablement and deeper service commitments.

### 6.2 Target Customer

The Enterprise edition targets T5 (Hospital) and T6 (Hospital Network) customers as defined in `PRODUCT_BIBLE.md` Section 9. Typical customers include standalone hospitals with emergency, inpatient, and outpatient services; hospital networks operating across regions; academic medical centres with teaching and research affiliations; and government health authorities operating multiple facilities. The Enterprise edition is also appropriate for very large non-hospital organizations — for example, a national pharmacy chain or a national diagnostic network — when their scale and operational complexity justify the edition's commitments.

### 6.3 Feature Scope and Module Availability

The Enterprise edition enables the full module catalogue M01 through M19, including all specialty-specific extensions, with no module disabled by default. The full configuration surface is exposed at every layer L1 through L8, allowing the customer's system administrator to perform deep adaptation within the configuration framework. Multi-region operation is supported, with regional data residency enforced per `SYSTEM_ARCHITECTURE.md` Section 10.6 and per-facility configuration overlays for regional regulatory variation. The platform's advanced audit and security capabilities are fully enabled, including segregation-of-duty enforcement, advanced threat detection, and immutable audit trail retention aligned to the customer's regulatory framework.

### 6.4 Limits and Operational Envelope

The Enterprise edition's operational envelope is sized for hospital and hospital network operations. Limits are stated in the table below and are designed to accommodate the largest customers Ibn Hayan serves; exceeding a limit triggers a capacity-planning engagement, not a service interruption.

| Limit Type | Enterprise Edition Value |
|---|---|
| Maximum users | Unlimited (subject to capacity planning) |
| Maximum facilities | Unlimited (subject to capacity planning) |
| Maximum departments per facility | Unlimited |
| Maximum active clinic type overlays | Full catalogue (30 types) |
| Maximum stored patients | Unlimited (subject to capacity planning) |
| Maximum concurrent integrations | Unlimited (subject to capacity planning) |
| Maximum stored documents | Unlimited (subject to capacity planning) |
| SLA commitment | 24/7, 99.95% target uptime with documented RTO/RPO |

### 6.5 Storage, Compute, and Support

The Enterprise edition supports all three isolation levels per `SYSTEM_ARCHITECTURE.md` Section 10.2: IL1 (Logical) for cost-optimized deployments, IL2 (Logical with Dedicated Compute) for performance-sensitive deployments, and IL3 (Physical) for customers with regulatory or contractual physical-separation requirements. Storage allocation is provisioned based on the customer's capacity plan, with regional residency, tiered storage, and configurable retention. Compute is provisioned based on the customer's peak-load profile, with documented scaling behaviour under extreme load per `PRODUCT_BIBLE.md` Section 24.3. Support is provided 24/7 with the premium support tier, including documentation, knowledge base, ticket-based support with strict response times, a named customer success manager, a named technical account manager, quarterly business reviews, and access to senior implementation consulting resources.

### 6.6 Pricing Principles

The Enterprise edition is priced based on a combination of user count, facility count, and module scope, with multi-year commitments offering discounted rates. Pricing for the Enterprise edition is published as a rate card in the commercial catalogue; specific customer pricing is derived from the rate card based on the customer's configuration, not negotiated per customer from a blank slate. Implementation consulting is offered as a separate engagement scoped to the customer's deployment complexity. The Enterprise edition's pricing structure is designed to align Ibn Hayan's commercial interests with the customer's operational success; the customer's cost grows as their usage grows, and Ibn Hayan's revenue grows as the customer's platform adoption deepens.

### 6.7 Upgrade and Downgrade Paths

The Enterprise edition is the top of the catalogue; there is no edition above it. Customers whose operational needs exceed the Enterprise edition's commitments engage with Ibn Hayan through a custom engagement process that adds services (additional regions, dedicated infrastructure, custom integrations) without creating a new edition. Downgrade from Enterprise to Professional is supported but operationally significant; the customer's facility count, user count, and module scope must fit within the Professional edition's limits, and the customer must acknowledge the service tier reduction in writing. Downgrade events are rare and are governed by an explicit transition plan with a documented timeline.

---

## 7. Edition Comparison Matrix

### 7.1 Side-by-Side Comparison

The matrix below compares the four editions across the dimensions that matter for edition selection. The matrix is the canonical side-by-side reference; per-edition detail is in Sections 3 through 6. Where a cell reads "Per capacity plan", the value is provisioned based on the customer's documented operational profile and is not fixed at the edition level.

| Dimension | Trial (E0) | Essential (E1) | Professional (E2) | Enterprise (E3) |
|---|---|---|---|---|
| Edition code | E0 | E1 | E2 | E3 |
| Target customer tier | Prospects | T1, T2 | T3, T4 | T5, T6 |
| Production use permitted | No | Yes | Yes | Yes |
| Default module scope | Subset of Essential | Core clinical + operational + basic Billing | Essential + advanced clinical, financial, administrative | Full catalogue |
| Specialty-specific extensions | Not available | Add-on | Add-on | Enabled by default |
| Maximum users | 5 | 25 | 250 | Unlimited (capacity plan) |
| Maximum facilities | 1 | 3 | 25 | Unlimited (capacity plan) |
| Maximum stored patients | 100 | 25,000 | 500,000 | Unlimited (capacity plan) |
| Maximum concurrent integrations | 0 | 3 | 25 | Unlimited (capacity plan) |
| Maximum stored documents | 500 | 250,000 | 5,000,000 | Unlimited (capacity plan) |
| Multi-facility operation | No | Limited | Yes | Yes, multi-region |
| Multi-region operation | No | No | No | Yes |
| Configuration surface exposure | Subset | Standard | Full | Full, all layers |
| Custom roles | No | Yes (within framework) | Yes (within framework) | Yes (within framework) |
| Custom workflows | No | Limited | Yes | Yes, advanced |
| Isolation level options | IL1 only | IL1 | IL1, IL2 | IL1, IL2, IL3 |
| Regional data residency | Single region | Single region | Single region | Multi-region |
| Support tier | Limited | Standard (business hours) | Enhanced (extended hours) | Premium (24/7) |
| SLA commitment | None | 99.5% target uptime | 99.9% target uptime | 99.95% target uptime with RTO/RPO |
| Implementation consulting | Not included | Optional, separate engagement | Optional, separate engagement | Included in deployment, additional available |
| Customer success contact | Single escalation channel | Shared pool | Named contact | Named CSM + named TAM |
| Quarterly business review | No | No | Yes | Yes |
| Pricing model | Free during trial window | Per user per month, published | Per user + per facility + per module, published | Rate card, derived per customer |
| Pricing publication | Internal | Published catalogue | Published catalogue | Published rate card |
| Trial-to-paid conversion | N/A (this is the trial) | Yes, preserves data | Yes, preserves data | Yes, preserves data |
| Decommissioning support | 30-day retention, then export | Standard retention policy | Standard retention policy | Custom retention per contract |

### 7.2 Comparison Reading Guide

The matrix is dense by design; each row is a decision input. Customers evaluating editions should focus first on the dimensions that reflect their operational reality: target customer tier, maximum users, maximum facilities, and SLA commitment. Customers evaluating editions for a future state should focus on the dimensions that reflect their growth trajectory: maximum stored patients, multi-region operation, and isolation level options. Customers evaluating editions for compliance reasons should focus on regional data residency, audit capabilities, and isolation level options. Ibn Hayan customer success teams are trained to walk customers through the matrix and to identify the dimensions most relevant to the customer's context.

### 7.3 Comparison Limitations

The matrix captures the most consequential edition differences but is not exhaustive. Dimensions not captured include the depth of advanced audit, the breadth of integration connectors, the granularity of reporting, and the maturity of specialty-specific module extensions. These dimensions are documented in their respective documents: `MODULES.md` for module catalogue, `PERMISSIONS.md` for permission granularity, `WORKFLOWS.md` for workflow engine, and the integration documentation for connector breadth. The matrix is the starting point for edition selection, not the ending point; final edition selection should be informed by the customer's full operational profile.

---

## 8. Edition Upgrade Path

### 8.1 Upgrade Philosophy

Edition upgrades in Ibn Hayan are non-reimplementative by design. A customer upgrading from Essential to Professional, or from Professional to Enterprise, does not re-implement their tenant, does not migrate their data, and does not retrain their users on a different product. The upgrade is a configuration change that enables additional modules, expands the operational envelope, and updates the service tier, executed within the tenant lifecycle defined in `SYSTEM_ARCHITECTURE.md` Section 10.4. This posture is a direct consequence of Principle P-3 (One Platform, Many Organizations) and is stated as an edition composition rule in `PRODUCT_BIBLE.md` Section 16.7.

### 8.2 Upgrade Trigger Conditions

Upgrades are triggered by the customer or by Ibn Hayan customer success in response to operational signals. Typical triggers include the customer approaching the user limit of their current edition, the customer adding facilities beyond their edition's facility limit, the customer requiring modules not enabled in their current edition, and the customer requiring a higher service tier due to operational changes. Ibn Hayan customer success monitors the platform's operational telemetry to identify customers approaching limits and engages proactively to plan upgrades before the customer experiences operational friction.

### 8.3 Upgrade Process

The upgrade process is structured into the following stages, each governed by documented criteria and recorded in the platform's audit trail. The process is the same for Essential-to-Professional and Professional-to-Enterprise upgrades, with stage durations scaled to the customer's complexity.

| Stage | Code | Description |
|---|---|---|
| Upgrade request | U1 | Customer or customer success initiates the upgrade request |
| Scope confirmation | U2 | Customer and Ibn Hayan confirm the modules to be enabled and the operational envelope to be applied |
| Commercial ratification | U3 | Commercial operations ratifies the upgrade and updates the customer's subscription |
| Configuration preparation | U4 | Configuration changes prepared in sandbox, validated, and approved |
| Upgrade execution | U5 | Configuration applied to the production tenant; modules enabled; envelope expanded |
| Post-upgrade verification | U6 | Customer and Ibn Hayan verify that the upgrade produced the expected operational posture |
| Upgrade closure | U7 | Upgrade recorded as complete; tenant lifecycle stage updated |

### 8.4 Trial-to-Paid Conversion

Trial-to-paid conversion is a special case of upgrade with additional constraints. The conversion must occur within the trial window stated in the trial's terms. The conversion preserves all data and configuration applied during the trial, provided the target edition supports the modules in use. If the target edition does not support a module in use, the customer is informed and the unsupported module's data is exported before the conversion. The conversion is initiated by the prospect and ratified by Ibn Hayan commercial operations; once ratified, the trial tenant is promoted to the target edition's tenant lifecycle stage TL2 (Onboarding).

### 8.5 Upgrade Audit and Communication

Every upgrade event is auditable. The audit trail captures who initiated the upgrade, when, with what authorization, what configuration was applied, and what the post-upgrade posture is. Upgrade events are communicated to the customer's named contacts before, during, and after the upgrade, with communication cadence scaled to the customer's complexity. Customers are notified of upcoming module enablement, of operational envelope expansion, and of service tier changes. The communication is itself recorded in the audit trail, providing end-to-end accountability for the upgrade event.

---

## 9. Edition Pricing Model

### 9.1 Pricing Posture

Ibn Hayan's pricing posture is governed by Differentiator 10 (Transparent Pricing), stated in `PRODUCT_BIBLE.md` Section 13. Edition pricing is published, not negotiated per customer from a blank slate. The pricing structure is documented in the commercial catalogue and is the same for all customers at the same tier. This posture is a deliberate rejection of the opaque pricing model common in enterprise healthcare software; Ibn Hayan's position is that transparent pricing produces shorter sales cycles, better-aligned customer relationships, and a healthier long-term commercial posture for the platform.

### 9.2 Pricing Components

Edition pricing is composed of three components, combined to reflect the customer's operational profile. The combination is the same across editions; what changes between editions is the per-component rate and the inclusion of certain components in the base rate.

| Component | Description | Billed As |
|---|---|---|
| User subscription | Per user per month, with volume discounts at defined thresholds | Per user per month |
| Facility subscription | Per facility per month, applied to facilities beyond the edition's default allocation | Per facility per month |
| Module subscription | Per module per month, applied to modules beyond the edition's default scope | Per module per month |

### 9.3 Pricing Principles

The pricing model is governed by the following principles, each of which is a direct consequence of the product principles stated in `PRODUCT_BIBLE.md`. The principles are normative; deviations are corrected through the amendment mechanism.

| Principle | Pricing Consequence |
|---|---|
| Transparency (Differentiator 10) | Pricing is published in the commercial catalogue; no per-customer negotiation from a blank slate |
| Accessibility (Differentiator 6) | Essential edition pricing is set to be viable at T1 and T2 customer tiers |
| No feature forks (Section 16.7) | No edition has a feature that is structurally unavailable to other editions; pricing reflects scope, not capability |
| No data lock-in (Principle P-4) | Pricing does not include data export fees; data export is a tenant right, not a billable service |
| Configuration before customization (Principle P-2) | Pricing does not include configuration fees; configuration is performed by the customer or by Ibn Hayan implementation consulting as a separate engagement |

### 9.4 Implementation Consulting

Implementation consulting is offered as a separate engagement, scoped based on the customer's complexity profile and operational maturity. Implementation consulting includes initial configuration review, training, workflow analysis, and operational readiness assessment. Implementation consulting is not required for edition activation; customers with the operational maturity to self-onboard may do so. Implementation consulting credits are included in the Professional and Enterprise editions' enhanced and premium support tiers, respectively; customers may purchase additional consulting as needed.

### 9.5 Pricing Publication

Pricing is published in the commercial catalogue, accessible to prospects and customers through the Ibn Hayan commercial portal. The catalogue includes the per-user, per-facility, and per-module rates for each edition, the volume discount thresholds, the implementation consulting rates, and the support tier inclusions. The catalogue is versioned; changes to the catalogue are recorded in the catalogue's CHANGELOG and communicated to customers with documented notice periods. Customers are not surprised by pricing changes; the catalogue's transparency is the platform's commitment to that posture.

---

## 10. Edition Limitations & Quotas

### 10.1 Limit Philosophy

Edition limits are operational envelopes, not commercial ceilings. A limit exists to ensure that the platform's shared infrastructure serves all tenants equitably, that a tenant's growth is matched by capacity planning, and that the customer's operational reality is reflected in their edition selection. Limits are enforced at the platform layer with clear messaging; exceeding a limit does not produce a billing event or a service interruption, it produces a notification directing the customer to capacity planning or edition upgrade. The limit philosophy aligns with `PRODUCT_BIBLE.md` Section 24 (Scalability Strategy) and `SYSTEM_ARCHITECTURE.md` Section 21 (Scalability Strategy).

### 10.2 Limit Types

The platform enforces several types of limits, each governing a different dimension of the tenant's operational envelope. The limit types are stated in the table below, with edition-specific values in the per-edition sections (Sections 3 through 6) and the comparison matrix (Section 7).

| Limit Type | Description | Enforcement Point |
|---|---|---|
| User count | Maximum active users in the tenant | Identity & Access module (M14) |
| Facility count | Maximum facilities configured in the tenant | Configuration module (M15) |
| Department count per facility | Maximum departments per facility | Configuration module (M15) |
| Patient count | Maximum registered patients in the tenant | Patient module (M01) |
| Encounter count per month | Maximum encounters per calendar month | Encounter module (M02) |
| Document count | Maximum stored documents | Documents module (M07) |
| Integration count | Maximum concurrent active integrations | Integration module (M17) |
| Clinic type overlay count | Maximum active clinic type overlays | Configuration module (M15) |

### 10.3 Quota Governance

Quotas are governed by the customer's edition and by the customer's capacity plan where the edition permits. For Trial, Essential, and Professional editions, quotas are fixed at the edition level and are not adjustable without an edition upgrade. For Enterprise edition, quotas are governed by the customer's capacity plan, which is reviewed quarterly and adjusted based on the customer's operational trajectory. Quota adjustments for Enterprise customers are recorded in the audit trail and reflected in the customer's subscription; quota adjustments do not require an edition change.

### 10.4 Limit Approaching Behaviour

When a tenant approaches a limit, the platform produces proactive notifications to the customer's named contacts. The notifications are tiered: an advisory notification when the tenant reaches 80% of a limit, a warning notification at 90%, and a critical notification at 95%. The notifications include guidance on the available responses: edition upgrade, capacity planning engagement, or operational adjustment. The notification cadence and content are designed to give the customer sufficient time to respond before the limit is reached, in keeping with the platform's commitment to operational predictability.

### 10.5 Limit Exceeding Behaviour

When a tenant exceeds a limit, the platform's behaviour is governed by the limit type. For soft limits (e.g., user count, patient count), the platform continues to operate but produces critical notifications and may apply rate limiting to preserve operational isolation for other tenants. For hard limits (e.g., integration count, where the limit reflects contractual or technical constraints), the platform prevents the operation that would exceed the limit and produces a clear message directing the customer to upgrade or engage capacity planning. No limit exceeding behaviour produces data loss; data entered before the limit was reached is preserved regardless of subsequent limit status.

---

## 11. Edition Customization

### 11.1 Customization Posture

Edition customization in Ibn Hayan is governed by Principle P-2 (Configuration Before Customization), stated in `PRODUCT_BIBLE.md` Section 5 and elaborated in Section 22 (Configuration-Driven Philosophy). Customization, in the sense of source-level modification of the platform, is not offered at any edition. What is offered, and what this section addresses, is configuration depth — the ability of the customer to adapt the platform to their operational reality through the configuration surface. The configuration surface is the same across editions; what differs is the default depth and the breadth of modules enabled.

### 11.2 Configuration Surface by Edition

The configuration surface is documented in `CONFIGURATION_ARCHITECTURE.md` and is summarized in `PRODUCT_BIBLE.md` Section 22.2. The surface is large; every behaviour of consequence is, in principle, configurable. The surface is organized by module, by capability, and by scope, with the eight-layer precedence model defined in `SYSTEM_ARCHITECTURE.md` Section 15.2 governing how configurations at different layers compose. Editions differ in default configuration depth, not in configuration surface availability; a customer on the Essential edition has access to the same configuration surface as a customer on the Enterprise edition, with the Essential edition's defaults being more conservative.

### 11.3 Custom Roles

Custom roles are supported in all production editions (Essential, Professional, Enterprise). Custom roles are compositions of existing permissions, not new permissions; a custom role that requires a permission not in the platform's permission catalogue is not possible without platform extension, and platform extension is treated as a candidate for platform evolution, not as a customer-specific customization. Custom roles are tenant-scoped; a custom role defined by one customer is not available to other customers. Custom roles are subject to the same lifecycle governance as platform-defined roles, with the customer's system administrator responsible for role lifecycle within the tenant. The role framework is elaborated in `USER_ROLES.md`.

### 11.4 Custom Workflows

Custom workflows are supported in all production editions, with depth varying by edition. Essential edition supports limited custom workflow definition, focused on the workflows most commonly adapted by small practices (e.g., appointment reminders, follow-up scheduling). Professional edition supports full custom workflow definition within the workflow engine's configuration framework. Enterprise edition supports advanced custom workflow definition, including multi-step sagas, conditional branching, and integration with external systems through the Integration module (M17). The workflow engine is elaborated in `WORKFLOWS.md` and is defined architecturally in `SYSTEM_ARCHITECTURE.md` Section 16 (Workflow Engine Philosophy).

### 11.5 Customization Boundaries

The boundary between configuration and customization is explicit. Behaviours that can be expressed through the configuration surface are configuration; behaviours that would require source-level modification to express are out of scope for customer-initiated adaptation. The boundary is governed by the platform's extensibility strategy, defined in `SYSTEM_ARCHITECTURE.md` Section 22 (Extensibility Strategy). Customers that require behaviour outside the configuration surface are referred to the platform evolution intake process; the requirement is assessed against the product principles and, if accepted, is added to the platform roadmap. This posture is a deliberate rejection of the per-customer customization model common in legacy healthcare software; Ibn Hayan's position is that per-customer customization produces unmaintainable code paths and is incompatible with the platform's decade horizon.

### 11.6 Customization Governance

Customer-driven configuration is governed by the customer's own configuration governance process, supported by the platform's tooling. The platform provides configuration sandboxes (Section 15.7 of `SYSTEM_ARCHITECTURE.md`), configuration validation (Section 15.4), configuration versioning (Section 15.5), and configuration audit (Section 15.6). The customer's system administrator is responsible for using these tools to govern configuration change within the tenant. The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised, in keeping with the configuration governance posture stated in `PRODUCT_BIBLE.md` Section 22.7.

---

## 12. Related Documents

### 12.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 16 (Editions) is the canonical edition definition; Section 13 (Product Differentiators) defines the pricing and accessibility posture; Section 9 (Target Customers) defines the customer tier system |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 9 (Modular Architecture) defines the module enablement model; Section 10 (Multi-Tenant Architecture) defines the tenant isolation levels referenced in this document; Section 15 (Configuration Strategy) defines the configuration layer model |

### 12.2 Downstream Documents

The following downstream documents elaborate aspects of editions referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and edition availability per module |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue and edition implications for role definition |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission model and edition implications for permission depth |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine and edition implications for custom workflow depth |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability matrix by edition |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Clinic type catalogue and edition implications for clinic type overlay availability |
| Module Architecture | `docs/01_ARCHITECTURE/MODULE_ARCHITECTURE.md` | Module internals that editions enable or disable |
| Configuration Architecture | `docs/01_ARCHITECTURE/CONFIGURATION_ARCHITECTURE.md` | Configuration surface that editions expose at varying depths |

### 12.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Edition changes — additions, deprecations, scope adjustments — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
