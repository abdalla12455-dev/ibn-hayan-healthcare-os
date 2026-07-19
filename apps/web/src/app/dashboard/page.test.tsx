import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './page';
import { LanguageProvider } from '@/components/i18n/language-context';

/**
 * Tests for the premium authenticated dashboard shell (sixth canonical batch).
 *
 * Verifies scenarios:
 * 17. Dashboard uses the same visual tokens as the landing page.
 * 18. Tenant selection and clearing still work.
 * 19. Logout still works.
 * 20. No localStorage, sessionStorage, IndexedDB, or readable auth cookie
 *     is used.
 *
 * Also preserves the existing authentication and Tenant-context
 * behaviour from the fourth and fifth canonical batches:
 * - Dashboard displays the authenticated user.
 * - Dashboard displays available workspace options.
 * - Dashboard displays the active workspace.
 * - Dashboard handles no active context.
 * - Selecting a workspace obtains a CSRF token first.
 * - Selecting calls the context API with `membershipId`, not Tenant ID.
 * - Clearing obtains a CSRF token first.
 * - Context updates without a full page reload.
 * - Generic failure is displayed without infrastructure details.
 * - No Organisation or Facility selector exists.
 * - Unauthenticated dashboard redirects to /login.
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

function renderDashboard() {
  return render(
    <LanguageProvider>
      <DashboardPage />
    </LanguageProvider>,
  );
}

describe('DashboardPage', () => {
  it('renders exactly one H1', async () => {
    mockGetSession.mockResolvedValue(validSession);
    await act(async () => {
      renderDashboard();
    });
    await waitFor(() => {
      const h1s = document.querySelectorAll('h1');
      expect(h1s.length).toBe(1);
    });
  });

  it('displays the authenticated user info', async () => {
    mockGetSession.mockResolvedValue(validSession);
    await act(async () => {
      renderDashboard();
    });
    await waitFor(() => {
      expect(screen.getByText('Operator Alpha')).toBeInTheDocument();
      expect(screen.getByText('operator@example.invalid')).toBeInTheDocument();
    });
  });

  it('displays the available workspaces (memberships)', async () => {
    mockGetSession.mockResolvedValue(validSession);
    await act(async () => {
      renderDashboard();
    });
    await waitFor(() => {
      // The memberships are rendered as "Available workspaces" in English
      // or "بيئات العمل المتاحة" in Arabic (default).
      const membershipHeading = screen.getByText('بيئات العمل المتاحة');
      expect(membershipHeading).toBeInTheDocument();
      const accountSection = membershipHeading.closest('section');
      expect(accountSection?.textContent).toContain('tenant-alpha.invalid');
      expect(accountSection?.textContent).toContain('tenant-beta.invalid');
    });
  });

  it('redirects to /login when unauthenticated', async () => {
    mockGetSession.mockResolvedValue({
      ok: false,
      error: { statusCode: 401, category: 'HTTP_ERROR', message: 'Unauthorized' },
    });

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('does not write auth-related values to localStorage, sessionStorage, or cookies', async () => {
    mockGetSession.mockResolvedValue(validSession);
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const cookieSpy = vi.spyOn(document, 'cookie', 'set');

    await act(async () => {
      renderDashboard();
    });
    await waitFor(() => {
      expect(screen.getByText('Operator Alpha')).toBeInTheDocument();
    });

    const authKeyPattern = /session|token|csrf|password|auth|credential|context/i;
    const authLocal = localStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && authKeyPattern.test(key),
    );
    expect(authLocal).toHaveLength(0);
    const authSession = sessionStorageSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && authKeyPattern.test(key),
    );
    expect(authSession).toHaveLength(0);
    expect(cookieSpy).not.toHaveBeenCalled();
  });

  it('logout obtains a CSRF token and calls logout, then redirects', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockLogout.mockResolvedValue({ ok: true, data: { ok: true } });

    const user = userEvent.setup();
    await act(async () => {
      renderDashboard();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'تسجيل الخروج' }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: 'تسجيل الخروج' }),
    );

    await waitFor(() => {
      expect(mockGetCsrfToken).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalledWith('csrf-token-value');
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('renders available workspace options in the context section', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      // The workspace card title is rendered in Arabic by default.
      const workspaceHeading = screen.getByText('بيئة العمل النشطة');
      expect(workspaceHeading).toBeInTheDocument();
      const workspaceSection = workspaceHeading.closest('section');
      expect(workspaceSection?.textContent).toContain('Tenant Alpha');
      expect(workspaceSection?.textContent).toContain('Tenant Beta');
    });
  });

  it('displays the active workspace when a context is selected', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithActiveA);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      // The active workspace is shown in the "Current" area.
      const workspaceSection = screen
        .getByText('بيئة العمل النشطة')
        .closest('section');
      expect(workspaceSection?.textContent).toContain('Tenant Alpha');
    });
  });

  it('handles no active context with a user-facing empty-state message', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(screen.getByText('لم يتم اختيار بيئة عمل')).toBeInTheDocument();
    });
  });

  it('selecting a workspace obtains CSRF first and calls the context API with membershipId', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValueOnce(contextWithNoActive);
    mockSelectTenantContext.mockResolvedValue(contextWithActiveA);

    const user = userEvent.setup();
    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /اختيار|Select/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: /اختيار|Select/i }),
    );

    await waitFor(() => {
      expect(mockGetCsrfToken).toHaveBeenCalled();
      expect(mockSelectTenantContext).toHaveBeenCalledWith(
        MEMBERSHIP_ID_A,
        'csrf-token-value',
      );
    });
  });

  it('clearing obtains CSRF first and calls clearTenantContext', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext
      .mockResolvedValueOnce(contextWithActiveA)
      .mockResolvedValueOnce(contextWithNoActive);
    mockClearTenantContext.mockResolvedValue({
      ok: true,
      data: { ok: true, active: null },
    });

    const user = userEvent.setup();
    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /مسح الاختيار|Clear selection/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: /مسح الاختيار|Clear selection/i }),
    );

    await waitFor(() => {
      expect(mockGetCsrfToken).toHaveBeenCalled();
      expect(mockClearTenantContext).toHaveBeenCalledWith('csrf-token-value');
    });
  });

  it('updates the workspace section without a full page reload after selection', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValueOnce(contextWithNoActive);
    mockSelectTenantContext.mockResolvedValue(contextWithActiveA);

    const user = userEvent.setup();
    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(screen.getByText('لم يتم اختيار بيئة عمل')).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: /اختيار|Select/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText('لم يتم اختيار بيئة عمل')).toBeNull();
    });
  });

  it('displays a generic failure message without infrastructure details when selection fails', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValueOnce(contextWithNoActive);
    mockSelectTenantContext.mockResolvedValue({
      ok: false,
      error: {
        statusCode: 403,
        category: 'HTTP_ERROR',
        message: 'Forbidden: membership does not belong to user',
      },
    });

    const user = userEvent.setup();
    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /اختيار|Select/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: /اختيار|Select/i }),
    );

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('تعذّر تحديث بيئة العمل');
    });

    // No raw infrastructure details are exposed.
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Forbidden/i);
    expect(body).not.toMatch(/membership does not belong/i);
    expect(body).not.toMatch(/403/i);
    expect(body).not.toMatch(/HTTP_ERROR/i);
  });

  it('does not render an Organisation or Facility selector', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(screen.getByText('بيئة العمل النشطة')).toBeInTheDocument();
    });

    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Organisation context/i);
    expect(body).not.toMatch(/Facility context/i);
    expect(body).not.toMatch(/Select an organisation/i);
    expect(body).not.toMatch(/Select a facility/i);
  });

  it('does not render inactive navigation links for future modules', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(screen.getByText('بيئة العمل النشطة')).toBeInTheDocument();
    });

    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Patients/i);
    expect(body).not.toMatch(/Appointments/i);
    expect(body).not.toMatch(/Billing/i);
    expect(body).not.toMatch(/Pharmacy/i);
    expect(body).not.toMatch(/Inventory/i);
    expect(body).not.toMatch(/Laboratory/i);
    expect(body).not.toMatch(/Insurance/i);
    expect(body).not.toMatch(/المرضى/i);
    expect(body).not.toMatch(/المواعيد/i);
    expect(body).not.toMatch(/الفواتير/i);
  });

  it('does not display raw technical IDs in the user-facing surface', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithActiveA);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(screen.getByText('بيئة العمل النشطة')).toBeInTheDocument();
    });

    const body = document.body.textContent ?? '';
    // The raw membership ID, tenant ID, and session ID must not appear
    // in the user-facing surface. UUIDs are long and distinctive; we
    // check that none of the test UUIDs leak.
    expect(body).not.toContain(MEMBERSHIP_ID_A);
    expect(body).not.toContain(MEMBERSHIP_ID_B);
    expect(body).not.toContain(TENANT_ID_A);
    expect(body).not.toContain(TENANT_ID_B);
    expect(body).not.toContain('12345678-1234-1234-1234-123456789012');
    // "Membership ID" and "Tenant ID" labels must not appear.
    expect(body).not.toMatch(/Membership ID/i);
    expect(body).not.toMatch(/Tenant ID/i);
    expect(body).not.toMatch(/Active context ID/i);
    expect(body).not.toMatch(/Session expires at/i);
    expect(body).not.toMatch(/API response/i);
  });

  it('uses the same visual tokens as the landing page (project-owned CSS classes)', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      expect(screen.getByText('بيئة العمل النشطة')).toBeInTheDocument();
    });

    // The dashboard root uses the project-owned `ih-app` class which
    // consumes the same design tokens defined in globals.css as the
    // landing page.
    const appRoot = document.querySelector('.ih-app');
    expect(appRoot).not.toBeNull();
    // The cards use the project-owned `ih-card` class.
    const cards = document.querySelectorAll('.ih-card');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    // The header is sticky and uses the project-owned class.
    const header = document.querySelector('.ih-app__header');
    expect(header).not.toBeNull();
    // The brand mark is rendered in the header.
    const brandMark = header?.querySelector('.ih-brand');
    expect(brandMark).not.toBeNull();
  });

  it('still has exactly one H1 with the workspace section present', async () => {
    mockGetSession.mockResolvedValue(validSession);
    mockGetContext.mockResolvedValue(contextWithNoActive);

    await act(async () => {
      renderDashboard();
    });

    await waitFor(() => {
      const h1s = document.querySelectorAll('h1');
      expect(h1s.length).toBe(1);
    });

    // The workspace section exists with an h2 heading.
    const h2s = document.querySelectorAll('h2');
    const h2Texts = Array.from(h2s).map((h) => h.textContent ?? '');
    expect(h2Texts.some((t) => t.includes('بيئة العمل النشطة'))).toBe(true);
  });
});
