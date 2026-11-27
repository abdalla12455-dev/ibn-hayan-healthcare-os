import {
  ForbiddenException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants.js';
import { buildSessionCookieOptions } from '../auth/auth.cookies.js';
import { sessionRequired } from '../auth/auth.errors.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { authorizationForbidden } from '../authorization/authorization.errors.js';

import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';

import { PlatformAdminAccessService } from './platform-admin-access.service.js';
import {
  PlatformAdminTenantsService,
  type PlatformTenantList,
} from './platform-admin-tenants.service.js';

export interface PlatformAdminOverviewResponse {
  readonly administrator: {
    readonly displayName: string;
  };
}

/**
 * Platform administration entry point.
 *
 * Authentication is established through the existing session
 * service. Platform authorization requires a fresh authoritative
 * database grant check.
 *
 * Tenant roles and tenant memberships never independently
 * authorize this endpoint.
 *
 * This endpoint is read-only and does not expose tenant data,
 * clinical records, subscription data, or configuration values.
 */
@ApiTags('platform-admin')
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly platformAccess: PlatformAdminAccessService,
    private readonly tenantsService: PlatformAdminTenantsService,
    private readonly auditHelper: AuditHelperService,
  ) {}

  private async auditPlatformDecision(
    req: Request,
    actorId: string,
    sessionId: string,
    decision: 'allowed' | 'denied',
  ): Promise<void> {
    const context = buildAuditContext(req);

    await this.auditHelper.emitDirect({
      action:
        decision === 'allowed'
          ? 'authorization.decision.allowed'
          : 'authorization.decision.denied',
      outcome: decision === 'allowed' ? 'success' : 'denied',
      ...(decision === 'denied'
        ? { reasonCode: 'platform_grant_required' }
        : {}),
      source: 'api',
      tenantId: null,
      actorType: 'USER',
      actorId,
      sessionId,
      requestId: context.requestId,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      scope: 'authorization',
      metadata: {
        endpoint: req.path,
        method: req.method,
      },
    });
  }

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Load the authenticated platform administrator overview',
  })
  @ApiResponse({
    status: 200,
    description: 'Authorized platform administrator overview.',
  })
  @ApiResponse({
    status: 401,
    description: 'A valid authenticated session is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Platform administration access is not authorized.',
  })
  async getOverview(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PlatformAdminOverviewResponse> {
    res.setHeader('Cache-Control', 'no-store');

    const authenticated = await this.authService.getSessionFromCookie(
      readCookie(req, SESSION_COOKIE_NAME),
      buildAuditContext(req),
    );

    if (authenticated === null) {
      throw sessionRequired();
    }

    // Preserve the existing session-rotation mechanism.
    // A rotated session must receive its replacement cookie.
    if (authenticated.rotatedRawToken !== null) {
      const isProduction = process.env['NODE_ENV'] === 'production';

      const maxAge = authenticated.expiresAt.getTime() - Date.now();

      res.cookie(
        SESSION_COOKIE_NAME,
        authenticated.rotatedRawToken,
        buildSessionCookieOptions(isProduction, maxAge),
      );
    }

    // Never infer platform authority from R09, R13,
    // an active tenant context, or client-supplied identifiers.
    const authorized = await this.platformAccess.hasActivePlatformGrant(
      authenticated.user.id,
    );

    if (!authorized) {
      await this.auditPlatformDecision(
        req,
        authenticated.user.id,
        authenticated.session.id,
        'denied',
      );
      throw authorizationForbidden();
    }

    await this.auditPlatformDecision(
      req,
      authenticated.user.id,
      authenticated.session.id,
      'allowed',
    );

    return {
      administrator: {
        displayName: authenticated.user.displayName,
      },
    };
  }

  /**
   * Read-only platform-wide customer listing.
   *
   * The authenticated user identity comes exclusively from
   * the existing server-side session.
   *
   * PlatformAdminTenantsService performs a fresh independent
   * platform-grant check before reading customer records.
   */
  @Get('tenants')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'List customers for an authorized platform administrator',
  })
  @ApiResponse({
    status: 200,
    description: 'A bounded list of registered platform customers.',
  })
  @ApiResponse({
    status: 401,
    description: 'An authenticated session is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Platform administration access is not authorized.',
  })
  async listTenants(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('cursor') cursor?: string,
  ): Promise<PlatformTenantList> {
    res.setHeader('Cache-Control', 'no-store');

    const authenticated = await this.authService.getSessionFromCookie(
      readCookie(req, SESSION_COOKIE_NAME),
      buildAuditContext(req),
    );

    if (authenticated === null) {
      throw sessionRequired();
    }

    // Preserve the existing session-rotation behaviour.
    if (authenticated.rotatedRawToken !== null) {
      const isProduction = process.env['NODE_ENV'] === 'production';

      const maxAge = authenticated.expiresAt.getTime() - Date.now();

      res.cookie(
        SESSION_COOKIE_NAME,
        authenticated.rotatedRawToken,
        buildSessionCookieOptions(isProduction, maxAge),
      );
    }

    // Never accept user identity or platform authority from
    // request parameters, tenant roles, or browser state.
    let result: PlatformTenantList;

    try {
      result = await this.tenantsService.listForPlatformAdministrator(
        authenticated.user.id,
        cursor,
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        await this.auditPlatformDecision(
          req,
          authenticated.user.id,
          authenticated.session.id,
          'denied',
        );
      }
      throw error;
    }

    await this.auditPlatformDecision(
      req,
      authenticated.user.id,
      authenticated.session.id,
      'allowed',
    );

    return result;
  }
}
