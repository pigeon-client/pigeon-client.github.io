import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Standalone Vitest config — mirrors the `@` alias from vite.config.ts.
// Tests run in happy-dom so Zustand stores and DOM-touching helpers work; the
// Tauri `invoke()` layer is guarded by isTauri() and no-ops under test.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/test/**", "src/**/*.d.ts"],
    },
  },
});
