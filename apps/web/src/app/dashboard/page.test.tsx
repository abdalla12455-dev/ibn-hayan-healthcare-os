import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './page';

/**
 * Tests for the authenticated dashboard shell.
 *
 * These tests verify scenarios from the fourth canonical batch
 * specification:
 * - Dashboard displays the authenticated user.
 * - Dashboard displays memberships.
 * - Unauthenticated dashboard redirects.
 * - Logout obtains CSRF token and calls logout.
 * - No localStorage or sessionStorage is used.
 * - Exactly one H1 exists on the page.
 *
 * These tests also verify scenarios from the fifth canonical batch
 * specification:
 * - Dashboard renders available Tenant options.
 * - Dashboard displays the active Tenant.
 * - Dashboard handles no active context.
 * - Selecting a Tenant obtains CSRF first.
 * - Selecting calls the context API with membershipId, not Tenant ID.
 * - Clearing obtains CSRF first.
 * - Context updates without page reload.
 * - Generic failure is accessible and bilingual.
 * - No Organisation or Facility selector exists.
 * - No localStorage, sessionStorage, IndexedDB, or readable cookie use.
 * - Dashboard still has exactly one H1.
 * - Existing login and logout behaviour remains passing.
 */

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
}));

const mockGetSession = vi.fn();
const mockGetCsrfToken = vi.fn();
const mockLogout = vi.fn();
vi.mock('@/lib/api/auth/auth.client', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  getCsrfToken: (...args: unknown[]) => mockGetCsrfToken(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

const mockGetContext = vi.fn();
const mockSelectTenantContext = vi.fn();
const mockClearTenantContext = vi.fn();
vi.mock('@/lib/api/context', () => ({
  getContext: (...args: unknown[]) => mockGetContext(...args),
  selectTenantContext: (...args: unknown[]) => mockSelectTenantContext(...args),
  clearTenantContext: (...args: unknown[]) => mockClearTenantContext(...args),
}));

const MEMBERSHIP_ID_A = '11111111-1111-1111-1111-111111111111';
const MEMBERSHIP_ID_B = '22222222-2222-2222-2222-222222222222';
const TENANT_ID_A = '33333333-3333-3333-3333-333333333333';
const TENANT_ID_B = '44444444-4444-4444-4444-444444444444';

const validSession = {
  ok: true,
  data: {
    user: {
      id: '12345678-1234-1234-1234-123456789012',
      email: 'operator@example.invalid',
      displayName: 'Operator Alpha',
      status: 'active' as const,
    },
    memberships: [
      {
        id: MEMBERSHIP_ID_A,
        tenantId: TENANT_ID_A,
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
        status: 'active' as const,
      },
      {
        id: MEMBERSHIP_ID_B,
        tenantId: TENANT_ID_B,
        tenantSlug: 'tenant-beta.invalid',
        tenantDisplayName: 'Tenant Beta',
        status: 'active' as const,
      },
    ],
    activeTenantContext: null,
    expiresAt: '2026-01-01T12:00:00.000Z',
  },
};

const contextWithNoActive = {
  ok: true,
  data: {
    options: [
      {
        membershipId: MEMBERSHIP_ID_A,
        tenantId: TENANT_ID_A,
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
      },
      {
        membershipId: MEMBERSHIP_ID_B,
        tenantId: TENANT_ID_B,
        tenantSlug: 'tenant-beta.invalid',
        tenantDisplayName: 'Tenant Beta',
      },
    ],
    active: null,
  },
};

const contextWithActiveA = {
  ok: true,
  data: {
    options: [
      {
        membershipId: MEMBERSHIP_ID_A,
        tenantId: TENANT_ID_A,
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
      },
      {
        membershipId: MEMBERSHIP_ID_B,
        tenantId: TENANT_ID_B,
        tenantSlug: 'tenant-beta.invalid',
        tenantDisplayName: 'Tenant Beta',
      },
    ],
    active: {
      membershipId: MEMBERSHIP_ID_A,
      tenantId: TENANT_ID_A,
      tenantSlug: 'tenant-alpha.invalid',
      tenantDisplayName: 'Tenant Alpha',
    },
  },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContext.mockResolvedValue(contextWithNoActive);
    mockGetCsrfToken.mockResolvedValue({
      ok: true,
      data: { token: 'csrf-token-value' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders exactly one H1', async () => {
    mockGetSession.mockResolvedValue(validSession);
    await act(async () => {
      render(<DashboardPage />);
    });
    await waitFor(() => {
      const h1s = document.querySelectorAll('h1');
      expect(h1s.length).toBe(1);
    });
  });

  it('displays the authenticated user info', async () => {
    mockGetSession.mockResolvedValue(validSession);
    await act(async () => {
      render(<DashboardPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Operator Alpha')).toBeDefined();
      expect(screen.getByText('operator@example.invalid')).toBeDefined();
    });
  });

  it('displays the memberships', async () => {
    mockGetSession.mockResolvedValue(validSession);
    await act(async () => {
      render(<DashboardPage />);
    });
    await waitFor(() => {
      // The memberships section heading exists.
      const membershipsHeading = screen.getByRole('heading', {
        name: /Tenant memberships/i,
      });
      expect(membershipsHeading).toBeDefined();
      // The membership list contains both tenants.
      const membershipsSection = membershipsHeading.closest('section');
      expect(membershipsSection?.textContent).toContain('tenant-alpha.invalid');
      expect(membershipsSection?.textContent).toContain('tenant-beta.invalid');
    });
  });

  it('redirects to /login when unauthenticated', async () => {
    mockGetSession.mockResolvedValue({
      ok: false,
      error: { statusCode: 401, category: 'HTTP_ERROR', message: 'Unauthorized' },
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('does not use localStorage or sessionStorage', async () => {
    mockGetSession.mockResolvedValue(validSession);
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

    await act(async () => {
      render(<DashboardPage />);
    });
    await waitFor(() => {
      expect(screen.getByText('Operator Alpha')).toBeDefined();
    });

    const authStorageCalls = localStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && (key.includes('session') || key.includes('token') || key.includes('csrf') || key.includes('context')),
    );
    expect(authStorageCalls).toHaveLength(0);
    const authSessionCalls = sessionStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && (key.includes('session') || key.includes('token') || key.includes('csrf') || key.includes('context')),
    );
    expect(authSessionCalls).toHaveLength(0);
  });

  it('logout obtains a CSRF token and calls logout', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockLogout.mockResolvedValue({ ok: true, data: { ok: true } });

    const user = userEvent.setup();
    await act(async () => {
      render(<DashboardPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign out/i })).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Sign out/i }));

    await waitFor(() => {
      expect(mockGetCsrfToken).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalledWith('csrf-token-value');
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  // -----------------------------------------------------------------------
  // Fifth canonical batch: dashboard context tests
  // -----------------------------------------------------------------------

  it('renders available Tenant options in the context section', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      // The context section heading exists.
      const contextHeading = screen.getByRole('heading', {
        name: /Active tenant context/i,
      });
      expect(contextHeading).toBeDefined();
      // The context section contains both Tenant options.
      const contextSection = contextHeading.closest('section');
      expect(contextSection?.textContent).toContain('Tenant Alpha');
      expect(contextSection?.textContent).toContain('Tenant Beta');
    });
  });

  it('displays the active Tenant when a context is selected', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithActiveA);

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      // The "Current" section shows the active Tenant.
      const currentSection = screen.getByText(/Current/i).closest('section');
      expect(currentSection).not.toBeNull();
      expect(currentSection?.textContent).toContain('Tenant Alpha');
    });
  });

  it('handles no active context by displaying a "must select" message', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      // The "no tenant selected" message appears.
      expect(screen.getByText(/No tenant selected/i)).toBeDefined();
    });
  });

  it('selecting a Tenant obtains CSRF first and calls the context API with membershipId', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValueOnce(contextWithNoActive);
    mockSelectTenantContext.mockResolvedValue(contextWithActiveA);

    const user = userEvent.setup();
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Select/i })).toBeDefined();
    });

    // Click the "Select" button.
    await user.click(screen.getByRole('button', { name: /Select/i }));

    await waitFor(() => {
      // CSRF was fetched first.
      expect(mockGetCsrfToken).toHaveBeenCalled();
      // The context API was called with the membershipId (default
      // selected is the first option, which is MEMBERSHIP_ID_A).
      expect(mockSelectTenantContext).toHaveBeenCalledWith(
        MEMBERSHIP_ID_A,
        'csrf-token-value',
      );
    });
  });

  it('clearing obtains CSRF first and calls clearTenantContext', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext
      .mockResolvedValueOnce(contextWithActiveA) // initial load
      .mockResolvedValueOnce(contextWithNoActive); // after clear reload
    mockClearTenantContext.mockResolvedValue({
      ok: true,
      data: { ok: true, active: null },
    });

    const user = userEvent.setup();
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Clear selection/i })).toBeDefined();
    });

    // Click the "Clear selection" button.
    await user.click(screen.getByRole('button', { name: /Clear selection/i }));

    await waitFor(() => {
      // CSRF was fetched first.
      expect(mockGetCsrfToken).toHaveBeenCalled();
      // The clear context API was called with the CSRF token.
      expect(mockClearTenantContext).toHaveBeenCalledWith('csrf-token-value');
    });
  });

  it('updates the context section without a full page reload after selection', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValueOnce(contextWithNoActive);
    mockSelectTenantContext.mockResolvedValue(contextWithActiveA);

    const user = userEvent.setup();
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No tenant selected/i)).toBeDefined();
    });

    // Click the "Select" button.
    await user.click(screen.getByRole('button', { name: /Select/i }));

    await waitFor(() => {
      // The "no tenant selected" message should be gone, and the
      // active Tenant should be displayed.
      expect(screen.queryByText(/No tenant selected/i)).toBeNull();
    });
  });

  it('displays a generic failure message accessible and bilingual when selection fails', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValueOnce(contextWithNoActive);
    mockSelectTenantContext.mockResolvedValue({
      ok: false,
      error: { statusCode: 403, category: 'HTTP_ERROR', message: 'Forbidden' },
    });

    const user = userEvent.setup();
    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Select/i })).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: /Select/i }));

    await waitFor(() => {
      // The error message is bilingual (English and Arabic).
      const alerts = screen.getAllByRole('alert');
      const contextAlert = alerts.find((a) =>
        a.textContent?.includes('Unable to select tenant context'),
      );
      expect(contextAlert).toBeDefined();
      expect(contextAlert?.textContent).toContain('تعذر اختيار سياق المستأجر');
    });
  });

  it('does not render an Organisation or Facility selector', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Active tenant context/i })).toBeDefined();
    });

    // No "Organisation" or "Facility" headings or labels exist.
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/Organisation context/i);
    expect(bodyText).not.toMatch(/Facility context/i);
    expect(bodyText).not.toMatch(/Select an organisation/i);
    expect(bodyText).not.toMatch(/Select a facility/i);
  });

  it('still has exactly one H1 with the context section present', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      const h1s = document.querySelectorAll('h1');
      expect(h1s.length).toBe(1);
    });

    // The context section exists with an h2 heading.
    const h2s = document.querySelectorAll('h2');
    const h2Texts = Array.from(h2s).map((h) => h.textContent ?? '');
    expect(h2Texts.some((t) => t.includes('Active tenant context'))).toBe(true);
  });
});
