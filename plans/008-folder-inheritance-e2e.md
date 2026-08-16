# 008 — Functional e2e for folder header inheritance (TC-COL-005)

**Against:** working tree (folder config modal + inheritance)  
**Depends on:** 002 (inherited headers still show in the editor; they must not persist)  
**Effort:** M · **Risk:** Low · **Category:** tests

## Why

Catalog `TC-COL-005` is `automation.status: "partial"` pointing at `e2e/folder-config-layout.spec.ts`, which only asserts z-index/bleed. No test sets a folder header, opens a nested request, and asserts the editor.

## Current

`apps/desktop/e2e/folder-config-layout.spec.ts` — layout only.

`packages/test-catalog/src/test-cases/response-collections-history.ts` TC-COL-005 steps: folder headers tab → type `X-Custom: inherited` on `EL-COL-006` → open nested request → `EL-RB-016` headers tab.

Selectors (`docs/test-catalog/features/collections.md` / request-builder):

- `EL-COL-004` `[data-testid="folder-config-tab-headers"]`
- `EL-COL-006` `[data-testid="folder-header-key-0"]`
- `EL-RB-016` `[data-testid="editor-tab-headers"]`
- `EL-RB-020` `[data-testid="header-key-0"]`
- `EL-RB-021` `[data-testid="header-value-0"]`

Helpers: `e2e/helpers.ts` `openApp`, `sidebarTab`. Folder modal helper already in the layout spec.

Need a **request under the folder**. Layout spec creates collection `pollinations.ai` + folder `API` but no nested request. Add one: after creating the folder, save current example request into it, **or** add-request from the folder row (mirror `e2e/collections.spec.ts`).

## Scope

- IN: `apps/desktop/e2e/folder-config-layout.spec.ts` (new test in existing describe) **or** new `e2e/folder-inheritance.spec.ts`
- IN: catalog `automation.status` → `"covered"` and `spec` path for TC-COL-005
- OUT: collection-level config e2e; Playwright against Tauri

## Steps

1. Flow:

- `openApp`, Try an example (or new request with a URL so the editor exists).
- Collections: create collection, add folder, add/save a request **inside that folder**.
- Open folder config → Headers tab (`folder-config-tab-headers` if present, else existing “headers & auth” dialog).
- Fill inherited header key `X-Custom` value `inherited` (KeyValueEditor rows). Confirm/save the modal however the UI does (look at `FolderConfigModal.tsx`).
- Click the nested request in the tree.
- Click `editor-tab-headers`.
- Assert visible header row shows key `X-Custom` and value `inherited` (use `:visible` / `.getByTestId("header-key-0")` scoped to visible editor).

2. Mark TC-COL-005 `automation.status: "covered"` and spec filename.

3. Follow Playwright style in `collections.spec.ts` (role queries + testids). Avoid `waitForTimeout` except the 300ms the layout spec already uses if the modal animation needs it.

## Verify

```
pnpm e2e -- folder-config
```

(or the new spec file). Also `pnpm --filter @pigeon/test-catalog check` if catalog schema is validated.

## Done when

CI-style Playwright would catch a regression where `resolveInheritedRequest` stops merging headers. Catalog no longer says `partial` for TC-COL-005.

## Escape

If adding a request into a folder from the UI is flaky (NameModal), STOP and add a narrower test that uses an existing helper from `collections.spec.ts`. Do not drive the app via `localStorage` internals unless an existing e2e already does.
