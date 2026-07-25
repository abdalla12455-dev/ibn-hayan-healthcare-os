/**
 * Public Demo Role Preview Mode module entry point.
 *
 * Re-exports the module, controller, service, feature-config gate,
 * preview identity catalogue, and error helpers so that consumers
 * import from `./role-preview` without reaching into internal file
 * paths.
 */

export { RolePreviewModule } from './role-preview.module.js';
export { RolePreviewController } from './role-preview.controller.js';
export { RolePreviewService } from './role-preview.service.js';
export { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
export {
  PREVIEW_IDENTITY_CATALOGUE,
  PREVIEW_IDENTITY_PASSWORD,
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
  rolePreviewDisabled,
  rolePreviewRoleUnknown,
  rolePreviewRequestInvalid,
  rolePreviewSessionRequired,
  rolePreviewCsrfInvalid,
  rolePreviewOriginDisallowed,
  rolePreviewNotActive,
} from './role-preview.errors.js';
