# Ibn Hayan Healthcare Operating System
## Physiotherapy Clinics

| Field | Value |
|---|---|
| Document Title | Physiotherapy Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the physiotherapy configuration overlay is amended or when regional regulatory or professional frameworks change |
| Audience | Clinical informatics leads, implementation consultants, customer success teams, configuration architects, physiotherapists, physical therapists, rehabilitation administrators, compliance officers evaluating Ibn Hayan for physiotherapy practice |
| Scope | Physiotherapy clinic type (C26) configuration overlay, recommended module composition, specialty-specific capabilities (initial evaluation, functional outcome measures, treatment plans, exercise prescription, manual therapy logs, modality tracking, progress tracking, home exercise program distribution), specialty workflows, conceptual data entities, forms and templates, reports and analytics, integrations, role and permission defaults, configuration defaults, onboarding checklist, sample use cases, best practices |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks, database schemas, API endpoint specifications, UI component catalogues, vendor-specific modality device contracts, country-specific legal interpretation of physiotherapy practice acts |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the physiotherapy entry in the clinic type catalogue and does not override the catalogue entry or the platform-level principles. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Assessment Forms
5. Treatment Plans
6. Progress Tracking
7. Exercise Prescription
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

Physiotherapy (also termed physical therapy in some regions) is the rehabilitation specialty concerned with restoring movement and function after injury, illness, or disability, and with promoting physical health and well-being. Physiotherapists assess, diagnose, and treat musculoskeletal, neuromuscular, cardiovascular, and respiratory conditions through movement, exercise, manual therapy, and physical modalities. The scope of practice spans acute rehabilitation (post-operative, post-stroke, post-injury), chronic condition management (osteoarthritis, chronic low back pain, neurological conditions), and preventive care (injury prevention, ergonomic assessment, fitness for activity). In Ibn Hayan, physiotherapy is catalogued as clinic type C26 within the rehabilitation and long-term care specialty family, alongside occupational therapy (C27) and long-term care facility (C30), per Section 18.2 of `PRODUCT_BIBLE.md` and Section 3.6 of `CLINIC_TYPES.md`.

The physiotherapy clinic type is distinct from occupational therapy (C27) in scope: physiotherapy focuses on movement and physical function, whereas occupational therapy focuses on activities of daily living and occupational performance. The two clinic types share configuration themes (functional assessment, longitudinal care planning, treatment session documentation) but maintain distinct overlays, encounter templates, and assessment instruments. The two clinic types frequently operate within the same rehabilitation facility, with the overlay supporting the multi-clinic-type facility pattern described in Section 4 of `CLINIC_TYPES.md`.

### 1.2 Patient Population and Clinical Activities

