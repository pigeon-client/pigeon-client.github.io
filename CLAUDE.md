# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.8 + TailwindCSS 4 + Vite 7 (`apps/desktop`); marketing site is Astro 7 + React islands (`apps/site`)
- **UI**: `@pigeon/ui` (workspace package — tokens.css + cn + button/badge/switch/tabs/Tooltip,
  shared by both apps) + app-local primitives in `src/shared/ui` (desktop) for composites that stay
  desktop-only (`Modal`, `FindBar`, `KeyValueEditor`, `TreeRow`, `EmptyState`, `ConfirmModal`,
  `result-viewer/HighlightedBody`) + Lucide icons
- **Brand assets**: `@pigeon/ui` and `@pigeon/brand` (workspace packages) — see Monorepo layout below
- **Desktop**: Tauri v2 (Rust backend)
- **State**: Zustand
- **Lint/Format**: Biome v2.5.0
- **Git Hooks**: Lefthook v2.1.9
- **Package Manager**: pnpm 9.15.9 (workspace-wide — one lockfile covers `apps/*` and `packages/*`)

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
pnpm ci:check         # CI-grade check — `biome ci --error-on-warnings`, fails on warnings+
pnpm check:cycles     # madge --circular over apps/desktop/src — fails on any import cycle (also in ci.yml)
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
(`src/shared/lib/platform.ts` `isTauri()` gate, selected via `src/core/platform/selectImpl.ts`):
DB → `localStorage` via `src/core/persistence/browserTable.ts`, HTTP send → `BrowserHttpClient`
(fetch, in `src/core/http`). Specs stub the network
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
make dev-site         # site dev         make build-site / preview-site / preview-site-worker / deploy-site
make deps             # pnpm install --frozen-lockfile
make clean            # Remove apps/*/dist, apps/desktop/src-tauri/target, node_modules
make open             # Open built DMG folder (apps/desktop/…/bundle/dmg)
```

### Marketing site (`apps/site` → Cloudflare R2 + Worker / `trypigeon.dev`)
```bash
pnpm install                     # Root workspace install (covers both apps)
pnpm build:site                  # Astro static build → apps/site/dist
pnpm preview:site                # Astro local preview
pnpm preview:site:worker         # Wrangler dev (local R2 + Worker)
pnpm deploy:site                 # Build → R2 sync → wrangler deploy (needs Cloudflare auth)
# or: make dev-site / build-site / preview-site / preview-site-worker / deploy-site
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

This is a **pnpm workspace** (`pnpm-workspace.yaml` → `packages: ['apps/*', 'packages/*']`). The
repo root is a private workspace-only package (`pigeon-monorepo`, no app code); its scripts
delegate to the members via `--filter`, so `pnpm dev`, `pnpm build`, `pnpm tauri dev`, `pnpm test`,
`pnpm e2e` all still run from the root. Biome and Lefthook are repo-wide and configured at the root.

- **`apps/desktop/`** — the Tauri desktop app (package `pigeon`). Holds `src/`, `src-tauri/`,
  `e2e/`, and all its build config (`vite`, `vitest`, `playwright`, `tsconfig`, `postcss`,
  `scripts/copy-wasm.js` + `version-bump.js`). Tauri is invoked here (release CI passes
  `projectPath: apps/desktop`).
- **`apps/site/`** — marketing site (package `pigeon-site`), Astro + React islands. Hosted at
  `https://trypigeon.dev` on Cloudflare R2 + Worker (`wrangler.jsonc`, bucket `trypigeon-site`). Consumes
  `@pigeon/ui` + `@pigeon/brand`.
