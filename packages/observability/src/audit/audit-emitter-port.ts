/**
 * Audit emitter port.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * audit-emission API is a port (interface) declared in
 * `packages/observability` and implemented by the API. The port
 * abstracts the emission mechanism so that emitting modules do not
 * depend on the outbox or the audit store directly.
 *
 * The API's implementation of this port writes an outbox row in the
 * same transactional database transaction as the consequential
 * state mutation. The dispatcher reads the outbox row later and
 * appends to the audit store.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { AuditEventDraft } from './audit-event-draft.js';

/**
 * The result of an audit emission attempt.
 *
 * On success, `ok` is `true`. The emission has been persisted to the
 * transactional outbox; delivery to the audit store is asynchronous.
 *
 * On failure, `ok` is `false` and `reason` is a stable machine-
 * readable failure code. The caller is responsible for the fail-
 * closed policy: a state mutation that cannot be audited must not
 * commit.
 */
export type AuditEmitResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'outbox_unavailable'
        | 'validation_failed'
        | 'unknown';
      readonly detail: string;
    };

/**
 * The audit emitter port.
 *
 * The port exposes a single method, `emit`, that persists an audit
 * event draft to the transactional outbox. The implementation is
 * responsible for:
 *
 * - Validating the draft (forbidden keys, size limits, action-code
 *   catalogue, category/action consistency).
 * - Sanitising the draft (clipping user-agent length, redacting
 *   forbidden keys).
 * - Persisting the outbox row in the caller's transaction (the
 *   caller is responsible for supplying the transaction context; the
 *   port implementation may accept an optional transaction handle).
 * - Returning a fail-closed result if the outbox cannot accept the
 *   row.
 *
 * The port does NOT append to the audit store. The dispatcher does
 * that asynchronously.
 */
export interface AuditEmitterPort {
  /**
   * Persist an audit event draft to the transactional outbox.
   *
   * The caller is responsible for supplying a draft that has been
   * built with the audit-event builder. The port validates the
   * draft again (defence-in-depth).
   *
   * If the caller supplies a transaction handle (the optional
   * `transaction` parameter), the implementation persists the
   * outbox row in that transaction. If no transaction is supplied,
   * the implementation opens its own transaction. The former is
   * used when the audit emission is atomic with a state mutation;
   * the latter is used for direct, non-mutating security events.
   */
  emit(
    draft: AuditEventDraft,
    options?: {
      readonly transaction?: unknown;
    },
  ): Promise<AuditEmitResult>;
}

/**
 * DI token for the audit emitter port. The API's DI container binds
 * this token to the concrete implementation.
 *
 * The token is a `Symbol` rather than the interface itself to avoid
 * TypeScript's structural-identity pitfall.
 */
export const AUDIT_EMITTER_PORT = Symbol('AUDIT_EMITTER_PORT');
