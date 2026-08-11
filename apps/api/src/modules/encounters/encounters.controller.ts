import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
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
import type {
  CreateEncounterResponse,
  EncounterResponse,
} from '@ibn-hayan/contracts';
import { EncountersService } from './encounters.service.js';
import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';
import { encounterValidationError } from './encounters.errors.js';

/**
 * Shared OpenAPI response schema for the encounter endpoints. The
 * encounter response exposes the encounter's logical identifiers,
 * type, status, and priority — NOT scope fields or audit timestamps.
 */
const encounterResponseSchema = {
  type: 'object',
  required: [
    'id',
    'patientId',
    'providerId',
    'appointmentId',
    'encounterType',
    'status',
    'priority',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    patientId: { type: 'string', format: 'uuid' },
    providerId: { type: 'string', format: 'uuid' },
    appointmentId: {
      type: 'string',
      format: 'uuid',
      nullable: true,
    },
    encounterType: {
      type: 'string',
      enum: [
        'outpatient',
        'inpatient',
        'emergency',
        'telehealth',
        'home_health',
        'day_care',
      ],
    },
    status: {
      type: 'string',
      enum: [
        'planned',
        'arrived',
        'in_progress',
        'on_leave',
        'finished',
        'cancelled',
      ],
    },
    priority: {
      type: 'string',
      enum: ['routine', 'urgent', 'emergency'],
    },
  },
};

/**
 * Encounters controller (Stage 2A — BC02 Encounter Foundation).
 *
 * Mounts the encounter endpoints at `/api/v1/encounters`:
 * - `POST /api/v1/encounters` — create an encounter (R01 Physician,
 *   R02 Nurse; `encounters:create`).
 * - `POST /api/v1/encounters/:id/arrive` — arrive an encounter
 *   (R01 Physician, R02 Nurse; `encounters:arrive`).
 * - `POST /api/v1/encounters/:id/start` — start an encounter
 *   (R01 Physician; `encounters:start`).
 * - `POST /api/v1/encounters/:id/on-leave` — put on leave
 *   (R01 Physician; `encounters:on_leave`).
 * - `POST /api/v1/encounters/:id/resume` — resume
 *   (R01 Physician; `encounters:resume`).
 * - `POST /api/v1/encounters/:id/finish` — finish
 *   (R01 Physician; `encounters:finish`).
 * - `POST /api/v1/encounters/:id/cancel` — cancel
 *   (R01 Physician, R02 Nurse; `encounters:cancel`).
 * - `GET /api/v1/encounters/:id` — view
 *   (clinical/operational read roles; `encounters:view`).
 *
 * The controller is a thin transport layer. It applies the
 * `AuthorizationGuard`, declares the required permission via
 * `@RequirePermission(...)`, reads the session cookie, parses the
 * request body with the canonical Zod contract, and delegates to
 * {@link EncountersService}. The client can never override tenant,
 * organisation, facility, status, or actor via the request body.
 *
 * Audit trail: the controller does NOT emit an audit event itself.
 * The audit trail for each command is provided by:
 * 1. The `AuthorizationGuard`'s `authorization.decision.allowed` event
 *    (category `authorization`), emitted for every authorized request.
 * 2. The service's encounter action event (category `facility_context`),
 *    emitted AFTER a successful FIRST-TIME transition. The event is
 *    NOT emitted for validation failure, authorization failure,
 *    consent failure, not-found, invalid transition, or idempotent
 *    no-op.
 */
