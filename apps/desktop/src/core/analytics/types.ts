/** localStorage key for the anonymous installation UUID. */
export const INSTALL_ID_KEY = "pg_install_id";

/** Set after the server acknowledges (or we successfully POST) an install event. */
export const INSTALL_ACK_KEY = "pg_analytics_install_acked";

export type AnalyticsEventName = "install" | "launch";

export type AnalyticsPlatform = "macos" | "windows" | "linux";

export interface AnalyticsEventPayload {
  install_id: string;
  event: AnalyticsEventName;
  version: string;
  platform: AnalyticsPlatform;
  arch: string;
}

export interface AnalyticsRuntimeInfo {
  version: string;
  platform: AnalyticsPlatform;
  arch: string;
}

export interface AnalyticsDeps {
  /** Base URL of the analytics worker, no trailing slash. Empty = disabled. */
  apiUrl: string;
  /** Soft timeout for event POSTs (ms). */
  timeoutMs: number;
  getInstallId: () => string | null;
  setInstallId: (id: string) => void;
  isInstallAcked: () => boolean;
  setInstallAcked: (acked: boolean) => void;
  createInstallId: () => string;
  getRuntimeInfo: () => Promise<AnalyticsRuntimeInfo>;
  /** Returns true when analytics should run (desktop build, not browser e2e). */
  shouldTrack: () => boolean | Promise<boolean>;
  fetchFn: typeof fetch;
  /** Quiet diagnostic logger — never shown to users. */
  log?: (message: string, err?: unknown) => void;
}

export const DEFAULT_TIMEOUT_MS = 5_000;

export function createDefaultStorageDeps(): Pick<
  AnalyticsDeps,
  "getInstallId" | "setInstallId" | "isInstallAcked" | "setInstallAcked" | "createInstallId"
> {
  return {
    getInstallId: () => {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(INSTALL_ID_KEY);
    },
    setInstallId: (id: string) => {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(INSTALL_ID_KEY, id);
    },
    isInstallAcked: () => {
      if (typeof localStorage === "undefined") return false;
      return localStorage.getItem(INSTALL_ACK_KEY) === "true";
    },
    setInstallAcked: (acked: boolean) => {
      if (typeof localStorage === "undefined") return;
      if (acked) localStorage.setItem(INSTALL_ACK_KEY, "true");
      else localStorage.removeItem(INSTALL_ACK_KEY);
    },
    createInstallId: () => crypto.randomUUID(),
  };
}
