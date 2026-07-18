# Ibn Hayan Healthcare Operating System — Radiology / Imaging Clinic Type (C25)

| Field | Value |
|---|---|
| Document Title | Radiology / Imaging Clinic Type Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the radiology configuration overlay is amended or when regional radiation safety or imaging accreditation regulations change |
| Audience | Clinical informatics leads, implementation consultants, customer success teams, configuration architects, radiologists, radiographers, medical imaging technologists, imaging centre administrators, compliance officers evaluating Ibn Hayan for radiology practice |
| Scope | Radiology clinic type (C25) configuration overlay, recommended module composition, specialty-specific capabilities (imaging modalities, study management, report templates, PACS integration, critical finding notification, contrast reaction tracking, radiation dose tracking, mammography tracking), specialty workflows, conceptual data entities, forms and templates, reports and analytics, integrations, role and permission defaults, configuration defaults, onboarding checklist, sample use cases, best practices |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks, database schemas, API endpoint specifications, UI component catalogues, vendor-specific imaging device contracts, country-specific legal interpretation of radiation safety regulations |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the radiology entry in the clinic type catalogue and does not override the catalogue entry or the platform-level principles. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Imaging Modalities
5. Study Management
6. Report Templates
7. PACS Integration
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

Radiology is the healthcare specialty concerned with the use of medical imaging to diagnose, monitor, and treat disease. Radiologists are physicians who interpret medical images, and they work with radiographers (also termed radiologic technologists or medical imaging technologists) who perform the imaging studies. The scope of practice spans diagnostic radiology (the interpretation of imaging studies for diagnostic purposes), interventional radiology (the performance of minimally invasive procedures under imaging guidance), and radiation oncology (the use of radiation to treat cancer, which is typically a separate specialty from diagnostic radiology but may be coordinated within the imaging centre). In Ibn Hayan, radiology (imaging centre) is catalogued as clinic type C25 within the diagnostic and pharmacy specialty family, per Section 18.2 of `PRODUCT_BIBLE.md` and Section 3.5 of `CLINIC_TYPES.md`.

The radiology clinic type overlay reflects the operational reality of imaging centre practice. Imaging centres are high-volume, equipment-intensive environments where image quality matters (poor images affect diagnostic accuracy), where radiation safety is non-negotiable (ionising radiation exposure carries patient and staff risk), and where turnaround time for interpretation matters (delays affect patient care). The overlay configures Ibn Hayan's platform-default behaviour to match this operational reality, with radiology-specific order workflows, study management, reporting, and radiation safety configurations.

### 1.2 Patient Population and Clinical Activities

The radiology patient population is broad, encompassing any patient whose clinician orders imaging. Like the laboratory, the imaging centre does not have its own patients in the conventional sense; it has ordering clinicians and the patients for whom the imaging is performed. The overlay accommodates this reality through configuration that focuses on the imaging centre-clinician relationship rather than on an imaging centre-patient relationship, with the patient remaining the central reference for clinical and regulatory purposes.

Key clinical activities in radiology include imaging order receipt (with the order reviewed for appropriateness and clinical indication), patient preparation (with preparation varying by modality and study, including contrast administration for some studies), image acquisition (with the study performed by the radiographer, with images acquired per protocol), image interpretation (with the images reviewed by the radiologist and the findings documented in the report), result reporting (with the report released to the ordering clinician), and critical finding notification (with certain findings requiring immediate notification of the ordering clinician). Each of these activities is supported by configuration in the radiology overlay.

### 1.3 Why Radiology Requires Specialized Configuration

Radiology presents configuration considerations that distinguish it from other clinic types. Image management is the central operational reality, with images acquired, stored, retrieved, and interpreted across encounters and across facilities. The configuration must support image management as a first-class capability, with images integrated with the imaging order, the imaging study, and the imaging report. The integration is supported through the documents module (M07) for image storage and through the integration module (M17) for connection to Picture Archiving and Communication Systems (PACS) and Radiology Information Systems (RIS).

Radiation safety is a defining operational reality for radiology, with ionising radiation exposure tracked for patients (cumulative dose monitoring) and for staff (occupational dose monitoring). The configuration must support radiation dose tracking as a first-class capability, with the dose tracking integrated with the imaging workflow and supporting regulatory reporting. The dose tracking is enforced at the platform layer where regional regulation requires it, per Section 8.3 of `CLINIC_TYPES.md`.

Critical finding notification is a defining patient safety practice, with certain imaging findings (e.g., pneumothorax, aortic dissection, intracranial haemorrhage) requiring immediate notification of the ordering clinician. The configuration must support critical finding notification as a workflow that is triggered automatically by the finding, that documents the notification (including the recipient, the time, and the acknowledgement), and that escalates when the notification is not acknowledged within the configured timeframe.

### 1.4 Relationship to Other Clinic Types

Radiology operates in relationship to all clinic types that order imaging. Within the diagnostic and pharmacy family, radiology (C25) shares configuration themes with pharmacy (C23) and laboratory (C24): result production, integration with ordering clinicians, regulatory reporting. Radiology also coordinates with primary care (C01–C04) and the medical and surgical specialties (C06–C17) for routine and specialty imaging, with oncology (C11) for cancer staging and treatment response imaging, with hospital (C21) for inpatient imaging services, and with emergency care (C18, C19) for urgent imaging. The overlay includes integration surfaces that support this coordination without requiring operational coupling between clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes and Ownership

Radiology is practised across a range of facility sizes, from small independent imaging centres through hospital-based radiology departments, regional imaging networks, and teleradiology services. The recommended editions for radiology in Section 2.1 of `CLINIC_TYPES.md` are Professional (E2) and Enterprise (E3), reflecting the typical mid-sized facility and the relatively high configuration complexity. Small independent imaging centres may operate at the Professional edition; hospital-based radiology departments and regional imaging networks operate at the Enterprise edition, particularly where the imaging centre is part of a hospital tenant.

Ownership patterns in radiology include independent imaging centre (single owner, single location), hospital-based radiology department (within a hospital tenant), regional imaging network (multi-location under shared ownership), and teleradiology service (providing remote interpretation for multiple imaging centres). The clinic type overlay is ownership-agnostic; it provides the configuration surface that any ownership model requires, with ownership-specific concerns configured at the facility or customer layer per the configuration layer model in Section 15.3 of `SYSTEM_ARCHITECTURE.md`.

### 2.2 Geographic and Regulatory Considerations

Radiology is practised in every region Ibn Hayan serves, and the regulatory environment for radiology is among the most heavily regulated of healthcare specialties, particularly for radiation safety. The overlay accommodates this variation through the platform's localization module (M19), with regional configuration packs that adapt radiation safety regulations (including dosimetry tracking, equipment inspection requirements, and staff monitoring requirements), imaging accreditation requirements (regional equivalents of ACR accreditation), mammography tracking requirements (MQSA in the US, regional equivalents elsewhere), and reporting requirements. The configuration packs are versioned alongside the platform's regional regulatory framework and are updated when regional regulations change.

Geographic considerations also include teleradiology, where images acquired at one facility are interpreted at a remote facility, often across regional or national boundaries. The overlay supports teleradiology through the encounter template configuration, with the interpretation encounter adapted to the teleradiology context while maintaining the documentation rigour required for clinical accountability. Teleradiology documentation is subject to additional regulatory requirements in many jurisdictions, with the requirements addressed through the regional configuration pack.

