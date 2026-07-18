# Ibn Hayan Healthcare Operating System
## Gynecology & Obstetrics Clinics

| Field | Value |
|---|---|
| Document Title | Gynecology & Obstetrics Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the obstetrics and gynecology overlay is amended or when regional prenatal screening guidance changes |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for obstetrics and gynecology facilities |
| Scope | Specialty overview, target facilities, recommended modules, menstrual history records, pregnancy tracking, prenatal records, contraception management, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for obstetrics and gynecology (clinic type C05) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, assisted reproductive technology-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the obstetrics and gynecology clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Menstrual History Records
5. Pregnancy Tracking
6. Prenatal Records
7. Contraception Management
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

Obstetrics and gynecology (often abbreviated OB-GYN) is the surgical and medical specialty concerned with the care of the female reproductive system and with pregnancy, childbirth, and the postpartum period. The obstetrician-gynecologist evaluates and manages conditions including routine and high-risk pregnancy, menstrual disorders, infertility, contraception, menopause management, gynecologic infections, benign gynecologic conditions (fibroids, endometriosis, ovarian cysts), gynecologic cancers, and pelvic floor disorders. Scope of practice includes outpatient consultation, prenatal care, labor and delivery management, gynecologic procedures (colposcopy, LEEP, hysteroscopy, dilation and curettage), gynecologic surgery (hysterectomy, myomectomy, ovarian surgery), and cesarean delivery. Ibn Hayan treats obstetrics and gynecology as clinic type C05 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated Medium (reflecting procedural consent and pregnancy tracking complexity) and recommended editions Professional (E2) and Enterprise (E3).

### 1.2 Patient Population and Clinical Activities

The obstetrics and gynecology patient population spans from adolescence (typically onset of gynecologic care around age 13 to 15) through post-menopause, with peak utilization during the reproductive years. Clinical activities include well-woman examinations, contraceptive counseling and management, preconception counseling, prenatal care across the three trimesters, labor and delivery management, postpartum care, evaluation and management of gynecologic conditions, gynecologic procedures and surgery, menopause management, and gynecologic cancer surveillance. The specialty is distinctive in that it combines longitudinal primary-style care (well-woman visits, contraception management, menopause management) with episodic procedural and surgical care (colposcopy, LEEP, hysteroscopy, hysterectomy) and with the distinct clinical trajectory of pregnancy, which unfolds over approximately 40 weeks and involves a defined schedule of prenatal visits, screenings, and ultrasounds.

### 1.3 Why Obstetrics and Gynecology Needs Specialized Configuration

Obstetrics and gynecology requires specialized configuration across multiple dimensions: structured documentation of menstrual history (with menstrual cycle tracking, menstrual pattern documentation, and abnormal uterine bleeding assessment), pregnancy tracking (with gestational age calculation, prenatal visit scheduling, prenatal screening coordination, and pregnancy outcome documentation), comprehensive prenatal records (with structured documentation of prenatal visits, prenatal laboratory results, ultrasound findings, and pregnancy-specific risk assessment), contraception management (with contraceptive method tracking, side effect monitoring, and method switching documentation), and procedural documentation for gynecologic procedures (with procedural consent, procedure notes, and pathology coordination). Ibn Hayan's obstetrics and gynecology overlay addresses these requirements through specialty-specific documentation templates, registry views, and workflow definitions, with configuration defaults reflecting typical obstetrics and gynecology practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.4 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Multidisciplinary Care

Obstetrics and gynecology coordinates closely with maternal-fetal medicine (for high-risk pregnancy), with reproductive endocrinology and infertility (for assisted reproductive technology), with gynecologic oncology (for gynecologic cancer management), with urogynecology (for pelvic floor disorders), with neonatology (for newborn care), with anesthesia (for labor analgesia and surgical anesthesia), and with radiology (for obstetric and gynecologic imaging). The obstetrician-gynecologist often serves as the patient's primary women's health provider across the reproductive years and beyond, with referrals to subspecialists for specific conditions. Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports these compositions, with shared services such as the labor and delivery unit, the ultrasound suite, and the operating room operating as facility-level shared services across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Obstetrics and gynecology operates across the mid-sized facility spectrum, from small group practices with two to five obstetrician-gynecologists through hospital obstetrics and gynecology departments with twenty or more physicians plus midwives, nurses, ultrasound technicians, and trainees. The most common configurations are mid-sized group practices (six to twelve obstetrician-gynecologists with embedded ultrasound and laboratory), large group practices (with full outpatient and surgical capability), and hospital obstetrics and gynecology departments (operating as a service line with labor and delivery unit and operating room access). Ibn Hayan's Professional edition (E2) is the typical fit for mid-sized group practices per `PRODUCT_BIBLE.md` Section 16.5; Enterprise edition (E3) is required for hospital obstetrics and gynecology departments with labor and delivery unit operations, inpatient admitting privileges, and integration with hospital systems including the newborn record.

