import { Injectable, Inject } from '@nestjs/common';
import {
  type ClinicalNoteRepository,
  type ClinicalNoteSigningAuthorityPort,
  type EncounterRepository,
  type PatientRepository,
  type ProviderRepository,
  type TenantRepository,
  type OrganisationRepository,
  type FacilityRepository,
  type Tenant,
  type Organisation,
  type Facility,
  type TenantMembership,
  type Session,
  type ClinicalNoteId,
  type ClinicalNote,
  type ClinicalNoteRevision,
  type ClinicalNoteCreateInput,
  type PatientId,
  type ProviderId,
  type EncounterId,
  type TenantId,
  type OrganisationId,
  type FacilityId,
  CLINICAL_NOTE_REPOSITORY,
  CLINICAL_NOTE_SIGNING_AUTHORITY_PORT,
} from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  PATIENT_REPOSITORY,
  WORKFORCE_REPOSITORY,
  ENCOUNTER_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import type {
  CreateClinicalNoteRequest,
  CreateClinicalNoteResponse,
  ClinicalNoteResponse,
  ClinicalNoteHistoryResponse,
  SignClinicalNoteRequest,
  AmendClinicalNoteRequest,
  AddendumClinicalNoteRequest,
  WithdrawClinicalNoteRequest,
} from '@ibn-hayan/contracts';
import {
  clinicalNoteNotFound,
  clinicalNoteInvalidTransition,
  clinicalNoteEncounterNotFound,
  clinicalNotePatientNotFound,
  clinicalNotePatientEncounterMismatch,
  clinicalNoteProviderNotFound,
  clinicalNoteSigningAuthorityDenied,
} from './clinical-notes.errors.js';

/**
 * The canonical clinical-note audit action codes (BC03). Each is a member
 * of the platform's `AuditActionCode` catalogue (see
 * `@ibn-hayan/observability` action-codes). Typing the `auditAction`
 * parameter as this literal union ensures the service can only emit
 * registered audit actions.
 */
type ClinicalNoteAuditAction =
  | 'clinical_notes.created'
  | 'clinical_notes.signed'
  | 'clinical_notes.amended'
  | 'clinical_notes.addendum_added'
  | 'clinical_notes.withdrawn'
  | 'clinical_notes.viewed'
  | 'clinical_notes.history_viewed';

/**
 * Clinical Notes application service (BC03 — Clinical Documentation
 * Foundation).
 *
 * This service orchestrates the clinical-note authoring, signing,
 * amendment, addendum, withdrawal, and read workflows for the BC03
 * bounded context. It:
 *
 * - Derives all scope (tenantId, organisationId, facilityId) from the
 *   authenticated session context. The request body does NOT contain
 *   scope, status, or audit actor identifiers.
 * - Validates the encounter reference via BC02
 *   `EncounterRepository.findById()` (logical reference, no FK; scoped
 *   lookup returns null safely for cross-scope access — no existence
 *   leak).
 * - Validates the patient reference via BC01
 *   `PatientRepository.existsInTenant()` (logical reference, no FK) and
 *   verifies the supplied patient matches the encounter's patient.
 * - Validates the author/signing/amending provider via BC10
 *   `ProviderRepository.isEligibleForFacility()` (logical reference, no
 *   FK; checks existence in tenant, active status, and active facility
 *   assignment).
 * - Enforces the signing-authority rule (BR-BC03-CLIN-031) via the
 *   `ClinicalNoteSigningAuthorityPort` (baseline: the actor must be the
 *   note's author; per-facility authority matrix deferred).
 * - Enforces the amendment reason (BR-BC03-CLIN-032) via the Zod
 *   contracts (non-empty `reason`).
 * - Delegates persistence and concurrency safety to the
 *   `ClinicalNoteRepository` (SERIALIZABLE transaction, bounded retry on
 *   P2034 / DriverAdapterError-TransactionWriteConflict, immutable
 *   append-only revisions, scoped transitions).
 * - Emits a `clinical_notes.*` audit event AFTER a successful state
 *   change or read. The audit metadata carries `{ endpoint, noteId }`
 *   ONLY — no note body, diagnosis, patient name, DOB, identifiers, or
 *   other PHI/PII. The audit `actorId` is the session UserId (the
 *   authenticated identity); the clinical providerId lives in the
 *   note/revision data, not the audit metadata (PHI-safe).
 *
 * Cross-BC state isolation: BC03 owns ClinicalNote state. The encounter,
 * patient, and provider references are logical; no BC03 code queries
 * BC01/BC02/BC10 Prisma tables directly. The owning modules' repository
 * ports are the only cross-BC touchpoints.
 *
 * The authenticated session carries a UserId, not a ProviderId; the
 * user->provider linkage is NOT yet implemented in the schema. Therefore
 * the clinical actor's providerId (authorId/actorId) is supplied in the
 * request body and scope-validated via `isEligibleForFacility`, matching
 * the encounter-creation providerId pattern. This is the honest
 * non-inventing baseline; the user->provider linkage is deferred scope.
 */
