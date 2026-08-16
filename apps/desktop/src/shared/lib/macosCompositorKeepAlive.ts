/**
 * macOS WKWebView throttles its compositor when the host window is backgrounded,
 * so Mission Control thumbnails show only the window background color. A no-op
 * rAF loop plus visibility spoofing keeps the compositor warm (mirrors the Rust
 * injection in `src-tauri/src/macos.rs`).
 */
export function startMacosCompositorKeepAlive(): void {
  if (typeof window === "undefined") return;
  if (window.__pigeonMacCompositorKeepAlive) return;
  window.__pigeonMacCompositorKeepAlive = true;

  try {
    Object.defineProperty(Document.prototype, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    Object.defineProperty(Document.prototype, "hidden", {
      configurable: true,
      get: () => false,
    });
  } catch {
    // Non-fatal — rAF loop alone still helps.
  }

  const warm = () => {
    requestAnimationFrame(warm);
  };
  requestAnimationFrame(warm);
}

declare global {
  interface Window {
    __pigeonMacCompositorKeepAlive?: boolean;
  }
}
