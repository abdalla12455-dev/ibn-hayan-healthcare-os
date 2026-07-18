# Ibn Hayan Healthcare Operating System — Features

| Field | Value |
|---|---|
| Document Title | Features |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Product Elaboration — Feature Catalogue |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a feature lifecycle transition is ratified |
| Audience | Product leadership, implementation consultants, customer success teams, configuration architects, customers evaluating Ibn Hayan's feature surface |
| Scope | Feature taxonomy, feature catalogue organized by module (19 modules, 5–10 features per module), feature availability matrix by edition, feature activation mechanism, deprecation policy, discovery, documentation standards |
| Out of Scope | Implementation details, source code, feature flag internals, feature configuration key documentation, per-feature operational runbooks |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. Feature definitions in this document elaborate Section 19 of PRODUCT_BIBLE and do not override the module composition rules stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (stub with section placeholders only) |

---

## Table of Contents

1. Feature Catalog Overview
2. Core Features
3. Specialty Features
4. Premium Features
5. Feature Status Definitions
6. Feature Deprecation Policy
7. Feature Prioritization
8. Feature Dependencies
9. Feature Configuration
10. Feature Discovery & Adoption
11. Feature Roadmap Alignment
12. Related Documents

---

## 1. Feature Catalog Overview

### 1.1 Purpose of Feature Cataloguing

The feature catalogue defines Ibn Hayan's capability surface at the feature level. Features are the user-facing capabilities that the platform provides, organized by the module that owns them. The catalogue is the canonical reference for what features exist, what each feature does, and how features relate to modules, editions, and configurations. Features are distinct from modules (the unit of composition) and from workflows (the unit of multi-step coordination); features are the unit of user-facing capability that customers and users interact with directly. This document elaborates Section 19 of `PRODUCT_BIBLE.md` and provides a comprehensive catalogue of features organized by module, with availability, lifecycle, and configuration context.

### 1.2 Feature and Module Relationship

Features are owned by modules; each feature belongs to exactly one module. The module owns the feature's contract, configuration surface, and lifecycle. A feature cannot span modules; a capability that spans modules is a workflow (per `WORKFLOWS.md`), not a feature. The feature-module relationship is documented per feature in the catalogue; the module's documentation under `docs/11_MODULES/` provides the full feature surface per module. Features are versioned alongside their owning module; feature evolution is governed by the module's lifecycle, as documented in `MODULES.md` Section 5.

### 1.3 Feature Catalogue Size

The feature catalogue comprises approximately 130 features distributed across the 19 modules, with 5–10 features per module. The catalogue is reviewed quarterly by the Product Council; features are added when a module's capability expands and are deprecated when a feature is superseded or is no longer operationally relevant. Feature catalogue changes are ratified by the Product Council and are recorded through the amendment mechanism. The catalogue is not exhaustive of every minor capability; it captures the features that customers and users interact with directly and that are documented as part of the platform's contract surface.

### 1.4 Feature Reading Order

This document is organized as both a linear read and a reference. Readers new to Ibn Hayan's feature model should read Sections 1, 2, and 5 to understand the catalogue, classification, and status definitions. Readers evaluating Ibn Hayan for a specific capability should read the relevant module's feature list in Section 2, 3, or 4 plus Section 5 (status) and Section 6 (deprecation). Readers planning a feature activation should read Sections 9 and 10. Section 12 lists the upstream and downstream documents that this catalogue references and that elaborate feature-specific concerns.

### 1.5 Feature Documentation Standards

Each feature in the catalogue is documented with a consistent structure: feature code, feature name, owning module, feature description, feature status, edition availability, configuration surface, and dependencies. The structure ensures that customers and integrators can compare features consistently and can rely on the documented surface. Feature documentation is part of the definition of done for a feature per Principle P-7 (Documented Before Shipped); a feature without complete documentation is not at General Availability, regardless of its operational status. Feature documentation standards are elaborated in Section 11.

---

## 2. Core Features

### 2.1 Core Feature Definition

Core features are the features provided by the core modules (per `MODULES.md` Section 2) and that are required for Ibn Hayan to operate at all. Core features are available in every edition; the Trial edition enables a subset for evaluation, and the production editions enable the full core set by default. Core features include the patient registration features, encounter management features, clinical documentation features, order entry and result management features, and the platform features (identity, configuration, audit, integration, reporting, localization). The core feature designation is a product-strategy decision and is documented per feature in the catalogue.

### 2.2 Patient Management (M01) Features