The physiotherapy patient population spans all ages and a wide range of clinical presentations. Paediatric physiotherapy addresses developmental conditions (cerebral palsy, developmental coordination disorder, torticollis) and paediatric musculoskeletal conditions. Adult physiotherapy addresses the broad scope of musculoskeletal conditions (low back pain, neck pain, sports injuries, post-operative rehabilitation), neurological conditions (stroke, multiple sclerosis, Parkinson's disease), cardiopulmonary conditions (post-cardiac surgery rehabilitation, chronic obstructive pulmonary disease), and women's health (prenatal and postnatal rehabilitation, pelvic floor dysfunction). Geriatric physiotherapy addresses age-related conditions (falls prevention, osteoporosis management, joint replacement rehabilitation).

Key clinical activities in physiotherapy include initial evaluation (history, physical examination, functional assessment, goal setting), treatment planning (treatment goals, treatment interventions, expected outcomes, treatment frequency and duration), treatment session delivery (therapeutic exercise, manual therapy, physical modalities, patient education), progress tracking (re-assessment at configured intervals, comparison to baseline, treatment plan adjustment), and discharge planning (achievement of treatment goals, home exercise program, discharge summary to referrer). Each of these activities is supported by configuration in the physiotherapy overlay.

### 1.3 Why Physiotherapy Requires Specialized Configuration

Physiotherapy presents configuration considerations that distinguish it from medical or surgical specialties. Functional outcome measurement is integral to physiotherapy in a way that it is not for most medical specialties, with validated instruments (DASH for upper extremity, Oswestry Disability Index for low back, KOOS for knee, HOOS for hip, Berg Balance Scale for falls risk) used to establish baseline function, track progress, and assess discharge readiness. The configuration must support these instruments as structured assessment instruments, with the instruments administered at configured intervals and the results presented in longitudinal views.

Treatment session documentation is a daily operational reality for physiotherapy, with each session generating documentation that captures the interventions delivered, the patient's response, and the plan for the next session. The volume of session documentation is substantially higher than for medical specialties, where encounters are less frequent. The configuration must support efficient session documentation that does not burden the physiotherapist with excessive data entry while capturing the clinical detail required for continuity of care and outcome assessment.

Exercise prescription is a defining clinical activity of physiotherapy, with the physiotherapist prescribing specific exercises (with parameters including repetitions, sets, hold time, frequency, progression) tailored to the patient's condition and goals. The configuration must support exercise prescription as a structured data entity, with the prescription supporting home exercise program distribution and longitudinal tracking of exercise progression.

### 1.4 Relationship to Other Clinic Types

Physiotherapy operates in relationship to several other clinic types. Within the rehabilitation family, physiotherapy coordinates with occupational therapy (C27) for combined rehabilitation programmes and with long-term care facility (C30) for resident rehabilitation. Physiotherapy also coordinates with orthopaedics (C13) for post-operative rehabilitation, with neurology (C10) for neurological rehabilitation, with oncology (C11) for cancer rehabilitation, with cardiology (C06) for cardiac rehabilitation, and with primary care (C01–C04) for referred rehabilitation and for return-to-activity coordination. The overlay includes integration surfaces that support this coordination without requiring operational coupling between clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes and Ownership

Physiotherapy is practised across a range of facility sizes, from solo practitioner clinics through group practices, hospital-based physiotherapy departments, and rehabilitation centres. The recommended editions for physiotherapy in Section 2.1 of `CLINIC_TYPES.md` are Essential (E1) and Professional (E2), reflecting the typical small to mid-sized facility and the relatively low configuration complexity. Solo practitioners and small practices may operate at the Essential edition; mid-sized group practices and hospital-based departments operate at the Professional edition. Enterprise edition (E3) is not typically required for physiotherapy unless the practice operates within a hospital tenant that uses Enterprise edition.

Ownership patterns in physiotherapy include private practice (individual or group), hospital-employed physiotherapist groups, government-operated rehabilitation services, and non-governmental organizations providing rehabilitation in underserved areas. The clinic type overlay is ownership-agnostic; it provides the configuration surface that any ownership model requires, with ownership-specific concerns configured at the facility or customer layer per the configuration layer model in Section 15.3 of `SYSTEM_ARCHITECTURE.md`.

### 2.2 Geographic and Regulatory Considerations

Physiotherapy is practised in every region Ibn Hayan serves, and the regulatory environment for physiotherapy practice varies substantially across regions. The overlay accommodates this variation through the platform's localization module (M19), with regional configuration packs that adapt direct-access physiotherapy rules (where physiotherapists may assess and treat without physician referral), supervised physiotherapy rules (where physiotherapists practise under physician supervision), insurance billing rules, and regulatory reporting requirements. The configuration packs are versioned alongside the platform's regional regulatory framework and are updated when regional regulations change.

Geographic considerations also include rural and remote practice, where physiotherapists may serve a region through a combination of in-person outreach clinics and telehealth-delivered physiotherapy. The physiotherapy overlay supports telehealth encounters through the encounter template configuration, with the telehealth variant of the treatment session template adapting the assessment and treatment interventions to the telehealth context while maintaining the documentation rigour required for clinical accountability.

### 2.3 Regulatory Exposure

The regulatory exposure for physiotherapy is rated low in Section 2.1 of `CLINIC_TYPES.md`, reflecting the absence of controlled substance prescribing, the absence of invasive procedures, and the relatively straightforward consent requirements. The overlay addresses the regulatory dimensions that do apply through configuration: physiotherapist scope of practice is configured through the permission framework, with the configuration reflecting the regional regulatory framework; consent for physiotherapy treatment is documented through structured consent forms configured per regional regulatory framework; direct-access versus supervised practice is configured through the encounter workflow, with the configuration enforcing referral requirements where regional regulation requires them.

Regulatory exposure is higher for physiotherapists practising in specific contexts (e.g., pelvic health physiotherapy, vestibular rehabilitation) where additional training or certification is required, and where the documentation requirements are more specific. The overlay accommodates these contexts through specialty-specific encounter templates and assessment instruments, with the templates configured through the clinical documentation module (M03).

### 2.4 Customer Maturity Profile

Physiotherapy customers vary in maturity. Established practices with mature electronic health record use configure Ibn Hayan to match their existing operational patterns; transitioning customers from paper-based or basic electronic systems require more onboarding support. Practices with established functional outcome measurement programmes may require data migration support to incorporate existing outcome data into Ibn Hayan. The onboarding workflow in Section 9 of `CLINIC_TYPES.md` scales stage duration and complexity to the customer's maturity profile and the overlay's low configuration complexity.

---

## 3. Recommended Modules

### 3.1 Core Module Composition

The recommended module composition for physiotherapy follows the rehabilitation family pattern stated in Section 6.2 of `CLINIC_TYPES.md`. The table below summarizes the recommended modules; module codes are defined in Section 19.2 of `PRODUCT_BIBLE.md`.

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Core | Patient registration, demographics, physiotherapy consent |
| Encounter | M02 | Core | Initial evaluation, treatment sessions, re-assessment encounters, telehealth encounters |
| Clinical Documentation | M03 | Core | Physiotherapy documentation templates, functional outcome measures, treatment session notes |
| Orders & Results | M04 | Limited | Imaging and laboratory results review (typically referred from medical specialists); limited direct ordering per regional scope of practice |
| Pharmacy | M05 | Limited | Medication review (for medication effects on rehabilitation); not typically prescribed by physiotherapists |
| Scheduling | M06 | Core | Treatment session scheduling, recurring appointments, group therapy scheduling |
| Documents | M07 | Core | Consent documents, treatment plan documents, home exercise programs, referral correspondence |
| Notifications | M08 | Core | Appointment reminders, home exercise program reminders, re-assessment reminders |
| Billing | M09 | Core | Session-based billing, insurance claim submission |
| Accounting | M10 | Optional | General ledger for private practices with their own accounting |
| CRM | M11 | Optional | Patient outreach, recall for chronic condition management |
| HR | M12 | Optional | Employee management for practices with administrative and clinical staff |
| Workforce | M13 | Optional | Scheduling of clinical staff, credentialing for physiotherapy licensure |
| Identity & Access | M14 | Core | Authentication, role-based access |
| Configuration | M15 | Core | Configuration surface for overlay refinement |
| Audit | M16 | Core | Audit trail for clinical actions |
| Integration | M17 | Optional | Integration with exercise prescription software, functional outcome measurement systems, referring physician systems |
| Reporting | M18 | Core | Clinical outcomes reporting, operational reporting, regulatory reporting where applicable |
| Localization | M19 | Core | Regional regulatory framework, language adaptation |

### 3.2 Module Activation Considerations

The core module set is recommended for every physiotherapy deployment; the optional modules are added based on the customer's operational reality. A solo physiotherapist may decline M10 (Accounting) and M11 (CRM); a mid-sized group practice typically adds both; a hospital-based physiotherapy department typically operates within the hospital's broader module set, which includes all 19 modules. Module enablement is governed by the dependency rules in Section 9.4 of `SYSTEM_ARCHITECTURE.md`.

The clinical documentation module (M03) is particularly relevant for physiotherapy given the specialty's reliance on structured assessment instruments and treatment session documentation. The module provides the framework for the structured assessment instruments and the treatment session templates, with the actual instruments and templates configured through the module's standard configuration surface. The notifications module (M08) is also particularly relevant given the high appointment frequency and the importance of appointment adherence for treatment outcome.

### 3.3 Edition Packaging

The recommended editions for physiotherapy are Essential (E1) for solo practitioners and small practices and Professional (E2) for mid-sized group practices and hospital-based departments, per Section 2.1 of `CLINIC_TYPES.md`. The Essential edition provides the core clinical and operational modules required for physiotherapy practice with a conservative default configuration; the Professional edition adds advanced clinical documentation capabilities, multi-facility operation, and enhanced configuration depth. Edition packaging is governed by Section 16 of `PRODUCT_BIBLE.md`.

---

## 4. Assessment Forms

### 4.1 Initial Evaluation Template

The initial evaluation is the comprehensive assessment conducted at the patient's first physiotherapy encounter, establishing the baseline for treatment planning and outcome measurement. The Ibn Hayan physiotherapy overlay ships an initial evaluation template that captures the standard elements: history (presenting complaint, history of present condition, past medical history, medication, social history, occupation, activity level), physical examination (observation, palpation, range of motion, strength, neurologic screen, special tests), functional assessment (validated outcome measure administration), assessment (clinical impression, contributing factors, prognosis), and plan (treatment goals, treatment interventions, treatment frequency and duration, expected outcomes).

The initial evaluation template is configured through the clinical documentation module (M03) and is encounter-type-aware. The template adapts to the patient's presenting condition through condition-specific addenda: a low back pain addendum adds the Oswestry Disability Index and the lumbar segmental examination; a shoulder addendum adds the DASH and the shoulder special tests; a knee addendum adds the KOOS and the knee ligament and meniscal tests. The addenda are activated based on the body region or condition recorded at encounter creation.

### 4.2 Functional Outcome Measures

Functional outcome measures are validated instruments that assess the patient's functional status, supporting baseline establishment, progress tracking, and discharge readiness assessment. The Ibn Hayan physiotherapy overlay ships a library of functional outcome measures covering the common body regions and conditions: upper extremity (DASH, QuickDASH, SPADI, ASES), lower extremity (Oswestry Disability Index, KOOS, HOOS, LEFS), cervical (NDI), balance and falls (Berg Balance Scale, Tinetti, Functional Reach Test), neurological (Fugl-Meyer, Motor Assessment Scale), and cardiopulmonary (6-Minute Walk Test). Each instrument is configured as a structured assessment instrument through the clinical documentation module.

| Body Region / Condition | Primary Instrument | Alternate Instrument | Administration Frequency |
|---|---|---|---|
| Cervical | Neck Disability Index (NDI) | Copenhagen Neck Functional Disability Scale | Initial, every 4 weeks, discharge |
| Lumbar | Oswestry Disability Index (ODI) | Quebec Back Pain Disability Scale | Initial, every 4 weeks, discharge |
| Shoulder | DASH | QuickDASH, SPADI | Initial, every 4 weeks, discharge |
| Knee | KOOS | KOOS-12, Lysholm | Initial, every 4 weeks, discharge |
| Hip | HOOS | HOOS-12, Harris Hip Score | Initial, every 4 weeks, discharge |
| Balance / Falls | Berg Balance Scale | Tinetti, Functional Reach | Initial, every 2 weeks, discharge |
| Stroke | Fugl-Meyer Assessment | Motor Assessment Scale | Initial, every 4 weeks, discharge |

Functional outcome measures are administered at the configured intervals, with the results presented in the patient's longitudinal physiotherapy record. The longitudinal view supports the physiotherapist's assessment of progress and the discharge readiness decision. The results are also queryable through the reporting module (M18), supporting outcome reporting at the patient, practitioner, and practice levels.

### 4.3 Condition-Specific Assessment Addenda

Condition-specific assessment addenda extend the initial evaluation template with the structured fields appropriate to specific conditions. The overlay ships addenda for the common physiotherapy conditions: post-operative rehabilitation (with structured fields for surgical procedure, surgical date, post-operative precautions, surgical site assessment), chronic low back pain (with structured fields for pain pattern, centralization, red flag screening), sports injury (with structured fields for mechanism of injury, sport-specific demands, return-to-sport criteria), neurological rehabilitation (with structured fields for tone, reflexes, coordination, gait assessment), and pelvic health (with structured fields for pelvic floor function, bladder and bowel function, per regional scope of practice).

The addenda are activated through the clinical documentation module's standard configuration surface, with the activation driven by the condition recorded at encounter creation. The activation is configurable; the customer may add customer-specific addenda, with additions subject to the standard validation rules. The platform's catalogue of addenda is reviewed when the overlay is revised and is expanded when new evidence-based assessment approaches emerge.

### 4.4 Re-Assessment Documentation

Re-assessment is the structured re-evaluation of the patient's status at configured intervals during the treatment episode, supporting progress tracking and treatment plan adjustment. The overlay ships a re-assessment template that captures the standard elements: subjective status (pain, function, goal progress), objective status (range of motion, strength, functional outcome measure re-administration), assessment (progress toward goals, factors affecting progress), and plan (treatment plan adjustment, continued treatment or discharge decision). The template is configured through the clinical documentation module and is presented at the configured re-assessment interval.

Re-assessment documentation is integrated with the longitudinal functional outcome measurement view, with the re-assessment results presented alongside the baseline and previous re-assessments. The integration supports the physiotherapist's assessment of progress by surfacing trends that may not be apparent in individual encounter documentation. The integration is configured through the reporting module's (M18) longitudinal view capability.

---

## 5. Treatment Plans

### 5.1 Treatment Plan Structure

The treatment plan is the structured documentation of the physiotherapist's plan for the patient's treatment episode, defining the treatment goals, the treatment interventions, the expected outcomes, and the treatment frequency and duration. The Ibn Hayan physiotherapy overlay ships a treatment plan template that captures the standard elements: treatment goals (with structured fields for goal type — impairment, activity limitation, participation restriction — and goal specifics — measurable, time-bound), treatment interventions (with structured categories for therapeutic exercise, manual therapy, physical modalities, patient education), treatment frequency and duration (with structured fields for sessions per week, total sessions, expected discharge date), and expected outcomes (with structured fields for expected functional outcome measure improvement).

The treatment plan is created at the initial evaluation and is reviewed at each re-assessment. The plan is versioned; revisions are recorded as new versions with the previous version retained for audit. The plan is associated with the patient's longitudinal physiotherapy record, allowing comparison across treatment episodes (e.g., comparison of the current low back pain episode with a previous episode two years previously). The plan is also associated with the encounters that contribute to it, supporting the aggregation of treatment session documentation against the plan.

### 5.2 Treatment Goal Configuration

Treatment goals are configured as structured data entities, with the configuration supporting the SMART goal framework (Specific, Measurable, Achievable, Relevant, Time-bound). Each goal includes the goal type (impairment-level — e.g., increase shoulder flexion range of motion to 160 degrees; activity-level — e.g., patient able to reach overhead without pain; participation-level — e.g., patient able to return to work as a painter), the goal specifics (measurable, time-bound), the goal status (active, achieved, partially achieved, not achieved), and the goal achievement date (where achieved). The configuration is through the clinical documentation module's structured field capability.

Treatment goals are integrated with the functional outcome measures, with the goal often expressed as a target improvement in a functional outcome measure score (e.g., reduce Oswestry Disability Index from 40% to 20% within 8 weeks). The integration supports the physiotherapist's assessment of goal achievement by surfacing the functional outcome measure trajectory alongside the goal target. The integration is configured through the clinical documentation module's standard configuration surface.

### 5.3 Treatment Intervention Documentation

Treatment interventions are documented as structured data entities, with the configuration supporting the categorisation of interventions by type. The overlay ships the following intervention categories: therapeutic exercise (with subcategories for range of motion, strengthening, endurance, neuromuscular re-education, proprioception), manual therapy (with subcategories for joint mobilisation, soft tissue mobilisation, manipulation), physical modalities (with subcategories for thermal, electrical, mechanical, ultrasound), patient education (with subcategories for condition education, activity modification, self-management), and functional training (with subcategories for gait training, transfer training, activity-specific training). Each intervention is documented with the intervention type, the parameters (e.g., sets, repetitions, hold time, intensity), and the patient's response.

Intervention documentation is encounter-type-aware: the treatment session template includes the intervention documentation as a structured section, with the section's structured fields adapted to the intervention types selected. The intervention documentation is also queryable through the reporting module (M18), supporting intervention frequency reporting (which interventions are most commonly used, for which conditions) and intervention outcome reporting (which interventions are associated with the best outcomes). The queryable nature of the documentation supports evidence-based practice and quality improvement.

### 5.4 Treatment Plan Review and Revision

Treatment plan review and revision is the structured process of evaluating the treatment plan at configured intervals and revising it based on the patient's progress. The overlay ships a treatment plan review template that captures the standard elements: progress assessment (goal-by-goal assessment of progress), plan revision (changes to goals, interventions, frequency, expected discharge date), and revision rationale (the clinical reasoning for the revision). The review is conducted at each re-assessment, with the review documented in the patient's record and the revised treatment plan versioned alongside the previous version.

Treatment plan review is integrated with the re-assessment workflow, with the review triggered automatically at the configured re-assessment interval. The integration supports the physiotherapist's adherence to the re-assessment schedule by surfacing the overdue review for action. The integration is configured through the workflow engine's standard configuration surface, with the workflow engine described in Section 16 of `SYSTEM_ARCHITECTURE.md`.

---

## 6. Progress Tracking

### 6.1 Longitudinal Progress View

Longitudinal progress tracking is the unified presentation of the patient's progress across the treatment episode, supporting the physiotherapist's clinical decision-making and the patient's understanding of progress. The Ibn Hayan physiotherapy overlay supports longitudinal progress tracking through the reporting module's (M18) longitudinal view capability, with the view presenting the functional outcome measure scores, the treatment goal progress, the treatment interventions delivered, and the treatment session notes across the treatment episode in a single display.

The longitudinal progress view is read-only; it is generated from the encounter-bound records and does not constitute a separate data entry surface. The view is configured per condition, with the view presenting the functional outcome measure and the treatment goals appropriate to the condition. The view is also encounter-aware, with the view presenting the most recent encounter alongside the baseline and previous encounters. The view supports the re-assessment process by surfacing trends that may not be apparent in individual encounter documentation.

### 6.2 Goal Progress Tracking

Goal progress tracking is the structured monitoring of progress toward each treatment goal, supporting the physiotherapist's assessment of goal achievement and the discharge readiness decision. The overlay supports goal progress tracking through the treatment plan's structured goal fields, with the goal status updated at each re-assessment. The goal status is presented in the longitudinal progress view, with the view showing the goal trajectory (active, achieved, partially achieved, not achieved) across the treatment episode.

Goal progress tracking is integrated with the functional outcome measures, with the goal progress assessed against the functional outcome measure trajectory. The integration supports the physiotherapist's clinical reasoning by surfacing the relationship between the goal and the functional outcome measure. The integration is configured through the clinical documentation module's standard configuration surface.

### 6.3 Session-to-Session Progress Documentation

Session-to-session progress documentation is the structured capture of the patient's progress between treatment sessions, supporting the physiotherapist's continuity of care and the patient's adherence to the treatment plan. The overlay ships a session progress section within the treatment session template, with the section capturing the patient's subjective report (pain, function, response to previous session), the objective findings (changes in range of motion, strength, function), and the plan for the current session. The section is configured through the clinical documentation module's structured field capability.

Session-to-session progress documentation is presented in the longitudinal progress view, with the documentation from each session contributing to the overall progress picture. The documentation supports the physiotherapist's identification of patterns (e.g., patient consistently reports pain reduction after manual therapy but not after therapeutic exercise) that may inform treatment plan adjustment. The documentation is queryable through the reporting module, supporting intervention outcome reporting.

### 6.4 Discharge Readiness Assessment

Discharge readiness assessment is the structured evaluation of the patient's readiness for discharge from physiotherapy, supporting the discharge decision and the discharge planning. The overlay ships a discharge readiness assessment template that captures the standard elements: goal achievement (goal-by-goal assessment of achievement), functional outcome measure (final score compared to baseline and to discharge target), patient-reported outcome (patient's assessment of progress and satisfaction), residual impairments (any remaining impairments that may warrant continued treatment or self-management), and discharge plan (home exercise program, self-management advice, follow-up arrangements, discharge summary to referrer).

