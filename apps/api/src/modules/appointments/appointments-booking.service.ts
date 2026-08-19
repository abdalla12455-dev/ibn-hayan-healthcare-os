import { Injectable, Inject } from '@nestjs/common';
import type {
  AppointmentRepository,
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  PatientRepository,
  ProviderRepository,
  PatientId,
  ProviderId,
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
  BookAppointmentRequest,
  BookAppointmentResponse,
} from '@ibn-hayan/contracts';
import {
  appointmentValidationError,
  appointmentOverlap,
  appointmentPastTime,
  appointmentPatientNotFound,
  appointmentProviderNotFound,
  appointmentProviderNotAvailable,
} from './appointments.errors.js';
import { AppointmentOverlapError } from '../../infrastructure/database/repositories/prisma-appointment.repository.js';

/**
 * Appointment booking application service.
 *
 * Per the Stage 1C implementation specification, this service orchestrates
 * the appointment creation workflow for `POST /api/v1/appointments`. It:
 *
 * - Derives all scope (tenantId, organisationId, facilityId) from the
 *   authenticated session context. The request body does NOT contain scope.
 * - Validates patient existence using BC01 PatientRepository.existsInTenant()
 * - Validates provider eligibility using BC10 ProviderRepository.isEligibleForFacility()
 *   (checks: provider exists in tenant, is active, has active facility assignment)
 * - Validates timestamp constraints (scheduledEnd > scheduledStart,
 *   scheduledStart not in the past).
 * - Prevents provider appointment overlaps using concurrency-safe
 *   transaction with SERIALIZABLE isolation.
 * - Emits the `appointments.booked` audit event after successful creation.
 *
 * Security guarantees:
 * - Patient lookup uses session-derived tenantId; cross-tenant lookups return false
 * - Provider lookup uses session-derived tenantId and facilityId; cross-tenant/cross-facility
 *   lookups return false
 * - The request body cannot override scope
 *
 * Audit trail: the service emits an explicit `appointments.booked` audit
 * event via `auditHelper.emitDirect(...)` AFTER the appointment is created
 * successfully. The event metadata carries `{ endpoint: 'appointments_book',
 * appointmentId: string }` — the appointment ID for traceability, but no
 * patient details, provider details, or appointment timing information.
 * The event is NOT emitted when validation fails or when the service throws.
 */
@Injectable()
export class AppointmentsBookingService {
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
   * Create a new appointment for the session identified by the
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
   * Throws `appointmentValidationError()` (HTTP 400) if:
   * - the scheduledEnd is not strictly after scheduledStart;
   * - the scheduledStart is not a valid ISO 8601 datetime with UTC offset.
   *
   * Throws `appointmentPastTime()` (HTTP 422) if:
   * - the scheduledStart is in the past (more than a small clock-tolerance).
   *
   * Throws `appointmentPatientNotFound()` (HTTP 422) if:
   * - the patient does not exist in the authenticated tenant.
   * - the patient is in another tenant (safe same error, no existence leak).
   *
   * Throws `appointmentProviderNotFound()` (HTTP 422) if:
   * - the provider does not exist in the authenticated tenant;
   * - the provider is in another tenant (safe same error, no existence leak);
   * - the provider is not active;
   * - the provider is not assigned to the authenticated facility.
   *
   * Throws `appointmentOverlap()` (HTTP 422) if:
   * - the requested time slot overlaps with an existing appointment
   *   for the same provider in the same tenant, organisation, and facility.
   *
   * The authorisation check (R06, R07, or R09 role assignment on the
   * active membership) is performed by the `AuthorizationGuard` before
   * the service is invoked.
   */
  async bookAppointment(
    request: BookAppointmentRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<BookAppointmentResponse | null> {
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

    // Parse and validate timestamps
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

    // Reject past appointments with a small clock-tolerance
    // (5 seconds to handle clock skew)
    const now = this.clock.now();
    const toleranceMs = 5000;
    if (scheduledStart.getTime() < now.getTime() - toleranceMs) {
      throw appointmentPastTime();
    }

    // Validate patient exists in the authenticated tenant
    // Uses session-derived tenantId; cross-tenant lookups return false safely
    const patientExists = await this.patients.existsInTenant(
      tenantId,
      request.patientId as PatientId,
    );
    if (!patientExists) {
      throw appointmentPatientNotFound();
    }

    // Validate provider is eligible for the authenticated facility
    // Uses session-derived tenantId and facilityId; checks:
    // - provider exists in tenant
    // - provider status is 'active'
    // - provider has active (non-revoked) assignment to the facility
    const providerEligible = await this.providers.isEligibleForFacility(
      tenantId,
      request.providerId as ProviderId,
      facilityId,
    );
    if (!providerEligible) {
      throw appointmentProviderNotFound();
    }

    // Enforce provider availability (BR-BC06-ADM-002): the provider
    // must be available at the requested time for the authenticated
    // facility. BC10 Workforce owns the schedule/availability data;
    // this call consumes it through the ProviderRepository port
    // without duplicating the logic. Fail-closed: if the facility
    // timezone is null, if no schedule entry exists for the
    // appointment's day of week, or if the appointment's time window
    // extends beyond the provider's working hours, booking is blocked.
    const providerAvailable =
      await this.providers.isProviderAvailableAtFacility(
        tenantId,
        request.providerId as ProviderId,
        facilityId,
        scheduledStart,
        scheduledEnd,
      );
    if (!providerAvailable) {
      throw appointmentProviderNotAvailable();
    }

    // Create the appointment (overlap detection is handled by the repository)
    let created;
    try {
      created = await this.appointments.create(
        tenantId,
        organisationId,
        facilityId,
        {
          patientId: request.patientId as PatientId,
          providerId: request.providerId as ProviderId,
          scheduledStart,
          scheduledEnd,
          typeCode: request.typeCode,
        },
      );
    } catch (error) {
      if (error instanceof AppointmentOverlapError) {
        throw appointmentOverlap();
      }
      throw error;
    }

    // Emit audit event after successful creation
    if (auditContext !== undefined) {
      const { user } = authResult;
      await this.auditHelper.emitDirect({
        action: 'appointments.booked',
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
        metadata: { endpoint: 'appointments_book', appointmentId: created.id },
      });
    }

    return {
      id: created.id,
      patientId: created.patientId,
      providerId: created.providerId,
      scheduledStart: created.scheduledStart.toISOString(),
      scheduledEnd: created.scheduledEnd.toISOString(),
      status: created.status,
      typeCode: created.typeCode,
    };
  }
}
