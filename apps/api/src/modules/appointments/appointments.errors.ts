import {
  BadRequestException,
  NotFoundException,
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
 * Return a 422 when the provider is not available at the requested
 * time for the authenticated facility.
 *
 * Per BR-BC06-ADM-002 ("Practitioner Availability"), if the
 * practitioner's availability cannot be verified for the requested
 * time, booking is blocked. This includes:
 * - The provider has no schedule entry for the appointment's day of
 *   week at the facility.
 * - The appointment's time window extends beyond the provider's
 *   configured working hours.
 * - The facility timezone is not configured (fail closed).
 *
 * This error is also used for rescheduling when the replacement slot
 * falls outside the provider's availability.
 */
export function appointmentProviderNotAvailable(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_PROVIDER_NOT_AVAILABLE',
      message:
        'The provider is not available at the requested time for this facility.',
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

// ---------------------------------------------------------------------------
// Cancellation errors (Stage 1D)
// ---------------------------------------------------------------------------

/**
 * Return a 404 when an appointment cannot be found in the
 * authenticated tenant, organisation, or facility.
 *
 * Per the Stage 1D specification, the cancellation endpoint must not
 * reveal whether an appointment exists in another tenant, organisation,
 * or facility. The same error is returned regardless of whether the
 * appointment does not exist or exists outside the authenticated scope
 * (no existence leak).
 */
export function appointmentNotFound(): NotFoundException {
  return new NotFoundException({
    error: {
      code: 'APPOINTMENT_NOT_FOUND',
      message:
        'The appointment was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when an appointment is in a source state that is not
 * canonically cancellable in this stage.
 *
 * Per STATUS_CODES.md §4.1 and the Stage 1D specification, only
 * `booked` is cancellable. `cancelled` is idempotent success (not an
 * error). Any other source state (confirmed, arrived, in_progress,
 * completed, no_show) is an invalid transition and is rejected.
 */
export function appointmentInvalidTransition(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_INVALID_TRANSITION',
      message: 'The appointment cannot be cancelled from its current state.',
    },
  });
}

// ---------------------------------------------------------------------------
// Rescheduling errors (Stage 1E)
// ---------------------------------------------------------------------------

/**
 * Return a 422 when an appointment is in a source state that is not
 * canonically reschedulable in this stage.
 *
 * Per STATUS_CODES.md §4.1 and the Stage 1E specification, only
 * `booked` is reschedulable. `cancelled` and `no_show` are terminal
 * ("rebooked as new appointment", not rescheduled in-place). Any other
 * source state is an invalid transition. The message is reschedule-
 * specific so the client can present the correct action to the user,
 * while the error code is shared with cancellation for a single
 * invalid-transition code path.
 */
export function appointmentRescheduleInvalidTransition(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_INVALID_TRANSITION',
      message: 'The appointment cannot be rescheduled from its current state.',
    },
  });
}

// ---------------------------------------------------------------------------
// Visit lifecycle errors (Stage 1F)
// ---------------------------------------------------------------------------

/**
 * Return a 422 when an appointment is in a source state that is not
 * canonically permitted for a Stage 1F visit-lifecycle transition
 * (confirm, check-in, start, complete).
 *
 * Per STATUS_CODES.md §4.1 and the Stage 1F specification, the
 * canonical forward visit-lifecycle edges are:
 * - confirm:  booked → confirmed
 * - check-in: booked | confirmed → arrived
 * - start:    arrived → in_progress
 * - complete: in_progress → completed
 *
 * For non-terminal targets (confirmed, arrived, in_progress), a
 * same-state re-application is NOT a permitted edge and is rejected as
 * an invalid transition. For the terminal `completed` target, an
 * already-completed appointment is an idempotent success (not this
 * error). The message is transition-specific so the client can present
 * the correct action to the user, while the error code is shared with
 * cancellation/rescheduling for a single invalid-transition code path.
 */
export function appointmentVisitInvalidTransition(
  action: 'confirm' | 'check-in' | 'start' | 'complete' | 'no_show',
): UnprocessableEntityException {
  const messages: Record<typeof action, string> = {
    confirm: 'The appointment cannot be confirmed from its current state.',
    'check-in': 'The appointment cannot be checked in from its current state.',
    start: 'The appointment cannot be started from its current state.',
    complete: 'The appointment cannot be completed from its current state.',
    no_show:
      'The appointment cannot be marked as a no-show from its current state.',
  };
  return new UnprocessableEntityException({
    error: {
      code: 'APPOINTMENT_INVALID_TRANSITION',
      message: messages[action],
    },
  });
}

/**
 * Return a 422 when the no-show grace period has not elapsed. The
 * stable controlled error code
 * APPOINTMENT_NO_SHOW_GRACE_PERIOD_NOT_ELAPSED is enforced before
 * the appointment can transition to no_show, using the canonical
 * Configuration resolution port for
 * scheduling.appointment.noShowGracePeriod.
 */
export function appointmentNoShowGracePeriodNotElapsed(): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'APPOINTMENT_NO_SHOW_GRACE_PERIOD_NOT_ELAPSED',
      message:
        'The no-show grace period has not elapsed. Please wait until the configured grace period passes before marking the appointment as no-show.',
    },
  });
}