Discharge readiness assessment is integrated with the treatment plan, with the assessment drawing on the treatment goals and the expected outcomes. The integration supports the physiotherapist's discharge decision by surfacing the relationship between the planned outcomes and the actual outcomes. The integration is configured through the clinical documentation module's standard configuration surface.

---

## 7. Exercise Prescription

### 7.1 Exercise Library

The exercise library is the curated catalogue of exercises that the physiotherapist can prescribe, organized by body region, by exercise type (range of motion, strengthening, endurance, neuromuscular re-education, proprioception, functional), and by equipment requirement. The Ibn Hayan physiotherapy overlay ships a default exercise library covering the common physiotherapy exercises, with each exercise entry including the exercise name, the description, the parameters (sets, repetitions, hold time, frequency, progression), the equipment required, and the patient instructions. The library is configured through the documents module (M07) and is versioned alongside the overlay.

The exercise library is extensible: customers may add customer-specific exercises through the configuration surface, with additions subject to the standard validation rules and recorded in the audit trail. Customer-specific exercises do not replace platform library entries; they supplement them. The library is reviewed when the overlay is revised and is expanded when new evidence-based exercises emerge. The library's organisation supports the physiotherapist's exercise selection by providing structured navigation by body region and exercise type.

### 7.2 Exercise Prescription Generation

