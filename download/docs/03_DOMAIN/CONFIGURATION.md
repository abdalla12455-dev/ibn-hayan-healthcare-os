# Ibn Hayan Healthcare Operating System — Domain Configuration

| Field | Value |
|---|---|
| Document Title | Domain Configuration |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Domain Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Software Architect |
| Custodian | Architecture Council |
| Review Cadence | Quarterly, with off-cycle revision when a configuration amendment, a layer model change, or an ADR is ratified |
| Audience | Software architects, module owners, configuration service team, tenant administrators, integration architects, compliance officers |
| Scope | Domain-level configuration catalogue across tenant, specialty, module, workflow, form, notification, and integration scopes of Ibn Hayan; defaults, inheritance, validation, change management |
| Out of Scope | Implementation details, source code, database schemas, API endpoint specifications, per-key configuration catalogue entries, vendor-specific configuration syntax |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Configuration definitions in this document elaborate the configuration strategy of SYSTEM_ARCHITECTURE Section 15 and the configuration-driven philosophy of PRODUCT_BIBLE Section 22. Where this document and CONFIGURATION_ARCHITECTURE.md appear to overlap, CONFIGURATION_ARCHITECTURE.md prevails as the implementation-grade elaboration. |
| Amendment Mechanism | Architecture Council ratification through an Architecture Decision Record; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (skeleton with section headings only) |

---

## Table of Contents

1. Domain Configuration Overview
2. Configuration Schema Standard
3. Tenant-Level Configuration
4. Specialty-Level Configuration
5. Module-Level Configuration
6. Workflow Configuration
7. Form & Template Configuration
8. Notification Configuration
9. Integration Configuration
10. Configuration Defaults & Inheritance
11. Configuration Validation Rules
12. Configuration Change Management
13. Related Documents

---

## 1. Domain Configuration Overview

### 1.1 Purpose of This Document

This document is the authoritative domain reference for configuration of the Ibn Hayan Healthcare Operating System. Configuration is the platform's primary adaptation mechanism, in keeping with Principle P2 (Configuration Before Customization) defined in SYSTEM_ARCHITECTURE Section 4.3 and PRODUCT_BIBLE Section 22. The platform adapts to customer need through declarative, version-controlled, tenant-scoped configuration rather than through source-level customization. This document defines what can be configured, at which layer, with which defaults, validation, and inheritance rules.

The discipline around configuration reflects the platform's broader posture on adaptation and customization. A configuration is data — versioned, validated, audited, and treated with the discipline applied to any other durable platform state. A configuration is layered — eight layers with explicit precedence, governed by inheritance and override rules. A configuration is validated before application — no configuration change reaches production without passing the five validation rule categories defined in SYSTEM_ARCHITECTURE Section 15.4. A configuration is auditable after application — every change, including rollback and promotion, is recorded in a tamper-evident audit trail. A configuration is governed — change approval, sandbox testing, and stakeholder communication are part of the configuration lifecycle.

This document sits below `SYSTEM_ARCHITECTURE.md` and below `CONFIGURATION_ARCHITECTURE.md` (the implementation-grade elaboration). It aligns with `PRODUCT_BIBLE.md` Section 22 (Configuration-Driven Philosophy) and Section 25 (Localization Strategy). Sibling documents include `FEATURE_FLAGS.md` (which governs feature flag configuration, distinct from continuous configuration), `ENUMS.md` (which catalogues the enumerations referenced by configuration keys), and `BUSINESS_RULES.md` (which catalogues the rules that configuration governs). Where this document and a sibling document appear to overlap, this document holds authority over configuration scope and surface; FEATURE_FLAGS.md holds authority over flag-specific configuration; ENUMS.md holds authority over enum value lists.

### 1.2 Configuration vs Feature Flags

Configuration and feature flags are distinct architectural concerns in Ibn Hayan, as documented in SYSTEM_ARCHITECTURE Section 14.6. Configuration controls continuous behavioural parameters (for example, the default appointment duration, the tax rate, the rounding policy). Feature flags control binary or near-binary capability exposure (for example, whether a new feature is visible, whether an operational behaviour is enabled). The distinction is enforced at architectural review: a behaviour that should be a configuration key is defective as a feature flag, and vice versa.

The distinction matters because the two have different cardinality, lifetime, change frequency, use case, and governance. Configuration is continuous, permanent, low-change-frequency, behavioural-parameter, customer-governed. Feature flags are binary, temporary, high-change-frequency, capability-exposure, platform-team-governed. Mixing the two produces a configuration surface that is hard to maintain and a feature flag catalogue that accumulates debt. The discipline of separating them is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the configuration domain. This document covers configuration; feature flags are documented in FEATURE_FLAGS.md.

### 1.3 Configuration Coverage

The domain configuration catalogue covers all scopes at which configuration applies. Tenant-level configuration covers tenant-wide parameters (locale, currency, regulatory framework). Specialty-level configuration covers specialty-specific parameters (clinical templates, specialty workflows). Module-level configuration covers per-module parameters (module availability, module defaults). Workflow configuration covers workflow definitions, step parameters, and customization. Form and template configuration covers clinical documentation templates, patient-facing forms, and print templates. Notification configuration covers notification templates, channels, and preferences. Integration configuration covers external system connections, mappings, and credentials.

The coverage is documented per scope in Sections 3 through 9 of this document. Each section catalogues the configuration keys in the corresponding scope, with the key's canonical identifier, owning module, value type, default value, overridability class, and configuration layer. The catalogue is the binding reference for module specifications and integration contracts; a configuration key referenced by a module specification must be present in this catalogue.

### 1.4 Configuration Posture

Ibn Hayan adopts a posture of disciplined configuration management. Four commitments govern this posture. First, configuration is data: configuration is treated with the discipline applied to any other durable platform state, including versioning, validation, and audit. Second, configuration is layered: configuration is organized into eight layers with explicit precedence, governed by inheritance and override rules. Third, configuration is validated before application: no configuration change reaches production without passing the five validation rule categories. Fourth, configuration is auditable after application: every change is recorded in a tamper-evident audit trail.

The four commitments are the architectural floor for configuration in Ibn Hayan. A module that records configuration outside the configuration service is defective; the platform's posture is that all configuration is recorded in the configuration service and consumed through the service's contracts. A module that applies configuration without validation is defective; the platform's posture is that all configuration is validated before application. A module that applies configuration without audit is defective; the platform's posture is that all configuration changes are audited. The configuration service enforces these commitments at validation time, in keeping with the configuration validation framework documented in SYSTEM_ARCHITECTURE Section 15.4.

### 1.5 Ibn Hayan Identity and Configuration

Configuration is the structural mechanism by which Ibn Hayan maintains its one-platform identity (PRODUCT_BIBLE Section 1.5) while accommodating the variation across the platform's deployment spectrum. A small clinic and a multi-national hospital network run the same code paths; the variation between them is expressed as configuration, not as forks. This consistency is the architectural expression of Principle P3 (One Platform, Many Organizations) applied to the configuration domain. Where regional variation requires different configuration (for example, a regional regulatory framework requires a different consent workflow), the variation is expressed through regional configuration overlays registered through the Architecture Council, not through region-specific configuration forks.

