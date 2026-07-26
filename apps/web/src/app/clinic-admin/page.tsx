'use client';

import { type ReactElement } from 'react';
import { useLanguage } from '@/components/i18n/language-context';
import { ClinicAdminShell } from '@/components/clinic-admin/clinic-admin-shell';
import { ClinicAdminOverview } from '@/components/clinic-admin/clinic-admin-overview';
import { getClinicAdminCopy } from '@/components/clinic-admin/clinic-admin-copy';

/**
 * Clinic Admin Overview page (`/clinic-admin`).
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17.1, this is the
 * canonical application route for the R09 Clinic Administrator role.
 *
 * The page renders the ratified Clinic Admin shell (header + sidebar
 * + main region) and the live-data Overview content component
 * (`ClinicAdminOverview`). The shell enforces authentication and
 * context protection per §17.1; the shell only renders its children
 * after the authenticated session and the active tenant +
 * organisation + facility context have been confirmed. Therefore
 * the Overview component can fetch the overview payload from
 * `/api/v1/clinic-admin/overview` on mount without re-checking the
 * context.
 *
 * Per the live-data task specification Phase 6, the page does NOT:
 * - duplicate the shell;
 * - create a second dashboard route;
 * - invent business data;
 * - render a permanent loading skeleton;
 * - leak backend error messages or stack traces to the user.
 *
 * The page H1 is rendered inside the Overview component (exactly
 * one H1 — the Overview title). The shell renders the
 * section-title heading as a header element (not an H1) per the
 * shell's existing accessibility pattern.
 *
 * Per the live-data task specification Phase 6, the page uses the
 * existing localisation system (`useLanguage` + the copy modules)
 * for all user-facing strings. The shell receives `sectionTitle`
 * from the copy module so the header's section-title affordance
 * remains bilingual.
 *
 * NOTE: the page does NOT pass a `contextReady` prop to the
 * Overview component. The shell's render gate (see
 * `clinic-admin-shell.tsx` line `if (loading || session === null
 * || context === null || redirecting)`) guarantees that children
 * only mount after the authenticated session AND the active
 * tenant + organisation + facility context are confirmed. Passing
 * a hardcoded `contextReady={true}` would be misleading (it
 * suggests the parent might pass `false`, but the page never does)
 * and would duplicate the shell's existing mount-readiness gate.
 * The Overview component fetches on mount unconditionally; the
 * shell guarantees mount readiness.
 */
export default function ClinicAdminPage(): ReactElement {
  const { lang } = useLanguage();
  const copy = getClinicAdminCopy(lang);

  return (
    <ClinicAdminShell sectionTitle={copy.overviewTitle}>
      <ClinicAdminOverview />
    </ClinicAdminShell>
  );
}
