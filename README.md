<div align="center">
  <img src="logo/macOS/Icon-128.png" width="96" alt="Pigeon logo" />

  <h1>Pigeon</h1>

  <p>A beautiful, fast API client for macOS, Linux and Windows.<br/>Built with Tauri v2 — native performance, web-tech flexibility.</p>

  <p>
    <img src="https://img.shields.io/badge/version-0.1.0-7C6EFA?style=flat-square" alt="version" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-6A6A90?style=flat-square" alt="platform" />
    <img src="https://img.shields.io/badge/Tauri-v2-24C8D8?style=flat-square&logo=tauri&logoColor=white" alt="Tauri" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/github/actions/workflow/status/k1n1/pigeon/ci.yml?style=flat-square&label=CI" alt="CI" />
  </p>
</div>

---

## What is Pigeon?

Pigeon is a desktop API client — think Postman or Insomnia, but lighter and native. It lets you craft HTTP requests, inspect responses with syntax highlighting, organise saved requests into collections, and manage environments with variable interpolation. Everything stays local; no account required.

---

## Features

| | |
|---|---|
| **Multi-tab workflow** | Open multiple requests side-by-side, rename tabs by double-clicking, restore on relaunch |
| **Smart URL bar** | Paste a raw `curl` command and Pigeon auto-imports the method, headers and body |
| **Syntax-highlighted responses** | Pretty-printed JSON/XML/HTML with per-theme colours; Raw mode for plain text |
| **Request editor** | Params, Headers, Body (JSON with Tab-indent, form-data, multipart, file), Auth (Bearer, Basic, API Key) |
| **Collections** | Save requests in nested folders; drag-and-drop tree with horizontal scroll for deep hierarchies |
| **Environments** | Create environments with `{{variable}}` interpolation across URLs, headers and bodies |
| **History & Drafts** | Every request is auto-saved; revisit, re-run or save to a collection |
| **Import / Export cURL** | Import from the sidebar or paste directly into the URL bar; export any tab as a cURL command |
| **Three themes** | Dark · Light · Pink — persisted across sessions |
| **Keyboard-first** | Full shortcut coverage: `⌘N` new tab, `⌘Enter` send, `⌘F` search, `⌘,` settings and more |
| **Right-click tab menu** | Close Tab, Close Other Tabs, Close All Tabs, New Request |
| **Auto-updater** | Built-in Tauri updater checks for new releases on launch |

---

## Tech Stack

### Desktop App (`/src` + `/src-tauri`)

