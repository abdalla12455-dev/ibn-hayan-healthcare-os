# Ibn Hayan Healthcare Operating System
## Audit Logs Module

| Field | Value |
|---|---|
| Document Title | Audit Logs Module Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Module Reference |
| Authority Level | Authoritative — Elaboration of MODULE_ARCHITECTURE |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CPO |
| Custodian | Product Council |
| Review Cadence | Quarterly |
| Audience | Product leaders, solution architects, customers, compliance officers, privacy officers, internal and external auditors, regulators, clinical governance bodies |
| Scope | Audit event capture, audit trail integrity, tamper-evidence, retention policies, compliance reporting, audit search and filtering, audit of audit, real-time monitoring hooks, and anomaly detection integration for the Ibn Hayan Healthcare Operating System |
| Out of Scope | Source-level implementation, database schema definitions, API endpoint specifications, UI component specifications, framework-level commitments, security information and event management (SIEM) product selection, cryptographic library selection, key management infrastructure implementation, regulatory legal interpretation |
| Conflict Resolution | In case of conflict, MODULE_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail |
| Amendment Mechanism | Product Council ratification, with Architecture Council review for any structural change to the module's bounded context alignment or contract surface |
| Predecessor | v0.1.0 stub (initial outline, 2026-07-18) |

---

## Table of Contents

1. Module Overview
2. Module Purpose & Scope
3. Key Features
4. Audit Event Types
5. Audit Trail
6. Log Retention Policies
7. Compliance Reporting
8. Audit Search & Filtering
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

The Audit Logs module (M16 in this documentation suite, aligned with the Audit bounded context BC17 as catalogued in SYSTEM_ARCHITECTURE Section 7.2) is the accountability substrate of the Ibn Hayan Healthcare Operating System. Every consequential action taken by a user, a workflow, or an integration against a tenant's data is captured by this module as an immutable, tamper-evident audit event. The Audit Logs module is not a feature layered on top of the platform; it is a primitive that the platform's architecture presupposes, in keeping with Principle P13 (Auditability as a Primitive, SYSTEM_ARCHITECTURE Section 4.13). A capability in Ibn Hayan that does not generate audit events is a defective capability, not a finished one.

Ibn Hayan treats audit as a platform-level concern rather than as a per-module utility. This positioning has direct architectural consequences: audit is owned by a single bounded context, populated by every other bounded context through a uniform event contract, stored in a manner that preserves immutability and tamper-evidence over decade-horizon retention windows, and queryable by authorized investigators without compromising the integrity of the trail itself. An audit event recorded in Ibn Hayan is a permanent record whose integrity must outlast every tenant configuration change, every module version transition, every provider turnover, and every regulatory regime shift.

### 1.2 Purpose and Business Value

The Audit Logs module exists to give every authorized party — clinicians, operations leaders, compliance officers, privacy officers, internal auditors, external auditors, regulators, and the patients whose data is being audited — a trustworthy, queryable record of what happened in the platform, when it happened, who caused it, and under what authorization. Business value is realized through four mechanisms. First, accountability deters misuse: a user who knows that every action is recorded is less likely to take inappropriate action, and a user who does take inappropriate action leaves a traceable record. Second, investigation resolves incidents: a breach, a complaint, or a clinical safety event is investigated by querying the audit trail for the relevant period, actor, and resource. Third, regulatory compliance is demonstrated by export: a regulator who requests evidence of access controls, consent handling, or financial transaction integrity receives a regulated export from the audit trail. Fourth, operational insight is gained by analysis: patterns in audit events surface workflow bottlenecks, permission configuration defects, and emerging risks before they produce incidents.

For customers, the Audit Logs module is the accountability foundation: a healthcare organization that cannot demonstrate what happened in its clinical and financial systems cannot satisfy regulators, cannot defend against complaints, and cannot improve its operations from evidence. For regulators, the Audit Logs module is the primary surface for compliance verification — every claim about access control, consent handling, and data protection is verified against the audit trail, not against policy assertions. For patients, the Audit Logs module — through access reports and breach investigations — is the mechanism by which the organization's stewardship of patient data is verified.

### 1.3 Bounded Context Alignment

The Audit Logs module aligns one-to-one with the Audit bounded context BC17, as catalogued in SYSTEM_ARCHITECTURE Section 7.2 and elaborated in MODULE_ARCHITECTURE Section 2.2. BC17 owns the audit event lifecycle: capture, validation, storage, query, export, retention, and disposal. It does not own the actions being audited — those are owned by their respective bounded contexts (clinical actions by BC02 through BC05, financial actions by BC06 and BC08, administrative actions by BC09 through BC12, platform actions by BC13 through BC18). The Audit bounded context is a downstream consumer of every other bounded context, receiving audit events through a uniform contract published by each upstream context.

This alignment is stable. Per Principle P8 (Bounded Contexts Are Stable, SYSTEM_ARCHITECTURE Section 4.8), the Audit bounded context is not reorganized to accommodate features. New auditable capabilities are accommodated within the existing event contract; new audit use cases are accommodated within the existing query and export contracts. The stability of the Audit bounded context is particularly consequential because audit is the platform's regulatory anchor — a reorganization of audit would invalidate years of accumulated evidence and would require regulator re-engagement across every jurisdiction in which the tenant operates.

### 1.4 Module Composition

The Audit Logs module is composed of the following capability areas, each of which is elaborated in Section 3 and in dedicated sections where the existing stub structure provides them: audit event capture, audit trail storage and integrity, tamper-evidence verification, retention policy enforcement, compliance reporting and export, audit search and filtering, audit of audit (meta-audit), real-time monitoring hooks, and anomaly detection integration. The module does not own the actions being audited, the permission decisions that authorized those actions, or the regulatory frameworks that govern retention and export; it owns the audit record and the operations performed on it.

The module's composition follows the cohesion principle (Principle P4, SYSTEM_ARCHITECTURE Section 4.5). Every capability area within the module shares the audit event as its organizing concept; capabilities that do not share this organizing concept belong in other modules. Anomaly detection, for example, lives in the Audit Logs module when it operates on audit event streams, but lives in the Reporting module when it operates on operational metrics. The boundary is the data source: audit-event anomaly detection is in Audit; operational-metric anomaly detection is in Reporting.

---

## 2. Module Purpose & Scope

### 2.1 In Scope

The Audit Logs module owns the audit event lifecycle from capture through disposal. It owns the audit event contract that every other module uses to publish audit events, the validation rules that reject malformed or incomplete events, the immutable store in which audit events are persisted, the tamper-evidence mechanism that detects any modification of stored events, the retention policies that govern how long events are kept, the disposal procedures that dispose of events at end of retention, the query and filtering contracts by which authorized investigators retrieve events, the export contracts by which regulated exports are produced, the audit of audit (meta-audit) by which access to the audit trail is itself audited, and the real-time monitoring hooks by which downstream systems receive audit event streams.

The module also owns the configuration surface for audit-related behaviour: retention policy configuration per event category, export format configuration per regulatory framework, query scope configuration per investigator role, and monitoring hook configuration per downstream system. The configuration surface is exposed through the Configuration module's contracts (BC16) and is itself audited — every change to audit configuration generates an audit event in the audit trail.

### 2.2 Out of Scope

The Audit Logs module does not own the actions being audited. A clinical order entry is owned by the Orders & Results bounded context; the audit event recording that the order was entered is owned by the Audit bounded context. A journal entry posting is owned by the Accounting bounded context; the audit event recording the posting is owned by the Audit bounded context. The Audit module is not a workflow engine, a permission engine, or a regulatory interpretation engine; it is the record-keeper for actions taken by those engines. The Audit module does not own cryptographic key management infrastructure, which is owned by the Identity & Access bounded context (BC15) and operated as a platform service. The Audit module consumes the key management service to sign and verify tamper-evidence records, but it does not own the keys.

The module also does not own security information and event management (SIEM) systems that may consume its exports, regulatory legal interpretation of what retention periods apply in a given jurisdiction, or the definition of what constitutes a consequential action — that definition is owned by each upstream module and is expressed through which actions that module chooses to publish as audit events. The Audit module publishes the contract; the upstream modules decide which actions warrant audit publication.

### 2.3 Audit as Architectural Primitive

Audit is treated as an architectural primitive in Ibn Hayan, not as a feature. This positioning is documented in SYSTEM_ARCHITECTURE Section 4.13 (Principle P13 — Auditability as a Primitive) and is elaborated in SYSTEM_ARCHITECTURE Section 27 (Audit Architecture). The practical consequence is that audit cannot be retrofitted, disabled, or bypassed without architectural review and ratification. A module that does not publish audit events for its consequential actions is not a finished module; a workflow that does not generate an audit trail is not a deployable workflow. This posture is non-negotiable in Ibn Hayan because audit is the substrate on which the platform's regulatory commitments rest.

The primitive status has implications for module design. Every module's contract surface includes audit event publication as a defined, versioned, tested capability. Every module's definition of done includes verified audit event generation for every consequential action. Every module's test suite includes assertions that the expected audit events are produced and that they carry the required provenance metadata. A module that fails its audit assertions does not pass integration testing, regardless of whether its functional behaviour is correct.

### 2.4 Tenant Isolation of Audit Data

