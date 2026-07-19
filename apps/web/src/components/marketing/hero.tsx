'use client';

import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';
import { LoginPanel } from './login-panel';
import { ValueGrid } from './value-grid';

/**
 * Premium split-layout hero.
 *
 * Desktop composition (≥ 1024px):
 * - approximately 55–60% brand / value proposition on the leading
 *   side (left in LTR, right in RTL);
 * - approximately 40–45% login card on the trailing side.
 *
 * Mobile composition (< 1024px):
 * - brand / value proposition first;
 * - login card immediately after, early in the page flow.
 *
 * The brand side includes:
 * - a restrained original Ibn Hayan monogram (rendered as part of
 *   the page header — see {@link LandingHeader});
 * - the product heading (an H1 — exactly one per page);
 * - the supporting copy;
 * - four concise value indicators (see {@link ValueGrid});
 * - a subtle project-owned visual motif based on healthcare systems
 *   and connected care environments (an SVG of intersecting arcs
 *   representing structured care coordination).
 *
 * The login card is rendered via {@link LoginPanel}.
 */

export function Hero() {
  const { lang, dir } = useLanguage();
  const copy = getCopy(lang);

  return (
    <section className="ih-hero" aria-labelledby="ih-hero-title" dir={dir}>
      <div className="ih-hero__inner">
        <div className="ih-hero__brand">
          <div className="ih-hero__motif" aria-hidden="true">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 320 320"
              preserveAspectRatio="xMidYMid meet"
              focusable="false"
              role="presentation"
            >
              {/*
               * Project-owned visual motif — structured care
               * coordination. Two intersecting arcs represent the
               * intersection of clinical workflow and organisational
               * structure. Four anchor points represent the four
               * value indicators. A central bronze marker represents
               * the patient at the centre of coordinated care.
               *
               * This is original artwork. No stock illustrations,
               * no copied assets, no random gradient circles.
               */}
              <defs>
                <pattern
                  id="ih-hero-grid"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="0.8"
                    fill="var(--border-strong)"
                  />
                </pattern>
              </defs>
              <rect
                x="0"
                y="0"
                width="320"
                height="320"
                fill="url(#ih-hero-grid)"
                opacity="0.4"
              />
              {/* Outer arc — organisational structure */}
              <path
                d="M 40 240 Q 40 80 200 80 Q 280 80 280 160"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.25"
              />
              {/* Inner arc — clinical workflow */}
              <path
                d="M 80 260 Q 80 120 200 120 Q 260 120 260 180"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.6"
              />
              {/* Crossing arc — coordination */}
              <path
                d="M 60 60 Q 160 160 260 260"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.4"
                strokeDasharray="3 5"
              />
              {/* Four anchor points — the value indicators */}
              <circle cx="60" cy="60" r="3.5" fill="var(--primary)" />
              <circle cx="260" cy="60" r="3.5" fill="var(--primary)" />
              <circle cx="60" cy="260" r="3.5" fill="var(--primary)" />
              <circle cx="260" cy="260" r="3.5" fill="var(--primary)" />
              {/* Central bronze marker — coordinated care */}
              <circle
                cx="160"
                cy="160"
                r="6"
                fill="var(--accent)"
                opacity="0.9"
              />
              <circle
                cx="160"
                cy="160"
                r="14"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1"
                opacity="0.5"
              />
            </svg>
          </div>

          <div className="ih-hero__text">
            <p className="ih-hero__eyebrow">
              {copy.brandTagline}
            </p>
            <h1 id="ih-hero-title" className="ih-hero__title">
              {copy.heroHeading}
            </h1>
            <p className="ih-hero__body">{copy.heroBody}</p>
            <ValueGrid />
          </div>
        </div>

        <div className="ih-hero__login">
          <LoginPanel />
        </div>
      </div>
    </section>
  );
}
