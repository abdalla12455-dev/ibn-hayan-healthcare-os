'use client';

import { type ReactElement, type FormEvent } from 'react';
import { useLanguage } from '@/components/i18n/language-context';
import { LanguageSwitch } from '@/components/marketing/language-switch';
import { Button } from '@/components/ui/button';
import { getClinicAdminCopy } from './clinic-admin-copy';
import { NotificationBell } from './notification-bell';
import type {
  ActiveOrganisationContext,
  ActiveFacilityContext,
  ActiveTenantContext,
} from '@ibn-hayan/contracts';

/**
 * Clinic Admin fixed application header.
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17.4, the fixed
 * header contains: the current-section title or breadcrumb; the
 * active organisation/facility context; the language control; the
 * notification bell; the user/profile menu; and safe sign-out
 * access.
 *
 * The header is the single fixed top navigation bar for the Clinic
 * Admin shell. It must not duplicate controls that already exist in
 * the sidebar (per §17.2 and §17.4). The notification bell appears
 * only here; it never appears in the sidebar.
 *
 * The header reads active context from the canonical session-context
 * module (ADR-015) via props. It must never accept tenant,
 * organisation, or facility scope from untrusted URL parameters.
 */
export interface ClinicAdminHeaderProps {
  /** The active section title (e.g. the page H1). */
  readonly sectionTitle: string;
  /** Active tenant context, or `null` when none is active. */
  readonly activeTenant: ActiveTenantContext | null;
  /** Active organisation context, or `null` when none is active. */
  readonly activeOrganisation: ActiveOrganisationContext | null;
  /** Active facility context, or `null` when none is active. */
  readonly activeFacility: ActiveFacilityContext | null;
  /** Display name of the authenticated user. */
  readonly displayName: string;
  /** Callback invoked when the user signs out. */
  readonly onSignOut: (event: FormEvent<HTMLFormElement>) => void;
  /** Whether the sign-out action is in progress. */
  readonly signingOut: boolean;
  /** Sidebar toggle handler (for mobile drawer). */
  readonly onToggleSidebar?: () => void;
}

/**
 * Header component. See {@link ClinicAdminHeaderProps}.
 */
export function ClinicAdminHeader({
  sectionTitle,
  activeTenant,
  activeOrganisation,
  activeFacility,
  displayName,
  onSignOut,
  signingOut,
  onToggleSidebar,
}: ClinicAdminHeaderProps): ReactElement {
  const { lang } = useLanguage();
  const copy = getClinicAdminCopy(lang);

  return (
    <header className="ih-clinic-admin-header" role="banner">
      <div className="ih-clinic-admin-header__inner">
        <div className="ih-clinic-admin-header__start">
          {onToggleSidebar !== undefined && (
            <button
              type="button"
              className="ih-clinic-admin-header__sidebar-toggle"
              aria-label={copy.sidebarToggleLabel}
              onClick={onToggleSidebar}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                role="presentation"
              >
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          <nav
            className="ih-clinic-admin-header__breadcrumb"
            aria-label={copy.breadcrumbRoot}
          >
            <span className="ih-clinic-admin-header__breadcrumb-root">
              {copy.breadcrumbRoot}
            </span>
            <span
              className="ih-clinic-admin-header__breadcrumb-separator"
              aria-hidden="true"
            >
              {'/'}
            </span>
            <span
              className="ih-clinic-admin-header__breadcrumb-current"
              aria-current="page"
            >
              {sectionTitle}
            </span>
          </nav>
        </div>

        <div className="ih-clinic-admin-header__context">
          {activeTenant !== null && (
            <span
              className="ih-clinic-admin-header__context-chip"
              title={copy.tenantContextLabel}
            >
              <span className="ih-clinic-admin-header__context-label">
                {copy.tenantContextLabel}
              </span>
              <span className="ih-clinic-admin-header__context-value">
                {activeTenant.tenantDisplayName}
              </span>
            </span>
          )}
          {activeOrganisation !== null && (
            <span
              className="ih-clinic-admin-header__context-chip"
              title={copy.organisationContextLabel}
            >
              <span className="ih-clinic-admin-header__context-label">
                {copy.organisationContextLabel}
              </span>
              <span className="ih-clinic-admin-header__context-value">
                {activeOrganisation.displayName}
              </span>
            </span>
          )}
          {activeFacility !== null && (
            <span
              className="ih-clinic-admin-header__context-chip"
              title={copy.facilityContextLabel}
            >
              <span className="ih-clinic-admin-header__context-label">
                {copy.facilityContextLabel}
              </span>
              <span className="ih-clinic-admin-header__context-value">
                {activeFacility.displayName}
              </span>
            </span>
          )}
        </div>

        <div className="ih-clinic-admin-header__actions">
          <LanguageSwitch />
          <NotificationBell />
          <form onSubmit={onSignOut} className="ih-clinic-admin-header__signout-form">
            <Button
              type="submit"
              variant="ghost"
              loading={signingOut}
              aria-label={copy.signOutLabel}
            >
              {copy.signOutLabel}
            </Button>
          </form>
          <span className="ih-clinic-admin-header__user" title={copy.accountLabel}>
            <span className="ih-clinic-admin-header__user-name">
              {displayName}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