Audit data is tenant-isolated by default. An audit event generated in tenant A is not visible to tenant B, even when the event describes the same category of action. Cross-tenant audit queries are not supported; a regulator investigating an incident in tenant A cannot query tenant B's audit trail through the same contract. Cross-tenant audit data sharing, where it occurs at all, occurs through regulated export to a regulator or through a tenant's own consolidated reporting capability that aggregates exports from multiple tenants under the tenant's own legal basis. The Audit module enforces tenant isolation at the contract level; queries are scoped to the caller's tenant, and attempts to query across tenants are rejected and themselves recorded as audit events (an attempt to bypass tenant isolation is itself an auditable action).

Where the platform operator needs visibility across tenants for operational purposes (for example, to detect a security incident affecting multiple tenants), the visibility is granted through a separate operational audit surface that is itself audited at a higher granularity than tenant-level audit. The operational audit surface is a platform-level capability, not a tenant-level capability, and its access is restricted to authorized platform operators with documented justification for each query. This honours Principle P10 (Multi-Tenancy as Default, SYSTEM_ARCHITECTURE Section 4.10) and Principle P3 (One Platform, Many Organizations).

---

## 3. Key Features

### 3.1 Audit Event Capture

Audit event capture is the ingestion of audit events from upstream modules. Every consequential action in every module produces an audit event that is published to the Audit Logs module through a uniform event contract. The contract requires provenance metadata (actor, action, resource, tenant, scope, prior state, new state, authorization basis, result, context) and rejects events that lack required fields. Capture is asynchronous where the upstream action does not require confirmation of audit recording (the common case), and synchronous where the upstream action's safety depends on the audit record being persisted before the action is considered complete (rare, governed by configuration). Capture is idempotent; an event delivered twice is recorded once.

### 3.2 Immutable Storage

Audit events are stored in an append-only, immutable store. Once written, an audit event cannot be modified, cannot be deleted within its retention period, and cannot be overwritten. The immutability guarantee is enforced at the storage layer and is verified by tamper-evidence checks. The store is replicated and backed up per the platform's data durability commitments, with recovery procedures that preserve the immutability of recovered events — a recovered event that differs from the originally stored event is itself an incident and is investigated. The immutability commitment in Ibn Hayan is non-negotiable because it is the foundation on which the platform's regulatory commitments rest (SYSTEM_ARCHITECTURE Section 27.5).

### 3.3 Tamper-Evidence

Tamper-evidence is the property that any modification of stored audit events is detectable. The Audit Logs module produces tamper-evidence records — cryptographic hashes chained across events — that allow verification that the audit trail has not been modified since a known checkpoint. Tamper-evidence verification runs continuously as a background process and on demand as an investigative tool. A tamper-evidence failure is treated as a critical security incident: it indicates either a storage malfunction or a deliberate attempt to modify the audit trail, and either condition requires immediate escalation. The tamper-evidence mechanism uses cryptographic primitives owned by the Identity & Access bounded context (BC15), consumed by the Audit module through published contracts.

### 3.4 Retention Policy Enforcement

Retention policy enforcement governs how long audit events are kept and how they are disposed of at end of retention. Retention policies are configurable per event category, per regulatory framework, and per tenant. A tenant operating in a jurisdiction that requires ten-year retention of clinical audit events configures a ten-year retention policy for clinical event categories; a tenant operating in a jurisdiction that requires seven-year retention of financial audit events configures a seven-year retention policy for financial event categories. Disposal at end of retention is itself an audited action — the disposal of an audit event is recorded in a meta-audit trail, preserving the evidence that the event was disposed of in accordance with policy.

### 3.5 Compliance Reporting and Export

Compliance reporting and export produce regulated exports of audit data for regulators, auditors, and other authorized external parties. Exports are formatted per the requesting party's requirements — a regulator may request a specific export format defined by the regulatory framework, an external auditor may request a CSV or JSON export for analysis, a patient exercising a data subject access right may request a patient-readable report. Exports are themselves audited; the export action records the requestor, the scope, the time, the format, and the destination. Export contents are immutable once produced; an export that is later found to be incomplete or incorrect is supplemented by an additional export, not by modification of the original.

### 3.6 Audit Search and Filtering

Audit search and filtering allow authorized investigators to retrieve audit events matching specified criteria — by time range, by actor, by resource, by action category, by tenant, by scope, by authorization basis, by result. Search is query-optimized for investigation; an investigator must be able to retrieve every access of a specific patient record by any user in any time range within a reasonable response time, even across hundreds of millions of audit events. Search is scoped to the caller's authority; an investigator without authority to view a specific event category receives no results for that category rather than the events themselves. Every search is itself audited (audit of audit), preserving the evidence that an investigation occurred.

### 3.7 Audit of Audit (Meta-Audit)

Audit of audit is the application of the audit primitive to the audit trail itself. Every action taken on the audit trail — query, export, retention policy change, configuration change, tamper-evidence verification — generates a meta-audit event that is recorded in a separate meta-audit trail. The meta-audit trail is itself subject to immutability, tamper-evidence, and retention. Meta-audit is the mechanism by which the integrity of the audit function is verified: an investigator who accesses the audit trail leaves a trace, a regulator who requests an export leaves a trace, a system administrator who changes retention policy leaves a trace. The capability is documented in SYSTEM_ARCHITECTURE Section 27.6 and is non-optional in Ibn Hayan.

### 3.8 Real-Time Monitoring Hooks

Real-time monitoring hooks allow downstream systems to subscribe to audit event streams for real-time analysis. A security information and event management (SIEM) system subscribes to receive audit events for security correlation; an anomaly detection system subscribes to receive audit events for pattern analysis; a clinical safety monitoring system subscribes to receive clinical audit events for safety signal detection. Hooks are configured per subscriber, with scope filters that limit the events each subscriber receives to the events relevant to its function. Hook delivery is reliable; an event delivered to a hook is guaranteed to be delivered at least once, with redelivery on transient failure.

### 3.9 Anomaly Detection Integration

Anomaly detection integration is the surface by which the Audit Logs module exposes audit event streams to anomaly detection systems. The Audit module does not perform anomaly detection itself — that capability belongs to subscribing systems with specialized analytical capability — but it provides the stream, the filtering, and the delivery guarantees that anomaly detection requires. Anomaly detection may operate on event volume (an unusual number of access events for a single patient), on event pattern (access events occurring outside expected hours), on event composition (an unusual mix of action categories for a single actor), or on event outcome (an unusual rate of failed authorization attempts). Detected anomalies are surfaced to subscribing systems for action; the Audit module does not take action on anomalies itself.

### 3.10 Audit Trail Verification

Audit trail verification is the periodic and on-demand process by which the integrity of the audit trail is confirmed. Verification checks that every event in the trail is present, that no event has been modified, that the chain of tamper-evidence records is intact, and that the meta-audit trail is consistent with the operations performed on the primary trail. Verification runs as a scheduled background process (daily or more frequently for high-volume tenants) and on demand as an investigative tool. A verification failure is a critical incident; verification successes are recorded as meta-audit events, preserving the evidence that the trail was verified at a known time by a known process.

### 3.11 Long-Term Retention and Archival

Long-term retention and archival manage audit events whose retention period exceeds the operational storage window. Audit events that are no longer in active query scope but are still within their retention period are moved to archival storage, where they remain queryable on demand but at lower performance and lower cost. Archival is transparent to investigators — a query that retrieves events in operational storage also retrieves events in archival storage, with the difference that archival events may take longer to return. Archival retention honors the same retention policies as operational retention; an event disposed of at end of retention is disposed of from both operational and archival storage.

### 3.12 Localization of Audit Behaviour

Audit behaviour is localized. The retention periods that apply to a given event category are governed by the tenant's regulatory framework, which is configured through the Localization module's contracts. The export formats that apply to a given regulator are governed by the regulatory framework, with format templates configurable per jurisdiction. The patient-access report format that a patient receives when exercising a data subject access right is governed by the patient's jurisdiction. Localization is honored through configuration, not through code paths — the same audit workflow runs in every region, with retention and export behaviour resolved from configuration at runtime.

---

## 4. Audit Event Types

### 4.1 Clinical Event Categories

Clinical audit events record consequential actions taken against clinical data. The category includes patient record access (every read of a patient record by every user), clinical document authoring, order entry, result review, medication administration, allergy recording, immunization recording, clinical note signing, clinical note amendment, and clinical note addendum. Clinical events are the most voluminous category in a typical tenant because patient record access alone may produce tens of millions of events per year for an enterprise tenant. Clinical events carry clinical context — the encounter context, the patient context, the clinical reason for access — that supports investigation of clinical safety incidents and complaints.

| Event Category | Examples | Typical Volume |
|---|---|---|
| Patient record access | Viewed demographics, viewed history, viewed results | High (every read by every user) |
| Clinical documentation | Note authored, note signed, note amended, addendum added | Medium |
| Order entry | Order placed, order modified, order cancelled, order resulted | Medium |
| Result review | Result viewed, result acknowledged, result forwarded | Medium |
| Medication administration | Medication given, medication held, medication refused | Medium |
| Consent events | Consent granted, consent revoked, consent amended | Low |

### 4.2 Financial Event Categories

