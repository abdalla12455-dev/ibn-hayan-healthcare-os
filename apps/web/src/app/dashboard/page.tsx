'use client';

import { useState, useEffect, useRef, type FormEvent, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSession,
  getCsrfToken,
  logout,
} from '@/lib/api/auth/auth.client';
import {
  getContext,
  selectTenantContext,
  clearTenantContext,
} from '@/lib/api/context';
import type {
  SessionResponse,
  ContextResponse,
  TenantContextOption,
} from '@ibn-hayan/contracts';

/**
 * Authenticated dashboard shell.
 *
 * Displays:
 * - user display name;
 * - user email;
 * - active tenant memberships;
 * - session expiry;
 * - the bilingual Tenant-context selector (fifth canonical batch);
 * - logout button.
 *
 * Checks the session through the API after page load. Redirects
 * unauthenticated users to `/login`. The API authorization remains
 * authoritative; client-side redirect is not the security boundary.
 *
 * Per the fifth canonical batch specification:
 * - The Tenant selector loads the available active Tenant options
 *   and the currently active context after page mount.
 * - Selecting a Tenant obtains a fresh CSRF token first, then calls
 *   the context API with `membershipId` (not Tenant ID).
 * - Clearing context obtains a fresh CSRF token first.
 * - Selecting or clearing updates the page without a full reload.
 * - If no active context exists, the page clearly states that a
 *   Tenant must be selected before future operational work.
 * - The CSRF token is held in component memory only; it is never
 *   persisted to browser storage.
 * - No Organisation or Facility controls.
 * - No patient or business data.
 * - Exactly one H1 remains.
 * - Correct LTR and RTL sections.
 * - Keyboard-accessible controls.
 * - No polling.
 * - No browser storage.
 * - Logout behaviour remains unchanged.
 */
