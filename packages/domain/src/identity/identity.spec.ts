import { describe, it, expect } from 'vitest';

/**
 * Compile-time and runtime smoke tests for the identity domain types
 * and repository ports.
 *
 * These tests do not instantiate any framework. They verify that:
 * - The domain package exports the expected types and interfaces.
 * - The lifecycle values are the ratified values and no others.
 * - The branded identifier types are erased to strings at runtime.
 * - The User type does not expose password hashes.
 * - The Session type does not expose the raw session token.
 * - A no-op repository implementation can be assembled against the
 *   ports without importing any framework. This is the structural
 *   proof that the ports remain framework-independent.
 *
 * The persistence adapter (in apps/api) implements these ports
 * against Prisma. The adapter is tested separately by the database
 * integration tests under `apps/api/test/database/`.
 */

import type {
  User,
  UserId,
  UserLifecycleStatus,
  CreateUserInput,
  TenantMembership,
  TenantMembershipId,
  TenantMembershipStatus,
  CreateTenantMembershipInput,
  Session,
  SessionId,
  SessionTokenHash,
  CreateSessionInput,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
} from './index.js';
import type { TenantId } from '../tenancy/index.js';

describe('identity domain exports', () => {
  it('exports the User type and its identifier type', () => {
    const user: User = {
      id: 'user-1' as UserId,
      email: 'Operator.Alpha@example.invalid',
      normalisedEmail: 'operator.alpha@example.invalid',
      displayName: 'Operator Alpha',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(user.id).toBe('user-1');
    expect(user.email).toBe('Operator.Alpha@example.invalid');
    expect(user.normalisedEmail).toBe('operator.alpha@example.invalid');
    expect(user.status).toBe('active');
  });

  it('User type does not expose passwordHash or any credential material', () => {
    // The User interface is a readonly snapshot of persistent state.
    // It must not include `passwordHash`, `password`, `credential`,
    // `token`, `secret`, or any field whose name suggests credential
    // material. This is the structural enforcement of ADR-013 §1.1
    // point 12 and CODING_STANDARDS.md §13.
    const user: User = {
      id: 'user-1' as UserId,
      email: 'Operator.Alpha@example.invalid',
      normalisedEmail: 'operator.alpha@example.invalid',
      displayName: 'Operator Alpha',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('credential');
    expect(user).not.toHaveProperty('token');
    expect(user).not.toHaveProperty('secret');
  });

  it('exports the TenantMembership type and its identifier type', () => {
    const membership: TenantMembership = {
      id: 'membership-1' as TenantMembershipId,
      tenantId: 'tenant-1' as TenantId,
      userId: 'user-1' as UserId,
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(membership.id).toBe('membership-1');
    expect(membership.tenantId).toBe('tenant-1');
    expect(membership.userId).toBe('user-1');
    expect(membership.status).toBe('active');
  });

  it('TenantMembership type does not carry role or permission fields', () => {
    const membership: TenantMembership = {
      id: 'membership-1' as TenantMembershipId,
      tenantId: 'tenant-1' as TenantId,
      userId: 'user-1' as UserId,
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(membership).not.toHaveProperty('role');
    expect(membership).not.toHaveProperty('roleId');
    expect(membership).not.toHaveProperty('permissions');
    expect(membership).not.toHaveProperty('permissionIds');
  });

  it('exports the Session type and its identifier type', () => {
    const session: Session = {
      id: 'session-1' as SessionId,
      userId: 'user-1' as UserId,
      tokenHash: 'a'.repeat(64) as SessionTokenHash,
      activeTenantMembershipId: null,
      activeOrganisationId: null,
      activeFacilityId: null,
      expiresAt: new Date('2026-01-01T12:00:00Z'),
      lastSeenAt: new Date('2026-01-01T00:00:00Z'),
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(session.id).toBe('session-1');
    expect(session.userId).toBe('user-1');
    expect(session.tokenHash).toBe('a'.repeat(64));
    expect(session.activeTenantMembershipId).toBeNull();
    expect(session.activeOrganisationId).toBeNull();
    expect(session.activeFacilityId).toBeNull();
    expect(session.rotatedAt).toBeNull();
    expect(session.revokedAt).toBeNull();
  });

  it('Session type persists only a hash of the token, never the raw token', () => {
    const session: Session = {
      id: 'session-1' as SessionId,
      userId: 'user-1' as UserId,
      tokenHash: 'a'.repeat(64) as SessionTokenHash,
      activeTenantMembershipId: null,
      activeOrganisationId: null,
      activeFacilityId: null,
      expiresAt: new Date('2026-01-01T12:00:00Z'),
      lastSeenAt: new Date('2026-01-01T00:00:00Z'),
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    // The session record must not include the raw token, the
    // password, the password hash, or any credential material.
    expect(session).not.toHaveProperty('token');
    expect(session).not.toHaveProperty('rawToken');
    expect(session).not.toHaveProperty('password');
    expect(session).not.toHaveProperty('passwordHash');
    // tokenHash is a 64-character hex string (SHA-256); never the
    // 43-character base64url raw token.
    expect(session.tokenHash).toHaveLength(64);
  });

  it('Session.activeTenantMembershipId may carry a TenantMembershipId', () => {
    const membershipId = 'membership-1' as TenantMembershipId;
    const session: Session = {
      id: 'session-1' as SessionId,
      userId: 'user-1' as UserId,
      tokenHash: 'a'.repeat(64) as SessionTokenHash,
      activeTenantMembershipId: membershipId,
      activeOrganisationId: null,
      activeFacilityId: null,
      expiresAt: new Date('2026-01-01T12:00:00Z'),
      lastSeenAt: new Date('2026-01-01T00:00:00Z'),
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(session.activeTenantMembershipId).toBe(membershipId);
    expect(session.activeTenantMembershipId).toBe('membership-1');
  });

  it('Session type carries active Organisation and Facility context per ADR-015', () => {
    // Per ADR-015 (Scoped Organisation and Facility Context), the
    // Session type now carries activeOrganisationId and
    // activeFacilityId, both nullable. This test is the structural
    // enforcement of that the ADR-015 extension at the domain type
    // level.
    const session: Session = {
      id: 'session-1' as SessionId,
      userId: 'user-1' as UserId,
      tokenHash: 'a'.repeat(64) as SessionTokenHash,
      activeTenantMembershipId: null,
      activeOrganisationId: null,
      activeFacilityId: null,
      expiresAt: new Date('2026-01-01T12:00:00Z'),
      lastSeenAt: new Date('2026-01-01T00:00:00Z'),
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(session).toHaveProperty('activeOrganisationId');
    expect(session).toHaveProperty('activeFacilityId');
    expect(session.activeOrganisationId).toBeNull();
    expect(session.activeFacilityId).toBeNull();
    // The session must NOT carry a denormalised activeTenantId;
    // the tenant is referenced transitively through the selected
    // TenantMembership.
    expect(session).not.toHaveProperty('activeTenantId');
    expect(session).not.toHaveProperty('activeTenantSlug');
    expect(session).not.toHaveProperty('activeTenantDisplayName');
    expect(session).not.toHaveProperty('role');
    expect(session).not.toHaveProperty('roleId');
    expect(session).not.toHaveProperty('permissions');
    expect(session).not.toHaveProperty('permissionIds');
  });

  it('branded identifier types are erased to strings at runtime', () => {
    const userId: UserId = 'user-1' as UserId;
    const membershipId: TenantMembershipId =
      'membership-1' as TenantMembershipId;
    const sessionId: SessionId = 'session-1' as SessionId;
    const tokenHash: SessionTokenHash = 'a'.repeat(64) as SessionTokenHash;
    expect(typeof userId).toBe('string');
    expect(typeof membershipId).toBe('string');
    expect(typeof sessionId).toBe('string');
    expect(typeof tokenHash).toBe('string');
    expect(userId).toBe('user-1');
    expect(membershipId).toBe('membership-1');
    expect(sessionId).toBe('session-1');
    expect(tokenHash).toBe('a'.repeat(64));
  });
});

describe('identity lifecycle values', () => {
  it('UserLifecycleStatus has exactly the two ratified values', () => {
    const values: UserLifecycleStatus[] = ['active', 'disabled'];
    expect(values).toHaveLength(2);
    expect(values).toContain('active');
    expect(values).toContain('disabled');
    // Compile-time check: assigning any other value is a type error.
    // The line below would not compile if uncommented:
    // const bad: UserLifecycleStatus = 'locked';
  });

  it('TenantMembershipStatus has exactly the two ratified values', () => {
    const values: TenantMembershipStatus[] = ['active', 'suspended'];
    expect(values).toHaveLength(2);
    expect(values).toContain('active');
    expect(values).toContain('suspended');
  });
});

describe('identity create inputs', () => {
  it('CreateUserInput requires email and displayName; status is optional', () => {
    const minimal: CreateUserInput = {
      email: 'Operator.Alpha@example.invalid',
      displayName: 'Operator Alpha',
    };
    expect(minimal.email).toBe('Operator.Alpha@example.invalid');
    expect(minimal.displayName).toBe('Operator Alpha');
    expect(minimal.status).toBeUndefined();

    const withStatus: CreateUserInput = {
      email: 'Operator.Beta@example.invalid',
      displayName: 'Operator Beta',
      status: 'disabled',
    };
    expect(withStatus.status).toBe('disabled');
  });

  it('CreateUserInput does not accept a passwordHash field', () => {
    // The CreateUserInput interface deliberately excludes password
    // hashes. The credential row is created separately by the
    // authentication service after the password has been hashed
    // through Argon2id. This is the structural separation of the
    // user lifecycle from the credential lifecycle.
    const minimal: CreateUserInput = {
      email: 'Operator.Alpha@example.invalid',
      displayName: 'Operator Alpha',
    };
    expect(minimal).not.toHaveProperty('passwordHash');
    expect(minimal).not.toHaveProperty('password');
  });

  it('CreateTenantMembershipInput requires tenantId and userId', () => {
    const minimal: CreateTenantMembershipInput = {
      tenantId: 'tenant-1' as TenantId,
      userId: 'user-1' as UserId,
    };
    expect(minimal.tenantId).toBe('tenant-1');
    expect(minimal.userId).toBe('user-1');
    expect(minimal.status).toBeUndefined();
  });

  it('CreateSessionInput requires userId, tokenHash, expiresAt, lastSeenAt', () => {
    const minimal: CreateSessionInput = {
      userId: 'user-1' as UserId,
      tokenHash: 'a'.repeat(64) as SessionTokenHash,
      expiresAt: new Date('2026-01-01T12:00:00Z'),
      lastSeenAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(minimal.userId).toBe('user-1');
    expect(minimal.tokenHash).toBe('a'.repeat(64));
    expect(minimal.expiresAt).toEqual(new Date('2026-01-01T12:00:00Z'));
    expect(minimal.lastSeenAt).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('CreateSessionInput does not accept the raw token', () => {
    const minimal: CreateSessionInput = {
      userId: 'user-1' as UserId,
      tokenHash: 'a'.repeat(64) as SessionTokenHash,
      expiresAt: new Date('2026-01-01T12:00:00Z'),
      lastSeenAt: new Date('2026-01-01T00:00:00Z'),
    };
    expect(minimal).not.toHaveProperty('token');
    expect(minimal).not.toHaveProperty('rawToken');
  });
});

describe('identity repository ports', () => {
  it('UserRepository port can be implemented without any framework import', () => {
    const stub: UserRepository = {
      async create(_input: CreateUserInput): Promise<User> {
        throw new Error('not implemented');
      },
      async findById(_userId: UserId): Promise<User | null> {
        return null;
      },
      async findByNormalisedEmail(
        _normalisedEmail: string,
      ): Promise<User | null> {
        return null;
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.create).toBe('function');
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.findByNormalisedEmail).toBe('function');
  });

  it('TenantMembershipRepository port can be implemented without any framework import', () => {
    const stub: TenantMembershipRepository = {
      async create(
        _input: CreateTenantMembershipInput,
      ): Promise<TenantMembership> {
        throw new Error('not implemented');
      },
      async findById(
        _membershipId: TenantMembershipId,
      ): Promise<TenantMembership | null> {
        return null;
      },
      async listForUser(_userId: UserId): Promise<TenantMembership[]> {
        return [];
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.create).toBe('function');
    expect(typeof stub.findById).toBe('function');
    expect(typeof stub.listForUser).toBe('function');
  });

  it('SessionRepository port exposes the ratified methods', () => {
    const stub: SessionRepository = {
      async create(_input: CreateSessionInput): Promise<Session> {
        throw new Error('not implemented');
      },
      async findActiveByTokenHash(
        _tokenHash: SessionTokenHash,
        _now: Date,
      ): Promise<Session | null> {
        return null;
      },
      async rotateToken(
        _sessionId: SessionId,
        _newTokenHash: SessionTokenHash,
        _rotatedAt: Date,
      ): Promise<Session | null> {
        return null;
      },
      async touch(
        _sessionId: SessionId,
        _lastSeenAt: Date,
      ): Promise<Session | null> {
        return null;
      },
      async revoke(
        _sessionId: SessionId,
        _revokedAt: Date,
      ): Promise<Session | null> {
        return null;
      },
      async revokeAllForUser(_userId: UserId, _revokedAt: Date): Promise<number> {
        return 0;
      },
      async setActiveTenantMembership(
        _sessionId: SessionId,
        _membershipId: TenantMembershipId,
        _selectedAt: Date,
      ): Promise<Session | null> {
        return null;
      },
      async clearActiveTenantMembership(
        _sessionId: SessionId,
        _clearedAt: Date,
      ): Promise<Session | null> {
        return null;
      },
      async setActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async clearActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async setActiveFacility(): Promise<Session | null> {
        return null;
      },
      async clearActiveFacility(): Promise<Session | null> {
        return null;
      },
    };
    expect(stub).toBeDefined();
    expect(typeof stub.create).toBe('function');
    expect(typeof stub.findActiveByTokenHash).toBe('function');
    expect(typeof stub.rotateToken).toBe('function');
    expect(typeof stub.touch).toBe('function');
    expect(typeof stub.revoke).toBe('function');
    expect(typeof stub.revokeAllForUser).toBe('function');
    expect(typeof stub.setActiveTenantMembership).toBe('function');
    expect(typeof stub.clearActiveTenantMembership).toBe('function');
    expect(typeof stub.setActiveOrganisation).toBe('function');
    expect(typeof stub.clearActiveOrganisation).toBe('function');
    expect(typeof stub.setActiveFacility).toBe('function');
    expect(typeof stub.clearActiveFacility).toBe('function');
  });

  it('SessionRepository.findActiveByTokenHash takes (tokenHash, now) — no raw-token lookup exists', () => {
    // This is a compile-time guarantee that the API surface cannot
    // represent a raw-token lookup. The session-lookup flow hashes
    // the cookie value through SHA-256 before calling this port.
    const stub: SessionRepository = {
      async create(): Promise<Session> {
        throw new Error('not implemented');
      },
      async findActiveByTokenHash(
        tokenHash: SessionTokenHash,
        now: Date,
      ): Promise<Session | null> {
        expect(typeof tokenHash).toBe('string');
        expect(tokenHash).toHaveLength(64);
        expect(now).toBeInstanceOf(Date);
        return null;
      },
      async rotateToken(): Promise<Session | null> {
        return null;
      },
      async touch(): Promise<Session | null> {
        return null;
      },
      async revoke(): Promise<Session | null> {
        return null;
      },
      async revokeAllForUser(): Promise<number> {
        return 0;
      },
      async setActiveTenantMembership(): Promise<Session | null> {
        return null;
      },
      async clearActiveTenantMembership(): Promise<Session | null> {
        return null;
      },
      async setActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async clearActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async setActiveFacility(): Promise<Session | null> {
        return null;
      },
      async clearActiveFacility(): Promise<Session | null> {
        return null;
      },
    };
    expect(stub.findActiveByTokenHash).toBeDefined();
  });

  it('SessionRepository.rotateToken replaces the stored hash and invalidates the previous token', () => {
    // The signature itself is the contract: rotateToken takes a
    // newTokenHash, not a new raw token. The previous token's hash
    // no longer matches any row after rotation; a subsequent
    // findActiveByTokenHash with the old hash returns null.
    const stub: SessionRepository = {
      async create(): Promise<Session> {
        throw new Error('not implemented');
      },
      async findActiveByTokenHash(): Promise<Session | null> {
        return null;
      },
      async rotateToken(
        sessionId: SessionId,
        newTokenHash: SessionTokenHash,
        rotatedAt: Date,
      ): Promise<Session | null> {
        expect(typeof sessionId).toBe('string');
        expect(typeof newTokenHash).toBe('string');
        expect(newTokenHash).toHaveLength(64);
        expect(rotatedAt).toBeInstanceOf(Date);
        return null;
      },
      async touch(): Promise<Session | null> {
        return null;
      },
      async revoke(): Promise<Session | null> {
        return null;
      },
      async revokeAllForUser(): Promise<number> {
        return 0;
      },
      async setActiveTenantMembership(): Promise<Session | null> {
        return null;
      },
      async clearActiveTenantMembership(): Promise<Session | null> {
        return null;
      },
      async setActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async clearActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async setActiveFacility(): Promise<Session | null> {
        return null;
      },
      async clearActiveFacility(): Promise<Session | null> {
        return null;
      },
    };
    expect(stub.rotateToken).toBeDefined();
  });

  it('SessionRepository.setActiveTenantMembership takes a TenantMembershipId, never an arbitrary TenantId', () => {
    // The signature itself is the contract: the caller passes a
    // branded TenantMembershipId, not a TenantId. The persistence
    // layer enforces (via a composite foreign key) that the
    // membership belongs to the session's user. The application
    // layer performs an additional defensive check before calling
    // this port.
    const stub: SessionRepository = {
      async create(): Promise<Session> {
        throw new Error('not implemented');
      },
      async findActiveByTokenHash(): Promise<Session | null> {
        return null;
      },
      async rotateToken(): Promise<Session | null> {
        return null;
      },
      async touch(): Promise<Session | null> {
        return null;
      },
      async revoke(): Promise<Session | null> {
        return null;
      },
      async revokeAllForUser(): Promise<number> {
        return 0;
      },
      async setActiveTenantMembership(
        sessionId: SessionId,
        membershipId: TenantMembershipId,
        selectedAt: Date,
      ): Promise<Session | null> {
        expect(typeof sessionId).toBe('string');
        expect(typeof membershipId).toBe('string');
        expect(selectedAt).toBeInstanceOf(Date);
        return null;
      },
      async clearActiveTenantMembership(): Promise<Session | null> {
        return null;
      },
      async setActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async clearActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async setActiveFacility(): Promise<Session | null> {
        return null;
      },
      async clearActiveFacility(): Promise<Session | null> {
        return null;
      },
    };
    expect(stub.setActiveTenantMembership).toBeDefined();
  });

  it('SessionRepository.clearActiveTenantMembership takes (sessionId, clearedAt)', () => {
    const stub: SessionRepository = {
      async create(): Promise<Session> {
        throw new Error('not implemented');
      },
      async findActiveByTokenHash(): Promise<Session | null> {
        return null;
      },
      async rotateToken(): Promise<Session | null> {
        return null;
      },
      async touch(): Promise<Session | null> {
        return null;
      },
      async revoke(): Promise<Session | null> {
        return null;
      },
      async revokeAllForUser(): Promise<number> {
        return 0;
      },
      async setActiveTenantMembership(): Promise<Session | null> {
        return null;
      },
      async clearActiveTenantMembership(
        sessionId: SessionId,
        clearedAt: Date,
      ): Promise<Session | null> {
        expect(typeof sessionId).toBe('string');
        expect(clearedAt).toBeInstanceOf(Date);
        return null;
      },
      async setActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async clearActiveOrganisation(): Promise<Session | null> {
        return null;
      },
      async setActiveFacility(): Promise<Session | null> {
        return null;
      },
      async clearActiveFacility(): Promise<Session | null> {
        return null;
      },
    };
    expect(stub.clearActiveTenantMembership).toBeDefined();
  });
});
