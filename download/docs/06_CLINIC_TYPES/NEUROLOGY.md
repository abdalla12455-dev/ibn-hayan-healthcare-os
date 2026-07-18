# Ibn Hayan Healthcare Operating System
## Neurology Clinics

| Field | Value |
|---|---|
| Document Title | Neurology Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the neurology overlay is amended or when regional stroke care guidance changes |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for neurology facilities |
| Scope | Specialty overview, target facilities, recommended modules, neurological examination, EEG records, stroke assessment, cognitive assessment, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for neurology (clinic type C10) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, neurointerventional procedure-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the neurology clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Neurological Examination
5. EEG Records
6. Stroke Assessment
7. Cognitive Assessment
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

Neurology is the medical specialty concerned with the diagnosis, management, and non-surgical treatment of diseases of the nervous system, including the brain, spinal cord, peripheral nerves, neuromuscular junction, and muscles. The neurologist evaluates and manages conditions including stroke, epilepsy, headache disorders, neurodegenerative diseases (Alzheimer disease, Parkinson disease, amyotrophic lateral sclerosis), demyelinating diseases (multiple sclerosis), movement disorders, neuromuscular disorders, neuroinfectious diseases, neuro-oncology, and neurodevelopmental disorders. Scope of practice includes outpatient consultation, inpatient consultation, neurological diagnostic testing (electroencephalography, electromyography, nerve conduction studies, lumbar puncture), neuroimaging interpretation (in coordination with radiology), and longitudinal management of chronic neurological conditions. Ibn Hayan treats neurology as clinic type C10 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated High (reflecting EEG data integration, stroke assessment workflow integration, and disability assessment complexity) and recommended editions Professional (E2) and Enterprise (E3).

### 1.2 Patient Population and Clinical Activities

The neurology patient population spans the full age spectrum, from infants with neonatal seizures through elderly patients with neurodegenerative disease, with peak utilization in middle-aged and older adults. Clinical activities include comprehensive neurological consultation, detailed neurological examination, diagnostic testing (EEG, EMG, NCS, lumbar puncture), longitudinal management of chronic neurological conditions, acute stroke assessment and management (in coordination with emergency medicine and neurosurgery), and disability assessment (supporting applications for disability benefits and driving fitness assessments). The neurology encounter is documentation-intensive: the comprehensive neurological examination includes mental status, cranial nerves, motor (including tone, strength, reflexes), sensory (including all modalities), coordination, gait, and station; the structured documentation supports longitudinal comparison and supports the diagnostic reasoning that characterizes neurology practice.

### 1.3 Why Neurology Needs Specialized Configuration

Neurology requires specialized configuration across multiple dimensions: structured documentation of the comprehensive neurological examination (with anatomically organized fields for each examination component), management of EEG records (with EEG data integration, EEG report documentation, and longitudinal EEG comparison), stroke assessment using standardized tools (NIH Stroke Scale for acute stroke assessment, modified Rankin Scale for stroke outcome assessment), cognitive assessment using standardized tools (Mini-Mental State Examination, Montreal Cognitive Assessment), and longitudinal tracking of chronic neurological conditions (with disease-specific registries and progression monitoring). Ibn Hayan's neurology overlay addresses these requirements through specialty-specific documentation templates, registry views, and integration surfaces, with configuration defaults reflecting typical neurology practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.3 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Multidisciplinary Care

Neurology coordinates closely with neurosurgery (for surgical management of neurological conditions including brain tumors, aneurysms, and refractory epilepsy), with neuroradiology (for neuroimaging interpretation), with psychiatry (for psychiatric manifestations of neurological disease and for differential diagnosis of cognitive and behavioral presentations), with rehabilitation medicine (for stroke and traumatic brain injury rehabilitation), with emergency medicine (for acute stroke and seizure management), and with internal medicine (for systemic disease with neurological manifestations). Neurology also frequently operates within comprehensive stroke centers, where neurologists, neurointerventionalists, neurosurgeons, and neuroradiologists work together for acute stroke care. Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports these compositions, with shared services such as the EEG laboratory, the EMG laboratory, and the stroke unit operating as facility-level shared services across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Neurology operates across the mid-sized to large facility spectrum, from small group practices with two to five neurologists through hospital neurology departments with twenty or more neurologists plus advanced practice providers, EEG technicians, and trainees. The most common configurations are mid-sized group practices (six to twelve neurologists with embedded EEG and EMG laboratories), large group practices (with full outpatient and inpatient capability), and hospital neurology departments (operating as a service line with stroke unit and inpatient consultation). Ibn Hayan's Professional edition (E2) is the typical fit for mid-sized group practices per `PRODUCT_BIBLE.md` Section 16.5; Enterprise edition (E3) is required for hospital neurology departments with stroke unit operations, inpatient admitting privileges, and integration with hospital systems.

