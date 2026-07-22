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
 *   assignment carries an explicit scope level, optional
 *   scope-target identifiers, and a required `tenantId` derived
 *   server-side from the referenced `TenantMembership`. The
 *   persistence layer loads the membership, derives the `tenantId`,
 *   validates that any scope-organisation and scope-facility belong
 *   to the derived tenant and to each other, and only then inserts
 *   the row. Uniqueness is enforced by three partial unique indexes
 *   (one per scope level); a duplicate insert raises a Prisma
 *   `PrismaClientKnownRequestError` with code `P2002`, which the API
 *   exception layer translates to a 409 Conflict.
 * - List all TenantRoleAssignments belonging to a specific
 *   TenantMembership. The result is membership-scoped; no
 *   assignment belonging to a different membership can appear in
 *   the result.
 * - List the TenantRoleAssignments for a specific TenantMembership
 *   that grant authority at a supplied organisation or facility.
 *   Per ADR-015 §1.5 (corrected scope-authorisation semantics),
 *   the result includes organisation-scoped and facility-scoped
 *   assignments that match the supplied target, plus tenant-scoped
 *   assignments ONLY when the role code is R13_SYSTEM_ADMINISTRATOR.
 *   Tenant-scoped assignments for R01–R12 are excluded by the
 *   repository implementation; the application layer does not need
 *   to re-filter them.
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
 *
 * Per ADR-015 §1.5 (corrected) and Phase 2 (database integrity), the
 * adapter's `create` operation:
 * 1. Loads the tenant membership by `tenantMembershipId`.
 * 2. Derives `tenantId` from the membership.
 * 3. For organisation scope, validates that the supplied
 *    `scopeOrganisationId` belongs to the derived tenant.
 * 4. For facility scope, validates that both the supplied
 *    `scopeOrganisationId` and `scopeFacilityId` belong to the
 *    derived tenant and that the facility belongs to the supplied
 *    organisation.
 * 5. Rejects inconsistent input before insertion with a thrown error
 *    (translated to a 400 Bad Request at the API boundary).
 * 6. Never trusts a caller-provided `tenantId`; the input type does
 *    not even include `tenantId`.
 *
 * The composite foreign keys added by the migration are the
 * structural backstop; the adapter validation provides a clear error
 * path before reaching the database.
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

    // Per ADR-015 §1.5 (corrected) and Phase 2: load the tenant
    // membership to derive `tenantId` server-side. The caller
    // CANNOT supply `tenantId`; the input type does not include it.
    // The derived `tenantId` is the structural anchor for the
    // composite foreign keys that enforce tenant, organisation, and
    // facility consistency at the database level.
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { id: input.tenantMembershipId },
      select: { id: true, tenantId: true },
    });
    if (membership === null) {
      throw new Error(
        `Cannot create role assignment: tenant membership '${input.tenantMembershipId}' does not exist. ` +
          'The persistence layer derives tenantId from the membership; a non-existent membership cannot be assigned a role.',
      );
    }
    const tenantId = membership.tenantId;

    // Validate scope-target consistency at the application layer
    // before reaching the database. The composite foreign keys are
    // the structural backstop; these checks provide a clear error
    // path.
    let scopeOrganisationId: string | null = null;
    let scopeFacilityId: string | null = null;
    if (scopeLevel === 'organisation') {
      if (
        input.scopeOrganisationId === null ||
        input.scopeOrganisationId === undefined
      ) {
        throw new Error(
          "Cannot create organisation-scoped role assignment: scopeOrganisationId is required when scopeLevel is 'organisation'.",
        );
      }
      // Validate the organisation belongs to the derived tenant.
      const organisation = await this.prisma.organisation.findUnique({
        where: {
          tenantId_id: { tenantId, id: input.scopeOrganisationId },
        },
        select: { id: true, tenantId: true },
      });
      if (organisation === null) {
        throw new Error(
          `Cannot create organisation-scoped role assignment: organisation '${input.scopeOrganisationId}' does not belong to tenant '${tenantId}'. ` +
            'A cross-tenant organisation-scoped assignment is rejected at the persistence layer.',
        );
      }
      scopeOrganisationId = input.scopeOrganisationId;
    } else if (scopeLevel === 'facility') {
      if (
        input.scopeOrganisationId === null ||
        input.scopeOrganisationId === undefined
      ) {
        throw new Error(
          "Cannot create facility-scoped role assignment: scopeOrganisationId is required when scopeLevel is 'facility'.",
        );
      }
      if (
        input.scopeFacilityId === null ||
        input.scopeFacilityId === undefined
      ) {
        throw new Error(
          "Cannot create facility-scoped role assignment: scopeFacilityId is required when scopeLevel is 'facility'.",
        );
      }
      // Validate the organisation belongs to the derived tenant.
      const organisation = await this.prisma.organisation.findUnique({
        where: {
          tenantId_id: { tenantId, id: input.scopeOrganisationId },
        },
        select: { id: true, tenantId: true },
      });
      if (organisation === null) {
        throw new Error(
          `Cannot create facility-scoped role assignment: organisation '${input.scopeOrganisationId}' does not belong to tenant '${tenantId}'.`,
        );
      }
      // Validate the facility belongs to the derived tenant AND to
      // the supplied organisation. The composite unique constraint
      // facilities(tenant_id, organisation_id, id) backs the lookup.
      const facility = await this.prisma.facility.findUnique({
        where: {
          tenantId_organisationId_id: {
            tenantId,
            organisationId: input.scopeOrganisationId,
            id: input.scopeFacilityId,
          },
        },
        select: { id: true, tenantId: true, organisationId: true },
      });
      if (facility === null) {
        throw new Error(
          `Cannot create facility-scoped role assignment: facility '${input.scopeFacilityId}' does not belong to organisation '${input.scopeOrganisationId}' under tenant '${tenantId}'. ` +
            'A facility paired with the wrong organisation, or a facility in a different tenant, is rejected at the persistence layer.',
        );
      }
      scopeOrganisationId = input.scopeOrganisationId;
      scopeFacilityId = input.scopeFacilityId;
    }
    // For tenant scope, both scope-target identifiers must be null.
    // The CHECK constraint enforces this at the database level; we
    // do not pass them through.

    // Build the create payload. The `tenantId` is the derived value;
    // the caller never supplies it. The CHECK constraint on the
    // column enforces the scope-target implications at the database
    // level. The composite foreign keys enforce tenant, organisation,
    // and facility consistency at the database level.
    const row = await this.prisma.tenantRoleAssignment.create({
      data: {
        tenantMembershipId: input.tenantMembershipId,
        tenantId,
        roleCode: input.roleCode,
        scopeLevel: scopeLevel,
        scopeOrganisationId,
        scopeFacilityId,
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
    // Per ADR-015 §1.5 (corrected scope-authorisation semantics),
    // the result includes:
    // - organisation-scoped assignments whose scope_organisation_id
    //   matches the supplied organisationId;
    // - facility-scoped assignments whose scope_organisation_id
    //   matches the supplied organisationId (these grant authority
    //   at the organisation level by implication, because a
    //   facility-scoped assignment grants authority at the
    //   facility's parent organisation);
    // - tenant-scoped assignments ONLY when the role code is
    //   R13_SYSTEM_ADMINISTRATOR. Per ADR-015 §1.5, a generic
    //   tenant-scoped assignment for R01–R12 does NOT grant
    //   organisation access; only R13 at tenant scope grants
    //   tenant-wide organisation selection.
    //
    // Legacy R09 tenant-scoped rows (created before ADR-015 was
    // ratified) may remain stored for migration compatibility, but
    // they do NOT appear in this result and therefore do NOT
    // authorise organisation context selection. This is the
    // structural enforcement of "an R09 tenant-scoped assignment
    // must not grant tenant-wide organisation access".
    const rows = await this.prisma.tenantRoleAssignment.findMany({
      where: {
        tenantMembershipId: membershipId,
        OR: [
          {
            scopeLevel: 'tenant',
            roleCode: 'R13_SYSTEM_ADMINISTRATOR',
          },
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
    // Per ADR-015 §1.5 (corrected scope-authorisation semantics),
    // the result includes:
    // - facility-scoped assignments whose scope_facility_id matches
    //   the supplied facilityId;
    // - organisation-scoped assignments whose scope_organisation_id
    //   matches the facility's parent organisation. The caller
    //   resolves the facility's parent organisation before calling
    //   this method; we load the facility first to resolve the
    //   parent organisation, then query the assignments.
    // - tenant-scoped assignments ONLY when the role code is
    //   R13_SYSTEM_ADMINISTRATOR. Per ADR-015 §1.5, a generic
    //   tenant-scoped assignment for R01–R12 does NOT grant
    //   facility access; only R13 at tenant scope grants
    //   tenant-wide facility selection.
    //
    // Legacy R09 tenant-scoped rows do NOT appear in this result
    // and therefore do NOT authorise facility context selection.
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { organisationId: true },
    });
    const organisationId = facility?.organisationId;
    const rows = await this.prisma.tenantRoleAssignment.findMany({
      where: {
        tenantMembershipId: membershipId,
        OR: [
          {
            scopeLevel: 'tenant',
            roleCode: 'R13_SYSTEM_ADMINISTRATOR',
          },
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
