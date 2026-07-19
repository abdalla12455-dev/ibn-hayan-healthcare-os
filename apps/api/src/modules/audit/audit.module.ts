import { Module } from '@nestjs/common';
import { AuditPrismaService } from './audit-prisma.service.js';
import { AuditConfigurationService } from './audit-configuration.service.js';
import { PrismaAuditOutboxRepository } from './prisma-audit-outbox.repository.js';
import { PrismaAuditStoreAppendRepository } from './prisma-audit-store-append.repository.js';
import { PrismaAuditStoreReadRepository } from './prisma-audit-store-read.repository.js';
import { AuditEmitterService } from './audit-emitter.service.js';
import { AuditDispatcherService } from './audit-dispatcher.service.js';
import { AuditIntegrityVerifierService } from './audit-integrity-verifier.service.js';
import { AuditHelperService } from './audit-helper.service.js';
import {
  AUDIT_OUTBOX_PORT,
  AUDIT_STORE_APPEND_PORT,
  AUDIT_STORE_READ_PORT,
  AUDIT_EMITTER_PORT,
} from '@ibn-hayan/observability';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';

/**
 * Audit module.
 *
 * Wires the audit infrastructure:
 * - `AuditPrismaService` (the audit-store Prisma client).
 * - `AuditConfigurationService` (reads and validates audit env vars).
 * - `PrismaAuditOutboxRepository` (implements `AuditOutboxPort`).
 * - `PrismaAuditStoreAppendRepository` (implements `AuditStoreAppendPort`).
 * - `PrismaAuditStoreReadRepository` (implements `AuditStoreReadPort`).
 * - `AuditEmitterService` (implements `AuditEmitterPort`).
 * - `AuditDispatcherService` (dispatches outbox rows to the audit store).
 * - `AuditIntegrityVerifierService` (verifies chain integrity).
 * - `AuditHelperService` (convenience helper for emitting modules).
 *
 * The module imports `DatabaseModule` because the outbox lives in
 * the transactional database and uses `PrismaService`.
 *
 * The audit-store services (`AuditPrismaService`,
 * `PrismaAuditStoreAppendRepository`,
 * `PrismaAuditStoreReadRepository`) use the audit-store Prisma
 * client, not the transactional-store Prisma client.
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    AuditPrismaService,
    AuditConfigurationService,
    {
      provide: AUDIT_OUTBOX_PORT,
      useClass: PrismaAuditOutboxRepository,
    },
    {
      provide: AUDIT_STORE_APPEND_PORT,
      useClass: PrismaAuditStoreAppendRepository,
    },
    {
      provide: AUDIT_STORE_READ_PORT,
      useClass: PrismaAuditStoreReadRepository,
    },
    {
      provide: AUDIT_EMITTER_PORT,
      useClass: AuditEmitterService,
    },
    AuditDispatcherService,
    AuditIntegrityVerifierService,
    AuditHelperService,
  ],
  exports: [
    AuditPrismaService,
    AuditConfigurationService,
    AUDIT_OUTBOX_PORT,
    AUDIT_STORE_APPEND_PORT,
    AUDIT_STORE_READ_PORT,
    AUDIT_EMITTER_PORT,
    AuditDispatcherService,
    AuditIntegrityVerifierService,
    AuditHelperService,
  ],
})
export class AuditModule {}
