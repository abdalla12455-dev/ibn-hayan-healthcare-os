import { forwardRef, type InputHTMLAttributes } from 'react';

/**
 * Premium form input.
 *
 * A single input style used across the application. Built on the
 * project-owned design tokens. The input uses a restrained radius
 * (`--radius-md`) and a subtle border that strengthens on focus.
 *
 * The input is a native `<input>` element so it is keyboard
 * accessible and works with all browser accessibility features
 * (autocomplete, autofill, password manager integration).
 *
 * The component forwards its ref so callers can imperatively focus
 * the input (e.g. the login form focuses the email input after the
 * silent session check completes).
 *
 * The component forwards all standard input attributes so callers
 * can pass `type`, `name`, `autoComplete`, `required`, `minLength`,
 * `maxLength`, `aria-describedby`, etc.
 */

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  readonly invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ invalid = false, ...rest }, ref) {
    return (
      <input
        {...rest}
        ref={ref}
        className={
          'ih-input' + (invalid ? ' ih-input--invalid' : '')
        }
      />
    );
  },
);
