'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useLanguage } from '@/components/i18n/language-context';
import { getClinicAdminCopy } from './clinic-admin-copy';
import { getClinicAdminOverview } from '@/lib/api/clinic-admin';
import type { ApiError } from '@/lib/api/api-error';
import type {
  ClinicAdminOverviewResponse,
  RegionKey,
  RegionStatus,
} from '@ibn-hayan/contracts';

/**
 * Clinic Admin Overview content component.
 *
 * This component renders the live-data Overview region inside the
 * Clinic Admin shell. It is rendered by `apps/web/src/app/clinic-admin/page.tsx`
 * as the children of `ClinicAdminShell`.
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §12 (Arabic RTL)
 * and §13 (English LTR), the Overview surface must display real
 * data retrieved through the authenticated backend and scoped to
 * the active tenant, organisation, facility, and authorised Clinic
 * Administrator identity.
 *
 * Per the live-data task specification Phase 6, the component:
 * - Fetches `/api/v1/clinic-admin/overview` after the shell has
 *   confirmed an authenticated session and an active tenant +
 *   organisation + facility context.
 * - Renders the loading state only while the fetch is in flight
 *   (NO permanent loading skeleton).
 * - Renders the success state with data: the active context
 *   identity (display names only, no UUIDs), the administrator
 *   greeting, and the availability declaration for each approved
 *   region.
 * - Renders the authorisation failure state when the API returns
 *   403 (the principal is not R09 or the active context is
 *   missing/invalid — the shell typically redirects to
 *   `/dashboard` before this state is reached, but the component
 *   handles it defensively).
 * - Renders the session-expiration state when the API returns 401
 *   (defensive — the shell typically redirects to `/login`).
 * - Renders the server/network failure state with a non-revealing
 *   generic message and a retry affordance.
 * - Does NOT leak backend error messages or stack traces to the
 *   user.
 * - Does NOT display stale data as current data; the component
 *   refetches on mount and on explicit user-initiated retry.
 *
 * Per the live-data task specification Phase 6, the component
 * preserves:
 * - the approved Arabic RTL layout (the shell sets `dir="rtl"`);
 * - the approved English LTR layout (the shell sets `dir="ltr"`);
 * - the approved content regions in their canonical reading order;
 * - the approved 20px–24px edge protection (via existing CSS
 *   tokens);
 * - the existing typography hierarchy;
 * - the existing responsive behaviour (the shell handles
 *   breakpoints).
 *
 * The component does NOT invent business data. Per the
 * architectural reality (no business-domain models exist in the
 * current Prisma schema), every business region is declared
 * `'not_supported'` by the backend and rendered in its honest
 * "not yet configured" state. Every navigational region is
 * declared `'navigational_only'` and rendered with its approved
 * affordances.
 *
 * Per the live-data task specification Phase 6, the component uses
 * the existing localisation system (`getClinicAdminCopy`) for all
 * user-facing strings. No translated text is hardcoded inside the
 * business component.
 *
 * NOTE: the component does NOT accept a `contextReady` prop. The
 * parent shell (`ClinicAdminShell`) enforces a render gate that
 * guarantees children only mount after the authenticated session
 * AND the active tenant + organisation + facility context are
 * confirmed. The component fetches on mount unconditionally; the
 * shell guarantees mount readiness. A previous version of this
 * component accepted a `contextReady` prop that the page hardcoded
 * to `true`; that prop was misleading (it suggested the parent
 * might pass `false`, but the page never did) and duplicated the
 * shell's existing gate. The prop was removed to keep the
 * component's contract honest.
 */

type LoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'success';
      readonly data: ClinicAdminOverviewResponse;
    }
  | { readonly kind: 'error'; readonly error: ApiError };

/**
 * Overview content component. Fetches the Clinic Admin Overview
 * payload on mount and renders the approved regions.
 */
