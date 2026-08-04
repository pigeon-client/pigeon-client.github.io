# Pigeon — Feature Design Inventory

In-depth list of every feature/screen for design work (Figma / Claude Code design sessions).
Each entry: purpose, UI surfaces, states, key interactions, and design notes.
Companion doc: [restructure-plan.md](./restructure-plan.md) covers the code architecture;
`docs/features/*.md` hold the detailed per-feature UX reference and `data-testid` hooks.

Two products share one brand: the **desktop app** (Tauri, dark theme default + light theme)
and the **marketing site** (React SPA on GitHub Pages).

---

## 1. Desktop app — application shell

### 1.1 Header bar
- **Purpose**: global navigation + app identity.
- **Surfaces**: brand mark (theme-aware `.pg-logo`), workspace switch buttons (REST / MCP /
  GraphQL — each opens a singleton OS window in the desktop build), global search field
  (plain `Cmd+F` outside editor/response focuses it), settings + shortcuts entry points,
  icon-only cURL export button.
- **States**: active workspace highlighted; search focused/blurred; per-kind window focused.
- **Interactions**: `Cmd+Shift+R / M / G` switch workspaces; `Cmd+Shift+,` settings;
  `Cmd+Shift+/` shortcuts overlay.
- **Design notes**: header tabs recently polished (see commit history); keep hit targets ≥ 28 px;
  icon-only buttons need the shared Tooltip (label + shortcut).

### 1.2 Tab strip (request tabs)
- **Purpose**: multiple in-flight requests per window.
- **Surfaces**: horizontal tab list; each tab shows method-colored label + name; kind badge
  (`MCP` / `GQL`) on non-http tabs; close ×; overflow scrolling.
- **States**: active/inactive (inactive stay mounted, `display:none`); dirty/unsaved; renamed
  (name-lock) vs auto-named (derived from URL path); empty state → new-tab fallback per window kind.
- **Interactions**: double-click label → inline rename (Enter/blur save, Esc cancel);
  right-click menu (New / Duplicate / Close / Close Others / Close All); `Cmd+Shift+N` new,
  `Cmd+Shift+W` close, `Cmd+Shift+1–9` jump.
- **Design notes**: rename input must match tab metrics exactly (no layout jump); the context
  menu closes on Escape and restores app input (e2e-covered).

### 1.3 Sidebar (REST/GraphQL windows)
- **Purpose**: workspace navigation over saved work.
- **Surfaces**: three tabs — **Collections**, **History**, **Drafts** (`sidebar-tab-*` testids);
  search/filter field (`Cmd+F` scoped); collapse/expand control; per-row method badge + name +
  URL; row hover actions (rename, delete, folder ops).
- **States**: collapsed rail vs expanded; empty states per tab; long-name/URL truncation with
  scroll (explicit QA target); drag-over states for tree reorder.
- **Interactions**: click row → opens in tab; collection tree: create folder, nest to
  `MAX_NESTING_DEPTH`, move/reorder; history rows group by time.
- **Design notes**: currently one 1166-line component — will be decomposed into
  CollectionsSection / HistorySection / DraftsSection during restructure; testids must not change.

### 1.4 MCP sidebar
- **Purpose**: server list + connection management for the MCP workspace.
- **Surfaces**: server entries with connect state, add-server flow, tool count badge.
- **States**: disconnected / connecting / connected / auth-required / error.
- **Design notes**: sidebar swaps per the *active tab's* kind, not the window's.

### 1.5 Workspace windows
- **Purpose**: REST, MCP, GraphQL each in a separate singleton OS window (desktop build only).
- **States**: browser/E2E build falls back to single-page mixed-kind tabs.
- **Design notes**: each window is its own webview + JS heap; window chrome follows OS.

---

## 2. REST workspace (core product)

### 2.1 URL bar + method select
- **Purpose**: request address line — the primary input of the app.
- **Surfaces**: method dropdown (`method-trigger`, options `method-option-<METHOD>`; GET, POST,
  PUT, PATCH, DELETE, HEAD, OPTIONS, QUERY), URL input (`url-input`), Send button.
- **States**: method-colored accent per selection; invalid URL; `{{variable}}` tokens highlighted
  (theme-aware `--var-token` tint); unresolved variables error; long-URL horizontal scroll.
- **Interactions**: paste `curl ...` → full auto-import (method, headers, auth, params, body);
  typed query string syncs both ways with the Params editor; `Cmd+Enter` sends; environment
  variable autocomplete popup while typing `{{`.
- **Design notes**: GET/HEAD never send a body (RFC 9110); QUERY is RFC 10008. Autocomplete
  (VarSuggestions) is shared with headers/body editors — one popup design everywhere.

### 2.2 Request editor tabs
- **Purpose**: everything below the URL bar; `editor-tab-*` (Params, Headers, Body, Auth).
- **Params / Headers**: shared **KeyValueEditor** — rows of enable-checkbox + key + value +
  delete, auto-append empty row, `param-key-<n>` testids, variable autocomplete in values,
  bulk-edit affordance.
