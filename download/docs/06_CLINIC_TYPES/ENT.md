# Ibn Hayan Healthcare Operating System
## ENT (Ear, Nose, Throat) Clinics

| Field | Value |
|---|---|
| Document Title | ENT (Ear, Nose, Throat) Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the otolaryngology overlay is amended |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for otolaryngology facilities |
| Scope | Specialty overview, target facilities, recommended modules, audiometry records, endoscopy documentation, hearing aid management, sinus treatment records, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for otolaryngology (clinic type C14) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, cochlear implant programming-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the otolaryngology clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Audiometry Records
5. Endoscopy Documentation
6. Hearing Aid Management
7. Sinus Treatment Records
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

Otolaryngology — commonly referred to as ENT (ear, nose, throat) — is the surgical specialty concerned with the diagnosis and medical and surgical treatment of conditions of the ear, nose, throat, head and neck, and related structures. The otolaryngologist evaluates and manages conditions including hearing loss and ear disease, sinonasal disease and obstruction, throat and laryngeal disease, head and neck tumors, thyroid and parathyroid disease, facial plastic and reconstructive concerns, sleep-disordered breathing, and pediatric otolaryngologic conditions. Scope of practice includes outpatient consultation, audiometric and vestibular diagnostic testing, endoscopic examination, microscopic ear surgery, endoscopic sinus surgery, head and neck oncologic surgery, and sleep surgery. Ibn Hayan treats otolaryngology as clinic type C14 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated Medium and recommended editions Professional (E2) and Enterprise (E3).

### 1.2 Patient Population and Clinical Activities

The otolaryngology patient population spans the full age spectrum, from infants with congenital hearing loss or airway concerns through elderly patients with head and neck cancer or age-related hearing loss. Clinical activities include comprehensive head and neck examination, otologic examination with microscopy, nasal endoscopy, laryngeal endoscopy, audiometric assessment, vestibular assessment, biopsy of head and neck lesions, surgical treatment (including tonsillectomy, septoplasty, endoscopic sinus surgery, tympanoplasty, mastoidectomy, thyroidectomy, and head and neck cancer resection), and longitudinal management of chronic conditions (chronic sinusitis, chronic otitis media, head and neck cancer surveillance). The specialty coordinates closely with audiology (for hearing assessment and hearing aid management), with speech and language pathology (for voice and swallowing assessment), with oncology (for head and neck cancer management), and with pediatrics (for pediatric otolaryngologic conditions).

### 1.3 Why Otolaryngology Needs Specialized Configuration

Otolaryngology requires specialized configuration across several dimensions: structured documentation of audiometric testing results (pure tone audiometry, speech audiometry, tympanometry, auditory brainstem response), management of endoscopic images (nasal, laryngeal, otoscopic) with linkage to the anatomic site examined, tracking of hearing aids and other hearing devices across their lifecycle (including fitting, programming adjustments, repairs, and battery replacements), documentation of sinus treatment including endoscopic sinus surgery procedural records, and integration with audiology equipment, endoscopy equipment, and hearing aid programming systems. Ibn Hayan's otolaryngology overlay addresses these requirements through specialty-specific documentation templates, image management capabilities, and device tracking workflows, with configuration defaults reflecting typical otolaryngology practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.4 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Multidisciplinary Care

Otolaryngology coordinates closely with audiology (often operating with embedded audiologists within the same facility), with speech and language pathology, with head and neck oncology (for combined management of head and neck cancer including surgery, radiation, and chemotherapy), with plastic and reconstructive surgery (for facial reconstructive procedures), with sleep medicine (for sleep-disordered breathing management), with pediatrics (for pediatric otolaryngology), and with neurology (for vestibular disorders). Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports these compositions, with shared services such as the audiology suite, the endoscopy suite, and the operating room operating as facility-level shared services across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Otolaryngology operates across the mid-sized facility spectrum, from small group practices with two to five otolaryngologists through hospital otolaryngology departments with twenty or more otolaryngologists plus audiologists, speech pathologists, and trainees. The most common configurations are mid-sized group practices (six to twelve otolaryngologists with embedded audiology), large group practices (with full outpatient and surgical capability), and hospital otolaryngology departments (operating as a service line with operating room access and inpatient consultation). Ibn Hayan's Professional edition (E2) is the typical fit for mid-sized group practices per `PRODUCT_BIBLE.md` Section 16.5; Enterprise edition (E3) is required for hospital otolaryngology departments with operating room access, inpatient admitting privileges, and integration with hospital systems.

### 2.2 Ownership Patterns and Geographic Considerations

