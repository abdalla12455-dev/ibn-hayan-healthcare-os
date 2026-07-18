# Ibn Hayan Healthcare Operating System
## General Practice & Multi-Specialty Clinics

| Field | Value |
|---|---|
| Document Title | General Practice & Multi-Specialty Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the general practice or multi-specialty overlay is amended |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for general practice or multi-specialty facilities |
| Scope | Specialty overview, target facilities, recommended modules, specialty workflows, conceptual data models, forms and templates, reports and analytics, third-party integrations, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for general practice (clinic type C01) and multi-specialty clinic facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, specialty-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the general practice and multi-specialty clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Specialty Workflows
5. Specialty Data Models
6. Forms & Templates
7. Reports & Analytics
8. Third-Party Integrations
9. Role & Permission Recommendations
10. Configuration Defaults
11. Onboarding Checklist
12. Sample Use Cases
13. Best Practices
14. Related Documents

---

## 1. Specialty Overview

### 1.1 Definition and Scope of Practice

General practice, also referred to as family medicine in many jurisdictions, is the first point of contact between patients and the formal healthcare system. The general practitioner provides comprehensive, longitudinal, person-centred care across the full age spectrum and across undifferentiated presentations, managing acute illness, chronic disease, preventive health, mental health presentations, and coordination of care with other specialties. Scope of practice is broad by design and is intentionally undifferentiated; the general practitioner is the clinician who sees the patient first, regardless of presenting complaint, and who retains clinical responsibility for ongoing care even when other clinicians are involved episodically. Ibn Hayan treats general practice as clinic type C01 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated Low and recommended editions Essential (E1) and Professional (E2) per `PRODUCT_BIBLE.md` Section 18.

### 1.2 Patient Population and Clinical Activities

The general practice patient population spans from neonates through geriatric patients, with the full range of acute, chronic, preventive, and behavioural presentations encountered in routine primary care. Key clinical activities include comprehensive history and examination, diagnosis and management of common acute conditions, longitudinal management of chronic diseases such as diabetes, hypertension, asthma, and chronic obstructive pulmonary disease, administration of immunizations, conduct of preventive health screenings, coordination of referrals to medical and surgical specialties, and ongoing medication management across multiple prescribers. General practice is also the primary locus of continuity of care; the general practitioner typically holds the most complete longitudinal record of the patient's health, which places particular weight on documentation quality, problem list integrity, and medication reconciliation. Ibn Hayan's general practice overlay is designed to support these activities without imposing specialty-specific structure that would compromise the breadth of the encounter.

### 1.3 Why General Practice Needs Specialized Configuration

General practice appears, on the surface, to require less specialized configuration than cardiology or ophthalmology; the specialty's breadth is its defining characteristic, and an overly narrow encounter template would compromise the practitioner's ability to document the full range of presenting complaints. Specialized configuration is nonetheless required, because general practice has distinct operational patterns: high encounter volume, short encounter duration, high frequency of repeat visits, strong reliance on preventive care reminders, intensive referral coordination, and chronic disease registry management. Ibn Hayan's general practice overlay addresses these patterns through encounter templates that support both focused acute visits and structured chronic disease visits, through preventive care reminder rules aligned to regional frameworks, through chronic disease registries with cohort views, and through referral management workflows that close the loop when the specialist reports back. The overlay is documented in `CLINIC_TYPES.md` Section 3.2 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Multi-Specialty Facilities

General practice frequently operates within multi-specialty facilities rather than as a standalone clinic type. A multi-specialty group practice may operate general practice alongside internal medicine, pediatrics, and several medical and surgical specialties, with shared services such as a laboratory, pharmacy, and scheduling pool. Ibn Hayan supports this composition through the multi-specialty configuration approach documented in `CLINIC_TYPES.md` Section 4, with each clinic type's overlay applied independently and composed at the facility level. The general practice overlay composes cleanly with other primary care overlays (family medicine, internal medicine, pediatrics) and with the medical and surgical specialty overlays, allowing a multi-specialty facility to operate a coherent primary care service line alongside its specialty service lines.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

