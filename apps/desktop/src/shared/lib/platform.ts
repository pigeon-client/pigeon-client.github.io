type TauriInternals = { invoke?: (...args: unknown[]) => unknown };

function tauriInternals(): TauriInternals | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
}

/** True when the Tauri IPC bridge can accept `invoke()` calls. */
export function isTauriIpcReady(): boolean {
  return typeof tauriInternals()?.invoke === "function";
}

/**
 * Runtime platform detection. Prefer `isTauriIpcReady()` before persistence or
 * invoke — during webview bootstrap `__TAURI_INTERNALS__` may not exist yet.
 */
export function isTauri(): boolean {
  return isTauriIpcReady();
}

/** Wait for Tauri IPC during the webview bootstrap gap. No-op when already ready.
 *  Memoized so browser/E2E persistence does not poll 2s on every table call. */
let ipcWait: Promise<boolean> | null = null;

export async function waitForTauriIpc(timeoutMs = 2000): Promise<boolean> {
  if (import.meta.env.MODE === "test") return false;
  if (isTauriIpcReady()) return true;
  if (!ipcWait) {
    ipcWait = (async () => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (isTauriIpcReady()) return true;
      }
      return false;
    })();
  }
  return ipcWait;
}

/**
 * Compile-time Tauri build (`tauri dev` / `tauri build`). Distinct from
 * `isTauriIpcReady()` so credential stores can refuse webview localStorage
 * even when IPC is late, without changing the browser/Playwright path.
 */
export function isTauriAppBuild(): boolean {
  const platform = import.meta.env.TAURI_ENV_PLATFORM;
  return typeof platform === "string" && platform.length > 0;
}