Exercise prescription generation is the process of creating a structured exercise prescription for a patient, drawing on the exercise library and tailored to the patient's condition and goals. The overlay supports exercise prescription generation through the clinical documentation module's (M03) structured prescription capability, with the prescription including the exercises selected, the parameters (sets, repetitions, hold time, frequency, progression), the patient instructions, and the prescription date. The prescription is associated with the encounter in which it was generated and with the patient's longitudinal physiotherapy record.

Exercise prescription is integrated with the treatment plan, with the prescription supporting the treatment interventions documented in the plan. The integration supports the physiotherapist's continuity of care by ensuring that the prescribed exercises align with the treatment plan and that the prescription is updated at each treatment session as the exercises are progressed. The integration is configured through the clinical documentation module's standard configuration surface.

### 7.3 Home Exercise Program Distribution

Home exercise program distribution is the delivery of the exercise prescription to the patient in a form that supports the patient's adherence to the program. The overlay supports home exercise program distribution through the patient module's (M01) patient portal capability, with the program delivered as a structured document that includes the exercises, the parameters, the patient instructions, and (where available) the exercise demonstration images or videos. The program is delivered to the patient's portal account at the time of prescription, with the patient notified of the program availability through the notifications module (M08).

Home exercise program distribution is integrated with the patient's exercise adherence tracking, with the patient able to record exercise completion through the patient portal. The adherence tracking is presented to the physiotherapist at the next treatment session, supporting the physiotherapist's assessment of adherence and the treatment plan adjustment based on adherence. The integration is configured through the patient module's standard configuration surface.

### 7.4 Exercise Progression Tracking

Exercise progression tracking is the structured documentation of exercise progression across the treatment episode, supporting the physiotherapist's adjustment of the exercise prescription based on the patient's response. The overlay supports exercise progression tracking through the treatment session template's structured exercise fields, with the progression (changes to parameters, addition or removal of exercises) documented at each session. The progression is presented in the longitudinal progress view, with the view showing the exercise trajectory across the treatment episode.

Exercise progression tracking is integrated with the exercise library, with the progression drawing on the library's progression parameters. The integration supports the physiotherapist's exercise selection by surfacing the progression options for each exercise. The integration is configured through the documents module's standard configuration surface.

---

## 8. Specialty Workflows

### 8.1 Workflow Inventory

The Ibn Hayan physiotherapy overlay ships a default set of workflows tuned to physiotherapy practice. The workflows are defined declaratively through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md` Section 2.

| Workflow | Code | Trigger | Key Steps | Outcome |
|---|---|---|---|---|
| Initial evaluation | PTW1 | Scheduled appointment | Patient check-in, consent, initial evaluation, functional outcome measure, treatment plan, treatment session, follow-up scheduling | Evaluation documented; treatment plan created |
| Treatment session | PTW2 | Scheduled appointment | Patient check-in, subjective assessment, treatment intervention, response assessment, exercise prescription update, next session scheduling | Session documented; prescription updated |
| Re-assessment | PTW3 | Scheduled interval (e.g., every 4 weeks) | Functional outcome measure re-administration, progress assessment, treatment plan review, plan revision if needed | Re-assessment documented; plan revised if needed |
| Discharge | PTW4 | Discharge readiness achieved | Discharge readiness assessment, home exercise program finalisation, discharge summary to referrer, patient discharge | Discharge documented; summary sent |
| Group therapy session | PTW5 | Scheduled group session | Group session creation, participant attendance, group intervention documentation, individual response documentation | Group session documented; individual responses recorded |
| Telehealth session | PTW6 | Scheduled telehealth appointment | Patient check-in, telehealth session, intervention, response assessment, next session scheduling | Telehealth session documented |
| Referral intake | PTW7 | Referral received | Referral review, patient contact, initial evaluation scheduling, referrer acknowledgement | Referral processed; evaluation scheduled |
| Re-referral / Recall | PTW8 | Recall trigger (e.g., annual review for chronic condition) | Recall identification, patient contact, re-evaluation scheduling | Recall processed; re-evaluation scheduled |

### 8.2 Workflow Customization

Workflows may be customized through the workflow engine's configuration surface, subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The customization posture is a direct consequence of Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md`.

