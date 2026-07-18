# Ibn Hayan Healthcare Operating System
## Plastic Surgery Clinics

| Field | Value |
|---|---|
| Document Title | Plastic Surgery Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the plastic surgery configuration overlay is amended or when regional aesthetic-procedure or implant-tracking regulations change |
| Audience | Clinical informatics leads, implementation consultants, customer success teams, configuration architects, plastic surgeons, reconstructive surgeons, aesthetic practice administrators, compliance officers evaluating Ibn Hayan for plastic surgery practice |
| Scope | Plastic surgery clinic type configuration overlay, recommended module composition, specialty-specific capabilities (pre-operative assessment, surgical planning, procedure documentation, recovery tracking, before/after imaging, implant and graft tracking, aesthetic procedure documentation, cosmetic injectable logs), specialty workflows, conceptual data entities, forms and templates, reports and analytics, integrations, role and permission defaults, configuration defaults, onboarding checklist, sample use cases, best practices |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks, database schemas, API endpoint specifications, UI component catalogues, vendor-specific imaging device contracts, country-specific legal interpretation of cosmetic surgery consent law |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the plastic surgery entry in the surgical specialty family and does not override the catalogue entry or the platform-level principles. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Pre-Operative Assessment
5. Surgical Planning
6. Procedure Documentation
7. Recovery Tracking
8. Before/After Imaging
9. Specialty Workflows
10. Specialty Data Models
11. Forms & Templates
12. Reports & Analytics
13. Role & Permission Recommendations
14. Configuration Defaults
15. Onboarding Checklist
16. Sample Use Cases
17. Best Practices
18. Related Documents

---

## 1. Specialty Overview

### 1.1 Specialty Definition

Plastic surgery is the surgical specialty concerned with the restoration, reconstruction, or alteration of the human body. The specialty is conventionally divided into reconstructive surgery, which restores form and function after trauma, oncological resection, or congenital anomaly, and aesthetic (cosmetic) surgery, which alters appearance according to patient preference. Plastic surgeons also perform procedures that span both domains, including burn reconstruction, hand surgery, craniofacial surgery, and microsurgical free-flap transfer. In Ibn Hayan, plastic surgery is positioned within the surgical specialty family alongside obstetrics and gynaecology (C05), ophthalmology (C12), orthopaedics (C13), otolaryngology (C14), urology (C17), and day surgery (C20), per Section 3.4 of `CLINIC_TYPES.md`. The clinic type operates within the surgical specialty baseline configuration with plastic surgery-specific refinements applied through the clinic type overlay described in Section 5 of `CLINIC_TYPES.md`.

The dual reconstructive-and-aesthetic nature of plastic surgery is reflected in the overlay, which provides documentation templates for both procedural categories. Reconstructive procedures (free-flap transfer, tissue expansion, cleft repair, burn reconstruction) require documentation that supports medical necessity, insurance authorisation, and longitudinal functional outcome tracking. Aesthetic procedures (rhinoplasty, abdominoplasty, mastopexy, facelift, blepharoplasty, breast augmentation) require documentation that supports informed consent for elective procedures, before/after imaging, and patient-reported outcome measurement.

### 1.2 Patient Population and Clinical Activities

The plastic surgery patient population spans all ages. Paediatric plastic surgery addresses congenital anomalies (cleft lip and palate, craniosynostosis, syndactyly, congenital nevi) and is typically performed in specialised paediatric centres. Adult plastic surgery addresses post-oncological reconstruction (breast reconstruction after mastectomy, head and neck reconstruction after tumour resection), post-traumatic reconstruction (facial fractures, hand injuries, burn reconstruction), and aesthetic procedures. The overlay accommodates this breadth through encounter templates that adjust to the patient and the planned clinical activity.

Key clinical activities in plastic surgery include pre-operative assessment (medical, aesthetic, psychological), surgical planning (anatomic measurement, imaging, simulation, flap design), procedural intervention (reconstructive and aesthetic, office-based and operative), post-operative recovery tracking (wound healing, complication monitoring, functional and aesthetic outcome assessment), and longitudinal follow-up (particularly for reconstructive cases where outcome matures over months to years). Each of these activities is supported by configuration in the plastic surgery overlay.

### 1.3 Why Plastic Surgery Requires Specialized Configuration

Plastic surgery presents configuration considerations that distinguish it from other surgical specialties. Before/after imaging is integral to plastic surgery in a way that it is not for most other surgical specialties, requiring standardised imaging protocols, image lifecycle management, and longitudinal image comparison capabilities. The configuration must support this imaging workflow as a first-class capability, not as an add-on to general clinical documentation.

Implant and graft tracking is similarly integral: breast implants, tissue expanders, dermal fillers, fat grafts, and microsurgical free flaps each require tracking for clinical follow-up, regulatory reporting (where required), and post-market surveillance. The overlay provides tracking capabilities integrated with the procedural documentation workflow. Aesthetic outcome assessment, including patient-reported outcome measures (BREAST-Q, FACE-Q, BODY-Q) and standardised photographic assessment, requires structured assessment instruments configured as first-class data entities.

### 1.4 Relationship to Other Clinic Types

Plastic surgery operates in relationship to several other clinic types. Within the surgical specialty family, plastic surgery shares configuration themes with otolaryngology (C14) for facial procedures, ophthalmology (C12) for periocular procedures, and day surgery (C20) for office-based procedures. Plastic surgery also coordinates with oncology (C11) for post-oncological reconstruction, with orthopaedics (C13) for hand surgery, and with general surgery and obstetrics/gynaecology for breast reconstruction after mastectomy. The overlay includes integration surfaces that support this coordination without requiring operational coupling between clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes and Ownership

Plastic surgery is practised across a range of facility sizes, from solo practitioner aesthetic clinics through single-specialty group practices, multi-specialty group practices with a plastic surgery service line, and hospital-based plastic surgery departments. The recommended editions for plastic surgery are Professional (E2) for office-based practice and Enterprise (E3) for practices with operative capability or for hospital-based departments, consistent with the surgical specialty family pattern in Section 3.4 of `CLINIC_TYPES.md`. Smaller aesthetic practices may operate at the Professional edition; practices with operative facilities and hospital-based departments operate at the Enterprise edition.

Ownership patterns in plastic surgery include private practice (individual or group), hospital-employed physician groups, academic medical centres with plastic surgery residency programmes, and dedicated aesthetic clinic chains. The clinic type overlay is ownership-agnostic; it provides the configuration surface that any ownership model requires, with ownership-specific concerns (such as billing rules, regulatory reporting, and contractual obligations) configured at the facility or customer layer per the configuration layer model in Section 15.3 of `SYSTEM_ARCHITECTURE.md`.

### 2.2 Geographic and Regulatory Considerations

Plastic surgery is practised in every region Ibn Hayan serves, and the regulatory environment varies substantially across regions, particularly for aesthetic procedures. The overlay accommodates this variation through the platform's localization module (M19), with regional configuration packs that adapt procedural consent forms (including specific consent requirements for aesthetic procedures in some jurisdictions), implant tracking requirements, cosmetic injectable log requirements, and regulatory reporting for aesthetic procedure registries where applicable. The configuration packs are versioned alongside the platform's regional regulatory framework and are updated when regional regulations change.

Geographic considerations also include cross-border patient travel for aesthetic procedures, which presents documentation and continuity-of-care challenges. The overlay supports documentation that accommodates pre-operative assessment performed in one region and the procedure performed in another, with the documentation structured to support continuity of care across regions. Cross-border documentation is subject to the platform's data residency rules stated in Section 11.5 of `SYSTEM_ARCHITECTURE.md`.

### 2.3 Regulatory Exposure

