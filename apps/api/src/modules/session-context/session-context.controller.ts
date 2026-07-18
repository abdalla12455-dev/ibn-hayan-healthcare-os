import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type {
  ContextResponse,
  SelectTenantContextRequest,
  ClearTenantContextResponse,
} from '@ibn-hayan/contracts';
import { SelectTenantContextRequestSchema } from '@ibn-hayan/contracts';
import type { TenantMembershipId } from '@ibn-hayan/domain';
import { AuthService } from '../auth/auth.service.js';
import {
  SESSION_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../auth/auth.constants.js';
import { CsrfService } from '../auth/csrf.service.js';
import { SessionContextService } from './session-context.service.js';
import {
  sessionRequired,
  originDisallowed,
  csrfInvalid,
  contextRequestInvalid,
} from './session-context.errors.js';

/**
 * Session-context controller.
 *
 * Exposes three routes under `/api/v1/context`:
 *
 * - `GET /context` — return the user's available Tenant context
 *   options and the currently active context. Requires
 *   authentication; does not require Origin or CSRF.
 *
 * - `PUT /context/tenant` — select a TenantMembership as the active
 *   context for the current session. Requires authentication,
 *   exact allowed Origin, and valid `X-CSRF-Token`.
 *
 * - `DELETE /context/tenant` — clear the active context for the
 *   current session. Requires authentication, exact allowed Origin,
 *   and valid `X-CSRF-Token`.
 *
 * Per the fifth canonical batch specification:
 * - The active context is session-specific. Different sessions for
 *   the same user have independent context.
 * - Selection is by TenantMembership ID, never by an arbitrary
 *   Tenant ID.
 * - The response never contains the session token, the CSRF hash,
 *   any Prisma value, or any credential.
 *
 * Per ADR-013 §1.1, CSRF protection is mandatory for state-changing
 * browser requests. PUT and DELETE verify the `Origin` header and
 * the `X-CSRF-Token` header. GET does not require either because it
 * is a read-only operation.
 *
 * The controller does NOT duplicate the auth module's cookie
 * parsing, CSRF verification, or Origin enforcement. It reuses
 * `AuthService.getSessionFromCookie()` for cookie validation,
 * `CsrfService.verify()` for CSRF verification, and
 * `AuthService.isOriginAllowed()` for Origin enforcement. The
 * reuse is structural: the session-context module depends on the
 * auth module via Nest DI; it does not reach into the auth
 * module's private helpers.
 */
@ApiTags('context')
@Controller('context')
export class SessionContextController {
  constructor(
    private readonly contextService: SessionContextService,
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/v1/context
   *
   * Return the user's available Tenant context options and the
   * currently active context.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Does not require Origin or CSRF (read-only operation).
   */
  @Get()
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Load the available Tenant context options and the active context',
  })
  @ApiResponse({
    status: 200,
    description: 'The context response.',
    schema: {
      type: 'object',
      required: ['options', 'active'],
      properties: {
        options: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'membershipId',
              'tenantId',
              'tenantSlug',
              'tenantDisplayName',
            ],
            properties: {
              membershipId: { type: 'string', format: 'uuid' },
              tenantId: { type: 'string', format: 'uuid' },
              tenantSlug: { type: 'string' },
              tenantDisplayName: { type: 'string' },
            },
          },
        },
        active: {
          oneOf: [
            {
              type: 'object',
              required: [
                'membershipId',
                'tenantId',
                'tenantSlug',
                'tenantDisplayName',
              ],
              properties: {
                membershipId: { type: 'string', format: 'uuid' },
                tenantId: { type: 'string', format: 'uuid' },
                tenantSlug: { type: 'string' },
                tenantDisplayName: { type: 'string' },
              },
            },
            { type: 'null' },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  async getContext(@Req() req: Request): Promise<ContextResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.contextService.loadContext(cookieValue);
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /**
   * PUT /api/v1/context/tenant
   *
   * Select a TenantMembership as the active context for the current
   * session.
   *
   * Requires:
   * - a valid authenticated session (cookie);
   * - an exact allowed Origin;
   * - a valid `X-CSRF-Token` header.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for missing/disallowed Origin, missing/invalid CSRF,
   * or a forbidden selection (the membership does not exist, belongs
   * to a different user, is suspended, or belongs to a suspended
   * Tenant). All forbidden-selection cases return the same generic
   * 403; the response does not reveal which condition failed.
   */
  @Put('tenant')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Select a TenantMembership as the active context',
  })
  @ApiHeader({
    name: 'X-CSRF-Token',
    description: 'CSRF token issued by GET /api/v1/auth/csrf.',
    required: true,
  })
  @ApiBody({
    description: 'The membership to select.',
    schema: {
      type: 'object',
      required: ['membershipId'],
      properties: {
        membershipId: { type: 'string', format: 'uuid' },
      },
      additionalProperties: false,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'The updated context response.',
    schema: {
      type: 'object',
      required: ['options', 'active'],
      properties: {
        options: { type: 'array', items: { type: 'object' } },
        active: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Origin is disallowed, CSRF is missing/invalid, or the selection is forbidden.',
  })
  async selectTenantContext(
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<ContextResponse> {
    // Verify Origin FIRST, before any other processing. A missing or
    // disallowed Origin returns a generic 403 that does not reveal
    // whether the session is valid.
    const origin = req.headers['origin'];
    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    if (!this.authService.isOriginAllowed(origin, webOrigin)) {
      throw originDisallowed();
    }

    // Validate the request body through the shared Zod contract.
    const parsed = SelectTenantContextRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw contextRequestInvalid();
    }
    const request: SelectTenantContextRequest = parsed.data;

    // Authenticate the session.
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    // We need the session ID for CSRF verification. Re-validate the
    // session through the auth service to get the session record.
    const authResult = await this.authService.getSessionFromCookie(cookieValue);
    if (authResult === null) {
      throw sessionRequired();
    }

    // Verify the CSRF token.
    const csrfToken = readHeader(req, CSRF_HEADER_NAME);
    if (!csrfToken || csrfToken.length === 0) {
      throw csrfInvalid();
    }
    const csrfOk = this.csrfService.verify(authResult.session.id, csrfToken);
    if (!csrfOk) {
      throw csrfInvalid();
    }

    // Delegate to the service for the business rule (membership
    // validity) and the persistence (set active membership).
    const result = await this.contextService.selectContext(
      cookieValue,
      request.membershipId as TenantMembershipId,
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /**
   * DELETE /api/v1/context/tenant
   *
   * Clear the active context for the current session.
   *
   * Requires:
   * - a valid authenticated session (cookie);
   * - an exact allowed Origin;
   * - a valid `X-CSRF-Token` header.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for missing/disallowed Origin or missing/invalid CSRF.
   * Returns 200 with `{ ok: true, active: null }` on success.
   */
  @Delete('tenant')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Clear the active Tenant context for the current session',
  })
  @ApiHeader({
    name: 'X-CSRF-Token',
    description: 'CSRF token issued by GET /api/v1/auth/csrf.',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The clear response.',
    schema: {
      type: 'object',
      required: ['ok', 'active'],
      properties: {
        ok: { type: 'boolean', enum: [true] },
        active: { type: 'null' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description: 'Origin is disallowed or CSRF is missing/invalid.',
  })
  async clearTenantContext(
    @Req() req: Request,
  ): Promise<ClearTenantContextResponse> {
    // Verify Origin FIRST.
    const origin = req.headers['origin'];
    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    if (!this.authService.isOriginAllowed(origin, webOrigin)) {
      throw originDisallowed();
    }

    // Authenticate the session.
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const authResult = await this.authService.getSessionFromCookie(cookieValue);
    if (authResult === null) {
      throw sessionRequired();
    }

    // Verify the CSRF token.
    const csrfToken = readHeader(req, CSRF_HEADER_NAME);
    if (!csrfToken || csrfToken.length === 0) {
      throw csrfInvalid();
    }
    const csrfOk = this.csrfService.verify(authResult.session.id, csrfToken);
    if (!csrfOk) {
      throw csrfInvalid();
    }

    // Delegate to the service for the persistence (clear active
    // membership).
    const result = await this.contextService.clearContext(cookieValue);
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }
}

/**
 * Read a cookie value from the request. Returns `undefined` if the
 * cookie is not present.
 *
 * This helper duplicates the auth controller's `readCookie` function
 * rather than importing it, because the auth controller's helpers
 * are not exported. The duplication is minimal (a 15-line function)
 * and keeps the session-context module self-contained. If the
 * helper grows in complexity, it should be extracted into a shared
 * `apps/api/src/common/` utility.
 */
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

/**
 * Read a header value from the request. Returns `undefined` if the
 * header is not present.
 */
function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
