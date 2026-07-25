/**
 * Bilingual copy for the Clinic Admin application shell v1.
 *
 * This module is the single source of truth for all user-facing
 * presentation text rendered inside the `/clinic-admin` shell. It
 * holds no runtime state, performs no network requests, and reads no
 * environment variables.
 *
 * The Arabic copy is the canonical source; the English copy is its
 * equal-quality counterpart (per
 * `download/docs/05_UI_UX/ENTERPRISE_DESIGN_BRIEF.md` §3.1 and §3.2).
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17:
 * - The canonical Arabic role label is `مدير المنشأة`.
 * - The canonical English role label is `Clinic Administrator`.
 * - The sidebar contains exactly eleven items in the binding order
 *   recorded below. Notifications are not a sidebar item.
 * - The page does not invent business data; unimplemented regions
 *   use clearly structured neutral empty states.
 *
 * The copy does NOT expose developer notes, implementation-status
 * language, or internal technical terminology to normal users.
 */

export interface ClinicAdminSidebarItem {
  /** Stable key for the navigation item. */
  readonly key: string;
  /** English label. */
  readonly en: string;
  /** Arabic label. */
  readonly ar: string;
  /**
   * Whether the underlying module is implemented and routable. When
   * `false`, the sidebar renders the item in an honest disabled
   * "planned" state without linking to a placeholder business route.
   *
   * Only `overview` is routable in shell v1; every other module is
   * pending its vertical slice.
   */
  readonly implemented: boolean;
}

/**
 * The canonical eleven-item sidebar navigation, in binding order.
 * The order and the bilingual labels are ratified in
 * `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17.2.
 *
 * This array is frozen at module load. Consumers must not mutate it.
 */
export const CLINIC_ADMIN_SIDEBAR_ITEMS: readonly ClinicAdminSidebarItem[] =
  Object.freeze([
    { key: 'overview', en: 'Overview', ar: 'نظرة عامة', implemented: true },
    { key: 'appointments', en: 'Appointments', ar: 'المواعيد', implemented: false },
    { key: 'patients', en: 'Patients', ar: 'المرضى', implemented: false },
    { key: 'doctors', en: 'Doctors', ar: 'الأطباء', implemented: false },
    { key: 'staff-attendance', en: 'Staff & Attendance', ar: 'الموظفون والحضور', implemented: false },
    { key: 'waiting-room', en: 'Waiting Room', ar: 'قاعة الانتظار', implemented: false },
    { key: 'services-procedures', en: 'Services & Procedures', ar: 'الخدمات والإجراءات', implemented: false },
    { key: 'billing-payments', en: 'Billing & Payments', ar: 'الفوترة والمدفوعات', implemented: false },
    { key: 'inventory', en: 'Inventory', ar: 'المخزون', implemented: false },
    { key: 'reports-analytics', en: 'Reports & Analytics', ar: 'التقارير والتحليلات', implemented: false },
    { key: 'settings', en: 'Settings', ar: 'الإعدادات', implemented: false },
  ] as const);

export interface ClinicAdminCopy {
  /** Application surface label. */
  readonly surfaceLabel: string;
  /** Canonical role label. */
  readonly roleLabel: string;
  /** Current-section label rendered in the header. */
  readonly currentSectionLabel: string;
  /** Breadcrumb label for the shell root. */
  readonly breadcrumbRoot: string;
  /** Active-organisation context label. */
  readonly organisationContextLabel: string;
  /** Active-facility context label. */
  readonly facilityContextLabel: string;
  /** Active-tenant context label. */
  readonly tenantContextLabel: string;
  /** Language control label. */
  readonly languageControlLabel: string;
  /** Notification bell label. */
  readonly notificationBellLabel: string;
  /** Notification panel title. */
  readonly notificationPanelTitle: string;
  /** Notification panel empty-state title. */
  readonly notificationEmptyTitle: string;
  /** Notification panel empty-state body. */
  readonly notificationEmptyBody: string;
  /** Notification panel close affordance. */
  readonly notificationCloseLabel: string;
  /** User menu sign-out action. */
  readonly signOutLabel: string;
  /** User menu account label. */
  readonly accountLabel: string;
  /** Sidebar collapse/expand toggle label. */
  readonly sidebarToggleLabel: string;
  /** Planned/disabled module affordance. */
  readonly plannedLabel: string;
  /** Overview page title (H1). */
  readonly overviewTitle: string;
  /** Overview page subtitle. */
  readonly overviewSubtitle: string;
  /** Overview foundation region title. */
  readonly overviewFoundationTitle: string;
  /** Overview foundation region body. */
  readonly overviewFoundationBody: string;
  /** Loading state message. */
  readonly loadingMessage: string;
  /** Missing-context redirect notice (rendered on /dashboard). */
  readonly enterClinicAdminLabel: string;
}

