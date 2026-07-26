import { z } from 'zod';
import { RoleCodeSchema } from '../authorization/authorization.schema.js';

/**
 * Shared Demo Role Preview Mode contracts for the Ibn Hayan
 * Healthcare Operating System.
 *
 * This module is the single source of truth for the shape of the
 * role-preview API request and response payloads. Both
 * `@ibn-hayan/api` (the NestJS backend that produces the responses)
 * and `@ibn-hayan/web` (the Next.js thin client that consumes them)
 * derive their types from the schemas defined here.
 *
 * Per the Demo Role Preview Mode v1 specification:
 * - The feature is **development-only**. The schemas are defined
 *   here so that the contract surface is visible, but the
 *   endpoints that produce these payloads are unavailable in
 *   production.
 * - The contracts never include passwords, password hashes, session
 *   tokens, CSRF tokens, or any credential material.
 * - The contracts never include raw database UUIDs for the preview
 *   identities, preview memberships, or preview role assignments.
 *   The frontend receives only safe display labels.
 * - The role codes are restricted to the canonical fourteen
 *   platform roles (R01 through R14) via `RoleCodeSchema`. Unknown
 *   role codes are rejected at the contract boundary.
 *
 * All objects use `.strict()` so that adding an unexpected field at
 * any boundary is rejected by the Zod parse. This is the structural
 * enforcement of "every external boundary is validated" per
 * CODING_STANDARDS.md §6.
 */

// ---------------------------------------------------------------------------
// RolePreviewRoleCard
// ---------------------------------------------------------------------------

/**
 * One canonical preview role card. Returned as part of the
 * availability response and the current-preview-role response.
 *
 * Fields:
 * - `code`: the stable machine-readable role code (e.g.
 *   `R09_ADMINISTRATOR`). The frontend passes this back to select
 *   the role.
 * - `displayNameAr` / `displayNameEn`: the canonical Arabic and
 *   English display names from the role catalogue. The frontend
 *   renders the one matching the current language.
 * - `shortCode`: the role's short catalogue number (e.g. `R09`).
 *   For display only.
 * - `category`: the role's category (clinical / operational /
 *   administrative / platform). For display only.
 * - `scopeLevel`: the canonical scope level at which the preview
 *   identity's role assignment is created. For display only.
 * - `interfaceImplemented`: `true` when a canonical role-specific
 *   interface exists in the repository. Per the Demo Role Preview
 *   Mode v1 specification, only R09 (Clinic Administrator at
 *   `/clinic-admin`) is implemented; every other role is honestly
 *   marked `false`.
 * - `interfacePath`: the canonical route path when
 *   `interfaceImplemented` is `true` (e.g. `/clinic-admin` for
 *   R09); `null` otherwise.
 *
 * The schema excludes any internal database UUID, any preview
 * identity's email address, any membership ID, any tenant ID, and
 * any credential material. The frontend receives only safe display
 * labels and the stable role code.
 */
export const RolePreviewRoleCardSchema = z
  .object({
    code: RoleCodeSchema,
    displayNameAr: z.string().min(1).max(200),
    displayNameEn: z.string().min(1).max(200),
    shortCode: z.string().min(3).max(4),
    category: z
      .enum(['clinical', 'operational', 'administrative', 'platform']),
    scopeLevel: z.enum(['tenant', 'organisation', 'facility']),
    interfaceImplemented: z.boolean(),
    interfacePath: z.string().min(1).max(200).nullable(),
  })
  .strict();

export type RolePreviewRoleCard = z.infer<typeof RolePreviewRoleCardSchema>;

// ---------------------------------------------------------------------------
// RolePreviewAvailabilityResponse
// ---------------------------------------------------------------------------

/**
 * The canonical role-preview availability response schema. Returned
 * by `GET /api/v1/dev/role-preview`.
 *
 * Carries a single boolean field `enabled`. When `enabled` is
 * `false`, the role-preview feature is unavailable (production, or
 * development with the flag disabled). When `enabled` is `true`,
 * the feature is available and the response carries the list of
 * canonical preview role cards.
 *
 * The `enabled` boolean is the **authoritative** signal the
 * frontend consults. A public frontend environment variable must
 * never be sufficient to enable the feature; the frontend must
 * consult this endpoint.
 *
 * The `roles` array is present only when `enabled` is `true`. When
 * `enabled` is `false`, the array is empty (the frontend renders
 * the safe unavailable result without iterating the array).
 */
export const RolePreviewAvailabilityResponseSchema = z
  .object({
    enabled: z.boolean(),
    roles: z.array(RolePreviewRoleCardSchema),
  })
  .strict();

