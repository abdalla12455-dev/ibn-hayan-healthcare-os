# Ibn Hayan Healthcare Operating System
## Urology Clinics

| Field | Value |
|---|---|
| Document Title | Urology Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the urology configuration overlay is amended or when regional procedural or implant-tracking regulations change |
| Audience | Clinical informatics leads, implementation consultants, customer success teams, configuration architects, urologists, urology nurses, ambulatory surgery administrators, compliance officers evaluating Ibn Hayan for urology practice |
| Scope | Urology clinic type (C17) configuration overlay, recommended module composition, specialty-specific capabilities (uroflowmetry records, prostate assessment, stone management, urodynamic studies, cystoscopy, vasectomy, prostate biopsy, erectile dysfunction assessment, continence assessment), specialty workflows, conceptual data entities, forms and templates, reports and analytics, integrations, role and permission defaults, configuration defaults, onboarding checklist, sample use cases, best practices |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks, database schemas, API endpoint specifications, UI component catalogues, vendor-specific device contracts, country-specific legal interpretation of procedural consent law |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the urology entry in the clinic type catalogue and does not override the catalogue entry or the platform-level principles. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Uroflowmetry Records
5. Prostate Assessment
6. Stone Management
7. Urodynamic Studies
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

### 1.1 Specialty Definition

Urology is the surgical and medical specialty concerned with the urinary tract in both men and women and with the male reproductive system. Urologists diagnose and treat conditions of the kidneys, ureters, bladder, urethra, and male genital organs, spanning oncology (prostate, bladder, kidney, testicular cancer), stone disease, voiding dysfunction, infertility, erectile dysfunction, benign prostatic hyperplasia, and paediatric urological conditions. The scope of practice combines outpatient medical management with inpatient and day-surgery procedural intervention, including endoscopic, laparoscopic, and open surgical procedures. In Ibn Hayan, urology is catalogued as clinic type C17 within the surgical specialty family, per Section 18.2 of `PRODUCT_BIBLE.md` and Section 3.4 of `CLINIC_TYPES.md`.

The dual medical-and-surgical nature of urology is reflected in the clinic type overlay, which provides both medical documentation templates (for conditions managed pharmacologically or through surveillance) and procedural documentation templates (for cystoscopy, vasectomy, prostate biopsy, lithotripsy, and surgical interventions). The overlay is the configuration artefact that adjusts Ibn Hayan's platform-default behaviour to match urological practice; it is applied at the clinic-type configuration layer described in Section 12.3 of `SYSTEM_ARCHITECTURE.md`, between the care-team and user layers.

### 1.2 Patient Population and Clinical Activities

The urology patient population spans all ages and both sexes, although the distribution skews older given the prevalence of benign prostatic hyperplasia, prostate cancer, and urinary incontinence in older adults. Paediatric urology addresses congenital anomalies (hypospadias, cryptorchidism, vesicoureteral reflux) and is typically subspecialised. Adult urology addresses the broad scope of conditions noted above; the overlay accommodates this breadth through encounter templates that adjust to the presenting concern and the planned clinical activity.

Key clinical activities in urology include diagnostic evaluation (history, physical examination, urinalysis, imaging), functional assessment (uroflowmetry, urodynamic studies, symptom scoring), procedural intervention (cystoscopy, biopsy, lithotripsy, vasectomy, transurethral resection, laparoscopic and robotic surgery), oncological surveillance (prostate cancer active surveillance, bladder cancer surveillance cystoscopy), and chronic disease management (chronic prostatitis, interstitial cystitis, erectile dysfunction, lower urinary tract symptoms). Each of these activities is supported by configuration in the urology overlay, with documentation templates, order sets, and workflow definitions tuned to the activity.

### 1.3 Why Urology Requires Specialized Configuration

Urology presents configuration considerations that distinguish it from general medical or general surgical practice. Functional assessment is integral to urology in a way that it is not for most surgical specialties: uroflowmetry and urodynamic studies produce quantitative data that must be captured, plotted, and compared across encounters, and the configuration must support this quantitative data flow. Symptom scoring is similarly integral, with validated instruments (IPSS, IIEF, ICIQ) used to assess severity and treatment response; the configuration must support these instruments as structured fields, not as free text.

Procedural documentation in urology is diverse, ranging from office-based procedures (vasectomy, prostate biopsy) through endoscopic procedures (cystoscopy, ureteroscopy, transurethral resection) to major surgical procedures (radical prostatectomy, cystectomy, nephrectomy). Each procedural category requires distinct documentation templates, consent management, and post-procedure follow-up. The overlay provides these templates as a coherent set, with the customer able to refine through the configuration surface per Section 5.4 of `CLINIC_TYPES.md`.

### 1.4 Relationship to Other Clinic Types

Urology operates in relationship to several other clinic types. Within the surgical specialty family, urology shares configuration themes with obstetrics and gynaecology (C05), ophthalmology (C12), orthopaedics (C13), and otolaryngology (C14): procedural documentation, consent management, perioperative workflows. Urology also coordinates with nephrology (not in the catalogue but addressed through internal medicine C03 with renal subspecialisation), oncology (C11) for urological cancers, and emergency care (C18, C19) for acute presentations such as testicular torsion, renal colic, and urinary retention. The overlay includes integration surfaces that support this coordination without requiring operational coupling between clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes and Ownership

Urology is practised across a range of facility sizes, from solo practitioner offices through single-specialty group practices, multi-specialty group practices with a urology service line, and hospital-based urology departments. The recommended editions for urology in Section 2.1 of `CLINIC_TYPES.md` are Professional (E2) and Enterprise (E3), reflecting the typical mid-sized facility with procedural capability and the need for the configuration depth that the Professional edition provides. Smaller office-based urology practices may operate at the Professional edition; hospital-based departments and large group practices with day-surgery facilities operate at the Enterprise edition.

Ownership patterns in urology include private practice (individual or group), hospital-employed physician groups, academic medical centres with urology residency programmes, and government-operated health services. The clinic type overlay is ownership-agnostic; it provides the configuration surface that any ownership model requires, with ownership-specific concerns (such as billing rules, regulatory reporting, and contractual obligations) configured at the facility or customer layer per the configuration layer model in Section 15.3 of `SYSTEM_ARCHITECTURE.md`.

### 2.2 Geographic and Regulatory Considerations

Urology is practised in every region Ibn Hayan serves, and the regulatory environment for procedural care varies across regions. The overlay accommodates this variation through the platform's localization module (M19), with regional configuration packs that adapt procedural consent forms, implant tracking requirements (for penile implants, artificial urinary sphincters, and prostate brachytherapy seeds), controlled substance reporting (for post-operative pain management), and regulatory reporting for urological cancer registries where applicable. The configuration packs are versioned alongside the platform's regional regulatory framework and are updated when regional regulations change.

Geographic considerations also include rural and remote practice, where a urologist may serve a region through a combination of outreach clinics and central procedural facilities. The urology overlay supports outreach clinic encounters through the encounter template configuration, with the encounter documented at the outreach location and the procedural follow-up coordinated at the central facility. Telehealth follow-up for stable post-operative patients is supported through the telehealth encounter template, with documentation rigour equivalent to in-person follow-up.

