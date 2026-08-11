# Pigeon — Feature Design Inventory

In-depth list of every feature/screen for design work (Figma / design sessions).
Each entry: purpose, UI surfaces, states, key interactions, and design notes.

**Detailed product specs (acceptance criteria, testids, QA):** one file per feature under
[`docs/features/`](./features/README.md) — start there for implementation truth.

Architecture and module APIs: [`architecture.md`](./architecture.md).

Two products share one brand: the **desktop app** (Tauri, dark theme default + light theme)
and the **marketing site** (Astro on Cloudflare Workers / trypigeon.dev).

---

## 1. Desktop app — application shell

### 1.1 Header bar
- **Purpose**: global navigation + app identity.
- **Surfaces**: brand mark (theme-aware `.pg-logo`), workspace switch (REST / MCP / GraphQL —
  MCP & GraphQL open in-place coming-soon panes), global search field (`⌘F` focuses it when
  panels do not intercept), env selector, settings + shortcuts entry points, icon-only cURL
  export button.
- **States**: active workbench highlighted; search focused/blurred.
- **Interactions**: `⌘⇧R / M / G` switch workbenches; `⌘,` settings; `⌘⇧/` shortcuts overlay.
- **Doc**: [features/app-shell.md](./features/app-shell.md), [features/workspaces.md](./features/workspaces.md).

### 1.2 Tab strip (request tabs)
- **Purpose**: multiple in-flight requests per REST window.
- **Surfaces**: horizontal tab list; method-colored label + name; close ×; overflow scrolling;
  drag reorder.
- **States**: active/inactive (inactive stay mounted, `display:none`); renamed (name-lock) vs
  auto-named (URL path); empty → new-tab fallback.
- **Interactions**: double-click rename; context menu (New / Duplicate / Close / Close Others /
  Close All); `⌘T` / `⌘⇧N` new, `⌘W` close, `⌘1–9` jump.
- **Doc**: [features/tabs.md](./features/tabs.md).

### 1.3 Sidebar (REST workbench)
- **Purpose**: workspace navigation over saved work.
- **Surfaces**: three tabs — History / Draft / Collections (default **Draft**); New Request;
  Import; collapse; header search filters active pane.
- **States**: collapsed rail vs expanded (~180–400px); empty states per tab; long-name truncation.
- **Interactions**: click row → opens in tab; collection tree CRUD; history restores snapshots.
- **Doc**: [features/sidebar.md](./features/sidebar.md).
- **Note**: MCP/GraphQL coming-soon hides the sidebar entirely. Retained `McpSidebar` is not
  mounted in the live shell.

### 1.4 Workbenches
- **Purpose**: REST full client; MCP & GraphQL placeholders.
- **States**: browser/E2E always starts REST; coming-soon is in-page (not kind-tabs today).
- **Doc**: [features/workspaces.md](./features/workspaces.md).

---

## 2. REST workspace (core product)

### 2.1 URL bar + method select
- **Purpose**: request address line — the primary input of the app.
- **Surfaces**: method dropdown (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, QUERY), URL input,
  Send button.
- **States**: method-colored accent; invalid URL; `{{variable}}` tokens; unresolved variables.
- **Interactions**: paste `curl …` → auto-import on **current** tab; query ↔ Params sync;
  `⌘Enter` send; `⌘L` focus URL; env autocomplete on `{{`.
- **Doc**: [features/request-builder.md](./features/request-builder.md).

### 2.2 Request editor tabs
- **Purpose**: Params, Headers, Body, Auth (`editor-tab-*`).
- **Params / Headers**: shared **KeyValueEditor**.
- **Body**: none / json / raw / form-data / urlencoded / binary; FindBar; wrap toggle.
- **Auth**: none / basic / bearer / **api-key** (header | query).
- **Doc**: [features/request-builder.md](./features/request-builder.md),
  [features/content-types.md](./features/content-types.md),
  [features/shared-ui.md](./features/shared-ui.md).

### 2.3 Response viewer
- **Purpose**: render the outcome of a send (status, body, headers, SSE).
- **Doc**: [features/response-viewer.md](./features/response-viewer.md).

### 2.4 Collections
- **Purpose**: persistent folder/request tree; save modal; folder header/auth inheritance.
- **Doc**: [features/collections.md](./features/collections.md).

