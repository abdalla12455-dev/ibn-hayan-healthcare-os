import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Encounters module error helpers (Stage 2A — BC02 Encounter Foundation).
 *
 * The error envelope shape mirrors the existing appointments/auth/context
 * error envelope so the frontend can use a single error-handling code path.
 *
 * Cross-tenant/organisation/facility lookups use the SAME safe public
 * not-found behavior as appointments: the error is identical regardless
 * of whether the encounter/patient/provider/appointment does not exist or
 * exists outside the authenticated scope (no existence leak).
 */

/**
 * Return a 400 for an invalid encounter request body (missing/invalid
 * fields, unexpected fields, missing emergency justification for an
 * emergency encounter).
 */
export function encounterValidationError(message: string): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'ENCOUNTER_VALIDATION_ERROR',
      message,
    },
  });
}

/**
 * Return a 404 when an encounter cannot be found in the authenticated
 * tenant, organisation, or facility.
 *
 * Per the Stage 2A specification, the endpoint must not reveal whether an
 * encounter exists in another tenant, organisation, or facility. The same
 * error is returned regardless of whether the encounter does not exist or
 * exists outside the authenticated scope (no existence leak).
 */
export function encounterNotFound(): NotFoundException {
  return new NotFoundException({
    error: {
      code: 'ENCOUNTER_NOT_FOUND',
      message:
        'The encounter was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when an encounter is in a source state that is not
 * canonically permitted for this lifecycle transition.
 *
 * Per STATUS_CODES.md §10.2 (Encounter Transition Map), the canonical
 * edges are:
 * - planned     → arrived | in_progress | cancelled
 * - arrived     → in_progress | cancelled
 * - in_progress → on_leave | finished | cancelled
 * - on_leave    → in_progress
 *
 * Terminal states (`finished`, `cancelled`) are idempotent success (not
 * this error). For non-terminal targets, a same-state re-application is
 * NOT a permitted edge and is rejected as an invalid transition. The
 * `action` label is transition-specific so the client can present the
 * correct action to the user, while the error code is shared for a
 * single invalid-transition code path.
 */
export function encounterInvalidTransition(
  action: 'arrive' | 'start' | 'on-leave' | 'resume' | 'finish',
): UnprocessableEntityException {
  const messages: Record<typeof action, string> = {
    arrive: 'The encounter cannot arrive from its current state.',
    start: 'The encounter cannot be started from its current state.',
    'on-leave': 'The encounter cannot go on leave from its current state.',
    resume: 'The encounter cannot be resumed from its current state.',
    finish: 'The encounter cannot be finished from its current state.',
  };
  return new UnprocessableEntityException({
    error: {
      code: 'ENCOUNTER_INVALID_TRANSITION',
      message: messages[action],
    },
  });
}

/**
 * Return a 422 when the patient is not found in the authenticated tenant.
 *
 * Per the Stage 2A specification, we do not leak whether a patient exists
 * in another tenant. The error is the same regardless of whether the
 * patient exists elsewhere.
 */
export function encounterPatientNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'ENCOUNTER_PATIENT_NOT_FOUND',
      message:
        'The patient was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when the provider is not found, is in another tenant, is
 * not active, or is not assigned to the authenticated facility.
 *
 * Per the Stage 2A specification, we do not leak the specific reason. The
 * error is the same regardless of whether the provider exists elsewhere,
 * is inactive, or is not assigned.
 */
export function encounterProviderNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'ENCOUNTER_PROVIDER_NOT_FOUND',
      message:
        'The provider was not found or is not eligible for the current facility.',
    },
  });
}

/**
 * Return a 422 when the supplied appointmentId does not exist or is not
 * accessible in the authenticated tenant, organisation, or facility.
 *
 * Per the Stage 2A specification, we do not leak whether the appointment
 * exists in another scope. The error is the same regardless.
 */
export function encounterAppointmentNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'ENCOUNTER_APPOINTMENT_NOT_FOUND',
      message:
        'The appointment was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 (Conflict) when an encounter already exists for the
 * supplied appointmentId in the authenticated scope.
 *
 * Per APPOINTMENTS.md §10.1, one appointment creates at most one
 * encounter. A second creation attempt for the same appointment is
 * rejected.
 */
export function encounterDuplicateAppointment(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'ENCOUNTER_DUPLICATE_APPOINTMENT',
      message:
        'An encounter already exists for this appointment in the current context.',
    },
  });
}

/**
 * Return a 422 when the consent gate is enforced and consent could not
 * be verified.
 *
 * Per the operator-ratified consent-gate policy (Stage 2A specification
 * item 8H), consent is a configuration-gated clinical-safety check with
 * the canonical emergency carve-out. When the gate is enforced and
 * consent cannot be verified (no consent persistence exists yet in BC01),
 * the encounter is blocked (fail-safe). Missing consent is NEVER silently
 * treated as granted.
 *
 * The emergency carve-out is available via an emergency encounterType or
 * priority with the required justification (see
 * {@link encounterEmergencyJustificationRequired}).
 */
export function encounterConsentRequired(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'ENCOUNTER_CONSENT_REQUIRED',
      message:
        'Treatment consent could not be verified for this patient. Provide an emergency encounter with justification or record consent for the patient.',
    },
  });
}

/**
 * Return a 400 when an emergency encounter is requested without the
 * required justification.
 *
 * Per BR-BC15-REG-003, the emergency carve-out requires a documented
 * reason. The justification is carried in the audit event metadata (not
 * persisted as a clinical record in this minimal foundation).
 */
export function encounterEmergencyJustificationRequired(): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'ENCOUNTER_EMERGENCY_JUSTIFICATION_REQUIRED',
      message:
        'An emergency encounter requires a justification for the consent-gate emergency carve-out.',
    },
  });
}
