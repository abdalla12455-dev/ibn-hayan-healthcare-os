"use client";

import { useLanguage } from "@/components/i18n/language-context";

import { PlatformAdminOverviewView } from "../platform-admin-overview-view";

export function PlatformAdminVisualPreview() {
  const { lang, dir } = useLanguage();

  return (
    <div dir={dir}>
      <div
        role="note"
        className="border-b border-border bg-[var(--warning-muted)] px-5 py-3 text-center text-sm"
      >
        {lang === "ar"
          ? "معاينة تصميم فقط. لا توجد صلاحيات إدارية أو بيانات حقيقية."
          : "Design preview only. No administrative access or real data."}
      </div>

      <PlatformAdminOverviewView
        displayName={lang === "ar" ? "معاينة التصميم" : "Design Preview"}
        lang={lang}
        dir={dir}
        signingOut={false}
        logoutError={false}
        showSignOut={false}
        onSignOut={() => undefined}
      />
    </div>
  );
}
