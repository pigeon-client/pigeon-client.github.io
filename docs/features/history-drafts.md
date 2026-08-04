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
7. No numeric cap on desktop. History is pruned by **time-based retention** once on app start
   (default 90 days; 30 days / 90 days / 1 year / Forever, Settings → Data → "Keep history for").
   Drafts and collections are never pruned. Browser build (localStorage, no retention concept) keeps
   a quota-safety cap instead — history 1,000 / drafts 300 — trimming oldest-first with a one-time
   `console.info`; desktop never drops anything silently.
8. **Draft auto-folder headers/auth:** each draft folder's gear icon opens the same
   `FolderConfigModal` collections uses, inheriting into every request opened from inside it —
   see `docs/features/collections.md`'s "Folder-level headers & auth" section for the merge rules
   (request wins, closest folder wins). Config persists keyed by the folder's deterministic
   host/path id in `localStorage` (`draftFolderConfigs`, both builds — no SQL table).
9. **Response snapshots (Phase 6):** on send, the response body is captured with the history
   entry — text bodies only, capped at 256KB with a `truncated` flag past the cap; binary/media
   responses (`isBinaryMime`) store content-type + size only, no body. Dedupe upsert replaces the
   snapshot with the latest send's, same as every other field. Clicking a history row renders the
   snapshot in the response panel immediately — labeled "snapshot · `<relative time>`" — with no
   re-send. Browser build: under localStorage quota pressure, the oldest half of snapshots
   (by insertion order) are dropped and the write retried once before giving up.

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
- [ ] Desktop: history older than the configured retention window is pruned on app start only,
  never mid-session; entries inside the window (and all drafts) survive unlimited growth.
- [ ] Browser: history/drafts trim oldest-first only past 1,000 / 300 rows, logging once via
  `console.info`.
- [ ] Clicking a history row shows its response snapshot with no network call.
- [ ] A binary/media response's history row has no re-viewable body (metadata-only snapshot).
- [ ] A response over 256KB shows a truncated snapshot, not an unbounded one.

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

- Playwright: `e2e/history-drafts.spec.ts` — draft+history on send, and clicking a history row
  renders its snapshot (asserted via a network-call counter staying at 1) without re-sending.
- Vitest: `lib/snapshot.test.ts` (`buildSnapshot` text/binary/truncation),
  `services/db.test.ts` (`stripOldestSnapshots`, `isQuotaError`).
- Store logic covered indirectly; prefer unit tests if dedupe regresses.

## Test ids

`sidebar-tab-history`, `sidebar-tab-draft`. Rows by endpoint/name text in E2E.
`response-snapshot-label` (response-viewer, shown when a snapshot is open instead of live timing).

## Key files

`apps/desktop/src/features/rest/history/store.ts`, `services/db.ts` (thin instantiation of
`core/persistence`'s `createNumTableStore`, includes the browser quota-guard:
`stripOldestSnapshots` / `withQuotaGuard`, passed in as `browserWriteGuard`), `lib/retention.ts`
(retention window get/set + `partitionByRetention`, pure and unit-tested), `lib/snapshot.ts`
(`buildSnapshot`, `snapshotToApiResponse` — pure, unit-tested; no SQL migration needed since
`history.data` is an opaque JSON blob column, see `src-tauri/src/db/mod.rs` +
`src-tauri/src/db/history.rs`).
Tree helpers: `apps/desktop/src/features/rest/collections/lib/tree.ts` (`buildUrlTree`,
`collapseChains`, `mergeCollectionRoots`, `findAncestors`) and `lib/inheritance.ts`
(`resolveInheritedRequest`) — rendered via `AutoTree` in
`src/features/rest/history/components/DraftTab.tsx` (`Sidebar.tsx`'s `loadHistoryItem` renders the
snapshot on open, passed down as the `onLoad` prop). `DraftTab.tsx` reuses collections'
`FolderConfigModal` for the folder headers/auth gear icon.

## Open risks

- Dedup normalization must match URL normalize helpers or dupes return.
- Retention prune runs once per `load()` (app start); changing the retention selector mid-session
  only affects the *next* app start, by design — never prunes while the app is open.
- Retention pruning deletes history rows entirely — it does not currently special-case "keep the
  row but drop its snapshot" the way the browser quota-guard does. A very old, otherwise-useful
  history entry is fully gone once it ages out, not degraded to metadata-only.