export default function DashboardPage() {
  const router = useRouter();
  const sessionLoadedRef = useRef(false);
  const contextLoadedRef = useRef(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const result = await getSession();
      if (cancelled) return;
      if (result.ok) {
        setSession(result.data);
        setLoading(false);
      } else {
        // Session is missing, expired, or revoked — redirect to login.
        router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Load the context after the session is loaded.
  useEffect(() => {
    if (contextLoadedRef.current) return;
    if (session === null) return;
    contextLoadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const result = await getContext();
      if (cancelled) return;
      if (result.ok) {
        setContext(result.data);
        // If there is an active context, pre-select it in the
        // selector.
        if (result.data.active !== null) {
          setSelectedMembershipId(result.data.active.membershipId);
        } else if (result.data.options.length > 0) {
          // Default to the first option so the user can select
          // quickly.
          setSelectedMembershipId(result.data.options[0]!.membershipId);
        }
      } else {
        // Context loading failed. Show a generic error; the user
        // can still see their session info and log out.
        setContextError(
          'Unable to load tenant context. / تعذر تحميل سياق المستأجر.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleLogout(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loggingOut) return;

    setError(null);
    setLoggingOut(true);

    // Fetch a CSRF token before logout.
    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setError('Unable to fetch CSRF token. / تعذر جلب رمز CSRF.');
      setLoggingOut(false);
      return;
    }

    // Call logout with the CSRF token.
    const logoutResult = await logout(csrfResult.data.token);
    if (!logoutResult.ok) {
      setError('Logout failed. / فشل تسجيل الخروج.');
      setLoggingOut(false);
      return;
    }

    // Redirect to the login page.
    router.replace('/login');
  }

  async function handleSelectContext(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (selecting) return;
    if (selectedMembershipId.length === 0) return;

    setContextError(null);
    setSelecting(true);

    // Obtain a fresh CSRF token immediately before the PUT.
    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setContextError(
        'Unable to fetch CSRF token. / تعذر جلب رمز CSRF.',
      );
      setSelecting(false);
      return;
    }

    // Call the context API with the membershipId.
    const result = await selectTenantContext(
      selectedMembershipId,
      csrfResult.data.token,
    );
    if (!result.ok) {
      setContextError(
        'Unable to select tenant context. / تعذر اختيار سياق المستأجر.',
      );
      setSelecting(false);
      return;
    }

    // Update the page without a full reload.
    setContext(result.data);
    if (result.data.active !== null) {
      setSelectedMembershipId(result.data.active.membershipId);
    }
    setSelecting(false);
  }

  async function handleClearContext(): Promise<void> {
    if (clearing) return;

    setContextError(null);
    setClearing(true);

    // Obtain a fresh CSRF token immediately before the DELETE.
    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setContextError(
        'Unable to fetch CSRF token. / تعذر جلب رمز CSRF.',
      );
      setClearing(false);
      return;
    }

    const result = await clearTenantContext(csrfResult.data.token);
    if (!result.ok) {
      setContextError(
        'Unable to clear tenant context. / تعذر مسح سياق المستأجر.',
      );
      setClearing(false);
      return;
    }

    // Update the page without a full reload. Re-load the context
    // to get the current options + null active.
    const reloaded = await getContext();
    if (reloaded.ok) {
      setContext(reloaded.data);
      if (
        reloaded.data.active === null &&
        reloaded.data.options.length > 0
      ) {
        setSelectedMembershipId(reloaded.data.options[0]!.membershipId);
      }
    } else {
      // Fallback: synthesize a cleared context locally.
      setContext((prev) =>
        prev === null ? prev : { options: prev.options, active: null },
      );
    }
    setClearing(false);
  }

  if (loading || session === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center w-full px-5 py-10">
        <p aria-live="polite">Loading… / جارٍ التحميل…</p>
      </main>
    );
  }

  const expiresAt = new Date(session.expiresAt);
  const expiresAtFormatted = expiresAt.toLocaleString();

  return (
    <main className="flex flex-1 flex-col w-full">
      <div className="mx-auto w-full" style={{ maxWidth: 'var(--page-max-width)' }}>
        <div className="flex flex-col gap-6 px-5 py-10 sm:px-8 sm:py-12">
          <h1 className="flex flex-col gap-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <span lang="en" dir="ltr">
              Dashboard
            </span>
            <span lang="ar" dir="rtl" className="text-2xl sm:text-3xl">
              لوحة التحكم
            </span>
          </h1>

          <section
            className="flex flex-col gap-4 rounded-lg p-5"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--surface-border)',
            }}
            aria-labelledby="user-info-title"
          >
            <h2
              id="user-info-title"
              className="text-xl font-semibold"
              lang="en"
              dir="ltr"
            >
              User
            </h2>
            <dl className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                  <span lang="en" dir="ltr">Display name</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">الاسم المعروض</span>
                </dt>
                <dd className="text-base">{session.user.displayName}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                  <span lang="en" dir="ltr">Email</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">البريد الإلكتروني</span>
                </dt>
                <dd className="text-base">{session.user.email}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                  <span lang="en" dir="ltr">Session expires</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">تنتهي الجلسة</span>
                </dt>
                <dd className="text-base">{expiresAtFormatted}</dd>
              </div>
            </dl>
          </section>

          <section
            className="flex flex-col gap-4 rounded-lg p-5"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--surface-border)',
            }}
            aria-labelledby="memberships-title"
          >
            <h2
              id="memberships-title"
              className="text-xl font-semibold"
              lang="en"
              dir="ltr"
            >
              Tenant memberships
            </h2>
            {session.memberships.length === 0 ? (
              <p className="text-base" style={{ color: 'var(--foreground-muted)' }}>
                <span lang="en" dir="ltr">No active memberships.</span>{' '}
                <span lang="ar" dir="rtl">لا توجد عضويات نشطة.</span>
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {session.memberships.map((membership) => (
                  <li
                    key={membership.id}
                    className="flex flex-col gap-1 rounded-md p-3"
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--surface-border)',
                    }}
                  >
                    <span className="text-base font-medium">
                      {membership.tenantDisplayName}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      {membership.tenantSlug}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      <span lang="en" dir="ltr">Status: {membership.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <TenantContextSection
            context={context}
            selectedMembershipId={selectedMembershipId}
            onSelectMembership={setSelectedMembershipId}
            onSelect={handleSelectContext}
            onClear={handleClearContext}
            selecting={selecting}
            clearing={clearing}
            error={contextError}
          />

          <form onSubmit={handleLogout} className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loggingOut}
              className="rounded-md px-4 py-2 text-base font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loggingOut ? (
                <span aria-live="polite">
                  <span lang="en" dir="ltr">Signing out…</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">جارٍ تسجيل الخروج…</span>
                </span>
              ) : (
                <>
                  <span lang="en" dir="ltr">Sign out</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">تسجيل الخروج</span>
                </>
              )}
            </button>
            {error !== null && (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--status-error-muted, rgba(220, 38, 38, 0.1))',
                  color: 'var(--status-error, #dc2626)',
                }}
              >
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

/**
 * Bilingual Tenant-context section.
 *
 * Displays:
 * - the available active Tenant options (radio-group semantics);
 * - the current active Tenant (or a "no context" message);
 * - a select/change button;
 * - a clear-selection button when a context is active.
 *
 * The selector uses radio inputs so the user can pick one option.
 * The "Select" button submits the form, which calls
 * `handleSelectContext` to obtain a CSRF token and PUT the
 * selection.
 *
 * The "Clear" button calls `handleClearContext` to obtain a CSRF
 * token and DELETE the active context.
 *
 * Per the fifth canonical batch specification, if no active context
 * exists, the page clearly states that a Tenant must be selected
 * before future operational work.
 */
