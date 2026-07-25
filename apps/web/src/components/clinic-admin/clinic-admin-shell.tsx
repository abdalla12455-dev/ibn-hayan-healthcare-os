'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { getSession, getCsrfToken, logout } from '@/lib/api/auth/auth.client';
import { getContext } from '@/lib/api/context';
import {
  getRolePreviewAvailability,
  getCurrentPreviewRole,
} from '@/lib/api/role-preview';
import type {
  SessionResponse,
  ContextResponse,
  ActiveTenantContext,
  ActiveOrganisationContext,
  ActiveFacilityContext,
  RolePreviewRoleCard,
} from '@ibn-hayan/contracts';
import { useLanguage } from '@/components/i18n/language-context';
import { getClinicAdminCopy } from './clinic-admin-copy';
import { ClinicAdminSidebar } from './clinic-admin-sidebar';
import { ClinicAdminHeader } from './clinic-admin-header';

/**
 * Clinic Admin application shell.
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17, this shell is
 * the production foundation for the approved Clinic Admin Overview
 * (§12 Arabic RTL, §13 English LTR). It is the canonical application
 * surface for the R09 Clinic Administrator role at the canonical
 * route `/clinic-admin`.
 *
 * The shell enforces the §17.1 authentication and context-protection
 * rules:
 * - Requires a valid authenticated session.
 * - Requires an active tenant context.
 * - Requires an active organisation context.
 * - Requires an active facility context.
 * - Never accepts tenant, organisation, or facility scope from
 *   untrusted URL parameters — the canonical session-context module
 *   (ADR-015) is the sole source of active scope.
 * - Redirects safely to `/dashboard` when required context is
 *   missing.
 * - Never exposes cross-tenant or cross-facility information.
 *
 * The shell renders the fixed header, the fixed sidebar, and the
 * vertically scrollable main-content region (per §17.4). It composes
 * a `<ClinicAdminHeader>` (with breadcrumb, context chips, language
 * control, notification bell, user menu, and sign-out) and a
 * `<ClinicAdminSidebar>` (with the eleven ratified navigation items).
 *
 * The shell is responsive (per §17.5): desktop shows the full
 * sidebar; tablet collapses it to an icon rail; mobile converts it
 * to a drawer triggered by a button in the fixed header.
 *
 * The shell does NOT render fake business data. The page state is an
 * honest Overview foundation per §17.7.
 */
export interface ClinicAdminShellProps {
  /** The page content to render inside the shell. */
  readonly children: ReactNode;
  /** The active section title (typically the page H1). */
  readonly sectionTitle: string;
}

/**
 * Resolve the current responsive breakpoint from the window width.
 * Returns `'desktop'`, `'tablet'`, or `'mobile'`.
 *
 * The thresholds are:
 * - desktop: width >= 1024px
 * - tablet: 768px <= width < 1024px
 * - mobile: width < 768px
 *
 * On the server (no `window`), returns `'desktop'` as the default.
 */
function resolveBreakpoint(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

/**
 * External store subscription for the responsive breakpoint. Used
 * by `useSyncExternalStore` so the breakpoint is read once on the
 * client and updated only when the window actually resizes — no
 * synchronous `setState` inside a `useEffect` body (which would
 * trigger cascading renders).
 *
 * On the server, returns `'desktop'` so the initial render matches
 * the client's first paint.
 */
function subscribeBreakpoint(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {
      /* no-op on server */
    };
  }
  window.addEventListener('resize', callback);
  return () => {
    window.removeEventListener('resize', callback);
  };
}