The Patient Management module provides the following core features. Each feature is described briefly; full documentation is in the per-module documentation under `docs/11_MODULES/M01_Patient/`.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F01.01 | Patient registration | Register new patients with demographics, contact information, and insurance | All (Trial subset) |
| F01.02 | Patient identity management | Manage patient identity, including duplicate detection and merging | All |
| F01.03 | Patient demographics management | Update and maintain patient demographic information | All (Trial subset) |
| F01.04 | Consent management | Document and track patient consents for treatment and data use | All |
| F01.05 | Medical record lifecycle | Manage the patient's medical record from creation through archival | All |
| F01.06 | Patient merge and unmerge | Merge duplicate patient records and unmerge when incorrectly merged | E2, E3 |
| F01.07 | Patient cohort management | Define and manage patient cohorts for care management and reporting | E2, E3 |
| F01.08 | Patient relationship management | Track patient relationships (family, caregiver, emergency contact) | All |

### 2.3 Encounter (M02) Features

The Encounter module provides the following core features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F02.01 | Encounter creation | Create encounters of various types (outpatient, inpatient, emergency, telehealth) | All (Trial subset) |
| F02.02 | Encounter management | Manage encounter lifecycle from initiation through closure | All |
| F02.03 | Encounter handoff | Hand off encounters between clinicians and care teams | All |
| F02.04 | Encounter type configuration | Configure encounter types per clinic type and operational reality | All |
| F02.05 | Multi-disciplinary encounter | Support encounters involving multiple clinicians and care teams | E2, E3 |
| F02.06 | Encounter re-opening | Re-open closed encounters for correction or addition | All |
| F02.07 | Encounter search and retrieval | Search and retrieve encounters by various criteria | All (Trial subset) |
| F02.08 | Encounter archival | Archive encounters per retention policy | All |

### 2.4 Clinical Documentation (M03) Features

The Clinical Documentation module provides the following core features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F03.01 | Clinical note creation | Create clinical notes using structured and free-text formats | All (Trial subset) |
| F03.02 | Documentation templates | Use and customize documentation templates per clinic type | All |
| F03.03 | Structured data capture | Capture structured data (vitals, assessments, scores) | All |
| F03.04 | Clinical note review and signing | Review and sign clinical notes per authorization rules | All |
| F03.05 | Documentation amendment | Amend signed documentation with audit trail | All |
| F03.06 | Documentation search | Search clinical documentation by content and metadata | All |
| F03.07 | Documentation templates designer | Design custom documentation templates within the framework | E2, E3 |
| F03.08 | Behavioral health record segregation | Segregate behavioral health documentation per regulatory requirements | E2, E3 |

### 2.5 Orders & Results (M04) Features

The Orders & Results module provides the following core features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F04.01 | Order entry | Enter orders for laboratory tests, imaging, medications, referrals | All (Trial subset) |
| F04.02 | Order set management | Use and customize order sets per clinic type and condition | All |
| F04.03 | Result management | Receive, review, and acknowledge results | All |
| F04.04 | Critical result notification | Notify ordering clinician of critical results with escalation | All |
| F04.05 | Result reporting | Report results to ordering clinician and patient (where appropriate) | All |
| F04.06 | Clinical decision support | Trigger decision support checks at order entry | All |
| F04.07 | Result trending | Trend results over time for clinical review | E2, E3 |
| F04.08 | Result interpretation | Document result interpretation in clinical record | All |

### 2.6 Platform Module Features

The platform modules (M14 through M19) provide the following core features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Module | Description | Edition Availability |
|---|---|---|---|---|
| F14.01 | Authentication | M14 | Authenticate users through various mechanisms | All |
| F14.02 | Authorization | M14 | Authorize user actions through the permission framework | All |
| F14.03 | Session management | M14 | Manage user sessions and session security | All |
| F15.01 | Configuration management | M15 | Manage platform configuration across layers | All |
| F15.02 | Configuration validation | M15 | Validate configuration changes before application | All |
| F15.03 | Configuration versioning | M15 | Version configuration changes for audit and rollback | All |
| F15.04 | Configuration audit | M15 | Audit configuration changes with full context | All |
| F15.05 | Configuration sandbox | M15 | Test configuration changes in sandbox environment | E2, E3 |
| F16.01 | Audit trail | M16 | Maintain immutable audit trail of consequential actions | All |
| F16.02 | Audit query | M16 | Query audit trail for compliance and investigation | All |
| F16.03 | Audit reporting | M16 | Generate audit reports for regulatory compliance | All |
| F17.01 | Integration framework | M17 | Framework for system-to-system integration | All |
| F17.02 | Connector management | M17 | Manage integration connectors | All |
| F17.03 | Partner surfaces | M17 | Expose platform surfaces to integration partners | E2, E3 |
| F18.01 | Operational reporting | M18 | Real-time and near-real-time operational reports | All (Trial read-only) |
| F18.02 | Analytical reporting | M18 | Scheduled analytical reports from analytical store | E2, E3 |
| F18.03 | Regulatory reporting | M18 | Regulatory reports per regional frameworks | E2, E3 |
| F19.01 | Language adaptation | M19 | Adapt platform language per tenant preferences | All |
| F19.02 | Calendar adaptation | M19 | Adapt calendar system per tenant preferences | All |
| F19.03 | Regulatory framework adaptation | M19 | Adapt platform to regional regulatory frameworks | All |
| F19.04 | Clinical coding system adaptation | M19 | Adapt platform to regional clinical coding systems | All |

