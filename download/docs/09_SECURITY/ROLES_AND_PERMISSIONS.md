# Ibn Hayan Healthcare Operating System — Roles and Permissions

| Field | Value |
|---|---|
| Document Title | Roles and Permissions Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Security/Compliance Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 31 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CISO |
| Custodian | Security Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Security architects, identity engineers, compliance officers, system administrators, integration architects, internal and external auditors |
| Scope | Role catalogue, permission catalogue, role-permission matrix, custom roles, role hierarchy, role assignment workflow, role lifecycle, permission inheritance, RBAC model, and permission review process for the Ibn Hayan platform |
| Out of Scope | Implementation details, source code, API endpoint specifications, database schemas, UI component catalogues, deployment runbooks, vendor selection, specific RBAC engine selection |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through architectural or security governance. |
| Amendment Mechanism | Security Council ratification through a documented Architecture Decision Record for material changes; minor revisions recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Role Overview
2. Role Definitions
3. Permission Catalog
4. Role-Permission Matrix
5. Custom Roles
6. Role Hierarchy
7. Role Assignment Workflow
8. Role Lifecycle
9. Permission Inheritance
10. Role-Based Access Control (RBAC)
11. Permission Review Process
12. Related Documents

---

## 1. Role Overview

### 1.1 Purpose of This Document

This document defines the role and permission catalogue for the Ibn Hayan Healthcare Operating System. Roles are the unit of permission assignment, the unit of workflow responsibility, and the unit of training pathway, as documented in PRODUCT_BIBLE Section 20. Permissions are the action-level grants on resources that govern what a principal may do, as documented in PRODUCT_BIBLE Section 21. Together, roles and permissions constitute the RBAC foundation that supports the platform's least-privilege posture and its defence-in-depth security strategy. This document is the canonical security-side reference for roles and permissions; the product-side references are `docs/02_PRODUCT/USER_ROLES.md` and `docs/02_PRODUCT/PERMISSIONS.md`.

The document elaborates the architectural commitments defined in SYSTEM_ARCHITECTURE Section 20.4 (Authentication and Authorization) into operational policy. It is governed by the Office of the CISO, ratified by the Security Council, and amended through the documented ADR mechanism when material changes are introduced. Where this document and the architectural or product references diverge, the architectural and product references prevail.

### 1.2 Role Catalogue Summary

The Ibn Hayan role catalogue comprises 14 roles organized into four categories: clinical, operational, administrative, and platform. The catalogue is documented in PRODUCT_BIBLE Section 20.2 and is summarized below for convenience. The full role definitions, including responsibilities, typical scope, key permissions, and lifecycle stage, are documented in Section 2 of this document and in `docs/02_PRODUCT/USER_ROLES.md`.

| Code | Role | Category | Typical Responsibilities |
|---|---|---|---|
| R01 | Physician | Clinical | Clinical assessment, diagnosis, treatment, orders, documentation |
| R02 | Nurse | Clinical | Nursing assessment, care delivery, medication administration, documentation |
| R03 | Pharmacist | Clinical | Medication review, dispensing, clinical pharmacy, medication safety |
| R04 | Technician | Clinical | Laboratory, imaging, procedure technical work; result production |
| R05 | Allied health professional | Clinical | Physical therapy, occupational therapy, dietetics, mental health |
| R06 | Receptionist | Operational | Patient registration, scheduling, check-in, check-out |
| R07 | Scheduler | Operational | Appointment management, resource scheduling, queue management |
| R08 | Biller | Operational | Billing, claim submission, payment posting, denial management |
| R09 | Administrator | Operational | Facility administration, configuration oversight, operational reporting |
| R10 | Compliance officer | Administrative | Audit review, regulatory compliance, privacy oversight |
| R11 | HR manager | Administrative | Human resources management, payroll oversight, employee records |
| R12 | Executive | Administrative | Strategic oversight, financial oversight, governance |
| R13 | System administrator | Platform | Tenant configuration, integration management, operational administration |
| R14 | Integration account | Platform | System-to-system integration; non-human principal |

### 1.3 Role and Permission Distinction

The distinction between roles and permissions is foundational. A role is a defined set of responsibilities and authority assigned to a principal; a permission is an action-level grant on a resource. Permissions are assigned to roles; roles are assigned to principals. Direct principal-permission assignment is forbidden, as documented in PRODUCT_BIBLE Section 21.3; role-based assignment is the only supported mechanism.

The distinction is enforced at the Identity & Access module (M14) and is non-negotiable. A principal who requires a specific permission must receive it through a role assignment; the role-permission mapping is governed by the role definitions documented in Section 2 and the permission catalogue documented in Section 3. The enforcement prevents the permission sprawl that characterizes systems with direct principal-permission assignment.

### 1.4 Role Stability

The role catalogue is stable. The 14 roles have been the platform's role catalogue since its initial ratification and are expected to remain stable across the decade horizon, in keeping with Architectural Principle P18 (Decade-Horizon Viability). The stability is a consequence of the roles' alignment with healthcare operational reality; the Physician role, the Nurse role, and the Pharmacist role have been features of healthcare operations for centuries and are not expected to change.

Stability does not mean immutability. Roles may be added, deprecated, or retired through the documented role lifecycle process (Section 8). New roles may be added as the platform's surface expands (for example, a Telehealth Coordinator role may be added as telehealth operations mature). Existing roles may be deprecated as operational practices evolve. Role changes are governed by the Security Council and are documented in the role's lifecycle record.

### 1.5 Role and Edition Interaction

Role availability is influenced by edition, in keeping with PRODUCT_BIBLE Section 16. The Trial edition (E0) supports the clinical and operational roles required for prospect evaluation (R01, R02, R06, R07). The Essential edition (E1) adds the remaining clinical roles and basic administrative roles (R03, R04, R05, R08, R09). The Professional edition (E2) adds the full administrative and technical roles (R10, R11, R13). The Enterprise edition (E3) adds the Executive role (R12) and supports the Integration account role (R14) at scale. Edition-role interaction is documented in `docs/02_PRODUCT/EDITIONS.md` and is enforced through the configuration layer model.

### 1.6 Role and Tenant Scoping

Roles are tenant-scoped, in keeping with ADR-004 (Multi-Tenant Strategy). A principal's role assignment is valid only within the tenant for which it was assigned; cross-tenant role assignment is forbidden. A principal who holds the Physician role in tenant A does not automatically hold the Physician role in tenant B; the role must be separately assigned in tenant B, subject to tenant B's assignment governance.

The tenant scoping of roles is enforced at the Identity & Access module and is non-negotiable. A role assignment that is not tenant-scoped is rejected, with the rejection recorded in the audit trail. The tenant scoping is a critical control against lateral movement; an attacker who compromises a principal's credentials in one tenant does not gain the principal's roles in other tenants.

---

## 2. Role Definitions

### 2.1 Role Definition Structure

Each role in the Ibn Hayan catalogue is defined through a documented structure that captures the role's identity, responsibilities, scope, permissions, lifecycle, and governance. The structure is consistent across all 14 roles, supporting comparability and review. The structure is documented below; the role definitions in Sections 2.2 through 2.15 follow this structure.

| Field | Description |
|---|---|
| Role code | The role's unique identifier (R01 through R14) |
| Role name | The role's human-readable name |
| Category | Clinical, Operational, Administrative, or Platform |
| Typical responsibilities | The work that the role performs |
| Typical scope | The organizational hierarchy level at which the role operates |
| Key permissions | The permissions that distinguish the role from other roles |
| Lifecycle stage | The role's current lifecycle stage (RC1 through RC5, per Section 8) |
| Segregation of duties | Combinations with other roles that are prohibited |
| Training pathway | The training required before the role can be assigned |

