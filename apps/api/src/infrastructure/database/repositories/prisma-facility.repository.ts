import { Injectable } from '@nestjs/common';
import type {
  Facility,
  FacilityId,
  TenantId,
  OrganisationId,
  CreateFacilityInput,
  FacilityRepository,
} from '@ibn-hayan/domain';
import type { FacilityStatus } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { facilityFromPrisma } from '../mappers/facility.mapper.js';

/**
 * Prisma-backed implementation of {@link FacilityRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10, every read method takes `tenantId` as a
 * required parameter. The `findById` method uses the composite unique
 * constraint `facilities_tenant_id_organisation_id_code_key` is NOT
 * the constraint used here (that's the code-uniqueness constraint);
 * instead, `findById` looks up by `id` and then filters by `tenantId`
 * in a `whereFirst` style. Prisma 7's `findUnique` only supports
 * unique-constraint lookups, and there is no unique constraint on
 * `(tenantId, id)` for facilities. We therefore use `findFirst` with
 * a `where: { AND: [{ id }, { tenantId }] }` filter so that a lookup
 * with a facility id from a different Tenant returns `null`.
 *
 * The `create` method relies on the composite foreign key
 * `facilities_tenant_id_organisation_id_fkey` (added by the reviewed
 * raw SQL supplement to the migration) to reject any insert where
 * `tenantId` does not match the Organisation's `tenantId`. This is
 * the structural enforcement that prevents cross-tenant facility
 * attachment.
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 */
@Injectable()
export class PrismaFacilityRepository implements FacilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFacilityInput): Promise<Facility> {
    const status: FacilityStatus = input.status ?? 'active';
    const row = await this.prisma.facility.create({
      data: {
        tenantId: input.tenantId,
        organisationId: input.organisationId,
        code: input.code,
        displayName: input.displayName,
        status,
      },
    });
    return facilityFromPrisma(row);
  }

  async findById(
    tenantId: TenantId,
    facilityId: FacilityId,
  ): Promise<Facility | null> {
    // There is no unique constraint on `(tenantId, id)` for
    // facilities, so we use `findFirst` with a `where` filter. The
    // filter includes both `id` (which is globally unique as a
    // primary key) and `tenantId` (which scopes the lookup to the
    // caller's tenant). A lookup with a facility id from a different
    // Tenant returns `null`.
    const row = await this.prisma.facility.findFirst({
      where: { id: facilityId, tenantId },
    });
    return row ? facilityFromPrisma(row) : null;
  }

  async listForOrganisation(
    tenantId: TenantId,
    organisationId: OrganisationId,
  ): Promise<Facility[]> {
    const rows = await this.prisma.facility.findMany({
      where: { tenantId, organisationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(facilityFromPrisma);
  }
}
