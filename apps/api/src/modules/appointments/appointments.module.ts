import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { ClockModule } from '../../infrastructure/clock/index.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsTodayService } from './appointments-today.service.js';

/**
 * Appointments module.
 *
 * Provides the "Today's Appointments" endpoint at `GET /api/v1/appointments/today`
 * for the R09 Clinic Administrator role.
 *
 * The module depends on:
 * - {@link DatabaseModule} for the AppointmentRepository and
 *   FacilityRepository.
 * - {@link AuditModule} for the AuditHelperService.
 * - {@link AuthModule} for the AuthService.
 * - {@link AuthorizationModule} for the AuthorizationGuard.
 * - {@link ClockModule} for the ClockService.
 *
 * The route is guarded by `AuthorizationGuard` and requires the
 * `appointments:view` permission, which is granted ONLY to
 * `R09_ADMINISTRATOR`.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AuthModule,
    AuthorizationModule,
    ClockModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsTodayService],
})
export class AppointmentsModule {}
