# Ibn Hayan Healthcare Operating System — Audit

| Field | Value |
|---|---|
| Document Title | Audit Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Security/Compliance Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 31 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CISO |
| Custodian | Security Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Security architects, compliance officers, internal and external auditors, system administrators, integration architects, regulators |
| Scope | Audit posture for all Ibn Hayan surfaces: audit event categories, audit logging, audit trail integrity, audit reports, audit log retention, audit review process, compliance audits, and audit tools and automation |
| Out of Scope | Implementation details, source code, API endpoint specifications, database schemas, UI component catalogues, deployment runbooks, vendor selection, specific audit store technology selection |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through architectural or security governance. |
| Amendment Mechanism | Security Council ratification through a documented Architecture Decision Record for material changes; minor revisions recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Audit Overview
2. Audit Scope
3. Audit Event Categories
4. Audit Logging
5. Audit Trail Integrity
6. Audit Reports
7. Audit Log Retention
8. Audit Review Process
9. Compliance Audits
10. Audit Tools & Automation
11. Related Documents

---

## 1. Audit Overview

### 1.1 Purpose of This Document

This document defines the audit posture of the Ibn Hayan Healthcare Operating System. Audit is the immutable record of consequential actions taken on the platform, including clinical, financial, operational, configurational, and security actions. Audit is treated as a primitive, not a feature, in keeping with Architectural Principle P13 (Auditability as Primitive) and the security posture ratified in SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 27 (Security Philosophy). The document is the canonical reference for audit decisions across all Ibn Hayan surfaces: practitioner clients, patient portals, administrative consoles, integration accounts, and offline clients.

The document elaborates the architectural commitments defined in SYSTEM_ARCHITECTURE Section 27 (Audit Architecture) into operational policy. It is governed by the Office of the CISO, ratified by the Security Council, and amended through the documented ADR mechanism when material changes are introduced. Where this document and the architectural or product references diverge, the architectural and product references prevail.

### 1.2 Audit as Primitive

Audit is a primitive that governs every consequential action on the Ibn Hayan platform. Every clinical action, every financial action, every operational action, every configuration change, every security event, and every administrative action is recorded in the audit trail, in keeping with the audit surface documented in SYSTEM_ARCHITECTURE Section 27.3. An action that is not audited is treated as a critical defect, and the module that did not audit the action is not shipped.

Because audit is a primitive, it is implemented at the platform layer and consumed by every module through the Audit bounded context (BC17). Modules do not implement their own audit; they consume the platform's audit service through documented contracts. This pattern ensures that audit behaviour is consistent across the Ibn Hayan platform and that audit gaps do not emerge as modules evolve independently. The Identity & Access module (M14) and the platform's audit services together deploy the audit primitive.

### 1.3 Audit Posture

The Ibn Hayan audit posture is stated as the following commitments. These commitments apply to every surface, every deployment model, and every tenant, and they are non-negotiable.

| Commitment | Description |
|---|---|
| Comprehensive | Every consequential action is audited, regardless of surface or path |
| Immutable | Audit records cannot be modified or deleted once written |
| Tamper-evident | Audit records are integrity-protected; tampering is detectable |
| Append-only | New records are appended; existing records are not changed |
| Query-optimized | Audit records are indexed for investigation queries |
| Retention-managed | Audit records are retained per regulatory requirements |
| Tenant-scoped | Audit records are tenant-scoped; cross-tenant audit access is forbidden |
| Offline-capable | Audit continues during network outages through local recording |

### 1.4 Scope of Audit

Audit covers the recording of consequential actions performed by human principals (clinicians, administrative staff, executives, patients, partners) and system principals (integration accounts, scheduled jobs, internal services). It does not cover the authorization of those actions (covered in `AUTHORIZATION.md`) or the authentication of the principals (covered in `AUTHENTICATION.md`); audit is the record of what was done, by whom, with what authorization, and with what result.

The scope of this document includes the audit event categories, the audit logging mechanism, the audit trail's integrity properties, the audit report framework, the audit log retention policy, the audit review process, compliance audits, and the audit tools and automation that support audit operations. The scope excludes the audit store's technology selection, which is documented in the database documentation per ADR-006 (Database Strategy).

### 1.5 Relationship to Compliance

Audit is the basis for compliance demonstration, as documented in SYSTEM_ARCHITECTURE Section 27.8. Compliance reporting is generated from audit records, with reports tailored to specific regulatory requirements. The relationship between audit and compliance is documented in `COMPLIANCE/HIPAA.md`, `COMPLIANCE/GDPR.md`, and other compliance documents. Audit is not compliance; audit is the data source from which compliance is demonstrated.

The platform's compliance posture is documented in `COMPLIANCE/SECURITY_GUIDELINES.md` and in the region-specific compliance documents. The compliance posture is reviewed annually by the Security Council and the Compliance Council, with changes communicated to affected customers through the platform's change-management channel.

### 1.6 Relationship to Security

Audit is tightly coupled with security, as documented in SYSTEM_ARCHITECTURE Section 20.6. Security protects against unauthorized action; audit records what action was taken, by whom, and with what authorization. The two together provide defence in depth against both unauthorized action and undetected action. The audit trail is itself a security control, in keeping with the platform's defence-in-depth posture.

The coupling is non-negotiable. A security event that is not audited is treated as a critical defect, and a security control that bypasses audit is rejected. The coupling is enforced at the platform layer, with the Identity & Access module and the Audit bounded context coordinated to ensure that every security-relevant action produces an audit record.

