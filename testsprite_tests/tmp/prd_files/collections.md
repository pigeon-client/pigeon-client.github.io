# Collections

## Overview

Saved requests as a folder/request tree, plus save-to-collection (`⌘S`). Persistence: SQLite on
desktop, `localStorage` in browser.

## Problem / job to be done

Users need durable, nested organization of requests (beyond history/drafts) with clear CRUD and
save destination picking.

## User stories

- As a developer, I want collections and folders so I can group API areas.
- As a developer, I want `⌘S` to save the active request into a chosen folder/root.
- As a developer, I want rename/delete with confirm so I do not lose work accidentally.

## Functional requirements

1. Create / rename / delete collections via modals.
2. Nested folders up to `MAX_NESTING_DEPTH` (**10**); add request/folder from collection row actions.
3. Save modal: pick collection + destination, edit name; sets `nameLocked` when renamed.
4. Tree updates rebuild nodes immutably (never mutate in place).
5. Strip live `File` objects before persist — names/metadata only.
6. Desktop: `collections` SQLite table (text UUIDs; legacy int migrated). Browser:
   `pg_browser_collections`.

## Non-functional requirements

- Create-collection modal disables open animation for snappiness.
- Folders start collapsed; user expands as needed (no auto-expand-by-size rule).

## Acceptance criteria

- [ ] Create collection → appears in sidebar Collections tab.
- [ ] Add folder + nested request within depth 10; deeper add blocked.
- [ ] `⌘S` with URL opens save modal; save places request at chosen path.
- [ ] Delete collection confirms and removes tree.
- [ ] Reload app — collections persist (desktop SQLite / browser localStorage).
- [ ] Binary/file metadata survives save without `File` blob.

## UI

- **Collections sidebar tab** — New Collection (dashed), then collection rows (name, count, hover
  actions: add request / folder / rename / delete). Expand → nested folders + method-colored requests.
- **Save modal (`⌘S`)** — collection + folder/root destination, name field, Save.

## UX / interactions

- CRUD via shared name modal ("Create"/"Rename"); delete confirms.
- Opening a saved request loads into a tab (reuse empty or new).
- Name lock on save rename keeps chosen tab name later.

## Keyboard

`⌘S` opens save modal when active request has a URL.

## States & edge cases

- Empty → "No collections yet" + Create CTA.
- Immutable tree updates required for React change detection.
- Modal: Space in inputs must not close backdrop.

## Manual test checklist

- [ ] Create / rename / delete collection.
- [ ] Nest folders to depth 10; attempt beyond — blocked.
- [ ] Save request via `⌘S` into nested folder; reopen from tree.
- [ ] Delete folder with children — confirm expected behavior.
- [ ] Reload persistence check.
- [ ] Save request with multipart file — only metadata persisted.

## Automation coverage

- Vitest: `src/features/collections/store.test.ts`.
- Playwright: `e2e/collections.spec.ts`.

## Test ids

`sidebar-tab-collections`; name modal `#collection-name-modal-input`; confirm "Create".
Tree rows often selected by text in E2E.

## Key files

`store.ts`, `types.ts` (`MAX_NESTING_DEPTH`), `lib/tree.ts`,
`components/SaveToCollectionModal.tsx`, `services/db.ts`, tree UI in
`src/app/layout/Sidebar.tsx`.

## Open risks

- Deep trees + search filter edge cases.
- Move/reorder UX must keep immutability — regressions show as stale UI.