@Injectable()
export class ClinicalNotesService {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    @Inject(PATIENT_REPOSITORY)
    private readonly patients: PatientRepository,
    @Inject(WORKFORCE_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(ENCOUNTER_REPOSITORY)
    private readonly encounters: EncounterRepository,
    @Inject(CLINICAL_NOTE_REPOSITORY)
    private readonly clinicalNotes: ClinicalNoteRepository,
    @Inject(CLINICAL_NOTE_SIGNING_AUTHORITY_PORT)
    private readonly signingAuthority: ClinicalNoteSigningAuthorityPort,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  /**
   * POST /api/v1/clinical-notes — create a clinical note draft.
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:create`).
   */
  async createClinicalNote(
    request: CreateClinicalNoteRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<CreateClinicalNoteResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session, user } = authResult;
    const scope = this.resolveScope(session, authResult.memberships);
    const { tenantId, organisationId, facilityId } = scope;

    this.validateScopeEntities(await this.fetchScopeEntities(scope));

    // Validate the encounter reference (BC02). Scoped lookup returns null
    // safely for cross-scope access (no existence leak).
    const encounter = await this.encounters.findById(
      tenantId,
      organisationId,
      facilityId,
      request.encounterId as EncounterId,
    );
    if (encounter === null) {
      throw clinicalNoteEncounterNotFound();
    }

    // Validate the patient reference (BC01). existsInTenant returns false
    // safely for cross-tenant access (no existence leak).
    const patientExists = await this.patients.existsInTenant(
      tenantId,
      request.patientId as PatientId,
    );
    if (!patientExists) {
      throw clinicalNotePatientNotFound();
    }

    // The supplied patient must match the referenced encounter's patient.
    if (encounter.patientId !== (request.patientId as PatientId)) {
      throw clinicalNotePatientEncounterMismatch();
    }

    // Validate the authoring provider is eligible for the authenticated
    // facility (BC10). isEligibleForFacility returns false safely for
    // cross-scope access (no existence leak).
    const authorEligible = await this.providers.isEligibleForFacility(
      tenantId,
      request.authorId as ProviderId,
      facilityId,
    );
    if (!authorEligible) {
      throw clinicalNoteProviderNotFound();
    }

    const createInput: ClinicalNoteCreateInput = {
      encounterId: request.encounterId as EncounterId,
      patientId: request.patientId as PatientId,
      noteType: request.noteType,
      authorRole: request.authorRole,
      authorId: request.authorId as ProviderId,
      body: request.body,
    };

    const result = await this.clinicalNotes.create(
      tenantId,
      organisationId,
      facilityId,
      createInput,
    );

    // outcome === 'created'. Emit the audit event after successful
    // creation. The metadata carries the endpoint and note ID for
    // traceability ONLY. No PHI is carried.
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'clinical_notes.created',
        outcome: 'success',
        source: 'api',
        tenantId,
        actorType: 'USER',
        actorId: user.id,
        sessionId: session.id,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'clinical_notes_create',
          noteId: result.note.id,
        },
      });
    }

    return this.toResponse(result.note);
  }

  /**
   * GET /api/v1/clinical-notes/:id — view a single clinical note.
   *
   * Authorized for clinical/operational read roles (permission
   * `clinical_notes:view`). Returns 404 if the note does not exist or is
   * not accessible in the authenticated scope (no existence leak).
   */
  async viewClinicalNote(
    noteId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ClinicalNoteResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session, user } = authResult;
    const scope = this.resolveScope(session, authResult.memberships);
    const { tenantId, organisationId, facilityId } = scope;

    this.validateScopeEntities(await this.fetchScopeEntities(scope));

    const note = await this.clinicalNotes.findById(
      tenantId,
      organisationId,
      facilityId,
      noteId as ClinicalNoteId,
    );
    if (note === null) {
      throw clinicalNoteNotFound();
    }

    // Emit the viewed audit event after a successful read. The metadata
    // carries the endpoint and note ID ONLY. No note body or PHI.
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'clinical_notes.viewed',
        outcome: 'success',
        source: 'api',
        tenantId,
        actorType: 'USER',
        actorId: user.id,
        sessionId: session.id,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'clinical_notes_view',
          noteId: note.id,
        },
      });
    }

    return this.toResponse(note);
  }

  /**
   * GET /api/v1/clinical-notes/:id/history — view a note's full
   * append-only revision history.
   *
   * Authorized for clinical/operational read roles (permission
   * `clinical_notes:view`). Returns 404 if the note does not exist or is
   * not accessible in the authenticated scope (no existence leak).
   */
  async viewClinicalNoteHistory(
    noteId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ClinicalNoteHistoryResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session, user } = authResult;
    const scope = this.resolveScope(session, authResult.memberships);
    const { tenantId, organisationId, facilityId } = scope;

    this.validateScopeEntities(await this.fetchScopeEntities(scope));

    const revisions = await this.clinicalNotes.listRevisions(
      tenantId,
      organisationId,
      facilityId,
      noteId as ClinicalNoteId,
    );
    if (revisions === null) {
      throw clinicalNoteNotFound();
    }

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'clinical_notes.history_viewed',
        outcome: 'success',
        source: 'api',
        tenantId,
        actorType: 'USER',
        actorId: user.id,
        sessionId: session.id,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'clinical_notes_history',
          noteId,
        },
      });
    }

    return {
      noteId,
      revisions: revisions.map((r) => this.toRevisionResponse(r)),
    };
  }

  /**
   * POST /api/v1/clinical-notes/:id/sign — sign a draft/in_progress
   * clinical note (draft | in_progress -> signed).
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:sign`). Enforces the signing-authority
   * rule (BR-BC03-CLIN-031): the actor must be the note's author
   * (baseline; per-facility authority matrix deferred).
   */
  async signClinicalNote(
    noteId: string,
    request: SignClinicalNoteRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ClinicalNoteResponse | null> {
    return this.transition(
      noteId,
      'sign',
      'clinical_notes.signed',
      'clinical_notes_sign',
      request.actorId,
      cookieValue,
      auditContext,
      async (scope, note, actorId) => {
        // Validate the signing actor is eligible for the authenticated
        // facility (BC10). isEligibleForFacility returns false safely for
        // cross-scope access (no existence leak).
        const actorEligible = await this.providers.isEligibleForFacility(
          scope.tenantId,
          actorId,
          scope.facilityId,
        );
        if (!actorEligible) {
          throw clinicalNoteProviderNotFound();
        }
        // Enforce the signing-authority rule (BR-BC03-CLIN-031). The
        // baseline rule: the signing actor must be the note's author.
        // The per-facility authority matrix is deferred.
        const currentRevision = note.currentRevision;
        const allowed = this.signingAuthority.canSign(
          scope.tenantId,
          scope.facilityId,
          note.noteType,
          currentRevision.authorId,
          actorId,
        );
        if (!allowed) {
          throw clinicalNoteSigningAuthorityDenied();
        }
      },
      (_scope, _note, actorId) => ({
        actorId,
      }),
    );
  }

  /**
   * POST /api/v1/clinical-notes/:id/amend — amend a signed/amended
   * clinical note (signed | amended -> amended). Per BR-BC03-CLIN-032,
   * the amendment requires a reason (enforced by the Zod contract) and
   * an author. The original signed revision is preserved immutably.
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:amend`).
   */
  async amendClinicalNote(
    noteId: string,
    request: AmendClinicalNoteRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ClinicalNoteResponse | null> {
    return this.transition(
      noteId,
      'amend',
      'clinical_notes.amended',
      'clinical_notes_amend',
      request.actorId,
      cookieValue,
      auditContext,
      async (scope, _note, actorId) => {
        const actorEligible = await this.providers.isEligibleForFacility(
          scope.tenantId,
          actorId,
          scope.facilityId,
        );
        if (!actorEligible) {
          throw clinicalNoteProviderNotFound();
        }
      },
      (_scope, _note, actorId) => ({
        actorId,
        body: request.body,
        reason: request.reason,
      }),
    );
  }

  /**
   * POST /api/v1/clinical-notes/:id/addendum — add an addendum to a
   * signed/amended clinical note (signed | amended -> addendum).
   * Per BR-BC03-CLIN-032, the addendum requires a reason and an author.
   * `addendum` is terminal.
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:amend` — addendum is a write/amend
   * action per the resource-permission matrix).
   */
  async addAddendumToClinicalNote(
    noteId: string,
    request: AddendumClinicalNoteRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ClinicalNoteResponse | null> {
    return this.transition(
      noteId,
      'addendum',
      'clinical_notes.addendum_added',
      'clinical_notes_addendum',
      request.actorId,
      cookieValue,
      auditContext,
      async (scope, _note, actorId) => {
        const actorEligible = await this.providers.isEligibleForFacility(
          scope.tenantId,
          actorId,
          scope.facilityId,
        );
        if (!actorEligible) {
          throw clinicalNoteProviderNotFound();
        }
      },
      (_scope, _note, actorId) => ({
        actorId,
        body: request.body,
        reason: request.reason,
      }),
    );
  }

  /**
   * POST /api/v1/clinical-notes/:id/withdraw — withdraw a
   * draft/in_progress clinical note (draft | in_progress -> withdrawn).
   * Withdrawal is terminal (e.g. authored in error). Per STATUS_CODES.md
   * §5.3, withdrawal is recorded with reason and author.
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:amend` — withdrawal is a write/amend
   * action per the resource-permission matrix).
   */
  async withdrawClinicalNote(
    noteId: string,
    request: WithdrawClinicalNoteRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ClinicalNoteResponse | null> {
    return this.transition(
      noteId,
      'withdraw',
      'clinical_notes.withdrawn',
      'clinical_notes_withdraw',
      request.actorId,
      cookieValue,
      auditContext,
      async (scope, _note, actorId) => {
        const actorEligible = await this.providers.isEligibleForFacility(
          scope.tenantId,
          actorId,
          scope.facilityId,
        );
        if (!actorEligible) {
          throw clinicalNoteProviderNotFound();
        }
      },
      (_scope, _note, actorId) => ({
        actorId,
        body: '',
        reason: request.reason,
      }),
    );
  }

  // -------------------------------------------------------------------------
  // Shared internals
  // -------------------------------------------------------------------------

  /**
   * Shared lifecycle-transition workflow. Resolves the session, derives
   * scope, validates scope entities, validates the actor (via
   * `preTransition`), performs the scoped atomic transition, and emits
   * the audit event exactly once on a successful transition.
   *
   * The `preTransition` callback performs command-specific validation
   * (signing-authority for sign; actor eligibility for all). It runs
   * BEFORE the repository transition so validation failures emit no
   * audit event.
   *
   * The `buildInput` callback produces the repository input from the
   * validated actor. The repository performs the SERIALIZABLE
   * transition, source-state validation, and new-revision append.
   */
  private async transition(
    noteId: string,
    actionLabel: 'sign' | 'amend' | 'addendum' | 'withdraw',
    auditAction: ClinicalNoteAuditAction,
    endpoint: string,
    actorIdRaw: string,
    cookieValue: string | undefined,
    auditContext: AuditRequestContext | undefined,
    preTransition: (
      scope: ResolvedScope,
      note: ClinicalNote,
      actorId: ProviderId,
    ) => Promise<void>,
    buildInput: (
      scope: ResolvedScope,
      note: ClinicalNote,
      actorId: ProviderId,
    ) =>
      | Promise<{ actorId: ProviderId; body?: string; reason?: string }>
      | { actorId: ProviderId; body?: string; reason?: string },
  ): Promise<ClinicalNoteResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session, user } = authResult;
    const scope = this.resolveScope(session, authResult.memberships);
    const { tenantId, organisationId, facilityId } = scope;

    this.validateScopeEntities(await this.fetchScopeEntities(scope));

    // Read the note in scope BEFORE the transition so preTransition can
    // validate (e.g. signing-authority needs the note's author). A note
    // outside scope returns null safely (no existence leak).
    const note = await this.clinicalNotes.findById(
      tenantId,
      organisationId,
      facilityId,
      noteId as ClinicalNoteId,
    );
    if (note === null) {
      throw clinicalNoteNotFound();
    }

    const actorId = actorIdRaw as ProviderId;
    await preTransition(scope, note, actorId);

    const input = await buildInput(scope, note, actorId);

    let result;
    if (actionLabel === 'sign') {
      result = await this.clinicalNotes.sign(
        tenantId,
        organisationId,
        facilityId,
        noteId as ClinicalNoteId,
        { actorId },
      );
    } else if (actionLabel === 'amend') {
      result = await this.clinicalNotes.amend(
        tenantId,
        organisationId,
        facilityId,
        noteId as ClinicalNoteId,
        {
          body: input.body ?? '',
          reason: input.reason ?? '',
          actorId,
        },
      );
    } else if (actionLabel === 'addendum') {
      result = await this.clinicalNotes.addAddendum(
        tenantId,
        organisationId,
        facilityId,
        noteId as ClinicalNoteId,
        {
          body: input.body ?? '',
          reason: input.reason ?? '',
          actorId,
        },
      );
    } else {
      result = await this.clinicalNotes.withdraw(
        tenantId,
        organisationId,
        facilityId,
        noteId as ClinicalNoteId,
        {
          reason: input.reason ?? '',
          actorId,
        },
      );
    }

    if (result.outcome === 'not_found') {
      throw clinicalNoteNotFound();
    }
    if (result.outcome === 'invalid_source_state') {
      throw clinicalNoteInvalidTransition(actionLabel);
    }

    // outcome === 'transitioned'. Emit the audit event exactly once.
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: auditAction,
        outcome: 'success',
        source: 'api',
        tenantId,
        actorType: 'USER',
        actorId: user.id,
        sessionId: session.id,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint,
          noteId: result.note.id,
        },
      });
    }

    return this.toResponse(result.note);
  }

  private resolveScope(
    session: Session,
    memberships: readonly TenantMembership[],
  ): ResolvedScope {
    if (
      session.activeTenantMembershipId === null ||
      session.activeOrganisationId === null ||
      session.activeFacilityId === null
    ) {
      throw clinicAdminOverviewContextRequired();
    }
    const activeMembership = memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      throw clinicAdminOverviewContextRequired();
    }
    return {
      tenantId: activeMembership.tenantId,
      organisationId: session.activeOrganisationId,
      facilityId: session.activeFacilityId,
    };
  }

  private async fetchScopeEntities(scope: ResolvedScope) {
    const [tenant, organisation, facility] = await Promise.all([
      this.tenants.findById(scope.tenantId),
      this.organisations.findById(scope.tenantId, scope.organisationId),
      this.facilities.findById(scope.tenantId, scope.facilityId),
    ]);
    return { tenant, organisation, facility };
  }

  private validateScopeEntities(entities: {
    tenant: Tenant | null;
    organisation: Organisation | null;
    facility: Facility | null;
  }): void {
    const { tenant, organisation, facility } = entities;
    if (
      tenant === null ||
      tenant.status !== 'active' ||
      organisation === null ||
      organisation.status !== 'active' ||
      facility === null ||
      facility.status !== 'active'
    ) {
      throw clinicAdminOverviewContextRequired();
    }
    if (facility.organisationId !== organisation.id) {
      throw clinicAdminOverviewContextRequired();
    }
  }

  private toResponse(note: ClinicalNote): ClinicalNoteResponse {
    return {
      id: note.id,
      encounterId: note.encounterId,
      patientId: note.patientId,
      noteType: note.noteType,
      authorRole: note.authorRole,
      status: note.status,
      currentRevision: {
        revisionNumber: note.currentRevision.revisionNumber,
        action: note.currentRevision.action,
        body: note.currentRevision.body,
        authorId: note.currentRevision.authorId,
        signedAt: note.currentRevision.signedAt?.toISOString() ?? null,
      },
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private toRevisionResponse(
    revision: ClinicalNoteRevision,
  ): ClinicalNoteHistoryResponse['revisions'][number] {
    return {
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      action: revision.action,
      status: revision.status,
      body: revision.body,
      authorId: revision.authorId,
      authorRole: revision.authorRole,
      reason: revision.reason,
      signedAt: revision.signedAt?.toISOString() ?? null,
      createdAt: revision.createdAt.toISOString(),
    };
  }
}

interface ResolvedScope {
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId;
  readonly facilityId: FacilityId;
}