### 2.2 Physician (R01)

The Physician role is the clinical role responsible for clinical assessment, diagnosis, treatment, order entry, and clinical documentation. The Physician role's key permissions include the ability to create and sign clinical orders, to document clinical encounters, to prescribe medications (subject to additional prescribing controls), and to access patient records within the physician's care team scope. The typical scope is the facility or department level, with care team membership determining access to specific patients.

The Physician role is the most privileged clinical role and is subject to additional controls. Prescribing of controlled substances requires step-up authentication, in keeping with the action risk classification documented in `AUTHORIZATION.md`. The Physician role is incompatible with the Biller role (R08) and the Compliance Officer role (R10) for the same organizational scope, to enforce segregation of duties between clinical decision-making and financial or compliance oversight.

The Physician role requires completion of the physician training pathway, which covers clinical documentation, order entry, prescribing, and the platform's patient safety controls. Training is versioned alongside the platform; a physician who has not completed the current training version cannot be assigned the Physician role, in keeping with PRODUCT_BIBLE Section 20.6.

### 2.3 Nurse (R02)

The Nurse role is the clinical role responsible for nursing assessment, care delivery, medication administration, and nursing documentation. The Nurse role's key permissions include the ability to administer medications (subject to additional medication administration controls), to document nursing assessments and interventions, to view clinical orders, and to access patient records within the nurse's care team scope. The typical scope is the facility or department level, with care team membership determining access to specific patients.

The Nurse role is subject to additional controls for medication administration. Administration of high-risk medications (e.g., insulin, anticoagulants, opioids) requires independent double verification by a second qualified principal, in keeping with recognized medication safety practice. The independent double verification is documented in the medication administration workflow and is auditable.

The Nurse role requires completion of the nurse training pathway, which covers nursing documentation, medication administration, vital signs documentation, and the platform's patient safety controls. The Nurse role is incompatible with the Biller role (R08) for the same organizational scope, to enforce segregation of duties between clinical care and financial processing.

### 2.4 Pharmacist (R03)

The Pharmacist role is the clinical role responsible for medication review, dispensing, clinical pharmacy, and medication safety. The Pharmacist role's key permissions include the ability to review and verify medication orders, to dispense medications, to document clinical pharmacy interventions, and to access patient medication histories within the pharmacist's facility scope. The typical scope is the facility pharmacy, with access to medication records across the facility.

The Pharmacist role is subject to additional controls for controlled substance dispensing. Dispensing of controlled substances requires step-up authentication and is documented in the controlled substance register, with the register subject to regulatory reporting per the controlled substance regulatory framework in force for the tenant's region.

The Pharmacist role requires completion of the pharmacist training pathway, which covers medication review, dispensing, controlled substance handling, and the platform's medication safety controls. The Pharmacist role is incompatible with the Biller role (R08) for the same organizational scope, to enforce segregation of duties between pharmacy operations and financial processing.

### 2.5 Technician (R04)

The Technician role is the clinical role responsible for laboratory, imaging, and procedure technical work, including result production. The Technician role's key permissions include the ability to receive and process orders, to perform technical procedures, to produce results, and to access patient identifiers required for result production. The typical scope is the department or unit level, with access limited to the patient identifiers required for the technician's work.

The Technician role is subject to additional controls for result production. Results must be verified by a qualified principal (typically a Physician or a senior Technician) before release to the ordering provider, in keeping with recognized laboratory practice. The verification is documented in the result's audit trail.

The Technician role requires completion of the technician training pathway, which covers order processing, technical procedures, result production, and the platform's quality control controls. The Technician role is incompatible with the Compliance Officer role (R10) for the same organizational scope, to enforce segregation of duties between technical work and compliance oversight.

### 2.6 Allied Health Professional (R05)

The Allied Health Professional role is the clinical role responsible for physical therapy, occupational therapy, dietetics, mental health, and other allied health disciplines. The Allied Health Professional role's key permissions include the ability to document assessments and interventions, to create and modify care plans within the professional's discipline, and to access patient records within the professional's care team scope. The typical scope is the department or service line level, with care team membership determining access to specific patients.

The Allied Health Professional role is heterogeneous, encompassing multiple disciplines with distinct training and regulatory requirements. The role is configured per discipline through the configuration surface, with the configuration specifying the discipline's specific permissions and constraints. The configuration is documented and is auditable.

The Allied Health Professional role requires completion of the discipline-specific training pathway, which covers the discipline's clinical documentation, intervention documentation, and the platform's patient safety controls. The role is incompatible with the Biller role (R08) for the same organizational scope, to enforce segregation of duties.

### 2.7 Receptionist (R06)

The Receptionist role is the operational role responsible for patient registration, scheduling, check-in, and check-out. The Receptionist role's key permissions include the ability to register new patients, to schedule appointments, to check patients in and out, and to access patient demographic and scheduling information. The typical scope is the facility or department level, with access limited to the demographic and scheduling information required for the receptionist's work.

The Receptionist role is subject to additional controls for patient registration. Registration of a new patient requires verification of the patient's identity through documented procedures, with the verification recorded in the patient's registration audit trail. Registration without verification is forbidden, in keeping with the platform's patient identity integrity controls.

The Receptionist role requires completion of the receptionist training pathway, which covers patient registration, scheduling, check-in/check-out, and the platform's patient identity controls. The role is compatible with the Scheduler role (R07) and may be held simultaneously by the same principal, with the combined permissions supporting front-desk operations.

### 2.8 Scheduler (R07)

The Scheduler role is the operational role responsible for appointment management, resource scheduling, and queue management. The Scheduler role's key permissions include the ability to create, modify, and cancel appointments, to manage resource schedules (rooms, equipment, practitioners), and to manage patient queues. The typical scope is the facility or department level, with access to scheduling information across the facility or department.

The Scheduler role is subject to additional controls for appointment modification. Modification of an appointment created by another principal may require the original principal's concurrence, depending on the appointment's clinical context. The control prevents inadvertent disruption of clinically important appointments.

The Scheduler role requires completion of the scheduler training pathway, which covers appointment management, resource scheduling, queue management, and the platform's scheduling controls. The role is compatible with the Receptionist role (R06) and may be held simultaneously.

### 2.9 Biller (R08)

The Biller role is the operational role responsible for billing, claim submission, payment posting, and denial management. The Biller role's key permissions include the ability to create and submit claims, to post payments, to manage denials, and to access financial information required for billing operations. The typical scope is the facility or customer level, with access to financial information across the scope.

The Biller role is subject to additional controls for claim submission. Claim submission requires verification of the claim's accuracy, with the verification documented in the claim's audit trail. Submission of inaccurate claims is a regulatory violation and is treated as a critical defect.

The Biller role is incompatible with the Physician (R01), Nurse (R02), Pharmacist (R03), and Allied Health Professional (R05) roles for the same organizational scope, to enforce segregation of duties between clinical decision-making and financial processing. The Biller role is also incompatible with the Compliance Officer role (R10) for the same financial scope, to enforce segregation of duties between financial processing and compliance oversight. The Biller role requires completion of the biller training pathway.

### 2.10 Administrator (R09)

The Administrator role is the operational role responsible for facility administration, configuration oversight, and operational reporting. The Administrator role's key permissions include the ability to view operational reports, to oversee facility configuration (without modifying it directly), and to manage facility-level administrative functions. The typical scope is the facility level, with access to operational information across the facility.

