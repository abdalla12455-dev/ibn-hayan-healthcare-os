import { Injectable, Inject } from '@nestjs/common';
import type {
  AppointmentRepository,
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  AppointmentId,
} from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  APPOINTMENT_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import type { CancelAppointmentResponse } from '@ibn-hayan/contracts';
import {
  appointmentNotFound,
  appointmentInvalidTransition,
} from './appointments.errors.js';

/**
 * Appointment cancellation application service.
 *
 * Per the Stage 1D implementation specification, this service orchestrates
 * the appointment cancellation workflow for
 * `POST /api/v1/appointments/:id/cancel`. It:
 *
 * - Derives all scope (tenantId, organisationId, facilityId) from the
 *   authenticated session context. The request body does NOT contain scope.
 * - Resolves the appointment using a scoped repository lookup
 *   (`cancel(tenantId, organisationId, facilityId, appointmentId)`).
 *   An appointment outside the authenticated scope returns a safe
 *   `not_found` result (HTTP 404) with no cross-scope existence leak.
 * - Validates the canonical lifecycle transition: only `booked` is
 *   cancellable in this stage; `cancelled` is idempotent success.
 * - Performs the atomic cancellation within a SERIALIZABLE transaction
 *   with bounded P2034 retry (handled by the repository).
 * - Emits the `appointments.cancelled` audit event ONLY after a
 *   successful FIRST-TIME transition (`booked → cancelled`). An
 *   idempotent re-cancellation of an already-cancelled appointment
 *   does NOT emit a duplicate audit event.
 *
 * Security guarantees:
 * - The appointment lookup is scoped by session-derived tenantId,
 *   organisationId, and facilityId; cross-scope appointments return
 *   `not_found` (safe, no existence leak).
 * - The request body cannot override scope.
 * - The caller cannot supply an arbitrary target status; the transition
 *   is always `booked → cancelled`.
 *
 * Audit trail: the service emits an explicit `appointments.cancelled`
 * audit event via `auditHelper.emitDirect(...)` AFTER the appointment
 * transitions to `cancelled`. The event metadata carries
 * `{ endpoint: 'appointments_cancel', appointmentId: string, reason: string }`
 * — the appointment ID for traceability and the caller-supplied
 * cancellation reason. No patient details, provider details, or
 * appointment timing information are carried. The event is NOT emitted
 * for an idempotent re-cancellation, a validation failure, a not-found,
 * or an invalid transition.
 *
 * Idempotency: per STATUS_CODES.md §4.1, `cancelled` is terminal, and
 * per APPOINTMENTS.md §16.2 commands are idempotent where the operation
 * supports idempotency. Re-cancelling an already-cancelled appointment
 * returns the canonical success response WITHOUT emitting a duplicate
 * audit event and WITHOUT mutating the appointment.
 */
@Injectable()
export class AppointmentsCancellationService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointments: AppointmentRepository,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  /**
   * Cancel an existing appointment for the session identified by the
   * supplied cookie value.
   *
   * Returns `null` if:
   * - the cookie is missing or empty;
   * - the session does not exist, is revoked, or is expired;
   * - the user is disabled;
   * - the user has no active memberships.
   *
   * Throws `clinicAdminOverviewContextRequired()` (HTTP 403) if:
   * - the active facility context is missing or invalid.
   *
   * Throws `appointmentNotFound()` (HTTP 404) if:
   * - the appointment does not exist in the authenticated scope;
   * - the appointment exists in another tenant, organisation, or
   *   facility (safe same error, no existence leak).
   *
   * Throws `appointmentInvalidTransition()` (HTTP 422) if:
   * - the appointment is in a source state that is not canonically
   *   cancellable in this stage (only `booked` is cancellable).
   *
   * The authorisation check (R06, R07, or R09 role assignment on the
   * active membership holding `appointments:cancel`) is performed by
   * the `AuthorizationGuard` before the service is invoked.
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<CancelAppointmentResponse | null> {
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

    // Validate tenant, organisation, and facility existence and status
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

    // Perform the scoped, atomic cancellation. The repository handles
    // the SERIALIZABLE transaction, P2034 retry, and idempotency.
    const result = await this.appointments.cancel(
      tenantId,
      organisationId,
      facilityId,
      appointmentId as AppointmentId,
    );

    if (result.outcome === 'not_found') {
      throw appointmentNotFound();
    }

    if (result.outcome === 'invalid_source_state') {
      throw appointmentInvalidTransition();
    }

    // outcome === 'cancelled'
    // Emit the audit event ONLY for a first-time transition. An
    // idempotent re-cancellation (transitioned === false) does NOT
    // emit a duplicate event.
    if (result.transitioned && auditContext !== undefined) {
      const { user } = authResult;
      await this.auditHelper.emitDirect({
        action: 'appointments.cancelled',
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
          endpoint: 'appointments_cancel',
          appointmentId: result.appointment.id,
          reason,
        },
      });
    }

    const { appointment } = result;
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
