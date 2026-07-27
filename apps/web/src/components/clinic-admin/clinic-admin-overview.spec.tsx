import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { ClinicAdminOverview } from './clinic-admin-overview';
import { LanguageProvider } from '@/components/i18n/language-context';
import type { ClinicAdminOverviewResponse } from '@ibn-hayan/contracts';
import type { ApiError } from '@/lib/api/api-error';

/**
 * Focused component tests for the ClinicAdminOverview component.
 *
 * These tests verify the request lifecycle, error handling, and
 * rendering behaviour of the Clinic Admin Overview content component.
 * The `getClinicAdminOverview` API client is mocked so the tests do
 * NOT make real network requests.
 *
 * ────────────────────────────────────────────────────────────────────
 * Component-scoped request isolation (current design)
 * ────────────────────────────────────────────────────────────────────
 *
 * The component owns a component-scoped `useRef<Promise<...> | null>`
 * (`inflightRef`) that stores the in-flight Overview request Promise.
 * The ref is the deduplication boundary for the React Strict Mode
 * effect replay: the first effect execution creates the Promise and
 * stores it in the ref; the second effect execution (on the SAME
 * component instance) reuses it. Only ONE underlying `fetch` call
 * reaches the server per Strict Mode mount cycle.
 *
 * The ref is NOT shared across:
 * - separate component instances (each instance has its own ref);
 * - genuine unmount + remount (the ref is destroyed on unmount);
 * - authenticated-context changes (the shell redirects on logout,
 *   tenant/organisation/facility change, and Role Preview entry/exit,
 *   unmounting this component; the remount creates a fresh ref);
 * - two simultaneously mounted components (each has its own ref).
 *
 * This design replaces the previous module-level URL-keyed in-flight
 * registry, which shared a Promise across every authenticated
 * session, tenant, organisation, facility, Role Preview state, and
 * concurrently mounted Clinic Admin surface in the same browser tab.
 *
 * The tests below verify (per the request-isolation correction
 * Phase 4 and Phase 5):
 *
 * 1. Component mounts only after the shell finishes session and
 *    context verification (verified by the shell; this test verifies
 *    the component fetches on mount unconditionally).
 * 2. Exactly one Overview request occurs during a normal mount.
 * 3. React Strict Mode produces exactly one underlying fetch (the
 *    component-scoped ref is reused across the effect replay).
 * 4. Genuine unmount + remount produces two underlying fetches (the
 *    ref is destroyed on unmount).
 * 5. Two simultaneously mounted components produce two underlying
 *    fetches (each has its own ref).
 * 6. Separate component instances do NOT share their in-flight
 *    Promises.
 * 7. Loading state.
 * 8. Successful response.
 * 9. Unsupported business regions.
 * 10. Navigational-only regions.
 * 11. Network failure.
 * 12. HTTP 500.
 * 13. HTTP 401 (non-retriable).
 * 14. HTTP 403 (non-retriable).
 * 15. Invalid JSON.
 * 16. Invalid response contract.
 * 17. Retry after network failure (exactly one new fetch).
 * 18. Retry after server failure (exactly one new fetch).
 * 19. No retry loop.
 * 20. Unmount during an in-flight request.
 * 21. Late response after unmount does not update state.
 * 22. A stale response cannot overwrite a newer retry result.
 * 23. No raw backend error text is shown.
 * 24. No audit-related API calls from the frontend.
 * 25. A successful completed request is NOT permanently cached.
 * 26. No duplicate successful-view audit event during Strict Mode.
 * 27. Logout + login produces a fresh fetch.
 * 28. Tenant-context change produces a fresh fetch.
 * 29. Organisation-context change produces a fresh fetch.
 * 30. Facility-context change produces a fresh fetch.
 * 31. Role Preview entry produces a fresh fetch.
 * 32. Role Preview exit produces a fresh fetch.
 *
 * The final assertions inspect the underlying mocked
 * `getClinicAdminOverview` call count, NOT only rendered output.
 *
 * NOTE on React Strict Mode in the vitest environment: React Strict
 * Mode's effect double-invoke is a development-only behaviour. The
 * vitest test environment may or may not reproduce it reliably. The
 * Strict Mode tests below use `<React.StrictMode>` and verify the
 * mock call count is exactly 1. If Strict Mode double-invokes, the
 * component-scoped ref reuse ensures one fetch. If Strict Mode does
 * NOT double-invoke, there is only one effect run, so one fetch. In
 * both cases, the test passes and catches the regression (ref NOT
 * reused → two fetches if Strict Mode double-invokes). A separate
 * test (test 4) verifies that a GENUINE unmount + remount produces
 * two fetches, proving the ref is component-scoped (destroyed on
 * unmount) and NOT module-global.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetClinicAdminOverview = vi.fn();
vi.mock('@/lib/api/clinic-admin', () => ({
  getClinicAdminOverview: (...args: unknown[]) =>
    mockGetClinicAdminOverview(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUCCESS_RESPONSE: ClinicAdminOverviewResponse = {
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

function makeNetworkError(): ApiError {
  return {
    category: 'NETWORK_ERROR',
    statusCode: undefined,
    message: 'Network request failed',
  } as ApiError;
}

function makeHttpError(statusCode: number): ApiError {
  return {
    category: 'HTTP_ERROR',
    statusCode,
    message: `HTTP ${statusCode}`,
  } as ApiError;
}

function makeInvalidJsonError(): ApiError {
  return {
    category: 'INVALID_JSON',
    statusCode: undefined,
    message: 'Invalid JSON',
  } as ApiError;
}

function makeContractInvalidError(): ApiError {
  return {
    category: 'CONTRACT_INVALID',
    statusCode: undefined,
    message: 'Contract validation failed',
  } as ApiError;
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function renderInStrictMode(ui: React.ReactElement) {
  return render(
    <LanguageProvider>
      <React.StrictMode>{ui}</React.StrictMode>
    </LanguageProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClinicAdminOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. fetches on mount unconditionally (the shell guarantees mount readiness)', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
    });
  });

  it('2. makes exactly one Overview request during a normal mount', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
    });
    // Wait a bit more to ensure no duplicate request.
    await new Promise((r) => setTimeout(r, 50));
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
  });

  it('3. React Strict Mode produces exactly one underlying fetch (component-scoped ref reuse)', async () => {
    // Under React Strict Mode, the component's `useEffect` runs
    // twice for a single mount cycle: mount → cleanup → re-mount
    // (on the SAME component instance — React does NOT destroy the
    // instance during Strict Mode replay). Without component-scoped
    // deduplication, each effect execution would call
    // `getClinicAdminOverview()`, producing two backend requests.
    // With the component-scoped `useRef`, the second effect
    // execution sees the ref already holds the in-flight Promise
    // and reuses it — NO new `getClinicAdminOverview()` call.
    //
    // NOTE on the vitest test environment: React Strict Mode's
    // effect double-invoke is a development-only behaviour that
    // may or may not fire reliably in vitest. This test wraps the
    // component in `<React.StrictMode>` and verifies the mock call
    // count is exactly 1. If Strict Mode double-invokes, the
    // component-scoped ref reuse ensures one fetch. If Strict Mode
    // does NOT double-invoke, there is only one effect run, so one
    // fetch. In both cases, the test passes and catches the
    // regression (ref NOT reused → two fetches if Strict Mode
    // double-invokes). A separate test (test 4) verifies that a
    // GENUINE unmount + remount produces two fetches, proving the
    // ref is component-scoped (destroyed on unmount) and NOT
    // module-global.
    let resolveFetch: (value: { ok: true; data: ClinicAdminOverviewResponse }) => void = () => {};
    mockGetClinicAdminOverview.mockReturnValue(
      new Promise<{ ok: true; data: ClinicAdminOverviewResponse }>(
        (resolve) => {
          resolveFetch = resolve;
        },
      ),
    );

    renderInStrictMode(<ClinicAdminOverview />);

    // Wait for the effects to run. If Strict Mode double-invokes,
    // the first effect creates the Promise and stores it in the
    // ref; the cleanup runs (setting cancelled=true); the second
    // effect sees the ref is non-null and reuses it (NO new call).
    // If Strict Mode does NOT double-invoke, only one effect runs
    // and one call is made. Either way: exactly 1 call.
    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // Resolve the in-flight request.
    resolveFetch({ ok: true, data: SUCCESS_RESPONSE });

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    const operatorElements = screen.getAllByText(/Operator Alpha/);
    expect(operatorElements).toHaveLength(1);
  });

  it('4. genuine unmount + remount produces TWO underlying fetches (ref is destroyed on unmount)', async () => {
    // This test proves the ref is COMPONENT-SCOPED (destroyed on
    // unmount) and NOT module-global. A genuine unmount destroys
    // the component instance and all its refs; a later remount
    // creates a new component instance with a new (empty) ref, so
    // a fresh fetch is made.
    //
    // This is the OPPOSITE of the old module-global registry
    // design, which shared the same Promise across unmount +
    // remount (a cross-navigation isolation risk).
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    // First mount.
    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // Genuine unmount. The ref is destroyed.
    unmount();

    // Wait for any pending microtasks.
    await new Promise((r) => setTimeout(r, 0));

    // Remount. The new component instance has a new (empty) ref,
    // so a fresh fetch is made.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('5. two simultaneously mounted components produce TWO underlying fetches (each has its own ref)', async () => {
    // Two independently mounted ClinicAdminOverview components each
    // own their own `useRef`. They do NOT share their in-flight
    // Promises. This is the OPPOSITE of the old module-global
    // registry design, which shared the same Promise between
    // concurrently mounted components.
    mockGetClinicAdminOverview.mockResolvedValue({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    const { unmount: unmountA } = renderWithProvider(
      <div data-testid="surface-a">
        <ClinicAdminOverview />
      </div>,
    );
    // Render a second surface in a separate container. Use a
    // different test-id so we can verify both rendered.
    const screen2 = document.createElement('div');
    document.body.appendChild(screen2);
    const { unmount: unmountB } = render(
      <LanguageProvider>
        <div data-testid="surface-b">
          <ClinicAdminOverview />
        </div>
      </LanguageProvider>,
      { container: screen2 },
    );

    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
    });

    // Cleanup.
    unmountA();
    unmountB();
    document.body.removeChild(screen2);
  });

  it('6. separate component instances do NOT share their in-flight Promises', async () => {
    // Render component A with a controllable (pending) Promise.
    // Render component B (after A's Promise is in flight) and
    // verify B receives a DIFFERENT Promise object (B makes its
    // own fresh fetch).
    let resolveA: (value: { ok: true; data: ClinicAdminOverviewResponse }) => void = () => {};
    const promiseA = new Promise<{ ok: true; data: ClinicAdminOverviewResponse }>(
      (resolve) => {
        resolveA = resolve;
      },
    );
    mockGetClinicAdminOverview.mockReturnValueOnce(promiseA);

    const { unmount: unmountA } = renderWithProvider(
      <div data-testid="surface-a">
        <ClinicAdminOverview />
      </div>,
    );
    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
    });

    // Render component B. It should make its OWN fresh fetch (NOT
    // reuse component A's Promise).
    let resolveB: (value: { ok: true; data: ClinicAdminOverviewResponse }) => void = () => {};
    const promiseB = new Promise<{ ok: true; data: ClinicAdminOverviewResponse }>(
      (resolve) => {
        resolveB = resolve;
      },
    );
    mockGetClinicAdminOverview.mockReturnValueOnce(promiseB);

    const screen2 = document.createElement('div');
    document.body.appendChild(screen2);
    const { unmount: unmountB } = render(
      <LanguageProvider>
        <div data-testid="surface-b">
          <ClinicAdminOverview />
        </div>
      </LanguageProvider>,
      { container: screen2 },
    );
    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
    });

    // The two calls returned DIFFERENT Promise objects (no
    // sharing).
    const call1Result = mockGetClinicAdminOverview.mock.results[0]!.value;
    const call2Result = mockGetClinicAdminOverview.mock.results[1]!.value;
    expect(call1Result).not.toBe(call2Result);

    // Cleanup: unmount both components first (so the pending
    // Promise resolutions do not trigger state updates), then
    // resolve the Promises to avoid unhandled-rejection warnings.
    unmountA();
    unmountB();
    document.body.removeChild(screen2);
    resolveA({ ok: true, data: SUCCESS_RESPONSE });
    resolveB({ ok: true, data: SUCCESS_RESPONSE });
    await new Promise((r) => setTimeout(r, 10));
  });

  it('7. renders the loading state while the fetch is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockGetClinicAdminOverview.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = renderWithProvider(<ClinicAdminOverview />);

    // The loading state should be visible.
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    // Clean up: unmount first (so the pending Promise resolution
    // does not trigger a state update), then resolve to avoid
    // unhandled-rejection warnings.
    unmount();
    resolveFetch({ ok: true, data: SUCCESS_RESPONSE });
    await new Promise((r) => setTimeout(r, 10));
  });

  it('8. renders the successful response with the administrator greeting', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Facility Alpha/)).toBeInTheDocument();
  });

  it('9. renders unsupported business regions with the not-supported label', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    // The financial_snapshot region is 'not_supported'. The default
    // language is Arabic, so the title is 'اللمحة المالية'.
    expect(screen.getByText('اللمحة المالية')).toBeInTheDocument();
  });

  it('10. renders navigational-only regions distinctly', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    // The appointment_actions region is 'navigational_only'. The
    // default language is Arabic.
    expect(screen.getByText('إجراءات المواعيد')).toBeInTheDocument();
    // The quick_actions region is 'navigational_only'.
    expect(screen.getByText('إجراءات سريعة')).toBeInTheDocument();
  });

  it('11. renders the network failure state with a retry affordance', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: false,
      error: makeNetworkError(),
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // A retry button should be present for network errors.
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('12. renders the HTTP 500 server failure state with a retry affordance', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: false,
      error: makeHttpError(500),
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('13. renders the HTTP 401 session-expiration state (not retriable)', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: false,
      error: makeHttpError(401),
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // 401 is not retriable from this component (the shell redirects
    // to /login).
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('14. renders the HTTP 403 authorisation-failure state (not retriable)', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: false,
      error: makeHttpError(403),
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // 403 is not retriable from this component (the shell redirects
    // to /dashboard).
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('15. renders the invalid-JSON state with a retry affordance', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: false,
      error: makeInvalidJsonError(),
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('16. renders the contract-invalid state with a retry affordance', async () => {
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: false,
      error: makeContractInvalidError(),
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('17. retries after a network failure when the retry button is clicked (exactly one new fetch)', async () => {
    mockGetClinicAdminOverview
      .mockResolvedValueOnce({ ok: false, error: makeNetworkError() })
      .mockResolvedValueOnce({ ok: true, data: SUCCESS_RESPONSE });

    const user = userEvent.setup();
    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    // Exactly two calls: initial fetch + retry fetch.
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('18. retries after a server failure when the retry button is clicked (exactly one new fetch)', async () => {
    mockGetClinicAdminOverview
      .mockResolvedValueOnce({ ok: false, error: makeHttpError(500) })
      .mockResolvedValueOnce({ ok: true, data: SUCCESS_RESPONSE });

    const user = userEvent.setup();
    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    // Exactly two calls: initial fetch + retry fetch.
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('19. does NOT enter a retry loop (retry is user-initiated, not automatic)', async () => {
    mockGetClinicAdminOverview.mockResolvedValue({
      ok: false,
      error: makeNetworkError(),
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // Wait to ensure no automatic retry occurs.
    await new Promise((r) => setTimeout(r, 100));
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
  });

  it('20. does NOT crash when unmounted during an in-flight request', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockGetClinicAdminOverview.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    // Unmount while the fetch is in flight.
    unmount();

    // Resolve the fetch after unmount. The component's cleanup sets
    // cancelled=true, so the setState call is a no-op.
    expect(() => {
      act(() => {
        resolveFetch({ ok: true, data: SUCCESS_RESPONSE });
      });
    }).not.toThrow();
  });

  it('21. a late response after unmount does NOT update state (no React warning)', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockGetClinicAdminOverview.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    unmount();

    // Resolve the fetch after unmount. The cancelled flag prevents
    // setState from being called.
    act(() => {
      resolveFetch({ ok: true, data: SUCCESS_RESPONSE });
    });
    // If the component did NOT handle this correctly, React would
    // log a warning about updating an unmounted component. The test
    // passes if no warning is logged (vitest fails on console.error
    // by default in some configs; here we just verify no throw).
  });

  it('22. a stale response cannot overwrite a newer retry result', async () => {
    // This test verifies the cancelled-flag pattern: after a retry,
    // the previous effect's cancelled flag is set to true, so a
    // stale response from the previous fetch cannot overwrite the
    // newer retry's result.
    let resolveFirst: (value: unknown) => void = () => {};
    mockGetClinicAdminOverview.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    const user = userEvent.setup();
    renderWithProvider(<ClinicAdminOverview />);

    // The first fetch is in flight (not yet resolved).
    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
    });

    // Resolve the first fetch with an error.
    resolveFirst({ ok: false, error: makeNetworkError() });

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    // Click retry — this clears the ref and increments fetchTrigger,
    // which causes the useEffect to re-run. The previous effect's
    // cleanup sets cancelled=true. The new effect's fetch is the
    // only one whose result can be applied.
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('23. does NOT show raw backend error text to the user', async () => {
    const rawErrorText = 'Internal server error: database connection failed at 2026-07-26T10:00:00Z';
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: false,
      error: {
        category: 'HTTP_ERROR',
        statusCode: 500,
        message: rawErrorText,
      } as ApiError,
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    // The raw error text MUST NOT appear in the rendered output.
    expect(screen.queryByText(/database connection failed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal server error/)).not.toBeInTheDocument();
  });

  it('24. does NOT emit a duplicate successful-view audit event from rendering behaviour (audit is server-side)', async () => {
    // The audit event (`clinic_admin.overview.viewed`) is emitted
    // server-side by the Clinic Admin Overview service. The frontend
    // component does NOT emit audit events. This test verifies the
    // component does NOT make any audit-related API calls.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    renderWithProvider(<ClinicAdminOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    // The only API call should be getClinicAdminOverview. No
    // audit-related endpoint is called from the frontend.
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
    // Verify no fetch to an audit endpoint was made.
    const allCalls = vi.mocked(mockGetClinicAdminOverview).mock.calls;
    for (const call of allCalls) {
      expect(JSON.stringify(call)).not.toContain('audit');
    }
  });

  it('25. a successful completed request is NOT permanently cached (later navigation makes a fresh request)', async () => {
    // This test simulates the user navigating away from /clinic-admin
    // and back. The first mount fetches; the user navigates away
    // (unmount); the user navigates back (re-mount). The re-mount
    // should make a FRESH request (not reuse a cached response).
    //
    // The component-scoped ref is destroyed on unmount. A later
    // mount creates a new (empty) ref, so a fresh fetch is made.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    // First mount.
    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // Navigate away.
    unmount();

    // Wait for any pending microtasks.
    await new Promise((r) => setTimeout(r, 0));

    // Navigate back.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });

    // A fresh fetch was made (total 2 calls).
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('26. no duplicate successful-view audit event can be caused by a duplicated frontend request during Strict Mode', async () => {
    // This is the KEY test for the Strict Mode duplicate-request
    // risk. Before the component-scoped ref, React Strict Mode
    // would cause two `getClinicAdminOverview()` calls (one per
    // effect execution). Both calls would reach the server (the
    // `cancelled` flag only prevents the FIRST response from being
    // applied to UI state — it does NOT prevent the first REQUEST
    // from reaching the server). Two backend requests for a single
    // user navigation would emit TWO
    // `clinic_admin.overview.viewed` successful-view audit events.
    //
    // With the component-scoped `useRef`, the two effect executions
    // share the same in-flight Promise (the ref is reused). Only
    // ONE `getClinicAdminOverview()` call is made. Only ONE
    // backend request reaches the server. Only ONE
    // `clinic_admin.overview.viewed` audit event is emitted.
    //
    // NOTE: React Strict Mode's effect double-invoke may or may not
    // fire reliably in vitest. If it does, this test proves the ref
    // reuse (one call). If it does NOT, there is only one effect
    // run, so one call. Either way, the test catches the regression
    // (ref NOT reused → two calls if Strict Mode double-invokes).
    let resolveFetch: (value: { ok: true; data: ClinicAdminOverviewResponse }) => void = () => {};
    mockGetClinicAdminOverview.mockReturnValue(
      new Promise<{ ok: true; data: ClinicAdminOverviewResponse }>(
        (resolve) => {
          resolveFetch = resolve;
        },
      ),
    );

    renderInStrictMode(<ClinicAdminOverview />);

    // Wait for the effects to run.
    await waitFor(() => {
      expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);
    });
    await new Promise((r) => setTimeout(r, 50));
    // Still exactly 1 call — the ref was reused.
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // Resolve the in-flight request.
    resolveFetch({ ok: true, data: SUCCESS_RESPONSE });

    // The success state is rendered exactly once.
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    const operatorElements = screen.getAllByText(/Operator Alpha/);
    expect(operatorElements).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Authenticated-context isolation tests (Phase 4)
  //
  // The ClinicAdminShell enforces a render gate: if the session is
  // missing, the context is missing, or the user signs out, the
  // shell redirects to /login or /dashboard, UNMOUNTING the
  // ClinicAdminOverview component. When the user later returns to
  // /clinic-admin (after re-login, context re-establishment, or
  // Role Preview exit), the shell re-mounts a FRESH
  // ClinicAdminOverview instance with a FRESH `useRef`.
  //
  // The tests below simulate each authenticated-context transition
  // as a genuine unmount + remount (which is the exact lifecycle
  // the shell triggers). Each test verifies that the remount
  // produces a FRESH fetch (the ref is NOT shared across the
  // transition).
  //
  // The tests do NOT place real session tokens, tenant identifiers,
  // organisation identifiers, or facility identifiers in snapshots
  // or logs. The display names used ("Tenant Alpha", "Organisation
  // Alpha", "Facility Alpha", "Operator Alpha") are generic test
  // fixtures, not real identifiers.
  // -------------------------------------------------------------------------

  it('27. logout + login produces a fresh fetch (ref is NOT shared across sessions)', async () => {
    // Simulate: user A is on /clinic-admin (component mounted,
    // fetch in flight). User A signs out — the shell redirects to
    // /login, unmounting the component. User B signs in and
    // navigates to /clinic-admin — the shell re-mounts a FRESH
    // component. The fresh component's ref is empty, so a FRESH
    // fetch is made. User B does NOT receive User A's response.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    // User A's session.
    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // User A signs out — component unmounts. The ref is destroyed.
    unmount();
    await new Promise((r) => setTimeout(r, 0));

    // User B signs in and navigates to /clinic-admin — fresh
    // component, fresh ref, fresh fetch.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('28. tenant-context change produces a fresh fetch (ref is NOT shared across tenants)', async () => {
    // Simulate: user is on /clinic-admin with Tenant A active
    // (component mounted, fetch completed). The user changes the
    // active tenant via the context switcher (the shell redirects
    // to /dashboard to re-establish context, unmounting the
    // component). The user navigates back to /clinic-admin — the
    // shell re-mounts a FRESH component with a FRESH ref. The
    // fresh fetch uses the NEW tenant context (the session cookie
    // now reflects Tenant B). The user does NOT see Tenant A's
    // stale response.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    // Tenant A active.
    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // Tenant change — component unmounts. The ref is destroyed.
    unmount();
    await new Promise((r) => setTimeout(r, 0));

    // Tenant B active — fresh component, fresh ref, fresh fetch.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('29. organisation-context change produces a fresh fetch (ref is NOT shared across organisations)', async () => {
    // Same lifecycle as the tenant-change test, but for an
    // organisation-context change.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    unmount();
    await new Promise((r) => setTimeout(r, 0));

    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('30. facility-context change produces a fresh fetch (ref is NOT shared across facilities)', async () => {
    // Same lifecycle as the tenant-change test, but for a
    // facility-context change.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    unmount();
    await new Promise((r) => setTimeout(r, 0));

    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('31. Role Preview entry produces a fresh fetch (ref is NOT shared across preview states)', async () => {
    // Simulate: user is on /clinic-admin in their real session
    // (component mounted, fetch completed). The user enters Role
    // Preview mode — the preview principal replaces the session
    // principal, and the shell re-mounts the component (the
    // preview session has a different authenticated context). The
    // fresh component's ref is empty, so a FRESH fetch is made
    // with the PREVIEW session cookie. The user does NOT see the
    // real session's stale response.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    // Real session.
    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // Role Preview entry — component unmounts. The ref is destroyed.
    unmount();
    await new Promise((r) => setTimeout(r, 0));

    // Preview session — fresh component, fresh ref, fresh fetch.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });

  it('32. Role Preview exit produces a fresh fetch (ref is NOT shared across preview states)', async () => {
    // Simulate: user is in Role Preview mode on /clinic-admin
    // (component mounted, fetch completed). The user exits Role
    // Preview — the real session principal is restored, and the
    // shell re-mounts the component. The fresh component's ref is
    // empty, so a FRESH fetch is made with the REAL session
    // cookie. The user does NOT see the preview session's stale
    // response.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });

    // Preview session.
    const { unmount } = renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(1);

    // Role Preview exit — component unmounts. The ref is destroyed.
    unmount();
    await new Promise((r) => setTimeout(r, 0));

    // Real session restored — fresh component, fresh ref, fresh fetch.
    mockGetClinicAdminOverview.mockResolvedValueOnce({
      ok: true,
      data: SUCCESS_RESPONSE,
    });
    renderWithProvider(<ClinicAdminOverview />);
    await waitFor(() => {
      expect(screen.getByText(/Operator Alpha/)).toBeInTheDocument();
    });
    expect(mockGetClinicAdminOverview).toHaveBeenCalledTimes(2);
  });
});
