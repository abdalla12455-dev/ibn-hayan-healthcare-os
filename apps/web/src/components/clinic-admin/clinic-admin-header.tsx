'use client';

import { type ReactElement, type FormEvent } from 'react';
import { useLanguage } from '@/components/i18n/language-context';
import { LanguageSwitch } from '@/components/marketing/language-switch';
import { Button } from '@/components/ui/button';
import { getClinicAdminCopy } from './clinic-admin-copy';
import { NotificationBell } from './notification-bell';
import { RolePreviewSwitcher } from '@/components/role-preview/role-preview-switcher';
import type {
  ActiveOrganisationContext,
  ActiveFacilityContext,
  ActiveTenantContext,
  RolePreviewRoleCard,
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
 *
 * Per the Demo Role Preview Mode v1 specification, the header may
 * optionally render a role switcher when preview mode is enabled
 * and the current session belongs to the isolated preview
 * workspace. The switcher is rendered only when the parent passes
 * a non-null `previewRoles` prop. The switcher does NOT replace
 * the active organisation/facility context, the language switch,
 * the notification bell, the profile menu, or the sign-out control.
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
  /**
   * Canonical preview role cards (R01 through R14). When non-null,
   * the header renders the Demo Role Preview Mode role switcher.
   * When `null`, the switcher is absent (normal production mode
   * or non-preview session).
   */
  readonly previewRoles?: readonly RolePreviewRoleCard[] | null;
  /**
   * The currently selected preview role code, or `null` when no
   * preview role is selected. Ignored when `previewRoles` is
   * `null` or `undefined`.
   */
  readonly currentPreviewRoleCode?: string | null;
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
  previewRoles,
  currentPreviewRoleCode,
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
          {previewRoles !== undefined && previewRoles !== null && (
            <RolePreviewSwitcher
              roles={previewRoles}
              currentRoleCode={currentPreviewRoleCode ?? null}
            />
          )}
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
