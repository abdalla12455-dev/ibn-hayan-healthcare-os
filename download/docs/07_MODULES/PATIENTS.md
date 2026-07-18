# Ibn Hayan Healthcare Operating System
## Patients Module

| Field | Value |
|---|---|
| Document Title | Patients Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, regulators, implementation partners, clinical governance bodies |
| Scope | Patient registration, identity, demographics, contact, coverage, history aggregation, consent, relationships, patient portal, and communication preference management for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, clinical documentation authoring, encounter management, billing transaction execution |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Patient Registration
5. Patient Demographics
6. Medical History
7. Patient Portal
8. Patient Communication
9. User Roles
10. Workflows
11. Data Models
12. Integrations
13. Configuration
14. Permissions
15. Reports
16. API Surface
17. Future Enhancements
18. Related Documents

---

## 1. Module Overview

### 1.1 Module Identity and Strategic Position

The Patients module (M01 in this documentation suite, aligned with the Patient bounded context BC01 as catalogued in SYSTEM_ARCHITECTURE Section 7.2) is the central identity module of the Ibn Hayan Healthcare Operating System. Every clinical, operational, financial, and administrative module references patients through this module's contracts, and every consequential patient-related action in the platform routes back to a patient identity that this module owns. The Patients module is not one capability among many; it is the anchor around which the rest of the platform organizes patient-contextual work.

Ibn Hayan treats patient identity as a strategic primitive rather than as a feature delivered by a peripheral component. This positioning has direct architectural consequences: patient identity is owned by a single bounded context, accessed by every other module through published contracts, and protected by the platform's strongest permission and audit guarantees. A patient record created in Ibn Hayan is a long-lived entity whose integrity must outlast every encounter, every provider, every payer, and every configuration change applied to the tenant.

### 1.2 Purpose and Business Value

The Patients module exists to give every person who interacts with a healthcare organization a single, unambiguous, longitudinal identity within Ibn Hayan, and to make that identity available to every authorized workflow that needs it. Business value is realized through three mechanisms. First, identity unification eliminates the duplicate-record overhead that plagues healthcare operations — duplicate patient records produce duplicate billing, fragmented clinical history, and medication safety risk. Second, longitudinal identity enables longitudinal analytics — a patient's history across encounters, providers, and facilities is queryable as a single record rather than reconstructed from fragments. Third, identity ownership enables consent and preference governance — a patient's consent and communication preferences travel with the patient identity, applied uniformly across every channel and surface.

For customers, the Patients module is the operational foundation: reception cannot check in a patient who does not exist, providers cannot document care without a patient context, billing cannot invoice without a patient of record, and reporting cannot stratify populations without patient identity. For regulators, the Patients module is the accountability anchor — every clinical and financial action is traceable to a patient identity that is itself audited.

### 1.3 Bounded Context Alignment

The Patients module aligns one-to-one with the Patient bounded context BC01, as catalogued in SYSTEM_ARCHITECTURE Section 7.2 and elaborated in MODULE_ARCHITECTURE Section 2.2. BC01 owns patient identity, demographics, consent, and the medical record lifecycle reference; clinical documentation, encounters, orders, and results are owned by separate bounded contexts (BC02 through BC05) and are accessed through their respective contracts. The Patient bounded context is the supplier in customer-supplier relationships with every clinical, operational, financial, and administrative context; it is the consumer only of the Identity & Access, Configuration, Audit, and Localization platform contexts.

This alignment is stable. Per Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8), the Patient bounded context is not reorganized to accommodate features. New patient-related capabilities are accommodated within the existing context or are added through deliberate architectural decision ratified by an ADR. Customers can rely on this stability when planning integrations, migrations, and long-term clinical data strategies.

### 1.4 Module Composition

The Patients module is composed of the following capability areas, each of which is elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: patient registration, identity verification and resolution, demographics management, contact and coverage management, medical history aggregation, consent management, relationship management, patient merge and deduplication, patient de-identification, patient portal access, and communication preference management. The module does not own clinical documentation, encounters, orders, results, medications, or billing transactions; it owns the patient identity that those modules reference. The module participates in workflows owned by other modules through its published event and query contracts.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the patient identity as its organizing concept; capabilities that do not share this organizing concept belong in other modules. Consent management, for example, lives in the Patients module because consent is granted by the patient and travels with the patient identity; it does not live in the Notifications module even though consent is consulted before notification dispatch, because consent is owned by the patient, not by the dispatch machinery.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The Patients module owns patient identity lifecycle from creation through de-identification or archival. It owns demographic attributes, contact details, insurance coverage references, consent records, family and payer relationships, and the longitudinal medical history reference that aggregates events from peer modules. It owns patient merge and deduplication workflows, identity resolution across facilities within a tenant, and patient-facing self-service through the patient portal. It owns the configuration surface for patient-related behaviour, including registration forms, demographic validation rules, consent templates, and communication preferences.

The module also owns the patient-side participation in omnichannel communication: it does not dispatch messages (that capability belongs to the Notifications module), but it owns the patient's preferences, opt-in and opt-out state, and channel-specific authorizations that the Notifications module consults before dispatch. This separation honours Principle P4 (Loose Coupling, High Cohesion) — the Patients module owns the patient's preferences; the Notifications module owns the dispatch machinery.

### 2.2 Out of Scope

The Patients module does not own clinical documentation, clinical assessments, clinical observations, or clinical decisions; these belong to the Clinical Documentation bounded context. It does not own encounter lifecycle, encounter status, or encounter-level care team assignment; these belong to the Encounter bounded context. It does not own orders, results, or medication administration records; these belong to the Orders & Results and Pharmacy bounded contexts. It does not own billing transactions, claims, payments, or invoices; these belong to the Billing bounded context. It does not own appointment slots or scheduling; these belong to the Scheduling bounded context.

The module also does not own authentication of patient portal users (that belongs to the Identity & Access bounded context), configuration of communication channels (that belongs to the Notifications bounded context), or audit storage (that belongs to the Audit bounded context). The Patients module publishes events that the Audit module records, but it does not store audit records itself.

