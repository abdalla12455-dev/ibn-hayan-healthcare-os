/**
 * Public Encounter entry point.
 *
 * Re-exports the Encounter domain model and repository port so that
 * consumers import from `@ibn-hayan/domain/encounter` (or from the
 * package root) without reaching into internal file paths.
 *
 * Nothing in this module imports Prisma, NestJS, Next.js, React, Zod,
 * or any framework. The exports are pure TypeScript types and
 * interfaces. Per ADR-012 §1.4, Prisma-generated types must not leak
 * into the domain; the persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and these types.
 */

export type {
  Encounter,
  EncounterId,
  EncounterStatus,
  EncounterType,
  EncounterPriority,
  EncounterCreateInput,
  EncounterCreateResult,
  EncounterTransitionInput,
  EncounterTransitionResult,
  ENCOUNTER_TRANSITIONS,
} from './encounter.js';

export type { EncounterRepository } from './repositories.js';
