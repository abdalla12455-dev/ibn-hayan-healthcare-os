import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { ConfigurationController } from './configuration.controller.js';
import { ConfigurationAdministrationService } from './configuration-administration.service.js';
import { ConfigurationResolutionService } from './configuration-resolution.service.js';
import { CONFIGURATION_RESOLUTION_PORT } from '../../infrastructure/database/index.js';

/**
 * Configuration module (BC16).
 *
 * - The {@link ConfigurationResolutionService} is bound to the
 *   `CONFIGURATION_RESOLUTION_PORT` DI token so consuming modules
 *   (e.g. Scheduling) can resolve values via the canonical port
 *   without performing their own layer resolution.
 * - The {@link ConfigurationAdministrationService} backs the GET/PUT
 *   administration controller endpoints.
 * - Depends on {@link DatabaseModule} (repositories), {@link AuditModule} (audit
 *   helper), {@link AuthModule} (session resolution), and
 *   {@link AuthorizationModule} (permission gate).
 */
@Module({
  imports: [DatabaseModule, AuditModule, AuthModule, AuthorizationModule],
  controllers: [ConfigurationController],
  providers: [
    ConfigurationAdministrationService,
    ConfigurationResolutionService,
    {
      provide: CONFIGURATION_RESOLUTION_PORT,
      useClass: ConfigurationResolutionService,
    },
  ],
  exports: [CONFIGURATION_RESOLUTION_PORT],
})
export class ConfigurationModule {}