Otolaryngology facilities operate under private practice ownership, physician-group ownership, hospital-employment models, and academic medical centre ownership. Academic medical centre departments add teaching and research dimensions to the operational pattern, requiring configuration overlays for trainee supervision and teaching encounter documentation per `CLINIC_TYPES.md` Section 4.5. Geographic considerations emphasize hospital connectivity for surgical otolaryngology; otolaryngologists who perform surgery typically hold operating room privileges at one or more hospitals and require integration with hospital surgical scheduling and operative record systems. Ibn Hayan's Integration module (M17) supports hospital connectivity through standard integration profiles, while the offline-first posture documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 supports satellite clinic operations.

### 2.3 Regulatory Environment

Otolaryngology operates within a regulatory environment that includes procedural documentation requirements (for surgical procedures and endoscopic procedures), controlled substance prescribing oversight (for post-operative pain management), device tracking requirements (for cochlear implants and other implantable hearing devices), and quality reporting programs. Otolaryngology facilities that operate hearing aid services are additionally subject to regional hearing aid dispensing regulations, including licensing of hearing aid dispensers and consumer protection requirements for hearing aid sales. Ibn Hayan's Audit module (M16) records every procedural documentation event and every device tracking event; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including hearing aid dispensing regulations and device tracking requirements.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for otolaryngology reflects the specialty's emphasis on diagnostic test documentation, endoscopic image management, surgical procedural documentation, and hearing aid device tracking. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record with otolaryngologic history |
| Encounter | M02 | Required | Encounter management across outpatient, procedural, and surgical visits |
| Clinical Documentation | M03 | Required | Specialty-specific documentation templates for consultation, procedure, and endoscopy |
| Orders & Results | M04 | Required | Audiometric test orders, pathology orders, radiology orders |
| Pharmacy | M05 | Required | Medication management including post-operative pain management |
| Scheduling | M06 | Required | Outpatient scheduling, audiometry scheduling, surgical scheduling |
| Documents | M07 | Required | Consult letters, operative reports, audiogram reports, hearing aid documentation |
| Notifications | M08 | Required | Test result alerts, post-operative follow-up reminders, hearing aid recall notifications |
| Billing | M09 | Required | Encounter billing, procedural billing, surgical billing, hearing aid billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Chronic disease outreach, hearing aid recall |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For operating room staffing and call scheduling |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for procedural and device events |
| Integration | M17 | Required | Integration with audiometry equipment, endoscopy equipment, hearing aid programming systems, hospital systems |
| Reporting | M18 | Required | Audiometric outcome reporting, surgical outcomes, hearing aid service metrics |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems, hearing aid dispensing regulations |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Small group practice (T2) | E2 | M01–M09, M14–M19 | M10, M11 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13 |
| Large group practice (T4) | E2 or E3 | M01–M19 (all) | None typical |
| Hospital otolaryngology department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Audiometry Records

### 4.1 Capability Overview

Audiometry is the primary diagnostic testing modality of otolaryngology, providing assessment of hearing sensitivity, speech comprehension, middle ear function, and (in specialized testing) auditory pathway integrity. The typical otolaryngology practice performs or interprets audiometric testing at high volume, with each test generating a set of measurements (pure tone thresholds by frequency and ear, speech reception thresholds, speech discrimination scores, tympanometric measurements) and a graphical representation (the audiogram). Ibn Hayan's audiometry records capability, implemented through the Orders & Results module (M04) with integration through the Integration module (M17) and documentation through the Clinical Documentation module (M03), supports audiometric test acquisition workflow, structured measurement documentation, audiogram image storage and retrieval, longitudinal comparison, and integration with audiometry equipment through standard formats.

### 4.2 Test Acquisition and Integration

Audiometric testing is performed by an audiologist (or by a technician under audiologist supervision) using audiometry equipment; the test results are transmitted to Ibn Hayan through the Integration module (M17), using standard formats including HL7 ORU messages with structured measurement data and PDF attachments of the audiogram. The integration is configured per audiometry equipment vendor and model; the configuration maps the equipment's data fields to Ibn Hayan's audiometry data model. The test results are received, validated, and stored in the patient's record; the audiologist (or technician) who performed the test is recorded, as is the test equipment identifier. The acquisition workflow is auditable end-to-end, supporting equipment quality monitoring and regulatory compliance.

### 4.3 Structured Measurement Documentation

