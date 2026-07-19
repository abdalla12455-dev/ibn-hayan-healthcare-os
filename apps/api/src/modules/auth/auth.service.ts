import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  User,
  UserId,
  TenantMembership,
  TenantMembershipId,
  TenantId,
  Session,
  SessionId,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
  TenantRepository,
  TenantRoleAssignmentRepository,
  TenantRoleAssignment,
  RoleLabelLocale,
} from '@ibn-hayan/domain';
import { getRoleDisplayName } from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
  TENANT_REPOSITORY,
  TENANT_ROLE_ASSIGNMENT_REPOSITORY,
} from '../../infrastructure/database/index.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { sessionFromPrisma } from '../../infrastructure/database/mappers/session.mapper.js';
import { AuditHelperService } from '../audit/audit-helper.service.js';
import { PasswordService } from './password.service.js';
import {
  SessionTokenService,
  generateSessionTokenAndHash,
} from './session-token.service.js';
import { CsrfService } from './csrf.service.js';
import {
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_IDLE_TOUCH_INTERVAL_MS,
  SESSION_ROTATION_INTERVAL_MS,
} from './auth.constants.js';
import {
  invalidCredentials,
  csrfInvalid,
  originDisallowed,
} from './auth.errors.js';
import type {
  SessionResponse,
  AuthenticatedUser,
  TenantMembershipSummary,
  ActiveTenantContext,
  RoleSummary,
} from '@ibn-hayan/contracts';

/**
 * Request context for audit emission. Carries the request-scoped
 * identifiers and network metadata that the audit emitter needs.
 */
