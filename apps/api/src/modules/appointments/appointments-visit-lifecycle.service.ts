import { Injectable, Inject } from '@nestjs/common';
import type {
  AppointmentRepository,
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  AppointmentId,
  AppointmentTransitionInput,
} from '@ibn-hayan/domain';
import type {
  ConfigurationResolutionPort,
  Appointment,
} from '@ibn-hayan/domain';
import { ConfigurationResolutionError } from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  APPOINTMENT_REPOSITORY,
  CONFIGURATION_RESOLUTION_PORT,
} from '../../infrastructure/database/index.js';
import {
  CLOCK_SERVICE_TOKEN,
  type ClockService,
} from '../../infrastructure/clock/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import type { AppointmentVisitLifecycleResponse } from '@ibn-hayan/contracts';
import { NO_SHOW_GRACE_PERIOD_KEY } from '@ibn-hayan/configuration';
import {
  appointmentNotFound,
  appointmentVisitInvalidTransition,
  appointmentNoShowGracePeriodNotElapsed,
} from './appointments.errors.js';

/**
 * The four canonical Stage 1F visit-lifecycle audit action codes. Each
 * is a member of the platform's `AuditActionCode` catalogue (see
 * `@ibn-hayan/observability` action-codes). Typing the `auditAction`
 * parameter as this literal union (rather than `string`) ensures the
 * service can only emit registered audit actions.
 */
type VisitLifecycleAuditAction =
  | 'appointments.confirmed'
  | 'appointments.checked_in'
  | 'appointments.started'
  | 'appointments.completed'
  | 'appointments.no_show_recorded';

/**
 * Appointment visit-lifecycle application service (Stage 1F).
 *
 * This service orchestrates the four canonical forward visit-lifecycle
 * transitions for an appointment:
 *
 * - confirm:    `booked` → `confirmed`
 * - check-in:   `booked` | `confirmed` → `arrived`
 * - start:      `arrived` → `in_progress`
 * - complete:   `in_progress` → `completed`
 *
 * Per STATUS_CODES.md §4.1 (AppointmentStatus transition map) and the
 * Stage 1F architecture gate, the transition graph is explicitly
 * enforced by the repository's `transitionStatus` primitive. The
 * caller NEVER supplies an arbitrary target status; each command fixes
 * its target and permitted source states.
 *
 * The service derives all scope (tenantId, organisationId,
 * facilityId) from the authenticated session context. The request body
 * contains NO scope, NO status, and NO actor identifiers.
 *
 * Idempotency decisions (per the Stage 1F architecture gate):
 * - confirm / check-in / start: non-terminal targets. A same-state
 *   re-application (e.g. confirming an already-confirmed appointment)
 *   is NOT a permitted transition-map edge and is rejected as an
 *   invalid transition (HTTP 422). This differs from cancellation
 *   idempotency, which applies only to the terminal `cancelled` state.
 * - complete: terminal target. Re-completing an already-completed
 *   appointment is an idempotent no-op (HTTP 200, no mutation, no
 *   audit event), mirroring the cancellation idempotency for the
 *   terminal `cancelled` state. This is essential for the
 *   complete-vs-complete concurrency race: one request transitions
 *   (audit once), the other re-observes `completed` and returns
 *   idempotent success (no duplicate audit).
 *
 * Audit trail: the service emits an explicit audit event via
 * `auditHelper.emitDirect(...)` ONLY after a successful FIRST-TIME
 * transition (`transitioned: true`). The audit actions are:
 * - `appointments.confirmed`
 * - `appointments.checked_in`
 * - `appointments.started`
 * - `appointments.completed`
 *
 * The event category is `facility_context` (matching the existing
 * appointments audit events). The metadata carries
 * `{ endpoint, appointmentId }` only — the appointment ID for
 * traceability. No patient details, provider details, appointment
 * timing, encounter references, or clinical content are carried (no
 * PHI). The audit event is NOT emitted for an idempotent
 * re-completion, a validation failure, a not-found, or an invalid
 * transition.
 *
 * Encounter (BC02) boundary: per STATUS_CODES.md §4.1, the InProgress
 * audit implication is "recorded with encounter reference" and the
 * Completed implication is "recorded with encounter outcome". BC02 is
 * NOT implemented. The encounter reference is future audit metadata;
 * it is NOT a hard dependency for starting or completing a visit. The
 * service does NOT fake an encounter reference. APPOINTMENTS.md §10.1
 * states completion "triggers encounter finalization (via the
 * Encounter module)" — an asynchronous downstream consumer, not a
 * synchronous hard dependency. BC02/BC07 will subscribe to completion
 * events in a future stage.
 *
 * Security guarantees:
 * - The appointment lookup is scoped by session-derived tenantId,
 *   organisationId, and facilityId; cross-scope appointments return
 *   `not_found` (safe, no existence leak).
 * - The request body cannot override scope, status, or actor.
 * - The authorisation check is performed by the `AuthorizationGuard`
 *   before the service is invoked (command-specific permissions:
 *   `appointments:confirm`, `appointments:check_in`,
 *   `appointments:start`, `appointments:complete`).
 */
