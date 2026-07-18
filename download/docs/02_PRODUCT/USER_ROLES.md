# Ibn Hayan Healthcare Operating System — User Roles

| Field | Value |
|---|---|
| Document Title | User Roles |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Product Elaboration — Role Catalogue |
| Authority Level | Authoritative — Elaboration of PRODUCT_BIBLE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the Chief Product Officer |
| Custodian | Product Council |
| Review Cadence | Quarterly, with off-cycle revision when a role lifecycle transition is ratified |
| Audience | Product leadership, implementation consultants, customer success teams, configuration architects, security and compliance teams, customers evaluating Ibn Hayan's role surface |
| Scope | Role catalogue (14 roles, R01–R14), role classification, role permission scope, role assignment workflow, role lifecycle, role inheritance, role conflict resolution, custom role support |
| Out of Scope | Implementation details, source code, permission matrix internals, role assignment API contracts, role synchronization mechanisms |
| Conflict Resolution | In case of conflict, PRODUCT_BIBLE.md prevails. Role definitions in this document elaborate Section 20 of PRODUCT_BIBLE and do not override the role composition rules stated there. |
| Amendment Mechanism | Product Council ratification; recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (stub with section placeholders only) |

---

## Table of Contents

1. Role Overview
2. Role Hierarchy
3. Clinical Roles
4. Administrative Roles
5. Financial Roles
6. Technical Roles
7. Patient & Portal Roles
8. External & Partner Roles
9. Role Definitions
10. Role Matrix
11. Role Assignment Workflow
12. Custom Role Support
13. Related Documents

---

## 1. Role Overview

### 1.1 Purpose of Role Cataloguing

The role catalogue defines the human and system roles Ibn Hayan recognizes, as stated in `PRODUCT_BIBLE.md` Section 20.1. Roles are the unit of permission assignment, the unit of workflow responsibility, and the unit of training pathway. The catalogue is the canonical reference for what roles exist, what each role does, and how roles relate to permissions. Role internals — permission granularity, role composition, role lifecycle mechanics — are defined in `MODULE_ARCHITECTURE.md` and in `PERMISSIONS.md`; this document focuses on the product-facing view of the catalogue. Ibn Hayan's 14 roles are organized into four categories: clinical, operational, administrative, and platform, plus an additional dimension of platform-level, tenant-level, facility-level, and departmental scoping.

### 1.2 Role Count and Stability

The role catalogue comprises 14 roles, codified R01 through R14. The catalogue is stable; roles are not added or removed casually, and changes are recorded through the amendment mechanism defined in the document header. The 14-role count reflects the platform's operational decomposition of healthcare work; each role corresponds to a coherent set of responsibilities that share training pathways, regulatory exposure, and workflow involvement. Catalogue expansion is governed by the same intake process that governs clinic type and module expansion, with the additional requirement that a new role's permission scope be explicitly defined and aligned with the platform's permission philosophy stated in `PRODUCT_BIBLE.md` Section 21.

### 1.3 Role Reading Order

This document is organized as both a linear read and a reference. Readers new to Ibn Hayan's role model should read Sections 1, 2, 9, and 10 to understand the catalogue, hierarchy, definitions, and matrix. Readers evaluating Ibn Hayan for a specific role should read the relevant category section (Sections 3 through 8) plus Sections 9 and 11. Readers planning a custom role should read Section 12. Section 13 lists the upstream and downstream documents that this catalogue references and that elaborate role-specific concerns.

### 1.4 Role and Permission Distinction

Roles and permissions are distinct constructs. Roles are the unit of permission assignment; permissions are the primitive that governs every action of consequence, as stated in `PRODUCT_BIBLE.md` Section 21.1. A role is a named bundle of permissions; a permission is an action-level grant on a resource. Direct user-permission assignment is forbidden; role-based assignment is the only supported mechanism, per Section 21.3 of `PRODUCT_BIBLE.md`. This distinction is critical: roles evolve as healthcare work evolves, but permissions evolve slowly because actions and resources evolve slowly. The role-permission separation is what allows Ibn Hayan to add or revise roles without redefining the permission framework.

---

## 2. Role Hierarchy

### 2.1 Hierarchical Dimensions

Role hierarchy in Ibn Hayan operates along two orthogonal dimensions: organizational scope and functional category. Organizational scope defines where a role applies (platform, tenant, facility, department, care team); functional category defines what kind of work the role performs (clinical, operational, administrative, platform). A role's position in the hierarchy is the combination of these two dimensions; for example, the Physician role (R01) is a clinical role typically scoped to a facility or department, while the Super Admin role (R13, in the platform scope) is a platform role scoped to the entire platform. The two-dimensional hierarchy is documented in the role matrix in Section 10.

### 2.2 Organizational Scope Levels

