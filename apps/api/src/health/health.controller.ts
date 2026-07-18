import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

/**
 * Thin HTTP controller for the health endpoint.
 *
 * All response construction lives in {@link HealthService}. The controller
 * only translates the service result into an HTTP 200 response. No business
 * logic, no environment access, no database access.
 *
 * The OpenAPI response schema is defined inline in the `@ApiOkResponse`
 * decorator so that it exactly mirrors the shared Zod contract defined in
 * `@ibn-hayan/contracts`. The Zod schema remains the single source of
 * truth for runtime validation; the inline OpenAPI schema documents the
 * same shape for API consumers. The integration test in
 * `openapi.e2e-spec.ts` verifies that the generated specification contains
 * exactly the three contract fields and no others.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns the canonical health response indicating that the API process is reachable. This is a liveness probe; it does not check database, cache, or downstream dependencies.',
  })
  @ApiOkResponse({
    description: 'The API process is reachable and the response is valid.',
    schema: {
      type: 'object',
      required: ['status', 'service', 'version'],
      properties: {
        status: { type: 'string', enum: ['ok'] },
        service: { type: 'string', enum: ['ibn-hayan-api'] },
        version: { type: 'string', enum: ['development'] },
      },
      additionalProperties: false,
    },
  })
  getHealth() {
    return this.healthService.getHealth();
  }
}