@Injectable()
export class AppointmentsVisitLifecycleService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointments: AppointmentRepository,
    @Inject(CONFIGURATION_RESOLUTION_PORT)
    private readonly configurationResolution: ConfigurationResolutionPort,
    @Inject(CLOCK_SERVICE_TOKEN)
    private readonly clock: ClockService,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  /**
   * Confirm an appointment (`booked` → `confirmed`).
   *
   * Authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
   * Administrator (operational pre-arrival action).
   */
  async confirmAppointment(
    appointmentId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<AppointmentVisitLifecycleResponse | null> {
    return this.transition(
      appointmentId,
      {
        allowedSourceStates: ['booked'],
        targetStatus: 'confirmed',
        idempotentIfAlreadyAtTarget: false,
      },
      'appointments.confirmed',
      'appointments_confirm',
      'confirm',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Check a patient in (`booked` | `confirmed` → `arrived`).
   *
   * Authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
   * Administrator (operational arrival action). Per STATUS_CODES.md
   * §4.1, both `booked` (direct check-in) and `confirmed` are
   * canonically permitted source states for check-in.
   */
  async checkInAppointment(
    appointmentId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<AppointmentVisitLifecycleResponse | null> {
    return this.transition(
      appointmentId,
      {
        allowedSourceStates: ['booked', 'confirmed'],
        targetStatus: 'arrived',
        idempotentIfAlreadyAtTarget: false,
      },
      'appointments.checked_in',
      'appointments_check_in',
      'check-in',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Start a visit (`arrived` → `in_progress`).
   *
   * Authorized for R01 Physician only (clinical visit-progression
   * action). Per STATUS_CODES.md §4.1, InProgress means "Patient is
   * being seen by the practitioner".
   */
  async startAppointment(
    appointmentId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<AppointmentVisitLifecycleResponse | null> {
    return this.transition(
      appointmentId,
      {
        allowedSourceStates: ['arrived'],
        targetStatus: 'in_progress',
        idempotentIfAlreadyAtTarget: false,
      },
      'appointments.started',
      'appointments_start',
      'start',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Complete a visit (`in_progress` → `completed`).
   *
   * Authorized for R01 Physician only (clinical visit-progression
   * action). `completed` is a canonical terminal state. Re-completing
   * an already-completed appointment is an idempotent no-op (no
   * mutation, no audit event), mirroring the cancellation idempotency
   * for the terminal `cancelled` state.
   */
  async completeAppointment(
    appointmentId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<AppointmentVisitLifecycleResponse | null> {
    return this.transition(
      appointmentId,
      {
        allowedSourceStates: ['in_progress'],
        targetStatus: 'completed',
        idempotentIfAlreadyAtTarget: true,
      },
      'appointments.completed',
      'appointments_complete',
      'complete',
      cookieValue,
      auditContext,
    );
  }

  /**
   * Mark an appointment as a no-show
   * (`confirmed` | `arrived` → `no_show`).
   *
   * Per STATUS_CODES.md §4.1, the canonical no-show transitions are
   * `Confirmed → NoShow` and `CheckedIn → NoShow`. NoShow is a
   * terminal state with no outgoing transition edge. Per
   * APPOINTMENTS.md §7.1, no-show recording is "a manual action by
   * reception or clinical staff" and is "audited, with the recorder,
   * the time, and the justification (if required) recorded."
   *
   * The `reason` parameter is the optional caller-supplied
   * justification. Per APPOINTMENTS.md §7.1, justification is "if
   * required" (configurable per clinic type). The operator-ratified
   * storage model persists the reason on the appointment row
   * (`no_show_reason` column, max 500 chars) atomically with the
   * FIRST confirmed|arrived → no_show transition. The free-text
   * reason is stored on the appointment row, NOT in generic audit
   * metadata, to keep the audit trail PHI-safe.
   *
   * Re-marking an already-no_show appointment is an idempotent no-op
   * (no mutation, no audit event, no overwrite of the original
   * `noShowReason`), mirroring the terminal idempotency for
   * `completed` and `cancelled`.
   *
   * Authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
   * Administrator (the clinic-booking operational roles). R01
   * Physician, R02 Nurse, and R13 Platform/System Administrator are
   * denied (operator-ratified authorization matrix).
   */
  async markNoShow(
    appointmentId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
    reason?: string,
  ): Promise<AppointmentVisitLifecycleResponse | null> {
    return this.transition(
      appointmentId,
      {
        allowedSourceStates: ['confirmed', 'arrived'],
        targetStatus: 'no_show',
        idempotentIfAlreadyAtTarget: true,
        noShowReason: reason ?? null,
      },
      'appointments.no_show_recorded',
      'appointments_no_show',
      'no_show',
      cookieValue,
      auditContext,
      () =>
        this.assertNoShowGracePeriodElapsed(
          appointmentId,
          cookieValue,
          auditContext,
        ),
    );
  }

  /**
   * No-show grace-period gate (BC16). Resolves
   * `scheduling.appointment.noShowGracePeriod` through the canonical
   * Configuration resolution port with the session-derived trusted
   * scope. Scheduling NEVER performs layer resolution itself; it
   * only consumes the resolved value.
   *
   * The gate uses the injected clock and compares:
   * earliestNoShow = scheduledStart + resolvedGraceMinutes
   *   if now < earliestNoShow -> reject fail-closed
   *   if now == earliestNoShow -> allowed (equality permitted)
   *
   * The check is fail-closed: a resolution or scope failure
   * propagates and the transition is never attempted.
   */
  private async assertNoShowGracePeriodElapsed(
    appointmentId: string,
    cookieValue: string | undefined,
    auditContext: AuditRequestContext | undefined,
  ): Promise<void> {
    // Re-resolve the session so the scope is derived from trusted
    // context (never from the caller).
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return; // The outer transition returns null → 401.
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

    // Obtain the appointment through the existing scoped repository
    // logic (a scoped findById, never unscoped).
    const appointment: Appointment | null = await this.appointments.findById(
      tenantId,
      organisationId,
      facilityId,
      appointmentId as AppointmentId,
    );
    if (appointment === null) {
      throw appointmentNotFound();
    }

    // Resolve the grace period via the canonical Configuration port.
    let graceMinutes: number;
    try {
      const resolved = await this.configurationResolution.resolve(
        NO_SHOW_GRACE_PERIOD_KEY,
        { tenantId, organisationId, facilityId },
      );
      graceMinutes = resolved.value as number;
    } catch (error) {
      if (error instanceof ConfigurationResolutionError) {
        // Fail-closed: an incoherent registry/scope never silently
        // defaults to 15.
        throw new Error(
          `Configuration resolution failed for ${NO_SHOW_GRACE_PERIOD_KEY}: ${error.reason}`,
        );
      }
      throw error;
    }

    const earliestNoShow = new Date(
      appointment.scheduledStart.getTime() + graceMinutes * 60_000,
    );
    const now = this.clock.now();
    if (now.getTime() < earliestNoShow.getTime()) {
      throw appointmentNoShowGracePeriodNotElapsed();
    }
  }

  /**
   * Shared internal transition workflow.
   *
   * All four commands share the same session-resolution, scope
   * derivation, scoped-transition, and audit-emission logic. The only
   * per-command variation is the transition specification (source
   * states, target, idempotency), the audit action, the endpoint
   * label, and the invalid-transition message label.
   */
  private async transition(
    appointmentId: string,
    spec: AppointmentTransitionInput,
    auditAction: VisitLifecycleAuditAction,
    endpoint: string,
    actionLabel: 'confirm' | 'check-in' | 'start' | 'complete' | 'no_show',
    cookieValue: string | undefined,
    auditContext: AuditRequestContext | undefined,
    precondition?: () => Promise<void>,
  ): Promise<AppointmentVisitLifecycleResponse | null> {
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

    // Optional transition precondition (e.g. the no-show grace period
    // check). A thrown controlled error short-circuits the transition
    // before any mutation is attempted.
    if (precondition !== undefined) {
      await precondition();
    }

    // Perform the scoped, atomic transition. The repository handles
    // the SERIALIZABLE transaction, P2034 / DriverAdapterError retry,
    // source-state validation, and idempotency.
    const result = await this.appointments.transitionStatus(
      tenantId,
      organisationId,
      facilityId,
      appointmentId as AppointmentId,
      spec,
    );

    if (result.outcome === 'not_found') {
      throw appointmentNotFound();
    }

    if (result.outcome === 'invalid_source_state') {
      throw appointmentVisitInvalidTransition(actionLabel);
    }

    // outcome === 'already_at_target' (idempotent terminal re-completion)
    // OR outcome === 'transitioned'. Both return the canonical success
    // response. The audit event is emitted ONLY for a first-time
    // transition (transitioned: true). An idempotent already_at_target
    // result does NOT emit a duplicate audit event.
    if (result.outcome === 'transitioned' && auditContext !== undefined) {
      const { user } = authResult;
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
          appointmentId: result.appointment.id,
        },
      });
    }

    const appointment =
      result.outcome === 'transitioned'
        ? result.appointment
        : result.appointment;
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      providerId: appointment.providerId,
      scheduledStart: appointment.scheduledStart.toISOString(),
      scheduledEnd: appointment.scheduledEnd.toISOString(),
      status: appointment.status,
      typeCode: appointment.typeCode,
    };
  }
}