---

## 3. Specialty Features

### 3.1 Specialty Feature Definition

Specialty features are features provided by the specialty modules (per `MODULES.md` Section 3) and that extend Ibn Hayan's capability beyond the core surface. Specialty features are enabled based on the customer's clinic type profile and operational reality. Specialty features are add-ons in the commercial sense but are first-class features in the architectural sense. The specialty feature designation is a product-strategy decision and is documented per feature in the catalogue.

### 3.2 Pharmacy (M05) Features

The Pharmacy module provides the following specialty features. Each feature is described briefly; full documentation is in the per-module documentation under `docs/11_MODULES/M05_Pharmacy/`.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F05.01 | Medication management | Manage medication catalogue, including formulary and alternatives | All (where Pharmacy enabled) |
| F05.02 | Prescription processing | Receive, verify, and process prescriptions | All (where Pharmacy enabled) |
| F05.03 | Dispensing operations | Dispense medications per prescription with documentation | All (where Pharmacy enabled) |
| F05.04 | Clinical pharmacy | Provide clinical pharmacy services (review, counselling, monitoring) | E2, E3 |
| F05.05 | Medication safety checks | Perform drug-drug, drug-allergy, and dose range checks | All (where Pharmacy enabled) |
| F05.06 | Controlled substance tracking | Track controlled substance dispensing per regulatory requirements | All (where Pharmacy enabled) |
| F05.07 | Pharmacy inventory | Manage pharmacy inventory, including expiration and replenishment | All (where Pharmacy enabled) |
| F05.08 | Medication therapy management | Provide medication therapy management services | E3 |

### 3.3 Scheduling (M06) Features

The Scheduling module provides the following specialty features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F06.01 | Appointment scheduling | Schedule appointments with various rules and constraints | All (Trial subset) |
| F06.02 | Resource scheduling | Schedule resources (rooms, equipment) per appointment | All |
| F06.03 | Queue management | Manage patient queues for walk-in and urgent care | All |
| F06.04 | Appointment reminders | Send appointment reminders per patient preferences | All |
| F06.05 | Recurring appointments | Schedule recurring appointments for chronic care | All |
| F06.06 | Multi-resource appointments | Schedule appointments requiring multiple resources (e.g., clinician + room + equipment) | E2, E3 |
| F06.07 | Patient self-scheduling | Allow patients to self-schedule within defined constraints | E2, E3 |
| F06.08 | Schedule optimization | Optimize schedules for resource utilization and patient access | E3 |

### 3.4 Documents (M07) Features

The Documents module provides the following specialty features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F07.01 | Document management | Manage documents (upload, store, retrieve, archive) | All |
| F07.02 | Document templates | Use and customize document templates | All |
| F07.03 | Document workflow | Manage document workflow (review, approval, distribution) | All |
| F07.04 | Document versioning | Version documents for audit and rollback | All |
| F07.05 | Document search | Search documents by content and metadata | All |
| F07.06 | Document e-signature | Apply electronic signatures per regulatory requirements | E2, E3 |
| F07.07 | Document access control | Control document access per permission framework | All |
| F07.08 | Document retention management | Manage document retention per regulatory requirements | All |

### 3.5 Notifications (M08) Features

The Notifications module provides the following specialty features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F08.01 | Notification generation | Generate notifications from events | All |
| F08.02 | Multi-channel delivery | Deliver notifications through multiple channels | All |
| F08.03 | Notification templates | Use and customize notification templates | All |
| F08.04 | Patient notification preferences | Manage patient notification preferences | All |
| F08.05 | Notification acknowledgement | Track notification acknowledgement where required | All |
| F08.06 | Critical notification escalation | Escalate critical notifications per defined rules | All |
| F08.07 | Notification audit | Audit notification generation, delivery, and acknowledgement | All |
| F08.08 | Notification analytics | Analyze notification effectiveness and engagement | E2, E3 |

### 3.6 Billing (M09) Features

The Billing module provides the following specialty features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F09.01 | Charge capture | Capture charges from clinical documentation | All |
| F09.02 | Claim generation | Generate claims from captured charges | All |
| F09.03 | Claim submission | Submit claims to payers through integration | All |
| F09.04 | Payment posting | Post payments received from payers and patients | All |
| F09.05 | Denial management | Manage denied claims through rework or appeal | All |
| F09.06 | Patient billing | Bill patients for responsibility portions | All |
| F09.07 | Payment reconciliation | Reconcile payments with accounting | E2, E3 |
| F09.08 | Billing analytics | Analyze billing performance and trends | E2, E3 |

### 3.7 Accounting (M10) Features

