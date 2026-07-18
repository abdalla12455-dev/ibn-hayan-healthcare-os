import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Health module.
 *
 * Self-contained: declares its own controller and service. Does not import
 * any other module and does not export anything — the health endpoint is
 * consumed via the global API prefix mounted at the application root.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
