/**
 * Bilingual copy for the Demo Role Preview Mode UI.
 *
 * Per the Demo Role Preview Mode v1 specification, the feature is
 * clearly labelled `Development Role Preview`. The copy is
 * deliberately honest about the feature's development-only nature
 * and about which roles have implemented interfaces.
 *
 * The copy contains NO credentials, NO secrets, NO internal UUIDs,
 * and NO fake business data.
 */

/**
 * The complete bilingual copy for Demo Role Preview Mode.
 */
export interface RolePreviewCopy {
  /** The page H1, clearly labelled as development. */
  readonly pageTitle: string;
  /** A subtitle explaining what the page does. */
  readonly pageSubtitle: string;
  /** The eyebrow chip above the page title. */
  readonly pageEyebrow: string;
  /** The card section title for the role grid. */
  readonly rolesSectionTitle: string;
  /** The empty state title when the feature is unavailable. */
  readonly unavailableTitle: string;
  /** The empty state body when the feature is unavailable. */
  readonly unavailableBody: string;
  /** Label for the role code field on a role card. */
  readonly roleCodeLabel: string;
  /** Label for the role scope field on a role card. */
  readonly roleScopeLabel: string;
  /** Label for the role category field on a role card. */
  readonly roleCategoryLabel: string;
  /** Label for the role interface status field on a role card. */
  readonly interfaceStatusLabel: string;
  /** Text shown when the role's interface is implemented. */
  readonly interfaceImplemented: string;
  /** Text shown when the role's interface is not implemented. */
  readonly interfaceNotImplemented: string;
  /** Button label for selecting a role. */
  readonly selectButton: string;
  /** Button label shown while the select request is in flight. */
  readonly selecting: string;
  /** Button label for ending the preview session. */
  readonly endPreviewButton: string;
  /** Button label shown while the end request is in flight. */
  readonly endingPreview: string;
  /** Status message shown when the role switch succeeded. */
  readonly switchSucceeded: string;
  /** Status message shown when the role switch failed. */
  readonly switchFailed: string;
  /** Status message shown when the end succeeded. */
  readonly endSucceeded: string;
  /** Status message shown when the end failed. */
  readonly endFailed: string;
  /** Title for the role-status view shown when a non-R09 role is selected. */
  readonly roleStatusTitle: string;
  /** Body for the role-status view shown when a non-R09 role is selected. */
  readonly roleStatusBody: string;
  /** Label for the preview tenant context chip. */
  readonly previewTenantLabel: string;
  /** Label for the preview organisation context chip. */
  readonly previewOrganisationLabel: string;
  /** Label for the preview facility context chip. */
  readonly previewFacilityLabel: string;
  /** Label for the current role chip. */
  readonly currentRoleLabel: string;
  /** Label for the role switcher trigger button (in the header). */
  readonly switcherLabel: string;
  /** Label for the role switcher dropdown. */
  readonly switcherDropdownLabel: string;
  /** Label for the "switch to R09" navigation action. */
  readonly navigateToClinicAdmin: string;
  /** Loading message. */
  readonly loadingMessage: string;
  /** Arabic display name for the tenant scope level. */
  readonly scopeTenant: string;
  /** Arabic display name for the organisation scope level. */
  readonly scopeOrganisation: string;
  /** Arabic display name for the facility scope level. */
  readonly scopeFacility: string;
  /** Arabic display name for the clinical category. */
  readonly categoryClinical: string;
  /** Arabic display name for the operational category. */
  readonly categoryOperational: string;
  /** Arabic display name for the administrative category. */
  readonly categoryAdministrative: string;
  /** Arabic display name for the platform category. */
  readonly categoryPlatform: string;
}

/**
 * The Arabic copy for Demo Role Preview Mode.
 */
