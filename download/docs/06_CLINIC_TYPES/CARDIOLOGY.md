# Ibn Hayan Healthcare Operating System
## Cardiology Clinics

| Field | Value |
|---|---|
| Document Title | Cardiology Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the cardiology overlay is amended or when regional cardiovascular risk assessment guidance changes |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for cardiology facilities |
| Scope | Specialty overview, target facilities, recommended modules, ECG management, echocardiogram records, cardiac catheterization records, cardiovascular risk assessment, specialty workflows, conceptual data models, forms and templates, reports and analytics, third-party integrations, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for cardiology (clinic type C06) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, catheterization laboratory equipment-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the cardiology clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. ECG Management
5. Echocardiogram Records
6. Cardiac Catheterization Records
7. Cardiovascular Risk Assessment
8. Specialty Workflows
9. Specialty Data Models
10. Forms & Templates
11. Reports & Analytics
12. Third-Party Integrations
13. Role & Permission Recommendations
14. Configuration Defaults
15. Onboarding Checklist
16. Sample Use Cases
17. Best Practices
18. Related Documents

---

## 1. Specialty Overview

### 1.1 Definition and Scope of Practice

Cardiology is the medical specialty concerned with the diagnosis, management, and non-surgical treatment of diseases of the heart and vascular system. The cardiologist evaluates and manages conditions including coronary artery disease, heart failure, arrhythmias, valvular heart disease, congenital heart disease (in adult patients), hypertension, and peripheral vascular disease. Scope of practice includes non-invasive diagnostic testing (ECG, echocardiogram, stress testing, Holter monitoring), invasive diagnostic procedures (cardiac catheterization, electrophysiology studies), interventional procedures (coronary angioplasty, valve interventions), and longitudinal medical management of chronic cardiovascular conditions. Ibn Hayan treats cardiology as clinic type C06 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated High (reflecting implant tracking, procedural documentation, and integration complexity) and recommended editions Professional (E2) and Enterprise (E3).

### 1.2 Patient Population and Clinical Activities

The cardiology patient population skews toward middle-aged and older adults with established or suspected cardiovascular disease, though the specialty also sees younger adults with congenital heart disease, inherited cardiac conditions, and early-onset coronary disease. Clinical activities span outpatient consultation, inpatient consultation, procedural performance (diagnostic and interventional catheterization, device implantation), and longitudinal follow-up of patients with chronic cardiovascular conditions. The cardiologist typically receives referrals from primary care and from other specialists, performs diagnostic evaluation, initiates and titrates complex medical therapy, performs procedures where indicated, and coordinates long-term management with the referring physician. Cardiovascular care is data-intensive: a typical patient generates ECGs, echocardiograms, stress tests, Holter monitors, laboratory results, and (where applicable) device interrogation data, all of which must be integrated into the longitudinal record and accessible at the point of care.

### 1.3 Why Cardiology Needs Specialized Configuration

Cardiology requires specialized configuration across multiple dimensions: structured documentation of diagnostic test findings (ECG interpretation, echocardiogram measurements, catheterization findings), tracking of cardiovascular risk factors and risk scores (ASCVD, Framingham, CHADS-VASc), management of cardiovascular medications with attention to anticoagulation and drug interactions, tracking of implanted cardiac devices (pacemakers, ICDs, loop recorders) across their lifecycle, and integration with external diagnostic equipment (ECG machines, echocardiogram systems, Holter monitors, cardiac device programmers). Ibn Hayan's cardiology overlay addresses these requirements through specialty-specific documentation templates, registry views, and integration surfaces, with configuration defaults reflecting typical cardiology practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.3 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Hospital and Multidisciplinary Care

Cardiology frequently operates as a hospital outpatient department with admitting privileges for inpatient cardiology and interventional procedures; the cardiologist often serves as the primary treating physician for acute coronary syndrome admissions and as a consultant for cardiology complications of other admissions. Cardiology also coordinates closely with cardiac surgery (for patients requiring coronary artery bypass, valve replacement, or other surgical interventions), with endocrinology (for diabetic patients with cardiovascular disease), and with nephrology (for patients with combined cardiovascular and renal disease). Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports these compositions, with shared services such as the catheterization laboratory, the echocardiogram laboratory, and the cardiac device clinic operating as facility-level shared services across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Cardiology operates across the mid-sized to large facility spectrum, from small group practices with two to five cardiologists through hospital cardiology departments with twenty or more cardiologists plus fellows, nurses, technicians, and device clinic staff. The most common configurations are mid-sized group practices (six to twelve cardiologists with embedded non-invasive testing), large group practices (with full non-invasive and invasive capability), and hospital cardiology departments (operating as a service line with catheterization laboratory and device clinic). Ibn Hayan's Professional edition (E2) is the typical fit for mid-sized group practices per `PRODUCT_BIBLE.md` Section 16.5; Enterprise edition (E3) is required for hospital cardiology departments with catheterization laboratory operations, inpatient admitting privileges, and integration with hospital systems.

