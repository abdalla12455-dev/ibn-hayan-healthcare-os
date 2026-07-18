# Ibn Hayan Healthcare Operating System — Clinic Types

| Field | Value |
|---|---|
| Document Title | Clinic Types |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Product Elaboration — Clinic Type Catalogue |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a clinic type overlay is ratified or deprecated |
| Audience | Product leadership, implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for a specific clinic type |
| Scope | Clinic type catalogue (30 types), classification by specialty family and complexity, configuration overlay approach, recommended module composition per clinic type, onboarding workflow, configuration inheritance, customization boundaries, deprecation policy, lifecycle |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. Clinic type definitions in this document elaborate Section 18 of PRODUCT_BIBLE and do not override the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (stub with section placeholders only) |

---

## Table of Contents

1. Clinic Type Overview
2. Clinic Type Catalog
3. Single-Specialty Facilities
4. Multi-Specialty Facilities
5. Clinic Type Configuration
6. Clinic Type Module Mapping
7. Clinic Type Workflow Mapping
8. Clinic Type Customization
9. Clinic Type Onboarding
10. Clinic Type Templates
11. Future Clinic Types
12. Related Documents

---

## 1. Clinic Type Overview

### 1.1 Purpose of Clinic Type Cataloguing

Clinic types are the operational expression of healthcare delivery within an organization. A single organization may operate multiple clinic types — for example, a hospital network may operate primary care clinics, specialty clinics, emergency departments, and pharmacies within a single tenant. Clinic type governs workflow defaults, encounter templates, documentation requirements, order sets, and configuration overlays, as stated in `PRODUCT_BIBLE.md` Section 18.1. The clinic type catalogue is more granular than the organization type catalogue (Section 17 of `PRODUCT_BIBLE.md`) because clinic types reflect operational reality rather than organizational structure. Ibn Hayan supports 30 clinic types, each with a validated configuration overlay and a documented module composition.

### 1.2 Relationship to Organizational Hierarchy

The clinic type hierarchy operates within the facility level of the organizational hierarchy defined in `SYSTEM_ARCHITECTURE.md` Section 11 and comprises three levels: clinic type (CH1), service line (CH2), and care episode (CH3). A facility may operate multiple clinic types, organized into service lines, with care episodes occurring within each clinic type. The clinic type overlay is applied between the care-team configuration layer (L6) and the user configuration layer (L7) per `SYSTEM_ARCHITECTURE.md` Section 12.3, ensuring that clinic-type-specific configuration applies regardless of the organizational position. This positioning allows a physician who works across two clinic types (e.g., general practice in the morning, urgent care in the afternoon) to receive the appropriate workflow defaults based on the active clinic type, not based on the user account.

### 1.3 Catalogue Stability and Expansion

The clinic type catalogue is stable and is reviewed annually by the Product Council. Catalogue expansion follows the intake process defined in `PRODUCT_BIBLE.md` Section 17.4, with the additional requirement that a candidate clinic type's configuration overlay be validated against at least three operational deployments before becoming a default (Section 18.5 of `PRODUCT_BIBLE.md`). The three-deployment requirement is a deliberate rigour; it prevents the catalogue from accumulating overlays that have been validated only against a single customer's operational reality. Candidate clinic types that have not completed validation are listed in the regional adaptation roadmap (Section 31 of `PRODUCT_BIBLE.md`) with their validation status documented.

### 1.4 Catalogue Reading Order

This document is organized as both a linear read and a reference. Readers new to Ibn Hayan's clinic type model should read Sections 1, 2, 5, and 9 to understand the catalogue, configuration approach, and onboarding workflow. Readers implementing a specific clinic type should read the relevant subsection of Section 3 or 4 plus Sections 5, 6, and 7. Readers evaluating Ibn Hayan for a clinic type not yet in the catalogue should read Section 11. Section 12 lists the upstream and downstream documents that this catalogue references and that elaborate clinic-type-specific concerns.

---

## 2. Clinic Type Catalog

### 2.1 Master Catalogue Table

The master clinic type catalogue comprises 30 clinic types organized into eight specialty families. The catalogue is the canonical reference for what clinic types Ibn Hayan supports with validated configuration overlays. Codes C1 through C30 are stable identifiers used across the platform's configuration surface, documentation, and audit trail.

