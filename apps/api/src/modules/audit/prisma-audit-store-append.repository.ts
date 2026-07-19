import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  AuditStoreAppendPort,
  AuditAppendResult,
  AuditEventDraft,
} from '@ibn-hayan/observability';
import {
  AUDIT_STORE_APPEND_PORT,
  canonicalPayloadHash,
  computeIntegrityHash,
  tenantChainScope,
  PLATFORM_CHAIN_SCOPE,
  validateAuditMetadata,
} from '@ibn-hayan/observability';
import { AuditPrismaService } from './audit-prisma.service.js';
import { AuditConfigurationService } from './audit-configuration.service.js';
import { Prisma } from '../../../generated/prisma-audit/client.js';

/**
 * Prisma-backed implementation of the audit-store append port.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * dispatcher appends audit events to the dedicated audit store
 * through this port. The append operation:
 *
 * 1. Validates the draft again (defence-in-depth; the emission-time
 *    validator already ran).
 * 2. Computes the chain scope from `tenantId`.
 * 3. Claims the next chain sequence using row-level locking on the
 *    `audit_chain_heads` table.
 * 4. Computes the payload hash from the canonical event draft.
 * 5. Computes the integrity hash from the bound fields.
 * 6. Inserts the immutable `audit_events` row.
 * 7. Updates the `audit_chain_heads` row.
 * 8. All in a single transaction.
 *
 * If the audit store already has an event with the supplied
 * `eventId`, the implementation returns `idempotent_success`
 * without appending a duplicate.
 *
 * Concurrency: row-level locking on the chain-head row prevents
 * concurrent appends from producing duplicate sequence numbers or
 * forks. The lock is acquired with `SELECT ... FOR UPDATE` inside
 * the transaction; the lock is held until the transaction commits.
 */
@Injectable()
export class PrismaAuditStoreAppendRepository implements AuditStoreAppendPort {
  private readonly logger = new Logger(PrismaAuditStoreAppendRepository.name);

  constructor(
    @Inject(AuditPrismaService)
    private readonly prisma: AuditPrismaService,
    @Inject(AuditConfigurationService)
    private readonly config: AuditConfigurationService,
  ) {}

