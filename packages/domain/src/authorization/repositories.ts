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
import type {
  TenantRoleAssignment,
  CreateTenantRoleAssignmentInput,
} from './role-assignment.js';

/**
 * Repository port for the TenantRoleAssignment bounded context.
 *
 * Role assignments are scoped to a TenantMembership for read
 * purposes: the authorization layer loads a membership's roles to
 * compute the permission union. There is no `listForTenant` port in
 * this batch — tenant-scoped role administration is deferred to a
 * subsequent batch.
 */
export interface TenantRoleAssignmentRepository {
  /**
   * Create a new TenantRoleAssignment. Throws a domain error
   * (translated to 409 Conflict at the API boundary) if an
   * assignment with the same `(tenantMembershipId, roleCode)` pair
   * already exists.
   *
   * The persistence layer validates that `roleCode` is a canonical
   * platform role code before insertion; an unknown code is
   * rejected with a domain error (translated to 400 Bad Request at
   * the API boundary).
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
   * Returns an empty array if the membership has no role
   * assignments. This is the fail-closed posture: a membership
   * with no assignments has no permissions.
   */
  listForMembership(
    membershipId: TenantMembershipId,
  ): Promise<TenantRoleAssignment[]>;
}