- **`packages/ui/`** — `@pigeon/ui`, source-only (no build step — both apps' bundlers compile it
  from TS/CSS source directly, standard for a pnpm-workspace + Vite setup). `src/styles/tokens.css`
  is the design-token spec (mirrored in `TOKENS.md` at the repo root); `src/lib/cn.ts`; leaf React
  primitives in `src/components/` (`button`, `badge`, `switch`, `tabs`, `Tooltip`), barrel at
  `src/index.ts`. A consumer needs `@import "@pigeon/ui/tokens.css";` **and** an `@source` line
  pointing at this package's `src` — Tailwind 4 doesn't auto-scan outside the consuming app's own
  tree, so a missing `@source` fails silently as unstyled UI.
- **`packages/brand/`** — `@pigeon/brand`, canonical logo/brand assets (`pigeon-mark.svg` +
  mono/duotone variants, wordmark, icon source), exported per-file via `package.json` `exports`
  (e.g. `@pigeon/brand/pigeon-mark.svg`). `logo/` at the repo root remains the design-source master
  for non-npm tooling (`tauri icon` regen, etc.) — `packages/brand` is the npm-consumable copy for
  app code to import.
- Root-level: `Makefile` (delegates to the workspace), `biome.json`, `lefthook.yml`,
  `.version.json`, `logo/`, `docs/`, `TOKENS.md`, and `scripts/install.sh` (kept at root because its
  raw URL is the published install command).

Paths below like `src/features/...` are relative to **`apps/desktop/`** unless stated otherwise.

**Layer rule (Biome-enforced)**: `app → features → core → shared → @pigeon/*`. Core never imports
features; cross-feature imports go through feature barrels only — deep imports like
`@/features/x/components/Y` from outside feature `x` are banned by Biome's `noRestrictedImports`
(`biome.json`, `linter.rules.style`), covering `@/features/*` and `@/core/*` internals
(`components|hooks|lib|services|store|ports|oauth|model|types`), including the extra nesting level
under `@/features/rest/*`. Import cycles are enforced separately: `pnpm check:cycles` (madge, runs
in `ci.yml`) fails the build on any cycle. The old `shared/ui/KeyValueEditor` →
`features/environments` exception is gone: `KeyValueEditor` now takes an injected `autocomplete`
prop (contract in `shared/ui/KeyValueEditor/autocomplete.ts`), and
`features/environments` exports `VarKeyValueEditor` — the pre-wired variant every feature uses for
`{{var}}` autocomplete on values. Use `VarKeyValueEditor`, not the bare shared editor, unless you
specifically don't want env suggestions.

### Main App (`apps/desktop/src/`)

Architecture is feature-based, layered `app → features → core → shared`. `src/app/` owns
bootstrap/layout/global shortcuts only. Business logic belongs in `src/features/*`; cross-cutting,
feature-agnostic logic lives in `src/core/*`; shared primitives and shared request types live in
`src/shared/*`. Concretely: `app/layout/Sidebar.tsx` is a thin shell — the sidebar tab sections it
composes are feature-owned (`HistoryTab`/`DraftTab` from `features/rest/history`,
`CollectionsTab` from `features/rest/collections`, exported via their barrels), with the generic
presentational pieces (`TreeRow`, `EmptyState`, `ConfirmModal`) in `shared/ui/`.

- `src/features/rest/` groups the REST workspace's five features (`request-builder`,
  `response-viewer`, `collections`, `history`, `import-export`) — each is a full standalone feature
  with its own barrel at `src/features/rest/<name>/index.ts`; `rest/` itself is a grouping
  directory, not a feature (no `index.ts` of its own).
- `src/features/{mcp,workspaces,environments,settings,command-palette}/` are top-level features.
- `src/core/http/` — pure send/transport (was `features/execution`): `ports/HttpClient.ts`,
  `services/{Tauri,Browser}HttpClient.ts`, `services/requestService.ts` (`sendRequest`,
  `resolveRequest`), SSE (`lib/sse.ts`, `services/sseClient.ts`, `services/activeStreams.ts`). Core
  never imports features, so it has **no** history/draft auto-save logic — that orchestration is
  `src/features/rest/request-builder/hooks/useSendRequest.ts`, which wraps `core/http`'s
  `sendRequest` with the history-writing side effect (this is how the history↔execution import
  cycle was broken).
