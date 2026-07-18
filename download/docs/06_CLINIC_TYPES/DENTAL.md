# Ibn Hayan Healthcare Operating System
## Dental Clinics

| Field | Value |
|---|---|
| Document Title | Dental Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the dental configuration overlay is amended or when regional dental practice acts or radiography regulations change |
| Audience | Clinical informatics leads, implementation consultants, customer success teams, configuration architects, dentists, dental hygienists, dental practice administrators, compliance officers evaluating Ibn Hayan for dental practice |
| Scope | Dental clinic type configuration overlay, recommended module composition, specialty-specific capabilities (dental charting, periodontal charting, treatment planning, dental imaging integration, dental materials inventory, procedures library, dental anaesthesia documentation, implant tracking), specialty workflows, conceptual data entities, forms and templates, reports and analytics, integrations, role and permission defaults, configuration defaults, onboarding checklist, sample use cases, best practices |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks, database schemas, API endpoint specifications, UI component catalogues, vendor-specific dental imaging device contracts, country-specific legal interpretation of dental practice acts |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the dental clinic type configuration approach and does not override the catalogue entry or the platform-level principles. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Dental Charting
5. Treatment Planning
6. Dental Imaging Integration
7. Dental Materials Inventory
8. Procedures Library
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

Dentistry is the healthcare specialty concerned with the diagnosis, prevention, and treatment of conditions of the oral cavity, the maxillofacial region, and the associated structures. Dentists diagnose and treat dental caries, periodontal disease, malocclusion, oral pathology, orofacial pain, and dental trauma, and they perform restorative, prosthetic, endodontic, periodontal, surgical, and aesthetic dental procedures. The scope of practice spans general dentistry and the dental specialties (orthodontics, oral and maxillofacial surgery, periodontics, prosthodontics, endodontics, paediatric dentistry, oral pathology, oral radiology, dental public health). In Ibn Hayan, dental is positioned as a clinic type within the dental specialty family, building on the configuration-driven approach documented in Section 18.3 of `PRODUCT_BIBLE.md` and Section 5 of `CLINIC_TYPES.md`. The dental clinic type is referenced in Section 11.1 of `CLINIC_TYPES.md` as a candidate for catalogue expansion, with the configuration overlay documented in this reference supporting the intake process defined in Section 17.4 of `PRODUCT_BIBLE.md`.

The dental clinic type is distinct from the medical clinic types in Ibn Hayan's catalogue in several operational respects. The dental encounter is structured around the dental examination and the dental procedure, with documentation centred on the odontogram (the graphical representation of the dentition) rather than on the general medical encounter note. The dental treatment plan is multi-visit and procedure-sequenced, with each procedure building on the previous. The dental inventory is materials-intensive, with restorative materials, impression materials, and anaesthetic agents tracked at the per-procedure level. The overlay accommodates these distinctions through dental-specific encounter templates, documentation structures, and inventory configurations.

### 1.2 Patient Population and Clinical Activities

The dental patient population spans all ages. Paediatric dentistry addresses the dental needs of children, including preventive care (fluoride application, sealants), restorative care, and the management of early childhood caries. Adult dentistry addresses the broad scope of general and specialty dental care, including preventive care, restorative dentistry (fillings, crowns, bridges), endodontics (root canal therapy), periodontics (gum disease treatment), prosthodontics (dentures, implants), orthodontics (braces, aligners), oral surgery (extractions, implants), and aesthetic dentistry (whitening, veneers). Geriatric dentistry addresses the dental needs of older adults, including the management of root caries, tooth wear, and the dental implications of systemic disease and polypharmacy.

Key clinical activities in dental practice include the comprehensive dental examination (with odontogram, periodontal charting, oral cancer screening, and radiographic assessment), treatment planning (with procedure sequencing, alternative treatment options, and financial estimation), procedural intervention (with diverse procedure types and the associated materials, anaesthesia, and documentation), and longitudinal recall (with recall intervals determined by oral health risk assessment). Each of these activities is supported by configuration in the dental overlay.

### 1.3 Why Dental Requires Specialized Configuration

Dental presents configuration considerations that distinguish it from the medical clinic types in Ibn Hayan's catalogue. The odontogram is a graphical data structure that is central to dental documentation, with each tooth's status (present, missing, restored, carious, crowned, implanted) documented graphically and the restorations and conditions documented against specific tooth surfaces. The configuration must support the odontogram as a first-class data entity, with the odontogram supporting graphical interaction, structured data capture, and longitudinal comparison.

Periodontal charting is similarly graphical and quantitative, with probing depths, clinical attachment levels, bleeding on probing, recession, and mobility documented per tooth and per surface. The configuration must support the periodontal chart as a structured data entity that supports the dental practitioner's periodontal assessment and treatment planning. Dental radiography is integral to dental practice, with intraoral (periapical, bitewing) and extraoral (panoramic, cephalometric) imaging performed routinely; the configuration must support dental imaging as a first-class data entity, with imaging integrated with the odontogram and the treatment plan.

Dental treatment planning is multi-visit and procedure-sequenced, with each procedure building on the previous (e.g., root canal therapy before crown placement; extraction before implant placement). The configuration must support treatment planning as a structured data entity that supports procedure sequencing, alternative treatment options, and the association of each procedure with the relevant tooth or teeth. Dental materials inventory is materials-intensive and lot-tracked, with materials tracked at the per-procedure level for restorative materials and at the per-patient level for implant materials; the configuration must support this dual tracking approach.

### 1.4 Relationship to Other Clinic Types

Dental operates in relationship to several other clinic types, although the operational coupling is less than for medical specialties. Dental coordinates with oral and maxillofacial surgery (a dental specialty that may operate within a hospital setting) for complex surgical procedures, with otolaryngology (C14) for orofacial conditions that overlap dental and otolaryngological scope, with plastic surgery (sibling surgical specialty) for facial reconstruction that overlaps dental and plastic surgical scope, and with oncology (C11) for oral cancer management. The overlay includes integration surfaces that support this coordination, with the integration respecting the boundaries between clinic types described in Section 4 of `CLINIC_TYPES.md`.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes and Ownership

Dental is practised across a range of facility sizes, from solo practitioner dental offices through group dental practices, dental service organisations (multi-location dental practice groups), and hospital-based dental departments. The recommended editions for dental are Essential (E1) for solo practitioners and small dental practices, Professional (E2) for mid-sized group practices and dental service organisations, and Enterprise (E3) for hospital-based dental departments and large dental service organisations. The edition recommendation reflects the typical facility size and the configuration depth required.

Ownership patterns in dental include private practice (individual or group), dental service organisations (which provide non-clinical services to multiple dental practices), hospital-employed dentist groups, and government-operated dental services. The clinic type overlay is ownership-agnostic; it provides the configuration surface that any ownership model requires, with ownership-specific concerns configured at the facility or customer layer per the configuration layer model in Section 15.3 of `SYSTEM_ARCHITECTURE.md`.

### 2.2 Geographic and Regulatory Considerations

Dental is practised in every region Ibn Hayan serves, and the regulatory environment for dental practice varies across regions. The overlay accommodates this variation through the platform's localization module (M19), with regional configuration packs that adapt dental practice act requirements, dental radiography regulations (including radiation safety and dosimetry tracking where required), dental materials regulations (including mercury amalgam regulations that vary by region), and dental anaesthesia regulations (including the scope of practice for dental sedation and general anaesthesia). The configuration packs are versioned alongside the platform's regional regulatory framework.

Geographic considerations also include rural and remote dental practice, where dental services may be delivered through outreach clinics, mobile dental units, or telehealth consultation for triage and treatment planning. The dental overlay supports telehealth encounters through the encounter template configuration, with the telehealth variant of the dental consultation template adapting the assessment and treatment planning to the telehealth context while maintaining the documentation rigour required for clinical accountability.

