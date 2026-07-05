# Sidebar

The left navigation shell that ties history, drafts, and collections together, plus the primary
create/import actions. Lives in `src/app/layout/Sidebar.tsx` (layout, not a feature module), but is
the main entry point into several features.

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

- Selecting an item (history entry / draft / saved request) loads it into a tab — reusing the
  current empty tab if there is one, else opening a new tab.
- Folder icons and hover-accents use `var(--primary)` (theme accent), not `--accent` (which is a
  subtle surface tint) — so icons read correctly in both themes.
- Row spacing/depth is shared via one `TreeRow` component across draft and collection trees so
  indentation stays consistent.

## States & edge cases

- Each pane has its own empty state (see the History/Drafts and Collections docs).
- Tab content and trees respect the header search filter.

## Test ids

`sidebar-new-request`, `sidebar-import`, `sidebar-tab-history|draft|collections`. Header search is
`data-header-search` (attribute).

## Key files

`src/app/layout/Sidebar.tsx`, `src/app/layout/Header.tsx`, `src/app/AppContent.tsx` (resize +
shortcut wiring).
