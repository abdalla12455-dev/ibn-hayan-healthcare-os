import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type {
  EffectiveConfigurationValueResponse,
  ConfigurationValueUpsertResponse,
} from '@ibn-hayan/contracts';
import { UpsertConfigurationValueRequestSchema } from '@ibn-hayan/contracts';
import { AuthorizationGuard } from '../authorization/authorization.guard.js';
import { RequirePermission } from '../authorization/require-permission.decorator.js';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants.js';
import { sessionRequired } from '../auth/auth.errors.js';
import {
  readCookie,
  buildAuditContext,
} from '../../infrastructure/transport/index.js';
import { ConfigurationAdministrationService } from './configuration-administration.service.js';
import { BadRequestException } from '@nestjs/common';

const effectiveValueResponseSchema: Record<string, unknown> = {
  type: 'object',
  required: [
    'key',
    'value',
    'valueType',
    'sourceLayer',
    'resolvedAt',
    'valueVersion',
  ],
  properties: {
    key: { type: 'string' },
    value: {},
    valueType: { type: 'string' },
    sourceLayer: { type: 'string', enum: ['L1', 'L3', 'L4'] },
    resolvedAt: { type: 'string', format: 'date-time' },
    valueVersion: { type: 'integer', nullable: true },
  },
};

const upsertResponseSchema: Record<string, unknown> = {
  type: 'object',
  required: [
    'key',
    'layer',
    'scope',
    'value',
    'valueVersion',
    'outcome',
    'updatedAt',
  ],
  properties: {
    key: { type: 'string' },
    layer: { type: 'string', enum: ['L3', 'L4'] },
    scope: {
      type: 'object',
      required: ['tenantId', 'organisationId', 'facilityId'],
      properties: {
        tenantId: { type: 'string', format: 'uuid', nullable: true },
        organisationId: { type: 'string', format: 'uuid', nullable: true },
        facilityId: { type: 'string', format: 'uuid', nullable: true },
      },
    },
    value: {},
    valueVersion: { type: 'integer' },
    outcome: { type: 'string', enum: ['created', 'updated'] },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

/**
 * Configuration administration controller (BC16).
 *
 * Route-guarded by `AuthorizationGuard` with the canonical
 * `configuration:read` / `configuration:write` permission codes.
 * Additional layer authorization (R13 → L3; R09 → L4) is performed
 * inside the administration service using the active membership's
 * role assignments. Scope is ALWAYS derived from the session; the
 * body may only identify the requested supported layer.
 *
 * Unknown/unregistered keys, unsupported layers, semantically invalid
 * values, and unauthorized layers are fail-closed at the HTTP
 * boundary. Failed/unauthorized writes never emit a success audit
 * event (the successful write + version append + audit event share a
 * single Prisma transaction).
 */
@ApiTags('Configuration')
@Controller('configuration')
@UseGuards(AuthorizationGuard)
export class ConfigurationController {
  constructor(
    private readonly administration: ConfigurationAdministrationService,
  ) {}

  /** GET effective value for a registered key. */
  @Get(':key')
  @RequirePermission('configuration:read', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Resolve the effective Configuration value for a registered key with provenance metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'The effective value and its source layer.',
    schema: effectiveValueResponseSchema,
  })
  async getEffectiveValue(
    @Param('key') key: string,
    @Req() req: Request,
  ): Promise<EffectiveConfigurationValueResponse> {
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.administration.getEffectiveValue(
      key,
      cookieValue,
      buildAuditContext(req),
    );
    if (result === null) {
      throw sessionRequired();
    }
    return result;
  }

  /** PUT create/update override for a registered key at layer L3/L4. */
  @Put(':key')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('configuration:write', {
    mode: 'for-active-membership',
  })
  @ApiSecurity('session')
  @ApiOperation({
    summary:
      'Create or update a Configuration override at an explicitly requested supported layer',
  })
  @ApiResponse({
    status: 200,
    description: 'The persisted override record.',
    schema: upsertResponseSchema,
  })
  async upsertOverride(
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<ConfigurationValueUpsertResponse> {
    const parseResult = UpsertConfigurationValueRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => i.message).join('; ');
      throw new BadRequestException({
        error: {
          code: 'CONFIGURATION_INVALID_VALUE',
          message: issues || 'Invalid request body',
        },
      });
    }
    const cookieValue = readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.administration.upsertOverride(
      key,
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
