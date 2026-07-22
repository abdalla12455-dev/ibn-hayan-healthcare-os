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
  selectOrganisationContext,
  clearOrganisationContext,
  selectFacilityContext,
  clearFacilityContext,
} from '@/lib/api/context';
import type {
  SessionResponse,
  ContextResponse,
  TenantContextOption,
  TenantMembershipSummary,
  RoleSummary,
  OrganisationContextOption,
  ActiveOrganisationContext,
  FacilityContextOption,
  ActiveFacilityContext,
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
    rolesLabel: 'الأدوار',
    noRoles: 'لا توجد أدوار مسندة.',
    logoutButton: 'تسجيل الخروج',
    loggingOut: 'جارٍ تسجيل الخروج…',
    errorContextGeneric: 'تعذّر تحديث بيئة العمل. حاول مرة أخرى.',
    errorLogoutGeneric: 'تعذّر تسجيل الخروج. حاول مرة أخرى.',
    errorContextLoad: 'تعذّر تحميل بيئة العمل.',
    activeChip: 'بيئة العمل الحالية',
    idleChip: 'بدون بيئة عمل',
    sessionRemaining: (ms: number) => formatRemainingAr(ms),
    // ADR-015: organisation and facility context labels.
    organisationTitle: 'المؤسسة النشطة',
    organisationSelectLegend: 'اختر مؤسسة',
    organisationNoOptionsTitle: 'لا توجد مؤسسات متاحة',
    organisationNoOptionsBody:
      'لا توجد مؤسسات مرتبطة بدورك في بيئة العمل الحالية.',
    organisationNoActiveTitle: 'لم يتم اختيار مؤسسة',
    organisationNoActiveBody: 'اختر مؤسسة من القائمة أدناه للبدء.',
    organisationClearButton: 'مسح المؤسسة',
    organisationSelectButton: 'اختيار المؤسسة',
    facilityTitle: 'المنشأة النشطة',
    facilitySelectLegend: 'اختر منشأة',
    facilityNoOptionsTitle: 'لا توجد منشآت متاحة',
    facilityNoOptionsBody: 'لا توجد منشآت مرتبطة بدورك في المؤسسة الحالية.',
    facilityNoActiveTitle: 'لم يتم اختيار منشأة',
    facilityNoActiveBody: 'اختر منشأة من القائمة أدناه للبدء.',
    facilityClearButton: 'مسح المنشأة',
    facilitySelectButton: 'اختيار المنشأة',
    facilityRequiresOrganisation:
      'يجب اختيار مؤسسة قبل اختيار منشأة.',
    activeOrganisationChip: 'المؤسسة الحالية',
    activeFacilityChip: 'المنشأة الحالية',
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
    rolesLabel: 'Roles',
    noRoles: 'No roles assigned.',
    logoutButton: 'Sign out',
    loggingOut: 'Signing out…',
    errorContextGeneric: 'Unable to update the workspace. Please try again.',
    errorLogoutGeneric: 'Unable to sign out. Please try again.',
    errorContextLoad: 'Unable to load the workspace.',
    activeChip: 'Active workspace',
    idleChip: 'No workspace',
    sessionRemaining: (ms: number) => formatRemainingEn(ms),
    // ADR-015: organisation and facility context labels.
    organisationTitle: 'Active organisation',
    organisationSelectLegend: 'Select an organisation',
    organisationNoOptionsTitle: 'No organisations available',
    organisationNoOptionsBody:
      'No organisations are associated with your role in the current workspace.',
    organisationNoActiveTitle: 'No organisation selected',
    organisationNoActiveBody: 'Choose an organisation from the list below to begin.',
    organisationClearButton: 'Clear organisation',
    organisationSelectButton: 'Select organisation',
    facilityTitle: 'Active facility',
    facilitySelectLegend: 'Select a facility',
    facilityNoOptionsTitle: 'No facilities available',
    facilityNoOptionsBody:
      'No facilities are associated with your role in the current organisation.',
    facilityNoActiveTitle: 'No facility selected',
    facilityNoActiveBody: 'Choose a facility from the list below to begin.',
    facilityClearButton: 'Clear facility',
    facilitySelectButton: 'Select facility',
    facilityRequiresOrganisation:
      'Select an organisation before selecting a facility.',
    activeOrganisationChip: 'Active organisation',
    activeFacilityChip: 'Active facility',
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
  // ADR-015: organisation and facility selector state.
  const [selectedOrganisationId, setSelectedOrganisationId] =
    useState<string>('');
  const [selectingOrganisation, setSelectingOrganisation] = useState(false);
  const [clearingOrganisation, setClearingOrganisation] = useState(false);
  const [organisationError, setOrganisationError] = useState<string | null>(
    null,
  );
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectingFacility, setSelectingFacility] = useState(false);
  const [clearingFacility, setClearingFacility] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);

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
        // ADR-015: initialise the organisation and facility selector
        // state from the loaded context.
        if (result.data.activeOrganisation !== null) {
          setSelectedOrganisationId(
            result.data.activeOrganisation.organisationId,
          );
        } else if (result.data.organisationOptions.length > 0) {
          setSelectedOrganisationId(
            result.data.organisationOptions[0]!.organisationId,
          );
        } else {
          setSelectedOrganisationId('');
        }
        if (result.data.activeFacility !== null) {
          setSelectedFacilityId(result.data.activeFacility.facilityId);
        } else if (result.data.facilityOptions.length > 0) {
          setSelectedFacilityId(result.data.facilityOptions[0]!.facilityId);
        } else {
          setSelectedFacilityId('');
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
      // Per ADR-015, clearing the tenant context also clears the
      // active organisation and the active facility (cascade). We
      // update the local state to reflect the cascade.
      setContext((prev) =>
        prev === null
          ? prev
          : {
              options: prev.options,
              active: null,
              organisationOptions: [],
              activeOrganisation: null,
              facilityOptions: [],
              activeFacility: null,
            },
      );
    }
    setClearing(false);
  }

  // -------------------------------------------------------------------------
  // ADR-015: organisation and facility context handlers
  // -------------------------------------------------------------------------

  async function handleSelectOrganisation(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (selectingOrganisation) return;
    if (selectedOrganisationId.length === 0) return;

    setOrganisationError(null);
    setSelectingOrganisation(true);

    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setOrganisationError(copy.errorContextGeneric);
      setSelectingOrganisation(false);
      return;
    }

    const result = await selectOrganisationContext(
      selectedOrganisationId,
      csrfResult.data.token,
    );
    if (!result.ok) {
      setOrganisationError(copy.errorContextGeneric);
      setSelectingOrganisation(false);
      return;
    }

    setContext(result.data);
    if (result.data.activeOrganisation !== null) {
      setSelectedOrganisationId(result.data.activeOrganisation.organisationId);
    }
    // Per ADR-015, selecting a new organisation may clear the
    // active facility (cascade). Update the facility selector
    // state accordingly.
    if (result.data.activeFacility !== null) {
      setSelectedFacilityId(result.data.activeFacility.facilityId);
    } else if (result.data.facilityOptions.length > 0) {
      setSelectedFacilityId(result.data.facilityOptions[0]!.facilityId);
    } else {
      setSelectedFacilityId('');
    }
    setSelectingOrganisation(false);
  }

  async function handleClearOrganisation(): Promise<void> {
    if (clearingOrganisation) return;

    setOrganisationError(null);
    setClearingOrganisation(true);

    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setOrganisationError(copy.errorContextGeneric);
      setClearingOrganisation(false);
      return;
    }

    const result = await clearOrganisationContext(csrfResult.data.token);
    if (!result.ok) {
      setOrganisationError(copy.errorContextGeneric);
      setClearingOrganisation(false);
      return;
    }

    const reloaded = await getContext();
    if (reloaded.ok) {
      setContext(reloaded.data);
      if (reloaded.data.activeOrganisation !== null) {
        setSelectedOrganisationId(
          reloaded.data.activeOrganisation.organisationId,
        );
      } else if (reloaded.data.organisationOptions.length > 0) {
        setSelectedOrganisationId(
          reloaded.data.organisationOptions[0]!.organisationId,
        );
      } else {
        setSelectedOrganisationId('');
      }
      // Per ADR-015, clearing the organisation also clears the
      // facility (cascade).
      setSelectedFacilityId('');
    } else {
      setContext((prev) =>
        prev === null
          ? prev
          : {
              ...prev,
              activeOrganisation: null,
              activeFacility: null,
              facilityOptions: [],
            },
      );
      setSelectedFacilityId('');
    }
    setClearingOrganisation(false);
  }

  async function handleSelectFacility(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (selectingFacility) return;
    if (selectedFacilityId.length === 0) return;

    setFacilityError(null);
    setSelectingFacility(true);

    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setFacilityError(copy.errorContextGeneric);
      setSelectingFacility(false);
      return;
    }

    const result = await selectFacilityContext(
      selectedFacilityId,
      csrfResult.data.token,
    );
    if (!result.ok) {
      setFacilityError(copy.errorContextGeneric);
      setSelectingFacility(false);
      return;
    }

    setContext(result.data);
    if (result.data.activeFacility !== null) {
      setSelectedFacilityId(result.data.activeFacility.facilityId);
    }
    setSelectingFacility(false);
  }

  async function handleClearFacility(): Promise<void> {
    if (clearingFacility) return;

    setFacilityError(null);
    setClearingFacility(true);

    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setFacilityError(copy.errorContextGeneric);
      setClearingFacility(false);
      return;
    }

    const result = await clearFacilityContext(csrfResult.data.token);
    if (!result.ok) {
      setFacilityError(copy.errorContextGeneric);
      setClearingFacility(false);
      return;
    }

    const reloaded = await getContext();
    if (reloaded.ok) {
      setContext(reloaded.data);
      if (
        reloaded.data.activeFacility === null &&
        reloaded.data.facilityOptions.length > 0
      ) {
        setSelectedFacilityId(reloaded.data.facilityOptions[0]!.facilityId);
      }
    } else {
      setContext((prev) =>
        prev === null ? prev : { ...prev, activeFacility: null },
      );
    }
    setClearingFacility(false);
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
  // ADR-015: organisation and facility context for the dashboard.
  const organisationOptions: readonly OrganisationContextOption[] =
    context?.organisationOptions ?? [];
  const activeOrganisation = context?.activeOrganisation ?? null;
  const facilityOptions: readonly FacilityContextOption[] =
    context?.facilityOptions ?? [];
  const activeFacility = context?.activeFacility ?? null;

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
            {activeOrganisation !== null && (
              <span
                className="ih-app__header-context-segment"
                aria-hidden="true"
              >
                {'·'}
              </span>
            )}
            {activeOrganisation !== null && (
              <span className="ih-app__header-context-segment">
                {activeOrganisation.displayName}
              </span>
            )}
            {activeFacility !== null && (
              <span
                className="ih-app__header-context-segment"
                aria-hidden="true"
              >
                {'·'}
              </span>
            )}
            {activeFacility !== null && (
              <span className="ih-app__header-context-segment">
                {activeFacility.displayName}
              </span>
            )}
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
          rolesLabel={copy.rolesLabel}
          noRoles={copy.noRoles}
        />

        {active !== null && (
          <OrganisationCard
            title={copy.organisationTitle}
            eyebrow={copy.workspaceEyebrow}
            currentLabel={copy.currentLabel}
            activeOrganisation={activeOrganisation}
            noContextTitle={copy.organisationNoActiveTitle}
            noContextBody={copy.organisationNoActiveBody}
            options={organisationOptions}
            noOptionsTitle={copy.organisationNoOptionsTitle}
            noOptionsBody={copy.organisationNoOptionsBody}
            selectLegend={copy.organisationSelectLegend}
            selectedOrganisationId={selectedOrganisationId}
            onSelectOrganisation={setSelectedOrganisationId}
            onSelect={handleSelectOrganisation}
            onClear={handleClearOrganisation}
            selecting={selectingOrganisation}
            clearing={clearingOrganisation}
            selectButton={copy.organisationSelectButton}
            selectingLabel={copy.selecting}
            clearButton={copy.organisationClearButton}
            clearingLabel={copy.clearing}
            error={organisationError}
            errorText={copy.errorContextGeneric}
          />
        )}

        {active !== null && activeOrganisation !== null && (
          <FacilityCard
            title={copy.facilityTitle}
            eyebrow={copy.workspaceEyebrow}
            currentLabel={copy.currentLabel}
            activeFacility={activeFacility}
            noContextTitle={copy.facilityNoActiveTitle}
            noContextBody={copy.facilityNoActiveBody}
            options={facilityOptions}
            noOptionsTitle={copy.facilityNoOptionsTitle}
            noOptionsBody={copy.facilityNoOptionsBody}
            selectLegend={copy.facilitySelectLegend}
            selectedFacilityId={selectedFacilityId}
            onSelectFacility={setSelectedFacilityId}
            onSelect={handleSelectFacility}
            onClear={handleClearFacility}
            selecting={selectingFacility}
            clearing={clearingFacility}
            selectButton={copy.facilitySelectButton}
            selectingLabel={copy.selecting}
            clearButton={copy.facilityClearButton}
            clearingLabel={copy.clearing}
            error={facilityError}
            errorText={copy.errorContextGeneric}
          />
        )}

        {active !== null && activeOrganisation === null && (
          <p
            className="ih-context-current__label"
            style={{
              marginTop: '0.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            {copy.facilityRequiresOrganisation}
          </p>
        )}

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
          rolesLabel={copy.rolesLabel}
          noRoles={copy.noRoles}
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
  readonly rolesLabel: string;
  readonly noRoles: string;
}

/**
 * Render a list of role chips. Each chip displays the localized
 * role display name. Raw enum codes (e.g. `R13_SYSTEM_ADMINISTRATOR`)
 * are never shown to the user.
 *
 * Per the eighth canonical batch specification:
 * - Multiple roles render cleanly as chips.
 * - No raw enum names are shown.
 * - The frontend does not decide whether an action is authorized;
 *   the chips are a display-only affordance.
 */
function RoleChips({
  roles,
  noRoles,
}: {
  readonly roles: readonly RoleSummary[];
  readonly noRoles: string;
}): ReactElement {
  if (roles.length === 0) {
    return (
      <span
        className="ih-account-item__value"
        style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}
      >
        {noRoles}
      </span>
    );
  }
  return (
    <span
      className="ih-role-chips"
      style={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: '0.25rem',
        alignItems: 'center',
      }}
    >
      {roles.map((role) => (
        <span
          key={role.code}
          className="ih-role-chip"
          style={{
            display: 'inline-block',
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            background: 'var(--accent-soft, rgba(99, 102, 241, 0.08))',
            color: 'var(--accent, #4f46e5)',
            fontSize: '0.75rem',
            fontWeight: 500,
            lineHeight: 1.4,
            border: '1px solid var(--accent-border, rgba(99, 102, 241, 0.2))',
          }}
        >
          {role.displayName}
        </span>
      ))}
    </span>
  );
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
  rolesLabel,
  noRoles,
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
            <div style={{ marginTop: '0.5rem' }}>
              <p
                className="ih-context-current__label"
                style={{ marginBottom: '0.25rem' }}
              >
                {rolesLabel}
              </p>
              <RoleChips roles={active.roles} noRoles={noRoles} />
            </div>
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
                      <span
                        className="ih-option__roles"
                        style={{
                          display: 'block',
                          marginTop: '0.25rem',
                        }}
                      >
                        <RoleChips roles={option.roles} noRoles={noRoles} />
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
  readonly rolesLabel: string;
  readonly noRoles: string;
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
  rolesLabel,
  noRoles,
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
                <span
                  className="ih-membership__roles"
                  style={{
                    display: 'block',
                    marginTop: '0.25rem',
                    width: '100%',
                  }}
                >
                  <span
                    className="ih-account-item__label"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {rolesLabel}
                  </span>
                  <RoleChips roles={membership.roles} noRoles={noRoles} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// -------------------------------------------------------------------------
