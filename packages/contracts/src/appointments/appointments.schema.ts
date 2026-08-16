import { z } from 'zod';

/**
 * Shared Appointments contracts for the Ibn Hayan Healthcare Operating
 * System.
 *
 * This module is the single source of truth for the shape of the
 * "Today's Appointments" API response and appointment booking contracts.
 * Both `@ibn-hayan/api` (the NestJS backend that produces the response)
 * and `@ibn-hayan/web` (the Next.js thin client that consumes it)
 * derive their types from the schemas defined here.
 *
 * Per ADR-012 and CODING_STANDARDS.md Section 6, Zod is the validation
 * library ratified for contract and boundary validation. TypeScript
 * types are inferred from the Zod schemas via `z.infer` — no separate
 * authoritative interfaces are maintained.
 *
 * Per the Stage 1B implementation specification, this module provides
 * the read-only "Today's Appointments" response contract for the
 * R09 Clinic Administrator role. The endpoint `GET /api/v1/appointments/today`
 * returns appointments for the authenticated facility's current local
 * calendar day.
 *
 * Per the Stage 1C implementation specification, this module also
 * provides the appointment booking request and response contracts for
 * R06 Receptionist, R07 Scheduler, and R09 Clinic Administrator roles.
 * The endpoint `POST /api/v1/appointments` creates a new appointment
 * for the authenticated facility.
 *
 * All objects use `.strict()` so that adding an unexpected field at
 * any boundary is rejected by the Zod parse.
 */

// ---------------------------------------------------------------------------
// AppointmentStatus
// ---------------------------------------------------------------------------

/**
 * The canonical appointment lifecycle statuses as persisted in the
 * database. These values are the authoritative enumeration for
 * appointment state and are defined in
 * `download/docs/07_MODULES/APPOINTMENTS.md` Section 1.
 */
export const AppointmentStatusSchema = z.enum([
  'booked',
  'confirmed',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

// ---------------------------------------------------------------------------
// AppointmentSummary
// ---------------------------------------------------------------------------

/**
 * The canonical AppointmentSummary schema. Represents a single
 * appointment entry in the "Today's Appointments" response.
 *
 * This schema exposes ONLY the fields that are persisted in the
 * appointments table and are relevant to the read-only "Today's
 * Appointments" view:
 * - `id`: the appointment's stable UUID.
 * - `patientId`: the logical patient identifier (no join to Patient module).
 * - `providerId`: the logical provider identifier (no join to Workforce module).
 * - `scheduledStart`: the appointment's scheduled start time in UTC.
 * - `scheduledEnd`: the appointment's scheduled end time in UTC.
 * - `status`: the current lifecycle status.
 * - `typeCode`: the appointment type code.
 *
 * Per the Stage 1B specification, this schema does NOT include:
 * - Patient names, provider names, or specialties (Patient/Workforce modules).
 * - Payment status or billing information (Billing module).
 * - Wait times or real-time status (Waiting Room module).
 * - Any other clinical or operational details.
 */
export const AppointmentSummarySchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    status: AppointmentStatusSchema,
    typeCode: z.string().min(1).max(80),
  })
  .strict();

export type AppointmentSummary = z.infer<typeof AppointmentSummarySchema>;

// ---------------------------------------------------------------------------
// TodayAppointmentsResponse
// ---------------------------------------------------------------------------

/**
 * The canonical "Today's Appointments" response schema. Returned by
 * `GET /api/v1/appointments/today`.
 *
 * The response contains appointments for the authenticated facility's
 * current local calendar day, ordered by scheduled start time (ascending)
 * with appointment ID as a stable tie-breaker.
 *
 * Fields:
 * - `localDate`: the facility-local calendar date for which appointments
 *   are being returned (e.g. '2026-08-01').
 * - `timezone`: the IANA timezone identifier of the facility (e.g.
 *   'Asia/Baghdad', 'Europe/London').
 * - `generatedAt`: the server-side ISO 8601 timestamp at which the
 *   response was generated.
 * - `appointments`: the list of appointments scheduled to begin on
 *   the local date. Ordered by `scheduledStart` ascending, with `id`
 *   ascending as a stable tie-breaker.
 *
 * An empty day returns a successful response with an empty
 * `appointments` array.
 *
 * The schema is `.strict()` so that adding an unexpected field at
 * the boundary is rejected by the Zod parse.
 */
