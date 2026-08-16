/**
 * Provider Schedule domain model.
 *
 * BC10 Workforce owns provider scheduling/availability data (per
 * download/docs/07_MODULES/DOCTORS.md §2.2 and APPOINTMENTS.md §2.1:
 * "Workforce publishes provider availability changes that Appointments
 * consumes"). This model is the minimum canonical schedule/availability
 * foundation required for appointment eligibility enforcement
 * (BR-BC06-ADM-002: "Practitioner must be available at requested time;
 * if availability cannot be verified, block booking").
 *
 * The model is deliberately minimal: a weekly working-hours entry per
 * provider per facility. It does NOT invent recurrence engines, timezone
 * override policies, exception/leave handling, slot-duration templates,
 * or per-role authorization beyond the canonical ownership boundary.
 * Those sub-domains are deferred to later BC03/BC06/BC10 stages where
 * canonical documentation defines them.
 *
 * Time semantics:
 * - `startTime` and `endTime` are local time-of-day values interpreted
 *   in the facility's configured IANA timezone (Facility.timezone).
 *   This mirrors the existing "Today's Appointments" facility-local-day
 *   semantics. A facility with a null timezone is a configuration-required
 *   state; availability checks fail closed for such facilities.
 * - `dayOfWeek` follows ISO 8601: 1 = Monday … 7 = Sunday.
 *
 * This file is pure TypeScript. It MUST NOT import Prisma, NestJS,
 * Next.js, React, Zod, or any framework.
 */

import type { TenantId } from '../tenancy/tenant.js';
import type { OrganisationId } from '../tenancy/organisation.js';
import type { FacilityId } from '../tenancy/facility.js';
import type { ProviderId } from './provider.js';

/**
 * Stable identifier for a ProviderScheduleEntry. Branded so it cannot
 * be confused with other IDs at the type level.
 */
export type ProviderScheduleEntryId = string & {
  readonly __brand: 'ProviderScheduleEntryId';
};

/**
 * ISO 8601 day of week: 1 = Monday, 2 = Tuesday, …, 7 = Sunday.
 *
 * This is the canonical integer representation used by PostgreSQL's
 * `EXTRACT(ISODOW FROM ...)` and by JavaScript's
 * `Intl.DateTimeFormat({ weekday: 'short' })` when derived from a
 * UTC timestamp converted to a facility-local timezone.
 */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Local time-of-day in `HH:MM:SS` format (24-hour). Interpreted in
 * the facility's configured IANA timezone. Stored as a string for
 * domain-layer framework independence; the Prisma adapter maps this
 * to `@db.Time`.
 */
export type LocalTimeOfDay = string;

/**
 * A single weekly working-hours entry for a provider at a facility.
 *
 * A provider may have multiple entries per day (e.g. a morning shift
 * and an afternoon shift) and entries on multiple days. The
 * availability check succeeds when at least one entry for the
 * appointment's facility-local day of week fully contains the
 * appointment's facility-local start and end times.
 *
 * Field semantics:
 * - `id`: stable UUID identifier.
 * - `tenantId`: the Tenant that owns this schedule entry.
 * - `organisationId`: the Organisation that owns this schedule entry.
 * - `facilityId`: the Facility where the provider works during this entry.
 * - `providerId`: the Provider whose working hours are defined.
 * - `dayOfWeek`: ISO 8601 day (1=Monday…7=Sunday).
 * - `startTime`: local time-of-day when the shift starts.
 * - `endTime`: local time-of-day when the shift ends (must be > startTime).
 * - `createdAt`/`updatedAt`: timestamps set by the persistence layer.
 */
export interface ProviderScheduleEntry {
  readonly id: ProviderScheduleEntryId;
  readonly tenantId: TenantId;
  readonly organisationId: OrganisationId;
  readonly facilityId: FacilityId;
  readonly providerId: ProviderId;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: LocalTimeOfDay;
  readonly endTime: LocalTimeOfDay;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Input for creating a provider schedule entry.
 *
 * Scope (tenantId, organisationId, facilityId) is derived from the
 * authenticated session context at the API boundary. The caller
 * supplies only the provider, day, and working-hours window.
 */
export interface ProviderScheduleEntryCreateInput {
  readonly providerId: ProviderId;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: LocalTimeOfDay;
  readonly endTime: LocalTimeOfDay;
}
