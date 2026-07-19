import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';

/**
 * Section 1 — Designed for operational clarity.
 *
 * Communicates the value of a single structured workspace, controlled
 * access, and clear organisational context. Does NOT claim unfinished
 * modules. The three points below the heading reiterate the section's
 * themes in concrete terms.
 */

export function OperationalClaritySection() {
  const { lang, dir } = useLanguage();
  const copy = getCopy(lang);

  return (
    <section
      className="ih-section ih-section--operational"
      aria-labelledby="ih-section-operational-title"
      dir={dir}
    >
      <div className="ih-section__inner">
        <header className="ih-section__header">
          <p className="ih-section__eyebrow">
            {lang === 'ar' ? 'القسم ١' : 'Section 1'}
          </p>
          <h2
            id="ih-section-operational-title"
            className="ih-section__title"
          >
            {copy.section1Heading}
          </h2>
          <p className="ih-section__body">{copy.section1Body}</p>
        </header>

        <ul className="ih-section__points" role="list">
          {copy.section1Points.map((point, index) => (
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
    </section>
  );
}
