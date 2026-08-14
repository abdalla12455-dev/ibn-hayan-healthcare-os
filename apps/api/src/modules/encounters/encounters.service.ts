import { Injectable, Inject } from '@nestjs/common';
import {
  type EncounterRepository,
  type AppointmentRepository,
  type PatientRepository,
  type ProviderRepository,
  type TenantRepository,
  type OrganisationRepository,
  type FacilityRepository,
  type TreatmentConsentVerificationPort,
  type EncounterId,
  type EncounterCreateInput,
  type EncounterTransitionInput,
  type PatientId,
  type ProviderId,
  type AppointmentId,
  TREATMENT_CONSENT_VERIFICATION_PORT,
} from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  APPOINTMENT_REPOSITORY,
  PATIENT_REPOSITORY,
  WORKFORCE_REPOSITORY,
  ENCOUNTER_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import { ConsentGateFeatureConfig } from './consent-gate-feature.config.js';
import type {
  CreateEncounterRequest,
  CreateEncounterResponse,
  EncounterResponse,
  CancelEncounterRequest,
} from '@ibn-hayan/contracts';
import {
  encounterNotFound,
  encounterInvalidTransition,
  encounterPatientNotFound,
  encounterProviderNotFound,
  encounterAppointmentNotFound,
  encounterDuplicateAppointment,
  encounterConsentRequired,
} from './encounters.errors.js';

/**
 * The canonical encounter audit action codes (Stage 2A). Each is a
 * member of the platform's `AuditActionCode` catalogue (see
 * `@ibn-hayan/observability` action-codes). Typing the `auditAction`
 * parameter as this literal union (rather than `string`) ensures the
 * service can only emit registered audit actions.
 */
type EncounterAuditAction =
  | 'encounters.created'
  | 'encounters.arrived'
  | 'encounters.started'
  | 'encounters.on_leave'
  | 'encounters.resumed'
  | 'encounters.finished'
  | 'encounters.cancelled';

/**
 * Encounters application service (Stage 2A — BC02 Encounter Foundation).
 *
 * This service orchestrates the encounter creation and lifecycle
 * workflows for the BC02 bounded context. It:
 *
 * - Derives all scope (tenantId, organisationId, facilityId) from the
 *   authenticated session context. The request body does NOT contain
 *   scope, status, or actor identifiers.
 * - Validates the patient reference via BC01
 *   `PatientRepository.existsInTenant()` (logical reference, no FK).
 * - Validates the provider reference via BC10
 *   `ProviderRepository.isEligibleForFacility()` (logical reference,
 *   no FK; checks existence in tenant, active status, and active
 *   facility assignment).
 * - Validates the optional appointment reference via BC06
 *   `AppointmentRepository.findById()` (logical reference, no FK;
 *   scoped to the authenticated tenant/organisation/facility so a
 *   cross-scope appointment returns not-found, no existence leak).
 * - Enforces the consent gate (operator-ratified product rule) at
 *   encounter creation. The gate is a configuration-gated safety
 *   check; when enforced, the BC01 TreatmentConsentVerificationPort is
 *   consulted to verify an active granted treatment consent. A
 *   non-emergency encounter without an active granted consent is
 *   blocked (fail-safe). The emergency carve-out (emergency
 *   encounterType or priority with required justification) is the
 *   ONLY path through the enforced gate without an active granted
 *   consent. The gate never fabricates consent and never treats
 *   missing consent as granted.
 * - Enforces the canonical lifecycle transition graph
 *   (STATUS_CODES.md §10.2) via the repository's atomic conditional
 *   `transitionStatus` primitive.
 * - Emits the canonical encounter audit events (one per actual state
 *   change; no duplicate on idempotent terminal re-application).
 *
 * Appointment synchronization (Stage 2A specification item 8G):
 *
 * BC02 Encounter and BC06 Scheduling (Appointment) are separate
 * bounded contexts. They remain independently owned. The chosen
 * contract is: encounters reference appointments by logical
 * identifier; appointment commands do NOT automatically drive
 * encounter transitions and encounter commands do NOT directly
 * mutate appointment state in this stage. The appointment's
 * encounter-reference/outcome deferred in Stage 1F is closed by this
 * foundation's existence of the Encounter entity: appointment
 * completion's "encounter finalization" is an asynchronous downstream
 * boundary documented in APPOINTMENTS.md §10.1, NOT a synchronous
 * cross-context mutation. This foundation establishes the Encounter
 * state without automatic synchronization; a future stage wires the
 * asynchronous downstream consumer. The Appointment and Encounter
 * lifecycles cannot silently diverge under this contract because no
 * automatic cross-context mutation exists to diverge.
 *
 * Security guarantees:
 * - The encounter lookup is scoped by session-derived tenantId,
 *   organisationId, and facilityId; cross-scope encounters return
 *   `not_found` (safe, no existence leak).
 * - The request body cannot override scope, status, or actor.
 * - The authorisation check is performed by the `AuthorizationGuard`
 *   before the service is invoked (command-specific permissions).
 */
