/**
 * ClinicalNote domain model (BC03 — Clinical Documentation Foundation).
 *
 * A ClinicalNote is a signed clinical document attached to an Encounter
 * (BC02). BC03 owns ClinicalNote state exclusively (SYSTEM_ARCHITECTURE
 * §7 / MODULE_ARCHITECTURE §11.3: state isolation). The note references —
 * but does NOT foreign-key to — the Encounter (BC02), Patient (BC01),
 * and author Provider (BC10). Those contexts own their own authoritative
 * state; BC03 holds logical identifiers only, per the cross-BC
 * state-isolation rule ("Direct data access across context boundaries is a
 * defect and is rejected at code review").
 *
 * Canonical lifecycle (STATUS_CODES.md §5.3 — ClinicalNoteStatus, Closed):
 *
 *   draft       → in_progress | signed | withdrawn   (authoring)
 *   in_progress → signed | withdrawn                  (co-authorship)
 *   signed      → amended | addendum                  (post-signing correction)
 *   amended     → addendum (rare)                     (further correction)
 *   addendum    → (terminal)
 *   withdrawn   → (terminal)
 *
 * Signing (BR-BC03-CLIN-031): the signer must have signing authority for
 * the note type (authority matrix configurable per facility). The
 * per-facility authority matrix is NOT documented canonically; this
 * foundation implements the universal non-inventing baseline — the note's
 * author signs their own draft — and defers the configurable per-facility
 * authority matrix to a future stage behind the
 * {@link ClinicalNoteSigningAuthorityPort} seam. No medical/legal policy
 * is invented.
 *
 * Amendment (BR-BC03-CLIN-032): an amendment must include a reason and an
 * author; the amendment reason-code list is configurable per tenant. This
 * foundation requires a non-empty reason and records the amending author;
 * the configurable reason-code catalogue is deferred. A signed note is
 * NEVER destructively rewritten: the original signed content is preserved
 * immutably, and an amendment produces a new revision that supersedes the
 * previous one while retaining the full revision history.
 *
 * Versioning / history preservation: a ClinicalNote's mutable content
 * lives in an append-only sequence of {@link ClinicalNoteRevision} rows.
 * Each revision captures the note body, the author, and the lifecycle
 * action that produced it (draft creation, signing, amendment, addendum,
 * withdrawal). The current revision is the latest one; superseded
 * revisions are retained for the full medico-legal history. A signed
 * revision is immutable: signing, amendment, addendum, and withdrawal
 * each produce a NEW revision rather than mutating an existing one.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { PatientId, ProviderId } from '../scheduling/appointment.js';
import type { EncounterId } from '../encounter/encounter.js';

/**
 * Stable identifier for a ClinicalNote. Branded so it cannot be confused
 * with other IDs at the type level.
 */
export type ClinicalNoteId = string & {
  readonly __brand: 'ClinicalNoteId';
};

/**
 * Stable identifier for a ClinicalNoteRevision. Branded so it cannot be
 * confused with other IDs at the type level.
 */
export type ClinicalNoteRevisionId = string & {
  readonly __brand: 'ClinicalNoteRevisionId';
};

/**
 * Canonical clinical note type per ENUMS.md §4.2 (ClinicalNoteType,
 * Open-with-Council). Bound to the LOINC document ontology. The database
 * stores lowercase values; the canonical default is `progress`.
 *
 * This foundation accepts all canonical note types; the smallest
 * encounter/progress-note foundation is the `progress` default. Discharge
 * summaries (note type `discharge`) are NOT implemented as a workflow in
 * this stage (BR-BC03-CLIN-033 is deferred); the enum value exists in the
 * catalogue but no discharge-summary command is exposed.
 */
export type ClinicalNoteType =
  | 'progress'
  | 'history'
  | 'physical'
  | 'consultation'
  | 'discharge'
  | 'procedure'
  | 'nursing';

/**
 * Canonical clinical note lifecycle status per ENUMS.md §4.2 and
 * STATUS_CODES.md §5.3 (ClinicalNoteStatus, Closed). The database stores
 * lowercase values; the canonical default is `draft`.
 *
 * Terminal statuses: `addendum`, `withdrawn`. No backward transitions,
 * reopening, or destructive rewrite of a signed note are permitted.
 */
export type ClinicalNoteStatus =
  | 'draft'
  | 'in_progress'
  | 'signed'
  | 'amended'
  | 'addendum'
  | 'withdrawn';

/**
 * Canonical clinical note author role per ENUMS.md §4.2
 * (ClinicalNoteAuthorRole, Open-with-Council). The author role governs
 * signing authority. The database stores lowercase values; the canonical
 * default is `physician`.
 */
