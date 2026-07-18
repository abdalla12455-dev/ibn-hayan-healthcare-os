# Ibn Hayan Healthcare Operating System
## Psychiatry Clinics

| Field | Value |
|---|---|
| Document Title | Psychiatry Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the psychiatry configuration overlay is amended or when regional behavioural-health regulations change |
| Audience | Clinical informatics leads, implementation consultants, customer success teams, configuration architects, psychiatrists, behavioural-health administrators, compliance officers evaluating Ibn Hayan for psychiatry practice |
| Scope | Psychiatry clinic type (C15) configuration overlay, recommended module composition, specialty-specific capabilities (mental status examination, psychotropic medication management, therapy session documentation, risk assessment), specialty workflows, conceptual data entities, forms and templates, reports and analytics, integrations, role and permission defaults, configuration defaults, onboarding checklist, sample use cases, best practices |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks, database schemas, API endpoint specifications, UI component catalogues, vendor-specific device contracts, country-specific legal interpretation of behavioural-health law |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the psychiatry entry in the clinic type catalogue and does not override the catalogue entry or the platform-level principles. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Mental Status Examination
5. Psychiatric Medication Management
6. Therapy Session Notes
7. Risk Assessment & Safety Planning
8. Specialty Workflows
9. Specialty Data Models
10. Forms & Templates
11. Reports & Analytics
12. Privacy & Confidentiality Considerations
13. Role & Permission Recommendations
14. Configuration Defaults
15. Onboarding Checklist
16. Sample Use Cases
17. Best Practices
18. Related Documents

---

## 1. Specialty Overview

### 1.1 Specialty Definition

Psychiatry is the medical specialty concerned with the diagnosis, treatment, and prevention of mental, emotional, and behavioural disorders. Psychiatrists are physicians who combine medical training with psychological expertise, and their scope of practice spans psychiatric evaluation, pharmacotherapy with psychotropic medications, psychotherapy, and the management of severe mental illness including schizophrenia, bipolar disorder, major depressive disorder, anxiety disorders, and substance use disorders. In Ibn Hayan, psychiatry is catalogued as clinic type C15 within the behavioural health specialty family, alongside mental health clinic (C28) and substance use treatment (C29). The clinic type catalogue entry is stated in Section 18.2 of `PRODUCT_BIBLE.md` and is elaborated in Section 3.6 of `CLINIC_TYPES.md`.

The psychiatry clinic type differs from the mental health clinic type (C28) in an important way: psychiatry is a physician-led practice that includes medication prescribing and procedural intervention, whereas the mental health clinic type is broader and includes non-physician behavioural-health practitioners. This distinction is operational, not organizational; a single organization may operate both clinic types within the same facility, with the psychiatry clinic type supporting the physician-led activities and the mental health clinic type supporting therapy and counselling activities. The clinic type overlay for psychiatry is tuned to the physician-led reality: medication management, controlled substance prescribing, and medical evaluation are first-class concerns.

### 1.2 Scope of Practice and Patient Population

The patient population served by psychiatry spans the full age range, from child and adolescent psychiatry through geriatric psychiatry. The clinic type overlay accommodates this breadth through encounter templates that adjust to the patient's life stage, with pediatric templates including developmental and family-history elements, adult templates including occupational and relationship assessment, and geriatric templates including cognitive assessment and polypharmacy review. The overlay does not impose a single template; it provides a template family from which the appropriate template is selected based on the patient and the encounter.

Key clinical activities in psychiatry include diagnostic evaluation using established criteria (DSM-5, ICD-11), psychiatric medication management with careful monitoring of efficacy and adverse effects, psychotherapy (individual, group, family), electroconvulsive therapy coordination in facilities equipped for it, crisis intervention, and the documentation required for involuntary commitment proceedings where regional law authorizes it. Each of these activities is supported by configuration in the psychiatry overlay, with documentation templates, order sets, and workflow definitions tuned to the activity.

### 1.3 Why Psychiatry Requires Specialized Configuration

Psychiatry presents three configuration challenges that distinguish it from general medical practice. First, behavioural-health records are subject to stricter privacy regulations than general medical records in most jurisdictions, requiring record segregation and consent specificity that general medical configuration does not provide. Second, psychotropic medications include a substantial number of controlled substances and high-risk medications (clozapine, lithium, stimulants) that require ongoing monitoring — blood levels, metabolic panels, absolute neutrophil counts — and the configuration must enforce this monitoring. Third, suicide and violence risk assessment is a routine and consequential activity in psychiatry; the configuration must support structured risk assessment, safety planning, and the documentation required for clinical and legal accountability.

The Ibn Hayan psychiatry overlay addresses each of these challenges through configuration: behavioural-health record segregation is enforced at the platform layer per Section 8.3 of `CLINIC_TYPES.md`, medication monitoring is configured through order sets and clinical decision support, and risk assessment is supported through structured templates and mandatory documentation triggers. The overlay is validated through workflow analysis with practising psychiatrists, as required by Section 5.2 of `CLINIC_TYPES.md`.

### 1.4 Relationship to Other Clinic Types

Psychiatry operates in relationship to several other clinic types. Within the behavioural health family, psychiatry (C15), mental health clinic (C28), and substance use treatment (C29) share configuration themes — record segregation, treatment plan documentation, longitudinal follow-up — while each maintains its own overlay. Within a multi-specialty facility, psychiatry coordinates with primary care (C01–C04) for chronic disease management that intersects with mental health, with neurology (C10) for differential diagnosis of organic causes of psychiatric symptoms, and with emergency care (C18, C19) for psychiatric crisis disposition. The clinic type overlay includes integration surfaces that support this coordination without requiring operational coupling between clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes and Ownership

Psychiatry is practised across a range of facility sizes, from solo practitioner offices through mid-sized group practices, community mental health centres, and hospital-based psychiatric departments. The recommended edition for psychiatry in Section 2.1 of `CLINIC_TYPES.md` is Professional (E2), reflecting the typical mid-sized facility with multiple practitioners and the need for the configuration depth that the Professional edition provides. Solo psychiatrists may operate at the Essential edition (E1) where the practice is small and the configuration depth required is modest; hospital-based psychiatric departments operate at the Enterprise edition (E3) as part of a broader hospital tenant.

Ownership patterns in psychiatry include private practice (individual or group), government-operated community mental health services, non-governmental organizations, hospital-employed physician groups, and telehealth-delivered psychiatric services. The clinic type overlay is ownership-agnostic; it provides the configuration surface that any ownership model requires, with ownership-specific concerns (such as billing rules, regulatory reporting, and contractual obligations) configured at the facility or customer layer per the configuration layer model in Section 15.3 of `SYSTEM_ARCHITECTURE.md`.

### 2.2 Geographic and Regulatory Considerations

Psychiatry is practised in every region Ibn Hayan serves, and the regulatory environment for behavioural health varies substantially across regions. The overlay accommodates this variation through the platform's localization module (M19), with regional configuration packs that adapt consent forms, involuntary commitment documentation, controlled substance reporting, and behavioural-health record segregation rules to the regional regulatory framework. The configuration packs are versioned alongside the platform's regional regulatory framework and are updated when regional regulations change; updates are communicated to affected customers through the platform's change-management channel.

Geographic considerations also include rural and remote practice, where a psychiatrist may serve a region through a combination of in-person and telehealth encounters. The psychiatry overlay supports telehealth encounters through the encounter template configuration, which adapts the mental status examination and risk assessment to the telehealth context while maintaining the documentation rigour required for clinical and legal accountability.

### 2.3 Regulatory Exposure

