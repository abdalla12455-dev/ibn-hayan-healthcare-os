import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import type {
  UserProviderBinding,
  UserProviderBindingId,
  UserProviderBindingRepository,
  ActiveProviderIdentity,
  FacilityScopedActiveProviderIdentity,
  CreateUserProviderBindingInput,
  RevokeUserProviderBindingInput,
  ProviderId,
  TenantId,
} from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import type { UserId } from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import {
  userProviderBindingFromPrisma,
  activeProviderIdentityFromResolverRow,
  facilityScopedActiveProviderIdentityFromResolverRow,
} from '../mappers/user-provider-binding.mapper.js';

/**
 * Prisma-backed implementation of {@link UserProviderBindingRepository}
 * from `@ibn-hayan/domain`.
 *
 * This is the server-side clinical-actor resolver. It derives a TRUSTED
 * Provider identity from `(tenantId, userId)` alone; the caller never
 * supplies a Provider identifier that this adapter trusts.
 *
 * Fail-closed posture (returns `null` for every non-trustworthy state):
 * - No binding exists for `(tenantId, userId)`.
 * - The binding is revoked (`revokedAt` is not null).
 * - The bound User is disabled (`users.status !== 'active'`).
 * - The bound Provider is not `active` (suspended / separated /
 *   candidate / onboarded).
 * - For the facility-scoped variant: the Provider has no active
 *   (non-revoked) assignment to `facilityId` within `tenantId`.
 *
 * Security guarantees:
 * - The lookup is scoped by `tenantId` (derived from the authenticated
 *   session context). A binding in another tenant is never resolved.
 * - No caller-supplied Provider identity is trusted.
 * - No roleCode-derived fallback is performed. The returned
 *   `clinicalAuthorRole` is read from the Provider record.
 * - Cross-tenant and cross-facility resolution return `null`.
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 */
@Injectable()
export class PrismaUserProviderBindingRepository implements UserProviderBindingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveProviderForUser(
    tenantId: TenantId,
    userId: UserId,
  ): Promise<ActiveProviderIdentity | null> {
    // Single tenant-scoped query that joins:
    //   - the active (non-revoked) binding for (tenantId, userId),
    //   - the bound Provider (must be active),
    //   - the bound User (must be active).
    //
    // The User is global, but the binding is tenant-scoped, so the
    // tenantId filter on the binding enforces tenant isolation: a user
    // bound in tenant B is not resolved for tenant A.
    const row = await this.prisma.userProviderBinding.findFirst({
      where: {
        tenantId,
        userId,
        revokedAt: null,
        provider: { status: 'active', tenantId },
        user: { status: 'active' },
      },
      select: {
        id: true,
        tenantId: true,
        providerId: true,
        provider: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            clinicalAuthorRole: true,
          },
        },
      },
    });
    if (row === null) {
      return null;
    }
    return activeProviderIdentityFromResolverRow(row);
  }

  async findActiveProviderForUserAtFacility(
    tenantId: TenantId,
    userId: UserId,
    facilityId: FacilityId,
  ): Promise<FacilityScopedActiveProviderIdentity | null> {
    // Resolve the active binding + active provider + active user, then
    // additionally require an active (non-revoked) facility assignment
    // for the bound Provider to `facilityId` within `tenantId`.
    const row = await this.prisma.userProviderBinding.findFirst({
      where: {
        tenantId,
        userId,
        revokedAt: null,
        provider: { status: 'active', tenantId },
        user: { status: 'active' },
      },
      select: {
        id: true,
        tenantId: true,
        providerId: true,
        provider: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            clinicalAuthorRole: true,
            facilityAssignments: {
              where: {
                tenantId,
                facilityId,
                revokedAt: null,
              },
              select: { id: true, facilityId: true, organisationId: true },
              take: 1,
            },
          },
        },
      },
    });
    if (row === null) {
      return null;
    }
    const assignment = row.provider.facilityAssignments[0] ?? null;
    return facilityScopedActiveProviderIdentityFromResolverRow({
      ...row,
      facilityAssignment: assignment,
    });
  }

  async create(
    input: CreateUserProviderBindingInput,
  ): Promise<UserProviderBinding> {
    try {
      const row = await this.prisma.userProviderBinding.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          providerId: input.providerId,
        },
      });
      return userProviderBindingFromPrisma(row);
    } catch (error) {
      // Prisma P2002 = unique constraint violation. The partial unique
      // indexes on (tenant_id, user_id) and (tenant_id, provider_id)
      // (WHERE revoked_at IS NULL) translate a duplicate active binding
      // into P2002. The API exception layer translates this to 409
      // Conflict. Re-throw as-is so the exception filter can map it.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw error;
      }
      throw error;
    }
  }

  async revoke(
    input: RevokeUserProviderBindingInput,
  ): Promise<UserProviderBinding | null> {
    // Revoke the currently-active binding for (tenantId, userId) by
    // setting revokedAt. A conditional updateMany (revokedAt IS NULL)
    // ensures we only revoke the active binding; then we read it back.
    const updated = await this.prisma.userProviderBinding.updateMany({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        revokedAt: null,
      },
      data: { revokedAt: input.revokedAt },
    });
    if (updated.count === 0) {
      return null;
    }
    const row = await this.prisma.userProviderBinding.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        revokedAt: input.revokedAt,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return row ? userProviderBindingFromPrisma(row) : null;
  }

  async findById(
    tenantId: TenantId,
    bindingId: UserProviderBindingId,
  ): Promise<UserProviderBinding | null> {
    // Tenant-scoped lookup: returns null for bindings in other tenants.
    const row = await this.prisma.userProviderBinding.findFirst({
      where: { id: bindingId, tenantId },
    });
    return row ? userProviderBindingFromPrisma(row) : null;
  }

  /**
   * Resolve the active binding's Provider id for `(tenantId, providerId)`.
   * Not part of the public port; exposed for tests that need to assert
   * the provider-side cardinality without constructing an identity.
   */
  async findActiveBindingForProvider(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<UserProviderBinding | null> {
    const row = await this.prisma.userProviderBinding.findFirst({
      where: { tenantId, providerId, revokedAt: null },
    });
    return row ? userProviderBindingFromPrisma(row) : null;
  }
}