Financial audit events record consequential actions taken against financial data. The category includes invoice generation, payment posting, refund processing, write-off, claim submission, denial recording, appeal filing, statement generation, journal entry posting, period close, and bank reconciliation. Financial events support financial audit, fraud investigation, and regulatory financial reporting. Financial events carry financial context — the invoice reference, the payer reference, the amount, the cost center — that supports investigation of financial discrepancies and regulatory inquiries.

### 4.3 Administrative Event Categories

Administrative audit events record consequential actions taken against administrative data. The category includes appointment booking, appointment cancellation, appointment modification, patient registration, patient merge, patient de-identification, queue management actions, room assignment, and check-out. Administrative events support operational analysis, complaint investigation, and access-to-care reporting. Administrative events carry operational context — the facility, the actor role, the workflow step — that supports investigation of operational issues and patient experience complaints.

### 4.4 Platform Event Categories

Platform audit events record consequential actions taken against the platform itself. The category includes user authentication, user authorization (permission check), session management, configuration changes, feature flag changes, tenant configuration changes, integration connection establishment, integration connection termination, module deployment, and module retirement. Platform events support security investigation, configuration audit, and platform operational analysis. Platform events carry platform context — the user, the session, the configuration key, the previous value, the new value — that supports investigation of security incidents and configuration defects.

### 4.5 Audit-Specific Event Categories (Meta-Audit)

Audit-specific audit events (meta-audit events) record consequential actions taken against the audit trail itself. The category includes audit query, audit export, retention policy change, audit configuration change, tamper-evidence verification, audit trail verification, and audit event disposal. Meta-audit events are recorded in a separate meta-audit trail that is itself subject to immutability, tamper-evidence, and retention. The meta-audit trail is the mechanism by which the integrity of the audit function is verified; a regulator who questions whether the audit trail has been tampered with is answered by reference to the meta-audit trail, which records every action taken on the primary trail.

### 4.6 Event Severity and Consequence Classification

Every audit event carries a severity classification that reflects the consequence of the action being audited. Severity guides investigation priority, retention policy, and monitoring hook routing. A critical event (emergency access, consent revocation, patient merge, configuration change to clinical behaviour) is investigated with higher priority than an informational event (routine patient record access by an authorized user). Severity is assigned by the upstream module at event publication time; the Audit module does not reclassify severity, because severity reflects the upstream action's consequence, which is known to the upstream module.

| Severity | Examples | Investigation Priority | Retention Default |
|---|---|---|---|
| Critical | Emergency access, consent revocation, patient merge, audit config change | Immediate | Maximum |
| High | Order entry, claim submission, period close, permission grant | Same-day | Long |
| Medium | Appointment booking, note authoring, statement generation | Routine | Standard |
| Low | Routine record access by authorized user | Investigative only | Standard |
| Informational | Login success, session refresh | Pattern analysis only | Short |

---

## 5. Audit Trail

### 5.1 Trail Structure and Composition

The audit trail is the complete set of audit events generated within a tenant, organized chronologically and indexed for query. The trail is append-only; new events are added at the end of the trail, and existing events are never modified or removed within their retention period. The trail is partitioned by tenant, by event category, and by time, with partitioning strategy optimized for the query patterns that investigators actually use. A query for all access of a specific patient record in a specific time range is served from the patient-resource index; a query for all actions by a specific user in a specific time range is served from the actor index; a query for all events in a specific time range is served from the time index.

The trail is composed of the primary audit trail (the events generated by upstream modules) and the meta-audit trail (the events generated by actions on the audit trail itself). The two trails are stored separately, with separate retention policies, separate query contracts, and separate access controls. An investigator with authority to query the primary trail does not automatically have authority to query the meta-audit trail; meta-audit query authority is restricted to a smaller set of roles because meta-audit reveals the investigative activity of the organization.

### 5.2 Immutability Guarantees

The audit trail is immutable within the retention period of every event it contains. Once an event is written, it cannot be modified by any user, any workflow, or any system process, including system administrators and platform operators. The immutability guarantee is enforced at the storage layer through append-only storage primitives, at the contract layer through rejection of any update or delete operation on audit events, and at the verification layer through tamper-evidence checks that detect any modification despite the storage and contract guarantees. The layered enforcement ensures that a defect in one layer is caught by another; a storage malfunction that allowed modification would be detected by tamper-evidence verification.

Immutability in Ibn Hayan is non-negotiable because it is the foundation on which the platform's regulatory commitments rest. A regulator who requests an audit export is relying on the immutability of the trail; a patient who exercises a data subject access right is relying on the immutability of the trail; an investigator who queries the trail for breach analysis is relying on the immutability of the trail. Any compromise of immutability compromises every regulatory commitment the platform makes, which is why immutability is enforced at multiple layers and verified continuously.

### 5.3 Tamper-Evidence Mechanism

Tamper-evidence is the property that any modification of stored audit events is detectable, even if the modification is made through storage-level access rather than through the contract layer. The mechanism produces a chain of tamper-evidence records, each recording the cryptographic hash of a batch of audit events and the hash of the previous tamper-evidence record, creating a chain that cannot be modified without breaking the chain at the point of modification. Tamper-evidence records are produced at a configurable cadence (typically every few minutes for high-volume tenants), with the cadence traded off against the verification granularity.

Tamper-evidence verification recomputes the hashes from the stored events and compares them against the recorded hashes. A mismatch indicates modification of one or more events between the tamper-evidence record's creation and the verification; the verification process identifies the affected batch and surfaces the mismatch for investigation. Verification runs as a scheduled background process and on demand as an investigative tool. The tamper-evidence mechanism uses cryptographic primitives owned by the Identity & Access bounded context (BC15), with key rotation governed by the key management service's contracts; the Audit module does not own the keys but is a consumer of the key service.

### 5.4 Trail Integrity Verification

Trail integrity verification is the periodic and on-demand process by which the audit trail's integrity is confirmed. Verification checks four properties: completeness (every event that should be in the trail is present), immutability (no event has been modified), chain integrity (the tamper-evidence chain is intact), and meta-audit consistency (the meta-audit trail is consistent with the operations performed on the primary trail). Verification runs as a scheduled background process — daily for typical tenants, more frequently for high-volume or high-sensitivity tenants — and on demand as an investigative tool.

Verification results are recorded as meta-audit events, preserving the evidence that the trail was verified at a known time by a known process with a known outcome. A verification that succeeds is recorded; a verification that fails is recorded and triggers immediate escalation. Verification failures are treated as critical security incidents until investigated and resolved, because a failure indicates either a storage malfunction (which may have corrupted other data) or a deliberate attempt to modify the trail (which is a security breach). The verification process itself is documented, tested, and reviewed periodically to ensure that it would detect the modification modes that an adversary might attempt.

### 5.5 Audit Trail Replication and Backup

The audit trail is replicated and backed up per the platform's data durability commitments, with replication to geographically separated locations for tenants with disaster recovery requirements. Replication preserves the immutability of the trail — a replicated copy of an event is identical to the original, and any divergence between replicas is itself a verification failure. Backups are produced on a schedule aligned to the tenant's recovery point objective, with backup integrity verified by sample restore testing. A backup that cannot be restored is treated as no backup at all; backup integrity is verified on a regular cadence, with verification results recorded as meta-audit events.

Recovery from backup preserves the immutability of recovered events. A recovered event that differs from the originally stored event is itself an incident and is investigated, because the difference indicates either a backup integrity defect or a modification attempt between original storage and backup. Recovery procedures are documented, tested, and reviewed; an untested recovery procedure is treated as no recovery procedure at all, in keeping with Principle P1 (Healthcare Safety Overrides All Others, SYSTEM_ARCHITECTURE Section 4.2) applied to the audit substrate on which clinical accountability rests.

---

## 6. Log Retention Policies

### 6.1 Retention Policy Model

Retention policies govern how long audit events are kept and how they are disposed of at end of retention. Policies are configurable per event category, per regulatory framework, and per tenant, with defaults aligned to common regulatory requirements. A retention policy specifies the retention period (how long events in the category are kept), the disposal method (how events are disposed of at end of retention), the archival threshold (when events move from operational storage to archival storage), and the verification cadence (how often the retention policy itself is reviewed for correctness). Policies are versioned; a policy change is recorded as a meta-audit event, preserving the evidence of what policy was in force at what time.

Retention policies are enforced continuously by a background process that identifies events whose retention period has expired and disposes of them in accordance with the configured disposal method. Disposal is itself an audited action; the disposal of an event is recorded in the meta-audit trail, preserving the evidence that the event was disposed of in accordance with policy. A disposal that occurs before the retention period expires is a defect and is investigated; a disposal that fails to occur at end of retention is also a defect and is investigated. Both conditions are surfaced by the verification process.

### 6.2 Regulatory Retention Requirements

Regulatory retention requirements vary by jurisdiction, by event category, and by data classification. A tenant operating in a jurisdiction that requires ten-year retention of clinical audit events configures a ten-year retention policy for clinical event categories; a tenant operating in a jurisdiction that requires seven-year retention of financial audit events configures a seven-year retention policy for financial event categories. Some jurisdictions require indefinite retention of certain event categories (consent events, breach notifications); others require disposal at a specific point (data subject access request fulfillment records disposed of two years after fulfillment). The Localization module's configuration surface expresses these requirements; the Audit module's retention engine enforces them.

