# Ibn Hayan Healthcare Operating System
## Dermatology & Laser Centers

| Field | Value |
|---|---|
| Document Title | Dermatology & Laser Centers Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the dermatology overlay is amended |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for dermatology facilities |
| Scope | Specialty overview, target facilities, recommended modules, skin lesion tracking, treatment session records, before/after imaging, laser treatment records, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for dermatology (clinic type C07) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, dermatopathology laboratory information system-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the dermatology clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Skin Lesion Tracking
5. Treatment Session Records
6. Before/After Imaging
7. Laser Treatment Records
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

Dermatology is the medical specialty concerned with the diagnosis, management, and treatment of conditions of the skin, hair, nails, and mucous membranes, and with the surgical and cosmetic procedures performed on these structures. The dermatologist evaluates and manages conditions including skin cancers (melanoma, basal cell carcinoma, squamous cell carcinoma), inflammatory skin diseases (eczema, psoriasis, acne), autoimmune blistering disorders, infections, pigment disorders, hair disorders, nail disorders, and cosmetic concerns. Scope of practice includes clinical consultation, skin biopsy, cryotherapy, topical and systemic therapy, phototherapy, Mohs micrographic surgery, excisional surgery, laser therapy, and cosmetic procedures including botulinum toxin injection and dermal filler injection. Ibn Hayan treats dermatology as clinic type C07 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated Medium and recommended editions Essential (E1) and Professional (E2).

### 1.2 Patient Population and Clinical Activities

The dermatology patient population spans the full age spectrum, from infants with atopic dermatitis through elderly patients with skin cancer, with peak utilization in young adults (acne) and in older adults (skin cancer surveillance and treatment). Clinical activities include comprehensive skin examination, lesion documentation with anatomic localization, biopsy of suspicious lesions, cryotherapy of benign and premalignant lesions, excision of malignant lesions, phototherapy for inflammatory conditions, laser therapy for vascular and pigment lesions and for hair removal, and cosmetic procedures for aesthetic concerns. The dermatology encounter is image-intensive; clinical photography and dermoscopy imaging are central to documentation, and before/after imaging is central to treatment tracking for both medical and cosmetic procedures. The specialty also generates substantial pathology workload, with biopsied and excised lesions sent to dermatopathology for histopathological diagnosis.

### 1.3 Why Dermatology Needs Specialized Configuration

Dermatology requires specialized configuration across several dimensions: structured documentation of skin lesions with anatomic localization (commonly using a body diagram), tracking of lesions over time to detect change or to monitor treatment response, management of clinical and dermoscopy images with linkage to specific lesions, tracking of biopsy and pathology results back to the originating lesion, documentation of treatment sessions (cryotherapy, laser, cosmetic procedures) with before/after imaging, and management of cosmetic procedure consents and before/after photography consents that are distinct from general medical consent. Ibn Hayan's dermatology overlay addresses these requirements through specialty-specific documentation templates, image management capabilities, and procedure documentation workflows, with configuration defaults reflecting typical dermatology practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.3 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Multidisciplinary Care

Dermatology coordinates closely with primary care (for routine skin concerns), with oncology (for advanced melanoma), with plastic surgery (for complex reconstruction after skin cancer excision), with rheumatology (for autoimmune connective tissue diseases with cutaneous manifestations), and with allergology (for allergic skin conditions). Dermatology also frequently operates alongside cosmetic procedure services within multi-specialty facilities. Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports these compositions, with shared services such as the pathology laboratory, the photography service, and the procedure room operating as facility-level shared services across clinic types.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Dermatology operates across the small to mid-sized facility spectrum, from solo dermatologist practices through multi-site dermatology groups with embedded cosmetic procedure centres. The most common configurations are solo practices (one dermatologist with one to two support staff), small group practices (two to five dermatologists), mid-sized group practices (six to twelve dermatologists with embedded procedure rooms and phototherapy suites), and dermatology and laser centres (combining medical dermatology with cosmetic procedures and laser therapy). Ibn Hayan's Essential edition (E1) supports solo and small group practices per `PRODUCT_BIBLE.md` Section 16.4, while the Professional edition (E2) is the typical fit for mid-sized group practices and dermatology and laser centres per Section 16.5. Enterprise edition (E3) is rarely required for dermatology unless the facility is part of a hospital network or operates alongside inpatient services.

### 2.2 Ownership Patterns and Geographic Considerations

