/**
 * TenantRoleAssignment domain model.
 *
 * A TenantRoleAssignment is a link between a TenantMembership and a
 * canonical platform role code. A TenantMembership may carry zero or
 * more role assignments; the assignments accumulate permissions per
 * the role-permission matrix in `role-permissions.ts`.
 *
 * Per PRODUCT_BIBLE.md Section 20.3, roles are composable: a
 * principal may hold multiple roles simultaneously. The
 * `TenantRoleAssignment` model is the structural expression of
 * composability: instead of placing one role directly on
 * `TenantMembership`, each assignment is its own row, and a
 * membership may have many.
 *
 * Per ROLES_AND_PERMISSIONS.md Section 1.6, roles are tenant-scoped.
 * The tenant scoping is enforced structurally: every
 * `TenantRoleAssignment` references a `TenantMembership`, which in
 * turn references exactly one `Tenant`. A cross-tenant role
 * assignment is therefore impossible at the data-model level.
 *
 * Per the eighth canonical batch specification:
 * - The simplified `owner`, `member`, `viewer` role proposal in
 *   `CURRENT_IMPLEMENTATION_HANDOVER.md` is rejected. The canonical
 *   fourteen-role catalogue (R01 through R14) is the only supported
 *   role model.
 * - Customer-defined custom roles are not implemented in this batch.
 *   The `roleCode` field is typed as a `PlatformRoleCode` so that
 *   future custom roles require a coordinated extension.
 * - Hierarchical scope (Organisation, Facility, Department,
 *   Care-Team) is deferred. The first slice is Tenant-scoped because
 *   the current application only has an active Tenant context.
 * - The persistence invariant `(tenantMembershipId, roleCode)`
 *   unique prevents duplicate role assignments. A duplicate insert
 *   raises a Prisma `PrismaClientKnownRequestError` with code
 *   `P2002`.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context):
 * - The `TenantRoleAssignment` model gains four new fields:
 *   `tenantId` (required `TenantId`, derived server-side from the
 *   referenced `TenantMembership`), `scopeLevel` ('tenant' |
 *   'organisation' | 'facility'), `scopeOrganisationId` (nullable
 *   `OrganisationId`), and `scopeFacilityId` (nullable
 *   `FacilityId`).
 * - `tenantId` is derived server-side from the referenced
 *   `TenantMembership`. It MUST NOT be supplied by the caller. The
 *   persistence layer loads the membership, derives the tenantId,
 *   and persists it on the assignment row. The persisted tenantId
 *   is the structural anchor for the composite foreign keys that
 *   enforce tenant, organisation, and facility consistency at the
 *   database level.
 * - The scope level narrows where a granted permission may be
 *   exercised, not whether the role grants it. The role-permission
 *   matrix in `role-permissions.ts` continues to grant permissions
 *   by role code; scope is orthogonal to permission.
 * - Per ADR-015 §1.5 (Scope-authorisation semantics), a generic
 *   tenant-scoped assignment for R01-R12 does NOT grant access to
 *   every organisation or facility under the tenant. Only an R13
 *   System Administrator assignment at tenant scope grants
 *   tenant-wide organisation and facility selection. Legacy R09
 *   tenant-scoped rows may remain stored for migration
 *   compatibility, but they do NOT authorise organisation or
 *   facility context selection until explicitly reassigned at
 *   organisation or facility scope.
 * - The original unique constraint on
 *   `(tenantMembershipId, roleCode)` is replaced by three partial
 *   unique indexes (one per scope level) because PostgreSQL treats
 *   NULL as distinct in a unique index. The partial indexes are the
 *   structural enforcement of "no duplicate assignments at the same
 *   scope".
 * - Three CHECK constraints (added by the migration) enforce the
 *   scope-target implications: tenant scope implies both scope
 *   target IDs are null; organisation scope implies the
 *   organisation ID is non-null and the facility ID is null;
 *   facility scope implies both scope target IDs are non-null.
 * - Composite foreign keys (added by the migration) enforce at the
 *   database level that:
 *   - the assignment's `(tenantMembershipId, tenantId)` matches a
 *     `tenant_memberships(id, tenant_id)` row (membership and
 *     assignment tenant IDs must match);
 *   - when `scopeOrganisationId` is populated, the assignment's
 *     `(tenantId, scopeOrganisationId)` matches an
 *     `organisations(tenant_id, id)` row (organisation belongs to
 *     the assignment's tenant);
 *   - when `scopeFacilityId` is populated, the assignment's
 *     `(tenantId, scopeOrganisationId, scopeFacilityId)` matches a
 *     `facilities(tenant_id, organisation_id, id)` row (facility
 *     belongs to the assignment's tenant and parent organisation).
 *   The composite FKs use PostgreSQL's nullable composite-FK
 *   behaviour: a NULL in any column of the referencing side makes
 *   the FK unenforced for that row, so tenant-scoped assignments
 *   (with null scope targets) are not subject to the organisation
 *   and facility composite FKs.
 * - Existing rows are migrated to explicit tenant scope with no
 *   scope-target by the migration's UPDATE statement. Their
 *   `tenantId` is backfilled from `tenant_memberships.tenant_id`
 *   via `tenant_membership_id`. Their behaviour is unchanged.
 * - Department and Care-Team scope levels are deferred to a future
 *   ADR. The `scopeLevel` field is typed as a closed union so that
 *   adding a new scope level requires a coordinated extension of
 *   this union, the role-assignment mapper, the persistence
 *   adapter, the migration's CHECK constraint, and the contract
 *   schemas.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. The persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and this domain type.
 */

