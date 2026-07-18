# Ibn Hayan Healthcare Operating System
## Internal Medicine Clinics

| Field | Value |
|---|---|
| Document Title | Internal Medicine Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the internal medicine overlay is amended |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for internal medicine facilities |
| Scope | Specialty overview, target facilities, recommended modules, chronic disease management, medication management, lab result tracking, comorbidity management, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for internal medicine (clinic type C03) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, internal medicine subspecialty-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the internal medicine clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Chronic Disease Management
5. Medication Management
6. Lab Result Tracking
7. Comorbidity Management
8. Specialty Workflows
9. Specialty Data Models
10. Forms & Templates
11. Reports & Analytics
12. Role & Permission Recommendations
13. Configuration Defaults
14. Onboarding Checklist
15. Sample Use Cases
16. Best Practices
17. Related Documents

---

## 1. Specialty Overview

### 1.1 Definition and Scope of Practice

Internal medicine is the medical specialty concerned with the diagnosis, management, and non-surgical treatment of adult diseases, with particular emphasis on complex multi-system illness and longitudinal chronic disease management. The internist typically serves adult patients aged 18 and older and acts as both a primary care physician for complex patients and a consultant to other physicians for diagnostically challenging presentations. Scope of practice includes comprehensive history and examination, formulation of differential diagnoses, longitudinal management of chronic conditions such as diabetes, hypertension, dyslipidemia, chronic kidney disease, and autoimmune disorders, and coordination of care with medical and surgical specialties. Ibn Hayan treats internal medicine as clinic type C03 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated Low and recommended editions Essential (E1) and Professional (E2).

### 1.2 Patient Population and Clinical Activities

The internal medicine patient population skews toward middle-aged and older adults with one or more chronic conditions, though the specialty also sees young adults with complex diagnostic presentations. Clinical activities are characterized by detailed history and examination, intensive diagnostic reasoning, multi-system assessment, complex medication management with attention to drug interactions and renal and hepatic dose adjustment, and longitudinal follow-up across years or decades. The internist frequently holds hospital admitting privileges and coordinates inpatient and outpatient care for the same patient; this continuity across care settings places particular weight on medication reconciliation at transitions of care and on inpatient-outpatient information exchange. Ibn Hayan's internal medicine overlay supports these activities through detailed history and physical templates, structured differential diagnosis documentation, comorbidity tracking, and inpatient-outpatient coordination workflows.

### 1.3 Why Internal Medicine Needs Specialized Configuration

Internal medicine differs from general practice in patient acuity, diagnostic complexity, and medication intensity, and these differences drive specialized configuration requirements. The encounter template for an internal medicine consultation is more detailed than for general practice, with structured fields for review of systems, multi-system examination, differential diagnosis, and assessment-and-plan by problem. The chronic disease management capability is more developed, with disease-specific registry views and longitudinal tracking of disease progression and treatment response. The medication management capability requires deeper drug interaction checking, renal and hepatic dose adjustment support, and medication reconciliation at every care transition. The comorbidity management capability supports the multi-morbidity reality of internal medicine, where a single patient may have five or more active chronic conditions requiring coordinated management.

### 1.4 Relationship to Hospital and Multi-Specialty Settings

Internal medicine frequently operates within multi-specialty group practices or hospital outpatient departments rather than as a standalone clinic type. The internist often holds admitting privileges at one or more hospitals and serves as the attending of record for hospitalized patients; this creates a continuity-of-care relationship between the outpatient clinic and the inpatient setting that the platform must support through inpatient-outpatient coordination workflows. Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports the composition of internal medicine with related specialties (cardiology, endocrinology, nephrology) within a single facility, with shared services such as laboratory, imaging, and infusion therapy operating across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Internal medicine operates across the mid-sized to large facility spectrum, from small group practices with two to five internists through hospital outpatient departments with twenty or more internists plus trainees. The most common configurations are mid-sized group practices (six to fifteen internists with embedded nursing and care coordination), large group practices (sixteen or more internists with subspecialty differentiation), and hospital outpatient internal medicine departments (operating as a service line within a hospital). Ibn Hayan's Essential edition (E1) supports small group practices per `PRODUCT_BIBLE.md` Section 16.4, while the Professional edition (E2) is the typical fit for mid-sized and large group practices per Section 16.5. Enterprise edition (E3) is required where internal medicine operates as a hospital outpatient department with inpatient admitting privileges and integration with hospital systems.

### 2.2 Ownership Patterns and Geographic Considerations

