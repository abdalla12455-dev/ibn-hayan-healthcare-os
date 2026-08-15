/**
 * ClinicalNote repository port and signing-authority port (BC03).
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and CODING_STANDARDS.md §5, the
 * repository interface is declared in the domain package and implemented
 * by a persistence adapter in `apps/api/src/infrastructure/database/`.
 * The API layer depends on the interface; the Prisma-backed implementation
 * is injected at the composition root.
 *
 * Per CODING_STANDARDS.md §10 (Tenant-Scope Requirements), every database
 * query that touches tenant-scoped data must include a tenant filter.
 * The ClinicalNote repository port makes the tenant, organisation, and
 * facility filters required parameters. This is the structural enforcement
 * that prevents cross-tenant, cross-organisation, or cross-facility data
 * leakage. A note outside the authenticated scope is indistinguishable
 * from "does not exist" (no cross-scope existence leak).
 *
 * The port returns domain values (ClinicalNote, ClinicalNoteRevision), not
 * Prisma-generated row types. The mapping between Prisma types and domain
 * types is explicit and tested in the persistence adapter.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type {
  ClinicalNote,
  ClinicalNoteCreateInput,
  ClinicalNoteCreateResult,
  ClinicalNoteTransitionResult,
  ClinicalNoteSignInput,
  ClinicalNoteAmendInput,
  ClinicalNoteAddendumInput,
  ClinicalNoteWithdrawInput,
  ClinicalNoteId,
  ClinicalNoteRevision,
  ClinicalNoteType,
} from './clinical-note.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { EncounterId } from '../encounter/encounter.js';
import type { ProviderId } from '../scheduling/appointment.js';

/**
 * Repository port for the ClinicalNote bounded context (BC03).
 *
 * Every read requires tenantId, organisationId, and facilityId. There is
 * no unscoped lookup. This is the structural enforcement of
 * CODING_STANDARDS.md §10: all scope is derived from the authenticated
 * session.
 *
 * Concurrency safety: lifecycle transitions (sign, amend, addendum,
 * withdraw) are performed within a SERIALIZABLE transaction with bounded
 * retry for Prisma P2034 and `@prisma/adapter-pg`
 * `DriverAdapterError`/`TransactionWriteConflict` conflicts, matching the
 * encounter repository pattern. The source-state validation and the new
 * revision insert are atomic, so a concurrent transition that already
 * changed the note's status causes a conflict that is retried; on retry
 * the note is re-observed at its committed status and resolved
 * deterministically (one `transitioned`; the loser resolves as
 * `invalid_source_state`). No expected serialization conflict escapes as
 * an HTTP 500.
 *
 * Immutability: signed revisions are never destructively rewritten. Each
 * lifecycle action appends a new revision row; the prior revisions are
 * retained verbatim. The repository does NOT expose any method that
 * mutates an existing revision's body, status, or content.
 */