import type { TenantMembershipId } from '../identity/membership.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { PlatformRoleCode } from './role-catalogue.js';

/**
 * Stable identifier for a TenantRoleAssignment. Branded so it
 * cannot be confused with TenantMembershipId, UserId, TenantId, or
 * SessionId at the type level. Erased at runtime.
 */
export type TenantRoleAssignmentId = string & {
  readonly __brand: 'TenantRoleAssignmentId';
};

/**
 * The scope level at which a role assignment is granted. Per
 * ADR-015, the ratified scope levels are:
 *
 * - `tenant`: the assignment is valid across every organisation and
 *   facility under the membership's tenant. This is the default
 *   scope for legacy assignments (those created before ADR-015 was
 *   ratified) and for any new assignment that does not specify a
 *   narrower scope.
 * - `organisation`: the assignment is valid only within the
 *   referenced organisation. The `scopeOrganisationId` field is
 *   required; `scopeFacilityId` must be null.
 * - `facility`: the assignment is valid only within the referenced
 *   facility. Both `scopeOrganisationId` and `scopeFacilityId` are
 *   required; the facility must belong to the organisation.
 *
 * Department and Care-Team scope levels are deferred to a future
 * ADR. The union is closed so that adding a new scope level
 * requires a coordinated extension.
 */
export type RoleAssignmentScopeLevel = 'tenant' | 'organisation' | 'facility';

