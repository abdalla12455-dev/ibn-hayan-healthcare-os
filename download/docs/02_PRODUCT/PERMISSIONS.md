# Ibn Hayan Healthcare Operating System — Permissions

| Field | Value |
|---|---|
| Document Title | Permissions |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Product Elaboration — Permission Model |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a permission framework amendment is ratified |
| Audience | Product leadership, security and compliance teams, implementation consultants, configuration architects, customer system administrators, auditors and inspectors |
| Scope | Permission philosophy, permission model overview, granularity levels, scopes, categories, inheritance, composition, override rules, resolution algorithm, validation, audit, lifecycle, default templates, governance |
| Out of Scope | Implementation details, source code, authorization engine internals, permission check API contracts, caching mechanism internals |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. Permission model definitions in this document elaborate Section 21 of PRODUCT_BIBLE and do not override the permission philosophy stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (stub with section placeholders only) |

---

## Table of Contents

1. Permission Overview
2. Permission Model
3. Permission Categories
4. Permission Granularity
5. Role-Permission Mapping
6. Resource-Level Permissions
7. Action-Level Permissions
8. Field-Level Permissions
9. Permission Inheritance
10. Permission Management
11. Permission Evaluation
12. Permission Caching
13. Related Documents

---

## 1. Permission Overview

### 1.1 Purpose of the Permission Model

The permission model defines how Ibn Hayan governs what users can do. Permissions are not a feature; they are a primitive that governs every action of consequence, as stated in `PRODUCT_BIBLE.md` Section 21.1. The model is the basis for the permission framework implemented in the Identity & Access module (M14) and is the operational expression of Design Principle D-10 (Observable, Auditable, Accountable). The permission model is the most consequential control surface in the platform; every clinical, operational, financial, and administrative action passes through the permission framework before execution. This document elaborates Section 21 of `PRODUCT_BIBLE.md` and defines the model's structure, granularity, scope, inheritance, composition, and governance.

### 1.2 Permission Posture

Ibn Hayan's permission posture is healthcare-grade by design. Permissions are defined at the action level on resources, not at the page level or the feature level, because page-level and feature-level permissions are too coarse for healthcare operations and too unstable across user-interface evolution, as stated in `PRODUCT_BIBLE.md` Section 21.2. Permissions are scoped, not global; a user may have read permission on patient records within their facility without having read permission on patient records in another facility, per Section 21.4 of `PRODUCT_BIBLE.md`. Permissions are assigned through roles, not directly to users; direct user-permission assignment is forbidden because it bypasses the role framework and produces unmanageable permission sprawl, per Section 21.3.

### 1.3 Permission and Healthcare Safety

The permission model is the operational expression of Ibn Hayan's commitment to healthcare safety (Principle P-1). Permissions prevent unauthorized access to patient data, prevent unauthorized execution of clinical actions, and prevent unauthorized modification of clinical configuration. Permission failures are treated as patient safety events and are investigated with the rigour that patient safety demands. The permission model includes specific safeguards for high-consequence actions: emergency access (Section 6 of this document) for break-glass scenarios, segregation of duties (Section 9) for conflict prevention, and immutable audit (Section 11) for accountability.

### 1.4 Permission Reading Order

This document is organized as both a linear read and a reference. Readers new to Ibn Hayan's permission model should read Sections 1, 2, 4, and 9 to understand the overview, model, granularity, and inheritance. Readers implementing a permission configuration should read Sections 3, 5, 6, 7, and 8 plus Section 10. Readers auditing permission use should read Sections 11 and 12. Section 13 lists the upstream and downstream documents that this model references and that elaborate permission-specific concerns.

---

## 2. Permission Model

### 2.1 Model Overview

The Ibn Hayan permission model is a role-based access control (RBAC) model with action-level granularity, resource-level scope, and hierarchical inheritance. The model is implemented by the Identity & Access module (M14) and is governed by the permission philosophy stated in `PRODUCT_BIBLE.md` Section 21. The model's core constructs are principals (users and integration accounts), roles (named bundles of permissions), permissions (action-level grants on resources), resources (the entities permissions act on), and scopes (the organizational context within which permissions apply). The constructs and their relationships are documented in this section; the per-construct detail is in Sections 3 through 9.

### 2.2 Principal Types

The model recognizes two principal types: human principals (users) and non-human principals (integration accounts). Human principals are assigned roles based on their operational responsibilities, as documented in `USER_ROLES.md`. Non-human principals are assigned narrowly scoped roles based on the integration they serve, as documented in `USER_ROLES.md` Section 8. Both principal types are subject to the same permission framework; the distinction is in role assignment patterns, not in permission semantics. A non-human principal's permissions are scoped as narrowly as the integration allows; broad permissions on non-human principals are a configuration defect and are corrected through role refinement.

