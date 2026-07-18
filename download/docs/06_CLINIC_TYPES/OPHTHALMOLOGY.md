# Ibn Hayan Healthcare Operating System
## Ophthalmology Clinics

| Field | Value |
|---|---|
| Document Title | Ophthalmology Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the ophthalmology overlay is amended |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for ophthalmology facilities |
| Scope | Specialty overview, target facilities, recommended modules, visual acuity records, slit lamp findings, intraocular pressure records, refraction records, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for ophthalmology (clinic type C12) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, refractive surgery-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the ophthalmology clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Visual Acuity Records
5. Slit Lamp Findings
6. Intraocular Pressure Records
7. Refraction Records
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

Ophthalmology is the surgical and medical specialty concerned with the diagnosis, management, and treatment of conditions of the eye and its adnexa. The ophthalmologist evaluates and manages conditions including refractive errors (myopia, hyperopia, astigmatism, presbyopia), cataract, glaucoma, age-related macular degeneration, diabetic retinopathy, retinal vascular disease, corneal disease, uveitis, strabismus, pediatric eye disease, neuro-ophthalmologic conditions, and ocular tumors. Scope of practice includes outpatient consultation, comprehensive eye examination, refraction, slit lamp biomicroscopy, fundus examination, tonometry, perimetry, optical coherence tomography, ophthalmic ultrasound, surgical procedures (including cataract surgery, glaucoma surgery, vitreoretinal surgery, corneal surgery, strabismus surgery, and refractive surgery), and longitudinal management of chronic eye diseases. Ibn Hayan treats ophthalmology as clinic type C12 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated High (reflecting diagnostic test data integration, surgical documentation, and bilateral data tracking) and recommended editions Professional (E2) and Enterprise (E3).

### 1.2 Patient Population and Clinical Activities

The ophthalmology patient population spans the full age spectrum, from infants with congenital eye disease through elderly patients with age-related eye disease, with peak utilization in older adults (cataract, glaucoma, age-related macular degeneration). Clinical activities include comprehensive eye examination (with each eye documented separately for visual acuity, refraction, intraocular pressure, slit lamp findings, and fundus findings), diagnostic testing (visual field testing, optical coherence tomography, ophthalmic ultrasound), longitudinal management of chronic eye diseases (glaucoma, age-related macular degeneration, diabetic retinopathy), and surgical procedures (with bilateral procedures typically performed on separate dates). The ophthalmology encounter is data-intensive: a typical patient generates visual acuity measurements, refraction measurements, intraocular pressure measurements, slit lamp findings, fundus findings, optical coherence tomography images, and visual field test results, all of which must be integrated into the longitudinal record with bilateral data tracking.

### 1.3 Why Ophthalmology Needs Specialized Configuration

