import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Premium primary button.
 *
 * A single, strong primary button used across the application.
 * Built on the project-owned design tokens (no inline colour values
 * scattered through components). The button uses a restrained radius
 * (`--radius-md`) and a controlled shadow on hover.
 *
 * Variants:
 * - `primary` — deep ink/navy, used for the main action (e.g. login).
 * - `accent` — restrained bronze, used sparingly for premium emphasis.
 * - `ghost` — transparent with a border, used for secondary actions
 *   such as "clear selection" on the dashboard.
 * - `danger` — muted red, used for destructive actions.
 *
 * The button is a native `<button>` element so it is keyboard
 * accessible by default. Focus styles come from `globals.css`.
 *
 * Reduced motion is respected globally via `globals.css`.
 */

export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'ghost'
  | 'danger';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  readonly children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'ih-button ih-button--primary',
  accent: 'ih-button ih-button--accent',
  ghost: 'ih-button ih-button--ghost',
  danger: 'ih-button ih-button--danger',
};

export function Button({
  variant = 'primary',
  loading = false,
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={[VARIANT_CLASSES[variant], className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
