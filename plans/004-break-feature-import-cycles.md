# 004 — Break feature barrel import cycles

**Against:** `0c24a27` + working tree  
**Depends on:** 001, 002 (same stores)  
**Effort:** M · **Risk:** Medium · **Category:** tech debt

## Why

`pnpm check:cycles` (`madge --circular`) reports **7 cycles**. Architecture (`docs/architecture.md`): features import other features via barrels — but barrels re-export UI, so a type-only import of `FolderConfig` from `@/features/rest/collections` pulls `CollectionsTab` → request-builder UI → history, etc.

## Current cycles (verbatim from madge)

1. `environments/index.ts` → `VarAuthEditor.tsx` (VarAuthEditor imports `@/features/environments` barrel — self cycle)
2–7. `collections/index.ts` → `CollectionsTab` → `request-builder/index.ts` → (`EmptyRequestState`/`UrlBar`/`RequestEditor`) → import-export / history / settings / `history/store.ts` → `collections/index.ts`

Confirmed leaf that starts the collections loop:

`apps/desktop/src/features/rest/history/store.ts`:

```
import type { FolderConfig } from "@/features/rest/collections";
```

`apps/desktop/src/features/environments/components/VarAuthEditor.tsx` line 8 imports from `@/features/environments`.

## Scope

- IN: cross-feature **imports** — change specifier to a leaf (`types.ts`, `store.ts`, `lib/*`, `hooks/*`), not the barrel
- IN: files madge lists; grep for `from "@/features/` that hit barrels from inside those features
- OUT: deleting barrels; changing runtime behavior; new shared package

App shell (`app/`) may still import barrels.

## Convention

Desktop already uses deep imports in some places (`useTabStore` from `../store` inside request-builder). Prefer:

```
import type { FolderConfig } from "@/features/rest/collections/types";
import { useTabStore } from "@/features/rest/request-builder/store";
import { useHistoryStore } from "@/features/rest/history/store";
import { useEnvStore, useVarAutocomplete } from "@/features/environments/store"; // adjust to real paths
```

VarAuthEditor must import `useVarAutocomplete` from `../hooks/useVarAutocomplete` (sibling), not the feature barrel.

## Steps

1. Fix environments self-cycle first (`VarAuthEditor` + any other environment component that imports its own barrel).

2. Change `history/store.ts` FolderConfig import to `./` wait — FolderConfig lives in collections: `@/features/rest/collections/types`.

3. In `CollectionsTab.tsx`, `DraftTab.tsx`, `SettingsDrawer.tsx`, `UrlBar.tsx`, `useSendRequest.ts`, `EmptyRequestState.tsx`, `ImportModal.tsx`, `RequestEditor.tsx`, `BodyEditor.tsx`, `ResponsePanel.tsx`: replace `@/features/rest/<x>` barrel imports used **from inside features** with leaf paths. Keep type-only imports on type files.

4. Re-run `pnpm check:cycles` until **zero** cycles. Exit code 0.

5. Do not add `madge` ignore comments. Do not widen barrels.

## Verify

```
pnpm check:cycles
pnpm --filter pigeon exec tsc --noEmit -p tsconfig.json
pnpm ci:check
```

`check:cycles` currently exits 1 with “Found 7 circular dependencies”. Done = that output gone, exit 0.

## Done when

`pnpm check:cycles` is clean. Tests still pass (`pnpm test`).

## Escape

If a cycle is only type-level and madge cannot ignore it without a leaf file (`import type` still traces the barrel), you **must** still change the specifier to `types.ts` — do not disable the cycle check. If a UI component truly needs a component from another feature, import that **component file**, not `index.ts`.
