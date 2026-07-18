# Ibn Hayan Healthcare Operating System
## Orthopedics Clinics

| Field | Value |
|---|---|
| Document Title | Orthopedics Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the orthopedics overlay is amended |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for orthopedics facilities |
| Scope | Specialty overview, target facilities, recommended modules, musculoskeletal assessment, range of motion tracking, surgical records, rehabilitation planning, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for orthopedics (clinic type C13) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, arthroplasty implant-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the orthopedics clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Musculoskeletal Assessment
5. Range of Motion Tracking
6. Surgical Records
7. Rehabilitation Planning
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

Orthopedics is the surgical and medical specialty concerned with the diagnosis, management, and treatment of conditions of the musculoskeletal system, including bones, joints, ligaments, tendons, muscles, and nerves. The orthopedic surgeon evaluates and manages conditions including fractures, joint disorders (osteoarthritis, rheumatoid arthritis), sports injuries, spine disorders, congenital and developmental musculoskeletal conditions, musculoskeletal tumors, and degenerative conditions. Scope of practice includes outpatient consultation, comprehensive musculoskeletal examination, fracture management (casting, splinting, internal fixation), joint injection and aspiration, arthroscopic surgery, joint arthroplasty (hip, knee, shoulder), spine surgery, hand surgery, foot and ankle surgery, and longitudinal management of chronic musculoskeletal conditions. Ibn Hayan treats orthopedics as clinic type C13 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated High (reflecting surgical documentation, implant tracking, and rehabilitation coordination) and recommended editions Professional (E2) and Enterprise (E3).

### 1.2 Patient Population and Clinical Activities

The orthopedics patient population spans the full age spectrum, from infants with congenital hip dysplasia through elderly patients with osteoporotic fractures and degenerative joint disease, with peak utilization in middle-aged and older adults (sports injuries in younger adults, osteoarthritis and fractures in older adults). Clinical activities include comprehensive musculoskeletal consultation, structured joint and spine examination with range of motion measurement, fracture management (including reduction, immobilization, and surgical fixation), arthroscopic surgery of joints (knee, shoulder, hip, ankle), joint arthroplasty (including pre-operative planning with templating and implant selection), spine surgery, and longitudinal management of chronic musculoskeletal conditions (including osteoarthritis, osteoporosis, and inflammatory arthritis). The orthopedics encounter is image-intensive: radiographs, magnetic resonance imaging, computed tomography, and ultrasound are routinely reviewed, and fracture documentation with image marking (marking the fracture location and displacement on the radiograph) supports longitudinal tracking of fracture healing.

### 1.3 Why Orthopedics Needs Specialized Configuration

Orthopedics requires specialized configuration across multiple dimensions: structured documentation of the musculoskeletal examination (with joint-specific examination templates, range of motion measurement, and special tests), tracking of range of motion over time (supporting assessment of treatment response and progression), documentation of fractures with image marking (supporting longitudinal tracking of healing), procedural documentation for orthopedic surgery (including arthroscopy, arthroplasty, spine surgery, and fracture fixation), tracking of orthopedic implants (including joint prostheses, screws, plates, and rods) across their lifecycle, coordination of rehabilitation with physical therapy, and DVT prophylaxis management (orthopedic surgery patients are at elevated risk of venous thromboembolism). Ibn Hayan's orthopedics overlay addresses these requirements through specialty-specific documentation templates, image management capabilities, device tracking workflows, and rehabilitation coordination, with configuration defaults reflecting typical orthopedics practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.4 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Multidisciplinary Care

Orthopedics coordinates closely with rheumatology (for inflammatory arthritis management), with radiology (for musculoskeletal imaging interpretation), with physical therapy and occupational therapy (for rehabilitation), with pain medicine (for chronic musculoskeletal pain management), with neurosurgery (for spine conditions), with oncology (for musculoskeletal tumors), with pediatrics (for pediatric orthopedic conditions), with emergency medicine (for acute fracture management), and with plastic and reconstructive surgery (for complex soft tissue reconstruction). Orthopedics also frequently operates within dedicated ambulatory surgery centers, where orthopedic surgeons perform outpatient orthopedic surgery. Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports these compositions, with shared services such as the cast room, the operating room, and the physical therapy suite operating as facility-level shared services across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Orthopedics operates across the mid-sized to large facility spectrum, from small group practices with two to five orthopedic surgeons through hospital orthopedics departments with twenty or more surgeons plus advanced practice providers, physical therapists, and trainees. The most common configurations are mid-sized group practices (six to twelve orthopedic surgeons with embedded cast room and ambulatory surgery), large group practices (with full outpatient, surgical, and rehabilitation capability), and hospital orthopedics departments (operating as a service line with operating room access and inpatient consultation). Ibn Hayan's Professional edition (E2) is the typical fit for mid-sized group practices per `PRODUCT_BIBLE.md` Section 16.5; Enterprise edition (E3) is required for hospital orthopedics departments with inpatient admitting privileges, trauma call, and integration with hospital systems including the trauma alert system.

### 2.2 Ownership Patterns and Geographic Considerations

