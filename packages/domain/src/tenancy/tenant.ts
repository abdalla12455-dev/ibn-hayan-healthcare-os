/**
 * Tenant domain model.
 *
 * A Tenant is the top-level isolation boundary in the Ibn Hayan
 * Healthcare Operating System. Every Organisation, Facility, user,
 * patient, and clinical record belongs to exactly one Tenant. Per
 * ADR-004 (Multi-Tenant Strategy), tenant isolation is enforced at
 * every database query and at every API operation.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. It is the structural
 * expression of ADR-006's commitment that store technologies are
 * implementation decisions, not architectural identity (per
 * CODING_STANDARDS.md §5).
 *
 * The Tenant type is a readonly snapshot of a tenant's persistent
 * state at a point in time. It is not mutable; mutations are issued
 * through use cases that produce new snapshots. This is the
 * framework-independent shape that the persistence adapter in
 * `apps/api/src/infrastructure/database/` maps to and from the
 * Prisma-generated `Tenant` row type.
 */

/**
 * Stable identifier for a Tenant. Typed as a brand so that a TenantId
 * cannot be confused with an OrganisationId or FacilityId at the type
 * level, even though all three are UUIDs at the database level.
 *
 * The brand is erased at runtime; the value is just a string.
 */
export type TenantId = string & { readonly __brand: 'TenantId' };

/**
 * Tenant lifecycle status. Per the third canonical batch specification,
 * the Tenant lifecycle has exactly two values: `active` and `suspended`.
 *
 * The values are kebab-case string literals so that they are stable
 * across serialised and in-memory representations (per
 * CODING_STANDARDS.md §3 — "union type members use kebab-case string
 * literals for serialised values").
 *
 * Adding a new value (for example, `archived`) is a domain change that
 * requires coordinated migration of the persistence layer and the
 * repository consumers. It is not a silent addition.
 */
export type TenantLifecycleStatus = 'active' | 'suspended';

/**
 * The canonical Tenant domain model. A readonly snapshot of a tenant's
 * persistent state at a point in time.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded so it cannot be confused with
 *   other UUID identifiers.
 * - `slug`: short, URL-safe, globally-unique human identifier. Used in
 *   tenant-scoped URLs and in operator-facing displays. Maximum 80
 *   characters. The repository port's `findBySlug` lookup uses this
 *   field.
 * - `displayName`: human-readable name. Maximum 200 characters. Used in
 *   operator-facing displays and audit log narratives.
 * - `status`: current lifecycle status. `active` tenants can host
 *   organisations and facilities; `suspended` tenants cannot host new
 *   data but their existing data remains queryable for audit and
 *   regulatory purposes (the suspension enforcement is a future batch).
 * - `createdAt`: timezone-aware timestamp recording when the tenant
 *   row was inserted. Set by the persistence layer; never mutated.
 * - `updatedAt`: timezone-aware timestamp recording when the tenant
 *   row was last modified. Updated by the persistence layer on every
 *   write.
 */
export interface Tenant {
  readonly id: TenantId;
  readonly slug: string;
  readonly displayName: string;
  readonly status: TenantLifecycleStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a new Tenant. The persistence layer assigns
 * `id`, `status` (defaulting to `active`), `createdAt`, and `updatedAt`;
 * the caller supplies only the human-authored fields.
 *
 * `slug` and `displayName` are required. The persistence layer enforces
 * the unique constraint on `slug` and the length limits; the domain
 * port does not duplicate that enforcement.
 *
 * `status` is optional. When omitted, the persistence layer defaults
 * to `active`. When present, it must be one of the values in
 * {@link TenantLifecycleStatus}.
 */
export interface CreateTenantInput {
  readonly slug: string;
  readonly displayName: string;
  readonly status?: TenantLifecycleStatus;
}
