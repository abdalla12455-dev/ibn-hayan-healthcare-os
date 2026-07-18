# Ibn Hayan Healthcare Operating System
## Pediatrics Clinics

| Field | Value |
|---|---|
| Document Title | Pediatrics Clinics Configuration Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Clinic Type Configuration Reference |
| Authority Level | Authoritative — Elaboration of CLINIC_TYPES.md and PRODUCT_BIBLE Section 18 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when the pediatrics overlay is amended or when regional immunization schedules change |
| Audience | Implementation consultants, customer success teams, clinical informatics leads, configuration architects, customers evaluating Ibn Hayan for pediatrics facilities |
| Scope | Specialty overview, target facilities, recommended modules, growth charts and percentiles, vaccination schedules, developmental milestones, pediatric dosage calculations, parent/guardian portal, specialty workflows, conceptual data models, forms and templates, reports and analytics, role and permission recommendations, configuration defaults, onboarding checklist, sample use cases, and best practices for pediatrics (clinic type C04) facilities on Ibn Hayan |
| Out of Scope | Implementation details, source code, API endpoints, database schemas, individual configuration keys, per-tenant operational runbooks, neonatal intensive care-specific clinical decision support rule definitions |
| Conflict Resolution | In case of conflict, CLINIC_TYPES.md and PRODUCT_BIBLE.md prevail. This document elaborates the pediatrics clinic type configuration without overriding the catalogue stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section placeholders only) |

---

## Table of Contents

1. Specialty Overview
2. Target Facilities
3. Recommended Modules
4. Growth Charts & Percentiles
5. Vaccination Schedules
6. Developmental Milestones
7. Pediatric Dosage Calculations
8. Parent/Guardian Portal
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

### 1.1 Definition and Scope of Practice

Pediatrics is the medical specialty concerned with the health and medical care of infants, children, and adolescents, typically from birth through age 18 (or age 21 in some jurisdictions). The pediatrician provides comprehensive care including well-child visits, acute illness management, chronic disease management, developmental surveillance, immunization administration, and adolescent medicine. Scope of practice includes monitoring growth and development, administering age-appropriate screenings, managing common childhood illnesses, coordinating care with pediatric subspecialists, and supporting families through the parenting years. Ibn Hayan treats pediatrics as clinic type C04 in the catalogue defined by `CLINIC_TYPES.md` Section 2.1, with configuration complexity rated Medium (reflecting minor consent and parental access considerations) and recommended editions Essential (E1) and Professional (E2).

### 1.2 Patient Population and Clinical Activities

The pediatric patient population spans neonates through late adolescents, with each developmental stage presenting distinct clinical priorities: neonatal feeding and weight gain, infant developmental milestones and immunizations, toddler growth and behavior, school-age learning and socialization, and adolescent physical and emotional development. Clinical activities include well-child visits at scheduled intervals, acute illness visits, chronic disease management (asthma, diabetes, epilepsy, congenital conditions), developmental and behavioral screening, immunization administration, school and sports physical examinations, and adolescent confidential care. The pediatric encounter is distinctive in that the patient is accompanied by a parent or guardian who provides much of the history and who holds legal authority for medical decisions until the patient reaches the age of consent or emancipation, which creates particular configuration requirements around consent capture, parental portal access, and adolescent confidentiality.

### 1.3 Why Pediatrics Needs Specialized Configuration

Pediatrics requires specialized configuration across several dimensions: age-specific growth tracking with WHO (World Health Organization) and CDC (Centers for Disease Control and Prevention) growth charts, age-based immunization schedules aligned to regional frameworks, weight-based dosing for medications (with most pediatric medications dosed per kilogram of body weight), developmental screening at age-appropriate intervals, and parental portal access that transitions to patient-controlled access as the patient approaches the age of majority. Ibn Hayan's pediatrics overlay addresses these requirements through specialty-specific modules and templates, with configuration defaults reflecting typical pediatric practice. The overlay is documented in `CLINIC_TYPES.md` Section 3.2 and is positioned at the clinic-type configuration layer per `SYSTEM_ARCHITECTURE.md` Section 12.3.

### 1.4 Relationship to Adolescent and Subspecialty Care

Pediatrics overlaps with adolescent medicine at the upper age range, with several internal medicine and family medicine practitioners also seeing adolescent patients. Pediatrics also frequently coordinates with pediatric subspecialties (pediatric cardiology, pediatric neurology, pediatric endocrinology, pediatric oncology) and with school health services. Ibn Hayan's multi-specialty configuration approach, documented in `CLINIC_TYPES.md` Section 4, supports the composition of pediatrics with related specialties within a multi-specialty facility or hospital outpatient department. The platform's permission framework handles the transition of patients from pediatric to adult care, including the transfer of record custodianship and the removal of parental portal access when the patient reaches the age of majority.

---

## 2. Target Facilities

### 2.1 Typical Facility Sizes

Pediatrics operates across the small to mid-sized facility spectrum, from solo pediatrician practices through hospital outpatient pediatric departments. The most common configurations are solo practices (one pediatrician, one to two support staff), small group practices (two to five pediatricians), mid-sized group practices (six to twelve pediatricians with embedded nursing and care coordination), and hospital outpatient pediatric departments (operating as a service line within a hospital). Ibn Hayan's Essential edition (E1) supports solo and small group practices per `PRODUCT_BIBLE.md` Section 16.4, while the Professional edition (E2) is the typical fit for mid-sized group practices per Section 16.5. Enterprise edition (E3) is required where pediatrics operates as a hospital outpatient department with inpatient admitting privileges and integration with hospital systems including neonatal intensive care units.