### 2.2 Ownership Patterns and Geographic Considerations

Cardiology facilities operate under private practice ownership, physician-group ownership, hospital-employment models, and academic medical centre ownership. Geographic considerations for cardiology emphasize hospital connectivity; cardiologists typically hold admitting privileges at one or more hospitals and require integration with hospital systems including the catheterization laboratory information system and the hospital pacemaker clinic. Rural cardiology practice frequently operates as an outreach model with the cardiologist traveling between satellite clinics and a central hospital; this requires strong offline-first behaviour for satellite clinic operations and reliable synchronization back to the central record. Ibn Hayan's offline-first posture, documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 (P11), supports satellite clinic operations directly.

### 2.3 Regulatory Environment

Cardiology operates within a regulatory environment that includes procedural documentation requirements (for catheterization and device implantation), controlled substance prescribing oversight (for opioid use during procedures and for symptom management in advanced heart failure), device tracking requirements (for implantable cardiac devices under regional medical device regulations), and quality reporting programs (such as cardiovascular registry reporting to regional or national cardiovascular registries). Ibn Hayan's Audit module (M16) records every procedural documentation event, every device tracking event, and every controlled substance prescribing event; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including cardiovascular registry reporting formats.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for cardiology reflects the specialty's emphasis on diagnostic test documentation, procedural documentation, longitudinal chronic disease management, and integration with diagnostic equipment. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record with cardiovascular history |
| Encounter | M02 | Required | Encounter management across outpatient, inpatient, procedural, and device clinic visits |
| Clinical Documentation | M03 | Required | Specialty-specific documentation templates for consultation, procedure, device clinic |
| Orders & Results | M04 | Required | Laboratory, imaging, ECG, echocardiogram, stress test orders; result interpretation |
| Pharmacy | M05 | Required | Cardiovascular medication management, anticoagulation management |
| Scheduling | M06 | Required | Outpatient scheduling, procedure scheduling, device clinic scheduling |
| Documents | M07 | Required | Consult letters, procedural reports, device implantation certificates |
| Notifications | M08 | Required | Critical result alerts, device recall notifications, follow-up reminders |
| Billing | M09 | Required | Encounter billing, procedural billing, device clinic billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Chronic disease outreach, device clinic recall |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For catheterization laboratory staffing and call scheduling |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for procedural and device events |
| Integration | M17 | Required | Integration with ECG machines, echocardiogram systems, Holter monitors, device programmers, hospital systems |
| Reporting | M18 | Required | Cardiovascular registries, quality measures, procedural outcomes |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems, cardiovascular risk score formulas |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Small group practice (T2) | E2 | M01–M09, M14–M19 | M10, M11, M12 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13 |
| Large group practice with cath lab (T4) | E2 or E3 | M01–M19 (all) | None typical |
| Hospital cardiology department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. ECG Management

### 4.1 Capability Overview

The electrocardiogram (ECG) is the most frequently performed diagnostic test in cardiology, providing a recording of the heart's electrical activity that supports diagnosis of arrhythmias, conduction abnormalities, ischemia, and structural heart disease. The typical cardiology practice acquires ECGs at high volume — often dozens per day — and each ECG must be recorded, interpreted, stored, and integrated into the patient's longitudinal record. Ibn Hayan's ECG management capability, implemented through the Orders & Results module (M04) with integration through the Integration module (M17) and documentation through the Clinical Documentation module (M03), supports ECG acquisition workflow, structured interpretation documentation, longitudinal ECG comparison, and integration with ECG machines through standard formats including DICOM Waveform and HL7 attachments.

### 4.2 Acquisition and Integration

ECG acquisition is performed by a technician using an ECG machine; the ECG is transmitted to Ibn Hayan through the Integration module (M17), using standard formats such as DICOM Waveform or HL7 ORU messages with PDF attachments. The integration is configured per ECG machine vendor and model; the configuration maps the machine's data fields to Ibn Hayan's ECG data model. The ECG is received, validated, and stored in the patient's record; the technician who acquired the ECG is recorded, as is the acquisition location and equipment identifier. The acquisition workflow is auditable end-to-end, supporting equipment quality monitoring and regulatory compliance.

### 4.3 Interpretation and Documentation