### 2.2 Ownership Patterns and Geographic Considerations

Neurology facilities operate under private practice ownership, physician-group ownership, hospital-employment models, and academic medical centre ownership. Academic medical centre departments add teaching and research dimensions to the operational pattern, requiring configuration overlays for trainee supervision and teaching encounter documentation per `CLINIC_TYPES.md` Section 4.5. Geographic considerations emphasize hospital connectivity for acute stroke care; neurologists who provide acute stroke care typically hold stroke call at one or more hospitals and require integration with hospital systems including the stroke alert notification system and the hospital CT and MRI imaging systems. Telestroke services (remote acute stroke assessment) are increasingly common and require careful configuration of the telestroke workflow, including remote imaging access and remote documentation. Ibn Hayan's Integration module (M17) supports hospital connectivity and telestroke workflows through standard integration profiles.

### 2.3 Regulatory Environment

Neurology operates within a regulatory environment that includes procedural documentation requirements (for lumbar puncture and other procedures), controlled substance prescribing oversight (for chronic pain management, for headache management, and for certain antiepileptic medications), driving fitness reporting requirements (where neurologists are required to report patients with conditions that impair driving safety), disability assessment documentation requirements (supporting applications for disability benefits), and quality reporting programs (including stroke quality measures). Ibn Hayan's Audit module (M16) records every procedural documentation event, every controlled substance prescribing event, and every driving fitness report; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including driving fitness reporting requirements and stroke quality measure reporting.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for neurology reflects the specialty's emphasis on diagnostic test documentation, longitudinal chronic disease management, stroke assessment workflow integration, and disability assessment documentation. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record with neurological history |
| Encounter | M02 | Required | Encounter management across outpatient, inpatient, telestroke, and procedural visits |
| Clinical Documentation | M03 | Required | Specialty-specific documentation templates for consultation, examination, procedure, and stroke assessment |
| Orders & Results | M04 | Required | EEG, EMG, NCS, lumbar puncture, neuroimaging orders; result interpretation |
| Pharmacy | M05 | Required | Antiepileptic, anticoagulant, headache, and chronic pain medication management |
| Scheduling | M06 | Required | Outpatient scheduling, EEG scheduling, EMG scheduling |
| Documents | M07 | Required | Consult letters, procedural reports, disability assessment documentation, driving fitness reports |
| Notifications | M08 | Required | Critical result alerts, stroke alert notifications, follow-up reminders |
| Billing | M09 | Required | Encounter billing, procedural billing, telestroke billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Chronic disease outreach |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For EEG laboratory staffing and stroke call scheduling |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for procedural and stroke events |
| Integration | M17 | Required | Integration with EEG equipment, EMG equipment, hospital systems, stroke alert system, telestroke platform |
| Reporting | M18 | Required | Stroke quality measures, epilepsy registry, chronic disease registries |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems, driving fitness reporting requirements |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Small group practice (T2) | E2 | M01–M09, M14–M19 | M10, M11 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13 |
| Large group practice (T4) | E2 or E3 | M01–M19 (all) | None typical |
| Hospital neurology department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Neurological Examination

### 4.1 Capability Overview

The comprehensive neurological examination is the defining clinical activity of neurology, providing the structured assessment of nervous system function that supports diagnosis, longitudinal monitoring, and treatment response assessment. The examination is anatomically organized into mental status, cranial nerves, motor (including tone, strength, reflexes, and abnormal movements), sensory (including all modalities — light touch, pinprick, temperature, vibration, proprioception), coordination (including gait and station), and (where applicable) meningeal signs and higher cortical functions. Ibn Hayan's neurological examination capability, implemented through the Clinical Documentation module (M03), supports structured examination documentation, anatomically organized fields, longitudinal comparison, and registry integration for disease-specific findings.

### 4.2 Structured Documentation

Structured examination documentation uses anatomically organized fields for each examination component, with the structure ensuring that all components are documented and that findings are recorded consistently across visits. The mental status section includes level of consciousness, orientation, attention, language, memory, and (where applicable) higher cortical functions. The cranial nerve section includes documentation for each of the twelve cranial nerves. The motor section includes tone, strength (typically using the Medical Research Council 0 to 5 scale), reflexes (typically using the 0 to 4+ scale), and abnormal movements. The sensory section includes documentation for each sensory modality, with findings mapped to dermatomal and peripheral nerve distributions. The coordination section includes gait, station, finger-to-nose, heel-to-shin, and rapid alternating movements. The documentation template is configurable per facility and per regional convention.

### 4.3 Longitudinal Comparison

Longitudinal neurological examination comparison presents the current examination findings alongside prior examination findings for the same patient, with the structured findings displayed in tabular form for direct comparison. The comparison view is particularly valuable for patients with progressive neurological disease (where the trajectory of findings guides diagnosis and treatment), for patients on disease-modifying therapy (where treatment response is assessed by examination trajectory), and for patients with fluctuating conditions (such as multiple sclerosis, where examination findings may change over time). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

