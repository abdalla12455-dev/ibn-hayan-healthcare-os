# Ibn Hayan Healthcare Operating System — Authentication

| Field | Value |
|---|---|
| Document Title | Authentication Reference |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Security/Compliance Reference |
| Authority Level | Authoritative — Elaboration of SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 31 |
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Office of the CISO |
| Custodian | Security Council |
| Review Cadence | Quarterly, with off-cycle revision when a related Architecture Decision Record is ratified |
| Audience | Security architects, identity engineers, compliance officers, system administrators, integration architects, internal and external auditors |
| Scope | Authentication posture for all Ibn Hayan surfaces: identity verification, factors, password policy, MFA, SSO, biometrics, session lifecycle, token lifecycle, offline authentication, break-glass authentication, failure handling, account recovery, and authentication governance |
| Out of Scope | Implementation details, source code, API endpoint specifications, database schemas, UI component catalogues, deployment runbooks, vendor selection, cryptographic algorithm selection criteria (covered in cryptographic standards register), identity provider vendor contracts |
| Conflict Resolution | In case of conflict, SYSTEM_ARCHITECTURE.md and PRODUCT_BIBLE.md prevail. Any conflict between this document and either canonical reference is resolved in favour of the canonical reference until it is amended through architectural or security governance. |
| Amendment Mechanism | Security Council ratification through a documented Architecture Decision Record for material changes; minor revisions recorded in CHANGELOG with explicit version increment |
| Predecessor | v0.1.0 (initial stub with section scaffolding only) |

---

## Table of Contents

1. Authentication Overview
2. Authentication Methods
3. Password Policies
4. Multi-Factor Authentication (MFA)
5. Single Sign-On (SSO)
6. Session Management
7. Biometric Authentication
8. Authentication Flows
9. Authentication Error Handling
10. Security Considerations
11. Authentication Testing
12. Related Documents

---

## 1. Authentication Overview

### 1.1 Purpose of This Document

This document defines the authentication posture of the Ibn Hayan Healthcare Operating System. Authentication is the verification that a principal — human or system — is who they claim to be. It is the first control in the platform's defence-in-depth strategy and the gate through which every consequential action must pass. Authentication is treated as a primitive, not a feature, in keeping with Architectural Principle P13 (Auditability as Primitive) and the security posture ratified in SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 27 (Security Philosophy). The document is the canonical reference for authentication decisions across all Ibn Hayan surfaces: practitioner clients, patient portals, administrative consoles, integration accounts, and offline clients.

The document elaborates the architectural commitments defined in SYSTEM_ARCHITECTURE Section 20.4 (Authentication and Authorization) into operational policy. It is governed by the Office of the CISO, ratified by the Security Council, and amended through the documented ADR mechanism when material changes are introduced. Where this document and the architectural or product references diverge, the architectural and product references prevail.

### 1.2 Authentication as Primitive

Authentication is a primitive that governs every interaction with the Ibn Hayan platform. Every request that enters the Edge Layer is authenticated before it reaches the Orchestration, Domain, or Data layers, in keeping with the zero-trust posture ratified in SYSTEM_ARCHITECTURE Section 20.2. A request that is not authenticated is rejected at the Edge; no downstream layer is required to compensate for authentication failure. This posture is the architectural expression of the platform's commitment to defence in depth and least privilege.

Because authentication is a primitive, it is implemented at the platform layer and consumed by every module through the Identity & Access bounded context (BC15). Modules do not implement their own authentication; they consume the platform's authentication service through documented contracts. This pattern ensures that authentication behaviour is consistent across the Ibn Hayan platform and that authentication gaps do not emerge as modules evolve independently. The Identity & Access module (M14) is the deployable expression of BC15.

### 1.3 Authentication Posture

The Ibn Hayan authentication posture is stated as the following commitments. These commitments apply to every surface, every deployment model, and every tenant, and they are non-negotiable.

| Commitment | Description |
|---|---|
| Zero-trust | No implicit trust based on network location; every request is authenticated |
| Defence in depth | Authentication is layered with authorization, audit, and encryption |
| Least privilege | Authenticated principals receive only the minimum permissions required for their function |
| Strong factor support | Password, MFA, SSO, and biometric factors are supported per role and context |
| Tenant isolation | Authentication is tenant-scoped; cross-tenant authentication is forbidden |
| Offline-capable | Authentication continues during network outages through cached credentials |
| Fully audited | Every authentication event is recorded in the immutable audit trail |
| Recoverable | Account recovery is documented, governed, and audited |

### 1.4 Scope of Authentication

Authentication covers the verification of identity for human principals (clinicians, administrative staff, executives, patients, partners) and system principals (integration accounts, scheduled jobs, internal services). It does not cover what an authenticated principal is permitted to do; that is authorization, documented in `AUTHORIZATION.md`. The boundary between authentication and authorization is explicit and is enforced at the Edge Layer: authentication answers "who is this principal?", authorization answers "is this principal permitted to perform this action?".

The scope of this document includes the methods by which principals authenticate, the policies that govern credentials, the lifecycle of authenticated sessions, the handling of authentication failures, and the governance of authentication configuration. The scope excludes cryptographic algorithm selection, which is documented in the cryptographic standards register maintained by the Office of the CISO.

### 1.5 Relationship to Multi-Tenancy

Authentication is tenant-scoped in keeping with ADR-004 (Multi-Tenant Strategy). A principal authenticates against a specific tenant; the tenant context is established at authentication and propagated through every layer of the platform. A principal who holds credentials in multiple tenants authenticates separately for each tenant; cross-tenant session context is forbidden. The tenant scoping of authentication is enforced at the Edge and is not overridable through configuration. A principal who attempts to authenticate without specifying a tenant is rejected, except in the limited case of platform-level administrative authentication, which is governed by a separate control surface documented in `ROLES_AND_PERMISSIONS.md`.

---

## 2. Authentication Methods

### 2.1 Method Catalogue

Ibn Hayan supports a defined set of authentication methods, each appropriate to specific principal categories and operational contexts. The methods are not interchangeable; each is governed by a policy that defines when it is permitted, what factors it requires, and what audit trail it produces. The catalogue is reviewed annually by the Security Council.

