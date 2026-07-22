/**
 * Authorization repository ports.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * repository interfaces are declared in the domain package and
 * implemented by persistence adapters in
 * `apps/api/src/infrastructure/database/`. The API layer depends on
 * the interface; the Prisma-backed implementation is injected at the
 * composition root.
 *
 * Per the eighth canonical batch specification:
 * - The role-assignment repository loads the roles assigned to a
 *   membership. The authorization layer uses the loaded roles to
 *   compute the permission union via the role-permission matrix.
 * - The ports return domain values (`TenantRoleAssignment`), not
 *   Prisma-generated row types. The mapping between Prisma types
 *   and domain types is explicit and tested in the persistence
 *   adapter.
 * - No use cases, API DTOs, controllers, or business workflows are
 *   declared here. The ports are pure data-access interfaces.
 * - No generic repository abstraction is declared. Each bounded
 *   context owns its own port; there is no `Repository<T>` base
 *   interface.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantMembershipId } from '../identity/membership.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';
import type {
  TenantRoleAssignment,
  CreateTenantRoleAssignmentInput,
  RoleAssignmentScopeLevel,
} from './role-assignment.js';

/**
 * Repository port for the TenantRoleAssignment bounded context.
 *
 * Role assignments are scoped to a TenantMembership for read
 * purposes: the authorization layer loads a membership's roles to
 * compute the permission union. There is no `listForTenant` port in
 * this batch — tenant-scoped role administration is deferred to a
 * subsequent batch.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), role
 * assignments carry an explicit scope level ('tenant',
 * 'organisation', 'facility'). The `listForMembership` port
 * continues to return all assignments for the membership regardless
 * of scope; the authorization layer interprets the result by
 * filtering on scope level. The `listForMembershipAtOrganisation`
 * and `listForMembershipAtFacility` ports return only the
 * assignments that grant authority at the supplied organisation or
 * facility, including tenant-scoped assignments (which are valid
 * across every organisation and facility under the tenant).
 */
export interface TenantRoleAssignmentRepository {
  /**
   * Create a new TenantRoleAssignment. Throws a domain error
   * (translated to 409 Conflict at the API boundary) if an
   * assignment with the same `(tenantMembershipId, roleCode,
   * scopeLevel, scopeOrganisationId, scopeFacilityId)` tuple
   * already exists.
   *
   * The persistence layer validates that `roleCode` is a canonical
   * platform role code before insertion; an unknown code is
   * rejected with a domain error (translated to 400 Bad Request at
   * the API boundary).
   *
   * Per ADR-015, the caller may supply a `scopeLevel` and the
   * corresponding scope-target identifiers. When `scopeLevel` is
   * omitted, the assignment is created at tenant scope with no
   * scope-target (the default for backward compatibility).
   */
  create(
    input: CreateTenantRoleAssignmentInput,
  ): Promise<TenantRoleAssignment>;

  /**
   * List all TenantRoleAssignments belonging to a specific
   * TenantMembership. The result is membership-scoped; no
   * assignment belonging to a different membership can appear in
   * the result.
   *
   * Used by the authorization layer to compute the permission
   * union for a membership. Also used by the session-context
   * service to enrich membership summaries with their roles for
   * API responses.
   *
   * Per ADR-015, the returned assignments carry their scope level
   * and scope-target identifiers. The authorization layer filters
   * by scope level when evaluating a permission at a specific
   * scope; the session-context service includes the scope
   * information in the API response when relevant.
   *
   * Returns an empty array if the membership has no role
   * assignments. This is the fail-closed posture: a membership
   * with no assignments has no permissions.
   */
  listForMembership(
    membershipId: TenantMembershipId,
  ): Promise<TenantRoleAssignment[]>;

  /**
   * List the TenantRoleAssignments for a specific TenantMembership
   * that grant authority at the supplied organisation. The result
   * includes:
   * - tenant-scoped assignments for the membership (valid across
   *   every organisation under the tenant);
   * - organisation-scoped assignments for the membership whose
   *   `scopeOrganisationId` matches the supplied organisationId;
   * - facility-scoped assignments for the membership whose
   *   `scopeOrganisationId` matches the supplied organisationId
   *   (these grant authority at the organisation level by
   *   implication, because a facility-scoped assignment grants
   *   authority at the facility's parent organisation).
   *
   * The result is membership-and-organisation-scoped; no
   * assignment belonging to a different membership or targeting a
   * different organisation can appear in the result.
   *
   * Used by the authorization layer to compute the permission
   * union for a membership at a specific organisation scope. Used
   * by the session-context service to determine whether the
   * principal is authorised to select the supplied organisation as
   * the active organisation context.
   *
   * Returns an empty array if the membership has no assignments
   * that grant authority at the supplied organisation. This is the
   * fail-closed posture: a principal without an applicable
   * assignment cannot select the organisation.
   */
  listForMembershipAtOrganisation(
    membershipId: TenantMembershipId,
    organisationId: OrganisationId,
  ): Promise<TenantRoleAssignment[]>;

  /**
   * List the TenantRoleAssignments for a specific TenantMembership
   * that grant authority at the supplied facility. The result
   * includes:
   * - tenant-scoped assignments for the membership (valid across
   *   every facility under the tenant);
   * - organisation-scoped assignments for the membership whose
   *   `scopeOrganisationId` matches the facility's parent
   *   organisation (valid across every facility under the
   *   organisation);
   * - facility-scoped assignments for the membership whose
   *   `scopeFacilityId` matches the supplied facilityId.
   *
   * The result is membership-and-facility-scoped; no assignment
   * belonging to a different membership or targeting a different
   * facility can appear in the result.
   *
   * Used by the authorization layer to compute the permission
   * union for a membership at a specific facility scope. Used by
   * the session-context service to determine whether the principal
   * is authorised to select the supplied facility as the active
   * facility context.
   *
   * Returns an empty array if the membership has no assignments
   * that grant authority at the supplied facility. This is the
   * fail-closed posture: a principal without an applicable
   * assignment cannot select the facility.
   */
  listForMembershipAtFacility(
    membershipId: TenantMembershipId,
    facilityId: FacilityId,
  ): Promise<TenantRoleAssignment[]>;

  /**
   * List the TenantRoleAssignments for a specific TenantMembership
   * at a specific scope level. The result is membership-and-scope-
   * scoped; no assignment belonging to a different membership or
   * at a different scope level can appear in the result.
   *
   * Used by the session-context service to enumerate the
   * principal's scope-targeted assignments when building the
   * organisation and facility option lists.
   *
   * Returns an empty array if the membership has no assignments at
   * the supplied scope level.
   */
  listForMembershipAtScope(
    membershipId: TenantMembershipId,
    scopeLevel: RoleAssignmentScopeLevel,
  ): Promise<TenantRoleAssignment[]>;
}