---

## 2. Configuration Schema Standard

### 2.1 Configuration Key Naming Conventions

Configuration keys in Ibn Hayan follow a documented naming convention. The key is namespaced by module and by capability, reflecting the owning module and the semantic grouping. The namespace is stable; keys are not renamed casually, and renaming follows the platform's deprecation policy. The key's name is in dot-separated lowercase (for example, `billing.invoice.defaultCurrency`, `scheduling.appointment.defaultDuration`). The key's display name is a human-readable summary. The key's description is a one-sentence statement of the key's purpose, including the value type, the default value, and the overridability class.

The naming convention is enforced by the Architecture Council at configuration key registration. A key that does not follow the convention is rejected; the rejection is recorded with the rationale. The convention is the structural mechanism by which the platform's configuration key catalogue remains coherent and navigable across the decade horizon documented in PRODUCT_BIBLE Section 2.2.

### 2.2 Configuration Key Metadata

Each configuration key is registered with a defined set of metadata. The metadata records the key's canonical name, display name, description, owning module, owning bounded context, value type (string, integer, decimal, boolean, enum, reference, complex), default value, overridability class (Fixed at L1, Fixed at L2, Overridable to L3, Overridable to L4, Overridable to L5, Overridable to L7, Overridable at every layer), validation rule, version, status (Active, Deprecated, Retired), and the ADR that ratified the key. The metadata is the key's authoritative definition; downstream consumers reference the metadata, not ad hoc definitions in module specifications.

The metadata is versioned. A change to the metadata (modifying the default, modifying the overridability class, deprecating the key) is a new version of the key. The previous version is retained for historical record interpretation. The metadata's audit trail is preserved in the audit store documented in SYSTEM_ARCHITECTURE Section 27.5, ensuring that the platform's configuration key adoption history is recoverable indefinitely.

### 2.3 Configuration Schema Contracts

Each bounded context exposes its configuration surface through a configuration schema contract, as documented in SYSTEM_ARCHITECTURE Section 7.4. The schema declares the configuration keys owned by the context, the keys' value types, the keys' default values, the keys' overridability classes, and the keys' validation rules. The schema is part of the context's contract surface, alongside commands, queries, and events. The schema is versioned, with breaking changes following the platform's deprecation policy.

The schema contract discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) applied to the configuration domain. A bounded context's configuration is accessed through its schema contract, not through direct access to the context's configuration storage. The discipline is also the structural mechanism by which the platform's configuration surface is discoverable: a module that wishes to consume another module's configuration can discover the configuration through the schema contract, without requiring ad hoc coordination.

### 2.4 Configuration Value Types

Configuration keys support a defined set of value types. The platform recognizes seven value types: string (a sequence of characters), integer (a whole number), decimal (a number with fractional component), boolean (true or false), enum (a value from a registered enum), reference (a reference to another entity), and complex (a structured value with multiple fields). Each value type has its own validation rules, its own serialization format, and its own display conventions. The value type is declared in the key's metadata and is enforced by the configuration service at validation time.

The value type discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) applied to the configuration domain. A small, well-defined set of value types is simpler to validate, audit, and evolve than an open-ended set. The discipline is also the structural mechanism by which the platform's configuration surface remains coherent: a value type that is not in the set is rejected at validation, ensuring that configuration values conform to the platform's value type system.

### 2.5 Configuration Key Catalogue

The platform maintains a configuration key catalogue that lists every configuration key exposed by the platform. The catalogue is the canonical reference for what is configurable, what the valid values are, and what the precedence rules are. The catalogue is documented as part of the platform's contract surface and is consumed by the configuration service for validation and resolution. The catalogue is versioned alongside the platform's release manifest, ensuring that a tenant operating on a specific platform release has a documented configuration key catalogue version.

The catalogue discipline is the architectural expression of Principle P7 (Documented Before Implemented) applied to the configuration domain. A configuration key that is not in the catalogue is defective; the platform's posture is that every configuration key is registered in the catalogue before it is consumed. The discipline is also the structural mechanism by which the platform's configuration surface is governable: the Architecture Council reviews the catalogue at each quarterly review, with new keys added through the ADR process and deprecated keys marked for retirement.

---

## 3. Tenant-Level Configuration

### 3.1 Tenant Identity Configuration

Tenant identity configuration governs the structural identity of a tenant in the platform. The configuration is owned by the Configuration bounded context (BC16) and is referenced by the Identity & Access bounded context (BC15) for authentication and authorization, by the Localization bounded context (BC19) for locale resolution, and by the Audit bounded context (BC17) for audit scoping. The configuration is set at tenant provisioning (tenant lifecycle stage TL1) and is updated through the tenant lifecycle.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| tenant.identity.tenantId | Tenant Identifier | BC16 | String | (auto-assigned) | Fixed at L1 | L1 |
| tenant.identity.tenantName | Tenant Display Name | BC16 | String | — | Overridable to L3 | L3 |
| tenant.identity.edition | Tenant Edition | BC16 | Enum | Essential | Fixed at L2 | L2 |
| tenant.identity.region | Tenant Region | BC16 | Enum | — | Overridable to L3 | L3 |
| tenant.identity.timezone | Tenant Timezone | BC16 | Enum | UTC | Overridable to L3 | L3 |

### 3.2 Tenant Localization Configuration

Tenant localization configuration governs the locale, language, calendar, and regional profile of a tenant. The configuration is owned by the Localization bounded context (BC19) and is referenced by all bounded contexts that produce user-facing output. The configuration interacts with the regional profile documented in PRODUCT_BIBLE Section 25.3.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| tenant.locale.language | Tenant Language | BC19 | Enum | en | Overridable to L3 | L3 |
| tenant.locale.calendar | Tenant Calendar | BC19 | Enum | Gregorian | Overridable to L3 | L3 |
| tenant.locale.dateFormat | Tenant Date Format | BC19 | String | YYYY-MM-DD | Overridable to L3 | L3 |
| tenant.locale.numberFormat | Tenant Number Format | BC19 | String | (locale default) | Overridable to L3 | L3 |
| tenant.locale.currency | Tenant Currency | BC19 | Enum | USD | Overridable to L3 | L3 |
| tenant.locale.regulatoryFramework | Tenant Regulatory Framework | BC19 | Enum | — | Overridable to L3 | L3 |

### 3.3 Tenant Branding Configuration

Tenant branding configuration governs the visual identity of a tenant in user-facing surfaces. The configuration is owned by the Configuration bounded context (BC16) and is referenced by the rendering layer. The configuration does not affect platform behaviour; it affects only the visual presentation.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| tenant.branding.logoUrl | Tenant Logo URL | BC16 | String | (platform default) | Overridable to L3 | L3 |
| tenant.branding.primaryColor | Tenant Primary Color | BC16 | String | (platform default) | Overridable to L3 | L3 |
| tenant.branding.secondaryColor | Tenant Secondary Color | BC16 | String | (platform default) | Overridable to L3 | L3 |
| tenant.branding.theme | Tenant Theme | BC16 | Enum | Default | Overridable to L3 | L3 |

