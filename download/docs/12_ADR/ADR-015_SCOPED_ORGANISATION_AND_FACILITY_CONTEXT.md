# ADR-015: Scoped Organisation and Facility Context
## Ibn Hayan Healthcare Operating System — Architectural Decision Record

| Field | Value |
|---|---|
| Document Title | ADR-015: Scoped Organisation and Facility Context |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Architecture Decision Record |
| Authority Level | Authoritative — Accepted Decision |
| Version | 1.0.0 |
| Status | Accepted |
| Owner | Architecture Council |
| Custodian | Office of the Chief Software Architect |
| Review Cadence | On amendment; mandatory review when a Department or Care-Team scope level is proposed, when cross-tenant Platform Super Admin authorisation is implemented, when a context-impersonation or administrative-override capability is proposed, or when row-level security policies supersede application-layer scope verification |
| Audience | Senior software architects, security council, backend module owners, frontend module owners, identity and access management owners, compliance officers, audit owners |
| Scope | The decision to ratify scoped role assignments at tenant, organisation, and facility levels; an active organisation context and an active facility context on the server-side session record; server-authoritative scope verification at every protected operation; the explicit rejection of tenant-membership-as-facility-access; and the separation of Clinic Admin scoped authorisation from Platform Super Admin cross-tenant authorisation. |
| Out of Scope | Department and Care-Team scope levels (deferred to a future ADR), customer-defined custom roles (deferred to a future ADR), cross-tenant Platform Super Admin authorisation (deferred to a future ADR), row-level security policies (deferred to a dedicated RLS batch), context-impersonation or administrative-override capabilities (deferred to a future ADR), the Clinic Admin Overview screen (deferred), the Platform Super Admin Overview screen (deferred), and a shared navigation shell between Clinic Admin and Platform Super Admin (deferred). |
| Conflict Resolution | `SYSTEM_ARCHITECTURE.md` prevails over this ADR. Any conflict between this ADR and `SYSTEM_ARCHITECTURE.md`, `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, `09_SECURITY/AUTHENTICATION.md`, ADR-004 (Multi-Tenant Strategy), ADR-013 (Authentication and Session Strategy), or ADR-014 (Audit Store and Integrity Strategy) is resolved in favour of the canonical spine until either document is amended through the Architecture Council. |
| Amendment Mechanism | Architecture Council ratification through a successor ADR or an explicit version increment of this ADR, recorded in the platform CHANGELOG |

> **Document Purpose:** This ADR ratifies the scoped-organisation-and-facility-context model for the Ibn Hayan canonical implementation. Role assignments are explicitly scoped to tenant, organisation, or facility. The server-side session record carries an active organisation context and an active facility context, both nullable, both server-verified, and both subject to cascade-clearing invariants when a higher-level context is changed or cleared. Browser-supplied organisation and facility identifiers are untrusted input and are verified server-side at every protected operation. The unsafe rule "a user may select any facility merely because it belongs to their active tenant" is explicitly rejected: facility access requires an explicit organisation-scoped or facility-scoped role assignment. Tenant membership alone does not grant access to every organisation or facility under that tenant. R14 Integration Account is non-interactive and receives no browser context-selection capability. Clinic Admin scoped authorisation is structurally separated from Platform Super Admin cross-tenant authorisation; this batch implements the Clinic Admin scoped surface only.

> **Related Architecture Sections:** `SYSTEM_ARCHITECTURE.md` Section 10 (Multi-Tenant Architecture), Section 11 (Organization Hierarchy), Section 12 (Clinic Hierarchy), Section 20 (Security Architecture). `SOFTWARE_ARCHITECTURE.md` Section 7 (Cross-Cutting Concerns). `MODULE_ARCHITECTURE.md` Section 2 (Module Catalogue — M14 Identity & Access).

> **Related Product Bible Sections:** `PRODUCT_BIBLE.md` Section 20 (Roles & Permissions), Section 21 (Authorization Model), Section 27 (Security Philosophy).

> **Related Security Documents:** `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, `09_SECURITY/AUTHENTICATION.md`. This ADR ratifies the implementation-grade decisions; the security documents remain the authoritative narrative references.

