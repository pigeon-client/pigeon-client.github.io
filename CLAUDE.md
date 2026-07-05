# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.8 + TailwindCSS 4 + Vite 7
- **UI**: Local shared primitives in `src/shared/ui` + Lucide icons
- **Desktop**: Tauri v2 (Rust backend)
- **State**: Zustand
- **Lint/Format**: Biome v2.5.0
- **Git Hooks**: Lefthook v2.1.9
- **Package Manager**: pnpm 9.15.9 (main app) / npm (marketing site)

## Commands

### Development
```bash
pnpm dev              # Vite dev server (browser only)
pnpm tauri dev        # Full Tauri desktop app
pnpm build            # tsc + Vite build (no Tauri)
pnpm preview          # Preview production Vite build
```

### Lint & Format (Biome)
```bash
pnpm check            # Lint + format check (read-only)
pnpm lint             # Lint only (read-only)
pnpm check:write      # Auto-fix lint + format (write) — use this before committing
pnpm ci:check         # CI-grade check — fails on warnings+
pnpm lint:staged      # Check only staged files
```

### Test (Vitest)
```bash
pnpm test             # Run once (CI mode)
pnpm test:watch       # Watch mode
pnpm test:cov         # Coverage (text + coverage/ html)
```
Config in `vitest.config.ts` (happy-dom env, `@`→`src` alias, setup `src/test/setup.ts`).
Tests sit beside the code as `*.test.ts(x)`. The Tauri backend (`invoke()`) is unavailable
under test — `db.ts` wrappers no-op via `isTauri()` and `setup.ts` mocks `@tauri-apps/api/core`.
Test the pure logic and Zustand stores (URL parsing, `resolveRequest`, tab/name-lock, collection
tree, cURL round-trip); don't try to run real HTTP/SQLite. The `tester` subagent
(`.claude/agents/tester.md`) codifies this — use it to add/run tests.

### E2E (Playwright, browser build)
```bash
pnpm e2e              # Run all specs (auto-starts `pnpm dev` on :1420)
pnpm e2e:ui           # Playwright UI mode
pnpm e2e:report       # Open last HTML report
```
Specs in `e2e/*.spec.ts`, shared actions in `e2e/helpers.ts`, config `playwright.config.ts`.
These drive the **browser build** (no Tauri), so the app runs on browser adapters
(`src/shared/lib/platform.ts` `isTauri()` gate): DB → `localStorage` via
`src/shared/lib/browserTable.ts`, HTTP send → `BrowserHttpClient` (fetch). Specs stub the network
with `page.route` for determinism (`mockJson` helper) — no real APIs, no CORS. Selectors use
`data-testid` (`url-input`, `method-trigger`, `response-status`, `response-body`, `response-empty`,
`method-option-<METHOD>`); inactive tabs stay mounted (`display:none`) so scope interactive testids
to `:visible` (the helpers already do). Runs in CI via `.github/workflows/e2e.yml`.
This covers UI + JS against the mock backend, **not** the real Rust send/SQLite (that needs
`tauri-driver`).

### Makefile shortcuts
```bash
make dev              # pnpm tauri dev
make build            # pnpm tauri build (full Tauri)
make build-release    # pnpm tauri build --bundles dmg
make lint             # pnpm lint
make format           # pnpm check:write
make ci-check         # pnpm ci:check
make deps             # pnpm install --frozen-lockfile
make clean            # Remove dist, src-tauri/target, node_modules
make open             # Open built DMG folder
```

### Marketing site (`/site`)
```bash
cd site
npm install           # Install (no lockfile — platform-native deps)
npm run build         # tsc + Vite build
npm run preview       # Preview at localhost:4173
```

### Release
```bash
git tag v0.x.y
git push origin v0.x.y   # Triggers release.yml — builds all 4 platforms
```

## Feature docs

In-depth per-feature UX/UI reference lives in `docs/features/` (index: `docs/features/README.md`) —
what each screen looks like, its states, keyboard flows, edge cases, and `data-testid` hooks.
Testing strategy is in `docs/testing.md`. Keep these updated when feature behavior changes.