  async append(draft: AuditEventDraft): Promise<AuditAppendResult> {
    // Defence-in-depth: validate the metadata again. The emission-
    // time validator already ran, but a bug in the emission path
    // could theoretically let a forbidden key through. The
    // audit-store append is the last line of defence.
    const metadataResult = validateAuditMetadata(draft.metadata);
    if (!metadataResult.ok) {
      this.logger.error(
        `Audit-store append rejected event ${draft.eventId}: metadata validation failed (${metadataResult.reason}).`,
      );
      return {
        kind: 'permanent_failure',
        failureCode: `metadata_${metadataResult.reason}`,
      };
    }

    // Compute the chain scope.
    const chainScope =
      draft.tenantId !== null
        ? tenantChainScope(draft.tenantId)
        : PLATFORM_CHAIN_SCOPE;

    try {
      // The append is a single transaction. We use
      // `$transaction` with an interactive callback so that we
      // can interleave SELECT ... FOR UPDATE and INSERT.
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Check for idempotent success: does an event with
        // this event_id already exist?
        const existing = await tx.auditEvent.findUnique({
          where: { eventId: draft.eventId },
          select: { id: true, chainScope: true, chainSequence: true },
        });
        if (existing !== null) {
          return {
            kind: 'idempotent_success' as const,
          };
        }

        // 2. Lock the chain-head row for this chain scope. If the
        // row does not exist, create it (within the same
        // transaction). The SELECT ... FOR UPDATE ensures that
        // concurrent appends into the same chain wait for this
        // transaction to commit.
        //
        // We use a raw query because Prisma 7's query builder
        // does not support SELECT ... FOR UPDATE.
        const chainHeadRows = await tx.$queryRaw<
          Array<{
            last_sequence: bigint;
            last_integrity_hash: string | null;
          }>
        >`
          SELECT last_sequence, last_integrity_hash
          FROM audit_chain_heads
          WHERE chain_scope = ${chainScope}
          FOR UPDATE
        `;

        let previousIntegrityHash: string | null;
        let nextSequence: bigint;

        if (chainHeadRows.length === 0) {
          // The chain does not exist yet. Initialise it. We
          // INSERT the chain-head row; the FOR UPDATE lock is
          // not needed here because the row does not exist yet,
          // but we need to handle the race where two concurrent
          // transactions try to initialise the same chain.
          //
          // The primary key on chain_scope is the structural
          // enforcement: if two transactions race, one will
          // commit the INSERT and the other will get a unique
          // violation. The losing transaction will retry; on
          // retry, the chain-head row will exist and the FOR
          // UPDATE will succeed.
          //
          // For simplicity, we do NOT retry here. The dispatcher
          // will retry the whole append on transient failure.
          previousIntegrityHash = null;
          nextSequence = BigInt(1);
          try {
            await tx.auditChainHead.create({
              data: {
                chainScope,
                lastSequence: nextSequence,
                lastIntegrityHash: null,
                lastEventId: null,
                lastEventRecordedAt: null,
              },
            });
          } catch (err) {
            // If this is a unique violation (P2002), the chain
            // was concurrently initialised. Treat as a transient
            // failure so the dispatcher retries.
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === 'P2002'
            ) {
              throw new AppendTransientFailure(
                'chain_concurrent_initialisation',
              );
            }
            throw err;
          }
        } else {
          const row = chainHeadRows[0]!;
          previousIntegrityHash = row.last_integrity_hash;
          nextSequence = BigInt(row.last_sequence.toString()) + BigInt(1);
        }

        // 3. Compute the payload hash.
        const payloadHash = canonicalPayloadHash(draft);

        // 4. Compute the integrity hash.
        const integrityKeyVersion = this.config.getIntegrityKeyVersion();
        const integrityKey = this.config.getIntegrityHmacKey();
        const integrityHash = computeIntegrityHash(integrityKey, {
          integrityKeyVersion,
          chainScope,
          chainSequence: Number(nextSequence),
          previousIntegrityHash,
          payloadHash,
        });

        // 5. Insert the audit_events row.
        const now = new Date();
        try {
          await tx.auditEvent.create({
            data: {
              id: crypto.randomUUID(),
              eventId: draft.eventId,
              eventVersion: draft.eventVersion,
              occurredAt: new Date(draft.occurredAt),
              recordedAt: now,
              tenantId: draft.tenantId,
              chainScope,
              chainSequence: nextSequence,
              previousIntegrityHash,
              payloadHash,
              integrityHash,
              integrityKeyVersion,
              category: draft.category,
              action: draft.action,
              actorType: draft.actorType,
              actorId: draft.actorId,
              subjectIdentifierHash: draft.subjectIdentifierHash,
              sessionId: draft.sessionId,
              resourceType: draft.resourceType,
              resourceId: draft.resourceId,
              permissionCode: draft.permissionCode,
              roleCodes: [...draft.roleCodes],
              outcome: draft.outcome,
              reasonCode: draft.reasonCode,
              source: draft.source,
              requestId: draft.requestId,
              correlationId: draft.correlationId,
              ipAddress: draft.ipAddress,
              userAgent: draft.userAgent,
              scope: draft.scope,
              previousState:
                draft.previousState === null
                  ? Prisma.JsonNull
                  : (draft.previousState as Prisma.InputJsonValue),
              newState:
                draft.newState === null
                  ? Prisma.JsonNull
                  : (draft.newState as Prisma.InputJsonValue),
              metadata: draft.metadata as Prisma.InputJsonValue,
            },
          });
        } catch (err) {
          // If this is a unique violation on event_id (P2002),
          // the event was concurrently appended. Treat as
          // idempotent success.
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            return { kind: 'idempotent_success' as const };
          }
          throw err;
        }

        // 6. Update the chain-head row.
        await tx.auditChainHead.update({
          where: { chainScope },
          data: {
            lastSequence: nextSequence,
            lastIntegrityHash: integrityHash,
            lastEventId: draft.eventId,
            lastEventRecordedAt: now,
          },
        });

        return {
          kind: 'appended' as const,
          chainScope,
          chainSequence: Number(nextSequence),
        };
      });

      return result;
    } catch (err) {
      if (err instanceof AppendTransientFailure) {
        return {
          kind: 'transient_failure',
          failureCode: err.code,
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Audit-store append failed for event ${draft.eventId}: ${message}`,
      );
      return {
        kind: 'transient_failure',
        failureCode: 'audit_store_unavailable',
      };
    }
  }
}

/**
 * Internal error class used to signal a transient failure that
 * should be retried by the dispatcher.
 */
class AppendTransientFailure extends Error {
  constructor(readonly code: string) {
    super(`Append transient failure: ${code}`);
    this.name = 'AppendTransientFailure';
  }
}

/**
 * DI token for the audit-store append port.
 */
export { AUDIT_STORE_APPEND_PORT };