Dermatology facilities operate under private practice ownership, physician-group ownership, corporate-owned dermatology and laser centre chains, hospital-employment models, and academic medical centre ownership. The mix of medical dermatology and cosmetic procedures varies by facility; some facilities are predominantly medical, some are predominantly cosmetic, and some are mixed. Geographic considerations for dermatology mirror those for general practice but with additional consideration of cosmetic procedure demand, which is typically concentrated in urban and suburban markets. Ibn Hayan's offline-first posture, documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 (P11), supports intermittent connectivity scenarios; the platform's image management capability is configured to support offline image acquisition with synchronization when connectivity is restored.

### 2.3 Regulatory Environment

Dermatology operates within a regulatory environment that includes procedural documentation requirements (for excisions, biopsies, and cosmetic procedures), pathology laboratory reporting requirements, controlled substance prescribing oversight (for isotretinoin and other regulated medications), cosmetic procedure consent requirements (which are often more specific than general medical consent), and (in some jurisdictions) cosmetic procedure advertising regulations. Ibn Hayan's Audit module (M16) records every procedural documentation event, every cosmetic procedure consent, and every controlled substance prescribing event; the Configuration module (M15) enforces regulatory validation rules per `SYSTEM_ARCHITECTURE.md` Section 15.4 (rule category V5); the Localization module (M19) applies regional regulatory frameworks including cosmetic procedure consent templates and controlled substance monitoring program reporting.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for dermatology reflects the specialty's emphasis on lesion documentation, image management, procedural documentation, and pathology coordination. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Longitudinal patient record with dermatologic history |
| Encounter | M02 | Required | Encounter management across consultation, procedure, and follow-up visits |
| Clinical Documentation | M03 | Required | Lesion documentation, body diagram, procedure notes |
| Orders & Results | M04 | Required | Pathology orders, pathology results, dermatopathology coordination |
| Pharmacy | M05 | Required | Topical and systemic medication management, isotretinoin monitoring |
| Scheduling | M06 | Required | Outpatient scheduling, procedure scheduling, phototherapy scheduling |
| Documents | M07 | Required | Consult letters, pathology reports, consent forms, cosmetic procedure documentation |
| Notifications | M08 | Required | Pathology result alerts, follow-up reminders, recall notifications |
| Billing | M09 | Required | Encounter billing, procedural billing, cosmetic procedure billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Cosmetic procedure outreach, skin cancer screening recall |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For phototherapy suite staffing |
| Identity & Access | M14 | Required | Authentication, authorization, role enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for procedural and consent events |
| Integration | M17 | Required | Integration with photography equipment, dermoscopy systems, dermatopathology laboratory, cosmetic procedure equipment |
| Reporting | M18 | Required | Skin cancer surveillance, pathology turnaround, procedure volume |
| Localization | M19 | Required | Regional regulatory frameworks, clinical coding systems, cosmetic procedure consent templates |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Solo practice (T1) | E1 | M01–M09, M14–M19 | M11 |
| Small group practice (T2) | E1 | M01–M09, M14–M19 | M10, M11 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13 |
| Dermatology and laser centre (T3–T4) | E2 | M01–M09, M11, M12, M13, M14–M19 | M10 |
| Academic medical centre department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Skin Lesion Tracking

### 4.1 Capability Overview

Skin lesion tracking is the foundational clinical activity of dermatology, providing the longitudinal data that allows the dermatologist to monitor individual lesions over time, detect changes that may indicate malignancy, document treatment response, and coordinate follow-up surveillance. Each lesion is documented with its anatomic location, size, morphology, clinical appearance (with clinical photography), dermoscopic appearance (with dermoscopy imaging), and clinical assessment. Ibn Hayan's skin lesion tracking capability, implemented through the Clinical Documentation module (M03) with image management through the Integration module (M17), supports lesion documentation with body diagram localization, longitudinal lesion tracking, dermoscopy image linkage, biopsy and pathology result linkage, and registry integration for skin cancer surveillance.

### 4.2 Body Diagram Localization

Lesion documentation uses a body diagram (an anatomic map of the body surface) for lesion localization, with the dermatologist placing a marker on the diagram at the lesion's anatomic location. The body diagram supports anterior, posterior, and lateral views, plus dedicated views for specific anatomic regions (scalp, face, hands, feet, genitalia). Multiple lesions on the same patient are tracked as separate entries, each with its own anatomic location and longitudinal history. The body diagram localization is critical for follow-up surveillance; the dermatologist must be able to identify the exact lesion being reassessed at a subsequent visit, particularly in patients with numerous lesions. The body diagram configuration is customizable per facility and per regional anatomic convention.

### 4.3 Lesion Morphology Documentation

