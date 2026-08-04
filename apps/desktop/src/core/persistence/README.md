# core/persistence

The `isTauri() ? invoke() : localStorage` pattern, factored out once instead of reimplemented per
feature. Replaced 4 near-identical hand-rolled wrappers (collections, drafts+history, mcp_oauth —
environments stayed a plain `strTable` user since it has no Rust-backed table at all).

## Public API (`index.ts`)
- `createNumTableStore<T>(opts)` — numeric-id table (drafts, history). `save`/`getAll`/`update`/`remove`.
  Options: `browserKey`, `commands` (Tauri invoke command names), optional `saveArgs` (extra invoke
  args merged into the save payload, e.g. history's server-side `timestamp`), optional
  `browserWriteGuard` (wraps the browser-path insert/update — history passes its
  localStorage-quota retry in here).
- `createStrTableStore<T>(opts)` — string-id table (collections; also environments, browser-only).
  Returns raw `{ id, data: string }` rows — callers own JSON parsing (matches what every consumer
  already expected before this factory existed). `commands` is optional — omit it for a
  browser-only table with no Rust-backed table.
- `createKeyValueStore<T>(opts)` — single record per key, point lookup instead of a list
  (mcp_oauth). `keyArgName` names the Tauri invoke arg for the lookup key (must match the Rust
  command's parameter name).
- `numTable`, `strTable` — the raw `browserTable.ts` primitives, for callers that need the
  localStorage table shape directly instead of going through a factory.

## Consumes
`@tauri-apps/api/core` (`invoke`), `@/shared/lib/platform` (`isTauri`). Nothing feature-level.

## Extend
A new persisted table = instantiate the right factory in the feature's own `services/db.ts` with
its Tauri command names and browser key — don't hand-roll the `isTauri()` branch again. Keep the
factory's exported function names matching what the feature's `db.ts` already exports, so Vitest
mocks and call sites don't need touching.
