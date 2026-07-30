# History & Drafts

## Overview

Every sent request is auto-saved. **History** is a time-bucketed log; **Drafts** are the
auto-organized working set of requests you have edited/sent.

## Problem / job to be done

Users lose track of recent calls and in-progress URLs. History/drafts recover them without
forcing an explicit save to a collection.

## User stories

- As a developer, I want every send recorded in History with status/time.
- As a developer, I want Drafts grouped by host/path so related endpoints cluster.
- As a developer, I want clicking a row to reopen the request in a tab.

## Functional requirements

1. On send: upsert draft by method+URL; add/update history entry (dedupe same method+normalized URL).
2. History grouped: Today / Yesterday / This Week / Last Week / Older.
3. Drafts **always** render as a path-compressed tree via `buildUrlTree` / `AutoTree` (host →
   folders → leaves). There is no flat-list threshold.
4. Open row → reuse empty tab or open new.
5. Per-row delete (hover trash); search filters (`⌘F`).
6. Persistence: SQLite desktop; `pg_browser_drafts` / `pg_browser_history` in browser.
7. Caps: history kept to **100** entries; drafts to **50**.

## Non-functional requirements

- Draft tree expand state sticky within session.
- Dedup updates in place (status, timing, timestamp) rather than duplicate rows.

## Acceptance criteria

- [ ] Send twice same URL → one history entry updated, not two duplicates.
- [ ] Send different URL → second history entry.
- [ ] Drafts always show host/path tree (even with 1–2 drafts).
- [ ] Click history/draft opens correct method+URL in tab.
- [ ] Delete removes entry; empty states show hints.
- [ ] Search filters visible rows.
- [ ] History never exceeds 100; drafts never exceed 50.

## UI

- **History tab** — time buckets; rows: method + name + status color + time.
- **Draft tab** — path-compressed tree:

```
Draft (always tree)
  jsonplaceholder.typicode.com
    todos            2
      GET  /
      GET  /1
```

## UX / interactions

- Path grouping: `/todos` and `/todos/1` under one `todos` folder; list request shows as `/`.
- Host rows show domain only.

## Keyboard

`⌘F` focuses header search (filters active sidebar pane).

## States & edge cases

- Empty → "No history yet" / "No drafts yet".
- Wrong-URL capture on consecutive sends was a past bug — verify dedupe + correct URL on each send.

## Manual test checklist

- [ ] Send A, send A again → single history row, updated time/status.
- [ ] Send B → two distinct history rows with correct URLs.
- [ ] One draft still shows host tree (not a flat list).
- [ ] Open from History and Draft; verify tab contents.
- [ ] Search filter; clear search.
- [ ] Persistence across reload.

## Automation coverage

- Playwright: `e2e/history-drafts.spec.ts`.
- Store logic covered indirectly; prefer unit tests if dedupe regresses.

## Test ids

`sidebar-tab-history`, `sidebar-tab-draft`. Rows by endpoint/name text in E2E.

## Key files

`apps/desktop/src/features/history/store.ts`, `services/db.ts`.
Tree helpers: `apps/desktop/src/features/collections/lib/tree.ts` (`buildUrlTree`,
`collapseChains`, `mergeCollectionRoots`) — rendered via `AutoTree` in
`src/app/layout/Sidebar.tsx`.

## Open risks

- Dedup normalization must match URL normalize helpers or dupes return.
- History/draft caps are soft (slice on write); older entries drop silently.
