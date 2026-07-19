import type { ReactNode } from 'react';

/**
 * Form field wrapper — associates a label, the control, and an
 * optional help or error message with the correct `for` / `id` /
 * `aria-describedby` wiring.
 *
 * The wrapper renders:
 * - a `<label>` element associated with the control via `htmlFor`;
 * - the control (passed as `children`);
 * - an optional help message rendered with the help `id`;
 * - an optional error message rendered with the error `id` and
 *   `role="alert"`.
 *
 * The caller is responsible for passing the same `id` to the control
 * and to this wrapper via `inputId`, so the `<label htmlFor>` matches.
 * Similarly, the caller wires `aria-describedby` on the control to
 * `describedById` (the wrapper composes the final id list).
 */

export interface FieldProps {
  readonly inputId: string;
  readonly label: ReactNode;
  readonly helpId?: string;
  readonly help?: ReactNode;
  readonly errorId?: string;
  readonly error?: ReactNode;
  readonly children: ReactNode;
}

export function Field({
  inputId,
  label,
  helpId,
  help,
  errorId,
  error,
  children,
}: FieldProps) {
  return (
    <div className="ih-field">
      <label htmlFor={inputId} className="ih-field__label">
        {label}
      </label>
      {children}
      {help !== undefined && helpId !== undefined && (
        <p id={helpId} className="ih-field__help">
          {help}
        </p>
      )}
      {error !== undefined && errorId !== undefined && (
        <p id={errorId} role="alert" className="ih-field__error">
          {error}
        </p>
      )}
    </div>
  );
}
