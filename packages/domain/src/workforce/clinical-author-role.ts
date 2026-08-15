/**
 * Canonical clinical-note author role.
 *
 * The values are the canonical ClinicalNoteAuthorRole catalogue defined
 * in `download/docs/03_DOMAIN/ENUMS.md` §4.2 (Clinical Documentation
 * Enums), owned by the Clinical Documentation bounded context (BC03).
 *
 * BC03 is not yet implemented. Until BC03 ships, the Workforce bounded
 * context (BC10) references this catalogue as a *trusted attribute* on
 * the Provider (see `Provider.clinicalAuthorRole`) so that the
 * server-side identity-binding resolver can return trusted clinical
 * author identity to whichever bounded context needs it. This file is
 * pure data (a union of string literals); it carries no behaviour and
 * owns no domain model, so it does not constitute a BC03 implementation.
 * When BC03 is implemented it may re-export or take ownership of this
 * catalogue without breaking consumers.
 *
 * Per ENUMS.md §4.2 the catalogue is "Open-with-Council"; the six values
 * below are the ratified canonical set. The string literals are
 * kebab-case to match the repository's serialised-value convention
 * (CODING_STANDARDS.md §3). The mapping to the documented PascalCase
 * names is:
 *   physician   → Physician
 *   nurse       → Nurse
 *   pharmacist  → Pharmacist
 *   therapist   → Therapist
 *   midlevel    → Midlevel
 *   student     → Student
 *
 * Per the BC10 User→Provider Identity Binding specification:
 * - `clinicalAuthorRole` is a TRUSTED attribute. It is set by workforce
 *   administration on the Provider record. It MUST NOT be derived from
 *   the platform `roleCode` (R01–R14). R05 Allied Health Professional
 *   may author clinical notes only when its bound Provider carries a
 *   valid (non-null) `clinicalAuthorRole`.
 * - `student` remains a supported enum value, but interactive Student
 *   authoring is deferred. The resolver surfaces the value; the
 *   authoring gate that blocks Student authoring arrives with BC03.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

export type ClinicalNoteAuthorRole =
  | 'physician'
  | 'nurse'
  | 'pharmacist'
  | 'therapist'
  | 'midlevel'
  | 'student';

/**
 * The ratified canonical ClinicalNoteAuthorRole values, in catalogue
 * order. Exposed as a readonly tuple so that the value set can be
 * asserted at runtime (for example in mapper validation and tests)
 * without constructing a mutable array.
 */
export const CLINICAL_NOTE_AUTHOR_ROLES = [
  'physician',
  'nurse',
  'pharmacist',
  'therapist',
  'midlevel',
  'student',
] as const satisfies readonly ClinicalNoteAuthorRole[];

/**
 * Type guard for the ClinicalNoteAuthorRole catalogue.
 *
 * Returns true only when `value` is one of the six canonical values.
 * Used by the persistence adapter to validate Prisma row values before
 * mapping them to the domain union; an unknown value is a data-integrity
 * error, not a silent coercion.
 */
export function isClinicalNoteAuthorRole(
  value: unknown,
): value is ClinicalNoteAuthorRole {
  return (
    typeof value === 'string' &&
    (CLINICAL_NOTE_AUTHOR_ROLES as readonly string[]).includes(value)
  );
}
