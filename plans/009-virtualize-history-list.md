# 009 — Virtualize the history sidebar list

**Against:** `0c24a27`  
**Effort:** L scoped to history only · **Risk:** Medium · **Category:** performance

## Why

No virtualizer in the repo. `HistoryTab` maps every row; browser cap is 1000 (`BROWSER_HISTORY_CAP`). Collection tree + DnD virtualization is **out of scope** (DnD + windowing is a product rewrite).

## Current

`apps/desktop/src/features/rest/history/components/HistoryTab.tsx` ~218–228:

```
{groupedHistory.order.map((bucket) => (
  {groupedHistory.buckets[bucket].map((item) => (
    <HistoryRow key={item.timestamp} ... />
```

Delete uses `history.indexOf(item)` (O(n), wrong on duplicate objects). Key `item.timestamp` collides.

## Scope

- IN: `HistoryTab.tsx` (+ `HistoryRow` if needed)
- IN: add `@tanstack/react-virtual` to `apps/desktop` (workspace filter `pigeon`) — **or** implement a minimal overflow window without a dep if the team prefers zero deps. Prefer `@tanstack/react-virtual` as the standard list virtualizer; run `pnpm --filter pigeon add @tanstack/react-virtual` only if used.
- OUT: `CollectionsTab` tree, `DraftTab` URL tree, tab strip

## Steps

1. Fix row identity: `key={item.id ?? item.timestamp}` (id is numeric from DB). Delete by index: `history.findIndex` matching `item.id` if present else current index passed as prop `index`. Stop calling `history.indexOf(item)`.

2. Virtualize **within each date bucket** or flatten into one windowed list with sticky bucket headers. Flattened list is simpler: items like `{ type: "header", bucket } | { type: "row", item, index }`. Use the parent’s existing overflow scroll container as `useVirtualizer` `getScrollElement`.

3. Preserve grouped order. Preserve click-to-open and delete. Keyboard pass-through not required beyond current.

4. If adding a dependency, lockfile update is expected; do not bump unrelated packages.

## Verify

```
pnpm --filter pigeon exec vitest run src/features/rest/history
pnpm ci:check
pnpm --filter pigeon exec tsc --noEmit -p tsconfig.json
```

Manual: History tab with many rows still scrolls; delete the visible first row removes the right entry.

## Done when

History list does not mount 1000 DOM rows at once. Keys are stable. Delete uses an index/id, not `indexOf`.

## Escape

If HistoryTab’s scroll parent is hard to wire (nested overflow), STOP after the key+delete fixes and report that virtualization needs a follow-up. Those small fixes still land.