interface TenantContextSectionProps {
  readonly context: ContextResponse | null;
  readonly selectedMembershipId: string;
  readonly onSelectMembership: (id: string) => void;
  readonly onSelect: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly onClear: () => Promise<void>;
  readonly selecting: boolean;
  readonly clearing: boolean;
  readonly error: string | null;
}

function TenantContextSection({
  context,
  selectedMembershipId,
  onSelectMembership,
  onSelect,
  onClear,
  selecting,
  clearing,
  error,
}: TenantContextSectionProps): ReactElement {
  const options: readonly TenantContextOption[] = context?.options ?? [];
  const active = context?.active ?? null;

  return (
    <section
      className="flex flex-col gap-4 rounded-lg p-5"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--surface-border)',
      }}
      aria-labelledby="context-title"
    >
      <h2
        id="context-title"
        className="text-xl font-semibold"
        lang="en"
        dir="ltr"
      >
        Active tenant context
      </h2>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
          <span lang="en" dir="ltr">Current</span>{' '}
          /{' '}
          <span lang="ar" dir="rtl">الحالي</span>
        </p>
        {active === null ? (
          <p className="text-base">
            <span lang="en" dir="ltr">
              No tenant selected. Select a tenant before continuing.
            </span>{' '}
            <span lang="ar" dir="rtl">
              لم يتم اختيار مستأجر. اختر مستأجرًا قبل المتابعة.
            </span>
          </p>
        ) : (
          <p className="text-base font-medium">
            {active.tenantDisplayName}
            <span
              className="text-sm font-normal"
              style={{ color: 'var(--foreground-muted)' }}
            >
              {' '}
              ({active.tenantSlug})
            </span>
          </p>
        )}
      </div>

      {options.length === 0 ? (
        <p className="text-base" style={{ color: 'var(--foreground-muted)' }}>
          <span lang="en" dir="ltr">
            No active tenant memberships available.
          </span>{' '}
          <span lang="ar" dir="rtl">
            لا توجد عضويات مستأجر نشطة متاحة.
          </span>
        </p>
      ) : (
        <form onSubmit={onSelect} className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
              <span lang="en" dir="ltr">Select a tenant</span>{' '}
              /{' '}
              <span lang="ar" dir="rtl">اختر مستأجرًا</span>
            </legend>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tenant">
              {options.map((option) => (
                <label
                  key={option.membershipId}
                  className="flex items-center gap-3 rounded-md p-3 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--background)',
                    border:
                      selectedMembershipId === option.membershipId
                        ? '2px solid var(--accent)'
                        : '1px solid var(--surface-border)',
                  }}
                >
                  <input
                    type="radio"
                    name="tenant-membership"
                    value={option.membershipId}
                    checked={selectedMembershipId === option.membershipId}
                    onChange={() => onSelectMembership(option.membershipId)}
                    className="h-4 w-4"
                  />
                  <span className="flex flex-col">
                    <span className="text-base font-medium">
                      {option.tenantDisplayName}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: 'var(--foreground-muted)' }}
                    >
                      {option.tenantSlug}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={selecting || selectedMembershipId.length === 0}
              className="rounded-md px-4 py-2 text-base font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {selecting ? (
                <span aria-live="polite">
                  <span lang="en" dir="ltr">Selecting…</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">جارٍ الاختيار…</span>
                </span>
              ) : (
                <>
                  <span lang="en" dir="ltr">Select / Change</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">اختيار / تغيير</span>
                </>
              )}
            </button>
            {active !== null && (
              <button
                type="button"
                onClick={onClear}
                disabled={clearing}
                className="rounded-md px-4 py-2 text-base font-medium disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--surface-border)',
                }}
              >
                {clearing ? (
                  <span aria-live="polite">
                    <span lang="en" dir="ltr">Clearing…</span>{' '}
                    /{' '}
                    <span lang="ar" dir="rtl">جارٍ المسح…</span>
                  </span>
                ) : (
                  <>
                    <span lang="en" dir="ltr">Clear selection</span>{' '}
                    /{' '}
                    <span lang="ar" dir="rtl">مسح الاختيار</span>
                  </>
                )}
              </button>
            )}
          </div>

          {error !== null && (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor:
                  'var(--status-error-muted, rgba(220, 38, 38, 0.1))',
                color: 'var(--status-error, #dc2626)',
              }}
            >
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
