import { describe, expect, it } from "vitest";

import { PlatformAdminOverviewResponseSchema } from "./platform-admin.schema.js";

describe("PlatformAdminOverviewResponseSchema", () => {
  it("accepts the expected response", () => {
    expect(
      PlatformAdminOverviewResponseSchema.safeParse({
        administrator: {
          displayName: "Platform Administrator",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects missing administrator identity", () => {
    expect(PlatformAdminOverviewResponseSchema.safeParse({}).success).toBe(
      false,
    );
  });

  it("rejects unexpected sensitive data", () => {
    expect(
      PlatformAdminOverviewResponseSchema.safeParse({
        administrator: {
          displayName: "Administrator",
        },
        patients: [],
      }).success,
    ).toBe(false);
  });

  it("rejects an empty administrator name", () => {
    expect(
      PlatformAdminOverviewResponseSchema.safeParse({
        administrator: {
          displayName: "",
        },
      }).success,
    ).toBe(false);
  });
});
