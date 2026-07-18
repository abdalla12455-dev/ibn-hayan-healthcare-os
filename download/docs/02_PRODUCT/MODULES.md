# Ibn Hayan Healthcare Operating System — Modules

| Field | Value |
|---|---|
| Document Title | Modules |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Product Elaboration — Module Catalogue |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a module lifecycle transition is ratified |
| Audience | Product leadership, engineering leadership, implementation consultants, customer success teams, configuration architects, customers evaluating Ibn Hayan's module surface |
| Scope | Module catalogue (19 modules, M01–M19), module classification, module dependencies, configuration surface per module, module lifecycle, extension points, activation and deactivation rules, module interactions |
| Out of Scope | Implementation details, source code, contract signatures, internal module state, database schemas, API endpoints, deployment topology |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. Module definitions in this document elaborate Section 19 of PRODUCT_BIBLE and do not override the module composition rules stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (stub with section placeholders only) |

---

## Table of Contents

1. Module Inventory Overview
2. Core Modules
3. Specialty Modules
4. Add-on Modules
5. Module Lifecycle Statuses
6. Module Catalog Table
7. Module Dependencies Matrix
8. Module Maturity Levels
9. Deprecated Modules
10. Future Modules Pipeline
11. Module Selection Guide
12. Related Documents

---

## 1. Module Inventory Overview

### 1.1 Purpose of Module Cataloguing

The module catalogue defines Ibn Hayan's capability surface at the module level. Modules are the unit of composition, the unit of enablement, and the unit of dependency management, as stated in `PRODUCT_BIBLE.md` Section 19.1. The catalogue is the canonical reference for what modules exist, what each module does, and how modules relate to each other. Module internals — contracts, dependencies, lifecycle, versioning — are defined in `MODULE_ARCHITECTURE.md` and are not duplicated here; this document focuses on the product-facing view of the catalogue. Ibn Hayan's 19 modules are organized into five categories matching the in-scope capability categories defined in `PRODUCT_BIBLE.md` Section 11.2.

### 1.2 Module Count and Stability

The module catalogue comprises 19 modules, codified M01 through M19. The catalogue is stable; modules are not added or removed casually, and changes are recorded through the amendment mechanism defined in the document header. The 19-module count reflects the platform's bounded context decomposition per `SYSTEM_ARCHITECTURE.md` Section 7 (Domain-Driven Architecture); each module aligns with one or more bounded contexts, with documented exceptions for contexts that span multiple modules or modules that span multiple contexts. Catalogue expansion is governed by the intake process defined in `PRODUCT_BIBLE.md` Section 17.4, with the additional requirement that a new module's bounded context be explicitly defined and aligned with the platform's domain-driven architecture.

### 1.3 Module Reading Order

This document is organized as both a linear read and a reference. Readers new to Ibn Hayan's module model should read Sections 1, 2, 6, and 7 to understand the catalogue, classification, master table, and dependency graph. Readers evaluating Ibn Hayan for a specific capability should read the relevant module's entry in Section 6 plus Sections 5 and 8 to understand the module's lifecycle and maturity. Readers planning a module activation or deactivation should read Sections 4, 9, and 11. Section 12 lists the upstream and downstream documents that this catalogue references and that elaborate module-specific concerns.

### 1.4 Module Architecture Reference

Module architecture — the architectural commitments that govern module boundaries, contracts, communication, versioning, and extension — is defined in `SYSTEM_ARCHITECTURE.md` Section 9 (Modular Architecture) and Section 13 (Module Architecture). The architectural commitments are normative for all modules; a module that does not conform to the architectural commitments is defective and is not shipped. This document references the architectural commitments where relevant but does not restate them; readers seeking the architectural posture should consult `SYSTEM_ARCHITECTURE.md` directly. The detailed treatment of module internals is in `MODULE_ARCHITECTURE.md`, which is the canonical reference for module contracts, dependencies, and lifecycle mechanics.

---

## 2. Core Modules

### 2.1 Definition of Core Modules

Core modules are the modules required for Ibn Hayan to operate at all. Without these modules, the platform cannot serve its primary function of supporting healthcare delivery. Core modules are enabled in every edition; the Trial edition enables a subset of core modules for evaluation, and the production editions (Essential, Professional, Enterprise) enable the full core set by default. Core modules include the platform modules (M14 through M19) and the foundational clinical modules (M01 through M04). The core module designation is a product-strategy decision; it is not a technical classification. A module's core status is documented in the module's catalogue entry and is reviewed when the module's lifecycle stage changes.

