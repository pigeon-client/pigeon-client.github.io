# Pigeon — QA Bug Log

Full-app manual + automated QA pass (browser build, `pnpm dev` on :1420, driven with Playwright).
Covered: request-builder, response-viewer, collections, environments, history/drafts,
import-export (cURL), settings, sidebar, execution, content-types, plus the mandatory edge-case
suite (long URL, header/param scroll, tab rename/close menu, cURL round-trip, `⌘S` save,
`{{token}}` interpolation/hover, narrow viewport, non-2xx responses).

Automation after fixes: `pnpm test` — 74/74 Vitest tests pass. `pnpm e2e` — 30/30 Playwright
specs pass, including new regression coverage for context-menu Escape dismissal and bounded
response-panel resizing. The existing environment-token hover spec now passes.

Bugs are ranked blocker → trivial.

## Bug 1 — Tab context menu does not close on Escape and its invisible backdrop button traps all input (major, fixed)

- **Status:** Fixed and verified.
- **Fix:** Added a menu-lifetime `window` Escape listener, moved focus to the first enabled menu
  item on open, removed the backdrop's dead keyboard handler, and marked menu/menu-item roles.
- **Verification:** `e2e/tabs.spec.ts` now opens the context menu, presses Escape, confirms it
  closes, then edits the URL bar. Full E2E passes.

- **Steps:**
  1. Open the app with at least one request tab open.
  2. Right-click a workspace tab to open the New Request / Duplicate / Close Tab / Close Other Tabs
     / Close All Tabs context menu.
  3. Press `Escape`.
  4. Try to click the URL bar, a tab, or anywhere else in the app.
- **Current behavior:** The menu stays open — `Escape` has no visible effect. The full-viewport
  click-away backdrop button (`aria-label="Close menu"`, `position: fixed; inset: 0`) remains on
  top of the entire app (verified via `document.elementFromPoint()` / Playwright actionability
  logs: `button[aria-label="Close menu"] intercepts pointer events`), so every click anywhere in
  the app is swallowed by the backdrop until the user clicks once (anywhere) to dismiss it. A
  keyboard-only user has no way to close the menu at all — `Escape` never reaches the backdrop's
  `onKeyDown` handler because the backdrop button is rendered but never focused when the menu
  opens (no `.focus()` call, no global `keydown` listener). This is also inconsistent with the
  app's own `⌘/` Keyboard Shortcuts modal, which documents "Close modal / blur focus → Esc" as a
  universal shortcut.
- **Expected behavior:** Pressing `Escape` while the tab context menu is open closes it
  immediately (matching every other modal/menu in the app, all of which do close on `Escape`).