The regulatory exposure for plastic surgery reflects procedural consent requirements, implant tracking requirements, and the additional regulatory attention that aesthetic procedures attract in many jurisdictions. The overlay addresses each regulatory dimension through configuration: procedural consent is documented through structured consent forms configured per regional regulatory framework, with additional consent specificity for aesthetic procedures where regional regulation requires it; implant tracking is supported through the inventory module (M07) with implant records linked to the patient and the procedure; cosmetic injectable logs are supported through a structured log configured through the clinical documentation module (M03).

Regulatory exposure for aesthetic procedures is heightened in many jurisdictions by advertising and marketing restrictions, mandatory cooling-off periods before elective procedures, and reporting requirements for adverse events. The overlay's regional configuration pack addresses these requirements through documentation templates and workflow configurations that enforce the required cooling-off periods and capture the required adverse event information. The customer's system administrator is responsible for activating the correct regional configuration pack for each facility; activation is recorded in the audit trail.

### 2.4 Customer Maturity Profile

Plastic surgery customers vary in maturity. Established practices with mature electronic health record use configure Ibn Hayan to match their existing operational patterns; transitioning customers from paper-based or basic electronic systems require more onboarding support. Aesthetic practices with established before/after imaging libraries may require data migration support to incorporate existing images into Ibn Hayan. The onboarding workflow in Section 9 of `CLINIC_TYPES.md` scales stage duration and complexity to the customer's maturity profile and the overlay's configuration complexity.

---

## 3. Recommended Modules

### 3.1 Core Module Composition

The recommended module composition for plastic surgery follows the surgical specialty family pattern stated in Section 6.2 of `CLINIC_TYPES.md`. The table below summarizes the recommended modules; module codes are defined in Section 19.2 of `PRODUCT_BIBLE.md`.

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Core | Patient registration, demographics, procedural consent including aesthetic-specific consent |
| Encounter | M02 | Core | Outpatient consultations, operative encounters, post-operative follow-up |
| Clinical Documentation | M03 | Core | Plastic surgery-specific documentation templates, structured assessment instruments |
| Orders & Results | M04 | Core | Laboratory orders, imaging orders, pathology orders |
| Pharmacy | M05 | Core | Medication management, post-operative pain management, cosmetic injectable tracking |
| Scheduling | M06 | Core | Outpatient appointments, operative scheduling, multi-stage procedure scheduling |
| Documents | M07 | Core | Consent documents, procedural documentation, implant records, before/after imaging |
| Notifications | M08 | Core | Appointment reminders, post-operative follow-up reminders, cooling-off period reminders |
| Billing | M09 | Core | Procedural billing, aesthetic procedure billing, insurance claim submission |
| Accounting | M10 | Optional | General ledger for private practices with their own accounting |
| CRM | M11 | Optional | Patient outreach, recall for aesthetic maintenance procedures |
| HR | M12 | Optional | Employee management for practices with administrative and clinical staff |
| Workforce | M13 | Optional | Scheduling of clinical staff, credentialing, OR block management |
| Identity & Access | M14 | Core | Authentication, role-based access including before/after image access control |
| Configuration | M15 | Core | Configuration surface for overlay refinement |
| Audit | M16 | Core | Audit trail for procedural and clinical actions |
| Integration | M17 | Optional | Integration with imaging systems, simulation software, implant registries |
| Reporting | M18 | Core | Clinical outcomes reporting, procedural volume reporting, patient-reported outcomes reporting |
| Localization | M19 | Core | Regional regulatory framework, language adaptation |

### 3.2 Module Activation Considerations

The core module set is recommended for every plastic surgery deployment; the optional modules are added based on the customer's operational reality. A solo aesthetic plastic surgeon may decline M10 (Accounting) and M11 (CRM); a mid-sized group practice typically adds both; a hospital-based plastic surgery department typically operates within the hospital's broader module set, which includes all 19 modules. Module enablement is governed by the dependency rules in Section 9.4 of `SYSTEM_ARCHITECTURE.md`.

The documents module (M07) is particularly relevant for plastic surgery given the specialty's reliance on before/after imaging. The documents module provides the framework for image storage, indexing, and retrieval, with the actual imaging workflow configured through the documents module's standard configuration surface. The integration module (M17) provides the framework for connecting imaging devices (clinical cameras, 3D imaging systems) to Ibn Hayan, with the actual integration performed through anticorruption layer connectors described in Section 7.3 of `SYSTEM_ARCHITECTURE.md`.

### 3.3 Edition Packaging

The recommended editions for plastic surgery are Professional (E2) for office-based practice and Enterprise (E3) for practices with operative capability or for hospital-based departments. The Professional edition provides the configuration depth, multi-user support, and procedural documentation capabilities that plastic surgery requires; the Enterprise edition adds multi-facility operation, advanced integration, and dedicated support for the more complex operational reality of operative and hospital-based practice. Edition packaging is governed by Section 16 of `PRODUCT_BIBLE.md`.

---

## 4. Pre-Operative Assessment

### 4.1 Medical Assessment

Pre-operative medical assessment in plastic surgery follows the same standards as other surgical specialties, with assessment of cardiovascular, respiratory, and other systemic conditions that affect anaesthetic and surgical risk. The Ibn Hayan plastic surgery overlay ships a pre-operative medical assessment template that captures the standard elements: history (medical, surgical, anaesthetic, medication, allergy, family), physical examination (vital signs, systemic examination), laboratory investigations (complete blood count, coagulation, biochemistry as indicated), and anaesthetic assessment (airway, fasting status, anaesthetic risk stratification). The template is configured through the clinical documentation module (M03) and is presented automatically when the encounter type is pre-operative consultation.

The pre-operative medical assessment is integrated with the anaesthetic assessment workflow, with the assessment findings shared with the anaesthetist through the encounter documentation. The integration respects the boundary between the plastic surgeon's pre-operative assessment and the anaesthetist's pre-anaesthetic assessment; both are documented in the same encounter but in distinct sections, with each section owned by the responsible practitioner. The integration is configured through the clinical documentation module's standard configuration surface.

### 4.2 Aesthetic Assessment

Aesthetic assessment is the structured evaluation of the patient's aesthetic concerns and goals, conducted for aesthetic procedures and for reconstructive procedures where aesthetic outcome is a consideration. The Ibn Hayan plastic surgery overlay ships an aesthetic assessment template that captures the standard elements: the patient's stated concerns (with structured categories for facial, breast, body, and skin concerns), the patient's goals (with structured prompts for goal specificity and realism), the aesthetic examination (with anatomic measurements recorded as structured values), and the surgeon's assessment (with structured fields for the surgical and non-surgical options considered). The template is configured through the clinical documentation module and is versioned alongside the overlay.

Aesthetic assessment includes standardised anatomic measurements appropriate to the procedure: facial measurements (nasofacial angles, forehead height, orbital distance) for facial procedures; breast measurements (sternal notch to nipple, nipple to inframammary fold, breast base width) for breast procedures; body measurements (waist circumference, hip circumference, skin laxity assessment) for body contouring procedures. The measurements are recorded as structured values to support surgical planning and longitudinal outcome assessment.

### 4.3 Psychological Assessment

Psychological assessment is the evaluation of the patient's psychological readiness for aesthetic procedures, conducted to identify patients for whom the procedure may not be appropriate (e.g., patients with body dysmorphic disorder, patients with unrealistic expectations, patients with active psychiatric instability). The overlay ships a psychological assessment template that captures the standard elements: psychiatric history, current psychiatric status, motivation for the procedure, expectation assessment (with structured prompts for expectation realism), and the surgeon's assessment of psychological readiness. The template is configured through the clinical documentation module.

Psychological assessment is supported by validated screening instruments where appropriate (e.g., Body Dysmorphic Disorder Questionnaire), with the instruments configured as structured assessment instruments through the clinical documentation module. The screening instruments are administered pre-procedure, with the results presented to the surgeon as clinical decision support. A positive screen does not automatically contraindicate the procedure; it triggers a referral for psychological evaluation, with the evaluation result documented in the patient's record before the procedure proceeds.

### 4.4 Informed Consent for Aesthetic Procedures