General practice operates across the full facility size spectrum, from solo practitioner clinics at customer tier T1 through primary care networks at tier T5. The most common configurations are solo practices (one general practitioner, one to two support staff), small group practices (two to five general practitioners sharing administrative infrastructure), mid-sized group practices (six to fifteen practitioners with embedded nursing and allied health), and primary care networks (multiple practice sites under shared ownership with centralized administration). Ibn Hayan's Essential edition (E1) is sized for solo and small group practices per `PRODUCT_BIBLE.md` Section 16.4, while the Professional edition (E2) is the typical fit for mid-sized group practices and small primary care networks per Section 16.5. Enterprise edition (E3) is generally not required for general practice unless the facility is part of a hospital network or operates alongside inpatient services.

### 2.2 Ownership Patterns and Geographic Considerations

General practice facilities operate under diverse ownership patterns, including independently owned private practices, physician-owned group practices, corporate-owned primary care networks, government-operated public health clinics, and non-governmental organization-operated community clinics. Geographic considerations shape the configuration: rural practices typically require more developed offline-first behaviour because connectivity is intermittent, urban practices typically require more developed appointment management because of higher patient volume, and practices operating across multiple regions require multi-region configuration with attention to regional regulatory frameworks and clinical coding systems. Ibn Hayan's offline-first posture, documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 (P11), supports rural practices directly, while the Localization module (M19) handles regional regulatory and coding system variation per `PRODUCT_BIBLE.md` Section 19.2.

### 2.3 Regulatory Environment

General practice operates within a regulatory environment that varies by region but typically includes patient record retention requirements, immunization reporting to public health authorities, controlled substance prescribing oversight, and privacy regulations governing patient record access and disclosure. General practitioners frequently serve as the patient's designated primary care provider, which in many jurisdictions creates specific record custodianship obligations. Ibn Hayan's Audit module (M16) records every patient record access, the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5), and the Localization module (M19) applies regional regulatory frameworks. Customers are responsible for confirming that the regional framework applied to their tenant matches their jurisdiction's requirements; the platform's configuration surface supports this validation but does not substitute for legal review of regulatory compliance.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for general practice reflects the clinic type's operational reality: high patient throughput, longitudinal record management, intensive referral coordination, and chronic disease management. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6.4; customers may add modules beyond the recommendation or, where edition rules permit, decline modules. Module composition is governed by the dependency rules stated in `SYSTEM_ARCHITECTURE.md` Section 13.4 and by the edition packaging rules stated in `PRODUCT_BIBLE.md` Section 16.7.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record is the foundation of general practice |
| Encounter | M02 | Required | Encounter management across routine, chronic, and preventive visits |
| Clinical Documentation | M03 | Required | Notes, structured documentation, encounter templates |
| Orders & Results | M04 | Required | Laboratory and imaging orders; referral orders; result review |
| Pharmacy | M05 | Required (basic) | Prescription management; medication reconciliation |
| Scheduling | M06 | Required | Appointment management for high-volume practice |
| Documents | M07 | Required | Referral letters, external records, patient correspondence |
| Notifications | M08 | Required | Appointment reminders, preventive care reminders, result notifications |
| Billing | M09 | Required | Encounter billing, claim submission, insurance coordination |
| Accounting | M10 | Optional | For practices that maintain their own books rather than outsourcing |
| CRM | M11 | Optional | Patient outreach, recall campaigns, marketing |
| HR | M12 | Optional | For practices with employed staff beyond the practitioner |
| Workforce | M13 | Optional | For practices requiring shift scheduling for nursing and allied health |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for regulatory compliance |
| Integration | M17 | Optional | For practices integrating with external laboratory, imaging, or hospital systems |
| Reporting | M18 | Required | Clinical and operational reporting, chronic disease registries |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Solo practice (T1) | E1 | M01–M09, M14–M19 | M10, M11, M17 |
| Small group practice (T2) | E1 | M01–M09, M14–M19 | M10, M11, M12, M17 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13, M17 |
| Large group practice (T4) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13, M17 |
| Primary care network (T4–T5) | E2 or E3 | M01–M09, M11, M12, M13, M14–M19 | M10, M17 |