### 2.3 Permission Construct

A permission is a (action, resource) pair that grants a specific action on a specific resource. Permissions are not defined at the page level or the feature level, per `PRODUCT_BIBLE.md` Section 21.2. The action dimension is small and stable (read, write, execute, administer); the resource dimension is large and grows as the platform's surface grows. The (action, resource) pair produces a permission matrix that is large but stable, as stated in Section 21.2 of `PRODUCT_BIBLE.md`. The matrix is large because every (action, resource) pair is a permission; it is stable because actions and resources evolve slowly, even as the platform's surface evolves quickly.

### 2.4 Role Construct

A role is a named bundle of permissions, as stated in `PRODUCT_BIBLE.md` Section 20. Roles are the unit of permission assignment; direct user-permission assignment is forbidden, per Section 21.3 of `PRODUCT_BIBLE.md`. The role catalogue comprises 14 platform-defined roles (R01 through R14) documented in `USER_ROLES.md` and supports an unlimited number of customer-defined custom roles, subject to the custom role framework documented in `USER_ROLES.md` Section 12. Roles are versioned alongside the platform; role evolution is governed by the role lifecycle stated in `PRODUCT_BIBLE.md` Section 20.4.

### 2.5 Resource Construct

A resource is the entity a permission acts on. Resources include patient records, encounter records, clinical documentation, orders, results, pharmacy records, billing records, configuration records, audit records, integration accounts, and reporting views. Resources are owned by modules; the Patient module (M01) owns patient records, the Encounter module (M02) owns encounter records, and so on. Resource ownership is documented in `MODULES.md` and in the per-module documentation. Permissions on a resource are defined by the resource's owning module and are exposed through the module's contract surface.

### 2.6 Scope Construct

A scope is the organizational context within which a permission applies. Scopes are defined by the organizational hierarchy stated in `SYSTEM_ARCHITECTURE.md` Section 11 and include platform, tenant, organization unit, facility, department, and care team. A permission granted at a higher scope applies to lower scopes unless overridden; a permission granted at a lower scope does not propagate upward, per `PRODUCT_BIBLE.md` Section 21.5. Scope is critical for healthcare operations; a clinician seeing patients in clinic A does not automatically have access to patients in clinic B, even within the same organization, per Section 21.4 of `PRODUCT_BIBLE.md`.

---

## 3. Permission Categories

### 3.1 Action Categories

Permissions are categorized by the action they grant. The action categories are stated in the table below. The categories are stable; new categories are added only when the platform's surface evolves to require them, and additions are ratified by the Product Council.

| Action Category | Description | Example Resources |
|---|---|---|
| Read | View resource content without modifying it | Patient records, encounter records, audit records |
| Write | Create, update, or delete resource content | Clinical documentation, configuration records, billing records |
| Execute | Trigger an action that changes state | Order entry, claim submission, dispensing operations |
| Administer | Manage resource lifecycle and configuration | Module enablement, role assignment, integration management |

### 3.2 Resource Categories

Resources are categorized by the module that owns them and by the resource's nature. The resource categories are stated in the table below. The categories are stable; new categories are added when new modules are added to the catalogue, per the module intake process defined in `MODULES.md` Section 10.

| Resource Category | Owning Module | Example Resources |
|---|---|---|
| Clinical | M01–M05 | Patient records, encounter records, clinical documentation, orders, results, pharmacy records |
| Operational | M06–M08 | Scheduling entries, documents, notification templates |
| Financial | M09–M10 | Billing records, claims, accounting entries |
| Administrative | M11–M13 | CRM records, HR records, workforce schedules |
| Platform | M14–M19 | Identity records, configuration records, audit records, integration accounts, reporting views, localization packs |

### 3.3 Scope Categories

Permission scopes are categorized by the organizational level at which they apply. The scope categories are stated in the table below. The categories mirror the organizational hierarchy defined in `SYSTEM_ARCHITECTURE.md` Section 11.2.

| Scope Category | Code | Description | Typical Assignment Authority |
|---|---|---|---|
| Platform | SC1 | The entire Ibn Hayan platform | Ibn Hayan internal (Super Admin equivalent) |
| Tenant | SC2 | A single customer's tenant | Customer System Administrator (R13) |
| Organization Unit | SC3 | A major division within the customer | Customer System Administrator (R13) |
| Facility | SC4 | A physical or logical facility | Customer Administrator (R09) |
| Department | SC5 | A department within a facility | Customer Administrator (R09) |
| Care Team | SC6 | A care team within a department | Customer Clinical Lead (custom role) |

