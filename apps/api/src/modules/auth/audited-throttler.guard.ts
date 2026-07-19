import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Request } from 'express';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import type { RequestWithIdentifiers } from '../audit/request-id.middleware.js';

/**
 * Custom `ThrottlerGuard` that audits throttled login attempts.
 *
 * Per the ninth canonical batch specification, when NestJS
 * throttling rejects a login attempt with HTTP 429, an
 * `authentication.login.throttled` audit event must be emitted.
 * The default `ThrottlerGuard` short-circuits the request before
 * the controller or `AuthService` runs, so without this custom
 * guard the throttled attempt would NOT be audited.
 *
 * Privacy constraints (per the ninth canonical batch specification):
 * - The raw email is NEVER persisted. Only the HMAC of the
 *   normalised identifier is stored in `subject_identifier_hash`.
 * - The password and request body are NEVER persisted.
 * - The generic 429 client response is preserved (the guard still
 *   throws `ThrottlerException`).
 * - No `authentication.login.failed` event is double-emitted for
 *   the throttled attempt (the throttled event replaces, not
 *   supplements, the failed event).
 * - Account existence is not revealed: the audit event uses
 *   `actorType: ANONYMOUS` and does not include a `userId` even if
 *   the email happens to match a real user. The audit event is
 *   emitted before any user lookup would have occurred.
 *
 * The guard only emits the throttled event for the LOGIN endpoint
 * (`POST /api/v1/auth/login`). Other throttled endpoints use the
 * default `ThrottlerGuard` behaviour (no audit event) because the
 * throttled event is specific to the login flow.
 *
 * The guard extends `ThrottlerGuard` rather than replacing it, so
 * all the default throttling behaviour (counter tracking, header
 * generation, skip logic) is preserved.
 */
@Injectable()
export class AuditedThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    @Inject(AuditHelperService)
    private readonly auditHelper: AuditHelperService,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Override `throwThrottlingException` to emit the throttled
   * audit event (for the login endpoint only) before throwing the
   * standard `ThrottlerException`.
   *
   * The audit event is emitted through the transactional outbox
   * (via `auditHelper.emitDirect`), NOT through the audit store.
   * This preserves the generic 429 client response: the audit
   * emission is best-effort, and any emission failure is logged
   * but does not change the response.
   */
  protected override async throwThrottlingException(
    context: ExecutionContext,
    _throttlerLimitDetail: { readonly limit: number; readonly ttl: number },
  ): Promise<void> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const isLogin =
      controller?.name === 'AuthController' && handler?.name === 'login';

    if (isLogin) {
      await this.emitThrottledLoginEvent(context);
    }

    throw new ThrottlerException(
      'Too many login attempts. Please try again later.',
    );
  }

  /**
   * Emit the `authentication.login.throttled` audit event for a
   * throttled login attempt.
   *
   * The event is emitted through the audit helper's `emitDirect`
   * method, which writes to the transactional outbox. The audit
   * dispatcher will deliver it to the audit store asynchronously.
   *
   * The raw email is NEVER persisted. Only the HMAC of the
   * normalised email is stored in `subject_identifier_hash`. If
   * the request body does not contain a parseable email (or the
   * body is not an object), the `subject_identifier_hash` is set
   * to null and the `reasonCode` reflects the malformed body.
   */
  private async emitThrottledLoginEvent(
    context: ExecutionContext,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const body = (req as { body?: unknown }).body;
    const rawEmail =
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { email?: unknown }).email === 'string'
        ? (body as { email: string }).email
        : null;

    const augmented = req as RequestWithIdentifiers;
    const requestId =
      augmented.requestId ?? '00000000-0000-0000-0000-000000000000';
    const correlationId = augmented.correlationId ?? null;
    const ipRaw = req.ip ?? req.socket?.remoteAddress ?? null;
    const ipAddress = ipRaw !== null && ipRaw !== undefined ? ipRaw : null;
    const uaRaw = req.headers['user-agent'];
    const userAgent =
      typeof uaRaw === 'string'
        ? uaRaw
        : Array.isArray(uaRaw)
          ? (uaRaw[0] ?? null)
          : null;

    // Compute the HMAC of the normalised email. The raw email is
    // NEVER persisted; only the HMAC is stored in
    // `subject_identifier_hash`. If the body does not contain a
    // parseable email, the HMAC is null.
    const subjectIdentifierHash =
      rawEmail !== null
        ? this.auditHelper.computeFailedLoginIdentifierHash(rawEmail)
        : null;

    const result = await this.auditHelper.emitDirect({
      action: 'authentication.login.throttled',
      outcome: 'failure',
      reasonCode: 'throttled',
      source: 'api',
      actorType: 'ANONYMOUS',
      // Intentionally no `actorId` — account existence must not be
      // revealed. The throttled event fires BEFORE any user lookup,
      // so we do not know whether the email corresponds to a real
      // user.
      subjectIdentifierHash,
      requestId,
      correlationId,
      ipAddress,
      userAgent,
      scope: 'pre_authentication',
      metadata: { endpoint: 'login' },
    });
    if (!result.ok) {
      // Best-effort: do not block the throttled response. The
      // failure is logged by the audit helper.
    }
  }
}