---

## 4. Specialty Workflows

### 4.1 Workflow Approach

General practice workflows emphasize high-volume, short-duration encounters with strong continuity-of-care orientation. The clinic type overlay includes default workflow definitions that the customer may adopt, modify, or replace within the workflow engine's configuration framework per `WORKFLOWS.md` Section 12 and `SYSTEM_ARCHITECTURE.md` Section 16. The workflows listed below are representative; the full workflow set is documented in the per-tenant configuration.

### 4.2 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Routine consultation | Scheduled appointment | Check-in, vitals, encounter, orders, disposition, billing | Receptionist, Nurse, Physician, Biller | M02, M03, M04, M06, M09 |
| Acute same-day visit | Walk-in or phone triage | Triage, slot allocation, encounter, disposition | Nurse, Physician, Receptionist | M02, M03, M06 |
| Chronic disease review | Scheduled recall | Recall review, vitals, structured assessment, orders, care plan update | Nurse, Physician | M02, M03, M04, M18 |
| Preventive care recall | Age- or condition-based trigger | Identify due screenings, schedule, perform, document, schedule next | Receptionist, Nurse, Physician | M06, M08, M18 |
| Referral management | Referral order placed | Generate referral letter, transmit to specialist, track receipt of report, file report, notify patient | Physician, Receptionist | M04, M07, M08 |
| Prescription renewal | Renewal request or due date | Review medication, verify indication, issue renewal, notify patient and pharmacy | Physician, Pharmacist | M05, M08 |
| Immunization administration | Schedule or walk-in | Verify due immunization, confirm consent, administer, document, schedule next | Nurse, Physician | M03, M04, M05 |
| Results review and patient notification | Result received | Review result, classify action, notify patient, file in record | Physician, Nurse | M04, M08 |

### 4.3 Workflow Customization Boundaries

Customers may customize these workflows within the workflow engine's configuration framework, subject to the validation rules stated in `SYSTEM_ARCHITECTURE.md` Section 15.4 and to the edition-specific depth limits stated in `EDITIONS.md` Section 11. Customizations that would compromise audit completeness, regulatory compliance, or clinical safety are rejected at validation time; examples include removing the result review step from the results review workflow or removing the consent step from the immunization administration workflow. The customization posture is governed by Principle P2 (Configuration Before Customization) and is elaborated in `WORKFLOWS.md` Section 12.

---

## 5. Specialty Data Models

### 5.1 Conceptual Entity Overview

The general practice data model is the platform's standard patient-encounter-centric model, documented at the conceptual level in `SYSTEM_ARCHITECTURE.md` Section 12.6, with extensions for chronic disease registries, preventive care schedules, and referral tracking. The model is encounter-centred: every clinical action — assessment, order, result, medication, observation — is associated with an encounter, which is associated with a patient, which is associated with a facility. This encounter-centred model is the architectural expression of healthcare-native design (Principle D-1) and is unchanged from the platform default; the general practice overlay adds specialty-specific entities that sit alongside the standard model without altering its structure.

### 5.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Problem list entry | Longitudinal list of the patient's active and resolved clinical problems | Patient, problem description, status (active/resolved), onset date, recording clinician |
| Chronic disease registry entry | Cohort membership for chronic disease management programs | Patient, registry type (e.g., diabetes, hypertension), enrolment date, last review date, next review due |
| Preventive care schedule | Age- and condition-based schedule of due preventive activities | Patient, schedule framework, activity type, due date, status |
| Immunization record | Documentation of an administered immunization | Patient, vaccine, dose, route, administration date, administering clinician, lot number |
| Referral | Outbound referral to a specialist or service | Patient, referring clinician, referred-to specialty, reason, referral date, report received date |
| Medication reconciliation event | Reconciliation of patient's current medications across prescribers | Patient, encounter, medications reconciled, discrepancies identified, resolution |
| Care plan | Longitudinal care plan for chronic disease or complex multi-morbidity | Patient, plan type, goals, interventions, review cycle, owning clinician |

### 5.3 Entity Relationships

