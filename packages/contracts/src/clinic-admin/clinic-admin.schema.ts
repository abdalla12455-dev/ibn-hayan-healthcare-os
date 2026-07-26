import { z } from 'zod';

/**
 * Shared Clinic Admin Overview contracts for the Ibn Hayan Healthcare
 * Operating System.
 *
 * This module is the single source of truth for the shape of the
 * Clinic Administrator Overview API response. Both
 * `@ibn-hayan/api` (the NestJS backend that produces the response)
 * and `@ibn-hayan/web` (the Next.js thin client that consumes it)
 * derive their types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript
 * types are inferred from the Zod schemas via `z.infer` — no separate
 * authoritative interfaces are maintained.
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §12 (Arabic RTL) and
 * §13 (English LTR), the Clinic Administrator Overview is the
 * canonical application surface for the R09 Clinic Administrator
 * role at the canonical route `/clinic-admin`. The Overview surface
 * must display real data retrieved through the authenticated backend
 * and scoped to the active tenant, organisation, facility, and
 * authorised Clinic Administrator identity.
 *
 * Non-negotiable data rules (per live-data task specification):
 * - No hardcoded dashboard statistics, random numbers, or faker data.
 * - All business data must come from real repository-backed services
 *   and database queries.
 * - All tenant, organisation, facility, and identity context must be
 *   derived from the authenticated server-side session and approved
 *   context middleware.
 * - Missing data must be represented honestly — never as zero when
 *   zero would have a different business meaning.
 *
 * Architectural reality (verified by inspecting the canonical Prisma
 * schema at `apps/api/prisma/schema.prisma`): the current domain
 * model contains ONLY tenancy, identity, session, RBAC, and audit
 * models. There are NO models for appointments, patients, doctors,
 * inventory, billing, waiting room, or staff attendance. Per
 * `apps/api/src/app.module.ts`, no patient, billing, scheduling, or
 * inventory modules are imported in this batch. Per the live-data
 * task specification Phase 5, NO schema or migration change is
 * authorised by this task.
 *
 * Therefore the dashboard regions that the approved visual reference
 * depicts are classified per the live-data task specification:
 *
 * - Financial Snapshot → Category 3 (not yet supported). Represented
 *   as `region_availability: 'not_supported'`.
 * - Today's Appointments → Category 3. Same.
 * - Operational Alerts → Category 3. Same.
 * - Inventory Alerts → Category 3. Same.
 * - Doctors on Duty → Category 3. Same.
 * - Waiting Room Operations → Category 3. Same.
 * - Staff Attendance Summary → Category 3. Same.
 * - Appointment Actions menu → Category 4 (navigational only).
 *   Represented as `region_availability: 'navigational_only'`.
 * - Quick Actions → Category 4. Same.
 * - Active context identity (tenant, organisation, facility) →
 *   Category 1 (supported by existing contract). Returned as the
 *   `activeContext` field.
 * - Authenticated user display name → Category 1. Returned as the
 *   `administrator` field.
 *
 * When the relevant business-domain vertical slices are implemented
 * in subsequent batches, this contract will be extended to carry the
 * real business metrics. Until then, the frontend renders the
 * approved visual regions in their honest "not yet configured"
 * state, preserving the approved layout, typography, and edge
 * protection.
 *
 * All objects use `.strict()` so that adding an unexpected field at
 * any boundary is rejected by the Zod parse.
 */

// ---------------------------------------------------------------------------
// RegionAvailability
// ---------------------------------------------------------------------------

/**
 * The canonical availability states for a single Clinic Admin
 * Overview region.
 *
 * - `'supported'`: the region is backed by an existing backend
 *   contract and database model, and the response payload contains
 *   real data for the region.
 * - `'not_supported'`: the region's underlying domain or database
 *   model does not yet exist. The region must render in its honest
 *   "not yet configured" state. The response payload contains NO
 *   business data for the region.
 * - `'navigational_only'`: the region is decorative or
 *   navigational only (e.g. Quick Actions, Appointment Actions
 *   menu). It has no business data and no availability state beyond
 *   its presence in the layout.
 * - `'no_data'`: the region's underlying model exists, but the
 *   facility currently has zero records of the relevant type for
 *   the active day/scope. The region must render in its honest
 *   "empty" state. (Not used in this batch because no business
 *   models exist; reserved for future batches.)
 * - `'partially_unavailable'`: some sub-metrics of the region are
 *   available and others are not. The region must render a mixed
 *   state. (Not used in this batch; reserved for future batches.)
 */