// ADR-015: Organisation and Facility selector cards
// -------------------------------------------------------------------------

interface OrganisationCardProps {
  readonly title: string;
  readonly eyebrow: string;
  readonly currentLabel: string;
  readonly activeOrganisation: ActiveOrganisationContext | null;
  readonly noContextTitle: string;
  readonly noContextBody: string;
  readonly options: readonly OrganisationContextOption[];
  readonly noOptionsTitle: string;
  readonly noOptionsBody: string;
  readonly selectLegend: string;
  readonly selectedOrganisationId: string;
  readonly onSelectOrganisation: (id: string) => void;
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

/**
 * Organisation selector card. Renders the active organisation
 * context, the list of organisations the principal is authorised
 * to select, and the select/clear actions.
 *
 * Per ADR-015, the card is rendered only when the active Tenant
 * context is set. When no organisations are available, an empty
 * state is shown.
 *
 * The card is keyboard-accessible: the radio group has an
 * `aria-label`, each option label is clickable, and the select and
 * clear buttons are reachable via Tab.
 *
 * The card supports loading, empty, error, and permission-denied
 * states:
 * - Loading: the select button shows `selectingLabel` and is
 *   disabled.
 * - Empty: the `noOptionsTitle` and `noOptionsBody` are shown.
 * - Error: the `errorText` is shown via `StatusMessage`.
 * - Permission-denied: the API returns 403; the card shows the
 *   generic `errorText` without revealing the reason.
 */
function OrganisationCard({
  title,
  eyebrow,
  currentLabel,
  activeOrganisation,
  noContextTitle,
  noContextBody,
  options,
  noOptionsTitle,
  noOptionsBody,
  selectLegend,
  selectedOrganisationId,
  onSelectOrganisation,
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
}: OrganisationCardProps): ReactElement {
  return (
    <section
      className="ih-card ih-card--elevated"
      aria-labelledby="ih-organisation-title"
      style={{ marginTop: '1rem' }}
    >
      <header className="ih-card__header">
        <div>
          <p className="ih-card__eyebrow">{eyebrow}</p>
          <h2 id="ih-organisation-title" className="ih-card__title">
            {title}
          </h2>
        </div>
      </header>

      <div>
        <p className="ih-context-current__label">{currentLabel}</p>
        {activeOrganisation === null ? (
          <div className="ih-empty-state">
            <p className="ih-empty-state__title">{noContextTitle}</p>
            <p className="ih-empty-state__body">{noContextBody}</p>
          </div>
        ) : (
          <div className="ih-context-current">
            <p className="ih-context-current__value">
              {activeOrganisation.displayName}
            </p>
            <p className="ih-context-current__meta">
              {activeOrganisation.code}
            </p>
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
            <div
              className="ih-options"
              role="radiogroup"
              aria-label={selectLegend}
            >
              {options.map((option) => {
                const selected =
                  selectedOrganisationId === option.organisationId;
                return (
                  <label
                    key={option.organisationId}
                    className={
                      'ih-option' +
                      (selected ? ' ih-option--selected' : '')
                    }
                  >
                    <input
                      type="radio"
                      name="organisation-context"
                      value={option.organisationId}
                      checked={selected}
                      onChange={() =>
                        onSelectOrganisation(option.organisationId)
                      }
                      className="ih-option__radio"
                    />
                    <span className="ih-option__text">
                      <span className="ih-option__name">
                        {option.displayName}
                      </span>
                      <span className="ih-option__slug">{option.code}</span>
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
              disabled={selectedOrganisationId.length === 0}
            >
              {selecting ? selectingLabel : selectButton}
            </Button>
            {activeOrganisation !== null && (
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

interface FacilityCardProps {
  readonly title: string;
  readonly eyebrow: string;
  readonly currentLabel: string;
  readonly activeFacility: ActiveFacilityContext | null;
  readonly noContextTitle: string;
  readonly noContextBody: string;
  readonly options: readonly FacilityContextOption[];
  readonly noOptionsTitle: string;
  readonly noOptionsBody: string;
  readonly selectLegend: string;
  readonly selectedFacilityId: string;
  readonly onSelectFacility: (id: string) => void;
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

/**
 * Facility selector card. Rendered only when both the active
 * Tenant context and the active Organisation context are set.
 *
 * Per ADR-015, the card is keyboard-accessible and supports
 * loading, empty, error, and permission-denied states.
 */
function FacilityCard({
  title,
  eyebrow,
  currentLabel,
  activeFacility,
  noContextTitle,
  noContextBody,
  options,
  noOptionsTitle,
  noOptionsBody,
  selectLegend,
  selectedFacilityId,
  onSelectFacility,
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
}: FacilityCardProps): ReactElement {
  return (
    <section
      className="ih-card ih-card--elevated"
      aria-labelledby="ih-facility-title"
      style={{ marginTop: '1rem' }}
    >
      <header className="ih-card__header">
        <div>
          <p className="ih-card__eyebrow">{eyebrow}</p>
          <h2 id="ih-facility-title" className="ih-card__title">
            {title}
          </h2>
        </div>
      </header>

      <div>
        <p className="ih-context-current__label">{currentLabel}</p>
        {activeFacility === null ? (
          <div className="ih-empty-state">
            <p className="ih-empty-state__title">{noContextTitle}</p>
            <p className="ih-empty-state__body">{noContextBody}</p>
          </div>
        ) : (
          <div className="ih-context-current">
            <p className="ih-context-current__value">
              {activeFacility.displayName}
            </p>
            <p className="ih-context-current__meta">{activeFacility.code}</p>
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
            <div
              className="ih-options"
              role="radiogroup"
              aria-label={selectLegend}
            >
              {options.map((option) => {
                const selected =
                  selectedFacilityId === option.facilityId;
                return (
                  <label
                    key={option.facilityId}
                    className={
                      'ih-option' +
                      (selected ? ' ih-option--selected' : '')
                    }
                  >
                    <input
                      type="radio"
                      name="facility-context"
                      value={option.facilityId}
                      checked={selected}
                      onChange={() => onSelectFacility(option.facilityId)}
                      className="ih-option__radio"
                    />
                    <span className="ih-option__text">
                      <span className="ih-option__name">
                        {option.displayName}
                      </span>
                      <span className="ih-option__slug">{option.code}</span>
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
              disabled={selectedFacilityId.length === 0}
            >
              {selecting ? selectingLabel : selectButton}
            </Button>
            {activeFacility !== null && (
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