### 2.3 Regulatory Exposure

The regulatory exposure for urology is rated medium in Section 2.1 of `CLINIC_TYPES.md`, reflecting procedural consent requirements, implant tracking requirements, and cancer registry reporting. The overlay addresses each regulatory dimension through configuration: procedural consent is documented through structured consent forms configured per regional regulatory framework; implant tracking is supported through the inventory module (M07) with implant records linked to the patient and the procedure; cancer registry reporting is supported through the reporting module (M18) with case identification and submission through the integration module (M17).

Procedural documentation is subject to additional audit and retention requirements in most jurisdictions. The documentation is retained for the period required by regional law, with retention enforced at the platform layer and not customer-modifiable. Access to procedural documentation is logged in the audit trail per Principle P13 (Auditability as Primitive) stated in Section 4.13 of `SYSTEM_ARCHITECTURE.md`.

### 2.4 Customer Maturity Profile

Urology customers vary in maturity. Established practices with mature electronic health record use configure Ibn Hayan to match their existing operational patterns; transitioning customers from paper-based or basic electronic systems require more onboarding support. The onboarding workflow in Section 9 of `CLINIC_TYPES.md` scales stage duration and complexity to the customer's maturity profile and the overlay's medium configuration complexity.

---

## 3. Recommended Modules

### 3.1 Core Module Composition

The recommended module composition for urology follows the surgical specialty family pattern stated in Section 6.2 of `CLINIC_TYPES.md`. The table below summarizes the recommended modules; module codes are defined in Section 19.2 of `PRODUCT_BIBLE.md`.

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Core | Patient registration, demographics, procedural consent |
| Encounter | M02 | Core | Outpatient encounters, procedural encounters, telehealth follow-up |
| Clinical Documentation | M03 | Core | Urology-specific documentation templates, structured assessment instruments |
| Orders & Results | M04 | Core | Laboratory orders, imaging orders, pathology orders |
| Pharmacy | M05 | Core | Medication management, post-operative pain management, hormonal therapy |
| Scheduling | M06 | Core | Outpatient appointments, procedural scheduling, OR scheduling |
| Documents | M07 | Core | Consent documents, procedural documentation, implant records |
| Notifications | M08 | Core | Appointment reminders, post-operative follow-up reminders, lab result notifications |
| Billing | M09 | Core | Procedural billing, office visit billing, insurance claim submission |
| Accounting | M10 | Optional | General ledger for private practices with their own accounting |
| CRM | M11 | Optional | Patient outreach, recall for surveillance (e.g., bladder cancer surveillance) |
| HR | M12 | Optional | Employee management for practices with administrative and clinical staff |
| Workforce | M13 | Optional | Scheduling of clinical staff, credentialing, OR block management |
| Identity & Access | M14 | Core | Authentication, role-based access |
| Configuration | M15 | Core | Configuration surface for overlay refinement |
| Audit | M16 | Core | Audit trail for procedural and clinical actions |
| Integration | M17 | Optional | Integration with uroflowmetry devices, urodynamic study equipment, PACS, pathology laboratories |
| Reporting | M18 | Core | Clinical outcomes reporting, procedural volume reporting, cancer registry reporting |
| Localization | M19 | Core | Regional regulatory framework, language adaptation |

### 3.2 Module Activation Considerations

The core module set is recommended for every urology deployment; the optional modules are added based on the customer's operational reality. A solo urologist may decline M10 (Accounting) and M11 (CRM); a mid-sized group practice typically adds both; a hospital-based urology department typically operates within the hospital's broader module set, which includes all 19 modules. Module enablement is governed by the dependency rules in Section 9.4 of `SYSTEM_ARCHITECTURE.md`.

The integration module (M17) is particularly relevant for urology given the specialty's reliance on equipment that produces quantitative data: uroflowmetry devices, urodynamic study equipment, ultrasound devices, and lithotripters. The integration module provides the framework for connecting this equipment to Ibn Hayan, with the actual integration performed through anticorruption layer connectors described in Section 7.3 of `SYSTEM_ARCHITECTURE.md`. The customer's system administrator configures the integration through the configuration surface; the integration does not require source-level modification.

### 3.3 Edition Packaging

The recommended editions for urology are Professional (E2) for office-based practice and Enterprise (E3) for practices with day-surgery capability or for hospital-based departments, per Section 2.1 of `CLINIC_TYPES.md`. The Professional edition provides the configuration depth, multi-user support, and procedural documentation capabilities that urology requires; the Enterprise edition adds multi-facility operation, advanced integration, and dedicated support for the more complex operational reality of day-surgery and hospital-based practice. Edition packaging is governed by Section 16 of `PRODUCT_BIBLE.md`.

---

## 4. Uroflowmetry Records

### 4.1 Uroflowmetry Record Structure

Uroflowmetry is the non-invasive measurement of urine flow rate during voiding, producing a flow curve that the urologist interprets to assess bladder outlet obstruction and detrusor contractility. The Ibn Hayan urology overlay ships a uroflowmetry record template that captures the standard parameters: maximum flow rate (Qmax), average flow rate (Qave), voided volume, flow time, time to Qmax, and the flow curve itself. The flow curve is recorded as a series of time-flow data points that the platform renders as a graphical plot; the plot is presented alongside the structured parameters for the urologist's interpretation.

The uroflowmetry record is configured through the clinical documentation module (M03) and is associated with the encounter in which it was performed. The record is also associated with the patient's longitudinal urology record, allowing comparison across encounters. The structured parameters are queryable through the reporting module (M18), supporting longitudinal analysis of flow rate changes in response to treatment (e.g., alpha-blocker therapy for benign prostatic hyperplasia).

### 4.2 Device Integration

Uroflowmetry devices produce electronic output that can be captured by Ibn Hayan through the integration module (M17). The integration is configured through the integration module's standard configuration surface, with the device's output format mapped to the uroflowmetry record's structured fields. The integration is performed through an anticorruption layer connector that translates the device's proprietary output format into the platform's standard data model; the connector is configured, not coded, and is versioned alongside the integration module.

Device integration is not mandatory; uroflowmetry records may be created manually with the urologist entering the structured parameters and uploading the flow curve as an image. Manual entry is appropriate for practices without integrated devices or for retrospective documentation. Integrated device entry is preferred for accuracy and to reduce documentation burden, but both modes are supported by the overlay.

### 4.3 Longitudinal Comparison

Uroflowmetry is most valuable when compared across encounters, allowing the urologist to assess changes in flow rate over time and in response to treatment. The Ibn Hayan urology overlay supports longitudinal comparison through the reporting module (M18), with a longitudinal uroflowmetry view that presents the structured parameters and flow curves from each encounter in a single display. The view supports clinical decision-making by surfacing trends that may not be apparent in individual encounter documentation.

Longitudinal comparison is particularly valuable for benign prostatic hyperplasia management, where Qmax is one of several parameters used to assess response to medical therapy or to evaluate the need for surgical intervention. The longitudinal view is configured to present Qmax alongside IPSS scores and post-void residual urine volume, providing a comprehensive assessment of bladder outlet obstruction. The view is read-only and is generated from the structured field values recorded during each encounter; it is not a separate data entry surface.