---

## 2. Audit Scope

### 2.1 Scope Definition

The Ibn Hayan audit scope defines what actions are audited. The scope is comprehensive: every consequential action is audited, regardless of the surface through which it was performed. There is no audit gap for actions performed through integrations, through administrative tools, or through edge-case workflows. The comprehensiveness is a direct consequence of Architectural Principle P13 (Auditability as Primitive) and is non-negotiable.

The scope is documented per surface, with each surface's audited actions enumerated in the surface's audit specification. The audit specification is maintained alongside the surface's contract documentation and is reviewed periodically for currency. A surface whose audit specification is not current is treated as a defect and is remediated.

### 2.2 Audited Action Categories

The platform audits actions across the categories documented in SYSTEM_ARCHITECTURE Section 27.3. The categories are summarized below, with the full catalogue maintained in the audit specification.

| Category | Description | Example Actions |
|---|---|---|
| Clinical actions | Actions affecting patient care | Patient registration, encounter documentation, order entry, result viewing, medication administration |
| Financial actions | Actions affecting billing and accounting | Billing, claim submission, payment posting, accounting entries |
| Operational actions | Actions affecting facility operations | Scheduling, document management, notification dispatch |
| Configuration actions | Actions affecting platform configuration | Configuration changes, feature flag changes, role and permission changes |
| Security actions | Actions affecting security posture | Authentication, authorization, emergency access, integration actions |
| Administrative actions | Actions affecting administration | User management, tenant management, integration management |

### 2.3 Consequential Action Definition

A consequential action is an action that affects the state of the platform, the data the platform holds, or the principal's ability to perform future actions. Consequential actions are audited; non-consequential actions (e.g., viewing a list of patients without opening any specific record) may be audited at a lower verbosity or may not be audited, depending on the surface and the regulatory framework in force for the tenant's region.

The consequential action definition is documented per surface. The definition is conservative; an action whose consequentiality is uncertain is treated as consequential and is audited. The conservatism prevents audit gaps through under-classification and supports the platform's compliance posture.

### 2.4 Audit Scope and Tenant Isolation

Audit scope is tenant-scoped. Audit records are tagged with the tenant identifier, and queries are scoped to a single tenant. Cross-tenant audit queries are forbidden except at the platform level, where authorized platform administrators may query audit records across tenants for platform-level investigation. The tenant scoping is enforced at the audit store and is non-negotiable, in keeping with ADR-004 (Multi-Tenant Strategy).

The tenant scoping of audit is a critical control for multi-tenant operation. A tenant's compliance officer can query their tenant's audit records without concern that they will inadvertently access another tenant's records. The tenant scoping also supports data residency; audit records are stored in the region specified by the tenant's contract, in keeping with the data residency commitments documented in PRODUCT_BIBLE Section 23.5.

### 2.5 Audit Scope and Offline Operation

Audit scope extends to offline operation. Actions performed on offline clients are audited locally, with the local audit records synchronized to the central audit trail when connectivity is restored. The offline audit posture is documented in SYSTEM_ARCHITECTURE Section 24.6 and Section 27.7 and is summarized here for completeness.

| Property | Offline Audit Behaviour |
|---|---|
| Recording | Local; same completeness as online |
| Immutability | Preserved; local audit store is append-only and tamper-evident |
| Synchronization | Bidirectional; conflicts resolved in favour of the original record |
| Conflict handling | The original record prevails; the conflicting record is preserved for investigation |
| Audit gap prevention | Offline audit records are not lost; synchronization is durable |

### 2.6 Audit Scope and Integration

Audit scope extends to integration actions. Actions performed by integration accounts (R14) are audited with the same completeness as actions performed by human principals. The audit record captures the integration account's identifier, the action, the resource, and the time, with the integration's authorized surfaces documented in the integration's configuration record.

Integration audit is critical for compliance. A regulator investigating an incident involving integrated data needs to trace the data's flow through the platform, including the actions performed by integrations. The integration audit trail supports that tracing, with the audit records queryable through the standard audit query surface.

---

## 3. Audit Event Categories

### 3.1 Event Category Catalogue

The Ibn Hayan audit event category catalogue organizes audit events into categories that support query, review, and compliance reporting. The categories are documented below, with the full event type catalogue maintained in the audit specification. The catalogue is reviewed annually by the Security Council, with new categories added as the platform's surface expands.

| Category Code | Category | Description |
|---|---|---|
| AEC1 | Clinical events | Events related to patient care, encounters, orders, results, medications |
| AEC2 | Financial events | Events related to billing, claims, payments, accounting |
| AEC3 | Operational events | Events related to scheduling, documents, notifications |
| AEC4 | Configuration events | Events related to configuration changes, feature flags, role and permission changes |
| AEC5 | Security events | Events related to authentication, authorization, emergency access, integration |
| AEC6 | Administrative events | Events related to user management, tenant management, integration management |
| AEC7 | Privacy events | Events related to data subject rights, consent changes, privacy preference changes |
| AEC8 | Compliance events | Events related to compliance reporting, legal holds, regulator interactions |

### 3.2 Clinical Events

Clinical events are the most consequential audit events because they directly affect patient care. Clinical events include patient registration, encounter creation and modification, clinical documentation, order entry, result viewing, medication ordering, medication administration, and clinical decision support interactions. Each clinical event produces an audit record that captures the principal, the patient, the action, the time, and the clinical context.

