import { Injectable, Inject } from '@nestjs/common';
import type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  ProviderRepository,
  ProviderScheduleRepository,
  ProviderScheduleEntry,
  ProviderId,
  ProviderScheduleEntryId,
  TenantId,
  OrganisationId,
  FacilityId,
} from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  WORKFORCE_REPOSITORY,
  PROVIDER_SCHEDULE_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { clinicAdminOverviewContextRequired } from '../clinic-admin/clinic-admin.errors.js';
import type {
  CreateProviderScheduleRequest,
  CreateProviderScheduleResponse,
  ListProviderSchedulesResponse,
  DeleteProviderScheduleResponse,
  ProviderScheduleEntry as ProviderScheduleEntryPayload,
} from '@ibn-hayan/contracts';
import {
  providerScheduleProviderNotFound,
  providerScheduleValidationError,
  providerScheduleNotFound,
} from './provider-schedules.errors.js';

/** Session-derived active scope. */
interface ActiveScope {
  tenantId: TenantId;
  organisationId: OrganisationId;
  facilityId: FacilityId;
  actorUserId: string;
  sessionId: string;
}

/**
 * Provider Schedules administration service (BC10 Workforce).
 *
 * Supports the Provider Schedule Management API:
 * - `POST /api/v1/provider-schedules` (create entry)
 * - `GET /api/v1/provider-schedules?providerId=...` (list entries)
 * - `DELETE /api/v1/provider-schedules/:id` (delete entry)
 *
 * Scope (tenantId, organisationId, facilityId) is derived ONLY from
 * the authenticated session context. The provider must exist in the
 * tenant, be active, and hold an active non-revoked assignment to the
 * active facility; eligibility failures surface as a uniform
 * `PROVIDER_SCHEDULE_PROVIDER_NOT_FOUND` (422) with no existence leak.
 * Input validation is re-verified here (beyond the boundary schema);
 * overlapping entries are intentionally allowed, per the
 * operator-ratified Scheduling Completion Milestone decisions.
 *
 * Audit: one `provider_schedules.created` / `provider_schedules.deleted`
 * event per successful operation; metadata carries only stable
 * identifiers (endpoint, providerId, scheduleEntryId).
 */
@Injectable()
export class ProviderSchedulesService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    @Inject(WORKFORCE_REPOSITORY)
    private readonly providers: ProviderRepository,
    @Inject(PROVIDER_SCHEDULE_REPOSITORY)
    private readonly schedules: ProviderScheduleRepository,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  /**
   * Resolve the authenticated session and derive the active
   * tenant/organisation/facility scope.
   *
   * Returns `null` when the session is missing/invalid/expired/revoked.
   * Throws 403 (`clinicAdminOverviewContextRequired`) when the active
   * tenant/organisation/facility context is missing or inconsistent.
   */
  private async resolveScope(
    cookieValue: string | undefined,
  ): Promise<ActiveScope | null> {
    const authResult = await this.authService.getSessionFromCookie(cookieValue);
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

    return {
      tenantId,
      organisationId,
      facilityId,
      actorUserId: authResult.user.id,
      sessionId: session.id,
    };
  }

  /** Normalize `HH:MM` or `HH:MM:SS` to `HH:MM:SS`. */
  private static normalizeTime(value: string): string {
    return value.length === 5 ? `${value}:00` : value;
  }

  /** Verify provider eligibility; throw 422 if not eligible. */
  private async requireEligibleProvider(
    scope: ActiveScope,
    providerId: string,
  ): Promise<void> {
    const eligible = await this.providers.isEligibleForFacility(
      scope.tenantId,
      providerId as ProviderId,
      scope.facilityId,
    );
    if (!eligible) {
      throw providerScheduleProviderNotFound();
    }
  }

  /** Serialize a domain entry to the API payload. */
  private toPayload(
    entry: ProviderScheduleEntry,
  ): ProviderScheduleEntryPayload {
    return {
      id: entry.id,
      providerId: entry.providerId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
  }

  /**
   * Create a schedule entry.
   *
   * Returns `null` when the session is invalid. Throws 400 on
   * validation failure, 403 on missing context, 422 when the provider
   * is not eligible. Emits `provider_schedules.created` on success.
   */
  async createEntry(
    request: CreateProviderScheduleRequest,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<CreateProviderScheduleResponse | null> {
    const scope = await this.resolveScope(cookieValue);
    if (scope === null) {
      return null;
    }

    if (
      !Number.isInteger(request.dayOfWeek) ||
      request.dayOfWeek < 1 ||
      request.dayOfWeek > 7
    ) {
      throw providerScheduleValidationError(
        'dayOfWeek must be an integer between 1 and 7.',
      );
    }
    const start = ProviderSchedulesService.normalizeTime(request.startTime);
    const end = ProviderSchedulesService.normalizeTime(request.endTime);
    if (end <= start) {
      throw providerScheduleValidationError(
        'endTime must be strictly after startTime.',
      );
    }

    await this.requireEligibleProvider(scope, request.providerId);

    const created = await this.schedules.create(
      scope.tenantId,
      scope.organisationId,
      scope.facilityId,
      {
        providerId: request.providerId as ProviderId,
        dayOfWeek: request.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startTime: start,
        endTime: end,
      },
    );

    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'provider_schedules.created',
        outcome: 'success',
        source: 'api',
        tenantId: scope.tenantId,
        actorType: 'USER',
        actorId: scope.actorUserId,
        sessionId: scope.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'provider_schedules_create',
          providerId: created.providerId,
          scheduleEntryId: created.id,
        },
      });
    }

    return this.toPayload(created);
  }

  /**
   * List schedule entries for a provider at the active facility.
   * Provider eligibility is enforced so an ineligible or
   * non-assigned provider does not surface entries.
   */
  async listEntries(
    providerId: string | undefined,
    cookieValue: string | undefined,
  ): Promise<ListProviderSchedulesResponse | null> {
    const scope = await this.resolveScope(cookieValue);
    if (scope === null) {
      return null;
    }
    if (!providerId) {
      throw providerScheduleValidationError(
        'providerId query parameter is required.',
      );
    }
    await this.requireEligibleProvider(scope, providerId);
    const entries = await this.schedules.findByProviderAndFacility(
      scope.tenantId,
      providerId as ProviderId,
      scope.facilityId,
    );
    return { entries: entries.map((e) => this.toPayload(e)) };
  }

  /**
   * Delete a schedule entry by ID, scoped to the FULL authenticated
   * tenant/organisation/facility context. Returns null when the
   * session is invalid; 404 when the entry does not exist in the
   * authenticated scope (including entries in another organisation or
   * facility of the same tenant). Emits `provider_schedules.deleted`
   * on success only.
   */
  async deleteEntry(
    entryId: string,
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<DeleteProviderScheduleResponse | null> {
    const scope = await this.resolveScope(cookieValue);
    if (scope === null) {
      return null;
    }
    const deleted = await this.schedules.delete(
      scope.tenantId,
      scope.organisationId,
      scope.facilityId,
      entryId as ProviderScheduleEntryId,
    );
    if (deleted === null) {
      throw providerScheduleNotFound();
    }
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'provider_schedules.deleted',
        outcome: 'success',
        source: 'api',
        tenantId: scope.tenantId,
        actorType: 'USER',
        actorId: scope.actorUserId,
        sessionId: scope.sessionId,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'facility_context',
        metadata: {
          endpoint: 'provider_schedules_delete',
          providerId: deleted.providerId,
          scheduleEntryId: deleted.id,
        },
      });
    }
    return { deleted: true };
  }
}
