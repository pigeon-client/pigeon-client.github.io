// Vitest global setup. jsdom lacks a few browser APIs the app touches.
import { vi } from "vitest";

// The app never sets __TAURI_INTERNALS__ under test, so every db.ts / invoke
// call short-circuits via isTauri(). Provide a fallback in case something calls
// invoke directly, to fail loudly rather than hang.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async () => {
    throw new Error("invoke() called in a test — mock it or guard with isTauri()");
  }),
}));

if (!("clipboard" in navigator)) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(async () => {}) },
    configurable: true,
  });
}