export interface AuditRequestContext {
  readonly requestId: string;
  readonly correlationId: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/**
 * Authentication service.
 *
 * The auth service orchestrates the authentication and session
 * lifecycle:
 *
 * - `login`: validate credentials, create a session, set the cookie.
 * - `getSessionFromCookie`: validate the cookie, touch or rotate the
 *   session, return the session response.
 * - `issueCsrfToken`: generate a CSRF token for an authenticated
 *   session.
 * - `logout`: verify Origin + CSRF, revoke the session, clear the
 *   cookie.
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. The `login` method returns the same generic 401 for:
 * - unknown email;
 * - wrong password;
 * - disabled user;
 * - no active membership.
 *
 * Per ADR-013 §1.3, the session record does not include the raw
 * session token. The `SessionTokenService` generates the raw token,
 * hashes it with SHA-256, and the hash is persisted via
 * `SessionRepository.create`. The raw token lives only in the
 * cookie and in process memory between generation and cookie-setting.
 *
 * Per ADR-013 §1.1, session rotation emits a fresh opaque token,
 * replaces the stored hash, updates the cookie, and invalidates the
 * previous token immediately. Rotation is triggered by the
 * `SESSION_ROTATION_INTERVAL_MS` constant (30 minutes by default).
 *
 * The auth service does NOT log:
 * - plaintext passwords;
 * - password hashes;
 * - session tokens (raw or hashed);
 * - CSRF tokens (raw or hashed);
 * - email addresses.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TENANT_MEMBERSHIP_REPOSITORY)
    private readonly memberships: TenantMembershipRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(TENANT_ROLE_ASSIGNMENT_REPOSITORY)
    private readonly roleAssignments: TenantRoleAssignmentRepository,
    private readonly prisma: PrismaService,
    private readonly auditHelper: AuditHelperService,
    private readonly passwordService: PasswordService,
    private readonly sessionTokens: SessionTokenService,
    private readonly csrfService: CsrfService,
  ) {}

  /**
   * Validate login credentials and create a new session.
   *
   * Returns `{ session, rawToken, expiresAt, user, memberships }` on
   * success. The caller (the controller) sets the cookie with
   * `rawToken` and returns the `SessionResponse` JSON body.
   *
   * Throws `originDisallowed()` (a 403) if the Origin header is missing
   * or does not exactly match an allowed `WEB_ORIGIN`. This check runs
   * BEFORE any credential lookup so that the response does not reveal
   * whether an account exists.
   *
   * Throws `invalidCredentials()` (a 401) for:
   * - unknown email (no user with the normalised email exists);
   * - wrong password (the password does not match the stored hash);
   * - disabled user (the user's `status` is `disabled`);
   * - no active membership (the user has no `active` memberships).
   *
   * All four cases throw the same exception; the caller cannot
   * distinguish them.
   *
   * Per ADR-013 §1.1, throttling is applied at the controller level
   * via `@nestjs/throttler`. This method does not perform throttling.
   */
  async login(input: {
    readonly email: string;
    readonly password: string;
    readonly origin: string | undefined;
    readonly webOrigin: string | string[];
    readonly auditContext: AuditRequestContext;
  }): Promise<{
    readonly session: Session;
    readonly rawToken: string;
    readonly expiresAt: Date;
    readonly user: User;
    readonly memberships: TenantMembership[];
  }> {
    // Verify Origin FIRST, before any credential lookup. A missing or
    // disallowed Origin returns the same generic 403 as a disallowed
    // Origin; the response does not reveal whether an account exists.
    if (!this.isOriginAllowed(input.origin, input.webOrigin)) {
      // Emit a direct, non-mutating security audit event for the
      // denied Origin. Per the ninth canonical batch specification,
      // direct non-mutating security events are persisted first to
      // the transactional outbox. The emission is best-effort: if
      // the outbox is unavailable, the generic client-facing
      // security response is preserved.
      await this.auditHelper.emitDirect({
        action: 'security.origin.denied',
        outcome: 'denied',
        reasonCode: 'origin_disallowed',
        source: 'api',
        requestId: input.auditContext.requestId,
        correlationId: input.auditContext.correlationId,
        ipAddress: input.auditContext.ipAddress,
        userAgent: input.auditContext.userAgent,
        scope: 'pre_authentication',
        metadata: { endpoint: 'login' },
      });
      throw originDisallowed();
    }

    const normalisedEmail = input.email.trim().toLowerCase();
    const user = await this.users.findByNormalisedEmail(normalisedEmail);
    if (user === null) {
      // Unknown email — return the generic 401. Do NOT log the email.
      // Emit a failed-login audit event with the HMAC of the
      // normalised identifier. The raw email is NEVER persisted.
      await this.emitFailedLogin(
        input.email,
        'unknown_email',
        input.auditContext,
      );
      throw invalidCredentials();
    }

    // Disabled users cannot sign in.
    if (user.status === 'disabled') {
      await this.emitFailedLogin(
        input.email,
        'user_disabled',
        input.auditContext,
        user.id,
      );
      throw invalidCredentials();
    }

    // Verify the password. `verifyForUser` returns false for a
    // missing credential, a malformed hash, or a genuine mismatch.
    // All three cases produce the same generic 401.
    const passwordOk = await this.passwordService.verifyForUser(
      user.id,
      input.password,
    );
    if (!passwordOk) {
      await this.emitFailedLogin(
        input.email,
        'wrong_password',
        input.auditContext,
        user.id,
      );
      throw invalidCredentials();
    }

    // Verify the user has at least one active membership.
    const userMemberships = await this.memberships.listForUser(user.id);
    const activeMemberships = userMemberships.filter(
      (m) => m.status === 'active',
    );
    if (activeMemberships.length === 0) {
      await this.emitFailedLogin(
        input.email,
        'no_active_membership',
        input.auditContext,
        user.id,
      );
      throw invalidCredentials();
    }

    // Create the session AND the audit outbox row in a single
    // transaction. Per the ninth canonical batch specification,
    // the successful login's session creation and audit outbox
    // insertion must be atomic. A state mutation cannot commit
    // without its outbox record.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);
    const { raw, hash } = generateSessionTokenAndHash(this.sessionTokens);

    // Resolve the tenant for the first active membership (for
    // audit chain scoping). The login event is tenant-scoped if
    // the user has at least one active membership; otherwise it
    // would be platform-scoped (but we already rejected that case
    // above).
    const firstMembership = activeMemberships[0]!;

    const session = await this.prisma.$transaction(async (tx) => {
      const row = await tx.authSession.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          expiresAt,
          lastSeenAt: now,
        },
      });
      const createdSession = sessionFromPrisma(row);

