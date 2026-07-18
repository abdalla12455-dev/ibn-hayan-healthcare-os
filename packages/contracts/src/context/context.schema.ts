import { z } from 'zod';

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
 *
 * The schema excludes:
 * - membership `status` (the load-context flow returns only
 *   `active` memberships; the field would always be `active`);
 * - membership `createdAt` and `updatedAt` (not needed by the
 *   client);
 * - tenant `status` (same reason);
 * - any Prisma-generated field;
 * - any internal timestamp;
 * - any Organisation or Facility field;
 * - any role or permission field.
 */
export const TenantContextOptionSchema = z
  .object({
    membershipId: z.string().uuid(),
    tenantId: z.string().uuid(),
    tenantSlug: z.string().max(80),
    tenantDisplayName: z.string().max(200),
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
 * four fields. A separate type is declared (rather than re-using
 * `TenantContextOption`) so that consumers can distinguish "an
 * option the user may select" from "the option the user has
 * selected" at the type level.
 */
export const ActiveTenantContextSchema = z
  .object({
    membershipId: z.string().uuid(),
    tenantId: z.string().uuid(),
    tenantSlug: z.string().max(80),
    tenantDisplayName: z.string().max(200),
  })
  .strict();

export type ActiveTenantContext = z.infer<typeof ActiveTenantContextSchema>;

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
 */
export const ContextResponseSchema = z
  .object({
    options: z.array(TenantContextOptionSchema),
    active: ActiveTenantContextSchema.nullable(),
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
 */
export const ClearTenantContextResponseSchema = z
  .object({
    ok: z.literal(true),
    active: z.null(),
  })
  .strict();

export type ClearTenantContextResponse = z.infer<
  typeof ClearTenantContextResponseSchema
>;
