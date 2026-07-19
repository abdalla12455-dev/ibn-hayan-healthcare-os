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
 *
 * Per the ninth canonical batch specification, the lease must be
 * long enough to cover the audit-store append round-trip but short
 * enough that an abandoned lease is reclaimed quickly. The default
 * is 30 seconds; tests use a shorter duration (e.g. 500ms) to
 * verify lease expiry and reclamation without waiting 30 seconds.
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
 * 1. Claims a bounded batch of pending outbox records using
 *    PostgreSQL-safe concurrent claiming (`FOR UPDATE SKIP LOCKED`
 *    with an atomic lease assignment).
 * 2. Appends each claimed record to the dedicated audit store.
 * 3. Marks each claimed record delivered only after successful
 *    audit-store insertion AND only if the dispatcher still owns
 *    the active lease on the record.
 * 4. Treats an existing `eventId` in the audit store as an
 *    idempotent success.
 * 5. Uses bounded retry with stable failure codes.
 * 6. Releases or expires abandoned leases safely.
 * 7. Persists a non-recursive `audit.delivery.failed` audit event
 *    when delivery permanently fails.
 *
 * Multi-dispatcher safety:
 * - Two or more dispatcher instances may run concurrently.
 * - No outbox event is delivered more than once in effect (the
 *   audit store's unique constraint on `event_id` is the structural
 *   backstop; the lease ownership check prevents double-marking).
 * - No event is permanently stranded after a dispatcher crashes
 *   (expired leases are reclaimed by `releaseExpiredLeases`).
 * - An expired lease can be reclaimed by any dispatcher in the
 *   next `claimPending` cycle.
 * - A delivered event is never reclaimed (the `delivered_at IS
 *   NULL` clause in `markDelivered`).
 * - One dispatcher cannot mark an event delivered when another
 *   dispatcher owns its active lease (the lease ownership check
 *   in `markDelivered`).
 * - Failed delivery releases the event through retry or lease
 *   expiry (the `recordFailure` call clears the lease so the
 *   event is re-claimable after the backoff).
 *
 * The dispatcher is invoked by:
 * - The `audit:dispatch` CLI command (`src/scripts/audit-dispatch.ts`).
 * - The in-process periodic timer (if enabled in the API module).
 * - Explicit test invocation.
 *
 * The dispatcher does NOT introduce a new infrastructure dependency
 * (no Redis, Kafka, RabbitMQ, or BullMQ). The claiming mechanism is
 * PostgreSQL-native.
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
    // The identifier is a random UUID prefixed with `dispatcher-` so
    // it is human-readable in operational queries. Two dispatcher
    // instances in the same process have different identifiers, so
    // the periodic timer and a manual invocation cannot collide.
    this.leaseOwner = `dispatcher-${randomUUID()}`;
  }

  /**
   * The lease owner identifier used by this dispatcher instance.
   * Exposed for testing: tests verify that two dispatcher instances
   * have different lease owners.
   */
  getLeaseOwner(): string {
    return this.leaseOwner;
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

    // Release any expired leases from previous cycles (including
    // leases held by dispatchers that have crashed). This makes
    // abandoned rows available for claiming in this cycle.
    const released = await this.outbox.releaseExpiredLeases(new Date());
    if (released > 0) {
      this.logger.debug(`Released ${released} expired lease(s).`);
    }

    // Claim a batch. The claim is atomic: the rows are locked and
    // their lease metadata is set in a single SQL statement. No
    // other dispatcher can claim the same rows in this cycle.
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
        lostLeases: 0,
      };
    }

    let delivered = 0;
    let idempotent = 0;
    let transientFailures = 0;
    let permanentFailures = 0;
    let lostLeases = 0;

    for (const event of pending) {
      const result = await this.dispatchOne(event);
      switch (result.kind) {
        case 'delivered':
        case 'idempotent_success': {
          // Mark delivered only if we still own the lease. If the
          // lease expired (e.g. the audit-store append took longer
          // than the lease duration) and another dispatcher stole
          // the row and delivered it, our markDelivered call will
          // return false. We must NOT report the event as
          // delivered in that case.
          const marked = await this.outbox.markDelivered(
            event.id,
            this.leaseOwner,
          );
          if (marked) {
            if (result.kind === 'delivered') {
              delivered++;
            } else {
              idempotent++;
            }
          } else {
            // We lost the lease. Another dispatcher may have
            // already delivered the event (idempotently) or may
            // be in the process of doing so. We must not double-
            // count.
            lostLeases++;
            this.logger.warn(
              `Lost lease on event ${event.eventId} before markDelivered; another dispatcher may have delivered it.`,
            );
          }
          break;
        }
        case 'transient_failure': {
          // Record the failure only if we still own the lease. If
          // we lost the lease, another dispatcher will retry.
          const recorded = await this.outbox.recordFailure(
            event.id,
            result.failureCode,
            this.computeBackoff(event.attemptCount + 1),
            this.leaseOwner,
          );
          if (recorded) {
            transientFailures++;
            this.logger.warn(
              `Transient dispatch failure for event ${event.eventId}: ${result.failureCode}`,
            );
          } else {
            lostLeases++;
            this.logger.warn(
              `Lost lease on event ${event.eventId} before recordFailure; another dispatcher will retry.`,
            );
          }
          break;
        }
        case 'permanent_failure': {
          if (event.attemptCount + 1 >= MAX_ATTEMPTS) {
            // Mark as permanently failed by recording the failure
            // with a stable code. The row remains pending; an
            // `audit.delivery.failed` event is emitted through
            // the non-recursive failure record path.
            const recorded = await this.outbox.recordFailure(
              event.id,
              result.failureCode,
              MAX_BACKOFF_MS,
              this.leaseOwner,
            );
            if (recorded) {
              permanentFailures++;
              this.logger.error(
                `Permanent dispatch failure for event ${event.eventId}: ${result.failureCode}`,
              );
              // Emit a non-recursive audit.delivery.failed event.
              // This event is emitted directly to the audit store
              // (NOT through the outbox) to prevent infinite
              // recursion. The event records that delivery of
              // `event.eventId` permanently failed.
              await this.emitDeliveryFailureEvent(event, result.failureCode);
            } else {
              lostLeases++;
            }
          } else {
            // Treat as transient — the dispatcher will retry.
            const recorded = await this.outbox.recordFailure(
              event.id,
              result.failureCode,
              this.computeBackoff(event.attemptCount + 1),
              this.leaseOwner,
            );
            if (recorded) {
              transientFailures++;
            } else {
              lostLeases++;
            }
          }
          break;
        }
      }
    }

    return {
      claimed: pending.length,
      delivered,
      idempotent,
      transientFailures,
      permanentFailures,
      lostLeases,
    };
  }

  /**
   * Dispatch a single outbox event to the audit store.
   *
   * Maps the `AuditAppendResult` (returned by the audit-store
   * append port) to the `DispatchResult` (used by the dispatcher's
   * internal state machine). The mapping is:
   *   - `appended` → `delivered` (the event was appended to the
   *     audit store for the first time).
   *   - `idempotent_success` → `idempotent_success` (the event was
   *     already in the audit store; no duplicate was created).
   *   - `transient_failure` → `transient_failure`.
   *   - `permanent_failure` → `permanent_failure`.
   *
   * The mapping is necessary because the audit-store append port
   * uses `appended` (which carries extra fields `chainScope` and
   * `chainSequence`) while the dispatcher's state machine uses
   * `delivered` (which carries no extra fields). A simple cast
   * would preserve the runtime `kind` value of `appended`, which
   * would not match the `delivered` case in the dispatcher's
   * switch statement.
   */
  private async dispatchOne(
    event: PendingOutboxEvent,
  ): Promise<DispatchResult> {
    try {
      const result = await this.auditStore.append(event.canonicalEventDraft);
      if (result.kind === 'appended') {
        return { kind: 'delivered' };
      }
      if (result.kind === 'idempotent_success') {
        return { kind: 'idempotent_success' };
      }
      // transient_failure and permanent_failure map directly.
      return result;
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
   * Emit a non-recursive `audit.delivery.failed` event when
   * delivery of an outbox event permanently fails.
   *
   * Per the ninth canonical batch specification, this event is
   * emitted DIRECTLY to the audit store (NOT through the outbox)
   * to prevent infinite recursion. If this direct emission itself
   * fails, the failure is logged but no further action is taken;
   * the original outbox event remains pending with its
   * `last_failure_code` set, and an operator can investigate.
   *
   * The event is platform-scoped (no tenant) and carries only safe
   * metadata: the failed event's `eventId`, the failure code, and
   * the attempt count. No raw exception messages, connection
   * strings, or secrets are included.
   */
  private async emitDeliveryFailureEvent(
    event: PendingOutboxEvent,
    failureCode: string,
  ): Promise<void> {
    try {
      // Build a minimal audit event draft directly. We do NOT use
      // the AuditHelperService here because that would route the
      // event through the outbox, which would create infinite
      // recursion (the failed event is itself an outbox row). We
      // append directly to the audit store.
      //
      // The `audit.delivery.failed` event is emitted with source
      // `dispatcher` (not `api`) to distinguish it from
      // application-emitted events.
      const { buildAuditEventDraft } = await import('@ibn-hayan/observability');
      const buildResult = buildAuditEventDraft({
        action: 'audit.delivery.failed',
        outcome: 'failure',
        reasonCode: failureCode,
        source: 'dispatcher',
        actorType: 'SYSTEM',
        resourceType: 'audit_outbox_event',
        resourceId: event.eventId,
        scope: 'audit_delivery',
        metadata: {
          failedEventId: event.eventId,
          failureCode,
          attemptCount: event.attemptCount,
        },
      });
      if (!buildResult.ok) {
        this.logger.error(
          `Failed to build audit.delivery.failed event for ${event.eventId}: ${buildResult.reason} — ${buildResult.detail}`,
        );
        return;
      }
      const appendResult = await this.auditStore.append(buildResult.draft);
      if (appendResult.kind === 'appended') {
        this.logger.debug(
          `Emitted audit.delivery.failed event for ${event.eventId} (failureCode=${failureCode}).`,
        );
      } else if (appendResult.kind === 'idempotent_success') {
        // The audit.delivery.failed event was already emitted for
        // this failed event. This is fine; we don't double-emit.
        this.logger.debug(
          `audit.delivery.failed event for ${event.eventId} already exists (idempotent).`,
        );
      } else {
        // The audit store could not accept the audit.delivery.failed
        // event. Log the failure but do not recurse.
        this.logger.error(
          `Failed to persist audit.delivery.failed event for ${event.eventId}: ${appendResult.kind === 'transient_failure' || appendResult.kind === 'permanent_failure' ? appendResult.failureCode : 'unknown'}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `emitDeliveryFailureEvent threw for ${event.eventId}: ${message}`,
      );
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
  /**
   * The number of claimed events for which the dispatcher lost the
   * lease before it could mark them delivered or failed. A non-zero
   * value indicates that another dispatcher took over the events
   * (likely because the audit-store append took longer than the
   * lease duration). The events are NOT lost; they are either
   * delivered by the other dispatcher or remain pending.
   */
  readonly lostLeases: number;
}
