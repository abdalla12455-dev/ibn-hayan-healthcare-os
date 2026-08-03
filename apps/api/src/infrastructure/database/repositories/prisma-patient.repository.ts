import { Injectable } from '@nestjs/common';
import type {
  Patient,
  PatientId,
  PatientRepository,
  TenantId,
} from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { patientFromPrisma } from '../mappers/patient.mapper.js';

/**
 * Prisma-backed implementation of {@link PatientRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10, every read method takes `tenantId` as a
 * required parameter. The repository enforces tenant isolation: looking up
 * a patient ID from a different tenant returns null, not that tenant's patient.
 *
 * Per PATIENTS.md Section 2.2:
 * - Patient records are tenant-isolated by default
 * - A patient created in tenant A is not visible to tenant B
 * - The repository enforces this at the contract level
 *
 * Security guarantees:
 * - Cross-tenant lookups return null (not an error)
 * - Caller-supplied tenantId is authoritative (derived from auth context)
 * - No sensitive patient data is exposed through this interface
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 */
@Injectable()
export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsInTenant(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<boolean> {
    // Use count with tenantId filter to verify patient belongs to the caller tenant.
    // This returns 0 for non-existent patients AND for patients in other tenants.
    const count = await this.prisma.patient.count({
      where: { id: patientId, tenantId },
    });
    return count > 0;
  }

  async findById(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<Patient | null> {
    // Tenant-scoped lookup: returns null for patients in other tenants.
    const row = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    return row ? patientFromPrisma(row) : null;
  }

  async findByMedicalRecordNumber(
    tenantId: TenantId,
    medicalRecordNumber: string,
  ): Promise<Patient | null> {
    // MRN is tenant-wide unique: the same MRN may exist in different tenants.
    // Filter by tenantId to enforce tenant isolation.
    const row = await this.prisma.patient.findFirst({
      where: { tenantId, medicalRecordNumber },
    });
    return row ? patientFromPrisma(row) : null;
  }
}