export const TodayAppointmentsResponseSchema = z
  .object({
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: z.string().min(1).max(60),
    generatedAt: z.string().datetime(),
    appointments: z.array(AppointmentSummarySchema),
  })
  .strict();

export type TodayAppointmentsResponse = z.infer<
  typeof TodayAppointmentsResponseSchema
>;

// ---------------------------------------------------------------------------
// ConfigurationRequiredError
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the "Today's Appointments"
 * endpoint when the facility timezone is not configured.
 *
 * When `Facility.timezone` is null, the endpoint returns HTTP 422 with
 * this error code. The response does not reveal which dimension of
 * configuration is missing beyond the facility-level scope.
 *
 * Per the Stage 1B implementation specification, the endpoint does
 * NOT silently fall back to UTC, tenant timezone, server timezone,
 * browser timezone, or any hard-coded default.
 */
export const AppointmentConfigurationRequiredErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.literal('APPOINTMENT_CONFIGURATION_REQUIRED'),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type AppointmentConfigurationRequiredErrorResponse = z.infer<
  typeof AppointmentConfigurationRequiredErrorResponseSchema
>;

// ---------------------------------------------------------------------------
// AppointmentOverviewErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the "Today's Appointments"
 * endpoint's authorization failures and context-required errors.
 *
 * Uses the same error envelope as the Clinic Admin Overview endpoint
 * so the frontend can use a single error-handling code path.
 */
export const AppointmentOverviewErrorResponseSchema = z
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

export type AppointmentOverviewErrorResponse = z.infer<
  typeof AppointmentOverviewErrorResponseSchema
>;

// ---------------------------------------------------------------------------
// BookAppointmentRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for booking an appointment via
 * `POST /api/v1/appointments`.
 *
 * All scope (tenantId, organisationId, facilityId) is derived from
 * the authenticated session context. The request body contains ONLY
 * the patient, provider, timing, and type information required to
 * create an appointment.
 *
 * Fields:
 * - `patientId`: the UUID of the patient for the appointment.
 * - `providerId`: the UUID of the provider for the appointment.
 * - `scheduledStart`: the appointment start time in ISO 8601 format
 *   with UTC offset (e.g. '2026-08-01T09:00:00.000Z').
 * - `scheduledEnd`: the appointment end time in ISO 8601 format
 *   with UTC offset. Must be strictly after scheduledStart.
 * - `typeCode`: the appointment type code (e.g. 'consultation',
 *   'follow-up', 'procedure').
 *
 * Per the Stage 1C specification, the request does NOT include:
 * - Tenant, organisation, or facility identifiers (derived from session)
 * - Status (always 'booked' for new appointments)
 * - Patient or provider names (logical identifiers only)
 * - Billing or payment information
 * - Reminder or notification preferences
 */
export const BookAppointmentRequestSchema = z
  .object({
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    typeCode: z.string().min(1).max(80),
  })
  .strict()
  .refine(
    (data) => {
      const start = new Date(data.scheduledStart);
      const end = new Date(data.scheduledEnd);
      return end > start;
    },
    {
      message: 'scheduledEnd must be strictly after scheduledStart',
      path: ['scheduledEnd'],
    },
  );

export type BookAppointmentRequest = z.infer<
  typeof BookAppointmentRequestSchema
>;

// ---------------------------------------------------------------------------
// BookAppointmentResponse
// ---------------------------------------------------------------------------