| Method Code | Method | Typical Principal | Typical Surface |
|---|---|---|---|
| AM1 | Username and password | All human principals | All client surfaces |
| AM2 | Password plus MFA | All human principals with access to PHI | Practitioner and administrative clients |
| AM3 | SSO via federated identity | Enterprise customers with identity provider | Practitioner and administrative clients |
| AM4 | Biometric (local) | Practitioners on mobile clients | Mobile practitioner client |
| AM5 | Client certificate | System-to-system integrations | Integration endpoints |
| AM6 | OAuth client credentials | System-to-system integrations | Integration endpoints |
| AM7 | Break-glass emergency | Clinicians in urgent situations | Practitioner client |
| AM8 | Patient portal credentials | Patients | Patient portal |
| AM9 | Platform-level administrative | Ibn Hayan operators | Platform operations console |

### 2.2 Method Selection

The selection of authentication method is governed by role, surface, and risk context. The Identity & Access module enforces method selection through configuration; principals cannot select a method that is not permitted for their role and surface. Method selection is documented in the role definition (see `ROLES_AND_PERMISSIONS.md`) and is auditable. A role that requires AM2 (password plus MFA) cannot authenticate using AM1 (password alone), even if the principal knows the password; the second factor is required and the authentication will fail without it.

Method selection is also governed by deployment model. Air-gapped deployments (DM4 per SYSTEM_ARCHITECTURE Section 23.6) cannot use methods that depend on external identity providers; method availability is constrained by the deployment topology. Method availability per deployment model is documented in the deployment model's operational documentation.

### 2.3 Method Composition

Methods may be composed for higher assurance. AM2 composes AM1 with an additional factor; AM3 may compose federated authentication with a local MFA challenge for high-risk actions. Composition is governed by the same policy framework as individual methods, with the composition itself documented as a method variant. Composition is not ad-hoc; a principal cannot improvise a composition that is not defined in the catalogue.

Composition is also governed by the action being performed. Routine clinical actions may use the principal's default method; high-risk actions — such as administering a controlled substance, accessing a restricted record, or modifying a permission — may require step-up authentication through an additional factor. Step-up authentication is documented in Section 8 (Authentication Flows) and is enforced at the Orchestration Layer through the workflow engine.

### 2.4 Method Lifecycle

Authentication methods have a lifecycle similar to modules. Methods are introduced as candidates, validated through pilot, and promoted to general availability. Methods that become obsolete are deprecated and retired through the documented deprecation policy. The lifecycle is governed by the Security Council, with method changes recorded in the security documentation change log.

The platform's decade-horizon commitment (Architectural Principle P18) requires that authentication methods evolve without architectural rework. New methods are introduced through the Identity & Access module's extension surface, not through modifications to the Edge Layer. Methods that cannot be introduced through the extension surface are candidates for architectural evolution, not for ad-hoc addition.

### 2.5 Method and Edition Interaction

Authentication method availability is influenced by edition. The Trial edition (E0) supports AM1 and AM2 to enable prospect evaluation without requiring SSO configuration. The Essential edition (E1) supports AM1, AM2, AM4, and AM8. The Professional edition (E2) adds AM3 (SSO) and AM5 (client certificate). The Enterprise edition (E3) adds AM6 (OAuth client credentials), AM7 (break-glass with full governance), and AM9 (platform-level administrative). Edition-method interaction is documented in `EDITIONS.md` and enforced through the configuration layer model.

### 2.6 Method Audit

Every authentication method produces an audit record. The audit record captures the method used, the principal, the tenant, the surface, the time, and the result (success or failure with reason). Audit records are written to the audit store defined in SYSTEM_ARCHITECTURE Section 27.5 and are immutable. The audit trail is the basis for compliance demonstration and for authentication incident investigation.

---

## 3. Password Policies

### 3.1 Password Policy Framework

The Ibn Hayan password policy framework defines the rules that govern password creation, storage, use, and expiration across all surfaces. The framework is aligned with recognized industry guidance for healthcare-grade authentication and is reviewed annually by the Security Council. The framework is enforced at the Identity & Access module (M14) and is not overridable by tenant configuration; password policy is a platform-level invariant. The framework treats passwords as one factor among several, not as the sole authentication mechanism for principals with access to protected health information.

The policy framework distinguishes between user-selected passwords and system-generated passwords. User-selected passwords are subject to length, complexity, and history rules; system-generated passwords are subject to length and entropy rules. Both are stored using recognized password hashing techniques with appropriate salting and work factors. Plaintext password storage is forbidden and is treated as a critical defect.

### 3.2 Password Complexity Rules

| Rule | Requirement |
|---|---|
| Minimum length | 12 characters for human principals; 16 characters for administrative and integration accounts |
| Maximum length | 256 characters (no practical upper bound that would discourage passphrases) |
| Character classes | At least three of: uppercase, lowercase, digits, symbols |
| Common password screening | Passwords are screened against a recognized compromised-password list |
| Sequential and repeating patterns | Forbidden (e.g., 12345678, aaaaaaaa) |
| User identifier inclusion | Passwords may not contain the user's identifier, display name, or email |
| Tenant identifier inclusion | Passwords may not contain the tenant's name or domain |

The complexity rules are evaluated at password creation and password change. A password that fails any rule is rejected with diagnostic information that does not reveal which rule failed in a way that would aid an attacker. The rules are applied consistently across all surfaces; a password created through the practitioner client must satisfy the same rules as a password created through the patient portal.

### 3.3 Password Lifecycle

| Lifecycle Stage | Policy |
|---|---|
| Initial password | Generated by the platform; delivered through a secure channel; must be changed at first authentication |
| Routine change | Not enforced on a fixed schedule; instead, risk-based change is triggered by suspected compromise |
| Compromise-driven change | Required within defined window after a confirmed or suspected compromise |
| Reset | Permitted through documented recovery workflow; old password invalidated immediately |
| History | Last 24 passwords retained; reuse forbidden |
| Expiration | Risk-based, not calendar-based; expired passwords disable authentication until reset |

The shift from calendar-based to risk-based password expiration reflects contemporary guidance that calendar-based expiration encourages weaker passwords. Risk-based expiration triggers on events such as suspected credential exposure, role change that increases privilege, or a security incident that may have affected credentials. Triggers are documented and auditable.

### 3.4 Password Storage

Passwords are stored using recognized password hashing techniques that include per-password salts and adaptive work factors. The work factor is reviewed annually by the Security Council and is increased as hardware capability evolves. Plaintext password storage, reversible encryption of passwords, and unsalted hashing are forbidden and are treated as critical defects. Password hashes are stored in the transactional store under access controls that limit access to the Identity & Access module.

