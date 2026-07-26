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
  requestRolePreviewBootstrap,
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
 * Per the Secure Logged-Out Demo Role Bootstrap specification, this
 * is a development-only route that supports TWO selection flows:
 *
 * 1. **Logged-out bootstrap flow.** When the page is opened by a
 *    fresh browser with no application session, the page:
 *    a. fetches Preview availability;
 *    b. requests a one-time bootstrap challenge (the server sets
 *       the HttpOnly bootstrap cookie carrying the raw nonce);
 *    c. displays the canonical R01–R14 role cards;
 *    d. on selection, calls `POST /select` with `{ roleCode,
 *       challengeId }` (no CSRF header, no session cookie). The
 *       bootstrap cookie auto-attaches. The server consumes the
 *       challenge, creates the first preview session, sets the
 *       application-session cookie, and clears the bootstrap
 *       cookie.
 *
 * 2. **Session-bound switching flow.** When the page detects an
 *    active preview session (via `getCurrentPreviewRole`), the
 *    page falls back to the existing behaviour: fetch a CSRF token,
 *    call `POST /select` with `{ roleCode }` and the `X-CSRF-Token`
 *    header.
 *
 * The page never displays a username field, never displays a
 * password field, never displays a fake login form, never hardcodes
 * a credential, never displays an internal UUID, never displays the
 * session token, never displays the bootstrap nonce, never stores
 * the nonce or any role authorization in localStorage.
 *
 * The page renders honest loading, unavailable, expired-challenge,
 * replay-failure, and network-error states.
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
  // challengeId is held in component memory ONLY. It is NOT stored
  // in localStorage, sessionStorage, or a cookie. It is the opaque
  // identifier returned by the bootstrap endpoint; the matching
  // nonce lives in the HttpOnly bootstrap cookie that the browser
  // auto-attaches.
  const [challengeId, setChallengeId] = useState<string | null>(null);
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

      // Best-effort load of the current preview role. If the
      // operator already has an active preview session, we keep
      // it and use the session-bound switching flow. If not, we
      // fall back to the logged-out bootstrap flow.
      const currentResult = await getCurrentPreviewRole();
      if (cancelled) return;
      if (currentResult.ok && currentResult.data.active) {
        setCurrent(currentResult.data);
        setLoading(false);
        return;
      }

      // No active preview session → request a one-time bootstrap
      // challenge. The server sets the HttpOnly bootstrap cookie;
      // we retain only the opaque challengeId in component memory.
      const bootstrapResult = await requestRolePreviewBootstrap();
      if (cancelled) return;
      if (!bootstrapResult.ok) {
        // The bootstrap endpoint returned an error. Surface an
        // honest unavailable state so the operator is not stuck.
        setUnavailable(true);
        setLoading(false);
        return;
      }
      setChallengeId(bootstrapResult.data.challengeId);
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

    let selectResult;
    if (current !== null && current.active) {
      // Session-bound switching flow: fetch a CSRF token, then
      // call select with `{ roleCode }` and the `X-CSRF-Token`
      // header.
      const csrfResult = await getCsrfToken();
      if (!csrfResult.ok) {
        setError(copy.switchFailed);
        setSwitching(false);
        return;
      }
      selectResult = await selectPreviewRole(
        csrfResult.data.token,
        roleCode,
      );
    } else if (challengeId !== null) {
      // Logged-out bootstrap flow: call select with
      // `{ roleCode, challengeId }` and no CSRF header. The
      // bootstrap cookie auto-attaches.
      selectResult = await selectPreviewRole(null, roleCode, challengeId);
      // The challenge is one-time; clear it from component memory
      // regardless of outcome so it cannot be retried.
      setChallengeId(null);
    } else {
      // No session and no challenge — the operator must reload the
      // page to request a fresh bootstrap.
      setError(copy.switchFailed);
      setSwitching(false);
      return;
    }

    if (!selectResult.ok) {
      // Distinguish the honest expired/replay/network states for
      // the operator. The error category is the only signal we
      // have; the message is intentionally generic.
      if (selectResult.error.category === 'NETWORK_ERROR') {
        setError(copy.networkError);
      } else if (selectResult.error.statusCode === 403) {
        // 403 from the bootstrap flow means expired/replay/invalid
        // challenge or database-identity gate failure.
        setError(copy.challengeExpired);
      } else {
        setError(copy.switchFailed);
      }
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
    setChallengeId(null);
    // Redirect to /role-preview (not /login) so the operator can
    // immediately request a fresh bootstrap and select another role.
    // The previous implementation redirected to /login, which
    // contradicted the logged-out bootstrap flow.
    router.replace('/role-preview');
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
