/**
 * TenantMembership domain model.
 *
 * A TenantMembership is the link between a User and a Tenant. A User
 * may hold at most one membership per Tenant (enforced by a unique
 * constraint on `(tenantId, userId)`). A User's set of memberships
 * determines the Tenants they may operate within; the per-operation
 * verification chain (ADR-013 §1.4) consults the membership set at
 * every protected API operation.
 *
 * Per the fourth canonical batch specification, this type carries no
 * role or permission columns. The role/permission catalogue is
 * deferred to a subsequent batch; the verification chain's
 * "required permission" step is a structural placeholder in this
 * batch. Adding a role or permission column to this model in the
 * future is a coordinated domain change, not a silent addition.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. The persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and this domain type.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { UserId } from './user.js';

/**
 * Stable identifier for a TenantMembership. Branded so it cannot be
 * confused with UserId, TenantId, or SessionId at the type level.
 * Erased at runtime.
 */
export type TenantMembershipId = string & {
  readonly __brand: 'TenantMembershipId';
};

/**
 * TenantMembership lifecycle status. Per the fourth canonical batch
 * specification, the membership lifecycle has exactly two values:
 * `active` and `suspended`.
 *
 * - `active`: the user may operate within the tenant. A login attempt
 *   for a user with at least one active membership succeeds (subject
 *   to other checks). A user with no active memberships receives the
 *   same generic 401 as any other failed login (per ADR-013 §1.1).
 * - `suspended`: the user's access to the tenant is paused but the
 *   membership row is retained. The per-operation verification chain
 *   rejects a session whose only membership for the target tenant is
 *   suspended. Existing sessions are not automatically revoked.
 *
 * The values are kebab-case string literals so that they are stable
 * across serialised and in-memory representations (per
 * CODING_STANDARDS.md §3).
 */
export type TenantMembershipStatus = 'active' | 'suspended';

/**
 * The canonical TenantMembership domain model. A readonly snapshot of
 * a membership's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded.
 * - `tenantId`: the Tenant this membership grants access to. Foreign
 *   key to the Tenant row; the persistence layer enforces restricted
 *   deletion (a Tenant with active memberships cannot be deleted).
 * - `userId`: the User this membership belongs to. Foreign key to the
 *   User row; restricted deletion (a User with active memberships
 *   cannot be deleted).
 * - `status`: current lifecycle status.
 * - `createdAt`: timezone-aware timestamp recording when the
 *   membership row was inserted. Set by the persistence layer.
 * - `updatedAt`: timezone-aware timestamp recording when the
 *   membership row was last modified. Updated via Prisma's
 *   `@updatedAt`.
 */
export interface TenantMembership {
  readonly id: TenantMembershipId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly status: TenantMembershipStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new TenantMembership. The persistence layer
 * assigns `id`, `createdAt`, and `updatedAt`; the caller supplies the
 * relational fields.
 *
 * `tenantId` and `userId` are required. The persistence layer enforces
 * the unique constraint on `(tenantId, userId)` and the foreign-key
 * constraints to `tenants` and `users` (both with `ON DELETE RESTRICT`).
 *
 * `status` is optional. When omitted, the persistence layer defaults
 * to `active`.
 */
export interface CreateTenantMembershipInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly status?: TenantMembershipStatus;
}