> **Related ADRs:** ADR-004 (Multi-Tenant Strategy — informs tenant boundary enforcement), ADR-006 (Database Strategy — composite foreign keys are PostgreSQL-native raw SQL supplements), ADR-012 (Application Platform and Repository Structure — domain isolation and reviewed raw SQL safeguards), ADR-013 (Authentication and Session Strategy — §1.3 session record shape includes active organisation and facility context; §1.4 per-operation verification chain includes organisation or facility scope; §1.5 tenant-context verification rule extends to organisation and facility), ADR-014 (Audit Store and Integrity Strategy — context-selection and context-clearing events are audited through the transactional outbox).

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

The Ibn Hayan canonical implementation ratifies explicit scope on every role assignment. A role assignment may be scoped at one of three levels: **tenant**, **organisation**, or **facility**. The scope level is persisted on the assignment row alongside the existing `(tenantMembershipId, roleCode)` pair, and the assignment carries the scope-target identifier when the scope level is `organisation` or `facility`. Existing `TenantRoleAssignment` rows — which were tenant-scoped by implication in Batch 8 — are migrated to explicit `tenant` scope with no scope-target; their behaviour is unchanged. The role-permission matrix in `packages/domain/src/authorization/role-permissions.ts` continues to grant permissions by role code; scope narrows *where* a permission may be exercised, not *whether* the role grants it.

The server-side `AuthSession` record (ratified by ADR-013 §1.3) is extended with two nullable columns: `active_organisation_id` and `active_facility_id`. Both are nullable: a null value means "no active context at this level"; the session remains valid. The active organisation, when set, must belong to the active tenant; the active facility, when set, must belong to the active organisation and the active tenant. The session's active tenant membership continues to be the root of the context chain (ratified by Batch 5 and unchanged by this ADR). Selecting a new tenant clears the active organisation and the active facility. Selecting a new organisation clears the active facility when the facility does not belong to the newly selected organisation. Clearing the tenant clears the organisation and the facility. Clearing the organisation clears the facility. A facility cannot remain active without a valid active organisation and tenant.

Browser-supplied organisation and facility identifiers — whether in a header, a route parameter, a form field, a cookie value, or a JSON body — are untrusted input. The server verifies at every protected operation that the supplied identifier matches the session's active context, that the underlying row exists, that it belongs to the session's active tenant (for an organisation) or active organisation and active tenant (for a facility), and that the authenticated principal holds an applicable scoped role assignment for the selected organisation or facility. A mismatch is logged as a security audit event and rejected with a generic 403 Forbidden response that does not reveal whether the supplied identifier exists for another user, another tenant, or another organisation. Cross-tenant and cross-organisation selections return the same generic 403; the response does not reveal which condition failed.

**The unsafe rule "a user may select any facility merely because it belongs to their active tenant" is explicitly rejected.** Tenant membership establishes that a user may operate within a tenant; it does not establish that the user may operate within every organisation or every facility under that tenant. R09 Administrator facility access must come from an explicit organisation-scoped or facility-scoped role assignment. A user who is a member of Tenant T and who holds no organisation-scoped or facility-scoped assignment may not select any organisation or facility under T; the user operates only at tenant scope. This is the structural enforcement of the least-privilege principle: the default facility set is empty, not "all facilities under the tenant".

The active organisation context and active facility context are session-specific. Different sessions for the same user have independent contexts. The active context is not shared across sessions; it is not denormalised onto the user row; it is not cached in browser storage. Context selection is by organisation identifier or facility identifier supplied by the client, validated server-side, and verified against the session's existing active context chain. The client may not select an organisation or facility by its display name, slug, or any property other than its stable UUID identifier.

R14 Integration Account is non-interactive and receives no browser context-selection capability. The role-permission matrix in `packages/domain/src/authorization/role-permissions.ts` already denies R14 the `context:view`, `context:select`, and `context:clear` permissions; this ADR extends the denial to the new `context:select_organisation`, `context:clear_organisation`, `context:select_facility`, and `context:clear_facility` permissions. An R14 principal may not invoke any context-selection endpoint; the authorisation guard rejects the request before any business logic runs.

Clinic Admin scoped authorisation and Platform Super Admin cross-tenant authorisation are structurally separated. This batch implements the Clinic Admin scoped surface only: tenant, organisation, and facility context selection for R01 through R13 human principals operating within their own tenant. Platform Super Admin cross-tenant authorisation — where a Platform Super Admin operating on the separate Platform Super Admin surface may administrate across tenants — is deferred to a future ADR and is not implemented in this batch. The `AuthorisationGuard` does not acquire any cross-tenant capability in this batch; the default-deny posture is preserved for every cross-tenant attempt.