The regulatory exposure for psychiatry is rated very high in Section 2.1 of `CLINIC_TYPES.md`, reflecting the combination of behavioural-health record segregation requirements, controlled substance prescribing, and the documentation required for involuntary commitment and other court-involved proceedings. The overlay addresses each regulatory dimension through configuration: record segregation is enforced at the platform layer and is not customer-modifiable per Section 8.3 of `CLINIC_TYPES.md`; controlled substance dispensing and prescribing are governed by the pharmacy module (M05) with the controlled substance tracking that is a platform-level invariant; involuntary commitment documentation is supported through structured templates with mandatory fields that the customer's regional configuration pack defines.

Regulatory exposure is not a one-time consideration; it is an ongoing operational reality that the configuration must continue to address as regulations evolve. The Product Council's quarterly review cycle includes review of regulatory changes affecting psychiatry, with overlay revisions ratified and communicated to affected customers through the standard change-management channel.

### 2.4 Customer Maturity Profile

Psychiatry customers vary in maturity. Some customers operate established practices with mature electronic health record use and configure Ibn Hayan to match their existing operational patterns; other customers are transitioning from paper-based or basic electronic systems and require more onboarding support. The onboarding workflow in Section 9 of `CLINIC_TYPES.md` scales stage duration and complexity to the customer's maturity profile, with less mature customers receiving longer configuration refinement and validation stages.

---

## 3. Recommended Modules

### 3.1 Core Module Composition

The recommended module composition for psychiatry follows the behavioural health family pattern stated in Section 6.2 of `CLINIC_TYPES.md`. The table below summarizes the recommended modules; module codes are defined in Section 19.2 of `PRODUCT_BIBLE.md`.

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Core | Patient registration, demographics, behavioural-health consent management |
| Encounter | M02 | Core | Psychiatric encounter management, telehealth encounters, crisis encounters |
| Clinical Documentation | M03 | Core | Mental status examination, progress notes, treatment plans |
| Orders & Results | M04 | Core | Laboratory orders for medication monitoring, imaging orders for differential diagnosis |
| Pharmacy | M05 | Core | Psychotropic medication management, controlled substance prescribing |
| Scheduling | M06 | Core | Appointment scheduling, recurring therapy sessions, group therapy scheduling |
| Documents | M07 | Core | Consent documents, treatment plan documents, legal correspondence |
| Notifications | M08 | Core | Appointment reminders, medication monitoring reminders, lab result notifications |
| Billing | M09 | Core | Insurance billing for psychiatric services, session-based billing |
| Accounting | M10 | Optional | General ledger for private practices with their own accounting |
| CRM | M11 | Optional | Patient outreach, recall management for chronic psychiatric care |
| HR | M12 | Optional | Employee management for practices with administrative and clinical staff |
| Workforce | M13 | Optional | Scheduling of clinical staff, credentialing for licensure verification |
| Identity & Access | M14 | Core | Authentication, role-based access, behavioural-health record access control |
| Configuration | M15 | Core | Configuration surface for overlay refinement |
| Audit | M16 | Core | Audit trail for behavioural-health record access and clinical actions |
| Integration | M17 | Optional | Integration with laboratory systems, pharmacy networks, external referral systems |
| Reporting | M18 | Core | Clinical outcomes reporting, regulatory reporting, operational reporting |
| Localization | M19 | Core | Regional regulatory framework, language adaptation for behavioural-health terminology |

### 3.2 Module Activation Considerations

The core module set is recommended for every psychiatry deployment; the optional modules are added based on the customer's operational reality. A solo psychiatrist may decline M10 (Accounting) and M11 (CRM); a mid-sized group practice typically adds both; a hospital-based psychiatric department typically operates within the hospital's broader module set, which includes all 19 modules. Module enablement is governed by the dependency rules in Section 9.4 of `SYSTEM_ARCHITECTURE.md`; a customer cannot enable a module that depends on a disabled module.

The clinic type overlay for psychiatry includes default configuration for each enabled module that reflects the psychiatry operational reality. For example, the scheduling module (M06) is configured with appointment duration defaults that reflect typical psychiatric encounters (50 minutes for therapy, 20 minutes for medication management, 90 minutes for initial evaluation) rather than the platform default of 15–30 minutes for general medical encounters. These defaults are starting points that customers may refine through the configuration surface.

### 3.3 Edition Packaging

The recommended edition for psychiatry is Professional (E2), per Section 2.1 of `CLINIC_TYPES.md`. The Professional edition provides the configuration depth, multi-user support, and advanced clinical documentation capabilities that psychiatric practice requires. Customers operating at smaller scale (solo practitioners) may operate at the Essential edition (E1) with a subset of optional modules; customers operating at larger scale (hospital-based departments) operate at the Enterprise edition (E3) as part of the hospital tenant. Edition packaging is governed by Section 16 of `PRODUCT_BIBLE.md`; editions differ in module enablement and configuration depth, not in platform quality.

---

## 4. Mental Status Examination

### 4.1 Examination Template Structure

The mental status examination (MSE) is the structured psychiatric assessment that complements the psychiatric interview. The Ibn Hayan psychiatry overlay ships a default MSE template organized into the standard sections: appearance and behaviour, speech, motor activity, mood, affect, thought process, thought content, perception, cognition, insight, and judgement. Each section is documented through structured fields (checkboxes, Likert scales, qualitative free text) that capture the examination's findings in a form that supports longitudinal comparison and clinical decision support. The template is configured through the clinical documentation module (M03) and is versioned alongside the clinic type overlay.

