# collections

Saved request collections (folder/request tree).

## Public API (`index.ts`)
- `useCollectionStore`, `findNode`
- `Collection`, `CollectionNode`, `MAX_NESTING_DEPTH`
- `SaveToCollectionModal`

## Persistence
`services/db.ts` = thin `invoke()` wrappers over Rust SQLite collection commands.
Rust stores each collection as JSON in `collections(id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`.
Legacy integer IDs are migrated to text in `src-tauri/src/db.rs`.

## UI
- Sidebar collection tab owns collection/folder/request tree CRUD.
- Create/rename operations use the shared name modal.
- `Cmd+S` / `Ctrl+S` opens `SaveToCollectionModal` for the active request.
- Save modal lets user choose collection plus root or nested folder destination.

## Extend
Tree ops live in `store.ts`. Rebuild nodes immutably — never mutate a node in place
(breaks React change detection).
Strip live `File` objects before persisting requests; store file names/metadata only.