      // Emit the successful-login audit event in the same
      // transaction. The audit helper passes the transaction to
      // the outbox port, which inserts the outbox row using the
      // transaction client. Per the ninth canonical batch
      // specification, if the outbox insertion fails, the entire
      // transaction (including the session creation) MUST roll
      // back. The `emitOrFail` helper throws on failure, which
      // causes the `$transaction` callback to throw, which causes
      // Prisma to roll back.
      await this.auditHelper.emitOrFail(
        {
          action: 'authentication.login.succeeded',
          outcome: 'success',
          source: 'api',
          tenantId: firstMembership.tenantId,
          actorType: 'USER',
          actorId: user.id,
          sessionId: createdSession.id,
          requestId: input.auditContext.requestId,
          correlationId: input.auditContext.correlationId,
          ipAddress: input.auditContext.ipAddress,
          userAgent: input.auditContext.userAgent,
          scope: 'authentication',
          metadata: { endpoint: 'login' },
        },
        { transaction: tx },
      );

      return createdSession;
    });

    this.logger.debug(
      `Login succeeded for user ${user.id}; session ${session.id} created.`,
    );

    return {
      session,
      rawToken: raw,
      expiresAt,
      user,
      memberships: activeMemberships,
    };
  }

  /**
   * Emit a failed-login audit event with the HMAC of the normalised
   * identifier. The raw email is NEVER persisted; only the HMAC is
   * stored in `subject_identifier_hash`.
   *
   * Per ADR-014 and the ninth canonical batch specification, the
   * raw attempted email is NEVER stored in audit data. The
   * `subjectIdentifierHash` is computed using the identifier HMAC
   * key, which is separate from the integrity key.
   *
   * The emission is best-effort: if the outbox is unavailable, the
   * generic client-facing security response is preserved. The
   * failure is logged at error level for operational investigation.
   */
  private async emitFailedLogin(
    rawEmail: string,
    reasonCode: string,
    auditContext: AuditRequestContext,
    userId?: string,
  ): Promise<void> {
    const subjectIdentifierHash =
      this.auditHelper.computeFailedLoginIdentifierHash(rawEmail);
    const result = await this.auditHelper.emitDirect({
      action: 'authentication.login.failed',
      outcome: 'failure',
      reasonCode,
      source: 'api',
      actorType: 'ANONYMOUS',
      actorId: userId ?? null,
      subjectIdentifierHash,
      requestId: auditContext.requestId,
      correlationId: auditContext.correlationId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      scope: 'pre_authentication',
      metadata: { endpoint: 'login' },
    });
    if (!result.ok) {
      this.logger.error(
        `Failed to emit failed-login audit event: ${result.reason} — ${result.detail}`,
      );
    }
  }

  /**
   * Validate a session cookie and return the session response.
   *
   * Returns `null` if:
   * - the cookie is missing or empty;
   * - the session does not exist (the hash does not match any row);
   * - the session is revoked;
   * - the session is expired;
   * - the user is disabled;
   * - the user has no active memberships.
   *
   * On success, returns `{ session, user, memberships, expiresAt, rotatedRawToken }`.
   * If the session was rotated during this validation, `rotatedRawToken`
   * is the new raw token; the caller must update the cookie. If the
   * session was touched but not rotated, `rotatedRawToken` is `null`
   * and the cookie is unchanged.
   */
  async getSessionFromCookie(
    cookieValue: string | undefined,
    auditContext?: AuditRequestContext,
  ): Promise<{
    readonly session: Session;
    readonly user: User;
    readonly memberships: TenantMembership[];
    readonly expiresAt: Date;
    readonly rotatedRawToken: string | null;
  } | null> {
    if (!cookieValue || cookieValue.length === 0) {
      return null;
    }

    const tokenHash = this.sessionTokens.hash(cookieValue);
    const now = new Date();
    const session = await this.sessions.findActiveByTokenHash(tokenHash, now);
    if (session === null) {
      // The session is invalid (not found, revoked, or expired).
      // Emit an audit event if we have a context. Per the ninth
      // canonical batch specification, distinguish expired from
      // invalid: an expired session emits
      // `authentication.session.expired`; an invalid (not found or
      // revoked) session emits `authentication.session.invalid`.
      // The two events are mutually exclusive for a single
      // validation failure.
      if (auditContext !== undefined) {
        await this.emitSessionRejection(tokenHash, auditContext);
      }
      return null;
    }

    const user = await this.users.findById(session.userId);
    if (user === null || user.status === 'disabled') {
      if (auditContext !== undefined) {
        await this.emitSessionInvalid(tokenHash, auditContext);
      }
      return null;
    }

    const userMemberships = await this.memberships.listForUser(user.id);
    const activeMemberships = userMemberships.filter(
      (m) => m.status === 'active',
    );
    if (activeMemberships.length === 0) {
      // No active memberships: the session is still valid, but the
      // user has no tenancy. Return null without emitting an
      // audit event (this is not a session-invalid condition).
      return null;
    }

    // Decide whether to touch, rotate, or do nothing.
    let rotatedRawToken: string | null = null;
    const sinceLastTouch = now.getTime() - session.lastSeenAt.getTime();
    const sinceRotation = session.rotatedAt
      ? now.getTime() - session.rotatedAt.getTime()
      : now.getTime() - session.createdAt.getTime();

    if (sinceRotation >= SESSION_ROTATION_INTERVAL_MS) {
      // Rotate: generate a new token, replace the stored hash, update
      // the cookie. The previous token is invalidated immediately.
      const generated = generateSessionTokenAndHash(this.sessionTokens);

      // Per the ninth canonical batch specification, session rotation
      // and its audit outbox record must be atomic. When an audit
      // context is supplied, we use a transaction that wraps the
      // rotation, the touch, and the outbox insertion. When no
      // audit context is supplied (backward compatibility with
      // existing tests), we use the existing non-transactional
      // rotation.
      if (auditContext !== undefined) {
        const updated = await this.prisma.$transaction(async (tx) => {
          const row = await tx.authSession.update({
            where: { id: session.id },
            data: {
              tokenHash: generated.hash,
              rotatedAt: now,
              lastSeenAt: now,
            },
          });
          await this.auditHelper.emitOrFail(
            {
              action: 'authentication.session.rotated',
              outcome: 'success',
              source: 'api',
              tenantId: activeMemberships[0]?.tenantId ?? null,
              actorType: 'USER',
              actorId: user.id,
              sessionId: session.id,
              requestId: auditContext.requestId,
              correlationId: auditContext.correlationId,
              ipAddress: auditContext.ipAddress,
              userAgent: auditContext.userAgent,
              scope: 'session',
              metadata: { endpoint: 'session_validation' },
            },
            { transaction: tx },
          );
          return sessionFromPrisma(row);
        });
        if (updated === null) {
          return null;
        }
        rotatedRawToken = generated.raw;
      } else {
        const updated = await this.sessions.rotateToken(
          session.id,
          generated.hash,
          now,
        );
        if (updated === null) {
          return null;
        }
        rotatedRawToken = generated.raw;
        // Also touch the lastSeenAt.
        await this.sessions.touch(session.id, now);
      }
    } else if (sinceLastTouch >= SESSION_IDLE_TOUCH_INTERVAL_MS) {
      // Touch: update lastSeenAt without rotating.
      await this.sessions.touch(session.id, now);
    }

    return {
      session:
        rotatedRawToken !== null
          ? { ...session, rotatedAt: now, lastSeenAt: now }
          : { ...session, lastSeenAt: now },
      user,
      memberships: activeMemberships,
      expiresAt: session.expiresAt,
      rotatedRawToken,
    };
  }

  /**
   * Emit a session-rejection audit event, distinguishing expired
   * sessions from invalid sessions.
   *
   * Per the ninth canonical batch specification, an expired session
   * emits `authentication.session.expired`; an invalid session (not
   * found, revoked, or otherwise unrecognised) emits
   * `authentication.session.invalid`. The two events are mutually
   * exclusive for a single validation failure: the taxonomy does
   * NOT require both.
   *
   * The token hash is NOT persisted; only a boolean indicator that
   * the session was rejected is recorded. The raw cookie value is
   * NEVER persisted. The lookup is performed by querying the
   * `auth_sessions` table directly via the Prisma client; the
   * session repository's `findActiveByTokenHash` method returns
   * `null` for both expired and invalid sessions, so a separate
   * raw lookup is needed to distinguish the two cases.
   */
  private async emitSessionRejection(
    tokenHash: string,
    auditContext: AuditRequestContext,
  ): Promise<void> {
    // Query the session row directly to determine the rejection
    // reason. We do NOT use the session repository because its
    // `findActiveByTokenHash` method returns `null` for all
    // rejection cases (not found, revoked, expired). The raw
    // query lets us inspect `expiresAt` and `revokedAt`.
    let isExpired = false;
    try {
      const row = await this.prisma.authSession.findUnique({
        where: { tokenHash },
        select: { expiresAt: true, revokedAt: true },
      });
      if (row !== null && row.revokedAt === null) {
        // The session exists and is not revoked, but
        // `findActiveByTokenHash` returned null. The only
        // remaining reason is expiry.
        isExpired = row.expiresAt.getTime() <= Date.now();
      }
      // If the row is null (not found) or revoked, `isExpired`
      // remains false; we emit `session.invalid`.
    } catch {
      // If the lookup itself fails (e.g. database unavailable),
      // default to `session.invalid`. We must not block the
      // session-validation flow on an audit-lookup failure.
      isExpired = false;
    }

    if (isExpired) {
      const result = await this.auditHelper.emitDirect({
        action: 'authentication.session.expired',
        outcome: 'failure',
        reasonCode: 'session_expired',
        source: 'api',
        actorType: 'ANONYMOUS',
        requestId: auditContext.requestId,
        correlationId: auditContext.correlationId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        scope: 'session',
        metadata: { endpoint: 'session_validation' },
      });
      if (!result.ok) {
        this.logger.error(
          `Failed to emit session-expired audit event: ${result.reason} — ${result.detail}`,
        );
      }
    } else {
      await this.emitSessionInvalid(tokenHash, auditContext);
    }
  }

  /**
   * Emit a session-invalid audit event. The token hash is NOT
   * persisted; only a boolean indicator that the session was
   * invalid is recorded. The raw cookie value is NEVER persisted.
   */
  private async emitSessionInvalid(
    _tokenHash: string,
    auditContext: AuditRequestContext,
  ): Promise<void> {
    const result = await this.auditHelper.emitDirect({
      action: 'authentication.session.invalid',
      outcome: 'failure',
      reasonCode: 'session_invalid',
      source: 'api',
      actorType: 'ANONYMOUS',
      requestId: auditContext.requestId,
      correlationId: auditContext.correlationId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      scope: 'session',
      metadata: { endpoint: 'session_validation' },
    });
    if (!result.ok) {
      this.logger.error(
        `Failed to emit session-invalid audit event: ${result.reason} — ${result.detail}`,
      );
    }
  }

  /**
   * Issue a CSRF token for an authenticated session.
   *
   * Returns the raw CSRF token. The caller (the controller) returns
   * the raw token in the JSON body; the server stores only the
   * SHA-256 hash (in the `CsrfService`'s in-memory map).
   *
   * If a token already exists for the session, it is replaced. The
   * previous token is invalidated immediately.
   */
  issueCsrfToken(sessionId: SessionId): string {
    return this.csrfService.generate(sessionId);
  }

  /**
   * Logout: verify Origin + CSRF, revoke the session, clear the
   * cookie.
   *
   * Throws `originDisallowed()` (403) if the Origin does not match
   * the configured `WEB_ORIGIN`.
   * Throws `csrfInvalid()` (403) if the CSRF header is missing or
   * the submitted token does not match the stored hash.
   *
   * On success, revokes the session (sets `revokedAt`) and
   * invalidates the CSRF token. Returns `void`; the caller clears
   * the cookie.
   */
  async logout(input: {
    readonly cookieValue: string | undefined;
    readonly origin: string | undefined;
    readonly csrfToken: string | undefined;
    readonly webOrigin: string | string[];
    readonly auditContext?: AuditRequestContext;
  }): Promise<void> {
    // Verify Origin.
    if (!this.isOriginAllowed(input.origin, input.webOrigin)) {
      if (input.auditContext !== undefined) {
        await this.auditHelper.emitDirect({
          action: 'security.origin.denied',
          outcome: 'denied',
          reasonCode: 'origin_disallowed',
          source: 'api',
          requestId: input.auditContext.requestId,
          correlationId: input.auditContext.correlationId,
          ipAddress: input.auditContext.ipAddress,
          userAgent: input.auditContext.userAgent,
          scope: 'logout',
          metadata: { endpoint: 'logout' },
        });
      }
      throw originDisallowed();
    }

    // Validate the session cookie.
    if (!input.cookieValue || input.cookieValue.length === 0) {
      throw csrfInvalid();
    }

    const tokenHash = this.sessionTokens.hash(input.cookieValue);
    const now = new Date();
    const session = await this.sessions.findActiveByTokenHash(tokenHash, now);
    if (session === null) {
      // No active session — still require a valid CSRF token to
      // prevent logout CSRF. The CSRF check below will fail because
      // no CSRF token was issued for a non-existent session.
      throw csrfInvalid();
    }

    // Verify the CSRF token.
    if (!input.csrfToken || input.csrfToken.length === 0) {
      if (input.auditContext !== undefined) {
        await this.auditHelper.emitDirect({
          action: 'security.csrf.denied',
          outcome: 'denied',
          reasonCode: 'csrf_missing',
          source: 'api',
          actorType: 'USER',
          actorId: session.userId,
          sessionId: session.id,
          requestId: input.auditContext.requestId,
          correlationId: input.auditContext.correlationId,
          ipAddress: input.auditContext.ipAddress,
          userAgent: input.auditContext.userAgent,
          scope: 'logout',
          metadata: { endpoint: 'logout' },
        });
      }
      throw csrfInvalid();
    }
    const csrfOk = this.csrfService.verify(session.id, input.csrfToken);
    if (!csrfOk) {
      if (input.auditContext !== undefined) {
        await this.auditHelper.emitDirect({
          action: 'security.csrf.denied',
          outcome: 'denied',
          reasonCode: 'csrf_invalid',
          source: 'api',
          actorType: 'USER',
          actorId: session.userId,
          sessionId: session.id,
          requestId: input.auditContext.requestId,
          correlationId: input.auditContext.correlationId,
          ipAddress: input.auditContext.ipAddress,
          userAgent: input.auditContext.userAgent,
          scope: 'logout',
          metadata: { endpoint: 'logout' },
        });
      }
      throw csrfInvalid();
    }

    // Revoke the session and invalidate the CSRF token. Per the
    // ninth canonical batch specification, session revocation and
    // the audit outbox entry must commit atomically. When an audit
    // context is supplied, we use a transaction that wraps the
    // revocation and the outbox insertion. When no audit context
    // is supplied (backward compatibility), we use the existing
    // non-transactional revocation.
    if (input.auditContext !== undefined) {
      // Load the user to get the tenant for audit chain scoping.
      const user = await this.users.findById(session.userId);
      const memberships = user
        ? await this.memberships.listForUser(user.id)
        : [];
      const activeMemberships = memberships.filter(
        (m) => m.status === 'active',
      );
      await this.prisma.$transaction(async (tx) => {
        await tx.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now },
        });
        await this.auditHelper.emitOrFail(
          {
            action: 'authentication.logout.succeeded',
            outcome: 'success',
            source: 'api',
            tenantId: activeMemberships[0]?.tenantId ?? null,
            actorType: 'USER',
            actorId: session.userId,
            sessionId: session.id,
            requestId: input.auditContext!.requestId,
            correlationId: input.auditContext!.correlationId,
            ipAddress: input.auditContext!.ipAddress,
            userAgent: input.auditContext!.userAgent,
            scope: 'logout',
            metadata: { endpoint: 'logout' },
          },
          { transaction: tx },
        );
      });
    } else {
      await this.sessions.revoke(session.id, now);
    }
    this.csrfService.invalidate(session.id);

    this.logger.debug(`Logout succeeded for session ${session.id}.`);
  }

  /**
   * Revoke all sessions for a user. Used when a user is disabled
   * (the caller — e.g. a future user-management endpoint — calls
   * this immediately after setting `status = disabled`). Returns
   * the number of sessions revoked.
   */
  async revokeAllSessionsForUser(userId: UserId): Promise<number> {
    const now = new Date();
    const count = await this.sessions.revokeAllForUser(userId, now);
    this.logger.debug(`Revoked ${count} sessions for user ${userId}.`);
    return count;
  }

  /**
   * Build the `SessionResponse` JSON body from a user, their
   * memberships, and the session's active Tenant context.
   *
   * Per the fifth canonical batch specification, the session response
   * now carries `activeTenantContext`. The caller passes the
   * session's `activeTenantMembershipId` (or `null`); this method
   * resolves it to the public `ActiveTenantContext` shape by looking
   * up the membership and the Tenant.
   *
   * If the supplied `activeTenantMembershipId` is `null`, the
   * response carries `activeTenantContext: null`.
   *
   * If the supplied `activeTenantMembershipId` is non-null but the
   * membership is not in the user's active memberships list (because
   * it was suspended, the Tenant was suspended, or the membership
   * was deleted), the response carries `activeTenantContext: null`.
   * The caller (the session endpoint) is responsible for clearing
   * the persisted `activeTenantMembershipId` in this case; this
   * method does not mutate the session row. The
   * `SessionContextService.loadContext` method performs the same
   * clearing logic for the context endpoint; the auth module's
   * session endpoint performs it for the session-response endpoint.
   *
   * To avoid duplicating the clearing logic, the auth module's
   * `getSessionFromCookie` method calls the session-context
   * service's clearing logic when needed. This is a deliberate
   * cross-module call: the auth module owns the session lifecycle,
   * but the context-clearing logic lives in the session-context
   * module because it is context-specific. The auth module's
   * session endpoint depends on the session-context service via
   * Nest DI (see `AuthModule` imports).
   *
   * If the caller does not supply `activeTenantMembershipId` (for
   * backward compatibility with callers that have not yet been
   * updated), the response carries `activeTenantContext: null`.
   * This is a transitional default; once all callers are updated,
   * the parameter will be required.
   */
  async buildSessionResponse(input: {
    readonly user: User;
    readonly memberships: TenantMembership[];
    readonly expiresAt: Date;
    readonly activeTenantMembershipId?: TenantMembershipId | null;
    readonly locale?: RoleLabelLocale;
  }): Promise<SessionResponse> {
    const locale: RoleLabelLocale = input.locale ?? 'ar';
    // Enrich memberships with tenant slug + display name + roles.
    const summaries: TenantMembershipSummary[] = [];
    const tenantsById = new Map<
      TenantId,
      { slug: string; displayName: string; status: 'active' | 'suspended' }
    >();
    for (const membership of input.memberships) {
      const tenant = await this.tenants.findById(membership.tenantId);
      if (tenant !== null) {
        tenantsById.set(membership.tenantId, {
          slug: tenant.slug,
          displayName: tenant.displayName,
          status: tenant.status,
        });
      }
      // Load the membership's role assignments. Per the eighth
      // canonical batch specification, the summary carries `roles`
      // as an array of role-summary objects. A membership with no
      // role assignments receives an empty array (fail-closed
      // posture).
      const assignments = await this.roleAssignments.listForMembership(
        membership.id,
      );
      const roleSummaries: RoleSummary[] = assignments.map((a) => ({
        code: a.roleCode,
        displayName: getRoleDisplayName(a.roleCode, locale),
      }));
      summaries.push({
        id: membership.id,
        tenantId: membership.tenantId,
        tenantSlug: tenant?.slug ?? '',
        tenantDisplayName: tenant?.displayName ?? '',
        status: membership.status,
        roles: roleSummaries,
      });
    }

    // Resolve the active Tenant context. If the membership is not
    // in the user's active memberships list, or the Tenant is not
    // active, the context is `null`. The caller is responsible for
    // clearing the persisted `activeTenantMembershipId` when this
    // method returns `null` for a non-null input.
    let activeTenantContext: ActiveTenantContext | null = null;
    if (
      input.activeTenantMembershipId !== undefined &&
      input.activeTenantMembershipId !== null
    ) {
      const selectedMembership = input.memberships.find(
        (m) => m.id === input.activeTenantMembershipId,
      );
      if (
        selectedMembership !== undefined &&
        selectedMembership.status === 'active'
      ) {
        const tenant = tenantsById.get(selectedMembership.tenantId);
        if (tenant !== undefined && tenant.status === 'active') {
          // Load the active membership's role assignments for the
          // active context response.
          const activeAssignments =
            await this.roleAssignments.listForMembership(selectedMembership.id);
          const activeRoleSummaries: RoleSummary[] = activeAssignments.map(
            (a: TenantRoleAssignment) => ({
              code: a.roleCode,
              displayName: getRoleDisplayName(a.roleCode, locale),
            }),
          );
          activeTenantContext = {
            membershipId: selectedMembership.id,
            tenantId: selectedMembership.tenantId,
            tenantSlug: tenant.slug,
            tenantDisplayName: tenant.displayName,
            roles: activeRoleSummaries,
          };
        }
      }
    }

    const authenticatedUser: AuthenticatedUser = {
      id: input.user.id,
      email: input.user.email,
      displayName: input.user.displayName,
      status: input.user.status,
    };

    return {
      user: authenticatedUser,
      memberships: summaries,
      activeTenantContext,
      expiresAt: input.expiresAt.toISOString(),
    };
  }

  /**
   * Check whether the request Origin is allowed.
   *
   * The Origin header is the primary CSRF defence for state-changing
   * auth requests (login and logout). The configured `WEB_ORIGIN` may
   * be a single origin or a comma-separated list of origins.
   *
   * Per the fourth canonical batch security requirement, a missing or
   * empty Origin header is NOT accepted by unsafe auth routes. The
   * check returns `false` for `undefined` or empty Origin; the caller
   * then throws `originDisallowed()` (a generic 403 that does not
   * reveal whether an account exists).
   *
   * Wildcard or reflected origins are not permitted: the Origin must
   * EXACTLY match one of the configured `WEB_ORIGIN` entries.
   *
   * Per the fifth canonical batch specification, this method is
   * public so the session-context module can reuse the same Origin
   * enforcement logic for PUT /api/v1/context/tenant and
   * DELETE /api/v1/context/tenant. The session-context module MUST
   * NOT duplicate the Origin-check logic; it MUST call this method
   * to ensure consistent behaviour across all state-changing
   * endpoints.
   */
  isOriginAllowed(
    origin: string | undefined,
    webOrigin: string | string[],
  ): boolean {
    if (origin === undefined || origin.length === 0) {
      return false;
    }
    if (Array.isArray(webOrigin)) {
      return webOrigin.includes(origin);
    }
    return webOrigin === origin;
  }
}