### 2.3 Regulatory Exposure

The regulatory exposure for radiology is rated high in Section 2.1 of `CLINIC_TYPES.md`, reflecting radiation safety regulations, imaging accreditation requirements, mammography tracking requirements, contrast safety regulations, and the standard regulatory requirements for healthcare practice. The overlay addresses each regulatory dimension through configuration: radiation dose tracking is documented through structured dose records with the dose recorded per study and per patient (cumulative dose); imaging accreditation is supported through the quality control and documentation capabilities that support accreditation requirements; mammography tracking is supported through the mammography tracking capability; contrast safety is supported through the contrast reaction tracking capability.

Regulatory exposure is heightened for imaging centres that perform interventional radiology, with additional regulatory requirements for the procedural consent, the procedural documentation, and the post-procedural care. The overlay accommodates these requirements through specialty-specific procedural documentation templates and configurations, with the templates configured through the clinical documentation module (M03). The regional configuration pack addresses the regional regulatory framework for interventional radiology, with the configuration enforced at the platform layer where regional regulation requires it.

### 2.4 Customer Maturity Profile

Radiology customers vary in maturity. Established imaging centres with mature radiology information systems configure Ibn Hayan to match their existing operational patterns; transitioning customers from paper-based or basic electronic systems require more onboarding support. Imaging centres with established image archives may require data migration support to incorporate existing images into Ibn Hayan or to integrate Ibn Hayan with the existing PACS. The onboarding workflow in Section 9 of `CLINIC_TYPES.md` scales stage duration and complexity to the customer's maturity profile and the overlay's high configuration complexity.

---

## 3. Recommended Modules

### 3.1 Core Module Composition

