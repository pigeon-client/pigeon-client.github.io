# collections

Saved request collections (folder/request tree).

## Public API (`index.ts`)
- `useCollectionStore`, `findNode`
- `Collection`, `CollectionNode`, `MAX_NESTING_DEPTH`

## Persistence
`services/db.ts` = thin `invoke()` wrappers over Rust SQLite collection commands.

## Extend
Tree ops live in `store.ts`. Rebuild nodes immutably — never mutate a node in place
(breaks React change detection).
