# Pigeon — API Client Desktop App

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.8 + TailwindCSS 4 + Vite 7
- **UI Library**: HeroUI (React), Lucide icons
- **Desktop**: Tauri v2 (Rust backend)
- **State**: Zustand
- **Routing**: React Router DOM v7
- **Lint/Format**: Biome v2.5.0
- **Git Hooks**: Lefthook v2.1.9
- **Package Manager**: pnpm 11.6.0 (main app) / npm (marketing site)

## Project Structure

```
/
├── src/                        # Main app source
│   ├── components/             # React components
│   │   ├── ui/                 # Primitives: Button, Tab, Badge
│   │   ├── AuthEditor.tsx
│   │   ├── BodyEditor.tsx      # JSON editor with syntax highlighting + Tab-indent
│   │   ├── EnvModal.tsx
│   │   ├── ExportCurlModal.tsx # Right-side drawer: export active tab as cURL
│   │   ├── HeadersEditor.tsx
│   │   ├── ImportModal.tsx     # Right-side drawer: import from cURL; exports Modal/ModalHeader/ModalFooter
│   │   ├── KeyValueEditor.tsx
│   │   ├── KeyboardShortcutsModal.tsx
│   │   ├── RequestEditor.tsx
│   │   ├── ResponsePanel.tsx   # Pretty/Raw toggle, syntax-highlighted body, headers tab
│   │   ├── Sidebar.tsx         # History / Draft / Collections with search
│   │   ├── Toolbar.tsx         # Top bar: logo, Export cURL, Settings
│   │   └── UrlBar.tsx          # Method dropdown, URL input (auto-parses cURL paste), Send
│   ├── hooks/
│   │   ├── useApiRequest.ts
│   │   └── useAutoClose.ts
│   ├── store/                  # Zustand stores
│   │   ├── collectionStore.ts
│   │   ├── envStore.ts
│   │   ├── historyStore.ts
│   │   └── tabStore.ts         # Tab rename, URL-derived default name, closeOtherTabs, closeAllTabs
│   ├── lib/
│   │   ├── curl.ts             # generateCurl()
│   │   ├── curlParser.ts       # parseCurl()
│   │   ├── db.ts
│   │   ├── env.ts
│   │   ├── updater.ts
│   │   └── url.ts
│   ├── assets/
│   │   ├── pigeon-logo-32.png  # 128px source → used at 28px in Toolbar (retina-crisp)
│   │   └── pigeon-logo-64.png  # 256px source → used at 72px in EmptyState (retina-crisp)
│   ├── types/
│   │   └── index.ts            # HttpMethod includes HEAD | OPTIONS
│   ├── App.tsx                 # Root: TabStrip (rename on dblclick), EmptyRequestState, SettingsDrawer
│   ├── index.css               # CSS variables, 3-theme system, hljs syntax vars, pg-logo filter
│   └── main.tsx
├── src-tauri/                  # Rust / Tauri v2 backend
│   └── icons/                  # All generated from logo/macOS/ (transparent bg)
├── logo/                       # Source brand assets (DO NOT edit)
│   ├── macOS/                  # Icon-16 → Icon-1024 (with and without -transparent suffix)
│   ├── iOS/
│   ├── Android/
│   └── Watch/
├── site/                       # Marketing / download site (npm)
│   └── src/
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR gate: biome check + tsc + vite build
│       ├── release.yml         # Tag push: build Tauri for macOS/Linux/Windows → draft release
│       └── deploy-site.yml     # Push to main (site/**): build + deploy to GitHub Pages
├── biome.json                  # Lint + format config (do not edit without asking)
├── lefthook.yml                # Git hooks config (do not edit without asking)
├── scripts/
│   └── version-bump.js
├── Makefile
└── CLAUDE.md                   # This file
```

## Commands

### Development
```bash
pnpm dev              # Vite dev server (browser)
pnpm tauri dev        # Tauri desktop app
pnpm build            # TypeScript check + Vite build
pnpm preview          # Preview production build
```

### Lint & Format (Biome)
```bash
pnpm lint             # Lint only (read-only)
pnpm format           # Format all files (write)
pnpm format:check     # Check format without writing
pnpm check            # Lint + format check (read-only)
pnpm check:write      # Auto-fix lint + format (write)
pnpm ci:check         # CI-grade check — fails on warnings+
pnpm lint:staged      # Check only staged files
```

