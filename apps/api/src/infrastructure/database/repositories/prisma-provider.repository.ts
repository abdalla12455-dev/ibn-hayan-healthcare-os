import { Injectable } from '@nestjs/common';
import type {
  Provider,
  ProviderId,
  ProviderRepository,
  ProviderFacilityAssignment,
  TenantId,
} from '@ibn-hayan/domain';
import type { FacilityId } from '@ibn-hayan/domain';
import { PrismaService } from '../prisma.service.js';
import {
  providerFromPrisma,
  providerFacilityAssignmentFromPrisma,
} from '../mappers/provider.mapper.js';
import { timeOfDayFromPrisma } from '../mappers/provider-schedule.mapper.js';

/**
 * Prisma-backed implementation of {@link ProviderRepository} from
 * `@ibn-hayan/domain`.
 *
 * Per CODING_STANDARDS.md §10, every read method takes `tenantId` as a
 * required parameter. The repository enforces tenant isolation: looking up
 * a provider ID from a different tenant returns null, not that tenant's provider.
 *
 * Per DOCTORS.md Section 4.1:
 * - Provider data is tenant-isolated by default
 * - A provider registered in tenant A is not visible to tenant B
 *
 * Per DOCTORS.md Section 4.2:
 * - A provider's schedule may span multiple facilities
 * - The appointment context must verify that the provider is assigned
 *   to the requested facility
 *
 * Security guarantees:
 * - Cross-tenant lookups return null (not an error)
 * - Cross-facility lookups return false
 * - Caller-supplied tenantId is authoritative (derived from auth context)
 * - No sensitive provider data is exposed through this interface
 *
 * Per ADR-012 §1.4 safeguard 1, this adapter maps Prisma row types to
 * domain types before returning; Prisma types do not leak through the
 * adapter's public signatures.
 */
