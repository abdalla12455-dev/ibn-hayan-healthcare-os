# Ibn Hayan Healthcare Operating System — HIPAA Compliance

| Field | Value |
|---|---|
| Document Title | HIPAA Compliance Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Security/Compliance Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 31 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CISO |
| Custodian | Compliance Council |
| Review Cadence | Annual, with off-cycle revision when HIPAA regulatory updates are issued or when a related Architecture Decision Record is ratified |
| Audience | Compliance officers, privacy officers, security architects, internal and external auditors, regulators, customer compliance and privacy teams |
| Scope | HIPAA compliance posture for the Ibn Hayan platform: Privacy Rule, Security Rule, Breach Notification Rule, HITECH Act, administrative safeguards, physical safeguards, technical safeguards, organizational requirements, policies and procedures, breach notification, business associate agreements, risk assessment, audit, training, patient rights, and compliance checklist |
| Out of Scope | Implementation details, source code, API endpoint specifications, database schemas, UI component catalogues, deployment runbooks, vendor selection, specific HIPAA-technology selection, legal interpretation of HIPAA for specific customer contexts |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through architectural or compliance governance. |
| Amendment Mechanism | Compliance Council ratification through a documented change record for material changes; minor revisions recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. HIPAA Overview
2. HIPAA Privacy Rule
3. HIPAA Security Rule
4. Administrative Safeguards
5. Physical Safeguards
6. Technical Safeguards
7. Breach Notification Rule
8. Business Associate Agreements (BAAs)
9. HIPAA Risk Assessment
10. HIPAA Audit & Documentation
11. HIPAA Training Requirements
12. Patient Rights Under HIPAA
13. HIPAA Compliance Checklist
14. Related Documents

---

## 1. HIPAA Overview

### 1.1 Purpose of This Document

This document defines the HIPAA compliance posture for the Ibn Hayan Healthcare Operating System. The Health Insurance Portability and Accountability Act (HIPAA) is a United States federal law that governs the protection of protected health information (PHI). HIPAA applies to covered entities (healthcare providers, health plans, healthcare clearinghouses) and business associates (entities that perform services for covered entities that involve access to PHI). The document is the canonical reference for HIPAA compliance decisions for the Ibn Hayan platform and for tenants operating under HIPAA's jurisdiction.

The document elaborates the architectural commitments defined in SYSTEM_ARCHITECTURE Section 20 (Security Architecture) and PRODUCT_BIBLE Section 27 (Security Philosophy) into HIPAA-specific compliance policy. It is governed by the Office of the CISO, custodied by the Compliance Council, and amended through the documented change record mechanism when material changes are introduced. Where this document and the architectural or product references diverge, the architectural and product references prevail.

### 1.2 HIPAA Regulatory Framework

HIPAA comprises several rules, each governing a distinct aspect of PHI protection. The rules are summarized below, with the full regulatory text maintained in the official HIPAA regulatory references. The Ibn Hayan platform's compliance posture addresses each rule, with the addressing documented in the relevant section of this document.

| Rule | Description | Ibn Hayan Treatment |
|---|---|---|
| Privacy Rule | Governs the use and disclosure of PHI | Section 2 |
| Security Rule | Governs the safeguarding of electronic PHI (ePHI) | Section 3, with safeguards in Sections 4-6 |
| Breach Notification Rule | Governs notification of breaches of unsecured PHI | Section 7 |
| HITECH Act | Strengthens HIPAA, extends to business associates, increases penalties | Throughout |

### 1.3 Ibn Hayan's Posture Under HIPAA

Ibn Hayan operates as a business associate to its covered entity customers. The platform provides services to covered entities that involve access to PHI, triggering HIPAA's business associate provisions. The business associate posture is documented in the Business Associate Agreement (BAA) executed between Ibn Hayan and each covered entity customer, with the BAA documenting the platform's commitments and the customer's expectations.

The business associate posture does not diminish Ibn Hayan's compliance commitments. The platform's security posture is designed to meet the Security Rule's requirements for business associates, with the meeting documented in Sections 4 through 6. The platform's privacy posture is designed to support the covered entity's compliance with the Privacy Rule, with the support documented in Section 2 and in `PRIVACY_POLICY.md`.

### 1.4 HIPAA and Multi-Tenancy

HIPAA compliance respects tenant isolation, in keeping with ADR-004 (Multi-Tenant Strategy). Each covered entity customer operates as a tenant, with the tenant's PHI isolated from other tenants' PHI. The tenant scoping is enforced at every layer of the platform, in keeping with SYSTEM_ARCHITECTURE Section 10.3, and is non-negotiable. Cross-tenant PHI access is forbidden, with the prohibition enforced at the data layer and verified through periodic security testing.

The tenant scoping of HIPAA compliance supports the platform's multi-tenant posture. A covered entity customer can rely on the platform's tenant isolation to demonstrate to regulators that their PHI is protected against unauthorized access by other tenants. The tenant scoping is documented in the BAA and is verified through periodic compliance audits.

### 1.5 HIPAA and Other Regulations

HIPAA is one of several regulatory frameworks that may apply to the Ibn Hayan platform. Other frameworks include the GDPR (documented in `GDPR.md`), regional healthcare regulations, and state-level privacy regulations. Where multiple frameworks apply, the platform applies the most stringent requirement, with the application documented per tenant. The multi-framework posture is documented in `SECURITY_GUIDELINES.md` and in the platform's compliance documentation.

The multi-framework posture does not dilute HIPAA compliance. The platform's HIPAA compliance posture is documented independently of other frameworks, with the documentation specifying the HIPAA requirements and the platform's controls. Where another framework's requirements exceed HIPAA's, the platform applies the more stringent requirement; where HIPAA's requirements exceed another framework's, the platform applies HIPAA's requirement.

### 1.6 HIPAA Scope and Applicability

HIPAA applies to tenants operating under United States jurisdiction. Tenants operating under other jurisdictions are not subject to HIPAA but may be subject to comparable regional regulations. The platform's HIPAA compliance posture is applied to tenants who have executed a BAA, with the application documented in the tenant's compliance configuration. Tenants who have not executed a BAA are not subject to HIPAA through the platform, but the platform's security posture remains consistent across all tenants, in keeping with the platform's uniform operational posture.

---

## 2. HIPAA Privacy Rule

### 2.1 Privacy Rule Overview

The HIPAA Privacy Rule governs the use and disclosure of protected health information (PHI) by covered entities and their business associates. PHI is individually identifiable health information transmitted or maintained in any form. The Privacy Rule establishes standards for the use and disclosure of PHI, for the provision of individual rights with respect to PHI, and for the administrative requirements that govern PHI handling.

The Ibn Hayan platform's privacy posture is documented in `PRIVACY_POLICY.md` and supports the covered entity's compliance with the Privacy Rule. The platform's role as a business associate means that the platform uses and discloses PHI only as permitted by the BAA and only as directed by the covered entity. The platform does not use or disclose PHI for its own purposes, except as permitted by the Privacy Rule (e.g., for the platform's own operations, such as auditing and compliance demonstration).

### 2.2 Permitted Uses and Disclosures

The Privacy Rule permits covered entities to use and disclose PHI for treatment, payment, and healthcare operations (TPO) without individual authorization. Other uses and disclosures require individual authorization, with limited exceptions (e.g., as required by law, for public health activities, for law enforcement purposes). The Ibn Hayan platform supports TPO uses and disclosures as directed by the covered entity, with the support documented in the BAA.

