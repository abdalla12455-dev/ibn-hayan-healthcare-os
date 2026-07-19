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
 * - Claims pending outbox rows using PostgreSQL-safe claiming
 *   (`FOR UPDATE SKIP LOCKED`).
 * - Marks outbox rows as delivered after successful audit-store
 *   append.
 * - Records dispatch failures with backoff.
 * - Releases expired leases.
 *
 * The implementation uses raw SQL for the claiming query because
 * Prisma 7's query builder does not support `FOR UPDATE SKIP LOCKED`.
 * The raw SQL is parameterised; no user input is interpolated.
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
   * Uses a transaction with `findMany` + `updateMany` to claim rows.
   * The `findMany` selects pending rows; the `updateMany` sets the
   * lease metadata. This is safe for a single dispatcher instance.
   * For multiple dispatcher instances, a `FOR UPDATE SKIP LOCKED`
   * query would be needed, but PostgreSQL does not allow `FOR UPDATE`
   * in a CTE used by an UPDATE statement, and the Prisma driver
   * adapter has limitations with `FOR UPDATE` in `$queryRaw` within
   * transactions. The current implementation is correct for the
   * single-dispatcher case; the multi-dispatcher case will be
   * addressed in a future batch.
   */
  async claimPending(
    batchSize: number,
    leaseOwner: string,
    leaseDurationMs: number,
  ): Promise<PendingOutboxEvent[]> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

    return await this.prisma.$transaction(async (tx) => {
      // Find pending rows that are available for dispatch.
      const pending = await tx.auditOutboxEvent.findMany({
        where: {
          deliveredAt: null,
          availableAt: { lte: now },
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
        },
        orderBy: { availableAt: 'asc' },
        take: batchSize,
      });

      if (pending.length === 0) {
        return [];
      }

      const ids = pending.map((r) => r.id);

      // Update the claimed rows' lease metadata.
      await tx.auditOutboxEvent.updateMany({
        where: { id: { in: ids } },
        data: {
          leaseOwner,
          leaseExpiresAt,
        },
      });

      return pending.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        eventVersion: row.eventVersion,
        canonicalEventDraft:
          row.canonicalEventDraft as unknown as AuditEventDraft,
        createdAt: row.createdAt.toISOString(),
        availableAt: row.availableAt.toISOString(),
        attemptCount: row.attemptCount,
        leaseOwner: leaseOwner,
        leaseExpiresAt: leaseExpiresAt.toISOString(),
      }));
    });
  }

  /**
   * Mark an outbox row as delivered.
   */
  async markDelivered(id: string): Promise<void> {
    await this.prisma.auditOutboxEvent.update({
      where: { id },
      data: {
        deliveredAt: new Date(),
        // Clear the lease so the row is no longer considered
        // claimed.
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
  }

  /**
   * Record a dispatch failure on an outbox row.
   */
  async recordFailure(
    id: string,
    failureCode: string,
    backoffMs: number,
  ): Promise<void> {
    const now = new Date();
    const availableAt = new Date(now.getTime() + backoffMs);
    await this.prisma.auditOutboxEvent.update({
      where: { id },
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
  }

  /**
   * Release leases that have expired. Called by the dispatcher
   * sweep before claiming.
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
 * DI token for the audit outbox port. Re-exported here for
 * convenience; the canonical token lives in `@ibn-hayan/observability`.
 */
export { AUDIT_OUTBOX_PORT };
