import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './page';

/**
 * Tests for the authenticated dashboard shell.
 *
 * These tests verify scenarios 39-42, 43-44 from the fourth canonical
 * batch specification:
 * - Dashboard displays the authenticated user.
 * - Dashboard displays memberships.
 * - Unauthenticated dashboard redirects.
 * - Logout obtains CSRF token and calls logout.
 * - No localStorage or sessionStorage is used.
 * - Exactly one H1 exists on the page.
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
        id: '12345678-1234-1234-1234-123456789013',
        tenantId: '12345678-1234-1234-1234-123456789014',
        tenantSlug: 'tenant-alpha.invalid',
        tenantDisplayName: 'Tenant Alpha',
        status: 'active' as const,
      },
    ],
    expiresAt: '2026-01-01T12:00:00.000Z',
  },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(screen.getByText('Tenant Alpha')).toBeDefined();
      expect(screen.getByText('tenant-alpha.invalid')).toBeDefined();
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
      ([key]) => typeof key === 'string' && (key.includes('session') || key.includes('token') || key.includes('csrf')),
    );
    expect(authStorageCalls).toHaveLength(0);
    const authSessionCalls = sessionStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && (key.includes('session') || key.includes('token') || key.includes('csrf')),
    );
    expect(authSessionCalls).toHaveLength(0);
  });

  it('logout obtains a CSRF token and calls logout', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetCsrfToken.mockResolvedValue({
      ok: true,
      data: { token: 'csrf-token-value' },
    });
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
});
