import { z } from "zod";

/**
 * Read-only platform tenant projection.
 *
 * Tenant represents a subscribing customer.
 * It is not an Organisation or Facility.
 *
 * No clinical records, credentials, memberships,
 * billing information, or patient data are exposed.
 */

export const PlatformTenantSummarySchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
    displayName: z.string().min(1).max(200),
    status: z.enum(["active", "suspended"]),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const PlatformTenantListSchema = z
  .object({
    items: z.array(PlatformTenantSummarySchema).max(25),
    hasMore: z.boolean(),
  })
  .strict();

export type PlatformTenantSummary = z.infer<typeof PlatformTenantSummarySchema>;

export type PlatformTenantList = z.infer<typeof PlatformTenantListSchema>;