### 3.4 Tenant Operational Configuration

Tenant operational configuration governs the operational parameters of a tenant. The configuration is owned by the Configuration bounded context (BC16) and is referenced by multiple bounded contexts for operational behaviour.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| tenant.operating.facilityCount | Tenant Facility Count Limit | BC16 | Integer | (edition-defined) | Fixed at L2 | L2 |
| tenant.operating.userCount | Tenant User Count Limit | BC16 | Integer | (edition-defined) | Fixed at L2 | L2 |
| tenant.operating.storageLimit | Tenant Storage Limit | BC16 | Decimal | (edition-defined) | Fixed at L2 | L2 |
| tenant.operating.auditRetention | Tenant Audit Retention Period | BC16 | Integer | (regulatory minimum) | Overridable to L3 | L3 |

### 3.5 Tenant Security Configuration

Tenant security configuration governs the security parameters of a tenant. The configuration is owned by the Identity & Access bounded context (BC15) and is referenced by the authentication and authorization services. The configuration interacts with the security philosophy documented in PRODUCT_BIBLE Section 31.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| tenant.security.passwordPolicy | Tenant Password Policy | BC15 | Complex | (platform default) | Overridable to L3 | L3 |
| tenant.security.mfaRequired | Tenant MFA Required | BC15 | Boolean | true | Overridable to L3 | L3 |
| tenant.security.sessionTimeout | Tenant Session Timeout | BC15 | Integer | 30 (minutes) | Overridable to L3 | L3 |
| tenant.security.breakGlassAllowed | Tenant Break-Glass Allowed | BC15 | Boolean | true | Overridable to L3 | L3 |
| tenant.security.ipWhitelist | Tenant IP Whitelist | BC15 | Complex | (empty) | Overridable to L3 | L3 |

---

## 4. Specialty-Level Configuration

### 4.1 Specialty Configuration Model

Specialty-level configuration governs the configuration of clinical specialties within a tenant. The configuration is owned by the Clinical Documentation bounded context (BC03) and interacts with the Encounter (BC02), Orders & Results (BC04), and Pharmacy (BC05) bounded contexts. Specialty configuration is layered on top of tenant configuration: a tenant that operates multiple specialties configures each specialty independently, with the specialty's configuration overriding the tenant's configuration for the specialty's scope.

The specialty configuration model is the structural mechanism by which Ibn Hayan accommodates the variation across clinical specialties within a single tenant. A multi-specialty clinic configures each specialty's clinical templates, specialty workflows, and specialty documentation independently, with the specialty's configuration applying only to encounters and orders within that specialty. The discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) applied to the specialty configuration domain.

### 4.2 Specialty Clinical Template Configuration

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| specialty.{specialty}.clinicalNoteTemplates | Specialty Clinical Note Templates | BC03 | Complex | (specialty default) | Overridable to L5 | L5 |
| specialty.{specialty}.assessmentTemplates | Specialty Assessment Templates | BC03 | Complex | (specialty default) | Overridable to L5 | L5 |
| specialty.{specialty}.orderSets | Specialty Order Sets | BC04 | Complex | (specialty default) | Overridable to L5 | L5 |
| specialty.{specialty}.carePlanTemplates | Specialty Care Plan Templates | BC03 | Complex | (specialty default) | Overridable to L5 | L5 |

### 4.3 Specialty Workflow Configuration

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| specialty.{specialty}.encounterWorkflow | Specialty Encounter Workflow | BC02 | Reference | (platform default) | Overridable to L5 | L5 |
| specialty.{specialty}.orderWorkflow | Specialty Order Workflow | BC04 | Reference | (platform default) | Overridable to L5 | L5 |
| specialty.{specialty}.clinicalPathways | Specialty Clinical Pathways | BC03 | Complex | (specialty default) | Overridable to L5 | L5 |

### 4.4 Specialty Documentation Configuration

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| specialty.{specialty}.documentationRequired | Specialty Required Documentation | BC03 | Complex | (specialty default) | Overridable to L5 | L5 |
| specialty.{specialty}.signingAuthority | Specialty Signing Authority | BC03 | Complex | (specialty default) | Overridable to L5 | L5 |
| specialty.{specialty}.documentationRetention | Specialty Documentation Retention | BC13 | Integer | (regulatory minimum) | Overridable to L5 | L5 |

### 4.5 Specialty-Specific Configuration Examples

The platform ships with default specialty configuration for each of the clinic types documented in `docs/02_PRODUCT/CLINIC_TYPES.md`. The default configuration is loaded at tenant provisioning and may be customized per facility and department through the configuration layer model. The table below catalogues representative specialty configuration overlays.

| Specialty | Configuration Overlay | Default Source | Customization Layer |
|---|---|---|---|
| Cardiology | Cardiac assessment templates, ECG order set, cardiac pathway | Platform default | L5 (Department) |
| Pediatrics | Pediatric growth charts, immunization schedule, pediatric dose table | Platform default | L5 (Department) |
| Obstetrics | Prenatal visit schedule, ultrasound order set, delivery documentation | Platform default | L5 (Department) |
| Psychiatry | Psychiatric assessment instruments, therapy templates, mental health act compliance | Platform default | L5 (Department) |
| Surgery | Surgical safety checklist, pre-op assessment, operative report template | Platform default | L5 (Department) |

---

## 5. Module-Level Configuration

### 5.1 Module Availability Configuration

Module availability configuration governs which modules are available to a tenant. The configuration is owned by the Configuration bounded context (BC16) and is referenced by the Identity & Access bounded context (BC15) for module access control. The configuration is set at tenant provisioning based on the tenant's edition and may be modified through the subscription lifecycle.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| module.{module}.available | Module Available | BC16 | Boolean | (edition-defined) | Fixed at L2 | L2 |
| module.{module}.enabled | Module Enabled | BC16 | Boolean | true (if available) | Overridable to L3 | L3 |
| module.{module}.version | Module Version | BC16 | String | (current release) | Fixed at L1 | L1 |

### 5.2 Module Default Configuration

Module default configuration governs the default parameter values for each module. The configuration is owned by the owning bounded context of each module and is referenced by the module's commands and queries. The configuration is layered on top of tenant configuration: a module's defaults apply unless overridden by tenant, facility, department, care team, or user configuration.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| scheduling.appointment.defaultDuration | Default Appointment Duration | BC06 | Integer | 30 (minutes) | Overridable to L5 | L5 |
| billing.invoice.defaultCurrency | Default Invoice Currency | BC07 | Enum | (tenant currency) | Overridable to L3 | L3 |
| billing.invoice.defaultPaymentTerms | Default Payment Terms | BC07 | Integer | 30 (days) | Overridable to L3 | L3 |
| pharmacy.dispensing.defaultUnits | Default Dispensing Units | BC05 | Enum | Metric | Overridable to L5 | L5 |
| inventory.stock.defaultReorderPoint | Default Reorder Point | BC09 | Integer | 10 | Overridable to L5 | L5 |
| notifications.dispatch.defaultChannel | Default Notification Channel | BC14 | Enum | InApp | Overridable to L7 | L7 |