Lesion morphology is documented using structured fields that capture the standard dermatologic descriptors: lesion type (macule, papule, plaque, nodule, vesicle, bulla, pustule, ulcer, etc.), color, size (in millimeters), border characteristics, surface characteristics, and surrounding skin. The structured morphology documentation supports clinical decision support (with morphology patterns triggering malignancy risk assessments) and supports longitudinal comparison (with changes in morphology flagged for clinician attention). The morphology documentation template is configurable per facility and per regional dermatologic convention; the standard dermatologic vocabulary is maintained through the Localization module (M19).

### 4.4 Longitudinal Lesion Tracking

Longitudinal lesion tracking presents the current lesion documentation alongside prior documentation for the same lesion, with morphology, size, and imaging compared across visits. The comparison view is critical for skin cancer surveillance; changes in size, morphology, or color over time are the primary indicators of malignant transformation. The comparison view supports side-by-side clinical photography and dermoscopy imaging, with the prior and current images displayed for direct visual comparison. Lesions that show concerning change are flagged for biopsy or excision; the biopsy or excision is documented within the lesion record, maintaining the longitudinal history through to pathology diagnosis.

### 4.5 Dermoscopy Image Linkage

Dermoscopy images (close-up images acquired with a dermatoscope, providing magnified visualization of subsurface skin structures) are linked to the lesion record through the Integration module (M17). The dermoscopy image is acquired by the dermatologist using a dermoscopy system; the image is transmitted to Ibn Hayan, validated, and stored as part of the lesion record. Longitudinal dermoscopy comparison is supported through the same comparison view as clinical photography, allowing the dermatologist to detect changes in dermoscopic structures (such as the appearance of atypical pigment network or regression structures) that may indicate malignancy. Dermoscopy image linkage is a defining capability of dermatology and is configured as part of the dermatology overlay.

---

## 5. Treatment Session Records

### 5.1 Capability Overview

Dermatology performs a wide range of treatments that are documented as discrete treatment sessions: cryotherapy, topical chemotherapy, phototherapy, excisional surgery, Mohs micrographic surgery, laser therapy, botulinum toxin injection, dermal filler injection, chemical peels, and other procedures. Each treatment session generates documentation that includes the indication, the treatment performed, the parameters used, the immediate outcome, and the follow-up plan. Ibn Hayan's treatment session records capability, implemented through the Clinical Documentation module (M03) with image management through the Integration module (M17), supports structured treatment documentation, treatment parameter capture, before/after imaging, and longitudinal treatment tracking.

### 5.2 Structured Treatment Documentation

Treatment documentation is structured per treatment type, with each treatment type having its own template that captures the relevant clinical details. Cryotherapy documentation captures the lesion treated, the number of freeze-thaw cycles, the freeze duration, and the immediate tissue response. Excisional surgery documentation captures the lesion excised, the excision margins, the closure method, the specimen handling, and the immediate complications. Phototherapy documentation captures the treatment type (narrowband UVB, PUVA), the dose, the cumulative dose, and the treatment number in the course. Cosmetic procedure documentation captures the product used, the injection sites, the quantity used, and the immediate cosmetic result. The treatment documentation templates are configurable per facility and per regional convention.

### 5.3 Treatment Parameter Capture

Treatment parameters are the specific settings and quantities used during a treatment session; they are critical for treatment reproducibility, for cumulative dose tracking, and for adverse event investigation. Laser treatment parameters capture the laser type, wavelength, spot size, fluence, pulse duration, and number of passes. Phototherapy parameters capture the dose, cumulative dose, and treatment number. Cosmetic procedure parameters capture the product, lot number, injection sites, and quantity per site. The parameter capture is structured per treatment type and is recorded in the treatment session record; parameters are auditable end-to-end, supporting clinical governance and regulatory compliance.

### 5.4 Longitudinal Treatment Tracking

Longitudinal treatment tracking presents the patient's treatment history for a given condition or anatomic site, with each treatment session displayed in chronological order. The tracking view is particularly valuable for chronic conditions (such as psoriasis phototherapy courses, actinic keratosis cryotherapy courses, and cosmetic procedure series); the view supports assessment of treatment response, cumulative dose monitoring, and treatment session planning. The tracking view integrates with the lesion record; treatments performed on a specific lesion are displayed within the lesion's longitudinal history, maintaining the link between treatment and the treated lesion.

---

## 6. Before/After Imaging

### 6.1 Capability Overview