### 4.4 Registry Integration

Specific neurological examination findings trigger registry membership for the relevant neurological registry. Findings suggestive of stroke (focal weakness, focal sensory loss, aphasia) trigger stroke registry membership. Findings suggestive of epilepsy (documented seizures) trigger epilepsy registry membership. Findings suggestive of multiple sclerosis (focal neurological deficits with dissemination in space and time) trigger multiple sclerosis registry membership. Findings suggestive of neurodegenerative disease (cognitive decline, motor abnormalities) trigger the relevant neurodegenerative disease registry membership. The registry integration supports longitudinal tracking of disease progression and treatment response across the patient panel.

---

## 5. EEG Records

### 5.1 Capability Overview

The electroencephalogram (EEG) is a primary diagnostic test of neurology, providing a recording of the brain's electrical activity that supports diagnosis of epilepsy, encephalopathy, and other neurological conditions. The typical neurology practice performs or interprets EEGs at high volume, with each EEG generating a recording (typically 20 to 30 minutes for routine EEG, longer for continuous EEG monitoring) and an interpretation report. Ibn Hayan's EEG records capability, implemented through the Orders & Results module (M04) with integration through the Integration module (M17) and documentation through the Clinical Documentation module (M03), supports EEG acquisition workflow, structured interpretation documentation, EEG data storage and retrieval, longitudinal comparison, and integration with EEG equipment through standard formats.

### 5.2 Acquisition and Integration

EEG acquisition is performed by an EEG technician using EEG equipment; the EEG recording is transmitted to Ibn Hayan through the Integration module (M17), using standard formats including DICOM Waveform and vendor-specific formats. The integration is configured per EEG equipment vendor and model; the configuration maps the equipment's data fields to Ibn Hayan's EEG data model. The EEG recording is received, validated, and stored in the patient's record (or in external storage with image references stored in Ibn Hayan); the technician who acquired the EEG is recorded, as is the acquisition location and equipment identifier. The acquisition workflow is auditable end-to-end, supporting equipment quality monitoring and regulatory compliance.

### 5.3 Interpretation and Documentation

EEG interpretation is performed by the neurologist (or by an automated interpretation algorithm with neurologist confirmation). The interpretation is documented using a structured template that captures the recording parameters (montage, filters, sensitivity, recording duration), the background activity (organized by frequency bands — delta, theta, alpha, beta), the abnormal findings (epileptiform discharges, focal slowing, generalized slowing, periodic patterns), the response to activation procedures (hyperventilation, photic stimulation), and the overall interpretation. The structured interpretation supports longitudinal comparison with prior EEGs; the neurologist may compare the current EEG with the prior EEG to identify changes indicative of disease progression or treatment response.

### 5.4 Longitudinal EEG Comparison

Longitudinal EEG comparison presents the current EEG alongside prior EEGs for the same patient, with the structured interpretation of each EEG displayed side by side and the EEG recordings accessible for visual comparison. The comparison view is particularly valuable for patients with epilepsy (where EEG changes may indicate treatment response or disease progression), for patients with encephalopathy (where EEG changes may indicate improvement or deterioration), and for patients on disease-modifying therapy (where serial EEGs support assessment of treatment response). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

### 5.5 Continuous EEG Monitoring

Continuous EEG monitoring (cEEG) is used for critically ill patients (including status epilepticus, prolonged unconsciousness, and intracerebral hemorrhage) and generates EEG recordings of hours to days in duration. cEEG documentation is structured differently from routine EEG, with documentation capturing the indication, the monitoring duration, the findings (including seizures, periodic patterns, and background changes), and the clinical correlation. cEEG integration with the hospital's critical care systems (through the Integration module M17) supports real-time review of the EEG by the neurologist and supports documentation of the clinical correlation. cEEG is typically performed in hospital settings and requires Enterprise edition (E3) capability.

---

## 6. Stroke Assessment

### 6.1 Capability Overview

Stroke assessment is a defining capability of neurology, encompassing the acute assessment of patients with suspected stroke (using standardized tools including the NIH Stroke Scale) and the longitudinal outcome assessment of stroke survivors (using standardized tools including the modified Rankin Scale). Stroke assessment is time-critical in the acute setting (where rapid assessment supports decisions about thrombolysis and thrombectomy) and is longitudinally tracked in the outpatient setting (where outcome assessment supports rehabilitation planning and secondary stroke prevention). Ibn Hayan's stroke assessment capability, implemented through the Clinical Documentation module (M03) with integration through the Integration module (M17), supports acute stroke assessment workflow, NIH Stroke Scale documentation, stroke alert integration, modified Rankin Scale documentation, and stroke registry integration.

