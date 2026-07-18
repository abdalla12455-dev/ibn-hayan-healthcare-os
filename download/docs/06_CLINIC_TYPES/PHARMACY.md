# Ibn Hayan Healthcare Operating System — Pharmacy Clinic Type (C23)

| Field | Value |
|---|---|
| Document Title | Pharmacy Clinic Type Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the pharmacy configuration overlay is amended or when regional controlled substance or pharmacy practice regulations change |
| Audience | Clinical informatics leads, implementation consultants, customer success teams, configuration architects, pharmacists, pharmacy technicians, pharmacy chain administrators, compliance officers evaluating Ibn Hayan for pharmacy practice |
| Scope | Pharmacy clinic type (C23) configuration overlay, recommended module composition, specialty-specific capabilities (medication catalogue, prescription management, dispensing workflow, drug interaction checking, controlled substance dispensing, inventory management, compounding documentation, patient counselling, third-party billing), specialty workflows, conceptual data entities, forms and templates, reports and analytics, integrations, role and permission defaults, configuration defaults, onboarding checklist, sample use cases, best practices |
| Out of Scope | Implementation details, source code, encounter template internals, order set definitions, individual configuration key documentation, per-clinic-type operational runbooks, database schemas, API endpoint specifications, UI component catalogues, vendor-specific pharmacy automation equipment contracts, country-specific legal interpretation of pharmacy practice acts |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the pharmacy entry in the clinic type catalogue and does not override the catalogue entry or the platform-level principles. |
| Amendment Mechanism | Product Council ratification through a documented change record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Medication Catalog
5. Prescription Management
6. Dispensing Workflow
7. Drug Interaction Checking
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

Pharmacy is the healthcare specialty concerned with the safe and effective use of medications. Pharmacists are medication experts who dispense medications, counsel patients on medication use, monitor medication therapy for safety and efficacy, and provide medication-related clinical services. The scope of practice spans community pharmacy (retail pharmacy serving ambulatory patients), hospital pharmacy (inpatient pharmacy serving hospitalised patients), clinical pharmacy (pharmacists working collaboratively with physicians to optimise medication therapy), and specialised pharmacy services (oncology pharmacy, psychiatric pharmacy, paediatric pharmacy, geriatric pharmacy, compounding pharmacy). In Ibn Hayan, pharmacy is catalogued as clinic type C23 within the diagnostic and pharmacy specialty family, per Section 18.2 of `PRODUCT_BIBLE.md` and Section 3.5 of `CLINIC_TYPES.md`. The pharmacy clinic type is distinct from the pharmacy module (M05): the module provides the medication management capability across all clinic types, while the clinic type provides the configuration overlay for facilities that operate as pharmacies.

The pharmacy clinic type overlay reflects the operational reality of pharmacy practice. Pharmacies are high-volume, transaction-intensive environments where accuracy is paramount (medication errors can cause patient harm) and where regulatory compliance is non-negotiable (controlled substance dispensing, prescription monitoring programme reporting, inventory tracking). The overlay configures Ibn Hayan's platform-default behaviour to match this operational reality, with pharmacy-specific encounter templates, dispensing workflows, inventory configurations, and reporting views.

### 1.2 Patient Population and Clinical Activities

The pharmacy patient population is broad, encompassing any patient who receives medication therapy. Community pharmacies serve ambulatory patients with prescriptions from any prescriber; hospital pharmacies serve hospitalised patients with medications ordered by hospital clinicians; clinical pharmacy services serve patients within the scope of the collaborating physician's practice. The overlay accommodates this breadth through encounter templates that adjust to the patient and the dispensing context.

Key clinical activities in pharmacy include prescription intake and verification (reviewing the prescription for completeness, validity, and clinical appropriateness), dispensing preparation (selecting the medication, counting or measuring, labelling), dispensing verification (verifying the dispensed medication against the prescription), patient counselling (providing medication information and answering patient questions), inventory management (ordering, receiving, storing, rotating stock), controlled substance dispensing (with regulatory-required documentation and reporting), compounding (preparing customised medications), and clinical pharmacy services (medication therapy management, drug therapy reviews). Each of these activities is supported by configuration in the pharmacy overlay.

### 1.3 Why Pharmacy Requires Specialized Configuration

Pharmacy presents configuration considerations that distinguish it from other clinic types. Medication safety is paramount, with drug-drug interaction checking, drug-allergy checking, dose range checking, and duplicate therapy checking performed at prescription verification and dispensing. The configuration must support these safety checks as configured clinical decision support, with the checks enforced at the appropriate points in the workflow and the overrides documented for audit. The Ibn Hayan platform's clinical decision support capability supports this practice, with the checks configured through the pharmacy module's (M05) clinical decision support surface.