export const ROLE_PREVIEW_COPY_AR: RolePreviewCopy = {
  pageTitle: 'معاينة الأدوار (وضع التطوير)',
  pageSubtitle:
    'بدّل بين الأدوار الأساسية الأربعة عشر (R01–R14) لمعاينة النظام دون إدخال بيانات الاعتماد يدويًا. هذه الميزة مخصصة للتطوير فقط وغير متاحة في الإنتاج.',
  pageEyebrow: 'وضع التطوير',
  rolesSectionTitle: 'الأدوار الأساسية',
  unavailableTitle: 'وضع المعاينة غير متاح',
  unavailableBody:
    'معاينة الأدوار متاحة في بيئة التطوير فقط وعند تفعيل العلم الخادمي. النظام يعمل الآن في وضع الإنتاج أو مع العلم معطّل. لا يمكن تشغيل الميزة من المتصفح.',
  roleCodeLabel: 'الرمز',
  roleScopeLabel: 'النطاق',
  roleCategoryLabel: 'الفئة',
  interfaceStatusLabel: 'حالة الواجهة',
  interfaceImplemented: 'الواجهة منفّذة',
  interfaceNotImplemented: 'الواجهة غير منفّذة بعد',
  selectButton: 'معاينة كـ',
  selecting: 'جارٍ التبديل…',
  endPreviewButton: 'إنهاء المعاينة',
  endingPreview: 'جارٍ الإنهاء…',
  switchSucceeded: 'تم التبديل إلى الدور المحدد.',
  switchFailed: 'تعذّر التبديل إلى الدور المحدد.',
  endSucceeded: 'تم إنهاء المعاينة.',
  endFailed: 'تعذّر إنهاء المعاينة.',
  roleStatusTitle: 'هذه الواجهة غير منفّذة بعد',
  roleStatusBody:
    'تم إنشاء جلسة معاينة حقيقية لهذا الدور. لا توجد واجهة منتج خاصة بالدور منفّذة بعد؛ استخدم قائمة التبديل لمعاينة دور آخر.',
  previewTenantLabel: 'المستأجر',
  previewOrganisationLabel: 'المؤسسة',
  previewFacilityLabel: 'المنشأة',
  currentRoleLabel: 'الدور الحالي',
  switcherLabel: 'تبديل الدور',
  switcherDropdownLabel: 'اختر دورًا للمعاينة',
  navigateToClinicAdmin: 'الذهاب إلى إدارة المنشأة',
  loadingMessage: 'جارٍ التحميل…',
  scopeTenant: 'نطاق المستأجر',
  scopeOrganisation: 'نطاق المؤسسة',
  scopeFacility: 'نطاق المنشأة',
  categoryClinical: 'سريري',
  categoryOperational: 'تشغيلي',
  categoryAdministrative: 'إداري',
  categoryPlatform: 'منصة',
};

/**
 * The English copy for Demo Role Preview Mode.
 */
export const ROLE_PREVIEW_COPY_EN: RolePreviewCopy = {
  pageTitle: 'Role Preview (Development Mode)',
  pageSubtitle:
    'Switch between the fourteen canonical roles (R01–R14) to preview the system without entering credentials. This feature is development-only and unavailable in production.',
  pageEyebrow: 'Development Mode',
  rolesSectionTitle: 'Canonical roles',
  unavailableTitle: 'Preview Mode unavailable',
  unavailableBody:
    'Role Preview is available only in development and when the server-side flag is enabled. The system is currently in production mode or the flag is disabled. The feature cannot be enabled from the browser.',
  roleCodeLabel: 'Code',
  roleScopeLabel: 'Scope',
  roleCategoryLabel: 'Category',
  interfaceStatusLabel: 'Interface status',
  interfaceImplemented: 'Interface implemented',
  interfaceNotImplemented: 'Interface not implemented yet',
  selectButton: 'Preview as',
  selecting: 'Switching…',
  endPreviewButton: 'End preview',
  endingPreview: 'Ending…',
  switchSucceeded: 'Switched to the selected role.',
  switchFailed: 'Could not switch to the selected role.',
  endSucceeded: 'Preview session ended.',
  endFailed: 'Could not end the preview session.',
  roleStatusTitle: 'This interface is not implemented yet',
  roleStatusBody:
    'A real preview session has been created for this role. No role-specific product interface is implemented yet; use the switcher to preview a different role.',
  previewTenantLabel: 'Tenant',
  previewOrganisationLabel: 'Organisation',
  previewFacilityLabel: 'Facility',
  currentRoleLabel: 'Current role',
  switcherLabel: 'Switch role',
  switcherDropdownLabel: 'Choose a role to preview',
  navigateToClinicAdmin: 'Go to Clinic Admin',
  loadingMessage: 'Loading…',
  scopeTenant: 'Tenant scope',
  scopeOrganisation: 'Organisation scope',
  scopeFacility: 'Facility scope',
  categoryClinical: 'Clinical',
  categoryOperational: 'Operational',
  categoryAdministrative: 'Administrative',
  categoryPlatform: 'Platform',
};

/**
 * Resolve the copy for the supplied language. Arabic is the default.
 */
export function getRolePreviewCopy(lang: 'ar' | 'en'): RolePreviewCopy {
  return lang === 'ar' ? ROLE_PREVIEW_COPY_AR : ROLE_PREVIEW_COPY_EN;
}
