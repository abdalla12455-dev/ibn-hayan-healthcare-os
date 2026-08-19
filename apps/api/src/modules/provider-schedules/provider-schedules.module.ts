import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { ProviderSchedulesController } from './provider-schedules.controller.js';
import { ProviderSchedulesService } from './provider-schedules.service.js';

/**
 * Provider Schedules module (BC10 Workforce).
 *
 * Provides the Provider Schedule Management API:
 * - `POST /api/v1/provider-schedules` — create (R07 manage).
 * - `GET /api/v1/provider-schedules?providerId=...` — list (R07 manage /
 *   R09 read).
 * - `DELETE /api/v1/provider-schedules/:id` — delete (R07 manage).
 *
 * BC10 Workforce owns the schedule data through the domain
 * `ProviderScheduleRepository` port; the Prisma-backed implementation
 * is injected via `PROVIDER_SCHEDULE_REPOSITORY` from
 * {@link DatabaseModule}. No cross-BC Prisma shortcuts are used; the
 * appointments core consumes availability via the `ProviderRepository`
 * port only.
 */
@Module({
  imports: [DatabaseModule, AuditModule, AuthModule, AuthorizationModule],
  controllers: [ProviderSchedulesController],
  providers: [ProviderSchedulesService],
})
export class ProviderSchedulesModule {}
