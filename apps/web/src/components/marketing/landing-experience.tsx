'use client';

import { LandingHeader } from './landing-header';
import { Hero } from './hero';
import { OperationalClaritySection } from './operational-clarity-section';
import { SecuritySection } from './security-section';
import { GrowthSection } from './growth-section';
import { LandingFooter } from './landing-footer';

/**
 * Premium landing + login experience.
 *
 * A single client component that composes the entire public surface:
 *
 * 1. Premium navigation header (brand + language switch).
 * 2. Hero with brand identity, value proposition, value indicators,
 *    and the integrated login card.
 * 3. Section 1 — Designed for operational clarity.
 * 4. Section 2 — Security built into the foundation.
 * 5. Section 3 — Ready to grow with the organisation.
 * 6. Refined footer (brand, copyright, language switch).
 *
 * The login form is rendered directly inside the hero — the user
 * does not need to click a "Sign in" button to reach it. On mobile,
 * the login form appears immediately after the primary value
 * proposition.
 *
 * Exactly one `<h1>` exists on the page (the hero title).
 */

export function LandingExperience() {
  return (
    <>
      <LandingHeader />
      <main className="ih-landing-main">
        <Hero />
        <OperationalClaritySection />
        <SecuritySection />
        <GrowthSection />
      </main>
      <LandingFooter />
    </>
  );
}