ECG interpretation is performed by the cardiologist (or by an automated interpretation algorithm with cardiologist confirmation). The interpretation is documented using a structured template that captures rhythm, rate, intervals (PR, QRS, QT), axis, morphology findings (P wave, QRS complex, ST segment, T wave), and the overall interpretation. The structured interpretation supports longitudinal comparison with prior ECGs; the cardiologist may compare the current ECG with the prior ECG to identify changes indicative of ischemia, arrhythmia progression, or other clinical evolution. The structured interpretation also supports registry integration; specific ECG findings (such as atrial fibrillation) trigger registry membership for the relevant cardiovascular registry.

### 4.4 Longitudinal ECG Comparison

Longitudinal ECG comparison presents the current ECG alongside prior ECGs for the same patient, with the structured interpretation of each ECG displayed side by side. The comparison view is particularly valuable for patients with established cardiovascular disease, where subtle changes in ECG morphology may indicate disease progression or intervention response. The comparison view supports side-by-side waveform display, structured interpretation comparison, and change documentation; the cardiologist may document the comparison as part of the encounter documentation. Longitudinal ECG comparison is a defining capability of cardiology and is configured as part of the cardiology overlay.

---

## 5. Echocardiogram Records

### 5.1 Capability Overview

Echocardiography is the primary non-invasive imaging modality for cardiac structure and function, providing detailed assessment of cardiac chambers, valves, pericardium, and great vessels. The typical cardiology practice performs or interprets echocardiograms at high volume, with each study generating a set of measurements (chamber dimensions, wall thickness, ejection fraction, valve velocities) and a set of images (two-dimensional, M-mode, Doppler, color flow). Ibn Hayan's echocardiogram records capability, implemented through the Orders & Results module (M04) with integration through the Integration module (M17) and documentation through the Clinical Documentation module (M03), supports study acquisition workflow, structured measurement documentation, image storage and retrieval, longitudinal comparison, and integration with echocardiogram systems through standard formats including DICOM and HL7 attachments.

### 5.2 Study Documentation

Echocardiogram study documentation is structured according to the standard echocardiogram report format, with sections for study indication, study type (transthoracic, transesophageal, stress), measurements (chamber dimensions, wall thickness, LV systolic function including ejection fraction, diastolic function assessment, valve assessment, pericardial assessment), findings, and overall interpretation. The structured measurements support longitudinal comparison and registry integration; specific measurements (such as reduced ejection fraction or severe valvular regurgitation) trigger registry membership for the relevant cardiovascular registry. The documentation template is configurable per study type and per regional reporting standard.

### 5.3 Image Storage and Retrieval

Echocardiogram images are stored through integration with the echocardiogram system or with a Picture Archiving and Communication System (PACS), with image references (not the images themselves) stored in Ibn Hayan through the Integration module (M17). The image reference allows the cardiologist to access the images from within Ibn Hayan's encounter documentation surface, with the image displayed in the echocardiogram system's viewer. Image storage and retrieval comply with regional medical image retention requirements; image lifecycle management (including deletion at end of retention period) is configured through the Integration module (M17) and is auditable.

### 5.4 Longitudinal Comparison

Longitudinal echocardiogram comparison presents the current study's measurements alongside prior studies' measurements for the same patient, with the structured measurements displayed in tabular form for direct comparison. The comparison view is particularly valuable for patients with valvular heart disease (where progression of stenosis or regurgitation guides intervention timing), for patients with heart failure (where ejection fraction trajectory guides therapy), and for patients undergoing chemotherapy (where surveillance echocardiography detects early cardiotoxicity). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

---

## 6. Cardiac Catheterization Records

### 6.1 Capability Overview

Cardiac catheterization is the invasive diagnostic and interventional procedure that provides direct assessment of cardiac anatomy, hemodynamics, and coronary artery disease, and that supports interventional treatment including coronary angioplasty, stent placement, and valve interventions. Catheterization procedures generate procedural documentation, hemodynamic data, angiographic images, and implant records (for stents and other devices placed during the procedure). Ibn Hayan's catheterization records capability, implemented through the Clinical Documentation module (M03) with integration through the Integration module (M17), supports procedural documentation, hemodynamic data capture, image reference storage, implant tracking, and procedural outcome reporting.

### 6.2 Procedural Documentation

Procedural documentation is structured according to the standard catheterization report format, with sections for pre-procedural assessment (indication, consent, pre-procedural medications), procedural details (access site, catheters used, vessels interrogated, hemodynamic measurements), findings (coronary anatomy, lesions, interventions performed), implants (stents, balloons, other devices), and post-procedural assessment (closure method, immediate complications, disposition). The documentation template is configurable per procedure type (diagnostic coronary angiogram, percutaneous coronary intervention, right heart catheterization, structural heart intervention) and per regional reporting standard.

### 6.3 Hemodynamic Data Capture