### 3.4 Data-Scope Categories

Permissions are further categorized by the data scope they apply to within a resource. The data-scope categories are stated in the table below. Data scope allows fine-grained access control within a resource category; for example, a physician may have read access to their own patients' records but not to all patients' records in the facility.

| Data-Scope Category | Description | Example |
|---|---|---|
| All | All data within the resource category | Compliance Officer access to all audit records |
| Cohort | A defined cohort within the resource category | Physician access to their own patient panel |
| Self | Data owned by the principal | Patient access to their own records |
| None | No access to the resource category | Default denial for non-relevant resources |

### 3.5 Category Composition

Permission categories compose to produce a complete permission grant. A complete grant specifies the action category, the resource category, the scope category, and the data-scope category. For example, a Physician role's permission to read patient records within their facility for their own patient panel composes as: action = Read, resource = Patient Records, scope = Facility, data-scope = Cohort (own panel). The composition is documented per role in the role-permission matrix in Section 5 and in the per-role documentation.

---

## 4. Permission Granularity

### 4.1 Granularity Levels

Permission granularity is the level of detail at which permissions are defined. Ibn Hayan defines permissions at four granularity levels, stated in the table below. The levels are layered; a higher level of granularity implies the lower levels are also defined.

| Granularity Level | Description | Example |
|---|---|---|
| Resource-level | Permission to act on a resource category as a whole | Read on Patient Records |
| Action-level | Permission to perform a specific action on a resource | Write on Clinical Documentation |
| Field-level | Permission to act on specific fields within a resource | Read on Behavioral Health Notes field within Patient Record |
| Record-level | Permission to act on specific records within a resource | Read on Patient Record for patient #12345 |

### 4.2 Granularity and Stability

Granularity levels have different stability profiles. Action-level and resource-level granularity are highly stable; actions and resources evolve slowly, even as the platform's surface evolves quickly, per `PRODUCT_BIBLE.md` Section 21.2. Field-level and record-level granularity are less stable; fields evolve as documentation templates evolve, and records evolve as patients and encounters are created. The permission framework accommodates this stability differential through layered evaluation: action-level and resource-level checks are evaluated first, with field-level and record-level checks evaluated only when the higher-level checks pass.

### 4.3 Granularity and Performance

Permission granularity has performance implications. Higher granularity produces more permission checks per action, which produces more evaluation overhead. Ibn Hayan's permission framework is designed to maintain sub-second practitioner-felt latency for routine actions, per `PRODUCT_BIBLE.md` Section 24.5, even with high granularity. The framework achieves this through permission caching (Section 12) and through layered evaluation that short-circuits higher-level checks when they fail. Performance is monitored continuously through operational telemetry; degradation is treated as a strategic risk and addressed through architectural or operational response.

### 4.4 Granularity and Healthcare Operations

Permission granularity is calibrated for healthcare operations, not for general enterprise operations. Healthcare operations require fine-grained access control because of patient privacy regulations, behavioral health record segregation, controlled substance tracking, and segregation of duties. The platform's granularity is set to meet healthcare requirements; customers in less regulated industries may find the granularity excessive, but the granularity is non-negotiable because it is the operational expression of Principle P-1 (Healthcare First).

### 4.5 Granularity and Customization

Permission granularity is fixed at the platform level; customers cannot reduce granularity (e.g., to "page-level" permissions) through configuration. Customers can refine granularity within the framework (e.g., by defining custom field-level permissions for specialty-specific documentation fields). The boundary between fixed and customizable granularity is governed by the platform's extensibility strategy, defined in `SYSTEM_ARCHITECTURE.md` Section 22. Customers requiring granularity outside the framework are referred to the platform evolution intake process.

---

## 5. Role-Permission Mapping

### 5.1 Mapping Approach

Role-permission mapping is the assignment of permissions to roles. Mapping is governed by the role definitions stated in `USER_ROLES.md` Section 9 and may be refined by customer configuration within the framework. The mapping is documented as a matrix with roles as rows and permissions as columns; the matrix is large because every (action, resource) pair is a permission, per `PRODUCT_BIBLE.md` Section 21.2. The matrix is the canonical reference for what each role can do; the per-role documentation provides the full matrix at the action-resource level.

### 5.2 Mapping Summary

The table below summarizes the role-permission mapping at the resource-category level. The summary is the canonical quick-reference; the full mapping at the action-resource level is documented in the per-role documentation under `docs/11_MODULES/M14_IdentityAccess/`. A checkmark indicates the role has at least one permission in the resource category; a dash indicates no permissions.