| Code | Clinic Type | Specialty Family | Typical Facility Size | Recommended Edition | Configuration Complexity | Regulatory Exposure |
|---|---|---|---|---|---|---|
| C01 | General Practice | Primary care | Small to mid | E1, E2 | Low | Low |
| C02 | Family Medicine | Primary care | Small to mid | E1, E2 | Low | Low |
| C03 | Internal Medicine | Primary care | Mid | E1, E2 | Low | Low |
| C04 | Pediatrics | Primary care (specialty) | Small to mid | E1, E2 | Medium | Medium (minor consent) |
| C05 | Obstetrics and Gynecology | Surgical specialty | Mid | E2, E3 | Medium | Medium (procedural consent) |
| C06 | Cardiology | Medical specialty | Mid | E2, E3 | High | High (implant data) |
| C07 | Dermatology | Medical specialty | Small to mid | E1, E2 | Medium | Low |
| C08 | Endocrinology | Medical specialty | Small to mid | E2 | Medium | Medium |
| C09 | Gastroenterology | Medical specialty | Mid | E2, E3 | Medium | Medium (procedural) |
| C10 | Neurology | Medical specialty | Mid | E2, E3 | High | Medium |
| C11 | Oncology | Medical specialty (high acuity) | Mid to large | E3 | Very high | Very high (controlled substances) |
| C12 | Ophthalmology | Surgical specialty | Mid | E2, E3 | High | Medium (procedural) |
| C13 | Orthopedics | Surgical specialty | Mid | E2, E3 | High | Medium (procedural) |
| C14 | Otolaryngology (ENT) | Surgical specialty | Mid | E2, E3 | Medium | Medium (procedural) |
| C15 | Psychiatry | Behavioral health | Small to mid | E2 | Medium | Very high (behavioral health records) |
| C16 | Pulmonology | Medical specialty | Mid | E2, E3 | Medium | Medium |
| C17 | Urology | Surgical specialty | Mid | E2, E3 | Medium | Medium (procedural) |
| C18 | Emergency Department | Emergency care | Large | E3 | Very high | Very high |
| C19 | Urgent Care Clinic | Emergency care | Mid | E2, E3 | High | Medium |
| C20 | Day Surgery | Surgical (outpatient) | Mid | E2, E3 | High | High (procedural, anesthesia) |
| C21 | Inpatient Ward | Inpatient care | Large | E3 | Very high | Very high |
| C22 | Intensive Care Unit | Critical care | Large | E3 | Very high | Very high |
| C23 | Pharmacy | Pharmacy | Small to mid | E1, E2, E3 | Medium | High (controlled substances) |
| C24 | Laboratory | Diagnostic | Small to mid | E2, E3 | High | High (regulated results) |
| C25 | Imaging Center | Diagnostic | Small to mid | E2, E3 | High | High (radiation safety) |
| C26 | Physical Therapy | Rehabilitation | Small to mid | E1, E2 | Low | Low |
| C27 | Occupational Therapy | Rehabilitation | Small to mid | E1, E2 | Low | Medium (workplace records) |
| C28 | Mental Health Clinic | Behavioral health | Small to mid | E2 | Medium | Very high (behavioral health records) |
| C29 | Substance Use Treatment | Behavioral health | Mid | E2, E3 | High | Very high (controlled substances, behavioral health) |
| C30 | Long-Term Care Facility | Long-term care | Mid to large | E2, E3 | High | High (residential care, controlled substances) |

### 2.2 Specialty Family Groupings

The 30 clinic types are organized into eight specialty families. The family grouping is descriptive and is used to organize configuration overlays, training pathways, and module recommendations. A clinic type's family does not determine its configuration; the clinic type's overlay determines its configuration. The family is a navigation aid, not a behavioural boundary.

| Family | Member Clinic Types | Common Configuration Themes |
|---|---|---|
| Primary care | C01, C02, C03, C04 | Longitudinal patient relationship; preventive care; chronic disease management |
| Medical specialty | C06, C07, C08, C09, C10, C11, C16 | Specialty-specific documentation templates; diagnostic test interpretation; longitudinal follow-up |
| Surgical specialty | C05, C12, C13, C14, C17, C20 | Procedural documentation; consent management; perioperative workflows |
| Emergency care | C18, C19 | Triage; high-acuity encounter management; rapid disposition |
| Inpatient and critical care | C21, C22 | Continuous monitoring; multi-disciplinary care; medication complexity |
| Behavioral health | C15, C28, C29 | Behavioral health record segregation; consent specificity; treatment plan documentation |
| Diagnostic and pharmacy | C23, C24, C25 | Result production; controlled substance tracking; integration with ordering clinicians |
| Rehabilitation and long-term care | C26, C27, C30 | Functional assessment; longitudinal care planning; residential care coordination |

### 2.3 Catalogue Completeness

The catalogue of 30 clinic types covers the operational reality of healthcare delivery for the customer tiers Ibn Hayan serves. The catalogue is not exhaustive of every clinic type that exists in healthcare globally; it is exhaustive of the clinic types that have been validated through the intake process defined in `PRODUCT_BIBLE.md` Section 17.4. Clinic types that are candidates for catalogue expansion are listed in Section 11 of this document. Customers operating a clinic type not in the catalogue are referred to the platform evolution intake process; engagement with such a customer is treated as a candidate for catalogue expansion, not as a production customer engagement, in keeping with Principle P-8 (Verified Practice Over Hypothetical Capability).

### 2.4 Catalogue Maintenance

The catalogue is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Catalogue changes — additions, deprecations, overlay revisions — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. Each clinic type's overlay has a documented version history; overlay revisions are versioned and validated through the same intake process that governs new clinic type addition, scaled to the scope of the revision. Customers are notified of overlay revisions through the platform's change-management channel and may adopt revisions on their own schedule within documented windows.

---

## 3. Single-Specialty Facilities

### 3.1 Definition and Scope

A single-specialty facility is a facility that operates one clinic type as its primary clinical service. Single-specialty facilities are the most common facility type for T1, T2, and T3 customers; they include solo practitioner clinics, single-specialty group practices, and dedicated diagnostic or treatment centres. Ibn Hayan supports 22 of the 30 clinic types as primary clinic types for single-specialty facilities; the remaining 8 (C18 Emergency Department, C21 Inpatient Ward, C22 Intensive Care Unit, and several multi-modal types) require multi-specialty facility configuration and are addressed in Section 4.

### 3.2 Primary Care Single-Specialty Facilities

Primary care single-specialty facilities operate clinic types C01 (General Practice), C02 (Family Medicine), C03 (Internal Medicine), or C04 (Pediatrics). These clinic types share a common configuration baseline focused on longitudinal patient relationships, preventive care, chronic disease management, and referral coordination. The default configuration overlay for each clinic type adjusts the baseline for specialty-specific requirements: pediatrics adds child growth tracking and immunization schedules, internal medicine adds chronic disease registry views, family medicine adds multi-generational family history tracking, and general practice provides the broadest baseline. Recommended editions are Essential (E1) for solo and small primary care practices and Professional (E2) for mid-sized practices.

### 3.3 Medical Specialty Single-Specialty Facilities

