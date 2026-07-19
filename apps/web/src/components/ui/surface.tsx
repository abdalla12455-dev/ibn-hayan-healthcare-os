import type { ReactNode } from 'react';

/**
 * Surface — a project-owned panel container.
 *
 * Used for cards, panels, and elevated content blocks. Built on the
 * project-owned design tokens. Two variants:
 *
 * - `default` — white surface with a subtle border;
 * - `elevated` — white surface with a controlled shadow for
 *   prominent panels (e.g. the login card).
 *
 * The surface uses a restrained radius (`--radius-lg`) and a subtle
 * border. It is intentionally NOT a glassmorphism card.
 */

export interface SurfaceProps {
  readonly variant?: 'default' | 'elevated' | 'muted';
  readonly as?: 'div' | 'section' | 'article' | 'aside';
  readonly children: ReactNode;
  readonly className?: string;
}

export function Surface({
  variant = 'default',
  as: Tag = 'div',
  className,
  children,
}: SurfaceProps) {
  const variantClass =
    variant === 'elevated'
      ? 'ih-surface ih-surface--elevated'
      : variant === 'muted'
        ? 'ih-surface ih-surface--muted'
        : 'ih-surface';
  return (
    <Tag
      className={
        [variantClass, className].filter(Boolean).join(' ')
      }
    >
      {children}
    </Tag>
  );
}