### 5.3 Module Integration Configuration

Module integration configuration governs how each module integrates with other modules and with external systems. The configuration is owned by the owning bounded context of each module and is referenced by the integration architecture documented in SYSTEM_ARCHITECTURE Section 19.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| module.{module}.integrationEndpoints | Module Integration Endpoints | BC16 | Complex | (module default) | Overridable to L3 | L3 |
| module.{module}.eventSubscriptions | Module Event Subscriptions | BC16 | Complex | (module default) | Overridable to L3 | L3 |
| module.{module}.externalSystemMappings | Module External System Mappings | BC16 | Complex | (module default) | Overridable to L3 | L3 |

### 5.4 Module Audit Configuration

Module audit configuration governs the audit behaviour of each module. The configuration is owned by the Audit bounded context (BC17) and is referenced by the module's audit producers. The configuration interacts with the audit architecture documented in SYSTEM_ARCHITECTURE Section 27.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| module.{module}.auditEnabled | Module Audit Enabled | BC17 | Boolean | true | Fixed at L1 | L1 |
| module.{module}.auditLevel | Module Audit Level | BC17 | Enum | Standard | Overridable to L3 | L3 |
| module.{module}.auditRetention | Module Audit Retention | BC17 | Integer | (regulatory minimum) | Overridable to L3 | L3 |

### 5.5 Module Permission Configuration

Module permission configuration governs the permission surface of each module. The configuration is owned by the Identity & Access bounded context (BC15) and is referenced by the authorization service. The configuration interacts with the permission philosophy documented in PRODUCT_BIBLE Section 21.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| module.{module}.rolesEnabled | Module Roles Enabled | BC15 | Complex | (module default) | Overridable to L3 | L3 |
| module.{module}.permissionsMatrix | Module Permissions Matrix | BC15 | Complex | (module default) | Overridable to L3 | L3 |
| module.{module}.dataScopeRules | Module Data Scope Rules | BC15 | Complex | (module default) | Overridable to L3 | L3 |

---

## 6. Workflow Configuration

### 6.1 Workflow Definition Configuration

Workflow definition configuration governs the definitions of clinical workflows. The configuration is owned by the Configuration bounded context (BC16) and is referenced by the workflow engine documented in SYSTEM_ARCHITECTURE Section 16. The configuration is layered: workflow definitions may be customized per tenant, facility, department, and care team through the configuration layer model, with the customization framework documented in CLINICAL_WORKFLOWS.md Section 10.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| workflow.{workflow}.definition | Workflow Definition | BC16 | Complex | (platform default) | Overridable to L3 | L3 |
| workflow.{workflow}.enabled | Workflow Enabled | BC16 | Boolean | true | Overridable to L3 | L3 |
| workflow.{workflow}.version | Workflow Version | BC16 | String | (current release) | Fixed at L1 | L1 |

### 6.2 Workflow Step Configuration

Workflow step configuration governs the parameters of individual workflow steps. The configuration is owned by the Configuration bounded context (BC16) and is referenced by the workflow engine.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| workflow.{workflow}.{step}.enabled | Workflow Step Enabled | BC16 | Boolean | true | Overridable to L5 | L5 |
| workflow.{workflow}.{step}.parameters | Workflow Step Parameters | BC16 | Complex | (step default) | Overridable to L5 | L5 |
| workflow.{workflow}.{step}.timeout | Workflow Step Timeout | BC16 | Integer | (step default) | Overridable to L5 | L5 |

### 6.3 Workflow State Machine Configuration

Workflow state machine configuration governs the state transitions of workflows. The configuration is owned by the Configuration bounded context (BC16) and interacts with the status code catalogue documented in STATUS_CODES.md.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| workflow.{workflow}.transitionMap | Workflow Transition Map | BC16 | Complex | (platform default) | Overridable to L3 | L3 |
| workflow.{workflow}.terminalStates | Workflow Terminal States | BC16 | Complex | (workflow default) | Overridable to L3 | L3 |
| workflow.{workflow}.reversibleStates | Workflow Reversible States | BC16 | Complex | (workflow default) | Overridable to L3 | L3 |

### 6.4 Workflow Exception Configuration

Workflow exception configuration governs the exception handling of workflows. The configuration is owned by the Configuration bounded context (BC16) and is referenced by the workflow engine for failure recovery.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| workflow.{workflow}.exceptionHandling | Workflow Exception Handling | BC16 | Complex | (workflow default) | Overridable to L3 | L3 |
| workflow.{workflow}.retryPolicy | Workflow Retry Policy | BC16 | Complex | (workflow default) | Overridable to L3 | L3 |
| workflow.{workflow}.compensationPolicy | Workflow Compensation Policy | BC16 | Complex | (workflow default) | Overridable to L3 | L3 |

### 6.5 Workflow Audit Configuration

Workflow audit configuration governs the audit behaviour of workflows. The configuration is owned by the Audit bounded context (BC17) and is referenced by the workflow engine for audit production.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| workflow.{workflow}.auditLevel | Workflow Audit Level | BC17 | Enum | Standard | Overridable to L3 | L3 |
| workflow.{workflow}.auditStepDetail | Workflow Audit Step Detail | BC17 | Enum | Standard | Overridable to L3 | L3 |
| workflow.{workflow}.auditRetention | Workflow Audit Retention | BC17 | Integer | (regulatory minimum) | Overridable to L3 | L3 |

---

## 7. Form & Template Configuration

### 7.1 Clinical Documentation Template Configuration

Clinical documentation template configuration governs the templates used for clinical notes, assessments, and care plans. The configuration is owned by the Clinical Documentation bounded context (BC03) and is referenced by the documentation workflow. The configuration is layered: templates may be customized per tenant, facility, and department through the configuration layer model.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| template.{template}.definition | Template Definition | BC03 | Complex | (platform default) | Overridable to L5 | L5 |
| template.{template}.enabled | Template Enabled | BC03 | Boolean | true | Overridable to L5 | L5 |
| template.{template}.signingAuthority | Template Signing Authority | BC03 | Complex | (template default) | Overridable to L5 | L5 |

### 7.2 Patient-Facing Form Configuration

Patient-facing form configuration governs the forms used for patient intake, consent, and patient-reported outcomes. The configuration is owned by the Clinical Documentation bounded context (BC03) and the CRM bounded context (BC11) jointly.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| form.{form}.definition | Form Definition | BC03, BC11 | Complex | (platform default) | Overridable to L3 | L3 |
| form.{form}.enabled | Form Enabled | BC03, BC11 | Boolean | true | Overridable to L3 | L3 |
| form.{form}.language | Form Language | BC03, BC11 | Enum | (tenant language) | Overridable to L7 | L7 |
| form.{form}.accessLevel | Form Access Level | BC15 | Enum | Public | Overridable to L3 | L3 |