Clinical events are subject to the strictest audit requirements. They are retained for the longest period required by any applicable regulatory framework, they are queryable by the patient's care team and by compliance officers, and they are reviewable on a defined cadence. Clinical events support clinical safety investigation, compliance demonstration, and patient access to their own medical records.

### 3.3 Financial Events

Financial events affect billing and accounting. Financial events include claim creation, claim submission, payment posting, denial management, accounting entries, payroll runs, and financial report generation. Each financial event produces an audit record that captures the principal, the financial entity, the action, the time, and the financial impact.

Financial events are subject to financial regulatory requirements, with retention periods often set by tax and financial reporting regulations. Financial events are queryable by the Biller role, the HR Manager role, and the Compliance Officer role, subject to scope constraints. Financial events support financial audit, fraud investigation, and regulatory reporting.

### 3.4 Configuration Events

Configuration events affect platform configuration. Configuration events include configuration changes, feature flag changes, role and permission changes, integration configuration changes, and workflow definition changes. Each configuration event produces an audit record that captures the configurator, the configuration entity, the previous and new values, the time, and the validation result.

Configuration events are critical for incident investigation. An incident that follows a configuration change can be traced to the change through the configuration audit trail, with the change's author, time, and content documented. Configuration events are queryable by the System Administrator and the Compliance Officer, subject to scope constraints.

### 3.5 Security Events

Security events affect the platform's security posture. Security events include authentication successes and failures, authorization decisions (for high-risk actions), emergency access invocations, integration credential use, and security incident response actions. Each security event produces an audit record that captures the principal, the security action, the time, and the security context.

Security events are subject to security monitoring, with anomalous patterns triggering alerts to the security operations team. Security events are queryable by the Compliance Officer and by authorized platform administrators, subject to scope constraints. Security events support security investigation, compliance demonstration, and incident response.

### 3.6 Privacy Events

Privacy events affect data subject rights and privacy preferences. Privacy events include consent changes, privacy preference changes, data subject access requests, data subject rectification requests, data subject erasure requests, and data subject portability requests. Each privacy event produces an audit record that captures the data subject, the request, the action taken, the time, and the result.

Privacy events are subject to privacy regulatory requirements, including the GDPR's documentation requirements for data subject rights processing. Privacy events are queryable by the Compliance Officer and by the Data Protection Officer (where designated), subject to scope constraints. Privacy events support privacy compliance demonstration and data subject rights fulfillment.

### 3.7 Compliance Events

Compliance events affect compliance reporting and regulatory interactions. Compliance events include compliance report generation, legal hold placement and release, regulator interactions, and compliance audit completion. Each compliance event produces an audit record that captures the actor, the compliance action, the time, and the compliance context.

Compliance events are critical for compliance demonstration. A regulator investigating a customer's compliance posture can review the compliance events to verify that the customer has discharged their compliance obligations. Compliance events are queryable by the Compliance Officer and by authorized regulators, subject to scope constraints.

### 3.8 Event Category and Audit Record

Each audit event produces an audit record, with the record's structure documented in SYSTEM_ARCHITECTURE Section 27.4. The record includes the event's category, the actor, the action, the resource, the tenant, the scope, the previous and new states, the authorization, the result, and the context. The record's structure is stable; new fields may be added, but existing fields are not removed or renamed, ensuring backward compatibility of audit queries.

The event category is a field in the audit record, supporting category-based queries. A compliance officer investigating a clinical incident can query for clinical events (AEC1) within a specific time range, with the query returning all matching records. Category-based queries are the most common audit query pattern, supporting efficient investigation and reporting.

---

## 4. Audit Logging

### 4.1 Logging Mechanism

The Ibn Hayan audit logging mechanism is the process by which audit events are recorded in the audit store. The mechanism is implemented at the platform layer and is consumed by every module through the Audit bounded context (BC17). Modules emit audit events through documented contracts; the audit service receives the events, validates them, and writes them to the audit store.

The logging mechanism is synchronous for consequential actions. An action that produces an audit record is not considered complete until the audit record is written; if the audit write fails, the action fails. The synchronous posture ensures audit completeness, in keeping with the platform's commitment to 100% audit completeness documented in PRODUCT_BIBLE Section 32.5.

### 4.2 Logging Contracts

Audit logging contracts are the documented interfaces through which modules emit audit events. The contracts specify the event types a module may emit, the fields each event type requires, and the validation rules each event must satisfy. The contracts are versioned, with backward-compatible evolution following the platform's deprecation policy.

The logging contracts are the basis for audit completeness verification. A module that emits events not in its contract is treated as defective; a module that fails to emit events that its contract requires is treated as defective. The verification is performed through automated testing, with the tests covering the module's full event surface.

### 4.3 Logging Validation

