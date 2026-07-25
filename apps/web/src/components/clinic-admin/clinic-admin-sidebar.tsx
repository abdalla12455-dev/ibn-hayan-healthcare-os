'use client';

import { type ReactElement } from 'react';
import { useLanguage } from '@/components/i18n/language-context';
import {
  CLINIC_ADMIN_SIDEBAR_ITEMS,
  getClinicAdminCopy,
} from './clinic-admin-copy';

/**
 * Clinic Admin sidebar — fixed navigation rail.
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17.2, the sidebar
 * contains exactly eleven items in the ratified binding order:
 *
 *   1. نظرة عامة | Overview
 *   2. المواعيد | Appointments
 *   3. المرضى | Patients
 *   4. الأطباء | Doctors
 *   5. الموظفون والحضور | Staff & Attendance
 *   6. قاعة الانتظار | Waiting Room
 *   7. الخدمات والإجراءات | Services & Procedures
 *   8. الفوترة والمدفوعات | Billing & Payments
 *   9. المخزون | Inventory
 *   10. التقارير والتحليلات | Reports & Analytics
 *   11. الإعدادات | Settings
 *
 * Notifications must NOT appear as a sidebar item (per §17.2 and
 * §17.3 — notifications live in the fixed application header).
 *
 * Only the Overview item is routable in shell v1. The remaining ten
 * modules are not yet implemented; they are rendered in an honest
 * disabled "planned" state without linking to fake business routes.
 *
 * The sidebar is anchored to the start edge of the viewport (right
 * in Arabic RTL per §12.2, left in English LTR per §13.2) on
 * desktop. On tablet it collapses to a compact icon rail; on mobile
 * it becomes a drawer triggered by a button in the fixed header
 * (per §17.5).
 *
 * Accessibility:
 * - The sidebar is a `<nav>` landmark with an accessible name.
 * - Each item is a link (when implemented) or a disabled button
 *   (when planned), with `aria-current="page"` for the active item
 *   and `aria-disabled="true"` for planned items.
 * - Items are keyboard-navigable; visible focus rings are applied
 *   globally via `globals.css`.
 *
 * This component does not own routing; the parent decides which
 * route to push. In shell v1, only the Overview route (`/clinic-admin`)
 * is active, and the parent renders it directly. The sidebar marks
 * `overview` as the active item.
 */
export interface ClinicAdminSidebarProps {
  /** The active navigation key, or `null` when none is active. */
  readonly activeKey: string | null;
  /**
   * Called when the user activates a routable item. Items that are
   * not yet implemented do not invoke this callback.
   */
  readonly onNavigate?: (key: string) => void;
  /**
   * When `true`, the sidebar renders in its compact (tablet) form.
   * The parent decides the breakpoint by passing this prop based on
   * the viewport.
   */
  readonly compact?: boolean;
}

/**
 * Sidebar component. See {@link ClinicAdminSidebarProps}.
 */
export function ClinicAdminSidebar({
  activeKey,
  onNavigate,
  compact = false,
}: ClinicAdminSidebarProps): ReactElement {
  const { lang } = useLanguage();
  const copy = getClinicAdminCopy(lang);

  return (
    <nav
      className={
        'ih-clinic-admin-sidebar' +
        (compact ? ' ih-clinic-admin-sidebar--compact' : '')
      }
      aria-label={copy.surfaceLabel}
    >
      <div className="ih-clinic-admin-sidebar__brand">
        <span className="ih-clinic-admin-sidebar__brand-name">
          {copy.surfaceLabel}
        </span>
        <span className="ih-clinic-admin-sidebar__brand-role">
          {copy.roleLabel}
        </span>
      </div>
      <ol className="ih-clinic-admin-sidebar__list">
        {CLINIC_ADMIN_SIDEBAR_ITEMS.map((item, index) => {
          const isActive = item.key === activeKey;
          const label = lang === 'ar' ? item.ar : item.en;
          const isPlanned = !item.implemented;

          const className =
            'ih-clinic-admin-sidebar__item' +
            (isActive ? ' ih-clinic-admin-sidebar__item--active' : '') +
            (isPlanned ? ' ih-clinic-admin-sidebar__item--planned' : '');

          // Planned items render as a disabled button so they remain
          // keyboard-reachable (with `aria-disabled`) without
          // navigating. Implemented items render as anchors whose
          // activation the parent intercepts via onNavigate.
          if (isPlanned) {
            return (
              <li
                key={item.key}
                className="ih-clinic-admin-sidebar__list-item"
                aria-posinset={index + 1}
                aria-setsize={CLINIC_ADMIN_SIDEBAR_ITEMS.length}
              >
                <span
                  className={className}
                  aria-disabled="true"
                  tabIndex={0}
                >
                  <span
                    className="ih-clinic-admin-sidebar__item-label"
                    aria-hidden={compact ? 'true' : 'false'}
                  >
                    {label}
                  </span>
                  <span className="ih-clinic-admin-sidebar__item-planned">
                    {copy.plannedLabel}
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li
              key={item.key}
              className="ih-clinic-admin-sidebar__list-item"
              aria-posinset={index + 1}
              aria-setsize={CLINIC_ADMIN_SIDEBAR_ITEMS.length}
            >
              <a
                href="/clinic-admin"
                className={className}
                aria-current={isActive ? 'page' : undefined}
                onClick={(event) => {
                  // Implemented items: intercept and delegate so the
                  // parent can drive client-side navigation. In shell
                  // v1, the only implemented item is `overview`, whose
                  // href is `/clinic-admin` (the current page).
                  event.preventDefault();
                  onNavigate?.(item.key);
                }}
              >
                <span
                  className="ih-clinic-admin-sidebar__item-label"
                  aria-hidden={compact ? 'true' : 'false'}
                >
                  {label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
