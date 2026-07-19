import { BrandMark } from './brand-mark';
import { LanguageSwitch } from './language-switch';

/**
 * Premium landing header.
 *
 * A restrained navigation header rendered above the hero. Contains:
 * - the Ibn Hayan brand mark (left in LTR, right in RTL);
 * - the language switch (right in LTR, left in RTL).
 *
 * The header does not contain a generic "Sign in" button — the login
 * form is integrated directly into the hero, so a separate navigation
 * button is unnecessary.
 *
 * The header is a `<header>` element with a single row. No dropdown
 * menus, no avatar, no notifications. The landing page is intentionally
 * focused on the value proposition and the login card.
 */

export function LandingHeader() {
  return (
    <header className="ih-header">
      <div className="ih-header__inner">
        <BrandMark />
        <LanguageSwitch />
      </div>
    </header>
  );
}
