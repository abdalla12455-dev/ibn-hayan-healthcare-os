import { z } from 'zod';
import { RoleSummarySchema } from '../authorization/authorization.schema.js';

/**
 * Shared tenant-context contracts for the Ibn Hayan Healthcare
 * Operating System.
 *
 * This module is the single source of truth for the shape of the
 * tenant-context API request and response payloads. Both
 * `@ibn-hayan/api` (the NestJS backend that produces the responses)
 * and `@ibn-hayan/web` (the Next.js thin client that consumes them)
 * derive their types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript
 * types are inferred from the Zod schemas via `z.infer` — no separate
 * authoritative interfaces are maintained.
 *
 * Per the fifth canonical batch specification:
 * - The active Tenant context is session-specific. The client selects
 *   a membership (not an arbitrary Tenant ID); the server enforces
 *   that the membership belongs to the authenticated user.
 * - No Organisation or Facility context fields are included. The
 *   fifth batch introduces active Tenant context only.
 * - No role or permission fields are included.
 * - The contracts never include `passwordHash`, `token`, `tokenHash`,
 *   `csrfHash`, or any credential material.
 *
 * All objects use `.strict()` so that adding an unexpected field at
 * any boundary is rejected by the Zod parse. This is the structural
 * enforcement of "every external boundary is validated" per
 * CODING_STANDARDS.md §6.
 */

// ---------------------------------------------------------------------------
// TenantContextOption
// ---------------------------------------------------------------------------

/**
 * The canonical TenantContextOption schema. Represents one Tenant
 * the authenticated user may select as their active context.
 *
 * Fields:
 * - `membershipId`: the TenantMembership ID. The client passes this
 *   back to select the context. The server verifies that the
 *   membership belongs to the authenticated user and is active.
 * - `tenantId`: the Tenant ID. Display only; the client cannot
 *   select by `tenantId` — only by `membershipId`.
 * - `tenantSlug`: short, URL-safe identifier for display.
 * - `tenantDisplayName`: human-readable name for display.
 * - `roles`: the role summaries assigned to this membership. The
 *   client may display them as chips. The array may be empty for
 *   a membership with no role assignments (fail-closed posture).
 *
 * Per the eighth canonical batch specification, the option carries
 * `roles` as an array (not a singular `role` field) because a
 * principal may hold multiple roles simultaneously per
 * PRODUCT_BIBLE.md Section 20.3.
 *
 * The schema excludes:
 * - membership `status` (the load-context flow returns only
 *   `active` memberships; the field would always be `active`);
 * - membership `createdAt` and `updatedAt` (not needed by the
 *   client);
 * - tenant `status` (same reason);
 * - any Prisma-generated field;
 * - any internal timestamp;
 * - any permission information (the client must not duplicate the
 *   role-permission matrix).
 */
export const TenantContextOptionSchema = z
  .object({
    membershipId: z.string().uuid(),
    tenantId: z.string().uuid(),
    tenantSlug: z.string().max(80),
    tenantDisplayName: z.string().max(200),
    roles: z.array(RoleSummarySchema),
  })
  .strict();

export type TenantContextOption = z.infer<typeof TenantContextOptionSchema>;

// ---------------------------------------------------------------------------
// ActiveTenantContext
// ---------------------------------------------------------------------------

/**
 * The canonical ActiveTenantContext schema. Represents the currently
 * selected Tenant context for a session, or `null` when no context
 * is selected.
 *
 * The shape is identical to {@link TenantContextOption}: the same
 * fields, including the `roles` array. A separate type is declared
 * (rather than re-using `TenantContextOption`) so that consumers
 * can distinguish "an option the user may select" from "the option
 * the user has selected" at the type level.
 *
 * Per the eighth canonical batch specification, the active context
 * carries `roles` as an array. The dashboard displays these roles
 * as chips alongside the active workspace name.
 */
export const ActiveTenantContextSchema = z
  .object({
    membershipId: z.string().uuid(),
    tenantId: z.string().uuid(),
    tenantSlug: z.string().max(80),
    tenantDisplayName: z.string().max(200),
    roles: z.array(RoleSummarySchema),
  })
  .strict();

export type ActiveTenantContext = z.infer<typeof ActiveTenantContextSchema>;

// ---------------------------------------------------------------------------
// OrganisationContextOption (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical OrganisationContextOption schema. Represents one
 * Organisation the authenticated user may select as their active
 * organisation context, given an already-selected Tenant context.
 *
 * Per ADR-015 (Scoped Organisation and Facility Context), the
 * server returns only organisations that:
 * - belong to the active Tenant;
 * - have at least one organisation-scoped or facility-scoped role
 *   assignment for the authenticated principal, OR have a
 *   tenant-scoped role assignment for the principal's membership
 *   (tenant-scoped assignments are valid across every organisation
 *   under the tenant).
 *
 * The client selects by `organisationId`; the server verifies that
 * the organisation belongs to the active Tenant and that the
 * principal holds an applicable scoped role assignment before
 * persisting the selection.
 *
 * Fields:
 * - `organisationId`: the stable UUID. The client passes this back
 *   to select the context.
 * - `code`: short, tenant-scoped, human-authored code.
 * - `displayName`: human-readable name for display.
 * - `status`: lifecycle status. Only `active` organisations are
 *   returned.
 */