### 2.2 Ownership Patterns and Geographic Considerations

Pediatric facilities operate under private practice ownership, physician-group ownership, hospital-employment models, academic medical centre ownership, and government-operated models. Pediatric practices in rural settings frequently serve as the only source of pediatric care for a large geographic area and require strong offline-first behaviour for connectivity resilience; urban practices typically operate with higher patient volume and more developed administrative infrastructure. School health services integration is a consideration for pediatric facilities that provide school-based health services or that receive school health referrals. Ibn Hayan's offline-first posture, documented in `SYSTEM_ARCHITECTURE.md` Section 4.11 (P11), supports rural practices directly, while the Localization module (M19) handles regional regulatory frameworks including mandatory immunization reporting to public health authorities and school health record reporting.

### 2.3 Regulatory Environment

Pediatrics operates within a regulatory environment that includes minor consent laws (which vary by jurisdiction and by clinical context — mental health, reproductive health, substance use often have different consent ages than general medical care), mandatory immunization reporting, child abuse and neglect reporting obligations, parental access to minor records (with carve-outs for confidential adolescent services), and school health record requirements. Ibn Hayan's permission framework supports the layered consent and access model required for pediatrics, with parental portal access that automatically restricts at the age of majority and with confidential adolescent encounter segregation that is enforced at the platform layer. The Audit module (M16) records every access to minor records, supporting regulatory compliance and parental notification requirements.

---

## 3. Recommended Modules

### 3.1 Module Composition Approach

The recommended module composition for pediatrics reflects the specialty's emphasis on preventive care, immunization management, growth and developmental tracking, and family-centered care. The recommendation is a starting point documented in `CLINIC_TYPES.md` Section 6; customers may add modules beyond the recommendation subject to edition packaging rules per `PRODUCT_BIBLE.md` Section 16.7 and module dependency rules per `SYSTEM_ARCHITECTURE.md` Section 13.4.

### 3.2 Module Recommendation Table

| Module | Code | Recommendation | Rationale |
|---|---|---|---|
| Patient | M01 | Required | Pediatric patient registration with parental/guardian linkage |
| Encounter | M02 | Required | Encounter management across well-child, acute, and chronic visits |
| Clinical Documentation | M03 | Required | Pediatric-specific documentation templates, growth records, developmental screening |
| Orders & Results | M04 | Required | Laboratory, imaging, referral orders; weight-based dosing support |
| Pharmacy | M05 | Required | Weight-based pediatric dosing, parental consent for medications |
| Scheduling | M06 | Required | Well-child visit scheduling, immunization visit scheduling |
| Documents | M07 | Required | School physical forms, immunization certificates, parental letters |
| Notifications | M08 | Required | Immunization reminders, well-child visit reminders, parental notifications |
| Billing | M09 | Required | Encounter billing, well-child visit billing, vaccine billing |
| Accounting | M10 | Optional | For practices maintaining their own books |
| CRM | M11 | Optional | Recall campaigns, newborn outreach |
| HR | M12 | Optional | For practices with employed staff |
| Workforce | M13 | Optional | For practices requiring shift scheduling |
| Identity & Access | M14 | Required | Parental portal access, adolescent confidentiality enforcement |
| Configuration | M15 | Required | Configuration management for the overlay |
| Audit | M16 | Required | Audit trail for minor records access |
| Integration | M17 | Conditional | Required for immunization registry reporting and school health integration |
| Reporting | M18 | Required | Immunization coverage, growth tracking, developmental screening reports |
| Localization | M19 | Required | Regional immunization schedules, growth chart standards, consent age frameworks |

### 3.3 Module Composition by Facility Size

| Facility Size | Recommended Edition | Core Modules | Optional Modules Often Added |
|---|---|---|---|
| Solo practice (T1) | E1 | M01–M09, M14–M19 | M11, M17 |
| Small group practice (T2) | E1 | M01–M09, M14–M19 | M10, M11, M17 |
| Mid-sized group practice (T3) | E2 | M01–M09, M14–M19 | M10, M11, M12, M13, M17 |
| Large group practice (T4) | E2 | M01–M09, M11, M12, M13, M14–M19 | M10, M17 |
| Hospital outpatient department (T5) | E3 | M01–M19 (all) | None typical (full catalogue) |

---

## 4. Growth Charts & Percentiles

### 4.1 Capability Overview

Growth tracking is the foundational clinical activity of pediatrics, providing the longitudinal data that allows the pediatrician to assess nutritional status, detect endocrine and metabolic disorders, monitor chronic disease impact on growth, and reassure parents about normal variation. Growth is tracked across weight, length/height, head circumference, and body mass index, with each measure plotted against age- and sex-specific percentile references. Ibn Hayan's growth chart capability, implemented through the Clinical Documentation module (M03) with registry integration through the Reporting module (M18), supports WHO growth standards for children aged 0 to 2 years and CDC growth references for children aged 2 to 20 years, with automatic switching at age 2 and with support for alternative growth references (such as Down syndrome-specific charts) where applicable.