The Administrator role is distinct from the System Administrator role (R13). The Administrator role oversees facility operations but does not modify platform configuration; the System Administrator role modifies platform configuration but does not oversee facility operations. The distinction enforces segregation of duties between operational oversight and configuration management.

The Administrator role requires completion of the administrator training pathway, which covers operational reporting, facility administration, and the platform's configuration oversight controls. The role is compatible with the Executive role (R12) and may be held simultaneously by principals who serve in both capacities.

### 2.11 Compliance Officer (R10)

The Compliance Officer role is the administrative role responsible for audit review, regulatory compliance, and privacy oversight. The Compliance Officer role's key permissions include the ability to query audit records, to review break-glass invocations, to manage legal holds, and to generate compliance reports. The typical scope is the customer or facility level, with access to audit and compliance information across the scope.

The Compliance Officer role is subject to additional controls for audit query. Audit queries are themselves audited, with the audit-of-audit control documented in `AUDIT.md`. A Compliance Officer who queries audit records outside their scope is detected through the audit of their queries, with the detection triggering investigation.

The Compliance Officer role is incompatible with the Physician (R01), Technician (R04), Biller (R08), and System Administrator (R13) roles for the same organizational scope, to enforce segregation of duties. The Compliance Officer role requires completion of the compliance officer training pathway, which covers audit review, regulatory compliance, privacy oversight, and the platform's compliance controls.

### 2.12 HR Manager (R11)

The HR Manager role is the administrative role responsible for human resources management, payroll oversight, and employee records. The HR Manager role's key permissions include the ability to manage employee records, to oversee payroll runs, to manage leave and benefits, and to access HR information across the customer's scope. The typical scope is the customer level, with access to HR information across the customer's facilities.

The HR Manager role is subject to additional controls for payroll. Payroll runs require verification by a second qualified principal before execution, in keeping with recognized payroll control practice. The verification is documented in the payroll run's audit trail.

The HR Manager role requires completion of the HR manager training pathway, which covers employee records management, payroll oversight, leave and benefits management, and the platform's HR controls. The role is compatible with the Accountant specialization (within R11 scope) and may be held simultaneously by principals who serve in both HR and accounting capacities.

### 2.13 Executive (R12)

The Executive role is the administrative role responsible for strategic oversight, financial oversight, and governance. The Executive role's key permissions include the ability to view strategic and financial reports, to oversee customer-level operations, and to participate in governance activities. The typical scope is the customer level, with access to strategic information across the customer.

The Executive role is subject to additional controls for strategic reports. Strategic reports may include aggregated information across the customer's facilities; the aggregation is documented in the report's definition and is auditable. An Executive who requires facility-level detail must receive it through the documented facility-level reporting workflow, with the access recorded.

The Executive role requires completion of the executive training pathway, which covers strategic reporting, governance, and the platform's oversight controls. The role is compatible with the Administrator role (R09) and may be held simultaneously by principals who serve in both capacities.

### 2.14 System Administrator (R13)

The System Administrator role is the platform role responsible for tenant configuration, integration management, and operational administration. The System Administrator role's key permissions include the ability to modify tenant configuration, to manage integrations, to manage user accounts and role assignments, and to perform operational administration functions. The typical scope is the tenant level, with access to configuration and administrative information across the tenant.

The System Administrator role is the most privileged role in the platform and is subject to the strongest controls. Configuration changes are subject to the configuration governance framework documented in PRODUCT_BIBLE Section 22.7, with high-risk changes requiring approval by the Compliance Officer. User account and role assignment changes are subject to the assignment workflow documented in Section 7, with high-risk assignments requiring approval by the Compliance Officer.

The System Administrator role is incompatible with the Compliance Officer role (R10) for the same organizational scope, to enforce segregation of duties between configuration management and compliance oversight. The role requires completion of the system administrator training pathway, which covers tenant configuration, integration management, user account management, and the platform's operational controls.

### 2.15 Integration Account (R14)

The Integration Account role is the platform role for system-to-system integration. It is a non-human principal, authenticated through AM5 (client certificate) or AM6 (OAuth client credentials) per `AUTHENTICATION.md`. The Integration Account role's key permissions include the ability to perform the integration's authorized actions, scoped to specific integration surfaces. The typical scope is the integration's authorized surface, with no access beyond the integration's documented needs.

The Integration Account role is subject to additional controls for principle of least privilege. Each integration account is scoped to the minimum permissions required for the integration's function; the scoping is documented in the integration's configuration record and is reviewed annually. An integration account that requires additional permissions must receive them through the documented role assignment workflow, with the assignment approved by the System Administrator and reviewed by the Compliance Officer.

The Integration Account role requires no training pathway (it is non-human), but the integration's configuration is subject to documented review. The review verifies that the integration's authorized actions are appropriate, that the credentials are rotated per the documented schedule, and that the integration's audit records are complete. The review is performed by the System Administrator and is audited.

---

## 3. Permission Catalog

### 3.1 Permission Model

The Ibn Hayan permission model is documented in PRODUCT_BIBLE Section 21 and in `docs/02_PRODUCT/PERMISSIONS.md`. Permissions are defined at the action level (read, write, execute, administer, delete, export, share, amend) on resources (patients, encounters, orders, results, configurations, audits, etc.). The action-resource pair is the unit of permission; the permission catalogue is the complete set of action-resource pairs that the platform recognizes.

The permission model is large because the platform's surface is large, but it is stable because actions and resources evolve slowly. The stability is documented in PRODUCT_BIBLE Section 21.2 and is a critical property that supports the platform's decade-horizon viability. New permissions are added only through architectural decision, with the addition documented in the permission catalogue and reviewed by the Security Council.

### 3.2 Permission Categories

Permissions are organized into categories that reflect the resources they govern. The categories align with the bounded context catalogue documented in SYSTEM_ARCHITECTURE Section 7 and are summarized below. The full permission catalogue is documented in `docs/02_PRODUCT/PERMISSIONS.md`.

| Permission Category | Resource Examples | Typical Actions |
|---|---|---|
| Patient | Patient record, demographics, identifiers | Read, write, administer |
| Encounter | Encounter, encounter note, diagnosis | Read, write, amend |
| Clinical documentation | Clinical note, care plan, observation | Read, write, amend |
| Orders and results | Order, result, observation | Read, write, execute |
| Pharmacy | Medication, prescription, dispensation | Read, write, administer |
| Scheduling | Appointment, schedule, slot | Read, write, delete |
| Documents | Document, document version | Read, write, export, share |
| Billing | Claim, invoice, payment | Read, write, execute |
| Accounting | Journal entry, account, ledger | Read, write, administer |
| Configuration | Configuration record, feature flag | Read, write, administer |
| Audit | Audit record, audit query | Read, execute |
| Identity | User, role, permission, session | Read, write, administer |

### 3.3 Permission Scope

Permissions are scoped, not global. A principal may have read permission on patient records within their facility without having read permission on patient records in another facility. Scoping is by organizational unit, by facility, by department, by care team, and by other dimensions defined in the platform's permission framework. The scoping dimensions are documented in `docs/02_PRODUCT/PERMISSIONS.md` and are summarized below.

| Scope Dimension | Description |
|---|---|
| Customer | All facilities within the customer |
| Organization unit | All facilities within the organization unit |
| Facility | All departments within the facility |
| Department | All care teams within the department |
| Care team | The care team's patients and encounters |
| Patient cohort | A defined cohort of patients (e.g., the principal's active panel) |
| Self | The principal's own records (e.g., the principal's own training records) |
| None | No access (the default) |

### 3.4 Permission Granularity