Before/after imaging is central to dermatology treatment tracking, providing objective visual documentation of treatment response for both medical and cosmetic procedures. For medical procedures, before/after imaging documents the response of a lesion or condition to treatment (such as a skin cancer's response to topical chemotherapy, or a psoriasis plaque's response to phototherapy). For cosmetic procedures, before/after imaging documents the aesthetic outcome of the procedure and supports patient communication about treatment effectiveness. Ibn Hayan's before/after imaging capability, implemented through the Integration module (M17) with documentation through the Clinical Documentation module (M03), supports standardized image acquisition, image pairing, longitudinal image series, and patient-facing image delivery.

### 6.2 Standardized Image Acquisition

Standardized image acquisition is configured per anatomic site and per procedure type, with the standardization capturing camera position, lighting, patient positioning, and field of view. Standardization is critical for before/after comparison; images acquired with different positioning or lighting cannot be meaningfully compared. The standardization is configured through the Integration module (M17) and is presented to the imaging technician (or to the dermatologist) as a positioning guide at acquisition. Standardization supports reproducibility across visits and across imaging technicians; the standardization configuration is versioned and is refined based on clinical feedback.

### 6.3 Image Pairing and Longitudinal Series

Image pairing presents the before image and the after image side by side, with the images acquired at the same anatomic position and with the same standardization. For treatments with multiple sessions (such as a phototherapy course or a series of cosmetic procedures), the images form a longitudinal series that documents the treatment trajectory. The longitudinal series view is valuable for both clinical and patient communication purposes; for clinical purposes, the series supports assessment of treatment response and decision-making about treatment continuation; for patient communication, the series supports shared decision-making about ongoing treatment.

### 6.4 Patient-Facing Image Delivery

Patient-facing image delivery provides the patient with access to their own before/after images through the patient portal, supporting engagement with their treatment trajectory. The delivery is configurable per facility and per procedure type; cosmetic procedure before/after images are typically shared with the patient, while medical procedure images may be shared at the dermatologist's discretion. Patient-facing image delivery is recorded in the audit trail; image access by the patient is logged separately from clinician access, supporting both clinical governance and regulatory compliance. Image delivery is governed by the consent captured at the time of image acquisition; images for which consent for patient-facing delivery was not granted are not shared.

---

## 7. Laser Treatment Records

### 7.1 Capability Overview

Laser therapy is a distinct procedural modality within dermatology, used for vascular lesions (laser types including pulsed dye laser), pigment lesions (including Q-switched lasers), hair removal (including diode and alexandrite lasers), skin resurfacing (including fractional ablative and non-ablative lasers), and tattoo removal. Laser treatment documentation is parameter-intensive; each treatment session generates a record of the laser type, the treatment parameters, the immediate tissue response, and the adverse events (if any). Ibn Hayan's laser treatment records capability, implemented through the Clinical Documentation module (M03) with equipment integration through the Integration module (M17), supports laser treatment documentation, parameter capture, cumulative dose tracking, adverse event tracking, and equipment quality monitoring.

### 7.2 Laser Parameter Capture

Laser parameters are captured through structured fields within the laser treatment record: laser type, wavelength, spot size, fluence (energy per unit area), pulse duration, number of passes, cooling method, and immediate tissue response (erythema, purpura, edema). Parameters may be captured manually by the dermatologist or automatically through integration with the laser equipment; where equipment integration is available, the parameters are received through the Integration module (M17) and are validated against the treatment plan. Parameter capture is auditable end-to-end; parameter records support clinical governance review, adverse event investigation, and regulatory compliance.

### 7.3 Cumulative Dose Tracking

Cumulative dose tracking monitors the total dose delivered to a given anatomic site across multiple treatment sessions, supporting treatment planning and safety monitoring. The cumulative dose view presents the dose history for each anatomic site, with the cumulative dose calculated based on the parameters captured at each session. Cumulative dose tracking is particularly important for procedures with cumulative dose limits (such as tattoo removal, where excessive cumulative dose may cause scarring); the tracking view alerts the dermatologist when the cumulative dose approaches the configured threshold. The cumulative dose configuration is customizable per laser type and per anatomic site.

### 7.4 Adverse Event Tracking

Adverse events during or after laser treatment are documented within the laser treatment record, with structured fields capturing the event type (erythema, purpura, blistering, scarring, pigment change, infection), the severity, the onset, the intervention, and the resolution. Adverse event tracking supports clinical governance review, treatment protocol refinement, and (where applicable) regulatory reporting. Adverse events are recorded in the audit trail; adverse event rates are reportable through the Reporting module (M18) for quality monitoring.

### 7.5 Equipment Quality Monitoring

