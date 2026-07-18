# Ibn Hayan Healthcare Operating System — Authorization

| Field | Value |
|---|---|
| Document Title | Authorization Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Security/Compliance Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 31 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CISO |
| Custodian | Security Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Security architects, identity engineers, compliance officers, system administrators, integration architects, internal and external auditors |
| Scope | Authorization posture for all Ibn Hayan surfaces: permission model, access control types, resource/action/field authorization, contextual authorization, policy enforcement, audit, offline authorization, break-glass access, and authorization governance |
| Out of Scope | Implementation details, source code, API endpoint specifications, database schemas, UI component catalogues, deployment runbooks, vendor selection, specific policy expression language selection |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through architectural or security governance. |
| Amendment Mechanism | Security Council ratification through a documented Architecture Decision Record for material changes; minor revisions recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Authorization Overview
2. Authorization Model
3. Access Control Types (RBAC, ABAC, PBAC)
4. Resource Authorization
5. Action Authorization
6. Field Authorization
7. Contextual Authorization
8. Authorization Policies
9. Authorization Enforcement
10. Authorization Audit
11. Authorization Testing
12. Related Documents

---

## 1. Authorization Overview

### 1.1 Purpose of This Document

This document defines the authorization posture of the Ibn Hayan Healthcare Operating System. Authorization is the verification that an authenticated principal has permission to perform a specific action on a specific resource. It is the second control in the platform's defence-in-depth strategy and the gate through which every consequential action must pass after authentication. Authorization is treated as a primitive, not a feature, in keeping with Architectural Principle P13 (Auditability as Primitive) and the permission philosophy ratified in PRODUCT_BIBLE Section 21. The document is the canonical reference for authorization decisions across all Ibn Hayan surfaces: practitioner clients, patient portals, administrative consoles, integration accounts, and offline clients.

The document elaborates the architectural commitments defined in SYSTEM_ARCHITECTURE Section 20.4 (Authentication and Authorization) into operational policy. It is governed by the Office of the CISO, ratified by the Security Council, and amended through the documented ADR mechanism when material changes are introduced. Where this document and the architectural or product references diverge, the architectural and product references prevail.

### 1.2 Authorization as Primitive

Authorization is a primitive that governs every interaction with the Ibn Hayan platform. Every request that enters the Edge Layer, after authentication, is authorized before it reaches the Orchestration, Domain, or Data layers. A request that is not authorized is rejected at the Edge; no downstream layer is required to compensate for authorization failure. This posture is the architectural expression of the platform's commitment to defence in depth and least privilege.

Because authorization is a primitive, it is implemented at the platform layer and consumed by every module through the Identity & Access bounded context (BC15). Modules do not implement their own authorization; they consume the platform's authorization service through documented contracts. This pattern ensures that authorization behaviour is consistent across the Ibn Hayan platform and that authorization gaps do not emerge as modules evolve independently. The Identity & Access module (M14) is the deployable expression of BC15.

### 1.3 Authorization Posture

The Ibn Hayan authorization posture is stated as the following commitments. These commitments apply to every surface, every deployment model, and every tenant, and they are non-negotiable.

| Commitment | Description |
|---|---|
| Least privilege | Principals receive the minimum permissions required for their function |
| Default deny | Access is denied unless explicitly permitted |
| Action-level granularity | Permissions are defined at the action level on resources, not at the page level |
| Scoped permissions | Permissions are scoped through the organizational hierarchy |
| Explicit override | Permission overrides (break-glass) are explicit, audited, and time-bounded |
| Fully audited | Every authorization decision is recorded in the immutable audit trail |
| Tenant isolation | Authorization is tenant-scoped; cross-tenant authorization is forbidden |
| Offline-capable | Authorization continues during network outages through cached permissions |

### 1.4 Scope of Authorization

Authorization covers the verification of permission for human principals (clinicians, administrative staff, executives, patients, partners) and system principals (integration accounts, scheduled jobs, internal services). It does not cover the verification of the principal's identity; that is authentication, documented in `AUTHENTICATION.md`. The boundary between authentication and authorization is explicit and is enforced at the Edge Layer: authentication answers "who is this principal?", authorization answers "is this principal permitted to perform this action?".

The scope of this document includes the authorization model, the access control types, the resource/action/field authorization surfaces, the contextual authorization framework, the authorization policy framework, the enforcement point, the audit trail, and the governance of authorization configuration. The scope excludes the role catalogue and the role-permission matrix, which are documented in `ROLES_AND_PERMISSIONS.md`.

### 1.5 Relationship to Permissions

Authorization is the runtime enforcement of permissions. Permissions are the rules that define what a principal may do; authorization is the act of verifying that a permission is held and applying it to a specific action. The permission model is documented in `ROLES_AND_PERMISSIONS.md` and the permission philosophy is documented in PRODUCT_BIBLE Section 21; this document covers the runtime authorization that consumes those permissions. The two are tightly coupled and are governed together by the Security Council.

The relationship between authorization and permissions is analogous to the relationship between legislation and adjudication. Permissions are the legislation; authorization is the adjudication that applies the legislation to a specific case. Both are required; neither is sufficient alone. The platform's commitment to least privilege requires both that the permissions be minimal (the legislation be tightly drafted) and that the authorization be accurate (the adjudication be correct).

---

## 2. Authorization Model

### 2.1 Model Overview

The Ibn Hayan authorization model is a hybrid that combines role-based access control (RBAC) for broad permission assignment with attribute-based access control (ABAC) for fine-grained contextual decisions and policy-based access control (PBAC) for complex, multi-condition rules. The hybrid model is necessary because healthcare authorization requires both the administrative simplicity of RBAC (a physician has physician permissions) and the contextual precision of ABAC (a physician has access to a patient only if the patient is in their care team) and the policy expressiveness of PBAC (a physician may access a restricted record only during an active encounter and with documented justification).

The model is implemented at the platform layer and is consumed by every module through the Identity & Access module. The model's behaviour is consistent across surfaces; a principal who is permitted to perform an action through one surface is permitted through all surfaces, and a principal who is denied is denied through all surfaces. There is no "back door" through which an action can be performed without authorization.