export const OrganisationContextOptionSchema = z
  .object({
    organisationId: z.string().uuid(),
    code: z.string().max(50),
    displayName: z.string().max(200),
    status: z.enum(['active', 'inactive']),
  })
  .strict();

export type OrganisationContextOption = z.infer<
  typeof OrganisationContextOptionSchema
>;

// ---------------------------------------------------------------------------
// ActiveOrganisationContext (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical ActiveOrganisationContext schema. Represents the
 * currently selected Organisation context for a session, or `null`
 * when no organisation context is selected.
 *
 * The shape is identical to {@link OrganisationContextOption} minus
 * the `status` field (the active context is always `active` because
 * the server clears it when the organisation becomes inactive).
 */
export const ActiveOrganisationContextSchema = z
  .object({
    organisationId: z.string().uuid(),
    code: z.string().max(50),
    displayName: z.string().max(200),
  })
  .strict();

export type ActiveOrganisationContext = z.infer<
  typeof ActiveOrganisationContextSchema
>;

// ---------------------------------------------------------------------------
// FacilityContextOption (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical FacilityContextOption schema. Represents one
 * Facility the authenticated user may select as their active
 * facility context, given an already-selected Organisation context.
 *
 * Per ADR-015, the server returns only facilities that:
 * - belong to the active Organisation (and transitively to the
 *   active Tenant);
 * - have at least one facility-scoped role assignment for the
 *   authenticated principal, OR have an organisation-scoped
 *   assignment for the principal's membership at the active
 *   organisation, OR have a tenant-scoped assignment (which is
 *   valid across every facility under the tenant).
 *
 * The client selects by `facilityId`; the server verifies that the
 * facility belongs to the active Organisation and that the
 * principal holds an applicable scoped role assignment before
 * persisting the selection.
 *
 * Fields:
 * - `facilityId`: the stable UUID. The client passes this back to
 *   select the context.
 * - `organisationId`: the parent Organisation ID. Display only;
 *   the client cannot select by `organisationId` from a facility
 *   option — the active organisation is already selected.
 * - `code`: short, organisation-scoped, human-authored code.
 * - `displayName`: human-readable name for display.
 * - `status`: lifecycle status. Only `active` facilities are
 *   returned.
 */
export const FacilityContextOptionSchema = z
  .object({
    facilityId: z.string().uuid(),
    organisationId: z.string().uuid(),
    code: z.string().max(50),
    displayName: z.string().max(200),
    status: z.enum(['active', 'inactive']),
  })
  .strict();

export type FacilityContextOption = z.infer<
  typeof FacilityContextOptionSchema
>;

// ---------------------------------------------------------------------------
// ActiveFacilityContext (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical ActiveFacilityContext schema. Represents the
 * currently selected Facility context for a session, or `null`
 * when no facility context is selected.
 */
export const ActiveFacilityContextSchema = z
  .object({
    facilityId: z.string().uuid(),
    organisationId: z.string().uuid(),
    code: z.string().max(50),
    displayName: z.string().max(200),
  })
  .strict();

export type ActiveFacilityContext = z.infer<
  typeof ActiveFacilityContextSchema
>;

// ---------------------------------------------------------------------------
// ContextResponse
// ---------------------------------------------------------------------------

/**
 * The canonical ContextResponse schema. Returned by GET /api/v1/context
 * and by PUT /api/v1/context/tenant (after a successful selection).
 *
 * Fields:
 * - `options`: the list of Tenants the user may select. The server
 *   returns only memberships whose status is `active` AND whose
 *   Tenant's status is `active`. The list is sorted by Tenant
 *   display name, then by membership ID, for deterministic
 *   display.
 * - `active`: the currently selected context, or `null` when no
 *   context is selected. The server clears the active context
 *   server-side if the selected membership is no longer valid
 *   (suspended membership or suspended Tenant), then returns
 *   `active = null` in the same response.
 * - `organisationOptions`: the list of Organisations the user may
 *   select given the active Tenant. Empty when no Tenant is
 *   active. Per ADR-015.
 * - `activeOrganisation`: the currently selected Organisation
 *   context, or `null`. Per ADR-015.
 * - `facilityOptions`: the list of Facilities the user may select
 *   given the active Organisation. Empty when no Organisation is
 *   active. Per ADR-015.
 * - `activeFacility`: the currently selected Facility context, or
 *   `null`. Per ADR-015.
 */
export const ContextResponseSchema = z
  .object({
    options: z.array(TenantContextOptionSchema),
    active: ActiveTenantContextSchema.nullable(),
    organisationOptions: z.array(OrganisationContextOptionSchema),
    activeOrganisation: ActiveOrganisationContextSchema.nullable(),
    facilityOptions: z.array(FacilityContextOptionSchema),
    activeFacility: ActiveFacilityContextSchema.nullable(),
  })
  .strict();