/**
 * The canonical response schema for a successful appointment booking
 * via `POST /api/v1/appointments`.
 *
 * Returns the created appointment with all persisted fields.
 */
export const BookAppointmentResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    status: AppointmentStatusSchema,
    typeCode: z.string().min(1).max(80),
  })
  .strict();

export type BookAppointmentResponse = z.infer<
  typeof BookAppointmentResponseSchema
>;

// ---------------------------------------------------------------------------
// BookingErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the appointment booking
 * endpoint.
 *
 * Error codes:
 * - `APPOINTMENT_VALIDATION_ERROR`: invalid timestamps, missing fields,
 *   or other validation failures.
 * - `APPOINTMENT_PATIENT_NOT_FOUND`: (reserved for future use when
 *   Patient bounded context BC01 is implemented)
 * - `APPOINTMENT_PROVIDER_NOT_FOUND`: (reserved for future use when
 *   Workforce bounded context BC10 is implemented)
 * - `APPOINTMENT_OVERLAP`: the requested time slot overlaps with an
 *   existing appointment for the same provider.
 * - `APPOINTMENT_PAST_TIME`: the requested start time is in the past.
 */
export const BookingErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'APPOINTMENT_VALIDATION_ERROR',
          'APPOINTMENT_PATIENT_NOT_FOUND',
          'APPOINTMENT_PROVIDER_NOT_FOUND',
          'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
          'APPOINTMENT_OVERLAP',
          'APPOINTMENT_PAST_TIME',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type BookingErrorResponse = z.infer<typeof BookingErrorResponseSchema>;

// ---------------------------------------------------------------------------
// CancelAppointmentRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for cancelling an appointment via
 * `POST /api/v1/appointments/:id/cancel`.
 *
 * All scope (tenantId, organisationId, facilityId) is derived from
 * the authenticated session context. The request body contains ONLY
 * the cancellation reason.
 *
 * Per STATUS_CODES.md §4.1, a cancellation is "recorded with reason
 * and actor". The reason is a required free-text string (no canonical
 * cancellation-reason enum exists in ENUMS.md). The actor is derived
 * from the authenticated session and recorded in the audit event, NOT
 * in the request body.
 *
 * The request does NOT include:
 * - tenantId, organisationId, or facilityId (derived from session)
 * - status (callers cannot supply arbitrary status values; the
 *   transition is always booked → cancelled)
 * - patientId, providerId, or timing (the appointment already exists)
 * - actorId (derived from the authenticated session)
 *
 * The schema is `.strict()` so that adding an unexpected field at
 * the boundary is rejected by the Zod parse.
 */
export const CancelAppointmentRequestSchema = z
  .object({
    reason: z.string().min(1).max(500),
  })
  .strict();

export type CancelAppointmentRequest = z.infer<
  typeof CancelAppointmentRequestSchema
>;

// ---------------------------------------------------------------------------
// CancelAppointmentResponse
// ---------------------------------------------------------------------------

/**
 * The canonical response schema for a successful appointment
 * cancellation via `POST /api/v1/appointments/:id/cancel`.
 *
 * Returns the cancelled appointment with all persisted fields. The
 * `status` is always `cancelled` for a successful response (whether
 * the cancellation just transitioned the appointment or was an
 * idempotent re-cancellation of an already-cancelled appointment).
 *
 * The response does NOT include scope fields (tenantId,
 * organisationId, facilityId) or timestamps (createdAt, updatedAt),
 * matching the shape of {@link BookAppointmentResponseSchema}.
 */
export const CancelAppointmentResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    status: AppointmentStatusSchema,
    typeCode: z.string().min(1).max(80),
  })
  .strict();

export type CancelAppointmentResponse = z.infer<
  typeof CancelAppointmentResponseSchema
>;