The MSE template is encounter-aware: the same template is used for in-person and telehealth encounters, with the telehealth variant adapting the motor and appearance sections to the constraints of remote observation. The adaptation does not eliminate the section; it documents that the observation was performed under telehealth conditions and adjusts the available structured fields accordingly. The adaptation is a configuration choice, not a code change, in keeping with Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md`.

### 4.2 Structured Field Configuration

The MSE's structured fields are configured to support clinical decision support and longitudinal tracking. Mood and affect fields use standardized scales (e.g., the Calgary Depression Scale for Schizophrenia mood item) where regional configuration packs define the appropriate scale for the regulatory and clinical context. Thought content fields include structured checkboxes for suicidal ideation, homicidal ideation, persecutory beliefs, grandiose beliefs, and other common thought content abnormalities, with each checkbox triggering the corresponding risk assessment workflow when positive. Cognition fields support the documentation of brief cognitive assessments (Mini-Mental State Examination, Montreal Cognitive Assessment) with the score recorded as a structured value.

Structured field configuration is governed by the configuration validation framework stated in Section 15.4 of `SYSTEM_ARCHITECTURE.md`. Structural validation ensures the fields conform to the documentation schema; referential validation ensures that referenced scales and assessments exist; semantic validation ensures that required sections are completed for the encounter type; contextual validation ensures that the documentation is consistent with the encounter's clinic type and patient context. A documentation record that fails validation is not silently accepted; it is flagged for completion before the encounter can be closed.

### 4.3 Longitudinal Comparison

The MSE is most valuable when compared across encounters, allowing the psychiatrist to track changes in the patient's mental status over time. The Ibn Hayan psychiatry overlay supports longitudinal comparison through the reporting module (M18), with a longitudinal MSE view that presents the structured fields from each encounter in a single display. The view is read-only and is generated from the structured field values recorded during each encounter; it is not a separate data entry surface. The view supports clinical decision-making by surfacing trends that may not be apparent in individual encounter documentation.

Longitudinal comparison is also the basis for treatment response assessment. A patient with major depressive disorder whose PHQ-9 score is tracked across encounters allows the psychiatrist to assess response to treatment and to adjust the treatment plan accordingly. The overlay includes default longitudinal views for common psychiatric conditions, with the views configurable through the reporting module's standard configuration surface.

### 4.4 Documentation Governance

MSE documentation is governed by the same audit and versioning rules as all clinical documentation in Ibn Hayan. Each MSE record is versioned; corrections are recorded as new versions with the original retained for audit. Each MSE record is associated with the encounter in which it was recorded, with the patient for whom it was recorded, and with the psychiatrist who recorded it. Access to MSE records is governed by the behavioural-health record segregation rules described in Section 12 of this document; access is logged in the audit trail per Principle P13 (Auditability as Primitive) stated in Section 4.13 of `SYSTEM_ARCHITECTURE.md`.

---

## 5. Psychiatric Medication Management

### 5.1 Psychotropic Medication Catalogue

The psychiatric medication catalogue is a curated subset of the platform's medication catalogue, organized by psychotropic class: antidepressants (SSRIs, SNRIs, TCAs, MAOIs, atypical), antipsychotics (typical, atypical), mood stabilizers (lithium, anticonvulsants used as mood stabilizers), anxiolytics and hypnotics (benzodiazepines, non-benzodiazepine hypnotics), stimulants and non-stimulant ADHD medications, and medications for substance use disorders (opioid agonists, antagonist preparations). Each medication entry includes the standard medication attributes (name, strength, form, route) and psychiatric-specific attributes (monitoring requirements, boxed warnings, pregnancy category, controlled substance schedule where applicable).

The catalogue is maintained by the platform and is updated when new medications are approved or when monitoring requirements change. Updates are versioned and communicated to affected customers through the change-management channel. Customers may add customer-specific medications through the configuration surface, with additions subject to the standard validation rules and recorded in the audit trail. Customer-specific medications do not replace platform catalogue entries; they supplement them.

### 5.2 Medication Monitoring

Several psychotropic medications require ongoing laboratory or clinical monitoring. Clozapine requires absolute neutrophil count monitoring under a risk evaluation and mitigation protocol. Lithium requires serum lithium level monitoring, renal function monitoring, and thyroid function monitoring. Valproate requires liver function monitoring and complete blood count monitoring. Stimulants require cardiovascular monitoring for patients with cardiac risk factors. The Ibn Hayan psychiatry overlay ships default monitoring protocols for each of these medications, with the protocols configured as order sets that the psychiatrist activates when prescribing the medication.

The monitoring protocol is enforced through clinical decision support: when a medication with a monitoring requirement is prescribed, the corresponding monitoring order is suggested, and the prescription cannot be finalized without addressing the monitoring suggestion (accepting, deferring with documented rationale, or declining with documented rationale). The enforcement is configured, not hard-coded; the customer may adjust the enforcement level through the configuration surface, with adjustments subject to the validation rules and recorded in the audit trail. The enforcement level cannot be reduced below the regional regulatory minimum, which is enforced at the platform layer.

### 5.3 Controlled Substance Prescribing

Psychiatry includes controlled substance prescribing for several classes: benzodiazepines for anxiety and insomnia, stimulants for ADHD, opioid agonists for opioid use disorder, and barbiturates for select indications. Controlled substance prescribing is governed by the pharmacy module (M05) with the controlled substance tracking that is a platform-level invariant per Section 8.3 of `CLINIC_TYPES.md`. The tracking includes the prescribing physician, the patient, the medication, the quantity, the days' supply, and the regional regulatory-required fields; the tracking is recorded in the audit trail and is available for regulatory reporting.

Controlled substance prescribing is subject to additional configuration through the regional configuration pack: prescription format requirements, prescription quantity limits, refill restrictions, and prescription monitoring programme reporting. The regional configuration pack is versioned alongside the platform's regional regulatory framework and is updated when regional regulations change. The customer's system administrator is responsible for activating the correct regional configuration pack for each facility; activation is recorded in the audit trail.

### 5.4 Polypharmacy and Drug Interaction Checking

Psychiatric patients are frequently prescribed multiple psychotropic medications, and polypharmacy is a routine clinical reality rather than an exception. The Ibn Hayan psychiatry overlay supports polypharmacy through drug interaction checking that is tuned to psychiatric concerns: QT prolongation risk with combined antipsychotics, serotonin syndrome risk with combined serotonergic medications, sedation risk with combined central nervous system depressants, and metabolic risk with combined atypical antipsychotics. The interaction checks are configured through the pharmacy module's clinical decision support surface, with severity levels and recommended actions defined per interaction.

Drug interaction checking is performed at prescription time and is re-evaluated when new medications are added, when existing medications are discontinued, and when over-the-counter medications or supplements are documented. The interaction checks are advisory; the psychiatrist may override an interaction warning with documented rationale, and the override is recorded in the audit trail. The advisory posture respects clinical judgement while ensuring that the psychiatrist is informed of the interaction; it does not substitute the platform's judgement for the physician's.

---

## 6. Therapy Session Notes

### 6.1 Therapy Session Documentation Structure

Therapy session notes document the psychotherapeutic encounter and differ in structure from medication management encounter notes. The Ibn Hayan psychiatry overlay ships a therapy session note template organized into the standard sections: session type (individual, group, family), participants, presenting concerns, therapeutic interventions used, patient response, progress toward treatment plan goals, plan for next session, and risk assessment update. The template supports both structured fields (for billable elements and quality metrics) and qualitative free text (for the therapeutic narrative).

The therapy session note template is encounter-type-aware: the individual therapy template includes individual-specific elements (transference observations, homework assigned), the group therapy template includes group-specific elements (group composition, group dynamics, individual participation), and the family therapy template includes family-specific elements (family members present, family interaction patterns, systemic observations). The encounter type is selected at encounter creation; the appropriate template is applied automatically based on the encounter type.

### 6.2 Treatment Plan Integration

Therapy session notes are integrated with the patient's treatment plan, with each session's progress documented against the treatment plan's goals and objectives. The treatment plan is a structured document that defines the diagnosis, the treatment goals (e.g., reduce depressive symptoms, improve interpersonal functioning), the objectives for each goal (e.g., PHQ-9 score reduction of 50% within 12 weeks), and the interventions planned to achieve the objectives. The treatment plan is created at the initial evaluation and is reviewed at configured intervals (typically every 90 days, with the interval configurable through the configuration surface).

The integration ensures that therapy session notes contribute to treatment plan review: the progress documented in each session is aggregated at treatment plan review, allowing the psychiatrist to assess whether the treatment plan is achieving its goals. The aggregation is performed through the reporting module (M18) and is presented in the treatment plan review view. The integration also supports treatment plan modification: when progress is insufficient, the treatment plan is revised with the revision documented and the previous version retained for audit.

### 6.3 Therapy Modality Documentation

Different therapeutic modalities require different documentation elements. Cognitive behavioural therapy documentation includes the cognitive distortions addressed, the homework assigned, and the behavioural experiments planned. Psychodynamic therapy documentation includes the transference and countertransference observations, the resistances identified, and the interpretations offered. Dialectical behaviour therapy documentation includes the skills taught, the diary card review, and the therapy-interfering behaviours addressed. The Ibn Hayan psychiatry overlay ships modality-specific documentation addenda that supplement the standard therapy session note template, with the addenda activated when the modality is selected for the encounter.

Modality-specific documentation is a configuration choice, not a code change. Customers may add modality-specific addenda through the configuration surface, with additions subject to the standard validation rules. The platform's catalogue of modality-specific addenda is reviewed when the overlay is revised and is expanded when new evidence-based modalities emerge. Expansion of the catalogue follows the platform's documented intake process for clinic type overlay enhancements.

### 6.4 Group and Family Therapy

Group and family therapy present documentation challenges that individual therapy does not. Group therapy requires the documentation of each participant's attendance and individual contribution within the group encounter; family therapy requires the documentation of multiple participants within a single encounter. The Ibn Hayan psychiatry overlay supports group and family therapy through the encounter module's multi-participant capability, with each participant's contribution documented within a single encounter record. The encounter is linked to each participant's patient record, with the linkage recorded in the audit trail.

Multi-participant encounter documentation is subject to additional consent requirements: each participant must consent to the encounter and to the documentation that includes their participation. The consent is documented through the consent management capability of the patient module (M01) and is recorded before the encounter begins. The consent documentation is itself auditable; access to the encounter record requires the appropriate consent on file for each participant whose data is accessed.

---

## 7. Risk Assessment & Safety Planning

### 7.1 Suicide Risk Assessment

Suicide risk assessment is a routine and consequential activity in psychiatry. The Ibn Hayan psychiatry overlay ships a structured suicide risk assessment template based on established frameworks (Columbia Suicide Severity Rating Scale, Scale for Suicide Ideation), with structured fields for suicidal ideation, intent, plan, means, prior attempts, and protective factors. The assessment produces a risk level (low, moderate, high) that drives the recommended next steps, with the recommendation presented to the psychiatrist as clinical decision support.

The risk assessment is triggered by structured fields in the mental status examination (positive response to suicidal ideation), by free-text documentation that includes risk-related terms, and by scheduled review for patients with prior risk assessments. The triggers are configured through the configuration surface; the customer may add or remove triggers, with changes recorded in the audit trail. The triggers cannot be removed for patients with a documented high risk level; this restriction is a platform-level invariant that prevents the customer from disabling risk assessment for the highest-risk patients.

### 7.2 Violence Risk Assessment

Violence risk assessment evaluates the patient's risk of harm to others. The overlay ships a structured violence risk assessment template based on established frameworks (HCR-20, Violence Risk Appraisal Guide), with structured fields for historical risk factors, clinical risk factors, and risk management factors. The assessment produces a risk level that drives recommended next steps, with the recommendation presented to the psychiatrist as clinical decision support. The violence risk assessment is triggered by structured fields in the mental status examination (positive response to homicidal ideation) and by free-text documentation that includes risk-related terms.

The documentation of violence risk assessment is subject to additional confidentiality considerations: the assessment's contents may be subject to disclosure requirements if a duty-to-warn or duty-to-protect obligation is triggered by regional law. The overlay's regional configuration pack addresses these obligations through documentation templates that capture the information required for disclosure while preserving the patient-physician privilege for information not subject to disclosure. The documentation is auditable, with access logged in the audit trail.

### 7.3 Safety Planning

Safety planning is the structured intervention that follows a positive risk assessment. The overlay ships a safety planning template based on the Stanley-Brown Safety Planning Intervention, with structured fields for warning signs, internal coping strategies, social contacts and settings for distraction, people to ask for help, professionals and agencies to contact during a crisis, and means restriction. The safety plan is a patient-owned document; the patient is provided with a copy, and the plan is reviewed and updated at configured intervals or when the patient's clinical status changes.

Safety planning is integrated with the patient's treatment plan, with the safety plan referenced in the treatment plan's risk management section. The integration ensures that the safety plan is not a standalone document but is part of the patient's overall care. The safety plan is also integrated with the patient's crisis resources, with the crisis hotline number and the patient's designated emergency contact presented in the patient's record for rapid access during a crisis.

### 7.4 Involuntary Commitment Documentation

Involuntary commitment is the legal process by which a patient is hospitalized for psychiatric treatment without their consent. The overlay ships involuntary commitment documentation templates that capture the clinical basis for commitment (danger to self, danger to others, grave disability), the examination findings that support the basis, the physician's certification, and the legal forms required by the regional regulatory framework. The templates are configured through the regional configuration pack and are versioned alongside the regional regulatory framework.

Involuntary commitment documentation is subject to additional audit and retention requirements. The documentation is retained for the period required by regional law, with retention enforced at the platform layer and not customer-modifiable. Access to the documentation is restricted to authorized personnel, with access logged in the audit trail. The documentation is produced through a structured workflow that records each step: examination, certification, form completion, submission to legal authority, and follow-up.

---

## 8. Specialty Workflows

### 8.1 Workflow Inventory

The Ibn Hayan psychiatry overlay ships a default set of workflows tuned to psychiatric practice. The workflows are defined declaratively through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md` Section 2. Customers may adopt, modify, or replace workflows within the workflow engine's configuration framework, subject to the edition-specific depth limits stated in `EDITIONS.md` Section 11.