The recommended module composition for radiology follows the diagnostic and pharmacy family pattern stated in Section 6.2 of `CLINIC_TYPES.md`, with the orders and results module (M04) and the documents module (M07) as the central modules. The table below summarizes the recommended modules; module codes are defined in Section 19.2 of `PRODUCT_BIBLE.md`.

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Core | Patient registration, demographics (typically received from ordering clinician's system), pregnancy status for radiation safety |
| Encounter | M02 | Core | Imaging encounter, image interpretation encounter, interventional procedure encounter |
| Clinical Documentation | M03 | Limited | Documentation of imaging-clinician communication; interventional procedure documentation |
| Orders & Results | M04 | Core | Imaging order management, study tracking, result reporting — the central module for radiology |
| Pharmacy | M05 | Limited | Contrast agent management; limited relevance for full pharmacy module |
| Scheduling | M06 | Core | Imaging appointment scheduling, modality scheduling, interventional procedure scheduling |
| Documents | M07 | Core | Image storage, report storage, accreditation documents — central for image management |
| Notifications | M08 | Core | Critical finding notifications, appointment reminders, result availability notifications |
| Billing | M09 | Core | Study billing, insurance claim submission, procedural billing for interventional radiology |
| Accounting | M10 | Optional | General ledger for independent imaging centres with their own accounting |
| CRM | M11 | Optional | Outreach to ordering clinicians, recall management for screening studies |
| HR | M12 | Optional | Employee management for imaging centres with multiple radiologists and radiographers |
| Workforce | M13 | Optional | Scheduling of clinical staff, credentialing for radiologist licensure and radiographer certification |
| Identity & Access | M14 | Core | Authentication, role-based access including image access control |
| Configuration | M15 | Core | Configuration surface for overlay refinement |
| Audit | M16 | Core | Audit trail for imaging, reporting, and procedural actions |
| Integration | M17 | Optional | Integration with PACS, RIS, imaging modalities, ordering clinician systems |
| Reporting | M18 | Core | Operational reporting, regulatory reporting, quality improvement reporting |
| Localization | M19 | Core | Regional regulatory framework, imaging coding system adaptation (LOINC, RadLex) |

### 3.2 Module Activation Considerations

The core module set is recommended for every radiology deployment; the optional modules are added based on the customer's operational reality. A small independent imaging centre may decline M10 (Accounting) and M11 (CRM); a hospital-based radiology department typically operates within the hospital's broader module set; a regional imaging network typically operates at the Enterprise edition with the full module set. Module enablement is governed by the dependency rules in Section 9.4 of `SYSTEM_ARCHITECTURE.md`.

The integration module (M17) is particularly relevant for radiology given the specialty's reliance on PACS (for image storage and retrieval), RIS (for radiology workflow management), and imaging modalities (CT, MRI, ultrasound, X-ray, mammography, nuclear medicine). The integration is performed through anticorruption layer connectors described in Section 7.3 of `SYSTEM_ARCHITECTURE.md`. The integration with PACS is particularly important: Ibn Hayan does not replace the PACS but integrates with it, with the PACS providing image storage and retrieval and Ibn Hayan providing the order management, study tracking, reporting, and workflow coordination.

### 3.3 Edition Packaging

The recommended editions for radiology are Professional (E2) for small to mid-sized independent imaging centres and Enterprise (E3) for hospital-based radiology departments and regional imaging networks, per Section 2.1 of `CLINIC_TYPES.md`. The Professional edition provides the configuration depth and multi-user support that radiology requires; the Enterprise edition adds multi-facility operation, advanced integration, and dedicated support for the more complex operational reality of hospital-based and network practice. Edition packaging is governed by Section 16 of `PRODUCT_BIBLE.md`.

---

## 4. Imaging Modalities

### 4.1 Modality Catalogue

The modality catalogue is the curated list of imaging modalities that the imaging centre performs, organized by modality type (radiography, fluoroscopy, computed tomography, magnetic resonance imaging, ultrasound, nuclear medicine, mammography, interventional radiology). Each modality entry includes the standard modality attributes (modality name, modality code, equipment, radiation status, contrast status) and radiology-specific attributes (typical study duration, typical radiation dose where applicable, equipment requirements, accreditation requirements). The catalogue is configured through the orders and results module (M04) and is versioned alongside the overlay.

The modality catalogue is maintained by the platform and is updated when new modalities or new techniques within modalities are introduced. Updates are versioned and communicated to affected customers through the change-management channel. Customers may add customer-specific modality configurations (e.g., a customer-specific MRI protocol set) through the configuration surface, with additions subject to the standard validation rules and recorded in the audit trail. Customer-specific modality configurations do not replace platform catalogue entries; they supplement them.

### 4.2 Modality-Specific Study Configuration

Each modality has modality-specific study configurations that define the studies performed on that modality, the protocols for each study, the radiation dose for each study (where applicable), and the contrast agent for each study (where applicable). The Ibn Hayan radiology overlay supports modality-specific study configuration through the orders and results module's study configuration capability, with each study configured as a structured entity that includes the modality, the study name, the study code, the protocol, the radiation dose (where applicable), the contrast agent (where applicable), and the patient preparation requirements.

Modality-specific study configuration is integrated with the imaging order workflow, with the study configuration supporting the ordering clinician's study selection and the radiographer's image acquisition. The integration is configured through the orders and results module's standard configuration surface, with the integration respecting the boundaries between the order and study configuration workflows.

### 4.3 Modality Worklist Management

Modality worklist management is the radiology process for managing the modality's worklist, with the worklist defining the studies to be performed on each modality. The overlay supports worklist management through the orders and results module's worklist capability, with the worklist generated automatically from the imaging orders received by the imaging centre. The worklist is downloaded to the modality through the integration module (M17), with the modality performing the studies and uploading the images to the PACS through the integration module.

Modality worklist management is integrated with the scheduling workflow, with the worklist referencing the scheduled appointments and the appointment status updated as the worklist is processed. The integration is configured through the scheduling module's (M06) standard configuration surface, with the integration respecting the boundaries between the worklist and scheduling workflows. The integration supports the imaging centre's turnaround time monitoring, with the worklist processing status supporting the calculation of turnaround time.

### 4.4 Modality Quality Control

Modality quality control is the radiology process for monitoring the performance of the imaging equipment, with quality control phantoms run at configured intervals and the quality control results monitored against established performance criteria. The overlay supports modality quality control through the orders and results module's quality control capability, with each quality control event documented as a structured record that includes the modality, the equipment, the quality control phantom, the quality control result, and the quality control status (pass, fail, warning).

Modality quality control is integrated with the imaging workflow, with the quality control failure suspending the imaging on the affected equipment until the failure is investigated and resolved. The integration is configured through the workflow engine's standard configuration surface, with the integration respecting the boundaries between the quality control and imaging workflows. The integration supports the imaging centre's accreditation, with the accreditation standards requiring evidence of modality quality control.

---

## 5. Study Management

### 5.1 Study Lifecycle

The study lifecycle is the structured sequence of states through which an imaging study progresses, from order receipt through result reporting. The Ibn Hayan radiology overlay supports the study lifecycle through the orders and results module's study management capability, with each study recorded as a structured entity that includes the patient, the ordering clinician, the modality, the study, the order date, the scheduled date, the acquisition date, the interpretation date, and the report date. The study lifecycle is configured through the workflow engine described in Section 16 of `SYSTEM_ARCHITECTURE.md`.

The study lifecycle includes the following states: ordered, scheduled, in-progress (patient preparation, image acquisition), acquired (images available for interpretation), interpreted (radiologist review complete, report drafted), reported (report released to ordering clinician), and amended (report amended after release). Each state transition is recorded as a structured event, with the event supporting the imaging centre's turnaround time monitoring and supporting the imaging centre's quality assurance.

### 5.2 Image Acquisition Tracking

Image acquisition tracking is the structured monitoring of the image acquisition process, with the acquisition documented as a structured event that includes the study, the radiographer, the acquisition start time, the acquisition end time, the equipment, the protocol, the radiation dose (where applicable), and the contrast agent (where applicable). The overlay supports image acquisition tracking through the orders and results module's acquisition tracking capability, with the acquisition documented at the time of image acquisition.

Image acquisition tracking is integrated with the modality worklist, with the worklist updating as the acquisition is completed. The integration is configured through the orders and results module's standard configuration surface. The integration supports the imaging centre's workflow coordination, with the worklist status supporting the radiographer's workflow and the radiologist's interpretation workflow.

### 5.3 Image Interpretation Workflow

Image interpretation workflow is the radiologist's structured process for reviewing the acquired images and documenting the findings in the report. The overlay supports the image interpretation workflow through the orders and results module's interpretation capability, with the interpretation documented as a structured event that includes the study, the radiologist, the interpretation start time, the interpretation end time, the findings (documented through the report template), and the interpretation outcome (reported, repeated, additional imaging recommended).

Image interpretation workflow is integrated with the image acquisition workflow, with the interpretation triggered automatically when the acquisition is complete and the images are available for interpretation. The integration is configured through the workflow engine's standard configuration surface. The integration supports the imaging centre's turnaround time monitoring, with the interpretation turnaround time calculated from the image availability to the report release.

### 5.4 Critical Finding Management

Critical finding management is the structured process for identifying, documenting, and communicating critical findings identified during image interpretation. The overlay supports critical finding management through the orders and results module's critical finding capability, with each critical finding documented as a structured event that includes the study, the radiologist, the finding, the finding severity, and the notification recipient. The critical finding triggers the critical finding notification workflow, with the notification documented as a structured event that includes the recipient, the notification time, the notification method, and the recipient's acknowledgement.

Critical finding management is governed by the platform-level patient safety emphasis of Principle P1 (Healthcare Safety Overrides All Others) stated in Section 4.2 of `SYSTEM_ARCHITECTURE.md`. The notification workflow includes escalation when the notification is not acknowledged within the configured timeframe, with the escalation routing to alternate recipients (covering clinician, imaging centre medical director, hospital rapid response team) per the configured escalation rules.

---

## 6. Report Templates

### 6.1 Report Template Structure

The radiology report is the structured documentation of the radiologist's interpretation of the imaging study, with the report including the patient, the ordering clinician, the study, the modality, the technique, the findings, the impression, and the recommendations. The Ibn Hayan radiology overlay ships a report template that captures the standard elements, with the template configured through the orders and results module (M04) and versioned alongside the overlay.

The report template is study-aware: the template's structured fields are adapted to the study performed, with each study having a study-specific report template (e.g., the chest CT report template includes structured fields for lung nodules, lymphadenopathy, and pleural effusion; the brain MRI report template includes structured fields for brain parenchyma, ventricles, and extra-axial spaces). The adaptation is configured through the orders and results module's template configuration surface, with the template selection automated based on the study performed.

### 6.2 Structured Reporting

Structured reporting is the use of structured fields in the radiology report to support data extraction, quality improvement, and research. The overlay supports structured reporting through the orders and results module's structured field capability, with the structured fields organised by study type and by anatomical structure. The structured fields support the reporting module's (M18) reporting capability, with the structured field values queryable for quality improvement and research.

Structured reporting is configured per study type, with the structured fields selected to reflect the study's clinical content and the regional regulatory framework. The structured fields are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add customer-specific structured fields through the configuration surface, with additions subject to the standard validation rules. The platform's catalogue of structured fields is expanded when new evidence-based reporting approaches emerge.

### 6.3 Report Distribution

Report distribution is the delivery of the radiology report to the ordering clinician, with the report delivered through the integration module (M17) where electronic report transmission is supported, or through manual export for clinicians without electronic report transmission capability. The overlay supports report distribution through the orders and results module's distribution capability, with the distribution documented as a structured event that includes the report, the recipient, the distribution time, and the distribution method.

Report distribution is integrated with the report release workflow, with the distribution triggered automatically when the report is released by the radiologist. The integration is configured through the orders and results module's standard configuration surface. The distribution is documented in the audit trail, with the distribution time, the recipient, and the report contents preserved.

### 6.4 Report Amendment and Addendum

Report amendment and addendum is the radiologist's process for amending or adding to a report that has been released to the ordering clinician, with the amendment or addendum required when additional information becomes available or when the original report is found to be inaccurate or incomplete. The overlay supports report amendment and addendum through the orders and results module's amendment capability, with each amendment or addendum recorded as a structured event that includes the original report, the amended or added report, the rationale, the amending radiologist, and the amendment date.

Report amendment and addendum is governed by the platform's data integrity rules, with the original report retained alongside the amended or added report, and with both reports visible to the ordering clinician. The amendment or addendum is communicated to the ordering clinician through the notifications module, with the notification including the original report, the amended or added report, and the rationale. The amendment or addendum is auditable, with the audit trail preserving the complete history of the report.

---

## 7. PACS Integration

### 7.1 PACS Conceptual Model

The Picture Archiving and Communication System (PACS) is the radiology system that stores, retrieves, and distributes medical images, with the PACS providing the image storage and retrieval capability that is central to radiology practice. The Ibn Hayan radiology overlay supports PACS integration through the integration module (M17), with the integration performed through anticorruption layer connectors described in Section 7.3 of `SYSTEM_ARCHITECTURE.md`. Ibn Hayan does not replace the PACS; it integrates with the PACS, with the PACS providing image storage and retrieval and Ibn Hayan providing the order management, study tracking, reporting, and workflow coordination.

The PACS integration supports the bidirectional flow of information between Ibn Hayan and the PACS. The forward flow includes the imaging order and the study information (patient, study, modality, protocol) sent from Ibn Hayan to the PACS, supporting the PACS worklist. The reverse flow includes the image acquisition status and the image references sent from the PACS to Ibn Hayan, supporting the Ibn Hayan study tracking and the radiologist's interpretation workflow.

### 7.2 DICOM Integration

DICOM (Digital Imaging and Communications in Medicine) is the international standard for medical imaging information exchange, with DICOM providing the data format and the communication protocol for medical images. The Ibn Hayan radiology overlay supports DICOM integration through the integration module's DICOM connector, with the connector translating the DICOM format into the platform's standard data model. The DICOM integration supports the bidirectional flow of DICOM information between Ibn Hayan and the PACS, the imaging modalities, and other radiology systems.

DICOM integration is configured through the integration module's standard configuration surface, with the configuration defining the DICOM connection parameters, the DICOM data format mapping, and the workflow integration. The configuration is performed by the customer's system administrator with the involvement of the PACS vendor and the customer's information technology team. The integration is tested thoroughly before production application, with the testing including data accuracy verification and workflow integration verification.

### 7.3 Image Reference Management

Image reference management is the structured documentation of the relationship between Ibn Hayan's study records and the PACS's image records, with the relationship supporting the radiologist's access to the images from within Ibn Hayan. The overlay supports image reference management through the orders and results module's image reference capability, with each image reference recorded as a structured entity that includes the study, the PACS image identifier, the DICOM study instance UID, and the access method.

Image reference management is integrated with the image interpretation workflow, with the radiologist's access to the images supported through the image reference. The integration is configured through the orders and results module's standard configuration surface. The integration supports the radiologist's workflow by providing seamless access to the images from within Ibn Hayan, with the access supporting the radiologist's interpretation and the report generation.

### 7.4 Teleradiology Support

Teleradiology is the practice of radiology where images acquired at one facility are interpreted at a remote facility, often across regional or national boundaries. The overlay supports teleradiology through the integration module's teleradiology capability, with the teleradiology supporting the transmission of images from the acquiring facility to the interpreting facility, the interpretation at the interpreting facility, and the report transmission back to the acquiring facility.

Teleradiology support is subject to additional regulatory requirements in many jurisdictions, with the requirements addressing the licensing of the interpreting radiologist in the acquiring facility's jurisdiction, the data security of the image transmission, and the documentation of the teleradiology encounter. The overlay's regional configuration pack addresses the regional regulatory framework for teleradiology, with the configuration enforced at the platform layer where regional regulation requires it. The teleradiology documentation is auditable, with the documentation supporting regulatory reporting and quality assurance.

---

## 8. Specialty Workflows

### 8.1 Workflow Inventory

The Ibn Hayan radiology overlay ships a default set of workflows tuned to radiology practice. The workflows are defined declaratively through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md` Section 2.

| Workflow | Code | Trigger | Key Steps | Outcome |
|---|---|---|---|---|
| Routine imaging study | RW1 | Imaging order received | Order receipt, order verification, appointment scheduling, patient preparation, image acquisition, image interpretation, result reporting | Study reported to ordering clinician |
| Stat imaging study | RW2 | Stat imaging order received | Order receipt (priority), order verification (priority), priority scheduling, patient preparation (priority), image acquisition (priority), image interpretation (priority), result reporting (priority) | Stat study reported to ordering clinician |
| Critical finding notification | RW3 | Critical finding identified | Finding documentation, notification of ordering clinician, acknowledgement tracking, escalation if not acknowledged | Critical finding notification documented |
| Contrast reaction response | RW4 | Contrast reaction occurred | Reaction documentation, severity assessment, intervention documentation, patient recovery documentation, follow-up scheduling | Contrast reaction documented; patient managed |
| Interventional radiology procedure | RW5 | Interventional procedure scheduled | Patient preparation, consent, procedure, post-procedure monitoring, discharge, follow-up scheduling | Procedure documented; patient discharged |
| Mammography screening | RW6 | Screening mammography order received | Order receipt, appointment scheduling, patient preparation, mammography acquisition, image interpretation (BI-RADS assessment), result reporting, recall scheduling (if BI-RADS 0, 3, 4, or 5) | Mammography reported; recall scheduled if applicable |
| Modality quality control failure response | RW7 | Quality control failure | Imaging suspension, investigation, corrective action, quality control re-run, imaging resumption | Quality control failure documented; imaging resumed |
| Report amendment | RW8 | Report amendment requested | Original report review, amendment rationale, amended report validation, amendment communication to ordering clinician | Amendment documented; clinician notified |

### 8.2 Workflow Customization

Workflows may be customized through the workflow engine's configuration surface, subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The customization posture is a direct consequence of Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md`.

Customization examples include adding regional critical finding notification rules to the critical finding notification workflow, adjusting the mammography screening recall protocol based on the regional regulatory framework, and adding customer-specific interventional radiology protocols to the interventional radiology procedure workflow. Each customization is applied as a facility-level or department-level override, with the underlying platform-provided workflow retained unchanged.

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The data entities referenced by the radiology clinic type overlay are conceptual; this section describes the entities by name and relationship, not by implementation. Database schemas, persistence models, and data access patterns are out of scope for this document per the metadata table above and are addressed in module-specific documentation.

The radiology overlay references the following conceptual entities: Patient, Encounter, Imaging Order, Imaging Study, Image Acquisition Record, Image Reference (link to PACS), Imaging Report, Critical Finding Record, Critical Finding Notification Event, Contrast Administration Record, Contrast Reaction Record, Radiation Dose Record, Mammography Tracking Record, Modality Quality Control Record, Equipment Maintenance Record, and Reportable Finding Report. Each entity is owned by a bounded context defined in Section 7 of `SYSTEM_ARCHITECTURE.md`; the radiology overlay composes these entities into radiology-specific workflows and documentation structures.

### 9.2 Entity Relationships

The Patient entity is the central reference for clinical and regulatory purposes, although the imaging centre's daily workflow is organised around the Imaging Order and the Imaging Study. The Imaging Order is associated with a Patient, an Ordering Clinician, and one or more Imaging Studies (where a single order includes multiple studies). The Imaging Study is associated with the Imaging Order, the Patient, the Modality, the Image Acquisition Record, and the Imaging Report.

The Image Acquisition Record is associated with the Imaging Study, the Radiographer, the Equipment, and the Radiation Dose Record (where applicable). The Image Reference is associated with the Imaging Study and the PACS image identifier, supporting the radiologist's access to the images. The Imaging Report is associated with the Imaging Study, the Radiologist, and the Critical Finding Record (where applicable). The Critical Finding Notification Event is associated with the Critical Finding Record and the recipient (typically the Ordering Clinician).

### 9.3 Longitudinal Records

Several radiology entities are longitudinal rather than encounter-bound: the patient's imaging history, the patient's radiation dose history (cumulative dose), the patient's mammography tracking history, and the patient's contrast reaction history. These longitudinal records are constructed from the encounter-bound records through the reporting module's longitudinal view capability. The longitudinal records support clinical decision-making by surfacing the patient's history in a unified view.

Longitudinal records are read-only; they are generated from the encounter-bound records and do not constitute a separate data entry surface. The encounter-bound records remain the authoritative source; the longitudinal view is a derived presentation. The longitudinal view is configured through the reporting module's standard configuration surface, with the configuration defining which entities are included, how they are presented, and what time period is covered. Longitudinal records are subject to data residency rules per Section 11.5 of `SYSTEM_ARCHITECTURE.md`.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

The radiology overlay ships encounter templates for the encounter types common in radiology practice: imaging encounter (with patient preparation and image acquisition), image interpretation encounter, interventional radiology procedure encounter, critical finding notification encounter, and mammography screening encounter. Each template defines the documentation sections required, the structured fields included, and the workflow steps associated with the encounter type. Templates are versioned alongside the overlay and are reviewed when the overlay is revised.

Encounter templates are configured through the encounter module (M02) and are subject to the standard validation rules. Customers may refine templates through the configuration surface at the facility, department, or care-team layer, with refinements recorded as overrides on the platform-provided template.

### 10.2 Report Templates

Report templates support the structured capture of the radiologist's interpretation. The radiology overlay ships templates for the report types common in radiology practice: standard radiology report, critical finding report, amended report, mammography report (with BI-RADS assessment), and interventional radiology report. Each template is configured through the orders and results module (M04) and is subject to the standard validation, versioning, and audit rules.

| Template | Report Type | Mandatory Sections | Configurable Fields |
|---|---|---|---|
| Standard radiology report | Standard | Patient, ordering clinician, study, modality, technique, findings, impression, recommendations, radiologist, reporting date | Structured fields per study type |
| Critical finding report | Critical finding | Patient, ordering clinician, study, finding, finding severity, notification recipient, notification time, acknowledgement | Notification method, escalation rules |
| Amended report | Amendment | Patient, ordering clinician, study, original report, amended report, amendment rationale, amending radiologist, amendment date | Amendment communication method |
| Mammography report | Mammography | Patient, ordering clinician, study, breast composition, findings (mass, calcification, asymmetry, distortion), BI-RADS assessment, recommendations | BI-RADS version, recall protocol |
| Interventional radiology report | Interventional | Patient, ordering clinician, procedure, anaesthesia, technique, findings, intervention performed, complications, post-procedure disposition | Procedure type, anaesthesia type |

### 10.3 Consent Forms

Consent forms for radiology are configured per regional regulatory framework, with the consent forms including the study description, the radiation exposure (where applicable), the contrast agent (where applicable), the alternatives, the risks and benefits, and the patient's acknowledgement. The radiology overlay ships consent form templates for the common radiology procedures: contrast-enhanced studies (with consent for contrast administration), interventional radiology procedures (with consent for the procedure and the anaesthesia), and mammography (with consent for the mammography and the potential for recall). The forms are configured through the patient module's (M01) consent management capability.

Consent forms are signed by the patient (or legal guardian) and are recorded in the patient's consent record. The consent record is the basis for study authorisation: a study cannot be performed without the appropriate consent on file. For interventional radiology, additional consent is required for the procedure and the anaesthesia, with the consent including the procedural risks, the monitoring plan, and the recovery expectations.

### 10.4 Patient-Facing Materials

The radiology overlay ships a library of patient-facing materials that the radiologist or radiographer may provide to patients: study information sheets (for common imaging studies, including the patient preparation instructions), contrast agent information sheets (for patients receiving contrast), radiation safety information sheets (for patients concerned about radiation exposure), mammography information sheets (for patients undergoing mammography screening), and post-procedure care instructions (for patients undergoing interventional radiology procedures). The materials are configured through the documents module (M07) and are versioned alongside the overlay.

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

Clinical outcome reports support the radiologist's assessment of imaging outcomes and the ordering clinician's assessment of patient care. The radiology overlay ships default clinical outcome reports including the patient's imaging history report (presenting the patient's imaging studies across encounters, with comparison to previous studies), the critical finding notification report (critical findings by study, by ordering clinician, by time period, with notification and acknowledgement times), the report amendment report (amendments by study, by reason, by time period), and the mammography outcome report (BI-RADS assessments, recall rates, cancer detection rates). Each report is configured through the reporting module (M18) and is generated from the structured field values recorded during imaging workflows.

