import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AuditOutboxPort,
  AuditStoreAppendPort,
  DispatchResult,
  PendingOutboxEvent,
} from '@ibn-hayan/observability';
import {
  AUDIT_OUTBOX_PORT,
  AUDIT_STORE_APPEND_PORT,
} from '@ibn-hayan/observability';

/**
 * The default batch size for dispatch claiming.
 */
const DEFAULT_BATCH_SIZE = 50;

/**
 * The default lease duration in milliseconds.
 */
const DEFAULT_LEASE_DURATION_MS = 30_000;

/**
 * The default backoff base in milliseconds. The actual backoff is
 * `base * 2^attempt` with jitter, bounded by `MAX_BACKOFF_MS`.
 */
const DEFAULT_BACKOFF_BASE_MS = 1_000;

/**
 * The maximum backoff in milliseconds.
 */
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

/**
 * The maximum number of attempts before an event is considered
 * permanently failed.
 */
const MAX_ATTEMPTS = 20;

/**
 * The audit dispatcher.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * dispatcher:
 *
 * 1. Claims a bounded batch of pending outbox records.
 * 2. Appends them to the dedicated audit store.
 * 3. Marks them delivered only after successful audit-store
 *    insertion.
 * 4. Treats an existing `eventId` as an idempotent success.
 * 5. Uses bounded retry with stable failure codes.
 * 6. Does not place secrets or full exception messages in the
 *    outbox.
 * 7. Releases or expires abandoned leases safely.
 * 8. Supports explicit test invocation.
 * 9. Supports startup or periodic retry without introducing a new
 *    infrastructure dependency.
 *
 * The dispatcher is invoked by:
 * - The `audit:dispatch` CLI command (`src/scripts/audit-dispatch.ts`).
 * - The in-process periodic timer (if enabled in the API module).
 * - Explicit test invocation.
 *
 * The dispatcher does NOT introduce a new infrastructure dependency
 * (no Redis, Kafka, RabbitMQ, or BullMQ). The claiming mechanism is
 * PostgreSQL-native (`FOR UPDATE SKIP LOCKED`).
 */
@Injectable()
export class AuditDispatcherService {
  private readonly logger = new Logger(AuditDispatcherService.name);
  private readonly leaseOwner: string;

  constructor(
    @Inject(AUDIT_OUTBOX_PORT) private readonly outbox: AuditOutboxPort,
    @Inject(AUDIT_STORE_APPEND_PORT)
    private readonly auditStore: AuditStoreAppendPort,
  ) {
    // Each dispatcher instance has a unique lease owner identifier.
    // This prevents two dispatcher instances from claiming the same
    // row in the same process (which could happen if the periodic
    // timer fires while a manual invocation is still running).
    this.leaseOwner = `dispatcher-${randomUUID()}`;
  }

  /**
   * Run one dispatch cycle.
   *
   * Claims a batch of pending outbox rows, appends each to the
   * audit store, and marks each delivered or failed.
   *
   * Returns a summary of the cycle.
   */
  async dispatchOnce(options?: {
    readonly batchSize?: number;
    readonly leaseDurationMs?: number;
  }): Promise<DispatchCycleSummary> {
    const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
    const leaseDurationMs =
      options?.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;

    // Release any expired leases from previous cycles.
    const released = await this.outbox.releaseExpiredLeases(new Date());
    if (released > 0) {
      this.logger.debug(`Released ${released} expired lease(s).`);
    }

    // Claim a batch.
    const pending = await this.outbox.claimPending(
      batchSize,
      this.leaseOwner,
      leaseDurationMs,
    );

    if (pending.length === 0) {
      return {
        claimed: 0,
        delivered: 0,
        idempotent: 0,
        transientFailures: 0,
        permanentFailures: 0,
      };
    }

    let delivered = 0;
    let idempotent = 0;
    let transientFailures = 0;
    let permanentFailures = 0;

    for (const event of pending) {
      const result = await this.dispatchOne(event);
      switch (result.kind) {
        case 'delivered':
          await this.outbox.markDelivered(event.id);
          delivered++;
          break;
        case 'idempotent_success':
          await this.outbox.markDelivered(event.id);
          idempotent++;
          break;
        case 'transient_failure':
          await this.outbox.recordFailure(
            event.id,
            result.failureCode,
            this.computeBackoff(event.attemptCount + 1),
          );
          transientFailures++;
          this.logger.warn(
            `Transient dispatch failure for event ${event.eventId}: ${result.failureCode}`,
          );
          break;
        case 'permanent_failure':
          if (event.attemptCount + 1 >= MAX_ATTEMPTS) {
            // Mark as permanently failed by recording the failure
            // with a stable code. The row remains pending; an
            // `audit.delivery.failed` event should be emitted
            // (best-effort).
            await this.outbox.recordFailure(
              event.id,
              result.failureCode,
              MAX_BACKOFF_MS,
            );
            permanentFailures++;
            this.logger.error(
              `Permanent dispatch failure for event ${event.eventId}: ${result.failureCode}`,
            );
          } else {
            // Treat as transient — the dispatcher will retry.
            await this.outbox.recordFailure(
              event.id,
              result.failureCode,
              this.computeBackoff(event.attemptCount + 1),
            );
            transientFailures++;
          }
          break;
      }
    }

    return {
      claimed: pending.length,
      delivered,
      idempotent,
      transientFailures,
      permanentFailures,
    };
  }

  /**
   * Dispatch a single outbox event to the audit store.
   */
  private async dispatchOne(
    event: PendingOutboxEvent,
  ): Promise<DispatchResult> {
    try {
      const result = await this.auditStore.append(event.canonicalEventDraft);
      // `AuditAppendResult` is a superset of `DispatchResult` — the
      // `appended` and `idempotent_success` variants map directly,
      // and the `transient_failure` and `permanent_failure` variants
      // map directly. We cast because TypeScript cannot see that the
      // `appended` variant (which has extra fields `chainScope` and
      // `chainSequence`) is a valid `DispatchResult`.
      return result as DispatchResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Dispatch of event ${event.eventId} threw: ${message}`);
      return {
        kind: 'transient_failure',
        failureCode: 'dispatch_threw',
      };
    }
  }

  /**
   * Compute the backoff for a given attempt count. Uses exponential
   * backoff with jitter, bounded by MAX_BACKOFF_MS.
   */
  private computeBackoff(attemptCount: number): number {
    const exponent = Math.min(attemptCount, 10);
    const base = DEFAULT_BACKOFF_BASE_MS * Math.pow(2, exponent);
    const bounded = Math.min(base, MAX_BACKOFF_MS);
    // Add up to 25% jitter.
    const jitter = Math.random() * (bounded / 4);
    return Math.floor(bounded + jitter);
  }
}

/**
 * A summary of a single dispatch cycle.
 */
export interface DispatchCycleSummary {
  readonly claimed: number;
  readonly delivered: number;
  readonly idempotent: number;
  readonly transientFailures: number;
  readonly permanentFailures: number;
}