### 2.3 Regulatory Exposure

The regulatory exposure for dental reflects dental radiography requirements, dental materials regulations, dental anaesthesia regulations, and the standard regulatory requirements for healthcare practice. The overlay addresses each regulatory dimension through configuration: dental radiography is documented through structured radiographic records with the radiation dose recorded where required by regional regulation; dental materials are tracked through the inventory module (M07) with materials linked to the patient and the procedure; dental anaesthesia is documented through structured anaesthesia records with the anaesthetic agent, dose, and monitoring recorded.

Regulatory exposure is higher for dental practices that perform dental sedation or general anaesthesia, with additional regulatory requirements for the facility, the practitioner credentials, and the documentation. The overlay accommodates these requirements through specialty-specific encounter templates and documentation structures, with the templates configured through the clinical documentation module (M03). The regional configuration pack addresses the regional regulatory framework for dental sedation and general anaesthesia, with the configuration enforced at the platform layer where regional regulation requires it.

### 2.4 Customer Maturity Profile

Dental customers vary in maturity. Established practices with mature dental practice management software use configure Ibn Hayan to match their existing operational patterns; transitioning customers from paper-based or basic electronic systems require more onboarding support. Practices with established odontogram and periodontal charting data may require data migration support to incorporate existing data into Ibn Hayan. The onboarding workflow in Section 9 of `CLINIC_TYPES.md` scales stage duration and complexity to the customer's maturity profile and the overlay's configuration complexity.

---

## 3. Recommended Modules

### 3.1 Core Module Composition

The recommended module composition for dental is adapted to the dental operational reality, building on the platform's core clinical and operational modules. The table below summarizes the recommended modules; module codes are defined in Section 19.2 of `PRODUCT_BIBLE.md`.

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Core | Patient registration, demographics, dental consent |
| Encounter | M02 | Core | Dental examination encounters, procedure encounters, recall encounters, telehealth encounters |
| Clinical Documentation | M03 | Core | Dental documentation templates, odontogram, periodontal charting, procedure documentation |
| Orders & Results | M04 | Core | Dental radiography orders, laboratory orders for dental prosthetics |
| Pharmacy | M05 | Limited | Local anaesthetic and dental medication management; typically not full pharmacy module |
| Scheduling | M06 | Core | Appointment scheduling, multi-visit procedure scheduling, recall scheduling |
| Documents | M07 | Core | Consent documents, dental imaging, treatment plan documents, dental laboratory prescriptions |
| Notifications | M08 | Core | Appointment reminders, recall reminders, post-procedure follow-up reminders |
| Billing | M09 | Core | Procedure billing, insurance claim submission, patient co-payment management |
| Accounting | M10 | Optional | General ledger for private practices with their own accounting |
| CRM | M11 | Optional | Patient outreach, recall management for retention |
| HR | M12 | Optional | Employee management for practices with administrative and clinical staff |
| Workforce | M13 | Optional | Scheduling of clinical staff, credentialing for dental licensure and specialty |
| Identity & Access | M14 | Core | Authentication, role-based access |
| Configuration | M15 | Core | Configuration surface for overlay refinement |
| Audit | M16 | Core | Audit trail for clinical and procedural actions |
| Integration | M17 | Optional | Integration with dental imaging systems (intraoral sensors, panoramic systems, CBCT), dental laboratory systems |
| Reporting | M18 | Core | Clinical outcomes reporting, operational reporting, regulatory reporting |
| Localization | M19 | Core | Regional regulatory framework, dental coding system adaptation (CDT, ICD-DA) |

### 3.2 Module Activation Considerations

The core module set is recommended for every dental deployment; the optional modules are added based on the customer's operational reality. A solo dentist may decline M10 (Accounting) and M11 (CRM); a mid-sized group practice typically adds both; a hospital-based dental department typically operates within the hospital's broader module set. Module enablement is governed by the dependency rules in Section 9.4 of `SYSTEM_ARCHITECTURE.md`.

The clinical documentation module (M03) is particularly relevant for dental given the specialty's reliance on the odontogram, periodontal charting, and structured procedure documentation. The integration module (M17) is particularly relevant given the specialty's reliance on dental imaging devices (intraoral sensors, panoramic systems, cone-beam computed tomography) and dental laboratory systems. The integration is performed through anticorruption layer connectors described in Section 7.3 of `SYSTEM_ARCHITECTURE.md`.

### 3.3 Edition Packaging

The recommended editions for dental span the full edition range, reflecting the diversity of dental facility sizes. Essential (E1) is recommended for solo practitioners and small dental practices; Professional (E2) for mid-sized group practices and dental service organisations; Enterprise (E3) for hospital-based dental departments and large dental service organisations. Edition packaging is governed by Section 16 of `PRODUCT_BIBLE.md`; editions differ in module enablement and configuration depth, not in platform quality.

---

## 4. Dental Charting

### 4.1 Odontogram Structure

The odontogram is the graphical representation of the dentition, with each tooth documented for its status and each restoration or condition documented against the tooth or the tooth surface. The Ibn Hayan dental overlay ships an odontogram structure that supports both the universal (US) and FDI (international) tooth numbering systems, with the numbering system configured through the regional configuration pack. The odontogram includes the permanent dentition (32 teeth in the universal numbering system), the primary dentition (20 teeth), and the mixed dentition (the transitional state during which both primary and permanent teeth are present).

The odontogram supports the graphical documentation of tooth status (present, missing, impacted, unerupted, partially erupted), tooth conditions (carious, fractured, restored, crowned, implanted, bridge abutment, denture abutment), and tooth surface restorations (with the five surfaces — mesial, distal, buccal, lingual, occlusal — individually documented). The graphical documentation is supported by structured data capture, with each graphical element backed by a structured data record that supports query, reporting, and longitudinal comparison.

### 4.2 Charting Workflow

The dental charting workflow is the structured process of documenting the patient's dental status during the dental examination. The overlay ships a charting workflow that supports the standard sequence: tooth-by-tooth examination (with findings documented graphically and as structured data), restoration documentation (with restoration type, material, and surface documented per restoration), condition documentation (with condition type and severity documented per condition), and treatment needs documentation (with the procedure needed for each tooth or condition documented). The workflow is configured through the clinical documentation module (M03) and the workflow engine described in Section 16 of `SYSTEM_ARCHITECTURE.md`.

The charting workflow is encounter-type-aware: the comprehensive examination charting workflow is the most thorough, with all teeth and all findings documented; the recall examination charting workflow is more focused, with the charting updated to reflect changes since the previous examination. The workflow is also practitioner-aware: the dentist charting workflow includes diagnostic findings, while the dental hygienist charting workflow includes the periodontal charting and the preventive care findings within the dental hygienist's scope of practice.

### 4.3 Longitudinal Chart Comparison

The odontogram is most valuable when compared across encounters, allowing the dental practitioner to track changes in the patient's dental status over time. The Ibn Hayan dental overlay supports longitudinal chart comparison through the reporting module's (M18) longitudinal view capability, with the view presenting the odontogram from each encounter in a single display. The view supports clinical decision-making by surfacing changes (new caries, new restorations, new missing teeth) that may not be apparent in individual encounter documentation.

Longitudinal chart comparison is also the basis for treatment planning: the comparison surfaces the patient's dental history (which teeth have been restored, which teeth have been extracted, which conditions are recurrent), supporting the dental practitioner's assessment of the patient's dental trajectory and the appropriateness of proposed treatment. The comparison is read-only; it is generated from the encounter-bound odontogram records and does not constitute a separate data entry surface.

### 4.4 Charting Symbols and Notation

