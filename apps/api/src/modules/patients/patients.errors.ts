import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Patients module error helpers (BC01 — Demographics / Registration /
 * Consent).
 *
 * The error envelope shape mirrors the existing appointments/encounters
 * error envelope so the frontend can use a single error-handling code
 * path.
 *
 * Cross-tenant lookups use the SAME safe public not-found behavior as
 * appointments and encounters: the error is identical regardless of
 * whether the patient/identifier/consent does not exist or exists
 * outside the authenticated tenant scope (no existence leak).
 */

/**
 * Return a 400 for an invalid patient request body (missing/invalid
 * fields, unexpected fields).
 */
export function patientValidationError(message: string): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'PATIENT_VALIDATION_ERROR',
      message,
    },
  });
}

/**
 * Return a 404 when a patient cannot be found in the authenticated
 * tenant. The same error is returned regardless of whether the patient
 * does not exist or exists outside the authenticated scope (no existence
 * leak).
 */
export function patientNotFound(): NotFoundException {
  return new NotFoundException({
    error: {
      code: 'PATIENT_NOT_FOUND',
      message:
        'The patient was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when an active patient with the same MRN already exists
 * in the tenant (deterministic duplicate prevention, architecture gate
 * 6H).
 */
export function patientDuplicateMrn(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_DUPLICATE_MRN',
      message:
        'A patient with this medical record number already exists in the tenant.',
    },
  });
}

/**
 * Return a 422 when an active patient with the same deterministic
 * identifier (NationalID/Passport) already exists in the tenant
 * (architecture gate 6H).
 */
export function patientDuplicateIdentifier(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_DUPLICATE_IDENTIFIER',
      message: 'A patient with this identifier already exists in the tenant.',
    },
  });
}

/**
 * Return a 422 when a consent grant is attempted for a minor patient
 * (DOB-based age < age-of-majority) without guardian authorization
 * (architecture gate 6M/6N).
 */
export function patientMinorGuardianRequired(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_MINOR_GUARDIAN_REQUIRED',
      message:
        'Guardian authorization is required to grant consent for a minor patient.',
    },
  });
}

/**
 * Return a 422 when a consent grant supplies guardian authorization
 * fields for an adult patient (architecture gate 6N). An adult grants
 * their own consent; guardian fields must NOT be supplied for an adult.
 * The request is rejected rather than silently discarding the fields, so
 * the caller is informed that the authorization provenance is
 * self-consent, not guardian-consent.
 */
export function patientGuardianFieldsForAdult(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_GUARDIAN_FIELDS_FOR_ADULT',
      message:
        'Guardian authorization fields must not be supplied for an adult patient.',
    },
  });
}

/**
 * Return a 422 when the `single_encounter` consent duration is
 * rejected because it is not enforceable in this stage (architecture
 * gate 6K).
 */
export function patientSingleEncounterNotSupported(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_SINGLE_ENCOUNTER_NOT_SUPPORTED',
      message:
        'single_encounter consent duration is not supported in this stage.',
    },
  });
}

/**
 * Return a 422 when an active granted treatment consent already exists
 * for the patient (architecture gate 6J — one-active-treatment-consent
 * invariant).
 */
export function patientConsentDuplicate(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_CONSENT_DUPLICATE',
      message: 'An active treatment consent already exists for this patient.',
    },
  });
}

/**
 * Return a 422 when a consent withdrawal is attempted on a consent that
 * is not in a `granted` status (e.g. expired).
 */
export function patientConsentNotGranted(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_CONSENT_NOT_GRANTED',
      message:
        'The consent is not in a granted status and cannot be withdrawn.',
    },
  });
}

/**
 * Return a 404 when a consent cannot be found in the authenticated
 * tenant/patient scope. The same error is returned regardless of whether
 * the consent does not exist or exists outside the authenticated scope
 * (no existence leak).
 */
export function patientConsentNotFound(): NotFoundException {
  return new NotFoundException({
    error: {
      code: 'PATIENT_CONSENT_NOT_FOUND',
      message:
        'The consent was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when a non-`treatment` consent type is supplied (only
 * `treatment` is supported in this stage, architecture gate 6I).
 */
export function patientInvalidConsentType(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'PATIENT_INVALID_CONSENT_TYPE',
      message: 'Only treatment consent is supported in this stage.',
    },
  });
}