Internal medicine facilities operate under private practice ownership, physician-group ownership, hospital-employment models, academic medical centre ownership, and government-operated models. Academic medical centres add teaching and research dimensions to the operational pattern, requiring configuration overlays for trainee supervision and teaching encounter documentation per `CLINIC_TYPES.md` Section 4.5. Geographic considerations for internal medicine mirror those for general practice but with greater emphasis on hospital connectivity; internists in rural settings often serve as the primary admitting physician for the local hospital and require integration with the hospital's inpatient record. Ibn Hayan's Integration module (M17) supports hospital connectivity through standard integration profiles, while the offline-first posture documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 supports intermittent connectivity scenarios.

### 2.3 Regulatory Environment

Internal medicine operates within a regulatory environment that includes adult preventive care quality measures, chronic disease management program requirements, controlled substance prescribing oversight, and physician quality reporting programs. Internists who hold hospital admitting privileges are additionally subject to hospital credentialing requirements and to hospital-based regulatory frameworks that govern inpatient care. Ibn Hayan's Audit module (M16) records every patient record access and configuration change; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including quality reporting programs. Customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for internal medicine reflects the specialty's emphasis on chronic disease management, complex medication management, and inpatient-outpatient coordination. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal adult patient record is the foundation |
| Encounter | M02 | Required | Encounter management across outpatient, inpatient, and consultative visits |
| Clinical Documentation | M03 | Required | Detailed H&P, SOAP notes, consult notes, assessment-and-plan by problem |
| Orders & Results | M04 | Required | Laboratory, imaging, referral, and consult orders; result interpretation |
| Pharmacy | M05 | Required | Complex medication management, reconciliation, interaction checking |
| Scheduling | M06 | Required | Outpatient scheduling; inpatient rounding coordination |
| Documents | M07 | Required | Consult letters, discharge summaries, external records |
| Notifications | M08 | Required | Critical result alerts, follow-up reminders, transition-of-care notifications |
| Billing | M09 | Required | Encounter billing, consult billing, claim submission |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Chronic disease outreach, recall campaigns |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For practices requiring shift scheduling |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for regulatory compliance |
| Integration | M17 | Conditional | Required where inpatient-outpatient coordination with hospital systems is needed |
| Reporting | M18 | Required | Chronic disease registries, quality measures, operational reporting |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Small group practice (T2) | E1 | M01–M09, M14–M19 | M10, M11, M17 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13, M17 |
| Large group practice (T4) | E2 | M01–M09, M11, M12, M13, M14–M19 | M10, M17 |
| Hospital outpatient department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Chronic Disease Management

### 4.1 Capability Overview

Chronic disease management is the central clinical activity of internal medicine and is the area in which the specialty's configuration requirements differ most from general practice. The internist typically manages patients with multiple chronic conditions, each with its own clinical practice guidelines, monitoring cadence, and treatment targets; a single patient may have diabetes, hypertension, dyslipidemia, chronic kidney disease, and heart failure, each requiring independent tracking and coordinated management. Ibn Hayan's chronic disease management capability provides disease-specific registry views, longitudinal tracking of disease-specific indicators (such as HbA1c for diabetes, blood pressure for hypertension, eGFR for chronic kidney disease), treatment target monitoring, and care plan integration that ties disease-specific goals to the patient's overall care plan.

### 4.2 Disease Registry Configuration

The chronic disease registry is configured through the Reporting module (M18) and is populated automatically based on encounter documentation, problem list entries, and laboratory results. Each registry has cohort criteria, monitoring indicators, treatment targets, and review cadence; the registry configuration is versioned and is refined by the customer through the configuration surface. The default registry set for internal medicine includes diabetes mellitus, hypertension, dyslipidemia, chronic kidney disease, heart failure, atrial fibrillation, chronic obstructive pulmonary disease, asthma, hypothyroidism, and osteoporosis. Customers may add registries for conditions specific to their patient panel; custom registries are subject to the same validation, versioning, and audit rules as platform-provided registries.

### 4.3 Longitudinal Tracking and Treatment Targets

Each registry tracks disease-specific indicators over time, presenting the trajectory in registry views and encounter documentation. Treatment targets are configured per registry and per patient; when an indicator falls outside the target range, the registry flags the patient for review and the Notifications module (M08) generates an alert to the care team. Treatment targets are adjustable per patient to accommodate individualized care goals; targets that are tightened or loosened relative to the registry default are recorded with the rationale, supporting both clinical governance and audit. The trajectory view supports trend analysis across multiple indicators, allowing the internist to identify interactions between conditions (such as the effect of worsening kidney function on medication dosing) that single-indicator views would not surface.

