import {
  Controller,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthorizationGuard } from '../authorization/authorization.guard.js';
import { RequirePermission } from '../authorization/require-permission.decorator.js';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants.js';
import { sessionRequired } from '../auth/auth.errors.js';
import type { AuditRequestContext } from '../auth/auth.service.js';
import type { TodayAppointmentsResponse } from '@ibn-hayan/contracts';
import { AppointmentsTodayService } from './appointments-today.service.js';

/**
 * Appointments controller.
 *
 * Mounts the "Today's Appointments" endpoint at
 * `GET /api/v1/appointments/today`.
 *
 * The controller is a thin transport layer. It:
 * - Applies the `AuthorizationGuard` to the route.
 * - Declares the required permission `appointments:view` via
 *   `@RequirePermission(...)`. The permission is granted ONLY to
 *   `R09_ADMINISTRATOR` (per
 *   `packages/domain/src/authorization/role-permissions.ts`).
 * - Reads the session cookie and delegates to
 *   {@link AppointmentsTodayService.loadTodayAppointments} for the
 *   response payload.
 * - Returns 401 when the session is missing, expired, or revoked.
 * - Returns 403 when the active context is missing/invalid or when
 *   the principal's roles do not grant `appointments:view`.
 * - Returns 422 when the facility timezone is not configured.
 *
 * Per the Stage 1B implementation specification, the endpoint does
 * NOT accept tenant, organisation, or facility scope from the request
 * body or query string. All context is derived from the authenticated
 * session.
 *
 * Audit trail: the controller does NOT emit an audit event itself.
 * The audit trail for the endpoint is provided by TWO events:
 * 1. The `AuthorizationGuard`'s `authorization.decision.allowed` event
 *    (category `authorization`), emitted for every authorized request
 *    with `permissionCode='appointments:view'`, the endpoint path,
 *    the HTTP method, the actor, the session, the tenant, and the
 *    role codes. This event proves the request was authorized.
 * 2. The service's `appointments.schedule.viewed` event (category
 *    `facility_context`), emitted AFTER the appointments query
 *    completes successfully. This event proves the service returned
 *    a response.
 */
@ApiTags('appointments')
@Controller('appointments')
@UseGuards(AuthorizationGuard)
export class AppointmentsController {
  constructor(private readonly todayService: AppointmentsTodayService) {}

  /**
   * GET /api/v1/appointments/today
   *
   * Return the "Today's Appointments" response for the authenticated
   * session's active tenant, organisation, and facility context.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for missing/invalid active context, OR for
   * principals whose roles do not grant `appointments:view`
   * (i.e. any role other than R09_ADMINISTRATOR).
   * Returns 422 when the facility timezone is not configured.
   *
   * Per the Stage 1B implementation specification, the endpoint does
   * NOT accept tenant, organisation, or facility identifiers from
   * the request body or query string.
   */
  @Get('today')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:view', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      "Load Today's Appointments for the active tenant, organisation, and facility context",
  })
  @ApiResponse({
    status: 200,
    description:
      "The Today's Appointments response containing the facility-local date, timezone, generation timestamp, and the list of appointments scheduled to begin on that day. Ordered by scheduledStart ascending, with id ascending as tie-breaker.",
    schema: {
      type: 'object',
      required: ['localDate', 'timezone', 'generatedAt', 'appointments'],
      properties: {
        localDate: {
          type: 'string',
          description:
            "The facility-local calendar date (e.g. '2026-08-01'). Format: YYYY-MM-DD.",
        },
        timezone: {
          type: 'string',
          description:
            "The facility's configured IANA timezone identifier (e.g. 'Asia/Baghdad').",
        },
        generatedAt: {
          type: 'string',
          format: 'date-time',
          description:
            'The server-side ISO 8601 timestamp at which the response was generated.',
        },
        appointments: {
          type: 'array',
          description:
            'The list of appointments scheduled to begin on the local date.',
          items: {
            type: 'object',
            required: [
              'id',
              'patientId',
              'providerId',
              'scheduledStart',
              'scheduledEnd',
              'status',
              'typeCode',
            ],
            properties: {
              id: { type: 'string', format: 'uuid' },
              patientId: { type: 'string', format: 'uuid' },
              providerId: { type: 'string', format: 'uuid' },
              scheduledStart: { type: 'string', format: 'date-time' },
              scheduledEnd: { type: 'string', format: 'date-time' },
              status: {
                type: 'string',
                enum: [
                  'booked',
                  'confirmed',
                  'arrived',
                  'in_progress',
                  'completed',
                  'cancelled',
                  'no_show',
                ],
              },
              typeCode: { type: 'string', minLength: 1, maxLength: 80 },
            },
          },
        },
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
      'Authorisation denied (principal does not hold the appointments:view permission, OR the active tenant/organisation/facility context is missing or invalid).',
  })
  @ApiResponse({
    status: 422,
    description:
      'The facility timezone is not configured. The facility must have a valid IANA timezone identifier set.',
  })
  async getTodayAppointments(
    @Req() req: Request,
  ): Promise<TodayAppointmentsResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.todayService.loadTodayAppointments(
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Transport helpers (duplicated from auth.controller.ts because the
// auth controller's helpers are not exported).
// ---------------------------------------------------------------------------

/**
 * Read a cookie value from the request. Returns `undefined` if the
 * cookie is not present.
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
 * Build the audit request context from the Express request. Mirrors
 * the helper in `apps/api/src/modules/auth/auth.controller.ts`.
 */
function buildAuditContext(req: Request): AuditRequestContext {
  const requestId =
    (req as { requestId?: string }).requestId ??
    '00000000-0000-0000-0000-000000000000';
  const correlationId =
    (req as { correlationId?: string }).correlationId ?? null;
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