| Workflow | Code | Trigger | Key Steps | Outcome |
|---|---|---|---|---|
| Initial psychiatric evaluation | PW1 | Scheduled appointment | Patient check-in, consent, evaluation encounter, MSE, risk assessment, diagnosis, treatment plan, follow-up scheduling | Evaluation documented; treatment plan created |
| Medication management follow-up | PW2 | Scheduled appointment | Patient check-in, follow-up encounter, symptom review, medication review, side effect assessment, prescription, next appointment | Follow-up documented; prescription recorded |
| Therapy session | PW3 | Scheduled appointment | Patient check-in, therapy encounter, modality documentation, progress note, treatment plan update | Session documented; treatment plan updated |
| Risk assessment and safety planning | PW4 | Trigger (positive ideation or scheduled review) | Risk assessment, safety plan creation or update, disposition decision, documentation | Risk documented; safety plan in place |
| Involuntary commitment | PW5 | Clinical decision | Examination, certification, legal form completion, submission, follow-up | Commitment documented; legal process initiated |
| Treatment plan review | PW6 | Scheduled interval (e.g., 90 days) | Progress aggregation, goal review, objective review, plan revision, patient acknowledgement | Treatment plan reviewed; revision documented |
| Medication monitoring lab follow-up | PW7 | Lab result arrival | Result review, comparison to monitoring threshold, patient contact if abnormal, documentation | Monitoring documented; abnormal result addressed |
| Crisis intervention | PW8 | Patient presentation or referral | Triage, crisis assessment, stabilization intervention, disposition (admit, refer, discharge), documentation | Crisis managed; disposition documented |

### 8.2 Workflow Customization

Workflows may be customized through the workflow engine's configuration surface, subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The customization posture is a direct consequence of Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md`.

Customization examples include adding regional involuntary commitment forms to the commitment workflow, adjusting the treatment plan review interval based on the patient population, and adding customer-specific crisis intervention protocols to the crisis intervention workflow. Each customization is applied as a facility-level or department-level override, with the underlying platform-provided workflow retained unchanged.

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The data entities referenced by the psychiatry clinic type overlay are conceptual; this section describes the entities by name and relationship, not by implementation. Database schemas, persistence models, and data access patterns are out of scope for this document per the metadata table above and are addressed in module-specific documentation.

The psychiatry overlay references the following conceptual entities: Patient, Encounter, Clinical Documentation Record, Mental Status Examination Record, Risk Assessment Record, Safety Plan, Treatment Plan, Medication Order, Medication Administration Record, Laboratory Order, Laboratory Result, Prescription, Controlled Substance Dispense Record, Therapy Session Note, Group Therapy Participant Record, Involuntary Commitment Record, and Consent Record. Each entity is owned by a bounded context defined in Section 7 of `SYSTEM_ARCHITECTURE.md`; the psychiatry overlay composes these entities into psychiatric-specific workflows and documentation structures.

### 9.2 Entity Relationships

The Patient entity is the central reference: every other entity is associated with a Patient. The Encounter entity is associated with a Patient and with one or more Clinical Documentation Records, each of which may be a Mental Status Examination Record, a Therapy Session Note, or a general clinical note. The Treatment Plan entity is associated with a Patient and is referenced by the Clinical Documentation Records that document progress against the plan. The Risk Assessment Record and Safety Plan entities are associated with a Patient and may be associated with an Encounter; they persist beyond the Encounter and form the patient's longitudinal risk profile.

The Medication Order entity is associated with a Patient, an Encounter (typically), and a Prescriber; the Medication Administration Record is associated with a Medication Order and a Patient. The Laboratory Order entity is associated with a Patient, an Encounter (typically), and a Prescriber; the Laboratory Result is associated with the Laboratory Order and is associated with the monitoring protocol that triggered the order. The Prescription entity is associated with a Patient, a Prescriber, and (for controlled substances) a Controlled Substance Dispense Record.