### 4.4 Care Plan Integration

The chronic disease registry integrates with the care plan entity, allowing disease-specific goals and interventions to be tracked as part of the patient's overall care plan rather than as parallel registries. A patient with diabetes, hypertension, and chronic kidney disease has a single care plan that includes goals and interventions for each condition, with the registry view providing the longitudinal indicator data and the care plan view providing the goals and interventions. This integration avoids the fragmentation that occurs when each disease is managed in isolation and supports the multi-morbidity reality of internal medicine documented in Section 7.

---

## 5. Medication Management

### 5.1 Capability Overview

Medication management in internal medicine is characterized by polypharmacy, frequent dose adjustments for renal and hepatic function, high risk of drug-drug interactions, and the need for medication reconciliation at every care transition. A typical internal medicine patient is on five or more chronic medications, with new medications added during acute illness, medication changes at hospital discharge, and discontinuations in response to adverse effects or changing clinical priorities. Ibn Hayan's medication management capability, implemented through the Pharmacy module (M05), supports complex prescribing with renal and hepatic dose adjustment prompts, drug interaction checking at order entry, medication reconciliation workflows at care transitions, and longitudinal medication history with active, discontinued, and historical medications visible in a single view.

### 5.2 Renal and Hepatic Dose Adjustment

Renal and hepatic dose adjustment is a recurring clinical decision in internal medicine, particularly for patients with chronic kidney disease or hepatic impairment. Ibn Hayan's Pharmacy module (M05) integrates with the most recent laboratory results to present dose adjustment prompts at order entry; the prompt references the patient's current eGFR (where available) and the medication's renal dosing guidance, allowing the internist to confirm or adjust the dose before issuing the prescription. The dose adjustment guidance is maintained in the medication knowledge base and is updated through the Localization module (M19) to reflect regional formularies and clinical practice guidelines; customers may configure the threshold at which prompts appear, but the underlying guidance is platform-owned.

### 5.3 Drug Interaction Checking

Drug interaction checking is performed at order entry against the patient's current medication list, with interactions categorized by severity and clinical significance. Severe interactions trigger a hard stop that requires the prescriber to acknowledge the interaction before proceeding; moderate interactions trigger a soft warning that the prescriber may override with documented rationale; minor interactions are presented as informational. The interaction knowledge base is maintained centrally and is updated through the Localization module (M19); customers may not modify the interaction knowledge base but may configure the threshold at which warnings appear. Every interaction acknowledgment, override, and rationale is recorded in the audit trail, supporting clinical governance review and regulatory compliance.

### 5.4 Medication Reconciliation

Medication reconciliation is performed at defined care transitions: at the first outpatient encounter, at hospital admission, at hospital discharge, at transition to a long-term care facility, and at any encounter where the medication list may have changed. Ibn Hayan's reconciliation workflow, configured through the Pharmacy module (M05) and the Encounter module (M02), presents the current medication list alongside the external source (such as a hospital discharge summary received through the Integration module M17) and supports structured reconciliation of each medication as continued, modified, discontinued, or new. Discrepancies between sources are flagged for clinician review; the reconciliation event is recorded as a distinct clinical activity linked to the encounter, supporting longitudinal tracking of medication changes over time.

---

## 6. Lab Result Tracking

### 6.1 Capability Overview

Laboratory result tracking is a high-volume activity in internal medicine, with the internist typically reviewing dozens of results daily across the patient panel. Results span routine chemistries, hematology, lipid panels, HbA1c, thyroid function, liver function, coagulation studies, urinalysis, and specialized assays including autoimmune markers, tumor markers, and genetic tests. Ibn Hayan's lab result tracking capability, implemented through the Orders & Results module (M04), supports result review workflows, critical value alerting, longitudinal trend visualization, registry integration, and result-to-patient notification. The capability is configured at the clinic type overlay to reflect internal medicine's emphasis on longitudinal trend analysis and on integration with chronic disease registries.

### 6.2 Result Review Workflow

The result review workflow presents incoming results in a queue organized by patient, by ordering clinician, and by criticality. Critical results are flagged for immediate review and trigger Notifications module (M08) alerts to the ordering clinician and to the care team; routine results are queued for review at the clinician's discretion. The review workflow supports structured documentation of the review action: acknowledged, acted upon (with action documented), forwarded for consultation, or filed without action. Results that remain unreviewed beyond the configured turnaround target (default 24 hours per Section 13) are escalated to the care team lead, ensuring that no result is missed.

