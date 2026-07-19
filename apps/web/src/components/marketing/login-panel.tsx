'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, getSession } from '@/lib/api/auth/auth.client';
import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { StatusMessage } from '@/components/ui/status-message';

/**
 * Premium login panel — integrated into the landing hero.
 *
 * Preserves the existing secure login implementation:
 * - email + password fields with correct autocomplete attributes;
 * - POST to `/api/v1/auth/login` with `credentials: 'include'`;
 * - on success, redirect to `/dashboard`;
 * - on failure, a generic user-facing message (no raw API errors);
 * - no credentials in URL parameters;
 * - no password logging;
 * - no browser storage (localStorage, sessionStorage, IndexedDB, or
 *   readable cookie);
 * - existing HttpOnly cookie behaviour preserved;
 * - existing Origin protection preserved;
 * - existing throttling preserved.
 *
 * Critical UX corrections per the sixth canonical batch:
 * - The form renders IMMEDIATELY. No "Checking API status", no
 *   "Checking session", no "Connecting to server", no "Verifying
 *   API", no technical health status, no infrastructure error
 *   details.
 * - A silent session check runs in the background. The form remains
 *   visible and enabled. If a valid session exists, the user is
 *   redirected to `/dashboard`. If no session exists, the form
 *   remains available without a visible error.
 * - The loading state shows a refined inline label: "Signing in…"
 *   (English) or "جارٍ تسجيل الدخول…" (Arabic).
 * - Failures show only a generic user-facing message. Raw API errors
 *   are never exposed.
 *
 * Accessibility:
 * - The form is a native `<form>` with a `<button type="submit">`,
 *   so keyboard submission works (Enter submits).
 * - Each input has an associated `<label>` (via `htmlFor`).
 * - Each input has an `aria-describedby` pointing to its help text.
 * - The error message uses `role="alert"` and `aria-live="polite"`.
 * - Focus is moved to the email input after the silent session
 *   check completes (when no session exists).
 */

type LoginError = 'invalid' | 'network' | 'generic' | null;

export function LoginPanel() {
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const copy = getCopy(lang);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  /*
   * Silent session check.
   *
   * The form is rendered immediately — the user can see and interact
   * with it from the first paint. While the user is reading the form,
   * a single GET to `/api/v1/auth/session` runs in the background.
   *
   * - If a valid session exists, the user is redirected to
   *   `/dashboard` without seeing any technical loading text.
   * - If no session exists (the common case), the form remains
   *   visible and enabled. The user does not see an error.
   *
   * The check does NOT display "Checking session", "Loading…", or
   * any similar technical loading language.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getSession();
      if (cancelled) return;
      if (result.ok) {
        router.replace('/dashboard');
        return;
      }
      // No session — the form remains available. Focus the email
      // input so keyboard users can start typing immediately.
      emailInputRef.current?.focus();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    const result = await login({ email, password });

    if (result.ok) {
      router.replace('/dashboard');
      return;
    }

    // Map the typed error to a generic user-facing message.
    // The API returns 401 for all credential failures (unknown email,
    // wrong password, disabled user, no active membership) — all
    // produce the same generic message.
    if (result.error.statusCode === 401) {
      setError('invalid');
    } else if (result.error.category === 'NETWORK_ERROR') {
      setError('network');
    } else {
      setError('generic');
    }
    setLoading(false);
  }

  const errorMessage =
    error === 'invalid'
      ? copy.errorInvalid
      : error === 'network'
        ? copy.errorNetwork
        : error === 'generic'
          ? copy.errorGeneric
          : null;

  return (
    <div className="ih-login" dir={dir}>
      <div className="ih-login__header">
        <h2 className="ih-login__title">{copy.loginTitle}</h2>
        <p className="ih-login__body">{copy.loginBody}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="ih-login__form"
        aria-label={copy.loginTitle}
        noValidate
      >
        <Field
          inputId="ih-login-email"
          label={copy.emailLabel}
          helpId="ih-login-email-help"
          help={copy.emailHelp}
          errorId="ih-login-email-error"
        >
          <Input
            ref={emailInputRef}
            id="ih-login-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={320}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            aria-describedby="ih-login-email-help"
            invalid={error === 'invalid'}
          />
        </Field>

        <Field
          inputId="ih-login-password"
          label={copy.passwordLabel}
          helpId="ih-login-password-help"
          help={copy.passwordHelp}
        >
          <Input
            id="ih-login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            aria-describedby="ih-login-password-help"
            invalid={error === 'invalid'}
          />
        </Field>

        {errorMessage !== null && (
          <StatusMessage variant="error">{errorMessage}</StatusMessage>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="ih-login__submit"
        >
          {loading ? copy.submitting : copy.submit}
        </Button>

        <p className="ih-login__note">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            aria-hidden="true"
            focusable="false"
            role="presentation"
            className="ih-login__note-icon"
          >
            <path
              d="M 6 1.2 L 9.8 2.7 L 9.8 6 Q 9.8 9 6 10.8 Q 2.2 9 2.2 6 L 2.2 2.7 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M 4.5 6 L 5.5 7 L 7.8 4.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{copy.loginSecurityNote}</span>
        </p>
      </form>
    </div>
  );
}