The framework-agnostic contracts live in `packages/contracts` per ADR-012. The `ContextResponse`, `TenantContextOption`, and `ActiveTenantContext` schemas are extended with organisation and facility fields. New request schemas are added for `PUT /api/v1/context/organisation`, `DELETE /api/v1/context/organisation`, `PUT /api/v1/context/facility`, and `DELETE /api/v1/context/facility`. The contracts continue to use `.strict()` so that adding an unexpected field at any boundary is rejected by the Zod parse. The contracts never include `passwordHash`, `token`, `tokenHash`, `csrfHash`, or any credential material.

Audit events are emitted for every context-selection and context-clearing operation through the transactional outbox pattern ratified by ADR-014. The audit action-code catalogue in `packages/observability/src/audit/action-codes.ts` is extended with four new codes: `organisation_context.selected`, `organisation_context.cleared`, `facility_context.selected`, and `facility_context.cleared`. A new audit category `organisation_context` and `facility_context` is added. The audit metadata includes the endpoint name and the scope level; it does not include the organisation display name, the facility display name, any PHI, or any secret. The existing `tenant_context.viewed` audit event continues to be emitted by `GET /api/v1/context`; the response now also carries organisation and facility fields, but the viewed event's metadata does not change.

### 1.2 Scope of Application

The decision binds every engineer, every contributor, and every implementation step that touches the role-assignment persistence model, the session-record shape, the context-selection endpoints, the context-clearing endpoints, the authorisation guard, the audit emission for context lifecycle, or the dashboard's organisation and facility selectors. It governs the implementation in `apps/api` (where the authoritative verification chain runs), in `packages/contracts` (where the framework-agnostic context contracts live), in `packages/domain` (where the role-assignment domain model and the role-permission matrix live), in `packages/observability` (where the audit action-code catalogue lives), and in `apps/web` (where the dashboard's context selectors are rendered).

The decision does not commit Department or Care-Team scope levels (deferred). The decision does not commit customer-defined custom roles (deferred). The decision does not commit cross-tenant Platform Super Admin authorisation (deferred). The decision does not commit row-level security policies (deferred to a dedicated RLS batch). The decision does not commit the Clinic Admin Overview screen, the Platform Super Admin Overview screen, or a shared navigation shell (deferred). The decision does not commit context-impersonation or administrative-override capabilities (deferred).

### 1.3 Database Model Chosen

The chosen database model extends the existing `tenant_role_assignments` table with two nullable columns and adds two nullable columns to `auth_sessions`. No new tables are introduced. The model preserves every existing tenant, organisation, and facility boundary by reusing the existing primary and foreign keys.

**`tenant_role_assignments` extension:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `scope_level` | `VARCHAR(20)` NOT NULL DEFAULT `'tenant'` | No | One of `'tenant'`, `'organisation'`, `'facility'`. A CHECK constraint enforces the catalogue. |
| `scope_organisation_id` | `UUID` | Yes | Required when `scope_level = 'organisation'` or `scope_level = 'facility'`. Must be null when `scope_level = 'tenant'`. A CHECK constraint enforces the implication. |
| `scope_facility_id` | `UUID` | Yes | Required when `scope_level = 'facility'`. Must be null otherwise. A CHECK constraint enforces the implication. |

The existing unique constraint on `(tenant_membership_id, role_code)` is replaced with a unique constraint on `(tenant_membership_id, role_code, scope_level, scope_organisation_id, scope_facility_id)`. This permits the same role to be assigned at multiple scope levels (e.g. R09 at tenant scope and R09 at facility scope) without conflict, while preventing duplicate assignments at the same scope. PostgreSQL treats `NULL` as distinct in a unique index, which would defeat the constraint for tenant-scoped rows; the migration therefore replaces the unique index with a partial unique index per scope level (one partial index where `scope_level = 'tenant'` and `scope_organisation_id IS NULL` and `scope_facility_id IS NULL`, one where `scope_level = 'organisation'` and `scope_facility_id IS NULL`, one where `scope_level = 'facility'`). This is the structural enforcement of "no duplicate assignments at the same scope" at the database level.

A composite foreign key `tenant_role_assignments(scope_organisation_id, tenant_membership_id)` is not directly expressible because the membership does not carry `tenant_id`. The application layer therefore validates, before insertion, that the supplied `scope_organisation_id` belongs to the same tenant as the membership; a single-column foreign key `tenant_role_assignments.scope_organisation_id` → `organisations.id` with `ON DELETE RESTRICT` is the structural backstop. The same approach is used for `scope_facility_id` → `facilities.id` with `ON DELETE RESTRICT`. The application layer additionally verifies, before insertion, that the facility belongs to the organisation when both are supplied.