### 6.3 Longitudinal Trend Visualization

Longitudinal trend visualization presents a result in the context of the patient's prior results for the same analyte, with reference ranges displayed alongside the trajectory. The trend view is particularly important for chronic disease management; an HbA1c result is interpreted differently when the prior value was 6.5% versus when the prior value was 9.5%, and the trend view makes this context immediately visible. Trends are configurable per registry; the diabetes registry trend view includes HbA1c, fasting glucose, lipid panel, and renal function markers in a single integrated view, supporting the internist's assessment of overall disease trajectory rather than isolated analyte interpretation.

### 6.4 Critical Value Management

Critical values are laboratory results that fall outside the range associated with immediate clinical risk; examples include critically low potassium, critically high glucose, and critically abnormal coagulation studies. Ibn Hayan's critical value management capability enforces a structured acknowledgment workflow: the critical result is flagged on receipt, the ordering clinician and care team are notified, acknowledgment of the critical result is recorded with timestamp and clinician identity, and follow-up action is documented. The acknowledgment workflow is non-overridable; a critical result that has not been acknowledged within the configured timeframe is escalated to the facility medical director. Critical value acknowledgment is recorded in the audit trail and is reportable through the Reporting module (M18) for regulatory compliance.

---

## 7. Comorbidity Management

### 7.1 Capability Overview

Comorbidity management is a defining characteristic of internal medicine, where the typical patient has multiple active chronic conditions that interact clinically and that require coordinated management rather than independent treatment. A patient with diabetes, hypertension, chronic kidney disease, and heart failure may be on ten or more medications, may have conflicting treatment priorities (such as the effect of heart failure diuretics on kidney function), and may require care coordination across multiple specialists. Ibn Hayan's comorbidity management capability provides multi-condition care plans, problem list hierarchy, treatment interaction awareness, and care team coordination, supporting the internist's role as the integrator of care for complex patients.

### 7.2 Multi-Condition Care Plans

The multi-condition care plan is a single care plan that includes goals and interventions for each of the patient's active chronic conditions, with explicit identification of condition interactions. A patient with diabetes and heart failure may have a care plan that identifies the interaction between heart failure diuretics and kidney function, the interaction between heart failure medications and glucose control, and the interaction between diabetes medications and fluid status. The care plan is updated at each chronic disease review encounter and is shared with the care team, including external specialists through the Integration module (M17) where the integration supports care plan exchange.

### 7.3 Problem List Hierarchy

The problem list hierarchy supports the organization of the patient's problems into primary chronic conditions, secondary chronic conditions, acute conditions, and resolved conditions. The hierarchy is clinician-curated; the internist maintains the hierarchy at each encounter, promoting conditions to primary status when they become the dominant clinical focus and demoting conditions when they recede in importance. The hierarchy is used by the chronic disease registry to determine registry membership, by the encounter template to determine documentation structure, and by the care plan to determine goal priority. The hierarchy is recorded in the audit trail, supporting longitudinal review of the patient's clinical trajectory.

### 7.4 Care Team Coordination

Care team coordination supports the multi-specialty care that complex internal medicine patients typically receive. The patient's care team includes the internist as the primary coordinator, plus the relevant medical and surgical specialists, the primary nursing contact, the care coordinator (where present), and the patient's preferred pharmacy. Ibn Hayan's care team coordination capability, configured through the Patient module (M01) and the Encounter module (M02), records the care team composition and supports structured communication among care team members through the Notifications module (M08). Care team communication is recorded in the patient's record, ensuring that all care team members have visibility into care decisions made by other members.

---

## 8. Specialty Workflows

### 8.1 Workflow Approach

Internal medicine workflows emphasize chronic disease management, complex diagnostic evaluation, and care transition coordination. The clinic type overlay includes default workflow definitions that the customer may adopt, modify, or replace within the workflow engine's configuration framework per `WORKFLOWS.md` Section 12 and `SYSTEM_ARCHITECTURE.md` Section 16. Workflows are versioned and auditable; workflow changes follow the configuration governance posture stated in `SYSTEM_ARCHITECTURE.md` Section 15.6.

