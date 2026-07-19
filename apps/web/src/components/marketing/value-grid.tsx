import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';

/**
 * Value grid — four concise value indicators.
 *
 * Rendered as a 2×2 grid on desktop, a single column on mobile. Each
 * indicator is a small block with a title and one supporting line.
 *
 * The indicators do not claim features that are not implemented. They
 * communicate the currently implemented security and bilingual
 * foundation, and the architecture's readiness for future expansion.
 *
 * A subtle SVG motif is rendered before each title. The motif is a
 * small healthcare-supporting mark (a stylised caduceus-like form,
 * but original — not a copied asset). The motif is decorative; it is
 * marked `aria-hidden="true"`.
 */

const MOTIFS = [
  // Secure access — a small shield form
  <svg
    key="secure"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    role="presentation"
  >
    <path
      d="M 8 1.5 L 13.5 3.5 L 13.5 8 Q 13.5 12 8 14.5 Q 2.5 12 2.5 8 L 2.5 3.5 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M 6 8 L 7.5 9.5 L 10.5 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>,
  // Isolated workspaces — two offset rectangles
  <svg
    key="workspaces"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    role="presentation"
  >
    <rect
      x="2"
      y="3"
      width="8"
      height="9"
      rx="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="6"
      y="5"
      width="8"
      height="9"
      rx="1"
      fill="var(--background)"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>,
  // Bilingual experience — a small "Aa / أا" mark
  <svg
    key="bilingual"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    role="presentation"
  >
    <text
      x="2"
      y="11"
      fontFamily="var(--font-sans)"
      fontSize="9"
      fontWeight="600"
      fill="currentColor"
    >
      Aa
    </text>
    <text
      x="9"
      y="11"
      fontFamily="var(--font-arabic)"
      fontSize="9"
      fontWeight="600"
      fill="currentColor"
    >
      أ
    </text>
  </svg>,
  // Built to scale — three ascending bars
  <svg
    key="scale"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    role="presentation"
  >
    <rect x="2" y="9" width="3" height="5" rx="0.5" fill="currentColor" />
    <rect
      x="6.5"
      y="6"
      width="3"
      height="8"
      rx="0.5"
      fill="currentColor"
      opacity="0.7"
    />
    <rect
      x="11"
      y="3"
      width="3"
      height="11"
      rx="0.5"
      fill="currentColor"
      opacity="0.5"
    />
  </svg>,
];

export function ValueGrid() {
  const { lang } = useLanguage();
  const copy = getCopy(lang);

  return (
    <ul className="ih-value-grid" role="list">
      {copy.values.map((value, index) => (
        <li key={index} className="ih-value-grid__item">
          <span className="ih-value-grid__icon" aria-hidden="true">
            {MOTIFS[index] ?? MOTIFS[0]}
          </span>
          <span className="ih-value-grid__text">
            <span className="ih-value-grid__title">{value.title}</span>
            <span className="ih-value-grid__body">{value.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
