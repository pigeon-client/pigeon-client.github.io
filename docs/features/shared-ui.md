# Shared UI

## Overview

Reusable UI used by two or more features:

- **Package primitives** — `@pigeon/ui` (`packages/ui`): design tokens + interactive
  primitives (Button, Input, Select, Textarea, Label, Modal, Tabs, Switch, Menu, …).
- **Desktop composites** — `apps/desktop/src/shared/ui`: domain-aware editors that
  compose package primitives (KeyValueEditor, FindBar, highlight layers). Auth lives in
  `VarAuthEditor` (`@/features/environments`).

## Problem / job to be done

REST, MCP (retained), environments, and settings must share one interaction language — same
key/value editor, modal focus rules, find bar, and highlighted body — without copying markup.

## User stories

- As a developer, I want params/headers/env vars to edit the same way.
- As a developer, I want modals to trap focus and not close on Space inside inputs.
- As a developer, I want syntax-highlighted JSON in REST responses (and future MCP results)
  from one highlighter.
- As a developer, I want new screens to import form controls from `@pigeon/ui` instead of
  hand-rolling `className` strings.

## Functional requirements

### Package (`@pigeon/ui`)

| Component | Role |
|-----------|------|
| `Button` | Primary actions — variants `default` / `outline` / `ghost` / `primary` / danger\* |
| `Input` / `Textarea` / `Select` | Form controls — sizes `sm` / `md` / `lg`, mono by default |
| `Label` | Field / helper / error label styles |
| `Modal` / `ModalHeader` / `ModalFooter` / `ConfirmModal` | Centered dialog + right drawer |
| `Tabs` / `TabButton` | Radix tabs + standalone tab buttons (sidebar / underline) |
| `Menu` / `MenuItem` | Dropdown / suggestion panel surface |
| `ContextMenu` | Right-click menu (Base UI, no enter/exit motion) |
| `EmptyState` | Empty pane illustration + copy |
| `Alert` / `Card` / `Separator` / `Kbd` | Feedback, surfaces, dividers, shortcuts |
| `Switch` / `Tooltip` / badges / `Resizable*` | Existing chrome primitives |
| tokens | `@pigeon/ui/tokens.css` — see [tokens.md](../tokens.md) |

### Desktop composites (`src/shared/ui`)

| Component | Role |
|-----------|------|
| `KeyValueEditor` | Enable + key + value + delete rows; auto-append empty row; optional env autocomplete |
| `VarAuthEditor` | Auth modes: `none` / `bearer` / `basic` / `api-key` (header or query) — uses `Select`/`VarTextField` |
| `FindBar` | In-panel find (body editor, response) — uses `Button` |
| `HighlightedBody` / `HighlightedHtml` | hljs-themed code / HTML highlight |
| `TreeRow` | Shared tree row spacing/depth for drafts & collections |

Thin re-exports are gone — always import primitives from `@pigeon/ui`.

### Rules

1. Something used by only one feature stays in that feature — not in `shared/`.
2. `KeyValueEditor` stays in desktop (depends on environments autocomplete), not in the pure UI
   package.
3. Colors via tokens — no hardcoded hex in feature CSS.
4. New form chrome must use `@pigeon/ui` primitives (`Input`, `Select`, `Textarea`, `Button`,
   `Modal`, `Menu`, `cn`) rather than duplicating border/bg/focus class strings or importing
   `@radix-ui` / `@/components/ui`.

## Non-functional requirements

- Prefer package primitives for look-and-feel; keep domain-aware composites in desktop.
- Reduced-motion: honor motion token collapses.

## Acceptance criteria

- [ ] Params, Headers, Env vars share KeyValueEditor behaviors (enable, delete, autocomplete).
- [ ] Auth api-key can target header or query.
- [ ] Modal Space in input does not dismiss.
- [ ] FindBar next/prev wraps; Esc closes.
- [ ] Dark + Light: tokens and hljs palettes readable.
- [ ] Forms in settings / collections / env / MCP / import use package `Input`/`Select`/`Textarea`.

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

- Vitest around pure helpers (`contentType`, url, etc.) plus `shared/ui/ui-primitives.test.tsx`
  for package primitive smoke coverage.
- Playwright exercises KeyValueEditor via request-builder / environments specs.

## Test ids

Examples: `param-key-0`, `param-value-0`, `body-find-*`, `response-find-*`. Auth controls by
label/role in e2e.

## Key files

- `packages/ui/**`
- `apps/desktop/src/shared/ui/**`
- `apps/desktop/src/shared/lib/**`
- [tokens.md](../tokens.md)

## Open risks

- Marketing site keeps a permanently-dark bespoke palette (`apps/site/src/styles/tokens.css`) —
  intentional; do not force desktop light/dark tokens onto the landing page.
- Feature empty heroes (`EmptyRequestState`, `EmptyResponse`) stay feature-local — they are
  branded canvases, not generic empty panes.
