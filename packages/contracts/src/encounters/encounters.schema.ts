import { z } from 'zod';

/**
 * Shared Encounters contracts for the Ibn Hayan Healthcare Operating
 * System (Stage 2A — BC02 Encounter Foundation).
 *
 * This module is the single source of truth for the shape of the
 * Encounters API request/response contracts. Both `@ibn-hayan/api`
 * (the NestJS backend) and `@ibn-hayan/web` (the Next.js thin client)
 * derive their types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript
 * types are inferred from the Zod schemas via `z.infer` — no separate
 * authoritative interfaces are maintained.
 *
 * All objects use `.strict()` so that adding an unexpected field at
 * any boundary is rejected by the Zod parse. This prevents the client
 * from overriding scope (tenantId, organisationId, facilityId),
 * status, or actor identifiers via the request body.
 */

// ---------------------------------------------------------------------------
// EncounterStatus
// ---------------------------------------------------------------------------

/**
 * The canonical encounter lifecycle statuses as persisted in the
 * database. These values are the authoritative enumeration for
 * encounter state and are defined in
 * download/docs/03_DOMAIN/STATUS_CODES.md §5.1 and
 * download/docs/03_DOMAIN/ENUMS.md §4.1 (EncounterStatus, Closed enum).
 *
 * Database values are lowercase (matching the AppointmentStatus
 * convention).
 */
export const EncounterStatusSchema = z.enum([
  'planned',
  'arrived',
  'in_progress',
  'on_leave',
  'finished',
  'cancelled',
]);

export type EncounterStatus = z.infer<typeof EncounterStatusSchema>;

// ---------------------------------------------------------------------------
// EncounterType
// ---------------------------------------------------------------------------

/**
 * The canonical encounter type (ENUMS.md §4.1, EncounterType,
 * Open-with-Council). Default `outpatient`.
 */
export const EncounterTypeSchema = z.enum([
  'outpatient',
  'inpatient',
  'emergency',
  'telehealth',
  'home_health',
  'day_care',
]);

export type EncounterType = z.infer<typeof EncounterTypeSchema>;

// ---------------------------------------------------------------------------
// EncounterPriority
// ---------------------------------------------------------------------------

/**
 * The canonical encounter priority (ENUMS.md §4.1, EncounterPriority,
 * Closed). Default `routine`.
 */
export const EncounterPrioritySchema = z.enum([
  'routine',
  'urgent',
  'emergency',
]);

export type EncounterPriority = z.infer<typeof EncounterPrioritySchema>;

// ---------------------------------------------------------------------------
// EncounterResponse (shared shape)
// ---------------------------------------------------------------------------

/**
 * The canonical encounter response schema. Returned by the create,
 * arrive, start, on-leave, resume, finish, cancel, and view endpoints.
 *
 * Exposes ONLY the fields that are persisted in the encounters table
 * and are relevant to the encounter foundation. Scope fields
 * (tenantId, organisationId, facilityId) and audit timestamps
 * (createdAt, updatedAt) are NOT exposed to avoid leaking internal
 * scope and to match the appointment response shape.
 *
 * `appointmentId` is nullable (emergency/walk-in encounters have no
 * appointment).
 */
export const EncounterResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    appointmentId: z.string().uuid().nullable(),
    encounterType: EncounterTypeSchema,
    status: EncounterStatusSchema,
    priority: EncounterPrioritySchema,
  })
  .strict();

export type EncounterResponse = z.infer<typeof EncounterResponseSchema>;

// ---------------------------------------------------------------------------
// CreateEncounterRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for creating an encounter via
 * `POST /api/v1/encounters`.
 *
 * All scope (tenantId, organisationId, facilityId) is derived from the
 * authenticated session context. The request body contains ONLY the
 * patient, provider, optional appointment, type, priority, and (for
 * emergency) justification.
 *
 * Fields:
 * - `patientId`: the UUID of the patient for the encounter.
 * - `providerId`: the UUID of the provider for the encounter.
 * - `appointmentId`: optional UUID of the appointment that triggered
 *   the encounter. Omitted/null for emergency/walk-in encounters. When
 *   supplied, it must reference an appointment in the authenticated
 *   scope; the database enforces one-encounter-per-appointment.
 * - `encounterType`: the structural encounter type. Defaults to
 *   `outpatient` if omitted.
 * - `priority`: the queue-routing priority. Defaults to `routine` if
 *   omitted.
 * - `emergencyJustification`: required when the encounter is an
 *   emergency (encounterType === 'emergency' OR priority ===
 *   'emergency'). This is the canonical basis for the consent-gate
 *   emergency carve-out (BR-BC15-REG-001 "except emergency",
 *   BR-BC15-REG-003 "documented with reason"). It is carried in the
 *   audit event metadata, not persisted as a clinical record. Must be
 *   1-1000 characters when supplied.
 *
 * The request does NOT include:
 * - tenantId, organisationId, or facilityId (derived from session)
 * - status (always `planned` for a fresh encounter)
 * - actorId (derived from the authenticated session)
 * - patient or provider demographics
 */
