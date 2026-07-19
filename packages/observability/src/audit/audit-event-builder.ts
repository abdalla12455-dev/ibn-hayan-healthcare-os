/**
 * Audit-event builder.
 *
 * Per ADR-014 and the ninth canonical batch specification, the
 * audit-emission API is consumed through a builder that produces a
 * validated `AuditEventDraft`. The builder:
 *
 * - Generates a fresh `eventId` (UUID v4) if none is supplied.
 * - Defaults `eventVersion` to `AUDIT_EVENT_DRAFT_VERSION`.
 * - Defaults `occurredAt` to the current time if none is supplied.
 * - Defaults `tenantId` to `null` (platform-scoped) if none is
 *   supplied.
 * - Defaults `actorType` to `ANONYMOUS` if none is supplied.
 * - Defaults `outcome` to `success` if none is supplied.
 * - Defaults `source` to `api` if none is supplied.
 * - Generates a fresh `requestId` (UUID v4) if none is supplied.
 * - Defaults `correlationId` to `null` if none is supplied.
 * - Defaults `scope` to `''` if none is supplied.
 * - Validates the action code against the catalogue.
 * - Validates the category against the catalogue.
 * - Validates the actor type against the catalogue.
 * - Validates the outcome against the catalogue.
 * - Validates the source against the catalogue.
 * - Validates the category/action consistency.
 * - Sanitises the user-agent (clips to 512 characters).
 * - Validates the metadata through the safe metadata validator.
 * - Validates the previousState and newState through the safe
 *   metadata validator (same rules).
 *
 * The builder is the ONLY sanctioned way to construct an
 * `AuditEventDraft`. Emitting modules should not construct drafts
 * directly.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework. It uses only the Node.js
 * `crypto` module for UUID generation.
 */

import { randomUUID } from 'node:crypto';
import type { AuditEventDraft } from './audit-event-draft.js';
import { AUDIT_EVENT_DRAFT_VERSION } from './audit-event-draft.js';
import type { AuditEventCategory } from './categories.js';
import type { AuditActorType } from './actor-types.js';
import type { AuditEventOutcome } from './outcomes.js';
import type { AuditEventSource } from './source-types.js';
import type { AuditActionCode } from './action-codes.js';
import {
  isAuditActionCode,
  inferCategoryFromAction,
} from './action-codes.js';
import {
  isAuditEventCategory,
} from './categories.js';
import { isAuditActorType } from './actor-types.js';
import { isAuditEventOutcome } from './outcomes.js';
import { isAuditEventSource } from './source-types.js';
import {
  validateAuditMetadata,
  type MetadataValidationResult,
} from './metadata-validator.js';

/**
 * The maximum user-agent length stored in the audit store. Strings
 * longer than this are clipped.
 */
export const MAX_USER_AGENT_LENGTH = 512;

/**
 * The result of building an audit event draft.
 *
 * On success, `ok` is `true` and `draft` is the validated draft.
 * On failure, `ok` is `false` and `reason` is a stable machine-
 * readable failure code.
 */
export type AuditEventBuildResult =
  | { readonly ok: true; readonly draft: AuditEventDraft }
  | {
      readonly ok: false;
      readonly reason:
        | 'unknown_action_code'
        | 'unknown_category'
        | 'unknown_actor_type'
        | 'unknown_outcome'
        | 'unknown_source'
        | 'category_action_mismatch'
        | 'metadata_validation_failed'
        | 'state_validation_failed';
      readonly detail: string;
    };

/**
 * The input to the audit-event builder. All fields are optional
 * except `action`; the builder supplies sensible defaults for the
 * rest.
 */
export interface AuditEventBuildInput {
  readonly action: AuditActionCode;
  readonly category?: AuditEventCategory;
  readonly eventId?: string;
  readonly occurredAt?: string;
  readonly tenantId?: string | null;
  readonly actorType?: AuditActorType;
  readonly actorId?: string | null;
  readonly subjectIdentifierHash?: string | null;
  readonly sessionId?: string | null;
  readonly resourceType?: string | null;
  readonly resourceId?: string | null;
  readonly permissionCode?: string | null;
  readonly roleCodes?: readonly string[];
  readonly outcome?: AuditEventOutcome;
  readonly reasonCode?: string | null;
  readonly source?: AuditEventSource;
  readonly requestId?: string;
  readonly correlationId?: string | null;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
  readonly scope?: string;
  readonly previousState?: unknown | null;
  readonly newState?: unknown | null;
  readonly metadata?: unknown;
}

/**
 * Build a validated audit event draft.
 *
 * See the file-level comment for the full list of validations and
 * defaults.
 */