### 9.3 Behavioural-Health Record Segregation

The behavioural-health record segregation model is a conceptual entity relationship that segregates behavioural-health documentation from general medical documentation. The segregation is enforced at the platform layer per Section 8.3 of `CLINIC_TYPES.md` and is not customer-modifiable. Access to segregated documentation requires explicit consent (separate from general medical consent) and is logged in the audit trail per Principle P13 (Auditability as Primitive) stated in Section 4.13 of `SYSTEM_ARCHITECTURE.md`.

The segregation model is implemented through access control rules that govern which users may access which documentation categories. The rules are configured through the permission framework and are versioned alongside the customer's configuration. The rules cannot be relaxed below the regional regulatory minimum, which is enforced at the platform layer. The segregation model applies to all behavioural-health documentation, including psychiatric evaluation, therapy session notes, risk assessment records, and treatment plans.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

The psychiatry overlay ships encounter templates for the encounter types common in psychiatric practice: initial psychiatric evaluation, medication management follow-up, therapy session (individual, group, family), crisis intervention, and telehealth encounter. Each template defines the documentation sections required, the structured fields included, the order sets suggested, and the workflow steps associated with the encounter type. Templates are versioned alongside the overlay and are reviewed when the overlay is revised.

Encounter templates are configured through the clinical documentation module (M03) and are subject to the standard validation rules. Customers may refine templates through the configuration surface at the facility, department, or care-team layer, with refinements recorded as overrides on the platform-provided template. Customers may not modify the platform-provided template's underlying definition; this restriction preserves the overlay's coherence and is stated in Section 5.4 of `CLINIC_TYPES.md`.

### 10.2 Documentation Templates

Documentation templates support the structured capture of clinical information beyond the encounter itself. The psychiatry overlay ships the following documentation templates: mental status examination, suicide risk assessment, violence risk assessment, safety plan, treatment plan, involuntary commitment documentation, and medication monitoring protocol. Each template is configured through the clinical documentation module and is subject to the standard validation, versioning, and audit rules.

| Template | Purpose | Mandatory Sections | Configurable Fields |
|---|---|---|---|
| Mental Status Examination | Structured psychiatric assessment | All MSE sections | Field inclusion, scale selection |
| Suicide Risk Assessment | Suicide risk evaluation | Ideation, intent, plan, means, prior attempts, protective factors | Scale selection, risk level thresholds |
| Violence Risk Assessment | Violence risk evaluation | Historical, clinical, risk management factors | Tool selection, risk level thresholds |
| Safety Plan | Crisis safety planning | Warning signs, coping strategies, contacts, means restriction | Section inclusion, contact categories |
| Treatment Plan | Treatment planning | Diagnosis, goals, objectives, interventions, review schedule | Goal library, objective templates |
| Involuntary Commitment | Legal documentation | Examination findings, certification, legal forms | Regional form selection |
| Medication Monitoring Protocol | Laboratory monitoring | Monitoring tests, frequency, threshold values | Test selection, frequency, thresholds |

### 10.3 Consent Forms

Consent forms are a distinct template category given the consent specificity required in behavioural health. The psychiatry overlay ships consent form templates for general psychiatric treatment, medication-specific consent (for high-risk medications such as clozapine, where regional regulation requires specific consent), group therapy consent, family therapy consent, telehealth consent, and behavioural-health record release consent. Each consent form template is configured through the patient module's consent management capability and is versioned alongside the regional configuration pack.

Consent forms are signed by the patient (or legal guardian for minor patients and patients under guardianship) and are recorded in the patient's consent record. The consent record is the basis for access control: a documentation category that requires specific consent cannot be accessed without the consent on file. The consent record is auditable; consent withdrawal is recorded with the withdrawal date and the effect on subsequent access.

### 10.4 Patient-Facing Materials

The psychiatry overlay ships a library of patient-facing materials that the psychiatrist may provide to patients: medication information sheets (for common psychotropic medications), diagnosis education sheets (for common psychiatric diagnoses), sleep hygiene guides, relaxation technique guides, and crisis resource lists. The materials are configured through the documents module (M07) and are versioned alongside the overlay. The materials are available in the languages supported by the customer's regional configuration pack; translation is performed through the localization module (M19) and is governed by the platform's localization strategy stated in Section 24 of `PRODUCT_BIBLE.md`.

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