### 4.2 Growth Chart Configuration

Growth chart configuration is managed through the Localization module (M19), with the regional framework applied to the tenant determining the default chart set. Customers may add specialty-specific growth references (such as syndrome-specific charts for genetic conditions, premature infant growth charts, or trisomy 21 growth charts) through configuration; specialty references are validated against the patient's recorded conditions and are surfaced automatically when applicable. The growth chart configuration is versioned and is updated when chart references are revised by the issuing authority (WHO, CDC, or specialty organizations); updates are communicated through the platform's change-management channel per `CLINIC_TYPES.md` Section 10.4.

### 4.3 Percentile Calculation and Display

Percentile calculation is performed automatically based on the patient's age, sex, and recorded measurements, with results displayed numerically and graphically. The graphic display plots the current measurement alongside prior measurements, allowing the clinician to assess growth trajectory rather than isolated measurements. Deviations from expected growth trajectories (such as crossing two major percentile lines or persistent flattening of growth) are flagged for clinician attention. The percentile calculation method is consistent with the issuing authority's published methodology; customers may not modify the calculation method but may configure the threshold at which deviations are flagged.

### 4.4 Growth Registry Integration

Growth data integrates with chronic disease registries for conditions affecting growth (failure to thrive, obesity, eating disorders, endocrine disorders), allowing registry views to present growth trajectory alongside disease-specific indicators. Patients flagged for growth concern are automatically added to the relevant registry for longitudinal tracking; registry membership is reviewed at each well-child visit and is removed when growth normalizes or when the underlying condition resolves. Growth registry integration supports the early identification of growth-related conditions, which is one of the highest-value clinical activities of pediatrics.

---

## 5. Vaccination Schedules

### 5.1 Capability Overview

Immunization administration is a core pediatric activity, with the pediatrician responsible for ensuring that each patient receives the right immunizations at the right intervals according to the regional immunization schedule. The pediatric immunization schedule is complex, with multiple vaccines administered at overlapping intervals, catch-up schedules for patients who fall behind, and contra-indications and precautions that must be checked before each dose. Ibn Hayan's immunization capability, implemented through the Pharmacy module (M05) with scheduling integration through the Scheduling module (M06) and reporting through the Reporting module (M18), supports age-based schedule adherence, catch-up schedule calculation, contra-indication checking, immunization record maintenance, and reporting to public health immunization registries.

### 5.2 Schedule Configuration

The immunization schedule is configured through the Localization module (M19), with the regional framework applied to the tenant determining the default schedule. The schedule includes the vaccine series, the recommended age for each dose, the minimum interval between doses, the minimum age for each dose, and the catch-up schedule for patients who fall behind. Schedule configuration is versioned and is updated when the regional immunization authority revises the schedule; updates are communicated through the platform's change-management channel. Customers may add supplementary schedules (such as travel medicine schedules or outbreak-response schedules) through configuration, with supplementary schedules validated against the patient's age, prior immunizations, and travel or exposure history.

### 5.3 Schedule Adherence and Catch-up

At each encounter, the immunization capability presents the vaccines due or overdue for the patient, based on the patient's age, prior immunizations, and the regional schedule. Vaccines that are due are flagged for administration at the current visit; vaccines that are overdue are flagged for catch-up administration; vaccines that are not yet due are surfaced for scheduling at the appropriate future date. The catch-up schedule calculation is performed automatically based on the regional framework's catch-up rules, with the calculation presenting the recommended catch-up series and the projected dates of subsequent doses. Catch-up calculations are recorded in the patient's record, supporting longitudinal tracking of catch-up series completion.

### 5.4 Contra-indication and Precaution Checking

Before each immunization administration, the capability performs contra-indication and precaution checking against the patient's recorded conditions, allergies, and prior immunization reactions. Severe contra-indications (such as anaphylaxis to a prior dose or to a vaccine component) trigger a hard stop that prevents administration; precautions (such as moderate or severe acute illness) trigger a warning that the clinician may override with documented rationale. The contra-indication knowledge base is maintained centrally and is updated through the Localization module (M19); customers may not modify the contra-indication knowledge base but may configure the threshold at which warnings appear. Every contra-indication acknowledgment, override, and rationale is recorded in the audit trail.

### 5.5 Immunization Registry Reporting

Immunization administration is reported to the regional public health immunization registry through the Integration module (M17), using the regional registry's standard reporting format. Reporting is automatic upon administration, with a confirmation receipt recorded in the patient's record; reporting failures trigger a retry workflow and an alert to the care team. The immunization registry reporting capability supports the public health function of immunization coverage monitoring and is required by regulation in most jurisdictions. Customers are responsible for confirming that the regional immunization registry integration is configured and operational before go-live.

---

## 6. Developmental Milestones

### 6.1 Capability Overview

Developmental surveillance is the longitudinal monitoring of a child's achievement of developmental milestones across gross motor, fine motor, speech and language, social-emotional, and cognitive domains. Developmental concerns identified through surveillance trigger structured developmental screening, and confirmed delays trigger referral to early intervention services and pediatric developmental subspecialties. Ibn Hayan's developmental milestone capability, implemented through the Clinical Documentation module (M03) with registry integration through the Reporting module (M18), supports age-based milestone tracking, structured developmental screening tools, and referral workflows for confirmed delays.

