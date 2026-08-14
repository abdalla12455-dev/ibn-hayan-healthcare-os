import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

/**
 * Patients module (BC01 — Demographics / Registration / Consent).
 *
 * Provides:
 * - `POST /api/v1/patients` for registering a patient (R06 Receptionist;
 *   `patients:register`).
 * - `GET /api/v1/patients/:id` for viewing a patient
 *   (clinical/operational read roles; `patients:view`).
 * - `GET /api/v1/patients` for bounded search (clinical/operational read
 *   roles; `patients:search`).
 * - `PATCH /api/v1/patients/:id` for bounded demographic update (R06
 *   Receptionist; `patients:update_demographics`).
 * - `POST /api/v1/patients/:id/identifiers` for adding an identifier (R06
 *   Receptionist; `patients:manage_identifiers`).
 * - `GET /api/v1/patients/:id/identifiers` for listing identifiers (R06
 *   Receptionist; `patients:manage_identifiers`).
 * - `POST /api/v1/patients/:id/consents` for granting a treatment consent
 *   (R01 Physician, R02 Nurse, R06 Receptionist;
 *   `patients:consent_grant`).
 * - `GET /api/v1/patients/:id/consents` for listing consents (R01, R02,
 *   R06; `patients:consent_view`).
 * - `POST /api/v1/patients/:id/consents/:consentId/withdraw` for
 *   withdrawing a consent (R01, R02, R06;
 *   `patients:consent_withdraw`).
 *
 * The module depends on:
 * - {@link DatabaseModule} for the PatientRepository,
 *   PatientIdentifierRepository, PatientConsentRepository, and the
 *   AgeOfMajorityPolicyPort / TreatmentConsentVerificationPort.
 * - {@link AuditModule} for the AuditHelperService.
 * - {@link AuthModule} for the AuthService.
 * - {@link AuthorizationModule} for the AuthorizationGuard.
 */
@Module({
  imports: [DatabaseModule, AuditModule, AuthModule, AuthorizationModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
