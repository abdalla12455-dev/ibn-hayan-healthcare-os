import { Injectable, Inject } from '@nestjs/common';
import type {
  AppointmentRepository,
  FacilityRepository,
  TenantRepository,
  OrganisationRepository,
} from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  APPOINTMENT_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { CLOCK_SERVICE_TOKEN } from '../../infrastructure/clock/index.js';
import type { ClockService } from '../../infrastructure/clock/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import type {
  TodayAppointmentsResponse,
  AppointmentSummary,
} from '@ibn-hayan/contracts';
import {
  appointmentConfigurationRequired,
  appointmentInvalidTimezone,
} from './appointments.errors.js';
import {
  computeFacilityDayBoundaries,
  type FacilityDayBoundaries,
} from './facility-day-boundaries.js';

/**
 * Appointments application service.
 *
 * The service is the read-side orchestrator for the "Today's Appointments"
 * surface at `GET /api/v1/appointments/today`. It implements the
 * facility-local day boundary calculation and queries appointments
 * scoped to the authenticated session's active tenant, organisation,
 * and facility.
 *
 * Key behaviors:
 * - All tenant, organisation, facility, and identity context is
 *   derived from the authenticated server-side session. The service
 *   does NOT accept tenant, organisation, or facility scope from
 *   the request body or query string.
 * - Facility timezone is the authoritative timezone for facility-local
 *   operations. A null or invalid timezone is a configuration-required
 *   state.
 * - No fallback to UTC, tenant timezone, server timezone, browser
 *   timezone, or any hard-coded default is applied.
 * - Results are ordered by `scheduledStart` ascending, with `id`
 *   ascending as a stable tie-breaker.
 * - The clock is called exactly once per operation. The same instant
 *   is used for day-boundary calculation and for generatedAt.
 *
 * Audit trail: the service emits an explicit
 * `appointments.schedule.viewed` audit event via
 * `auditHelper.emitDirect(...)` AFTER the appointments query completes
 * successfully (including empty results). The event is NOT emitted
 * when configuration is required (null/invalid timezone) or when the
 * service throws. The event is mapped to the existing `facility_context`
 * category.
 */
@Injectable()
export class AppointmentsTodayService {
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
    @Inject(CLOCK_SERVICE_TOKEN)
    private readonly clock: ClockService,
  ) {}

  /**
   * Load the "Today's Appointments" response for the session
   * identified by the supplied cookie value.
   *
   * Returns `null` if:
   * - the cookie is missing or empty;
   * - the session does not exist, is revoked, or is expired;
   * - the user is disabled;
   * - the user has no active memberships.
   *
   * Throws `appointmentConfigurationRequired()` (HTTP 422) if:
   * - the active facility has no configured timezone (null).
   *
   * Throws `appointmentInvalidTimezone()` (HTTP 422) if:
   * - the active facility has an invalid IANA timezone identifier.
   *
   * The authorisation check (R09 role assignment on the active
   * membership) is performed by the `AuthorizationGuard` before
   * the service is invoked.
   */
  async loadTodayAppointments(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<TodayAppointmentsResponse | null> {
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
      facility.status !== 'active'
    ) {
      throw clinicAdminOverviewContextRequired();
    }

    if (facility.organisationId !== organisation.id) {
      throw clinicAdminOverviewContextRequired();
    }

    if (facility.timezone === null) {
      throw appointmentConfigurationRequired();
    }

    const timezone = facility.timezone;

    // Call clock.now() exactly once to get the operation instant.
    // This instant is used for both day-boundary calculation and generatedAt.
    const operationInstant = this.clock.now();

    // Validate the timezone by attempting to use it. Intl.DateTimeFormat
    // will throw a RangeError for invalid timezone identifiers.
    // Only RangeError is converted to APPOINTMENT_INVALID_TIMEZONE;
    // other errors are re-thrown unchanged.
    let boundaries: FacilityDayBoundaries;
    try {
      boundaries = computeFacilityDayBoundaries(operationInstant, timezone);
    } catch (error) {
      if (error instanceof RangeError) {
        throw appointmentInvalidTimezone();
      }
      throw error;
    }

    const appointmentRows = await this.appointments.findByScheduledStartRange(
      tenantId,
      organisationId,
      facilityId,
      boundaries.startUtc,
      boundaries.endUtc,
    );

    const summaries: AppointmentSummary[] = appointmentRows.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      providerId: a.providerId,
      scheduledStart: a.scheduledStart.toISOString(),
      scheduledEnd: a.scheduledEnd.toISOString(),
      status: a.status,
      typeCode: a.typeCode,
    }));

    // Use the exact operation instant for generatedAt.
    const generatedAt = operationInstant.toISOString();

    const response: TodayAppointmentsResponse = {
      localDate: boundaries.localDate,
      timezone,
      generatedAt,
      appointments: summaries,
    };

    if (auditContext !== undefined) {
      const { user } = authResult;
      await this.auditHelper.emitDirect({
        action: 'appointments.schedule.viewed',
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
        metadata: { endpoint: 'appointments_today_view' },
      });
    }

    return response;
  }
}