Informed consent for aesthetic procedures presents additional considerations compared to therapeutic procedures. The patient must understand that the procedure is elective, that the outcome is not guaranteed, that complications may occur, and that the procedure may not achieve the patient's aesthetic goals. The overlay ships aesthetic procedure consent forms that capture these specific elements, with the forms configured through the patient module's consent management capability and versioned alongside the regional configuration pack. The consent forms include the procedure description, the realistic outcome range, the complications and their frequencies, the alternatives (including no treatment), and the patient's acknowledgement.

Where regional regulation requires a cooling-off period between consent and procedure (typically 7 to 14 days for aesthetic procedures), the consent workflow is configured to enforce the cooling-off period, with the procedure scheduling system prevented from scheduling the procedure within the cooling-off period. The enforcement is configured through the workflow engine, with the workflow recording the consent date, the cooling-off period end date, and the procedure date. The enforcement is a configuration choice that reflects regional regulatory requirements; the customer cannot disable the enforcement below the regional regulatory minimum.

---

## 5. Surgical Planning

### 5.1 Anatomic Measurement and Documentation

Surgical planning in plastic surgery is grounded in anatomic measurement, with the measurements informing the surgical approach, the expected outcome, and the implant or graft selection. The Ibn Hayan plastic surgery overlay supports anatomic measurement documentation through structured field sets configured per procedure type. The measurements are captured during the pre-operative consultation and are presented to the surgeon during surgical planning, with the measurements supporting the planning decisions.

Anatomic measurements are integrated with the before/after imaging workflow: the measurements are recorded alongside the pre-operative photographs, with both referenced during surgical planning and post-operative outcome assessment. The integration is configured through the documents module's (M07) standard configuration surface, with the measurements and images linked through the patient's longitudinal plastic surgery record. The integration supports surgical planning by providing a unified view of the patient's anatomic baseline.

### 5.2 Imaging and Simulation

Imaging and simulation are integral to surgical planning for many plastic surgery procedures. Pre-operative photographs are the baseline for all procedures; 3D imaging supports planning for facial procedures, breast procedures, and body contouring procedures; and 3D simulation supports patient communication and expectation setting. The overlay supports imaging and simulation through the documents module (M07) for image storage and through the integration module (M17) for connection to 3D imaging and simulation systems.

Simulation results are documented in the surgical plan, with the simulation output (predicted post-procedure appearance) recorded alongside the surgical plan. The simulation is advisory; the actual outcome may differ from the simulation, and the patient is informed of this difference during the consent process. The simulation is not a substitute for the surgeon's clinical judgement; it is a tool that supports the judgement. The advisory posture is a clinical practice consideration, not a configuration constraint; the configuration supports the advisory use of simulation without enforcing it.

### 5.3 Flap Design and Planning

Reconstructive flap surgery requires detailed flap design and planning, with the flap's anatomy (vascular pedicle, tissue type, dimensions) documented before the procedure. The overlay ships a flap planning template that captures the standard elements: defect description (location, size, depth, exposed structures), flap selection (free flap, pedicled flap, local flap), flap anatomy (vascular pedicle, nerve supply, dimensions), and the planned inset. The template is configured through the clinical documentation module and is presented during the surgical planning encounter.

Flap planning is integrated with the procedural documentation: the planned flap is referenced in the procedural documentation, with the actual flap (with any intra-operative modifications) documented against the plan. The integration supports quality improvement by allowing comparison of planned and actual flap outcomes, with the comparison supporting the surgeon's continuous improvement. The integration is configured through the clinical documentation module's standard configuration surface.

### 5.4 Implant Selection and Planning

Implant selection is integral to many plastic surgery procedures, particularly breast augmentation and reconstruction. The overlay supports implant selection and planning through structured fields that capture the implant characteristics (manufacturer, model, size, profile, shape), the selection rationale (patient anatomy, patient preference, surgeon recommendation), and the planned placement (subglandular, submuscular, dual-plane). The implant selection is documented in the surgical plan, with the implant recorded in the implant tracking system when the implant is placed.

Implant selection is supported by clinical decision support that surfaces implant characteristics relevant to the patient's anatomy and goals, with the support configured through the clinical documentation module's clinical decision support surface. The support is advisory; the surgeon may select any implant that is appropriate, with the selection documented. The support is reviewed when the overlay is revised and is updated to reflect evolving implant technology and clinical evidence.

---

## 6. Procedure Documentation

### 6.1 Procedural Documentation Structure

Procedural documentation in plastic surgery follows the standard surgical documentation structure with plastic surgery-specific extensions. The Ibn Hayan plastic surgery overlay ships procedural documentation templates that capture the standard elements: pre-procedure verification (patient identity, procedure, consent, site marking), anaesthesia documentation, operative findings, procedure performed (with structured fields for the specific technique used), tissue handled (with structured fields for tissue removed, tissue transferred, implants placed), complications (with structured categories), and post-procedure disposition. The templates are configured through the clinical documentation module (M03) and are versioned alongside the overlay.

Procedural documentation is encounter-type-aware, with the template selected based on the procedure type. Office-based procedures (cosmetic injectables, minor skin excisions) use a streamlined template that captures the essential elements without the overhead of an operative procedure template. Operative procedures (rhinoplasty, abdominoplasty, breast augmentation, free-flap transfer) use the full template, with the structured fields adapted to the specific procedure. The encounter type is selected at encounter creation; the appropriate template is applied automatically based on the encounter type.

### 6.2 Reconstructive Procedure Documentation

Reconstructive procedure documentation includes additional elements specific to reconstructive surgery: defect description (with structured fields for location, size, depth, exposed structures), reconstructive technique (with structured categories for primary closure, skin graft, local flap, regional flap, free flap), flap documentation (with structured fields for flap type, vascular pedicle, inset, ischaemia time), and graft documentation (with structured fields for graft type, donor site, graft dimensions, fixation method). The documentation is configured through the clinical documentation module and is presented during the operative encounter.

Reconstructive procedure documentation is integrated with the longitudinal reconstructive outcome record, allowing the surgeon to track the outcome of the reconstruction over time. The integration supports the assessment of reconstructive success (flap survival, functional outcome, aesthetic outcome) and supports quality improvement by allowing comparison of techniques and outcomes across cases. The integration is configured through the reporting module's (M18) longitudinal view capability.

### 6.3 Aesthetic Procedure Documentation

Aesthetic procedure documentation includes additional elements specific to aesthetic surgery: aesthetic goal documentation (with structured fields for the patient's stated goals), aesthetic outcome documentation (with structured fields for the surgeon's assessment of outcome against goals), patient satisfaction documentation (with structured fields for patient-reported satisfaction), and before/after imaging linkage (with structured references to the pre-operative and post-operative images). The documentation is configured through the clinical documentation module.

Aesthetic procedure documentation is integrated with the cosmetic injectable log (for injectable procedures) and with the implant tracking system (for implant-based aesthetic procedures such as breast augmentation). The integration supports regulatory reporting where required and supports post-market surveillance for implants. The integration is configured through the inventory module's (M07) implant tracking capability and through the clinical documentation module's structured log capability.

### 6.4 Cosmetic Injectable Log

Cosmetic injectable procedures (botulinum toxin, dermal fillers) require a log that captures the product, the lot number, the injection sites, the doses, and the patient. The log is a regulatory requirement in many jurisdictions and supports post-market surveillance for adverse events. The Ibn Hayan plastic surgery overlay ships a cosmetic injectable log template that captures the standard elements, with the log configured through the clinical documentation module (M03) and integrated with the procedural documentation workflow.

The log is associated with the procedural encounter and with the patient's longitudinal plastic surgery record, allowing the surgeon to track the patient's injection history and to plan future injections. The log is queryable through the reporting module (M18), supporting adverse event surveillance and product-specific outcome tracking. The log is subject to the same audit and retention requirements as other procedural documentation, with retention enforced at the platform layer per regional regulatory requirements.

