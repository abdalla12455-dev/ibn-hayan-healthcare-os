# ADR-013: Authentication and Session Strategy
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-013: Authentication and Session Strategy |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Accepted Decision |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review when MFA, OIDC, or SAML is ready for ratification, when the session-store technology is changed, or when a stateless session strategy is reconsidered |
| Audience | Senior software architects, security council, backend module owners, frontend module owners, identity and access management owners, compliance officers, audit owners |
| Scope | The decision to ratify server-managed opaque sessions (not long-lived browser JWTs), cookie configuration, server-side session-record contents, Argon2id password hashing, audit-event emission for authentication and session lifecycle, the separation of authentication from authorisation, the per-operation verification requirements for protected API operations, tenant-context verification rules, CSRF protection, rate limiting and progressive login throttling, and the deferral of MFA, OIDC, and SAML to future implementation phases. This ADR governs the authentication boundary implemented in `apps/api` and consumed by `apps/web` per ADR-012. |
| Out of Scope | Specific session-store technology selection (deferred to implementation), MFA implementation details (deferred to a future ADR), OIDC and SAML integration details (deferred to a future ADR), the specific Argon2id parameter values (centrally configured and versioned, not hardcoded in this ADR), the specific rate-limit thresholds (centrally configured), the specific CSRF-token implementation (any standards-compliant approach is acceptable) |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md`, `09_SECURITY/AUTHENTICATION.md`, `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, or `09_SECURITY/AUDIT.md` is resolved in favour of the canonical spine until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR or an explicit version increment of this ADR, recorded in the platform CHANGELOG |

> **Document Purpose:** This ADR ratifies the authentication and session strategy for the Ibn Hayan canonical implementation. Browser authentication uses server-managed opaque sessions, not long-lived browser JWTs. Session identifiers are stored only in cookies configured with HttpOnly, Secure (outside local development), SameSite protection, explicit expiry and rotation, and narrow path and domain scope. Server-side session records carry user identity, tenant identity, active organisation and facility context, creation and expiry timestamps, last-activity timestamp, revocation status, and security metadata required for investigation. Password hashing uses Argon2id with centrally configured parameters. Authentication and authorisation are separate: authentication establishes identity; authorisation evaluates permissions and scope. Every protected API operation independently verifies valid session, tenant membership, organisation/facility scope, required permission, and resource ownership or scope constraints. Tenant context is never trusted solely from browser-supplied input. CSRF protection is mandatory for state-changing browser requests. Rate limiting and progressive login throttling are mandatory at the authentication boundary. MFA, OIDC, and SAML are future-compatible requirements but are not implemented in the first vertical slice. No real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 4 (Architectural Principles — P1 Healthcare First, P13 Auditability), Section 10 (Multi-Tenant Architecture), Section 11 (Organization Hierarchy), Section 12 (Clinic Hierarchy), Section 20 (Security Architecture), Section 27 (Audit Architecture). `SOFTWARE_ARCHITECTURE.md` Section 7 (Cross-Cutting Concerns).

> **Related Product Bible Sections:** `PRODUCT_BIBLE.md` Section 5 (Core Principles — P-1 Healthcare First), Section 6 (Design Principles — D-10 Observable, Auditable, Accountable), Section 27 (Security Philosophy).