### 2.2 Permission Resolution

Permission resolution is the process by which the platform determines whether a principal holds a specific permission. The resolution process begins with the principal's authenticated identity and proceeds through the role assignments, the permission inheritance through the organizational hierarchy, the contextual attributes, and any active policy rules. The result is a decision: permit or deny, with the decision recorded in the audit trail.

| Step | Description |
|---|---|
| 1. Identity | The principal's authenticated identity is established by authentication |
| 2. Roles | The principal's role assignments are retrieved, scoped to the requested tenant |
| 3. Permissions | The permissions granted by the roles are enumerated, with inheritance applied |
| 4. Scope | The permissions are scoped to the requested resource's organizational hierarchy position |
| 5. Attributes | Contextual attributes (e.g., care team membership) are evaluated |
| 6. Policies | Applicable policy rules are evaluated |
| 7. Override | Active break-glass or temporary grants are evaluated |
| 8. Decision | The final permit or deny decision is recorded and returned |

The resolution process is deterministic; given the same inputs, it produces the same decision. The determinism is a critical property that supports audit investigation and compliance demonstration. The resolution process is also performant; the platform's permission caching strategy, documented in Section 9 (Authorization Enforcement), ensures that the resolution does not become a performance bottleneck.

### 2.3 Permission Caching

Permission resolution results are cached to support performance. The cache is keyed by the principal, the tenant, the resource, and the action; a cache hit returns the cached decision without re-running the resolution process. The cache is invalidated on permission changes, on role assignment changes, on configuration changes that affect permissions, and on a defined time-to-live to prevent stale decisions.

The cache is conservative. A cache miss is preferred over a stale permit; a stale permit would grant access that should be denied. The cache's invalidation strategy is documented and is reviewed periodically for currency. A defect in the cache invalidation that produces a stale permit is treated as a security incident and triggers the documented incident response process.

### 2.4 Permission Inheritance

Permissions inherit through the organizational hierarchy defined in SYSTEM_ARCHITECTURE Section 11. A permission granted at the organization level applies to all facilities within the organization unless overridden. A permission granted at the facility level applies to all departments within the facility unless overridden. Inheritance is explicit, documented, and auditable, in keeping with PRODUCT_BIBLE Section 21.5.

Inheritance is not automatic. A role assigned at the organization level does not automatically propagate to lower levels; the role must be explicitly scoped to apply at lower levels. This prevents accidental over-permissioning through inheritance misconfiguration. The scoping decision is documented in the role assignment record and is auditable.

### 2.5 Permission Composition

A principal may hold multiple roles simultaneously, with permissions accumulating per defined rules. The composition rules are documented in PRODUCT_BIBLE Section 20.3 and in `ROLES_AND_PERMISSIONS.md`. The composition is not unlimited; certain role combinations are prohibited where they create segregation-of-duty conflicts. The composition is enforced at the Identity & Access module and is auditable.

Permission composition follows a "permissive union with override" model. The principal's effective permissions are the union of the permissions granted by all assigned roles, with deny permissions overriding permit permissions where the two conflict. The deny-override rule is a security control; it ensures that a deny permission is not silently overridden by a permit permission from another role.

### 2.6 Default Deny

The platform's default authorization decision is deny. If a principal's permissions do not explicitly permit an action, the action is denied. There is no "default permit" for any resource or action; every permission must be explicitly granted. The default-deny posture is ratified in PRODUCT_BIBLE Section 21 and is implemented consistently across all surfaces.

Default deny is enforced at the Edge Layer. A request that reaches the Edge Layer without a clear permit decision is rejected; the rejection is recorded in the audit trail. The default-deny posture is the foundation of the platform's least-privilege commitment; it ensures that permissions granted are the minimum necessary, with the burden of justification on the permission grant rather than on the denial.

---

## 3. Access Control Types (RBAC, ABAC, PBAC)

### 3.1 Role-Based Access Control (RBAC)

RBAC is the platform's primary access control mechanism. Permissions are assigned to roles; roles are assigned to principals. RBAC provides the administrative simplicity required for healthcare operations, where hundreds or thousands of principals must be managed efficiently. The 14-role catalogue defined in PRODUCT_BIBLE Section 20 and detailed in `ROLES_AND_PERMISSIONS.md` is the RBAC foundation.

RBAC's strength is its stability. Roles evolve slowly even as the platform's surface evolves quickly; the Physician role has been the Physician role for decades and will continue to be so. This stability makes RBAC the appropriate mechanism for the broad permission assignments that constitute the majority of authorization decisions.

RBAC's weakness is its lack of contextual precision. A physician has physician permissions; RBAC does not, by itself, express that a physician has access to a specific patient only if the patient is in their care team. This contextual precision is provided by ABAC, documented in Section 3.2.

### 3.2 Attribute-Based Access Control (ABAC)

ABAC is the platform's mechanism for contextual authorization. ABAC evaluates attributes of the principal, the resource, the action, and the environment to make authorization decisions. Examples of attributes include the principal's care team membership, the resource's organizational hierarchy position, the action's risk classification, and the environment's time of day.

ABAC's strength is its contextual precision. A physician's RBAC permission to read patient records is constrained by ABAC rules that limit the permission to patients in the physician's care team, within the physician's facility, during the physician's active shift. This precision is necessary for healthcare operations, where broad access is inappropriate and where contextual access is the norm.

ABAC's weakness is its complexity. ABAC rules are difficult to author, difficult to validate, and difficult to audit. The platform's ABAC framework provides authoring tools, validation rules, and audit surfaces that mitigate this complexity, but ABAC remains a mechanism for specialists (system administrators, compliance officers), not for routine configuration.

### 3.3 Policy-Based Access Control (PBAC)

PBAC is the platform's mechanism for complex, multi-condition authorization rules. PBAC combines RBAC and ABAC with additional policy logic, such as temporal rules (a permission is valid only during a specific time window), conditional rules (a permission is valid only if a documented justification is provided), and workflow rules (a permission is valid only if a specific workflow step has been completed).

