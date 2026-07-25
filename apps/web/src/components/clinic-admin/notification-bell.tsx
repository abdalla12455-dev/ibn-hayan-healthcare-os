'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { useLanguage } from '@/components/i18n/language-context';
import { getClinicAdminCopy } from './clinic-admin-copy';

/**
 * Notification bell control for the Clinic Admin application header.
 *
 * Per `download/docs/05_UI_UX/DESIGN_BIBLE.md` §17.3, the
 * notification control lives in the fixed application header. It
 * must NOT appear in the sidebar.
 *
 * The bell exposes only the affordance: the button, the unread-badge
 * slot, and the panel. It does NOT invent notification records, does
 * NOT hardcode an unread count, and does NOT create a temporary
 * notification API. Until the Notification vertical slice is
 * implemented, the panel renders an honest empty/unavailable state.
 *
 * Future real notifications must be tenant-scoped, facility-scoped,
 * permission-aware, and backed by the notification module. When the
 * notification backend is implemented, the parent component will
 * pass a real `unreadCount` (a non-negative integer) and a list of
 * notification records; this component will render them without
 * restructuring.
 *
 * Accessibility:
 * - The bell button has an accessible name (Arabic or English).
 * - The panel is keyboard-operable; Escape closes it.
 * - Click-outside closes the panel.
 * - The panel uses `role="dialog"` and `aria-label`.
 * - Focus is restored to the bell button when the panel closes.
 *
 * Responsive behaviour:
 * - On desktop and tablet, the panel behaves as a popover anchored
 *   to the bell button.
 * - On mobile, the panel behaves as a drawer that slides in from the
 *   end side (left in RTL, right in LTR).
 */
export interface NotificationBellProps {
  /**
   * The unread notification count, or `null` when the count is
   * unavailable. When `null` or `0`, no badge is rendered. When a
   * future connected implementation supplies a positive integer, a
   * badge with that integer is rendered.
   *
   * The shell v1 always passes `null` (no notification backend).
   */
  readonly unreadCount?: number | null;
}

/**
 * Notification bell control.
 *
 * See {@link NotificationBellProps} for the contract.
 */
export function NotificationBell({
  unreadCount = null,
}: NotificationBellProps): ReactElement {
  const { lang } = useLanguage();
  const copy = getClinicAdminCopy(lang);

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const closePanel = useCallback(() => {
    setOpen(false);
    // Restore focus to the bell button so keyboard users keep their
    // place in the tab order.
    if (buttonRef.current !== null) {
      buttonRef.current.focus();
    }
  }, []);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePanel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closePanel]);

  // Click-outside closes the panel.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (target === null) return;
      if (
        panelRef.current !== null &&
        panelRef.current.contains(target)
      ) {
        return;
      }
      if (
        buttonRef.current !== null &&
        buttonRef.current.contains(target)
      ) {
        return;
      }
      closePanel();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, closePanel]);

  const handleButtonClick = () => {
    setOpen((prev) => !prev);
  };

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      closePanel();
    }
  };

  const showBadge = typeof unreadCount === 'number' && unreadCount > 0;
  const badgeCount =
    typeof unreadCount === 'number' && unreadCount > 99
      ? '99+'
      : String(unreadCount ?? '');

  const panelId = 'ih-clinic-admin-notification-panel';

  return (
    <div className="ih-clinic-admin-bell">
      <button
        ref={buttonRef}
        type="button"
        className="ih-clinic-admin-bell__button"
        aria-label={copy.notificationBellLabel}
        aria-haspopup="dialog"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={panelId}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          role="presentation"
        >
          <path
            d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15h15L18 12.5V9a6 6 0 0 0-6-6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 18a2 2 0 0 0 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {showBadge && (
          <span
            className="ih-clinic-admin-bell__badge"
            aria-label={copy.notificationBellLabel}
          >
            {badgeCount}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={copy.notificationPanelTitle}
          className="ih-clinic-admin-bell__panel"
        >
          <div className="ih-clinic-admin-bell__panel-header">
            <h2 className="ih-clinic-admin-bell__panel-title">
              {copy.notificationPanelTitle}
            </h2>
            <button
              type="button"
              className="ih-clinic-admin-bell__panel-close"
              aria-label={copy.notificationCloseLabel}
              onClick={closePanel}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
                role="presentation"
              >
                <path
                  d="M3 3 L13 13 M13 3 L3 13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="ih-clinic-admin-bell__panel-body">
            <div className="ih-clinic-admin-bell__empty">
              <p className="ih-clinic-admin-bell__empty-title">
                {copy.notificationEmptyTitle}
              </p>
              <p className="ih-clinic-admin-bell__empty-body">
                {copy.notificationEmptyBody}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
