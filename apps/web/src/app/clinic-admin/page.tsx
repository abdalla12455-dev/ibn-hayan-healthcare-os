'use client';

import { type ReactElement } from 'react';
import { useLanguage } from '@/components/i18n/language-context';
import { ClinicAdminShell } from '@/components/clinic-admin/clinic-admin-shell';
import { getClinicAdminCopy } from '@/components/clinic-admin/clinic-admin-copy';

/**
 * Clinic Admin Overview page (`/clinic-admin`).
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17.1, this is the
 * canonical application route for the R09 Clinic Administrator role.
 *
 * The page renders the ratified Clinic Admin shell (header + sidebar
 * + main region) and an honest Overview foundation (per §17.7). The
 * page must NOT implement fake business dashboard cards, fake
 * appointments, fake financial figures, fake doctors, fake inventory
 * alerts, fake waiting-room data, fake attendance, or fake
 * notifications. Where the approved business regions are not yet
 * implemented, the page uses clearly structured neutral empty states
 * without invented data.
 *
 * The page makes it technically clear that the shell exists while
 * real vertical slices will populate the regions later. Developer
 * notes or implementation-status language are NOT exposed to normal
 * users; the foundation copy is written in user-facing product
 * language.
 *
 * The page H1 is exactly one (the Overview title). The shell
 * enforces authentication and context protection per §17.1.
 */
export default function ClinicAdminPage(): ReactElement {
  const { lang } = useLanguage();
  const copy = getClinicAdminCopy(lang);

  return (
    <ClinicAdminShell sectionTitle={copy.overviewTitle}>
      <div className="ih-clinic-admin-overview">
        <header className="ih-clinic-admin-overview__header">
          <h1 className="ih-clinic-admin-overview__title">
            {copy.overviewTitle}
          </h1>
          <p className="ih-clinic-admin-overview__subtitle">
            {copy.overviewSubtitle}
          </p>
        </header>
        <section
          className="ih-clinic-admin-overview__foundation"
          aria-labelledby="ih-clinic-admin-overview-foundation-title"
        >
          <h2
            id="ih-clinic-admin-overview-foundation-title"
            className="ih-clinic-admin-overview__foundation-title"
          >
            {copy.overviewFoundationTitle}
          </h2>
          <p className="ih-clinic-admin-overview__foundation-body">
            {copy.overviewFoundationBody}
          </p>
        </section>
      </div>
    </ClinicAdminShell>
  );
}
