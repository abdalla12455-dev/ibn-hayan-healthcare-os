import { Injectable } from '@nestjs/common';
import type {
  TenantRoleAssignment,
  TenantMembershipId,
  CreateTenantRoleAssignmentInput,
  TenantRoleAssignmentRepository,
  RoleAssignmentScopeLevel,
} from '@ibn-hayan/domain';
import { isPlatformRoleCode } from '@ibn-hayan/domain';
import type { OrganisationId } from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import { tenantRoleAssignmentFromPrisma } from '../mappers/tenant-role-assignment.mapper.js';

/**
 * Prisma-backed implementation of {@link TenantRoleAssignmentRepository}
 * from `@ibn-hayan/domain`.
 *
 * Responsibilities:
 * - Insert a new TenantRoleAssignment row. Per ADR-015, the
 *   assignment carries an explicit scope level and optional
 *   scope-target identifiers. Uniqueness is enforced by three
 *   partial unique indexes (one per scope level); a duplicate
 *   insert raises a Prisma `PrismaClientKnownRequestError` with
 *   code `P2002`, which the API exception layer translates to a
 *   409 Conflict.
 * - List all TenantRoleAssignments belonging to a specific
 *   TenantMembership. The result is membership-scoped; no
 *   assignment belonging to a different membership can appear in
 *   the result.
 * - List the TenantRoleAssignments for a specific TenantMembership
 *   that grant authority at a supplied organisation or facility.
 *   Per ADR-015, the result includes tenant-scoped assignments
 *   (valid across every organisation and facility under the
 *   tenant), organisation-scoped assignments for the supplied
 *   organisation, and (for the facility variant) facility-scoped
 *   assignments for the supplied facility.
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
 *
 * Per ADR-015, the adapter validates that `scopeLevel` is in the
 * ratified catalogue before insertion. The CHECK constraint on the
 * column is the database-level backstop; the adapter validation
 * provides a clear error path.
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
    // Validate the scope level at the persistence boundary. The
    // CHECK constraint on the column is the database-level backstop;
    // this validation provides a clear error path before reaching
    // the database.
    const scopeLevel: string = input.scopeLevel ?? 'tenant';
    if (
      scopeLevel !== 'tenant' &&
      scopeLevel !== 'organisation' &&
      scopeLevel !== 'facility'
    ) {
      throw new Error(
        `Unknown scope level: '${scopeLevel}'. The ratified ADR-015 ` +
          "scope levels are 'tenant', 'organisation', 'facility'.",
      );
    }
    // Build the create payload. The scope-target identifiers are
    // passed through when supplied; the CHECK constraint on the
    // column enforces the scope-target implications at the database
    // level. The application layer is responsible for verifying that
    // the scope-organisation belongs to the membership's tenant and
    // that the scope-facility belongs to the scope-organisation.
    const row = await this.prisma.tenantRoleAssignment.create({
      data: {
        tenantMembershipId: input.tenantMembershipId,
        roleCode: input.roleCode,
        scopeLevel: scopeLevel,
        scopeOrganisationId: input.scopeOrganisationId ?? null,
        scopeFacilityId: input.scopeFacilityId ?? null,
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

  async listForMembershipAtOrganisation(
    membershipId: TenantMembershipId,
    organisationId: OrganisationId,
  ): Promise<TenantRoleAssignment[]> {
    // Per ADR-015, the result includes:
    // - tenant-scoped assignments for the membership (valid across
    //   every organisation under the tenant);
    // - organisation-scoped assignments whose scope_organisation_id
    //   matches the supplied organisationId;
    // - facility-scoped assignments whose scope_organisation_id
    //   matches the supplied organisationId (these grant authority
    //   at the organisation level by implication).
    const rows = await this.prisma.tenantRoleAssignment.findMany({
      where: {
        tenantMembershipId: membershipId,
        OR: [
          { scopeLevel: 'tenant' },
          { scopeLevel: 'organisation', scopeOrganisationId: organisationId },
          { scopeLevel: 'facility', scopeOrganisationId: organisationId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(tenantRoleAssignmentFromPrisma);
  }

  async listForMembershipAtFacility(
    membershipId: TenantMembershipId,
    facilityId: FacilityId,
  ): Promise<TenantRoleAssignment[]> {
    // Per ADR-015, the result includes:
    // - tenant-scoped assignments for the membership;
    // - organisation-scoped assignments whose scope_organisation_id
    //   matches the facility's parent organisation. The caller
    //   resolves the facility's parent organisation before calling
    //   this method; we accept that the caller may not have
    //   resolved it and we therefore also include facility-scoped
    //   assignments directly. To keep this port self-contained,
    //   we include organisation-scoped assignments by joining
    //   through the facility's organisationId. Prisma's `where`
    //   clause cannot express "organisation-scoped assignments
    //   whose scope_organisation_id equals the supplied
    //   facility's parent organisation" without a sub-query; we
    //   therefore load the facility first to resolve the parent
    //   organisation, then query the assignments.
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { organisationId: true },
    });
    const organisationId = facility?.organisationId;
    const rows = await this.prisma.tenantRoleAssignment.findMany({
      where: {
        tenantMembershipId: membershipId,
        OR: [
          { scopeLevel: 'tenant' },
          ...(organisationId !== undefined
            ? [
                {
                  scopeLevel: 'organisation' as const,
                  scopeOrganisationId: organisationId,
                },
              ]
            : []),
          { scopeLevel: 'facility', scopeFacilityId: facilityId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(tenantRoleAssignmentFromPrisma);
  }

  async listForMembershipAtScope(
    membershipId: TenantMembershipId,
    scopeLevel: RoleAssignmentScopeLevel,
  ): Promise<TenantRoleAssignment[]> {
    const rows = await this.prisma.tenantRoleAssignment.findMany({
      where: { tenantMembershipId: membershipId, scopeLevel },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(tenantRoleAssignmentFromPrisma);
  }
}
