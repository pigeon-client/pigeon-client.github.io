# command-palette

`⌘K` fuzzy search across history, drafts, and saved collection requests — opens the match in a
tab. Stateless: reads from other features' stores, holds no state of its own beyond the modal's
open/query/selection (component-local).

## Public API (`index.ts`)
- `CommandPalette`
- `collectPaletteItems`, `searchPalette` — pure functions, unit-testable without mounting the UI

## Consumes
`@/features/rest/collections`, `@/features/rest/history`, `@/features/rest/request-builder`
(barrels, read-only), `@/shared/*`.

## Extend
New searchable source = extend `collectPaletteItems` in `lib/search.ts` to flatten it into
`PaletteItem[]`; ranking/matching stays in `searchPalette`.