### 2.2 Core Clinical Modules

The core clinical modules are M01 (Patient), M02 (Encounter), M03 (Clinical Documentation), and M04 (Orders & Results). These modules are the minimum clinical capability required for any healthcare operation: registering patients, recording encounters, documenting clinical findings, and ordering tests or treatments. The core clinical modules depend on the platform modules and may depend on each other in defined ways (e.g., Orders & Results depends on Patient and Encounter for context). The core clinical modules are enabled in every edition; the Trial edition enables them with conservative default configuration, and the production editions enable them with progressively deeper default configuration.

### 2.3 Core Platform Modules

The core platform modules are M14 (Identity & Access), M15 (Configuration), M16 (Audit), M17 (Integration), M18 (Reporting), and M19 (Localization). These modules provide the platform-level capability that all other modules depend on: authentication and authorization, configuration management, audit trail, integration framework, reporting, and regional adaptation. The core platform modules are enabled in every edition; the platform cannot operate without them. The core platform modules depend on each other in defined ways but do not depend on category-specific modules, per the module dependency rules stated in `SYSTEM_ARCHITECTURE.md` Section 9.4.

### 2.4 Core Module Configuration Surface

Core modules expose a configuration surface that is broad by necessity: the configuration surface of a core module affects every other module that depends on it. The configuration surface is documented in `CONFIGURATION_ARCHITECTURE.md` and is versioned alongside the platform. Core module configuration is subject to the standard validation, versioning, and audit rules; configuration changes to core modules are typically higher-impact than changes to non-core modules and are treated with correspondingly greater governance rigour. Customers are advised to test core module configuration changes in a sandbox before applying them to production, in keeping with the configuration governance posture stated in `PRODUCT_BIBLE.md` Section 22.7.

### 2.5 Core Module Maturity

All core modules are at lifecycle stage Mature (LC4) as defined in `SYSTEM_ARCHITECTURE.md` Section 9.6, indicating steady-state operation with long-term support commitment. Core module maturity is a deliberate posture; the core modules are the foundation of the platform, and their stability is a prerequisite for the platform's decade horizon commitment stated in `PRODUCT_BIBLE.md` Section 30 (Future Vision). Core module evolution is governed by the platform's deprecation policy; breaking changes to core module contracts are rare and are managed through multi-version transition windows.

---

## 3. Specialty Modules

### 3.1 Definition of Specialty Modules

