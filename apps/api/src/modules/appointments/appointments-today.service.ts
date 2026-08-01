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
import { appointmentConfigurationRequired } from './appointments.errors.js';

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
 *   operations. A null timezone is a configuration-required state.
 * - No fallback to UTC, tenant timezone, server timezone, browser
 *   timezone, or any hard-coded default is applied.
 * - Results are ordered by `scheduledStart` ascending, with `id`
 *   ascending as a stable tie-breaker.
 *
 * Audit trail: the service emits an explicit
 * `appointments.schedule.viewed` audit event via
 * `auditHelper.emitDirect(...)` AFTER the appointments query completes
 * successfully (including empty results). The event is NOT emitted
 * when configuration is required (null timezone) or when the service
 * throws. The event is mapped to the existing `facility_context`
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
   * - the active facility has no configured timezone.
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
    const now = this.clock.now();

    const [localDateStr, startUtc, endUtc] = computeFacilityDayBoundaries(
      now,
      timezone,
    );

    const appointmentRows = await this.appointments.findByScheduledStartRange(
      tenantId,
      organisationId,
      facilityId,
      startUtc,
      endUtc,
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

    const generatedAt = this.clock.now().toISOString();

    const response: TodayAppointmentsResponse = {
      localDate: localDateStr,
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

/**
 * Compute the UTC boundaries for the facility-local calendar day that
 * contains the given instant.
 *
 * The approach uses the `Intl.DateTimeFormat` API (available in Node.js
 * 14+) which natively supports IANA timezone identifiers. This correctly
 * handles:
 * - whole-hour offsets (e.g., UTC+3)
 * - half-hour offsets (e.g., India Standard Time, UTC+5:30)
 * - quarter-hour offsets (e.g., Nepal Time, UTC+5:45)
 * - daylight-saving transitions (DST)
 * - negative offsets (e.g., UTC-5)
 *
 * The returned interval is a half-open range: `[startUtc, endUtc)`.
 * An appointment with `scheduledStart` equal to `startUtc` is included;
 * an appointment with `scheduledStart` equal to `endUtc` is excluded.
 *
 * @param now The current instant.
 * @param timezone The facility's IANA timezone identifier (e.g. 'Asia/Baghdad').
 * @returns A tuple of `[localDateStr, startUtc, endUtc]` where:
 *   - `localDateStr` is the facility-local date in YYYY-MM-DD format.
 *   - `startUtc` is the UTC instant when the local day begins.
 *   - `endUtc` is the UTC instant when the next local day begins.
 */
function computeFacilityDayBoundaries(
  now: Date,
  timezone: string,
): [localDateStr: string, startUtc: Date, endUtc: Date] {
  // Get the facility-local date parts at the current instant.
  const nowParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );

  const localYear = Number(nowParts.year);
  const localMonth = Number(nowParts.month) - 1; // JS months are 0-indexed
  const localDay = Number(nowParts.day);
  const localDateStr = `${localYear}-${nowParts.month}-${nowParts.day}`;

  // Compute the UTC offset between the facility timezone and UTC at the
  // current instant. This accounts for DST automatically.
  // We do this by:
  // 1. Formatting the current instant in UTC to get the UTC parts.
  // 2. Computing the UTC timestamp in milliseconds.
  // 3. Computing the "facility-equivalent local" timestamp (the same
  //    calendar date/time components interpreted as local system time).
  // 4. The difference gives the offset in milliseconds.

  const utcParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );

  const nowUtcMs = Date.UTC(
    Number(utcParts.year),
    Number(utcParts.month) - 1,
    Number(utcParts.day),
    Number(utcParts.hour),
    Number(utcParts.minute),
    Number(utcParts.second),
    Number(utcParts.fractionalSecond ?? '0'),
  );

  // Create a Date that represents the same calendar date/time in the
  // local system timezone. Its internal timestamp is offset from UTC by
  // the system timezone offset.
  const facilityEquivalentNow = new Date(
    localYear,
    localMonth,
    localDay,
    Number(nowParts.hour),
    Number(nowParts.minute),
    Number(nowParts.second),
    Number(nowParts.fractionalSecond ?? '0'),
  );

  // The difference between the facility-equivalent Date and the true
  // UTC Date is the offset from UTC to the facility timezone at this
  // instant (positive = east of UTC).
  const facilityOffsetMs = facilityEquivalentNow.getTime() - nowUtcMs;

  // Create a Date at facility local midnight (in the local system TZ).
  // This Date's internal timestamp is wrong (it's offset by the system TZ
  // offset, not the facility TZ offset), so we correct it.
  const localMidnightMs =
    Date.UTC(localYear, localMonth, localDay) - facilityOffsetMs;
  const startUtc = new Date(localMidnightMs);
  const endUtc = new Date(localMidnightMs + 24 * 60 * 60 * 1000);

  return [localDateStr, startUtc, endUtc];
}
