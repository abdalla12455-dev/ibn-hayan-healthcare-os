'use client';

import { useLanguage, type Language } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';

/**
 * Bilingual language switch.
 *
 * A single accessible button that toggles between Arabic and English.
 * The button label is always the *other* language's name, so the
 * user sees the language they will switch to:
 *
 * - When the current language is Arabic, the button reads "English"
 *   and switches to English.
 * - When the current language is English, the button reads "العربية"
 *   and switches to Arabic.
 *
 * The button uses a restrained pill shape and a subtle border. It
 * does not glow or animate beyond a small colour change on hover.
 *
 * The language choice lives in React memory only (see
 * {@link useLanguage}). It is never persisted to localStorage,
 * sessionStorage, IndexedDB, or a cookie. It does not carry any
 * authentication, CSRF, or session information.
 */

export function LanguageSwitch() {
  const { lang, setLang } = useLanguage();
  const copy = getCopy(lang);

  const target: Language = lang === 'ar' ? 'en' : 'ar';
  const label = copy.navLanguageSwitch;

  return (
    <button
      type="button"
      onClick={() => setLang(target)}
      className="ih-language-switch"
      aria-label={
        lang === 'ar'
          ? 'Switch to English'
          : 'التبديل إلى العربية'
      }
      lang={target}
      dir={target === 'ar' ? 'rtl' : 'ltr'}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
        role="presentation"
      >
        <circle
          cx="8"
          cy="8"
          r="6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M 1.5 8 L 14.5 8 M 8 1.5 Q 4 4 4 8 Q 4 12 8 14.5 Q 12 12 12 8 Q 12 4 8 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