export const RegionAvailabilitySchema = z.enum([
  'supported',
  'not_supported',
  'navigational_only',
  'no_data',
  'partially_unavailable',
]);

export type RegionAvailability = z.infer<typeof RegionAvailabilitySchema>;

// ---------------------------------------------------------------------------
// RegionKey
// ---------------------------------------------------------------------------

/**
 * The canonical stable keys for the Clinic Admin Overview regions.
 * These keys identify each region in the response payload and are
 * used by the frontend to look up the region's availability state
 * and copy. The keys are stable across all locales and must not
 * change without a new contract version.
 *
 * The key set is derived from the approved content regions listed
 * in DESIGN_BIBLE.md §12.2 and §13.2:
 * - `appointment_actions` — Appointment Actions menu
 * - `financial_snapshot` — Financial Snapshot
 * - `todays_appointments` — Today's Appointments
 * - `operational_alerts` — Operational Alerts
 * - `inventory_alerts` — Inventory Alerts
 * - `doctors_on_duty` — Doctors on Duty
 * - `waiting_room_operations` — Waiting Room Operations
 * - `staff_attendance_summary` — Staff Attendance Summary
 * - `quick_actions` — Quick Actions
 */
export const RegionKeySchema = z.enum([
  'appointment_actions',
  'financial_snapshot',
  'todays_appointments',
  'operational_alerts',
  'inventory_alerts',
  'doctors_on_duty',
  'waiting_room_operations',
  'staff_attendance_summary',
  'quick_actions',
]);

export type RegionKey = z.infer<typeof RegionKeySchema>;

// ---------------------------------------------------------------------------
// RegionStatus
// ---------------------------------------------------------------------------

/**
 * The canonical RegionStatus schema. Represents the availability
 * state of a single Clinic Admin Overview region.
 *
 * Fields:
 * - `key`: the stable region key (see {@link RegionKeySchema}).
 * - `availability`: the availability state (see
 *   {@link RegionAvailabilitySchema}).
 *
 * The schema excludes any business metric fields. When a region's
 * availability is `'supported'` or `'no_data'` or
 * `'partially_unavailable'`, future contract extensions will add
 * the region-specific payload under a separate typed field on the
 * parent response. RegionStatus itself is the availability
 * declaration only.
 */
export const RegionStatusSchema = z
  .object({
    key: RegionKeySchema,
    availability: RegionAvailabilitySchema,
  })
  .strict();

export type RegionStatus = z.infer<typeof RegionStatusSchema>;

// ---------------------------------------------------------------------------
// ActiveContextIdentity
// ---------------------------------------------------------------------------

/**
 * The canonical ActiveContextIdentity schema. Represents the
 * authenticated, server-resolved active context identity for the
 * Clinic Administrator Overview.
 *
 * Per the live-data task specification Phase 5, all tenant,
 * organisation, facility, and identity context must be derived from
 * the authenticated server-side session and approved context
 * middleware. The client MUST NOT supply these identifiers. The
 * response carries them back so the frontend can display the
 * active context without trusting client-supplied values.
 *
 * Fields:
 * - `tenantDisplayName`: the active Tenant's display name (human-
 *   readable, not the slug).
 * - `organisationDisplayName`: the active Organisation's display
 *   name.
 * - `facilityDisplayName`: the active Facility's display name.
 *
 * The schema deliberately excludes raw UUIDs. The frontend's
 * Clinic Admin shell already receives the active context (with
 * identifiers) from `/api/v1/context`; the overview response
 * carries only the display names for region rendering. This is the
 * structural enforcement of the §12.2/§13.2 privacy rule: the
 * overview must not expose more identifiers than necessary.
 *
 * Per §12.2 and §13.2, tenant, organisation, and facility names
 * are not patient data and may be displayed. Patient-level data
 * (names, diagnoses, phone numbers, addresses) is never included
 * in this contract.
 */
export const ActiveContextIdentitySchema = z
  .object({
    tenantDisplayName: z.string().min(1).max(200),
    organisationDisplayName: z.string().min(1).max(200),
    facilityDisplayName: z.string().min(1).max(200),
  })
  .strict();

export type ActiveContextIdentity = z.infer<
  typeof ActiveContextIdentitySchema
>;

// ---------------------------------------------------------------------------
// AdministratorIdentity
// ---------------------------------------------------------------------------