The specialty-specific entities relate to the standard model in defined ways. The problem list entry is patient-scoped and is referenced by encounters; the chronic disease registry entry is patient-scoped and is referenced by scheduled chronic disease review encounters; the preventive care schedule is patient-scoped and drives recall workflow triggers; the immunization record is encounter-linked but persists independently as a longitudinal record; the referral is encounter-originated but tracks a separate workflow that closes when the specialist report is filed; the medication reconciliation event is encounter-linked and references the patient's current medication list; the care plan is patient-scoped and is updated by encounters. These relationships are managed through the bounded context relationships defined in `SYSTEM_ARCHITECTURE.md` Section 7.3 and are not implemented through direct data access between modules, in keeping with Principle P4 (Loose Coupling, High Cohesion).

---

## 6. Forms & Templates

### 6.1 Template Catalogue Approach

Ibn Hayan ships a set of default forms and templates for general practice, organized by encounter type and clinical activity. Templates are versioned artefacts maintained by the Office of the Chief Product Officer, with revisions communicated through the platform's change-management channel per `CLINIC_TYPES.md` Section 10.4. Customers may modify templates through the Clinical Documentation module (M03) configuration surface, with modifications subject to the standard validation, versioning, and audit rules. Templates are not prescriptive; they are starting points that customers refine to match their operational reality and regional clinical practice.

### 6.2 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Routine consultation template | Outpatient | Standard general practice consultation with presenting complaint, history, examination, assessment, plan |
| Acute visit template | Outpatient | Focused acute presentation with abbreviated history and examination |
| Chronic disease review template | Outpatient | Structured chronic disease review with disease-specific assessment fields |
| Well-child visit template | Outpatient | Pediatric well-child visit with growth, development, and immunization components |
| Adult preventive health visit template | Outpatient | Adult preventive health screening with age-appropriate prompts |
| Telehealth consultation template | Telehealth | Remote consultation with consent-to-telehealth fields |
| Pre-employment medical template | Outpatient | Pre-employment examination with occupational history and fitness-for-work assessment |

### 6.3 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Referral letter | Outbound referral to specialist or service | M07 Documents |
| Specialist report filing form | Inbound specialist report structured filing | M07 Documents |
| Prescription | Outbound prescription to pharmacy | M05 Pharmacy |
| Medical certificate | Patient-facing certificate of illness or fitness | M07 Documents |
| Immunization consent form | Patient consent for immunization administration | M03 Clinical Documentation |
| Care plan document | Patient-facing chronic disease care plan | M07 Documents |
| Recall notification | Patient-facing preventive care recall notification | M08 Notifications |

---

## 7. Reports & Analytics

### 7.1 Reporting Approach

General practice reporting balances clinical outcome measurement, operational performance monitoring, and regulatory submission. Reports are produced through the Reporting module (M18) and are governed by the same configuration, validation, and audit rules as the rest of the platform. The general practice overlay includes a default reporting view set that customers may refine; customers operating under specific regulatory frameworks (such as primary care pay-for-performance programs) typically require additional region-specific reports configured through the Localization module (M19).

### 7.2 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Chronic disease registry dashboard | Cohort status across diabetes, hypertension, asthma, COPD, cardiovascular disease | On demand |
| Preventive care coverage report | Fraction of eligible patients up to date on screenings and immunizations | Monthly |
| Medication safety report | Patients on high-risk medications or with potential drug interactions | On demand |
| Referral turnaround report | Time from referral order to receipt of specialist report | Monthly |
| Hospitalization rate report | Patients with recent hospital admissions, by chronic disease | Quarterly |

### 7.3 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician per day, week, month | Weekly |
| No-show rate report | Missed appointments by clinician and patient cohort | Weekly |
| Slot utilization report | Fraction of available slots filled per clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |
| Patient demographics report | Patient panel composition by age, sex, chronic disease | Quarterly |

### 7.4 Regulatory Reports

Regulatory reports are region-specific and are produced through the Localization module (M19) using the regional framework applied to the tenant. Typical regulatory reports include immunization coverage reporting to public health authorities, controlled substance prescribing reports to regulatory bodies, and quality measure submissions to primary care performance programs. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require, and for raising gaps through the documentation issue channel.

