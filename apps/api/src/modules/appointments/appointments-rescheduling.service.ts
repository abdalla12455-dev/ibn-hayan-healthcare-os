import { Injectable, Inject } from '@nestjs/common';
import type {
  AppointmentRepository,
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  PatientRepository,
  ProviderRepository,
  AppointmentId,
} from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  APPOINTMENT_REPOSITORY,
  PATIENT_REPOSITORY,
  WORKFORCE_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { CLOCK_SERVICE_TOKEN } from '../../infrastructure/clock/index.js';
import type { ClockService } from '../../infrastructure/clock/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import type {
  RescheduleAppointmentRequest,
  RescheduleAppointmentResponse,
} from '@ibn-hayan/contracts';
import {
  appointmentValidationError,
  appointmentOverlap,
  appointmentPastTime,
  appointmentNotFound,
  appointmentRescheduleInvalidTransition,
  appointmentPatientNotFound,
  appointmentProviderNotFound,
  appointmentProviderNotAvailable,
} from './appointments.errors.js';
import { AppointmentOverlapError } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';

/**
 * Appointment rescheduling application service.
 *
 * Per the Stage 1E implementation specification, this service orchestrates
 * the appointment reschedule workflow for
 * `POST /api/v1/appointments/:id/reschedule`. It:
 *
 * - Derives all scope (tenantId, organisationId, facilityId) from the
 *   authenticated session context. The request body does NOT contain scope.
 * - Validates the replacement slot timestamps (scheduledEnd >
 *   scheduledStart, scheduledStart not in the past).
 * - Reads the original appointment via a scoped repository lookup
 *   (`findById`). An appointment outside the authenticated scope returns
 *   a safe `not_found` result (HTTP 404) with no cross-scope existence
 *   leak.
 * - Revalidates the inherited patient (`PatientRepository.existsInTenant`)
 *   and provider (`ProviderRepository.isEligibleForFacility`) references,
 *   mirroring the Stage 1C booking policy for any appointment creation.
 * - Performs the atomic reschedule within a single SERIALIZABLE
 *   transaction with bounded P2034 / DriverAdapterError retry (handled
 *   by the repository). The repository creates the replacement
 *   appointment and transitions the original to `cancelled` atomically;
 *   a failure in either step leaves the original unchanged and no
 *   replacement exists.
 * - Emits the `appointments.rescheduled` audit event ONLY after a
 *   successful committed reschedule. The event metadata carries the
 *   original and replacement appointment ids and the reschedule reason
 *   for traceability.
 *
 * Security guarantees:
 * - The appointment lookup is scoped by session-derived tenantId,
 *   organisationId, and facilityId; cross-scope appointments return
 *   `not_found` (safe, no existence leak).
 * - The request body cannot override scope, patient, provider, type,
 *   or status. Only the replacement slot and reason are accepted.
 * - Patient and provider lookups use session-derived tenantId and
 *   facilityId; cross-tenant/cross-facility lookups return false safely.
 *
 * Audit trail: the service emits an explicit `appointments.rescheduled`
 * audit event via `auditHelper.emitDirect(...)` AFTER the repository
 * commits the reschedule. The event metadata carries
 * `{ endpoint: 'appointments_reschedule', originalAppointmentId: string,
 * replacementAppointmentId: string, reason: string }` — the appointment
 * ids for traceability and the caller-supplied reschedule reason. No
 * patient details, provider details, or appointment timing information
 * are carried. The event is NOT emitted for a validation failure, a
 * not-found, an invalid transition, or an overlap.
 *
 * Atomicity: the reschedule is NOT implemented as a cancel-then-book
 * sequence of two independent committed operations. The repository
 * performs the replacement creation and original cancellation inside a
 * single SERIALIZABLE transaction. A failed replacement creation
 * (overlap, serialization conflict after bounded retries, database
 * error) rolls back the original cancellation, so the partial state
 * "original cancelled, replacement not created" is impossible.
 */
