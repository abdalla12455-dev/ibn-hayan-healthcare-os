/**
 * Public authorization module entry point.
 *
 * Re-exports the module, service, guard, and decorator so that
 * `AppModule` can import `AuthorizationModule` and controllers can
 * apply `@UseGuards(AuthorizationGuard)` and
 * `@RequirePermission(...)`.
 */

export { AuthorizationModule } from './authorization.module.js';
export { AuthorizationService } from './authorization.service.js';
export { AuthorizationGuard } from './authorization.guard.js';
export type { AuthorizationRequestAugmentation } from './authorization.guard.js';
export {
  RequirePermission,
  AUTHORIZATION_PERMISSION_METADATA,
  AUTHORIZATION_CONTEXT_MODE_METADATA,
  type AuthorizationContextMode,
} from './require-permission.decorator.js';
export {
  authorizationForbidden,
  contextSelectionForbidden,
  csrfInvalid,
} from './authorization.errors.js';
