'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getRolePreviewAvailability,
  getCurrentPreviewRole,
  selectPreviewRole,
  endPreviewRole,
} from '@/lib/api/role-preview';
import { getCsrfToken } from '@/lib/api/auth/auth.client';
import type {
  RolePreviewAvailabilityResponse,
  CurrentPreviewRoleResponse,
  RolePreviewRoleCard,
} from '@ibn-hayan/contracts';
import { useLanguage } from '@/components/i18n/language-context';
import { BrandMark } from '@/components/marketing/brand-mark';
import { LanguageSwitch } from '@/components/marketing/language-switch';
import { Button } from '@/components/ui/button';
import { StatusMessage } from '@/components/ui/status-message';
import { getRolePreviewCopy } from '@/components/role-preview/role-preview-copy';

/**
 * Demo Role Preview Mode page (`/role-preview`).
 *
 * Per the Demo Role Preview Mode v1 specification, this is a
 * development-only route. The page is **unavailable** when the
 * backend returns 404 (production or flag off); the page renders
 * a safe unavailable result and does NOT expose the role cards.
 *
 * The page displays one role card for every canonical role R01
 * through R14. Each card shows:
 * - the role code (e.g. `R09_ADMINISTRATOR`);
 * - the Arabic and English role names;
 * - the canonical role scope (tenant / organisation / facility);
 * - the current interface implementation status (only R09 is
 *   implemented, at `/clinic-admin`);
 * - a preview action.
 *
 * When R09 is selected:
 * 1. the page creates the real preview session via the backend
 *    endpoint;
 * 2. the backend establishes the preview tenant, organisation, and
 *    facility context on the new session;
 * 3. the page navigates to `/clinic-admin`.
 *
 * When another role is selected:
 * 1. the page creates the real preview session;
 * 2. the page shows a safe role-status view that displays the
 *    current role and active scope, and honestly states that the
 *    role-specific product interface is not implemented.
 *
 * The page never displays internal UUIDs, never displays the
 * session token, never displays any credential, and never creates
 * fake business data.
 */
