import { beforeEach, describe, expect, it } from "vitest";
import { handleEvent } from "./events";
import worker from "./index";
import { resetRateLimitState } from "./rateLimit";
import { collectStats } from "./stats";
import { asD1, MemoryDb } from "./test/memoryDb";

const INSTALL_ID = "550e8400-e29b-41d4-a716-446655440000";

function payload(event: "install" | "launch", overrides: Record<string, string> = {}) {
  return {
    install_id: INSTALL_ID,
    event,
    version: "1.0.0",
    platform: "macos",
    arch: "aarch64",
    ...overrides,
  };
}

describe("handleEvent idempotency", () => {
  it("duplicate install events create one installation", async () => {
    const db = new MemoryDb();
    const env = { DB: asD1(db) };
    const body = payload("install");

    for (let i = 0; i < 10; i++) {
      await handleEvent(env, body);
    }

    expect(db.installations.size).toBe(1);
    expect(db.events).toHaveLength(10);
    expect(db.events.every((e) => e.event === "install")).toBe(true);
  });

  it("launch updates last_seen and records the event", async () => {
    const db = new MemoryDb();
    const env = { DB: asD1(db) };
    await handleEvent(env, payload("install"));
    const first = db.installations.get(INSTALL_ID)?.first_seen_at;

    await new Promise((r) => setTimeout(r, 5));
    await handleEvent(env, payload("launch", { version: "1.0.1" }));

    const row = db.installations.get(INSTALL_ID);
    expect(row?.first_seen_at).toBe(first);
    expect(row?.last_version).toBe("1.0.1");
    expect(db.events.filter((e) => e.event === "launch")).toHaveLength(1);
  });
});

describe("collectStats", () => {
  it("returns totals, active, platform and version breakdowns", async () => {
    const db = new MemoryDb();
    const env = { DB: asD1(db) };

    await handleEvent(env, payload("install"));
    await handleEvent(env, payload("launch"));
    await handleEvent(
      env,
      payload("install", {
        install_id: "660e8400-e29b-41d4-a716-446655440001",
        platform: "windows",
        arch: "x86_64",
        version: "1.1.0",
      }),
    );

    const stats = await collectStats(env, new Date());
    expect(stats.total_installs).toBe(2);
    expect(stats.active_installations).toBe(2);
    expect(stats.installs_today).toBe(2);
    expect(stats.platforms.macos).toBe(1);
    expect(stats.platforms.windows).toBe(1);
    expect(stats.installs_by_platform).toEqual(stats.platforms);
    expect(stats.installs_by_version["1.0.0"]).toBe(1);
    expect(stats.installs_by_version["1.1.0"]).toBe(1);
    expect(stats.launches_by_day.length).toBeGreaterThanOrEqual(1);
  });
});

describe("HTTP worker", () => {
  let db: MemoryDb;

  beforeEach(() => {
    db = new MemoryDb();
    resetRateLimitState();
  });

  function env(extra: Record<string, string> = {}) {
    return { DB: asD1(db), CORS_ORIGINS: "*", ...extra };
  }

  it("POST /v1/events accepts valid install", async () => {
    const res = await worker.fetch(
      new Request("https://analytics.test/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload("install")),
      }),
      env(),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(db.installations.size).toBe(1);
  });

  it("POST /v1/events rejects invalid UUID with 400", async () => {
    const res = await worker.fetch(
      new Request("https://analytics.test/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload("install", { install_id: "bad" })),
      }),
      env(),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("GET /v1/stats returns aggregates", async () => {
    await handleEvent({ DB: asD1(db) }, payload("install"));
    const res = await worker.fetch(new Request("https://analytics.test/v1/stats"), env());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total_installs: number };
    expect(body.total_installs).toBe(1);
  });

  it("GET /v1/stats respects STATS_TOKEN", async () => {
    const denied = await worker.fetch(
      new Request("https://analytics.test/v1/stats"),
      env({ STATS_TOKEN: "secret" }),
    );
    expect(denied.status).toBe(401);

    const allowed = await worker.fetch(
      new Request("https://analytics.test/v1/stats", {
        headers: { Authorization: "Bearer secret" },
      }),
      env({ STATS_TOKEN: "secret" }),
    );
    expect(allowed.status).toBe(200);
  });

  it("rejects oversized payloads", async () => {
    const res = await worker.fetch(
      new Request("https://analytics.test/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": "99999" },
        body: JSON.stringify(payload("install")),
      }),
      env(),
    );
    expect(res.status).toBe(413);
  });
});