Clinical outcome reports are typically accessed by the radiologist and by the imaging centre's quality improvement committee. Access is governed by the permission framework. Reports are generated on demand and on configured schedules.

### 11.2 Operational Reports

Operational reports support the imaging centre's management and quality improvement activities. The radiology overlay ships default operational reports including the study volume report (studies by modality, by radiographer, by time period), the turnaround time report (turnaround time by study, by priority, by time period), the modality utilisation report (modality utilisation by modality, by time period), the equipment maintenance report (maintenance events by equipment, by time period), and the radiologist productivity report (studies interpreted by radiologist, by time period). Each report is configured through the reporting module and is generated from operational data.

Operational reports are typically accessed by imaging centre administrators and the imaging centre director. Reports that include individual radiologist or radiographer performance data are subject to additional access restrictions; access is logged in the audit trail. The reports support imaging centre management decisions including staffing, equipment utilisation, and quality improvement initiatives.

### 11.3 Regulatory Reports

Regulatory reports support the imaging centre's compliance with regional regulatory requirements. The radiology overlay ships default regulatory reports including the radiation dose report (cumulative patient dose, occupational staff dose where applicable), the mammography tracking report (mammography studies, BI-RADS assessments, recalls, cancer detections, with the data required by regional mammography regulation), the accreditation documentation report (documentation required for imaging accreditation), and the reportable finding report (findings reportable to public health authorities, where applicable). Each report is configured through the regional configuration pack and is updated when regional regulations change.