### 7.3 Print Template Configuration

Print template configuration governs the templates used for printed documents (prescriptions, certificates, letters, reports). The configuration is owned by the Documents bounded context (BC13).

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| printTemplate.{template}.definition | Print Template Definition | BC13 | Complex | (platform default) | Overridable to L3 | L3 |
| printTemplate.{template}.paperSize | Print Template Paper Size | BC13 | Enum | A4 | Overridable to L3 | L3 |
| printTemplate.{template}.orientation | Print Template Orientation | BC13 | Enum | Portrait | Overridable to L3 | L3 |
| printTemplate.{template}.headerFooter | Print Template Header/Footer | BC13 | Complex | (tenant branding) | Overridable to L3 | L3 |

### 7.4 Report Template Configuration

Report template configuration governs the templates used for clinical and operational reports. The configuration is owned by the Reporting bounded context (deployable expression of the Reporting Layer per SYSTEM_ARCHITECTURE Section 28).

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| reportTemplate.{template}.definition | Report Template Definition | Reports | Complex | (platform default) | Overridable to L3 | L3 |
| reportTemplate.{template}.schedule | Report Template Schedule | Reports | Complex | (template default) | Overridable to L3 | L3 |
| reportTemplate.{template}.distribution | Report Template Distribution | Reports | Complex | (template default) | Overridable to L3 | L3 |

### 7.5 Template Versioning Configuration

Template versioning configuration governs how templates are versioned. The configuration is owned by the Configuration bounded context (BC16) and is referenced by all template-owning bounded contexts.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| template.{template}.versioningEnabled | Template Versioning Enabled | BC16 | Boolean | true | Fixed at L1 | L1 |
| template.{template}.versionRetention | Template Version Retention | BC16 | Integer | (indefinite) | Overridable to L3 | L3 |
| template.{template}.amendmentWorkflow | Template Amendment Workflow | BC16 | Reference | (platform default) | Overridable to L3 | L3 |

---

## 8. Notification Configuration

### 8.1 Notification Template Configuration

Notification template configuration governs the templates used for notifications. The configuration is owned by the Notifications bounded context (BC14) and is referenced by the notification dispatch service.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| notificationTemplate.{template}.definition | Notification Template Definition | BC14 | Complex | (platform default) | Overridable to L3 | L3 |
| notificationTemplate.{template}.language | Notification Template Language | BC14 | Enum | (tenant language) | Overridable to L7 | L7 |
| notificationTemplate.{template}.channel | Notification Template Channel | BC14 | Enum | InApp | Overridable to L7 | L7 |

### 8.2 Notification Channel Configuration

Notification channel configuration governs the channels through which notifications are dispatched. The configuration is owned by the Notifications bounded context (BC14) and interacts with the integration architecture for external channel providers (SMS gateway, email provider, push provider, WhatsApp Business API).

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| notification.channel.{channel}.enabled | Channel Enabled | BC14 | Boolean | true | Overridable to L3 | L3 |
| notification.channel.{channel}.provider | Channel Provider | BC14 | String | (platform default) | Overridable to L3 | L3 |
| notification.channel.{channel}.credentials | Channel Credentials | BC14 | Complex | — | Overridable to L3 | L3 |
| notification.channel.{channel}.rateLimit | Channel Rate Limit | BC14 | Integer | (provider default) | Overridable to L3 | L3 |

### 8.3 Notification Preference Configuration

Notification preference configuration governs the preferences that users and patients set for notifications. The configuration is owned by the Notifications bounded context (BC14) and is referenced by the notification dispatch service for preference resolution.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| notification.preference.{user}.channels | User Notification Channels | BC14 | Complex | (tenant default) | Overridable to L7 | L7 |
| notification.preference.{user}.quietHours | User Quiet Hours | BC14 | Complex | (tenant default) | Overridable to L7 | L7 |
| notification.preference.{user}.language | User Notification Language | BC14 | Enum | (user language) | Overridable to L7 | L7 |

### 8.4 Notification Suppression Configuration

Notification suppression configuration governs the rules under which notifications are suppressed. The configuration is owned by the Notifications bounded context (BC14) and interacts with the patient communication preferences documented in PRODUCT_BIBLE Section 21.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| notification.suppression.optOut | Patient Opt-Out | BC14 | Boolean | false | Overridable to L7 | L7 |
| notification.suppression.inactivePatient | Inactive Patient Suppression | BC14 | Boolean | true | Overridable to L3 | L3 |
| notification.suppression.deceasedPatient | Deceased Patient Suppression | BC14 | Boolean | true | Fixed at L1 | L1 |

### 8.5 Notification Audit Configuration

Notification audit configuration governs the audit behaviour of notifications. The configuration is owned by the Audit bounded context (BC17) and is referenced by the notification dispatch service for audit production.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| notification.auditEnabled | Notification Audit Enabled | BC17 | Boolean | true | Fixed at L1 | L1 |
| notification.auditLevel | Notification Audit Level | BC17 | Enum | Standard | Overridable to L3 | L3 |
| notification.auditRetention | Notification Audit Retention | BC17 | Integer | (regulatory minimum) | Overridable to L3 | L3 |

---

## 9. Integration Configuration

### 9.1 External System Connection Configuration

External system connection configuration governs the connections to external systems (payers, labs, imaging, registries, devices). The configuration is owned by the Configuration bounded context (BC16) and is referenced by the integration architecture documented in SYSTEM_ARCHITECTURE Section 19.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| integration.{system}.connectionEndpoint | Connection Endpoint | BC16 | String | — | Overridable to L3 | L3 |
| integration.{system}.credentials | Connection Credentials | BC16 | Complex | — | Overridable to L3 | L3 |
| integration.{system}.protocol | Connection Protocol | BC16 | Enum | (system default) | Overridable to L3 | L3 |
| integration.{system}.enabled | Integration Enabled | BC16 | Boolean | false | Overridable to L3 | L3 |

### 9.2 Integration Mapping Configuration

Integration mapping configuration governs the mappings between platform entities and external system entities. The configuration is owned by the Configuration bounded context (BC16) and interacts with the terminology service for code system crosswalks documented in TERMINOLOGY.md Section 4.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| integration.{system}.fieldMappings | Field Mappings | BC16 | Complex | (system default) | Overridable to L3 | L3 |
| integration.{system}.codeMappings | Code Mappings | BC16 | Complex | (system default) | Overridable to L3 | L3 |
| integration.{system}.transformationRules | Transformation Rules | BC16 | Complex | (system default) | Overridable to L3 | L3 |

### 9.3 Integration Synchronization Configuration

