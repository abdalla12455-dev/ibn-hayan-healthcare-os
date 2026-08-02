import { Injectable } from '@nestjs/common';
import type { PatientRepository } from '@ibn-hayan/domain';
import type { TenantId } from '@ibn-hayan/domain';
import type { PatientId } from '@ibn-hayan/domain';

/**
 * Prisma-backed implementation of {@link PatientRepository}.
 *
 * Per the Stage 1C implementation specification, patient existence
 * validation is a placeholder. The Patient bounded context (BC01) is
 * not yet implemented. This implementation:
 * - Validates that the patientId is a valid UUID format
 * - Always returns true for valid UUIDs
 *
 * When the Patient module is implemented, this implementation should be
 * replaced with actual tenant-scoped patient existence checking using
 * the Patient table.
 */
@Injectable()
export class PrismaPatientRepository implements PatientRepository {
  async existsInTenant(
    tenantId: TenantId,
    patientId: PatientId,
  ): Promise<boolean> {
    // TODO(Stage 1C): Replace with actual Patient table lookup when
    // the Patient bounded context (BC01) is implemented.
    // For now, validate UUID format and return true.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(patientId);
  }
}
