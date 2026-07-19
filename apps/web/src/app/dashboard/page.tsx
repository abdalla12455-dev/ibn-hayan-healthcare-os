'use client';

import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ReactElement,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getSession,
  getCsrfToken,
  logout,
} from '@/lib/api/auth/auth.client';
import {
  getContext,
  selectTenantContext,
  clearTenantContext,
} from '@/lib/api/context';
import type {
  SessionResponse,
  ContextResponse,
  TenantContextOption,
  TenantMembershipSummary,
} from '@ibn-hayan/contracts';
import { useLanguage } from '@/components/i18n/language-context';
import { BrandMark } from '@/components/marketing/brand-mark';
import { LanguageSwitch } from '@/components/marketing/language-switch';
import { Button } from '@/components/ui/button';
import { StatusMessage } from '@/components/ui/status-message';

/**
 * Premium authenticated dashboard shell.
 *
 * Restyled to belong to the same premium product as the landing page.
 * No new business capabilities are added.
 *
 * Composition:
 * - Sticky application header with brand mark, active-workspace
 *   chip, language switch, and discreet session indicator.
 * - Page title (exactly one H1).
 * - Workspace card — current context + selector.
 * - Account card — display name, email, session remaining, and the
 *   list of available workspaces (memberships).
 * - Sign out action.
 *
 * The dashboard preserves the existing secure behaviour:
 * - session check on mount; redirect to `/login` when no session;
 * - context load after session;
 * - selecting a workspace obtains a fresh CSRF token first, then
 *   calls the context API with `membershipId`;
 * - clearing obtains a fresh CSRF token first;
 * - selecting or clearing updates the page without a full reload;
 * - logout obtains a CSRF token, calls logout, and redirects to
 *   `/login`;
 * - CSRF tokens are held in component memory only; never persisted
 *   to browser storage.
 *
 * System information is translated into user-facing language:
 * - "Active tenant context" → "Active workspace" / "بيئة العمل النشطة";
 * - "Tenant memberships" → "Available workspaces" / "بيئات العمل المتاحة";
 * - "Session expires at <iso>" → discreet "Session remaining" line.
 *
 * The dashboard does NOT display:
 * - raw IDs (membership ID, tenant ID, session ID);
 * - raw API responses;
 * - "Session expires at <timestamp>";
 * - infrastructure error details;
 * - inactive navigation links for future modules;
 * - a fake sidebar with unimplemented features.
 */

const DASHBOARD_COPY = {
  ar: {
    pageTitle: 'مساحة العمل',
    pageSubtitle: 'اختر بيئة عملك وابدأ العمل بثقة.',
    workspaceTitle: 'بيئة العمل النشطة',
    workspaceEyebrow: 'السياق الحالي',
    currentLabel: 'الحالي',
    noContextTitle: 'لم يتم اختيار بيئة عمل',
    noContextBody: 'اختر بيئة عمل من القائمة أدناه للبدء.',
    selectLegend: 'اختر بيئة عمل',
    selectButton: 'اختيار / تغيير',
    selecting: 'جارٍ الاختيار…',
    clearButton: 'مسح الاختيار',
    clearing: 'جارٍ المسح…',
    noOptionsTitle: 'لا توجد بيئات عمل متاحة',
    noOptionsBody: 'لا توجد عضويات نشطة مرتبطة بحسابك.',
    accountTitle: 'حسابك',
    nameLabel: 'الاسم',
    emailLabel: 'البريد الإلكتروني',
    sessionLabel: 'الجلسة',
    sessionActive: 'نشطة',
    membershipsTitle: 'بيئات العمل المتاحة',
    noMemberships: 'لا توجد عضويات نشطة.',
    statusActive: 'نشط',
    statusSuspended: 'موقوف',
    logoutButton: 'تسجيل الخروج',
    loggingOut: 'جارٍ تسجيل الخروج…',
    errorContextGeneric: 'تعذّر تحديث بيئة العمل. حاول مرة أخرى.',
    errorLogoutGeneric: 'تعذّر تسجيل الخروج. حاول مرة أخرى.',
    errorContextLoad: 'تعذّر تحميل بيئة العمل.',
    activeChip: 'بيئة العمل الحالية',
    idleChip: 'بدون بيئة عمل',
    sessionRemaining: (ms: number) => formatRemainingAr(ms),
  },
  en: {
    pageTitle: 'Workspace',
    pageSubtitle: 'Choose your workspace and begin work with confidence.',
    workspaceTitle: 'Active workspace',
    workspaceEyebrow: 'Current context',
    currentLabel: 'Current',
    noContextTitle: 'No workspace selected',
    noContextBody: 'Choose a workspace from the list below to begin.',
    selectLegend: 'Select a workspace',
    selectButton: 'Select / Change',
    selecting: 'Selecting…',
    clearButton: 'Clear selection',
    clearing: 'Clearing…',
    noOptionsTitle: 'No workspaces available',
    noOptionsBody: 'No active memberships are associated with your account.',
    accountTitle: 'Your account',
    nameLabel: 'Name',
    emailLabel: 'Email',
    sessionLabel: 'Session',
    sessionActive: 'Active',
    membershipsTitle: 'Available workspaces',
    noMemberships: 'No active memberships.',
    statusActive: 'active',
    statusSuspended: 'suspended',
    logoutButton: 'Sign out',
    loggingOut: 'Signing out…',
    errorContextGeneric: 'Unable to update the workspace. Please try again.',
    errorLogoutGeneric: 'Unable to sign out. Please try again.',
    errorContextLoad: 'Unable to load the workspace.',
    activeChip: 'Active workspace',
    idleChip: 'No workspace',
    sessionRemaining: (ms: number) => formatRemainingEn(ms),
  },
} as const;

