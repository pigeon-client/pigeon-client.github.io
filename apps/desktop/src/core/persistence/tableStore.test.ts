import { describe, expect, it } from "vitest";
import { resolveKeyValueBackend } from "./tableStore";

describe("resolveKeyValueBackend", () => {
  it("uses SQLite when Tauri IPC is ready", () => {
    expect(resolveKeyValueBackend(true, true, true)).toBe("tauri");
    expect(resolveKeyValueBackend(true, true, false)).toBe("tauri");
  });

  it("refuses localStorage on a desktop build if IPC is not ready", () => {
    expect(resolveKeyValueBackend(true, false, true)).toBe("unavailable");
  });

  it("keeps the browser/Playwright localStorage path when this is not a Tauri build", () => {
    expect(resolveKeyValueBackend(true, false, false)).toBe("browser");
    expect(resolveKeyValueBackend(false, false, false)).toBe("browser");
  });
});
