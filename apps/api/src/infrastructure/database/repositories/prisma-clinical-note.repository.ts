import { Injectable } from '@nestjs/common';
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
  ClinicalNoteStatus,
  ClinicalNoteRevisionAction,
  ClinicalNoteAuthorRole,
  ClinicalNoteRepository,
  TenantId,
  OrganisationId,
  FacilityId,
  ProviderId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import {
  clinicalNoteFromPrisma,
  clinicalNoteRevisionFromPrisma,
} from '../mappers/clinical-note.mapper.js';

/**
 * Maximum number of retries for SERIALIZABLE transaction conflicts.
 * P2034 / DriverAdapterError-TransactionWriteConflict errors are retried
 * up to this many times (3 total attempts), matching the encounter
 * repository. Do not regress this.
 */
const MAX_SERIALIZATION_RETRIES = 3;

/**
 * Short delay between retries in milliseconds. Keeps retries bounded
 * while allowing the conflicting transaction to complete.
 */
const RETRY_DELAY_MS = 50;

/**
 * Checks if an error is a Prisma serialization/write conflict that is
 * safe to retry under SERIALIZABLE isolation. Recognizes:
 *
 * 1. **P2034** — Prisma's canonical serialization-failure code
 *    (PostgreSQL SQLSTATE 40001).
 * 2. **DriverAdapterError** with `cause.kind === 'TransactionWriteConflict'`
 *    — the `@prisma/adapter-pg` driver-adapter form of (1), which does
 *    NOT carry a `P2034` code.
 * 3. **P2002 / UniqueConstraintViolation** on the clinical-note
 *    revisions table — a revision-number collision that arises when two
 *    concurrent SERIALIZABLE transitions both read the same prior
 *    revision and compute the same `revisionNumber`. Under SERIALIZABLE
 *    this is a write-skew-equivalent race: the duplicate-key violation
 *    (SQLSTATE 23505) is safe to retry because the retry re-reads the
 *    now-committed prior revision and either observes the new status
 *    (→ `invalid_source_state`) or computes the next revision number.
 *    Without recognizing this form, the race escapes as an HTTP 500
 *    instead of resolving to a clean 422.
 */