// ---------------------------------------------------------------------------
// CancellationErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the appointment cancellation
 * endpoint.
 *
 * Error codes:
 * - `APPOINTMENT_VALIDATION_ERROR`: invalid request body (e.g. missing
 *   or too-long reason).
 * - `APPOINTMENT_NOT_FOUND`: the appointment does not exist or is not
 *   accessible in the authenticated tenant, organisation, or facility.
 *   The same error is returned regardless of whether the appointment
 *   does not exist or exists in another scope (no existence leak).
 * - `APPOINTMENT_INVALID_TRANSITION`: the appointment is in a source
 *   state that is not canonically cancellable in this stage (only
 *   `booked` is cancellable; `cancelled` is idempotent success).
 */
export const CancellationErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'APPOINTMENT_VALIDATION_ERROR',
          'APPOINTMENT_NOT_FOUND',
          'APPOINTMENT_INVALID_TRANSITION',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type CancellationErrorResponse = z.infer<
  typeof CancellationErrorResponseSchema
>;

// ---------------------------------------------------------------------------
// RescheduleAppointmentRequest
// ---------------------------------------------------------------------------

/**
 * The canonical request schema for rescheduling an appointment via
 * `POST /api/v1/appointments/:id/reschedule`.
 *
 * All scope (tenantId, organisationId, facilityId) is derived from
 * the authenticated session context. The request body contains ONLY
 * the replacement slot (scheduledStart, scheduledEnd) and the
 * reschedule reason.
 *
 * Per STATUS_CODES.md §4.1, a reschedule is "recorded with old slot,
 * new slot, reason". The reason is a required free-text string (no
 * canonical reschedule-reason enum exists in ENUMS.md). The actor is
 * derived from the authenticated session and recorded in the audit
 * event, NOT in the request body.
 *
 * Stage 1E rescheduling is a time-only operation: the replacement
 * appointment inherits patientId, providerId, typeCode, tenantId,
 * organisationId, and facilityId from the original appointment. The
 * request does NOT permit changing the patient, provider, type,
 * facility, or status. This is the safest minimum consistent with
 * canonical documentation ("old slot, new slot, reason").
 *
 * The request does NOT include:
 * - tenantId, organisationId, or facilityId (derived from session)
 * - status (callers cannot supply arbitrary status values; the
 *   transition is always booked → cancelled + new booked)
 * - patientId, providerId, or typeCode (inherited from the original)
 * - actorId (derived from the authenticated session)
 *
 * The schema is `.strict()` so that adding an unexpected field at
 * the boundary is rejected by the Zod parse.
 */
export const RescheduleAppointmentRequestSchema = z
  .object({
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    reason: z.string().min(1).max(500),
  })
  .strict()
  .refine(
    (data) => {
      const start = new Date(data.scheduledStart);
      const end = new Date(data.scheduledEnd);
      return end > start;
    },
    {
      message: 'scheduledEnd must be strictly after scheduledStart',
      path: ['scheduledEnd'],
    },
  );

export type RescheduleAppointmentRequest = z.infer<
  typeof RescheduleAppointmentRequestSchema
>;

// ---------------------------------------------------------------------------
// RescheduleAppointmentResponse
// ---------------------------------------------------------------------------

/**
 * The canonical response schema for a successful appointment
 * reschedule via `POST /api/v1/appointments/:id/reschedule`.
 *
 * Returns the replacement (new) appointment with all persisted fields.
 * The replacement's `status` is always `booked` (the canonical
 * "Scheduled" status in the implemented lifecycle). The original
 * appointment is transitioned to `cancelled` but is NOT returned in
 * the response body; its id is carried in the audit event metadata
 * for traceability.
 */
export const RescheduleAppointmentResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    status: AppointmentStatusSchema,
    typeCode: z.string().min(1).max(80),
  })
  .strict();

export type RescheduleAppointmentResponse = z.infer<
  typeof RescheduleAppointmentResponseSchema
>;

// ---------------------------------------------------------------------------
// ReschedulingErrorResponse
// ---------------------------------------------------------------------------