### 6.2 NIH Stroke Scale Documentation

The NIH Stroke Scale (NIHSS) is the standard tool for acute stroke assessment, providing a structured assessment of stroke severity that supports decisions about thrombolysis and thrombectomy. The NIHSS is documented using a structured template that captures the 11 components of the scale (level of consciousness, level of consciousness questions, level of consciousness commands, best gaze, visual fields, facial palsy, motor arm, motor leg, limb ataxia, sensory, best language, dysarthria, extinction and inattention). The structured template supports automatic score calculation and supports longitudinal comparison (where the NIHSS is repeated to assess stroke progression). The NIHSS documentation is integrated with the stroke alert workflow and is recorded in the audit trail.

### 6.3 Stroke Alert Integration

Stroke alert integration supports the rapid mobilization of the stroke team when a patient presents with suspected acute stroke. The stroke alert is triggered by the emergency department (or by emergency medical services in the field) and is transmitted to the stroke team (including the neurologist, the neurointerventionalist, and the radiology technician) through the Notifications module (M08). The neurologist (whether on-site or remote via telestroke) responds to the alert, conducts the acute stroke assessment, and documents the NIHSS and the assessment-and-plan. The stroke alert integration is configurable per facility and per regional stroke care system; the integration is auditable end-to-end, supporting quality monitoring and regulatory compliance.

### 6.4 Modified Rankin Scale Documentation

The modified Rankin Scale (mRS) is the standard tool for stroke outcome assessment, providing a structured assessment of functional independence after stroke. The mRS is documented using a structured template that captures the 6-point scale (0 = no symptoms, 5 = severe disability, 6 = death). The mRS is documented at defined intervals after stroke (typically at discharge, at 90 days, and at 1 year) and is integrated with the stroke registry for outcome reporting. The mRS documentation supports longitudinal outcome tracking and supports comparison across stroke types, treatments, and patient populations. The mRS documentation is integrated with the rehabilitation planning workflow, supporting the transition from acute stroke care to rehabilitation.

### 6.5 Stroke Registry Integration

Stroke registry integration supports the reporting of stroke care quality measures to regional or national stroke registries (such as the Get With The Guidelines stroke registry in the United States or equivalent registries in other regions). The stroke registry collects data on stroke presentation, acute treatment (including thrombolysis and thrombectomy), inpatient care, and outcomes; the registry data is submitted through the Integration module (M17) using the regional registry's standard reporting format. The stroke registry integration is required for stroke center certification in many jurisdictions and supports quality improvement initiatives. The specific data elements and reporting format vary by region; customers are responsible for confirming that the regional framework applied to their tenant produces the registry reports they require.

---

## 7. Cognitive Assessment

### 7.1 Capability Overview

Cognitive assessment is a core activity of neurology, supporting the diagnosis and management of cognitive disorders (including Alzheimer disease, vascular dementia, mild cognitive impairment, and other neurodegenerative diseases with cognitive manifestations). The cognitive assessment uses standardized tools (including the Mini-Mental State Examination, the Montreal Cognitive Assessment, and more detailed neuropsychological testing) to provide structured documentation of cognitive function across multiple domains (attention, memory, language, executive function, visuospatial function). Ibn Hayan's cognitive assessment capability, implemented through the Clinical Documentation module (M03) with registry integration through the Reporting module (M18), supports structured cognitive assessment documentation, longitudinal cognitive trajectory tracking, registry integration for cognitive disorders, and integration with neuropsychological testing results.

### 7.2 Standardized Cognitive Assessment Tools

Ibn Hayan ships configuration for commonly used standardized cognitive assessment tools, including the Mini-Mental State Examination (MMSE), the Montreal Cognitive Assessment (MoCA), and other widely used tools. The tools are documented using structured templates that capture the component scores, the total score, the administration date, and the administering clinician. The structured documentation supports automatic score calculation, longitudinal comparison (with prior assessments for the same patient), and registry integration (with specific scores triggering registry membership for cognitive disorders). The tool configuration is versioned and is updated when the tool publishers revise the tools; updates are communicated through the platform's change-management channel.

### 7.3 Longitudinal Cognitive Trajectory

Longitudinal cognitive trajectory tracking presents the patient's cognitive assessment scores over time, with the trajectory supporting assessment of disease progression, treatment response, and clinical decision-making about diagnosis and management. The trajectory view is particularly valuable for patients with mild cognitive impairment (where trajectory supports the decision about whether to diagnose dementia) and for patients on disease-modifying therapy (where trajectory supports assessment of treatment response). The trajectory view is integrated with the cognitive disorders registry; trajectory patterns that indicate accelerated decline trigger registry review for treatment intensification or clinical trial consideration.

### 7.4 Neuropsychological Testing Integration