### 8.2 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Comprehensive consultation | Scheduled appointment | Vitals, comprehensive H&P, differential diagnosis, assessment-and-plan, orders | Nurse, Physician | M02, M03, M04 |
| Chronic disease review | Scheduled recall | Registry review, vitals, structured assessment, labs, care plan update | Nurse, Physician | M02, M03, M04, M18 |
| Diagnostic workup | Suspected diagnosis | Differential documentation, orders, result review, diagnosis confirmation | Physician | M03, M04 |
| Consult response | Inbound consult request | Review consult question, focused H&P, assessment, consult letter | Physician | M02, M03, M07 |
| Medication reconciliation | Care transition | Obtain external medication list, reconcile, document discrepancies, update | Physician, Nurse | M05, M02 |
| Critical result management | Critical result received | Alert, acknowledgment, patient contact, intervention documentation | Physician, Nurse | M04, M08 |
| Hospital admission | Admission decision | Generate admission orders, transmit to hospital, coordinate with inpatient team | Physician | M04, M07, M17 |
| Hospital discharge follow-up | Discharge summary received | Review summary, schedule follow-up, reconcile medications, update care plan | Nurse, Physician | M02, M05, M07, M17 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The internal medicine data model extends the platform's standard patient-encounter-centric model with entities for chronic disease registry membership, multi-condition care plans, medication reconciliation events, and care team composition. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure, in keeping with Principle P4 (Loose Coupling, High Cohesion).

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Chronic disease registry entry | Cohort membership for a chronic disease management program | Patient, registry type, enrolment date, monitoring indicators, treatment targets, last review date, next review due |
| Multi-condition care plan | Longitudinal care plan integrating multiple chronic conditions | Patient, conditions covered, goals per condition, interventions, condition interactions, review cycle, owning clinician |
| Medication reconciliation event | Reconciliation of patient's medication list at a care transition | Patient, encounter, source of external list, medications reconciled, discrepancies identified, resolutions |
| Problem list hierarchy entry | Hierarchical problem list entry with primary/secondary/acute/resolved status | Patient, problem, hierarchy level, onset date, recording clinician |
| Care team composition | Multi-specialty care team for a complex patient | Patient, team members with roles, primary coordinator, communication preferences |
| Differential diagnosis entry | Structured differential diagnosis for a diagnostic workup | Patient, encounter, working diagnosis, alternatives considered, supporting evidence, ruling-out evidence |
| Treatment target | Patient-specific treatment target for a chronic condition | Patient, condition, indicator, target range, deviation rationale, review date |

### 9.3 Entity Relationships

The chronic disease registry entry references the patient and the multi-condition care plan; the multi-condition care plan references the patient's active chronic conditions as recorded in the problem list hierarchy; the medication reconciliation event is encounter-linked and references the patient's current medication list and the external source list; the care team composition references the patient and the platform's user directory; the differential diagnosis entry is encounter-linked and references the orders generated to confirm or rule out the working diagnosis. Relationships are managed through bounded context contracts per `SYSTEM_ARCHITECTURE.md` Section 7.3 and are not implemented through direct data access between modules.

---

## 10. Forms & Templates

### 10.1 Template Catalogue Approach

Ibn Hayan ships a set of default forms and templates for internal medicine, organized by encounter type and clinical activity. Templates are versioned artefacts maintained by the Office of the Chief Product Officer, with revisions communicated through the platform's change-management channel per `CLINIC_TYPES.md` Section 10.4. Customers may modify templates through the Clinical Documentation module (M03) configuration surface, with modifications subject to the standard validation, versioning, and audit rules.

### 10.2 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Comprehensive consultation template | Outpatient | Detailed H&P with structured review of systems, multi-system examination, differential diagnosis, assessment-and-plan by problem |
| Chronic disease review template | Outpatient | Disease-specific structured assessment with registry-integrated indicators and treatment target review |
| Diagnostic workup template | Outpatient | Differential diagnosis documentation with orders and follow-up plan |
| Consult response template | Outpatient | Focused H&P responding to a consult question with structured assessment and consult letter |
| Pre-operative assessment template | Outpatient | Pre-operative assessment for internist clearance prior to surgery |
| Hospital follow-up template | Outpatient | Post-discharge follow-up with medication reconciliation and care plan update |
| Telehealth consultation template | Telehealth | Remote consultation with consent-to-telehealth fields |

### 10.3 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| Admission orders | Outbound admission orders to hospital | M04 Orders & Results |
| Discharge summary review form | Structured review of inbound discharge summary | M07 Documents |
| Medication reconciliation form | Structured medication reconciliation at care transition | M05 Pharmacy |
| Care plan document | Patient-facing multi-condition care plan | M07 Documents |
| Treatment target summary | Patient-facing summary of treatment targets and current status | M07 Documents |

---