Clinical outcome reports support the psychiatrist's assessment of treatment response and the patient's progress toward treatment plan goals. The psychiatry overlay ships default clinical outcome reports including the longitudinal symptom tracking report (presenting PHQ-9, GAD-7, and other standardized scale scores across encounters), the medication response report (presenting symptom scores in relation to medication changes), the treatment plan progress report (presenting progress against treatment plan goals and objectives), and the risk assessment history report (presenting the patient's risk assessments over time). Each report is configured through the reporting module (M18) and is generated from the structured field values recorded during encounters.

Clinical outcome reports respect the behavioural-health record segregation rules: reports that include segregated documentation are accessible only to authorized users, with access logged in the audit trail. Reports are generated on demand and on configured schedules, with the schedule configured through the reporting module's standard configuration surface. Reports are versioned; a report generated on a previous date is preserved and can be retrieved for audit or clinical review.

### 11.2 Operational Reports

Operational reports support the practice's management and quality improvement activities. The psychiatry overlay ships default operational reports including the appointment adherence report (no-show rate, cancellation rate, late arrival rate), the encounter volume report (encounters by type, by psychiatrist, by time period), the documentation completion report (encounters with incomplete documentation, by psychiatrist), and the medication monitoring compliance report (patients with overdue monitoring labs). Each report is configured through the reporting module and is generated from operational data.

Operational reports are typically accessed by practice administrators and clinical leads rather than by individual psychiatrists. Access is governed by the permission framework, with the customer's system administrator responsible for configuring access based on the practice's organizational structure. Reports that include individual psychiatrist performance data are subject to additional access restrictions; access is logged in the audit trail.

### 11.3 Regulatory Reports

Regulatory reports support the practice's compliance with regional regulatory requirements. The psychiatry overlay ships default regulatory reports including the controlled substance prescribing report (prescriptions by physician, by patient, by medication, by time period), the involuntary commitment report (commitments by physician, by basis, by time period), the behavioural-health record access report (access by user, by patient, by time period), and the reportable condition report (cases reportable to public health authorities, where applicable). Each report is configured through the regional configuration pack and is updated when regional regulations change.

Regulatory reports are generated on the schedule required by regional regulation, with the schedule configured through the regional configuration pack. Reports are submitted to the appropriate regulatory authority through the integration module (M17) where electronic submission is supported by the regulatory authority, or are exported in the format required for manual submission. Submission is recorded in the audit trail, with the submission time, the submitting user, and the report contents preserved.

### 11.4 Quality Improvement Reports

Quality improvement reports support the practice's quality improvement activities. The psychiatry overlay ships default quality improvement reports including the screening rate report (percentage of patients screened for depression, anxiety, suicide risk), the monitoring compliance report (percentage of patients on monitored medications with up-to-date monitoring), the treatment plan review compliance report (percentage of treatment plans reviewed on schedule), and the patient outcome aggregate report (aggregate patient outcomes by diagnosis, by treatment). Each report is configured through the reporting module and is generated from clinical and operational data.

Quality improvement reports are reviewed at configured intervals by the practice's quality improvement committee or equivalent. The review is documented, and the resulting quality improvement actions are tracked through the platform's task management capability. Quality improvement reports are subject to the same access controls as other reports; access is governed by the permission framework and is logged in the audit trail.

---

## 12. Privacy & Confidentiality Considerations

### 12.1 Behavioural-Health Record Segregation

Behavioural-health record segregation is the platform-level invariant that governs access to psychiatric and other behavioural-health documentation. The segregation is enforced at the platform layer per Section 8.3 of `CLINIC_TYPES.md` and is not customer-modifiable; customers cannot relax the segregation below the regional regulatory minimum. The segregation applies to all behavioural-health documentation, including psychiatric evaluation, therapy session notes, risk assessment records, treatment plans, and involuntary commitment documentation.

The segregation is implemented through access control rules that govern which users may access which documentation categories. The rules are configured through the permission framework and are versioned alongside the customer's configuration. The rules reference the user's role, the user's relationship to the patient (treating physician, covering physician, consultant), the documentation category, and the patient's consent record. Access is logged in the audit trail, with the user, the time, the patient, and the documentation accessed recorded for each access event.

### 12.2 Consent Specificity

Consent in psychiatry is more specific than in general medical practice. A patient may consent to general psychiatric treatment but not to specific high-risk medications; a patient may consent to individual therapy but not to group therapy; a patient may consent to behavioural-health treatment but not to release of behavioural-health records to a third party. The Ibn Hayan psychiatry overlay supports consent specificity through the patient module's consent management capability, with consent categories that match the specificity required by regional regulation and clinical practice.

Consent categories are configured through the regional configuration pack and are versioned alongside the regional regulatory framework. A consent record includes the patient, the consent category, the consent status (granted, withdrawn, expired), the consent date, the expiration date (if applicable), and the consent documentation (the signed form or the recorded verbal consent). Consent withdrawal is recorded with the withdrawal date and the effect on subsequent access; documentation that was accessible before withdrawal may not be accessible after withdrawal, depending on the consent category and the regional regulatory framework.

### 12.3 Minor and Guardian Consent

Consent for minor patients and patients under guardianship presents additional complexity. A minor patient's consent for psychiatric treatment may be governed by regional regulation that grants the minor independent consent authority for certain categories of behavioural-health treatment (e.g., substance use treatment in many jurisdictions). A patient under guardianship has consent provided by the guardian, with the guardianship documentation recorded in the patient's record. The psychiatry overlay supports these variations through the consent management capability, with consent categories for minor self-consent, guardian consent, and court-ordered treatment.

Consent for minor and guardian patients is recorded in the patient's consent record, with the consent authority documented (patient, parent, guardian, court). The consent authority is verified at encounter creation; an encounter for a minor patient without the appropriate consent authority on file is flagged for resolution before the encounter proceeds. The verification is configured through the consent management capability's standard configuration surface, with the configuration reflecting the regional regulatory framework.

### 12.4 Record Retention and Disposal

Behavioural-health records are subject to record retention requirements that differ from general medical records in many jurisdictions. The retention period is typically longer for behavioural-health records and may be indefinite for certain categories (e.g., involuntary commitment records in some jurisdictions). The Ibn Hayan platform supports record retention through the platform's records management capability, with retention rules configured through the regional configuration pack and enforced at the platform layer.

Record disposal is performed only at the end of the retention period and only with documented authorization. Disposal is recorded in the audit trail, with the records disposed, the authorization, and the disposal method documented. Disposal of behavioural-health records is subject to additional verification: the retention period is verified, the absence of legal hold is verified, and the disposal is authorized by the customer's designated records management authority. Disposal is irreversible; once disposed, the records cannot be recovered.

---

## 13. Role & Permission Recommendations

### 13.1 Specialty-Specific Roles

The Ibn Hayan psychiatry overlay recommends the following role assignments for psychiatric practice, building on the role catalogue defined in `USER_ROLES.md`. Each role is configured with permission scopes that reflect the role's responsibilities and the behavioural-health record segregation rules.

| Role | Code | Specialty Application | Typical Permission Scope |
|---|---|---|---|
| Physician | R01 | Psychiatrist | Full clinical access to own patient panel; behavioural-health record access with patient consent |
| Nurse | R02 | Psychiatric nurse | Clinical access to assigned patients; medication administration; behavioural-health record access with patient consent |
| Physician assistant / Advanced practice nurse | R03 | Psychiatric APP | Clinical access under supervising psychiatrist; prescribing per scope |
| Medical assistant | R04 | Psychiatric medical assistant | Limited clinical access; rooming, vitals, structured screening administration |
| Allied health professional | R05 | Psychologist, social worker, counsellor | Therapy session documentation; behavioural-health record access with patient consent |
| Patient | R06 | Psychiatric patient | Portal access to own record, appointments, secure messaging |
| Patient family / Caregiver | R07 | Family member or caregiver | Limited portal access with patient authorization |
| Billing specialist | R08 | Psychiatric billing specialist | Billing and claims access; no clinical access |
| Facility administrator | R09 | Practice administrator | Administrative access; no clinical access |
| Customer administrator | R10 | Customer system administrator | Configuration and user management; no clinical access |
| Auditor | R11 | Compliance auditor | Read-only access to audit trail and compliance reports |
| Support engineer | R12 | Implementation consultant | Configuration access during implementation; no production clinical access |

### 13.2 Permission Defaults

Permission defaults are configured to enforce the behavioural-health record segregation rules and to support the principle of least privilege. A psychiatrist has full clinical access to their own patient panel, with access to other psychiatrists' patients restricted to covering arrangements. A psychiatric nurse has clinical access to assigned patients, with access to medication administration records but not to prescribing. A psychologist has therapy session documentation access, with access to the patient's behavioural-health record but not to medication prescribing or medical order entry.

Permission defaults are versioned alongside the customer's configuration and are subject to the standard validation rules. Defaults may be refined at the facility, department, care-team, or user layer, with refinements recorded as overrides. Defaults cannot be relaxed below the regional regulatory minimum, which is enforced at the platform layer. Access to behavioural-health records requires explicit consent on file, with the consent verification performed at access time.

### 13.3 Covering Arrangement Permissions

Covering arrangements — where one psychiatrist covers another's patients during absence — require temporary permission grants that respect the behavioural-health record segregation rules. The Ibn Hayan platform supports covering arrangements through the permission framework's time-bounded permission grant capability, with the grant configured with a start date, an end date, and the patient panel covered. The grant is recorded in the audit trail, with the granting user, the receiving user, the patient panel, and the time period documented.

Covering arrangement permissions are subject to additional verification: the receiving psychiatrist must have the appropriate credentials for the clinic type, the patient panel must be within the same customer and facility, and the consent on file must permit access by the covering physician. Where consent does not permit access by the covering physician, the covering arrangement is flagged for resolution before access is granted; in emergency situations, emergency access may be granted with the access documented for retrospective review.

---

## 14. Configuration Defaults

### 14.1 Encounter Configuration Defaults

The psychiatry overlay ships encounter configuration defaults tuned to psychiatric practice. Default appointment durations are 90 minutes for initial evaluation, 50 minutes for therapy sessions, 20 minutes for medication management follow-up, and 30 minutes for crisis intervention. Default encounter templates are configured per encounter type, with the template selection automated based on the encounter type selected at scheduling. Default documentation completion expectation is set to within 24 hours of the encounter, with the expectation configurable through the configuration surface.

Encounter configuration defaults are starting points; customers may refine them through the configuration surface at the facility, department, or care-team layer. Refinements are subject to the standard validation rules and are recorded in the audit trail. Defaults are reviewed when the overlay is revised and are updated to reflect evolving practice patterns and regulatory requirements.

### 14.2 Documentation Configuration Defaults

Documentation configuration defaults include the structured field sets for each documentation template, the validation rules that govern documentation completion, and the longitudinal view configurations that present documentation across encounters. Default structured field sets include all fields required by the regional regulatory framework and the clinical standard of care, with optional fields available for activation by the customer. Default validation rules require completion of mandatory sections before the encounter can be closed, with the mandatory sections configured per encounter type.

Documentation configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add fields through the configuration surface, with additions subject to the standard validation rules. Customers may not remove fields that are required by the regional regulatory framework; this restriction is enforced at the platform layer and is not customer-modifiable.

### 14.3 Notification Configuration Defaults

Notification configuration defaults include appointment reminders (sent 24 hours and 1 hour before the appointment), medication monitoring reminders (sent when monitoring is due), lab result notifications (sent when results are available), and treatment plan review reminders (sent when the review is due). Each notification is configured with the channel (in-app, email, SMS, or patient portal message), the timing, the template, and the recipient. Defaults are tuned to the patient population's preferences, with the customer able to refine defaults through the configuration surface.

Notification configuration respects the behavioural-health record segregation rules: notifications that include behavioural-health information are sent only through channels that the patient has authorized for behavioural-health communication. The authorization is recorded in the patient's consent record, with the authorization verified at notification time. Notifications that include behavioural-health information are subject to additional confidentiality protections, including the absence of behavioural-health content in the notification subject line.

### 14.4 Reporting Configuration Defaults

Reporting configuration defaults include the default report set described in Section 11 of this document, with each report configured with the default parameters (time period, population, dimensions) and the default delivery schedule. Customers may refine report parameters and schedules through the configuration surface, with refinements recorded in the audit trail. Reports are subject to the same access controls as other behavioural-health documentation; access is governed by the permission framework and is logged in the audit trail.

---

## 15. Onboarding Checklist

### 15.1 Onboarding Workflow Stages

The onboarding workflow for psychiatry follows the eight-stage process defined in Section 9 of `CLINIC_TYPES.md`, with stage durations scaled to the psychiatry overlay's medium configuration complexity. The indicative onboarding timeline is 3–4 weeks for a typical psychiatry practice, with longer timelines for hospital-based departments and for customers transitioning from paper-based or basic electronic systems.

| Stage | Code | Activity | Owner | Indicative Duration |
|---|---|---|---|---|
| Clinic type selection | O1 | Confirm psychiatry clinic type at facility | Customer administrator | 1 day |
| Overlay activation | O2 | Apply psychiatry overlay to facility configuration | Customer administrator | 1 day |
| Module enablement | O3 | Enable core modules; assess optional modules | Customer administrator | 2 days |
| Configuration refinement | O4 | Refine encounter templates, documentation templates, role permissions | Customer administrator with clinical lead | 1–2 weeks |
| Validation | O5 | Sandbox testing with representative scenarios | Customer clinical lead | 3–5 days |
| User provisioning | O6 | Provision users with psychiatric-appropriate roles | Customer administrator | 2 days |
| Operational readiness | O7 | Operational readiness assessment; first encounter targeted | Customer clinical lead with Ibn Hayan customer success | 2–3 days |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle updated | Customer administrator | 1 day |

### 15.2 Pre-Onboarding Preparation

Before onboarding begins, the customer should complete the following preparation activities: confirm facility licensing for psychiatric practice, confirm regional regulatory framework applicability, gather existing clinical documentation templates for review, identify the clinical lead who will validate the configuration, and confirm the patient population and anticipated encounter volume. The preparation activities are not gating; onboarding may begin before all activities are complete, but activities should be completed before the validation stage to avoid rework.

### 15.3 Onboarding Validation Activities

Onboarding validation activities include: configuration validation per Section 15.4 of `SYSTEM_ARCHITECTURE.md`; workflow validation through testing each configured workflow against representative scenarios; user acceptance testing through clinicians performing representative tasks in the sandbox; and operational readiness assessment through a structured review of the configuration against the customer's operational reality. Validation results are documented and are required for the go-live stage transition.

### 15.4 Post-Onboarding Activities

Post-onboarding activities include: ongoing configuration governance per the customer's configuration governance process; periodic review of operational reports and quality improvement reports; periodic review of regulatory reports and submission to regulatory authorities; and participation in the platform's change-management process for overlay revisions and regional configuration pack updates. Post-onboarding activities are ongoing; they do not have a defined end date.

---

## 16. Sample Use Cases

### 16.1 Initial Psychiatric Evaluation

A new patient presents for an initial psychiatric evaluation following referral from primary care for evaluation of depressive symptoms. The patient is scheduled for a 90-minute initial evaluation encounter. At check-in, the patient completes the consent forms (general psychiatric treatment consent, behavioural-health record segregation consent). The psychiatrist conducts the evaluation, documenting the psychiatric interview and the mental status examination through the structured templates. A suicide risk assessment is triggered by positive response to suicidal ideation in the mental status examination; the assessment is completed, and a safety plan is created. A diagnosis is documented, and a treatment plan is created with goals and objectives. A prescription for an antidepressant is issued, with monitoring protocol activated (none required for the prescribed medication). A follow-up appointment is scheduled for two weeks later for medication management follow-up.

### 16.2 Medication Management with Clozapine Monitoring

A patient with treatment-resistant schizophrenia is initiated on clozapine. The psychiatrist prescribes clozapine through the medication management workflow, with the clozapine monitoring protocol activated. The protocol includes baseline absolute neutrophil count, weekly absolute neutrophil count for the first six months, biweekly for the next six months, and monthly thereafter (per regional regulatory framework). The laboratory orders are configured through the medication monitoring protocol and are scheduled automatically. When each laboratory result arrives, the result is reviewed against the monitoring threshold; if the result is below the threshold, the patient is contacted, the medication is held, and the documentation is recorded.

### 16.3 Group Therapy Encounter

A group therapy session is conducted for patients with major depressive disorder. The encounter is created as a group encounter, with the eight participants added to the encounter. Each participant's attendance is documented, and each participant's contribution is documented within the encounter record. The encounter is linked to each participant's patient record, with the linkage recorded in the audit trail. The therapy session note is documented with group-specific elements (group composition, group dynamics, individual participation). The encounter is closed, and the documentation is added to each participant's behavioural-health record.

### 16.4 Involuntary Commitment

A patient presents in crisis and is assessed for involuntary commitment. The psychiatrist conducts the examination, documenting the clinical basis for commitment (danger to self, as evidenced by suicidal ideation with plan and intent). The involuntary commitment documentation template is activated, with the regional regulatory framework's required forms populated from the examination findings. The psychiatrist certifies the commitment, and the legal forms are submitted to the regional legal authority through the integration module (where electronic submission is supported) or are exported for manual submission. The commitment is recorded in the patient's behavioural-health record, with the documentation retained per regional regulatory requirements.

### 16.5 Telehealth Medication Management Follow-Up

A patient in a rural area attends a medication management follow-up via telehealth. The encounter is created as a telehealth encounter, with the telehealth variant of the encounter template applied. The mental status examination is conducted, with the telehealth variant of the MSE template adapting the motor and appearance sections to the constraints of remote observation. The medication is reviewed, with the patient reporting adequate response and tolerable side effects. The prescription is renewed, with the controlled substance prescribing rules applied (if the medication is a controlled substance). The follow-up appointment is scheduled for one month later.

### 16.6 Treatment Plan Review

A patient's treatment plan is due for review at the 90-day interval. The treatment plan review workflow is triggered, with the progress documented in each session since the last review aggregated through the reporting module. The psychiatrist reviews the progress against the treatment plan goals and objectives, with the longitudinal symptom tracking report and the medication response report presented for review. The treatment plan is revised based on the review, with the revision documented and the previous version retained for audit. The patient acknowledges the revised treatment plan, with the acknowledgement recorded in the patient's behavioural-health record.

---

## 17. Best Practices

### 17.1 Configuration Governance Best Practices

Establish a configuration governance process before onboarding begins. The process should define who is authorized to make configuration changes, how changes are tested before production application, how changes are documented, and how changes are reviewed retrospectively. The Ibn Hayan platform provides the tools (configuration sandbox, configuration validation, configuration versioning, configuration audit) but does not impose the governance workflow; the customer is responsible for the workflow. A configuration governance process that is documented and followed is the single most important determinant of a stable production configuration.

Review the configuration at configured intervals (typically quarterly for psychiatry) and after any significant operational change (new practitioner joining, new service line added, regulatory change). The review should assess whether the configuration continues to match the practice's operational reality and whether refinements are needed. Document the review and the resulting actions, with the documentation preserved for audit.

### 17.2 Documentation Discipline Best Practices

Complete documentation at the time of the encounter wherever possible. Documentation completed after the encounter is more prone to error and omission, and delayed documentation is a frequent source of compliance findings. The Ibn Hayan platform's documentation completion expectation (default 24 hours for psychiatry) is a configuration that supports this practice, with the configuration enforced through the documentation completion report.

Use structured fields rather than free text wherever the documentation template provides structured fields. Structured fields support longitudinal comparison, clinical decision support, and reporting; free text does not. Free text remains valuable for the qualitative narrative that structured fields cannot capture, but the structured fields should be completed first, with the free text supplementing rather than replacing them.

### 17.3 Risk Assessment Best Practices

Conduct risk assessment at every encounter where the patient's clinical status may have changed. Risk assessment is not a one-time activity; it is an ongoing assessment that should be repeated whenever clinically indicated. The Ibn Hayan platform's risk assessment triggers support this practice, with the triggers configurable through the configuration surface. Configure triggers to match the practice's clinical judgement, with the triggers complementing rather than replacing clinical assessment.

Document safety planning as a patient-involved activity, with the patient participating in the development of the safety plan. A safety plan that is developed without patient participation is less likely to be used during a crisis. The Ibn Hayan platform's safety planning template supports patient involvement, with the template's structure guiding the patient and psychiatrist through the safety planning conversation.

### 17.4 Privacy and Confidentiality Best Practices

Verify consent at every encounter, with the verification documented in the encounter record. Consent is not a one-time activity; consent may be withdrawn, may expire, or may not cover the specific encounter type. The Ibn Hayan platform's consent management capability supports this practice, with consent verification performed at encounter creation and recorded in the audit trail.

Limit behavioural-health record access to authorized users with a clinical or operational need. Access by users without a need is a compliance violation and undermines patient trust. The Ibn Hayan platform's permission framework supports this practice, with access governed by role, relationship to the patient, documentation category, and consent on file. Review access logs periodically and address any unauthorized access promptly.

### 17.5 Medication Management Best Practices

Activate monitoring protocols for all medications with monitoring requirements. Monitoring is not optional; it is a clinical and regulatory requirement. The Ibn Hayan platform's monitoring protocol capability supports this practice, with the protocols configured through the medication management workflow and the monitoring orders generated automatically when the medication is prescribed.

Review monitoring results promptly and address abnormal results immediately. Delayed review of monitoring results is a frequent source of patient harm. The Ibn Hayan platform's notification capability supports this practice, with notifications sent when results are available and when results are abnormal. Configure notifications to ensure timely review, with the notifications sent to the prescribing psychiatrist and to the clinical staff responsible for follow-up.

### 17.6 Reporting and Analytics Best Practices

Review clinical outcome reports at configured intervals and use the reports to inform treatment decisions. The reports are not generated for their own sake; they are generated to support clinical decision-making. The Ibn Hayan platform's reporting capability supports this practice, with the reports configured through the reporting module and presented in the longitudinal views.

Review operational reports at configured intervals and use the reports to inform practice management decisions. The reports surface operational patterns that may not be apparent from day-to-day practice, including no-show rates, documentation completion rates, and monitoring compliance rates. Address the patterns identified through the reports, with the actions documented and the effects monitored through subsequent reports.

### 17.7 Onboarding Best Practices

Engage Ibn Hayan customer success or implementation consulting for configuration review during onboarding. The psychiatry overlay's medium configuration complexity warrants configuration review by an experienced implementer, with the review identifying configuration gaps and refinements before go-live. The cost of the review is modest compared to the cost of rework after go-live.

Train all users before go-live, with the training tailored to each user's role. Training is not a one-time activity; it should be repeated for new users and refreshed for existing users when the configuration is revised. Document the training, with the documentation preserved for audit.

### 17.8 Change Management Best Practices

Adopt overlay revisions on a planned schedule rather than reactively. Overlay revisions are communicated in advance, with the revision contents documented and the adoption window defined. Plan the adoption during a period of lower operational tempo, with the adoption tested in the sandbox before production application. Document the adoption, with the documentation preserved for audit.

Participate in the platform's change-management process by providing feedback on overlay revisions and by participating in pilot engagements for new overlay capabilities. Customer participation is the basis of the platform's validated-practice posture stated in Principle P8 (Verified Practice Over Hypothetical Capability) in Section 4.9 of `SYSTEM_ARCHITECTURE.md`. The platform's catalogue expansion and overlay revision processes depend on customer participation.

### 17.9 Telehealth Configuration Best Practices

Configure telehealth encounters with the same documentation rigour as in-person encounters. Telehealth is not a documentation shortcut; the clinical content of the encounter is the same, with the documentation reflecting the clinical content. The Ibn Hayan platform's telehealth encounter template supports this practice, with the template's structure guiding the documentation of the telehealth-specific elements (technology used, patient location, remote observation constraints) alongside the standard clinical elements.

Verify patient identity at the start of each telehealth encounter, with the verification documented in the encounter record. Identity verification is a regulatory requirement in most jurisdictions and is a patient safety practice. The Ibn Hayan platform's encounter workflow supports this practice, with the verification step included in the telehealth encounter template.

### 17.10 Crisis Resource Configuration Best Practices

Configure crisis resources in the patient's record for rapid access during a crisis. Crisis resources include the crisis hotline number, the patient's designated emergency contact, the patient's preferred emergency department, and the patient's advanced directive or psychiatric advanced directive. The Ibn Hayan platform's patient record supports this practice, with the crisis resources configured through the patient module's standard configuration surface and presented in the patient's record for rapid access.

Train all clinical staff on the use of crisis resources, with the training including the configuration of crisis resources in the patient's record and the access of crisis resources during a crisis. The training should be repeated periodically and should be refreshed when the configuration is revised. Document the training, with the documentation preserved for audit.

---

## 18. Related Documents

### 18.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines the psychiatry clinic type (C15); Section 16 (Editions) defines the edition packaging; Section 19 (Product Modules Overview) defines the module catalogue; Section 22 (Configuration-Driven Philosophy) governs customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the platform's behaviour; Section 12 (Clinic Hierarchy) defines the clinic type overlay layer; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; psychiatry is clinic type C15 in the behavioural health family; Section 5 documents the configuration overlay approach; Section 8 documents customization boundaries |

### 18.2 Downstream and Sibling Documents

The following downstream and sibling documents elaborate aspects of psychiatry referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and dependencies |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue and permission scope defaults |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework and access control rules |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine and workflow configuration |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per clinic type |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging and module enablement |
| Patient Module | `docs/07_MODULES/PATIENT.md` | Patient registration, consent management |
| Encounter Module | `docs/07_MODULES/ENCOUNTER.md` | Encounter management, telehealth encounters |
| Clinical Documentation Module | `docs/07_MODULES/CLINICAL_DOCUMENTATION.md` | Documentation templates, structured fields |
| Pharmacy Module | `docs/07_MODULES/PHARMACY.md` | Medication management, controlled substance tracking |
| Mental Health Clinic | `docs/06_CLINIC_TYPES/MENTAL_HEALTH_CLINIC.md` | Sibling behavioural-health clinic type (C28) |
| Substance Use Treatment | `docs/06_CLINIC_TYPES/SUBSTANCE_USE_TREATMENT.md` | Sibling behavioural-health clinic type (C29) |

### 18.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Overlay revisions and regional configuration pack updates are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
