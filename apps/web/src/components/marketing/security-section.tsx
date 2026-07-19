import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';

/**
 * Section 2 — Security built into the foundation.
 *
 * Communicates the security concepts that are CURRENTLY IMPLEMENTED:
 * - opaque server-side sessions;
 * - secure HttpOnly cookies;
 * - isolated Tenant workspaces;
 * - authenticated workspace selection;
 * - no authentication data stored in browser storage.
 *
 * The user-facing copy does NOT expose technical terminology such as
 * "opaque token", "SHA-256", "CSRF", "database foreign key", "Prisma",
 * or "NestJS". The raw technical concepts are translated into
 * user-facing benefits.
 *
 * A small SVG motif — a stylised key/lock form — is rendered as
 * decorative emphasis. The motif is original and project-owned.
 */

export function SecuritySection() {
  const { lang, dir } = useLanguage();
  const copy = getCopy(lang);

  return (
    <section
      className="ih-section ih-section--security"
      aria-labelledby="ih-section-security-title"
      dir={dir}
    >
      <div className="ih-section__inner ih-section__inner--split">
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
            {/* Outer ring — the secure boundary */}
            <circle
              cx="90"
              cy="90"
              r="78"
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            {/* Inner core — the protected workspace */}
            <circle
              cx="90"
              cy="90"
              r="56"
              fill="var(--surface)"
              stroke="var(--primary)"
              strokeWidth="1.5"
            />
            {/* Keyhole form — a circle + trapezoid stem */}
            <circle
              cx="90"
              cy="82"
              r="11"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
            />
            <path
              d="M 84 90 L 84 112 L 96 112 L 96 90 Z"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Accent — bronze precision marker */}
            <circle cx="90" cy="82" r="2.5" fill="var(--accent)" />
            {/* Four anchor points — the workspace boundaries */}
            <circle cx="90" cy="12" r="3" fill="var(--accent)" />
            <circle cx="168" cy="90" r="3" fill="var(--accent)" />
            <circle cx="90" cy="168" r="3" fill="var(--accent)" />
            <circle cx="12" cy="90" r="3" fill="var(--accent)" />
          </svg>
        </div>
        <div className="ih-section__content">
          <header className="ih-section__header">
            <p className="ih-section__eyebrow">
              {lang === 'ar' ? 'القسم ٢' : 'Section 2'}
            </p>
            <h2
              id="ih-section-security-title"
              className="ih-section__title"
            >
              {copy.section2Heading}
            </h2>
            <p className="ih-section__body">{copy.section2Body}</p>
          </header>

          <ul className="ih-section__points ih-section__points--compact" role="list">
            {copy.section2Points.map((point, index) => (
              <li key={index} className="ih-section__point">
                <span
                  className="ih-section__point-index"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="ih-section__point-text">
                  <span className="ih-section__point-title">
                    {point.title}
                  </span>
                  <span className="ih-section__point-body">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