| Role | Patient | Encounter | Clinical Doc | Orders/Results | Pharmacy | Scheduling | Documents | Notifications | Billing | Accounting | CRM | HR | Workforce | Config | Audit | Integration | Reporting |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R01 Physician | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | ✓ |
| R02 Nurse | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | – | ✓ |
| R03 Pharmacist | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | – | – | – | – | – | – | – | – | ✓ |
| R04 Technician | ✓ | ✓ | – | ✓ | – | – | ✓ | – | – | – | – | – | – | – | – | – | ✓ |
| R05 Allied Health | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | – | ✓ |
| R06 Receptionist | ✓ | ✓ | – | – | – | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | ✓ |
| R07 Scheduler | ✓ | ✓ | – | – | – | ✓ | – | ✓ | – | – | – | – | – | – | – | – | ✓ |
| R08 Biller | ✓ | ✓ | – | – | – | – | ✓ | ✓ | ✓ | – | – | – | – | – | – | – | ✓ |
| R09 Administrator | ✓ | ✓ | – | – | – | ✓ | ✓ | ✓ | ✓ | – | – | – | – | ✓ | ✓ | – | ✓ |
| R10 Compliance Officer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| R11 HR Manager | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | – | – | ✓ |
| R12 Executive | ✓ | ✓ | – | – | – | – | – | – | ✓ | ✓ | – | – | – | ✓ | ✓ | – | ✓ |
| R13 System Administrator | – | – | – | – | – | – | – | – | – | – | – | – | – | ✓ | ✓ | ✓ | ✓ |
| R14 Integration Account | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | – | – | ✓ | – |

### 5.3 Mapping and Edition

Role-permission mapping is the same across editions; what differs between editions is which roles are available. The Essential edition supports the roles required for primary care practice; the Professional edition adds administrative roles; the Enterprise edition supports the full role catalogue. Edition-specific role availability is documented in `EDITIONS.md` Section 7 and in `USER_ROLES.md` Section 10.3.

### 5.4 Mapping and Customization

Customers may customize role-permission mapping within the role composition framework, as documented in `USER_ROLES.md` Section 12. Custom roles compose existing permissions; they do not create new permissions. A custom role that requires a permission not in the platform's permission catalogue is not possible without platform extension. Customization is subject to segregation-of-duty rules; a custom role that would create a prohibited permission combination is rejected at definition time.

### 5.5 Mapping Audit

Role-permission mapping changes are auditable. The audit trail captures the role, the permission, the previous mapping, the new mapping, the configurator, and the time. Mapping audit records are immutable and are the basis for compliance reporting and for incident investigation. Mapping audit is distinct from operational audit; mapping audit records how the platform was configured to grant permissions, while operational audit records what users did with their granted permissions.

---

## 6. Resource-Level Permissions

### 6.1 Resource-Level Definition

Resource-level permissions grant an action on a resource category as a whole. Resource-level permissions are the coarsest granularity in the permission framework; they are the starting point for permission evaluation and are evaluated before field-level and record-level checks. Resource-level permissions are typically used for broad access grants (e.g., a Compliance Officer's read access to all audit records) or for default denials (e.g., a Biller's lack of access to clinical documentation).

### 6.2 Resource-Level Examples

The table below provides illustrative examples of resource-level permissions. The examples are representative; the full resource-level permission set is documented in the per-role documentation.

| Role | Action | Resource | Scope | Data Scope |
|---|---|---|---|---|
| R01 Physician | Read | Patient Records | Facility | Cohort (own panel) |
| R02 Nurse | Read | Patient Records | Facility | Cohort (assigned patients) |
| R10 Compliance Officer | Read | Audit Records | Tenant | All |
| R12 Executive | Read | Patient Records (summary) | Customer | All (aggregated) |
| R13 System Administrator | Read | Configuration Records | Tenant | All |

### 6.3 Resource-Level and Default Denial

The default for resource-level permissions is denial. A role that does not have an explicit grant for a resource does not have access to that resource, regardless of the role's other permissions. Default denial is a primitive of the permission framework and is non-negotiable; it is the operational expression of the least-privilege posture stated in `PRODUCT_BIBLE.md` Section 21.4. Customers cannot override default denial through configuration; explicit grants are required for any access.

### 6.4 Resource-Level and Emergency Access

Resource-level permissions interact with emergency access (break-glass) for scenarios where a user needs access to a resource they do not have routine permission for. Emergency access is documented in Section 21.6 of `PRODUCT_BIBLE.md` and is governed by the following principles: explicit (the user takes a deliberate action to invoke), audited (every emergency access is recorded), time-bounded (emergency access expires automatically), and reviewed (emergency access events are reviewed by compliance officers). Emergency access is not a routine workflow; it is a controlled exception. Frequent use of emergency access indicates a permission configuration defect and is investigated by the customer's compliance team.