> **Related Security Documents:** `09_SECURITY/AUTHENTICATION.md`, `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, `09_SECURITY/AUDIT.md`. This ADR ratifies the implementation-grade decisions; the security documents remain the authoritative narrative references. Where this ADR and the security documents conflict, the security documents prevail until amended through the Architecture Council.

> **Related ADRs:** ADR-004 (Multi-Tenant Strategy — informs tenant membership verification), ADR-006 (Database Strategy — the session store and audit store are governed by ADR-006's per-category selection model), ADR-012 (Application Platform and Repository Structure — accepted concurrently; ratifies the application structure in which this authentication strategy is implemented).

> **Predecessor:** None. **Supersedes:** None. **Superseded by:** None.

> This Architectural Decision Record (ADR) documents a significant architectural decision made for the Ibn Hayan Healthcare Operating System. ADRs are immutable historical records — once a decision is superseded, a successor ADR is created rather than editing this one in place.

---

## Table of Contents

1. Decision Statement
2. Context
3. Alternatives Considered
4. Consequences
5. Status
6. Future Notes

---

## 1. Decision Statement

### 1.1 The Decision

Browser authentication for the Ibn Hayan canonical implementation uses server-managed opaque sessions. Session identifiers are stored only in cookies configured with HttpOnly, Secure (outside local development), SameSite protection, explicit expiry and rotation, and narrow path and domain scope where applicable. Long-lived browser-stored JWTs are rejected as the primary authentication mechanism.

Server-side session records include user identity, tenant identity, active organisation and facility context where selected, creation and expiry timestamps, last-activity timestamp, revocation status, and security metadata required for investigation without storing raw secrets. Session records are stored server-side; the browser holds only the opaque session identifier in a cookie. The session-store technology selection is deferred to implementation and is governed by ADR-006's per-category selection model; the session store is conceptually a cache or transactional concern depending on the chosen implementation, and the choice does not alter this ADR's commitments.

Password hashing uses Argon2id with centrally configured parameters. The parameters (memory cost, time cost, parallelism) are centrally configured and versioned; they are not hardcoded in this ADR as architectural identity. Parameter changes are recorded in the platform CHANGELOG and are governed by the security council.

Login, logout, session creation, session rotation, failed login attempts, context changes (organisation or facility selection), and session revocation emit audit events. Audit events are emitted through `packages/observability` and are recorded in the audit store. Audit events include actor, action, timestamp, tenant context, session identifier (not the session secret), request metadata (IP address, user agent), and outcome (success or failure). Audit events do not include passwords, session secrets, or any credential material.

Authentication and authorisation are separate concerns. Authentication establishes identity; authorisation evaluates permissions and scope. Organisation or facility selection does not grant access by itself; selection only narrows the scope of subsequent authorisation decisions. A user who selects an organisation to which they do not belong has not gained access; the selection is rejected server-side.

Every protected API operation must independently verify: a valid session; tenant membership; organisation or facility scope where applicable; the required permission for the operation; and resource ownership or scope constraints. The verification is performed server-side at the API boundary; it is not delegated to the client. The verification is performed for every operation, not just for the first operation in a session. A session that is valid for one operation is re-verified for the next operation; no "trust the session once and skip verification" optimisation is permitted.

Tenant context must never be trusted solely from a browser-supplied header, route parameter, form field, or cookie value. Tenant context is established server-side from the authenticated session; any browser-supplied tenant identifier is treated as untrusted input and is verified against the session's tenant membership before use. This rule applies to every API operation that touches tenant-scoped data.

CSRF protection is mandatory for state-changing browser requests. The CSRF protection mechanism is implementation-defined (any standards-compliant approach is acceptable: double-submit cookie, synchroniser token, same-site cookie with strict origin checking, or signed token); the requirement is that state-changing browser requests are CSRF-protected from the first slice.

Rate limiting and progressive login throttling are mandatory at the authentication boundary. Rate limiting applies to login attempts, password-reset requests, and any other authentication-surface endpoint. Progressive login throttling increases the delay or rejection probability for repeated failed attempts from the same source. The specific thresholds are centrally configured; the requirement is that throttling is present from the first slice.

MFA (multi-factor authentication), OIDC (OpenID Connect), and SAML (Security Assertion Markup Language) are future-compatible requirements but are not implemented in the first vertical slice. The authentication architecture in this ADR is designed to accommodate MFA, OIDC, and SAML as future extensions without re-architecture. When MFA, OIDC, or SAML is ready for ratification, a future ADR will specify the implementation.

No real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests. Development and test environments use synthesised data only. Production credentials are never used outside production. This rule is binding on every engineer, every contributor, and every environment.

### 1.2 Scope of Application

The decision binds every engineer, every contributor, and every implementation step that touches the authentication boundary, the session lifecycle, the password-storage mechanism, the authorisation verification chain, the tenant-context propagation, the CSRF protection, or the rate-limiting surface. It governs the implementation in `apps/api` (where the authoritative verification chain runs) and the consumption in `apps/web` (where the session cookie is presented). It governs the audit-event emission for authentication and session lifecycle through `packages/observability`. It governs the test fixtures and seed data in `packages/testing` (which must use synthesised data only).

The decision does not commit the specific session-store technology (in-memory, Redis, PostgreSQL-backed, or another store); that selection is deferred to implementation and is governed by ADR-006's per-category selection model. The decision does not commit the specific Argon2id parameter values; those are centrally configured and versioned. The decision does not commit the specific rate-limit thresholds; those are centrally configured. The decision does not commit the specific CSRF-token implementation; any standards-compliant approach is acceptable.

### 1.3 Session-Record Shape

The server-side session record includes the following fields. The exact storage representation is implementation-defined, but the record must carry all of the following:

| Field | Description |
|---|---|
| User identity | The authenticated user's identifier. |
| Tenant identity | The tenant to which the user belongs. |
| Active organisation context | The organisation currently selected by the user, where applicable. May be unset. |
| Active facility context | The facility currently selected by the user, where applicable. May be unset. |
| Creation timestamp | When the session was created. |
| Expiry timestamp | When the session expires. |
| Last-activity timestamp | When the session was last used. Updated on each operation. |
| Revocation status | Whether the session has been revoked. |
| Security metadata | Metadata required for investigation without storing raw secrets: IP address at creation, IP address at last activity, user agent at creation, user agent at last activity, authentication method used (password, future MFA, future OIDC, future SAML), failed-attempt count if any. |

The session record does not include the password, the password hash, the session secret, or any credential material. The session identifier stored in the browser cookie is a separate, opaque, high-entropy value that references the session record; it is not the session record itself.

### 1.4 Per-Operation Verification Chain

Every protected API operation must independently verify the following, in order, before the operation's business logic runs:

| Step | Verification | Failure Outcome |
|---|---|---|
| 1 | Valid session | 401 Unauthorized if the session is missing, expired, or revoked. |
| 2 | Tenant membership | 403 Forbidden if the session's user does not belong to the session's tenant. |
| 3 | Organisation or facility scope | 403 Forbidden if the operation requires an organisation or facility scope and the user does not have the required scope. |
| 4 | Required permission | 403 Forbidden if the user does not have the required permission for the operation. |
| 5 | Resource ownership or scope constraints | 403 Forbidden if the resource being accessed is not owned by or scoped to the user's current context. |

The verification chain runs server-side at the API boundary. It is not delegated to the client. It is not cached across operations. Each operation's verification is independent. A session that is valid for one operation is re-verified for the next operation.

### 1.5 Tenant-Context Verification Rule

Tenant context is established server-side from the authenticated session. Any browser-supplied tenant identifier — whether in a header, a route parameter, a form field, or a cookie value — is treated as untrusted input. The server verifies that the supplied tenant identifier matches the session's tenant identity and that the user belongs to that tenant before using the tenant identifier in any query, authorisation decision, or audit event. A mismatch is logged as a security event and is rejected with 403 Forbidden.

This rule exists because the canonical implementation is multi-tenant (per ADR-004). Tenant isolation depends on the server enforcing the tenant boundary at every operation. Trusting browser-supplied tenant context would allow a user to access another tenant's data by changing a header or a route parameter. The rule is binding on every API operation that touches tenant-scoped data.

### 1.6 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — authentication architecture is foundational; reversal requires re-architecting the session lifecycle, the audit trail, and the authorisation chain |
| Cost of Wrong Decision | Critical — wrong choice produces PHI exposure, regulatory non-compliance, or audit-trail gaps |
| Affected Layers | Platform Services Layer (authentication, authorisation), Domain Layer (permission checks), Data Layer (tenant-scoped queries), Cross-cutting (audit emission, observability) |
| Affected Principles | P1 (Healthcare First), P10 (Multi-Tenancy), P13 (Auditability) |
| ADR Required | Yes — this ADR |

### 1.7 Decision Boundaries

This ADR ratifies the authentication and session strategy. It does not ratify the specific session-store technology, the specific Argon2id parameters, the specific rate-limit thresholds, the specific CSRF-token implementation, or the specific MFA / OIDC / SAML technologies. Those are implementation decisions or future ADRs. This ADR does not perform implementation work; it authorises and bounds the implementation. The implementation must respect every commitment in this ADR; the implementation may choose any concrete technology that satisfies the commitments.

---

## 2. Context

### 2.1 The Authentication-Foundation Problem

The Ibn Hayan canonical spine (`09_SECURITY/AUTHENTICATION.md`, `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, `09_SECURITY/AUDIT.md`) describes the authentication, authorisation, and audit architecture in narrative form. Before any application code can be written, the Architecture Council must ratify the implementation-grade authentication strategy: server-managed sessions vs browser JWTs, cookie configuration, session-record contents, password hashing, the separation of authentication from authorisation, the per-operation verification chain, tenant-context verification, CSRF protection, rate limiting, and the deferral of MFA / OIDC / SAML. Without these ratifications, engineers would make ad-hoc authentication choices that accumulate as security debt and that may conflict with the canonical spine's commitments. This ADR closes that gap by ratifying the minimum authentication foundation required for the first vertical slice.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Healthcare-first security | Principle P1 (Healthcare First) requires the platform to treat patient safety and data protection as the highest priority. Authentication is the primary control preventing unauthorised access to PHI; it must be server-managed and auditable. |
| Multi-tenancy | ADR-004 ratifies multi-tenancy as the default delivery model. Authentication must establish tenant identity; authorisation must verify tenant membership at every operation. Browser-supplied tenant context is untrusted. |
| Auditability | Principle P13 (Auditability as Primitive) requires every consequential authentication and session event to be recorded in the audit trail. The audit trail must include actor, action, timestamp, tenant context, and outcome, without including credential material. |
| Revocability | Server-managed sessions can be revoked server-side immediately. Long-lived browser JWTs cannot be revoked without a server-side revocation list, which negates the stateless advantage that motivated JWTs in the first place. |
| CSRF protection | State-changing browser requests must be CSRF-protected. The authentication strategy must be compatible with CSRF protection from the first slice. |
| Rate-limiting | Authentication surfaces are the primary target for credential-stuffing and brute-force attacks. Rate limiting and progressive throttling must be present from the first slice. |
| Decade-horizon viability | Principle P18 requires the platform to remain viable for ten or more years. The authentication architecture must accommodate MFA, OIDC, and SAML as future extensions without re-architecture. |
| Implementation readiness | The implementation-readiness audit identified authentication as a critical foundation. This ADR ratifies the minimum authentication foundation required for the first vertical slice. |