## 11. Reports & Analytics

### 11.1 Reporting Approach

Internal medicine reporting balances chronic disease outcome measurement, quality measure submission, care transition performance monitoring, and operational performance. Reports are produced through the Reporting module (M18) and are governed by the same configuration, validation, and audit rules as the rest of the platform. Customers operating under specific regulatory frameworks (such as physician quality reporting programs) typically require additional region-specific reports configured through the Localization module (M19).

### 11.2 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Chronic disease registry dashboard | Cohort status across diabetes, hypertension, CKD, heart failure, COPD, etc. | On demand |
| Treatment target achievement report | Fraction of patients at target for each registry's indicators | Monthly |
| Polypharmacy report | Patients on five or more medications, by registry | On demand |
| Care transition reconciliation report | Reconciliation events completed within target window | Monthly |
| Hospital admission rate report | Patients with recent admissions, by chronic disease | Quarterly |
| Critical result acknowledgment report | Critical results acknowledged within target window | Monthly |

### 11.3 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| Result review turnaround report | Time from result receipt to review acknowledgment | Weekly |
| Consult response turnaround report | Time from consult request to consult letter | Monthly |
| No-show rate report | Missed appointments by clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |

---

## 12. Role & Permission Recommendations

### 12.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Internal Medicine |
|---|---|---|
| Physician (Internist) | R01 | Clinical assessment, diagnosis, complex medication management, orders, documentation, consults, hospital admission |
| Nurse | R02 | Nursing assessment, vital signs, chronic disease review support, medication reconciliation support, patient education |
| Pharmacist | R03 | Medication review, interaction checking oversight, clinical pharmacy (where embedded) |
| Care coordinator (custom role) | R01+R07 composed | Chronic disease registry coordination, recall management, care transition coordination |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Appointment management, recall management |
| Biller | R08 | Billing, claim submission, consult billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 12.2 Permission Scope Recommendations

Permissions are scoped by facility, care team, and patient cohort per `PRODUCT_BIBLE.md` Section 21.4. Internal medicine facilities typically scope physician access to the facility level for outpatient encounters and to the patient cohort level for inpatient encounters (allowing the internist to see only their own inpatients). Care coordinator access is scoped to the chronic disease registry cohorts they manage. Pharmacist access (where embedded) is scoped to the facility for medication review and to the patient cohort for clinical pharmacy activities. Permission scoping for inpatient encounters is configured through the Integration module (M17) when inpatient-outpatient coordination is enabled.

### 12.3 Custom Role Recommendations

Common custom roles for internal medicine include the Care Coordinator role (composed of nurse and scheduler permissions, scoped to chronic disease registry cohorts), the Hospitalist role (a physician role scoped to inpatient encounters within an affiliated hospital), and the Clinical Pharmacist role (composed of pharmacist permissions with expanded medication management scope). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5 and are subject to the customer's role lifecycle governance.

---

## 13. Configuration Defaults

### 13.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Comprehensive consultation slot duration | 30 minutes | Customer-adjustable per clinician |
| Chronic disease review slot duration | 40 minutes | Customer-adjustable |
| Diagnostic workup slot duration | 30 minutes | Customer-adjustable |
| Consult response slot duration | 30 minutes | Customer-adjustable |
| Pre-operative assessment slot duration | 45 minutes | Customer-adjustable |
| Telehealth consultation slot duration | 20 minutes | Customer-adjustable |
| Daily encounter cap per clinician | 20 encounters | Customer-adjustable; reflects complexity |

### 13.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Comprehensive consultation template | Customer-adjustable per encounter type |
| Default chronic disease registry set | Diabetes, hypertension, dyslipidemia, CKD, heart failure, AF, COPD, asthma, hypothyroidism, osteoporosis | Customer-adjustable |
| Critical result acknowledgment window | 30 minutes | Customer-adjustable; reflects patient safety |
| Routine result review window | 24 hours | Customer-adjustable |
| Medication reconciliation trigger | Every care transition | Configurable per transition type |

### 13.3 Treatment Target Defaults

| Registry | Indicator | Default Target |
|---|---|---|
| Diabetes | HbA1c | < 7.0% (customer-adjustable per patient) |
| Hypertension | Systolic BP | < 130 mmHg (customer-adjustable per patient) |
| Dyslipidemia | LDL cholesterol | < 70 mg/dL for high-risk patients (customer-adjustable) |
| Chronic kidney disease | eGFR | Annual decline < 5 mL/min/1.73m² (customer-adjustable) |
| Heart failure | NT-proBNP | Trend-based (customer-adjustable) |

