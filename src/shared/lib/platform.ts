/**
 * Runtime platform detection. In the Tauri webview the IPC bridge injects
 * `__TAURI_INTERNALS__`; a plain browser (dev server / Playwright) has no
 * backend, so features fall back to browser adapters (localStorage + fetch).
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
