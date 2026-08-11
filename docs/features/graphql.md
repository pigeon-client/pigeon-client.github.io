# GraphQL (coming soon)

## Overview

Placeholder workbench for a future GraphQL bench. Opened via the header GraphQL control
(`header-open-graphql`) or `⌘⇧G`. Renders `ComingSoonWorkspace` in place under the header —
**no** sidebar, tab strip, URL bar, or response panel.

Until the dedicated bench ships, GraphQL over HTTP still works in the REST workspace via
`application/graphql` (and related) body types — see [content-types.md](./content-types.md).

## Problem / job to be done

Reserve a first-class GraphQL entry point without shipping a half-built editor.

## User stories

- As a developer, I want a clear “coming soon” when I open GraphQL from the header.
- As a developer, I want to keep sending GraphQL HTTP requests from REST today.

## Functional requirements

1. Header button / `⌘⇧G` sets workbench to `graphql` (see [workspaces.md](./workspaces.md)).
2. Pane shows coming-soon copy (`graphql-coming-soon`).
3. Does **not** create a `Tab.kind === "graphql"` tab in the live UI.
4. REST content-types path for GraphQL MIME remains available.

## Non-functional requirements

- Same coming-soon component as MCP (`ComingSoonWorkspace` with a kind prop/copy variant).

## Acceptance criteria

- [ ] Header / `⌘⇧G` shows coming-soon; sidebar hidden.
- [ ] `⌘⇧R` returns to full REST UI.
- [ ] GraphQL body type still selectable in REST request builder.

## UI

Centered placeholder — title + short message. No fake schema explorer.

## UX / interactions

Tooltip on header control indicates coming soon.

## Keyboard

`⌘⇧G` open · `⌘⇧R` back to REST.

## States & edge cases

- Browser and desktop: in-page workbench only for this placeholder.

## Manual test checklist

- [ ] Open via header and shortcut; confirm testid.
- [ ] Send a GraphQL-over-HTTP request from REST with GraphQL content type.

## Automation coverage

- Playwright: `e2e/find-and-kind-tabs.spec.ts` ("GraphQL … coming-soon pane").

## Test ids

`header-open-graphql`, `graphql-coming-soon`.

## Key files

`src/features/workspaces/components/ComingSoonWorkspace.tsx`, `src/app/AppContent.tsx`,
`src/shared/lib/contentType.ts`.

## Open risks

- Tab-kind plumbing remains in the store for a future enablement — do not document it as live UX.