The Accounting module provides the following specialty features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Description | Edition Availability |
|---|---|---|---|
| F10.01 | General ledger | Manage general ledger for the organization | E2, E3 |
| F10.02 | Accounts payable | Manage accounts payable processes | E2, E3 |
| F10.03 | Accounts receivable | Manage accounts receivable processes | E2, E3 |
| F10.04 | Financial reporting | Generate financial reports for management and stakeholders | E2, E3 |
| F10.05 | Multi-currency support | Support multi-currency operations for multi-region organizations | E3 |
| F10.06 | Cost accounting | Perform cost accounting for healthcare services | E3 |
| F10.07 | Budget management | Manage organizational budgets and track performance | E3 |

### 3.8 CRM (M11), HR (M12), Workforce (M13) Features

The administrative modules provide the following specialty features. Each feature is described briefly; full documentation is in the per-module documentation.

| Code | Feature | Module | Description | Edition Availability |
|---|---|---|---|---|
| F11.01 | Patient relationship management | M11 | Manage patient relationships and outreach | E2, E3 (add-on E1) |
| F11.02 | Marketing campaigns | M11 | Manage marketing campaigns and track effectiveness | E2, E3 |
| F11.03 | Patient communications | M11 | Manage patient communications across channels | E2, E3 |
| F12.01 | Employee records management | M12 | Manage employee records and lifecycle | E2, E3 |
| F12.02 | Payroll processing | M12 | Process payroll per regional requirements | E2, E3 |
| F12.03 | Benefits administration | M12 | Manage employee benefits administration | E2, E3 |
| F12.04 | Time and attendance | M12 | Track employee time and attendance | E2, E3 |
| F13.01 | Workforce scheduling | M13 | Schedule workforce per operational needs | E2, E3 |
| F13.02 | Credential management | M13 | Manage clinician credentials and expiration tracking | E2, E3 |
| F13.03 | Workforce analytics | M13 | Analyze workforce performance and utilization | E3 |

---

## 4. Premium Features

### 4.1 Premium Feature Definition

Premium features are features that are available only in the higher editions (Professional and Enterprise) and that provide advanced capability beyond the standard feature surface. Premium features are not add-ons in the commercial sense; they are included in the higher editions' default scope. The premium feature designation reflects the operational complexity, regulatory exposure, or scale requirements that justify the higher edition. Premium features are subject to the same lifecycle governance as standard features.

### 4.2 Multi-Facility Operation Features

Multi-facility operation features enable a customer to operate Ibn Hayan across multiple facilities within a single tenant. The features include cross-facility patient search, cross-facility reporting, cross-facility configuration management, and cross-facility user provisioning. Multi-facility operation features are available in the Professional and Enterprise editions and are required for customers operating multiple facilities. The features are documented per module in the per-module documentation.

### 4.3 Multi-Region Operation Features

Multi-region operation features enable a customer to operate Ibn Hayan across multiple regions within a single tenant, with regional data residency enforced per `SYSTEM_ARCHITECTURE.md` Section 10.6. The features include regional data partitioning, regional configuration overlays, regional regulatory framework adaptation, and cross-region reporting (where permitted). Multi-region operation features are available only in the Enterprise edition and are required for customers operating across regions with different regulatory frameworks.

### 4.4 Advanced Audit and Security Features

Advanced audit and security features provide enhanced audit capabilities and enhanced security controls for customers with strict regulatory or contractual requirements. The features include advanced threat detection, enhanced audit retention, segregation-of-duty enforcement, and emergency access review workflows. Advanced audit and security features are available in the Enterprise edition and are required for hospitals, hospital networks, and other customers with strict regulatory exposure.

### 4.5 Advanced Integration Features

Advanced integration features provide enhanced integration capabilities for customers with complex integration landscapes. The features include partner surfaces (the ability to expose platform surfaces to integration partners), integration analytics, integration health monitoring, and advanced connector management. Advanced integration features are available in the Professional and Enterprise editions and are required for customers with multiple integration partners or with complex integration workflows.

### 4.6 Advanced Reporting Features

Advanced reporting features provide enhanced reporting capabilities for customers with complex analytical or regulatory reporting needs. The features include analytical reporting from the analytical store, regulatory reporting per regional frameworks, custom report design, and reporting analytics. Advanced reporting features are available in the Professional and Enterprise editions and are required for customers with regulatory reporting obligations or with complex analytical needs.

### 4.7 Premium Feature Catalogue

The table below summarizes the premium features by category. The features are representative; the full premium feature surface is documented in the per-module documentation.

| Premium Feature Category | Editions | Key Features |
|---|---|---|
| Multi-facility operation | E2, E3 | Cross-facility patient search, cross-facility reporting, cross-facility configuration |
| Multi-region operation | E3 | Regional data partitioning, regional configuration overlays, regional regulatory framework adaptation |
| Advanced audit and security | E3 | Advanced threat detection, enhanced audit retention, segregation-of-duty enforcement, emergency access review |
| Advanced integration | E2, E3 | Partner surfaces, integration analytics, integration health monitoring, advanced connector management |
| Advanced reporting | E2, E3 | Analytical reporting, regulatory reporting, custom report design, reporting analytics |
| Advanced configuration | E2, E3 | Configuration sandbox, configuration hot-reload, advanced configuration validation |

