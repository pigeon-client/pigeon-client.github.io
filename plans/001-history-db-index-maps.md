# 001 — Rebuild history/draft DB index maps on prepend and remove

**Against:** `0c24a27` + working tree  
**Effort:** S · **Risk:** Low · **Category:** correctness

## Why

`historyDbIds` / `draftDbIds` map local array index → SQLite row id. Lookups prefer the map (`historyDbIds.get(i) ?? item.id`). Drafts **shift** indices on prepend; history **does not**. Removals filter the array but never rebuild the maps. After one prepend + one delete, updates hit the wrong row.

## Current (broken)

`apps/desktop/src/features/rest/history/store.ts`

```
const newIds = new Map(state.historyDbIds);
if (dbId > 0) newIds.set(0, dbId);   // prepend: old 0 still points at previous row
```

vs drafts:

```
for (const [idx, id] of state.draftDbIds) {
  newIds.set(idx + 1, id);
}
```

`removeDraft` / `removeHistory` return `{ drafts/history: filter }` and leave maps stale.

## Scope

- IN: `apps/desktop/src/features/rest/history/store.ts`
- IN: `apps/desktop/src/features/rest/history/store.test.ts`
- OUT: collection stores, DB schema, `trimForBrowser`

## Steps

1. Add a helper next to `trimForBrowser`:

```ts
function reindexDbIds<T extends { id?: number }>(rows: T[]): Map<number, number> {
  const ids = new Map<number, number>();
  rows.forEach((row, i) => {
    if (row.id !== undefined && row.id > 0) ids.set(i, row.id);
  });
  return ids;
}
```

2. After every array mutation that prepends, updates-in-place, or removes, set `historyDbIds: reindexDbIds(newHistory)` / `draftDbIds: reindexDbIds(newDrafts)`. Replace the shift loops in `saveDraft`, `addToHistory` create path, and `saveOrUpdateDraft` create path.

3. `removeDraft` / `removeHistory` must include the rebuilt map in the `set()` payload.

4. Tests in `store.test.ts` (same `makeConfig` / `beforeEach` setup). Browser persistence uses localStorage + numeric ids from `createNumTableStore`; tests already call `addToHistory` without mocking Tauri (`isTauri()` is false):

- Add two distinct history items, delete index 0, then `addToHistory` a **duplicate URL of the remaining item** so the update path runs. Assert the surviving row’s fields updated and length stays 1.
- Add two drafts via `saveDraft`, `removeDraft(0)`, `updateDraftByKey` on the survivor — persist/update must target the remaining draft’s id, not a hole.

If `item.id` is 0/`undefined` in browser tests, still assert maps: after prepend, `historyDbIds.size === history.length` and `historyDbIds.get(1)` equals the previously-first item’s id.

## Verify

```
pnpm --filter pigeon exec vitest run src/features/rest/history/store.test.ts
pnpm ci:check
```

Expect the new tests green; Biome clean.

## Done when

- Prepend no longer overwrites map slot 0 without shifting.
- Remove rebuilds maps.
- Tests fail on the old `set(0, dbId)`-only behavior if the shift/rebuild is reverted.

## Escape

If browser ids are always `undefined` so maps stay empty, STOP and report: then the live bug is Tauri-only and tests must mock `isTauri`/db. Prefer still rebuilding maps for the Tauri path.

## Maintenance

Later: consider dropping the maps and using `item.id` only. Do **not** do that in this plan.
