# 010 — Restore documented focus rings on `@pigeon/ui` primitives

**Against:** uncommitted `packages/ui` edits  
**Effort:** S · **Risk:** Low · **Category:** a11y / docs alignment

## Why

`docs/tokens.md` Focus ring (one convention):

```
ring-2 ring-ring ring-offset-2 ring-offset-background
```

`docs/features/ui-package.md` Accessibility: buttons/inputs use `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`.

Working tree primitives (`button.tsx`, `input.tsx`, `select.tsx`, `switch.tsx`, `tabs.tsx`, `textarea.tsx`) have **no** `focus-visible:ring-*`. Input also lost default `border-border` (may be intentional chrome). Restore **rings**; do **not** fight borderless input styling unless rings fail without a border.

## Current excerpt

`packages/ui/src/components/button.tsx` cva base: `outline-none` only, no ring.

`packages/ui/src/components/input.tsx`: `outline-none transition-colors` — no ring, no `border`.

## Scope

- IN: `packages/ui/src/components/{button,input,select,switch,tabs,textarea}.tsx`
- IN: existing primitive tests if they snapshot class names (`packages/ui` or desktop `ui-primitives.test.tsx`)
- OUT: reverting the rest of the uncommitted modal/contrast pass; deleting desktop screenshots PNG; `docs/tokens.md` rewrites (code must match docs, not the other way around)

## Steps

1. Add to interactive cva bases (after `outline-none`):

```
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
```

Use `focus-visible:` so mouse clicks don’t show rings (matches docs).

2. Switch: ring on the thumb/root control that already receives focus.

3. TabsTrigger: same ring (or `focus-visible:ring-*` consistent with other triggers).

4. Update tests that assert class strings.

## Verify

```
pnpm --filter pigeon test
pnpm ci:check
```

If `@pigeon/ui` has its own test script, run that too.

## Done when

Keyboard focus on Button/Input/Select/Textarea/Switch/Tab shows the token ring. Docs and classes agree.

## Escape

If a screenshot-driven design pass **intentionally** replaced rings with a border-only focus, STOP and report rather than also rewriting `docs/tokens.md` in this plan. Rings are the specified system.