Equipment quality monitoring tracks laser equipment performance over time, with calibration data, treatment counts, and adverse event rates recorded per equipment unit. The monitoring supports equipment maintenance scheduling, equipment replacement planning, and identification of equipment performance issues that may affect treatment safety or effectiveness. Equipment quality monitoring is configured through the Integration module (M17); equipment identifiers are recorded with each treatment session, supporting per-equipment analysis.

---

## 8. Specialty Workflows

### 8.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Outpatient consultation | Scheduled appointment | Comprehensive skin exam, lesion documentation, assessment, plan | Physician, Nurse | M02, M03 |
| Biopsy procedure | Lesion identified for biopsy | Consent, anesthetic, biopsy, specimen handling, documentation | Physician, Nurse | M02, M03, M04 |
| Cryotherapy session | Lesion identified for cryotherapy | Position patient, document parameters, perform, document response | Physician, Nurse | M03 |
| Excisional surgery | Lesion identified for excision | Consent, anesthetic, excision, closure, specimen handling, documentation | Physician, Nurse | M02, M03, M04, M07 |
| Mohs surgery session | Scheduled Mohs procedure | Consent, excision, in-room pathology, additional excision if needed, closure, documentation | Physician, Technician, Nurse | M02, M03, M04, M07 |
| Phototherapy session | Scheduled session | Verify patient, verify dose, administer, document response | Technician, Nurse | M03, M17 |
| Laser treatment session | Scheduled session | Consent, parameters capture, perform, document response, before/after imaging | Physician, Nurse | M03, M17 |
| Cosmetic procedure session | Scheduled session | Consent (cosmetic-specific), perform, document, before/after imaging | Physician, Nurse | M02, M03, M07, M17 |
| Pathology result review | Pathology result received | Review result, classify action, notify patient, update care plan | Physician, Nurse | M04, M07, M08 |
| Skin cancer surveillance recall | Surveillance interval reached | Generate recall, schedule, perform full skin exam, document | Receptionist, Nurse, Physician | M06, M08, M18 |

---

## 9. Specialty Data Models

### 9.1 Conceptual Entity Overview

The dermatology data model extends the platform's standard patient-encounter-centric model with entities for skin lesions, treatment sessions, clinical and dermoscopy images, pathology orders and results, and laser treatment parameters. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 9.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Skin lesion | Longitudinal record of an individual skin lesion | Patient, anatomic location (body diagram coordinates), lesion type, morphology, size, color, assessment, imaging references |
| Treatment session | Documentation of a discrete treatment session | Patient, encounter, treatment type, indication, parameters, immediate response, adverse events, before/after image references |
| Clinical image | Clinical photograph of a lesion or anatomic area | Patient, encounter, acquisition date, anatomic location, image reference, acquisition standardization |
| Dermoscopy image | Dermoscopic image of a lesion | Patient, encounter, lesion reference, acquisition date, image reference |
| Pathology order | Order for pathology examination of a biopsied or excised specimen | Patient, encounter, lesion reference, specimen type, specimen handling, ordering physician, pathology laboratory |
| Pathology result | Result of pathology examination | Patient, encounter, lesion reference, diagnosis, histologic features, margins (for excisions), reporting pathologist |
| Laser treatment record | Detailed record of a laser treatment session | Patient, encounter, treatment indication, laser type, parameters, equipment identifier, cumulative dose, response, adverse events |
| Cosmetic procedure consent | Consent specific to a cosmetic procedure | Patient, encounter, procedure type, consent fields, consent date, consenting clinician |

### 9.3 Entity Relationships

The skin lesion entity references the patient and persists independently as a longitudinal record; lesions are updated by encounters but persist across encounters. The treatment session references the patient and the encounter; the session may reference the treated lesion (for lesion-specific treatments) or may be site-specific (for phototherapy or laser hair removal). The clinical image references the patient and the encounter and may reference the lesion (for lesion-specific imaging) or may be site-specific. The dermoscopy image references the lesion. The pathology order references the lesion biopsied or excised; the pathology result references the pathology order and is linked back to the lesion. The laser treatment record references the equipment identifier and supports cumulative dose calculation per anatomic site.

---

## 10. Forms & Templates

### 10.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Outpatient dermatology consultation | Outpatient | Comprehensive skin examination with lesion documentation |
| Follow-up visit | Outpatient | Focused follow-up for established condition |
| Procedure visit | Outpatient | Procedure-focused visit with consent, procedure note, and post-procedure instructions |
| Phototherapy session | Outpatient | Phototherapy treatment session with dose documentation |
| Laser treatment session | Outpatient | Laser treatment session with parameter capture |
| Cosmetic procedure visit | Outpatient | Cosmetic procedure with cosmetic-specific consent |
| Skin cancer surveillance visit | Outpatient | Full skin examination for surveillance |

