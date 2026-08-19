/**
 * Provider Schedule Management contracts (BC10 Workforce).
 *
 * Zod schemas for the Provider Schedule Administration API:
 * - `POST /api/v1/provider-schedules` (create)
 * - `GET /api/v1/provider-schedules?providerId=...` (list)
 * - `DELETE /api/v1/provider-schedules/:id` (delete)
 *
 * Scope (tenantId, organisationId, facilityId) is always derived from
 * the authenticated session; it is NEVER accepted from the request.
 * The caller supplies only the provider, day of week, and working
 * hours window. Overlapping weekly entries are intentionally allowed
 * (operator-ratified Scheduling Completion Milestone decision).
 *
 * This file is framework-agnostic: it imports only from `zod`.
 */

import { z } from 'zod';

/**
 * ISO day of week (1 = Monday … 7 = Sunday).
 */
const dayOfWeekSchema = z.number().int().min(1).max(7);

/**
 * Local time-of-day in `HH:MM` or `HH:MM:SS` (24-hour) format,
 * interpreted in the facility's IANA timezone.
 */
const localTimeSchema = z
  .string()
  .regex(/^[0-2][0-9]:[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'Time must be in HH:MM or HH:MM:SS format (24 hour).',
  });

/**
 * Create-schedule-entry request body.
 *
 * Scope identifiers are rejected at the boundary because the schema is
 * `.strict()`: scope comes only from the authenticated session.
 */
export const CreateProviderScheduleRequestSchema = z
  .object({
    providerId: z.string().uuid(),
    dayOfWeek: dayOfWeekSchema,
    startTime: localTimeSchema,
    endTime: localTimeSchema,
  })
  .strict()
  .refine(
    (body) => body.startTime < body.endTime,
    {
      message:
        'endTime must be strictly after startTime within the same facility-local day. ' +
        'Cross-midnight weekly working windows are unsupported within a single entry (fail closed).',
    },
  );

export type CreateProviderScheduleRequest = z.infer<
  typeof CreateProviderScheduleRequestSchema
>;

/**
 * A single provider schedule entry.
 */
export const ProviderScheduleEntrySchema = z
  .object({
    id: z.string().uuid(),
    providerId: z.string().uuid(),
    dayOfWeek: dayOfWeekSchema,
    startTime: z.string(),
    endTime: z.string(),
  })
  .strict();

export type ProviderScheduleEntry = z.infer<
  typeof ProviderScheduleEntrySchema
>;

/**
 * Create-schedule-entry response: the created entry.
 */
export const CreateProviderScheduleResponseSchema =
  ProviderScheduleEntrySchema;

export type CreateProviderScheduleResponse = z.infer<
  typeof CreateProviderScheduleResponseSchema
>;

/**
 * List-schedule-entries response: array of entries for the provider at
 * the authenticated active facility. Ordered by day and start time.
 */
export const ListProviderSchedulesResponseSchema = z
  .object({
    entries: z.array(ProviderScheduleEntrySchema),
  })
  .strict();

export type ListProviderSchedulesResponse = z.infer<
  typeof ListProviderSchedulesResponseSchema
>;

/**
 * Delete-schedule-entry response: an explicit `deleted: true` marker.
 */
export const DeleteProviderScheduleResponseSchema = z
  .object({
    deleted: z.literal(true),
  })
  .strict();

export type DeleteProviderScheduleResponse = z.infer<
  typeof DeleteProviderScheduleResponseSchema
>;

/**
 * Provider schedule error codes.
 */
export const PROVIDER_SCHEDULE_ERROR_CODES = [
  'PROVIDER_SCHEDULE_VALIDATION_ERROR',
  'PROVIDER_SCHEDULE_PROVIDER_NOT_FOUND',
  'PROVIDER_SCHEDULE_NOT_FOUND',
] as const;

export type ProviderScheduleErrorCode =
  (typeof PROVIDER_SCHEDULE_ERROR_CODES)[number];
