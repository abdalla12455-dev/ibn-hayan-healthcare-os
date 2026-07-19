import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AuditIntegrityVerifierService } from '../modules/audit/audit-integrity-verifier.service.js';
import { Logger } from '@nestjs/common';
import type { AuditVerificationScope } from '@ibn-hayan/observability';

/**
 * Audit verify CLI script.
 *
 * Usage:
 *   pnpm --filter @ibn-hayan/api audit:verify [--scope=all|platform|tenant:<id>]
 *
 * Per ADR-014 §16 and the ninth canonical batch specification, the
 * verifier can verify a single tenant chain, the platform chain, or
 * all chains. The script:
 *
 * 1. Bootstraps the NestJS application context (does NOT start
 *    listening for HTTP requests).
 * 2. Resolves the `AuditIntegrityVerifierService` from the DI
 *    container.
 * 3. Parses the `--scope` argument (default: `all`).
 * 4. Runs the verifier.
 * 5. Prints the result.
 * 6. Exits with code 0 on success, code 1 on verification failure.
 *
 * The verifier does NOT expose integrity keys. The verifier does
 * NOT log the integrity key.
 */

function parseScope(arg: string | undefined): AuditVerificationScope {
  if (arg === undefined || arg === 'all') {
    return { kind: 'all' };
  }
  if (arg === 'platform') {
    return { kind: 'platform' };
  }
  if (arg.startsWith('tenant:')) {
    const tenantId = arg.slice('tenant:'.length);
    return { kind: 'tenant', tenantId };
  }
  throw new Error(
    `Invalid --scope argument: ${arg}. Expected 'all', 'platform', or 'tenant:<tenantId>'.`,
  );
}

async function main(): Promise<void> {
  const logger = new Logger('audit:verify');

  const scopeArg = process.argv.find((a) => a.startsWith('--scope='));
  const scopeValue = scopeArg?.slice('--scope='.length);
  const scope = parseScope(scopeValue);

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  try {
    const verifier = app.get(AuditIntegrityVerifierService);
    const result = await verifier.verify(scope);

    if (result.ok) {
      logger.log(
        `Verification OK: events_checked=${result.eventsChecked} ` +
          `chains_checked=${result.chainsChecked.length}`,
      );
      process.exitCode = 0;
    } else {
      logger.error(
        `Verification FAILED: events_checked=${result.eventsChecked} ` +
          `chains_checked=${result.chainsChecked.length} ` +
          `defects=${result.defects.length}`,
      );
      for (const defect of result.defects) {
        logger.error(
          `  defect: kind=${defect.kind} ` +
            `chain_scope=${'chainScope' in defect ? defect.chainScope : 'n/a'} ` +
            `detail=${defect.detail}`,
        );
      }
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);

  console.error('audit:verify failed:', message);
  process.exit(1);
});