Permitted uses and disclosures are governed by the platform's authorization framework, documented in `AUTHORIZATION.md`. The framework enforces the minimum necessary standard (the minimum PHI necessary for the purpose), with the enforcement documented per role and per action. The framework also enforces audit (every access to PHI is recorded), supporting compliance demonstration and breach investigation.

### 2.3 Minimum Necessary Standard

The minimum necessary standard requires that covered entities and their business associates limit the use, disclosure, and request of PHI to the minimum necessary for the purpose. The standard does not apply to disclosures to or requests by a healthcare provider for treatment, or to disclosures made under an individual authorization. The Ibn Hayan platform enforces the minimum necessary standard through the authorization framework, with the enforcement documented per role and per action.

The minimum necessary standard is implemented through the platform's role-based access control (RBAC), with roles defined to grant the minimum permissions required for the role's function. The roles are documented in `ROLES_AND_PERMISSIONS.md`. The minimum necessary standard is also implemented through the platform's field-level authorization, with sensitive fields subject to additional access controls. The field-level authorization is documented in `AUTHORIZATION.md` Section 6.

### 2.4 Individual Rights

The Privacy Rule grants individuals rights with respect to their PHI, including the right to access their PHI, the right to request amendments to their PHI, the right to receive an accounting of disclosures of their PHI, the right to request restrictions on uses and disclosures of their PHI, the right to request confidential communications, and the right to complain about Privacy Rule violations. The Ibn Hayan platform supports these rights through documented workflows, with the support documented in Section 12 (Patient Rights Under HIPAA).

Individual rights are governed by the platform's privacy posture, documented in `PRIVACY_POLICY.md`. The posture ensures that individuals can exercise their rights through documented, auditable workflows, with the workflows supporting the covered entity's compliance with the Privacy Rule. The workflows are tested periodically through compliance testing, with the testing verifying that the workflows function as documented.

### 2.5 Administrative Requirements

The Privacy Rule establishes administrative requirements for covered entities and their business associates, including the designation of a privacy official, the development of privacy policies and procedures, the training of workforce members on privacy policies and procedures, the implementation of safeguards to protect PHI, the maintenance of documentation, and the application of sanctions for Privacy Rule violations. The Ibn Hayan platform supports the covered entity's administrative requirements through documented workflows, with the support documented throughout this document.

Administrative requirements are governed by the platform's privacy posture and the platform's security posture. The privacy posture is documented in `PRIVACY_POLICY.md`; the security posture is documented in `SECURITY_GUIDELINES.md`. Both postures support the covered entity's compliance with the Privacy Rule's administrative requirements, with the support documented per requirement.

### 2.6 Privacy Rule and Audit

The Privacy Rule requires covered entities and their business associates to maintain documentation of their privacy policies and procedures, of their uses and disclosures of PHI, and of their compliance with the Privacy Rule. The Ibn Hayan platform supports these documentation requirements through the audit trail, with the audit trail recording every access to PHI and every disclosure of PHI. The audit trail is documented in `AUDIT.md` and in SYSTEM_ARCHITECTURE Section 27.

Audit records are retained per the Privacy Rule's retention requirements (six years from the date of creation or the date when last in effect, whichever is later), with the retention documented in `DATA_RETENTION.md`. Audit records are immutable, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5. Audit records are accessible to the covered entity and to regulators, with the access governed by the platform's authorization framework.

---

## 3. HIPAA Security Rule

### 3.1 Security Rule Overview

The HIPAA Security Rule establishes national standards for the protection of electronic protected health information (ePHI). The Security Rule applies to covered entities and business associates and requires the implementation of administrative, physical, and technical safeguards to protect the confidentiality, integrity, and availability of ePHI. The Security Rule is technology-neutral, allowing covered entities and business associates to select the safeguards that are appropriate to their environment.

The Ibn Hayan platform's security posture is documented in `SECURITY_GUIDELINES.md` and meets the Security Rule's requirements. The meeting is documented in Sections 4 (Administrative Safeguards), 5 (Physical Safeguards), and 6 (Technical Safeguards), with each section mapping the Security Rule's requirements to the platform's controls. The mapping is verified through periodic compliance audits.

### 3.2 Security Rule Standards

The Security Rule's standards are organized into three categories: administrative safeguards, physical safeguards, and technical safeguards. Each category contains standards, implementation specifications, and required or addressable implementation. Required implementations must be implemented; addressable implementations must be implemented or the entity must document why the implementation is not reasonable and appropriate and why an alternative measure is implemented or why the standard is not applicable.

The Ibn Hayan platform implements all required implementations and all addressable implementations that are reasonable and appropriate for the platform's environment. The implementations are documented in Sections 4 through 6, with the documentation specifying the requirement, the platform's control, and the verification of the control. Addressable implementations that the platform does not implement are documented with the rationale, in keeping with the Security Rule's documentation requirements.

### 3.3 Security Rule and Risk Assessment

The Security Rule requires covered entities and business associates to conduct a risk assessment to identify risks to ePHI and to implement safeguards to address those risks. The Ibn Hayan platform conducts periodic risk assessments, with the assessments documented in Section 9 (HIPAA Risk Assessment). The risk assessments identify the platform's risks, assess the risks' severity, and document the safeguards implemented to address the risks.

Risk assessment is the foundation of the Security Rule's compliance posture. The Security Rule does not prescribe specific safeguards; instead, it requires that safeguards be selected based on the entity's risk assessment. The Ibn Hayan platform's risk assessment is comprehensive, covering all platform surfaces, all data classes, and all threats. The risk assessment is reviewed annually and is updated as the platform evolves.

### 3.4 Security Rule and Documentation

The Security Rule requires covered entities and business associates to maintain documentation of their security policies and procedures, of their risk assessments, of their safeguard implementations, and of their compliance with the Security Rule. The Ibn Hayan platform maintains this documentation, with the documentation retained per the Security Rule's retention requirements (six years from the date of creation or the date when last in effect, whichever is later).

Documentation is maintained in the platform's documentation framework, with this document and the peer security documents (e.g., `SECURITY_GUIDELINES.md`, `AUTHENTICATION.md`, `AUDIT.md`) constituting the platform's security documentation. Documentation is reviewed annually by the Compliance Council, with the review verifying that documentation remains current and accurate.

### 3.5 Security Rule and Audit

The Security Rule requires covered entities and business associates to implement audit controls that record and examine activity in systems containing ePHI. The Ibn Hayan platform implements audit controls through the audit trail, with the audit trail documented in `AUDIT.md` and in SYSTEM_ARCHITECTURE Section 27. The audit trail records every access to ePHI, every disclosure of ePHI, and every modification to ePHI, supporting compliance demonstration and breach investigation.

Audit controls are subject to periodic review, with the review verifying that the audit trail is complete, that the audit trail is accurate, and that the audit trail is accessible for compliance demonstration. The review is documented and is itself auditable, supporting the Security Rule's documentation requirements.

### 3.6 Security Rule and the Decade Horizon

The Security Rule's technology-neutral posture aligns with the Ibn Hayan platform's decade-horizon commitment (Architectural Principle P18). The Security Rule does not prescribe specific technologies, allowing the platform to evolve its technology stack without amending its compliance posture. The platform's compliance posture is documented at the control level (e.g., "encryption at rest using recognized algorithms") rather than at the technology level (e.g., "AES-256"), supporting the platform's evolution without compliance rework.