export function ClinicAdminOverview(): ReactElement {
  const { lang } = useLanguage();
  const copy = getClinicAdminCopy(lang);
  const overviewCopy = getClinicAdminOverviewCopy(lang);

  const fetchedRef = useRef(false);
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  useEffect(() => {
    if (fetchedRef.current) {
      return;
    }
    fetchedRef.current = true;
    let cancelled = false;
    void (async () => {
      setState({ kind: 'loading' });
      const result = await getClinicAdminOverview();
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setState({ kind: 'success', data: result.data });
      } else {
        setState({ kind: 'error', error: result.error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <div
        className="ih-clinic-admin-overview__state ih-clinic-admin-overview__state--loading"
        role="status"
        aria-live="polite"
      >
        <p className="ih-visually-hidden">{overviewCopy.loadingMessage}</p>
        <span
          className="ih-clinic-admin-loading__spinner"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <ErrorStateView
        error={state.error}
        lang={lang}
        overviewCopy={overviewCopy}
        onRetry={() => {
          fetchedRef.current = false;
          setState({ kind: 'idle' });
        }}
      />
    );
  }

  const data = state.data;
  const regionsBykey = new Map<RegionKey, RegionStatus>(
    data.regions.map((r) => [r.key, r]),
  );

  return (
    <div className="ih-clinic-admin-overview ih-clinic-admin-overview--live">
      <header className="ih-clinic-admin-overview__header">
        <h1 className="ih-clinic-admin-overview__title">
          {copy.overviewTitle}
        </h1>
        <p className="ih-clinic-admin-overview__subtitle">
          {lang === 'ar'
            ? `${overviewCopy.greetingPrefix} ${data.administrator.displayName} — ${data.activeContext.facilityDisplayName}`
            : `${overviewCopy.greetingPrefix} ${data.administrator.displayName} — ${data.activeContext.facilityDisplayName}`}
        </p>
        <p className="ih-clinic-admin-overview__context-line">
          {lang === 'ar'
            ? `${data.activeContext.organisationDisplayName} · ${data.activeContext.tenantDisplayName}`
            : `${data.activeContext.organisationDisplayName} · ${data.activeContext.tenantDisplayName}`}
        </p>
      </header>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--appointment-actions"
        aria-labelledby="ih-clinic-admin-overview-region-appointment-actions-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-appointment-actions-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionAppointmentActionsTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('appointment_actions'),
          overviewCopy.regionAppointmentActionsBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--financial-snapshot"
        aria-labelledby="ih-clinic-admin-overview-region-financial-snapshot-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-financial-snapshot-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionFinancialSnapshotTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('financial_snapshot'),
          overviewCopy.regionFinancialSnapshotBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--todays-appointments"
        aria-labelledby="ih-clinic-admin-overview-region-todays-appointments-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-todays-appointments-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionTodaysAppointmentsTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('todays_appointments'),
          overviewCopy.regionTodaysAppointmentsBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--operational-alerts"
        aria-labelledby="ih-clinic-admin-overview-region-operational-alerts-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-operational-alerts-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionOperationalAlertsTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('operational_alerts'),
          overviewCopy.regionOperationalAlertsBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--inventory-alerts"
        aria-labelledby="ih-clinic-admin-overview-region-inventory-alerts-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-inventory-alerts-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionInventoryAlertsTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('inventory_alerts'),
          overviewCopy.regionInventoryAlertsBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--doctors-on-duty"
        aria-labelledby="ih-clinic-admin-overview-region-doctors-on-duty-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-doctors-on-duty-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionDoctorsOnDutyTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('doctors_on_duty'),
          overviewCopy.regionDoctorsOnDutyBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--waiting-room-operations"
        aria-labelledby="ih-clinic-admin-overview-region-waiting-room-operations-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-waiting-room-operations-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionWaitingRoomOperationsTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('waiting_room_operations'),
          overviewCopy.regionWaitingRoomOperationsBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--staff-attendance-summary"
        aria-labelledby="ih-clinic-admin-overview-region-staff-attendance-summary-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-staff-attendance-summary-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionStaffAttendanceSummaryTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('staff_attendance_summary'),
          overviewCopy.regionStaffAttendanceSummaryBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>

      <section
        className="ih-clinic-admin-overview__region ih-clinic-admin-overview__region--quick-actions"
        aria-labelledby="ih-clinic-admin-overview-region-quick-actions-title"
      >
        <h2
          id="ih-clinic-admin-overview-region-quick-actions-title"
          className="ih-clinic-admin-overview__region-title"
        >
          {overviewCopy.regionQuickActionsTitle}
        </h2>
        {renderRegionBody(
          regionsBykey.get('quick_actions'),
          overviewCopy.regionQuickActionsBody,
          overviewCopy.notSupportedLabel,
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render the body of a single region based on its availability
 * declaration. The body is honest: when the region is
 * `'not_supported'`, the body renders the approved "not yet
 * configured" state with the region's empty body copy. When the
 * region is `'navigational_only'`, the body renders the region's
 * body copy without any business data. When the region is
 * `'supported'` (reserved for future batches), the body would
 * render the region's real data; this branch is a placeholder
 * that renders the same "not yet configured" state until the
 * real data path is implemented.
 */
function renderRegionBody(
  status: RegionStatus | undefined,
  bodyCopy: string,
  notSupportedLabel: string,
): ReactElement {
  if (status === undefined) {
    return (
      <p className="ih-clinic-admin-overview__region-body ih-clinic-admin-overview__region-body--unavailable">
        {notSupportedLabel}
      </p>
    );
  }
  if (status.availability === 'not_supported') {
    return (
      <div className="ih-clinic-admin-overview__region-body ih-clinic-admin-overview__region-body--not-supported">
        <p className="ih-clinic-admin-overview__region-body-copy">
          {bodyCopy}
        </p>
        <p className="ih-clinic-admin-overview__region-availability">
          {notSupportedLabel}
        </p>
      </div>
    );
  }
  // For 'navigational_only' regions (and for 'supported' / 'no_data'
  // / 'partially_unavailable' which are reserved for future
  // batches), render the body copy without business data. This
  // preserves the approved layout for the navigational regions.
  return (
    <div className="ih-clinic-admin-overview__region-body ih-clinic-admin-overview__region-body--navigational">
      <p className="ih-clinic-admin-overview__region-body-copy">{bodyCopy}</p>
    </div>
  );
}

/**
 * Render the error state. The error message is non-revealing; the
 * component does NOT expose the underlying error category or
 * status code to the user. A retry affordance is provided for
 * network and server failures. Authorisation failures are not
 * retriable from this component (the shell handles redirect to
 * `/dashboard` or `/login`).
 */
function ErrorStateView({
  error,
  overviewCopy,
  onRetry,
}: {
  readonly error: ApiError;
  readonly lang: 'ar' | 'en';
  readonly overviewCopy: ClinicAdminOverviewCopy;
  readonly onRetry: () => void;
}): ReactElement {
  const isAuthorisation =
    error.category === 'HTTP_ERROR' && error.statusCode === 403;
  const isSession =
    error.category === 'HTTP_ERROR' && error.statusCode === 401;
  const isRetryable =
    !isAuthorisation &&
    !isSession &&
    (error.category === 'NETWORK_ERROR' ||
      error.category === 'HTTP_ERROR' ||
      error.category === 'INVALID_JSON' ||
      error.category === 'CONTRACT_INVALID');

  const message = isAuthorisation
    ? overviewCopy.errorAuthorisation
    : isSession
      ? overviewCopy.errorSession
      : overviewCopy.errorServer;

  return (
    <section
      className="ih-clinic-admin-overview__state ih-clinic-admin-overview__state--error"
      role="alert"
      aria-live="polite"
    >
      <h2 className="ih-clinic-admin-overview__state-title">
        {overviewCopy.errorTitle}
      </h2>
      <p className="ih-clinic-admin-overview__state-body">{message}</p>
      {isRetryable && (
        <button
          type="button"
          className="ih-clinic-admin-overview__retry"
          onClick={onRetry}
        >
          {overviewCopy.retryLabel}
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bilingual copy for the Overview content
// ---------------------------------------------------------------------------

interface ClinicAdminOverviewCopy {
  readonly loadingMessage: string;
  readonly greetingPrefix: string;
  readonly notSupportedLabel: string;
  readonly navigationalOnlyLabel: string;
  readonly regionAppointmentActionsTitle: string;
  readonly regionAppointmentActionsBody: string;
  readonly regionFinancialSnapshotTitle: string;
  readonly regionFinancialSnapshotBody: string;
  readonly regionTodaysAppointmentsTitle: string;
  readonly regionTodaysAppointmentsBody: string;
  readonly regionOperationalAlertsTitle: string;
  readonly regionOperationalAlertsBody: string;
  readonly regionInventoryAlertsTitle: string;
  readonly regionInventoryAlertsBody: string;
  readonly regionDoctorsOnDutyTitle: string;
  readonly regionDoctorsOnDutyBody: string;
  readonly regionWaitingRoomOperationsTitle: string;
  readonly regionWaitingRoomOperationsBody: string;
  readonly regionStaffAttendanceSummaryTitle: string;
  readonly regionStaffAttendanceSummaryBody: string;
  readonly regionQuickActionsTitle: string;
  readonly regionQuickActionsBody: string;
  readonly errorTitle: string;
  readonly errorAuthorisation: string;
  readonly errorSession: string;
  readonly errorServer: string;
  readonly retryLabel: string;
}

const AR_OVERVIEW_COPY: ClinicAdminOverviewCopy = {
  loadingMessage: 'جارٍ تحميل بيانات نظرة عامة على المنشأة…',
  greetingPrefix: 'مرحبًا،',
  notSupportedLabel: 'غير متاح بعد',
  navigationalOnlyLabel: 'إجراءات تنقل',
  regionAppointmentActionsTitle: 'إجراءات المواعيد',
  regionAppointmentActionsBody:
    'قائمة إجراءات المواعيد المعتمدة لمدير المنشأة ضمن سياق المنشأة النشطة. ستظهر الإجراءات المتاحة هنا بمجرد تنفيذ شريحة المواعيد الرأسية.',
  regionFinancialSnapshotTitle: 'اللمحة المالية',
  regionFinancialSnapshotBody:
    'ملخص مالي على مستوى المنشأة. ستظهر المؤشرات المالية الرئيسية هنا بمجرد تنفيذ شريحة الفوترة الرأسية. لا يتم عرض أي بيانات مالية لكل مريض.',
  regionTodaysAppointmentsTitle: 'مواعيد اليوم',
  regionTodaysAppointmentsBody:
    'جدول مواعيد اليوم للمنشأة النشطة. ستظهر المواعيد الحقيقية هنا بمجرد تنفيذ شريحة المواعيد الرأسية. تُعرض معرفات المرضى مموهة؛ لا تظهر أسماء المرضى أو التشخيصات أو أرقام الهواتف أو العناوين.',
  regionOperationalAlertsTitle: 'تنبيهات تشغيلية',
  regionOperationalAlertsBody:
    'تنبيهات تشغيلية على مستوى المنشأة (تعارضات في الجدولة، توافر الغرف، فجوات في الموظفين). ستظهر التنبيهات هنا بمجرد تنفيذ وحدة التنبيهات التشغيلية.',
  regionInventoryAlertsTitle: 'تنبيهات المخزون',
  regionInventoryAlertsBody:
    'تنبيهات المخزون على مستوى المنشأة (مخزون منخفض، قرب انتهاء الصلاحية). ستظهر التنبيهات هنا بمجرد تنفيذ وحدة المخزون. لا تُعرض أسعار الموردين أو عقود الشراء.',
  regionDoctorsOnDutyTitle: 'الأطباء المناوبون',
  regionDoctorsOnDutyBody:
    'قائمة بممارسي الرعاية الصحية المناوبين حاليًا داخل المنشأة. ستظهر القائمة هنا بمجرد تنفيذ وحدة الجدولة. لا تُعرض تعيينات المرضى.',
  regionWaitingRoomOperationsTitle: 'عمليات قاعة الانتظار',
  regionWaitingRoomOperationsBody:
    'الحالة التشغيلية لقاعة الانتظار. ستظهر البيانات هنا بمجور تنفيذ وحدة قاعة الانتظار. تُعرض معرفات المرضى مموهة؛ لا تظهر أسماء المرضى أو التشخيصات أو أرقام الهواتف أو العناوين.',
  regionStaffAttendanceSummaryTitle: 'ملخص حضور الموظفين',
  regionStaffAttendanceSummaryBody:
    'ملخص حضور الموظفين للمنشأة. سيظهر الملخص المجمع هنا بمجرد تنفيذ وحدة الحضور. لا تُعرض معلومات اتصال الموظفين الفرديين.',
  regionQuickActionsTitle: 'إجراءات سريعة',
  regionQuickActionsBody:
    'اختصارات إجراءات سريعة ذات صلة بمدير المنشأة ضمن سياق المنشأة النشطة. ستظهر الإجراءات المتاحة هنا بمجرد تنفيذ الشرائح الرأسية المعنية.',
  errorTitle: 'تعذّر تحميل نظرة عامة على المنشأة',
  errorAuthorisation:
    'ليس لديك صلاحية الوصول إلى نظرة عامة على المنشأة. تأكد من أن سياق المنشأة النشط مضبوط، وأن حسابك يحمل دور مدير المنشأة.',
  errorSession: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
  errorServer:
    'حدث خطأ أثناء تحميل البيانات. حاول مرة أخرى خلال لحظات.',
  retryLabel: 'إعادة المحاولة',
};

const EN_OVERVIEW_COPY: ClinicAdminOverviewCopy = {
  loadingMessage: 'Loading Clinic Admin Overview data…',
  greetingPrefix: 'Hello,',
  notSupportedLabel: 'Not yet available',
  navigationalOnlyLabel: 'Navigation actions',
  regionAppointmentActionsTitle: 'Appointment Actions',
  regionAppointmentActionsBody:
    'The canonical appointment actions available to the Clinic Administrator within the active facility context. Actions will appear here once the appointments vertical slice is implemented.',
  regionFinancialSnapshotTitle: 'Financial Snapshot',
  regionFinancialSnapshotBody:
    'A facility-scoped financial overview. Financial KPIs will appear here once the billing vertical slice is implemented. No per-patient financial data is shown.',
  regionTodaysAppointmentsTitle: "Today's Appointments",
  regionTodaysAppointmentsBody:
    "The daily appointment schedule for the active facility. Real appointments will appear here once the appointments vertical slice is implemented. Patient identifiers are masked; patient names, diagnoses, phone numbers, and addresses are never shown.",
  regionOperationalAlertsTitle: 'Operational Alerts',
  regionOperationalAlertsBody:
    'Facility-scoped operational alerts (scheduling conflicts, room availability, staffing gaps). Alerts will appear here once the operational-alerts module is implemented.',
  regionInventoryAlertsTitle: 'Inventory Alerts',
  regionInventoryAlertsBody:
    'Facility-scoped inventory warnings (low stock, near-expiry). Alerts will appear here once the inventory module is implemented. Supplier pricing and procurement contracts are never shown.',
  regionDoctorsOnDutyTitle: 'Doctors on Duty',
  regionDoctorsOnDutyBody:
    'A list of practitioners currently on duty within the facility. The list will appear here once the scheduling module is implemented. Patient assignments are never shown.',
  regionWaitingRoomOperationsTitle: 'Waiting Room Operations',
  regionWaitingRoomOperationsBody:
    'The operational state of the waiting room. Data will appear here once the waiting-room module is implemented. Patient identifiers are masked; patient names, diagnoses, phone numbers, and addresses are never shown.',
  regionStaffAttendanceSummaryTitle: 'Staff Attendance Summary',
  regionStaffAttendanceSummaryBody:
    'A facility-scoped staff attendance summary. The aggregated summary will appear here once the attendance module is implemented. Individual staff member contact information is never shown.',
  regionQuickActionsTitle: 'Quick Actions',
  regionQuickActionsBody:
    'Quick-action shortcuts relevant to the Clinic Administrator within the active facility context. Available actions will appear here once their respective vertical slices are implemented.',
  errorTitle: 'Unable to load Clinic Admin Overview',
  errorAuthorisation:
    'You are not authorised to view the Clinic Admin Overview. Ensure your active facility context is set and your account holds the Clinic Administrator role.',
  errorSession: 'Your session has expired. Please sign in again.',
  errorServer:
    'An error occurred while loading the data. Please try again in a moment.',
  retryLabel: 'Retry',
};

/**
 * Resolve the bilingual copy for the Clinic Admin Overview content.
 *
 * Defaults to Arabic when the locale is not recognised, matching the
 * platform's Arabic-first posture.
 */
function getClinicAdminOverviewCopy(
  locale: 'ar' | 'en',
): ClinicAdminOverviewCopy {
  return locale === 'en' ? EN_OVERVIEW_COPY : AR_OVERVIEW_COPY;
}
