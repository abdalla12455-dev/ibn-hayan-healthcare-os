import { Injectable } from '@nestjs/common';
import type { ProviderRepository } from '@ibn-hayan/domain';
import type { TenantId } from '@ibn-hayan/domain';
import type { ProviderId } from '@ibn-hayan/domain';

/**
 * Prisma-backed implementation of {@link ProviderRepository}.
 *
 * Per the Stage 1C implementation specification, provider existence
 * validation is a placeholder. The Workforce bounded context (BC10) is
 * not yet implemented. This implementation:
 * - Validates that the providerId is a valid UUID format
 * - Always returns true for valid UUIDs
 *
 * When the Workforce module is implemented, this implementation should be
 * replaced with actual tenant-scoped provider existence checking using
 * the Provider/Staff tables.
 */
@Injectable()
export class PrismaProviderRepository implements ProviderRepository {
  async existsInTenant(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<boolean> {
    // TODO(Stage 1C): Replace with actual Provider/Staff table lookup when
    // the Workforce bounded context (BC10) is implemented.
    // For now, validate UUID format and return true.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(providerId);
  }
}
