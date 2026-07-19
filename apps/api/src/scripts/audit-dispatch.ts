import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AuditDispatcherService } from '../modules/audit/audit-dispatcher.service.js';
import { Logger } from '@nestjs/common';

/**
 * Audit dispatch CLI script.
 *
 * Usage:
 *   pnpm --filter @ibn-hayan/api audit:dispatch
 *
 * Per ADR-014 §9 and the ninth canonical batch specification, the
 * dispatcher can be invoked explicitly through this CLI script. The
 * script:
 *
 * 1. Bootstraps the NestJS application context (does NOT start
 *    listening for HTTP requests).
 * 2. Resolves the `AuditDispatcherService` from the DI container.
 * 3. Runs one dispatch cycle.
 * 4. Prints a summary.
 * 5. Closes the application context and exits.
 *
 * The script does NOT introduce a new infrastructure dependency. It
 * uses the same PostgreSQL-safe claiming mechanism as the in-process
 * periodic timer.
 *
 * The script does NOT push commits, modify the database schema, or
 * expose the real `.env`. It only reads `AUDIT_DATABASE_URL`,
 * `AUDIT_INTEGRITY_HMAC_KEY`, `AUDIT_INTEGRITY_KEY_VERSION`, and
 * `AUDIT_IDENTIFIER_HMAC_KEY` from the process environment.
 */

async function main(): Promise<void> {
  const logger = new Logger('audit:dispatch');

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  try {
    const dispatcher = app.get(AuditDispatcherService);
    const summary = await dispatcher.dispatchOnce();
    logger.log(
      `Dispatch cycle complete: claimed=${summary.claimed} ` +
        `delivered=${summary.delivered} idempotent=${summary.idempotent} ` +
        `transient_failures=${summary.transientFailures} ` +
        `permanent_failures=${summary.permanentFailures}`,
    );

    if (summary.permanentFailures > 0) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);

  console.error('audit:dispatch failed:', message);
  process.exit(1);
});
