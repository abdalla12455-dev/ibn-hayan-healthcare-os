import { afterEach, describe, expect, it, vi } from "vitest";

import { getPlatformAdminOverview } from "./platform-admin.client";

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

describe("Platform administration API client", () => {
  it("uses an authenticated, uncached GET request", async () => {
    const fetchMock = mockResponse(200, {
      administrator: {
        displayName: "Platform Operator",
      },
    });

    const result = await getPlatformAdminOverview();

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0]!;

    expect(url).toContain("/platform-admin/overview");
    expect(url).not.toContain("?");

    expect(options).toMatchObject({
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    expect(options.body).toBeUndefined();
  });

  it("returns an authorization error for HTTP 403", async () => {
    mockResponse(403, {});

    const result = await getPlatformAdminOverview();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.statusCode).toBe(403);
    }
  });

  it("returns a session error for HTTP 401", async () => {
    mockResponse(401, {});

    const result = await getPlatformAdminOverview();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.statusCode).toBe(401);
    }
  });

  it("rejects unexpected data in the response", async () => {
    mockResponse(200, {
      administrator: {
        displayName: "Platform Operator",
      },
      patients: [],
    });

    const result = await getPlatformAdminOverview();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.category).toBe("CONTRACT_INVALID");
    }
  });

  it("returns a network error without treating it as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection unavailable")),
    );

    const result = await getPlatformAdminOverview();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.category).toBe("NETWORK_ERROR");
    }
  });
});