Password verification occurs through constant-time comparison to prevent timing attacks. Passwords in transit are protected by transport-layer encryption; passwords are never logged, even at debug verbosity. A defect that logs a password is treated as a security incident and triggers the documented incident response process.

### 3.5 Password Recovery

Password recovery is governed by a documented workflow that balances security against practitioner productivity. Self-service recovery is available for principals who have enrolled a verified recovery factor (such as an MFA device or a verified email). Recovery through a verified factor resets the password without administrator involvement; the reset is audited and triggers re-authentication of all active sessions for the principal. Recovery that cannot be completed through self-service requires administrator intervention, with the administrator's action separately audited.

Recovery is rate-limited to prevent brute-force attacks on the recovery workflow. Repeated recovery attempts trigger account lockout, as documented in Section 9 (Authentication Error Handling). Recovery through social engineering — an attacker convincing an administrator to reset a password without verification — is mitigated through mandatory verification of the requesting principal's identity through a documented procedure.

### 3.6 Service Account Passwords

Service account credentials — passwords, client secrets, and API keys used by integration accounts (R14) — are governed by a stricter policy than user passwords. Service account credentials are system-generated, rotated on a documented schedule, stored in the platform's secrets management service, and never embedded in source code or configuration files. Service account credentials are scoped to specific integration surfaces and have expiration dates. Rotation is automated where possible; manual rotation is documented and audited. Service account credentials are never shared across tenants.

---

## 4. Multi-Factor Authentication (MFA)

### 4.1 MFA Posture

Multi-factor authentication is required for every human principal who has access to protected health information, in keeping with the platform's defence-in-depth posture. MFA is enforced at authentication and at step-up for high-risk actions. The platform supports multiple MFA factors, allowing principals to choose a factor appropriate to their workflow and device availability. MFA is not optional for in-scope principals; a principal who has not enrolled an MFA factor cannot authenticate to a surface that requires MFA.

MFA is enforced through the Identity & Access module, with the enforcement point at the Edge Layer. A principal who provides a correct password but no second factor is rejected; the password alone is insufficient. Enforcement is consistent across surfaces; the patient portal, the practitioner client, and the administrative console all enforce MFA for in-scope principals.

### 4.2 Supported MFA Factors

| Factor Code | Factor | Notes |
|---|---|---|
| MF1 | Time-based one-time password (TOTP) from a software authenticator | Supported on all surfaces |
| MF2 | Push notification to a verified mobile device | Supported on mobile and desktop clients |
| MF3 | Hardware security key (FIDO2/WebAuthn) | Supported on desktop and mobile clients with hardware support |
| MF4 | Short message service (SMS) one-time code | Permitted only where no other factor is available; deprecated for new enrollment |
| MF5 | Voice call one-time code | Permitted only as fallback for SMS-incapable principals |
| MF6 | Platform-issued biometric challenge | Permitted only on devices with secure biometric hardware |

The factor catalogue is reviewed annually. SMS (MF4) is permitted only as a fallback because SMS is vulnerable to interception through SIM-swap and other attacks; new enrollments are encouraged toward MF1, MF2, or MF3. The Security Council may retire MF4 in a future revision; principals enrolled in MF4 will be migrated to a stronger factor through a documented transition.

### 4.3 Factor Enrollment

Factor enrollment is a governed process. A principal enrolls a factor through the Identity & Access module's enrollment surface, with enrollment authenticated by the principal's current credentials and an additional verification step (such as a one-time code sent to a verified channel). Enrollment produces an audit record that captures the factor type, the device fingerprint (where applicable), and the enrollment time. Enrollment is not retroactive; a factor enrolled after an incident does not retroactively protect prior sessions.

A principal must enroll at least one primary factor and one recovery factor. The recovery factor is used for self-service password recovery and for re-enrollment of a lost primary factor. Recovery factor enrollment is subject to additional verification to prevent an attacker from enrolling a recovery factor that would grant them persistent access.

### 4.4 MFA Challenge

The MFA challenge is issued after the primary authentication succeeds. The challenge is delivered through the principal's enrolled factor, with a defined timeout for response. A challenge that times out is recorded as a failed MFA attempt; repeated failures trigger the lockout policy documented in Section 9. The challenge is rate-limited to prevent brute-force attacks on the second factor.

For step-up authentication (high-risk actions), the MFA challenge is issued at the time of the action, not at session establishment. Step-up challenges have a short validity window (typically minutes) and are scoped to the specific action being authorized. The step-up challenge produces a separate audit record that captures the action being authorized and the challenge result.

### 4.5 MFA and Offline Operation

MFA in offline operation is supported through cached verification of the principal's enrolled factor. At the time of offline transition, the principal's MFA enrollment is verified and a local MFA challenge is enabled for offline authentication. Offline MFA uses factors that do not require network connectivity (MF1, MF3, MF6); push-based factors (MF2) and SMS/voice factors (MF4, MF5) are not available offline. Offline MFA is documented further in Section 8 (Authentication Flows).

### 4.6 MFA Governance

MFA governance is the responsibility of the Security Council. The council reviews the factor catalogue annually, evaluates emerging factors, and approves retirement of obsolete factors. MFA configuration is documented per tenant and is auditable; a tenant's MFA posture is reviewable by the tenant's compliance officer through the audit query surface. Tenants may enforce stricter MFA policies (such as requiring MF3 for principals with high-privilege roles) but may not relax platform-level MFA requirements.

---

## 5. Single Sign-On (SSO)

### 5.1 SSO Posture

Single sign-on is supported for enterprise customers who operate a corporate identity provider. SSO allows principals to authenticate to the Ibn Hayan platform using their corporate identity, eliminating the need for a separate Ibn Hayan password. SSO is governed by ADR-004's commitment to tenant isolation; an SSO configuration is tenant-scoped and is not shared across tenants. The platform supports SSO through recognized federation protocols; specific protocol selection is documented in the integration catalogue maintained by the Office of the CISO.

SSO is not mandatory; a tenant may operate without SSO, using username and password with MFA. SSO is recommended for tenants above a defined size threshold, where the operational burden of password management exceeds the operational burden of SSO configuration. SSO is required for tenants whose corporate policy mandates federated authentication.