Hemodynamic data — including pressures, oxygen saturations, cardiac output, and vascular resistance — is captured through integration with the catheterization laboratory's hemodynamic monitoring system, using standard formats including DICOM Waveform and HL7 ORU messages. The data is received, validated, and stored in the patient's record; the structured hemodynamic data supports longitudinal comparison (for patients undergoing serial catheterization) and registry reporting (for quality measures that require hemodynamic data). Hemodynamic data capture is auditable end-to-end, supporting regulatory compliance for procedural quality reporting.

### 6.4 Implant Tracking

Implants placed during catheterization — including coronary stents, peripheral stents, and structural heart devices — are tracked through the catheterization record with full device tracking information (manufacturer, model, serial number, lot number, implant date, implanting physician, implant location). The implant tracking supports regional medical device regulations (which require tracking of implantable devices for adverse event monitoring and recall response) and supports clinical follow-up (including surveillance for in-stent restenosis and dual antiplatelet therapy duration tracking). Implant tracking is recorded in the audit trail; recall notifications received through the Integration module (M17) are matched against implanted devices and trigger patient recall workflows through the Notifications module (M08).

### 6.5 Image Reference and Reporting

Angiographic images are stored through integration with the catheterization laboratory's imaging system or with PACS, with image references stored in Ibn Hayan through the Integration module (M17). The image reference allows the cardiologist to access the images from within Ibn Hayan's procedural documentation surface. Procedural reports are generated through the Documents module (M07) using the structured documentation; reports are delivered to the referring physician through the Integration module (M17) and (where applicable) to the regional cardiovascular registry.

---

## 7. Cardiovascular Risk Assessment

### 7.1 Capability Overview

Cardiovascular risk assessment is the systematic estimation of a patient's risk of future cardiovascular events, used to guide preventive therapy decisions including statin therapy, antihypertensive therapy, and aspirin therapy. The cardiologist uses multiple risk assessment tools depending on the patient population and the regional clinical practice guidelines, including the ASCVD Risk Estimator (for primary prevention atherosclerotic cardiovascular disease risk), the Framingham Risk Score (for coronary heart disease risk), the CHA2DS2-VASc score (for stroke risk in atrial fibrillation), the HAS-BLED score (for bleeding risk on anticoagulation), and the TIMI and GRACE scores (for risk stratification in acute coronary syndrome). Ibn Hayan's cardiovascular risk assessment capability, implemented through the Clinical Documentation module (M03) with calculation through the Localization module (M19), supports automated risk score calculation, longitudinal risk tracking, and risk-guided therapy recommendations.

### 7.2 Risk Score Calculation

Risk score calculation is performed automatically based on the patient's recorded risk factors, laboratory results, and clinical conditions; the calculation uses the formula defined by the issuing authority and is updated through the Localization module (M19) when formulas are revised. The calculation is presented to the cardiologist for review and confirmation; the cardiologist may adjust the input values (for example, to reflect a family history not yet documented in the record) before finalizing the calculation. The calculation is recorded in the patient's record with the input values, the calculation formula version, and the result; the audit trail supports clinical governance review and quality reporting.

### 7.3 Longitudinal Risk Tracking

Risk scores are tracked longitudinally, with each calculation displayed alongside prior calculations for the same patient. The longitudinal view supports assessment of risk trajectory over time, particularly in response to therapeutic interventions (such as statin therapy for elevated ASCVD risk or anticoagulation for elevated CHA2DS2-VASc score). The longitudinal view is integrated with the chronic disease registry for the relevant cardiovascular condition; risk scores above the threshold for therapeutic intervention trigger registry membership and care plan updates. The longitudinal view also supports communication with the patient, providing a visual representation of risk trajectory that supports shared decision-making about preventive therapy.

### 7.4 Risk-Guided Therapy Recommendations

The risk assessment capability integrates with the medication management capability to surface risk-guided therapy recommendations. For a patient with elevated ASCVD risk, the capability presents the recommendation for statin therapy alongside the patient's current medication list; for a patient with elevated CHA2DS2-VASc score, the capability presents the recommendation for anticoagulation alongside the patient's bleeding risk assessment (HAS-BLED score). The recommendations are evidence-based and reflect the regional clinical practice guideline applied to the tenant through the Localization module (M19); the recommendations are presented as decision support, not as automated orders, and the cardiologist retains full authority over the therapeutic decision.

---

## 8. Specialty Workflows

