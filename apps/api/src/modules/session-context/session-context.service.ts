import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  UserId,
  TenantMembership,
  TenantMembershipId,
  TenantId,
  Session,
  SessionRepository,
  TenantMembershipRepository,
  TenantRepository,
  TenantRoleAssignmentRepository,
  TenantRoleAssignment,
  RoleLabelLocale,
  OrganisationId,
  FacilityId,
  OrganisationRepository,
  FacilityRepository,
} from '@ibn-hayan/domain';
import { getRoleDisplayName } from '@ibn-hayan/domain';
import {
  SESSION_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import type {
  ContextResponse,
  TenantContextOption,
  ActiveTenantContext,
  OrganisationContextOption,
  ActiveOrganisationContext,
  FacilityContextOption,
  ActiveFacilityContext,
  RoleSummary,
} from '@ibn-hayan/contracts';
import { contextSelectionForbidden } from './session-context.errors.js';

/**
 * Session-context application service.
 *
 * The session-context module is the fifth canonical batch's bounded
 * context for active Tenant context. It exposes three operations:
 *
 * - `loadContext`: authenticate via the existing session cookie,
 *   load the user's active TenantMemberships, filter to those whose
 *   Tenant is also active, return the list plus the session's
 *   currently selected context. If the selected context is no
 *   longer valid (suspended membership, suspended Tenant, or
 *   membership deleted), clear it server-side and return
 *   `active = null`. Never terminate an otherwise valid session
 *   only because context became invalid.
 *
 * - `selectContext`: authenticate, verify Origin + CSRF, validate
 *   the request, confirm the membership exists, belongs to the
 *   authenticated user, is active, and belongs to an active
 *   Tenant. Set it as the active membership for this session only.
 *   Return the complete `ContextResponse`. Reject another user's
 *   membership with a generic forbidden response that does not
 *   reveal whether the supplied membership exists for another user.
 *
 * - `clearContext`: authenticate, verify Origin + CSRF, clear only
 *   the current session's active membership. Return the strict
 *   clear response.
 *
 * Security requirements (per the fifth canonical batch specification):
 * - No client-supplied user ID. The user is resolved from the
 *   session.
 * - No client-supplied Tenant ID. The client selects by
 *   TenantMembership ID; the server resolves the Tenant transitively.
 * - No session token in JSON. The cookie carries the token; the
 *   response carries only the public context shape.
 * - No raw CSRF token in logs.
 * - No context stored in browser storage. The response is held in
 *   React state only.
 * - No context shared across different sessions for the same user.
 *   The active context is a column on `auth_sessions`, not on
 *   `users`; different sessions for the same user have independent
 *   context.
 *
 * The service reuses the existing `AuthService` for session-cookie
 * validation, CSRF token verification, and Origin enforcement. It
 * does NOT duplicate authentication, token parsing, cookie parsing,
 * Origin, or CSRF logic. The reuse is structural: the session-context
 * module depends on `AuthService` via Nest DI; it does not reach
 * into the auth module's private helpers.
 */
@Injectable()
export class SessionContextService {
  private readonly logger = new Logger(SessionContextService.name);

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TENANT_MEMBERSHIP_REPOSITORY)
    private readonly memberships: TenantMembershipRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(TENANT_ROLE_ASSIGNMENT_REPOSITORY)
    private readonly roleAssignments: TenantRoleAssignmentRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  /**
   * Resolve the locale from the `Accept-Language` header. Returns
   * 'ar' (the default) when the header is absent or unparseable.
   * Per the platform's Arabic-first posture, Arabic is the default.
   */
  private resolveLocale(acceptLanguage: string | undefined): RoleLabelLocale {
    if (!acceptLanguage || acceptLanguage.length === 0) {
      return 'ar';
    }
    // Parse the Accept-Language header. The first language tag is
    // the preferred language. We only distinguish between 'ar' and
    // 'en'; any other language falls back to Arabic (the default).
    const firstTag = acceptLanguage.split(',')[0]?.trim() ?? '';
    const lang = firstTag.split(';')[0]?.trim().toLowerCase() ?? '';
    if (lang.startsWith('en')) {
      return 'en';
    }
    return 'ar';
  }

  /**
   * Load a membership's role assignments and convert them to
   * localized role summaries.
   */
  private async loadRoleSummaries(
    membershipId: TenantMembershipId,
    locale: RoleLabelLocale,
  ): Promise<RoleSummary[]> {
    const assignments =
      await this.roleAssignments.listForMembership(membershipId);
    return assignments.map((a: TenantRoleAssignment) => ({
      code: a.roleCode,
      displayName: getRoleDisplayName(a.roleCode, locale),
    }));
  }

  /**
   * Load the context response for the session identified by the
   * supplied cookie value.
   *
   * Returns `null` if:
   * - the cookie is missing or empty;
   * - the session does not exist, is revoked, or is expired;
   * - the user is disabled;
   * - the user has no active memberships.
   *
   * On success, returns a `ContextResponse` containing:
   * - `options`: the user's active memberships whose Tenant is also
   *   active, sorted by Tenant display name then by membership ID.
   * - `active`: the currently selected context, or `null` if no
   *   context is selected. If the selected membership is no longer
   *   valid, the server clears it and returns `active = null` in
   *   the same response.
   *
   * Per the fifth canonical batch specification, an invalid selected
   * context does NOT terminate the session. The session remains
   * valid; only its context is cleared.
   */
  async loadContext(
    cookieValue: string | undefined,
    acceptLanguage: string | undefined = undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ContextResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const locale = this.resolveLocale(acceptLanguage);

    // Emit a tenant_context.viewed audit event (direct, non-
    // transactional — viewing context is not a state mutation).
    if (auditContext !== undefined) {
      await this.auditHelper.emitDirect({
        action: 'tenant_context.viewed',
        outcome: 'success',
        source: 'api',
        tenantId: authResult.session.activeTenantMembershipId
          ? (authResult.memberships.find(
              (m) => m.id === authResult.session.activeTenantMembershipId,
            )?.tenantId ?? null)
          : null,
        actorType: 'USER',
        actorId: authResult.user.id,
        sessionId: authResult.session.id,
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'tenant_context',
        metadata: { endpoint: 'context_view' },
      });
    }

    // Load the user's memberships and the related tenants.
    const userMemberships = await this.memberships.listForUser(
      authResult.user.id,
    );
    const tenantsById = await this.loadTenantsForMemberships(userMemberships);

    // Build the options list: only active memberships under active
    // tenants. Sort by Tenant display name, then by membership ID,
    // for deterministic display.
    const options: TenantContextOption[] = [];
    for (const membership of userMemberships) {
      if (membership.status !== 'active') {
        continue;
      }
      const tenant = tenantsById.get(membership.tenantId);
      if (!tenant || tenant.status !== 'active') {
        continue;
      }
      const roles = await this.loadRoleSummaries(membership.id, locale);
      options.push({
        membershipId: membership.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantDisplayName: tenant.displayName,
        roles,
      });
    }
    options.sort((a, b) => {
      const byName = a.tenantDisplayName.localeCompare(b.tenantDisplayName);
      if (byName !== 0) {
        return byName;
      }
      return a.membershipId.localeCompare(b.membershipId);
    });

    // Resolve the active context.
    const active = await this.resolveActiveContext(
      authResult.session,
      authResult.user.id,
      options,
    );

    // Per ADR-015, also load organisation and facility options and
    // resolve the active organisation and facility contexts. When
    // the active tenant is null, the organisation and facility
    // option lists are empty and the active organisation and
    // facility contexts are null.
    let organisationOptions: OrganisationContextOption[] = [];
    let activeOrganisation: ActiveOrganisationContext | null = null;
    let facilityOptions: FacilityContextOption[] = [];
    let activeFacility: ActiveFacilityContext | null = null;
    if (active !== null) {
      const orgResult = await this.loadOrganisationContext(
        authResult.user.id,
        active.membershipId as TenantMembershipId,
        active.tenantId as TenantId,
        authResult.session,
        locale,
      );
      organisationOptions = orgResult.options;
      activeOrganisation = orgResult.active;
      if (activeOrganisation !== null) {
        const facResult = await this.loadFacilityContext(
          authResult.user.id,
          active.membershipId as TenantMembershipId,
          active.tenantId as TenantId,
          activeOrganisation.organisationId as OrganisationId,
          authResult.session,
          locale,
        );
        facilityOptions = facResult.options;
        activeFacility = facResult.active;
      }
    }

    return {
      options,
      active,
      organisationOptions,
      activeOrganisation,
      facilityOptions,
      activeFacility,
    };
  }

  /**
   * Select a TenantMembership as the active context for the session
   * identified by the supplied cookie value.
   *
   * Returns `null` if the session is missing, expired, or revoked.
   * Throws `contextSelectionForbidden()` (403) if:
   * - the supplied membershipId does not exist;
   * - the membership belongs to a different user;
   * - the membership's status is `suspended`;
   * - the membership's Tenant's status is `suspended`.
   *
   * All four cases throw the same exception; the caller cannot
   * distinguish them. This is the structural enforcement of the
   * fifth canonical batch security requirement: the response must
   * not reveal whether the supplied membership exists for another
   * user.
   *
   * On success, returns the complete `ContextResponse` (options +
   * active). The caller returns this in the JSON body.
   *
   * Origin and CSRF verification are performed by the controller
   * before this method is called; the service does not re-verify
   * them. This keeps the service focused on the business rule
   * (membership validity) and the controller focused on the
   * transport-layer concerns (Origin, CSRF, body validation).
   */
  async selectContext(
    cookieValue: string | undefined,
    membershipId: TenantMembershipId,
    acceptLanguage: string | undefined = undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ContextResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const locale = this.resolveLocale(acceptLanguage);

    // Defensive check: verify the membership exists, belongs to the
    // authenticated user, is active, and belongs to an active
    // Tenant. The database composite foreign key is the structural
    // backstop; this check provides a clear application-layer error
    // path that does not reveal which condition failed.
    const membership = await this.memberships.findById(membershipId);
    if (
      membership === null ||
      membership.userId !== authResult.user.id ||
      membership.status !== 'active'
    ) {
      throw contextSelectionForbidden();
    }
    const tenant = await this.tenants.findById(membership.tenantId);
    if (tenant === null || tenant.status !== 'active') {
      throw contextSelectionForbidden();
    }

    // Set the active membership for this session only. Per the
    // ninth canonical batch specification, context mutation and the
    // outbox record must be atomic. When an audit context is
    // supplied, we use a transaction that wraps the membership
    // update and the outbox insertion. When no audit context is
    // supplied (backward compatibility), we use the existing
    // non-transactional update.
    //
    // Per ADR-015, selecting a new tenant clears the active
    // organisation and the active facility (cascade). The cascade
    // is performed in the same Prisma transaction as the tenant
    // selection when an audit context is supplied. When no audit
    // context is supplied, the cascade is performed as separate
    // repository calls after the tenant selection.
    const now = new Date();
    const previousTenantMembershipId =
      authResult.session.activeTenantMembershipId;
    const tenantChanged =
      previousTenantMembershipId !== null &&
      previousTenantMembershipId !== membershipId;
    if (auditContext !== undefined) {
      const updated = await this.prisma
        .$transaction(async (tx) => {
          // Per ADR-015, when the tenant changes, clear the active
          // organisation and the active facility in the same
          // transaction. The CHECK constraint on `auth_sessions`
          // would reject a state where the facility is non-null
          // but the organisation is null; the application-layer
          // cascade prevents the constraint from firing.
          const data: {
            activeTenantMembershipId: TenantMembershipId;
            activeOrganisationId?: null;
            activeFacilityId?: null;
          } = { activeTenantMembershipId: membershipId };
          if (tenantChanged) {
            data.activeOrganisationId = null;
            data.activeFacilityId = null;
          }
          const row = await tx.authSession.update({
            where: { id: authResult.session.id },
            data,
          });
          await this.auditHelper.emitOrFail(
            {
              action: 'tenant_context.selected',
              outcome: 'success',
              source: 'api',
              tenantId: tenant.id,
              actorType: 'USER',
              actorId: authResult.user.id,
              sessionId: authResult.session.id,
              resourceType: 'tenant_membership',
              resourceId: membershipId,
              requestId: auditContext.requestId,
              correlationId: auditContext.correlationId,
              ipAddress: auditContext.ipAddress,
              userAgent: auditContext.userAgent,
              scope: 'tenant_context',
              metadata: { endpoint: 'context_select' },
            },
            { transaction: tx },
          );
          return row;
        })
        .then(() => true)
        .catch(() => false);
      if (!updated) {
        throw contextSelectionForbidden();
      }
    } else {
      const updated = await this.sessions.setActiveTenantMembership(
        authResult.session.id,
        membershipId,
        now,
      );
      if (updated === null) {
        throw contextSelectionForbidden();
      }
      // Per ADR-015, when the tenant changes, clear the active
      // organisation and the active facility. The non-transactional
      // path performs the cascade as separate repository calls
      // after the tenant selection. The CHECK constraint on
      // `auth_sessions` enforces that no facility can remain
      // active without an organisation.
      if (tenantChanged) {
        await this.sessions.clearActiveOrganisation(authResult.session.id, now);
        await this.sessions.clearActiveFacility(authResult.session.id, now);
      }
    }

    // Build and return the complete ContextResponse.
    const userMemberships = await this.memberships.listForUser(
      authResult.user.id,
    );
    const tenantsById = await this.loadTenantsForMemberships(userMemberships);

    const options: TenantContextOption[] = [];
    for (const m of userMemberships) {
      if (m.status !== 'active') {
        continue;
      }
      const t = tenantsById.get(m.tenantId);
      if (!t || t.status !== 'active') {
        continue;
      }
      const roles = await this.loadRoleSummaries(m.id, locale);
      options.push({
        membershipId: m.id,
        tenantId: t.id,
        tenantSlug: t.slug,
        tenantDisplayName: t.displayName,
        roles,
      });
    }
    options.sort((a, b) => {
      const byName = a.tenantDisplayName.localeCompare(b.tenantDisplayName);
      if (byName !== 0) {
        return byName;
      }
      return a.membershipId.localeCompare(b.membershipId);
    });

    const activeRoles = await this.loadRoleSummaries(membership.id, locale);
    const active: ActiveTenantContext = {
      membershipId: membership.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantDisplayName: tenant.displayName,
      roles: activeRoles,
    };

    // Per ADR-015, the tenant selection cascade clears the active
    // organisation and facility when the tenant changes. The new
    // active organisation and facility are therefore null.
    let organisationOptions: OrganisationContextOption[] = [];
    let activeOrganisation: ActiveOrganisationContext | null = null;
    let facilityOptions: FacilityContextOption[] = [];
    let activeFacility: ActiveFacilityContext | null = null;
    if (!tenantChanged) {
      // The tenant did not change; preserve the existing
      // organisation and facility contexts by reloading them.
      const refreshedSession = await this.sessions.findActiveByTokenHash(
        authResult.session.tokenHash,
        now,
      );
      if (refreshedSession !== null) {
        const orgResult = await this.loadOrganisationContext(
          authResult.user.id,
          membership.id,
          tenant.id,
          refreshedSession,
          locale,
        );
        organisationOptions = orgResult.options;
        activeOrganisation = orgResult.active;
        if (activeOrganisation !== null) {
          const facResult = await this.loadFacilityContext(
            authResult.user.id,
            membership.id,
            tenant.id,
            activeOrganisation.organisationId as OrganisationId,
            refreshedSession,
            locale,
          );
          facilityOptions = facResult.options;
          activeFacility = facResult.active;
        }
      }
    } else {
      // The tenant changed; load the organisation options for the
      // newly selected tenant (the active organisation is null
      // because we just cleared it).
      const orgResult = await this.loadOrganisationContext(
        authResult.user.id,
        membership.id,
        tenant.id,
        // Pass a synthetic session with null org/facility to load
        // the options without resolving an active context. We
        // construct the synthetic session by copying the current
        // session and forcing the org/facility fields to null.
        {
          ...authResult.session,
          activeTenantMembershipId: membershipId,
          activeOrganisationId: null,
          activeFacilityId: null,
        },
        locale,
      );
      organisationOptions = orgResult.options;
      activeOrganisation = null;
      facilityOptions = [];
      activeFacility = null;
    }

    return {
      options,
      active,
      organisationOptions,
      activeOrganisation,
      facilityOptions,
      activeFacility,
    };
  }

  /**
   * Clear the active context for the session identified by the
   * supplied cookie value.
   *
   * Returns `null` if the session is missing, expired, or revoked.
   * On success, returns `{ ok: true, active: null,
   * activeOrganisation: null, activeFacility: null }`.
   *
   * Per ADR-015, clearing the tenant context also clears the active
   * organisation and the active facility (cascade). The cascade is
   * performed in the same Prisma transaction as the tenant clear
   * when an audit context is supplied. When no audit context is
   * supplied, the cascade is performed as separate repository calls
   * after the tenant clear.
   *
   * Origin and CSRF verification are performed by the controller
   * before this method is called.
   */
  async clearContext(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<{
    ok: true;
    active: null;
    activeOrganisation: null;
    activeFacility: null;
  } | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const now = new Date();
    // Per the ninth canonical batch specification, context mutation
    // and the outbox record must be atomic. When an audit context is
    // supplied, we use a transaction that wraps the membership clear
    // and the outbox insertion. When no audit context is supplied
    // (backward compatibility), we use the existing non-transactional
    // clear.
    //
    // Per ADR-015, the clear also clears the active organisation
    // and the active facility (cascade).
    if (auditContext !== undefined) {
      // Determine the tenant that was active before clearing (for
      // audit chain scoping).
      const previousTenantId = authResult.session.activeTenantMembershipId
        ? (authResult.memberships.find(
            (m) => m.id === authResult.session.activeTenantMembershipId,
          )?.tenantId ?? null)
        : null;
      await this.prisma.$transaction(async (tx) => {
        await tx.authSession.update({
          where: { id: authResult.session.id },
          data: {
            activeTenantMembershipId: null,
            activeOrganisationId: null,
            activeFacilityId: null,
          },
        });
        await this.auditHelper.emitOrFail(
          {
            action: 'tenant_context.cleared',
            outcome: 'success',
            source: 'api',
            tenantId: previousTenantId,
            actorType: 'USER',
            actorId: authResult.user.id,
            sessionId: authResult.session.id,
            requestId: auditContext.requestId,
            correlationId: auditContext.correlationId,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            scope: 'tenant_context',
            metadata: { endpoint: 'context_clear' },
          },
          { transaction: tx },
        );
      });
    } else {
      await this.sessions.clearActiveTenantMembership(
        authResult.session.id,
        now,
      );
      await this.sessions.clearActiveOrganisation(authResult.session.id, now);
      await this.sessions.clearActiveFacility(authResult.session.id, now);
    }

    return {
      ok: true,
      active: null,
      activeOrganisation: null,
      activeFacility: null,
    };
  }

  // -------------------------------------------------------------------------
  // ADR-015: organisation and facility context selection / clearing
  // -------------------------------------------------------------------------

  /**
   * Select an Organisation as the active organisation context for
   * the session identified by the supplied cookie value.
   *
   * Per ADR-015, the supplied organisationId is untrusted input.
   * The server verifies that:
   * - the organisation exists;
   * - the organisation belongs to the active Tenant;
   * - the principal holds an applicable scoped role assignment for
   *   the selected organisation (tenant-scoped, organisation-scoped,
   *   or facility-scoped at an organisation-facility under the
   *   selected organisation).
   *
   * A failure of any of these checks throws `contextSelectionForbidden()`
   * (403); the response does not reveal which check failed.
   *
   * Per ADR-015, selecting a new organisation clears the active
   * facility when the facility does not belong to the newly
   * selected organisation. The cascade is performed in the same
   * Prisma transaction as the selection.
   *
   * Returns `null` if the session is missing, expired, or revoked.
   * On success, returns the complete `ContextResponse` (tenant +
   * organisation + facility options and actives).
   */
  async selectOrganisationContext(
    cookieValue: string | undefined,
    organisationId: OrganisationId,
    acceptLanguage: string | undefined = undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ContextResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const locale = this.resolveLocale(acceptLanguage);

    // The active tenant membership is required to select an
    // organisation. The guard enforces this; the service re-checks
    // defensively.
    if (authResult.session.activeTenantMembershipId === null) {
      throw contextSelectionForbidden();
    }
    const activeMembership = authResult.memberships.find(
      (m) => m.id === authResult.session.activeTenantMembershipId,
    );
    if (
      activeMembership === undefined ||
      activeMembership.status !== 'active'
    ) {
      throw contextSelectionForbidden();
    }
    const activeTenant = await this.tenants.findById(activeMembership.tenantId);
    if (activeTenant === null || activeTenant.status !== 'active') {
      throw contextSelectionForbidden();
    }

    // Verify the organisation exists and belongs to the active
    // Tenant. The `organisations.findById(tenantId, organisationId)`
    // port is tenant-scoped; looking up an organisation from a
    // different Tenant returns null.
    const organisation = await this.organisations.findById(
      activeTenant.id,
      organisationId,
    );
    if (organisation === null || organisation.status !== 'active') {
      throw contextSelectionForbidden();
    }

    // Verify the principal holds an applicable scoped role
    // assignment for the selected organisation. Per ADR-015, this
    // is the structural enforcement of "tenant membership alone
    // does not grant organisation access".
    const applicableAssignments =
      await this.roleAssignments.listForMembershipAtOrganisation(
        activeMembership.id,
        organisation.id,
      );
    if (applicableAssignments.length === 0) {
      throw contextSelectionForbidden();
    }

    // Determine whether the currently active facility (if any)
    // belongs to the newly selected organisation. If not, the
    // facility must be cleared (cascade).
    const previousOrganisationId = authResult.session.activeOrganisationId;
    const previousFacilityId = authResult.session.activeFacilityId;
    let facilityCascade = false;
    if (previousFacilityId !== null) {
      // If the organisation is changing, the facility must be
      // cleared. If the organisation is the same, the facility
      // may be preserved.
      if (
        previousOrganisationId === null ||
        previousOrganisationId !== organisation.id
      ) {
        facilityCascade = true;
      } else {
        // Same organisation; verify the facility still belongs to
        // it (defence-in-depth). The composite foreign key on
        // `auth_sessions(active_facility_id, active_organisation_id)`
        // enforces this at the database level.
        const facility = await this.facilities.findById(
          activeTenant.id,
          previousFacilityId,
        );
        if (facility === null || facility.organisationId !== organisation.id) {
          facilityCascade = true;
        }
      }
    }

    const now = new Date();
    if (auditContext !== undefined) {
      const updated = await this.prisma
        .$transaction(async (tx) => {
          const data: {
            activeOrganisationId: OrganisationId;
            activeFacilityId?: null;
          } = { activeOrganisationId: organisation.id };
          if (facilityCascade) {
            data.activeFacilityId = null;
          }
          await tx.authSession.update({
            where: { id: authResult.session.id },
            data,
          });
          await this.auditHelper.emitOrFail(
            {
              action: 'organisation_context.selected',
              outcome: 'success',
              source: 'api',
              tenantId: activeTenant.id,
              actorType: 'USER',
              actorId: authResult.user.id,
              sessionId: authResult.session.id,
              resourceType: 'organisation',
              resourceId: organisation.id,
              requestId: auditContext.requestId,
              correlationId: auditContext.correlationId,
              ipAddress: auditContext.ipAddress,
              userAgent: auditContext.userAgent,
              scope: 'organisation_context',
              metadata: { endpoint: 'context_select_organisation' },
            },
            { transaction: tx },
          );
        })
        .then(() => true)
        .catch(() => false);
      if (!updated) {
        throw contextSelectionForbidden();
      }
    } else {
      const updated = await this.sessions.setActiveOrganisation(
        authResult.session.id,
        organisation.id,
        now,
      );
      if (updated === null) {
        throw contextSelectionForbidden();
      }
      if (facilityCascade) {
        await this.sessions.clearActiveFacility(authResult.session.id, now);
      }
    }

    // Build the full ContextResponse by reloading the session state.
    return this.buildFullContextResponse(
      authResult.user.id,
      authResult.session.tokenHash,
      locale,
      now,
    );
  }

  /**
   * Clear the active organisation context for the session identified
   * by the supplied cookie value.
   *
   * Per ADR-015, clearing the organisation also clears the active
   * facility (cascade — a facility cannot remain active without an
   * active organisation).
   *
   * Returns `null` if the session is missing, expired, or revoked.
   * On success, returns `{ ok: true, activeOrganisation: null,
   * activeFacility: null }`.
   */
  async clearOrganisationContext(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<{
    ok: true;
    activeOrganisation: null;
    activeFacility: null;
  } | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const now = new Date();
    // Determine the tenant that was active before clearing (for
    // audit chain scoping).
    const tenantId = authResult.session.activeTenantMembershipId
      ? (authResult.memberships.find(
          (m) => m.id === authResult.session.activeTenantMembershipId,
        )?.tenantId ?? null)
      : null;
    if (auditContext !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        await tx.authSession.update({
          where: { id: authResult.session.id },
          data: {
            activeOrganisationId: null,
            activeFacilityId: null,
          },
        });
        await this.auditHelper.emitOrFail(
          {
            action: 'organisation_context.cleared',
            outcome: 'success',
            source: 'api',
            tenantId,
            actorType: 'USER',
            actorId: authResult.user.id,
            sessionId: authResult.session.id,
            requestId: auditContext.requestId,
            correlationId: auditContext.correlationId,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            scope: 'organisation_context',
            metadata: { endpoint: 'context_clear_organisation' },
          },
          { transaction: tx },
        );
      });
    } else {
      await this.sessions.clearActiveOrganisation(authResult.session.id, now);
      await this.sessions.clearActiveFacility(authResult.session.id, now);
    }

    return { ok: true, activeOrganisation: null, activeFacility: null };
  }

  /**
   * Select a Facility as the active facility context for the session
   * identified by the supplied cookie value.
   *
   * Per ADR-015, the supplied facilityId is untrusted input. The
   * server verifies that:
   * - the facility exists;
   * - the facility belongs to the active Organisation (the composite
   *   foreign key on `auth_sessions(active_facility_id,
   *   active_organisation_id)` enforces this at the database level);
   * - the facility belongs to the active Tenant;
   * - the principal holds an applicable scoped role assignment for
   *   the selected facility.
   *
   * The active organisation must already be set; if it is null, the
   * selection is rejected. The client must select an organisation
   * before selecting a facility.
   */
  async selectFacilityContext(
    cookieValue: string | undefined,
    facilityId: FacilityId,
    acceptLanguage: string | undefined = undefined,
    auditContext?: AuditRequestContext,
  ): Promise<ContextResponse | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const locale = this.resolveLocale(acceptLanguage);

    // The active tenant membership and active organisation are
    // required to select a facility.
    if (
      authResult.session.activeTenantMembershipId === null ||
      authResult.session.activeOrganisationId === null
    ) {
      throw contextSelectionForbidden();
    }
    const activeMembership = authResult.memberships.find(
      (m) => m.id === authResult.session.activeTenantMembershipId,
    );
    if (
      activeMembership === undefined ||
      activeMembership.status !== 'active'
    ) {
      throw contextSelectionForbidden();
    }
    const activeTenant = await this.tenants.findById(activeMembership.tenantId);
    if (activeTenant === null || activeTenant.status !== 'active') {
      throw contextSelectionForbidden();
    }
    const activeOrganisation = await this.organisations.findById(
      activeTenant.id,
      authResult.session.activeOrganisationId,
    );
    if (activeOrganisation === null || activeOrganisation.status !== 'active') {
      throw contextSelectionForbidden();
    }

    // Verify the facility exists and belongs to the active
    // organisation. The composite foreign key enforces the
    // organisation match at the database level; the application-
    // layer check provides a clear error path.
    const facility = await this.facilities.findById(
      activeTenant.id,
      facilityId,
    );
    if (
      facility === null ||
      facility.status !== 'active' ||
      facility.organisationId !== activeOrganisation.id
    ) {
      throw contextSelectionForbidden();
    }

    // Verify the principal holds an applicable scoped role
    // assignment for the selected facility.
    const applicableAssignments =
      await this.roleAssignments.listForMembershipAtFacility(
        activeMembership.id,
        facility.id,
      );
    if (applicableAssignments.length === 0) {
      throw contextSelectionForbidden();
    }

    const now = new Date();
    if (auditContext !== undefined) {
      const updated = await this.prisma
        .$transaction(async (tx) => {
          await tx.authSession.update({
            where: { id: authResult.session.id },
            data: { activeFacilityId: facility.id },
          });
          await this.auditHelper.emitOrFail(
            {
              action: 'facility_context.selected',
              outcome: 'success',
              source: 'api',
              tenantId: activeTenant.id,
              actorType: 'USER',
              actorId: authResult.user.id,
              sessionId: authResult.session.id,
              resourceType: 'facility',
              resourceId: facility.id,
              requestId: auditContext.requestId,
              correlationId: auditContext.correlationId,
              ipAddress: auditContext.ipAddress,
              userAgent: auditContext.userAgent,
              scope: 'facility_context',
              metadata: { endpoint: 'context_select_facility' },
            },
            { transaction: tx },
          );
        })
        .then(() => true)
        .catch(() => false);
      if (!updated) {
        throw contextSelectionForbidden();
      }
    } else {
      const updated = await this.sessions.setActiveFacility(
        authResult.session.id,
        facility.id,
        now,
      );
      if (updated === null) {
        throw contextSelectionForbidden();
      }
    }

    // Build the full ContextResponse by reloading the session state.
    return this.buildFullContextResponse(
      authResult.user.id,
      authResult.session.tokenHash,
      locale,
      now,
    );
  }

  /**
   * Clear the active facility context for the session identified by
   * the supplied cookie value.
   *
   * Clearing the facility does NOT clear the active organisation or
   * the active tenant.
   *
   * Returns `null` if the session is missing, expired, or revoked.
   * On success, returns `{ ok: true, activeFacility: null }`.
   */
  async clearFacilityContext(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<{ ok: true; activeFacility: null } | null> {
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      auditContext,
    );
    if (authResult === null) {
      return null;
    }

    const now = new Date();
    const tenantId = authResult.session.activeTenantMembershipId
      ? (authResult.memberships.find(
          (m) => m.id === authResult.session.activeTenantMembershipId,
        )?.tenantId ?? null)
      : null;
    if (auditContext !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        await tx.authSession.update({
          where: { id: authResult.session.id },
          data: { activeFacilityId: null },
        });
        await this.auditHelper.emitOrFail(
          {
            action: 'facility_context.cleared',
            outcome: 'success',
            source: 'api',
            tenantId,
            actorType: 'USER',
            actorId: authResult.user.id,
            sessionId: authResult.session.id,
            requestId: auditContext.requestId,
            correlationId: auditContext.correlationId,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            scope: 'facility_context',
            metadata: { endpoint: 'context_clear_facility' },
          },
          { transaction: tx },
        );
      });
    } else {
      await this.sessions.clearActiveFacility(authResult.session.id, now);
    }

    return { ok: true, activeFacility: null };
  }

  /**
   * Resolve the active context for a session, given the current
   * options list.
   *
   * If the session has no active membership, returns `null`.
   *
   * If the session has an active membership:
   * - verify the membership is still in the options list (i.e. the
   *   membership is active, the Tenant is active, and the
   *   membership belongs to the session's user — the composite
   *   foreign key guarantees the last);
   * - if yes, return the active context;
   * - if no, clear the active membership server-side and return
   *   `null`. The session remains valid; only its context is
   *   cleared.
   */
  private async resolveActiveContext(
    session: Session,
    _userId: UserId,
    options: TenantContextOption[],
  ): Promise<ActiveTenantContext | null> {
    if (session.activeTenantMembershipId === null) {
      return null;
    }

    const selected = options.find(
      (o) => o.membershipId === session.activeTenantMembershipId,
    );

    if (selected === undefined) {
      // The selected membership is no longer valid (suspended
      // membership, suspended Tenant, or membership deleted —
      // although deletion is blocked by ON DELETE RESTRICT while
      // the session references it). Clear it server-side and
      // return null. The session remains valid.
      const now = new Date();
      await this.sessions.clearActiveTenantMembership(session.id, now);
      this.logger.debug(
        `Cleared invalid active context for session ${session.id}.`,
      );
      return null;
    }

    // The selected option already carries the roles array (loaded
    // in loadContext). We reuse it to avoid a second DB round-trip.
    return {
      membershipId: selected.membershipId,
      tenantId: selected.tenantId,
      tenantSlug: selected.tenantSlug,
      tenantDisplayName: selected.tenantDisplayName,
      roles: selected.roles,
    };
  }

  /**
   * Load all Tenants referenced by a list of memberships into a Map
   * keyed by TenantId. Used to avoid N+1 queries when building the
   * options list.
   */
  private async loadTenantsForMemberships(
    memberships: readonly TenantMembership[],
  ): Promise<
    Map<
      TenantId,
      {
        id: TenantId;
        slug: string;
        displayName: string;
        status: 'active' | 'suspended';
      }
    >
  > {
    const tenantIds = new Set<TenantId>();
    for (const m of memberships) {
      tenantIds.add(m.tenantId);
    }
    const result = new Map<
      TenantId,
      {
        id: TenantId;
        slug: string;
        displayName: string;
        status: 'active' | 'suspended';
      }
    >();
    for (const tenantId of tenantIds) {
      const tenant = await this.tenants.findById(tenantId);
      if (tenant !== null) {
        result.set(tenant.id, {
          id: tenant.id,
          slug: tenant.slug,
          displayName: tenant.displayName,
          status: tenant.status,
        });
      }
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // ADR-015: organisation and facility context loaders
  // -------------------------------------------------------------------------

  /**
   * Load the organisation context for a membership at a specific
   * tenant. Returns the list of organisations the principal is
   * authorised to select and the currently active organisation
   * context (or null).
   *
   * Per ADR-015, the options list includes only organisations that:
   * - belong to the active Tenant;
   * - have at least one organisation-scoped or facility-scoped role
   *   assignment for the principal's membership, OR have a
   *   tenant-scoped role assignment (which is valid across every
   *   organisation under the tenant).
   *
   * If the session's currently active organisation is no longer
   * valid (organisation deleted, organisation made inactive, or
   * the principal's role assignment was removed), the server clears
   * it server-side and returns `active = null` in the same
   * response. The session remains valid; only the organisation
   * context is cleared.
   */
  private async loadOrganisationContext(
    _userId: UserId,
    membershipId: TenantMembershipId,
    tenantId: TenantId,
    session: Session,
    _locale: RoleLabelLocale,
  ): Promise<{
    options: OrganisationContextOption[];
    active: ActiveOrganisationContext | null;
  }> {
    // Load all organisations under the active tenant.
    const allOrganisations = await this.organisations.listForTenant(tenantId);
    // Filter to active organisations for which the principal holds
    // an applicable scoped role assignment. We use a Set of
    // organisation IDs to deduplicate (a facility-scoped
    // assignment and an organisation-scoped assignment at the same
    // organisation should not produce duplicate options).
    const authorisedOrgIds = new Set<OrganisationId>();
    // Always include organisations where the principal has a
    // tenant-scoped assignment (valid across every organisation
    // under the tenant). Loading all tenant-scoped assignments is
    // a single round-trip; we then add every active organisation
    // in the tenant to the authorised set.
    const tenantScopedAssignments =
      await this.roleAssignments.listForMembershipAtScope(
        membershipId,
        'tenant',
      );
    if (tenantScopedAssignments.length > 0) {
      for (const org of allOrganisations) {
        if (org.status === 'active') {
          authorisedOrgIds.add(org.id);
        }
      }
    }
    // For organisation-scoped and facility-scoped assignments, add
    // only the targeted organisation.
    const orgScopedAssignments =
      await this.roleAssignments.listForMembershipAtScope(
        membershipId,
        'organisation',
      );
    for (const a of orgScopedAssignments) {
      if (a.scopeOrganisationId !== null) {
        authorisedOrgIds.add(a.scopeOrganisationId);
      }
    }
    const facilityScopedAssignments =
      await this.roleAssignments.listForMembershipAtScope(
        membershipId,
        'facility',
      );
    for (const a of facilityScopedAssignments) {
      if (a.scopeOrganisationId !== null) {
        authorisedOrgIds.add(a.scopeOrganisationId);
      }
    }
    // Build the options list: active organisations that the
    // principal is authorised to select. Sort by display name, then
    // by organisation ID, for deterministic display.
    const options: OrganisationContextOption[] = [];
    for (const org of allOrganisations) {
      if (org.status !== 'active') {
        continue;
      }
      if (!authorisedOrgIds.has(org.id)) {
        continue;
      }
      options.push({
        organisationId: org.id,
        code: org.code,
        displayName: org.displayName,
        status: org.status,
      });
    }
    options.sort((a, b) => {
      const byName = a.displayName.localeCompare(b.displayName);
      if (byName !== 0) {
        return byName;
      }
      return a.organisationId.localeCompare(b.organisationId);
    });

    // Resolve the active organisation context.
    let active: ActiveOrganisationContext | null = null;
    if (session.activeOrganisationId !== null) {
      const activeOrg = options.find(
        (o) => o.organisationId === session.activeOrganisationId,
      );
      if (activeOrg === undefined) {
        // The active organisation is no longer valid. Clear it
        // server-side. The session remains valid; only the
        // organisation context is cleared. We do NOT clear the
        // facility here; the loadFacilityContext call (which runs
        // only when activeOrg is non-null) is responsible for
        // loading the facility options. The CHECK constraint on
        // `auth_sessions` would reject a state where the facility
        // is non-null but the organisation is null; we therefore
        // also clear the facility here.
        const now = new Date();
        await this.sessions.clearActiveOrganisation(session.id, now);
        await this.sessions.clearActiveFacility(session.id, now);
        this.logger.debug(
          `Cleared invalid active organisation for session ${session.id}.`,
        );
        active = null;
      } else {
        active = {
          organisationId: activeOrg.organisationId,
          code: activeOrg.code,
          displayName: activeOrg.displayName,
        };
      }
    }
    return { options, active };
  }

  /**
   * Load the facility context for a membership at a specific
   * organisation. Returns the list of facilities the principal is
   * authorised to select and the currently active facility context
   * (or null).
   *
   * Per ADR-015, the options list includes only facilities that:
   * - belong to the active Organisation;
   * - have at least one facility-scoped role assignment for the
   *   principal's membership, OR have an organisation-scoped
   *   assignment at the active organisation, OR have a tenant-scoped
   *   assignment.
   */
  private async loadFacilityContext(
    _userId: UserId,
    membershipId: TenantMembershipId,
    tenantId: TenantId,
    organisationId: OrganisationId,
    session: Session,
    _locale: RoleLabelLocale,
  ): Promise<{
    options: FacilityContextOption[];
    active: ActiveFacilityContext | null;
  }> {
    // Load all facilities under the active organisation.
    const allFacilities = await this.facilities.listForOrganisation(
      tenantId,
      organisationId,
    );
    // Filter to active facilities for which the principal holds an
    // applicable scoped role assignment.
    const authorisedFacIds = new Set<FacilityId>();
    // Tenant-scoped and organisation-scoped assignments authorise
    // every facility under the active organisation.
    const tenantScopedAssignments =
      await this.roleAssignments.listForMembershipAtScope(
        membershipId,
        'tenant',
      );
    const orgScopedAssignments =
      await this.roleAssignments.listForMembershipAtScope(
        membershipId,
        'organisation',
      );
    if (
      tenantScopedAssignments.length > 0 ||
      (orgScopedAssignments.length > 0 &&
        orgScopedAssignments.some(
          (a) => a.scopeOrganisationId === organisationId,
        ))
    ) {
      for (const fac of allFacilities) {
        if (fac.status === 'active') {
          authorisedFacIds.add(fac.id);
        }
      }
    }
    // Facility-scoped assignments authorise only the targeted
    // facility (when it belongs to the active organisation).
    const facilityScopedAssignments =
      await this.roleAssignments.listForMembershipAtScope(
        membershipId,
        'facility',
      );
    for (const a of facilityScopedAssignments) {
      if (
        a.scopeFacilityId !== null &&
        a.scopeOrganisationId === organisationId
      ) {
        authorisedFacIds.add(a.scopeFacilityId);
      }
    }
    // Build the options list.
    const options: FacilityContextOption[] = [];
    for (const fac of allFacilities) {
      if (fac.status !== 'active') {
        continue;
      }
      if (!authorisedFacIds.has(fac.id)) {
        continue;
      }
      options.push({
        facilityId: fac.id,
        organisationId: fac.organisationId,
        code: fac.code,
        displayName: fac.displayName,
        status: fac.status,
      });
    }
    options.sort((a, b) => {
      const byName = a.displayName.localeCompare(b.displayName);
      if (byName !== 0) {
        return byName;
      }
      return a.facilityId.localeCompare(b.facilityId);
    });

    // Resolve the active facility context.
    let active: ActiveFacilityContext | null = null;
    if (session.activeFacilityId !== null) {
      const activeFac = options.find(
        (o) => o.facilityId === session.activeFacilityId,
      );
      if (activeFac === undefined) {
        // The active facility is no longer valid. Clear it
        // server-side. The session remains valid; only the
        // facility context is cleared.
        const now = new Date();
        await this.sessions.clearActiveFacility(session.id, now);
        this.logger.debug(
          `Cleared invalid active facility for session ${session.id}.`,
        );
        active = null;
      } else {
        active = {
          facilityId: activeFac.facilityId,
          organisationId: activeFac.organisationId,
          code: activeFac.code,
          displayName: activeFac.displayName,
        };
      }
    }
    return { options, active };
  }

  /**
   * Build the complete `ContextResponse` by reloading the session
   * state from the database. Used by the organisation and facility
   * selection methods to return the full response after a mutation.
   *
   * The method re-reads the session by its token hash (the token
   * has not changed; only the active context columns have changed).
   * If the session is no longer valid (revoked, expired), the
   * method returns null; the caller throws `sessionRequired()`.
   */
  private async buildFullContextResponse(
    userId: UserId,
    tokenHash: Session['tokenHash'],
    locale: RoleLabelLocale,
    now: Date,
  ): Promise<ContextResponse | null> {
    const session = await this.sessions.findActiveByTokenHash(tokenHash, now);
    if (session === null) {
      return null;
    }
    // Load the user's memberships and the related tenants.
    const userMemberships = await this.memberships.listForUser(userId);
    const tenantsById = await this.loadTenantsForMemberships(userMemberships);
    // Build the tenant options list.
    const options: TenantContextOption[] = [];
    for (const membership of userMemberships) {
      if (membership.status !== 'active') {
        continue;
      }
      const tenant = tenantsById.get(membership.tenantId);
      if (!tenant || tenant.status !== 'active') {
        continue;
      }
      const roles = await this.loadRoleSummaries(membership.id, locale);
      options.push({
        membershipId: membership.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantDisplayName: tenant.displayName,
        roles,
      });
    }
    options.sort((a, b) => {
      const byName = a.tenantDisplayName.localeCompare(b.tenantDisplayName);
      if (byName !== 0) {
        return byName;
      }
      return a.membershipId.localeCompare(b.membershipId);
    });
    // Resolve the active tenant context.
    const active = await this.resolveActiveContext(session, userId, options);
    // Resolve the organisation and facility contexts.
    let organisationOptions: OrganisationContextOption[] = [];
    let activeOrganisation: ActiveOrganisationContext | null = null;
    let facilityOptions: FacilityContextOption[] = [];
    let activeFacility: ActiveFacilityContext | null = null;
    if (active !== null) {
      const orgResult = await this.loadOrganisationContext(
        userId,
        active.membershipId as TenantMembershipId,
        active.tenantId as TenantId,
        session,
        locale,
      );
      organisationOptions = orgResult.options;
      activeOrganisation = orgResult.active;
      if (activeOrganisation !== null) {
        const facResult = await this.loadFacilityContext(
          userId,
          active.membershipId as TenantMembershipId,
          active.tenantId as TenantId,
          activeOrganisation.organisationId as OrganisationId,
          session,
          locale,
        );
        facilityOptions = facResult.options;
        activeFacility = facResult.active;
      }
    }
    return {
      options,
      active,
      organisationOptions,
      activeOrganisation,
      facilityOptions,
      activeFacility,
    };
  }
}