export type ContextResponse = z.infer<typeof ContextResponseSchema>;

// ---------------------------------------------------------------------------
// SelectTenantContextRequest
// ---------------------------------------------------------------------------

/**
 * The canonical select-Tenant-context request schema. The body of
 * PUT /api/v1/context/tenant.
 *
 * The client selects a membership, not an arbitrary Tenant ID. The
 * server verifies that the membership exists, belongs to the
 * authenticated user, is active, and belongs to an active Tenant.
 * A selection that fails any of these checks returns a generic
 * forbidden response that does not reveal whether the membership
 * exists for another user.
 *
 * The schema is `.strict()` so that any additional field (for
 * example, a `tenantId` the client tries to supply) is rejected at
 * the boundary.
 */
export const SelectTenantContextRequestSchema = z
  .object({
    membershipId: z.string().uuid(),
  })
  .strict();

export type SelectTenantContextRequest = z.infer<
  typeof SelectTenantContextRequestSchema
>;

// ---------------------------------------------------------------------------
// SelectOrganisationContextRequest (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical select-Organisation-context request schema. The
 * body of PUT /api/v1/context/organisation.
 *
 * The client selects an organisation by its stable UUID. The
 * server verifies that the organisation exists, belongs to the
 * active Tenant, and that the principal holds an applicable
 * scoped role assignment for the selected organisation. A
 * selection that fails any of these checks returns a generic
 * forbidden response that does not reveal whether the
 * organisation exists for another user or another tenant.
 *
 * Per ADR-015, selecting a new organisation clears the active
 * facility when the facility does not belong to the newly
 * selected organisation. The cascade is performed in the same
 * Prisma transaction as the selection.
 */
export const SelectOrganisationContextRequestSchema = z
  .object({
    organisationId: z.string().uuid(),
  })
  .strict();

export type SelectOrganisationContextRequest = z.infer<
  typeof SelectOrganisationContextRequestSchema
>;

// ---------------------------------------------------------------------------
// SelectFacilityContextRequest (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical select-Facility-context request schema. The body
 * of PUT /api/v1/context/facility.
 *
 * The client selects a facility by its stable UUID. The server
 * verifies that the facility exists, belongs to the active
 * Organisation and active Tenant, and that the principal holds an
 * applicable scoped role assignment for the selected facility.
 */
export const SelectFacilityContextRequestSchema = z
  .object({
    facilityId: z.string().uuid(),
  })
  .strict();

export type SelectFacilityContextRequest = z.infer<
  typeof SelectFacilityContextRequestSchema
>;

// ---------------------------------------------------------------------------
// ClearTenantContextResponse
// ---------------------------------------------------------------------------

/**
 * The canonical clear-Tenant-context response schema. Returned by
 * DELETE /api/v1/context/tenant.
 *
 * Carries only a single `ok` field with value `true` and `active:
 * null`. No session metadata, no user identity, no timestamps. This
 * is the strict minimum the web client needs to confirm the clear
 * succeeded and to update its in-memory state.
 *
 * Per ADR-015, clearing the tenant context also clears the active
 * organisation and the active facility (the cascade is performed
 * in the same Prisma transaction). The response carries the
 * cleared organisation and facility fields for client-state
 * synchronisation.
 */
export const ClearTenantContextResponseSchema = z
  .object({
    ok: z.literal(true),
    active: z.null(),
    activeOrganisation: z.null(),
    activeFacility: z.null(),
  })
  .strict();

export type ClearTenantContextResponse = z.infer<
  typeof ClearTenantContextResponseSchema
>;

// ---------------------------------------------------------------------------
// ClearOrganisationContextResponse (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical clear-Organisation-context response schema.
 * Returned by DELETE /api/v1/context/organisation.
 *
 * Per ADR-015, clearing the active organisation also clears the
 * active facility (a facility cannot remain active without an
 * active organisation). The response carries the cleared facility
 * field for client-state synchronisation.
 */
export const ClearOrganisationContextResponseSchema = z
  .object({
    ok: z.literal(true),
    activeOrganisation: z.null(),
    activeFacility: z.null(),
  })
  .strict();

export type ClearOrganisationContextResponse = z.infer<
  typeof ClearOrganisationContextResponseSchema
>;

// ---------------------------------------------------------------------------
// ClearFacilityContextResponse (ADR-015)
// ---------------------------------------------------------------------------

/**
 * The canonical clear-Facility-context response schema. Returned
 * by DELETE /api/v1/context/facility.
 *
 * Clearing the active facility does not affect the active
 * organisation or the active tenant.
 */
export const ClearFacilityContextResponseSchema = z
  .object({
    ok: z.literal(true),
    activeFacility: z.null(),
  })
  .strict();

export type ClearFacilityContextResponse = z.infer<
  typeof ClearFacilityContextResponseSchema
>;
