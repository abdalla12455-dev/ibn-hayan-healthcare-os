# Ibn Hayan Healthcare Operating System — Enumerations

| Field | Value |
|---|---|
| Document Title | Enumerations |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when an enumeration amendment or ADR is ratified |
| Audience | Software architects, module owners, integration architects, terminology service team, configuration service team, compliance officers |
| Scope | Enumeration catalogue across all bounded contexts of Ibn Hayan; naming conventions, lifecycle, localization, extension policy, deprecation policy, registry |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-enum serialization syntax, vendor-specific enum libraries |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Enumeration definitions in this document elaborate the bounded-context contracts of SYSTEM_ARCHITECTURE Section 7 and the configuration-driven commitments of PRODUCT_BIBLE Section 22. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Enumerations Overview
2. Enum Definition Standard
3. Patient Enums
4. Clinical Enums
5. Financial Enums
6. Inventory Enums
7. Workflow & Status Enums
8. System Enums
9. Enum Localization
10. Enum Extension Policy
11. Enum Deprecation Policy
12. Enum Registry
13. Related Documents

---

## 1. Enumerations Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for all enumerated types used across the Ibn Hayan Healthcare Operating System. An enumerated type (enum) is a closed set of named values that a field of a given kind may take. The platform uses enums to express lifecycle stages, category labels, type discriminators, and other fields whose valid values are finite, stable, and known at design time. The enum catalogue is a structural element of the platform's contract surface: bounded-context commands, queries, events, and configuration schemas (SYSTEM_ARCHITECTURE Section 7.4) all reference enums by their canonical identifier.

The discipline around enums reflects the platform's broader posture on configuration and customization (PRODUCT_BIBLE Section 22). An enum is not a customization surface; tenants do not extend enums at runtime. Where a tenant needs a value not present in an enum, the need is met through a local extension as documented in TERMINOLOGY.md Section 3, with the extension registered through the Architecture Council process. This discipline preserves cross-tenant comparability: an enum value recorded in one tenant is interpretable in another tenant without translation, because the enum value is defined by the platform, not by the tenant.

