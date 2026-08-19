import {
  Controller,
  Get,
  Post,
  Delete,
  Req,
  Body,
  Param,
  Query,
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
import type {
  CreateProviderScheduleResponse,
  ListProviderSchedulesResponse,
  DeleteProviderScheduleResponse,
} from '@ibn-hayan/contracts';
import { ProviderSchedulesService } from './provider-schedules.service.js';
import { providerScheduleValidationError } from './provider-schedules.errors.js';
import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Provider Schedule Management controller (BC10 Workforce).
 *
 * Mounts:
 * - `POST /api/v1/provider-schedules` — create an entry
 *   (permission `provider_schedules:manage`).
 * - `GET /api/v1/provider-schedules?providerId=...` — list entries
 *   (permission `provider_schedules:read`).
 * - `DELETE /api/v1/provider-schedules/:id` — delete an entry
 *   (permission `provider_schedules:manage`).
 *
 * The controller is a thin transport layer. Scope
 * (tenant/organisation/facility) is always session-derived; scope is
 * never accepted from the request body or query string. R07 Scheduler
 * holds `provider_schedules:manage` (create/delete) and
 * `provider_schedules:read`; R09 Clinic Administrator holds
 * `provider_schedules:read` only. R06, R01, R02, and R13 are denied.
 */
@ApiTags('provider-schedules')
@Controller('provider-schedules')
@UseGuards(AuthorizationGuard)
export class ProviderSchedulesController {
  constructor(private readonly schedules: ProviderSchedulesService) {}

  /**
   * Create a provider schedule entry for the active facility.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('provider_schedules:manage', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Create a provider schedule entry for the active tenant, organisation, and facility context',
  })
  @ApiResponse({
    status: 201,
    description: 'The created schedule entry.',
    schema: {
      type: 'object',
      required: ['id', 'providerId', 'dayOfWeek', 'startTime', 'endTime'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        providerId: { type: 'string', format: 'uuid' },
        dayOfWeek: { type: 'integer', minimum: 1, maximum: 7 },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({
    status: 422,
    description:
      'The provider was not found or is not eligible for the authenticated facility.',
  })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  async createEntry(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<CreateProviderScheduleResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const { CreateProviderScheduleRequestSchema } =
      await import('@ibn-hayan/contracts');
    const parseResult = CreateProviderScheduleRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw providerScheduleValidationError(issues || 'Invalid request body');
    }
    const result = await this.schedules.createEntry(
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
   * List schedule entries for a provider at the active facility.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('provider_schedules:read', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'List provider schedule entries for the provider at the active facility',
  })
  @ApiResponse({
    status: 200,
    description:
      'The schedule entries for the provider at the active facility.',
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 422,
    description:
      'The provider was not found or is not eligible for the authenticated facility.',
  })
  async listEntries(
    @Req() req: Request,
    @Query('providerId') providerId?: string,
  ): Promise<ListProviderSchedulesResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    let pid: string | undefined = providerId;
    if (typeof pid === 'string' && pid.length === 0) {
      pid = undefined;
    }
    if (pid !== undefined && !isUuid(pid)) {
      throw providerScheduleValidationError(
        'providerId query parameter must be a UUID.',
      );
    }
    const result = await this.schedules.listEntries(pid, cookieValue);
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /**
   * Delete a provider schedule entry by ID, scoped to the FULL
   * authenticated tenant/organisation/facility context. Entries in
   * another tenant, organisation, or facility return the same safe
   * 404 and remain unchanged.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('provider_schedules:manage', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary: 'Delete a provider schedule entry by ID',
  })
  @ApiResponse({ status: 200, description: 'Entry deleted.' })
  @ApiResponse({ status: 401, description: 'Session required.' })
  @ApiResponse({ status: 403, description: 'Authorisation denied.' })
  @ApiResponse({
    status: 404,
    description: 'The schedule entry was not found in the current context.',
  })
  async deleteEntry(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<DeleteProviderScheduleResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    if (!isUuid(id)) {
      throw providerScheduleValidationError(
        'Schedule entry id must be a UUID.',
      );
    }
    const result = await this.schedules.deleteEntry(
      id,
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }
}
