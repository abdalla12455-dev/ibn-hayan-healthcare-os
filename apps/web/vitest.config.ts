import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest configuration for @ibn-hayan/web.
 *
 * - Uses jsdom for DOM-compatible assertions.
 * - Enables React plugin so JSX/TSX components compile under test.
 * - Reuses the project's TypeScript path aliases (e.g. `@/*`).
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
});