### 4.4 Interpretation Documentation

The uroflowmetry record includes a structured interpretation field where the urologist documents the interpretation of the flow curve and the structured parameters. The interpretation is a required field; the uroflowmetry record cannot be closed without an interpretation, ensuring that the record is not just data but a clinical assessment. The interpretation is configured through the clinical documentation module's structured field capability, with the field supporting both structured categories (normal, obstructed, equivocal) and free text.

Interpretation documentation is auditable; the interpretation is associated with the urologist who performed the interpretation, with the time of interpretation recorded. The interpretation is versioned; corrections are recorded as new versions with the original retained for audit. Access to uroflowmetry records is governed by the standard permission framework; access is logged in the audit trail.

---

## 5. Prostate Assessment

### 5.1 IPSS Symptom Scoring

The International Prostate Symptom Score (IPSS) is the validated instrument for assessing lower urinary tract symptoms in men, based on seven symptom questions and one quality-of-life question. The Ibn Hayan urology overlay ships the IPSS as a structured assessment instrument configured through the clinical documentation module (M03). The instrument is presented to the patient at check-in through the patient portal or to the medical assistant at rooming, with the responses captured as structured values and the total score calculated automatically.

The IPSS is encounter-type-aware: the instrument is presented at initial evaluation, at follow-up encounters for lower urinary tract symptoms, and at surveillance encounters for benign prostatic hyperplasia. The instrument is not presented at encounters unrelated to lower urinary tract symptoms (e.g., erectile dysfunction consultation), unless the urologist specifically requests it. The presentation rules are configured through the configuration surface and may be refined by the customer.

### 5.2 PSA Tracking

Prostate-specific antigen (PSA) is the laboratory marker used for prostate cancer screening, diagnosis, and surveillance. The Ibn Hayan urology overlay supports PSA tracking through the orders and results module (M04), with PSA results captured as structured laboratory results and presented in the patient's longitudinal urology record. The longitudinal PSA view presents PSA values over time alongside reference ranges, with the view supporting the urologist's assessment of PSA trends (PSA velocity, PSA doubling time) that are critical for prostate cancer surveillance.

PSA tracking is integrated with prostate biopsy documentation: when a prostate biopsy is performed, the biopsy result is linked to the PSA value that prompted the biopsy, supporting the diagnostic pathway from screening to biopsy to diagnosis. The integration is configured through the clinical documentation module's standard configuration surface, with the linkage recorded in the audit trail. The integration supports clinical decision-making and quality improvement by surfacing the diagnostic pathway for review.

### 5.3 Digital Rectal Examination Documentation

Digital rectal examination (DRE) is the physical examination component of prostate assessment. The Ibn Hayan urology overlay ships a DRE documentation template that captures the standard findings: prostate size (estimated volume), consistency (smooth, nodular, firm), symmetry, tenderness, and the presence of any palpable abnormalities. The template is configured through the clinical documentation module and is presented as a structured section within the urology encounter documentation.

DRE documentation is associated with the encounter in which it was performed and with the patient's longitudinal urology record. The structured findings are queryable through the reporting module, supporting longitudinal analysis of prostate changes over time. The documentation is subject to the standard validation rules: required fields must be completed before the encounter can be closed, with the required fields configured per encounter type.

### 5.4 Prostate Cancer Risk Assessment

Prostate cancer risk assessment integrates PSA, DRE, and prostate biopsy findings into a structured risk assessment that guides treatment decisions. The Ibn Hayan urology overlay ships a prostate cancer risk assessment template based on established frameworks (CAP, NCCN risk stratification), with structured fields for PSA, Gleason score, clinical stage, and number of positive biopsy cores. The assessment produces a risk category (low, favourable intermediate, unfavourable intermediate, high, very high) that drives recommended treatment options, with the recommendations presented to the urologist as clinical decision support.

The risk assessment is documented at the time of prostate cancer diagnosis and is updated as new information becomes available (e.g., repeat biopsy, imaging). The assessment is associated with the patient's longitudinal oncology record, supporting coordination with oncology (C11) where collaborative management is required. The integration is configured through the clinical documentation module's standard configuration surface, with the integration respecting the boundaries between clinic types described in Section 4.7 of `CLINIC_TYPES.md`.

---

## 6. Stone Management

### 6.1 Stone Episode Documentation

Stone disease is a recurrent condition that presents as discrete episodes of acute colic, often requiring acute care intervention followed by elective definitive management. The Ibn Hayan urology overlay ships a stone episode documentation template that captures the standard elements: presentation (renal colic, haematuria, incidental finding), imaging findings (stone location, stone size, stone density where measured), acute management (analgesia, medical expulsion therapy, stent placement), and disposition (spontaneous passage, planned intervention, referral for intervention).

The stone episode is associated with the patient's longitudinal stone record, allowing the urologist to assess the patient's stone history (number of episodes, locations, interventions) and to plan metabolic evaluation for recurrent stone formers. The longitudinal stone record is presented in a longitudinal view configured through the reporting module (M18), with the view supporting the urologist's assessment of recurrence patterns and the appropriateness of metabolic evaluation.

### 6.2 Stone Intervention Documentation

Stone intervention includes extracorporeal shock wave lithotripsy (ESWL), ureteroscopy with laser lithotripsy, and percutaneous nephrolithotomy (PCNL). The Ibn Hayan urology overlay ships procedural documentation templates for each intervention, with structured fields for the procedural approach, the equipment used, the operative findings, the stone characteristics (size, location, composition where known), the intervention performed, and the post-procedure disposition. The templates are configured through the clinical documentation module and are versioned alongside the overlay.

Procedural documentation is integrated with the operating room scheduling capability of the scheduling module (M06), with the procedural encounter created from the scheduled procedure and the procedural documentation template applied based on the procedure type. The integration is configured through the scheduling module's standard configuration surface, with the integration respecting the boundaries between the scheduling and clinical documentation modules described in Section 13 of `SYSTEM_ARCHITECTURE.md`.

### 6.3 Stone Composition Tracking

Stone composition analysis is performed on stones recovered through intervention or spontaneous passage, with the analysis informing metabolic evaluation and recurrence prevention. The Ibn Hayan urology overlay supports stone composition tracking through the orders and results module (M04), with the stone composition result captured as a structured laboratory result and presented in the patient's longitudinal stone record. The result is associated with the stone episode that produced the stone, supporting the diagnostic pathway from presentation to intervention to composition analysis.

Stone composition tracking is integrated with metabolic evaluation: when the stone composition indicates a metabolic abnormality (e.g., cystine stones, struvite stones), the metabolic evaluation order set is suggested as clinical decision support. The integration is configured through the clinical documentation module's clinical decision support surface, with the suggestions presented to the urologist as advisory information that the urologist may accept, defer, or decline with documented rationale.

### 6.4 Metabolic Evaluation and Recurrence Prevention