---

## 8. Third-Party Integrations

### 8.1 Integration Approach

General practice integrations focus on laboratory result ingestion, imaging result ingestion, hospital discharge summary ingestion, pharmacy prescription transmission, and public health immunization reporting. Integrations are managed through the Integration module (M17) and follow the integration philosophy stated in `SYSTEM_ARCHITECTURE.md` Section 26 and `PRODUCT_BIBLE.md` Section 23. Ibn Hayan prefers open standards over proprietary integration approaches, in keeping with Principle P12 (Open Standards Over Proprietary); where proprietary integration is necessary, the use is documented with a transition path to open standards when they mature.

### 8.2 Integration Categories

| Integration Category | Direction | Purpose | Standards Preference |
|---|---|---|---|
| Laboratory results | Inbound | Receive laboratory results from external laboratories | HL7 v2, FHIR DiagnosticReport |
| Imaging results | Inbound | Receive imaging reports and image references from imaging centres | HL7 v2, FHIR ImagingStudy |
| Hospital discharge summaries | Inbound | Receive discharge summaries when patients are admitted elsewhere | HL7 v2, FHIR DocumentReference |
| Pharmacy prescription transmission | Outbound | Transmit prescriptions to community pharmacies | HL7 v2, FHIR MedicationRequest, national e-prescribing standards |
| Public health immunization reporting | Outbound | Report administered immunizations to public health authorities | National immunization registry standards |
| Specialist referral transmission | Outbound | Transmit referral letters to specialist clinics | HL7 v2, FHIR ServiceRequest |
| Patient portal integration | Bidirectional | Patient portal access to records, appointment requests, secure messaging | FHIR Patient, Appointment, Communication |

### 8.3 Integration Governance

Integrations are versioned, validated, and audited. Integration contracts follow the platform's deprecation policy stated in `SYSTEM_ARCHITECTURE.md` Section 13.6; breaking changes to integration contracts are supported through a transition window. Customers enabling integrations must confirm that the integration's data flow complies with their region's privacy regulations; the platform's configuration surface supports consent-based filtering of integrated data, but the customer's regulatory compliance posture is the customer's responsibility. The Audit module (M16) records every integration event, providing end-to-end accountability for integrated data flows.

---

## 9. Role & Permission Recommendations

### 9.1 Role Composition Approach

General practice facilities typically require a small role set drawn from the platform's 14-role catalogue defined in `PRODUCT_BIBLE.md` Section 20.2. The role set is smaller than for hospital facilities because general practice operates with fewer distinct clinical functions and with less differentiated responsibility between practitioners. Role composition is governed by the permission philosophy stated in `PRODUCT_BIBLE.md` Section 21 and is implemented through the Identity & Access module (M14); customers may define custom roles within the configuration framework per Section 20.5.

### 9.2 Recommended Role Set

| Role | Code | Typical Responsibilities in General Practice |
|---|---|---|
| Physician (General Practitioner) | R01 | Clinical assessment, diagnosis, treatment, orders, documentation, referrals |
| Nurse | R02 | Nursing assessment, vital signs, immunization administration, chronic disease review support, patient education |
| Pharmacist | R03 | Medication review, prescription verification, clinical pharmacy (where embedded) |
| Receptionist | R06 | Patient registration, scheduling, check-in, check-out |
| Scheduler | R07 | Appointment management, recall management (where separate from receptionist) |
| Biller | R08 | Billing, claim submission, payment posting, denial management |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 9.3 Permission Scope Recommendations

Permissions are scoped by facility within a multi-facility tenant, by care team within a facility, and by patient cohort within a care team, per `PRODUCT_BIBLE.md` Section 21.4. General practice facilities typically scope physician access to the facility level (allowing the practitioner to see any patient who presents to the facility) and scope nursing and administrative access to the care team level (allowing the nurse or administrator to see only patients assigned to their care team). Patients with sensitive conditions (such as behavioral health or reproductive health visits) may have additional record segregation applied through the permission framework; this segregation is configured at the patient or encounter level and is enforced across all surfaces, including search, list, and direct navigation.