PBAC's strength is its expressiveness. A PBAC policy can express rules that RBAC and ABAC alone cannot, such as "a principal may access a restricted patient record only during an active encounter, with documented justification, with break-glass invoked, and with the access reviewed by a compliance officer within 24 hours." PBAC policies are documented, validated, and auditable.

PBAC's weakness is its opacity. A PBAC policy that is poorly documented can produce decisions that are difficult to explain. The platform's PBAC framework requires that every policy be documented with its rationale, its conditions, and its review cadence; a policy that is not documented is treated as a defect.

### 3.4 Hybrid Model

The hybrid RBAC-ABAC-PBAC model is the platform's authorization foundation. RBAC provides the broad permission assignments; ABAC provides the contextual precision; PBAC provides the complex policy rules. The three mechanisms are coordinated through the Identity & Access module, with the resolution process documented in Section 2.2.

The hybrid model is not a "use the right tool for the job" model; it is a layered model in which RBAC is evaluated first, ABAC is evaluated second, and PBAC is evaluated third. The layering ensures that a denial at any layer is final; a principal who is denied by RBAC is not re-evaluated by ABAC. The layering is documented and is consistent across surfaces.

### 3.5 Access Control and Segregation of Duties

Segregation of duties is the practice of ensuring that no single principal can perform all steps of a sensitive process. The platform enforces segregation of duties through role combination prohibitions, documented in PRODUCT_BIBLE Section 20.3 and in `ROLES_AND_PERMISSIONS.md`. A principal who holds the Biller role cannot simultaneously hold the Compliance Officer role for the same financial scope; the platform rejects the assignment.

Segregation of duties is enforced at the Identity & Access module at role assignment time. A role assignment that violates a segregation-of-duty rule is rejected, with the rejection recorded in the audit trail. The segregation rules are documented and are reviewed annually by the Security Council.

### 3.6 Access Control and Tenant Isolation

Access control is tenant-scoped. A principal's permissions are valid only within the tenant for which they were assigned; cross-tenant authorization is forbidden. A principal who holds credentials in multiple tenants has separate permission sets in each tenant, with no cross-tenant permission inheritance. The tenant scoping is enforced at the Edge Layer and is non-negotiable, in keeping with ADR-004 (Multi-Tenant Strategy).

The tenant scoping of access control is itself a security control. An attacker who compromises a principal's credentials in one tenant does not gain access to other tenants; the attacker's permissions are limited to the compromised tenant. This isolation is a critical defence against the lateral movement that characterizes many security incidents.

---

## 4. Resource Authorization

### 4.1 Resource Catalogue

Resources are the entities on which actions are performed. The Ibn Hayan resource catalogue is organized by bounded context, with each bounded context owning its resources. The catalogue is large because the platform's surface is large; it is stable because bounded contexts evolve slowly, in keeping with Architectural Principle P8 (Bounded Contexts Are Stable).

| Resource Category | Example Resources | Owning Bounded Context |
|---|---|---|
| Patient | Patient record, patient identifier, patient demographics | BC01 (Patient) |
| Encounter | Encounter, encounter note, encounter diagnosis | BC02 (Encounter) |
| Clinical documentation | Clinical note, care plan, observation | BC03 (Clinical Documentation) |
| Orders and results | Order, result, observation | BC04 (Orders & Results) |
| Pharmacy | Medication, prescription, dispensation | BC05 (Pharmacy) |
| Scheduling | Appointment, schedule, slot | BC06 (Scheduling) |
| Documents | Document, document version, document tag | BC07 (Documents) |
| Billing | Claim, invoice, payment | BC08 (Billing) |
| Accounting | Journal entry, account, ledger | BC09 (Accounting) |
| Configuration | Configuration record, configuration version, feature flag | BC16 (Configuration) |
| Audit | Audit record, audit query | BC17 (Audit) |
| Identity | User, role, permission, session | BC15 (Identity & Access) |

The resource catalogue is the basis for resource authorization. A resource that is not in the catalogue cannot be authorized; this prevents ad-hoc resource creation that would bypass authorization. New resources are added through the bounded context's extension surface, with the addition documented and reviewed.

### 4.2 Resource Identification

Resources are identified by a stable resource identifier that is unique within the bounded context and that is composed with the tenant identifier to produce a globally unique identifier. The resource identifier is the key against which authorization is performed; the authorization decision is "may this principal perform this action on the resource with this identifier?".

Resource identification is documented per bounded context. The identification scheme is stable; a resource's identifier does not change over the resource's lifetime. A resource that is deleted has its identifier retired, not reused; this prevents identifier confusion in audit records and in authorization decisions.

### 4.3 Resource Scope

Resources are scoped through the organizational hierarchy. A patient resource is associated with a facility; an encounter resource is associated with a department within that facility. The resource's scope is part of the authorization decision; a principal with permission to read patient records at the facility level is permitted to read patients at that facility, including patients in departments within the facility.

Resource scope is documented per resource. The scope is recorded at resource creation and is updated as the resource moves through the hierarchy (for example, when a patient is transferred between facilities). Scope updates are auditable and are subject to the configuration governance framework.

### 4.4 Resource Lifecycle Authorization

Resources have a lifecycle, and authorization may vary across the lifecycle. A clinical note that is in draft may be editable by its author; the same note, once finalized, may be read-only for all principals except through the documented amendment workflow. The lifecycle-based authorization is enforced through the resource's owning bounded context, with the lifecycle states documented per resource type.

Lifecycle authorization is critical for healthcare compliance. A medical record that is finalized cannot be modified; modifications must be made through the documented amendment workflow, which produces a new version of the record with the original version preserved. This immutability is a compliance requirement and is enforced at the resource authorization layer.

### 4.5 Resource Relationships

