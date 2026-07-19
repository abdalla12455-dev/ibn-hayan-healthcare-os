import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';
import { BrandMark } from './brand-mark';
import { LanguageSwitch } from './language-switch';

/**
 * Refined landing footer.
 *
 * Contains:
 * - the Ibn Hayan brand mark (small);
 * - the brand tagline;
 * - the copyright line;
 * - a discreet language switch.
 *
 * No fake testimonials. No fake clinic logos. No fake awards. No fake
 * metrics. No fake customer numbers. No social-media icons. No
 * newsletter signup. The footer is intentionally minimal — the
 * landing page's job is to communicate the value proposition and to
 * let the user sign in, not to fill space.
 */

export function LandingFooter() {
  const { lang, dir } = useLanguage();
  const copy = getCopy(lang);

  return (
    <footer className="ih-footer" dir={dir}>
      <div className="ih-footer__inner">
        <div className="ih-footer__brand">
          <BrandMark size={28} compact />
          <p className="ih-footer__tagline">{copy.footerTagline}</p>
        </div>
        <div className="ih-footer__meta">
          <p className="ih-footer__copyright">{copy.footerCopyright}</p>
          <LanguageSwitch />
        </div>
      </div>
    </footer>
  );
}
