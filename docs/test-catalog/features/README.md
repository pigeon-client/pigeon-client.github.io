# Feature test case index

Each feature has structured `TC-*` test cases and `EL-*` element IDs in
[`packages/test-catalog/src/test-cases/`](../../packages/test-catalog/src/test-cases/).

**REST QA:** import `getRestTestCases()` / `getCoverageSummary({ scope: "rest" })`. Skip MCP, GQL, and WS until those workbenches ship.

| Code | Feature | Notes | Feature doc |
|------|---------|-------|-------------|
| APP | Application shell | REST default launch, split + sidebar resize | [app-shell.md](../features/app-shell.md) |
| WS | Workspaces | *Coming-soon* MCP/GraphQL swaps — skip for REST QA | [workspaces.md](../features/workspaces.md) |
| SID | Sidebar | Search, collapse, New Request button | [sidebar.md](../features/sidebar.md) |
| TAB | Request tabs | DnD reorder, overflow, shortcut↔button close/new | [tabs.md](../features/tabs.md) |
| RB | Request builder | URL, params, body, send | [request-builder.md](./request-builder.md) |
| RV | Response viewer | | [response-viewer.md](../features/response-viewer.md) |
| EX | Execution | | [execution.md](../features/execution.md) |
| COL | Collections | CRUD + request DnD (folders are drop-only) | [collections.md](./collections.md) |
| HD | History & drafts | | [history-drafts.md](../features/history-drafts.md) |
| ENV | Environments | | [environments.md](../features/environments.md) |
| IE | Import / export | | [import-export.md](../features/import-export.md) |
| CP | Command palette | Keyboard-only open (⌘K / aliases) | [command-palette.md](../features/command-palette.md) |
| SET | Settings | | [settings.md](../features/settings.md) |
| PER | Persistence | | [persistence.md](../features/persistence.md) |
| CT | Content types | REST HTTP only | [content-types.md](../features/content-types.md) |
| KB | Keyboard shortcuts | Every chord has a matching button case where a button exists | [keyboard-shortcuts.md](../features/keyboard-shortcuts.md) |
| SUI | Shared UI | | [shared-ui.md](../features/shared-ui.md) |
| MCP | MCP workspace | *Coming-soon* — skip | [mcp.md](../features/mcp.md) |
| GQL | GraphQL workspace | *Coming-soon* — skip | [graphql.md](../features/graphql.md) |

Import live counts from the package when counts drift:

```ts
import { featureCatalogs, getCoverageSummary, getRestTestCases } from "@pigeon/test-catalog";

getCoverageSummary({ scope: "rest" });
```

Use `getCoverageSummary()` (no filter) for catalog-wide totals including coming-soon.

## Detailed feature write-ups

- [Request builder](./request-builder.md) — full step-by-step cases with element IDs
- [Collections](./collections.md) — CRUD, save, delete, inheritance, DnD

Other features: use `formatManualChecklist(testCaseById["TC-XX-NNN"])` or read:

- `packages/test-catalog/src/test-cases/` — original feature files
- `packages/test-catalog/src/test-cases/gaps-and-edge.ts` — second-pass cases from feature-doc checklists
- `packages/test-catalog/src/test-cases/rest-dnd-shortcuts.ts` — REST DnD, shortcut↔button pairs, remaining edges
