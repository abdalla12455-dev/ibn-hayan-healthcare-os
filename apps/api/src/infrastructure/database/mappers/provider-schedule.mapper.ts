/**
 * Prisma ↔ domain mapper for ProviderScheduleEntry.
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 *
 * The Prisma `ProviderSchedule` model stores `startTime` and `endTime`
 * as `DateTime` with `@db.Time`, which Prisma represents as a JavaScript
 * `Date` object (epoch 1970-01-01 + the time-of-day). The domain
 * `LocalTimeOfDay` is a string in `HH:MM:SS` format. The conversion
 * extracts the time-of-day portion from the Date.
 */

import type {
  ProviderScheduleEntry,
  ProviderScheduleEntryId,
  DayOfWeek,
  LocalTimeOfDay,
} from '@ibn-hayan/domain';
import type { TenantId } from '@ibn-hayan/domain';
import type { OrganisationId } from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import type { ProviderId } from '@ibn-hayan/domain';
import type { PrismaScheduleRow } from '../repositories/prisma-provider-schedule.repository.js';

/**
 * Convert a Prisma `DateTime` with `@db.Time` to a `HH:MM:SS` string.
 *
 * Prisma returns `@db.Time` columns as `Date` objects anchored at
 * 1970-01-01. We extract the time-of-day in 24-hour `HH:MM:SS` format.
 */
export function timeOfDayFromPrisma(date: Date): LocalTimeOfDay {
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  const s = date.getUTCSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Convert a `HH:MM:SS` string to a Prisma-compatible `Date` for
 * `@db.Time` columns. The Date is anchored at 1970-01-01.
 */
export function timeOfDayToPrisma(time: LocalTimeOfDay): Date {
  const [h, m, s] = time.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, s));
}

export function providerScheduleFromPrisma(
  row: PrismaScheduleRow,
): ProviderScheduleEntry {
  return {
    id: row.id as ProviderScheduleEntryId,
    tenantId: row.tenantId as TenantId,
    organisationId: row.organisationId as OrganisationId,
    facilityId: row.facilityId as FacilityId,
    providerId: row.providerId as ProviderId,
    dayOfWeek: row.dayOfWeek as DayOfWeek,
    startTime: timeOfDayFromPrisma(row.startTime),
    endTime: timeOfDayFromPrisma(row.endTime),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
