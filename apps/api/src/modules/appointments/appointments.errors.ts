import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Appointments module error helpers.
 *
 * Per the Stage 1B implementation specification, the "Today's
 * Appointments" endpoint must fail closed when the facility timezone
 * is not configured. The endpoint must NOT silently fall back to UTC,
 * tenant timezone, server timezone, browser timezone, or any hard-coded
 * default.
 *
 * The error envelope shape mirrors the existing auth/context error
 * envelope so that the frontend can use a single error-handling code
 * path.
 */

/**
 * Return a 422 for a missing facility timezone at the "Today's
 * Appointments" endpoint.
 *
 * Per the Stage 1B specification, when `Facility.timezone` is null,
 * the endpoint returns HTTP 422 with code `APPOINTMENT_CONFIGURATION_REQUIRED`.
 * The response does not reveal which dimension of configuration is
 * missing beyond the facility-level scope.
 *
 * Per the Stage 1B specification, the event is NOT emitted when
 * configuration is required; only successful reads emit the audit event.
 */
export function appointmentConfigurationRequired(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_CONFIGURATION_REQUIRED',
      message:
        'The facility timezone is not configured. Please configure the facility timezone to view appointments.',
    },
  });
}