### 9.4 Custom Role Recommendations

Customers may define custom roles within the configuration framework. Common custom roles for general practice include the Care Coordinator role (composed of nurse and scheduler permissions, scoped to chronic disease registry cohorts), the Practice Manager role (composed of administrator and biller permissions, scoped to the facility), and the Embedded Specialist role (a physician role scoped to a specific specialty clinic type operating within the facility). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5 and are subject to the customer's role lifecycle governance.

---

## 10. Configuration Defaults

### 10.1 Default Configuration Approach

Ibn Hayan ships default configuration values for general practice as part of the clinic type overlay. Defaults are conservative and reflect typical operational reality; customers are expected to refine defaults through the configuration surface to match their specific operational patterns. Defaults are versioned and validated; default changes are communicated through the platform's change-management channel per `CLINIC_TYPES.md` Section 10.4 and are adopted on the customer's schedule within documented windows.

### 10.2 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Routine consultation slot duration | 15 minutes | Customer-adjustable per clinician and visit type |
| Chronic disease review slot duration | 30 minutes | Customer-adjustable |
| Well-child visit slot duration | 20 minutes | Customer-adjustable |
| Acute same-day visit slot duration | 10 minutes | Customer-adjustable |
| Telehealth consultation slot duration | 15 minutes | Customer-adjustable |
| Daily encounter cap per clinician | 30 encounters | Customer-adjustable; reflects patient safety workload guidance |

### 10.3 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Routine consultation template | Customer-adjustable per encounter type |
| Default chronic disease registry framework | Regional framework applied to tenant | Configured through Localization module (M19) |
| Default preventive care schedule framework | Regional framework applied to tenant | Configured through Localization module (M19) |
| Default immunization schedule | Regional immunization schedule | Configured through Localization module (M19) |
| Referral turnaround target | 14 days | Customer-adjustable; drives referral follow-up reporting |
| Result review turnaround target | 24 hours | Customer-adjustable; drives result notification workflow |

### 10.4 Billing Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default billing code system | Regional coding system applied to tenant | Configured through Localization module (M19) |
| Default claim submission cadence | Daily | Customer-adjustable |
| Default payment posting cadence | Daily | Customer-adjustable |
| Default denial review cadence | Weekly | Customer-adjustable |

---

## 11. Onboarding Checklist

### 11.1 Onboarding Approach

General practice onboarding is the process by which a customer configures Ibn Hayan for clinic type C01 at a facility. The onboarding workflow follows the stages documented in `CLINIC_TYPES.md` Section 9.1 (O1 through O8); indicative onboarding timeline for general practice is one to two weeks per Section 9.3. The checklist below provides step-by-step operational guidance for a typical general practice onboarding.

### 11.2 Onboarding Steps

1. Confirm clinic type selection (O1): Confirm that general practice (C01) is the primary clinic type for the facility; if the facility operates multiple clinic types, confirm the multi-specialty configuration approach per `CLINIC_TYPES.md` Section 4.
2. Activate the general practice overlay (O2): Apply the clinic type overlay to the facility configuration; confirm that the overlay version is recorded in the audit trail.
3. Enable recommended modules (O3): Enable the core modules listed in Section 3.2; confirm that module enablement respects edition rules per `PRODUCT_BIBLE.md` Section 16.7.
4. Configure the regional framework (O4): Through the Localization module (M19), apply the regional regulatory framework, clinical coding system, and immunization schedule appropriate to the facility's jurisdiction.
5. Configure scheduling defaults (O4): Adjust slot durations, daily encounter caps, and appointment types to match the facility's operational pattern; validate through the configuration sandbox.
6. Configure encounter templates (O4): Review the default encounter templates listed in Section 6.2; refine templates to match the facility's documentation standards.
7. Configure chronic disease registries (O4): Enable the chronic disease registries appropriate to the facility's patient panel; configure cohort criteria and review cadence.
8. Configure the preventive care schedule (O4): Confirm that the preventive care schedule framework applied to the tenant matches the facility's regional guidance; adjust scheduling of recall notifications.
9. Configure role set and permissions (O6): Provision the roles listed in Section 9.2; configure permission scope by facility, care team, and patient cohort per the customer's access policy.
10. Configure integrations (O4): Configure laboratory, imaging, pharmacy, and public health integrations per Section 8.2; validate integration data flow in the configuration sandbox.
11. Validate configuration (O5): Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians performing representative tasks.
12. Conduct operational readiness assessment (O7): Conduct a structured review of the configuration against the facility's operational reality; document any gaps and resolve before go-live.
13. Provision users (O6): Provision all users with appropriate roles and permission scopes; conduct role-based training per `PRODUCT_BIBLE.md` Section 20.6.
14. Go-live (O8): Declare the clinic type operational; update the tenant lifecycle stage; confirm that audit, notifications, and reporting are functioning as expected.

