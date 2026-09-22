import { describe, expect, it } from "vitest";

import { PlatformTenantListSchema } from "./platform-tenants.schema.js";

const validTenant = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "clinic-one",
  displayName: "Clinic One",
  status: "active",
  createdAt: "2026-01-01T10:00:00.000Z",
};

describe("PlatformTenantListSchema", () => {
  it("accepts an empty customer list", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: [],
        hasMore: false,
      }).success,
    ).toBe(true);
  });

  it("accepts an authorized customer projection", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: [validTenant],
        hasMore: false,
      }).success,
    ).toBe(true);
  });

  it("accepts suspended customers", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: [{ ...validTenant, status: "suspended" }],
        hasMore: false,
      }).success,
    ).toBe(true);
  });

  it("rejects unexpected sensitive fields", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: [
          {
            ...validTenant,
            passwordHash: "must-not-be-exposed",
          },
        ],
        hasMore: false,
      }).success,
    ).toBe(false);
  });

  it("rejects more than 25 customers", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: Array.from({ length: 26 }, () => validTenant),
        hasMore: true,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid customer identifiers", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: [{ ...validTenant, id: "invalid-id" }],
        hasMore: false,
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid timestamp", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: [{ ...validTenant, createdAt: "yesterday" }],
        hasMore: false,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid customer status", () => {
    expect(
      PlatformTenantListSchema.safeParse({
        items: [{ ...validTenant, status: "deleted" }],
        hasMore: false,
      }).success,
    ).toBe(false);
  });
});