### 2.3 Constraints Bounding the Decision

The decision is bounded by several explicit constraints inherited from upstream authority. `09_SECURITY/AUTHENTICATION.md` describes the authentication approach in narrative form; this ADR ratifies the implementation-grade decisions that satisfy the narrative. `09_SECURITY/AUTHORIZATION.md` describes the authorisation approach; this ADR ratifies the per-operation verification chain that implements it. `09_SECURITY/ROLES_AND_PERMISSIONS.md` describes the role catalogue and permission model; this ADR ratifies that the required-permission check is part of the per-operation verification chain. `09_SECURITY/AUDIT.md` describes the audit architecture; this ADR ratifies that authentication and session lifecycle events emit audit entries. ADR-004 ratifies multi-tenancy; this ADR ratifies the tenant-context verification rule. These constraints are binding on every alternative evaluated in Section 3.

### 2.4 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md`, `09_SECURITY/AUTHENTICATION.md`, `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, `09_SECURITY/AUDIT.md`, and ADRs 001 through 011. Where this ADR ratifies a specific implementation decision, the decision is an implementation choice that satisfies the architectural commitment of the upstream authority; it does not amend the upstream authority.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Long-lived browser JWTs

**Description:** Use long-lived JWTs stored in the browser (in cookies, localStorage, or sessionStorage) as the primary authentication mechanism. The server verifies the JWT signature on each request and trusts the JWT's claims without server-side session lookup.