### Makefile shortcuts
```bash
make lint             # pnpm run lint
make format           # pnpm run check:write
make format-check     # pnpm run format:check
make ci-check         # pnpm run ci:check
make dev              # pnpm run tauri dev
make build            # pnpm run tauri build
make deps             # pnpm install
make clean            # Remove dist, target, node_modules, pnpm-lock.yaml
make install          # deps + build-release
make open             # Open built DMG
```

## Theme System

Three themes toggled via CSS class on `<html>`:
| Theme | Class | Description |
|-------|-------|-------------|
| Dark  | `.dark` | Default dark purple |
| Light | `.theme-light` | Light/white surfaces |
| Pink  | `.theme-pink` | Dark with pink accent |

All design tokens are CSS custom properties (`--bg-base`, `--accent`, `--border`, etc.) — **never use hardcoded hex values** in components. Use `var(--token-name)` everywhere.

Syntax highlight colors are also CSS vars per-theme (`--hljs-attr`, `--hljs-string`, etc.) so `highlight.js` output adapts automatically.

The logo image uses `.pg-logo` class which applies `filter: brightness(0) invert(1)` in dark/pink themes so the dark-illustrated bird appears white on dark backgrounds.

## Key Behaviours

- **cURL auto-import**: Pasting a `curl ...` command into the URL bar auto-parses it (method, headers, body applied instantly + green toast)
- **Tab rename**: Double-click any tab label to rename inline (Enter/blur saves, Esc cancels)
- **Tab default name**: Derived from URL path (e.g. `/posts/1`) while not locked; locks on manual rename
- **Tab right-click menu**: New Request / Close Tab / Close Other Tabs / Close All Tabs
- **Empty state**: Shown when active tab has no URL typed yet
- **Method dropdown**: Closes on outside click
- **Import/Export cURL**: Right-side slide-in drawer panels (no centered modal)

## Icons / Assets

All app icons originate from `logo/macOS/` — **do not design or generate new icons**.

Workflow for icon changes:
1. Replace files in `logo/` with new source artwork
2. Run the Python PIL script to generate `-transparent` variants (removes white bg)
3. Copy transparent variants to `src-tauri/icons/` at the right names
4. Rebuild `icon.icns` with `iconutil`
5. Copy high-res variants to `src/assets/pigeon-logo-32.png` (128px source) and `pigeon-logo-64.png` (256px source)

## CI/CD Pipelines

### `ci.yml` — runs on every push + PR to `main`
1. **lint-typecheck**: `pnpm ci:check` (Biome) + `tsc --noEmit`
2. **build**: `pnpm build` (Vite) — only if lint passes

### `release.yml` — runs on `v*` tag push
1. Creates a **draft** GitHub release
2. Builds Tauri for 4 targets in parallel (macOS Intel, macOS ARM, Linux, Windows)
3. `tauri-action` uploads artifacts directly to the draft release
4. Publishes the draft → public once all builds pass

Required secrets:
- `TAURI_SIGNING_PRIVATE_KEY` — Tauri updater signing key
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — signing key password

### `deploy-site.yml` — runs on push to `main` when `site/**` changes
1. Fetches latest release data from GitHub API → `site/src/release.json`
2. Builds the marketing site with `npm run build`
3. Deploys to GitHub Pages

## Git Hooks (Lefthook)
- **Pre-commit**: Auto-fixes staged files (Biome lint + format)
- **Pre-push**: Validates all files — blocks on errors
- Hooks skip gracefully when `node_modules` is missing (fresh clone)

## Package Manager
Main app uses **pnpm** (not npm or bun).
```bash
corepack enable pnpm   # If using Corepack
pnpm install           # Install dependencies
```
Marketing site (`/site`) uses **npm**.

## Conventions
- **Formatting**: 2-space indent, double quotes, semicolons, trailing commas, 100-char line width
- **Lint**: Strict TypeScript (`no any`), a11y enforced, no `var`, no `debugger`
- **Console**: `console.log` allowed; other methods trigger warnings
- **Imports**: Auto-organized by Biome
- **Components**: React functional components + hooks only
- **Styling**: TailwindCSS utility classes; `cva` for variants; CSS vars for all color tokens
- **State**: Zustand stores in `src/store/`
- **Comments**: Write only when the WHY is non-obvious — never narrate what the code does

## AI Workflow (for AI agents)

When asked to implement a new feature:
1. Feature workflow docs live in `.opencode/workflow/features/<feature-name>/`
2. The Workflow Manager orchestrates: PM → Designer → EM → Dev → QA
3. Do **not** edit `biome.json` or `lefthook.yml` without explicit user approval
4. Do **not** create or design new icons — use files from `logo/` only
5. Do **not** hardcode hex color values — always use CSS custom properties
