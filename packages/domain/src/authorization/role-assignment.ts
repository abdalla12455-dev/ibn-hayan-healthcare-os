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
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. The persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and this domain type.
 */

import type { TenantMembershipId } from '../identity/membership.js';
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
 * The canonical TenantRoleAssignment domain model. A readonly
 * snapshot of an assignment's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded.
 * - `tenantMembershipId`: the membership this assignment belongs to.
 *   Foreign key to the TenantMembership row; the persistence layer
 *   enforces restricted deletion (a membership with active role
 *   assignments cannot be deleted).
 * - `roleCode`: the canonical platform role code (R01 through R14).
 *   The persistence layer validates that the code is in the
 *   catalogue before insertion.
 * - `createdAt`: timezone-aware timestamp recording when the
 *   assignment row was inserted. Set by the persistence layer.
 * - `updatedAt`: timezone-aware timestamp recording when the
 *   assignment row was last modified. Updated via Prisma's
 *   `@updatedAt`.
 */
export interface TenantRoleAssignment {
  readonly id: TenantRoleAssignmentId;
  readonly tenantMembershipId: TenantMembershipId;
  readonly roleCode: PlatformRoleCode;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new TenantRoleAssignment. The persistence
 * layer assigns `id`, `createdAt`, and `updatedAt`; the caller
 * supplies the relational fields.
 *
 * `tenantMembershipId` and `roleCode` are required. The persistence
 * layer enforces the unique constraint on
 * `(tenantMembershipId, roleCode)` and the foreign-key constraint to
 * `tenant_memberships` (with `ON DELETE RESTRICT`).
 *
 * The persistence layer validates that `roleCode` is a canonical
 * platform role code before insertion; an unknown code is rejected
 * with a domain error.
 */
export interface CreateTenantRoleAssignmentInput {
  readonly tenantMembershipId: TenantMembershipId;
  readonly roleCode: PlatformRoleCode;
}
