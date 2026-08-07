import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Appointments module error helpers.
 *
 * Per the Stage 1B implementation specification, the "Today's
 * Appointments" endpoint must fail closed when the facility timezone
 * is not configured or invalid. The endpoint must NOT silently fall
 * back to UTC, tenant timezone, server timezone, browser timezone, or
 * any hard-coded default.
 *
 * Per the Stage 1C implementation specification, the booking endpoint
 * returns appropriate error codes for validation failures, not-found
 * entities, overlap conflicts, and past-time requests.
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

/**
 * Return a 422 for an invalid facility timezone at the "Today's
 * Appointments" endpoint.
 *
 * Per the Stage 1B specification, when `Facility.timezone` is set
 * to an invalid IANA timezone identifier, the endpoint returns HTTP 422
 * with code `APPOINTMENT_INVALID_TIMEZONE`. The internal RangeError
 * from Intl.DateTimeFormat is caught and not exposed to the client.
 *
 * Per the Stage 1B specification, the event is NOT emitted when
 * the timezone is invalid; only successful reads emit the audit event.
 */
export function appointmentInvalidTimezone(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_INVALID_TIMEZONE',
      message:
        'The facility timezone is not valid. Please configure a valid IANA timezone identifier.',
    },
  });
}

/**
 * Return a 400 for an invalid appointment request (invalid timestamps,
 * missing fields, or other validation failures).
 */
export function appointmentValidationError(
  message: string,
): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'APPOINTMENT_VALIDATION_ERROR',
      message,
    },
  });
}

/**
 * Return a 422 when the patient is not found in the authenticated tenant.
 *
 * Per the Stage 1C specification, we do not leak whether a patient
 * exists in another tenant. The error is the same regardless of whether
 * the patient exists elsewhere.
 */
export function appointmentPatientNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_PATIENT_NOT_FOUND',
      message:
        'The patient was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when the provider is not found in the authenticated tenant.
 *
 * Per the Stage 1C specification, we do not leak whether a provider
 * exists in another tenant. The error is the same regardless of whether
 * the provider exists elsewhere.
 */
export function appointmentProviderNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_PROVIDER_NOT_FOUND',
      message:
        'The provider was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when the requested appointment time overlaps with an
 * existing appointment for the same provider.
 *
 * Per the Stage 1C specification, overlap detection prevents
 * double-booking. The overlap condition is:
 * existingStart < requestedEnd AND existingEnd > requestedStart
 */
export function appointmentOverlap(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_OVERLAP',
      message:
        'The requested appointment time conflicts with an existing appointment for this provider.',
    },
  });
}

/**
 * Return a 422 when the requested appointment start time is in the past.
 *
 * Per the Stage 1C specification, past appointments are rejected.
 */
export function appointmentPastTime(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_PAST_TIME',
      message: 'The requested appointment start time is in the past.',
    },
  });
}