export type RolePreviewAvailabilityResponse = z.infer<
  typeof RolePreviewAvailabilityResponseSchema
>;

// ---------------------------------------------------------------------------
// SelectPreviewRoleRequest
// ---------------------------------------------------------------------------

/**
 * The canonical select-preview-role request schema. The body of
 * `POST /api/v1/dev/role-preview/select`.
 *
 * The client supplies only the canonical role code and (for the
 * initial logged-out bootstrap flow) the opaque `challengeId`
 * returned by `GET /api/v1/dev/role-preview/bootstrap`. The server
 * derives the preview user, membership, tenant, organisation,
 * facility, and role assignment from the role code via the preview
 * identity catalogue. The client CANNOT supply any of:
 * - `userId`
 * - `membershipId`
 * - `tenantId`
 * - `organisationId`
 * - `facilityId`
 * - permission codes
 * - role assignments
 * - session IDs
 * - password hashes
 *
 * The `challengeId` field is OPTIONAL. When present, the server
 * attempts the logged-out bootstrap flow: it verifies the HttpOnly
 * bootstrap cookie, consumes the one-time challenge, and creates
 * the first preview session. When absent, the server falls back to
 * the existing session-bound switching flow (which requires a
 * valid session cookie and a valid `X-CSRF-Token` header).
 *
 * The `.strict()` modifier rejects any additional field at the
 * boundary, which is the structural enforcement of the "no
 * arbitrary IDs accepted" rule.
 */
export const SelectPreviewRoleRequestSchema = z
  .object({
    roleCode: RoleCodeSchema,
    /**
     * The opaque `challengeId` returned by
     * `GET /api/v1/dev/role-preview/bootstrap`. Required for the
     * initial logged-out bootstrap flow; optional for subsequent
     * session-bound switching (in which case the server reads the
     * session cookie and the `X-CSRF-Token` header instead).
     */
    challengeId: z.string().min(1).max(200).optional(),
  })
  .strict();

export type SelectPreviewRoleRequest = z.infer<
  typeof SelectPreviewRoleRequestSchema
>;

// ---------------------------------------------------------------------------
// BootstrapChallengeResponse
// ---------------------------------------------------------------------------

/**
 * The canonical bootstrap-challenge response schema. Returned by
 * `GET /api/v1/dev/role-preview/bootstrap`.
 *
 * Carries only safe challenge metadata:
 * - `ok`: always `true` when the bootstrap is available.
 * - `challengeId`: an opaque string the client must echo back in
 *   the `POST /select` body. The `challengeId` is NOT secret on
 *   its own; the proof-of-possession is the HttpOnly bootstrap
 *   cookie that the server sets in the same response. The
 *   `challengeId` is used as a server-side lookup key so that the
 *   server can find the right challenge state when the cookie
 *   arrives.
 * - `expiresInMs`: the challenge's remaining lifetime in
 *   milliseconds. The client MAY display a countdown so the
 *   operator knows how long they have to select a role. The
 *   server-side expiry is authoritative; the client's countdown is
 *   advisory.
 *
 * The response NEVER includes:
 * - the raw nonce (it lives only in the HttpOnly cookie);
 * - the nonce hash (it is server-side state);
 * - any password, session token, CSRF token, or internal UUID;
 * - any preview identity's email address or display name.
 */
export const BootstrapChallengeResponseSchema = z
  .object({
    ok: z.literal(true),
    challengeId: z.string().min(1).max(200),
    expiresInMs: z.number().int().nonnegative(),
  })
  .strict();

export type BootstrapChallengeResponse = z.infer<
  typeof BootstrapChallengeResponseSchema
>;

// ---------------------------------------------------------------------------
// SelectPreviewRoleResponse
// ---------------------------------------------------------------------------

/**
 * The canonical select-preview-role response schema. Returned by
 * `POST /api/v1/dev/role-preview/select` after the server has
 * created or replaced the authenticated preview session for the
 * selected canonical role.
 *
 * Carries:
 * - `selectedRole`: the role card for the newly selected role.
 * - `previewTenant`: the preview tenant's display name (no UUID).
 * - `previewOrganisation`: the preview organisation's display name
 *   (no UUID).
 * - `previewFacility`: the preview facility's display name (no
 *   UUID).
 * - `interfacePath`: the canonical route path to navigate to when
 *   `selectedRole.interfaceImplemented` is `true`; `null`
 *   otherwise. The frontend consults this to decide whether to
 *   navigate to `/clinic-admin` (for R09) or to render the honest
 *   role-status view (for every other role).
 *
 * The response NEVER includes:
 * - the raw session token (it lives only in the HttpOnly cookie);
 * - the CSRF token (issued separately via `GET /api/v1/auth/csrf`);
 * - any password or password hash;
 * - any internal UUID for the preview identity, membership, tenant,
 *   organisation, facility, or role assignment;
 * - any permission codes (the frontend must not duplicate the
 *   role-permission matrix).
 */
