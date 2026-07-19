import { Injectable } from '@nestjs/common';
import type {
  TenantRoleAssignment,
  TenantMembershipId,
  CreateTenantRoleAssignmentInput,
  TenantRoleAssignmentRepository,
} from '@ibn-hayan/domain';
import { isPlatformRoleCode } from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { tenantRoleAssignmentFromPrisma } from '../mappers/tenant-role-assignment.mapper.js';

/**
 * Prisma-backed implementation of {@link TenantRoleAssignmentRepository}
 * from `@ibn-hayan/domain`.
 *
 * Responsibilities:
 * - Insert a new TenantRoleAssignment row. The
 *   `(tenant_membership_id, role_code)` pair's uniqueness is enforced
 *   by the `tenant_role_assignments_membership_role_key` unique index;
 *   a duplicate insert raises a Prisma
 *   `PrismaClientKnownRequestError` with code `P2002`, which the API
 *   exception layer translates to a 409 Conflict.
 * - List all TenantRoleAssignments belonging to a specific
 *   TenantMembership. The result is membership-scoped; no assignment
 *   belonging to a different membership can appear in the result.
 *
 * Non-responsibilities:
 * - This adapter does not perform soft-delete.
 * - This adapter does not list assignments for a tenant (tenant-scoped
 *   role administration is deferred to a subsequent batch).
 * - This adapter does not validate business rules such as
 *   segregation-of-duties (prohibited role combinations). Those rules
 *   are enforced at the application layer, not at the persistence
 *   layer.
 *
 * Per ADR-012 §1.4 safeguard 1 (Domain isolation), this adapter
 * imports Prisma-generated types but maps them to domain types before
 * returning.
 *
 * Per the eighth canonical batch specification, the adapter validates
 * that `roleCode` is a canonical platform role code before insertion.
 * An unknown code is rejected with a thrown error (translated to a
 * 400 Bad Request at the API boundary). This is the structural
 * enforcement of "unknown role codes fail validation" at the
 * persistence layer.
 */
@Injectable()
export class PrismaTenantRoleAssignmentRepository implements TenantRoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateTenantRoleAssignmentInput,
  ): Promise<TenantRoleAssignment> {
    // Validate the role code at the persistence boundary. The domain
    // type already constrains the input to PlatformRoleCode, but the
    // validation is defensive: a caller that bypasses the type
    // system (e.g. by casting) is caught here. The `as string` cast
    // is required because TypeScript narrows `input.roleCode` to
    // `never` in the error branch (the type system considers the
    // check unreachable).
    const roleCode: string = input.roleCode;
    if (!isPlatformRoleCode(roleCode)) {
      throw new Error(
        `Unknown role code: '${roleCode}'. The canonical ` +
          'platform role catalogue is R01_PHYSICIAN through ' +
          'R14_INTEGRATION_ACCOUNT.',
      );
    }
    const row = await this.prisma.tenantRoleAssignment.create({
      data: {
        tenantMembershipId: input.tenantMembershipId,
        roleCode: input.roleCode,
      },
    });
    return tenantRoleAssignmentFromPrisma(row);
  }

  async listForMembership(
    membershipId: TenantMembershipId,
  ): Promise<TenantRoleAssignment[]> {
    const rows = await this.prisma.tenantRoleAssignment.findMany({
      where: { tenantMembershipId: membershipId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(tenantRoleAssignmentFromPrisma);
  }
}
