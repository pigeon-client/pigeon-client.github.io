# Sidebar

## Overview

Left navigation for the **REST** workbench: New Request, Import, and three panes — History,
Draft, Collections. Search lives in the **header** (`⌘F`) and filters the active sidebar pane.
Implemented in layout (`Sidebar.tsx`), not a feature module — still a primary UX surface.

For global search across all panes at once, see `⌘K` — [command-palette.md](./command-palette.md).

MCP / GraphQL workbenches do **not** show this sidebar (coming-soon panes hide it). Retained
`McpSidebar` exists under `features/mcp` for later enablement — see [mcp.md](./mcp.md) and
[workspaces.md](./workspaces.md).

## Problem / job to be done

Users need one place to create requests, import curl/Postman, find past work, and open saved
trees — resizable or collapsible beside the workspace without crushing the URL bar.

## User stories

- As a developer, I want New Request and Import always one click away.
- As a developer, I want to switch History / Draft / Collections without losing workspace tabs.
- As a developer, I want search (`⌘F`) to filter the active sidebar pane.
- As a developer, I want to resize or collapse the sidebar and keep the main editor usable.

## Functional requirements

1. Primary actions: New Request, Import (opens Import modal — cURL + Postman modes).
2. Three content tabs: History | Draft | Collections. **Default tab: Draft**.
3. Header search (`data-header-search`) filters the active pane.
4. Horizontal resize ~180–400px; layout uses `min-w-0` so the URL bar still shrinks correctly.
5. Collapse / expand controls (`sidebar-collapse` / `sidebar-expand`); `⌘\` toggles collapse.
6. Selecting an item loads into a tab (reuse empty or open new). History rows restore response
   snapshots when present.
7. Shared `TreeRow` spacing/depth across draft and collection trees.
8. Footer counts for the active domain where shown.

## Non-functional requirements

- Folder/hover accents use `var(--primary)`, not `--accent` surface tint.
- Collapse/expand must not leave layout gaps.

## Acceptance criteria

- [ ] New Request opens empty tab editor (visible).
- [ ] Import opens modal; cURL submit creates new tab; Postman submit creates collection.
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
Draft trees use `collections/lib/tree.ts` helpers rendered via draft components.

## Keyboard

| Chord | Action |
|-------|--------|
| `⌘F` | Focus header search (when body/response FindBar does not intercept) |
| `⌘T` / `⌘⇧N` | New request tab (global) |
| `⌘\` | Collapse / expand sidebar |
| `⌘⌥1` | Focus New Request or Expand control |

Import has no dedicated chord.

## States & edge cases

- Each pane empty state documented in [history-drafts.md](./history-drafts.md) /
  [collections.md](./collections.md).
- Inactive workspace tabs elsewhere must not steal sidebar testids.
- Coming-soon workbenches: sidebar unmounted.

## Manual test checklist

- [ ] New Request; Import cURL + Postman flows.
- [ ] Switch three sidebar tabs; open items from each.
- [ ] Search across history and drafts.
- [ ] Drag resize to ~180px and ~400px; URL bar long-string still OK.
- [ ] Collapse sidebar → expand; layout aligned.
- [ ] Light + Dark icon contrast check.

## Automation coverage

- Playwright: `e2e/smoke.spec.ts`, `e2e/sidebar-search.spec.ts` — `⌘F` filters History and Draft.
- Visual-only (no automated check planned): light/dark icon contrast, exact resize pixels.

## Test ids

`sidebar-new-request`, `sidebar-import`, `sidebar-tab-history`, `sidebar-tab-draft`,
`sidebar-tab-collections`, `sidebar-collapse`, `sidebar-expand`.

## Key files

`apps/desktop/src/app/layout/Sidebar.tsx` plus
`features/rest/history/components/{HistoryTab,DraftTab}.tsx`,
`features/rest/collections/components/CollectionsTab.tsx`.

## Open risks

- Sidebar is still a large layout component — decompose carefully without changing testids.
