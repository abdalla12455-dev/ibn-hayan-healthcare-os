import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingPage from './page';
import { LanguageProvider } from '@/components/i18n/language-context';

/**
 * Tests for the premium landing + login experience (sixth canonical batch).
 *
 * These tests verify the 22 scenarios required by the specification
 * that are scoped to the public landing surface:
 *
 * 1.  Root page displays the premium clinic-facing hero.
 * 2.  Root page contains the login form directly (no second navigation step).
 * 4.  No public API-status text exists.
 * 5.  No implementation-foundation text exists.
 * 6.  No prototype or architecture references exist.
 * 7.  Arabic is the default.
 * 8.  Arabic layout is RTL.
 * 9.  English switch changes copy and direction.
 * 12. Silent session inspection does not display technical loading text.
 * 16. Exactly one H1 exists.
 * 21. No fake or unimplemented feature claims appear.
 * 22. Mobile layout contains the login form early in document order.
 *
 * The {@link LanguageProvider} is wrapped around the page in every test
 * so the bilingual context is available. The provider is normally
 * mounted at the root layout; in tests we mount it explicitly.
 *
 * `next/navigation` is mocked because the `LoginPanel` calls
 * `useRouter` for the silent-session redirect and the post-login
 * redirect. The mock must be in place before the page is rendered.
 *
 * `globalThis.fetch` is mocked with a never-resolving promise for tests
 * that exercise the silent session check, so the async state update
 * never fires and React does not warn about state updates outside
 * `act()`. The page content under test (hero heading, login form,
 * section copy) does not depend on the session check outcome.
 */

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockReplace }),
}));

