import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  User,
  UserId,
  TenantMembership,
  Session,
  SessionId,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
  TenantRepository,
} from '@ibn-hayan/domain';
import {
  USER_REPOSITORY,
  TENANT_MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
  TENANT_REPOSITORY,
} from '../../infrastructure/database/index.js';
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
} from '@ibn-hayan/contracts';

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
      throw originDisallowed();
    }

    const normalisedEmail = input.email.trim().toLowerCase();
    const user = await this.users.findByNormalisedEmail(normalisedEmail);
    if (user === null) {
      // Unknown email — return the generic 401. Do NOT log the email.
      throw invalidCredentials();
    }

    // Disabled users cannot sign in.
    if (user.status === 'disabled') {
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
      throw invalidCredentials();
    }

    // Verify the user has at least one active membership.
    const userMemberships = await this.memberships.listForUser(user.id);
    const activeMemberships = userMemberships.filter(
      (m) => m.status === 'active',
    );
    if (activeMemberships.length === 0) {
      throw invalidCredentials();
    }

    // Create the session. Generate a fresh token, hash it, persist
    // the hash. The raw token is returned to the caller for cookie-
    // setting.
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);
    const { raw, hash } = generateSessionTokenAndHash(this.sessionTokens);

    const session = await this.sessions.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      lastSeenAt: now,
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
  async getSessionFromCookie(cookieValue: string | undefined): Promise<{
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
      return null;
    }

    const user = await this.users.findById(session.userId);
    if (user === null || user.status === 'disabled') {
      return null;
    }

    const userMemberships = await this.memberships.listForUser(user.id);
    const activeMemberships = userMemberships.filter(
      (m) => m.status === 'active',
    );
    if (activeMemberships.length === 0) {
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
      const updated = await this.sessions.rotateToken(
        session.id,
        generated.hash,
        now,
      );
      if (updated === null) {
        // The session was revoked or deleted between our lookup and
        // our rotation. Treat as invalid.
        return null;
      }
      rotatedRawToken = generated.raw;
      // Also touch the lastSeenAt.
      await this.sessions.touch(session.id, now);
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
  }): Promise<void> {
    // Verify Origin.
    if (!this.isOriginAllowed(input.origin, input.webOrigin)) {
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
      throw csrfInvalid();
    }
    const csrfOk = this.csrfService.verify(session.id, input.csrfToken);
    if (!csrfOk) {
      throw csrfInvalid();
    }

    // Revoke the session and invalidate the CSRF token.
    await this.sessions.revoke(session.id, now);
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
   * Build the `SessionResponse` JSON body from a user and their
   * memberships.
   */
  async buildSessionResponse(input: {
    readonly user: User;
    readonly memberships: TenantMembership[];
    readonly expiresAt: Date;
  }): Promise<SessionResponse> {
    // Enrich memberships with tenant slug + display name.
    const summaries: TenantMembershipSummary[] = [];
    for (const membership of input.memberships) {
      const tenant = await this.tenants.findById(membership.tenantId);
      summaries.push({
        id: membership.id,
        tenantId: membership.tenantId,
        tenantSlug: tenant?.slug ?? '',
        tenantDisplayName: tenant?.displayName ?? '',
        status: membership.status,
      });
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
   */
  private isOriginAllowed(
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
