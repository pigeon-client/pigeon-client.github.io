# Keyboard shortcuts

## Overview

Canonical list of global keyboard chords. **Source of truth:** `AppContent.tsx` keydown handler.
The in-app Shortcuts modal (`⌘⇧/`) must match this list.

Matching uses `e.code` (Shift does not change codes). `⌘` means Meta on macOS / Ctrl elsewhere.

## Problem / job to be done

Keyboard-first users need predictable, Postman-like chords that do not fight editor find bars or
the command palette.

## User stories

- As a developer, I want Send, New Tab, Close Tab, and Jump Tab without the mouse.
- As a developer, I want one shortcuts overlay that matches real behavior.
- As a developer, I want panel `⌘F` find bars to win over sidebar search when those panels own
  focus (panels intercept; global handler focuses header search otherwise).

## Functional requirements

### Requests & tabs

| Chord | Action |
|-------|--------|
| `⌘Enter` | Send (clicks visible `[data-send-btn]`) |
| `⌘T` | New tab |
| `⌘⇧N` | New tab (alternate) |
| `⌘W` | Close active tab (Shift optional) |
| `⌘1`–`⌘9` | Activate tab by index |

### Navigation & search

| Chord | Action |
|-------|--------|
| `⌘K` | Toggle command palette |
| `⌘⇧K` | Toggle command palette |
| `⌘⇧P` | Toggle command palette |
| `⌘F` | Focus header search (`data-header-search`) |
| `⌘L` | Focus visible URL input |
| `⌘S` | Save: update linked collection request in place, else open Save modal |
| `⌘⇧S` | Save As — always open Save to Collection modal |
| `⌘\` | Toggle sidebar collapse (REST workbench only) |
| `⌘⌥1` | Focus sidebar New Request or Expand |
| `⌘⌥2` | Focus visible URL input |

### Workbenches & settings

| Chord | Action |
|-------|--------|
| `⌘⇧R` | REST workbench |
| `⌘⇧M` | MCP coming-soon |
| `⌘⇧G` | GraphQL coming-soon |
| `⌘,` | Open settings (`Comma`; Shift may also be held) |
| `⌘⇧E` | Environments modal |
| `⌘⇧/` | Shortcuts modal |
| `Esc` | Close topmost overlay (palette → shortcuts → env → import → save → settings), else blur |

### Palette behavior

While the command palette is open, other global shortcuts are suppressed except `Esc` (closes
palette). Palette owns arrow/Enter handling on its input.

## Non-functional requirements

- Body editor and response panel intercept `⌘F` for in-panel FindBar when focused.
- Do not bind bare `?` — reserved for typing; help is `⌘⇧/`.

## Acceptance criteria

- [ ] Every row in the Shortcuts modal matches a live binding above.
- [ ] `⌘T` / `⌘W` / `⌘1` work in browser e2e (Control equivalents).
- [ ] Palette open blocks `⌘F` / new-tab chords underneath.
- [ ] `⌘\` does nothing harmful on coming-soon (sidebar already hidden).

## UI

`KeyboardShortcutsModal` — centered modal, grouped sections, `<kbd>` chips.

## UX / interactions

Icon buttons should show the chord in their Tooltip. Prefer documenting the primary chord when
aliases exist (`⌘K` primary; `⌘⇧K` / `⌘⇧P` aliases).

## Keyboard

N/A (this doc *is* the keyboard section).

## States & edge cases

- Save chords no-op when URL empty (no modal).
- Digit jumps no-op when tab index missing.
- Coming-soon: tab/send chords may still hit store/DOM; prefer focusing REST before sending.

## Manual test checklist

- [ ] Walk every chord in the table on macOS (and Ctrl on browser e2e).
- [ ] Open Shortcuts modal; compare 1:1 with this doc.
- [ ] With palette open, confirm other chords do not fire.
- [ ] Focus body FindBar; `⌘F` stays in-panel.

## Automation coverage

- Playwright: `e2e/shortcuts.spec.ts`, `e2e/tabs.spec.ts`.

## Test ids

Shortcuts modal opened via `⌘⇧/`; no dedicated testid required beyond modal content. Related:
`data-header-search`, `url-input`, `sidebar-new-request`, `sidebar-expand`, `data-send-btn`.

## Key files

- `apps/desktop/src/app/AppContent.tsx`
- `apps/desktop/src/features/settings/components/KeyboardShortcutsModal.tsx`
- `apps/desktop/src/app/layout/Header.tsx` (tooltip copy)

## Open risks

- Tooltip / README drift is the usual failure mode — treat this file + `AppContent.tsx` as canonical.