function formatRemainingEn(ms: number): string {
  if (ms <= 0) return 'expired';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

function formatRemainingAr(ms: number): string {
  if (ms <= 0) return 'منتهية';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) {
    return `${hours} س ${minutes} د متبقية`;
  }
  return `${minutes} د متبقية`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const copy = DASHBOARD_COPY[lang];

  const sessionLoadedRef = useRef(false);
  const contextLoadedRef = useRef(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const result = await getSession();
      if (cancelled) return;
      if (result.ok) {
        setSession(result.data);
        setLoading(false);
      } else {
        router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (contextLoadedRef.current) return;
    if (session === null) return;
    contextLoadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const result = await getContext();
      if (cancelled) return;
      if (result.ok) {
        setContext(result.data);
        if (result.data.active !== null) {
          setSelectedMembershipId(result.data.active.membershipId);
        } else if (result.data.options.length > 0) {
          setSelectedMembershipId(result.data.options[0]!.membershipId);
        }
      } else {
        setContextError(copy.errorContextLoad);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, copy.errorContextLoad]);

  async function handleLogout(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (loggingOut) return;

    setError(null);
    setLoggingOut(true);

    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setError(copy.errorLogoutGeneric);
      setLoggingOut(false);
      return;
    }

    const logoutResult = await logout(csrfResult.data.token);
    if (!logoutResult.ok) {
      setError(copy.errorLogoutGeneric);
      setLoggingOut(false);
      return;
    }

    router.replace('/login');
  }

  async function handleSelectContext(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (selecting) return;
    if (selectedMembershipId.length === 0) return;

    setContextError(null);
    setSelecting(true);

    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setContextError(copy.errorContextGeneric);
      setSelecting(false);
      return;
    }

    const result = await selectTenantContext(
      selectedMembershipId,
      csrfResult.data.token,
    );
    if (!result.ok) {
      setContextError(copy.errorContextGeneric);
      setSelecting(false);
      return;
    }

    setContext(result.data);
    if (result.data.active !== null) {
      setSelectedMembershipId(result.data.active.membershipId);
    }
    setSelecting(false);
  }

  async function handleClearContext(): Promise<void> {
    if (clearing) return;

    setContextError(null);
    setClearing(true);

    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setContextError(copy.errorContextGeneric);
      setClearing(false);
      return;
    }

    const result = await clearTenantContext(csrfResult.data.token);
    if (!result.ok) {
      setContextError(copy.errorContextGeneric);
      setClearing(false);
      return;
    }

    const reloaded = await getContext();
    if (reloaded.ok) {
      setContext(reloaded.data);
      if (
        reloaded.data.active === null &&
        reloaded.data.options.length > 0
      ) {
        setSelectedMembershipId(reloaded.data.options[0]!.membershipId);
      }
    } else {
      setContext((prev) =>
        prev === null ? prev : { options: prev.options, active: null },
      );
    }
    setClearing(false);
  }

  if (loading || session === null) {
    return (
      <div className="ih-app__loading">
        <p className="ih-visually-hidden" aria-live="polite">
          {copy.pageTitle}
        </p>
      </div>
    );
  }

  const options: readonly TenantContextOption[] = context?.options ?? [];
  const active = context?.active ?? null;

  return (
    <div className="ih-app" dir={dir}>
      <header className="ih-app__header">
        <div className="ih-app__header-inner">
          <a
            href="/dashboard"
            className="ih-app__header-brand"
            aria-label={copy.pageTitle}
          >
            <BrandMark size={32} compact />
          </a>
          <div
            className="ih-app__header-context"
            aria-label={copy.workspaceEyebrow}
          >
            <span
              className={
                'ih-app__header-context-dot' +
                (active === null ? ' ih-app__header-context-dot--none' : '')
              }
              aria-hidden="true"
            />
            <span className="ih-app__header-context-label">
              {active !== null
                ? active.tenantDisplayName
                : copy.idleChip}
            </span>
          </div>
          <div className="ih-app__header-actions">
            <LanguageSwitch />
            <form onSubmit={handleLogout}>
              <Button
                type="submit"
                variant="ghost"
                loading={loggingOut}
              >
                {loggingOut ? copy.loggingOut : copy.logoutButton}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="ih-app__main">
        <div className="ih-app__page-header">
          <h1 className="ih-app__page-title">{copy.pageTitle}</h1>
          <p className="ih-app__page-subtitle">{copy.pageSubtitle}</p>
        </div>

        <WorkspaceCard
          title={copy.workspaceTitle}
          eyebrow={copy.workspaceEyebrow}
          currentLabel={copy.currentLabel}
          active={active}
          noContextTitle={copy.noContextTitle}
          noContextBody={copy.noContextBody}
          options={options}
          noOptionsTitle={copy.noOptionsTitle}
          noOptionsBody={copy.noOptionsBody}
          selectLegend={copy.selectLegend}
          selectedMembershipId={selectedMembershipId}
          onSelectMembership={setSelectedMembershipId}
          onSelect={handleSelectContext}
          onClear={handleClearContext}
          selecting={selecting}
          clearing={clearing}
          selectButton={copy.selectButton}
          selectingLabel={copy.selecting}
          clearButton={copy.clearButton}
          clearingLabel={copy.clearing}
          error={contextError}
          errorText={copy.errorContextGeneric}
        />

        <AccountCard
          title={copy.accountTitle}
          nameLabel={copy.nameLabel}
          emailLabel={copy.emailLabel}
          sessionLabel={copy.sessionLabel}
          sessionActive={copy.sessionActive}
          sessionRemaining={copy.sessionActive}
          displayName={session.user.displayName}
          email={session.user.email}
          membershipsTitle={copy.membershipsTitle}
          memberships={session.memberships}
          noMemberships={copy.noMemberships}
          statusActive={copy.statusActive}
          statusSuspended={copy.statusSuspended}
        />

        {error !== null && (
          <StatusMessage variant="error">{error}</StatusMessage>
        )}
      </main>
    </div>
  );
}

