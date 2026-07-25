import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-context";
import { inter, ibmPlexSansArabic } from "./fonts";

/**
 * Root metadata for the Ibn Hayan Healthcare Operating System.
 *
 * The product is presented bilingually with Arabic as the default
 * language. The metadata title and description are written in Arabic
 * to reflect the primary surface a clinic visitor first encounters.
 */
export const metadata: Metadata = {
  title: "ابن حيان — نظام تشغيل موحّد للعيادات الحديثة",
  description:
    "مساحة عمل آمنة ومنظّمة تساعد فرق الرعاية الصحية على إدارة مؤسساتهم بوضوح، والانتقال بين بيئات العمل بثقة، والاستعداد للنمو دون تعقيد.",
};

/**
 * Root layout.
 *
 * The `<html>` element is rendered with `lang="ar"` and `dir="rtl"` by
 * default because Arabic is the primary surface language. The
 * {@link LanguageProvider} updates `document.documentElement.lang` and
 * `document.documentElement.dir` at runtime when the user switches to
 * English.
 *
 * The provider holds the language choice in React memory only. It never
 * persists the language to localStorage, sessionStorage, or a cookie.
 * It does not carry any authentication or CSRF information.
 *
 * Font loading. The `inter` and `ibmPlexSansArabic` font CSS variables
 * are applied to the root `<html>` element via the `className` prop.
 * These variables are consumed by the design tokens in
 * `globals.css` (`--font-sans` and `--font-arabic`). The fonts are
 * loaded with Next.js's built-in `next/font/google` module, which
 * retrieves the font files at build time and serves them from the
 * application's own origin (per ADR-003 offline-first and supply-chain
 * safety). There is no runtime request to a Google Fonts CDN. See
 * `apps/web/src/app/fonts.ts` for the full font-loading rationale.
 *
 * Applying the variables on the root `<html>` (rather than a per-route
 * layout) ensures every route — landing, login, dashboard, and
 * clinic-admin — receives the approved typography without a per-route
 * change, and preserves the existing project-owned token names so
 * every component that already uses `var(--font-sans)` or
 * `var(--font-arabic)` automatically picks up the approved fonts.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`h-full antialiased ${inter.variable} ${ibmPlexSansArabic.variable}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
