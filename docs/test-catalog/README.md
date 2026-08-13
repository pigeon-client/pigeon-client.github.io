# Test Catalog

Structured, feature-wise test cases and element IDs for manual QA and Playwright/WebdriverIO automation.

**Package:** `@pigeon/test-catalog` (`packages/test-catalog/`)

## ID schemes

| Prefix | Purpose | Example |
|--------|---------|---------|
| `TC-{FEATURE}-{NNN}` | Test case | `TC-RB-001` — URL ↔ Params sync |
| `EL-{FEATURE}-{NNN}` | Selectable UI element | `EL-RB-001` — URL input |

### Feature codes

| Code | Feature | Doc |
|------|---------|-----|
| APP | Application shell | [app-shell.md](./features/app-shell.md) |
| WS | Workspaces | [workspaces.md](../features/workspaces.md) |
| SID | Sidebar | [sidebar.md](../features/sidebar.md) |
| TAB | Request tabs | [tabs.md](../features/tabs.md) |
| RB | Request builder | [request-builder.md](../features/request-builder.md) |
| RV | Response viewer | [response-viewer.md](../features/response-viewer.md) |
| EX | Execution / send | [execution.md](../features/execution.md) |
| COL | Collections | [collections.md](../features/collections.md) |
| HD | History & drafts | [history-drafts.md](../features/history-drafts.md) |
| ENV | Environments | [environments.md](../features/environments.md) |
| IE | Import / export | [import-export.md](../features/import-export.md) |
| CP | Command palette | [command-palette.md](../features/command-palette.md) |
| SET | Settings | [settings.md](../features/settings.md) |
| PER | Persistence | [persistence.md](../features/persistence.md) |
| CT | Content types | [content-types.md](../features/content-types.md) |
| KB | Keyboard shortcuts | [keyboard-shortcuts.md](../features/keyboard-shortcuts.md) |
| SUI | Shared UI | [shared-ui.md](../features/shared-ui.md) |
| MCP | MCP workspace | [mcp.md](../features/mcp.md) |
| GQL | GraphQL workspace | [graphql.md](../features/graphql.md) |

## Test case fields

Each test case in the catalog includes:

- **id** — stable `TC-*` identifier for traceability in issues/PRs
- **type** — `functional`, `crud`, `ui`, `ux`, `keyboard`, `edge`, `accessibility`, `persistence`
- **priority** — `P0` (smoke/blocker), `P1` (core), `P2` (nice-to-have)
- **scope** — `rest` (current product) or `coming-soon` (MCP / GraphQL workbenches)
- **preconditions** — setup before step 1
- **steps** — ordered actions referencing `EL-*` element IDs
- **expectedResult** — pass/fail criteria
- **automation** — Playwright spec link + coverage status (`covered` / `partial` / `missing` / `manual-only`)
- **tags** — filter keys (`smoke`, `keyboard`, `dnd`, `button-pair`, `known-failure`, etc.)

## Element registry

Each element entry includes:

- **id** — `EL-*` catalog ID
- **selector** — primary Playwright locator
- **testId** / **elementId** — underlying hook when present
- **component** — source file path
- **planned** — `true` when documented but not yet implemented in UI

Elements marked `planned: true` should be added to the UI as `data-testid` hooks in a follow-up PR.

## Usage

### TypeScript (Playwright helpers, QA tools)

```ts
import {
  elementById,
  testCaseById,
  getTestCasesForFeature,
  getRestTestCases,
  getCoverageSummary,
  formatManualChecklist,
} from "@pigeon/test-catalog";

const urlInput = elementById["EL-RB-001"];
await page.locator(urlInput.selector).fill("https://api.example.com");

const tc = testCaseById["TC-RB-001"];
console.log(formatManualChecklist(tc));

const restCases = getRestTestCases();
const summary = getCoverageSummary({ scope: "rest" });
```

### Manual QA workflow

**Current product is REST only.** Use `getRestTestCases()` — skip `scope: "coming-soon"` (MCP, GraphQL, workbench swaps). Header MCP/GraphQL buttons exist as placeholders; do not treat them as live features.

1. Pick a REST feature from [Feature index](#feature-codes)
2. Run all `P0` cases first, then `P1`, then `P2`
3. For every keyboard chord, also run the matching **button / menu** path (`button-pair` tag)
4. Cover drag-and-drop: tabs, collection requests, sidebar/response resize (`dnd` tag)
5. Record results as `TC-*-PASS` / `TC-*-FAIL` in your issue or PR
6. Reference `EL-*` IDs when filing element-specific bugs

### Full REST regression pass

Run in this order (matches user journey):

1. APP → SID → TAB → RB → EX → RV
2. COL (including DnD) → HD → ENV → IE → CP → SET → PER
3. CT → KB (shortcut **and** button) → SUI

Skip MCP, GQL, and WS until those workbenches ship.

Mandatory edge cases (always include):

- TC-RB-004 (long URL)
- TC-RB-005 (many header rows)
- TC-RB-018 (GET body not sent)
- TC-SUI-001 (modal Space-no-close)
- TC-KB-008 (⌘Enter vs Send button)
- TC-KB-009 (⌘T / ⌘⇧N vs New Request / +)
- TC-KB-010 (⌘W vs tab ×)
- TC-KB-020 (empty URL save no-op)
- TC-TAB-011 (tab reorder DnD + persist)
- TC-COL-013 / TC-COL-015 (folder + cross-collection DnD)
- TC-COL-016 (folders are not drag sources)
- TC-APP-010 (response split drag)

## Coverage snapshot

Import `getCoverageSummary({ scope: "rest" })` for live REST counts. Catalog also retains coming-soon MCP/GraphQL cases so they are not lost.

- Live counts: run `pnpm test:catalog:check` and import `getCoverageSummary()`
- Playwright E2E maps to most `P0`/`P1` functional cases
- Gaps flagged `automation.status: "missing"`

## Related

- Feature specs: [docs/features/README.md](../features/README.md)
- Automation layers: [docs/testing.md](../testing.md)
- Test id convention (canonical): [docs/testing.md#test-ids](../testing.md)

## Adding new cases

1. Add or update `EL-*` in `packages/test-catalog/src/elements/`
2. Add `TC-*` in the matching `packages/test-catalog/src/test-cases/` file
3. Implement missing `data-testid` hooks when `planned: true`
4. Link Playwright spec in `automation.spec` when automated
5. Run `pnpm --filter @pigeon/test-catalog check`