---

## 14. Onboarding Checklist

### 14.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that internal medicine (C03) is the primary clinic type for the facility; if the facility operates multiple clinic types, confirm the multi-specialty configuration approach per `CLINIC_TYPES.md` Section 4.
2. Activate the internal medicine overlay: Apply the clinic type overlay to the facility configuration; confirm that the overlay version is recorded in the audit trail.
3. Enable recommended modules: Enable the core modules listed in Section 3.2; for hospital outpatient departments, enable all modules per the Enterprise edition.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, clinical coding system, and chronic disease management program rules.
5. Configure chronic disease registries: Enable the default registry set; refine cohort criteria, monitoring indicators, and treatment targets to match the facility's patient panel and clinical practice guidelines.
6. Configure medication management defaults: Configure renal and hepatic dose adjustment prompts, drug interaction checking thresholds, and medication reconciliation triggers per Section 5.
7. Configure lab result tracking defaults: Configure critical value ranges, acknowledgment windows, and result review turnaround targets per Section 6.
8. Configure encounter templates: Review the default encounter templates listed in Section 10.2; refine templates to match the facility's documentation standards.
9. Configure care team coordination: Configure care team composition defaults, communication preferences, and integration with external specialist systems where applicable.
10. Configure role set and permissions: Provision the roles listed in Section 12.1; configure permission scope by facility, care team, and patient cohort per the customer's access policy.
11. Configure integrations: Configure laboratory, imaging, hospital, and pharmacy integrations per the facility's external system landscape; validate integration data flow in the configuration sandbox.
12. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians performing representative tasks.
13. Conduct operational readiness assessment: Conduct a structured review of the configuration against the facility's operational reality; document any gaps and resolve before go-live.
14. Provision users and conduct training: Provision all users with appropriate roles; conduct role-based training per `PRODUCT_BIBLE.md` Section 20.6, with emphasis on chronic disease registry use and medication reconciliation.
15. Go-live: Declare the clinic type operational; update the tenant lifecycle stage; confirm that audit, notifications, and reporting are functioning as expected.

---

## 15. Sample Use Cases

### 15.1 Use Case — Comprehensive Consultation for a Complex Diagnostic Presentation

A 52-year-old patient is referred by their general practitioner for evaluation of fatigue, weight loss, and abnormal liver function tests noted on routine screening. The internist conducts a comprehensive consultation using the comprehensive consultation template, documenting a detailed history, structured review of systems, and multi-system examination. The differential diagnosis is documented with hepatic, hematologic, infectious, and neoplastic considerations. Orders & Results (M04) generate laboratory orders for extended liver workup, viral serologies, autoimmune markers, and imaging orders for abdominal ultrasound. The encounter is documented; the care plan is initiated with diagnostic workup as the primary goal; a follow-up appointment is scheduled for result review.

### 15.2 Use Case — Chronic Disease Review for a Multi-Morbidity Patient

A 68-year-old patient with diabetes, hypertension, chronic kidney disease, and heart failure is due for a chronic disease review. The Reporting module (M18) identifies the patient as a member of all four registries with reviews due. At the encounter, the Nurse records vital signs including orthostatic blood pressures; the Physician uses the chronic disease review template, which presents registry-integrated indicators (HbA1c, BP, eGFR, NT-proBNP) with trend visualization. Laboratory orders are generated for HbA1c, lipid panel, renal function, and NT-proBNP; medication review identifies that the patient's heart failure diuretic dose may be contributing to recent kidney function decline. The care plan is updated with adjustments to diuretic dosing, intensified diabetes management, and a plan for closer monitoring of renal function; the next review is scheduled at a shortened interval.

### 15.3 Use Case — Hospital Discharge Follow-up

A patient is discharged from hospital after an admission for acute decompensated heart failure. The discharge summary is received through the Integration module (M17) and filed in the patient's record; the Notifications module (M08) alerts the internist that a discharge has occurred. The internist schedules a follow-up visit within the configured post-discharge window. At the encounter, the Physician conducts a medication reconciliation event comparing the discharge medication list to the pre-admission list, identifies that two new medications were added and one was discontinued, and updates the current medication list. The problem list is updated; the care plan is revised to reflect the acute decompensation and the adjusted treatment plan; a follow-up laboratory order is generated for renal function and NT-proBNP in two weeks.

### 15.4 Use Case — Critical Result Management

