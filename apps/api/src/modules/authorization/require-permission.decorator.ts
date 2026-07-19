import { SetMetadata, applyDecorators } from '@nestjs/common';
import type { PermissionCode } from '@ibn-hayan/domain';

/**
 * Authorization-module constants and metadata keys.
 *
 * The `@RequirePermission(...)` decorator attaches the required
 * permission to the route handler's metadata. The
 * `AuthorizationGuard` reads the metadata via the
 * `AUTHORIZATION_PERMISSION_METADATA` key and consults the
 * `AuthorizationService` to make the authorization decision.
 *
 * Per the eighth canonical batch specification, role and permission
 * checks are NOT scattered across controllers. Controllers declare
 * the required permission via this decorator; the guard consults
 * the centrally-defined role-permission matrix in
 * `packages/domain/src/authorization/role-permissions.ts`.
 */

/**
 * The metadata key under which the required permission is stored
 * on the route handler. The guard reads this key via
 * `Reflector.get`.
 */
export const AUTHORIZATION_PERMISSION_METADATA =
  'authorization:required-permission';

/**
 * The context-resolution mode that the guard should use for the
 * route. The mode determines which membership the authorization
 * decision is evaluated against:
 *
 * - `for-user`: the user's available active memberships (no
 *   active context required). Used by `GET /api/v1/context`.
 *
 * - `for-targeted-membership`: the membership identified by the
 *   request body's `membershipId`. Used by
 *   `PUT /api/v1/context/tenant`.
 *
 * - `for-active-membership`: the session's currently active
 *   membership. Used by `DELETE /api/v1/context/tenant`.
 *
 * Per the eighth canonical batch specification, the guard must
 * NOT always rely on the currently active Tenant context. The
 * mode is the structural enforcement of the
 * context-resolution requirement.
 */
export type AuthorizationContextMode =
  'for-user' | 'for-targeted-membership' | 'for-active-membership';

/**
 * The metadata key under which the context-resolution mode is
 * stored on the route handler.
 */
export const AUTHORIZATION_CONTEXT_MODE_METADATA = 'authorization:context-mode';

/**
 * Decorator that declares the permission required to invoke the
 * route handler.
 *
 * Usage:
 *
 *   @RequirePermission('context:select', { mode: 'for-targeted-membership' })
 *   @Put('tenant')
 *   async selectTenantContext(...) { ... }
 *
 * The decorator attaches the permission and the context-resolution
 * mode to the route handler's metadata. The `AuthorizationGuard`
 * reads the metadata and consults the `AuthorizationService` to
 * make the authorization decision.
 *
 * The default context-resolution mode is `for-active-membership`,
 * which is the most common case (most protected routes operate
 * against the session's active Tenant context). The
 * `for-targeted-membership` mode is used only by
 * `PUT /api/v1/context/tenant` and any future route that selects
 * a context. The `for-user` mode is used only by
 * `GET /api/v1/context` and any future route that lists the
 * user's available workspaces.
 */
export function RequirePermission(
  permission: PermissionCode,
  options: { mode?: AuthorizationContextMode } = {},
): MethodDecorator {
  const mode: AuthorizationContextMode =
    options.mode ?? 'for-active-membership';
  return applyDecorators(
    SetMetadata(AUTHORIZATION_PERMISSION_METADATA, permission),
    SetMetadata(AUTHORIZATION_CONTEXT_MODE_METADATA, mode),
  );
}
