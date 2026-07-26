import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type {
  RolePreviewAvailabilityResponse,
  BootstrapChallengeResponse,
  SelectPreviewRoleRequest,
  SelectPreviewRoleResponse,
  CurrentPreviewRoleResponse,
  EndPreviewRoleResponse,
} from '@ibn-hayan/contracts';
import { SelectPreviewRoleRequestSchema } from '@ibn-hayan/contracts';
import {
  AuthService,
  type AuditRequestContext,
} from '../../auth/auth.service.js';
import { CsrfService } from '../../auth/csrf.service.js';
import {
  SESSION_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../../auth/auth.constants.js';
import {
  buildSessionCookieOptions,
  buildSessionCookieClearOptions,
} from '../../auth/auth.cookies.js';
import type { RequestWithIdentifiers } from '../../audit/request-id.middleware.js';
import { RolePreviewService } from './role-preview.service.js';
import { RolePreviewFeatureConfig } from './role-preview-feature.config.js';
import {
  rolePreviewDisabled,
  rolePreviewRequestInvalid,
  rolePreviewSessionRequired,
  rolePreviewCsrfInvalid,
  rolePreviewOriginDisallowed,
  rolePreviewBootstrapExpired,
  rolePreviewDatabaseIdentityInvalid,
} from './role-preview.errors.js';
import {
  BOOTSTRAP_COOKIE_NAME,
  buildBootstrapCookieOptions,
  buildBootstrapCookieClearOptions,
} from './role-preview.cookies.js';
import { isPreviewDatabaseIdentityValid } from './preview-database-identity.js';

/**
 * Demo Role Preview Mode controller.
 *
 * Exposes four routes under `/api/v1/dev/role-preview`:
 *
 * - `GET /` — query whether preview mode is available and list the
 *   canonical preview role cards. Available only when the feature
 *   is enabled; returns a 404 when disabled (so that the route's
 *   existence is not advertised in production).
 * - `GET /current` — return the current preview role metadata.
 *   Requires an authenticated session; available only when the
 *   feature is enabled.
 * - `POST /select` — select a canonical role code, create a fresh
 *   preview session for the corresponding preview identity,
 *   establish the preview tenant/organisation/facility context,
 *   revoke the previous session atomically, and set the new
 *   HttpOnly cookie. Requires authentication, exact allowed
 *   Origin, and a valid `X-CSRF-Token` header.
 * - `POST /end` — end the current preview session. Requires
 *   authentication, exact allowed Origin, and a valid
 *   `X-CSRF-Token` header.
 *
 * Security posture:
 * - The {@link RolePreviewFeatureConfig} gate is the authoritative
 *   entry point. Every route consults the gate before delegating
 *   to the service. When the gate returns `false`, the route
 *   returns a 404 (availability, current) or throws
 *   `rolePreviewDisabled()` (select, end). The 404 status for the
 *   availability endpoint does NOT advertise the route's existence
 *   in production.
 * - Mutation routes (select, end) verify Origin BEFORE the session
 *   check (preserving the existing security posture from the auth
 *   and authorization modules). The Origin check uses
 *   `AuthService.isOriginAllowed`, the same helper used by the
 *   auth and session-context modules.
 * - Mutation routes verify the CSRF token AFTER the session check
 *   (the token is session-bound) but BEFORE the role-preview
 *   business logic. The CSRF check uses `CsrfService.verify`, the
 *   same helper used by the auth and session-context modules.
 * - The select route accepts ONLY a canonical role code in the
 *   body. The Zod schema `SelectPreviewRoleRequestSchema` is
 *   `.strict()`; any additional field (userId, membershipId,
 *   tenantId, etc.) is rejected at the boundary.
 * - The raw session token is NEVER returned in a JSON response.
 *   It lives only in the HttpOnly cookie.
 *
 * Per the Demo Role Preview Mode v1 specification, the controller
 * does NOT register its routes when `NODE_ENV === 'production'`.
 * The gate returns `false` for every route in production; the
 * 404 responses do not reveal that the routes exist. This is the
 * structural fail-closed posture.
 */
@ApiTags('dev/role-preview')
@Controller('dev/role-preview')
export class RolePreviewController {
  constructor(
    private readonly rolePreview: RolePreviewService,
    private readonly featureConfig: RolePreviewFeatureConfig,
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/v1/dev/role-preview
   *
   * Query whether preview mode is available and list the canonical
   * preview role cards.
   *
   * Returns 404 when the feature is disabled (production or flag
   * off). The 404 status does NOT advertise the route's existence
   * in production.
   */
  @Get()
  @ApiOperation({
    summary:
      'Query Demo Role Preview Mode availability and list canonical preview roles',
  })
  @ApiResponse({
    status: 200,
    description:
      'Preview mode is available; the response lists the canonical preview roles.',
  })
  @ApiResponse({
    status: 404,
    description: 'Preview mode is unavailable (production or flag off).',
  })
  getAvailability(): RolePreviewAvailabilityResponse {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }
    return this.rolePreview.buildAvailabilityResponse();
  }

  /**
   * GET /api/v1/dev/role-preview/bootstrap
   *
   * Issue a one-time bootstrap challenge for a logged-out operator.
   *
   * The route is available ONLY when ALL of the following are true:
   * 1. The feature gate passes (`NODE_ENV !== 'production'` AND
   *    `IBN_HAYAN_ROLE_PREVIEW_ENABLED=true`).
   * 2. The database-identity gate passes (`DATABASE_URL` and
   *    `AUDIT_DATABASE_URL` both positively identify isolated
   *    role-preview databases).
   *
   * When available, the route:
   * 1. Verifies Origin (preserving the existing security posture).
   * 2. Delegates to `RolePreviewService.issueBootstrap()` which
   *    generates a cryptographically random nonce (32 bytes,
   *    base64url) and an opaque `challengeId` (16 bytes,
   *    base64url). The store retains only the SHA-256 hashes.
   * 3. Sets the HttpOnly bootstrap cookie (`ibn_hayan_role_preview_bootstrap`)
   *    with the raw nonce as the value. The cookie is
   *    SameSite=Strict, HttpOnly, Secure in production, Max-Age=300s,
   *    Path=/api/v1/dev/role-preview.
   * 4. Returns only safe challenge metadata: `{ ok: true,
   *    challengeId, expiresInMs }`. The raw nonce is NEVER returned
   *    in the JSON body.
   *
   * The bootstrap state grants NO role, NO tenant, NO organisation,
   * NO facility, NO membership, NO permission, and NO application
   * session. It is ONLY a proof-of-possession nonce for the
   * subsequent `POST /select` request.
   *
   * Returns 404 when the feature is disabled.
   * Returns 403 when Origin is disallowed or the database-identity
   * gate fails.
   */
  @Get('bootstrap')
  @ApiOperation({
    summary:
      'Issue a one-time bootstrap challenge for logged-out Demo Role Preview Mode',
  })
  @ApiResponse({
    status: 200,
    description:
      'Bootstrap challenge issued; the bootstrap cookie is set. Returns only safe challenge metadata.',
  })
  @ApiResponse({
    status: 403,
    description: 'Origin is disallowed, or the database-identity gate failed.',
  })
  @ApiResponse({
    status: 404,
    description: 'Preview mode is unavailable.',
  })
  issueBootstrapChallenge(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): BootstrapChallengeResponse {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }

    // Database-identity gate: refuse to issue a bootstrap challenge
    // when the database URLs do not positively identify isolated
    // role-preview databases. This is defence-in-depth; the seed
    // script enforces the same gate.
    if (!isPreviewDatabaseIdentityValid(process.env)) {
      throw rolePreviewDatabaseIdentityInvalid();
    }

    // Verify Origin. The bootstrap route is a state-changing route
    // (it sets a cookie and creates server-side state); the Origin
    // check runs BEFORE the issue.
    const origin = req.headers['origin'];
    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    if (!this.authService.isOriginAllowed(origin, webOrigin)) {
      throw rolePreviewOriginDisallowed();
    }

    // Issue the challenge. The service returns the raw nonce; the
    // raw nonce is NEVER returned in the JSON body. It is set only
    // in the HttpOnly bootstrap cookie.
    const issued = this.rolePreview.issueBootstrap();

    const isProduction = process.env['NODE_ENV'] === 'production';
    res.cookie(
      BOOTSTRAP_COOKIE_NAME,
      issued.nonce,
      buildBootstrapCookieOptions(isProduction, issued.expiresInMs),
    );

    return {
      ok: true,
      challengeId: issued.challengeId,
      expiresInMs: issued.expiresInMs,
    };
  }

  /**
   * GET /api/v1/dev/role-preview/current
   *
   * Return the current preview role metadata.
   *
   * Returns 404 when the feature is disabled.
   * Returns 401 when the session is missing, expired, or revoked.
   */
  @Get('current')
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Return the current Demo Role Preview Mode role metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'The current preview role metadata.',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 404,
    description: 'Preview mode is unavailable.',
  })
  async getCurrentRole(
    @Req() req: Request,
  ): Promise<CurrentPreviewRoleResponse> {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    return this.rolePreview.getCurrentRole({
      cookieValue,
      auditContext: buildAuditContext(req),
    });
  }

  /**
   * POST /api/v1/dev/role-preview/select
   *
   * Select a canonical role code, create a fresh preview session
   * for the corresponding preview identity, establish the preview
   * tenant/organisation/facility context, revoke the previous
   * session atomically, and set the new HttpOnly cookie.
   *
   * Supports TWO flows:
   * 1. **Logged-out bootstrap flow.** When the request body
   *    carries a `challengeId` AND the bootstrap cookie is
   *    present, the controller verifies the challenge, consumes
   *    it (one-time), creates the first preview session for the
   *    selected role, sets the HttpOnly application-session
   *    cookie, and clears the bootstrap cookie. No existing
   *    session is required; the bootstrap cookie is the CSRF
   *    defense (SameSite=Strict).
   * 2. **Session-bound switching flow.** When the request body
   *    does NOT carry a `challengeId`, the controller requires an
   *    existing session cookie and a valid `X-CSRF-Token` header
   *    (the existing behaviour, preserved for subsequent role
   *    switching from an active preview session).
   *
   * Returns 404 when the feature is disabled.
   * Returns 401 when the session is missing (session-bound flow
   * only).
   * Returns 403 when the Origin is disallowed, the CSRF token is
   * missing/invalid (session-bound flow only), the bootstrap
   * challenge is expired/replay/invalid (bootstrap flow only), or
   * the database-identity gate fails (bootstrap flow only).
   */
  @Post('select')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Select a canonical role for Demo Role Preview Mode',
  })
  @ApiHeader({
    name: 'X-CSRF-Token',
    description:
      'CSRF token issued by GET /api/v1/auth/csrf. Required for the session-bound switching flow; NOT required for the logged-out bootstrap flow.',
    required: false,
  })
  @ApiBody({
    description:
      'The canonical role code to select, plus the optional challengeId for the logged-out bootstrap flow.',
    schema: {
      type: 'object',
      required: ['roleCode'],
      properties: {
        roleCode: {
          type: 'string',
          enum: [
            'R01_PHYSICIAN',
            'R02_NURSE',
            'R03_PHARMACIST',
            'R04_TECHNICIAN',
            'R05_ALLIED_HEALTH_PROFESSIONAL',
            'R06_RECEPTIONIST',
            'R07_SCHEDULER',
            'R08_BILLER',
            'R09_ADMINISTRATOR',
            'R10_COMPLIANCE_OFFICER',
            'R11_HR_MANAGER',
            'R12_EXECUTIVE',
            'R13_SYSTEM_ADMINISTRATOR',
            'R14_INTEGRATION_ACCOUNT',
          ],
        },
        challengeId: {
          type: 'string',
          description:
            'Opaque challenge identifier returned by GET /bootstrap. Required for the logged-out bootstrap flow; omit for the session-bound switching flow.',
        },
      },
      additionalProperties: false,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preview session created; the new session cookie is set.',
  })
  @ApiResponse({
    status: 400,
    description:
      'The role code is unknown (ROLE_PREVIEW_ROLE_UNKNOWN), or the request body failed contract validation (ROLE_PREVIEW_REQUEST_INVALID).',
  })
  @ApiResponse({
    status: 401,
    description:
      'Session is missing, expired, or revoked (session-bound flow only).',
  })
  @ApiResponse({
    status: 403,
    description:
      'Origin is disallowed, CSRF is missing/invalid, the bootstrap challenge is expired/replay/invalid, or the database-identity gate failed.',
  })
  @ApiResponse({
    status: 404,
    description: 'Preview mode is unavailable.',
  })
  async selectRole(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SelectPreviewRoleResponse> {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }

    // Verify Origin BEFORE any other check (preserves the
    // existing security posture). The Origin check uses the
    // existing AuthService.isOriginAllowed helper so that the
    // preview module does not duplicate the Origin logic.
    const origin = req.headers['origin'];
    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    if (!this.authService.isOriginAllowed(origin, webOrigin)) {
      throw rolePreviewOriginDisallowed();
    }

    // Validate the request body through the shared Zod contract.
    // The schema is `.strict()`; any additional field (userId,
    // membershipId, tenantId, etc.) is rejected at the boundary.
    const parsed = SelectPreviewRoleRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw rolePreviewRequestInvalid();
    }
    const request: SelectPreviewRoleRequest = parsed.data;

    // Dispatch to the appropriate flow based on whether the
    // request carries a `challengeId`. The logged-out bootstrap
    // flow uses the bootstrap cookie as proof-of-possession; the
    // session-bound switching flow uses the existing session
    // cookie and CSRF token.
    if (request.challengeId !== undefined) {
      return await this.selectRoleViaBootstrap(request, req, res);
    }
    return await this.selectRoleViaSession(request, req, res);
  }

  /**
   * Logged-out bootstrap flow for `POST /select`. Verifies the
   * bootstrap cookie, consumes the one-time challenge, creates
   * the first preview session, sets the application-session
   * cookie, and clears the bootstrap cookie.
   */
  private async selectRoleViaBootstrap(
    request: SelectPreviewRoleRequest,
    req: Request,
    res: Response,
  ): Promise<SelectPreviewRoleResponse> {
    // The challengeId is required for this flow; the Zod schema
    // already validated it as a non-empty string when present.
    // The TypeScript narrowing is conservative.
    if (request.challengeId === undefined) {
      // Defensive: should never happen because the caller checks.
      throw rolePreviewRequestInvalid();
    }

    // Database-identity gate: refuse to consume a bootstrap
    // challenge when the database URLs do not positively identify
    // isolated role-preview databases. This prevents the bootstrap
    // flow from creating a preview session against a non-preview
    // database.
    if (!isPreviewDatabaseIdentityValid(process.env)) {
      throw rolePreviewDatabaseIdentityInvalid();
    }

    // Read the bootstrap cookie. The cookie carries the raw nonce
    // that the store will verify against the stored hash.
    const bootstrapNonce = readCookie(req, BOOTSTRAP_COOKIE_NAME);
    if (bootstrapNonce === undefined || bootstrapNonce.length === 0) {
      // No bootstrap cookie → treat as expired/not-found. The
      // operator must request a fresh bootstrap.
      throw rolePreviewBootstrapExpired();
    }

    // Read the existing application-session cookie (if any) so
    // the service can revoke it atomically. In the logged-out
    // bootstrap flow, this is usually undefined.
    const previousCookieValue = readCookie(req, SESSION_COOKIE_NAME);

    const isProduction = process.env['NODE_ENV'] === 'production';

    // Delegate to the service. The service verifies and consumes
    // the bootstrap challenge, resolves the preview identity,
    // creates the new session, revokes the previous session, and
    // emits the `role_preview.session.bootstrapped` audit event
    // atomically.
    const result = await this.rolePreview.selectRoleWithBootstrap({
      roleCode: request.roleCode,
      challengeId: request.challengeId,
      nonce: bootstrapNonce,
      previousCookieValue,
      auditContext: buildAuditContext(req),
    });

    // Set the new HttpOnly application-session cookie. The raw
    // token is NEVER returned in the JSON body.
    const maxAge = result.expiresAt.getTime() - Date.now();
    res.cookie(
      SESSION_COOKIE_NAME,
      result.rawToken,
      buildSessionCookieOptions(isProduction, maxAge),
    );

    // Clear the bootstrap cookie. The challenge has been consumed
    // and is no longer valid.
    res.clearCookie(
      BOOTSTRAP_COOKIE_NAME,
      buildBootstrapCookieClearOptions(isProduction),
    );

    return result.response;
  }

  /**
   * Session-bound switching flow for `POST /select`. Preserves the
   * existing behaviour: requires an existing session cookie and a
   * valid `X-CSRF-Token` header. Used for subsequent role
   * switching from an active preview session.
   */
  private async selectRoleViaSession(
    request: SelectPreviewRoleRequest,
    req: Request,
    res: Response,
  ): Promise<SelectPreviewRoleResponse> {
    // Verify the existing session. The session-bound select
    // endpoint requires an authenticated session because the
    // previous session must be revoked atomically with the new
    // session creation.
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      buildAuditContext(req),
    );
    if (authResult === null) {
      throw rolePreviewSessionRequired();
    }

    // Verify the CSRF token AFTER the session check (the token
    // is session-bound) but BEFORE the role-preview business
    // logic.
    const csrfToken = readHeader(req, CSRF_HEADER_NAME);
    if (!csrfToken || csrfToken.length === 0) {
      throw rolePreviewCsrfInvalid();
    }
    const csrfOk = this.csrfService.verify(authResult.session.id, csrfToken);
    if (!csrfOk) {
      throw rolePreviewCsrfInvalid();
    }

    // Delegate to the service for the role-preview business
    // logic. The service creates the new session, sets the
    // context, revokes the previous session, and emits the
    // audit event atomically.
    const result = await this.rolePreview.selectRole({
      roleCode: request.roleCode,
      previousCookieValue: cookieValue,
      auditContext: buildAuditContext(req),
    });

    // Set the new HttpOnly cookie. The raw token is NEVER
    // returned in the JSON body.
    const isProduction = process.env['NODE_ENV'] === 'production';
    const maxAge = result.expiresAt.getTime() - Date.now();
    res.cookie(
      SESSION_COOKIE_NAME,
      result.rawToken,
      buildSessionCookieOptions(isProduction, maxAge),
    );

    return result.response;
  }

  /**
   * POST /api/v1/dev/role-preview/end
   *
   * End the current preview session. Revokes the session, clears
   * the cookie, and invalidates the CSRF token.
   *
   * Returns 404 when the feature is disabled.
   * Returns 401 when the session is missing.
   * Returns 403 when the Origin is disallowed or the CSRF token is
   * missing/invalid.
   * Returns 403 when the session is not a preview session.
   */
  @Post('end')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'End the current Demo Role Preview Mode session',
  })
  @ApiHeader({
    name: 'X-CSRF-Token',
    description: 'CSRF token issued by GET /api/v1/auth/csrf.',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Preview session ended; the cookie is cleared.',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Origin is disallowed, CSRF is missing/invalid, or the session is not a preview session.',
  })
  @ApiResponse({
    status: 404,
    description: 'Preview mode is unavailable.',
  })
  async endPreviewSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EndPreviewRoleResponse> {
    if (!this.featureConfig.isRolePreviewEnabled()) {
      throw rolePreviewDisabled();
    }

    // Verify Origin.
    const origin = req.headers['origin'];
    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    if (!this.authService.isOriginAllowed(origin, webOrigin)) {
      throw rolePreviewOriginDisallowed();
    }

    // Verify the existing session.
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const authResult = await this.authService.getSessionFromCookie(
      cookieValue,
      buildAuditContext(req),
    );
    if (authResult === null) {
      throw rolePreviewSessionRequired();
    }

    // Verify the CSRF token.
    const csrfToken = readHeader(req, CSRF_HEADER_NAME);
    if (!csrfToken || csrfToken.length === 0) {
      throw rolePreviewCsrfInvalid();
    }
    const csrfOk = this.csrfService.verify(authResult.session.id, csrfToken);
    if (!csrfOk) {
      throw rolePreviewCsrfInvalid();
    }

    // Delegate to the service.
    await this.rolePreview.endPreviewSession({
      cookieValue,
      auditContext: buildAuditContext(req),
    });

    // Clear the application-session cookie.
    const isProduction = process.env['NODE_ENV'] === 'production';
    res.clearCookie(
      SESSION_COOKIE_NAME,
      buildSessionCookieClearOptions(isProduction),
    );

    // Defensive: also clear any remaining bootstrap cookie. The
    // bootstrap cookie should have been cleared at the end of the
    // bootstrap flow, but if the operator ended the preview
    // session without first clearing the bootstrap cookie (e.g. by
    // clearing cookies manually and then re-bootstrapping), we
    // clear it here as well.
    res.clearCookie(
      BOOTSTRAP_COOKIE_NAME,
      buildBootstrapCookieClearOptions(isProduction),
    );

    return { ok: true };
  }
}

// -------------------------------------------------------------------------
// Helpers (duplicated from the auth controller so this module is
// self-contained; the auth controller's helpers are not exported).
// -------------------------------------------------------------------------

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) {
    return undefined;
  }
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}

function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function buildAuditContext(req: Request): AuditRequestContext {
  const augmented = req as RequestWithIdentifiers;
  const requestId =
    augmented.requestId ?? '00000000-0000-0000-0000-000000000000';
  const correlationId = augmented.correlationId ?? null;
  const ipRaw = req.ip ?? req.socket?.remoteAddress ?? null;
  const ipAddress = ipRaw !== null && ipRaw !== undefined ? ipRaw : null;
  const uaRaw = req.headers['user-agent'];
  const userAgent =
    typeof uaRaw === 'string'
      ? uaRaw
      : Array.isArray(uaRaw)
        ? (uaRaw[0] ?? null)
        : null;
  return { requestId, correlationId, ipAddress, userAgent };
}