@ApiTags('encounters')
@Controller('encounters')
@UseGuards(AuthorizationGuard)
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  /**
   * POST /api/v1/encounters
   *
   * Create a new encounter for the authenticated session's active
   * tenant, organisation, and facility context. The encounter is
   * created in the canonical initial `planned` status.
   *
   * The consent gate (operator-ratified product rule) runs at
   * creation. When enforced and the encounter is not an emergency,
   * the encounter is blocked (fail-safe). The emergency carve-out
   * (emergency encounterType or priority with required justification)
   * is the only path through the enforced gate.
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `encounters:create` (R01 Physician, R02 Nurse).
   * Returns 400 for an invalid request body.
   * Returns 422 when the patient/provider/appointment is not
   * accessible in scope, when an encounter already exists for the
   * supplied appointment, or when the consent gate blocks.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('encounters:create', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Create a new encounter for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 201,
    description:
      'The created encounter in the planned status. The encounters.created audit event is emitted exactly once.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or missing emergency justification.',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 422,
    description:
      'Patient/provider/appointment not found in scope, duplicate appointment, or consent gate required.',
  })
  async createEncounter(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<CreateEncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { CreateEncounterRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = CreateEncounterRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw encounterValidationError(issues || 'Invalid request body');
    }
    const result = await this.encountersService.createEncounter(
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
   * GET /api/v1/encounters/:id
   *
   * View a single encounter for the authenticated scope.
   *
   * Authorized for the clinical/operational read roles (permission
   * `encounters:view`). Returns 404 if the encounter does not exist or
   * is not accessible in the authenticated scope (no existence leak).
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('encounters:view', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'View a single encounter for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description: 'The encounter.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Encounter not found or not accessible in the current context.',
  })
  async viewEncounter(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<EncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.encountersService.viewEncounter(
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
   * POST /api/v1/encounters/:id/arrive
   *
   * Arrive an encounter (planned → arrived).
   *
   * Authorized for R01 Physician and R02 Nurse (permission
   * `encounters:arrive`).
   */
  @Post(':id/arrive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('encounters:arrive', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Arrive an encounter (planned → arrived)' })
  @ApiResponse({
    status: 200,
    description: 'The arrived encounter.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Encounter not found in scope.' })
  @ApiResponse({
    status: 422,
    description: 'The encounter cannot arrive from its current state.',
  })
  async arriveEncounter(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { EncounterLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = EncounterLifecycleRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw encounterValidationError(issues || 'Invalid request body');
    }
    const result = await this.encountersService.arriveEncounter(
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
   * POST /api/v1/encounters/:id/start
   *
   * Start an encounter (planned | arrived → in_progress).
   *
   * Authorized for R01 Physician only (permission `encounters:start`).
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('encounters:start', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Start an encounter (planned | arrived → in_progress)',
  })
  @ApiResponse({
    status: 200,
    description: 'The started encounter.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Encounter not found in scope.' })
  @ApiResponse({
    status: 422,
    description: 'The encounter cannot be started from its current state.',
  })
  async startEncounter(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { EncounterLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = EncounterLifecycleRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw encounterValidationError(issues || 'Invalid request body');
    }
    const result = await this.encountersService.startEncounter(
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
   * POST /api/v1/encounters/:id/on-leave
   *
   * Put an encounter on leave (in_progress → on_leave).
   *
   * Authorized for R01 Physician only (permission `encounters:on_leave`).
   */
  @Post(':id/on-leave')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('encounters:on_leave', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Put an encounter on leave (in_progress → on_leave)',
  })
  @ApiResponse({
    status: 200,
    description: 'The on-leave encounter.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Encounter not found in scope.' })
  @ApiResponse({
    status: 422,
    description: 'The encounter cannot go on leave from its current state.',
  })
  async onLeaveEncounter(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { EncounterLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = EncounterLifecycleRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw encounterValidationError(issues || 'Invalid request body');
    }
    const result = await this.encountersService.onLeaveEncounter(
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
   * POST /api/v1/encounters/:id/resume
   *
   * Resume an encounter (on_leave → in_progress).
   *
   * Authorized for R01 Physician only (permission `encounters:resume`).
   */
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('encounters:resume', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Resume an encounter (on_leave → in_progress)' })
  @ApiResponse({
    status: 200,
    description: 'The resumed encounter.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Encounter not found in scope.' })
  @ApiResponse({
    status: 422,
    description: 'The encounter cannot be resumed from its current state.',
  })
  async resumeEncounter(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { EncounterLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = EncounterLifecycleRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw encounterValidationError(issues || 'Invalid request body');
    }
    const result = await this.encountersService.resumeEncounter(
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
   * POST /api/v1/encounters/:id/finish
   *
   * Finish an encounter (in_progress → finished). `finished` is
   * terminal; re-finishing is an idempotent no-op.
   *
   * Authorized for R01 Physician only (permission `encounters:finish`).
   */
  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('encounters:finish', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Finish an encounter (in_progress → finished)' })
  @ApiResponse({
    status: 200,
    description: 'The finished encounter.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Encounter not found in scope.' })
  @ApiResponse({
    status: 422,
    description: 'The encounter cannot be finished from its current state.',
  })
  async finishEncounter(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { EncounterLifecycleRequestBodySchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = EncounterLifecycleRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw encounterValidationError(issues || 'Invalid request body');
    }
    const result = await this.encountersService.finishEncounter(
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
   * POST /api/v1/encounters/:id/cancel
   *
   * Cancel an encounter (planned | arrived | in_progress → cancelled).
   * `cancelled` is terminal; re-cancelling is an idempotent no-op.
   *
   * Authorized for R01 Physician and R02 Nurse (permission
   * `encounters:cancel`). An optional `reason` is carried in the
   * audit event metadata.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('encounters:cancel', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Cancel an encounter (planned | arrived | in_progress → cancelled)',
  })
  @ApiResponse({
    status: 200,
    description: 'The cancelled encounter.',
    schema: encounterResponseSchema,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Encounter not found in scope.' })
  @ApiResponse({
    status: 422,
    description: 'The encounter cannot be cancelled from its current state.',
  })
  async cancelEncounter(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EncounterResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { CancelEncounterRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = CancelEncounterRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw encounterValidationError(issues || 'Invalid request body');
    }
    const result = await this.encountersService.cancelEncounter(
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
}