The overlay supports the standard dental charting symbols and notations, with the symbols configured through the clinical documentation module's structured field capability. The symbols include the standard symbols for carious lesions, restorations (amalgam, composite, gold, other), crowns (full, partial, implant-supported), prosthetics (fixed bridge, removable partial denture, complete denture, implant), endodontic treatment (root canal therapy, apexification, apicoectomy), periodontal conditions (recession, furcation involvement, mobility), and other dental findings. The notation is configured per regional convention, with the regional configuration pack addressing the symbols and notations appropriate to the region.

The charting symbols and notation are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add customer-specific symbols through the configuration surface, with additions subject to the standard validation rules. The platform's catalogue of symbols is expanded when new dental procedures or materials emerge that warrant new symbols.

---

## 5. Treatment Planning

### 5.1 Treatment Plan Structure

The dental treatment plan is the structured documentation of the dental practitioner's plan for the patient's dental treatment, defining the procedures to be performed, the sequence of procedures, the alternative treatment options, and the financial estimation. The Ibn Hayan dental overlay ships a treatment plan template that captures the standard elements: procedures (with structured fields for procedure code, tooth or teeth, surface, description), sequence (with structured fields for procedure ordering and dependencies), alternatives (with structured fields for alternative procedures and their rationale), and financial estimation (with structured fields for procedure fees, insurance coverage, and patient responsibility).

The treatment plan is created after the comprehensive examination and is reviewed and revised as the patient's treatment progresses. The plan is versioned; revisions are recorded as new versions with the previous version retained for audit. The plan is associated with the patient's longitudinal dental record, allowing comparison across treatment episodes (e.g., comparison of the current treatment plan with a previous treatment plan from several years previously). The plan is also associated with the procedures performed, supporting the tracking of treatment plan completion.

### 5.2 Procedure Sequencing

Procedure sequencing is the structured ordering of procedures within the treatment plan, with the sequence determined by clinical dependencies (e.g., root canal therapy before crown placement; extraction before implant placement; periodontal therapy before restorative procedures) and by patient factors (e.g., urgency of treatment, patient preference, financial considerations). The overlay supports procedure sequencing through the treatment plan's structured sequence fields, with the sequence supporting the scheduling module's (M06) multi-visit procedure scheduling capability.

Procedure sequencing is integrated with the scheduling workflow, with the sequence supporting the scheduling of procedures in the appropriate order and the prevention of scheduling that would violate the sequence. The integration is configured through the scheduling module's standard configuration surface, with the integration respecting the boundaries between the clinical documentation and scheduling modules described in Section 13 of `SYSTEM_ARCHITECTURE.md`. The integration supports the dental practitioner's treatment plan execution by ensuring that the sequence is reflected in the scheduling.

### 5.3 Alternative Treatment Options

Alternative treatment options are an integral element of dental treatment planning, with the patient presented with the alternatives and the patient's informed choice documented. The overlay supports alternative treatment options through the treatment plan's structured alternative fields, with the alternatives including the procedure, the rationale, the advantages and disadvantages, and the cost. The alternatives are presented to the patient during the treatment planning consultation, with the patient's choice documented in the consent record.

Alternative treatment options are integrated with the consent workflow, with the consent record reflecting the patient's chosen treatment option. The integration is configured through the patient module's (M01) consent management capability, with the integration supporting the documentation of informed consent for the chosen treatment. The integration respects the boundaries between the treatment planning and consent workflows, with each workflow owned by the responsible module.

### 5.4 Treatment Plan Review and Revision

Treatment plan review and revision is the structured process of evaluating the treatment plan as the patient's treatment progresses and revising it based on the patient's response, the findings during procedures, and changes in the patient's circumstances. The overlay ships a treatment plan review template that captures the standard elements: progress assessment (procedures completed, procedures remaining, changes in the patient's status), plan revision (changes to procedures, sequence, alternatives), and revision rationale (the clinical reasoning for the revision). The review is conducted at configured intervals or when triggered by clinical findings.

Treatment plan review is integrated with the procedure documentation workflow, with the review triggered automatically when a procedure is completed and the next procedure in the sequence is due for scheduling. The integration supports the dental practitioner's adherence to the treatment plan by surfacing the overdue review for action. The integration is configured through the workflow engine's standard configuration surface.

---

## 6. Dental Imaging Integration

### 6.1 Intraoral Imaging

Intraoral imaging comprises periapical radiographs (showing the entire tooth from crown to apex), bitewing radiographs (showing the crowns of the upper and lower teeth and the interproximal areas), and occlusal radiographs (showing the floor of the mouth or the palate). The Ibn Hayan dental overlay supports intraoral imaging through the documents module (M07) for image storage and through the integration module (M17) for connection to intraoral imaging systems (digital sensors, phosphor plate systems). The images are associated with the patient, the encounter, the tooth or teeth imaged, and the imaging protocol used.

Intraoral imaging is integrated with the odontogram, with the images linked to the teeth imaged and accessible from the odontogram through the structured linkage. The integration supports the dental practitioner's clinical decision-making by surfacing the relevant images alongside the odontogram findings. The integration is configured through the documents module's standard configuration surface, with the integration respecting the boundaries between the documents and clinical documentation modules.

### 6.2 Extraoral Imaging

Extraoral imaging comprises panoramic radiographs (showing the entire dentition, the jaws, and the temporomandibular joints), cephalometric radiographs (showing the lateral skull for orthodontic assessment), and cone-beam computed tomography (CBCT, providing three-dimensional imaging for implant planning, endodontic assessment, and oral surgery planning). The overlay supports extraoral imaging through the documents module and the integration module, with the images associated with the patient, the encounter, and the imaging protocol used.

Extraoral imaging is subject to additional radiation safety requirements, with the radiation dose recorded where required by regional regulation. The radiation dose tracking is configured through the documents module's structured field capability, with the tracking supporting regulatory reporting and patient cumulative dose monitoring. The tracking is enforced at the platform layer where regional regulation requires it; the customer cannot disable the tracking below the regional regulatory minimum.

### 6.3 Image Integration with Odontogram

Image integration with the odontogram is the structured linkage of dental images to the teeth and surfaces documented in the odontogram. The overlay supports this integration through the documents module's standard configuration surface, with the linkage recorded as a structured data entity that associates the image with the tooth or teeth imaged. The linkage supports the dental practitioner's clinical decision-making by surfacing the relevant images alongside the odontogram findings, and by supporting the longitudinal comparison of images for the same tooth across encounters.

Image integration is also the basis for radiographic caries detection, with the dental practitioner documenting carious lesions identified on the radiographs against the relevant tooth surfaces in the odontogram. The integration supports the dental practitioner's documentation efficiency by allowing the documentation of radiographic findings directly against the odontogram, with the documentation triggering the corresponding treatment needs in the treatment plan.

### 6.4 Image Access Control

Dental images are subject to the standard access control rules, with access restricted to authorised users with a clinical or operational need. The overlay's permission framework governs image access, with access logged in the audit trail per Principle P13 (Auditability as Primitive) stated in Section 4.13 of `SYSTEM_ARCHITECTURE.md`. Patients may access their own images through the patient portal, with the access governed by the patient's consent record.

Image access is configured through the permission framework's standard configuration surface, with the configuration defining which roles may access which image categories. The configuration is versioned alongside the customer's configuration and is subject to the standard validation rules. Image access is reviewed periodically by the practice's privacy officer or equivalent, with the review documented.

---

## 7. Dental Materials Inventory

### 7.1 Materials Catalogue

The dental materials catalogue is the curated list of materials used in dental practice, organized by material category (restorative materials, impression materials, anaesthetic agents, dental implants, dental prosthetics, dental instruments, dental supplies). Each material entry includes the standard material attributes (name, manufacturer, model, lot number, expiry date) and dental-specific attributes (material type, shade where applicable, quantity unit). The catalogue is configured through the inventory module (M07) and is versioned alongside the overlay.