Metabolic evaluation is the comprehensive assessment of recurrent stone formers to identify underlying metabolic abnormalities (hypercalciuria, hyperuricosuria, hyperoxaluria, hypocitraturia). The Ibn Hayan urology overlay ships a metabolic evaluation order set that includes the standard laboratory tests (24-hour urine collection for calcium, uric acid, oxalate, citrate, sodium, volume; serum calcium, parathyroid hormone, uric acid) and the standard clinical assessment (dietary history, fluid intake assessment, family history). The order set is configured through the orders and results module's standard configuration surface.

Metabolic evaluation results are integrated with recurrence prevention planning: when the evaluation identifies a metabolic abnormality, the corresponding prevention plan (dietary modification, medication, increased fluid intake) is suggested as clinical decision support. The prevention plan is documented in the patient's treatment plan, with the plan reviewed at configured intervals to assess adherence and effectiveness. The integration is configured through the clinical documentation module's standard configuration surface.

---

## 7. Urodynamic Studies

### 7.1 Urodynamic Study Record Structure

Urodynamic studies are the invasive functional assessment of bladder and urethral function, comprising uroflowmetry, cystometry, pressure-flow studies, and electromyography. The Ibn Hayan urology overlay ships a urodynamic study record template that captures the standard parameters: first sensation of filling, first desire to void, strong desire to void, bladder capacity, compliance, detrusor pressure at Qmax, maximum flow rate, post-void residual, and the presence of detrusor overactivity or stress incontinence. The study tracings (cystometrogram, pressure-flow plot, electromyography) are recorded as graphical outputs that the platform renders alongside the structured parameters.

The urodynamic study record is configured through the clinical documentation module (M03) and is associated with the encounter in which it was performed. The record is also associated with the patient's longitudinal urology record, allowing comparison across encounters. The structured parameters are queryable through the reporting module (M18), supporting longitudinal analysis of bladder function changes in response to treatment (e.g., neuromodulation, medication, surgery).

### 7.2 Equipment Integration

Urodynamic study equipment produces electronic output that can be captured by Ibn Hayan through the integration module (M17). The integration is configured through the integration module's standard configuration surface, with the equipment's output format mapped to the urodynamic study record's structured fields and graphical outputs. The integration is performed through an anticorruption layer connector that translates the equipment's proprietary output format into the platform's standard data model; the connector is configured, not coded.

Equipment integration is particularly valuable for urodynamic studies given the volume and complexity of the data produced. Manual entry of urodynamic study parameters is feasible but is more prone to error and is not the recommended approach for practices with integrated equipment. The overlay supports both modes, with the customer selecting the mode based on the equipment available and the practice's operational reality.

### 7.3 Study Interpretation Documentation

The urodynamic study record includes a structured interpretation field where the urologist documents the interpretation of the study findings. The interpretation is a required field; the record cannot be closed without an interpretation. The interpretation is configured through the clinical documentation module's structured field capability, with the field supporting both structured categories (normal, obstructed, detrusor overactivity, stress incontinence, mixed) and free text.

Interpretation documentation is auditable; the interpretation is associated with the urologist who performed the interpretation, with the time of interpretation recorded. The interpretation is versioned; corrections are recorded as new versions with the original retained for audit. The interpretation is also the basis for treatment planning: when the interpretation identifies a specific abnormality, the corresponding treatment plan element is suggested as clinical decision support.

### 7.4 Urodynamic Study Indications

Urodynamic studies are indicated for specific clinical scenarios: complex lower urinary tract symptoms, neurogenic bladder, persistent incontinence after initial treatment, and pre-operative assessment for certain surgical interventions. The Ibn Hayan urology overlay ships a clinical decision support rule that suggests urodynamic study ordering based on the patient's clinical presentation, with the rule configured through the clinical documentation module's clinical decision support surface. The suggestion is advisory; the urologist may order the study, defer with documented rationale, or decline with documented rationale.

The clinical decision support rule is reviewed when the overlay is revised and is updated to reflect evolving clinical guidelines. The rule is configured, not coded; the customer may refine the rule through the configuration surface, with refinements recorded in the audit trail. The rule cannot be disabled below the regional regulatory minimum, which is enforced at the platform layer where regional regulation specifies required studies for specific procedures.

---

## 8. Specialty Workflows

### 8.1 Workflow Inventory

The Ibn Hayan urology overlay ships a default set of workflows tuned to urological practice. The workflows are defined declaratively through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md` Section 2.

| Workflow | Code | Trigger | Key Steps | Outcome |
|---|---|---|---|---|
| Initial urology evaluation | UW1 | Scheduled appointment | Patient check-in, IPSS administration, rooming, urologist evaluation, diagnostic plan, follow-up scheduling | Evaluation documented; diagnostic plan created |
| Prostate biopsy | UW2 | Scheduled procedure | Patient preparation, consent, transrectal ultrasound, biopsy, post-procedure monitoring, discharge instructions | Procedure documented; pathology ordered |
| Cystoscopy | UW3 | Scheduled procedure | Patient preparation, consent, cystoscope insertion, bladder inspection, intervention if indicated, post-procedure monitoring | Procedure documented; findings recorded |
| Vasectomy | UW4 | Scheduled procedure | Patient preparation, consent, procedure, post-procedure monitoring, discharge instructions, semen analysis scheduling | Procedure documented; semen analysis ordered |
| Stone episode management | UW5 | Patient presentation | Acute assessment, imaging, pain management, disposition (medical expulsion, intervention, admission) | Episode documented; disposition plan created |
| Surveillance cystoscopy | UW6 | Scheduled surveillance | Patient check-in, cystoscopy, findings documentation, next surveillance scheduling | Surveillance documented; next surveillance scheduled |
| Post-operative follow-up | UW7 | Scheduled follow-up | Wound assessment, symptom review, complication assessment, treatment plan adjustment | Follow-up documented; plan updated |
| PSA surveillance | UW8 | Scheduled surveillance | Laboratory order, result review, trend assessment, disposition (continue surveillance, biopsy, treatment) | Surveillance documented; disposition plan created |

### 8.2 Workflow Customization

Workflows may be customized through the workflow engine's configuration surface, subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The customization posture is a direct consequence of Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md`.

Customization examples include adding regional procedural consent forms to the biopsy and vasectomy workflows, adjusting the surveillance cystoscopy interval based on the patient population's risk profile, and adding customer-specific post-operative pain management protocols to the post-operative follow-up workflow. Each customization is applied as a facility-level or department-level override, with the underlying platform-provided workflow retained unchanged.

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The data entities referenced by the urology clinic type overlay are conceptual; this section describes the entities by name and relationship, not by implementation. Database schemas, persistence models, and data access patterns are out of scope for this document per the metadata table above and are addressed in module-specific documentation.

The urology overlay references the following conceptual entities: Patient, Encounter, Clinical Documentation Record, Uroflowmetry Record, Urodynamic Study Record, IPSS Assessment Record, PSA Result, Prostate Biopsy Record, Stone Episode Record, Stone Composition Result, Procedural Documentation Record, Implant Record, Treatment Plan, Medication Order, Laboratory Order, Laboratory Result, Imaging Order, Imaging Result, Consent Record, and Pathology Result. Each entity is owned by a bounded context defined in Section 7 of `SYSTEM_ARCHITECTURE.md`; the urology overlay composes these entities into urology-specific workflows and documentation structures.