The regulatory landscape is not static. A jurisdiction may revise its retention requirements, requiring a tenant to update its retention policy. A policy update does not retroactively apply to events already disposed of (an event disposed of under the prior policy remains disposed of), but it does apply to events still within their retention period (an event retained under the prior policy for seven years that is now required to be retained for ten years is retained for the additional three years). The policy versioning model preserves the evidence of what policy was in force at what time, supporting regulatory inquiries about retention behaviour.

### 6.3 Disposal Procedures

Disposal is the irreversible removal of an audit event from the audit trail at end of its retention period. Disposal is performed by a background process that identifies events whose retention has expired, verifies that no legal hold is in force (a legal hold extends retention beyond the policy period for events subject to litigation or investigation), and removes the events from operational and archival storage. Disposal is itself an audited action; the disposal record preserves the evidence of which events were disposed of, when, by what process, and under what policy.

Disposal methods are configurable. Secure deletion (cryptographic erasure of the event and its indices) is the default; physical destruction of storage media is supported for tenants with high-sensitivity requirements (the media is removed from service and destroyed, with the destruction recorded). Anonymization (replacing direct identifiers with pseudonyms while preserving the event structure for analytical use) is supported for tenants that wish to retain events for pattern analysis beyond the identifiable retention period. The disposal method is part of the retention policy and is itself audited when changed.

### 6.4 Legal Hold

Legal hold is the suspension of disposal for events subject to litigation, investigation, or regulatory inquiry. A legal hold is placed by an authorized role (compliance officer, legal counsel) on a defined scope of events (specific patients, specific actors, specific time ranges, specific event categories). Events under legal hold are not disposed of at end of retention; they are retained until the hold is lifted. Legal holds are themselves audited; the placement, scope, justification, and lifting of a hold are recorded in the meta-audit trail, preserving the evidence that the hold was in force during the relevant period.

Legal hold is a critical capability for tenants that may be subject to litigation or regulatory inquiry. A tenant that disposes of events subject to a legal hold is in contempt of court or in violation of regulatory hold requirements, with significant legal consequences. The legal hold capability is therefore designed for reliability: a hold placed on a scope of events is enforced regardless of retention policy expiry, regardless of disposal process scheduling, and regardless of system malfunction. The enforcement is verified by the verification process, which checks that events under hold have not been disposed of.

### 6.5 Archival Strategy

Archival is the movement of audit events from operational storage (high-performance, high-cost) to archival storage (lower-performance, lower-cost) when the events are no longer in active query scope but are still within their retention period. Archival is transparent to investigators; a query that retrieves events in operational storage also retrieves events in archival storage, with the difference that archival events may take longer to return. The archival threshold is configurable per event category and per tenant, with the threshold traded off against query performance for older events.

Archival retention honors the same retention policies as operational retention. An event disposed of at end of retention is disposed of from both operational and archival storage; an event under legal hold is retained in both operational and archival storage until the hold is lifted. Archival storage uses the same immutability, tamper-evidence, and verification guarantees as operational storage; the lower cost of archival storage does not compromise the integrity guarantees that the audit trail provides. A tenant with high-volume audit data and long retention periods may have the majority of its audit events in archival storage rather than operational storage, with archival storage sized accordingly.

---

## 7. Compliance Reporting

### 7.1 Regulatory Export Formats

Regulatory export formats are the formats in which audit data is exported to regulators, auditors, and other authorized external parties. Formats are configurable per regulatory framework and per requesting party. A regulator may define a specific export format (a structured file with defined fields, defined encoding, and defined delivery mechanism) that the tenant must produce on request; the Audit Logs module's export engine produces the format from the audit trail, with the format template configured through the Localization module's contracts. An external auditor may request a standard format (CSV, JSON) for analysis; the export engine produces the standard format with field mapping configurable per audit engagement.

Export formats are versioned; a format change is recorded as a meta-audit event, preserving the evidence of what format was in force when an export was produced. An export produced under a specific format version is reproducible from the audit trail (assuming the events are still within retention), supporting regulatory inquiries about export contents. Export format templates are themselves audited when changed, because a format change could affect what data is included in or excluded from an export, which is a regulatory concern.

### 7.2 Patient Access Reports

Patient access reports are exports produced in response to a patient's exercise of a data subject access right under applicable privacy regulation (GDPR Article 15, HIPAA right of access, and equivalent rights in other jurisdictions). The report includes every audit event in which the patient's record was accessed, with the actor, the time, the action, the authorization basis, and the purpose where required. The report is formatted for patient readability — technical jargon is translated, event categories are explained, and the report is produced in the patient's preferred language.

Patient access reports are themselves audited; the report production is recorded in the meta-audit trail, preserving the evidence that the patient exercised the right on a specific date and that the organization responded within the regulatory timeframe. A patient access report that is incomplete (omits events that should have been included) is a regulatory defect and is investigated; a patient access report that is delayed beyond the regulatory timeframe is a regulatory defect and is investigated. The patient access report capability is therefore designed for completeness and timeliness, with monitoring on report production lead time.

### 7.3 Breach Investigation Exports

Breach investigation exports are exports produced in response to a confirmed or suspected data breach. The export includes every audit event relevant to the breach — every access of the affected patient records, every action by the suspected actor, every configuration change in the relevant period, every authentication event for the suspected accounts. The export is formatted for investigator use (structured for analysis, with provenance preserved for evidentiary use) and is produced rapidly (within hours of breach confirmation, not the days or weeks that a routine export may take).

Breach investigation exports are themselves audited at higher granularity than routine exports, because the export itself may be evidence in subsequent legal proceedings. The export production is recorded in the meta-audit trail with the requestor, the scope, the time, the format, and the destination; the export contents are sealed (cryptographically signed) to support evidentiary use; the export is retained for the duration of any legal proceeding and beyond, in accordance with the legal hold capability. The breach investigation export capability is therefore designed for evidentiary integrity, with the same immutability and tamper-evidence guarantees as the audit trail itself.

### 7.4 Audit Engagement Support

Audit engagement support is the surface by which the Audit Logs module supports internal and external audit engagements. An internal auditor planning an annual audit requests an export of audit events in a specific scope (a sample of patient access events, a sample of financial transaction events, a sample of configuration changes). An external auditor conducting a regulatory audit requests an export of audit events in the regulator's defined scope and format. The export engine produces the requested export, with scope filters configured to the engagement's requirements.

Audit engagement support includes the ability to produce sampled exports — a randomly selected sample of events meeting specified criteria, with the sample size and selection method configurable per engagement. Sampled exports support audit techniques that rely on statistical sampling rather than full population review. The sampling method is recorded as part of the export metadata, supporting audit reproducibility and defensibility. The audit engagement support capability is therefore designed for flexibility, with a configuration surface that accommodates the diverse requirements of internal audit, external audit, and regulatory audit.

### 7.5 Regulator Direct Access

Regulator direct access is the surface by which a regulator may query the audit trail directly, rather than requesting an export. Direct access is granted through a separate regulator access contract that is configured per regulator and per tenant, with scope filters that limit the regulator's access to the events the regulator is authorized to view. Direct access is itself audited at the highest granularity; every query by every regulator is recorded in the meta-audit trail, with the query, the scope, the time, and the results summary. Direct access is granted only where the regulatory framework requires it and where the tenant has explicitly authorized it; the default posture is export-only, with direct access as a configured exception.

---

## 8. Audit Search & Filtering

### 8.1 Search Contract Surface

The search contract surface is the set of query contracts by which authorized investigators retrieve audit events from the audit trail. The surface includes query by time range, by actor, by resource, by action category, by tenant, by scope, by authorization basis, by result, by severity, and by combinations of these criteria. Queries are scoped to the caller's authority; an investigator without authority to view a specific event category receives no results for that category. Queries are optimized for the investigation patterns that investigators actually use, with indices on the most common query dimensions (patient resource, actor, time) and with query plans that minimize the data scanned for typical queries.

The search contract surface is versioned, with breaking changes following the platform's deprecation policy. The surface is documented as part of the module's contract definition; undocumented queries are not supported. The surface includes both synchronous query (returning results immediately for typical investigation scopes) and asynchronous query (returning a query identifier and delivering results to a callback when the query scope is too large for synchronous return). Asynchronous query supports investigations that span years of audit data and billions of events.

### 8.2 Query Scope and Authority

Query scope is governed by the caller's authority. An investigator with authority to query clinical events can query clinical events; an investigator without that authority cannot. Authority is configured per role (per PRODUCT_BIBLE Section 20.2 and the permission philosophy in Section 21) and is enforced at the contract layer. Authority includes both event category scope (clinical, financial, administrative, platform, meta-audit) and tenant scope (the investigator's own tenant, with cross-tenant query not supported by default). Authority is recorded with every query, preserving the evidence of what the investigator was authorized to view at the time of the query.

Query authority is itself audited (audit of audit). Every query, regardless of result count, is recorded in the meta-audit trail with the investigator, the scope, the time, the criteria, and the result count. An investigator who queries the audit trail leaves a trace that is itself preserved for the duration of the meta-audit retention period. This honours the audit primitive applied to the audit function itself: the integrity of the audit function is verifiable through the meta-audit trail, which records every action taken on the primary trail.