const mockGetSession = vi.fn();
vi.mock('@/lib/api/auth/auth.client', () => ({
  login: vi.fn(),
  getSession: (...args: unknown[]) => mockGetSession(...args),
  getCsrfToken: vi.fn().mockResolvedValue({
    ok: true,
    data: { token: 'csrf-token' },
  }),
  logout: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing session. The form remains available.
  mockGetSession.mockResolvedValue({
    ok: false,
    error: { statusCode: 401, category: 'HTTP_ERROR', message: 'Unauthorized' },
  });
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockFetchPending() {
  globalThis.fetch = vi
    .fn()
    .mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
}

function renderLanding() {
  return render(
    <LanguageProvider>
      <LandingPage />
    </LanguageProvider>,
  );
}

describe('LandingPage', () => {
  it('displays the premium clinic-facing hero with the approved heading', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    // The Arabic hero heading is the default because Arabic is the
    // default language.
    expect(
      screen.getByText('نظام تشغيل موحّد للعيادات الحديثة'),
    ).toBeInTheDocument();
  });

  it('contains the login form directly in the hero (no second navigation step)', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    // The login form is rendered inside the hero, not behind a Sign in button.
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'تسجيل الدخول' }),
    ).toBeInTheDocument();
  });

  it('does not render any public API-status text', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/API Status/i);
    expect(body).not.toMatch(/Checking API status/i);
    expect(body).not.toMatch(/API operational/i);
    expect(body).not.toMatch(/API unavailable/i);
    expect(body).not.toMatch(/service version/i);
    expect(body).not.toMatch(/backend connection/i);
  });

  it('does not render implementation-foundation language', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Canonical implementation/i);
    expect(body).not.toMatch(/Implementation foundation operational/i);
    expect(body).not.toMatch(/first vertical slice/i);
    expect(body).not.toMatch(/التنفيذ المرجعي/i);
    expect(body).not.toMatch(/أساس التنفيذ/i);
  });

  it('does not render prototype or architecture references', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/MediFlow/i);
    expect(body).not.toMatch(/pnpm monorepo/i);
    expect(body).not.toMatch(/Next\.js thin web client/i);
    expect(body).not.toMatch(/NestJS backend/i);
    expect(body).not.toMatch(/shared-package structure/i);
    expect(body).not.toMatch(/prototype/i);
  });

  it('defaults to Arabic copy on first render', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    // The Arabic hero heading is present by default.
    expect(
      screen.getByText('نظام تشغيل موحّد للعيادات الحديثة'),
    ).toBeInTheDocument();
    // The Arabic login-card title is present by default.
    expect(
      screen.getByText('تسجيل الدخول إلى مساحة العمل'),
    ).toBeInTheDocument();
  });

  it('applies RTL direction for the default Arabic surface', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    // The hero section carries dir="rtl" because Arabic is the default.
    const hero = screen.getByText(
      'نظام تشغيل موحّد للعيادات الحديثة',
    ).closest('section');
    expect(hero).not.toBeNull();
    expect(hero?.getAttribute('dir')).toBe('rtl');
  });

  it('switches to English copy and LTR direction when the language switch is activated', async () => {
    mockFetchPending();
    const user = userEvent.setup();
    await act(async () => {
      renderLanding();
    });

    // The language switch button reads "English" while Arabic is active.
    // Both the header and footer render a language switch; we scope
    // the click to the header's switch.
    const header = document.querySelector('header');
    expect(header).not.toBeNull();
    const switchButtons = header?.querySelectorAll('button');
    const switchButton = Array.from(switchButtons ?? []).find(
      (b) => /English/i.test(b.textContent ?? ''),
    );
    expect(switchButton).toBeDefined();

    await user.click(switchButton!);

    // After the switch, the English hero heading is present.
    await waitFor(() => {
      expect(
        screen.getByText(
          'A unified operating system for modern healthcare organisations',
        ),
      ).toBeInTheDocument();
    });
    // The English login-card title is present.
    expect(
      screen.getByText('Sign in to your workspace'),
    ).toBeInTheDocument();

    // The hero section now carries dir="ltr".
    const hero = screen
      .getByText(
        'A unified operating system for modern healthcare organisations',
      )
      .closest('section');
    expect(hero?.getAttribute('dir')).toBe('ltr');
  });

  it('does not display technical loading text during the silent session check', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Checking API status/i);
    expect(body).not.toMatch(/Checking session/i);
    expect(body).not.toMatch(/Connecting to server/i);
    expect(body).not.toMatch(/Verifying API/i);
    expect(body).not.toMatch(/Loading…/i);
    expect(body).not.toMatch(/جارٍ التحميل/i);
  });

  it('renders exactly one H1 (the hero title)', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    const h1s = document.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
  });

  it('does not make fake or unimplemented feature claims', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    const body = document.body.textContent ?? '';
    // Forbidden feature claims per the sixth canonical batch spec.
    expect(body).not.toMatch(/patient management/i);
    expect(body).not.toMatch(/appointments/i);
    expect(body).not.toMatch(/electronic medical records/i);
    expect(body).not.toMatch(/billing/i);
    expect(body).not.toMatch(/pharmacy/i);
    expect(body).not.toMatch(/inventory/i);
    expect(body).not.toMatch(/laboratory/i);
    expect(body).not.toMatch(/insurance/i);
    expect(body).not.toMatch(/HIPAA/i);
    expect(body).not.toMatch(/GDPR/i);
    expect(body).not.toMatch(/ISO certification/i);
    expect(body).not.toMatch(/government approval/i);
    expect(body).not.toMatch(/AI-powered/i);
    expect(body).not.toMatch(/24\/7 support/i);
    expect(body).not.toMatch(/uptime/i);
    // No fake testimonials, metrics, or customer counts.
    expect(body).not.toMatch(/trusted by \d+/i);
    expect(body).not.toMatch(/\d+ clinics/i);
    expect(body).not.toMatch(/\d+ organisations/i);
  });

  it('renders the login form early in document order on mobile-width viewports', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    // The login form is rendered as part of the hero, so it appears
    // before the marketing sections below. Verify the login email
    // input appears before the section-1 heading in DOM order.
    const emailInput = screen.getByLabelText('البريد الإلكتروني');
    const section1Heading = screen.getByText(
      'مصمّمة من أجل الوضوح التشغيلي',
    );
    const emailInputIndex = Array.prototype.indexOf.call(
      document.querySelectorAll('body *'),
      emailInput,
    );
    const section1Index = Array.prototype.indexOf.call(
      document.querySelectorAll('body *'),
      section1Heading,
    );
    expect(emailInputIndex).toBeGreaterThan(-1);
    expect(section1Index).toBeGreaterThan(-1);
    expect(emailInputIndex).toBeLessThan(section1Index);
  });

  it('renders the four value indicators', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    // The four Arabic value titles.
    expect(screen.getByText('وصول آمن')).toBeInTheDocument();
    expect(screen.getByText('بيئات عمل منفصلة')).toBeInTheDocument();
    expect(screen.getByText('تجربة ثنائية اللغة')).toBeInTheDocument();
    expect(screen.getByText('بنية جاهزة للنمو')).toBeInTheDocument();
  });

  it('renders the three public sections below the hero', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    expect(screen.getByText('مصمّمة من أجل الوضوح التشغيلي')).toBeInTheDocument();
    expect(screen.getByText('الأمان مبني في الأساس')).toBeInTheDocument();
    expect(screen.getByText('جاهزة للنمو مع المؤسسة')).toBeInTheDocument();
  });

  it('does not render a generic Sign-in navigation button in the header', async () => {
    mockFetchPending();
    await act(async () => {
      renderLanding();
    });
    // The header contains only the language switch button. There is
    // no separate "Sign in" navigation button because the login form
    // is integrated into the hero.
    const header = document.querySelector('header');
    expect(header).not.toBeNull();
    const headerButtons = header?.querySelectorAll('button') ?? [];
    // The only buttons in the header are language switches (there may
    // be one in the header and one in the footer).
    const headerButtonTexts = Array.from(headerButtons).map(
      (b) => b.textContent ?? '',
    );
    expect(headerButtonTexts).not.toContain('Sign in');
    expect(headerButtonTexts).not.toContain('تسجيل الدخول');
  });
});
