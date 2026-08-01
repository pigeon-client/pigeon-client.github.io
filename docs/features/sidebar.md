# Sidebar

## Overview

Left navigation shell tying History, Drafts, and Collections together, plus New Request / Import.
Search lives in the **header** (`⌘F`) and filters the active sidebar pane. Implemented in layout
(`Sidebar.tsx`), not a feature module — still a primary UX surface. For a global search across
*all* panes at once, see `⌘⇧K` — [command-palette.md](./command-palette.md).

**Kind-aware since 2026-07-31**: this document covers the REST sidebar specifically. `AppContent.tsx`
swaps the whole sidebar slot based on the active tab's kind — `Sidebar` (this doc) for `"http"`/
`"graphql"` tabs, `McpSidebar` (see [mcp.md](./mcp.md)) for `"mcp"` tabs. In the desktop app each
kind is also its own singleton OS window (`open_workspace_window`), so in practice a REST window's
sidebar is always this one and an MCP window's is always `McpSidebar` — the active-tab check is
what makes it also work correctly in the browser/E2E build, where all kinds share one window.

## Problem / job to be done

Users need one place to create requests, import curl, find past work, and open saved trees —
resizable (or collapsible) beside the workspace without crushing the URL bar.

## User stories

- As a developer, I want New Request and Import always one click away.
- As a developer, I want to switch History / Draft / Collections without losing workspace tabs.
- As a developer, I want search (`⌘F`) to filter the active sidebar pane.
- As a developer, I want to resize or collapse the sidebar and keep the main editor usable.

## Functional requirements

1. Primary actions: New Request, Import cURL.
2. Three content tabs: History | Draft | Collections.
3. Header search (`data-header-search`) filters active pane.
4. Horizontal resize 180–480px; layout uses `min-w-0` so URL bar still shrinks correctly.
5. Collapse / expand controls (`sidebar-collapse` / `sidebar-expand`).
6. Selecting an item loads into a tab (reuse empty or open new).
7. Shared `TreeRow` spacing/depth across draft and collection trees.

## Non-functional requirements

- Folder/hover accents use `var(--primary)`, not `--accent` surface tint.
- Collapse/expand must not leave layout gaps (past tab-visibility bugs).

## Acceptance criteria

- [ ] New Request opens empty tab editor (visible).
- [ ] Import opens modal; Import submit creates new tab.
- [ ] Tab switch History↔Draft↔Collections preserves main workspace.
- [ ] Search filters; clear restores list.
- [ ] Resize sidebar min/max; no horizontal page overflow; long URL still scrolls inside URL bar.
- [ ] Collapse then expand — layout stays aligned; expand control visible when collapsed.
- [ ] Icons readable in Dark and Light themes.

## UI

```
┌──────────────────────────────┐
│ [ + New Request ]      [ ⬆ ]  │
├──────────────────────────────┤
│ History │ Draft │ Collections│
├──────────────────────────────┤
│  …tab content (list/tree)…   │
└──────────────────────────────┘
```

Search field is in the app **header**, not inside the sidebar body.

## UX / interactions

See child feature docs for pane-specific empty states and row actions.
Draft trees use `collections/lib/tree.ts` helpers rendered via `AutoTree`.

## Keyboard

`⌘F` focus header search (when focus is *not* inside the body editor or response panel — those
open their own in-panel find bar) · `⌘⇧N` new request (global) · Import via control (no dedicated
chord).

## States & edge cases

- Each pane empty state documented in history-drafts / collections docs.
- Inactive workspace tabs elsewhere must not steal sidebar testids.

## Manual test checklist

- [ ] New Request; Import flow.
- [ ] Switch three sidebar tabs; open items from each.
- [ ] Search across history and drafts.
- [ ] Drag resize to 180px and 480px; URL bar long-string still OK.
- [ ] Collapse sidebar → expand; layout aligned.
- [ ] Light + Dark icon contrast check.

## Automation coverage

- Playwright: `e2e/smoke.spec.ts` plus feature specs using sidebar testids; `e2e/sidebar-search.spec.ts`
  — `⌘F` filters both History (flat list) and Draft (auto-tree, filtered leaf count) by name/URL
  (2026-07-26 QA pass).
- Not driven in the 2026-07-26 QA pass: sidebar drag-resize to 180/480px bounds, light/dark icon
  contrast (visual-only, no automated check planned).

## Test ids

`sidebar-new-request`, `sidebar-import`, `sidebar-tab-history|draft|collections`,
`sidebar-collapse`, `sidebar-expand`. Header search: `data-header-search` (attribute).

## Key files

`src/app/layout/Sidebar.tsx`, `Header.tsx`, `AppContent.tsx` (resize + shortcuts).
Tree helpers: `src/features/collections/lib/tree.ts`.

## Open risks

- Resize + long URL + many tabs is a compound layout risk (mandatory with request-builder QA).