Neuropsychological testing provides detailed assessment of cognitive function across multiple domains, typically performed by a neuropsychologist (a specialized psychologist) over several hours. The testing results are received through the Integration module (M17) or are entered manually by the neurologist; the results are integrated into the cognitive assessment record and support the longitudinal cognitive trajectory view. Neuropsychological testing integration supports the differential diagnosis of cognitive disorders (where the pattern of domain-specific deficits supports specific diagnoses) and supports treatment planning (where the testing identifies cognitive strengths that can be applied in rehabilitation and compensation strategies).

### 7.5 Registry Integration

Cognitive assessment findings trigger registry membership for the relevant cognitive disorder registry. Findings suggestive of Alzheimer disease (memory impairment with executive dysfunction) trigger Alzheimer disease registry membership. Findings suggestive of vascular dementia (cognitive impairment with vascular risk factors and vascular imaging findings) trigger vascular dementia registry membership. Findings suggestive of mild cognitive impairment (cognitive impairment without functional impairment) trigger mild cognitive impairment registry membership, with registry review at defined intervals to identify conversion to dementia. The registry integration supports longitudinal tracking of disease progression and supports identification of patients who may be candidates for clinical trials or for disease-modifying therapy.

---

## 8. Specialty Workflows

### 8.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Outpatient consultation | Scheduled appointment | Comprehensive neurological H&P, structured examination, assessment, plan | Physician, Nurse | M02, M03 |
| EEG acquisition and interpretation | Ordered test | Schedule, acquire, transmit, interpret, document, file | Technician, Physician | M04, M17 |
| EMG/NCS acquisition and interpretation | Ordered test | Schedule, acquire, transmit, interpret, document, file | Technician, Physician | M04, M17 |
| Lumbar puncture | Ordered procedure | Consent, procedure, specimen handling, documentation, post-procedure monitoring | Physician, Nurse | M02, M03, M04 |
| Acute stroke assessment (in-person) | Stroke alert | Alert response, NIHSS, neuroimaging review, treatment decision, documentation | Physician, Nurse | M02, M03, M17 |
| Telestroke assessment | Stroke alert (remote) | Alert response, remote NIHSS, remote neuroimaging review, treatment recommendation, documentation | Physician | M02, M03, M17 |
| Stroke follow-up | Scheduled follow-up | Assessment, mRS documentation, secondary prevention review, plan | Physician, Nurse | M02, M03 |
| Cognitive assessment | Scheduled assessment | Administer assessment tool, score, document, integrate into trajectory | Physician, Nurse | M03, M18 |
| Chronic disease review | Scheduled recall | Registry review, structured assessment, medication review, care plan update | Nurse, Physician | M02, M03, M04, M18 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The neurology data model extends the platform's standard patient-encounter-centric model with entities for neurological examination records, EEG records, stroke assessment records, cognitive assessment records, and neurological registry membership. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Neurological examination record | Documentation of a comprehensive neurological examination | Patient, encounter, examination date, mental status, cranial nerves, motor (tone, strength, reflexes), sensory, coordination, gait and station |
| EEG record | Documentation of an EEG acquisition and interpretation | Patient, encounter, acquisition date, test type (routine, continuous), recording parameters, background activity, abnormal findings, interpretation, EEG recording reference |
| Stroke assessment record | Documentation of an acute or follow-up stroke assessment | Patient, encounter, assessment type (acute NIHSS, follow-up mRS), assessment date, component scores, total score, treatment decision (for acute), outcome (for follow-up) |
| Cognitive assessment record | Documentation of a cognitive assessment | Patient, encounter, assessment date, assessment tool, component scores, total score, administering clinician |
| Lumbar puncture record | Documentation of a lumbar puncture procedure | Patient, encounter, procedure date, indication, consent, procedural details, specimen handling, post-procedure monitoring, complications |
| Neurological registry entry | Cohort membership for a neurological registry | Patient, registry type, enrolment date, monitoring indicators, treatment targets, review cadence |
| Disability assessment record | Documentation of a disability assessment | Patient, encounter, assessment date, assessment purpose (disability benefits, driving fitness), assessment findings, recommendation |

### 9.3 Entity Relationships

The neurological examination record references the patient and the encounter; longitudinal examination comparison is supported through the patient reference. The EEG record references the patient and the encounter and includes the EEG recording reference to external storage. The stroke assessment record references the patient and the encounter; acute stroke assessments are linked to the inpatient admission, while follow-up assessments are linked to outpatient encounters. The cognitive assessment record references the patient and the encounter; longitudinal cognitive trajectory is supported through the patient reference. The lumbar puncture record references the patient and the encounter and includes references to cerebrospinal fluid laboratory results. The disability assessment record references the patient and the encounter and supports generation of disability assessment documentation through the Documents module (M07).

---

## 10. Forms & Templates

