import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma.service.js';

import { authorizationForbidden } from '../authorization/authorization.errors.js';

import { PlatformAdminAccessService } from './platform-admin-access.service.js';

const PAGE_SIZE = 25;

interface TenantCursor {
  readonly id: string;
  readonly createdAt: Date;
}

function decodeCursor(value: unknown): TenantCursor {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 256 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('Invalid pagination cursor');
  }

  if (
    decoded === null ||
    typeof decoded !== 'object' ||
    Array.isArray(decoded)
  ) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  const record = decoded as Record<string, unknown>;

  if (
    typeof record.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      record.id,
    ) ||
    typeof record.createdAt !== 'string'
  ) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  const date = new Date(record.createdAt);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== record.createdAt
  ) {
    throw new BadRequestException('Invalid pagination cursor');
  }

  return { id: record.id, createdAt: date };
}

function encodeCursor(row: {
  readonly id: string;
  readonly createdAt: Date;
}): string {
  return Buffer.from(
    JSON.stringify({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
    }),
  ).toString('base64url');
}

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
  readonly nextCursor?: string;
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
    cursorToken?: string,
  ): Promise<PlatformTenantList> {
    const authorized =
      await this.platformAccess.hasActivePlatformGrant(authenticatedUserId);

    if (!authorized) {
      throw authorizationForbidden();
    }

    // Authorization precedes all cursor processing and data reads.
    const cursor =
      cursorToken === undefined ? undefined : decodeCursor(cursorToken);

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
      ...(cursor === undefined
        ? {}
        : {
            where: {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  createdAt: cursor.createdAt,
                  id: { lt: cursor.id },
                },
              ],
            },
          }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
    });

    const page = rows.slice(0, PAGE_SIZE);
    const hasMore = rows.length > PAGE_SIZE;

    return {
      items: page.map((row) => ({
        id: row.id,
        slug: row.slug,
        displayName: row.displayName,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      hasMore,
      ...(hasMore ? { nextCursor: encodeCursor(page[page.length - 1]!) } : {}),
    };
  }
}
