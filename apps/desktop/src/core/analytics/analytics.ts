import type { AnalyticsDeps, AnalyticsEventName, AnalyticsEventPayload } from "./types";
import { DEFAULT_TIMEOUT_MS } from "./types";

let sessionStarted = false;
let inFlight: Promise<void> | null = null;

/** Reset module guards — for unit tests only. */
export function resetAnalyticsSessionState(): void {
  sessionStarted = false;
  inFlight = null;
}

async function postEvent(deps: AnalyticsDeps, payload: AnalyticsEventPayload): Promise<boolean> {
  if (!deps.apiUrl) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);

  try {
    const res = await deps.fetchFn(`${deps.apiUrl}/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return res.ok;
  } catch (err) {
    deps.log?.("[analytics] event failed", err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureInstallId(deps: AnalyticsDeps): Promise<{ id: string; isNew: boolean }> {
  const existing = deps.getInstallId();
  if (existing) return { id: existing, isNew: false };
  const id = deps.createInstallId();
  deps.setInstallId(id);
  deps.setInstallAcked(false);
  return { id, isNew: true };
}

async function sendNamedEvent(
  deps: AnalyticsDeps,
  installId: string,
  event: AnalyticsEventName,
): Promise<boolean> {
  const runtime = await deps.getRuntimeInfo();
  const payload: AnalyticsEventPayload = {
    install_id: installId,
    event,
    version: runtime.version,
    platform: runtime.platform,
    arch: runtime.arch,
  };
  return postEvent(deps, payload);
}

/**
 * Best-effort anonymous install + launch tracking.
 * Never throws; never blocks app startup when called without awaiting.
 */
export async function initializeAnalytics(deps: AnalyticsDeps): Promise<void> {
  if (sessionStarted) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      if (!(await deps.shouldTrack())) return;
      if (!deps.apiUrl) return;

      const { id, isNew } = await ensureInstallId(deps);

      // First local install, or prior install POST never acknowledged — safe to retry
      // (server upsert is idempotent).
      if (isNew || !deps.isInstallAcked()) {
        const ok = await sendNamedEvent(deps, id, "install");
        if (ok) deps.setInstallAcked(true);
      }

      await sendNamedEvent(deps, id, "launch");
      sessionStarted = true;
    } catch (err) {
      deps.log?.("[analytics] initialize failed", err);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Explicit launch helper — usually covered by initializeAnalytics. */
export async function trackLaunch(deps: AnalyticsDeps): Promise<void> {
  try {
    if (!(await deps.shouldTrack())) return;
    if (!deps.apiUrl) return;
    const { id } = await ensureInstallId(deps);
    await sendNamedEvent(deps, id, "launch");
  } catch (err) {
    deps.log?.("[analytics] trackLaunch failed", err);
  }
}

export function buildProductionDeps(overrides: Partial<AnalyticsDeps> = {}): AnalyticsDeps {
  // Lazy imports kept inside the factory so unit tests can inject everything.
  return {
    apiUrl: "",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    getInstallId: () => null,
    setInstallId: () => undefined,
    isInstallAcked: () => false,
    setInstallAcked: () => undefined,
    createInstallId: () => crypto.randomUUID(),
    getRuntimeInfo: async () => ({
      version: "0.0.0",
      platform: "linux",
      arch: "unknown",
    }),
    shouldTrack: () => false,
    fetchFn: globalThis.fetch.bind(globalThis),
    log: (message, err) => {
      console.warn(message, err);
    },
    ...overrides,
  };
}