- `src/core/interpolation/` — `interpolateStrict(str, resolve)`, `UnresolvedVariablesError`,
  `createAccumulatingResolver` (for callers like `resolveRequest` that interpolate several fields
  before deciding whether to block the send). Resolver-agnostic on purpose — it takes a plain
  `Resolver` function, not `Environment`/`makeResolver`, so it doesn't need to import
  `features/environments` and stays a legal `core` module under the layer rule. MCP and
  `core/http/services/requestService.ts` both consume this; there is exactly one
  `UnresolvedVariablesError` class in the codebase.
- `src/core/persistence/` — `browserTable.ts` (the `localStorage` table primitives) +
  `tableStore.ts`'s `createNumTableStore` / `createStrTableStore` / `createKeyValueStore` factories.
  Each feature's `services/db.ts` is a thin instantiation (Tauri command names + browser key), not a
  reimplementation — this is what replaced the 4 near-duplicate `isTauri() ? invoke() :
  localStorage` wrappers. Exported function names are unchanged from before the factories existed,
  so call sites and Vitest mocks didn't need touching.
- `src/core/platform/` — `selectImpl<T>({ tauri, browser })`, the shared shape behind every
  transport-selection seam (`core/http`'s `httpClient`, MCP's `getMcpTransport`). `isTauri()` and
  `windowKind.ts` still live at their original `src/shared/lib/` path (not moved into `core/platform`
  — that particular move was scoped out, not forgotten).

Platform seam: `src/shared/lib/platform.ts` `isTauri()` gates backend access. In the desktop app,
persistence and HTTP go through Rust (`invoke`); in a plain browser (dev server / Playwright) they
fall back to browser adapters — `localStorage` via `src/core/persistence/browserTable.ts` and
`BrowserHttpClient` (fetch, in `src/core/http`). This is what makes `pnpm dev` and browser E2E
functional.

Feature barrels (`src/features/<feature>/index.ts`, or `src/features/rest/<name>/index.ts`) are the
public API — enforced by Biome's `noRestrictedImports` (see Monorepo layout above). App/layout code
should import features through barrels. Features must not import from `src/app/`.

State lives in co-located Zustand stores:
- `src/features/rest/request-builder/store.ts` — tab lifecycle, request editing, rename/close variants
- `src/features/rest/history/store.ts` — persisted history and drafts
- `src/features/rest/collections/store.ts` — collection tree CRUD/move/reorder
- `src/features/environments/store.ts` — environment variables and interpolation

Drafts, history, and collections persist via Rust SQLite commands through thin `services/db.ts`
wrappers built on the `core/persistence` factories above. Do not call `invoke()` directly from
components. Tables are `rest_`/`mcp_`-prefixed by feature (`rest_drafts`, `rest_history`,
`rest_collections`, `mcp_oauth`) — renamed from the unprefixed originals via a schema migration (see
below), Rust fn/command names and frontend `invoke()` call sites are unaffected by that rename.
Collections are stored as JSON in `rest_collections(id TEXT PRIMARY KEY, data TEXT, created_at
INTEGER)`; `src-tauri/src/db/mod.rs` migrates legacy integer IDs to text so UUID collection IDs work.

**Schema migrations**: `src-tauri/src/db/mod.rs` tracks an integer `schema_version` in a
`schema_meta` table. `init_db()` runs every entry in the `MIGRATIONS` array whose index is >= the
stored version, in order, bumping the version after each step — so a crash mid-migration resumes
from the last completed step on next launch instead of re-running or skipping steps. This all runs
synchronously before the window opens, so every launch is auto-migrated with no user action. Append
new migrations to the end of `MIGRATIONS`; never reorder or remove past ones (older installs may
still be mid-list) — a `#[cfg(test)]` guard test in `db/mod.rs` (`migrations_are_append_only`) pins
the migration name list and fails the build if it's reordered/renamed, forcing an explicit update
when a migration is genuinely added. If a migration ran this launch, `get_migration_status` (Tauri
command, in `db/mod.rs`) returns `{fromVersion, toVersion}` once; the frontend surfaces it via
`MigrationToast` (`src/app/layout/MigrationToast.tsx`, wired through
`features/settings/lib/migration.ts`) as a one-shot dismissible toast — not a real-time progress
bar, since local SQLite migrations finish before the toast can even mount.

