# 002 — Do not persist inherited folder/collection auth onto requests

**Against:** `0c24a27` + working tree (`inheritance.ts` already merges collection config)  
**Depends on:** 001 if touching `history/store.ts` stripFiles in the same session  
**Effort:** S · **Risk:** Medium (auth semantics) · **Category:** correctness / secret sprawl

## Why

`resolveInheritedRequest` copies ancestor/collection `auth` onto the tab request **without an inherited marker**. Collection `stripFiles` already drops `header.inherited`. History `stripFiles` does not even drop inherited headers. Save/send then writes folder tokens into the request node, drafts, and history.

## Current

`apps/desktop/src/features/rest/collections/lib/inheritance.ts` `resolveAuth` returns the ancestor `AuthConfig` as-is.

`apps/desktop/src/shared/types.ts` — `AuthConfig` has no `inherited` flag.

`apps/desktop/src/features/rest/collections/store.ts` `stripFiles` (lines 60–69): filters headers, leaves `auth` intact.

`apps/desktop/src/features/rest/history/store.ts` `stripFiles` (lines 349–354): only strips `file` / multipart files.

## Scope

- IN: `apps/desktop/src/shared/types.ts` (`AuthConfig`)
- IN: `apps/desktop/src/features/rest/collections/lib/inheritance.ts` (+ `inheritance.test.ts`)
- IN: `apps/desktop/src/features/rest/collections/store.ts` `stripFiles`
- IN: `apps/desktop/src/features/rest/history/store.ts` `stripFiles` + `store.test.ts`
- OUT: changing live merge-at-open vs merge-at-send; UI of Auth editor (inherited auth should still **display** on the open tab)

## Conventions

Match header inheritance: mark on resolve, strip on persist. Example header mark:

```
inherited.push({ ...h, inherited: true });
```

Existing AUTH_NONE in `inheritance.test.ts`:

```
type: "none", username: "", password: "", token: "", apiKey: "", apiValue: "", apiAddTo: "header"
```

`Header` already has optional `inherited?: boolean` in `apps/desktop/src/shared/types.ts` — copy that pattern onto `AuthConfig`.

## Steps

1. Add `inherited?: boolean` to `AuthConfig`.

2. `resolveAuth`: when returning folder/collection auth, return `{ ...auth, inherited: true }`. Own request auth (`isSetAuth(ownAuth)`) stays unmarked.

3. Update `inheritance.test.ts`: inherited-auth assertions must include `inherited: true`. Own-auth-wins case stays unmarked.

4. Shared persist helper (inline in each `stripFiles` is fine; do not create a new package):

```ts
auth: request.auth.inherited
  ? { type: "none", username: "", password: "", token: "", apiKey: "", apiValue: "", apiAddTo: request.auth.apiAddTo }
  : request.auth,
```

Also filter inherited headers in **history** `stripFiles` the same way collections already do.

Do **not** persist `inherited: true` on auth that is the request’s own.

5. Add a collections store test: `addRequest` with a request whose `auth` is `{ ...bearer, inherited: true }` and whose headers include `{ inherited: true }` — persisted node must have `auth.type === "none"` and no inherited headers. Pattern: `apps/desktop/src/features/rest/collections/store.test.ts`.

## Verify

```
pnpm --filter pigeon exec vitest run src/features/rest/collections/lib/inheritance.test.ts src/features/rest/collections/store.test.ts src/features/rest/history/store.test.ts
pnpm ci:check
```

## Done when

Opening a request still shows folder auth in the editor (camera: `resolveInheritedRequest` still merges). Saving a collection request / draft / history snapshot does not write that auth as owned.

## Escape

If `AuthConfig` is serialized in import/export (Postman adapter) and extra fields break round-trip, keep `inherited` optional and strip it in the Postman exporter. Check `apps/desktop/src/features/rest/import-export/services/requestModelAdapter.ts`. If exporter includes unknown keys, STOP and strip there too.

## Maintenance

Send path (`useSendRequest`) must keep using the **resolved** tab request (inherited auth still sent). Only persistence strips.