Audit events are validated before they are written to the audit store. Validation covers structural correctness (the event is well-formed), referential correctness (referenced entities exist), semantic correctness (the event's fields are internally consistent), and contextual correctness (the event is consistent with its scope). An event that fails validation is rejected, with the rejection recorded for investigation.

Validation failures are treated as defects in the emitting module. A module that produces invalid audit events is not shipped; the defect is remediated before deployment. Validation failure monitoring is part of the platform's security monitoring, with patterns of validation failure triggering alerts to the security operations team.

### 4.4 Logging Performance

Audit logging is performant. The synchronous logging posture could become a performance bottleneck if not carefully managed; the platform's audit service is designed for high throughput, with the audit store optimized for append-only writes. Performance targets are documented in the platform's service level objectives, with the targets including audit write latency and audit write throughput.

Performance regression in audit logging is treated as a defect. Slow audit logging encourages workarounds (modules skipping audit to avoid the latency) that compromise audit completeness. Performance regression is addressed before deployment, with the address including optimization of the audit service or revision of the audit store's topology.

### 4.5 Logging and the Outbox Pattern

For actions that span multiple stores (e.g., a transactional write plus an audit write), the platform uses the outbox pattern documented in ADR-006 (Database Strategy). The action writes to the transactional store and to an outbox in the same transaction; a separate process reads the outbox and writes to the audit store. The pattern ensures that the audit record is written even if the audit store is temporarily unavailable, with the outbox preserving the audit record until the audit store can accept it.

The outbox pattern is a critical control for audit completeness. Without it, an audit store outage would cause audit records to be lost, with the loss not detected until the audit trail is investigated. The outbox pattern preserves the audit record, with the record written when the audit store recovers. The outbox is itself auditable, with the outbox's contents and processing recorded.

### 4.6 Logging and Tenant Scoping

Audit logging is tenant-scoped. Each audit event includes the tenant identifier, and the audit store partitions records by tenant. The tenant scoping is enforced at the audit service and is non-negotiable, in keeping with ADR-004. A module that emits an audit event without a tenant identifier is treated as defective; the event is rejected, and the defect is remediated.

The tenant scoping of audit logging supports the platform's data residency commitments. Audit records for a tenant are stored in the region specified by the tenant's contract, in keeping with the data residency commitments documented in PRODUCT_BIBLE Section 23.5. Cross-region audit replication is permitted only for documented operational reasons (e.g., disaster recovery) and is auditable.

---

## 5. Audit Trail Integrity

### 5.1 Integrity Properties

The Ibn Hayan audit trail has the integrity properties documented in SYSTEM_ARCHITECTURE Section 27.5. The properties are non-negotiable and are enforced at the audit store. The properties are summarized below.

| Property | Description |
|---|---|
| Immutable | Records cannot be modified or deleted once written |
| Append-only | New records are appended; existing records are not changed |
| Tamper-evident | Records are integrity-protected; tampering is detectable |
| Query-optimized | Records are indexed for investigation queries |
| Retention-managed | Records are retained per regulatory requirements |

The integrity properties are the foundation of the platform's compliance posture. A regulator reviewing the audit trail can rely on the trail's integrity, with the trail's properties documented and verified. The integrity properties are tested periodically through documented integrity verification processes.

### 5.2 Immutability

Immutability is the property that audit records cannot be modified or deleted once written. Immutability is enforced at the audit store, with the store rejecting any attempt to modify or delete a record. Immutability is a platform-level guarantee, not a configuration choice, and is a direct consequence of Architectural Principle P13.

Immutability is critical for compliance. A regulator reviewing the audit trail needs to trust that the trail reflects what actually happened, not what someone wanted to have happened. If audit records could be modified, the trail's value for compliance demonstration would be destroyed. Immutability ensures that the trail is trustworthy.

### 5.3 Tamper-Evidence

Tamper-evidence is the property that tampering with audit records is detectable. Tamper-evidence is implemented through cryptographic techniques that produce a verifiable integrity signature for each audit record and for the trail as a whole. The signature is verified periodically through documented integrity verification processes, with verification failures triggering alerts to the security operations team.

Tamper-evidence is distinct from immutability. Immutability prevents modification; tamper-evidence detects modification if it occurs. Both are required, because no system is perfectly immutable; an attacker who compromises the audit store might attempt to modify records despite the immutability control. Tamper-evidence ensures that such modification is detected, with the detection triggering investigation.

### 5.4 Integrity Verification

Integrity verification is the process by which the audit trail's integrity is verified. Verification is performed on a defined cadence (typically daily, with more frequent verification for high-volume tenants) and produces a verification record that documents the verification's scope, method, and result. Verification records are themselves auditable, supporting demonstration that verification was performed.

Integrity verification uses documented cryptographic techniques, with the techniques reviewed annually by the Security Council for currency against emerging cryptanalytic techniques. Verification failures are treated as security incidents and trigger the documented incident response process, with the response including investigation of the failure's cause and remediation of any tampering detected.

### 5.5 Integrity and Legal Hold

Legal hold is the practice of preserving audit records that may be relevant to anticipated or ongoing litigation. Legal hold overrides the audit trail's retention management, with records subject to legal hold exempt from disposal until the hold is released. Legal hold is documented in `DATA_RETENTION.md` and is enforced at the audit store.

Legal hold does not affect the audit trail's integrity properties. Records subject to legal hold remain immutable, append-only, and tamper-evident. Legal hold only prevents disposal; it does not permit modification or deletion. The legal hold's scope, justification, and authorization are documented in the audit trail, with the documentation itself auditable.

### 5.6 Integrity and Backup

Audit trail integrity extends to backups. Backups of the audit store preserve the integrity properties, with backups immutable, append-only, and tamper-evident. Backup integrity is verified through documented verification processes, with verification failures triggering alerts to the operations team.

Backup integrity is critical for disaster recovery. A disaster that destroys the primary audit store must not also destroy the audit trail; backups preserve the trail, with the backup's integrity ensuring that the restored trail is trustworthy. Backup and recovery are documented in `BACKUP.md` and `RECOVERY.md`.

---

## 6. Audit Reports

### 6.1 Report Framework

The Ibn Hayan audit report framework defines how reports are generated from audit records. Reports are defined declaratively through configuration, with a report definition specifying the data source (the audit store), the query (filter and aggregation), the layout, the distribution, and the retention. Report definitions are versioned, validated, and auditable, in keeping with the configuration-driven philosophy documented in PRODUCT_BIBLE Section 22.

The report framework supports three categories of reports: operational reports for daily operational use, analytical reports for trend analysis, and regulatory reports for compliance. The categories have different requirements, with operational reports prioritizing freshness, analytical reports prioritizing historical depth, and regulatory reports prioritizing completeness and immutability. The categories are documented in SYSTEM_ARCHITECTURE Section 28.2.

### 6.2 Operational Audit Reports

Operational audit reports support daily operational use. Examples include daily access summaries, break-glass invocation reports, denied access reports, and configuration change reports. Operational reports are generated from the audit store, with minimal latency between audit event and report availability.

Operational reports are tenant-scoped and respect the organizational hierarchy. A compliance officer sees reports for their facility; a customer executive sees reports for their customer. Permission scoping is enforced at the reporting layer, in keeping with the platform's least-privilege posture.

### 6.3 Analytical Audit Reports

Analytical audit reports support trend analysis and decision support. Examples include access pattern trends, break-glass invocation trends, configuration change trends, and security event trends. Analytical reports are generated from the analytical store, which is populated from the audit store through an ETL pipeline, in keeping with ADR-006.

Analytical reports support continuous improvement of the platform's security and compliance posture. Trends in break-glass invocation may indicate permission configuration defects; trends in denied access may indicate training gaps; trends in configuration changes may indicate operational instability. The trends are reviewed by the Compliance Officer and the Security Council on a defined cadence.

### 6.4 Regulatory Audit Reports

Regulatory audit reports support compliance with regulatory requirements. Examples include HIPAA access reports, GDPR data subject rights reports, controlled substance dispensing reports, and financial regulatory reports. Regulatory reports are generated from the audit store and the transactional store, with the report format defined by the regulatory framework.

Regulatory reports are immutable once generated, in keeping with the immutability of regulatory reports documented in SYSTEM_ARCHITECTURE Section 28.5. A regulatory report that has been submitted to a regulator cannot be modified, even if subsequent data changes would produce a different report. The immutability is a compliance requirement and is enforced at the reporting layer.

### 6.5 Report Distribution

Report distribution is governed by the report definition. Distribution mechanisms include on-demand (report generated on user request), scheduled (report generated on a defined schedule), event-driven (report generated in response to a defined event), and subscription (report delivered to subscribers on a defined schedule). Distribution is auditable, with every report generation and distribution recorded in the audit trail.

Report distribution respects the permission framework. A report is distributed only to principals who are authorized to receive it; distribution to unauthorized principals is rejected, with the rejection recorded in the audit trail. The permission scoping of report distribution is a critical control against inadvertent disclosure of sensitive information through report distribution.

### 6.6 Report Audit

Report generation and distribution are auditable. The audit record captures the report definition, the parameters, the data sources, the recipients, and the time. Report audit records are immutable, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Report audit records support compliance demonstration. A regulator investigating a customer's compliance posture can review the report audit records to verify that the customer generated the required reports and distributed them to the appropriate recipients. The report audit trail is a critical input to compliance demonstration.

---

## 7. Audit Log Retention

### 7.1 Retention Policy

The Ibn Hayan audit log retention policy defines how long audit records are retained. The policy is governed by regulatory requirements and is documented per data class. Retention periods are typically long, reflecting the long-tail nature of healthcare compliance investigation; clinical audit records may be retained for the duration of the patient's lifetime plus a defined period, while financial audit records may be retained for a period set by tax and financial reporting regulations.

The retention policy is documented in detail in `DATA_RETENTION.md`. This section summarizes the policy for completeness, with the full policy documented in the dedicated retention document. The retention policy is reviewed annually by the Security Council and the Compliance Council, with changes communicated to affected customers.

### 7.2 Retention Periods by Category

Retention periods vary by audit event category, with the variation reflecting the regulatory requirements that apply to each category. The retention periods below are illustrative defaults; actual retention periods may be longer where required by the regulatory framework in force for the tenant's region.

| Category | Default Retention | Notes |
|---|---|---|
| Clinical events | Patient lifetime + 10 years | Longest retention; reflects medical record retention requirements |
| Financial events | 10 years | Reflects tax and financial reporting regulations |
| Operational events | 5 years | Reflects operational investigation needs |
| Configuration events | 7 years | Reflects incident investigation needs |
| Security events | 7 years | Reflects security investigation needs |
| Administrative events | 7 years | Reflects administrative investigation needs |
| Privacy events | 7 years | Reflects privacy regulatory requirements |
| Compliance events | 10 years | Reflects compliance demonstration needs |

### 7.3 Retention Enforcement

Retention is enforced through the audit store's retention management, documented in SYSTEM_ARCHITECTURE Section 27.5. Records that have reached the end of their retention period are disposed of through the documented disposal process, with the disposal itself auditable. The disposal process ensures that records are not retained beyond their required period, supporting the platform's data minimization commitments.

Retention enforcement is suspended for records subject to legal hold, as documented in Section 5.5. Legal hold prevents disposal until the hold is released, with the hold's scope, justification, and authorization documented in the audit trail.

### 7.4 Retention and Data Residency

Retention interacts with data residency for multi-region tenants. Audit records are stored in the region specified by the tenant's contract, with retention enforced in the region of storage. Cross-region retention replication is permitted only for documented operational reasons (e.g., disaster recovery) and is auditable, in keeping with the data residency commitments documented in PRODUCT_BIBLE Section 23.5.

The interaction is documented per tenant. A tenant with facilities in multiple regions has audit records stored per region, with retention enforced per region. The tenant's compliance officer can query audit records across regions (within the tenant's scope) but cannot move audit records across regions without authorization.