### 2.3 Patient as Central Entity

The patient is the central entity of the Ibn Hayan platform. Every clinical, financial, operational, and administrative entity in the platform carries a reference to a patient identity owned by this module. Encounters reference patients; orders reference patients; invoices reference patients; appointments reference patients; communications reference patients. The Patients module is the canonical source of patient identity; every other module that needs patient identity queries this module's contracts or subscribes to its events.

This central positioning imposes responsibilities on the Patients module that other modules do not bear. The module's contracts must be stable, because every other module depends on them (Principle P8, SYSTEM_ARCHITECTURE Section 4.8). The module's data must be strongly consistent, because patient identity errors propagate to every dependent module and may produce clinical safety incidents (Principle P5, SYSTEM_ARCHITECTURE Section 4.6). The module's audit must be complete, because every patient-impacting action in every other module is eventually traceable back to a patient identity decision made here (Principle P13, SYSTEM_ARCHITECTURE Section 4.13).

The centrality of the patient entity has implications for contract design. The Patients module's contracts are intentionally narrow in their breaking-change tolerance. A breaking change to a patient identity contract requires coordination across every dependent module, with deprecation windows long enough to allow all consumers to migrate. This is the operational expression of Principle P8: bounded contexts are stable, and the Patient bounded context is the most stable of all because of its central position. Customers planning long-term clinical data strategies can rely on this stability.

### 2.4 Cross-Tenant Patient Isolation

Patient records are tenant-isolated by default. A patient created in tenant A is not visible to tenant B, even when the patient is the same natural person. Cross-tenant patient identity sharing is a deliberate, consented, and audited action — never an accident of architecture. The Patients module enforces tenant isolation at the contract level; queries for patient identity are scoped to the caller's tenant, and cross-tenant queries require explicit authorization that is itself audited.

Where a healthcare network operates multiple tenants (for example, separate tenants for separate regions or separate legal entities under common ownership), patient identity sharing between tenants is configured, consented, and documented. The configuration is part of the Integration module's surface; the Patients module honours the configuration by exposing identity through cross-tenant query contracts only when the configuration explicitly permits. This honours Principle P10 (Multi-Tenancy as Default, SYSTEM_ARCHITECTURE Section 4.10) and Principle P3 (One Platform, Many Organizations).

---

## 3. Key Features

### 3.1 Patient Registration

Patient registration captures the minimum information required to create a patient identity in Ibn Hayan: identity attributes (name, date of birth, sex, national identifier where applicable), contact attributes, and the consent and acknowledgement records required by the regulatory framework in force for the tenant. Registration is the entry point for every patient-related workflow; a patient who cannot be registered cannot be scheduled, treated, billed, or reported on. The registration workflow is configurable per clinic type, per facility, and per channel (in-person, telephone, telehealth, patient portal self-registration).

### 3.2 Identity Verification and Resolution

Identity verification confirms that the patient being registered is who they claim to be, using government-issued identification, biometric capture, or other verification mechanisms appropriate to the tenant's regulatory framework. Identity resolution determines whether a patient being registered already exists in the tenant's records, using deterministic matching (national identifier, exact name and date of birth) and probabilistic matching (fuzzy name matching, address proximity, date-of-birth proximity). The Patients module exposes both verification and resolution as configurable capabilities — verification strictness is configurable per clinic type and per encounter type, and resolution thresholds are configurable per tenant.

### 3.3 Demographics Management

Demographics management maintains the patient's identity attributes over time, including name changes (legal name, preferred name, former name), date-of-birth corrections, sex and gender attributes, language preferences, and other attributes used by clinical, operational, and reporting workflows. Demographic updates are versioned and audited; the previous value, the new value, the updater, the time, and the authorization basis are recorded for every change. Demographic attributes are localized — the set of attributes and the validation rules are configurable per region through the Localization module's contracts.

### 3.4 Contact and Coverage Management

Contact management maintains the patient's address, telephone numbers, email addresses, and emergency contacts. Contact attributes are versioned, with effective-dating for changes of address; a patient's address history is queryable for clinical and administrative purposes. Coverage management maintains the patient's insurance coverage references — payer, plan, subscriber, effective dates, copay and deductible metadata — without owning the payer-side plan details. Coverage references are used by the Billing module for claim routing and by the Scheduling module for pre-authorization checks.

### 3.5 Medical History Aggregation

Medical history aggregation assembles the patient's longitudinal record from peer modules — encounters from the Encounter module, clinical documentation from the Clinical Documentation module, orders and results from the Orders & Results module, medications from the Pharmacy module, and imaging studies through the Integration module's DICOM-aligned contracts. The Patients module owns the aggregation view; it does not own the underlying records. Aggregation is performed through query contracts and event subscriptions; the Patients module subscribes to peer-module events and maintains a longitudinal index that supports fast retrieval.

### 3.6 Consent Management

Consent management records the patient's consent for treatment, for information sharing, for specific procedures, for participation in research, and for communication through specific channels. Consent records are versioned, time-bounded, and revocable; a consent revocation takes effect immediately for downstream workflows that consult the Patients module's contracts. Consent templates are configurable per clinic type, per facility, and per regulatory framework. The consent model supports granular consent — a patient may consent to share information with one provider but not another, or to receive appointment reminders but not marketing communications.

### 3.7 Relationship Management

Relationship management maintains the patient's relationships to other entities — family members (who may also be patients), employers (relevant for occupational health and billing), payers (relevant for coverage and claim routing), and guardians or care decision-makers (relevant for paediatric, geriatric, and capacity-impaired patient populations). Relationships are bidirectional where appropriate — a parent-child relationship is recorded from both sides — and are versioned, with effective-dating for changes in relationship status.

### 3.8 Patient Merge and Deduplication

Patient merge and deduplication consolidates duplicate patient records into a single canonical identity, with full audit of the merge action, the surviving record, and the records absorbed. Merge is a controlled workflow that requires authorization, produces a permanent audit trail, and is reversible only through an explicit unmerge action that is itself audited. The merge workflow preserves all clinical, financial, and operational data from the absorbed records; no clinical event is lost in a merge. Deduplication detection runs continuously, identifying potential duplicates through matching rules and surfacing them for human review before merge is initiated.

