import type {
  ClinicalNote,
  ClinicalNoteId,
  ClinicalNoteStatus,
  ClinicalNoteType,
  ClinicalNoteAuthorRole,
  ClinicalNoteRevision,
  ClinicalNoteRevisionId,
  ClinicalNoteRevisionAction,
  FacilityId,
  OrganisationId,
  PatientId,
  ProviderId,
  TenantId,
  EncounterId,
} from '@ibn-hayan/domain';
import type {
  ClinicalNote as PrismaClinicalNote,
  ClinicalNoteStatus as PrismaClinicalNoteStatus,
  ClinicalNoteType as PrismaClinicalNoteType,
  ClinicalNoteAuthorRole as PrismaClinicalNoteAuthorRole,
  ClinicalNoteRevision as PrismaClinicalNoteRevision,
  ClinicalNoteRevisionAction as PrismaClinicalNoteRevisionAction,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `ClinicalNote` /
 * `ClinicalNoteRevision` row types and the framework-independent domain
 * types.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested. Per
 * ADR-012 §1.4 safeguard 1, Prisma-generated types do not leak through
 * the adapter's public signatures; the mapping converts them to domain
 * types before returning.
 *
 * The Prisma-generated enum string values are identical to the canonical
 * database values (lowercase), so the enum mappings are identity casts.
 */

function prismaNoteTypeToDomain(
  noteType: PrismaClinicalNoteType,
): ClinicalNoteType {
  return noteType;
}

function prismaNoteStatusToDomain(
  status: PrismaClinicalNoteStatus,
): ClinicalNoteStatus {
  return status;
}

function prismaAuthorRoleToDomain(
  authorRole: PrismaClinicalNoteAuthorRole,
): ClinicalNoteAuthorRole {
  return authorRole;
}

function prismaRevisionActionToDomain(
  action: PrismaClinicalNoteRevisionAction,
): ClinicalNoteRevisionAction {
  return action;
}

/**
 * Maps a full Prisma `ClinicalNote` row (with its current revision) to a
 * domain `ClinicalNote`. The branded identifier casts are the structural
 * boundary between the unbranded Prisma string types and the branded
 * domain types.
 */
export function clinicalNoteFromPrisma(
  row: PrismaClinicalNote,
  currentRevision: PrismaClinicalNoteRevision,
): ClinicalNote {
  return {
    id: row.id as ClinicalNoteId,
    tenantId: row.tenantId as TenantId,
    organisationId: row.organisationId as OrganisationId,
    facilityId: row.facilityId as FacilityId,
    encounterId: row.encounterId as EncounterId,
    patientId: row.patientId as PatientId,
    noteType: prismaNoteTypeToDomain(row.noteType),
    authorRole: prismaAuthorRoleToDomain(row.authorRole),
    status: prismaNoteStatusToDomain(row.status),
    currentRevision: clinicalNoteRevisionFromPrisma(currentRevision),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Maps a Prisma `ClinicalNoteRevision` row to a domain
 * `ClinicalNoteRevision`.
 */
export function clinicalNoteRevisionFromPrisma(
  row: PrismaClinicalNoteRevision,
): ClinicalNoteRevision {
  return {
    id: row.id as ClinicalNoteRevisionId,
    clinicalNoteId: row.clinicalNoteId as ClinicalNoteId,
    revisionNumber: row.revisionNumber,
    action: prismaRevisionActionToDomain(row.action),
    status: prismaNoteStatusToDomain(row.status),
    body: row.body,
    authorId: row.authorId as ProviderId,
    authorRole: prismaAuthorRoleToDomain(row.authorRole),
    reason: row.reason,
    signedAt: row.signedAt,
    createdAt: row.createdAt,
  };
}