Customization examples include adding referral source-specific intake workflows (e.g., orthopaedic post-operative referral, neurological rehabilitation referral), adjusting the re-assessment interval based on the patient population's presentation, and adding customer-specific group therapy protocols to the group therapy session workflow. Each customization is applied as a facility-level or department-level override, with the underlying platform-provided workflow retained unchanged.

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The data entities referenced by the physiotherapy clinic type overlay are conceptual; this section describes the entities by name and relationship, not by implementation. Database schemas, persistence models, and data access patterns are out of scope for this document per the metadata table above and are addressed in module-specific documentation.

The physiotherapy overlay references the following conceptual entities: Patient, Encounter, Clinical Documentation Record, Initial Evaluation Record, Functional Outcome Measure Record, Treatment Plan, Treatment Goal, Treatment Session Note, Treatment Intervention Record, Exercise Prescription, Exercise Library Entry, Re-Assessment Record, Discharge Summary, Home Exercise Program, Group Therapy Session Record, Group Therapy Participant Record, Consent Record, and Referral Record. Each entity is owned by a bounded context defined in Section 7 of `SYSTEM_ARCHITECTURE.md`; the physiotherapy overlay composes these entities into physiotherapy-specific workflows and documentation structures.

### 9.2 Entity Relationships

The Patient entity is the central reference: every other entity is associated with a Patient. The Encounter entity is associated with a Patient and with one or more Clinical Documentation Records, each of which may be an Initial Evaluation Record, a Treatment Session Note, or a Re-Assessment Record. The Treatment Plan is associated with a Patient and is referenced by the Clinical Documentation Records that document the treatment delivered under the plan. The Treatment Goal is associated with the Treatment Plan and is updated at each Re-Assessment Record.

The Functional Outcome Measure Record is associated with a Patient, with the Encounter in which it was administered, and with the Treatment Plan (where the measure is used as a treatment goal target). The Exercise Prescription is associated with a Patient, with the Encounter in which it was generated, and with the Exercise Library Entries from which the exercises were selected. The Group Therapy Session Record is associated with multiple Patients (the participants), with each participant's contribution documented within the session record.

### 9.3 Longitudinal Records

Several physiotherapy entities are longitudinal rather than encounter-bound: the patient's functional outcome measure history, the patient's treatment goal history, the patient's exercise prescription history, and the patient's group therapy participation history. These longitudinal records are constructed from the encounter-bound records through the reporting module's longitudinal view capability. The longitudinal records support clinical decision-making by surfacing the patient's history in a unified view.

Longitudinal records are read-only; they are generated from the encounter-bound records and do not constitute a separate data entry surface. The encounter-bound records remain the authoritative source; the longitudinal view is a derived presentation. The longitudinal view is configured through the reporting module's standard configuration surface, with the configuration defining which entities are included, how they are presented, and what time period is covered.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

The physiotherapy overlay ships encounter templates for the encounter types common in physiotherapy practice: initial evaluation, treatment session, re-assessment, discharge encounter, group therapy session, and telehealth encounter. Each template defines the documentation sections required, the structured fields included, the assessment instruments suggested, and the workflow steps associated with the encounter type. Templates are versioned alongside the overlay and are reviewed when the overlay is revised.

Encounter templates are configured through the clinical documentation module (M03) and are subject to the standard validation rules. Customers may refine templates through the configuration surface at the facility, department, or care-team layer, with refinements recorded as overrides on the platform-provided template. Customers may not modify the platform-provided template's underlying definition; this restriction preserves the overlay's coherence and is stated in Section 5.4 of `CLINIC_TYPES.md`.

### 10.2 Assessment Instrument Templates

Assessment instrument templates support the structured administration of functional outcome measures. The physiotherapy overlay ships templates for the functional outcome measures listed in Section 4.2 of this document, with each template configured through the clinical documentation module and including the instrument's items, scoring rules, and interpretation guidance. The templates are versioned alongside the overlay and are reviewed when the underlying instrument is revised.

| Assessment Instrument | Body Region / Condition | Items | Scoring |
|---|---|---|---|
| DASH | Upper extremity | 30 items | 0–100 scale; higher = greater disability |
| QuickDASH | Upper extremity | 11 items | 0–100 scale; higher = greater disability |
| Oswestry Disability Index | Lumbar | 10 sections | 0–100 scale; higher = greater disability |
| KOOS | Knee | 42 items | 5 subscales, 0–100 each; higher = better |
| HOOS | Hip | 40 items | 5 subscales, 0–100 each; higher = better |
| NDI | Cervical | 10 sections | 0–100 scale; higher = greater disability |
| Berg Balance Scale | Balance / Falls | 14 items | 0–56 scale; lower = greater fall risk |

### 10.3 Consent Forms

Consent forms for physiotherapy are typically simpler than for procedural specialties, but they remain a regulatory and clinical requirement. The physiotherapy overlay ships consent form templates for general physiotherapy treatment, group therapy consent, telehealth consent, and (for pelvic health and other specialised practice areas) practice-area-specific consent. The forms are configured through the patient module's consent management capability and are versioned alongside the regional configuration pack.

Consent forms are signed by the patient (or legal guardian for minor patients) and are recorded in the patient's consent record. The consent record is the basis for treatment authorisation: treatment cannot be delivered without the appropriate consent on file. For direct-access physiotherapy (where the patient self-refers), the consent includes the patient's acknowledgement that they are accessing physiotherapy without physician referral; for supervised physiotherapy, the consent includes the supervising physician's information.

### 10.4 Patient-Facing Materials

The physiotherapy overlay ships a library of patient-facing materials that the physiotherapist may provide to patients: condition education sheets (for common physiotherapy conditions), exercise demonstration sheets (with images or video links for prescribed exercises), posture and ergonomic advice sheets, and self-management advice sheets. The materials are configured through the documents module (M07) and are versioned alongside the overlay. The materials are available in the languages supported by the customer's regional configuration pack; translation is performed through the localization module (M19).

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

Clinical outcome reports support the physiotherapist's assessment of treatment effectiveness and the patient's progress toward treatment goals. The physiotherapy overlay ships default clinical outcome reports including the longitudinal functional outcome measure report (presenting scores across the treatment episode), the goal achievement report (presenting goal status at discharge), the treatment response report (presenting outcome by intervention category), and the discharge outcome report (presenting baseline-to-discharge change in functional outcome measure). Each report is configured through the reporting module (M18) and is generated from the structured field values recorded during encounters.

Clinical outcome reports are typically accessed by the physiotherapist during clinical care and by the practice's quality improvement committee. Access is governed by the permission framework. Reports are generated on demand and on configured schedules.

### 11.2 Operational Reports

Operational reports support the practice's management and quality improvement activities. The physiotherapy overlay ships default operational reports including the appointment adherence report (no-show rate, cancellation rate, late arrival rate), the encounter volume report (encounters by type, by physiotherapist, by time period), the documentation completion report, the treatment plan review compliance report (percentage of treatment plans reviewed on schedule), and the re-assessment compliance report (percentage of re-assessments completed on schedule). Each report is configured through the reporting module and is generated from operational data.

Operational reports are typically accessed by practice administrators and clinical leads. Reports that include individual physiotherapist performance data are subject to additional access restrictions; access is logged in the audit trail. The reports support practice management decisions including staffing, scheduling, and quality improvement initiatives.

### 11.3 Referrer Reports

Referrer reports support the practice's communication with referring physicians, providing structured feedback on the patient's progress and outcome. The physiotherapy overlay ships default referrer reports including the initial evaluation summary (sent to the referrer after the initial evaluation), the re-assessment summary (sent at each re-assessment), and the discharge summary (sent at discharge). Each report is configured through the reporting module and is delivered to the referrer through the integration module (M17) where electronic communication is supported, or is exported for manual communication.