### 10.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Consult letter | Outbound consult response to referring physician | M07 Documents |
| Biopsy report request | Outbound pathology order with clinical information | M04 Orders & Results |
| Excision report | Procedural report for excisional surgery | M07 Documents |
| Mohs surgery report | Procedural report for Mohs micrographic surgery | M07 Documents |
| Laser treatment record | Procedural record for laser treatment | M07 Documents |
| Cosmetic procedure consent | Procedure-specific consent for cosmetic procedures | M07 Documents |
| Phototherapy consent | Consent for phototherapy course | M07 Documents |
| Before/after image release | Patient consent for use of before/after images | M07 Documents |
| Skin cancer surveillance plan | Patient-facing surveillance plan | M07 Documents |

---

## 11. Reports & Analytics

### 11.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Skin cancer surveillance registry | Patients under surveillance for skin cancer, by cancer type and surveillance interval | On demand |
| Pathology result turnaround report | Time from biopsy to pathology result | Monthly |
| Pathology diagnosis distribution report | Distribution of pathology diagnoses, by lesion type | Quarterly |
| Phototherapy treatment course report | Treatment course progress and response for phototherapy patients | On demand |
| Cosmetic procedure outcome report | Before/after image comparison and patient satisfaction | Quarterly |
| Adverse event report | Adverse events by procedure type and laser type | Monthly |

### 11.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| Procedure volume report | Procedures per dermatologist, by type | Monthly |
| No-show rate report | Missed appointments by clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |
| Equipment utilization report | Laser equipment utilization and maintenance due | Monthly |

### 11.3 Regulatory Reports

Regulatory reports include controlled substance prescribing reports (for isotretinoin and other regulated medications), cosmetic procedure documentation reports (where required by regional regulation), and adverse event reports (where required for specific procedures or devices). The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 12. Role & Permission Recommendations

### 12.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Dermatology |
|---|---|---|
| Physician (Dermatologist) | R01 | Clinical assessment, lesion documentation, procedures, orders, documentation |
| Nurse | R02 | Nursing assessment, procedure assistance, phototherapy administration, patient education |
| Dermatology technician | R04 | Clinical photography, dermoscopy imaging, laser equipment operation, phototherapy suite operation |
| Pharmacist | R03 | Medication review, isotretinoin monitoring (where embedded) |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Outpatient scheduling, procedure scheduling |
| Biller | R08 | Encounter billing, procedural billing, cosmetic procedure billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, user provisioning |

### 12.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, and by patient cohort per `PRODUCT_BIBLE.md` Section 21.4. Dermatology facilities typically scope physician access to the facility level. Dermatology technician access is scoped to the imaging and procedure tasks they perform; the technician has access to the imaging record but not to the full clinical assessment. Cosmetic procedure documentation access is scoped to the performing dermatologist and to authorized support staff; cosmetic procedure documentation may have additional confidentiality restrictions where the patient has requested limited access. Image access is scoped to the patient's care team; access to before/after images by non-care-team staff requires explicit authorization.

### 12.3 Custom Role Recommendations

Common custom roles for dermatology include the Imaging Technician role (composed of technician permissions scoped to clinical photography and dermoscopy imaging), the Laser Technician role (composed of technician permissions scoped to laser equipment operation), the Phototherapy Nurse role (composed of nurse permissions scoped to phototherapy suite operation), and the Cosmetic Procedure Coordinator role (composed of scheduler and biller permissions scoped to cosmetic procedures). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 13. Configuration Defaults

### 13.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Outpatient consultation slot duration | 20 minutes | Customer-adjustable |
| Follow-up visit slot duration | 15 minutes | Customer-adjustable |
| Biopsy procedure slot duration | 20 minutes | Customer-adjustable |
| Excisional surgery slot duration | 30 minutes | Customer-adjustable |
| Mohs surgery slot duration | Variable by stage | Customer-configurable |
| Phototherapy session slot duration | 15 minutes | Customer-adjustable |
| Laser treatment session slot duration | 30 minutes | Customer-adjustable |
| Cosmetic procedure slot duration | Variable by procedure | Customer-configurable |