---

## 12. Sample Use Cases

### 12.1 Use Case — Chronic Disease Review for a Diabetic Patient

A 58-year-old patient with type 2 diabetes is due for a chronic disease review. The Reporting module (M18) identifies the patient as a member of the diabetes registry with a review overdue; the Notifications module (M08) generates a recall notification to the patient. The patient schedules an appointment through the Scheduling module (M06). At the encounter, the Nurse records vital signs and conducts foot and eye screening; the Physician uses the chronic disease review template within the Encounter module (M02) and Clinical Documentation module (M03) to document the assessment. Orders & Results (M04) generate laboratory orders for HbA1c and lipid panel; results return two days later and are filed by the Physician. The care plan is updated within the patient's record, and the next review is scheduled automatically through the chronic disease registry's review cadence.

### 12.2 Use Case — Acute Same-Day Visit for a Pediatric Patient

A parent calls the practice reporting that their 6-year-old child has a fever and sore throat. The Nurse conducts a brief telephone triage within the Encounter module (M02) and identifies the need for a same-day visit; the Scheduling module (M06) allocates a same-day acute slot. At the encounter, the Physician uses the acute visit template to document the focused history and examination, generates a rapid strep test order through Orders & Results (M04), and administers the test point-of-care. The result is positive; the Physician generates a prescription through the Pharmacy module (M05) and transmits it to the family's chosen community pharmacy. The patient's immunization record is reviewed during the visit, and a missing immunization is scheduled for follow-up.

### 12.3 Use Case — Referral to a Cardiology Specialist

A 65-year-old patient presents with new-onset exertional chest pain. The Physician conducts an assessment using the routine consultation template, generates an ECG order through Orders & Results (M04), and reviews the result. The Physician determines that cardiology referral is indicated and generates a referral order; the Documents module (M07) produces a referral letter populated with the patient's relevant history, medications, and the ECG finding. The referral is transmitted through the Integration module (M17) to the receiving cardiology clinic. Two weeks later, the cardiology clinic's report is received through the Integration module (M17) and filed in the patient's record; the Notifications module (M08) alerts the Physician that the report is available for review. The Physician reviews the report, discusses findings with the patient, and updates the problem list and care plan.

### 12.4 Use Case — Preventive Care Recall Outreach

The Reporting module (M18) identifies a cohort of patients aged 50 to 75 who are overdue for colorectal cancer screening. The care team reviews the cohort list and approves a recall campaign; the Notifications module (M08) generates patient-specific recall notifications offering screening options. Patients who respond are scheduled through the Scheduling module (M06); those who decline or do not respond are flagged for follow-up outreach. The encounter for screening is documented using the adult preventive health visit template; the screening result is recorded and updates the preventive care schedule, with the next due date calculated automatically.

### 12.5 Use Case — Medication Reconciliation After Hospital Discharge

A patient is discharged from hospital after an admission for pneumonia. The hospital discharge summary is received through the Integration module (M17) and filed in the patient's record. The Notifications module (M08) alerts the patient's general practitioner that a discharge has occurred; the general practitioner schedules a post-discharge review. At the encounter, the Physician conducts a medication reconciliation event comparing the discharge medication list to the patient's pre-admission list, identifies discrepancies, and updates the current medication list through the Pharmacy module (M05). The problem list is updated to reflect the pneumonia diagnosis and any new chronic conditions identified during the admission; the care plan is updated accordingly.

