# Collections

Saved requests organized as a folder/request tree, plus the save-to-collection flow.

## UI

- **Collections sidebar tab** — a top **New Collection** button (dashed, full-width), then each
  collection as a top-level folder row showing name, request count badge, and (on hover) add-request
  / add-folder / rename / delete icon buttons. Expanding reveals nested folders and saved requests
  (method-colored).
- **Save modal** (`⌘S`) — pick a collection + destination folder (or root), edit the request name,
  Save.

## UX / interactions

- **CRUD via modals.** Create/rename use a shared name modal ("Create"/"Rename"); create-collection
  disables the modal open animation for snappiness. Delete confirms.
- **Nested saves.** Folders can nest up to `MAX_NESTING_DEPTH`. Requests save into the chosen
  folder or root; `⌘S` opens the save modal for the active request when it has a URL.
- **Name lock on save.** Renaming in the save dialog marks the request name manual (`nameLocked`),
  so reopening it as a tab keeps the chosen name; leaving it as the auto name keeps it auto.
- **Auto-expand.** Small folders (≤3 requests) open by default so a lone request isn't buried.
- **Persistence.** Stored as JSON per collection. In the desktop app → SQLite (`collections` table,
  legacy int IDs migrated to text). In the browser build → `localStorage` (`pg_browser_collections`).

## States & edge cases

- **Empty** → "No collections yet" with a "+ Create Collection" CTA.
- Tree updates rebuild nodes immutably (never mutate in place) so React re-renders correctly.
- Live `File` objects are stripped before persisting — only file names/metadata are saved.

## Test ids

`sidebar-tab-collections`; collection/tree rows are currently selected by text/name in E2E. The
name modal input is `#collection-name-modal-input`; confirm button label "Create".

## Key files

`store.ts` (tree CRUD/move/reorder), `components/SaveToCollectionModal.tsx`,
`services/db.ts` (Tauri + localStorage), tree rendering in `src/app/layout/Sidebar.tsx`.
