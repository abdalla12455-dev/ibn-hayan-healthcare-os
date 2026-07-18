# Ibn Hayan Healthcare Operating System — Terminology

| Field | Value |
|---|---|
| Document Title | Terminology |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a code system update or regional terminology amendment is ratified |
| Audience | Clinical informatics officers, software architects, module owners, integration architects, localization leads, compliance officers, terminology service team |
| Scope | Controlled medical vocabulary and terminology standards adopted across Ibn Hayan; code system bindings, mappings, local extensions, governance, versioning, multi-language support, Arabic considerations, search, maintenance |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-code value set catalogues, vendor-specific terminology server selection, deployment runbooks |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Terminology definitions in this document elaborate the bounded-context contracts of SYSTEM_ARCHITECTURE Section 7 and the regional-adaptation commitments of PRODUCT_BIBLE Section 25. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Terminology Overview
2. Terminology Standards (SNOMED CT, LOINC, ICD-10/11, RxNorm)
3. Local Terminology Extensions
4. Terminology Mapping
5. Code System Governance
6. Terminology Binding to Data Models
7. Multi-Language Terminology Support
8. Arabic Terminology Considerations
9. Terminology Search & Lookup
10. Terminology Versioning
11. Terminology Maintenance Process
12. Related Documents

---

## 1. Terminology Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for terminology used across the Ibn Hayan Healthcare Operating System. It defines the controlled medical vocabularies that the platform adopts, the local extensions permitted when standard vocabularies are insufficient, the mapping rules that bridge code systems, the governance that keeps terminology coherent across tenants and regions, and the maintenance process that keeps the platform aligned with upstream code system releases. Terminology is treated as a first-class domain concern because clinical fidelity, billing accuracy, regulatory reporting, and analytics all depend on consistent codes.

Terminology in Ibn Hayan is not a translation layer applied after the fact. It is a structural commitment encoded into bounded-context contracts (SYSTEM_ARCHITECTURE Section 7.4) and into the platform's data model. A clinical observation recorded in one clinic, in one region, in one language must be computationally comparable to the same observation recorded in another clinic, region, or language. The mechanism by which that comparability is achieved is the disciplined use of controlled vocabularies as documented in this reference. Where the platform permits local extensions, the extensions are themselves governed, versioned, and mapped to standard codes so that comparability is preserved.

This document sits below `SYSTEM_ARCHITECTURE.md` and aligns with `PRODUCT_BIBLE.md` Section 25 (Localization Strategy), Section 29 (Integration Philosophy), and Section 31 (Security Philosophy). It does not override those documents. Where a downstream module specification or integration contract refers to terminology behaviour, this document is the binding reference.

### 1.2 Terminology Scope

The scope of terminology in Ibn Hayan covers four concentric layers. The innermost layer is the clinical terminology used to record observations, diagnoses, procedures, medications, and laboratory results. The second layer is the administrative terminology used for encounters, appointments, billing, claims, and insurance. The third layer is the platform terminology used for configuration keys, role codes, status codes, and audit event types. The outermost layer is the operational vocabulary used in user-facing strings, notifications, and reports.

All four layers are governed by this document, but with different rigour. The clinical and administrative layers are bound to external code systems (SNOMED CT, LOINC, ICD-10/11, RxNorm, CPT, HCPCS, ATC, and regional equivalents) and inherit their governance from those code systems' issuing authorities. The platform layer is bound to internal code systems defined by the Architecture Council and is governed by this document and the Architecture Decision Record process. The operational layer is bound to the localization pack in force for the tenant and is governed by the regional profile documented in PRODUCT_BIBLE Section 25.3.

Out of scope for this document are the per-code catalogues themselves, the vendor-specific terminology server selection, and the implementation of terminology services. Those concerns belong to per-module specifications and the configuration of the terminology service. This document defines what code systems are adopted, how they are governed, and how they bind to the domain model — not how the terminology service is deployed.

### 1.3 Ibn Hayan Terminology Posture

Ibn Hayan adopts a terminology posture built on four commitments. First, standard over local: where a recognized code system covers a domain, the platform uses that code system rather than inventing a local code. Second, structured over free-text: clinical, administrative, and financial fields that have coded equivalents are coded, with free text permitted only where no code exists or where the practitioner's narrative is essential. Third, mapped over isolated: where multiple code systems cover a domain, the platform maintains crosswalks so that a code in one system can be expressed in another. Fourth, versioned over implicit: every code reference is accompanied by the code system version, so that a downstream consumer can interpret the code in the context in which it was recorded.

These four commitments are the architectural floor for terminology in Ibn Hayan. A module that records a code without its code system, without its version, or without a mapping to a standard code is defective. A module that uses a local code where a standard code exists is defective unless the local code is a documented extension with a mapping. The terminology service enforces these commitments at validation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.4 Glossary of Recurring Domain Terms

The table below consolidates terms that recur across the Ibn Hayan documentation framework. These terms are the working vocabulary of architects, module owners, and integrators. Many of them are defined in `PRODUCT_BIBLE.md` Section 33; this table extends that glossary with terminology-domain-specific entries. Local terms not listed here are defined in the document in which they first appear.

