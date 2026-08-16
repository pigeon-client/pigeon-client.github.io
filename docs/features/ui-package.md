# @pigeon/ui — package primitives

Lightweight API notes for the shared design-system package. Spec for tokens:
[docs/tokens.md](../../../docs/tokens.md). Feature usage rules:
[docs/features/shared-ui.md](../../../docs/features/shared-ui.md).

## Import

```tsx
import {
  Alert,
  Button,
  Card,
  ConfirmModal,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  EmptyState,
  Input,
  Kbd,
  Label,
  Menu,
  Modal,
  ModalFooter,
  ModalHeader,
  Select,
  Separator,
  Switch,
  TabButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  cn,
} from "@pigeon/ui";
```

Apps and desktop `shared/` import **only** this barrel. Do not import `@radix-ui/*`,
`@base-ui/*`, `@/components/ui/*`, or `packages/ui/src/**`. New shadcn/Radix/Base UI
primitives are added inside `packages/ui` (`packages/ui/components.json`), then
re-exported from `index.ts`.

Tokens CSS (once per app):

```css
@import "@pigeon/ui/tokens.css";
@source "../../../../packages/ui/src"; /* Tailwind 4 — scan package classes */
```

## Core forms

| Component | Variants / sizes | Notes |
|-----------|------------------|-------|
| `Button` | `default` `outline` `ghost` `ghost-icon` `primary` `danger-ghost` `danger-filled` · `icon` `xs` `sm` `md` `lg` | Default size `md` (h-8). `sm` aliases `md` for legacy callers. |
| `Input` | `sm` `md` `lg` · `mono` | Focus uses ring tokens (not `border-primary`). |
| `Textarea` | `sm` `md` `lg` | Mono body editor chrome. |
| `Select` | `sm` `md` `lg` · `mono` | Native `<select>` with chevron. |
| `Label` | `default` `field` `helper` `error` | `field` = uppercase micro-label. |

## Overlays

- `Modal` — `position="center" | "right"`, Escape + backdrop click closes; Space inside
  inputs does not dismiss (backdrop only reacts when it is the event target).
- `ConfirmModal` — destructive/confirm pattern used instead of `window.confirm`.
- `Menu` — shared dropdown / suggestion surface (`z-dropdown`).
- `ContextMenu` — right-click / long-press menu (Base UI). Opens instantly with no
  slide or fade (`side="bottom"` — not the shadcn default `side="right"` slide-in).
  Nested menus win (tab strip); other chrome uses the app fallback in
  `AppContextMenu`.
- `Tooltip` — ~350ms delay; `z-popover`.

## Accessibility

- Buttons/inputs use `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`.
- Modal backdrop is a focusable control with `aria-label="Close modal"`; dialog has
  `role="dialog"` + `aria-modal`.
- Prefer associating `Label htmlFor` with control `id`.

## What stays out of this package

Domain composites (`KeyValueEditor`, auth wiring with `AuthConfig`, highlight layers,
tree rows) live under `apps/desktop/src/shared/ui` because they depend on app types or
feature stores.
