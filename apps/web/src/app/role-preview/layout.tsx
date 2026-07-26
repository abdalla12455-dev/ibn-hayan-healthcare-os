import type { ReactNode } from 'react';

/**
 * Layout for the `/role-preview` route.
 *
 * This layout is intentionally a thin pass-through (mirrors
 * `/clinic-admin/layout.tsx`). The page component drives its own
 * shell. The layout exists so that the route segment has a stable
 * server-rendered shell that does not re-mount on every client-side
 * navigation within `/role-preview` (preserved for future vertical
 * slices).
 *
 * The layout does NOT apply its own `dir` attribute. Direction is
 * controlled by the root `layout.tsx` and updated at runtime by the
 * `LanguageProvider` so that Arabic-RTL and English-LTR are
 * authored in true reading order per
 * `download/docs/05_UI_UX/DESIGN_BIBLE.md` §12.2 and §13.2.
 */
export default function RolePreviewLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
