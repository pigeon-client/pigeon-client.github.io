# @pigeon/ui

Shared React 19 primitives + design tokens for both `apps/desktop` and `apps/site`. Source-only —
no build step; each app's own bundler (Vite) compiles this package's TS/CSS directly, standard for
a pnpm-workspace setup.

## Exports
- `.` (`src/index.ts`) — `Button`, `MethodBadge`/`CountBadge`/`METHOD_COLORS`, `Switch`,
  `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Tooltip`, `cn`
- `./tokens.css` (`src/styles/tokens.css`) — the design-token spec (mirrored in `TOKENS.md` at the
  repo root): `:root` + `.dark` CSS custom properties, plus a Tailwind 4 `@theme inline` block
  mapping them to utility classes

## Using it in a consumer app
```css
@import "tailwindcss";
@import "@pigeon/ui/tokens.css";
@source "<relative-path-to>/packages/ui/src";
```
The `@source` line is required — Tailwind 4 doesn't auto-scan outside the consuming app's own
directory tree, so a missing `@source` means this package's component classes render unstyled with
no error. `apps/desktop` imports the full `@import "tailwindcss"` (wants Preflight); `apps/site`
imports only `tailwindcss/theme.css` + `tailwindcss/utilities.css` layers (skips Preflight
deliberately — see `apps/site`'s own `src/styles/index.css` comment).

## What belongs here vs. `apps/desktop/src/shared/ui`
Leaf primitives with no app-specific composition logic (`button`, `badge`, `switch`, `tabs`,
`Tooltip`) live here. Desktop-specific composites (`Modal`, `FindBar`, `KeyValueEditor`,
`result-viewer/HighlightedBody`) stay in `apps/desktop/src/shared/ui` — they're not (yet) needed by
the site, and some have feature-level dependencies (`KeyValueEditor` imports
`@/features/environments` for `{{var}}` autocomplete) that would violate this package's
"shared → nothing but @pigeon/*" layer purity.

## Extend
A new cross-app primitive goes in `src/components/`, barrel-exported from `src/index.ts`. Don't add
a primitive here that only one app will ever use.
