/**
 * Audit-store append port.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * dispatcher appends audit events to the dedicated audit store
 * through this port. The port abstracts the audit-store persistence
 * mechanism so that the dispatcher does not depend on Prisma
 * directly.
 *
 * The API's implementation of this port:
 * - Claims the next chain sequence using row-level locking on the
 *   `audit_chain_heads` table.
 * - Computes the payload hash from the canonical event draft.
 * - Computes the integrity hash from the bound fields.
 * - Inserts the immutable `audit_events` row.
 * - Updates the `audit_chain_heads` row.
 * - All in a single transaction.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { AuditEventDraft } from './audit-event-draft.js';

/**
 * The result of an append attempt.
 *
 * - `appended`: The event was appended to the audit store. The
 *   dispatcher marks the outbox row delivered.
 * - `idempotent_success`: The audit store already has an event with
 *   this `eventId`. The dispatcher marks the outbox row delivered
 *   without producing a duplicate audit record.
 * - `transient_failure`: The audit store could not accept the event
 *   (e.g. unavailable). The dispatcher will retry.
 * - `permanent_failure`: The event is structurally invalid (e.g.
 *   forbidden metadata slipped past the emission-time validator, or
 *   the integrity key is invalid). The dispatcher records a
 *   permanent failure.
 */
export type AuditAppendResult =
  | { readonly kind: 'appended'; readonly chainScope: string; readonly chainSequence: number }
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
 * The audit-store append port.
 *
 * The port exposes a single method, `append`, that appends an audit
 * event to the dedicated audit store.
 */
export interface AuditStoreAppendPort {
  /**
   * Append an audit event to the dedicated audit store.
   *
   * The `draft` is the deserialised canonical event draft from the
   * outbox row. The implementation validates the draft again
   * (defence-in-depth), computes the chain scope from `tenantId`,
   * claims the next chain sequence, computes the payload hash and
   * the integrity hash, inserts the immutable `audit_events` row,
   * and updates the `audit_chain_heads` row — all in a single
   * transaction.
   *
   * If the audit store already has an event with the supplied
   * `eventId`, the implementation returns `idempotent_success`
   * without appending a duplicate.
   */
  append(draft: AuditEventDraft): Promise<AuditAppendResult>;
}

/**
 * DI token for the audit-store append port.
 */
export const AUDIT_STORE_APPEND_PORT = Symbol('AUDIT_STORE_APPEND_PORT');
