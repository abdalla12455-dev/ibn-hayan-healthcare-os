"use client";

import type { ReactElement } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { LanguageSwitch } from "@/components/marketing/language-switch";

import type { Language, Direction } from "@/components/i18n/language-context";

import { PLATFORM_ADMIN_COPY } from "./platform-admin-copy";

export interface PlatformAdminOverviewViewProps {
  readonly displayName: string;
  readonly lang: Language;
  readonly dir: Direction;
  readonly signingOut: boolean;
  readonly logoutError: boolean;
  readonly showSignOut?: boolean;
  readonly onSignOut: () => void;
}

const LABELS = {
  ar: {
    product: "نظام ابن حيان التشغيلي",
    platform: "إدارة المنصة",
    search: "البحث غير متاح حالياً",
    notifications: "الإشعارات",
    account: "حساب مدير المنصة",
    preview: "معاينة التصميم",
    heading: "نظرة عامة على المنصة",
    subtitle: "ملخص حالة المنصة والمؤسسات المسجلة.",
    metrics: [
      "إجمالي المؤسسات",
      "الاشتراكات النشطة",
      "فترة السماح",
      "حجوزات اليوم",
      "المرضى الجدد",
    ],
    unavailable: "بانتظار ربط البيانات",
    organisations: "نشاط المؤسسات الأخير",
    organisationName: "اسم المؤسسة",
    type: "النوع",
    status: "الحالة",
    region: "المنطقة",
    activity: "آخر نشاط",
    emptyOrganisations:
      "بيانات المؤسسات غير متاحة بعد. سيتم عرض السجلات الفعلية بعد ربط خدمة إدارة المؤسسات.",
    alerts: "تنبيهات النظام",
    emptyAlerts: "لم يتم ربط خدمة تنبيهات النظام بعد.",
    actions: "إجراءات سريعة",
    createOrganisation: "إضافة مؤسسة",
    support: "الدعم الفني",
    notReady: "غير مفعّل بعد",
    tenantStatus: "ملخص حالات المؤسسات",
    emptyStatus: "سيظهر توزيع حالات المؤسسات بعد ربط البيانات الفعلية.",
    navigation: [
      "نظرة عامة",
      "المؤسسات",
      "إدارة المستخدمين",
      "الاشتراكات والفوترة",
      "تحليلات النظام",
      "الإعدادات العامة",
    ],
    intro:
      "هذه نسخة أولية من لوحة إدارة المنصة. ستظهر البيانات والإجراءات عند اكتمال ربط خدماتها.",
    previewIntro: "هذه معاينة بصرية فقط. لا توجد جلسة إدارية أو بيانات حقيقية.",
    soon: "قيد التطوير",
    logout: "تسجيل الخروج",
    signingOut: "جارٍ تسجيل الخروج…",
    logoutError: "تعذّر تسجيل الخروج. حاول مجدداً.",
  },

  en: {
    product: "Ibn Hayan Healthcare OS",
    platform: "Platform Administration",
    search: "Search is not available yet",
    notifications: "Notifications",
    account: "Platform administrator",
    preview: "Design preview",
    heading: "Platform Overview",
    subtitle: "An overview of the platform and registered organisations.",
    metrics: [
      "Total Organisations",
      "Active Subscriptions",
      "Grace Period",
      "Today's Bookings",
      "New Patients",
    ],
    unavailable: "Awaiting data integration",
    organisations: "Recent Organisations",
    organisationName: "Organisation Name",
    type: "Type",
    status: "Status",
    region: "Region",
    activity: "Last Activity",
    emptyOrganisations:
      "Organisation data is not available yet. Actual records will appear after the organisation service is integrated.",
    alerts: "System Alerts",
    emptyAlerts: "The system alerts service has not been connected yet.",
    actions: "Quick Actions",
    createOrganisation: "Add Organisation",
    support: "Support Console",
    notReady: "Not enabled yet",
    tenantStatus: "Tenant Status Summary",
    emptyStatus:
      "The tenant status breakdown will appear when actual data is available.",
    navigation: [
      "Platform Overview",
      "Organisations",
      "User Management",
      "Billing & Subscriptions",
      "System Analytics",
      "Global Settings",
    ],
    intro:
      "This administration workspace is under development. Data and administrative actions will become available as their services are integrated.",
    previewIntro:
      "Visual preview only. No administrator session or real data is available.",
    soon: "In development",
    logout: "Sign out",
    signingOut: "Signing out…",
    logoutError: "Sign out failed. Please try again.",
  },
} as const;