---

## 7. Recovery Tracking

### 7.1 Post-Operative Recovery Documentation

Post-operative recovery documentation captures the patient's recovery trajectory after a plastic surgery procedure. The Ibn Hayan plastic surgery overlay ships a post-operative recovery template that captures the standard elements: wound assessment (with structured fields for wound healing, drainage, dehiscence, infection), symptom assessment (with structured fields for pain, swelling, bruising), functional assessment (with structured fields for range of motion, sensation, function), and aesthetic assessment (with structured fields for contour, symmetry, scar quality). The template is configured through the clinical documentation module (M03) and is presented at each post-operative encounter.

Post-operative recovery documentation is encounter-type-aware, with the template's structured fields adapted to the procedure performed. Breast augmentation recovery documentation includes breast-specific fields (implant position, capsular contracture assessment, nipple sensation); rhinoplasty recovery documentation includes nasal-specific fields (nasal airway, tip support, dorsal contour); abdominoplasty recovery documentation includes abdominal-specific fields (wound tension, seroma, umbilical healing). The adaptation is configured through the clinical documentation module's template configuration surface.

### 7.2 Recovery Schedule Configuration

Recovery schedules are configured per procedure type, with the schedule defining the timing and content of post-operative encounters. The overlay ships default recovery schedules for common plastic surgery procedures: breast augmentation (1 week, 4 weeks, 3 months, 6 months, 12 months), rhinoplasty (1 week, 2 weeks, 6 weeks, 3 months, 6 months, 12 months), abdominoplasty (1 week, 2 weeks, 6 weeks, 3 months, 6 months, 12 months), and free-flap reconstruction (post-operative day 1, 2, 3, 5, 7, 2 weeks, 6 weeks, 3 months, 6 months, 12 months). The schedules are configured through the scheduling module's (M06) standard configuration surface.

Recovery schedules are starting points; the surgeon may modify the schedule based on the patient's recovery trajectory, with the modification documented in the patient's record. The schedule supports the surgeon's recovery monitoring by prompting the encounter at the appropriate interval and by surfacing the structured recovery documentation from previous encounters for comparison. The schedule is also the basis for recovery adherence reporting, with the reporting module (M18) surfacing patients with overdue recovery encounters for follow-up.

### 7.3 Complication Tracking

Complication tracking is the structured capture of complications that occur during recovery, supporting quality improvement and regulatory reporting. The overlay ships a complication tracking template that captures the standard elements: complication type (with structured categories including haematoma, infection, wound dehiscence, necrosis, seroma, capsular contracture, hypertrophic scarring, asymmetry), complication severity (with structured severity levels), intervention performed (with structured intervention categories), and outcome (with structured outcome categories). The template is configured through the clinical documentation module.

Complication tracking is integrated with the procedural documentation, with the complication linked to the procedure that produced it. The integration supports quality improvement by allowing the surgeon to assess complication rates by procedure type, by patient characteristics, and by technique. The integration is configured through the reporting module's longitudinal view capability. Complication tracking is also the basis for regulatory reporting where regional regulation requires adverse event reporting for plastic surgery procedures.

### 7.4 Longitudinal Outcome Assessment

Longitudinal outcome assessment is the structured evaluation of the procedure's outcome over time, supporting the surgeon's assessment of the procedure's success and supporting quality improvement. The overlay supports longitudinal outcome assessment through structured outcome assessment templates that are presented at configured intervals after the procedure: short-term (3 months), medium-term (12 months), and long-term (3 years, 5 years). The templates capture functional outcome, aesthetic outcome (surgeon-assessed and patient-assessed), and patient satisfaction.

Longitudinal outcome assessment is supported by patient-reported outcome measures (PROMs) configured as structured assessment instruments through the clinical documentation module. The PROMs are administered at the configured intervals, with the results presented in the patient's longitudinal plastic surgery record alongside the surgeon's assessment. The PROMs support the surgeon's assessment by capturing the patient's perspective on the outcome, which may differ from the surgeon's assessment.

---

## 8. Before/After Imaging

### 8.1 Standardised Imaging Protocols

Before/after imaging in plastic surgery requires standardised imaging protocols to ensure that images are comparable across time points. The Ibn Hayan plastic surgery overlay ships standardised imaging protocols for the common plastic surgery procedures, with the protocols defining the camera settings (distance, angle, lighting, background), the patient positioning, the anatomic views captured, and the image labelling conventions. The protocols are configured through the documents module (M07) and are versioned alongside the overlay.

The protocols are procedure-specific: breast imaging protocols include anterior, lateral, and oblique views with standardised arm positioning; facial imaging protocols include anterior, lateral, oblique, and basal views with standardised head positioning; body contouring imaging protocols include anterior, lateral, and posterior views with standardised posture. The protocols are presented to the photographer (typically a medical assistant or designated clinical photographer) at image capture, with the protocol's structured fields guiding the capture.

### 8.2 Image Capture and Storage

Image capture is performed through clinical cameras integrated with Ibn Hayan through the integration module (M17) or through manual upload of images captured on standalone cameras. Integrated capture is preferred for workflow efficiency and for image metadata accuracy; manual upload is appropriate for practices without integrated cameras or for retrospective image import. Both modes are supported by the overlay, with the mode selected based on the equipment available and the practice's operational reality.

Image storage is managed through the documents module (M07), with images stored in the patient's longitudinal plastic surgery record. Each image is associated with the patient, the encounter in which it was captured, the procedure (where applicable), the imaging protocol used, and the image metadata (capture date, capture device, camera settings). The image metadata supports longitudinal comparison by ensuring that images captured at different time points can be compared meaningfully.

### 8.3 Image Access Control

Before/after images are subject to additional access control considerations given their sensitive nature. The overlay's permission framework restricts image access to authorised users with a clinical or operational need, with access logged in the audit trail per Principle P13 (Auditability as Primitive) stated in Section 4.13 of `SYSTEM_ARCHITECTURE.md`. Patients may access their own images through the patient portal, with the access governed by the patient's consent record.

Image access is configured through the permission framework's standard configuration surface, with the configuration defining which roles may access which image categories. The configuration is versioned alongside the customer's configuration and is subject to the standard validation rules. Image access cannot be relaxed below the regional regulatory minimum, which is enforced at the platform layer. Image access is reviewed periodically by the practice's privacy officer or equivalent, with the review documented.

### 8.4 Longitudinal Image Comparison

Longitudinal image comparison is the side-by-side presentation of before and after images, supporting the surgeon's outcome assessment and the patient's understanding of the procedure's effect. The overlay supports longitudinal image comparison through the documents module's (M07) image comparison capability, with the comparison presented in the patient's longitudinal plastic surgery record. The comparison is read-only; it is generated from the stored images and does not constitute a separate data entry surface.

Longitudinal image comparison is configured per procedure type, with the comparison presenting the standard views for the procedure type. The comparison is also encounter-aware, with the comparison presenting the most recent image alongside the pre-operative baseline and any intermediate images. The comparison supports the surgeon's outcome assessment by surfacing changes that may not be apparent in individual images, particularly for procedures where the outcome matures over time (e.g., scar maturation after rhinoplasty).

---

## 9. Specialty Workflows

### 9.1 Workflow Inventory