/**
 * The canonical TenantRoleAssignment domain model. A readonly
 * snapshot of an assignment's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded.
 * - `tenantMembershipId`: the membership this assignment belongs to.
 *   Foreign key to the TenantMembership row; the persistence layer
 *   enforces restricted deletion (a membership with active role
 *   assignments cannot be deleted).
 * - `tenantId`: the Tenant this assignment is scoped to. Derived
 *   server-side from the referenced TenantMembership's `tenantId`;
 *   never accepted from caller input. The persisted `tenantId` is
 *   the structural anchor for the composite foreign keys that
 *   enforce tenant, organisation, and facility consistency at the
 *   database level. A composite foreign key on
 *   `(tenantMembershipId, tenantId)` → `tenant_memberships(id,
 *   tenant_id)` rejects any attempt to persist an assignment whose
 *   derived tenantId does not match the membership's tenantId.
 * - `roleCode`: the canonical platform role code (R01 through R14).
 *   The persistence layer validates that the code is in the
 *   catalogue before insertion.
 * - `scopeLevel`: the scope level at which the assignment is
 *   granted. Per ADR-015, one of 'tenant', 'organisation',
 *   'facility'. Defaults to 'tenant' for legacy assignments.
 * - `scopeOrganisationId`: the organisation the assignment is
 *   scoped to, when `scopeLevel` is 'organisation' or 'facility'.
 *   Null when `scopeLevel` is 'tenant'. The persistence layer
 *   enforces (via a CHECK constraint) that the field is non-null
 *   when `scopeLevel` is 'organisation' or 'facility', and null
 *   when `scopeLevel` is 'tenant'. A composite foreign key on
 *   `(tenantId, scopeOrganisationId)` → `organisations(tenant_id,
 *   id)` enforces that the organisation belongs to the assignment's
 *   tenant when populated.
 * - `scopeFacilityId`: the facility the assignment is scoped to,
 *   when `scopeLevel` is 'facility'. Null otherwise. The
 *   persistence layer enforces (via a CHECK constraint) that the
 *   field is non-null when `scopeLevel` is 'facility', and null
 *   otherwise. A composite foreign key on `(tenantId,
 *   scopeOrganisationId, scopeFacilityId)` →
 *   `facilities(tenant_id, organisation_id, id)` enforces that the
 *   facility belongs to the assignment's tenant and parent
 *   organisation when populated.
 * - `createdAt`: timezone-aware timestamp recording when the
 *   assignment row was inserted. Set by the persistence layer.
 * - `updatedAt`: timezone-aware timestamp recording when the
 *   assignment row was last modified. Updated via Prisma's
 *   `@updatedAt`.
 *
 * The role-permission matrix in `role-permissions.ts` continues to
 * grant permissions by role code. The scope level narrows where a
 * granted permission may be exercised: a principal with R09 at
 * facility scope may exercise R09 permissions only within the
 * referenced facility, not across the entire tenant.
 */
export interface TenantRoleAssignment {
  readonly id: TenantRoleAssignmentId;
  readonly tenantMembershipId: TenantMembershipId;
  readonly tenantId: TenantId;
  readonly roleCode: PlatformRoleCode;
  readonly scopeLevel: RoleAssignmentScopeLevel;
  readonly scopeOrganisationId: OrganisationId | null;
  readonly scopeFacilityId: FacilityId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new TenantRoleAssignment. The persistence
 * layer assigns `id`, `createdAt`, and `updatedAt`; the caller
 * supplies the relational fields.
 *
 * `tenantMembershipId` and `roleCode` are required. The persistence
 * layer enforces the partial unique indexes per scope level and the
 * foreign-key constraint to `tenant_memberships` (with
 * `ON DELETE RESTRICT`).
 *
 * The persistence layer validates that `roleCode` is a canonical
 * platform role code before insertion; an unknown code is rejected
 * with a domain error.
 *
 * Per ADR-015, the caller may supply a `scopeLevel` and the
 * corresponding scope-target identifiers. When `scopeLevel` is
 * omitted, the assignment is created at tenant scope with no
 * scope-target (the default for backward compatibility with the
 * eighth canonical batch's bootstrap command).
 *
 * The persistence layer enforces (via a CHECK constraint) the
 * scope-target implications:
 * - `scopeLevel = 'tenant'` requires both scope-target IDs to be
 *   null.
 * - `scopeLevel = 'organisation'` requires `scopeOrganisationId`
 *   to be non-null and `scopeFacilityId` to be null.
 * - `scopeLevel = 'facility'` requires both scope-target IDs to be
 *   non-null.
 *
 * The application layer additionally validates that the
 * scope-organisation belongs to the membership's tenant and that
 * the scope-facility belongs to the scope-organisation. The
 * database composite foreign keys are the structural backstop; the
 * application-layer checks provide a clear error path.
 *
 * `tenantId` is NOT accepted from the caller. The persistence layer
 * derives it from the referenced `TenantMembership.tenantId`.
 * Supplying a `tenantId` through any code path other than the
 * persistence layer's derivation is a defect; the composite foreign
 * key on `(tenantMembershipId, tenantId)` references
 * `tenant_memberships(id, tenant_id)` and rejects any mismatched
 * derivation at the database level.
 */
export interface CreateTenantRoleAssignmentInput {
  readonly tenantMembershipId: TenantMembershipId;
  readonly roleCode: PlatformRoleCode;
  readonly scopeLevel?: RoleAssignmentScopeLevel;
  readonly scopeOrganisationId?: OrganisationId | null;
  readonly scopeFacilityId?: FacilityId | null;
}