Audiometric measurement documentation is structured according to the standard audiology report format, with sections for pure tone audiometry (air conduction thresholds by frequency and ear, bone conduction thresholds by frequency and ear), speech audiometry (speech reception threshold, speech discrimination score), tympanometry (tympanogram type, peak pressure, peak compliance, ear canal volume), and (where applicable) specialized testing (auditory brainstem response, otoacoustic emissions, vestibular testing). The structured measurements support longitudinal comparison and registry integration; specific findings (such as asymmetric hearing loss or significant hearing threshold elevation) trigger registry membership for the relevant otolaryngologic registry. The documentation template is configurable per test type and per regional reporting standard.

### 4.4 Audiogram Image Storage and Retrieval

The audiogram (the graphical representation of pure tone thresholds) is stored as an image reference through the Integration module (M17), with the image stored in the audiometry equipment's data management system or in a Picture Archiving and Communication System (PACS). The image reference allows the otolaryngologist to access the audiogram from within Ibn Hayan's encounter documentation surface. Audiogram image storage and retrieval comply with regional medical record retention requirements; image lifecycle management is configured through the Integration module (M17) and is auditable.

### 4.5 Longitudinal Comparison

Longitudinal audiometric comparison presents the current test results alongside prior test results for the same patient, with the structured measurements displayed in tabular form and the audiograms displayed side by side. The comparison view is particularly valuable for patients with progressive hearing loss (where the trajectory guides intervention timing, including hearing aid fitting or cochlear implant evaluation), for patients on ototoxic medications (where surveillance audiometry detects early ototoxicity), and for patients with vestibular disorders (where serial vestibular testing supports diagnosis and management). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

---

## 5. Endoscopy Documentation

### 5.1 Capability Overview

Endoscopic examination is central to otolaryngologic diagnosis and treatment, providing direct visualization of the nasal cavity, nasopharynx, oropharynx, hypopharynx, and larynx. The typical otolaryngology practice performs endoscopic examinations at high volume, with each examination generating a set of findings and (typically) a set of images or video recordings. Ibn Hayan's endoscopy documentation capability, implemented through the Clinical Documentation module (M03) with image management through the Integration module (M17), supports endoscopy acquisition workflow, structured findings documentation, image and video storage and retrieval, longitudinal comparison, and integration with endoscopy equipment through standard formats.

### 5.2 Acquisition and Image Management

Endoscopic examinations are performed by the otolaryngologist (or by a trainee under supervision) using rigid or flexible endoscopes connected to image and video capture systems. Images and video recordings are transmitted to Ibn Hayan through the Integration module (M17), with image references (rather than the images themselves) stored in Ibn Hayan. The image references allow the otolaryngologist to access the images from within Ibn Hayan's encounter documentation surface. Image and video storage comply with regional medical record retention requirements; image lifecycle management is configured through the Integration module (M17) and is auditable.

### 5.3 Structured Findings Documentation

Endoscopy findings documentation is structured per anatomic site, with sections for nasal endoscopy (nasal cavity, middle meatus, sphenoethmoidal recess, nasopharynx), laryngeal endoscopy (epiglottis, false cords, true cords, arytenoids, pyriform sinuses, subglottis), and otoscopic examination (under microscopy where applicable: external canal, tympanic membrane, middle ear structures). The structured findings support longitudinal comparison and registry integration; specific findings (such as vocal cord lesion or middle ear effusion) trigger registry membership for the relevant otolaryngologic registry. The documentation template is configurable per examination type and per regional reporting standard.

### 5.4 Longitudinal Comparison

Longitudinal endoscopy comparison presents the current examination's findings alongside prior examination findings for the same anatomic site, with the structured findings displayed in tabular form and the images displayed side by side. The comparison view is particularly valuable for patients with chronic rhinosinusitis (where endoscopic findings guide medical and surgical management), for patients with laryngeal pathology (where lesion progression guides intervention), and for patients under surveillance for head and neck cancer (where early detection of recurrence is critical). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

---

## 6. Hearing Aid Management

### 6.1 Capability Overview

Hearing aid management is a defining capability of otolaryngology facilities that operate audiology services, encompassing the full lifecycle of hearing aid fitting, programming, maintenance, and replacement. The typical audiology service manages hundreds to thousands of hearing aids across the patient panel, with each hearing aid generating a longitudinal record of fitting, programming adjustments, repairs, battery replacements, and (eventually) replacement. Ibn Hayan's hearing aid management capability, implemented through the Clinical Documentation module (M03) with integration through the Integration module (M17), supports hearing aid fitting documentation, programming adjustment records, repair and maintenance tracking, hearing aid recall response, and integration with hearing aid programming systems.

### 6.2 Hearing Aid Fitting Documentation