Regulatory reports are generated on the schedule required by regional regulation. Reports are submitted to the appropriate regulatory authority through the integration module (M17) where electronic submission is supported, or are exported in the format required for manual submission. Submission is recorded in the audit trail.

### 11.4 Quality Improvement Reports

Quality improvement reports support the imaging centre's quality improvement activities. The radiology overlay ships default quality improvement reports including the modality quality control performance report (quality control events, failures, investigations by modality, by time period), the turnaround time variance report (variance from target turnaround time by study, by time period), the critical finding notification compliance report (percentage of critical findings with documented notification and acknowledgement within the configured timeframe), and the peer review report (peer review of radiologist interpretations, with peer review score and feedback). Each report is configured through the reporting module and is generated from clinical and operational data.

Quality improvement reports are reviewed at configured intervals by the imaging centre's quality improvement committee. The review is documented, and the resulting quality improvement actions are tracked through the platform's task management capability. Quality improvement reports are subject to the same access controls as other clinical documentation.

---

## 12. Role & Permission Recommendations

### 12.1 Specialty-Specific Roles

The Ibn Hayan radiology overlay recommends the following role assignments for radiology practice, building on the role catalogue defined in `USER_ROLES.md`.

| Role | Code | Specialty Application | Typical Permission Scope |
|---|---|---|---|
| Physician | R01 | Radiologist | Full imaging access; image interpretation; report generation; critical finding notification; interventional radiology procedures |
| Physician | R01 | Interventional radiologist | Full imaging access; interventional radiology procedures; procedural documentation |
| Allied health professional | R05 | Radiographer (radiologic technologist) | Imaging access for assigned modalities; image acquisition; modality quality control |
| Allied health professional | R05 | Senior radiographer | Extended scope; supervision of junior radiographers; modality quality assurance |
| Medical assistant | R04 | Imaging aide | Limited access; patient preparation; clerical support |
| Patient | R06 | Imaging patient | Portal access to own imaging reports (where patient portal access is supported) |
| Billing specialist | R08 | Imaging billing specialist | Billing and claims access; no imaging access |
| Facility administrator | R09 | Imaging centre administrator | Administrative access; no imaging access |
| Customer administrator | R10 | Customer system administrator | Configuration and user management; no imaging access |
| Auditor | R11 | Compliance auditor | Read-only access to audit trail and compliance reports |
| Support engineer | R12 | Implementation consultant | Configuration access during implementation; no production imaging access |

