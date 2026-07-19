/**
 * Audit outbox port.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * audit outbox is a port (interface) declared in
 * `packages/observability` and implemented by the API. The port
 * abstracts the outbox-persistence mechanism so that the dispatcher
 * and the audit-emission API do not depend on Prisma directly.
 *
 * The API's implementation of this port writes and reads
 * `AuditOutboxEvent` rows in the transactional database.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { AuditEventDraft } from './audit-event-draft.js';

/**
 * A pending outbox event ready for dispatch.
 *
 * The dispatcher claims a batch of these and appends each to the
 * audit store.
 */
export interface PendingOutboxEvent {
  /** The outbox row's primary key. */
  readonly id: string;
  /** The stable event identifier. */
  readonly eventId: string;
  /** The schema version of the event draft. */
  readonly eventVersion: number;
  /** The canonical event draft (deserialised from JSONB). */
  readonly canonicalEventDraft: AuditEventDraft;
  /** When the outbox row was inserted. */
  readonly createdAt: string;
  /** When the row became available for dispatch. */
  readonly availableAt: string;
  /** The number of dispatch attempts so far. */
  readonly attemptCount: number;
  /** The lease owner (dispatcher instance ID), if claimed. */
  readonly leaseOwner: string | null;
  /** When the lease expires, if claimed. */
  readonly leaseExpiresAt: string | null;
}

/**
 * The result of a dispatch attempt for a single outbox event.
 *
 * - `delivered`: The audit store acknowledged the event. The outbox
 *   row is marked delivered.
 * - `idempotent_success`: The audit store already has an event with
 *   this `eventId`. The outbox row is marked delivered without
 *   producing a duplicate audit record.
 * - `transient_failure`: The audit store could not accept the event
 *   (e.g. unavailable, integrity error). The outbox row remains
 *   pending; the dispatcher will retry.
 * - `permanent_failure`: The event is structurally invalid and will
 *   never be accepted. The outbox row remains pending with
 *   `last_failure_code` set; an `audit.delivery.failed` event is
 *   emitted to the platform chain.
 */
export type DispatchResult =
  | { readonly kind: 'delivered' }
  | { readonly kind: 'idempotent_success' }
  | {
      readonly kind: 'transient_failure';
      readonly failureCode: string;
    }
  | {
      readonly kind: 'permanent_failure';
      readonly failureCode: string;
    };

/**
 * The audit outbox port.
 *
 * The port exposes methods for:
 * - Inserting an outbox row (called by the audit-emission API).
 * - Claiming a batch of pending outbox rows (called by the
 *   dispatcher).
 * - Marking an outbox row as delivered (called by the dispatcher
 *   after successful audit-store append).
 * - Recording a dispatch failure (called by the dispatcher after a
 *   failed audit-store append).
 * - Releasing abandoned leases (called by the dispatcher sweep).
 */
export interface AuditOutboxPort {
  /**
   * Insert an outbox row in the caller's transaction. The caller is
   * responsible for supplying the transaction context; if no
   * transaction is supplied, the implementation opens its own.
   *
   * Returns `true` on success, `false` if the outbox is unavailable.
   */
  insert(
    draft: AuditEventDraft,
    options?: {
      readonly transaction?: unknown;
    },
  ): Promise<boolean>;

  /**
   * Claim a bounded batch of pending outbox rows for dispatch.
   *
   * The implementation uses PostgreSQL-safe claiming (`FOR UPDATE
   * SKIP LOCKED`). The `leaseOwner` is a dispatcher-instance
   * identifier; the `leaseDurationMs` is the lease duration. The
   * implementation sets `lease_owner` and `lease_expires_at` on the
   * claimed rows.
   *
   * Returns the claimed rows (possibly empty).
   */
  claimPending(
    batchSize: number,
    leaseOwner: string,
    leaseDurationMs: number,
  ): Promise<PendingOutboxEvent[]>;

  /**
   * Mark an outbox row as delivered. Called by the dispatcher after
   * successful audit-store append (or idempotent success).
   */
  markDelivered(id: string): Promise<void>;

  /**
   * Record a dispatch failure on an outbox row. Increments
   * `attempt_count`, sets `last_failure_code` and `last_failure_at`,
   * and sets `available_at` to a backoff-computed timestamp.
   */
  recordFailure(
    id: string,
    failureCode: string,
    backoffMs: number,
  ): Promise<void>;

  /**
   * Release leases that have expired. Called by the dispatcher
   * sweep before claiming. Returns the number of leases released.
   */
  releaseExpiredLeases(now: Date): Promise<number>;
}

/**
 * DI token for the audit outbox port.
 */
export const AUDIT_OUTBOX_PORT = Symbol('AUDIT_OUTBOX_PORT');
