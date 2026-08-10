import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { ClockModule } from '../../infrastructure/clock/index.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsTodayService } from './appointments-today.service.js';
import { AppointmentsBookingService } from './appointments-booking.service.js';
import { AppointmentsCancellationService } from './appointments-cancellation.service.js';
import { AppointmentsReschedulingService } from './appointments-rescheduling.service.js';
import { AppointmentsVisitLifecycleService } from './appointments-visit-lifecycle.service.js';

/**
 * Appointments module.
 *
 * Provides:
 * - `GET /api/v1/appointments/today` for the R09 Clinic Administrator role
 *   (requires `appointments:view` permission).
 * - `POST /api/v1/appointments` for creating appointments, authorized for
 *   R06 Receptionist, R07 Scheduler, and R09 Clinic Administrator roles
 *   (requires `appointments:book` permission).
 * - `POST /api/v1/appointments/:id/cancel` for cancelling appointments,
 *   authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
 *   Administrator roles (requires `appointments:cancel` permission).
 * - `POST /api/v1/appointments/:id/reschedule` for rescheduling
 *   appointments, authorized for R06 Receptionist, R07 Scheduler, and
 *   R09 Clinic Administrator roles (requires `appointments:reschedule`
 *   permission).
 * - `POST /api/v1/appointments/:id/confirm` for confirming appointments,
 *   authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
 *   Administrator roles (requires `appointments:confirm` permission).
 * - `POST /api/v1/appointments/:id/check-in` for checking patients in,
 *   authorized for R06 Receptionist, R07 Scheduler, and R09 Clinic
 *   Administrator roles (requires `appointments:check_in` permission).
 * - `POST /api/v1/appointments/:id/start` for starting a visit,
 *   authorized for R01 Physician only (requires `appointments:start`
 *   permission).
 * - `POST /api/v1/appointments/:id/complete` for completing a visit,
 *   authorized for R01 Physician only (requires `appointments:complete`
 *   permission).
 *
 * The module depends on:
 * - {@link DatabaseModule} for the AppointmentRepository,
 *   PatientRepository, ProviderRepository, and FacilityRepository.
 * - {@link AuditModule} for the AuditHelperService.
 * - {@link AuthModule} for the AuthService.
 * - {@link AuthorizationModule} for the AuthorizationGuard.
 * - {@link ClockModule} for the ClockService.
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
  providers: [
    AppointmentsTodayService,
    AppointmentsBookingService,
    AppointmentsCancellationService,
    AppointmentsReschedulingService,
    AppointmentsVisitLifecycleService,
  ],
})
export class AppointmentsModule {}