### 3.9 Patient De-identification

Patient de-identification produces a patient record from which direct identifiers have been removed or transformed, for use in analytics, research, and reporting where patient identity is not required. De-identification is configurable per regulatory framework — the HIPAA Safe Harbor and Limited Dataset specifications, the GDPR pseudonymization specification, and other regional specifications are supported as configuration profiles, not as code paths. De-identified records are flagged as such and are subject to distinct retention and access rules.

### 3.10 Patient Portal Access

Patient portal access exposes a defined subset of patient information to the patient through the patient portal surface, including demographic information, appointment history, clinical documentation the patient is authorized to view, lab results the patient is authorized to view, statements, and communication history. Portal access is mediated by the Identity & Access module (which authenticates the patient) and by the Patients module (which authorizes the patient's access to their own record). The portal scope is configurable per tenant and per clinic type; a tenant may expose more or less clinical information to patients based on regulatory and clinical policy.

### 3.11 Communication Preferences

Communication preferences record the patient's choices for how, when, and about what they may be contacted — preferred channels (SMS, email, phone, portal message), preferred language, time-of-day windows, topic-specific preferences (appointment reminders yes, marketing communications no), and channel-specific opt-in and opt-out state. The Patients module owns these preferences; the Notifications module consults them before dispatching any communication. Communication preferences are versioned and audited; a patient's preference history is queryable for compliance and dispute resolution.

### 3.12 Identity Resolution Across Facilities

Identity resolution across facilities determines whether a patient presenting at one facility within a tenant has been previously registered at another facility within the same tenant, and links the facilities' records to a single canonical patient identity. Cross-facility resolution uses the same deterministic and probabilistic matching as within-facility resolution, with facility-level scoping to prevent inappropriate cross-tenant matches. The result is a single patient identity visible across the tenant, with facility-level encounter and clinical history remaining owned by the respective facilities.

Cross-facility identity resolution is a defining capability for multi-facility tenants — a hospital network where a patient registered at the network's primary care clinic is recognized when presenting at the network's emergency department, with the emergency department able to retrieve the patient's history from the primary care clinic. Without cross-facility resolution, the emergency department would create a duplicate record, fragmenting the patient's history and creating medication safety risk. The capability is enabled by default for tenants with multi-facility configuration; it is disabled for single-facility tenants where the capability has no operational meaning.

---

## 4. Patient Registration

### 4.1 Registration Workflow

Patient registration is a configurable workflow that captures the minimum patient identity information required to begin a clinical, operational, or financial relationship with the patient. The workflow is initiated by a receptionist, a scheduler, a clinical user, a telehealth intake form, or the patient themselves through the portal. The workflow's steps — identity capture, verification, deduplication check, consent capture, coverage capture, and confirmation — are configurable per clinic type, per facility, and per channel. A registration that fails verification or that produces a high-confidence duplicate match is routed to a human reviewer rather than auto-completed; this honours Principle P1 (Healthcare Safety Overrides All Others, SYSTEM_ARCHITECTURE Section 4.2) by preventing the creation of duplicate identities that would fragment clinical history.

### 4.2 Identity Verification

Identity verification confirms that the patient being registered is the natural person they claim to be. Verification strictness is configurable: a registration at an emergency department may proceed with minimal verification (Principle P1 — care is not delayed for verification formalities when the patient's safety is at risk), while a registration for an elective surgical procedure requires government-issued identification, biometric capture, or other strong verification. Verification outcomes — verified, partially verified, unverified — are recorded on the patient record and are visible to downstream workflows that may require verified identity (controlled-substance prescribing, insurance claim submission, certain diagnostic test ordering).

### 4.3 Demographic Capture

Demographic capture records the patient's identity attributes — name, date of birth, sex, gender, language preference, and other attributes required by the tenant's regulatory framework and by the clinic type's configuration profile. Capture validation is configurable: a registration at a paediatric clinic captures guardian information that an adult registration does not; a registration at an occupational health clinic captures employer information that a general practice registration does not. Validation rules are enforced at capture time and are auditable; a registration that fails validation is not completed until the validation failure is resolved or explicitly overridden with documented justification.

### 4.4 Multi-Facility and Multi-Tenant Registration

Multi-facility registration allows a patient to be registered at one facility within a tenant and to be recognized at every other facility within the same tenant without re-registration. The Patients module performs identity resolution across facilities at registration time, surfacing potential matches for human review. Multi-tenant registration is not supported by default — a patient registered in tenant A is not visible in tenant B — but cross-tenant patient identity sharing can be configured where a healthcare network operates multiple tenants and has documented consent and legal basis for sharing. Cross-tenant sharing is governed by the Integration module's contracts and is fully audited; every cross-tenant patient identity query is recorded in the audit trail.

Registration at scale is an operational concern for tenants with high patient intake — emergency departments, urgent care clinics, and public health clinics may register hundreds of patients per day. The registration workflow is designed for throughput without compromising identity integrity: deduplication checks are performed in parallel with capture, verification is asynchronous where the workflow permits, and the registration confirmation is decoupled from downstream workflow initiation. A registration that takes more than a few seconds to complete is a candidate for optimization; the Patients module exposes registration latency as a health metric for monitoring.

---

## 5. Patient Demographics

### 5.1 Demographic Attributes

The Patients module maintains a configurable set of demographic attributes per patient. The attribute set includes core identity attributes (name, date of birth, sex, gender, language), contact attributes (address, telephone, email), administrative attributes (national identifier where applicable, marital status, occupation), and clinical-population attributes (blood type, organ donor status, advance directive flag). The attribute set is configurable per tenant, per region, and per clinic type; the Localization module's contracts govern the regional configuration, and the Configuration module's contracts govern the tenant-level configuration. Attributes that are not relevant to a clinic type are not captured — a paediatric registration does not capture occupation, an occupational health registration does not capture organ donor status — keeping the registration surface proportionate to the clinical need.

Attribute capture is validated against regional regulatory frameworks. Some regions prohibit collection of certain attributes — for example, regions with strong anti-discrimination protections may prohibit collection of ethnicity or religion outside specific clinical contexts. The Localization module's configuration surface expresses these prohibitions, and the Patients module's validation enforces them. Capture of prohibited attributes is rejected at validation time, with the rejection reason recorded in the audit trail. Capture of attributes outside the configured attribute set is also rejected; speculative attribute collection is a defect, not a feature.

### 5.2 Demographic Updates and Audit

Every demographic change is versioned and audited. The audit record includes the previous value, the new value, the actor who made the change, the time, the authorization basis, and the reason for the change where one is required by configuration. Demographic history is queryable; a patient's address history is available for clinical, administrative, and compliance purposes. Demographic changes that affect downstream workflows — a change of insurance coverage, a change of legal name, a change of preferred language — trigger events that peer modules consume, allowing billing, scheduling, and communications to update their behaviour in response.

### 5.3 Localization of Demographics

Demographics are localized. The set of attributes captured, the validation rules applied, the format of addresses and telephone numbers, and the language of capture are all governed by the tenant's region and the Localization module's configuration. A tenant operating in a region that requires a national health identifier captures that identifier as part of demographics; a tenant operating in a region that prohibits collection of certain attributes does not capture them. Localization is honored through configuration, not through code paths — the same demographic capture workflow runs in every region, with the attribute set and validation rules resolved from configuration at capture time.

---

## 6. Medical History

### 6.1 History Aggregation from Peer Modules

Medical history aggregation assembles a longitudinal view of the patient's clinical history by querying peer modules and subscribing to their events. The Patients module queries the Encounter module for the patient's encounters, the Clinical Documentation module for the patient's clinical notes, the Orders & Results module for the patient's orders and results, the Pharmacy module for the patient's medication history, and the Integration module for clinical data exchanged with external systems through HL7 FHIR-aligned or DICOM-aligned contracts. The aggregated view is presented as a longitudinal timeline; the underlying records remain owned by their respective modules.

### 6.2 Longitudinal Patient Record

The longitudinal patient record is the canonical view of a patient's clinical history over time. It includes encounters in reverse chronological order, problems and conditions, medications and immunizations, allergies and adverse reactions, procedures, results, and clinical documents. The longitudinal record is read-only from the perspective of the Patients module — clinical entries are authored in their owning modules and are surfaced in the longitudinal record through query contracts and event subscriptions. The longitudinal record is the basis for clinical decision support, population health analytics, and regulatory reporting.

### 6.3 Provenance and Attribution

Every entry in the longitudinal record carries provenance metadata — the module that owns the entry, the author who created it, the time of creation, the time of last update, and the encounter context in which it was created. Provenance is non-repudiable; it is recorded at the time the entry is created and is not modified thereafter. Provenance is critical for clinical safety (a clinician reviewing a patient's history must know where each entry came from and when it was recorded), for regulatory compliance (a regulator reviewing a clinical event must be able to trace the event to its author and time), and for dispute resolution (a patient disputing an entry must be able to identify the entry's author).

Provenance in Ibn Hayan is enforced at the contract level. Peer modules that contribute entries to the longitudinal record must include provenance metadata in the events they publish; the Patients module's event subscription contracts require provenance fields and reject events that lack them. This is the operational expression of the audit primitive (Principle P13, SYSTEM_ARCHITECTURE Section 4.13) applied to clinical data exchange. A peer module that attempts to publish a clinical event without provenance is defective and is corrected at architectural review.

---

## 7. Patient Portal

### 7.1 Portal Scope

The patient portal exposes a defined subset of patient information to the patient, including demographic information, appointment history, statements and invoices, lab results the patient is authorized to view, clinical documents the patient is authorized to view, and communication history. Portal scope is configurable per tenant and per clinic type — a tenant operating in a region that requires clinical results to be released to patients on request configures the portal to expose lab results by default; a tenant operating in a region that prohibits direct release of certain results to patients configures the portal to withhold those results pending clinician review.

### 7.2 Self-Service Capabilities

The patient portal supports self-service capabilities including appointment request, prescription refill request, message to care team, demographic update request, statement review and payment, and document upload. Self-service requests are routed to the appropriate operational workflow — appointment requests to the Scheduling module, prescription refill requests to the Pharmacy module, messages to the Notifications module, payments to the Billing module. Self-service does not bypass operational governance; a patient's appointment request is reviewed by a scheduler before confirmation, and a patient's demographic update request is reviewed by a receptionist before application.

### 7.3 Security and Consent Model

Patient portal authentication is owned by the Identity & Access module (BC15), which provides multi-factor authentication, session management, and credential lifecycle. The Patients module owns authorization for portal access to patient records: a patient is authorized to view their own record, with the scope of viewable information governed by the portal configuration and by the patient's consent record. The portal surface enforces the same audit and privacy guarantees as the operational surface — every portal access is recorded in the audit trail, and a patient's access to their own record is itself auditable (a patient can request a report of who accessed their record and when, in compliance with regional regulations).

Proxy access is a common portal pattern that the Patients module supports through the relationship model. A parent may access the records of their minor child; a guardian may access the records of a ward; a caregiver may access the records of a patient who has granted them proxy access. Proxy access is mediated by the relationship records owned by the Patients module and is governed by configurable rules — a parent's access to a child's record expires when the child reaches the age of majority, a guardian's access requires documented legal authority, a caregiver's access requires the patient's explicit grant. Proxy access is audited separately from patient self-access, allowing compliance officers to distinguish the two in investigation.

---

## 8. Patient Communication

### 8.1 Communication Channels

The Patients module records the patient's communication channel attributes — telephone numbers, email addresses, portal messaging identifier, postal address — and the patient's preferences for each channel. The module does not dispatch communications; dispatch is owned by the Notifications module (BC14). The Patients module's contracts are queried by the Notifications module before any dispatch to determine whether the patient has consented to communication through the channel, whether the patient has opted out of the communication topic, and whether the patient has a preferred time-of-day window.

### 8.2 Preference Management

Communication preferences are managed at the patient level and are versioned and audited. A preference change — opt-in to SMS reminders, opt-out of marketing email, change of preferred language — is recorded with the actor, the time, the previous value, and the new value. Preference changes take effect immediately for downstream workflows that consult the Patients module's contracts. The preference model supports topic-specific consent: a patient may consent to appointment reminders but not to marketing communications, or to lab result notifications but not to research recruitment communications.

### 8.3 Consent for Communication

Consent for communication is a distinct concept from general consent for treatment. A patient who has consented to treatment has not automatically consented to receive marketing communications or research recruitment requests; separate consent is required for those channels. The Patients module's consent model supports this distinction, with separate consent records for treatment, for information sharing, for communication by channel and topic, and for research participation. Consent records are versioned, time-bounded, and revocable; a consent revocation is propagated to downstream workflows through events that peer modules consume.

The distinction between treatment consent and communication consent is a regulatory requirement in many jurisdictions. A tenant operating under GDPR must distinguish between consent for processing of personal data for treatment purposes (often lawful under a basis other than consent) and consent for processing of personal data for marketing purposes (which requires explicit, revocable consent). The Patients module's consent model expresses this distinction through consent types, each with its own validation rules, retention policies, and revocation behaviour. The consent model is configurable per region through the Localization module's configuration surface.

---

## 9. User Roles

### 9.1 Roles That Interact with Patient Records

The following roles interact with patient records through the Patients module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2.

| Role Code | Role | Typical Patient-Related Responsibilities |
|---|---|---|
| R01 | Physician | Clinical history review, order entry with patient context, documentation with patient context |
| R02 | Nurse | Patient assessment, care delivery, medication administration with patient context |
| R03 | Pharmacist | Medication review with patient context, patient counselling |
| R04 | Technician | Result production with patient context |
| R05 | Allied health professional | Discipline-specific assessment and treatment with patient context |
| R06 | Receptionist | Patient registration, demographic updates, check-in |
| R07 | Scheduler | Appointment management with patient context |
| R08 | Biller | Claim preparation with patient context |
| R09 | Administrator | Operational oversight of patient records |
| R10 | Compliance officer | Audit review of patient record access |
| R13 | System administrator | Tenant configuration of patient-related behaviour |
| R14 | Integration account | System-to-system patient identity queries |

### 9.2 Permission Categories

Permissions on patient records are defined at the action level on the patient resource, in keeping with the permission philosophy in PRODUCT_BIBLE Section 21.2. The action categories are read, write, execute, and administer; the resource is the patient record. Read permissions include viewing demographic information, viewing contact information, viewing coverage information, viewing medical history, viewing consent records. Write permissions include creating a patient, updating demographics, updating contact information, updating coverage, recording consent, merging patients. Execute permissions include identity resolution, identity verification, de-identification. Administer permissions include configuring patient-related behaviour, managing merge workflows, managing de-identification policies.

### 9.3 Emergency Access

Emergency access (break-glass) allows a clinician to access a patient record without routine permission, in situations where the patient's safety requires immediate access. Emergency access is explicit (the user takes a deliberate action to invoke it), audited (every emergency access is recorded with user, time, resource, and justification), time-bounded (the access expires automatically), and reviewed (compliance officers review emergency access events). Emergency access is not a routine workflow; frequent use indicates a permission configuration defect and is investigated. Emergency access is governed by the Identity & Access module's contracts, with the Patients module enforcing the access scope and recording the audit event.

Emergency access in the Patients module is particularly consequential because the patient record is the gateway to every other clinical, financial, and operational record. An emergency access grant may cascade into emergency access for encounters, orders, results, and clinical documentation owned by other modules. The cascade is deliberate — a clinician who needs emergency access to the patient record needs emergency access to the patient's clinical history — but it is governed: every cascaded access is separately audited, and the cascade scope is bounded by the original emergency access grant's purpose.

---

## 10. Workflows

### 10.1 Workflows the Module Triggers

The Patients module triggers workflows in response to patient lifecycle events. Patient registration triggers a welcome communication (via the Notifications module), a billing account creation (via the Billing module), and a patient panel assignment (via the Workforce module where applicable). Patient merge triggers an event consumed by every module that holds patient references, allowing them to update their references to the surviving identity. Consent revocation triggers an event consumed by the Notifications module (to halt communications), the Billing module (to halt information sharing with the revoked party), and any other module whose behaviour depends on the consent. Demographic change triggers events consumed by the Billing module (for coverage-related updates), the Scheduling module (for contact-related updates), and the Notifications module (for channel-related updates).

### 10.2 Workflows the Module Participates In

The Patients module participates in workflows owned by other modules by responding to queries and by consuming events. The Scheduling module queries the Patients module to verify that a patient exists before booking an appointment. The Encounter module queries the Patients module to retrieve the patient's identity and history when an encounter is opened. The Billing module queries the Patients module for coverage information when a claim is prepared. The Pharmacy module queries the Patients module for allergy and medication history when a prescription is filled. The Clinical Documentation module queries the Patients module for context when a note is authored.

### 10.3 Audit Events Generated

The Patients module generates audit events for every consequential action, in keeping with the audit architecture defined in SYSTEM_ARCHITECTURE Section 27. Audit events include patient registration, demographic change, contact change, coverage change, consent grant, consent revocation, relationship change, patient merge, patient unmerge, patient de-identification, patient record access (read), patient record export, patient record archival, and patient record deletion (where deletion is permitted, which is rare and is governed by the regulatory framework in force). Every audit event includes the actor, the action, the resource, the tenant, the scope, the previous state, the new state, the authorization basis, the result, and the context, per the audit record structure in SYSTEM_ARCHITECTURE Section 27.4.

Patient record access audit is the most consequential audit category because of its volume and its regulatory sensitivity. Every read of a patient record by every user is recorded; an enterprise tenant may accumulate tens of millions of patient access audit events per year. The audit store is query-optimized for investigation — a compliance officer investigating a breach can retrieve every access of a specific patient record by any user in any time range, with the query itself audited (SYSTEM_ARCHITECTURE Section 27.6). Patient access audit records are immutable, append-only, and tamper-evident; they cannot be modified or deleted, even by system administrators, per the immutability commitment in SYSTEM_ARCHITECTURE Section 27.5.

---

## 11. Data Models

### 11.1 Core Entities

The Patients module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Patient | The canonical patient identity |
| Patient Identifier | External identifiers (national ID, insurance member ID, MRN) |
| Patient Contact | Address, telephone, email, emergency contact |
| Patient Coverage | Insurance payer, plan, subscriber, effective dates |
| Patient History | Longitudinal reference to clinical events in peer modules |
| Patient Consent | Consent records for treatment, sharing, communication, research |
| Patient Relationship | Family, employer, payer, guardian relationships |

The Patient entity is the aggregate root for the bounded context (per the aggregate boundary principle in MODULE_ARCHITECTURE Section 11.3). All other entities reference a Patient and cannot exist independently. A Patient Identifier without a Patient is a defect; a Patient Contact without a Patient is a defect. The aggregate boundary ensures that patient-related state changes are atomic — a demographic update either completes successfully (with all related entities updated consistently) or fails completely (with no related entities modified). Atomicity is critical for clinical safety: a partial demographic update that updates the name but not the date of birth would produce an inconsistent identity that could be misresolved by downstream workflows.

### 11.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Patient Merge Record documents a merge action with the surviving identity, the absorbed identities, the actor, the time, and the justification. The Patient Deduplication Candidate records a potential duplicate detected by automated matching, with the match score and the human review outcome. The Patient De-identification Mapping records the relationship between a canonical patient identity and its de-identified counterpart, for use where re-identification is permitted under controlled circumstances. The Communication Preference record stores the patient's channel and topic preferences. The Verification Record documents the verification outcome and the verification mechanism used.

### 11.3 Entity Relationships

Core entities relate to the Patient entity as dependents — a Patient Identifier, Patient Contact, Patient Coverage, Patient Consent, and Patient Relationship each reference a Patient. The Patient History entity references both the Patient and the peer-module records that comprise the history, with the reference being a logical identifier rather than a direct data-store reference (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8). Supporting entities relate to their corresponding core entities — a Patient Merge Record references two or more Patient entities, a Patient Deduplication Candidate references two or more Patient entities, a Communication Preference references a Patient.

---

## 12. Integrations

### 12.1 Peer Module Integrations

The Patients module integrates with every peer module that needs patient identity context. The integration is through published contracts — commands, queries, events, and configuration schemas — never through direct data access. The Encounter, Clinical Documentation, Orders & Results, Pharmacy, Scheduling, Billing, Notifications, CRM, Workforce, Reporting, and Integration modules all consume the Patients module's query contracts to retrieve patient identity, demographics, contact, coverage, and consent. The Patients module subscribes to events from the Encounter module (encounter creation, encounter closure) to maintain the longitudinal history index, and from the Identity & Access module (authentication events) to maintain the patient portal session context.

### 12.2 External System Integrations

External system integrations are mediated by the Integration module (BC15 in MODULE_ARCHITECTURE Section 2.2, deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the Patients module's contracts through integration adapters that align with healthcare interoperability standards — HL7 FHIR for patient demographic exchange, HL7 v2 for legacy patient administration interfaces, DICOM for imaging patient identification, IHE profiles for cross-community patient identity (PIX, PDQ). The Patients module is not aware of the specific external systems; it is aware only of the Integration module's contracts.

### 12.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Synchronous command is used for patient registration where immediate confirmation is required. Synchronous query is used for identity resolution and demographic retrieval. Asynchronous event is used for patient lifecycle events (registration, merge, consent change) that peer modules consume without requiring immediate response. The outbox pattern is used where event delivery must be reliable across failures — patient registration events are written to an outbox that is reliably delivered to subscribers, ensuring that no peer module misses a registration event even in the presence of transient failures.

Anticorruption layers are used at the boundary between the Patients module and external systems, per the context relationship pattern defined in SYSTEM_ARCHITECTURE Section 7.3. External patient identity sources — national identity registries, payer member directories, regional health information exchanges — have their own models, their own validation rules, and their own update cadences. The Integration module's adapters translate between external models and the Ibn Hayan patient model, preventing external model leakage. The translation is documented, versioned, and tested; an anticorruption layer that fails to translate correctly is a defect that produces clinical safety risk and is corrected immediately.

---

## 13. Configuration

### 13.1 Configuration Categories

The Patients module's configuration surface is organized into the categories defined in MODULE_ARCHITECTURE Section 10.3. Behavioural configuration includes registration workflow definitions, demographic validation rules, consent templates, communication preference defaults. Structural configuration includes feature flags for capabilities like patient portal self-registration, patient merge, and patient de-identification. Integration configuration includes external system endpoints and credentials for identity verification services and external demographic sources. Localization configuration includes regional demographic attribute sets, address formats, telephone number formats, and language preferences. Security configuration includes registration verification strictness, emergency access scope, and patient portal access scope. Regulatory configuration includes retention policies for patient records, consent record retention, and de-identification rules.

### 13.2 Tenant-Configurable vs Platform-Configurable

The configuration surface distinguishes between tenant-configurable categories and platform-configurable categories, per the rule in MODULE_ARCHITECTURE Section 10.3. Tenant-configurable categories include registration workflow defaults, demographic attribute set overlays, consent templates, and communication preference defaults; these may be overridden by tenant administrators within validation constraints. Platform-configurable categories include the audit record structure, the merge audit trail, and the consent model's core invariants; these are reserved for the platform and may not be overridden by tenants, because they protect patient safety and regulatory compliance. The distinction is enforced by the Configuration module's service and is part of the configuration schema published by the Patients module.

### 13.3 Configuration Governance

Configuration governance follows the framework defined in MODULE_ARCHITECTURE Section 10.5 and SYSTEM_ARCHITECTURE Section 8.7. Every configuration change is validated before application, audited on application, reversible through rollback, and reviewable through the audit trail. Changes that affect clinical safety — for example, a change to demographic validation rules that might allow incomplete records to be created — require compliance review. Changes that affect regulatory compliance — for example, a change to consent retention policy — require compliance officer review. Changes that affect patient portal scope — for example, exposing additional clinical document types to patients — require operational review. The governance posture is documented in the module's configuration schema and is reviewed at architectural review.

The Patients module's configuration governance is particularly stringent because of the module's central position. A configuration change that compromises patient identity integrity — for example, a change to deduplication matching thresholds that allows more duplicates through — propagates to every dependent module and may produce clinical safety incidents. The module's configuration schema marks such changes as requiring architectural review, with the review conducted by the Architecture Council rather than by tenant administrators alone. This is the operational expression of Principle P1 (Healthcare Safety Overrides All Others): safety-critical configuration is not delegated to tenant configuration.

---

## 14. Permissions

### 14.1 Action-Level Permissions on Patient Resources

Permissions are defined at the action level on the patient resource, in keeping with the permission philosophy in PRODUCT_BIBLE Section 21.2 and the elaboration in SYSTEM_ARCHITECTURE Section 21 (where applicable). The permission matrix includes read, write, execute, and administer actions on patient, patient identifier, patient contact, patient coverage, patient history, patient consent, and patient relationship resources. The matrix is large — every (action, resource) pair is a permission — but stable, because actions and resources evolve slowly even as the platform's surface evolves quickly. Direct user-permission assignment is forbidden; permissions are assigned through roles, per PRODUCT_BIBLE Section 21.3.

### 14.2 Scoping Rules

Permissions are scoped, not global, per PRODUCT_BIBLE Section 21.4. A user may have read permission on patient records within their facility without having read permission on patient records in another facility. Scoping is by organizational unit, by facility, by department, by care team, and by patient cohort. A clinician seeing patients in clinic A does not automatically have access to patients in clinic B, even within the same organization. Scoping is enforced at the action level, not at the page level; a clinician without read permission on a patient cannot access that patient's record through any surface, including search, list, or direct navigation.

### 14.3 Permission Inheritance

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 6.6 and PRODUCT_BIBLE Section 21.5. A permission granted at the organization level applies to all facilities within the organization unless overridden. A permission granted at the facility level applies to all departments within the facility unless overridden. Inheritance is explicit, documented, and auditable; it is not automatic. A role assigned at the organization level does not automatically propagate to lower levels; the role must be explicitly scoped to apply at lower levels, preventing accidental over-permissioning through inheritance misconfiguration.

Patient-specific permissions are a critical extension of the inheritance model. A clinician may have general read permission on patient records within their facility, but may have additional specific permission on a subset of patients (their patient panel) and reduced permission on other patients (patients outside their care team). Patient-specific permissions are scoped through care team membership, patient panel assignment, and explicit patient-level grants. The scoping is enforced at the action level; a clinician without read permission on a specific patient cannot access that patient's record, regardless of their general facility-level permissions.

---

## 15. Reports

### 15.1 Operational Reports

The Patients module contributes to operational reports that surface patient-related activity for daily operational management. Reports include patient registration volume by facility and by channel, deduplication candidate queue status, merge workflow status, consent compliance status (patients without required consent records), and portal adoption metrics. Operational reports are generated through the Reporting module's contracts, with the Patients module providing the underlying data through query contracts and event subscriptions.

### 15.2 Analytical Reports

Analytical reports surface population-level insights from patient data. Reports include patient demographic distribution by age, sex, geography, and coverage type; patient acquisition and retention trends; patient panel composition by provider; longitudinal care pattern analysis; and population health stratification by chronic condition, risk score, and care gap. Analytical reports are generated through the Reporting module's analytical pipeline, with patient data de-identified where the report's audience does not require identified data, per the de-identification configuration described in Section 3.9.

### 15.3 Regulatory Reports

Regulatory reports surface patient-related compliance evidence. Reports include patient record access logs (who accessed which patient records and when, in response to patient access requests), consent compliance reports (patients with missing or expired consent records), breach investigation reports (patient records accessed in unusual patterns), and data retention compliance reports (patient records that have reached their retention limit). Regulatory reports are themselves auditable; report generation is recorded in the audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8.

Regulatory report generation in the Patients module is governed by the regulatory framework in force for the tenant. A tenant operating under HIPAA generates reports aligned to the HIPAA right of access and breach notification requirements; a tenant operating under GDPR generates reports aligned to the GDPR data subject access request and personal data breach requirements; a tenant operating under other regional regulations generates reports aligned to those regulations. The regulatory framework selection is part of the Localization module's configuration surface; the Patients module honors the selection by exposing the appropriate report templates and by enforcing the appropriate retention policies.

---

## 16. API Surface

### 16.1 Contract Categories

The Patients module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the Patients module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 16.2 Command Contracts

Command contracts are requests to perform an action that changes patient state. Examples include RegisterPatient, UpdateDemographics, RecordConsent, RevokeConsent, MergePatients, DeidentifyPatient, UpdateCommunicationPreferences. Commands are synchronous where the caller requires immediate confirmation, asynchronous where the caller does not. Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the audit trail. Commands are idempotent where the operation supports idempotency, allowing safe retry in the presence of transient failures.

### 16.3 Query Contracts

Query contracts are requests to retrieve patient state without changing it. Examples include GetPatient, GetPatientByIdentifier, ResolvePatientIdentity, GetPatientHistory, GetPatientConsent, GetPatientCoverage, GetPatientRelationships, SearchPatients. Queries are synchronous, returning the requested state or a not-found response. Queries are scoped to the caller's authority — a caller without read permission on a patient receives a not-found response rather than the patient's data, preventing information leakage through query responses.

### 16.4 Event Contracts

Event contracts are notifications that something has happened in the Patients module. Examples include PatientRegistered, DemographicsUpdated, ConsentGranted, ConsentRevoked, PatientsMerged, PatientDeidentified, CommunicationPreferencesUpdated. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which peer modules maintain their local projections of patient data, in keeping with the state isolation pattern (read models and projections, MODULE_ARCHITECTURE Section 11.3).

### 16.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the Patients module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy. The schema is published as part of the module's contract surface; tenant administrators and the Configuration module's service consume the schema to validate configuration changes before application.

---

## 17. Future Enhancements

### 17.1 Extension Points

The Patients module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom demographic attribute sets (for clinic types whose attribute requirements exceed the platform default), custom consent templates (for regulatory frameworks whose consent requirements are not covered by the platform defaults), custom identity verification adapters (for verification mechanisms not supported by the platform defaults), and custom deduplication matching rules (for clinic types whose patient populations require specialized matching). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

Extension points in the Patients module are governed by the same lifecycle as platform features: defined, active, deprecated, retired. An extension point that has been deprecated is supported through a transition window, after which it is retired. Customers using a deprecated extension point are notified through the platform's change-management channel and are supported in migrating to the successor extension point or to platform-native capability. The lifecycle governance prevents extension point accumulation, which would otherwise compromise the module's contract stability over time.

### 17.2 Module Lifecycle

The Patients module is at the Mature stage of the module lifecycle (LC4, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6). The module has been in General Availability since the platform's initial release, has completed the defined period of stable operation required for transition to Mature, and has a long-term support commitment. The module's contracts are stable; breaking changes follow the platform's deprecation policy, with old contracts supported through a defined transition window. Lifecycle transitions — for example, a future transition to Deprecation Candidate — would be ratified by the Architecture Council and documented in the platform's CHANGELOG.

### 17.3 Edition Availability

The Patients module is included in every edition of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) provides patient registration and demographics with limited data volume. The Essential edition (E1) provides the full patient registration, demographics, contact, coverage, and history aggregation capabilities. The Professional edition (E2) adds patient merge and deduplication, patient de-identification, patient portal access, and communication preference management. The Enterprise edition (E3) adds cross-tenant patient identity sharing configuration, advanced de-identification profiles, and advanced consent management. Edition packaging does not modify module internals; all editions run the same code, with edition differences expressed as configuration.

### 17.4 Clinic Type Relevance

The Patients module is relevant to every clinic type catalogued in PRODUCT_BIBLE Section 18.2, because every clinic type encounters patients. The following clinic types have particular reliance on advanced patient module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C1 General practice | Longitudinal patient relationship; full demographic, history, and consent workload |
| C4 Paediatrics | Guardian and family relationship management; immunization history |
| C5 Obstetrics and gynaecology | Family relationship management; pregnancy-related consent and history |
| C11 Oncology | Longitudinal treatment history; research consent management |
| C14 Long-term care | Guardian and decision-maker management; advance directive management |
| C18 Emergency department | Identity verification under time pressure; emergency access; merge and deduplication post-event |
| C28 Mental health clinic | Granular consent management; sensitive-record access controls |
| C30 Long-term care facility | Guardian and decision-maker management; longitudinal history |

### 17.5 Operational Considerations

Operational considerations for the Patients module include data volume, query performance, retention, and offline operation. Patient data volumes grow with the tenant's patient population; a large enterprise tenant may accumulate tens of millions of patient records over a decade, requiring query optimization through indexing, partitioning, and projection management. Patient identity queries are on the hot path of nearly every workflow — every encounter, appointment, and order begins with a patient identity lookup — so query latency is operationally critical and is monitored as a module health metric. Patient data retention is governed by the regulatory framework in force for the tenant; retention policies are configurable per region and per clinic type, with default retention periods aligned to common regulatory requirements. Offline operation is supported for patient registration and identity verification at facilities with intermittent connectivity, with local audit recording and synchronization to the central platform when connectivity is restored, in keeping with the offline-first principle (P11, SYSTEM_ARCHITECTURE Section 4.11).

Disaster recovery for patient data is a primary operational concern. Patient identity is the foundation of clinical care; a tenant that loses patient identity loses the ability to deliver care. The Patients module's data is replicated, backed up, and recoverable per the platform's data durability commitments, with recovery time objectives aligned to the tenant's edition (Essential, Professional, Enterprise). Recovery procedures are tested regularly; an untested recovery procedure is treated as no recovery procedure at all. Patient data integrity is verified after recovery — a recovery that produces inconsistent patient identity state is itself an incident and is investigated.

Concurrency is another operational consideration. Patient records are frequently accessed by multiple users simultaneously — a receptionist updating demographics while a clinician reviews history while a biller prepares a claim — and the module must handle concurrent updates consistently. Optimistic concurrency control is used for demographic updates, with conflict detection surfacing concurrent modifications for resolution; pessimistic concurrency is used for merge workflows, where exclusive control of the records being merged is required for the duration of the merge. Concurrency strategies are documented in the module's operational documentation and are reviewed at architectural review.

---

## 18. Related Documents

### 18.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (M01 Patient, BC01)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy (action-level permissions, scoping, inheritance, emergency access)
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy (configuration layers, validation, audit, governance)
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P3, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC01 Patient)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture (boundaries, contracts, dependencies, communication, versioning, extension, isolation, testing)
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy (layer model, validation, versioning, audit, sandbox, hot-reload)
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit as primitive, audit surface, audit record structure, audit store, audit query, audit and offline, audit and compliance)
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface (categories, design criteria, governance)

### 18.2 Peer Module References

- APPOINTMENTS.md — Scheduling module (BC06 Scheduling); consumes patient identity for appointment booking
- BILLING.md — Billing module (BC07 Billing); consumes patient identity and coverage for claim preparation
- CRM.md — CRM module (BC11 CRM); consumes patient identity for relationship and outreach management
- DOCTORS.md — Workforce module (BC10 Workforce); consumes patient identity for patient panel assignment
- RECEPTION.md — Reception module (subset of BC06 Scheduling + BC01 Patient); consumes patient identity for check-in
- ACCOUNTING.md — Accounting module (BC08 Accounting); consumes patient identity for patient-level cost analysis
- AUDIT_LOGS.md — Audit module (BC17 Audit); records every consequential patient-related action

### 18.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit (every permission check is recorded in the audit trail)