---

## 5. Feature Status Definitions

### 5.1 Status Categories

Feature status is governed by the same lifecycle stages that govern module lifecycle, as stated in `MODULES.md` Section 5. The stages are normative for features; transitions are ratified by the Product Council (or the Architecture Council for architectural transitions) and are recorded in the platform's CHANGELOG. Feature status is documented per feature in the catalogue and is visible to customers evaluating the feature for production use.

| Status | Code | Description | Customer Impact |
|---|---|---|---|
| Candidate | LC1 | Feature under design; not available to customers | None |
| Pilot | LC2 | Feature deployed to pilot customers for validation | Pilot customers only |
| General Availability | LC3 | Feature available to all customers per edition packaging | All customers per edition |
| Mature | LC4 | Feature in steady-state; long-term support commitment | All customers per edition |
| Deprecation Candidate | LC5 | Feature considered for deprecation; transition planning underway | None (feature operates normally) |
| Deprecated | LC6 | Feature deprecated; new customers cannot enable; existing customers supported through transition window | New customers cannot enable; existing customers supported |
| Retired | LC7 | Feature removed from the platform; transition window closed | Feature not available |

### 5.2 Status and Edition Interaction

Feature status interacts with edition packaging: a feature at Pilot stage is not enabled in any edition by default; a feature at General Availability is enabled per the edition packaging rules; a feature at Mature is enabled per the edition packaging rules with long-term support commitment; a feature at Deprecation Candidate or Deprecated is enabled per the edition packaging rules but is not enabled for new customers. Status does not override edition packaging; a customer cannot enable a feature that is not available in their edition, regardless of the feature's status.

### 5.3 Status and Customer Communication

Feature status transitions are communicated to customers through the platform's change-management channel. The transition from Candidate to Pilot has no customer communication (no customers were using the feature). The transition from Pilot to General Availability is communicated as a new feature availability announcement. The transition from General Availability to Mature has minimal customer communication (the feature's behaviour does not change). The transition to Deprecation Candidate or Deprecated has significant customer communication with documented transition timelines.

### 5.4 Status and Documentation

Feature status is documented per feature in the catalogue. The documentation includes the current status, the date of the most recent status transition, and the rationale for the most recent transition. Documentation is updated when a feature's status changes; the documentation version history is recorded in the platform's CHANGELOG. Customers can rely on the documentation to reflect the feature's current status and to provide context for the feature's lifecycle position.

### 5.5 Status Governance

Feature status is governed by the Product Council for product-strategy transitions (addition, deprecation, retirement) and by the Architecture Council for architectural transitions (Pilot to General Availability, contract evolution). Both councils operate under documented charters and record their decisions in the platform's CHANGELOG. Status governance is a direct consequence of Principle P-7 (Documented Before Shipped) and Principle P-8 (Verified Practice Over Hypothetical Capability).

---

## 6. Feature Deprecation Policy

### 6.1 Deprecation Principles

Feature deprecation is governed by the same principles that govern module deprecation, as stated in `MODULES.md` Section 9. Deprecation is rare and is undertaken only when a feature has become operationally obsolete (e.g., replaced by a more general feature) or when the feature's surface is no longer viable (e.g., due to regulatory changes). Deprecation follows a multi-year transition pathway that ensures existing customers are not stranded. The deprecation policy is normative; deviations are corrected through the amendment mechanism.

### 6.2 Deprecation Stages

The deprecation pathway comprises the stages stated in the table below. Each stage has documented entry and exit criteria; a feature that does not meet the exit criteria for a stage does not progress to the next stage. The deprecation pathway is the same as the module deprecation pathway, with the feature as the unit of deprecation rather than the module.

| Stage | Code | Description | Customer Impact | Notice Period |
|---|---|---|---|---|
| Deprecation Candidate | LC5 | Feature considered for deprecation; transition planning underway | None (feature operates normally) | 12 months minimum before deprecation |
| Deprecated | LC6 | Feature deprecated; new customers cannot enable; existing customers supported through transition window | New customers cannot enable; existing customers supported | 24 months minimum before retirement |
| Retired | LC7 | Feature removed from the platform; transition window closed | Feature not available; data migrated to replacement | N/A (transition complete) |

### 6.3 Transition Support

Transition support for deprecated features is documented per feature and is communicated to affected customers with documented timelines. Transition support includes documentation of the replacement feature (where applicable), configuration translation from the deprecated feature's configuration surface to the replacement feature's configuration surface, and user training on the replacement feature's workflows. Transition support is provided at no additional cost to affected customers; the cost of transition is borne by Ibn Hayan as a consequence of the deprecation decision.