### 8.3 Query Performance and Indexing

Query performance is operationally critical for audit investigation. An investigator working against time (a breach investigation, a regulatory deadline, a clinical safety incident) cannot wait hours for query results. The Audit Logs module's query engine is optimized for the investigation patterns that investigators actually use, with indices on patient resource, actor, time, action category, and severity. Indices are maintained continuously as events are captured, with index updates performed asynchronously to avoid blocking capture. Index integrity is verified by the verification process, which detects index corruption that could produce incomplete query results.

For queries that span large volumes of data (years of audit events, hundreds of millions of events), the query engine uses parallel query execution, with the query plan divided across multiple workers and the results merged. Parallel execution is transparent to the investigator; the query returns a single result set regardless of how many workers executed it. For queries that exceed the synchronous response threshold (typically a few seconds), the query engine returns a query identifier and delivers results to a callback when the query completes. Asynchronous delivery supports investigations that would otherwise be infeasible due to data volume.

### 8.4 Filtering and Result Shaping

Filtering and result shaping allow investigators to retrieve audit events in the form most useful for the investigation. Filters narrow the result set by additional criteria beyond the primary query (action subtype, authorization basis, result status, severity threshold). Result shaping controls what fields are returned for each event (full event, summary, count only), what order results are returned in (chronological, reverse chronological, by severity, by actor), and what pagination is applied (page size, page offset). Filters and shaping are part of the query contract, not separate operations; an investigator issues a single query with all desired criteria.

Result shaping supports investigation workflows that process large result sets incrementally. An investigator reviewing patient access events for a specific patient over a year may retrieve the first page of results, review them, then retrieve the next page. Pagination is stable; the same query with different page offsets returns consistent results as long as the underlying data has not changed (events are immutable, so the underlying data does not change for the duration of an investigation). Pagination is cursor-based for very large result sets, with the cursor preserving the query position across page requests.

### 8.5 Saved Queries and Investigation Workspaces

Saved queries allow investigators to preserve a query for repeated execution or for sharing with other investigators. A saved query includes the criteria, the filters, the result shaping, and a human-readable description. Saved queries are versioned; a query that is modified produces a new version, with the prior version preserved for reproducibility. Saved queries are scoped to the investigator who created them by default, with sharing to other investigators as a configured capability. Saved queries are themselves audited; the creation, modification, sharing, and execution of a saved query are recorded in the meta-audit trail.

Investigation workspaces allow investigators to organize an investigation — the queries, the saved queries, the exports, the notes, and the findings — into a cohesive workspace that persists across sessions. A workspace is scoped to a specific investigation (a breach, a complaint, a regulatory inquiry) and is retained for the duration of the investigation. Workspaces are themselves audited; the creation, modification, sharing, and closure of a workspace are recorded in the meta-audit trail. The workspace capability supports investigation continuity across investigator turnover and across the long durations that some investigations require.

---

## 9. User Roles

### 9.1 Roles That Interact with Audit Data

The following roles interact with audit data through the Audit Logs module's contracts, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2. Audit interaction is restricted by role because audit access is itself consequential — an investigator who queries the audit trail gains visibility into the actions of every other user in the tenant, which is sensitive information that warrants restricted access.

| Role Code | Role | Typical Audit-Related Responsibilities |
|---|---|---|
| R10 | Compliance officer | Audit trail investigation, breach investigation, regulatory export |
| R13 | System administrator | Audit configuration, retention policy management, verification scheduling |
| R14 | Integration account | System-to-system audit event stream subscription |
| R09 | Administrator | Operational oversight of audit module health |
| R01 | Physician | Patient access report review for own patients (where authorized) |
| R06 | Receptionist | No direct audit access (audit occurs through workflow actions) |
| R07 | Scheduler | No direct audit access (audit occurs through workflow actions) |

### 9.2 Permission Categories

Permissions on audit data are defined at the action level on the audit resource, in keeping with the permission philosophy in PRODUCT_BIBLE Section 21.2. The action categories are read, execute, and administer; the write category is absent because audit events are append-only and cannot be modified by any user. Read permissions include querying the primary audit trail, querying the meta-audit trail, viewing saved queries, viewing investigation workspaces. Execute permissions include producing exports, placing legal holds, running tamper-evidence verification, running trail integrity verification. Administer permissions include configuring retention policies, configuring export formats, configuring query authority, configuring monitoring hooks.

| Permission | Action | Typical Holder |
|---|---|---|
| Read primary trail | Query audit events | Compliance officer, authorized investigator |
| Read meta-audit | Query meta-audit events | Compliance officer (restricted) |
| Execute export | Produce regulated exports | Compliance officer, legal counsel |
| Execute verification | Run tamper-evidence, integrity checks | System administrator |
| Administer retention | Configure retention policies | System administrator, compliance officer |
| Administer configuration | Configure export formats, query authority | System administrator |

### 9.3 Emergency Access to Audit

Emergency access (break-glass) to audit data is a controlled capability that allows a senior role to query the audit trail without routine permission, in situations where an investigation cannot wait for permission restoration. Emergency access is explicit (the user takes a deliberate action to invoke it), audited at the highest granularity (every emergency access is recorded with user, time, scope, criteria, and justification), time-bounded (the access expires automatically), and reviewed (compliance officers and senior leadership review emergency access events within a defined window). Emergency access is not a routine workflow; frequent use indicates a permission configuration defect and is investigated.

Emergency access to audit is particularly consequential because the audit trail contains the actions of every other user in the tenant. An emergency access grant may reveal sensitive information about other users' actions (a clinician's emergency access to a patient record, a financial controller's journal entry corrections, an administrator's configuration changes). The cascade of sensitive information is governed: emergency access grants are scoped to the minimum necessary for the investigation, and the cascade scope is bounded by the original grant's purpose. Emergency access grants are reviewed by senior compliance leadership, not by the routine review path, reflecting the elevated sensitivity of audit data access.

---

## 10. Workflows

### 10.1 Workflows the Module Triggers

The Audit Logs module triggers workflows in response to audit lifecycle events. A tamper-evidence verification failure triggers a critical security incident workflow, with notification to compliance leadership and platform security. A retention policy disposal triggers a meta-audit recording (the disposal is recorded in the meta-audit trail). A legal hold placement triggers a retention policy suspension for the affected event scope. A patient access report request triggers a report production workflow, with delivery to the patient within the regulatory timeframe. A breach investigation export request triggers a rapid export workflow, with delivery to the investigator within hours.

The Audit module also triggers workflows in response to anomalies detected by downstream anomaly detection systems. An anomaly alert from a subscribed system triggers an investigation workflow, with the alert routed to the appropriate investigator role based on the anomaly type. The Audit module itself does not take action on anomalies (it does not block users, lock accounts, or revoke permissions); it routes the alert to the system or role that owns the responsive action. This separation honours the cohesion principle: the Audit module owns the audit record and the alert routing; the responsive system owns the response.

### 10.2 Workflows the Module Participates In

The Audit Logs module participates in workflows owned by other modules by consuming their events and by responding to their queries. Every consequential action in every other module produces an audit event that the Audit module consumes; the Audit module is a downstream consumer of every other bounded context. The Identity & Access module publishes authentication and authorization events; the Patients module publishes patient record access events; the Scheduling module publishes appointment events; the Billing module publishes financial events; the Configuration module publishes configuration change events. The Audit module consumes these events through a uniform contract and records them in the audit trail.

The Audit module responds to queries from the Reporting module (which produces operational, analytical, and regulatory reports that draw on audit data), from the integration module (which exposes audit data to external SIEM and monitoring systems through integration adapters), and from the patient portal (which produces patient access reports on request). The Audit module's query contracts are the surface by which these modules access audit data; direct data access is forbidden, in keeping with the state isolation principle (SYSTEM_ARCHITECTURE Section 13.8).

### 10.3 Audit Events Generated

The Audit Logs module generates audit events (meta-audit events) for every consequential action taken on the audit trail itself. Meta-audit events include audit query (every query of the primary trail), meta-audit query (every query of the meta-audit trail), audit export (every export produced), retention policy change (every modification to retention configuration), audit configuration change (every modification to audit module configuration), tamper-evidence verification (every verification run), trail integrity verification (every verification run), and audit event disposal (every disposal action). Meta-audit events are recorded in the meta-audit trail, with the same provenance metadata as primary audit events.

The volume of meta-audit events is much lower than the volume of primary audit events, because the actions on the audit trail are less frequent than the actions recorded by the audit trail. A typical tenant may produce millions of primary audit events per day but only thousands of meta-audit events per day. The lower volume supports higher retention for meta-audit events; a tenant with seven-year retention for primary events may have ten-year or indefinite retention for meta-audit events, reflecting the elevated importance of preserving evidence about the integrity of the audit function itself.

---

## 11. Data Models

### 11.1 Core Entities

The Audit Logs module owns the following core entities. Entity names are provided for reference; database schema definitions, table structures, and field-level specifications are out of scope for this document and are governed by the Database documentation under docs/06_DATABASE/.

