/**
 * Public ClinicalNote (BC03) entry point.
 *
 * Re-exports the ClinicalNote domain model, revision model, lifecycle
 * transition graph, repository port, and signing-authority port so that
 * consumers import from `@ibn-hayan/domain` without reaching into
 * internal file paths.
 *
 * Nothing in this module imports Prisma, NestJS, Next.js, React, Zod,
 * or any framework. The exports are pure TypeScript types and interfaces.
 * Per ADR-012 §1.4, Prisma-generated types must not leak into the
 * domain; the persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and these types.
 */

export type {
  ClinicalNote,
  ClinicalNoteId,
  ClinicalNoteRevisionId,
  ClinicalNoteRevision,
  ClinicalNoteType,
  ClinicalNoteStatus,
  ClinicalNoteRevisionAction,
  ClinicalNoteCreateInput,
  ClinicalNoteCreateResult,
  ClinicalNoteSignInput,
  ClinicalNoteAmendInput,
  ClinicalNoteAddendumInput,
  ClinicalNoteWithdrawInput,
  ClinicalNoteTransitionResult,
  CLINICAL_NOTE_TRANSITIONS,
} from './clinical-note.js';

// ClinicalNoteAuthorRole is owned by the Workforce bounded context
// (BC10) as a trusted Provider attribute
// (packages/domain/src/workforce/clinical-author-role.ts). Re-exported
// here so BC03 consumers can import it from the clinical-note surface,
// but there is a single canonical definition (no duplicate catalogue).
export type { ClinicalNoteAuthorRole } from '../workforce/clinical-author-role.js';

export type {
  ClinicalNoteRepository,
  ClinicalNoteSigningAuthorityPort,
} from './clinical-note.repositories.js';
