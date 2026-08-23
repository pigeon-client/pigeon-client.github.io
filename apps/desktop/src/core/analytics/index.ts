import { getVersion } from "@tauri-apps/api/app";
import { isTauriAppBuild, waitForTauriIpc } from "@/shared/lib/platform";
import {
  buildProductionDeps,
  initializeAnalytics as initializeAnalyticsCore,
  trackLaunch as trackLaunchCore,
} from "./analytics";
import { normalizeArch, normalizePlatform, resolveAnalyticsApiUrl } from "./runtime";
import { createDefaultStorageDeps, DEFAULT_TIMEOUT_MS } from "./types";

export { resetAnalyticsSessionState } from "./analytics";
export {
  DEFAULT_ANALYTICS_API_URL,
  normalizeArch,
  normalizePlatform,
  resolveAnalyticsApiUrl,
} from "./runtime";
export type { AnalyticsEventPayload, AnalyticsRuntimeInfo } from "./types";
export {
  INSTALL_ACK_KEY,
  INSTALL_ID_KEY,
} from "./types";

function createAppDeps() {
  const storage = createDefaultStorageDeps();

  return buildProductionDeps({
    ...storage,
    apiUrl: resolveAnalyticsApiUrl(),
    timeoutMs: DEFAULT_TIMEOUT_MS,
    shouldTrack: async () => {
      // Browser / Playwright builds must never phone home.
      if (!isTauriAppBuild()) return false;
      await waitForTauriIpc();
      return true;
    },
    getRuntimeInfo: async () => {
      let version = "0.0.0";
      try {
        version = await getVersion();
      } catch {
        version = import.meta.env.VITE_APP_VERSION ?? "0.0.0";
      }
      return {
        version,
        platform: normalizePlatform(import.meta.env.TAURI_ENV_PLATFORM),
        arch: normalizeArch(import.meta.env.TAURI_ENV_ARCH),
      };
    },
  });
}

let appDeps = createAppDeps();

/** Test hook to replace production deps. */
export function __setAnalyticsDepsForTests(deps: ReturnType<typeof createAppDeps> | null): void {
  appDeps = deps ?? createAppDeps();
}

/**
 * Fire-and-forget anonymous analytics bootstrap.
 * Safe to call from React effects; never throws to the caller.
 */
export function initializeAnalytics(): void {
  void initializeAnalyticsCore(appDeps);
}

/** Optional explicit launch track (covered by initializeAnalytics). */
export function trackLaunch(): void {
  void trackLaunchCore(appDeps);
}