- **Body**: type picker driven by the content-type catalog (JSON, form-data, x-www-form-urlencoded,
  raw text/XML/etc., binary file); JSON gets syntax highlight + in-editor `Cmd+F` FindBar;
  form-data rows support file attachment (live `File` stripped on save — persist name/meta only);
  word-wrap toggle (persisted `pg_word_wrap`).
- **Auth**: none / basic / bearer (token input) — feeds generated headers.
- **States**: disabled body for GET/HEAD; per-type empty states; validation errors inline.
- **Design notes**: editors keep Space-in-input from closing modals; body editor intercepts
  `Cmd+F` for its own FindBar.

### 2.3 Response viewer
- **Purpose**: render the outcome of a send.
- **Surfaces**: status line (`response-status`: code color-coded by `--status-2xx/3xx/4xx/5xx`,
  time, size), view tabs (pretty / raw / preview for HTML / headers), body panel
  (`response-body`, hljs-highlighted, virtual scroll for large payloads), copy button,
  word-wrap toggle, in-panel `Cmd+F` FindBar, empty state (`response-empty`), resizable split
  (double-click resets).
- **SSE streams**: live event list appended as events arrive; cancel-stream control.
- **States**: empty (never sent), loading/in-flight (cancelable), success, HTTP error,
  network/CORS error, canceled, streaming.
- **Design notes**: 1201-line component being decomposed (BodyView / HeadersTable / SseEventList /
  StatusLine); the highlighted-body block becomes a shared component also used by MCP results —
  design once, use twice.

### 2.4 Collections (save & organize)
- **Purpose**: persistent folder/request tree.
- **Surfaces**: sidebar Collections tab (tree with folders → nested requests);
  **SaveToCollectionModal** (`Cmd+Shift+S`): pick collection + nested folder/root destination,
  name input; create/rename/delete modals for collections and folders.
- **States**: empty (no collections), deep nesting (`MAX_NESTING_DEPTH` cap), name conflicts.
- **Interactions**: save active request (needs URL); tree CRUD + move/reorder.
- **Design notes**: create-collection modal renders without animation (intentional); modals
  close on backdrop key events only when backdrop focused.

### 2.5 History & drafts
- **Purpose**: automatic record of sent requests (with response snapshots) + unsaved tab drafts.
- **Surfaces**: sidebar History/Drafts tabs; rows with method badge, URL, relative time; snapshot
  reopen → restores request + response.
- **States**: retention-pruned list; localStorage quota-guard (browser build strips oldest
  snapshots); empty states.
- **Design notes**: reopening a history entry restores both the request and the stored response
  snapshot — visually identical to a fresh send.

### 2.6 Environments & variables
- **Purpose**: `{{variable}}` values per environment + globals.
- **Surfaces**: environments modal (`Cmd+Shift+E`): env list, per-env KeyValueEditor, globals
  section, active-env selector; VarSuggestions autocomplete popup (URL bar, key-value editors,
  body editor); highlighted `{{tokens}}` inline.
- **States**: no environments; active vs inactive env; unresolved variable → blocking error
  before send (single shared error design).
- **Design notes**: persists to localStorage in both builds (only feature that does);
  autocomplete popup is one shared design across all editors.

### 2.7 Import / export cURL
- **Purpose**: interop with the terminal.
- **Surfaces**: right-side slide-in drawer panels (import: paste area + parse preview;
  export: generated cURL with copy); icon-only header export button; plus silent URL-bar paste
  import.
- **States**: parse success/failure; unsupported flags fallback.
- **Design notes**: drawers share the slide-in pattern (`--shadow-drawer`, `pgSlideRight`).

### 2.8 Command palette
- **Purpose**: `Cmd+Shift+K` fuzzy launcher.
- **Surfaces**: centered overlay, search input, grouped results (tabs, collections, history,
  actions), keyboard navigation highlight.
- **States**: empty query (recent/suggested), no results.
- **Design notes**: overlays use `--z-modal`; match Modal scrim (`--scrim`).

---

## 3. MCP workspace

### 3.1 Connection bench
- **Purpose**: connect to MCP servers (HTTP transport), inspect + call tools.
- **Surfaces**: server URL input, headers editor (moving from raw textarea to shared
  KeyValueEditor), connect/disconnect, tool list with schemas, tool-call form (args from JSON
  schema — flat string maps get key-value rows; nested schemas get a SchemaArgsForm), result
  panel (hljs-highlighted JSON via the shared highlighted-body component), `{{variable}}`
  interpolation support.
- **States**: idle / connecting / connected / tool-running / result / JSON-RPC error /
  unresolved-variables error / auth-required.
- **Design notes**: result panel should visually match the REST response viewer (same component
  after restructure); `MCP` kind badge in tab strip; full-pane layout, no URL bar.

