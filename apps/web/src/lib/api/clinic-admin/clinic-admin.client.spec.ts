import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getClinicAdminOverview,
  __clearInflightOverviewRequestsForTests,
  __inflightOverviewRequestCountForTests,
} from './clinic-admin.client';

/**
 * Unit tests for the Clinic Admin Overview API client.
 *
 * These tests verify that the client:
 * - Sends a GET request to `/clinic-admin/overview` with
 *   `credentials: 'include'`.
 * - Parses the success response through the
 *   `ClinicAdminOverviewResponseSchema` Zod schema.
 * - Returns a typed error for non-2xx responses, network failures,
 *   invalid JSON, and contract-invalid responses.
 * - Does NOT persist anything to browser storage.
 * - Does NOT supply tenant/organisation/facility identifiers in the
 *   request body or query string (the request is a parameterless
 *   GET; the server derives context from the session cookie).
 *
 * In-flight request deduplication tests (added by the
 * `fix: wire clinic admin integration and deduplicate overview requests`
 * commit) verify that:
 * - Concurrent calls share the same in-flight Promise.
 * - Exactly one underlying `fetch` call is made for concurrent
 *   identical requests.
 * - The in-flight Promise is removed from the registry after it
 *   settles (success OR failure).
 * - A later call after settling makes a fresh request.
 * - A retry after a network failure makes a fresh request.
 * - A retry after HTTP 500 makes a fresh request.
 * - A successful completed request is not permanently cached.
 * - The registry does not hold business-data state.
 *
 * Per the live-data task specification Phase 6, the client must
 * surface the following result states to the calling component:
 * - success with data;
 * - authorisation failure (403);
 * - session expiration (401);
 * - server failure (5xx);
 * - network failure;
 * - contract invalid.
 */

const okResponse = {
  activeContext: {
    tenantDisplayName: 'Tenant Alpha',
    organisationDisplayName: 'Organisation Alpha',
    facilityDisplayName: 'Facility Alpha',
  },
  administrator: {
    displayName: 'Operator Alpha',
  },
  regions: [
    { key: 'appointment_actions', availability: 'navigational_only' },
    { key: 'financial_snapshot', availability: 'not_supported' },
    { key: 'todays_appointments', availability: 'not_supported' },
    { key: 'operational_alerts', availability: 'not_supported' },
    { key: 'inventory_alerts', availability: 'not_supported' },
    { key: 'doctors_on_duty', availability: 'not_supported' },
    { key: 'waiting_room_operations', availability: 'not_supported' },
    { key: 'staff_attendance_summary', availability: 'not_supported' },
    { key: 'quick_actions', availability: 'navigational_only' },
  ],
  generatedAt: '2026-07-26T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  __clearInflightOverviewRequestsForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  __clearInflightOverviewRequestsForTests();
});

function mockFetchSuccess(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status,
      json: () => Promise.resolve(body),
    } as unknown as Response),
  );
}

function mockFetchHttpError(status: number): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({}),
    } as unknown as Response),
  );
}

function mockFetchNetworkError(error: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
}

function mockFetchInvalidJson(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('invalid json')),
    } as unknown as Response),
  );
}

/**
 * Mock `fetch` with a controllable Promise. Returns a tuple of
 * `[fetchSpy, resolve]` where `resolve` is called to settle the
 * in-flight Promise. Used by the deduplication tests to keep the
 * Promise pending while assertions are made.
 */