Permissions are defined at the action level on resources, with field-level granularity for sensitive resources. The granularity levels are documented in `docs/02_PRODUCT/PERMISSIONS.md` and are summarized below.

| Granularity Level | Description |
|---|---|
| Resource | Permission on the resource as a whole (e.g., read patient record) |
| Action | Permission to perform a specific action on the resource (e.g., write patient demographics) |
| Field | Permission to access a specific field within the resource (e.g., read behavioral health notes) |
| Record | Permission to access a specific record (e.g., read this specific patient's record) |

### 3.5 Permission Data Scope

Permissions are scoped by data scope, which governs which records the principal may access within a resource category. The data scope categories are documented in `docs/02_PRODUCT/PERMISSIONS.md` and are summarized below.

| Data Scope | Description |
|---|---|
| All | All records within the scope dimension |
| Cohort | A defined cohort of records (e.g., the principal's active panel) |
| Self | The principal's own records |
| None | No records (the default) |

### 3.6 Permission Catalogue Governance

The permission catalogue is governed by the Security Council. New permissions are added only through architectural decision, with the addition documented in the permission catalogue and reviewed by the Security Council. Existing permissions are not removed casually; a permission that is no longer used is marked deprecated rather than removed, to preserve traceability for historical audit records.

Permission catalogue changes are recorded in the change log with explicit version increment. Material changes (addition of new permission categories, changes to permission semantics) are ratified through the ADR mechanism. The permission catalogue is reviewed annually, with deprecated permissions identified and retired through the documented deprecation process.

---

## 4. Role-Permission Matrix

### 4.1 Matrix Overview

The role-permission matrix is the mapping of roles to permissions. The matrix is large (14 roles × hundreds of permissions) but is stable (roles and permissions evolve slowly). The full matrix is documented in `docs/02_PRODUCT/PERMISSIONS.md`; this section provides a summary matrix at the permission-category level, sufficient to convey the structure without reproducing the full matrix.

The matrix is the canonical reference for what permissions each role holds. A role assignment confers the permissions documented in the matrix, subject to the scope and contextual constraints documented in Sections 3 and 9. The matrix is reviewed annually by the Security Council, with changes documented in the change log.

### 4.2 Summary Role-Permission Matrix

The summary matrix below shows the permission categories granted to each role, with the permission indicated as R (read), W (write), X (execute), A (administer), or – (no permission). The matrix is at the permission-category level; field-level and record-level permissions are documented in the full matrix in `docs/02_PRODUCT/PERMISSIONS.md`.

| Role | Patient | Encounter | Clinical Doc | Orders/Results | Pharmacy | Scheduling | Documents | Billing | Accounting | Configuration | Audit | Identity |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R01 Physician | RW | RW | RW | RWX | R | R | RW | R | – | – | R | – |
| R02 Nurse | RW | RW | RW | RX | R | R | RW | R | – | – | – | – |
| R03 Pharmacist | R | R | R | R | RWX | – | R | R | – | – | – | – |
| R04 Technician | R | R | – | RWX | – | – | – | – | – | – | – | – |
| R05 Allied Health | RW | RW | RW | R | – | R | RW | – | – | – | – | – |
| R06 Receptionist | RW | R | – | – | – | RWX | – | – | – | – | – | – |
| R07 Scheduler | R | R | – | – | – | RWX | – | – | – | – | – | – |
| R08 Biller | R | R | – | – | – | – | – | RWX | R | – | – | – |
| R09 Administrator | R | R | R | R | R | R | R | R | R | R | R | – |
| R10 Compliance Officer | R | R | R | R | R | R | R | R | R | R | RWX | – |
| R11 HR Manager | – | – | – | – | – | – | RW | – | RW | R | R | RW |
| R12 Executive | R | R | R | R | R | R | R | R | R | R | R | – |
| R13 System Administrator | – | – | – | – | – | – | – | – | – | RWXA | R | RWXA |
| R14 Integration Account | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) | (scoped) |

### 4.3 Matrix Reading Guide

The matrix is read as follows. To determine whether a role has a specific permission, identify the role's row and the permission category's column; the cell at the intersection indicates the permission level. For example, the Physician role (R01) has read and write permission on the Patient category (RW), execute permission on the Orders/Results category (RWX), and no permission on the Accounting category (–).

The matrix is at the permission-category level; field-level and record-level permissions may further restrict the permissions documented in the matrix. For example, the Physician role's read permission on the Patient category does not include read permission on sensitive fields (behavioral health notes, HIV status) without additional authorization; field-level permissions are documented in the full matrix in `docs/02_PRODUCT/PERMISSIONS.md`.

### 4.4 Matrix and Scope Interaction

The matrix documents the permissions granted by each role, but the permissions are subject to scope constraints. A Physician with read permission on the Patient category can read patient records only within their care team scope; a Physician without care team membership for a specific patient cannot read that patient's record, even though the matrix grants read permission.

The scope interaction is documented per permission category. Some categories (e.g., Configuration) are scoped at the tenant level, with permissions applying to the tenant as a whole. Other categories (e.g., Patient) are scoped at the care team level, with permissions applying only to patients in the principal's care team. The scope interaction is documented in the full matrix and is enforced at the Identity & Access module.

### 4.5 Matrix and Customization

The matrix documents the default permissions for each role. Tenants may customize the matrix within the platform's framework, adding permissions to roles (subject to the platform-level constraints documented in Section 5.4) or removing permissions that are not platform-required. Customization is performed through the configuration surface and is subject to the configuration governance framework documented in PRODUCT_BIBLE Section 22.7.

Customization does not permit weakening the platform's defaults. A tenant may add permissions to a role (e.g., granting a Nurse role the execute permission on Orders/Results for nurse practitioners) but may not remove permissions that the platform requires (e.g., removing read permission on Patient from the Physician role). The platform-required permissions are documented in the full matrix and are non-negotiable.

### 4.6 Matrix and Audit

The matrix is auditable. Every change to the matrix is recorded in the audit trail, with the audit record capturing the previous and new permissions, the configurator, and the time. Matrix audit records are the basis for compliance demonstration and for incident investigation. The matrix audit records are immutable, in keeping with Architectural Principle P13 and the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Matrix audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that matrix changes were authorized, that the changes are consistent with the tenant's compliance posture, and that any platform-required permissions were not removed. The review is itself audited.

---

## 5. Custom Roles

### 5.1 Custom Role Framework

The Ibn Hayan platform supports custom roles within the configuration framework, as documented in PRODUCT_BIBLE Section 20.5. Custom roles are compositions of existing permissions, not new permissions; a custom role that requires a permission not in the platform's permission catalogue is not possible without platform extension. Custom roles are tenant-scoped; a custom role defined by one customer is not available to other customers.

Custom roles are subject to the same lifecycle governance as platform-defined roles, with the customer's System Administrator responsible for role lifecycle within the tenant. Custom role changes are auditable, with the audit trail showing who created or modified the role, when, and with what authorization. Custom roles that affect regulatory compliance are reviewed by the Compliance Officer before activation.

### 5.2 Custom Role Composition

Custom roles are composed by selecting permissions from the platform's permission catalogue and assigning them to the custom role. The composition is performed through the Identity & Access module's custom role surface, with the composition authenticated and authorized. The composition is validated against the platform's composition rules, with violations (e.g., inclusion of a permission not in the catalogue, or composition that violates segregation of duties) rejected.

Custom role composition is subject to the platform's segregation-of-duty rules. A custom role that combines permissions from incompatible categories (e.g., clinical decision-making permissions with financial processing permissions) is rejected, with the rejection recorded in the audit trail. The segregation rules are documented in Section 2 and are non-negotiable.

### 5.3 Custom Role Examples

Custom roles are useful for representing operational realities that do not fit the platform's 14-role catalogue. Examples of custom roles that customers may define include:

| Custom Role | Composition | Typical Use |
|---|---|---|
| Nurse Practitioner | Nurse role + selected Physician permissions (order entry, prescribing) | Advanced practice nurses with expanded scope |
| Care Coordinator | Selected Nurse permissions + scheduling permissions + care plan permissions | Care coordinators who manage patient care across encounters |
| Front Desk Lead | Receptionist + Scheduler + selected Administrator permissions | Front desk leads who oversee reception operations |
| Billing Supervisor | Biller + selected Compliance Officer permissions (audit query, denial review) | Billing supervisors who oversee billing operations |
| Clinical Informatics Specialist | Selected Administrator + Configuration permissions | Specialists who configure clinical templates and order sets |

The examples are illustrative, not exhaustive. Customers may define custom roles that reflect their specific operational realities, subject to the platform's composition rules and segregation-of-duty constraints. Custom role definitions are documented in the tenant's configuration record and are auditable.

### 5.4 Custom Role Governance

Custom role governance is the practice of managing custom role change over time. Governance includes custom role change approval workflows, custom role review by the Compliance Officer, custom role testing in non-production environments, and custom role communication to affected principals. Governance is customer-scoped, with each tenant defining their custom role governance within the platform's framework.

Custom role governance does not permit weakening the platform's defaults. A custom role may not include permissions that the platform restricts to specific roles (e.g., a custom role may not include the System Administrator's configuration administration permissions unless the custom role is held by a principal who would also be eligible for the System Administrator role). The platform's restrictions are documented in the role definitions and are non-negotiable.