### 6.4 Deprecation and Customer Communication

Deprecation events are communicated to affected customers through the platform's change-management channel, with notice periods scaled to the deprecation's customer impact. The minimum notice periods are stated in Section 6.2. Communication includes the rationale for deprecation, the transition plan, the timeline, and the customer's options (adopt the replacement feature, maintain the deprecated feature through the transition window, or seek alternative capability). Customers are advised to engage Ibn Hayan customer success for guidance on deprecation response.

### 6.5 Currently Deprecated Features

As of this document's version, no features in the catalogue are deprecated. The catalogue comprises features all at lifecycle stage General Availability (LC3) or Mature (LC4). This state reflects the platform's stability posture; deprecation events are rare and are undertaken only when operationally justified. Customers are notified of any deprecation events through the platform's change-management channel with documented notice periods.

---

## 7. Feature Prioritization

### 7.1 Prioritization Approach

Feature prioritization is the process by which Ibn Hayan determines which features to develop, enhance, or deprecate. Prioritization is governed by the product principles stated in `PRODUCT_BIBLE.md` Section 5 (Core Principles) and Section 6 (Design Principles) and is informed by customer feedback, operational telemetry, market analysis, and regulatory evolution. Prioritization is conducted quarterly by the Product Council, with the prioritized backlog documented in the platform's roadmap (Section 31 of `PRODUCT_BIBLE.md`).

### 7.2 Prioritization Criteria

Feature prioritization criteria are stated in the table below. The criteria are weighted; the weighting is reviewed annually by the Product Council and may evolve as the platform's strategic posture evolves. Criteria are not equally weighted; healthcare safety and regulatory compliance criteria carry higher weight than commercial criteria.

| Criterion | Weight | Description |
|---|---|---|
| Healthcare safety | Highest | Features that improve healthcare safety (Principle P-1) are prioritized over other features |
| Regulatory compliance | High | Features required for regulatory compliance in supported regions are prioritized |
| Customer impact | High | Features that affect multiple customers or that address significant customer pain points are prioritized |
| Strategic alignment | Medium | Features that align with the platform's strategic direction are prioritized |
| Operational improvement | Medium | Features that improve operational efficiency for customers are prioritized |
| Commercial impact | Lower | Features that improve the platform's commercial position are prioritized but do not override higher criteria |
| Technical debt | Lower | Features that reduce technical debt are prioritized but do not override higher criteria |

### 7.3 Prioritization and Customer Feedback

Customer feedback is a critical input to feature prioritization. Customer feedback is collected through multiple channels: customer success engagements, support tickets, customer advisory board meetings, and direct customer requests. Feedback is triaged and routed to the relevant product team for assessment. Feedback that aligns with prioritization criteria is added to the prioritized backlog; feedback that does not align is documented and communicated to the customer with rationale. Customer feedback is not the only input to prioritization; it is one input among several, weighted by the criteria stated in Section 7.2.

### 7.4 Prioritization and the Roadmap

The prioritized feature backlog is reflected in the platform's roadmap, documented in `PRODUCT_BIBLE.md` Section 31 (Long-Term Roadmap). The roadmap is communicated to customers through the platform's change-management channel and is updated quarterly. The roadmap is not a commitment; it is a statement of intent that reflects current prioritization. Roadmap items may be re-prioritized, delayed, or removed as the platform's strategic posture evolves. Customers are advised to engage Ibn Hayan customer success for guidance on roadmap interpretation.

### 7.5 Prioritization Governance

Feature prioritization is governed by the Product Council. The Product Council operates under a documented charter and records its prioritization decisions in the platform's CHANGELOG. Prioritization decisions are auditable and are subject to review by the executive team. The governance posture ensures that feature prioritization is deliberate, transparent, and aligned with the platform's strategic posture.

---

## 8. Feature Dependencies

### 8.1 Dependency Types

Feature dependencies are governed by the same rules that govern module dependencies, as stated in `MODULES.md` Section 7. Features may depend on other features within the same module or across modules. Dependencies are explicit, documented, and validated at feature activation time. The dependency graph is acyclic; circular dependencies are forbidden and are treated as defects.

| Dependency Type | Description | Example |
|---|---|---|
| Intra-module | Feature depends on another feature in the same module | F01.06 (Patient merge) depends on F01.01 (Patient registration) |
| Inter-module | Feature depends on a feature in another module | F09.01 (Charge capture) depends on F02.01 (Encounter creation) |
| Module-level | Feature depends on a module being enabled | F05.01 (Medication management) depends on M05 (Pharmacy) being enabled |
| Edition-level | Feature depends on the customer's edition | F10.05 (Multi-currency support) depends on Enterprise edition (E3) |

### 8.2 Dependency Enforcement