The Ibn Hayan plastic surgery overlay ships a default set of workflows tuned to plastic surgery practice. The workflows are defined declaratively through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md` Section 2.

| Workflow | Code | Trigger | Key Steps | Outcome |
|---|---|---|---|---|
| Initial plastic surgery consultation | PSW1 | Scheduled appointment | Patient check-in, aesthetic or reconstructive assessment, anatomic measurement, pre-operative photography, treatment plan, follow-up scheduling | Consultation documented; treatment plan created |
| Pre-operative assessment | PSW2 | Scheduled procedure | Medical assessment, anaesthetic assessment, consent, cooling-off period enforcement | Assessment documented; consent obtained |
| Operative procedure | PSW3 | Scheduled procedure | Pre-procedure verification, anaesthesia, procedure, recovery, discharge | Procedure documented; recovery initiated |
| Office-based aesthetic procedure | PSW4 | Scheduled appointment | Consent, procedure (injectable, minor excision), post-procedure monitoring, discharge | Procedure documented; injectable log updated |
| Post-operative recovery follow-up | PSW5 | Scheduled follow-up | Wound assessment, symptom assessment, complication assessment, before/after imaging, treatment plan adjustment | Follow-up documented; plan updated |
| Longitudinal outcome assessment | PSW6 | Scheduled assessment | PROM administration, surgeon outcome assessment, before/after imaging, documentation | Outcome documented; longitudinal record updated |
| Implant tracking and recall response | PSW7 | Implant placed or recall received | Implant record creation or recall matching, patient notification, recall response documentation | Implant tracked; recall response documented |
| Complication management | PSW8 | Complication identified | Complication documentation, intervention, outcome tracking, regulatory reporting if applicable | Complication managed; documentation complete |

### 9.2 Workflow Customization

Workflows may be customized through the workflow engine's configuration surface, subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The customization posture is a direct consequence of Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md`.

Customization examples include adding regional consent forms and cooling-off period requirements to the pre-operative assessment workflow, adjusting the recovery schedule based on the patient population's recovery patterns, and adding customer-specific complication categories to the complication management workflow. Each customization is applied as a facility-level or department-level override, with the underlying platform-provided workflow retained unchanged.

---

## 10. Specialty Data Models

### 10.1 Conceptual Entity Overview

The data entities referenced by the plastic surgery clinic type overlay are conceptual; this section describes the entities by name and relationship, not by implementation. Database schemas, persistence models, and data access patterns are out of scope for this document per the metadata table above and are addressed in module-specific documentation.

The plastic surgery overlay references the following conceptual entities: Patient, Encounter, Clinical Documentation Record, Pre-Operative Assessment Record, Aesthetic Assessment Record, Psychological Assessment Record, Anatomic Measurement Record, Surgical Plan, Procedural Documentation Record, Reconstructive Flap Record, Implant Record, Cosmetic Injectable Log Entry, Recovery Documentation Record, Complication Record, Outcome Assessment Record, Patient-Reported Outcome Measure Record, Image Record, Consent Record, and Treatment Plan. Each entity is owned by a bounded context defined in Section 7 of `SYSTEM_ARCHITECTURE.md`; the plastic surgery overlay composes these entities into plastic surgery-specific workflows and documentation structures.

### 10.2 Entity Relationships

The Patient entity is the central reference: every other entity is associated with a Patient. The Encounter entity is associated with a Patient and with one or more Clinical Documentation Records. The Surgical Plan is associated with a Patient and with the Encounter in which it was created; it is referenced by the Procedural Documentation Record for the procedure it planned. The Implant Record is associated with a Patient, with the Procedural Documentation Record for the procedure in which the implant was placed, and with the manufacturer's product catalogue entry.

The Image Record is associated with a Patient, with the Encounter in which it was captured, with the imaging protocol used, and with the procedure (where applicable). The Recovery Documentation Record is associated with a Patient, with the Procedural Documentation Record for the procedure it follows, and with the Encounter in which it was documented. The Complication Record is associated with a Patient, with the Procedural Documentation Record, and with the intervention performed. The Outcome Assessment Record is associated with a Patient, with the Procedural Documentation Record, and with the Patient-Reported Outcome Measure Record (where PROMs are administered).

### 10.3 Longitudinal Records

Several plastic surgery entities are longitudinal rather than encounter-bound: the patient's aesthetic or reconstructive outcome, the patient's complication history, the patient's image library, the patient's implant history, and the patient's cosmetic injectable history. These longitudinal records are constructed from the encounter-bound records through the reporting module's longitudinal view capability. The longitudinal records support clinical decision-making by surfacing the patient's history in a unified view.

Longitudinal records are read-only; they are generated from the encounter-bound records and do not constitute a separate data entry surface. The encounter-bound records remain the authoritative source; the longitudinal view is a derived presentation. The longitudinal view is configured through the reporting module's standard configuration surface, with the configuration defining which entities are included, how they are presented, and what time period is covered.

---

## 11. Forms & Templates

### 11.1 Encounter Templates

The plastic surgery overlay ships encounter templates for the encounter types common in plastic surgery practice: initial consultation, pre-operative consultation, operative encounter, office-based aesthetic procedure, post-operative follow-up, longitudinal outcome assessment, and telehealth encounter. Each template defines the documentation sections required, the structured fields included, the order sets suggested, and the workflow steps associated with the encounter type. Templates are versioned alongside the overlay and are reviewed when the overlay is revised.

Encounter templates are configured through the clinical documentation module (M03) and are subject to the standard validation rules. Customers may refine templates through the configuration surface at the facility, department, or care-team layer, with refinements recorded as overrides on the platform-provided template. Customers may not modify the platform-provided template's underlying definition; this restriction preserves the overlay's coherence and is stated in Section 5.4 of `CLINIC_TYPES.md`.

### 11.2 Procedural Documentation Templates

Procedural documentation templates support the structured capture of procedural information. The plastic surgery overlay ships templates for the procedures common in plastic surgery practice: rhinoplasty, blepharoplasty, facelift, otoplasty, breast augmentation, breast reduction, mastopexy, breast reconstruction (implant-based and autologous), abdominoplasty, liposuction, body contouring after massive weight loss, cleft lip and palate repair, free-flap reconstruction, skin graft, local flap, and cosmetic injectable procedures. Each template is configured through the clinical documentation module and is subject to the standard validation, versioning, and audit rules.

| Template | Procedure Category | Mandatory Sections | Configurable Fields |
|---|---|---|---|
| Rhinoplasty | Facial aesthetic | Indication, approach, technique, grafts if used, complications, disposition | Approach (open, closed), graft material |
| Breast augmentation | Breast aesthetic | Indication, approach, implant details, pocket plane, complications, disposition | Implant characteristics, pocket plane |
| Free-flap reconstruction | Reconstructive | Defect, flap selection, vascular pedicle, inset, ischaemia time, complications, disposition | Flap type, recipient vessels |
| Cleft lip repair | Paediatric reconstructive | Indication, technique, measurements, complications, disposition | Technique variation |
| Cosmetic injectable | Office-based aesthetic | Indication, product, lot, injection sites, doses, complications, disposition | Product, injection pattern |

### 11.3 Consent Forms

Consent forms are a distinct template category given the consent specificity required for plastic surgery, particularly for aesthetic procedures. The plastic surgery overlay ships consent form templates for each procedural category, with the templates configured through the patient module's consent management capability and versioned alongside the regional configuration pack. The consent forms include the procedure description, the realistic outcome range, the complications and their frequencies, the alternatives (including no treatment), the patient's acknowledgement, and (for aesthetic procedures) the cooling-off period acknowledgement.

Consent forms are signed by the patient (or legal guardian for paediatric procedures) and are recorded in the patient's consent record. The consent record is the basis for procedural authorisation: a procedure cannot be performed without the appropriate consent on file. For aesthetic procedures, the consent must be obtained within the cooling-off period required by regional regulation, with the consent workflow configured to enforce the cooling-off period as described in Section 4.4 of this document.

### 11.4 Patient-Facing Materials

The plastic surgery overlay ships a library of patient-facing materials that the surgeon may provide to patients: procedure information sheets (for common plastic surgery procedures), diagnosis education sheets (for common plastic surgery diagnoses), pre-operative preparation instructions, post-operative care instructions (procedure-specific), and patient-reported outcome questionnaires. The materials are configured through the documents module (M07) and are versioned alongside the overlay. The materials are available in the languages supported by the customer's regional configuration pack; translation is performed through the localization module (M19).

---

## 12. Reports & Analytics

