# Ibn Hayan Healthcare Operating System — Clinical Workflows

| Field | Value |
|---|---|
| Document Title | Clinical Workflows |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a clinical workflow amendment, a clinical guideline update, or an ADR is ratified |
| Audience | Clinical informatics officers, software architects, module owners, integration architects, clinical leadership, compliance officers |
| Scope | Clinical workflow catalogue across all specialties and care settings of Ibn Hayan; workflow modeling standard, encounter, pathway, care plan, decision tree, specialty-specific, emergency, chronic disease workflows; customization, validation, analytics |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-workflow serialization syntax, vendor-specific workflow engines |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Clinical workflow definitions in this document elaborate the workflow engine philosophy of SYSTEM_ARCHITECTURE Section 16 and the configuration-driven commitments of PRODUCT_BIBLE Section 22. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Clinical Workflows Overview
2. Workflow Modeling Standard
3. Patient Encounter Workflow
4. Clinical Pathways
5. Care Plan Workflows
6. Clinical Decision Trees
7. Specialty-Specific Workflows
8. Emergency & Urgent Care Workflows
9. Chronic Disease Management Workflows
10. Workflow Customization Framework
11. Workflow Validation & Compliance
12. Workflow Analytics
13. Related Documents

---

## 1. Clinical Workflows Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for clinical workflows used across the Ibn Hayan Healthcare Operating System. A clinical workflow is a coordinated multi-step process that delivers clinical care, governed by a defined sequence of steps, conditions, actors, and outcomes. The platform uses clinical workflows for patient intake, encounters, order fulfilment, result review, prescription, medication administration, procedures, discharge, referrals, care plans, chronic disease management, preventive care, emergency care, and telehealth. The clinical workflow catalogue is part of the platform's contract surface: bounded-context commands, queries, events, and configuration schemas reference clinical workflows by their canonical identifier.

The discipline around clinical workflows reflects the platform's broader posture on workflow and state management (SYSTEM_ARCHITECTURE Sections 16 and 17). A clinical workflow is a configuration artefact governed by the configuration lifecycle; workflows are versioned, validated, and auditable, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. A workflow that requires source-level implementation is not a clinical workflow in the platform's sense; it is a feature. The platform's commitment to configuration before customization (Principle P2) requires that the clinical workflow catalogue be expressive enough to cover the platform's clinical care surface without recourse to source modification.