### 7.5 Retention and Disposal

Disposal is the process by which audit records that have reached the end of their retention period are removed from the audit store. Disposal is performed through documented procedures, with the procedures ensuring that disposal is irreversible and that the disposal itself is auditable. Disposal is governed by the retention policy and is reviewed periodically for currency.

Disposal does not affect the audit trail's integrity properties. Records that have not been disposed of remain immutable, append-only, and tamper-evident. Disposal only removes records that have reached the end of their retention period; it does not modify or delete records that are within their retention period.

### 7.6 Retention Audit

Retention events are auditable. The audit record captures the retention rule applied, the records disposed of (in aggregate, not individually), the disposal time, and the disposal authorization. Retention audit records are the basis for compliance demonstration that disposal was performed in accordance with the retention policy.

Retention audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that disposal was performed in accordance with the retention policy, that legal holds were respected, and that the disposal audit records are complete. The review is itself audited.

---

## 8. Audit Review Process

### 8.1 Review Cadence

Audit review is the periodic review of audit records to verify that actions were appropriate, that anomalies were investigated, and that the platform's security and compliance posture is maintained. The Ibn Hayan audit review process is performed on a defined cadence, with the cadence varying by event category and by risk class.

| Event Category | Review Cadence |
|---|---|
| Clinical events (high-risk) | Within 24 hours of the event |
| Clinical events (routine) | Weekly |
| Financial events | Weekly |
| Configuration events | Weekly |
| Security events (high-risk) | Within 24 hours of the event |
| Security events (routine) | Daily |
| Administrative events | Monthly |
| Privacy events | Monthly |
| Compliance events | Monthly |

