import { Module } from '@nestjs/common';
import { ClinicalNotesController } from './clinical-notes.controller.js';
import { ClinicalNotesService } from './clinical-notes.service.js';

/**
 * Clinical Notes module (BC03 — Clinical Documentation Foundation).
 *
 * Wires the clinical-note controller and service. The service injects the
 * repository interfaces and cross-BC ports from the DatabaseModule
 * (via the DI tokens), the AuthService (session resolution), and the
 * AuditHelperService (audit emission). The controller is a thin transport
 * layer that applies the AuthorizationGuard and delegates to the service.
 *
 * The module does NOT import the DatabaseModule directly; it relies on
 * the repository/audit tokens being globally available via the
 * DatabaseModule exports (consistent with the encounters module).
 */
@Module({
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService],
})
export class ClinicalNotesModule {}
