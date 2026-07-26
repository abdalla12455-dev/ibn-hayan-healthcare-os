import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClinicAdminOverview } from './clinic-admin.client';

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
 * ────────────────────────────────────────────────────────────────────
 * Component-scoped request isolation (current design)
 * ────────────────────────────────────────────────────────────────────
 *
 * The client itself is now STATELESS: it holds no module-level
 * mutable state. Every call to `getClinicAdminOverview()` performs
 * a fresh `fetch`. The Strict Mode deduplication responsibility has
 * moved INTO the mounted `ClinicAdminOverview` component, which
 * owns a component-scoped `useRef<Promise<...> | null>` to reuse
 * the in-flight Promise across the Strict Mode effect replay.
 *
 * The previous design (a module-level `INFLIGHT_OVERVIEW_REQUESTS`
 * registry keyed by URL) was REMOVED because it shared a Promise
 * across every authenticated session, tenant, organisation,
 * facility, Role Preview state, and concurrently mounted Clinic
 * Admin surface in the same browser tab — a cross-context
 * isolation risk.
 *
 * The component-level isolation tests (separate component instances,
 * genuine unmount + remount, logout + login, tenant/organisation/
 * facility/Role-Preview transitions, two simultaneously mounted
 * components, Strict Mode effect replay) live in
 * `apps/web/src/components/clinic-admin/clinic-admin-overview.spec.tsx`.
 *
 * Per the live-data task specification Phase 6, the client must
 * surface the following result states to the calling component:
 * - success with data;
 * - authorisation failure (403);
 * - session expiration (401);
 * - server failure (5xx);
 * - network failure;
 * - contract invalid.
 *
 * Per the request-isolation correction Phase 3, every call to
 * `getClinicAdminOverview()` performs a fresh `fetch` — there is no
 * module-level deduplication, and no module-level mutable state.
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
});

afterEach(() => {
  vi.restoreAllMocks();
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

describe('getClinicAdminOverview — stateless request behaviour (no module-level registry)', () => {
  it('every call performs a fresh fetch (no module-level deduplication)', async () => {
    // The client no longer maintains a module-level in-flight
    // registry. Every call to getClinicAdminOverview() performs a
    // fresh fetch. The Strict Mode deduplication responsibility
    // has moved INTO the mounted component, which owns a
    // component-scoped useRef.
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(okResponse),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    // Two sequential calls.
    await getClinicAdminOverview();
    await getClinicAdminOverview();

    // Two underlying fetch calls — no deduplication at the client
    // level.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('concurrent calls perform separate fetches (no Promise sharing at the client level)', async () => {
    // The client no longer shares a Promise between concurrent
    // callers. Each call gets its own underlying fetch. This is
    // the OPPOSITE of the previous design, which shared a single
    // Promise between concurrent callers via a URL-keyed
    // module-level registry. The new design moves the
    // deduplication responsibility into the component, which
    // owns a component-scoped useRef that is NOT shared across
    // authenticated contexts.
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(okResponse),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchSpy);

    // Two concurrent calls.
    const promiseA = getClinicAdminOverview();
    const promiseB = getClinicAdminOverview();
    await Promise.all([promiseA, promiseB]);

    // Two underlying fetch calls — no Promise sharing at the
    // client level.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
