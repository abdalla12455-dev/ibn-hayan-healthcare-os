import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiStatus } from './api-status';

/**
 * Component tests for the runtime ApiStatus indicator.
 *
 * These tests verify:
 * - the initial checking state is displayed on mount;
 * - a successful fetch transitions to the operational state;
 * - a failed fetch transitions to the unavailable state;
 * - the retry button appears only when unavailable and triggers a
 *   re-check when clicked;
 * - both English and Arabic labels are rendered;
 * - the live region uses `aria-live="polite"`;
 * - the page retains exactly one level-one heading (tested via the
 *   landing page integration, not here — this test suite renders the
 *   ApiStatus component in isolation, which uses no <h1>).
 *
 * `globalThis.fetch` is mocked for every test so no real network request
 * is made.
 *
 * Async-test patterns:
 * - Tests that intentionally verify the initial `checking` state use a
 *   never-resolving fetch mock (`mockFetchPending`) so the async state
 *   update never fires. This avoids React `act()` warnings without
 *   silencing console methods or weakening assertions.
 * - Tests that verify the `operational` or `unavailable` state use
 *   `await waitFor(...)` to flush the async state update inside `act()`.
 * - Tests that exercise user interaction wrap the interaction in
 *   `await act(async () => { ... })`.
 */

const validBody = {
  status: 'ok',
  service: 'ibn-hayan-api',
  version: 'development',
};

const originalFetch = globalThis.fetch;

function mockFetchSuccess() {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(validBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

function mockFetchFailure() {
  globalThis.fetch = vi
    .fn()
    .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
}

/**
 * Mocks `fetch` with a promise that never resolves. Used by tests that
 * verify the initial `checking` state: the async state update never
 * fires, so React does not warn about state updates outside `act()`.
 */
function mockFetchPending() {
  globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('ApiStatus', () => {
  it('displays the initial checking state on mount', () => {
    mockFetchPending();
    render(<ApiStatus />);
    expect(screen.getByText('Checking API status…')).toBeInTheDocument();
    expect(screen.getByText('جارٍ التحقق من حالة واجهة البرمجة…')).toBeInTheDocument();
  });

  it('transitions to operational state after a successful fetch', async () => {
    mockFetchSuccess();
    render(<ApiStatus />);

    await waitFor(() => {
      expect(screen.getByText('API operational')).toBeInTheDocument();
    });
    expect(screen.getByText('واجهة البرمجة تعمل')).toBeInTheDocument();
  });

  it('transitions to unavailable state after a failed fetch', async () => {
    mockFetchFailure();
    render(<ApiStatus />);

    await waitFor(() => {
      expect(screen.getByText('API unavailable')).toBeInTheDocument();
    });
    expect(screen.getByText('واجهة البرمجة غير متاحة')).toBeInTheDocument();
  });

  it('does not render a retry button in the checking state', () => {
    mockFetchPending();
    render(<ApiStatus />);
    expect(screen.queryByRole('button', { name: /Retry|إعادة المحاولة/ })).toBeNull();
  });

  it('does not render a retry button in the operational state', async () => {
    mockFetchSuccess();
    render(<ApiStatus />);
    await waitFor(() => {
      expect(screen.getByText('API operational')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Retry|إعادة المحاولة/ })).toBeNull();
  });

  it('renders a retry button only when unavailable', async () => {
    mockFetchFailure();
    render(<ApiStatus />);
    await waitFor(() => {
      expect(screen.getByText('API unavailable')).toBeInTheDocument();
    });
    const retryButton = screen.getByRole('button', { name: /Retry|إعادة المحاولة/ });
    expect(retryButton).toBeInTheDocument();
  });

  it('retries successfully after a failure', async () => {
    // First fetch fails, second succeeds.
    const fetchMock = vi.fn();
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(validBody), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ApiStatus />);

    // Wait for unavailable state.
    await waitFor(() => {
      expect(screen.getByText('API unavailable')).toBeInTheDocument();
    });

    // Click retry. user-event v14 wraps interactions in act() internally,
    // so no explicit act() wrapper is needed here.
    const retryButton = screen.getByRole('button', { name: /Retry|إعادة المحاولة/ });
    await user.click(retryButton);

    // Should transition to operational.
    await waitFor(() => {
      expect(screen.getByText('API operational')).toBeInTheDocument();
    });
  });

  it('renders bilingual labels in every state', async () => {
    mockFetchSuccess();
    render(<ApiStatus />);

    // Checking state has bilingual labels.
    expect(screen.getByText('Checking API status…')).toBeInTheDocument();
    expect(screen.getByText('جارٍ التحقق من حالة واجهة البرمجة…')).toBeInTheDocument();

    // Operational state has bilingual labels.
    await waitFor(() => {
      expect(screen.getByText('API operational')).toBeInTheDocument();
    });
    expect(screen.getByText('واجهة البرمجة تعمل')).toBeInTheDocument();
  });

  it('uses a polite live region for status announcements', () => {
    mockFetchPending();
    render(<ApiStatus />);
    const liveRegion = screen.getByText('Checking API status…').closest('[aria-live]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
  });

  it('the retry button is keyboard accessible', async () => {
    mockFetchFailure();
    const user = userEvent.setup();
    render(<ApiStatus />);

    await waitFor(() => {
      expect(screen.getByText('API unavailable')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry|إعادة المحاولة/ });
    // Native button elements are keyboard accessible by default.
    expect(retryButton.tagName).toBe('BUTTON');
    expect(retryButton).toHaveAttribute('type', 'button');

    // Tab to the button. user-event v14 wraps interactions in act()
    // internally, so no explicit act() wrapper is needed here.
    await user.tab();
    expect(retryButton).toHaveFocus();
  });

  it('does not display raw error details', async () => {
    mockFetchFailure();
    render(<ApiStatus />);

    await waitFor(() => {
      expect(screen.getByText('API unavailable')).toBeInTheDocument();
    });

    // The raw error message should not appear anywhere in the component.
    expect(screen.queryByText('Failed to fetch')).toBeNull();
    expect(screen.queryByText('TypeError')).toBeNull();
    expect(screen.queryByText('NETWORK_ERROR')).toBeNull();
  });

  it('does not use h1 (preserves page-level single-H1 structure)', () => {
    mockFetchPending();
    const { container } = render(<ApiStatus />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(0);
  });
});