### 6.2 Milestone Tracking Configuration

Milestone tracking is configured by developmental domain and by age range, with milestones grouped into the standard pediatric age intervals (newborn, 2 months, 4 months, 6 months, 9 months, 12 months, 15 months, 18 months, 2 years, 30 months, 3 years, 4 years, and annually thereafter). At each well-child visit, the developmental milestone template prompts the clinician to document the child's achievement of milestones expected for the current age range, with documentation structured by domain. Milestones that are not achieved are flagged for follow-up; persistent delays trigger structured developmental screening. The milestone configuration is versioned and is reviewed by pediatric clinical informaticists when the underlying developmental surveillance guidance is revised.

### 6.3 Structured Developmental Screening Tools

Ibn Hayan ships configuration for commonly used structured developmental screening tools, including parent-completed screening questionnaires (such as the Ages and Stages Questionnaire and the Parents' Evaluation of Developmental Status) and clinician-administered screening tools. The screening tools are presented at the recommended ages per the regional framework, with results scored automatically and presented alongside the patient's milestone tracking. Screening results that indicate developmental concern trigger referral workflows to early intervention services and to pediatric developmental subspecialties. The screening tool configuration is versioned and is updated when the tool publishers revise the tools; updates are communicated through the platform's change-management channel.

### 6.4 Referral and Follow-up

Confirmed developmental delays trigger referral workflows through the Orders & Results module (M04), with referrals directed to early intervention services (for children under age 3), to school-based services (for children aged 3 and older), and to pediatric developmental subspecialties as appropriate. The referral workflow tracks receipt of the specialist report and incorporates the report into the patient's record, supporting longitudinal coordination of developmental care. The developmental registry, configured through the Reporting module (M18), maintains cohort membership for children with identified developmental concerns, with registry review at each well-child visit and registry removal when developmental concerns resolve.

---

## 7. Pediatric Dosage Calculations

### 7.1 Capability Overview

Pediatric medication dosing is weight-based for most medications, with the dose per kilogram calculated at the point of prescribing and with the calculated dose checked against the maximum adult dose to prevent accidental overdose. Weight-based dosing is particularly important for medications with narrow therapeutic windows (such as antiepileptics, antibiotics, and chemotherapeutic agents) and for patients at the extremes of weight (premature infants, obese adolescents). Ibn Hayan's pediatric dosage calculation capability, implemented through the Pharmacy module (M05), supports automatic weight-based dose calculation at order entry, maximum dose checking, age-based dosing rules (where applicable), and dose rounding rules appropriate for the medication formulation.

### 7.2 Weight-Based Dose Calculation

At order entry, the Pharmacy module (M05) retrieves the patient's most recent weight from the Clinical Documentation module (M03) and calculates the weight-based dose using the medication's pediatric dosing guidance from the medication knowledge base. The calculated dose is presented to the prescriber for confirmation or adjustment; if the calculated dose exceeds the maximum adult dose, the dose is capped at the maximum and the prescriber is notified. The weight used for calculation must be current; if the most recent weight is older than the configured threshold (default 30 days for infants, 90 days for older children), the prescriber is prompted to obtain a current weight before proceeding. The weight-based calculation is recorded in the audit trail, supporting clinical governance review and regulatory compliance.

### 7.3 Age-Based Dosing Rules

Some pediatric medications have age-based dosing rules rather than weight-based rules (such as acetaminophen dosing by age in some formularies, or vaccine dosing by age per the immunization schedule). The medication knowledge base supports both weight-based and age-based dosing rules, with the appropriate rule applied based on the medication's configuration. Where both weight-based and age-based rules exist for a medication, the capability applies the more conservative calculation (typically the lower dose) and surfaces the calculation method to the prescriber for confirmation. Age-based dosing rules are particularly important for over-the-counter medications and for vaccines, where weight-based calculation is not the standard.

### 7.4 Dose Rounding and Formulation

Dose rounding rules are configured per medication and per formulation, with the rules reflecting the available formulation strengths and the precision of the dosing device (oral syringe, measuring cup, tablet splitter). The dose rounding rules are designed to produce doses that are practically administrable by parents and caregivers; for liquid formulations, the rule typically rounds to the nearest 0.5 mL or 1 mL depending on the dosing device; for tablets, the rule rounds to the nearest half or quarter tablet where splitting is acceptable. Dose rounding rules are maintained in the medication knowledge base and are updated through the Localization module (M19) to reflect regional formulation availability.

---

## 8. Parent/Guardian Portal

### 8.1 Capability Overview

The parent/guardian portal is a defining capability of pediatrics, providing parents and legal guardians with access to their child's health record, appointment management, secure messaging with the care team, and educational resources. Portal access is configured to reflect the legal framework governing parental authority: parents and legal guardians have full access to the child's record during childhood, with access automatically restricted at the age of majority or at the age of confidential adolescent care consent (where applicable). Ibn Hayan's parent portal capability is implemented through the Identity & Access module (M14) and the Notifications module (M08), with integration through the Integration module (M17) where applicable.

### 8.2 Portal Access Configuration

Portal access is configured per patient-parent relationship, with the relationship validated at portal provisioning and re-validated at defined intervals (default annually). The configuration supports multiple parents and guardians for a single patient, with each parent or guardian holding independent portal credentials and access permissions; the configuration also supports foster care and guardianship arrangements where access is granted to non-parent legal guardians. Portal access is automatically restricted at the configured age of majority or at the age of confidential adolescent care consent, with the restriction applied to general record access while preserving parental access to administrative functions (such as appointment scheduling and billing) until the patient reaches the age of majority. The restriction is enforced at the platform layer; parental access cannot be restored without explicit patient authorization.

### 8.3 Confidential Adolescent Encounter Segregation

Adolescent encounters for confidential services (mental health, reproductive health, substance use, and other services for which the adolescent has independent consent authority under regional law) are segregated from parental portal access through the permission framework. The segregation is applied at the encounter level; the encounter is documented in the patient's record but is not visible through the parent portal. The segregation is enforced across all portal surfaces, including appointment lists, message threads, and document access; the segregation cannot be overridden by parental request. Confidential adolescent encounter segregation is a regulatory requirement in most jurisdictions and is enforced at the platform layer per the customization prohibition in `CLINIC_TYPES.md` Section 8.3.

### 8.4 Portal Functionality

Portal functionality includes appointment scheduling (within configured availability windows), appointment reminders, secure messaging with the care team (with routing rules and turnaround targets), immunization record access, growth chart access, laboratory result access (with release rules configured per patient age and per result type), after-visit summary access, and educational resource delivery. Portal functionality is configurable per patient age range and per care team; for example, adolescent patients may have their own portal access with confidential messaging to the care team, separate from the parental portal. Portal use is recorded in the audit trail, supporting both clinical governance and regulatory compliance.

---

## 9. Specialty Workflows

### 9.1 Specialty Workflow Catalogue

| Workflow | Trigger | Steps | Roles Involved | Modules |
|---|---|---|---|---|
| Well-child visit | Scheduled age-based visit | Vitals, growth, developmental surveillance, immunization, anticipatory guidance, screening | Nurse, Physician | M02, M03, M04, M05, M06 |
| Acute illness visit | Walk-in or scheduled | Triage, focused H&P, assessment, treatment, disposition | Nurse, Physician | M02, M03, M06 |
| Immunization administration | Schedule or walk-in | Verify due immunization, contra-indication check, consent, administer, document, schedule next | Nurse, Physician | M03, M04, M05, M08 |
| Developmental screening | Scheduled screening age | Administer screening tool, score, interpret, refer if indicated | Nurse, Physician | M03, M04 |
| School physical | Scheduled or walk-in | Comprehensive exam, completion of school form, immunization review | Physician | M03, M07 |
| Chronic disease review (e.g., asthma) | Scheduled recall | Registry review, structured assessment, medication review, action plan update | Nurse, Physician | M02, M03, M04, M05, M18 |
| Newborn discharge follow-up | Newborn discharged from hospital | Review discharge summary, weight check, feeding assessment, jaundice assessment, immunization | Nurse, Physician | M02, M03, M04, M05, M07 |
| Adolescent confidential visit | Patient-initiated | Confidential H&P, assessment, treatment, documentation with segregation | Physician | M02, M03 |

---

## 10. Specialty Data Models

### 10.1 Conceptual Entity Overview

The pediatrics data model extends the platform's standard patient-encounter-centric model with entities for parent/guardian relationships, growth records, immunization records, developmental milestone records, and school forms. The model is encounter-centred per `SYSTEM_ARCHITECTURE.md` Section 12.6; specialty-specific entities sit alongside the standard model without altering its structure.

### 10.2 Specialty-Specific Conceptual Entities

| Entity | Description | Primary Conceptual Attributes |
|---|---|---|
| Parent/guardian relationship | Documented relationship between a patient and a parent or legal guardian | Patient, parent/guardian identity, relationship type, custody arrangement, portal access scope, access expiration date |
| Growth record | Longitudinal record of weight, length/height, head circumference, BMI | Patient, encounter, measurement type, value, measurement date, percentile, z-score |
| Immunization record | Documentation of an administered immunization | Patient, vaccine, dose number, route, site, administration date, lot number, administering clinician, contra-indication check |
| Developmental milestone record | Documentation of milestone achievement at a well-child visit | Patient, encounter, milestone domain, milestone, status (achieved/emerging/not achieved), screening tool result |
| School physical form | Completed school physical form for school submission | Patient, encounter, form type, completion date, completion clinician, school identifier |
| Confidential encounter flag | Flag indicating encounter is segregated from parental portal access | Patient, encounter, segregation scope, regional legal basis |
| Pediatric chronic disease registry entry | Cohort membership for pediatric chronic disease (asthma, diabetes, etc.) | Patient, registry type, enrolment date, monitoring indicators, treatment targets, review cadence |

### 10.3 Entity Relationships

The parent/guardian relationship references the patient and the parent/guardian's identity record; the relationship governs portal access per the access scope attribute. The growth record is encounter-linked and references the patient; growth records accumulate over time to form the longitudinal growth trajectory. The immunization record is encounter-linked but persists independently as a longitudinal record; the immunization record references the immunization schedule framework applied at administration. The developmental milestone record is encounter-linked and references the milestone configuration; milestone records accumulate over time to form the developmental trajectory. The confidential encounter flag is encounter-linked and is enforced by the permission framework across all portal surfaces.

---

## 11. Forms & Templates

### 11.1 Encounter Templates

| Template | Encounter Type | Use Case |
|---|---|---|
| Well-child visit template | Outpatient | Comprehensive well-child visit with growth, development, immunization, and anticipatory guidance components |
| Acute visit template | Outpatient | Focused acute presentation with abbreviated history and examination |
| Newborn follow-up template | Outpatient | Newborn discharge follow-up with feeding assessment, jaundice assessment, weight check |
| Adolescent confidential visit template | Outpatient | Confidential adolescent encounter with appropriate documentation and segregation |
| Chronic disease review template | Outpatient | Disease-specific structured assessment (e.g., asthma, diabetes) |
| School physical template | Outpatient | Comprehensive examination with school form completion |
| Sports physical template | Outpatient | Pre-participation sports physical examination |
| Telehealth consultation template | Telehealth | Remote consultation with consent-to-telehealth fields |

### 11.2 Forms and Documents

| Form | Purpose | Source Module |
|---|---|---|
| Immunization certificate | Patient-facing immunization record for school or camp submission | M07 Documents |
| School physical form | Completed school physical form | M07 Documents |
| Sports clearance form | Sports participation clearance | M07 Documents |
| Asthma action plan | Patient-facing pediatric asthma action plan for school and home use | M07 Documents |
| After-visit summary | Parent-facing summary of the encounter | M07 Documents |
| Growth chart report | Parent-facing growth chart visualization | M18 Reporting |
| Anticipatory guidance handout | Parent-facing age-appropriate anticipatory guidance | M07 Documents |

---

## 12. Reports & Analytics

### 12.1 Clinical Outcome Reports

| Report | Purpose | Cadence |
|---|---|---|
| Immunization coverage report | Fraction of eligible patients up to date on immunizations by vaccine and age | Monthly |
| Well-child visit completion report | Fraction of age-eligible patients with completed well-child visit in target window | Quarterly |
| Growth concern registry | Patients flagged for growth concern, by type | On demand |
| Developmental screening completion report | Fraction of age-eligible patients with completed developmental screening | Quarterly |
| Chronic disease registry dashboard | Pediatric chronic disease cohort status (asthma, diabetes, etc.) | On demand |

### 12.2 Operational Reports

| Report | Purpose | Cadence |
|---|---|---|
| Encounter volume report | Encounters per clinician, by type | Weekly |
| No-show rate report | Missed appointments by clinician and patient cohort | Weekly |
| Slot utilization report | Fraction of available slots filled per clinician | Weekly |
| Billing performance report | Claims submitted, paid, denied, by payer | Monthly |
| Parental portal engagement report | Portal use metrics by parent cohort | Quarterly |

### 12.3 Regulatory Reports

Regulatory reports include immunization coverage reporting to public health authorities (required in most jurisdictions), child abuse and neglect reporting records (where the pediatrician is a mandated reporter), and school health reporting. The specific reports required vary by jurisdiction; customers are responsible for confirming that the regional framework applied to their tenant produces the regulatory reports they require.

---

## 13. Role & Permission Recommendations

### 13.1 Recommended Role Set

| Role | Code | Typical Responsibilities in Pediatrics |
|---|---|---|
| Physician (Pediatrician) | R01 | Clinical assessment, diagnosis, treatment, orders, documentation, immunization |
| Nurse | R02 | Nursing assessment, vital signs, immunization administration, growth measurement, parent education |
| Receptionist | R06 | Patient registration, scheduling, check-in |
| Scheduler | R07 | Appointment management, recall management |
| Biller | R08 | Billing, claim submission, vaccine billing |
| Administrator | R09 | Facility administration, configuration oversight, operational reporting |
| System administrator | R13 | Tenant configuration, integration management, parental portal provisioning |
| Parent/guardian portal role | Custom | Parent/guardian access to child's record via portal (scoped to parent-child relationship) |
| Adolescent patient portal role | Custom | Adolescent patient access to own record via portal (with confidential encounter access) |
| School nurse role | Custom | School nurse access to immunization and school physical records for verified school patients |

### 13.2 Permission Scope Recommendations

Permissions are scoped by facility, by care team, by patient cohort, and by parent-child relationship per `PRODUCT_BIBLE.md` Section 21.4. Pediatric facilities typically scope physician and nurse access to the facility level. Parental portal access is scoped to the parent-child relationship; the relationship is validated at provisioning and re-validated annually. School nurse access (where configured) is scoped to specific patients for whom the parent has authorized school nurse access, with access limited to immunization and school physical records. Confidential adolescent encounter segregation is enforced at the platform layer and is not subject to facility, care team, or cohort override.

### 13.3 Custom Role Recommendations

Common custom roles for pediatrics include the Parent Portal role (composed of read and message permissions scoped to the parent-child relationship), the Adolescent Patient Portal role (composed of read and message permissions scoped to the adolescent patient with confidential encounter access), the School Nurse role (composed of limited read permissions scoped to specific patients with parental authorization), and the Care Coordinator role (composed of nurse and scheduler permissions scoped to chronic disease registry cohorts). Custom roles are tenant-scoped per `PRODUCT_BIBLE.md` Section 20.5.

---

## 14. Configuration Defaults

### 14.1 Scheduling Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Well-child visit slot duration | 20 minutes | Customer-adjustable per age range |
| Acute visit slot duration | 10 minutes | Customer-adjustable |
| Immunization visit slot duration | 10 minutes | Customer-adjustable |
| Newborn follow-up slot duration | 20 minutes | Customer-adjustable |
| Adolescent confidential visit slot duration | 20 minutes | Customer-adjustable |
| Chronic disease review slot duration | 30 minutes | Customer-adjustable |
| Daily encounter cap per clinician | 25 encounters | Customer-adjustable |

### 14.2 Clinical Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Default growth chart framework | WHO 0–2 years, CDC 2–20 years | Configurable through Localization module (M19) |
| Default immunization schedule | Regional schedule | Configured through Localization module (M19) |
| Default developmental screening tools | Ages and Stages Questionnaire, Parents' Evaluation of Developmental Status | Customer-adjustable |
| Weight recency threshold for dosing | 30 days (infants), 90 days (children) | Customer-adjustable |
| Parental portal access expiration | Age of majority or age of confidential adolescent care consent | Configured through Localization module (M19) |

### 14.3 Confidentiality Defaults

| Configuration | Default Value | Notes |
|---|---|---|
| Confidential encounter segregation | Applied for mental health, reproductive health, substance use encounters | Configurable per regional legal framework |
| Parental portal access restriction age | Regional age of majority | Configured through Localization module (M19) |
| Adolescent patient portal activation age | Regional age of adolescent care consent | Configured through Localization module (M19) |

---

## 15. Onboarding Checklist

### 15.1 Onboarding Steps

1. Confirm clinic type selection: Confirm that pediatrics (C04) is the primary clinic type for the facility.
2. Activate the pediatrics overlay: Apply the clinic type overlay to the facility configuration.
3. Enable recommended modules: Enable the core modules listed in Section 3.2.
4. Configure the regional framework: Through the Localization module (M19), apply the regional immunization schedule, growth chart framework, consent age framework, and public health reporting rules.
5. Configure growth chart references: Confirm that the default WHO/CDC references are appropriate for the patient population; add specialty references (e.g., Down syndrome, premature infant) where applicable.
6. Configure immunization schedule: Confirm that the regional immunization schedule is loaded; verify catch-up schedule rules and contra-indication knowledge base currency.
7. Configure developmental screening tools: Enable the default screening tools; configure administration ages per the regional framework.
8. Configure pediatric dosing: Verify weight-based dosing configuration, weight recency thresholds, and dose rounding rules.
9. Configure parent/guardian portal: Configure portal access provisioning workflow, parental relationship validation, and automatic access restriction at the age of majority.
10. Configure confidential adolescent encounter segregation: Configure segregation rules per the regional legal framework; verify segregation enforcement across portal surfaces.
11. Configure encounter templates: Review the default encounter templates listed in Section 11.1; refine templates to match the facility's documentation standards.
12. Configure role set and permissions: Provision the roles listed in Section 13.1; configure permission scope by facility, care team, patient cohort, and parent-child relationship.
13. Configure integrations: Configure immunization registry reporting, school health integration, and (where applicable) hospital integration; validate integration data flow in the configuration sandbox.
14. Validate configuration: Run configuration validation per `SYSTEM_ARCHITECTURE.md` Section 15.4; conduct user acceptance testing with representative clinicians.
15. Conduct operational readiness assessment and go-live: Conduct structured review of the configuration against the facility's operational reality; document gaps and resolve before go-live.

---

## 16. Sample Use Cases

### 16.1 Use Case — Well-Child Visit at 12 Months

A 12-month-old patient presents for the scheduled well-child visit. The Scheduling module (M06) had generated a recall notification at the appropriate interval; the parent scheduled the visit through the parent portal. At the encounter, the Nurse records weight, length, head circumference, and vital signs; the Clinical Documentation module (M03) automatically plots the measurements on the WHO growth chart and flags no growth concerns. The developmental milestone template prompts the clinician to document milestones across gross motor, fine motor, speech and language, and social-emotional domains; all expected milestones are achieved. The immunization capability presents the vaccines due at 12 months; contra-indication checking is performed; the parent provides consent; the vaccines are administered and documented. The Reporting module (M18) reports the immunizations to the public health registry through the Integration module (M17). The after-visit summary is delivered to the parent portal.

### 16.2 Use Case — Acute Asthma Exacerbation

A 7-year-old patient with established asthma presents with acute wheezing and shortness of breath. The Nurse triages the patient and identifies moderate respiratory distress; the Physician uses the chronic disease review template to document the exacerbation in the context of the patient's asthma registry membership. Treatment is administered including a weight-based dose of oral corticosteroid (calculated by the Pharmacy module M05) and inhaled bronchodilator. The asthma action plan is reviewed with the parent and updated through the Documents module (M07); the updated plan is delivered to the parent portal and (with parental authorization) to the school nurse. A follow-up visit is scheduled within the configured post-exacerbation window.

### 16.3 Use Case — Developmental Delay Identification

At the 18-month well-child visit, the developmental milestone template documents that the patient has not achieved several expected speech and language milestones. The Physician administers the Ages and Stages Questionnaire through the Clinical Documentation module (M03); the screening result indicates developmental concern in the speech and language domain. The Orders & Results module (M04) generates a referral to early intervention services and to a pediatric developmental subspecialist; the referral is transmitted through the Integration module (M17). The patient is added to the developmental concern registry through the Reporting module (M18); a follow-up visit is scheduled at a shortened interval to monitor progress.

### 16.4 Use Case — Adolescent Confidential Visit

A 16-year-old patient presents without a parent for a confidential adolescent visit. The patient has been activated for adolescent portal access at the regional age of adolescent care consent. The Physician uses the adolescent confidential visit template; the encounter is documented with the confidential encounter flag applied, segregating the encounter from parental portal access. The Physician conducts the assessment, provides counseling, and arranges for any indicated investigations or treatment. The encounter is recorded in the patient's record; the parent portal continues to show administrative information (appointments, billing) but does not show the encounter documentation. The segregation is enforced at the platform layer and cannot be overridden.

### 16.5 Use Case — School Physical and Immunization Certificate

A 5-year-old patient presents for a school physical required for kindergarten enrollment. The Physician uses the school physical template, conducts the comprehensive examination, and reviews the immunization record to confirm completion of all required immunizations for school entry. The immunization capability identifies one missing immunization; the immunization is administered at the visit. The Documents module (M07) generates the completed school physical form and the immunization certificate; both documents are delivered to the parent portal for submission to the school. With parental authorization, the immunization record is shared with the school nurse role for ongoing school health management.

### 16.6 Use Case — Newborn Discharge Follow-up

A 2-week-old patient presents for newborn discharge follow-up after a routine hospital birth. The hospital discharge summary was received through the Integration module (M17) and filed in the patient's record. The Physician uses the newborn follow-up template, conducts a feeding assessment, weight check (with calculation of percentage birth weight loss and current trajectory), jaundice assessment, and general newborn examination. The growth chart is initiated with the birth weight and the current weight; the WHO growth chart framework is applied automatically. The immunization capability confirms that the hepatitis B birth dose was administered in hospital; the next immunizations are scheduled at the appropriate age. Anticipatory guidance is documented and delivered to the parent portal.

---

## 17. Best Practices

### 17.1 Configuration Best Practices

1. Configure the regional framework through the Localization module (M19) before any other configuration; immunization schedule and growth chart framework mismatches are the most common source of pediatric configuration defects.
2. Validate parental portal provisioning workflow carefully; the workflow must reflect the regional legal framework for parental authority and must enforce automatic restriction at the age of majority.
3. Configure weight recency thresholds appropriately; infants grow rapidly and a weight more than 30 days old may produce an incorrect dose calculation.
4. Use the configuration sandbox for all changes to immunization schedule, contra-indication knowledge base, and confidential encounter segregation rules; these changes have direct patient safety and regulatory compliance implications.
5. Maintain specialty growth references (Down syndrome, premature infant) for practices serving populations that need them; specialty references improve growth assessment accuracy for these patients.

### 17.2 Operational Best Practices

6. Conduct developmental surveillance at every well-child visit, not only at scheduled screening ages; surveillance between screenings is the primary mechanism for early identification of developmental concerns.
7. Use the immunization capability at every encounter to identify catch-up opportunities; acute visits and chronic disease reviews are opportunities to bring immunizations up to date.
8. Maintain accurate parent/guardian relationship records; relationship accuracy is the foundation of portal access correctness and is required for legal compliance.
9. Use the chronic disease registry dashboard for asthma, diabetes, and other pediatric chronic conditions; registry accuracy depends on ongoing attention to enrolment and review cadence.
10. Provide adolescent patients with portal access at the regional age of adolescent care consent; adolescent portal access supports confidential care and is increasingly expected by adolescent patients.

### 17.3 Governance Best Practices

11. Conduct a quarterly immunization coverage review with the clinical lead; this review validates registry accuracy and identifies patients needing recall.
12. Conduct an annual confidential adolescent encounter segregation review; this review validates that segregation is enforced correctly across all portal surfaces.
13. Maintain a documented onboarding process for adolescent patients transitioning from parental portal access to adolescent portal access; the transition is a regulatory and clinical communication point that should not be deferred to ad-hoc handling.

---

## 18. Related Documents

### 18.1 Upstream Documents

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 18 defines clinic type C04 Pediatrics; Section 16 defines edition packaging; Section 19 defines the module catalogue; Section 20 defines the role catalogue; Section 21 defines permission philosophy |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 4 governs architectural principles; Section 11 defines the organization hierarchy; Section 12 defines the clinic hierarchy; Section 15 defines the configuration layer model |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Master catalogue of clinic types; Section 3.2 covers primary care single-specialty facilities including pediatrics; Section 6 documents module recommendations |

### 18.2 Downstream and Sibling Documents

| Document | Path | Relevance |
|---|---|---|
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue referenced in Section 3 |
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role definitions referenced in Section 13 |
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission scope rules referenced in Section 13.2 |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine configuration referenced in Section 9 |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition packaging referenced in Section 2.1 |
| General Practice | `docs/06_CLINIC_TYPES/GENERAL.md` | Sibling primary care clinic type |
| Internal Medicine | `docs/06_CLINIC_TYPES/INTERNAL_MEDICINE.md` | Sibling primary care clinic type |

### 18.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council, with off-cycle review when regional immunization schedules change. Changes — including overlay revisions, immunization schedule updates, and best practice refinements — are ratified by the Product Council and recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