### 5.2 Supported Federation Protocols

| Protocol | Status | Typical Use |
|---|---|---|
| SAML 2.0 | Supported | Enterprise customers with established SAML infrastructure |
| OpenID Connect (OIDC) | Supported | Enterprise customers with modern identity providers |
| WS-Federation | Not supported | Legacy; not on roadmap |
| Custom protocols | Not supported | Customers must adopt a supported protocol or use AM1/AM2 |

The protocol catalogue is reviewed annually. The platform prefers OIDC for new SSO configurations because of its modern design and broad identity provider support. SAML 2.0 is supported for compatibility with established enterprise identity providers. The platform does not commit to supporting legacy or proprietary federation protocols; customers who require such protocols are directed toward the integration extension surface, where a custom integration may be developed through the documented extension governance process.

### 5.3 SSO Configuration

SSO configuration is a tenant-level operation performed by the tenant's system administrator (R13). Configuration requires the identity provider's metadata, the tenant's relying-party identifier, and the certificate used to sign assertions. Configuration is validated before activation, with the validation confirming that the identity provider's metadata is well-formed, that the relying-party identifier is unique within the tenant, and that the signing certificate is current and trusted.

SSO configuration is auditable. Every change to SSO configuration produces an audit record that captures the previous and new configuration, the configurator, and the validation result. SSO configuration changes are subject to the configuration governance framework documented in PRODUCT_BIBLE Section 22.7, with high-risk changes (such as replacing the signing certificate) requiring approval by the tenant's compliance officer.

### 5.4 SSO and Just-in-Time Provisioning

The platform supports just-in-time provisioning of principal accounts during SSO authentication. When a principal authenticates through SSO for the first time, the platform creates a principal account based on attributes provided by the identity provider, subject to the tenant's provisioning policy. Just-in-time provisioning is governed by attribute mapping rules that translate identity provider attributes into Ibn Hayan role assignments; the mapping is documented, validated, and auditable.

Just-in-time provisioning does not bypass role assignment governance. The roles assigned through just-in-time provisioning are limited to roles that the tenant's system administrator has pre-authorized for SSO-assigned principals. A principal who authenticates through SSO and who requires a role not in the pre-authorized set must receive the role through the documented role assignment workflow defined in `ROLES_AND_PERMISSIONS.md`.

### 5.5 SSO Failure Handling

SSO authentication can fail at multiple points: the identity provider may be unreachable, the assertion may be malformed, the assertion may be expired, or the principal may not be authorized. Each failure mode is documented with a specific error code and a recovery action. Failures are recorded in the audit trail with sufficient detail to support investigation without exposing sensitive information.

When the identity provider is unreachable, the platform falls back to username and password authentication for principals who have a local password, in keeping with the platform's offline-first posture. The fallback is logged as an SSO failure with fallback authentication, and the principal is prompted to re-establish SSO authentication at the next opportunity. Principals who do not have a local password are unable to authenticate during identity provider outage; this is a deliberate trade-off that prioritizes security over availability for SSO-only principals.

### 5.6 SSO Governance

SSO governance is shared between the tenant and the Ibn Hayan platform. The tenant is responsible for the identity provider's operation, the principal accounts in the identity provider, and the attribute mapping configuration. The platform is responsible for the federation protocol implementation, the relying-party configuration, and the audit trail. The shared responsibility is documented in the tenant's SSO configuration record and is reviewed annually.

SSO governance includes periodic review of SSO configuration for currency. Signing certificates expire and must be rotated; the platform alerts the tenant's system administrator in advance of expiration and provides a documented rotation workflow. A tenant that allows a signing certificate to expire experiences SSO failure; the platform's monitoring detects expiration-approaching certificates and escalates to the tenant.

---

## 6. Session Management

### 6.1 Session Lifecycle

An authenticated session is the period during which a principal's authentication is considered valid. The Ibn Hayan session lifecycle is governed by documented rules that balance security against practitioner productivity. A session begins at successful authentication, persists for a defined idle timeout, and terminates on explicit logout, idle timeout, absolute timeout, or administrative revocation. The lifecycle is enforced at the Edge Layer and is consistent across surfaces.

| Stage | Duration | Notes |
|---|---|---|
| Session establishment | Immediate upon successful authentication | Session identifier issued |
| Active session | Until idle timeout (default 15 minutes) | Idle timeout is reset on activity |
| Idle timeout warning | 5 minutes before idle timeout | Principal may extend the session |
| Idle timeout | At default 15 minutes of inactivity | Session terminated; re-authentication required |
| Absolute timeout | At default 8 hours | Session terminated regardless of activity |
| Re-authentication | Required after absolute timeout | MFA required for in-scope principals |
| Logout | Immediate on principal-initiated logout | Session invalidated; tokens revoked |

Timeouts are configurable within platform-defined bounds. A tenant may shorten the idle timeout to reflect stricter security policy but may not lengthen it beyond the platform maximum. Absolute timeout is non-negotiable; a session that has reached absolute timeout is terminated regardless of activity, in keeping with the platform's commitment to limiting the impact of session hijacking.

### 6.2 Session Tokens

Session tokens are the credentials that represent an authenticated session. The platform issues tokens with documented properties: limited lifetime, scoped to a specific tenant, scoped to a specific principal, and revocable. Tokens are signed by the platform and are verified at the Edge Layer on every request. Tokens are not encrypted for confidentiality; the principal's identity is not secret, but the token's integrity is protected against forgery.

Token revocation is immediate upon logout, idle timeout, absolute timeout, or administrative action. A revoked token is added to a revocation list that is checked on every request; a request with a revoked token is rejected. The revocation list is bounded in size and time, with revoked tokens expiring from the list when their natural lifetime expires. Token revocation is auditable.

### 6.3 Session Token Refresh

Token refresh is the mechanism by which a session is extended without re-authentication. The platform issues short-lived access tokens and longer-lived refresh tokens, with the refresh token exchangeable for a new access token. Refresh is permitted only within the absolute timeout window; once the absolute timeout is reached, refresh fails and re-authentication is required.

Refresh tokens are bound to the principal's device and are invalidated on logout. A refresh token presented from a different device is rejected. Device binding is implemented through documented device fingerprinting techniques that are reviewed annually for effectiveness against evasion. Refresh token use is auditable; the audit record captures the device, the time, and the resulting access token's scope.

### 6.4 Concurrent Sessions

