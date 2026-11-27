import { z } from "zod";

/**
 * Read-only Platform Super Admin Overview contract.
 *
 * The response contains only the authenticated administrator's
 * display name. No tenant, clinical, financial, or subscription
 * data is exposed by this initial contract.
 */
export const PlatformAdminOverviewResponseSchema = z
  .object({
    administrator: z
      .object({
        displayName: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();

export type PlatformAdminOverviewResponse = z.infer<
  typeof PlatformAdminOverviewResponseSchema
>;