| Term | Definition | Module / Context | Synonyms | Source Authority |
|---|---|---|---|---|
| Active Tenant | A tenant in steady-state operation | Subscriptions / BC16 | Live tenant | PRODUCT_BIBLE Section 23.3 |
| Adverse Event | An untoward clinical occurrence associated with a medication or procedure | Clinical Documentation / BC03 | Side effect, ADR | ICH E2A |
| Anticorruption Layer | A translation boundary that prevents external model leakage | Integration / BC19 | ACL | SYSTEM_ARCHITECTURE Section 7.3 |
| Assessment | A structured clinical evaluation captured through a template | Clinical Documentation / BC03 | Clinical assessment | SNOMED CT 704326004 |
| Audit Record | An immutable record of a consequential action | Audit / BC17 | Audit entry | SYSTEM_ARCHITECTURE Section 27.4 |
| Bounded Context | A defined area of domain responsibility | Platform / BC16 | Context | SYSTEM_ARCHITECTURE Section 7.2 |
| Break-Glass Access | Emergency access to restricted records | Identity & Access / BC15 | Emergency access | PRODUCT_BIBLE Section 21.6 |
| Care Plan | A documented plan for a patient's care over time | Clinical Documentation / BC03 | Treatment plan | SNOMED CT 734163000 |
| Care Team | A group of practitioners responsible for a patient cohort | Encounter / BC02 | Care team | PRODUCT_BIBLE Section 11 |
| Claim | A submission to a payer for reimbursement | Billing / BC07 | Insurance claim | X12 837 |
| Code System | A controlled vocabulary of clinical or administrative concepts | Terminology / BC19 | Vocabulary, terminology | HL7 FHIR CodeSystem |
| Code System Version | The specific release of a code system used to interpret a code | Terminology / BC19 | Edition | HL7 FHIR CodeSystem.version |
| Composition | The resolved configuration for a context | Configuration / BC16 | Effective config | CONFIGURATION_ARCHITECTURE Section 2.4 |
| Concept | A unit of meaning in a code system | Terminology / BC19 | Term | SNOMED CT Concept |
| Concept Map | A defined mapping between concepts in two code systems | Terminology / BC19 | Crosswalk, map | HL7 FHIR ConceptMap |
| Configuration Key | A named, typed configuration parameter | Configuration / BC16 | Setting | SYSTEM_ARCHITECTURE Section 15.3 |
| Configuration Layer | One of eight scopes at which configuration applies | Configuration / BC16 | Config layer | SYSTEM_ARCHITECTURE Section 15.2 |
| Conformist | A bounded-context relationship of conformity to an external model | Integration / BC19 | — | SYSTEM_ARCHITECTURE Section 7.3 |
| Encounter | A clinical contact between patient and provider | Encounter / BC02 | Visit | HL7 FHIR Encounter |
| Encounter Type | The classification of an encounter | Encounter / BC02 | Visit type | SNOMED CT 308335008 |
| Facility | A physical care-delivery location within a tenant | Organization / BC16 | Site | PRODUCT_BIBLE Section 11 |
| Feature Flag | A binary or near-binary capability exposure switch | Feature Flags / BC18 | Flag | SYSTEM_ARCHITECTURE Section 14 |
| Formulary | A list of medications approved for use | Pharmacy / BC05 | Drug list | Pharmacy practice |
| ICD-10 | International Classification of Diseases, Tenth Revision | Terminology / BC19 | — | WHO |
| ICD-11 | International Classification of Diseases, Eleventh Revision | Terminology / BC19 | — | WHO |
| Identity | A unique, governed representation of a person or system | Identity & Access / BC15 | — | PRODUCT_BIBLE Section 21 |
| Identifier | A code that uniquely identifies an entity within a system | Patient / BC01 | ID | HL7 FHIR Identifier |
| Integration | A connection to an external system through a documented contract | Integration / BC19 | — | PRODUCT_BIBLE Section 29 |
| Lab Panel | A set of laboratory tests ordered together | Orders & Results / BC04 | Panel | LOINC |
| Lab Result | The outcome of a laboratory test | Orders & Results / BC04 | Result | LOINC |
| Localization Pack | A regional adaptation bundle | Localization / BC19 | Locale pack | PRODUCT_BIBLE Section 25.3 |
| LOINC | Logical Observation Identifiers Names and Codes | Terminology / BC19 | — | Regenstrief Institute |
| Module | A bounded product capability shipped as part of the platform | Platform / BC16 | — | PRODUCT_BIBLE Section 19 |
| Medication Administration | The act of giving a medication to a patient | Pharmacy / BC05 | MAR entry | HL7 FHIR MedicationAdministration |
| Medication Order | A prescription or medication order | Pharmacy / BC05 | Prescription | HL7 FHIR MedicationRequest |
| Note | A clinical narrative entry | Clinical Documentation / BC03 | Progress note | HL7 FHIR DocumentReference |
| Observation | A recorded clinical finding | Orders & Results / BC04 | Finding | HL7 FHIR Observation |
| Order | A request for a diagnostic or therapeutic service | Orders & Results / BC04 | — | HL7 FHIR ServiceRequest |
| Orderable | An item that can be ordered through the order catalogue | Orders & Results / BC04 | Catalogue entry | Internal |
| Override | A configuration value at a higher layer replacing a lower one | Configuration / BC16 | — | CONFIGURATION_ARCHITECTURE Section 2.2 |
| Patient | The ultimate stakeholder; the person receiving care | Patient / BC01 | — | PRODUCT_BIBLE Section 4.5 |
| Patient Entity | The data model entity representing a patient | Patient / BC01 | Patient record | PRODUCT_BIBLE Section 19, M01 |
| Payer | A party that pays for healthcare services | Billing / BC07 | Insurer | X12 837 |
| Permission | An action-level grant on a resource | Identity & Access / BC15 | — | PRODUCT_BIBLE Section 21 |
| Practitioner | A person who uses the platform in clinical work | Encounter / BC02 | — | PRODUCT_BIBLE Section 3.4 |
| Pre-Authorization | Payer approval prior to service delivery | Billing / BC07 | Prior auth | X12 278 |
| Principal | The actor (user or system) behind an action | Identity & Access / BC15 | Actor | SYSTEM_ARCHITECTURE Section 27.4 |
| Referral | A request for a patient to receive care from another provider | Orders & Results / BC04 | — | HL7 FHIR ServiceRequest |
| Regional Profile | A localization pack applied for a region | Localization / BC19 | Locale | PRODUCT_BIBLE Section 25.3 |
| Reimbursement | Payment by a payer for services rendered | Billing / BC07 | — | X12 835 |
| Resultable | An item that can produce a result | Orders & Results / BC04 | Result type | Internal |
| Result Interpretation | A coded assessment of a result | Orders & Results / BC04 | Abnormal flag | HL7 FHIR Observation.interpretation |
| Role | A defined set of permissions | Identity & Access / BC15 | — | PRODUCT_BIBLE Section 20 |
| RxNorm | A normalized naming system for clinical drugs | Terminology / BC19 | — | NLM |
| SNOMED CT | Systematized Nomenclature of Medicine — Clinical Terms | Terminology / BC19 | — | SNOMED International |
| Sandbox Tenant | A non-production tenant for testing | Configuration / BC16 | — | PRODUCT_BIBLE Section 15.5 |
| Shared Kernel | A small, jointly owned kernel of common concepts | Patient / BC01 | — | SYSTEM_ARCHITECTURE Section 7.3 |
| State | The current condition of an entity or workflow | Workflow / BC16 | — | SYSTEM_ARCHITECTURE Section 17 |
| Status Code | A coded representation of an entity's lifecycle stage | Platform / BC16 | — | This document cross-reference: STATUS_CODES.md |
| Subscription | A customer's commercial relationship with Ibn Hayan | Subscriptions / BC16 | — | PRODUCT_BIBLE Section 16 |
| Tenant | The logical isolation boundary for a single customer | Platform / BC16 | — | PRODUCT_BIBLE Section 1.4 |
| Tenant Lifecycle | The seven-stage lifecycle of a tenant | Subscriptions / BC16 | — | PRODUCT_BIBLE Section 23.3 |
| Terminology Binding | The association of a data element with a code system | Terminology / BC19 | Binding | HL7 FHIR terminology binding |
| Terminology Service | The service that resolves codes and value sets | Terminology / BC19 | — | HL7 FHIR Terminology Service |
| Value Set | A defined set of codes drawn from one or more code systems | Terminology / BC19 | — | HL7 FHIR ValueSet |
| Vital Sign | A routine clinical observation | Orders & Results / BC04 | Vital | LOINC |
| Workflow | A coordinated multi-step process | Workflow / BC16 | — | SYSTEM_ARCHITECTURE Section 16 |
| Workflow Step | A single action within a workflow | Workflow / BC16 | Step | SYSTEM_ARCHITECTURE Section 16.2 |

### 1.5 Document Position in the Architecture Spine

This document elaborates `SYSTEM_ARCHITECTURE.md` Section 7 (Domain-Driven Architecture), Section 19 (Integration Architecture), Section 26 (Localization Architecture), and Section 27 (Audit Architecture, insofar as audit captures terminology-relevant events). It also elaborates `PRODUCT_BIBLE.md` Section 25 (Localization Strategy) and Section 29 (Integration Philosophy). Sibling documents include `ENUMS.md` (platform-level enumerations), `STATUS_CODES.md` (lifecycle-state codes), and `BUSINESS_RULES.md` (rule catalogue). Where this document defines a code system adoption that an enumeration or status code depends on, the dependency is recorded explicitly under the related document's section.

The terminology posture defined here is binding on every module specification under `docs/07_MODULES/` and on every integration specification under `docs/04_INTEGRATIONS/`. A module that records clinical, administrative, or financial coded data must conform to the bindings declared in Section 6 of this document. An integration that exchanges coded data with an external system must conform to the mapping rules in Section 4 and the governance in Section 5.

---

## 2. Terminology Standards (SNOMED CT, LOINC, ICD-10/11, RxNorm)

### 2.1 Code System Adoption Rationale

Ibn Hayan adopts recognized external code systems rather than inventing proprietary codes wherever a recognized code system covers the domain. This commitment is the direct expression of Principle P12 (Open Standards Over Proprietary) defined in SYSTEM_ARCHITECTURE Section 4.12 and of the integration philosophy documented in PRODUCT_BIBLE Section 29. Adopting recognized code systems delivers four benefits: comparability across tenants and regions, reduced mapping burden in integrations with external systems, regulatory acceptance, and access to the issuing authority's maintenance process. The cost is dependency on the issuing authority's release cycle, which is managed through the versioning discipline in Section 10.

The four primary code systems adopted by Ibn Hayan are SNOMED CT for clinical concepts, LOINC for laboratory and observation identification, ICD-10/11 for diagnostic classification and reporting, and RxNorm for clinical drug identification. Each is described in its own subsection below. Where regional regulatory frameworks mandate additional or alternative code systems (such as CPT or HCPCS for the United States, ATC for European pharmacovigilance, or local procedure classifications), those systems are adopted as overlays on top of the four primary systems, with crosswalks documented under Section 4.

