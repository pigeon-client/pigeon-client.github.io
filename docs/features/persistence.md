# Persistence

## Overview

Dual-backend persistence for desktop (Tauri SQLite via `invoke`) and browser/E2E (localStorage
adapters). Factories in `core/persistence` replace per-feature `isTauri()` boilerplate.

## Problem / job to be done

Feature stores need durable data without each module reimplementing platform branching, quota
retries, or command naming.

## User stories

- As a desktop user, I want collections/history/drafts in SQLite on disk.
- As a browser/e2e user, I want the same UX backed by localStorage.
- As a user upgrading the app, I want a one-shot migration toast when the schema migrates.

## Functional requirements

1. **Factories** (`core/persistence`):
   - `createNumTableStore` — numeric ids (history, drafts)
   - `createStrTableStore` — string ids (collections; browser-only tables when no Tauri commands)
   - `createKeyValueStore` — keyed records (mcp_oauth). On a Tauri app build this fails closed
     (never writes tokens to `localStorage`) if IPC is not ready, and migrates any leftover
     `pg_browser_mcp_oauth` rows into SQLite on first successful IPC use.
2. Feature `services/db.ts` files instantiate factories with `browserKey` + Tauri command names.
3. **Environments** persist via localStorage in **both** builds (no Rust environments table).
4. **Open tabs** persist in localStorage: `pg_open_tabs:<windowKind>`.
5. **Prefs** in localStorage even on desktop: theme, word wrap, redirects, SSL, proxy, snapshots,
   history retention, active env, globals.
6. **MigrationToast** after schema migration (desktop).
7. Browser history writes may strip oldest snapshots under quota (`browserWriteGuard`).

## Non-functional requirements

- Vitest runs without Tauri — `isTauri()` false; mocks in `src/test/setup.ts`.
- Do not hand-roll new `isTauri()` table wrappers; extend factories.

## Acceptance criteria

- [ ] Desktop: restart restores collections / history / drafts from SQLite.
- [ ] Browser: same flows work via `pg_browser_*` keys.
- [ ] Environments survive reload on desktop without SQLite table.
- [ ] Quota pressure in browser does not crash; oldest snapshots shed first.
- [ ] Migration toast appears at most once per migration event.

## UI

No dedicated settings page beyond Data tab counts / clear actions (see [settings.md](./settings.md)).
Migration toast shares toast anatomy with update toast.

## UX / interactions

Clear History / Drafts / All from Settings Data tab; collections intentionally survive Clear All.

## Keyboard

None specific.

## States & edge cases

- Snapshot size truncate (~256KB) before persist — see [history-drafts.md](./history-drafts.md).
- File blobs in form-data are stripped on save (name/meta only).
- mcp_oauth table exists for retained MCP OAuth code even while UI is coming-soon.

## Manual test checklist

- [ ] Desktop: create collection + history entry; restart; both present.
- [ ] Browser: fill storage; reload; data present.
- [ ] Settings Clear History; counts update; collections remain after Clear All.
- [ ] Trigger migration path in dev if available; toast shows once.

## Automation coverage

- Vitest: history `db.test.ts`, store tests with mocked persistence.
- Playwright uses browser adapters exclusively.

## Test ids

`data-count-history`, `data-count-drafts`, `data-count-collections`, `data-count-environments`
(Settings Data tab).

## Key files

- `apps/desktop/src/core/persistence/index.ts`
- `apps/desktop/src/core/persistence/tableStore.ts`
- `apps/desktop/src/core/persistence/browserTable.ts`
- Feature `services/db.ts` under collections / history / mcp oauth
- `apps/desktop/src/app/layout/MigrationToast.tsx`
- `apps/desktop/src-tauri/src/db/` (Rust)

## Open risks

- localStorage prefs vs SQLite feature data can confuse debugging — document which key/table.
- Browser quota behavior differs from desktop; e2e cannot assert SQLite.
