import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';
import { LanguageProvider } from '@/components/i18n/language-context';

/**
 * Tests for the `/login` direct-link route (sixth canonical batch).
 *
 * Verifies scenarios:
 * 3.  `/login` uses the same approved login experience as `/`.
 * 10. Login fields remain accessible.
 * 11. Login submission uses the existing auth client.
 * 13. Existing valid session redirects to dashboard.
 * 14. Invalid session leaves the login form available.
 * 15. Generic network failure is shown without infrastructure details.
 * 20. No localStorage, sessionStorage, IndexedDB, or readable auth
 *     cookie is used.
 *
 * The login route renders the same {@link LandingExperience} as the
 * root route, so these tests also implicitly cover the login form
 * behaviour on the landing page.
 */

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
}));

const mockLogin = vi.fn();
const mockGetSession = vi.fn();
vi.mock('@/lib/api/auth/auth.client', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  getSession: (...args: unknown[]) => mockGetSession(...args),
  getCsrfToken: vi.fn().mockResolvedValue({
    ok: true,
    data: { token: 'csrf-token' },
  }),
  logout: vi.fn().mockResolvedValue({ ok: true, data: { ok: true } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing session.
  mockGetSession.mockResolvedValue({
    ok: false,
    error: { statusCode: 401, category: 'HTTP_ERROR', message: 'Unauthorized' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderLogin() {
  return render(
    <LanguageProvider>
      <LoginPage />
    </LanguageProvider>,
  );
}

describe('LoginPage (direct-link route)', () => {
  it('renders the same approved login experience as the root route', async () => {
    await act(async () => {
      renderLogin();
    });
    // The Arabic hero heading (default language) is present, proving
    // the landing experience is rendered.
    await waitFor(() => {
      expect(
        screen.getByText('نظام تشغيل موحّد للعيادات الحديثة'),
      ).toBeInTheDocument();
    });
    // The login form is also rendered (it is part of the landing experience).
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
  });

  it('renders exactly one H1', async () => {
    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      const h1s = document.querySelectorAll('h1');
      expect(h1s.length).toBe(1);
    });
  });

  it('renders email and password fields with correct autocomplete attributes', async () => {
    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
    });
    const emailInput = screen.getByLabelText('البريد الإلكتروني');
    const passwordInput = screen.getByLabelText('كلمة المرور');
    expect(emailInput.getAttribute('autocomplete')).toBe('email');
    expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
  });

  it('renders the login form immediately without technical loading text', async () => {
    await act(async () => {
      renderLogin();
    });
    // The form is rendered immediately — no "Checking session",
    // "Loading…", or similar technical text appears.
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Checking session/i);
    expect(body).not.toMatch(/Loading…/i);
    expect(body).not.toMatch(/جارٍ التحميل/i);
  });

  it('redirects to /dashboard if a valid session already exists', async () => {
    mockGetSession.mockResolvedValue({
      ok: true,
      data: {
        user: {
          id: 'u1',
          email: 'a@b.c',
          displayName: 'A',
          status: 'active',
        },
        memberships: [],
        activeTenantContext: null,
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await act(async () => {
      renderLogin();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('leaves the login form available when no valid session exists', async () => {
    mockGetSession.mockResolvedValue({
      ok: false,
      error: { statusCode: 401, category: 'HTTP_ERROR', message: 'Unauthorized' },
    });

    await act(async () => {
      renderLogin();
    });

    await waitFor(() => {
      expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
    });
    // No error message is displayed for the silent session failure.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('displays an inline loading label on submit (not technical loading text)', async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: unknown) => void;
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الدخول' }),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'test@example.invalid',
    );
    await user.type(
      screen.getByLabelText('كلمة المرور'),
      'sufficiently-long-password',
    );
    await user.click(
      screen.getByRole('button', { name: 'تسجيل الدخول' }),
    );

    await waitFor(() => {
      expect(screen.getByText('جارٍ تسجيل الدخول…')).toBeInTheDocument();
    });

    await act(async () => {
      resolveLogin({ ok: true, data: {} });
    });
  });

  it('displays a generic failure message on 401 without infrastructure details', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      ok: false,
      error: { statusCode: 401, category: 'HTTP_ERROR', message: 'Unauthorized' },
    });

    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الدخول' }),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'test@example.invalid',
    );
    await user.type(
      screen.getByLabelText('كلمة المرور'),
      'sufficiently-long-password',
    );
    await user.click(
      screen.getByRole('button', { name: 'تسجيل الدخول' }),
    );

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain(
        'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      );
    });

    // No raw API details are exposed.
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Unauthorized/i);
    expect(body).not.toMatch(/401/i);
    expect(body).not.toMatch(/HTTP_ERROR/i);
  });

  it('displays a generic network failure message without infrastructure details', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      ok: false,
      error: {
        category: 'NETWORK_ERROR',
        message: 'Failed to fetch: ECONNREFUSED 127.0.0.1:3001',
      },
    });

    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الدخول' }),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'test@example.invalid',
    );
    await user.type(
      screen.getByLabelText('كلمة المرور'),
      'sufficiently-long-password',
    );
    await user.click(
      screen.getByRole('button', { name: 'تسجيل الدخول' }),
    );

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('تعذّر الوصول إلى الخادم');
    });

    // No raw network details are exposed.
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/ECONNREFUSED/i);
    expect(body).not.toMatch(/Failed to fetch/i);
    expect(body).not.toMatch(/NETWORK_ERROR/i);
    expect(body).not.toMatch(/127\.0\.0\.1/i);
  });

  it('redirects to /dashboard on successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      ok: true,
      data: {
        user: {
          id: 'u1',
          email: 'a@b.c',
          displayName: 'A',
          status: 'active',
        },
        memberships: [],
        activeTenantContext: null,
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الدخول' }),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'test@example.invalid',
    );
    await user.type(
      screen.getByLabelText('كلمة المرور'),
      'sufficiently-long-password',
    );
    await user.click(
      screen.getByRole('button', { name: 'تسجيل الدخول' }),
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('does not write auth-related values to localStorage, sessionStorage, or readable cookies', async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const cookieSpy = vi.spyOn(document, 'cookie', 'set');

    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الدخول' }),
      ).toBeInTheDocument();
    });

    const authKeyPattern = /session|token|csrf|password|auth|credential/i;
    const authLocal = localStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && authKeyPattern.test(key),
    );
    expect(authLocal).toHaveLength(0);
    const authSession = sessionStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && authKeyPattern.test(key),
    );
    expect(authSession).toHaveLength(0);
    // Cookies are not written by the client.
    expect(cookieSpy).not.toHaveBeenCalled();
  });

  it('does not include credentials in URL parameters', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({
      ok: true,
      data: {
        user: {
          id: 'u1',
          email: 'a@b.c',
          displayName: 'A',
          status: 'active',
        },
        memberships: [],
        activeTenantContext: null,
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الدخول' }),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'secret-email@example.invalid',
    );
    await user.type(
      screen.getByLabelText('كلمة المرور'),
      'this-is-a-secret-password',
    );
    await user.click(
      screen.getByRole('button', { name: 'تسجيل الدخول' }),
    );

    // The URL never contains the email or password.
    expect(window.location.search).not.toContain('secret-email');
    expect(window.location.search).not.toContain('secret-password');
    expect(window.location.hash).not.toContain('secret-email');
    expect(window.location.hash).not.toContain('secret-password');
  });

  it('does not render a password-reset link or a registration link', async () => {
    await act(async () => {
      renderLogin();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الدخول' }),
      ).toBeInTheDocument();
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/forgot password/i);
    expect(body).not.toMatch(/reset password/i);
    expect(body).not.toMatch(/create account/i);
    expect(body).not.toMatch(/sign up/i);
    expect(body).not.toMatch(/register/i);
    // No social login buttons.
    expect(body).not.toMatch(/google/i);
    expect(body).not.toMatch(/microsoft/i);
    expect(body).not.toMatch(/github/i);
    expect(body).not.toMatch(/continue with/i);
  });
});