Hearing aid fitting documentation captures the hearing aid manufacturer, model, serial number, fitting date, fitting audiologist, and fitting parameters (including the prescription formula used and the verification measures). The fitting documentation is linked to the patient's audiogram (which forms the basis for the hearing aid prescription) and to the encounter at which the fitting was performed. Hearing aids are tracked as device records, with bilateral fittings tracked as two separate device records (left ear and right ear) for clarity. The fitting documentation supports hearing aid dispensing regulatory compliance and supports recall response when manufacturer recalls are issued.

### 6.3 Programming Adjustment Records

Hearing aid programming adjustments are documented as discrete events, with each adjustment recording the date, the audiologist, the adjustment parameters, and the reason for adjustment. The adjustment records accumulate over time, forming the longitudinal history of the hearing aid's programming. The adjustment records are linked to the hearing aid device record and to the encounter at which the adjustment was performed. Programming adjustment integration with hearing aid programming systems (through the Integration module M17) is supported where the programming system supports data export; where integration is not available, the audiologist documents the adjustment parameters manually.

### 6.4 Repair and Maintenance Tracking

Hearing aid repairs and maintenance are tracked as discrete events, with each event recording the date, the type of event (repair, battery replacement, earmold replacement, cleaning), the performing location (in-house repair or manufacturer repair), the outcome, and the duration the hearing aid was out of service. The repair and maintenance records support patient communication (notifying the patient when the hearing aid is ready for pickup), manufacturer warranty management (tracking warranty coverage and claim submission), and clinical governance (identifying hearing aids with frequent repairs that may warrant replacement). Repair and maintenance tracking is particularly important for audiology services that maintain loaner hearing aid programs.

### 6.5 Hearing Aid Recall Response

Hearing aid manufacturer recalls are received through the Integration module (M17) or are entered manually by the administrator. The Reporting module (M18) queries the hearing aid device registry and identifies all patients in the facility with the affected hearing aid model. The Notifications module (M08) generates patient-specific recall notifications to the affected patients' care teams; the audiology service schedules follow-up appointments for the affected patients. The recall response is documented per patient; the recall is recorded in the audit trail. Recall response for hearing aids is similar to recall response for implantable cardiac devices documented in `docs/06_CLINIC_TYPES/CARDIOLOGY.md` Section 6.4, with the same governance posture.

---

## 7. Sinus Treatment Records

### 7.1 Capability Overview

Sinus treatment encompasses the medical and surgical management of sinonasal disease, including chronic rhinosinusitis (with and without nasal polyps), acute recurrent rhinosinusitis, fungal sinusitis, and sinonasal tumors. Medical sinus treatment includes topical and systemic corticosteroids, saline irrigation, antibiotics, and biologic therapy for severe disease. Surgical sinus treatment includes functional endoscopic sinus surgery (FESS), with the surgery performed using endoscopic visualization of the sinonasal anatomy. Ibn Hayan's sinus treatment records capability, implemented through the Clinical Documentation module (M03) with medication management through the Pharmacy module (M05), supports sinus treatment documentation, medical treatment tracking, surgical procedural documentation, and longitudinal outcome tracking.

### 7.2 Medical Treatment Documentation

Medical sinus treatment documentation captures the medication, dose, route, duration, and indication for each treatment course. Longitudinal medical treatment tracking presents the patient's medical treatment history for chronic rhinosinusitis, with each course displayed in chronological order. The tracking view supports assessment of treatment response, identification of treatment failure that may warrant surgical intervention, and monitoring of cumulative corticosteroid exposure (which carries long-term adverse effects). The tracking view integrates with the chronic rhinosinusitis registry, with treatment failure triggering registry review for potential biologic therapy or surgical intervention.

### 7.3 Surgical Procedural Documentation

Functional endoscopic sinus surgery procedural documentation is structured according to the standard operative report format, with sections for pre-operative assessment (indication, consent, pre-operative imaging), procedural details (anesthesia, equipment used, sinuses opened, ancillary procedures), findings (sinus anatomy, mucosal disease, polyps, pus), and post-operative assessment (complications, disposition, post-operative instructions). The documentation template is configurable per regional reporting standard. The procedural documentation is integrated with the patient's longitudinal endoscopy record; post-operative endoscopic examinations are compared to pre-operative endoscopic examinations to assess surgical outcome.

### 7.4 Longitudinal Outcome Tracking

