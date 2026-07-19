/**
 * Public authorization entry point.
 *
 * Re-exports the authorization domain types, the role catalogue,
 * the permission catalogue, the role-permission matrix, and the
 * repository ports so that consumers import from
 * `@ibn-hayan/domain/authorization` (or from the package root)
 * without reaching into internal file paths.
 *
 * Nothing in this module imports Prisma, NestJS, Next.js, React,
 * Zod, argon2, or any framework. The exports are pure TypeScript
 * types, interfaces, and pure functions. Per ADR-012 §1.4,
 * Prisma-generated types must not leak into the domain; the
 * persistence adapter in `apps/api/src/infrastructure/database/` is
 * responsible for mapping between Prisma row types and these domain
 * types.
 *
 * Per the eighth canonical batch specification, the authorization
 * layer is default-deny. The role-permission matrix is the single
 * source of truth for what permissions each role holds. The
 * authorization layer never inspects display labels; only the
 * stable machine codes are consulted for authorization decisions.
 */

export type {
  RoleCategory,
  PlatformRoleCode,
  PlatformRoleCatalogueEntry,
  RoleLabelLocale,
} from './role-catalogue.js';
export {
  PLATFORM_ROLE_CODES,
  PLATFORM_ROLE_CATALOGUE,
  findRoleCatalogueEntry,
  isPlatformRoleCode,
  getRoleDisplayName,
} from './role-catalogue.js';

export type { PermissionCode } from './permissions.js';
export { PERMISSION_CODES, isPermissionCode } from './permissions.js';

export {
  ROLE_PERMISSION_MATRIX,
  permissionsForRole,
  permissionsForRoles,
  rolesGrantPermission,
  areValidRoleCodes,
  listPlatformRoleCodes,
} from './role-permissions.js';

export type {
  TenantRoleAssignment,
  TenantRoleAssignmentId,
  CreateTenantRoleAssignmentInput,
} from './role-assignment.js';

export type { TenantRoleAssignmentRepository } from './repositories.js';