**`auth_sessions` extension:**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `active_organisation_id` | `UUID` | Yes | Null means "no active organisation context". |
| `active_facility_id` | `UUID` | Yes | Null means "no active facility context". |

Single-column foreign keys `auth_sessions.active_organisation_id` → `organisations.id` and `auth_sessions.active_facility_id` → `facilities.id` are added with `ON DELETE RESTRICT`. A composite foreign key `auth_sessions(active_organisation_id, user_id)` → `organisations(id, …)` is not directly expressible because `organisations` does not carry `user_id`; instead, the application layer validates that the supplied organisation belongs to the session's active tenant before persisting. A CHECK constraint `active_facility_id IS NULL OR active_organisation_id IS NOT NULL` enforces at the database level that a facility cannot be active without an active organisation. A composite foreign key `auth_sessions(active_facility_id, active_organisation_id)` → `facilities(id, organisation_id)` is added as reviewed raw SQL because Prisma 7 cannot express composite foreign keys; it enforces at the database level that the active facility belongs to the active organisation.

**Why this model preserves tenant, organisation, and facility boundaries:**

1. The tenant boundary is preserved by the existing `tenant_memberships(tenantId, userId)` unique constraint and the existing composite foreign key `auth_sessions(active_tenant_membership_id, user_id)` → `tenant_memberships(id, user_id)`. No new cross-tenant path is introduced.

2. The organisation boundary is preserved by the single-column foreign key `auth_sessions.active_organisation_id` → `organisations.id` (the organisation must exist) plus the application-layer check that the organisation's `tenantId` matches the active membership's `tenantId`. A buggy or malicious application-layer call that supplies an organisation from a different tenant is rejected by the application-layer check; the database constraint is the structural backstop for organisation existence.

3. The facility boundary is preserved by the composite foreign key `auth_sessions(active_facility_id, active_organisation_id)` → `facilities(id, organisation_id)` (the facility must belong to the active organisation) plus the application-layer check that the facility's `tenantId` matches the active tenant. The composite foreign key is the structural backstop for the facility-to-organisation relationship; the application-layer check is the structural backstop for the facility-to-tenant relationship (the existing `facilities.tenantId` column makes the latter check a single indexed lookup).

4. The role-assignment scope boundary is preserved by the CHECK constraints on `scope_level`, `scope_organisation_id`, and `scope_facility_id`, plus the single-column foreign keys to `organisations.id` and `facilities.id`, plus the application-layer validation that the scope target belongs to the membership's tenant (and, for facility scope, to the supplied organisation).

5. The cascade-clearing invariants are enforced at the application layer: the context-selection service performs the cascading clears in the same Prisma transaction as the selection. The database CHECK constraint `active_facility_id IS NULL OR active_organisation_id IS NOT NULL` is the structural backstop that prevents a facility from remaining active without an organisation.

### 1.4 Interaction with the Existing TenantRoleAssignment Model

The existing `TenantRoleAssignment` model (ratified by Batch 8) is preserved. Existing rows are migrated by the migration's `UPDATE` statement: every existing row receives `scope_level = 'tenant'`, `scope_organisation_id = NULL`, `scope_facility_id = NULL`. The migration is forward-only; no down migration is provided. The migration does not insert any new rows. The migration does not modify the existing `(tenant_membership_id, role_code)` data; it only adds the scope columns and backfills the default scope level.

The existing `TenantRoleAssignmentRepository` port is extended with two new methods: `listForMembershipAtOrganisation(membershipId, organisationId)` and `listForMembershipAtFacility(membershipId, facilityId)`. The existing `listForMembership(membershipId)` method continues to return all assignments for the membership regardless of scope; the authorisation layer interprets the result by filtering on scope level. The `create` method is extended to accept the scope fields; the existing single-role-assignment creation path (tenant scope) is preserved for backward compatibility with the development bootstrap command.