### 8.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Outpatient consultation | Scheduled appointment | Vitals, focused cardiovascular H&P, risk assessment, orders, assessment-and-plan | Nurse, Physician | M02, M03, M04 |
| ECG acquisition and interpretation | Order or walk-in | Acquire ECG, transmit, interpret, document, file | Technician, Physician | M04, M17 |
| Echocardiogram study | Scheduled study | Acquire images, transmit, interpret, document, file | Technician, Physician | M04, M17 |
| Stress test | Scheduled test | Pre-test assessment, acquire, monitor, interpret, document, file | Technician, Physician | M02, M03, M04 |
| Holter monitor | Scheduled or ordered | Apply monitor, patient wears, return, analyze, interpret, document, file | Technician, Physician | M04, M17 |
| Cardiac catheterization | Scheduled procedure | Pre-procedure consent, procedure, hemodynamic capture, implant tracking, post-procedure documentation | Physician, Nurse, Technician | M02, M03, M04, M17 |
| Device interrogation | Scheduled device clinic visit | Interrogate device, transmit, review, document, schedule next | Technician, Physician | M04, M17 |
| Device recall response | Recall notification received | Match recall to implanted devices, identify affected patients, generate recall notifications, schedule follow-up | Administrator, Physician | M08, M17, M18 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The cardiology data model extends the platform's standard patient-encounter-centric model with entities for ECG records, echocardiogram records, catheterization records, cardiovascular risk scores, implanted cardiac devices, and cardiovascular registry membership. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| ECG record | Documentation of an electrocardiogram acquisition and interpretation | Patient, encounter, acquisition date, acquiring technician, equipment, rhythm, rate, intervals, axis, morphology findings, interpretation |
| Echocardiogram record | Documentation of an echocardiogram study | Patient, encounter, study date, study type, measurements, findings, interpretation, image references |
| Catheterization record | Documentation of a cardiac catheterization procedure | Patient, encounter, procedure date, procedure type, access site, hemodynamic data, findings, interventions, implants |
| Implanted cardiac device | Longitudinal record of an implanted cardiac device | Patient, device type (pacemaker, ICD, loop recorder, stent), manufacturer, model, serial number, implant date, implanting physician, implant location, current status |
| Cardiovascular risk score | Documentation of a cardiovascular risk score calculation | Patient, encounter, score type, input values, formula version, result, calculation date |
| Cardiovascular registry entry | Cohort membership for a cardiovascular registry | Patient, registry type, enrolment date, monitoring indicators, treatment targets, review cadence |
| Anticoagulation record | Longitudinal record of anticoagulation management | Patient, anticoagulant, INR target range (where applicable), dosing history, monitoring results |

### 9.3 Entity Relationships

The ECG record references the patient and the encounter; longitudinal ECG comparison is supported through the patient reference. The echocardiogram record references the patient and the encounter and includes image references to external storage. The catheterization record references the patient and the encounter and includes implant records for devices placed during the procedure. The implanted cardiac device entity references the patient and the implanting encounter; the device entity persists independently as a longitudinal record and is updated by subsequent device clinic encounters. The cardiovascular risk score references the patient and the encounter; longitudinal risk tracking is supported through the patient reference. The cardiovascular registry entry references the patient and the relevant chronic condition; the registry integrates with the care plan entity for goal tracking.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Outpatient cardiology consultation | Outpatient | Comprehensive cardiovascular consultation with history, examination, risk assessment, and assessment-and-plan |
| Follow-up visit | Outpatient | Focused follow-up for established cardiovascular condition |
| Device clinic visit | Outpatient | Pacemaker or ICD interrogation and management |
| Heart failure management visit | Outpatient | Structured heart failure assessment with NYHA class, volume status, medication review |
| Pre-procedure assessment | Outpatient | Pre-procedure assessment for scheduled catheterization or device implantation |
| Post-procedure follow-up | Outpatient | Post-procedure assessment after catheterization or device implantation |
| Inpatient consultation | Inpatient | Inpatient cardiology consultation |

### 10.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| Catheterization report | Procedural report | M07 Documents |
| Echocardiogram report | Study report | M07 Documents |
| ECG report | Study report | M07 Documents |
| Device implantation certificate | Patient-facing device implantation certificate | M07 Documents |
| Anticoagulation management plan | Patient-facing anticoagulation plan | M07 Documents |
| Cardiac rehabilitation referral | Outbound referral to cardiac rehabilitation | M04 Orders & Results |

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Cardiovascular registry dashboard | Cohort status across heart failure, atrial fibrillation, coronary disease, hypertension | On demand |
| Ejection fraction trajectory report | LV ejection fraction trajectory for heart failure patients | Quarterly |
| Anticoagulation time-in-therapeutic-range report | TTR for warfarin patients | Quarterly |
| Device interrogation completion report | Fraction of patients with up-to-date device interrogation | Quarterly |
| Procedural outcomes report | Procedural success, complications, mortality for catheterization | Quarterly |
| Risk score trajectory report | ASCVD risk trajectory for primary prevention patients | Annually |

### 11.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| Procedural volume report | Procedures per cardiologist, by type | Monthly |
| Study turnaround report | Time from study acquisition to interpretation | Weekly |
| No-show rate report | Missed appointments by clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |

