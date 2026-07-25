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
} from './role-preview.errors.js';

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
   * Returns 404 when the feature is disabled.
   * Returns 401 when the session is missing.
   * Returns 403 when the Origin is disallowed or the CSRF token is
   * missing/invalid.
   */
  @Post('select')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Select a canonical role for Demo Role Preview Mode',
  })
  @ApiHeader({
    name: 'X-CSRF-Token',
    description: 'CSRF token issued by GET /api/v1/auth/csrf.',
    required: true,
  })
  @ApiBody({
    description: 'The canonical role code to select.',
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
      },
      additionalProperties: false,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preview session created; the new session cookie is set.',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Origin is disallowed, CSRF is missing/invalid, or the role code is unknown.',
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

    // Verify the existing session. The select endpoint requires
    // an authenticated session because the previous session must
    // be revoked atomically with the new session creation. A
    // missing session means there is nothing to revoke; we
    // return 401 so the frontend redirects to /login.
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

    // Clear the cookie.
    const isProduction = process.env['NODE_ENV'] === 'production';
    res.clearCookie(
      SESSION_COOKIE_NAME,
      buildSessionCookieClearOptions(isProduction),
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