export default function RolePreviewPage(): ReactElement {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = getRolePreviewCopy(lang);

  const loadedRef = useRef(false);
  const [availability, setAvailability] =
    useState<RolePreviewAvailabilityResponse | null>(null);
  const [current, setCurrent] = useState<CurrentPreviewRoleResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const availResult = await getRolePreviewAvailability();
      if (cancelled) return;
      if (!availResult.ok) {
        if (
          availResult.error.statusCode === 404 ||
          availResult.error.category === 'NETWORK_ERROR'
        ) {
          setUnavailable(true);
          setLoading(false);
          return;
        }
        setUnavailable(true);
        setLoading(false);
        return;
      }
      if (!availResult.data.enabled) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      setAvailability(availResult.data);
      // Best-effort load of the current preview role; ignore
      // failures (the session may not exist or may not be a preview
      // session).
      const currentResult = await getCurrentPreviewRole();
      if (cancelled) return;
      if (currentResult.ok) {
        setCurrent(currentResult.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelect(
    roleCode: RolePreviewRoleCard['code'],
  ): Promise<void> {
    if (switching) return;
    setError(null);
    setInfo(null);
    setSwitching(true);
    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setError(copy.switchFailed);
      setSwitching(false);
      return;
    }
    const selectResult = await selectPreviewRole(csrfResult.data.token, roleCode);
    if (!selectResult.ok) {
      setError(copy.switchFailed);
      setSwitching(false);
      return;
    }
    setInfo(copy.switchSucceeded);
    setSwitching(false);
    // Refresh the current-role state.
    const currentResult = await getCurrentPreviewRole();
    if (currentResult.ok) {
      setCurrent(currentResult.data);
    }
    // If the selected role's interface is implemented (R09),
    // navigate to the interface path.
    if (selectResult.data.interfacePath !== null) {
      router.push(selectResult.data.interfacePath);
    }
  }

  async function handleEnd(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (ending) return;
    setError(null);
    setInfo(null);
    setEnding(true);
    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setError(copy.endFailed);
      setEnding(false);
      return;
    }
    const endResult = await endPreviewRole(csrfResult.data.token);
    if (!endResult.ok) {
      setError(copy.endFailed);
      setEnding(false);
      return;
    }
    setInfo(copy.endSucceeded);
    setEnding(false);
    setCurrent(null);
    // Redirect to /login so the operator can re-authenticate.
    router.replace('/login');
  }

  if (loading) {
    return (
      <div
        className="ih-role-preview-loading"
        role="status"
        aria-live="polite"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <p className="ih-visually-hidden">{copy.loadingMessage}</p>
        <span className="ih-role-preview-loading__spinner" aria-hidden="true" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div
        className="ih-role-preview-page ih-role-preview-page--unavailable"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <header className="ih-role-preview-page__header">
          <BrandMark />
          <LanguageSwitch />
        </header>
        <main className="ih-role-preview-page__main" id="main-content">
          <p className="ih-role-preview-page__eyebrow">{copy.pageEyebrow}</p>
          <h1 className="ih-role-preview-page__title">
            {copy.unavailableTitle}
          </h1>
          <p className="ih-role-preview-page__subtitle">
            {copy.unavailableBody}
          </p>
        </main>
      </div>
    );
  }

  if (availability === null) {
    // Defensive: should not happen because unavailable is true when
    // availability is null.
    return (
      <div
        className="ih-role-preview-page"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <main className="ih-role-preview-page__main">
          <p>{copy.unavailableBody}</p>
        </main>
      </div>
    );
  }

  const showRoleStatus =
    current !== null &&
    current.active &&
    current.selectedRole !== null &&
    !current.selectedRole.interfaceImplemented;

  const currentRoleCode =
    current !== null && current.active && current.selectedRole !== null
      ? current.selectedRole.code
      : null;

  return (
    <div className="ih-role-preview-page" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="ih-role-preview-page__header">
        <BrandMark />
        <LanguageSwitch />
      </header>
      <main className="ih-role-preview-page__main" id="main-content">
        <p className="ih-role-preview-page__eyebrow">{copy.pageEyebrow}</p>
        <h1 className="ih-role-preview-page__title">{copy.pageTitle}</h1>
        <p className="ih-role-preview-page__subtitle">{copy.pageSubtitle}</p>

        {current !== null && current.active && (
          <section
            className="ih-role-preview-page__current"
            aria-label={copy.currentRoleLabel}
          >
            <div className="ih-role-preview-page__current-chips">
              <span className="ih-role-preview-page__chip">
                <span className="ih-role-preview-page__chip-label">
                  {copy.currentRoleLabel}
                </span>
                <span className="ih-role-preview-page__chip-value">
                  {current.selectedRole !== null
                    ? lang === 'ar'
                      ? current.selectedRole.displayNameAr
                      : current.selectedRole.displayNameEn
                    : ''}
                </span>
              </span>
              <span className="ih-role-preview-page__chip">
                <span className="ih-role-preview-page__chip-label">
                  {copy.previewTenantLabel}
                </span>
                <span className="ih-role-preview-page__chip-value">
                  {current.previewTenant ?? ''}
                </span>
              </span>
              <span className="ih-role-preview-page__chip">
                <span className="ih-role-preview-page__chip-label">
                  {copy.previewOrganisationLabel}
                </span>
                <span className="ih-role-preview-page__chip-value">
                  {current.previewOrganisation ?? ''}
                </span>
              </span>
              <span className="ih-role-preview-page__chip">
                <span className="ih-role-preview-page__chip-label">
                  {copy.previewFacilityLabel}
                </span>
                <span className="ih-role-preview-page__chip-value">
                  {current.previewFacility ?? ''}
                </span>
              </span>
            </div>
            <form onSubmit={handleEnd} className="ih-role-preview-page__end-form">
              <Button type="submit" variant="ghost" loading={ending}>
                {ending ? copy.endingPreview : copy.endPreviewButton}
              </Button>
            </form>
          </section>
        )}

        {showRoleStatus && current !== null && current.selectedRole !== null && (
          <section
            className="ih-role-preview-page__role-status"
            aria-labelledby="ih-role-preview-role-status-title"
          >
            <h2 id="ih-role-preview-role-status-title" className="ih-role-preview-page__role-status-title">
              {copy.roleStatusTitle}
            </h2>
            <p className="ih-role-preview-page__role-status-body">
              {copy.roleStatusBody}
            </p>
          </section>
        )}

        <section
          className="ih-role-preview-page__roles"
          aria-labelledby="ih-role-preview-roles-title"
        >
          <h2 id="ih-role-preview-roles-title" className="ih-role-preview-page__roles-title">
            {copy.rolesSectionTitle}
          </h2>
          <ul className="ih-role-preview-page__role-grid">
            {availability.roles.map((role) => {
              const isActive = role.code === currentRoleCode;
              const label =
                lang === 'ar' ? role.displayNameAr : role.displayNameEn;
              const scopeLabel =
                role.scopeLevel === 'tenant'
                  ? copy.scopeTenant
                  : role.scopeLevel === 'organisation'
                    ? copy.scopeOrganisation
                    : copy.scopeFacility;
              const categoryLabel =
                role.category === 'clinical'
                  ? copy.categoryClinical
                  : role.category === 'operational'
                    ? copy.categoryOperational
                    : role.category === 'administrative'
                      ? copy.categoryAdministrative
                      : copy.categoryPlatform;
              return (
                <li
                  key={role.code}
                  className={
                    'ih-role-preview-page__role-card' +
                    (isActive ? ' ih-role-preview-page__role-card--active' : '')
                  }
                >
                  <header className="ih-role-preview-page__role-card-header">
                    <span className="ih-role-preview-page__role-card-name">
                      {label}
                    </span>
                    <span className="ih-role-preview-page__role-card-code">
                      {role.shortCode}
                    </span>
                  </header>
                  <dl className="ih-role-preview-page__role-card-meta">
                    <div className="ih-role-preview-page__role-card-meta-row">
                      <dt>{copy.roleCodeLabel}</dt>
                      <dd>{role.code}</dd>
                    </div>
                    <div className="ih-role-preview-page__role-card-meta-row">
                      <dt>{copy.roleScopeLabel}</dt>
                      <dd>{scopeLabel}</dd>
                    </div>
                    <div className="ih-role-preview-page__role-card-meta-row">
                      <dt>{copy.roleCategoryLabel}</dt>
                      <dd>{categoryLabel}</dd>
                    </div>
                    <div className="ih-role-preview-page__role-card-meta-row">
                      <dt>{copy.interfaceStatusLabel}</dt>
                      <dd>
                        {role.interfaceImplemented
                          ? copy.interfaceImplemented
                          : copy.interfaceNotImplemented}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    type="button"
                    onClick={() => void handleSelect(role.code)}
                    loading={switching && !isActive}
                    disabled={isActive}
                    aria-label={`${copy.selectButton} ${label}`}
                  >
                    {switching && !isActive ? copy.selecting : copy.selectButton}{' '}
                    {role.shortCode}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        {info !== null && (
          <StatusMessage variant="info">{info}</StatusMessage>
        )}
        {error !== null && (
          <StatusMessage variant="error">{error}</StatusMessage>
        )}
      </main>
    </div>
  );
}
