import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-context";

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
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