### 6.5 Resource-Level Audit

Every resource-level permission check is recorded in the audit trail, per `PRODUCT_BIBLE.md` Section 21.7. The audit record includes the user, the action, the resource, the permission decision, and the scope context. Resource-level audit records are the basis for compliance reporting, for incident investigation, and for permission configuration review. Audit records are immutable; they cannot be modified or deleted, even by system administrators. The immutability is a platform-level guarantee, not a configuration choice, and is a direct consequence of Design Principle D-10.

---

## 7. Action-Level Permissions

### 7.1 Action-Level Definition

Action-level permissions grant a specific action on a resource. Action-level permissions are the primary granularity in the permission framework; they are the granularity at which most permission checks occur. The action categories are read, write, execute, and administer, as documented in Section 3.1. Action-level permissions compose with resource-level permissions: a role must have both the resource-level grant and the action-level grant for an action to be permitted.

### 7.2 Action-Level Examples

The table below provides illustrative examples of action-level permissions. The examples are representative; the full action-level permission set is documented in the per-role documentation.

| Role | Action | Resource | Example Use |
|---|---|---|---|
| R01 Physician | Write | Clinical Documentation | Physician documents an encounter note |
| R02 Nurse | Execute | Medication Administration Order | Nurse administers a medication per physician order |
| R03 Pharmacist | Execute | Dispensing Operation | Pharmacist dispenses a medication per prescription |
| R06 Receptionist | Write | Patient Registration | Receptionist registers a new patient |
| R08 Biller | Execute | Claim Submission | Biller submits a claim to an external payer |
| R13 System Administrator | Administer | Module Enablement | System Administrator enables a module in the tenant |

### 7.3 Action-Level and Workflow Integration

Action-level permissions integrate with the workflow engine. Workflow steps that change state require an action-level permission; the workflow engine verifies the principal's permission before executing the step. A principal without the required permission cannot execute the workflow step; the workflow is paused pending authorization. This integration ensures that the workflow engine does not bypass the permission framework, in keeping with the platform's commitment to permission-controlled execution.

### 7.4 Action-Level and Clinical Decision Support

Action-level permissions interact with clinical decision support. Certain actions (e.g., ordering a high-risk medication, ordering a contrast imaging study) require clinical decision support review before execution. The clinical decision support review is a workflow step that requires its own action-level permission; a principal without the review permission cannot authorize the action. This layered permission model ensures that high-risk actions receive appropriate review, in keeping with the platform's commitment to clinical safety.

### 7.5 Action-Level Audit

Every action-level permission check is recorded in the audit trail, per `PRODUCT_BIBLE.md` Section 21.7. The audit record includes the user, the action, the resource, the permission decision, and the scope context. Action-level audit records are particularly consequential for clinical and financial actions; they are the basis for clinical incident investigation and for financial compliance reporting. Action-level audit records are immutable and are subject to extended retention periods as required by regional regulatory frameworks.

---

## 8. Field-Level Permissions

### 8.1 Field-Level Definition

Field-level permissions grant an action on specific fields within a resource. Field-level permissions are the second-finest granularity in the permission framework; they are evaluated after resource-level and action-level checks pass. Field-level permissions are typically used for sensitive data categories (e.g., behavioral health notes, HIV status, substance use history) that require stricter access control than the resource as a whole.

### 8.2 Field-Level Examples

The table below provides illustrative examples of field-level permissions. The examples are representative; the full field-level permission set is documented in the per-module documentation.

| Field | Resource | Default Permission | Rationale |
|---|---|---|---|
| Behavioral health notes | Patient Record | Read restricted to behavioral health roles | Behavioral health record segregation per regional regulatory frameworks |
| HIV status | Patient Record | Read restricted to treating physician | Sensitive diagnosis with regulatory access restrictions |
| Substance use history | Patient Record | Read restricted to treating physician and substance use treatment roles | Sensitive history with regulatory access restrictions |
| Genetic information | Patient Record | Read restricted to treating physician and genetic counsellor | Sensitive information with regulatory access restrictions |
| Minors' confidential information | Patient Record | Read restricted to treating physician | Confidential information with age-based access restrictions |
| Controlled substance prescription history | Pharmacy Record | Read restricted to prescribing physician and pharmacist | Controlled substance tracking per regulatory frameworks |

### 8.3 Field-Level and Behavioral Health Segregation

