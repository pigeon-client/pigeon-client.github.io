# 007 — Run Vitest in the primary CI job; align Node versions

**Against:** `0c24a27`  
**Effort:** S · **Risk:** Low · **Category:** DX / tests

## Why

`.github/workflows/ci.yml` runs Biome, `check:cycles` (currently fails on main), and `pnpm build`. Vitest only runs in `e2e.yml`. Node 22 in CI vs Node 20 in e2e.

## Current

`ci.yml` job “Lint, Type Check & Build”: biome → cycles → build. No `pnpm test`.

`e2e.yml`: Node 20, `pnpm test`, then Playwright.

Root scripts: `"test": "pnpm --filter pigeon test"`.

## Scope

- IN: `.github/workflows/ci.yml`
- IN: `.github/workflows/e2e.yml` (Node version only)
- OUT: `lefthook.yml` (**AGENTS.md: do not edit without explicit approval**)
- OUT: coverage thresholds / `pnpm test:cov` in CI

## Steps

1. After Biome, before cycles (or after cycles): `run: pnpm test`. Name the step `Unit tests (Vitest)`.

2. e2e.yml `node-version: 20` → `'22'` to match `ci.yml` and `package.json` engines (`>=20.19.0 <21 || >=22.12.0`). Prefer 22 as already used by lint/build.

3. Leave e2e.yml’s duplicate Vitest step in place (defense if CI path-ignore changes). Optional comment is unnecessary.

## Verify

No local workflow runner required. Confirm YAML indent matches existing steps.

`pnpm test` must be green locally after 001–002 land.

## Done when

Primary CI job executes unit tests. Node 22 in both workflows.

## Escape

If adding Vitest to `ci.yml` makes the job exceed GitHub’s default time, keep it; the desktop unit suite is designed to be seconds, not minutes. Do not skip tests with `continue-on-error`.