interface WorkspaceCardProps {
  readonly title: string;
  readonly eyebrow: string;
  readonly currentLabel: string;
  readonly active: TenantContextOption | null;
  readonly noContextTitle: string;
  readonly noContextBody: string;
  readonly options: readonly TenantContextOption[];
  readonly noOptionsTitle: string;
  readonly noOptionsBody: string;
  readonly selectLegend: string;
  readonly selectedMembershipId: string;
  readonly onSelectMembership: (id: string) => void;
  readonly onSelect: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly onClear: () => Promise<void>;
  readonly selecting: boolean;
  readonly clearing: boolean;
  readonly selectButton: string;
  readonly selectingLabel: string;
  readonly clearButton: string;
  readonly clearingLabel: string;
  readonly error: string | null;
  readonly errorText: string;
}

function WorkspaceCard({
  title,
  eyebrow,
  currentLabel,
  active,
  noContextTitle,
  noContextBody,
  options,
  noOptionsTitle,
  noOptionsBody,
  selectLegend,
  selectedMembershipId,
  onSelectMembership,
  onSelect,
  onClear,
  selecting,
  clearing,
  selectButton,
  selectingLabel,
  clearButton,
  clearingLabel,
  error,
  errorText,
}: WorkspaceCardProps): ReactElement {
  return (
    <section
      className="ih-card ih-card--elevated"
      aria-labelledby="ih-workspace-title"
    >
      <header className="ih-card__header">
        <div>
          <p className="ih-card__eyebrow">{eyebrow}</p>
          <h2 id="ih-workspace-title" className="ih-card__title">
            {title}
          </h2>
        </div>
      </header>

      <div>
        <p className="ih-context-current__label">{currentLabel}</p>
        {active === null ? (
          <div className="ih-empty-state">
            <p className="ih-empty-state__title">{noContextTitle}</p>
            <p className="ih-empty-state__body">{noContextBody}</p>
          </div>
        ) : (
          <div className="ih-context-current">
            <p className="ih-context-current__value">
              {active.tenantDisplayName}
            </p>
            <p className="ih-context-current__meta">{active.tenantSlug}</p>
          </div>
        )}
      </div>

      {options.length === 0 ? (
        <div className="ih-empty-state">
          <p className="ih-empty-state__title">{noOptionsTitle}</p>
          <p className="ih-empty-state__body">{noOptionsBody}</p>
        </div>
      ) : (
        <form onSubmit={onSelect} className="ih-login__form">
          <fieldset className="ih-options">
            <legend className="ih-context-current__label">
              {selectLegend}
            </legend>
            <div className="ih-options" role="radiogroup" aria-label={selectLegend}>
              {options.map((option) => {
                const selected =
                  selectedMembershipId === option.membershipId;
                return (
                  <label
                    key={option.membershipId}
                    className={
                      'ih-option' +
                      (selected ? ' ih-option--selected' : '')
                    }
                  >
                    <input
                      type="radio"
                      name="tenant-membership"
                      value={option.membershipId}
                      checked={selected}
                      onChange={() => onSelectMembership(option.membershipId)}
                      className="ih-option__radio"
                    />
                    <span className="ih-option__text">
                      <span className="ih-option__name">
                        {option.tenantDisplayName}
                      </span>
                      <span className="ih-option__slug">
                        {option.tenantSlug}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="ih-actions-row">
            <Button
              type="submit"
              variant="primary"
              loading={selecting}
              disabled={selectedMembershipId.length === 0}
            >
              {selecting ? selectingLabel : selectButton}
            </Button>
            {active !== null && (
              <Button
                type="button"
                variant="ghost"
                loading={clearing}
                onClick={() => void onClear()}
              >
                {clearing ? clearingLabel : clearButton}
              </Button>
            )}
          </div>

          {error !== null && (
            <StatusMessage variant="error">{errorText}</StatusMessage>
          )}
        </form>
      )}
    </section>
  );
}

interface AccountCardProps {
  readonly title: string;
  readonly nameLabel: string;
  readonly emailLabel: string;
  readonly sessionLabel: string;
  readonly sessionActive: string;
  readonly sessionRemaining: string;
  readonly displayName: string;
  readonly email: string;
  readonly membershipsTitle: string;
  readonly memberships: readonly TenantMembershipSummary[];
  readonly noMemberships: string;
  readonly statusActive: string;
  readonly statusSuspended: string;
}

function AccountCard({
  title,
  nameLabel,
  emailLabel,
  sessionLabel,
  sessionActive,
  sessionRemaining,
  displayName,
  email,
  membershipsTitle,
  memberships,
  noMemberships,
  statusActive,
  statusSuspended,
}: AccountCardProps): ReactElement {
  return (
    <section className="ih-card" aria-labelledby="ih-account-title">
      <header className="ih-card__header">
        <h2 id="ih-account-title" className="ih-card__title">
          {title}
        </h2>
      </header>

      <ul className="ih-account-list">
        <li className="ih-account-item">
          <p className="ih-account-item__label">{nameLabel}</p>
          <p className="ih-account-item__value">{displayName}</p>
        </li>
        <li className="ih-account-item">
          <p className="ih-account-item__label">{emailLabel}</p>
          <p className="ih-account-item__value">{email}</p>
        </li>
        <li className="ih-account-item">
          <p className="ih-account-item__label">{sessionLabel}</p>
          <p className="ih-account-item__value">
            <span className="ih-status-chip">
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'currentColor',
                  display: 'inline-block',
                }}
              />
              {sessionActive}
            </span>
          </p>
          <p
            className="ih-account-item__value"
            style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
          >
            {sessionRemaining}
          </p>
        </li>
      </ul>

      <div>
        <p className="ih-card__eyebrow" style={{ marginTop: '0.5rem' }}>
          {membershipsTitle}
        </p>
        {memberships.length === 0 ? (
          <p
            className="ih-account-item__value"
            style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}
          >
            {noMemberships}
          </p>
        ) : (
          <ul className="ih-memberships">
            {memberships.map((membership) => (
              <li key={membership.id} className="ih-membership">
                <span className="ih-membership__name">
                  {membership.tenantDisplayName}
                </span>
                <span className="ih-membership__meta">
                  {membership.tenantSlug}
                </span>
                <span
                  className={
                    'ih-status-chip' +
                    (membership.status === 'suspended'
                      ? ''
                      : ' ih-status-chip--idle')
                  }
                >
                  {membership.status === 'active'
                    ? statusActive
                    : statusSuspended}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
