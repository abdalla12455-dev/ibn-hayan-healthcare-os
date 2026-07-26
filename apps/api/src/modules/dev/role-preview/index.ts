/**
 * Public Demo Role Preview Mode module entry point.
 *
 * Re-exports the module, controller, service, feature-config gate,
 * preview identity catalogue, error helpers, bootstrap challenge
 * store, bootstrap cookie helpers, and database-identity gate so
 * that consumers import from `./role-preview` without reaching
 * into internal file paths.
 */

export { RolePreviewModule } from './role-preview.module.js';
export { RolePreviewController } from './role-preview.controller.js';
export { RolePreviewService } from './role-preview.service.js';
export { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
export {
  PREVIEW_IDENTITY_CATALOGUE,
  PREVIEW_EMAIL_DOMAIN,
  PREVIEW_TENANT_SLUG,
  PREVIEW_TENANT_DISPLAY_NAME,
  PREVIEW_ORGANISATION_CODE,
  PREVIEW_ORGANISATION_DISPLAY_NAME,
  PREVIEW_FACILITY_CODE,
  PREVIEW_FACILITY_DISPLAY_NAME,
  findPreviewIdentity,
  isCanonicalPreviewRoleCode,
  resolvePreviewScopeLevel,
  type PreviewIdentityEntry,
  type PreviewRoleScopeLevel,
} from './preview-identity-catalogue.js';
export {
  MIN_PREVIEW_PASSWORD_LENGTH,
  PREVIEW_PASSWORD_ENV_VAR,
  PreviewPasswordMissingError,
  isValidPreviewPassword,
  readPreviewPasswordFromEnv,
} from './preview-password.js';
export {
  rolePreviewDisabled,
  rolePreviewRoleUnknown,
  rolePreviewRequestInvalid,
  rolePreviewSessionRequired,
  rolePreviewCsrfInvalid,
  rolePreviewOriginDisallowed,
  rolePreviewNotActive,
  rolePreviewBootstrapExpired,
  rolePreviewBootstrapReplay,
  rolePreviewBootstrapInvalid,
  rolePreviewDatabaseIdentityInvalid,
} from './role-preview.errors.js';
export {
  BootstrapChallengeStore,
  BOOTSTRAP_MAX_AGE_MS,
} from './bootstrap-store.js';
export {
  BOOTSTRAP_COOKIE_NAME,
  buildBootstrapCookieOptions,
  buildBootstrapCookieClearOptions,
} from './role-preview.cookies.js';
export {
  isPreviewTransactionalDatabaseUrl,
  isPreviewAuditDatabaseUrl,
  isPreviewDatabaseIdentityValid,
  validatePreviewDatabaseUrl,
  validatePreviewDatabaseIdentity,
  PREVIEW_DATABASE_NAME_IDENTIFIERS,
  type PreviewDatabaseUrlValidation,
  type PreviewDatabaseIdentityResult,
} from './preview-database-identity.js';
