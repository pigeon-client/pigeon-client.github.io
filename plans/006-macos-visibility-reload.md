# 006 — Don’t reload SQLite on every macOS hide while visibility is spoofed

**Against:** working tree (`macosCompositorKeepAlive.ts` uncommitted)  
**Effort:** S · **Risk:** Low · **Category:** correctness

## Why

`startMacosCompositorKeepAlive` forces `Document.prototype.visibilityState === "visible"` and `hidden === false` so WKWebView keeps compositing (Mission Control thumbnails). `AppContent` `retryLoad` bails with `if (document.visibilityState !== "visible") return`. On macOS that check never fails, so `visibilitychange` (hide/show churn) re-runs collection/history `load`/`reload`.

Do **not** remove the compositor spoof (product requirement). Change the reload guard.

## Current

`apps/desktop/src/shared/lib/macosCompositorKeepAlive.ts` 13–20 spoofs prototype getters.

`apps/desktop/src/app/AppContent.tsx` 73–94: `retryLoad` on `visibilitychange` + `focus`.

`window.__pigeonMacCompositorKeepAlive` is set when the spoof is active.

## Scope

- IN: `apps/desktop/src/app/AppContent.tsx` only
- OUT: `macos.rs`, removing rAF keepalive, `platform.ts` IPC wait

## Steps

When `window.__pigeonMacCompositorKeepAlive` is true:

- Do **not** attach `visibilitychange` → `retryLoad` (events still fire but the getter is a lie).
- Keep `window` `focus` → `retryLoad`.
- Inside `retryLoad`, if keepalive is on, skip `document.visibilityState` and use `document.hasFocus()`; if not focused, return.

When keepalive is off (Windows/Linux/browser): keep today’s `visibilityState !== "visible"` guard and both listeners.

## Verify

```
pnpm --filter pigeon exec vitest run src/shared/lib/platform.test.ts
pnpm ci:check
```

No existing AppContent unit test. Do not add a heavy React tree test unless cheap. Manual: macOS hide/show should not empty collections (existing empty-fetch guards in `collections/store.ts`).

## Done when

macOS keepalive no longer drives `retryLoad` via spoofed `visibilitychange`. Other platforms unchanged.

## Escape

If `hasFocus()` is false while the window is visible-but-unfocused (user clicked another app’s palette) and you still want a reload on “return to Pigeon”, `focus` already covers that. Do not re-enable `visibilitychange` on macOS.