### 2.2 Ownership Patterns and Geographic Considerations

Obstetrics and gynecology facilities operate under private practice ownership, physician-group ownership, hospital-employment models, and academic medical centre ownership. Geographic considerations emphasize hospital connectivity for labor and delivery; obstetricians typically hold labor and delivery privileges at one or more hospitals and require integration with hospital systems including the labor and delivery information system and the newborn record system. Rural obstetrics and gynecology practice frequently operates as an outreach model with the obstetrician traveling between satellite clinics and a central hospital, with patients traveling to the central hospital for delivery. Ibn Hayan's offline-first posture, documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 (P11), supports satellite clinic operations directly, while the Integration module (M17) supports hospital connectivity through standard integration profiles.

### 2.3 Regulatory Environment

Obstetrics and gynecology operates within a regulatory environment that includes procedural documentation requirements (for gynecologic procedures and cesarean delivery), prenatal and newborn screening reporting requirements (to regional public health authorities), controlled substance prescribing oversight (for post-operative pain management and for certain gynecologic medications), maternal mortality reporting (where required by regional regulation), and reproductive health record confidentiality requirements (which may exceed general medical record confidentiality under regional law). Ibn Hayan's permission framework supports the layered confidentiality model required for obstetrics and gynecology, with reproductive health encounter segregation that is enforced at the platform layer. The Audit module (M16) records every access to obstetric and gynecologic records; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including prenatal screening reporting and maternal mortality reporting.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for obstetrics and gynecology reflects the specialty's emphasis on pregnancy tracking, prenatal documentation, procedural documentation, and contraception management. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record with obstetric and gynecologic history |
| Encounter | M02 | Required | Encounter management across outpatient, prenatal, procedural, and labor and delivery visits |
| Clinical Documentation | M03 | Required | Specialty-specific documentation templates for consultation, prenatal visit, procedure, and labor and delivery |
| Orders & Results | M04 | Required | Laboratory, imaging, prenatal screening, pathology orders |
| Pharmacy | M05 | Required | Contraceptive management, prenatal medication management, post-operative medication management |
| Scheduling | M06 | Required | Outpatient scheduling, prenatal visit scheduling, procedure scheduling, labor and delivery scheduling |
| Documents | M07 | Required | Consult letters, prenatal records, operative reports, contraceptive documentation |
| Notifications | M08 | Required | Prenatal visit reminders, test result alerts, post-operative follow-up reminders |
| Billing | M09 | Required | Encounter billing, prenatal global billing, procedural billing, delivery billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Well-woman recall, prenatal outreach |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For labor and delivery staffing and call scheduling |
| Identity & Access | M14 | Required | Authentication, authorization, reproductive health confidentiality enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for procedural and reproductive health events |
| Integration | M17 | Required | Integration with ultrasound equipment, laboratory, hospital systems, newborn record |
| Reporting | M18 | Required | Prenatal care quality metrics, procedural outcomes, contraceptive method distribution |
| Localization | M19 | Required | Regional regulatory frameworks, prenatal screening schedules, reproductive health confidentiality rules |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Small group practice (T2) | E2 | M01–M09, M14–M19 | M10, M11 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13 |
| Large group practice (T4) | E2 or E3 | M01–M19 (all) | None typical |
| Hospital obstetrics and gynecology department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Menstrual History Records

### 4.1 Capability Overview

Menstrual history is a foundational element of the gynecologic record, providing the data that supports assessment of reproductive health, diagnosis of menstrual disorders, evaluation of fertility, and management of menopause. The menstrual history captures the age at menarche, the typical cycle pattern (interval, duration, flow), the date of the last menstrual period, the history of menstrual abnormalities (including abnormal uterine bleeding, dysmenorrhea, and amenorrhea), and the menstrual trajectory through perimenopause and menopause. Ibn Hayan's menstrual history records capability, implemented through the Clinical Documentation module (M03), supports structured menstrual history documentation, menstrual cycle tracking, abnormal uterine bleeding assessment using standardized tools, and longitudinal menstrual trajectory tracking.

### 4.2 Structured Menstrual History Documentation

Structured menstrual history documentation captures the standard elements of the gynecologic menstrual history: age at menarche, typical cycle interval (in days), typical menstrual duration (in days), typical flow (light, moderate, heavy), presence of dysmenorrhea, presence of intermenstrual bleeding, presence of postcoital bleeding, date of last menstrual period, and (where applicable) age at menopause and type of menopause (natural, surgical, medical). The structured documentation supports longitudinal comparison and supports identification of menstrual pattern changes that may indicate underlying pathology. The documentation template is configurable per facility and per regional gynecologic convention.

### 4.3 Menstrual Cycle Tracking

Menstrual cycle tracking supports detailed documentation of individual menstrual cycles over time, with each cycle recorded with start date, duration, flow, and associated symptoms. Cycle tracking is particularly valuable for patients undergoing fertility evaluation, for patients with menstrual disorders (where cycle tracking supports assessment of treatment response), and for patients approaching menopause (where cycle tracking documents the perimenopausal transition). Cycle tracking may be performed by the patient through the patient portal, with the patient recording each cycle and the data flowing into the menstrual history record; the patient-entered data is reviewed by the clinician at the next encounter and is incorporated into the longitudinal record.

