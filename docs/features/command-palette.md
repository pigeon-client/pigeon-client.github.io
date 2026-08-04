# Command Palette

## Overview

`⌘⇧K` opens a centered overlay that searches every request Pigeon knows about — History, Drafts,
and every request in every Collection — in one query, and opens the match in a tab.

## Problem / job to be done

`⌘F` only filters the *active* sidebar pane, so the user has to already know whether a request
lives in History, Drafts, or a specific Collection before they can find it. The palette removes
that requirement: one query, every source, ranked.

## User stories

- As a developer, I want to hit `⌘⇧K` and type a few letters of a URL/name/body and jump straight
  to that request, regardless of which sidebar pane it lives in.
- As a developer, I want the result to show me the method, name, host, and where it came from
  before I commit to opening it.
- As a developer, I want `↑`/`↓` + `Enter` to work without touching the mouse.

## Functional requirements

1. `⌘⇧K` opens the palette; `⌘F` is unchanged (still sidebar-pane filtering).
2. One query searches history, drafts, and every request in every collection (tree walked via
   `src/features/rest/collections/lib/tree.ts`-adjacent recursion in
   `command-palette/lib/search.ts#collectPaletteItems`).
3. Match fields, case-insensitive substring: request name, method, full URL, header keys/values,
   request body text, and (Phase 6) the history snapshot's response body text.
4. Ranking tiers (`searchPalette`): 0 exact URL, 1 URL prefix, 2 URL substring, 3 name/method,
   4 header key/value, 5 request body text, 6 response-snapshot body text (history only, ranked
   below every request-field match — a body match is a weaker signal than the request itself).
   Ties broken by recency (history timestamp; drafts/collection items have no timestamp and sort
   after any history tie).
5. Each row shows: method (same color classes as the tab strip, `methodTextClass`), name/URL,
   host (`hostOf`), a source badge (`History` / `Draft` / `<collection name>`), and a relative time
   (`relativeTime`) for history rows only.
6. `↑`/`↓` moves selection, `Enter` opens the selected row, `Esc` closes without changing state.
7. Opening reuses the single empty tab if that's all there is, otherwise opens a new tab — the same
   rule as `Sidebar.tsx`'s `loadRequest`. If the opened result is a history row with a snapshot,
   the response panel renders it immediately (same as clicking the row in the sidebar) — no re-send.
8. Works identically in the desktop (SQLite-backed store) and browser (localStorage-backed store)
   builds — the palette only reads from `useHistoryStore` / `useCollectionStore`, it doesn't touch
   `services/db.ts` directly.

## Non-functional requirements

- Search is a pure, synchronous function (`searchPalette`) over data already in Zustand stores —
  no I/O on keystroke, so results update within a frame at the scale this app targets (≤1,000
  history rows post-Phase-2 retention).
- No regex, no filter DSL.

## Acceptance criteria

- [ ] `⌘⇧K` opens the palette from anywhere in the app (not just when a tab is focused).
- [ ] Typing a body fragment unique to one saved collection request surfaces that row with the
  correct method and collection-name source badge.
- [ ] Typing a URL fragment from a sent request surfaces a History row; opening it loads the exact
  method + URL.
- [ ] `Esc` closes the palette and leaves the previously active tab untouched.
- [ ] `⌘F` sidebar search still works and is unaffected by `⌘⇧K`.

## UI

- Centered overlay, ~12vh from the top, backdrop blur — same visual language as `Modal`
  (`src/shared/ui/Modal.tsx`) but custom-built (search input replaces a header, no footer).
- Input at the top (`command-palette-input`), scrollable result list below
  (`command-palette-result-<i>`), empty/no-match hint text when the query is blank or unmatched.

## UX / interactions

- Hovering a row moves the keyboard selection to it, so mouse and keyboard stay in sync.
- Selected row gets `bg-accent`; others get a lighter hover state.
- The list auto-scrolls the selected row into view on arrow navigation.

## Keyboard

`⌘⇧K` opens/closes (toggle). Inside: `↑`/`↓` navigate, `Enter` opens, `Esc` closes. While the
palette is open, every other global shortcut (`⌘F`, `⌘⇧N`, `⌘⇧S`, …) is suppressed in
`AppContent.tsx`'s keydown handler so they can't fire underneath it.

## States & edge cases

- Empty query: hint text, no rows, no wasted search work.
- No matches: "No matching requests." — never a blank list with no explanation.
- Very long collection names truncate in the source badge rather than pushing the row layout.
- Same request URL present in History *and* saved to a Collection produces two distinct rows (one
  per source) — this is intentional, not deduped, since they can drift independently.

## Manual test checklist

- [ ] `⌘⇧K` from the empty-request state, from a tab with a URL, and from inside another modal.
- [ ] Search a body fragment unique to a draft; a URL fragment unique to a collection request;
  a name fragment unique to a history row — each finds only the expected row(s).
- [ ] Arrow through results with the mouse never touching the list; `Enter` opens the highlighted
  row.
- [ ] Open a result when there's exactly one empty tab (reuses it) and when there's an active tab
  with content (opens a new tab).
- [ ] `Esc` while typing a query closes without side effects.

## Automation coverage

- Playwright: `e2e/command-palette.spec.ts` — collection-request body-text match + open, sent
  history-request URL match + keyboard open, Escape-closes-without-side-effects.
- Vitest: `src/features/command-palette/lib/search.test.ts` — `collectPaletteItems` flattening
  (history/drafts/nested collection tree), `searchPalette` tiering + recency tie-break (including
  the tier-6 snapshot-body case, ranked below a tier-5 request-body match), `hostOf`, `relativeTime`.

## Test ids

`command-palette`, `command-palette-input`, `command-palette-result-<i>`.

## Key files

`apps/desktop/src/features/command-palette/lib/search.ts` (pure search/ranking, unit-tested),
`components/CommandPalette.tsx` (overlay + keyboard nav), `index.ts` (barrel). Wired into
`src/app/AppContent.tsx` (⌘⇧K handler + render) and listed in
`src/features/settings/components/KeyboardShortcutsModal.tsx`.

## Open risks

- Recency tie-break only has timestamps for history rows; drafts and collection requests sort
  after history ties by insertion order, which is stable but not meaningfully "recent."
- No fuzzy matching yet — case-insensitive substring only, per the Phase 3 scope (fuzzy URL/path
  matching was "preferred" but not required and was cut to keep the palette's search pure/fast).