Medical specialty single-specialty facilities operate clinic types C06 through C11 and C16. These clinic types share a common configuration pattern focused on referral intake, diagnostic test interpretation, longitudinal follow-up, and coordination with primary care. The default configuration overlay for each clinic type adds specialty-specific documentation templates (e.g., cardiology includes ECG interpretation templates, oncology includes chemotherapy order sets and tumor staging documentation, neurology includes neurological examination templates). Recommended editions are Professional (E2) for most medical specialties and Enterprise (E3) for oncology due to its high acuity, controlled substance exposure, and integration complexity.

### 3.4 Surgical Specialty Single-Specialty Facilities

Surgical specialty single-specialty facilities operate clinic types C05, C12, C13, C14, C17, and C20. These clinic types share a common configuration pattern focused on procedural documentation, consent management, perioperative workflows, and post-procedure follow-up. The default configuration overlay for each clinic type adds specialty-specific procedural templates and order sets. Day surgery (C20) is a distinct case; it requires anesthesia documentation, perioperative monitoring, and discharge planning workflows that are not present in office-based surgical specialties. Recommended editions are Professional (E2) for office-based surgical specialties and Enterprise (E3) for day surgery due to its procedural complexity and regulatory exposure.

### 3.5 Diagnostic and Pharmacy Single-Specialty Facilities

Diagnostic and pharmacy single-specialty facilities operate clinic types C23 (Pharmacy), C24 (Laboratory), and C25 (Imaging Center). These clinic types share a common configuration pattern focused on result production, controlled substance tracking (for pharmacy), and integration with ordering clinicians across multiple external organizations. The default configuration overlay for each clinic type adds specialty-specific result templates, equipment integration surfaces, and regulatory reporting workflows. Pharmacies additionally require controlled substance dispensing records aligned to regional regulatory frameworks; laboratories additionally require quality control documentation and result certification workflows; imaging centres additionally require radiation dose tracking and image lifecycle management. Recommended editions span Essential (E1) for a small independent pharmacy through Enterprise (E3) for a regional diagnostic network.

### 3.6 Rehabilitation and Behavioral Health Single-Specialty Facilities

Rehabilitation and behavioral health single-specialty facilities operate clinic types C15 (Psychiatry), C26 (Physical Therapy), C27 (Occupational Therapy), C28 (Mental Health Clinic), and C29 (Substance Use Treatment). These clinic types share a common configuration pattern focused on longitudinal care planning, functional or behavioral assessment, and treatment plan documentation. Behavioral health clinic types (C15, C28, C29) require additional configuration for behavioral health record segregation per regional regulatory frameworks; this segregation is a configuration overlay on the standard patient record, not a separate record system. Recommended editions are Professional (E2) for behavioral health and rehabilitation facilities and Enterprise (E3) for substance use treatment facilities due to controlled substance exposure and regulatory complexity.

### 3.7 Single-Specialty Configuration Overlay Summary

The table below summarizes the configuration overlay scope for each single-specialty clinic type family. The overlay scope indicates which configuration surfaces are adjusted beyond the platform default; modules not listed use the platform default configuration.

| Clinic Type Family | Encounter Templates | Documentation Templates | Order Sets | Role Definitions | Permission Defaults | Reporting Views |
|---|---|---|---|---|---|---|
| Primary care | Yes | Yes | Yes | Yes | Yes | Yes |
| Medical specialty | Yes | Yes | Yes | Yes | Yes | Yes |
| Surgical specialty | Yes | Yes | Yes | Yes | Yes (procedural) | Yes |
| Diagnostic and pharmacy | Yes | Yes | Yes | Yes | Yes (controlled) | Yes (regulatory) |
| Rehabilitation | Yes | Yes | Limited | Yes | Yes | Yes |
| Behavioral health | Yes | Yes | Limited | Yes | Yes (segregated) | Yes (segregated) |

---

## 4. Multi-Specialty Facilities

### 4.1 Definition and Scope

A multi-specialty facility is a facility that operates two or more clinic types as primary clinical services, typically organized into service lines per `SYSTEM_ARCHITECTURE.md` Section 12.4. Multi-specialty facilities are common at T4, T5, and T6 customer tiers; they include multi-specialty group practices, hospitals, hospital networks, and academic medical centres. Ibn Hayan supports all 30 clinic types within multi-specialty facilities, with the configuration overlay for each clinic type applied independently and composed at the facility level. The composition is governed by the configuration layer model defined in `SYSTEM_ARCHITECTURE.md` Section 15.

### 4.2 Multi-Specialty Group Practices

Multi-specialty group practices operate multiple clinic types within a single facility, typically organized around primary care plus several medical or surgical specialties. The configuration approach is to apply each clinic type's overlay independently, with facility-level configuration defining shared services (e.g., a shared laboratory, a shared pharmacy, a shared scheduling pool) that operate across clinic types. The platform's permission framework handles cross-clinic-type access: a physician credentialed in two clinic types receives the appropriate workflow defaults based on the active clinic type, with access to patients across both clinic types governed by the standard permission scoping rules. Recommended edition is Professional (E2) for most multi-specialty group practices.

### 4.3 Hospitals

Hospitals operate the broadest scope of clinic types within a single facility, typically including emergency (C18), inpatient (C21), intensive care (C22), multiple medical and surgical specialties (C06 through C17), diagnostic services (C24, C25), pharmacy (C23), and rehabilitation (C26, C27). The configuration approach extends the multi-specialty group practice pattern with hospital-specific workflows: admission-discharge-transfer workflows, multi-disciplinary care planning, hospital-wide medication reconciliation, and bed management. Hospital configuration is the most complex Ibn Hayan supports and requires the Enterprise edition (E3) due to the scale, regulatory exposure, and integration complexity. Hospitals typically engage Ibn Hayan implementation consulting for configuration review and operational readiness assessment.

### 4.4 Hospital Networks