@Injectable()
export class AppointmentsReschedulingService {
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
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
    @Inject(CLOCK_SERVICE_TOKEN)
    private readonly clock: ClockService,
  ) {}

  /**
   * Reschedule an existing appointment for the session identified by
   * the supplied cookie value.
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
   * Throws `appointmentValidationError()` (HTTP 400) if:
   * - the scheduledEnd is not strictly after scheduledStart;
   * - the scheduledStart is not a valid ISO 8601 datetime with UTC offset.
   *
   * Throws `appointmentPastTime()` (HTTP 422) if:
   * - the replacement scheduledStart is in the past.
   *
   * Throws `appointmentNotFound()` (HTTP 404) if:
   * - the original appointment does not exist in the authenticated scope;
   * - the original appointment exists in another tenant, organisation, or
   *   facility (safe same error, no existence leak).
   *
   * Throws `appointmentPatientNotFound()` (HTTP 422) if:
   * - the inherited patient does not exist in the authenticated tenant.
   *
   * Throws `appointmentProviderNotFound()` (HTTP 422) if:
   * - the inherited provider does not exist in the authenticated tenant;
   * - the inherited provider is not active;
   * - the inherited provider is not assigned to the authenticated facility.
   *
   * Throws `appointmentRescheduleInvalidTransition()` (HTTP 422) if:
   * - the original appointment is in a source state that is not
   *   canonically reschedulable in this stage (only `booked` is
   *   reschedulable).
   *
   * Throws `appointmentOverlap()` (HTTP 422) if:
   * - the replacement slot overlaps with an existing blocking appointment
   *   for the same provider in the same tenant, organisation, and facility.
   *
   * The authorisation check (R06, R07, or R09 role assignment on the
   * active membership holding `appointments:reschedule`) is performed by
   * the `AuthorizationGuard` before the service is invoked.
   */
  async rescheduleAppointment(
    appointmentId: string,
    request: RescheduleAppointmentRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<RescheduleAppointmentResponse | null> {
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

    // Parse and validate the replacement slot timestamps.
    const scheduledStart = new Date(request.scheduledStart);
    const scheduledEnd = new Date(request.scheduledEnd);

    if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime())) {
      throw appointmentValidationError(
        'Invalid timestamp format. Use ISO 8601 with UTC offset.',
      );
    }

    if (scheduledEnd <= scheduledStart) {
      throw appointmentValidationError(
        'scheduledEnd must be strictly after scheduledStart.',
      );
    }

    // Reject past replacement slots with a small clock-tolerance
    // (5 seconds to handle clock skew), mirroring the booking policy.
    const now = this.clock.now();
    const toleranceMs = 5000;
    if (scheduledStart.getTime() < now.getTime() - toleranceMs) {
      throw appointmentPastTime();
    }

    // Read the original appointment via a scoped lookup so the
    // inherited patient and provider references can be revalidated
    // before the atomic reschedule. An out-of-scope appointment
    // returns null, indistinguishable from "does not exist" (no
    // cross-scope existence leak). The repository's reschedule
    // transaction re-reads the appointment under SERIALIZABLE
    // isolation, so a concurrent cancellation between this read and
    // the reschedule is observed safely as an invalid source state
    // (or retried to that outcome).
    const original = await this.appointments.findById(
      tenantId,
      organisationId,
      facilityId,
      appointmentId as AppointmentId,
    );

    if (original === null) {
      throw appointmentNotFound();
    }

    // Revalidate the inherited patient reference, mirroring the
    // Stage 1C booking policy for any appointment creation. Uses
    // session-derived tenantId; cross-tenant lookups return false safely.
    const patientExists = await this.patients.existsInTenant(
      tenantId,
      original.patientId,
    );
    if (!patientExists) {
      throw appointmentPatientNotFound();
    }

    // Revalidate the inherited provider reference, mirroring the
    // Stage 1C booking policy. Uses session-derived tenantId and
    // facilityId; checks provider exists in tenant, is active, and has
    // an active (non-revoked) facility assignment.
    const providerEligible = await this.providers.isEligibleForFacility(
      tenantId,
      original.providerId,
      facilityId,
    );
    if (!providerEligible) {
      throw appointmentProviderNotFound();
    }

    // Enforce provider availability for the replacement slot
    // (BR-BC06-ADM-002): the provider must be available at the
    // requested new time for the authenticated facility. BC10 owns
    // the schedule/availability data; this call consumes it through
    // the ProviderRepository port. Fail-closed: if the facility
    // timezone is null, if no schedule entry exists for the new
    // slot's day of week, or if the new slot extends beyond the
    // provider's working hours, rescheduling is blocked.
    const providerAvailable =
      await this.providers.isProviderAvailableAtFacility(
        tenantId,
        original.providerId,
        facilityId,
        scheduledStart,
        scheduledEnd,
      );
    if (!providerAvailable) {
      throw appointmentProviderNotAvailable();
    }

    // Perform the atomic reschedule. The repository handles the
    // SERIALIZABLE transaction, overlap detection, P2034 /
    // DriverAdapterError retry, and atomicity. The original is
    // excluded from its own overlap check (it is being cancelled in
    // the same transaction).
    let result;
    try {
      result = await this.appointments.reschedule(
        tenantId,
        organisationId,
        facilityId,
        appointmentId as AppointmentId,
        {
          scheduledStart,
          scheduledEnd,
        },
      );
    } catch (error) {
      if (error instanceof AppointmentOverlapError) {
        throw appointmentOverlap();
      }
      throw error;
    }

    if (result.outcome === 'not_found') {
      throw appointmentNotFound();
    }

    if (result.outcome === 'invalid_source_state') {
      throw appointmentRescheduleInvalidTransition();
    }

    // outcome === 'rescheduled'
    // Emit the audit event ONLY after the repository has committed
    // the reschedule. The metadata carries the original and
    // replacement appointment ids for traceability and the
    // caller-supplied reschedule reason.
    if (auditContext !== undefined) {
      const { user } = authResult;
      await this.auditHelper.emitDirect({
        action: 'appointments.rescheduled',
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
          endpoint: 'appointments_reschedule',
          originalAppointmentId: result.original.id,
          replacementAppointmentId: result.replacement.id,
          reason: request.reason,
        },
      });
    }

    const { replacement } = result;
    return {
      id: replacement.id,
      patientId: replacement.patientId,
      providerId: replacement.providerId,
      scheduledStart: replacement.scheduledStart.toISOString(),
      scheduledEnd: replacement.scheduledEnd.toISOString(),
      status: replacement.status,
      typeCode: replacement.typeCode,
    };
  }
}
