/**
 * Facility day boundary computation.
 *
 * This module contains the production timezone/day-boundary logic that is
 * tested by `appointments-today.service.spec.ts`. The same functions are
 * used by the service and tested directly — there is no duplicate
 * implementation in the test file.
 */

/**
 * Compute the UTC offset for a specific UTC instant in a given timezone.
 * Returns offset in milliseconds (positive = east of UTC).
 *
 * We determine the offset by:
 * 1. Formatting the UTC instant in the target timezone to get local parts.
 * 2. Converting those local parts to UTC using Date.UTC (not system local time).
 * 3. Computing the difference between that UTC equivalent and the original UTC instant.
 *
 * @param utcInstant The UTC instant to compute the offset for.
 * @param timezone The IANA timezone identifier (e.g., 'Asia/Baghdad').
 * @returns The offset in milliseconds.
 * @throws RangeError if the timezone is not a valid IANA identifier.
 */
export function getOffsetAtUtc(utcInstant: Date, timezone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(utcInstant)
      .map((p) => [p.type, p.value]),
  );

  const utcEquiv = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return utcEquiv - utcInstant.getTime();
}

/**
 * Result of computing facility day boundaries.
 */
export interface FacilityDayBoundaries {
  /** The facility-local date in YYYY-MM-DD format. */
  localDate: string;
  /** The UTC instant when the local day begins (inclusive). */
  startUtc: Date;
  /** The UTC instant when the next local day begins (exclusive). */
  endUtc: Date;
}

/**
 * Compute the UTC boundaries for the facility-local calendar day that
 * contains the given instant.
 *
 * This function is independent of the server/process timezone. It uses
 * `Intl.DateTimeFormat` (available in Node.js 14+) which natively supports
 * IANA timezone identifiers and correctly handles:
 * - whole-hour offsets (e.g., UTC+3)
 * - half-hour offsets (e.g., India Standard Time, UTC+5:30)
 * - quarter-hour offsets (e.g., Nepal Time, UTC+5:45)
 * - daylight-saving transitions (DST) including spring-forward (23-hour)
 *   and fall-back (25-hour) days
 * - negative offsets (e.g., UTC-5)
 *
 * The returned interval is a half-open range: `[startUtc, endUtc)`.
 * An appointment with `scheduledStart` equal to `startUtc` is included;
 * an appointment with `scheduledStart` equal to `endUtc` is excluded.
 *
 * The algorithm correctly handles DST by:
 * 1. Computing the offset at the START of the local day (at midnight).
 * 2. Computing the offset at the START of the NEXT local day (at midnight).
 * 3. Using those offsets to compute the UTC boundaries.
 * 4. If the offsets differ (DST transition occurred), adjusting the
 *    interval by the difference to get the correct duration.
 *
 * @param now The current instant.
 * @param timezone The facility's IANA timezone identifier (e.g. 'Asia/Baghdad').
 * @returns The facility day boundaries.
 * @throws RangeError if the timezone is not a valid IANA identifier.
 */
export function computeFacilityDayBoundaries(
  now: Date,
  timezone: string,
): FacilityDayBoundaries {
  // Get the facility-local date parts at the current instant.
  // Using 'en-CA' locale gives YYYY-MM-DD format for unambiguous parsing.
  const nowParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );

  const localYear = Number(nowParts.year);
  const localMonth = Number(nowParts.month) - 1; // JS months are 0-indexed
  const localDay = Number(nowParts.day);
  const localDate = `${localYear}-${nowParts.month}-${nowParts.day}`;

  // Compute UTC midnight for today and tomorrow using UTC date arithmetic.
  const todayUtcMidnight = Date.UTC(localYear, localMonth, localDay);
  const tomorrowUtcMidnight = Date.UTC(localYear, localMonth, localDay + 1);

  // Get the offset at today's midnight (not at the current instant).
  // This correctly handles the offset for the start of the day.
  const offsetAtStart = getOffsetAtUtc(new Date(todayUtcMidnight), timezone);

  // Calculate the UTC instant of local midnight today.
  const startUtc = new Date(todayUtcMidnight - offsetAtStart);

  // Get the offset at tomorrow's UTC midnight.
  // This tells us the offset at the START of the next local day.
  const offsetAtEnd = getOffsetAtUtc(new Date(tomorrowUtcMidnight), timezone);

  // Calculate the naive UTC instant of tomorrow's local midnight
  // (using today's offset, which is what the simple algorithm does).
  const naiveEndUtc = todayUtcMidnight + 24 * 60 * 60 * 1000 - offsetAtStart;

  // If the offset changed between today and tomorrow (DST transition),
  // we need to adjust the end boundary.
  // - For fall-back (offset becomes MORE negative, e.g., -4h -> -5h):
  //   the interval is 24 + 1 = 25 hours.
  // - For spring-forward (offset becomes LESS negative, e.g., -5h -> -4h):
  //   the interval is 24 - 1 = 23 hours.
  // The difference in offsets (offsetAtEnd - offsetAtStart) tells us
  // how to adjust.
  // - Fall-back: offsetDelta < 0 (e.g., -3600000), we need to ADD to interval
  // - Spring-forward: offsetDelta > 0 (e.g., +3600000), we need to SUBTRACT from interval
  const offsetDelta = offsetAtEnd - offsetAtStart; // in ms
  // For fall-back (offset becomes more negative), add |offsetDelta|
  // For spring-forward (offset becomes less negative), subtract offsetDelta
  const adjustedEndUtc = naiveEndUtc - offsetDelta;

  return { localDate, startUtc, endUtc: new Date(adjustedEndUtc) };
}