### 9.2 Entity Relationships

The Patient entity is the central reference: every other entity is associated with a Patient. The Encounter entity is associated with a Patient and with one or more Clinical Documentation Records, each of which may be a urology encounter note, a procedural documentation record, or a structured assessment record (IPSS, uroflowmetry, urodynamic study). The Stone Episode entity is associated with a Patient and may span multiple Encounters (acute presentation encounter, intervention encounter, follow-up encounter), with each Encounter contributing documentation to the Stone Episode record.

The Prostate Biopsy Record is associated with an Encounter and with the Pathology Result, with the linkage supporting the diagnostic pathway from biopsy to pathology to diagnosis. The Uroflowmetry Record and Urodynamic Study Record are associated with an Encounter and with the patient's longitudinal urology record, supporting longitudinal comparison. The Implant Record is associated with a Patient and with the Procedural Documentation Record for the procedure in which the implant was placed; the implant record is the basis for implant tracking and post-market surveillance reporting where required by regional regulation.

### 9.3 Longitudinal Records

Several urology entities are longitudinal rather than encounter-bound: the patient's stone history, the patient's PSA history, the patient's uroflowmetry history, and the patient's urodynamic study history. These longitudinal records are constructed from the encounter-bound records through the reporting module's longitudinal view capability, with the view presenting the encounter-bound records in a unified display. The longitudinal records support clinical decision-making by surfacing trends that may not be apparent in individual encounter documentation.

Longitudinal records are read-only; they are generated from the encounter-bound records and do not constitute a separate data entry surface. The encounter-bound records remain the authoritative source; the longitudinal view is a derived presentation. The longitudinal view is configured through the reporting module's standard configuration surface, with the configuration defining which entities are included, how they are presented, and what time period is covered.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

The urology overlay ships encounter templates for the encounter types common in urological practice: initial urology evaluation, follow-up encounter, pre-procedure consultation, post-procedure follow-up, surveillance encounter, and telehealth encounter. Each template defines the documentation sections required, the structured fields included, the order sets suggested, and the workflow steps associated with the encounter type. Templates are versioned alongside the overlay and are reviewed when the overlay is revised.

Encounter templates are configured through the clinical documentation module (M03) and are subject to the standard validation rules. Customers may refine templates through the configuration surface at the facility, department, or care-team layer, with refinements recorded as overrides on the platform-provided template. Customers may not modify the platform-provided template's underlying definition; this restriction preserves the overlay's coherence and is stated in Section 5.4 of `CLINIC_TYPES.md`.

### 10.2 Procedural Documentation Templates

Procedural documentation templates support the structured capture of procedural information. The urology overlay ships templates for the procedures common in urological practice: cystoscopy, ureteroscopy, transurethral resection of prostate (TURP), transurethral resection of bladder tumour (TURBT), vasectomy, prostate biopsy, lithotripsy (ESWL, ureteroscopic, PCNL), scrotal procedures, and major urological surgery (radical prostatectomy, cystectomy, nephrectomy). Each template is configured through the clinical documentation module and is subject to the standard validation, versioning, and audit rules.

| Template | Procedure Category | Mandatory Sections | Configurable Fields |
|---|---|---|---|
| Cystoscopy | Endoscopic | Indication, findings, intervention, complications, disposition | Equipment, findings catalogue |
| Prostate biopsy | Office-based | Indication, approach, samples taken, complications, disposition | Biopsy scheme, number of cores |
| Vasectomy | Office-based | Indication, approach, technique, complications, disposition | Technique variation, semen analysis schedule |
| TURP | Endoscopic surgery | Indication, anaesthesia, operative findings, tissue removed, complications, disposition | Anaesthesia type, resectoscope details |
| ESWL | Lithotripsy | Indication, stone characteristics, energy settings, outcome, complications | Energy protocol, targeting method |
| Radical prostatectomy | Major surgery | Indication, anaesthesia, approach, operative findings, nerve-sparing, blood loss, complications, disposition | Approach (open, laparoscopic, robotic), nerve-sparing technique |

### 10.3 Consent Forms

Consent forms are a distinct template category given the consent specificity required for procedural care. The urology overlay ships consent form templates for each procedural category, with the templates configured through the patient module's consent management capability and versioned alongside the regional configuration pack. The consent forms include the procedure description, the risks and benefits, the alternatives, the patient's acknowledgement, and the physician's certification.

Consent forms are signed by the patient (or legal guardian) and are recorded in the patient's consent record. The consent record is the basis for procedural authorisation: a procedure cannot be performed without the appropriate consent on file. The consent record is auditable; consent withdrawal is recorded with the withdrawal date and the effect on subsequent procedural authorisation.

### 10.4 Patient-Facing Materials

The urology overlay ships a library of patient-facing materials that the urologist may provide to patients: procedure information sheets (for common urological procedures), diagnosis education sheets (for common urological diagnoses), medication information sheets (for urological medications including alpha-blockers, 5-alpha-reductase inhibitors, phosphodiesterase-5 inhibitors), and post-operative care instructions. The materials are configured through the documents module (M07) and are versioned alongside the overlay. The materials are available in the languages supported by the customer's regional configuration pack; translation is performed through the localization module (M19).

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

Clinical outcome reports support the urologist's assessment of treatment response and the patient's progress toward treatment goals. The urology overlay ships default clinical outcome reports including the longitudinal PSA report, the longitudinal uroflowmetry report, the longitudinal IPSS report (presenting IPSS scores across encounters), the stone episode history report, and the post-operative outcome report (presenting complications, functional outcomes, and recurrence). Each report is configured through the reporting module (M18) and is generated from the structured field values recorded during encounters.

Clinical outcome reports are typically accessed by the urologist during clinical care. Access is governed by the permission framework, with the customer's system administrator responsible for configuring access based on the practice's organizational structure. Reports are generated on demand and on configured schedules, with the schedule configured through the reporting module's standard configuration surface.

### 11.2 Operational Reports

Operational reports support the practice's management and quality improvement activities. The urology overlay ships default operational reports including the appointment adherence report, the encounter volume report (encounters by type, by urologist, by time period), the procedural volume report (procedures by type, by urologist, by time period), the documentation completion report, and the consent compliance report (procedures with consent on file at the time of procedure). Each report is configured through the reporting module and is generated from operational data.

Operational reports are typically accessed by practice administrators and clinical leads rather than by individual urologists. Reports that include individual urologist performance data are subject to additional access restrictions; access is logged in the audit trail. The reports support practice management decisions including staffing, scheduling, and quality improvement initiatives.

### 11.3 Regulatory Reports

Regulatory reports support the practice's compliance with regional regulatory requirements. The urology overlay ships default regulatory reports including the cancer registry report (urological cancers reportable to regional cancer registries), the implant tracking report (implants placed, with patient and procedural detail), the controlled substance prescribing report (for post-operative pain management), and the procedural quality report (where regional regulation requires procedural quality reporting). Each report is configured through the regional configuration pack and is updated when regional regulations change.