Integration synchronization configuration governs the synchronization behaviour of integrations. The configuration is owned by the Configuration bounded context (BC16) and interacts with the synchronization strategy documented in SYSTEM_ARCHITECTURE Section 25.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| integration.{system}.syncDirection | Synchronization Direction | BC16 | Enum | Bidirectional | Overridable to L3 | L3 |
| integration.{system}.syncFrequency | Synchronization Frequency | BC16 | Enum | Real-time | Overridable to L3 | L3 |
| integration.{system}.conflictResolution | Conflict Resolution Strategy | BC16 | Enum | (system default) | Overridable to L3 | L3 |
| integration.{system}.retryPolicy | Retry Policy | BC16 | Complex | (platform default) | Overridable to L3 | L3 |

### 9.4 Integration Anticorruption Layer Configuration

Integration anticorruption layer configuration governs the anticorruption layer that prevents external model leakage. The configuration is owned by the Configuration bounded context (BC16) and is referenced by the integration architecture documented in SYSTEM_ARCHITECTURE Section 7.3.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| integration.{system}.aclEnabled | ACL Enabled | BC16 | Boolean | true | Fixed at L1 | L1 |
| integration.{system}.aclRules | ACL Rules | BC16 | Complex | (system default) | Overridable to L3 | L3 |
| integration.{system}.aclValidation | ACL Validation Strictness | BC16 | Enum | Strict | Overridable to L3 | L3 |

### 9.5 Integration Audit Configuration

Integration audit configuration governs the audit behaviour of integrations. The configuration is owned by the Audit bounded context (BC17) and is referenced by the integration architecture for audit production.

| Configuration Key | Display Name | Module | Value Type | Default | Overridability | Layer |
|---|---|---|---|---|---|---|
| integration.{system}.auditEnabled | Integration Audit Enabled | BC17 | Boolean | true | Fixed at L1 | L1 |
| integration.{system}.auditLevel | Integration Audit Level | BC17 | Enum | Standard | Overridable to L3 | L3 |
| integration.{system}.auditPayloadLogging | Audit Payload Logging | BC17 | Enum | Metadata | Overridable to L3 | L3 |
| integration.{system}.auditRetention | Integration Audit Retention | BC17 | Integer | (regulatory minimum) | Overridable to L3 | L3 |

---

## 10. Configuration Defaults & Inheritance

### 10.1 Default Source Hierarchy

Configuration defaults in Ibn Hayan follow a documented hierarchy. The platform default (L1) is the lowest layer and provides the baseline value for every configuration key. The edition default (L2) overrides the platform default for tenants on a specific edition. The tenant default (L3) overrides the edition default for a specific tenant. The facility default (L4) overrides the tenant default for a specific facility. The department default (L5) overrides the facility default for a specific department. The care team default (L6) overrides the department default for a specific care team. The user preference (L7) overrides the care team default for a specific user. The session override (L8) overrides the user preference for a specific session.

The default source hierarchy is governed by the layer model documented in SYSTEM_ARCHITECTURE Section 15.2 and CONFIGURATION_ARCHITECTURE.md Section 2. The hierarchy is deterministic: for any given context (tenant, facility, department, care team, user, session) and any given configuration key, the resolved value is uniquely determined. The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the configuration domain.

### 10.2 Inheritance Rules

Configuration inheritance follows four rules. First, the default applies unless overridden: if no layer provides a value for a key, the platform default at L1 applies. Second, more specific overrides less specific: an L4 facility value overrides an L3 tenant value, which overrides an L2 edition value, which overrides the L1 platform default. Third, override is per-key, not per-record: a facility may override selected keys of a configuration record while inheriting the remainder from the tenant layer. Fourth, override is explicit and audited: a layer that does not provide a value inherits from the next layer up, and every override is recorded in the audit trail.

The inheritance rules are enforced by the configuration service at resolution time, as documented in CONFIGURATION_ARCHITECTURE.md Section 2.2. A module that resolves configuration locally is defective because it bypasses validation, audit, and the cache invalidation mechanism. The discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) — modules depend on the configuration service's contract, not on their own resolution logic.

### 10.3 Per-Key Overridability

Not every configuration key is overridable at every layer. Some keys are fixed at a lower layer for safety, regulatory, or architectural reasons. The overridability of a key is declared in its schema, as documented in CONFIGURATION_ARCHITECTURE.md Section 2.3. The overridability class is enforced at validation time; a configuration record submitted at a layer that lacks override authority for the key is rejected by the validation engine, regardless of who submitted it.

| Overridability Class | Meaning | Example Use |
|---|---|---|
| Fixed at L1 | No layer may override; the platform default is binding | Platform invariants such as audit enablement |
| Fixed at L2 | Only the edition may set the value; lower layers inherit | Module availability per edition |
| Overridable to L3 | The tenant may override; facility and below inherit | Tenant-wide locale |
| Overridable to L4 | The facility may override; department and below inherit | Facility operating hours |
| Overridable to L5 | The department may override; care team and below inherit | Department-specific documentation templates |
| Overridable to L7 | The user may override; session inherits | User display preferences |
| Overridable at every layer | Any layer may override | Notification routing preferences |

### 10.4 Effective Configuration Composition

A tenant's effective configuration is the composition of all eight layers from L1 down to L8 for the relevant context. Composition is computed by the configuration service at evaluation time, using the inheritance and override rules defined above and the per-key overridability rules defined in Section 10.3. Consumers receive the resolved value, together with metadata that records which layer supplied the value and when that value was last modified.

Composition is request-scoped, not pre-computed, as documented in CONFIGURATION_ARCHITECTURE.md Section 2.4. The configuration service resolves values on demand, using its cache to maintain performance. Pre-computing the effective configuration for every possible context is infeasible because the context space is large and changes frequently. Request-scoped resolution also ensures that overrides applied moments ago are reflected immediately, subject to the hot-reload semantics documented in SYSTEM_ARCHITECTURE Section 15.8.

### 10.5 Conflict Detection and Resolution

Where two configuration records at the same layer purport to provide a value for the same key in the same scope, the conflict is detected at validation time, not at evaluation time, as documented in CONFIGURATION_ARCHITECTURE.md Section 2.5. The conflict is resolved by, in order: explicit precedence rules declared in the configuration schema; recency, where the schema does not specify precedence; or manual resolution, where automatic resolution is unsafe and the conflict is surfaced to an administrator. A configuration that produces an unresolvable conflict is rejected at submission, before it can affect runtime behaviour.

Conflict detection extends to indirect conflicts. Two records that are individually valid may produce an inconsistent effective configuration when composed — for example, a facility-level record that, combined with a tenant-level record, leaves a workflow unable to reach a terminal state. The semantic validation rule category described in Section 11 catches such indirect conflicts at validation time. Conflicts that escape detection at validation time and surface at evaluation time are defects in the validation engine and are remediated as such.

---

## 11. Configuration Validation Rules

### 11.1 Validation Rule Categories

Every configuration change in Ibn Hayan is validated before it is applied. Validation covers five rule categories, as documented in SYSTEM_ARCHITECTURE Section 15.4 and elaborated in CONFIGURATION_ARCHITECTURE.md Section 7. The five categories are: Structural (V1), Referential (V2), Semantic (V3), Contextual (V4), and Regulatory (V5). Each category covers a distinct aspect of configuration integrity; together they form the platform's complete validation framework.

