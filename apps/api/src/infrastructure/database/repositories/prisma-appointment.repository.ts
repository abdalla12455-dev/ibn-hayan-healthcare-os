import { Injectable } from '@nestjs/common';
import type {
  AppointmentRepository,
  AppointmentReadProjection,
  TenantId,
  OrganisationId,
  FacilityId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { appointmentRowFromPrisma } from '../mappers/appointment.mapper.js';

/**
 * Prisma-backed implementation of {@link AppointmentRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10, every read method takes tenantId,
 * organisationId, and facilityId as required parameters. The query
 * uses a half-open interval for the scheduled start time:
 * `scheduledStart >= startUtc AND scheduledStart < endUtc`.
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 *
 * The query uses a `select` clause to load only the fields required
 * by the AppointmentReadProjection, avoiding unnecessary column reads.
 */
@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByScheduledStartRange(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    startUtc: Date,
    endUtc: Date,
  ): Promise<AppointmentReadProjection[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        organisationId,
        facilityId,
        scheduledStart: {
          gte: startUtc,
          lt: endUtc,
        },
      },
      orderBy: [{ scheduledStart: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        patientId: true,
        providerId: true,
        scheduledStart: true,
        scheduledEnd: true,
        status: true,
        typeCode: true,
      },
    });
    return rows.map(appointmentRowFromPrisma);
  }
}
