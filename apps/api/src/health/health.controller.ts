import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthResponse } from './health.types';

/**
 * Thin HTTP controller for the health endpoint.
 *
 * All response construction lives in {@link HealthService}. The controller
 * only translates the service result into an HTTP 200 response. No business
 * logic, no environment access, no database access.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }
}
