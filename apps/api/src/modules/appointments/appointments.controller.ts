import {
  Controller,
  Get,
  Post,
  Req,
  Body,
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
import { Param } from '@nestjs/common';
import { AuthorizationGuard } from '../authorization/authorization.guard.js';
import { RequirePermission } from '../authorization/require-permission.decorator.js';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants.js';
import { sessionRequired } from '../auth/auth.errors.js';
import type {
  TodayAppointmentsResponse,
  BookAppointmentResponse,
  CancelAppointmentResponse,
} from '@ibn-hayan/contracts';
import { AppointmentsTodayService } from './appointments-today.service.js';
import { AppointmentsBookingService } from './appointments-booking.service.js';
import { AppointmentsCancellationService } from './appointments-cancellation.service.js';
import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';

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
  constructor(
    private readonly todayService: AppointmentsTodayService,
    private readonly bookingService: AppointmentsBookingService,
    private readonly cancellationService: AppointmentsCancellationService,
  ) {}

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

  /**
   * POST /api/v1/appointments
   *
   * Create a new appointment for the authenticated session's active
   * tenant, organisation, and facility context.
   *
   * The request body contains the patient, provider, timing, and type
   * information. All scope (tenantId, organisationId, facilityId) is
   * derived from the authenticated session.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant `appointments:book`
   * (only R06 Receptionist, R07 Scheduler, and R09 Administrator).
   * Returns 400 for invalid timestamps (end not after start) or invalid UUIDs.
   * Returns 422 for past appointment times or overlapping appointment conflicts.
   *
   * NOTE: Patient and provider existence validation is NOT performed in Stage 1C.
   * The patientId and providerId are accepted as logical identifiers. Existence
   * validation will be added when Patient (BC01) and Workforce (BC10) bounded
   * contexts are implemented.
   *
   * Per the Stage 1C implementation specification, the endpoint does NOT
   * accept tenant, organisation, or facility identifiers from the request
   * body.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('appointments:book', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Book a new appointment for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 201,
    description:
      'The created appointment. Returns the appointment with all persisted fields.',
    schema: {
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
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (e.g. end time not after start time).',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authorisation denied (principal does not hold the appointments:book permission).',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable entity: past time or appointment overlap.',
  })
  async bookAppointment(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<BookAppointmentResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);

    // Parse and validate the request body using Zod
    const { BookAppointmentRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = BookAppointmentRequestSchema.safeParse(body);

    if (!parseResult.success) {
      // Return 400 with validation errors
      const { BadRequestException } = await import('@nestjs/common');
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw new BadRequestException({
        error: {
          code: 'APPOINTMENT_VALIDATION_ERROR',
          message: issues || 'Invalid request body',
        },
      });
    }

    const result = await this.bookingService.bookAppointment(
      parseResult.data,
      cookieValue,
      buildAuditContext(req),
    );

    if (result === null) {
      throw sessionRequired();
    }

    return result;
  }

  /**
   * POST /api/v1/appointments/:id/cancel
   *
   * Cancel an existing appointment for the authenticated session's
   * active tenant, organisation, and facility context.
   *
   * The request body contains ONLY the cancellation reason. All scope
   * (tenantId, organisationId, facilityId) is derived from the
   * authenticated session. The caller cannot supply an arbitrary
   * target status; the transition is always `booked → cancelled`.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `appointments:cancel` (only R06 Receptionist, R07 Scheduler, and
   * R09 Clinic Administrator), or when the active context is missing
   * or invalid.
   * Returns 400 for an invalid request body (missing or too-long reason).
   * Returns 404 when the appointment does not exist or is not accessible
   * in the authenticated scope (no cross-scope existence leak).
   * Returns 422 when the appointment is in a source state that is not
   * canonically cancellable in this stage (only `booked` is cancellable).
   *
   * Idempotency: re-cancelling an already-cancelled appointment returns
   * the canonical success response WITHOUT emitting a duplicate audit
   * event.
   *
   * Per the Stage 1D implementation specification, the endpoint does
   * NOT accept tenant, organisation, facility, status, or actor
   * identifiers from the request body.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:cancel', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Cancel an existing appointment for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The cancelled appointment. Returns the appointment with status "cancelled". A first-time cancellation emits the appointments.cancelled audit event exactly once; an idempotent re-cancellation returns success without a duplicate audit event.',
    schema: {
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
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body (e.g. missing or too-long reason).',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authorisation denied (principal does not hold the appointments:cancel permission, OR the active context is missing or invalid).',
  })
  @ApiResponse({
    status: 404,
    description:
      'The appointment was not found or is not accessible in the current context (no cross-scope existence leak).',
  })
  @ApiResponse({
    status: 422,
    description:
      'The appointment cannot be cancelled from its current state (only "booked" is cancellable).',
  })
  async cancelAppointment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<CancelAppointmentResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);

    // Parse and validate the request body using Zod
    const { CancelAppointmentRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = CancelAppointmentRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const { BadRequestException } = await import('@nestjs/common');
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw new BadRequestException({
        error: {
          code: 'APPOINTMENT_VALIDATION_ERROR',
          message: issues || 'Invalid request body',
        },
      });
    }

    const result = await this.cancellationService.cancelAppointment(
      id,
      parseResult.data.reason,
      cookieValue,
      buildAuditContext(req),
    );

    if (result === null) {
      throw sessionRequired();
    }

    return result;
  }
}
