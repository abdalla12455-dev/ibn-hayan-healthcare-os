import { LandingExperience } from '@/components/marketing/landing-experience';

/**
 * Direct-link login route.
 *
 * `/login` is preserved for direct links and bookmarks. It renders
 * the same premium landing + login experience as the root route —
 * the login form is integrated into the hero. The user does not see
 * a separate scaffold-style sign-in page.
 *
 * The login logic is not duplicated. {@link LandingExperience} and
 * its {@link LoginPanel} child are the single source of truth for
 * the login form, the silent session check, the loading state, and
 * the generic failure message.
 *
 * See {@link LandingPage} at `/` for the full landing composition.
 */
export default function LoginPage() {
  return <LandingExperience />;
}
