import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { authorizationForbidden } from '../authorization/authorization.errors.js';

import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';

import { PlatformAdminAccessService } from './platform-admin-access.service.js';

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
  ) {}

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
      throw authorizationForbidden();
    }

    return {
      administrator: {
        displayName: authenticated.user.displayName,
      },
    };
  }
}
