# history

Persisted request history + auto-saved drafts.

## Public API (`index.ts`)
- `useHistoryStore` — history + drafts, load/add/update/remove
- `HistoryItem`, `DraftNode` (types)

## Persistence
`services/db.ts` = thin `invoke()` wrappers over the Rust SQLite commands
(`add_history`, `get_drafts`, …). No SQL here — Rust owns the DB.

## Extend
New persisted field → extend `HistoryItem`/`DraftNode` and the matching Rust command.