Orthopedics facilities operate under private practice ownership, physician-group ownership, hospital-employment models, ambulatory surgery center joint ventures, and academic medical centre ownership. Ambulatory surgery centers are commonly jointly owned by orthopedic surgeons and facilities; this ownership pattern creates a need for integration between the orthopedic practice and the ambulatory surgery center's operative record system. Geographic considerations emphasize hospital connectivity for trauma call and inpatient orthopedic surgery; orthopedic surgeons who provide trauma call typically hold call at one or more hospitals and require integration with hospital systems including the trauma alert system and the hospital operating room scheduling system. Rural orthopedics practice frequently operates as an outreach model with the surgeon traveling between satellite clinics and a central surgical facility. Ibn Hayan's Integration module (M17) supports hospital and ambulatory surgery center connectivity through standard integration profiles.

### 2.3 Regulatory Environment

Orthopedics operates within a regulatory environment that includes procedural documentation requirements (for surgical procedures and fracture management), controlled substance prescribing oversight (for post-operative pain management, which is particularly intensive in orthopedics), device tracking requirements (for joint prostheses, screws, plates, and other implantable orthopedic devices), and quality reporting programs (including orthopedic quality measures for joint arthroplasty and surgical site infection). Orthopedic surgeons who provide trauma call are additionally subject to trauma system regulatory requirements including trauma documentation and trauma registry reporting. Ibn Hayan's Audit module (M16) records every procedural documentation event, every device tracking event, and every controlled substance prescribing event; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including orthopedic device tracking requirements and orthopedic quality reporting.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for orthopedics reflects the specialty's emphasis on musculoskeletal examination documentation, surgical procedural documentation, implant tracking, and rehabilitation coordination. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record with orthopedic history |
| Encounter | M02 | Required | Encounter management across outpatient, procedural, surgical, and rehabilitation visits |
| Clinical Documentation | M03 | Required | Specialty-specific documentation templates for consultation, examination, procedure, and surgical records |
| Orders & Results | M04 | Required | Radiology, MRI, CT, laboratory orders; result interpretation |
| Pharmacy | M05 | Required | Medication management including post-operative pain management and DVT prophylaxis |
| Scheduling | M06 | Required | Outpatient scheduling, surgical scheduling, rehabilitation scheduling |
| Documents | M07 | Required | Consult letters, operative reports, cast and brace documentation, rehabilitation orders |
| Notifications | M08 | Required | Critical result alerts, post-operative follow-up reminders, rehabilitation progress notifications |
| Billing | M09 | Required | Encounter billing, procedural billing, surgical billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Chronic disease outreach |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For operating room staffing, trauma call scheduling, and rehabilitation staffing |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for procedural and device events |
| Integration | M17 | Required | Integration with radiology systems, hospital systems, ambulatory surgery center systems, rehabilitation systems |
| Reporting | M18 | Required | Surgical outcomes, registry reporting, rehabilitation outcomes |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems, device tracking requirements |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Small group practice (T2) | E2 | M01–M09, M14–M19 | M10, M11 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13 |
| Large group practice with ASC (T4) | E2 or E3 | M01–M19 (all) | None typical |
| Hospital orthopedics department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Musculoskeletal Assessment

### 4.1 Capability Overview

The musculoskeletal examination is the foundational clinical activity of orthopedics, providing the structured assessment of bones, joints, muscles, ligaments, and tendons that supports diagnosis, longitudinal monitoring, and treatment response assessment. The examination is anatomically organized, with joint-specific examination templates for each major joint (shoulder, elbow, wrist, hand, hip, knee, ankle, foot) and for the spine (cervical, thoracic, lumbar). Ibn Hayan's musculoskeletal assessment capability, implemented through the Clinical Documentation module (M03), supports structured joint-specific examination documentation, anatomically organized fields, range of motion measurement, special tests documentation, and longitudinal comparison.

### 4.2 Joint-Specific Examination Templates

Joint-specific examination templates provide structured documentation for each major joint, with fields for inspection (deformity, swelling, erythema, atrophy), palpation (tenderness, warmth, effusion, crepitus), range of motion (active and passive, measured in degrees), special tests (joint-specific tests such as the Lachman test for the knee, the Hawkins-Kennedy test for the shoulder, the Phalen test for the wrist), and neurovascular status (motor, sensory, vascular). The structured templates ensure that all components are documented and that findings are recorded consistently across visits. The documentation template is configurable per facility and per regional convention.

### 4.3 Special Tests Documentation

Special tests are joint-specific provocative maneuvers that support diagnosis of specific conditions. Each joint has a defined set of special tests; the documentation template captures the test name, the side tested, the result (positive, negative, equivocal), and (where applicable) the severity or grade. The structured documentation supports longitudinal comparison (with prior test results displayed alongside current results) and supports registry integration (with specific test patterns triggering registry membership for the relevant orthopedic registry). The special tests vocabulary is maintained through the Localization module (M19); the vocabulary is updated as new tests are introduced into clinical practice.

### 4.4 Fracture Documentation with Image Marking

