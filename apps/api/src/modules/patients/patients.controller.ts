import {
  Controller,
  Get,
  Post,
  Patch,
  Req,
  Body,
  Query,
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
  CreatePatientResponse,
  UpdatePatientDemographicsResponse,
  PatientSearchResponse,
  AddPatientIdentifierResponse,
  ListPatientIdentifiersResponse,
  GrantTreatmentConsentResponse,
  ListPatientConsentsResponse,
  WithdrawTreatmentConsentResponse,
} from '@ibn-hayan/contracts';
import { PatientsService } from './patients.service.js';
import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';
import { patientValidationError } from './patients.errors.js';

/**
 * Shared OpenAPI response schema for the patient endpoints. The patient
 * response exposes the MRN, lifecycle status, and demographic fields —
 * NOT sensitive identifiers (those are returned only by the identifier
 * endpoints to authorized callers).
 */
const patientResponseSchema = {
  type: 'object',
  required: ['id', 'medicalRecordNumber', 'status'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    medicalRecordNumber: { type: 'string' },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'deceased', 'transferred_out', 'archived'],
    },
    legalGivenName: { type: 'string', nullable: true },
    legalMiddleName: { type: 'string', nullable: true },
    legalFamilyName: { type: 'string', nullable: true },
    preferredName: { type: 'string', nullable: true },
    dateOfBirth: { type: 'string', nullable: true },
    sex: {
      type: 'string',
      enum: ['male', 'female', 'intersex', 'unknown', 'not_declared'],
      nullable: true,
    },
    genderIdentity: {
      type: 'string',
      enum: [
        'male',
        'female',
        'transgender_male',
        'transgender_female',
        'non_binary',
        'prefer_not_to_say',
        'other',
      ],
      nullable: true,
    },
    genderIdentityDetail: { type: 'string', nullable: true },
  },
};

/**
 * Patients controller (BC01 — Demographics / Registration / Consent).
 *
 * Mounts the patient endpoints at `/api/v1/patients`:
 * - `POST /api/v1/patients` — register a patient (R06 Receptionist;
 *   `patients:register`).
 * - `GET /api/v1/patients/:id` — view a patient (clinical/operational
 *   read roles; `patients:view`).
 * - `GET /api/v1/patients` — bounded search (clinical/operational read
 *   roles; `patients:search`).
 * - `PATCH /api/v1/patients/:id` — update demographics (R06
 *   Receptionist; `patients:update_demographics`).
 * - `POST /api/v1/patients/:id/identifiers` — add identifier (R06
 *   Receptionist; `patients:manage_identifiers`).
 * - `GET /api/v1/patients/:id/identifiers` — list identifiers (R06
 *   Receptionist; `patients:manage_identifiers`).
 * - `POST /api/v1/patients/:id/consents` — grant treatment consent
 *   (R01 Physician, R02 Nurse, R06 Receptionist;
 *   `patients:consent_grant`).
 * - `GET /api/v1/patients/:id/consents` — list consents (R01, R02, R06;
 *   `patients:consent_view`).
 * - `POST /api/v1/patients/:id/consents/:consentId/withdraw` — withdraw
 *   consent (R01, R02, R06; `patients:consent_withdraw`).
 *
 * The controller is a thin transport layer. It applies the
 * `AuthorizationGuard`, declares the required permission via
 * `@RequirePermission(...)`, reads the session cookie, parses the
 * request body with the canonical Zod contract, and delegates to
 * {@link PatientsService}. The client can never override tenant,
 * status, or actor via the request body.
 *
 * Audit trail: the controller does NOT emit an audit event itself. The
 * audit trail is provided by the `AuthorizationGuard`'s
 * `authorization.decision.allowed` event (every authorized request) and
 * the service's patient action event (emitted after a successful action;
 * NOT emitted for validation failure, auth failure, duplicate, or
 * not-found).
 */
