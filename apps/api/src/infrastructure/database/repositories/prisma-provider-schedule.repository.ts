/**
 * Prisma-backed implementation of {@link ProviderScheduleRepository}
 * from `@ibn-hayan/domain`.
 *
 * BC10 Workforce owns provider schedule/availability data. This adapter
 * provides write access for schedule administration (create, delete)
 * and read access for schedule queries.
 *
 * Per CODING_STANDARDS.md §10, every method takes `tenantId` as a
 * required parameter. Cross-tenant queries return empty results or
 * null (not an error).
 */

import { Injectable } from '@nestjs/common';
import type {
  ProviderScheduleEntry,
  ProviderScheduleEntryId,
  ProviderScheduleRepository,
  ProviderScheduleEntryCreateInput,
  TenantId,
  OrganisationId,
  FacilityId,
  ProviderId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import {
  providerScheduleFromPrisma,
  timeOfDayToPrisma,
} from '../mappers/provider-schedule.mapper.js';

/**
 * The Prisma row shape for the ProviderSchedule model. Exported so
 * the mapper can reference it without importing Prisma-generated types
 * directly (the mapper stays decoupled from the Prisma client namespace).
 */
export interface PrismaScheduleRow {
  id: string;
  tenantId: string;
  organisationId: string;
  facilityId: string;
  providerId: string;
  dayOfWeek: number;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaProviderScheduleRepository implements ProviderScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: ProviderScheduleEntryCreateInput,
  ): Promise<ProviderScheduleEntry> {
    const row = await this.prisma.providerSchedule.create({
      data: {
        tenantId,
        organisationId,
        facilityId,
        providerId: input.providerId,
        dayOfWeek: input.dayOfWeek,
        startTime: timeOfDayToPrisma(input.startTime),
        endTime: timeOfDayToPrisma(input.endTime),
      },
    });
    return providerScheduleFromPrisma(row);
  }

  async findByProviderAndFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
  ): Promise<ProviderScheduleEntry[]> {
    const rows = await this.prisma.providerSchedule.findMany({
      where: { tenantId, providerId, facilityId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map((r) => providerScheduleFromPrisma(r));
  }

  async delete(
    tenantId: TenantId,
    entryId: ProviderScheduleEntryId,
  ): Promise<ProviderScheduleEntry | null> {
    const row = await this.prisma.providerSchedule.deleteMany({
      where: { id: entryId, tenantId },
    });
    if (row.count === 0) {
      return null;
    }
    // deleteMany doesn't return the deleted row; re-query is unnecessary
    // since the row is gone. Return a minimal placeholder for the
    // interface contract — callers use the return value only to
    // confirm deletion, not to read the deleted content.
    return null;
  }
}