Resources have relationships, and authorization may traverse relationships. A principal who is authorized to read an encounter may be authorized to read the orders placed during the encounter, the results returned for those orders, and the clinical notes documented during the encounter. The relationship-based authorization is governed by documented rules that specify which relationships confer which permissions.

Relationship-based authorization is conservative. A relationship that is not documented does not confer permission; a principal who is authorized to read an encounter is not automatically authorized to read the patient's billing records, even though the billing records may be related to the encounter. The conservatism prevents over-permissioning through relationship traversal.

### 4.6 Resource Ownership

Resources have an owning principal, who has elevated permissions on the resource. The author of a clinical note has edit permission on the note while it is in draft; the patient's primary care physician has read permission on the patient's record beyond the scope of routine care team access. Resource ownership is documented at resource creation and is auditable.

Resource ownership does not confer unrestricted permission. The owner of a clinical note cannot delete the note, even though they can edit it; deletion is governed by the retention policy documented in `DATA_RETENTION.md`. Resource ownership is a refinement of authorization, not a bypass of it.

---

## 5. Action Authorization

### 5.1 Action Catalogue

Actions are the operations that principals perform on resources. The Ibn Hayan action catalogue is small and stable, comprising the actions that are meaningful across all resources. The catalogue is documented below; new actions are added only through architectural decision, in keeping with the platform's commitment to stability.

| Action | Description | Risk Class |
|---|---|---|
| Read | View a resource's contents | Low |
| Write | Create or update a resource | Medium |
| Execute | Trigger a resource's behaviour (e.g., run a report, execute a workflow) | Medium |
| Administer | Manage a resource's configuration, including permissions | High |
| Delete | Remove a resource | High |
| Export | Extract a resource's contents to an external format | High |
| Share | Disclose a resource to an external party | High |
| Amend | Modify a finalized resource through the documented amendment workflow | High |

The action catalogue is the basis for action authorization. An action that is not in the catalogue cannot be authorized; this prevents ad-hoc action creation that would bypass authorization. The risk class informs the authorization posture, with high-risk actions requiring additional controls such as step-up authentication or break-glass invocation.

### 5.2 Action Risk Classification

Actions are classified by risk, with the risk class informing the authorization posture. Low-risk actions are permitted through routine authorization; high-risk actions require additional controls. The risk classification is documented per action and is reviewed annually by the Security Council.

| Risk Class | Additional Controls |
|---|---|
| Low | None; routine authorization sufficient |
| Medium | Step-up authentication may be required for in-scope resources |
| High | Step-up authentication required; break-glass invocation required for restricted resources; compliance review required for sensitive resources |

Risk classification is conservative. An action whose risk is uncertain is classified as High, with the additional controls applied. The conservatism prevents under-protection of actions whose risk is genuinely high but poorly understood. Risk classification is documented and is reviewable by auditors.

### 5.3 Action and Resource Combination

Authorization is performed on the combination of action and resource. A principal who is permitted to read patient records is not automatically permitted to delete patient records; the delete action requires separate authorization. The action-resource combination is the unit of authorization, and the permission catalogue is structured as action-resource pairs.

The action-resource combination produces a large but stable permission matrix. The matrix is large because every (action, resource) pair is a permission; it is stable because actions and resources evolve slowly. The matrix is documented in `ROLES_AND_PERMISSIONS.md` and is the canonical reference for what permissions exist.

### 5.4 Action Authorization Workflow

Action authorization proceeds as follows. The principal initiates an action on a resource. The Orchestration Layer receives the action and submits it to the Identity & Access module for authorization. The module resolves the principal's permissions per the resolution process documented in Section 2.2 and returns a decision. On permit, the Orchestration Layer proceeds with the action; on deny, the Orchestration Layer rejects the action and returns an error to the principal.

The workflow is synchronous for routine actions. For high-risk actions, the workflow includes step-up authentication, which is asynchronous (the principal must respond to an MFA challenge). For break-glass actions, the workflow includes the break-glass invocation, which is itself a documented sub-workflow.

### 5.5 Action Audit

Every action authorization decision is audited. The audit record captures the principal, the tenant, the resource, the action, the decision, the scope context, and the time. Action audit records are the basis for compliance reporting and for incident investigation. The audit records are immutable, in keeping with Architectural Principle P13 and the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Action audit records are reviewed by the platform's security monitoring, with anomalous patterns triggering alerts. A principal who performs an unusual number of high-risk actions, or who performs actions at unusual times, is flagged for review by the security operations team. The review is itself audited.

### 5.6 Action and Workflow Integration

Actions are integrated with the platform's workflow engine, documented in `WORKFLOWS.md`. A workflow step that requires a specific action is authorized before the step is executed; a principal who is not authorized for the action cannot execute the step. The integration ensures that authorization is enforced consistently across workflow and non-workflow actions.

Workflow authorization is documented per workflow definition. The workflow definition specifies which actions are required, which roles are permitted to perform each action, and which contextual attributes must be satisfied. The workflow definition is validated before activation, with the validation confirming that the authorization rules are well-formed and consistent with the platform's authorization posture.

---

## 6. Field Authorization

### 6.1 Field-Level Granularity

Field authorization is the platform's mechanism for controlling access to specific fields within a resource. A principal who is authorized to read a patient record may be authorized to read some fields (e.g., demographics) but not others (e.g., behavioral health notes, which are subject to stricter access controls). Field authorization is enforced at the Domain Layer, with the field set returned to the requesting surface filtered to the fields the principal is authorized to read.

Field authorization is necessary because healthcare records contain fields of varying sensitivity. A blanket read permission on a patient record would grant access to fields that should be restricted; field authorization provides the granularity to control access to sensitive fields. The field authorization model is documented per resource type, with the sensitive fields identified and the access rules defined.

### 6.2 Field Classification

Fields are classified by sensitivity, with the sensitivity class informing the access rules. The classification is documented per resource type and is reviewed annually by the Security Council.