Referrer reports are subject to the patient's consent for information sharing, with the consent verified at report generation. The consent is configured through the patient module's consent management capability. The reports are typically brief and structured, providing the referrer with the information needed for continuity of care without burdening the referrer with detailed physiotherapy documentation.

### 11.4 Quality Improvement Reports

Quality improvement reports support the practice's quality improvement activities. The physiotherapy overlay ships default quality improvement reports including the outcome aggregate report (aggregate outcomes by condition, by intervention, by physiotherapist), the patient satisfaction report (where patient satisfaction is collected), the adherence-outcome correlation report (relationship between appointment adherence and outcome), and the benchmark report (where benchmark data is available, comparison of practice outcomes to benchmarks). Each report is configured through the reporting module and is generated from clinical and operational data.

Quality improvement reports are reviewed at configured intervals by the practice's quality improvement committee. The review is documented, and the resulting quality improvement actions are tracked through the platform's task management capability. Quality improvement reports are subject to the same access controls as other clinical documentation.

---

## 12. Role & Permission Recommendations

### 12.1 Specialty-Specific Roles

The Ibn Hayan physiotherapy overlay recommends the following role assignments for physiotherapy practice, building on the role catalogue defined in `USER_ROLES.md`.

| Role | Code | Specialty Application | Typical Permission Scope |
|---|---|---|---|
| Allied health professional | R05 | Physiotherapist | Full clinical access to own patient panel; treatment session documentation; exercise prescription |
| Allied health professional | R05 | Senior physiotherapist | Clinical access to department patients; supervision of junior physiotherapists; clinical education |
| Allied health professional | R05 | Physiotherapy assistant | Limited clinical access; supervised treatment delivery; treatment preparation |
| Nurse | R02 | Rehabilitation nurse (where applicable) | Clinical access to assigned patients; rehabilitation nursing care |
| Medical assistant | R04 | Physiotherapy aide | Limited clinical access; rooming, equipment preparation, patient transport |
| Patient | R06 | Physiotherapy patient | Portal access to own record, appointments, home exercise program, secure messaging |
| Patient family / Caregiver | R07 | Family member or caregiver | Limited portal access with patient authorization |
| Billing specialist | R08 | Physiotherapy billing specialist | Billing and claims access; no clinical access |
| Facility administrator | R09 | Practice administrator | Administrative access; no clinical access |
| Customer administrator | R10 | Customer system administrator | Configuration and user management; no clinical access |
| Auditor | R11 | Compliance auditor | Read-only access to audit trail and compliance reports |
| Support engineer | R12 | Implementation consultant | Configuration access during implementation; no production clinical access |

### 12.2 Permission Defaults

Permission defaults are configured to support the principle of least privilege. A physiotherapist has full clinical access to their own patient panel, with access to other physiotherapists' patients restricted to covering arrangements. A physiotherapy assistant has supervised access to patients assigned to the supervising physiotherapist, with access to treatment delivery documentation but not to assessment or treatment planning documentation. A physiotherapy aide has limited access to patient information needed for patient transport and equipment preparation.

Permission defaults are versioned alongside the customer's configuration and are subject to the standard validation rules. Defaults may be refined at the facility, department, care-team, or user layer, with refinements recorded as overrides. Access to clinical documentation is restricted to authorised personnel, with access logged in the audit trail. Direct-access versus supervised practice is configured through the permission framework, with the configuration reflecting the regional regulatory framework.

### 12.3 Supervision and Delegation Permissions

Supervision and delegation are integral to physiotherapy practice, with senior physiotherapists supervising junior physiotherapists and physiotherapists delegating components of treatment to physiotherapy assistants. The Ibn Hayan platform supports supervision and delegation through the permission framework's delegation capability, with the delegation configured with the delegating physiotherapist, the receiving physiotherapy assistant, the patient panel delegated, and the delegated activities. The delegation is recorded in the audit trail, with the delegating physiotherapist, the receiving physiotherapy assistant, the patient panel, and the delegated activities documented.

Supervision and delegation permissions are subject to additional verification: the receiving physiotherapy assistant must have the appropriate credentials for the delegated activities, the patient panel must be within the same customer and facility, and the supervising physiotherapist must be available for consultation. The verification is configured through the permission framework's standard configuration surface, with the configuration reflecting the regional regulatory framework for supervision and delegation.

---

## 13. Configuration Defaults

### 13.1 Encounter Configuration Defaults

The physiotherapy overlay ships encounter configuration defaults tuned to physiotherapy practice. Default appointment durations are 60 minutes for initial evaluation, 30 to 45 minutes for treatment sessions (varies by intervention complexity), 45 minutes for re-assessment, 30 minutes for discharge encounter, 60 minutes for group therapy sessions, and 30 to 45 minutes for telehealth sessions. Default encounter templates are configured per encounter type. Default documentation completion expectation is set to within 24 hours of the encounter.

Encounter configuration defaults are starting points; customers may refine them through the configuration surface at the facility, department, or care-team layer. Refinements are subject to the standard validation rules and are recorded in the audit trail. Defaults are reviewed when the overlay is revised and are updated to reflect evolving practice patterns.

### 13.2 Documentation Configuration Defaults

Documentation configuration defaults include the structured field sets for each documentation template, the validation rules that govern documentation completion, and the longitudinal view configurations that present documentation across encounters. Default structured field sets include all fields required by the regional regulatory framework and the professional standard of care, with optional fields available for activation by the customer. Default validation rules require completion of mandatory sections before the encounter can be closed, with the mandatory sections configured per encounter type.

Documentation configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add fields through the configuration surface, with additions subject to the standard validation rules. Customers may not remove fields that are required by the regional regulatory framework; this restriction is enforced at the platform layer and is not customer-modifiable.

### 13.3 Functional Outcome Measure Configuration Defaults

Functional outcome measure configuration defaults include the default library of instruments described in Section 4.2 of this document, the default administration intervals (initial, every 4 weeks, discharge), and the default longitudinal view configurations. Customers may refine the library, intervals, and views through the configuration surface, with refinements recorded in the audit trail. Customers may add customer-specific instruments through the configuration surface, with additions subject to the standard validation rules.

Functional outcome measure configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. The library is expanded when new evidence-based instruments emerge and is updated when existing instruments are revised. Updates are communicated to affected customers through the platform's change-management channel.

### 13.4 Reporting Configuration Defaults

Reporting configuration defaults include the default report set described in Section 11 of this document, with each report configured with the default parameters and the default delivery schedule. Customers may refine report parameters and schedules through the configuration surface, with refinements recorded in the audit trail. Reports are subject to the same access controls as other clinical documentation; access is governed by the permission framework and is logged in the audit trail.

---

## 14. Onboarding Checklist

### 14.1 Onboarding Workflow Stages

The onboarding workflow for physiotherapy follows the eight-stage process defined in Section 9 of `CLINIC_TYPES.md`, with stage durations scaled to the physiotherapy overlay's low configuration complexity. The indicative onboarding timeline is 2–3 weeks for a typical physiotherapy practice, with longer timelines for hospital-based departments and for customers transitioning from paper-based or basic electronic systems.