### 2.5 History & drafts
- **Purpose**: auto history (optional response snapshots) + auto-filed drafts.
- **Doc**: [features/history-drafts.md](./features/history-drafts.md).

### 2.6 Environments & variables
- **Purpose**: `{{variable}}` per env + globals; production guardrails.
- **Doc**: [features/environments.md](./features/environments.md),
  [specs/environments-v1.md](./specs/environments-v1.md).

### 2.7 Import / export
- **Purpose**: cURL import (URL bar + modal), **Postman Collection v2.1** import, copy-as-cURL.
- **Surfaces**: centered Import **modal** (mode toggle), header export button.
- **Doc**: [features/import-export.md](./features/import-export.md).

### 2.8 Command palette
- **Purpose**: `⌘K` / `⌘⇧K` / `⌘⇧P` fuzzy launcher across history/drafts/collections.
- **Doc**: [features/command-palette.md](./features/command-palette.md).

### 2.9 Execution
- **Purpose**: send path — strict interpolate, auth inject, Tauri vs browser transport.
- **Doc**: [features/execution.md](./features/execution.md).

---

## 3. MCP workspace

- **UI status**: coming-soon pane (`⌘⇧M` / header).
- **Code**: full bench retained under `features/mcp` (connect, tools, OAuth 2.1 PKCE).
- **Doc**: [features/mcp.md](./features/mcp.md) (target UX clearly labeled).

---

## 4. GraphQL workspace

- **UI status**: coming-soon pane (`⌘⇧G` / header).
- **Still available**: GraphQL-over-HTTP via REST content types.
- **Doc**: [features/graphql.md](./features/graphql.md).

---

## 5. Settings & system surfaces

### 5.1 Settings (`⌘,`)
- Theme, word wrap, redirects/SSL/proxy, save snapshots, retention, clear data, updater.
- **Doc**: [features/settings.md](./features/settings.md).

### 5.2 Keyboard shortcuts (`⌘⇧/`)
- Canonical list: [features/keyboard-shortcuts.md](./features/keyboard-shortcuts.md)
  (matches `AppContent.tsx`).

### 5.3 Toasts
- UpdateToast, MigrationToast — shared toast anatomy.

### 5.4 Theme / tokens
- Dark default + light; CSS variables only. Spec: [`tokens.md`](./tokens.md).
- **Doc**: [features/shared-ui.md](./features/shared-ui.md).

### 5.5 Persistence
- SQLite (desktop) + localStorage (browser) factories.
- **Doc**: [features/persistence.md](./features/persistence.md).

---

## 6. Marketing site (`apps/site`)

Landing + blog at trypigeon.dev (Astro on Cloudflare Workers).

| Section | Component | Notes |
|---------|-----------|-------|
| Header | `Header.tsx` | sticky; brand + download |
| Hero | `HeroSection.tsx` | animated demo (`useHeroDemo`) — keep in sync with app |
| Stats | `StatsBand.tsx` | |
| Features | `FeaturesSection.tsx` | |
| Organize | `OrganizeSection.tsx` | |
| Why / Open source | `WhySection` / `OpenSourceSection` | |
| Download | `DownloadSection.tsx` | GitHub release assets + stub fallback |
| Footer | `Footer.tsx` | install one-liner + CopyButton |
| Blog | `pages/blog/*` | content collections |

**Doc**: [features/marketing-site.md](./features/marketing-site.md).

---

## 7. Cross-cutting design system inventory

Primitives (see also [features/shared-ui.md](./features/shared-ui.md) + [tokens.md](./tokens.md)):

- **Buttons**, **Badges** (method / status / kind), **Tabs**, **Switch**, **Tooltip**
- **Modal** (settings, import, save, shortcuts) — not drawers for these surfaces today
- **KeyValueEditor**, **FindBar**, **HighlightedBody**, **Toast**, **Empty states**
- **Motion**: `pgFade`, `pgSlide`, `pgPop`, `pgToast`; reduced-motion → ~0 ms
- **Type**: mono = Geist Mono; sans for chrome
- **Radius / z-scale**: see tokens

---

## Feature file index

Full table with status + code paths: [`features/README.md`](./features/README.md).
