import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeAnalytics, resetAnalyticsSessionState, trackLaunch } from "./analytics";
import { normalizeArch, normalizePlatform, resolveAnalyticsApiUrl } from "./runtime";
import type { AnalyticsDeps } from "./types";
import { INSTALL_ACK_KEY, INSTALL_ID_KEY } from "./types";

function memoryDeps(overrides: Partial<AnalyticsDeps> = {}): {
  deps: AnalyticsDeps;
  store: Map<string, string>;
  posts: unknown[];
} {
  const store = new Map<string, string>();
  const posts: unknown[] = [];

  const deps: AnalyticsDeps = {
    apiUrl: "https://analytics.test",
    timeoutMs: 1000,
    getInstallId: () => store.get(INSTALL_ID_KEY) ?? null,
    setInstallId: (id) => {
      store.set(INSTALL_ID_KEY, id);
    },
    isInstallAcked: () => store.get(INSTALL_ACK_KEY) === "true",
    setInstallAcked: (acked) => {
      if (acked) store.set(INSTALL_ACK_KEY, "true");
      else store.delete(INSTALL_ACK_KEY);
    },
    createInstallId: () => "11111111-1111-4111-8111-111111111111",
    getRuntimeInfo: async () => ({
      version: "1.0.0",
      platform: "macos",
      arch: "aarch64",
    }),
    shouldTrack: () => true,
    fetchFn: vi.fn(async (_url: string, init?: RequestInit) => {
      posts.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as unknown as typeof fetch,
    log: vi.fn(),
    ...overrides,
  };

  return { deps, store, posts };
}

describe("runtime helpers", () => {
  it("normalizes platforms", () => {
    expect(normalizePlatform("darwin")).toBe("macos");
    expect(normalizePlatform("win32")).toBe("windows");
    expect(normalizePlatform("linux")).toBe("linux");
  });

  it("normalizes arches", () => {
    expect(normalizeArch("arm64")).toBe("aarch64");
    expect(normalizeArch("x64")).toBe("x86_64");
    expect(normalizeArch("")).toBe("unknown");
  });

  it("trims trailing slashes from API URL", () => {
    expect(resolveAnalyticsApiUrl("https://a.test/")).toBe("https://a.test");
    expect(resolveAnalyticsApiUrl("")).toBe("");
    expect(resolveAnalyticsApiUrl(undefined, false)).toBe("");
    expect(resolveAnalyticsApiUrl(undefined, true)).toBe("https://analytics.trypigeon.dev");
  });
});

describe("initializeAnalytics", () => {
  beforeEach(() => {
    resetAnalyticsSessionState();
  });

  afterEach(() => {
    resetAnalyticsSessionState();
  });

  it("first launch generates UUID, persists it, sends install then launch", async () => {
    const { deps, store, posts } = memoryDeps();
    await initializeAnalytics(deps);

    expect(store.get(INSTALL_ID_KEY)).toBe("11111111-1111-4111-8111-111111111111");
    expect(store.get(INSTALL_ACK_KEY)).toBe("true");
    expect(posts).toEqual([
      {
        install_id: "11111111-1111-4111-8111-111111111111",
        event: "install",
        version: "1.0.0",
        platform: "macos",
        arch: "aarch64",
      },
      {
        install_id: "11111111-1111-4111-8111-111111111111",
        event: "launch",
        version: "1.0.0",
        platform: "macos",
        arch: "aarch64",
      },
    ]);
  });

  it("second launch reuses UUID and only sends launch", async () => {
    const { deps, store, posts } = memoryDeps();
    store.set(INSTALL_ID_KEY, "22222222-2222-4222-8222-222222222222");
    store.set(INSTALL_ACK_KEY, "true");

    await initializeAnalytics(deps);

    expect(store.get(INSTALL_ID_KEY)).toBe("22222222-2222-4222-8222-222222222222");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ event: "launch" });
  });

  it("retries install when prior install was never acknowledged", async () => {
    const { deps, store, posts } = memoryDeps();
    store.set(INSTALL_ID_KEY, "22222222-2222-4222-8222-222222222222");

    await initializeAnalytics(deps);

    expect(posts.map((p) => (p as { event: string }).event)).toEqual(["install", "launch"]);
    expect(store.get(INSTALL_ACK_KEY)).toBe("true");
  });

  it("continues normally when the API is unavailable", async () => {
    const { deps, store } = memoryDeps({
      fetchFn: vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    });

    await expect(initializeAnalytics(deps)).resolves.toBeUndefined();
    expect(store.get(INSTALL_ID_KEY)).toBe("11111111-1111-4111-8111-111111111111");
    // Install not acked — will retry next session.
    expect(store.get(INSTALL_ACK_KEY)).toBeUndefined();
  });

  it("no-ops when API URL is empty", async () => {
    const { deps, posts } = memoryDeps({ apiUrl: "" });
    await initializeAnalytics(deps);
    expect(posts).toHaveLength(0);
  });

  it("no-ops when shouldTrack is false", async () => {
    const { deps, posts } = memoryDeps({ shouldTrack: () => false });
    await initializeAnalytics(deps);
    expect(posts).toHaveLength(0);
  });

  it("does not re-send when called twice in the same session", async () => {
    const { deps, posts } = memoryDeps();
    await initializeAnalytics(deps);
    await initializeAnalytics(deps);
    expect(posts).toHaveLength(2);
  });
});

describe("trackLaunch", () => {
  it("sends a launch event for an existing install", async () => {
    const { deps, store, posts } = memoryDeps();
    store.set(INSTALL_ID_KEY, "33333333-3333-4333-8333-333333333333");
    await trackLaunch(deps);
    expect(posts).toEqual([
      {
        install_id: "33333333-3333-4333-8333-333333333333",
        event: "launch",
        version: "1.0.0",
        platform: "macos",
        arch: "aarch64",
      },
    ]);
  });
});
