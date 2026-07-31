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
tree, cURL round-trip); don't try to run real HTTP/SQLite. The sole project agent,
`feature-qa` (`.claude/agents/feature-qa.md`), owns Vitest unit/store tests, Playwright E2E,
manual user-like checks (including long-URL / header scroll), bug reports, and keeping
`docs/features/*.md` honest.

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

### Makefile shortcuts (root — delegate to the workspace)
```bash
make dev              # pnpm tauri dev (desktop)
make build            # pnpm tauri build (full Tauri)
make build-release    # pnpm tauri build --bundles dmg
make lint             # pnpm lint (Biome, repo-wide)
make format           # pnpm check:write
make ci-check         # pnpm ci:check
make test             # pnpm test        make e2e     # pnpm e2e
make dev-site         # site dev         make build-site / preview-site
make deps             # pnpm install --frozen-lockfile
make clean            # Remove apps/*/dist, apps/desktop/src-tauri/target, node_modules
make open             # Open built DMG folder (apps/desktop/…/bundle/dmg)
```

### Marketing site (`apps/site`)
```bash
pnpm install                     # Root workspace install (covers both apps)
pnpm build:site                  # Build the site (tsc + Vite)
pnpm preview:site                # Preview at localhost:4173
# or from the package: pnpm --filter pigeon-site <script>
```

### Release
**Merging to `main` releases automatically.** `version-bump.yml` bumps the patch from
`.version.json`, commits it, and pushes a `v<version>` tag; the tag fires `release.yml` (4-platform
build → publish), and the published release triggers `deploy-site.yml` to refresh the download
links. No manual tagging needed.

- Needs a repo secret **`RELEASE_TOKEN`** (fine-grained PAT, `contents: write`). Required because a
  tag/release created with the default `GITHUB_TOKEN` does **not** trigger downstream workflows.
- Minor/major bumps: edit `.version.json` (and it flows to package/tauri/Cargo on the next merge),
  or tag manually:
```bash
git tag v0.x.0 && git push origin v0.x.0   # manual tag still works
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

### Monorepo layout

This is a **pnpm workspace** (`pnpm-workspace.yaml` → `packages: ['apps/*']`). The repo root is a
private workspace-only package (`pigeon-monorepo`, no app code); its scripts delegate to the
members via `--filter`, so `pnpm dev`, `pnpm build`, `pnpm tauri dev`, `pnpm test`, `pnpm e2e` all
still run from the root. Biome and Lefthook are repo-wide and configured at the root.

- **`apps/desktop/`** — the Tauri desktop app (package `pigeon`). Holds `src/`, `src-tauri/`,
  `e2e/`, and all its build config (`vite`, `vitest`, `playwright`, `tsconfig`, `postcss`,
  `scripts/copy-wasm.js` + `version-bump.js`). Tauri is invoked here (release CI passes
  `projectPath: apps/desktop`).
- **`apps/site/`** — the marketing site (package `pigeon-site`), a pnpm workspace member.
- Root-level: `Makefile` (delegates to the workspace), `biome.json`, `lefthook.yml`,
  `.version.json`, `logo/`, `docs/`, and `scripts/install.sh` (kept at root because its raw URL is
  the published install command).

Paths below like `src/features/...` are relative to **`apps/desktop/`**.

### Main App (`apps/desktop/src/`)

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

Drafts, history, and collections persist via Rust SQLite commands through thin `services/db.ts`
wrappers. Do not call `invoke()` directly from components. Collections are stored as JSON in
`collections(id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`; `src-tauri/src/db.rs` migrates
legacy integer IDs to text so UUID collection IDs work.

**Schema migrations**: `src-tauri/src/db.rs` tracks an integer `schema_version` in a `schema_meta`
table. `init_db()` runs every entry in the `MIGRATIONS` array whose index is >= the stored version,
in order, bumping the version after each step — so a crash mid-migration resumes from the last
completed step on next launch instead of re-running or skipping steps. This all runs synchronously
before the window opens, so every launch is auto-migrated with no user action. Append new
migrations to the end of `MIGRATIONS`; never reorder or remove past ones (older installs may still
be mid-list). If a migration ran this launch, `get_migration_status` (Tauri command) returns
`{fromVersion, toVersion}` once; the frontend surfaces it via `MigrationToast`
(`src/app/layout/MigrationToast.tsx`, wired through `features/settings/lib/migration.ts`) as a
one-shot dismissible toast — not a real-time progress bar, since local SQLite migrations finish
before the toast can even mount.

**Environments are the exception**: they persist to `localStorage` for *both* builds
(`environments/services/db.ts`, keys `pg_browser_environments` / `pg_globals` / `pg_active_env`) —
the Tauri webview's `localStorage` is durable, so there is no Rust `environments` table. Response
word-wrap (`pg_word_wrap`) and theme (`pg_theme`) likewise persist through small feature-owned
`localStorage` helpers, not SQLite.

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
- **Tab right-click menu**: New Request / Duplicate Request / Close Tab / Close Other Tabs / Close All Tabs.
- **HTTP methods**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, QUERY (RFC 10008). TRACE and CONNECT are not offered. GET/HEAD never send a request body (RFC 9110).
- **Import/Export cURL**: Right-side slide-in drawer panels. Header export button is icon-only.
- **Collections CRUD**: Create/rename/delete collections use modals; create collection disables modal
  animation. Folders/requests support nested save paths.
- **Save request shortcut**: `Cmd+Shift+S` / `Ctrl+Shift+S` opens `SaveToCollectionModal` for the
  active request when it has a URL.
- **Shortcut scheme**: every app-global chord is `Cmd+Shift+<key>` (`⇧N` new tab, `⇧W` close,
  `⇧K` palette, `⇧E` envs, `⇧M` MCP, `⇧G` GraphQL, `⇧,` settings, `⇧/` shortcuts, `⇧1–9` tabs).
  Two exceptions: `Cmd+Enter` sends, and plain `Cmd+F` is contextual find — the body editor and
  response panel intercept it for an in-panel `FindBar` (`shared/ui/FindBar.tsx` +
  `shared/lib/textFind.ts`); anywhere else it focuses the header search. Handlers match on
  `e.code` (Shift changes `e.key`).
- **Tab kinds**: `Tab.kind = "http" | "mcp" | "graphql"` in the tab store. MCP bench and the
  GraphQL coming-soon pane are singleton workspace tabs (`openKindTab`), not modals — non-http
  tabs render full-pane with no URL bar and show a kind badge (`MCP` / `GQL`) in the tab strip.
- **Modal keyboard behaviour**: Shared `Modal` only closes on backdrop keyboard events when the
  backdrop itself is focused. Space inside inputs/selects must not close modals.

### Marketing Site (`apps/site/`)

A separate React app (package `pigeon-site`, workspace member — not part of the Tauri build). It
reads `apps/site/src/release.json`, fetched from the GitHub API **at build time** by
`deploy-site.yml` — not at runtime. The repo ships a stub `release.json` with empty `assets: []` as
the fallback. `parseRelease()` in `apps/site/src/lib/github.ts` handles missing/empty fields
defensively.

`apps/site/postcss.config.js` must exist (even if empty) to stop Vite walking up to
`apps/desktop/postcss.config.js` / any Tailwind PostCSS config.

## CI/CD Pipelines

### `ci.yml` — push/PR to `main` (ignores `apps/site/**` and `**.md`)
Single job: `pnpm ci:check` (Biome) → `pnpm build` (delegates to `pigeon`). Has concurrency group — cancels stale runs on force-push.

### `e2e.yml` — push/PR to `main` (ignores `apps/site/**` and `**.md`)
Vitest unit tests → Playwright browser E2E (`pnpm e2e`) → uploads the HTML report artifact (`apps/desktop/playwright-report/`).

### `version-bump.yml` (`Release on merge`) — push to `main` (ignores `.version.json`, `**.md`, `apps/site/**`)
The auto-release entry point: bumps the patch from `.version.json`, syncs `apps/desktop/package.json` /
`apps/desktop/src-tauri/tauri.conf.json` / `apps/desktop/src-tauri/Cargo.toml`, commits (`[version-bump]` guard prevents a loop), then pushes a
`v<version>` **tag** using `RELEASE_TOKEN`. The PAT is required — a tag pushed with `GITHUB_TOKEN`
would not trigger `release.yml`.

### `release.yml` — `v*` tag push
1. Creates a draft GitHub release
2. Builds Tauri for 4 targets in parallel (macOS Intel, macOS ARM, Linux, Windows) — `tauri-action` with `projectPath: apps/desktop`
3. Publishes draft → public once all builds pass, then dispatches `deploy-site.yml` on `main`
   (via `RELEASE_TOKEN`) to refresh the site's download links

Required secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `RELEASE_TOKEN`.
The site deploy is dispatched on `main` (not a `release` event) because the `github-pages`
environment blocks deploys from a tag ref.

### `deploy-site.yml` — push to `main` (`apps/site/**`) **or** dispatched by `release.yml`
1. Fetches latest release JSON from GitHub API into `apps/site/src/release.json` (uses `curl -o` — only writes on success, leaving the stub intact on 404)
2. `pnpm install --frozen-lockfile` + `pnpm --filter pigeon-site build`
3. Deploys `apps/site/dist` to GitHub Pages (`https://pigeon-client.github.io`)

The download buttons come from the release assets automatically — `parseRelease()` in
`apps/site/src/lib/github.ts` maps each asset's `browser_download_url` to the right platform button, so a
new release refreshes the site's download links with no code change.

## Known Gotchas

- **`pnpm-workspace.yaml`** must have a `packages` field (`packages: ['apps/*']`) — pnpm 9+ fails every command without it
- **One root `pnpm-lock.yaml`** covers both apps — `pnpm install` at the root; never run `npm install` in `apps/site` (the old npm-only workaround is gone; pnpm's lockfile records per-platform optional deps, so the rollup-native-binary problem doesn't apply)
- **Root scripts delegate** via `pnpm --filter pigeon` / `--filter pigeon-site`; `pnpm dev`/`build`/`tauri`/`test`/`e2e` from the root still work
- **Tauri lives in `apps/desktop`** — run `pnpm tauri dev` from the root, or `cd apps/desktop`; release CI passes `projectPath: apps/desktop`
- **TypeScript target is ES2022** (`apps/desktop/tsconfig.json`) — required for `Object.hasOwn`; do not lower it
- **`make build-release` passes `--bundles` directly to tauri** (no `--` separator) — the `--` separator in Tauri CLI forwards remaining args to Cargo, not Tauri

## Icons / Assets

**Brand mark** — `logo/logo.svg` is the master. Derived variants live in `logo/`:
`mark.svg` (orange), `mark-mono.svg` (`currentColor`), `mark-duotone.svg`, `wordmark.svg`. The UI
uses the mark: `apps/desktop/src/assets/pigeon-mark.svg` (header, empty states, settings) and
`apps/site/public/pigeon-mark.svg` + `pigeon-mark.png` (nav, favicon, OG). Do not reintroduce the
old `pigeon-logo-*.png` files — they were removed.

**OS app icon** — the source master is `logo/icon-source.png` (1024², white bg + orange dove,
rendered from `logo/mark.svg`). To regenerate the full `apps/desktop/src-tauri/icons/` set (icns,
ico, pngs, iOS, Android): `pnpm --filter pigeon exec tauri icon logo/icon-source.png`.

## Conventions

- **Formatting**: 2-space indent, double quotes, semicolons, trailing commas, 100-char line width (enforced by Biome)
- **Lint**: `noUnusedVariables`, `noUnusedImports` are errors; `console.log` allowed, other `console.*` methods warn
- **Styling**: TailwindCSS utility classes; `cva` for variants; CSS vars for all color tokens — never hardcode hex
- **State**: Zustand stores only — no local state for anything that needs to persist or be shared
- **Do not edit** `biome.json` or `lefthook.yml` without explicit user approval

## AI Workflow

Project uses one custom agent: `.claude/agents/feature-qa.md`.

Use it for full-app or per-feature QA after implementation:
1. Run Vitest and relevant Playwright specs.
2. Perform manual user-like checks from `docs/features/*.md`.
3. Record bugs with reproducible steps and severity.
4. Update feature docs when observed behavior differs.
5. End with a go / no-go recommendation.

Existing `.opencode/workflow/features/<feature-name>/` folders are historical artifacts, not an
active multi-agent workflow.