Specialty modules are modules that extend Ibn Hayan's capability beyond the core clinical and operational surface, typically to support the requirements of specific clinic types or specialty families. Specialty modules are not required for platform operation; they are enabled based on the customer's clinic type profile and operational reality. Specialty modules are add-ons in the commercial sense (they are priced separately when not included in the customer's edition) but are first-class modules in the architectural sense (they have their own contracts, configuration surfaces, and documentation). The distinction between core and specialty is a product-strategy decision; the distinction is documented in the module's catalogue entry.

### 3.2 Specialty Clinical Modules

The specialty clinical modules are M05 (Pharmacy) and the specialty-specific extensions referenced in `PRODUCT_BIBLE.md` Section 18.4. Pharmacy is enabled by default in the Essential edition in its basic dispensing configuration and is enabled in the Professional and Enterprise editions in its full clinical pharmacy configuration. Specialty-specific extensions (e.g., oncology-specific chemotherapy management, cardiology-specific device tracking) are enabled based on the customer's clinic type profile and are documented in the per-clinic-type documentation. Specialty clinical modules depend on the core clinical modules (M01 through M04) and on the platform modules.

### 3.3 Specialty Operational Modules

The specialty operational modules are M07 (Documents) and M08 (Notifications). These modules are enabled by default in the Essential edition and are core to the platform's operational surface. Documents provides document management, document templates, and document workflow; Notifications provides notifications, reminders, and alerts across channels. Both modules depend on the core clinical modules (M01, M02) and on the platform modules. Specialty operational modules are at lifecycle stage Mature (LC4) and are subject to the standard evolution and deprecation policies.

### 3.4 Specialty Administrative Modules

The specialty administrative modules are M11 (CRM), M12 (HR), and M13 (Workforce). These modules are not enabled by default in the Essential edition but are enabled by default in the Professional and Enterprise editions. CRM provides patient relationship management, outreach, and communications; HR provides human resources, payroll, and employee records; Workforce provides workforce scheduling, time and attendance, and credentials. Specialty administrative modules depend on the platform modules and on Patient (M01); some modules also depend on Encounter (M02) for context.

### 3.5 Specialty Financial Modules

The specialty financial modules are M09 (Billing) and M10 (Accounting). Billing is enabled by default in all production editions; Accounting is enabled by default in the Professional and Enterprise editions. Billing provides billing, claims, payments, and insurance submission; Accounting provides general ledger, accounts payable, accounts receivable, and financial reporting. Specialty financial modules depend on the platform modules, on Patient (M01), and on Encounter (M02) for context.

### 3.6 Specialty Module Configuration Surface

Specialty modules expose a configuration surface that is narrower than core modules but still substantial. The configuration surface is documented in `CONFIGURATION_ARCHITECTURE.md` and is versioned alongside the platform. Specialty module configuration is subject to the standard validation, versioning, and audit rules. Customers enabling a specialty module for the first time are advised to test the module's default configuration in a sandbox before applying it to production, particularly when the module's configuration affects clinical workflows.

---

## 4. Add-on Modules

### 4.1 Definition of Add-on Modules

Add-on modules are modules that extend Ibn Hayan's capability beyond the default module set for the customer's edition. Add-on modules are not a separate architectural category; they are modules that are not enabled by default in the customer's edition but can be enabled when the customer's operational reality requires them. The add-on designation is commercial, not architectural; an add-on module has the same architectural standing as a default-enabled module. Add-on modules are subject to the same lifecycle governance, the same configuration rules, and the same dependency constraints as default-enabled modules.

### 4.2 Add-on Module Availability

Add-on module availability is governed by the customer's edition. Essential edition supports add-on modules within the Essential module scope (e.g., advanced Billing configurations, basic CRM). Professional edition supports add-on modules within the Professional module scope (e.g., specialty-specific extensions, advanced Accounting configurations). Enterprise edition supports the full module catalogue with no module disabled by default; Enterprise customers do not typically need add-on modules because all modules are enabled. Add-on module enablement is recorded in the customer's subscription and is priced per the commercial catalogue.

### 4.3 Add-on Module Activation

Add-on module activation is the process by which a customer enables an add-on module in their tenant. The activation process is structured into stages: customer request, commercial ratification, module enablement, configuration refinement, validation, and operational readiness. The activation process is the same as the clinic type onboarding process defined in `CLINIC_TYPES.md` Section 9, with the module as the unit of onboarding rather than the clinic type. Activation events are auditable and are communicated to the customer's named contacts.

### 4.4 Add-on Module Deactivation

Add-on module deactivation is the process by which a customer disables an add-on module in their tenant. Deactivation is constrained by module dependencies: a module that is depended on by an enabled module cannot be deactivated. Deactivation may require data archival or migration, particularly when the module's data is referenced by other modules' data. Deactivation events are auditable and are communicated to the customer's named contacts. Deactivation is rare; customers typically deactivate modules only when their operational reality has changed (e.g., a clinic type closure, an organizational restructure).

### 4.5 Add-on Module Pricing

Add-on module pricing is published in the commercial catalogue and is the same for all customers at the same tier. Pricing is per module per month, with volume discounts applied when a customer enables multiple add-on modules. Add-on module pricing is separate from the edition subscription and is documented in the customer's subscription. Customers are advised to evaluate add-on modules in a sandbox before enabling them in production, particularly when the module's configuration affects clinical workflows.

---

## 5. Module Lifecycle Statuses

### 5.1 Lifecycle Stages

Module lifecycle is governed by the stages defined in `PRODUCT_BIBLE.md` Section 19.5 and `SYSTEM_ARCHITECTURE.md` Section 9.6. The lifecycle stages are normative; transitions are ratified by the Product Council (or the Architecture Council, depending on the transition type) and are recorded in the platform's CHANGELOG. The lifecycle stage of a module is documented in the module's catalogue entry and is visible to customers evaluating the module for production use.

| Stage | Code | Description |
|---|---|---|
| Candidate | LC1 | Module under design; not available to customers |
| Pilot | LC2 | Module deployed to pilot customers for validation |
| General Availability | LC3 | Module available to all customers per edition packaging |
| Mature | LC4 | Module in steady-state; long-term support commitment |
| Deprecation Candidate | LC5 | Module considered for deprecation; transition planning underway |
| Deprecated | LC6 | Module deprecated; new customers cannot enable; existing customers supported through transition window |
| Retired | LC7 | Module removed from the platform; transition window closed |

### 5.2 Lifecycle Transitions

Lifecycle transitions are governed by documented criteria and are ratified by the appropriate council. The transition from Candidate to Pilot requires a validated module design with documented contracts, configuration surface, and dependency graph. The transition from Pilot to General Availability requires validated operational feedback from at least three pilot deployments. The transition from General Availability to Mature is automatic after a defined period of stable operation. Other transitions are explicit and require council ratification. Transition events are recorded in the platform's CHANGELOG and are communicated to customers through the platform's change-management channel.

### 5.3 Lifecycle and Edition Interaction

Module lifecycle interacts with edition packaging: a module at Pilot stage is not enabled in any edition by default; a module at General Availability is enabled per the edition packaging rules; a module at Mature is enabled per the edition packaging rules with long-term support commitment; a module at Deprecation Candidate or Deprecated is enabled per the edition packaging rules but is not enabled for new customers. Lifecycle stage does not override edition packaging; a customer cannot enable a module that is not available in their edition, regardless of the module's lifecycle stage.

### 5.4 Lifecycle and Customer Impact

Module lifecycle transitions have varying customer impact. The transition from Candidate to Pilot has no customer impact (no customers were using the module). The transition from Pilot to General Availability has impact on pilot customers (their pilot deployment becomes a production deployment, with corresponding support tier changes). The transition from General Availability to Mature has minimal customer impact (the module's behaviour does not change; only the support commitment deepens). The transition to Deprecation Candidate or Deprecated has significant customer impact and is communicated with documented transition timelines.

### 5.5 Lifecycle Governance

Module lifecycle is governed by the Product Council for product-strategy transitions (addition, deprecation, retirement) and by the Architecture Council for architectural transitions (Pilot to General Availability, contract evolution). Both councils operate under documented charters and record their decisions in the platform's CHANGELOG. Customers are notified of lifecycle transitions through the platform's change-management channel, with notice periods scaled to the transition's customer impact. Lifecycle governance is a direct consequence of Principle P-7 (Documented Before Shipped) and Principle P-8 (Verified Practice Over Hypothetical Capability).

---

## 6. Module Catalog Table

### 6.1 Master Catalogue Table

The master module catalogue comprises 19 modules organized into five categories. The catalogue is the canonical reference for what modules exist, what each module does, and what category each module belongs to. Module codes M01 through M19 are stable identifiers used across the platform's configuration surface, documentation, and audit trail.

| Code | Module | Category | Purpose | Default Editions | Lifecycle Stage |
|---|---|---|---|---|---|
| M01 | Patient | Clinical | Patient registration, identity, demographics, consent, medical record lifecycle | All (including Trial subset) | Mature |
| M02 | Encounter | Clinical | Encounter management across outpatient, inpatient, emergency, telehealth | All (including Trial subset) | Mature |
| M03 | Clinical Documentation | Clinical | Clinical notes, structured documentation, templates, assessments | All (including Trial subset) | Mature |
| M04 | Orders & Results | Clinical | Order entry, result management, decision support, result reporting | All (including Trial subset) | Mature |
| M05 | Pharmacy | Clinical | Medication management, dispensing, inventory, clinical pharmacy | E1 (basic), E2, E3 | Mature |
| M06 | Scheduling | Operational | Appointment scheduling, resource scheduling, queue management | All (including Trial) | Mature |
| M07 | Documents | Operational | Document management, document templates, document workflow | All | Mature |
| M08 | Notifications | Operational | Notifications, reminders, alerts across channels | All | Mature |
| M09 | Billing | Financial | Billing, claims, payments, insurance submission | All | Mature |
| M10 | Accounting | Financial | General ledger, accounts payable, accounts receivable, financial reporting | E2, E3 | Mature |
| M11 | CRM | Administrative | Patient relationships, outreach, marketing, communications | E2, E3 (add-on for E1) | Mature |
| M12 | HR | Administrative | Human resources, payroll, employee records, benefits | E2, E3 | Mature |
| M13 | Workforce | Administrative | Workforce scheduling, time and attendance, credentials | E2, E3 | Mature |
| M14 | Identity & Access | Platform | Authentication, authorization, identity, session management | All | Mature |
| M15 | Configuration | Platform | Configuration management, validation, versioning, audit | All | Mature |
| M16 | Audit | Platform | Audit trail, audit query, audit reporting | All | Mature |
| M17 | Integration | Platform | Integration framework, connectors, partner surfaces | All | Mature |
| M18 | Reporting | Platform | Operational, analytical, regulatory reporting | All (read-only in Trial) | Mature |
| M19 | Localization | Platform | Language, calendar, regulatory framework, clinical coding system adaptation | All | Mature |

### 6.2 Category Distribution

The 19 modules are distributed across five categories as defined in `PRODUCT_BIBLE.md` Section 11.2. The category distribution reflects the platform's bounded context decomposition; each category corresponds to a coherent set of bounded contexts that share architectural and operational characteristics. The category distribution is reviewed when modules are added or removed; the categories themselves are stable and are not changed casually.

| Category | Module Count | Modules |
|---|---|---|
| Clinical | 5 | M01, M02, M03, M04, M05 |
| Operational | 3 | M06, M07, M08 |
| Financial | 2 | M09, M10 |
| Administrative | 3 | M11, M12, M13 |
| Platform | 6 | M14, M15, M16, M17, M18, M19 |

### 6.3 Module Code Stability

Module codes M01 through M19 are stable identifiers. Codes are not reused after a module is retired; a retired module's code is permanently reserved and is not assigned to a new module. Codes are not renamed casually; renaming follows the platform's deprecation policy and is communicated to customers with documented notice periods. The code stability is a direct consequence of Principle P-7 (Documented Before Shipped); stable codes are part of the platform's documented contract surface and are relied on by customers and integrators.

### 6.4 Module Documentation per Module

Each module has dedicated documentation under `docs/11_MODULES/`. Module documentation includes module purpose and scope, bounded context alignment, contracts (commands, queries, events, configuration schemas), dependencies on other modules, configuration surface, role and permission implications, integration surface, audit surface, reporting surface, known limitations, and lifecycle status. Module documentation is part of the definition of done for a module per Principle P-7; a module without complete documentation is not at General Availability, regardless of its operational status.

---

## 7. Module Dependencies Matrix

### 7.1 Dependency Rules

Module dependencies follow the bounded context dependencies defined in `SYSTEM_ARCHITECTURE.md` Section 7 and the dependency rules stated in Section 9.4. The dependency graph is acyclic; circular dependencies are forbidden and are treated as architectural defects. The graph is validated continuously; violations are treated as build failures. Module dependencies are explicit, documented, and validated at build time. Modules communicate through contracts (commands, queries, events, configuration schemas); direct data access across module boundaries is forbidden.

### 7.2 Dependency Direction

The high-level dependency direction is stated in `PRODUCT_BIBLE.md` Section 19.4. Platform modules (M14 through M19) depend on each other in defined ways but not on category-specific modules. Administrative modules (M11 through M13) depend on Platform modules and on Patient (M01). Financial modules (M09 and M10) depend on Platform modules and on Patient (M01) and Encounter (M02). Operational modules (M06 through M08) depend on Platform modules and on Patient (M01) and Encounter (M02). Clinical modules (M01 through M05) depend on Platform modules; Clinical modules may depend on each other in defined ways (e.g., Pharmacy depends on Orders & Results for medication orders).

### 7.3 Dependency Matrix

The table below summarizes the module dependency matrix. A checkmark indicates that the row module depends on the column module; a dash indicates no dependency. The matrix is symmetric in the sense that dependencies are acyclic; if module A depends on module B, module B does not depend on module A.

| Module | M01 | M02 | M03 | M04 | M05 | M06 | M07 | M08 | M09 | M10 | M11 | M12 | M13 | M14 | M15 | M16 | M17 | M18 | M19 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M01 Patient | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M02 Encounter | ✓ | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M03 Clinical Documentation | ✓ | ✓ | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M04 Orders & Results | ✓ | ✓ | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M05 Pharmacy | ✓ | ✓ | – | ✓ | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M06 Scheduling | ✓ | ✓ | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M07 Documents | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M08 Notifications | ✓ | ✓ | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M09 Billing | ✓ | ✓ | – | – | ✓ | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| M10 Accounting | ✓ | ✓ | – | – | – | – | – | – | ✓ | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M11 CRM | ✓ | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M12 HR | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M13 Workforce | – | – | – | – | – | – | – | – | – | – | – | ✓ | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M14 Identity & Access | – | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | – | – | ✓ |
| M15 Configuration | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | – | – | ✓ |
| M16 Audit | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ |
| M17 Integration | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| M18 Reporting | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ |
| M19 Localization | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | – |

### 7.4 Dependency Enforcement

Module dependencies are enforced at the platform layer. A module that depends on a disabled module cannot be enabled; the enablement attempt is rejected at validation time with a clear message identifying the missing dependency. A module that is depended on by an enabled module cannot be disabled; the disablement attempt is rejected at validation time with a clear message identifying the dependent module. The enforcement is symmetric: dependencies are checked in both directions to ensure the dependency graph remains acyclic and complete.

### 7.5 Dependency Evolution

Module dependencies evolve as modules evolve. A dependency change is a contract change and follows the platform's deprecation policy. New dependencies are added when a module's capability expands to require another module's surface; existing dependencies are removed when a module's capability is refactored to no longer require another module's surface. Dependency changes are documented in the module's documentation and are recorded in the platform's CHANGELOG. Customers are notified of dependency changes that affect their enabled module set, with notice periods scaled to the change's customer impact.

---

## 8. Module Maturity Levels

### 8.1 Maturity Definition

Module maturity is a quality dimension that complements lifecycle stage. While lifecycle stage indicates where a module is in its product lifecycle (Candidate through Retired), maturity indicates the depth of the module's operational validation. A module at General Availability (LC3) may have varying maturity; a module at Mature (LC4) has high maturity by definition. Maturity is assessed across several dimensions and is documented in the module's catalogue entry.

### 8.2 Maturity Dimensions

Module maturity is assessed across the dimensions stated in the table below. Each dimension is rated on a defined scale; the overall maturity rating is the lowest dimension rating. Maturity assessment is performed when a module transitions to General Availability and is reviewed annually thereafter.

| Maturity Dimension | Assessment Criteria |
|---|---|
| Operational deployment | Number of production deployments; breadth of customer profiles |
| Configuration coverage | Percentage of clinic types for which the module has a validated overlay |
| Documentation completeness | Completeness of module documentation per the definition of done |
| Integration surface | Breadth of validated integrations with external systems |
| Audit trail coverage | Percentage of consequential module actions that are audited |
| Performance under load | Validated performance under representative peak load |
| Failure mode coverage | Documented and tested failure modes; recovery procedures |

### 8.3 Maturity and Lifecycle Interaction

Maturity and lifecycle stage interact but are not equivalent. A module at Pilot (LC2) has by definition not yet achieved production maturity; its maturity assessment is documented as "in validation". A module at General Availability (LC3) has achieved production maturity but may have varying depth across the maturity dimensions; the assessment is documented per dimension. A module at Mature (LC4) has achieved high maturity across all dimensions and is in steady-state operation. The transition from General Availability to Mature is automatic after a defined period of stable operation, provided the maturity assessment supports the transition.

### 8.4 Maturity Disclosure

Module maturity is disclosed to customers through the module's catalogue entry and through the platform's documentation. Customers evaluating Ibn Hayan for a specific module should review the module's maturity assessment as part of their evaluation. Customers operating a module with lower maturity in a dimension relevant to their operational reality are advised to engage Ibn Hayan customer success for guidance on mitigations and on the module's maturity roadmap. Maturity disclosure is a direct consequence of Principle P-7 (Documented Before Shipped) and Principle P-8 (Verified Practice Over Hypothetical Capability).

### 8.5 Maturity Evolution

Module maturity evolves as the module operates in production. Maturity assessments are reviewed annually and are updated to reflect operational experience. A module's maturity may improve (e.g., as operational deployments accumulate) or may regress (e.g., if a contract evolution introduces a temporary documentation gap). Maturity regression is treated seriously; a module whose maturity regresses below the threshold for its lifecycle stage is reviewed by the Architecture Council and may be moved to a lower lifecycle stage pending maturity recovery.

---

## 9. Deprecated Modules

### 9.1 Deprecation Policy

Module deprecation is governed by the deprecation policy referenced in `PRODUCT_BIBLE.md` Section 19.5 and `SYSTEM_ARCHITECTURE.md` Section 9.6. Deprecation is the process by which a module is marked for eventual retirement. Deprecation is rare and is undertaken only when a module has become operationally obsolete (e.g., replaced by a more general module) or when the module's surface is no longer viable (e.g., due to regulatory changes). Deprecation follows a multi-year transition pathway that ensures existing customers are not stranded.

### 9.2 Deprecation Stages

The deprecation pathway comprises the stages stated in the table below. Each stage has documented entry and exit criteria; a module that does not meet the exit criteria for a stage does not progress to the next stage.

| Stage | Code | Description | Customer Impact |
|---|---|---|---|
| Deprecation Candidate | LC5 | Module considered for deprecation; transition planning underway | None (module operates normally) |
| Deprecated | LC6 | Module deprecated; new customers cannot enable; existing customers supported through transition window | New customers cannot enable; existing customers supported |
| Retired | LC7 | Module removed from the platform; transition window closed | Module not available; data migrated to replacement |

### 9.3 Transition Support

Transition support for deprecated modules is documented per module and is communicated to affected customers with documented timelines. Transition support includes data migration to the replacement module, configuration translation from the deprecated module's configuration surface to the replacement module's configuration surface, and user training on the replacement module's workflows. Transition support is provided at no additional cost to affected customers; the cost of transition is borne by Ibn Hayan as a consequence of the deprecation decision.

### 9.4 Currently Deprecated Modules

As of this document's version, no modules in the catalogue are deprecated. The catalogue comprises 19 modules all at lifecycle stage Mature (LC4). This state reflects the platform's stability posture; deprecation events are rare and are undertaken only when operationally justified. Customers are notified of any deprecation events through the platform's change-management channel with documented notice periods.

### 9.5 Deprecation Governance

Module deprecation is governed by the Product Council. A deprecation proposal includes the rationale for deprecation, the transition plan, the customer impact assessment, and the timeline. The Product Council ratifies or rejects the proposal; ratification triggers the deprecation pathway. Deprecation events are recorded in the platform's CHANGELOG and are communicated to affected customers through the platform's change-management channel, with notice periods scaled to the deprecation's customer impact.

---

## 10. Future Modules Pipeline

### 10.1 Pipeline Definition

The future modules pipeline is the catalogue of modules under consideration for addition to the platform. Pipeline modules are at various stages of the intake process defined in `PRODUCT_BIBLE.md` Section 17.4. The pipeline is reviewed quarterly by the Product Council; modules enter and exit the pipeline as intake progresses. Pipeline status is documented per module and is visible to customers through the platform's roadmap documentation.

### 10.2 Candidate Pipeline Modules

The following modules are candidates for catalogue expansion. Candidate status indicates that the module has been identified as a potential addition to the catalogue but has not completed the intake process. Candidate modules are not supported for production use; engagement with a customer requiring a candidate module is treated as a pilot engagement, not as a production customer engagement.

| Candidate Module | Bounded Context | Intake Stage | Indicative Timeline |
|---|---|---|---|
| Population Health | Population health management | Workflow analysis | 12–18 months |
| Research Data Management | Research data extraction and governance | Module gap assessment | 15–20 months |
| Telehealth (extended) | Extended telehealth capabilities beyond Encounter | Configuration coverage assessment | 9–12 months |
| Patient Portal (extended) | Extended patient portal capabilities beyond Notifications | Workflow analysis | 12–15 months |
| Supply Chain (extended) | Extended supply chain capabilities beyond Inventory | Module gap assessment | 18–24 months |
| Quality Measures | Quality measure reporting and tracking | Configuration coverage assessment | 9–12 months |

### 10.3 Pipeline Governance

The pipeline is governed by the Product Council. A module enters the pipeline when a coherent customer need emerges that the existing catalogue does not serve; a module exits the pipeline when it is ratified for catalogue addition or when the intake process determines that the module is not viable. Pipeline entries and exits are recorded in the platform's CHANGELOG. Customers are notified of pipeline changes through the platform's roadmap documentation, with detail scaled to the module's intake stage.

### 10.4 Pipeline and Customer Engagement

Customers requiring a capability not in the catalogue are referred to the platform evolution intake process. The requirement is assessed against the product principles and against the platform's bounded context decomposition; if accepted, the requirement is added to the pipeline as a candidate module. The customer may be engaged as a pilot customer for the candidate module, with pilot engagement terms that reflect their contribution to the intake process. This posture ensures that catalogue expansion is driven by validated operational reality rather than by hypothetical capability, in keeping with Principle P-8.

### 10.5 Pipeline Disclosure

Pipeline disclosure is balanced: customers need visibility into the platform's evolution to inform their own planning, but pipeline entries are not commitments and should not be relied on for production planning. The pipeline is disclosed through the platform's roadmap documentation, with each candidate module's intake stage and indicative timeline documented. Indicative timelines are not commitments; they are estimates based on current intake progress and may change as intake progresses. Customers are advised to engage Ibn Hayan customer success for guidance on pipeline interpretation.

---

## 11. Module Selection Guide

### 11.1 Selection Approach

Module selection is the process by which a customer determines which modules to enable in their tenant. Selection is informed by the customer's clinic type profile (per `CLINIC_TYPES.md` Section 6), the customer's edition (per `EDITIONS.md` Section 7), and the customer's operational reality. The selection guide below provides a structured approach to module selection; the guide is a starting point, not a prescription. Customers are advised to engage Ibn Hayan customer success for guidance on module selection tailored to their specific context.

### 11.2 Module Selection by Clinic Type Family

The table below provides module selection guidance by clinic type family. The guidance is summarized from `CLINIC_TYPES.md` Section 6.2; readers should consult that document for the full module recommendation matrix.

| Clinic Type Family | Always Enable | Enable Based on Operational Reality | Rarely Required |
|---|---|---|---|
| Primary care | M01–M05, M06–M09, M14–M19 | M10 Accounting, M11 CRM, M12 HR, M13 Workforce | None typical |
| Medical specialty | M01–M09, M14–M19 | M10 Accounting, M11 CRM, M12 HR, M13 Workforce | None typical |
| Surgical specialty | M01–M09, M14–M19 | M10 Accounting, M12 HR, M13 Workforce | M11 CRM (occasionally) |
| Emergency | M01–M19 (full catalogue) | None (full catalogue enabled) | None |
| Inpatient | M01–M19 (full catalogue) | None (full catalogue enabled) | None |
| Behavioral health | M01–M04, M06–M09, M14–M19 | M10 Accounting, M11 CRM | M05 Pharmacy (limited), M12 HR, M13 Workforce |
| Diagnostic/Pharmacy | M01, M04, M05 (C23), M07, M09, M14–M19 | M10 Accounting, M17 Integration | M02, M03, M06, M08, M11, M12, M13 |
| Rehab/LTC | M01–M05, M06–M09, M14–M19 | M10 Accounting, M11 CRM, M12 HR, M13 Workforce | None typical |

### 11.3 Module Selection by Edition

Module selection is constrained by edition. A customer on the Essential edition can enable modules within the Essential module scope; a customer on the Professional edition can enable modules within the Professional module scope; a customer on the Enterprise edition can enable the full catalogue. Customers whose module needs exceed their edition's scope are advised to upgrade to a higher edition; add-on module enablement is available within edition scope but is not a substitute for edition upgrade when the customer's needs have grown.

### 11.4 Module Selection by Customer Maturity

Module selection should be informed by the customer's operational maturity, not just by their clinic type profile. A customer at low operational maturity may benefit from a conservative module set initially, with modules added as their maturity grows. A customer at high operational maturity may benefit from a fuller module set initially, with the depth of configuration as the differentiator. Ibn Hayan customer success teams are trained to assess customer maturity and to recommend module selection that matches the customer's maturity profile, in keeping with the customer maturity posture stated in `PRODUCT_BIBLE.md` Section 9.

### 11.5 Module Selection Review

Module selection should be reviewed periodically as the customer's operational reality evolves. Reviews are typically aligned with the customer's quarterly business review (for Professional and Enterprise editions) or annual review (for Essential edition). Reviews consider whether the customer's enabled module set still matches their operational reality, whether modules should be added or deactivated, and whether the customer's edition should be upgraded or downgraded. Review events are auditable and are recorded in the customer's account history.

---

## 12. Related Documents

### 12.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 19 (Product Modules Overview) is the canonical module catalogue; Section 16 (Editions) defines the edition packaging rules; Section 18 (Supported Clinic Types) defines the clinic type context for module recommendations |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 9 (Modular Architecture) defines the architectural commitments that govern modules; Section 13 (Module Architecture) defines module boundary principles and contract surface; Section 7 (Domain-Driven Architecture) defines the bounded contexts that modules align with |

### 12.2 Downstream Documents

The following downstream documents elaborate aspects of modules referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition-specific module availability and add-on pricing |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Per-clinic-type module recommendations |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions per module |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope per module |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow definitions that span modules |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature catalogue organized by module |
| Module Architecture | `docs/01_ARCHITECTURE/MODULE_ARCHITECTURE.md` | Module internals: contracts, dependencies, communication, versioning, extension |
| Configuration Architecture | `docs/01_ARCHITECTURE/CONFIGURATION_ARCHITECTURE.md` | Configuration surface per module |

### 12.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Catalogue changes — additions, deprecations, lifecycle transitions — are ratified by the Product Council (or the Architecture Council for architectural transitions) and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