export const SelectPreviewRoleResponseSchema = z
  .object({
    selectedRole: RolePreviewRoleCardSchema,
    previewTenant: z.string().min(1).max(200),
    previewOrganisation: z.string().min(1).max(200),
    previewFacility: z.string().min(1).max(200),
    interfacePath: z.string().min(1).max(200).nullable(),
  })
  .strict();

export type SelectPreviewRoleResponse = z.infer<
  typeof SelectPreviewRoleResponseSchema
>;

// ---------------------------------------------------------------------------
// CurrentPreviewRoleResponse
// ---------------------------------------------------------------------------

/**
 * The canonical current-preview-role response schema. Returned by
 * `GET /api/v1/dev/role-preview/current`.
 *
 * Carries:
 * - `active`: `true` when the authenticated session belongs to a
 *   preview identity; `false` otherwise. The frontend consults
 *   this boolean to decide whether to render the role switcher in
 *   the Clinic Admin header.
 * - `selectedRole`: the role card for the currently selected role,
 *   or `null` when `active` is `false`.
 * - `previewTenant` / `previewOrganisation` / `previewFacility`:
 *   the preview workspace's display names, or `null` when `active`
 *   is `false`.
 *
 * The response NEVER includes any credential material or internal
 * UUID.
 */
export const CurrentPreviewRoleResponseSchema = z
  .object({
    active: z.boolean(),
    selectedRole: RolePreviewRoleCardSchema.nullable(),
    previewTenant: z.string().min(1).max(200).nullable(),
    previewOrganisation: z.string().min(1).max(200).nullable(),
    previewFacility: z.string().min(1).max(200).nullable(),
  })
  .strict();

export type CurrentPreviewRoleResponse = z.infer<
  typeof CurrentPreviewRoleResponseSchema
>;

// ---------------------------------------------------------------------------
// EndPreviewRoleResponse
// ---------------------------------------------------------------------------

/**
 * The canonical end-preview-role response schema. Returned by
 * `POST /api/v1/dev/role-preview/end` after the server has revoked
 * the preview session and cleared the cookie.
 *
 * Carries only a single `ok` field with value `true`. No session
 * metadata, no user identity, no timestamps.
 */
export const EndPreviewRoleResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();

export type EndPreviewRoleResponse = z.infer<
  typeof EndPreviewRoleResponseSchema
>;

// ---------------------------------------------------------------------------
// RolePreviewErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical role-preview error response schema. Returned for:
 * - Role Preview Mode disabled (production or flag off).
 * - Unknown role code at the select endpoint.
 * - Caller attempts to supply a forbidden field (userId,
 *   membershipId, etc.).
 * - Missing or invalid session at the current / select / end
 *   endpoints.
 * - Missing or invalid CSRF token at the select / end endpoints.
 * - Disallowed Origin at the select / end endpoints.
 * - Caller is not currently in a preview session (for the end
 *   endpoint).
 *
 * All of the above produce the same response shape. The `code` is a
 * stable machine-readable string; the `message` is a generic
 * human-readable string that does NOT distinguish between the
 * conditions.
 */
export const RolePreviewErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'ROLE_PREVIEW_DISABLED',
          'ROLE_PREVIEW_ROLE_UNKNOWN',
          'ROLE_PREVIEW_SESSION_REQUIRED',
          'ROLE_PREVIEW_CSRF_INVALID',
          'ROLE_PREVIEW_ORIGIN_DISALLOWED',
          'ROLE_PREVIEW_NOT_ACTIVE',
          'ROLE_PREVIEW_REQUEST_INVALID',
          'ROLE_PREVIEW_BOOTSTRAP_EXPIRED',
          'ROLE_PREVIEW_BOOTSTRAP_REPLAY',
          'ROLE_PREVIEW_BOOTSTRAP_INVALID',
          'ROLE_PREVIEW_DATABASE_IDENTITY_INVALID',
        ]),
        message: z.string(),
      })
      .strict(),
  })
  .strict();

export type RolePreviewErrorResponse = z.infer<
  typeof RolePreviewErrorResponseSchema
>;