const AR_COPY: ClinicAdminCopy = {
  surfaceLabel: 'إدارة المنشأة',
  roleLabel: 'مدير المنشأة',
  currentSectionLabel: 'القسم الحالي',
  breadcrumbRoot: 'إدارة المنشأة',
  tenantContextLabel: 'بيئة العمل',
  organisationContextLabel: 'المؤسسة',
  facilityContextLabel: 'المنشأة',
  languageControlLabel: 'تبديل اللغة',
  notificationBellLabel: 'الإشعارات',
  notificationPanelTitle: 'الإشعارات',
  notificationEmptyTitle: 'لا توجد إشعارات بعد',
  notificationEmptyBody:
    'سيظهر هنا أي إشعار تشغيلي أو تنبيه مستقبلي مرتبط بمنشأتك النشطة، بمجرد توفّر الواجهة الخلفية للإشعارات.',
  notificationCloseLabel: 'إغلاق لوحة الإشعارات',
  signOutLabel: 'تسجيل الخروج',
  accountLabel: 'الحساب',
  sidebarToggleLabel: 'إظهار/إخفاء القائمة',
  plannedLabel: 'قادم',
  overviewTitle: 'نظرة عامة',
  overviewSubtitle:
    'مساحة العمل التشغيلية لمنشأتك النشطة. ستحلّ الأقسام التشغيلية تدريجيًا محل هذه المساحة.',
  overviewFoundationTitle: 'أساس نظرة عامة المنشأة',
  overviewFoundationBody:
    'هذه المساحة هي أساس إدارة المنشأة. ستظهر هنا بطقات الأعمال الحقيقية — المواعيد، المرضى، الأطباء، الفوترة، المخزون، قاعة الانتظار، الحضور، والتحليلات — بمجرد تنفيذ شرائحها الرأسية المعتمدة.',
  loadingMessage: 'جارٍ تحميل مساحة إدارة المنشأة…',
  enterClinicAdminLabel: 'الدخول إلى إدارة المنشأة',
};

const EN_COPY: ClinicAdminCopy = {
  surfaceLabel: 'Clinic Admin',
  roleLabel: 'Clinic Administrator',
  currentSectionLabel: 'Current section',
  breadcrumbRoot: 'Clinic Admin',
  tenantContextLabel: 'Workspace',
  organisationContextLabel: 'Organisation',
  facilityContextLabel: 'Facility',
  languageControlLabel: 'Switch language',
  notificationBellLabel: 'Notifications',
  notificationPanelTitle: 'Notifications',
  notificationEmptyTitle: 'No notifications yet',
  notificationEmptyBody:
    'Future operational notifications and alerts for your active facility will appear here once the notification backend is implemented.',
  notificationCloseLabel: 'Close notifications panel',
  signOutLabel: 'Sign out',
  accountLabel: 'Account',
  sidebarToggleLabel: 'Toggle navigation',
  plannedLabel: 'Planned',
  overviewTitle: 'Overview',
  overviewSubtitle:
    'The operational workspace for your active facility. Operational regions will progressively populate this space.',
  overviewFoundationTitle: 'Clinic Admin Overview foundation',
  overviewFoundationBody:
    'This space is the Clinic Admin foundation. Real business regions — appointments, patients, doctors, billing, inventory, waiting room, attendance, and analytics — will appear here once their approved vertical slices are implemented.',
  loadingMessage: 'Loading Clinic Admin workspace…',
  enterClinicAdminLabel: 'Enter Clinic Admin',
};

export const CLINIC_ADMIN_COPY: Readonly<Record<'ar' | 'en', ClinicAdminCopy>> =
  Object.freeze({
    ar: AR_COPY,
    en: EN_COPY,
  });

/**
 * Resolve the bilingual copy for the given locale.
 *
 * Defaults to Arabic when the locale is not recognised, matching the
 * platform's Arabic-first posture.
 */
export function getClinicAdminCopy(locale: 'ar' | 'en'): ClinicAdminCopy {
  return CLINIC_ADMIN_COPY[locale] ?? AR_COPY;
}
