import { Injectable, Inject } from '@nestjs/common';
import type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
} from '@ibn-hayan/domain';
import {
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import type {
  ClinicAdminOverviewResponse,
  RegionStatus,
  RegionKey,
} from '@ibn-hayan/contracts';
import { clinicAdminOverviewContextRequired } from './clinic-admin.errors.js';

/**
 * Clinic Admin Overview application service.
 *
 * The service is the read-side orchestrator for the Clinic
 * Administrator Overview surface at `/api/v1/clinic-admin/overview`
 * (per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §12 Arabic RTL and
 * §13 English LTR). It is the structural expression of the
 * live-data task specification's data rules:
 *
 * - All tenant, organisation, facility, and identity context is
 *   derived from the authenticated server-side session and the
 *   approved context middleware (ADR-015). The service does NOT
 *   accept tenant, organisation, or facility scope from the request
 *   body or query string.
 * - All identity display values are resolved via the existing
 *   repository ports (`TenantRepository`, `OrganisationRepository`,
 *   `FacilityRepository`) so that the response never carries
 *   client-supplied identifiers.
 * - Missing business data is represented honestly. The current
 *   domain model has NO models for appointments, patients, doctors,
 *   inventory, billing, waiting room, or staff attendance (verified
 *   by inspecting `apps/api/prisma/schema.prisma` and
 *   `apps/api/src/app.module.ts`). Per the live-data task
 *   specification Phase 5, NO schema or migration change is
 *   authorised. Therefore every business region is declared
 *   `'not_supported'` (Category 3) or `'navigational_only'`
 *   (Category 4). No business metrics are returned. The frontend
 *   renders each region in its honest "not yet configured" state,
 *   preserving the approved layout, typography, and edge protection.
 *
 * The service reuses the existing `AuthService` for session-cookie
 * validation. It does NOT duplicate authentication, token parsing,
 * cookie parsing, Origin, or CSRF logic.
 *
 * Audit trail: the service emits an explicit
 * `clinic_admin.overview.viewed` audit event via
 * `auditHelper.emitDirect(...)` AFTER the Overview operation completes
 * successfully and returns its response. This event is mapped to the
 * existing `facility_context` category (see
 * `packages/observability/src/audit/action-codes.ts`
 * `inferCategoryFromAction`), which IS accepted by the
 * `audit_events_category_check` CHECK constraint in the dedicated audit
 * database — no migration is required. The event proves the Overview
 * service completed successfully, complementing the
 * `AuthorizationGuard`'s `authorization.decision.allowed` event (which
 * proves the request was authorized). This two-event pattern matches
 * the established repository convention for read-only endpoints (cf.
 * the session-context module's `tenant_context.viewed` event).
 *
 * Emission semantics:
 * - The event is emitted via `emitDirect` (best-effort, non-
 *   transactional), matching the pattern for read-only view events.
 * - The event is emitted ONLY after the Overview operation succeeds;
 *   it is NOT emitted when context resolution fails (null return) or
 *   when the service throws (`clinicAdminOverviewContextRequired`).
 * - The event does NOT recursively audit itself: the emission goes
 *   through the outbox, the dispatcher delivers it to the audit store,
 *   and the audit-store append does NOT trigger another audit event.
 * - The event metadata carries only `{ endpoint: 'clinic_admin_overview_view' }`
 *   — no sensitive context, no business payload, no display names, no
 *   UUIDs beyond the standard actor/session/tenant fields.
 *
 * Per the live-data task specification Phase 7, the service:
 * - Requires an authenticated session.
 * - Requires an active tenant + organisation + facility context.
 * - Requires the `clinic_admin_overview:view` permission, which is
 *   granted ONLY to `R09_ADMINISTRATOR` (per
 *   `packages/domain/src/authorization/role-permissions.ts`). The
 *   permission check is performed by the `AuthorizationGuard`
 *   before the service is invoked; the service additionally
 *   verifies that the active organisation and facility are set on
 *   the session.
 * - Fails closed when any context dimension is missing or invalid.
 */
@Injectable()
export class ClinicAdminOverviewService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  /**
   * Load the Clinic Admin Overview response for the session
   * identified by the supplied cookie value.
   *
   * Returns `null` if:
   * - the cookie is missing or empty;
   * - the session does not exist, is revoked, or is expired;
   * - the user is disabled;
   * - the user has no active memberships.
   *
   * Throws `clinicAdminOverviewContextRequired()` (HTTP 403) if:
   * - the session has no active tenant membership;
   * - the session has no active organisation;
   * - the session has no active facility;
   * - the active tenant, organisation, or facility no longer exists
   *   or is no longer active.
   *
   * The authorisation check (R09 role assignment on the active
   * membership) is performed by the `AuthorizationGuard` before
   * the service is invoked. The service trusts the guard's
   * decision and does NOT re-perform the role check.
   *
   * Per the live-data task specification Phase 5, the service does
   * NOT accept tenant, organisation, or facility identifiers from
   * the request body or query string. All context is read from the
   * session row.
   */
  async loadOverview(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ClinicAdminOverviewResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const { session, user } = authResult;

    // Fail closed if any context dimension is missing. Per the
    // live-data task specification Phase 7, the response is generic
    // and does NOT reveal which dimension is missing.
    if (
      session.activeTenantMembershipId === null ||
      session.activeOrganisationId === null ||
      session.activeFacilityId === null
    ) {
      throw clinicAdminOverviewContextRequired();
    }

    // Resolve the active membership's tenant id. The session stores
    // the membership id, not the tenant id; we resolve it via the
    // memberships array already loaded by the auth service.
    const activeMembership = authResult.memberships.find(
      (m) => m.id === session.activeTenantMembershipId,
    );
    if (activeMembership === undefined) {
      // The active membership is no longer in the user's active
      // memberships list (suspended membership or suspended Tenant
      // — the auth service filters these out). Fail closed.
      throw clinicAdminOverviewContextRequired();
    }
    const tenantId = activeMembership.tenantId;
    const organisationId = session.activeOrganisationId;
    const facilityId = session.activeFacilityId;

    // Resolve the tenant, organisation, and facility display names
    // via the existing repository ports. The repositories use
    // tenant-scoped composite-unique lookups so that an identifier
    // from a different tenant returns `null` (defence-in-depth
    // against session-tampering attacks).
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
      // The active context is no longer valid. Fail closed. The
      // session-context module's `loadContext` clears invalid
      // context on the next call; the shell redirects to
      // `/dashboard` when the context becomes null. We do not
      // perform the clear here because that is the
      // session-context module's responsibility.
      throw clinicAdminOverviewContextRequired();
    }

    // Defence-in-depth: verify the resolved facility actually belongs
    // to the resolved organisation. The repository's `findById`
    // filters by `(tenantId, facilityId)` only; a session could
    // (theoretically, via a bug elsewhere) have an active facility
    // that does not belong to the active organisation. Per the
    // live-data task specification Phase 7 items 3 and 4 ("A user
    // from another organisation cannot access the data" and "A user
    // from another facility cannot access the data"), this check
    // is the structural enforcement that the active facility is
    // within the active organisation.
    if (facility.organisationId !== organisation.id) {
      throw clinicAdminOverviewContextRequired();
    }

    // Build the regions array. Per the live-data task specification
    // Phase 4, every approved region must be classified into one of
    // the four categories. The current architectural reality (no
    // business-domain models exist) means every business region is
    // Category 3 (`not_supported`) and every navigational region is
    // Category 4 (`navigational_only`).
    const regions = buildDefaultRegions();

    const response: ClinicAdminOverviewResponse = {
      activeContext: {
        tenantDisplayName: tenant.displayName,
        organisationDisplayName: organisation.displayName,
        facilityDisplayName: facility.displayName,
      },
      administrator: {
        displayName: user.displayName,
      },
      regions,
      generatedAt: new Date().toISOString(),
    };

    // Emit the explicit `clinic_admin.overview.viewed` audit event
    // AFTER the Overview operation has completed successfully. This
    // event proves the service returned a response, complementing the
    // guard's `authorization.decision.allowed` event (which proves the
    // request was authorized). The event is mapped to the existing
    // `facility_context` category (see `inferCategoryFromAction` in
    // `packages/observability/src/audit/action-codes.ts`), which IS
    // accepted by the `audit_events_category_check` CHECK constraint —
    // no migration is required.
    //
    // The event is emitted via `emitDirect` (best-effort,
    // non-transactional), matching the pattern for read-only view
    // events (`tenant_context.viewed`). The event is NOT emitted when
    // context resolution fails (the `null` return above) or when the
    // service throws (`clinicAdminOverviewContextRequired` above).
    //
    // The event metadata carries only `{ endpoint: 'clinic_admin_overview_view' }`
    // — no sensitive context, no business payload, no display names.
    // The standard actor/session/tenant fields are populated from the
    // authenticated session.
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'clinic_admin.overview.viewed',
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
        metadata: { endpoint: 'clinic_admin_overview_view' },
      });
    }

    return response;
  }
}

