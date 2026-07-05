# History & Drafts

Every sent request is auto-saved. **History** is a time-bucketed log; **Drafts** are the
auto-organized set of requests you've worked on.

## UI

- **History tab** — grouped by time bucket (Today / Yesterday / This Week / Last Week / Older),
  each row a compact badge (method + name + status color + time).
- **Draft tab** — auto-organized:
  - **≤ 8 drafts** → a flat list (method + endpoint + muted host/path). Tree is overkill for a few.
  - **> 8 drafts** → a path-compressed tree: one host folder, then compressed path folders
    (`v1 / users`), leaves labeled by their path (`/`, `/1`). Folders default collapsed.

```
Draft (tree, >8)                 Draft (flat, ≤8)
  jsonplaceholder.typicode.com     GET  /todos      jsonplaceholder…/todos
    todos            2             GET  /todos/1    jsonplaceholder…/todos
      GET  /
      GET  /1
```

## UX / interactions

- **Auto-save on send** — sending upserts a draft (by method+URL) and adds/updates a history entry.
- **Path grouping** — `/todos` (list) and `/todos/1` (item) group under one `todos` folder; the
  list request shows as `/` inside it. Host rows always read as just the domain.
- **Open** — clicking a row loads it into a tab (reuses the current empty tab or opens a new one).
- **Delete** — per-row trash (hover) removes the draft/history entry.
- **Search** filters both by name/URL (`⌘F`).

## States & edge cases

- **Empty** → "No history yet" / "No drafts yet" hints.
- Draft tree expand state is sticky within a session (survives tab switches).
- Persistence: SQLite in the app; `localStorage` (`pg_browser_drafts`, `pg_browser_history`) in the
  browser build. History is capped (recent entries).

## Test ids

`sidebar-tab-history`, `sidebar-tab-draft`. Rows are selected by their endpoint/name text in E2E.

## Key files

`store.ts` (history + drafts, upsert/dedupe), `services/db.ts`, tree/list rendering + helpers
(`buildUrlTree`, `collapseChains`, `mergeCollectionRoots`) in `src/app/layout/Sidebar.tsx`.
