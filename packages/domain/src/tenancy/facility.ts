/**
 * Facility domain model.
 *
 * A Facility is the third level of the Ibn Hayan Healthcare Operating
 * System tenancy hierarchy. Every Facility belongs to exactly one
 * Organisation, which in turn belongs to exactly one Tenant. A Facility
 * represents a physical location where healthcare services are
 * delivered: a clinic, a pharmacy, a lab, an imaging centre, etc.
 *
 * Per the third canonical batch specification, the Facility's tenant
 * ownership is structurally enforced through a composite foreign key
 * from `facilities(tenantId, organisationId)` to
 * `organisations(tenantId, id)`. This means a Facility cannot be
 * attached to an Organisation in a different Tenant; the database
 * rejects the insert.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from './tenant.js';
import type { OrganisationId } from './organisation.js';

/**
 * Stable identifier for a Facility. Branded so it cannot be confused
 * with a TenantId or OrganisationId at the type level.
 */
export type FacilityId = string & { readonly __brand: 'FacilityId' };

/**
 * Facility lifecycle status. Per the third canonical batch
 * specification, the Facility lifecycle has exactly two values:
 * `active` and `inactive`.
 *
 * `active` facilities can host clinical work; `inactive` facilities
 * cannot host new clinical work but their historical data remains
 * queryable for audit and regulatory purposes (enforcement is a future
 * batch).
 */
export type FacilityLifecycleStatus = 'active' | 'inactive';

/**
 * The canonical Facility domain model. A readonly snapshot of a
 * facility's persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded.
 * - `tenantId`: the Tenant that owns this Facility (transitively, via
 *   the Organisation). Persisted on the facility row so that
 *   tenant-scoped queries do not need to join through `organisations`.
 *   Enforced at the database level by the composite foreign key
 *   `(tenantId, organisationId) references organisations(tenantId, id)`.
 * - `organisationId`: the Organisation that owns this Facility. The
 *   pair `(tenantId, organisationId)` must reference an existing
 *   Organisation row; the composite foreign key enforces this.
 * - `code`: short, organisation-scoped, human-authored code. Unique
 *   within `(tenantId, organisationId)`. Maximum 50 characters.
 * - `displayName`: human-readable name. Maximum 200 characters.
 * - `status`: current lifecycle status.
 * - `createdAt`: timezone-aware timestamp; set by persistence layer.
 * - `updatedAt`: timezone-aware timestamp; updated by persistence layer.
 */
export interface Facility {
  readonly id: FacilityId;
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId;
  readonly code: string;
  readonly displayName: string;
  readonly status: FacilityLifecycleStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new Facility under a specific Organisation.
 *
 * The caller supplies `tenantId`, `organisationId`, `code`, and
 * `displayName`. The persistence layer assigns `id`, `status`
 * (defaulting to `active`), `createdAt`, and `updatedAt`.
 *
 * The persistence layer enforces:
 * - the composite foreign key from
 *   `facilities(tenantId, organisationId)` to
 *   `organisations(tenantId, id)`. This rejects any insert where the
 *   Facility's `tenantId` does not match its Organisation's `tenantId`.
 * - the unique constraint on `(tenantId, organisationId, code)`.
 * - the length limits on `code` and `displayName`.
 *
 * The same `code` may be reused across different Organisations (even
 * within the same Tenant); it is organisation-scoped, not
 * tenant-scoped or globally unique.
 */
export interface CreateFacilityInput {
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId;
  readonly code: string;
  readonly displayName: string;
  readonly status?: FacilityLifecycleStatus;
}