**Verdict:** Rejected. Long-lived browser JWTs have three critical disadvantages for a healthcare platform. First, JWTs cannot be revoked server-side without a server-side revocation list, which negates the stateless advantage that motivated JWTs in the first place. A healthcare platform must be able to revoke sessions immediately (on user logout, on password change, on security incident, on role change). Second, JWTs carry claims that may become stale (tenant membership, organisation scope, permissions); the server either trusts stale claims (a security risk) or re-verifies them server-side on each request (negating the stateless advantage). Third, JWTs in localStorage are vulnerable to XSS exfiltration; JWTs in cookies require the same careful cookie configuration that server-managed sessions require, with no advantage. Server-managed opaque sessions avoid all three disadvantages at the cost of a server-side session lookup per request, which is a negligible cost for a healthcare platform.

### 3.2 Alternative B — Stateless sessions with server-side revocation list

**Description:** Use signed stateless session tokens (similar to JWTs but custom) with a server-side revocation list. Sessions are stateless by default; revoked sessions are checked against the list.

**Verdict:** Rejected. The revocation list negates the stateless advantage for revoked sessions, and the revocation list must be checked on every request to ensure revocation is immediate. The result is a system that has the complexity of both stateless and stateful sessions, with the disadvantages of both. Server-managed opaque sessions are simpler, more auditable, and more revocable.