| Entity | Purpose |
|---|---|
| Audit Event | A single audit event recorded in the primary audit trail |
| Audit Trail | The complete set of audit events for a tenant |
| Audit Query | A query submitted against the audit trail |
| Audit Export | A regulated export produced from the audit trail |
| Audit Retention Policy | A policy governing retention for an event category |
| Tamper-Evidence Record | A cryptographic hash record chained across event batches |
| Meta-Audit Event | An audit event recorded in the meta-audit trail |
| Legal Hold | A hold suspending disposal for a defined event scope |

The Audit Event is the aggregate root for the primary audit trail, per the aggregate boundary principle in MODULE_ARCHITECTURE Section 11.3. A Tamper-Evidence Record references a batch of Audit Events; a Legal Hold references a scope of Audit Events. The Meta-Audit Event is the aggregate root for the meta-audit trail, with similar boundary enforcement. The separation of primary and meta-audit trails at the entity level reflects their separation at the storage and contract level; an investigator querying the primary trail does not automatically have access to the meta-audit trail.

### 11.2 Supporting Entities

Supporting entities provide the structural context for core entities. The Audit Event Category classifies events by domain (clinical, financial, administrative, platform, meta-audit). The Audit Event Severity classifies events by consequence (critical, high, medium, low, informational). The Audit Query Result records the result of a query, with the criteria, the result count, and the result set reference. The Audit Export Format defines a regulated export format, with field mapping, encoding, and delivery configuration. The Investigation Workspace organizes queries, exports, and notes for a specific investigation. The Saved Query preserves a query for repeated execution. The Monitoring Hook Subscription records a downstream system's subscription to an audit event stream.

### 11.3 Entity Relationships

