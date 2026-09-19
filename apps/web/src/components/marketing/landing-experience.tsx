'use client';

import { LandingHeader } from './landing-header';
import { Hero } from './hero';
import { LandingFooter } from './landing-footer';

export function LandingExperience() {
  return (
    <div className="ih-auth-page">
      <LandingHeader />
      <main className="ih-landing-main">
        <Hero />
      </main>
      <LandingFooter />
    </div>
  );
}
