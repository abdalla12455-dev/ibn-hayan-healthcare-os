/**
 * Scheduling repository ports.
 *
 * Per ADR-012 §1.4 (Prisma safeguards) and FOLDER_STRUCTURE.md §4.2,
 * repository interfaces are declared in the domain package and
 * implemented by persistence adapters in
 * `apps/api/src/infrastructure/database/`. The API layer depends on
 * the interface; the Prisma-backed implementation is injected at the
 * composition root.
 *
 * Per CODING_STANDARDS.md §10 (Tenant-Scope Requirements), every
 * database query that touches tenant-scoped data must include a tenant
 * filter. The Appointment repository port below makes the tenant,
 * organisation, and facility filters required parameters. This is the
 * structural enforcement that prevents cross-tenant, cross-organisation,
 * or cross-facility data leakage.
 *
 * The ports return domain values (Appointment), not Prisma-generated
 * row types. The mapping between Prisma types and domain types is
 * explicit and tested in the persistence adapter.
 *
 * No use cases, API DTOs, controllers, or business workflows are
 * declared here. The ports are pure data-access interfaces.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { Appointment } from './appointment.js';
import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';

/**
 * Repository port for the Scheduling bounded context (BC06).
 *
 * Every Appointment read requires tenantId, organisationId, and facilityId.
 * There is no unscoped `findById` method. This is the structural
 * enforcement of CODING_STANDARDS.md §10 and the Stage 1B specification
 * requirement that all scope is derived from the authenticated session.
 */
export interface AppointmentRepository {
  /**
   * Find all appointments for a specific facility that begin within a
   * given UTC time range (half-open interval: [startUtc, endUtc)).
   *
   * The query is scoped by tenant, organisation, and facility to prevent
   * cross-tenant, cross-organisation, or cross-facility data leakage.
   * All three scope values must match for an appointment to be returned.
   *
   * Results are ordered by `scheduledStart` ascending, with `id` ascending
   * as a stable tie-breaker.
   *
   * @param tenantId The Tenant that owns the facility.
   * @param organisationId The Organisation that owns the facility.
   * @param facilityId The Facility to query appointments for.
   * @param startUtc The start of the UTC time range (inclusive).
   * @param endUtc The end of the UTC time range (exclusive).
   * @returns The list of appointments that begin within the range.
   */
  findByScheduledStartRange(
    tenantId: TenantId,
    organisationId: OrganisationId,
    facilityId: FacilityId,
    startUtc: Date,
    endUtc: Date,
  ): Promise<Appointment[]>;
}