export function buildAuditEventDraft(
  input: AuditEventBuildInput,
): AuditEventBuildResult {
  // Validate the action code.
  if (!isAuditActionCode(input.action)) {
    return {
      ok: false,
      reason: 'unknown_action_code',
      detail: `Unknown audit action code: ${String(input.action)}`,
    };
  }

  // Determine the category. If the caller supplied a category, use
  // it; otherwise, infer it from the action code's prefix. In both
  // cases, validate that the category matches the action code's
  // prefix (defence-in-depth).
  const inferredCategory = inferCategoryFromAction(input.action);
  if (inferredCategory === null) {
    // This should be unreachable because `isAuditActionCode` already
    // validated the action code. But we check anyway.
    return {
      ok: false,
      reason: 'unknown_action_code',
      detail: `Could not infer category from action: ${input.action}`,
    };
  }
  const category: AuditEventCategory =
    input.category ?? (inferredCategory as AuditEventCategory);
  if (!isAuditEventCategory(category)) {
    return {
      ok: false,
      reason: 'unknown_category',
      detail: `Unknown audit category: ${String(category)}`,
    };
  }
  if (category !== inferredCategory) {
    return {
      ok: false,
      reason: 'category_action_mismatch',
      detail: `Action ${input.action} implies category ${inferredCategory}, but category ${category} was supplied.`,
    };
  }

  // Validate the actor type.
  const actorType: AuditActorType = input.actorType ?? 'ANONYMOUS';
  if (!isAuditActorType(actorType)) {
    return {
      ok: false,
      reason: 'unknown_actor_type',
      detail: `Unknown audit actor type: ${String(actorType)}`,
    };
  }

  // Validate the outcome.
  const outcome: AuditEventOutcome = input.outcome ?? 'success';
  if (!isAuditEventOutcome(outcome)) {
    return {
      ok: false,
      reason: 'unknown_outcome',
      detail: `Unknown audit outcome: ${String(outcome)}`,
    };
  }

  // Validate the source.
  const source: AuditEventSource = input.source ?? 'api';
  if (!isAuditEventSource(source)) {
    return {
      ok: false,
      reason: 'unknown_source',
      detail: `Unknown audit source: ${String(source)}`,
    };
  }

  // Sanitise the user-agent (clip to the maximum length).
  const userAgent = clipUserAgent(input.userAgent ?? null);

  // Validate the metadata.
  const metadataResult = validateAuditMetadata(input.metadata ?? null);
  if (!metadataResult.ok) {
    return {
      ok: false,
      reason: 'metadata_validation_failed',
      detail: `Metadata validation failed: ${metadataResult.reason} — ${metadataResult.detail}`,
    };
  }

  // Validate previousState and newState (same rules as metadata).
  if (input.previousState !== null && input.previousState !== undefined) {
    const r = validateAuditMetadata(input.previousState);
    if (!r.ok) {
      return {
        ok: false,
        reason: 'state_validation_failed',
        detail: `previousState validation failed: ${r.reason} — ${r.detail}`,
      };
    }
  }
  if (input.newState !== null && input.newState !== undefined) {
    const r = validateAuditMetadata(input.newState);
    if (!r.ok) {
      return {
        ok: false,
        reason: 'state_validation_failed',
        detail: `newState validation failed: ${r.reason} — ${r.detail}`,
      };
    }
  }

  const draft: AuditEventDraft = {
    eventId: input.eventId ?? randomUUID(),
    eventVersion: AUDIT_EVENT_DRAFT_VERSION,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    tenantId: input.tenantId ?? null,
    category,
    action: input.action,
    actorType,
    actorId: input.actorId ?? null,
    subjectIdentifierHash: input.subjectIdentifierHash ?? null,
    sessionId: input.sessionId ?? null,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    permissionCode: input.permissionCode ?? null,
    roleCodes: input.roleCodes ?? [],
    outcome,
    reasonCode: input.reasonCode ?? null,
    source,
    requestId: input.requestId ?? randomUUID(),
    correlationId: input.correlationId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent,
    scope: input.scope ?? '',
    previousState: input.previousState ?? null,
    newState: input.newState ?? null,
    metadata: metadataResult.ok ? metadataResult.value : null,
  };

  return { ok: true, draft };
}

/**
 * Clip a user-agent string to the maximum length. Returns `null` if
 * the input is `null` or `undefined`.
 */
function clipUserAgent(ua: string | null | undefined): string | null {
  if (ua === null || ua === undefined) {
    return null;
  }
  if (ua.length <= MAX_USER_AGENT_LENGTH) {
    return ua;
  }
  // Clip and append an ellipsis to indicate truncation. The
  // ellipsis is three ASCII dots to avoid Unicode length issues.
  return ua.slice(0, MAX_USER_AGENT_LENGTH - 3) + '...';
}

/**
 * Convenience helper: convert a `MetadataValidationResult` failure
 * to a stable failure-code string for the outbox's
 * `last_failure_code` column. Returns `null` if the result is
 * successful.
 */
export function metadataFailureCode(
  result: MetadataValidationResult,
): string | null {
  if (result.ok) {
    return null;
  }
  return `metadata_${result.reason}`;
}