### 12.2 Permission Defaults

Permission defaults are configured to support the principle of least privilege and the regulatory requirements for radiology practice. A radiologist has full imaging access, with the scope of practice defined by regional regulation. A radiographer has imaging access for assigned modalities, with the scope defined by the radiographer's credentials and the regional regulatory framework. An imaging aide has limited access, restricted to patient preparation and clerical support.

Permission defaults are versioned alongside the customer's configuration and are subject to the standard validation rules. Defaults may be refined at the facility, department, care-team, or user layer, with refinements recorded as overrides. Access to imaging studies and reports is restricted to authorised personnel, with access logged in the audit trail. Access to radiation dose records is restricted to authorised personnel, with the access supporting the imaging centre's radiation safety program.

### 12.3 Interpretation Authority

Interpretation authority is the structured definition of which radiologists are authorised to interpret which imaging studies, with the authority defined by the radiologist's credentials (general radiology versus subspecialty radiology), the study's complexity, and the regional regulatory framework. The Ibn Hayan platform supports interpretation authority through the permission framework's authority capability, with the authority configured per study (or study type) and per radiologist (or radiologist role). The authority is recorded in the audit trail, with the authority configuration documented for accreditation reporting.

Interpretation authority is subject to additional verification: the interpreting radiologist must have the appropriate credentials for the study's complexity, the interpretation must be performed within the radiologist's scope of practice, and the interpretation must be performed by a radiologist with the appropriate subspecialty credentials for subspecialty studies (e.g., mammography interpretation requires mammography credentials in many jurisdictions). The verification is configured through the permission framework's standard configuration surface, with the configuration reflecting the regional regulatory framework.

---

## 13. Configuration Defaults

### 13.1 Encounter Configuration Defaults

The radiology overlay ships encounter configuration defaults tuned to radiology practice. Default appointment durations vary by study type, with 15 to 30 minutes for routine radiography, 30 to 60 minutes for CT, 30 to 90 minutes for MRI, 30 to 60 minutes for ultrasound, 30 to 60 minutes for mammography, and 60 to 180 minutes for interventional radiology procedures. Default encounter templates are configured per encounter type. Default documentation completion expectation is set to within 24 hours for routine studies and within 12 hours for stat studies.

Encounter configuration defaults are starting points; customers may refine them through the configuration surface at the facility, department, or care-team layer. Refinements are subject to the standard validation rules and are recorded in the audit trail. Defaults are reviewed when the overlay is revised and are updated to reflect evolving practice patterns.

### 13.2 Documentation Configuration Defaults

Documentation configuration defaults include the structured field sets for each documentation template, the validation rules that govern documentation completion, and the longitudinal view configurations that present documentation across encounters. Default structured field sets include all fields required by the regional regulatory framework and the professional standard of care, with optional fields available for activation by the customer. Default validation rules require completion of mandatory sections before the encounter can be closed, with the mandatory sections configured per encounter type.

Documentation configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add fields through the configuration surface, with additions subject to the standard validation rules. Customers may not remove fields that are required by the regional regulatory framework; this restriction is enforced at the platform layer and is not customer-modifiable.

### 13.3 Radiation Safety Configuration Defaults

Radiation safety configuration defaults include the radiation dose tracking (per study and per patient cumulative dose), the occupational dose tracking (where regional regulation requires), the modality quality control configuration (per modality, per quality control phantom, per quality control rule), and the equipment inspection tracking (per equipment, per inspection requirement). Customers may refine the configuration through the configuration surface, with refinements recorded in the audit trail. Radiation safety configuration is reviewed when the overlay is revised and is updated to reflect evolving regulatory requirements.

Radiation safety configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. The configuration is updated when regional regulatory requirements change. The configuration cannot be relaxed below the regional regulatory minimum, which is enforced at the platform layer per Section 8.3 of `CLINIC_TYPES.md`.

### 13.4 Reporting Configuration Defaults

Reporting configuration defaults include the default report set described in Section 11 of this document, with each report configured with the default parameters and the default delivery schedule. Customers may refine report parameters and schedules through the configuration surface, with refinements recorded in the audit trail. Reports are subject to the same access controls as other clinical documentation; access is governed by the permission framework and is logged in the audit trail.

---

## 14. Onboarding Checklist

### 14.1 Onboarding Workflow Stages

The onboarding workflow for radiology follows the eight-stage process defined in Section 9 of `CLINIC_TYPES.md`, with stage durations scaled to the radiology overlay's high configuration complexity. The indicative onboarding timeline is 4–6 weeks for a typical imaging centre, with longer timelines for hospital-based radiology departments and for customers transitioning from paper-based or basic electronic systems.

| Stage | Code | Activity | Owner | Indicative Duration |
|---|---|---|---|---|
| Clinic type selection | O1 | Confirm radiology clinic type at facility | Customer administrator | 1 day |
| Overlay activation | O2 | Apply radiology overlay to facility configuration | Customer administrator | 1 day |
| Module enablement | O3 | Enable core modules; configure PACS integration, modality integration, and ordering clinician system integration | Customer administrator | 3–5 days |
| Configuration refinement | O4 | Refine encounter templates, modality configurations, report templates, radiation safety configuration, role permissions | Customer administrator with clinical lead | 2–3 weeks |
| Validation | O5 | Sandbox testing with representative scenarios including order-to-result, critical finding notification, and modality quality control | Customer clinical lead | 5–7 days |
| User provisioning | O6 | Provision users with radiology-appropriate roles | Customer administrator | 2 days |
| Operational readiness | O7 | Operational readiness assessment; first study order-to-report cycle targeted | Customer clinical lead with Ibn Hayan customer success | 3–5 days |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle updated | Customer administrator | 1 day |

### 14.2 Pre-Onboarding Preparation

Before onboarding begins, the customer should complete the following preparation activities: confirm facility licensing for radiology practice, confirm regional regulatory framework applicability (including radiation safety regulations, imaging accreditation requirements, mammography tracking requirements, and teleradiology requirements where applicable), gather existing modality configurations for migration planning, gather existing PACS integration specifications for review, identify the clinical lead (typically the imaging centre director or chief radiologist) who will validate the configuration, and confirm the anticipated study volume and modality integration requirements.

