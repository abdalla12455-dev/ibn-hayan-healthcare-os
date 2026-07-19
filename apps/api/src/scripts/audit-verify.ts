import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AuditIntegrityVerifierService } from '../modules/audit/audit-integrity-verifier.service.js';
import { AuditHelperService } from '../modules/audit/audit-helper.service.js';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuditVerificationScope } from '@ibn-hayan/observability';
import { buildAuditEventDraft } from '@ibn-hayan/observability';

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
 * 5. Emits a `audit.integrity.verified` (on success) or
 *    `audit.integrity.verification_failed` (on failure) audit
 *    event directly to the audit store. The event is emitted
 *    DIRECTLY (NOT through the outbox) to prevent infinite
 *    recursion: if the event went through the outbox, the
 *    dispatcher would deliver it, and a future verifier run might
 *    verify the chain that contains the verification event itself,
 *    leading to recursive verification.
 * 6. Prints the result.
 * 7. Exits with code 0 on success, code 1 on verification failure.
 *
 * The verifier does NOT expose integrity keys. The verifier does
 * NOT log the integrity key.
 *
 * Recursion prevention: the `audit.integrity.verified` and
 * `audit.integrity.verification_failed` events are emitted with
 * source `verifier` (not `api` or `dispatcher`). The verifier
 * itself does NOT audit its own audit-store append. A future
 * verifier run will verify the chain that contains the
 * verification event, but that run will not re-emit a
 * verification event for itself — it will only emit a new
 * verification event for the explicit CLI invocation.
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
    const auditHelper = app.get(AuditHelperService);
    const result = await verifier.verify(scope);

    if (result.ok) {
      logger.log(
        `Verification OK: events_checked=${result.eventsChecked} ` +
          `chains_checked=${result.chainsChecked.length}`,
      );
      // Emit audit.integrity.verified. The event is emitted
      // DIRECTLY to the audit store via the audit helper's
      // `emitDirect` method, which routes through the
      // transactional outbox. The event's `source` is `verifier`
      // so it can be distinguished from API-emitted events. The
      // event does NOT include any integrity key material; the
      // metadata is limited to the scope and the events-checked
      // count.
      const buildResult = buildAuditEventDraft({
        action: 'audit.integrity.verified',
        outcome: 'success',
        source: 'verifier',
        actorType: 'SYSTEM',
        scope: 'audit_integrity',
        requestId: randomUUID(),
        metadata: {
          scopeKind: scope.kind,
          eventsChecked: result.eventsChecked,
          chainsChecked: result.chainsChecked.length,
        },
      });
      if (buildResult.ok) {
        const emitResult = await auditHelper.emitDirect(buildResult.draft);
        if (!emitResult.ok) {
          logger.warn(
            `Failed to emit audit.integrity.verified event: ${emitResult.reason} — ${emitResult.detail}`,
          );
        }
      }
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
      // Emit audit.integrity.verification_failed. The event is
      // emitted DIRECTLY to the audit store. The metadata is
      // limited to the scope, the events-checked count, and the
      // number of defects. No defect details are included in the
      // metadata to avoid leaking internal chain structure; the
      // full defect list is printed to the operational log.
      const buildResult = buildAuditEventDraft({
        action: 'audit.integrity.verification_failed',
        outcome: 'failure',
        reasonCode: 'integrity_verification_failed',
        source: 'verifier',
        actorType: 'SYSTEM',
        scope: 'audit_integrity',
        requestId: randomUUID(),
        metadata: {
          scopeKind: scope.kind,
          eventsChecked: result.eventsChecked,
          chainsChecked: result.chainsChecked.length,
          defectCount: result.defects.length,
          defectKinds: Array.from(new Set(result.defects.map((d) => d.kind))),
        },
      });
      if (buildResult.ok) {
        const emitResult = await auditHelper.emitDirect(buildResult.draft);
        if (!emitResult.ok) {
          logger.warn(
            `Failed to emit audit.integrity.verification_failed event: ${emitResult.reason} — ${emitResult.detail}`,
          );
        }
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
