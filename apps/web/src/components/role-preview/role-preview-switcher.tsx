'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { useRouter } from 'next/navigation';
import type { RolePreviewRoleCard } from '@ibn-hayan/contracts';
import { useLanguage } from '@/components/i18n/language-context';
import { getCsrfToken } from '@/lib/api/auth/auth.client';
import { selectPreviewRole } from '@/lib/api/role-preview';
import { getRolePreviewCopy } from '@/components/role-preview/role-preview-copy';

/**
 * Demo Role Preview Mode role switcher.
 *
 * A reusable dropdown that appears only when the backend confirms
 * preview mode is enabled and the current session belongs to the
 * isolated preview workspace. The switcher is placed in the Clinic
 * Admin header without replacing the active organisation/facility
 * context, the language switch, the notification bell, the profile
 * menu, or the sign-out control.
 *
 * Per the Demo Role Preview Mode v1 specification:
 * - The switcher is **absent from normal production mode**. The
 *   parent renders the switcher only when the backend availability
 *   endpoint returns `enabled: true` AND the current-role
 *   endpoint returns `active: true`.
 * - The switcher **cannot be enabled by changing client-side state**.
 *   The parent consults the backend; the switcher receives the
 *   canonical role list and the current role as props.
 * - The switcher lists all canonical roles R01 through R14.
 * - The switcher shows the current role.
 * - Switching role calls the secure backend preview endpoint. The
 *   switcher obtains a CSRF token first, then calls
 *   `selectPreviewRole`.
 * - Switching to R09 navigates to `/clinic-admin`.
 * - Switching to another role navigates to `/role-preview`.
 * - The switcher is keyboard accessible, has visible focus states,
 *   and works on desktop, tablet, and mobile.
 * - The switcher does NOT hardcode credentials, does NOT mutate
 *   client-side permission state, does NOT store the role code as
 *   authorization state in localStorage, and does NOT fake the
 *   unread notification count.
 * - The existing notification bell remains intact.
 * - The existing eleven-item Clinic Admin sidebar remains unchanged.
 */
export interface RolePreviewSwitcherProps {
  /** The canonical preview role cards (R01 through R14). */
  readonly roles: readonly RolePreviewRoleCard[];
  /** The currently selected role code, or `null` when none is selected. */
  readonly currentRoleCode: string | null;
}

/**
 * Role switcher component. See {@link RolePreviewSwitcherProps}.
 */
export function RolePreviewSwitcher({
  roles,
  currentRoleCode,
}: RolePreviewSwitcherProps): ReactElement {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = getRolePreviewCopy(lang);

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the dropdown when a click outside the container occurs.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current === null) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close the dropdown on Escape and restore focus to the trigger.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      setOpen(false);
      if (buttonRef.current !== null) {
        buttonRef.current.focus();
      }
    }
  }

  async function handleSelect(
    roleCode: RolePreviewRoleCard['code'],
  ): Promise<void> {
    if (switching) return;
    if (roleCode === currentRoleCode) {
      setOpen(false);
      return;
    }
    setError(null);
    setSwitching(true);
    const csrfResult = await getCsrfToken();
    if (!csrfResult.ok) {
      setError(copy.switchFailed);
      setSwitching(false);
      return;
    }
    const selectResult = await selectPreviewRole(csrfResult.data.token, roleCode);
    if (!selectResult.ok) {
      setError(copy.switchFailed);
      setSwitching(false);
      return;
    }
    setSwitching(false);
    setOpen(false);
    if (selectResult.data.interfacePath !== null) {
      router.push(selectResult.data.interfacePath);
    } else {
      router.push('/role-preview');
    }
  }

  const currentRole =
    currentRoleCode === null
      ? null
      : roles.find((r) => r.code === currentRoleCode) ?? null;
  const currentLabel =
    currentRole === null
      ? copy.switcherLabel
      : lang === 'ar'
        ? currentRole.displayNameAr
        : currentRole.displayNameEn;

  return (
    <div
      className="ih-role-preview-switcher"
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        className="ih-role-preview-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={copy.switcherLabel}
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
      >
        <span className="ih-role-preview-switcher__trigger-label">
          {copy.switcherLabel}
        </span>
        <span className="ih-role-preview-switcher__trigger-value">
          {currentLabel}
        </span>
        <svg
          className="ih-role-preview-switcher__trigger-caret"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          role="presentation"
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          className="ih-role-preview-switcher__menu"
          role="listbox"
          aria-label={copy.switcherDropdownLabel}
        >
          {roles.map((role) => {
            const isActive = role.code === currentRoleCode;
            const label =
              lang === 'ar' ? role.displayNameAr : role.displayNameEn;
            return (
              <li key={role.code} className="ih-role-preview-switcher__option">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={
                    'ih-role-preview-switcher__option-button' +
                    (isActive
                      ? ' ih-role-preview-switcher__option-button--active'
                      : '')
                  }
                  onClick={() => void handleSelect(role.code)}
                  disabled={switching}
                >
                  <span className="ih-role-preview-switcher__option-code">
                    {role.shortCode}
                  </span>
                  <span className="ih-role-preview-switcher__option-name">
                    {label}
                  </span>
                  {role.interfaceImplemented && (
                    <span className="ih-role-preview-switcher__option-status">
                      {copy.interfaceImplemented}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error !== null && (
        <span className="ih-role-preview-switcher__error" role="alert">
          {error}
        </span>
      )}
      {switching && (
        <span className="ih-visually-hidden" role="status">
          {copy.selecting}
        </span>
      )}
    </div>
  );
}
