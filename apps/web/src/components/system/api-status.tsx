'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchHealth } from '@/lib/api';

/**
 * Runtime API status indicator.
 *
 * A client component that fetches the Health endpoint once after the
 * component mounts in the browser. It displays three states:
 *
 * - `checking` — the request is in flight (initial state).
 * - `operational` — the API returned a valid health response.
 * - `unavailable` — the request failed for any reason (network error,
 *   HTTP error, invalid JSON, or contract-invalid response).
 *
 * Accessibility:
 * - Status changes are announced via `aria-live="polite"` so screen
 *   readers announce the new state without interrupting the user.
 * - A retry button appears only when the status is `unavailable`. The
 *   button is a native `<button>` element, so it is keyboard accessible
 *   by default (focusable, activated by Enter and Space).
 * - Raw error details (network error messages, HTTP status codes,
 *   response bodies, stack traces) are never displayed. The UI shows
 *   only the generic state label.
 *
 * Constraints:
 * - Does not continuously poll. The endpoint is fetched exactly once on
 *   mount, and again only when the user clicks the retry button.
 * - Does not display fake uptime, latency, statistics, or service
 *   metrics.
 * - Does not call the API during Next.js build-time static generation.
 *   The `useEffect` hook runs only in the browser.
 * - Honours reduced-motion preferences via the global CSS rule in
 *   `globals.css` (no component-specific animations are used).
 *
 * Bilingual labels: English and Arabic are both rendered inside the
 * status badge so the component is self-localising. The landing page's
 * single-H1 structure is not affected — this component uses no `<h1>`
 * elements.
 */

type ApiStatusState = 'checking' | 'operational' | 'unavailable';

const LABELS: Record<ApiStatusState, { en: string; ar: string }> = {
  checking: {
    en: 'Checking API status…',
    ar: 'جارٍ التحقق من حالة واجهة البرمجة…',
  },
  operational: {
    en: 'API operational',
    ar: 'واجهة البرمجة تعمل',
  },
  unavailable: {
    en: 'API unavailable',
    ar: 'واجهة البرمجة غير متاحة',
  },
};

const RETRY_LABEL = {
  en: 'Retry',
  ar: 'إعادة المحاولة',
};

export function ApiStatus() {
  const [status, setStatus] = useState<ApiStatusState>('checking');

  const check = useCallback(async () => {
    const result = await fetchHealth();
    if (result.ok) {
      setStatus('operational');
    } else {
      setStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runCheck() {
      const result = await fetchHealth();
      if (!cancelled) {
        if (result.ok) {
          setStatus('operational');
        } else {
          setStatus('unavailable');
        }
      }
    }

    void runCheck();

    return () => {
      cancelled = true;
    };
  }, []);

  const labels = LABELS[status];
  const dotColor =
    status === 'operational'
      ? 'var(--status-ok)'
      : status === 'unavailable'
        ? 'var(--foreground-muted)'
        : 'var(--accent)';

  return (
    <section
      aria-labelledby="api-status-title"
      className="flex flex-col gap-3 px-5 py-6 sm:px-8"
    >
      <h2
        id="api-status-title"
        className="text-lg font-semibold"
      >
        API Status
      </h2>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="flex flex-col gap-3"
      >
        <div
          className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-medium"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--surface-border)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '9999px',
              backgroundColor: dotColor,
              display: 'inline-block',
            }}
          />
          <span lang="en" dir="ltr">
            {labels.en}
          </span>
          <span
            aria-hidden="true"
            style={{ color: 'var(--surface-border)' }}
          >
            |
          </span>
          <span lang="ar" dir="rtl">
            {labels.ar}
          </span>
        </div>

        {status === 'unavailable' && (
          <button
            type="button"
            onClick={() => void check()}
            className="self-start rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            <span lang="en" dir="ltr">
              {RETRY_LABEL.en}
            </span>
            <span
              aria-hidden="true"
              style={{ marginInline: '0.5rem' }}
            >
              |
            </span>
            <span lang="ar" dir="rtl">
              {RETRY_LABEL.ar}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