export interface ClinicalNoteRepository {
  /**
   * Create a new clinical note draft, scoped to the authenticated
   * session's tenant, organisation, and facility.
   *
   * The note is created in the canonical initial `draft` status
   * (STATUS_CODES.md §5.3, ENUMS.md §4.2: default `draft`) with its first
   * revision (`draft_created`, revisionNumber 1). The caller does NOT
   * supply scope, status, or actor; scope is derived from the
   * authenticated context, the status is always `draft`, and the author
   * is supplied via the input.
   *
   * @param tenantId The Tenant that owns the note.
   * @param organisationId The Organisation that owns the note.
   * @param facilityId The Facility where the note is authored.
   * @param input The note creation input.
   */
  create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: ClinicalNoteCreateInput,
  ): Promise<ClinicalNoteCreateResult>;

  /**
   * Find a single clinical note by its identifier, scoped to the
   * authenticated session's tenant, organisation, and facility.
   *
   * There is no unscoped lookup. All three scope values must match for a
   * note to be returned; a note that exists in another tenant,
   * organisation, or facility returns `null` (no cross-scope existence
   * leak). The returned note includes its current revision.
   */
  findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
  ): Promise<ClinicalNote | null>;

  /**
   * List the full revision history of a clinical note, scoped to the
   * authenticated session's tenant, organisation, and facility. Returns
   * the revisions in ascending revisionNumber order (oldest first). A
   * note outside scope returns `null` (no existence leak).
   *
   * The revision history is the medico-legal record: every signed,
   * amended, addendum, and withdrawn revision is retained. The history
   * is never destructively pruned.
   */
  listRevisions(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
  ): Promise<readonly ClinicalNoteRevision[] | null>;

  /**
   * List the clinical notes for an encounter, scoped to the authenticated
   * session's tenant, organisation, and facility. Returns the notes
   * newest-first (most recently updated first). The encounter reference is
   * logical; the caller validates the encounter exists in scope before
   * calling. An empty array is returned when no notes exist for the
   * encounter in scope (a valid, non-error state).
   */
  listForEncounter(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    encounterId: EncounterId,
  ): Promise<readonly ClinicalNote[]>;

  /**
   * Sign a draft/in_progress clinical note (draft | in_progress → signed),
   * scoped to the authenticated session's tenant, organisation, and
   * facility. Creates a new `signed` revision with the signing timestamp;
   * the prior draft revision is retained. The signing-authority check is
   * performed by the service layer before calling the repository.
   */
  sign(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteSignInput,
  ): Promise<ClinicalNoteTransitionResult>;

  /**
   * Amend a signed/amended clinical note (signed | amended → amended),
   * scoped to the authenticated session's tenant, organisation, and
   * facility. Per BR-BC03-CLIN-032, the amendment MUST include a reason.
   * Creates a new `amended` revision with the corrected body and the
   * reason; the prior signed/amended revisions are retained verbatim. The
   * original signed content is never destructively rewritten.
   */
  amend(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteAmendInput,
  ): Promise<ClinicalNoteTransitionResult>;

  /**
   * Add an addendum to a signed/amended clinical note
   * (signed | amended → addendum), scoped to the authenticated session's
   * tenant, organisation, and facility. An addendum is supplementary
   * content; the original content is retained. Per BR-BC03-CLIN-032, the
   * addendum MUST include a reason. `addendum` is terminal. Creates a new
   * `addendum_added` revision.
   */
  addAddendum(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteAddendumInput,
  ): Promise<ClinicalNoteTransitionResult>;

  /**
   * Withdraw a draft/in_progress clinical note (draft | in_progress →
   * withdrawn), scoped to the authenticated session's tenant,
   * organisation, and facility. Withdrawal is terminal (e.g. authored in
   * error). Per STATUS_CODES.md §5.3, withdrawal is recorded with reason
   * and author. Creates a new `withdrawn` revision.
   */
  withdraw(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteWithdrawInput,
  ): Promise<ClinicalNoteTransitionResult>;
}

/**
 * Signing-authority port for clinical notes (BR-BC03-CLIN-031).
 *
 * BR-BC03-CLIN-031: "Signer must have signing authority for note type
 * (authority matrix configurable per facility). If authority cannot be
 * verified, block signing."
 *
 * The per-facility authority matrix is NOT documented canonically. This
 * port is the injectable policy/configuration seam that resolves whether a
 * given actor may sign a note of a given type authored by a given author.
 * This foundation implements the universal non-inventing baseline — the
 * signing actor must be the note's author — and defers the configurable
 * per-facility authority matrix to a future stage. No medical/legal policy
 * is invented; the baseline ("you sign what you authored") is the
 * universally-true minimum that does not require any authority matrix.
 *
 * The implementation is configuration-backed so a future stage can wire
 * the per-facility authority matrix without changing call sites.
 */
export interface ClinicalNoteSigningAuthorityPort {
  /**
   * Returns `true` if the `actorId` is permitted to sign the note
   * identified by `authorId` and `noteType` for the given facility.
   *
   * The baseline implementation returns `true` iff `actorId === authorId`
   * (the author signs their own note). A future configuration-backed
   * implementation consults a per-facility authority matrix.
   *
   * @param tenantId The tenant (for future per-tenant configuration).
   * @param facilityId The facility (for future per-facility authority matrix).
   * @param noteType The canonical note type.
   * @param authorId The logical provider identifier of the note's author.
   * @param actorId The logical provider identifier of the signing actor.
   */
  canSign(
    tenantId: TenantId,
    facilityId: FacilityId,
    noteType: ClinicalNoteType,
    authorId: ProviderId,
    actorId: ProviderId,
  ): boolean;
}

/**
 * DI token for the ClinicalNoteSigningAuthorityPort. Implemented in the
 * API infrastructure layer and injected at the composition root.
 */
export const CLINICAL_NOTE_SIGNING_AUTHORITY_PORT = Symbol(
  'CLINICAL_NOTE_SIGNING_AUTHORITY_PORT',
);

/**
 * DI token for the ClinicalNoteRepository. Implemented in the API
 * infrastructure layer and injected at the composition root.
 */
export const CLINICAL_NOTE_REPOSITORY = Symbol('CLINICAL_NOTE_REPOSITORY');
