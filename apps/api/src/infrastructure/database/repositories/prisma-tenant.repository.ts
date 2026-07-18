import { Injectable } from '@nestjs/common';
import type {
  Tenant,
  TenantId,
  CreateTenantInput,
  TenantRepository,
} from '@ibn-hayan/domain';
import type { TenantStatus } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { tenantFromPrisma } from '../mappers/tenant.mapper.js';

/**
 * Prisma-backed implementation of {@link TenantRepository} from
 * `@ibn-hayan/domain`.
 *
 * Responsibilities:
 * - Insert a new Tenant row. The slug's global uniqueness is enforced
 *   by the `tenants_slug_key` unique index; a duplicate insert raises
 *   a Prisma `PrismaClientKnownRequestError` with code `P2002`, which
 *   the API exception layer translates to a 409 Conflict.
 * - Look up a Tenant by its stable UUID identifier.
 * - Look up a Tenant by its globally-unique slug.
 *
 * Non-responsibilities:
 * - This adapter does not enforce tenant scope on Organisation or
 *   Facility reads; that enforcement lives in
 *   `prisma-organisation.repository.ts` and
 *   `prisma-facility.repository.ts` respectively, and is structural
 *   (the read methods take `tenantId` as a required parameter).
 * - This adapter does not perform soft-delete. `delete` is not
 *   declared on the port and is not implemented here.
 *
 * Per ADR-012 §1.4 safeguard 1 (Domain isolation), this adapter
 * imports Prisma-generated types but maps them to domain types before
 * returning. The domain package does not import Prisma; the Prisma
 * types do not leak through this adapter's public signatures.
 */
@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTenantInput): Promise<Tenant> {
    const status: TenantStatus = input.status ?? 'active';
    const row = await this.prisma.tenant.create({
      data: {
        slug: input.slug,
        displayName: input.displayName,
        status,
      },
    });
    return tenantFromPrisma(row);
  }

  async findById(tenantId: TenantId): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    return row ? tenantFromPrisma(row) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    return row ? tenantFromPrisma(row) : null;
  }
}