### 4.4 Abnormal Uterine Bleeding Assessment

Abnormal uterine bleeding is one of the most common gynecologic presentations and is assessed using standardized tools including the PALM-COEIN classification system (for causes of abnormal uterine bleeding) and the pictorial blood loss assessment chart (PBAC, for quantitative assessment of menstrual blood loss). Ibn Hayan's abnormal uterine bleeding assessment capability supports structured documentation using these tools, with the assessment integrated into the menstrual history record. The structured assessment supports registry integration; patients with documented abnormal uterine bleeding are enrolled in the abnormal uterine bleeding registry for longitudinal tracking of treatment response.

### 4.5 Menopause Management

Menopause management documentation captures the menopausal status (premenopausal, perimenopausal, postmenopausal), the presence and severity of menopausal symptoms (hot flashes, night sweats, vaginal dryness, sleep disturbance, mood changes), and the menopausal hormone therapy regimen (where prescribed). The menopause management documentation is integrated with the menstrual history record, supporting longitudinal tracking of the menopausal transition. Menopausal hormone therapy management is supported through the Pharmacy module (M05), with attention to the specific risks and contraindications of hormone therapy in different patient populations.

---

## 5. Pregnancy Tracking

### 5.1 Capability Overview

Pregnancy tracking is a defining capability of obstetrics, providing the longitudinal data structure that supports prenatal care, gestational age calculation, prenatal visit scheduling, prenatal screening coordination, and pregnancy outcome documentation. A pregnancy is a distinct clinical trajectory that unfolds over approximately 40 weeks, with a defined schedule of prenatal visits, prenatal screenings at specific gestational ages, and ultrasounds at specific intervals. Ibn Hayan's pregnancy tracking capability, implemented through the Patient module (M01) and the Encounter module (M02) with registry integration through the Reporting module (M18), supports pregnancy record creation, gestational age calculation, prenatal visit scheduling, prenatal screening coordination, pregnancy outcome documentation, and longitudinal pregnancy history tracking.

### 5.2 Pregnancy Record and Gestational Age

The pregnancy record is created at the first prenatal visit (or at the preconception visit, where applicable) and persists throughout the pregnancy and the postpartum period. The record captures the estimated date of delivery (calculated from the last menstrual period or from first-trimester ultrasound, with the calculation method documented and the most accurate estimate used), the gravidity and parity (with structured documentation of prior pregnancies and their outcomes), and the pregnancy-specific risk factors (maternal age, medical conditions, obstetric history, family history). The gestational age is calculated automatically based on the estimated date of delivery and is updated daily; the gestational age is displayed at every prenatal encounter and is used to drive prenatal visit scheduling and prenatal screening coordination.

### 5.3 Prenatal Visit Scheduling

Prenatal visit scheduling follows the regional prenatal care schedule, with visits scheduled at specific gestational ages. The default schedule (per regional framework, typically configured through the Localization module M19) includes visits every 4 weeks until 28 weeks, every 2 weeks from 28 to 36 weeks, and weekly from 36 weeks until delivery. The Scheduling module (M06) generates prenatal visit recall notifications at the appropriate intervals; the Notifications module (M08) sends reminders to the patient. High-risk pregnancies may have an alternative schedule configured by the obstetrician; the alternative schedule is recorded in the pregnancy record and is used to drive scheduling.

### 5.4 Prenatal Screening Coordination

Prenatal screening coordination manages the schedule of prenatal screenings (genetic screening, aneuploidy screening, neural tube defect screening, gestational diabetes screening, group B streptococcus screening) and diagnostic tests (amniocentesis, chorionic villus sampling) that are due at specific gestational ages. The coordination capability, configured through the Localization module (M19) with the regional prenatal screening schedule, generates screening reminders at the appropriate gestational ages and tracks screening completion. Screening results are received through the Orders & Results module (M04) and are integrated into the prenatal record. Screening results that indicate increased risk trigger specialist referral workflows (typically to maternal-fetal medicine).

### 5.5 Pregnancy Outcome Documentation

Pregnancy outcome documentation captures the outcome of the pregnancy (live birth, stillbirth, miscarriage, ectopic pregnancy, termination) and the details of the outcome (for live birth: gestational age at delivery, mode of delivery, birth weight, neonatal outcome; for other outcomes: gestational age at outcome, management approach, complications). The pregnancy outcome documentation is integrated with the prenatal record and with the patient's longitudinal obstetric history. Pregnancy outcome documentation supports registry reporting for maternal and perinatal quality metrics and supports the calculation of gravidity and parity for future pregnancies.

---

## 6. Prenatal Records

### 6.1 Capability Overview