Regulatory reports are generated on the schedule required by regional regulation. Reports are submitted to the appropriate regulatory authority through the integration module (M17) where electronic submission is supported, or are exported in the format required for manual submission. Submission is recorded in the audit trail, with the submission time, the submitting user, and the report contents preserved.

### 11.4 Quality Improvement Reports

Quality improvement reports support the practice's quality improvement activities. The urology overlay ships default quality improvement reports including the procedural complication rate report (complications by procedure type, by urologist), the post-operative readmission rate report, the biopsy adequacy report (number of cores, diagnostic yield), and the patient-reported outcome report (where PROs are collected). Each report is configured through the reporting module and is generated from clinical and operational data.

Quality improvement reports are reviewed at configured intervals by the practice's quality improvement committee or equivalent. The review is documented, and the resulting quality improvement actions are tracked through the platform's task management capability. Quality improvement reports are subject to the same access controls as other reports; access is governed by the permission framework and is logged in the audit trail.

---

## 12. Role & Permission Recommendations

### 12.1 Specialty-Specific Roles

The Ibn Hayan urology overlay recommends the following role assignments for urological practice, building on the role catalogue defined in `USER_ROLES.md`.

| Role | Code | Specialty Application | Typical Permission Scope |
|---|---|---|---|
| Physician | R01 | Urologist | Full clinical access to own patient panel; procedural documentation; prescribing |
| Nurse | R02 | Urology nurse | Clinical access to assigned patients; procedure assistance; patient education |
| Physician assistant / Advanced practice nurse | R03 | Urology APP | Clinical access under supervising urologist; procedural assistance; prescribing per scope |
| Medical assistant | R04 | Urology medical assistant | Limited clinical access; rooming, vitals, IPSS administration |
| Allied health professional | R05 | Urology technician | Uroflowmetry and urodynamic study administration |
| Patient | R06 | Urology patient | Portal access to own record, appointments, secure messaging, post-operative instructions |
| Patient family / Caregiver | R07 | Family member or caregiver | Limited portal access with patient authorization |
| Billing specialist | R08 | Urology billing specialist | Billing and claims access; no clinical access |
| Facility administrator | R09 | Practice administrator | Administrative access; no clinical access |
| Customer administrator | R10 | Customer system administrator | Configuration and user management; no clinical access |
| Auditor | R11 | Compliance auditor | Read-only access to audit trail and compliance reports |
| Support engineer | R12 | Implementation consultant | Configuration access during implementation; no production clinical access |

### 12.2 Permission Defaults

Permission defaults are configured to support the principle of least privilege. A urologist has full clinical access to their own patient panel, with access to other urologists' patients restricted to covering arrangements. A urology nurse has clinical access to assigned patients, with access to procedure assistance documentation but not to procedural performance documentation. A urology technician has access to uroflowmetry and urodynamic study records but not to other clinical documentation.

Permission defaults are versioned alongside the customer's configuration and are subject to the standard validation rules. Defaults may be refined at the facility, department, care-team, or user layer, with refinements recorded as overrides. Access to procedural documentation is restricted to authorised personnel, with access logged in the audit trail. Access to implant records is restricted to authorised personnel, with the access supporting post-market surveillance reporting where required by regional regulation.

### 12.3 Covering Arrangement Permissions

Covering arrangements — where one urologist covers another's patients during absence — require temporary permission grants. The Ibn Hayan platform supports covering arrangements through the permission framework's time-bounded permission grant capability, with the grant configured with a start date, an end date, and the patient panel covered. The grant is recorded in the audit trail, with the granting user, the receiving user, the patient panel, and the time period documented.

Covering arrangement permissions are subject to additional verification: the receiving urologist must have the appropriate credentials for the clinic type, the patient panel must be within the same customer and facility, and the consent on file must permit access by the covering physician. Where consent does not permit access by the covering physician, the covering arrangement is flagged for resolution before access is granted; in emergency situations, emergency access may be granted with the access documented for retrospective review.

---

## 13. Configuration Defaults

### 13.1 Encounter Configuration Defaults

The urology overlay ships encounter configuration defaults tuned to urological practice. Default appointment durations are 60 minutes for initial evaluation, 30 minutes for follow-up, 20 minutes for surveillance, and 90 minutes for pre-procedure consultation. Default encounter templates are configured per encounter type, with the template selection automated based on the encounter type selected at scheduling. Default documentation completion expectation is set to within 24 hours of the encounter for outpatient encounters and within 48 hours for procedural encounters.

Encounter configuration defaults are starting points; customers may refine them through the configuration surface at the facility, department, or care-team layer. Refinements are subject to the standard validation rules and are recorded in the audit trail. Defaults are reviewed when the overlay is revised and are updated to reflect evolving practice patterns and regulatory requirements.

### 13.2 Documentation Configuration Defaults

Documentation configuration defaults include the structured field sets for each documentation template, the validation rules that govern documentation completion, and the longitudinal view configurations that present documentation across encounters. Default structured field sets include all fields required by the regional regulatory framework and the clinical standard of care, with optional fields available for activation by the customer. Default validation rules require completion of mandatory sections before the encounter can be closed, with the mandatory sections configured per encounter type.

Documentation configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add fields through the configuration surface, with additions subject to the standard validation rules. Customers may not remove fields that are required by the regional regulatory framework; this restriction is enforced at the platform layer and is not customer-modifiable.

### 13.3 Procedural Configuration Defaults

Procedural configuration defaults include the procedural documentation templates described in Section 10.2, the consent forms described in Section 10.3, and the post-procedure follow-up schedules configured per procedure type. Default follow-up schedules are configured based on the procedure's typical recovery trajectory, with the schedule including wound assessment, symptom review, complication assessment, and treatment plan adjustment. Customers may refine follow-up schedules through the configuration surface, with refinements recorded in the audit trail.

Procedural configuration defaults also include the implant tracking configuration, with the tracking configured to capture the implant's manufacturer, model, lot number, serial number (where applicable), and the patient and procedure in which it was placed. The tracking is configured through the inventory module's (M07) implant tracking capability, with the tracking integrated with the procedural documentation workflow.

### 13.4 Reporting Configuration Defaults

Reporting configuration defaults include the default report set described in Section 11 of this document, with each report configured with the default parameters and the default delivery schedule. Customers may refine report parameters and schedules through the configuration surface, with refinements recorded in the audit trail. Reports are subject to the same access controls as other clinical documentation; access is governed by the permission framework and is logged in the audit trail.

---

## 14. Onboarding Checklist

### 14.1 Onboarding Workflow Stages

The onboarding workflow for urology follows the eight-stage process defined in Section 9 of `CLINIC_TYPES.md`, with stage durations scaled to the urology overlay's medium configuration complexity. The indicative onboarding timeline is 3–4 weeks for a typical urology practice, with longer timelines for practices with day-surgery capability and for hospital-based departments.

