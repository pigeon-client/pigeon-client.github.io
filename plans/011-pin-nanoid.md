# 011 — Override `nanoid` to patched >=3.3.18

**Against:** `0c24a27`  
**Effort:** S · **Risk:** Low · **Category:** dependencies

## Why

`pnpm audit --prod` reports GHSA-2v37-7h3g-55p8 (`nanoid` <3.3.18) via `apps/site` → Vite/postcss. Site is not a secret-bearing desktop surface but the advisory is High.

## Current

Root `package.json` already has:

```
"pnpm": {
  "overrides": { "brace-expansion@<1.1.16": "^1.1.16" },
  "auditConfig": { "ignoreGhsas": ["GHSA-mh99-v99m-4gvg"] }
}
```

Do not remove the brace-expansion override or GHSA-mh99 ignore.

## Scope

- IN: root `package.json` `pnpm.overrides`
- IN: `pnpm-lock.yaml` (required after override)
- OUT: bumping Vite/Vitest majors; ignoring a new GHSA

## Steps

1. Add `"nanoid@<3.3.18": "^3.3.18"` next to the existing override.

2. Run `pnpm install` at repo root so the lockfile records the override. Do not add nanoid as a direct dependency.

3. Re-run `pnpm audit --prod`. Remaining findings must not include nanoid/GHSA-2v37. GHSA-mh99 may still appear if not --prod filtered; that ignore stays.

## Verify

```
pnpm audit --prod
```

Expect nanoid advisory gone (or only ignored known GHSA-mh99).

## Done when

Override present; lockfile updated; audit no longer flags nanoid <3.3.18.

## Escape

If 3.3.18 breaks postcss/Vite on `apps/site`, STOP and report. Do not force nanoid v5 (API break).
