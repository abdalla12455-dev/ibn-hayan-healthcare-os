import { Module } from '@nestjs/common';
import type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
} from '@ibn-hayan/domain';
import { PrismaService } from './prisma.service.js';
import { PrismaTenantRepository } from './repositories/prisma-tenant.repository.js';
import { PrismaOrganisationRepository } from './repositories/prisma-organisation.repository.js';
import { PrismaFacilityRepository } from './repositories/prisma-facility.repository.js';

/**
 * Database infrastructure module.
 *
 * Wires the Prisma-backed repository implementations against the
 * repository interfaces declared in `@ibn-hayan/domain`. Feature
 * modules that need tenant/organisation/facility persistence depend
 * on the interfaces (`TenantRepository`, `OrganisationRepository`,
 * `FacilityRepository`) using `@Inject(TENANT_REPOSITORY)` etc. — they
 * do not depend on `PrismaService` or on the Prisma-backed
 * implementations directly. This is the structural expression of
 * ADR-012 §1.4 safeguard 2 (Repository interfaces).
 *
 * This module is NOT imported by the Health module. The Health module
 * has no external dependencies and remains independent of database
 * availability; the API can boot and serve Health without
 * `DATABASE_URL` set (provided no feature module that imports this
 * Database module is also imported). The `AppModule` in this batch
 * does not import this module; the Database module is wired but
 * unused at the application root. The database integration tests
 * import it directly to exercise the repositories.
 *
 * Per STEP 11 requirement 10: the `PrismaService` does not connect
 * automatically during module construction. The driver adapter opens
 * the connection lazily on the first query. This means the API
 * process can boot successfully even when no database is reachable,
 * as long as no query is issued.
 */

/**
 * DI tokens for the repository interfaces. Feature modules use these
 * tokens in `@Inject(...)` to receive the interface-typed
 * implementation. Using string tokens (rather than the interface
 * itself) avoids TypeScript's structural-identity pitfall where two
 * interfaces with the same shape are treated as interchangeable.
 */
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
export const ORGANISATION_REPOSITORY = Symbol('ORGANISATION_REPOSITORY');
export const FACILITY_REPOSITORY = Symbol('FACILITY_REPOSITORY');

@Module({
  providers: [
    PrismaService,
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
  ],
  // PrismaService and the repository implementations are not exported
  // directly. Feature modules that need persistence inject the
  // repository interfaces via the DI tokens above; they do not
  // inject PrismaService. This keeps Prisma types out of feature
  // modules' signatures.
  //
  // To make the repository tokens available to feature modules, this
  // module must be imported by those feature modules (or by
  // AppModule). The tokens themselves are exported as constants.
  exports: [TENANT_REPOSITORY, ORGANISATION_REPOSITORY, FACILITY_REPOSITORY],
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
 *     @Inject(TENANT_REPOSITORY)
 *     private readonly tenants: TenantRepository,
 *   ) {}
 *
 * The cast in this helper is not needed at the call site; TypeScript
 * infers the type from the `@Inject(token)` parameter declaration.
 */
export type { TenantRepository, OrganisationRepository, FacilityRepository };
