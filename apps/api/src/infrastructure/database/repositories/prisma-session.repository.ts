import { Injectable } from '@nestjs/common';
import type {
  Session,
  SessionId,
  SessionTokenHash,
  UserId,
  TenantMembershipId,
  CreateSessionInput,
  SessionRepository,
} from '@ibn-hayan/domain';
import type { OrganisationId } from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
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
 *   Revoked (`revokedAt IS NOT NULL`) and expired (`expiresAt > now`)
 *   sessions are filtered out at the database level. The application
 *   layer re-checks expiry in case of clock skew between the database
 *   and the application process.
 * - Rotate the session token: replace the stored `tokenHash` and
 *   update `rotatedAt`. The previous token is invalidated immediately
 *   because its hash no longer matches any row. Rotation preserves
 *   `activeTenantMembershipId`: a token rotation is NOT a context
 *   change. The session continues to operate within its previously
 *   selected Tenant.
 * - Touch the session's `lastSeenAt` timestamp. Touch preserves
 *   `activeTenantMembershipId`.
 * - Revoke a single session (`revokedAt = revokedAt`). Revocation
 *   does NOT clear `activeTenantMembershipId` because the session
 *   becomes unusable; the row is retained for audit and the
 *   rotation history. A future batch may add a cleanup job that
 *   clears context on long-expired sessions.
 * - Revoke all sessions for a user (used when a user is disabled, when
 *   a password is changed, or for "sign out everywhere").
 * - Set the active TenantMembership for a session. Per the fifth
 *   canonical batch specification, the active context is
 *   session-specific and is selected by TenantMembership ID. The
 *   database enforces (via a composite foreign key) that the
 *   membership belongs to the session's user; the application layer
 *   performs an additional defensive check before calling this port.
 * - Clear the active TenantMembership for a session. Sets the column
 *   to `null`; the session remains valid.
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
 * - This adapter does not accept an arbitrary Tenant ID for context
 *   selection. The caller passes a branded `TenantMembershipId`; the
 *   session cannot be forced into a Tenant for which the user has no
 *   membership.
 *
 * Per ADR-013 §1.3 — the session record does not include the raw
 * session token, the password, the password hash, or any credential
 * material. This adapter is the structural enforcement of that rule
 * at the persistence boundary: the `create` and `rotateToken` methods
 * accept only hashes, never raw tokens.
 *
 * Per the fifth canonical batch specification, this adapter does NOT
 * persist any active Organisation or Facility context. The fifth
 * batch introduces active Tenant context only. The
 * `activeTenantMembershipId` column on `auth_sessions` is the
 * simplest correct representation; no separate context table is
 * required.
 */