### 5.5 Custom Role Lifecycle

Custom roles have a lifecycle similar to platform-defined roles, with stages Defined (RC1), Active (RC2), Restricted (RC3), Deprecated (RC4), and Retired (RC5). The lifecycle is documented in Section 8 and is governed by the customer's System Administrator. Lifecycle transitions are auditable, with the audit trail showing who initiated the transition, when, and with what authorization.

Custom role retirement is a documented process. A custom role that is retired is removed from the catalogue, with existing assignments transitioned to alternative roles (platform-defined or custom) through a documented migration. The migration is planned in advance and is communicated to affected principals. Retirement without migration is forbidden, as it would leave principals without the permissions required for their work.

### 5.6 Custom Role and Platform Evolution

Custom roles may be promoted to platform-defined roles through the platform's evolution process. A custom role that proves broadly useful (e.g., the Nurse Practitioner role, if adopted by multiple customers) may be promoted to a platform-defined role, with the promotion documented in the role catalogue and ratified by the Security Council. The promotion does not invalidate existing custom role definitions; customers who prefer their custom definition may continue to use it, with the platform-defined role available as an alternative.

Custom role promotion is governed by the platform's evolution process, documented in SYSTEM_ARCHITECTURE Section 30 (Future Evolution Strategy). The process includes validation that the custom role's permissions are appropriate for platform-wide use, that the role's name and description are clear, and that the role's lifecycle governance is consistent with the platform's role lifecycle. Promotion is rare and is undertaken only when a custom role achieves broad adoption.

---

## 6. Role Hierarchy

### 6.1 Hierarchical Dimensions

The Ibn Hayan role hierarchy is organized along two dimensions: organizational scope and functional category. The organizational scope dimension governs the hierarchical level at which a role operates (customer, facility, department, care team); the functional category dimension governs the type of work the role performs (clinical, operational, administrative, platform). The two dimensions are independent; a role's position in one dimension does not determine its position in the other.

The two-dimensional hierarchy is documented in `docs/02_PRODUCT/USER_ROLES.md` and is summarized here for completeness. The hierarchy is not a strict chain of command; it is a classification that supports permission inheritance (Section 9) and segregation of duties (Section 2). The hierarchy is stable, in keeping with the role catalogue's stability documented in Section 1.4.

### 6.2 Organizational Scope Levels

The organizational scope dimension aligns with the organizational hierarchy documented in SYSTEM_ARCHITECTURE Section 11. The levels are Customer (H1), Organization Unit (H2), Facility (H3), Department (H4), and Care Team (H5). A role's organizational scope determines the breadth of the role's authority; a role at the Customer level has broader scope than a role at the Care Team level.

| Scope Level | Code | Typical Roles |
|---|---|---|
| Customer | H1 | Executive (R12), HR Manager (R11), Compliance Officer (R10, customer scope) |
| Organization Unit | H2 | Compliance Officer (R10, OU scope), Executive (R12, OU scope) |
| Facility | H3 | Administrator (R09), System Administrator (R13, facility scope) |
| Department | H4 | Physician (R01, department scope), Nurse (R02, department scope) |
| Care Team | H5 | Physician (R01, care team scope), Nurse (R02, care team scope) |

### 6.3 Functional Category Levels

The functional category dimension classifies roles by the type of work they perform. The categories are Clinical, Operational, Administrative, and Platform. A role's functional category determines the permission categories the role may hold; clinical roles hold clinical permissions, operational roles hold operational permissions, and so on.

| Category | Code | Roles |
|---|---|---|
| Clinical | FC1 | Physician (R01), Nurse (R02), Pharmacist (R03), Technician (R04), Allied Health Professional (R05) |
| Operational | FC2 | Receptionist (R06), Scheduler (R07), Biller (R08), Administrator (R09) |
| Administrative | FC3 | Compliance Officer (R10), HR Manager (R11), Executive (R12) |
| Platform | FC4 | System Administrator (R13), Integration Account (R14) |

### 6.4 Hierarchy and Inheritance

The role hierarchy supports permission inheritance, documented in Section 9. A role at a higher organizational scope inherits permissions from lower scopes within the same functional category, subject to documented inheritance rules. A role at a higher functional category does not inherit permissions from lower functional categories; the categories are independent for inheritance purposes.

The inheritance rules are conservative. A role at the Customer scope does not automatically receive all permissions of the same role at the Facility scope; the inheritance is documented per role and is auditable. The conservatism prevents accidental over-permissioning through inheritance misconfiguration.

### 6.5 Hierarchy and Segregation of Duties

The role hierarchy interacts with segregation of duties, documented in Section 2. Roles in different functional categories may be incompatible for the same organizational scope, even if the roles are at different hierarchical levels. For example, a Physician at the Care Team scope is incompatible with a Biller at the Facility scope for the same facility, because the combination would allow the principal to both make clinical decisions and process the financial consequences of those decisions.

The segregation-of-duty rules are documented in Section 2 and are enforced at the Identity & Access module at role assignment time. A role assignment that violates a segregation-of-duty rule is rejected, with the rejection recorded in the audit trail. The rules are reviewed annually by the Security Council.

### 6.6 Hierarchy and Reporting

The role hierarchy supports reporting. Reports can be generated at any hierarchical level, with roll-up to higher levels and drill-down to lower levels. The reporting hierarchy is documented in SYSTEM_ARCHITECTURE Section 11.7 and is implemented through the Reporting bounded context (BC18).

Reporting respects the role hierarchy. A Compliance Officer at the Facility scope can view reports for their facility; a Compliance Officer at the Customer scope can view reports across the customer's facilities. The scoping prevents a Compliance Officer from viewing reports outside their authority, in keeping with the platform's least-privilege posture.

---

## 7. Role Assignment Workflow

### 7.1 Assignment Process