| Stage | Code | Activity | Owner | Indicative Duration |
|---|---|---|---|---|
| Clinic type selection | O1 | Confirm urology clinic type at facility | Customer administrator | 1 day |
| Overlay activation | O2 | Apply urology overlay to facility configuration | Customer administrator | 1 day |
| Module enablement | O3 | Enable core modules; assess optional modules; configure integration with uroflowmetry and urodynamic equipment | Customer administrator | 2–3 days |
| Configuration refinement | O4 | Refine encounter templates, procedural templates, role permissions | Customer administrator with clinical lead | 1–2 weeks |
| Validation | O5 | Sandbox testing with representative scenarios including procedural workflows | Customer clinical lead | 3–5 days |
| User provisioning | O6 | Provision users with urology-appropriate roles | Customer administrator | 2 days |
| Operational readiness | O7 | Operational readiness assessment; first encounter and first procedure targeted | Customer clinical lead with Ibn Hayan customer success | 2–3 days |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle updated | Customer administrator | 1 day |

### 14.2 Pre-Onboarding Preparation

Before onboarding begins, the customer should complete the following preparation activities: confirm facility licensing for urological practice, confirm regional regulatory framework applicability (including procedural consent and implant tracking requirements), gather existing clinical and procedural documentation templates for review, identify the clinical lead who will validate the configuration, confirm the patient population and anticipated encounter and procedural volume, and confirm the equipment integration requirements (uroflowmetry devices, urodynamic study equipment, imaging systems).

### 14.3 Onboarding Validation Activities

Onboarding validation activities include: configuration validation per Section 15.4 of `SYSTEM_ARCHITECTURE.md`; workflow validation through testing each configured workflow against representative scenarios (including procedural workflows); user acceptance testing through clinicians performing representative tasks in the sandbox (including procedural documentation); and operational readiness assessment through a structured review of the configuration against the customer's operational reality. Validation results are documented and are required for the go-live stage transition.

### 14.4 Post-Onboarding Activities

Post-onboarding activities include: ongoing configuration governance per the customer's configuration governance process; periodic review of operational reports and quality improvement reports; periodic review of regulatory reports and submission to regulatory authorities; equipment integration monitoring and maintenance; and participation in the platform's change-management process for overlay revisions and regional configuration pack updates.

---

## 15. Sample Use Cases

### 15.1 Initial Evaluation for Lower Urinary Tract Symptoms

A 65-year-old man presents for initial evaluation of lower urinary tract symptoms. The patient is scheduled for a 60-minute initial evaluation encounter. At check-in, the patient completes the IPSS through the patient portal. The medical assistant rooms the patient and records vitals. The urologist conducts the evaluation, documenting the history, the physical examination including DRE, and ordering a PSA test and a uroflowmetry study. The uroflowmetry is performed during the encounter, with the result integrated from the uroflowmetry device. The urologist documents the assessment (benign prostatic hyperplasia with bladder outlet obstruction) and the plan (initiation of alpha-blocker therapy, follow-up in 6 weeks). A follow-up appointment is scheduled.

### 15.2 Prostate Biopsy with Pathology Follow-Up

A 62-year-old man with an elevated PSA (5.8 ng/mL) and a normal DRE is scheduled for transrectal prostate biopsy. The patient is scheduled for the procedure, with the prostate biopsy consent form provided through the patient portal in advance. At the procedure, the consent is verified, the patient is prepared, and the biopsy is performed under transrectal ultrasound guidance with 12 cores obtained. The procedural documentation is completed through the prostate biopsy template, with the structured fields capturing the approach, the number of cores, and the complications (none). The pathology order is configured through the procedural workflow, with the order submitted to the laboratory through the integration module. The patient is discharged with post-procedure instructions, and a follow-up appointment is scheduled to review the pathology result.

### 15.3 Stone Episode Management

A 45-year-old man presents with acute left flank pain. The patient is evaluated in the urology clinic (or in the emergency department with urology consultation), with the assessment including urinalysis, complete blood count, and a CT urogram. The imaging identifies a 6 mm left distal ureteral stone. The urologist documents the stone episode through the stone episode template, with the structured fields capturing the presentation, the imaging findings, and the acute management (analgesia, medical expulsion therapy with tamsulosin). The disposition is medical expulsion therapy with planned follow-up in 4 weeks for reassessment. If the stone does not pass, ureteroscopy with laser lithotripsy is planned.

### 15.4 Surveillance Cystoscopy for Bladder Cancer

A 70-year-old man with a history of low-grade non-muscle-invasive bladder cancer presents for surveillance cystoscopy. The patient is scheduled for the surveillance encounter, with the encounter type set to surveillance. The cystoscopy is performed, with the procedural documentation completed through the cystoscopy template. The findings (no recurrence) are documented, and the next surveillance cystoscopy is scheduled based on the surveillance protocol (3 months for low-grade non-muscle-invasive bladder cancer). The surveillance is documented in the patient's longitudinal oncology record, supporting coordination with oncology (C11) where collaborative management is required.

### 15.5 Vasectomy with Semen Analysis Follow-Up

A 38-year-old man presents for vasectomy. The patient is scheduled for the procedure, with the vasectomy consent form provided through the patient portal in advance. At the procedure, the consent is verified, the patient is prepared, and the vasectomy is performed using the no-scalpel technique. The procedural documentation is completed through the vasectomy template, with the structured fields capturing the technique, the complications (none), and the discharge instructions. The semen analysis is scheduled for 12 weeks post-procedure, with the order configured through the procedural workflow. The patient is discharged with post-procedure instructions and the semen analysis appointment.

### 15.6 Urodynamic Study for Complex Incontinence

A 55-year-old woman presents with complex urinary incontinence that has not responded to initial treatment. The urologist orders a urodynamic study to assess bladder function. The study is performed, with the urodynamic study record populated from the urodynamic study equipment through the integration module. The structured parameters (first sensation, capacity, compliance, detrusor pressure at Qmax, presence of detrusor overactivity) are captured automatically, and the study tracings are recorded as graphical outputs. The urologist documents the interpretation (detrusor overactivity with stress incontinence), and the treatment plan is updated based on the findings (combination of anticholinergic medication and pelvic floor physiotherapy, with planned reassessment in 3 months).

---

## 16. Best Practices

### 16.1 Configuration Governance Best Practices

Establish a configuration governance process before onboarding begins, defining who is authorized to make configuration changes, how changes are tested before production application, how changes are documented, and how changes are reviewed retrospectively. The Ibn Hayan platform provides the tools (configuration sandbox, configuration validation, configuration versioning, configuration audit) but does not impose the governance workflow; the customer is responsible for the workflow.

Review the configuration at configured intervals (typically quarterly for urology) and after any significant operational change (new urologist joining, new procedure added, new equipment integrated, regulatory change). Document the review and the resulting actions, with the documentation preserved for audit. A configuration governance process that is documented and followed is the single most important determinant of a stable production configuration.

### 16.2 Documentation Discipline Best Practices

Complete documentation at the time of the encounter or procedure wherever possible. Documentation completed after the encounter is more prone to error and omission, and delayed documentation is a frequent source of compliance findings. The Ibn Hayan platform's documentation completion expectation (default 24 hours for outpatient encounters, 48 hours for procedural encounters) is a configuration that supports this practice, with the configuration enforced through the documentation completion report.

