# App shell

## Overview

Top-level desktop layout: header, optional sidebar, request tab strip, request/response split,
and global overlays (settings, environments, import, save, shortcuts, command palette, toasts).
Orchestrated by `AppContent.tsx` — no business logic beyond wiring feature barrels and keyboard
chords.

## Problem / job to be done

Users need one coherent window chrome that keeps REST editing usable while exposing search,
workspaces, environments, and settings without burying the URL bar.

## User stories

- As a developer, I want header + sidebar + tabs + editor/response always in a predictable layout.
- As a developer, I want to resize the sidebar and the request/response split without breaking
  scroll or focus.
- As a developer, I want Escape to dismiss the topmost overlay, then blur focus.
- As a developer, I want a clear production-env indicator when a production environment is active.

## Functional requirements

1. **Bootstrap** (`App.tsx` → `AppContent`): apply theme, load environments; on REST window kind,
   load history + collections and run silent update check.
2. **Header** always visible: brand, search, env selector, workspace tabs (REST / MCP / GraphQL),
   copy-as-cURL, settings.
3. **REST workbench** shows: sidebar (collapsible), tab strip, URL bar, request editor, response
   panel (vertical resizable split).
4. **Coming-soon workbenches** (MCP / GraphQL): header only + `ComingSoonWorkspace` — no sidebar,
   no tabs, no editor.
5. **Overlays**: Env modal, Import modal, Save-to-collection modal, Settings, Shortcuts modal,
   Command palette, Update toast, Migration toast.
6. **Sidebar width** via `ResizablePanel`: ~180–400px; request/response vertical split with
   double-click reset on the handle where supported.
7. **Production banner**: `env-prod-indicator` when the active environment is marked production.
8. Inactive HTTP tabs stay mounted (`display:none`) so state survives tab switches.
9. Right-click uses a custom menu. Surfaces with their own `ContextMenu` (workspace tabs)
   keep it; everywhere else gets the app fallback (Cut / Copy / Paste / Select All). The
   WKWebView native menu (Look Up, Inspect Element) is suppressed.

## Non-functional requirements

- `app/` imports features; features must never import from `app/`.
- Layout uses `min-w-0` so long URLs scroll inside the URL bar, not the page.
- Keyboard handling is centralized in `AppContent` (see [keyboard-shortcuts.md](./keyboard-shortcuts.md)).

## Acceptance criteria

- [ ] Fresh launch shows REST workbench with sidebar (default Draft tab) and at least one tab.
- [ ] Collapse sidebar → expand control visible; layout stays aligned.
- [ ] Resize sidebar within min/max; no horizontal page overflow.
- [ ] Switch to MCP/GraphQL → coming-soon pane; sidebar and tabs hidden.
- [ ] Escape closes palette / shortcuts / env / import / save / settings in priority order.
- [ ] Production env active → red indicator visible.

## UI

```
┌─────────────────────────────────────────────────────────────┐
│ Header: brand │ search │ env │ REST MCP GQL │ curl │ gear   │
├──────────┬──────────────────────────────────────────────────┤
│ Sidebar  │ Tab strip                                        │
│ (REST)   ├──────────────────────────────────────────────────┤
│          │ URL bar + Send                                   │
│          ├──────────────────────┬───────────────────────────┤
│          │ Request editor       │ Response panel            │
│          │                      │                           │
└──────────┴──────────────────────┴───────────────────────────┘
```

## UX / interactions

- Header search filters the **active sidebar pane** only (`⌘F`); global find is the command palette.
- Copy-as-cURL is disabled when there is no HTTP request or when a coming-soon workbench is active.
- Leaving coming-soon for REST focuses the REST OS window on desktop (`open_workspace_window`).

## Keyboard

See [keyboard-shortcuts.md](./keyboard-shortcuts.md). Shell-specific: `⌘\` toggles sidebar
(REST only); `⌘⌥1` focuses New Request / expand; `⌘⌥2` focuses URL.

## States & edge cases

- Empty URL → `EmptyRequestState` instead of editor/response split.
- Browser / E2E build: `windowKind` is always `rest`; MCP/GQL are in-page coming-soon only.
- Legacy Tauri multi-window labels still exist; UI primarily uses in-app `workbench` state.

## Manual test checklist

- [ ] Launch → REST layout complete.
- [ ] Collapse / expand sidebar; resize to extremes.
- [ ] Resize request/response split; long URL still scrolls in URL bar.
- [ ] Open each overlay; Escape dismisses correctly.
- [ ] Activate production env → indicator; deactivate → gone.
- [ ] MCP / GraphQL header buttons → coming-soon; REST restores full layout.

## Automation coverage

- Playwright: `e2e/smoke.spec.ts`, layout-related specs in `apps/desktop/e2e/`.
- Keyboard / Escape covered across feature specs.

## Test ids

| Id | Surface |
|----|---------|
| `data-header-search` | Header search input |
| `header-open-rest` / `header-open-mcp` / `header-open-graphql` | Workspace tabs |
| `env-prod-indicator` | Production env banner |
| `sidebar-*` | See [sidebar.md](./sidebar.md) |
| `workspace-layout` | Main resizable layout (if present) |
| `app-context-menu` | Fallback right-click menu |

## Key files

- `apps/desktop/src/app/App.tsx`
- `apps/desktop/src/app/AppContent.tsx`
- `apps/desktop/src/app/layout/AppContextMenu.tsx`
- `apps/desktop/src/app/layout/Header.tsx`
- `apps/desktop/src/app/layout/Sidebar.tsx`
- `apps/desktop/src/app/layout/UpdateToast.tsx`
- `apps/desktop/src/app/layout/MigrationToast.tsx`

## Open risks

- Header Settings tooltip and Shortcuts modal must stay aligned with
  [keyboard-shortcuts.md](./keyboard-shortcuts.md) / `AppContent.tsx`.
- Multi-window Tauri path is partially dormant; docs must not assume MCP/GQL OS windows for the
  live UI.