**Test ids:** interactive/queryable elements carry stable, semantic `data-testid`s (never random
UUIDs — those change per render and can't be selected). Convention: `<area>-<element>`,
`<area>-tab-<name>`, and `<area>-<element>-<key>` for list rows (e.g. `sidebar-tab-draft`,
`editor-tab-params`, `param-key-0`, `method-option-DELETE`). Inactive workspace tabs stay mounted
(`display:none`), so testids that repeat per tab (`url-input`, `method-trigger`, `response-status`,
`response-body`) are scoped to `:visible` in the E2E helpers.

## Architecture

### Main App (`src/`)

Architecture is feature-based. `src/app/` owns bootstrap/layout/global shortcuts only.
Business logic belongs in `src/features/*`; shared primitives and shared request types live in
`src/shared/*`.

Platform seam: `src/shared/lib/platform.ts` `isTauri()` gates backend access. In the desktop app,
persistence and HTTP go through Rust (`invoke`); in a plain browser (dev server / Playwright) they
fall back to browser adapters — `localStorage` via `src/shared/lib/browserTable.ts` and
`BrowserHttpClient` (fetch). This is what makes `pnpm dev` and browser E2E functional.

Feature barrels (`src/features/<feature>/index.ts`) are the public API. App/layout code should
import features through barrels. Features must not import from `src/app/`.

State lives in co-located Zustand stores:
- `src/features/request-builder/store.ts` — tab lifecycle, request editing, rename/close variants
- `src/features/history/store.ts` — persisted history and drafts
- `src/features/collections/store.ts` — collection tree CRUD/move/reorder
- `src/features/environments/store.ts` — environment variables and interpolation

Persistence uses Rust SQLite commands through thin `services/db.ts` wrappers. Do not call
`invoke()` directly from components. Collections are stored as JSON in `collections(id TEXT PRIMARY
KEY, data TEXT, created_at INTEGER)`; `src-tauri/src/db.rs` migrates legacy integer IDs to text so
UUID collection IDs work.

HTTP requests are sent from Rust via `reqwest` (not browser fetch) so there are no CORS
restrictions. Use `src/features/execution/hooks/useApiRequest.ts`; Rust owns the actual
`send_api_request` command.

### Import / Export Architecture

`src/features/import-export/model/RequestModel.ts` is the stable internal request interchange
model for import/export. Keep parser/library details behind adapters:
- `services/curlImporter.ts` — cURL text -> `RequestModel` using `curlconverter.toJsonObject()`
- `services/requestModelAdapter.ts` — `RequestModel` <-> app `RequestConfig`
- `services/curlService.ts` — compatibility wrapper: cURL text -> `Partial<RequestConfig>`
- `lib/generateCurl.ts` — app `RequestConfig` -> cURL string

Do not depend on undocumented `curlconverter` parser AST. If another importer is added, target
`RequestModel` first, then adapt to `RequestConfig`.

### Collections Architecture

Collections are a folder/request tree:
- `Collection` has `id`, `name`, `root`, `createdAt`
- `CollectionNode` is either `folder` with `children` or `request` with `RequestConfig`
- folder nesting limit is `MAX_NESTING_DEPTH`

Tree updates in `src/features/collections/store.ts` must rebuild immutable nodes. Never mutate
existing tree nodes in place; React change detection depends on new object/array references.

UI entry points:
- Sidebar collection tab: create, rename, delete collection; create folders; add/rename/delete
  saved requests/folders
- `SaveToCollectionModal`: opened by `Cmd+S` / `Ctrl+S`, lets user choose collection plus nested
  folder/root destination

When saving requests into collections, strip live `File` objects. Persist file names/metadata only.

### Settings Persistence

Theme and request options (follow redirects, SSL verify, proxy URL) persist to `localStorage`
(`pg_theme`, `pg_follow_redirects`, `pg_ssl_verify`, `pg_proxy_url`). `src/features/execution`
reads those keys directly when sending requests — settings and execution are coupled through
`localStorage`, not through a shared store.

### Update System

Tauri updater is wired with `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process`.
`src/features/settings/lib/updater.ts` owns update models and actions:
- `UpdateVersionModel`
- `UpdateCheckResult`
- `checkUpdateVersion()`
- `installUpdate()`
- `checkForUpdates(silent)`

App startup runs a silent check. Settings has a manual "Check Update" CTA and install flow. Tauri
config has `createUpdaterArtifacts: true`; signed release updates require the Tauri signing secrets.

### Theme System

Two themes are exposed in Settings: dark and light. Theme classes are applied on `<html>`:
`.dark` (default) and `.theme-light`. Legacy `.theme-pink` styles may exist but are not currently
shown in the Settings UI.

All design tokens are CSS custom properties in `src/styles/index.css` — **never use hardcoded hex
values**. Use `var(--token-name)` everywhere. Syntax highlight colors are also CSS vars per theme
so `highlight.js` output adapts automatically.

### Key Behaviours

- **cURL auto-import**: Pasting a `curl ...` command into the URL bar parses it through
  `features/import-export` (`parseCurl`) and applies method, headers, auth, params, and body.
- **Tab rename**: Double-click any tab label to rename inline (Enter/blur saves, Esc cancels);
  name locks on manual rename, otherwise derived from URL path.
- **Tab right-click menu**: New Request / Close Tab / Close Other Tabs / Close All Tabs.
- **Import/Export cURL**: Right-side slide-in drawer panels. Header export button is icon-only.
- **Collections CRUD**: Create/rename/delete collections use modals; create collection disables modal
  animation. Folders/requests support nested save paths.
- **Save request shortcut**: `Cmd+S` / `Ctrl+S` opens `SaveToCollectionModal` for the active request
  when it has a URL.
- **Modal keyboard behaviour**: Shared `Modal` only closes on backdrop keyboard events when the
  backdrop itself is focused. Space inside inputs/selects must not close modals.

### Marketing Site (`site/`)

The site is a separate React app (not part of the main Tauri build). It reads `site/src/release.json` which is fetched from the GitHub API **at build time** by `deploy-site.yml` — not at runtime. The repo ships a stub `release.json` with empty `assets: []` as the fallback. `parseRelease()` in `site/src/lib/github.ts` handles missing/empty fields defensively.

`site/postcss.config.js` must exist (even if empty) to prevent Vite from walking up to the root `postcss.config.js` which requires `@tailwindcss/postcss` — a root-only dependency.

## CI/CD Pipelines

### `ci.yml` — push/PR to `main` (ignores `site/**` and `**.md`)
Single job: `pnpm ci:check` (Biome) → `pnpm build` (tsc + Vite). Has concurrency group — cancels stale runs on force-push.

### `release.yml` — `v*` tag push
1. Creates a draft GitHub release
2. Builds Tauri for 4 targets in parallel (macOS Intel, macOS ARM, Linux, Windows)
3. Publishes draft → public once all builds pass

Required secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### `deploy-site.yml` — push to `main` when `site/**` changes
1. Fetches latest release JSON from GitHub API into `site/src/release.json` (uses `curl -o` — only writes on success, leaving the stub intact on 404)
2. `npm install` + `npm run build`
3. Deploys to GitHub Pages (`https://pigeon-client.github.io`)

## Known Gotchas

- **`pnpm-workspace.yaml`** must have a `packages` field (even `packages: ['.']` for a single-package project) — pnpm 9+ fails every command without it
- **TypeScript target is ES2022** (`tsconfig.json`) — required for `Object.hasOwn`; do not lower it
- **`make build-release` passes `--bundles` directly to tauri** (no `--` separator) — the `--` separator in Tauri CLI forwards remaining args to Cargo, not Tauri
- **Site uses `npm`, not pnpm** — do not run `pnpm install` inside `site/`
- **No `site/package-lock.json`** in the repo — lockfiles generated on macOS omit Linux native rollup binaries, breaking CI; `npm install` at deploy time resolves the correct platform binary

## Icons / Assets

All app icons originate from `logo/macOS/` — **do not design or generate new icons**.

To update icons: replace source files in `logo/`, run the PIL script to generate `-transparent` variants, copy to `src-tauri/icons/`, rebuild `icon.icns` with `iconutil`, copy high-res variants to `src/assets/`.

## Conventions

- **Formatting**: 2-space indent, double quotes, semicolons, trailing commas, 100-char line width (enforced by Biome)
- **Lint**: `noUnusedVariables`, `noUnusedImports` are errors; `console.log` allowed, other `console.*` methods warn
- **Styling**: TailwindCSS utility classes; `cva` for variants; CSS vars for all color tokens — never hardcode hex
- **State**: Zustand stores only — no local state for anything that needs to persist or be shared
- **Do not edit** `biome.json` or `lefthook.yml` without explicit user approval

## AI Workflow

When asked to implement a new feature:
1. Feature workflow docs live in `.opencode/workflow/features/<feature-name>/`
2. The Workflow Manager orchestrates: PM → Designer → EM → Dev → QA
