# Collections

## Overview

Saved requests as a folder/request tree, plus save-to-collection (`⌘⇧S`). Persistence: SQLite on
desktop, `localStorage` in browser.

## Problem / job to be done

Users need durable, nested organization of requests (beyond history/drafts) with clear CRUD and
save destination picking.

## User stories

- As a developer, I want collections and folders so I can group API areas.
- As a developer, I want `⌘S` to update a request already in a collection without a modal, and
  `⌘⇧S` to save into a chosen folder/root.
- As a developer, I want rename/delete with confirm so I do not lose work accidentally.
- As a developer, I want to drag a request (or folder) onto another folder — or the collection
  root — to reorganize the tree without delete/re-add.

## Functional requirements

1. Create / rename / delete collections via modals.
2. Nested folders up to `MAX_NESTING_DEPTH` (**10**); add request/folder from collection row actions.
3. Save modal: pick collection + destination, edit name; sets `nameLocked` when renamed.
4. Tree updates rebuild nodes immutably (never mutate in place).
5. Strip live `File` objects before persist — names/metadata only.
6. Desktop: `collections` SQLite table (text UUIDs; legacy int migrated). Browser:
   `pg_browser_collections`.
7. Folders can hold inherited headers/auth (`CollectionNode.folderConfig`), applied to every
   request opened from inside them — see "Folder-level headers & auth" below.
8. Drag-and-drop: drag a request onto a folder row or collection root to move it (`moveNode`).
   Works within a collection and **across collections**. Dropping onto a descendant of a dragged
   folder is rejected; nesting past `MAX_NESTING_DEPTH` is rejected.

## Non-functional requirements

- Create-collection modal disables open animation for snappiness.
- Folders start collapsed; user expands as needed (no auto-expand-by-size rule).

## Acceptance criteria

- [ ] Create collection → appears in sidebar Collections tab.
- [ ] Add folder + nested request within depth 10; deeper add blocked.
- [ ] `⌘S` on a request opened from a collection updates that node (no modal).
- [ ] `⌘S` / `⌘⇧S` with URL on a new request opens save modal; save places request at chosen path.
- [ ] Delete collection confirms and removes tree.
- [ ] Drag a request onto another folder → it appears under that folder after reload.
- [ ] Drag a request onto the collection root → it leaves its folder.
- [ ] Drag a request onto another collection (root or folder) → it leaves the source collection.
- [ ] Reload app — collections persist (desktop SQLite / browser localStorage).
- [ ] Binary/file metadata survives save without `File` blob.

## UI

- **Collections sidebar tab** — New Collection (dashed), then collection rows (name, count, hover
  actions: add request / folder / rename / delete). Expand → nested folders + method-colored requests.
- **Save modal (`⌘⇧S`)** — collection + folder/root destination, name field, Save.

## UX / interactions

- CRUD via shared name modal ("Create"/"Rename"); delete confirms.
- Opening a saved request loads into a tab (reuse empty or new).
- Name lock on save rename keeps chosen tab name later.
- Drag a request onto a highlighted folder or collection root to move it (`@dnd-kit` pointer DnD;
  drag a few pixels so clicks still select). Works across collections too. Destination expands
  after a successful drop.

## Folder-level headers & auth

Each folder (not the top-level collection itself) can carry its own headers + auth, set via the
gear icon on a folder's hover actions (`FolderConfigModal` — Headers/Auth tabs, same
`VarKeyValueEditor`/`AuthEditor` as the request editor). Clicking a saved request merges every
ancestor folder's config into the request *at that moment* (`lib/inheritance.ts`'s
`resolveInheritedRequest`, ancestors from `lib/tree.ts`'s `findAncestors`) before it opens in a
tab — it is a one-time merge, not a live link, matching how history snapshots work.

Precedence: the request's own header/auth always wins; among folders, the closest ancestor wins;
header matching is by key, case-insensitive. The gear icon shows a dot when a folder has config
set. A folder with no config set inherits nothing extra.

**Drafts get the same gear icon and modal** on their auto-organized host/path folders (Sidebar's
Draft tab — see `docs/features/history-drafts.md`). Since that tree is rebuilt fresh from the flat
draft list on every render (not a persisted `Collection`), config is stored separately, keyed by
the folder's deterministic host/path id, in `features/rest/history/store.ts`'s
`draftFolderConfigs` (`services/db.ts`'s `getDraftFolderConfigs`/`saveDraftFolderConfigs` —
`localStorage`, both builds, no SQL table, same pattern as environments' globals) and reattached to
the freshly-built tree each render before rendering/resolving.

## Keyboard

`⌘S` updates the open request in place when the tab was opened from a collection (or after a
prior Save). Otherwise — and always for `⌘⇧S` — opens the save modal to pick collection + folder.

## States & edge cases

- Empty → "No collections yet" + Create CTA.
- Immutable tree updates required for React change detection.
- Modal: Space in inputs must not close backdrop.

## Manual test checklist

- [ ] Create / rename / delete collection.
- [ ] Nest folders to depth 10; attempt beyond — blocked.
- [ ] Save request via `⌘S` into nested folder; reopen from tree.
- [ ] Drag a request between folders and onto the collection root.
- [ ] Delete folder with children — confirm expected behavior.
- [ ] Reload persistence check.
- [ ] Save request with multipart file — only metadata persisted.
- [ ] Set a folder header + bearer auth via the gear icon; open a request nested inside — both
      appear on the opened tab. Request's own header with the same key is not overridden.

## Automation coverage

- Vitest: `src/features/rest/collections/store.test.ts`.
- Playwright: `e2e/collections.spec.ts` — create+persist, and rename/nested-folder-save/reopen/
  delete-folder-with-children/delete-collection (2026-07-26 QA pass; confirmed `stripFiles` drops
  live `File` handles on save, per `store.ts`).

## Test ids

`sidebar-tab-collections`; name modal `#collection-name-modal-input`; confirm "Create".
Tree rows often selected by text in E2E.

## Key files

`store.ts`, `types.ts` (`MAX_NESTING_DEPTH`, `FolderConfig`), `lib/tree.ts` (incl. `findAncestors`),
`lib/inheritance.ts` (`resolveInheritedRequest`), `components/SaveToCollectionModal.tsx`,
`components/CollectionsTab.tsx`, `components/FolderConfigModal.tsx`, `components/NameModal.tsx`,
`services/db.ts`. Composed into `src/app/layout/Sidebar.tsx`; generic tree row UI is
`src/shared/ui/TreeRow.tsx`.

## Open risks

- Deep trees + search filter edge cases.
- Move/reorder UX must keep immutability — regressions show as stale UI.