/**
 * The canonical error response schema for the appointment reschedule
 * endpoint.
 *
 * Error codes:
 * - `APPOINTMENT_VALIDATION_ERROR`: invalid request body (e.g. missing
 *   or too-long reason, end not after start, invalid timestamp format).
 * - `APPOINTMENT_NOT_FOUND`: the appointment does not exist or is not
 *   accessible in the authenticated tenant, organisation, or facility.
 *   The same error is returned regardless of whether the appointment
 *   does not exist or exists in another scope (no existence leak).
 * - `APPOINTMENT_INVALID_TRANSITION`: the appointment is in a source
 *   state that is not canonically reschedulable in this stage (only
 *   `booked` is reschedulable).
 * - `APPOINTMENT_OVERLAP`: the requested replacement slot overlaps
 *   with an existing blocking appointment for the same provider.
 * - `APPOINTMENT_PAST_TIME`: the requested replacement start time is
 *   in the past.
 */
export const ReschedulingErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'APPOINTMENT_VALIDATION_ERROR',
          'APPOINTMENT_NOT_FOUND',
          'APPOINTMENT_INVALID_TRANSITION',
          'APPOINTMENT_OVERLAP',
          'APPOINTMENT_PAST_TIME',
          'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type ReschedulingErrorResponse = z.infer<
  typeof ReschedulingErrorResponseSchema
>;

// ---------------------------------------------------------------------------
// Visit Lifecycle (Stage 1F): confirm, check-in, start, complete
// ---------------------------------------------------------------------------

/**
 * The canonical request-body schema for the appointment visit-lifecycle
 * endpoints (confirm, check-in, start, complete).
 *
 * All four commands accept NO business input besides the appointment ID
 * (supplied in the URL path). The body MUST be empty, absent, or an
 * empty JSON object. Any supplied field — including `tenantId`,
 * `organisationId`, `facilityId`, `status`, `actorId`, or any other
 * key — is rejected as an `APPOINTMENT_VALIDATION_ERROR` (400). This
 * prevents scope override, status override, and actor override via the
 * request body.
 *
 * The schema accepts `undefined` (no body sent), `null` (some clients
 * send null), and `{}` (empty JSON object). It rejects any object with
 * keys via `.strict()`, matching the existing booking, cancellation,
 * and rescheduling contract conventions.
 */
export const VisitLifecycleRequestBodySchema = z.union([
  z.undefined(),
  z.null(),
  z.object({}).strict(),
]);

export type VisitLifecycleRequestBody = z.infer<
  typeof VisitLifecycleRequestBodySchema
>;

/**
 * The canonical response schema for a successful appointment
 * visit-lifecycle transition (confirm, check-in, start, complete).
 *
 * Returns the appointment with all persisted fields. The `status`
 * reflects the target state of the transition (`confirmed`,
 * `arrived`, `in_progress`, or `completed`). For an idempotent
 * re-completion of an already-completed appointment, the response is
 * the same canonical success shape with `status: 'completed'` and NO
 * duplicate audit event is emitted.
 *
 * The schema is identical in shape to {@link BookAppointmentResponseSchema}
 * and {@link CancelAppointmentResponseSchema} so the frontend can use
 * a single appointment-response code path.
 */
export const AppointmentVisitLifecycleResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    status: AppointmentStatusSchema,
    typeCode: z.string().min(1).max(80),
  })
  .strict();

export type AppointmentVisitLifecycleResponse = z.infer<
  typeof AppointmentVisitLifecycleResponseSchema
>;