A routine laboratory result for a patient on warfarin therapy returns with an INR of 8.5, well above the therapeutic range. The Orders & Results module (M04) flags the result as critical; the Notifications module (M08) alerts the ordering internist and the care team. The internist acknowledges the critical result within the configured window, contacts the patient, advises withholding the warfarin dose and administering vitamin K, and arranges for repeat INR testing the following day. The intervention is documented in the patient's record; the critical result acknowledgment and intervention are recorded in the audit trail. The Reporting module (M18) generates a monthly critical result acknowledgment report including this event.

### 15.5 Use Case — Consult Response to a Referring Physician

A general practitioner refers a patient to the internist for evaluation of longstanding hypertension that has become resistant to standard therapy. The consult request is received through the Integration module (M17) and is queued for the internist. At the consult encounter, the Physician uses the consult response template, conducts a focused H&P centered on the consult question, reviews the patient's medication history and prior blood pressure readings, and orders investigations including renal artery ultrasound and aldosterone-renin ratio. The consult letter is generated through the Documents module (M07), populated with the assessment and recommendations, and transmitted back to the referring physician through the Integration module (M17). The patient is scheduled for a follow-up visit to review investigation results.

### 15.6 Use Case — Telehealth Chronic Disease Review

A rural patient with established chronic disease wishes to reduce travel burden by conducting a chronic disease review via telehealth. The Scheduling module (M06) allocates a telehealth slot; the Notifications module (M08) sends the patient a telehealth link and pre-visit instructions, including a request to obtain home blood pressure readings and weight measurements. At the encounter, the Physician uses the telehealth consultation template, reviews the patient's home readings, conducts a focused telehealth assessment, and adjusts the medication regimen. The chronic disease registry is updated with the encounter data; the next review is scheduled based on the registry review cadence.

---

## 16. Best Practices

### 16.1 Configuration Best Practices

1. Adopt the platform default chronic disease registry set as the starting point and refine to match the facility's patient panel; adding too many registries at onboarding dilutes attention and reduces registry accuracy.
2. Configure treatment targets per patient rather than per registry default; individualized targets reflect patient-specific clinical context and improve the clinical utility of the registry.
3. Use the configuration sandbox for all configuration changes to chronic disease registries, treatment targets, and critical value ranges; these changes have direct patient safety implications and require validation before production application.
4. Maintain the medication knowledge base configuration through the Localization module (M19) rather than through facility-level overrides; knowledge base consistency across facilities within a tenant reduces medication safety risk.
5. Document all configuration refinements in the customer's configuration governance record with explicit rationale; the audit trail captures what changed but not why.

### 16.2 Operational Best Practices

6. Conduct medication reconciliation at every care transition, including post-hospital discharge, post-specialist consultation, and patient-reported medication changes; reconciliation is the single most effective intervention to prevent medication-related adverse events in internal medicine.
7. Use the chronic disease registry dashboard as a daily operational tool; registry accuracy depends on the care team's ongoing attention to enrolment, monitoring, and review cadence.
8. Review the result review turnaround report weekly and follow up on overdue results; an overdue result is a patient safety risk and reflects either a workflow defect or a staffing gap.
9. Maintain the problem list hierarchy at each encounter; an accurate problem list hierarchy drives registry membership, encounter template selection, and care plan goal priority.
10. Use the care team coordination capability to maintain visibility into care provided by external specialists; care fragmentation is a major source of adverse events in multi-morbidity patients.

### 16.3 Governance Best Practices

11. Conduct a quarterly chronic disease registry review with the clinical lead; this review validates registry membership, treatment target appropriateness, and review cadence.
12. Conduct a monthly medication safety review including polypharmacy reports, drug interaction override logs, and critical medication-related events; this review supports both clinical governance and regulatory compliance.
13. Engage Ibn Hayan customer success for configuration review when the facility's operational pattern changes significantly (such as adding hospital admitting privileges, opening a new facility, or merging with another practice).

---

## 17. Related Documents

### 17.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C03 Internal Medicine; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 16 governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.2 covers primary care single-specialty facilities including internal medicine; Section 6 documents module recommendations |

### 17.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 12 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 12.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| General Practice | `docs/06_CLINIC_TYPES/GENERAL.md` | Sibling primary care clinic type |
| Cardiology | `docs/06_CLINIC_TYPES/CARDIOLOGY.md` | Related medical specialty |
| Endocrinology | `docs/06_CLINIC_TYPES/ENDOCRINOLOGY.md` | Related medical specialty (where applicable) |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Changes — including overlay revisions, registry set updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