### 13.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default encounter template | Outpatient dermatology consultation | Customer-adjustable |
| Default body diagram convention | Regional anatomic convention | Configured through Localization module (M19) |
| Default skin cancer surveillance intervals | Per regional clinical practice guideline | Configured through Localization module (M19) |
| Pathology result turnaround target | 7 days | Customer-adjustable |
| Cosmetic procedure consent template | Regional consent template | Configured through Localization module (M19) |

### 13.3 Procedural Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Procedure consent capture | Required before procedure start | Non-overridable |
| Cosmetic procedure consent capture | Cosmetic-specific consent required | Non-overridable |
| Before/after imaging | Required for laser and cosmetic procedures | Customer-adjustable per procedure type |
| Laser parameter capture | Required for all laser treatment sessions | Non-overridable |

---

## 14. Onboarding Checklist

### 14.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that dermatology (C07) is the primary clinic type for the facility.
2. Activate the dermatology overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2.
4. Configure the regional framework: Through the Localization module (M19), apply the regional regulatory framework, clinical coding system, and cosmetic procedure consent templates.
5. Configure skin lesion tracking: Verify body diagram configuration; validate lesion documentation template; configure lesion morphology vocabulary.
6. Configure image management: Configure integration with clinical photography equipment and dermoscopy systems; verify image storage and retrieval; configure before/after imaging standardization.
7. Configure pathology integration: Configure integration with dermatopathology laboratory; verify pathology order transmission and result receipt; validate pathology result linkage to lesion records.
8. Configure laser treatment records: Configure laser equipment integration; verify parameter capture; configure cumulative dose tracking per laser type and anatomic site.
9. Configure cosmetic procedure workflows: Configure cosmetic-specific consent templates; configure before/after imaging workflow; verify patient-facing image delivery consent.
10. Configure encounter templates: Review the default encounter templates listed in Section 10.1; refine templates to match the facility's documentation standards.
11. Configure role set and permissions: Provision the roles listed in Section 12.1; configure permission scope by facility, care team, patient cohort, and procedural team.
12. Configure integrations: Configure all equipment and laboratory integrations; validate integration data flow in the configuration sandbox.
13. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians.
14. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 15. Sample Use Cases

### 15.1 Use Case — Skin Cancer Surveillance for a Patient with Prior Melanoma

A 55-year-old patient with a prior melanoma excised 2 years ago presents for routine surveillance. The dermatologist conducts a full skin examination using the skin cancer surveillance visit template; the body diagram presents the patient's recorded lesions, including the site of the prior melanoma excision. The dermatologist identifies a new pigmented lesion on the patient's back; the lesion is documented in the lesion record with anatomic location, morphology, size, and clinical photography. Dermoscopy is performed; the dermoscopy image is acquired through the Integration module (M17) and is linked to the lesion record. The dermoscopic features are concerning for melanoma; the dermatologist documents the assessment and schedules a biopsy. The biopsy is performed at the same visit; the specimen is sent to dermatopathology through the Integration module (M17); the pathology result returns 5 days later with a diagnosis of melanoma in situ. The pathology result is linked to the lesion record; the patient is scheduled for excision with appropriate margins.

### 15.2 Use Case — Phototherapy Course for Psoriasis

A 35-year-old patient with chronic plaque psoriasis is initiated on narrowband UVB phototherapy. The phototherapy consent is documented; the initial dose is calculated based on the patient's skin type. The patient attends phototherapy sessions three times weekly; at each session, the phototherapy nurse verifies the patient's identity and the planned dose, administers the treatment, and documents the dose, cumulative dose, and treatment number in the treatment session record. The patient's response is assessed at regular intervals; after 20 treatments, the patient's psoriasis has significantly improved. The cumulative dose is reviewed; the phototherapy course is concluded with a maintenance plan. The longitudinal treatment tracking view presents the full course of treatment, supporting clinical documentation and patient communication.

### 15.3 Use Case — Laser Treatment for Vascular Lesion

A 28-year-old patient presents for treatment of a facial spider angioma. The dermatologist assesses the lesion and recommends pulsed dye laser therapy; the cosmetic procedure consent is documented. At the treatment session, the laser parameters are captured through the laser treatment record (laser type, wavelength, spot size, fluence, pulse duration); before imaging is acquired through the Integration module (M17). The treatment is performed; the immediate tissue response (erythema and purpura) is documented. The after image is acquired at the follow-up visit 6 weeks later; the before/after image pair is presented in the longitudinal image series view. The patient's response is satisfactory; no further treatment is required.

### 15.4 Use Case — Mohs Micrographic Surgery for Basal Cell Carcinoma

