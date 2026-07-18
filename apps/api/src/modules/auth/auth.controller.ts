import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  LoginRequestSchema,
  type LoginRequest,
  type SessionResponse,
  type CsrfResponse,
  type LogoutResponse,
} from '@ibn-hayan/contracts';
import { AuthService } from './auth.service.js';
import {
  SESSION_COOKIE_NAME,
  CSRF_HEADER_NAME,
  LOGIN_THROTTLE_DEFAULT_LIMIT,
  LOGIN_THROTTLE_DEFAULT_TTL_MS,
} from './auth.constants.js';
import {
  buildSessionCookieOptions,
  buildSessionCookieClearOptions,
} from './auth.cookies.js';
import { invalidCredentials, sessionRequired } from './auth.errors.js';

/**
 * Authentication controller.
 *
 * Exposes four routes under `/api/v1/auth`:
 *
 * - `POST /login` — validate credentials, create a session, set the
 *   HttpOnly cookie, return the session response.
 * - `GET /session` — validate the cookie, touch or rotate the
 *   session, return the session response.
 * - `GET /csrf` — issue a CSRF token for an authenticated session.
 * - `POST /logout` — verify Origin + CSRF, revoke the session, clear
 *   the cookie.
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. The `login` route returns the same generic 401 for unknown
 * email, wrong password, disabled user, and no active membership.
 *
 * Per ADR-013 §1.1, throttling is applied to the login endpoint via
 * `@nestjs/throttler`. The `@Throttle` decorator sets the limit per
 * IP per TTL window.
 *
 * Per ADR-013 §1.1, the session cookie is HttpOnly (not readable by
 * JavaScript), Secure in production, SameSite=Lax, Path=/. The raw
 * session token is NEVER returned in a JSON response.
 *
 * Per ADR-013 §1.1, CSRF protection is mandatory for state-changing
 * browser requests. The `logout` route verifies the `Origin` header
 * and the `X-CSRF-Token` header.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /api/v1/auth/login
   *
   * Validate credentials, create a session, set the HttpOnly cookie,
   * return the session response.
   *
   * Per the fourth canonical batch security requirement, the Origin
   * header is required and must exactly match a configured
   * `WEB_ORIGIN`. Missing or disallowed Origin returns a generic 403
   * that does not reveal whether an account exists. The Origin check
   * runs BEFORE any credential lookup.
   *
   * Throttled per IP. Returns 401 for unknown email, wrong password,
   * disabled user, or no active membership — all with the same
   * generic error shape.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: LOGIN_THROTTLE_DEFAULT_LIMIT,
      ttl: LOGIN_THROTTLE_DEFAULT_TTL_MS,
    },
  })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({
    description: 'Login credentials',
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', maxLength: 320 },
        password: {
          type: 'string',
          minLength: 12,
          maxLength: 128,
          writeOnly: true,
        },
      },
      additionalProperties: false,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login succeeded; session cookie set.',
    schema: {
      type: 'object',
      required: ['user', 'memberships', 'activeTenantContext', 'expiresAt'],
      properties: {
        user: {
          type: 'object',
          required: ['id', 'email', 'displayName', 'status'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
            status: { type: 'string', enum: ['active', 'disabled'] },
          },
        },
        memberships: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'tenantId',
              'tenantSlug',
              'tenantDisplayName',
              'status',
            ],
            properties: {
              id: { type: 'string', format: 'uuid' },
              tenantId: { type: 'string', format: 'uuid' },
              tenantSlug: { type: 'string' },
              tenantDisplayName: { type: 'string' },
              status: { type: 'string', enum: ['active', 'suspended'] },
            },
          },
        },
        activeTenantContext: {
          description:
            'The session active Tenant context. Always null at login because a fresh session has no selected context.',
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
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password (generic — does not reveal which).',
  })
  @ApiResponse({
    status: 403,
    description:
      'Origin header is missing or does not match a configured WEB_ORIGIN.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts; throttled.',
  })
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    // Validate the request body through the shared Zod contract.
    const parsed = LoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      // A validation failure could leak whether the email exists if
      // we returned the validation error details. Return the generic
      // 401 instead. The contract schema rejects malformed emails
      // and too-short passwords before we even look up the user.
      throw invalidCredentials();
    }
    const request: LoginRequest = parsed.data;

    // Read the Origin header and the configured WEB_ORIGIN. The auth
    // service verifies Origin BEFORE any credential lookup so that the
    // response does not reveal whether an account exists.
    const origin = req.headers['origin'];
    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';

    const result = await this.auth.login({
      email: request.email,
      password: request.password,
      origin,
      webOrigin,
    });

    // Set the HttpOnly cookie with the raw session token.
    const isProduction = process.env['NODE_ENV'] === 'production';
    const maxAge = result.expiresAt.getTime() - Date.now();
    res.cookie(
      SESSION_COOKIE_NAME,
      result.rawToken,
      buildSessionCookieOptions(isProduction, maxAge),
    );

    // Build and return the session response. The raw token is NEVER
    // included in the JSON body.
    //
    // Per the fifth canonical batch specification, a fresh login has
    // no selected context — `activeTenantContext` is `null`. The
    // user must explicitly select a Tenant through
    // PUT /api/v1/context/tenant after login.
    return this.auth.buildSessionResponse({
      user: result.user,
      memberships: result.memberships,
      expiresAt: result.expiresAt,
      activeTenantMembershipId: null,
    });
  }

  /**
   * GET /api/v1/auth/session
   *
   * Validate the cookie, touch or rotate the session, return the
   * session response.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions, or if
   * the user is disabled or has no active memberships.
   *
   * If the session was rotated during this validation, the new cookie
   * is set before the response is returned.
   */
  @Get('session')
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Validate the session cookie and return session metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'Session is valid.',
    schema: {
      type: 'object',
      required: ['user', 'memberships', 'activeTenantContext', 'expiresAt'],
      properties: {
        user: { type: 'object' },
        memberships: { type: 'array', items: { type: 'object' } },
        activeTenantContext: {
          description:
            'The session active Tenant context, or null when no context is selected or when the previously selected context is no longer valid.',
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
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  async getSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.auth.getSessionFromCookie(cookieValue);
    if (result === null) {
      throw sessionRequired();
    }

    // If the session was rotated, set the new cookie.
    if (result.rotatedRawToken !== null) {
      const isProduction = process.env['NODE_ENV'] === 'production';
      const maxAge = result.expiresAt.getTime() - Date.now();
      res.cookie(
        SESSION_COOKIE_NAME,
        result.rotatedRawToken,
        buildSessionCookieOptions(isProduction, maxAge),
      );
    }

    return this.auth.buildSessionResponse({
      user: result.user,
      memberships: result.memberships,
      expiresAt: result.expiresAt,
      activeTenantMembershipId: result.session.activeTenantMembershipId,
    });
  }

  /**
   * GET /api/v1/auth/csrf
   *
   * Issue a CSRF token for an authenticated session. Returns the raw
   * token in the JSON body. The server stores only the SHA-256 hash.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   */
  @Get('csrf')
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Issue a CSRF token for the authenticated session',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token issued.',
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', minLength: 32 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  async getCsrfToken(@Req() req: Request): Promise<CsrfResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.auth.getSessionFromCookie(cookieValue);
    if (result === null) {
      throw sessionRequired();
    }
    const token = this.auth.issueCsrfToken(result.session.id);
    return { token };
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Verify Origin + CSRF, revoke the session, clear the cookie.
   *
   * Returns 403 for disallowed Origin or missing/invalid CSRF token.
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 200 with `{ ok: true }` on success.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Revoke the session and clear the cookie' })
  @ApiResponse({
    status: 200,
    description: 'Logout succeeded.',
    schema: {
      type: 'object',
      required: ['ok'],
      properties: { ok: { type: 'boolean', enum: [true] } },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description: 'CSRF token is missing or invalid, or Origin is disallowed.',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponse> {
    const origin = req.headers['origin'];
    const csrfToken = readHeader(req, CSRF_HEADER_NAME);
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);

    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';

    await this.auth.logout({
      cookieValue,
      origin,
      csrfToken,
      webOrigin,
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

/**
 * Read a cookie value from the request. Returns `undefined` if the
 * cookie is not present.
 *
 * Express's `req.headers.cookie` is a string like
 * `name1=value1; name2=value2`. We parse it manually rather than
 * using a cookie-parser middleware to keep the auth module's
 * dependencies minimal and to avoid parsing cookies for non-auth
 * routes.
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
 *
 * Express's `req.headers[name]` is `string | string[] | undefined`.
 * For the CSRF header, we expect a single string value.
 */
function readHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