The decade-horizon alignment is documented in the platform's compliance documentation and is reviewed annually by the Compliance Council. The review verifies that the platform's compliance posture remains aligned with the Security Rule as both the platform and the Security Rule evolve.

---

## 4. Administrative Safeguards

### 4.1 Administrative Safeguards Overview

Administrative safeguards are the administrative actions, policies, and procedures that govern the management of the platform's security operations. The HIPAA Security Rule's administrative safeguards are documented in 45 CFR 164.308 and comprise several standards, each with required or addressable implementation specifications. The Ibn Hayan platform implements each standard, with the implementation documented below.

The administrative safeguards are the foundation of the platform's security posture. They govern the platform's security management process, the platform's assigned security responsibility, the platform's workforce security, the platform's information access management, the platform's security awareness and training, the platform's security incident procedures, the platform's contingency plan, the platform's evaluation, and the platform's business associate contracts.

### 4.2 Administrative Safeguards Mapping

The Ibn Hayan platform's implementation of the administrative safeguards is documented in the table below, with each standard mapped to the platform's control. The mapping is verified through periodic compliance audits.

| Standard (45 CFR 164.308) | Type | Ibn Hayan Control |
|---|---|---|
| Security Management Process | Required | Security management policy; risk assessment; risk management; sanction policy |
| Assigned Security Responsibility | Required | Office of the CISO; designated security official |
| Workforce Security | Addressable | Authorization (Section 7 of SECURITY_GUIDELINES); workforce clearance procedure; termination procedure |
| Information Access Management | Addressable | Authorization framework (AUTHORIZATION.md); access establishment; access modification |
| Security Awareness and Training | Required | Security awareness training (Section 12 of SECURITY_GUIDELINES); periodic training; role-based training |
| Security Incident Procedures | Required | Incident response plan (Section 10 of SECURITY_GUIDELINES); response and reporting |
| Contingency Plan | Required | Recovery plan (RECOVERY.md); data backup (BACKUP.md); disaster recovery; emergency mode operation |
| Evaluation | Required | Periodic evaluation; compliance audit (Section 9 of AUDIT.md) |
| Business Associate Contracts | Required | BAA execution (Section 8); vendor management (Section 13 of SECURITY_GUIDELINES) |

### 4.3 Security Management Process

The Security Management Process standard requires the implementation of a security management process to identify and analyze risks to ePHI and to implement security measures sufficient to reduce those risks. The Ibn Hayan platform implements this standard through the security management policy, maintained by the Office of the CISO; through the periodic risk assessment, documented in Section 9; through the risk management process, which addresses identified risks; and through the sanction policy, which governs responses to workforce member violations.

The security management process is documented in the platform's security management policy and is reviewed annually by the Security Council. The process is integrated with the platform's overall governance, with the security management process informing and being informed by the platform's architectural, operational, and compliance decisions.

### 4.4 Workforce Security

The Workforce Security standard requires the implementation of policies and procedures to ensure that all workforce members have appropriate access to ePHI and that workforce members who do not have appropriate access are prevented from accessing ePHI. The Ibn Hayan platform implements this standard through the authorization framework (documented in `AUTHORIZATION.md`), through the workforce clearance procedure (documented in the personnel security policy), and through the termination procedure (documented in the personnel lifecycle policy).

Workforce security is documented per role, with the documentation specifying the role's access to ePHI, the role's clearance requirements, and the role's termination procedure. Workforce security is reviewed annually by the Security Council, with the review verifying that workforce security remains appropriate.

### 4.5 Information Access Management

The Information Access Management standard requires the implementation of policies and procedures for the authorization of access to ePHI. The Ibn Hayan platform implements this standard through the authorization framework (documented in `AUTHORIZATION.md`), through the access establishment procedure (which governs the initial grant of access), and through the access modification procedure (which governs the modification of access).

Information access management is documented per role, with the documentation specifying the role's access establishment and modification procedures. Information access management is reviewed annually by the Security Council, with the review verifying that access management remains appropriate.

### 4.6 Contingency Plan

The Contingency Plan standard requires the establishment of policies and procedures for responding to emergencies or failures that affect systems containing ePHI. The Ibn Hayan platform implements this standard through the recovery plan (documented in `RECOVERY.md`), through the data backup plan (documented in `BACKUP.md`), through the disaster recovery plan (documented in Section 4 of `RECOVERY.md`), through the emergency mode operation plan (documented in Section 5 of `RECOVERY.md`), and through the testing and revision procedures (documented in Section 7 of `RECOVERY.md`).

The contingency plan is documented in the platform's contingency plan policy and is reviewed annually by the Security Council. The contingency plan is tested periodically through disaster recovery drills, with the testing verifying that the plan is functional.

---

## 5. Physical Safeguards

### 5.1 Physical Safeguards Overview

Physical safeguards are the physical measures, policies, and procedures that protect the platform's electronic information systems, related buildings, and equipment from natural and environmental hazards and from unauthorized intrusion. The HIPAA Security Rule's physical safeguards are documented in 45 CFR 164.310 and comprise several standards. The Ibn Hayan platform implements each standard, with the implementation documented below.

The physical safeguards are particularly relevant to the platform's deployment models, documented in SYSTEM_ARCHITECTURE Section 23. For Multi-Tenant SaaS deployment (DM1), physical safeguards are provided by the platform's infrastructure providers. For Single-Tenant Dedicated deployment (DM2), physical safeguards are shared between the platform and the customer. For Air-Gapped deployment (DM4), physical safeguards are provided by the customer.

### 5.2 Physical Safeguards Mapping

The Ibn Hayan platform's implementation of the physical safeguards is documented in the table below, with each standard mapped to the platform's control.

| Standard (45 CFR 164.310) | Type | Ibn Hayan Control |
|---|---|---|
| Facility Access Controls | Addressable | Physical security (Section 2.2 of SECURITY_GUIDELINES); facility access; access logs |
| Workstation Use | Required | Workstation security policy; workstation placement; workstation use |
| Workstation Security | Required | Workstation hardening (Section 6.2 of SECURITY_GUIDELINES); workstation encryption |
| Device and Media Controls | Required | Device management (Section 6.3 of SECURITY_GUIDELINES); media disposal; media re-use; accountability; data backup |

### 5.3 Facility Access Controls

The Facility Access Controls standard requires the implementation of policies and procedures to limit physical access to the platform's electronic information systems and the facility in which they are housed. The Ibn Hayan platform implements this standard through the facility access controls provided by the platform's infrastructure providers, with the controls documented in the providers' physical security documentation.

Facility access controls include physical access controls (badge access, biometric access, security personnel), environmental controls (fire suppression, climate control, power redundancy), and monitoring (video surveillance, intrusion detection). Facility access controls are verified through periodic security assessments of the infrastructure providers, with the assessments documented in the platform's vendor management records.

### 5.4 Workstation Use

The Workstation Use standard requires the implementation of policies and procedures that specify the appropriate functions to be performed and the manner in which those functions are to be performed on workstations that access ePHI. The Ibn Hayan platform implements this standard through the workstation security policy, which specifies the appropriate functions, the workstation placement requirements, and the workstation use restrictions.

The workstation security policy is documented in the platform's security documentation and is reviewed annually by the Security Council. The policy is communicated to workforce members through security awareness training, with the training documented in the workforce member's training record.

### 5.5 Workstation Security