The platform does not modify, subset, or extend external code systems within the platform's own namespace. Where a subset is needed (for example, a value set for a specific clinical template), the subset is expressed as a value set that references the issuing code system, not as a fork of the code system. This discipline preserves the integrity of the code system and the platform's ability to consume future releases without conflict.

### 2.2 SNOMED CT

SNOMED CT is the primary clinical terminology for Ibn Hayan. It is used for clinical findings, procedures, body structures, organisms, substances, pharmaceutical and biologic products, situations with explicit context, specimens, and other clinical concepts. SNOMED CT is bound to fields in the Clinical Documentation bounded context (BC03), the Encounter bounded context (BC02), the Orders & Results bounded context (BC04), and the Pharmacy bounded context (BC05), as documented in Section 6 of this file.

The platform adopts the SNOMED CT International Edition as the base, with national extensions loaded where a tenant operates in a jurisdiction that publishes one (for example, the US Edition, the Spanish Edition, the Canadian English Edition, the Danish Edition). The selection of national extension is a tenant-level configuration action governed by the regional profile (PRODUCT_BIBLE Section 25.3). The platform does not commit to a specific SNOMED CT edition version at the architectural level; the active edition is recorded in the terminology service's edition manifest and is versioned as documented in Section 10.

| SNOMED CT Domain | Typical Use in Ibn Hayan | Bounded Context |
|---|---|---|
| Clinical finding | Problem list entries, assessment findings | BC03 |
| Procedure | Procedures performed and ordered | BC04 |
| Body structure | Anatomical site of findings and procedures | BC03, BC04 |
| Situation with explicit context | Documented family history, allergies, adverse reactions | BC01, BC03 |
| Pharmaceutical / biologic product | Medication identification at clinical level | BC05 |
| Specimen | Laboratory specimen type | BC04 |
| Observable entity | Type of observation captured | BC04 |
| Event | Clinical events recorded in the record | BC03 |

Where SNOMED CT does not cover a concept that Ibn Hayan needs (for example, a region-specific administrative concept), the gap is filled through a local extension as documented in Section 3, with a mapping to the closest SNOMED CT concept where one exists.

### 2.3 LOINC

LOINC (Logical Observation Identifiers Names and Codes) is the primary terminology for laboratory observations, clinical observations, and document types in Ibn Hayan. It is bound to fields in the Orders & Results bounded context (BC04) for laboratory test identification and result reporting, and in the Clinical Documentation bounded context (BC03) for clinical document type identification. LOINC's coverage of laboratory tests is comprehensive and is the platform's default code system for any laboratory order or result.

The platform adopts the LOINC release published by the Regenstrief Institute. The active release is recorded in the terminology service's edition manifest. LOINC is updated twice-yearly; the platform follows the versioning discipline documented in Section 10 to consume new releases without disrupting in-flight orders. Value sets that reference LOINC codes are themselves versioned, so that a historical result retains the LOINC code that was active when the result was recorded.

| LOINC Domain | Typical Use in Ibn Hayan | Bounded Context |
|---|---|---|
| Laboratory test | Lab order catalogue, lab result identification | BC04 |
| Clinical observation | Vital signs, clinical measurements | BC04 |
| Document ontology | Clinical document type | BC03 |
| Survey | Patient-reported outcome instruments | BC03 |
| Panels | Lab panels, vital-sign panels | BC04 |

### 2.4 ICD-10 and ICD-11

ICD-10 and ICD-11 are the diagnostic classification systems used by Ibn Hayan for problem-list classification, encounter diagnosis coding, billing diagnosis coding, and regulatory reporting. The platform supports both editions concurrently because regulatory frameworks differ in their required edition: some jurisdictions require ICD-10 (including ICD-10-CM for the United States, ICD-10-CA for Canada, and various national clinical modifications), while others have transitioned to ICD-11. The platform does not force a tenant to one edition; the active edition is a tenant-level configuration action governed by the regional profile.

The platform maintains ICD-10 to ICD-11 crosswalks as documented in Section 4. A diagnosis recorded in ICD-10 is mapped to its ICD-11 equivalent for downstream consumers that require ICD-11, and vice versa. The crosswalk is governed by the World Health Organization's published mapping tables where they exist; where no published mapping exists, the gap is filled through a documented local mapping with the rationale recorded. ICD-10-CM and other clinical modifications are bound where the regional profile requires them, with crosswalks to the ICD-10 base edition.

### 2.5 RxNorm

RxNorm is the primary terminology for clinical drug identification in Ibn Hayan. It is bound to fields in the Pharmacy bounded context (BC05) for medication identification, medication order entries, medication administration records, and formulary entries. RxNorm's normalized drug names and semantic clinical drug (SCD) and semantic clinical drug form (SCDF) concepts provide the stable identifiers the platform uses for cross-system drug identification.

The platform adopts the RxNorm release published by the United States National Library of Medicine. Where a tenant operates in a jurisdiction with a national drug catalogue that is not RxNorm-aligned (for example, the European dm+d, or a national medicines register), that catalogue is loaded as an overlay with crosswalks to RxNorm. The platform does not record a medication using only a national catalogue code; the national code is accompanied by an RxNorm crosswalk where one exists, so that downstream consumers can interpret the medication consistently.

### 2.6 Secondary and Regional Code Systems

In addition to the four primary code systems, Ibn Hayan adopts secondary and regional code systems where regulatory or operational necessity requires. The table below lists the secondary and regional code systems currently recognized by the platform, the domain they cover, and the bounded context to which they are bound. New secondary code systems are added through the Architecture Council process documented in Section 5.

| Code System | Domain | Issuing Authority | Bounded Context |
|---|---|---|---|
| CPT | Physician procedures (US) | American Medical Association | BC04, BC07 |
| HCPCS | Procedures, supplies (US) | CMS | BC04, BC07 |
| ATC | Anatomical Therapeutic Chemical classification | WHO Collaborating Centre | BC05 |
| NDC | National Drug Code (US) | FDA | BC05 |
| dm+d | Dictionary of Medicines and Devices (UK) | NHS | BC05 |
| CVX | Vaccine codes | CDC | BC05 |
| ISBT 128 | Blood products | ICCBBA | BC05 |
| AJCC | Cancer staging | American Joint Committee on Cancer | BC03 |
| Glasgow Coma Scale | Neurological assessment | Clinical convention | BC03 |
| ASA Physical Status | Pre-operative assessment | American Society of Anesthesiologists | BC03 |

---

## 3. Local Terminology Extensions

### 3.1 When Local Extensions Are Permitted

Local terminology extensions are permitted in Ibn Hayan only when three conditions are met. First, no recognized external code system covers the concept; the absence must be documented, not assumed. Second, the concept recurs across multiple tenants or multiple workflows within a tenant; one-off operational labels are handled as user-defined labels, not as terminology extensions. Third, the extension is registered through the Architecture Council process documented in Section 5, with a stable identifier, a definition, a code system namespace, and a mapping to the closest external concept where one exists. Extensions that bypass this process are defective and are rejected at terminology validation.

The discipline around local extensions reflects the platform's commitment to comparability across tenants and regions. A code recorded under a local extension in one tenant must be interpretable in another tenant or in an external system. Without registration and mapping, the code is opaque outside its origin tenant, which compromises the platform's auditability, analytics, and regulatory reporting. The Architecture Council reviews each proposed extension for necessity, scope, and mapping before approval.

### 3.2 Local Extension Namespaces

Local extensions are issued under a controlled namespace that distinguishes them from external code systems. The namespace follows a stable convention: the platform's local extension namespace prefix, followed by the module or domain code, followed by the concept identifier. The full identifier is unique within the platform and is not reused if the extension is retired. Retired identifiers are preserved in the terminology service's retired-identifier list so that historical records remain interpretable.

The use of a controlled namespace is non-negotiable. A module that records a local code without the namespace prefix is defective. The terminology service rejects unregistered codes at validation time. The platform does not permit "private" code systems per tenant; tenants that need a region-specific code publish it through the Architecture Council process so that it is available to any tenant operating in the same region. This treatment preserves the one-platform commitment of Principle P3 documented in SYSTEM_ARCHITECTURE Section 4.4.

### 3.3 Common Local Extension Domains

