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
  RescheduleAppointmentResponse,
  AppointmentVisitLifecycleResponse,
} from '@ibn-hayan/contracts';
import { AppointmentsTodayService } from './appointments-today.service.js';
import { AppointmentsBookingService } from './appointments-booking.service.js';
import { AppointmentsCancellationService } from './appointments-cancellation.service.js';
import { AppointmentsReschedulingService } from './appointments-rescheduling.service.js';
import { AppointmentsVisitLifecycleService } from './appointments-visit-lifecycle.service.js';
import { AppointmentsDetailService } from './appointments-detail.service.js';
import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';
import { appointmentValidationError } from './appointments.errors.js';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Shared OpenAPI response schema for the four Stage 1F visit-lifecycle
 * endpoints (confirm, check-in, start, complete). All four return the
 * same appointment shape with a status reflecting the transition's
 * target state.
 */
const visitLifecycleResponseSchema = {
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
};

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
    private readonly reschedulingService: AppointmentsReschedulingService,
    private readonly visitLifecycleService: AppointmentsVisitLifecycleService,
    private readonly detailService: AppointmentsDetailService,
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
   * GET /api/v1/appointments/:id
   *
   * Explicit appointment-detail read surface that exposes the persisted
   * `noShowReason`. Guarded by `appointments:no_show_reason_read`
   * (granted to R06, R07, R09; denied to R01, R02, R13). Broad
   * today/list/book/cancel/reschedule/visit-lifecycle projections
   * continue to exclude `noShowReason`.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 when roles do not grant `appointments:no_show_reason_read`
   * or the active context is missing/invalid.
   * Returns 404 when the appointment is not found within the
   * authenticated tenant/organisation/facility scope (no existence leak).
   *
   * Declared after the literal route `GET /today` so that `/today`
   * resolves before this `:id` parameter route.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:no_show_reason_read', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Read appointment detail (explicitly authorized no-show reason surface)',
  })
  @ApiResponse({
    status: 200,
    description:
      'The appointment detail, including `noShowReason` (persisted or null).',
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description: 'Appointment not found in the authenticated scope.',
  })
  async getAppointmentDetail(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<import('@ibn-hayan/contracts').AppointmentDetailResponse> {
    if (!isUuid(id)) {
      throw appointmentValidationError('The appointment id must be a UUID.');
    }
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.detailService.loadDetail(
      id,
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

  /**
   * POST /api/v1/appointments/:id/reschedule
   *
   * Reschedule an existing appointment to a new slot for the
   * authenticated session's active tenant, organisation, and facility
   * context.
   *
   * The request body contains ONLY the replacement slot
   * (scheduledStart, scheduledEnd) and the reschedule reason. All scope
   * (tenantId, organisationId, facilityId) is derived from the
   * authenticated session. The replacement appointment inherits
   * patientId, providerId, typeCode, tenantId, organisationId, and
   * facilityId from the original appointment; the caller cannot
   * override these. The caller cannot supply an arbitrary status; the
   * transition is always `booked → cancelled` (original) plus a new
   * `booked` replacement.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `appointments:reschedule` (only R06 Receptionist, R07 Scheduler,
   * and R09 Clinic Administrator), or when the active context is
   * missing or invalid.
   * Returns 400 for an invalid request body (missing/too-long reason,
   * end not after start, invalid timestamp format).
   * Returns 404 when the original appointment does not exist or is not
   * accessible in the authenticated scope (no cross-scope existence
   * leak).
   * Returns 422 when the original appointment is in a source state that
   * is not canonically reschedulable in this stage (only `booked` is
   * reschedulable), when the replacement slot is in the past, or when
   * the replacement slot overlaps an existing blocking appointment.
   *
   * Atomicity: the reschedule is performed within a single SERIALIZABLE
   * transaction. A failed replacement creation (overlap, serialization
   * conflict after bounded retries, database error) leaves the original
   * appointment unchanged and no replacement exists.
   *
   * Per the Stage 1E implementation specification, the endpoint does
   * NOT accept tenant, organisation, facility, status, patient,
   * provider, or type identifiers from the request body.
   */
  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:reschedule', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Reschedule an existing appointment to a new slot for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The replacement appointment. The original appointment is transitioned to "cancelled" and a new replacement is created as "booked". The appointments.rescheduled audit event is emitted exactly once on success.',
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
    description:
      'Invalid request body (e.g. missing/too-long reason, end not after start).',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authorisation denied (principal does not hold the appointments:reschedule permission, OR the active context is missing or invalid).',
  })
  @ApiResponse({
    status: 404,
    description:
      'The appointment was not found or is not accessible in the current context (no cross-scope existence leak).',
  })
  @ApiResponse({
    status: 422,
    description:
      'The appointment cannot be rescheduled from its current state, the replacement slot is in the past, or the replacement slot overlaps an existing appointment.',
  })
  async rescheduleAppointment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<RescheduleAppointmentResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);

    // Parse and validate the request body using Zod
    const { RescheduleAppointmentRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = RescheduleAppointmentRequestSchema.safeParse(body);

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

    const result = await this.reschedulingService.rescheduleAppointment(
      id,
      parseResult.data,
      cookieValue,
      buildAuditContext(req),
    );

    if (result === null) {
      throw sessionRequired();
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Stage 1F — Visit Lifecycle (confirm, check-in, start, complete)
  // -------------------------------------------------------------------------
  //
  // The four visit-lifecycle commands accept NO request body. All scope
  // (tenantId, organisationId, facilityId) is derived from the
  // authenticated session. The caller cannot supply an arbitrary
  // target status; each endpoint fixes its canonical transition.
  //
  // A shared response schema and Swagger definition is used for all
  // four endpoints via the visitLifecycleResponse() helper.

  /**
   * POST /api/v1/appointments/:id/confirm
   *
   * Confirm an appointment (`booked` → `confirmed`).
   *
   * Authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
   * Administrator (operational pre-arrival action; permission
   * `appointments:confirm`).
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `appointments:confirm`, or when the active context is missing.
   * Returns 404 when the appointment does not exist or is not
   * accessible in the authenticated scope (no cross-scope leak).
   * Returns 422 when the appointment is not in the `booked` state
   * (confirming an already-confirmed appointment is an invalid
   * transition, NOT idempotent success — `confirmed` is reversible,
   * not terminal).
   */
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:confirm', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Confirm an appointment (booked → confirmed) for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The confirmed appointment. The appointments.confirmed audit event is emitted exactly once on a first-time transition.',
    schema: visitLifecycleResponseSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Appointment not found or not accessible in the current context.',
  })
  @ApiResponse({
    status: 422,
    description: 'The appointment cannot be confirmed from its current state.',
  })
  async confirmAppointment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AppointmentVisitLifecycleResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { VisitLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = VisitLifecycleRequestBodySchema.safeParse(body);
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
    const result = await this.visitLifecycleService.confirmAppointment(
      id,
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /**
   * POST /api/v1/appointments/:id/check-in
   *
   * Check a patient in (`booked` | `confirmed` → `arrived`).
   *
   * Authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
   * Administrator (operational arrival action; permission
   * `appointments:check_in`). Per STATUS_CODES.md §4.1, both
   * `booked` (direct check-in) and `confirmed` are canonically
   * permitted source states.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `appointments:check_in`, or when the active context is missing.
   * Returns 404 when the appointment does not exist or is not
   * accessible in the authenticated scope (no cross-scope leak).
   * Returns 422 when the appointment is not in `booked` or
   * `confirmed` (checking in an already-arrived appointment is an
   * invalid transition — `arrived` is reversible, not terminal).
   */
  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:check_in', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Check a patient in (booked|confirmed → arrived) for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The checked-in appointment. The appointments.checked_in audit event is emitted exactly once on a first-time transition.',
    schema: visitLifecycleResponseSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Appointment not found or not accessible in the current context.',
  })
  @ApiResponse({
    status: 422,
    description: 'The appointment cannot be checked in from its current state.',
  })
  async checkInAppointment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AppointmentVisitLifecycleResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { VisitLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = VisitLifecycleRequestBodySchema.safeParse(body);
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
    const result = await this.visitLifecycleService.checkInAppointment(
      id,
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /**
   * POST /api/v1/appointments/:id/start
   *
   * Start a visit (`arrived` → `in_progress`).
   *
   * Authorized for R01 Physician only (clinical visit-progression
   * action; permission `appointments:start`). Per STATUS_CODES.md
   * §4.1, InProgress means "Patient is being seen by the practitioner".
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `appointments:start` (R01 Physician only), or when the active
   * context is missing.
   * Returns 404 when the appointment does not exist or is not
   * accessible in the authenticated scope (no cross-scope leak).
   * Returns 422 when the appointment is not in `arrived` (starting
   * an already-in-progress appointment is an invalid transition —
   * `in_progress` is reversible, not terminal).
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:start', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Start a visit (arrived → in_progress) for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The in-progress appointment. The appointments.started audit event is emitted exactly once on a first-time transition.',
    schema: visitLifecycleResponseSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Appointment not found or not accessible in the current context.',
  })
  @ApiResponse({
    status: 422,
    description: 'The appointment cannot be started from its current state.',
  })
  async startAppointment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AppointmentVisitLifecycleResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { VisitLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = VisitLifecycleRequestBodySchema.safeParse(body);
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
    const result = await this.visitLifecycleService.startAppointment(
      id,
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /**
   * POST /api/v1/appointments/:id/complete
   *
   * Complete a visit (`in_progress` → `completed`).
   *
   * Authorized for R01 Physician only (clinical visit-progression
   * action; permission `appointments:complete`). `completed` is a
   * canonical terminal state. Re-completing an already-completed
   * appointment is an idempotent no-op (no mutation, no duplicate
   * audit event), mirroring the cancellation idempotency for the
   * terminal `cancelled` state.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `appointments:complete` (R01 Physician only), or when the active
   * context is missing.
   * Returns 404 when the appointment does not exist or is not
   * accessible in the authenticated scope (no cross-scope leak).
   * Returns 422 when the appointment is not in `in_progress` (an
   * already-completed appointment returns idempotent success 200,
   * NOT this error).
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:complete', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Complete a visit (in_progress → completed) for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The completed appointment. The appointments.completed audit event is emitted exactly once on a first-time transition. An idempotent re-completion returns success without a duplicate audit event.',
    schema: visitLifecycleResponseSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Appointment not found or not accessible in the current context.',
  })
  @ApiResponse({
    status: 422,
    description: 'The appointment cannot be completed from its current state.',
  })
  async completeAppointment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AppointmentVisitLifecycleResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { VisitLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = VisitLifecycleRequestBodySchema.safeParse(body);
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
    const result = await this.visitLifecycleService.completeAppointment(
      id,
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /**
   * POST /api/v1/appointments/:id/no-show
   *
   * Mark an appointment as a no-show (`confirmed` | `arrived` →
   * `no_show`).
   *
   * Authorized for R06 Receptionist, R07 Clinic Coordinator, and R09
   * Clinic Administrator (clinic-booking roles; permission
   * `appointments:no_show`). Per STATUS_CODES.md §4.1, NoShow is a
   * terminal state. Per APPOINTMENTS.md §7.1, no-show recording is
   * "a manual action by reception or clinical staff" and is audited.
   *
   * Re-marking an already-no_show appointment is an idempotent no-op
   * (no mutation, no duplicate audit event), mirroring the terminal
   * idempotency for `completed` and `cancelled`.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `appointments:no_show` (R01 Physician and R13 Platform/System
   * Administrator are denied), or when the active context is missing.
   * Returns 404 when the appointment does not exist or is not
   * accessible in the authenticated scope (no cross-scope leak).
   * Returns 422 when the appointment is not in `confirmed` or
   * `arrived` (an already-no_show appointment returns idempotent
   * success 200, NOT this error).
   */
  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('appointments:no_show', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Mark an appointment as a no-show (confirmed|arrived → no_show) for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The no-show appointment. The appointments.no_show_recorded audit event is emitted exactly once on a first-time transition. An idempotent re-marking returns success without a duplicate audit event.',
    schema: visitLifecycleResponseSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Appointment not found or not accessible in the current context.',
  })
  @ApiResponse({
    status: 422,
    description:
      'The appointment cannot be marked as a no-show from its current state.',
  })
  async markNoShow(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AppointmentVisitLifecycleResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { NoShowAppointmentRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = NoShowAppointmentRequestSchema.safeParse(body);
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
    const result = await this.visitLifecycleService.markNoShow(
      id,
      cookieValue,
      buildAuditContext(req),
      parseResult.data.reason,
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }
}
