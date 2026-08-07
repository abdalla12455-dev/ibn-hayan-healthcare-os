import { Injectable } from '@nestjs/common';
import type {
  AppointmentRepository,
  AppointmentReadProjection,
  Appointment,
  AppointmentCreateInput,
  TenantId,
  OrganisationId,
  FacilityId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import {
  appointmentRowFromPrisma,
  appointmentFromPrisma,
} from '../mappers/appointment.mapper.js';

/**
 * Error thrown when a provider has an overlapping appointment.
 */
export class AppointmentOverlapError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly conflictingAppointmentId: string,
  ) {
    super(
      `Provider ${providerId} has a conflicting appointment ${conflictingAppointmentId}`,
    );
    this.name = 'AppointmentOverlapError';
  }
}

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
 *
 * Per Stage 1C, the create method implements concurrency-safe provider
 * overlap prevention using a transaction with SERIALIZABLE isolation.
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

  async create(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    input: AppointmentCreateInput,
  ): Promise<Appointment> {
    // Use a transaction with SERIALIZABLE isolation for concurrency safety.
    // The overlap check and insert are atomic, preventing race conditions
    // where two concurrent requests could both create overlapping appointments.
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Check for overlapping appointments for the same provider.
        // Overlap condition: existingStart < requestedEnd AND existingEnd > requestedStart
        // This is the standard overlap rule. Adjacent appointments where
        // one ends exactly when another begins are NOT considered overlapping.
        const conflicting = await tx.appointment.findFirst({
          where: {
            tenantId,
            organisationId,
            facilityId,
            providerId: input.providerId,
            // Overlap: existingStart < requestedEnd AND existingEnd > requestedStart
            scheduledStart: {
              lt: input.scheduledEnd,
            },
            scheduledEnd: {
              gt: input.scheduledStart,
            },
          },
          select: {
            id: true,
          },
        });

        if (conflicting) {
          throw new AppointmentOverlapError(input.providerId, conflicting.id);
        }

        // Create the appointment
        const created = await tx.appointment.create({
          data: {
            tenantId,
            organisationId,
            facilityId,
            patientId: input.patientId,
            providerId: input.providerId,
            scheduledStart: input.scheduledStart,
            scheduledEnd: input.scheduledEnd,
            status: 'booked',
            typeCode: input.typeCode,
          },
        });

        return created;
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    return appointmentFromPrisma(result);
  }
}