### 8.2 Review Process

The audit review process is performed by the Compliance Officer, with the review authenticated and authorized. The process begins with the generation of a review report, which lists audit events within the review scope, organized by event category and risk class. The Compliance Officer reviews the report, identifies anomalies, and documents investigation and remediation actions.

Investigation and remediation actions are tracked to completion through the documented workflow. The workflow includes the action, the assignee, the target completion date, and the completion status. Actions that are not completed within the target window are escalated to the customer's executive team.

### 8.3 Anomaly Detection

Anomaly detection is the identification of audit events that deviate from expected patterns. Anomalies may indicate security incidents (e.g., unusual access patterns), configuration defects (e.g., frequent break-glass invocations), or operational issues (e.g., high rates of denied access). Anomaly detection is performed through automated tools and through manual review.

Anomalies are flagged for investigation by the Compliance Officer. The investigation verifies whether the anomaly represents a genuine issue or a benign deviation, with the investigation documented in the review record. Genuine issues are remediated through the documented workflow, with the remediation tracked to completion.

### 8.4 Review Audit

Audit review events are themselves auditable. The audit record captures the reviewer, the time, the scope reviewed, the findings, and the remediation actions. Review audit records are the basis for compliance demonstration that the review process was followed and for continuous improvement of the review process.

Review audit records are reviewed by the platform's internal audit function on a defined cadence. The review verifies that the audit review process was followed, that findings were documented, and that remediation actions were completed. The review is itself audited.

### 8.5 Review and Continuous Improvement

Audit review supports continuous improvement of the platform's security and compliance posture. Findings from audit reviews are analyzed for patterns, with recurring patterns addressed through training, configuration changes, or platform evolution. The analysis is documented and is reviewed by the Security Council on a defined cadence.

Continuous improvement is non-negotiable. An audit review process that does not produce continuous improvement is a defect and is addressed through revision of the review process. The platform's decade-horizon commitment (Architectural Principle P18) requires that the audit posture evolve as the platform's surface evolves, with the audit review process as the operational mechanism for that evolution.

### 8.6 Review and Reporting

Audit review supports compliance reporting. Regulators may require evidence that audit records are reviewed periodically; the audit review audit records provide that evidence. Compliance reports generated from audit review records are themselves auditable, with report generation recorded in the audit trail.

Compliance reports are immutable once generated, in keeping with the immutability of compliance reports documented in SYSTEM_ARCHITECTURE Section 28.5. A compliance report that has been submitted to a regulator cannot be modified, even if subsequent data changes would produce a different report. The immutability is a compliance requirement and is enforced at the reporting layer.

---

## 9. Compliance Audits

### 9.1 Compliance Audit Definition

A compliance audit is a formal review of the platform's compliance with a specific regulatory framework. Compliance audits are performed by external auditors (e.g., for HIPAA, a qualified third-party assessor) or by internal auditors (e.g., for the platform's internal compliance review). Compliance audits are documented, with the audit's scope, methodology, findings, and remediation tracked to completion.

The Ibn Hayan platform supports compliance audits through the audit trail, the audit report framework, and the audit review process. Auditors are granted scoped access to audit records, with the access documented in the audit trail. Auditors' findings are recorded, with the findings informing remediation and continuous improvement.

### 9.2 Compliance Audit Types

The platform supports several types of compliance audits, with the types varying by regulatory framework and by audit scope. The types are summarized below, with the full catalogue maintained in the compliance documentation.

