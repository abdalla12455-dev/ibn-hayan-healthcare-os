'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, getCsrfToken, logout } from '@/lib/api/auth/auth.client';
import type { SessionResponse } from '@ibn-hayan/contracts';

/**
 * Authenticated dashboard shell.
 *
 * Displays:
 * - user display name;
 * - user email;
 * - active tenant memberships;
 * - session expiry;
 * - logout button.
 *
 * Checks the session through the API after page load. Redirects
 * unauthenticated users to `/login`. The API authorization remains
 * authoritative; client-side redirect is not the security boundary.
 *
 * Fetches a CSRF token before logout. Logout revokes the server
 * session and clears the cookie.
 *
 * No tenant-selection controls. No organisation/facility selection.
 * No patient or business data. Exactly one H1 per page. Bilingual
 * and accessible. No polling. No browser storage.
 */
export default function DashboardPage() {
  const router = useRouter();
  const sessionLoadedRef = useRef(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
