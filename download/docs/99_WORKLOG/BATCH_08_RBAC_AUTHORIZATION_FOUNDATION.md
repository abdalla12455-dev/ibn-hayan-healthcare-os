# Batch 8 — Canonical RBAC and Authorization Foundation

| Field | Value |
|---|---|
| Batch ID | 8 |
| Batch Title | Canonical RBAC and Authorization Foundation |
| Project | Ibn Hayan Healthcare Operating System |
| Document Type | Canonical Batch Worklog |
| Authority Level | Authoritative — Implementation Plan for Batch 8 |
| Status | In Progress |
| Owner | Office of the Chief Software Architect |
| Custodian | Backend module owner (Identity & Access) |
| Predecessor | Batch 7 (premium landing and login experience) |
| Successor | Batch 9 — Audit Primitive Foundation |
| Created | 2026-07-19 |

---

## 1. Objective

Implement the first production-grade Role-Based Access Control (RBAC) foundation for the Ibn Hayan authentication and Tenant-context implementation. This batch aligns the implementation with the canonical role catalogue ratified in `PRODUCT_BIBLE.md` Section 20, the permission philosophy ratified in `PRODUCT_BIBLE.md` Section 21, the operational role/permission policy ratified in `download/docs/09_SECURITY/ROLES_AND_PERMISSIONS.md`, the authorization posture ratified in `download/docs/09_SECURITY/AUTHORIZATION.md`, and the authentication/session strategy ratified in `download/docs/12_ADR/013_AUTHENTICATION_AND_SESSION_STRATEGY.md`.

The simplified `owner`, `member`, `viewer` role proposal in `CURRENT_IMPLEMENTATION_HANDOVER.md` is explicitly NOT implemented. That proposal conflicts with the ratified fourteen-role catalogue and is rejected by this batch's precedence rules.

The batch introduces:

1. A stable, machine-readable fourteen-role catalogue (R01 through R14).
2. A multi-role assignment model — a `TenantMembership` may carry zero or more roles simultaneously.
3. An action-level permission catalogue covering the only functionality that exists today: `context:view`, `context:select`, and `context:clear`.
4. A default-deny `AuthorizationService`, `@RequirePermission(...)` decorator, and `AuthorizationGuard` evaluated per-operation against the session, the membership, the Tenant, and the role-permission matrix.
5. Server-side enforcement on the three existing context endpoints (`GET /api/v1/context`, `PUT /api/v1/context/tenant`, `DELETE /api/v1/context/tenant`).
6. Localized role labels (Arabic and English) rendered as chips in the dashboard.
7. Updated development bootstrap that explicitly assigns R13 System Administrator to the development membership.

The batch does NOT introduce patient, appointment, billing, audit, configuration, RLS, or facility-context functionality. Those arrive in subsequent batches after Batch 9 (Audit Primitive Foundation).

---

## 2. Architectural References

The following documents are authoritative for this batch. Precedence (highest to lowest) when conflicts arise:

1. `download/docs/00_PROJECT/PRODUCT_BIBLE.md` — Sections 20 (User Roles) and 21 (Permission Philosophy).
2. `download/docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md` — Section 20.4 (Authentication and Authorization).
3. `download/docs/12_ADR/013_AUTHENTICATION_AND_SESSION_STRATEGY.md` — Accepted ADR.
4. `download/docs/09_SECURITY/ROLES_AND_PERMISSIONS.md` — Ratified elaboration.
5. `download/docs/09_SECURITY/AUTHORIZATION.md` — Ratified elaboration.
6. `download/docs/01_ARCHITECTURE/SOFTWARE_ARCHITECTURE.md` — Module structure.
7. `download/docs/01_ARCHITECTURE/CODING_STANDARDS.md` — Code conventions.
8. `CURRENT_IMPLEMENTATION_HANDOVER.md` — Implementation state (lowest precedence; the simplified `owner/member/viewer` recommendation is explicitly rejected).

The following existing implementation is the starting point:

- `apps/api/prisma/schema.prisma` — Prisma schema with `Tenant`, `Organisation`, `Facility`, `User`, `LocalCredential`, `TenantMembership`, `AuthSession`.
- `apps/api/prisma/migrations/` — Three migrations: tenancy, identity/session, session/tenant context.
- `packages/domain/src/identity/` — `User`, `TenantMembership`, `Session` domain types and repository ports.
- `packages/contracts/src/auth/` and `packages/contracts/src/context/` — Zod schemas.
- `apps/api/src/modules/auth/` — NestJS authentication module (login, session, CSRF, logout).
- `apps/api/src/modules/session-context/` — NestJS session-context module (load, select, clear).
- `apps/api/src/scripts/auth-bootstrap-dev.ts` — Development-only bootstrap command.
- `apps/web/src/app/dashboard/page.tsx` — Premium dashboard shell.

---

## 3. Current Implementation State

Before this batch, the platform implements:

- Authentication with Argon2id-hashed local credentials, server-managed opaque sessions (SHA-256 hashed), HttpOnly cookies, CSRF synchroniser tokens, login throttling, session rotation, and session revocation.
- Tenant-context selection by `TenantMembershipId` with a database-level composite foreign key that prevents a session from selecting another user's membership.
- Three context endpoints: `GET /api/v1/context`, `PUT /api/v1/context/tenant`, `DELETE /api/v1/context/tenant`.
- A bilingual (Arabic default RTL, English LTR) premium landing page, integrated login, and dashboard.

What is missing:

- No role model. The current `TenantMembership` carries no role or permission information. The domain port documentation explicitly notes that the role/permission catalogue is deferred.
- No authorization service. The context controller enforces authentication, CSRF, Origin, and ownership but does not perform a permission check; the membership-ownership check is a stand-in.
- No localized role labels in the UI.
- No development bootstrap role assignment. The bootstrap creates a membership without any role, leaving a default-deny-by-default posture that is silent.

---

## 4. Decisions

### 4.1 Decision — Reject the simplified owner/member/viewer proposal

The simplified role model in `CURRENT_IMPLEMENTATION_HANDOVER.md` is rejected. It conflicts with the ratified fourteen-role catalogue in `PRODUCT_BIBLE.md` Section 20.2 and `ROLES_AND_PERMISSIONS.md` Section 1.2. The canonical catalogue is implemented instead.

### 4.2 Decision — Multi-role assignment model

A separate `TenantRoleAssignment` model is introduced rather than placing one role directly on `TenantMembership`. This decision follows `PRODUCT_BIBLE.md` Section 20.3 ("Roles are composable; a user may hold multiple roles simultaneously, with permissions accumulating per defined rules") and `ROLES_AND_PERMISSIONS.md` Section 1.3 ("Roles are assigned to principals"). The unique constraint on `(tenantMembershipId, roleCode)` enforces that the same role is not assigned twice to the same membership.

### 4.3 Decision — Tenant-scoped roles, hierarchical scope deferred

This first slice is Tenant-scoped because the current application only has an active Tenant context. Organisation, Facility, Department, and Care-Team role scopes are deferred. The multi-role assignment model is designed so that hierarchical scope can be added later without replacing it — a future `scopeType` and `scopeId` column on `TenantRoleAssignment` (or a parallel `TenantRoleScope` table) is the natural extension point.

### 4.4 Decision — Default-deny

Every authorization check defaults to deny. A membership with no role assignments has no permissions. An unknown role code is rejected. An unknown permission is denied. The authorization service never throws an "allowed" result by accident.

### 4.5 Decision — Action-level permissions for existing functionality only

The initial permission catalogue covers only the functionality that exists today: the three context endpoints. Permissions for patient, encounter, billing, audit, configuration, and other modules are NOT invented. The catalogue is centrally defined in `packages/domain/src/authorization/permissions.ts` and `packages/domain/src/authorization/role-permissions.ts` so that adding new permissions in future batches is a single-file change.

### 4.6 Decision — R14 Integration Account is denied browser workspace context

The integration account is non-human and must not use interactive workspace-selection endpoints. The role-permission matrix assigns the three context permissions to R01 through R13 and excludes R14. A principal holding R14 plus an allowed human role receives the union of permissions.

### 4.7 Decision — Per-endpoint authorization context resolution