export type ClinicalNoteAuthorRole =
  | 'physician'
  | 'nurse'
  | 'pharmacist'
  | 'therapist'
  | 'midlevel'
  | 'student';

/**
 * The lifecycle action that produced a revision. Each revision records
 * which canonical lifecycle event created it, so the full medico-legal
 * history is reconstructable from the revision sequence alone.
 */
export type ClinicalNoteRevisionAction =
  | 'draft_created'
  | 'signed'
  | 'amended'
  | 'addendum_added'
  | 'withdrawn';

/**
 * The canonical ClinicalNote lifecycle transition graph, derived from
 * STATUS_CODES.md §5.3 (ClinicalNoteStatus transition map).
 *
 * Edges:
 *   draft       → in_progress | signed | withdrawn
 *   in_progress → signed | withdrawn
 *   signed      → amended | addendum
 *   amended     → addendum (rare)
 *   addendum    → (terminal)
 *   withdrawn   → (terminal)
 *
 * Terminal states: `addendum`, `withdrawn`. Backward transitions and
 * reopening are NOT in the canonical map and are therefore not permitted.
 * A signed note is never destructively rewritten; amendment and addendum
 * produce new revisions.
 */
export const CLINICAL_NOTE_TRANSITIONS: Readonly<
  Record<ClinicalNoteStatus, readonly ClinicalNoteStatus[]>
> = {
  draft: ['in_progress', 'signed', 'withdrawn'],
  in_progress: ['signed', 'withdrawn'],
  signed: ['amended', 'addendum'],
  amended: ['addendum'],
  addendum: [],
  withdrawn: [],
};

/**
 * A single immutable revision in a ClinicalNote's append-only history.
 *
 * Revisions are append-only: a new revision is created for every
 * lifecycle action that changes the note's content or status. A signed
 * revision (`action === 'signed'`) is never mutated; an amendment
 * (`action === 'amended'`) or addendum (`action === 'addendum_added'`)
 * creates a NEW revision with the corrected/supplementary content while
 * the prior signed revision is retained verbatim. The `revisionNumber`
 * is a 1-based sequence scoped to the note; the highest `revisionNumber`
 * is the current revision.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as ClinicalNoteRevisionId.
 * - `clinicalNoteId`: the owning note.
 * - `revisionNumber`: 1-based sequence within the note.
 * - `action`: the lifecycle event that produced this revision.
 * - `status`: the note status AFTER this revision (the status this
 *   revision established).
 * - `body`: the note's free-text clinical content as of this revision.
 *   This is PHI; it is stored in the transactional database but is NEVER
 *   placed in audit metadata.
 * - `authorId`: logical reference to the authoring Provider (BC10). The
 *   author of THIS revision (may differ across revisions for
 *   co-authorship or amendment-by-another-clinician).
 * - `authorRole`: the canonical author role for this revision.
 * - `reason`: the mandatory reason for amendment/withdrawal/addendum
 *   (BR-BC03-CLIN-032). `null` for draft creation and signing (no reason
 *   required canonically).
 * - `signedAt`: the signing timestamp, set only for `signed` revisions.
 * - `createdAt`: timestamp set by the persistence layer.
 */
export interface ClinicalNoteRevision {
  readonly id: ClinicalNoteRevisionId;
  readonly clinicalNoteId: ClinicalNoteId;
  readonly revisionNumber: number;
  readonly action: ClinicalNoteRevisionAction;
  readonly status: ClinicalNoteStatus;
  readonly body: string;
  readonly authorId: ProviderId;
  readonly authorRole: ClinicalNoteAuthorRole;
  readonly reason: string | null;
  readonly signedAt: Date | null;
  readonly createdAt: Date;
}

/**
 * The canonical ClinicalNote domain model. A readonly snapshot of a
 * note's persistent state at a point in time, plus its current revision.
 *
 * Field semantics:
 * - `id`: stable UUID identifier. Branded as ClinicalNoteId.
 * - `tenantId`: the Tenant that owns this note.
 * - `organisationId`: the Organisation that owns this note.
 * - `facilityId`: the Facility where this note was authored.
 * - `encounterId`: logical encounter identifier (no FK to BC02). The
 *   note is attached to a real existing Encounter in the authenticated
 *   scope (validated by the service via EncounterRepository.findById).
 * - `patientId`: logical patient identifier (no FK to BC01). Carried for
 *   context and for note-history retrieval scoped by patient; validated
 *   to match the encounter's patient.
 * - `noteType`: the canonical note type.
 * - `authorRole`: the canonical author role of the note's original author.
 * - `status`: current lifecycle status.
 * - `currentRevision`: the latest revision (the note's current content
 *   and action). Present for a persisted note (a note always has at least
 *   the draft revision).
 * - `createdAt`: timestamp set by the persistence layer.
 * - `updatedAt`: timestamp updated by the persistence layer.
 */