Hospital networks operate multiple hospital facilities under shared ownership, with each facility configured per Section 4.3 and network-level configuration defining shared services that operate across facilities (e.g., a network-wide laboratory, a network-wide pharmacy, a network-wide patient registry). The configuration approach uses the customer-level configuration layer (L3 in the layer model) to define network-wide defaults, with facility-level configuration (L4) overriding where local operational reality requires it. Network-wide reporting rolls up across facilities while respecting data residency per `SYSTEM_ARCHITECTURE.md` Section 11.5. Recommended edition is Enterprise (E3) with multi-region operation enabled where the network spans regions.

### 4.5 Academic Medical Centres

Academic medical centres operate as hospitals with additional configuration for teaching and research activities. The configuration approach extends the hospital pattern with teaching-specific overlays: trainee supervision workflows, teaching encounter documentation, research data extraction surfaces, and trainee credentialing. Research data extraction is performed through the platform's reporting module (M18) with strict access controls governed by the permission framework; research data is not extracted through direct data access, in keeping with Principle P-4 (Open Data, Open Standards) interpreted as controlled access rather than unrestricted access. Recommended edition is Enterprise (E3) with academic medical centre overlay applied at the facility level.

### 4.6 Emergency and Urgent Care Facilities

Emergency departments (C18) and urgent care clinics (C19) operate with configuration overlays focused on triage, high-acuity encounter management, and rapid disposition. Emergency departments require integration with regional emergency medical services, with hospital admission workflows, and with regional public health reporting; the configuration overlay includes these integration surfaces. Urgent care clinics operate with a lighter configuration overlay focused on walk-in patient management, point-of-care testing, and disposition to primary care or emergency department as appropriate. Recommended edition is Enterprise (E3) for emergency departments due to their integration complexity and Professional (E2) for urgent care clinics.

### 4.7 Multi-Specialty Configuration Composition

The table below summarizes how clinic type overlays compose within a multi-specialty facility. Composition is governed by the configuration layer model; conflicts between overlays are resolved by the precedence rules stated in `SYSTEM_ARCHITECTURE.md` Section 12.3.

| Composition Dimension | Composition Rule |
|---|---|
| Encounter templates | Per-clinic-type; the active clinic type determines the template |
| Documentation templates | Per-clinic-type; the active clinic type determines the template |
| Order sets | Per-clinic-type; the active clinic type determines available order sets |
| Role definitions | Per-clinic-type; a user's role in one clinic type does not determine their role in another |
| Permission defaults | Per-clinic-type; permission scoping is by clinic type within the facility |
| Reporting views | Per-clinic-type and per-facility; reports roll up to the facility level |
| Facility-level shared services | Defined at the facility configuration layer; override clinic-type defaults where appropriate |

---

## 5. Clinic Type Configuration

### 5.1 Configuration Overlay Approach

Each clinic type has a configuration overlay that adjusts the platform's default configuration to match the clinic type's operational reality. Overlays cover encounter templates, documentation structure, order sets, role definitions, permission defaults, and reporting views, as stated in `PRODUCT_BIBLE.md` Section 18.3. The overlay is applied at the clinic-type configuration layer, positioned between the care-team layer (L6) and the user layer (L7) per `SYSTEM_ARCHITECTURE.md` Section 12.3. This positioning ensures that clinic-type-specific configuration applies regardless of the user's organizational position, while remaining overridable at the user and session levels for individual practitioner preferences. Overlays are versioned, validated, and auditable in keeping with the configuration governance posture stated in `PRODUCT_BIBLE.md` Section 22.7.

### 5.2 Overlay Validation

Overlays are validated through workflow analysis with real practitioners of the clinic type, as stated in `PRODUCT_BIBLE.md` Section 18.3. An overlay that has not been validated is a candidate, not a default. Validation includes practitioner feedback on workflow fidelity, configuration coverage assessment for the clinic type's daily activities, and operational testing against representative patient scenarios. The validation process is documented per clinic type and is reviewed when the overlay is revised. Validation status is recorded in the clinic type's documentation and is visible to customers evaluating the overlay for production use.

### 5.3 Configuration Inheritance

Clinic type configuration inherits from the platform default and from the edition, with the clinic type overlay overriding as defined in `SYSTEM_ARCHITECTURE.md` Section 12.3. The full precedence order, from lowest to highest, is: platform default (L1), edition (L2), customer (L3), organization unit (L4), facility (L5), department (L6), care team (L7), clinic type overlay (positioned between L7 and L8 in the standard layer model), user (L8), session (L9). The clinic type overlay is applied between the care-team level and the user level, ensuring that clinic-type-specific configuration applies regardless of the organizational position, but can be overridden at the user and session levels for individual practitioner preferences. Inheritance is explicit and documented; a customer's clinic type configuration is auditable end-to-end.

### 5.4 Configuration Customization Boundaries

Customer-driven customization of clinic type overlays is governed by the configuration-driven philosophy stated in `PRODUCT_BIBLE.md` Section 22. Customers may refine overlays through the configuration surface, with refinements subject to the validation rules stated in `SYSTEM_ARCHITECTURE.md` Section 15.4. Customers may not modify the overlay's underlying definition; the overlay is a platform-owned artefact that is versioned and validated centrally. Customer refinements are applied as facility-level, department-level, or care-team-level configuration overrides, with the underlying overlay remaining unchanged. This posture allows customers to adapt the platform to their operational reality without forking the overlay, in keeping with Principle P-2 (Configuration Before Customization).

### 5.5 Configuration Examples

The table below provides illustrative examples of clinic type configuration overlays. The examples are representative, not exhaustive; the full overlay scope is documented in the per-clinic-type documentation under `docs/11_MODULES/`.

