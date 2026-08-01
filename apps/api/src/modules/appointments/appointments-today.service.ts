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

    // Validate the timezone by attempting to use it. Intl.DateTimeFormat
    // will throw a RangeError for invalid timezone identifiers.
    let boundaries: { localDate: string; startUtc: Date; endUtc: Date };
    try {
      const now = this.clock.now();
      boundaries = computeFacilityDayBoundaries(now, timezone);
    } catch {
      throw appointmentInvalidTimezone();
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

    // Use the same instant that was used for boundary calculation.
    const generatedAt = boundaries.startUtc.toISOString();

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

/**
 * Compute the UTC offset for a specific UTC instant in a given timezone.
 * Returns offset in milliseconds (positive = east of UTC).
 *
 * We determine the offset by:
 * 1. Formatting the UTC instant in the target timezone to get local parts.
 * 2. Converting those local parts to UTC using Date.UTC (not system local time).
 * 3. Computing the difference between that UTC equivalent and the original UTC instant.
 */
function getOffsetAtUtc(utcInstant: Date, timezone: string): number {
  // Get local parts at the UTC instant
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(utcInstant)
      .map((p) => [p.type, p.value]),
  );

  // Convert local parts to UTC using Date.UTC (NOT the Date constructor,
  // which uses system local time). This gives us the UTC instant that
  // corresponds to "this local time in this timezone".
  const utcEquiv = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return utcEquiv - utcInstant.getTime();
}

/**
 * Compute the UTC boundaries for the facility-local calendar day that
 * contains the given instant.
 *
 * This function is independent of the server/process timezone. It uses
 * `Intl.DateTimeFormat` (available in Node.js 14+) which natively supports
 * IANA timezone identifiers and correctly handles:
 * - whole-hour offsets (e.g., UTC+3)
 * - half-hour offsets (e.g., India Standard Time, UTC+5:30)
 * - quarter-hour offsets (e.g., Nepal Time, UTC+5:45)
 * - daylight-saving transitions (DST) including spring-forward (23-hour)
 *   and fall-back (25-hour) days
 * - negative offsets (e.g., UTC-5)
 *
 * The returned interval is a half-open range: `[startUtc, endUtc)`.
 * An appointment with `scheduledStart` equal to `startUtc` is included;
 * an appointment with `scheduledStart` equal to `endUtc` is excluded.
 *
 * The algorithm correctly handles DST by:
 * 1. Computing the offset at the START of the local day (at midnight).
 * 2. Computing the offset at the START of the NEXT local day (at midnight).
 * 3. Using those offsets to compute the UTC boundaries.
 * 4. If the offsets differ (DST transition occurred), adjusting the
 *    interval by the difference to get the correct duration.
 *
 * @param now The current instant.
 * @param timezone The facility's IANA timezone identifier (e.g. 'Asia/Baghdad').
 * @returns An object containing:
 *   - `localDate`: the facility-local date in YYYY-MM-DD format.
 *   - `startUtc`: the UTC instant when the local day begins (inclusive).
 *   - `endUtc`: the UTC instant when the next local day begins (exclusive).
 * @throws RangeError if the timezone is not a valid IANA identifier.
 */
function computeFacilityDayBoundaries(
  now: Date,
  timezone: string,
): { localDate: string; startUtc: Date; endUtc: Date } {
  // Get the facility-local date parts at the current instant.
  // Using 'en-CA' locale gives YYYY-MM-DD format for unambiguous parsing.
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
  const localDate = `${localYear}-${nowParts.month}-${nowParts.day}`;

  // Compute UTC midnight for today and tomorrow using UTC date arithmetic.
  const todayUtcMidnight = Date.UTC(localYear, localMonth, localDay);
  const tomorrowUtcMidnight = Date.UTC(localYear, localMonth, localDay + 1);

  // Get the offset at today's midnight (not at the current instant).
  // This correctly handles the offset for the start of the day.
  const offsetAtStart = getOffsetAtUtc(new Date(todayUtcMidnight), timezone);

  // Calculate the UTC instant of local midnight today.
  const startUtc = new Date(todayUtcMidnight - offsetAtStart);

  // Get the offset at tomorrow's UTC midnight.
  // This tells us the offset at the START of the next local day.
  const offsetAtEnd = getOffsetAtUtc(new Date(tomorrowUtcMidnight), timezone);

  // Calculate the naive UTC instant of tomorrow's local midnight
  // (using today's offset, which is what the simple algorithm does).
  const naiveEndUtc = todayUtcMidnight + 24 * 60 * 60 * 1000 - offsetAtStart;

  // If the offset changed between today and tomorrow (DST transition),
  // we need to adjust the end boundary.
  // - For fall-back (offset becomes MORE negative, e.g., -4h -> -5h):
  //   the interval is 24 + 1 = 25 hours.
  // - For spring-forward (offset becomes LESS negative, e.g., -5h -> -4h):
  //   the interval is 24 - 1 = 23 hours.
  // The difference in offsets (offsetAtEnd - offsetAtStart) tells us
  // how to adjust.
  // - Fall-back: offsetDelta < 0 (e.g., -3600000), we need to ADD to interval
  // - Spring-forward: offsetDelta > 0 (e.g., +3600000), we need to SUBTRACT from interval
  const offsetDelta = offsetAtEnd - offsetAtStart; // in ms
  // For fall-back (offset becomes more negative), add |offsetDelta|
  // For spring-forward (offset becomes less negative), subtract offsetDelta
  const adjustedEndUtc = naiveEndUtc - offsetDelta;

  return { localDate, startUtc, endUtc: new Date(adjustedEndUtc) };
}
