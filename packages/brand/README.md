# @pigeon/brand

Canonical brand assets, npm-importable per file via `package.json` `exports`. Source-only, no
build step.

## Exports
`./pigeon-mark.svg`, `./pigeon-mark-mono.svg`, `./pigeon-mark-duotone.svg`, `./wordmark.svg`,
`./logo.svg`, `./icon-source.png` — each maps to a file under `assets/`.

```ts
import pigeonMark from "@pigeon/brand/pigeon-mark.svg";
```

## Relationship to `logo/` at the repo root
`logo/` remains the **design-source master** (referenced by non-npm tooling — `tauri icon`
regeneration, etc. — see `CLAUDE.md`'s Icons/Assets section). `packages/brand/assets/` holds copies
of the same files, consumable via npm import. They're not auto-synced; if the master art changes,
copy the updated file into both places.

## Current adoption
`apps/desktop`'s 3 code-level consumers (header, empty state, settings) import
`@pigeon/brand/pigeon-mark.svg` directly — there's no local `apps/desktop/src/assets/pigeon-mark.svg`
copy anymore. `apps/site/public/pigeon-mark.svg` + `pigeon-mark.png` are **not** yet on this
package — they're referenced by `<link>`/`<meta>` tags in `index.html` (favicon, OG image), which
need a real static file under `public/`, not an npm import; that's a separate migration, not done.

## Extend
A new brand asset variant: add the file under `assets/`, add an `exports` entry in `package.json`
pointing at it.