Field-level permissions are the mechanism for behavioral health record segregation, as referenced in `CLINIC_TYPES.md` Section 3.6. Behavioral health notes are segregated from the general medical record through field-level permissions; a physician without behavioral health field-level permissions cannot access behavioral health notes through any surface, including search, list, or direct navigation. The segregation is enforced at the permission framework layer, not at the user-interface layer; the segregation cannot be bypassed through user-interface manipulation.

### 8.4 Field-Level and Customization

Field-level permissions can be customized within the framework. Customers may define custom field-level permissions for specialty-specific documentation fields, subject to the validation rules stated in `SYSTEM_ARCHITECTURE.md` Section 15.4. Custom field-level permissions are tenant-scoped and are subject to the same lifecycle governance as platform-defined field-level permissions. Customization does not allow removal of platform-defined field-level permissions; the platform-defined permissions are primitive controls for healthcare operations and are non-negotiable.

### 8.5 Field-Level Audit

Every field-level permission check is recorded in the audit trail, per `PRODUCT_BIBLE.md` Section 21.7. Field-level audit records are particularly consequential for sensitive data categories; they are the basis for privacy incident investigation and for regulatory compliance reporting. Field-level audit records are immutable and are subject to extended retention periods as required by regional regulatory frameworks. The audit trail captures not only the permission decision but also the field accessed and the data-scope category applied.

---

## 9. Permission Inheritance

### 9.1 Inheritance Model

Permission inheritance is governed by the organizational hierarchy defined in `SYSTEM_ARCHITECTURE.md` Section 11 and is implemented per `PRODUCT_BIBLE.md` Section 21.5. A permission granted at a higher organizational level applies to lower levels unless overridden; a permission granted at a lower level does not propagate upward. Inheritance is explicit, documented, and auditable. Inheritance is not automatic; a role assigned at a higher level does not automatically propagate to lower levels. The role must be explicitly scoped to apply at lower levels. This prevents accidental over-permissioning through inheritance misconfiguration.

### 9.2 Inheritance Levels

The inheritance levels mirror the organizational hierarchy levels stated in `SYSTEM_ARCHITECTURE.md` Section 11.2. The levels are platform (highest), tenant, organization unit, facility, department, and care team (lowest). A permission granted at the tenant level applies to all organization units, facilities, departments, and care teams within the tenant. A permission granted at the facility level applies to all departments and care teams within the facility. Inheritance is layered; each level inherits from the level above unless explicitly overridden.

### 9.3 Override Rules

Inheritance overrides are governed by the following rules, stated in `PRODUCT_BIBLE.md` Section 21.5. Overrides are explicit, validated, versioned, and auditable. Not all permissions are overridable at all levels; some permissions are fixed at higher levels for safety or regulatory reasons. The override rules are normative; deviations are defects and are corrected through the amendment mechanism.

| Override Type | Description | Example |
|---|---|---|
| Restrictive override | A lower level reduces the scope of a higher-level grant | Facility restricts a tenant-level read grant to department-level only |
| Expansive override (prohibited) | A lower level expands the scope of a higher-level grant | Not permitted; expansive overrides are rejected at validation time |
| Field-level override | A lower level adds field-level restrictions to a higher-level resource grant | Department adds behavioral health field-level restrictions |
| Cohort override | A lower level narrows the cohort for a higher-level data-scope grant | Care team narrows a facility-level all-patients grant to care-team-patients only |

### 9.4 Inheritance and Multi-Tenant Isolation

Permission inheritance is scoped to a single tenant per the multi-tenant isolation rules stated in `SYSTEM_ARCHITECTURE.md` Section 10.3. A permission granted at the tenant level in tenant A does not apply to tenant B; inheritance does not cross tenant boundaries. Cross-tenant permission inheritance is forbidden and is rejected by the permission framework at assignment time. The single-tenant scoping of inheritance is a primitive of the platform's multi-tenant architecture and is non-negotiable.

### 9.5 Inheritance Audit

Permission inheritance is auditable. The audit trail captures the permission, the level at which it was granted, the level at which it was overridden (if applicable), the override type, the configurator, and the time. Inheritance audit records are immutable and are the basis for compliance reporting and for incident investigation. Inheritance audit is critical for understanding why a principal has (or does not have) a specific permission at a specific time; the audit trail allows reconstruction of the full inheritance chain for any permission decision.

---

## 10. Permission Management

### 10.1 Management Activities

Permission management is the set of activities that maintain the permission framework's operational health. The activities include permission definition (defining new permissions when the platform's surface evolves), permission assignment (assigning permissions to roles), permission scope management (managing the scope at which permissions apply), permission override management (managing inheritance overrides), and permission review (periodic review of permission configuration for continued appropriateness). Each activity is governed by documented criteria and is recorded in the platform's audit trail.

