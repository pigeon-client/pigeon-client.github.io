# 012 — Make cross-collection `moveNode` crash-safe

**Against:** `0c24a27` + working tree  
**Effort:** M · **Risk:** Medium · **Category:** correctness

## Why

`moveNode` writes source collection, then dest, with two `await dbUpdateCollection` calls and no compensation. A crash or second-write failure can drop the node from source without inserting dest (or leave dest updated while in-memory state is skipped — currently `set()` runs only after both awaits, so **UI** stays consistent but **DB** can diverge).

There is no SQL transaction helper on `createStrTableStore`. Compensation is the available fix; do not invent a new persistence protocol.

## Current

`apps/desktop/src/features/rest/collections/store.ts` ~536–539:

```
await dbUpdateCollection(updatedSource);
await dbUpdateCollection(updatedDest);
set((s) => ({ collections: s.collections.map(...) }));
```

Same file’s in-collection move is a single write. Tests in `store.test.ts` cover in-collection `moveNode` only.

## Scope

- IN: `moveNode` in `collections/store.ts`
- IN: `store.test.ts` (cross-collection move + simulated second-write failure)
- OUT: schema change, batched IPC, in-collection moves

## Steps

1. Keep building `updatedSource` / `updatedDest` in memory first (already done).

2. Persist dest **first** (node exists in two collections briefly — safer than existing nowhere), then source-without-node. If dest write throws: do not update source, return `false`. If source write throws after dest succeeded: **roll back dest** with `await dbUpdateCollection(originalDest)` then return `false`. Only `set()` the dual in-memory update when both writes succeed.

Alternative equally acceptable: dest-first + rollback dest on source failure. Do not leave `set()` after a partial write.

3. Test: add two collections, request in A, `moveNode(A, nodeId, null, B)`. Assert node in B not A.

4. Failure test: mock `dbUpdateCollection` if tests hit real localStorage (`services/db.ts` no-ops or writes). If `db.ts` in browser writes localStorage, spy it:

If mocking is hard because `db.ts` is a direct import, test rollback by temporarily replacing the module is **not** required. Minimum: happy-path cross-collection test. If `vi.mock("./services/db")` is consistent with repo style, add a second test where the second call rejects and both collections’ `root` match pre-move (in-memory). If db is a real localStorage write, after a mocked failure call `load`/`getState()` and assert.

## Verify

```
pnpm --filter pigeon exec vitest run src/features/rest/collections/store.test.ts
pnpm ci:check
```

## Done when

Cross-collection happy path covered. Partial failure does not `set()` a state that implies success, and dest is rolled back if source persist fails.

## Escape

If `dbUpdateCollection` is unmockable without rewriting `db.ts`, ship dest-first + try/catch rollback without the failure unit test, and say so in the PR notes. Do not add a SQL transaction layer in Rust for this plan.