| Stage | Code | Activity | Owner | Indicative Duration |
|---|---|---|---|---|
| Clinic type selection | O1 | Confirm physiotherapy clinic type at facility | Customer administrator | 1 day |
| Overlay activation | O2 | Apply physiotherapy overlay to facility configuration | Customer administrator | 1 day |
| Module enablement | O3 | Enable core modules; assess optional modules | Customer administrator | 1–2 days |
| Configuration refinement | O4 | Refine encounter templates, assessment instruments, exercise library, role permissions | Customer administrator with clinical lead | 1–2 weeks |
| Validation | O5 | Sandbox testing with representative scenarios including treatment session and re-assessment workflows | Customer clinical lead | 2–4 days |
| User provisioning | O6 | Provision users with physiotherapy-appropriate roles | Customer administrator | 1–2 days |
| Operational readiness | O7 | Operational readiness assessment; first encounter targeted | Customer clinical lead with Ibn Hayan customer success | 1–2 days |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle updated | Customer administrator | 1 day |

### 14.2 Pre-Onboarding Preparation

Before onboarding begins, the customer should complete the following preparation activities: confirm facility licensing for physiotherapy practice, confirm regional regulatory framework applicability (including direct-access versus supervised practice rules), gather existing clinical documentation templates for review, gather existing functional outcome measure data for migration planning, gather existing exercise library for migration planning, identify the clinical lead who will validate the configuration, and confirm the patient population and anticipated encounter volume.

### 14.3 Onboarding Validation Activities

Onboarding validation activities include: configuration validation per Section 15.4 of `SYSTEM_ARCHITECTURE.md`; workflow validation through testing each configured workflow against representative scenarios; user acceptance testing through physiotherapists performing representative tasks in the sandbox (including treatment session documentation, functional outcome measure administration, and exercise prescription); and operational readiness assessment through a structured review of the configuration against the customer's operational reality. Validation results are documented and are required for the go-live stage transition.

### 14.4 Post-Onboarding Activities

Post-onboarding activities include: ongoing configuration governance per the customer's configuration governance process; periodic review of operational reports and quality improvement reports; periodic review of functional outcome measure data for completeness and accuracy; exercise library maintenance and expansion; and participation in the platform's change-management process for overlay revisions and regional configuration pack updates.

---

## 15. Sample Use Cases

### 15.1 Post-Operative Knee Rehabilitation

A 45-year-old man is referred for physiotherapy after arthroscopic partial meniscectomy. The patient is scheduled for a 60-minute initial evaluation 2 weeks post-operatively. The initial evaluation is documented through the initial evaluation template with the post-operative rehabilitation addendum, including the surgical procedure, the post-operative precautions, and the surgical site assessment. The KOOS is administered as the functional outcome measure, with the baseline score recorded. The treatment plan is documented, including treatment goals (knee range of motion to 125 degrees flexion by 6 weeks; quadriceps strength 80% of contralateral by 12 weeks; return to recreational sport by 16 weeks), treatment interventions (range of motion exercise, progressive strengthening, neuromuscular re-education), and treatment frequency (2 sessions per week for 8 weeks). The patient is provided with a home exercise program through the patient portal. Re-assessment is scheduled at 4 weeks and 8 weeks, with the KOOS re-administered at each re-assessment.

### 15.2 Chronic Low Back Pain Management

A 55-year-old woman is referred for physiotherapy for chronic low back pain (3-month duration). The patient is scheduled for a 60-minute initial evaluation. The initial evaluation is documented through the initial evaluation template with the chronic low back pain addendum, including the pain pattern assessment, centralization testing, and red flag screening. The Oswestry Disability Index is administered as the functional outcome measure, with the baseline score of 42% recorded. The treatment plan is documented, including treatment goals (reduce ODI to below 20% within 8 weeks; improve trunk flexion range of motion; return to gardening without pain), treatment interventions (manual therapy, therapeutic exercise including core stabilization, patient education including activity modification), and treatment frequency (2 sessions per week for 4 weeks, then 1 session per week for 4 weeks). The patient is provided with a home exercise program through the patient portal.

### 15.3 Stroke Rehabilitation

A 68-year-old man is referred for outpatient physiotherapy after inpatient stroke rehabilitation. The patient is scheduled for a 60-minute initial evaluation. The initial evaluation is documented through the initial evaluation template with the neurological rehabilitation addendum, including the tone, reflexes, coordination, and gait assessment. The Fugl-Meyer Assessment is administered as the functional outcome measure, with the baseline score recorded. The treatment plan is documented, including treatment goals (improve upper extremity Fugl-Meyer score by 10 points within 12 weeks; improve gait speed to 0.8 m/s within 12 weeks; improve functional independence in activities of daily living), treatment interventions (task-specific training, progressive strengthening, balance training, gait training), and treatment frequency (3 sessions per week for 12 weeks). The patient is provided with a home exercise program through the patient portal, with the program including caregiver involvement.

### 15.4 Group Therapy for Chronic Shoulder Pain

A group therapy programme is conducted for patients with chronic shoulder pain. The group therapy session is created as a group encounter, with six participants added to the encounter. Each participant's attendance is documented, and each participant's response to the group intervention is documented within the encounter record. The encounter is linked to each participant's patient record. The treatment session note is documented with group-specific elements (group composition, group dynamics, individual participation). The DASH is administered to each participant at the start of the programme and at the end of the programme, with the results tracked in each participant's longitudinal physiotherapy record.

### 15.5 Telehealth Physiotherapy Follow-Up

A patient in a rural area attends a physiotherapy follow-up via telehealth. The encounter is created as a telehealth encounter, with the telehealth variant of the treatment session template applied. The subjective assessment is conducted, with the patient reporting adequate progress with the home exercise program. The objective assessment is conducted within the constraints of telehealth, with the patient demonstrating the exercises and the physiotherapist assessing the movement quality. The treatment intervention is delivered through telehealth (exercise progression instruction, manual therapy self-mobilisation instruction), and the home exercise program is updated through the patient portal. The next telehealth session is scheduled.

### 15.6 Discharge and Return-to-Sport

A 25-year-old man completes a 12-week physiotherapy programme after ACL reconstruction. The discharge readiness assessment is conducted, with goal achievement assessed (knee range of motion 130 degrees flexion, achieved; quadriceps strength 95% of contralateral, achieved; single-leg hop test 92% of contralateral, achieved). The KOOS is re-administered, with the final score compared to baseline (KOOS Sports subscale improved from 35 to 88). The patient-reported outcome (patient's assessment of progress and satisfaction) is documented. The discharge plan is documented, including the final home exercise program, the self-management advice, the return-to-sport progression, and the discharge summary to the orthopaedic surgeon. The patient is discharged from physiotherapy, with the discharge documented in the patient's longitudinal physiotherapy record.

---

## 16. Best Practices

### 16.1 Configuration Governance Best Practices

Establish a configuration governance process before onboarding begins, defining who is authorized to make configuration changes, how changes are tested before production application, how changes are documented, and how changes are reviewed retrospectively. The Ibn Hayan platform provides the tools (configuration sandbox, configuration validation, configuration versioning, configuration audit) but does not impose the governance workflow; the customer is responsible for the workflow.

Review the configuration at configured intervals (typically quarterly for physiotherapy) and after any significant operational change (new physiotherapist joining, new service line added, regulatory change). Document the review and the resulting actions, with the documentation preserved for audit. A configuration governance process that is documented and followed is the single most important determinant of a stable production configuration.

### 16.2 Documentation Discipline Best Practices

Complete documentation at the time of the encounter wherever possible. Documentation completed after the encounter is more prone to error and omission, and delayed documentation is a frequent source of compliance findings. The Ibn Hayan platform's documentation completion expectation (default 24 hours for physiotherapy) is a configuration that supports this practice, with the configuration enforced through the documentation completion report.

Use structured fields rather than free text wherever the documentation template provides structured fields. Structured fields support longitudinal comparison, clinical decision support, and reporting; free text does not. For physiotherapy specifically, the functional outcome measure scores, the treatment goal progress, the treatment intervention parameters, and the exercise prescription parameters must be captured as structured values to support the longitudinal analysis that is central to physiotherapy practice.

### 16.3 Functional Outcome Measurement Best Practices

Administer functional outcome measures at the configured intervals, with the administration supporting the physiotherapist's clinical decision-making and the practice's quality improvement. Functional outcome measurement is not a bureaucratic exercise; it is a clinical tool that supports the assessment of progress and the discharge readiness decision. The Ibn Hayan platform's functional outcome measure capability supports this practice, with the measures configured through the clinical documentation module and administered at the configured intervals.

Use the validated functional outcome measures shipped with the overlay rather than custom instruments, with the validated measures supporting comparison across practices and across the literature. Custom instruments may be added where the validated measures do not capture a practice-specific outcome of interest, with the additions subject to the standard validation rules and recorded in the audit trail.

### 16.4 Treatment Planning Best Practices

Document treatment goals using the SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound), with the goals supporting the physiotherapist's clinical reasoning and the patient's understanding of the treatment trajectory. The Ibn Hayan platform's treatment goal capability supports this practice, with the goals configured as structured data entities and presented in the longitudinal progress view.