Local extensions are typically needed in three domains. First, regional administrative concepts that have no international code system, such as a national insurance scheme identifier or a regional facility licence type. Second, platform-specific operational concepts that have no clinical analogue, such as configuration layer codes (L1 through L8) and feature flag lifecycle codes (FFL1 through FFL5). Third, clinical concepts that are well-defined in clinical practice but not yet covered by SNOMED CT or LOINC, such as emerging clinical observations or specialty-specific assessment findings.

The table below catalogues the local extension domains currently in use in Ibn Hayan. New domains are added through the Architecture Council process. Each domain has a designated owner who is responsible for the maintenance of the extension's value sets and mappings.

| Local Extension Domain | Namespace | Owner | Example Use |
|---|---|---|---|
| Configuration layer codes | IH-CONF | Architecture Council | L1 through L8 |
| Feature flag types | IH-FF | Architecture Council | FF1 through FF5 |
| Feature flag lifecycle | IH-FFL | Architecture Council | FFL1 through FFL5 |
| Audit surfaces | IH-AUDIT | Architecture Council | Clinical, financial, operational |
| Validation rule categories | IH-VAL | Architecture Council | V1 through V5 |
| Tenant lifecycle stages | IH-SUB | Architecture Council | TL1 through TL7 |
| Workflow patterns | IH-WF | Architecture Council | Sequential, parallel, conditional |
| Regional administrative concepts | IH-REG-{ISO-3166} | Regional Council | National insurance scheme IDs |
| Specialty assessment templates | IH-ASM-{specialty} | Clinical Informatics Council | Specialty-specific assessments |

### 3.4 Local Extension Mapping

Every local extension is mapped to the closest external concept where one exists. The mapping is recorded in a concept map, with the mapping relationship type declared (equivalent, broader, narrower, related). Where no equivalent external concept exists, the mapping is to the broader or related concept, with the gap documented. Where no related external concept exists, the extension is recorded as unmatched, and the rationale for the unmatched extension is documented in the extension's registration record.

The mapping discipline enables downstream consumers to interpret local codes in standard terms. A regulatory report that requires an ICD-11 code, for example, can resolve a local extension through the concept map to the closest ICD-11 concept, with the mapping relationship type recorded in the report. The mapping discipline also enables analytics across tenants: a KPI that aggregates encounters by diagnosis can resolve tenant-specific local extensions to a common standard for cross-tenant comparison.

### 3.5 Local Extension Deprecation

Local extensions are deprecated when an external code system releases a concept that covers the extension's domain. The deprecation follows the platform's deprecation policy: the extension is marked deprecated, a migration path to the external code is documented, and the extension remains available for historical record interpretation until the migration window closes. The deprecated extension is not removed from the terminology service's retired-identifier list, ensuring that historical records remain interpretable indefinitely.

Deprecation is governed by the Architecture Council. A deprecation requires an ADR with the rationale, the migration plan, and the transition window. The transition window is at least one full release cycle of the platform, and longer for extensions that are widely used in historical records. During the transition window, both the extension and the external code are valid for new records; after the window closes, only the external code is valid for new records, with the extension retained for historical interpretation.

---

## 4. Terminology Mapping

### 4.1 Mapping Categories

Terminology mapping in Ibn Hayan is the disciplined practice of relating concepts across code systems so that a code recorded in one system can be expressed in another. The platform recognizes four mapping relationship types, adopted from the HL7 FHIR ConceptMap specification: equivalent (the concepts have the same meaning), broader (the source concept is more specific than the target), narrower (the source concept is more general than the target), and related (the concepts are related but not equivalent in either direction). Each mapping records its relationship type, and downstream consumers use the relationship type to interpret the mapping correctly.

Mapping is unidirectional at the record level but bidirectional at the concept-map level. A concept map from code system A to code system B contains mappings from A concepts to B concepts; the inverse map is a separate concept map. This separation preserves the clarity of the source-to-target relationship and prevents the ambiguity that arises from assuming bidirectionality. Where bidirectional equivalence is needed, both directions are recorded as separate mappings.

### 4.2 Standard Crosswalks Maintained by Ibn Hayan

Ibn Hayan maintains a catalogue of standard crosswalks that the platform uses routinely. The catalogue is documented below. Each crosswalk has a designated owner, a source code system version, a target code system version, and a maintenance cadence. Crosswalks are updated when either source or target code system publishes a release, and on a scheduled review cadence documented in Section 11.

| Crosswalk | Source | Target | Owner | Maintenance Cadence |
|---|---|---|---|---|
| ICD-10 to ICD-11 | ICD-10 (WHO) | ICD-11 (WHO) | Architecture Council | On WHO release |
| ICD-10-CM to ICD-10 | ICD-10-CM (NCHS) | ICD-10 (WHO) | Regional Council | On NCHS release |
| SNOMED CT to ICD-10 | SNOMED CT (Snomed Intl) | ICD-10 (WHO) | Architecture Council | On SNOMED release |
| SNOMED CT to ICD-11 | SNOMED CT (Snomed Intl) | ICD-11 (WHO) | Architecture Council | On SNOMED release |
| LOINC to SNOMED CT | LOINC (Regenstrief) | SNOMED CT (Snomed Intl) | Architecture Council | On LOINC release |
| RxNorm to ATC | RxNorm (NLM) | ATC (WHO CC) | Architecture Council | On RxNorm release |
| RxNorm to NDC | RxNorm (NLM) | NDC (FDA) | Architecture Council | On RxNorm release |
| CPT to SNOMED CT | CPT (AMA) | SNOMED CT (Snomed Intl) | Regional Council | On AMA release |
| Local extensions to standard | IH-REG-* | SNOMED CT / ICD / LOINC | Architecture Council | On extension or standard release |

### 4.3 Mapping Confidence and Provenance