### 11.3 Regulatory Reports

Regulatory reports include cardiovascular registry reporting to regional or national cardiovascular registries (such as the National Cardiovascular Data Registry in the United States or equivalent registries in other regions), device tracking reporting to medical device regulatory authorities, and procedural quality reporting to regional health authorities. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 12. Third-Party Integrations

### 12.1 Integration Categories

| Integration Category | Direction | Purpose | Standards Preference |
|---|---|---|---|
| ECG machines | Inbound | Receive ECG acquisitions from ECG machines | DICOM Waveform, HL7 ORU |
| Echocardiogram systems | Inbound | Receive echocardiogram studies and measurements | DICOM, HL7 ORU |
| Holter monitor analysis systems | Inbound | Receive Holter analysis results | HL7 ORU, vendor-specific formats |
| Stress test systems | Inbound | Receive stress test data and ECG tracings | DICOM Waveform, HL7 ORU |
| Cardiac device programmers | Inbound | Receive device interrogation reports | Vendor-specific formats, HL7 ORU |
| Catheterization laboratory systems | Inbound | Receive hemodynamic data and procedural records | DICOM, HL7 ORU |
| PACS | Bidirectional | Image storage and retrieval | DICOM |
| Hospital information systems | Bidirectional | Inpatient-outpatient coordination, admission-discharge-transfer | HL7 v2, FHIR |
| Cardiovascular registries | Outbound | Submit procedural and outcome data to regional registries | Registry-specific formats |
| Medical device regulatory authorities | Outbound | Submit device tracking and adverse event reports | Regional regulatory formats |
| Referring physicians | Outbound | Transmit consult letters and procedural reports | HL7 v2, FHIR, secure messaging |

### 12.2 Integration Governance

Integrations are versioned, validated, and audited. Integration contracts follow the platform's deprecation policy stated in `SYSTEM_ARCHITECTURE.md` Section 13.6; breaking changes to integration contracts are supported through a transition window. Customers enabling integrations must confirm that the integration's data flow complies with their region's privacy regulations; the Audit module (M16) records every integration event, providing end-to-end accountability for integrated data flows. Integration with vendor-specific formats (such as cardiac device programmer outputs) is documented with a transition path to open standards where the vendor's proprietary format is the only available option, in keeping with Principle P12 (Open Standards Over Proprietary).

---

## 13. Role & Permission Recommendations

### 13.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Cardiology |
|---|---|---|
| Physician (Cardiologist) | R01 | Clinical assessment, diagnosis, treatment, orders, documentation, procedural performance |
| Nurse | R02 | Nursing assessment, vital signs, procedure assistance, anticoagulation management, patient education |
| Cardiac technician | R04 | ECG acquisition, echocardiogram performance, stress test administration, Holter application, device interrogation |
| Pharmacist | R03 | Anticoagulation management, cardiovascular medication review (where embedded) |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Outpatient scheduling, procedure scheduling, device clinic scheduling |
| Biller | R08 | Encounter billing, procedural billing, claim submission |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 13.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, and by patient cohort per `PRODUCT_BIBLE.md` Section 21.4. Cardiology facilities typically scope physician access to the facility level for outpatient encounters and to the patient cohort level for inpatient encounters (allowing the cardiologist to see only their own inpatients). Cardiac technician access is scoped to the studies they perform; the technician has access to the study record but not to the full patient record. Procedural documentation access is scoped to the procedural team; access to catheterization records is restricted to the procedural team and to cardiologists with a documented care relationship to the patient. Anticoagulation management access is scoped to the anticoagulation management team.

### 13.3 Custom Role Recommendations

Common custom roles for cardiology include the Echo Technician role (composed of technician permissions scoped to echocardiogram study performance), the Device Clinic Nurse role (composed of nurse permissions scoped to device clinic encounters and device interrogation), the Anticoagulation Manager role (composed of nurse and pharmacist permissions scoped to anticoagulation management), and the Cath Lab Coordinator role (composed of scheduler and administrator permissions scoped to catheterization laboratory scheduling). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 14. Configuration Defaults

### 14.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Outpatient consultation slot duration | 30 minutes | Customer-adjustable |
| Follow-up visit slot duration | 20 minutes | Customer-adjustable |
| Device clinic visit slot duration | 30 minutes | Customer-adjustable |
| Heart failure management visit slot duration | 30 minutes | Customer-adjustable |
| Pre-procedure assessment slot duration | 30 minutes | Customer-adjustable |
| ECG acquisition slot duration | 10 minutes | Customer-adjustable |
| Echocardiogram study slot duration | 45 minutes | Customer-adjustable |
| Stress test slot duration | 60 minutes | Customer-adjustable |
| Catheterization procedure slot duration | Variable by procedure type | Customer-configurable per procedure type |