@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput): Promise<Session> {
    // Session creation defaults to no active membership. The
    // `activeTenantMembershipId` column is nullable; the caller does
    // not pass it. Context selection is a separate, explicit
    // operation through `setActiveTenantMembership`.
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
    // The lookup returns the `activeTenantMembershipId` column so that
    // session-lookup callers (e.g. the session-response builder) can
    // include the active context in the response without an extra
    // round-trip.
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
    // Rotation replaces only `tokenHash` and `rotatedAt`. The
    // `activeTenantMembershipId` column is NOT touched: a token
    // rotation is NOT a context change. The session continues to
    // operate within its previously selected Tenant.
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
    // Touch updates only `lastSeenAt`. The `activeTenantMembershipId`
    // column is NOT touched: an idle touch is NOT a context change.
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
    //
    // Revocation does NOT clear `activeTenantMembershipId`. The
    // session is unusable once revoked; clearing the column would
    // destroy audit history. A future batch may add a cleanup job
    // that clears context on long-expired sessions.
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

  async setActiveTenantMembership(
    sessionId: SessionId,
    membershipId: TenantMembershipId,
    _selectedAt: Date,
  ): Promise<Session | null> {
    // The `selectedAt` parameter is part of the domain port contract
    // for deterministic testability. The persistence layer does not
    // persist a separate `selectedAt` timestamp in this batch; the
    // session's `updatedAt` column is updated by Prisma's `@updatedAt`
    // mechanism and records the modification time. A future batch
    // may add a dedicated `context_selected_at` column if audit
    // requirements demand it.
    //
    // The composite foreign key on
    // `auth_sessions(active_tenant_membership_id, user_id)` enforces
    // at the database level that the membership belongs to the
    // session's user. The application layer performs an additional
    // defensive check before calling this port; the database
    // constraint is the structural backstop.
    //
    // We do NOT pass `userId` in the `where` clause because the
    // session row already carries `userId` and the composite FK
    // validates the (membershipId, userId) pair against
    // `tenant_memberships(id, user_id)`.
    try {
      const row = await this.prisma.authSession.update({
        where: { id: sessionId },
        data: { activeTenantMembershipId: membershipId },
      });
      return sessionFromPrisma(row);
    } catch {
      // Prisma throws P2003 (foreign key violation) if the
      // membership does not exist, or if the composite FK rejects
      // the (membershipId, userId) pair. The application layer
      // interprets this as "the supplied membership is not valid
      // for this session's user" and returns a generic forbidden
      // response that does not reveal whether the membership
      // exists for another user.
      return null;
    }
  }

  async clearActiveTenantMembership(
    sessionId: SessionId,
    _clearedAt: Date,
  ): Promise<Session | null> {
    // The `clearedAt` parameter is part of the domain port contract
    // for deterministic testability. The persistence layer does not
    // persist a separate `clearedAt` timestamp in this batch; the
    // session's `updatedAt` column records the modification time.
    //
    // Per ADR-015, clearing the active tenant does NOT automatically
    // clear the active organisation and the active facility at the
    // persistence layer. The caller (the session-context service)
    // is responsible for performing the cascade in the same Prisma
    // transaction. This port clears only the tenant context.
    try {
      const row = await this.prisma.authSession.update({
        where: { id: sessionId },
        data: { activeTenantMembershipId: null },
      });
      return sessionFromPrisma(row);
    } catch {
      // The session does not exist or has been deleted. Return null
      // so the application layer can return a 401 (session required)
      // to the caller.
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // ADR-015: active organisation and facility context
  // -------------------------------------------------------------------------

  async setActiveOrganisation(
    sessionId: SessionId,
    organisationId: OrganisationId,
    _selectedAt: Date,
  ): Promise<Session | null> {
    // The `selectedAt` parameter is part of the domain port contract
    // for deterministic testability. The persistence layer does not
    // persist a separate `selectedAt` timestamp; the session's
    // `updatedAt` column records the modification time.
    //
    // The single-column foreign key `active_organisation_id` →
    // `organisations.id` enforces that the organisation exists. The
    // application layer is responsible for verifying that the
    // organisation belongs to the active tenant and that the
    // principal holds an applicable scoped role assignment before
    // calling this port.
    //
    // This port does NOT cascade-clear the active facility. The
    // caller (the session-context service) is responsible for
    // performing the cascade in the same Prisma transaction when
    // the newly selected organisation does not own the currently
    // active facility. The CHECK constraint on `auth_sessions`
    // (`active_facility_id IS NULL OR active_organisation_id IS
    // NOT NULL`) is the database-level backstop that catches any
    // application-layer bug that leaves a facility active without
    // an organisation.
    try {
      const row = await this.prisma.authSession.update({
        where: { id: sessionId },
        data: { activeOrganisationId: organisationId },
      });
      return sessionFromPrisma(row);
    } catch {
      // Prisma throws P2003 (foreign key violation) if the
      // organisation does not exist. The application layer
      // interprets this as a forbidden selection.
      return null;
    }
  }

  async clearActiveOrganisation(
    sessionId: SessionId,
    _clearedAt: Date,
  ): Promise<Session | null> {
    // Per ADR-015, clearing the active organisation does NOT
    // automatically clear the active facility at the persistence
    // layer. The caller (the session-context service) is
    // responsible for performing the cascade in the same Prisma
    // transaction. The CHECK constraint on `auth_sessions` would
    // reject a clear that left a facility active without an
    // organisation; the application-layer cascade prevents the
    // constraint from firing.
    try {
      const row = await this.prisma.authSession.update({
        where: { id: sessionId },
        data: { activeOrganisationId: null },
      });
      return sessionFromPrisma(row);
    } catch {
      return null;
    }
  }

  async setActiveFacility(
    sessionId: SessionId,
    facilityId: FacilityId,
    _selectedAt: Date,
  ): Promise<Session | null> {
    // The composite foreign key
    // `auth_sessions(active_facility_id, active_organisation_id)` →
    // `facilities(id, organisation_id)` enforces at the database
    // level that the active facility belongs to the active
    // organisation. The application layer is responsible for
    // verifying that the facility belongs to the active tenant and
    // that the principal holds an applicable scoped role
    // assignment before calling this port.
    //
    // The CHECK constraint `active_facility_id IS NULL OR
    // active_organisation_id IS NOT NULL` enforces at the database
    // level that a facility cannot be set without an active
    // organisation. The application layer must ensure the active
    // organisation is set before calling this port; if it is not,
    // the CHECK constraint rejects the update.
    try {
      const row = await this.prisma.authSession.update({
        where: { id: sessionId },
        data: { activeFacilityId: facilityId },
      });
      return sessionFromPrisma(row);
    } catch {
      return null;
    }
  }

  async clearActiveFacility(
    sessionId: SessionId,
    _clearedAt: Date,
  ): Promise<Session | null> {
    try {
      const row = await this.prisma.authSession.update({
        where: { id: sessionId },
        data: { activeFacilityId: null },
      });
      return sessionFromPrisma(row);
    } catch {
      return null;
    }
  }
}
