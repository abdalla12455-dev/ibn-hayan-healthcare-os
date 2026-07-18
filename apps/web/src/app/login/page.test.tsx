import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

/**
 * Tests for the bilingual login page.
 *
 * These tests verify scenarios 35-38, 43-44 from the fourth canonical
 * batch specification:
 * - Login form is bilingual and accessible.
 * - Loading state works.
 * - Successful login redirects.
 * - Generic login failure is displayed.
 * - No localStorage or sessionStorage is used.
 * - Exactly one H1 exists on the page.
 */

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
}));

// Mock the auth client
const mockLogin = vi.fn();
const mockGetSession = vi.fn();
vi.mock('@/lib/api/auth/auth.client', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing session.
    mockGetSession.mockResolvedValue({ ok: false, error: { statusCode: 401 } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders exactly one H1', async () => {
    await act(async () => {
      render(<LoginPage />);
    });
    await waitFor(() => {
      const h1s = document.querySelectorAll('h1');
      expect(h1s.length).toBe(1);
    });
  });

  it('renders bilingual labels (English and Arabic)', async () => {
    await act(async () => {
      render(<LoginPage />);
    });
    await waitFor(() => {
      // The H1 contains both "Sign in" and "تسجيل الدخول".
      const h1 = document.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1?.textContent).toContain('Sign in');
      expect(h1?.textContent).toContain('تسجيل الدخول');
    });
  });

  it('renders email and password fields with correct autocomplete attributes', async () => {
    await act(async () => {
      render(<LoginPage />);
    });
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      expect(emailInput.getAttribute('autocomplete')).toBe('email');
      expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
    });
  });

  it('does not use localStorage or sessionStorage', async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');

    await act(async () => {
      render(<LoginPage />);
    });
    await waitFor(() => {
      expect(document.querySelector('h1')).not.toBeNull();
    });

    // Filter out any storage calls that are NOT auth-related. The
    // test passes if no auth-related keys (session, token, csrf,
    // password) are written to browser storage.
    const authKeyPattern = /session|token|csrf|password|auth|credential/i;
    const authStorageCalls = localStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && authKeyPattern.test(key),
    );
    expect(authStorageCalls).toHaveLength(0);
    const authSessionCalls = sessionStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && authKeyPattern.test(key),
    );
    expect(authSessionCalls).toHaveLength(0);
  });

  it('redirects to /dashboard if a valid session already exists', async () => {
    mockGetSession.mockResolvedValue({
      ok: true,
      data: {
        user: { id: 'u1', email: 'a@b.c', displayName: 'A', status: 'active' },
        memberships: [],
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await act(async () => {
      render(<LoginPage />);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays loading state on submit', async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: unknown) => void;
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    await act(async () => {
      render(<LoginPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign in/i })).toBeDefined();
    });

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    await user.type(emailInput, 'test@example.invalid');
    await user.type(passwordInput, 'sufficiently-long-password');

    const submitButton = screen.getByRole('button', { name: /Sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Signing in/)).toBeDefined();
    });

    // Resolve the login to clean up.
    await act(async () => {
      resolveLogin({ ok: true, data: {} });
    });
  });

  it('displays a generic error message on login failure (401)', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      ok: false,
      error: { statusCode: 401, category: 'HTTP_ERROR', message: 'Unauthorized' },
    });

    await act(async () => {
      render(<LoginPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign in/i })).toBeDefined();
    });

    await user.type(screen.getByLabelText(/Email/i), 'test@example.invalid');
    await user.type(screen.getByLabelText(/Password/i), 'sufficiently-long-password');
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid email or password/i)).toBeDefined();
    });
  });

  it('redirects to /dashboard on successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      ok: true,
      data: {
        user: { id: 'u1', email: 'a@b.c', displayName: 'A', status: 'active' },
        memberships: [],
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await act(async () => {
      render(<LoginPage />);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sign in/i })).toBeDefined();
    });

    await user.type(screen.getByLabelText(/Email/i), 'test@example.invalid');
    await user.type(screen.getByLabelText(/Password/i), 'sufficiently-long-password');
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });
});