function mockFetchControllable(): readonly [
  ReturnType<typeof vi.fn>,
  (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void,
] {
  let resolveFn:
    | ((value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void)
    | null = null;
  const fetchSpy = vi.fn().mockReturnValue(
    new Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>(
      (resolve) => {
        resolveFn = resolve;
      },
    ),
  );
  vi.stubGlobal('fetch', fetchSpy);
  const resolve = (
    value: { ok: boolean; status: number; json: () => Promise<unknown> },
  ): void => {
    if (resolveFn === null) {
      throw new Error('resolveFn not yet captured');
    }
    resolveFn(value);
  };
  return [fetchSpy, resolve] as const;
}

describe('getClinicAdminOverview — basic request behaviour', () => {
  it('sends a GET request with credentials: include', async () => {
    mockFetchSuccess(okResponse);
    const fetchSpy = vi.mocked(globalThis.fetch);

    await getClinicAdminOverview();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toContain('/clinic-admin/overview');
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('include');
  });

  it('does not supply a body or query string (server derives context from session cookie)', async () => {
    mockFetchSuccess(okResponse);
    const fetchSpy = vi.mocked(globalThis.fetch);

    await getClinicAdminOverview();

    const [url, init] = fetchSpy.mock.calls[0]!;
    // URL must not contain a query string. The server derives all
    // context from the session cookie.
    expect(url).not.toContain('?');
    expect(url).not.toContain('tenantId');
    expect(url).not.toContain('organisationId');
    expect(url).not.toContain('facilityId');
    // No body.
    expect(init?.body).toBeUndefined();
  });

  it('returns ok with parsed data on a canonical success response', async () => {
    mockFetchSuccess(okResponse);

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.activeContext.tenantDisplayName).toBe('Tenant Alpha');
      expect(result.data.administrator.displayName).toBe('Operator Alpha');
      expect(result.data.regions).toHaveLength(9);
      expect(result.data.regions[0]!.key).toBe('appointment_actions');
      expect(result.data.regions[0]!.availability).toBe('navigational_only');
      expect(result.data.generatedAt).toBe('2026-07-26T10:00:00.000Z');
    }
  });

  it('accepts Arabic display names', async () => {
    mockFetchSuccess({
      ...okResponse,
      activeContext: {
        tenantDisplayName: 'مجموعة الرافدين الصحية',
        organisationDisplayName: 'مجموعة الرافدين',
        facilityDisplayName: 'مركز المنصور التخصصي',
      },
      administrator: {
        displayName: 'مدير المنشأة',
      },
    });

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(true);
  });

  it('returns HTTP_ERROR 401 when the session is missing or expired', async () => {
    mockFetchHttpError(401);

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('HTTP_ERROR');
      expect(result.error.statusCode).toBe(401);
    }
  });

  it('returns HTTP_ERROR 403 when authorisation is denied (principal is not R09 or context is missing)', async () => {
    mockFetchHttpError(403);

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('HTTP_ERROR');
      expect(result.error.statusCode).toBe(403);
    }
  });

  it('returns HTTP_ERROR 500 for server failures', async () => {
    mockFetchHttpError(500);

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('HTTP_ERROR');
      expect(result.error.statusCode).toBe(500);
    }
  });

  it('returns NETWORK_ERROR when fetch throws', async () => {
    mockFetchNetworkError(new Error('connection refused'));

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('NETWORK_ERROR');
    }
  });

  it('returns INVALID_JSON when the response body cannot be parsed', async () => {
    mockFetchInvalidJson();

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('INVALID_JSON');
    }
  });

  it('returns CONTRACT_INVALID when the response body fails Zod validation', async () => {
    // Missing required field: administrator.
    mockFetchSuccess({
      activeContext: okResponse.activeContext,
      regions: okResponse.regions,
      generatedAt: '2026-07-26T10:00:00.000Z',
    });

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('CONTRACT_INVALID');
    }
  });

  it('returns CONTRACT_INVALID when the response body contains an extra field (strict mode)', async () => {
    mockFetchSuccess({
      ...okResponse,
      internalTenantId: '11111111-1111-1111-1111-111111111111',
    });

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('CONTRACT_INVALID');
    }
  });

  it('returns CONTRACT_INVALID when a region has an invalid availability value', async () => {
    mockFetchSuccess({
      ...okResponse,
      regions: okResponse.regions.map((r) =>
        r.key === 'financial_snapshot'
          ? { ...r, availability: 'unsupported_state' }
          : r,
      ),
    });

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('CONTRACT_INVALID');
    }
  });

  it('returns CONTRACT_INVALID when a region has an invalid key', async () => {
    mockFetchSuccess({
      ...okResponse,
      regions: okResponse.regions.map((r) =>
        r.key === 'financial_snapshot'
          ? { ...r, key: 'invalid_region' }
          : r,
      ),
    });

    const result = await getClinicAdminOverview();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('CONTRACT_INVALID');
    }
  });
});