### 14.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Outpatient cardiology consultation | Customer-adjustable per encounter type |
| Default cardiovascular registry set | Heart failure, atrial fibrillation, coronary disease, hypertension, valvular disease | Customer-adjustable |
| Risk score calculation formulas | ASCVD, Framingham, CHA2DS2-VASc, HAS-BLED, TIMI, GRACE | Configured through Localization module (M19) |
| Anticoagulation monitoring cadence | Per regional framework (e.g., every 4 weeks for warfarin) | Customer-adjustable |

### 14.3 Procedural Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Procedural consent capture | Required before procedure start | Non-overridable |
| Implant tracking fields | Manufacturer, model, serial number, lot number, implant date, implanting physician, implant location | Non-overridable per regional medical device regulations |
| Procedural report turnaround | 24 hours | Customer-adjustable |

---

## 15. Onboarding Checklist

### 15.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that cardiology (C06) is the primary clinic type for the facility.
2. Activate the cardiology overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2; for hospital cardiology departments, enable all modules per the Enterprise edition.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, cardiovascular risk score formulas, and cardiovascular registry reporting formats.
5. Configure ECG management: Configure integration with ECG machines; verify DICOM Waveform or HL7 ORU data flow; validate structured interpretation template.
6. Configure echocardiogram records: Configure integration with echocardiogram systems; verify DICOM data flow; validate structured measurement template and image reference storage.
7. Configure catheterization records: Configure integration with catheterization laboratory systems; verify hemodynamic data capture; validate implant tracking configuration; verify procedural documentation template.
8. Configure cardiovascular risk assessment: Verify risk score formulas are loaded; configure risk-guided therapy recommendations per regional clinical practice guidelines.
9. Configure cardiovascular registries: Enable the default registry set; refine cohort criteria, monitoring indicators, and treatment targets.
10. Configure device clinic management: Configure integration with cardiac device programmers; verify device interrogation data flow; configure device recall response workflow.
11. Configure encounter templates: Review the default encounter templates listed in Section 10.1; refine templates to match the facility's documentation standards.
12. Configure role set and permissions: Provision the roles listed in Section 13.1; configure permission scope by facility, care team, patient cohort, and procedural team.
13. Configure integrations: Configure hospital integration, PACS integration, cardiovascular registry reporting, and (where applicable) medical device regulatory reporting; validate integration data flow in the configuration sandbox.
14. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians.
15. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 16. Sample Use Cases

### 16.1 Use Case — Outpatient Consultation for Chest Pain

A 55-year-old patient is referred by their primary care physician for evaluation of exertional chest pain. The cardiologist conducts an outpatient consultation using the outpatient cardiology consultation template; the ASCVD risk score is calculated automatically based on the patient's recorded risk factors and is presented as elevated risk. An ECG is ordered and acquired through the ECG management capability; the cardiologist interprets the ECG and documents the structured interpretation, comparing it to the patient's prior ECGs. An echocardiogram is ordered and scheduled; a stress test is ordered and scheduled. The encounter is documented; the care plan is initiated with diagnostic workup as the primary goal and preventive therapy recommendations based on the ASCVD risk score; a follow-up visit is scheduled for result review.

### 16.2 Use Case — Echocardiogram for Heart Failure Assessment

A 70-year-old patient with newly diagnosed heart failure is referred for echocardiogram assessment. The echocardiogram is acquired by a cardiac technician using the echocardiogram system; the study is transmitted to Ibn Hayan through the Integration module (M17). The cardiologist interprets the study, documenting the structured measurements including left ventricular ejection fraction, chamber dimensions, and valvular assessment; the ejection fraction of 35% triggers registry membership for the heart failure registry. The interpretation is documented in the patient's record; the longitudinal comparison view is updated with the new study. The cardiologist's assessment-and-plan is added to the encounter record, including initiation of guideline-directed medical therapy for heart failure with reduced ejection fraction.

### 16.3 Use Case — Cardiac Catheterization with Stent Implantation

A 62-year-old patient with stable angina and a positive stress test undergoes elective cardiac catheterization. Pre-procedure consent is documented through the catheterization record; the procedure is performed with access via the right radial artery. Diagnostic angiography identifies a severe stenosis in the left anterior descending artery; the cardiologist performs percutaneous coronary intervention with placement of a drug-eluting stent. The stent's manufacturer, model, serial number, lot number, implant date, and implanting physician are recorded through the implant tracking capability. Hemodynamic data is captured through integration with the catheterization laboratory system; the procedural report is generated through the Documents module (M07) and transmitted to the referring physician. Post-procedure disposition is documented; the patient is enrolled in the coronary disease registry; dual antiplatelet therapy is initiated through the Pharmacy module (M05).

