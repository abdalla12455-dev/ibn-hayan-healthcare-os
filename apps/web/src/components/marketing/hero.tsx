'use client';

import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';
import { LoginPanel } from './login-panel';

export function Hero() {
  const { lang, dir } = useLanguage();
  const copy = getCopy(lang);

  return (
    <section
      className="ih-hero ih-hero--auth"
      aria-labelledby="ih-hero-title"
      dir={dir}
    >
      <div className="ih-hero__inner">
        <div className="ih-hero__brand">
          <div className="ih-hero__text">
            <h1 id="ih-hero-title" className="ih-hero__title">
              {copy.heroHeading}
            </h1>
            <p className="ih-hero__body">
              {copy.heroBody}
            </p>
          </div>
        </div>

        <div className="ih-hero__login">
          <LoginPanel />
        </div>
      </div>
    </section>
  );
}