export interface ClinicalNote {
  readonly id: ClinicalNoteId;
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId;
  readonly facilityId: FacilityId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly noteType: ClinicalNoteType;
  readonly authorRole: ClinicalNoteAuthorRole;
  readonly status: ClinicalNoteStatus;
  readonly currentRevision: ClinicalNoteRevision;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input type for creating a new clinical note draft.
 *
 * All scope (tenantId, organisationId, facilityId) is derived from the
 * authenticated session context, NOT from the request body. The caller
 * supplies the encounter, patient, note type, author role, the draft
 * body, and the author (provider). The patient is validated to match the
 * referenced encounter's patient.
 *
 * `authorId` is the logical provider identifier of the note's author. The
 * signing actor (the authenticated user) is NOT the caller-supplied author
 * here; the service derives the actor from the authenticated session and
 * validates that the actor is authorised. For this minimal foundation the
 * author is the authenticated clinical user's provider reference; the
 * service validates the provider is eligible for the facility.
 */
export interface ClinicalNoteCreateInput {
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly noteType: ClinicalNoteType;
  readonly authorRole: ClinicalNoteAuthorRole;
  readonly authorId: ProviderId;
  readonly body: string;
}

/**
 * Result of a clinical-note draft creation attempt.
 *
 * Discriminated by `outcome`:
 * - `created`: the draft note was created with its first revision
 *   (`draft_created`). `transitioned` is `true` (always for a fresh
 *   creation).
 */
export type ClinicalNoteCreateResult = {
  readonly outcome: 'created';
  readonly note: ClinicalNote;
  readonly transitioned: true;
};

/**
 * Input for signing a draft/in-progress clinical note
 * (draft | in_progress → signed).
 *
 * `actorId` is the logical provider identifier of the signing actor
 * (the authenticated clinical user). For this minimal foundation the
 * signing authority rule (BR-BC03-CLIN-031) is the universal baseline:
 * the signing actor must be the note's author. The configurable
 * per-facility authority matrix is deferred behind
 * {@link ClinicalNoteSigningAuthorityPort}.
 */
export interface ClinicalNoteSignInput {
  readonly actorId: ProviderId;
}

/**
 * Input for amending a signed clinical note
 * (signed | amended → amended).
 *
 * Per BR-BC03-CLIN-032, an amendment MUST include a reason and an author.
 * The `reason` is mandatory (non-empty). The `body` is the corrected
 * note content (the new revision's body). The `actorId` is the amending
 * clinician's logical provider identifier.
 *
 * The original signed revision is preserved immutably; the amendment
 * creates a NEW revision with the corrected content and the reason.
 */
export interface ClinicalNoteAmendInput {
  readonly body: string;
  readonly reason: string;
  readonly actorId: ProviderId;
}

/**
 * Input for adding an addendum to a signed/amended clinical note
 * (signed | amended → addendum). An addendum is supplementary content;
 * the original content is retained.
 *
 * Per BR-BC03-CLIN-032, an addendum requires a reason and an author.
 */
export interface ClinicalNoteAddendumInput {
  readonly body: string;
  readonly reason: string;
  readonly actorId: ProviderId;
}

/**
 * Input for withdrawing a draft/in_progress clinical note
 * (draft | in_progress → withdrawn). Withdrawal is terminal (e.g.
 * authored in error). Per STATUS_CODES.md §5.3, withdrawal is recorded
 * with reason and author.
 */
export interface ClinicalNoteWithdrawInput {
  readonly reason: string;
  readonly actorId: ProviderId;
}

/**
 * The outcome of a clinical-note lifecycle transition attempt.
 *
 * - `not_found`: no note matches the supplied scoped identifiers. The
 *   caller MUST treat this identically to a nonexistent note (no
 *   cross-tenant/organisation/facility existence leak).
 * - `invalid_source_state`: the note exists in scope but is in a source
 *   state that is not canonically permitted for this transition. The note
 *   is returned so the service can map the error without a second read.
 * - `transitioned`: the note transitioned and a new revision was created.
 *   `transitioned` is `true` so the service emits the audit event exactly
 *   once. The updated note (with its new current revision) is returned.
 */
export type ClinicalNoteTransitionResult =
  | { readonly outcome: 'not_found' }
  | {
      readonly outcome: 'invalid_source_state';
      readonly note: ClinicalNote;
    }
  | {
      readonly outcome: 'transitioned';
      readonly note: ClinicalNote;
      readonly transitioned: true;
    };