### 10.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Outpatient neurology consultation | Outpatient | Comprehensive neurology consultation with detailed H&P and structured examination |
| Follow-up visit | Outpatient | Focused follow-up for established neurological condition |
| EEG visit | Outpatient | EEG acquisition and interpretation |
| EMG/NCS visit | Outpatient | EMG and nerve conduction study acquisition and interpretation |
| Lumbar puncture visit | Outpatient or inpatient | Lumbar puncture procedure with consent and post-procedure monitoring |
| Acute stroke assessment | Inpatient or emergency | Acute stroke assessment with NIHSS and treatment decision |
| Telestroke assessment | Telehealth | Remote acute stroke assessment |
| Stroke follow-up | Outpatient | Stroke follow-up with mRS and secondary prevention review |
| Cognitive assessment visit | Outpatient | Cognitive assessment with standardized tool administration |
| Chronic disease review | Outpatient | Structured chronic disease review for epilepsy, multiple sclerosis, etc. |

### 10.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| EEG report | Test report with EEG recording reference | M07 Documents |
| EMG/NCS report | Test report | M07 Documents |
| Lumbar puncture report | Procedural report | M07 Documents |
| NIHSS documentation | Acute stroke assessment documentation | M07 Documents |
| mRS documentation | Stroke outcome assessment documentation | M07 Documents |
| Cognitive assessment report | Assessment report with score and interpretation | M07 Documents |
| Disability assessment documentation | Patient-facing or regulatory-facing disability assessment | M07 Documents |
| Driving fitness report | Regulatory-facing driving fitness report (where required) | M07 Documents |

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Stroke registry dashboard | Cohort status across acute stroke, follow-up, and outcomes | On demand |
| Stroke quality measures report | Thrombolysis door-to-needle time, thrombectomy door-to-puncture time | Monthly |
| Epilepsy registry dashboard | Cohort status with seizure frequency, medication history | On demand |
| Cognitive trajectory report | Cognitive assessment trajectory for cognitive disorder patients | Quarterly |
| Multiple sclerosis registry dashboard | Cohort status with disease-modifying therapy and progression | On demand |
| Antiepileptic drug level monitoring report | Drug levels within target range | Monthly |

### 11.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| EEG volume report | EEGs per neurologist, by type | Monthly |
| Stroke alert response time report | Time from alert to assessment | Monthly |
| No-show rate report | Missed appointments by clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |

### 11.3 Regulatory Reports

Regulatory reports include stroke registry reporting to regional or national stroke registries, driving fitness reporting to regional driver licensing authorities (where required), and quality reporting to regional health authorities. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 12. Role & Permission Recommendations

### 12.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Neurology |
|---|---|---|
| Physician (Neurologist) | R01 | Clinical assessment, diagnosis, treatment, orders, documentation, procedures, stroke assessment |
| Nurse | R02 | Nursing assessment, procedure assistance, patient education, antiepileptic drug level monitoring |
| EEG technician | R04 | EEG acquisition, EMG/NCS acquisition (where trained) |
| Pharmacist | R03 | Antiepileptic drug monitoring, anticoagulation management (where embedded) |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Outpatient scheduling, EEG scheduling, EMG scheduling |
| Biller | R08 | Encounter billing, procedural billing, telestroke billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 12.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, and by patient cohort per `PRODUCT_BIBLE.md` Section 21.4. Neurology facilities typically scope physician access to the facility level for outpatient encounters and to the patient cohort level for inpatient encounters (allowing the neurologist to see only their own inpatients). EEG technician access is scoped to the EEG studies they perform; the technician has access to the study record but not to the full patient record. Telestroke access is scoped to the stroke alert workflow; the telestroke neurologist has access to the patient's record during the stroke alert response, with access time-bounded and audited. Disability assessment documentation access is scoped to the assessing neurologist and to authorized administrative staff.

### 12.3 Custom Role Recommendations

Common custom roles for neurology include the EEG Technician role (composed of technician permissions scoped to EEG acquisition), the Stroke Coordinator role (composed of nurse and scheduler permissions scoped to stroke registry coordination), the Telestroke Neurologist role (composed of physician permissions scoped to stroke alert response, with time-bounded access), and the Cognitive Assessment Administrator role (composed of nurse or allied health professional permissions scoped to cognitive assessment tool administration). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 13. Configuration Defaults

### 13.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Outpatient consultation slot duration | 45 minutes | Customer-adjustable |
| Follow-up visit slot duration | 30 minutes | Customer-adjustable |
| EEG visit slot duration | 60 minutes | Customer-adjustable |
| EMG/NCS visit slot duration | 60 minutes | Customer-adjustable |
| Lumbar puncture slot duration | 30 minutes | Customer-adjustable |
| Cognitive assessment visit slot duration | 60 minutes | Customer-adjustable |
| Chronic disease review slot duration | 30 minutes | Customer-adjustable |
| Telestroke assessment response time | 15 minutes from alert | Customer-adjustable |

