/**
 * Public tenancy entry point.
 *
 * Re-exports the tenancy domain types and repository ports so that
 * consumers import from `@ibn-hayan/domain/tenancy` (or from the
 * package root) without reaching into internal file paths.
 *
 * Nothing in this module imports Prisma, NestJS, Next.js, React, Zod,
 * or any framework. The exports are pure TypeScript types and
 * interfaces. Per ADR-012 §1.4, Prisma-generated types must not leak
 * into the domain; the persistence adapter in
 * `apps/api/src/infrastructure/database/` is responsible for mapping
 * between Prisma row types and these domain types.
 */

export type {
  Tenant,
  TenantId,
  TenantLifecycleStatus,
  CreateTenantInput,
} from './tenant.js';

export type {
  Organisation,
  OrganisationId,
  OrganisationLifecycleStatus,
  CreateOrganisationInput,
} from './organisation.js';

export type {
  Facility,
  FacilityId,
  FacilityLifecycleStatus,
  CreateFacilityInput,
} from './facility.js';

export type {
  TenantRepository,
  OrganisationRepository,
  FacilityRepository,
} from './repositories.js';