**Rust module layout** (`src-tauri/src/`, command fn names never change — only which file they live
in): `lib.rs` is just `run()` (plugins, `DbState`, `generate_handler!`); `http.rs` (client builders +
`send_api_request`); `sse.rs` (SSE parser + stream registry + `cancel_sse_stream` — the shared
cancel-flag state moved as one unit); `mcp.rs` (`send_mcp_request`); `windows.rs`
(`open_workspace_window`); `oauth.rs` (unchanged); `db/mod.rs` (`DbState`, `MIGRATIONS`, guard test,
`get_migration_status`) + `db/{drafts,history,collections,mcp_oauth}.rs` (per-domain SQL + Tauri
commands combined into one function each, e.g. `db::drafts::save_draft`). `generate_handler!` needs
these fully-qualified module paths — a `db::mod` re-export wouldn't work, since the
`#[tauri::command]` macro's hidden companion items aren't re-exportable.

**Environments are the exception**: they persist to `localStorage` for *both* builds
(`environments/services/db.ts`, keys `pg_browser_environments` / `pg_globals` / `pg_active_env`) —
the Tauri webview's `localStorage` is durable, so there is no Rust `environments` table. Response
word-wrap (`pg_word_wrap`) and theme (`pg_theme`) likewise persist through small feature-owned
`localStorage` helpers, not SQLite.

HTTP requests are sent from Rust via `reqwest` (not browser fetch) so there are no CORS
restrictions. Use `src/features/rest/request-builder/hooks/useSendRequest.ts` (orchestration:
send + auto-save) or `src/core/http`'s `sendRequest` directly for a pure send with no history
side effect; Rust owns the actual `send_api_request` command (`src-tauri/src/http.rs`).

### Import / Export Architecture

`src/features/rest/import-export/model/RequestModel.ts` is the stable internal request interchange
model for import/export. Its `Header` type is exported as `ImportedHeader` (renamed to avoid
colliding with `shared/types`' `Header`, which has a different shape). Keep parser/library details
behind adapters:
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

Tree updates in `src/features/rest/collections/store.ts` must rebuild immutable nodes. Never mutate
existing tree nodes in place; React change detection depends on new object/array references.

UI entry points:
- Sidebar collection tab: create, rename, delete collection; create folders; add/rename/delete
  saved requests/folders
- `SaveToCollectionModal`: opened by `Cmd+S` / `Ctrl+S`, lets user choose collection plus nested
  folder/root destination

When saving requests into collections, strip live `File` objects. Persist file names/metadata only.

### Settings Persistence

Theme and request options (follow redirects, SSL verify, proxy URL) persist to `localStorage`
(`pg_theme`, `pg_follow_redirects`, `pg_ssl_verify`, `pg_proxy_url`). `src/features/rest/request-builder/hooks/useSendRequest.ts`
reads those keys directly when sending requests — settings and the send path are coupled through
`localStorage`, not through a shared store.

### Update System

Tauri updater is wired with `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process`.
`plugins.updater.endpoints` in `tauri.conf.json` points at `https://trypigeon.dev/latest.json`
(mirrored from the GitHub Release asset on each `deploy-site.yml` run).
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

All design tokens are CSS custom properties, sourced from `@pigeon/ui/tokens.css` (imported at the
top of `src/styles/index.css`, spec in `TOKENS.md`) plus desktop-only additions (scrollbar, `.pg-logo`
theme filter, `@layer base`) in `index.css` itself — **never use hardcoded hex values**. Use
`var(--token-name)` everywhere. Syntax highlight colors are also CSS vars per theme so
`highlight.js` output adapts automatically. `apps/site` imports the same `@pigeon/ui/tokens.css` but
keeps its own separate, permanently-dark bespoke palette on top (it has no light/dark toggle) —
see `docs/restructure-plan.md`'s Phase 7 notes for exactly which token names are shared vs.
site-only.

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
  `⇧K` palette, `⇧E` envs, `⇧R` REST workspace, `⇧M` MCP (coming soon), `⇧G` GraphQL (coming soon),
  `⇧,` settings, `⇧/` shortcuts, `⇧1–9` tabs). Two exceptions: `Cmd+Enter` sends, and plain `Cmd+F`
  is contextual find — the body editor and response panel intercept it for an in-panel `FindBar`
  (`shared/ui/FindBar.tsx` + `shared/lib/textFind.ts`); anywhere else it focuses the header
  search. Handlers match on `e.code` (Shift changes `e.key`).
