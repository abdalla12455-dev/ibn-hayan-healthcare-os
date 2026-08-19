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
import { appointmentNotFound } from './appointments.errors.js';
import type { AppointmentDetailResponse } from '@ibn-hayan/contracts';

/**
 * Appointment detail read service.
 *
 * Implements `GET /api/v1/appointments/:id`, the explicit authorized
 * read surface that exposes the persisted `noShowReason`. Guarded by
 * `appointments:no_show_reason_read` (R06/R07/R09; R01/R02/R13 denied).
 *
 * Scope (tenantId/organisationId/facilityId) is derived ONLY from the
 * authenticated session. Cross-scope access returns `404
 * appointmentNotFound` (no existence leak).
 *
 * The exposed fields are deliberately the canonical appointment
 * identity plus the no-show reason: patientId/providerId (already
 * allowed by the appointment contract), scheduled window, status,
 * typeCode, and `noShowReason`. Broad today/list projections remain
 * unchanged and continue to exclude `noShowReason`.
 *
 * Audit: `appointments.detail.viewed` is emitted after a successful
 * read ONLY when the caller-supplied appointment matches in scope.
 * Metadata carries `{ endpoint: 'appointments_detail', appointmentId }` —
 * no reason text, no patient/provider fields (PHI-free).
 */
@Injectable()
export class AppointmentsDetailService {
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
   * Load the appointment detail for appointment `id`.
   *
   * Returns `null` when the session is missing/invalid. Throws 403
   * when the active tenant/org/facility context is incomplete. Throws
   * 404 when the appointment does not match the scoped identifiers.
   */
  async loadDetail(
    appointmentId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<AppointmentDetailResponse | null> {
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
      facility.status !== 'active' ||
      facility.organisationId !== organisation.id
    ) {
      throw clinicAdminOverviewContextRequired();
    }

    const appointment = await this.appointments.findById(
      tenantId,
      organisationId,
      facilityId,
      appointmentId as AppointmentId,
    );
    if (appointment === null) {
      throw appointmentNotFound();
    }

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'appointments.detail.viewed',
        outcome: 'success',
        source: 'api',
        tenantId,
        actorType: 'USER',
        actorId: authResult.user.id,
        sessionId: session.id,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'appointments_detail',
          appointmentId: appointment.id,
        },
      });
    }

    return {
      id: appointment.id,
      patientId: appointment.patientId,
      providerId: appointment.providerId,
      scheduledStart: appointment.scheduledStart.toISOString(),
      scheduledEnd: appointment.scheduledEnd.toISOString(),
      status: appointment.status,
      typeCode: appointment.typeCode,
      noShowReason: appointment.noShowReason,
    };
  }
}