### 10.2 Management Authority

Permission management authority is governed by the role assignment authority stated in `USER_ROLES.md` Section 11.2. The System Administrator role (R13) has authority to manage permission configuration within the tenant; the Administrator role (R09) has authority to manage permission configuration within the administrator's facility. Management authority is documented per role and is enforced by the permission framework at management time. Unauthorized management attempts are rejected and are recorded in the audit trail for compliance review.

### 10.3 Management Workflow

Permission management follows a structured workflow to ensure that permission changes are deliberate, validated, and auditable. The workflow is stated in the table below. The workflow is the same across permission management activities, with stage complexity scaled to the change's risk.

| Stage | Code | Description |
|---|---|---|
| Change request | P1 | Authorized requester initiates the permission change |
| Sandbox preparation | P2 | Change prepared in sandbox tenant for testing |
| Validation | P3 | Change validated through the configuration validation framework |
| Approval | P4 | Change approved by the appropriate authority (per change risk) |
| Production application | P5 | Change applied to production tenant |
| Post-change verification | P6 | Change verified in production; expected behaviour confirmed |
| Audit record | P7 | Change recorded in audit trail with full context |

### 10.4 Management and Segregation of Duties

Permission management is subject to segregation-of-duty rules. The principal who defines a permission cannot be the principal who approves the permission's assignment; the principal who approves an assignment cannot be the principal who receives the assignment. Segregation of duties is enforced by the permission framework at management time and cannot be overridden through configuration. The segregation ensures that permission management is subject to independent oversight, in keeping with Design Principle D-10 (Observable, Auditable, Accountable).

### 10.5 Management Review

Permission configuration is reviewed periodically for continued appropriateness. Reviews are conducted by the customer's compliance team, with review frequency scaled to the permission's risk. High-risk permissions (e.g., controlled substance access, behavioral health record access) are reviewed quarterly; medium-risk permissions are reviewed semi-annually; low-risk permissions are reviewed annually. Review events are documented and are auditable. Permissions that are no longer required are revoked to maintain least-privilege posture.

---

## 11. Permission Evaluation

### 11.1 Evaluation Algorithm

Permission evaluation is the process by which the permission framework determines whether a principal is permitted to perform an action on a resource. The evaluation algorithm is layered, with each layer evaluated in sequence. The algorithm is stated below; the layers are evaluated in the order listed, with short-circuit evaluation when a layer fails.

| Layer | Evaluation | Failure Result |
|---|---|---|
| 1. Tenant isolation | Verify the principal and resource are in the same tenant | Deny (cross-tenant access forbidden) |
| 2. Resource-level | Verify the principal has a resource-level grant for the resource | Deny (default denial) |
| 3. Action-level | Verify the principal has an action-level grant for the action | Deny (action not permitted) |
| 4. Scope | Verify the principal's scope includes the resource's scope | Deny (out of scope) |
| 5. Field-level | Verify the principal has field-level grants for any restricted fields | Deny (field access restricted) |
| 6. Record-level | Verify the principal's data-scope includes the specific record | Deny (record not in cohort) |
| 7. Emergency access | If layers 1–6 deny, check for active emergency access | Allow if emergency access is active; deny otherwise |

### 11.2 Evaluation Performance

Permission evaluation is designed to maintain sub-second practitioner-felt latency for routine actions, per `PRODUCT_BIBLE.md` Section 24.5. The layered algorithm with short-circuit evaluation ensures that most permission checks fail fast at the early layers, with the more expensive later layers evaluated only when the early layers pass. Performance is monitored continuously through operational telemetry; degradation is treated as a strategic risk and addressed through architectural or operational response. Permission caching (Section 12) is a critical performance optimization, particularly for the later evaluation layers.

### 11.3 Evaluation and Workflow Integration

Permission evaluation integrates with the workflow engine. Workflow steps that change state trigger a permission evaluation before execution; the workflow is paused if the evaluation denies the action. The integration ensures that the workflow engine does not bypass the permission framework, in keeping with the platform's commitment to permission-controlled execution. The integration is documented in `WORKFLOWS.md` Section 12.

### 11.4 Evaluation and Audit

Every permission evaluation is recorded in the audit trail, per `PRODUCT_BIBLE.md` Section 21.7. The audit record includes the principal, the action, the resource, the permission decision, the scope context, and the evaluation layer at which the decision was made (or the layer at which the decision failed). Evaluation audit records are the basis for compliance reporting, for incident investigation, and for permission configuration review. Evaluation audit records are immutable and are subject to extended retention periods as required by regional regulatory frameworks.

### 11.5 Evaluation Failure Handling