@ApiTags('patients')
@Controller('patients')
@UseGuards(AuthorizationGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * POST /api/v1/patients
   *
   * Register a new patient with demographics. The tenantId is derived
   * from the authenticated session. The caller supplies the MRN and
   * demographic fields (no tenantId, status, or actorId in the body).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('patients:register', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Register a new patient with demographics',
  })
  @ApiResponse({
    status: 201,
    description:
      'The registered patient. The patients.registered audit event is emitted exactly once.',
    schema: patientResponseSchema,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 422,
    description: 'Duplicate MRN or identifier in tenant.',
  })
  async registerPatient(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<CreatePatientResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { CreatePatientRequestSchema } = await import('@ibn-hayan/contracts');
    const parseResult = CreatePatientRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw patientValidationError(issues || 'Invalid request body');
    }
    const result = await this.patientsService.registerPatient(
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
   * GET /api/v1/patients/:id
   *
   * View a patient by ID. Tenant-scoped: a patient in another tenant
   * returns 404 (no existence leak).
   */
  @Get(':id')
  @RequirePermission('patients:view', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'View a patient by ID' })
  @ApiResponse({
    status: 200,
    description: 'The patient. The patients.viewed audit event is emitted.',
    schema: patientResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  async viewPatient(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<CreatePatientResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.patientsService.viewPatient(
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
   * GET /api/v1/patients
   *
   * Bounded patient search. Deterministic only: exact MRN, exact
   * external identifier (type+value), or bounded name prefix. No fuzzy
   * matching. Tenant-scoped.
   */
  @Get()
  @RequirePermission('patients:search', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Bounded patient search' })
  @ApiResponse({
    status: 200,
    description:
      'Matching patients (maximum 50). The patients.searched audit event is emitted.',
  })
  @ApiResponse({ status: 400, description: 'Invalid search criteria.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  async searchPatients(
    @Req() req: Request,
    @Query() query: unknown,
  ): Promise<PatientSearchResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { PatientSearchRequestSchema } = await import('@ibn-hayan/contracts');
    const parseResult = PatientSearchRequestSchema.safeParse(query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw patientValidationError(issues || 'Invalid search criteria');
    }
    const result = await this.patientsService.searchPatients(
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
   * PATCH /api/v1/patients/:id
   *
   * Bounded demographic update. Only the explicitly editable demographic
   * fields may be mutated. The id, tenantId, and MRN are immutable.
   */
  @Patch(':id')
  @RequirePermission('patients:update_demographics', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Update patient demographics (bounded)' })
  @ApiResponse({
    status: 200,
    description:
      'The updated patient. The patients.demographics_updated audit event is emitted.',
    schema: patientResponseSchema,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  async updateDemographics(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<UpdatePatientDemographicsResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { UpdatePatientDemographicsRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = UpdatePatientDemographicsRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw patientValidationError(issues || 'Invalid request body');
    }
    const result = await this.patientsService.updateDemographics(
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
   * POST /api/v1/patients/:id/identifiers
   *
   * Add a secondary identifier (NationalID, Passport, InsuranceNumber)
   * to a patient. The value is normalised before storage.
   */
  @Post(':id/identifiers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('patients:manage_identifiers', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Add a secondary identifier to a patient' })
  @ApiResponse({
    status: 201,
    description:
      'The created identifier. The patients.identifier_added audit event is emitted.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  @ApiResponse({
    status: 422,
    description: 'Duplicate deterministic identifier in tenant.',
  })
  async addIdentifier(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AddPatientIdentifierResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { AddPatientIdentifierRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = AddPatientIdentifierRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw patientValidationError(issues || 'Invalid request body');
    }
    const result = await this.patientsService.addIdentifier(
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
   * GET /api/v1/patients/:id/identifiers
   *
   * List all identifiers for a patient. Tenant-scoped.
   */
  @Get(':id/identifiers')
  @RequirePermission('patients:manage_identifiers', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'List identifiers for a patient' })
  @ApiResponse({ status: 200, description: 'The identifiers for the patient.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  async listIdentifiers(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ListPatientIdentifiersResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.patientsService.listIdentifiers(
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
   * POST /api/v1/patients/:id/consents
   *
   * Grant a Treatment consent. The capturedBy is derived from the
   * authenticated session. Minor patients require guardian
   * authorization.
   */
  @Post(':id/consents')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('patients:consent_grant', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Grant a treatment consent' })
  @ApiResponse({
    status: 201,
    description:
      'The granted consent. The patients.consent_granted audit event is emitted.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Patient not found.' })
  @ApiResponse({
    status: 422,
    description:
      'Minor guardian required, duplicate active consent, or single_encounter not supported.',
  })
  async grantConsent(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<GrantTreatmentConsentResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { GrantTreatmentConsentRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = GrantTreatmentConsentRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw patientValidationError(issues || 'Invalid request body');
    }
    const result = await this.patientsService.grantConsent(
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
   * GET /api/v1/patients/:id/consents
   *
   * List all consent records for a patient (history-preserving).
   */
  @Get(':id/consents')
  @RequirePermission('patients:consent_view', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'List consents for a patient' })
  @ApiResponse({ status: 200, description: 'The consents for the patient.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  async listConsents(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ListPatientConsentsResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.patientsService.listConsents(
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
   * POST /api/v1/patients/:id/consents/:consentId/withdraw
   *
   * Withdraw a Treatment consent. Idempotent: an already-withdrawn
   * consent is a no-op.
   */
  @Post(':id/consents/:consentId/withdraw')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('patients:consent_withdraw', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({ summary: 'Withdraw a treatment consent' })
  @ApiResponse({
    status: 200,
    description:
      'The withdrawn consent. The patients.consent_withdrawn audit event is emitted on a first-time transition.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Session is missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({ status: 404, description: 'Consent not found.' })
  @ApiResponse({
    status: 422,
    description: 'Consent is not in a granted status.',
  })
  async withdrawConsent(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('consentId') consentId: string,
    @Body() body: unknown,
  ): Promise<WithdrawTreatmentConsentResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { WithdrawTreatmentConsentRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = WithdrawTreatmentConsentRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw patientValidationError(issues || 'Invalid request body');
    }
    const result = await this.patientsService.withdrawConsent(
      id,
      consentId,
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }
}