Each mapping carries a confidence level and a provenance record. The confidence level records whether the mapping is authoritative (issued by the source code system's issuing authority), curated (reviewed by the Architecture Council), or unverified (recorded for operational use pending curation). The provenance records who created or reviewed the mapping, when, and the basis for the mapping decision. Provenance is recorded in the concept map's metadata, not in each individual mapping record, except where a mapping departs from the issuing authority's published mapping and requires explicit justification.

The confidence level is consumed by downstream analytics and regulatory reporting. A regulatory report that requires ICD-11 codes uses authoritative mappings where they exist, curated mappings where authoritative mappings are absent, and unverified mappings only with the report flagging the unverified status. This discipline prevents the platform from producing reports that imply a confidence the platform does not have. The discipline is the direct expression of Principle P13 (Auditability as Primitive) — the platform records what it knows and what it does not, without implying false confidence.

### 4.4 Mapping Resolution at Runtime

At runtime, the terminology service resolves a code through a concept map on demand. The caller specifies the source code, the source code system, and the target code system. The service returns the target code, the relationship type, the confidence level, and the provenance. The caller decides whether to use the mapping based on the relationship type and confidence; the service does not silently substitute an equivalent-looking code where the mapping is narrower or unverified.

The runtime resolution discipline is critical for clinical safety. A lab result that is mapped narrowly to a different code system may lose specificity that is clinically relevant; a diagnosis mapped broadly may overstate the patient's condition. The terminology service surfaces the relationship type so that the consuming module can decide whether to use the mapping, to flag the mapping in the user interface, or to retain the original code alongside the mapping. This treatment is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) in the terminology domain.

### 4.5 Mapping Gaps and Issue Tracking

Where a mapping does not exist, the gap is recorded as a mapping issue. Mapping issues are tracked in the terminology service's issue register and are reviewed on the maintenance cadence documented in Section 11. A mapping issue does not block the recording of the source code; the source code is recorded with the gap noted, and the mapping is added when the curation process catches up. Mapping issues that affect clinical safety or regulatory reporting are escalated for priority curation.

The issue-tracking discipline ensures that mapping gaps are visible rather than hidden. A module that silently falls back to a code-system default when a mapping is missing is defective; the platform requires that the gap be recorded and surfaced. This visibility is the basis for the platform's mapping quality metrics, which are reviewed quarterly by the Architecture Council.

---

## 5. Code System Governance

### 5.1 Governance Bodies

Code system governance in Ibn Hayan is exercised by three bodies. The Architecture Council holds overall authority for code system adoption, local extension registration, and crosswalk curation. The Clinical Informatics Council holds advisory authority for clinical code system bindings, value set composition, and clinical template design. The Regional Council holds advisory authority for regional code system adoption, national extensions, and region-specific value sets. All three bodies operate under the Architecture Council's ratification process documented in SYSTEM_ARCHITECTURE Section 1.2.

Governance is exercised through Architecture Decision Records. A code system adoption, a local extension registration, a crosswalk curation, and a deprecation are each ratified through an ADR. The ADR records the decision, the alternatives considered, the rationale, the consequences, and the amendment mechanism. The ADR is recorded in the CHANGELOG with the version increment. This discipline is the direct expression of Principle P7 (Documented Before Implemented) defined in SYSTEM_ARCHITECTURE Section 4.7.1.

### 5.2 Code System Adoption Criteria

A code system is adopted by Ibn Hayan when it meets five criteria. First, the code system is published by a recognized issuing authority. Second, the code system has a documented release process with predictable cadence. Third, the code system is available under licensing terms that permit platform-wide use, including use by tenants operating in jurisdictions other than the issuing authority's jurisdiction. Fourth, the code system covers a domain that is in scope for the platform and is not adequately covered by an existing adoption. Fifth, the code system is documented to a level that permits the platform's terminology service to consume it without ambiguity.

The five criteria are evaluated by the Architecture Council on proposal. A proposal that does not meet all five criteria is rejected; the rejection is recorded with the rationale so that future proposals are informed by the precedent. The criteria are not relaxed to accommodate a tenant-specific need; a tenant that requires a code system that does not meet the criteria is served through a local extension mapped to the closest adopted code, as documented in Section 3.

### 5.3 Code System Licensing and Attribution

Code systems adopted by Ibn Hayan are subject to the licensing terms of their issuing authorities. The platform records the licence under which each code system is used and ensures that the platform's use complies with the licence. Where the licence requires attribution, the attribution is recorded in the platform's documentation and surfaced in the regulatory documentation produced for tenants. Where the licence restricts use to specific jurisdictions, the restriction is recorded in the code system's registration and enforced through the regional profile configuration.

Licensing is reviewed at each code system release. A code system whose licence has changed in a way that the platform cannot accommodate is escalated to the Architecture Council for a decision: renegotiate the licence, migrate to an alternative code system, or restrict the platform's use of the code system to the jurisdictions permitted by the new licence. The decision is recorded in an ADR with the migration plan where migration is required. This discipline ensures that the platform's terminology posture remains legally compliant across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 5.4 Code System Registration

Each adopted code system is registered in the platform's code system registry. The registry records the code system's canonical identifier, its display name, its issuing authority, its licensing terms, its current active version, its release cadence, its designated owner, and the bounded contexts to which it is bound. The registry is the platform's authoritative reference for code system adoption and is consumed by the terminology service for code validation and resolution.

The registry is versioned. A change to the registry (a new code system adoption, a version update, a deprecation) is a configuration action governed by the configuration lifecycle documented in CONFIGURATION_ARCHITECTURE Section 8. The registry's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5, ensuring that the platform's code system adoption history is recoverable indefinitely.

### 5.5 Code System Sunset and Replacement

A code system is sunset when its issuing authority ceases maintenance, when a successor code system is adopted, or when the platform's regional posture no longer requires the code system. The sunset follows the platform's deprecation policy: a sunset ADR is ratified, the sunset date is recorded, a migration path to the successor code system is documented, and the code system remains available for historical record interpretation indefinitely. The sunset code system is not removed from the registry; it is marked sunset with the sunset date and the successor code system recorded.

The sunset discipline preserves the platform's ability to interpret historical records across the decade horizon. A patient whose historical record contains codes from a sunset code system must remain interpretable throughout the patient's lifetime. This discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) defined in SYSTEM_ARCHITECTURE Section 4.18, applied to the terminology domain.

---

## 6. Terminology Binding to Data Models

### 6.1 Binding Strength Levels

Terminology binding is the discipline of associating a data element with a code system or value set. Ibn Hayan adopts the HL7 FHIR binding strength levels: required (the data element must be populated with a code from the bound value set), extensible (the data element must be populated with a code from the bound value set if a suitable code exists, otherwise a text representation is permitted), preferred (the bound value set is recommended but not enforced), and example (the bound value set is illustrative only). Each data element's binding strength is declared in the element's schema and enforced at validation time.

The binding strength is chosen per data element based on the element's clinical, administrative, or financial consequence. Clinical data elements that affect patient safety (allergy declarations, medication codes, problem-list entries) carry required bindings. Clinical data elements that benefit from coding but tolerate free text (clinical notes, narrative findings) carry extensible bindings. Operational data elements that benefit from coding (encounter cancellation reasons, transfer reasons) carry preferred or example bindings. The binding strength catalogue is maintained by the Architecture Council with the Clinical Informatics Council's advisory input.

### 6.2 Binding Catalogue by Bounded Context

The table below summarizes the binding posture of each bounded context. The detailed binding catalogue is maintained in each bounded context's contract documentation (SYSTEM_ARCHITECTURE Section 7.4). The summary here is the cross-context view that the Architecture Council uses to identify binding gaps, inconsistencies, and opportunities for crosswalk curation.

| Bounded Context | Primary Code Systems | Binding Posture |
|---|---|---|
| BC01 Patient | SNOMED CT, HL7 FHIR Identifier, regional patient identifiers | Required for identifiers; extensible for demographic fields |
| BC02 Encounter | SNOMED CT, ICD-10/11 | Required for encounter type and diagnosis; extensible for visit reason |
| BC03 Clinical Documentation | SNOMED CT, LOINC document ontology, ICD-10/11 | Required for coded findings; extensible for narrative |
| BC04 Orders & Results | LOINC, SNOMED CT, CPT (US) | Required for orderable and resultable; required for result interpretation |
| BC05 Pharmacy | RxNorm, ATC, NDC (US), CVX | Required for medication code; extensible for formulation |
| BC06 Scheduling | SNOMED CT, local extensions | Preferred for appointment type; example for cancellation reason |
| BC07 Billing | ICD-10/11, CPT, HCPCS, X12 code sets | Required for billing codes; required for claim status |
| BC08 Accounting | Local extensions, regional tax codes | Required for tax code; preferred for accounting category |
| BC09 Inventory | Local extensions, regional supply codes | Required for inventory category; preferred for supplier |
| BC10 Workforce | Local extensions | Preferred for credential type; preferred for shift code |
| BC11 CRM | Local extensions | Preferred for outreach type; example for outreach outcome |
| BC12 HR | Local extensions, regional payroll codes | Required for payroll code; preferred for employment status |
| BC13 Documents | LOINC document ontology, local extensions | Required for document type; extensible for document category |
| BC14 Notifications | Local extensions | Preferred for notification type; preferred for channel |
| BC15 Identity & Access | Local extensions | Required for role code; required for permission code |
| BC16 Configuration | Local extensions (IH-CONF, IH-FF, IH-FFL, IH-VAL) | Required for layer code; required for validation rule category |
| BC17 Audit | Local extensions (IH-AUDIT) | Required for audit surface; required for audit action |
| BC18 Feature Flags | Local extensions (IH-FF, IH-FFL) | Required for flag type; required for lifecycle stage |
| BC19 Localization | ISO 639, ISO 3166, IANA timezone, BCP 47 | Required for locale identifier; required for region code |

### 6.3 Binding Enforcement

Binding enforcement is performed by the terminology service at validation time. A data element with a required binding that is not populated with a code from the bound value set is rejected at validation, with the rejection recorded as an audit event. A data element with an extensible binding that is populated with a code outside the bound value set is accepted with a validation warning, and the code is reviewed by the curation process. A data element with a preferred or example binding is accepted without warning; the binding is advisory.

Enforcement is structural, not advisory. A module that records coded data without enforcing the binding is defective. The terminology service is the single enforcement point for all coded data across all bounded contexts, ensuring consistent enforcement and consistent audit. This centralization is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) — bounded contexts depend on the terminology service's contract, not on their own enforcement logic.