Ophthalmology requires specialized configuration across multiple dimensions: bilateral data tracking (with each eye's findings documented separately for direct comparison), structured documentation of ophthalmic measurements (visual acuity using standardized charts, refraction using standardized notation, intraocular pressure using standardized units), management of ophthalmic images (fundus photography, optical coherence tomography, slit lamp photography) with linkage to the eye examined, documentation of ophthalmic procedures (with laterality, approach, and implants tracked), tracking of spectacle and contact lens prescriptions, and integration with ophthalmic diagnostic equipment (autorefractors, optical coherence tomography machines, perimeters, tonometers, biometers). Ibn Hayan's ophthalmology overlay addresses these requirements through specialty-specific documentation templates, image management capabilities, and integration surfaces, with configuration defaults reflecting typical ophthalmology practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.4 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Multidisciplinary Care

Ophthalmology coordinates closely with optometry (for primary eye care and refraction), with endocrinology (for diabetic retinopathy management), with neurology (for neuro-ophthalmologic conditions), with rheumatology (for uveitis associated with systemic autoimmune disease), with pediatrics (for pediatric eye disease and amblyopia management), with oncology (for ocular and orbital tumors), and with plastic and reconstructive surgery (for oculoplastic conditions). Ophthalmology also frequently operates alongside optometry services within multi-specialty facilities, with shared diagnostic equipment and shared patient panels. Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports these compositions, with shared services such as the optical coherence tomography suite, the visual field testing suite, and the operating room operating as facility-level shared services across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Ophthalmology operates across the mid-sized facility spectrum, from small group practices with two to five ophthalmologists through hospital ophthalmology departments with twenty or more ophthalmologists plus optometrists, technicians, and trainees. The most common configurations are mid-sized group practices (six to twelve ophthalmologists with embedded diagnostic testing and ambulatory surgery), large group practices (with full outpatient, surgical, and refractive surgery capability), and hospital ophthalmology departments (operating as a service line with operating room access and inpatient consultation). Ibn Hayan's Professional edition (E2) is the typical fit for mid-sized group practices per `PRODUCT_BIBLE.md` Section 16.5; Enterprise edition (E3) is required for hospital ophthalmology departments with operating room access, inpatient consultation, and integration with hospital systems.

### 2.2 Ownership Patterns and Geographic Considerations

Ophthalmology facilities operate under private practice ownership, physician-group ownership, corporate-owned ophthalmology practice chains, hospital-employment models, and academic medical centre ownership. The mix of medical ophthalmology, surgical ophthalmology, and refractive surgery varies by facility; some facilities are predominantly medical, some are predominantly surgical, and some are mixed. Geographic considerations for ophthalmology emphasize surgical facility access; ophthalmologists who perform surgery typically hold operating room privileges at one or more ambulatory surgery centers or hospitals and require integration with the surgical facility's scheduling and operative record systems. Rural ophthalmology practice frequently operates as an outreach model with the ophthalmologist traveling between satellite clinics and a central surgical facility. Ibn Hayan's offline-first posture, documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 (P11), supports satellite clinic operations.

### 2.3 Regulatory Environment

Ophthalmology operates within a regulatory environment that includes procedural documentation requirements (for surgical procedures), controlled substance prescribing oversight (for post-operative pain management), device tracking requirements (for intraocular lenses, glaucoma implants, and other implantable ophthalmic devices), spectacle and contact lens prescription regulatory requirements (including prescription expiration and patient access to prescriptions), and quality reporting programs (including ophthalmic quality measures for cataract surgery and glaucoma care). Ibn Hayan's Audit module (M16) records every procedural documentation event and every device tracking event; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including spectacle and contact lens prescription regulations and ophthalmic quality reporting.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for ophthalmology reflects the specialty's emphasis on diagnostic test documentation, image management, surgical procedural documentation, and spectacle and contact lens prescription tracking. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record with ophthalmic history |
| Encounter | M02 | Required | Encounter management across outpatient, diagnostic, surgical, and follow-up visits |
| Clinical Documentation | M03 | Required | Specialty-specific documentation templates for consultation, examination, procedure |
| Orders & Results | M04 | Required | Diagnostic test orders, optical coherence tomography, visual field tests, biometry |
| Pharmacy | M05 | Required | Ophthalmic medication management (topical and systemic), post-operative medication management |
| Scheduling | M06 | Required | Outpatient scheduling, diagnostic testing scheduling, surgical scheduling |
| Documents | M07 | Required | Consult letters, operative reports, spectacle and contact lens prescriptions |
| Notifications | M08 | Required | Test result alerts, post-operative follow-up reminders, recall notifications |
| Billing | M09 | Required | Encounter billing, procedural billing, surgical billing, spectacle and contact lens billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Chronic disease outreach, spectacle and contact lens recall |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For surgical facility staffing and call scheduling |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for procedural and device events |
| Integration | M17 | Required | Integration with autorefractors, optical coherence tomography machines, perimeters, tonometers, biometers, surgical microscopes |
| Reporting | M18 | Required | Ophthalmic quality measures, surgical outcomes, chronic disease registries |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems, spectacle and contact lens prescription regulations |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Small group practice (T2) | E2 | M01–M09, M14–M19 | M10, M11 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13 |
| Large group practice with surgical facility (T4) | E2 or E3 | M01–M19 (all) | None typical |
| Hospital ophthalmology department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Visual Acuity Records

### 4.1 Capability Overview

Visual acuity measurement is the foundational diagnostic measurement of ophthalmology, providing quantitative assessment of the eye's ability to resolve detail. Visual acuity is measured for each eye separately (with and without correction, and with pinhole correction where indicated) and for both eyes together, using standardized charts (Snellen chart, LogMAR chart, ETDRS chart) at standardized distances. Ibn Hayan's visual acuity records capability, implemented through the Clinical Documentation module (M03) with integration through the Integration module (M17), supports structured visual acuity documentation, bilateral data tracking, longitudinal comparison, and integration with autorefractors and electronic visual acuity chart systems.

### 4.2 Structured Documentation

Visual acuity documentation is structured to capture the standardized measurement elements: eye (right, left, both), correction status (uncorrected, with current correction, with pinhole, with trial refraction), chart type (Snellen, LogMAR, ETDRS), distance (standard 20 feet or 6 meters, near), and the measurement (in Snellen notation such as 20/40, in LogMAR notation such as 0.3, in ETDRS letter count). The structured documentation supports bilateral data tracking (with each eye's measurements stored separately for direct comparison) and supports longitudinal comparison (with prior measurements for the same eye displayed alongside current measurements). The documentation template is configurable per facility and per regional convention.

### 4.3 Bilateral Data Tracking

Bilateral data tracking is a defining characteristic of ophthalmology documentation, with each eye's findings documented separately for direct comparison. The bilateral tracking is enforced through the structured documentation; visual acuity for the right eye and the left eye are recorded as separate measurements, and the structured documentation supports comparison views that display the right and left measurements side by side. Bilateral tracking is particularly important for conditions that may affect one eye more than the other (such as asymmetric glaucoma, unilateral retinal vein occlusion, or post-surgical eyes where one eye has had surgery and the other has not). The bilateral tracking configuration is consistent across all ophthalmic measurements in Ibn Hayan.

### 4.4 Longitudinal Comparison

Longitudinal visual acuity comparison presents the current measurements alongside prior measurements for the same eye, with the measurements displayed in tabular form for direct comparison. The comparison view is particularly valuable for patients with progressive eye disease (where visual acuity trajectory guides treatment decisions), for patients on disease-modifying therapy (where visual acuity is one of the outcome measures), and for patients undergoing cataract surgery (where pre-operative and post-operative visual acuity comparison is the primary outcome measure). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

### 4.5 Integration with Visual Acuity Equipment

Visual acuity measurement may be acquired through integration with electronic visual acuity chart systems, with the measurements transmitted to Ibn Hayan through the Integration module (M17) using vendor-specific or standard formats. The integration is configured per equipment vendor and model; the configuration maps the equipment's data fields to Ibn Hayan's visual acuity data model. Where integration is not available, the measurements are entered manually by the technician or ophthalmologist; the manual entry is supported by structured fields that enforce the standard notation. The integration supports the high-volume measurement workflow of ophthalmology practice and reduces manual entry errors.

---

## 5. Slit Lamp Findings

### 5.1 Capability Overview

Slit lamp biomicroscopy is the primary diagnostic examination of ophthalmology, providing magnified visualization of the anterior segment structures (eyelids, conjunctiva, cornea, anterior chamber, iris, lens) and (with auxiliary lenses) the posterior segment (vitreous, retina, optic nerve). The typical ophthalmology encounter includes slit lamp examination of both eyes, with findings documented for each structure and for each eye separately. Ibn Hayan's slit lamp findings capability, implemented through the Clinical Documentation module (M03) with image management through the Integration module (M17), supports structured slit lamp findings documentation, bilateral data tracking, image and photograph storage and retrieval, and longitudinal comparison.

### 5.2 Structured Documentation

Slit lamp findings documentation is structured anatomically, with sections for eyelids, conjunctiva, cornea, anterior chamber (including depth and cells and flare), iris, lens (including grading of cataract using standardized systems such as LOCS III), vitreous (where visible), and (with auxiliary lenses) retina and optic nerve. The structured documentation supports bilateral data tracking (with each eye's findings documented separately) and supports longitudinal comparison (with prior findings for the same eye displayed alongside current findings). The documentation template is configurable per facility and per regional convention.

### 5.3 Image and Photograph Management

Slit lamp photographs (acquired using a slit lamp-mounted camera or a separate external eye camera) are stored through integration with the photography equipment or with a Picture Archiving and Communication System (PACS), with image references (not the images themselves) stored in Ibn Hayan through the Integration module (M17). The image reference allows the ophthalmologist to access the images from within Ibn Hayan's encounter documentation surface. Image storage and retrieval comply with regional medical image retention requirements; image lifecycle management is configured through the Integration module (M17) and is auditable.

### 5.4 Longitudinal Comparison

Longitudinal slit lamp comparison presents the current findings alongside prior findings for the same eye, with the structured findings displayed in tabular form and the slit lamp photographs displayed side by side. The comparison view is particularly valuable for patients with progressive anterior segment disease (such as cataract progression, corneal disease progression, or anterior chamber inflammation), for patients on topical medications (where treatment response is assessed by slit lamp findings), and for post-surgical patients (where slit lamp findings guide post-operative management). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

---

## 6. Intraocular Pressure Records

### 6.1 Capability Overview

Intraocular pressure (IOP) measurement is the primary diagnostic measurement for glaucoma and is routinely measured at most ophthalmology encounters. IOP is measured for each eye separately, using standardized methods (Goldmann applanation tonometry, iCare rebound tonometry, Perkins tonometry, non-contact tonometry), with measurements recorded in millimeters of mercury (mmHg). Ibn Hayan's intraocular pressure records capability, implemented through the Clinical Documentation module (M03) with integration through the Integration module (M17), supports structured IOP documentation, bilateral data tracking, longitudinal comparison, and integration with tonometers.

### 6.2 Structured Documentation

IOP documentation captures the eye (right, left), the measurement value (in mmHg), the measurement method (Goldmann, iCare, Perkins, non-contact), the time of measurement (where relevant for diurnal variation assessment), and (where applicable) the correction for central corneal thickness. The structured documentation supports bilateral data tracking and longitudinal comparison; the bilateral tracking is particularly important for glaucoma, where asymmetric IOP elevation may indicate early glaucomatous damage. The documentation template is configurable per facility and per regional convention.

### 6.3 Diurnal Variation Assessment

Diurnal IOP variation assessment is performed for selected patients (typically those with suspected glaucoma despite normal IOP at single measurements, or those with progression despite apparently controlled IOP), with IOP measured at multiple time points across the day. The diurnal variation assessment is documented using a structured template that captures the multiple measurements and presents them graphically; the assessment supports identification of peak IOP time and supports treatment timing decisions. The diurnal variation assessment is typically performed in the office over the course of a single day; home tonometry devices (where used) generate IOP measurements that are integrated through the Integration module (M17) or are entered manually by the patient through the patient portal.

### 6.4 Longitudinal Comparison

Longitudinal IOP comparison presents the current measurements alongside prior measurements for the same eye, with the measurements displayed in tabular form and graphically over time. The comparison view is particularly valuable for patients with glaucoma (where IOP trajectory guides treatment intensification), for patients on IOP-lowering medications (where treatment response is assessed by IOP trajectory), and for post-glaucoma surgery patients (where IOP trajectory guides post-operative management). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

### 6.5 Integration with Tonometers

IOP measurement may be acquired through integration with electronic tonometers (particularly non-contact tonometers and iCare rebound tonometers), with the measurements transmitted to Ibn Hayan through the Integration module (M17) using vendor-specific formats. The integration is configured per equipment vendor and model; the configuration maps the equipment's data fields to Ibn Hayan's IOP data model. Where integration is not available (such as for Goldmann applanation tonometry, which is typically read manually), the measurements are entered manually by the technician or ophthalmologist; the manual entry is supported by structured fields that enforce the standard notation.

---

## 7. Refraction Records

### 7.1 Capability Overview

Refraction is the process of measuring the eye's refractive error and determining the corrective lens prescription that provides the best visual acuity. Refraction is performed at most comprehensive ophthalmology encounters and is the basis for spectacle and contact lens prescriptions. The refraction measurement is documented using standardized notation (sphere, cylinder, axis, addition for near) for each eye separately. Ibn Hayan's refraction records capability, implemented through the Clinical Documentation module (M03) with integration through the Integration module (M17), supports structured refraction documentation, bilateral data tracking, longitudinal comparison, integration with autorefractors, and spectacle and contact lens prescription generation.

### 7.2 Structured Documentation

Refraction documentation captures the eye (right, left), the measurement type (subjective refraction, objective refraction from autorefractor, cycloplegic refraction), the sphere (in diopters), the cylinder (in diopters), the axis (in degrees), the addition for near (in diopters, where applicable), and the visual acuity achieved with the refraction. The structured documentation uses the standard ophthalmic notation (with plus or minus cylinder convention configurable per facility and per regional convention). The documentation supports bilateral data tracking and longitudinal comparison; the bilateral tracking supports direct comparison of right and left eye prescriptions, and the longitudinal comparison supports tracking of refractive error changes over time (particularly in children, where myopia progression is monitored).

### 7.3 Spectacle and Contact Lens Prescription Generation

Refraction measurements support the generation of spectacle and contact lens prescriptions through the Documents module (M07). The spectacle prescription includes the refraction measurements, the pupillary distance, the prescription date, and the prescription expiration date (per regional regulation); the contact lens prescription additionally includes the lens type, base curve, diameter, and (where applicable) the lens material and manufacturer. The prescription generation is integrated with the regional regulatory framework through the Localization module (M19); prescription expiration and patient access to prescriptions are configured per regional regulation. The prescription is delivered to the patient through the patient portal or as a printed document.

### 7.4 Longitudinal Comparison

Longitudinal refraction comparison presents the current measurements alongside prior measurements for the same eye, with the measurements displayed in tabular form for direct comparison. The comparison view is particularly valuable for children (where myopia progression is monitored and may warrant myopia control interventions), for patients with cataract progression (where refraction changes may indicate cataract progression), for patients with corneal disease (where refraction changes may indicate disease progression), and for post-refractive surgery patients (where refraction stability is monitored). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

### 7.5 Integration with Autorefractors

Objective refraction may be acquired through integration with autorefractors, with the measurements transmitted to Ibn Hayan through the Integration module (M17) using vendor-specific formats. The integration is configured per equipment vendor and model; the configuration maps the equipment's data fields to Ibn Hayan's refraction data model. Where integration is not available, the measurements are entered manually by the technician or ophthalmologist. Autorefractor measurements are typically used as a starting point for subjective refraction; the autorefractor measurement is recorded in the encounter documentation alongside the subjective refraction result.

---

## 8. Specialty Workflows

### 8.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Comprehensive eye examination | Scheduled appointment | Visual acuity, refraction, slit lamp, IOP, fundus, assessment, plan | Technician, Physician | M02, M03, M17 |
| Glaucoma evaluation | Scheduled or referral | Comprehensive exam with diurnal IOP, visual field, OCT, assessment, plan | Technician, Physician | M02, M03, M04, M17 |
| Cataract evaluation | Scheduled or referral | Comprehensive exam with biometry, assessment, surgical planning | Technician, Physician | M02, M03, M04, M17 |
| Intravitreal injection | Scheduled treatment | Consent, pre-injection assessment, injection, post-injection assessment, documentation | Physician, Nurse | M02, M03, M04 |
| Cataract surgery | Scheduled surgery | Pre-op consent, anesthesia, procedure, IOL implant tracking, post-op documentation | Physician, Nurse, Anesthesiologist | M02, M03, M04, M17 |
| Refractive surgery | Scheduled surgery | Pre-op consent, anesthesia, procedure, post-op documentation | Physician, Nurse | M02, M03, M04 |
| Diabetic retinopathy surveillance | Surveillance interval reached | Generate recall, schedule, perform comprehensive exam with fundus photography and OCT, document | Receptionist, Technician, Physician | M06, M08, M18 |
| Post-operative follow-up | Scheduled post-op visit | Assess healing, IOP, slit lamp, document, plan further care | Physician, Nurse | M02, M03 |
| Spectacle and contact lens prescription | Patient request or at visit | Refraction, prescription generation, documentation, delivery | Technician, Physician | M03, M07 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The ophthalmology data model extends the platform's standard patient-encounter-centric model with entities for visual acuity records, refraction records, IOP records, slit lamp findings records, fundus examination records, ophthalmic image records, ophthalmic surgical records, and ophthalmic registry membership. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Visual acuity record | Documentation of a visual acuity measurement | Patient, encounter, eye, correction status, chart type, distance, measurement, measurement date |
| Refraction record | Documentation of a refraction measurement | Patient, encounter, eye, measurement type, sphere, cylinder, axis, addition, achieved visual acuity, measurement date |
| Intraocular pressure record | Documentation of an IOP measurement | Patient, encounter, eye, measurement value, measurement method, time of measurement, central corneal thickness correction, measurement date |
| Slit lamp findings record | Documentation of slit lamp biomicroscopy findings | Patient, encounter, eye, eyelids, conjunctiva, cornea, anterior chamber, iris, lens, vitreous, retina, optic nerve, image references |
| Fundus examination record | Documentation of fundus examination findings | Patient, encounter, eye, optic disc, macula, vessels, periphery, image references |
| Ophthalmic image record | Documentation of an ophthalmic image (fundus photo, OCT, slit lamp photo) | Patient, encounter, eye, image type, anatomic structure, image reference, acquisition date, equipment identifier |
| Ophthalmic surgical record | Documentation of an ophthalmic surgical procedure | Patient, encounter, procedure date, procedure type, laterality, approach, findings, implants, complications |
| Ophthalmic registry entry | Cohort membership for an ophthalmic registry | Patient, registry type, enrolment date, monitoring indicators, treatment targets, review cadence |
| Spectacle or contact lens prescription | Patient-facing prescription document | Patient, encounter, prescription type (spectacle, contact lens), right eye prescription, left eye prescription, prescription date, expiration date |

### 9.3 Entity Relationships

The visual acuity record references the patient and the encounter; bilateral data tracking is supported through the eye attribute. The refraction record references the patient and the encounter and supports generation of spectacle and contact lens prescriptions. The IOP record references the patient and the encounter; diurnal variation assessment is supported through multiple IOP records at different times. The slit lamp findings record references the patient and the encounter and includes image references. The ophthalmic surgical record references the patient and the encounter and includes implant records (for intraocular lenses, glaucoma implants, and other devices). The spectacle or contact lens prescription references the refraction record and the encounter; prescription expiration is enforced per regional regulation.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Comprehensive eye examination | Outpatient | Comprehensive eye examination with all standard measurements and findings |
| Follow-up visit | Outpatient | Focused follow-up for established condition |
| Glaucoma evaluation | Outpatient | Comprehensive glaucoma evaluation with diurnal IOP, visual field, OCT |
| Cataract evaluation | Outpatient | Cataract evaluation with biometry and surgical planning |
| Diabetic retinopathy surveillance | Outpatient | Surveillance visit with fundus photography and OCT |
| Pre-operative assessment | Outpatient | Pre-operative assessment for scheduled surgery |
| Post-operative follow-up | Outpatient | Post-surgery assessment with healing documentation |
| Intravitreal injection visit | Outpatient | Intravitreal injection procedure with pre- and post-injection assessment |
| Refraction visit | Outpatient | Refraction with prescription generation |

### 10.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| Operative report | Surgical procedural report | M07 Documents |
| Spectacle prescription | Patient-facing spectacle prescription | M07 Documents |
| Contact lens prescription | Patient-facing contact lens prescription | M07 Documents |
| Intravitreal injection note | Procedural record for intravitreal injection | M07 Documents |
| IOL implantation certificate | Patient-facing intraocular lens implantation documentation | M07 Documents |
| Post-operative instructions | Patient-facing post-operative care instructions | M07 Documents |
| Diabetic retinopathy surveillance report | Surveillance report with fundus photo and OCT findings | M07 Documents |

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Glaucoma registry dashboard | Cohort status with IOP trajectory, visual field progression, medication history | On demand |
| Diabetic retinopathy surveillance report | Surveillance visit completion, severity progression | Quarterly |
| Cataract surgery outcomes report | Pre- and post-operative visual acuity, complications | Quarterly |
| Intravitreal injection outcomes report | Visual acuity trajectory, injection frequency, complications | Quarterly |
| AMD registry dashboard | Cohort status with visual acuity trajectory and OCT findings | On demand |
| Refractive surgery outcomes report | Pre- and post-operative refraction and visual acuity | Quarterly |

### 11.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| Surgical volume report | Surgical procedures per ophthalmologist, by type | Monthly |
| Diagnostic test volume report | Diagnostic tests by type and performing technician | Monthly |
| No-show rate report | Missed appointments by clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |

### 11.3 Regulatory Reports

Regulatory reports include device tracking reporting for intraocular lenses and other implantable ophthalmic devices, spectacle and contact lens prescription regulatory reporting (where required), and ophthalmic quality measure reporting to regional health authorities. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 12. Role & Permission Recommendations

### 12.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Ophthalmology |
|---|---|---|
| Physician (Ophthalmologist) | R01 | Clinical assessment, diagnosis, treatment, surgery, orders, documentation |
| Optometrist | R05 | Comprehensive eye examination, refraction, diagnostic testing, primary eye care |
| Ophthalmic technician | R04 | Visual acuity measurement, refraction assistance, IOP measurement, OCT acquisition, visual field testing |
| Nurse | R02 | Nursing assessment, procedure assistance, intravitreal injection assistance, patient education |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Outpatient scheduling, diagnostic testing scheduling, surgical scheduling |
| Biller | R08 | Encounter billing, procedural billing, surgical billing, spectacle and contact lens billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 12.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, and by patient cohort per `PRODUCT_BIBLE.md` Section 21.4. Ophthalmology facilities typically scope physician and optometrist access to the facility level. Ophthalmic technician access is scoped to the diagnostic tests they perform; the technician has access to the test records but not to the full clinical assessment. Surgical documentation access is scoped to the surgical team; access to operative records is restricted to the surgical team and to ophthalmologists with a documented care relationship to the patient. Spectacle and contact lens prescription access is scoped to the prescribing clinician and to authorized optical staff; prescription access is logged for regulatory compliance.

### 12.3 Custom Role Recommendations

Common custom roles for ophthalmology include the Optometrist role (composed of allied health professional permissions scoped to comprehensive eye examination and refraction), the Ophthalmic Technician role (composed of technician permissions scoped to diagnostic test performance), the Surgical Coordinator role (composed of scheduler and administrator permissions scoped to surgical scheduling), and the Optical Staff role (composed of scheduler and biller permissions scoped to spectacle and contact lens dispensing). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 13. Configuration Defaults

### 13.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Comprehensive eye examination slot duration | 30 minutes | Customer-adjustable |
| Follow-up visit slot duration | 20 minutes | Customer-adjustable |
| Glaucoma evaluation slot duration | 60 minutes | Customer-adjustable |
| Cataract evaluation slot duration | 45 minutes | Customer-adjustable |
| Intravitreal injection visit slot duration | 30 minutes | Customer-adjustable |
| Cataract surgery slot duration | Variable by procedure | Customer-configurable |
| Refraction visit slot duration | 20 minutes | Customer-adjustable |
| Diabetic retinopathy surveillance slot duration | 30 minutes | Customer-adjustable |

### 13.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Comprehensive eye examination | Customer-adjustable |
| Default ophthalmic registry set | Glaucoma, diabetic retinopathy, age-related macular degeneration, cataract | Customer-adjustable |
| Visual acuity chart type | Regional standard (Snellen or LogMAR) | Configured through Localization module (M19) |
| Refraction notation convention | Regional convention (plus or minus cylinder) | Configured through Localization module (M19) |
| IOP measurement method | Goldmann applanation (regional default) | Customer-adjustable |
| Spectacle prescription expiration | Regional regulatory requirement (typically 1 to 2 years) | Configured through Localization module (M19) |

### 13.3 Procedural Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Procedure consent capture | Required before procedure start | Non-overridable |
| Surgical consent capture | Surgical-specific consent required | Non-overridable |
| IOL implant tracking fields | Manufacturer, model, serial number, lot number, implant date, implanting surgeon, laterality | Non-overridable per regional regulation |
| Spectacle prescription delivery | Patient portal or printed document | Customer-adjustable |

---

## 14. Onboarding Checklist

### 14.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that ophthalmology (C12) is the primary clinic type for the facility.
2. Activate the ophthalmology overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2; for hospital ophthalmology departments, enable all modules per the Enterprise edition.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, spectacle and contact lens prescription regulations, and ophthalmic quality reporting formats.
5. Configure visual acuity records: Verify structured visual acuity template; configure chart type and notation per regional convention; configure integration with electronic visual acuity chart systems.
6. Configure slit lamp findings: Verify structured slit lamp template with anatomically organized fields; configure image management integration.
7. Configure intraocular pressure records: Verify structured IOP template; configure measurement method defaults; configure diurnal variation assessment; configure integration with tonometers.
8. Configure refraction records: Verify structured refraction template with bilateral tracking; configure notation convention; configure spectacle and contact lens prescription generation.
9. Configure ophthalmic image management: Configure integration with fundus photography, OCT, and slit lamp photography equipment; verify image storage and retrieval.
10. Configure ophthalmic registries: Enable the default registry set; refine cohort criteria, monitoring indicators, and treatment targets.
11. Configure encounter templates: Review the default encounter templates listed in Section 10.1; refine templates to match the facility's documentation standards.
12. Configure role set and permissions: Provision the roles listed in Section 12.1; configure permission scope by facility, care team, patient cohort, and procedural team.
13. Configure integrations: Configure all equipment integrations, surgical facility integration, and PACS integration; validate integration data flow in the configuration sandbox.
14. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians and technicians.
15. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 15. Sample Use Cases

### 15.1 Use Case — Comprehensive Eye Examination and Cataract Diagnosis

A 68-year-old patient presents with progressive visual blurring. The ophthalmic technician performs visual acuity measurement (with integration to the electronic visual acuity chart), autorefraction, and IOP measurement; the measurements are transmitted to Ibn Hayan through the Integration module (M17). The ophthalmologist performs slit lamp biomicroscopy and fundus examination; the findings are documented in the structured slit lamp findings template, with bilateral data tracking. The slit lamp findings document a nuclear sclerotic cataract in the right eye and a mild nuclear sclerotic cataract in the left eye; the visual acuity is reduced proportionally. The ophthalmologist documents the assessment and recommends cataract surgery for the right eye; biometry is ordered through the Orders & Results module (M04) for intraocular lens power calculation. The patient is scheduled for cataract evaluation follow-up to review biometry and surgical planning.

### 15.2 Use Case — Glaucoma Evaluation and Management

A 55-year-old patient is referred for elevated IOP noted at a routine optometry examination. The ophthalmologist conducts a glaucoma evaluation using the glaucoma evaluation template; diurnal IOP assessment is performed with measurements at multiple time points. Visual field testing is performed using a perimeter; the results are transmitted to Ibn Hayan through the Integration module (M17). OCT of the optic nerve is performed; the results are integrated into the patient's record. The ophthalmologist diagnoses primary open-angle glaucoma in the right eye; the patient is enrolled in the glaucoma registry; IOP-lowering medication is initiated through the Pharmacy module (M05). The longitudinal IOP comparison view, visual field progression view, and OCT progression view are initiated; the patient is scheduled for follow-up at the standard 3-month interval to assess treatment response.

### 15.3 Use Case — Cataract Surgery with Intraocular Lens Implantation

A 70-year-old patient with cataract-related visual impairment undergoes elective cataract surgery. The pre-operative assessment is documented through the pre-operative assessment template, including consent, biometry review, and intraocular lens power selection. The surgery is performed under topical anesthesia; the operative report is documented through the operative report template, including the procedure details, the phacoemulsification parameters, and the intraocular lens implantation. The intraocular lens manufacturer, model, serial number, lot number, implant date, implanting surgeon, and laterality are recorded through the implant tracking capability. The patient is enrolled in the cataract surgery outcomes registry; post-operative medications are prescribed through the Pharmacy module (M05). At the post-operative follow-up visit, the ophthalmologist assesses healing, IOP, and visual acuity; the longitudinal visual acuity comparison view presents the pre-operative and post-operative measurements. The patient is scheduled for cataract surgery for the fellow eye at a separate date.

### 15.4 Use Case — Intravitreal Injection for Wet Age-Related Macular Degeneration

A 78-year-old patient with wet age-related macular degeneration is managed with monthly intravitreal anti-VEGF injections. The patient is a member of the AMD registry; at each intravitreal injection visit, the ophthalmologist uses the intravitreal injection visit template to document the pre-injection assessment (visual acuity, IOP, slit lamp, OCT), the injection (drug, dose, lot number, injection site), and the post-injection assessment (IOP, slit lamp). The longitudinal visual acuity comparison view and OCT progression view present the trajectory of the disease and the treatment response. The injection frequency is adjusted based on the disease activity; the patient is scheduled for the next injection at the standard 4-week interval. The intravitreal injection outcomes report aggregates the patient cohort's outcomes for quality monitoring.

### 15.5 Use Case — Diabetic Retinopathy Surveillance

A 50-year-old patient with type 2 diabetes is referred for diabetic retinopathy surveillance. The patient is enrolled in the diabetic retinopathy surveillance registry; the surveillance visit is conducted using the diabetic retinopathy surveillance template. Fundus photography is performed; the images are transmitted to Ibn Hayan through the Integration module (M17). OCT is performed; the results are integrated into the patient's record. The ophthalmologist documents the diabetic retinopathy severity grading; the patient is diagnosed with mild non-proliferative diabetic retinopathy. The longitudinal surveillance view is initiated with the current findings; the patient is scheduled for the next surveillance visit at the standard 6-month interval. The surveillance report is generated through the Documents module (M07) and is transmitted to the referring physician through the Integration module (M17).

### 15.6 Use Case — Refraction and Spectacle Prescription

A 35-year-old patient presents for routine eye examination and spectacle prescription renewal. The ophthalmic technician performs autorefraction; the measurements are transmitted to Ibn Hayan through the Integration module (M17). The ophthalmologist performs subjective refraction; the measurements are documented in the refraction record. The visual acuity achieved with the refraction is documented; the spectacle prescription is generated through the Documents module (M07), with the prescription expiration date set per the regional regulatory framework. The prescription is delivered to the patient through the patient portal; the patient has the prescription filled at the optical shop of their choice. The longitudinal refraction comparison view presents the current and prior prescriptions, supporting assessment of refractive error stability.

---

## 16. Best Practices

### 16.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; spectacle and contact lens prescription regulations and ophthalmic quality reporting formats vary by region.
2. Validate visual acuity, IOP, refraction, and imaging integrations carefully before go-live; integration failures can disrupt clinical workflow and can produce incomplete longitudinal records.
3. Configure bilateral data tracking consistently across all ophthalmic measurements; bilateral tracking is a defining characteristic of ophthalmology documentation.
4. Use the configuration sandbox for all changes to IOL implant tracking, surgical consent templates, and spectacle prescription regulations; these changes have direct patient safety and regulatory compliance implications.
5. Maintain the ophthalmic vocabulary and notation conventions through the Localization module (M19); vocabulary consistency across facilities within a tenant supports cross-facility reporting and clinical governance.

### 16.2 Operational Best Practices

6. Conduct longitudinal comparison at every follow-up visit for chronic eye disease; comparison is more clinically valuable than isolated assessment.
7. Use the glaucoma registry dashboard as a daily operational tool; registry accuracy depends on ongoing attention to enrolment, monitoring, and review cadence.
8. Maintain complete intraocular lens implant records; the implant record is the foundation of recall response and is required for regulatory compliance.
9. Use the diabetic retinopathy surveillance registry to ensure that patients with diabetes receive surveillance at the appropriate interval; surveillance interval adherence is a quality measure.
10. Conduct post-operative visual acuity assessment at every post-operative visit; the assessment is the primary outcome measure for surgical procedures.

### 16.3 Governance Best Practices

11. Conduct a quarterly surgical outcomes review with the clinical lead; this review validates surgical quality and identifies outliers for review.
12. Conduct an annual spectacle and contact lens prescription audit; this audit validates that prescriptions are issued with the correct expiration date and that patients have access to their prescriptions per regional regulation.
13. Conduct a quarterly IOL implant tracking audit; this audit validates that all implanted intraocular lenses are tracked completely and accurately.

---

## 17. Related Documents

### 17.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C12 Ophthalmology; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 26 governs integration philosophy |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.4 covers surgical specialty single-specialty facilities including ophthalmology; Section 6 documents module recommendations |

### 17.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 12 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 12.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Dermatology | `docs/06_CLINIC_TYPES/DERMATOLOGY.md` | Related specialty with shared image management patterns |
| ENT | `docs/06_CLINIC_TYPES/ENT.md` | Related surgical specialty |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Changes — including overlay revisions, registry set updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
