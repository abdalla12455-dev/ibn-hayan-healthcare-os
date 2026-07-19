import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma-audit/client.js';

/**
 * Infrastructure-only wrapper around the audit-store Prisma client.
 *
 * Per ADR-014 (Audit Store and Integrity Strategy), the audit store
 * is a dedicated PostgreSQL 17 database separate from the
 * transactional database. This service is the audit-store analogue
 * of `PrismaService` (the transactional-store wrapper).
 *
 * Responsibilities:
 * - Construct the audit-store Prisma client with the
 *   `@prisma/adapter-pg` driver adapter. The connection string is
 *   read from `process.env.AUDIT_DATABASE_URL` at construction time;
 *   it is never logged, never persisted, and never surfaced in error
 *   messages.
 * - Lazily connect on the first query. The TCP connection is opened
 *   on the first query, so constructing `AuditPrismaService` does
 *   not require a running audit database. This allows the API to
 *   boot and serve Health and the transactional-store endpoints even
 *   when the audit database is not yet available; the audit outbox
 *   absorbs the events until the audit database recovers.
 * - Disconnect cleanly on module destruction via `OnModuleDestroy`.
 *
 * Non-responsibilities:
 * - This service does not import from `@ibn-hayan/domain`. It
 *   exposes the raw audit Prisma client; mapping between Prisma row
 *   types and the audit-event draft type is the responsibility of
 *   the audit-store repository under
 *   `apps/api/src/modules/audit/`.
 * - This service does not log queries. Query logging is forbidden
 *   because it could expose audit data or identifier hashes.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * audit-store runtime role has only INSERT and SELECT privileges on
 * `audit_events` and INSERT, UPDATE, and SELECT on
 * `audit_chain_heads`. The immutability triggers on `audit_events`
 * reject UPDATE, DELETE, and TRUNCATE at the database level. This
 * service does not attempt to work around the triggers; the
 * audit-store repository exposes only `append` and `read` methods.
 */
@Injectable()
export class AuditPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AuditPrismaService.name);

  constructor() {
    const auditDatabaseUrl = process.env['AUDIT_DATABASE_URL'];

    if (auditDatabaseUrl && auditDatabaseUrl.length > 0) {
      const adapter = new PrismaPg({ connectionString: auditDatabaseUrl });
      super({ adapter });
    } else {
      // No AUDIT_DATABASE_URL — construct with a placeholder
      // adapter. The TCP connection is lazy (opened on the first
      // query), so the placeholder is never used unless a query is
      // made. This allows the API to boot for Health and for
      // transactional-store endpoints even when the audit database
      // is not configured. The audit outbox absorbs events until
      // the audit database is configured and the dispatcher is
      // invoked.
      const placeholderAdapter = new PrismaPg({
        connectionString:
          'postgresql://placeholder:placeholder@127.0.0.1:1/placeholder',
      });
      super({ adapter: placeholderAdapter });
    }
  }

  onModuleInit(): void {
    this.logger.debug('AuditPrismaService initialised (lazy connection)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.debug('AuditPrismaService disconnected');
  }
}
