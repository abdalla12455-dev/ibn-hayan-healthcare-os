import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

/**
 * Server-side platform administration grant lookup.
 *
 * The user ID must come from a verified authenticated session.
 * Never accept an ID supplied by a browser or request payload.
 *
 * Tenant roles, including R09 and R13, do not establish
 * platform-wide authority.
 *
 * This service does not authenticate a session or authorize
 * any API endpoint by itself.
 */
@Injectable()
export class PlatformAdminAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async hasActivePlatformGrant(authenticatedUserId: string): Promise<boolean> {
    if (
      typeof authenticatedUserId !== 'string' ||
      authenticatedUserId.trim().length === 0
    ) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: authenticatedUserId,
      },
      select: {
        status: true,
      },
    });

    if (user?.status !== 'active') {
      return false;
    }

    const grant = await this.prisma.platformAdministrator.findUnique({
      where: {
        userId: authenticatedUserId,
      },
      select: {
        revokedAt: true,
      },
    });

    return grant !== null && grant.revokedAt === null;
  }
}