Controlled substance dispensing is governed by strict regulatory requirements that vary by region. The configuration must support controlled substance tracking with the regulatory-required fields (prescriber, patient, medication, quantity, days' supply, dispensing date, dispensing pharmacist), with the tracking enforced at the platform layer and the tracking supporting regulatory reporting (prescription monitoring programmes, controlled substance registries). The tracking is a platform-level invariant per Section 8.3 of `CLINIC_TYPES.md`; the customer cannot disable the tracking.

Inventory management is a defining operational reality for pharmacy, with medications tracked at the lot and expiry level, with first-expired-first-out (FEFO) rotation enforced, and with inventory balances updated in real time as medications are dispensed. The configuration must support this inventory management as a first-class capability, with the inventory supporting the dispensing workflow and supporting regulatory reporting.

### 1.4 Relationship to Other Clinic Types

Pharmacy operates in relationship to several other clinic types. Within the diagnostic and pharmacy family, pharmacy (C23) shares configuration themes with laboratory (C24) and imaging centre (C25): result production, integration with ordering clinicians, regulatory reporting. Pharmacy also coordinates with primary care (C01–C04) and the medical and surgical specialties (C05–C17) for prescription fulfilment, with oncology (C11) for chemotherapy compounding and dispensing, with psychiatry (C15) for psychotropic medication dispensing, with hospital (C21) for inpatient pharmacy services, and with long-term care facility (C30) for residential medication management. The overlay includes integration surfaces that support this coordination without requiring operational coupling between clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes and Ownership

Pharmacy is practised across a range of facility sizes, from solo community pharmacies through chain pharmacy locations, hospital pharmacies, and centralised pharmacy services for pharmacy benefit managers. The recommended editions for pharmacy in Section 2.1 of `CLINIC_TYPES.md` span Essential (E1) for a small independent pharmacy, Professional (E2) for a mid-sized pharmacy or a chain pharmacy location, and Enterprise (E3) for a regional pharmacy network or a hospital pharmacy. The edition recommendation reflects the facility size, the configuration depth required, and the integration complexity.

Ownership patterns in pharmacy include independent pharmacy (single owner, single location), pharmacy chain (multi-location under shared ownership), hospital-employed pharmacy (within a hospital tenant), pharmacy benefit manager pharmacy (centralised mail-order or specialty pharmacy), and government-operated pharmacy services. The clinic type overlay is ownership-agnostic; it provides the configuration surface that any ownership model requires, with ownership-specific concerns (such as billing rules, regulatory reporting, and contractual obligations) configured at the facility or customer layer per the configuration layer model in Section 15.3 of `SYSTEM_ARCHITECTURE.md`.

### 2.2 Geographic and Regulatory Considerations

Pharmacy is practised in every region Ibn Hayan serves, and the regulatory environment for pharmacy is among the most heavily regulated of healthcare specialties. The overlay accommodates this variation through the platform's localization module (M19), with regional configuration packs that adapt controlled substance schedules (which medications are controlled and at what schedule), prescription monitoring programme reporting (format, frequency, data elements), pharmacy practice acts (scope of practice for pharmacists and pharmacy technicians, dispensing limits, refill rules), and pharmacy labelling requirements. The configuration packs are versioned alongside the platform's regional regulatory framework and are updated when regional regulations change.

Geographic considerations also include mail-order pharmacy and specialty pharmacy, where the pharmacy serves patients across a wide geographic area. The overlay supports mail-order and specialty pharmacy through the encounter template configuration, with the dispensing workflow adapted to the mail-order context (prescription intake by mail or electronic transmission, dispensing preparation in a centralised facility, shipping to the patient, follow-up by phone or telehealth). Telehealth patient counselling is supported through the telehealth encounter template.

### 2.3 Regulatory Exposure

The regulatory exposure for pharmacy is rated high in Section 2.1 of `CLINIC_TYPES.md`, reflecting controlled substance dispensing, prescription monitoring programme reporting, pharmacy inventory regulation, and the standard regulatory requirements for healthcare practice. The overlay addresses each regulatory dimension through configuration: controlled substance dispensing is documented through structured dispensing records with the regulatory-required fields; prescription monitoring programme reporting is supported through the reporting module (M18) with reporting configured per regional regulatory framework; pharmacy inventory is managed through the inventory module (M07) with lot and expiry tracking enforced at the platform layer.

Regulatory exposure is heightened for pharmacies that compound medications (sterile compounding, non-sterile compounding, hazardous drug compounding), with additional regulatory requirements for the compounding facility, the compounding process documentation, and the compounding quality assurance. The overlay accommodates these requirements through specialty-specific compounding documentation templates and quality assurance configurations, with the templates configured through the clinical documentation module (M03). The regional configuration pack addresses the regional regulatory framework for compounding, with the configuration enforced at the platform layer where regional regulation requires it.

### 2.4 Customer Maturity Profile

Pharmacy customers vary in maturity. Established pharmacies with mature pharmacy management systems configure Ibn Hayan to match their existing operational patterns; transitioning customers from paper-based or basic electronic systems require more onboarding support. Pharmacies with established medication catalogue and inventory data may require data migration support to incorporate existing data into Ibn Hayan. The onboarding workflow in Section 9 of `CLINIC_TYPES.md` scales stage duration and complexity to the customer's maturity profile and the overlay's medium configuration complexity.

---

## 3. Recommended Modules

### 3.1 Core Module Composition

The recommended module composition for pharmacy follows the diagnostic and pharmacy family pattern stated in Section 6.2 of `CLINIC_TYPES.md`, with the pharmacy module (M05) as the central module. The table below summarizes the recommended modules; module codes are defined in Section 19.2 of `PRODUCT_BIBLE.md`.

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Core | Patient registration, demographics, medication allergy and adverse drug reaction history |
| Encounter | M02 | Core | Dispensing encounters, patient counselling encounters, clinical pharmacy encounters |
| Clinical Documentation | M03 | Limited | Documentation of pharmacy clinical services (medication therapy management); not full clinical documentation |
| Orders & Results | M04 | Core | Prescription intake, prescription verification, prescription monitoring programme queries |
| Pharmacy | M05 | Core | Medication catalogue, dispensing workflow, drug interaction checking, controlled substance tracking, inventory |
| Scheduling | M06 | Core | Patient counselling scheduling, clinical pharmacy appointment scheduling |
| Documents | M07 | Core | Prescription documents, medication information sheets, patient counselling documentation |
| Notifications | M08 | Core | Prescription ready notifications, refill reminders, medication monitoring reminders |
| Billing | M09 | Core | Third-party billing (insurance adjudication), patient co-payment management |
| Accounting | M10 | Optional | General ledger for independent pharmacies with their own accounting |
| CRM | M11 | Optional | Patient outreach, refill recall management |
| HR | M12 | Optional | Employee management for pharmacies with multiple pharmacists and technicians |
| Workforce | M13 | Optional | Scheduling of pharmacy staff, credentialing for pharmacist licensure |
| Identity & Access | M14 | Core | Authentication, role-based access including controlled substance access control |
| Configuration | M15 | Core | Configuration surface for overlay refinement |
| Audit | M16 | Core | Audit trail for dispensing and clinical actions |
| Integration | M17 | Optional | Integration with prescription monitoring programmes, insurance adjudication systems, pharmacy automation equipment |
| Reporting | M18 | Core | Operational reporting, regulatory reporting, clinical pharmacy outcome reporting |
| Localization | M19 | Core | Regional regulatory framework, medication coding system adaptation (RxNorm, regional drug codes) |

### 3.2 Module Activation Considerations

The core module set is recommended for every pharmacy deployment; the optional modules are added based on the customer's operational reality. A small independent pharmacy may decline M10 (Accounting) and M11 (CRM); a chain pharmacy location typically operates within the chain's broader module set; a hospital pharmacy typically operates within the hospital's broader module set, which includes all 19 modules. Module enablement is governed by the dependency rules in Section 9.4 of `SYSTEM_ARCHITECTURE.md`.

The integration module (M17) is particularly relevant for pharmacy given the specialty's reliance on external systems: prescription monitoring programmes (for controlled substance dispensing verification), insurance adjudication systems (for real-time claim adjudication), pharmacy automation equipment (for dispensing robots, automated counting machines, packaging systems), and electronic prescription systems (for prescription intake). The integration is performed through anticorruption layer connectors described in Section 7.3 of `SYSTEM_ARCHITECTURE.md`.

### 3.3 Edition Packaging

The recommended editions for pharmacy span the full edition range, reflecting the diversity of pharmacy facility sizes. Essential (E1) is recommended for small independent pharmacies; Professional (E2) for mid-sized pharmacies and chain pharmacy locations; Enterprise (E3) for regional pharmacy networks, hospital pharmacies, and specialty pharmacies. Edition packaging is governed by Section 16 of `PRODUCT_BIBLE.md`.

---

## 4. Medication Catalog

### 4.1 Catalog Structure

The medication catalogue is the curated list of medications that the pharmacy dispenses, organized by therapeutic class, by medication name (generic and brand), by strength, by form, and by route. Each medication entry includes the standard medication attributes (generic name, brand name, strength, form, route, manufacturer, national drug code) and pharmacy-specific attributes (controlled substance schedule, storage requirements, refrigeration requirements, hazardous drug status, lot and expiry tracking requirement). The catalogue is configured through the pharmacy module (M05) and is versioned alongside the overlay.

The medication catalogue is maintained by the platform and is updated when new medications are approved, when existing medications are revised (new strengths, new indications, labelling changes), and when medications are discontinued. Updates are versioned and communicated to affected customers through the change-management channel. Customers may add customer-specific medications (e.g., compounded preparations) through the configuration surface, with additions subject to the standard validation rules and recorded in the audit trail. Customer-specific medications do not replace platform catalogue entries; they supplement them.

### 4.2 Therapeutic Classification

The medication catalogue is organised by therapeutic classification, supporting the pharmacy's medication management and supporting clinical decision support. The overlay supports standard therapeutic classification systems (ATC, USP Drug Information classification), with the classification system configured through the regional configuration pack. The classification supports the pharmacy's formulary management (with medications organised by therapeutic class for formulary review), the pharmacy's inventory management (with medications organised by therapeutic class for stock rotation), and the clinical decision support (with therapeutic class supporting drug-drug interaction checking and duplicate therapy checking).

Therapeutic classification is also the basis for medication therapy reporting, with the reporting module (M18) supporting reports by therapeutic class (e.g., dispensing volume by therapeutic class, controlled substance dispensing by therapeutic class, adverse drug reaction reports by therapeutic class). The reporting supports the pharmacy's quality improvement and supports regulatory reporting where regional regulation requires therapeutic class-specific reporting.

### 4.3 Allergy and Adverse Drug Reaction Documentation

Allergy and adverse drug reaction documentation is integral to medication safety, with the patient's allergy and adverse drug reaction history documented and used for drug-allergy checking at prescription verification and dispensing. The Ibn Hayan pharmacy overlay supports allergy and adverse drug reaction documentation through the patient module's (M01) structured allergy and adverse drug reaction capability, with each entry including the allergen, the reaction type, the reaction severity, the reaction date, and the documentation source.

Allergy and adverse drug reaction documentation is integrated with the dispensing workflow, with the dispensing verification step including drug-allergy checking against the patient's documented allergies and adverse drug reactions. The checking is configured clinical decision support, with the checking producing alerts that the pharmacist must address (dispense, dispense with counselling, refuse with documentation, contact prescriber) before the dispensing is completed. The checking is configured through the pharmacy module's clinical decision support surface.

### 4.4 Formulary Management

Formulary management is the pharmacy's process for managing the medications it stocks and dispenses, with the formulary reflecting the pharmacy's patient population, the regional regulatory framework, and the pharmacy's commercial relationships (e.g., preferred generics, insurance formulary alignment). The overlay supports formulary management through the medication catalogue's formulary status attribute, with each medication marked as on-formulary, off-formulary, or restricted (with the restriction rationale documented). The formulary status supports the dispensing workflow (with off-formulary medications triggering formulary review or substitution suggestion) and supports inventory management (with formulary status supporting stock decisions).

Formulary management is integrated with the insurance adjudication workflow, with the formulary aligned with the insurance formularies that the pharmacy accepts. The integration supports the dispensing workflow by surfacing formulary issues at prescription verification, allowing the pharmacist to address the issue (substitute with formulary medication, contact prescriber for formulary alternative, or bill the patient for the non-formulary medication) before the dispensing is completed. The integration is configured through the billing module's (M09) standard configuration surface.

---

## 5. Prescription Management

### 5.1 Prescription Intake

Prescription intake is the process of receiving the prescription from the prescriber, with prescriptions received through electronic prescribing, paper prescription, fax, or phone (with phone prescriptions requiring written confirmation per regional regulatory framework). The Ibn Hayan pharmacy overlay supports prescription intake through the orders and results module (M04), with each prescription recorded as a structured order that includes the prescriber, the patient, the medication, the strength, the form, the route, the dosage instructions, the quantity, the refills, and the prescription date.

Prescription intake is encounter-aware: electronic prescriptions are received automatically through the integration module (M17) and are queued for pharmacist verification; paper prescriptions are entered manually by pharmacy staff and are queued for pharmacist verification. The intake workflow includes prescription validation (verifying the prescription's completeness, the prescriber's credentials, the patient's identity, and the prescription's authenticity) before the prescription is queued for verification. The validation is configured through the workflow engine's standard configuration surface, with the validation rules reflecting the regional regulatory framework.

### 5.2 Prescription Verification

Prescription verification is the pharmacist's review of the prescription for clinical appropriateness, with the verification including the medication's appropriateness for the patient's condition, the dose's appropriateness for the patient's age and renal function, the absence of drug-drug interactions, the absence of drug-allergy contraindications, and the absence of duplicate therapy. The overlay supports prescription verification through the pharmacy module's (M05) verification capability, with the verification supported by clinical decision support that surfaces potential issues for the pharmacist's consideration.

Prescription verification is the central clinical activity of pharmacy practice, and the configuration must support it as such. The verification workflow includes the structured documentation of the pharmacist's verification decision (verified, verified with intervention, refused with rationale, prescriber contacted), with the decision and the rationale documented in the patient's medication record. The verification is auditable; the verification is associated with the pharmacist who performed the verification, with the time of verification recorded. The verification is versioned; corrections are recorded as new versions with the original retained for audit.

### 5.3 Refill Management

Refill management is the process of managing prescription refills, with refills initiated by the patient, by the pharmacist (when the patient's supply is running low), or by the prescriber (through a refill authorisation). The overlay supports refill management through the orders and results module's refill capability, with each refill recorded as a structured event that includes the original prescription, the refill number, the dispensing date, and the remaining refills. The refill management is integrated with the dispensing workflow, with the refill triggering the dispensing workflow for the refilled medication.

Refill management is subject to regional regulatory limits, with controlled substance refills restricted by schedule (e.g., Schedule II controlled substances typically cannot be refilled; Schedule III and IV controlled substances have refill limits). The overlay's regional configuration pack addresses the regional refill limits, with the limits enforced at the platform layer. The customer cannot override the regional regulatory limits; the limits are a platform-level invariant per Section 8.3 of `CLINIC_TYPES.md`.

### 5.4 Prescription Transfer

Prescription transfer is the process of transferring a prescription from one pharmacy to another, with transfers initiated by the patient (who wishes to use a different pharmacy) or by the pharmacy (in coordination with the patient). The overlay supports prescription transfer through the integration module (M17), with the transfer including the original prescription, the dispensing history, and the remaining refills. The transfer is documented in both the transferring pharmacy's and the receiving pharmacy's records, with the transfer recorded in the audit trail.

Prescription transfer is subject to regional regulatory requirements, with the transfer documentation including the transferring pharmacist, the receiving pharmacist, the transfer date, and the prescription details. The overlay's regional configuration pack addresses the regional transfer requirements, with the requirements enforced at the platform layer. Controlled substance prescription transfers are subject to additional restrictions, with the restrictions varying by schedule and by regional regulation.

---

## 6. Dispensing Workflow

### 6.1 Dispensing Process

The dispensing process is the structured sequence of activities through which a medication is prepared for the patient, with the activities including medication selection (from inventory), medication preparation (counting, measuring, compounding where applicable), medication labelling (with the patient-specific label and the auxiliary labels), and dispensing verification (verifying the dispensed medication against the prescription). The Ibn Hayan pharmacy overlay ships a dispensing workflow that supports the standard sequence, with the workflow configured through the workflow engine described in Section 16 of `SYSTEM_ARCHITECTURE.md`.

The dispensing workflow is encounter-type-aware: the standard dispensing workflow is appropriate for most prescriptions; the controlled substance dispensing workflow adds the regulatory-required documentation and the prescription monitoring programme query; the compounding dispensing workflow adds the compounding documentation and the quality assurance verification. The workflow selection is automated based on the medication's attributes (controlled substance schedule, compounding requirement), with the workflow applying the appropriate additional steps.

### 6.2 Dispensing Verification

Dispensing verification is the pharmacist's final check of the dispensed medication before the medication is released to the patient, with the verification confirming that the dispensed medication matches the prescription in medication, strength, form, quantity, and labelling. The overlay supports dispensing verification through the pharmacy module's verification capability, with the verification documented as a structured event that includes the medication, the prescription, the dispensing pharmacist, and the verification time. The verification is auditable, with the verification recorded in the audit trail per Principle P13 (Auditability as Primitive) stated in Section 4.13 of `SYSTEM_ARCHITECTURE.md.

Dispensing verification is the final safety check before the medication reaches the patient, and the configuration must support it as such. The verification workflow includes the structured documentation of the pharmacist's verification decision (verified, verified with correction, refused with rationale), with the decision documented in the dispensing record. Where the verification identifies an error (wrong medication, wrong strength, wrong quantity), the error is documented and the dispensing is re-prepared, with the error and the correction recorded in the audit trail for quality improvement analysis.

### 6.3 Patient Counselling

Patient counselling is the pharmacist's communication with the patient about the dispensed medication, with the counselling including the medication's purpose, the dosage instructions, the common side effects, the precautions, and the patient's questions. The overlay supports patient counselling through the encounter module's (M02) counselling encounter capability, with the counselling documented as a structured encounter that includes the medication, the counselling content, the patient's understanding, and the counselling pharmacist. The counselling is offered for every new prescription, with the patient's acceptance or refusal documented per regional regulatory framework.

Patient counselling is integrated with the dispensing workflow, with the counselling offered at dispensing completion. The integration is configured through the workflow engine's standard configuration surface, with the integration respecting the boundaries between the pharmacy module and the encounter module. The counselling is auditable; the counselling is associated with the pharmacist who performed the counselling, with the time of counselling recorded.

### 6.4 Labelling and Auxiliary Labels

Labelling is the preparation of the patient-specific medication label, with the label including the patient's name, the medication name, the strength, the form, the quantity, the dosage instructions, the prescriber, the dispensing date, the dispensing pharmacy, the expiration date, and the prescription number. The overlay supports labelling through the pharmacy module's labelling capability, with the label content configured per regional regulatory framework. The labelling is integrated with the dispensing workflow, with the label generated automatically when the dispensing is verified.

Auxiliary labels are additional labels that provide supplementary information, with auxiliary labels including "refrigerate," "shake well," "may cause drowsiness," "avoid sunlight," "take with food," and "do not drink alcohol." The overlay supports auxiliary labels through the pharmacy module's auxiliary label capability, with the auxiliary labels suggested based on the medication's attributes. The auxiliary labels are advisory; the pharmacist may add, remove, or modify the auxiliary labels based on clinical judgement, with the modifications documented in the dispensing record.

---

## 7. Drug Interaction Checking

### 7.1 Drug-Drug Interaction Checking

Drug-drug interaction checking is the clinical decision support that identifies potential interactions between the medication being dispensed and the other medications that the patient is taking. The Ibn Hayan pharmacy overlay supports drug-drug interaction checking through the pharmacy module's (M05) clinical decision support capability, with the checking performed at prescription verification and at dispensing verification. The checking draws on the patient's medication list, with the medication list maintained through the dispensing history (medications dispensed at this pharmacy) and through the integration module (medications dispensed at other pharmacies, where the patient's medication history is available through regional medication history services).

The checking produces alerts that are categorised by severity (contraindicated, major, moderate, minor), with the severity levels configured through the pharmacy module's clinical decision support surface. The alerts are presented to the pharmacist for consideration, with the pharmacist's response (dispense, dispense with counselling, contact prescriber, refuse with rationale) documented in the dispensing record. The checking is advisory; the pharmacist may override an alert with documented rationale, with the override recorded in the audit trail. The advisory posture respects the pharmacist's clinical judgement while ensuring that the pharmacist is informed of the interaction.

### 7.2 Drug-Allergy Checking

Drug-allergy checking is the clinical decision support that identifies potential allergic reactions between the medication being dispensed and the patient's documented allergies. The overlay supports drug-allergy checking through the pharmacy module's clinical decision support capability, with the checking performed at prescription verification and at dispensing verification. The checking draws on the patient's allergy and adverse drug reaction history, with the history documented through the patient module's (M01) structured allergy capability.

The checking produces alerts that are categorised by severity (severe contraindication, moderate caution, mild caution), with the severity levels reflecting the potential reaction severity. The alerts are presented to the pharmacist for consideration, with the pharmacist's response documented in the dispensing record. Allergy checking is enforced more strictly than drug-drug interaction checking, with severe contraindication alerts requiring prescriber contact before dispensing can proceed, in keeping with the patient safety emphasis of Principle P1 (Healthcare Safety Overrides All Others) stated in Section 4.2 of `SYSTEM_ARCHITECTURE.md`.

### 7.3 Dose Range Checking

Dose range checking is the clinical decision support that identifies potentially inappropriate doses, with the checking comparing the prescribed dose to the recommended dose range for the medication, the patient's age, and the patient's renal function (where documented). The overlay supports dose range checking through the pharmacy module's clinical decision support capability, with the checking performed at prescription verification. The checking produces alerts for doses that exceed the recommended range (with the alert severity reflecting the degree of excess) and for doses that are below the recommended range (which may indicate subtherapeutic dosing).

Dose range checking is advisory for most medications, with the pharmacist able to override the alert with documented rationale (e.g., the prescriber has documented the rationale for the non-standard dose, or the dose is appropriate for the patient's specific clinical situation). Dose range checking is enforced more strictly for high-risk medications (e.g., anticoagulants, insulin, opioids, chemotherapy), with the enforcement configured through the pharmacy module's clinical decision support surface and reflecting the regional regulatory framework.

### 7.4 Duplicate Therapy Checking

Duplicate therapy checking is the clinical decision support that identifies potential duplicate therapy, with the checking comparing the medication being dispensed to the patient's other medications to identify therapeutic duplication (same medication, same therapeutic class) or redundant therapy. The overlay supports duplicate therapy checking through the pharmacy module's clinical decision support capability, with the checking performed at prescription verification. The checking produces alerts for potential duplicate therapy, with the alerts presented to the pharmacist for consideration.

Duplicate therapy checking is advisory; the pharmacist may override the alert with documented rationale (e.g., the prescriber has documented the rationale for the duplicate therapy, or the medications are being taken at different times for different indications). The advisory posture respects the prescriber's clinical judgement while ensuring that the pharmacist is informed of the potential duplicate therapy. The checking is particularly valuable for patients who see multiple prescribers and who may receive duplicate prescriptions without the prescribers being aware of each other's prescriptions.

---

## 8. Specialty Workflows

### 8.1 Workflow Inventory

The Ibn Hayan pharmacy overlay ships a default set of workflows tuned to pharmacy practice. The workflows are defined declaratively through the workflow engine's configuration surface, as elaborated in `WORKFLOWS.md` Section 2.

| Workflow | Code | Trigger | Key Steps | Outcome |
|---|---|---|---|---|
| Standard dispensing | PHW1 | Prescription received | Prescription intake, prescription verification, dispensing preparation, dispensing verification, patient counselling, dispensing release | Dispensing documented; patient counselled |
| Controlled substance dispensing | PHW2 | Controlled substance prescription received | Prescription intake, prescription monitoring programme query, prescription verification, dispensing preparation, dispensing verification, patient counselling, dispensing release, regulatory reporting | Dispensing documented; regulatory reporting completed |
| Refill dispensing | PHW3 | Refill requested | Refill verification, dispensing preparation, dispensing verification, patient counselling (if requested), dispensing release | Refill documented; patient notified |
| Compounding dispensing | PHW4 | Compounding prescription received | Compounding formula retrieval, ingredient selection, compounding, quality assurance verification, dispensing verification, patient counselling, dispensing release | Compounding documented; quality assurance verified |
| Clinical pharmacy service | PHW5 | Clinical pharmacy appointment | Medication therapy review, drug therapy assessment, recommendations to prescriber, patient counselling, documentation | Clinical service documented; recommendations communicated |
| Prescription transfer | PHW6 | Transfer requested | Transfer authorisation, prescription and dispensing history retrieval, transfer to receiving pharmacy, documentation | Transfer documented; receiving pharmacy notified |
| Inventory reorder | PHW7 | Inventory threshold reached | Reorder identification, supplier selection, order placement, order receipt, lot and expiry recording, inventory balance update | Reorder documented; inventory updated |
| Adverse drug reaction documentation | PHW8 | Adverse drug reaction reported | Reaction documentation, severity assessment, prescriber notification, regulatory reporting (if required), patient record update | Reaction documented; reporting completed |

### 8.2 Workflow Customization

Workflows may be customized through the workflow engine's configuration surface, subject to the same validation, versioning, and audit rules as platform-provided workflows. Custom workflows that require behaviour outside the workflow engine's configuration surface are out of scope for customer-initiated adaptation and are referred to the platform evolution intake process. The customization posture is a direct consequence of Principle P2 (Configuration Before Customization) stated in Section 4.3 of `SYSTEM_ARCHITECTURE.md.

Customization examples include adding regional controlled substance dispensing forms to the controlled substance dispensing workflow, adjusting the inventory reorder thresholds based on the pharmacy's patient population, and adding customer-specific clinical pharmacy service protocols to the clinical pharmacy service workflow. Each customization is applied as a facility-level or department-level override, with the underlying platform-provided workflow retained unchanged.

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The data entities referenced by the pharmacy clinic type overlay are conceptual; this section describes the entities by name and relationship, not by implementation. Database schemas, persistence models, and data access patterns are out of scope for this document per the metadata table above and are addressed in module-specific documentation.

The pharmacy overlay references the following conceptual entities: Patient, Encounter, Prescription, Dispensing Record, Medication Catalogue Entry, Inventory Item, Inventory Lot, Controlled Substance Dispense Record, Compounding Record, Compounding Formula, Patient Counselling Record, Allergy and Adverse Drug Reaction Record, Insurance Claim, Prescription Transfer Record, and Audit Record. Each entity is owned by a bounded context defined in Section 7 of `SYSTEM_ARCHITECTURE.md`; the pharmacy overlay composes these entities into pharmacy-specific workflows and documentation structures.

### 9.2 Entity Relationships

The Patient entity is the central reference: every other entity is associated with a Patient. The Prescription entity is associated with a Patient, a Prescriber, and a Medication Catalogue Entry. The Dispensing Record is associated with a Prescription, a Patient, a Dispensing Pharmacist, and an Inventory Lot (the lot from which the medication was dispensed). The Controlled Substance Dispense Record extends the Dispensing Record with the regulatory-required fields and is associated with the Prescription Monitoring Programme submission.

The Inventory Item is associated with a Medication Catalogue Entry and is the parent of one or more Inventory Lots. Each Inventory Lot is associated with a Receipt (the inventory receipt that introduced the lot to the pharmacy), with the lot tracked through its lifecycle (receipt, storage, dispensing, expiry, disposal). The Compounding Record is associated with a Compounding Formula, the Ingredients (each an Inventory Lot), and the Compounding Pharmacist. The Insurance Claim is associated with a Dispensing Record and is submitted to the insurance payer through the integration module.

### 9.3 Longitudinal Records

Several pharmacy entities are longitudinal rather than encounter-bound: the patient's medication history (all prescriptions and dispensing events for the patient), the patient's allergy and adverse drug reaction history, the patient's controlled substance dispensing history, and the patient's insurance claim history. These longitudinal records are constructed from the encounter-bound records through the reporting module's longitudinal view capability. The longitudinal records support clinical decision-making by surfacing the patient's medication history in a unified view.

Longitudinal records are read-only; they are generated from the encounter-bound records and do not constitute a separate data entry surface. The encounter-bound records remain the authoritative source; the longitudinal view is a derived presentation. The longitudinal view is configured through the reporting module's standard configuration surface, with the configuration defining which entities are included, how they are presented, and what time period is covered. Longitudinal records are subject to data residency rules per Section 11.5 of `SYSTEM_ARCHITECTURE.md`.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

The pharmacy overlay ships encounter templates for the encounter types common in pharmacy practice: dispensing encounter, patient counselling encounter, clinical pharmacy encounter, compounding encounter, and telehealth counselling encounter. Each template defines the documentation sections required, the structured fields included, and the workflow steps associated with the encounter type. Templates are versioned alongside the overlay and are reviewed when the overlay is revised.

Encounter templates are configured through the encounter module (M02) and are subject to the standard validation rules. Customers may refine templates through the configuration surface at the facility, department, or care-team layer, with refinements recorded as overrides on the platform-provided template.

### 10.2 Dispensing Documentation Templates

Dispensing documentation templates support the structured capture of dispensing information. The pharmacy overlay ships templates for the dispensing types common in pharmacy practice: standard dispensing, controlled substance dispensing, compounding dispensing, and refill dispensing. Each template is configured through the pharmacy module (M05) and is subject to the standard validation, versioning, and audit rules.

| Template | Dispensing Type | Mandatory Sections | Configurable Fields |
|---|---|---|---|
| Standard dispensing | Standard | Prescription verification, dispensing preparation, dispensing verification, patient counselling | Counselling content, auxiliary labels |
| Controlled substance dispensing | Controlled substance | Prescription verification, prescription monitoring programme query, dispensing preparation, dispensing verification, patient counselling, regulatory reporting | Reporting format, regulatory fields |
| Compounding dispensing | Compounding | Compounding formula, ingredient selection, compounding, quality assurance verification, dispensing verification, patient counselling | Formula source, quality assurance protocol |
| Refill dispensing | Refill | Refill verification, dispensing preparation, dispensing verification, patient counselling (if requested) | Counselling trigger, refill source |

### 10.3 Patient Counselling Templates

Patient counselling templates support the structured documentation of patient counselling. The pharmacy overlay ships counselling templates for the common medication categories: new medication counselling (with structured fields for the medication's purpose, dosage instructions, common side effects, precautions, and patient questions), refill counselling (with structured fields for the medication's effectiveness, side effects, and adherence), and adverse drug reaction counselling (with structured fields for the reaction, the recommended action, and the follow-up). The templates are configured through the encounter module.

Patient counselling templates are integrated with the dispensing workflow, with the counselling offered at dispensing completion and the counselling documented in the dispensing record. The integration supports the pharmacy's compliance with regional regulatory requirements for patient counselling, with the counselling documentation providing the evidence of compliance.

### 10.4 Regulatory Forms

Regulatory forms are a distinct template category given the regulatory specificity required for pharmacy practice. The pharmacy overlay ships regulatory form templates for controlled substance dispensing (with the regulatory-required fields per regional regulatory framework), prescription monitoring programme reporting (with the reporting format per regional regulatory framework), pharmacy inventory reporting (where regional regulation requires), and adverse drug reaction reporting (where regional regulation requires reporting to regional pharmacovigilance systems). The forms are configured through the regional configuration pack and are versioned alongside the regional regulatory framework.

Regulatory forms are generated automatically through the dispensing workflow, with the forms populated from the dispensing record and submitted to the appropriate regulatory authority through the integration module (M17) where electronic submission is supported. Submission is recorded in the audit trail, with the submission time, the submitting user, and the form contents preserved.

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

Clinical outcome reports support the pharmacy's assessment of medication therapy outcomes and the patient's medication management. The pharmacy overlay ships default clinical outcome reports including the medication adherence report (percentage of patients with adequate adherence, by medication class), the adverse drug reaction report (adverse drug reactions by medication, by severity, by time period), the drug interaction alert report (alerts by severity, by medication, by resolution), and the clinical pharmacy service outcome report (clinical pharmacy interventions and their outcomes). Each report is configured through the reporting module (M18) and is generated from the structured field values recorded during dispensing and clinical pharmacy encounters.

Clinical outcome reports are typically accessed by the pharmacy's clinical pharmacist and by the pharmacy's quality improvement committee. Access is governed by the permission framework. Reports are generated on demand and on configured schedules.

### 11.2 Operational Reports

Operational reports support the pharmacy's management and quality improvement activities. The pharmacy overlay ships default operational reports including the dispensing volume report (dispensing events by medication class, by pharmacist, by time period), the prescription intake report (prescriptions by source — electronic, paper, fax, phone — by time period), the inventory turnover report (inventory turnover by medication class, by supplier), the expiry report (medications approaching expiry, by medication, by lot), and the insurance claim adjudication report (claims by payer, by status — approved, rejected, partially approved — by time period). Each report is configured through the reporting module and is generated from operational data.

Operational reports are typically accessed by pharmacy administrators and the pharmacist-in-charge. Reports that include individual pharmacist performance data are subject to additional access restrictions; access is logged in the audit trail. The reports support pharmacy management decisions including staffing, inventory management, and quality improvement initiatives.

### 11.3 Regulatory Reports

Regulatory reports support the pharmacy's compliance with regional regulatory requirements. The pharmacy overlay ships default regulatory reports including the controlled substance dispensing report (controlled substance dispensing events with the regulatory-required fields), the prescription monitoring programme report (submitted reports, with the submission time and confirmation), the pharmacy inventory report (where regional regulation requires periodic inventory reporting), and the adverse drug reaction report (adverse drug reactions reportable to regional pharmacovigilance systems). Each report is configured through the regional configuration pack and is updated when regional regulations change.

Regulatory reports are generated on the schedule required by regional regulation. Reports are submitted to the appropriate regulatory authority through the integration module (M17) where electronic submission is supported, or are exported in the format required for manual submission. Submission is recorded in the audit trail.

### 11.4 Quality Improvement Reports

Quality improvement reports support the pharmacy's quality improvement activities. The pharmacy overlay ships default quality improvement reports including the dispensing error report (errors by type, by pharmacist, by time period), the counselling compliance report (percentage of dispensing events with documented counselling offer), the clinical pharmacy intervention report (interventions by type, by outcome), and the patient satisfaction report (where patient satisfaction is collected). Each report is configured through the reporting module and is generated from clinical and operational data.

Quality improvement reports are reviewed at configured intervals by the pharmacy's quality improvement committee. The review is documented, and the resulting quality improvement actions are tracked through the platform's task management capability. Quality improvement reports are subject to the same access controls as other clinical documentation.

---

## 12. Role & Permission Recommendations

### 12.1 Specialty-Specific Roles

The Ibn Hayan pharmacy overlay recommends the following role assignments for pharmacy practice, building on the role catalogue defined in `USER_ROLES.md`.

| Role | Code | Specialty Application | Typical Permission Scope |
|---|---|---|---|
| Physician | R01 | Pharmacist | Full dispensing access; prescription verification; dispensing verification; patient counselling; clinical pharmacy services |
| Physician | R01 | Pharmacist-in-charge | Full dispensing access; supervisory authority for pharmacy operations; regulatory reporting |
| Allied health professional | R05 | Pharmacy technician | Limited dispensing access; dispensing preparation; inventory management; technician activities under pharmacist supervision |
| Allied health professional | R05 | Certified pharmacy technician | Extended technician scope per regional regulation; technician activities under pharmacist supervision |
| Medical assistant | R04 | Pharmacy aide | Limited access; inventory receiving; clerical support |
| Patient | R06 | Pharmacy patient | Portal access to own medication list, prescriptions, refill requests, secure messaging |
| Patient family / Caregiver | R07 | Family member or caregiver | Limited portal access with patient authorization |
| Billing specialist | R08 | Pharmacy billing specialist | Insurance claim access; co-payment management; no dispensing access |
| Facility administrator | R09 | Pharmacy administrator | Administrative access; no dispensing access |
| Customer administrator | R10 | Customer system administrator | Configuration and user management; no dispensing access |
| Auditor | R11 | Compliance auditor | Read-only access to audit trail and compliance reports |
| Support engineer | R12 | Implementation consultant | Configuration access during implementation; no production dispensing access |

### 12.2 Permission Defaults

Permission defaults are configured to support the principle of least privilege and the regulatory requirements for pharmacy practice. A pharmacist has full dispensing access, with the scope of practice defined by regional regulation. A pharmacy technician has limited dispensing access, with the scope defined by regional regulation (typically including dispensing preparation and inventory management but excluding prescription verification and dispensing verification, which are reserved for the pharmacist). A pharmacy aide has the most limited access, restricted to inventory receiving and clerical support.

Permission defaults are versioned alongside the customer's configuration and are subject to the standard validation rules. Defaults may be refined at the facility, department, care-team, or user layer, with refinements recorded as overrides. Access to controlled substance dispensing records is restricted to authorised personnel, with access logged in the audit trail. Access to controlled substance dispensing cannot be relaxed below the regional regulatory minimum, which is enforced at the platform layer per Section 8.3 of `CLINIC_TYPES.md`.

### 12.3 Supervision and Delegation Permissions

Supervision and delegation are integral to pharmacy practice, with the pharmacist supervising pharmacy technician activities and delegating specific tasks within the technician's scope of practice. The Ibn Hayan platform supports supervision and delegation through the permission framework's delegation capability, with the delegation configured with the delegating pharmacist, the receiving pharmacy technician, the delegated activities, and the supervision level (immediate supervision, direct supervision, general supervision per regional regulatory framework).

Supervision and delegation permissions are subject to additional verification: the receiving pharmacy technician must have the appropriate credentials for the delegated activities, the delegation must be within the regional regulatory framework for pharmacy technician scope of practice, and the supervising pharmacist must be available for the supervision level required. The verification is configured through the permission framework's standard configuration surface, with the configuration reflecting the regional regulatory framework.

---

## 13. Configuration Defaults

### 13.1 Encounter Configuration Defaults

The pharmacy overlay ships encounter configuration defaults tuned to pharmacy practice. Default appointment durations are 10 to 15 minutes for standard dispensing encounters, 15 to 30 minutes for patient counselling encounters, 30 to 60 minutes for clinical pharmacy encounters, 30 to 60 minutes for compounding encounters (varies by compounding complexity), and 15 to 30 minutes for telehealth counselling encounters. Default encounter templates are configured per encounter type. Default documentation completion expectation is set to within 24 hours of the encounter.

Encounter configuration defaults are starting points; customers may refine them through the configuration surface at the facility, department, or care-team layer. Refinements are subject to the standard validation rules and are recorded in the audit trail. Defaults are reviewed when the overlay is revised and are updated to reflect evolving practice patterns.

### 13.2 Documentation Configuration Defaults

Documentation configuration defaults include the structured field sets for each documentation template, the validation rules that govern documentation completion, and the longitudinal view configurations that present documentation across encounters. Default structured field sets include all fields required by the regional regulatory framework and the professional standard of care, with optional fields available for activation by the customer. Default validation rules require completion of mandatory sections before the encounter can be closed, with the mandatory sections configured per encounter type.

Documentation configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. Customers may add fields through the configuration surface, with additions subject to the standard validation rules. Customers may not remove fields that are required by the regional regulatory framework; this restriction is enforced at the platform layer and is not customer-modifiable.

### 13.3 Clinical Decision Support Configuration Defaults

Clinical decision support configuration defaults include the drug-drug interaction checking (with the severity levels and the recommended actions per interaction), the drug-allergy checking (with the severity levels and the recommended actions per reaction), the dose range checking (with the recommended dose ranges per medication and patient population), and the duplicate therapy checking (with the therapeutic class definitions). Customers may refine the configuration through the configuration surface, with refinements recorded in the audit trail.

Clinical decision support configuration defaults are versioned alongside the overlay and are reviewed when the overlay is revised. The configuration is updated when new evidence emerges (e.g., new drug-drug interactions identified) and when regional regulatory requirements change. The configuration cannot be relaxed below the regional regulatory minimum, which is enforced at the platform layer.

### 13.4 Inventory Configuration Defaults

Inventory configuration defaults include the lot and expiry tracking (enforced at the platform layer), the FEFO rotation (enforced through the dispensing workflow), the inventory reorder thresholds (configurable per medication), and the controlled substance inventory tracking (with the additional regulatory-required documentation). Customers may refine the configuration through the configuration surface, with refinements recorded in the audit trail. Inventory configuration is reviewed when the overlay is revised and is updated to reflect evolving regulatory requirements.

---

## 14. Onboarding Checklist

### 14.1 Onboarding Workflow Stages

The onboarding workflow for pharmacy follows the eight-stage process defined in Section 9 of `CLINIC_TYPES.md`, with stage durations scaled to the pharmacy overlay's medium configuration complexity. The indicative onboarding timeline is 2–4 weeks for a typical pharmacy, with longer timelines for hospital pharmacies and for customers transitioning from paper-based or basic electronic systems.

| Stage | Code | Activity | Owner | Indicative Duration |
|---|---|---|---|---|
| Clinic type selection | O1 | Confirm pharmacy clinic type at facility | Customer administrator | 1 day |
| Overlay activation | O2 | Apply pharmacy overlay to facility configuration | Customer administrator | 1 day |
| Module enablement | O3 | Enable core modules; configure integration with prescription monitoring programme, insurance adjudication systems, and pharmacy automation equipment | Customer administrator | 2–3 days |
| Configuration refinement | O4 | Refine encounter templates, medication catalogue, dispensing workflow, clinical decision support, role permissions | Customer administrator with clinical lead | 1–2 weeks |
| Validation | O5 | Sandbox testing with representative scenarios including dispensing, controlled substance dispensing, and compounding | Customer clinical lead | 3–5 days |
| User provisioning | O6 | Provision users with pharmacy-appropriate roles | Customer administrator | 2 days |
| Operational readiness | O7 | Operational readiness assessment; first dispensing event targeted | Customer clinical lead with Ibn Hayan customer success | 2–3 days |
| Go-live | O8 | Clinic type declared operational; tenant lifecycle updated | Customer administrator | 1 day |

### 14.2 Pre-Onboarding Preparation

Before onboarding begins, the customer should complete the following preparation activities: confirm facility licensing for pharmacy practice, confirm regional regulatory framework applicability (including controlled substance schedules, prescription monitoring programme requirements, pharmacy practice act requirements, and pharmacy labelling requirements), gather existing medication catalogue for migration planning, gather existing inventory data for migration planning, identify the clinical lead (typically the pharmacist-in-charge) who will validate the configuration, and confirm the patient population and anticipated dispensing volume.

### 14.3 Onboarding Validation Activities

Onboarding validation activities include: configuration validation per Section 15.4 of `SYSTEM_ARCHITECTURE.md`; workflow validation through testing each configured workflow against representative scenarios (including standard dispensing, controlled substance dispensing, compounding, and clinical pharmacy services); user acceptance testing through pharmacists and pharmacy technicians performing representative tasks in the sandbox; and operational readiness assessment through a structured review of the configuration against the customer's operational reality. Validation results are documented and are required for the go-live stage transition.

### 14.4 Post-Onboarding Activities

Post-onboarding activities include: ongoing configuration governance per the customer's configuration governance process; periodic review of operational reports and quality improvement reports; periodic review of regulatory reports and submission to regulatory authorities; medication catalogue maintenance and updates; inventory management and reconciliation; and participation in the platform's change-management process for overlay revisions and regional configuration pack updates.

---

## 15. Sample Use Cases

### 15.1 Standard Prescription Dispensing

A patient presents with a paper prescription for an antibiotic (amoxicillin 500 mg, 30 capsules, three times daily for 10 days). The prescription is entered manually by the pharmacy technician, with the prescription details captured as a structured order. The prescription is queued for pharmacist verification. The pharmacist verifies the prescription, with the drug-drug interaction checking producing no alerts and the drug-allergy checking producing no alerts. The dispensing is prepared by the pharmacy technician, with the medication selected from inventory (lot number recorded), the capsules counted, and the label generated. The dispensing is verified by the pharmacist, with the dispensed medication confirmed to match the prescription. The patient is offered counselling, with the patient accepting. The pharmacist provides counselling on the medication's purpose, the dosage instructions, the common side effects, and the importance of completing the full course. The counselling is documented, and the dispensing is released to the patient. The dispensing is recorded in the patient's medication history and in the controlled substance dispensing record (not applicable for this prescription, but the workflow would include the recording if the prescription were for a controlled substance).

### 15.2 Controlled Substance Dispensing with Prescription Monitoring Programme Query

A patient presents with a paper prescription for a Schedule III controlled substance (hydrocodone/acetaminophen, 20 tablets, every 6 hours as needed for pain, 5-day supply). The prescription is entered manually, with the prescription details captured as a structured order. The prescription is queued for pharmacist verification. Before verification, the pharmacist queries the regional prescription monitoring programme through the integration module, with the query returning the patient's controlled substance dispensing history. The history is reviewed, with no indication of multiple prescribers or early refills. The prescription is verified, with the dispensing prepared and verified as in the standard workflow. The dispensing is recorded in the controlled substance dispensing record, with the regulatory-required fields documented. The patient is offered counselling, with the patient accepting. The pharmacist provides counselling on the medication's purpose, the dosage instructions, the common side effects, the risk of dependence, and the importance of secure storage. The dispensing is released to the patient. The controlled substance dispensing record is submitted to the prescription monitoring programme through the integration module, with the submission recorded in the audit trail.

### 15.3 Refill Dispensing

A patient requests a refill of an antihypertensive medication (lisinopril 10 mg, 30 tablets, once daily). The refill is initiated by the patient through the patient portal, with the refill request received by the pharmacy. The pharmacist verifies the refill (with the prescription's refill availability confirmed and the patient's medication therapy reviewed for ongoing appropriateness), with the dispensing prepared and verified as in the standard workflow. The patient is notified through the notifications module that the refill is ready for pickup. The patient picks up the refill, with the dispensing released to the patient. The dispensing is recorded in the patient's medication history, with the remaining refills updated.

### 15.4 Compounding Dispensing

A prescriber orders a compounded medication (tetracaine 0.5% in petrolatum, 30 grams, applied twice daily) for a patient with a skin condition. The compounding prescription is received through electronic prescribing, with the prescription details captured. The pharmacist verifies the prescription and retrieves the compounding formula from the compounding formula library. The ingredients (tetracaine powder, petrolatum base) are selected from inventory, with the lot numbers and quantities recorded. The compounding is performed by the pharmacist (or under the pharmacist's supervision by a pharmacy technician), with the compounding process documented. The quality assurance verification is performed (with the weight, the visual inspection, and the label verification documented). The dispensing is verified by the pharmacist, with the dispensed compounded medication confirmed to match the prescription. The patient is offered counselling, with the patient accepting. The compounding dispensing is recorded in the patient's medication history and in the compounding record, with the compounding documentation preserved for the retention period required by regional regulation.

### 15.5 Clinical Pharmacy Service

A patient is referred by their primary care physician for a medication therapy management review due to polypharmacy (the patient is taking 8 medications for multiple chronic conditions). The patient is scheduled for a 30 to 60 minute clinical pharmacy encounter. The pharmacist conducts the medication therapy review, with the review including the medication list, the medication indications, the medication effectiveness, the medication safety (drug-drug interactions, adverse drug reactions, dose appropriateness), and the patient's adherence. The pharmacist identifies several opportunities for optimisation (e.g., duplicate therapy that could be consolidated, a medication that is no longer indicated, a dose that is subtherapeutic). The pharmacist documents the recommendations and communicates them to the prescriber through secure messaging. The patient is counselled on the medication therapy, with the counselling documented. The clinical pharmacy service is documented in the patient's medication history, with the recommendations tracked for prescriber response and implementation.

### 15.6 Prescription Transfer

A patient requests that their prescription for a maintenance medication (atorvastatin 20 mg, 90 tablets, once daily, with 3 refills remaining) be transferred from their current pharmacy to a different pharmacy closer to their new residence. The receiving pharmacy initiates the transfer, with the transfer authorisation obtained from the patient. The receiving pharmacy retrieves the prescription and dispensing history through the integration module (where the patient's medication history is available through regional medication history services) or through direct communication with the transferring pharmacy. The transfer is documented in both the transferring pharmacy's and the receiving pharmacy's records, with the transfer recorded in the audit trail. The receiving pharmacy processes the next refill when the patient requests it, with the dispensing workflow proceeding as in the standard refill workflow.

---

## 16. Best Practices

### 16.1 Configuration Governance Best Practices

Establish a configuration governance process before onboarding begins, defining who is authorized to make configuration changes, how changes are tested before production application, how changes are documented, and how changes are reviewed retrospectively. The Ibn Hayan platform provides the tools (configuration sandbox, configuration validation, configuration versioning, configuration audit) but does not impose the governance workflow; the customer is responsible for the workflow.

Review the configuration at configured intervals (typically quarterly for pharmacy) and after any significant operational change (new pharmacist joining, new medication class added to the formulary, new equipment integrated, regulatory change). Document the review and the resulting actions, with the documentation preserved for audit. A configuration governance process that is documented and followed is the single most important determinant of a stable production configuration.

### 16.2 Dispensing Safety Best Practices

Enforce the dispensing verification step as a non-negotiable safety practice, with the verification performed by the pharmacist (not by the pharmacy technician) and the verification documented in the dispensing record. The Ibn Hayan platform's dispensing verification capability supports this practice, with the verification enforced through the dispensing workflow. The verification cannot be bypassed; bypassing the verification is a defect and is corrected through the workflow engine's standard configuration surface.

Configure clinical decision support to match the pharmacy's patient population and the regional regulatory framework, with the configuration supporting the pharmacist's clinical judgement rather than substituting for it. The Ibn Hayan platform's clinical decision support capability supports this practice, with the configuration applied through the pharmacy module's clinical decision support surface. Review the clinical decision support configuration at configured intervals and adjust based on the alert burden (alerts that are routinely overridden may warrant configuration refinement to reduce alert fatigue).

### 16.3 Controlled Substance Management Best Practices

Verify the patient's controlled substance history through the prescription monitoring programme before dispensing a controlled substance, with the query documented in the dispensing record. The Ibn Hayan platform's controlled substance dispensing capability supports this practice, with the query integrated with the dispensing workflow. The query is a critical element of controlled substance stewardship, with the query supporting the identification of multiple prescribers, early refills, and other indicators of potential misuse.

Maintain the controlled substance inventory with the rigour required by regional regulation, with the inventory reconciled at configured intervals (typically monthly for Schedule II, less frequently for other schedules per regional regulation). The Ibn Hayan platform's controlled substance inventory capability supports this practice, with the inventory tracked through the inventory module's standard lot tracking capability. Discrepancies are investigated promptly, with the investigation documented for audit and for regulatory reporting where required.

### 16.4 Inventory Management Best Practices

Maintain the medication inventory with lot and expiry tracking for all medications, with the tracking enforced at the platform layer. The Ibn Hayan platform's inventory capability supports this practice, with the tracking integrated with the dispensing workflow. The tracking supports product recall response (allowing the identification of patients who received medication from a recalled lot) and supports inventory management (allowing FEFO rotation).

Reconcile the inventory at configured intervals (typically monthly), with the reconciliation documented. Discrepancies are investigated promptly, with the investigation documented for audit. The reconciliation supports the pharmacy's regulatory compliance (controlled substance inventory reconciliation is a regulatory requirement in most jurisdictions) and supports the pharmacy's loss prevention (identifying inventory shrinkage that may indicate theft or process errors).

### 16.5 Patient Counselling Best Practices

Offer patient counselling for every new prescription, with the offer documented in the dispensing record per regional regulatory framework. The Ibn Hayan platform's patient counselling capability supports this practice, with the offer integrated with the dispensing workflow. The offer is a regulatory requirement in most jurisdictions and is a patient safety practice that supports medication adherence and reduces medication errors.

Provide patient counselling that is patient-centred, with the counselling tailored to the patient's needs (e.g., plain language for patients with limited health literacy, interpreter services for patients with limited language proficiency, written supplements for patients who prefer written information). The Ibn Hayan platform's patient counselling capability supports this practice, with the counselling documented through the encounter module's structured counselling template. The counselling is auditable, with the counselling documented for compliance and for quality improvement.

### 16.6 Clinical Pharmacy Service Best Practices

Provide clinical pharmacy services that are integrated with the patient's overall care, with the services coordinated with the prescriber and the patient. The Ibn Hayan platform's clinical pharmacy capability supports this practice, with the services documented through the encounter module's clinical pharmacy encounter template. The integration supports the continuity of care, with the clinical pharmacy services documented in the patient's medication history and the recommendations communicated to the prescriber through secure messaging.

Document the clinical pharmacy service with the structure required for quality improvement and reimbursement, with the documentation including the medication therapy review, the recommendations, the prescriber response, and the outcome. The Ibn Hayan platform's clinical pharmacy capability supports this practice, with the documentation supporting the pharmacy's quality improvement and supporting reimbursement where regional regulation provides for clinical pharmacy service reimbursement.

### 16.7 Reporting and Analytics Best Practices

Review clinical outcome reports at configured intervals and use the reports to inform clinical practice. The medication adherence report, the adverse drug reaction report, and the clinical pharmacy service outcome report support clinical decision-making by surfacing trends that may not be apparent in individual dispensing events. The Ibn Hayan platform's reporting capability supports this practice, with the reports configured through the reporting module and presented in the longitudinal views.

Review operational reports at configured intervals and use the reports to inform pharmacy management decisions. The dispensing volume report, the inventory turnover report, the expiry report, and the insurance claim adjudication report surface operational patterns that may not be apparent from day-to-day practice. Address the patterns identified through the reports, with the actions documented and the effects monitored through subsequent reports.

### 16.8 Onboarding Best Practices

Engage Ibn Hayan customer success or implementation consulting for configuration review during onboarding. The pharmacy overlay's medium configuration complexity warrants configuration review by an experienced implementer, particularly for the medication catalogue, the clinical decision support, and the inventory configuration. The cost of the review is modest compared to the cost of rework after go-live.

Train all users before go-live, with the training tailored to each user's role. Dispensing workflow training should include hands-on practice with the dispensing workflow, with the training conducted in the sandbox to avoid affecting production data. Controlled substance dispensing training should include hands-on practice with the controlled substance dispensing workflow and the prescription monitoring programme query. Document the training, with the documentation preserved for audit.

### 16.9 Change Management Best Practices

Adopt overlay revisions on a planned schedule rather than reactively. Overlay revisions are communicated in advance, with the revision contents documented and the adoption window defined. Plan the adoption during a period of lower operational tempo, with the adoption tested in the sandbox before production application. Document the adoption, with the documentation preserved for audit.

Participate in the platform's change-management process by providing feedback on overlay revisions and by participating in pilot engagements for new overlay capabilities. Customer participation is the basis of the platform's validated-practice posture stated in Principle P8 (Verified Practice Over Hypothetical Capability) in Section 4.9 of `SYSTEM_ARCHITECTURE.md.

### 16.10 Privacy and Confidentiality Best Practices

Limit access to patient medication histories to authorised users with a clinical or operational need. Access by users without a need is a compliance violation and undermines patient trust. The Ibn Hayan platform's permission framework supports this practice, with access governed by role, relationship to the patient, and documentation category. Review access logs periodically and address any unauthorized access promptly.

Verify patient consent for medication-related communications at each encounter, with the verification documented in the encounter record. Consent for communication (e.g., text message notifications, email notifications) is subject to regional regulatory requirements, with the consent configured through the regional configuration pack. The Ibn Hayan platform's consent management capability supports this practice, with the consent verified at communication initiation and recorded in the audit trail.

---

## 17. Related Documents

### 17.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 (Supported Clinic Types) defines the pharmacy clinic type (C23); Section 16 (Editions) defines the edition packaging; Section 19 (Product Modules Overview) defines the module catalogue including M05 Pharmacy; Section 22 (Configuration-Driven Philosophy) governs customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 (Architectural Principles) governs the platform's behaviour including P1 Healthcare Safety; Section 7.7 documents the pharmacy bounded context deviation; Section 12 (Clinic Hierarchy) defines the clinic type overlay layer; Section 15 (Configuration Strategy) defines the configuration layer model; Section 16 (Workflow Engine Philosophy) governs workflow configuration |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; pharmacy is clinic type C23 in the diagnostic and pharmacy family; Section 5 documents the configuration overlay approach; Section 8 documents customization boundaries including controlled substance tracking as a platform-level invariant |

### 17.2 Downstream and Sibling Documents

The following downstream and sibling documents elaborate aspects of pharmacy referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue and dependencies |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue and permission scope defaults |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework and access control rules |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine and workflow configuration |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability per clinic type |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging and module enablement |
| Patient Module | `docs/07_MODULES/PATIENT.md` | Patient registration, allergy documentation |
| Encounter Module | `docs/07_MODULES/ENCOUNTER.md` | Encounter management, dispensing encounters |
| Pharmacy Module | `docs/07_MODULES/PHARMACY.md` | Medication management, dispensing workflow, controlled substance tracking |
| Inventory Module | `docs/07_MODULES/INVENTORY.md` | Inventory management, lot tracking |
| Laboratory Clinic Type | `docs/06_CLINIC_TYPES/LABORATORY.md` | Sibling diagnostic and pharmacy family clinic type (C24) |
| Radiology Clinic Type | `docs/06_CLINIC_TYPES/RADIOLOGY.md` | Sibling diagnostic and pharmacy family clinic type (C25) |
| Hospital Clinic Type | `docs/06_CLINIC_TYPES/HOSPITAL.md` | Sibling clinic type for hospital-based pharmacy |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Overlay revisions and regional configuration pack updates are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