Fracture documentation uses a structured template that captures the fractured bone, the fracture location (anatomic site, such as "distal radius"), the fracture pattern (transverse, oblique, spiral, comminuted, impacted), the fracture displacement (none, displaced, angulated, shortened), the joint involvement (intra-articular, extra-articular), and the soft tissue involvement (open, closed). Fracture documentation is integrated with radiology imaging through the Integration module (M17); the fracture location and displacement may be marked on the radiograph using image marking tools, supporting clear communication of the fracture configuration across the care team. The fracture documentation supports longitudinal tracking of healing through follow-up radiographs and clinical examination.

### 4.5 Longitudinal Comparison

Longitudinal musculoskeletal examination comparison presents the current examination findings alongside prior examination findings for the same joint or anatomic site, with the structured findings displayed in tabular form for direct comparison. The comparison view is particularly valuable for patients with progressive musculoskeletal disease (where the trajectory of findings guides treatment decisions), for patients on disease-modifying therapy (where treatment response is assessed by examination trajectory), and for post-surgical patients (where examination findings guide rehabilitation progression). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

---

## 5. Range of Motion Tracking

### 5.1 Capability Overview

Range of motion (ROM) measurement is the quantitative assessment of joint movement, providing objective data that supports diagnosis, treatment planning, treatment response assessment, and disability assessment. ROM is measured for each joint and for each movement plane (flexion, extension, abduction, adduction, internal rotation, external rotation, and specialized movements such as supination and pronation), with measurements recorded in degrees. Ibn Hayan's range of motion tracking capability, implemented through the Clinical Documentation module (M03), supports structured ROM documentation, bilateral data tracking, longitudinal comparison, integration with goniometer and digital ROM measurement devices, and integration with physical therapy documentation.

### 5.2 Structured Documentation

