import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma.service.js';

import { authorizationForbidden } from '../authorization/authorization.errors.js';

import { PlatformAdminAccessService } from './platform-admin-access.service.js';

const PAGE_SIZE = 25;

export interface PlatformTenantSummary {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly status: 'active' | 'suspended';
  readonly createdAt: string;
}

export interface PlatformTenantList {
  readonly items: readonly PlatformTenantSummary[];
  readonly hasMore: boolean;
}

/**
 * Read-only platform-wide tenant listing.
 *
 * Tenant represents the subscribing customer and is not
 * interchangeable with Organisation or Facility.
 *
 * The user ID must originate from a verified server-side
 * authenticated session, never from a request body or query.
 *
 * Authorization is checked before reading tenant data.
 * Tenant-scoped roles do not establish platform authority.
 *
 * This service exposes a bounded, explicitly selected
 * administrative projection. It does not return clinical
 * records, memberships, credentials, or patient data.
 */
@Injectable()
export class PlatformAdminTenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformAccess: PlatformAdminAccessService,
  ) {}

  async listForPlatformAdministrator(
    authenticatedUserId: string,
  ): Promise<PlatformTenantList> {
    const authorized =
      await this.platformAccess.hasActivePlatformGrant(authenticatedUserId);

    if (!authorized) {
      throw authorizationForbidden();
    }

    // Read one additional record to determine whether more
    // results exist. Never return an unbounded dataset.
    //
    // The stable secondary ordering prevents ambiguous ordering
    // when multiple tenants share the same creation timestamp.
    const rows = await this.prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        displayName: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
    });

    return {
      items: rows.slice(0, PAGE_SIZE).map((row) => ({
        id: row.id,
        slug: row.slug,
        displayName: row.displayName,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      hasMore: rows.length > PAGE_SIZE,
    };
  }
}