| Clinic Type | Overlay Example | Effect |
|---|---|---|
| C01 General Practice | Encounter template includes preventive care screening | Preventive care prompts appear during encounter documentation |
| C04 Pediatrics | Immunization schedule aligned to regional framework | Immunization prompts appear at age-appropriate encounters |
| C11 Oncology | Chemotherapy order set with dose calculation | Chemotherapy orders require dose calculation validation |
| C15 Psychiatry | Behavioral health record segregation | Behavioral health notes segregated from general medical record |
| C18 Emergency Department | Triage workflow with acuity scoring | Triage acuity score drives encounter prioritization |
| C23 Pharmacy | Controlled substance dispensing record | Dispensing events recorded with regulatory-required fields |

### 5.6 Configuration Governance

Clinic type configuration is governed by the customer's own configuration governance process, supported by the platform's tooling. The platform provides configuration sandboxes for testing overlay refinements before production application, configuration validation for verifying overlay consistency, configuration versioning for tracking overlay changes, and configuration audit for accountability. The customer's system administrator is responsible for using these tools to govern overlay refinement within the tenant. The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised.

---

## 6. Clinic Type Module Mapping

### 6.1 Module Recommendation Approach

Each clinic type has a recommended module composition that reflects the modules typically required for the clinic type's operational reality. The recommendation is a starting point, not a prescription; customers may add modules beyond the recommendation or, where edition rules permit, decline modules in the recommendation. Module composition is governed by the module dependency rules stated in `SYSTEM_ARCHITECTURE.md` Section 9.4; a customer cannot enable a module that depends on a disabled module. The recommendation is reviewed when the clinic type overlay is revised and is updated to reflect new modules or new module capabilities.

### 6.2 Module Recommendations by Clinic Type Family

The table below summarizes the recommended module composition for each clinic type family. Module codes are defined in `MODULES.md` and in `PRODUCT_BIBLE.md` Section 19. A checkmark indicates the module is recommended for the family; a dash indicates the module is not typically required.

| Module | Primary Care | Medical Specialty | Surgical Specialty | Emergency | Inpatient | Behavioral Health | Diagnostic/Pharmacy | Rehab/LTC |
|---|---|---|---|---|---|---|---|---|
| M01 Patient | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M02 Encounter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M03 Clinical Documentation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Limited | ✓ |
| M04 Orders & Results | ✓ | ✓ | ✓ | ✓ | ✓ | Limited | ✓ | Limited |
| M05 Pharmacy | Limited | ✓ | ✓ | ✓ | ✓ | Limited | ✓ (C23) | ✓ |
| M06 Scheduling | ✓ | ✓ | ✓ | Limited | Limited | ✓ | ✓ | ✓ |
| M07 Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M08 Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M09 Billing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M10 Accounting | Optional | Optional | Optional | Optional | ✓ | Optional | Optional | Optional |
| M11 CRM | Optional | Optional | Optional | Limited | Limited | Optional | Optional | Optional |
| M12 HR | Optional | Optional | Optional | ✓ | ✓ | Optional | Optional | ✓ |
| M13 Workforce | Optional | Optional | Optional | ✓ | ✓ | Optional | Optional | ✓ |
| M14 Identity & Access | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M15 Configuration | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M16 Audit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M17 Integration | Optional | Optional | Optional | ✓ | ✓ | Optional | ✓ | Optional |
| M18 Reporting | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| M19 Localization | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 6.3 Specialty-Specific Module Extensions

Some clinic types require specialty-specific module extensions beyond the platform's core modules, as stated in `PRODUCT_BIBLE.md` Section 18.4. These extensions are first-class modules in their own right, with their own contracts, configuration surfaces, and documentation. Specialty-specific modules are not bolt-on customizations; they are part of the platform's module catalogue and are subject to the same lifecycle governance as core modules. The current specialty-specific module extensions are documented in `MODULES.md` Section 3. New specialty-specific modules are added through the same intake process as new clinic types, with the additional requirement that the module's bounded context be explicitly defined and aligned with the platform's domain-driven architecture.

### 6.4 Module Composition Examples

The table below provides illustrative module composition examples for representative clinic types. The examples show the typical module set for a customer at the recommended edition; actual composition varies based on customer-specific operational reality.

| Clinic Type | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| C01 General Practice | E1 | M01, M02, M03, M04, M05 (basic), M06, M07, M08, M09, M14–M19 | M11 CRM, M12 HR |
| C11 Oncology | E3 | M01–M19 (all) plus oncology-specific extension | None (full catalogue) |
| C18 Emergency Department | E3 | M01–M19 (all) | None (full catalogue) |
| C23 Pharmacy | E1, E2, or E3 | M01, M04, M05, M07, M09, M14–M19 | M10 Accounting, M17 Integration |
| C28 Mental Health Clinic | E2 | M01, M02, M03, M04, M06, M07, M08, M09, M14–M19 | None typical |
| C30 Long-Term Care Facility | E2 or E3 | M01, M02, M03, M04, M05, M06, M07, M08, M09, M12, M13, M14–M19 | M10 Accounting, M11 CRM |

### 6.5 Module Composition Governance

Module composition is governed by the customer's edition and by the module dependency rules. A customer cannot enable a module that is not available in their edition; a customer cannot enable a module that depends on a disabled module. Module enablement is recorded in the audit trail and is subject to the customer's configuration governance process. Module enablement changes — adding or removing modules — are governed by the same change management process as other configuration changes, with the additional consideration that removing a module may require data archival or migration.

---

## 7. Clinic Type Workflow Mapping

### 7.1 Workflow Mapping Approach

Each clinic type has a recommended set of workflows that reflect the clinic type's operational reality. The recommendation is a starting point; customers may refine workflows through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md`. Workflow mapping is governed by the workflow engine philosophy stated in `SYSTEM_ARCHITECTURE.md` Section 16; workflows are defined declaratively through configuration, not through source-level implementation. The clinic type overlay includes default workflow definitions that the customer may adopt, modify, or replace within the workflow engine's configuration framework.

