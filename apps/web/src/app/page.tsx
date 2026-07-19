import { LandingExperience } from '@/components/marketing/landing-experience';

/**
 * Premium landing + login page for the Ibn Hayan Healthcare Operating
 * System.
 *
 * The root route `/` is the primary clinic-facing landing and login
 * page. The login form is integrated directly into the hero — the
 * user does not need to click a separate "Sign in" button to reach
 * it.
 *
 * The page is a presentation surface. It contains no business logic
 * beyond the existing secure login flow (preserved unchanged in
 * `LoginPanel`).
 *
 * The page has exactly one `<h1>` (the hero title). The document
 * language and direction are managed by the `LanguageProvider` in
 * the root layout — Arabic is the default, with `lang="ar"` and
 * `dir="rtl"`. Switching to English updates the entire page's copy
 * and direction.
 *
 * The page does NOT display:
 * - API status, API connectivity checks, or service versions;
 * - implementation-foundation language ("Canonical implementation",
 *   "Implementation foundation operational", etc.);
 * - prototype references ("MediFlow", "MediFlow Pro", etc.);
 * - architecture references ("pnpm monorepo", "Next.js thin web
 *   client", "NestJS backend", etc.);
 * - development health checks.
 *
 * The `ApiStatus` component (preserved as an internal-only component
 * for development diagnostics) is not rendered on any user-facing
 * page.
 */
export default function LandingPage() {
  return <LandingExperience />;
}
