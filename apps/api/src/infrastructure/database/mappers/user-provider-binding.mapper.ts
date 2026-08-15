import type {
  UserProviderBinding,
  UserProviderBindingId,
  ActiveProviderIdentity,
  FacilityScopedActiveProviderIdentity,
  ProviderId,
  ProviderLifecycleStatus,
  ClinicalNoteAuthorRole,
  TenantId,
} from '@ibn-hayan/domain';
import { isClinicalNoteAuthorRole } from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import type { UserId } from '@ibn-hayan/domain';
import type {
  UserProviderBinding as PrismaUserProviderBinding,
  ProviderStatus,
  ClinicalNoteAuthorRole as PrismaClinicalNoteAuthorRole,
} from '../../../../generated/prisma/client.js';

/**
 * Maps between the Prisma-generated `UserProviderBinding` row type and
 * the framework-independent `UserProviderBinding` domain type, and maps
 * the resolver join result into the trusted
 * `ActiveProviderIdentity` / `FacilityScopedActiveProviderIdentity`
 * shapes returned by the server-side resolver.
 *
 * Per CODING_STANDARDS.md §5, the mapping is explicit and tested. Per
 * ADR-012 §1.4 safeguard 1, Prisma row types never leak through the
 * adapter's public signatures.
 */

function prismaProviderStatusToDomain(
  status: ProviderStatus,
): ProviderLifecycleStatus {
  return status;
}

function prismaClinicalAuthorRoleToDomain(
  role: PrismaClinicalNoteAuthorRole | null,
): ClinicalNoteAuthorRole | null {
  if (role === null) {
    return null;
  }
  if (!isClinicalNoteAuthorRole(role)) {
    throw new Error(
      `user-provider-binding.mapper: unknown ClinicalNoteAuthorRole value from database: ${String(role)}`,
    );
  }
  return role;
}

export function userProviderBindingFromPrisma(
  row: PrismaUserProviderBinding,
): UserProviderBinding {
  return {
    id: row.id as UserProviderBindingId,
    tenantId: row.tenantId as TenantId,
    userId: row.userId as UserId,
    providerId: row.providerId as ProviderId,
    activatedAt: row.activatedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Shape of the resolver's tenant-scoped join result. The Prisma-backed
 * resolver produces this via a single findFirst that includes the
 * related Provider (and User for the active-status check). This type is
 * infrastructure-internal; it does not leak through the port.
 */
export interface ActiveBindingResolverRow {
  id: string;
  tenantId: string;
  providerId: string;
  provider: {
    id: string;
    tenantId: string;
    status: ProviderStatus;
    clinicalAuthorRole: PrismaClinicalNoteAuthorRole | null;
  };
}

export function activeProviderIdentityFromResolverRow(
  row: ActiveBindingResolverRow,
): ActiveProviderIdentity {
  return {
    bindingId: row.id as UserProviderBindingId,
    providerId: row.providerId as ProviderId,
    tenantId: row.tenantId as TenantId,
    providerStatus: prismaProviderStatusToDomain(row.provider.status),
    clinicalAuthorRole: prismaClinicalAuthorRoleToDomain(
      row.provider.clinicalAuthorRole,
    ),
  };
}

/**
 * Shape of the facility-scoped resolver's join result, which additionally
 * includes the active facility assignment that grounded the resolution.
 */
export interface FacilityScopedResolverRow extends ActiveBindingResolverRow {
  facilityAssignment: {
    id: string;
    facilityId: string;
    organisationId: string;
  } | null;
}

export function facilityScopedActiveProviderIdentityFromResolverRow(
  row: FacilityScopedResolverRow,
): FacilityScopedActiveProviderIdentity | null {
  if (row.facilityAssignment === null) {
    return null;
  }
  return {
    ...activeProviderIdentityFromResolverRow(row),
    facilityAssignmentId: row.facilityAssignment.id,
    facilityId: row.facilityAssignment.facilityId as FacilityId,
    organisationId: row.facilityAssignment.organisationId,
  };
}