The platform supports concurrent sessions for a single principal, with documented limits. A principal may have a defined number of active sessions (default 5), with new sessions beyond the limit evicting the oldest session. Concurrent sessions are tracked in the session store and are visible to the principal through the account management surface. Concurrent sessions are useful for principals who work across multiple devices (for example, a physician who uses a desktop in the office and a tablet at the bedside); the limit prevents unbounded session proliferation that would complicate audit and revocation.

Concurrent sessions are independent; logout on one device does not log out other devices. A principal who wishes to terminate all sessions may do so through the account management surface, which terminates all sessions and revokes all tokens. Administrative session termination is also supported, with the administrator's action audited and the affected principal notified.

### 6.5 Session Binding to Tenant

Sessions are bound to a specific tenant. A principal who authenticates to tenant A cannot use that session to access tenant B; the session's tenant binding is verified on every request. A principal who holds credentials in multiple tenants authenticates separately for each tenant, with each authentication establishing a separate session. Cross-tenant session context is forbidden and is enforced at the Edge Layer.

Session binding to tenant is non-negotiable. The platform does not support a "tenant switch" within a session; switching tenants requires logout and re-authentication. This posture reflects the platform's commitment to tenant isolation as a primitive (ADR-004) and prevents accidental cross-tenant access through session context confusion.

### 6.6 Session Audit

Every session event is audited. Session establishment, refresh, extension, timeout, logout, and administrative termination produce audit records. The audit record captures the principal, the tenant, the device (where applicable), the time, and the event type. Session audit records are the basis for investigation of suspected session hijacking and for compliance demonstration of access to protected health information.

Session audit records are retained according to the platform's audit retention policy, documented in `DATA_RETENTION.md`. Session audit records are immutable, in keeping with Architectural Principle P13 and the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

---

## 7. Biometric Authentication

### 7.1 Biometric Posture

Biometric authentication is supported as a convenience factor for principals on devices with secure biometric hardware. Biometrics are not a primary authentication factor; they are a factor that unlocks a locally-stored credential that itself was established through primary authentication. This posture reflects the platform's commitment to strong authentication while accommodating the clinical workflow reality that practitioners on mobile clients authenticate frequently and benefit from a low-friction factor.

Biometric authentication is governed by the platform's privacy posture (see `PRIVACY_POLICY.md`). The platform does not collect, store, or transmit biometric templates; biometric matching occurs on the device, in the device's secure enclave, and the platform receives only an assertion that the match succeeded. The assertion is signed by the device's secure hardware and is verified by the platform on receipt. This posture ensures that biometric data remains under the principal's control and is not exposed to the platform.

### 7.2 Supported Biometric Modalities

| Modality | Status | Notes |
|---|---|---|
| Fingerprint | Supported | Most common modality; supported on devices with fingerprint sensors |
| Facial recognition | Supported | Supported on devices with secure facial recognition hardware |
| Iris recognition | Supported | Limited device support; available where hardware permits |
| Voice recognition | Not supported | Insufficient security guarantees for healthcare-grade authentication |

The modality catalogue is reviewed annually. Voice recognition is not supported because of the variability of voice authentication across environments and the risk of replay attacks. The platform may add modalities in future revisions as hardware support matures; modalities are added through the extension surface of the Identity & Access module.

### 7.3 Biometric Enrollment

Biometric enrollment is performed on the principal's device, not on the platform. The principal enrolls their biometric through the device's operating system; the platform's role is to verify that the device has a secure biometric enrollment and to issue a credential that the device will unlock only on successful biometric match. Enrollment on the platform side consists of registering the device's public key and the credential identifier; the platform does not receive or store the biometric template.

Biometric enrollment is auditable. The audit record captures the device, the modality, and the enrollment time; it does not capture biometric data. Enrollment is performed through the principal's account management surface and requires re-authentication through a non-biometric factor to prevent an attacker from enrolling a biometric on a compromised device.

### 7.4 Biometric Authentication Flow

Biometric authentication proceeds as follows. The principal initiates authentication on a device that has a registered biometric credential. The platform sends a challenge to the device. The device prompts the principal for biometric input; on successful match, the device signs the challenge with the credential's private key and returns the signed challenge to the platform. The platform verifies the signature, the credential, and the challenge, and on success issues a session token. The flow is documented in Section 8 (Authentication Flows).

The flow is designed to prevent replay attacks through challenge-response and to prevent credential theft through the device's secure hardware. A device that does not have secure biometric hardware cannot perform biometric authentication; the platform detects the absence of secure hardware and falls back to a non-biometric factor.

### 7.5 Biometric Revocation

Biometric credentials are revocable. A principal who loses a device, who suspects compromise, or who replaces a device revokes the biometric credential through the account management surface, with the revocation authenticated through a non-biometric factor. Revocation invalidates the credential on the platform side; subsequent attempts to authenticate using the revoked credential are rejected. The lost device's locally-stored credential remains technically present but is unusable because the platform no longer recognizes it.

Revocation is auditable. A principal may also revoke biometric credentials proactively as part of routine device hygiene; for example, a principal who replaces a device revokes the old device's credential before enrolling the new device. The platform's account management surface displays all registered biometric credentials, allowing the principal to manage their biometric enrollment posture.

### 7.6 Biometric and Privacy

Biometric authentication is governed by the platform's privacy posture (see `PRIVACY_POLICY.md`). The platform's commitment to not collecting, storing, or transmitting biometric templates is a privacy commitment that is also a security control; data that the platform does not hold cannot be exfiltrated. This posture is documented in the platform's privacy notice and is verified through periodic security audit.

The platform's biometric posture accommodates regional regulatory variation. Some regions impose specific requirements on biometric data; the platform's posture of not collecting biometric templates satisfies most such requirements without additional configuration. Where a region imposes requirements beyond the platform's default posture (for example, requiring explicit consent for biometric use), the platform's configuration surface applies the regional overlay, with the consent recorded in the audit trail.

---

## 8. Authentication Flows

### 8.1 Standard Authentication Flow

The standard authentication flow is the sequence of events that occurs when a principal authenticates using AM1 or AM2 (username and password, optionally with MFA). The flow begins with the principal submitting their identifier and password. The Edge Layer verifies the identifier's format and submits the password to the Identity & Access module for verification. The module retrieves the password hash, performs constant-time comparison, and returns the result. On success, the module issues a session token and establishes the session.