| Layer | Technology |
|-------|-----------|
| Shell | [Tauri v2](https://tauri.app) (Rust) |
| UI | [React 19](https://react.dev) + [TypeScript 5.8](https://www.typescriptlang.org) |
| Styling | [TailwindCSS 4](https://tailwindcss.com) + CSS custom properties |
| Component primitives | [HeroUI](https://heroui.com) + [Lucide Icons](https://lucide.dev) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Routing | [React Router DOM v7](https://reactrouter.com) |
| Syntax highlighting | [highlight.js](https://highlightjs.org) |
| Build | [Vite 7](https://vitejs.dev) |
| Lint / Format | [Biome v2](https://biomejs.dev) |
| Git hooks | [Lefthook v2](https://github.com/evilmartians/lefthook) |
| Package manager | [pnpm 11](https://pnpm.io) |

### Marketing Site (`/site`)

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Hosting | GitHub Pages (auto-deploy on push to `main`) |

---

## Project Structure

```
pigeon/
├── src/                     # Frontend (React)
│   ├── components/          # UI components
│   │   ├── ui/              # Primitives — Button, Tab, Badge
│   │   ├── Toolbar.tsx      # Top bar: logo, Export, Settings
│   │   ├── Sidebar.tsx      # History / Drafts / Collections
│   │   ├── UrlBar.tsx       # Method picker, URL input, Send
│   │   ├── RequestEditor.tsx
│   │   ├── ResponsePanel.tsx
│   │   ├── BodyEditor.tsx
│   │   ├── ImportModal.tsx  # cURL import drawer + shared Modal shell
│   │   └── ExportCurlModal.tsx
│   ├── store/               # Zustand stores
│   ├── hooks/               # useApiRequest, useAutoClose
│   ├── lib/                 # curl, curlParser, env, url utilities
│   ├── assets/              # Logo PNGs (retina-ready)
│   ├── App.tsx              # Root layout + TabStrip + SettingsDrawer
│   └── index.css            # Design tokens, theme classes, animations
├── src-tauri/               # Rust / Tauri backend
│   ├── src/                 # Rust source
│   └── icons/               # App icons (all sizes, transparent bg)
├── logo/                    # Source brand assets
│   ├── macOS/               # Icon-16 through Icon-1024
│   ├── iOS/
│   ├── Android/
│   └── Watch/
├── site/                    # Marketing site
├── .github/workflows/
│   ├── ci.yml               # Lint + typecheck + build on every PR
│   ├── release.yml          # Tag-triggered cross-platform release build
│   └── deploy-site.yml      # Auto-deploy marketing site to GitHub Pages
├── biome.json               # Lint + format rules
├── lefthook.yml             # Git hook config
├── Makefile                 # Common task shortcuts
└── CLAUDE.md                # AI agent instructions
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20.19+ or 22.12+
- [pnpm](https://pnpm.io) 11+
- [Rust](https://rustup.rs) (stable)
- Tauri system dependencies — see [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Install

```bash
# Clone the repo
git clone https://github.com/k1n1/pigeon.git
cd pigeon

# Install JS dependencies
pnpm install

# Start the desktop app (hot-reload)
pnpm tauri dev
```

### Build for production

```bash
pnpm tauri build
# Output: src-tauri/target/release/bundle/
```

---

## Development

### Useful commands

```bash
pnpm dev            # Vite dev server only (browser preview)
pnpm build          # TypeScript check + Vite build
pnpm lint           # Biome lint (read-only)
pnpm check:write    # Auto-fix lint + format
pnpm ci:check       # Full CI-grade check (fails on warnings)
```

### Makefile shortcuts

```bash
make dev            # pnpm tauri dev
make build          # pnpm tauri build
make format         # Auto-fix lint + format
make lint           # Lint only
make clean          # Remove build artifacts
```

### Code conventions

- **No hardcoded colours** — all tokens via `var(--token)` CSS custom properties
- **No `any`** — strict TypeScript throughout
- **Biome** enforces formatting (2-space indent, double quotes, 100-char lines)
- Pre-commit hook auto-fixes staged files; pre-push validates everything

---

## CI / CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| **CI** | Push / PR → `main` | Biome check + `tsc --noEmit` + Vite build |
| **Release** | Push a `v*` tag | Builds Tauri for macOS (Intel + ARM), Linux, Windows → publishes GitHub Release |
| **Deploy Site** | Push → `main` (`site/**`) | Builds marketing site → deploys to GitHub Pages |

To cut a release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Required repository secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ N` | New tab |
| `⌘ W` | Close tab |
| `⌘ Enter` | Send request |
| `⌘ F` | Focus sidebar search |
| `⌘ S` | Save to collection |
| `⌘ ,` | Open settings |
| `⌘ ⇧ E` | Open environment manager |
| `⌘ ⇧ 1–9` | Switch to tab by number |
| `?` | Show keyboard shortcuts |

---

## Theme System

Pigeon ships with three themes toggled from Settings:

| Theme | Preview |
|-------|---------|
| **Dark** | Deep purple-grey backgrounds, violet accent |
| **Light** | White surfaces, indigo accent |
| **Pink** | Dark with rose/pink accent |

Theme preference is saved to `localStorage` and restored on next launch.

---

## License

MIT © k1n1