The role-permission matrix in `packages/domain/src/authorization/role-permissions.ts` is unchanged. The matrix grants permissions by role code; scope narrows where the permission may be exercised. A principal with R09 at tenant scope may exercise R09 permissions at tenant scope; a principal with R09 at organisation scope may exercise R09 permissions at organisation scope; a principal with R09 at facility scope may exercise R09 permissions at facility scope. The authorisation guard consults both the role-permission matrix (does the role grant the permission?) and the scope level (does the scope match the request's target scope?).

### 1.5 Separation from Platform Super Admin Authorisation

Platform Super Admin is a separate product surface consumed by R13 System Administrator operating in their platform-administration capacity. The Platform Super Admin surface authorises cross-tenant operations: a Platform Super Admin may administrate tenants, organisations, and facilities across the entire platform, not just within their own tenant membership.

This batch implements the Clinic Admin scoped surface only. The authorisation guard does not acquire any cross-tenant capability. The existing default-deny posture is preserved for every cross-tenant attempt: a request that targets an organisation or facility outside the session's active tenant is rejected with a generic 403, regardless of the principal's role assignments. The `AuthorisationGuard` does not consult Platform Super Admin authorisation in this batch; that capability is deferred to a future ADR.

The R13 role continues to be a tenant-scoped role assignment in this batch. An R13 principal operating within their tenant membership may select organisations and facilities within that tenant, subject to the same scope rules as R09. The R13 principal does not acquire cross-tenant capability through this batch.

### 1.6 Decision Properties

| Property | Value |
|---|---|
| Reversibility | Low — scoped role assignments and active context columns are foundational; reversal requires re-architecting the role-assignment model, the session-record shape, and the context-selection flow |
| Cost of Wrong Decision | Critical — wrong choice produces cross-tenant data exposure, cross-organisation data leakage, or audit-trail gaps |
| Affected Layers | Platform Services Layer (authorisation, session-context), Domain Layer (role-assignment model, scope-filtered authorisation), Data Layer (composite foreign keys, CHECK constraints, partial unique indexes), Cross-cutting (audit emission) |
| Affected Principles | P1 (Healthcare First), P10 (Multi-Tenancy), P13 (Auditability), least-privilege |
| ADR Required | Yes — this ADR |

### 1.7 Decision Boundaries

This ADR ratifies the scoped-context model. It does not ratify the specific Clinic Admin Overview design (deferred to the Design Bible), the specific Platform Super Admin Overview design (deferred to the Design Bible), the Department or Care-Team scope levels (deferred to a future ADR), the customer-defined custom-role catalogue (deferred), the cross-tenant Platform Super Admin authorisation model (deferred), or the row-level security policy set (deferred). Those are implementation decisions or future ADRs. This ADR does not perform implementation work; it authorises and bounds the implementation. The implementation must respect every commitment in this ADR; the implementation may choose any concrete technology that satisfies the commitments.

---

## 2. Context

### 2.1 The Scoped-Context Problem

ADR-013 §1.3 ratifies that the server-side session record includes "active organisation context" and "active facility context" where selected. ADR-013 §1.4 ratifies that the per-operation verification chain includes "organisation or facility scope where applicable". Batch 5 implemented active tenant context only; organisation and facility context were deferred. Batch 8 implemented tenant-scoped role assignments; organisation-scoped and facility-scoped assignments were deferred.

The deferral is no longer tenable. R09 Administrator principals must be able to operate at organisation or facility scope: a clinic administrator for Hospital A's cardiology facility should not automatically hold administrator authority over Hospital A's dermatology facility, and should not automatically hold administrator authority over every facility under the tenant. The current model — where R09 is tenant-scoped and grants the same permission set across every organisation and facility under the tenant — violates the least-privilege principle and conflicts with ADR-013 §1.4's "organisation or facility scope where applicable" verification step.

This ADR closes the gap by ratifying the scoped-context model: explicit scope on every role assignment, active organisation and facility context on the session, server-authoritative scope verification, and the explicit rejection of tenant-membership-as-facility-access.

### 2.2 Forces Driving the Decision

| Force | Description |
|---|---|
| Least-privilege | A principal should hold the minimum scope required to perform their duties. Tenant-wide R09 is overbroad for a principal whose duties are confined to one facility. |
| Healthcare-first security | Principle P1 (Healthcare First) requires the platform to treat patient safety and data protection as the highest priority. Cross-facility data exposure is a patient-safety risk. |
| Multi-tenancy and multi-organisation | ADR-004 ratifies multi-tenancy; the tenancy foundation (Batch 3) ratifies organisations and facilities as the second and third hierarchy levels. The authorisation model must respect every level. |
| Auditability | Principle P13 (Auditability as Primitive) requires every consequential context-selection event to be recorded. The audit trail must include the selected scope without including PHI or secrets. |
| ADR-013 §1.4 compliance | The per-operation verification chain explicitly requires "organisation or facility scope where applicable" as step 3. Without scoped context, step 3 is a no-op. |
| Forward compatibility | Department and Care-Team scope levels are future requirements. The model must accommodate them without re-architecture. The `scope_level` enumeration is designed to be extended. |
| Implementation readiness | The implementation-readiness audit identified scoped context as the next production slice. The tenancy, identity, session, RBAC, and audit foundations are in place; scoped context is the next increment. |

### 2.3 Constraints Bounding the Decision

The decision is bounded by several explicit constraints inherited from upstream authority. ADR-013 §1.3 requires the session record to carry active organisation and facility context. ADR-013 §1.4 requires the per-operation verification chain to verify organisation or facility scope. ADR-013 §1.5 requires browser-supplied tenant context to be verified server-side; this ADR extends the rule to organisation and facility context. ADR-004 ratifies multi-tenancy; this ADR ratifies that tenant membership does not automatically grant organisation or facility access. The role-permission matrix in `packages/domain/src/authorization/role-permissions.ts` is the canonical source of permission grants; this ADR does not modify the matrix, only the scope at which a granted permission may be exercised. ADR-014 requires context-selection events to be audited through the transactional outbox; this ADR extends the audit action-code catalogue with the new context-selection events. These constraints are binding on every alternative evaluated in Section 3.

### 2.4 Upstream Authority

This ADR operates under the authority of `SYSTEM_ARCHITECTURE.md`, `09_SECURITY/AUTHORIZATION.md`, `09_SECURITY/ROLES_AND_PERMISSIONS.md`, `09_SECURITY/AUTHENTICATION.md`, `09_SECURITY/AUDIT.md`, and ADRs 001 through 014. Where this ADR ratifies a specific implementation decision, the decision is an implementation choice that satisfies the architectural commitment of the upstream authority; it does not amend the upstream authority.

---

## 3. Alternatives Considered

### 3.1 Alternative A — Tenant-membership-as-facility-access

**Description:** Allow a user to select any facility that belongs to their active tenant. The authorisation guard checks only tenant membership; organisation and facility scope are not enforced.

**Verdict:** Rejected. This is the unsafe rule that this ADR explicitly rejects. Tenant membership establishes that a user may operate within a tenant; it does not establish that the user may operate within every organisation or facility under that tenant. A principal whose duties are confined to one facility would gain authority over every facility under the tenant, violating the least-privilege principle and producing cross-facility data exposure. The rule is binding: facility access requires an explicit organisation-scoped or facility-scoped role assignment.

### 3.2 Alternative B — Separate OrganisationRoleAssignment and FacilityRoleAssignment tables

**Description:** Instead of extending `tenant_role_assignments` with scope columns, create two new tables: `organisation_role_assignments` and `facility_role_assignments`. Each table carries its own foreign key to `organisations.id` or `facilities.id`.

**Verdict:** Rejected. The two-table approach duplicates the role-assignment model three times (tenant, organisation, facility), triplicates the role-permission matrix consultation, and complicates the authorisation guard (which must consult three tables in parallel). The single-table approach with a `scope_level` discriminator is simpler, preserves the existing `TenantRoleAssignment` domain type, and accommodates future scope levels (Department, Care-Team) by extending the enumeration rather than adding a fourth table.

### 3.3 Alternative C — Store active context in browser localStorage

**Description:** Persist the active organisation and facility in the browser's localStorage. The server trusts the browser-supplied context on every request.

**Verdict:** Rejected. This violates ADR-013 §1.5 (browser-supplied context is untrusted) and is incompatible with the existing security posture. The active context must be server-side; the browser holds only an opaque session identifier in an HttpOnly cookie. The existing `ContextResponse` contract returns the active context to the browser for display only; the browser does not supply the active context back to the server.

### 3.4 Alternative D — Single active context column (one of tenant, organisation, or facility)

**Description:** Replace the three active-context columns (`active_tenant_membership_id`, `active_organisation_id`, `active_facility_id`) with a single `active_context_type` and `active_context_id` pair.

**Verdict:** Rejected. The single-column approach loses the cascade-clearing invariants: a facility cannot remain active without an organisation, and an organisation cannot remain active without a tenant. The three-column approach with a CHECK constraint enforces the cascade at the database level. The single-column approach would require application-layer enforcement of every cascade, which is more fragile.

### 3.5 Alternative E — Implement cross-tenant Platform Super Admin authorisation in this batch

**Description:** Implement cross-tenant Platform Super Admin authorisation alongside the scoped-context model.

**Verdict:** Rejected for this batch. Cross-tenant Platform Super Admin authorisation is a separate concern with its own scope, its own audit events, and its own threat model. Combining it with scoped context would expand the batch's scope and would delay the architectural validation that the batch is meant to provide. The scoped-context model is designed to accommodate cross-tenant Platform Super Admin authorisation as a future extension without re-architecture; the authorisation guard's context-resolution mode is designed to be extended.

### 3.6 Alternative F — Trust the role-permission matrix to enforce scope

**Description:** Add scope-specific permissions to the role-permission matrix (e.g. `context:select_facility_at_organisation_scope`) instead of using a scope discriminator on the assignment.

**Verdict:** Rejected. The role-permission matrix grants permissions by role code; scope is orthogonal to permission. A principal with R09 at tenant scope and R09 at facility scope holds the same R09 permissions in both cases; the scope narrows where the permission may be exercised, not whether the role grants it. Adding scope-specific permissions would explode the matrix's cardinality (14 roles × 3 scope levels × N permissions) and would couple the role-permission matrix to the scope model, which is a separation-of-concerns violation.

---

## 4. Consequences

### 4.1 Positive Consequences

| Consequence | Description |
|---|---|
| Least-privilege enforcement | A principal's authority is confined to the scope at which their role is assigned. A facility-scoped R09 cannot exercise R09 permissions at another facility under the same organisation, at another organisation under the same tenant, or at another tenant. |
| ADR-013 §1.4 compliance | The per-operation verification chain's "organisation or facility scope where applicable" step is now a real check, not a no-op. |
| Cascade-clearing invariants | Selecting a new tenant clears the active organisation and facility; selecting a new organisation clears the active facility when the facility does not belong to it; clearing the tenant clears the organisation and the facility; clearing the organisation clears the facility. The invariants are enforced at the application layer and backed by a database CHECK constraint for the facility-without-organisation case. |
| Audit-trail completeness | Every context-selection and context-clearing event emits an audit entry through the transactional outbox. The audit trail includes the selected scope without including PHI or secrets. |
| Forward compatibility | The `scope_level` enumeration is designed to be extended. Department and Care-Team scope levels can be added by extending the enumeration and the CHECK constraint, without re-architecting the model. |
| Separation from Platform Super Admin | The Clinic Admin scoped surface is structurally separated from Platform Super Admin cross-tenant authorisation. The default-deny posture is preserved for every cross-tenant attempt. |
| R14 denial | R14 Integration Account is non-interactive and receives no browser context-selection capability. The role-permission matrix denies R14 the new context permissions. |
| Existing tenant-scoped assignments preserved | Existing `TenantRoleAssignment` rows are migrated to explicit `tenant` scope with no scope-target. Their behaviour is unchanged. |

### 4.2 Negative Consequences

| Consequence | Description |
|---|---|
| Migration required | The migration adds columns to `tenant_role_assignments` and `auth_sessions`, replaces the unique index with three partial unique indexes, and adds CHECK constraints and foreign keys. The migration is forward-only and reviewed. |
| Application-layer scope verification | The database constraints are the structural backstop, but the application layer must verify scope before every protected operation. The verification is a single indexed lookup per scope level; the cost is negligible but non-zero. |
| No cross-tenant Platform Super Admin | The Platform Super Admin surface remains tenant-scoped in this batch. Cross-tenant administration is deferred. |
| No Department or Care-Team scope | The model accommodates future scope levels but does not implement them. Department-scoped and Care-Team-scoped assignments are deferred. |

### 4.3 Neutral Consequences

| Consequence | Description |
|---|---|
| Three active-context columns on `auth_sessions` | The session record carries three nullable active-context columns. This is a neutral consequence; the columns are nullable and the cascade-clearing invariants are enforced. |
| `scope_level` enumeration on `tenant_role_assignments` | The assignment row carries a scope-level discriminator. This is a neutral consequence; the discriminator is a stable machine-readable string. |

---

## 5. Status

### 5.1 Current Status

**Accepted.** This ADR was accepted by the Architecture Council on
2026-07-22. The decision is authoritative and binding on all downstream
documentation and on the implementation. Any future change or
reversal requires a superseding ADR accepted through the Architecture
Council.

### 5.2 Accepted Decision Conditions

The following conditions form part of the accepted decision:

- The Council confirms that role assignments may be explicitly scoped to tenant, organisation, or facility.
- The Council confirms that existing tenant-scoped role assignments remain valid and are migrated as tenant-scoped with no scope-target.
- The Council confirms that the server-side session record carries an active organisation context and an active facility context, both nullable, both server-verified.
- The Council confirms that selecting a new tenant clears the active organisation and the active facility; selecting a new organisation clears the active facility when the facility does not belong to it; clearing the tenant clears the organisation and the facility; clearing the organisation clears the facility.
- The Council confirms that browser-supplied organisation and facility identifiers are untrusted input and are verified server-side at every protected operation.
- The Council confirms that the unsafe rule "a user may select any facility merely because it belongs to their active tenant" is explicitly rejected.
- The Council confirms that R09 facility access requires an explicit organisation-scoped or facility-scoped role assignment.
- The Council confirms that R14 Integration Account is non-interactive and receives no browser context-selection capability.
- The Council confirms that Clinic Admin scoped authorisation is structurally separated from Platform Super Admin cross-tenant authorisation; cross-tenant authorisation is deferred.
- The Council confirms that context-selection and context-clearing events are audited through the transactional outbox.
- The Council confirms that the default-deny permission posture is preserved.

### 5.3 Implementation Triggers

Upon acceptance, the following implementation work is authorised (but not performed by this ADR):

- **Database migration:** Add `scope_level`, `scope_organisation_id`, and `scope_facility_id` to `tenant_role_assignments`; add `active_organisation_id` and `active_facility_id` to `auth_sessions`; replace the unique index with three partial unique indexes; add CHECK constraints and foreign keys.
- **Domain model extension:** Extend the `TenantRoleAssignment` domain type with scope fields; extend the `Session` domain type with active organisation and facility fields; extend the `TenantRoleAssignmentRepository` port with scope-filtered read methods and a scope-aware create method.
- **Contracts extension:** Extend the `ContextResponse`, `TenantContextOption`, and `ActiveTenantContext` schemas with organisation and facility fields; add request schemas for the new context-selection endpoints.
- **Authorisation service extension:** Extend the authorisation service with scope-filtered authorisation methods; extend the authorisation guard with scope-aware context-resolution modes.
- **Session-context service extension:** Extend the session-context service with organisation and facility selection, clearing, and cascade enforcement; emit audit events for every context-selection and context-clearing operation.
- **Dashboard extension:** Add organisation and facility selectors to the existing authenticated dashboard; preserve the existing secure behaviour; do not persist context or protected data in localStorage.
- **Tests:** Add tests covering legacy tenant-scoped role-assignment migration, organisation-scoped assignment, facility-scoped assignment, unauthorised facility rejection, cross-tenant rejection, cross-organisation rejection, selection and clearing cascades, R09 organisation/facility scope, R14 denial, session context persistence, audit events, contracts, dashboard organisation selector, dashboard facility selector, and Arabic RTL and English LTR behaviour.

---

## 6. Future Notes

### 6.1 Triggers for Future ADRs

| Future ADR | Trigger |
|---|---|
| Department and Care-Team scope ADR | When department-level or care-team-level scoping is required for clinical workflows. |
| Cross-tenant Platform Super Admin authorisation ADR | When the Platform Super Admin surface requires cross-tenant administration capability. |
| Customer-defined custom roles ADR | When customer-defined custom roles are required to compose existing permissions. |
| Row-level security ADR | When RLS policies supersede application-layer scope verification for tenant-scoped data. |
| Context-impersonation ADR | When an administrative-override capability is required for support or investigation. |

### 6.2 Forward-Compatibility Notes

The `scope_level` enumeration is designed to be extended. Adding `department` or `care_team` requires extending the CHECK constraint, extending the domain type, extending the repository port, and extending the authorisation guard. The migration is additive; no existing row is modified.

The active-context columns on `auth_sessions` are designed to be extended. Adding `active_department_id` requires a nullable column, a foreign key, and a CHECK constraint that the department belongs to the active facility. The cascade-clearing invariants are extended accordingly.

The authorisation guard's context-resolution mode is designed to be extended. Adding `for-targeted-organisation` or `for-targeted-facility` modes (for future organisation-administration or facility-administration endpoints) requires extending the `AuthorizationContextMode` union and adding the corresponding branch in the guard's `canActivate` method.

The audit action-code catalogue is designed to be extended. Adding `department_context.selected` and `department_context.cleared` requires extending the `CONTEXT_ACTION_CODES` tuple and the `inferCategoryFromAction` function.
