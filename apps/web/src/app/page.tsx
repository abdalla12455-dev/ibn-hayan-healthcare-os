import { LANDING_COPY } from "./landing-content";
import { ApiStatus } from "@/components/system/api-status";
import Link from "next/link";

/**
 * Canonical landing page for the Ibn Hayan Healthcare Operating System.
 *
 * The page is a presentation surface. It contains no authoritative
 * business logic. It is reachable at the root of the web application via
 * the Next.js App Router.
 *
 * The document has exactly one <h1>, which presents both the English and
 * Arabic system names. Each name is wrapped in a <span> that carries its
 * own `lang` and `dir` attributes so screen readers and browsers use the
 * correct pronunciation and text direction even when the names are read
 * inside a single heading.
 *
 * Below the identity header, the {@link ApiStatus} client component
 * fetches the API health endpoint in the browser and displays the runtime
 * connection state. The component does not poll and does not affect the
 * page's single-H1 structure.
 *
 * A minimal navigation link to the login page is included in the header
 * so operators can reach the authentication flow from the landing page.
 *
 * Bilingual implementation-status content is rendered in two semantic
 * <section> blocks that follow the API status. Each block sets its own
 * `lang` and `dir` attributes and uses <h2> as its section heading so the
 * heading hierarchy remains logical and accessible. The two blocks are
 * independent; neither is a translation of the other's heading hierarchy.
 */
export default function LandingPage() {
  const englishEntry = LANDING_COPY.find((entry) => entry.lang === "en");
  const arabicEntry = LANDING_COPY.find((entry) => entry.lang === "ar");

  // The landing copy is a compile-time constant that always contains both
  // the English and Arabic entries. The runtime guards below satisfy the
  // strict `noUncheckedIndexedAccess` inherited from the root TypeScript
  // baseline without weakening the type of `LANDING_COPY`.
  if (!englishEntry || !arabicEntry) {
    return null;
  }

  return (
    <main className="flex flex-1 flex-col w-full">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "var(--page-max-width)" }}
      >
        <header className="flex flex-col gap-4 px-5 py-10 sm:px-8 sm:py-12">
          <h1 className="flex flex-col gap-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <span lang={englishEntry.lang} dir={englishEntry.dir}>
              {englishEntry.systemName}
            </span>
            <span
              lang={arabicEntry.lang}
              dir={arabicEntry.dir}
              className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl"
            >
              {arabicEntry.systemName}
            </span>
          </h1>
          <nav className="flex gap-4">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-base font-medium text-white inline-flex"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <span lang="en" dir="ltr">Sign in</span>
              {' / '}
              <span lang="ar" dir="rtl">تسجيل الدخول</span>
            </Link>
          </nav>
        </header>

        <ApiStatus />

        {LANDING_COPY.map((entry) => (
          <LandingSection key={entry.lang} entry={entry} />
        ))}
      </div>
    </main>
  );
}

interface LandingSectionProps {
  readonly entry: (typeof LANDING_COPY)[number];
}

function LandingSection({ entry }: LandingSectionProps) {
  const sectionId = `landing-${entry.lang}`;
  return (
    <section
      id={sectionId}
      lang={entry.lang}
      dir={entry.dir}
      aria-labelledby={`${sectionId}-title`}
      className="flex flex-col gap-6 px-5 py-10 sm:px-8 sm:py-12"
    >
      <header className="flex flex-col gap-3">
        <p
          className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-medium"
          style={{
            backgroundColor: "var(--accent-muted)",
            color: "var(--accent)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "9999px",
              backgroundColor: "var(--status-ok)",
              display: "inline-block",
            }}
          />
          {entry.implementationStatusLabel}
        </p>
        <h2
          id={`${sectionId}-title`}
          className="text-2xl font-semibold leading-tight tracking-tight"
        >
          {entry.foundationStatusHeading}
        </h2>
        <p
          className="text-base"
          style={{ color: "var(--foreground-muted)" }}
        >
          {entry.foundationStatusBody}
        </p>
      </header>

      <article
        className="flex flex-col gap-2 rounded-lg p-5"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--surface-border)",
        }}
      >
        <h3 className="text-xl font-semibold">{entry.canonicalNoteHeading}</h3>
        <p
          className="text-base"
          style={{ color: "var(--foreground-muted)" }}
        >
          {entry.canonicalNoteBody}
        </p>
        <p
          className="text-sm"
          style={{ color: "var(--foreground-muted)", fontStyle: "italic" }}
        >
          {entry.prototypeNote}
        </p>
      </article>
    </section>
  );
}