@Injectable()
export class EncountersService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointments: AppointmentRepository,
    @Inject(PATIENT_REPOSITORY)
    private readonly patients: PatientRepository,
    @Inject(WORKFORCE_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(ENCOUNTER_REPOSITORY)
    private readonly encounters: EncounterRepository,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
    private readonly consentGate: ConsentGateFeatureConfig,
    @Inject(TREATMENT_CONSENT_VERIFICATION_PORT)
    private readonly consentVerification: TreatmentConsentVerificationPort,
  ) {}

  /**
   * Create a new encounter (POST /api/v1/encounters).
   *
   * The encounter is created in the canonical initial `planned` status
   * (ENUMS.md §4.1 / STATUS_CODES.md §5.1). The caller does NOT supply
   * scope, status, or actor.
   *
   * Consent gate (operator-ratified product rule):
   * - If the gate is enforced AND the encounter is NOT an emergency
   *   (encounterType !== 'emergency' AND priority !== 'emergency'),
   *   the BC01 TreatmentConsentVerificationPort is consulted. If the
   *   verification returns `granted`, the encounter proceeds. If it
   *   returns `not_granted`, `expired`, `withdrawn`, or `unknown`
   *   (infrastructure failure), the encounter is blocked (fail-safe).
   *   Missing consent is NEVER silently treated as granted.
   * - If the gate is enforced AND the encounter IS an emergency, the
   *   emergency carve-out applies: the encounter is created, and the
   *   `encounters.created` audit event carries the
   *   `emergencyJustification` in its metadata (the canonical basis
   *   for the carve-out, BR-BC15-REG-003 "documented with reason").
   *   No fake consent record is created.
   * - If the gate is disabled (development only), the encounter is
   *   created and the audit event carries `consentGateEnforced: false`
   *   so the disablement is auditable.
   *
   * Authorized for R01 Physician and R02 Nurse (clinical encounter
   * creation; permission `encounters:create`).
   */
  async createEncounter(
    request: CreateEncounterRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<CreateEncounterResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session } = authResult;

    if (
      session.activeTenantMembershipId === null ||
      session.activeOrganisationId === null ||
      session.activeFacilityId === null
    ) {
      throw clinicAdminOverviewContextRequired();
    }

    const activeMembership = authResult.memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      throw clinicAdminOverviewContextRequired();
    }
    const tenantId = activeMembership.tenantId;
    const organisationId = session.activeOrganisationId;
    const facilityId = session.activeFacilityId;

    // Validate tenant, organisation, and facility existence and status.
    const [tenant, organisation, facility] = await Promise.all([
      this.tenants.findById(tenantId),
      this.organisations.findById(tenantId, organisationId),
      this.facilities.findById(tenantId, facilityId),
    ]);

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

    // Determine emergency status from the contract-validated request.
    const isEmergency =
      request.encounterType === 'emergency' || request.priority === 'emergency';

    // Consent gate (operator-ratified product rule). The gate runs at
    // encounter creation. When enforced and the encounter is NOT an
    // emergency, the BC01 TreatmentConsentVerificationPort is consulted
    // to verify an active granted treatment consent. The emergency
    // carve-out (emergency encounterType or priority with required
    // justification) is the ONLY path through the enforced gate without
    // an active granted consent.
    //
    // Per architecture gate 11/12 (BC01 consent-verification port):
    // BC02 consumes the BC01-owned port; it does NOT query BC01 Prisma
    // tables directly. The port returns a typed result so the encounter
    // gate can fail safely and audit the precise reason for the block:
    // - granted → proceed
    // - not_granted / expired / withdrawn / unknown → fail safely
    //   (encounterConsentRequired). An infrastructure failure (unknown)
    //   is NEVER treated as consent granted.
    //
    // The emergency carve-out never creates fake consent: an emergency
    // encounter proceeds WITHOUT a consent record under BR-BC15-REG-003;
    // the audit event carries `emergency: true` and the justification.
    // The Encounter does NOT mutate Patient consent.
    const consentGateEnforced = this.consentGate.isConsentGateEnabled();
    let consentVerified = false;
    if (consentGateEnforced && !isEmergency) {
      const consentResult =
        await this.consentVerification.verifyActiveTreatmentConsent(
          tenantId,
          request.patientId as PatientId,
          new Date(),
        );
      if (consentResult.status !== 'granted') {
        // Fail-safe: no active granted treatment consent. Missing,
        // expired, withdrawn, or unknown consent is NEVER treated as
        // granted. The emergency carve-out is the ONLY path through.
        throw encounterConsentRequired();
      }
      consentVerified = true;
    }

    // Validate patient exists in the authenticated tenant. Uses
    // session-derived tenantId; cross-tenant lookups return false
    // safely (no existence leak).
    const patientExists = await this.patients.existsInTenant(
      tenantId,
      request.patientId as PatientId,
    );
    if (!patientExists) {
      throw encounterPatientNotFound();
    }

    // Validate provider is eligible for the authenticated facility.
    // Uses session-derived tenantId and facilityId; checks existence
    // in tenant, active status, and active facility assignment.
    const providerEligible = await this.providers.isEligibleForFacility(
      tenantId,
      request.providerId as ProviderId,
      facilityId,
    );
    if (!providerEligible) {
      throw encounterProviderNotFound();
    }

    // Validate the optional appointment reference. When supplied, it
    // must reference an appointment in the authenticated scope (no
    // existence leak). BC02 holds a logical identifier, not a FK.
    let appointmentId: AppointmentId | null = null;
    if (request.appointmentId !== null && request.appointmentId !== undefined) {
      appointmentId = request.appointmentId as AppointmentId;
      const appointment = await this.appointments.findById(
        tenantId,
        organisationId,
        facilityId,
        appointmentId,
      );
      if (appointment === null) {
        throw encounterAppointmentNotFound();
      }
    }

    // Create the encounter (duplicate-appointment detection and
    // SERIALIZABLE concurrency safety are handled by the repository).
    const createInput: EncounterCreateInput = {
      patientId: request.patientId as PatientId,
      providerId: request.providerId as ProviderId,
      appointmentId,
      encounterType: request.encounterType,
      priority: request.priority,
      emergencyJustification: request.emergencyJustification ?? null,
    };

    const result = await this.encounters.create(
      tenantId,
      organisationId,
      facilityId,
      createInput,
    );

    if (result.outcome === 'duplicate_appointment') {
      throw encounterDuplicateAppointment();
    }

    // outcome === 'created'. Emit the audit event after successful
    // creation. The metadata carries the endpoint and encounter ID
    // for traceability, plus consent-gate decision metadata. For an
    // emergency encounter, the emergency justification is carried
    // (the canonical basis for the carve-out). No PHI is carried.
    if (auditContext !== undefined) {
      const { user } = authResult;
      const metadata: Record<string, unknown> = {
        endpoint: 'encounters_create',
        encounterId: result.encounter.id,
        consentGateEnforced,
        consentVerified,
      };
      if (isEmergency) {
        metadata.emergency = true;
        metadata.emergencyJustification = request.emergencyJustification;
      }
      await this.auditHelper.emitDirect({
        action: 'encounters.created',
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
        metadata,
      });
    }

    return this.toResponse(result.encounter);
  }

  /**
   * Arrive an encounter (planned → arrived). Patient check-in.
   *
   * Authorized for R01 Physician and R02 Nurse (permission
   * `encounters:arrive`). Non-terminal target: a same-state
   * re-application is an invalid transition.
   */
  async arriveEncounter(
    encounterId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EncounterResponse | null> {
    return this.transition(
      encounterId,
      {
        allowedSourceStates: ['planned'],
        targetStatus: 'arrived',
        idempotentIfAlreadyAtTarget: false,
      },
      'encounters.arrived',
      'encounters_arrive',
      'arrive',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Start an encounter (planned | arrived → in_progress). The
   * planned → in_progress edge is the direct-start / emergency path.
   *
   * Authorized for R01 Physician only (practitioner starts the
   * encounter; permission `encounters:start`). Non-terminal target:
   * a same-state re-application is an invalid transition.
   */
  async startEncounter(
    encounterId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EncounterResponse | null> {
    return this.transition(
      encounterId,
      {
        allowedSourceStates: ['planned', 'arrived'],
        targetStatus: 'in_progress',
        idempotentIfAlreadyAtTarget: false,
      },
      'encounters.started',
      'encounters_start',
      'start',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Put an encounter on leave (in_progress → on_leave).
   *
   * Authorized for R01 Physician only (permission `encounters:on_leave`).
   * Non-terminal target: a same-state re-application is an invalid
   * transition.
   */
  async onLeaveEncounter(
    encounterId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EncounterResponse | null> {
    return this.transition(
      encounterId,
      {
        allowedSourceStates: ['in_progress'],
        targetStatus: 'on_leave',
        idempotentIfAlreadyAtTarget: false,
      },
      'encounters.on_leave',
      'encounters_on_leave',
      'on-leave',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Resume an encounter (on_leave → in_progress).
   *
   * Authorized for R01 Physician only (permission `encounters:resume`).
   * Non-terminal target: a same-state re-application is an invalid
   * transition.
   */
  async resumeEncounter(
    encounterId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EncounterResponse | null> {
    return this.transition(
      encounterId,
      {
        allowedSourceStates: ['on_leave'],
        targetStatus: 'in_progress',
        idempotentIfAlreadyAtTarget: false,
      },
      'encounters.resumed',
      'encounters_resume',
      'resume',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Finish an encounter (in_progress → finished). `finished` is a
   * canonical terminal state.
   *
   * Authorized for R01 Physician only (practitioner concludes the
   * encounter; permission `encounters:finish`). Terminal target:
   * re-finishing an already-finished encounter is an idempotent no-op
   * (no mutation, no audit event), mirroring the appointment
   * completion idempotency.
   */
  async finishEncounter(
    encounterId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EncounterResponse | null> {
    return this.transition(
      encounterId,
      {
        allowedSourceStates: ['in_progress'],
        targetStatus: 'finished',
        idempotentIfAlreadyAtTarget: true,
      },
      'encounters.finished',
      'encounters_finish',
      'finish',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Cancel an encounter (planned | arrived | in_progress → cancelled).
   * `cancelled` is a canonical terminal state.
   *
   * Authorized for R01 Physician and R02 Nurse (permission
   * `encounters:cancel`). Terminal target: re-cancelling an
   * already-cancelled encounter is an idempotent no-op (no mutation,
   * no audit event). An optional free-text `reason` is carried in the
   * audit event metadata (per STATUS_CODES.md §10.2, cancellation is
   * "recorded with reason and actor"). Cancellation from `on_leave`
   * is NOT in the canonical transition map and is therefore not
   * permitted (returns invalid transition).
   */
  async cancelEncounter(
    encounterId: string,
    request: CancelEncounterRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EncounterResponse | null> {
    return this.transition(
      encounterId,
      {
        allowedSourceStates: ['planned', 'arrived', 'in_progress'],
        targetStatus: 'cancelled',
        idempotentIfAlreadyAtTarget: true,
      },
      'encounters.cancelled',
      'encounters_cancel',
      'finish',
      cookieValue,
      auditContext,
      request.reason,
    );
  }

  /**
   * View a single encounter (GET /api/v1/encounters/:id).
   *
   * Authorized for all clinical/operational read roles (permission
   * `encounters:view`). Returns the canonical encounter response, or
   * 404 if the encounter does not exist or is not accessible in the
   * authenticated scope (no existence leak). Emits NO audit event
   * (read-only view; the authorization-decision event from the guard
   * is the audit trail for the access).
   */
  async viewEncounter(
    encounterId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<EncounterResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session } = authResult;

    if (
      session.activeTenantMembershipId === null ||
      session.activeOrganisationId === null ||
      session.activeFacilityId === null
    ) {
      throw clinicAdminOverviewContextRequired();
    }

    const activeMembership = authResult.memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      throw clinicAdminOverviewContextRequired();
    }
    const tenantId = activeMembership.tenantId;
    const organisationId = session.activeOrganisationId;
    const facilityId = session.activeFacilityId;

    const encounter = await this.encounters.findById(
      tenantId,
      organisationId,
      facilityId,
      encounterId as EncounterId,
    );

    if (encounter === null) {
      throw encounterNotFound();
    }

    return this.toResponse(encounter);
  }

  /**
   * Shared internal lifecycle-transition workflow.
   *
   * All lifecycle commands share the same session-resolution, scope
   * derivation, scoped-transition, and audit-emission logic. The only
   * per-command variation is the transition specification (source
   * states, target, idempotency), the audit action, the endpoint
   * label, and the invalid-transition message label.
   */
  private async transition(
    encounterId: string,
    spec: EncounterTransitionInput,
    auditAction: EncounterAuditAction,
    endpoint: string,
    actionLabel: 'arrive' | 'start' | 'on-leave' | 'resume' | 'finish',
    cookieValue: string | undefined,
    auditContext: AuditRequestContext | undefined,
    cancelReason?: string,
  ): Promise<EncounterResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session } = authResult;

    if (
      session.activeTenantMembershipId === null ||
      session.activeOrganisationId === null ||
      session.activeFacilityId === null
    ) {
      throw clinicAdminOverviewContextRequired();
    }

    const activeMembership = authResult.memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      throw clinicAdminOverviewContextRequired();
    }
    const tenantId = activeMembership.tenantId;
    const organisationId = session.activeOrganisationId;
    const facilityId = session.activeFacilityId;

    // Validate tenant, organisation, and facility existence and status.
    const [tenant, organisation, facility] = await Promise.all([
      this.tenants.findById(tenantId),
      this.organisations.findById(tenantId, organisationId),
      this.facilities.findById(tenantId, facilityId),
    ]);

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

    // Perform the scoped, atomic transition. The repository handles
    // the SERIALIZABLE transaction, P2034 / DriverAdapterError retry,
    // source-state validation, and idempotency.
    const result = await this.encounters.transitionStatus(
      tenantId,
      organisationId,
      facilityId,
      encounterId as EncounterId,
      spec,
    );

    if (result.outcome === 'not_found') {
      throw encounterNotFound();
    }

    if (result.outcome === 'invalid_source_state') {
      throw encounterInvalidTransition(actionLabel);
    }

    // outcome === 'already_at_target' (idempotent terminal
    // re-application) OR outcome === 'transitioned'. Both return the
    // canonical success response. The audit event is emitted ONLY for
    // a first-time transition (transitioned: true). An idempotent
    // already_at_target result does NOT emit a duplicate audit event.
    if (result.outcome === 'transitioned' && auditContext !== undefined) {
      const { user } = authResult;
      const metadata: Record<string, unknown> = {
        endpoint,
        encounterId: result.encounter.id,
      };
      if (cancelReason !== undefined) {
        metadata.cancelReason = cancelReason;
      }
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
        metadata,
      });
    }

    const encounter =
      result.outcome === 'transitioned' ? result.encounter : result.encounter;
    return this.toResponse(encounter);
  }

  /**
   * Map a domain Encounter to the canonical contract response. Exposes
   * ONLY the fields in the {@link EncounterResponse} contract (no scope
   * fields, no audit timestamps).
   */
  private toResponse(encounter: {
    id: string;
    patientId: string;
    providerId: string;
    appointmentId: string | null;
    encounterType: string;
    status: string;
    priority: string;
  }): EncounterResponse {
    return {
      id: encounter.id,
      patientId: encounter.patientId,
      providerId: encounter.providerId,
      appointmentId: encounter.appointmentId,
      encounterType:
        encounter.encounterType as EncounterResponse['encounterType'],
      status: encounter.status as EncounterResponse['status'],
      priority: encounter.priority as EncounterResponse['priority'],
    };
  }
}