/**
 * The canonical error response schema for the appointment
 * visit-lifecycle endpoints (confirm, check-in, start, complete).
 *
 * Error codes:
 * - `APPOINTMENT_VALIDATION_ERROR`: invalid request body (the
 *   visit-lifecycle commands accept no body fields; any supplied
 *   field is rejected).
 * - `APPOINTMENT_NOT_FOUND`: the appointment does not exist or is not
 *   accessible in the authenticated tenant, organisation, or facility.
 *   The same error is returned regardless of whether the appointment
 *   does not exist or exists in another scope (no existence leak).
 * - `APPOINTMENT_INVALID_TRANSITION`: the appointment is in a source
 *   state that is not canonically permitted for this transition, OR
 *   (for non-terminal targets) the appointment is already in the
 *   target state (same-state re-application is not a permitted edge).
 *   For the terminal `completed` target, an already-completed
 *   appointment is an idempotent success (not this error).
 */
export const VisitLifecycleErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'APPOINTMENT_VALIDATION_ERROR',
          'APPOINTMENT_NOT_FOUND',
          'APPOINTMENT_INVALID_TRANSITION',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type VisitLifecycleErrorResponse = z.infer<
  typeof VisitLifecycleErrorResponseSchema
>;

// ---------------------------------------------------------------------------
// No-Show Recording (Scheduling Completion Milestone)
// ---------------------------------------------------------------------------

/**
 * The canonical request-body schema for marking an appointment as a
 * no-show via `POST /api/v1/appointments/:id/no-show`.
 *
 * Per STATUS_CODES.md §4.1, the canonical no-show transitions are
 * `Confirmed → NoShow` and `CheckedIn → NoShow` (in the implemented
 * lifecycle: `confirmed → no_show` and `arrived → no_show`). NoShow
 * is a terminal state ("Terminal (or rebooked as new appointment").
 *
 * Per APPOINTMENTS.md §7.1, no-show recording is "a manual action by
 * reception or clinical staff" and is "audited, with the recorder,
 * the time, and the justification (if required) recorded." The
 * justification (`reason`) is an optional free-text string because the
 * docs say "if required" and the requirement is configurable per
 * clinic type. The actor (recorder) is derived from the authenticated
 * session, NOT from the request body.
 *
 * The request does NOT include:
 * - tenantId, organisationId, or facilityId (derived from session)
 * - status (the transition is always confirmed|arrived → no_show)
 * - actorId (derived from the authenticated session)
 *
 * The schema is `.strict()` so that adding an unexpected field at
 * the boundary is rejected by the Zod parse.
 */
export const NoShowAppointmentRequestSchema = z
  .object({
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

export type NoShowAppointmentRequest = z.infer<
  typeof NoShowAppointmentRequestSchema
>;

/**
 * The canonical response schema for a successful no-show recording.
 *
 * Returns the appointment with all persisted fields. The `status` is
 * always `no_show` for a successful response (whether the recording
 * just transitioned the appointment or was an idempotent re-marking
 * of an already-no_show appointment).
 */
export const NoShowAppointmentResponseSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    status: AppointmentStatusSchema,
    typeCode: z.string().min(1).max(80),
  })
  .strict();

export type NoShowAppointmentResponse = z.infer<
  typeof NoShowAppointmentResponseSchema
>;

/**
 * The canonical error response schema for the no-show recording
 * endpoint.
 *
 * Error codes:
 * - `APPOINTMENT_VALIDATION_ERROR`: invalid request body.
 * - `APPOINTMENT_NOT_FOUND`: the appointment does not exist or is not
 *   accessible in the authenticated tenant, organisation, or facility
 *   (no existence leak).
 * - `APPOINTMENT_INVALID_TRANSITION`: the appointment is in a source
 *   state that is not canonically permitted for no-show (only
 *   `confirmed` and `arrived` can transition to `no_show`). An
 *   already-no_show appointment is an idempotent success (not this
 *   error).
 */
export const NoShowErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          'APPOINTMENT_VALIDATION_ERROR',
          'APPOINTMENT_NOT_FOUND',
          'APPOINTMENT_INVALID_TRANSITION',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type NoShowErrorResponse = z.infer<typeof NoShowErrorResponseSchema>;