Core entities relate to the Audit Trail entity as the central audit object. An Audit Event references the Audit Trail and carries an Audit Event Category and an Audit Event Severity. A Tamper-Evidence Record references a batch of Audit Events. A Legal Hold references a scope of Audit Events by category, actor, resource, or time range. An Audit Query references the Audit Trail and produces an Audit Query Result. An Audit Export references the Audit Trail and an Audit Export Format. A Meta-Audit Event references the meta-audit trail (a separate trail from the primary Audit Trail). References to peer-module entities (patient identity, provider identity, resource identity) are logical identifiers, not direct data-store references (honouring state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 11.4 Aggregate Boundaries and Event Integrity

The Audit Event is the aggregate root for the primary audit trail. An audit event's constituent elements — the provenance metadata, the action metadata, the resource metadata, the authorization metadata, the result metadata — are subordinate to the event and cannot exist independently. A provenance metadata record without a parent Audit Event is a defect, not a recoverable state. The aggregate boundary ensures that audit event capture is atomic: an event either captures completely (all metadata recorded, indices updated, tamper-evidence chain extended) or fails completely (no metadata recorded, no indices updated, no chain extension). Partial capture is rejected at the contract level because it would produce an incomplete event that could be misinterpreted in investigation.

The integrity of the audit event is enforced at the aggregate boundary. An event that lacks required provenance metadata (actor, action, resource, tenant, time, authorization basis) is rejected before recording; the rejection is recorded in the meta-audit trail with the upstream module, the rejection reason, and the (partial) event contents that were rejected. The integrity enforcement is non-negotiable in Ibn Hayan because the entire audit function depends on event integrity: an event with missing provenance could not be interpreted in investigation, could not support regulatory export, and could not anchor the regulatory commitments that the platform makes.

---

## 12. Integrations

### 12.1 Peer Module Integrations

The Audit Logs module integrates with every peer module that produces consequential actions. The integration is one-directional at the event level: peer modules publish audit events; the Audit module consumes them. Peer modules do not query the Audit module; they publish to it. The Integration module's contracts define the uniform audit event contract that every peer module uses; the contract requires provenance metadata and rejects events that lack required fields. The Patients, Scheduling, Billing, CRM, Workforce, Pharmacy, Inventory, Notifications, Accounting, Reception, Settings, Reports, and Subscriptions modules all publish audit events to the Audit module. The Identity & Access module publishes authentication and authorization events; the Configuration module publishes configuration change events.

The Audit module integrates with the Reporting module by responding to queries for audit data. Operational reports draw on audit data for activity metrics; analytical reports draw on audit data for trend analysis; regulatory reports draw on audit data for compliance evidence. The Reporting module's queries are scoped to the caller's authority, with the Audit module enforcing the same scope restrictions on the Reporting module as on direct investigators.

### 12.2 External System Integrations

External system integrations are mediated by the Integration module (deployable expression of the Integration Layer per SYSTEM_ARCHITECTURE Section 19). The Integration module exposes the Audit module's monitoring hooks through integration adapters that align with security and monitoring interoperability patterns — SIEM systems through common event format (CEF) or JSON-based event streaming, log aggregation systems through syslog or HTTP-based streaming, anomaly detection systems through stream subscription. The Audit module is not aware of the specific external systems; it is aware only of the Integration module's contracts. Subscriptions are configured per downstream system, with scope filters that limit the events each subscriber receives.

External regulator integrations are mediated by the Integration module through regulator-specific export adapters. A regulator that requires a specific export format receives exports through an adapter configured for that format; a regulator that requires direct access receives access through an adapter configured for that regulator's access contract. The adapter layer translates between the Audit module's canonical export format and the regulator's required format, preventing regulator format leakage into the Audit module's contract surface. The translation is documented, versioned, and tested; an adapter that fails to translate correctly is a defect that could produce non-compliant regulatory exports and is corrected immediately.

### 12.3 Integration Patterns

Integration patterns honor the communication patterns defined in SYSTEM_ARCHITECTURE Section 13.5. Asynchronous event is the primary pattern for audit event capture — peer modules publish events without waiting for confirmation, and the Audit module records them asynchronously. This pattern is used because audit capture must not block clinical workflow; a physician entering an order must not wait for the audit event to be recorded before the order is confirmed. The trade-off is that audit capture is eventually consistent — there is a brief window between the upstream action and the audit record's persistence, during which the action has occurred but the audit event is not yet queryable. The window is short (seconds under normal operation) and is monitored as a module health metric.

Synchronous query is the pattern for audit investigation — an investigator issues a query and waits for results. Synchronous command is the pattern for audit configuration changes — a system administrator changes a retention policy and waits for confirmation. The outbox pattern is used for audit event publication to monitoring hooks, ensuring that an event delivered to a hook is reliably delivered at least once, with redelivery on transient failure. Anticorruption layers are used at the boundary between the Audit module and external SIEM/regulator systems, per the context relationship pattern defined in SYSTEM_ARCHITECTURE Section 7.3. External systems have their own event models, their own validation rules, and their own update cadences; the Integration module's adapters translate between external models and the Ibn Hayan audit model, preventing external model leakage.

---

## 13. Configuration

### 13.1 Configuration Categories

The Audit Logs module exposes its configurable behaviour through the configuration layers defined in SYSTEM_ARCHITECTURE Section 15 and PRODUCT_BIBLE Section 22. The configuration categories include retention policy configuration (per event category, per regulatory framework, per tenant), export format configuration (per regulator, per format template), query authority configuration (per role, per event category, per tenant), monitoring hook configuration (per subscriber, per scope filter), verification cadence configuration (per tenant, per verification type), and archival threshold configuration (per event category, per tenant). Each category is governed by the configuration validation framework (SYSTEM_ARCHITECTURE Section 15.4) and is itself audited when changed.

| Configuration Category | Layer | Validation |
|---|---|---|
| Retention policy | L4 Tenant | V1 Syntactic, V2 Semantic, V3 Reference |
| Export format | L3 Tenant template | V1, V2, V3 |
| Query authority | L4 Tenant | V1, V2, V3, V4 Permission |
| Monitoring hook subscription | L4 Tenant | V1, V2, V3 |
| Verification cadence | L4 Tenant | V1, V2 |
| Archival threshold | L4 Tenant | V1, V2 |

### 13.2 Configuration Layers

Audit configuration spans multiple configuration layers per the layer model in SYSTEM_ARCHITECTURE Section 15.2. Platform defaults (L1) provide the baseline retention periods, export formats, and verification cadences that apply to every tenant. Tenant configuration (L4) overrides platform defaults where the tenant's regulatory framework or operational requirements differ. Tenant-template configuration (L3) provides reusable templates for tenants with similar regulatory profiles — a tenant operating in a jurisdiction with HIPAA requirements may apply an HIPAA-aligned template that configures retention and export for HIPAA compliance. Configuration inheritance is governed by the inheritance rules in SYSTEM_ARCHITECTURE Section 15.3, with more specific layers overriding more general layers.

Configuration changes are validated through the five-category validation framework (V1 syntactic, V2 semantic, V3 reference, V4 permission, V5 sandbox). A retention policy change is validated syntactically (the policy structure is well-formed), semantically (the retention period is within regulatory limits for the event category), by reference (the event category exists; the regulatory framework is configured for the tenant), by permission (the caller is authorized to change retention policy), and through sandbox testing (the change is applied in a sandbox and verified before promotion to production). Validation failures are surfaced to the caller with the failure reason; validation successes are recorded as audit configuration change events in the meta-audit trail.

### 13.3 Validation and Sandbox

Audit configuration changes are subject to the sandbox framework defined in SYSTEM_ARCHITECTURE Section 15.6. A retention policy change is applied in a sandbox tenant first, where the change's effects on disposal scheduling, query performance, and storage utilization can be observed without affecting the production audit trail. A query authority change is applied in a sandbox where the change's effects on investigator access can be verified before promotion. Sandbox testing is mandatory for changes that affect retention (because retention errors cannot be undone — an event disposed of under an incorrect policy is gone), and is recommended for changes that affect query authority or export format.

Sandbox testing for audit configuration is particularly important because audit configuration errors can have regulatory consequences. A retention policy that disposes of events before the regulatory retention period expires is a regulatory violation; an export format that omits required fields is a regulatory defect. The sandbox framework allows the tenant to verify that the configuration change produces the intended behaviour before the change is promoted to production. Sandbox testing is documented as part of the configuration change record, preserving the evidence that the change was tested before promotion.

### 13.4 Audit of Configuration Changes

Every audit configuration change generates a meta-audit event. The event records the configuration key, the previous value, the new value, the actor, the time, the authorization basis, the validation results, and the sandbox test results (where applicable). The event is recorded in the meta-audit trail, with the same immutability, tamper-evidence, and retention guarantees as primary audit events. Configuration change audit is the mechanism by which the integrity of the audit configuration is verified; a regulator who questions whether a retention policy was changed inappropriately is answered by reference to the meta-audit trail.

Configuration change audit is also the mechanism by which configuration defects are investigated. A retention policy change that disposes of events inappropriately is investigated by querying the meta-audit trail for the change event, identifying the actor, the time, and the authorization basis. The investigation may reveal that the change was made in error (in which case the policy is corrected and the affected events are restored from backup if possible), or that the change was made deliberately (in which case the actor is investigated for misconduct). The investigation is itself recorded in the meta-audit trail, preserving the evidence of the investigation.

---

## 14. Permissions

### 14.1 Permission Model

The Audit Logs module's permission model follows the platform's permission philosophy (PRODUCT_BIBLE Section 21). Permissions are defined at the action level on the audit resource, with the audit resource encompassing the primary audit trail, the meta-audit trail, audit configuration, and audit operations (verification, export, retention). Permissions are scoped to the caller's tenant, with cross-tenant access not supported by default. Permissions are inherited through the role hierarchy, with role definitions as catalogued in PRODUCT_BIBLE Section 20.2. Permissions are enforced at the contract layer; a caller without a required permission receives a not-found response rather than the data, preventing permission discovery through query.

The permission model for audit data is more restrictive than the permission model for operational data, because audit data access is itself consequential. An investigator with audit query permission gains visibility into the actions of every other user in the tenant; this visibility is sensitive and warrants restricted access. The permission model reflects this elevated sensitivity by limiting audit query authority to a small set of roles (compliance officer, system administrator with audit oversight) and by requiring additional authorization for meta-audit query authority (which reveals the investigative activity of the organization).

### 14.2 Permission Categories

Audit permissions are organized into the action categories defined in PRODUCT_BIBLE Section 21.2, with the write category absent because audit events are append-only.

| Permission Category | Action | Typical Holder |
|---|---|---|
| Read primary trail | Query audit events | Compliance officer, authorized investigator |
| Read meta-audit trail | Query meta-audit events | Compliance officer (restricted) |
| Execute export | Produce regulated exports | Compliance officer, legal counsel |
| Execute verification | Run tamper-evidence, integrity checks | System administrator |
| Administer retention | Configure retention policies | System administrator, compliance officer |
| Administer query authority | Configure investigator permissions | System administrator |
| Administer export formats | Configure export format templates | System administrator |
| Administer monitoring hooks | Configure hook subscriptions | System administrator |

### 14.3 Permission Inheritance and Scope

Permissions are inherited through the role hierarchy, with the inheritance rules defined in PRODUCT_BIBLE Section 21.4. A role that inherits audit query permission from a parent role gains the permission through inheritance; a role that is granted audit query permission directly gains the permission through direct grant. Inheritance is documented for each role, supporting permission audit and regulatory inquiry. Scope is enforced at the tenant level by default; an investigator in tenant A cannot query audit events in tenant B, even with audit query permission, because the scope is restricted to the investigator's own tenant.

Cross-tenant audit query is not supported by default. A regulator or platform operator with legitimate cross-tenant audit visibility is granted access through a separate operational audit surface that is configured per regulator or per platform operator role, with the access itself audited at higher granularity than tenant-level audit. The operational audit surface is a platform-level capability, not a tenant-level capability, and its access is restricted to authorized roles with documented justification for each query. This honours Principle P10 (Multi-Tenancy as Default) and Principle P3 (One Platform, Many Organizations).

---

## 15. Reports

### 15.1 Operational Reports

Operational reports surface audit module activity for daily operational management. Reports include audit capture volume (events per hour, per day, per category), audit capture latency (time from upstream action to audit record persistence), query volume (queries per hour, per investigator), query performance (response time percentiles), export volume (exports per day, per format), verification results (last verification, next scheduled, failures if any), and retention disposal queue (events scheduled for disposal, legal holds in force). Operational reports are generated through the Reporting module's contracts, with the Audit module providing the underlying data. Reports are typically consumed by system administrators, compliance officers, and platform operators for day-to-day operational decisions.

### 15.2 Analytical Reports

Analytical reports surface audit trends for strategic planning and risk management. Reports include access pattern trends (which patient records are accessed most frequently, by which roles), authentication anomaly trends (failed login rates, geographic anomalies), configuration change trends (which configuration categories change most frequently), investigator activity trends (which investigators query most frequently, in which categories), and retention disposal trends (events disposed per period, retention policy changes per period). Analytical reports are generated through the Reporting module's analytical pipeline, with audit data aggregated over time and across categories. Analytical reports support compliance program improvement, security posture assessment, and operational optimization.

### 15.3 Regulatory Reports

Regulatory reports surface audit-related compliance evidence. Reports include patient access summary (every access of a specific patient's record, formatted for regulator review), breach investigation summary (every event relevant to a specific breach, formatted for regulator review), retention compliance summary (every retention policy in force, every disposal action taken, every legal hold placed), and verification history (every verification run, every verification result, every verification failure with investigation). Regulatory reports are themselves auditable; report generation is recorded in the meta-audit trail, in keeping with SYSTEM_ARCHITECTURE Section 27.8. Regulatory reports are produced on regulator request or on a scheduled cadence aligned to regulatory reporting requirements.

---

## 16. API Surface

### 16.1 Contract Categories

The Audit Logs module exposes its contract surface through the four contract types defined in SYSTEM_ARCHITECTURE Section 7.4 and MODULE_ARCHITECTURE Section 4: commands, queries, events, and configuration schemas. Contracts are versioned, with breaking changes following the platform's deprecation policy. Contracts are documented as part of the module's definition of done; undocumented contracts are defective, per Principle P7 (Documented Before Implemented, SYSTEM_ARCHITECTURE Section 4.7.1). The contract surface is the only legitimate way for peer modules and external systems to interact with the Audit module; direct data access is forbidden (state isolation, SYSTEM_ARCHITECTURE Section 13.8).

### 16.2 Command Contracts

Command contracts are requests to perform an action that changes audit state. Examples include PlaceLegalHold, LiftLegalHold, ProduceExport, RunTamperEvidenceVerification, RunTrailIntegrityVerification, UpdateRetentionPolicy, UpdateExportFormat, UpdateQueryAuthority, SubscribeMonitoringHook, UnsubscribeMonitoringHook. Commands are synchronous where the caller requires immediate confirmation (PlaceLegalHold, RunTamperEvidenceVerification), asynchronous where the caller does not (ProduceExport for large scopes). Commands are validated before execution; a command that fails validation is rejected, with the rejection reason returned to the caller and recorded in the meta-audit trail. Commands are idempotent where the operation supports idempotency (PlaceLegalHold is idempotent — placing the same hold twice produces the same hold state).

### 16.3 Query Contracts

Query contracts are requests to retrieve audit state without changing it. Examples include QueryAuditEvents, QueryMetaAuditEvents, GetRetentionPolicy, GetExportFormat, GetQueryAuthority, GetMonitoringHookSubscription, GetVerificationStatus, GetInvestigationWorkspace, GetSavedQuery. Queries are synchronous for typical investigation scopes, asynchronous for scopes that exceed the synchronous response threshold (typically a few seconds). Queries are scoped to the caller's authority — a caller without read permission on a specific event category receives a not-found response rather than the data, preventing permission discovery through query. Every query is recorded in the meta-audit trail (audit of audit).

### 16.4 Event Contracts

Event contracts are notifications that something has happened in the Audit module. Examples include AuditEventCaptured, MetaAuditEventCaptured, TamperEvidenceVerificationCompleted, TrailIntegrityVerificationCompleted, RetentionPolicyChanged, ExportProduced, LegalHoldPlaced, LegalHoldLifted, MonitoringHookDelivered. Events are published asynchronously, with subscribers consuming them through the platform's event-delivery infrastructure. Events are the primary mechanism by which downstream systems (SIEM, anomaly detection, compliance monitoring) maintain their local projections of audit data. The Audit module's event contracts are versioned with the module's other contracts; breaking changes follow the platform's deprecation policy.

### 16.5 Configuration Schema Contracts

Configuration schema contracts are declarative definitions of the Audit module's configurable behaviour. The schema defines the configuration keys the module accepts, their types, their defaults, their validation rules, and their inheritance behaviour. The schema is versioned with the module's other contracts; breaking changes follow the platform's deprecation policy. The schema is published as part of the module's contract surface; tenant administrators and the Configuration module's service consume the schema to validate configuration changes before application. Configuration schema changes are themselves recorded as meta-audit events, preserving the evidence of what configuration was possible at what time.

---

## 17. Future Enhancements

### 17.1 Extension Points

The Audit Logs module exposes extension points that allow capability to be added without source-level modification, in keeping with the extension surface architecture in SYSTEM_ARCHITECTURE Section 22 and MODULE_ARCHITECTURE Section 9. Extension points include custom export formats (for regulators whose format requirements are not covered by the platform defaults), custom retention policy rules (for jurisdictions whose retention rules are not expressible through the platform default policy model), custom monitoring hook filters (for downstream systems whose filtering requirements exceed the platform default filter capabilities), and custom anomaly detection integrations (for analytical systems whose integration patterns are not supported by the platform defaults). Extensions that cannot be expressed through extension points are candidates for platform evolution, not for customer-specific customization, per Principle P2 (Configuration Before Customization, SYSTEM_ARCHITECTURE Section 4.3).

Extension points in the Audit module are governed by the same lifecycle as platform features: defined, active, deprecated, retired. An extension point that has been deprecated is supported through a transition window, after which it is retired. Customers using a deprecated extension point are notified through the platform's change-management channel and are supported in migrating to the successor extension point or to platform-native capability. The lifecycle governance prevents extension point accumulation, which would otherwise compromise the module's contract stability over time — a particular concern for the Audit module, where contract stability is essential for regulatory engagement.

### 17.2 Module Lifecycle

The Audit Logs module is at the Mature stage of the module lifecycle (LC4, PRODUCT_BIBLE Section 19.5 and SYSTEM_ARCHITECTURE Section 9.6). The module has been in General Availability since the platform's initial release, has completed the defined period of stable operation required for transition to Mature, and has a long-term support commitment. The module's contracts are stable; breaking changes follow the platform's deprecation policy, with old contracts supported through a defined transition window. Lifecycle transitions — for example, a future transition to Deprecation Candidate — would be ratified by the Architecture Council and documented in the platform's CHANGELOG. The Audit module's Mature status reflects its foundational role in the platform's regulatory posture; the module is not subject to disruptive change because disruptive change would invalidate years of accumulated audit evidence.

### 17.3 Edition Availability

The Audit Logs module is included in every edition of the Ibn Hayan platform, per the edition packaging defined in PRODUCT_BIBLE Section 16. The Trial edition (E0) provides audit event capture and basic query, with limited data volume and limited retention. The Essential edition (E1) provides the full audit event capture, query, retention, and verification capabilities, with retention periods aligned to common regulatory defaults. The Professional edition (E2) adds compliance reporting and export, patient access reports, breach investigation exports, and saved queries. The Enterprise edition (E3) adds meta-audit query, regulator direct access, custom export formats, custom retention policy rules, and advanced monitoring hook configuration. Edition packaging does not modify module internals; all editions run the same code, with edition differences expressed as configuration.

### 17.4 Clinic Type Relevance

The Audit Logs module is relevant to every clinic type catalogued in PRODUCT_BIBLE Section 18.2, because every clinic type generates audit events and every clinic type is subject to regulatory audit requirements. The following clinic types have particular reliance on advanced audit module capabilities.

| Clinic Type | Reliance Rationale |
|---|---|
| C1 General practice | Patient access audit for privacy compliance |
| C9 Single hospital | Multi-department audit; regulator engagement |
| C10 Hospital network | Multi-entity audit; consolidated reporting |
| C11 Academic medical centre | Research consent audit; multi-source financial audit |
| C14 Long-term care | Guardian access audit; advance directive audit |
| C18 Emergency department | Emergency access audit; high-volume patient access |
| C23 Pharmacy | Controlled substance audit; regulatory engagement |
| C28 Mental health clinic | Sensitive-record access audit; granular consent audit |
| C30 Long-term care facility | Guardian access audit; longitudinal record audit |

### 17.5 Operational Considerations

Operational considerations for the Audit Logs module include data volume, query performance, retention storage cost, and verification cadence. Audit data volumes grow with the tenant's activity; a large enterprise tenant may accumulate hundreds of millions of audit events per year, requiring storage sizing aligned to multi-year retention periods. Query performance is operationally critical for investigation; an investigator working against time cannot wait hours for query results, so the query engine is optimized for the investigation patterns that investigators actually use, with indices on the most common query dimensions. Retention storage cost is a significant line item for high-volume tenants; archival storage and disposal at end of retention manage the cost, with cost monitored as a module health metric.

Verification cadence is an operational decision that trades verification granularity against verification cost. A tenant with high-volume audit data may verify daily (catching tamper-evidence failures within a day) or weekly (catching failures within a week, at lower verification cost). The cadence is configurable per tenant, with the default aligned to the tenant's edition and operational profile. Offline operation is supported for audit capture at facilities with intermittent connectivity, with local audit recording and synchronization to the central audit trail when connectivity is restored, in keeping with the offline-first principle (P11, SYSTEM_ARCHITECTURE Section 4.11). Offline capture is buffered locally and synchronized with the same immutability and tamper-evidence guarantees as online capture; an offline-captured event is identical to an online-captured event once synchronized.

Disaster recovery for audit data is a primary operational concern. The audit trail is the regulatory anchor for the tenant; a tenant that loses audit data loses the ability to demonstrate compliance. The Audit module's data is replicated, backed up, and recoverable per the platform's data durability commitments, with recovery time objectives aligned to the tenant's edition. Recovery procedures are tested regularly; an untested recovery procedure is treated as no recovery procedure at all, in keeping with Principle P1 (Healthcare Safety) applied to the audit substrate on which accountability rests. Audit data integrity is verified after recovery — a recovery that produces inconsistent audit state is itself an incident and is investigated, because inconsistent audit state could indicate either a recovery defect or a modification attempt that the recovery exposed.

---

## 18. Related Documents

### 18.1 Canonical References

- PRODUCT_BIBLE.md Section 19.2 — Module catalogue (M16 Audit, BC17)
- PRODUCT_BIBLE.md Section 20.2 — Role catalogue (R01–R14)
- PRODUCT_BIBLE.md Section 21 — Permission philosophy (action-level permissions, scoping, inheritance, emergency access)
- PRODUCT_BIBLE.md Section 22 — Configuration-driven philosophy (configuration layers, validation, audit, governance)
- PRODUCT_BIBLE.md Section 16 — Edition packaging (E0–E3)
- PRODUCT_BIBLE.md Section 18.2 — Clinic type catalogue (C1–C30)
- SYSTEM_ARCHITECTURE.md Section 4 — Architectural principles (P1, P3, P4, P5, P7, P8, P10, P11, P13)
- SYSTEM_ARCHITECTURE.md Section 7.2 — Bounded context catalogue (BC17 Audit)
- SYSTEM_ARCHITECTURE.md Section 13 — Module architecture (boundaries, contracts, dependencies, communication, versioning, extension, isolation, testing)
- SYSTEM_ARCHITECTURE.md Section 15 — Configuration strategy (layer model, validation, versioning, audit, sandbox, hot-reload)
- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit as primitive, audit surface, audit record structure, audit store, audit query, audit and offline, audit and compliance, audit of audit)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- MODULE_ARCHITECTURE.md Section 2.2 — Module catalogue and bounded context alignment
- MODULE_ARCHITECTURE.md Section 10 — Module configuration surface (categories, design criteria, governance)
- MODULE_ARCHITECTURE.md Section 11.3 — Aggregate boundaries and state isolation

### 18.2 Peer Module References

- PATIENTS.md — Patient module (BC01); publishes patient record access events to the Audit module
- APPOINTMENTS.md — Scheduling module (BC06); publishes appointment events to the Audit module
- BILLING.md — Billing module (BC07); publishes financial events to the Audit module
- CRM.md — CRM module (BC11); publishes marketing and outreach events to the Audit module
- DOCTORS.md — Workforce module (BC10); publishes credentialing and scheduling events to the Audit module
- RECEPTION.md — Reception module (subset of BC06 + BC01); publishes check-in and queue events to the Audit module
- ACCOUNTING.md — Accounting module (BC08); publishes journal entry and period close events to the Audit module

### 18.3 Audit and Reporting References

- SYSTEM_ARCHITECTURE.md Section 27 — Audit architecture (audit primitive, audit surface, audit record structure, audit store, audit query, audit and offline, audit and compliance, audit of audit)
- SYSTEM_ARCHITECTURE.md Section 28 — Reporting architecture (operational, analytical, regulatory reporting)
- PRODUCT_BIBLE.md Section 21.7 — Permission audit (every permission check is recorded in the audit trail, with separate treatment for audit query authority and meta-audit query authority reflecting the elevated sensitivity of audit data access)