const BORDER = "border-[#d8e0e8]";

function NavigationIcon({ index }: { readonly index: number }): ReactElement {
  const paths = [
    "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    "M4 21V5h10v16 M14 10h6v11 M8 9h2 M8 13h2 M8 17h2",
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    "M4 3h16v18l-4-2-4 2-4-2-4 2z M8 8h8 M8 12h8",
    "M3 17l6-6 4 4 8-9 M3 21h18",
    "M12 2l2 3 4-.5.5 4 3 2-3 2-.5 4-4-.5-2 3-2-3-4 .5-.5-4-3-2 3-2 .5-4 4 .5z",
  ];

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[index] ?? paths[0]} />
    </svg>
  );
}

export function PlatformAdminOverviewView({
  displayName,
  lang,
  dir,
  signingOut,
  logoutError,
  showSignOut = true,
  onSignOut,
}: PlatformAdminOverviewViewProps): ReactElement {
  const labels = LABELS[lang];
  const copy = PLATFORM_ADMIN_COPY[lang];

  return (
    <div
      dir={dir}
      className="flex min-h-screen flex-col bg-[#f8fafc] text-[#24313d] lg:flex-row"
    >
      {/* Shared sidebar: right in RTL, left in LTR. */}
      <aside
        className={`flex w-full flex-col border-b ${BORDER} bg-white lg:min-h-screen lg:w-[270px] lg:shrink-0 lg:border-b-0 lg:border-e`}
      >
        <div className={`border-b ${BORDER} px-5 py-6`}>
          <BrandMark />
          <p className="mt-3 text-xs text-[#64748b]">{labels.platform}</p>
        </div>

        <nav
          aria-label={copy.title}
          className="flex flex-wrap gap-1 p-3 lg:flex-col lg:gap-2 lg:p-4"
        >
          {labels.navigation.map((item, index) => (
            <div
              key={item}
              aria-current={index === 0 ? "page" : undefined}
              aria-disabled={index === 0 ? undefined : true}
              className={
                index === 0
                  ? "flex min-h-11 items-center gap-3 rounded-lg bg-[#d8efff] px-4 py-3 text-sm font-semibold text-[#173d53]"
                  : "flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm text-[#64748b]"
              }
            >
              <NavigationIcon index={index} />

              <span>{item}</span>
            </div>
          ))}
        </nav>

        <div className="mt-auto hidden px-6 pb-7 pt-8 text-sm text-[#64748b] lg:block">
          <p>{labels.support}</p>
          <p className="mt-1 text-xs">{labels.notReady}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: no fake search, notifications, or account actions. */}
        <header
          className={`flex flex-wrap items-center justify-between gap-4 border-b ${BORDER} bg-white px-5 py-4 xl:px-8`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#173d53] text-sm font-semibold text-white">
              {displayName.slice(0, 1)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-[#64748b]">
                {showSignOut ? labels.account : labels.preview}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`hidden rounded-lg border ${BORDER} bg-[#f8fafc] px-4 py-2 text-sm text-[#64748b] sm:block`}
            >
              {labels.search}
            </div>

            <LanguageSwitch />

            {showSignOut && (
              <button
                type="button"
                disabled={signingOut}
                onClick={onSignOut}
                className={`rounded-lg border ${BORDER} px-4 py-2 text-sm font-medium text-[#173d53] hover:bg-[#f1f5f9] disabled:opacity-50`}
              >
                {signingOut ? labels.signingOut : labels.logout}
              </button>
            )}
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 p-4 sm:p-6 xl:p-8">
          <div className="mx-auto max-w-[1500px]">
            {/* Page heading. */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#173d53] sm:text-3xl">
                  {lang === "ar" ? copy.overview : labels.heading}
                </h1>

                <p className="mt-2 text-sm text-[#64748b]">{labels.subtitle}</p>
              </div>

              <span
                className={`rounded-lg border ${BORDER} bg-white px-3 py-2 text-xs text-[#64748b]`}
              >
                {labels.soon}
              </span>
            </div>

            {/* Honest data-state explanation. */}
            <div
              className={`mb-6 rounded-lg border ${BORDER} bg-white px-5 py-4 text-sm text-[#475569]`}
            >
              <p className="font-semibold text-[#173d53]">
                {copy.welcome} {displayName}
              </p>

              <p className="mt-1">
                {showSignOut ? labels.intro : labels.previewIntro}
              </p>
            </div>

            {/* Five metric slots matching the approved structure. */}
            <section
              aria-label={labels.heading}
              className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
            >
              {labels.metrics.map((metric, index) => (
                <div
                  key={metric}
                  className={`min-h-[145px] rounded-lg border ${BORDER} bg-white p-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-medium text-[#475569]">
                      {metric}
                    </h2>

                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eaf3f8] text-sm font-semibold text-[#173d53]"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <p className="mt-7 text-sm text-[#64748b]">
                    {labels.unavailable}
                  </p>
                </div>
              ))}
            </section>

            {/* Main content and system sidebar. */}
            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <div className="min-w-0 space-y-5">
                <section
                  className={`overflow-hidden rounded-lg border ${BORDER} bg-white`}
                >
                  <div className={`border-b ${BORDER} px-5 py-4`}>
                    <h2 className="text-lg font-semibold">
                      {labels.organisations}
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-sm">
                      <thead className="bg-[#f4f7fa] text-[#475569]">
                        <tr>
                          {[
                            labels.organisationName,
                            labels.type,
                            labels.status,
                            labels.region,
                            labels.activity,
                          ].map((heading) => (
                            <th
                              key={heading}
                              scope="col"
                              className="px-4 py-3 text-start font-medium"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-12 text-center text-sm leading-7 text-[#64748b]"
                          >
                            {labels.emptyOrganisations}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={`rounded-lg border ${BORDER} bg-white p-5`}>
                  <h2 className="text-lg font-semibold">
                    {labels.tenantStatus}
                  </h2>

                  <div className="mt-5 rounded-lg bg-[#f4f7fa] px-4 py-6 text-sm text-[#64748b]">
                    {labels.emptyStatus}
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-5">
                <section className={`rounded-lg border ${BORDER} bg-white p-5`}>
                  <h2 className="text-lg font-semibold">{labels.alerts}</h2>

                  <div
                    className={`mt-4 border-t ${BORDER} py-6 text-sm leading-7 text-[#64748b]`}
                  >
                    {labels.emptyAlerts}
                  </div>
                </section>

                <section className={`rounded-lg border ${BORDER} bg-white p-5`}>
                  <h2 className="text-lg font-semibold">{labels.actions}</h2>

                  <div className="mt-4 space-y-3">
                    {[labels.createOrganisation, labels.support].map(
                      (action) => (
                        <div
                          key={action}
                          aria-disabled="true"
                          className={`rounded-lg border ${BORDER} px-4 py-3`}
                        >
                          <p className="text-sm font-medium">{action}</p>

                          <p className="mt-1 text-xs text-[#64748b]">
                            {labels.notReady}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </section>
              </div>
            </div>

            {logoutError && (
              <p role="alert" className="mt-5 text-sm text-red-700">
                {labels.logoutError}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