If the principal's role requires MFA, the module issues an MFA challenge after successful password verification. The principal submits the MFA response; the module verifies the response and, on success, completes the session establishment. On failure at any step, the flow terminates with an error, and the failure is recorded in the audit trail.

The standard flow is documented in detail in the Identity & Access module's contract documentation. The flow is implemented at the platform layer and is consistent across surfaces; a principal who authenticates through the practitioner client experiences the same flow as a principal who authenticates through the patient portal, with surface-specific differences only in the user interface.

### 8.2 SSO Authentication Flow

The SSO authentication flow is the sequence of events that occurs when a principal authenticates through a federated identity provider. The flow begins with the principal selecting SSO authentication and entering their tenant identifier. The platform redirects the principal to the identity provider's authentication endpoint, with a signed request that includes the tenant's relying-party identifier and a request identifier.

The principal authenticates to the identity provider using the identity provider's authentication flow (which is outside the platform's scope). On success, the identity provider redirects the principal back to the platform with a signed assertion that includes the principal's identity attributes. The platform verifies the assertion's signature, the assertion's validity window, and the request identifier's match. On success, the platform issues a session token and establishes the session, with the principal's roles assigned through just-in-time provisioning or through existing role assignments.

### 8.3 Step-Up Authentication Flow

The step-up authentication flow is triggered when a principal attempts a high-risk action. The Orchestration Layer detects the high-risk action and requests step-up authentication from the Identity & Access module. The module issues an MFA challenge scoped to the specific action, with a short validity window (typically minutes). The principal submits the MFA response; the module verifies the response and, on success, issues an authorization token that the Orchestration Layer accepts as sufficient for the action.

Step-up authentication is in addition to the principal's session authentication, not a replacement. The session remains valid for routine actions; the step-up token is additional authorization for the specific high-risk action. The step-up token is not reusable for other high-risk actions; each high-risk action requires its own step-up challenge. Step-up events are audited with the action, the challenge, and the result.

### 8.4 Offline Authentication Flow

The offline authentication flow is the sequence of events that occurs when a principal authenticates to an offline client. The client holds a cached credential established during a prior online authentication; the credential is signed by the platform and is valid for a defined offline window (typically 24 hours, extendable to 7 days for documented operational scenarios such as field clinics).

The principal submits their identifier and password (or biometric) to the client. The client verifies the password against a locally-cached password hash and verifies the cached credential's validity window. On success, the client establishes a local session, with all subsequent offline actions authenticated through the local session. The local session is audited locally, with the audit records synchronized to the central audit trail when connectivity is restored.

### 8.5 Break-Glass Authentication Flow

The break-glass authentication flow is the sequence of events that occurs when a principal invokes emergency access to a patient record that they do not have routine permission to access. The flow is documented in `AUTHORIZATION.md` and is summarized here for completeness. The principal explicitly invokes break-glass authentication, providing a justification. The platform issues a temporary permission grant scoped to the specific patient record and time-bounded (typically 1 hour). The grant is audited with the principal, the patient, the justification, and the time.

Break-glass authentication is not a routine workflow; it is a controlled exception. Frequent use of break-glass authentication indicates a permission configuration defect and is investigated by the tenant's compliance officer. Break-glass events are reviewed by the compliance officer through the audit query surface, with the review itself audited.

### 8.6 Integration Account Authentication Flow

The integration account authentication flow is the sequence of events that occurs when a system principal (R14) authenticates to the platform. The flow uses AM5 (client certificate) or AM6 (OAuth client credentials), with the credential stored in the platform's secrets management service. The flow begins with the integration account submitting its credential to the Edge Layer. The Edge Layer verifies the credential against the platform's trust store and, on success, issues a session token scoped to the integration account's authorized surfaces.

