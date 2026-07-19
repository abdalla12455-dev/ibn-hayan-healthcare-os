import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { PrismaTenantRepository } from './repositories/prisma-tenant.repository.js';
import { PrismaOrganisationRepository } from './repositories/prisma-organisation.repository.js';
import { PrismaFacilityRepository } from './repositories/prisma-facility.repository.js';
import { PrismaUserRepository } from './repositories/prisma-user.repository.js';
import { PrismaTenantMembershipRepository } from './repositories/prisma-tenant-membership.repository.js';
import { PrismaSessionRepository } from './repositories/prisma-session.repository.js';
import { PrismaTenantRoleAssignmentRepository } from './repositories/prisma-tenant-role-assignment.repository.js';
import { LocalCredentialService } from './repositories/local-credential.service.js';

/**
 * Database infrastructure module.
 *
 * Wires the Prisma-backed repository implementations against the
 * repository interfaces declared in `@ibn-hayan/domain`. Feature
 * modules that need persistence depend on the interfaces using
 * `@Inject(TENANT_REPOSITORY)` etc. — they do not depend on
 * `PrismaService` or on the Prisma-backed implementations directly.
 * This is the structural expression of ADR-012 §1.4 safeguard 2
 * (Repository interfaces).
 *
 * The `LocalCredentialService` is an infrastructure-only service that
 * is NOT exposed through a domain port. The auth module consumes it
 * directly (via `@Inject(LocalCredentialService)`) to read and write
 * Argon2id password hashes. The password hash never leaves the
 * infrastructure layer; it is never surfaced through a domain type
 * or an API response.
 *
 * This module is imported by `AppModule` (starting with the fourth
 * canonical batch) so that the auth module can use the user,
 * membership, session, and credential repositories. The Health module
 * does NOT import this module; the API can boot and serve Health
 * without `DATABASE_URL` set, as long as no auth request occurs.
 *
 * Per STEP 11 requirement 10 (third canonical batch): the
 * `PrismaService` does not connect automatically during module
 * construction. The driver adapter opens the connection lazily on the
 * first query. This means the API process can boot successfully even
 * when no database is reachable, as long as no query is issued.
 */

/**
 * DI tokens for the repository interfaces. Feature modules use these
 * tokens in `@Inject(...)` to receive the interface-typed
 * implementation. Using Symbol tokens (rather than the interface
 * itself) avoids TypeScript's structural-identity pitfall where two
 * interfaces with the same shape are treated as interchangeable.
 */
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
export const ORGANISATION_REPOSITORY = Symbol('ORGANISATION_REPOSITORY');
export const FACILITY_REPOSITORY = Symbol('FACILITY_REPOSITORY');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const TENANT_MEMBERSHIP_REPOSITORY = Symbol(
  'TENANT_MEMBERSHIP_REPOSITORY',
);
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const TENANT_ROLE_ASSIGNMENT_REPOSITORY = Symbol(
  'TENANT_ROLE_ASSIGNMENT_REPOSITORY',
);

@Module({
  providers: [
    PrismaService,
    LocalCredentialService,
    {
      provide: TENANT_REPOSITORY,
      useClass: PrismaTenantRepository,
    },
    {
      provide: ORGANISATION_REPOSITORY,
      useClass: PrismaOrganisationRepository,
    },
    {
      provide: FACILITY_REPOSITORY,
      useClass: PrismaFacilityRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: TENANT_MEMBERSHIP_REPOSITORY,
      useClass: PrismaTenantMembershipRepository,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: PrismaSessionRepository,
    },
    {
      provide: TENANT_ROLE_ASSIGNMENT_REPOSITORY,
      useClass: PrismaTenantRoleAssignmentRepository,
    },
  ],
  // PrismaService and the repository implementations are not exported
  // directly. Feature modules that need persistence inject the
  // repository interfaces via the DI tokens above; they do not
  // inject PrismaService. This keeps Prisma types out of feature
  // modules' signatures.
  //
  // The LocalCredentialService IS exported because it is consumed by
  // the auth module's PasswordService. It is an infrastructure-only
  // service (no domain port); the auth module imports it directly.
  exports: [
    TENANT_REPOSITORY,
    ORGANISATION_REPOSITORY,
    FACILITY_REPOSITORY,
    USER_REPOSITORY,
    TENANT_MEMBERSHIP_REPOSITORY,
    SESSION_REPOSITORY,
    TENANT_ROLE_ASSIGNMENT_REPOSITORY,
    LocalCredentialService,
  ],
})
export class DatabaseModule {}

/**
 * Type helper for feature modules that inject the repository tokens.
 * The cast is structural: NestJS resolves the token to the
 * Prisma-backed implementation, and the cast asserts that the
 * implementation satisfies the domain interface.
 *
 * Usage:
 *   constructor(
 *     @Inject(USER_REPOSITORY)
 *     private readonly users: UserRepository,
 *   ) {}
 */
export type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
  UserRepository,
  TenantMembershipRepository,
  SessionRepository,
  TenantRoleAssignmentRepository,
} from '@ibn-hayan/domain';
