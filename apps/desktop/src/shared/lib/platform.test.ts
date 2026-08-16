import { afterEach, describe, expect, it, vi } from "vitest";
import { isTauri, isTauriAppBuild, isTauriIpcReady } from "./platform";

describe("platform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isTauriIpcReady is false without invoke", () => {
    expect(isTauriIpcReady()).toBe(false);
    expect(isTauri()).toBe(false);
  });

  it("isTauriIpcReady is true when invoke exists", () => {
    vi.stubGlobal("window", {
      __TAURI_INTERNALS__: { invoke: () => {} },
    });
    expect(isTauriIpcReady()).toBe(true);
    expect(isTauri()).toBe(true);
  });

  it("isTauriAppBuild is false in Vitest (no TAURI_ENV_PLATFORM)", () => {
    expect(isTauriAppBuild()).toBe(false);
  });
});