The prenatal record is a comprehensive structured record of prenatal care, documenting the longitudinal progression of the pregnancy across all prenatal visits. The prenatal record consolidates the maternal history, the prenatal visit documentation, the prenatal laboratory results, the prenatal ultrasound findings, the prenatal screening results, and the pregnancy risk assessment into a single longitudinal record that supports continuity of care across visits and across providers. Ibn Hayan's prenatal records capability, implemented through the Clinical Documentation module (M03) with integration through the Orders & Results module (M04), supports structured prenatal visit documentation, prenatal laboratory result integration, prenatal ultrasound documentation, pregnancy risk assessment, and longitudinal prenatal record compilation.

### 6.2 Prenatal Visit Documentation

Prenatal visit documentation is structured according to the standard prenatal visit format, with sections for gestational age, maternal weight and blood pressure, fetal heart rate, fundal height (where applicable), maternal symptoms, prenatal screening and laboratory results due at this gestational age, ultrasound findings (where applicable), assessment, and plan. The structured documentation supports longitudinal comparison (with prior visit data displayed alongside current visit data) and supports registry integration (with specific findings triggering registry membership for high-risk conditions). The documentation template is configurable per facility and per regional prenatal care standard.

### 6.3 Prenatal Laboratory Result Integration

Prenatal laboratory results — including initial prenatal panel (blood type and Rh, complete blood count, rubella immunity, syphilis screening, HIV screening, hepatitis B screening, urine culture), aneuploidy screening, gestational diabetes screening, group B streptococcus screening, and any additional laboratory results — are received through the Orders & Results module (M04) and are integrated into the prenatal record. The integration presents the results in the context of the gestational age at which they were obtained and the screening schedule that drove the order; abnormal results are flagged for clinician attention and trigger Notifications module (M08) alerts. The integration supports longitudinal tracking of laboratory results across the pregnancy.

### 6.4 Prenatal Ultrasound Documentation

Prenatal ultrasound documentation is structured per trimester, with first-trimester ultrasound documenting gestational age confirmation and aneuploidy screening, second-trimester ultrasound documenting fetal anatomy survey, and third-trimester ultrasound (where indicated) documenting fetal growth and well-being. The documentation captures the ultrasound findings (fetal biometry, fetal anatomy, amniotic fluid volume, placental location, fetal position), the ultrasound images (stored as image references through the Integration module M17), and the interpretation. The longitudinal ultrasound comparison view presents the current and prior ultrasound findings, supporting assessment of fetal growth trajectory and identification of abnormalities.

### 6.5 Pregnancy Risk Assessment

Pregnancy risk assessment uses structured tools to identify pregnancies at elevated risk for adverse outcomes, supporting the decision to refer to maternal-fetal medicine or to escalate prenatal care. The risk assessment captures the maternal risk factors (maternal age, medical conditions, obstetric history, family history), the pregnancy-specific risk factors (multiple gestation, abnormal ultrasound findings, abnormal screening results), and the overall risk stratification (low risk, elevated risk, high risk). The risk stratification is updated at each prenatal visit and triggers care plan adjustments; the risk stratification is integrated with the prenatal visit scheduling (with high-risk pregnancies receiving an alternative visit schedule).

---

## 7. Contraception Management

### 7.1 Capability Overview

Contraception management is a core activity of obstetrics and gynecology, encompassing contraceptive counseling, method initiation, method monitoring, side effect management, method switching, and method discontinuation. The typical obstetrics and gynecology practice manages contraception for a substantial fraction of its patient panel, with each patient generating a longitudinal record of contraceptive methods used over the reproductive years. Ibn Hayan's contraception management capability, implemented through the Pharmacy module (M05) with documentation through the Clinical Documentation module (M03), supports contraceptive method documentation, method initiation workflows, side effect monitoring, method switching documentation, and contraceptive method distribution reporting.

### 7.2 Contraceptive Method Documentation

Contraceptive method documentation captures the method type (hormonal methods including combined oral contraceptives, progestin-only pills, contraceptive patch, contraceptive ring, contraceptive implant, hormonal intrauterine device; non-hormonal methods including copper intrauterine device, barrier methods, fertility awareness methods, sterilization), the method specifics (for hormonal methods: formulation, dose; for intrauterine devices: type, insertion date, planned removal date; for sterilization: procedure type, procedure date), and the method status (active, discontinued, switched). The documentation supports longitudinal tracking of contraceptive methods used over time; the longitudinal view supports assessment of method satisfaction, side effect patterns, and method effectiveness.

### 7.3 Method Initiation Workflows

