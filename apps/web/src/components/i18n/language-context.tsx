'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

/**
 * Bilingual language context for the Ibn Hayan web application.
 *
 * The product is presented bilingually (Arabic and English) with
 * Arabic as the default. The language choice lives in React memory
 * only — it is never persisted to localStorage, sessionStorage,
 * IndexedDB, or a cookie. It carries no authentication, CSRF, or
 * session information.
 *
 * When the language changes, an effect updates
 * `document.documentElement.lang` and `document.documentElement.dir`
 * so the browser applies the correct text direction and the language
 * is exposed to assistive technology.
 *
 * The provider is mounted once at the root layout. It persists across
 * client-side navigations within the Next.js App Router, so the user's
 * language choice survives a navigation from `/` to `/dashboard`.
 */

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface LanguageContextValue {
  /** The current language. */
  readonly lang: Language;
  /** The current text direction, derived from `lang`. */
  readonly dir: Direction;
  /** Set the language explicitly. */
  readonly setLang: (lang: Language) => void;
  /** Toggle between Arabic and English. */
  readonly toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * The default language is Arabic. This must match the `lang` attribute
 * set on the `<html>` element in `layout.tsx` so the first server
 * render and the first client render agree.
 */
const DEFAULT_LANGUAGE: Language = 'ar';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(DEFAULT_LANGUAGE);
  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const toggle = () => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Consume the language context. Throws if used outside a
 * {@link LanguageProvider} so misuse is caught during development.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx === null) {
    throw new Error(
      'useLanguage must be used within a LanguageProvider. Wrap the consuming component tree with <LanguageProvider>.',
    );
  }
  return ctx;
}
