# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.8 + TailwindCSS 4 + Vite 7
- **UI Library**: HeroUI (React), Lucide icons
- **Desktop**: Tauri v2 (Rust backend)
- **State**: Zustand
- **Routing**: React Router DOM v7
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
pnpm lint             # Lint only (read-only)
pnpm check:write      # Auto-fix lint + format (write) — use this before committing
pnpm ci:check         # CI-grade check — fails on warnings+
pnpm lint:staged      # Check only staged files
```

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

## Architecture

### Main App (`src/`)

State lives exclusively in Zustand stores (`src/store/`):
- `tabStore` — tab lifecycle, rename, close variants, URL-derived default names
- `historyStore` — persisted request history
- `collectionStore` — saved collections
- `envStore` — environment variables with variable interpolation

Persistence uses SQLite via `@tauri-apps/plugin-sql` (see `src/lib/db.ts`). All DB access goes through the lib layer, never directly from components.

HTTP requests are sent from Rust via `reqwest` (not browser fetch) so there are no CORS restrictions. The Tauri command is invoked through `src/hooks/useApiRequest.ts`.

### Theme System

Three themes toggled via CSS class on `<html>`: `.dark` (default), `.theme-light`, `.theme-pink`.

All design tokens are CSS custom properties in `src/index.css` — **never use hardcoded hex values**. Use `var(--token-name)` everywhere. Syntax highlight colors are also CSS vars per theme so `highlight.js` output adapts automatically. The logo uses `.pg-logo` which applies `filter: brightness(0) invert(1)` in dark/pink themes.

### Key Behaviours

- **cURL auto-import**: Pasting a `curl ...` command into the URL bar auto-parses it via `src/lib/curlParser.ts` (method, headers, body applied instantly)
- **Tab rename**: Double-click any tab label to rename inline (Enter/blur saves, Esc cancels); name locks on manual rename, otherwise derived from URL path
- **Tab right-click menu**: New Request / Close Tab / Close Other Tabs / Close All Tabs
- **Import/Export cURL**: Right-side slide-in drawer panels — not centered modals

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
