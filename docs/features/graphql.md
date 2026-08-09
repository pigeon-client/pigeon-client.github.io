# GraphQL (coming soon)

Placeholder workspace tab for the future GraphQL bench. Opened via the header `Braces` icon
(`header-open-graphql`) or `⌘⇧G`; a singleton tab (`Tab.kind === "graphql"`, `GQL` badge)
rendering `ComingSoonWorkspace` — no URL bar, editor, or response panel.

## Acceptance criteria

- Header button / `⌘⇧G` opens (or focuses) the single GraphQL tab.
- Pane shows "coming soon" copy (`graphql-coming-soon`).
- Until the bench ships, GraphQL over HTTP still works via `application/graphql` body types
  (see [content-types.md](./content-types.md)).

## Test ids

`header-open-graphql`, `graphql-coming-soon`.

## Code

`src/features/workspaces/components/ComingSoonWorkspace.tsx`, tab-kind plumbing in
`request-builder/store.ts` + `AppContent.tsx`.

Playwright: `e2e/find-and-kind-tabs.spec.ts` ("GraphQL tab shows the coming-soon pane").