Review the treatment plan at each re-assessment, with the review documented in the patient's record and the revised plan versioned alongside the previous version. Treatment plan review is not optional; it is a clinical and professional requirement that supports the physiotherapist's accountability for the treatment delivered. The Ibn Hayan platform's treatment plan review workflow supports this practice, with the review triggered automatically at the configured re-assessment interval.

### 16.5 Exercise Prescription Best Practices

Prescribe exercises from the validated exercise library shipped with the overlay, with the library supporting evidence-based exercise selection and consistent parameter documentation. Customer-specific exercises may be added where the library does not include a specific exercise required for the practice's patient population, with the additions subject to the standard validation rules and recorded in the audit trail.

Deliver the home exercise program through the patient portal, with the program supporting the patient's adherence to the prescribed exercises. The Ibn Hayan platform's home exercise program distribution capability supports this practice, with the program delivered to the patient's portal account at the time of prescription. Encourage patients to record exercise completion through the portal, with the adherence tracking presented to the physiotherapist at the next treatment session.

### 16.6 Reporting and Analytics Best Practices

Review clinical outcome reports at configured intervals and use the reports to inform treatment decisions. The longitudinal functional outcome measure report, the goal achievement report, and the discharge outcome report support clinical decision-making by surfacing trends that may not be apparent in individual encounter documentation. The Ibn Hayan platform's reporting capability supports this practice, with the reports configured through the reporting module and presented in the longitudinal views.

Review operational reports at configured intervals and use the reports to inform practice management decisions. The appointment adherence report, the documentation completion report, and the re-assessment compliance report surface operational patterns that may not be apparent from day-to-day practice. Address the patterns identified through the reports, with the actions documented and the effects monitored through subsequent reports.

### 16.7 Onboarding Best Practices

Engage Ibn Hayan customer success or implementation consulting for configuration review during onboarding. The physiotherapy overlay's low configuration complexity does not always warrant extensive implementation consulting, but configuration review by an experienced implementer is valuable for practices transitioning from paper-based or basic electronic systems. The cost of the review is modest compared to the cost of rework after go-live.

Train all users before go-live, with the training tailored to each user's role. Functional outcome measure administration training should include hands-on practice with the assessment instruments and the structured field documentation. Exercise prescription training should include hands-on practice with the exercise library and the prescription generation. Conduct training in the sandbox to avoid affecting production data. Document the training, with the documentation preserved for audit.

### 16.8 Change Management Best Practices

Adopt overlay revisions on a planned schedule rather than reactively. Overlay revisions are communicated in advance, with the revision contents documented and the adoption window defined. Plan the adoption during a period of lower operational tempo, with the adoption tested in the sandbox before production application. Document the adoption, with the documentation preserved for audit.

Participate in the platform's change-management process by providing feedback on overlay revisions and by participating in pilot engagements for new overlay capabilities. Customer participation is the basis of the platform's validated-practice posture stated in Principle P8 (Verified Practice Over Hypothetical Capability) in Section 4.9 of `SYSTEM_ARCHITECTURE.md`.

### 16.9 Referrer Communication Best Practices

Send referrer reports at the configured intervals, with the reports supporting the referring physician's continuity of care. The Ibn Hayan platform's referrer report capability supports this practice, with the reports configured through the reporting module and delivered through the integration module where electronic communication is supported.

Verify the patient's consent for information sharing before sending referrer reports, with the consent verified at report generation. The Ibn Hayan platform's consent management capability supports this practice, with the consent categories configured through the regional configuration pack. Where consent is not on file, the report is held pending consent resolution, with the resolution managed through the patient module's standard workflow.

### 16.10 Telehealth Configuration Best Practices

Configure telehealth encounters with the same documentation rigour as in-person encounters. Telehealth is not a documentation shortcut; the clinical content of the encounter is the same, with the documentation reflecting the clinical content. The Ibn Hayan platform's telehealth encounter template supports this practice, with the template's structure guiding the documentation of the telehealth-specific elements (technology used, patient location, remote observation constraints) alongside the standard clinical elements.

Verify patient identity at the start of each telehealth encounter, with the verification documented in the encounter record. Identity verification is a regulatory requirement in most jurisdictions and is a patient safety practice. The Ibn Hayan platform's encounter workflow supports this practice, with the verification step included in the telehealth encounter template.

---

## 17. Related Documents

### 17.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines the physiotherapy clinic type (C26); Section 16 (Editions) defines the edition packaging; Section 19 (Product Modules Overview) defines the module catalogue; Section 22 (Configuration-Driven Philosophy) governs customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the platform's behaviour; Section 12 (Clinic Hierarchy) defines the clinic type overlay layer; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; physiotherapy is clinic type C26 in the rehabilitation and long-term care family; Section 5 documents the configuration overlay approach; Section 8 documents customization boundaries |

### 17.2 Downstream and Sibling Documents

The following downstream and sibling documents elaborate aspects of physiotherapy referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and dependencies |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue and permission scope defaults |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework and access control rules |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine and workflow configuration |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per clinic type |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging and module enablement |
| Patient Module | `docs/07_MODULES/PATIENT.md` | Patient registration, consent management |
| Encounter Module | `docs/07_MODULES/ENCOUNTER.md` | Encounter management, treatment sessions |
| Clinical Documentation Module | `docs/07_MODULES/CLINICAL_DOCUMENTATION.md` | Documentation templates, structured assessment instruments |
| Documents Module | `docs/07_MODULES/DOCUMENTS.md` | Exercise library, home exercise program |
| Occupational Therapy Clinic Type | `docs/06_CLINIC_TYPES/OCCUPATIONAL_THERAPY.md` | Sibling rehabilitation clinic type (C27) |
| Orthopaedics Clinic Type | `docs/06_CLINIC_TYPES/ORTHOPEDICS.md` | Sibling surgical specialty for post-operative rehabilitation coordination |
| Neurology Clinic Type | `docs/06_CLINIC_TYPES/NEUROLOGY.md` | Sibling medical specialty for neurological rehabilitation coordination |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Overlay revisions and regional configuration pack updates are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