### 3.2 MCP OAuth 2.1
- **Purpose**: authorize protected servers (PKCE flow).
- **Surfaces**: auth-required prompt in the bench, browser-redirect flow, token status +
  clear-auth control; persisted per-server (`mcp_oauth` table).
- **States**: unauthorized / authorizing (waiting on browser) / authorized / expired / error.
- **Design notes**: flow leaves the app and comes back — needs clear "waiting for browser"
  state with cancel.

---

## 4. GraphQL workspace
- **Purpose**: placeholder ("coming soon") pane; full-pane, no URL bar, `GQL` tab badge.
- **Design opportunity**: future — query editor + variables pane + schema explorer + response
  viewer sharing REST's response design. Design the empty/coming-soon state now, the workspace
  later.

---

## 5. Settings & system surfaces

### 5.1 Settings drawer (`Cmd+Shift+,`)
- **Surfaces**: theme toggle (dark / light), request options (follow redirects, SSL verify,
  proxy URL), word-wrap default, history retention, update section ("Check Update" CTA +
  install flow with version info), about/version.
- **States**: update available / downloading / ready-to-restart / up-to-date / check failed.

### 5.2 Toasts & overlays
- **UpdateToast**: silent startup check found an update → dismissible prompt.
- **MigrationToast**: one-shot "migrated vX→vY" note after schema migration.
- **Shortcuts overlay** (`Cmd+Shift+/`): grouped keyboard-shortcut reference.
- **Design notes**: toasts share `--shadow-toast` + `pgToast` motion; keep one toast anatomy.

### 5.3 Theme system
- Dark (default) + light; all colors are CSS custom properties (never hardcoded hex);
  hljs syntax palette per theme; method/status accent ramps differ per theme for contrast.
- **Design rule**: any new screen must be checked in both themes; tokens live in
  `src/styles/index.css` (moving to `@pigeon/ui/tokens.css`), spec in `TOKENS.md`.

### 5.4 Keyboard shortcut scheme
- All app-global chords are `Cmd+Shift+<key>`; exceptions: `Cmd+Enter` send, contextual `Cmd+F`.
- **Design rule**: every icon button shows its chord in the Tooltip; the shortcuts overlay is
  the canonical listing.

---

## 6. Marketing site (`apps/site`)

Single-page landing at pigeon-client.github.io. Sections top to bottom:

| Section | Content | Design notes |
|---|---|---|
| Header/nav | mark + name, GitHub link, download CTA | sticky; matches app brand |
| Hero | headline + animated hero demo (`useHeroDemo` steps through a fake request/response) | the demo mimics the real app UI — must stay in sync with app design changes |
| StatsBand | download/star counts | |
| Features | feature cards (REST client, tabs, collections, envs…) | screenshots/mock frames of the app |
| MCP section | MCP bench pitch + `mcp-screenshot.png` | refresh screenshot after app redesigns |
| Organize | collections/history visual | |
| Why / OpenSource | positioning + license | |
| Download | per-platform buttons generated from latest GitHub release assets (`parseRelease`) | must handle empty-assets fallback (stub release.json) |
| Footer | links, install one-liner with CopyButton | install command comes from `scripts/install.sh` |

- **States**: release assets present vs stub fallback (buttons hide/disable); scroll-reveal
  animations (`useScrollReveal`, `useInViewPlay`); mobile 360 / tablet 768 / desktop 1440.
- **Design notes**: site currently re-declares brand tokens by hand in a 3700-line `App.css`;
  after restructure it consumes `@pigeon/ui/tokens.css` — design against the shared tokens, and
  keep the site's look pixel-stable through the migration.

---

## 7. Cross-cutting design system inventory

Primitives to design as a system (current + planned shared package):

- **Buttons**: default / outline / ghost / ghost-icon / primary (glow shadow) / danger-ghost /
  danger-filled; sizes icon (28 px) / xs / sm.
- **Badges**: MethodBadge (8 method colors), CountBadge, kind badges (MCP/GQL), status codes.
- **Tabs**: sidebar variant (pill on muted) + underline variant.
- **Switch**: Radix-based toggle.
- **Tooltip**: hover/focus, 350 ms delay, label + shortcut.
- **Modal**: centered, scrim, focus handling; variants with/without animation.
- **Drawer**: right slide-in (settings, import/export).
- **KeyValueEditor**: the workhorse table (params, headers, env vars, MCP headers).
- **FindBar**: in-panel search (body editor, response panel).
- **HighlightedBody / result viewer**: hljs-themed code block with copy + wrap.
- **Toast**: bottom overlay, one anatomy for update/migration/etc.
- **Empty states**: per-surface illustration + copy (uses brand mark).
- **Motion**: `pgFade`, `pgSlide`, `pgPop`, `pgSlideRight`, `pgToast`; reduced-motion collapses
  all to ~0 ms.
- **Type scale**: 10 px (2xs) / 12 / 13 (code) / 14 base / mono = Geist Mono, sans = Inter.
- **Radius**: 4 / 6 (default) / 8 / 12 px. **Z-scale**: raised 1 → toast 60.