/**
 * Build the default regions array for the Clinic Admin Overview
 * response. The array contains exactly one entry per region key
 * listed in `RegionKeySchema`, in the canonical reading order from
 * DESIGN_BIBLE.md §12.2 / §13.2.
 *
 * Per the architectural reality (no business-domain models exist),
 * every business region is declared `'not_supported'` (Category 3)
 * and every navigational region is declared `'navigational_only'`
 * (Category 4). When the relevant business-domain vertical slices
 * are implemented in subsequent batches, this function will be
 * extended to return the real availability state per region.
 */
function buildDefaultRegions(): RegionStatus[] {
  const declarations: ReadonlyArray<{
    readonly key: RegionKey;
    readonly availability: RegionStatus['availability'];
  }> = [
    { key: 'appointment_actions', availability: 'navigational_only' },
    { key: 'financial_snapshot', availability: 'not_supported' },
    { key: 'todays_appointments', availability: 'not_supported' },
    { key: 'operational_alerts', availability: 'not_supported' },
    { key: 'inventory_alerts', availability: 'not_supported' },
    { key: 'doctors_on_duty', availability: 'not_supported' },
    { key: 'waiting_room_operations', availability: 'not_supported' },
    { key: 'staff_attendance_summary', availability: 'not_supported' },
    { key: 'quick_actions', availability: 'navigational_only' },
  ];
  return declarations.map((d) => ({
    key: d.key,
    availability: d.availability,
  }));
}