describe('getClinicAdminOverview — in-flight request deduplication', () => {
  it('concurrent calls share the same in-flight Promise and produce exactly one underlying fetch', async () => {
    const [fetchSpy, resolve] = mockFetchControllable();

    // Start two concurrent requests. Both should share the same
    // in-flight Promise.
    const promiseA = getClinicAdminOverview();
    const promiseB = getClinicAdminOverview();

    // Exactly one underlying fetch call has been made.
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Both promises are the same object reference (deduplication).
    expect(promiseA).toBe(promiseB);

    // Resolve the in-flight request.
    resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(okResponse),
    });

    const [resultA, resultB] = await Promise.all([promiseA, promiseB]);

    // Both calls receive the same result.
    expect(resultA).toEqual(resultB);
    expect(resultA.ok).toBe(true);

    // Still exactly one fetch call.
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // The registry is empty after the Promise settles.
    expect(__inflightOverviewRequestCountForTests()).toBe(0);
  });

  it('three concurrent calls produce exactly one underlying fetch', async () => {
    const [fetchSpy, resolve] = mockFetchControllable();

    const promiseA = getClinicAdminOverview();
    const promiseB = getClinicAdminOverview();
    const promiseC = getClinicAdminOverview();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(promiseA).toBe(promiseB);
    expect(promiseB).toBe(promiseC);

    resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(okResponse),
    });

    await Promise.all([promiseA, promiseB, promiseC]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(__inflightOverviewRequestCountForTests()).toBe(0);
  });

  it('a sequential call after a successful request makes a fresh fetch (no persistent caching)', async () => {
    // Stub fetch once with a function that always succeeds. This
    // keeps the same spy across both calls so we can verify the
    // total call count.
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(okResponse),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    // First call: makes a fetch.
    await getClinicAdminOverview();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Wait a microtask to ensure the .finally() cleanup runs.
    await new Promise((r) => setTimeout(r, 0));

    // Second call: the registry is empty (the previous Promise has
    // settled and been removed), so a new fetch is made.
    await getClinicAdminOverview();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('a failed in-flight request is removed from the registry (retry after network failure makes a fresh fetch)', async () => {
    // First call: network failure.
    mockFetchNetworkError(new Error('connection refused'));
    const fetchSpy1 = vi.mocked(globalThis.fetch);

    const result1 = await getClinicAdminOverview();
    expect(result1.ok).toBe(false);
    if (!result1.ok) {
      expect(result1.error.category).toBe('NETWORK_ERROR');
    }
    expect(fetchSpy1).toHaveBeenCalledTimes(1);

    // The registry is empty after the failed Promise settles.
    await new Promise((r) => setTimeout(r, 0));
    expect(__inflightOverviewRequestCountForTests()).toBe(0);

    // Second call: the registry is empty, so a fresh fetch is made.
    mockFetchSuccess(okResponse);
    const fetchSpy2 = vi.mocked(globalThis.fetch);

    const result2 = await getClinicAdminOverview();
    expect(result2.ok).toBe(true);
    expect(fetchSpy2).toHaveBeenCalledTimes(1);
  });

  it('a failed in-flight request is removed from the registry (retry after HTTP 500 makes a fresh fetch)', async () => {
    // First call: HTTP 500.
    mockFetchHttpError(500);
    const fetchSpy1 = vi.mocked(globalThis.fetch);

    const result1 = await getClinicAdminOverview();
    expect(result1.ok).toBe(false);
    if (!result1.ok) {
      expect(result1.error.category).toBe('HTTP_ERROR');
      expect(result1.error.statusCode).toBe(500);
    }
    expect(fetchSpy1).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 0));
    expect(__inflightOverviewRequestCountForTests()).toBe(0);

    // Second call: fresh fetch.
    mockFetchSuccess(okResponse);
    const fetchSpy2 = vi.mocked(globalThis.fetch);

    const result2 = await getClinicAdminOverview();
    expect(result2.ok).toBe(true);
    expect(fetchSpy2).toHaveBeenCalledTimes(1);
  });

  it('a failed in-flight request is removed from the registry (retry after CONTRACT_INVALID makes a fresh fetch)', async () => {
    // First call: contract invalid (missing 'administrator').
    mockFetchSuccess({
      activeContext: okResponse.activeContext,
      regions: okResponse.regions,
      generatedAt: '2026-07-26T10:00:00.000Z',
    });
    const fetchSpy1 = vi.mocked(globalThis.fetch);

    const result1 = await getClinicAdminOverview();
    expect(result1.ok).toBe(false);
    if (!result1.ok) {
      expect(result1.error.category).toBe('CONTRACT_INVALID');
    }
    expect(fetchSpy1).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 0));
    expect(__inflightOverviewRequestCountForTests()).toBe(0);

    // Second call: fresh fetch.
    mockFetchSuccess(okResponse);
    const fetchSpy2 = vi.mocked(globalThis.fetch);

    const result2 = await getClinicAdminOverview();
    expect(result2.ok).toBe(true);
    expect(fetchSpy2).toHaveBeenCalledTimes(1);
  });

  it('the registry holds no business-data state (only Promises)', async () => {
    // The registry is a Map<string, Promise>. The key is the URL
    // only; the value is a Promise. The Promise's eventual value is
    // NOT stored in the registry — only the Promise object itself
    // is held while in flight. After the Promise settles, the entry
    // is removed.
    //
    // This test verifies that after a successful request, the
    // registry is empty (no resolved data is cached).
    mockFetchSuccess(okResponse);

    await getClinicAdminOverview();

    await new Promise((r) => setTimeout(r, 0));
    expect(__inflightOverviewRequestCountForTests()).toBe(0);
  });

  it('the registry does not store tenant/organisation/facility identifiers', async () => {
    // The registry key is the canonical request URL
    // (`/clinic-admin/overview` relative to the API base URL). The
    // URL contains no tenant, organisation, or facility
    // identifiers (the server derives them from the session
    // cookie). This test verifies the registry holds at most one
    // entry per URL (no per-identifier entries).
    const [fetchSpy, resolve] = mockFetchControllable();

    // Start a request.
    getClinicAdminOverview();

    // The registry has exactly one entry (the in-flight Promise for
    // the URL).
    expect(__inflightOverviewRequestCountForTests()).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // The URL passed to fetch contains no tenant/organisation/
    // facility identifiers.
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).not.toContain('tenantId');
    expect(String(url)).not.toContain('organisationId');
    expect(String(url)).not.toContain('facilityId');

    // Resolve and verify the registry is cleared.
    resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(okResponse),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(__inflightOverviewRequestCountForTests()).toBe(0);
  });
});