### 12.1 Clinical Outcome Reports

Clinical outcome reports support the surgeon's assessment of treatment response and the patient's progress toward treatment goals. The plastic surgery overlay ships default clinical outcome reports including the longitudinal outcome report (presenting surgeon-assessed and patient-reported outcomes across the recovery trajectory), the complication rate report (complications by procedure type, by surgeon), the PROM aggregate report (aggregate PROM scores by procedure type), and the implant outcome report (implant survival, capsular contracture rate, revision rate). Each report is configured through the reporting module (M18) and is generated from the structured field values recorded during encounters.

Clinical outcome reports are typically accessed by the surgeon during clinical care and by the practice's quality improvement committee. Access is governed by the permission framework. Reports are generated on demand and on configured schedules, with the schedule configured through the reporting module's standard configuration surface.

### 12.2 Operational Reports

Operational reports support the practice's management and quality improvement activities. The plastic surgery overlay ships default operational reports including the appointment adherence report, the encounter volume report, the procedural volume report (procedures by type, by surgeon, by time period), the documentation completion report, the consent compliance report (procedures with consent on file and within cooling-off period at the time of procedure), and the recovery adherence report (patients with overdue recovery encounters). Each report is configured through the reporting module and is generated from operational data.

Operational reports are typically accessed by practice administrators and clinical leads. Reports that include individual surgeon performance data are subject to additional access restrictions; access is logged in the audit trail. The reports support practice management decisions including staffing, scheduling, and quality improvement initiatives.

### 12.3 Regulatory Reports

Regulatory reports support the practice's compliance with regional regulatory requirements. The plastic surgery overlay ships default regulatory reports including the implant registry report (implants placed, with patient and procedural detail, where regional regulation requires implant registry submission), the cosmetic injectable log report (injectable procedures with product, lot, and patient detail, where regional regulation requires), the adverse event report (complications reportable to regional regulatory authorities), and the aesthetic procedure registry report (where regional regulation maintains an aesthetic procedure registry). Each report is configured through the regional configuration pack and is updated when regional regulations change.

Regulatory reports are generated on the schedule required by regional regulation. Reports are submitted to the appropriate regulatory authority through the integration module (M17) where electronic submission is supported, or are exported in the format required for manual submission. Submission is recorded in the audit trail.

### 12.4 Quality Improvement Reports

Quality improvement reports support the practice's quality improvement activities. The plastic surgery overlay ships default quality improvement reports including the surgical site infection rate report, the unplanned reoperation rate report, the patient satisfaction aggregate report, and the technique comparison report (outcomes by surgical technique, supporting evidence-based technique selection). Each report is configured through the reporting module and is generated from clinical and operational data.

Quality improvement reports are reviewed at configured intervals by the practice's quality improvement committee. The review is documented, and the resulting quality improvement actions are tracked through the platform's task management capability. Quality improvement reports are subject to the same access controls as other clinical documentation.

---

## 13. Role & Permission Recommendations

### 13.1 Specialty-Specific Roles

The Ibn Hayan plastic surgery overlay recommends the following role assignments for plastic surgery practice, building on the role catalogue defined in `USER_ROLES.md`.

| Role | Code | Specialty Application | Typical Permission Scope |
|---|---|---|---|
| Physician | R01 | Plastic surgeon | Full clinical access to own patient panel; procedural documentation; prescribing |
| Nurse | R02 | Plastic surgery nurse | Clinical access to assigned patients; procedure assistance; patient education |
| Physician assistant / Advanced practice nurse | R03 | Plastic surgery APP | Clinical access under supervising surgeon; procedural assistance; prescribing per scope |
| Medical assistant | R04 | Plastic surgery medical assistant | Limited clinical access; rooming, vitals, anatomic measurement, photography |
| Allied health professional | R05 | Clinical photographer, aesthetician | Image capture; aesthetic procedure assistance |
| Patient | R06 | Plastic surgery patient | Portal access to own record, appointments, secure messaging, before/after images |
| Patient family / Caregiver | R07 | Family member or caregiver | Limited portal access with patient authorization |
| Billing specialist | R08 | Plastic surgery billing specialist | Billing and claims access; no clinical access |
| Facility administrator | R09 | Practice administrator | Administrative access; no clinical access |
| Customer administrator | R10 | Customer system administrator | Configuration and user management; no clinical access |
| Auditor | R11 | Compliance auditor | Read-only access to audit trail and compliance reports |
| Support engineer | R12 | Implementation consultant | Configuration access during implementation; no production clinical access |

### 13.2 Permission Defaults

Permission defaults are configured to support the principle of least privilege. A plastic surgeon has full clinical access to their own patient panel, with access to other surgeons' patients restricted to covering arrangements. A plastic surgery nurse has clinical access to assigned patients, with access to procedure assistance documentation but not to procedural performance documentation. A clinical photographer has access to image capture and image management but not to other clinical documentation.

Permission defaults for before/after images are particularly restrictive given the sensitive nature of the images. Image access is restricted to authorised users with a clinical or operational need, with access logged in the audit trail. Patients may access their own images through the patient portal, with the access governed by the patient's consent record. Image access is reviewed periodically by the practice's privacy officer or equivalent.

### 13.3 Covering Arrangement Permissions

Covering arrangements — where one plastic surgeon covers another's patients during absence — require temporary permission grants. The Ibn Hayan platform supports covering arrangements through the permission framework's time-bounded permission grant capability, with the grant configured with a start date, an end date, and the patient panel covered. The grant is recorded in the audit trail, with the granting user, the receiving user, the patient panel, and the time period documented.

Covering arrangement permissions are subject to additional verification: the receiving surgeon must have the appropriate credentials for the clinic type, the patient panel must be within the same customer and facility, and the consent on file must permit access by the covering physician. Where consent does not permit access by the covering physician, the covering arrangement is flagged for resolution before access is granted; in emergency situations, emergency access may be granted with the access documented for retrospective review.

---

## 14. Configuration Defaults

### 14.1 Encounter Configuration Defaults

The plastic surgery overlay ships encounter configuration defaults tuned to plastic surgery practice. Default appointment durations are 60 minutes for initial consultation, 30 minutes for pre-operative consultation, 90 to 240 minutes for operative encounters (varies by procedure), 30 minutes for office-based aesthetic procedures, 30 minutes for post-operative follow-up, and 60 minutes for longitudinal outcome assessment. Default encounter templates are configured per encounter type. Default documentation completion expectation is set to within 24 hours for outpatient encounters and within 48 hours for operative encounters.

Encounter configuration defaults are starting points; customers may refine them through the configuration surface at the facility, department, or care-team layer. Refinements are subject to the standard validation rules and are recorded in the audit trail. Defaults are reviewed when the overlay is revised and are updated to reflect evolving practice patterns and regulatory requirements.

### 14.2 Documentation Configuration Defaults

Documentation configuration defaults include the structured field sets for each documentation template, the validation rules that govern documentation completion, and the longitudinal view configurations that present documentation across encounters. Default structured field sets include all fields required by the regional regulatory framework and the clinical standard of care. Default validation rules require completion of mandatory sections before the encounter can be closed.

Documentation configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add fields through the configuration surface, with additions subject to the standard validation rules. Customers may not remove fields that are required by the regional regulatory framework; this restriction is enforced at the platform layer and is not customer-modifiable.

### 14.3 Imaging Configuration Defaults

Imaging configuration defaults include the standardised imaging protocols described in Section 8.1, the image storage configuration, and the image access control configuration. Default imaging protocols are configured per procedure type, with the protocols defining the camera settings, patient positioning, anatomic views, and image labelling conventions. Default image storage configuration stores images in the patient's longitudinal plastic surgery record, with images associated with the patient, encounter, procedure, and imaging protocol.

Imaging configuration defaults also include the cosmetic injectable log configuration, with the log configured to capture the product, lot number, injection sites, doses, and patient. The log is integrated with the procedural documentation workflow, with the log entry created automatically when an injectable procedure is documented. The log is queryable through the reporting module, supporting adverse event surveillance and product-specific outcome tracking.

