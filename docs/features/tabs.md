# Tabs

## Overview

Horizontal request tab strip for the REST workbench. Each tab is an in-flight (or idle) HTTP
request with auto-naming from the URL path, optional rename lock, drag-and-drop reorder, and a
right-click context menu.

## Problem / job to be done

Users juggle many requests at once. Tabs must name themselves, stay cheap to open/close, and never
lose editor state when switching.

## User stories

- As a developer, I want a new tab instantly (`⌘T` / `⌘⇧N`).
- As a developer, I want the tab label to follow the URL path until I rename it.
- As a developer, I want to duplicate, close, close others, or close all from a context menu.
- As a developer, I want drag reorder and `⌘1–9` jump.

## Functional requirements

1. Tab list from `useTabStore` (`features/rest/request-builder/store.ts`).
2. **Auto-name** from URL path; manual rename sets name-lock so later URL edits do not overwrite.
3. Double-click label → inline rename (Enter/blur save, Esc cancel).
4. Close × on tab; last tab closes → store creates a replacement empty tab as needed.
5. Context menu: New Request / Duplicate / Close / Close Others / Close All; Esc closes menu and
   restores focus.
6. Drag reorder via `@dnd-kit` horizontal sortable list.
7. Persist open tabs for REST window: `localStorage` key `pg_open_tabs:rest`.
8. Only `kind === "http"` tabs participate in the live REST strip today.

## Non-functional requirements

- Inactive tabs stay mounted (`display:none`) so request/response state survives.
- Rename input metrics must match tab label (no layout jump).

## Acceptance criteria

- [ ] `⌘T` and `⌘⇧N` create a new tab and focus it.
- [ ] `⌘W` closes the active tab.
- [ ] `⌘1–9` activates tab N when present.
- [ ] Rename locks name; further URL edits do not change label.
- [ ] Context menu Close Others leaves one tab; Close All leaves a fresh empty tab.
- [ ] Drag reorder persists across reload (with open-tabs persistence).

## UI

Method-colored label + name; close affordance; overflow scrolls horizontally. No MCP/GQL kind
badges in the live strip (those kinds are not opened by the current shell).

## UX / interactions

- Clicking a tab sets `activeTabId`.
- Dirty/unsaved cues follow store dirty tracking where implemented.
- Empty workspace falls back to a new-tab path via the store.

## Keyboard

| Chord | Action |
|-------|--------|
| `⌘T` or `⌘⇧N` | New tab |
| `⌘W` (Shift optional) | Close active tab |
| `⌘1`–`⌘9` | Jump to tab by index |
| Esc | Close context menu |

Canonical list: [keyboard-shortcuts.md](./keyboard-shortcuts.md).

## States & edge cases

- Closing the only tab must not leave a blank shell without a tab.
- Context menu near window edges should stay on-screen.
- Browser vs desktop: same store; persistence key scoped by window kind.

## Manual test checklist

- [ ] Create 5+ tabs; jump with `⌘3`.
- [ ] Rename; change URL; confirm lock.
- [ ] Clear rename / unlock behavior if exposed.
- [ ] Right-click Close Others / Close All.
- [ ] Drag reorder; reload; order restored.
- [ ] Esc closes context menu without closing the tab.

## Automation coverage

- Vitest: `request-builder/store.test.ts` (tabs, name-lock).
- Playwright: `e2e/tabs.spec.ts` (Postman-style `Control+T/1/W`).

## Test ids

Tab strip items use stable selectors where present (prefer role/label in e2e helpers). Store-driven
UI; inactive tab panels use `:visible` for shared editor testids.

## Key files

- `apps/desktop/src/features/rest/request-builder/components/TabStrip.tsx`
- `apps/desktop/src/features/rest/request-builder/store.ts`
- `apps/desktop/src/app/AppContent.tsx` (global chords)

## Open risks

- Shortcuts modal historically listed `⌘⇧W` / `⌘⇧1–9` — code uses `⌘W` / `⌘1–9`. Keep modal and
  docs in sync with `AppContent.tsx`.