- **Tab kinds**: `Tab.kind = "http" | "mcp" | "graphql"` in the tab store. Non-http tabs currently
  render the shared `ComingSoonWorkspace` pane (no URL bar) with a kind badge (`MCP` / `GQL`).
  Real MCP/GraphQL benches land later; MCP feature code under `features/mcp` is retained.
- **Workspace windows (desktop app only)**: REST/MCP/GraphQL each open as a separate singleton
  OS window (`open_workspace_window` in `src-tauri/src/windows.rs` — focuses the existing window for
  that kind rather than duplicating it; REST is always the app's default `"main"` window). Each
  window is a separate webview/JS heap, so `useTabStore` (and every other Zustand store) is
  naturally isolated per window with no extra plumbing — `src/shared/lib/windowKind.ts` resolves
  which kind a given window is (by its Tauri window label) and is what makes the tab store default
  to the right kind (`addTab()`'s default, and the "tabs emptied" fallback) in each one. The
  sidebar stays the REST `Sidebar` while MCP/GraphQL are coming-soon — see `docs/features/sidebar.md`.
  The plain browser/E2E build has no OS windows at all and keeps the original single-page,
  mixed-kind-tabs experience (`openKindTab` singleton-within-the-page); `windowKind.ts` always
  resolves `"rest"` there, and `AppContent.tsx`'s `openWorkspace()` helper branches on `isTauri()`
  to pick between `invoke("open_workspace_window", ...)` and the legacy `openKindTab()`.
- **Modal keyboard behaviour**: Shared `Modal` only closes on backdrop keyboard events when the
  backdrop itself is focused. Space inside inputs/selects must not close modals.

### Marketing Site (`apps/site/`)

Astro site (package `pigeon-site`, workspace member — not part of the Tauri build) with React
islands for interactive demos. Blog posts live in `src/content/blog/*.md` (Astro content
collections). Canonical URL / sitemap site is `https://trypigeon.dev` (`astro.config.mjs`).
Deploy target is **Cloudflare R2 + Worker** via Wrangler (`apps/site/wrangler.jsonc`, worker
name `trypigeon`, R2 bucket `trypigeon-site`). Astro `dist/` uploads to R2 on deploy; the Worker
serves objects. Custom domain is attached in the Cloudflare dashboard (not a GitHub Pages
`CNAME`).

It reads `apps/site/src/release.json`, fetched from the GitHub API **at build time** by
`deploy-site.yml` — not at runtime. The repo ships a stub `release.json` with empty `assets: []` as
the fallback. `parseRelease()` in `apps/site/src/lib/github.ts` handles missing/empty fields
defensively.

Tailwind 4 is wired via `@tailwindcss/vite` in `astro.config.mjs`. Global CSS still imports
theme + utilities only (no Preflight) plus site-local dark tokens — same split as before.

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
2. Builds Tauri for **macOS only** today (Apple Silicon + Intel `.dmg`). Windows/Linux matrix
   rows in `release.yml` are commented out until those platforms ship.
3. Publishes draft → public once all builds pass, then dispatches `deploy-site.yml` on `main`
   (via `RELEASE_TOKEN`) to refresh the site's download links

Required secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `RELEASE_TOKEN`.
Site refresh is dispatched on `main` after publish so `release.json` / install copy stay current.

### `deploy-site.yml` — push to `main` (`apps/site/**`) **or** dispatched by `release.yml`
1. Fetches latest release JSON from GitHub API into `apps/site/src/release.json` (uses `curl -o` — only writes on success, leaving the stub intact on 404)
2. `pnpm install --frozen-lockfile` + `pnpm --filter pigeon-site build` (Astro → `apps/site/dist`)
3. Fetches `release.json` + Tauri `latest.json` into `public/` (served at `/release.json`, `/latest.json`)
4. Creates R2 bucket `trypigeon-site` if missing, uploads `dist/` to R2, deploys Worker with Wrangler

Required site secrets: **`CLOUDFLARE_API_TOKEN`**, **`CLOUDFLARE_ACCOUNT_ID`**.
Attach custom domain `trypigeon.dev` in Cloudflare → Workers → `trypigeon` → Custom Domains
(DNS can live on Cloudflare or external with the records Cloudflare shows).
Disable Cloudflare Auto Minify for the zone if React islands show hydration mismatch warnings.

The download buttons come from the release assets automatically — `parseRelease()` in
`apps/site/src/lib/github.ts` maps each asset's `browser_download_url` to the right platform button, so a
new release refreshes the site's download links with no code change.

## Known Gotchas

- **`pnpm-workspace.yaml`** must have a `packages` field (`packages: ['apps/*', 'packages/*']`) — pnpm 9+ fails every command without it
- **One root `pnpm-lock.yaml`** covers both apps and both packages — `pnpm install` at the root; never run `npm install` in `apps/site` (the old npm-only workaround is gone; pnpm's lockfile records per-platform optional deps, so the rollup-native-binary problem doesn't apply)
- **Root scripts delegate** via `pnpm --filter pigeon` / `--filter pigeon-site`; `pnpm dev`/`build`/`tauri`/`test`/`e2e` from the root still work
- **Tauri lives in `apps/desktop`** — run `pnpm tauri dev` from the root, or `cd apps/desktop`; release CI passes `projectPath: apps/desktop`
- **TypeScript target is ES2022** (`apps/desktop/tsconfig.json`) — required for `Object.hasOwn`; do not lower it
- **`make build-release` passes `--bundles` directly to tauri** (no `--` separator) — the `--` separator in Tauri CLI forwards remaining args to Cargo, not Tauri

## Icons / Assets

**Brand mark** — `logo/logo.svg` is the design-source master. Derived variants live in `logo/`:
`mark.svg` (orange), `mark-mono.svg` (`currentColor`), `mark-duotone.svg`, `wordmark.svg`.
`packages/brand/assets/` holds the npm-consumable copies (`pigeon-mark.svg`,
`pigeon-mark-mono.svg`, `pigeon-mark-duotone.svg`, `wordmark.svg`, `logo.svg`, `icon-source.png`),
exported per-file from `@pigeon/brand`'s `package.json`. `apps/desktop`'s 3 code-level consumers
(header, empty state, settings) import `@pigeon/brand/pigeon-mark.svg` — there is no local
`apps/desktop/src/assets/pigeon-mark.svg` copy anymore. `apps/site/public/pigeon-mark.svg` +
`pigeon-mark.png` are a separate, still-duplicated copy (favicon/OG-image `<link>`/`<meta>` tags
need a real static file under `public/`, not an npm import) — adopting `@pigeon/brand` there too is
future work, not done. Do not reintroduce the old `pigeon-logo-*.png` files — they were removed.

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
