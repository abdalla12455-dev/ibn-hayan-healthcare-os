import { afterEach, describe, expect, it, vi } from "vitest";

import { getPlatformAdminTenants } from "./platform-tenants.client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockResponse(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("Platform tenant API client", () => {
  it("uses an authenticated, uncached GET request", async () => {
    const fetchMock = mockResponse(200, {
      items: [],
      hasMore: false,
    });

    const result = await getPlatformAdminTenants();

    expect(result).toEqual({
      ok: true,
      data: {
        items: [],
        hasMore: false,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0]!;

    expect(url).toContain("/platform-admin/tenants");

    expect(url).not.toContain("?");

    expect(options).toMatchObject({
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    expect(options.body).toBeUndefined();
  });

  it("rejects unauthorized access", async () => {
    mockResponse(403, {});

    const result = await getPlatformAdminTenants();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.statusCode).toBe(403);
    }
  });

  it("reports an expired session", async () => {
    mockResponse(401, {});

    const result = await getPlatformAdminTenants();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.statusCode).toBe(401);
    }
  });

  it("rejects unexpected response fields", async () => {
    mockResponse(200, {
      items: [],
      hasMore: false,
      patients: [],
    });

    const result = await getPlatformAdminTenants();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.category).toBe("CONTRACT_INVALID");
    }
  });

  it("does not mistake network failures for empty data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection unavailable")),
    );

    const result = await getPlatformAdminTenants();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.category).toBe("NETWORK_ERROR");
    }
  });
});
