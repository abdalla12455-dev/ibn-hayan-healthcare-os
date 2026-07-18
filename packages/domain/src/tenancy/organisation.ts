/**
 * Organisation domain model.
 *
 * An Organisation is the second level of the Ibn Hayan Healthcare
 * Operating System tenancy hierarchy. Every Organisation belongs to
 * exactly one Tenant. An Organisation groups one or more Facilities
 * (clinics, pharmacies, labs, etc.) under a common administrative
 * umbrella. Per ADR-004 (Multi-Tenant Strategy), the Organisation's
 * Tenant ownership is enforced at every database query and every API
 * operation.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 *
 * The Organisation type is a readonly snapshot of an organisation's
 * persistent state. Mutations are issued through use cases that produce
 * new snapshots. The persistence adapter in
 * `apps/api/src/infrastructure/database/` maps between this type and
 * the Prisma-generated `Organisation` row type.
 */

import type { TenantId } from './tenant.js';

/**
 * Stable identifier for an Organisation. Branded so it cannot be
 * confused with a TenantId or FacilityId at the type level.
 */
export type OrganisationId = string & { readonly __brand: 'OrganisationId' };

/**
 * Organisation lifecycle status. Per the third canonical batch
 * specification, the Organisation lifecycle has exactly two values:
 * `active` and `inactive`.
 *
 * `active` organisations can host facilities; `inactive` organisations
 * cannot host new facilities but their existing facilities remain
 * queryable for audit and regulatory purposes (enforcement is a future
 * batch).
 */
export type OrganisationLifecycleStatus = 'active' | 'inactive';

/**
 * The canonical Organisation domain model. A readonly snapshot of an
 * organisation's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded.
 * - `tenantId`: the Tenant that owns this Organisation. Every
 *   Organisation belongs to exactly one Tenant; this field is the
 *   structural expression of that ownership. The composite unique
 *   constraint `(tenantId, id)` and the composite foreign key from
 *   `facilities` to `organisations` enforce the ownership at the
 *   database level.
 * - `code`: short, tenant-scoped, human-authored code. Unique within
 *   a Tenant. Maximum 50 characters. Used in operator-facing displays
 *   and in tenant-scoped URL paths.
 * - `displayName`: human-readable name. Maximum 200 characters.
 * - `status`: current lifecycle status.
 * - `createdAt`: timezone-aware timestamp; set by persistence layer.
 * - `updatedAt`: timezone-aware timestamp; updated by persistence layer.
 */
export interface Organisation {
  readonly id: OrganisationId;
  readonly tenantId: TenantId;
  readonly code: string;
  readonly displayName: string;
  readonly status: OrganisationLifecycleStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new Organisation under a specific Tenant.
 *
 * The caller supplies `tenantId`, `code`, and `displayName`. The
 * persistence layer assigns `id`, `status` (defaulting to `active`),
 * `createdAt`, and `updatedAt`.
 *
 * The persistence layer enforces:
 * - the foreign key from `organisations.tenantId` to `tenants.id`;
 * - the unique constraint on `(tenantId, code)`;
 * - the length limits on `code` and `displayName`.
 *
 * The same `code` may be reused across different Tenants; it is
 * tenant-scoped, not globally unique.
 */
export interface CreateOrganisationInput {
  readonly tenantId: TenantId;
  readonly code: string;
  readonly displayName: string;
  readonly status?: OrganisationLifecycleStatus;
}