The materials catalogue is maintained by the customer's practice administrator or designated inventory manager, with materials added, updated, and removed as the practice's materials usage evolves. The catalogue is integrated with the procedural documentation workflow, with materials used in each procedure documented against the procedure and the patient. The integration supports the practice's materials management by providing the data needed for inventory reordering, materials cost accounting, and regulatory reporting.

### 7.2 Lot and Expiry Tracking

Lot and expiry tracking is the structured monitoring of materials by lot number and expiry date, supporting the practice's materials management and supporting product recall response. The overlay supports lot and expiry tracking through the inventory module's standard lot tracking capability, with each material receipt recorded with the lot number, the receipt date, the quantity received, and the expiry date. The lot and expiry tracking is enforced at the platform layer, with the customer unable to disable the tracking.

Lot tracking is integrated with the procedural documentation, with the lot number of materials used in each procedure documented against the procedure and the patient. The integration supports the practice's recall response by allowing the identification of patients who received treatment with materials from a recalled lot. The integration is configured through the inventory module's standard configuration surface, with the integration respecting the boundaries between the inventory and clinical documentation modules.

### 7.3 Materials Usage Documentation

Materials usage documentation is the structured capture of materials used in each dental procedure, supporting the practice's materials cost accounting and the patient's longitudinal materials record. The overlay supports materials usage documentation through the procedural documentation workflow, with materials usage documented as a structured section within the procedure note. The materials usage is documented with the material, the quantity, the lot number (where applicable), and the tooth or teeth (where applicable).

Materials usage documentation is integrated with the inventory module, with the usage reducing the inventory balance for the material. The integration is configured through the inventory module's standard configuration surface, with the integration respecting the boundaries between the clinical documentation and inventory modules. The integration supports the practice's materials management by ensuring that the inventory balance reflects the actual usage, with the inventory balance supporting reordering decisions.

### 7.4 Implant Tracking

Dental implant tracking is the structured monitoring of dental implants placed, supporting the practice's implant outcome tracking and supporting post-market surveillance for implant manufacturers. The overlay supports implant tracking through the inventory module's implant tracking capability, with each implant recorded with the manufacturer, model, lot number, serial number (where applicable), the patient, the procedure, and the placement site (tooth position). The implant tracking is integrated with the procedural documentation, with the implant record created automatically when an implant procedure is documented.

Implant tracking is also the basis for implant outcome assessment, with the implant record supporting the longitudinal tracking of implant survival, implant complications, and implant-related patient outcomes. The implant outcome assessment is configured through the reporting module's (M18) longitudinal view capability, with the view presenting the implant outcome across encounters. The assessment supports the practice's quality improvement by surfacing implant outcome patterns that may inform implant selection and technique.

---

## 8. Procedures Library

### 8.1 Procedure Catalogue

The dental procedures library is the curated catalogue of dental procedures, organized by procedure category (diagnostic, preventive, restorative, endodontic, periodontal, prosthodontic, oral surgery, orthodontic, adjunctive). Each procedure entry includes the procedure code (CDT in the US, ICD-DA in some other regions), the procedure description, the typical duration, the typical materials required, and the documentation template to be used. The catalogue is configured through the clinical documentation module (M03) and is versioned alongside the overlay.

The procedure catalogue is maintained by the platform and is updated when new procedure codes are introduced or when existing procedure codes are revised. Updates are versioned and communicated to affected customers through the change-management channel. Customers may add customer-specific procedures through the configuration surface, with additions subject to the standard validation rules and recorded in the audit trail. Customer-specific procedures do not replace platform catalogue entries; they supplement them.

### 8.2 Procedure Documentation Templates

Procedure documentation templates support the structured capture of procedure information. The dental overlay ships templates for the common dental procedures: comprehensive oral evaluation, periodic oral evaluation, dental prophylaxis, dental sealants, amalgam restoration, composite restoration, crown preparation, crown delivery, root canal therapy, tooth extraction, dental implant placement, denture impression, denture delivery, and orthodontic adjustment. Each template is configured through the clinical documentation module and is subject to the standard validation, versioning, and audit rules.

| Template | Procedure Category | Mandatory Sections | Configurable Fields |
|---|---|---|---|
| Comprehensive oral evaluation | Diagnostic | History, examination, odontogram, periodontal charting, radiographic assessment, diagnosis, treatment plan | Examination depth, assessment instruments |
| Dental prophylaxis | Preventive | Assessment, prophylaxis performed, fluoride applied (if any), patient education | Prophylaxis type, fluoride type |
| Amalgam restoration | Restorative | Tooth, surface, anaesthesia, caries removal, material, isolation, finishing | Material, matrix system |
| Composite restoration | Restorative | Tooth, surface, anaesthesia, caries removal, material, shade, isolation, finishing | Material, shade, bonding system |
| Crown preparation | Prosthodontic | Tooth, anaesthesia, preparation design, impression, temporary crown | Preparation design, impression material |
| Root canal therapy | Endodontic | Tooth, anaesthesia, access, canal negotiation, irrigation, obturation, restoration | Irrigation protocol, obturation technique |
| Tooth extraction | Oral surgery | Tooth, anaesthesia, extraction technique, complications, post-operative instructions | Extraction technique, anaesthesia type |
| Dental implant placement | Oral surgery | Site, anaesthesia, implant details, placement technique, complications, post-operative instructions | Implant details, placement technique |

### 8.3 Procedure Code Mapping

Procedure code mapping is the structured association of dental procedure codes (CDT, ICD-DA) with the procedure documentation templates and the inventory materials. The overlay supports procedure code mapping through the clinical documentation module's structured field capability, with the mapping ensuring that the appropriate documentation template is selected when a procedure is scheduled and that the appropriate materials are suggested when the procedure is documented. The mapping is configured through the clinical documentation module's standard configuration surface.

Procedure code mapping is also the basis for billing, with the procedure codes used for insurance claim submission and patient billing. The mapping is integrated with the billing module (M09), with the procedure code, the procedure fee, and the patient responsibility documented in the billing record. The integration is configured through the billing module's standard configuration surface, with the integration respecting the boundaries between the clinical documentation and billing modules.

### 8.4 Procedure Library Maintenance

The procedures library is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Library changes — additions, deprecations, template revisions — are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. Customers are notified of library revisions through the platform's change-management channel and may adopt revisions on their own schedule within documented windows.

Procedure library maintenance is particularly important for dental given the annual update cycle of the CDT code set, with new codes introduced each year and existing codes revised or deprecated. The overlay's regional configuration pack addresses the CDT update, with the update applied at the start of the calendar year. The update is tested in the sandbox before production application, with the testing including verification that existing treatment plans and billing configurations are not adversely affected by the update.

---

## 9. Specialty Workflows

### 9.1 Workflow Inventory

