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
 * - `APPOINTMENT_PATIENT_NOT_FOUND`: the patient does not exist in
 *   the authenticated tenant.
 * - `APPOINTMENT_PROVIDER_NOT_FOUND`: the provider does not exist in
 *   the authenticated tenant.
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
          'APPOINTMENT_OVERLAP',
          'APPOINTMENT_PAST_TIME',
        ]),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type BookingErrorResponse = z.infer<typeof BookingErrorResponseSchema>;