Feature dependencies are enforced at the platform layer. A feature that depends on a disabled feature cannot be enabled; the enablement attempt is rejected at validation time with a clear message identifying the missing dependency. A feature that is depended on by an enabled feature cannot be disabled; the disablement attempt is rejected at validation time with a clear message identifying the dependent feature. The enforcement is symmetric: dependencies are checked in both directions to ensure the dependency graph remains acyclic and complete.

### 8.3 Dependency Documentation

Feature dependencies are documented per feature in the catalogue. The documentation includes the features that the feature depends on (downstream dependencies) and the features that depend on the feature (upstream dependencies). Documentation is updated when dependencies change; dependency changes follow the platform's deprecation policy and are communicated to customers with documented notice periods.

### 8.4 Dependency Evolution

Feature dependencies evolve as features evolve. A dependency change is a contract change and follows the platform's deprecation policy. New dependencies are added when a feature's capability expands to require another feature's surface; existing dependencies are removed when a feature's capability is refactored to no longer require another feature's surface. Dependency changes are documented in the feature's documentation and are recorded in the platform's CHANGELOG.

### 8.5 Dependency and Edition Interaction

Feature dependencies interact with edition packaging. A feature that depends on a feature not available in the customer's edition cannot be enabled; the customer is informed that the dependency is not satisfied and is advised to upgrade their edition. Edition-specific dependency documentation is provided in the per-feature documentation and in the per-edition documentation.

---

## 9. Feature Configuration

### 9.1 Configuration Surface

Feature configuration is governed by the configuration-driven architecture stated in `SYSTEM_ARCHITECTURE.md` Section 8 and the configuration layer model stated in Section 15.2 of the same document. Each feature exposes a configuration surface that defines the feature's configurable behaviours. The surface is documented as part of the feature's documentation and is versioned alongside the platform. Feature configuration is subject to the standard validation, versioning, and audit rules.

### 9.2 Configuration Layers