### 7.2 Workflow Categories by Clinic Type Family

The table below summarizes the workflow categories typically required for each clinic type family. Workflow categories are defined in `WORKFLOWS.md` Section 2; the categories are clinical, administrative, financial, integration, and notification.

| Clinic Type Family | Clinical Workflows | Administrative Workflows | Financial Workflows | Integration Workflows | Notification Workflows |
|---|---|---|---|---|---|
| Primary care | Preventive care, chronic disease management | Appointment, recall | Billing, claim submission | Lab, imaging, referral | Appointment reminders, results |
| Medical specialty | Referral intake, longitudinal follow-up | Appointment, referral coordination | Billing, claim submission | Lab, imaging, primary care | Results, follow-up reminders |
| Surgical specialty | Pre-procedure, procedure, post-procedure | Scheduling, consent | Billing, claim submission | Lab, imaging, anesthesia | Pre-op reminders, post-op follow-up |
| Emergency | Triage, encounter, disposition | Bed management, transfer | Billing, claim submission | EMS, lab, imaging, pharmacy | Critical results, consult requests |
| Inpatient | Admission, daily care, discharge | Bed management, transfer | Billing, claim submission | Lab, imaging, pharmacy | Critical results, consult requests |
| Behavioral health | Assessment, treatment plan, follow-up | Appointment, recall | Billing, claim submission | Limited (privacy) | Appointment reminders |
| Diagnostic/Pharmacy | Result production, dispensing | Order management | Billing, claim submission | Ordering clinician, equipment | Result availability, dispensing |
| Rehab/LTC | Functional assessment, care planning | Scheduling, care coordination | Billing, claim submission | Primary care, pharmacy | Care plan reminders |

### 7.3 Workflow Customization

Customers may customize workflows within the workflow engine's configuration framework, subject to the edition-specific depth limits stated in `EDITIONS.md` Section 11. Custom workflows are subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The workflow customization posture is a direct consequence of Principle P-2 (Configuration Before Customization) and is elaborated in `WORKFLOWS.md` Section 12.

### 7.4 Workflow Examples

The table below provides illustrative workflow examples for representative clinic types. The examples are representative, not exhaustive; the full workflow catalogue per clinic type is documented in the per-clinic-type documentation under `docs/11_MODULES/`.

| Clinic Type | Workflow Example | Trigger | Steps | Outcome |
|---|---|---|---|---|
| C01 General Practice | Preventive care recall | Patient age or condition | Identify due screenings, schedule appointment, document screening | Preventive care documented; next recall scheduled |
| C11 Oncology | Chemotherapy administration | Chemotherapy order | Verify order, calculate dose, prepare, administer, monitor | Administration documented; monitoring scheduled |
| C18 Emergency Department | Triage and disposition | Patient arrival | Triage, assess, treat or stabilize, disposition | Patient admitted, transferred, or discharged |
| C23 Pharmacy | Prescription dispensing | Prescription received | Verify, dispense, counsel, record | Dispensing recorded; patient notified |
| C30 Long-Term Care Facility | Daily care round | Scheduled time | Assess, document, administer medications, update care plan | Round documented; care plan updated |

---

## 8. Clinic Type Customization

### 8.1 Customization Boundaries

Clinic type customization is governed by the configuration-driven philosophy stated in `PRODUCT_BIBLE.md` Section 22 and by the clinic type overlay approach stated in Section 18.3 of the same document. Customization, in the sense of source-level modification of clinic type behaviour, is not offered. What is offered is configuration refinement — the ability of the customer to adapt the clinic type overlay to their operational reality through the configuration surface. The boundary between configuration and customization is explicit, governed by the platform's extensibility strategy defined in `SYSTEM_ARCHITECTURE.md` Section 22, and is the same boundary that governs all platform customization.

### 8.2 Customer Refinement Surface

Customers may refine clinic type overlays through the configuration surface at the facility, department, care team, user, and session levels. Refinements are subject to the validation rules stated in `SYSTEM_ARCHITECTURE.md` Section 15.4 and are versioned and auditable per Sections 15.5 and 15.6. The refinement surface is broad: customers may adjust encounter templates, documentation templates, order sets, role definitions, permission defaults, and reporting views within the framework defined by the overlay. Refinements that would conflict with the overlay's underlying definition are rejected at validation time; the overlay's underlying definition is platform-owned and is not customer-modifiable.

### 8.3 Customization Prohibited Scenarios

The following customization scenarios are prohibited and are rejected by the platform's validation framework. The prohibition list is normative; deviations are defects and are corrected through the amendment mechanism.

| Prohibited Customization | Reason | Resolution |
|---|---|---|
| Modifying the overlay's underlying definition | Overlay is platform-owned; modification would fork the platform | Customer refinement applied as facility-level override |
| Bypassing clinic type segregation | Behavioral health and certain other clinic types require record segregation | Segregation enforced at platform layer; not customer-modifiable |
| Removing controlled substance tracking | Regulatory requirement; not optional | Tracking enforced at platform layer; not customer-modifiable |
| Disabling audit for clinic-type-specific actions | Audit is a primitive per Principle P-13 | Audit enforced at platform layer; not customer-modifiable |
| Modifying clinic type code | Code is stable identifier used across platform | Code is immutable once catalogue entry is ratified |

### 8.4 Customization Governance

Customer-driven clinic type customization is governed by the customer's own configuration governance process, supported by the platform's tooling. The platform provides configuration sandboxes for testing customization before production application, configuration validation for verifying customization consistency, configuration versioning for tracking customization changes, and configuration audit for accountability. The customer's system administrator is responsible for using these tools to govern customization within the tenant. The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised, in keeping with the configuration governance posture stated in `PRODUCT_BIBLE.md` Section 22.7.

