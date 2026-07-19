/**
 * Audit event draft type.
 *
 * Per ADR-014 §5 and the ninth canonical batch specification, an
 * audit event draft is the in-memory representation of an audit
 * event before it is persisted to the transactional outbox. The
 * dispatcher reads the outbox row's `canonical_event_draft` JSONB
 * column, deserialises it into an `AuditEventDraft`, and passes it
 * to the audit store for appending.
 *
 * The draft carries the event's logical fields (identity, timing,
 * classification, actor, resource, authorization, outcome,
 * provenance, network context, scope, state diff, metadata). It
 * does NOT carry the integrity fields (`chain_sequence`,
 * `previous_integrity_hash`, `payload_hash`, `integrity_hash`,
 * `integrity_key_version`); those are computed at append time.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { AuditEventCategory } from './categories.js';
import type { AuditActorType } from './actor-types.js';
import type { AuditEventOutcome } from './outcomes.js';
import type { AuditEventSource } from './source-types.js';
import type { AuditActionCode } from './action-codes.js';

/**
 * The audit event draft.
 *
 * The fields are grouped by purpose for readability. The order of
 * fields in this interface does NOT affect the canonical
 * serialization; the canonical serializer sorts keys lexicographically
 * at every depth.
 */
export interface AuditEventDraft {
  // --- Identity ---
  /** Stable event identifier (UUID v4). Used for idempotent delivery. */
  readonly eventId: string;
  /** Schema version of the event draft. */
  readonly eventVersion: number;

  // --- Timing ---
  /** When the action occurred (caller-supplied, ISO 8601). */
  readonly occurredAt: string;
  // `recordedAt` is set by the audit store at append time; it is
  // NOT part of the draft.

  // --- Scope ---
  /** The Tenant ID, or null for platform-scoped events. */
  readonly tenantId: string | null;
  // `chainScope` is derived from `tenantId` at append time.
  // `chainSequence` is allocated by the chain-head table at append
  // time.

  // --- Classification ---
  /** The event category. */
  readonly category: AuditEventCategory;
  /** The stable action code. */
  readonly action: AuditActionCode;

  // --- Actor ---
  /** The actor type. */
  readonly actorType: AuditActorType;
  /** The actor's stable ID, or null for anonymous actors. */
  readonly actorId: string | null;
  /** HMAC of a normalised identifier for failed-login privacy, or null. */
  readonly subjectIdentifierHash: string | null;
  /** The session involved, when applicable. */
  readonly sessionId: string | null;

  // --- Resource ---
  /** The resource type affected, when applicable. */
  readonly resourceType: string | null;
  /** The resource identifier affected, when applicable. */
  readonly resourceId: string | null;

  // --- Authorization context ---
  /** The permission evaluated, for authorization events. */
  readonly permissionCode: string | null;
  /** Roles held by the actor for this event. */
  readonly roleCodes: readonly string[];

  // --- Outcome ---
  /** The outcome of the action. */
  readonly outcome: AuditEventOutcome;
  /** Stable reason code (e.g. `invalid_credentials`, `unknown`). */
  readonly reasonCode: string | null;

  // --- Provenance ---
  /** The platform component that emitted the event. */
  readonly source: AuditEventSource;
  /** Stable request identifier. */
  readonly requestId: string;
  /** Optional correlation identifier. */
  readonly correlationId: string | null;

  // --- Network context ---
  /** Client IP when available. */
  readonly ipAddress: string | null;
  /** Bounded, sanitized user-agent string. */
  readonly userAgent: string | null;

  // --- Scope description ---
  /** Organisational scope description. */
  readonly scope: string;

  // --- State diff ---
  /** State before the action, for state-changing actions. */
  readonly previousState: unknown | null;
  /** State after the action, for state-changing actions. */
  readonly newState: unknown | null;

  // --- Metadata ---
  /** Sanitised, allowlisted metadata. */
  readonly metadata: unknown;
}

/**
 * The current schema version of the `AuditEventDraft`. Increment
 * when the draft's structure changes incompatibly. The dispatcher
 * and the verifier use this to handle backward-compatible evolution.
 */
export const AUDIT_EVENT_DRAFT_VERSION = 1 as const;
