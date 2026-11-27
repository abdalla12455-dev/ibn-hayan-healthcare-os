import { notFound } from "next/navigation";

import { PlatformAdminVisualPreview } from "./platform-admin-visual-preview";

export default function VisualPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <PlatformAdminVisualPreview />;
}