### 14.3 Onboarding Validation Activities

Onboarding validation activities include: configuration validation per Section 15.4 of `SYSTEM_ARCHITECTURE.md`; workflow validation through testing each configured workflow against representative scenarios (including routine imaging, stat imaging, critical finding notification, and modality quality control); user acceptance testing through radiologists and radiographers performing representative tasks in the sandbox (including image acquisition, image interpretation, and report generation); and operational readiness assessment through a structured review of the configuration against the customer's operational reality. Validation results are documented and are required for the go-live stage transition.

### 14.4 Post-Onboarding Activities

Post-onboarding activities include: ongoing configuration governance per the customer's configuration governance process; periodic review of operational reports and quality improvement reports; periodic review of regulatory reports and submission to regulatory authorities; modality configuration maintenance; PACS integration monitoring and maintenance; radiation safety program administration; and participation in the platform's change-management process for overlay revisions and regional configuration pack updates.

---

## 15. Sample Use Cases

### 15.1 Routine Chest X-Ray Order-to-Report

An ordering clinician orders a chest X-ray for a patient seen in the primary care clinic for cough. The imaging order is received by the imaging centre through the integration module, with the order recorded as a structured order. The patient presents at the imaging centre, where the radiographer performs the chest X-ray per the standard protocol (posterior-anterior and lateral views). The images are acquired and uploaded to the PACS through the integration module, with the image references recorded in Ibn Hayan. The radiologist reviews the images through the PACS, with the interpretation documented through the standard radiology report template. The findings (no acute cardiopulmonary disease) and the impression (no acute findings) are documented, and the report is released to the ordering clinician through the integration module. The turnaround time is calculated from the order receipt to the report release, with the turnaround time monitored against the imaging centre's target turnaround time.

### 15.2 Critical Finding Notification

A patient presents to the emergency department with acute chest pain, with the ordering clinician ordering a stat CT angiogram of the chest to rule out pulmonary embolism. The imaging order is received with stat priority, and the study is performed immediately. The radiologist reviews the images and identifies a critical finding (acute aortic dissection). The critical finding is documented through the critical finding report template, with the finding severity (immediate notification required) recorded. The critical finding notification workflow is triggered, with the ordering clinician notified through the notifications module. The ordering clinician acknowledges the notification within the configured timeframe, with the acknowledgement documented. The notification workflow is complete, with the documentation preserved for audit and for quality improvement reporting. The patient is transferred to the operating room for emergency surgical repair, with the critical finding notification supporting the rapid response.

### 15.3 Mammography Screening with Recall

A patient presents for a screening mammography as part of a routine screening programme. The imaging order is received, with the order indicating a screening mammography. The patient is prepared and the mammography is performed (standard four-view bilateral mammography). The images are acquired and uploaded to the PACS. The radiologist reviews the images and identifies a finding (a cluster of microcalcifications in the upper outer quadrant of the right breast). The BI-RADS assessment is documented (BI-RADS 4 — suspicious, biopsy should be considered). The mammography report is released to the ordering clinician, with the recommendation for biopsy. The recall workflow is triggered, with the patient scheduled for a stereotactic biopsy. The mammography tracking record is updated, with the BI-RADS assessment, the recall, and the biopsy outcome documented for the regional mammography tracking programme.

### 15.4 Contrast Reaction Response

A patient presents for a contrast-enhanced CT of the abdomen. The patient is screened for contrast allergy (no known allergy), and the contrast agent is administered per the standard protocol. The patient develops a mild contrast reaction (urticaria), with the reaction documented through the contrast reaction report template. The reaction severity (mild) is documented, and the intervention (diphenhydramine administered intravenously) is documented. The patient's recovery is monitored, with the recovery documented. The patient is discharged with post-reaction instructions, with the follow-up scheduled (no follow-up required for a mild reaction). The contrast reaction is documented in the patient's contrast reaction history, with the documentation supporting the patient's future contrast administration (the patient's future contrast administration will include prophylactic medication per the mild reaction protocol).

### 15.5 Interventional Radiology Procedure

A patient presents for an image-guided liver biopsy. The patient is scheduled for the procedure, with the interventional radiology consent form provided through the patient portal in advance. At the procedure, the consent is verified, the patient is prepared, and the anaesthesia (local anaesthesia with conscious sedation) is administered and documented. The biopsy is performed under ultrasound guidance, with the procedural documentation completed through the interventional radiology report template. The post-procedure monitoring is documented (vital signs, pain assessment, complication assessment — no complications), and the patient is discharged with post-procedure instructions. The biopsy specimen is sent to the laboratory (C24) for anatomic pathology examination, with the laboratory order configured through the procedural workflow. The pathology result is received and integrated with the patient's oncology record (where the patient is an oncology patient).

### 15.6 Modality Quality Control Failure Response

A radiographer runs the daily quality control for the CT scanner, with the quality control result indicating a rule violation (the image quality metric is below the acceptable threshold). The orders and results module's quality control rule application detects the violation, with the violation triggering the quality control failure response workflow. The imaging on the CT scanner is suspended, with the suspension documented. The radiographer and the medical physicist investigate the violation, with the investigation documented (e.g., review of the scanner's calibration, review of the detector performance). The corrective action is identified (e.g., re-calibration of the scanner), with the corrective action performed and documented. The quality control is re-run, with the re-run result within the acceptable range. The imaging on the CT scanner is resumed, with the resumption documented. The complete quality control failure response is documented for accreditation reporting and for quality improvement analysis.

---

## 16. Best Practices

### 16.1 Configuration Governance Best Practices

Establish a configuration governance process before onboarding begins, defining who is authorized to make configuration changes, how changes are tested before production application, how changes are documented, and how changes are reviewed retrospectively. The Ibn Hayan platform provides the tools (configuration sandbox, configuration validation, configuration versioning, configuration audit) but does not impose the governance workflow; the customer is responsible for the workflow.

Review the configuration at configured intervals (typically quarterly for radiology) and after any significant operational change (new radiologist joining, new modality added, new equipment integrated, regulatory change including accreditation cycle updates). Document the review and the resulting actions, with the documentation preserved for audit. A configuration governance process that is documented and followed is the single most important determinant of a stable production configuration, particularly for radiology where accreditation requires documented configuration governance.

### 16.2 Image Management Best Practices

Enforce PACS integration for all imaging studies, with the images stored in the PACS and the image references recorded in Ibn Hayan. The Ibn Hayan platform's PACS integration capability supports this practice, with the integration enforced through the imaging workflow. The PACS integration supports the imaging centre's image management and supports the imaging centre's quality assurance by ensuring that images are correctly associated with studies and patients.

Verify image references at acquisition, with the verification confirming that the image references in Ibn Hayan match the image records in the PACS. Discrepancies are investigated promptly, with the investigation documented for audit. The verification supports the imaging centre's quality assurance by identifying image references that are missing, mismatched, or incorrect, with the identification supporting corrective action before the image is interpreted.

### 16.3 Radiation Safety Best Practices

