/**
 * Canonical permission catalogue for the Ibn Hayan Healthcare
 * Operating System.
 *
 * Per PRODUCT_BIBLE.md Section 21.2, permissions are defined at the
 * action level (read, write, execute, administer) on resources
 * (patients, encounters, orders, results, configurations, audits).
 * The action-resource pair is the unit of permission.
 *
 * This file defines the action-level permissions for the
 * functionality that exists in the platform today. Permissions for
 * unimplemented modules are NOT invented; they arrive in subsequent
 * batches alongside their respective vertical slices. Per
 * ROLES_AND_PERMISSIONS.md Section 3.6, new permissions are added
 * only through architectural decision, with the addition documented
 * in the permission catalogue and reviewed by the Security Council.
 *
 * Per PRODUCT_BIBLE.md Section 21.3, permissions are assigned
 * through roles, not directly to users. Direct user-permission
 * assignment is forbidden. The role-permission matrix in
 * `role-permissions.ts` is the only supported mechanism for
 * assigning permissions to roles.
 *
 * Per AUTHORIZATION.md Section 2, authorization is a primitive that
 * governs every interaction with the platform. The authorization
 * layer is default-deny: a request that does not explicitly match an
 * allowed permission is rejected.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

// ---------------------------------------------------------------------------
// Permission codes
// ---------------------------------------------------------------------------

/**
 * The stable machine-readable permission codes for the functionality
 * that exists in the platform today.
 *
 * The codes use the `resource:action` convention recommended in
 * PRODUCT_BIBLE.md Section 21.2. The codes are the persistence
 * representation in audit records (when audit is implemented in
 * Batch 9) and the in-memory representation in the authorization
 * layer.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * context permissions are split into per-level codes so that the
 * authorization guard can distinguish selecting a tenant context
 * from selecting an organisation context from selecting a facility
 * context. The split is structural: each context-selection endpoint
 * declares its specific permission; a principal authorised to
 * select a tenant context is not automatically authorised to
 * select an organisation or facility context (and vice versa).
 *
 * The `context:view` permission remains a single code: viewing the
 * available context options (tenant, organisation, facility) is a
 * single read operation. The `context:select` and `context:clear`
 * permissions continue to apply to the tenant context. The new
 * `context:select_organisation`, `context:clear_organisation`,
 * `context:select_facility`, and `context:clear_facility`
 * permissions apply to the organisation and facility context
 * respectively.
 *
 * Per ADR-015, R14 Integration Account is denied the new context
 * permissions. R14 is non-interactive and receives no browser
 * context-selection capability.
 *
 * Adding a new permission is a coordinated change to this union, the
 * role-permission matrix, and the contract schemas.
 */
export type PermissionCode =
  | 'context:view'
  | 'context:select'
  | 'context:clear'
  | 'context:select_organisation'
  | 'context:clear_organisation'
  | 'context:select_facility'
  | 'context:clear_facility';

/**
 * The complete list of canonical permission codes, in catalogue
 * order. Used by tests to verify the catalogue's completeness and
 * by the role-permission matrix to verify that every permission has
 * an explicit entry for every role.
 */
export const PERMISSION_CODES: readonly PermissionCode[] = [
  'context:view',
  'context:select',
  'context:clear',
  'context:select_organisation',
  'context:clear_organisation',
  'context:select_facility',
  'context:clear_facility',
] as const;

/**
 * Returns `true` if the supplied string is a valid canonical
 * permission code. Used by the authorization layer to reject
 * unknown permissions (default-deny for unknown permissions).
 */
export function isPermissionCode(code: string): code is PermissionCode {
  return (PERMISSION_CODES as readonly string[]).includes(code);
}
