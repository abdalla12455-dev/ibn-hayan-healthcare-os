/**
 * Public Demo Role Preview Mode contracts entry point.
 *
 * Re-exports the role-preview Zod schemas and inferred TypeScript
 * types so that consumers import from `@ibn-hayan/contracts` (or
 * from `@ibn-hayan/contracts/role-preview`) without reaching into
 * internal file paths.
 *
 * Per the Demo Role Preview Mode v1 specification, the feature is
 * development-only. The contracts are defined here so that the
 * contract surface is visible and so that the API and web client
 * share a single source of truth; the endpoints that produce these
 * payloads are unavailable in production.
 */

export {
  RolePreviewAvailabilityResponseSchema,
  RolePreviewRoleCardSchema,
  SelectPreviewRoleRequestSchema,
  SelectPreviewRoleResponseSchema,
  CurrentPreviewRoleResponseSchema,
  EndPreviewRoleResponseSchema,
  RolePreviewErrorResponseSchema,
  type RolePreviewAvailabilityResponse,
  type RolePreviewRoleCard,
  type SelectPreviewRoleRequest,
  type SelectPreviewRoleResponse,
  type CurrentPreviewRoleResponse,
  type EndPreviewRoleResponse,
  type RolePreviewErrorResponse,
} from './role-preview.schema.js';
