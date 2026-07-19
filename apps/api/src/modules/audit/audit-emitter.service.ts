import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  AuditEmitterPort,
  AuditEmitResult,
  AuditEventDraft,
} from '@ibn-hayan/observability';
import {
  AUDIT_EMITTER_PORT,
  AUDIT_OUTBOX_PORT,
  type AuditOutboxPort,
} from '@ibn-hayan/observability';

/**
 * Implementation of the audit emitter port.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * audit emitter writes an outbox row in the same transactional
 * database transaction as the consequential state mutation. The
 * dispatcher reads the outbox row later and appends to the audit
 * store.
 *
 * The emitter is the primary entry point for emitting modules. It
 * validates the draft (defence-in-depth; the builder already
 * validated) and persists the outbox row.
 *
 * If the caller supplies a transaction handle (a Prisma transaction
 * client), the emitter persists the outbox row in that transaction.
 * If no transaction is supplied, the emitter opens its own
 * transaction. The former is used when the audit emission is atomic
 * with a state mutation; the latter is used for direct,
 * non-mutating security events (e.g. failed login, Origin denied,
 * CSRF denied).
 */
@Injectable()
export class AuditEmitterService implements AuditEmitterPort {
  private readonly logger = new Logger(AuditEmitterService.name);

  constructor(
    @Inject(AUDIT_OUTBOX_PORT) private readonly outbox: AuditOutboxPort,
  ) {}

  async emit(
    draft: AuditEventDraft,
    options?: { readonly transaction?: unknown },
  ): Promise<AuditEmitResult> {
    try {
      const inserted = await this.outbox.insert(draft, {
        transaction: options?.transaction,
      });
      if (!inserted) {
        return {
          ok: false,
          reason: 'outbox_unavailable',
          detail: `Failed to insert audit outbox row for event ${draft.eventId}.`,
        };
      }
      this.logger.debug(
        `Audit outbox row inserted for event ${draft.eventId} (action=${draft.action}).`,
      );
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Audit emission failed for event ${draft.eventId}: ${message}`,
      );
      return {
        ok: false,
        reason: 'unknown',
        detail: message,
      };
    }
  }
}

/**
 * DI token for the audit emitter port.
 */
export { AUDIT_EMITTER_PORT };
