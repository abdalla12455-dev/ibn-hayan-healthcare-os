import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Clinical Notes module error helpers (BC03 — Clinical Documentation
 * Foundation).
 *
 * The error envelope shape mirrors the existing encounters/appointments
 * error envelope so the frontend can use a single error-handling code
 * path.
 *
 * Cross-tenant/organisation/facility lookups use the SAME safe public
 * not-found behavior as encounters: the error is identical regardless of
 * whether the note/encounter/patient/provider does not exist or exists
 * outside the authenticated scope (no existence leak).
 *
 * Audit metadata is NEVER constructed from note body, diagnosis, patient
 * name, DOB, identifiers, or other PHI/PII.
 */

/**
 * Return a 400 for an invalid clinical-note request body (missing/invalid
 * fields, unexpected fields).
 */
export function clinicalNoteValidationError(
  message: string,
): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'CLINICAL_NOTE_VALIDATION_ERROR',
      message,
    },
  });
}

/**
 * Return a 404 when a clinical note cannot be found in the authenticated
 * tenant, organisation, or facility.
 *
 * The same error is returned regardless of whether the note does not
 * exist or exists outside the authenticated scope (no existence leak).
 */
export function clinicalNoteNotFound(): NotFoundException {
  return new NotFoundException({
    error: {
      code: 'CLINICAL_NOTE_NOT_FOUND',
      message:
        'The clinical note was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when a clinical note is in a source state that is not
 * canonically permitted for this lifecycle transition (including a
 * terminal re-application or a same-state re-application).
 *
 * Per STATUS_CODES.md Section 5.3 (ClinicalNoteStatus transition map):
 *   draft       -> in_progress | signed | withdrawn
 *   in_progress -> signed | withdrawn
 *   signed      -> amended | addendum
 *   amended     -> addendum (rare)
 *   addendum    -> (terminal)
 *   withdrawn   -> (terminal)
 *
 * Terminal states (`addendum`, `withdrawn`) are NOT idempotent success
 * for this foundation — re-applying a terminal transition is an invalid
 * transition (no event). The `action` label is transition-specific so the
 * client can present the correct action to the user.
 */
export function clinicalNoteInvalidTransition(
  action: 'sign' | 'amend' | 'addendum' | 'withdraw',
): UnprocessableEntityException {
  const messages: Record<typeof action, string> = {
    sign: 'The clinical note cannot be signed from its current state.',
    amend: 'The clinical note cannot be amended from its current state.',
    addendum:
      'An addendum cannot be added to the clinical note from its current state.',
    withdraw: 'The clinical note cannot be withdrawn from its current state.',
  };
  return new UnprocessableEntityException({
    error: {
      code: 'CLINICAL_NOTE_INVALID_TRANSITION',
      message: messages[action],
    },
  });
}

/**
 * Return a 422 when the referenced encounter cannot be found in the
 * authenticated scope (no existence leak).
 */
export function clinicalNoteEncounterNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'CLINICAL_NOTE_ENCOUNTER_NOT_FOUND',
      message:
        'The encounter was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when the referenced patient cannot be found in the
 * authenticated tenant (no existence leak).
 */
export function clinicalNotePatientNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'CLINICAL_NOTE_PATIENT_NOT_FOUND',
      message:
        'The patient was not found or is not accessible in the current context.',
    },
  });
}

/**
 * Return a 422 when the supplied patientId does not match the referenced
 * encounter's patient.
 */
export function clinicalNotePatientEncounterMismatch(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'CLINICAL_NOTE_PATIENT_ENCOUNTER_MISMATCH',
      message: 'The supplied patient does not match the encounter patient.',
    },
  });
}

/**
 * Return a 422 when the authoring/signing provider is not found, is not
 * active, or is not assigned to the authenticated facility (no leak of
 * the specific reason).
 */
export function clinicalNoteProviderNotFound(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    error: {
      code: 'CLINICAL_NOTE_PROVIDER_NOT_FOUND',
      message:
        'The provider was not found or is not eligible for the current facility.',
    },
  });
}

/**
 * Return a 403 when the signing actor lacks signing authority for this
 * note (BR-BC03-CLIN-031).
 *
 * The baseline authority rule (the author signs their own note) is
 * enforced via the `ClinicalNoteSigningAuthorityPort`. A future
 * per-facility authority matrix will resolve through the same port.
 */
export function clinicalNoteSigningAuthorityDenied(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: 'CLINICAL_NOTE_SIGNING_AUTHORITY_DENIED',
      message:
        'The signing actor does not have signing authority for this clinical note.',
    },
  });
}

/**
 * Return a 400 when an amendment/addendum/withdrawal is requested without
 * the mandatory reason (BR-BC03-CLIN-032).
 *
 * Note: the Zod contract layer enforces `reason` as non-empty, so this
 * helper is a defensive fallback for callers that bypass contract parsing.
 */
export function clinicalNoteAmendmentReasonRequired(): BadRequestException {
  return new BadRequestException({
    error: {
      code: 'CLINICAL_NOTE_AMENDMENT_REASON_REQUIRED',
      message:
        'An amendment, addendum, or withdrawal requires a non-empty reason.',
    },
  });
}