The `AuthorizationGuard` does not always rely on the currently active Tenant context. For `PUT /api/v1/context/tenant`, the authorization decision is evaluated against the membership being selected (the body's `membershipId`). For `DELETE /api/v1/context/tenant`, the decision is evaluated against the currently active membership. For `GET /api/v1/context`, the decision is evaluated against the user's available active memberships (no active context required). This avoids a circular requirement where selecting a Tenant requires already having that Tenant active.

### 4.8 Decision — Fail-closed migration

The Prisma migration does not grant any role to any existing membership. Existing memberships without assignments remain without permissions after migration. The development bootstrap command is updated to explicitly assign R13 System Administrator to the development membership. Operators with existing development databases must re-run the bootstrap command (or otherwise explicitly assign roles) after applying the migration.

### 4.9 Decision — Generic client-facing errors

Authorization failures return a generic 403 with the error code `AUTHORIZATION_FORBIDDEN`. The response does not reveal which membership, role, or permission caused the denial. Internal diagnostic details are logged server-side at `debug` level only; never in the response body.

### 4.10 Decision — Stable machine role codes

Authorization decisions use stable machine codes such as `R01_PHYSICIAN` and `R13_SYSTEM_ADMINISTRATOR`. The API contract may additionally expose localized display names, but the authorization layer never inspects them. Raw enum codes are not displayed in the UI.

---

## 5. Data Model

### 5.1 New model: `TenantRoleAssignment`

```
model TenantRoleAssignment {
  id                   String   @id @default(uuid()) @db.Uuid
  tenantMembershipId   String   @map("tenant_membership_id") @db.Uuid
  roleCode             String   @map("role_code") @db.VarChar(40)
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamptz

  tenantMembership     TenantMembership @relation(fields: [tenantMembershipId], references: [id], onDelete: Restrict, onUpdate: Restrict)

  @@unique([tenantMembershipId, roleCode], map: "tenant_role_assignments_membership_role_key")
  @@index([tenantMembershipId], map: "tenant_role_assignments_tenant_membership_id_idx")
  @@index([roleCode], map: "tenant_role_assignments_role_code_idx")
  @@map("tenant_role_assignments")
}
```

`TenantMembership` gains a `roleAssignments TenantRoleAssignment[]` back-relation.

The `roleCode` column is a `VarChar(40)` (the longest canonical code is `R05_ALLIED_HEALTH_PROFESSIONAL` at 29 characters; 40 leaves headroom for future custom-role codes that may include tenant prefixes).

`ON DELETE RESTRICT` is consistent with the existing persistence policy: deleting a membership with active role assignments is rejected; the caller must delete the assignments first. This prevents silent privilege loss when a membership is repurposed.

The unique constraint on `(tenantMembershipId, roleCode)` is the persistence invariant that prevents duplicate role assignments. A duplicate insert raises `PrismaClientKnownRequestError` with code `P2002`.

### 5.2 Migration behaviour

The migration:

1. Creates the `tenant_role_assignments` table.
2. Creates the unique constraint and indexes.
3. Adds the foreign key to `tenant_memberships(id)` with `ON DELETE RESTRICT`.
4. Does NOT insert any rows. Existing memberships remain without role assignments. This is the fail-closed behaviour.
5. Does NOT modify the existing `TenantMembership`, `AuthSession`, `User`, or any other table.

---

## 6. Role Catalogue

The fourteen canonical platform roles, with stable machine codes:

| Code | Stable machine code | Display name (EN) | Display name (AR) | Category |
|---|---|---|---|---|
| R01 | `R01_PHYSICIAN` | Physician | طبيب | Clinical |
| R02 | `R02_NURSE` | Nurse | ممرض/ممرضة | Clinical |
| R03 | `R03_PHARMACIST` | Pharmacist | صيدلي/صيدلانية | Clinical |
| R04 | `R04_TECHNICIAN` | Technician | فني/فنية | Clinical |
| R05 | `R05_ALLIED_HEALTH_PROFESSIONAL` | Allied Health Professional | ممارس صحي مساند | Clinical |
| R06 | `R06_RECEPTIONIST` | Receptionist | موظف استقبال | Operational |
| R07 | `R07_SCHEDULER` | Scheduler | مجدول | Operational |
| R08 | `R08_BILLER` | Biller | محاسب فواتير | Operational |
| R09 | `R09_ADMINISTRATOR` | Administrator | مدير | Operational |
| R10 | `R10_COMPLIANCE_OFFICER` | Compliance Officer | مسؤول الامتثال | Administrative |
| R11 | `R11_HR_MANAGER` | HR Manager | مدير الموارد البشرية | Administrative |
| R12 | `R12_EXECUTIVE` | Executive | تنفيذي | Administrative |
| R13 | `R13_SYSTEM_ADMINISTRATOR` | System Administrator | مسؤول النظام | Platform |
| R14 | `R14_INTEGRATION_ACCOUNT` | Integration Account | حساب التكامل | Platform |

The role catalogue is implemented as a pure TypeScript domain type in `packages/domain/src/authorization/role-catalogue.ts`. Authorization decisions use the stable machine code. Localized labels live alongside the catalogue. Customer-defined custom roles are not implemented in this batch; the catalogue is structured so that they can be added later by extending the role-code union and the role-permission matrix.

---

## 7. Initial Permission Catalogue

Action-level permissions for functionality that exists today:

| Permission code | Description |
|---|---|
| `context:view` | View the available Tenant context options and the active context for the current session. |
| `context:select` | Select a TenantMembership as the active context for the current session. |
| `context:clear` | Clear the active Tenant context for the current session. |

The permission catalogue is centrally defined in `packages/domain/src/authorization/permissions.ts`. Adding new permissions in future batches is a single-file change.

### 7.1 Initial role-permission matrix

| Role | `context:view` | `context:select` | `context:clear` |
|---|---|---|---|
| R01 Physician | ✓ | ✓ | ✓ |
| R02 Nurse | ✓ | ✓ | ✓ |
| R03 Pharmacist | ✓ | ✓ | ✓ |
| R04 Technician | ✓ | ✓ | ✓ |
| R05 Allied Health Professional | ✓ | ✓ | ✓ |
| R06 Receptionist | ✓ | ✓ | ✓ |
| R07 Scheduler | ✓ | ✓ | ✓ |
| R08 Biller | ✓ | ✓ | ✓ |
| R09 Administrator | ✓ | ✓ | ✓ |
| R10 Compliance Officer | ✓ | ✓ | ✓ |
| R11 HR Manager | ✓ | ✓ | ✓ |
| R12 Executive | ✓ | ✓ | ✓ |
| R13 System Administrator | ✓ | ✓ | ✓ |
| R14 Integration Account | – | – | – |

The matrix is centrally defined in `packages/domain/src/authorization/role-permissions.ts`.

### 7.2 Permission accumulation rules

- When a principal holds multiple roles, allowed permissions accumulate (set union).
- A membership with no assigned roles has no permissions.
- Unknown roles are denied.
- Unknown permissions are denied.
- Denial is the default for every unresolved case.

---

## 8. Authorization Evaluation Flow

The authorization sequence, in order:

1. **Valid session.** The request must carry a valid session cookie. The auth service's `getSessionFromCookie` validates the session, rotates or touches as needed, and returns the session + user + memberships. Missing/expired/revoked session → 401 `AUTH_SESSION_REQUIRED`.
2. **Active Tenant membership or explicitly targeted membership.** The guard determines which membership the authorization decision is evaluated against:
   - `GET /api/v1/context`: the user's set of active memberships (no active context required).
   - `PUT /api/v1/context/tenant`: the membership identified by the request body's `membershipId`.
   - `DELETE /api/v1/context/tenant`: the session's currently active membership.
3. **Membership belongs to the authenticated user.** Browser-supplied Tenant or membership identifiers are never trusted without server-side ownership verification. A mismatch → 403 `AUTHORIZATION_FORBIDDEN`.
4. **Membership is active.** A `suspended` membership → 403.
5. **Tenant is active.** A `suspended` Tenant → 403.
6. **Required permission is granted through one or more assigned roles.** The guard loads the membership's role assignments, computes the permission union, and checks whether the required permission is in the union. Missing permission → 403.
7. **Resource or scope constraints.** Deferred — this batch is Tenant-scoped only.

The guard's `canActivate` returns `false` for any unresolved case (default-deny). It does not throw "allow" exceptions.

---

## 9. API Changes

### 9.1 Endpoint surface

The three context endpoints are unchanged in URL and HTTP method. Their authorization is now enforced by the `AuthorizationGuard` with the `@RequirePermission(...)` decorator:

| Endpoint | Required permission | Context resolution |
|---|---|---|
| `GET /api/v1/context` | `context:view` | User's active memberships (no active context required). |
| `PUT /api/v1/context/tenant` | `context:select` | Targeted membership (request body's `membershipId`). |
| `DELETE /api/v1/context/tenant` | `context:clear` | Currently active membership. |

### 9.2 Response shape

The `ContextResponse` and `TenantMembershipSummary` shapes are extended:

- `TenantMembershipSummary` gains a `roles` array of role-summary objects `{ code, displayName }`.
- `ActiveTenantContext` gains a `roles` array of role-summary objects (the roles of the active membership).
- `TenantContextOption` gains a `roles` array of role-summary objects.

The role summary's `code` is the stable machine code (e.g. `R13_SYSTEM_ADMINISTRATOR`). The `displayName` is the localized display name; the API infers the locale from the `Accept-Language` header (defaulting to Arabic when the header is absent or unparseable, mirroring the existing Arabic-first posture).

### 9.3 Error responses

A new error code `AUTHORIZATION_FORBIDDEN` is added to `AuthErrorResponseSchema`. The error returns a generic 403 with a non-revealing message.

---

## 10. Contract Changes

### 10.1 `packages/contracts/src/authorization/`

New contract module:

- `RoleCodeSchema` — Zod enum of the fourteen stable machine codes.
- `RoleSummarySchema` — Zod object `{ code, displayName }`.
- `PermissionCodeSchema` — Zod enum of the current permission codes.
- `RoleLabelLocaleSchema` — Zod enum `'ar' | 'en'`.

### 10.2 `packages/contracts/src/auth/auth.schema.ts`

`TenantMembershipSummarySchema` gains `roles: z.array(RoleSummarySchema)`.

### 10.3 `packages/contracts/src/context/context.schema.ts`

`TenantContextOptionSchema` and `ActiveTenantContextSchema` gain `roles: z.array(RoleSummarySchema)`.

### 10.4 `packages/contracts/src/auth/auth.schema.ts`

`AuthErrorResponseSchema`'s `code` enum gains `'AUTHORIZATION_FORBIDDEN'`.

### 10.5 `packages/contracts/src/index.ts`

Re-exports the new `authorization` module.

---

## 11. Migration Plan

### 11.1 Migration file

`apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_rbac_authorization_foundation/migration.sql`

The migration is reviewed raw SQL (per ADR-012 §1.4 safeguard 3 and CODING_STANDARDS.md §14). It creates the `tenant_role_assignments` table with the unique constraint, indexes, and foreign key, and does not insert any rows.

### 11.2 Apply procedure

1. `pnpm --filter @ibn-hayan/api db:generate` — regenerate the Prisma client with the new model.
2. `pnpm --filter @ibn-hayan/api db:migrate:deploy` — apply the migration.
3. `ALLOW_DEV_AUTH_BOOTSTRAP=true DEV_AUTH_*=... pnpm --filter @ibn-hayan/api auth:bootstrap-dev` — re-run the bootstrap. The bootstrap is updated to explicitly assign R13 System Administrator to the development membership. Idempotent.

### 11.3 Existing development databases

Existing development databases that already have memberships without role assignments will remain without permissions after migration. Operators must either re-run the bootstrap command or insert explicit `tenant_role_assignments` rows for the desired memberships. The bootstrap is the recommended path because it is idempotent and auditable.

---

## 12. Test Plan

### 12.1 Database tests (`apps/api/test/database/rbac.db-spec.ts`)

- A membership can have multiple distinct role assignments.
- Duplicate assignment of the same role to the same membership fails (`P2002`).
- The same role can be assigned to different memberships.
- Invalid foreign-key assignments fail.
- `ON DELETE RESTRICT` is preserved (deleting a membership with assignments is rejected).
- Existing membership uniqueness remains intact.
- Migration applies successfully to an empty database.
- Migration applies to a database containing existing memberships without silently granting privileges.
- Loading a membership's roles returns the assigned codes.
- Loading a membership with no assignments returns an empty array.

### 12.2 Authorization unit tests (`packages/domain/src/authorization/authorization.spec.ts`)

- R01 through R13 receive the expected current context permissions.
- R14 receives no interactive context permissions.
- Multiple roles produce a permission union.
- Roleless membership is denied.
- Unknown role is denied.
- Unknown permission is denied.
- Default-deny behaviour is verified explicitly.
- The complete fourteen-role catalogue is present.
- Stable role-code serialization round-trips.
- Duplicate-role prevention is verified at the domain level.

### 12.3 Auth and context integration tests

The existing `apps/api/test/auth/auth.e2e.auth-spec.ts` and `apps/api/test/context/context.e2e.context-spec.ts` are extended:

- Login and session retrieval include role arrays.
- Development bootstrap assigns R13.
- `GET /context` is authorized correctly with and without R13.
- `PUT /context` evaluates the targeted membership's permissions.
- `DELETE /context` evaluates the active membership's permissions.
- Cross-user membership selection is denied generically (existing test, preserved).
- Suspended membership is denied.
- Inactive Tenant is denied.
- Missing session returns 401.
- Missing permission returns 403.
- CSRF and Origin checks still work (existing tests, preserved).
- Existing session rotation and logout tests still pass (existing tests, preserved).
- R14-only membership cannot use interactive workspace context endpoints.
- A principal with R14 plus an allowed human role receives the union of permissions.

### 12.4 Contract tests (`packages/contracts/src/authorization/authorization.schema.spec.ts`)

- Role codes validate.
- Role arrays validate (single-role, multi-role, empty).
- Multi-role membership responses validate.
- Unknown role codes fail schema validation.
- Permission codes validate.
- Localized role labels (Arabic, English) validate.

### 12.5 Frontend tests (`apps/web/src/app/dashboard/page.test.tsx`)

- Arabic and English role labels render.
- Multiple role chips render.
- R13 is displayed as "System Administrator" in English and "مسؤول النظام" in Arabic.
- Raw enum values (e.g. `R13_SYSTEM_ADMINISTRATOR`) are not shown.
- Existing landing, login, dashboard, context-selection, and logout tests remain green.

---

## 13. Security Considerations

- **Default-deny.** Every authorization check defaults to deny. A membership with no role assignments has no permissions. This is the structural enforcement of `AUTHORIZATION.md` Section 2.
- **No client-supplied identifiers trusted.** Browser-supplied Tenant or membership identifiers are never trusted without server-side ownership verification. The existing composite foreign key on `auth_sessions(active_tenant_membership_id, user_id)` is preserved; the new authorization layer adds an additional application-layer check.
- **No internal details leaked.** Authorization failures return a generic 403 with `AUTHORIZATION_FORBIDDEN`. Internal diagnostic details are logged at `debug` level only.
- **No real patient information or production credentials.** All test fixtures use placeholder names and email addresses under `example.invalid`.
- **No `.env` exposure.** No real environment values are read, printed, or persisted by the migration or the bootstrap. The bootstrap continues to refuse to run in production and continues to require `ALLOW_DEV_AUTH_BOOTSTRAP=true`.
- **Preserved authentication, CSRF, session rotation, context selection, Arabic RTL, and English LTR behaviour.** The existing flows are unchanged except for the addition of the authorization check.
- **No `owner/member/viewer` roles.** The simplified proposal is rejected.
- **No singular `role` column on `TenantMembership`.** The multi-role assignment model is the structural enforcement of role composability.
- **R14 denied browser workspace context.** The integration account is non-human and cannot use interactive workspace-selection endpoints.

---

## 14. Out of Scope

The following are explicitly out of scope for this batch:

- Patient, encounter, appointment, billing, inventory, audit, configuration, RLS, or facility-context functionality.
- Customer-defined custom roles.
- Hierarchical role scope (Organisation, Facility, Department, Care-Team).
- Role assignment administration UI.
- Permission administration UI.
- Audit trail persistence (Batch 9).
- Break-glass access.
- Permission override.
- Role lifecycle transitions (RC1 through RC5).
- Role-based training pathway.
- Segregation-of-duty enforcement.
- Edition-role interaction (which roles are available in which editions).
- Permission review process tooling.
- Field-level permissions.
- Record-level permissions.
- Data-scope constraints (cohort, self, etc.).
- Cross-tenant role assignment (forbidden by `ROLES_AND_PERMISSIONS.md` §1.6; not implemented because there is no cross-tenant surface today).

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Existing development databases lose all permissions after migration. | Documented in the migration notes; the bootstrap is the recommended remediation. The behaviour is fail-closed, which is the correct security posture. |
| An operator forgets to re-run the bootstrap after migration. | The bootstrap is idempotent and safe to re-run. The dashboard displays "no roles assigned" for a roleless membership, making the misconfiguration visible. |
| The authorization guard adds latency to every context request. | The role-assignment lookup is a single indexed query. The permission union is computed in memory. The added latency is one round-trip per context request, which is acceptable. |
| A future batch introduces a permission that the current matrix does not account for. | The matrix is centrally defined; adding a permission is a single-file change. Tests verify the matrix's completeness against the role catalogue. |
| A future batch needs hierarchical role scope. | The multi-role assignment model is structured so that scope can be added later without replacing it. |
| The Arabic labels are wrong or inconsistent with the canonical references. | The labels are reviewed against `ROLES_AND_PERMISSIONS.md` Section 2 and `PRODUCT_BIBLE.md` Section 20.2. The contract tests verify that both Arabic and English labels validate. |
| The R14-only principal is inadvertently granted context permissions through a future matrix change. | The matrix is explicit: R14 has no row in the context-permission columns. The unit tests verify R14 denial. Any future change that adds a context permission to R14 must update the matrix and the tests, making the change visible in review. |

---

## 16. Acceptance Criteria

Batch 8 is complete only when:

- The canonical R01–R14 catalogue is represented in code.
- A membership supports multiple simultaneous roles.
- No `owner/member/viewer` role model exists.
- No singular `role` column is added to `TenantMembership`.
- Permissions are assigned through roles only.
- Authorization is default-deny.
- Context endpoints enforce permissions server-side.
- Target-context selection does not depend on an already-active context.
- Contracts expose role arrays.
- The dashboard displays localized roles.
- Existing authentication, CSRF, session, Tenant-isolation, Arabic, and English behaviour is preserved.
- Migration and database tests pass.
- Type checking, linting, unit tests, integration tests, and build pass.
- Documentation and worklog are updated.
- A meaningful local commit is created.

---

## 17. Definition of Done

- [ ] Step 1 — This worklog document is written and checked against canonical references.
- [ ] Step 2 — The fourteen-role catalogue is defined as pure TypeScript domain types.
- [ ] Step 3 — The `TenantRoleAssignment` Prisma model and migration are created.
- [ ] Step 4 — The domain layer is updated (ports, multi-role, default-deny) with unit tests.
- [ ] Step 5 — Shared contracts are updated (role arrays, Zod schemas, tests).
- [ ] Step 6 — The initial permission catalogue is centrally defined.
- [ ] Step 7 — `AuthorizationService`, `@RequirePermission`, and `AuthorizationGuard` are implemented.
- [ ] Step 8 — Controller integration applies authorization to the three context endpoints.
- [ ] Step 9 — The development bootstrap explicitly assigns R13.
- [ ] Step 10 — The dashboard displays localized role chips in Arabic and English.
- [ ] Step 11 — Database, authorization unit, auth/context integration, contract, and frontend tests are added.
- [ ] Step 12 — All validation commands pass.
- [ ] Step 13 — Prisma schema comments, code comments, `worklog.md`, and this worklog document are updated.
- [ ] Step 14 — A single local commit `Implement canonical RBAC authorization foundation` is created.
- [ ] The next required platform batch is recorded as `Batch 9 — Audit Primitive Foundation`.

---

## 18. Next Batch

The next required platform batch is:

**Batch 9 — Audit Primitive Foundation**

Audit must be implemented before any patient, encounter, appointment, billing, inventory, or other consequential business module is exposed. Batch 9 will introduce the audit-event primitive, the audit store, and the audit-emission hooks at every authorization decision point introduced by this batch.
