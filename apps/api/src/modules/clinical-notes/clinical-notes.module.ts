import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/index.js';
import { AuditModule } from '../audit/index.js';
import { AuthModule } from '../auth/index.js';
import { AuthorizationModule } from '../authorization/index.js';
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
 * Like the encounters module, this module imports the DatabaseModule,
 * AuditModule, AuthModule, and AuthorizationModule so the repository,
 * audit, auth, and guard tokens are resolvable within this module's
 * scope (the DatabaseModule is not a @Global module).
 */
@Module({
  imports: [DatabaseModule, AuditModule, AuthModule, AuthorizationModule],
  controllers: [ClinicalNotesController],
  providers: [ClinicalNotesService],
})
export class ClinicalNotesModule {}