/**
 * The canonical AdministratorIdentity schema. Represents the
 * authenticated Clinic Administrator's display identity.
 *
 * Fields:
 * - `displayName`: the user's display name (already human-readable
 *   from the User table). Used to greet the administrator in the
 *   overview header.
 *
 * The schema excludes the user's email, user ID, session ID, role
 * assignments, and any credential material. The frontend's shell
 * already receives the session shape from `/api/v1/auth/session`;
 * the overview response carries only the display name for the
 * greeting.
 */
export const AdministratorIdentitySchema = z
  .object({
    displayName: z.string().min(1).max(200),
  })
  .strict();

export type AdministratorIdentity = z.infer<
  typeof AdministratorIdentitySchema
>;

// ---------------------------------------------------------------------------
// ClinicAdminOverviewResponse
// ---------------------------------------------------------------------------

/**
 * The canonical Clinic Admin Overview response schema. Returned by
 * `GET /api/v1/clinic-admin/overview`.
 *
 * The response is the single source of truth for the Overview
 * surface's data state. The frontend renders the approved visual
 * regions (DESIGN_BIBLE.md §12/§13) based on the `regions` array's
 * availability declarations and the `activeContext` /
 * `administrator` identity fields.
 *
 * Fields:
 * - `activeContext`: the server-resolved active tenant, organisation,
 *   and facility display names (Category 1 — supported by existing
 *   context contract).
 * - `administrator`: the authenticated Clinic Administrator's
 *   display name (Category 1 — supported by existing session
 *   contract).
 * - `regions`: the availability declaration for each approved
 *   region. The array contains exactly one entry per region key
 *   listed in {@link RegionKeySchema}. The order matches the
 *   canonical reading order from §12.2 / §13.2.
 * - `generatedAt`: the server-side ISO 8601 timestamp at which the
 *   response was generated. Used by the frontend to display a
 *   "last refreshed" affordance and to detect stale cache entries
 *   (per live-data task specification Phase 6: "Do not display
 *   stale data as current data without an explicit approved cache
 *   policy").
 *
 * The schema is `.strict()` so that adding an unexpected field at
 * the boundary is rejected by the Zod parse.
 *
 * Per the live-data task specification Phase 5:
 * - The endpoint requires an authenticated session.
 * - The endpoint requires an active tenant + organisation + facility
 *   context.
 * - The endpoint requires the `clinic_admin_overview:view`
 *   permission, which is granted ONLY to R09_ADMINISTRATOR.
 * - The endpoint does NOT accept tenant, organisation, or facility
 *   identifiers from the request body or query string.
 * - The endpoint emits an audit event `clinic_admin.overview.viewed`
 *   on every successful response.
 *
 * Per the live-data task specification Phase 6, the frontend uses
 * the response to render:
 * - the active context identity in the overview header;
 * - the administrator greeting in the overview header;
 * - each region in its approved location with its declared
 *   availability state.
 */
export const ClinicAdminOverviewResponseSchema = z
  .object({
    activeContext: ActiveContextIdentitySchema,
    administrator: AdministratorIdentitySchema,
    regions: z.array(RegionStatusSchema),
    generatedAt: z.string().datetime(),
  })
  .strict();

export type ClinicAdminOverviewResponse = z.infer<
  typeof ClinicAdminOverviewResponseSchema
>;

// ---------------------------------------------------------------------------
// ClinicAdminOverviewErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the Clinic Admin Overview
 * endpoint. Used for 401 (session required) and 403 (forbidden —
 * missing active context, missing R09 role, or CSRF failure)
 * responses.
 *
 * The error shape mirrors the existing auth/context error envelope
 * (see `apps/api/src/modules/auth/auth.errors.ts`) so that the
 * frontend can use a single error-handling code path.
 *
 * Per the live-data task specification, error responses must NOT
 * reveal:
 * - whether the session exists for another user;
 * - whether the user holds roles in another tenant;
 * - the specific authorisation failure reason;
 * - any internal stack trace or environment detail.
 *
 * Every authorisation failure returns the same generic
 * `AUTHORIZATION_FORBIDDEN` code with a non-revealing message.
 */
export const ClinicAdminOverviewErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'AUTH_SESSION_REQUIRED',
          'AUTHORIZATION_FORBIDDEN',
          'CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type ClinicAdminOverviewErrorResponse = z.infer<
  typeof ClinicAdminOverviewErrorResponseSchema
>;
