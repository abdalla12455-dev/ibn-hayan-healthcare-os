/**
 * Public authorization contracts entry point.
 *
 * Re-exports the authorization Zod schemas and inferred TypeScript
 * types so that consumers import from `@ibn-hayan/contracts`
 * (or from `@ibn-hayan/contracts/authorization`) without reaching
 * into internal file paths.
 */

export {
  RoleCodeSchema,
  RoleLabelLocaleSchema,
  RoleSummarySchema,
  PermissionCodeSchema,
  type RoleCode,
  type RoleLabelLocale,
  type RoleSummary,
  type PermissionCode,
} from './authorization.schema.js';
