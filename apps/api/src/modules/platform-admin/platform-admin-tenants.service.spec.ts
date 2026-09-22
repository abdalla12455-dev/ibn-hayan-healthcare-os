import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../infrastructure/database/prisma.service.js';

import { PlatformAdminAccessService } from './platform-admin-access.service.js';

import { PlatformAdminTenantsService } from './platform-admin-tenants.service.js';

function setup(authorized: boolean) {
  const hasActivePlatformGrant = vi.fn().mockResolvedValue(authorized);

  const findMany = vi.fn().mockResolvedValue([]);

  const prisma = {
    tenant: {
      findMany,
    },
  } as unknown as PrismaService;

  const access = {
    hasActivePlatformGrant,
  } as unknown as PlatformAdminAccessService;

  return {
    service: new PlatformAdminTenantsService(prisma, access),
    findMany,
    hasActivePlatformGrant,
  };
}

describe('PlatformAdminTenantsService', () => {
  it('rejects access without an active platform grant', async () => {
    const { service, findMany, hasActivePlatformGrant } = setup(false);

    await expect(
      service.listForPlatformAdministrator('user-1'),
    ).rejects.toMatchObject({
      status: 403,
    });

    expect(hasActivePlatformGrant).toHaveBeenCalledWith('user-1');

    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects an empty identity without reading tenant data', async () => {
    const { service, findMany } = setup(false);

    await expect(
      service.listForPlatformAdministrator(''),
    ).rejects.toMatchObject({
      status: 403,
    });

    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns an empty list when no tenants exist', async () => {
    const { service } = setup(true);

    const result = await service.listForPlatformAdministrator('platform-user');

    expect(result).toEqual({
      items: [],
      hasMore: false,
    });
  });

  it('returns only the approved tenant fields', async () => {
    const { service, findMany } = setup(true);

    findMany.mockResolvedValue([
      {
        id: 'tenant-1',
        slug: 'clinic-one',
        displayName: 'Clinic One',
        status: 'active',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),

        // This is deliberately excluded from the
        // public response projection.
        internalSecret: 'must-not-leak',
      },
    ]);

    const result = await service.listForPlatformAdministrator('platform-user');

    expect(result).toEqual({
      items: [
        {
          id: 'tenant-1',
          slug: 'clinic-one',
          displayName: 'Clinic One',
          status: 'active',
          createdAt: '2026-01-01T10:00:00.000Z',
        },
      ],
      hasMore: false,
    });

    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });

  it('includes suspended tenants in the platform-wide list', async () => {
    const { service, findMany } = setup(true);

    findMany.mockResolvedValue([
      {
        id: 'tenant-2',
        slug: 'suspended-clinic',
        displayName: 'Suspended Clinic',
        status: 'suspended',
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      },
    ]);

    const result = await service.listForPlatformAdministrator('platform-user');

    expect(result.items[0]?.status).toBe('suspended');
  });

  it('limits the response to 25 tenants', async () => {
    const { service, findMany } = setup(true);

    const rows = Array.from({ length: 26 }, (_, index) => ({
      id: `tenant-${index}`,
      slug: `tenant-${index}`,
      displayName: `Tenant ${index}`,
      status: 'active',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
    }));

    findMany.mockResolvedValue(rows);

    const result = await service.listForPlatformAdministrator('platform-user');

    expect(result.items).toHaveLength(25);
    expect(result.hasMore).toBe(true);

    expect(findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        slug: true,
        displayName: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 26,
    });
  });

  it('does not read tenants when authorization fails unexpectedly', async () => {
    const { service, findMany, hasActivePlatformGrant } = setup(true);

    hasActivePlatformGrant.mockRejectedValue(
      new Error('Authorization unavailable'),
    );

    await expect(
      service.listForPlatformAdministrator('platform-user'),
    ).rejects.toThrow('Authorization unavailable');

    expect(findMany).not.toHaveBeenCalled();
  });

  it('does not turn database failures into successful empty results', async () => {
    const { service, findMany } = setup(true);

    findMany.mockRejectedValue(new Error('Database unavailable'));

    await expect(
      service.listForPlatformAdministrator('platform-user'),
    ).rejects.toThrow('Database unavailable');
  });
});