| Audit Type | Description | Typical Frequency |
|---|---|---|
| HIPAA Security Risk Analysis | Assessment of administrative, physical, and technical safeguards | Annual |
| HIPAA Breach Risk Assessment | Assessment of breach incidents | Per incident |
| GDPR Data Protection Audit | Assessment of data protection practices | Annual |
| SOC 2 Type II audit | Assessment of security, availability, processing integrity, confidentiality, privacy controls | Annual |
| ISO 27001 audit | Assessment of information security management system | Annual |
| Internal compliance audit | Internal review of compliance posture | Quarterly |
| Regulator-requested audit | Audit requested by a regulator | Per request |

### 9.3 Auditor Access

Auditors are granted scoped access to audit records for the duration of the compliance audit. Access is granted through a temporary role assignment, with the role's permissions limited to the audit's scope. The assignment is documented in the audit trail, with the assignment's start, end, and scope recorded.

Auditor access is reviewed by the Compliance Officer on a defined cadence during the audit. The review verifies that the auditor's access remains appropriate, that the auditor has not accessed records outside the audit's scope, and that the auditor's access will be terminated at the audit's conclusion. The review is itself audited.

### 9.4 Audit Findings

Audit findings are the conclusions of a compliance audit. Findings may identify compliance gaps, control deficiencies, or opportunities for improvement. Findings are documented, with the documentation including the finding's description, the affected regulatory requirement, the recommended remediation, and the target remediation date.

Findings are tracked to remediation through the documented workflow. The workflow includes the finding, the assignee, the remediation plan, the target completion date, and the completion status. Findings that are not remediated within the target window are escalated to the customer's executive team and to the Security Council.

### 9.5 Audit Report

The compliance audit report is the formal document that records the audit's scope, methodology, findings, and remediation. The report is generated from the audit's records, with the report's content governed by the regulatory framework's reporting requirements. The report is reviewed by the Compliance Officer and the Security Council before submission to the regulator (where required).

The compliance audit report is immutable once submitted. A report that has been submitted to a regulator cannot be modified, even if subsequent findings would change the report's content. The immutability is a compliance requirement and is enforced at the reporting layer.

### 9.6 Continuous Compliance

Compliance audits are periodic events, but compliance is a continuous posture. The platform's audit trail, audit review process, and compliance monitoring support continuous compliance, with the periodic compliance audit serving as verification of the continuous posture. Continuous compliance is the goal; periodic compliance audits are the verification.

Continuous compliance is supported by the platform's security monitoring, which detects compliance-relevant events in near-real-time and triggers alerts to the security operations team. The alerts are investigated, with genuine issues remediated through the documented workflow. Continuous compliance reduces the likelihood of compliance audit findings by addressing issues before they become findings.

---

## 10. Audit Tools & Automation

### 10.1 Tool Catalogue

The Ibn Hayan audit tool catalogue defines the tools that support audit operations. The tools are documented below, with the full catalogue maintained in the audit operations documentation. The catalogue is reviewed annually by the Security Council, with new tools added as the platform's audit operations evolve.

| Tool Code | Tool | Description |
|---|---|---|
| AT1 | Audit query surface | The interface through which authorized principals query audit records |
| AT2 | Audit report generator | The tool that generates audit reports from audit records |
| AT3 | Audit review dashboard | The dashboard that supports the Compliance Officer's review |
| AT4 | Anomaly detection engine | The engine that detects anomalous patterns in audit records |
| AT5 | Integrity verification tool | The tool that verifies the audit trail's integrity |
| AT6 | Audit export tool | The tool that exports audit records for regulator or auditor use |
| AT7 | Audit retention manager | The tool that manages audit record retention and disposal |
| AT8 | Legal hold manager | The tool that manages legal holds on audit records |

### 10.2 Audit Query Surface

The audit query surface is the interface through which authorized principals query audit records. The surface supports time-range, actor, resource, action, tenant, and composite queries, with the query types documented in SYSTEM_ARCHITECTURE Section 27.6. The surface is governed by the permission framework, with only authorized roles able to query audit records and with queries scoped to the querier's authority.

The audit query surface is itself auditable, in keeping with the audit-of-audit control documented in SYSTEM_ARCHITECTURE Section 27.6. A query for audit records is recorded in the audit trail, with the record capturing the querier, the query, the time, and the result count. The audit-of-audit control is a critical control against investigation overreach.

### 10.3 Audit Report Generator

The audit report generator is the tool that generates audit reports from audit records. The generator consumes report definitions (documented in Section 6.1) and produces reports in the formats specified by the definitions. The generator is governed by the permission framework, with only authorized principals able to generate reports and with generation scoped to the generator's authority.

The audit report generator is auditable, with report generation recorded in the audit trail. The audit record captures the report definition, the parameters, the data sources, the recipients, and the time. Report generation audit records support compliance demonstration and continuous improvement of the reporting process.

### 10.4 Anomaly Detection Engine

The anomaly detection engine is the tool that detects anomalous patterns in audit records. The engine consumes audit records in near-real-time, applies documented detection rules, and flags anomalies for investigation by the security operations team. The engine's rules are documented, validated, and auditable, with rule changes subject to the configuration governance framework.

The anomaly detection engine is conservative. A pattern whose anomaly is uncertain is flagged for investigation; the engine prefers false positives over false negatives, with the false positives reviewed and dismissed by the security operations team. The conservatism reflects the high cost of missed anomalies in a healthcare context.

### 10.5 Integrity Verification Tool

The integrity verification tool is the tool that verifies the audit trail's integrity. The tool runs on a defined cadence (typically daily), produces a verification record that documents the verification's scope, method, and result, and triggers alerts on verification failures. The tool's methodology is documented and is reviewed annually by the Security Council.