The organizational scope levels mirror the organizational hierarchy defined in `SYSTEM_ARCHITECTURE.md` Section 11. The levels are platform (the entire Ibn Hayan platform), tenant (a single customer's tenant), facility (a facility within a customer), department (a department within a facility), and care team (a care team within a department). A role's scope determines where the role's permissions apply; a role assigned at the facility level applies within that facility only, not across the customer's other facilities. Scope is enforced by the permission framework at the action level, not at the page level, per `PRODUCT_BIBLE.md` Section 21.4.

### 2.3 Functional Category Levels

The functional category levels are clinical (roles that deliver healthcare), operational (roles that support healthcare delivery), administrative (roles that govern healthcare operations), and platform (roles that operate the Ibn Hayan platform). The categories are descriptive, not prescriptive; a role's category does not determine its permissions, only its functional positioning. The category system is used to organize training pathways, to group roles in the user administration surface, and to provide a navigation aid for role assignment.

### 2.4 Hierarchy and Inheritance

Role inheritance is explicit, not automatic. A role assigned at a higher organizational scope does not automatically propagate to lower scopes; the role must be explicitly scoped to apply at lower levels, per `PRODUCT_BIBLE.md` Section 21.5. This prevents accidental over-permissioning through inheritance misconfiguration. Where inheritance does apply (e.g., a role assigned at the customer level may apply to all facilities within the customer), the inheritance is documented, validated, and auditable. The inheritance model is governed by the permission philosophy stated in `PRODUCT_BIBLE.md` Section 21 and is implemented by the Identity & Access module (M14).

### 2.5 Hierarchy and Segregation of Duties

Role hierarchy interacts with segregation of duties. Certain role combinations are prohibited where they create segregation-of-duty conflicts, per `PRODUCT_BIBLE.md` Section 20.3. For example, a single user may not simultaneously hold the Biller role (R08) and the Compliance Officer role (R10) for the same financial scope. Prohibited combinations are documented in the security documentation and are enforced by the permission framework at assignment time. Segregation of duties is a critical control for healthcare operations and is non-negotiable; customers cannot override segregation-of-duty rules through configuration.

---

## 3. Clinical Roles

### 3.1 Physician (R01)

The Physician role is the primary clinical role in Ibn Hayan. Physicians perform clinical assessment, diagnosis, treatment, orders, and documentation, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Physician role is enabled in all production editions and is the role most commonly assigned in healthcare operations. The role's permission scope includes read and write on patient records within the physician's facility and department, execution of clinical orders, and documentation of clinical encounters. The Physician role is typically scoped to a facility or department, with multi-facility assignment supported through role composition (Section 9.3).

### 3.2 Nurse (R02)

The Nurse role is the second primary clinical role. Nurses perform nursing assessment, care delivery, medication administration, and documentation, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Nurse role's permission scope includes read on patient records within the nurse's facility and department, execution of medication administration orders, and documentation of nursing care. The Nurse role does not include authority to write clinical orders; this is a deliberate segregation of duties between Physician and Nurse roles. The Nurse role is enabled in all production editions.

### 3.3 Pharmacist (R03)

The Pharmacist role is the clinical role responsible for medication management. Pharmacists perform medication review, dispensing, clinical pharmacy, and medication safety, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Pharmacist role's permission scope includes read on patient records for medication review purposes, execution of dispensing operations, and documentation of pharmacy activities. The Pharmacist role includes authority over controlled substance dispensing records, with the additional audit and regulatory controls that controlled substances require. The Pharmacist role is enabled in all production editions where the Pharmacy module (M05) is enabled.

### 3.4 Technician (R04)

The Technician role is the clinical role responsible for technical work in laboratory, imaging, and procedure contexts. Technicians perform laboratory tests, imaging procedures, and other technical work; they produce results that are reviewed and certified by supervising clinicians, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Technician role's permission scope includes read on relevant patient and order information, execution of technical procedures, and documentation of technical work. The Technician role does not include authority to certify results; certification is performed by supervising clinicians through a separate permission. The Technician role is enabled in editions where the laboratory, imaging, or procedural clinic types are in operation.

### 3.5 Allied Health Professional (R05)

The Allied Health Professional role is the clinical role for non-physician, non-nurse clinical practitioners. Allied health professionals perform physical therapy, occupational therapy, dietetics, mental health counselling, and other allied health services, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Allied Health Professional role's permission scope includes read on patient records within the practitioner's facility and department, execution of allied health interventions, and documentation of allied health care. The role's specific permissions vary by specialty; a physical therapist's permissions differ from a dietitian's permissions, with the differences expressed through role composition rather than through separate role definitions.

### 3.6 Clinical Role Composition

Clinical roles are composable. A user may hold multiple clinical roles simultaneously, with permissions accumulating per defined rules, per `PRODUCT_BIBLE.md` Section 20.3. For example, a physician who is also a clinical pharmacist may hold both the Physician role (R01) and the Pharmacist role (R03), with the combined permission scope enabling both clinical practice and medication management. Role composition is subject to segregation-of-duty rules; certain combinations are prohibited where they create conflicts. The role composition framework is documented in `PERMISSIONS.md` Section 7 and is implemented by the Identity & Access module (M14).

---

## 4. Administrative Roles

### 4.1 Administrator (R09)

The Administrator role is the primary administrative role in Ibn Hayan. Administrators perform facility administration, configuration oversight, and operational reporting, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Administrator role's permission scope includes configuration management within the administrator's facility, user provisioning within the facility, and access to operational reporting for the facility. The Administrator role does not include authority over clinical decisions; clinical authority remains with clinical roles. The Administrator role is enabled in all production editions and is the role most commonly assigned to customer system administrators at the facility level.

### 4.2 Compliance Officer (R10)

The Compliance Officer role is the administrative role responsible for audit review, regulatory compliance, and privacy oversight, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Compliance Officer role's permission scope includes read on audit records across the compliance officer's scope, execution of audit review workflows, and authority to initiate compliance investigations. The Compliance Officer role includes authority to review emergency access events (per `PRODUCT_BIBLE.md` Section 21.6) and to investigate permission configuration defects. The role is critical for healthcare regulatory compliance and is enabled in all production editions.

### 4.3 HR Manager (R11)

The HR Manager role is the administrative role responsible for human resources management, payroll oversight, and employee records, as stated in `PRODUCT_BIBLE.md` Section 20.2. The HR Manager role's permission scope includes management of employee records within the HR manager's scope, oversight of payroll processes, and management of benefits administration. The HR Manager role does not include authority over clinical operations; clinical authority remains with clinical roles. The HR Manager role is enabled in editions where the HR module (M12) is enabled.

### 4.4 Executive (R12)

The Executive role is the administrative role responsible for strategic oversight, financial oversight, and governance, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Executive role's permission scope includes read on aggregated reporting across the executive's scope, access to financial summaries, and authority to approve strategic initiatives. The Executive role does not include authority over day-to-day operations; operational authority remains with the Administrator role. The Executive role is typically scoped to the customer or organization unit level, providing cross-facility visibility without operational authority.

### 4.5 Administrative Role Segregation

Administrative roles are subject to segregation-of-duty rules. The Compliance Officer role (R10) is segregated from operational administrative roles to ensure independent oversight; a user holding the Administrator role (R09) cannot simultaneously hold the Compliance Officer role for the same scope. The Executive role (R12) is segregated from operational financial roles to ensure independent governance; a user holding the Executive role cannot simultaneously hold the Biller role (R08) or the Accountant role (where applicable) for the same scope. Segregation is enforced by the permission framework at assignment time and cannot be overridden through configuration.

### 4.6 Administrative Role Customization

Administrative roles can be customized within the role composition framework. Customers may define custom administrative roles that compose permissions from multiple administrative roles, subject to segregation-of-duty rules. For example, a customer may define a "Facility Operations Manager" role that combines the Administrator role's configuration permissions with limited Compliance Officer permissions for routine audit review. Custom roles are tenant-scoped and are subject to the same lifecycle governance as platform-defined roles. Custom role support is elaborated in Section 12.

---

## 5. Financial Roles

### 5.1 Biller (R08)

The Biller role is the primary financial role in Ibn Hayan. Billers perform billing, claim submission, payment posting, and denial management, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Biller role's permission scope includes read on patient and encounter records for billing purposes, execution of billing operations, and documentation of billing activities. The Biller role includes authority over claim submission to external payers, with the additional audit and regulatory controls that financial transactions require. The Biller role is enabled in all production editions where the Billing module (M09) is enabled.

### 5.2 Accountant (within R11 scope)

The Accountant role is a specialized administrative role focused on accounting operations. Accountants perform general ledger management, accounts payable processing, accounts receivable management, and financial reporting, as a specialization of the HR Manager role's broader administrative scope. The Accountant role's permission scope includes management of accounting records within the accountant's scope, execution of accounting operations, and documentation of accounting activities. The Accountant role is enabled in editions where the Accounting module (M10) is enabled and is typically scoped to the customer or organization unit level.

### 5.3 Financial Role Segregation

Financial roles are subject to strict segregation-of-duty rules. The Biller role (R08) is segregated from the Compliance Officer role (R10) to ensure independent audit of financial transactions. The Accountant role is segregated from the Biller role to ensure proper separation of accounting and billing operations; a user posting payments cannot simultaneously certify the accounting records for those payments. Financial role segregation is enforced by the permission framework at assignment time and is a critical control for healthcare financial operations. Customers cannot override financial role segregation through configuration.

### 5.4 Financial Role and Regulatory Alignment

Financial roles are aligned with regional regulatory frameworks through the Localization module (M19). The specific permissions and workflow responsibilities of financial roles may vary by region, with the variation expressed through configuration overlays rather than through separate role definitions. For example, a Biller role in a single-payer regional framework may have different claim submission workflows than a Biller role in a multi-payer regional framework, with the differences expressed through the Localization module's regional adaptation pack. The role definition is stable; the configuration is regional.

### 5.5 Financial Role Audit

Every financial role action is audited, in keeping with the permission audit posture stated in `PRODUCT_BIBLE.md` Section 21.7. Financial audit records capture the user, the action, the resource, the permission decision, and the scope context. Financial audit records are immutable and are the basis for financial compliance reporting and for financial incident investigation. Financial audit records are subject to extended retention periods as required by regional regulatory frameworks, with retention enforced at the platform layer.

### 5.6 Financial Role Customization

Financial roles can be customized within the role composition framework, subject to segregation-of-duty rules. Customers may define custom financial roles that compose permissions from multiple financial roles, with the segregation-of-duty rules enforced at composition time. For example, a customer may define a "Billing Supervisor" role that combines the Biller role's billing permissions with limited review permissions for denial management. Custom financial roles are tenant-scoped and are subject to the same lifecycle governance as platform-defined roles.

---

## 6. Technical Roles

### 6.1 System Administrator (R13)

The System Administrator role is the platform role responsible for tenant configuration, integration management, and operational administration, as stated in `PRODUCT_BIBLE.md` Section 20.2. The System Administrator role's permission scope includes configuration management across the tenant, integration management, user role assignment, and operational administration. The System Administrator role is the most powerful role in the tenant scope and is subject to additional governance controls: assignment requires documented authorization, actions are subject to enhanced audit, and certain actions require secondary approval. The System Administrator role is enabled in all production editions.

### 6.2 Integration Account (R14)

The Integration Account role is the platform role for system-to-system integration, as stated in `PRODUCT_BIBLE.md` Section 20.2. The Integration Account role is a non-human principal used by external systems to access Ibn Hayan's integration surface. The Integration Account role's permission scope is narrowly scoped to the specific integration the account serves; an integration account used for laboratory result ingestion has permissions for result ingestion only, not for patient record access or billing operations. Integration accounts are subject to enhanced audit and to periodic credential rotation. The Integration Account role is enabled in editions where the Integration module (M17) is enabled.

### 6.3 Technical Role and Platform Operations

Technical roles interact with platform operations through defined processes. System Administrator actions that affect tenant configuration are subject to the configuration governance process stated in `PRODUCT_BIBLE.md` Section 22.7. Integration Account actions are subject to integration governance, with integration changes tested in sandbox before production application. Technical role actions are auditable, with audit records capturing the actor (human or system), the action, the resource, and the authorization context. Technical role audit is distinct from operational audit; technical role audit records how the platform was operated, while operational audit records what users did.

### 6.4 Technical Role and Multi-Tenant Isolation

Technical roles are scoped to a single tenant per the multi-tenant isolation rules stated in `SYSTEM_ARCHITECTURE.md` Section 10.3. A System Administrator in tenant A has no authority in tenant B; an Integration Account in tenant A has no access to tenant B's data. Cross-tenant technical role assignment is forbidden and is rejected by the permission framework at assignment time. The single-tenant scoping of technical roles is a primitive of the platform's multi-tenant architecture and is non-negotiable.

### 6.5 Technical Role and Segregation of Duties

Technical roles are subject to segregation-of-duty rules. The System Administrator role (R13) is segregated from operational roles to ensure that platform operations do not conflict with healthcare operations. A System Administrator cannot simultaneously hold clinical roles (R01 through R05) or operational roles (R06 through R08) for the same scope. The segregation ensures that platform administration does not produce conflicts of interest in healthcare delivery. Segregation is enforced by the permission framework at assignment time.

### 6.6 Technical Role Customization

Technical roles can be customized within the role composition framework, subject to segregation-of-duty rules. Customers may define custom technical roles that compose permissions from the System Administrator role's permission set, with narrower scope for specific operational responsibilities. For example, a customer may define an "Integration Administrator" role that has integration management permissions but not configuration management permissions. Custom technical roles are tenant-scoped and are subject to the same lifecycle governance as platform-defined roles.

---

## 7. Patient & Portal Roles

### 7.1 Patient Role Scope

Ibn Hayan's role catalogue, as defined in `PRODUCT_BIBLE.md` Section 20, comprises 14 roles focused on healthcare delivery and platform operation. The catalogue does not include a separate "Patient" role; patient interactions with the platform are mediated through clinical and operational roles. Patient-facing capabilities (e.g., appointment self-scheduling, result viewing, bill payment) are configured as permission scopes within existing roles, not as a separate patient role. This posture reflects the platform's focus on healthcare providers as the primary user base; patient-facing capabilities are extensions of provider-facing workflows.

### 7.2 Patient-Facing Capabilities

Patient-facing capabilities are configured through the platform's configuration surface, with permissions scoped to allow patient self-service for specific actions. The table below summarizes the patient-facing capabilities that can be configured.

| Patient-Facing Capability | Mediating Module | Mediating Role | Configuration Approach |
|---|---|---|---|
| Appointment self-scheduling | M06 Scheduling | R06 Receptionist | Configuration allows patient-initiated scheduling within defined constraints |
| Result viewing | M04 Orders & Results | R01 Physician | Configuration allows patient viewing of released results |
| Bill payment | M09 Billing | R08 Biller | Configuration allows patient-initiated payment for outstanding bills |
| Document access | M07 Documents | R09 Administrator | Configuration allows patient access to released documents |
| Notification preferences | M08 Notifications | R09 Administrator | Configuration allows patient management of notification preferences |

### 7.3 Patient-Facing Access Control

Patient-facing access is governed by the same permission framework as provider-facing access, with additional safeguards for patient privacy. Patient-facing access is scoped to the patient's own records; a patient cannot access another patient's records through any surface. Patient-facing access is subject to enhanced audit, with audit records capturing the patient's identity, the action, the resource, and the access context. Patient-facing access is configured per the customer's privacy policy and is subject to regional regulatory frameworks.

### 7.4 Patient Portal Extension

Extended patient portal capabilities are candidates for catalogue expansion, as documented in `MODULES.md` Section 10.2. The candidate Patient Portal (extended) module would provide deeper patient-facing capabilities than the current configuration-based approach. The candidate module is in the workflow analysis stage of the intake process and is not available for production use. Customers requiring deeper patient-facing capabilities than the configuration-based approach provides are advised to engage Ibn Hayan customer success for guidance on mitigation and on the candidate module's intake progress.

### 7.5 Patient Role and Future Vision

The role catalogue's posture on patient-facing capabilities may evolve as the platform's future vision unfolds, as documented in `PRODUCT_BIBLE.md` Section 30 (Future Vision). The current posture — patient capabilities as configuration extensions rather than as a separate role — reflects the platform's current focus and operational maturity. Future evolution may introduce a dedicated patient role if operational reality justifies it; such evolution would follow the standard role catalogue expansion process defined in `PRODUCT_BIBLE.md` Section 20.5.

---

## 8. External & Partner Roles

### 8.1 Integration Account (R14) as External Role

The Integration Account role (R14) is the primary external role in Ibn Hayan. Integration accounts are non-human principals used by external systems to access Ibn Hayan's integration surface, as documented in Section 6.2. External systems include laboratory information systems, imaging systems, pharmacy systems, billing systems, and other healthcare systems that exchange data with Ibn Hayan through the Integration module (M17). Integration accounts are scoped to the specific integration they serve and are subject to enhanced audit and credential rotation.

### 8.2 External Partner Engagement

External partner engagement is governed by the integration architecture defined in `SYSTEM_ARCHITECTURE.md` Section 19 (Integration Architecture). Partners do not receive direct user accounts in the customer's tenant; partners receive integration accounts that are narrowly scoped to the integration they serve. Partner-initiated actions are auditable, with audit records capturing the integration account, the action, the resource, and the authorization context. Partner engagement is documented per integration and is reviewed periodically by the customer's system administrator.

### 8.3 Auditor and Inspector Access

Auditors and inspectors (regulatory auditors, accreditation inspectors, external compliance reviewers) access Ibn Hayan through a read-only scope within the Compliance Officer role (R10). The read-only scope provides access to audit records, configuration records, and operational reporting without authority to modify any state. Auditor and inspector access is time-bounded and is granted through a documented authorization process. Auditor and inspector access is subject to enhanced audit, with audit records capturing the auditor's identity, the access period, and the records accessed.

### 8.4 External Role and Multi-Tenant Isolation

External roles are scoped to a single tenant per the multi-tenant isolation rules stated in `SYSTEM_ARCHITECTURE.md` Section 10.3. An integration account in tenant A has no access to tenant B's data; an auditor accessing tenant A has no access to tenant B's records. Cross-tenant external role assignment is forbidden and is rejected by the permission framework at assignment time. The single-tenant scoping of external roles is a primitive of the platform's multi-tenant architecture and is non-negotiable.

### 8.5 External Role Customization

External roles can be customized within the role composition framework, subject to integration governance and segregation-of-duty rules. Customers may define custom integration account roles that compose permissions from the Integration Account role's permission set, with narrower scope for specific integration responsibilities. For example, a customer may define a "Laboratory Integration Account" role that has permissions for laboratory result ingestion only. Custom external roles are tenant-scoped and are subject to the same lifecycle governance as platform-defined roles.

### 8.6 External Role and Contractual Governance

External role assignment is subject to contractual governance in addition to platform governance. Integration accounts are established under integration agreements that define the integration's scope, the data exchanged, and the responsibilities of each party. Auditor and inspector access is established under audit or inspection agreements that define the access period, the records accessible, and the use of the accessed information. Contractual governance is documented per engagement and is reviewed by the customer's legal and compliance teams before external role assignment.

---

## 9. Role Definitions

### 9.1 Role Definition Structure

Each role in the catalogue has a structured definition that documents the role's purpose, scope, permissions, and lifecycle. The definition is the canonical reference for the role and is the basis for role assignment, role customization, and role audit. Role definitions are versioned alongside the platform and are reviewed when the role's permissions or scope evolve. The definition structure is documented below, with each role's specific definition in Section 9.2.

| Definition Element | Description |
|---|---|
| Role code | Stable identifier (R01–R14) |
| Role name | Human-readable name |
| Category | Clinical, operational, administrative, or platform |
| Typical scope | Platform, tenant, facility, department, or care team |
| Permission scope | Read, write, execute, administer permissions on defined resources |
| Workflow responsibilities | Workflows the role participates in |
| Training pathway | Training material associated with the role |
| Lifecycle stage | Defined, Active, Restricted, Deprecated, or Retired |
| Segregation-of-duty rules | Other roles that cannot be held simultaneously |

### 9.2 Role Definitions Summary

The table below summarizes the role definitions for all 14 roles. The summary is the canonical quick-reference; full role definitions are documented in the per-role documentation under `docs/11_MODULES/M14_IdentityAccess/`.

| Code | Role | Category | Typical Scope | Key Permissions | Lifecycle Stage |
|---|---|---|---|---|---|
| R01 | Physician | Clinical | Facility, Department | Clinical read/write, orders, documentation | Active |
| R02 | Nurse | Clinical | Facility, Department | Clinical read, medication administration, documentation | Active |
| R03 | Pharmacist | Clinical | Facility, Department | Medication review, dispensing, clinical pharmacy | Active |
| R04 | Technician | Clinical | Facility, Department | Technical procedures, result production | Active |
| R05 | Allied Health Professional | Clinical | Facility, Department | Allied health interventions, documentation | Active |
| R06 | Receptionist | Operational | Facility, Department | Patient registration, scheduling, check-in | Active |
| R07 | Scheduler | Operational | Facility, Department | Appointment management, resource scheduling | Active |
| R08 | Biller | Operational (financial) | Facility, Department | Billing, claim submission, payment posting | Active |
| R09 | Administrator | Operational (administrative) | Facility | Facility administration, configuration, user provisioning | Active |
| R10 | Compliance Officer | Administrative | Tenant, Organization Unit | Audit review, regulatory compliance, privacy oversight | Active |
| R11 | HR Manager | Administrative | Tenant, Organization Unit | HR management, payroll oversight, employee records | Active |
| R12 | Executive | Administrative | Customer, Organization Unit | Strategic oversight, financial oversight, governance | Active |
| R13 | System Administrator | Platform | Tenant | Tenant configuration, integration management, operational administration | Active |
| R14 | Integration Account | Platform | Tenant, narrow scope | System-to-system integration; non-human principal | Active |

### 9.3 Role Composition

Roles are composable, per `PRODUCT_BIBLE.md` Section 20.3. A user may hold multiple roles simultaneously, with permissions accumulating per defined rules. The composition rules are documented in `PERMISSIONS.md` Section 7 and are implemented by the Identity & Access module (M14). Composition is not unlimited; certain combinations are prohibited where they create segregation-of-duty conflicts. Prohibited combinations are enforced by the permission framework at assignment time and cannot be overridden through configuration.

### 9.4 Role Lifecycle

Roles have a lifecycle similar to module lifecycle, as stated in `PRODUCT_BIBLE.md` Section 20.4. The lifecycle stages are Defined (RC1), Active (RC2), Restricted (RC3), Deprecated (RC4), and Retired (RC5). Lifecycle transitions are ratified by the Product Council and are documented in the role's documentation. The transition from Defined to Active is automatic after the role's permission scope and training pathway are validated. Other transitions are explicit and require council ratification.

### 9.5 Role and Training Pathway

Each role has an associated training pathway, as stated in `PRODUCT_BIBLE.md` Section 20.6. Training pathways are role-specific, not generic; a physician's training covers clinical documentation, order entry, and encounter management, while a receptionist's training covers patient registration, scheduling, and check-in workflows. Training pathways are versioned alongside the platform and are updated when the platform's behaviour for that role evolves. Training material is communicated to customers through the platform's change-management channel.

---

## 10. Role Matrix

### 10.1 Role-Permission Matrix

The role-permission matrix documents which permissions are granted by each role. The matrix is large because every (action, resource) pair is a permission, as stated in `PRODUCT_BIBLE.md` Section 21.2. The summary below shows the matrix at the resource-category level; the full matrix at the action-resource level is documented in `PERMISSIONS.md` Section 5 and in the per-role documentation.

| Role | Patient Records | Encounter Records | Clinical Documentation | Orders & Results | Pharmacy | Billing | Configuration | Audit | Integration | Reporting |
|---|---|---|---|---|---|---|---|---|---|---|
| R01 Physician | Read/Write | Read/Write | Write | Execute | Read | Read | – | – | – | Read |
| R02 Nurse | Read | Read/Write | Write (nursing) | Execute (admin) | Read | – | – | – | – | Read |
| R03 Pharmacist | Read (med) | Read | Read | Read (med) | Read/Write | – | – | – | – | Read |
| R04 Technician | Read (order) | Read | – | Execute (tech) | – | – | – | – | – | Read |
| R05 Allied Health | Read | Read | Write (allied) | Execute (allied) | – | – | – | – | – | Read |
| R06 Receptionist | Read/Write (demog) | Read (sched) | – | – | – | Read (basic) | – | – | – | Read (limited) |
| R07 Scheduler | Read (demog) | Read/Write (sched) | – | – | – | – | – | – | – | Read (limited) |
| R08 Biller | Read (bill) | Read (bill) | – | – | – | Read/Write | – | – | – | Read (fin) |
| R09 Administrator | Read | Read | – | – | – | Read | Read/Write | Read | – | Read |
| R10 Compliance Officer | Read (audit) | Read (audit) | Read (audit) | Read (audit) | Read (audit) | Read (audit) | Read | Read | Read (audit) | Read |
| R11 HR Manager | – | – | – | – | – | – | Read (HR) | – | – | Read (HR) |
| R12 Executive | Read (summary) | Read (summary) | – | – | – | Read (summary) | Read (summary) | Read (summary) | – | Read (summary) |
| R13 System Administrator | – | – | – | – | – | – | Read/Write | Read | Read/Write | Read |
| R14 Integration Account | Per integration | Per integration | Per integration | Per integration | Per integration | Per integration | – | – | Per integration | – |

### 10.2 Matrix Reading Guide

The matrix is dense by design; each cell is a permission grant summary. Readers should focus on the cells relevant to their use case: customers evaluating role assignment should focus on the role's row; customers evaluating permission scope should focus on the resource's column. The matrix captures the most consequential permission grants but is not exhaustive; the full matrix at the action-resource level is documented in `PERMISSIONS.md`. The matrix is the starting point for role assignment, not the ending point; final role assignment should be informed by the customer's operational reality and by segregation-of-duty rules.

### 10.3 Matrix and Edition Interaction

The role-permission matrix is the same across editions; what differs between editions is which roles are available and which permissions are enabled by default. The Essential edition supports the roles required for primary care practice; the Professional edition adds administrative roles; the Enterprise edition supports the full role catalogue. Edition-specific role availability is documented in `EDITIONS.md` Section 7 and in the per-edition documentation.

### 10.4 Matrix and Customization

Customers may customize the role-permission matrix within the role composition framework. Custom roles compose existing permissions; they do not create new permissions. A custom role that requires a permission not in the platform's permission catalogue is not possible without platform extension; such extension is treated as a candidate for platform evolution, not as a customer-specific customization. Custom role support is elaborated in Section 12.

---

## 11. Role Assignment Workflow

### 11.1 Assignment Process

Role assignment is the process by which a user is granted a role in a tenant. The assignment process is structured into stages, each governed by documented criteria and recorded in the platform's audit trail. The process is the same across roles, with stage complexity scaled to the role's authority and segregation-of-duty exposure.

| Stage | Code | Description |
|---|---|---|
| Assignment request | A1 | Authorized requester initiates the assignment request |
| Authorization verification | A2 | System verifies the requester's authority to assign the role |
| Segregation-of-duty check | A3 | System verifies the assignment does not violate segregation rules |
| User notification | A4 | User notified of the assignment and the associated responsibilities |
| Assignment activation | A5 | Assignment activated; user gains the role's permissions |
| Training verification | A6 | User's training pathway completion verified (where required) |
| Assignment audit | A7 | Assignment recorded in audit trail with full context |

### 11.2 Assignment Authority

Role assignment authority is governed by the requesting user's own role and scope. The System Administrator role (R13) has authority to assign roles within the tenant; the Administrator role (R09) has authority to assign roles within the administrator's facility; the HR Manager role (R11) has authority to assign certain administrative roles. Assignment authority is documented per role and is enforced by the permission framework at assignment time. Unauthorized assignment attempts are rejected and are recorded in the audit trail for compliance review.

### 11.3 Assignment Lifecycle

Role assignments have a lifecycle that mirrors user engagement. An assignment is created when a user joins a role; an assignment may be modified (e.g., scope expansion, scope reduction); an assignment is revoked when a user leaves the role. Assignment lifecycle events are auditable and are subject to periodic review by the customer's compliance team. Long-standing assignments are reviewed for continued appropriateness; assignments that are no longer required are revoked to maintain least-privilege posture.

### 11.4 Assignment and Segregation of Duties

Assignment is subject to segregation-of-duty rules. An assignment that would create a prohibited role combination is rejected at the segregation-of-duty check stage (A3) with a clear message identifying the conflict. Segregation-of-duty rules are documented in the security documentation and are enforced by the permission framework. Customers cannot override segregation-of-duty rules through configuration; the rules are primitive controls for healthcare operations and are non-negotiable.

### 11.5 Assignment Audit

Every assignment event is auditable. The audit trail captures who initiated the assignment, when, with what authorization, what role was assigned, to whom, and at what scope. Assignment audit records are immutable and are the basis for compliance reporting and for incident investigation. Assignment audit is distinct from operational audit; assignment audit records how the platform's role assignments were managed, while operational audit records what users did with their assigned roles.

---

## 12. Custom Role Support

### 12.1 Custom Role Definition

Custom roles are customer-defined roles that compose existing permissions, as stated in `PRODUCT_BIBLE.md` Section 20.5. Custom roles are tenant-scoped; a custom role defined by one customer is not available to other customers. Custom roles are subject to the same lifecycle governance as platform-defined roles, with the customer's system administrator responsible for role lifecycle within the tenant. Custom roles do not create new permissions; a custom role that requires a permission not in the platform's permission catalogue is not possible without platform extension.

### 12.2 Custom Role Composition

Custom roles compose existing permissions through the role composition framework. The composition is subject to segregation-of-duty rules; a custom role that would create a prohibited permission combination is rejected at definition time with a clear message identifying the conflict. The composition is documented per custom role and is auditable. Custom role definitions are versioned alongside the platform; definition changes are subject to the standard validation, versioning, and audit rules.

### 12.3 Custom Role Examples

The table below provides illustrative examples of custom roles. The examples are representative; the full custom role surface is documented in the per-tenant documentation.

| Custom Role | Composed From | Purpose |
|---|---|---|
| Clinical Lead | R01 Physician + limited R09 Administrator | Physician with department-level administrative authority |
| Billing Supervisor | R08 Biller + limited R10 Compliance Officer | Biller with audit review authority for denial management |
| Multi-Site Physician | R01 Physician (multi-facility scope) | Physician practising across multiple facilities |
| Implementation Lead | R13 System Administrator (temporary scope) | System Administrator with time-bounded implementation scope |
| Quality Coordinator | R05 Allied Health + limited R10 Compliance Officer | Allied health professional with quality measurement authority |

### 12.4 Custom Role Governance

Custom roles are governed by the customer's own role governance process, supported by the platform's tooling. The platform provides role definition validation, role composition verification, role lifecycle tracking, and role assignment audit. The customer's system administrator is responsible for using these tools to govern custom roles within the tenant. The platform does not impose a specific governance workflow; it imposes the framework within which governance is exercised, in keeping with the configuration governance posture stated in `PRODUCT_BIBLE.md` Section 22.7.

### 12.5 Custom Role and Platform Evolution

Custom roles may reveal platform evolution opportunities. A custom role that requires a permission not in the platform's permission catalogue indicates a gap in the platform's permission framework; the gap is referred to the platform evolution intake process for assessment. If accepted, the gap is added to the platform's permission roadmap and may be addressed in a future platform release. This posture ensures that custom role needs inform platform evolution, in keeping with Principle P-8 (Verified Practice Over Hypothetical Capability) and the platform's product-driven evolution posture.

---

## 13. Related Documents

### 13.1 Upstream Documents

This document elaborates and is bounded by the following upstream documents. In case of conflict, the upstream document prevails.

| Document | Path | Relevance |
|---|---|---|
| Product Bible | `docs/00_PROJECT/PRODUCT_BIBLE.md` | Section 20 (User Roles Overview) is the canonical role catalogue; Section 21 (Permission Philosophy) defines the permission framework that roles operate within; Section 22 (Configuration-Driven Philosophy) defines the configuration surface for custom roles |
| System Architecture | `docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` | Section 11 (Organization Hierarchy) defines the scope levels roles operate within; Section 13 (Module Architecture) defines the Identity & Access module (M14) that implements the role framework |

### 13.2 Downstream Documents

The following downstream documents elaborate aspects of roles referenced in this document.

| Document | Path | Relevance |
|---|---|---|
| Permissions | `docs/02_PRODUCT/PERMISSIONS.md` | Permission framework that roles assign; role-permission matrix at action-resource level |
| Modules | `docs/02_PRODUCT/MODULES.md` | Module catalogue that defines the resources roles act on |
| Workflows | `docs/02_PRODUCT/WORKFLOWS.md` | Workflow definitions that roles participate in |
| Features | `docs/02_PRODUCT/FEATURES.md` | Feature availability by role |
| Editions | `docs/02_PRODUCT/EDITIONS.md` | Edition-specific role availability |
| Clinic Types | `docs/02_PRODUCT/CLINIC_TYPES.md` | Per-clinic-type role recommendations |
| Module Architecture | `docs/01_ARCHITECTURE/MODULE_ARCHITECTURE.md` | Identity & Access module (M14) internals |

### 13.3 Document Maintenance

This document is maintained by the Office of the Chief Product Officer and is reviewed quarterly by the Product Council. Catalogue changes — additions, deprecations, lifecycle transitions — are ratified by the Product Council and are recorded through the amendment mechanism defined in the document header. The document's version history is recorded in the platform CHANGELOG. Issues identified in this document are reported through the documentation issue channel and are resolved through the standard documentation revision process.
