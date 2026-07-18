import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';

/**
 * Infrastructure-only wrapper around the Prisma client.
 *
 * Responsibilities:
 * - Construct the Prisma client with the `@prisma/adapter-pg` driver
 *   adapter. Prisma 7 requires a driver adapter; the schema's
 *   `datasource db { provider = "postgresql" }` declaration sets the
 *   provider, and the adapter supplies the actual connection. The
 *   connection string is read from `process.env.DATABASE_URL` at
 *   construction time; it is never logged, never persisted, and never
 *   surfaced in error messages.
 * - Lazily connect on the first query. Prisma's driver adapter does
 *   not open a TCP connection until the first query is issued, so
 *   constructing `PrismaService` does not require a running database.
 *   This satisfies the requirement that the API must start and serve
 *   Health without a database connection when no tenant repository is
 *   used (the Health module does not import the Database module).
 * - Disconnect cleanly on module destruction via `OnModuleDestroy`.
 *
 * Non-responsibilities:
 * - This service does not import from `@ibn-hayan/domain`. It exposes
 *   the raw Prisma client; mapping between Prisma row types and domain
 *   types is the responsibility of the repository adapters and
 *   mappers under `apps/api/src/infrastructure/database/`.
 * - This service does not log queries. Query logging is forbidden
 *   because it could later expose PHI (per CODING_STANDARDS.md §8
 *   "Logging and PHI Redaction"). The Prisma client is constructed
 *   without a `log` option.
 * - This service does not log `DATABASE_URL` or any connection-string
 *   fragment. Errors raised by Prisma are surfaced via the standard
 *   Nest exception layer; this service does not augment them with
 *   the connection string.
 *
 * Per ADR-012 §1.4 safeguard 2 (Repository interfaces), this service
 * is consumed only by the repository adapters in
 * `apps/api/src/infrastructure/database/repositories/`. The API's
 * feature modules depend on the repository interfaces from
 * `@ibn-hayan/domain`, not on `PrismaService` directly. This keeps
 * Prisma types out of the domain and out of feature-module signatures.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Read the connection string from the environment at construction
    // time. We do not use Nest's ConfigService here because doing so
    // would create a circular dependency: the Database module would
    // depend on ConfigModule, but ConfigModule is global and the
    // ConfigService is not guaranteed to be available before the
    // Database module's providers are constructed. Reading
    // `process.env.DATABASE_URL` directly is consistent with how
    // `prisma migrate deploy` and `prisma generate` resolve the URL
    // (see `prisma.config.ts`).
    const databaseUrl = process.env['DATABASE_URL'];
    if (!databaseUrl || databaseUrl.length === 0) {
      // The Health module does not import the Database module, so the
      // API can boot without a database. Any feature module that
      // imports the Database module, however, requires a usable
      // `DATABASE_URL`. We throw at construction time rather than at
      // first query so the failure is loud and early.
      throw new Error(
        'DATABASE_URL is not set. The API can serve Health without a ' +
          'database, but any feature module that imports the Database ' +
          'module requires DATABASE_URL to be set in the process environment.',
      );
    }

    // Construct the driver adapter. Prisma 7 requires a driver adapter;
    // the adapter is responsible for managing the underlying `pg` Pool.
    // The adapter is created here so that the Prisma client and the
    // adapter share a single connection pool. The pool is destroyed
    // when the Prisma client is disconnected in `onModuleDestroy`.
    const adapter = new PrismaPg({ connectionString: databaseUrl });

    // Construct the Prisma client with the adapter. No `log` option
    // is supplied: query logging is forbidden because it could later
    // expose PHI.
    super({ adapter });
  }

  /**
   * Hook invoked by Nest when the module is initialised. We do not
   * connect explicitly here: Prisma's driver adapter opens the
   * connection lazily on the first query. Calling `$connect()` would
   * force an eager connection that breaks the requirement that the
   * API must start without a database when no tenant repository is
   * used. The first query will fail at runtime if the database is not
   * available; that is the desired behaviour.
   */
  onModuleInit(): void {
    // Intentionally a no-op. See the method comment.
    this.logger.debug('PrismaService initialised (lazy connection)');
  }

  /**
   * Hook invoked by Nest when the module is destroyed. We disconnect
   * the Prisma client, which closes the underlying `pg` pool. This
   * is important for graceful shutdown: an unclosed pool keeps the
   * Node.js event loop alive and prevents the process from exiting.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.debug('PrismaService disconnected');
  }
}