- **Location:** `apps/desktop/src/features/request-builder/components/TabStrip.tsx:140-165`
  (`TabContextMenu` backdrop `<button aria-label="Close menu">` — `onKeyDown` Escape/Enter/Space
  handler at lines 147-152 is dead code because nothing ever moves focus to this element; needs
  either an autofocus/`useEffect` on open or a `window`-level `keydown` listener scoped to the
  menu's lifetime).

## Bug 2 — `{{token}}` hover preview in the URL bar never fires (major, fixed)

- **Status:** Fixed and verified.
- **Fix:** Raised the syntax overlay to the input's stacking level so its token chips receive
  pointer events while non-token overlay areas still pass events through to the input. Mouse-down
  on a token restores focus to the URL input.
- **Verification:** Existing `e2e/environments.spec.ts` token-hover test now passes and displays
  `api.example.com`. Full E2E passes.

- **Steps:**
  1. Create an environment with a variable, e.g. `host = api.example.com`, and set it active.
  2. Type `https://{{host}}/ping` into the URL bar.
  3. Hover the mouse over the `{{host}}` chip in the URL bar.
- **Current behavior:** No resolved-value preview ("api.example.com") ever appears, even after
  waiting. `document.elementFromPoint()` at the token's screen center resolves to
  `input[data-testid=url-input]`, never the `env-token` span underneath — the transparent,
  absolutely-positioned `url-input` (`absolute inset-0 z-[var(--z-raised)]`) sits above the
  syntax/token overlay and intercepts all pointer events, so the `env-token` span's
  `pointer-events-auto` + `mouseenter` handler never fires. Reproduced deterministically via
  Playwright (`e2e/environments.spec.ts` "hovering a `{{token}}` in the URL shows its resolved
  value" — fails 100% of the time with a 30s hover timeout because `env-token`'s ancestor chain is
  permanently occluded).
- **Expected behavior:** Hovering a `{{token}}` chip in the URL bar shows its resolved value (or
  "unresolved" / "generated per send") in a preview line under the URL bar, per
  `docs/features/environments.md` UX/interactions and the environments E2E spec.
- **Location:** `apps/desktop/src/features/request-builder/components/UrlBar.tsx` — the
  `url-input` element needs `pointer-events-none` (with a real, hoverable hit target for typing
  restored some other way) or the `env-token` overlay spans need to render above the input for
  their own hover hit box. Regressed by the long-URL scroll-sync rework in commit `9af2269`
  ("Enhance tab functionality and add SSE support"). Already logged as a known/open bug in
  `docs/features/request-builder.md` (Open risks) and `docs/features/environments.md` (Open
  risks); this pass reconfirms it live in both manual hover testing and the existing E2E spec.

## Bug 3 — Response panel resize has no upper clamp; dragging to the bottom hides it permanently (major, fixed)

- **Status:** Fixed and verified.
- **Fix:** Clamp editor height between 150px and the current split height minus a 160px minimum
  response height. Double-clicking (or pressing Enter/Space on) the resize handle resets the split.
- **Verification:** New `e2e/smoke.spec.ts` regression drags the handle to the viewport bottom,
  confirms the response remains at least 150px tall, then double-clicks and confirms reset.

- **Steps:**
  1. Send a request so the response panel is visible below the request editor.
  2. Grab the horizontal resize handle between the request editor and the response panel.
  3. Drag it all the way down to the bottom of the window and release.
- **Current behavior:** The request editor keeps growing with no upper bound, squeezing the
  response panel down to zero height. Once released, there is no way to drag the handle back up —
  the handle sits at the very bottom edge and the response panel is gone. Reloading or reopening
  the tab is the only recovery; there is no double-click-to-reset on the handle either. The resize
  only clamps the *minimum* editor height (`Math.max(150, startHeight + delta)`), never the maximum
  relative to the container, so the editor can consume the entire viewport.
- **Expected behavior:** The editor/response split should clamp the editor to a maximum (leaving a
  minimum response-panel height, e.g. `Math.min(containerHeight - MIN_RESPONSE, ...)`) so the
  response panel can never be fully collapsed, and/or double-clicking the resize handle should
  reset the split to its default. The response panel must always remain reachable.
- **Location:** `apps/desktop/src/app/AppContent.tsx:265-287` (`onResizeStart`; the `onMove`
  clamp at line 273 has only a lower bound — needs an upper bound derived from the container
  height minus a minimum response-panel height).

## Notes on things that were checked and are NOT bugs

For completeness (ruled out during this pass, no doc changes needed):

- Long URL (≥1KB, 60 query params), horizontal wheel/`End`-key scroll, and Params sync — all
  correct; no page-level layout overflow at 1400px, 900px, or 700px viewport widths.
- Headers/Params: 25+ rows scroll vertically inside the editor pane only (page body does not
  scroll); long (600+ char) header values accept input and scroll horizontally.
- Disabling a param row correctly removes it from the URL query and re-enabling restores it;
  deleting all rows leaves exactly one blank trailing row.
- Tab rename (double-click, Enter/Esc), name-lock persisting across URL path changes, and the
  tab right-click menu's individual actions (New/Duplicate/Close/Close Other/Close All) all work
  as documented — only `Escape` dismissal is broken (Bug 1).
- cURL paste into the URL bar and the Import modal (valid + invalid input, error messaging, new
  tab vs current tab) all work as documented.
- `⌘S` Save to Collection modal, `⌘,` Settings, `⌘⇧E` Environment Manager, `⌘/` Shortcuts — all
  open/close correctly; typing (including spaces) in modal text inputs does not dismiss the modal;
  `Escape` correctly closes all of these (Settings, Shortcuts, Environment Manager, Save modal),
  unlike the tab context menu.
- `{{` autocomplete in the URL bar inserts built-in (`$email`/`$firstName`/`$lastName`/`$uuid`)
  and env-defined suggestions correctly.
- Auth injection on the wire verified for Bearer, Basic, and API-Key (both header and query
  placement) — all correct `Authorization`/custom-header/query values captured via network mock.
- Response viewer: 200 JSON pretty-print, 404 empty-body placeholder, HTML response renders in a
  sandboxed iframe (`sandbox=""`, scripts confirmed blocked by the browser), Copy-as-cURL writes a
  valid `curl '...'` string to the clipboard (confirmed with clipboard permissions granted),
  transport failure (`ECONNREFUSED`/unsafe port) renders `status: 0` with error text instead of
  throwing.
- SSE mock stream: events list newest-first, correct event count.
- History dedupe: sending the same URL twice updates one entry instead of creating a duplicate;
  a different URL creates a second entry. Drafts always render as a host/path tree, even with a
  single draft. Empty-request state shows only "Try an example" (no separate New Request CTA).
- Theme toggle (Dark/Light) and word-wrap toggle both persist across reload via `localStorage`.
- Collection creation modal: typing a name containing spaces does not close the modal; collection
  is created and appears in the sidebar tree.
- Sidebar collapse/expand, narrow viewport (700–1400px) — no page-level horizontal overflow.

## Go / no-go

**Go.** All three reported major bugs are fixed and covered by Playwright. Validation:

- `pnpm test` — 74/74 passed.
- `pnpm e2e` — 30/30 passed.
- `pnpm --filter pigeon exec tsc --noEmit` — passed.
- Biome / IDE diagnostics on changed files — clean.
