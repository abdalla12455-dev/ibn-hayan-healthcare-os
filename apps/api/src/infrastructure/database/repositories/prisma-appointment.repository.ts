import { Injectable } from '@nestjs/common';
import type {
  AppointmentRepository,
  Appointment,
  TenantId,
  OrganisationId,
  FacilityId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { appointmentFromPrisma } from '../mappers/appointment.mapper.js';

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
  ): Promise<Appointment[]> {
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
    });
    return rows.map(appointmentFromPrisma);
  }
}
