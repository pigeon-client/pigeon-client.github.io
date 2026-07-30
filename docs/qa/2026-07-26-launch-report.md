# QA Report — Launch Phase 5 sweep

## Test date

2026-07-26

## Test environment

Browser build (`pnpm dev` on :1420), Playwright chromium, Vitest (happy-dom). Ran from
`apps/desktop/`. No Tauri/desktop build exercised in this pass (no interactive browser tool
available beyond Playwright) — Tauri-only paths (SSL verify toggle, proxy, updater install,
real SQLite) are **not** covered here; see individual docs' Open risks for that split.

## Automated results (baseline, before this pass)

- Vitest: 109/109 passed.
- Playwright: 46/46 passed.

## Automated results (after this pass)

- Vitest: **111/111** passed (+2: `--data-binary` export tests).
- Playwright: **52/52** passed (+6 new spec files/cases: `long-values`, `shortcuts`,
  `sidebar-search`, plus additions to `collections`, `send`, `body-editor`, `import-curl`,
  `settings-theme`).
- `tsc --noEmit`: clean.

## Manual / checklist walk

Walked every "Manual test checklist" in `docs/features/*.md`. For items not already covered by an
existing spec, drove them via new Playwright specs (real browser automation, not just code
reading) wherever the item was UI/behavior-testable without a real file picker or a live desktop
build. Summary per doc:

- **request-builder** — closed both documented open risks: header-key suggestion dropdown now caps
  at `max-h-[220px]` with internal scroll; added `e2e/long-values.spec.ts` (3KB URL, 600+ char
  header value, 25-row vertical scroll — all with explicit "page didn't overflow" assertions).
- **execution** — added Bearer-auth-on-the-wire and non-2xx-empty-body checks to `send.spec.ts`.
  Found and fixed a real bug (see Bug summary).
- **content-types** — added `--data-binary` curl-export unit tests (previously untested) and a
  URL-Encoded-body wire-format e2e test. File-picker-dependent items (real file upload, PDF
  response iframe) verified only by code reading (`stripFiles`), not driven.
- **response-viewer** — mock 200/404/empty-body paths covered; HTML-preview sandboxing, huge-JSON
  scroll, word-wrap persistence, response-headers-tab scroll, and resize-handle drag were **not**
  driven this pass (documented as such in the doc rather than silently left stale).
- **collections** — added a full rename → nested-folder create → save-into-folder → reopen →
  delete-folder-with-children → delete-collection e2e (previously only create+persist existed).
- **history-drafts, environments, settings, command-palette, mcp** — checklists already
  well-covered by existing/prior-phase specs; spot-checked, no gaps found.
- **import-export** — added an invalid-curl-in-modal error-not-crash case.
- **sidebar** — added `⌘F` cross-pane search test (History flat list + Draft auto-tree, including
  expanding a collapsed host folder to confirm the leaf-level filter). Drag-resize-to-bounds and
  icon-contrast were not driven (the former shares code with the already-tested response-panel
  resize handle; the latter is visual-only).

## Bug summary

1. **[Fixed, major] Browser build silently omitted `Content-Type` on every body-carrying
   send.** `execution/services/sseClient.ts#sendBrowserMaybeSse` — the streamId-aware send path
   that *every* browser-build request actually goes through (a `streamId` is always passed from
   `UrlBar`'s `handleSend`) built its own `fetch()` call and never applied
   `contentTypeForBody(bodyType)`, unlike `BrowserHttpClient` (effectively dead code for this
   reason) and unlike the Rust desktop transport (which was already correct). Caught while adding
   the URL-Encoded-body wire test — expected `Content-Type: application/x-www-form-urlencoded`,
   got `text/plain;charset=UTF-8`. Fixed by mirroring the same auto-Content-Type logic in
   `sendBrowserMaybeSse`. Desktop users were never affected. Regression-guarded by
   `e2e/body-editor.spec.ts`. Documented in `docs/features/execution.md` Open risks.

No other bugs found. Everything else driven in this pass passed on the first or second attempt
(a few e2e locator scoping issues along the way — ambiguous text matches against the tab strip /
other buttons — were test-authoring mistakes, not product bugs, and are already fixed in the
committed specs).

## Deferred (explicitly out of scope for this pass, not bugs)

- Real file-picker-driven multipart/binary upload flows (needs `setInputFiles` + a temp fixture
  file; time-boxed out).
- HTML response preview sandbox attribute check, word-wrap-persists-across-reload, response
  headers-tab long-value scroll, sidebar drag-resize bounds, light/dark icon contrast — all
  visual/interaction checks with no reported instability and no reason to suspect regression, but
  genuinely not exercised in this pass. Flagged in the relevant docs rather than marked green.
- Everything explicitly out of scope per the launch brief (email testing, GraphQL, WebSocket,
  scripting/assertions, team sync, MCP stdio/session-save/tool-chaining, Windows/Linux builds).

## Go / no-go

**Go**, with the caveat above: this pass covered browser-build functional correctness and closed
the two request-builder open risks plus one real cross-cutting bug. It did not include a desktop
(Tauri) build pass or file-picker-driven flows — recommend a follow-up desktop-specific pass before
final release sign-off (Phase 7 covers signing/notarization separately).