| Sensitivity Class | Description | Access Rule |
|---|---|---|
| Public | Demographic fields such as name and date of birth | Routine read permission sufficient |
| Clinical | General clinical fields such as diagnoses and medications | Care team membership required |
| Sensitive | Fields such as behavioral health notes, HIV status, substance abuse history | Explicit permission required; access audited and reviewed |
| Restricted | Fields such as genetic information, certain sexual health data | Break-glass invocation required; access reviewed by compliance officer |

The field classification is conservative. A field whose sensitivity is uncertain is classified as Sensitive, with the additional access rules applied. The conservatism prevents inadvertent disclosure of sensitive information through under-classification.

### 6.3 Field Authorization Enforcement

Field authorization is enforced at the Domain Layer. When a principal requests a resource, the Domain Layer retrieves the resource, evaluates the principal's field-level permissions, and returns a filtered view that contains only the fields the principal is authorized to read. The filtering is transparent to the requesting surface; the surface does not know which fields were filtered.

Field authorization is also enforced on writes. A principal who is authorized to write a resource may be authorized to write some fields but not others. For example, a nurse may be authorized to write vital signs but not to write physician orders. The write filtering is enforced at the Domain Layer, with writes to unauthorized fields rejected.

### 6.4 Field Authorization and Audit

Field authorization decisions are audited. The audit record captures the principal, the resource, the fields accessed (for reads) or written (for writes), the decision, and the time. Field-level audit is more detailed than resource-level audit and is used for investigation of suspected unauthorized access to sensitive fields.

Field-level audit for Sensitive and Restricted fields is reviewed by the compliance officer on a defined cadence. The review verifies that accesses were appropriate and that the documented justification (where required) was provided. The review is itself audited.

### 6.5 Field Authorization and Export

Field authorization is enforced on exports. A principal who exports a resource receives only the fields they are authorized to read; sensitive fields are redacted or omitted from the export. The export's field set is documented in the export's audit record, allowing verification that no unauthorized fields were exported.

Field authorization on exports is critical for compliance. A principal who exports a patient record for transfer to another facility must not include fields that the receiving facility is not authorized to receive; field authorization enforces this constraint automatically. The constraint is documented per export type and is auditable.

### 6.6 Field Authorization Customization

Field authorization is customizable within the platform's framework. A tenant may define additional sensitive fields, may adjust the access rules for existing fields, and may create custom field classifications. Customization is performed through the configuration surface and is subject to the configuration governance framework documented in PRODUCT_BIBLE Section 22.7.

Field authorization customization does not permit weakening the platform's defaults. A tenant may classify additional fields as Sensitive but may not reclassify Sensitive fields as Public. The platform-level field classification is a floor, not a ceiling; tenants may strengthen but not weaken. The floor is ratified by the Security Council and is non-negotiable.

---

## 7. Contextual Authorization

### 7.1 Contextual Attributes

Contextual authorization is the platform's mechanism for authorization decisions that depend on the context of the action. Context is expressed through attributes that describe the principal, the resource, the action, and the environment. Examples of contextual attributes include the principal's care team membership, the resource's encounter status, the action's risk class, and the environment's time of day.

| Attribute Category | Example Attributes |
|---|---|
| Principal attributes | Care team membership, role scope, facility assignment, shift status |
| Resource attributes | Encounter status, resource owner, resource sensitivity class, resource age |
| Action attributes | Risk class, workflow step, break-glass state |
| Environmental attributes | Time of day, day of week, network location, device type |

Contextual attributes are evaluated at authorization time. The attributes are retrieved from the Identity & Access module, from the resource's owning bounded context, and from the environment. The retrieval is performant, with attributes cached where appropriate to avoid repeated retrieval.

### 7.2 Care Team Membership

Care team membership is the most consequential contextual attribute for clinical authorization. A principal is permitted to access a patient's record only if the principal is a member of the patient's care team. Care team membership is established through documented workflows (assignment, encounter creation, referral) and is terminated through documented workflows (discharge, transfer, expiration).

Care team membership is enforced at the Domain Layer. A principal who requests a patient's record is evaluated for care team membership; a principal who is not a member is denied, with the denial recorded in the audit trail. Care team membership is also enforced on field authorization, with non-care-team members denied access to clinical fields even if they have routine read permission on the patient resource.

### 7.3 Encounter Status

Encounter status is a contextual attribute that constrains authorization based on the encounter's lifecycle state. A principal may be permitted to write to an encounter that is in the active state but not to an encounter that is in the closed state. The encounter status is part of the resource's state and is retrieved from the Encounter bounded context (BC02).

Encounter status authorization is enforced to preserve the integrity of the medical record. A closed encounter is a finalized record; modifications to a closed encounter must be made through the documented amendment workflow, not through routine writes. The enforcement prevents inadvertent or unauthorized modification of finalized records.

### 7.4 Time-Based Authorization

Time-based authorization constrains authorization based on the time of the action. A principal's permission may be valid only during their active shift, or only during business hours for non-urgent actions. Time-based authorization is enforced through the principal's shift assignment, documented in the Workforce module (M13/BC10).

Time-based authorization is conservative. A principal whose shift has ended retains read permission for a defined window (to support documentation completion) but loses write permission. The conservatism prevents actions taken outside the principal's documented working hours, which are more likely to be inappropriate or unauthorized.

### 7.5 Device-Based Authorization

Device-based authorization constrains authorization based on the device from which the action is initiated. A principal may be permitted to perform routine actions from a managed device but only permitted to perform high-risk actions from a device that meets additional security requirements (e.g., encrypted storage, current patch level). Device-based authorization is enforced through the device's registered posture, documented in the device management configuration.

Device-based authorization is enforced at the Edge Layer. The device's posture is verified at authentication and is re-verified periodically during the session. A device whose posture degrades during a session (e.g., a critical patch becomes required) is flagged, with the principal prompted to remediate or with the session terminated.

### 7.6 Network Location Authorization