This document sits below `SYSTEM_ARCHITECTURE.md` and aligns with `PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy) and Section 33 (Product Glossary). Sibling documents include `STATUS_CODES.md` (which enumerates lifecycle-state codes for entities), `TERMINOLOGY.md` (which governs the code systems from which enums draw), and `CONFIGURATION.md` (which governs the configuration surface that references enums). Where this document and a sibling document appear to overlap, this document holds authority over enum definitions; STATUS_CODES.md holds authority over transition semantics for lifecycle-state enums.

### 1.2 Enumeration vs Terminology

Enums and terminology are distinct concepts in Ibn Hayan, although they overlap in practice. An enum is a closed set defined by the platform for a specific structural purpose; terminology is an open set defined by an external code system for clinical or administrative classification. A patient's sex is recorded through an enum (Male, Female, Intersex, Unknown, Not Declared) because the values are finite, stable, and used for structural purposes such as form rendering and reference-range selection. A patient's diagnosis is recorded through terminology (SNOMED CT, ICD-10/11) because the values are open-ended, evolve with medical knowledge, and are used for clinical classification.

The distinction is enforced at contract definition. A field that holds an enum value references the enum's canonical identifier; a field that holds a coded value references the code system and value set. The two are not interchangeable. A module that records an enum value in a terminology-bound field is defective; a module that records a terminology code in an enum-bound field is defective. The discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) applied to the enum domain.

### 1.3 Enumeration Coverage

The enum catalogue covers all bounded contexts of Ibn Hayan. Patient enums govern patient identity, demographics, and consent. Clinical enums govern encounters, documentation, orders, results, and pharmacy. Financial enums govern billing, accounting, and claims. Inventory enums govern stock, suppliers, and movements. Workflow and status enums govern the platform's state machines. System enums govern platform concerns such as configuration layers, feature flag types, audit surfaces, and validation rule categories. The catalogue is comprehensive; a field that takes a finite set of values is recorded as an enum, not as an ad hoc string.

The coverage is documented per bounded context in Sections 3 through 8 of this document. Each section catalogues the enums owned by the corresponding bounded context (or group of contexts), with the enum's canonical identifier, its values, its default value, its extensibility posture, and notes on its usage. The catalogue is the binding reference for module specifications and integration contracts; an enum referenced by a module specification must be present in this catalogue.

### 1.4 Enumeration Posture

Ibn Hayan adopts a posture of disciplined enumeration. Four commitments govern this posture. First, enums are platform-owned: a value is in an enum because the platform has ratified it through the Architecture Council process; tenants do not add values. Second, enums are versioned: a value added to an enum carries the version of the enum in which it was added, and a value deprecated from an enum carries the version in which it was deprecated. Third, enums are localized: every enum value has a display string in each supported language, with the display string resolved at render time. Fourth, enums are auditable: every value recorded in a field that holds an enum is accompanied by the enum's version, so that a historical record is interpretable in the context of the enum version that was active when the record was made.

The four commitments are the architectural floor for enums in Ibn Hayan. A module that records an enum value without its version is defective; a module that uses an unregistered value is defective; a module that hard-codes display strings instead of resolving them through the localization pack is defective. The configuration service enforces these commitments at validation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.5 Ibn Hayan Identity and Enumerations

Enums are part of the structural vocabulary by which Ibn Hayan maintains its one-platform identity (PRODUCT_BIBLE Section 1.5). An enum value recorded in a small clinic is the same value recorded in a multi-national hospital network; the platform's code paths treat them identically. This consistency is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to the enum domain. Where regional variation requires a different set of values (for example, regional administrative codes), the variation is expressed through terminology overlays, not through enum forks. The platform does not maintain region-specific enum variants.

---

## 2. Enum Definition Standard

### 2.1 Enum Naming Conventions

Enum names in Ibn Hayan follow a documented naming convention. The name is in UpperCamelCase, begins with the owning bounded context's domain (for example, `PatientSex`, `EncounterType`, `BillingInvoiceStatus`), and is unique within the platform's enum catalogue. The name is stable; renaming an enum follows the deprecation policy documented in Section 11. The name is the enum's canonical identifier; modules and integrations reference the enum by its name, not by an internal numeric identifier.

Enum values follow a separate naming convention. Each value has a canonical code (UpperCamelCase, no spaces, no punctuation other than hyphens for compound words), a display name (human-readable, in the platform's primary language), and a description (one-sentence definition of the value's meaning). The canonical code is the value's identifier in contracts and audit records; the display name is the value's identifier in user-facing rendering; the description is the value's documentation. The three are distinct; a change to the display name does not change the canonical code, and a change to the description does not change either.

The naming convention is enforced by the Architecture Council at enum registration. An enum that does not follow the convention is rejected; the rejection is recorded with the rationale. The convention is the structural mechanism by which the platform's enum catalogue remains coherent and navigable across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 2.2 Enum Metadata

Each enum is registered with a defined set of metadata. The metadata records the enum's canonical name, owning bounded context, version, status (Active, Deprecated, Retired), default value, extensibility posture, value list (with each value's canonical code, display name, and description), and the ADR that ratified the enum. The metadata is the enum's authoritative definition; downstream consumers reference the metadata, not ad hoc definitions in module specifications.

The metadata is versioned. A change to the metadata (adding a value, deprecating a value, changing the default) is a new version of the enum. The previous version is retained for historical record interpretation. The metadata's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5, ensuring that the platform's enum adoption history is recoverable indefinitely.

### 2.3 Enum Value Lifecycle

Each enum value has a lifecycle independent of the enum's overall lifecycle. A value is added through an ADR; the value is then Active for new records. A value is deprecated through an ADR; the value is then Deprecated (still valid for new records, with a warning; not recommended for new records). A value is retired through an ADR; the value is then Retired (not valid for new records; retained for historical record interpretation). The lifecycle is recorded in the enum's metadata, with each value's status visible to downstream consumers.

The value lifecycle discipline preserves the platform's ability to evolve enums without disrupting historical records. A value that is no longer appropriate for new records (for example, a category that has been reorganized) is deprecated and then retired; historical records that contain the value remain interpretable because the value is retained in the enum's value list with Retired status. This treatment is the architectural expression of Principle P18 (Decade-Horizon Viability) applied to the enum domain.

### 2.4 Extensibility Posture

Each enum declares its extensibility posture: Closed (no values may be added without an ADR and a new enum version), or Open-with-Council (values may be added through the Architecture Council process without a new enum version, with the addition recorded as a minor version increment). The posture is chosen per enum based on the enum's stability requirements. Enums that encode structural distinctions (for example, configuration layers, feature flag types) are Closed; enums that encode category labels that may expand with the platform's scope (for example, encounter types, document types) are Open-with-Council.

The extensibility posture is the structural mechanism by which the platform balances stability with evolution. A Closed enum ensures that downstream consumers can rely on the value list; an Open-with-Council enum permits the platform to expand its coverage without the overhead of a new enum version for each addition. The posture is reviewed at each Architecture Council quarterly review, with the option to change the posture through an ADR.

### 2.5 Default Values

Each enum declares a default value. The default value is used when a field that holds the enum is initialized without an explicit value (for example, when a record is created through an automated process). The default value is chosen for safety and operational neutrality: it must not imply a clinical or financial commitment that the platform has not confirmed. For lifecycle-state enums, the default value is the initial state (for example, `Draft` for an invoice, `Scheduled` for an appointment). For category enums, the default value is `Unknown` or `Not Specified` where such a value exists, or the most neutral value otherwise.

The default value discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the enum domain. A default value that implies a clinical commitment (for example, defaulting a diagnosis to "essential hypertension") would compromise patient safety; the platform defaults to neutral values and requires the practitioner to make the clinical commitment explicitly. The discipline applies to all enums, not only clinical enums, because administrative and financial defaults can also produce consequential behaviour if chosen carelessly.

---

## 3. Patient Enums

### 3.1 Patient Identity Enums

Patient identity enums govern the structural fields of a patient's identity record. The patient's identity is owned by the Patient bounded context (BC01) and is the platform's shared kernel (SYSTEM_ARCHITECTURE Section 7.3) — multiple bounded contexts reference the patient identity through the patient's canonical identifier, not through their own copy. The identity enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| PatientSex | Male, Female, Intersex, Unknown, NotDeclared | BC01 | NotDeclared | Closed | Recorded at registration; used for reference-range selection |
| PatientGenderIdentity | Male, Female, TransgenderMale, TransgenderFemale, NonBinary, PreferNotToSay, Other | BC01 | PreferNotToSay | Open-with-Council | Distinct from PatientSex; recorded at the patient's request |
| PatientNameType | Legal, Preferred, Maiden, Alias, Stage | BC01 | Legal | Closed | Multiple names permitted per patient |
| PatientIdentifierType | NationalID, Passport, MedicalRecordNumber, InsuranceNumber, DriverLicence | BC01 | MedicalRecordNumber | Open-with-Council | Identifier type governs validation rules |
| PatientPhotoStatus | None, Pending, Approved, Rejected | BC01 | None | Closed | Governed by patient consent |

### 3.2 Patient Demographic Enums

Patient demographic enums govern the descriptive fields of a patient's record. These enums are bound to terminology where standard code systems exist (for example, nationality is bound to ISO 3166 country codes) and to local extensions where no standard exists. The demographic enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| PatientMaritalStatus | Single, Married, Divorced, Widowed, Separated, NotDeclared | BC01 | NotDeclared | Closed | Aligned with SNOMED CT marital-status value set |
| PatientEmploymentStatus | Employed, SelfEmployed, Unemployed, Student, Retired, NotDeclared | BC01 | NotDeclared | Closed | Used for social-history documentation |
| PatientEducationLevel | None, Primary, Secondary, Vocational, Tertiary, Postgraduate, NotDeclared | BC01 | NotDeclared | Closed | Used for social-history documentation |
| PatientLanguageProficiency | Native, Fluent, Intermediate, Basic, None | BC01 | None | Closed | Recorded per language; used for interpreter routing |
| PatientResidencyStatus | Citizen, Resident, Visitor, Refugee, NotDeclared | BC01 | NotDeclared | Open-with-Council | Sensitive field; access-controlled |

### 3.3 Patient Consent Enums

Patient consent enums govern the consent records that the patient has granted or withheld. Consent is a structural element of the patient's record (PRODUCT_BIBLE Section 21.7); the platform's posture is that consent is explicit, versioned, and auditable. The consent enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| ConsentType | Treatment, InformationDisclosure, Research, Marketing, DataSharing | BC01 | Treatment | Open-with-Council | Type governs the consent form presented |
| ConsentStatus | Granted, Withdrawn, Pending, Expired | BC01 | Pending | Closed | Status governs platform behaviour |
| ConsentScope | General, Specific, Emergency | BC01 | General | Closed | Scope governs the consent's applicability |
| ConsentDuration | Indefinite, FixedTerm, SingleEncounter | BC01 | Indefinite | Closed | Duration governs the consent's expiry |

### 3.4 Patient Status Enums

Patient status enums govern the patient's overall status in the platform. These enums are referenced by STATUS_CODES.md for transition semantics. The patient status enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| PatientStatus | Active, Inactive, Deceased, TransferredOut, Archived | BC01 | Active | Closed | Status governs whether the patient is available for new encounters |
| PatientConfidentiality | Normal, Restricted, VIP | BC01 | Normal | Closed | Restricted triggers break-glass access rules |
| PatientCareLevel | Outpatient, Inpatient, Emergency, CriticalCare | BC01 | Outpatient | Closed | Care level governs workflow routing |

### 3.5 Patient Audit Enums

Patient audit enums govern the audit-event types recorded against patient records. These enums are bound to the audit surface documented in SYSTEM_ARCHITECTURE Section 27.3. The patient audit enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| PatientAuditAction | Created, Viewed, Updated, Merged, Archived, Restored | BC01 | — | Open-with-Council | Recorded in the audit trail for every patient record action |
| PatientAccessContext | Routine, BreakGlass, Emergency, Audit, Support | BC01 | Routine | Closed | Records the basis on which access was granted |

---

## 4. Clinical Enums

### 4.1 Encounter Enums

Encounter enums govern the structural fields of a clinical encounter. The encounter is owned by the Encounter bounded context (BC02) and is the platform's central organizing entity for clinical work (PRODUCT_BIBLE Section 19, M02). The encounter enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| EncounterType | Outpatient, Inpatient, Emergency, Telehealth, HomeHealth, DayCare | BC02 | Outpatient | Open-with-Council | Bound to SNOMED CT 308335008 hierarchy |
| EncounterStatus | Planned, Arrived, InProgress, OnLeave, Finished, Cancelled | BC02 | Planned | Closed | Referenced by STATUS_CODES.md |
| EncounterPriority | Routine, Urgent, Emergency | BC02 | Routine | Closed | Priority governs queue routing |
| EncounterAdmissionSource | Self, Referral, Transfer, Emergency, Scheduled | BC02 | Self | Open-with-Council | Recorded at admission |
| EncounterDischargeDisposition | Home, Transfer, LeftAMA, Expired, Hospice | BC02 | Home | Open-with-Council | Bound to SNOMED CT discharge disposition |

### 4.2 Clinical Documentation Enums

Clinical documentation enums govern the structural fields of clinical notes, assessments, and care plans. These enums are owned by the Clinical Documentation bounded context (BC03) and are bound to LOINC document ontology where applicable. The documentation enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| ClinicalNoteType | Progress, History, Physical, Consultation, Discharge, Procedure, Nursing | BC03 | Progress | Open-with-Council | Bound to LOINC document ontology |
| ClinicalNoteStatus | Draft, InProgress, Signed, Amended, Addendum, Withdrawn | BC03 | Draft | Closed | Status governs the note's authority |
| ClinicalNoteAuthorRole | Physician, Nurse, Pharmacist, Therapist, Midlevel, Student | BC03 | Physician | Open-with-Council | Author role governs signing authority |
| AssessmentType | Initial, Followup, Discharge, PreOperative, PostOperative | BC03 | Initial | Closed | Type governs the template used |
| CarePlanStatus | Draft, Active, OnHold, Completed, Cancelled | BC03 | Draft | Closed | Status governs care-plan workflow |

### 4.3 Orders and Results Enums

Orders and results enums govern the structural fields of clinical orders and their results. These enums are owned by the Orders & Results bounded context (BC04) and interact with the workflow engine (SYSTEM_ARCHITECTURE Section 16). The order enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| OrderType | Lab, Imaging, Procedure, Referral, Consultation, Therapy | BC04 | Lab | Closed | Type governs the fulfilment workflow |
| OrderStatus | Draft, Pending, Active, Completed, Cancelled, Held | BC04 | Draft | Closed | Referenced by STATUS_CODES.md |
| OrderPriority | Routine, Urgent, STAT, ASAP | BC04 | Routine | Closed | Priority governs fulfilment SLA |
| ResultStatus | Preliminary, Final, Corrected, Amended, Cancelled | BC04 | Preliminary | Closed | Status governs result authority |
| ResultInterpretation | Normal, Abnormal, High, Low, Critical, Borderline | BC04 | Normal | Closed | Bound to HL7 observation interpretation |

### 4.4 Pharmacy Enums

Pharmacy enums govern the structural fields of medication orders, dispensing, and administration. These enums are owned by the Pharmacy bounded context (BC05) and are bound to RxNorm where applicable. The pharmacy enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| MedicationOrderStatus | Draft, Active, OnHold, Dispensed, Administered, Cancelled, Completed | BC05 | Draft | Closed | Referenced by STATUS_CODES.md |
| MedicationOrderType | Prescription, InpatientOrder, Discharge, Refill | BC05 | Prescription | Closed | Type governs fulfilment workflow |
| DispenseStatus | Pending, PartiallyDispensed, Dispensed, NotDispensed | BC05 | Pending | Closed | Status governs dispensing queue |
| AdministrationStatus | Due, Given, Held, Refused, Missed | BC05 | Due | Closed | Status governs MAR workflow |
| MedicationRoute | Oral, Intravenous, Intramuscular, Subcutaneous, Topical, Inhaled, Rectal, Other | BC05 | Oral | Open-with-Council | Bound to SNOMED CT route hierarchy |

### 4.5 Allergy and Adverse Reaction Enums

Allergy and adverse reaction enums govern the structural fields of allergy and adverse-reaction records. These enums are owned by the Patient bounded context (BC01) for the allergy list and by the Clinical Documentation bounded context (BC03) for adverse-reaction documentation. The allergy enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| AllergyCriticality | Low, High, UnableToAssess | BC01 | Low | Closed | Criticality governs alert prominence |
| AllergyStatus | Active, Inactive, Resolved, NoKnownAllergies | BC01 | Active | Closed | Status governs alert behaviour |
| ReactionSeverity | Mild, Moderate, Severe, Fatal | BC03 | Mild | Closed | Severity governs clinical response |
| AdverseEventCategory | Medication, Procedure, Device, Vaccine, Other | BC03 | Medication | Open-with-Council | Category governs reporting workflow |

---

## 5. Financial Enums

### 5.1 Billing Enums

Billing enums govern the structural fields of invoices, claims, and payments. These enums are owned by the Billing bounded context (BC07) and interact with the workflow engine for the billing workflow (SYSTEM_ARCHITECTURE Section 16). The billing enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| InvoiceStatus | Draft, Issued, PartiallyPaid, Paid, WrittenOff, Disputed, Cancelled | BC07 | Draft | Closed | Referenced by STATUS_CODES.md |
| InvoiceType | Patient, Insurance, SelfPay, ProBono | BC07 | Patient | Closed | Type governs the billing workflow |
| InvoiceLineType | Service, Product, Medication, Fee, Tax, Discount, Adjustment | BC07 | Service | Closed | Type governs line-level calculation |
| PaymentMethod | Cash, Card, BankTransfer, Cheque, MobileWallet, Insurance, Other | BC07 | Cash | Open-with-Council | Method governs reconciliation |
| PaymentStatus | Pending, Posted, Reversed, Refunded | BC07 | Pending | Closed | Status governs payment workflow |

### 5.2 Insurance and Claim Enums

Insurance and claim enums govern the structural fields of insurance policies and claims. These enums are owned by the Billing bounded context (BC07) and interact with external payer systems through the integration architecture (SYSTEM_ARCHITECTURE Section 19). The claim enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| ClaimStatus | Draft, Submitted, Accepted, Rejected, PartiallyPaid, Paid, Denied, Appealed | BC07 | Draft | Closed | Referenced by STATUS_CODES.md |
| ClaimType | Institutional, Professional, Dental, Pharmacy, Vision | BC07 | Professional | Closed | Type governs the claim format |
| ClaimAdjudicationOutcome | Accepted, PartiallyAccepted, Rejected, PendingReview | BC07 | PendingReview | Closed | Outcome governs post-submission workflow |
| CoverageType | Primary, Secondary, Tertiary, SelfPay | BC07 | Primary | Closed | Type governs coordination of benefits |
| PreAuthorizationStatus | Requested, Approved, Denied, Expired, Cancelled | BC07 | Requested | Closed | Status governs service delivery |

### 5.3 Accounting Enums

Accounting enums govern the structural fields of the general ledger, accounts payable, and accounts receivable. These enums are owned by the Accounting bounded context (BC08) and follow double-entry accounting conventions. The accounting enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| AccountType | Asset, Liability, Equity, Revenue, Expense | BC08 | Expense | Closed | Type governs normal balance |
| JournalEntryStatus | Draft, Posted, Reversed, Void | BC08 | Draft | Closed | Status governs ledger posting |
| JournalEntryType | Standard, Adjustment, Closing, Reversing, Correction | BC08 | Standard | Closed | Type governs the entry's purpose |
| AllocationType | Direct, Allocated, Distributed | BC08 | Direct | Closed | Type governs cost distribution |
| FiscalPeriodStatus | Open, Closed, Locked | BC08 | Open | Closed | Status governs posting permissions |

### 5.4 Tax and Currency Enums

Tax and currency enums govern the structural fields of tax calculation and multi-currency support. These enums are owned by the Billing bounded context (BC07) and the Accounting bounded context (BC08) jointly, with regional variation expressed through the regional profile. The tax enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| TaxType | VAT, GST, SalesTax, Withholding, Excise, None | BC07 | VAT | Open-with-Council | Type governs calculation rule |
| TaxExemptionReason | Medical, Educational, Export, Diplomatic, Charitable, Other | BC07 | None | Open-with-Council | Reason governs exemption application |
| CurrencyCode | ISO 4217 three-letter codes | BC07, BC08 | USD | Closed | Currency is bound to ISO 4217 |
| ExchangeRateType | Spot, MidMarket, DailyAverage, MonthlyAverage | BC08 | Spot | Closed | Type governs rate selection |
| RoundingPolicy | HalfUp, HalfEven, HalfDown, Up, Down | BC07, BC08 | HalfEven | Closed | Policy governs monetary rounding |

---

## 6. Inventory Enums

### 6.1 Stock Item Enums

Stock item enums govern the structural fields of inventory items in the Inventory bounded context (BC09) and the Pharmacy bounded context (BC05) for pharmacy-specific items. The stock item enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| InventoryCategory | MedicalSupply, Medication, Equipment, Consumable, Implant, Other | BC09 | Consumable | Open-with-Council | Category governs stock-management rules |
| InventoryStatus | Active, Inactive, Quarantined, Recalled, Expired | BC09 | Active | Closed | Status governs availability |
| StockCondition | Good, Damaged, Compromised, Returned | BC09 | Good | Closed | Condition governs disposition |
| StorageType | Ambient, Refrigerated, Frozen, Controlled, Hazardous | BC09 | Ambient | Closed | Type governs storage location |
| ValuationMethod | FIFO, LIFO, WeightedAverage, SpecificIdentification | BC09 | FIFO | Closed | Method governs cost calculation |

### 6.2 Movement Enums

Movement enums govern the structural fields of stock movements (receipt, transfer, issue, adjustment). These enums are owned by the Inventory bounded context (BC09). The movement enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| MovementType | Receipt, Transfer, Issue, Return, Adjustment, Disposal | BC09 | Receipt | Closed | Type governs stock ledger update |
| MovementStatus | Pending, Completed, Cancelled, Reversed | BC09 | Pending | Closed | Status governs movement workflow |
| AdjustmentReason | Damaged, Expired, Lost, Found, Recount, Theft, Other | BC09 | Other | Open-with-Council | Reason governs adjustment audit |
| TransferType | Internal, InterFacility, InterTenant | BC09 | Internal | Closed | Type governs transfer workflow |

### 6.3 Supplier Enums

Supplier enums govern the structural fields of supplier records. These enums are owned by the Inventory bounded context (BC09). The supplier enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| SupplierStatus | Active, Inactive, Suspended, Blocked | BC09 | Active | Closed | Status governs purchase-order routing |
| SupplierType | Manufacturer, Distributor, Wholesaler, Service | BC09 | Distributor | Closed | Type governs relationship management |
| PurchaseOrderStatus | Draft, Sent, PartiallyReceived, Received, Cancelled | BC09 | Draft | Closed | Referenced by STATUS_CODES.md |
| PurchaseOrderType | Standard, Blanket, DropShip, Emergency | BC09 | Standard | Closed | Type governs PO workflow |

### 6.4 Pharmacy-Specific Inventory Enums

Pharmacy-specific inventory enums govern the structural fields that are unique to pharmacy inventory (controlled substances, cold chain, lot tracking). These enums are owned by the Pharmacy bounded context (BC05) and extend the Inventory bounded context's enums per the documented deviation in SYSTEM_ARCHITECTURE Section 7.7. The pharmacy inventory enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| ControlledSubstanceSchedule | S1, S2, S3, S4, S5, NonControlled | BC05 | NonControlled | Open-with-Council | Schedule governs dispensing controls |
| ColdChainStatus | Compliant, Excursion, Breach | BC05 | Compliant | Closed | Status governs disposition decision |
| LotDisposition | Saleable, Quarantine, Return, Destroy | BC05 | Saleable | Closed | Disposition governs availability |
| RecallStatus | NotAffected, Affected, UnderReview, Cleared | BC05 | NotAffected | Closed | Status governs recall workflow |

---

## 7. Workflow & Status Enums

### 7.1 Workflow Pattern Enums

Workflow pattern enums govern the workflow patterns supported by the workflow engine. These enums are owned by the Configuration bounded context (BC16) and are referenced by the workflow engine documented in SYSTEM_ARCHITECTURE Section 16.4. The workflow pattern enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| WorkflowPattern | Sequential, Parallel, Conditional, Looping, Saga | BC16 | Sequential | Closed | Pattern governs execution semantics |
| WorkflowStatus | Defined, Active, Paused, Completed, Failed, Cancelled | BC16 | Defined | Closed | Status governs workflow lifecycle |
| WorkflowStepStatus | NotStarted, InProgress, Completed, Skipped, Failed, Compensated | BC16 | NotStarted | Closed | Status governs step execution |
| WorkflowStepType | Task, Decision, Wait, Notification, Integration, Compensation | BC16 | Task | Closed | Type governs step behaviour |

### 7.2 Notification Enums

Notification enums govern the structural fields of notifications. These enums are owned by the Notifications bounded context (BC14) and interact with the channel-agnostic delivery approach documented in PRODUCT_BIBLE Section 19, M08. The notification enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| NotificationType | AppointmentReminder, ResultAvailable, MedicationDue, ClaimStatus, SystemAlert | BC14 | SystemAlert | Open-with-Council | Type governs template selection |
| NotificationChannel | InApp, Email, SMS, Push, Voice, WhatsApp | BC14 | InApp | Open-with-Council | Channel governs delivery service |
| NotificationStatus | Draft, Queued, Sent, Delivered, Read, Failed, Suppressed | BC14 | Draft | Closed | Status governs notification lifecycle |
| NotificationPriority | Low, Normal, High, Critical | BC14 | Normal | Closed | Priority governs delivery SLA |

### 7.3 Scheduling Enums

Scheduling enums govern the structural fields of appointments and resource scheduling. These enums are owned by the Scheduling bounded context (BC06). The scheduling enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| AppointmentStatus | Scheduled, Confirmed, CheckedIn, InProgress, Completed, NoShow, Cancelled, Rescheduled | BC06 | Scheduled | Closed | Referenced by STATUS_CODES.md |
| AppointmentType | New, Followup, Telehealth, Procedure, Emergency, WalkIn | BC06 | New | Open-with-Council | Type governs slot allocation |
| ResourceType | Practitioner, Room, Equipment, Bed, Theatre | BC06 | Practitioner | Open-with-Council | Type governs scheduling rules |
| SlotStatus | Open, Held, Booked, Blocked | BC06 | Open | Closed | Status governs slot availability |

### 7.4 Document and Report Enums

Document and report enums govern the structural fields of documents and reports. These enums are owned by the Documents bounded context (BC13) and the Reporting bounded context (the deployable expression of the Reporting Layer per SYSTEM_ARCHITECTURE Section 28). The document enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| DocumentStatus | Draft, PendingReview, Approved, Published, Archived, Withdrawn | BC13 | Draft | Closed | Status governs document workflow |
| DocumentFormat | Text, Structured, Image, PDF, Scanned | BC13 | Structured | Closed | Format governs rendering |
| ReportCategory | Operational, Analytical, Regulatory | Reports | Operational | Closed | Aligned with SYSTEM_ARCHITECTURE Section 28 |
| ReportStatus | Scheduled, Running, Completed, Failed, Cancelled | Reports | Scheduled | Closed | Status governs report lifecycle |

---

## 8. System Enums

### 8.1 Configuration Enums

Configuration enums govern the structural fields of the configuration system. These enums are owned by the Configuration bounded context (BC16) and are bound to the local extension namespace `IH-CONF` documented in TERMINOLOGY.md Section 3.3. The configuration enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| ConfigurationLayer | L1, L2, L3, L4, L5, L6, L7, L8 | BC16 | L1 | Closed | Layer governs precedence (SYSTEM_ARCHITECTURE Section 15.2) |
| ValidationRuleCategory | V1, V2, V3, V4, V5 | BC16 | V1 | Closed | Category governs validation behaviour (SYSTEM_ARCHITECTURE Section 15.4) |
| ConfigurationChangeStatus | Draft, Validating, Validated, Applied, Rejected, RolledBack | BC16 | Draft | Closed | Status governs change lifecycle |
| OverridabilityClass | FixedAtL1, FixedAtL2, OverridableToL3, OverridableToL4, OverridableToL5, OverridableToL7, OverridableEverywhere | BC16 | OverridableEverywhere | Closed | Class governs per-key override authority |

### 8.2 Feature Flag Enums

Feature flag enums govern the structural fields of the feature flag system. These enums are owned by the Feature Flags bounded context (BC18) and are bound to the local extension namespace `IH-FF` documented in TERMINOLOGY.md Section 3.3. The feature flag enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| FeatureFlagType | FF1, FF2, FF3, FF4, FF5 | BC18 | FF1 | Closed | Type governs flag use (SYSTEM_ARCHITECTURE Section 14.2) |
| FeatureFlagLifecycle | FFL1, FFL2, FFL3, FFL4, FFL5 | BC18 | FFL1 | Closed | Lifecycle governs flag evolution (SYSTEM_ARCHITECTURE Section 14.3) |
| FeatureFlagEvaluationResult | True, False, Variant | BC18 | False | Closed | Result governs capability exposure |
| FeatureFlagRolloutStrategy | Percentage, TenantList, Segment, TierBased, Geographic | BC18 | Percentage | Closed | Strategy governs evaluation cohort |

### 8.3 Audit Enums

Audit enums govern the structural fields of the audit system. These enums are owned by the Audit bounded context (BC17) and are bound to the local extension namespace `IH-AUDIT` documented in TERMINOLOGY.md Section 3.3. The audit enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| AuditSurface | Clinical, Financial, Operational, Configuration, Security, Administrative | BC17 | Operational | Closed | Surface governs audit scope (SYSTEM_ARCHITECTURE Section 27.3) |
| AuditAction | Created, Read, Updated, Deleted, Approved, Rejected, Exported, Configured | BC17 | Read | Open-with-Council | Action governs audit record type |
| AuditResult | Success, Failure, Partial | BC17 | Success | Closed | Result governs audit record outcome |
| AuditActorType | User, System, Integration, Service | BC17 | User | Closed | Actor type governs audit attribution |

### 8.4 Identity and Access Enums

Identity and access enums govern the structural fields of identity, authentication, and authorization. These enums are owned by the Identity & Access bounded context (BC15). The identity enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| AuthenticationMethod | Password, MFA, SSO, Biometric, Certificate, Token | BC15 | MFA | Closed | Method governs authentication strength |
| SessionStatus | Active, Expired, Terminated, Suspended | BC15 | Active | Closed | Status governs session lifecycle |
| RoleCategory | Clinical, Administrative, Financial, Technical, Patient, Partner | BC15 | Clinical | Closed | Category governs role assignment |
| PermissionAction | Create, Read, Update, Delete, Approve, Export, Configure | BC15 | Read | Closed | Action governs permission scope |

### 8.5 Subscription and Tenant Enums

Subscription and tenant enums govern the structural fields of the subscription and tenant management. These enums are owned by the Configuration bounded context (BC16) for tenant configuration and the Subscriptions bounded context (which is not a bounded context per SYSTEM_ARCHITECTURE Section 7.7 but is orchestrated through collaboration with BC07, BC08, BC15, BC16, BC17, BC14). The subscription enums are listed below.

| Enum Name | Values | Bounded Context | Default | Extensible | Notes |
|---|---|---|---|---|---|
| Edition | Trial, Essential, Professional, Enterprise | Subscriptions | Essential | Closed | Aligned with PRODUCT_BIBLE Section 16 |
| TenantLifecycleStage | TL1, TL2, TL3, TL4, TL5, TL6, TL7 | Subscriptions | TL1 | Closed | Aligned with PRODUCT_BIBLE Section 23.3 |
| IsolationLevel | IL1, IL2, IL3 | Subscriptions | IL1 | Closed | Aligned with PRODUCT_BIBLE Section 15.3 |
| SubscriptionStatus | Trial, Active, PastDue, Suspended, Cancelled, Expired | Subscriptions | Active | Closed | Status governs platform access |

---

## 9. Enum Localization

### 9.1 Display String Resolution

Enum display strings are localized through the platform's localization architecture documented in SYSTEM_ARCHITECTURE Section 26. Each enum value has a display string in each supported language, with the display string resolved at render time through the localization pack in force for the tenant. The display string is not stored alongside the enum value in the data record; the enum value (canonical code) is stored, and the display string is resolved when the value is rendered. This discipline preserves the platform's cross-language comparability: an enum value recorded in an English-speaking clinic is the same value in an Arabic-speaking clinic; the display string differs, but the code does not.

The display string resolution is performed by the terminology service, in coordination with the localization service. The terminology service holds the canonical enum catalogue; the localization service holds the display string translations. The two services are distinct but coordinated: an enum value's display string is requested by the rendering layer from the localization service, with the terminology service consulted for the canonical code's metadata where needed.

### 9.2 Localization Pack Coverage

Each localization pack covers the enum values used in the tenant's region. The pack's coverage is documented in the regional profile (PRODUCT_BIBLE Section 25.3); a tenant that operates in a region with incomplete enum localization receives a warning at tenant configuration time, with the option to defer configuration until the pack's coverage is complete or to proceed with fallback display strings. The fallback display string is the enum value's canonical code, rendered in the platform's primary language; the fallback is recorded so that the rendering layer can surface the language discrepancy to the user where appropriate.

Localization pack coverage is reviewed at each quarterly Architecture Council review. Packs that have fallen behind the platform's enum catalogue are prioritized for completion. The completion is the responsibility of the Regional Council with Architecture Council oversight, in keeping with the governance discipline documented in TERMINOLOGY.md Section 5.

### 9.3 Right-to-Left Display

Enum display strings in right-to-left languages (Arabic, Hebrew, Persian, Urdu) are subject to the directionality rules documented in TERMINOLOGY.md Section 7.5. The display string is rendered with the correct directionality, with the directionality metadata supplied by the localization service. Enum display strings that combine left-to-right and right-to-left content (for example, an Arabic display string that includes a Latin code) are handled through Unicode bidirectional algorithm support.

Right-to-left display is part of the platform's localization architecture and is documented here because enum display strings are subject to the rules. The discipline ensures that enum display strings render correctly in all supported languages, in keeping with the platform's regional adaptation posture documented in PRODUCT_BIBLE Section 25.

### 9.4 Patient-Facing Display Strings

Enum values that are displayed to patients (for example, appointment types, medication routes) have patient-facing display strings distinct from practitioner-facing display strings. The patient-facing display string is curated by the Clinical Informatics Council, with input from patient advocacy bodies where appropriate. The patient-facing display string is not a separate enum value; it is a display string for the same enum value, recorded in a separate display-string catalogue.

The separation of patient-facing from practitioner-facing display strings preserves the platform's commitment to patient comprehension while maintaining clinical fidelity. A patient who reads "tablets by mouth" instead of "PO" sees the same enum value that the practitioner recorded, with the display string resolved for the patient's context. This treatment is the architectural expression of PRODUCT_BIBLE Design Principle D-4 (Simplicity Without Sacrificing Power) applied to the enum domain.

---

## 10. Enum Extension Policy

### 10.1 When Extensions Are Permitted

Enum extensions are permitted in Ibn Hayan only through the Architecture Council process documented in TERMINOLOGY.md Section 5.1. A tenant that needs an enum value not present in the enum's value list does not extend the enum at runtime; the need is met through a local extension registered through the Architecture Council, with the extension added to the enum in a new version. This discipline preserves the platform's cross-tenant comparability: an enum value recorded in one tenant is interpretable in another tenant because the value is defined by the platform, not by the tenant.

The extension policy reflects the platform's broader posture on configuration and customization (PRODUCT_BIBLE Section 22). An enum is not a customization surface; it is a platform contract. The platform's commitment to one code base serving every customer (Principle P3, One Platform, Many Organizations) requires that enums be platform-owned. Where a tenant's need cannot be met through the existing enum value list, the need is escalated to the Architecture Council, which evaluates whether the need is shared across tenants and whether the value addition is appropriate.

### 10.2 Extension Proposal Process

An enum extension proposal is submitted to the Architecture Council with the following content: the enum to be extended, the proposed value's canonical code, display name, and description, the rationale for the extension, the affected modules and workflows, and the proposed transition plan for existing records that may need to be migrated. The proposal is reviewed at the next Architecture Council meeting, with the decision recorded in an ADR. Approved extensions are added to the enum in a new version, with the version increment recorded in the CHANGELOG.

The proposal process is the structural mechanism by which the platform's enum catalogue evolves with the platform's scope. A proposal that does not include the required content is rejected; the rejection is recorded with the rationale. The process is the architectural expression of Principle P7 (Documented Before Implemented) applied to the enum domain.

### 10.3 Extension Impact Assessment

Each enum extension proposal includes an impact assessment. The assessment covers the modules that reference the enum, the workflows that depend on the enum's value list, the integrations that exchange the enum's values, the value sets that include the enum's values, the reports that aggregate by the enum's values, and the localization packs that translate the enum's values. The assessment is the basis for the transition plan: where the extension affects downstream consumers, the transition plan documents the communication, the migration, and the validation required.

The impact assessment discipline ensures that enum extensions do not produce unintended consequences. An extension that adds a value to an enum used in a workflow condition may produce a workflow that does not handle the new value; an extension that adds a value to an enum exchanged with an external system may produce an integration that does not recognize the new value. The impact assessment surfaces these consequences before the extension is ratified, in keeping with the platform's disciplined integration posture documented in PRODUCT_BIBLE Section 29.

### 10.4 Closed vs Open-with-Council Enums

The extension policy differs between Closed and Open-with-Council enums (Section 2.4). Closed enums accept extensions only through a new enum version ratified by an ADR; the extension is recorded as a major version increment. Open-with-Council enums accept extensions through the Architecture Council process without a new enum version; the extension is recorded as a minor version increment. The distinction reflects the enum's stability requirements: Closed enums are referenced by structural code paths that must be updated to handle new values, whereas Open-with-Council enums are referenced by category logic that handles unknown values gracefully.

The Closed vs Open-with-Council distinction is reviewed at each Architecture Council quarterly review. An enum that has accumulated many extensions may be promoted from Open-with-Council to Closed to prevent further drift; an enum that has been Closed but whose domain has stabilized may be demoted from Closed to Open-with-Council to reduce the overhead of future extensions. The change is ratified through an ADR.

---

## 11. Enum Deprecation Policy

### 11.1 When Deprecation Is Required

An enum value is deprecated when the value is no longer appropriate for new records. Deprecation is required in three situations. First, when the value's meaning has been clarified and the value is no longer the appropriate code for the meaning (for example, a value that has been split into more specific values). Second, when the value's usage has been discouraged by clinical or regulatory guidance (for example, a value that has been replaced by a more specific code in an external code system). Third, when the value has been found to produce consequential behaviour that the platform did not intend (for example, a value that triggers a workflow that is no longer appropriate).

Deprecation is not removal. A deprecated value remains in the enum's value list, with Deprecation status recorded. The value is not recommended for new records but is valid for new records where the practitioner judges the value appropriate. Historical records that contain the value remain interpretable indefinitely. The deprecation discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) applied to the enum domain.

### 11.2 Deprecation Process

An enum deprecation is ratified through an ADR. The ADR records the deprecated value, the rationale, the successor value where one exists, the transition window, and the migration plan for existing records where migration is appropriate. The ADR is recorded in the CHANGELOG with the version increment. The deprecation takes effect at the end of the transition window, at which point the value is moved from Deprecated status to Retired status (where it remains valid for historical record interpretation but is not valid for new records).

The deprecation process is the structural mechanism by which the platform's enum catalogue evolves without disrupting historical records. A deprecation that bypasses the process is defective; the platform's audit trail cannot demonstrate the deprecation's rationale, and downstream consumers cannot determine why the value was deprecated. The process is the architectural expression of Principle P13 (Auditability as Primitive) applied to the enum domain.

### 11.3 Transition Window

The transition window for a deprecated enum value is at least one full release cycle of the platform, and longer for values that are widely used in historical records. During the transition window, the deprecated value is highlighted in the user interface (with a visual indicator and a tooltip explaining the deprecation), is flagged in validation warnings (where the value is submitted for a new record), and is documented in the change notices issued to affected module owners, integration owners, and tenant administrators. After the transition window closes, the value is moved to Retired status.

The transition window's duration is set per deprecation based on the value's usage. A value that is used in a single module may have a transition window of one release cycle; a value that is used across modules, integrations, and reports may have a transition window of multiple release cycles. The duration is documented in the deprecation ADR and is reviewed at each Architecture Council quarterly review until the deprecation is complete.

### 11.4 Retirement and Historical Interpretation

Retirement is the final stage of an enum value's lifecycle. A retired value is not valid for new records; the validation engine rejects a retired value submitted for a new record. The retired value remains in the enum's value list, with Retired status recorded, and is interpretable for historical records indefinitely. A retired value is not removed from the enum's value list; removal would compromise the interpretability of historical records.

The retirement discipline preserves the platform's commitment to indefinite interpretability of historical records. A record made in 2026 must remain interpretable in 2036, even if the enum value it contains has been retired. The discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) and Principle P5 (Consistency Over Availability for Clinical Data) applied to the enum domain.

### 11.5 Deprecation Communication

Enum deprecations are communicated through change notices to affected module owners, integration owners, and tenant administrators. The change notice includes the deprecated value, the rationale, the successor value, the transition window, and the migration plan. The change notice is distributed at the deprecation's ratification and is repeated at the midpoint and end of the transition window. Tenant administrators are responsible for communicating deprecations to their end users where the deprecation affects user-facing behaviour.

The communication discipline is the structural mechanism by which enum deprecations are surfaced to the people who depend on them. A deprecation that is not communicated may produce unexpected behaviour in downstream consumers; a deprecation that is communicated but not acted upon is the consumer's responsibility. The discipline is the architectural expression of the platform's commitment to disciplined change management (PRODUCT_BIBLE Section 22 Configuration-Driven Philosophy applied to enums).

---

## 12. Enum Registry

### 12.1 Registry Purpose

The enum registry is the platform's authoritative catalogue of all enums. The registry records each enum's canonical name, owning bounded context, version, status, default value, extensibility posture, value list (with each value's canonical code, display name, description, and lifecycle status), the ADR that ratified the enum, and the curation log. The registry is the binding reference for module specifications, integration contracts, configuration schemas, and audit records.

The registry is consumed by the configuration service at validation time. A field that holds an enum value is validated against the enum's value list in the registry; a value not in the registry is rejected. The registry is consumed by the terminology service for display string resolution. The registry is consumed by the audit service for historical record interpretation, with the enum's version at the time of the record consulted to resolve the value's meaning in context.

### 12.2 Registry Versioning

The registry is versioned. A change to the registry (a new enum, a new value, a deprecation, a retirement) is a new version of the registry. The previous version is retained for historical record interpretation. The registry's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5. The registry's version is recorded in the platform's release manifest, ensuring that a tenant operating on a specific platform release has a documented enum registry version.

The versioning discipline is the structural mechanism by which the platform's enum registry remains a recoverable artefact. A defect in a release that is later corrected must be recoverable; the registry's version history permits the platform to identify the version under which a record was made and to interpret the record in that context. The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the enum domain.

### 12.3 Registry Access

The registry is read-accessible to all platform components. Write access is restricted to the Architecture Council through the ADR process. Tenant administrators may read the registry to understand the enum catalogue; they may not modify the registry. Integrations may read the registry through the terminology service's read API to validate codes against the registry; they may not write to the registry. The access discipline is enforced by the authorization model documented in SYSTEM_ARCHITECTURE Section 20.

The access discipline is the structural mechanism by which the registry's integrity is preserved. A registry that is modified outside the ADR process is defective; the platform's audit trail cannot demonstrate the modification's rationale, and downstream consumers cannot determine why the registry was modified. The discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the enum domain.

### 12.4 Registry and Terminology Alignment

The enum registry is aligned with the terminology service's code system registry documented in TERMINOLOGY.md Section 5.4. An enum that is bound to an external code system references the code system in the registry; the code system's version is recorded alongside the enum's version. An enum that is a local extension references the local extension's namespace; the local extension's mapping to the closest external concept is recorded.

The alignment discipline ensures that the enum registry and the code system registry are consistent. An enum that references a code system not in the code system registry is defective; an enum that is a local extension without a mapping is defective. The alignment is reviewed at each Architecture Council quarterly review, with discrepancies escalated for resolution.

### 12.5 Registry and Audit

Every enum registry change is recorded in the audit trail, including the change type (new enum, new value, deprecation, retirement), the affected enum, the change's rationale, the actor, and the timestamp. The audit record is preserved indefinitely, ensuring that the registry's evolution is recoverable. The audit discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the enum domain.

The audit record for registry changes is distinct from the audit record for enum value usage. A registry change is audited by the Configuration bounded context (BC16); an enum value usage is audited by the bounded context that owns the field that holds the enum value. Both audit records are preserved in the audit store and are queryable by authorized roles.

---

## 13. Related Documents

### 13.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-1 (Healthcare First), D-2 (Configuration Before Customization), D-4 (Simplicity Without Sacrificing Power) govern enum posture |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Enums are platform contracts governed by the configuration lifecycle |
| PRODUCT_BIBLE.md | Section 33 (Product Glossary) | Enum terminology aligned with the product glossary |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P3 (One Platform), P4 (Loose Coupling), P5 (Consistency), P7 (Documented), P13 (Auditability), P18 (Decade-Horizon) govern enum posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Bounded contexts to which enums are bound |
| SYSTEM_ARCHITECTURE.md | Section 14 (Feature Flag Strategy) | Feature flag enums (FF1–FF5, FFL1–FFL5) |
| SYSTEM_ARCHITECTURE.md | Section 15 (Configuration Strategy) | Configuration layer enums (L1–L8), validation rule category enums (V1–V5) |
| SYSTEM_ARCHITECTURE.md | Section 16 (Workflow Engine Philosophy) | Workflow pattern enums |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Audit surface enums |
| CONFIGURATION_ARCHITECTURE.md | Section 2 (Configuration Layer Model) | Configuration layer enum detailed semantics |
| CONFIGURATION_ARCHITECTURE.md | Section 5 (Feature Flag Architecture) | Feature flag enum detailed semantics |
| CONFIGURATION_ARCHITECTURE.md | Section 7 (Configuration Validation) | Validation rule category enum detailed semantics |

### 13.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references enums, the reference is to this document.

| Document | Relationship to Enums |
|---|---|
| TERMINOLOGY.md | Enums are local extensions governed by TERMINOLOGY Section 3; enum display strings are localized through TERMINOLOGY Section 7 |
| STATUS_CODES.md | Status codes are enums; transition semantics are documented in STATUS_CODES.md |
| BUSINESS_RULES.md | Business rules reference enum values for trigger conditions |
| CALCULATIONS.md | Calculations reference enum values for input discrimination |
| CLINICAL_WORKFLOWS.md | Clinical workflows reference enum values for state transitions |
| CONFIGURATION.md | Configuration keys reference enums for value types |
| FEATURE_FLAGS.md | Feature flag enums are documented here; flag lifecycle and evaluation are documented in FEATURE_FLAGS.md |

### 13.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level enum usage and value set composition |
| docs/04_INTEGRATIONS/*.md | External system enum exchange and mapping |
| docs/06_DATABASE/*.md | Enum storage and indexing |
| docs/09_DEPLOYMENT/*.md | Enum registry deployment topology |
| docs/03_SECURITY/*.md | Enum registry access control and audit |

### 13.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when an enum amendment, a code system release, or an ADR requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification. Ibn Hayan's enum catalogue is a structural element of the platform's contract surface and is treated with the discipline that structural elements warrant.