### 6.4 Binding and Field-Level Audit

Binding enforcement events are recorded in the audit trail, including the field, the code submitted, the value set consulted, the validation result, and the actor. Binding rejections are auditable; binding warnings are auditable; binding acceptances are auditable for required bindings. This audit discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the terminology domain. It enables the platform to demonstrate to regulators that coded data has been recorded against the bound value sets, and it enables the Architecture Council to monitor binding quality across the platform.

The audit record for binding enforcement is distinct from the audit record for the underlying data action. A data action (recording a diagnosis, posting a billing line) is audited by the bounded context that owns the data; the binding enforcement on that action is audited by the terminology service. Both audit records are preserved in the audit store and are queryable by authorized roles.

### 6.5 Binding Evolution

Bindings evolve as code systems evolve and as the platform's clinical and operational scope expands. A binding change (from extensible to required, from preferred to extensible, from one value set to another) is a configuration action governed by the configuration lifecycle. Binding changes that tighten enforcement (from extensible to required) require a transition window to allow existing data to be reconciled; binding changes that loosen enforcement (from required to extensible) take effect immediately, with the rationale recorded in the ADR.

Binding evolution interacts with code system evolution. A code system release that adds concepts to a value set may obsolete an existing local extension; the local extension is deprecated as documented in Section 3.5, with the binding updated to the new external concept. A code system release that retires concepts may require a binding update to a successor concept; the retired concept remains interpretable through the code system's retired-concept list, ensuring that historical records remain valid.

---

## 7. Multi-Language Terminology Support

### 7.1 Localization Architecture Posture

Ibn Hayan is built for global use, with regional adaptation as a first-class concern, in keeping with Principle P17 (Regional Adaptation Without Forking) defined in SYSTEM_ARCHITECTURE Section 4.17. Multi-language terminology support is part of this regional adaptation. The platform's posture is that a coded concept has the same meaning across all languages; what changes is the display string. A SNOMED CT concept recorded with one identifier in an English-speaking clinic is the same concept in an Arabic-speaking clinic; the display string differs, but the code does not. This separation of code from display is the structural mechanism by which the platform preserves cross-language comparability.

The platform adopts the HL7 FHIR approach to language handling. Each coded data element carries the code, the code system, the code system version, and the display string in the language of the recording context. The display string is drawn from the code system's language-specific release where one exists, or from a curated translation where no official release exists. The display string is not authoritative; the code is authoritative. A consumer that interprets the display string without consulting the code is operating outside the platform's terminology discipline.

### 7.2 Display String Resolution

Display string resolution is performed by the terminology service. The caller specifies the code, the code system, the code system version, and the desired language. The service returns the display string in the requested language where one exists, falling back to the code system's primary language where the requested language is not available. The fallback is recorded so that the consuming module can surface the language discrepancy to the user where appropriate.

The display string resolution is request-scoped, not pre-computed. A user's session carries the user's preferred language; each coded data element is rendered with the display string resolved for that language at render time. This discipline ensures that a user who switches language mid-session sees the display strings in the new language without re-recording the underlying codes. It also ensures that two users viewing the same record in different languages see the same codes with different display strings.

### 7.3 SNOMED CT Language Refsets

SNOMED CT publishes language reference sets (refsets) that provide language-specific display strings for concepts. Ibn Hayan adopts the SNOMED CT language refsets for the languages in which the platform operates. The active refsets are recorded in the terminology service's edition manifest. Where a refset does not exist for a language the platform supports, the gap is filled through curated translations maintained by the Regional Council, with the curation discipline documented in Section 5.

Language refsets are versioned alongside the SNOMED CT edition. A new edition of SNOMED CT may add or retire concepts; the corresponding refset is updated to include display strings for new concepts and to mark retired concepts. The platform's terminology service consumes the refset alongside the edition, ensuring that display strings are aligned with the active edition. This alignment is the structural mechanism by which the platform avoids the discrepancy of a code with no display string in the user's language.

### 7.4 Patient-Facing Language

Patient-facing display strings are distinct from practitioner-facing display strings. A diagnosis that is recorded with a SNOMED CT concept may be displayed to a practitioner with the concept's preferred term and to a patient with a lay-language translation. The patient-facing translation is curated by the Clinical Informatics Council, with input from patient advocacy bodies where appropriate. The patient-facing translation is not a separate code; it is a display string for the same code, recorded in a separate display-string catalogue.

The separation of patient-facing from practitioner-facing display strings preserves the platform's commitment to clinical fidelity while accommodating patient comprehension. A patient who reads "high blood pressure" instead of "essential hypertension" sees the same coded concept that the practitioner recorded, with the display string resolved for the patient's context. This treatment is the architectural expression of PRODUCT_BIBLE Design Principle D-4 (Simplicity Without Sacrificing Power) applied to the terminology domain.

### 7.5 Right-to-Left Language Considerations

Right-to-left languages (Arabic, Hebrew, Persian, Urdu) require display-string handling that respects the language's directionality. The platform records the directionality in the language's locale metadata and surfaces it to the rendering layer. Coded data that combines left-to-right and right-to-left content (for example, an Arabic display string that includes a Latin medication name) is handled through Unicode bidirectional algorithm support, with the algorithm's behaviour consistent across rendering surfaces.

Right-to-left handling is part of the platform's localization architecture documented in SYSTEM_ARCHITECTURE Section 26. It is not a terminology-specific concern, but it interacts with terminology because display strings are subject to the directionality rules. The terminology service returns the display string and the directionality metadata; the rendering layer applies the directionality. This separation preserves the terminology service's focus on code resolution while ensuring that display strings render correctly in all supported languages.

---

## 8. Arabic Terminology Considerations

### 8.1 Arabic as a First-Class Platform Language

Arabic is a first-class language for Ibn Hayan. The platform's design accommodates Arabic display strings, Arabic patient-facing translations, Arabic clinical narrative, and right-to-left rendering from the platform's first release. This commitment reflects the platform's regional posture: Ibn Hayan is designed for global use, with regional adaptation as a configuration surface (PRODUCT_BIBLE Section 25), and the Arabic-speaking regions are a primary operational context for the platform.

The Arabic language considerations documented in this section apply to Modern Standard Arabic (MSA) as the written form. Dialectal Arabic is not used in clinical or administrative records; the platform's posture is that clinical and administrative records are written in MSA, with dialectal Arabic permitted only in informal communications. This posture preserves the cross-region interpretability of records: a record written in MSA in one Arabic-speaking region is interpretable in another Arabic-speaking region, whereas dialectal Arabic may not be.

### 8.2 Arabic Display Strings for Code Systems

Where code systems publish Arabic display strings, the platform adopts them. SNOMED CT publishes an Arabic edition for some concepts; the platform adopts the Arabic edition alongside the International Edition. LOINC publishes Arabic translations for some concepts; the platform adopts them. ICD-10 and ICD-11 publish Arabic translations; the platform adopts them. RxNorm does not publish Arabic display strings; the platform fills the gap through curated translations, with the curation discipline documented in Section 5.

Arabic display strings are subject to the same discipline as display strings in other languages: the code is authoritative, the display string is advisory. A consumer that interprets the Arabic display string without consulting the code is operating outside the platform's terminology discipline. Where a curated Arabic translation differs from a subsequently published official Arabic translation, the official translation supersedes the curated translation, with the curated translation retained for historical record interpretation.

### 8.3 Arabic Clinical Narrative

Arabic clinical narrative is recorded in the Clinical Documentation bounded context (BC03). The narrative is stored as Unicode text with explicit language metadata, ensuring that the rendering layer applies the correct directionality and font. The narrative is not translated automatically; translation is a deliberate clinical action performed by a practitioner and recorded in the audit trail. The platform's posture is that machine translation of clinical narrative is not a substitute for clinical translation, in keeping with Principle P1 (Healthcare Safety Overrides All Others).

Where a clinical narrative is recorded in Arabic and a downstream consumer requires the narrative in another language (for example, a regulatory report submitted in English), the translation is performed by an authorized translator, with the translation recorded as a separate document referencing the original. The original Arabic narrative is preserved indefinitely; the translation is preserved alongside the original for as long as the regulatory framework requires. This discipline preserves the clinical fidelity of the narrative while accommodating cross-language regulatory reporting.

