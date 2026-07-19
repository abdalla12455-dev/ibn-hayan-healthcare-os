import type { ReactNode } from 'react';

/**
 * Status message — accessible inline alert.
 *
 * Renders a status message with `role="alert"` and `aria-live="polite"`
 * so screen readers announce the message without interrupting the
 * user. Three variants:
 *
 * - `error` — for failures (login error, context error, etc.);
 * - `success` — for confirmations (not currently used, reserved);
 * - `info` — for neutral status updates.
 *
 * The message is always a generic user-facing string. Raw API errors,
 * stack traces, status codes, and infrastructure details must never
 * be passed to this component.
 */

export type StatusVariant = 'error' | 'success' | 'info';

export interface StatusMessageProps {
  readonly variant?: StatusVariant;
  readonly children: ReactNode;
  readonly id?: string;
}

export function StatusMessage({
  variant = 'info',
  children,
  id,
}: StatusMessageProps) {
  const className =
    variant === 'error'
      ? 'ih-status ih-status--error'
      : variant === 'success'
        ? 'ih-status ih-status--success'
        : 'ih-status ih-status--info';
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={className}
    >
      {children}
    </p>
  );
}