Longitudinal sinus treatment outcome tracking presents the patient's sinus treatment trajectory, including medical treatments, surgical interventions, and endoscopic findings, in a single integrated view. The tracking view supports assessment of overall disease trajectory, identification of treatment failure or recurrence, and patient communication about treatment progress. The tracking view integrates with the chronic rhinosinusitis registry, with disease-specific quality of life measures (such as the SNOT-22 questionnaire) collected at defined intervals and tracked longitudinally. Quality of life measure integration supports both clinical decision-making and outcome reporting.

---

## 8. Specialty Workflows

### 8.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Outpatient consultation | Scheduled appointment | Comprehensive head and neck exam, endoscopy if indicated, assessment, plan | Physician, Nurse | M02, M03, M17 |
| Audiometric testing | Ordered test | Schedule, perform test, transmit results, interpret, document | Audiologist (technician), Physician | M04, M17 |
| Hearing aid fitting | Ordered fitting | Audiogram review, hearing aid selection, fitting, programming, verification, documentation | Audiologist, Physician | M03, M17 |
| Hearing aid adjustment | Scheduled or walk-in | Patient report, programming adjustment, verification, documentation | Audiologist | M03, M17 |
| Endoscopic examination | Performed at encounter | Acquire images, document findings, integrate into record | Physician, Nurse | M03, M17 |
| Endoscopic sinus surgery | Scheduled surgery | Pre-op consent, anesthesia, procedure, post-op documentation | Physician, Nurse, Anesthesiologist | M02, M03, M04 |
| Head and neck cancer surveillance | Surveillance interval reached | Generate recall, schedule, perform full exam with endoscopy, document | Receptionist, Nurse, Physician | M06, M08, M18 |
| Hearing aid recall response | Recall notification received | Match recall to fitted hearing aids, identify affected patients, generate recall notifications, schedule follow-up | Administrator, Audiologist, Physician | M08, M17, M18 |
| Post-operative follow-up | Post-surgery scheduled visit | Assess healing, remove packing if applicable, document, plan further care | Physician, Nurse | M02, M03 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The otolaryngology data model extends the platform's standard patient-encounter-centric model with entities for audiometric test records, endoscopy records, hearing aid device records, sinus treatment records, and otolaryngologic registry membership. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Audiometric test record | Documentation of an audiometric test acquisition and interpretation | Patient, encounter, test date, test type, measurements (pure tone thresholds, speech audiometry, tympanometry), audiogram image reference, interpretation |
| Endoscopy record | Documentation of an endoscopic examination | Patient, encounter, examination date, examination type (nasal, laryngeal, otoscopic), anatomic site, findings, image and video references |
| Hearing aid device record | Longitudinal record of a fitted hearing aid | Patient, hearing aid manufacturer, model, serial number, fitting date, fitting audiologist, fitting parameters, current status |
| Hearing aid programming adjustment | Documentation of a programming adjustment event | Patient, hearing aid reference, adjustment date, audiologist, adjustment parameters, reason |
| Hearing aid repair event | Documentation of a repair or maintenance event | Patient, hearing aid reference, event date, event type, performing location, outcome, out-of-service duration |
| Sinus treatment course | Documentation of a medical sinus treatment course | Patient, encounter, medication, dose, route, duration, indication, response |
| Sinus surgery record | Documentation of functional endoscopic sinus surgery | Patient, encounter, procedure date, anesthesia, sinuses opened, findings, complications |
| Otolaryngologic registry entry | Cohort membership for an otolaryngologic registry | Patient, registry type, enrolment date, monitoring indicators, treatment targets, review cadence |

### 9.3 Entity Relationships

The audiometric test record references the patient and the encounter; longitudinal audiometric comparison is supported through the patient reference. The endoscopy record references the patient and the encounter and includes image and video references to external storage. The hearing aid device record references the patient and the fitting encounter; the device record persists independently as a longitudinal record and is updated by subsequent adjustment, repair, and recall events. The hearing aid programming adjustment references the hearing aid device and the encounter; adjustments accumulate over time, forming the longitudinal programming history. The sinus surgery record references the patient and the encounter and is linked to pre-operative and post-operative endoscopy records for outcome assessment.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Outpatient otolaryngology consultation | Outpatient | Comprehensive head and neck examination with structured findings |
| Follow-up visit | Outpatient | Focused follow-up for established condition |
| Audiometry visit | Outpatient | Audiometric testing with structured measurement documentation |
| Hearing aid fitting visit | Outpatient | Hearing aid fitting with full fitting documentation |
| Hearing aid adjustment visit | Outpatient | Programming adjustment with parameter capture |
| Endoscopy visit | Outpatient | Endoscopic examination with image and findings documentation |
| Pre-operative assessment | Outpatient | Pre-operative assessment for scheduled surgery |
| Post-operative follow-up | Outpatient | Post-surgery assessment with healing documentation |
| Head and neck cancer surveillance visit | Outpatient | Full examination with endoscopy for surveillance |