### 12.6 Use Case — Telehealth Consultation for a Rural Patient

A rural patient with established chronic obstructive pulmonary disease requests a telehealth review rather than travelling to the clinic. The Scheduling module (M06) allocates a telehealth slot; the Notifications module (M08) sends the patient a telehealth link and pre-visit instructions. At the encounter, the Physician uses the telehealth consultation template, documents consent to telehealth, conducts the assessment, and adjusts the medication regimen through the Pharmacy module (M05). The encounter is documented and stored in the patient's longitudinal record; the next telehealth review is scheduled based on the chronic disease review cadence.

---

## 13. Best Practices

### 13.1 Configuration Best Practices

1. Adopt the platform default configuration as the starting point and refine incrementally rather than rebuilding from scratch; the overlay has been validated through the intake process defined in `PRODUCT_BIBLE.md` Section 17.4 and reflects accumulated operational reality.
2. Use the configuration sandbox for all configuration changes before production application, in keeping with Principle P1 (Healthcare Safety) and the configuration sandbox requirement stated in `SYSTEM_ARCHITECTURE.md` Section 15.7.
3. Maintain configuration version history; treat configuration as a first-class artefact with its own lifecycle, its own review cadence, and its own audit trail.
4. Configure the regional framework through the Localization module (M19) before configuring specialty-specific defaults; regional framework mismatches are a common source of configuration defects.
5. Document all configuration refinements in the customer's configuration governance record; the platform's audit trail captures what changed but not why, and the why must be documented by the customer.

### 13.2 Operational Best Practices

6. Maintain a clean problem list; the problem list is the backbone of longitudinal care in general practice, and its integrity directly drives the quality of chronic disease registry membership, care plan accuracy, and referral letter completeness.
7. Conduct medication reconciliation at every encounter where the medication list may have changed, including post-hospital discharge encounters, post-specialist consultation encounters, and patient-reported medication changes.
8. Use the chronic disease registry dashboard as a daily operational tool rather than a monthly reporting tool; registry membership accuracy depends on the care team's ongoing attention to enrolment and review cadence.
9. Use the preventive care schedule as a patient-facing communication tool during routine encounters; patients who are aware of upcoming preventive activities are more likely to attend when recalls are issued.
10. Review the referral turnaround report monthly and follow up on overdue referrals; the referral loop is not closed when the referral is sent, it is closed when the specialist report is filed in the patient's record.

### 13.3 Governance Best Practices

11. Conduct a quarterly configuration review with the customer's clinical lead and system administrator; this review validates that the configuration still matches operational reality and surfaces refinements that have accumulated since the last review.
12. Maintain a documented onboarding plan for new clinicians joining the facility; onboarding new clinicians to Ibn Hayan is part of the facility's broader clinical onboarding and should not be deferred to ad-hoc training.
13. Engage Ibn Hayan customer success for configuration review when the facility's operational pattern changes significantly (such as adding a new clinic type, opening a new facility, or merging with another practice); significant changes warrant configuration review by the platform team.

---

## 14. Related Documents

### 14.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines clinic type C01 General Practice; Section 16 (Editions) defines edition packaging; Section 19 (Product Modules Overview) defines the module catalogue; Section 20 (User Roles Overview) defines the role catalogue; Section 21 (Permission Philosophy) defines permission scope defaults |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the configuration posture; Section 11 (Organization Hierarchy) defines the hierarchy within which the facility operates; Section 12 (Clinic Hierarchy) defines the clinic type overlay position; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.2 covers primary care single-specialty facilities; Section 6.4 documents module composition for C01 General Practice; Section 9 documents the onboarding workflow |

### 14.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 9 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 9.3 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 4 |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per module |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Internal Medicine | `docs/06_CLINIC_TYPES/INTERNAL_MEDICINE.md` | Sibling primary care clinic type |
| Pediatrics | `docs/06_CLINIC_TYPES/PEDIATRICS.md` | Sibling primary care clinic type |

### 14.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Changes — including overlay revisions, module recommendation updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