| Rule Category | Code | Description | Example |
|---|---|---|---|
| Structural | V1 | Configuration conforms to the schema (types, required fields, formats) | A configuration value of "thirty" for an integer key is rejected |
| Referential | V2 | Configuration references resolve (e.g., a referenced module exists, a referenced role is defined) | A configuration that references a non-existent role is rejected |
| Semantic | V3 | Configuration is internally consistent (e.g., a workflow's steps form a valid graph) | A workflow configuration with an unreachable terminal state is rejected |
| Contextual | V4 | Configuration is consistent with its scope (e.g., a facility-level configuration does not contradict a tenant-level invariant) | A facility configuration that contradicts a tenant-level regulatory invariant is rejected |
| Regulatory | V5 | Configuration is consistent with the regulatory framework in force for the tenant's region | A configuration that violates a regional regulatory requirement is rejected |

### 11.2 Validation Enforcement

A configuration that fails validation is not applied. The validation failure is reported to the configurator with diagnostic information. Validation failures are auditable; the failure is recorded in the audit trail with the configuration, the rule category that failed, the diagnostic information, and the configurator. The validation enforcement discipline is the architectural expression of Principle P13 (Auditability as Primitive) applied to the configuration domain.

Validation is structural, not advisory. A module that applies configuration without validation is defective; the platform's posture is that all configuration is validated before application. The configuration service is the single enforcement point for all configuration across all bounded contexts, ensuring consistent enforcement and consistent audit. This centralization is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) — bounded contexts depend on the configuration service's validation contract, not on their own validation logic.

### 11.3 Structural Validation (V1)

Structural validation verifies that a configuration record conforms to the schema declared for the configuration key. The validation covers value types (the value is of the declared type), required fields (required fields are present), formats (values conform to declared formats, such as date formats, currency codes, and locale identifiers), and value constraints (values satisfy declared constraints, such as minimum, maximum, and length). A record that fails structural validation is rejected with the failing field identified.

Structural validation is the first line of defence against configuration defects. A record that fails structural validation cannot be interpreted by the consuming module; applying it would produce undefined behaviour. The discipline is the architectural expression of Principle P14 (Simplicity Over Complexity) — a structurally valid configuration is simpler to interpret, audit, and evolve than a structurally invalid one. The discipline is also the structural mechanism by which the platform's configuration surface remains coherent: structural validation ensures that all configuration records conform to the platform's schema system.

### 11.4 Referential Validation (V2)

Referential validation verifies that a configuration record's references resolve. The validation covers references to other configuration keys, references to bounded contexts, references to modules, references to roles, references to workflows, and references to external systems. A record that fails referential validation is rejected with the unresolved reference identified.

Referential validation is the structural mechanism by which the platform's configuration surface remains connected. A configuration that references a non-existent module produces undefined behaviour when the consuming module attempts to resolve the reference; the validation prevents this. The discipline is the architectural expression of Principle P4 (Loose Coupling, High Cohesion) — configuration references are explicit and validated, not implicit and assumed.

### 11.5 Semantic Validation (V3)

Semantic validation verifies that a configuration record is internally consistent. The validation covers workflow step graphs (the graph is valid, with all steps reachable and all terminal states reachable from all non-terminal states), calculation dependency graphs (the graph is acyclic, with all dependencies resolvable), rule conditions (the conditions are well-formed, with all referenced values available), and template structures (the templates are well-formed, with all referenced fields available). A record that fails semantic validation is rejected with the inconsistency identified.

Semantic validation is the structural mechanism by which the platform's configuration surface remains coherent. A workflow configuration with an invalid step graph may fail to reach a terminal state, leaving a patient in an indeterminate state; the validation prevents this. The discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the configuration validation domain.

### 11.6 Contextual and Regulatory Validation (V4, V5)

Contextual validation verifies that a configuration record is consistent with its scope. The validation covers layer-scope consistency (a facility-level record does not contradict a tenant-level invariant), specialization consistency (a specialty-specific record does not contradict a tenant-wide specialty configuration), and temporal consistency (a record's effective period does not conflict with another record's effective period at the same layer). Regulatory validation verifies that a configuration record is consistent with the regulatory framework in force for the tenant's region. The validation covers regional regulatory requirements (a record complies with the regional regulatory framework), regional clinical coding requirements (a record uses the regional clinical coding system where required), and regional reporting requirements (a record produces the regional reporting output where required).

The two validation categories are the structural mechanism by which the platform's configuration surface remains compliant across regions. A configuration that violates a regional regulatory requirement may produce regulatory exposure for the tenant; the validation prevents this. The discipline is the architectural expression of Principle P17 (Regional Adaptation Without Forking) applied to the configuration validation domain.

---

## 12. Configuration Change Management

### 12.1 Change Lifecycle

Configuration changes in Ibn Hayan follow a documented lifecycle, as elaborated in CONFIGURATION_ARCHITECTURE.md Section 8. The lifecycle has six stages: Draft (the change is being prepared), Validating (the change is being validated), Validated (the change has passed validation), Applied (the change has been applied to the configuration store), Rejected (the change failed validation and was not applied), and RolledBack (the change was applied and subsequently reversed). Each stage transition is recorded in the audit trail, with the transition's actor, timestamp, and rationale documented.

The change lifecycle is the structural mechanism by which the platform's configuration changes are managed in a controlled manner. A change that bypasses the lifecycle may produce undefined behaviour, may compromise clinical safety, or may produce regulatory exposure. The discipline is the architectural expression of Principle P7 (Documented Before Implemented) and Principle P13 (Auditability as Primitive) applied to the configuration change domain.

### 12.2 Change Approval

Configuration changes require approval before application to production. The approval authority is determined by the change's scope and impact. Changes that affect clinical safety (for example, a change to a clinical workflow definition) require Architecture Council ratification through an ADR. Changes that affect operational behaviour (for example, a change to a notification template) require tenant administrator approval. Changes that affect user preferences (for example, a change to a user's notification preferences) require the user's own approval. The approval discipline is documented in Section 8 of BUSINESS_RULES.md.

The change approval discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the configuration change domain. A change that affects clinical safety and is applied without approval may compromise patient safety; the platform's posture is that such changes require explicit approval before application. The discipline is also the structural mechanism by which the platform's configuration changes are governed: every change has a traceable approver, and every approver's authority is recorded.

### 12.3 Sandbox Testing

Configuration changes are tested in a configuration sandbox before application to production, in keeping with the configuration sandbox discipline documented in SYSTEM_ARCHITECTURE Section 15.7 and CONFIGURATION_ARCHITECTURE.md Section 8.5. The sandbox is a non-production tenant that inherits from the production tenant's configuration, ensuring that sandbox testing reflects production reality. The change is applied to the sandbox, the validation is run, and the change's behaviour is observed in the sandbox before the change is applied to production.