Method initiation workflows support the structured initiation of a contraceptive method, including the counseling documentation (method options discussed, patient's choice, contraindications screened), the method-specific initiation procedure (for intrauterine devices and implants: procedure documentation, consent, post-procedure instructions), and the follow-up plan (for hormonal methods: blood pressure monitoring, side effect follow-up; for intrauterine devices and implants: insertion follow-up, expulsion check). The method initiation workflows are configurable per method type and per regional clinical practice guideline; workflows that include procedures (intrauterine device insertion, implant insertion, sterilization) require procedural consent captured through the standard consent workflow.

### 7.4 Side Effect Monitoring

Side effect monitoring tracks side effects reported by patients using contraceptive methods, with each side effect documented with the type (nausea, headache, breast tenderness, irregular bleeding, mood changes, weight changes), the severity, the onset, and the management approach (continued use with reassurance, dose adjustment, method switch, method discontinuation). Side effect monitoring supports identification of side effect patterns that may warrant method switch; the monitoring data is integrated with the contraceptive method documentation, supporting longitudinal tracking of method tolerance. Side effect monitoring is particularly important for hormonal methods, where side effects are a leading cause of method discontinuation.

### 7.5 Contraceptive Method Distribution Reporting

Contraceptive method distribution reporting provides the practice's distribution of contraceptive methods across the patient panel, supporting assessment of method mix, identification of disparities in method access, and reporting to regional public health authorities where required. The reporting is configured through the Reporting module (M18) and is generated from the contraceptive method documentation. The reporting supports quality improvement initiatives (such as increasing access to long-acting reversible contraception) and supports regulatory compliance where method distribution reporting is required.

---

## 8. Specialty Workflows

### 8.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Well-woman visit | Scheduled annual visit | Comprehensive examination, cervical cancer screening if due, contraceptive review, assessment, plan | Physician, Nurse | M02, M03, M04 |
| Prenatal visit | Scheduled gestational age visit | Vitals, fundal height, fetal heart rate, screening coordination, assessment, plan | Nurse, Physician | M02, M03, M04 |
| Contraceptive counseling and initiation | Patient-initiated or at visit | Counseling, method selection, initiation, documentation, follow-up plan | Physician, Nurse | M03, M05 |
| Intrauterine device insertion | Scheduled procedure | Consent, procedure, post-procedure documentation, follow-up plan | Physician, Nurse | M02, M03, M04 |
| Colposcopy | Abnormal cervical screening | Consent, procedure, biopsy, documentation, follow-up plan | Physician, Nurse | M02, M03, M04 |
| Labor and delivery | Labor onset | Admission, labor management, delivery, postpartum documentation | Physician, Nurse, Midwife | M02, M03 |
| Cesarean delivery | Scheduled or emergent | Consent, anesthesia, procedure, post-operative documentation | Physician, Nurse, Anesthesiologist | M02, M03, M04 |
| Postpartum visit | Scheduled postpartum visit | Maternal assessment, contraceptive counseling, postpartum depression screening, plan | Physician, Nurse | M02, M03 |
| Gynecologic surgery | Scheduled surgery | Pre-op consent, anesthesia, procedure, post-operative documentation | Physician, Nurse, Anesthesiologist | M02, M03, M04 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The obstetrics and gynecology data model extends the platform's standard patient-encounter-centric model with entities for menstrual history records, pregnancy records, prenatal records, contraceptive method records, and obstetric and gynecologic registry membership. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Menstrual history record | Longitudinal record of menstrual history | Patient, age at menarche, typical cycle pattern, last menstrual period, menstrual abnormalities, menopausal status |
| Menstrual cycle entry | Individual menstrual cycle record | Patient, cycle start date, duration, flow, associated symptoms |
| Pregnancy record | Longitudinal record of a pregnancy | Patient, estimated date of delivery, calculation method, gravidity, parity, pregnancy-specific risk factors, outcome |
| Prenatal record entry | Documentation of a single prenatal visit | Patient, pregnancy reference, gestational age, visit findings, screening coordination, assessment, plan |
| Prenatal laboratory result | Prenatal laboratory result linked to the pregnancy | Patient, pregnancy reference, test type, result, gestational age at testing |
| Prenatal ultrasound record | Documentation of a prenatal ultrasound | Patient, pregnancy reference, gestational age, ultrasound type, findings, image references |
| Contraceptive method record | Documentation of a contraceptive method use episode | Patient, method type, method specifics, initiation date, discontinuation date, reason for discontinuation |
| Contraceptive side effect entry | Documentation of a contraceptive side effect | Patient, contraceptive method reference, side effect type, severity, onset, management |
| Gynecologic procedure record | Documentation of a gynecologic procedure | Patient, encounter, procedure type, consent, procedure findings, complications, pathology references |

### 9.3 Entity Relationships

The menstrual history record references the patient and persists independently as a longitudinal record. The menstrual cycle entry references the patient and accumulates over time, forming the menstrual cycle tracking history. The pregnancy record references the patient and persists independently as a longitudinal record throughout pregnancy and the postpartum period; the pregnancy record is updated by prenatal visit entries and is closed at pregnancy outcome documentation. The prenatal record entry references the pregnancy and the encounter; entries accumulate over the pregnancy, forming the prenatal record. The prenatal laboratory result and the prenatal ultrasound record reference the pregnancy and the encounter at which they were obtained. The contraceptive method record references the patient and persists independently as a longitudinal record; the method record is updated by side effect entries and is closed at method discontinuation. The gynecologic procedure record references the patient and the encounter and includes pathology result references where applicable.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Well-woman visit | Outpatient | Comprehensive well-woman examination with cervical cancer screening and contraceptive review |
| Prenatal visit | Outpatient | Prenatal visit at specific gestational age with screening coordination |
| Postpartum visit | Outpatient | Postpartum maternal assessment with contraceptive counseling |
| Contraceptive counseling visit | Outpatient | Contraceptive counseling with method initiation |
| Preconception counseling visit | Outpatient | Preconception assessment and counseling |
| Menopause management visit | Outpatient | Menopausal symptom assessment and management |
| Gynecologic procedure visit | Outpatient | Procedure-focused visit with consent, procedure note, and post-procedure instructions |
| Labor and delivery | Inpatient | Labor management and delivery documentation |
| Pre-operative assessment | Outpatient | Pre-operative assessment for scheduled gynecologic surgery |

### 10.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| Prenatal record summary | Comprehensive prenatal record for patient or transferring facility | M07 Documents |
| Operative report | Surgical procedural report | M07 Documents |
| Delivery note | Labor and delivery documentation | M07 Documents |
| Contraceptive method documentation | Patient-facing contraceptive method documentation | M07 Documents |
| Procedure consent | Procedure-specific consent | M07 Documents |
| Post-operative instructions | Patient-facing post-operative care instructions | M07 Documents |
| Postpartum instructions | Patient-facing postpartum care instructions | M07 Documents |

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Prenatal care quality metrics | Prenatal visit completion, screening completion, gestational age at first visit | Quarterly |
| Pregnancy outcome report | Distribution of pregnancy outcomes, by gestational age and mode of delivery | Quarterly |
| Contraceptive method distribution report | Distribution of contraceptive methods across patient panel | Annually |
| Cervical cancer screening coverage report | Fraction of age-eligible patients up to date on screening | Annually |
| Gynecologic procedure outcomes report | Procedural success, complications, pathology findings | Quarterly |
| Postpartum depression screening report | Screening completion and positive screen follow-up | Quarterly |

### 11.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| Delivery volume report | Deliveries per obstetrician, by mode | Monthly |
| Prenatal visit no-show rate report | Missed prenatal visits | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |
| Labor and delivery staffing report | Staffing levels relative to delivery volume | Monthly |

### 11.3 Regulatory Reports

Regulatory reports include prenatal and newborn screening reporting to regional public health authorities, maternal mortality reporting (where required), and quality reporting to regional health authorities. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 12. Role & Permission Recommendations

### 12.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Obstetrics and Gynecology |
|---|---|---|
| Physician (Obstetrician-Gynecologist) | R01 | Clinical assessment, prenatal care, procedures, surgery, labor and delivery, orders, documentation |
| Midwife | R05 | Prenatal care (low-risk), labor management, delivery (where credentialed), postpartum care |
| Nurse | R02 | Nursing assessment, prenatal visit support, procedure assistance, patient education, postpartum care |
| Ultrasound technician | R04 | Prenatal ultrasound performance, gynecologic ultrasound performance |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Outpatient scheduling, prenatal visit scheduling, surgical scheduling |
| Biller | R08 | Encounter billing, prenatal global billing, procedural billing, delivery billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 12.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, by patient cohort, and by reproductive health confidentiality rules per `PRODUCT_BIBLE.md` Section 21.4. Obstetrics and gynecology facilities typically scope physician and midwife access to the facility level for outpatient encounters and to the patient cohort level for inpatient encounters (labor and delivery). Reproductive health encounter segregation is enforced at the platform layer for encounters that the patient has requested to keep confidential (such as reproductive health visits for adolescent patients or sensitive gynecologic encounters); the segregation is configured per regional legal framework and cannot be overridden. Ultrasound technician access is scoped to the ultrasound studies they perform. Labor and delivery documentation access is scoped to the labor and delivery team.

### 12.3 Custom Role Recommendations

Common custom roles for obstetrics and gynecology include the Midwife role (composed of allied health professional permissions scoped to low-risk prenatal care and labor management), the Ultrasound Technician role (composed of technician permissions scoped to obstetric and gynecologic ultrasound), the Labor and Delivery Nurse role (composed of nurse permissions scoped to labor and delivery encounters), and the Contraceptive Counselor role (composed of nurse or allied health professional permissions scoped to contraceptive counseling and method initiation). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 13. Configuration Defaults

### 13.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Well-woman visit slot duration | 30 minutes | Customer-adjustable |
| Prenatal visit slot duration | 20 minutes | Customer-adjustable |
| Postpartum visit slot duration | 30 minutes | Customer-adjustable |
| Contraceptive counseling visit slot duration | 30 minutes | Customer-adjustable |
| Preconception counseling visit slot duration | 45 minutes | Customer-adjustable |
| Gynecologic procedure visit slot duration | Variable by procedure | Customer-configurable |
| Prenatal visit schedule | Regional prenatal care schedule | Configured through Localization module (M19) |

### 13.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Well-woman visit | Customer-adjustable |
| Prenatal screening schedule | Regional prenatal screening schedule | Configured through Localization module (M19) |
| Cervical cancer screening schedule | Regional cervical cancer screening guideline | Configured through Localization module (M19) |
| Gestational age calculation method | Last menstrual period with first-trimester ultrasound confirmation | Customer-adjustable |
| Reproductive health encounter segregation | Per regional legal framework | Configured through Localization module (M19) |

### 13.3 Procedural Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Procedure consent capture | Required before procedure start | Non-overridable |
| Surgical consent capture | Surgical-specific consent required | Non-overridable |
| Reproductive health procedure consent | Reproductive health-specific consent required | Non-overridable per regional regulation |

---

## 14. Onboarding Checklist

### 14.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that obstetrics and gynecology (C05) is the primary clinic type for the facility.
2. Activate the obstetrics and gynecology overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2; for hospital obstetrics and gynecology departments, enable all modules per the Enterprise edition.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, prenatal screening schedule, and reproductive health confidentiality rules.
5. Configure menstrual history records: Verify structured menstrual history template; configure abnormal uterine bleeding assessment tools; configure menopause management documentation.
6. Configure pregnancy tracking: Verify pregnancy record structure; configure gestational age calculation; configure prenatal visit scheduling per the regional prenatal care schedule; configure prenatal screening coordination.
7. Configure prenatal records: Verify prenatal visit documentation template; configure prenatal laboratory result integration; configure prenatal ultrasound documentation; configure pregnancy risk assessment.
8. Configure contraception management: Verify contraceptive method documentation template; configure method initiation workflows; configure side effect monitoring; configure contraceptive method distribution reporting.
9. Configure reproductive health confidentiality: Configure reproductive health encounter segregation per the regional legal framework; verify segregation enforcement across all surfaces.
10. Configure encounter templates: Review the default encounter templates listed in Section 10.1; refine templates to match the facility's documentation standards.
11. Configure role set and permissions: Provision the roles listed in Section 12.1; configure permission scope by facility, care team, patient cohort, and reproductive health confidentiality.
12. Configure integrations: Configure ultrasound equipment integration, hospital integration (for labor and delivery), newborn record integration, and laboratory integration; validate integration data flow in the configuration sandbox.
13. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians and midwives.
14. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 15. Sample Use Cases

### 15.1 Use Case — First Prenatal Visit

A 32-year-old patient presents for her first prenatal visit at 8 weeks gestation, referred by her primary care physician after a positive home pregnancy test. The pregnancy record is created in the Patient module (M01); the estimated date of delivery is calculated from the last menstrual period and is confirmed by first-trimester ultrasound. The gravidity and parity are documented; the pregnancy-specific risk factors are assessed; the patient is stratified as low risk. The initial prenatal panel is ordered through the Orders & Results module (M04); aneuploidy screening is scheduled at the appropriate gestational age; the prenatal visit schedule is generated by the Scheduling module (M06). The first prenatal visit is documented using the prenatal visit template; the patient receives prenatal care education and is scheduled for the next prenatal visit at 12 weeks.

### 15.2 Use Case — Contraceptive Counseling and Intrauterine Device Insertion

A 28-year-old patient presents for contraceptive counseling after the birth of her second child 6 months ago. The patient has completed her postpartum visit and is considering contraception options. The obstetrician-gynecologist conducts the contraceptive counseling visit using the contraceptive counseling visit template; the method options are discussed, contraindications are screened, and the patient chooses a hormonal intrauterine device. The intrauterine device insertion is scheduled; at the insertion visit, the procedural consent is documented, the procedure is performed, and the post-procedure documentation is completed through the gynecologic procedure record. The contraceptive method record is created in the patient's record with the method type, method specifics (hormonal intrauterine device, manufacturer, lot number, insertion date, planned removal date), and the method status is set to active. A follow-up visit is scheduled to confirm intrauterine device position and to assess side effects.

### 15.3 Use Case — Abnormal Cervical Screening and Colposcopy

A 35-year-old patient's routine cervical cancer screening returns with high-risk human papillomavirus positivity. The result is received through the Orders & Results module (M04); the Notifications module (M08) alerts the obstetrician-gynecologist. The patient is scheduled for colposcopy; at the colposcopy visit, the procedural consent is documented, the colposcopy is performed, and biopsy specimens are obtained from areas of abnormal appearance. The biopsy specimens are sent to pathology through the Integration module (M17); the gynecologic procedure record is documented. The pathology result returns 5 days later with a diagnosis of cervical intraepithelial neoplasia grade 2; the result is linked to the procedure record. The obstetrician-gynecologist discusses the result with the patient and recommends LEEP; the LEEP is scheduled and performed; the LEEP procedural record is documented; the pathology result confirms clear margins.

### 15.4 Use Case — Labor and Delivery Management

A 29-year-old patient at 39 weeks gestation presents to the labor and delivery unit in active labor. The labor and delivery admission is documented; the patient's prenatal record is reviewed for pregnancy risk factors, laboratory results, and prenatal ultrasound findings. The labor progress is documented at regular intervals through the labor and delivery template; the fetal heart rate is monitored continuously. The patient progresses to full dilation and delivers a healthy infant vaginally under the care of the obstetrician and the labor and delivery nurse. The delivery note is documented through the Documents module (M07); the pregnancy outcome is documented in the pregnancy record; the postpartum instructions are generated and delivered to the patient. The patient is scheduled for a postpartum visit at 6 weeks; the newborn record is initiated through the Integration module (M17) (where hospital-newborn record integration is configured).

### 15.5 Use Case — Gynecologic Surgery (Hysterectomy)

A 48-year-old patient with symptomatic uterine fibroids that have not responded to medical management is scheduled for total abdominal hysterectomy. The pre-operative assessment is documented through the pre-operative assessment template, including consent, pre-operative laboratory results, and anesthesia consultation. The surgery is performed under general anesthesia; the operative report is documented through the operative report template, including the procedure details, findings, complications, and specimen handling. The specimen is sent to pathology; the pathology result confirms benign uterine leiomyomas. The post-operative documentation is completed; post-operative instructions are generated through the Documents module (M07). At the post-operative follow-up visit, the obstetrician-gynecologist assesses healing, reviews the pathology result with the patient, and updates the contraceptive method record (the patient no longer requires contraception).

### 15.6 Use Case — Menopause Management

A 52-year-old patient presents with irregular menstrual cycles, hot flashes, and sleep disturbance consistent with perimenopause. The menstrual history record is updated to document the perimenopausal transition; the menopause management documentation captures the symptom profile and severity. The obstetrician-gynecologist discusses management options with the patient, including lifestyle measures and menopausal hormone therapy; the patient chooses menopausal hormone therapy after a thorough discussion of risks and benefits. The menopausal hormone therapy is prescribed through the Pharmacy module (M05); the menopause management documentation is updated with the regimen. The patient is scheduled for a follow-up visit at 3 months to assess symptom response and to monitor for adverse effects; the longitudinal menopause management view presents the symptom trajectory and the regimen history.

---

## 16. Best Practices

### 16.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; prenatal screening schedules and reproductive health confidentiality rules vary by region.
2. Validate reproductive health encounter segregation carefully; segregation is a regulatory requirement and must be enforced across all surfaces.
3. Configure the prenatal visit schedule per the regional prenatal care standard; schedule mismatches produce incorrect visit recall and may compromise prenatal care quality.
4. Use the configuration sandbox for all changes to prenatal screening schedules, reproductive health confidentiality rules, and procedural consent templates; these changes have direct patient safety and regulatory compliance implications.
5. Maintain the contraceptive method vocabulary through the Localization module (M19); vocabulary consistency supports method distribution reporting and cross-facility analysis.

### 16.2 Operational Best Practices

6. Maintain complete prenatal records across all prenatal visits; continuity of prenatal care depends on the longitudinal record, particularly when care is shared across providers.
7. Use the contraceptive method distribution report annually to assess method mix and to identify disparities in method access; the report supports quality improvement and equity initiatives.
8. Conduct cervical cancer screening at the regional guideline interval, not at every visit; over-screening increases false positives and unnecessary procedures without improving outcomes.
9. Use the pregnancy risk assessment at every prenatal visit; risk stratification may change over the course of pregnancy, and the change should drive care plan adjustments.
10. Maintain accurate pregnancy outcome documentation; the outcome documentation supports the calculation of gravidity and parity for future pregnancies and supports quality reporting.

### 16.3 Governance Best Practices

11. Conduct a quarterly prenatal care quality review with the clinical lead; this review validates prenatal visit completion, screening completion, and pregnancy outcomes.
12. Conduct an annual reproductive health confidentiality audit; this audit validates that reproductive health encounter segregation is enforced correctly across all surfaces.
13. Conduct a monthly labor and delivery staffing review; the review validates that staffing levels are appropriate for delivery volume and supports patient safety in the labor and delivery unit.

---

## 17. Related Documents

### 17.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C05 Obstetrics and Gynecology; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 26 governs integration philosophy |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.4 covers surgical specialty single-specialty facilities including obstetrics and gynecology; Section 6 documents module recommendations |

### 17.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 12 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 12.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Pediatrics | `docs/06_CLINIC_TYPES/PEDIATRICS.md` | Related specialty for newborn care coordination |
| Internal Medicine | `docs/06_CLINIC_TYPES/INTERNAL_MEDICINE.md` | Related specialty for chronic disease management in women |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council, with off-cycle review when regional prenatal screening guidance or reproductive health confidentiality regulations change. Changes — including overlay revisions, prenatal screening schedule updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