export const CreateEncounterRequestSchema = z
  .object({
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    appointmentId: z.string().uuid().nullable().optional(),
    encounterType: EncounterTypeSchema.default('outpatient'),
    priority: EncounterPrioritySchema.default('routine'),
    emergencyJustification: z.string().min(1).max(1000).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const isEmergency =
        data.encounterType === 'emergency' || data.priority === 'emergency';
      if (isEmergency) {
        return (
          data.emergencyJustification !== null &&
          data.emergencyJustification !== undefined &&
          data.emergencyJustification.length > 0
        );
      }
      return true;
    },
    {
      message:
        'emergencyJustification is required for emergency encounters (encounterType=emergency or priority=emergency)',
      path: ['emergencyJustification'],
    },
  );

export type CreateEncounterRequest = z.infer<typeof CreateEncounterRequestSchema>;

// ---------------------------------------------------------------------------
// CreateEncounterResponse
// ---------------------------------------------------------------------------

/**
 * The canonical response schema for a successful encounter creation.
 * Identical in shape to {@link EncounterResponseSchema}.
 */
export const CreateEncounterResponseSchema = EncounterResponseSchema;

export type CreateEncounterResponse = z.infer<
  typeof CreateEncounterResponseSchema
>;

// ---------------------------------------------------------------------------
// EncounterErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the encounter endpoints.
 *
 * Error codes:
 * - `ENCOUNTER_VALIDATION_ERROR`: invalid request body (missing/invalid
 *   fields, missing emergency justification for an emergency encounter).
 * - `ENCOUNTER_NOT_FOUND`: the encounter does not exist or is not
 *   accessible in the authenticated tenant, organisation, or facility.
 *   The same error is returned regardless of whether the encounter does
 *   not exist or exists in another scope (no existence leak).
 * - `ENCOUNTER_INVALID_TRANSITION`: the encounter is in a source state
 *   that is not canonically permitted for this transition, OR (for
 *   non-terminal targets) the encounter is already in the target state.
 *   For terminal targets (finished/cancelled), an already-terminal
 *   encounter is an idempotent success (not this error).
 * - `ENCOUNTER_PATIENT_NOT_FOUND`: the patient does not exist or is not
 *   accessible in the authenticated tenant (no existence leak).
 * - `ENCOUNTER_PROVIDER_NOT_FOUND`: the provider does not exist, is in
 *   another tenant, is not active, or is not assigned to the
 *   authenticated facility (no existence leak).
 * - `ENCOUNTER_APPOINTMENT_NOT_FOUND`: the supplied appointmentId does
 *   not exist or is not accessible in the authenticated scope (no
 *   existence leak).
 * - `ENCOUNTER_DUPLICATE_APPOINTMENT`: an encounter already exists for
 *   the supplied appointmentId in the authenticated scope.
 * - `ENCOUNTER_CONSENT_REQUIRED`: the consent gate is enforced and
 *   consent could not be verified (no consent persistence exists yet).
 *   The encounter is blocked (fail-safe). The emergency carve-out is
 *   available via an emergency encounterType/priority with justification.
 * - `ENCOUNTER_EMERGENCY_JUSTIFICATION_REQUIRED`: an emergency encounter
 *   was requested without the required justification.
 */
export const EncounterErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'ENCOUNTER_VALIDATION_ERROR',
          'ENCOUNTER_NOT_FOUND',
          'ENCOUNTER_INVALID_TRANSITION',
          'ENCOUNTER_PATIENT_NOT_FOUND',
          'ENCOUNTER_PROVIDER_NOT_FOUND',
          'ENCOUNTER_APPOINTMENT_NOT_FOUND',
          'ENCOUNTER_DUPLICATE_APPOINTMENT',
          'ENCOUNTER_CONSENT_REQUIRED',
          'ENCOUNTER_EMERGENCY_JUSTIFICATION_REQUIRED',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type EncounterErrorResponse = z.infer<typeof EncounterErrorResponseSchema>;

// ---------------------------------------------------------------------------
// Lifecycle request body (arrive, start, on-leave, resume, finish, cancel)
// ---------------------------------------------------------------------------

/**
 * The canonical request-body schema for the encounter lifecycle
 * endpoints (arrive, start, on-leave, resume, finish).
 *
 * These five commands accept NO business input besides the encounter ID
 * (supplied in the URL path). The body MUST be empty, absent, or an
 * empty JSON object. Any supplied field — including `tenantId`,
 * `organisationId`, `facilityId`, `status`, `actorId`, or any other
 * key — is rejected as an `ENCOUNTER_VALIDATION_ERROR` (400). This
 * prevents scope override, status override, and actor override via the
 * request body.
 */
export const EncounterLifecycleRequestBodySchema = z.union([
  z.undefined(),
  z.null(),
  z.object({}).strict(),
]);

export type EncounterLifecycleRequestBody = z.infer<
  typeof EncounterLifecycleRequestBodySchema
>;

/**
 * The canonical request-body schema for the encounter cancel endpoint.
 *
 * The cancel endpoint accepts ONLY an optional `reason` (free-text,
 * matching the appointment cancellation-reason pattern). Per
 * STATUS_CODES.md §10.2, cancellation is "recorded with reason and
 * actor". The reason is carried in the audit event metadata, not
 * persisted as a clinical record. The actor is derived from the
 * authenticated session.
 *
 * The schema is `.strict()` so that adding an unexpected field (e.g.
 * `status`, `tenantId`, `actorId`) is rejected.
 */
export const CancelEncounterRequestSchema = z
  .object({
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

export type CancelEncounterRequest = z.infer<typeof CancelEncounterRequestSchema>;