### 10.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| Audiogram report | Test report with audiogram image | M07 Documents |
| Endoscopy report | Examination report with images | M07 Documents |
| Operative report | Surgical procedural report | M07 Documents |
| Hearing aid fitting certificate | Patient-facing fitting documentation | M07 Documents |
| Hearing aid warranty document | Patient-facing warranty documentation | M07 Documents |
| Hearing aid recall notice | Patient-facing recall notification | M08 Notifications |
| Post-operative instructions | Patient-facing post-operative care instructions | M07 Documents |

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Chronic rhinosinusitis registry dashboard | Cohort status with treatment trajectories and outcome measures | On demand |
| Hearing outcome report | Hearing threshold trajectory for patients with progressive hearing loss | Quarterly |
| Hearing aid service metrics | Repair rates, out-of-service durations, patient satisfaction | Quarterly |
| Surgical outcomes report | Surgical success, complications, revision rates | Quarterly |
| Head and neck cancer surveillance report | Surveillance visit completion, recurrence detection | Quarterly |
| Audiometric test volume report | Test volume by type and performing audiologist | Monthly |

### 11.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| Surgical volume report | Surgical procedures per otolaryngologist, by type | Monthly |
| Test turnaround report | Time from test order to interpretation | Weekly |
| No-show rate report | Missed appointments by clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |

### 11.3 Regulatory Reports

Regulatory reports include device tracking reporting for implantable hearing devices (cochlear implants, bone-anchored hearing aids), hearing aid dispensing regulatory reports (where required by regional regulation), and quality reporting to regional health authorities. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 12. Role & Permission Recommendations

### 12.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Otolaryngology |
|---|---|---|
| Physician (Otolaryngologist) | R01 | Clinical assessment, endoscopy, surgery, orders, documentation |
| Audiologist | R05 | Audiometric testing, hearing aid fitting and management, vestibular assessment |
| Nurse | R02 | Nursing assessment, procedure assistance, patient education, post-operative care |
| Technician | R04 | Audiometric testing (under audiologist supervision), equipment operation |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Outpatient scheduling, surgical scheduling, audiometry scheduling |
| Biller | R08 | Encounter billing, procedural billing, surgical billing, hearing aid billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 12.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, and by patient cohort per `PRODUCT_BIBLE.md` Section 21.4. Otolaryngology facilities typically scope physician access to the facility level for outpatient encounters and to the patient cohort level for inpatient encounters. Audiologist access is scoped to the audiology service and to the audiology patient cohort; the audiologist has access to audiometric records and hearing aid records but may not have full access to medical records. Surgical documentation access is scoped to the surgical team; access to operative records is restricted to the surgical team and to otolaryngologists with a documented care relationship to the patient. Hearing aid dispensing documentation access is scoped to the audiology service.

### 12.3 Custom Role Recommendations

Common custom roles for otolaryngology include the Audiologist role (composed of allied health professional permissions scoped to audiometric testing and hearing aid management), the Audiology Technician role (composed of technician permissions scoped to audiometric testing under supervision), the Hearing Aid Dispenser role (composed of audiologist permissions scoped to hearing aid dispensing, where regionally licensed separately), and the Surgical Coordinator role (composed of scheduler and administrator permissions scoped to surgical scheduling). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 13. Configuration Defaults

### 13.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Outpatient consultation slot duration | 30 minutes | Customer-adjustable |
| Follow-up visit slot duration | 20 minutes | Customer-adjustable |
| Audiometry visit slot duration | 45 minutes | Customer-adjustable per test type |
| Hearing aid fitting visit slot duration | 60 minutes | Customer-adjustable |
| Hearing aid adjustment visit slot duration | 30 minutes | Customer-adjustable |
| Endoscopy visit slot duration | 30 minutes | Customer-adjustable |
| Pre-operative assessment slot duration | 30 minutes | Customer-adjustable |
| Post-operative follow-up slot duration | 20 minutes | Customer-adjustable |
| Surgical procedure slot duration | Variable by procedure type | Customer-configurable per procedure type |

### 13.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Outpatient otolaryngology consultation | Customer-adjustable |
| Default otolaryngologic registry set | Chronic rhinosinusitis, head and neck cancer surveillance, hearing loss | Customer-adjustable |
| Audiogram report template | Regional audiology reporting standard | Configured through Localization module (M19) |
| Hearing aid fitting documentation | Regional dispensing regulatory standard | Configured through Localization module (M19) |