### 8.5 Customization Examples

The table below provides illustrative examples of customer-driven clinic type customization. The examples are representative; the full customization surface is documented in the per-clinic-type documentation.

| Clinic Type | Customization Example | Configuration Layer | Effect |
|---|---|---|---|
| C01 General Practice | Add region-specific immunization schedule | Facility | Immunization prompts reflect regional schedule |
| C11 Oncology | Adjust chemotherapy dose calculation formula | Department | Dose calculation uses organization-specific formula |
| C18 Emergency Department | Add regional triage protocol | Facility | Triage workflow follows regional protocol |
| C23 Pharmacy | Add regional controlled substance form | Facility | Dispensing records include regional-required fields |
| C28 Mental Health Clinic | Adjust behavioral health record segregation rules | Department | Segregation reflects organization-specific policy |
| C30 Long-Term Care Facility | Customize daily care round template | Care team | Round template reflects care team's workflow |

---

## 9. Clinic Type Onboarding

### 9.1 Onboarding Workflow

Clinic type onboarding is the process by which a customer configures Ibn Hayan for a clinic type at a facility. The onboarding workflow is structured into stages, each governed by documented criteria and recorded in the platform's audit trail. The workflow is the same across clinic types, with stage durations and complexity scaled to the clinic type's configuration complexity rating stated in Section 2.1.

| Stage | Code | Description |
|---|---|---|
| Clinic type selection | O1 | Customer selects the clinic type to onboard at the facility |
| Overlay activation | O2 | Clinic type overlay applied to facility configuration |
| Module enablement | O3 | Recommended modules enabled per Section 6 |
| Configuration refinement | O4 | Customer refines overlay through configuration surface |
| Validation | O5 | Configuration validated through sandbox testing |
| User provisioning | O6 | Users provisioned with clinic-type-appropriate roles |
| Operational readiness | O7 | Operational readiness assessed; first encounter targeted |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle stage updated |

### 9.2 Onboarding Roles and Responsibilities

Clinic type onboarding involves multiple roles on the customer side and on the Ibn Hayan side. The roles and their responsibilities are stated in the table below, with role definitions in `USER_ROLES.md`.

| Role | Responsibility |
|---|---|
| Customer system administrator | Overall onboarding coordination; configuration changes |
| Customer clinical lead | Clinical workflow validation; clinician training |
| Customer facility administrator | Facility-specific configuration; user provisioning |
| Ibn Hayan customer success | Onboarding guidance; overlay walkthrough |
| Ibn Hayan implementation consulting (optional) | Configuration review; operational readiness assessment |

### 9.3 Onboarding Timeline

Onboarding timeline varies by clinic type complexity and customer maturity. The table below provides indicative timelines for representative clinic types; actual timelines are agreed during onboarding planning and are documented in the customer's onboarding plan.

| Clinic Type | Configuration Complexity | Indicative Onboarding Timeline |
|---|---|---|
| C01 General Practice | Low | 1–2 weeks |
| C04 Pediatrics | Medium | 2–3 weeks |
| C11 Oncology | Very high | 8–12 weeks |
| C18 Emergency Department | Very high | 10–14 weeks |
| C23 Pharmacy | Medium | 2–4 weeks |
| C28 Mental Health Clinic | Medium | 3–4 weeks |
| C30 Long-Term Care Facility | High | 6–8 weeks |

### 9.4 Onboarding Validation