A 70-year-old patient presents with a biopsy-proven basal cell carcinoma on the nose. The dermatologist recommends Mohs micrographic surgery; the procedure is scheduled. At the procedure visit, the consent is documented; the first stage of excision is performed; the specimen is processed in the in-room pathology laboratory; the margins are examined. The margins are positive at one edge; a second stage of excision is performed at the positive margin; the second stage is processed and examined. The margins are now clear; the defect is closed using a flap reconstruction. The full procedure is documented in the Mohs surgery report through the Documents module (M07); the specimen handling, stage-by-stage findings, and reconstruction are recorded. The pathology result is filed in the patient's record; the patient is scheduled for surveillance at the standard interval for basal cell carcinoma.

### 15.5 Use Case — Cosmetic Botulinum Toxin Injection

A 45-year-old patient presents for cosmetic botulinum toxin injection for glabellar lines. The cosmetic procedure consent is documented, including consent for before/after imaging and consent for image use in clinical documentation. The procedure is performed; the product, lot number, injection sites, and quantity per site are documented in the cosmetic procedure record. Before imaging is acquired before injection; after imaging is acquired at the follow-up visit 2 weeks later. The before/after image pair is delivered to the patient through the patient portal; the image access is logged. The patient is satisfied with the outcome; a follow-up appointment is scheduled at the typical 3- to 4-month interval for botulinum toxin retreatment.

### 15.6 Use Case — Isotretinoin Management for Severe Acne

A 19-year-old patient with severe nodulocystic acne is initiated on isotretinoin. The patient is enrolled in the regional isotretinoin monitoring program (where required); the controlled substance documentation is recorded. Two negative pregnancy tests are documented (for female patients) per regional requirements; the patient is registered in the regional isotretinoin registry. Monthly follow-up visits are scheduled; at each visit, the patient's pregnancy status is verified, laboratory results (lipid panel, liver function, complete blood count) are reviewed, and the next month's prescription is issued through the Pharmacy module (M05). The patient's acne improves over the 6-month course; the treatment is completed and documented in the longitudinal record.

---

## 16. Best Practices

### 16.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; cosmetic procedure consent templates and controlled substance monitoring requirements vary by region.
2. Validate image management integration carefully before go-live; image quality and image-to-lesion linkage are foundational to clinical documentation in dermatology.
3. Configure body diagram localization carefully; the body diagram convention should match the regional anatomic convention used by the facility's dermatologists.
4. Use the configuration sandbox for all changes to laser parameter capture, cosmetic consent templates, and controlled substance monitoring rules; these changes have direct patient safety and regulatory compliance implications.
5. Maintain the dermatology morphology vocabulary through the Localization module (M19); vocabulary consistency across facilities within a tenant supports cross-facility reporting and clinical governance.

### 16.2 Operational Best Practices

6. Conduct full skin examinations at surveillance visits rather than focused examinations of the prior lesion site; new primary skin cancers are more common than local recurrences in patients with prior skin cancer.
7. Use longitudinal lesion tracking for all lesions of clinical concern; the trajectory of a lesion over time is more clinically informative than a single-point assessment.
8. Maintain complete laser treatment records including parameters and equipment identifiers; the records support adverse event investigation and equipment quality monitoring.
9. Use the before/after imaging capability consistently for laser and cosmetic procedures; the imaging supports both clinical decision-making and patient communication.
10. Maintain accurate pathology order and result linkage to lesion records; the linkage supports skin cancer surveillance and longitudinal tracking of pathology diagnoses.

### 16.3 Governance Best Practices

11. Conduct a quarterly pathology diagnosis distribution review with the clinical lead; this review validates diagnostic patterns and identifies any unusual clusters that may warrant investigation.
12. Conduct an annual cosmetic procedure consent audit; this audit validates that cosmetic-specific consent is captured for every cosmetic procedure and that image use consent is captured where applicable.
13. Conduct a monthly adverse event review for laser and procedural treatments; this review supports clinical governance and identifies opportunities for protocol refinement.

---

## 17. Related Documents

### 17.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C07 Dermatology; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model; Section 26 governs integration philosophy |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.3 covers medical specialty single-specialty facilities including dermatology; Section 6 documents module recommendations |

### 17.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 12 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 12.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 8 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| Ophthalmology | `docs/06_CLINIC_TYPES/OPHTHALMOLOGY.md` | Related specialty with shared image management patterns |
| Oncology | `docs/06_CLINIC_TYPES/ONCOLOGY.md` | Related specialty for skin cancer coordination (where applicable) |

### 17.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Changes — including overlay revisions, morphology vocabulary updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