@Injectable()
export class PrismaProviderRepository implements ProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsInTenant(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<boolean> {
    // Use count with tenantId filter to verify provider belongs to the caller tenant.
    // This returns 0 for non-existent providers AND for providers in other tenants.
    const count = await this.prisma.provider.count({
      where: { id: providerId, tenantId },
    });
    return count > 0;
  }

  async findById(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<Provider | null> {
    // Tenant-scoped lookup: returns null for providers in other tenants.
    const row = await this.prisma.provider.findFirst({
      where: { id: providerId, tenantId },
    });
    return row ? providerFromPrisma(row) : null;
  }

  async isEligibleForFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
  ): Promise<boolean> {
    // A provider is eligible for a facility if:
    // 1. They exist in the tenant (existsInTenant check)
    // 2. Their status is 'active'
    // 3. They have an active (non-revoked) assignment to the facility

    // First check: provider exists and is active in the tenant
    const provider = await this.prisma.provider.findFirst({
      where: { id: providerId, tenantId, status: 'active' },
    });
    if (!provider) {
      return false;
    }

    // Second check: provider has an active assignment to the facility
    // revokedAt IS NULL means the assignment is active
    const assignment = await this.prisma.providerFacilityAssignment.findFirst({
      where: {
        tenantId,
        providerId,
        facilityId,
        revokedAt: null,
      },
    });
    return assignment !== null;
  }

  async findActiveFacilityAssignments(
    tenantId: TenantId,
    providerId: ProviderId,
  ): Promise<ProviderFacilityAssignment[]> {
    // Find all active (non-revoked) assignments for a provider within a tenant.
    const rows = await this.prisma.providerFacilityAssignment.findMany({
      where: {
        tenantId,
        providerId,
        revokedAt: null,
      },
    });
    return rows.map(providerFacilityAssignmentFromPrisma);
  }

  async isProviderAvailableAtFacility(
    tenantId: TenantId,
    providerId: ProviderId,
    facilityId: FacilityId,
    scheduledStart: Date,
    scheduledEnd: Date,
  ): Promise<boolean> {
    // Fail-closed posture: if the facility timezone is null or invalid,
    // availability cannot be verified → return false (block booking).
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId, tenantId },
      select: { timezone: true },
    });
    if (!facility || !facility.timezone) {
      return false;
    }

    // Convert the UTC scheduledStart to the facility's local timezone
    // to determine the ISO day of week and local time-of-day.
    let localParts: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      crossMidnight: boolean;
    };
    try {
      localParts = this.utcToLocalDayAndTimes(
        scheduledStart,
        scheduledEnd,
        facility.timezone,
      );
    } catch {
      // Invalid timezone → fail closed.
      return false;
    }

    // Cross-midnight fail-closed: if the facility-local scheduledStart
    // and scheduledEnd fall on different calendar dates, the slot
    // spans midnight. Cross-midnight scheduling is not supported in
    // this stage, so availability cannot be verified → block.
    if (localParts.crossMidnight) {
      return false;
    }

    // Query the provider's schedule entries for the appointment's
    // facility-local day of week. The lookup is scoped by tenantId,
    // facilityId, providerId, and dayOfWeek.
    const entries = await this.prisma.providerSchedule.findMany({
      where: {
        tenantId,
        facilityId,
        providerId,
        dayOfWeek: localParts.dayOfWeek,
      },
    });

    // Check if any entry fully contains the appointment's local time
    // window: entry.startTime <= localStart AND entry.endTime >= localEnd.
    for (const entry of entries) {
      const entryStart = timeOfDayFromPrisma(entry.startTime);
      const entryEnd = timeOfDayFromPrisma(entry.endTime);
      if (
        entryStart <= localParts.startTime &&
        entryEnd >= localParts.endTime
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convert a UTC time window to the facility-local ISO day of week
   * and local time-of-day strings (HH:MM:SS).
   *
   * Uses `Intl.DateTimeFormat` to convert the UTC timestamps to the
   * facility's IANA timezone. The day of week follows ISO 8601
   * (1 = Monday … 7 = Sunday).
   *
   * Cross-midnight detection: if the facility-local scheduledStart
   * and scheduledEnd fall on different calendar dates, this method
   * returns `crossMidnight: true`. The caller treats this as
   * unavailable (fail-closed) because cross-midnight scheduling is
   * not supported in this stage. This prevents a slot like 23:00–00:30
   * from being incorrectly matched against a same-day schedule entry.
   *
   * Throws if the timezone is invalid (caught by the caller → fail closed).
   */
  private utcToLocalDayAndTimes(
    scheduledStart: Date,
    scheduledEnd: Date,
    timezone: string,
  ): {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    crossMidnight: boolean;
  } {
    const startParts = this.toLocalParts(scheduledStart, timezone);
    const endParts = this.toLocalParts(scheduledEnd, timezone);

    const dayOfWeek = startParts.dayOfWeek;

    // Detect cross-midnight: the start and end fall on different
    // facility-local calendar dates. Until cross-midnight scheduling
    // is implemented, this is treated as unavailable (fail-closed).
    const crossMidnight = startParts.localDate !== endParts.localDate;

    return {
      dayOfWeek,
      startTime: startParts.timeOfDay,
      endTime: endParts.timeOfDay,
      crossMidnight,
    };
  }

  /**
   * Convert a single UTC Date to the facility-local ISO day of week,
   * local date string (YYYY-MM-DD), and local time-of-day string.
   */
  private toLocalParts(
    date: Date,
    timezone: string,
  ): { dayOfWeek: number; timeOfDay: string; localDate: string } {
    // Intl.DateTimeFormat throws RangeError for invalid timezones.
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = fmt.formatToParts(date);
    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value;
    const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const month = parts.find((p) => p.type === 'month')?.value ?? '01';
    const day = parts.find((p) => p.type === 'day')?.value ?? '01';
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const second = parts.find((p) => p.type === 'second')?.value ?? '00';

    // Map weekday abbreviation to ISO 8601 day number.
    const weekdayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };
    const dayOfWeek = weekdayStr ? weekdayMap[weekdayStr] : 0;
    if (!dayOfWeek) {
      throw new Error(`Unexpected weekday: ${weekdayStr}`);
    }

    // Handle hour "24" → "00" (some environments return 24 for midnight).
    const normalizedHour = hour === '24' ? '00' : hour;

    return {
      dayOfWeek,
      timeOfDay: `${normalizedHour}:${minute}:${second}`,
      localDate: `${year}-${month}-${day}`,
    };
  }
}