export function ClinicAdminShell({
  children,
  sectionTitle,
}: ClinicAdminShellProps): ReactElement {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = getClinicAdminCopy(lang);

  const sessionLoadedRef = useRef(false);
  const contextLoadedRef = useRef(false);
  const previewLoadedRef = useRef(false);

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Demo Role Preview Mode state. The availability response tells
  // the shell whether the feature is enabled (development-only).
  // The current-preview-role response tells the shell whether the
  // current session belongs to the isolated preview workspace. The
  // role switcher is rendered only when both are true.
  const [previewRoles, setPreviewRoles] = useState<
    readonly RolePreviewRoleCard[] | null
  >(null);
  const [currentPreviewRoleCode, setCurrentPreviewRoleCode] = useState<
    string | null
  >(null);

  // Resolve the responsive breakpoint via `useSyncExternalStore` so
  // the initial client render reads the actual window width without
  // a cascading `setState` inside a `useEffect`. The store is the
  // window's `resize` event; the snapshot is `resolveBreakpoint()`.
  // The third argument (getServerSnapshot) returns `'desktop'` so
  // SSR and the first client paint agree.
  const breakpoint = useSyncExternalStore(
    subscribeBreakpoint,
    resolveBreakpoint,
    () => 'desktop' as const,
  );

  // Session check on mount. If no valid session, redirect to /login.
  useEffect(() => {
    if (sessionLoadedRef.current) return;
    sessionLoadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const result = await getSession();
      if (cancelled) return;
      if (result.ok) {
        setSession(result.data);
      } else {
        router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Context load after session is established. If any of tenant,
  // organisation, or facility context is missing, redirect safely
  // back to /dashboard so the user can establish the missing
  // context. The shell must never accept scope from URL parameters.
  useEffect(() => {
    if (contextLoadedRef.current) return;
    if (session === null) return;
    contextLoadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const result = await getContext();
      if (cancelled) return;
      if (!result.ok) {
        setRedirecting(true);
        router.replace('/dashboard');
        return;
      }
      const ctx = result.data;
      if (
        ctx.active === null ||
        ctx.activeOrganisation === null ||
        ctx.activeFacility === null
      ) {
        setRedirecting(true);
        router.replace('/dashboard');
        return;
      }
      setContext(ctx);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, router]);

  // Demo Role Preview Mode availability + current preview role
  // load. The shell consults the backend availability endpoint
  // and the current-preview-role endpoint. The role switcher is
  // rendered only when the backend reports `enabled: true` AND
  // the current session is `active` (i.e. belongs to the
  // isolated preview workspace). The shell cannot enable the
  // switcher by changing client-side state.
  useEffect(() => {
    if (previewLoadedRef.current) return;
    if (session === null) return;
    previewLoadedRef.current = true;
    let cancelled = false;
    void (async () => {
      const availResult = await getRolePreviewAvailability();
      if (cancelled) return;
      if (!availResult.ok || !availResult.data.enabled) {
        // Feature disabled or unavailable; leave previewRoles null.
        return;
      }
      setPreviewRoles(availResult.data.roles);
      // Best-effort load of the current preview role; ignore
      // failures (the session may not be a preview session).
      const currentResult = await getCurrentPreviewRole();
      if (cancelled) return;
      if (
        currentResult.ok &&
        currentResult.data.active &&
        currentResult.data.selectedRole !== null
      ) {
        setCurrentPreviewRoleCode(currentResult.data.selectedRole.code);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleSignOut(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (signingOut) return;
    setError(null);
    setSigningOut(true);
    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setError(copy.signOutLabel);
      setSigningOut(false);
      return;
    }
    const logoutResult = await logout(csrfResult.data.token);
    if (!logoutResult.ok) {
      setError(copy.signOutLabel);
      setSigningOut(false);
      return;
    }
    router.replace('/login');
  }

  if (loading || session === null || context === null || redirecting) {
    return (
      <div className="ih-clinic-admin-loading" role="status" aria-live="polite">
        <p className="ih-visually-hidden">{copy.loadingMessage}</p>
        <span className="ih-clinic-admin-loading__spinner" aria-hidden="true" />
      </div>
    );
  }

  const activeTenant: ActiveTenantContext | null = context.active;
  const activeOrganisation: ActiveOrganisationContext | null =
    context.activeOrganisation;
  const activeFacility: ActiveFacilityContext | null = context.activeFacility;

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const compact = isTablet; // tablet collapses to icon rail

  // On desktop, the sidebar is always visible. On tablet, it is
  // always visible but compact. On mobile, it is a drawer.
  const sidebarVisible = !isMobile || sidebarOpen;

  return (
    <div className="ih-clinic-admin-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <ClinicAdminHeader
        sectionTitle={sectionTitle}
        activeTenant={activeTenant}
        activeOrganisation={activeOrganisation}
        activeFacility={activeFacility}
        displayName={session.user.displayName}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        onToggleSidebar={isMobile ? () => setSidebarOpen((v) => !v) : undefined}
        previewRoles={previewRoles}
        currentPreviewRoleCode={currentPreviewRoleCode}
      />
      <div className="ih-clinic-admin-shell__body">
        {sidebarVisible && (
          <>
            <ClinicAdminSidebar
              activeKey="overview"
              compact={compact}
              onNavigate={() => {
                // In shell v1, the only routable sidebar item is
                // `overview`, whose target is the current page.
                // Close the mobile drawer if open.
                setSidebarOpen(false);
              }}
            />
            {isMobile && (
              <button
                type="button"
                className="ih-clinic-admin-shell__scrim"
                aria-label={copy.sidebarToggleLabel}
                onClick={() => setSidebarOpen(false)}
                tabIndex={-1}
              />
            )}
          </>
        )}
        <main className="ih-clinic-admin-shell__main" id="main-content">
          {children}
          {error !== null && (
            <p
              className="ih-status ih-status--error"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
