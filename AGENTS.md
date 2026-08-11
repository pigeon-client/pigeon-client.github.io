# Repository Guidance

`CLAUDE.md` is canonical source for repository architecture, commands, testing, and conventions.

## Working Rules

- Keep application changes inside `apps/` and shared package changes inside `packages/`.
- Use root `pnpm` commands; keep workspace lockfile unchanged unless dependency changes require it.
- Run `pnpm test` and `pnpm build` after code changes.
- Run `pnpm ci:check` before merging; fix reported formatting or lint errors.
- Use design tokens instead of hardcoded color values (spec: `docs/tokens.md`).
- Keep project documentation under `docs/` only — do not add `.md` files beside source in
  `apps/*/src` or `packages/*/`.
- Biome is strict (`preset: recommended` + React/security/performance domains; `console.log` banned).
- Do not edit `biome.json` or `lefthook.yml` without explicit approval.
- Do not commit secrets, credentials, build output, or local configuration.