The sandbox testing discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the configuration change domain. A change that is applied to production without sandbox testing may compromise clinical safety; the platform's posture is that configuration changes are tested in a sandbox before application to production, except for emergency changes that follow a documented expedited pathway. The discipline is the structural mechanism by which the platform's configuration changes maintain their safety posture across the platform's deployment spectrum.

### 12.4 Configuration Promotion

Configuration changes are promoted from sandbox to production through a documented promotion process. The promotion request includes the change, the sandbox test results, the approval record, and the promotion schedule. The promotion is executed by the configuration service, with the change applied to production at the scheduled time. The promotion is recorded in the audit trail, with the promotion's actor, timestamp, and rationale documented.

The promotion discipline is the structural mechanism by which the platform's configuration changes are coordinated across the platform's deployment spectrum. A change that is promoted without coordination may produce inconsistent behaviour across facilities or departments; the platform's posture is that changes are promoted through a documented process. The discipline is the architectural expression of Principle P5 (Consistency Over Availability for Clinical Data) applied to the configuration promotion domain.

### 12.5 Configuration Rollback

Configuration changes can be rolled back to any prior version, with the rollback itself versioned and auditable, as documented in SYSTEM_ARCHITECTURE Section 15.5. The rollback is initiated by an authorized role, with the rollback's rationale documented. The rollback is executed by the configuration service, with the prior version restored and the rollback recorded in the audit trail. The rollback discipline is the architectural expression of Principle P6 (Reversibility Over Permanence) applied to the configuration change domain.

The rollback discipline ensures that the platform's configuration changes are recoverable. A change that produces undesired behaviour can be reversed without engineering intervention, with the reversal recorded for audit. The discipline is also the structural mechanism by which the platform's configuration changes are safe: a change that produces clinical safety concerns can be reversed immediately, with the reversal documented for review. The discipline is the architectural expression of Principle P1 (Healthcare Safety Overrides All Others) applied to the configuration rollback domain.

### 12.6 Configuration Audit Trail

Every configuration change is recorded in the audit trail, including the configurator, the time, the scope, the previous value, the new value, and the validation result, as documented in SYSTEM_ARCHITECTURE Section 15.6 and CONFIGURATION_ARCHITECTURE.md Section 12. Configuration audit records are immutable and are the basis for compliance reporting and for incident investigation. Configuration audit is distinct from operational audit (SYSTEM_ARCHITECTURE Section 27): operational audit records what users did; configuration audit records how the platform was configured to behave. Both are required for accountability, and both are governed by Principle P13 (Auditability as Primitive).

The configuration audit trail discipline ensures that the platform's configuration history is recoverable indefinitely. A question about why the platform behaved in a particular way at a particular time can be answered by examining the configuration audit trail at that time. The discipline is also the structural mechanism by which the platform's configuration changes are compliant: regulators' questions about configuration can be answered definitively by examining the configuration audit trail. The discipline is the architectural expression of Principle P18 (Decade-Horizon Viability) applied to the configuration audit domain.

---

## 13. Related Documents

### 13.1 Upstream Canonical Documents

This document elaborates the following canonical documents. Where this document and a canonical document appear to conflict, the canonical document prevails.

| Document | Section | Relationship |
|---|---|---|
| PRODUCT_BIBLE.md | Section 6 (Design Principles) | D-2 (Configuration Before Customization), D-4 (Simplicity Without Sacrificing Power), D-10 (Accountability) govern configuration posture |
| PRODUCT_BIBLE.md | Section 22 (Configuration-Driven Philosophy) | Configuration is the platform's primary adaptation mechanism |
| PRODUCT_BIBLE.md | Section 25 (Localization Strategy) | Regional configuration overlays |
| PRODUCT_BIBLE.md | Section 31 (Security Philosophy) | Configuration authorization and audit |
| SYSTEM_ARCHITECTURE.md | Section 4 (Architectural Principles) | P1 (Healthcare Safety), P2 (Configuration Before Customization), P3 (One Platform), P4 (Loose Coupling), P5 (Consistency), P7 (Documented), P13 (Auditability), P14 (Simplicity), P17 (Regional Adaptation), P18 (Decade-Horizon) govern configuration posture |
| SYSTEM_ARCHITECTURE.md | Section 7 (Domain-Driven Architecture) | Bounded contexts to which configuration is bound |
| SYSTEM_ARCHITECTURE.md | Section 8 (Configuration-Driven Architecture) | Configuration as architectural concern |
| SYSTEM_ARCHITECTURE.md | Section 15 (Configuration Strategy) | Eight-layer model, five validation rule categories, sandbox, hot-reload |
| SYSTEM_ARCHITECTURE.md | Section 16 (Workflow Engine Philosophy) | Workflow configuration |
| SYSTEM_ARCHITECTURE.md | Section 27 (Audit Architecture) | Configuration audit |
| CONFIGURATION_ARCHITECTURE.md | All sections | Implementation-grade elaboration; prevails over this document where they appear to overlap |
| ADR-001 (Configuration-Driven Architecture) | — | Configuration as architectural commitment |

### 13.2 Sibling Domain Documents

This document is one of eight domain reference documents under `docs/03_DOMAIN/`. The sibling documents are listed below. Where a sibling document references configuration, the reference is to this document.

| Document | Relationship to Configuration |
|---|---|
| TERMINOLOGY.md | Terminology artefacts are configuration artefacts governed by the configuration lifecycle |
| ENUMS.md | Enum value lists are configuration artefacts; enum metadata is registered through configuration |
| STATUS_CODES.md | Status code transition maps are configuration artefacts |
| BUSINESS_RULES.md | Business rules are configuration artefacts governed by the configuration lifecycle |
| CALCULATIONS.md | Calculation parameters are configuration artefacts |
| CLINICAL_WORKFLOWS.md | Workflow definitions are configuration artefacts |
| FEATURE_FLAGS.md | Feature flag configuration is distinct from continuous configuration; flag lifecycle is governed separately |

### 13.3 Downstream Documents

This document is binding on the following downstream documents. A downstream document that conflicts with this document is defective.

| Document | Binding Aspect |
|---|---|
| docs/07_MODULES/*.md | Module-level configuration surface and usage |
| docs/04_INTEGRATIONS/*.md | Integration configuration and anticorruption layer |
| docs/06_DATABASE/*.md | Configuration storage and indexing |
| docs/09_DEPLOYMENT/*.md | Configuration service deployment topology |
| docs/03_SECURITY/*.md | Configuration authorization and audit |

### 13.4 Document Governance

This document is governed by the Architecture Council and is ratified through the ADR process. The document is reviewed quarterly, with off-cycle revision when a configuration amendment, a layer model change, a validation rule change, or an ADR requires. Amendments are recorded in the CHANGELOG with the version increment. The document's authority level, conflict resolution posture, and amendment mechanism are recorded in the metadata table at the head of this document and are not modified without Architecture Council ratification. Ibn Hayan's domain configuration catalogue is a structural element of the platform's contract surface and is treated with the discipline that structural elements warrant.
