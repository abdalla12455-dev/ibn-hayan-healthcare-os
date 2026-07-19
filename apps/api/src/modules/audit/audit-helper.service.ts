import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  AuditEmitterPort,
  AuditEventBuildInput,
} from '@ibn-hayan/observability';
import {
  AUDIT_EMITTER_PORT,
  buildAuditEventDraft,
  computeIdentifierHash,
} from '@ibn-hayan/observability';
import { AuditConfigurationService } from './audit-configuration.service.js';

/**
 * Convenience helper for emitting audit events.
 *
 * This service wraps the `AuditEmitterPort` with a builder-pattern
 * API so that emitting modules (auth, session-context, authorization,
 * etc.) can emit audit events without repeating the builder call and
 * the emitter call.
 *
 * The helper also provides:
 * - `emitFailedLoginIdentifier`: a privacy-preserving helper that
 *   computes the HMAC of the failed-login identifier and emits the
 *   event with `subjectIdentifierHash` set. The raw identifier is
 *   NEVER persisted.
 *
 * The helper does NOT validate the draft; the builder does that. The
 * helper does NOT catch emission failures; the caller is responsible
 * for the fail-closed policy.
 */
@Injectable()
export class AuditHelperService {
  private readonly logger = new Logger(AuditHelperService.name);

  constructor(
    @Inject(AUDIT_EMITTER_PORT) private readonly emitter: AuditEmitterPort,
    @Inject(AuditConfigurationService)
    private readonly config: AuditConfigurationService,
  ) {}

  /**
   * Build and emit an audit event. The `input` is the
   * `AuditEventBuildInput`; the helper builds the draft and emits
   * it. If the build fails, the helper logs the failure and returns
   * a build-failed result.
   *
   * If the caller supplies a transaction (a Prisma transaction
   * client), the helper passes it to the emitter so that the outbox
   * row is inserted in that transaction.
   */
  async emit(
    input: AuditEventBuildInput,
    options?: { readonly transaction?: unknown },
  ): Promise<{ ok: true } | { ok: false; reason: string; detail: string }> {
    const buildResult = buildAuditEventDraft(input);
    if (!buildResult.ok) {
      this.logger.error(
        `Audit event build failed: ${buildResult.reason} — ${buildResult.detail}`,
      );
      return {
        ok: false,
        reason: buildResult.reason,
        detail: buildResult.detail,
      };
    }
    const emitResult = await this.emitter.emit(buildResult.draft, options);
    if (!emitResult.ok) {
      return {
        ok: false,
        reason: emitResult.reason,
        detail: emitResult.detail,
      };
    }
    return { ok: true };
  }

  /**
   * Compute the HMAC of a failed-login identifier using the
   * identifier key. The raw identifier is NEVER persisted; only the
   * HMAC is returned.
   *
   * This helper exists so that emitting modules do not need to
   * inject `AuditConfigurationService` directly to access the
   * identifier key.
   */
  computeFailedLoginIdentifierHash(rawIdentifier: string): string {
    return computeIdentifierHash(
      this.config.getIdentifierHmacKey(),
      rawIdentifier,
    );
  }

  /**
   * Emit a direct, non-mutating audit event (e.g. a failed login, a
   * denied Origin, a denied CSRF). The event is persisted in its
   * own transaction (no caller-supplied transaction).
   *
   * Per the ninth canonical batch specification, direct non-mutating
   * security events are persisted first to the transactional outbox.
   * If the outbox cannot accept the event, the helper returns a
   * fail-closed result; the caller is responsible for preserving
   * the generic client-facing security response.
   */
  async emitDirect(
    input: AuditEventBuildInput,
  ): Promise<{ ok: true } | { ok: false; reason: string; detail: string }> {
    return this.emit(input);
  }
}
