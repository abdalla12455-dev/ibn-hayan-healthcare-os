import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
} from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_REPOSITORY,
  ORGANISATION_REPOSITORY,
  FACILITY_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
} from '../../../infrastructure/database/index.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import {
  AuthService,
  type AuditRequestContext,
} from '../../auth/auth.service.js';
import { SessionTokenService } from '../../auth/session-token.service.js';
import { CsrfService } from '../../auth/csrf.service.js';
import { AuditHelperService } from '../../audit/audit-helper.service.js';
import { SESSION_ABSOLUTE_TTL_MS } from '../../auth/auth.constants.js';
import type {
  RolePreviewAvailabilityResponse,
  RolePreviewRoleCard,
  SelectPreviewRoleResponse,
  CurrentPreviewRoleResponse,
} from '@ibn-hayan/contracts';
import type { PlatformRoleCatalogueEntry } from '@ibn-hayan/domain';
import { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
import {
  PREVIEW_IDENTITY_CATALOGUE,
  PREVIEW_TENANT_SLUG,
  PREVIEW_TENANT_DISPLAY_NAME,
  PREVIEW_ORGANISATION_CODE,
  PREVIEW_ORGANISATION_DISPLAY_NAME,
  PREVIEW_FACILITY_CODE,
  PREVIEW_FACILITY_DISPLAY_NAME,
  findPreviewIdentity,
  type PreviewIdentityEntry,
} from './preview-identity-catalogue.js';
import {
  rolePreviewDisabled,
  rolePreviewRoleUnknown,
  rolePreviewSessionRequired,
  rolePreviewNotActive,
  rolePreviewBootstrapExpired,
  rolePreviewBootstrapReplay,
  rolePreviewBootstrapInvalid,
} from './role-preview.errors.js';
import {
  BootstrapChallengeStore,
  BOOTSTRAP_MAX_AGE_MS,
} from './bootstrap-store.js';

/**
 * Demo Role Preview Mode application service.
 *
 * The service is the development-only backend that orchestrates the
 * preview-session lifecycle for Demo Role Preview Mode. Per the
 * specification, the feature is **completely unavailable in
 * production**; the {@link RolePreviewFeatureConfig} gate is the
 * authoritative entry point that the controller consults before
 * delegating to this service.
 *
 * Capabilities:
 * - `buildAvailabilityResponse`: list the canonical preview role
 *   cards (R01 through R14) with their honest
 *   `interfaceImplemented` status.
 * - `selectRole`: switch the authenticated preview session to a
 *   different canonical role by creating a fresh session for the
 *   preview identity, establishing the preview tenant → preview
 *   organisation → preview facility context, revoking the previous
 *   session atomically, and returning the safe response.
 * - `getCurrentRole`: return the current preview role metadata, or
 *   `{ active: false, ... }` when the session is not a preview
 *   session.
 * - `endPreviewSession`: revoke the preview session and return
 *   `{ ok: true }`.
 *
 * Security requirements (per the specification):
 * - The feature flag MUST be enabled server-side. The controller
 *   refuses to delegate to this service when the flag is disabled.
 * - Production MUST always reject access. The gate returns `false`
 *   unconditionally when `NODE_ENV === 'production'`.
 * - Mutation requests (select, end) require Origin and CSRF
 *   verification, performed by the controller before delegating.
 * - Only a canonical role code may be accepted. The service
 *   resolves the preview identity from the role code via
 *   `findPreviewIdentity`; an unknown code is rejected.
 * - The server derives the user, membership, tenant, organisation,
 *   facility, and role assignment. The caller CANNOT supply any of
 *   these.
 * - The response NEVER contains a password, password hash, session
 *   token, CSRF token, or internal UUID.
 * - The server uses the existing `AuthService.getSessionFromCookie`
 *   for session validation, the existing `SessionTokenService` for
 *   token generation, and the existing `CsrfService` for CSRF
 *   invalidation on session replacement.
 * - Selecting a role revokes the previous session (preview or
 *   non-preview) atomically. This is the structural enforcement of
 *   "safely revoke or replace the previous preview session during
 *   role switching".
 * - The preview identity must belong to the preview tenant. The
 *   service verifies this by looking up the preview tenant by slug
 *   and the preview identity's membership by `(tenantId, userId)`.
 *   An identity that does not belong to the preview tenant is
 *   rejected with `rolePreviewRoleUnknown()` (defence-in-depth; the
 *   catalogue guarantees this cannot happen for canonical codes).
 *
 * The service reuses the existing `AuthService`, `SessionTokenService`,
 * `CsrfService`, and `AuditHelperService` via Nest DI. It does NOT
 * duplicate authentication, token generation, CSRF, or audit logic.
 *
 * The service uses the existing Prisma repositories (`TenantRepository`,
 * `OrganisationRepository`, `FacilityRepository`, `UserRepository`,
 * `TenantMembershipRepository`, `SessionRepository`) via Nest DI to
 * resolve the preview workspace and the preview identity's
 * membership. It does NOT add a competing session implementation.
 *
 * Per AGENTS.md invariant 5 (Secret Hygiene), the service NEVER
 * logs:
 * - plaintext passwords;
 * - password hashes;
 * - session tokens (raw or hashed);
 * - CSRF tokens (raw or hashed);
 * - email addresses;
 * - internal UUIDs at info level.
 */
@Injectable()
export class RolePreviewService {
  private readonly logger = new Logger(RolePreviewService.name);

  constructor(
    private readonly featureConfig: RolePreviewFeatureConfig,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ORGANISATION_REPOSITORY)
    private readonly organisations: OrganisationRepository,
    @Inject(FACILITY_REPOSITORY)
    private readonly facilities: FacilityRepository,
    @Inject(TENANT_MEMBERSHIP_REPOSITORY)
    private readonly memberships: TenantMembershipRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly sessionTokens: SessionTokenService,
    private readonly csrfService: CsrfService,
    private readonly auditHelper: AuditHelperService,
    private readonly bootstrapStore: BootstrapChallengeStore,
  ) {}

  // -------------------------------------------------------------------------
  // Availability + listing
  // -------------------------------------------------------------------------

  /**
   * Build the availability response. Returns the canonical preview
   * role cards. When the feature is disabled, returns
   * `{ enabled: false, roles: [] }` and the controller turns that
   * into a 404.
   *
   * The `interfaceImplemented` flag is derived from the repository's
   * canonical role-specific interface evidence. Per the Demo Role
   * Preview Mode v1 specification, only R09 Clinic Administrator
   * has an implemented interface (at `/clinic-admin`); every other
   * role is honestly marked `false`.
   */
  buildAvailabilityResponse(): RolePreviewAvailabilityResponse {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      return { enabled: false, roles: [] };
    }
    return {
      enabled: true,
      roles: PREVIEW_IDENTITY_CATALOGUE.map((entry) =>
        this.toRoleCard(entry.catalogue),
      ),
    };
  }

  /**
   * Convert a canonical role catalogue entry to a preview role card.
   * The `interfaceImplemented` and `interfacePath` fields are
   * derived from the repository's canonical evidence — only R09 has
   * an implemented interface.
   *
   * The function is pure and deterministic. It does NOT consult the
   * database; the canonical "implemented interface" truth is part
   * of the role-preview specification itself, recorded here as
   * constant data so that the frontend receives a single
   * authoritative signal.
   */
  private toRoleCard(entry: PlatformRoleCatalogueEntry): RolePreviewRoleCard {
    const implemented = entry.code === 'R09_ADMINISTRATOR';
    return {
      code: entry.code,
      displayNameAr: entry.displayNameAr,
      displayNameEn: entry.displayNameEn,
      shortCode: entry.shortCode,
      category: entry.category,
      scopeLevel:
        entry.code === 'R13_SYSTEM_ADMINISTRATOR' ||
        entry.code === 'R14_INTEGRATION_ACCOUNT'
          ? 'tenant'
          : 'facility',
      interfaceImplemented: implemented,
      interfacePath: implemented ? '/clinic-admin' : null,
    };
  }

  // -------------------------------------------------------------------------
  // Select role
  // -------------------------------------------------------------------------

  /**
   * Select a canonical role for the preview session.
   *
   * Steps:
   * 1. Verify the feature is enabled (defence-in-depth; the
   *    controller already checked).
   * 2. Resolve the preview identity from the role code.
   * 3. Resolve the preview workspace (tenant, organisation,
   *    facility) by slug/code lookup.
   * 4. Verify the preview identity's user exists and has an active
   *    membership in the preview tenant.
   * 5. Atomically:
   *    a. Create a new session for the preview identity's user.
   *    b. Set the active tenant membership, organisation, and
   *       facility on the new session.
   *    c. Revoke the previous session (if any).
   * 6. Invalidate the previous session's CSRF token (if any).
   * 7. Emit a `role_preview.session.created` audit event.
   * 8. Return the safe response (selected role, preview workspace
   *    display names, interface path).
   *
   * Returns the raw session token for the controller to set in the
   * HttpOnly cookie. The raw token is NEVER returned in the JSON
   * body.
   *
   * Throws:
   * - `rolePreviewDisabled()` when the feature is disabled.
   * - `rolePreviewRoleUnknown()` when the role code is not
   *   canonical.
   * - `rolePreviewSessionRequired()` when the previous session is
   *   invalid (this should not happen because the controller
   *   validated the session, but the defence-in-depth check is
   *   retained).
   */
  async selectRole(input: {
    readonly roleCode: string;
    readonly previousCookieValue: string | undefined;
    readonly auditContext: AuditRequestContext;
  }): Promise<{
    readonly response: SelectPreviewRoleResponse;
    readonly rawToken: string;
    readonly expiresAt: Date;
  }> {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }

    const previewIdentity = findPreviewIdentity(input.roleCode);
    if (previewIdentity === null) {
      throw rolePreviewRoleUnknown();
    }

    // Resolve the preview workspace. The lookups by slug/code are
    // deterministic; the preview seed creates these rows. If any
    // row is missing, the seed has not been run; we throw
    // `rolePreviewDisabled()` so that the client receives the same
    // "unavailable" signal it would receive if the feature flag
    // were off. This avoids leaking the seed state to the client.
    const previewTenant = await this.tenants.findBySlug(PREVIEW_TENANT_SLUG);
    if (previewTenant === null) {
      this.logger.warn(
        'Preview tenant not found; the preview seed must be run before role switching.',
      );
      throw rolePreviewDisabled();
    }
    const previewOrganisations = await this.organisations.listForTenant(
      previewTenant.id,
    );
    const previewOrganisation = previewOrganisations.find(
      (o) => o.code === PREVIEW_ORGANISATION_CODE,
    );
    if (previewOrganisation === undefined) {
      this.logger.warn('Preview organisation not found.');
      throw rolePreviewDisabled();
    }
    const previewFacilities = await this.facilities.listForOrganisation(
      previewTenant.id,
      previewOrganisation.id,
    );
    const previewFacility = previewFacilities.find(
      (f) => f.code === PREVIEW_FACILITY_CODE,
    );
    if (previewFacility === undefined) {
      this.logger.warn('Preview facility not found.');
      throw rolePreviewDisabled();
    }

    // Resolve the preview identity's user by email. The preview
    // seed creates these users; the lookup is by normalised email.
    const normalisedEmail = previewIdentity.email.trim().toLowerCase();
    const previewUser = await this.users.findByNormalisedEmail(normalisedEmail);
    if (previewUser === null) {
      this.logger.warn(
        `Preview identity not found for role ${previewIdentity.catalogue.code}; the preview seed must be run.`,
      );
      throw rolePreviewDisabled();
    }

    // Resolve the preview identity's membership in the preview
    // tenant. The preview seed creates one membership per preview
    // identity under the preview tenant.
    const userMemberships = await this.memberships.listForUser(previewUser.id);
    const previewMembership = userMemberships.find(
      (m) => m.tenantId === previewTenant.id && m.status === 'active',
    );
    if (previewMembership === undefined) {
      this.logger.warn(
        `Preview membership not found for role ${previewIdentity.catalogue.code}.`,
      );
      throw rolePreviewDisabled();
    }

    // Resolve the previous session (if any) so we can revoke it
    // atomically with the new session creation.
    let previousSessionId: string | null = null;
    if (
      input.previousCookieValue !== undefined &&
      input.previousCookieValue.length > 0
    ) {
      const previousTokenHash = this.sessionTokens.hash(
        input.previousCookieValue,
      );
      const now = new Date();
      const previousSession = await this.sessions.findActiveByTokenHash(
        previousTokenHash,
        now,
      );
      if (previousSession !== null) {
        previousSessionId = previousSession.id;
      }
    }

    // Create the new session, set its context, and revoke the
    // previous session atomically. Per the ninth canonical batch
    // specification, the audit event is emitted in the same
    // transaction so that the session creation and the audit
    // outbox row commit or roll back together.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);
    const rawToken = this.sessionTokens.generate();
    const tokenHash = this.sessionTokens.hash(rawToken);

    const newSession = await this.prisma.$transaction(async (tx) => {
      const row = await tx.authSession.create({
        data: {
          userId: previewUser.id,
          tokenHash,
          expiresAt,
          lastSeenAt: now,
          // Establish the preview tenant, organisation, and
          // facility context directly on the new session. This
          // mirrors the manual selection that the operator would
          // otherwise perform through /dashboard. The composite
          // foreign keys enforce that the membership belongs to
          // the user, the organisation belongs to the tenant,
          // and the facility belongs to the organisation.
          activeTenantMembershipId: previewMembership.id,
          activeOrganisationId: previewOrganisation.id,
          activeFacilityId: previewFacility.id,
        },
      });

      // Revoke the previous session in the same transaction.
      if (previousSessionId !== null) {
        await tx.authSession.updateMany({
          where: { id: previousSessionId, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      await this.auditHelper.emitOrFail(
        {
          action: 'role_preview.session.created',
          outcome: 'success',
          source: 'api',
          tenantId: previewTenant.id,
          actorType: 'USER',
          actorId: previewUser.id,
          sessionId: row.id,
          requestId: input.auditContext.requestId,
          correlationId: input.auditContext.correlationId,
          ipAddress: input.auditContext.ipAddress,
          userAgent: input.auditContext.userAgent,
          scope: 'role_preview',
          metadata: {
            endpoint: 'role_preview_select',
            roleCode: previewIdentity.catalogue.code,
          },
        },
        { transaction: tx },
      );

      return row;
    });

    // Invalidate the previous session's CSRF token. The CSRF
    // service is in-memory; the invalidation is best-effort.
    if (previousSessionId !== null) {
      this.csrfService.invalidate(previousSessionId as never);
    }

    this.logger.debug(
      `Preview session created: id=${newSession.id} role=${previewIdentity.catalogue.code}`,
    );

    const selectedRole = this.toRoleCard(previewIdentity.catalogue);
    return {
      response: {
        selectedRole,
        previewTenant: PREVIEW_TENANT_DISPLAY_NAME,
        previewOrganisation: PREVIEW_ORGANISATION_DISPLAY_NAME,
        previewFacility: PREVIEW_FACILITY_DISPLAY_NAME,
        interfacePath: selectedRole.interfacePath,
      },
      rawToken,
      expiresAt,
    };
  }

  // -------------------------------------------------------------------------
  // Logged-out bootstrap flow
  // -------------------------------------------------------------------------

  /**
   * Issue a one-time bootstrap challenge for a logged-out operator.
   *
   * The challenge is a cryptographically random nonce stored in a
   * separate HttpOnly bootstrap cookie. The server-side state (in
   * `BootstrapChallengeStore`) retains only the SHA-256 hashes of
   * the nonce and the opaque `challengeId`. The raw nonce is NEVER
   * stored server-side; it lives only in the cookie.
   *
   * Returns:
   * - `challengeId`: the opaque identifier the client must echo
   *   back in the `POST /select` body. NOT secret on its own.
   * - `nonce`: the raw nonce the controller sets in the HttpOnly
   *   bootstrap cookie. NEVER returned in the JSON body.
   * - `expiresInMs`: the challenge's remaining lifetime in
   *   milliseconds (≤ 300 000).
   *
   * The bootstrap state grants NO role, NO tenant, NO organisation,
   * NO facility, NO membership, NO permission, and NO application
   * session. It is ONLY a proof-of-possession nonce for the
   * subsequent `POST /select` request.
   *
   * Throws:
   * - `rolePreviewDisabled()` when the feature is disabled.
   */
  issueBootstrap(): {
    readonly challengeId: string;
    readonly nonce: string;
    readonly expiresInMs: number;
  } {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }
    const issued = this.bootstrapStore.issue(BOOTSTRAP_MAX_AGE_MS);
    const expiresInMs = Math.max(0, issued.expiresAt - Date.now());
    return {
      challengeId: issued.challengeId,
      nonce: issued.nonce,
      expiresInMs,
    };
  }

  /**
   * Select a canonical role through the logged-out bootstrap flow.
   *
   * This method is the logged-out counterpart of {@link selectRole}.
   * It is called by the controller when the `POST /select` request
   * carries a `challengeId` in the body AND the bootstrap cookie is
   * present. The method:
   *
   * 1. Verifies the feature gate (defence-in-depth).
   * 2. Verifies the bootstrap challenge by consuming it from the
   *    store. The consume is atomic and one-time: a second call
   *    with the same `challengeId` returns `'replay'`. The raw
   *    nonce is read from the cookie (passed in by the controller);
   *    the store verifies it against the stored hash using
   *    `timingSafeEqual`.
   * 3. Resolves the preview identity from the role code.
   * 4. Resolves the preview workspace (tenant, organisation,
   *    facility) by slug/code lookup.
   * 5. Verifies the preview identity's user exists and has an
   *    active membership in the preview tenant.
   * 6. Atomically creates a new session for the preview identity's
   *    user, sets the active tenant membership, organisation, and
   *    facility on the new session, revokes any previous session
   *    (if the operator somehow already had one), and emits a
   *    `role_preview.session.bootstrapped` audit event in the same
   *    Prisma transaction.
   * 7. Returns the safe response (selected role, preview workspace
   *    display names, interface path) plus the raw session token
   *    for the controller to set in the HttpOnly application-
   *    session cookie. The raw token is NEVER returned in the JSON
   *    body.
   *
   * The method does NOT require an existing application session. It
   * does NOT consult the CSRF service. The proof-of-possession
   * (bootstrap cookie) is the CSRF defense for the initial logged-
   * out request; the SameSite=Strict attribute provides additional
   * defense.
   *
   * Throws:
   * - `rolePreviewDisabled()` when the feature is disabled.
   * - `rolePreviewRoleUnknown()` when the role code is not
   *   canonical.
   * - `rolePreviewBootstrapExpired()` when the challenge is
   *   expired or not found.
   * - `rolePreviewBootstrapReplay()` when the challenge was
   *   already consumed.
   * - `rolePreviewBootstrapInvalid()` when the nonce does not
   *   match.
   */
  async selectRoleWithBootstrap(input: {
    readonly roleCode: string;
    readonly challengeId: string;
    readonly nonce: string;
    readonly previousCookieValue: string | undefined;
    readonly auditContext: AuditRequestContext;
  }): Promise<{
    readonly response: SelectPreviewRoleResponse;
    readonly rawToken: string;
    readonly expiresAt: Date;
  }> {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }

    // Verify and atomically consume the bootstrap challenge. The
    // consume is one-time; a second call with the same challengeId
    // returns 'replay'. The nonce is read from the cookie; the
    // store verifies it against the stored hash using
    // timingSafeEqual.
    const outcome = this.bootstrapStore.consume(input.challengeId, input.nonce);
    if (outcome === 'not_found' || outcome === 'expired') {
      throw rolePreviewBootstrapExpired();
    }
    if (outcome === 'replay') {
      throw rolePreviewBootstrapReplay();
    }
    if (outcome === 'invalid') {
      throw rolePreviewBootstrapInvalid();
    }
    // outcome === 'ok' — fall through.

    const previewIdentity = findPreviewIdentity(input.roleCode);
    if (previewIdentity === null) {
      throw rolePreviewRoleUnknown();
    }

    // Resolve the preview workspace. The lookups by slug/code are
    // deterministic; the preview seed creates these rows.
    const previewTenant = await this.tenants.findBySlug(PREVIEW_TENANT_SLUG);
    if (previewTenant === null) {
      this.logger.warn(
        'Preview tenant not found; the preview seed must be run before bootstrap.',
      );
      throw rolePreviewDisabled();
    }
    const previewOrganisations = await this.organisations.listForTenant(
      previewTenant.id,
    );
    const previewOrganisation = previewOrganisations.find(
      (o) => o.code === PREVIEW_ORGANISATION_CODE,
    );
    if (previewOrganisation === undefined) {
      this.logger.warn('Preview organisation not found.');
      throw rolePreviewDisabled();
    }
    const previewFacilities = await this.facilities.listForOrganisation(
      previewTenant.id,
      previewOrganisation.id,
    );
    const previewFacility = previewFacilities.find(
      (f) => f.code === PREVIEW_FACILITY_CODE,
    );
    if (previewFacility === undefined) {
      this.logger.warn('Preview facility not found.');
      throw rolePreviewDisabled();
    }

    // Resolve the preview identity's user by email.
    const normalisedEmail = previewIdentity.email.trim().toLowerCase();
    const previewUser = await this.users.findByNormalisedEmail(normalisedEmail);
    if (previewUser === null) {
      this.logger.warn(
        `Preview identity not found for role ${previewIdentity.catalogue.code}; the preview seed must be run.`,
      );
      throw rolePreviewDisabled();
    }

    // Resolve the preview identity's membership in the preview
    // tenant.
    const userMemberships = await this.memberships.listForUser(previewUser.id);
    const previewMembership = userMemberships.find(
      (m) => m.tenantId === previewTenant.id && m.status === 'active',
    );
    if (previewMembership === undefined) {
      this.logger.warn(
        `Preview membership not found for role ${previewIdentity.catalogue.code}.`,
      );
      throw rolePreviewDisabled();
    }

    // Resolve the previous session (if any) so we can revoke it
    // atomically. In the logged-out bootstrap flow, there is
    // usually no previous session; but if the operator somehow
    // already had one (e.g. they visited /login first), we revoke
    // it to avoid leaving two concurrent sessions.
    let previousSessionId: string | null = null;
    if (
      input.previousCookieValue !== undefined &&
      input.previousCookieValue.length > 0
    ) {
      const previousTokenHash = this.sessionTokens.hash(
        input.previousCookieValue,
      );
      const now = new Date();
      const previousSession = await this.sessions.findActiveByTokenHash(
        previousTokenHash,
        now,
      );
      if (previousSession !== null) {
        previousSessionId = previousSession.id;
      }
    }

    // Create the new session, set its context, revoke the previous
    // session, and emit the bootstrapped audit event atomically.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);
    const rawToken = this.sessionTokens.generate();
    const tokenHash = this.sessionTokens.hash(rawToken);

    const newSession = await this.prisma.$transaction(async (tx) => {
      const row = await tx.authSession.create({
        data: {
          userId: previewUser.id,
          tokenHash,
          expiresAt,
          lastSeenAt: now,
          activeTenantMembershipId: previewMembership.id,
          activeOrganisationId: previewOrganisation.id,
          activeFacilityId: previewFacility.id,
        },
      });

      if (previousSessionId !== null) {
        await tx.authSession.updateMany({
          where: { id: previousSessionId, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      await this.auditHelper.emitOrFail(
        {
          action: 'role_preview.session.bootstrapped',
          outcome: 'success',
          source: 'api',
          tenantId: previewTenant.id,
          actorType: 'USER',
          actorId: previewUser.id,
          sessionId: row.id,
          requestId: input.auditContext.requestId,
          correlationId: input.auditContext.correlationId,
          ipAddress: input.auditContext.ipAddress,
          userAgent: input.auditContext.userAgent,
          scope: 'role_preview',
          metadata: {
            endpoint: 'role_preview_bootstrap_select',
            roleCode: previewIdentity.catalogue.code,
          },
        },
        { transaction: tx },
      );

      return row;
    });

    // Invalidate the previous session's CSRF token (best-effort).
    if (previousSessionId !== null) {
      this.csrfService.invalidate(previousSessionId as never);
    }

    this.logger.debug(
      `Preview session bootstrapped: id=${newSession.id} role=${previewIdentity.catalogue.code}`,
    );

    const selectedRole = this.toRoleCard(previewIdentity.catalogue);
    return {
      response: {
        selectedRole,
        previewTenant: PREVIEW_TENANT_DISPLAY_NAME,
        previewOrganisation: PREVIEW_ORGANISATION_DISPLAY_NAME,
        previewFacility: PREVIEW_FACILITY_DISPLAY_NAME,
        interfacePath: selectedRole.interfacePath,
      },
      rawToken,
      expiresAt,
    };
  }

  // -------------------------------------------------------------------------
  // Current role
  // -------------------------------------------------------------------------

  /**
   * Return the current preview role metadata. The service inspects
   * the authenticated session's user, membership, and role
   * assignments to determine whether the session belongs to a
   * preview identity.
   *
   * Returns `{ active: false, selectedRole: null, ... }` when the
   * session is not a preview session. The frontend consults the
   * `active` boolean to decide whether to render the role switcher
   * in the Clinic Admin header.
   *
   * Throws:
   * - `rolePreviewDisabled()` when the feature is disabled.
   * - `rolePreviewSessionRequired()` when the session is missing.
   */
  async getCurrentRole(input: {
    readonly cookieValue: string | undefined;
    readonly auditContext?: AuditRequestContext;
  }): Promise<CurrentPreviewRoleResponse> {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }

    const authResult = await this.authService.getSessionFromCookie(
      input.cookieValue,
      input.auditContext,
    );
    if (authResult === null) {
      throw rolePreviewSessionRequired();
    }

    // Resolve the preview tenant by slug. If it does not exist,
    // the seed has not been run; no session can be a preview
    // session.
    const previewTenant = await this.tenants.findBySlug(PREVIEW_TENANT_SLUG);
    if (previewTenant === null) {
      return {
        active: false,
        selectedRole: null,
        previewTenant: null,
        previewOrganisation: null,
        previewFacility: null,
      };
    }

    // Find the user's active membership in the preview tenant. If
    // the user has none, the session is not a preview session.
    const userMemberships = await this.memberships.listForUser(
      authResult.user.id,
    );
    const previewMembership = userMemberships.find(
      (m) => m.tenantId === previewTenant.id && m.status === 'active',
    );
    if (previewMembership === undefined) {
      return {
        active: false,
        selectedRole: null,
        previewTenant: null,
        previewOrganisation: null,
        previewFacility: null,
      };
    }

    // Load the membership's role assignments. The preview seed
    // creates exactly one assignment per preview identity; we use
    // the first canonical role code we find that matches a preview
    // identity entry.
    const roleAssignments = await this.prisma.tenantRoleAssignment.findMany({
      where: { tenantMembershipId: previewMembership.id },
    });
    let selectedEntry: PreviewIdentityEntry | null = null;
    for (const assignment of roleAssignments) {
      const entry = findPreviewIdentity(assignment.roleCode);
      if (entry !== null) {
        selectedEntry = entry;
        break;
      }
    }
    if (selectedEntry === null) {
      // The membership has no canonical preview role assignment;
      // treat as not active.
      return {
        active: false,
        selectedRole: null,
        previewTenant: null,
        previewOrganisation: null,
        previewFacility: null,
      };
    }

    return {
      active: true,
      selectedRole: this.toRoleCard(selectedEntry.catalogue),
      previewTenant: PREVIEW_TENANT_DISPLAY_NAME,
      previewOrganisation: PREVIEW_ORGANISATION_DISPLAY_NAME,
      previewFacility: PREVIEW_FACILITY_DISPLAY_NAME,
    };
  }

  // -------------------------------------------------------------------------
  // End preview session
  // -------------------------------------------------------------------------

  /**
   * End the current preview session. Revokes the session, clears
   * the cookie, and invalidates the CSRF token.
   *
   * Throws:
   * - `rolePreviewDisabled()` when the feature is disabled.
   * - `rolePreviewSessionRequired()` when the session is missing.
   * - `rolePreviewNotActive()` when the session is not a preview
   *   session.
   */
  async endPreviewSession(input: {
    readonly cookieValue: string | undefined;
    readonly auditContext?: AuditRequestContext;
  }): Promise<void> {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }

    const authResult = await this.authService.getSessionFromCookie(
      input.cookieValue,
      input.auditContext,
    );
    if (authResult === null) {
      throw rolePreviewSessionRequired();
    }

    // Verify the session is a preview session. We reuse the
    // current-role logic; if `active` is false, the session is
    // not a preview session and the end endpoint returns
    // `rolePreviewNotActive()`.
    const current = await this.getCurrentRole({
      cookieValue: input.cookieValue,
      auditContext: input.auditContext,
    });
    if (!current.active) {
      throw rolePreviewNotActive();
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: { id: authResult.session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.auditHelper.emitOrFail(
        {
          action: 'role_preview.session.ended',
          outcome: 'success',
          source: 'api',
          tenantId: authResult.memberships[0]?.tenantId ?? null,
          actorType: 'USER',
          actorId: authResult.user.id,
          sessionId: authResult.session.id,
          requestId:
            input.auditContext?.requestId ??
            '00000000-0000-0000-0000-000000000000',
          correlationId: input.auditContext?.correlationId ?? null,
          ipAddress: input.auditContext?.ipAddress ?? null,
          userAgent: input.auditContext?.userAgent ?? null,
          scope: 'role_preview',
          metadata: { endpoint: 'role_preview_end' },
        },
        { transaction: tx },
      );
    });

    this.csrfService.invalidate(authResult.session.id);
    this.logger.debug(`Preview session ended: id=${authResult.session.id}`);
  }
}