### 13.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Outpatient neurology consultation | Customer-adjustable |
| Default neurological registry set | Stroke, epilepsy, multiple sclerosis, Alzheimer disease, Parkinson disease | Customer-adjustable |
| NIHSS documentation template | Standard NIHSS template | Customer-adjustable |
| Cognitive assessment tools | MMSE, MoCA | Customer-adjustable |
| Stroke quality measure reporting | Regional stroke registry format | Configured through Localization module (M19) |

### 13.3 Procedural Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Procedure consent capture | Required before procedure start | Non-overridable |
| Lumbar puncture post-procedure monitoring | 1 hour | Customer-adjustable |
| Stroke alert response time target | 15 minutes | Customer-adjustable; reflects stroke care standard |
| Telestroke access duration | Time-bounded per alert | Non-overridable |

---

## 14. Onboarding Checklist

### 14.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that neurology (C10) is the primary clinic type for the facility.
2. Activate the neurology overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2; for hospital neurology departments, enable all modules per the Enterprise edition.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, driving fitness reporting requirements, and stroke quality measure reporting formats.
5. Configure neurological examination: Verify structured examination template; configure anatomically organized fields per regional convention.
6. Configure EEG records: Configure integration with EEG equipment; verify DICOM Waveform or vendor-specific data flow; validate structured interpretation template; configure EEG recording storage.
7. Configure stroke assessment: Configure NIHSS documentation template; configure stroke alert integration; configure mRS documentation; verify stroke registry reporting configuration.
8. Configure cognitive assessment: Configure standardized cognitive assessment tools (MMSE, MoCA, etc.); configure longitudinal cognitive trajectory view; configure cognitive disorders registry.
9. Configure neurological registries: Enable the default registry set; refine cohort criteria, monitoring indicators, and treatment targets.
10. Configure telestroke workflow (where applicable): Configure stroke alert integration with the telestroke platform; configure remote imaging access; configure time-bounded access for telestroke neurologists.
11. Configure encounter templates: Review the default encounter templates listed in Section 10.1; refine templates to match the facility's documentation standards.
12. Configure role set and permissions: Provision the roles listed in Section 12.1; configure permission scope by facility, care team, patient cohort, and procedural team.
13. Configure integrations: Configure hospital integration, EEG equipment integration, EMG equipment integration, telestroke platform integration, and stroke registry reporting; validate integration data flow in the configuration sandbox.
14. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians.
15. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 15. Sample Use Cases

### 15.1 Use Case — Acute Stroke Assessment

A 72-year-old patient presents to the emergency department with sudden onset of right-sided weakness and aphasia. The emergency physician activates the stroke alert; the stroke alert is transmitted to the stroke team through the Notifications module (M08). The neurologist responds to the alert (in person or via telestroke for remote facilities), conducts the acute stroke assessment using the NIHSS documentation template, and reviews the CT imaging (acute CT and CT angiogram) through the Integration module (M17). The neurologist diagnoses an acute ischemic stroke with a large vessel occlusion; thrombectomy is recommended and the patient is transferred to the neurointerventional suite. The acute stroke assessment is documented in the patient's record; the patient is enrolled in the stroke registry; the stroke quality measure data (door-to-needle time, door-to-puncture time) is captured for registry reporting.

### 15.2 Use Case — Outpatient Epilepsy Consultation

A 28-year-old patient is referred by their primary care physician after two episodes of suspected generalized tonic-clonic seizures. The neurologist conducts an outpatient consultation using the outpatient neurology consultation template, including a comprehensive neurological examination. An EEG is ordered through the Orders & Results module (M04) and scheduled through the Scheduling module (M06); an MRI of the brain is ordered. At the EEG visit, the EEG is acquired by the technician using EEG equipment; the recording is transmitted to Ibn Hayan through the Integration module (M17). The neurologist interprets the EEG and documents the structured interpretation, identifying epileptiform discharges. The patient is enrolled in the epilepsy registry; antiepileptic medication is initiated through the Pharmacy module (M05); a follow-up visit is scheduled to assess treatment response.

### 15.3 Use Case — Multiple Sclerosis Disease-Modifying Therapy Management

A 35-year-old patient with relapsing-remitting multiple sclerosis is managed with disease-modifying therapy. The patient is a member of the multiple sclerosis registry; at each chronic disease review visit, the neurologist uses the chronic disease review template to document the structured assessment, including the neurological examination, the relapse history, the MRI findings (compared to prior MRIs), and the disease-modifying therapy tolerance. The longitudinal neurological examination comparison view presents the current and prior examination findings, supporting assessment of disease progression. The MRI results are received through the Integration module (M17) and are integrated into the registry view. The disease-modifying therapy is continued; the patient is scheduled for the next chronic disease review at the standard 6-month interval.

### 15.4 Use Case — Cognitive Assessment for Memory Concerns