Use structured fields rather than free text wherever the documentation template provides structured fields. Structured fields support longitudinal comparison, clinical decision support, and reporting; free text does not. For urology specifically, the quantitative parameters (uroflowmetry, urodynamic studies, PSA, IPSS) must be captured as structured values to support the longitudinal analysis that is central to urological decision-making.

### 16.3 Equipment Integration Best Practices

Configure equipment integration with the involvement of the equipment vendor and the customer's information technology team. The integration is performed through anticorruption layer connectors that translate the equipment's proprietary output format into Ibn Hayan's standard data model, and the connector configuration requires knowledge of the equipment's output format. Test the integration thoroughly before production application, with the testing including data accuracy verification (does the data in Ibn Hayan match the data on the equipment's display) and workflow integration verification (does the data flow correctly from the equipment to the encounter documentation).

Maintain the integration through the equipment's lifecycle, with the integration reviewed when the equipment is serviced, when the equipment's software is updated, and when Ibn Hayan's integration module is updated. Document the integration configuration, with the documentation preserved for audit and for troubleshooting. Integration failures are inevitable over a long enough timeframe; the documentation supports rapid resolution when failures occur.

### 16.4 Procedural Documentation Best Practices

Complete procedural documentation immediately after the procedure, while the details are fresh. Procedural documentation completed later is more prone to error and omission, and delayed documentation is a frequent source of compliance findings and clinical risk. The Ibn Hayan platform's procedural documentation templates support this practice, with the templates' structured fields guiding rapid and complete documentation.

Verify consent immediately before the procedure, with the verification documented in the procedural record. Consent verification is a regulatory requirement and a patient safety practice. The Ibn Hayan platform's consent management capability supports this practice, with the verification performed at procedure initiation and recorded in the audit trail.

### 16.5 Implant Tracking Best Practices

Capture implant information at the time of implantation, with the information captured from the implant packaging and recorded in the implant record. Implant tracking is a regulatory requirement and supports post-market surveillance. The Ibn Hayan platform's implant tracking capability supports this practice, with the tracking integrated with the procedural documentation workflow.

Maintain the implant record through the implant's lifecycle, with the record updated if the implant is revised, removed, or compromised. Implant recall notifications are received through the integration module (where electronic recall notification is supported) or through manual entry, with the recall matched to the patient's implant record and the affected patient contacted. Document the recall response, with the documentation preserved for audit.

### 16.6 Reporting and Analytics Best Practices

Review clinical outcome reports at configured intervals and use the reports to inform treatment decisions. The longitudinal PSA, uroflowmetry, IPSS, and stone episode reports support clinical decision-making by surfacing trends that may not be apparent in individual encounter documentation. The Ibn Hayan platform's reporting capability supports this practice, with the reports configured through the reporting module and presented in the longitudinal views.

Review operational reports at configured intervals and use the reports to inform practice management decisions. The procedural volume report, the documentation completion report, and the consent compliance report surface operational patterns that may not be apparent from day-to-day practice. Address the patterns identified through the reports, with the actions documented and the effects monitored through subsequent reports.

### 16.7 Onboarding Best Practices

Engage Ibn Hayan customer success or implementation consulting for configuration review during onboarding. The urology overlay's medium configuration complexity warrants configuration review by an experienced implementer, particularly for the equipment integration and procedural documentation components. The cost of the review is modest compared to the cost of rework after go-live.

Train all users before go-live, with the training tailored to each user's role. Procedural documentation training should include hands-on practice with the procedural documentation templates, with the training conducted in the sandbox to avoid affecting production data. Document the training, with the documentation preserved for audit.

### 16.8 Change Management Best Practices

Adopt overlay revisions on a planned schedule rather than reactively. Overlay revisions are communicated in advance, with the revision contents documented and the adoption window defined. Plan the adoption during a period of lower operational tempo, with the adoption tested in the sandbox before production application. Document the adoption, with the documentation preserved for audit.

Participate in the platform's change-management process by providing feedback on overlay revisions and by participating in pilot engagements for new overlay capabilities. Customer participation is the basis of the platform's validated-practice posture stated in Principle P8 (Verified Practice Over Hypothetical Capability) in Section 4.9 of `SYSTEM_ARCHITECTURE.md`.

### 16.9 Privacy and Confidentiality Best Practices

Verify patient identity at the start of each encounter, with the verification documented in the encounter record. Identity verification is a patient safety practice and is a regulatory requirement in most jurisdictions. The Ibn Hayan platform's encounter workflow supports this practice, with the verification step included in the encounter template.

Limit access to procedural and implant documentation to authorised users with a clinical or operational need. Access by users without a need is a compliance violation and undermines patient trust. The Ibn Hayan platform's permission framework supports this practice, with access governed by role, relationship to the patient, and documentation category. Review access logs periodically and address any unauthorized access promptly.

### 16.10 Cancer Surveillance Best Practices

Configure cancer surveillance protocols to reflect the patient's risk stratification and the regional clinical guideline. Surveillance protocols vary by cancer type (prostate, bladder, kidney, testicular) and by risk stratification within each cancer type, with the surveillance interval and the surveillance activities (PSA, cystoscopy, imaging) configured per protocol. The Ibn Hayan platform's surveillance protocol capability supports this practice, with the protocols configured through the clinical documentation module.

Monitor surveillance adherence and address non-adherence promptly. Surveillance non-adherence is a patient safety risk, with missed surveillance potentially delaying detection of recurrence. The Ibn Hayan platform's surveillance adherence report supports this practice, with the report surfacing patients with overdue surveillance for follow-up. Document the follow-up, with the documentation preserved for audit.

---

## 17. Related Documents

### 17.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines the urology clinic type (C17); Section 16 (Editions) defines the edition packaging; Section 19 (Product Modules Overview) defines the module catalogue; Section 22 (Configuration-Driven Philosophy) governs customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the platform's behaviour; Section 12 (Clinic Hierarchy) defines the clinic type overlay layer; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; urology is clinic type C17 in the surgical specialty family; Section 5 documents the configuration overlay approach; Section 8 documents customization boundaries |

### 17.2 Downstream and Sibling Documents

The following downstream and sibling documents elaborate aspects of urology referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and dependencies |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue and permission scope defaults |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework and access control rules |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine and workflow configuration |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per clinic type |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging and module enablement |
| Patient Module | `docs/07_MODULES/PATIENT.md` | Patient registration, consent management |
| Encounter Module | `docs/07_MODULES/ENCOUNTER.md` | Encounter management, procedural encounters |
| Clinical Documentation Module | `docs/07_MODULES/CLINICAL_DOCUMENTATION.md` | Documentation templates, structured fields |
| Pharmacy Module | `docs/07_MODULES/PHARMACY.md` | Medication management |
| Inventory Module | `docs/07_MODULES/INVENTORY.md` | Implant tracking, supply management |
| Day Surgery Clinic Type | `docs/06_CLINIC_TYPES/DAY_SURGERY.md` | Sibling surgical clinic type for day-surgery facilities |
| Oncology Clinic Type | `docs/06_CLINIC_TYPES/ONCOLOGY.md` | Sibling specialty for urological cancer coordination |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Overlay revisions and regional configuration pack updates are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