Permission evaluation failures are handled gracefully. The principal receives a clear message indicating that the action is not permitted, with the message scaled to the failure layer. The message does not reveal the specific permission configuration that caused the denial (to prevent permission configuration inference); it indicates only that the action is not permitted and provides guidance on the appropriate next step (e.g., contact a supervisor for emergency access). Evaluation failures are recorded in the audit trail and are reviewed periodically for patterns that indicate permission configuration defects.

---

## 12. Permission Caching

### 12.1 Caching Purpose

Permission caching is the optimization that allows the permission framework to maintain sub-second practitioner-felt latency for routine actions, per `PRODUCT_BIBLE.md` Section 24.5. Caching stores the results of permission evaluations for reuse in subsequent evaluations, reducing the need to traverse the full evaluation algorithm for every action. Caching is critical for healthcare operations, where practitioners perform many actions per encounter and where latency directly affects patient care quality.

### 12.2 Caching Strategy

The caching strategy is layered, with caches at multiple levels of the evaluation algorithm. The strategy is stated in the table below. The caches are invalidated when the underlying permission configuration changes, ensuring that caching does not produce stale permission decisions.

| Cache Level | Cached Content | Invalidation Trigger |
|---|---|---|
| Principal-role cache | Roles assigned to a principal | Role assignment or revocation |
| Role-permission cache | Permissions granted by a role | Role-permission mapping change |
| Resource-permission cache | Resource-level grants for a principal | Resource-level permission change |
| Action-permission cache | Action-level grants for a principal | Action-level permission change |
| Field-permission cache | Field-level grants for a principal | Field-level permission change |
| Scope cache | Scope assignments for a principal | Scope change |
| Emergency access cache | Active emergency access for a principal | Emergency access activation or expiration |

### 12.3 Cache Invalidation

Cache invalidation is the process by which cached permission decisions are removed when the underlying permission configuration changes. Invalidation is event-driven; when a permission configuration change is committed, the affected caches are invalidated across the platform. Invalidation is conservative; when in doubt, the cache is invalidated, and the next evaluation traverses the full algorithm. The conservative posture ensures that caching does not produce stale permission decisions, even at the cost of occasional redundant full-algorithm evaluations.

### 12.4 Cache and Multi-Tenant Isolation

Permission caches are scoped to a single tenant per the multi-tenant isolation rules stated in `SYSTEM_ARCHITECTURE.md` Section 10.3. A cache entry in tenant A is not shared with tenant B; cross-tenant cache sharing is forbidden. The single-tenant scoping of caches is a primitive of the platform's multi-tenant architecture and is non-negotiable. Cache scoping is enforced at the cache layer, not at the application layer, ensuring that cache implementation defects cannot produce cross-tenant permission leaks.

### 12.5 Cache Audit

Permission cache invalidation events are auditable. The audit trail captures the cache level, the invalidation trigger, the affected principal (if applicable), and the time. Cache audit records are used for incident investigation (e.g., when a permission decision appears to be stale) and for performance analysis (e.g., when cache hit rates are lower than expected). Cache audit records are immutable and are subject to the standard retention policy.

### 12.6 Cache Performance Monitoring

Cache performance is monitored continuously through operational telemetry. The primary cache metrics are hit rate (the percentage of evaluations served from cache), invalidation rate (the frequency of cache invalidation), and latency (the time to serve a cached evaluation). Cache metrics are reviewed quarterly. Erosion in cache hit rate is treated as a strategic risk and is addressed through architectural or operational response, in keeping with the platform's scalability posture stated in `PRODUCT_BIBLE.md` Section 24.

---

## 13. Related Documents

### 13.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 21 (Permission Philosophy) is the canonical permission philosophy; Section 20 (User Roles Overview) defines the role framework that permissions assign to; Section 22 (Configuration-Driven Philosophy) defines the configuration surface for permission customization |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 10 (Multi-Tenant Architecture) defines the tenant isolation that permissions enforce; Section 11 (Organization Hierarchy) defines the scope levels permissions operate within; Section 13 (Module Architecture) defines the Identity & Access module (M14) that implements the permission framework |

### 13.2 Downstream Documents

The following downstream documents elaborate aspects of permissions referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| User Roles | `docs/02_PRODUCT/USER_ROLES.md` | Role catalogue that permissions assign to |
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue that owns the resources permissions act on |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow engine that integrates with permission evaluation |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability by permission |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition-specific permission depth |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Per-clinic-type permission defaults |
| Module Architecture | `docs/01_ARCHITECTURE/MODULE_ARCHITECTURE.md` | Identity & Access module (M14) internals |

### 13.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Model changes — granularity additions, scope additions, category additions — are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