The integrity verification tool is itself auditable, with verification runs recorded in the audit trail. The audit record captures the verification's scope, the verification's result, and any anomalies detected. Verification audit records support compliance demonstration that integrity was verified.

### 10.6 Audit Export Tool

The audit export tool is the tool that exports audit records for regulator or auditor use. The tool supports documented export formats, with the formats defined by the regulatory framework or by the auditor's requirements. The tool is governed by the permission framework, with only authorized principals able to export audit records and with exports scoped to the exporter's authority.

The audit export tool is auditable, with exports recorded in the audit trail. The audit record captures the exporter, the export's scope, the export's format, and the export's destination. Export audit records support compliance demonstration and investigation of suspected unauthorized export.

### 10.7 Tool Automation

Audit tools are automated where possible. The anomaly detection engine, the integrity verification tool, the audit retention manager, and the legal hold manager operate without human intervention, with their operations monitored by the security operations team. Automation reduces the operational burden of audit and ensures that audit operations are performed consistently.

Automation does not eliminate human oversight. The Compliance Officer reviews the tools' outputs on a defined cadence, with the review verifying that the tools are operating correctly and that their outputs are appropriate. The review is itself audited, in keeping with the audit-of-audit control.

### 10.8 Tool Governance

Audit tools are governed by the Security Council. Tool changes (new tools, modifications to existing tools, retirement of obsolete tools) are documented and are reviewed by the Security Council. Tool changes that affect regulatory compliance are reviewed by the Compliance Council before deployment.

Tool governance includes periodic review of tool effectiveness. The review verifies that the tools are producing the intended outcomes, that the tools' rules and configurations remain appropriate, and that the tools' audit records are complete. Tool effectiveness review is documented and is reviewed by the Security Council.

---

## 11. Related Documents

### 11.1 Upstream Documents

| Document | Relationship |
|---|---|
| PRODUCT_BIBLE.md Section 27 (Security Philosophy) | Product-level security posture that this document elaborates |
| PRODUCT_BIBLE.md Section 22 (Configuration-Driven Philosophy) | Configuration philosophy that governs audit configuration |
| PRODUCT_BIBLE.md Section 23 (Multi-Tenant Philosophy) | Multi-tenant posture that governs tenant scoping of audit |
| SYSTEM_ARCHITECTURE.md Section 20 (Security Architecture) | Architectural commitments that this document elaborates |
| SYSTEM_ARCHITECTURE.md Section 27 (Audit Architecture) | Audit architecture that this document elaborates |
| SYSTEM_ARCHITECTURE.md Section 28 (Reporting Architecture) | Reporting architecture that governs audit reporting |
| SYSTEM_ARCHITECTURE.md Section 10 (Multi-Tenant Architecture) | Tenant isolation architecture that governs audit's tenant scoping |
| SYSTEM_ARCHITECTURE.md Section 24 (Offline-First Architecture) | Offline architecture that governs offline audit |
| ADR-004 (Multi-Tenant Strategy) | Ratifies logical multi-tenancy as default, governing audit's tenant scoping |
| ADR-006 (Database Strategy) | Ratifies the audit store that holds audit records |

### 11.2 Peer Documents

| Document | Relationship |
|---|---|
| AUTHENTICATION.md | Authentication posture; produces authentication audit events |
| AUTHORIZATION.md | Authorization posture; produces authorization audit events |
| ROLES_AND_PERMISSIONS.md | Role catalogue; produces role and permission audit events |
| BACKUP.md | Backup posture; covers backup of the audit store |
| RECOVERY.md | Recovery posture; covers recovery of the audit store |
| COMPLIANCE/SECURITY_GUIDELINES.md | Comprehensive security guidelines; includes audit guidelines |
| COMPLIANCE/HIPAA.md | HIPAA compliance; includes audit requirements |
| COMPLIANCE/GDPR.md | GDPR compliance; includes audit requirements |
| COMPLIANCE/DATA_RETENTION.md | Data retention policy; covers audit record retention |
| COMPLIANCE/PRIVACY_POLICY.md | Privacy posture; covers audit's privacy implications |
| COMPLIANCE/MEDICAL_RECORD_POLICY.md | Medical record policy; covers audit of medical record access |

### 11.3 Downstream Documents

| Document | Relationship |
|---|---|
| docs/07_MODULES/AUDIT (M16, future) | Module reference for the Audit module, when authored |
| Audit operations runbook | Operational procedures for audit, maintained by the operations team |
| Audit query reference | Query surface reference, maintained by the Office of the CISO |
| Audit report catalogue | Catalogue of available audit reports, maintained by the Office of the CISO |
| Anomaly detection rules reference | Catalogue of anomaly detection rules, maintained by the security operations team |

### 11.4 Document Maintenance

This document is maintained by the Office of the CISO and is custodied by the Security Council. The document is reviewed quarterly, with off-cycle revision when a related ADR is ratified or when a security incident reveals a gap in the document's coverage. Changes are recorded in the change log with explicit version increment; material changes are ratified through the ADR mechanism.

The document's authority is elaborative, not constitutive. It elaborates the audit architecture ratified in SYSTEM_ARCHITECTURE Section 27 and the security posture ratified in PRODUCT_BIBLE Section 27; where this document and either canonical reference diverge, the canonical reference prevails. The document's authority is sufficient to govern audit decisions within the Ibn Hayan platform, subject to the canonical references' precedence.