### 8.4 Arabic-Specific Code Systems

Some Arabic-speaking regions publish code systems that are specific to the region's regulatory framework (for example, a national procedure classification, a national insurance scheme code, or a national drug formulary code). These code systems are adopted by Ibn Hayan as regional overlays, with crosswalks to the platform's primary code systems documented in Section 4. The regional code systems are loaded into the terminology service's edition manifest under the regional profile configuration documented in PRODUCT_BIBLE Section 25.3.

The regional overlay discipline preserves the platform's commitment to comparability across regions. A procedure recorded in a regional code system in an Arabic-speaking region is interpretable in another region through the crosswalk to SNOMED CT or CPT. The crosswalk is curated by the Regional Council with Architecture Council ratification, in keeping with the governance discipline documented in Section 5.

### 8.5 Hijri Calendar and Date Handling

The Hijri calendar is used alongside the Gregorian calendar in Arabic-speaking regions. The platform adopts the Gregorian calendar as the canonical calendar for all recorded dates, with the Hijri calendar available as a display alternative. This posture preserves the platform's cross-region interpretability: a date recorded in one region is interpretable in another region without calendar conversion. The Hijri display is computed from the Gregorian date at render time, using a documented Hijri conversion algorithm, with the algorithm's behaviour consistent across rendering surfaces.

The Hijri calendar discipline is part of the platform's localization architecture documented in SYSTEM_ARCHITECTURE Section 26. It is documented here because Arabic-speaking regions are the primary context in which the discipline applies. The platform does not record dates in the Hijri calendar as the primary date; the Gregorian date is primary, and the Hijri date is a display alternative. This posture avoids the ambiguity that arises from recording dates in multiple calendars and the conversion errors that arise from imperfect Hijri conversion algorithms.

---

## 9. Terminology Search & Lookup

### 9.1 Search Use Cases

Terminology search and lookup in Ibn Hayan serve five use cases. First, practitioner search at the point of care: a practitioner entering a diagnosis, ordering a test, or prescribing a medication searches the terminology service to find the appropriate code. Second, validation lookup: the terminology service validates a code submitted by a module against the bound value set. Third, value set expansion: a module that needs the full list of codes in a value set (for example, to populate a dropdown) requests the expanded value set from the terminology service. Fourth, subsumption testing: a module that needs to test whether one code subsumes another (for example, to test whether a recorded diagnosis falls within a cohort definition) requests the subsumption test. Fifth, crosswalk resolution: a module that needs to express a code in another code system requests the crosswalk from the terminology service.

Each use case has its own performance and consistency requirements. Practitioner search is latency-sensitive; validation lookup is correctness-sensitive; value set expansion is size-sensitive; subsumption testing is correctness-sensitive and may be computationally expensive; crosswalk resolution is correctness-sensitive and depends on the crosswalk's confidence level. The terminology service is designed to serve all five use cases with documented performance characteristics for each.

### 9.2 Search Indexing

The terminology service maintains search indices over the code systems it serves. The indices include the code, the code system, the display string (in each supported language), synonyms, and the concept's hierarchical position. Search is performed over the indices, with the search supporting prefix matching, token matching, and phonetic matching for languages where phonetic matching is appropriate. Search results are ranked by relevance, with the relevance algorithm documented so that the platform's search behaviour is predictable.

Search indexing is versioned. When a code system release is loaded, the indices are rebuilt to reflect the new release. The previous indices are retained until the transition window closes, so that searches against historical records return results consistent with the historical context. This discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the terminology domain: a search that returns a result inconsistent with the historical context is a defect, even if the search is fast.

### 9.3 Value Set Expansion

Value set expansion is the process of resolving a value set definition to its constituent codes. The terminology service performs expansion on demand, with the expansion cached for performance. Expansion may be large; value sets in SNOMED CT can contain tens of thousands of codes. The terminology service supports pagination for large expansions, with the pagination contract documented so that consuming modules can consume large expansions incrementally.

Expansion is context-sensitive. A value set that includes codes by reference to a code system version expands differently for different code system versions. The terminology service records the code system version used for each expansion, ensuring that two consumers that expand the same value set at different times can compare their expansions meaningfully. This discipline is critical for analytics and regulatory reporting, where consistency of value set membership is essential.

### 9.4 Subsumption Testing

Subsumption testing is the process of determining whether one code subsumes another in a code system's hierarchy. For SNOMED CT, subsumption is determined by the concept's hierarchical position; for other code systems, subsumption may be determined by explicit hierarchy or may not be supported. The terminology service performs subsumption testing for code systems that support it and returns an explicit "not supported" result for code systems that do not.

Subsumption testing is critical for cohort definition, decision support, and analytics. A cohort definition that includes "all patients with a diagnosis of diabetes" must include patients whose recorded diagnosis is a more specific subtype of diabetes. The subsumption test resolves the inclusion; without subsumption testing, the cohort definition would either miss patients with specific subtypes or include patients with unrelated conditions. The terminology service's subsumption contract is documented so that consuming modules rely on the service's determination rather than their own.

### 9.5 Search Performance and Caching

Search performance is governed by a caching strategy that balances latency against freshness. The terminology service caches search results, value set expansions, and subsumption determinations, with cache invalidation on code system release. The cache is scoped to the tenant, ensuring that one tenant's cache does not affect another tenant's performance. The cache is auditable; cache hits and misses are recorded for service-level monitoring, without recording the search content (which may be sensitive).

The caching strategy is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the terminology domain. A more complex caching strategy that attempted to predict search patterns would add complexity without proportionate benefit; the simple cache-with-invalidation strategy is sufficient. The strategy is reviewed at each code system release to confirm that it continues to meet the platform's performance commitments.

---

## 10. Terminology Versioning

### 10.1 Versioning Discipline

Terminology versioning in Ibn Hayan follows the platform's broader versioning discipline. Every code reference is accompanied by the code system's version, recorded at the time the code was recorded. The version is the code system's published version identifier (for example, the SNOMED CT edition's release identifier, the LOINC release's version number, the ICD-10 release's publication year). The version is immutable once recorded; a code recorded against a version is interpreted in the context of that version indefinitely, regardless of subsequent code system releases.

The versioning discipline is the structural mechanism by which the platform preserves the interpretability of historical records. A diagnosis recorded against ICD-10 in 2026 must remain interpretable as an ICD-10 (2026) diagnosis in 2036, even if the active ICD-10 edition has been updated multiple times in the interim. The discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) and Principle P5 (Consistency Over Availability for Clinical Data) applied to the terminology domain.

### 10.2 Code System Release Consumption

Code system releases are consumed by Ibn Hayan on the issuing authority's release cadence. The Architecture Council reviews each release for material changes (added concepts, retired concepts, renamed display strings, changed hierarchical position) and ratifies the release's adoption through an ADR. The release is loaded into the terminology service's edition manifest, the indices are rebuilt, and the new release becomes the active release for new records. Existing records retain the version they were recorded against.

The consumption discipline includes a transition window during which both the previous release and the new release are active. The transition window accommodates in-flight orders, pending results, and configuration changes that reference the previous release. At the end of the transition window, the previous release is retired as the active release for new records but is retained for historical record interpretation. The transition window's duration is set per code system based on the release's material changes and the platform's operational needs.

### 10.3 Value Set Versioning

Value sets are versioned alongside the code systems from which they draw. A value set that references SNOMED CT concepts is re-evaluated at each SNOMED CT release; concepts that have been retired are marked in the value set, and new concepts that fall within the value set's definition are added. The value set's version identifier records the code system version against which it was last evaluated, so that a consumer can determine whether the value set reflects the current code system release.

Value set versioning is critical for regulatory reporting, where the value set's membership at the time of the report must be recoverable. A report generated against a value set version that has since been updated must remain interpretable as a report against that specific version. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the terminology domain.

### 10.4 Concept Map Versioning

Concept maps are versioned alongside the code systems they crosswalk. A concept map from ICD-10 to ICD-11 is re-evaluated at each ICD-10 or ICD-11 release; mappings for retired concepts are marked, and new mappings for added concepts are curated. The concept map's version identifier records the source and target code system versions against which it was last evaluated.