The Workstation Security standard requires the implementation of physical and technical safeguards for workstations that access ePHI. The Ibn Hayan platform implements this standard through the workstation hardening configuration (documented in Section 6.2 of `SECURITY_GUIDELINES.md`), through the workstation encryption configuration (documented in Section 6.4 of `SECURITY_GUIDELINES.md`), and through the workstation monitoring configuration (documented in Section 6.5 of `SECURITY_GUIDELINES.md`).

Workstation security is documented per workstation type, with the documentation specifying the workstation type's hardening, encryption, and monitoring configurations. Workstation security is verified through periodic security testing, with the testing verifying that workstations meet the security configuration.

### 5.6 Device and Media Controls

The Device and Media Controls standard requires the implementation of policies and procedures that govern the receipt and removal of hardware and electronic media that contain ePHI into and out of a facility, and the movement of these items within the facility. The Ibn Hayan platform implements this standard through the device management service (documented in Section 6.3 of `SECURITY_GUIDELINES.md`), through the media disposal procedure, through the media re-use procedure, and through the accountability procedure.

Device and media controls include disposal (media is disposed of through documented procedures that ensure data is irrecoverable), re-use (media is re-used only after data is securely erased), accountability (media is tracked through its lifecycle), and data backup (media is backed up before disposal or re-use). Device and media controls are documented in the platform's device and media controls policy and are reviewed annually by the Security Council.

---

## 6. Technical Safeguards

### 6.1 Technical Safeguards Overview

Technical safeguards are the technology and the policy and procedures for its use that protect ePHI and control access to it. The HIPAA Security Rule's technical safeguards are documented in 45 CFR 164.312 and comprise several standards. The Ibn Hayan platform implements each standard, with the implementation documented below.

The technical safeguards are the most directly aligned with the platform's architectural commitments, with each safeguard corresponding to a platform-level control. The alignment is documented per safeguard, with the documentation specifying the safeguard's requirement, the platform's control, and the verification of the control.

### 6.2 Technical Safeguards Mapping

The Ibn Hayan platform's implementation of the technical safeguards is documented in the table below, with each standard mapped to the platform's control.

| Standard (45 CFR 164.312) | Type | Ibn Hayan Control |
|---|---|---|
| Access Control | Required | Authorization framework (AUTHORIZATION.md); unique user identification; emergency access; automatic logoff; encryption |
| Audit Controls | Required | Audit trail (AUDIT.md); comprehensive audit logging |
| Integrity | Addressable | Data integrity controls; integrity verification |
| Person or Entity Authentication | Required | Authentication framework (AUTHENTICATION.md); authentication factors |
| Transmission Security | Addressable | Network encryption (Section 5.4 of SECURITY_GUIDELINES); encryption in transit |

### 6.3 Access Control

The Access Control standard requires the implementation of technical policies and procedures for electronic information systems that maintain ePHI and that allow access only to those persons or software programs that have been granted access rights. The Ibn Hayan platform implements this standard through the authorization framework (documented in `AUTHORIZATION.md`), through unique user identification (each principal has a unique identity, documented in `AUTHENTICATION.md`), through emergency access (the break-glass procedure, documented in `AUTHORIZATION.md` Section 8.5), through automatic logoff (the session timeout, documented in `AUTHENTICATION.md` Section 6.1), and through encryption (the encryption posture, documented in `SECURITY_GUIDELINES.md` Section 4.2).

Access control is documented per role and per resource, with the documentation specifying the role's access rights to each resource. Access control is verified through periodic security testing, with the testing verifying that access control is enforced as documented.

### 6.4 Audit Controls

The Audit Controls standard requires the implementation of hardware, software, and procedural mechanisms that record and examine activity in information systems that contain or use ePHI. The Ibn Hayan platform implements this standard through the audit trail (documented in `AUDIT.md` and in SYSTEM_ARCHITECTURE Section 27), with the audit trail recording every access to ePHI, every disclosure of ePHI, and every modification to ePHI.

Audit controls include comprehensive audit logging (every consequential action is audited), audit trail integrity (audit records are immutable and tamper-evident), audit query (authorized principals can query audit records), and audit review (audit records are reviewed on a defined cadence). Audit controls are verified through periodic compliance audits, with the audits verifying that audit controls function as documented.

### 6.5 Integrity

The Integrity standard requires the implementation of policies and procedures to protect ePHI from improper alteration or destruction. The Ibn Hayan platform implements this standard through data integrity controls (documented in `SECURITY_GUIDELINES.md` Section 4.4) and through integrity verification (documented in `AUDIT.md` Section 5.4). Data integrity is enforced through access control (only authorized principals can modify ePHI), through audit (every modification is recorded), and through validation (modifications are validated before they are applied).

Integrity controls are documented per data class, with the documentation specifying the data class's integrity controls and the integrity verification process. Integrity controls are verified through periodic security testing, with the testing verifying that integrity controls function as documented.

### 6.6 Person or Entity Authentication

The Person or Entity Authentication standard requires the implementation of procedures to verify that a person or entity seeking access to ePHI is the one claimed. The Ibn Hayan platform implements this standard through the authentication framework (documented in `AUTHENTICATION.md`), with the framework supporting multiple authentication factors, MFA, SSO, and biometric authentication. Authentication is enforced at the Edge Layer, with every request authenticated before it reaches downstream layers.

Authentication is documented per principal type and per authentication method, with the documentation specifying the principal type's authentication requirements and the authentication method's characteristics. Authentication is verified through periodic security testing, with the testing verifying that authentication is enforced as documented.

### 6.7 Transmission Security

