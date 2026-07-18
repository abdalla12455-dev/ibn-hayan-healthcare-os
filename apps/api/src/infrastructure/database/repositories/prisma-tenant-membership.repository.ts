import { Injectable } from '@nestjs/common';
import type {
  TenantMembership,
  TenantMembershipId,
  UserId,
  CreateTenantMembershipInput,
  TenantMembershipRepository,
} from '@ibn-hayan/domain';
import type { TenantMembershipStatus } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { tenantMembershipFromPrisma } from '../mappers/tenant-membership.mapper.js';

/**
 * Prisma-backed implementation of {@link TenantMembershipRepository}
 * from `@ibn-hayan/domain`.
 *
 * Responsibilities:
 * - Insert a new TenantMembership row. The `(tenant_id, user_id)`
 *   pair's uniqueness is enforced by the
 *   `tenant_memberships_tenant_id_user_id_key` unique index; a
 *   duplicate insert raises a Prisma `PrismaClientKnownRequestError`
 *   with code `P2002`, which the API exception layer translates to a
 *   409 Conflict.
 * - Look up a TenantMembership by its stable UUID identifier.
 * - List all TenantMemberships belonging to a specific User. The
 *   result is user-scoped.
 *
 * Non-responsibilities:
 * - This adapter does not perform soft-delete.
 * - This adapter does not list memberships for a tenant (tenant-scoped
 *   user administration is deferred to a subsequent batch).
 *
 * Per ADR-012 §1.4 safeguard 1 (Domain isolation), this adapter
 * imports Prisma-generated types but maps them to domain types before
 * returning.
 */
@Injectable()
export class PrismaTenantMembershipRepository implements TenantMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTenantMembershipInput): Promise<TenantMembership> {
    const status: TenantMembershipStatus = input.status ?? 'active';
    const row = await this.prisma.tenantMembership.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        status,
      },
    });
    return tenantMembershipFromPrisma(row);
  }

  async findById(
    membershipId: TenantMembershipId,
  ): Promise<TenantMembership | null> {
    const row = await this.prisma.tenantMembership.findUnique({
      where: { id: membershipId },
    });
    return row ? tenantMembershipFromPrisma(row) : null;
  }

  async listForUser(userId: UserId): Promise<TenantMembership[]> {
    const rows = await this.prisma.tenantMembership.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(tenantMembershipFromPrisma);
  }
}