Track radiation dose for all ionising radiation studies, with the dose recorded per study and per patient (cumulative dose). The Ibn Hayan platform's radiation dose tracking capability supports this practice, with the tracking enforced through the imaging workflow. The dose tracking supports the imaging centre's radiation safety program and supports regulatory reporting where regional regulation requires dose reporting.

Monitor cumulative patient dose at configured intervals, with the monitoring identifying patients with cumulative dose above the configured threshold. Address the high cumulative dose through communication with the ordering clinician (to consider alternative imaging modalities that do not use ionising radiation) and through documentation of the clinical justification for additional ionising radiation studies. The monitoring supports the patient's radiation safety by surfacing cumulative dose concerns before additional studies are performed.

### 16.4 Critical Finding Notification Best Practices

Configure critical finding thresholds based on the regional regulatory framework and the imaging centre's clinical context, with the thresholds reviewed at configured intervals and adjusted based on clinical feedback. The Ibn Hayan platform's critical finding notification capability supports this practice, with the thresholds configured through the orders and results module's clinical decision support surface.

Monitor critical finding notification compliance at configured intervals, with the monitoring verifying that critical findings are notified within the configured timeframe and that the notifications are acknowledged within the configured timeframe. The Ibn Hayan platform's critical finding notification compliance report supports this practice, with the report surfacing non-compliant notifications for follow-up. Address the non-compliance promptly, with the action documented for audit.

### 16.5 Modality Quality Control Best Practices

Run modality quality control at the configured intervals for all modalities, with the quality control run documented through the orders and results module's quality control capability. Quality control is not optional; it is a clinical and regulatory requirement that supports the image quality of the imaging centre's studies. The Ibn Hayan platform's quality control capability supports this practice, with the quality control integrated with the imaging workflow.

Respond to quality control failures promptly, with the response including the suspension of imaging on the affected equipment, the investigation of the failure, the corrective action, the quality control re-run, and the resumption of imaging. Document the complete response, with the documentation supporting the imaging centre's quality assurance and supporting the imaging centre's accreditation reporting. The Ibn Hayan platform's quality control failure response workflow supports this practice.

### 16.6 Mammography Tracking Best Practices

Configure mammography tracking to support the regional mammography regulatory framework (e.g., MQSA in the US), with the tracking including the mammography studies, the BI-RADS assessments, the recalls, the biopsies, and the cancer detections. The Ibn Hayan platform's mammography tracking capability supports this practice, with the tracking integrated with the mammography workflow.

Submit mammography tracking reports to the regional mammography regulatory authority on the schedule required by regional regulation, with the submission documented for audit. The Ibn Hayan platform's mammography tracking report supports this practice, with the report generated through the reporting module and submitted through the integration module where electronic submission is supported.

### 16.7 Reporting and Analytics Best Practices

Review clinical outcome reports at configured intervals and use the reports to inform imaging practice. The patient's imaging history report, the critical finding notification report, and the mammography outcome report support the imaging centre's quality assurance by surfacing trends that may not be apparent in individual imaging events. The Ibn Hayan platform's reporting capability supports this practice.

Review operational reports at configured intervals and use the reports to inform imaging centre management decisions. The study volume report, the turnaround time report, the modality utilisation report, and the radiologist productivity report surface operational patterns that may not be apparent from day-to-day practice. Address the patterns identified through the reports, with the actions documented and the effects monitored through subsequent reports.

### 16.8 Onboarding Best Practices

Engage Ibn Hayan customer success or implementation consulting for configuration review during onboarding. The radiology overlay's high configuration complexity warrants configuration review by an experienced implementer, particularly for the PACS integration, the modality configurations, the radiation safety configuration, and the report templates. The cost of the review is modest compared to the cost of rework after go-live, and the review is particularly valuable for imaging centres preparing for accreditation.

Train all users before go-live, with the training tailored to each user's role. Image acquisition training should include hands-on practice with the modality worklist and the image acquisition workflow. Image interpretation training should include hands-on practice with the image interpretation workflow and the report template. Quality control training should include hands-on practice with the modality quality control workflow. Conduct training in the sandbox to avoid affecting production data. Document the training, with the documentation preserved for audit.

### 16.9 Change Management Best Practices

Adopt overlay revisions on a planned schedule rather than reactively. Overlay revisions are communicated in advance, with the revision contents documented and the adoption window defined. Plan the adoption during a period of lower operational tempo, with the adoption tested in the sandbox before production application. Document the adoption, with the documentation preserved for audit.

Participate in the platform's change-management process by providing feedback on overlay revisions and by participating in pilot engagements for new overlay capabilities. Customer participation is the basis of the platform's validated-practice posture stated in Principle P8 (Verified Practice Over Hypothetical Capability) in Section 4.9 of `SYSTEM_ARCHITECTURE.md`.

### 16.10 Accreditation Readiness Best Practices

Configure the imaging centre's documentation and reporting to support the regional accreditation standards, with the configuration including the modality quality control documentation, the equipment maintenance documentation, the personnel credentialing documentation, and the radiation safety documentation. The Ibn Hayan platform's documentation and reporting capabilities support this practice, with the configuration supporting the imaging centre's accreditation readiness.

Conduct internal accreditation readiness assessments at configured intervals (typically annually, in advance of the accreditation inspection), with the assessment reviewing the imaging centre's documentation and reporting against the accreditation standards. Address the gaps identified through the assessment, with the actions documented for audit. The internal assessment supports the imaging centre's accreditation readiness by surfacing gaps before the accreditation inspection, with the gaps addressed through configuration refinement or process improvement.

---

## 17. Related Documents

### 17.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines the imaging centre clinic type (C25); Section 16 (Editions) defines the edition packaging; Section 19 (Product Modules Overview) defines the module catalogue including M04 Orders & Results; Section 22 (Configuration-Driven Philosophy) governs customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the platform's behaviour including P1 Healthcare Safety; Section 12 (Clinic Hierarchy) defines the clinic type overlay layer; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; imaging centre is clinic type C25 in the diagnostic and pharmacy family; Section 5 documents the configuration overlay approach; Section 8 documents customization boundaries |

### 17.2 Downstream and Sibling Documents

The following downstream and sibling documents elaborate aspects of radiology referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and dependencies |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue and permission scope defaults |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework and access control rules |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine and workflow configuration |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per clinic type |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging and module enablement |
| Patient Module | `docs/07_MODULES/PATIENT.md` | Patient registration, pregnancy status |
| Encounter Module | `docs/07_MODULES/ENCOUNTER.md` | Encounter management, imaging encounters |
| Orders & Results Module | `docs/07_MODULES/ORDERS_RESULTS.md` | Imaging order management, study tracking, result reporting |
| Documents Module | `docs/07_MODULES/DOCUMENTS.md` | Image storage, report storage |
| Notifications Module | `docs/07_MODULES/NOTIFICATIONS.md` | Critical finding notifications |
| Pharmacy Clinic Type | `docs/06_CLINIC_TYPES/PHARMACY.md` | Sibling diagnostic and pharmacy family clinic type (C23) |
| Laboratory Clinic Type | `docs/06_CLINIC_TYPES/LABORATORY.md` | Sibling diagnostic and pharmacy family clinic type (C24) |
| Hospital Clinic Type | `docs/06_CLINIC_TYPES/HOSPITAL.md` | Sibling clinic type for hospital-based radiology |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Overlay revisions and regional configuration pack updates are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