Role assignment is the process by which a role is granted to a principal. The Ibn Hayan role assignment workflow is a documented, multi-stage process that ensures assignments are authorized, appropriate, and auditable. The workflow is governed by the Security Council and is implemented at the Identity & Access module.

| Stage | Code | Description |
|---|---|---|
| Request | A1 | A principal requests a role assignment, with justification |
| Verification | A2 | The request is verified for completeness and accuracy |
| Approval | A3 | The request is approved by the documented approver |
| Provisioning | A4 | The role is provisioned to the principal |
| Notification | A5 | The principal is notified of the assignment |
| Activation | A6 | The role becomes active for the principal |
| Audit | A7 | The assignment is recorded in the audit trail |

The workflow is mandatory for all role assignments. An assignment that bypasses the workflow is treated as a critical defect and triggers the documented incident response process. The workflow is documented in detail in `docs/02_PRODUCT/USER_ROLES.md` and is summarized here for completeness.

### 7.2 Assignment Authority

Assignment authority is the principal who is authorized to approve a role assignment. The assignment authority varies by role and by organizational scope, with the variation documented in the role's definition. In general, clinical role assignments are approved by the principal's clinical supervisor; administrative role assignments are approved by the principal's administrative supervisor; platform role assignments are approved by the customer's designated platform authority.

| Role | Typical Assignment Authority |
|---|---|
| Physician (R01) | Chief Medical Officer or designated clinical leader |
| Nurse (R02) | Chief Nursing Officer or designated nursing leader |
| Pharmacist (R03) | Director of Pharmacy |
| Technician (R04) | Laboratory Director or Imaging Director |
| Allied Health Professional (R05) | Director of Allied Health |
| Receptionist (R06) | Facility Administrator |
| Scheduler (R07) | Facility Administrator |
| Biller (R08) | Director of Billing |
| Administrator (R09) | Customer executive |
| Compliance Officer (R10) | Customer executive |
| HR Manager (R11) | Customer executive |
| Executive (R12) | Customer board or designated authority |
| System Administrator (R13) | Customer executive |
| Integration Account (R14) | System Administrator (with Compliance Officer review) |

### 7.3 Assignment Lifecycle

Role assignments have a lifecycle. An assignment is created, may be modified (e.g., scope change), may be suspended (e.g., during investigation), and is eventually terminated (e.g., on role change, on termination of employment). The lifecycle is documented, with each transition recorded in the audit trail.

| Lifecycle Stage | Description |
|---|---|
| Created | The assignment is provisioned and active |
| Modified | The assignment's scope or attributes are changed |
| Suspended | The assignment is temporarily inactive (e.g., during investigation) |
| Reactivated | The assignment is restored from suspension |
| Terminated | The assignment is permanently ended |

### 7.4 Assignment and Segregation of Duties

Role assignments are subject to segregation-of-duty rules, documented in Section 2. An assignment that would create a segregation-of-duty conflict is rejected at the Approval stage, with the rejection documented in the audit trail. The rejection includes the specific rule that was violated, supporting review and remediation.

Segregation-of-duty rejections are reviewed by the Compliance Officer on a defined cadence. The review verifies that the rejections were appropriate and that the underlying conflict was resolved (e.g., by reassigning one of the conflicting roles). The review is itself audited.

### 7.5 Assignment Audit

Role assignment events are audited. The audit record captures the principal, the role, the scope, the assigner, the approver, the time, and the lifecycle stage. Assignment audit records are the basis for compliance reporting and for incident investigation. The audit records are immutable, in keeping with Architectural Principle P13 and the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Assignment audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that assignments were authorized, that assignment authorities were appropriate, and that segregation-of-duty rules were enforced. The review is itself audited.

### 7.6 Assignment and Training

Role assignments are gated by training, in keeping with PRODUCT_BIBLE Section 20.6. A principal who has not completed the role's training pathway cannot be assigned the role. Training completion is verified at the Provisioning stage (A4), with verification recorded in the audit trail. A principal whose training has expired has their role assignment suspended until training is renewed.

Training gating is a critical control for roles that affect patient safety (Physician, Nurse, Pharmacist, Technician, Allied Health Professional). A principal who has not completed training may lack the knowledge required to use the platform safely, with potential patient safety consequences. Training gating is non-negotiable for in-scope roles.

---

## 8. Role Lifecycle

### 8.1 Lifecycle Stages

Roles have a lifecycle similar to module lifecycle, documented in PRODUCT_BIBLE Section 20.4. The lifecycle stages are Defined (RC1), Active (RC2), Restricted (RC3), Deprecated (RC4), and Retired (RC5). The lifecycle governs the availability of roles for assignment and the support for existing assignments.

| Stage | Code | Description |
|---|---|---|
| Defined | RC1 | Role defined in the catalogue; permissions specified |
| Active | RC2 | Role available for assignment to principals |
| Restricted | RC3 | Role available only with explicit authorization (e.g., for segregated duties) |
| Deprecated | RC4 | Role no longer recommended for new assignment; existing assignments supported |
| Retired | RC5 | Role removed from the catalogue; existing assignments transitioned to alternative roles |

Lifecycle transitions are ratified by the Security Council for platform-defined roles and by the customer's System Administrator for custom roles. Transitions are documented in the role's lifecycle record and are auditable.

### 8.2 Lifecycle Transitions

Lifecycle transitions are governed by documented rules. The transition from Defined to Active requires validation that the role's permissions are well-formed, that the role's name and description are clear, and that the role's lifecycle governance is consistent with the platform's role lifecycle. The transition from Active to Restricted requires documented justification, with the justification reviewed by the Security Council.

The transition from Active or Restricted to Deprecated requires a documented deprecation plan, including the deprecation date, the alternative role (for new assignments), and the support window for existing assignments. The transition from Deprecated to Retired requires that all existing assignments have been transitioned to alternative roles, with the transition documented and verified.

### 8.3 Lifecycle and Existing Assignments

Lifecycle transitions affect existing assignments. A transition from Active to Restricted does not affect existing assignments; the assignments remain active. A transition from Active or Restricted to Deprecated does not affect existing assignments; the assignments remain supported through the deprecation window. A transition from Deprecated to Retired requires that existing assignments be transitioned to alternative roles before the retirement takes effect.

The transition of existing assignments is a documented process. The customer's System Administrator identifies the affected principals, communicates the transition, and executes the transition through the assignment workflow (Section 7). The transition is auditable, with the audit trail showing the original and new assignments, the assigner, and the time.

### 8.4 Lifecycle and Audit

Lifecycle transitions are audited. The audit record captures the role, the previous and new lifecycle stages, the transitioner, the time, and the justification. Lifecycle audit records are the basis for compliance reporting and for incident investigation. The audit records are immutable, in keeping with Architectural Principle P13 and the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Lifecycle audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that transitions were authorized, that the transition rules were followed, and that existing assignments were appropriately transitioned. The review is itself audited.

### 8.5 Lifecycle and Custom Roles

Custom roles follow the same lifecycle as platform-defined roles. The customer's System Administrator is responsible for managing the custom role's lifecycle, with the lifecycle transitions documented and auditable. The platform provides the lifecycle framework; the customer discharges the lifecycle governance.

Custom role lifecycle is reviewed by the Compliance Officer on a defined cadence. The review verifies that custom roles remain necessary, that custom role permissions remain appropriate, and that custom role assignments remain current. Custom roles that are no longer necessary are deprecated and retired through the documented lifecycle process.

### 8.6 Lifecycle and Platform Evolution

