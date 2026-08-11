import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { EncountersController } from './encounters.controller.js';
import { EncountersService } from './encounters.service.js';
import { ConsentGateFeatureConfig } from './consent-gate-feature.config.js';

/**
 * Encounters module (Stage 2A — BC02 Encounter Foundation).
 *
 * Provides:
 * - `POST /api/v1/encounters` for creating an encounter, authorized for
 *   R01 Physician and R02 Nurse (permission `encounters:create`).
 * - `GET /api/v1/encounters/:id` for viewing an encounter, authorized
 *   for the clinical/operational read roles (permission
 *   `encounters:view`).
 * - `POST /api/v1/encounters/:id/arrive` for arriving an encounter,
 *   authorized for R01 Physician and R02 Nurse (permission
 *   `encounters:arrive`).
 * - `POST /api/v1/encounters/:id/start` for starting an encounter,
 *   authorized for R01 Physician only (permission `encounters:start`).
 * - `POST /api/v1/encounters/:id/on-leave` for putting on leave,
 *   authorized for R01 Physician only (permission `encounters:on_leave`).
 * - `POST /api/v1/encounters/:id/resume` for resuming,
 *   authorized for R01 Physician only (permission `encounters:resume`).
 * - `POST /api/v1/encounters/:id/finish` for finishing,
 *   authorized for R01 Physician only (permission `encounters:finish`).
 * - `POST /api/v1/encounters/:id/cancel` for cancelling,
 *   authorized for R01 Physician and R02 Nurse (permission
 *   `encounters:cancel`).
 *
 * The module depends on:
 * - {@link DatabaseModule} for the EncounterRepository,
 *   AppointmentRepository, PatientRepository, ProviderRepository, and
 *   FacilityRepository.
 * - {@link AuditModule} for the AuditHelperService.
 * - {@link AuthModule} for the AuthService.
 * - {@link AuthorizationModule} for the AuthorizationGuard.
 *
 * The {@link ConsentGateFeatureConfig} is a local provider (it reads
 * the `IBN_HAYAN_CONSENT_GATE_ENABLED` environment variable via the
 * global `ConfigService`).
 */
@Module({
  imports: [DatabaseModule, AuditModule, AuthModule, AuthorizationModule],
  controllers: [EncountersController],
  providers: [EncountersService, ConsentGateFeatureConfig],
})
export class EncountersModule {}
