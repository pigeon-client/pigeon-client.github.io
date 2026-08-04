import { isTauri } from "@/shared/lib/platform";

/** Picks the Tauri or browser implementation of a port, once, at module init —
 *  the shared shape behind every `isTauri() ? tauriX : browserX` transport seam. */
export function selectImpl<T>(impls: { tauri: T; browser: T }): T {
  return isTauri() ? impls.tauri : impls.browser;
}