### 13.3 Procedural Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Procedure consent capture | Required before procedure start | Non-overridable |
| Surgical consent capture | Surgical-specific consent required | Non-overridable |
| Hearing aid fitting consent | Dispensing-specific consent required | Non-overridable per regional regulation |
| Hearing aid device tracking fields | Manufacturer, model, serial number, fitting date, fitting audiologist, fitting parameters | Non-overridable per regional regulation |

---

## 14. Onboarding Checklist

### 14.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that otolaryngology (C14) is the primary clinic type for the facility.
2. Activate the otolaryngology overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2; for hospital otolaryngology departments, enable all modules per the Enterprise edition.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, hearing aid dispensing regulations, and device tracking requirements.
5. Configure audiometry records: Configure integration with audiometry equipment; verify data flow; validate structured measurement template; configure audiogram image storage.
6. Configure endoscopy documentation: Configure integration with endoscopy equipment; verify image and video storage; validate structured findings template.
7. Configure hearing aid management: Configure integration with hearing aid programming systems; verify fitting documentation template; configure programming adjustment and repair tracking; configure hearing aid recall response workflow.
8. Configure sinus treatment records: Verify medical treatment documentation template; configure sinus surgery procedural documentation template; configure chronic rhinosinusitis registry with quality of life measure integration.
9. Configure otolaryngologic registries: Enable the default registry set; refine cohort criteria, monitoring indicators, and treatment targets.
10. Configure encounter templates: Review the default encounter templates listed in Section 10.1; refine templates to match the facility's documentation standards.
11. Configure role set and permissions: Provision the roles listed in Section 12.1; configure permission scope by facility, care team, patient cohort, and procedural team.
12. Configure integrations: Configure hospital integration (for surgical otolaryngology), PACS integration, and hearing aid programming system integration; validate integration data flow in the configuration sandbox.
13. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians and audiologists.
14. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 15. Sample Use Cases

### 15.1 Use Case — Chronic Rhinosinusitis Evaluation and Management

A 45-year-old patient presents with chronic nasal congestion, facial pressure, and decreased sense of smell lasting more than 12 weeks. The otolaryngologist conducts an outpatient consultation using the outpatient otolaryngology consultation template; nasal endoscopy is performed with image acquisition through the Integration module (M17). The endoscopic findings document polyps in the middle meatus bilaterally; the patient is enrolled in the chronic rhinosinusitis registry. A course of topical corticosteroid and saline irrigation is initiated through the Pharmacy module (M05); a CT scan of the sinuses is ordered through the Orders & Results module (M04). The SNOT-22 quality of life measure is administered at baseline and is recorded in the registry. At follow-up 6 weeks later, the endoscopy is repeated; the longitudinal endoscopy comparison view presents the current and prior findings side by side. The patient has not improved adequately; functional endoscopic sinus surgery is recommended and scheduled.

### 15.2 Use Case — Audiometric Assessment and Hearing Aid Fitting

A 70-year-old patient presents with progressive hearing loss. The otolaryngologist conducts an outpatient consultation and orders audiometric testing through the Orders & Results module (M04). The audiologist performs the testing using audiometry equipment; the results are transmitted to Ibn Hayan through the Integration module (M17), including the audiogram image. The audiogram documents bilateral sensorineural hearing loss; the otolaryngologist reviews the audiogram and recommends hearing aid fitting. The hearing aid fitting is scheduled; at the fitting visit, the audiologist documents the hearing aid manufacturer, model, serial number, fitting date, fitting parameters, and verification measures through the hearing aid fitting documentation template. The hearing aid device record is created in the patient's record; the fitting is linked to the audiogram that formed the prescription basis. The patient is scheduled for a follow-up adjustment visit at 4 weeks.

### 15.3 Use Case — Hearing Aid Programming Adjustment

A 65-year-old patient returns for a hearing aid adjustment 3 months after fitting, reporting that hearing in noisy environments remains difficult. The audiologist performs real-ear measurement and reprograms the hearing aid using the hearing aid programming system; the programming adjustment parameters are transmitted to Ibn Hayan through the Integration module (M17) and are documented in the hearing aid programming adjustment record. The longitudinal programming history view presents the fitting parameters and all subsequent adjustments in chronological order. The patient reports improvement at the follow-up visit; no further adjustment is needed at this time.

### 15.4 Use Case — Hearing Aid Recall Response

