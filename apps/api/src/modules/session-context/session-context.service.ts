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
} from '@ibn-hayan/domain';
import { getRoleDisplayName } from '@ibn-hayan/domain';
import {
  SESSION_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { AuthService, type AuditRequestContext } from '../auth/auth.service.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import type {
  ContextResponse,
  TenantContextOption,
  ActiveTenantContext,
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

    return { options, active };
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
    const now = new Date();
    if (auditContext !== undefined) {
      const updated = await this.prisma
        .$transaction(async (tx) => {
          const row = await tx.authSession.update({
            where: { id: authResult.session.id },
            data: { activeTenantMembershipId: membershipId },
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

    return { options, active };
  }

  /**
   * Clear the active context for the session identified by the
   * supplied cookie value.
   *
   * Returns `null` if the session is missing, expired, or revoked.
   * On success, returns `{ ok: true, active: null }`.
   *
   * Origin and CSRF verification are performed by the controller
   * before this method is called.
   */
  async clearContext(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<{ ok: true; active: null } | null> {
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
          data: { activeTenantMembershipId: null },
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
    }

    return { ok: true, active: null };
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
}
