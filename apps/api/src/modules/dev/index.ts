/**
 * Public dev module entry point.
 *
 * The dev module is the bounded context for development-only
 * features. The first sub-module is Demo Role Preview Mode
 * (`role-preview`), which allows the operator to preview the
 * system as every canonical role R01 through R14 without
 * manually entering credentials.
 *
 * Per the Demo Role Preview Mode v1 specification, every
 * sub-module under `dev/` MUST be development-only. The
 * sub-module's feature-config gate is the authoritative entry
 * point: when the gate returns `false`, every route returns a
 * 404 (availability, current) or throws the disabled error
 * (select, end). The 404 status does NOT advertise the route's
 * existence in production.
 */

export { RolePreviewModule } from './role-preview/index.js';
