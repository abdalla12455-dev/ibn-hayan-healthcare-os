import { Injectable } from '@nestjs/common';
import type {
  Organisation,
  OrganisationId,
  TenantId,
  CreateOrganisationInput,
  OrganisationRepository,
} from '@ibn-hayan/domain';
import type { OrganisationStatus } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { organisationFromPrisma } from '../mappers/organisation.mapper.js';

/**
 * Prisma-backed implementation of {@link OrganisationRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10 (Tenant-Scope Requirements), every read
 * method takes `tenantId` as a required parameter. There is no
 * unscoped `findById(organisationId)`. The Prisma `findUnique` call
 * uses the composite unique constraint
 * `organisations_tenant_id_id_key` on `(tenant_id, id)` so that a
 * lookup with an organisation id from a different Tenant returns
 * `null`, not the other Tenant's organisation. The Prisma `findMany`
 * call uses a `where: { tenantId }` filter so that no organisation
 * from another Tenant can appear in the result.
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 */
@Injectable()
export class PrismaOrganisationRepository implements OrganisationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrganisationInput): Promise<Organisation> {
    const status: OrganisationStatus = input.status ?? 'active';
    const row = await this.prisma.organisation.create({
      data: {
        tenantId: input.tenantId,
        code: input.code,
        displayName: input.displayName,
        status,
      },
    });
    return organisationFromPrisma(row);
  }

  async findById(
    tenantId: TenantId,
    organisationId: OrganisationId,
  ): Promise<Organisation | null> {
    // Use the composite unique constraint on `(tenant_id, id)` so
    // that an organisation id from a different Tenant returns `null`.
    // This is the structural enforcement of tenant scope: the query
    // itself cannot return a cross-tenant row.
    const row = await this.prisma.organisation.findUnique({
      where: {
        tenantId_id: { tenantId, id: organisationId },
      },
    });
    return row ? organisationFromPrisma(row) : null;
  }

  async listForTenant(tenantId: TenantId): Promise<Organisation[]> {
    const rows = await this.prisma.organisation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(organisationFromPrisma);
  }
}
