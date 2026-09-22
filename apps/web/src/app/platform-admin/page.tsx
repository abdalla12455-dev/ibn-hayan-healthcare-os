"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/i18n/language-context";

import { BrandMark } from "@/components/marketing/brand-mark";

import { LanguageSwitch } from "@/components/marketing/language-switch";

import { getCsrfToken, logout } from "@/lib/api/auth/auth.client";

import {
  getPlatformAdminOverview,
  type PlatformAdminClientResult,
} from "@/lib/api/platform-admin/platform-admin.client";

type PageState =
  | { readonly kind: "loading" }
  | {
      readonly kind: "ready";
      readonly displayName: string;
    }
  | { readonly kind: "denied" }
  | { readonly kind: "error" };

const COPY = {
  ar: {
    title: "إدارة منصة ابن حيان",
    overview: "نظرة عامة",
    organisations: "المؤسسات",
    users: "إدارة المستخدمين",
    billing: "الاشتراكات والفوترة",
    analytics: "تحليلات النظام",
    settings: "الإعدادات العامة",
    welcome: "مرحباً بك،",
    description: "لوحة الإدارة الرئيسية لمنصة ابن حيان.",
    loading: "جارٍ التحقق من صلاحية الوصول…",
    denied: "ليس لديك تصريح للوصول إلى إدارة المنصة.",
    error: "تعذّر تحميل لوحة الإدارة حالياً.",
    retry: "إعادة المحاولة",
    back: "العودة إلى مساحة العمل",
    logout: "تسجيل الخروج",
    signingOut: "جارٍ تسجيل الخروج…",
    unavailable: "غير متاح حالياً",
    sectionDescription:
      "هذا القسم قيد التطوير. لن تظهر بيانات أو إجراءات إدارية قبل ربطها بالخدمة الفعلية.",
    overviewDescription:
      "تم التحقق من هويتك الإدارية عبر الخادم. يجري تجهيز وظائف إدارة المؤسسات والاشتراكات والإعدادات العامة.",
  },
  en: {
    title: "Ibn Hayan Platform Administration",
    overview: "Overview",
    organisations: "Organisations",
    users: "User Management",
    billing: "Billing & Subscriptions",
    analytics: "System Analytics",
    settings: "Global Settings",
    welcome: "Welcome,",
    description: "The main Ibn Hayan administration workspace.",
    loading: "Verifying access…",
    denied: "You are not authorized to access platform administration.",
    error: "The administration workspace could not be loaded.",
    retry: "Try again",
    back: "Back to workspace",
    logout: "Sign out",
    signingOut: "Signing out…",
    unavailable: "Not yet available",
    sectionDescription:
      "This section is under development. Administrative data and actions will appear only after their backend integration is complete.",
    overviewDescription:
      "Your platform access has been verified by the server. Organisation, subscription, and global configuration management are being prepared.",
  },
} as const;

export default function PlatformAdminPage(): ReactElement {
  const router = useRouter();

  const { lang, dir } = useLanguage();

  const copy = COPY[lang];

  const [state, setState] = useState<PageState>({
    kind: "loading",
  });

  const [attempt, setAttempt] = useState(0);

  const [signingOut, setSigningOut] = useState(false);

  const [logoutError, setLogoutError] = useState(false);

  // Keep concurrent requests local to this mounted component.
  // Never cache authenticated data across separate users or sessions.
  const pendingRef = useRef<Promise<PlatformAdminClientResult> | null>(null);

  useEffect(() => {
    let active = true;

    if (pendingRef.current === null) {
      pendingRef.current = getPlatformAdminOverview();
    }

    const request = pendingRef.current;

    void request
      .then((result) => {
        if (!active) return;

        if (result.ok) {
          setState({
            kind: "ready",
            displayName: result.data.administrator.displayName,
          });
          return;
        }

        if (result.error.statusCode === 401) {
          router.replace("/login");
          return;
        }

        if (result.error.statusCode === 403) {
          setState({ kind: "denied" });
          return;
        }

        setState({ kind: "error" });
      })
      .finally(() => {
        if (pendingRef.current === request) {
          pendingRef.current = null;
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, router]);

  function retry(): void {
    pendingRef.current = null;
    setState({ kind: "loading" });
    setAttempt((previous) => previous + 1);
  }

  async function signOut(): Promise<void> {
    if (signingOut) return;

    setSigningOut(true);
    setLogoutError(false);

    const csrf = await getCsrfToken();

    if (!csrf.ok) {
      setSigningOut(false);
      setLogoutError(true);
      return;
    }

    const result = await logout(csrf.data.token);

    if (!result.ok) {
      setSigningOut(false);
      setLogoutError(true);
      return;
    }

    router.replace("/login");
  }

  if (state.kind !== "ready") {
    return (
      <main
        dir={dir}
        className="flex min-h-screen items-center justify-center bg-background px-6"
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm"
          role={state.kind === "loading" ? "status" : "alert"}
        >
          <h1 className="text-2xl font-semibold">{copy.title}</h1>

          <p className="mt-4 text-[var(--text-secondary)]">
            {state.kind === "loading"
              ? copy.loading
              : state.kind === "denied"
                ? copy.denied
                : copy.error}
          </p>

          {state.kind === "error" && (
            <button
              type="button"
              onClick={retry}
              className="mt-6 rounded-lg bg-primary px-5 py-2 text-primary-foreground"
            >
              {copy.retry}
            </button>
          )}

          {state.kind === "denied" && (
            <button
              type="button"
              onClick={() => router.replace("/dashboard")}
              className="mt-6 rounded-lg border border-border px-5 py-2"
            >
              {copy.back}
            </button>
          )}
        </div>
      </main>
    );
  }

  const navigation = [
    copy.overview,
    copy.organisations,
    copy.users,
    copy.billing,
    copy.analytics,
    copy.settings,
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <BrandMark />

          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitch />

            <button
              type="button"
              disabled={signingOut}
              onClick={() => void signOut()}
              className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              {signingOut ? copy.signingOut : copy.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col lg:min-h-[calc(100vh-80px)] lg:flex-row">
        <aside className="w-full border-b border-border bg-surface p-5 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-e">
          <p className="mb-5 text-sm font-semibold text-[var(--text-secondary)]">
            {copy.title}
          </p>

          <nav aria-label={copy.title} className="space-y-2">
            {navigation.map((item, index) => (
              <div key={item}>
                {index === 0 ? (
                  <span
                    aria-current="page"
                    className="block rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    {item}
                  </span>
                ) : (
                  <span
                    aria-disabled="true"
                    className="flex items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm text-[var(--text-muted)]"
                  >
                    <span>{item}</span>
                    <span className="text-xs">{copy.unavailable}</span>
                  </span>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {copy.description}
            </p>

            <h1 className="mt-2 text-3xl font-semibold">{copy.overview}</h1>
          </div>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold">
              {copy.welcome} {state.displayName}
            </h2>

            <p className="mt-4 max-w-2xl text-[var(--text-secondary)]">
              {copy.overviewDescription}
            </p>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="text-lg font-semibold">{copy.unavailable}</h2>

            <p className="mt-3 text-[var(--text-secondary)]">
              {copy.sectionDescription}
            </p>
          </section>

          {logoutError && (
            <p role="alert" className="mt-5 text-danger">
              {copy.error}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