Feature configuration inherits through the configuration layers, with the layer model governing precedence. The platform default layer (L1) provides the platform-default feature configuration; the edition layer (L2) adjusts defaults per edition; the tenant layer (L3) and below allow customer refinement. The clinic type overlay provides clinic-type-specific feature configuration defaults. The full precedence order is documented in `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 9.3 Configuration Validation

Feature configuration is validated through the five validation rule categories stated in `SYSTEM_ARCHITECTURE.md` Section 15.4: structural, referential, semantic, contextual, and regulatory. A feature configuration that fails validation is not applied; the failure is reported to the configurator with diagnostic information. Validation failures are auditable.

### 9.4 Configuration Examples

The table below provides illustrative examples of feature configuration. The examples are representative; the full configuration surface is documented in the per-feature documentation.

| Feature | Configuration Example | Layer | Effect |
|---|---|---|---|
| F01.01 Patient registration | Add region-specific demographic fields | Tenant | Registration form includes regional fields |
| F03.02 Documentation templates | Customize encounter template per clinic type | Clinic type overlay | Encounter documentation uses cardiology-specific template |
| F06.01 Appointment scheduling | Adjust slot duration per clinic type | Facility | Slot duration set to 30 minutes for cardiology |
| F08.04 Patient notification preferences | Configure default notification channels | Tenant | Default channels set to email and SMS |
| F09.06 Patient billing | Configure patient billing cycle | Tenant | Billing cycle set to monthly |
| F15.05 Configuration sandbox | Enable sandbox for testing configuration changes | Tenant | Sandbox tenant activated |

### 9.5 Configuration Governance

Feature configuration is governed by the customer's own configuration governance process, supported by the platform's tooling. The platform provides configuration sandboxes for testing feature configuration before production application, configuration validation for verifying feature configuration consistency, configuration versioning for tracking feature configuration changes, and configuration audit for accountability. The customer's system administrator is responsible for using these tools to govern feature configuration within the tenant.

---

## 10. Feature Discovery & Adoption

### 10.1 Discovery Mechanisms

Feature discovery is the process by which customers and users become aware of features available in their tenant. Discovery mechanisms include the platform's documentation, in-product feature discovery surfaces, customer success engagements, training material, and the platform's change-management channel. The discovery mechanisms are designed to ensure that customers and users can identify features relevant to their operational reality and can adopt features that improve their use of the platform.

### 10.2 In-Product Discovery

In-product discovery surfaces provide contextual awareness of features within the platform's user interface. The surfaces include feature tips, feature highlights, and feature catalogues. In-product discovery is governed by the user's role and permissions; users see discovery surfaces for features they have permission to use. In-product discovery is configurable; customers can adjust discovery surfaces to match their operational context, including disabling discovery surfaces that are not relevant to their workflows.

### 10.3 Documentation Discovery

Documentation discovery is the process by which customers and users identify features through the platform's documentation. The documentation is organized by module (per `MODULES.md`), by clinic type (per `CLINIC_TYPES.md`), and by user role (per `USER_ROLES.md`), with cross-references that allow discovery from multiple entry points. Documentation discovery is supported by search and by navigation aids. Documentation is versioned alongside the platform and is updated when features are added, modified, or deprecated.

### 10.4 Customer Success Engagement

Customer success engagements are a primary mechanism for feature discovery. Customer success teams are trained on the platform's feature surface and proactively identify features that may benefit customers based on the customer's operational reality. Engagements include quarterly business reviews (for Professional and Enterprise editions), annual reviews (for Essential edition), and ad-hoc engagements as needed. Customer success engagements are documented and are auditable.

### 10.5 Adoption Measurement

Feature adoption is measured through operational telemetry. The primary adoption metrics are: feature activation rate (percentage of customers with the feature enabled), feature usage rate (frequency of feature use among enabled customers), and feature adoption depth (breadth of feature use among enabled customers). Adoption metrics are reviewed quarterly by the Product Council and inform feature prioritization (Section 7). Low adoption of a feature may trigger investigation into the feature's discoverability, usability, or relevance; the investigation may result in feature enhancement, feature re-positioning, or feature deprecation.

### 10.6 Adoption Barriers

Feature adoption may be inhibited by barriers including lack of awareness, lack of training, configuration complexity, integration requirements, or operational resistance. Ibn Hayan customer success teams are trained to identify adoption barriers and to recommend mitigations. Mitigations may include targeted training, configuration assistance, integration support, or operational change management. Adoption barriers are documented per feature and are reviewed by the Product Council as input to feature prioritization.

---

## 11. Feature Roadmap Alignment

### 11.1 Roadmap and Feature Catalogue Alignment

The feature catalogue is aligned with the platform's roadmap, documented in `PRODUCT_BIBLE.md` Section 31 (Long-Term Roadmap). The roadmap provides the forward-looking view of feature evolution; the catalogue provides the current view of feature availability. The two documents are consistent: features in the catalogue are at General Availability or Mature; features in the roadmap are at Candidate or Pilot, or are planned future additions. The alignment is maintained through quarterly Product Council reviews.

### 11.2 Roadmap Disclosure

Roadmap disclosure is balanced: customers need visibility into the platform's evolution to inform their own planning, but roadmap items are not commitments and should not be relied on for production planning. The roadmap is disclosed through the platform's roadmap documentation, with each item's intake stage and indicative timeline documented. Indicative timelines are not commitments; they are estimates based on current intake progress and may change as intake progresses. Customers are advised to engage Ibn Hayan customer success for guidance on roadmap interpretation.

### 11.3 Roadmap and Customer Engagement

Customers requiring features not in the catalogue are referred to the platform evolution intake process. The requirement is assessed against the product principles and against the platform's bounded context decomposition; if accepted, the requirement is added to the roadmap as a candidate feature. The customer may be engaged as a pilot customer for the candidate feature, with pilot engagement terms that reflect their contribution to the intake process. This posture ensures that catalogue expansion is driven by validated operational reality rather than by hypothetical capability, in keeping with Principle P-8 (Verified Practice Over Hypothetical Capability).

### 11.4 Roadmap and Edition Evolution

The roadmap may include edition evolution — additions, modifications, or deprecations of editions. Edition evolution is rare and follows the same governance as feature evolution. Edition evolution is communicated to customers through the platform's change-management channel with documented notice periods. Edition evolution does not strand customers; existing customers are supported through transition pathways, and edition deprecation follows the multi-year transition support stated in `EDITIONS.md` Section 2.4.

### 11.5 Roadmap Governance

The roadmap is governed by the Product Council. Roadmap changes — additions, re-prioritizations, removals — are ratified by the Product Council and are recorded through the amendment mechanism. The roadmap is reviewed quarterly, with the review documented in the platform's CHANGELOG. Customers are notified of significant roadmap changes through the platform's change-management channel.

---

## 12. Related Documents

### 12.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 19 (Product Modules Overview) is the canonical module catalogue that features belong to; Section 16 (Editions) defines the edition packaging rules that govern feature availability; Section 31 (Long-Term Roadmap) defines the roadmap that the feature catalogue aligns with |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 9 (Modular Architecture) defines the module architecture that features live within; Section 14 (Feature Flag Strategy) defines the feature flag framework that governs feature activation; Section 15 (Configuration Strategy) defines the configuration surface that features are configured through |

### 12.2 Downstream Documents

The following downstream documents elaborate aspects of features referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue that owns the features |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue that features are accessed through |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework that governs feature access |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine that features participate in |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition-specific feature availability |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Per-clinic-type feature recommendations |
| Module Architecture | `docs/01_ARCHITECTURE/MODULE_ARCHITECTURE.md` | Module internals that features are built on |
| Configuration Architecture | `docs/01_ARCHITECTURE/CONFIGURATION_ARCHITECTURE.md` | Configuration surface that features are configured through |

### 12.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Catalogue changes — additions, deprecations, lifecycle transitions — are ratified by the Product Council (or the Architecture Council for architectural transitions) and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