ROM documentation captures the joint, the movement plane, the measurement type (active, passive), the measurement value (in degrees), and (where applicable) the cause of limitation (pain, swelling, mechanical block, muscle weakness). The structured documentation supports bilateral data tracking (with each joint's measurements stored separately for direct comparison) and supports longitudinal comparison (with prior measurements for the same joint and movement plane displayed alongside current measurements). The documentation template is configurable per facility and per regional convention; the standard orthopedic notation is maintained through the Localization module (M19).

### 5.3 Longitudinal Comparison

Longitudinal ROM comparison presents the current measurements alongside prior measurements for the same joint and movement plane, with the measurements displayed in tabular form and graphically over time. The comparison view is particularly valuable for patients undergoing rehabilitation (where ROM trajectory guides rehabilitation progression), for patients on disease-modifying therapy (where ROM is one of the outcome measures), for post-surgical patients (where ROM recovery is a key outcome measure), and for disability assessment (where ROM limitation supports disability rating). The comparison view supports structured documentation of the comparison, with change documentation integrated into the encounter record.

### 5.4 Integration with Measurement Devices

ROM measurement may be acquired through integration with digital goniometers and other digital ROM measurement devices, with the measurements transmitted to Ibn Hayan through the Integration module (M17) using vendor-specific or standard formats. The integration is configured per equipment vendor and model; the configuration maps the equipment's data fields to Ibn Hayan's ROM data model. Where integration is not available, the measurements are entered manually by the orthopedic surgeon or by the physical therapist; the manual entry is supported by structured fields that enforce the standard notation. Integration with physical therapy documentation supports the coordination of rehabilitation, with ROM measurements from physical therapy sessions integrated into the longitudinal record.

### 5.5 Disability Assessment Support

ROM measurements support disability assessment, with the measurements used in standardized disability rating systems (such as the American Medical Association Guides to the Evaluation of Permanent Impairment). The disability assessment support capability, configured through the Localization module (M19) with the regional disability rating system, generates the disability rating based on the recorded ROM measurements and other examination findings. The disability assessment documentation supports applications for disability benefits and supports legal proceedings where disability rating is at issue. The disability assessment is documented as a distinct clinical activity linked to the encounter, supporting longitudinal tracking of disability trajectory.

---

## 6. Surgical Records

### 6.1 Capability Overview

Orthopedic surgery encompasses a wide range of procedures including fracture fixation (open reduction internal fixation, intramedullary nailing, percutaneous fixation), arthroscopic surgery (knee, shoulder, hip, ankle), joint arthroplasty (hip, knee, shoulder, elbow), spine surgery (discectomy, fusion, laminectomy), hand surgery, foot and ankle surgery, and tumor resection and reconstruction. Each surgical procedure generates detailed procedural documentation including pre-operative assessment, intraoperative findings and procedure details, implants used, and post-operative assessment. Ibn Hayan's surgical records capability, implemented through the Clinical Documentation module (M03) with implant tracking through the Orders & Results module (M04), supports structured procedural documentation, implant tracking, image reference storage, and procedural outcome reporting.

### 6.2 Procedural Documentation

Procedural documentation is structured according to the standard operative report format, with sections for pre-operative assessment (indication, consent, pre-operative imaging, pre-operative templating for arthroplasty), procedural details (anesthesia, position, approach, equipment used, procedure steps, intraoperative findings), implants (manufacturer, model, serial number, lot number, size, location for each implant), and post-operative assessment (closure, dressing, complications, disposition, post-operative instructions). The documentation template is configurable per procedure type (arthroscopy, arthroplasty, spine surgery, fracture fixation) and per regional reporting standard. The procedural documentation is integrated with the patient's longitudinal musculoskeletal record.

### 6.3 Implant Tracking

Orthopedic implants — including joint prostheses (femoral stem, acetabular cup, femoral component, tibial component, patellar component, humeral component, glenoid component), screws, plates, rods, and bone graft substitutes — are tracked through the surgical record with full device tracking information (manufacturer, model, serial number, lot number, implant date, implanting surgeon, implant location, implant size). The implant tracking supports regional medical device regulations (which require tracking of implantable devices for adverse event monitoring and recall response) and supports clinical follow-up (including surveillance for implant loosening, infection, and wear). Implant tracking is recorded in the audit trail; recall notifications received through the Integration module (M17) are matched against implanted devices and trigger patient recall workflows through the Notifications module (M08).

### 6.4 Pre-operative Templating Integration

Pre-operative templating for joint arthroplasty — the process of measuring the patient's anatomy on pre-operative radiographs and selecting the appropriate implant size and position — is performed using templating software that may be integrated with Ibn Hayan through the Integration module (M17). The templating results (selected implant manufacturer, model, size, and planned position) are stored in the patient's record and are referenced during the surgical procedure. Templating integration supports consistency between the pre-operative plan and the actual implants used, with discrepancies documented and reviewed for quality improvement. Templating integration is particularly important for joint arthroplasty, where accurate implant sizing supports surgical outcome and implant longevity.

### 6.5 Procedural Outcome Reporting

Procedural outcome reporting aggregates the outcomes of surgical procedures across the patient panel, supporting quality monitoring and quality improvement. Outcomes tracked include patient-reported outcome measures (PROMs) such as the Oxford Hip Score and the Knee Society Score, clinical outcomes such as ROM and functional assessment, and adverse events such as surgical site infection, implant loosening, and revision surgery. Procedural outcome reporting is configured through the Reporting module (M18) and is integrated with regional orthopedic registry reporting where required. The reporting supports identification of outliers and supports quality improvement initiatives.

---

## 7. Rehabilitation Planning

### 7.1 Capability Overview

Rehabilitation is a core component of orthopedic care, supporting patients' recovery from injury and surgery through structured physical therapy, occupational therapy, and (where applicable) rehabilitation medicine. The orthopedic surgeon typically initiates the rehabilitation plan at the time of injury or surgery and coordinates with the rehabilitation team over weeks to months. Ibn Hayan's rehabilitation planning capability, implemented through the Clinical Documentation module (M03) with coordination through the Orders & Results module (M04) and the Notifications module (M08), supports rehabilitation plan documentation, physical therapy order generation, rehabilitation progress tracking, and longitudinal rehabilitation outcome assessment.

### 7.2 Rehabilitation Plan Documentation

Rehabilitation plan documentation captures the rehabilitation goals (such as achieving specific ROM targets, achieving specific functional milestones, returning to specific activities), the rehabilitation interventions (such as supervised physical therapy sessions, home exercise program, modalities), the rehabilitation frequency and duration, and the milestones for progression. The rehabilitation plan is documented at the time of injury or surgery and is updated at follow-up visits based on rehabilitation progress. The plan is shared with the rehabilitation team through the Integration module (M17) where integration is configured, or through the Documents module (M07) where integration is not configured.

### 7.3 Physical Therapy Order Generation

Physical therapy orders are generated through the Orders & Results module (M04), with the order specifying the rehabilitation goals, the planned interventions, the frequency and duration, and any precautions or contraindications. The order is transmitted to the physical therapy service through the Integration module (M17) where integration is configured, or is delivered as a printed document through the Documents module (M07). The physical therapy service documents the rehabilitation sessions and the progress; the documentation is integrated into the patient's record through the Integration module (M17) where integration is configured. The physical therapy order and the rehabilitation progress documentation support coordination between the orthopedic surgeon and the rehabilitation team.

### 7.4 Rehabilitation Progress Tracking

Rehabilitation progress tracking integrates the documentation from physical therapy sessions into the patient's longitudinal record, supporting the orthopedic surgeon's assessment of rehabilitation progress. The tracking view presents the rehabilitation session documentation, the ROM measurements from physical therapy, and the functional milestone achievement in a single integrated view. The tracking view supports the orthopedic surgeon's decision-making about rehabilitation progression, additional interventions (such as manipulation under anesthesia for stiff joints), and return to activity. The tracking view is particularly valuable for post-surgical patients, where rehabilitation progress is a key determinant of surgical outcome.

### 7.5 DVT Prophylaxis Management

DVT prophylaxis management is a critical patient safety activity in orthopedics, as orthopedic surgery patients (particularly joint arthroplasty and hip fracture patients) are at elevated risk of venous thromboembolism. Ibn Hayan's DVT prophylaxis management capability, implemented through the Pharmacy module (M05) with documentation through the Clinical Documentation module (M03), supports DVT risk assessment using standardized tools (such as the Caprini Risk Assessment), DVT prophylaxis prescribing (mechanical and pharmacological), DVT prophylaxis duration tracking, and DVT event tracking. The DVT prophylaxis management is integrated with the surgical record, with the prophylaxis initiated at the time of surgery and continued for the duration specified by regional clinical practice guidelines. DVT prophylaxis management is a regulatory and quality reporting priority in orthopedics.

---

## 8. Specialty Workflows

### 8.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Outpatient consultation | Scheduled appointment | Comprehensive MSK exam, radiograph review, assessment, plan | Physician, Nurse, Technician | M02, M03, M04, M17 |
| Fracture management | Acute fracture presentation | Assessment, radiograph, reduction if needed, immobilization, documentation, follow-up plan | Physician, Nurse, Technician | M02, M03, M04 |
| Joint injection or aspiration | Scheduled or acute | Consent, procedure, documentation, specimen handling if aspiration | Physician, Nurse | M02, M03, M04 |
| Arthroscopic surgery | Scheduled surgery | Pre-op consent, anesthesia, procedure, post-op documentation | Physician, Nurse, Anesthesiologist | M02, M03, M04, M17 |
| Joint arthroplasty | Scheduled surgery | Pre-op consent, templating, anesthesia, procedure, implant tracking, post-op documentation | Physician, Nurse, Anesthesiologist | M02, M03, M04, M17 |
| Fracture fixation surgery | Scheduled or emergent surgery | Pre-op consent, anesthesia, procedure, implant tracking, post-op documentation | Physician, Nurse, Anesthesiologist | M02, M03, M04, M17 |
| Post-operative follow-up | Scheduled post-op visit | Assess healing, ROM, complication check, document, plan rehabilitation | Physician, Nurse | M02, M03, M04 |
| Rehabilitation coordination | Post-injury or post-surgery | Generate PT order, transmit, track progress, integrate into record | Physician, Receptionist | M04, M07, M08, M17 |
| Implant recall response | Recall notification received | Match recall to implanted devices, identify affected patients, generate recall notifications, schedule follow-up | Administrator, Physician | M08, M17, M18 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The orthopedics data model extends the platform's standard patient-encounter-centric model with entities for musculoskeletal examination records, range of motion records, fracture records, orthopedic surgical records, orthopedic implant records, rehabilitation plan records, and orthopedic registry membership. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Musculoskeletal examination record | Documentation of a structured MSK examination | Patient, encounter, examination date, joint or anatomic site, inspection, palpation, ROM, special tests, neurovascular status |
| Range of motion record | Documentation of a ROM measurement | Patient, encounter, joint, movement plane, measurement type (active, passive), measurement value, cause of limitation |
| Fracture record | Documentation of a fracture | Patient, encounter, fractured bone, fracture location, fracture pattern, displacement, joint involvement, soft tissue involvement, treatment, image references |
| Orthopedic surgical record | Documentation of an orthopedic surgical procedure | Patient, encounter, procedure date, procedure type, anesthesia, approach, procedure steps, findings, complications, implants |
| Orthopedic implant record | Longitudinal record of an implanted orthopedic device | Patient, device type (prosthesis, screw, plate, rod, graft), manufacturer, model, serial number, lot number, implant date, implanting surgeon, implant location, current status |
| Rehabilitation plan record | Documentation of a rehabilitation plan | Patient, encounter, rehabilitation goals, interventions, frequency, duration, milestones |
| Physical therapy order | Order for physical therapy | Patient, encounter, rehabilitation goals, planned interventions, frequency, duration, precautions |
| DVT prophylaxis record | Documentation of DVT prophylaxis | Patient, encounter, risk assessment, prophylaxis type (mechanical, pharmacological), initiation, duration, completion |
| Orthopedic registry entry | Cohort membership for an orthopedic registry | Patient, registry type, enrolment date, monitoring indicators, treatment targets, review cadence |

### 9.3 Entity Relationships

The musculoskeletal examination record references the patient and the encounter; longitudinal examination comparison is supported through the patient reference. The range of motion record references the patient and the encounter and is linked to the joint examined; longitudinal ROM comparison is supported through the patient and joint references. The fracture record references the patient and the encounter and includes image references; the fracture record persists independently as a longitudinal record and is updated by follow-up encounters. The orthopedic surgical record references the patient and the encounter and includes implant records for devices placed during the procedure. The orthopedic implant record references the patient and the implanting encounter; the implant record persists independently as a longitudinal record and is updated by subsequent follow-up encounters and recall events. The rehabilitation plan record references the patient and the encounter and is linked to the originating injury or surgery; the plan is updated by follow-up visits and by physical therapy progress documentation.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Outpatient orthopedics consultation | Outpatient | Comprehensive MSK consultation with structured examination |
| Follow-up visit | Outpatient | Focused follow-up for established condition |
| Fracture management visit | Outpatient or emergency | Acute fracture assessment and management |
| Joint injection visit | Outpatient | Joint injection or aspiration procedure |
| Pre-operative assessment | Outpatient | Pre-operative assessment for scheduled surgery |
| Post-operative follow-up | Outpatient | Post-surgery assessment with healing documentation and ROM measurement |
| Rehabilitation planning visit | Outpatient | Rehabilitation plan development and update |
| Disability assessment visit | Outpatient | Disability assessment with ROM measurement and rating |

### 10.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| Operative report | Surgical procedural report | M07 Documents |
| Fracture management note | Fracture documentation with image marking | M07 Documents |
| Cast or brace documentation | Documentation of immobilization device | M07 Documents |
| Physical therapy order | Outbound rehabilitation order | M04 Orders & Results |
| Implant implantation certificate | Patient-facing implant documentation | M07 Documents |
| Post-operative instructions | Patient-facing post-operative care instructions | M07 Documents |
| DVT prophylaxis prescription | Patient-facing DVT prophylaxis prescription | M07 Documents |
| Disability assessment documentation | Patient-facing or regulatory-facing disability assessment | M07 Documents |

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Joint arthroplasty outcomes report | PROMs, ROM recovery, complications, revision rates | Quarterly |
| Fracture healing outcomes report | Time to healing, complications, functional recovery | Quarterly |
| Surgical site infection report | SSI rates by procedure type | Monthly |
| DVT prophylaxis compliance report | Prophylaxis initiation and duration compliance | Monthly |
| Implant recall response report | Recall identification, patient notification, follow-up completion | On demand |
| Rehabilitation outcomes report | Rehabilitation completion, ROM recovery, functional milestone achievement | Quarterly |

### 11.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| Surgical volume report | Surgical procedures per surgeon, by type | Monthly |
| Fracture management volume report | Fractures managed by surgeon, by type | Monthly |
| No-show rate report | Missed appointments by clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |

### 11.3 Regulatory Reports

Regulatory reports include device tracking reporting for orthopedic implants, surgical site infection reporting (where required by regional regulation), trauma registry reporting (for orthopedic surgeons providing trauma call), and quality reporting to regional health authorities. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 12. Role & Permission Recommendations

### 12.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Orthopedics |
|---|---|---|
| Physician (Orthopedic Surgeon) | R01 | Clinical assessment, diagnosis, treatment, surgery, orders, documentation |
| Nurse | R02 | Nursing assessment, procedure assistance, cast and brace application, patient education |
| Cast room technician | R04 | Cast and brace application and removal, dressing changes, equipment operation |
| Physical therapist | R05 | Rehabilitation assessment, treatment, progress documentation, ROM measurement |
| Pharmacist | R03 | Medication review, DVT prophylaxis management (where embedded) |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Outpatient scheduling, surgical scheduling, rehabilitation scheduling |
| Biller | R08 | Encounter billing, procedural billing, surgical billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 12.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, and by patient cohort per `PRODUCT_BIBLE.md` Section 21.4. Orthopedics facilities typically scope physician access to the facility level for outpatient encounters and to the patient cohort level for inpatient encounters. Cast room technician access is scoped to the cast room procedures they perform; the technician has access to the cast documentation but not to the full clinical assessment. Surgical documentation access is scoped to the surgical team; access to operative records is restricted to the surgical team and to orthopedic surgeons with a documented care relationship to the patient. Physical therapist access is scoped to the rehabilitation activities they perform and to the patients for whom they have an active rehabilitation order.

### 12.3 Custom Role Recommendations

Common custom roles for orthopedics include the Cast Room Technician role (composed of technician permissions scoped to cast and brace application and removal), the Surgical Coordinator role (composed of scheduler and administrator permissions scoped to surgical scheduling), the Rehabilitation Coordinator role (composed of scheduler and administrator permissions scoped to rehabilitation coordination), and the Trauma Call Coordinator role (composed of scheduler and administrator permissions scoped to trauma call scheduling). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 13. Configuration Defaults

### 13.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Outpatient consultation slot duration | 30 minutes | Customer-adjustable |
| Follow-up visit slot duration | 20 minutes | Customer-adjustable |
| Fracture management visit slot duration | 30 minutes | Customer-adjustable |
| Joint injection visit slot duration | 20 minutes | Customer-adjustable |
| Pre-operative assessment slot duration | 45 minutes | Customer-adjustable |
| Post-operative follow-up slot duration | 20 minutes | Customer-adjustable |
| Surgical procedure slot duration | Variable by procedure type | Customer-configurable per procedure type |
| Rehabilitation planning visit slot duration | 30 minutes | Customer-adjustable |

### 13.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Outpatient orthopedics consultation | Customer-adjustable |
| Default orthopedic registry set | Joint arthroplasty, fracture, osteoarthritis, osteoporosis | Customer-adjustable |
| DVT risk assessment tool | Caprini Risk Assessment | Customer-adjustable |
| DVT prophylaxis duration | Per regional clinical practice guideline | Configured through Localization module (M19) |
| PROMs administration schedule | Pre-operative, 6 months, 1 year, annually thereafter | Customer-adjustable per procedure type |

### 13.3 Procedural Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Procedure consent capture | Required before procedure start | Non-overridable |
| Surgical consent capture | Surgical-specific consent required | Non-overridable |
| Implant tracking fields | Manufacturer, model, serial number, lot number, implant date, implanting surgeon, implant location, implant size | Non-overridable per regional regulation |
| DVT prophylaxis initiation | At time of surgery | Non-overridable per clinical practice guideline |

---

## 14. Onboarding Checklist

### 14.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that orthopedics (C13) is the primary clinic type for the facility.
2. Activate the orthopedics overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2; for hospital orthopedics departments, enable all modules per the Enterprise edition.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, DVT prophylaxis guidelines, and orthopedic quality reporting formats.
5. Configure musculoskeletal assessment: Verify structured joint-specific examination templates; configure special tests vocabulary per regional convention.
6. Configure range of motion tracking: Verify structured ROM template with bilateral tracking; configure integration with digital ROM measurement devices.
7. Configure fracture documentation: Verify fracture documentation template; configure image marking integration; configure fracture registry.
8. Configure surgical records: Verify operative report templates per procedure type; configure implant tracking fields per regional regulation; configure pre-operative templating integration.
9. Configure rehabilitation planning: Verify rehabilitation plan template; configure physical therapy order transmission; configure rehabilitation progress tracking integration.
10. Configure DVT prophylaxis management: Configure DVT risk assessment tool; configure prophylaxis duration per regional guideline; configure DVT event tracking.
11. Configure orthopedic registries: Enable the default registry set; refine cohort criteria, monitoring indicators, and treatment targets.
12. Configure encounter templates: Review the default encounter templates listed in Section 10.1; refine templates to match the facility's documentation standards.
13. Configure role set and permissions: Provision the roles listed in Section 12.1; configure permission scope by facility, care team, patient cohort, and procedural team.
14. Configure integrations: Configure hospital integration, ambulatory surgery center integration, radiology integration, and physical therapy integration; validate integration data flow in the configuration sandbox.
15. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians and technicians.
16. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 15. Sample Use Cases

### 15.1 Use Case — Outpatient Consultation for Knee Pain

A 55-year-old patient presents with progressive right knee pain worse with activity. The orthopedic surgeon conducts an outpatient consultation using the outpatient orthopedics consultation template, including a comprehensive knee examination with structured documentation of inspection, palpation, ROM (active and passive, measured in degrees for flexion, extension), special tests (Lachman, anterior drawer, posterior drawer, McMurray, varus and valgus stress), and neurovascular status. The bilateral ROM comparison view presents the right and left knee measurements side by side, supporting identification of the affected side's limitation. A weight-bearing radiograph of the knee is ordered through the Orders & Results module (M04) and reviewed through the Integration module (M17); the radiograph demonstrates medial joint space narrowing consistent with osteoarthritis. The surgeon documents the assessment and recommends initial non-operative management including physical therapy, NSAIDs, and weight management; a physical therapy order is generated and transmitted.

### 15.2 Use Case — Acute Distal Radius Fracture Management

A 60-year-old patient presents to the orthopedics clinic after a fall onto an outstretched hand, with wrist pain and deformity. The orthopedic surgeon conducts a fracture management visit using the fracture management visit template; radiographs of the wrist are obtained and reviewed through the Integration module (M17). The fracture is documented in the fracture record as a dorsally displaced distal radius fracture with dorsal comminution, extra-articular, closed. The fracture location and displacement are marked on the radiograph using image marking tools. The surgeon performs a closed reduction under local anesthesia; the reduction is documented in the fracture record with post-reduction imaging. A forearm splint is applied and documented in the cast or brace documentation; the patient is scheduled for follow-up at 1 week with repeat radiographs. The longitudinal fracture tracking view is initiated with the current fracture documentation; the patient is enrolled in the fracture registry.

### 15.3 Use Case — Total Knee Arthroplasty

A 68-year-old patient with end-stage osteoarthritis of the right knee undergoes elective total knee arthroplasty. The pre-operative assessment is documented through the pre-operative assessment template, including consent, pre-operative templating (with the templating results integrated through the Integration module M17), and DVT risk assessment. The surgery is performed under spinal anesthesia; the operative report is documented through the operative report template, including the procedure details, the implants used (femoral component, tibial component, patellar component, and polyethylene insert — each tracked with full device tracking information), and any complications. The DVT prophylaxis is initiated through the Pharmacy module (M05); post-operative pain management is prescribed. The patient is enrolled in the joint arthroplasty outcomes registry; the pre-operative PROMs (Oxford Knee Score) are collected and recorded. At the post-operative follow-up visits, the ROM is measured and documented; the longitudinal ROM comparison view presents the pre-operative and post-operative measurements. The PROMs are repeated at 6 months and 1 year; the outcomes are recorded in the registry.

### 15.4 Use Case — Arthroscopic Rotator Cuff Repair

A 50-year-old patient with a symptomatic rotator cuff tear undergoes arthroscopic rotator cuff repair. The pre-operative MRI is reviewed through the Integration module (M17); the rotator cuff tear is documented in the musculoskeletal examination record. The surgery is performed under general anesthesia with interscalene block; the operative report is documented through the operative report template, including the arthroscopic findings, the repair technique, the implants used (suture anchors tracked with full device tracking information), and any complications. The rehabilitation plan is documented through the rehabilitation plan record; a physical therapy order is generated and transmitted through the Integration module (M17). The rehabilitation plan specifies an initial period of immobilization followed by passive ROM, active-assisted ROM, and progressive strengthening; the milestones for progression are documented. At follow-up visits, the rehabilitation progress is reviewed; the ROM and functional milestone achievement are documented.

### 15.5 Use Case — Rehabilitation Coordination After ACL Reconstruction

A 25-year-old patient undergoes arthroscopic anterior cruciate ligament reconstruction after a soccer injury. The surgery is documented through the operative report template; the rehabilitation plan is documented through the rehabilitation plan record, with a structured 6-month rehabilitation protocol. A physical therapy order is generated and transmitted to the physical therapy service through the Integration module (M17). The physical therapy service documents each session; the documentation is integrated into the patient's record through the Integration module (M17). The longitudinal rehabilitation tracking view presents the ROM measurements, the functional milestone achievement, and the session documentation in a single integrated view. At the 6-month follow-up visit, the patient has achieved full ROM and has passed the return-to-sport criteria; the surgeon documents the clearance for return to sport. The rehabilitation outcome is recorded in the registry.

### 15.6 Use Case — Implant Recall Response

A joint prosthesis manufacturer issues a recall for a specific knee prosthesis model due to an elevated rate of polyethylene wear. The recall notification is received through the Integration module (M17) or entered manually by the administrator. The Reporting module (M18) queries the orthopedic implant registry and identifies 18 patients in the facility with the affected prosthesis model. The Notifications module (M08) generates patient-specific recall notifications to the affected patients' care teams; the orthopedics service schedules follow-up appointments for the affected patients. At each follow-up appointment, the patient is assessed for symptoms of polyethylene wear (pain, swelling, instability); radiographs are obtained and reviewed for evidence of wear or osteolysis. Patients with evidence of wear are scheduled for revision surgery; patients without evidence of wear are placed on enhanced surveillance with more frequent follow-up. The recall response is documented per patient and recorded in the audit trail; the recall response is reported to the regional medical device regulatory authority through the Integration module (M17) where required.

---

## 16. Best Practices

### 16.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; DVT prophylaxis guidelines and orthopedic device tracking requirements vary by region.
2. Validate radiology, hospital, ambulatory surgery center, and physical therapy integrations carefully before go-live; integration failures can disrupt clinical workflow and can produce incomplete longitudinal records.
3. Configure implant tracking fields to the regional medical device regulatory standard; incomplete implant tracking can compromise recall response and regulatory compliance.
4. Use the configuration sandbox for all changes to DVT prophylaxis rules, surgical consent templates, and implant tracking configuration; these changes have direct patient safety and regulatory compliance implications.
5. Maintain the orthopedic vocabulary (special tests, fracture patterns, procedural terminology) through the Localization module (M19); vocabulary consistency across facilities within a tenant supports cross-facility reporting and clinical governance.

### 16.2 Operational Best Practices

6. Conduct longitudinal ROM comparison at every follow-up visit for patients undergoing rehabilitation; comparison is more clinically valuable than isolated measurement.
7. Maintain complete orthopedic implant records; the implant record is the foundation of recall response and is required for regulatory compliance.
8. Use the joint arthroplasty outcomes registry as a daily operational tool; registry accuracy depends on ongoing attention to enrolment, PROMs collection, and review cadence.
9. Conduct DVT prophylaxis for every surgical patient per the regional clinical practice guideline; DVT prophylaxis omission is a patient safety defect and is a regulatory and quality reporting priority.
10. Use the rehabilitation tracking view at every post-operative visit; rehabilitation progress is a key determinant of surgical outcome and supports the decision about return to activity.

### 16.3 Governance Best Practices

11. Conduct a quarterly surgical outcomes review with the clinical lead; this review validates surgical quality and identifies outliers for review.
12. Conduct an annual implant tracking audit; this audit validates that all implanted orthopedic devices are tracked completely and accurately.
13. Conduct a monthly DVT prophylaxis compliance review; this review validates that DVT prophylaxis is initiated and continued per the regional clinical practice guideline for every surgical patient.

---

## 17. Related Documents

### 17.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C13 Orthopedics; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 26 governs integration philosophy |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.4 covers surgical specialty single-specialty facilities including orthopedics; Section 6 documents module recommendations |

### 17.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 12 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 12.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Cardiology | `docs/06_CLINIC_TYPES/CARDIOLOGY.md` | Related specialty with shared device tracking patterns |
| ENT | `docs/06_CLINIC_TYPES/ENT.md` | Related surgical specialty |
| Ophthalmology | `docs/06_CLINIC_TYPES/OPHTHALMOLOGY.md` | Related surgical specialty with shared procedural documentation patterns |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Changes — including overlay revisions, registry set updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