### 3.3 Alternative C — Defer authentication to a future ADR

**Description:** Do not ratify authentication in an ADR; let engineers choose at implementation time.

**Verdict:** Rejected. Authentication is security-critical and is required for the first vertical slice. The canonical spine's principle P13 (Auditability as Primitive) and the architectural commitment that "no architectural decision is implemented until it is documented" require that authentication be ratified by ADR before implementation. Deferring authentication to implementation time would produce ad-hoc choices that accumulate as security debt.

### 3.4 Alternative D — bcrypt or PBKDF2 instead of Argon2id

**Description:** Use bcrypt or PBKDF2 for password hashing instead of Argon2id.

**Verdict:** Rejected for the first implementation. Argon2id is the password-hashing competition winner (2015) and is the recommended choice for new systems. bcrypt remains acceptable but is older and is less resistant to GPU-based attacks. PBKDF2 is acceptable but is less resistant to specialized hardware attacks. Argon2id is ratified as the initial choice; the parameters are centrally configured and may be updated without re-architecting. A future ADR may ratify a different algorithm if Argon2id's security profile changes; the repository-interface pattern (in this case, a password-hasher interface) ensures the replacement is bounded.

### 3.5 Alternative E — Trust tenant context from a header for performance

**Description:** Allow the browser to supply tenant context via a header for performance, and trust the header without server-side verification on each request.