Concept map versioning is critical for cross-system interoperability, where a mapping that was correct at one version may be incorrect at another. A consumer that resolves a code through a concept map must be able to determine the concept map's version to interpret the resolution correctly. The discipline is the architectural expression of the platform's commitment to disciplined integration (PRODUCT_BIBLE Section 29) applied to the terminology domain.

### 10.5 Deprecation and Retirement

Terminology artefacts (code systems, value sets, concept maps, local extensions) are deprecated when they are no longer the active artefact for new records. Deprecation is recorded in the artefact's metadata, with the successor artefact documented. Deprecated artefacts are retained for historical record interpretation indefinitely; they are not removed from the terminology service. Retirement is the final stage, where the artefact is no longer recommended even for historical interpretation; retirement is rare and is undertaken only when the artefact's issuing authority has ceased to maintain it and no successor exists.

Deprecation and retirement are governed by the Architecture Council. A deprecation or retirement requires an ADR with the rationale, the successor documentation, and the transition window. The transition window for deprecation is at least one full release cycle; the transition window for retirement is multi-year, reflecting the platform's commitment to indefinite interpretability of historical records.

---

## 11. Terminology Maintenance Process

### 11.1 Maintenance Cadence

Terminology maintenance in Ibn Hayan follows a documented cadence. Code system releases are consumed on the issuing authority's release cadence. Value sets and concept maps are re-evaluated at each code system release and on a quarterly review cadence. Local extensions are reviewed on a quarterly cadence and at each related code system release. Mapping issues are reviewed on a monthly cadence. The Architecture Council reviews the terminology posture on a quarterly cadence, with off-cycle review when a material code system release or a regional regulatory change requires.

The maintenance cadence is documented in the Architecture Council's operating calendar and is reflected in the terminology service's release schedule. The cadence is not advisory; a missed review is escalated to the Architecture Council for resolution. The cadence is the structural mechanism by which the platform's terminology posture remains current with upstream code systems and with the platform's evolving clinical and operational scope.

### 11.2 Release Intake Process

A code system release is intaken through a documented process. The release is announced by the issuing authority; the terminology service team downloads the release and performs an initial assessment of material changes. The assessment is documented in a release intake record, with the material changes catalogued, the affected value sets and concept maps identified, and the recommended adoption posture (adopt immediately, adopt with transition window, defer adoption pending curation). The release intake record is reviewed by the Architecture Council, which ratifies the adoption posture through an ADR.

The intake process is the structural mechanism by which the platform consumes code system releases in a controlled manner. A release that is adopted without intake assessment is defective; the platform may be exposed to material changes that have not been evaluated for clinical, operational, or regulatory impact. The intake process is the architectural expression of Principle P7 (Documented Before Implemented) applied to the terminology domain.

### 11.3 Curation Process

Curation is the process of reviewing and updating terminology artefacts. Curation is performed by designated curators (Architecture Council members, Clinical Informatics Council members, Regional Council members) with the authority to update specific artefacts. Curation covers value set composition, concept map mappings, local extension mappings, and display string translations. Each curation action is recorded in the artefact's curation log, with the curator, the date, the change, and the rationale.

Curation is the structural mechanism by which the platform's terminology artefacts remain accurate and current. A value set that is not curated may drift from the code system's current release; a concept map that is not curated may contain mappings that have been superseded by the issuing authority's published mapping. Curation is the architectural expression of the platform's commitment to disciplined maintenance (PRODUCT_BIBLE Section 22.7 Configuration Sandboxing applied to terminology).

### 11.4 Issue Management

Terminology issues (mapping gaps, binding gaps, missing display strings, ambiguous concepts) are tracked in the terminology service's issue register. Issues are reported by practitioners through the platform's feedback mechanism, by curators through the curation process, and by automated validation through the binding enforcement process. Each issue is recorded with the issue type, the affected artefact, the severity, the reporter, and the date. Issues are reviewed on the maintenance cadence and are assigned to curators for resolution.

Issue management is the structural mechanism by which the platform's terminology quality is monitored and improved. An issue that is not tracked is not resolved; an issue that is tracked but not assigned is not resolved. The issue register is reviewed by the Architecture Council on a quarterly cadence, with metrics on issue volume, resolution time, and open issue age. The metrics are the basis for the terminology quality KPIs reported to the Architecture Council.

### 11.5 Communication and Change Notices

Terminology changes that affect downstream consumers are communicated through change notices. A change notice is issued when a code system release is adopted, when a value set is updated, when a concept map is updated, when a local extension is registered or deprecated, and when a binding is tightened or loosened. The change notice is distributed to the affected module owners, integration owners, and tenant administrators, with the notice's content tailored to the audience.

Change notices are the structural mechanism by which the platform's terminology changes are surfaced to the people who depend on them. A change that is not communicated may produce unexpected behaviour in downstream consumers; a change that is communicated but not acted upon is the consumer's responsibility. The communication discipline is the architectural expression of the platform's commitment to disciplined change management (PRODUCT_BIBLE Section 22 Configuration-Driven Philosophy applied to terminology).

---

## 12. Related Documents

### 12.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails. The conflict resolution posture is recorded in this document's metadata table.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-1 (Healthcare First) governs terminology binding posture; D-6 (Regional Adaptability) governs multi-language terminology |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Terminology artefacts are configuration artefacts governed by the configuration lifecycle |
| PRODUCT_BIBLE.md | Section 25 (Localization Strategy) | Multi-language terminology support and regional code system adoption |
| PRODUCT_BIBLE.md | Section 29 (Integration Philosophy) | External terminology services and code system licensing |
| PRODUCT_BIBLE.md | Section 31 (Security Philosophy) | Terminology service access control and audit |
| PRODUCT_BIBLE.md | Section 33 (Product Glossary) | Source glossary extended by this document's Section 1.4 |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P4 (Loose Coupling), P5 (Consistency for Clinical Data), P12 (Open Standards), P13 (Auditability), P17 (Regional Adaptation), P18 (Decade-Horizon Viability) govern terminology posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Bounded contexts to which terminology is bound |
| SYSTEM_ARCHITECTURE.md | Section 15 (Configuration Strategy) | Configuration layers and validation applied to terminology artefacts |
| SYSTEM_ARCHITECTURE.md | Section 19 (Integration Architecture) | External terminology service integration through anticorruption layer |
| SYSTEM_ARCHITECTURE.md | Section 26 (Localization Architecture) | Multi-language and right-to-left handling |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Terminology binding enforcement and curation audit |
| CONFIGURATION_ARCHITECTURE.md | Section 8 (Configuration Lifecycle) | Terminology artefact lifecycle |
| CONFIGURATION_ARCHITECTURE.md | Section 12 (Configuration Audit Trail) | Terminology change audit |

### 12.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references terminology, the reference is to this document. Where this document references enumerations, status codes, business rules, calculations, workflows, configuration, or feature flags, the reference is to the sibling document.

| Document | Relationship to Terminology |
|---|---|
| ENUMS.md | Platform enumerations are local extensions governed by this document's Section 3 |
| STATUS_CODES.md | Status codes are local extensions governed by this document's Section 3 |
| BUSINESS_RULES.md | Business rules may reference coded concepts; binding enforcement applies |
| CALCULATIONS.md | Calculations may consume coded inputs; concept resolution applies |
| CLINICAL_WORKFLOWS.md | Clinical workflows consume coded concepts; binding enforcement applies |
| CONFIGURATION.md | Configuration of terminology artefacts follows the configuration lifecycle |
| FEATURE_FLAGS.md | Feature flags control terminology service behaviour; flag lifecycle applies |

### 12.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective and is corrected or escalated through the ADR process.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level terminology bindings and value set usage |
| docs/04_INTEGRATIONS/*.md | External terminology service integration contracts |
| docs/06_DATABASE/*.md | Terminology binding storage and indexing |
| docs/09_DEPLOYMENT/*.md | Terminology service deployment topology |
| docs/03_SECURITY/*.md | Terminology service access control and audit |

### 12.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when a code system release, a regional terminology amendment, or an Architecture Decision Record requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification.