The Ibn Hayan dental overlay ships a default set of workflows tuned to dental practice. The workflows are defined declaratively through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md` Section 2.

| Workflow | Code | Trigger | Key Steps | Outcome |
|---|---|---|---|---|
| Comprehensive oral evaluation | DW1 | Scheduled appointment | Patient check-in, consent, comprehensive examination, odontogram, periodontal charting, radiographic assessment, diagnosis, treatment plan, recall scheduling | Examination documented; treatment plan created |
| Periodic recall examination | DW2 | Scheduled recall | Patient check-in, periodic examination, odontogram update, periodontal charting update, radiographic assessment (if due), treatment plan review, recall scheduling | Recall documented; next recall scheduled |
| Dental procedure | DW3 | Scheduled procedure | Patient check-in, consent verification, anaesthesia, procedure, materials usage, post-operative instructions, next appointment scheduling | Procedure documented; materials usage recorded |
| Multi-visit procedure sequence | DW4 | Treatment plan with multi-visit sequence | Procedure sequencing, scheduling of each visit, procedure documentation at each visit, sequence completion assessment | Sequence documented; completion assessed |
| Treatment plan presentation | DW5 | Treatment plan created | Treatment plan review with patient, alternative discussion, financial estimation, patient consent, scheduling | Treatment plan presented; consent obtained |
| Dental emergency | DW6 | Patient presentation | Triage, assessment, intervention (pain relief, temporary restoration, extraction if needed), follow-up scheduling | Emergency managed; follow-up scheduled |
| Implant placement and restoration | DW7 | Treatment plan with implant | Implant placement, healing period, impression, crown delivery, follow-up | Implant placed and restored; outcome documented |
| Recall management | DW8 | Recall trigger (interval, risk-based) | Recall identification, patient contact, recall scheduling, recall documentation | Recall processed; recall scheduled |

### 9.2 Workflow Customization

Workflows may be customized through the workflow engine's configuration surface, subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The customization posture is a direct consequence of Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md`.

Customization examples include adding regional consent forms to the procedure workflows, adjusting the recall interval based on the patient population's risk profile, and adding customer-specific multi-visit procedure sequences to the multi-visit procedure sequence workflow. Each customization is applied as a facility-level or department-level override, with the underlying platform-provided workflow retained unchanged.

---

## 10. Specialty Data Models

### 10.1 Conceptual Entity Overview

The data entities referenced by the dental clinic type overlay are conceptual; this section describes the entities by name and relationship, not by implementation. Database schemas, persistence models, and data access patterns are out of scope for this document per the metadata table above and are addressed in module-specific documentation.

The dental overlay references the following conceptual entities: Patient, Encounter, Clinical Documentation Record, Odontogram Record, Periodontal Charting Record, Dental Image Record, Treatment Plan, Procedure Documentation Record, Dental Materials Usage Record, Implant Record, Dental Laboratory Prescription, Consent Record, Recall Record, and Appointment Record. Each entity is owned by a bounded context defined in Section 7 of `SYSTEM_ARCHITECTURE.md`; the dental overlay composes these entities into dental-specific workflows and documentation structures.

### 10.2 Entity Relationships

The Patient entity is the central reference: every other entity is associated with a Patient. The Encounter entity is associated with a Patient and with one or more Clinical Documentation Records, each of which may be a comprehensive oral evaluation, a periodic recall examination, or a procedure documentation record. The Odontogram Record and the Periodontal Charting Record are associated with an Encounter and with the patient's longitudinal dental record, supporting longitudinal comparison.

The Treatment Plan is associated with a Patient and is referenced by the Procedure Documentation Records for the procedures performed under the plan. The Dental Image Record is associated with a Patient, with an Encounter, with the imaging protocol used, and with the tooth or teeth imaged (for intraoral images). The Implant Record is associated with a Patient, with the Procedure Documentation Record for the placement procedure, and with the manufacturer's product catalogue entry. The Dental Materials Usage Record is associated with the Procedure Documentation Record and with the materials catalogue entry.

### 10.3 Longitudinal Records

Several dental entities are longitudinal rather than encounter-bound: the patient's odontogram history, the patient's periodontal charting history, the patient's image library, the patient's treatment plan history, and the patient's implant history. These longitudinal records are constructed from the encounter-bound records through the reporting module's longitudinal view capability. The longitudinal records support clinical decision-making by surfacing the patient's history in a unified view.

Longitudinal records are read-only; they are generated from the encounter-bound records and do not constitute a separate data entry surface. The encounter-bound records remain the authoritative source; the longitudinal view is a derived presentation. The longitudinal view is configured through the reporting module's standard configuration surface, with the configuration defining which entities are included, how they are presented, and what time period is covered.

---

## 11. Forms & Templates

### 11.1 Encounter Templates

The dental overlay ships encounter templates for the encounter types common in dental practice: comprehensive oral evaluation, periodic recall examination, dental prophylaxis, restorative procedure, endodontic procedure, prosthodontic procedure, oral surgery procedure, orthodontic adjustment, dental emergency, and telehealth consultation. Each template defines the documentation sections required, the structured fields included, the assessment instruments suggested, and the workflow steps associated with the encounter type. Templates are versioned alongside the overlay and are reviewed when the overlay is revised.

Encounter templates are configured through the clinical documentation module (M03) and are subject to the standard validation rules. Customers may refine templates through the configuration surface at the facility, department, or care-team layer, with refinements recorded as overrides on the platform-provided template. Customers may not modify the platform-provided template's underlying definition; this restriction preserves the overlay's coherence and is stated in Section 5.4 of `CLINIC_TYPES.md`.

### 11.2 Procedure Documentation Templates

Procedure documentation templates support the structured capture of procedural information, as described in Section 8.2 of this document. Each template is configured through the clinical documentation module and is subject to the standard validation, versioning, and audit rules. Templates are versioned alongside the overlay and are reviewed when the overlay is revised or when the underlying procedure code set is updated.

### 11.3 Consent Forms

Consent forms for dental practice are configured per regional regulatory framework, with the consent forms including the procedure description, the alternatives, the risks and benefits, the patient's acknowledgement, and the financial estimation (where applicable). The dental overlay ships consent form templates for the common dental procedures: restorative procedures, endodontic procedures, prosthodontic procedures, oral surgery procedures (including extraction and implant placement), orthodontic procedures, and dental sedation. The forms are configured through the patient module's consent management capability and are versioned alongside the regional configuration pack.

Consent forms are signed by the patient (or legal guardian for minor patients) and are recorded in the patient's consent record. The consent record is the basis for procedural authorisation: a procedure cannot be performed without the appropriate consent on file. For dental sedation, additional consent is required, with the consent including the sedation risks, the monitoring plan, and the recovery expectations.

### 11.4 Patient-Facing Materials

The dental overlay ships a library of patient-facing materials that the dental practitioner may provide to patients: procedure information sheets (for common dental procedures), diagnosis education sheets (for common dental diagnoses including caries, periodontal disease, and oral pathology), oral hygiene instruction sheets (for toothbrushing, flossing, and interdental cleaning), post-operative care instructions (procedure-specific), and dietary advice sheets (for caries prevention and erosion prevention). The materials are configured through the documents module (M07) and are versioned alongside the overlay. The materials are available in the languages supported by the customer's regional configuration pack; translation is performed through the localization module (M19).

---

## 12. Reports & Analytics

### 12.1 Clinical Outcome Reports