Role lifecycle supports platform evolution. As the platform's surface expands, new roles may be added (e.g., a Telehealth Coordinator role as telehealth operations mature). As operational practices evolve, existing roles may be deprecated (e.g., a role that becomes obsolete as workflows are reorganized). Role lifecycle changes are governed by the platform's evolution process, documented in SYSTEM_ARCHITECTURE Section 30 (Future Evolution Strategy).

Role lifecycle evolution is conservative. New roles are introduced only when the existing role catalogue cannot accommodate the operational reality, and existing roles are deprecated only when the role is genuinely obsolete. The conservatism reflects the role catalogue's stability, documented in Section 1.4, and supports the platform's decade-horizon viability.

---

## 9. Permission Inheritance

### 9.1 Inheritance Model

Permission inheritance is the propagation of permissions from higher-scope layers to lower-scope layers, as documented in PRODUCT_BIBLE Section 21.5 and in `docs/02_PRODUCT/PERMISSIONS.md`. The inheritance model is hierarchical, with permissions granted at the Customer level propagating to Organization Unit, Facility, Department, and Care Team levels, subject to documented override rules.

The inheritance model is explicit and documented. A customer's permission configuration is auditable end-to-end, with the audit trail showing which permissions were applied at which layer for any given principal at any given time. The explicitness supports compliance demonstration and incident investigation.

### 9.2 Inheritance Layers

The inheritance layers align with the organizational hierarchy documented in SYSTEM_ARCHITECTURE Section 11 and with the configuration layers documented in PRODUCT_BIBLE Section 22.3. The layers are Customer (L3 in the configuration layer model), Organization Unit, Facility (L4), Department (L5), Care Team (L6), User (L7), and Session (L8). The Platform Default (L1) and Edition (L2) layers do not directly govern permission inheritance; they govern configuration inheritance, which may include permission-related configuration.

| Layer | Code | Permission Inheritance |
|---|---|---|
| Customer | L3 | Permissions apply to all organizational units, facilities, departments, and care teams within the customer |
| Organization Unit | (within L3) | Permissions apply to all facilities, departments, and care teams within the organizational unit |
| Facility | L4 | Permissions apply to all departments and care teams within the facility |
| Department | L5 | Permissions apply to all care teams within the department |
| Care Team | L6 | Permissions apply to the care team |
| User | L7 | Permissions apply to the specific user |
| Session | L8 | Permissions apply to the specific session |

### 9.3 Inheritance Override

Inheritance override is the application of a permission at a lower layer that overrides the inherited permission from a higher layer. Overrides are validated, versioned, and auditable, in keeping with the configuration governance framework documented in PRODUCT_BIBLE Section 22.7. Overrides may strengthen the inherited permission (e.g., granting additional permissions at the facility level) or may weaken the inherited permission (e.g., removing permissions at the department level), subject to the platform's restrictions documented in Section 4.5.

Override rules are conservative. An override that would weaken a platform-required permission is rejected, with the rejection recorded in the audit trail. The conservatism prevents inadvertent weakening of the platform's security posture through override misconfiguration.

### 9.4 Inheritance and Scope

Permission inheritance interacts with permission scope, documented in Section 3.3. A permission granted at the Customer level applies to all records within the customer's scope; a permission granted at the Care Team level applies only to records within the care team's scope. The interaction produces a permission set that is specific to the principal's position in the organizational hierarchy.

The interaction is documented per permission category. Some categories (e.g., Configuration) are scoped at the tenant level, with inheritance applying to the tenant as a whole. Other categories (e.g., Patient) are scoped at the care team level, with inheritance applying only to patients in the principal's care team. The interaction is enforced at the Identity & Access module.

### 9.5 Inheritance Audit

Permission inheritance is auditable. Every inheritance decision is recorded in the audit trail, with the audit record capturing the principal, the permission, the layer at which the permission was granted, and the layer at which the permission was applied. Inheritance audit records are the basis for compliance demonstration and for incident investigation.

Inheritance audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that inheritance is configured as intended, that overrides are documented and authorized, and that the inherited permission set is consistent with the principal's role and scope. The review is itself audited.

### 9.6 Inheritance and Custom Roles

Permission inheritance applies to custom roles as well as platform-defined roles. A custom role assigned at the Customer level inherits to lower scopes, subject to the same override rules as platform-defined roles. Custom role inheritance is documented in the custom role's definition and is auditable.

Custom role inheritance is reviewed by the Compliance Officer on a defined cadence, alongside the review of custom role lifecycle documented in Section 8.5. The review verifies that custom role inheritance is configured as intended, that overrides are documented and authorized, and that the inherited permission set is consistent with the custom role's purpose.

---

## 10. Role-Based Access Control (RBAC)

### 10.1 RBAC Model

Role-Based Access Control is the platform's primary access control mechanism, as documented in PRODUCT_BIBLE Section 21 and in `AUTHORIZATION.md` Section 3.1. Permissions are assigned to roles; roles are assigned to principals; authorization decisions are made based on the principal's role assignments. The RBAC model is the foundation of the platform's least-privilege posture and is the mechanism through which the role and permission catalogues documented in this document are operationalized.

The RBAC model is supplemented by Attribute-Based Access Control (ABAC) for contextual decisions and Policy-Based Access Control (PBAC) for complex rules, as documented in `AUTHORIZATION.md` Section 3. The hybrid model is necessary because healthcare authorization requires both the administrative simplicity of RBAC and the contextual precision of ABAC and PBAC.

### 10.2 RBAC and Permission Assignment

Permission assignment in RBAC is performed through the role-permission matrix documented in Section 4. Permissions are assigned to roles through the role definition; principals receive permissions through role assignment. Direct principal-permission assignment is forbidden, as documented in PRODUCT_BIBLE Section 21.3; role-based assignment is the only supported mechanism.

The prohibition on direct principal-permission assignment is enforced at the Identity & Access module. A direct assignment attempt is rejected, with the rejection recorded in the audit trail. The enforcement prevents the permission sprawl that characterizes systems with direct principal-permission assignment and that compromises the least-privilege posture.

### 10.3 RBAC and Authorization Decisions

Authorization decisions in RBAC are made by evaluating the principal's role assignments against the requested action and resource. The evaluation is documented in `AUTHORIZATION.md` Section 2.2 and is performed at the Identity & Access module. The decision is recorded in the audit trail, with the audit record capturing the principal, the role(s) used, the action, the resource, and the decision.

RBAC authorization decisions are supplemented by ABAC and PBAC decisions, as documented in `AUTHORIZATION.md` Section 3. The supplement is necessary because RBAC alone cannot express the contextual constraints required for healthcare authorization (e.g., care team membership, encounter status). The hybrid model ensures that authorization decisions are both administratively simple and contextually precise.

### 10.4 RBAC and Segregation of Duties

RBAC supports segregation of duties through the role combination prohibitions documented in Section 2. A principal who holds one role may be prohibited from holding another role for the same organizational scope, with the prohibition enforced at the Identity & Access module at role assignment time. The enforcement prevents the concentration of incompatible permissions in a single principal.

Segregation of duties in RBAC is a critical control for healthcare operations. A principal who could both prescribe medications and dispense them would have unchecked authority over the medication use process, with potential patient safety consequences. The segregation-of-duty rules prevent such concentration and are non-negotiable.

### 10.5 RBAC and Audit

RBAC is auditable. Every role assignment, every role-permission matrix change, and every authorization decision is recorded in the audit trail. RBAC audit records are the basis for compliance reporting and for incident investigation. The audit records are immutable, in keeping with Architectural Principle P13 and the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

RBAC audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that role assignments were authorized, that matrix changes were appropriate, and that authorization decisions were correct. The review is itself audited.

### 10.6 RBAC and Customization

