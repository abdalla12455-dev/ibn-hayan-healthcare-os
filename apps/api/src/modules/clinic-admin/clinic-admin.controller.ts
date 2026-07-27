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
import type { ClinicAdminOverviewResponse } from '@ibn-hayan/contracts';
import { ClinicAdminOverviewService } from './clinic-admin-overview.service.js';

/**
 * Clinic Admin Overview controller.
 *
 * Mounts the Clinic Administrator Overview surface at
 * `/api/v1/clinic-admin/overview` (per
 * `download/docs/05_UI_UX/DESIGN_BIBLE.md` §12 Arabic RTL and §13
 * English LTR, and per the live-data task specification Phase 5).
 *
 * The controller is a thin transport layer. It:
 * - Applies the `AuthorizationGuard` to the route.
 * - Declares the required permission
 *   `clinic_admin_overview:view` via `@RequirePermission(...)`. The
 *   permission is granted ONLY to `R09_ADMINISTRATOR` (per
 *   `packages/domain/src/authorization/role-permissions.ts`).
 * - Reads the session cookie and delegates to
 *   {@link ClinicAdminOverviewService.loadOverview} for the response
 *   payload.
 * - Returns 401 when the session is missing, expired, or revoked.
 * - Returns 403 when the active context (tenant, organisation, or
 *   facility) is missing or invalid, OR when the principal's roles
 *   do not grant the required permission.
 *
 * Per the live-data task specification Phase 5, the controller does
 * NOT accept tenant, organisation, or facility scope from the
 * request body or query string. All context is derived from the
 * authenticated session by the service.
 *
 * Per the live-data task specification Phase 7, the controller does
 * NOT reveal:
 * - whether the session exists for another user;
 * - whether the user holds roles in another tenant;
 * - the specific authorisation failure reason;
 * - any internal stack trace or environment detail.
 *
 * Every authorisation failure returns the same generic
 * `AUTHORIZATION_FORBIDDEN` (or `CLINIC_ADMIN_OVERVIEW_CONTEXT_REQUIRED`)
 * code with a non-revealing message.
 *
 * Audit trail: the controller does NOT emit an audit event itself.
 * The audit trail for the endpoint is provided by TWO events:
 * 1. The `AuthorizationGuard`'s `authorization.decision.allowed` event
 *    (category `authorization`), emitted for every authorized request
 *    with `permissionCode='clinic_admin_overview:view'`, the endpoint
 *    path, the HTTP method, the actor, the session, the tenant, and
 *    the role codes. This event proves the request was authorized.
 * 2. The service's `clinic_admin.overview.viewed` event (category
 *    `facility_context`, mapped from the `clinic_admin.` prefix — see
 *    `packages/observability/src/audit/action-codes.ts`
 *    `inferCategoryFromAction`), emitted AFTER the Overview operation
 *    completes successfully. This event proves the service returned a
 *    response. The `facility_context` category IS accepted by the
 *    `audit_events_category_check` CHECK constraint — no migration is
 *    required.
 *
 * This two-event pattern matches the established repository convention
 * for read-only endpoints (cf. the session-context module's
 * `tenant_context.viewed` event). See
 * `packages/observability/src/audit/categories.ts` for the full
 * rationale on the category mapping.
 */
@ApiTags('clinic-admin')
@Controller('clinic-admin')
@UseGuards(AuthorizationGuard)
export class ClinicAdminController {
  constructor(private readonly overviewService: ClinicAdminOverviewService) {}

  /**
   * GET /api/v1/clinic-admin/overview
   *
   * Return the Clinic Administrator Overview payload for the
   * authenticated session's active tenant, organisation, and
   * facility context.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for missing/invalid active context, OR for
   * principals whose roles do not grant `clinic_admin_overview:view`
   * (i.e. any role other than R09_ADMINISTRATOR).
   *
   * Per the live-data task specification Phase 5, the endpoint does
   * NOT accept tenant, organisation, or facility identifiers from
   * the request body or query string.
   */
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('clinic_admin_overview:view', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Load the Clinic Administrator Overview for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The Clinic Administrator Overview payload. The response carries the active context identity (display names only, no UUIDs), the authenticated administrator display name, the availability declaration for each approved region, and the server-side generation timestamp. Business metrics are NOT included in this batch because the underlying domain models do not yet exist; each business region declares availability "not_supported" or "navigational_only" so the frontend can render the approved visual regions in their honest "not yet configured" state.',
    schema: {
      type: 'object',
      required: ['activeContext', 'administrator', 'regions', 'generatedAt'],
      properties: {
        activeContext: {
          type: 'object',
          required: [
            'tenantDisplayName',
            'organisationDisplayName',
            'facilityDisplayName',
          ],
          properties: {
            tenantDisplayName: { type: 'string' },
            organisationDisplayName: { type: 'string' },
            facilityDisplayName: { type: 'string' },
          },
        },
        administrator: {
          type: 'object',
          required: ['displayName'],
          properties: {
            displayName: { type: 'string' },
          },
        },
        regions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['key', 'availability'],
            properties: {
              key: {
                type: 'string',
                enum: [
                  'appointment_actions',
                  'financial_snapshot',
                  'todays_appointments',
                  'operational_alerts',
                  'inventory_alerts',
                  'doctors_on_duty',
                  'waiting_room_operations',
                  'staff_attendance_summary',
                  'quick_actions',
                ],
              },
              availability: {
                type: 'string',
                enum: [
                  'supported',
                  'not_supported',
                  'navigational_only',
                  'no_data',
                  'partially_unavailable',
                ],
              },
            },
          },
        },
        generatedAt: { type: 'string', format: 'date-time' },
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
      'Authorisation denied (principal does not hold the clinic_admin_overview:view permission, OR the active tenant/organisation/facility context is missing or invalid).',
  })
  async getOverview(@Req() req: Request): Promise<ClinicAdminOverviewResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.overviewService.loadOverview(
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