### 14.4 Reporting Configuration Defaults

Reporting configuration defaults include the default report set described in Section 12 of this document, with each report configured with the default parameters and the default delivery schedule. Customers may refine report parameters and schedules through the configuration surface, with refinements recorded in the audit trail. Reports are subject to the same access controls as other clinical documentation; access is governed by the permission framework and is logged in the audit trail.

---

## 15. Onboarding Checklist

### 15.1 Onboarding Workflow Stages

The onboarding workflow for plastic surgery follows the eight-stage process defined in Section 9 of `CLINIC_TYPES.md`, with stage durations scaled to the overlay's configuration complexity. The indicative onboarding timeline is 3–5 weeks for a typical plastic surgery practice, with longer timelines for practices with operative capability and for hospital-based departments.

| Stage | Code | Activity | Owner | Indicative Duration |
|---|---|---|---|---|
| Clinic type selection | O1 | Confirm plastic surgery clinic type at facility | Customer administrator | 1 day |
| Overlay activation | O2 | Apply plastic surgery overlay to facility configuration | Customer administrator | 1 day |
| Module enablement | O3 | Enable core modules; configure imaging integration; configure implant tracking | Customer administrator | 3 days |
| Configuration refinement | O4 | Refine encounter templates, procedural templates, imaging protocols, role permissions | Customer administrator with clinical lead | 2–3 weeks |
| Validation | O5 | Sandbox testing with representative scenarios including procedural workflows and imaging | Customer clinical lead | 4–6 days |
| User provisioning | O6 | Provision users with plastic surgery-appropriate roles | Customer administrator | 2 days |
| Operational readiness | O7 | Operational readiness assessment; first encounter and first procedure targeted | Customer clinical lead with Ibn Hayan customer success | 2–3 days |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle updated | Customer administrator | 1 day |

### 15.2 Pre-Onboarding Preparation

Before onboarding begins, the customer should complete the following preparation activities: confirm facility licensing for plastic surgery practice, confirm regional regulatory framework applicability (including aesthetic procedure consent and cooling-off period requirements, implant tracking requirements, and cosmetic injectable log requirements), gather existing clinical and procedural documentation templates for review, gather existing before/after imaging library for migration planning, identify the clinical lead who will validate the configuration, and confirm the patient population and anticipated encounter and procedural volume.

### 15.3 Onboarding Validation Activities

Onboarding validation activities include: configuration validation per Section 15.4 of `SYSTEM_ARCHITECTURE.md`; workflow validation through testing each configured workflow against representative scenarios (including procedural workflows, imaging workflows, and the cooling-off period enforcement workflow); user acceptance testing through clinicians performing representative tasks in the sandbox (including procedural documentation and image capture); and operational readiness assessment through a structured review of the configuration against the customer's operational reality. Validation results are documented and are required for the go-live stage transition.

### 15.4 Post-Onboarding Activities

Post-onboarding activities include: ongoing configuration governance per the customer's configuration governance process; periodic review of operational reports and quality improvement reports; periodic review of regulatory reports and submission to regulatory authorities; imaging integration monitoring and maintenance; and participation in the platform's change-management process for overlay revisions and regional configuration pack updates.

---

## 16. Sample Use Cases

### 16.1 Aesthetic Breast Augmentation

A 32-year-old woman presents for consultation regarding breast augmentation. The patient is scheduled for a 60-minute initial consultation. The aesthetic assessment is documented, including the patient's stated goals and the surgeon's assessment. Anatomic measurements are recorded (breast base width, sternal notch to nipple distance, nipple to inframammary fold distance), and pre-operative photographs are captured using the breast imaging protocol. The surgeon recommends a submuscular breast augmentation with silicone implants. The surgical plan is documented, and the implant selection is recorded. The consent is obtained, with the cooling-off period enforced (procedure scheduled 14 days after consent). The procedure is performed, with the procedural documentation completed through the breast augmentation template. Post-operative recovery is tracked at the configured intervals (1 week, 4 weeks, 3 months, 6 months, 12 months), with before/after imaging captured at each interval.

### 16.2 Post-Mastectomy Breast Reconstruction

A 48-year-old woman presents for consultation regarding breast reconstruction after mastectomy for breast cancer. The patient is referred from oncology (C11), with the mastectomy performed 6 weeks previously. The reconstructive assessment is documented, including the defect description and the patient's reconstructive goals. The surgeon recommends autologous reconstruction with a free DIEP flap. The surgical plan is documented, including the flap design and the planned recipient vessels. The consent is obtained (reconstructive procedure; cooling-off period applies per regional regulation). The procedure is performed, with the procedural documentation completed through the free-flap reconstruction template, including the structured fields for flap type, vascular pedicle, ischaemia time, and inset. Post-operative recovery is tracked at the configured intervals, with particular attention to flap monitoring in the early post-operative period.

### 16.3 Rhinoplasty with Longitudinal Outcome Assessment

A 24-year-old woman presents for consultation regarding rhinoplasty. The aesthetic assessment is documented, including the patient's stated goals and the surgeon's assessment. Anatomic measurements are recorded (nasofacial angles, dorsal height, tip projection), and pre-operative photographs are captured using the facial imaging protocol. 3D imaging and simulation are performed, with the simulation output documented in the surgical plan. The consent is obtained, with the cooling-off period enforced. The procedure is performed, with the procedural documentation completed through the rhinoplasty template. Post-operative recovery is tracked at the configured intervals, with before/after imaging captured at each interval. Longitudinal outcome assessment is performed at 3 months, 12 months, and 24 months, with the FACE-Q Rhinoplasty module administered as the PROM and the surgeon's outcome assessment documented alongside the patient's assessment.

### 16.4 Cosmetic Injectable Procedure

A 45-year-old woman presents for cosmetic injectable treatment with botulinum toxin for glabellar lines. The patient is scheduled for a 30-minute office-based aesthetic procedure. The consent is obtained (the cooling-off period may be reduced for office-based procedures per regional regulation). The procedure is performed, with the cosmetic injectable log entry created automatically: product (botulinum toxin type A), lot number, injection sites (glabellar, bilateral corrugator, bilateral procerus), doses (recorded per site), and the patient. The post-procedure monitoring is documented, and the patient is discharged with post-procedure instructions. The log entry is queryable through the reporting module, supporting adverse event surveillance and product-specific outcome tracking.

### 16.5 Cleft Lip Repair in Paediatric Patient

A 3-month-old infant presents for cleft lip repair. The patient is referred from the paediatric craniofacial service. The pre-operative medical assessment is documented, including the anaesthetic assessment for paediatric anaesthesia. The surgical plan is documented, including the cleft description (unilateral left, complete) and the planned technique (Millard rotation-advancement). The consent is obtained from the parents. The procedure is performed, with the procedural documentation completed through the cleft lip repair template. Post-operative recovery is tracked, with particular attention to wound healing and feeding. Longitudinal outcome assessment is performed at configured intervals through childhood and adolescence, with the surgeon's aesthetic and functional outcome assessment documented alongside patient-reported outcomes (collected from age-appropriate PROMs as the child matures).

### 16.6 Implant Recall Response

A breast implant manufacturer issues a recall for a specific lot of breast implants due to a higher-than-expected rate of capsular contracture. The recall is received through the integration module (where electronic recall notification is supported) or through manual entry by the practice administrator. The recall is matched to the patient's implant records through the implant tracking system, with the affected patients identified. The affected patients are contacted through the notification module (M08), with the recall response documented in each patient's record. The patients are scheduled for consultation to discuss the recall and the recommended response (monitoring, implant exchange). The recall response is documented for each patient, with the documentation supporting regulatory reporting where required.

---

## 17. Best Practices

### 17.1 Configuration Governance Best Practices

