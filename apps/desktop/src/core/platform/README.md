# core/platform

The shared shape behind every "pick the Tauri or browser implementation" seam.

## Public API (`index.ts`)
- `selectImpl<T>({ tauri, browser })` — returns `isTauri() ? tauri : browser`. Used by `core/http`'s
  `httpClient` and MCP's `getMcpTransport`; the two port interfaces stay separate, only the
  selection pattern is shared.

## Note
`isTauri()` (`@/shared/lib/platform`) and `windowKind.ts` (`@/shared/lib/windowKind`) still live at
their original `shared/lib/` path, not here — moving them into `core/platform` was scoped out of
the restructure that created this module (see `docs/restructure-plan.md`'s Phase 3/4 notes). This
package only holds `selectImpl` itself.

## Extend
New "Tauri vs. browser" seam = call `selectImpl({ tauri, browser })` instead of writing another
`isTauri() ? x : y` ternary.
