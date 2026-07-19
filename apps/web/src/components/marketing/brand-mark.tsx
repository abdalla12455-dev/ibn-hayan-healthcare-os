import { useLanguage } from '@/components/i18n/language-context';
import { getCopy } from '@/components/i18n/landing-copy';

/**
 * Ibn Hayan brand mark — an original SVG monogram + wordmark.
 *
 * The monogram is a project-owned SVG composed of:
 * - a deep ink navy rounded square as the structural mark;
 * - a stylised "ح" (Arabic letter Haa, the first letter of حيان)
 *   rendered as a single continuous stroke;
 * - a small bronze accent dot representing care and precision.
 *
 * No external assets are used. No stock illustrations. No copied
 * logos. The mark is intentionally restrained — it does not glow,
 * animate, or use a gradient.
 *
 * The wordmark is rendered as text (not as an SVG) so the browser
 * uses the correct language-specific font and so screen readers
 * announce the brand name correctly.
 *
 * The SVG is marked `aria-hidden="true"` because the wordmark text
 * already conveys the brand name to assistive technology.
 */

export interface BrandMarkProps {
  /** Visual size of the monogram square. */
  readonly size?: number;
  /** When true, render only the monogram (no wordmark). */
  readonly compact?: boolean;
}

export function BrandMark({ size = 40, compact = false }: BrandMarkProps) {
  const { lang } = useLanguage();
  const copy = getCopy(lang);

  return (
    <span
      className="ih-brand"
      style={{ gap: compact ? '0' : '0.625rem' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden="true"
        focusable="false"
        role="presentation"
        className="ih-brand__monogram"
      >
        {/* Structural rounded square — deep ink navy */}
        <rect
          x="0.5"
          y="0.5"
          width="39"
          height="39"
          rx="9"
          fill="var(--primary)"
          stroke="var(--primary-hover)"
          strokeWidth="1"
        />
        {/*
         * Stylised "ح" stroke — a single continuous path that suggests
         * the Arabic letter Haa (the first letter of حيان / Hayan).
         * The stroke descends, curves, and rises — a calm, structural
         * form that does not literalise into calligraphy.
         */}
        <path
          d="M 12 30 L 12 16 Q 12 11 17 11 Q 22 11 22 16 L 22 22 Q 22 26 26 26 Q 30 26 30 22 L 30 16"
          fill="none"
          stroke="var(--surface)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bronze accent dot — the precision / care marker */}
        <circle cx="29" cy="30" r="2.2" fill="var(--accent)" />
      </svg>
      {!compact && (
        <span className="ih-brand__wordmark">
          <span className="ih-brand__name">{copy.brandName}</span>
          <span className="ih-brand__tagline">{copy.brandTagline}</span>
        </span>
      )}
    </span>
  );
}
