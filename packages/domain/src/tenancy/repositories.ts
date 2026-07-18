/**
 * Tenancy repository ports.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * repository interfaces are declared in the domain package and
 * implemented by persistence adapters in
 * `apps/api/src/infrastructure/database/`. The API layer depends on
 * the interface; the Prisma-backed implementation is injected at the
 * composition root.
 *
 * Per CODING_STANDARDS.md §10 (Tenant-Scope Requirements), every
 * database query that touches tenant-scoped data must include a tenant
 * filter. The Organisation and Facility repository ports below make
 * the tenant filter a required parameter of every read; there is no
 * unscoped `findById` for organisations or facilities. This is the
 * structural enforcement that prevents a future caller from forgetting
 * the tenant filter.
 *
 * The ports return domain values (Tenant, Organisation, Facility), not
 * Prisma-generated row types. The mapping between Prisma types and
 * domain types is explicit and tested in the persistence adapter.
 *
 * No use cases, API DTOs, controllers, or business workflows are
 * declared here. The ports are pure data-access interfaces.
 *
 * No generic repository abstraction is declared. Each bounded context
 * owns its own port; there is no `Repository<T>` base interface. This
 * is intentional: a generic abstraction encourages leaky scopes (for
 * example, a generic `findById(id)` that omits the tenant filter).
 *
 * No soft-delete abstractions are declared. `delete` is a real delete
 * at the database level, restricted by foreign-key constraints.
 *
 * No users, memberships, subscriptions, or configuration models are
 * declared here. Those arrive in subsequent batches.
 */

import type {
  Tenant,
  TenantId,
  CreateTenantInput,
} from './tenant.js';
import type {
  Organisation,
  OrganisationId,
  CreateOrganisationInput,
} from './organisation.js';
import type {
  Facility,
  FacilityId,
  CreateFacilityInput,
} from './facility.js';

/**
 * Repository port for the Tenant bounded context.
 *
 * Tenant reads are not tenant-scoped (a Tenant is itself the scope),
 * so the port does not take a `tenantId` parameter on reads. Tenant
 * writes are restricted by the lifecycle: a Tenant with active
 * Organisations cannot be deleted (the database enforces this via
 * the restricted foreign key from `organisations.tenantId`).
 */
export interface TenantRepository {
  /**
   * Create a new Tenant. Throws a domain error (translated to a 409
   * Conflict at the API boundary) if a Tenant with the same `slug`
   * already exists.
   */
  create(input: CreateTenantInput): Promise<Tenant>;

  /**
   * Find a Tenant by its stable UUID identifier. Returns `null` if no
   * Tenant exists with the given id.
   */
  findById(tenantId: TenantId): Promise<Tenant | null>;

  /**
   * Find a Tenant by its globally-unique slug. Returns `null` if no
   * Tenant exists with the given slug. Used by tenant-resolution
   * flows (operator types a slug in a URL; the API resolves the slug
   * to a TenantId).
   */
  findBySlug(slug: string): Promise<Tenant | null>;
}

/**
 * Repository port for the Organisation bounded context.
 *
 * Every Organisation read requires a `tenantId`. There is no
 * unscoped `findById(organisationId)` method. This is the structural
 * enforcement of CODING_STANDARDS.md §10: a query that does not
 * include a tenant filter is a defect, and the port makes such a
 * query unrepresentable.
 *
 * Organisation writes are restricted by the lifecycle: an Organisation
 * with active Facilities cannot be deleted (the database enforces this
 * via the restricted foreign key from
 * `facilities(tenantId, organisationId)`).
 */
export interface OrganisationRepository {
  /**
   * Create a new Organisation under a specific Tenant. Throws a domain
   * error (translated to 409 Conflict at the API boundary) if an
   * Organisation with the same `code` already exists within the same
   * Tenant. The same `code` may exist in a different Tenant.
   */
  create(input: CreateOrganisationInput): Promise<Organisation>;

  /**
   * Find an Organisation by its stable UUID identifier, scoped to a
   * specific Tenant. Returns `null` if no Organisation exists with
   * the given `(tenantId, organisationId)` pair. This means looking
   * up an organisation id from a different Tenant returns `null`,
   * not the other Tenant's organisation.
   */
  findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
  ): Promise<Organisation | null>;

  /**
   * List all Organisations belonging to a specific Tenant. The result
   * is tenant-scoped; no Organisation from another Tenant can appear
   * in the result.
   */
  listForTenant(tenantId: TenantId): Promise<Organisation[]>;
}

/**
 * Repository port for the Facility bounded context.
 *
 * Every Facility read requires a `tenantId`. There is no unscoped
 * `findById(facilityId)` method. The same structural enforcement that
 * applies to {@link OrganisationRepository} applies here.
 *
 * Facility writes require both `tenantId` and `organisationId`. The
 * persistence layer enforces (via the composite foreign key) that the
 * `(tenantId, organisationId)` pair references an existing Organisation
 * row; this means a Facility cannot be attached to an Organisation in
 * a different Tenant.
 */
export interface FacilityRepository {
  /**
   * Create a new Facility under a specific Organisation. Throws a
   * domain error (translated to 409 Conflict at the API boundary) if
   * a Facility with the same `code` already exists within the same
   * `(tenantId, organisationId)` pair. The same `code` may exist in a
   * different Organisation, even within the same Tenant.
   *
   * Throws a domain error (translated to 400 Bad Request or 404 Not
   * Found at the API boundary) if the `(tenantId, organisationId)`
   * pair does not reference an existing Organisation. This includes
   * the cross-tenant case: a Facility insert where `tenantId` does
   * not match the Organisation's `tenantId` is rejected by the
   * composite foreign key.
   */
  create(input: CreateFacilityInput): Promise<Facility>;

  /**
   * Find a Facility by its stable UUID identifier, scoped to a
   * specific Tenant. Returns `null` if no Facility exists with the
   * given `(tenantId, facilityId)` pair. Looking up a facility id
   * from a different Tenant returns `null`, not the other Tenant's
   * facility.
   */
  findById(
    tenantId: TenantId,
    facilityId: FacilityId,
  ): Promise<Facility | null>;

  /**
   * List all Facilities belonging to a specific Organisation, scoped
   * to a specific Tenant. The result is tenant-and-organisation-scoped;
   * no Facility from another Tenant or another Organisation can appear
   * in the result.
   */
  listForOrganisation(
    tenantId: TenantId,
    organisationId: OrganisationId,
  ): Promise<Facility[]>;
}
