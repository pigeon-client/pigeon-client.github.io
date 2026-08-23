import { getVersion } from "@tauri-apps/api/app";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";

const FALLBACK_VERSION = "0.1.0";

export type UpdateCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "latest"
  | "installing"
  | "error";

export interface UpdateVersionModel {
  currentVersion: string;
  latestVersion?: string;
  available: boolean;
  checkedAt: number;
  date?: string;
  body?: string;
}

export interface UpdateCheckResult {
  status: "available" | "latest" | "error";
  version: UpdateVersionModel;
  update?: Update;
  error?: string;
}

export async function getCurrentVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return FALLBACK_VERSION;
  }
}

export async function checkUpdateVersion(): Promise<UpdateCheckResult> {
  const currentVersion = await getCurrentVersion();

  // `pnpm tauri dev` builds have no update artifacts/signature — never offer an
  // "update" while running from source.
  if (import.meta.env.DEV) {
    return {
      status: "latest",
      version: {
        currentVersion,
        latestVersion: currentVersion,
        available: false,
        checkedAt: Date.now(),
      },
    };
  }

  try {
    const update = await check();
    if (!update) {
      return {
        status: "latest",
        version: {
          currentVersion,
          latestVersion: currentVersion,
          available: false,
          checkedAt: Date.now(),
        },
      };
    }

    return {
      status: "available",
      update,
      version: {
        currentVersion,
        latestVersion: update.version,
        available: true,
        checkedAt: Date.now(),
        date: update.date,
        body: update.body,
      },
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      version: {
        currentVersion,
        available: false,
        checkedAt: Date.now(),
      },
    };
  }
}

export async function installUpdate(
  update: Update,
  onProgress?: (event: DownloadEvent) => void,
): Promise<void> {
  await update.downloadAndInstall(onProgress);
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

let cachedResult: UpdateCheckResult | null = null;
const listeners = new Set<() => void>();

export function getCachedUpdateResult(): UpdateCheckResult | null {
  return cachedResult;
}

export function onUpdateCacheChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners() {
  for (const fn of listeners) fn();
}

export async function checkForUpdates(silent = true): Promise<UpdateCheckResult> {
  const result = await checkUpdateVersion();

  if (silent) {
    cachedResult = result;
    notifyListeners();
    return result;
  }

  try {
    if (result.status === "latest") {
      alert("You are on the latest version.");
      return result;
    }

    if (result.status !== "available" || !result.update) {
      return result;
    }

    const confirmed = confirm(
      `Update ${result.version.latestVersion} is available.\n\n${result.version.body ?? ""}\n\nInstall now?`,
    );
    if (!confirmed) return result;

    await installUpdate(result.update, (event) => {
      switch (event.event) {
        case "Started":
          console.warn(`[Pigeon] Downloading ${event.data.contentLength} bytes`);
          break;
        case "Progress":
          console.warn(`[Pigeon] Downloaded chunk: ${event.data.chunkLength}`);
          break;
        case "Finished":
          console.warn("[Pigeon] Download finished, installing...");
          break;
      }
    });
  } catch (_err) {
    return result;
  }

  return result;
}