Clinical outcome reports support the dental practitioner's assessment of treatment outcomes and the patient's oral health trajectory. The dental overlay ships default clinical outcome reports including the oral health status report (presenting the patient's oral health status across encounters, including caries experience, periodontal status, and tooth loss), the treatment outcome report (presenting the outcome of procedures performed, including complications and longevity), the implant outcome report (implant survival, complications, and patient satisfaction), and the periodontal outcome report (presenting periodontal status across encounters). Each report is configured through the reporting module (M18) and is generated from the structured field values recorded during encounters.

Clinical outcome reports are typically accessed by the dental practitioner during clinical care and by the practice's quality improvement committee. Access is governed by the permission framework. Reports are generated on demand and on configured schedules.

### 12.2 Operational Reports

Operational reports support the practice's management and quality improvement activities. The dental overlay ships default operational reports including the appointment adherence report (no-show rate, cancellation rate, late arrival rate), the encounter volume report (encounters by type, by dental practitioner, by time period), the procedure volume report (procedures by type, by dental practitioner, by time period), the documentation completion report, the treatment plan completion report (treatment plans completed, partially completed, abandoned), and the recall adherence report (patients with overdue recall). Each report is configured through the reporting module and is generated from operational data.

Operational reports are typically accessed by practice administrators and clinical leads. Reports that include individual dental practitioner performance data are subject to additional access restrictions; access is logged in the audit trail. The reports support practice management decisions including staffing, scheduling, and quality improvement initiatives.

### 12.3 Regulatory Reports

Regulatory reports support the practice's compliance with regional regulatory requirements. The dental overlay ships default regulatory reports including the radiation safety report (radiographic examinations performed, with dose tracking where required), the dental materials report (materials usage with lot tracking, supporting product recall response), the dental sedation report (sedation procedures performed, with patient and procedural detail, where regional regulation requires), and the implant registry report (implants placed, with patient and procedural detail, where regional regulation requires). Each report is configured through the regional configuration pack and is updated when regional regulations change.

Regulatory reports are generated on the schedule required by regional regulation. Reports are submitted to the appropriate regulatory authority through the integration module (M17) where electronic submission is supported, or are exported in the format required for manual submission. Submission is recorded in the audit trail.

### 12.4 Quality Improvement Reports

Quality improvement reports support the practice's quality improvement activities. The dental overlay ships default quality improvement reports including the caries rate report (new caries by patient, by practitioner, by time period), the restoration longevity report (restoration survival over time, by material, by practitioner), the implant survival report (implant survival over time, by manufacturer, by practitioner), and the patient satisfaction report (where patient satisfaction is collected). Each report is configured through the reporting module and is generated from clinical and operational data.

Quality improvement reports are reviewed at configured intervals by the practice's quality improvement committee. The review is documented, and the resulting quality improvement actions are tracked through the platform's task management capability. Quality improvement reports are subject to the same access controls as other clinical documentation.

---

## 13. Role & Permission Recommendations

### 13.1 Specialty-Specific Roles

The Ibn Hayan dental overlay recommends the following role assignments for dental practice, building on the role catalogue defined in `USER_ROLES.md`.

| Role | Code | Specialty Application | Typical Permission Scope |
|---|---|---|---|
| Physician | R01 | Dentist | Full clinical access to own patient panel; procedure documentation; prescribing within dental scope |
| Physician | R01 | Dental specialist (orthodontist, oral surgeon, periodontist, prosthodontist, endodontist, paediatric dentist) | Full clinical access to own patient panel within specialty scope; specialty procedure documentation |
| Allied health professional | R05 | Dental hygienist | Clinical access to assigned patients; prophylaxis, periodontal charting, patient education within scope |
| Medical assistant | R04 | Dental assistant | Limited clinical access; chairside assistance, instrument preparation, patient preparation |
| Patient | R06 | Dental patient | Portal access to own record, appointments, treatment plan, post-operative instructions |
| Patient family / Caregiver | R07 | Family member or caregiver (typically for paediatric patients) | Limited portal access with patient authorization |
| Billing specialist | R08 | Dental billing specialist | Billing and claims access; no clinical access |
| Facility administrator | R09 | Practice administrator | Administrative access; no clinical access |
| Customer administrator | R10 | Customer system administrator | Configuration and user management; no clinical access |
| Auditor | R11 | Compliance auditor | Read-only access to audit trail and compliance reports |
| Support engineer | R12 | Implementation consultant | Configuration access during implementation; no production clinical access |

### 13.2 Permission Defaults

Permission defaults are configured to support the principle of least privilege. A dentist has full clinical access to their own patient panel, with access to other dentists' patients restricted to covering arrangements. A dental hygienist has clinical access to assigned patients, with access to prophylaxis and periodontal charting documentation but not to restorative or surgical procedure documentation. A dental assistant has limited access to patient information needed for chairside assistance, instrument preparation, and patient preparation.

Permission defaults are versioned alongside the customer's configuration and are subject to the standard validation rules. Defaults may be refined at the facility, department, care-team, or user layer, with refinements recorded as overrides. Access to clinical documentation is restricted to authorised personnel, with access logged in the audit trail. Dental sedation and general anaesthesia documentation is subject to additional access restrictions, with access restricted to practitioners with the appropriate credentials.

### 13.3 Covering Arrangement Permissions

Covering arrangements — where one dentist covers another's patients during absence — require temporary permission grants. The Ibn Hayan platform supports covering arrangements through the permission framework's time-bounded permission grant capability, with the grant configured with a start date, an end date, and the patient panel covered. The grant is recorded in the audit trail, with the granting user, the receiving user, the patient panel, and the time period documented.

Covering arrangement permissions are subject to additional verification: the receiving dentist must have the appropriate credentials for the procedures to be covered (general dentistry versus specialty procedures), the patient panel must be within the same customer and facility, and the consent on file must permit access by the covering dentist. Where consent does not permit access by the covering dentist, the covering arrangement is flagged for resolution before access is granted; in emergency situations, emergency access may be granted with the access documented for retrospective review.

---

## 14. Configuration Defaults

### 14.1 Encounter Configuration Defaults

The dental overlay ships encounter configuration defaults tuned to dental practice. Default appointment durations are 60 minutes for comprehensive oral evaluation, 30 minutes for periodic recall examination, 30 to 60 minutes for dental prophylaxis (varies by patient need), 30 to 90 minutes for restorative procedures (varies by procedure complexity), 60 to 120 minutes for endodontic procedures, 60 to 180 minutes for prosthodontic procedures, 30 to 120 minutes for oral surgery procedures, 30 minutes for orthodontic adjustment, 30 to 60 minutes for dental emergency, and 30 minutes for telehealth consultation. Default encounter templates are configured per encounter type. Default documentation completion expectation is set to within 24 hours of the encounter.

Encounter configuration defaults are starting points; customers may refine them through the configuration surface at the facility, department, or care-team layer. Refinements are subject to the standard validation rules and are recorded in the audit trail. Defaults are reviewed when the overlay is revised and are updated to reflect evolving practice patterns.

### 14.2 Documentation Configuration Defaults

Documentation configuration defaults include the structured field sets for each documentation template, the validation rules that govern documentation completion, and the longitudinal view configurations that present documentation across encounters. Default structured field sets include all fields required by the regional regulatory framework and the professional standard of care, with optional fields available for activation by the customer. Default validation rules require completion of mandatory sections before the encounter can be closed, with the mandatory sections configured per encounter type.

Documentation configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add fields through the configuration surface, with additions subject to the standard validation rules. Customers may not remove fields that are required by the regional regulatory framework; this restriction is enforced at the platform layer and is not customer-modifiable.

### 14.3 Charting Configuration Defaults

Charting configuration defaults include the tooth numbering system (universal or FDI, configured per regional configuration pack), the charting symbols and notations (described in Section 4.4), the periodontal charting parameters (probing depths, clinical attachment levels, bleeding on probing, recession, mobility), and the imaging integration configuration. Customers may refine the charting configuration through the configuration surface, with refinements recorded in the audit trail.

Charting configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. The tooth numbering system is configured through the regional configuration pack and is enforced at the platform layer; the customer cannot change the tooth numbering system below the regional regulatory minimum.

### 14.4 Reporting Configuration Defaults

Reporting configuration defaults include the default report set described in Section 12 of this document, with each report configured with the default parameters and the default delivery schedule. Customers may refine report parameters and schedules through the configuration surface, with refinements recorded in the audit trail. Reports are subject to the same access controls as other clinical documentation; access is governed by the permission framework and is logged in the audit trail.

---

## 15. Onboarding Checklist

### 15.1 Onboarding Workflow Stages

The onboarding workflow for dental follows the eight-stage process defined in Section 9 of `CLINIC_TYPES.md`, with stage durations scaled to the overlay's configuration complexity. The indicative onboarding timeline is 3–4 weeks for a typical dental practice, with longer timelines for hospital-based departments and for customers transitioning from paper-based or basic electronic systems.

| Stage | Code | Activity | Owner | Indicative Duration |
|---|---|---|---|---|
| Clinic type selection | O1 | Confirm dental clinic type at facility | Customer administrator | 1 day |
| Overlay activation | O2 | Apply dental overlay to facility configuration | Customer administrator | 1 day |
| Module enablement | O3 | Enable core modules; configure imaging integration; configure materials inventory | Customer administrator | 2–3 days |
| Configuration refinement | O4 | Refine encounter templates, odontogram configuration, procedures library, role permissions | Customer administrator with clinical lead | 1–2 weeks |
| Validation | O5 | Sandbox testing with representative scenarios including charting, treatment planning, and procedure documentation | Customer clinical lead | 3–5 days |
| User provisioning | O6 | Provision users with dental-appropriate roles | Customer administrator | 2 days |
| Operational readiness | O7 | Operational readiness assessment; first encounter and first procedure targeted | Customer clinical lead with Ibn Hayan customer success | 2–3 days |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle updated | Customer administrator | 1 day |

### 15.2 Pre-Onboarding Preparation

Before onboarding begins, the customer should complete the following preparation activities: confirm facility licensing for dental practice, confirm regional regulatory framework applicability (including dental radiography regulations, dental materials regulations, and dental anaesthesia regulations), gather existing clinical documentation templates for review, gather existing odontogram and periodontal charting data for migration planning, gather existing dental imaging library for migration planning, identify the clinical lead who will validate the configuration, and confirm the patient population and anticipated encounter and procedural volume.

### 15.3 Onboarding Validation Activities

Onboarding validation activities include: configuration validation per Section 15.4 of `SYSTEM_ARCHITECTURE.md`; workflow validation through testing each configured workflow against representative scenarios (including charting, treatment planning, procedure documentation, and imaging integration); user acceptance testing through dental practitioners performing representative tasks in the sandbox (including charting, treatment planning, and procedure documentation); and operational readiness assessment through a structured review of the configuration against the customer's operational reality. Validation results are documented and are required for the go-live stage transition.

### 15.4 Post-Onboarding Activities

Post-onboarding activities include: ongoing configuration governance per the customer's configuration governance process; periodic review of operational reports and quality improvement reports; periodic review of regulatory reports and submission to regulatory authorities; imaging integration monitoring and maintenance; materials inventory management; procedures library maintenance; and participation in the platform's change-management process for overlay revisions and regional configuration pack updates (particularly the annual CDT code set update).

---

## 16. Sample Use Cases

### 16.1 Comprehensive Oral Evaluation and Treatment Planning

A new patient presents for a comprehensive oral evaluation. The patient is scheduled for a 60-minute comprehensive oral evaluation encounter. At check-in, the patient completes the consent forms (general dental treatment consent, radiography consent). The dental practitioner conducts the comprehensive examination, documenting the medical history, the dental history, the odontogram (with all teeth documented for status and existing restorations), the periodontal charting (with probing depths, clinical attachment levels, bleeding on probing, recession, mobility per tooth), the oral cancer screening, and the radiographic assessment (bitewings and panoramic radiograph). The diagnosis is documented, including caries on multiple teeth, generalized mild periodontitis, and a missing tooth with the patient interested in implant replacement. The treatment plan is documented, including phased treatment (phase 1: periodontal therapy and restorative; phase 2: implant placement and restoration), alternative treatment options (bridge versus implant for the missing tooth), and the financial estimation. The treatment plan is presented to the patient at a subsequent treatment planning consultation, with the patient's consent obtained for the chosen treatment.

### 16.2 Restorative Procedure with Materials Tracking

A patient returns for restoration of caries on tooth 30 (mandibular right first molar). The patient is scheduled for a 60-minute restorative procedure. The consent is verified, and the procedure is initiated. Local anaesthesia is administered and documented. The caries is removed, and the tooth is prepared for a composite restoration. The materials usage is documented: composite material (with shade, lot number, quantity), bonding agent (with lot number, quantity), anaesthetic agent (with concentration, lot number, quantity), and matrix system. The restoration is finished and polished, and the occlusion is checked. Post-operative instructions are provided, and the patient is dismissed. The materials usage is integrated with the inventory module, with the inventory balance updated for the materials used.

### 16.3 Multi-Visit Implant Placement and Restoration

A patient's treatment plan includes implant placement and restoration for a missing tooth 19 (mandibular left first molar). The treatment plan is sequenced with implant placement (visit 1), healing period (3 to 6 months), impression (visit 2), and crown delivery (visit 3). The implant placement procedure is performed, with the implant details (manufacturer, model, lot number, serial number, dimensions) documented in the implant record and the procedural documentation. The healing period is monitored at configured intervals. After the healing period, the impression is taken, with the dental laboratory prescription documented. The crown is fabricated by the dental laboratory, and the crown delivery procedure is performed, with the crown documented and the occlusion verified. The implant outcome is assessed at configured intervals (6 months, 12 months, annually thereafter), with the assessment documented in the patient's longitudinal implant record.

### 16.4 Periodontal Therapy and Maintenance

A patient presents with generalized moderate periodontitis. The treatment plan includes scaling and root planing (quadrant by quadrant, four visits), re-evaluation (one month after completion of scaling and root planing), and periodontal maintenance (at three-month intervals). The scaling and root planing procedures are performed, with the procedural documentation including the quadrant, the teeth treated, the anaesthesia, the instruments used, and the patient's tolerance. The re-evaluation is conducted, with the periodontal charting re-assessed and the treatment outcome evaluated. The periodontal maintenance procedures are performed at three-month intervals, with the periodontal status re-assessed at each maintenance visit and the maintenance interval adjusted based on the patient's periodontal stability.

### 16.5 Dental Emergency

A patient presents with acute dental pain. The patient is scheduled for a 30 to 60 minute dental emergency encounter. The assessment is conducted, with the history of the present condition, the clinical examination, and the radiographic assessment (periapical radiograph of the affected tooth). The diagnosis is documented (irreversible pulpitis with apical periodontitis, tooth 14). The intervention is initiated, with local anaesthesia administered, the caries removed, the access cavity prepared, the canal negotiated, and the emergency pulpectomy performed. The temporary restoration is placed, and post-operative instructions are provided. The patient is scheduled for definitive root canal therapy at a subsequent appointment, with the treatment plan updated to reflect the emergency treatment and the planned definitive treatment.

### 16.6 Recall Examination with Risk-Based Interval

A patient presents for a periodic recall examination. The patient is scheduled for a 30-minute periodic recall examination encounter. The examination is conducted, with the odontogram updated (one new caries identified on tooth 3), the periodontal charting updated (stable, no progression), the oral cancer screening (negative), and the radiographic assessment (bitewings due, performed). The treatment plan is updated to include restoration of the new caries. The recall interval is determined based on the patient's caries risk assessment and periodontal risk assessment, with the recall interval set at 6 months (moderate caries risk, stable periodontal status). The next recall is scheduled, with the recall record updated to reflect the determined interval and the rationale.

---

## 17. Best Practices

### 17.1 Configuration Governance Best Practices

Establish a configuration governance process before onboarding begins, defining who is authorized to make configuration changes, how changes are tested before production application, how changes are documented, and how changes are reviewed retrospectively. The Ibn Hayan platform provides the tools (configuration sandbox, configuration validation, configuration versioning, configuration audit) but does not impose the governance workflow; the customer is responsible for the workflow.

Review the configuration at configured intervals (typically quarterly for dental) and after any significant operational change (new dental practitioner joining, new procedure added, new equipment integrated, regulatory change including the annual CDT code set update). Document the review and the resulting actions, with the documentation preserved for audit. A configuration governance process that is documented and followed is the single most important determinant of a stable production configuration.

### 17.2 Documentation Discipline Best Practices

Complete documentation at the time of the encounter or procedure wherever possible. Documentation completed after the encounter is more prone to error and omission, and delayed documentation is a frequent source of compliance findings. The Ibn Hayan platform's documentation completion expectation (default 24 hours for dental) is a configuration that supports this practice, with the configuration enforced through the documentation completion report.

Use structured fields and graphical charting rather than free text wherever the documentation template provides structured fields or graphical charting. For dental specifically, the odontogram, the periodontal charting, and the procedure documentation must be captured as structured data to support the longitudinal analysis, the treatment planning, and the regulatory reporting that are central to dental practice. Free text remains valuable for the qualitative narrative that structured fields cannot capture, but the structured fields should be completed first.

### 17.3 Charting Best Practices

Complete the odontogram and periodontal charting during the examination encounter, with the charting serving as the basis for the diagnosis and the treatment plan. The Ibn Hayan platform's charting capability supports this practice, with the charting integrated with the treatment planning workflow. Re-chart the patient at each recall examination, with the re-charting supporting the assessment of changes since the previous examination.

Use the tooth numbering system configured for the regional regulatory framework, with the tooth numbering system enforced at the platform layer. Do not deviate from the configured tooth numbering system; deviation undermines the consistency of the charting and the longitudinal comparison. Train all clinical staff on the configured tooth numbering system, with the training documented for audit.

### 17.4 Imaging Best Practices

Configure imaging integration with the involvement of the imaging equipment vendor and the customer's information technology team. The integration is performed through anticorruption layer connectors that translate the equipment's proprietary output format into Ibn Hayan's standard data model, and the connector configuration requires knowledge of the equipment's output format. Test the integration thoroughly before production application, with the testing including data accuracy verification and workflow integration verification.

Maintain the imaging integration through the equipment's lifecycle, with the integration reviewed when the equipment is serviced, when the equipment's software is updated, and when Ibn Hayan's integration module is updated. Document the integration configuration, with the documentation preserved for audit and for troubleshooting. Integration failures are inevitable over a long enough timeframe; the documentation supports rapid resolution when failures occur.

### 17.5 Materials Inventory Best Practices

Capture materials usage at the time of the procedure, with the usage captured from the materials packaging and recorded in the materials usage record. Materials tracking supports the practice's inventory management and supports product recall response. The Ibn Hayan platform's materials tracking capability supports this practice, with the tracking integrated with the procedural documentation workflow.

Maintain the materials inventory through the inventory lifecycle, with the inventory reviewed at configured intervals for reordering, for expiry management, and for lot tracking accuracy. Document the inventory management, with the documentation preserved for audit. Product recall notifications are received through the integration module (where electronic recall notification is supported) or through manual entry, with the recall matched to the patient's materials usage records and the affected patient contacted. Document the recall response, with the documentation preserved for audit.

### 17.6 Treatment Planning Best Practices

Document the treatment plan with the procedure sequencing, the alternative treatment options, and the financial estimation, with the treatment plan presented to the patient during a treatment planning consultation. The Ibn Hayan platform's treatment planning capability supports this practice, with the treatment plan configured as a structured data entity that supports procedure sequencing and alternative documentation.

Review the treatment plan at configured intervals or when triggered by clinical findings, with the review documented in the patient's record and the revised plan versioned alongside the previous version. Treatment plan review supports the dental practitioner's accountability for the treatment delivered and supports the patient's understanding of the treatment trajectory. The Ibn Hayan platform's treatment plan review workflow supports this practice.

### 17.7 Reporting and Analytics Best Practices

Review clinical outcome reports at configured intervals and use the reports to inform treatment decisions. The oral health status report, the treatment outcome report, and the periodontal outcome report support clinical decision-making by surfacing trends that may not be apparent in individual encounter documentation. The Ibn Hayan platform's reporting capability supports this practice.

Review operational reports at configured intervals and use the reports to inform practice management decisions. The appointment adherence report, the procedure volume report, the documentation completion report, and the recall adherence report surface operational patterns that may not be apparent from day-to-day practice. Address the patterns identified through the reports, with the actions documented and the effects monitored through subsequent reports.

### 17.8 Onboarding Best Practices

Engage Ibn Hayan customer success or implementation consulting for configuration review during onboarding. The dental overlay's configuration complexity warrants configuration review by an experienced implementer, particularly for the imaging integration, materials inventory, and procedures library components. The cost of the review is modest compared to the cost of rework after go-live.

Train all users before go-live, with the training tailored to each user's role. Charting training should include hands-on practice with the odontogram and periodontal charting. Procedure documentation training should include hands-on practice with the procedure documentation templates. Conduct training in the sandbox to avoid affecting production data. Document the training, with the documentation preserved for audit.

### 17.9 Change Management Best Practices

Adopt overlay revisions on a planned schedule rather than reactively, with particular attention to the annual CDT code set update. The CDT update is communicated in advance of the calendar year, with the update tested in the sandbox before production application. Plan the update during a period of lower operational tempo (typically late December for US practices), with the update applied before the first patient encounter of the new calendar year.

Participate in the platform's change-management process by providing feedback on overlay revisions and by participating in pilot engagements for new overlay capabilities. Customer participation is the basis of the platform's validated-practice posture stated in Principle P8 (Verified Practice Over Hypothetical Capability) in Section 4.9 of `SYSTEM_ARCHITECTURE.md`.

### 17.10 Recall Management Best Practices

Configure recall intervals based on the patient's oral health risk assessment, with the recall interval varying by caries risk, periodontal risk, and other risk factors. The Ibn Hayan platform's recall management capability supports this practice, with the recall interval configured through the patient module's risk assessment capability.

Monitor recall adherence and address non-adherence promptly. Recall non-adherence is a patient safety risk, with missed recalls potentially delaying detection of new caries, periodontal disease progression, or oral pathology. The Ibn Hayan platform's recall adherence report supports this practice, with the report surfacing patients with overdue recall for follow-up. Document the follow-up, with the documentation preserved for audit.

---

## 18. Related Documents

### 18.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines the clinic type configuration overlay approach; Section 16 (Editions) defines the edition packaging; Section 19 (Product Modules Overview) defines the module catalogue; Section 22 (Configuration-Driven Philosophy) governs customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the platform's behaviour; Section 12 (Clinic Hierarchy) defines the clinic type overlay layer; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 5 documents the configuration overlay approach; Section 8 documents customization boundaries; Section 11.1 references dental as a candidate for catalogue expansion |

### 18.2 Downstream and Sibling Documents

The following downstream and sibling documents elaborate aspects of dental referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and dependencies |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue and permission scope defaults |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework and access control rules |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine and workflow configuration |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per clinic type |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging and module enablement |
| Patient Module | `docs/07_MODULES/PATIENT.md` | Patient registration, consent management |
| Encounter Module | `docs/07_MODULES/ENCOUNTER.md` | Encounter management, dental encounters |
| Clinical Documentation Module | `docs/07_MODULES/CLINICAL_DOCUMENTATION.md` | Documentation templates, odontogram, periodontal charting |
| Documents Module | `docs/07_MODULES/DOCUMENTS.md` | Dental imaging storage, patient-facing materials |
| Inventory Module | `docs/07_MODULES/INVENTORY.md` | Dental materials inventory, implant tracking |
| Otolaryngology Clinic Type | `docs/06_CLINIC_TYPES/ENT.md` | Sibling specialty for orofacial conditions overlapping dental scope |
| Oncology Clinic Type | `docs/06_CLINIC_TYPES/ONCOLOGY.md` | Sibling specialty for oral cancer coordination |

### 18.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Overlay revisions and regional configuration pack updates are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
