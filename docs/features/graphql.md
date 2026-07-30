# GraphQL (coming soon)

## Overview

A placeholder workspace tab for the future GraphQL bench. Opened via the header `Braces` icon
(`header-open-graphql`) or `⌘⇧G`; a singleton tab (`Tab.kind === "graphql"`, `GQL` badge in the
tab strip) rendering `GraphqlComingSoon` — no URL bar, editor, or response panel.

## Current behavior

- Header button / `⌘⇧G` opens (or focuses) the single GraphQL tab.
- Pane copy explains the roadmap: query editor with schema introspection, variables, response
  inspection — and points at the workaround (HTTP request with an `application/graphql` body,
  which the request builder already supports via content types).
- Closing the tab behaves like any other tab.

## Planned scope (roadmap)

Query/variables split editor, schema introspection + autocomplete, operation picker, and response
inspection reusing the response-viewer. Target `RequestModel` for import/export parity.

## Test ids

`header-open-graphql`, `graphql-coming-soon`.

## Key files

`src/features/graphql/components/GraphqlComingSoon.tsx`, tab-kind plumbing in
`src/features/request-builder/store.ts` (`TabKind`, `openKindTab`) and `src/app/AppContent.tsx`.

## Automation coverage

Playwright: `e2e/find-and-kind-tabs.spec.ts` ("GraphQL tab shows the coming-soon pane").