RBAC is customizable within the platform's framework, as documented in Section 5. A tenant may define custom roles, may adjust the role-permission matrix within platform-defined bounds, and may configure inheritance and override rules. Customization is performed through the configuration surface and is subject to the configuration governance framework documented in PRODUCT_BIBLE Section 22.7.

RBAC customization does not permit weakening the platform's defaults. A tenant may strengthen the RBAC posture (e.g., by adding permissions to roles or by defining more restrictive custom roles) but may not weaken it (e.g., by removing platform-required permissions or by combining incompatible roles). The platform's RBAC defaults are documented in this document and are non-negotiable.

---

## 11. Permission Review Process

### 11.1 Review Cadence

Permission review is the periodic verification that principals' permissions remain appropriate. The Ibn Hayan permission review process is performed on a defined cadence, with the cadence varying by role and by risk class. The review is documented, with the review findings recorded and any remediation actions tracked to completion.

| Role | Review Cadence |
|---|---|
| Physician (R01), Nurse (R02), Pharmacist (R03) | Quarterly |
| Technician (R04), Allied Health Professional (R05) | Quarterly |
| Receptionist (R06), Scheduler (R07), Biller (R08) | Semi-annually |
| Administrator (R09), Compliance Officer (R10), HR Manager (R11) | Semi-annually |
| Executive (R12) | Annually |
| System Administrator (R13) | Quarterly |
| Integration Account (R14) | Quarterly (with each credential rotation) |

### 11.2 Review Scope

Permission review covers the principal's role assignments, the permissions granted through those assignments, the scope of those permissions, and the inheritance and override rules that affect the principal's effective permission set. The review verifies that the principal's permissions remain necessary for their work, that no permissions have been granted in error, and that segregation-of-duty rules are respected.

The review scope includes both platform-defined and custom role assignments. Custom role assignments receive additional scrutiny, with the review verifying that the custom role's permissions remain appropriate and that the custom role's lifecycle is current. Custom role assignments that have not been reviewed within the documented cadence are flagged for review.

### 11.3 Review Process

The permission review process is performed by the Compliance Officer, with the review authenticated and authorized. The process begins with the generation of a permission review report, which lists each principal's role assignments, permissions, scope, and inheritance. The Compliance Officer reviews the report, identifies anomalies (e.g., permissions that are no longer necessary, assignments that violate segregation of duties), and documents remediation actions.

Remediation actions are tracked to completion through the documented remediation workflow. The workflow includes the action, the assignee, the target completion date, and the completion status. Remediation actions that are not completed within the target window are escalated to the customer's executive team.

### 11.4 Review Audit

Permission review events are audited. The audit record captures the reviewer, the time, the principals reviewed, the findings, and the remediation actions. Review audit records are the basis for compliance demonstration and for continuous improvement of the permission review process.

Review audit records are reviewed by the platform's internal audit function on a defined cadence. The review verifies that the permission review process was followed, that findings were documented, and that remediation actions were completed. The review is itself audited.

### 11.5 Review and Continuous Improvement

Permission review supports continuous improvement of the platform's permission posture. Findings from permission reviews are analyzed for patterns, with recurring patterns addressed through training, configuration changes, or platform evolution. The analysis is documented and is reviewed by the Security Council on a defined cadence.

Continuous improvement is non-negotiable. A permission review process that does not produce continuous improvement is a defect and is addressed through revision of the review process. The platform's decade-horizon commitment (Architectural Principle P18) requires that the permission posture evolve as the platform's surface evolves, with the permission review process as the operational mechanism for that evolution.

### 11.6 Review and Compliance Reporting

Permission review supports compliance reporting. Regulators may require evidence that permissions are reviewed periodically; the permission review audit records provide that evidence. Compliance reports generated from permission review records are themselves auditable, with report generation recorded in the audit trail.

Compliance reports are immutable once generated, in keeping with the immutability of compliance reports documented in SYSTEM_ARCHITECTURE Section 28.5. A compliance report that has been submitted to a regulator cannot be modified, even if subsequent data changes would produce a different report. The immutability is a compliance requirement and is enforced at the reporting layer.

---

## 12. Related Documents

### 12.1 Upstream Documents

| Document | Relationship |
|---|---|
| PRODUCT_BIBLE.md Section 20 (User Roles Overview) | Role catalogue that this document elaborates |
| PRODUCT_BIBLE.md Section 21 (Permission Philosophy) | Permission philosophy that this document elaborates |
| PRODUCT_BIBLE.md Section 27 (Security Philosophy) | Product-level security posture that governs roles and permissions |
| PRODUCT_BIBLE.md Section 23 (Multi-Tenant Philosophy) | Multi-tenant posture that governs tenant scoping of roles |
| SYSTEM_ARCHITECTURE.md Section 20 (Security Architecture) | Architectural commitments that this document elaborates |
| SYSTEM_ARCHITECTURE.md Section 10 (Multi-Tenant Architecture) | Tenant isolation architecture that governs role scoping |
| SYSTEM_ARCHITECTURE.md Section 11 (Organization Hierarchy) | Organizational hierarchy that governs permission scoping |
| SYSTEM_ARCHITECTURE.md Section 27 (Audit Architecture) | Audit architecture that governs role and permission audit |
| ADR-004 (Multi-Tenant Strategy) | Ratifies logical multi-tenancy as default, governing role scoping |

### 12.2 Peer Documents

| Document | Relationship |
|---|---|
| AUTHENTICATION.md | Authentication posture; complementary to roles and permissions |
| AUTHORIZATION.md | Authorization posture; consumes roles and permissions |
| AUDIT.md | Audit posture; covers audit of role and permission events |
| BACKUP.md | Backup posture; covers backup of role and permission configuration |
| RECOVERY.md | Recovery posture; covers recovery of role and permission service |
| COMPLIANCE/SECURITY_GUIDELINES.md | Comprehensive security guidelines; includes role and permission guidelines |
| COMPLIANCE/HIPAA.md | HIPAA compliance; includes role and permission requirements for PHI access |
| COMPLIANCE/GDPR.md | GDPR compliance; includes role and permission requirements for personal data |
| COMPLIANCE/PRIVACY_POLICY.md | Privacy posture; covers role and permission privacy implications |
| COMPLIANCE/MEDICAL_RECORD_POLICY.md | Medical record policy; covers roles for medical record access |

### 12.3 Downstream Documents

| Document | Relationship |
|---|---|
| docs/02_PRODUCT/USER_ROLES.md | Product-side role catalogue reference; complementary to this document |
| docs/02_PRODUCT/PERMISSIONS.md | Product-side permission catalogue reference; complementary to this document |
| docs/07_MODULES/Identity & Access (M14, future) | Module reference for the Identity & Access module, when authored |
| Role definition reference | Detailed role definitions, maintained by the Office of the CISO |
| Permission review runbook | Operational procedures for permission review, maintained by the operations team |

### 12.4 Document Maintenance

This document is maintained by the Office of the CISO and is custodied by the Security Council. The document is reviewed quarterly, with off-cycle revision when a related ADR is ratified or when a security incident reveals a gap in the document's coverage. Changes are recorded in the change log with explicit version increment; material changes are ratified through the ADR mechanism.

The document's authority is elaborative, not constitutive. It elaborates the security posture ratified in SYSTEM_ARCHITECTURE Section 20 and the role and permission philosophies ratified in PRODUCT_BIBLE Sections 20 and 21; where this document and either canonical reference diverge, the canonical reference prevails. The document's authority is sufficient to govern role and permission decisions within the Ibn Hayan platform, subject to the canonical references' precedence.
