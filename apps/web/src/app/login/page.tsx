'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, getSession } from '@/lib/api/auth/auth.client';

/**
 * Bilingual login page.
 *
 * Accessible English/Arabic interface with correct LTR and RTL
 * sections. Email and password fields with labels. Password
 * autocomplete is `current-password`; email autocomplete is `email`.
 *
 * On successful login, redirects to `/dashboard`. If a valid session
 * already exists (checked on mount), redirects to `/dashboard`
 * immediately.
 *
 * Per ADR-013 §1.1, login errors must not reveal whether the account
 * exists. A generic invalid-credentials message is displayed for all
 * login failures.
 *
 * No credentials are placed in URL parameters. No password is logged.
 * The form is keyboard-accessible (native `<form>` with `<button
 * type="submit">`).
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Check if a valid session already exists. If so, redirect to the
  // dashboard immediately.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getSession();
      if (cancelled) return;
      if (result.ok) {
        router.replace('/dashboard');
        return;
      }
      setCheckingSession(false);
      // Focus the email input after the session check completes.
      emailInputRef.current?.focus();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    const result = await login({ email, password });

    if (result.ok) {
      router.replace('/dashboard');
      return;
    }

    // Display a generic invalid-credentials message for all failures.
    // The API returns 401 for unknown email, wrong password, disabled
    // user, and no active membership — all with the same response.
    // We do not distinguish between them here.
    if (result.error.statusCode === 401) {
      setError('Invalid email or password. / البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } else if (result.error.category === 'NETWORK_ERROR') {
      setError('Unable to connect to the server. / تعذر الاتصال بالخادم.');
    } else {
      setError('An error occurred. Please try again. / حدث خطأ. حاول مرة أخرى.');
    }
    setLoading(false);
  }

  if (checkingSession) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center w-full px-5 py-10">
        <p aria-live="polite">Loading… / جارٍ التحميل…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col w-full">
      <div className="mx-auto w-full" style={{ maxWidth: 'var(--page-max-width)' }}>
        <div className="flex flex-col gap-6 px-5 py-10 sm:px-8 sm:py-12">
          <h1 className="flex flex-col gap-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <span lang="en" dir="ltr">
              Sign in
            </span>
            <span lang="ar" dir="rtl" className="text-2xl sm:text-3xl">
              تسجيل الدخول
            </span>
          </h1>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-lg p-5"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--surface-border)',
            }}
            aria-label="Sign in form / نموذج تسجيل الدخول"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                <span lang="en" dir="ltr">
                  Email
                </span>{' '}
                /{' '}
                <span lang="ar" dir="rtl">
                  البريد الإلكتروني
                </span>
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="rounded-md border px-3 py-2 text-base"
                style={{
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--surface-border)',
                }}
                aria-describedby="email-help"
              />
              <p id="email-help" className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                <span lang="en" dir="ltr">Enter your email address.</span>{' '}
                <span lang="ar" dir="rtl">أدخل عنوان بريدك الإلكتروني.</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                <span lang="en" dir="ltr">
                  Password
                </span>{' '}
                /{' '}
                <span lang="ar" dir="rtl">
                  كلمة المرور
                </span>
              </label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="rounded-md border px-3 py-2 text-base"
                style={{
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  borderColor: 'var(--surface-border)',
                }}
                aria-describedby="password-help"
              />
              <p id="password-help" className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                <span lang="en" dir="ltr">At least 12 characters.</span>{' '}
                <span lang="ar" dir="rtl">على الأقل ١٢ حرفًا.</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md px-4 py-2 text-base font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? (
                <span aria-live="polite">
                  <span lang="en" dir="ltr">Signing in…</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">جارٍ تسجيل الدخول…</span>
                </span>
              ) : (
                <>
                  <span lang="en" dir="ltr">Sign in</span>{' '}
                  /{' '}
                  <span lang="ar" dir="rtl">تسجيل الدخول</span>
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