Integration account sessions are long-lived (typically 1 hour, refreshable for the integration's operational window) and are scoped to specific integration surfaces. An integration account cannot authenticate to surfaces outside its authorized scope; the Edge Layer enforces the scope on every request. Integration account authentication is audited with the credential type, the integration's identifier, and the authorized surfaces.

---

## 9. Authentication Error Handling

### 9.1 Error Categories

Authentication errors are categorized to support consistent handling and accurate audit. The categories are documented below, with each category having defined handling behaviour and audit recording. Errors are reported to the principal with diagnostic information that does not reveal information useful to an attacker (for example, a failed password authentication does not reveal whether the identifier or the password was incorrect).

| Code | Category | Handling |
|---|---|---|
| AE1 | Identifier not found | Treated as authentication failure; recorded as failure with reason |
| AE2 | Password incorrect | Recorded as failure; lockout counter incremented |
| AE3 | MFA challenge failed | Recorded as failure; lockout counter incremented |
| AE4 | MFA challenge timed out | Recorded as failure; principal prompted to re-authenticate |
| AE5 | Account locked | Authentication rejected; principal directed to recovery |
| AE6 | Account disabled | Authentication rejected; principal directed to administrator |
| AE7 | Tenant not found | Authentication rejected; principal directed to verify tenant |
| AE8 | Session expired | Principal directed to re-authenticate |
| AE9 | SSO assertion invalid | Authentication rejected; principal directed to re-authenticate through SSO |
| AE10 | Break-glass justification missing | Action rejected; principal prompted to provide justification |

### 9.2 Account Lockout Policy

Account lockout is the platform's defence against brute-force attacks on authentication. Lockout is triggered by repeated failed authentication attempts within a defined window. The lockout policy is documented below; the policy is enforced at the Identity & Access module and is consistent across surfaces.

| Parameter | Default | Notes |
|---|---|---|
| Failed attempt threshold | 5 | Failed attempts within the lookback window |
| Lookback window | 15 minutes | Window within which failed attempts are counted |
| Lockout duration | 15 minutes | Account is locked for this duration |
| Escalation | After 3 lockouts within 24 hours | Lockout duration extended; administrator notified |
| Auto-reset | After successful authentication | Counter resets on success |

Lockout parameters are configurable within platform-defined bounds. A tenant may shorten the lockout duration to improve practitioner productivity in low-risk environments, but may not lengthen it beyond the platform maximum. A tenant may not disable lockout; lockout is a platform-level invariant.

### 9.3 Lockout Recovery

A principal whose account is locked may recover through documented pathways. Self-service recovery is available through the platform's account recovery workflow, which requires verification through a recovery factor. Recovery through an administrator is available for principals who cannot complete self-service recovery; the administrator's action is separately audited and requires verification of the principal's identity through a documented procedure.

Recovery does not bypass lockout governance. A principal who repeatedly triggers lockout is flagged for review by the tenant's compliance officer; repeated lockout may indicate a forgotten password, a misconfigured MFA device, or an attack. The compliance officer's review is itself audited.

### 9.4 Notification on Failure

The platform notifies principals of authentication failures that affect their account. A principal who experiences a failed authentication receives no immediate notification (to avoid alert fatigue), but a principal whose account is locked receives a notification through their verified recovery channel. A principal who experiences authentication attempts from unfamiliar locations or devices receives a notification, with the notification including guidance on reviewing account activity and resetting credentials if compromise is suspected.

Notifications are delivered through the platform's notification module (M13) and are themselves auditable. Notifications are not delivered for every failed attempt (which would produce notification fatigue); they are delivered for events that meet defined risk thresholds, with the thresholds documented in the Security Council's notification policy.

### 9.5 Error Audit

Every authentication error is audited. The audit record captures the principal identifier (where known), the tenant, the surface, the time, the error category, and contextual information such as the source IP address and the device fingerprint (where available). Error audit records are retained according to the platform's audit retention policy and are the basis for security investigation and compliance demonstration.

Error audit records are immutable. An attacker who compromises the platform cannot modify error audit records to conceal their activity, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5. Error audit records are reviewed by the platform's security monitoring, with anomalous patterns triggering alerts to the security operations team.

### 9.6 Error Reporting to Principals

Errors are reported to principals through the authentication surface, with diagnostic information that supports the principal's next action without revealing information useful to an attacker. A failed password authentication reports "invalid credentials" rather than "invalid password" or "unknown identifier", preventing identifier enumeration. A locked account reports "account locked, please try again later or contact your administrator" rather than revealing the lockout state to an unauthenticated attacker.

Error reporting is reviewed annually by the Security Council to ensure that the diagnostic information remains useful to legitimate principals while not aiding attackers. The review considers emerging attack techniques and adjusts error reporting as needed. Changes to error reporting are documented in the security documentation change log.

---

## 10. Security Considerations

### 10.1 Threat Model

The Ibn Hayan authentication threat model considers the following threat categories, each with documented controls. The threat model is reviewed annually by the Security Council and is updated as emerging threats are identified.

| Threat | Control |
|---|---|
| Credential theft | Encryption in transit and at rest; password hashing; MFA |
| Credential guessing | Account lockout; password complexity; compromised-password screening |
| Credential phishing | SSO where available; MFA; principal education |
| Session hijacking | Transport encryption; token binding; idle and absolute timeouts |
| Session fixation | New session identifier on authentication; revocation on logout |
| Replay attacks | Nonces in authentication flows; short-lived tokens; challenge-response |
| Brute force on MFA | Rate limiting on MFA challenges; lockout on repeated failure |
| Identity provider compromise | SSO assertion validation; signing certificate rotation; fallback authentication |
| Insider threat | Audit trail; segregation of duties; least privilege; compliance review |
| Supply chain compromise | Vendor security review; secrets management; code signing (where applicable) |

### 10.2 Defence in Depth

Authentication is one layer in the platform's defence-in-depth strategy. Even if authentication is compromised, authorization limits what an attacker can do, audit records what they did, and monitoring detects anomalous behaviour. The defence-in-depth posture is ratified in SYSTEM_ARCHITECTURE Section 20.2 and is implemented through the coordinated action of multiple controls.

The defence-in-depth posture is tested through periodic red-team exercises that simulate attacks on authentication. Red-team results are documented and used to improve controls. A red-team exercise that successfully compromises authentication is treated as a security incident and triggers the documented incident response process, with the vulnerability remediated before the next exercise.

### 10.3 Cryptographic Considerations

Authentication depends on cryptographic primitives for password hashing, token signing, and transport encryption. The platform uses recognized cryptographic algorithms with appropriate key lengths and key management practices. Cryptographic algorithm selection is documented in the cryptographic standards register maintained by the Office of the CISO and is reviewed annually for currency against emerging cryptanalytic techniques.

Cryptographic keys used in authentication are managed through the platform's key management service, with documented rotation, escrow (where applicable), and destruction practices. Keys are not embedded in source code, not stored in plaintext, and not accessible to unauthorized personnel. Key management is governed by the documented key management policy and is audited.

### 10.4 Authentication and Network Security

Authentication is enforced at the Edge Layer, with the Edge Layer protected by network security controls documented in `SECURITY_GUIDELINES.md`. Network security controls include traffic filtering, rate limiting, and anomaly detection. A network-level attack that floods the Edge Layer with authentication requests is mitigated through rate limiting and through the account lockout policy.

The platform's zero-trust posture means that network location is not a basis for trust. A request from within the platform's network is authenticated the same as a request from outside; there is no "trusted internal network" that bypasses authentication. This posture is ratified in SYSTEM_ARCHITECTURE Section 20.2 and is a critical defence against insider threats and against lateral movement by an attacker who has compromised one component.

### 10.5 Authentication and Audit

Authentication is tightly coupled with audit, as documented in SYSTEM_ARCHITECTURE Section 20.6. Every authentication event is recorded in the audit trail; the audit trail is the basis for investigation of authentication incidents and for compliance demonstration. The coupling is non-negotiable; an authentication event that is not audited is treated as a critical defect.

The audit trail's immutability is itself a defence against tampering. An attacker who compromises the platform cannot modify the audit trail to conceal their authentication activity, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5. The integrity of the audit trail is verified through documented integrity verification processes that are reviewed by the Security Council.

### 10.6 Authentication and Incident Response

Authentication incidents — confirmed or suspected compromise of credentials, identity provider compromise, or authentication service compromise — are handled through the platform's documented incident response process. The process is summarized in `SECURITY_GUIDELINES.md` and detailed in the security incident response plan. Authentication incidents trigger credential rotation, session revocation, and audit trail investigation, with the response documented and reviewed.

Authentication incidents are communicated to affected tenants per the platform's customer communication policy. Tenants are notified of incidents that affect their principals' credentials or sessions, with the notification including guidance on protective actions such as password reset and MFA re-enrollment. Notification timing and content are governed by the platform's contractual and regulatory obligations.

---

## 11. Authentication Testing

### 11.1 Test Posture

Authentication is tested at multiple levels, with the testing posture reflecting the criticality of authentication to the platform's security. Testing covers functional correctness, security properties, performance under load, and resilience against attack. The testing posture is documented in the platform's testing strategy and is reviewed annually by the Security Council.

Authentication testing is performed before any change to authentication is deployed to production. Changes include new authentication methods, changes to existing methods, changes to the Identity & Access module's authentication surface, and changes to authentication configuration defaults. Testing is automated where possible, with manual testing for scenarios that resist automation.

### 11.2 Functional Testing

Functional testing verifies that authentication behaves as documented. Test cases cover successful authentication with each method, failed authentication with each error category, account lockout and recovery, session lifecycle, and MFA enrollment and challenge. Test cases are documented and versioned alongside the platform's authentication implementation.

Functional testing includes regression testing for changes that affect authentication. Regression testing verifies that a change does not inadvertently break existing authentication behaviour. Regression test cases are maintained as a living suite, with new cases added for defects discovered in production to prevent recurrence.

### 11.3 Security Testing

Security testing verifies that authentication resists attack. Test cases cover brute force, credential stuffing, password spraying, session hijacking, session fixation, replay, and MFA bypass. Security testing is performed through automated tools and through manual penetration testing by qualified security testers.

Security testing includes red-team exercises that simulate realistic attacks on authentication. Red-team exercises are conducted periodically by the platform's security team and by external assessors. Results are documented and used to improve controls. A red-team exercise that successfully compromises authentication is treated as a security incident and triggers the documented incident response process.

### 11.4 Performance Testing

Performance testing verifies that authentication performs within documented targets under expected and peak load. Test cases cover authentication throughput, authentication latency, and authentication behaviour under concurrent load. Performance testing is performed before deployment of authentication changes that may affect performance.

Performance targets are documented in the platform's service level objectives. Authentication latency is a critical metric because it directly affects practitioner experience; a slow authentication surface encourages workarounds that compromise security. Performance regression is treated as a defect and is addressed before deployment.

### 11.5 Resilience Testing

Resilience testing verifies that authentication continues to operate during partial platform failure. Test cases cover authentication during Edge Layer failure, during Identity & Access module failure, and during audit store failure. Resilience testing includes failover testing, with authentication failing over to redundant components without service interruption.

Resilience testing includes offline authentication testing, verifying that authentication continues during network outages. Offline authentication testing covers the cached credential flow, the offline MFA flow, and the synchronization of offline audit records. Resilience testing is performed periodically and after changes that affect authentication's failure modes.

### 11.6 Test Audit

Authentication testing is itself auditable. Test execution produces records that capture the test cases executed, the results, and the environment in which the tests were run. Test records are retained per the platform's testing record retention policy and are reviewable by auditors and regulators. A change to authentication that has not been tested is not deployed; the absence of test records is treated as a defect in the change management process.

Test audit records support compliance demonstration. Regulators may require evidence that authentication has been tested; the test audit records provide that evidence. Test audit records are immutable, in keeping with the audit store properties documented in SYSTEM_ARCHITECTURE Section 27.5.

---

## 12. Related Documents

### 12.1 Upstream Documents

| Document | Relationship |
|---|---|
| PRODUCT_BIBLE.md Section 27 (Security Philosophy) | Product-level security posture that this document elaborates |
| PRODUCT_BIBLE.md Section 23 (Multi-Tenant Philosophy) | Multi-tenant posture that governs tenant scoping of authentication |
| PRODUCT_BIBLE.md Section 21 (Permission Philosophy) | Permission philosophy that this document complements |
| SYSTEM_ARCHITECTURE.md Section 20 (Security Architecture) | Architectural commitments that this document elaborates |
| SYSTEM_ARCHITECTURE.md Section 10 (Multi-Tenant Architecture) | Tenant isolation architecture that governs authentication's tenant scoping |
| SYSTEM_ARCHITECTURE.md Section 24 (Offline-First Architecture) | Offline architecture that governs offline authentication |
| SYSTEM_ARCHITECTURE.md Section 27 (Audit Architecture) | Audit architecture that governs authentication audit |
| ADR-004 (Multi-Tenant Strategy) | Ratifies logical multi-tenancy as default, governing authentication's tenant scoping |
| ADR-006 (Database Strategy) | Ratifies the audit store that holds authentication audit records |

### 12.2 Peer Documents

| Document | Relationship |
|---|---|
| AUTHORIZATION.md | Authorization posture; complementary to authentication |
| ROLES_AND_PERMISSIONS.md | Role catalogue and permission matrix; consumed by authentication for method selection |
| AUDIT.md | Audit posture; complementary to authentication |
| BACKUP.md | Backup posture; covers backup of authentication configuration |
| RECOVERY.md | Recovery posture; covers recovery of authentication service |
| COMPLIANCE/SECURITY_GUIDELINES.md | Comprehensive security guidelines; includes authentication guidelines |
| COMPLIANCE/HIPAA.md | HIPAA compliance; includes authentication requirements |
| COMPLIANCE/GDPR.md | GDPR compliance; includes authentication requirements for consent management |
| COMPLIANCE/PRIVACY_POLICY.md | Privacy posture; covers authentication's privacy implications |

### 12.3 Downstream Documents

| Document | Relationship |
|---|---|
| docs/07_MODULES/AUTHENTICATION (M14, future) | Module reference for the Identity & Access module, when authored |
| Cryptographic standards register | Cryptographic algorithm selection, maintained by the Office of the CISO |
| Authentication runbook | Operational procedures for authentication, maintained by the operations team |
| Authentication configuration reference | Configuration surface for authentication, maintained by the configuration team |

### 12.4 Document Maintenance

This document is maintained by the Office of the CISO and is custodied by the Security Council. The document is reviewed quarterly, with off-cycle revision when a related ADR is ratified or when a security incident reveals a gap in the document's coverage. Changes are recorded in the change log with explicit version increment; material changes are ratified through the ADR mechanism.

The document's authority is elaborative, not constitutive. It elaborates the security posture ratified in SYSTEM_ARCHITECTURE Section 20 and PRODUCT_BIBLE Section 27; where this document and either canonical reference diverge, the canonical reference prevails. The document's authority is sufficient to govern authentication decisions within the Ibn Hayan platform, subject to the canonical references' precedence.
