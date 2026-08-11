import type {
  Encounter,
  EncounterId,
  EncounterStatus,
  EncounterType,
  EncounterPriority,
  FacilityId,
  OrganisationId,
  PatientId,
  ProviderId,
  AppointmentId,
  TenantId,
} from '@ibn-hayan/domain';
import type {
  Encounter as PrismaEncounter,
  EncounterStatus as PrismaEncounterStatus,
  EncounterType as PrismaEncounterType,
  EncounterPriority as PrismaEncounterPriority,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `Encounter` row type and the
 * framework-independent domain types.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested.
 * Per ADR-012 §1.4 safeguard 1, Prisma-generated types do not leak
 * through the adapter's public signatures; the mapping converts them
 * to domain types before returning.
 */

/**
 * Maps a Prisma `EncounterStatus` enum value to the domain
 * `EncounterStatus`. The Prisma-generated enum string values are
 * identical to the canonical database values (lowercase), so the
 * mapping is an identity cast.
 */
function prismaStatusToDomain(status: PrismaEncounterStatus): EncounterStatus {
  return status;
}

/**
 * Maps a Prisma `EncounterType` enum value to the domain
 * `EncounterType`. The values are identical (identity cast).
 */
function prismaTypeToDomain(encounterType: PrismaEncounterType): EncounterType {
  return encounterType;
}

/**
 * Maps a Prisma `EncounterPriority` enum value to the domain
 * `EncounterPriority`. The values are identical (identity cast).
 */
function prismaPriorityToDomain(
  priority: PrismaEncounterPriority,
): EncounterPriority {
  return priority;
}

/**
 * Maps a full Prisma `Encounter` row to a domain `Encounter`.
 *
 * Used by the PrismaEncounterRepository for all reads and writes that
 * return the complete encounter aggregate. The branded identifier
 * casts (`as EncounterId`, `as TenantId`, etc.) are the structural
 * boundary between the unbranded Prisma string types and the branded
 * domain types.
 */
export function encounterFromPrisma(row: PrismaEncounter): Encounter {
  return {
    id: row.id as EncounterId,
    tenantId: row.tenantId as TenantId,
    organisationId: row.organisationId as OrganisationId,
    facilityId: row.facilityId as FacilityId,
    patientId: row.patientId as PatientId,
    providerId: row.providerId as ProviderId,
    appointmentId: row.appointmentId as AppointmentId | null,
    encounterType: prismaTypeToDomain(row.encounterType),
    status: prismaStatusToDomain(row.status),
    priority: prismaPriorityToDomain(row.priority),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
