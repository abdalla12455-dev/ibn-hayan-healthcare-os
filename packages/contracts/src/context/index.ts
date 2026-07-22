/**
 * Public context-contract entry point.
 *
 * Re-exports the Zod schemas and the inferred TypeScript types so that
 * consumers import from `@ibn-hayan/contracts` (or from the package
 * root) without reaching into internal file paths.
 *
 * Per the fifth canonical batch specification:
 * - The active Tenant context is session-specific and is selected by
 *   TenantMembership ID (never by an arbitrary Tenant ID).
 * - No Organisation or Facility context fields are included.
 * - No role or permission fields are included.
 * - The contracts never include `passwordHash`, `token`, `tokenHash`,
 *   `csrfHash`, or any credential material.
 */

export {
  TenantContextOptionSchema,
  type TenantContextOption,
  ActiveTenantContextSchema,
  type ActiveTenantContext,
  OrganisationContextOptionSchema,
  type OrganisationContextOption,
  ActiveOrganisationContextSchema,
  type ActiveOrganisationContext,
  FacilityContextOptionSchema,
  type FacilityContextOption,
  ActiveFacilityContextSchema,
  type ActiveFacilityContext,
  ContextResponseSchema,
  type ContextResponse,
  SelectTenantContextRequestSchema,
  type SelectTenantContextRequest,
  SelectOrganisationContextRequestSchema,
  type SelectOrganisationContextRequest,
  SelectFacilityContextRequestSchema,
  type SelectFacilityContextRequest,
  ClearTenantContextResponseSchema,
  type ClearTenantContextResponse,
  ClearOrganisationContextResponseSchema,
  type ClearOrganisationContextResponse,
  ClearFacilityContextResponseSchema,
  type ClearFacilityContextResponse,
} from './context.schema.js';
