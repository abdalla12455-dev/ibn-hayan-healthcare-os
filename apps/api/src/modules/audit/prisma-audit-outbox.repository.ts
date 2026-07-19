import { Injectable, Inject, Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type {
  AuditOutboxPort,
  PendingOutboxEvent,
  AuditEventDraft,
} from '@ibn-hayan/observability';
import { AUDIT_OUTBOX_PORT } from '@ibn-hayan/observability';

/**
 * Prisma-backed implementation of the audit outbox port.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * audit outbox is a delivery mechanism from the transactional store
 * to the dedicated audit store. This implementation:
 *
 * - Inserts outbox rows in the caller's transaction (when supplied)
 *   or in its own transaction (when not supplied).
 * - Claims pending outbox rows using PostgreSQL-safe concurrent
 *   claiming (`FOR UPDATE SKIP LOCKED` inside a transaction, with
 *   an atomic `UPDATE` that assigns the lease).
 * - Marks outbox rows as delivered only after successful audit-store
 *   append AND only if the calling dispatcher still owns the active
 *   lease on the row.
 * - Records dispatch failures with backoff, also lease-gated.
 * - Releases expired leases so that abandoned work is reclaimed.
 *
 * Concurrency model (multi-dispatcher safe):
 *
 * 1. `claimPending` runs a single SQL statement that combines a
 *    bounded `SELECT ... FOR UPDATE SKIP LOCKED` with an `UPDATE`
 *    that sets `lease_owner` and `lease_expires_at` atomically. The
 *    `FOR UPDATE SKIP LOCKED` locks each candidate row exclusively
 *    until the transaction commits; rows already locked by another
 *    dispatcher are silently skipped. The lock + update pair is a
 *    single statement, so no other dispatcher can race between the
 *    select and the update.
 * 2. `markDelivered` and `recordFailure` use a `WHERE` clause that
 *    requires `lease_owner = $leaseOwner AND lease_expires_at > NOW()`.
 *    If another dispatcher has stolen the lease after expiry, the
 *    update affects zero rows and the call returns `false`. The
 *    original dispatcher then knows it has lost the lease and must
 *    not report the event as delivered.
 * 3. `releaseExpiredLeases` clears `lease_owner` and
 *    `lease_expires_at` for any row whose lease has expired. This
 *    makes the row available for the next `claimPending` cycle.
 *
 * The implementation uses raw SQL for the claiming and update
 * queries because Prisma 7's query builder does not support
 * `FOR UPDATE SKIP LOCKED`. The raw SQL is parameterised; no user
 * input is interpolated. The `leaseOwner` string is validated to
 * match `^[A-Za-z0-9_-]{1,80}$` before being used as a parameter,
 * so even if a buggy caller attempted to inject SQL through the
 * lease owner, the validation would reject it.
 */
@Injectable()
export class PrismaAuditOutboxRepository implements AuditOutboxPort {
  private readonly logger = new Logger(PrismaAuditOutboxRepository.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Insert an outbox row. The `canonicalEventDraft` is serialised to
   * JSON and stored in the `canonical_event_draft` JSONB column.
   *
   * If the caller supplies a transaction (a Prisma transaction
   * client), the insert is performed in that transaction. Otherwise,
   * the insert is performed in its own transaction.
   *
   * Returns `true` on success, `false` if the outbox is unavailable.
   */
  async insert(
    draft: AuditEventDraft,
    options?: { readonly transaction?: unknown },
  ): Promise<boolean> {
    // Store the draft as a JSONB object (not a stringified string).
    // Prisma serializes the object to JSONB automatically; when read
    // back, the JSONB is parsed into an object with the same shape.
    // If we stored `JSON.stringify(draft)` (a string), Prisma would
    // store it as a JSON string value, and when read back the
    // `canonical_event_draft` column would return a string, not an
    // object.
    const draftJson = draft as unknown as Prisma.InputJsonValue;
    const tx = options?.transaction as Prisma.TransactionClient | undefined;
    try {
      if (tx !== undefined) {
        await tx.auditOutboxEvent.create({
          data: {
            eventId: draft.eventId,
            eventVersion: draft.eventVersion,
            canonicalEventDraft: draftJson,
            createdAt: new Date(draft.occurredAt),
            // availableAt is NOT set; the database default
            // (CURRENT_TIMESTAMP) is used. This ensures the
            // available_at value is the database server's time,
            // which is consistent with the NOW() used in the
            // claimPending query. Using the Node.js time would
            // cause clock-skew issues.
          },
        });
      } else {
        await this.prisma.auditOutboxEvent.create({
          data: {
            eventId: draft.eventId,
            eventVersion: draft.eventVersion,
            canonicalEventDraft: draftJson,
            createdAt: new Date(draft.occurredAt),
          },
        });
      }
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to insert audit outbox row for event ${draft.eventId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  /**
   * Claim a bounded batch of pending outbox rows for dispatch.
   *
   * Per the ninth canonical batch specification, the claiming
   * mechanism MUST be safe for concurrent dispatchers. The
   * implementation uses a single SQL statement that combines:
   *
   *   - a bounded `SELECT ... FOR UPDATE SKIP LOCKED` inside a CTE,
   *   - an `UPDATE` that sets `lease_owner` and `lease_expires_at`
   *     on the selected rows,
   *   - a final `SELECT` that returns the claimed rows.
   *
   * All three steps run in a single transaction; the row locks are
   * held until commit. Two dispatchers running this query
   * concurrently will claim disjoint sets of rows: each row's
   * exclusive lock is held by exactly one dispatcher until that
   * dispatcher's transaction commits.
   *
   * The query is reviewed raw SQL (per ADR-012 §1.4 safeguard 3).
   * It is PostgreSQL-specific (uses `FOR UPDATE SKIP LOCKED`, which
   * is a PostgreSQL extension). All parameters are passed through
   * Prisma's parameterised query mechanism; no input is
   * interpolated.
   *
   * The `leaseOwner` is validated by `assertLeaseOwner` before
   * being used. The `leaseDurationMs` is converted to a timestamp
   * server-side via `NOW() + ($leaseDurationMs || ' milliseconds')::interval`,
   * which avoids clock skew between the application and the
   * database.
   */
  async claimPending(
    batchSize: number,
    leaseOwner: string,
    leaseDurationMs: number,
  ): Promise<PendingOutboxEvent[]> {
    assertLeaseOwner(leaseOwner);
    if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
      throw new Error(
        `claimPending: batchSize must be a positive integer (got ${batchSize}).`,
      );
    }
    if (
      !Number.isSafeInteger(leaseDurationMs) ||
      leaseDurationMs <= 0 ||
      leaseDurationMs > 24 * 60 * 60 * 1000
    ) {
      throw new Error(
        `claimPending: leaseDurationMs must be a positive integer ≤ 24h (got ${leaseDurationMs}).`,
      );
    }

    try {
      // The query is structured as:
      //
      //   WITH claimed AS (
      //     SELECT id FROM audit_outbox_events
      //     WHERE delivered_at IS NULL
      //       AND available_at <= NOW()
      //       AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
      //     ORDER BY available_at ASC
      //     LIMIT $batchSize
      //     FOR UPDATE SKIP LOCKED
      //   )
      //   UPDATE audit_outbox_events AS o
      //   SET lease_owner = $leaseOwner,
      //       lease_expires_at = NOW() + ($leaseDurationMs || ' milliseconds')::interval
      //   FROM claimed
      //   WHERE o.id = claimed.id
      //   RETURNING o.id, o.event_id, o.event_version,
      //             o.canonical_event_draft, o.created_at,
      //             o.available_at, o.attempt_count,
      //             o.lease_owner, o.lease_expires_at;
      //
      // The CTE's `FOR UPDATE SKIP LOCKED` is the structural
      // enforcement of multi-dispatcher safety: rows locked by
      // another dispatcher's in-flight transaction are skipped,
      // not blocked on. This means two dispatchers running the
      // query concurrently will not block each other; they will
      // each claim a disjoint subset of the available rows.
      //
      // The `UPDATE ... FROM claimed` is the atomic lease
      // assignment: it sets the lease metadata on the claimed
      // rows in the same statement that holds the row locks. The
      // locks are released when the surrounding transaction
      // commits, at which point the lease metadata is already
      // persisted.
      //
      // The `RETURNING` clause returns the claimed rows with
      // their new lease metadata, so the dispatcher has
      // everything it needs to deliver them and to mark them
      // delivered with the lease owner.
      //
      // The query is wrapped in `$transaction` so that the row
      // locks are held by a single transaction. Prisma's
      // `$queryRaw` inside a `$transaction` callback runs on the
      // transaction's connection, so the locks are held until
      // the callback returns and the transaction commits.
      const rows = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.$queryRaw<
          Array<{
            id: string;
            event_id: string;
            event_version: number;
            canonical_event_draft: unknown;
            created_at: Date;
            available_at: Date;
            attempt_count: number;
            lease_owner: string;
            lease_expires_at: Date;
          }>
        >`
          WITH claimed AS (
            SELECT "id" FROM "audit_outbox_events"
            WHERE "delivered_at" IS NULL
              AND "available_at" <= NOW()
              AND ("lease_expires_at" IS NULL OR "lease_expires_at" < NOW())
            ORDER BY "available_at" ASC
            LIMIT ${batchSize}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE "audit_outbox_events" AS o
          SET "lease_owner" = ${leaseOwner},
              "lease_expires_at" = NOW() + (${leaseDurationMs}::text || ' milliseconds')::interval
          FROM claimed
          WHERE o."id" = claimed."id"
          RETURNING o."id", o."event_id", o."event_version",
                    o."canonical_event_draft", o."created_at",
                    o."available_at", o."attempt_count",
                    o."lease_owner", o."lease_expires_at"
        `;
        return claimed;
      });

      return rows.map((row) => ({
        id: row.id,
        eventId: row.event_id,
        eventVersion: row.event_version,
        canonicalEventDraft: row.canonical_event_draft as AuditEventDraft,
        createdAt: row.created_at.toISOString(),
        availableAt: row.available_at.toISOString(),
        attemptCount: row.attempt_count,
        leaseOwner: row.lease_owner,
        leaseExpiresAt: row.lease_expires_at.toISOString(),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `claimPending failed for leaseOwner=${leaseOwner}: ${message}`,
      );
      // Return an empty array rather than throwing: the dispatcher
      // will retry on the next cycle. This matches the contract's
      // promise that `claimPending` returns "the claimed rows
      // (possibly empty)".
      return [];
    }
  }

  /**
   * Mark an outbox row as delivered.
   *
   * Per the ninth canonical batch specification, the implementation
   * atomically verifies that the calling dispatcher still owns the
   * active lease on the row. If the lease does not match (because
   * another dispatcher stole it after expiry, or because the row
   * was never claimed by this dispatcher), the update affects zero
   * rows and the call returns `false`.
   *
   * A delivered row is never reclaimed: the `WHERE delivered_at IS
   * NULL` clause prevents an already-delivered row from being
   * re-marked, and the lease check prevents a stale dispatcher
   * from marking a row delivered after its lease was reassigned.
   */
  async markDelivered(id: string, leaseOwner: string): Promise<boolean> {
    assertLeaseOwner(leaseOwner);
    const result = await this.prisma.auditOutboxEvent.updateMany({
      where: {
        id,
        deliveredAt: null,
        leaseOwner,
        leaseExpiresAt: { gt: new Date() },
      },
      data: {
        deliveredAt: new Date(),
        // Clear the lease so the row is no longer considered
        // claimed. A delivered row is never reclaimed, but clearing
        // the lease keeps the table tidy and makes the partial
        // index on `lease_expires_at` smaller.
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    return result.count > 0;
  }

  /**
   * Record a dispatch failure on an outbox row.
   *
   * Per the ninth canonical batch specification, the implementation
   * atomically verifies that the calling dispatcher still owns the
   * active lease on the row. If the lease does not match, the
   * update affects zero rows and the call returns `false`.
   */
  async recordFailure(
    id: string,
    failureCode: string,
    backoffMs: number,
    leaseOwner: string,
  ): Promise<boolean> {
    assertLeaseOwner(leaseOwner);
    if (typeof failureCode !== 'string' || failureCode.length === 0) {
      throw new Error(
        `recordFailure: failureCode must be a non-empty string (got ${String(failureCode)}).`,
      );
    }
    if (failureCode.length > 60) {
      throw new Error(
        `recordFailure: failureCode must be ≤ 60 chars (got ${failureCode.length}).`,
      );
    }
    if (
      !Number.isSafeInteger(backoffMs) ||
      backoffMs < 0 ||
      backoffMs > 24 * 60 * 60 * 1000
    ) {
      throw new Error(
        `recordFailure: backoffMs must be a non-negative integer ≤ 24h (got ${backoffMs}).`,
      );
    }

    const now = new Date();
    const availableAt = new Date(now.getTime() + backoffMs);
    const result = await this.prisma.auditOutboxEvent.updateMany({
      where: {
        id,
        deliveredAt: null,
        leaseOwner,
        leaseExpiresAt: { gt: now },
      },
      data: {
        attemptCount: { increment: 1 },
        lastFailureCode: failureCode,
        lastFailureAt: now,
        availableAt,
        // Clear the lease so the row can be re-claimed after the
        // backoff.
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    return result.count > 0;
  }

  /**
   * Release leases that have expired. Called by the dispatcher
   * sweep before claiming.
   *
   * An expired lease is one whose `lease_expires_at` is in the
   * past. The release clears `lease_owner` and `lease_expires_at`
   * so the row can be re-claimed by any dispatcher in the next
   * `claimPending` cycle.
   *
   * A delivered row is never reclaimed: the `WHERE delivered_at IS
   * NULL` clause ensures the release only affects pending rows.
   */
  async releaseExpiredLeases(now: Date): Promise<number> {
    const result = await this.prisma.auditOutboxEvent.updateMany({
      where: {
        deliveredAt: null,
        leaseExpiresAt: { lt: now },
      },
      data: {
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    return result.count;
  }
}

/**
 * Validate that a lease owner string matches the safe format
 * `^[A-Za-z0-9_-]{1,80}$`. Throws on invalid input.
 *
 * The lease owner is generated by the dispatcher (a UUID-based
 * string) and is never derived from user input. This validation is
 * defence-in-depth: even if a buggy caller attempted to pass an
 * unsafe string, the validation would reject it before the string
 * reached the parameterised SQL query.
 *
 * The `lease_owner` column is `VARCHAR(80)`, so the length bound
 * matches the column.
 */
function assertLeaseOwner(leaseOwner: string): void {
  if (typeof leaseOwner !== 'string') {
    throw new Error(`leaseOwner must be a string (got ${typeof leaseOwner}).`);
  }
  if (leaseOwner.length === 0 || leaseOwner.length > 80) {
    throw new Error(
      `leaseOwner must be 1..80 chars (got ${leaseOwner.length}).`,
    );
  }
  if (!/^[A-Za-z0-9_-]+$/.test(leaseOwner)) {
    throw new Error(
      `leaseOwner must match ^[A-Za-z0-9_-]+$ (got ${JSON.stringify(leaseOwner)}).`,
    );
  }
}

/**
 * DI token for the audit outbox port. Re-exported here for
 * convenience; the canonical token lives in `@ibn-hayan/observability`.
 */
export { AUDIT_OUTBOX_PORT };