Network location authorization constrains authorization based on the network from which the action is initiated. A principal may be permitted to perform routine actions from any network but only permitted to perform high-risk actions from a trusted network (e.g., the facility's internal network). Network location authorization is enforced at the Edge Layer.

The platform's zero-trust posture, ratified in SYSTEM_ARCHITECTURE Section 20.2, means that network location is not a basis for trust on its own. Network location authorization is an additional constraint on top of authentication and authorization, not a substitute for them. A principal on a trusted network is still authenticated and authorized; the trusted network only permits actions that would otherwise be denied based on network location.

---

## 8. Authorization Policies

### 8.1 Policy Framework

The Ibn Hayan authorization policy framework defines how policies are authored, validated, deployed, and reviewed. Policies are the rules that govern authorization decisions beyond the RBAC foundation; they express ABAC and PBAC rules in a documented, auditable form. The framework is implemented at the Identity & Access module and is consumed by the authorization resolution process documented in Section 2.2.

Policies are versioned, validated, and auditable, in keeping with the configuration-driven philosophy documented in PRODUCT_BIBLE Section 22. Policy changes are subject to the configuration governance framework, with high-risk changes requiring approval by the tenant's compliance officer. The policy framework is consistent across surfaces; a policy applies to all surfaces through which the affected actions can be performed.

### 8.2 Policy Authoring

Policy authoring is performed through the Identity & Access module's policy authoring surface. Policies are authored in a documented policy expression language that is reviewed by the Security Council. The language is designed to be expressive enough for healthcare authorization rules while remaining reviewable by compliance officers who are not policy specialists.

Policy authoring includes documentation. Every policy must include a rationale, a description of the conditions under which it applies, and a review cadence. A policy that is not documented is treated as a defect and is not deployed. The documentation requirement ensures that policies are reviewable and that the intent of a policy is recoverable even after the original author is no longer available.

### 8.3 Policy Validation

Policies are validated before deployment. Validation covers structural correctness (the policy is well-formed), referential correctness (referenced roles, resources, and actions exist), semantic correctness (the policy's conditions are internally consistent), contextual correctness (the policy is consistent with its scope), and regulatory correctness (the policy is consistent with the regulatory framework in force for the tenant's region).

A policy that fails validation is not deployed. The validation failure is reported to the author with diagnostic information. Validation failures are auditable. Validation is performed in a non-production environment before deployment to production, with the policy tested against a representative set of authorization scenarios.

### 8.4 Policy Deployment

Policy deployment is the process by which a validated policy is activated in production. Deployment is performed through the Identity & Access module's deployment surface, with the deployment authenticated and authorized. Deployment produces an audit record that captures the policy, the deployer, the time, and the validation result.

Deployment is reversible. A policy that produces undesired behaviour can be rolled back to a prior version, with the rollback itself versioned and auditable. Rollback is performed without engineering intervention, in keeping with the platform's configuration-driven philosophy. A policy that is rolled back is preserved in the version history for investigation.

### 8.5 Policy Review

Policies are reviewed on a defined cadence. The review verifies that the policy remains necessary, that its conditions remain appropriate, and that its documentation remains current. A policy that is no longer necessary is deprecated and retired through the documented deprecation process. A policy whose conditions are no longer appropriate is amended through the documented amendment process.

Policy review is performed by the tenant's compliance officer, with the review itself auditable. The compliance officer's review is documented in the policy's review record, with the record including the reviewer, the time, the findings, and any actions taken. Policy review is a critical control for preventing policy drift, in which accumulated policy changes produce an authorization posture that differs from the intended posture.

### 8.6 Policy Governance

Policy governance is the practice of managing policy change over time. Governance includes policy change approval workflows, policy review by compliance officers, policy testing in non-production environments, and policy communication to affected principals. Governance is customer-scoped, with each tenant defining their policy governance within the platform's framework.

Policy governance does not permit weakening the platform's defaults. A tenant may add policies that strengthen the platform's posture but may not remove policies that the platform requires. The platform-required policies are documented in the policy catalogue and are non-negotiable. A tenant that attempts to remove a platform-required policy is rejected, with the rejection recorded in the audit trail.

---

## 9. Authorization Enforcement

### 9.1 Enforcement Points

Authorization is enforced at multiple points in the platform's request flow. The Edge Layer enforces authentication-derived authorization (is the principal permitted to access the platform at all?). The Orchestration Layer enforces workflow-level authorization (is the principal permitted to execute this workflow step?). The Domain Layer enforces resource-level authorization (is the principal permitted to perform this action on this resource?). The Data Layer enforces tenant scoping (is the principal's tenant the same as the resource's tenant?).

The multiple enforcement points are a defence-in-depth measure. A request that bypasses one enforcement point is caught by another; the principal cannot perform an action without authorization at every layer. The enforcement is documented per layer and is reviewed periodically for currency.

### 9.2 Enforcement Consistency

Authorization enforcement is consistent across surfaces. A principal who is denied an action through one surface is denied through all surfaces; there is no surface that bypasses authorization. The consistency is enforced through the platform-layer implementation of authorization, with modules consuming the platform's authorization service rather than implementing their own.

Consistency is tested through the platform's testing strategy, documented in Section 11 (Authorization Testing). Tests cover each surface, with the tests verifying that authorization decisions are consistent. A surface that produces a different decision than other surfaces is treated as a defect and is remediated before deployment.

### 9.3 Enforcement Performance

Authorization enforcement is performant. The permission caching strategy documented in Section 2.3 ensures that the common case (a cached decision) is fast; the uncommon case (a cache miss that requires full resolution) is bounded by the resolution process's documented performance characteristics. The platform's service level objectives include authorization latency targets, with the targets reviewed quarterly.

Performance regression in authorization is treated as a defect. Slow authorization encourages workarounds (principals requesting broader permissions to avoid the latency of fine-grained authorization) that compromise the least-privilege posture. Performance regression is addressed before deployment, with the address including optimization of the resolution process or revision of the caching strategy.

### 9.4 Enforcement Failure Handling

Enforcement failure is handled conservatively. If the authorization service is unavailable, the default decision is deny; the platform does not permit actions without a clear permit decision. The conservative default is a security control; it ensures that an outage of the authorization service does not produce unauthorized access.

The conservative default has operational consequences. During an authorization service outage, principals cannot perform actions; clinical work may be delayed. The platform's offline-first posture (SYSTEM_ARCHITECTURE Section 24) mitigates this consequence through cached permissions, with offline authorization documented in Section 9.5. The mitigation is not perfect; a prolonged authorization service outage affects clinical workflow, and the platform's incident response process prioritizes restoration of the authorization service.

### 9.5 Offline Enforcement

Offline authorization is the platform's mechanism for enforcing authorization during network outages. Offline clients hold cached permissions that are valid for a defined offline window. The cached permissions are a subset of the principal's online permissions, with the subset selected to support the principal's offline workflow without granting permissions that should be re-evaluated online.

Offline authorization is enforced at the client, with the enforcement auditable locally. The local audit records are synchronized to the central audit trail when connectivity is restored, with the synchronization preserving audit record integrity. Offline authorization is documented in `AUTHENTICATION.md` Section 8.4 and in SYSTEM_ARCHITECTURE Section 24.

### 9.6 Enforcement Audit

Every authorization enforcement decision is audited. The audit record captures the principal, the tenant, the resource, the action, the decision, the scope context, and the time. Enforcement audit records are the basis for compliance reporting and for incident investigation. The audit records are immutable, in keeping with Architectural Principle P13 and the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Enforcement audit records are reviewed by the platform's security monitoring, with anomalous patterns triggering alerts. A principal who experiences an unusual number of denials is flagged for review; the denials may indicate a permission configuration defect or an attempted unauthorized access. The review is itself audited.

---

## 10. Authorization Audit

### 10.1 Audit Posture

Authorization audit is the platform's mechanism for recording every authorization decision. The audit posture is comprehensive: every decision, whether permit or deny, is recorded. The comprehensiveness is a direct consequence of Architectural Principle P13 (Auditability as Primitive) and is non-negotiable. An authorization decision that is not audited is treated as a critical defect.

The audit posture supports both security investigation and compliance demonstration. Security investigation benefits from the record of denials (which may indicate attacks) and from the record of permits (which may indicate access that should be reviewed). Compliance demonstration benefits from the record of permits (which demonstrate that access was authorized) and from the record of denials (which demonstrate that unauthorized access was prevented).

### 10.2 Audit Record Structure

The authorization audit record captures the following fields, in keeping with the audit record structure documented in SYSTEM_ARCHITECTURE Section 27.4.

| Field | Description |
|---|---|
| Timestamp | When the decision was made |
| Actor | Who requested the action |
| Tenant | Which tenant the decision belongs to |
| Resource | What resource was the target of the action |
| Action | What action was requested |
| Decision | Permit or deny |
| Reason | The basis for the decision (role, permission, contextual attribute, policy) |
| Scope | The organizational hierarchy scope at which the decision was made |
| Context | Additional context (session, device, network location) |

The audit record structure is stable. New fields may be added, but existing fields are not removed or renamed, ensuring backward compatibility of audit queries. The stability supports long-term audit investigation and compliance demonstration.

### 10.3 Audit Query

Authorization audit records are queryable through the audit query surface documented in `AUDIT.md` and in SYSTEM_ARCHITECTURE Section 27.6. Query is governed by the permission framework; only authorized roles can query audit records, and queries are scoped to the querier's authority. A compliance officer may query audit records within their facility; a tenant system administrator may query audit records within their tenant; platform-level administrative roles may query audit records across tenants for platform-level investigation.

Audit query supports time-range, actor, resource, action, and composite queries, with the query itself audited. The audit of audit query is a control against investigation overreach; a compliance officer who queries audit records without authorization is detected through the audit of their queries.

### 10.4 Audit Retention

Authorization audit records are retained according to the platform's audit retention policy, documented in `DATA_RETENTION.md`. Retention periods are governed by regulatory requirements and are documented per data class. Authorization audit records are typically retained for the longest period required by any applicable regulatory framework, with retention extended where required.

Retention is enforced through the audit store's retention management, documented in SYSTEM_ARCHITECTURE Section 27.5. Records that have reached the end of their retention period are disposed of through the documented disposal process, with the disposal itself auditable. Records that are subject to legal hold are exempt from disposal until the hold is released.

### 10.5 Audit Review

Authorization audit records are reviewed on a defined cadence by the tenant's compliance officer. The review verifies that authorization decisions were appropriate, that denials were investigated, that permits were justified, and that anomalous patterns were addressed. The review is itself audited and is documented in the compliance officer's review record.

Review cadence varies by risk class. Routine authorization decisions are reviewed monthly; high-risk authorization decisions are reviewed weekly; break-glass invocations are reviewed within 24 hours. The cadence is documented in the tenant's compliance review policy and is non-negotiable for in-scope decisions.

### 10.6 Audit and Compliance Reporting

Authorization audit records are the basis for compliance reporting. Reports are generated from audit records, with reports tailored to specific regulatory requirements. Compliance reports are themselves auditable, with report generation recorded in the audit trail. The relationship between audit and compliance is documented in SYSTEM_ARCHITECTURE Section 27.8 and in `COMPLIANCE/HIPAA.md` and `COMPLIANCE/GDPR.md`.

Compliance reports are immutable once generated. A report that has been submitted to a regulator cannot be modified, even if subsequent data changes would produce a different report. The immutability is a compliance requirement and is enforced at the reporting layer.

---

## 11. Authorization Testing

### 11.1 Test Posture

Authorization is tested at multiple levels, with the testing posture reflecting the criticality of authorization to the platform's security. Testing covers functional correctness, security properties, performance under load, and resilience against attack. The testing posture is documented in the platform's testing strategy and is reviewed annually by the Security Council.

Authorization testing is performed before any change to authorization is deployed to production. Changes include new permissions, changes to existing permissions, changes to the Identity & Access module's authorization surface, and changes to authorization policies. Testing is automated where possible, with manual testing for scenarios that resist automation.

### 11.2 Functional Testing

Functional testing verifies that authorization behaves as documented. Test cases cover permit decisions for principals with appropriate permissions, deny decisions for principals without appropriate permissions, field-level authorization, contextual authorization, and policy-based authorization. Test cases are documented and versioned alongside the platform's authorization implementation.

Functional testing includes regression testing for changes that affect authorization. Regression testing verifies that a change does not inadvertently break existing authorization behaviour. Regression test cases are maintained as a living suite, with new cases added for defects discovered in production to prevent recurrence.

### 11.3 Security Testing

Security testing verifies that authorization resists attack. Test cases cover privilege escalation (attempting to perform an action without authorization), lateral movement (attempting to access resources outside the principal's scope), field-level bypass (attempting to access sensitive fields without authorization), and policy evasion (attempting to circumvent policy rules). Security testing is performed through automated tools and through manual penetration testing by qualified security testers.

Security testing includes red-team exercises that simulate realistic attacks on authorization. Red-team exercises are conducted periodically by the platform's security team and by external assessors. Results are documented and used to improve controls. A red-team exercise that successfully bypasses authorization is treated as a security incident and triggers the documented incident response process.

### 11.4 Performance Testing

Performance testing verifies that authorization performs within documented targets under expected and peak load. Test cases cover authorization throughput, authorization latency, and authorization behaviour under concurrent load. Performance testing is performed before deployment of authorization changes that may affect performance.

Performance targets are documented in the platform's service level objectives. Authorization latency is a critical metric because it directly affects practitioner experience; slow authorization encourages workarounds that compromise the least-privilege posture. Performance regression is treated as a defect and is addressed before deployment.

### 11.5 Resilience Testing

Resilience testing verifies that authorization continues to operate during partial platform failure. Test cases cover authorization during Edge Layer failure, during Identity & Access module failure, and during audit store failure. Resilience testing includes failover testing, with authorization failing over to redundant components without service interruption.

Resilience testing includes offline authorization testing, verifying that authorization continues during network outages. Offline authorization testing covers the cached permission flow, the offline decision audit, and the synchronization of offline audit records. Resilience testing is performed periodically and after changes that affect authorization's failure modes.

### 11.6 Test Audit

Authorization testing is itself auditable. Test execution produces records that capture the test cases executed, the results, and the environment in which the tests were run. Test records are retained per the platform's testing record retention policy and are reviewable by auditors and regulators. A change to authorization that has not been tested is not deployed; the absence of test records is treated as a defect in the change management process.

Test audit records support compliance demonstration. Regulators may require evidence that authorization has been tested; the test audit records provide that evidence. Test audit records are immutable, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

---

## 12. Related Documents

### 12.1 Upstream Documents

| Document | Relationship |
|---|---|
| PRODUCT_BIBLE.md Section 21 (Permission Philosophy) | Permission philosophy that this document elaborates |
| PRODUCT_BIBLE.md Section 27 (Security Philosophy) | Product-level security posture that governs authorization |
| PRODUCT_BIBLE.md Section 23 (Multi-Tenant Philosophy) | Multi-tenant posture that governs tenant scoping of authorization |
| SYSTEM_ARCHITECTURE.md Section 20 (Security Architecture) | Architectural commitments that this document elaborates |
| SYSTEM_ARCHITECTURE.md Section 10 (Multi-Tenant Architecture) | Tenant isolation architecture that governs authorization's tenant scoping |
| SYSTEM_ARCHITECTURE.md Section 11 (Organization Hierarchy) | Organizational hierarchy that governs permission scoping |
| SYSTEM_ARCHITECTURE.md Section 27 (Audit Architecture) | Audit architecture that governs authorization audit |
| ADR-004 (Multi-Tenant Strategy) | Ratifies logical multi-tenancy as default, governing authorization's tenant scoping |

### 12.2 Peer Documents

| Document | Relationship |
|---|---|
| AUTHENTICATION.md | Authentication posture; complementary to authorization |
| ROLES_AND_PERMISSIONS.md | Role catalogue and permission matrix; consumed by authorization |
| AUDIT.md | Audit posture; complementary to authorization |
| BACKUP.md | Backup posture; covers backup of authorization configuration |
| RECOVERY.md | Recovery posture; covers recovery of authorization service |
| COMPLIANCE/SECURITY_GUIDELINES.md | Comprehensive security guidelines; includes authorization guidelines |
| COMPLIANCE/HIPAA.md | HIPAA compliance; includes authorization requirements for PHI access |
| COMPLIANCE/GDPR.md | GDPR compliance; includes authorization requirements for personal data |
| COMPLIANCE/PRIVACY_POLICY.md | Privacy posture; covers authorization's privacy implications |
| COMPLIANCE/MEDICAL_RECORD_POLICY.md | Medical record policy; covers authorization for medical record access |

### 12.3 Downstream Documents

| Document | Relationship |
|---|---|
| docs/07_MODULES/Identity & Access (M14, future) | Module reference for the Identity & Access module, when authored |
| docs/02_PRODUCT/PERMISSIONS.md | Permission catalogue and model; consumed by authorization |
| docs/02_PRODUCT/USER_ROLES.md | Role catalogue; consumed by authorization |
| Authorization policy reference | Policy expression language and catalogue, maintained by the Office of the CISO |
| Authorization runbook | Operational procedures for authorization, maintained by the operations team |

### 12.4 Document Maintenance

This document is maintained by the Office of the CISO and is custodied by the Security Council. The document is reviewed quarterly, with off-cycle revision when a related ADR is ratified or when a security incident reveals a gap in the document's coverage. Changes are recorded in the change log with explicit version increment; material changes are ratified through the ADR mechanism.

The document's authority is elaborative, not constitutive. It elaborates the security posture ratified in SYSTEM_ARCHITECTURE Section 20 and the permission philosophy ratified in PRODUCT_BIBLE Section 21; where this document and either canonical reference diverge, the canonical reference prevails. The document's authority is sufficient to govern authorization decisions within the Ibn Hayan platform, subject to the canonical references' precedence.
