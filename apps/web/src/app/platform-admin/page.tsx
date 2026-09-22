"use client";

import { PLATFORM_ADMIN_COPY } from "./platform-admin-copy";

import { PlatformAdminOverviewView } from "./platform-admin-overview-view";

import { useEffect, useRef, useState, type ReactElement } from "react";

import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/i18n/language-context";

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

export default function PlatformAdminPage(): ReactElement {
  const router = useRouter();

  const { lang, dir } = useLanguage();

  const copy = PLATFORM_ADMIN_COPY[lang];

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

  return (
    <PlatformAdminOverviewView
      displayName={state.displayName}
      lang={lang}
      dir={dir}
      signingOut={signingOut}
      logoutError={logoutError}
      onSignOut={() => void signOut()}
    />
  );
}