Establish a configuration governance process before onboarding begins, defining who is authorized to make configuration changes, how changes are tested before production application, how changes are documented, and how changes are reviewed retrospectively. The Ibn Hayan platform provides the tools (configuration sandbox, configuration validation, configuration versioning, configuration audit) but does not impose the governance workflow; the customer is responsible for the workflow.

Review the configuration at configured intervals (typically quarterly for plastic surgery) and after any significant operational change (new surgeon joining, new procedure added, new equipment integrated, regulatory change). Document the review and the resulting actions, with the documentation preserved for audit. A configuration governance process that is documented and followed is the single most important determinant of a stable production configuration.

### 17.2 Documentation Discipline Best Practices

Complete documentation at the time of the encounter or procedure wherever possible. The Ibn Hayan platform's documentation completion expectation (default 24 hours for outpatient encounters, 48 hours for operative encounters) is a configuration that supports this practice. Use structured fields rather than free text wherever the documentation template provides structured fields; structured fields support longitudinal comparison, clinical decision support, and reporting.

For plastic surgery specifically, the anatomic measurements, the procedural documentation structured fields, and the cosmetic injectable log must be captured as structured values to support the longitudinal analysis and regulatory reporting that are central to plastic surgery practice. Free text remains valuable for the qualitative narrative that structured fields cannot capture, but the structured fields should be completed first, with the free text supplementing rather than replacing them.

### 17.3 Imaging Protocol Best Practices

Adopt the standardised imaging protocols shipped with the overlay, refining them only where local operational reality requires. Standardised protocols ensure that images are comparable across time points, supporting meaningful longitudinal comparison. Deviation from the protocols undermines the comparability and limits the value of the before/after imaging library.

Train all clinical photographers on the standardised protocols, with the training including hands-on practice with the imaging equipment and the protocols. Document the training, with the documentation preserved for audit. Repeat the training periodically and refresh it when the protocols are revised or when new equipment is integrated. Photography is a clinical activity; it should be performed with the same rigour as other clinical activities.

### 17.4 Implant Tracking Best Practices

Capture implant information at the time of implantation, with the information captured from the implant packaging and recorded in the implant record. Implant tracking is a regulatory requirement and supports post-market surveillance. The Ibn Hayan platform's implant tracking capability supports this practice, with the tracking integrated with the procedural documentation workflow.

Maintain the implant record through the implant's lifecycle, with the record updated if the implant is revised, removed, or compromised. Implant recall notifications are received through the integration module or through manual entry, with the recall matched to the patient's implant record and the affected patient contacted promptly. Document the recall response, with the documentation preserved for audit and for regulatory reporting where required.

### 17.5 Consent and Cooling-Off Period Best Practices

Obtain consent for aesthetic procedures within the cooling-off period required by regional regulation, with the consent workflow configured to enforce the cooling-off period. Document the consent and the cooling-off period in the patient's record, with the documentation supporting regulatory compliance. Use the aesthetic procedure consent forms shipped with the overlay, refining them only where local operational reality or regional regulation requires.

Verify consent immediately before the procedure, with the verification documented in the procedural record. Consent verification is a regulatory requirement and a patient safety practice. The Ibn Hayan platform's consent management capability supports this practice, with the verification performed at procedure initiation and recorded in the audit trail. For aesthetic procedures, the cooling-off period verification is an additional element of the consent verification, with the verification confirming that the procedure is scheduled after the cooling-off period end date.

### 17.6 Patient-Reported Outcome Best Practices

Administer patient-reported outcome measures at the configured intervals, with the administration supporting the surgeon's outcome assessment. PROMs capture the patient's perspective on the outcome, which may differ from the surgeon's assessment and which is increasingly a regulatory and quality requirement. The Ibn Hayan platform's PROM administration capability supports this practice, with the PROMs configured through the clinical documentation module and administered through the patient portal or at the encounter.

Use the validated PROMs shipped with the overlay (BREAST-Q, FACE-Q, BODY-Q) rather than custom instruments, with the validated PROMs supporting comparison across practices and across the literature. Custom instruments may be added where the validated PROMs do not capture a practice-specific outcome of interest, with the additions subject to the standard validation rules and recorded in the audit trail.

### 17.7 Onboarding Best Practices

Engage Ibn Hayan customer success or implementation consulting for configuration review during onboarding. The plastic surgery overlay's configuration complexity warrants configuration review by an experienced implementer, particularly for the imaging integration, implant tracking, and procedural documentation components. The cost of the review is modest compared to the cost of rework after go-live.

Train all users before go-live, with the training tailored to each user's role. Procedural documentation training should include hands-on practice with the procedural documentation templates. Photography training should include hands-on practice with the imaging equipment and the standardised protocols. Conduct training in the sandbox to avoid affecting production data. Document the training, with the documentation preserved for audit.

### 17.8 Change Management Best Practices

Adopt overlay revisions on a planned schedule rather than reactively. Overlay revisions are communicated in advance, with the revision contents documented and the adoption window defined. Plan the adoption during a period of lower operational tempo, with the adoption tested in the sandbox before production application. Document the adoption, with the documentation preserved for audit.

Participate in the platform's change-management process by providing feedback on overlay revisions and by participating in pilot engagements for new overlay capabilities. Customer participation is the basis of the platform's validated-practice posture stated in Principle P8 (Verified Practice Over Hypothetical Capability) in Section 4.9 of `SYSTEM_ARCHITECTURE.md`.

### 17.9 Privacy and Confidentiality Best Practices

Limit access to before/after images to authorised users with a clinical or operational need. Image access by users without a need is a compliance violation and undermines patient trust. The Ibn Hayan platform's permission framework supports this practice, with access governed by role, relationship to the patient, and documentation category. Review image access logs periodically and address any unauthorized access promptly.

Verify patient consent for image capture and image use at each encounter, with the verification documented in the encounter record. Image use (including use for marketing, education, or research) requires specific consent that is distinct from consent for the procedure. The Ibn Hayan platform's consent management capability supports this practice, with the consent categories configured through the regional configuration pack.

### 17.10 Quality Improvement Best Practices

Review quality improvement reports at configured intervals and use the reports to inform quality improvement initiatives. The complication rate report, the unplanned reoperation rate report, and the patient satisfaction aggregate report surface quality patterns that may not be apparent from day-to-day practice. Address the patterns identified through the reports, with the actions documented and the effects monitored through subsequent reports.

Participate in multi-practice quality improvement initiatives where the customer's operational reality supports participation. Multi-practice initiatives support benchmarking against peer practices and contribute to the evidence base for plastic surgery practice. The Ibn Hayan platform's reporting capability supports multi-practice initiatives through anonymised aggregate reporting, with the reporting configured through the reporting module's standard configuration surface and subject to the platform's privacy and confidentiality rules.

---

## 18. Related Documents

### 18.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines the surgical specialty family; Section 16 (Editions) defines the edition packaging; Section 19 (Product Modules Overview) defines the module catalogue; Section 22 (Configuration-Driven Philosophy) governs customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the platform's behaviour; Section 12 (Clinic Hierarchy) defines the clinic type overlay layer; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.4 documents the surgical specialty family; Section 5 documents the configuration overlay approach; Section 8 documents customization boundaries |

### 18.2 Downstream and Sibling Documents

The following downstream and sibling documents elaborate aspects of plastic surgery referenced in this document.

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
| Documents Module | `docs/07_MODULES/DOCUMENTS.md` | Image storage and management |
| Inventory Module | `docs/07_MODULES/INVENTORY.md` | Implant tracking, supply management |
| Day Surgery Clinic Type | `docs/06_CLINIC_TYPES/DAY_SURGERY.md` | Sibling surgical clinic type for day-surgery facilities |
| Oncology Clinic Type | `docs/06_CLINIC_TYPES/ONCOLOGY.md` | Sibling specialty for post-oncological reconstruction coordination |

### 18.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Overlay revisions and regional configuration pack updates are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