### 16.4 Use Case — Pacemaker Interrogation and Management

A 78-year-old patient with a dual-chamber pacemaker implanted 3 years ago presents for routine device clinic follow-up. The device is interrogated using the manufacturer's programmer; the interrogation report is transmitted to Ibn Hayan through the Integration module (M17). The cardiologist reviews the interrogation, including battery voltage, lead impedance, sensing and capture thresholds, and arrhythmia episodes recorded by the device. The device interrogation is documented in the catheterization record equivalent for devices; the longitudinal comparison view presents the current interrogation alongside prior interrogations, supporting assessment of battery depletion trajectory and lead performance. The patient's pacemaker follow-up schedule is updated; the next interrogation is scheduled at the standard 3-month interval.

### 16.5 Use Case — Device Recall Response

A pacemaker manufacturer issues a recall for a specific pacemaker model due to a battery performance issue. The recall notification is received through the Integration module (M17) or entered manually by the administrator. The Reporting module (M18) queries the implanted cardiac device registry and identifies all patients in the facility with the affected device model. The Notifications module (M08) generates patient-specific recall notifications to the affected patients' care teams; the device clinic schedules follow-up appointments for the affected patients. The recall response is documented per patient; the recall is recorded in the audit trail. The recall response is reported to the regional medical device regulatory authority through the Integration module (M17) where required.

### 16.6 Use Case — Anticoagulation Management for Atrial Fibrillation

A 68-year-old patient with atrial fibrillation is managed with warfarin anticoagulation. The CHA2DS2-VASc score is calculated and documented as elevated stroke risk; the HAS-BLED score is calculated and documented as moderate bleeding risk. The cardiologist and anticoagulation manager (a nurse or pharmacist with anticoagulation management permissions) jointly manage the anticoagulation through the Pharmacy module (M05); INR results are received through the Integration module (M17) and are presented in the anticoagulation record alongside the target range. The anticoagulation manager adjusts the warfarin dose based on the INR result and documents the dose change; the patient is notified of the dose change through the Notifications module (M08). The anticoagulation time-in-therapeutic-range is calculated quarterly and is reported through the Reporting module (M18) for quality monitoring.

---

## 17. Best Practices

### 17.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; cardiovascular risk score formulas and registry reporting formats vary by region and must match the facility's jurisdiction.
2. Validate ECG, echocardiogram, and catheterization integrations carefully before go-live; integration failures can disrupt clinical workflow and can produce incomplete longitudinal records.
3. Configure implant tracking fields to the regional medical device regulatory standard; incomplete implant tracking can compromise recall response and regulatory compliance.
4. Use the configuration sandbox for all changes to risk score formulas, registry cohort criteria, and anticoagulation management rules; these changes have direct patient safety implications.
5. Maintain cardiovascular risk score formulas through the Localization module (M19) rather than through facility-level overrides; formula consistency across facilities within a tenant reduces clinical safety risk.

### 17.2 Operational Best Practices

6. Conduct longitudinal ECG comparison at every encounter where an ECG is acquired; comparison is more clinically valuable than isolated interpretation.
7. Maintain implanted cardiac device records carefully; the device registry is the foundation of recall response and is required for regulatory compliance.
8. Use the cardiovascular registry dashboard as a daily operational tool for heart failure, atrial fibrillation, and coronary disease management; registry accuracy depends on ongoing attention to enrolment and review cadence.
9. Conduct anticoagulation management through a dedicated anticoagulation management role rather than through individual physician management; centralized anticoagulation management improves time-in-therapeutic-range and reduces adverse events.
10. Use the procedural outcomes report quarterly to identify opportunities for procedural quality improvement; procedural quality is a regulatory and clinical priority.

### 17.3 Governance Best Practices

11. Conduct a quarterly procedural outcomes review with the clinical lead; this review validates procedural quality and identifies outliers for review.
12. Conduct an annual implant tracking audit; this audit validates that all implanted devices are tracked completely and accurately.
13. Maintain a documented recall response plan; the plan defines roles, notification cadence, and follow-up intervals for device recalls and should be tested through simulation before an actual recall event.

---

## 18. Related Documents

### 18.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C06 Cardiology; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 26 governs integration philosophy |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.3 covers medical specialty single-specialty facilities including cardiology; Section 6 documents module recommendations |

### 18.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 13 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 13.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Internal Medicine | `docs/06_CLINIC_TYPES/INTERNAL_MEDICINE.md` | Related primary care clinic type with shared chronic disease management |
| Neurology | `docs/06_CLINIC_TYPES/NEUROLOGY.md` | Related medical specialty with shared stroke care coordination |

### 18.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council, with off-cycle review when regional cardiovascular risk assessment guidance or device recall protocols change. Changes — including overlay revisions, registry set updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
