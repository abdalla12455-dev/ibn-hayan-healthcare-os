import { describe, it, expect, vi } from 'vitest';
import type { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { PlatformAdminAccessService } from './platform-admin-access.service.js';

function setup(
  userStatus: 'active' | 'disabled' | null,
  grant: { revokedAt: Date | null } | null,
) {
  const findUser = vi
    .fn()
    .mockResolvedValue(userStatus === null ? null : { status: userStatus });

  const findGrant = vi.fn().mockResolvedValue(grant);

  const prisma = {
    user: {
      findUnique: findUser,
    },
    platformAdministrator: {
      findUnique: findGrant,
    },
  } as unknown as PrismaService;

  return {
    service: new PlatformAdminAccessService(prisma),
    findUser,
    findGrant,
  };
}

describe('PlatformAdminAccessService', () => {
  it('accepts an active user with an active grant', async () => {
    const { service, findGrant } = setup('active', { revokedAt: null });

    expect(await service.hasActivePlatformGrant('user-1')).toBe(true);

    expect(findGrant).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { revokedAt: true },
    });
  });

  it('rejects a user without a platform grant', async () => {
    const { service } = setup('active', null);

    expect(await service.hasActivePlatformGrant('user-1')).toBe(false);
  });

  it('rejects a revoked platform grant', async () => {
    const { service } = setup('active', { revokedAt: new Date() });

    expect(await service.hasActivePlatformGrant('user-1')).toBe(false);
  });

  it('rejects a disabled user', async () => {
    const { service, findGrant } = setup('disabled', { revokedAt: null });

    expect(await service.hasActivePlatformGrant('user-1')).toBe(false);

    expect(findGrant).not.toHaveBeenCalled();
  });

  it('rejects a missing user', async () => {
    const { service, findGrant } = setup(null, { revokedAt: null });

    expect(await service.hasActivePlatformGrant('user-1')).toBe(false);

    expect(findGrant).not.toHaveBeenCalled();
  });

  it('rejects an empty user ID', async () => {
    const { service, findUser, findGrant } = setup('active', {
      revokedAt: null,
    });

    expect(await service.hasActivePlatformGrant('')).toBe(false);

    expect(findUser).not.toHaveBeenCalled();
    expect(findGrant).not.toHaveBeenCalled();
  });

  it('does not grant access when the database fails', async () => {
    const { service, findGrant } = setup('active', { revokedAt: null });

    findGrant.mockRejectedValue(new Error('Database unavailable'));

    await expect(service.hasActivePlatformGrant('user-1')).rejects.toThrow(
      'Database unavailable',
    );
  });
});
