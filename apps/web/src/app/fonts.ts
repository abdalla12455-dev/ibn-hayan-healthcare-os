import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google';

/**
 * Deterministic, licence-compliant font loading for the Ibn Hayan
 * Healthcare Operating System web surface.
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17.6 and
 * `download/docs/05_UI_UX/ENTERPRISE_DESIGN_BRIEF.md` §2.10, the
 * approved typography is:
 *
 * - **Arabic:** IBM Plex Sans Arabic
 * - **English / Latin:** Inter
 *
 * Both families are loaded with Next.js's built-in `next/font/google`
 * module. This is the canonical Next.js font mechanism — it requires
 * no new runtime dependency (no `fontsource`, no `@fontsource/*`
 * package, no custom loader) and is the option that most directly
 * satisfies ADR-003 offline-first and supply-chain safety:
 *
 * - The font files are retrieved **at build time** and bundled into
 *   the application's build output. There is no runtime request to
 *   `fonts.googleapis.com` or `fonts.gstatic.com`; the fonts are
 *   served from the application's own origin.
 * - No font file is exposed, printed, packaged separately, or
 *   redistributed outside the application build.
 * - The font CSS variables are exposed to the rest of the app via
 *   `variable` so the existing design tokens in `globals.css` can
 *   consume them through `var(--font-sans)` and `var(--font-arabic)`.
 *
 * Font-display strategy: `swap`. Text is rendered immediately with
 * the system fallback and swapped to the bundled webfont once it is
 * ready. This avoids invisible-text flash, supports Arabic shaping
 * (the browser uses HarfBuzz for OpenType shaping regardless of the
 * font loader), preserves readable weights, and preserves
 * accessibility contrast (the fallback stack is high-contrast).
 *
 * Subset strategy:
 * - Inter loads the `latin` subset (covers English + Latin-script
 *   numerals and punctuation used in the clinic-admin surface).
 * - IBM Plex Sans Arabic loads the `arabic` subset (covers Arabic
 *   letters, Arabic-Indic digits, and the Arabic diacritics used in
 *   the bilingual copy).
 *
 * Both fonts are exposed as variable fonts (no weight pinned at load
 * time), so the full weight progression is available to the design
 * tokens without additional network cost.
 *
 * Per `download/docs/05_UI_UX/ENTERPRISE_DESIGN_BRIEF.md` §2.10,
 * tabular figures for numeric runs are handled at the CSS layer
 * (`font-variant-numeric: tabular-nums`) on the elements that need
 * them; the font itself ships both proportional and tabular figures.
 *
 * The CSS variables produced here are consumed in `globals.css`:
 *
 * - `--font-inter` is assigned to `--font-sans` (Latin / English)
 * - `--font-ibm-plex-sans-arabic` is assigned to `--font-arabic`
 *   (Arabic), preserving the existing project-owned token names so
 *   every component that already uses `var(--font-sans)` or
 *   `var(--font-arabic)` automatically receives the approved font.
 *
 * The font CSS variables are applied to the root `<html>` element in
 * `layout.tsx` so they are available to every route (landing, login,
 * dashboard, clinic-admin) without a per-route change.
 */

/**
 * Inter — the approved Latin / English typeface.
 *
 * Loaded with the `latin` subset and `display: swap`. The variable
 * font is used so the full weight progression (400, 500, 600, 700)
 * is available without additional fetches.
 */
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * IBM Plex Sans Arabic — the approved Arabic typeface.
 *
 * Loaded with the `arabic` subset and `display: swap`. IBM Plex Sans
 * Arabic is not exposed as a variable axis on Google Fonts, so the
 * discrete weights used by the design system are loaded explicitly:
 *
 * - 400 — regular body copy
 * - 500 — medium-weight labels and chips
 * - 600 — semibold headings and active sidebar items
 * - 700 — bold brand and emphasis
 *
 * Loading only the weights the design system actually uses keeps the
 * bundled font payload minimal while covering every weight referenced
 * in `globals.css` and the Clinic Admin shell components.
 */
export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-sans-arabic',
});
