import { Injectable } from '@nestjs/common';
import type {
  Session,
  SessionId,
  SessionTokenHash,
  UserId,
  CreateSessionInput,
  SessionRepository,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { sessionFromPrisma } from '../mappers/session.mapper.js';

/**
 * Prisma-backed implementation of {@link SessionRepository} from
 * `@ibn-hayan/domain`.
 *
 * Responsibilities:
 * - Insert a new AuthSession row. The `token_hash` column's uniqueness
 *   is enforced by the `auth_sessions_token_hash_key` unique index.
 *   In practice a collision is astronomically unlikely (256 bits of
 *   entropy), but the unique constraint is the structural guarantee.
 * - Look up an active session by the SHA-256 hash of its opaque token.
 *   Revoked (`revokedAt IS NOT NULL`) and expired (`expiresAt <= now`)
 *   sessions are filtered out at the database level. The application
 *   layer re-checks expiry in case of clock skew between the database
 *   and the application process.
 * - Rotate the session token: replace the stored `tokenHash` and
 *   update `rotatedAt`. The previous token is invalidated immediately
 *   because its hash no longer matches any row.
 * - Touch the session's `lastSeenAt` timestamp.
 * - Revoke a single session (`revokedAt = revokedAt`).
 * - Revoke all sessions for a user (used when a user is disabled, when
 *   a password is changed, or for "sign out everywhere").
 *
 * Non-responsibilities:
 * - This adapter does NOT persist the raw session token. The
 *   `tokenHash` column stores only the SHA-256 hash; the raw token
 *   lives only in the cookie and in process memory between generation
 *   and cookie-setting.
 * - This adapter does not delete sessions. Revocation sets
 *   `revokedAt`; the row is retained for audit and for the rotation
 *   history. A future batch may add a cleanup job that deletes
 *   long-expired sessions.
 * - This adapter does not log token hashes, user IDs, or any session
 *   metadata. Per CODING_STANDARDS.md §8, no credentials or session
 *   material may appear in logs.
 *
 * Per ADR-013 §1.3 — the session record does not include the raw
 * session token, the password, the password hash, or any credential
 * material. This adapter is the structural enforcement of that rule
 * at the persistence boundary: the `create` and `rotateToken` methods
 * accept only hashes, never raw tokens.
 */
@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const row = await this.prisma.authSession.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        lastSeenAt: input.lastSeenAt,
      },
    });
    return sessionFromPrisma(row);
  }

  async findActiveByTokenHash(
    tokenHash: SessionTokenHash,
    now: Date,
  ): Promise<Session | null> {
    // Filter at the database level: revokedAt IS NULL AND expiresAt > now.
    // The application layer re-checks expiry in case of clock skew.
    const row = await this.prisma.authSession.findUnique({
      where: { tokenHash },
    });
    if (!row) {
      return null;
    }
    if (row.revokedAt !== null) {
      return null;
    }
    if (row.expiresAt.getTime() <= now.getTime()) {
      return null;
    }
    return sessionFromPrisma(row);
  }

  async rotateToken(
    sessionId: SessionId,
    newTokenHash: SessionTokenHash,
    rotatedAt: Date,
  ): Promise<Session | null> {
    const row = await this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        tokenHash: newTokenHash,
        rotatedAt,
      },
    });
    return sessionFromPrisma(row);
  }

  async touch(sessionId: SessionId, lastSeenAt: Date): Promise<Session | null> {
    const row = await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { lastSeenAt },
    });
    return sessionFromPrisma(row);
  }

  async revoke(sessionId: SessionId, revokedAt: Date): Promise<Session | null> {
    // Only update rows that are not already revoked. This is a
    // defence-in-depth measure: it prevents a revoked session from
    // having its `revokedAt` timestamp moved forward by a subsequent
    // revocation call (which could be confusing in audit logs).
    const row = await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt },
    });
    if (row.count === 0) {
      return null;
    }
    const updated = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
    });
    return updated ? sessionFromPrisma(updated) : null;
  }

  async revokeAllForUser(userId: UserId, revokedAt: Date): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
    return result.count;
  }
}