The Transmission Security standard requires the implementation of technical security measures to guard against unauthorized access to ePHI that is being transmitted over an electronic communications network. The Ibn Hayan platform implements this standard through network encryption (documented in `SECURITY_GUIDELINES.md` Section 5.4), with network traffic encrypted using recognized transport encryption protocols. Encryption covers both external network traffic (traffic between the platform and external systems) and internal network traffic (traffic between the platform's internal components).

Transmission security is documented per network segment, with the documentation specifying the segment's encryption posture. Transmission security is verified through periodic security testing, with the testing verifying that transmission security is enforced as documented.

---

## 7. Breach Notification Rule

### 7.1 Breach Notification Overview

The HIPAA Breach Notification Rule requires covered entities and business associates to provide notification following a breach of unsecured PHI. The Rule defines a breach as an impermissible use or disclosure of PHI that compromises the security or privacy of the PHI, with limited exceptions. The Rule establishes notification requirements for affected individuals, for the Department of Health and Human Services (HHS), and (for breaches affecting more than 500 residents of a state or jurisdiction) for the media.

The Ibn Hayan platform's breach notification posture is documented in this section and supports the covered entity's compliance with the Breach Notification Rule. The platform's role as a business associate means that the platform must notify the covered entity of any breach of which it becomes aware, with the covered entity then responsible for notifying affected individuals, HHS, and (where applicable) the media.

### 7.2 Breach Definition

A breach is an impermissible use or disclosure of PHI that compromises the security or privacy of the PHI. The Breach Notification Rule establishes a risk assessment to determine whether an impermissible use or disclosure is a breach, with the risk assessment considering the nature and extent of the PHI involved, the unauthorized person to whom the disclosure was made, and whether the PHI was actually acquired or viewed. An impermissible use or disclosure is presumed to be a breach unless the covered entity or business associate demonstrates that there is a low probability that the PHI has been compromised.

The Ibn Hayan platform conducts a breach risk assessment for every suspected breach, with the assessment documented in the breach investigation record. The assessment considers the breach's scope, the breach's impact, and the breach's probability of compromise, with the assessment's results documented and reviewed by the Compliance Officer and the Office of the CISO.

### 7.3 Notification to Covered Entity

The Ibn Hayan platform notifies the covered entity of any breach of which it becomes aware, with the notification provided without unreasonable delay and in no case later than 60 calendar days after discovery of the breach. The notification includes the identification of the breach, the types of information involved, the affected individuals, the steps individuals should take to protect themselves, what the platform is doing in response, and contact procedures for affected individuals to obtain more information.

Notification to the covered entity is documented in the platform's breach notification policy, maintained by the Office of the CISO. Notification events are recorded in the audit trail, supporting compliance demonstration and incident investigation. Notification is reviewed by the Compliance Council on a defined cadence, with the review verifying that notification meets the Breach Notification Rule's requirements.

### 7.4 Notification to Individuals (Covered Entity Responsibility)

Notification to affected individuals is the covered entity's responsibility, with the covered entity providing notification without unreasonable delay and in no case later than 60 calendar days after discovery of the breach. The Ibn Hayan platform supports the covered entity's notification by providing the covered entity with the information required for notification (e.g., the list of affected individuals, the types of information involved), with the information provided through documented workflows.

Notification to individuals is governed by the covered entity's breach notification policy, with the platform supporting the policy through documentation and workflow. The platform does not provide notification to individuals directly, except where the BAA specifies that the platform will provide notification on behalf of the covered entity.

### 7.5 Notification to HHS and Media

Notification to HHS is the covered entity's responsibility, with the covered entity providing notification to HHS for breaches affecting fewer than 500 individuals annually and for breaches affecting 500 or more individuals without unreasonable delay. Notification to the media is the covered entity's responsibility for breaches affecting more than 500 residents of a state or jurisdiction. The Ibn Hayan platform supports the covered entity's notification by providing the covered entity with the information required for notification.

Notification to HHS and media is governed by the covered entity's breach notification policy, with the platform supporting the policy through documentation and workflow. The platform does not provide notification to HHS or media directly, except where the BAA specifies that the platform will provide notification on behalf of the covered entity.

### 7.6 Breach Documentation

The Ibn Hayan platform documents all breaches and breach risk assessments, with the documentation retained per the Breach Notification Rule's retention requirements. Documentation includes the breach's discovery, the breach's investigation, the breach's risk assessment, the breach's notification, and the breach's remediation. Documentation is maintained in the platform's breach register, with the register reviewed by the Compliance Council on a defined cadence.

Breach documentation is retained for six years from the date of the breach's discovery, in keeping with the Breach Notification Rule's retention requirements. Documentation is immutable, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5. Documentation is accessible to the covered entity and to regulators, with the access governed by the platform's authorization framework.

---

## 8. Business Associate Agreements (BAAs)

### 8.1 BAA Overview

A Business Associate Agreement (BAA) is a contract between a covered entity and a business associate that establishes the permitted uses and disclosures of PHI by the business associate, the safeguards that the business associate must implement, the breach notification requirements, and the other obligations of the business associate under HIPAA. The BAA is required by the HIPAA Privacy Rule and Security Rule and is enforced by the HITECH Act.

The Ibn Hayan platform executes a BAA with each covered entity customer, with the BAA documenting the platform's commitments and the customer's expectations. The BAA is reviewed by the platform's legal team and the Office of the CISO before execution, with the review verifying that the BAA meets the platform's compliance posture and the customer's requirements.

### 8.2 BAA Required Provisions

The BAA must include specific provisions, including the permitted uses and disclosures of PHI by the business associate, the safeguards that the business associate must implement, the requirement that the business associate use appropriate safeguards to prevent use or disclosure of PHI other than as provided for by the BAA, the requirement that the business associate report breaches to the covered entity, the requirement that the business associate ensure that any subcontractors that receive PHI are bound by equivalent obligations, the requirement that the business associate make available PHI in accordance with the Privacy Rule's access requirements, the requirement that the business associate make available an accounting of disclosures, the requirement that the business associate make available its internal practices, books, and records relating to the use and disclosure of PHI, and the requirement that the business associate return or destroy PHI at the termination of the BAA.

The Ibn Hayan platform's BAA includes each required provision, with the provisions documented in the BAA template maintained by the platform's legal team. The BAA template is reviewed annually by the legal team and the Office of the CISO, with the review verifying that the template meets the HIPAA requirements and the platform's compliance posture.

### 8.3 BAA Execution

BAA execution is the process of negotiating and signing a BAA with a covered entity customer. Execution is performed by the platform's legal team, with the execution authenticated and authorized. Execution produces an audit record that captures the BAA, the executer, the time, and the customer. Execution is required before the customer's tenant can be used to process PHI.

BAA execution is documented in the platform's BAA register, with the register maintained by the legal team. The register records each executed BAA, with the register used to verify that the platform has a BAA with each covered entity customer. The register is reviewed annually by the Compliance Council, with the review verifying that the register is complete and current.

### 8.4 BAA Monitoring

BAA monitoring is the process of verifying that the platform complies with the BAA's provisions. Monitoring includes periodic compliance audits, with the audits verifying that the platform's controls meet the BAA's requirements. Monitoring also includes monitoring of subcontractors, with the platform ensuring that any subcontractors that receive PHI are bound by equivalent obligations.

BAA monitoring is documented in the platform's BAA monitoring policy, maintained by the Office of the CISO. Monitoring events are recorded in the audit trail, supporting compliance demonstration and incident investigation. Monitoring is reviewed by the Compliance Council on a defined cadence, with the review verifying that monitoring remains effective.

### 8.5 BAA Termination

BAA termination is the process of ending a BAA with a covered entity customer. Termination includes the return or destruction of PHI (the platform returns or destroys the customer's PHI at the termination of the BAA, in keeping with the BAA's provisions), the revocation of access (the customer's access to the platform is revoked), and the closure of the BAA (the BAA is formally closed). Termination is documented per BAA, with the documentation specifying the termination's steps and verification.

BAA termination is documented in the platform's BAA termination policy, maintained by the Office of the CISO and the legal team. Termination events are recorded in the audit trail, supporting compliance demonstration and incident investigation. Termination is reviewed by the Compliance Council on a defined cadence, with the review verifying that termination remains effective.

### 8.6 BAA and Subcontractors

The BAA requires the platform to ensure that any subcontractors that receive PHI are bound by equivalent obligations. The Ibn Hayan platform executes a subcontractor BAA with each subcontractor that receives PHI, with the subcontractor BAA documenting the subcontractor's commitments. The subcontractor BAA is reviewed by the platform's legal team before execution, with the review verifying that the subcontractor BAA meets the platform's compliance posture.

Subcontractor BAAs are documented in the platform's subcontractor BAA register, with the register maintained by the legal team. The register records each executed subcontractor BAA, with the register used to verify that the platform has a subcontractor BAA with each subcontractor that receives PHI. The register is reviewed annually by the Compliance Council, with the review verifying that the register is complete and current.

---

## 9. HIPAA Risk Assessment

### 9.1 Risk Assessment Overview

The HIPAA Security Rule requires covered entities and business associates to conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of ePHI. The risk assessment is the foundation of the Security Rule's compliance posture, with the safeguards implemented based on the assessment's results. The Ibn Hayan platform conducts periodic risk assessments, with the assessments documented in this section.

The risk assessment is comprehensive, covering all platform surfaces, all data classes, and all threats. The assessment identifies the platform's risks, assesses the risks' likelihood and impact, evaluates the platform's existing controls, and documents the safeguards implemented to address the risks. The assessment is reviewed annually and is updated as the platform evolves.

### 9.2 Risk Assessment Methodology

The risk assessment methodology is documented in the platform's risk assessment policy, maintained by the Office of the CISO. The methodology includes risk identification (risks are identified through threat modeling, vulnerability scanning, and incident analysis), risk analysis (risks are analyzed for likelihood and impact), risk evaluation (risks are evaluated against the platform's risk tolerance), and risk treatment (risks are treated through mitigation, transfer, avoidance, or acceptance).

The methodology is aligned with recognized industry guidance for healthcare-grade risk assessment and is reviewed annually by the Security Council. The methodology produces a risk assessment document that records the assessment's scope, methodology, findings, and treatment. The risk assessment document is maintained in the platform's risk register, with the register reviewed by the Compliance Council on a defined cadence.

### 9.3 Risk Assessment Scope

The risk assessment scope covers all platform surfaces, all data classes, and all threats. The scope is documented in the risk assessment document, with the documentation specifying the surfaces, data classes, and threats covered by the assessment. The scope is comprehensive, with no surface, data class, or threat excluded from the assessment.

The scope includes the platform's administrative, physical, and technical safeguards, with each safeguard assessed for its effectiveness in addressing the identified risks. The scope also includes the platform's workforce, with the workforce's access to ePHI assessed for its appropriateness. The scope's comprehensiveness is verified through periodic review by the Compliance Council.

### 9.4 Risk Assessment Findings

The risk assessment's findings are documented in the risk assessment document, with the findings including the identified risks, the risks' likelihood and impact, the platform's existing controls, and the safeguards implemented to address the risks. Findings are reviewed by the Office of the CISO and the Compliance Council, with the review verifying that the findings are accurate and that the safeguards are appropriate.

Findings are tracked to remediation through the documented workflow. The workflow includes the finding, the assignee, the remediation plan, the target completion date, and the completion status. Findings that are not remediated within the target window are escalated to the Security Council, with the escalation ensuring that the findings receive the attention they require.

### 9.5 Risk Assessment and Continuous Improvement

The risk assessment supports continuous improvement of the platform's security posture. Findings from the risk assessment are analyzed for patterns, with recurring patterns addressed through procedural, technical, or organizational changes. The analysis is documented and is reviewed by the Security Council on a defined cadence.

Continuous improvement is non-negotiable. A risk assessment process that does not produce continuous improvement is a defect and is addressed through revision of the process. The platform's decade-horizon commitment (Architectural Principle P18) requires that the security posture evolve as the platform's surface evolves, with the risk assessment as the operational mechanism for that evolution.

### 9.6 Risk Assessment and Audit

The risk assessment is itself auditable. The assessment's scope, methodology, findings, and remediation are recorded in the audit trail. Risk assessment audit records are the basis for compliance demonstration that the assessment was performed and for investigation of assessment-related incidents. Risk assessment audit records are immutable, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Risk assessment audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that the assessment was performed, that the findings were documented, and that remediation was completed. The review is itself audited.

---

## 10. HIPAA Audit & Documentation

### 10.1 Audit & Documentation Overview

HIPAA requires covered entities and business associates to maintain documentation of their compliance with the Privacy Rule and the Security Rule, including documentation of policies and procedures, of risk assessments, of safeguard implementations, of training, and of breaches. The documentation must be retained for six years from the date of its creation or the date when last in effect, whichever is later. The Ibn Hayan platform maintains this documentation, with the documentation retained per HIPAA's retention requirements.

The platform's audit posture is documented in `AUDIT.md` and in SYSTEM_ARCHITECTURE Section 27, with the audit trail recording every consequential action. The audit trail supports HIPAA's documentation requirements by providing a complete, immutable record of the platform's operations.

### 10.2 Documentation Requirements

The HIPAA documentation requirements are summarized below, with each requirement mapped to the platform's documentation.

| Requirement | Ibn Hayan Documentation |
|---|---|
| Privacy policies and procedures | PRIVACY_POLICY.md; privacy policies maintained by the Compliance Officer |
| Security policies and procedures | SECURITY_GUIDELINES.md and peer security documents; security policies maintained by the Office of the CISO |
| Risk assessment | Risk assessment document; risk register maintained by the Office of the CISO |
| Safeguard implementations | Sections 4, 5, 6 of this document; peer security documents |
| Training records | Training records maintained by the human resources team |
| Breach documentation | Breach register maintained by the Office of the CISO |
| BAA documentation | BAA register maintained by the legal team |
| Audit trail | Audit trail documented in AUDIT.md and SYSTEM_ARCHITECTURE Section 27 |

### 10.3 Documentation Retention

HIPAA documentation is retained for six years from the date of its creation or the date when last in effect, whichever is later. The Ibn Hayan platform retains documentation per this requirement, with the retention documented in `DATA_RETENTION.md`. Documentation is retained in the platform's documentation repository, with the repository's retention management ensuring that documentation is retained for the required period.

Documentation retention is verified through periodic compliance audits, with the audits verifying that documentation is retained for the required period. Retention failures (e.g., documentation found to be disposed of before the required period) are treated as incidents and trigger remediation. Retention is documented and is reviewed by the Compliance Officer on a defined cadence.

### 10.4 Documentation Accessibility

HIPAA documentation must be accessible to the covered entity and to regulators upon request. The Ibn Hayan platform makes documentation accessible through documented workflows, with the workflows providing the covered entity and regulators with access to the documentation that they are authorized to access. Accessibility is governed by the platform's authorization framework, with only authorized principals able to access documentation.

Documentation accessibility is verified through periodic compliance audits, with the audits verifying that documentation is accessible to authorized principals. Accessibility failures (e.g., documentation not provided to a regulator upon request) are treated as incidents and trigger remediation. Accessibility is documented and is reviewed by the Compliance Officer on a defined cadence.

### 10.5 Documentation Review

HIPAA documentation is reviewed periodically to verify that it remains current and accurate. The review is performed by the documentation's owner, with the review documented in the documentation's review record. Documentation that is no longer current is updated; documentation that is no longer accurate is corrected.

Documentation review is documented in the platform's documentation review policy, maintained by the Office of the CISO. Review events are recorded in the audit trail, supporting compliance demonstration and incident investigation. Review is reviewed by the Compliance Council on a defined cadence, with the review verifying that documentation review remains effective.

### 10.6 Documentation and Audit

HIPAA documentation is itself auditable. The documentation's creation, modification, and review are recorded in the audit trail. Documentation audit records are the basis for compliance demonstration that documentation was maintained and for investigation of documentation-related incidents. Documentation audit records are immutable, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

Documentation audit records are reviewed by the Compliance Officer on a defined cadence. The review verifies that documentation was maintained, that documentation was reviewed on the documented cadence, and that documentation reflects the platform's actual compliance posture. The review is itself audited.

---

## 11. HIPAA Training Requirements

### 11.1 Training Requirements Overview

HIPAA requires covered entities and business associates to implement a security awareness and training program for all workforce members, including management. The training must be provided upon hire and periodically thereafter, with the training covering the platform's security policies and procedures, the platform's threat model, and the workforce members' security responsibilities. The Ibn Hayan platform implements this requirement through the security awareness training program, documented in `SECURITY_GUIDELINES.md` Section 12.

The training program is documented in the platform's training policy, maintained by the Office of the CISO and the human resources team. Training is provided through the platform's training service, with training completion recorded in the workforce member's training record. Training records are retained per HIPAA's retention requirements and are accessible to the covered entity and to regulators upon request.

### 11.2 Training Curriculum

The HIPAA training curriculum covers the topics documented below, with the curriculum reviewed annually by the Compliance Council for currency.

| Topic | Description | Frequency |
|---|---|---|
| HIPAA overview | Overview of HIPAA's rules and the platform's compliance posture | Upon hire; annually |
| Privacy Rule | The Privacy Rule's requirements and the workforce member's responsibilities | Upon hire; annually |
| Security Rule | The Security Rule's requirements and the platform's safeguards | Upon hire; annually |
| Breach Notification Rule | The Breach Notification Rule's requirements and the workforce member's responsibilities | Upon hire; annually |
| Minimum necessary standard | The minimum necessary standard and its application to the workforce member's role | Upon hire; annually |
| Social engineering | Recognition and defense against social engineering attacks | Upon hire; annually |
| Phishing awareness | Recognition and reporting of phishing attempts | Upon hire; annually |
| Incident reporting | How to report suspected HIPAA violations | Upon hire; annually |
| Role-specific training | Training specific to the workforce member's role and access to ePHI | Upon hire; upon role change |

### 11.3 Training Delivery

Training is delivered through the platform's training service, with the service providing online courses, in-person workshops, and simulated attacks (e.g., phishing simulations). Training delivery is documented per course, with the documentation specifying the course's content, the course's duration, and the course's verification.

Training delivery is governed by the platform's training policy. Training delivery is auditable, with training events recorded in the audit trail. Training delivery is reviewed by the Compliance Council on a defined cadence, with the review verifying that delivery remains effective.

### 11.4 Training Verification

Training verification is the process of confirming that workforce members have completed required training. Verification is performed through training completion records, with the records maintained in the workforce member's training record. Workforce members who do not complete required training have their access suspended until training is completed.

Training verification is documented in the platform's training verification policy. Verification events are recorded in the audit trail, supporting compliance demonstration and incident investigation. Verification is reviewed by the Compliance Council on a defined cadence, with the review verifying that verification remains effective.

### 11.5 Training and Continuous Improvement

HIPAA training supports continuous improvement of the platform's compliance posture. Training effectiveness is measured, with measurements including training completion rates, simulated attack response rates, and HIPAA incident reporting rates. Measurements are reviewed by the Compliance Council on a defined cadence, with the review informing continuous improvement of the training program.

Continuous improvement is non-negotiable. A training program that does not produce continuous improvement is a defect and is addressed through revision of the training program. The platform's decade-horizon commitment requires that the compliance posture evolve as the platform's surface evolves, with the training program as the operational mechanism for that evolution.

### 11.6 Training Documentation

HIPAA training documentation is retained per HIPAA's retention requirements (six years from the date of training). Training documentation includes the training's content, the training's date, the workforce members who completed the training, and the training's verification. Documentation is retained in the platform's training records repository, with the repository's retention management ensuring that documentation is retained for the required period.

Training documentation is accessible to the covered entity and to regulators upon request, with the access governed by the platform's authorization framework. Training documentation is verified through periodic compliance audits, with the audits verifying that training was provided and completed as documented.

---

## 12. Patient Rights Under HIPAA

### 12.1 Patient Rights Overview

HIPAA grants individuals rights with respect to their PHI, including the right to access their PHI, the right to request amendments to their PHI, the right to receive an accounting of disclosures of their PHI, the right to request restrictions on uses and disclosures of their PHI, the right to request confidential communications, the right to inspect and obtain a copy of their PHI, and the right to complain about HIPAA violations. The Ibn Hayan platform supports these rights through documented workflows, with the support documented below.

Patient rights are governed by the platform's privacy posture, documented in `PRIVACY_POLICY.md`. The posture ensures that patients can exercise their rights through documented, auditable workflows, with the workflows supporting the covered entity's compliance with the Privacy Rule. The workflows are tested periodically through compliance testing, with the testing verifying that the workflows function as documented.

### 12.2 Right of Access

The right of access grants individuals the right to inspect and obtain a copy of their PHI, with limited exceptions. The Ibn Hayan platform supports this right through the patient access workflow, which allows patients to request access to their PHI through the patient portal. The workflow is documented, with the documentation specifying the workflow's steps, the workflow's timeline (within 30 days of the request, with one 30-day extension permitted), and the workflow's verification.

The patient access workflow is governed by the platform's authorization framework, with only the patient (or their authorized representative) able to access the patient's PHI. The workflow is auditable, with access events recorded in the audit trail. The workflow is verified through periodic compliance testing, with the testing verifying that the workflow meets the right of access requirements.

### 12.3 Right to Amend

The right to amend grants individuals the right to request amendments to their PHI, with limited exceptions. The Ibn Hayan platform supports this right through the patient amendment workflow, which allows patients to request amendments to their PHI through the patient portal. The workflow is documented, with the documentation specifying the workflow's steps, the workflow's timeline (within 60 days of the request, with one 30-day extension permitted), and the workflow's verification.

The patient amendment workflow is governed by the platform's medical record policy, documented in `MEDICAL_RECORD_POLICY.md`. The workflow produces an amendment to the medical record, with the original record preserved (the amendment is appended, not replacing the original). The workflow is auditable, with amendment events recorded in the audit trail.

### 12.4 Right to an Accounting of Disclosures

The right to an accounting of disclosures grants individuals the right to receive an accounting of disclosures of their PHI made by the covered entity in the six years prior to the request, with limited exceptions. The Ibn Hayan platform supports this right through the accounting of disclosures workflow, which generates a report of disclosures from the audit trail. The workflow is documented, with the documentation specifying the workflow's steps, the workflow's timeline (within 60 days of the request, with one 30-day extension permitted), and the workflow's verification.

The accounting of disclosures workflow is supported by the platform's audit trail, which records every disclosure of PHI. The workflow generates a report from the audit trail, with the report including the date of the disclosure, the recipient of the disclosure, a brief description of the PHI disclosed, and the purpose of the disclosure. The workflow is auditable, with report generation events recorded in the audit trail.

### 12.5 Right to Request Restrictions

The right to request restrictions grants individuals the right to request restrictions on the uses and disclosures of their PHI for treatment, payment, and healthcare operations. The covered entity is not required to agree to the requested restrictions, with limited exceptions (e.g., a restriction on disclosure to a health plan for services paid for in full out-of-pocket). The Ibn Hayan platform supports this right through the patient restriction workflow, which allows patients to request restrictions through the patient portal.

The patient restriction workflow is documented, with the documentation specifying the workflow's steps, the workflow's timeline, and the workflow's verification. The workflow is governed by the platform's privacy posture, with the restriction recorded in the patient's privacy preferences. The workflow is auditable, with restriction events recorded in the audit trail.

### 12.6 Right to Confidential Communications

The right to confidential communications grants individuals the right to request that communications about their PHI be made through alternative means or at alternative locations. The covered entity must accommodate reasonable requests. The Ibn Hayan platform supports this right through the patient communication preferences workflow, which allows patients to specify their communication preferences through the patient portal.

The patient communication preferences workflow is documented, with the documentation specifying the workflow's steps, the workflow's timeline, and the workflow's verification. The workflow is governed by the platform's notification module (M13), with the preferences applied to all communications. The workflow is auditable, with preference events recorded in the audit trail.

---

## 13. HIPAA Compliance Checklist

### 13.1 Checklist Purpose

The HIPAA compliance checklist provides a summary of the platform's HIPAA compliance posture, organized by HIPAA requirement. The checklist is intended as a quick reference for compliance officers, auditors, and regulators, with the detailed compliance posture documented in the preceding sections. The checklist is reviewed annually by the Compliance Council, with the review verifying that the checklist remains current.

The checklist is not a substitute for the detailed compliance documentation. The checklist's brevity means that some details are omitted; for the full compliance posture, consult the relevant section of this document and the peer security and compliance documents.

### 13.2 Privacy Rule Checklist

| Requirement | Status | Reference |
|---|---|---|
| Permitted uses and disclosures documented | Implemented | Section 2.2 |
| Minimum necessary standard enforced | Implemented | Section 2.3 |
| Individual rights supported | Implemented | Section 12 |
| Administrative requirements documented | Implemented | Section 2.5 |
| Privacy official designated | Implemented | Office of the CISO |
| Privacy policies and procedures documented | Implemented | PRIVACY_POLICY.md |
| Workforce training on privacy | Implemented | Section 11 |
| Documentation retained for 6 years | Implemented | Section 10.3 |

### 13.3 Security Rule Checklist

| Requirement | Status | Reference |
|---|---|---|
| Risk assessment conducted | Implemented | Section 9 |
| Security management process implemented | Implemented | Section 4.3 |
| Security official designated | Implemented | Office of the CISO |
| Workforce security implemented | Implemented | Section 4.4 |
| Information access management implemented | Implemented | Section 4.5 |
| Security awareness and training implemented | Implemented | Section 11 |
| Security incident procedures implemented | Implemented | Section 7 (of SECURITY_GUIDELINES) |
| Contingency plan implemented | Implemented | Section 4.6 |
| Evaluation conducted periodically | Implemented | Section 9 |
| Business associate contracts executed | Implemented | Section 8 |
| Facility access controls implemented | Implemented | Section 5.3 |
| Workstation use and security implemented | Implemented | Sections 5.4, 5.5 |
| Device and media controls implemented | Implemented | Section 5.6 |
| Access control implemented | Implemented | Section 6.3 |
| Audit controls implemented | Implemented | Section 6.4 |
| Integrity controls implemented | Implemented | Section 6.5 |
| Authentication implemented | Implemented | Section 6.6 |
| Transmission security implemented | Implemented | Section 6.7 |

### 13.4 Breach Notification Rule Checklist

| Requirement | Status | Reference |
|---|---|---|
| Breach risk assessment process documented | Implemented | Section 7.2 |
| Notification to covered entity (within 60 days) | Implemented | Section 7.3 |
| Support for notification to individuals | Implemented | Section 7.4 |
| Support for notification to HHS | Implemented | Section 7.5 |
| Support for notification to media | Implemented | Section 7.5 |
| Breach documentation retained (6 years) | Implemented | Section 7.6 |

### 13.5 BAA Checklist

| Requirement | Status | Reference |
|---|---|---|
| BAA executed with each covered entity customer | Implemented | Section 8.3 |
| BAA includes all required provisions | Implemented | Section 8.2 |
| BAA monitoring performed | Implemented | Section 8.4 |
| BAA termination procedures documented | Implemented | Section 8.5 |
| Subcontractor BAAs executed | Implemented | Section 8.6 |

### 13.6 Overall Compliance Posture

The Ibn Hayan platform's HIPAA compliance posture is comprehensive, addressing each HIPAA requirement with documented controls. The posture is reviewed annually by the Compliance Council, with the review verifying that the posture remains current and effective. The posture is verified through periodic compliance audits, with the audits' findings tracked to remediation.

The platform's compliance posture supports the covered entity customer's compliance with HIPAA. The platform's role as a business associate does not diminish the covered entity's compliance responsibilities; instead, the platform's compliance posture supports the covered entity's discharge of those responsibilities. The relationship between the platform and the covered entity is documented in the BAA, with the BAA specifying each party's commitments.

---

## 14. Related Documents

### 14.1 Upstream Documents

| Document | Relationship |
|---|---|
| PRODUCT_BIBLE.md Section 27 (Security Philosophy) | Product-level security posture that this document elaborates |
| PRODUCT_BIBLE.md Section 23 (Multi-Tenant Philosophy) | Multi-tenant posture that governs HIPAA's tenant scoping |
| SYSTEM_ARCHITECTURE.md Section 20 (Security Architecture) | Architectural commitments that this document elaborates |
| SYSTEM_ARCHITECTURE.md Section 27 (Audit Architecture) | Audit architecture that supports HIPAA audit |
| SYSTEM_ARCHITECTURE.md Section 10 (Multi-Tenant Architecture) | Tenant isolation architecture that governs HIPAA's tenant scoping |
| ADR-004 (Multi-Tenant Strategy) | Ratifies logical multi-tenancy as default, governing HIPAA's tenant scoping |
| ADR-006 (Database Strategy) | Ratifies the audit store that supports HIPAA audit |

### 14.2 Peer Documents

| Document | Relationship |
|---|---|
| SECURITY_GUIDELINES.md | Comprehensive security guidelines; supports HIPAA safeguards |
| AUTHENTICATION.md | Authentication posture; supports HIPAA authentication requirements |
| AUTHORIZATION.md | Authorization posture; supports HIPAA access control requirements |
| ROLES_AND_PERMISSIONS.md | Role catalogue; supports HIPAA workforce security |
| AUDIT.md | Audit posture; supports HIPAA audit controls |
| BACKUP.md | Backup posture; supports HIPAA contingency plan |
| RECOVERY.md | Recovery posture; supports HIPAA contingency plan |
| GDPR.md | GDPR compliance; complementary regulatory framework |
| DATA_RETENTION.md | Data retention policy; supports HIPAA retention requirements |
| PRIVACY_POLICY.md | Privacy posture; supports HIPAA Privacy Rule |
| MEDICAL_RECORD_POLICY.md | Medical record policy; supports HIPAA medical record requirements |

### 14.3 Downstream Documents

| Document | Relationship |
|---|---|
| BAA template | BAA template, maintained by the legal team |
| Subcontractor BAA template | Subcontractor BAA template, maintained by the legal team |
| Risk assessment document | Risk assessment, maintained by the Office of the CISO |
| Breach register | Breach register, maintained by the Office of the CISO |
| HIPAA training curriculum | Training curriculum, maintained by the Office of the CISO and the human resources team |
| HIPAA compliance checklist | Compliance checklist, maintained by the Compliance Council |

### 14.4 Document Maintenance

This document is maintained by the Office of the CISO and is custodied by the Compliance Council. The document is reviewed annually, with off-cycle revision when HIPAA regulatory updates are issued or when a related ADR is ratified. Changes are recorded in the change log with explicit version increment; material changes are ratified through the documented change record mechanism.

The document's authority is elaborative, not constitutive. It elaborates the security posture ratified in SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 27; where this document and either canonical reference diverge, the canonical reference prevails. The document's authority is sufficient to govern HIPAA compliance decisions within the Ibn Hayan platform, subject to the canonical references' precedence. This document does not constitute legal advice; customers should consult their own legal counsel for interpretation of HIPAA in their specific context.