Onboarding validation is the process of verifying that the clinic type configuration is operationally ready. Validation includes configuration validation (per `SYSTEM_ARCHITECTURE.md` Section 15.4), workflow validation (testing each configured workflow against representative scenarios), user acceptance testing (clinicians performing representative tasks in the sandbox), and operational readiness assessment (a structured review of the configuration against the customer's operational reality). Validation results are documented and are required for the go-live stage transition. A clinic type that has not completed validation is not declared operational; declaring operation without validation is a defect and is corrected through rollback to the validation stage.

### 9.5 Onboarding Audit and Communication

Every onboarding event is auditable. The audit trail captures who initiated each stage transition, when, with what authorization, and what configuration was applied. Onboarding events are communicated to the customer's named contacts before, during, and after each stage transition, with communication cadence scaled to the clinic type's complexity. Customers are notified of upcoming module enablement, of configuration changes, and of stage transitions. The communication is itself recorded in the audit trail, providing end-to-end accountability for the onboarding event.

---

## 10. Clinic Type Templates

### 10.1 Template Definition

Clinic type templates are pre-configured bundles of configuration artefacts that accelerate clinic type onboarding. A template includes the clinic type overlay, the recommended module composition, default workflow definitions, default role definitions, default permission scopes, and default reporting views. Templates are versioned alongside the platform and are reviewed when the underlying overlay or module set evolves. Templates are not prescriptive; customers may modify any element of a template through the configuration surface, with modifications subject to the standard validation, versioning, and audit rules.

### 10.2 Template Catalogue

The template catalogue mirrors the clinic type catalogue; each of the 30 clinic types has a corresponding template. Templates are organized by specialty family for navigation, with cross-family templates available for multi-specialty facilities. The template catalogue is documented in the onboarding guide and is versioned alongside the platform. Template revisions are communicated to customers through the platform's change-management channel, with revision adoption on the customer's schedule within documented windows.

### 10.3 Template Composition

The table below summarizes the composition of a clinic type template. Each component is a versioned artefact; the template as a whole is a versioned bundle of these artefacts.

| Template Component | Source | Customizable |
|---|---|---|
| Clinic type overlay | Platform-owned | No (refinements through override) |
| Module composition recommendation | Platform-owned | Yes (within edition rules) |
| Default workflow definitions | Platform-owned | Yes (through workflow engine configuration) |
| Default role definitions | Platform-owned | Yes (through role framework) |
| Default permission scopes | Platform-owned | Yes (within framework) |
| Default reporting views | Platform-owned | Yes (through reporting module) |

### 10.4 Template Lifecycle

Templates have a lifecycle that mirrors the clinic type lifecycle. A template is introduced when the clinic type is added to the catalogue; a template is revised when the overlay, module set, or workflow definitions evolve; a template is deprecated when the clinic type is deprecated, with transition support for customers using the template. Template lifecycle transitions are ratified by the Product Council and are recorded in the platform's CHANGELOG. Customers are notified of template lifecycle transitions through the platform's change-management channel.

### 10.5 Template Application

Templates are applied during the onboarding workflow's overlay activation stage (O2). The template's components are applied as the facility's initial configuration, with the customer's refinements applied as overrides during the configuration refinement stage (O4). Template application is recorded in the audit trail, with the template's version recorded alongside the application. A customer may re-apply a template after a template revision; re-application is treated as a configuration change and is subject to the standard validation, versioning, and audit rules.

---

## 11. Future Clinic Types

### 11.1 Candidate Clinic Types

The following clinic types are candidates for catalogue expansion. Candidate status indicates that the clinic type has been identified as a potential addition to the catalogue but has not completed the intake process defined in `PRODUCT_BIBLE.md` Section 17.4. Candidate clinic types are not supported for production use; engagement with a customer operating a candidate clinic type is treated as a pilot engagement, not as a production customer engagement.

| Candidate Clinic Type | Specialty Family | Intake Stage | Indicative Timeline |
|---|---|---|---|
| Dental clinic | Dental | Workflow analysis | 12–18 months |
| Veterinary clinic | Veterinary | Not started | Not scheduled |
| Cosmetic surgery centre | Surgical specialty | Configuration coverage assessment | 9–12 months |
| Fertility clinic | Medical specialty | Module gap assessment | 12–15 months |
| Dialysis centre | Medical specialty (high acuity) | Pilot deployment | 6–9 months |
| Sports medicine clinic | Medical specialty | Workflow analysis | 12–15 months |
| Travel medicine clinic | Primary care (specialty) | Configuration coverage assessment | 9–12 months |
| Home healthcare service | Long-term care | Pilot deployment | 6–9 months |
| Wellness centre | Primary care (preventive) | Workflow analysis | 15–18 months |
| Aesthetic clinic | Medical specialty | Workflow analysis | 12–15 months |

### 11.2 Intake Process

The intake process for a candidate clinic type is the process defined in `PRODUCT_BIBLE.md` Section 17.4, with the additional requirement that the candidate clinic type's configuration overlay be validated against at least three operational deployments before becoming a default. The intake stages are: workflow analysis, configuration coverage assessment, module gap assessment, validation (pilot deployment), and catalogue amendment. Each stage has documented entry and exit criteria; a candidate that does not meet the exit criteria for a stage does not progress to the next stage. The intake process is deliberately demanding; catalogue expansion that bypasses the process produces a clinic type that is nominally supported but operationally defective, in violation of Principle P-8 (Verified Practice Over Hypothetical Capability).

### 11.3 Pilot Engagement

Pilot engagement is the validation stage of the intake process. A pilot customer operates the candidate clinic type under a pilot agreement, with the candidate overlay applied to their tenant and with operational feedback collected and incorporated into the overlay. Pilot customers are partners in the catalogue expansion process, not standard customers; they accept the operational implications of running a candidate overlay and are compensated through pilot engagement terms that reflect their contribution. Pilot engagement results are documented per clinic type and are reviewed by the Product Council before the clinic type is ratified for catalogue addition.

### 11.4 Catalogue Expansion Cadence

The catalogue is reviewed annually by the Product Council. Catalogue expansion is not driven by market opportunity alone; it is driven by validated operational reality. A candidate clinic type that has completed pilot validation but has not been ratified is held in the candidate state until the next Product Council review. This cadence ensures that catalogue expansion is deliberate and that the catalogue does not accumulate clinic types that have not been validated across multiple operational deployments.

### 11.5 Catalogue Deprecation

Catalogue deprecation is the process by which a clinic type is removed from the catalogue. Deprecation is rare and is undertaken only when a clinic type has become operationally obsolete (e.g., replaced by a more general clinic type) or when regulatory changes have made the clinic type's overlay unviable. Deprecation follows a multi-year transition pathway: the clinic type is marked as deprecated, new customers cannot onboard it, existing customers are supported through a documented transition window, and the clinic type is removed from the catalogue when the transition window closes. Deprecation events are recorded in the platform's CHANGELOG and are communicated to affected customers with documented transition timelines.

---

## 12. Related Documents

### 12.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) is the canonical clinic type catalogue; Section 17 (Supported Healthcare Organizations) defines the organization type context; Section 19 (Product Modules Overview) defines the module catalogue referenced in Section 6 |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 11 (Organization Hierarchy) defines the hierarchy within which clinic types operate; Section 12 (Clinic Hierarchy) defines the clinic type hierarchy; Section 15 (Configuration Strategy) defines the configuration layer model referenced throughout |

### 12.2 Downstream Documents

The following downstream documents elaborate aspects of clinic types referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and per-clinic-type module recommendations |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in clinic type configuration |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope defaults per clinic type |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow definitions per clinic type |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per clinic type |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition recommendations per clinic type |
| Module Architecture | `docs/01_ARCHITECTURE/MODULE_ARCHITECTURE.md` | Module internals that clinic type overlays reference |
| Configuration Architecture | `docs/01_ARCHITECTURE/CONFIGURATION_ARCHITECTURE.md` | Configuration surface that clinic type overlays compose |

### 12.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Catalogue changes — additions, deprecations, overlay revisions — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
