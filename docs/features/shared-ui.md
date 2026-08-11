# Shared UI

## Overview

Reusable UI used by two or more features: desktop composites under `apps/desktop/src/shared/ui`
and package primitives under `packages/ui` (buttons, tooltips, tabs, switch, badges, tokens).

## Problem / job to be done

REST, MCP (retained), environments, and settings must share one interaction language — same
key/value editor, modal focus rules, find bar, and highlighted body — without copying markup.

## User stories

- As a developer, I want params/headers/env vars to edit the same way.
- As a developer, I want modals to trap focus and not close on Space inside inputs.
- As a developer, I want syntax-highlighted JSON in REST responses (and future MCP results)
  from one highlighter.

## Functional requirements

### Desktop composites (`src/shared/ui`)

| Component | Role |
|-----------|------|
| `KeyValueEditor` | Enable + key + value + delete rows; auto-append empty row; optional env autocomplete |
| `AuthEditor` | Auth modes: `none` / `bearer` / `basic` / `api-key` (header or query) |
| `Modal` / `ConfirmModal` | Centered dialog + scrim; confirm destructive actions |
| `FindBar` | In-panel find (body editor, response) |
| `HighlightedBody` / `HighlightedHtml` | hljs-themed code / HTML highlight |
| `TreeRow` | Shared tree row spacing/depth for drafts & collections |
| `EmptyState` | Empty pane illustration + copy |
| `tabs-shim` | Local tabs helper where package tabs are insufficient |

### Package (`@pigeon/ui`)

- Buttons, Tooltip, Tabs, Switch, MethodBadge / status colors, Resizable panels
- Design tokens: `@pigeon/ui/tokens.css` (see [tokens.md](../tokens.md))

### Rules

1. Something used by only one feature stays in that feature — not in `shared/`.
2. `KeyValueEditor` stays in desktop (depends on environments autocomplete), not in the pure UI
   package.
3. Colors via tokens — no hardcoded hex in feature CSS.

## Non-functional requirements

- Prefer package primitives for look-and-feel; keep domain-aware composites in desktop.
- Reduced-motion: honor motion token collapses.

## Acceptance criteria

- [ ] Params, Headers, Env vars share KeyValueEditor behaviors (enable, delete, autocomplete).
- [ ] Auth api-key can target header or query.
- [ ] Modal Space in input does not dismiss.
- [ ] FindBar next/prev wraps; Esc closes.
- [ ] Dark + Light: tokens and hljs palettes readable.

## UI

Follow existing app density: 28px icon targets, Geist Mono for code, Inter/sans for chrome.
Drawers vs modals: settings/import/save use **Modal** (centered), not slide-in drawers.

## UX / interactions

Tooltips: ~350ms delay; include shortcut when the action has one.

## Keyboard

FindBar: `⌘F` (when panel focused), Enter / Shift+Enter, Esc. Details in request-builder and
response-viewer docs.

## States & edge cases

- Long values: horizontal scroll + overlay sync for highlight layers.
- Many rows: vertical scroll without page overflow.

## Manual test checklist

- [ ] Add 30 header rows; scroll; enable/disable; delete.
- [ ] Auth bearer / basic / api-key header / api-key query.
- [ ] Open modal; type Space in a field; modal stays open.
- [ ] Theme switch; badges and buttons still contrast.

## Automation coverage

- Vitest around pure helpers (`contentType`, url, etc.).
- Playwright exercises KeyValueEditor via request-builder / environments specs.

## Test ids

Examples: `param-key-0`, `param-value-0`, `body-find-*`, `response-find-*`. Auth controls by
label/role in e2e.

## Key files

- `apps/desktop/src/shared/ui/**`
- `apps/desktop/src/shared/lib/**`
- `packages/ui/**`
- [tokens.md](../tokens.md)

## Open risks

- Duplicating tokens in `apps/site` historically caused drift — site should track shared tokens
  where practical.