This document sits below `SYSTEM_ARCHITECTURE.md` and aligns with `PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy), Section 28 (Offline Strategy), and Section 31 (Security Philosophy). Sibling documents include `BUSINESS_RULES.md` (which catalogues the rules that govern workflow transitions), `STATUS_CODES.md` (which catalogues the status codes that workflows transition), and `TERMINOLOGY.md` (which governs the code systems that workflows consume). Where this document and a sibling document appear to overlap, this document holds authority over clinical workflow definitions; BUSINESS_RULES.md holds authority over the conditions that trigger workflow transitions; STATUS_CODES.md holds authority over the status codes that workflows produce.

### 1.2 Clinical Workflows vs Other Workflows

Clinical workflows in Ibn Hayan are distinct from other workflow types. A clinical workflow delivers clinical care and is governed by clinical guidelines, clinical safety requirements, and clinical audit obligations. An operational workflow supports clinical care (for example, scheduling, registration, billing) and is governed by operational requirements. A platform workflow supports platform operation (for example, configuration change, audit investigation, tenant onboarding) and is governed by platform requirements. The three workflow types are governed by different frameworks and are not interchangeable.

The distinction matters because the three workflow types have different safety implications, different audit obligations, and different regulatory exposures. A clinical workflow that fails may compromise patient safety; an operational workflow that fails may compromise operational efficiency; a platform workflow that fails may compromise platform integrity. The discipline of separating them is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the workflow domain. This document covers clinical workflows only; operational and platform workflows are documented in their respective catalogues (referenced in WORKFLOWS.md under `docs/02_PRODUCT/`).

### 1.3 Clinical Workflow Coverage

The clinical workflow catalogue covers all clinical care settings and specialties of Ibn Hayan. Patient encounter workflows cover outpatient, inpatient, emergency, telehealth, and home health encounters. Clinical pathways cover condition-specific care sequences (for example, chest pain pathway, stroke pathway, sepsis pathway). Care plan workflows cover longitudinal care plans for chronic conditions and post-acute recovery. Clinical decision trees cover diagnostic and therapeutic decision support. Specialty-specific workflows cover the workflows unique to each clinical specialty (for example, surgical workflow, obstetric workflow, psychiatric workflow). Emergency and urgent care workflows cover the high-acuity, time-critical workflows. Chronic disease management workflows cover the longitudinal care of chronic conditions. Preventive care workflows cover screening, immunization, and wellness.

The coverage is documented per workflow category in Sections 3 through 9 of this document. Each section catalogues the workflows in the corresponding category, with the workflow's canonical identifier, name, trigger, steps, roles involved, modules involved, audit events, and configuration surface. The catalogue is the binding reference for module specifications and integration contracts; a workflow referenced by a module specification must be present in this catalogue.

### 1.4 Clinical Workflow Posture

Ibn Hayan adopts a posture of disciplined clinical workflow management. Four commitments govern this posture. First, clinical workflows are declarative: a workflow expresses what care is delivered, not how it is implemented; the workflow engine determines the implementation. Second, clinical workflows are versioned: a workflow change is a new version of the workflow, with the previous version retained for historical record interpretation. Third, clinical workflows are auditable: every workflow step is recorded in the audit trail, including the step, the actor, the inputs, the outputs, and the outcome. Fourth, clinical workflows are governed: a workflow change is a configuration action ratified through the Architecture Council process with Clinical Informatics Council advisory input.

The four commitments are the architectural floor for clinical workflow management in Ibn Hayan. A module that implements a clinical workflow in source code is defective; the workflow must be declared in the workflow catalogue and executed by the workflow engine. A module that executes a workflow step without audit is defective; the step execution must be recorded in the audit trail. A module that uses an unregistered workflow is defective; the workflow must be present in the catalogue. The configuration service enforces these commitments at validation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.5 Ibn Hayan Identity and Clinical Workflows

Clinical workflows are part of the structural vocabulary by which Ibn Hayan maintains its one-platform identity (PRODUCT_BIBLE Section 1.5). A clinical workflow recorded in a small clinic is the same workflow recorded in a multi-national hospital network; the platform's workflow engine treats them identically. This consistency is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to the clinical workflow domain. Where regional variation requires different workflow semantics (for example, a regional regulatory framework may require an additional consent step in the encounter workflow), the variation is expressed through workflow parameters and regional workflow overlays registered through the Architecture Council, not through region-specific workflow forks.

---

## 2. Workflow Modeling Standard

### 2.1 Workflow Definition Standard

Clinical workflows in Ibn Hayan are defined declaratively through configuration, in keeping with the workflow engine philosophy documented in SYSTEM_ARCHITECTURE Section 16.2. A workflow definition specifies the steps, the conditions, the actors, the inputs, the outputs, and the exception handling. The definition is structured into four parts: the trigger (what initiates the workflow), the steps (what the workflow does, in sequence or in parallel), the conditions (what governs step transitions), and the exception handling (what happens when a step fails or an unexpected event occurs). The definition is versioned, validated, and auditable, in keeping with the configuration-driven architecture (SYSTEM_ARCHITECTURE Section 8).

Workflow definitions are not source code. A workflow that requires source-level implementation is not a workflow; it is a feature. The workflow engine is designed to execute configured workflows, not to host custom code. This commitment is the architectural expression of Principle P2 (Configuration Before Customization) applied to the clinical workflow domain. The discipline preserves the platform's ability to evolve workflows without source modification, in keeping with the platform's decade-horizon viability commitment (Principle P18).

### 2.2 Workflow Naming Conventions

Clinical workflow names in Ibn Hayan follow a documented naming convention. The workflow's canonical identifier is a stable code of the form `WF-{category}-{sequence}` (for example, `WF-ENC-003` for the third encounter workflow). The workflow's display name is a human-readable summary of the workflow's intent (for example, "Outpatient Encounter Workflow"). The workflow's description is a one-sentence statement of the workflow's purpose, including the trigger, the steps, and the outcome. The three identifiers are stable; renaming a workflow follows the deprecation policy documented in BUSINESS_RULES.md Section 11.

The naming convention is enforced by the Architecture Council at workflow registration. A workflow that does not follow the convention is rejected; the rejection is recorded with the rationale. The convention is the structural mechanism by which the platform's clinical workflow catalogue remains coherent and navigable across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 2.3 Workflow Step Types

Each workflow step is typed. The platform recognizes six step types: Task (a unit of work performed by an actor), Decision (a branching point based on a condition), Wait (a pause awaiting an external event or time), Notification (a dispatch of a notification), Integration (an invocation of an external system), and Compensation (a rollback action performed when a prior step is reversed). Each step type has its own semantics, its own validation rules, and its own audit implications. The step type is declared in the step's definition and is enforced by the workflow engine.

The step type discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the clinical workflow domain. A small, well-defined set of step types is simpler to design, execute, and audit than an open-ended set. The discipline is also the structural mechanism by which the platform's workflow engine maintains its consistency: a step type that is not in the set is rejected at validation, ensuring that workflows do not introduce ad hoc step semantics.

### 2.4 Workflow Patterns

The workflow engine supports five workflow patterns documented in SYSTEM_ARCHITECTURE Section 16.4: Sequential (steps execute in sequence), Parallel (steps execute in parallel), Conditional (steps execute based on conditions), Looping (steps repeat based on conditions), and Saga (long-running transactions with compensation). The choice of pattern is governed by the workflow's requirements. The workflow engine supports all five patterns, with the pattern selected per workflow through configuration. Clinical workflows typically use Sequential, Conditional, and Saga patterns; Parallel is used for concurrent clinical activities (for example, parallel order placement and insurance verification); Looping is used for iterative clinical processes (for example, treatment cycles).

The pattern discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) applied to the clinical workflow domain. A workflow that mixes patterns ad hoc produces contracts that are ambiguous and audit trails that cannot be interpreted. The discipline of selecting one pattern per workflow (with sub-workflows for mixed patterns) is the structural mechanism by which the platform's workflow catalogue remains coherent.

### 2.5 Workflow State Management

Workflow state is managed by the workflow engine, not by the bounded contexts that the workflow coordinates, in keeping with the workflow and state management philosophy documented in SYSTEM_ARCHITECTURE Section 16.6. This separation is critical: bounded contexts do not hold workflow state, and workflows do not hold domain state. The separation preserves bounded context cohesion and workflow engine focus. Workflow state is durable; a workflow that is interrupted (for example, by a system failure) can resume from its last durable state.

The state management discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the clinical workflow domain. A workflow that loses state on failure may compromise clinical safety (for example, a medication administration workflow that loses state may miss a dose). The platform's posture is that workflow state is durable, with durability treated as clinical data when the workflow affects clinical outcomes. The discipline is also the structural mechanism by which the platform's workflow engine maintains its recoverability: a workflow that is interrupted can resume without manual intervention.

---

## 3. Patient Encounter Workflow

### 3.1 Outpatient Encounter Workflow

The outpatient encounter workflow is the platform's most common clinical workflow. It governs the encounter from scheduling through completion, covering check-in, clinical assessment, order entry, documentation, and checkout. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Patient (BC01), Scheduling (BC06), Clinical Documentation (BC03), Orders & Results (BC04), Pharmacy (BC05), Billing (BC07), and Notifications (BC14) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ENC-001 | Outpatient Encounter | Appointment scheduled | Schedule, check-in, triage, clinical assessment, order entry, documentation, checkout, billing | Receptionist, nurse, physician, billing clerk | BC02, BC01, BC06, BC03, BC04, BC05, BC07, BC14 | Encounter created, checked-in, started, finished; orders placed; notes signed; invoice issued | Steps configurable per clinic type and specialty |

The workflow's steps are documented in detail in the Encounter module specification. The steps may be reordered, skipped, or extended through configuration per clinic type and specialty, in keeping with the workflow customization framework documented in Section 10. The workflow's audit events are recorded in the audit trail documented in SYSTEM_ARCHITECTURE Section 27.3.

### 3.2 Inpatient Encounter Workflow

The inpatient encounter workflow governs the encounter from admission through discharge, covering admission, daily care, order management, medication administration, procedures, and discharge. The workflow is owned by the Encounter bounded context (BC02) and interacts with additional bounded contexts including the Workforce (BC10) for staffing and the Inventory (BC09) for supply management.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ENC-002 | Inpatient Encounter | Admission order | Admission, room assignment, daily rounds, order management, medication administration, procedures, discharge planning, discharge | Admitting physician, attending, nurse, pharmacist, discharge planner | BC02, BC01, BC03, BC04, BC05, BC07, BC10, BC09, BC14 | Admission recorded; daily rounds recorded; medications administered; discharge summary signed | Steps configurable per facility and service line |

The inpatient encounter workflow is more complex than the outpatient workflow due to the longer duration, the multi-disciplinary care team, and the regulatory requirements for inpatient documentation. The workflow's steps may be customized per service line (for example, surgical, medical, psychiatric) through the workflow customization framework.

### 3.3 Emergency Encounter Workflow

The emergency encounter workflow governs the encounter from arrival through disposition, covering triage, assessment, stabilization, treatment, and disposition (admit, discharge, transfer). The workflow is owned by the Encounter bounded context (BC02) and is documented in detail in Section 8 (Emergency & Urgent Care Workflows). The workflow is distinguished by its time-critical nature and its triage-driven branching.

### 3.4 Telehealth Encounter Workflow

The telehealth encounter workflow governs the encounter from scheduling through completion, covering virtual check-in, telehealth consultation, documentation, and checkout. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Notifications bounded context (BC14) for telehealth link delivery and the Documents bounded context (BC13) for telehealth recording.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ENC-004 | Telehealth Encounter | Telehealth appointment scheduled | Schedule, telehealth link delivery, virtual check-in, telehealth consultation, documentation, checkout, billing | Receptionist, physician, patient | BC02, BC01, BC06, BC03, BC04, BC07, BC13, BC14 | Telehealth link sent; consultation started; consultation ended; note signed | Steps configurable per clinic type and telehealth modality |

### 3.5 Home Health Encounter Workflow

The home health encounter workflow governs the encounter from scheduling through completion, covering visit planning, travel, home visit, documentation, and checkout. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Workforce (BC10) for home health staff assignment and the Notifications (BC14) bounded context for visit reminders.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ENC-005 | Home Health Encounter | Home health visit scheduled | Schedule, visit planning, travel, home visit, documentation, checkout, billing | Home health nurse, physician (remote) | BC02, BC01, BC06, BC03, BC04, BC07, BC10, BC14 | Visit scheduled; travel started; visit started; visit ended; note signed | Steps configurable per home health service type |

---

## 4. Clinical Pathways

### 4.1 Pathway Definition

A clinical pathway is a condition-specific care sequence that defines the expected steps, interventions, and outcomes for a patient with a specific condition. Clinical pathways are distinguished from encounter workflows by their condition-specificity: an encounter workflow governs the encounter regardless of condition; a clinical pathway governs the condition-specific care within (and across) encounters. Pathways are owned by the Clinical Documentation bounded context (BC03) and interact with the Encounter (BC02), Orders & Results (BC04), and Pharmacy (BC05) bounded contexts.

Clinical pathways in Ibn Hayan are derived from recognized clinical guidelines (for example, ACC/AHA guidelines for cardiovascular care, IDSA guidelines for infectious disease, NCCN guidelines for oncology). The platform adopts the guideline-recommended care sequence as the pathway's default steps; variations from the guideline are documented with rationale and are auditable. The pathway discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to condition-specific care.

### 4.2 Cardiovascular Pathways

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-PATH-001 | Chest Pain Pathway | Chest pain complaint | Triage, ECG, cardiac biomarkers, risk stratification, disposition (admit, observe, discharge) | Triage nurse, emergency physician, cardiologist | BC02, BC03, BC04, BC07 | Pathway started; ECG performed; biomarkers resulted; risk stratified; disposition recorded | Risk stratification tool configurable per facility |
| WF-PATH-002 | Acute MI Pathway | Acute MI diagnosis | Immediate reperfusion, antiplatelet therapy, anticoagulation, secondary prevention, rehabilitation referral | Cardiologist, emergency physician, nurse, pharmacist | BC02, BC03, BC04, BC05, BC07 | Reperfusion initiated; medications administered; rehab referred | Time targets configurable per facility |
| WF-PATH-003 | Heart Failure Pathway | Heart failure diagnosis | Diagnostic workup, medication optimization, device therapy evaluation, patient education, follow-up scheduling | Cardiologist, nurse, pharmacist | BC02, BC03, BC04, BC05, BC14 | Workup completed; medications optimized; education delivered | Follow-up schedule configurable per facility |
| WF-PATH-004 | Atrial Fibrillation Pathway | Atrial fibrillation diagnosis | Rate control, rhythm control evaluation, anticoagulation (CHA2DS2-VASc-guided), cardioversion consideration | Cardiologist, nurse, pharmacist | BC02, BC03, BC04, BC05 | Rate controlled; anticoagulation initiated; cardioversion evaluated | Anticoagulation threshold configurable per facility |

### 4.3 Neurological Pathways

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-PATH-011 | Acute Stroke Pathway | Stroke suspicion | Rapid assessment, CT imaging, thrombolysis evaluation, thrombectomy evaluation, admission to stroke unit | Emergency physician, neurologist, radiologist, nurse | BC02, BC03, BC04 | Assessment completed; imaging performed; thrombolysis administered (if applicable); admitted | Time targets configurable per facility |
| WF-PATH-012 | Migraine Pathway | Migraine diagnosis | Acute treatment, prophylaxis evaluation, trigger identification, patient education | Neurologist, nurse, pharmacist | BC02, BC03, BC04, BC05 | Acute treatment administered; prophylaxis evaluated; education delivered | Prophylaxis threshold configurable per facility |
| WF-PATH-013 | Seizure Pathway | New seizure | Diagnostic workup (EEG, imaging), antiseizure medication initiation, driving restriction, follow-up | Neurologist, nurse, pharmacist | BC02, BC03, BC04, BC05, BC14 | Workup completed; medication initiated; restriction documented | Medication choice configurable per seizure type |

### 4.4 Infectious Disease Pathways

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-PATH-021 | Sepsis Pathway | Sepsis suspicion | Lactate, blood cultures, broad-spectrum antibiotics, fluid resuscitation, vasopressor evaluation, ICU admission | Emergency physician, intensivist, nurse, pharmacist | BC02, BC03, BC04, BC05, BC07 | Lactate resulted; cultures drawn; antibiotics administered; resuscitation started | Antibiotic choice configurable per facility and resistance pattern |
| WF-PATH-022 | Community-Acquired Pneumonia Pathway | CAP diagnosis | Severity stratification (CURB-65 or PSI), antibiotic selection, disposition (outpatient, inpatient, ICU) | Physician, nurse, pharmacist | BC02, BC03, BC04, BC05 | Stratification completed; antibiotics administered; disposition recorded | Stratification tool and antibiotic choice configurable per facility |
| WF-PATH-023 | UTI Pathway | UTI diagnosis | Urinalysis, culture, antibiotic selection, follow-up | Physician, nurse, pharmacist | BC02, BC03, BC04, BC05 | Urinalysis resulted; culture sent; antibiotics prescribed | Antibiotic choice configurable per facility and resistance pattern |

### 4.5 Oncology Pathways

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-PATH-031 | Breast Cancer Pathway | Breast cancer diagnosis | Staging workup, multidisciplinary tumor board, treatment plan (surgery, chemo, radiation, endocrine), surveillance | Oncologist, surgeon, radiation oncologist, nurse, pharmacist | BC02, BC03, BC04, BC05, BC07 | Staging completed; tumor board documented; treatment plan recorded; surveillance scheduled | Treatment protocol configurable per tumor characteristics |
| WF-PATH-032 | Colorectal Cancer Pathway | Colorectal cancer diagnosis | Staging workup, multidisciplinary tumor board, treatment plan, surveillance | Oncologist, surgeon, radiation oncologist, nurse, pharmacist | BC02, BC03, BC04, BC05, BC07 | Staging completed; tumor board documented; treatment plan recorded; surveillance scheduled | Treatment protocol configurable per tumor characteristics |
| WF-PATH-033 | Lung Cancer Pathway | Lung cancer diagnosis | Staging workup, multidisciplinary tumor board, treatment plan, surveillance | Oncologist, surgeon, radiation oncologist, nurse, pharmacist | BC02, BC03, BC04, BC05, BC07 | Staging completed; tumor board documented; treatment plan recorded; surveillance scheduled | Treatment protocol configurable per tumor characteristics |

---

## 5. Care Plan Workflows

### 5.1 Care Plan Definition

A care plan is a documented plan for a patient's care over time, distinct from an encounter workflow (which governs a single encounter) and a clinical pathway (which governs condition-specific care). Care plans are longitudinal, spanning multiple encounters and multiple conditions. Care plans are owned by the Clinical Documentation bounded context (BC03) and interact with the Encounter (BC02), Orders & Results (BC04), Pharmacy (BC05), and Notifications (BC14) bounded contexts.

Care plans in Ibn Hayan support the platform's commitment to chronic disease management and preventive care. A care plan defines the patient's care goals, the interventions planned, the schedule of interventions, the responsible care team, and the metrics by which the plan's effectiveness is evaluated. Care plans are versioned, with each version representing a snapshot of the plan at a point in time. The versioning discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the care plan domain.

### 5.2 Care Plan Creation Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CP-001 | Care Plan Creation | Care plan initiation | Assessment, goal definition, intervention planning, team assignment, plan documentation, plan activation | Physician, nurse, care manager | BC03, BC02, BC04, BC05, BC14 | Plan drafted; goals defined; interventions planned; team assigned; plan activated | Plan template configurable per condition |

### 5.3 Care Plan Revision Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CP-002 | Care Plan Revision | Trigger event (outcome, condition change, time-based) | Assessment of current plan, revision rationale, goal revision, intervention revision, plan re-documentation, plan re-activation | Physician, nurse, care manager | BC03, BC02, BC04, BC05, BC14 | Revision triggered; rationale documented; plan revised; plan re-activated | Trigger events configurable per condition |

### 5.4 Care Plan Adherence Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CP-003 | Care Plan Adherence Monitoring | Schedule (per plan) | Adherence assessment, deviation identification, intervention (if deviation), documentation | Care manager, physician | BC03, BC14 | Adherence assessed; deviation identified (if applicable); intervention recorded | Assessment schedule configurable per plan |

### 5.5 Care Plan Closure Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CP-004 | Care Plan Closure | Closure event (goal achieved, condition resolved, patient request) | Closure rationale, outcome documentation, plan closure, transition (to new plan, to maintenance, to discharge) | Physician, nurse, care manager | BC03, BC14 | Closure triggered; outcome documented; plan closed; transition recorded | Closure events configurable per condition |

---

## 6. Clinical Decision Trees

### 6.1 Decision Tree Definition

A clinical decision tree is a structured decision-support tool that guides clinical decisions through a tree of conditions and recommended actions. Decision trees are distinguished from clinical pathways by their decision focus: a pathway governs a care sequence; a decision tree governs a specific decision point. Decision trees are owned by the Clinical Documentation bounded context (BC03) and interact with the Orders & Results (BC04) and Pharmacy (BC05) bounded contexts.

Decision trees in Ibn Hayan are derived from recognized clinical guidelines and from validated clinical decision rules (for example, Wells score for DVT, Ottawa ankle rules, HEART score for chest pain). The platform adopts the validated rule as the decision tree's logic; variations from the rule are documented with rationale and are auditable. The decision tree discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to clinical decision support.

### 6.2 Diagnostic Decision Trees

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-DT-001 | DVT Diagnostic Decision Tree | DVT suspicion | Wells score calculation, D-dimer (if low probability), ultrasound (if high probability or D-dimer positive), disposition | Physician, nurse | BC03, BC04 | Wells score calculated; D-dimer resulted; ultrasound performed; disposition recorded | Score thresholds configurable per facility |
| WF-DT-002 | PE Diagnostic Decision Tree | PE suspicion | Wells score calculation, D-dimer (if low probability), CT angiography (if high probability or D-dimer positive), disposition | Physician, nurse | BC03, BC04 | Wells score calculated; D-dimer resulted; CT performed; disposition recorded | Score thresholds configurable per facility |
| WF-DT-003 | Appendicitis Decision Tree | Appendicitis suspicion | Alvarado score calculation, imaging (if intermediate probability), surgical consultation, disposition | Physician, surgeon, nurse | BC03, BC04 | Score calculated; imaging performed; consult obtained; disposition recorded | Score thresholds configurable per facility |

### 6.3 Treatment Decision Trees

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-DT-011 | Hypertension Treatment Decision Tree | Hypertension diagnosis | Stage classification, treatment selection (lifestyle, monotherapy, combination), follow-up scheduling | Physician, nurse, pharmacist | BC03, BC04, BC05 | Stage classified; treatment selected; follow-up scheduled | Treatment thresholds configurable per guideline version |
| WF-DT-012 | Diabetes Treatment Decision Tree | Diabetes diagnosis | Type classification, treatment selection (lifestyle, oral, injectable, insulin), monitoring schedule | Physician, nurse, pharmacist | BC03, BC04, BC05 | Type classified; treatment selected; monitoring scheduled | Treatment thresholds configurable per guideline version |
| WF-DT-013 | Asthma Treatment Decision Tree | Asthma diagnosis | Severity classification, treatment selection (step-wise), action plan creation, follow-up scheduling | Physician, nurse, pharmacist | BC03, BC04, BC05, BC13 | Severity classified; treatment selected; action plan created; follow-up scheduled | Step-wise protocol configurable per guideline version |

### 6.4 Triage Decision Trees

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-DT-021 | Emergency Triage Decision Tree | Patient arrival at emergency | Acuity assessment (e.g., ESI 5-level), resource assignment, queue placement | Triage nurse | BC02, BC03, BC06 | Acuity assessed; resources assigned; queue placement recorded | Acuity system configurable per facility |
| WF-DT-022 | Phone Triage Decision Tree | Patient phone call | Symptom assessment, acuity assessment, disposition (home care, appointment, emergency) | Triage nurse | BC02, BC03, BC06, BC14 | Symptoms assessed; acuity assessed; disposition recorded | Symptom-acuity mapping configurable per facility |

### 6.5 Disposition Decision Trees

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-DT-031 | Discharge Disposition Decision Tree | Discharge decision | Discharge criteria assessment, disposition (home, home health, SNF, rehab), discharge planning, discharge | Physician, nurse, discharge planner, social worker | BC02, BC03 | Criteria assessed; disposition selected; planning completed; discharge recorded | Disposition options configurable per facility |
| WF-DT-032 | Transfer Decision Tree | Transfer decision | Transfer rationale, receiving facility identification, transfer arrangement, transfer execution | Physician, nurse, transfer coordinator | BC02, BC03, BC14 | Rationale documented; receiving facility identified; transfer arranged; transfer executed | Transfer criteria configurable per facility |

---

## 7. Specialty-Specific Workflows

### 7.1 Surgical Workflow

The surgical workflow governs the perioperative care sequence, covering pre-operative assessment, surgical scheduling, intra-operative care, and post-operative recovery. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Orders & Results (BC04), Pharmacy (BC05), Inventory (BC09), and Documents (BC13) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-SPC-001 | Surgical Workflow | Surgical decision | Pre-op assessment, anesthesia evaluation, surgical scheduling, surgical safety checklist, surgery, post-op recovery, post-op documentation | Surgeon, anesthesiologist, nurse, scrub tech | BC02, BC03, BC04, BC05, BC09, BC13 | Pre-op completed; anesthesia evaluated; surgery scheduled; checklist completed; surgery performed; recovery completed; documentation signed | Checklist content configurable per facility |

### 7.2 Obstetric Workflow

The obstetric workflow governs the prenatal, intrapartum, and postpartum care sequence. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Clinical Documentation (BC03), Orders & Results (BC04), and Pharmacy (BC05) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-SPC-011 | Prenatal Workflow | Pregnancy confirmation | Initial prenatal visit, scheduled prenatal visits, screening tests, ultrasound, risk assessment, delivery planning | Obstetrician, nurse, midwife | BC02, BC03, BC04, BC05 | Initial visit completed; screenings performed; ultrasounds performed; risk assessed; delivery plan documented | Visit schedule configurable per risk profile |
| WF-SPC-012 | Intrapartum Workflow | Labor onset | Admission, labor monitoring, delivery, immediate postpartum, recovery | Obstetrician, nurse, midwife, pediatrician | BC02, BC03, BC04, BC05 | Admission recorded; labor monitored; delivery recorded; postpartum assessed; recovery completed | Monitoring frequency configurable per risk profile |
| WF-SPC-013 | Postpartum Workflow | Delivery | Postpartum recovery, postpartum visits, contraception counseling, newborn care coordination | Obstetrician, nurse, midwife, pediatrician | BC02, BC03, BC04, BC05, BC14 | Recovery assessed; postpartum visits completed; counseling delivered; newborn care coordinated | Visit schedule configurable per delivery type |

### 7.3 Psychiatric Workflow

The psychiatric workflow governs the mental health care sequence, covering psychiatric assessment, treatment planning, therapy, medication management, and follow-up. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Clinical Documentation (BC03) and Pharmacy (BC05) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-SPC-021 | Psychiatric Assessment Workflow | Psychiatric encounter | Initial assessment, diagnostic evaluation, risk assessment, treatment planning, follow-up scheduling | Psychiatrist, psychologist, social worker, nurse | BC02, BC03, BC04, BC05 | Assessment completed; diagnosis recorded; risk assessed; plan documented; follow-up scheduled | Assessment instruments configurable per condition |
| WF-SPC-022 | Therapy Workflow | Therapy session | Session documentation, intervention, homework assignment, next session scheduling | Psychologist, social worker | BC02, BC03, BC14 | Session documented; intervention recorded; homework assigned; next session scheduled | Therapy type configurable per condition |
| WF-SPC-023 | Psychiatric Medication Workflow | Psychiatric medication decision | Medication selection, informed consent, initiation, monitoring, adjustment, follow-up | Psychiatrist, nurse, pharmacist | BC02, BC03, BC04, BC05 | Medication selected; consent obtained; initiation documented; monitoring scheduled; adjustment recorded | Monitoring frequency configurable per medication |

### 7.4 Pediatric Workflow

The pediatric workflow governs the pediatric care sequence, covering well-child visits, immunization, growth monitoring, and acute care. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Clinical Documentation (BC03), Orders & Results (BC04), and Pharmacy (BC05) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-SPC-031 | Well-Child Workflow | Well-child schedule | Growth assessment, developmental screening, immunization, anticipatory guidance, next visit scheduling | Pediatrician, nurse | BC02, BC03, BC04, BC05 | Growth assessed; screening performed; immunization administered; guidance delivered; next visit scheduled | Schedule configurable per regional immunization schedule |
| WF-SPC-032 | Pediatric Acute Care Workflow | Acute illness | Assessment, diagnosis, treatment, parent education, follow-up | Pediatrician, nurse | BC02, BC03, BC04, BC05 | Assessment completed; diagnosis recorded; treatment administered; education delivered; follow-up scheduled | Follow-up criteria configurable per condition |

### 7.5 Geriatric Workflow

The geriatric workflow governs the geriatric care sequence, covering comprehensive geriatric assessment, polypharmacy review, functional assessment, and advance care planning. The workflow is owned by the Encounter bounded context (BC02) and interacts with the Clinical Documentation (BC03), Orders & Results (BC04), Pharmacy (BC05), and Documents (BC13) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-SPC-041 | Comprehensive Geriatric Assessment | Geriatric assessment indication | Functional assessment, cognitive assessment, polypharmacy review, social assessment, care plan development | Geriatrician, nurse, pharmacist, social worker | BC02, BC03, BC04, BC05, BC13 | Functional assessed; cognitive assessed; polypharmacy reviewed; social assessed; plan developed | Assessment instruments configurable per facility |
| WF-SPC-042 | Advance Care Planning Workflow | Advance care planning trigger | Goals discussion, advance directive documentation, code status documentation, family communication | Geriatrician, nurse, social worker | BC02, BC03, BC13 | Goals discussed; directive documented; code status recorded; family communicated | Documentation templates configurable per region |

---

## 8. Emergency & Urgent Care Workflows

### 8.1 Emergency Triage Workflow

The emergency triage workflow governs the rapid assessment and prioritization of patients presenting to the emergency department. The workflow is owned by the Encounter bounded context (BC02) and is the entry point for the emergency encounter workflow. The workflow is distinguished by its time-critical nature and its triage-driven branching.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ER-001 | Emergency Triage | Patient arrival at emergency | Rapid assessment, acuity assignment (e.g., ESI 5-level), resource assignment, queue placement, immediate intervention (if critical) | Triage nurse, physician (for critical) | BC02, BC03, BC06, BC14 | Triage started; acuity assigned; resources assigned; queue placement recorded; intervention initiated (if applicable) | Acuity system configurable per facility |

### 8.2 Resuscitation Workflow

The resuscitation workflow governs the time-critical care of a patient in cardiac or respiratory arrest. The workflow is owned by the Encounter bounded context (BC02) and is the most time-critical workflow in the platform. The workflow's audit trail is the basis for post-event review and quality improvement.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ER-011 | Resuscitation | Cardiac or respiratory arrest | Code activation, BLS, ALS, post-resuscitation care, family notification, code documentation | Code team, nurse, pharmacist | BC02, BC03, BC04, BC05, BC14 | Code activated; BLS started; ALS interventions recorded; post-resuscitation care; family notified; code documented | Code team composition configurable per facility |

### 8.3 Trauma Workflow

The trauma workflow governs the care of a trauma patient, covering primary survey, secondary survey, interventions, and disposition. The workflow is owned by the Encounter bounded context (BC02) and is distinguished by its standardized survey approach (ABCDE).

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ER-021 | Trauma Workflow | Trauma activation | Primary survey (ABCDE), resuscitation, secondary survey, interventions, imaging, disposition | Trauma team, nurse, surgeon, radiologist | BC02, BC03, BC04, BC05, BC09 | Trauma activated; primary survey completed; resuscitation; secondary survey; interventions; imaging; disposition | Team composition configurable per facility |

### 8.4 Sepsis Workflow

The sepsis workflow governs the time-critical care of a patient with sepsis, covering the sepsis bundle (lactate, cultures, antibiotics, fluids). The workflow is owned by the Encounter bounded context (BC02) and interacts with the Orders & Results (BC04) and Pharmacy (BC05) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ER-031 | Sepsis Bundle | Sepsis recognition | Lactate draw, blood cultures, broad-spectrum antibiotics, fluid resuscitation, vasopressor evaluation, ICU admission | Emergency physician, nurse, pharmacist, intensivist | BC02, BC03, BC04, BC05, BC07 | Lactate drawn; cultures drawn; antibiotics administered; fluids administered; vasopressors evaluated; ICU admitted | Time targets and antibiotic choice configurable per facility |

### 8.5 Stroke Workflow

The stroke workflow governs the time-critical care of a patient with acute stroke, covering rapid assessment, imaging, thrombolysis, and thrombectomy evaluation. The workflow is owned by the Encounter bounded context (BC02) and is distinguished by its strict time targets.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-ER-041 | Acute Stroke | Stroke suspicion | Rapid assessment (NIHSS), immediate CT, thrombolysis evaluation, thrombolysis administration (if eligible), thrombectomy evaluation, stroke unit admission | Emergency physician, neurologist, radiologist, nurse | BC02, BC03, BC04 | Assessment completed; CT performed; thrombolysis evaluated; thrombolysis administered (if applicable); thrombectomy evaluated; admitted | Time targets and eligibility criteria configurable per facility |

---

## 9. Chronic Disease Management Workflows

### 9.1 Diabetes Management Workflow

The diabetes management workflow governs the longitudinal care of a patient with diabetes, covering regular monitoring, medication management, complication screening, and patient education. The workflow is owned by the Clinical Documentation bounded context (BC03) and interacts with the Encounter (BC02), Orders & Results (BC04), Pharmacy (BC05), and Notifications (BC14) bounded contexts.

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CDM-001 | Diabetes Management | Diabetes diagnosis | Initial assessment, care plan creation, regular HbA1c monitoring, medication management, complication screening (eye, foot, kidney), patient education, follow-up | Physician, nurse, pharmacist, dietitian, ophthalmologist | BC02, BC03, BC04, BC05, BC14 | Plan created; HbA1c monitored; medications managed; screenings performed; education delivered; follow-up scheduled | Monitoring schedule and screening frequency configurable per guideline |

### 9.2 Hypertension Management Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CDM-002 | Hypertension Management | Hypertension diagnosis | Initial assessment, care plan creation, regular BP monitoring, medication management, lifestyle counseling, complication screening, follow-up | Physician, nurse, pharmacist, dietitian | BC02, BC03, BC04, BC05, BC14 | Plan created; BP monitored; medications managed; counseling delivered; screenings performed; follow-up scheduled | Monitoring schedule configurable per guideline |

### 9.3 COPD Management Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CDM-003 | COPD Management | COPD diagnosis | Initial assessment, care plan creation, regular symptom monitoring, medication management, pulmonary rehabilitation, exacerbation action plan, vaccination, follow-up | Physician, nurse, pharmacist, respiratory therapist | BC02, BC03, BC04, BC05, BC13, BC14 | Plan created; symptoms monitored; medications managed; rehab referred; action plan created; vaccinations administered; follow-up scheduled | Monitoring schedule and action plan configurable per guideline |

### 9.4 CKD Management Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CDM-004 | CKD Management | CKD diagnosis | Initial assessment, care plan creation, regular renal function monitoring, medication adjustment, blood pressure management, anemia management, dialysis planning (if advanced), follow-up | Nephrologist, nurse, pharmacist, dietitian | BC02, BC03, BC04, BC05, BC14 | Plan created; renal function monitored; medications adjusted; BP managed; anemia managed; dialysis planned (if applicable); follow-up scheduled | Monitoring schedule configurable per stage |

### 9.5 Heart Failure Management Workflow

| Workflow ID | Name | Trigger | Steps | Roles | Modules | Audit Events | Configuration Surface |
|---|---|---|---|---|---|---|---|
| WF-CDM-005 | Heart Failure Management | Heart failure diagnosis | Initial assessment, care plan creation, regular symptom monitoring, medication optimization, device therapy evaluation, patient education, follow-up | Cardiologist, nurse, pharmacist | BC02, BC03, BC04, BC05, BC14 | Plan created; symptoms monitored; medications optimized; device therapy evaluated; education delivered; follow-up scheduled | Monitoring schedule configurable per guideline |

---

## 10. Workflow Customization Framework

### 10.1 Customization Principles

Clinical workflow customization in Ibn Hayan follows three principles. First, customization is configuration, not source modification: a workflow is customized through configuration parameters, not through source code changes. Second, customization is scoped: a customization applies at a specific configuration layer (tenant, facility, department, care team), with the layer model documented in SYSTEM_ARCHITECTURE Section 15.2 governing precedence. Third, customization is governed: a customization is a configuration action ratified through the Architecture Council process, with the customization's rationale and impact documented in an ADR.

The three principles are the architectural expression of Principle P2 (Configuration Before Customization) applied to the clinical workflow domain. A workflow that is customized through source modification is defective; the platform's commitment to one code base serving every customer (Principle P3) requires that customizations be expressed as configuration. The discipline is also the structural mechanism by which the platform's workflow catalogue remains coherent: a customization that bypasses the configuration framework would produce workflows that are not interpretable across tenants.

### 10.2 Customization Levels

Clinical workflows may be customized at five levels. First, step reordering: the order of workflow steps may be adjusted within the constraints of clinical safety (for example, an assessment step cannot be moved after a treatment step that depends on the assessment). Second, step skipping: steps that are not relevant to a specific clinic type or specialty may be skipped (for example, a telehealth workflow may skip the room-assignment step). Third, step extension: new steps may be added to a workflow (for example, a facility may add a pre-procedure time-out step to the surgical workflow). Fourth, parameter customization: the parameters of a step may be customized (for example, the time targets in the sepsis bundle may be customized per facility). Fifth, role customization: the roles involved in a step may be customized (for example, the role responsible for triage may be customized per facility).

| Customization Level | What Changes | Configuration Layer | Approval Required |
|---|---|---|---|
| Step reordering | Order of steps | L3 (Tenant), L4 (Facility) | Architecture Council ADR |
| Step skipping | Steps omitted | L4 (Facility), L5 (Department) | Clinical Informatics Council review |
| Step extension | New steps added | L3 (Tenant), L4 (Facility) | Architecture Council ADR |
| Parameter customization | Step parameters | L3 (Tenant), L4 (Facility), L5 (Department) | Tenant administrator |
| Role customization | Step roles | L3 (Tenant), L4 (Facility), L5 (Department) | Tenant administrator |

### 10.3 Customization Validation

Each customization is validated before application, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. The validation covers five rule categories: Structural (the customized workflow conforms to the workflow schema), Referential (the customization's references resolve), Semantic (the customized workflow is internally consistent), Contextual (the customization is consistent with its scope), and Regulatory (the customization is consistent with the regulatory framework in force for the tenant's region). A customization that fails validation is not applied.

The validation discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the workflow customization domain. A customization that bypasses validation may compromise clinical safety (for example, a customization that reorders steps in a way that compromises the sepsis bundle's time targets). The platform's posture is that customizations are validated before application, with validation failures recorded as audit events. The discipline is also the structural mechanism by which the platform's workflow customizations are compliant: customizations that fail regulatory validation are not applied, ensuring that the platform's workflow behaviour complies with the regulatory framework in force for the tenant's region.

### 10.4 Customization Audit

Every customization is recorded in the audit trail, in keeping with the audit discipline documented in SYSTEM_ARCHITECTURE Section 27.3. The audit record captures the customization type, the affected workflow, the customization's content, the actor, the timestamp, the authorization basis, and the validation result. The audit record is immutable; once written, it cannot be modified or deleted.

The customization audit discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the workflow customization domain. A customization that is not audited would be invisible; the platform would be unable to detect customizations that compromise clinical safety or regulatory compliance. The discipline ensures that every customization is recorded, and every customization's impact is recoverable.

### 10.5 Customization Governance

Customizations are governed by the Architecture Council, with Clinical Informatics Council advisory input for clinical customizations. A customization that affects clinical safety (for example, a step reordering in a clinical pathway) requires Architecture Council ratification through an ADR; a customization that affects operational behaviour (for example, a parameter customization in an administrative workflow) requires tenant administrator approval. The governance discipline is documented in Section 8 of BUSINESS_RULES.md.

---

## 11. Workflow Validation & Compliance

### 11.1 Validation Framework

Clinical workflow validation in Ibn Hayan is performed by the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4. The framework applies five validation rule categories to workflows: Structural (the workflow conforms to the workflow schema), Referential (the workflow's references resolve), Semantic (the workflow is internally consistent, including the workflow's step graph being valid), Contextual (the workflow is consistent with its scope), and Regulatory (the workflow is consistent with the regulatory framework in force for the tenant's region). A workflow that fails validation is not activated.

The validation framework is the structural mechanism by which the platform's clinical workflow catalogue maintains its integrity. A workflow that bypasses validation may produce behaviour that compromises clinical safety (for example, a workflow with an invalid step graph may fail to reach a terminal state, leaving a patient in an indeterminate state). The discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the workflow validation domain.

### 11.2 Compliance Framework

Clinical workflow compliance in Ibn Hayan is governed by the regional regulatory framework in force for the tenant's region. The framework defines what workflows are required, what steps must be included, what documentation must be produced, and what audit records must be retained. The platform's workflow catalogue includes workflows that comply with the regulatory frameworks of the regions the platform serves; where a region requires a workflow not in the catalogue, the workflow is added through the Architecture Council process.

The compliance framework is the architectural expression of Principle P17 (Regional Adaptation Without Forking) applied to the clinical workflow domain. A region-specific workflow fork would compromise the platform's one-code-base commitment; the platform's posture is that regional variation is expressed through workflow parameters and regional workflow overlays, not through forks. The discipline is also the structural mechanism by which the platform's workflow catalogue remains compliant across regions: workflows that fail regulatory validation in a region are not activated in that region, with the failure recorded for review.

### 11.3 Workflow Testing

Clinical workflows are tested before activation, with the test suite covering the workflow's step graph (reachability of all terminal states), the workflow's conditions (positive and negative cases), the workflow's exception handling (failure scenarios), and the workflow's audit (audit record completeness). The test suite is versioned alongside the workflow and is run on each workflow version change.

The testing discipline is the structural mechanism by which the platform's clinical workflow catalogue maintains its quality. A workflow that is activated without testing may produce unintended behaviour; the platform's commitment to clinical safety (Principle P1) requires that workflows be tested before activation. The discipline is the architectural expression of Principle P7 (Documented Before Implemented) applied to the workflow domain.

### 11.4 Workflow Sandbox Testing

Workflow changes are tested in a configuration sandbox before application to production, in keeping with the configuration sandbox discipline documented in SYSTEM_ARCHITECTURE Section 15.7. The sandbox is a non-production tenant that inherits from the production tenant's configuration, ensuring that sandbox testing reflects production reality. The workflow change is applied to the sandbox, the test suite is run, and the workflow's behaviour is observed in the sandbox before the change is applied to production.

The sandbox testing discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the workflow domain. A workflow change that is applied to production without sandbox testing may compromise clinical safety; the platform's posture is that workflow changes are tested in a sandbox before application to production, except for emergency changes that follow a documented expedited pathway. The discipline is the structural mechanism by which the platform's workflow catalogue maintains its safety posture across the platform's deployment spectrum.

### 11.5 Compliance Reporting

Compliance reports are generated from workflow audit records, with reports tailored to specific regulatory requirements. For example, a regulatory report on sepsis bundle compliance is generated from sepsis workflow audit records; a regulatory report on stroke time targets is generated from stroke workflow audit records. Compliance reports are themselves auditable, with report generation recorded in the audit trail.

The compliance reporting discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the workflow compliance domain. A regulator's question about workflow compliance can be answered definitively by generating the relevant compliance report from the workflow audit records. The discipline is also the structural mechanism by which the platform demonstrates compliance across regions: each region's regulatory framework is mapped to a set of compliance reports, and the reports are generated on the regulatory framework's schedule.

---

## 12. Workflow Analytics

### 12.1 Workflow Performance Metrics

Workflow analytics in Ibn Hayan measure the performance of clinical workflows. The metrics cover workflow completion time (the time from workflow initiation to workflow completion), step dwell time (the time spent at each step), step skip rate (the rate at which steps are skipped), exception rate (the rate at which exceptions are raised), and outcome rate (the rate at which workflows produce each terminal outcome). The metrics are computed from workflow audit records and are reported through the Reporting bounded context (deployable expression of the Reporting Layer per SYSTEM_ARCHITECTURE Section 28).

| Metric | Definition | Source | Use |
|---|---|---|---|
| Workflow Completion Time | Time from initiation to completion | Workflow audit records | Identify slow workflows; target improvement |
| Step Dwell Time | Time spent at each step | Workflow audit records | Identify bottlenecks; target improvement |
| Step Skip Rate | Rate at which steps are skipped | Workflow audit records | Identify unnecessary steps; customize workflows |
| Exception Rate | Rate at which exceptions are raised | Workflow audit records | Identify failure-prone steps; improve exception handling |
| Outcome Rate | Rate of each terminal outcome | Workflow audit records | Identify outcome patterns; improve pathways |
| Adherence Rate | Rate at which workflows follow the standard pathway | Workflow audit records | Identify customization patterns; assess customization impact |

### 12.2 Workflow Quality Metrics

Workflow quality metrics measure the quality of care delivered through clinical workflows. The metrics cover adherence to clinical guidelines (the rate at which workflows follow guideline-recommended steps), adherence to time targets (the rate at which time-critical workflows meet their time targets), and adherence to documentation requirements (the rate at which workflows produce required documentation). The metrics are computed from workflow audit records and clinical documentation.

| Metric | Definition | Source | Use |
|---|---|---|---|
| Guideline Adherence | Rate of guideline-recommended steps followed | Workflow audit records, clinical guidelines | Identify guideline deviations; improve pathways |
| Time Target Adherence | Rate of time-critical workflows meeting time targets | Workflow audit records | Identify slow workflows; improve processes |
| Documentation Completeness | Rate of required documentation produced | Workflow audit records, clinical documentation | Identify documentation gaps; improve templates |
| Outcome Quality | Rate of favorable outcomes | Workflow audit records, clinical outcomes | Identify outcome patterns; improve pathways |

### 12.3 Workflow Utilization Metrics

Workflow utilization metrics measure the use of clinical workflows across the platform. The metrics cover workflow activation count (the number of times each workflow is activated), workflow active count (the number of workflows currently active), and workflow customization rate (the rate at which workflows are customized per tenant). The metrics are computed from workflow audit records and configuration records.

| Metric | Definition | Source | Use |
|---|---|---|---|
| Workflow Activation Count | Number of times each workflow is activated | Workflow audit records | Identify workflow usage patterns; prioritize improvements |
| Workflow Active Count | Number of workflows currently active | Workflow audit records | Capacity planning; resource allocation |
| Workflow Customization Rate | Rate at which workflows are customized per tenant | Configuration records | Identify customization patterns; assess catalogue coverage |

### 12.4 Analytics Consumption

Workflow analytics are consumed by three audiences. First, clinical leadership: clinical leadership uses workflow analytics to monitor care quality, identify improvement opportunities, and prioritize improvement initiatives. Second, operational leadership: operational leadership uses workflow analytics to monitor operational efficiency, identify bottlenecks, and target operational improvements. Third, the Architecture Council: the Architecture Council uses workflow analytics to monitor the workflow catalogue's coverage, identify customization patterns, and prioritize catalogue evolution.

The analytics consumption discipline is the architectural expression of Principle P15 (Observability as Primitive) applied to the workflow domain. Workflow analytics make the platform's clinical workflow behaviour visible, supporting data-driven improvement. The discipline is also the structural mechanism by which the platform's workflow catalogue evolves: analytics-driven prioritization ensures that the catalogue evolves to meet the platform's evolving clinical care surface.

### 12.5 Analytics Governance

Workflow analytics are governed by the Architecture Council, with Clinical Informatics Council advisory input for clinical quality metrics. The analytics are reviewed at each quarterly Architecture Council review, with metrics trends assessed and improvement priorities set. The analytics governance discipline is documented in Section 8 of BUSINESS_RULES.md.

The analytics governance discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the workflow analytics domain. Analytics that are not governed may drift from the platform's clinical care surface; the platform's posture is that analytics are reviewed regularly and that the catalogue evolves in response to analytics findings. The discipline is also the structural mechanism by which the platform's workflow catalogue remains current with clinical guideline updates and regulatory changes.

---

## 13. Related Documents

### 13.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-1 (Healthcare First), D-2 (Configuration Before Customization), D-10 (Accountability) govern workflow posture |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Clinical workflows are configuration artefacts governed by the configuration lifecycle |
| PRODUCT_BIBLE.md | Section 28 (Offline Strategy) | Offline workflow execution and audit |
| PRODUCT_BIBLE.md | Section 31 (Security Philosophy) | Workflow authorization and audit |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P2 (Configuration Before Customization), P3 (One Platform), P4 (Loose Coupling), P5 (Consistency), P7 (Documented), P11 (Offline-First), P13 (Auditability), P14 (Simplicity), P17 (Regional Adaptation), P18 (Decade-Horizon) govern workflow posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Bounded contexts to which workflows are bound |
| SYSTEM_ARCHITECTURE.md | Section 15 (Configuration Strategy) | Workflow configuration surface and validation |
| SYSTEM_ARCHITECTURE.md | Section 16 (Workflow Engine Philosophy) | Workflow engine architecture |
| SYSTEM_ARCHITECTURE.md | Section 17 (State Management Philosophy) | Workflow state management |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Workflow audit records |
| SYSTEM_ARCHITECTURE.md | Section 28 (Reporting Architecture) | Workflow analytics |
| CONFIGURATION_ARCHITECTURE.md | Section 7 (Configuration Validation) | Workflow validation framework |
| CONFIGURATION_ARCHITECTURE.md | Section 8 (Configuration Lifecycle) | Workflow lifecycle |

### 13.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references workflows, the reference is to this document.

| Document | Relationship to Clinical Workflows |
|---|---|
| TERMINOLOGY.md | Workflows consume coded concepts; terminology resolution applies |
| ENUMS.md | Workflows reference enum values for step conditions |
| STATUS_CODES.md | Workflows transition status codes; transition maps are workflow definitions |
| BUSINESS_RULES.md | Business rules govern workflow transitions; rule conditions trigger workflow steps |
| CALCULATIONS.md | Workflows invoke calculations (e.g., dosage calculation in medication workflow) |
| CONFIGURATION.md | Workflow definitions are configuration artefacts |
| FEATURE_FLAGS.md | Feature flags control workflow activation; flag lifecycle applies |

### 13.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level workflow usage and configuration |
| docs/04_INTEGRATIONS/*.md | External system workflow exchange (e.g., payer pre-authorization) |
| docs/06_DATABASE/*.md | Workflow state storage and indexing |
| docs/09_DEPLOYMENT/*.md | Workflow engine deployment topology |
| docs/03_SECURITY/*.md | Workflow authorization and audit |

### 13.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when a clinical workflow amendment, a clinical guideline update, a regulatory change, or an ADR requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification. Ibn Hayan's clinical workflow catalogue is a structural element of the platform's contract surface and is treated with the discipline that structural elements warrant.