function isSerializationConflict(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if ('code' in error && (error as { code?: unknown }).code === 'P2034') {
    return true;
  }
  if (
    error.name === 'DriverAdapterError' &&
    typeof (error as { cause?: unknown }).cause === 'object' &&
    (error as { cause?: { kind?: unknown } }).cause?.kind ===
      'TransactionWriteConflict'
  ) {
    return true;
  }
  // Revision-number collision under SERIALIZABLE: a P2002 whose driver
  // cause is a UniqueConstraintViolation on the revisions table.
  if ('code' in error && (error as { code?: unknown }).code === 'P2002') {
    const meta = (error as { meta?: unknown }).meta as
      { driverAdapterError?: { cause?: { kind?: string } } } | undefined;
    if (
      meta?.driverAdapterError instanceof Error &&
      meta.driverAdapterError.cause?.kind === 'UniqueConstraintViolation'
    ) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The lifecycle-transition specification for a repository transition.
 * The service layer fixes the target and the canonically-permitted
 * source states per command; the repository enforces the edge atomically
 * within a SERIALIZABLE transaction.
 */
interface TransitionSpec {
  readonly allowedSourceStates: readonly ClinicalNoteStatus[];
  readonly targetStatus: ClinicalNoteStatus;
  readonly action: ClinicalNoteRevisionAction;
}

/**
 * The data for a new revision, produced by the per-command builder.
 */
interface NewRevisionData {
  readonly body: string;
  readonly authorId: ProviderId;
  readonly reason: string | null;
  readonly signedAt: Date | null;
}

/**
 * A transactional Prisma client (the `tx` argument of
 * `PrismaService.$transaction(async (tx) => ...)`).
 */
type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * Prisma-backed implementation of {@link ClinicalNoteRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md Section 10 (Tenant-Scope Requirements), every
 * read and write method takes tenantId, organisationId, and facilityId
 * as required parameters. A note outside the authenticated scope is
 * indistinguishable from "does not exist" (no cross-scope existence
 * leak): scoped lookups require all three identifiers to match.
 *
 * Concurrency safety: lifecycle transitions (sign, amend, addendum,
 * withdraw) use a transaction with SERIALIZABLE isolation. The scoped
 * lookup, source-state validation, note status update, and new-revision
 * insert are all performed within the same transaction. SERIALIZABLE
 * transaction conflicts (Prisma P2034 and `@prisma/adapter-pg`
 * `DriverAdapterError` with `cause.kind === 'TransactionWriteConflict'`)
 * are retried with a bounded retry loop (3 total attempts). On retry,
 * the transaction re-executes and re-observes the committed state, so a
 * concurrently-transitioned note is resolved deterministically (one
 * `transitioned`; the loser resolves as `invalid_source_state`). No
 * expected serialization conflict escapes as an HTTP 500.
 *
 * Immutability: signed revisions are never destructively rewritten. Each
 * lifecycle action appends a new revision row with the next
 * `revisionNumber`; the prior revisions are retained verbatim. The
 * `(clinical_note_id, revision_number)` unique index enforces the
 * 1-based per-note sequence. The repository does NOT mutate an existing
 * revision's body, status, or content.
 *
 * The lifecycle transition is enforced at the persistence boundary: the
 * note's current status must be one of the canonically-permitted source
 * states before the transition proceeds. Invalid transitions (including
 * terminal re-applications and same-state re-applications) are
 * prevented here, not only at the controller/service layer.
 *
 * Cross-BC state isolation: the note's `encounterId`, `patientId`, and
 * the revisions' `authorId` are logical UUID references stored WITHOUT
 * foreign keys (BC02 owns Encounter state, BC01 owns Patient state, BC10
 * owns Provider state). The application layer validates these references
 * via the owning modules' repositories before persisting. No foreign
 * key crosses a BC boundary; the only FK is `clinical_note_revisions ->
 * clinical_notes`, which is intra-BC03.
 */
@Injectable()
export class PrismaClinicalNoteRepository implements ClinicalNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeWithSerializationRetry<T>(
    transactionLogic: () => Promise<T>,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await transactionLogic();
      } catch (error) {
        if (
          isSerializationConflict(error) &&
          attempt < MAX_SERIALIZATION_RETRIES
        ) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw error;
      }
    }
  }

  async create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: ClinicalNoteCreateInput,
  ): Promise<ClinicalNoteCreateResult> {
    const transactionLogic = async (): Promise<ClinicalNoteCreateResult> => {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const created = await tx.clinicalNote.create({
            data: {
              tenantId,
              organisationId,
              facilityId,
              encounterId: input.encounterId,
              patientId: input.patientId,
              noteType: input.noteType,
              authorRole: input.authorRole,
              status: 'draft',
            },
          });

          const revision = await tx.clinicalNoteRevision.create({
            data: {
              clinicalNoteId: created.id,
              tenantId,
              revisionNumber: 1,
              action: 'draft_created',
              status: 'draft',
              body: input.body,
              authorId: input.authorId,
              authorRole: input.authorRole,
              reason: null,
              signedAt: null,
            },
          });

          return { created, revision };
        },
        { isolationLevel: 'Serializable' },
      );

      return {
        outcome: 'created',
        note: clinicalNoteFromPrisma(result.created, result.revision),
        transitioned: true,
      };
    };

    return this.executeWithSerializationRetry(transactionLogic);
  }

  async findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
  ): Promise<ClinicalNote | null> {
    const row = await this.prisma.clinicalNote.findFirst({
      where: {
        id: noteId,
        tenantId,
        organisationId,
        facilityId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
        },
      },
    });
    if (row === null || row.revisions.length === 0) {
      return null;
    }
    return clinicalNoteFromPrisma(row, row.revisions[0]!);
  }

  async listRevisions(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
  ): Promise<readonly ClinicalNoteRevision[] | null> {
    const note = await this.prisma.clinicalNote.findFirst({
      where: {
        id: noteId,
        tenantId,
        organisationId,
        facilityId,
      },
      select: { id: true },
    });
    if (note === null) {
      return null;
    }
    const rows = await this.prisma.clinicalNoteRevision.findMany({
      where: { clinicalNoteId: noteId },
      orderBy: { revisionNumber: 'asc' },
    });
    return rows.map(clinicalNoteRevisionFromPrisma);
  }

  async listForEncounter(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    encounterId: ClinicalNote['encounterId'],
  ): Promise<readonly ClinicalNote[]> {
    const rows = await this.prisma.clinicalNote.findMany({
      where: {
        tenantId,
        organisationId,
        facilityId,
        encounterId,
      },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows
      .filter((row) => row.revisions.length > 0)
      .map((row) => clinicalNoteFromPrisma(row, row.revisions[0]!));
  }

  async sign(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteSignInput,
  ): Promise<ClinicalNoteTransitionResult> {
    return this.transition(
      tenantId,
      organisationId,
      facilityId,
      noteId,
      {
        allowedSourceStates: ['draft', 'in_progress'],
        targetStatus: 'signed',
        action: 'signed',
      },
      // Signing does not change the content; the signed revision carries
      // the prior current revision's body. The author is the signing
      // actor; signedAt is now.
      (_tx, currentRevisionBody, _currentRevisionAuthorRole, now) => ({
        body: currentRevisionBody,
        authorId: input.actorId,
        reason: null,
        signedAt: now,
      }),
    );
  }

  async amend(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteAmendInput,
  ): Promise<ClinicalNoteTransitionResult> {
    return this.transition(
      tenantId,
      organisationId,
      facilityId,
      noteId,
      {
        allowedSourceStates: ['signed', 'amended'],
        targetStatus: 'amended',
        action: 'amended',
      },
      () => ({
        body: input.body,
        authorId: input.actorId,
        reason: input.reason,
        signedAt: null,
      }),
    );
  }

  async addAddendum(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteAddendumInput,
  ): Promise<ClinicalNoteTransitionResult> {
    return this.transition(
      tenantId,
      organisationId,
      facilityId,
      noteId,
      {
        allowedSourceStates: ['signed', 'amended'],
        targetStatus: 'addendum',
        action: 'addendum_added',
      },
      () => ({
        body: input.body,
        authorId: input.actorId,
        reason: input.reason,
        signedAt: null,
      }),
    );
  }

  async withdraw(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    input: ClinicalNoteWithdrawInput,
  ): Promise<ClinicalNoteTransitionResult> {
    return this.transition(
      tenantId,
      organisationId,
      facilityId,
      noteId,
      {
        allowedSourceStates: ['draft', 'in_progress'],
        targetStatus: 'withdrawn',
        action: 'withdrawn',
      },
      () => ({
        body: '',
        authorId: input.actorId,
        reason: input.reason,
        signedAt: null,
      }),
    );
  }

  /**
   * Core lifecycle-transition routine. Performs a scoped lookup, validates
   * the canonical source-state edge, appends a new revision, and updates
   * the note status atomically within a SERIALIZABLE transaction with
   * bounded retry on serialization conflicts.
   *
   * The `buildRevision` callback receives the transactional client, the
   * prior current revision's body, the prior current revision's author
   * role, and the transition timestamp (`now`), and returns the new
   * revision's data. All reads are performed inside the transaction (via
   * `tx`) so the retry re-observes committed state.
   */
  private async transition(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    noteId: ClinicalNoteId,
    spec: TransitionSpec,
    buildRevision: (
      tx: TxClient,
      currentRevisionBody: string,
      currentRevisionAuthorRole: ClinicalNoteAuthorRole,
      now: Date,
    ) => Promise<NewRevisionData> | NewRevisionData,
  ): Promise<ClinicalNoteTransitionResult> {
    const transactionLogic =
      async (): Promise<ClinicalNoteTransitionResult> => {
        const result = await this.prisma.$transaction(
          async (tx) => {
            const row = await tx.clinicalNote.findFirst({
              where: {
                id: noteId,
                tenantId,
                organisationId,
                facilityId,
              },
              include: {
                revisions: {
                  orderBy: { revisionNumber: 'desc' },
                  take: 1,
                },
              },
            });

            if (row === null) {
              return { outcome: 'not_found' as const };
            }

            const currentRevision = row.revisions[0] ?? null;
            if (currentRevision === null) {
              return { outcome: 'not_found' as const };
            }

            if (!spec.allowedSourceStates.includes(row.status)) {
              return {
                outcome: 'invalid_source_state' as const,
                note: clinicalNoteFromPrisma(row, currentRevision),
              };
            }

            const now = new Date();
            const nextRevisionNumber = currentRevision.revisionNumber + 1;
            const authorRole = currentRevision.authorRole;

            const revisionData = await buildRevision(
              tx,
              currentRevision.body,
              authorRole,
              now,
            );

            const revision = await tx.clinicalNoteRevision.create({
              data: {
                clinicalNoteId: row.id,
                tenantId,
                revisionNumber: nextRevisionNumber,
                action: spec.action,
                status: spec.targetStatus,
                body: revisionData.body,
                authorId: revisionData.authorId,
                authorRole,
                reason: revisionData.reason,
                signedAt: revisionData.signedAt,
              },
            });

            const updated = await tx.clinicalNote.update({
              where: { id: row.id },
              data: {
                status: spec.targetStatus,
                signedAt:
                  spec.targetStatus === 'signed'
                    ? revisionData.signedAt
                    : undefined,
              },
            });

            return {
              outcome: 'transitioned' as const,
              note: clinicalNoteFromPrisma(updated, revision),
              transitioned: true as const,
            };
          },
          { isolationLevel: 'Serializable' },
        );

        return result;
      };

    return this.executeWithSerializationRetry(transactionLogic);
  }
}
