import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';

/**
 * Section 3 — Ready to grow with the organisation.
 *
 * Communicates the architecture as a product benefit without exposing
 * internal implementation details. The section does NOT claim
 * patient management, appointments, billing, inventory, laboratory,
 * insurance, or any other unfinished module. It positions the system
 * honestly as a secure operating foundation designed to expand.
 *
 * A subtle SVG motif — three concentric arcs representing structured
 * growth — is rendered as decorative emphasis. Original and
 * project-owned.
 */

export function GrowthSection() {
  const { lang, dir } = useLanguage();
  const copy = getCopy(lang);

  return (
    <section
      className="ih-section ih-section--growth"
      aria-labelledby="ih-section-growth-title"
      dir={dir}
    >
      <div className="ih-section__inner ih-section__inner--split ih-section__inner--reverse">
        <div className="ih-section__content">
          <header className="ih-section__header">
            <p className="ih-section__eyebrow">
              {lang === 'ar' ? 'القسم ٣' : 'Section 3'}
            </p>
            <h2
              id="ih-section-growth-title"
              className="ih-section__title"
            >
              {copy.section3Heading}
            </h2>
            <p className="ih-section__body">{copy.section3Body}</p>
          </header>
        </div>
        <div className="ih-section__visual">
          <svg
            width="180"
            height="180"
            viewBox="0 0 180 180"
            aria-hidden="true"
            focusable="false"
            role="presentation"
            className="ih-section__visual-svg"
          >
            {/* Three concentric arcs — structured, calm growth */}
            <path
              d="M 30 130 A 70 70 0 0 1 150 50"
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M 45 130 A 55 55 0 0 1 135 65"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M 60 130 A 40 40 0 0 1 120 80"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* The starting anchor — the secure foundation */}
            <circle cx="30" cy="130" r="4" fill="var(--primary)" />
            {/* The growth direction marker — bronze accent */}
            <circle cx="150" cy="50" r="3.5" fill="var(--accent)" />
            {/* Three small ticks — measured, deliberate expansion */}
            <line
              x1="48"
              y1="120"
              x2="48"
              y2="126"
              stroke="var(--text-secondary)"
              strokeWidth="1"
            />
            <line
              x1="78"
              y1="105"
              x2="78"
              y2="111"
              stroke="var(--text-secondary)"
              strokeWidth="1"
            />
            <line
              x1="108"
              y1="85"
              x2="108"
              y2="91"
              stroke="var(--text-secondary)"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
