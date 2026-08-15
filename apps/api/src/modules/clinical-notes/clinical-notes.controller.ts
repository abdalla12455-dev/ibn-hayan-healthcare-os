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
  CreateClinicalNoteResponse,
  ClinicalNoteResponse,
  ClinicalNoteHistoryResponse,
} from '@ibn-hayan/contracts';
import { ClinicalNotesService } from './clinical-notes.service.js';
import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';
import { clinicalNoteValidationError } from './clinical-notes.errors.js';

/**
 * Shared OpenAPI response schema for the clinical-note endpoints. The
 * response exposes the note's logical identifiers, type, status, author
 * role, the current revision (current body and action), and timestamps —
 * NOT scope fields (tenantId/organisationId/facilityId) to avoid leaking
 * internal scope.
 */
const clinicalNoteResponseSchema = {
  type: 'object',
  required: [
    'id',
    'encounterId',
    'patientId',
    'noteType',
    'authorRole',
    'status',
    'currentRevision',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    encounterId: { type: 'string', format: 'uuid' },
    patientId: { type: 'string', format: 'uuid' },
    noteType: {
      type: 'string',
      enum: [
        'progress',
        'history',
        'physical',
        'consultation',
        'discharge',
        'procedure',
        'nursing',
      ],
    },
    authorRole: {
      type: 'string',
      enum: [
        'physician',
        'nurse',
        'pharmacist',
        'therapist',
        'midlevel',
        'student',
      ],
    },
    status: {
      type: 'string',
      enum: [
        'draft',
        'in_progress',
        'signed',
        'amended',
        'addendum',
        'withdrawn',
      ],
    },
    currentRevision: {
      type: 'object',
      required: ['revisionNumber', 'action', 'body', 'authorId', 'signedAt'],
      properties: {
        revisionNumber: { type: 'integer', minimum: 1 },
        action: {
          type: 'string',
          enum: [
            'draft_created',
            'signed',
            'amended',
            'addendum_added',
            'withdrawn',
          ],
        },
        body: { type: 'string' },
        authorId: { type: 'string', format: 'uuid' },
        signedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

/**
 * Clinical Notes controller (BC03 — Clinical Documentation Foundation).
 *
 * Mounts the clinical-note endpoints at `/api/v1/clinical-notes`:
 * - `POST /api/v1/clinical-notes` — create a clinical note draft
 *   (R01 Physician, R02 Nurse, R05 Allied Health; `clinical_notes:create`).
 * - `GET /api/v1/clinical-notes/:id` — view a note
 *   (clinical/operational read roles; `clinical_notes:view`).
 * - `GET /api/v1/clinical-notes/:id/history` — view a note's revision
 *   history (clinical/operational read roles; `clinical_notes:view`).
 * - `POST /api/v1/clinical-notes/:id/sign` — sign a note
 *   (R01, R02, R05; `clinical_notes:sign`).
 * - `POST /api/v1/clinical-notes/:id/amend` — amend a signed note
 *   (R01, R02, R05; `clinical_notes:amend`).
 * - `POST /api/v1/clinical-notes/:id/addendum` — add an addendum
 *   (R01, R02, R05; `clinical_notes:amend`).
 * - `POST /api/v1/clinical-notes/:id/withdraw` — withdraw a draft note
 *   (R01, R02, R05; `clinical_notes:amend`).
 *
 * The controller is a thin transport layer. It applies the
 * `AuthorizationGuard`, declares the required permission via
 * `@RequirePermission(...)`, reads the session cookie, parses the request
 * body with the canonical Zod contract, and delegates to
 * {@link ClinicalNotesService}. The client can never override tenant,
 * organisation, facility, status, or audit actor via the request body.
 *
 * Audit trail: the controller does NOT emit an audit event itself. The
 * audit trail for each command is provided by:
 * 1. The `AuthorizationGuard`'s `authorization.decision.allowed` event
 *    (category `authorization`), emitted for every authorized request.
 * 2. The service's `clinical_notes.*` action event (category
 *    `facility_context`), emitted AFTER a successful state change or read.
 *    The event is NOT emitted for validation failure, authorization
 *    failure, provider-ineligibility, not-found, or invalid transition.
 */
@ApiTags('clinical-notes')
@Controller('clinical-notes')
@UseGuards(AuthorizationGuard)
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  /**
   * POST /api/v1/clinical-notes
   *
   * Create a new clinical note draft for the authenticated session's
   * active tenant, organisation, and facility context. The note is
   * created in the canonical initial `draft` status with its first
   * revision (`draft_created`).
   *
   * Returns 401 for missing/invalid/expired/revoked sessions.
   * Returns 403 for principals whose roles do not grant
   * `clinical_notes:create` (R01 Physician, R02 Nurse, R05 Allied
   * Health).
   * Returns 400 for an invalid request body.
   * Returns 422 when the encounter/patient/provider is not accessible in
   * scope, or when the supplied patient does not match the encounter's
   * patient.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('clinical_notes:create', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Create a clinical note draft for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 201,
    description:
      'The created clinical note in the draft status. The clinical_notes.created audit event is emitted exactly once.',
    schema: clinicalNoteResponseSchema,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 422,
    description:
      'Encounter/patient/provider not found in scope, or patient-encounter mismatch.',
  })
  async createClinicalNote(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<CreateClinicalNoteResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { CreateClinicalNoteRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = CreateClinicalNoteRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw clinicalNoteValidationError(issues || 'Invalid request body');
    }
    const result = await this.clinicalNotesService.createClinicalNote(
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
   * GET /api/v1/clinical-notes/:id
   *
   * View a single clinical note for the authenticated scope. Returns 404
   * if the note does not exist or is not accessible in the authenticated
   * scope (no existence leak).
   *
   * Authorized for the clinical/operational read roles (permission
   * `clinical_notes:view`): R01 Physician, R02 Nurse, R03 Pharmacist,
   * R05 Allied Health, R09 Clinic Administrator, R10 Compliance Officer,
   * R12 Executive. R13 System Administrator is denied.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('clinical_notes:view', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'View a single clinical note for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 200,
    description: 'The clinical note.',
    schema: clinicalNoteResponseSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Clinical note not found or not accessible in the current context.',
  })
  async viewClinicalNote(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ClinicalNoteResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.clinicalNotesService.viewClinicalNote(
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
   * GET /api/v1/clinical-notes/:id/history
   *
   * View the full append-only revision history of a clinical note for the
   * authenticated scope. Returns 404 if the note does not exist or is not
   * accessible in the authenticated scope (no existence leak).
   *
   * Authorized for the clinical/operational read roles (permission
   * `clinical_notes:view`).
   */
  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('clinical_notes:view', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'View the full revision history of a clinical note for the active context',
  })
  @ApiResponse({
    status: 200,
    description:
      'The clinical note revision history (ascending revision number).',
  })
  @ApiResponse({
    status: 401,
    description: 'Session is missing, expired, or revoked.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description:
      'Clinical note not found or not accessible in the current context.',
  })
  async viewClinicalNoteHistory(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ClinicalNoteHistoryResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.clinicalNotesService.viewClinicalNoteHistory(
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
   * POST /api/v1/clinical-notes/:id/sign
   *
   * Sign a draft/in_progress clinical note (draft | in_progress -> signed).
   * Enforces the signing-authority rule (BR-BC03-CLIN-031): the actor
   * must be the note's author (baseline; per-facility authority matrix
   * deferred).
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:sign`).
   */
  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('clinical_notes:sign', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Sign a clinical note (draft | in_progress -> signed)',
  })
  @ApiResponse({
    status: 200,
    description: 'The signed clinical note.',
    schema: clinicalNoteResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({
    status: 403,
    description: 'Authorisation or signing authority denied.',
  })
  @ApiResponse({
    status: 404,
    description: 'Clinical note not found in scope.',
  })
  @ApiResponse({
    status: 422,
    description:
      'The clinical note cannot be signed from its current state, or the provider is not eligible.',
  })
  async signClinicalNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ClinicalNoteResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { SignClinicalNoteRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = SignClinicalNoteRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw clinicalNoteValidationError(issues || 'Invalid request body');
    }
    const result = await this.clinicalNotesService.signClinicalNote(
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

  /**
   * POST /api/v1/clinical-notes/:id/amend
   *
   * Amend a signed/amended clinical note (signed | amended -> amended).
   * Per BR-BC03-CLIN-032, the amendment requires a reason and an author.
   * The original signed revision is preserved immutably; the amendment
   * creates a NEW revision.
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:amend`).
   */
  @Post(':id/amend')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('clinical_notes:amend', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Amend a signed clinical note (signed | amended -> amended)',
  })
  @ApiResponse({
    status: 200,
    description: 'The amended clinical note.',
    schema: clinicalNoteResponseSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or missing reason.',
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description: 'Clinical note not found in scope.',
  })
  @ApiResponse({
    status: 422,
    description:
      'The clinical note cannot be amended from its current state, or the provider is not eligible.',
  })
  async amendClinicalNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ClinicalNoteResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { AmendClinicalNoteRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = AmendClinicalNoteRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw clinicalNoteValidationError(issues || 'Invalid request body');
    }
    const result = await this.clinicalNotesService.amendClinicalNote(
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

  /**
   * POST /api/v1/clinical-notes/:id/addendum
   *
   * Add an addendum to a signed/amended clinical note
   * (signed | amended -> addendum). An addendum is supplementary content;
   * the original content is retained. `addendum` is terminal. Per
   * BR-BC03-CLIN-032, the addendum requires a reason and an author.
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:amend` — addendum is a write/amend
   * action per the resource-permission matrix).
   */
  @Post(':id/addendum')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('clinical_notes:amend', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Add an addendum to a signed clinical note (-> addendum, terminal)',
  })
  @ApiResponse({
    status: 200,
    description: 'The clinical note with the addendum.',
    schema: clinicalNoteResponseSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or missing reason.',
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description: 'Clinical note not found in scope.',
  })
  @ApiResponse({
    status: 422,
    description:
      'An addendum cannot be added from the current state, or the provider is not eligible.',
  })
  async addAddendumToClinicalNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ClinicalNoteResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { AddendumClinicalNoteRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = AddendumClinicalNoteRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw clinicalNoteValidationError(issues || 'Invalid request body');
    }
    const result = await this.clinicalNotesService.addAddendumToClinicalNote(
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

  /**
   * POST /api/v1/clinical-notes/:id/withdraw
   *
   * Withdraw a draft/in_progress clinical note
   * (draft | in_progress -> withdrawn). Withdrawal is terminal (e.g.
   * authored in error). Per STATUS_CODES.md §5.3, withdrawal is recorded
   * with reason and author.
   *
   * Authorized for R01 Physician, R02 Nurse, R05 Allied Health
   * (permission `clinical_notes:amend` — withdrawal is a write/amend
   * action per the resource-permission matrix).
   */
  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('clinical_notes:amend', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Withdraw a draft clinical note (-> withdrawn, terminal)',
  })
  @ApiResponse({
    status: 200,
    description: 'The withdrawn clinical note.',
    schema: clinicalNoteResponseSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or missing reason.',
  })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description: 'Clinical note not found in scope.',
  })
  @ApiResponse({
    status: 422,
    description:
      'The clinical note cannot be withdrawn from its current state, or the provider is not eligible.',
  })
  async withdrawClinicalNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ClinicalNoteResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { WithdrawClinicalNoteRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = WithdrawClinicalNoteRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw clinicalNoteValidationError(issues || 'Invalid request body');
    }
    const result = await this.clinicalNotesService.withdrawClinicalNote(
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