A hearing aid manufacturer issues a recall for a specific hearing aid model due to a battery performance issue. The recall notification is received through the Integration module (M17) or entered manually by the administrator. The Reporting module (M18) queries the hearing aid device registry and identifies 12 patients in the facility with the affected hearing aid model. The Notifications module (M08) generates patient-specific recall notifications to the affected patients' care teams; the audiology service schedules follow-up appointments for the affected patients. At each follow-up appointment, the hearing aid is sent for manufacturer repair; the repair event is documented in the hearing aid repair record, including the out-of-service duration. A loaner hearing aid is fitted and documented as a temporary device; the original hearing aid is re-fitted when the repair is complete. The recall response is recorded in the audit trail.

### 15.5 Use Case — Functional Endoscopic Sinus Surgery

A 50-year-old patient with chronic rhinosinusitis with nasal polyps has not responded to medical therapy. The otolaryngologist recommends functional endoscopic sinus surgery; the pre-operative assessment is documented through the pre-operative assessment template, including consent and pre-operative imaging review. The surgery is scheduled through the Scheduling module (M06) at the affiliated hospital. The surgery is performed under general anesthesia; the operative report is documented through the operative report template, including the sinuses opened, the findings, and any complications. Post-operative care instructions are generated through the Documents module (M07) and delivered to the patient. At the post-operative follow-up visit, the otolaryngologist performs endoscopy to assess healing; the longitudinal endoscopy comparison view presents the pre-operative, immediate post-operative, and current endoscopic findings. The SNOT-22 is repeated and recorded in the registry; the outcome is documented.

### 15.6 Use Case — Head and Neck Cancer Surveillance

A 60-year-old patient with a history of oropharyngeal cancer treated with surgery and radiation 2 years ago presents for routine surveillance. The otolaryngologist conducts a head and neck cancer surveillance visit using the surveillance visit template; the examination includes full head and neck examination and laryngeal endoscopy. The endoscopy images are acquired through the Integration module (M17) and are compared with prior surveillance endoscopies in the longitudinal comparison view. No recurrence is identified; the patient is scheduled for the next surveillance visit at the standard 3-month interval. The surveillance visit is recorded in the head and neck cancer surveillance registry; the registry supports tracking of surveillance intervals and identification of patients overdue for surveillance.

---

## 16. Best Practices

### 16.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; hearing aid dispensing regulations and device tracking requirements vary by region.
2. Validate audiometry, endoscopy, and hearing aid programming integrations carefully before go-live; integration failures can disrupt clinical workflow and can produce incomplete longitudinal records.
3. Configure hearing aid device tracking fields to the regional regulatory standard; incomplete device tracking can compromise recall response and regulatory compliance.
4. Use the configuration sandbox for all changes to audiometry templates, endoscopy templates, and hearing aid management rules; these changes have direct patient safety and regulatory compliance implications.
5. Maintain audiology vocabulary and reporting standards through the Localization module (M19); vocabulary consistency across facilities within a tenant supports cross-facility reporting and clinical governance.

### 16.2 Operational Best Practices

6. Conduct longitudinal endoscopy comparison at every surveillance visit; comparison is more clinically valuable than isolated interpretation.
7. Maintain complete hearing aid device records including fitting, adjustment, repair, and recall events; the device record is the foundation of recall response and is required for regulatory compliance.
8. Use the chronic rhinosinusitis registry as a daily operational tool; registry accuracy depends on ongoing attention to enrolment, monitoring, and review cadence.
9. Use quality of life measures (SNOT-22 and equivalent) at defined intervals for chronic conditions; the measures support both clinical decision-making and outcome reporting.
10. Conduct post-operative endoscopy at defined intervals after sinus surgery; the endoscopy supports assessment of healing and identification of complications or recurrence.

### 16.3 Governance Best Practices

11. Conduct a quarterly surgical outcomes review with the clinical lead; this review validates surgical quality and identifies outliers for review.
12. Conduct an annual hearing aid dispensing documentation audit; this audit validates that dispensing consent, fitting documentation, and warranty documentation are complete for every fitted hearing aid.
13. Conduct a monthly hearing aid repair rate review; this review identifies hearing aid models with elevated repair rates and supports hearing aid model selection decisions.

---

## 17. Related Documents

### 17.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C14 Otolaryngology; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 26 governs integration philosophy |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.4 covers surgical specialty single-specialty facilities including otolaryngology; Section 6 documents module recommendations |

### 17.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 12 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 12.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Cardiology | `docs/06_CLINIC_TYPES/CARDIOLOGY.md` | Related specialty with shared device tracking patterns |
| Ophthalmology | `docs/06_CLINIC_TYPES/OPHTHALMOLOGY.md` | Related surgical specialty |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Changes — including overlay revisions, registry set updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