A 68-year-old patient presents with memory concerns reported by the patient and family. The neurologist conducts an outpatient consultation including a comprehensive neurological examination; the MoCA is administered using the cognitive assessment visit template. The MoCA score of 22 indicates cognitive impairment; the patient is enrolled in the mild cognitive impairment registry. An MRI of the brain is ordered; laboratory tests to exclude reversible causes of cognitive impairment are ordered through the Orders & Results module (M04). The longitudinal cognitive trajectory view is initiated with the MoCA result; the patient is scheduled for a follow-up cognitive assessment at 6 months to assess trajectory. Neuropsychological testing is scheduled for detailed cognitive domain assessment; the testing results are integrated into the cognitive trajectory view through the Integration module (M17).

### 15.5 Use Case — Lumbar Puncture for Suspected Meningitis

A 45-year-old patient presents with fever, headache, and neck stiffness. The neurologist conducts an outpatient consultation (or inpatient consultation if admitted) and identifies clinical features concerning for meningitis. A lumbar puncture is performed using the lumbar puncture visit template; the consent is documented, the procedure is performed, the cerebrospinal fluid specimens are handled, and the post-procedure monitoring is documented. The cerebrospinal fluid specimens are sent to the laboratory through the Integration module (M17); the results are received and integrated into the patient's record. The cerebrospinal fluid analysis confirms bacterial meningitis; the neurologist initiates antibiotic therapy through the Pharmacy module (M05) and admits the patient to the hospital.

### 15.6 Use Case — Telestroke Assessment for Rural Hospital

A 65-year-old patient presents to a rural hospital emergency department with acute stroke symptoms. The rural hospital does not have an on-site neurologist; a stroke alert is activated and the telestroke platform is engaged. The telestroke neurologist (at a distant comprehensive stroke center) responds to the alert; the patient's record is accessed through time-bounded telestroke access; the NIHSS is conducted via video with the local emergency physician; the CT imaging is reviewed remotely through the Integration module (M17). The telestroke neurologist diagnoses an acute ischemic stroke; intravenous thrombolysis is recommended and administered locally; the patient is transferred to the comprehensive stroke center for further management. The telestroke assessment is documented in the patient's record; the assessment is integrated with the comprehensive stroke center's record through the Integration module (M17).

---

## 16. Best Practices

### 16.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; stroke quality measure reporting formats and driving fitness reporting requirements vary by region.
2. Validate EEG, EMG, and stroke alert integrations carefully before go-live; integration failures can disrupt clinical workflow and can compromise stroke care quality.
3. Configure NIHSS and mRS documentation templates to the regional stroke care standard; template mismatches produce incorrect stroke registry reporting.
4. Use the configuration sandbox for all changes to stroke alert integration, telestroke access rules, and cognitive assessment tools; these changes have direct patient safety implications.
5. Maintain the cognitive assessment tool configuration through the Localization module (M19); tool consistency across facilities within a tenant supports cross-facility reporting and clinical governance.

### 16.2 Operational Best Practices

6. Conduct longitudinal neurological examination comparison at every chronic disease review visit; comparison is more clinically valuable than isolated assessment.
7. Use the stroke registry dashboard as a daily operational tool for stroke quality monitoring; registry accuracy depends on ongoing attention to data capture and review cadence.
8. Conduct cognitive assessment at defined intervals for patients with cognitive disorders; longitudinal trajectory supports diagnosis, treatment, and clinical trial consideration.
9. Use telestroke access time-bounding carefully; telestroke access is a regulatory and clinical governance priority and must be configured to support stroke care without compromising record confidentiality.
10. Maintain complete procedural documentation for lumbar puncture and other procedures; procedural documentation supports clinical governance and regulatory compliance.

### 16.3 Governance Best Practices

11. Conduct a monthly stroke quality measure review with the clinical lead; this review validates stroke care quality and identifies opportunities for improvement.
12. Conduct an annual driving fitness reporting audit (where applicable); this audit validates that driving fitness reports are issued for patients with conditions that impair driving safety.
13. Conduct a quarterly antiepileptic drug level monitoring review; this review validates that drug levels are monitored for patients on antiepileptic medications with narrow therapeutic windows.

---

## 17. Related Documents

### 17.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C10 Neurology; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 26 governs integration philosophy |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.3 covers medical specialty single-specialty facilities including neurology; Section 6 documents module recommendations |

### 17.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 12 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 12.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Cardiology | `docs/06_CLINIC_TYPES/CARDIOLOGY.md` | Related specialty with shared stroke care coordination |
| Internal Medicine | `docs/06_CLINIC_TYPES/INTERNAL_MEDICINE.md` | Related specialty with shared chronic disease management |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council, with off-cycle review when regional stroke care guidance or driving fitness reporting regulations change. Changes — including overlay revisions, registry set updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