**Verdict:** Rejected. This violates ADR-004's multi-tenant strategy and the canonical spine's commitment to tenant isolation. The performance cost of server-side tenant-membership verification is negligible (a single indexed lookup per request); the security cost of trusting browser-supplied tenant context is catastrophic (a user can access another tenant's data by changing a header). The rule is binding: tenant context is established server-side from the authenticated session; browser-supplied tenant identifiers are untrusted input.

### 3.6 Alternative F — Skip CSRF protection for JSON-only APIs

**Description:** Skip CSRF protection because the API accepts only JSON requests, and browsers do not send custom-content-type cross-origin requests without a preflight.

**Verdict:** Rejected. CSRF protection is mandatory for state-changing browser requests, regardless of content type. The "JSON-only APIs are immune to CSRF" claim is a common misconception; there are edge cases (form submissions with content-type `text/plain`, certain browser quirks) that allow cross-origin state-changing requests. The cost of CSRF protection is low (any standards-compliant approach is acceptable); the security cost of skipping it is high. The rule is binding from the first slice.

### 3.7 Alternative G — Implement MFA, OIDC, and SAML in the first slice

**Description:** Implement MFA, OIDC, and SAML from the first slice.

**Verdict:** Rejected for the first slice. MFA, OIDC, and SAML are valuable but are not required for the first vertical slice. Implementing them in the first slice would expand the slice's scope and would delay the architectural validation that the slice is meant to provide. The authentication architecture in this ADR is designed to accommodate MFA, OIDC, and SAML as future extensions without re-architecture. When MFA, OIDC, or SAML is ready for ratification, a future ADR will specify the implementation.

### 3.8 Alternative H — Use real production credentials in development

**Description:** Use a copy of the production database or production credentials in development to make debugging easier.

**Verdict:** Rejected. No real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests. This rule is binding on every engineer, every contributor, and every environment. The rule exists to prevent PHI exposure through development environments and to prevent production-credential compromise through development environments. Development and test environments use synthesised data only.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Server-side revocation | Server-managed sessions can be revoked server-side immediately. A user who logs out, changes their password, or is the subject of a security incident has their session revoked at the next operation. |
| Audit-trail completeness | Every authentication and session lifecycle event emits an audit entry. The audit trail includes actor, action, timestamp, tenant context, and outcome, without including credential material. |
| Tenant-isolation enforcement | Tenant context is established server-side from the authenticated session. Browser-supplied tenant identifiers are untrusted. The per-operation verification chain re-verifies tenant membership on every operation. |
| Separation of authentication and authorisation | Authentication establishes identity; authorisation evaluates permissions and scope. The separation is structural — authentication and authorisation are different modules, different audit events, and different verification steps. |
| Per-operation verification | Every protected API operation independently verifies session, tenant membership, scope, permission, and resource ownership. No "trust the session once and skip verification" optimisation is permitted. |
| CSRF protection from day one | State-changing browser requests are CSRF-protected from the first slice. |
| Rate limiting from day one | Rate limiting and progressive login throttling are present at the authentication boundary from the first slice. |
| Future-compatible with MFA, OIDC, SAML | The authentication architecture accommodates MFA, OIDC, and SAML as future extensions without re-architecture. The session-record shape and the per-operation verification chain are designed to carry MFA, OIDC, and SAML authentication methods when they are ratified. |
| No PHI in development | No real patient data or production credentials are used in development, seeds, demonstrations, screenshots, or tests. Development and test environments use synthesised data only. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Server-side session lookup per request | Every protected API operation performs a server-side session lookup. The cost is negligible (a single indexed lookup), but it is a cost. Stateless alternatives would avoid this cost, but the revocation and audit benefits of server-managed sessions outweigh the cost. |
| Session-store technology is deferred | The specific session-store technology is deferred to implementation. Engineers must choose a session-store technology that satisfies the session-record shape in Section 1.3 and the audit-event requirements in Section 1.1. The choice is bounded but is not made in this ADR. |
| No MFA, OIDC, or SAML in the first slice | The first slice uses password authentication only. MFA, OIDC, and SAML are deferred to future ADRs. The first slice's security posture is acceptable for a development or staging environment but may require MFA before production deployment. |
| No stateless horizontal scaling in the first slice | Server-managed sessions require either a shared session store or session-affinity for horizontal scaling. The first slice may use a single API instance; horizontal scaling is a deployment-topology concern deferred to a future ADR. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Cookie-based session identifier | The session identifier is stored in a cookie. This is a neutral consequence; cookies are the standard mechanism for browser session management and are compatible with the canonical spine's accessibility and localisation commitments. |
| Argon2id as the password hasher | Argon2id is the password-hashing competition winner and is the recommended choice for new systems. This is a neutral consequence; bcrypt and PBKDF2 remain acceptable alternatives, and a future ADR may ratify a different algorithm. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This ADR was accepted by the Architecture Council on
2026-07-18. The decision is authoritative and binding on all downstream
documentation and on the first implementation. Any future change or
reversal requires a superseding ADR accepted through the Architecture
Council.

### 5.2 Accepted Decision Conditions

The following conditions form part of the accepted decision:

- The Council confirms that browser authentication uses server-managed opaque sessions, not long-lived browser JWTs.
- The Council confirms that session identifiers are stored only in cookies configured with HttpOnly, Secure (outside local development), SameSite protection, explicit expiry and rotation, and narrow path and domain scope where applicable.
- The Council confirms that server-side session records include user identity, tenant identity, active organisation and facility context where selected, creation and expiry timestamps, last-activity timestamp, revocation status, and security metadata required for investigation without storing raw secrets.
- The Council confirms that password hashing uses Argon2id with centrally configured parameters.
- The Council confirms that login, logout, session creation, session rotation, failed login attempts, context changes, and session revocation emit audit events.
- The Council confirms that authentication and authorisation are separate: authentication establishes identity; authorisation evaluates permissions and scope; organisation or facility selection does not grant access by itself.
- The Council confirms that every protected API operation must independently verify valid session, tenant membership, organisation or facility scope, required permission, and resource ownership or scope constraints.
- The Council confirms that tenant context must never be trusted solely from a browser-supplied header, route parameter, form field, or cookie value without server-side membership verification.
- The Council confirms that CSRF protection is mandatory for state-changing browser requests.
- The Council confirms that rate limiting and progressive login throttling are mandatory at the authentication boundary.
- The Council confirms that MFA, OIDC, and SAML are future-compatible requirements but are not implemented in the first vertical slice.
- The Council confirms that no real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests.

### 5.3 Implementation Triggers

Upon acceptance, the following implementation work is authorised (but not performed by this ADR):

- **Session-store selection:** Choose a session-store technology that satisfies the session-record shape in Section 1.3. The choice is bounded by ADR-006's per-category selection model; the session store is conceptually a cache or transactional concern depending on the chosen implementation.
- **Argon2id parameter configuration:** Establish centrally configured Argon2id parameters (memory cost, time cost, parallelism). The parameters are versioned and are recorded in the platform CHANGELOG when changed.
- **Cookie configuration:** Establish the cookie configuration that satisfies Section 1.1. The configuration must be present from the first slice.
- **Per-operation verification chain:** Implement the per-operation verification chain in `apps/api`. The chain must run server-side at the API boundary and must run for every protected operation.
- **Tenant-context verification:** Implement the tenant-context verification rule in `apps/api`. Browser-supplied tenant identifiers must be verified against the session's tenant membership before use.
- **CSRF protection:** Implement CSRF protection for state-changing browser requests. Any standards-compliant approach is acceptable.
- **Rate limiting:** Implement rate limiting and progressive login throttling at the authentication boundary. The specific thresholds are centrally configured.
- **Audit-event emission:** Emit audit events for login, logout, session creation, session rotation, failed login attempts, context changes, and session revocation through `packages/observability`.
- **Synthesised test data:** Establish synthesised test data in `packages/testing`. No real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests.
- **Future ADRs:** Draft a future ADR for MFA, a future ADR for OIDC, and a future ADR for SAML when each is ready for ratification.

---

## 6. Future Notes

### 6.1 Triggers for Future ADRs

| Future ADR | Trigger |
|---|---|
| MFA ADR | When the first slice is stable in production and MFA is required for compliance or for customer demand. |
| OIDC ADR | When a customer or a deployment requires external identity via OpenID Connect. |
| SAML ADR | When a customer or a deployment requires external identity via SAML (common in enterprise healthcare). |
| Session-store technology ADR | When the session-store technology choice becomes consequential enough to warrant ADR ratification (e.g., when horizontal scaling requires a shared session store). |
| Password-hashing parameter update ADR | When Argon2id parameters are updated materially (not for routine tuning). |

### 6.2 Open Questions for Future ADRs

| Question | Description |
|---|---|
| MFA mechanism | When MFA is ratified, will it be TOTP, SMS, hardware keys, WebAuthn, or a combination? |
| OIDC provider integration | When OIDC is ratified, which providers will be supported, and how will tenant mapping work? |
| SAML provider integration | When SAML is ratified, which IdPs will be supported, and how will tenant mapping work? |
| Session-store technology | When the session-store technology is ratified, will it be in-memory (single-instance only), Redis, PostgreSQL-backed, or another store? |
| Session-affinity vs shared store | When horizontal scaling is ratified, will the deployment use session-affinity (simpler) or a shared session store (more flexible)? |

### 6.3 Relationship to Other ADRs

| ADR | Relationship |
|---|---|
| ADR-001 (Configuration-Driven Architecture) | Compatible. Authentication parameters (Argon2id parameters, rate-limit thresholds, session-expiry durations) are configuration data governed by ADR-001's configuration framework. |
| ADR-002 (Modular Architecture) | Compatible. Authentication and authorisation are separate bounded contexts (or separate modules within a single bounded context); the separation is structural. |
| ADR-003 (Local-First Strategy) | Compatible. The session-record shape and the audit-event requirements are compatible with a future local-first substrate. The local-first substrate will require its own session-reconciliation logic, which is a future ADR. |
| ADR-004 (Multi-Tenant Strategy) | Compatible. Tenant context is established server-side from the authenticated session; tenant membership is verified at every operation. This ADR implements ADR-004's tenant-isolation commitment at the authentication boundary. |
| ADR-005 (UI Design Philosophy) | Compatible. The login screen and any session-management UI are thin clients consuming the authentication API contracts. |
| ADR-006 (Database Strategy) | Compatible. The session store and the audit store are governed by ADR-006's per-category selection model. The session store is conceptually a cache or transactional concern; the audit store is conceptually an audit-store concern. |
| ADR-007 (Feature Flags Packaging) | Independent. Authentication and feature flags are unrelated concerns. |
| ADR-008 (No Façade Modules; Reception as Workflow) | Independent. |
| ADR-009 (Subscriptions as Billing Capability) | Independent. |
| ADR-010 (Inventory BC and Module Packaging) | Independent. |
| ADR-012 (Application Platform and Repository Structure) | Compatible. ADR-012 is accepted concurrently and ratifies the application structure in which this authentication strategy is implemented. The authentication boundary lives in `apps/api`; the session cookie is presented by `apps/web`; the audit events are emitted through `packages/observability`. |

### 6.4 Security Review Cadence

The authentication and session strategy is subject to security review at the following cadences:

| Cadence | Trigger |
|---|---|
| On amendment | When this ADR is amended or superseded. |
| On dependency update | When a security-relevant dependency (Argon2 library, session library, CSRF library, rate-limit library) is updated materially. |
| On incident | When a security incident affects authentication, sessions, or authorisation. |
| Annual review | A scheduled annual review of the authentication strategy, including Argon2id parameters, rate-limit thresholds, session-expiry durations, and CSRF configuration. |

### 6.5 No Real Patient Data or Production Credentials

This rule is repeated here for emphasis because of its criticality. No real patient data or production credentials may be used in development, seeds, demonstrations, screenshots, or tests. This rule is binding on every engineer, every contributor, and every environment. Violations are security incidents and are reported to the security council. The rule is not a recommendation; it is a condition of the accepted decision.

---

> **End of ADR-013.** This ADR is an accepted decision record. Implementation work authorised by this ADR is performed in separate phases per the implementation sequence; this ADR does not perform that work. Future ADRs are required for MFA, OIDC, SAML, and session-store technology selection.
