# Sidebar

## Overview

Left navigation shell tying History, Drafts, and Collections together, plus New Request / Import.
Search lives in the **header** (`⌘F`) and filters the active sidebar pane. Implemented in layout
(`Sidebar.tsx`), not a feature module — still a primary UX surface. For a global search across
*all* panes at once, see `⌘⇧K` — [command-palette.md](./command-palette.md).

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
│ [ + New Request ]      [ ⬆ ]  │   ← create + import cURL
├──────────────────────────────┤
│ History │ Draft │ Collections│   ← 3-way tab switch
├──────────────────────────────┤
│  …tab content (list/tree)…   │
└──────────────────────────────┘
```

- **New Request** (primary) opens a fresh tab; **Import** (outline) opens the cURL import modal.
- **Three tabs** switch the content pane between History, Draft, and Collections.
- A search box in the header (`⌘F`) filters the active pane.
- The sidebar is horizontally **resizable** (drag handle between it and the main panel; 180–480px).

## UX / interactions

See child feature docs for pane-specific empty states and row actions.
Draft trees use `collections/lib/tree.ts` helpers rendered via `AutoTree`.

## Keyboard

`⌘F` focus header search (when focus is *not* inside the body editor or response panel — those
open their own in-panel find bar) · `⌘⇧N` new request (global) · Import via control (no dedicated
chord).

## States & edge cases

- Each pane has its own empty state (see the History/Drafts and Collections docs).
- Tab content and trees respect the header search filter.

## Test ids

`sidebar-new-request`, `sidebar-import`, `sidebar-tab-history|draft|collections`. Header search is
`data-header-search` (attribute).

## Key files

`src/app/layout/Sidebar.tsx`, `src/app/layout/Header.tsx`, `src/app/AppContent.tsx` (resize +
shortcut wiring).
