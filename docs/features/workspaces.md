# Workspaces

## Overview

Pigeon exposes three workbenches from the header: **REST**, **MCP**, and **GraphQL**.

Today only REST is a full workspace. MCP and GraphQL open an in-place **coming-soon** page
(`ComingSoonWorkspace`) under the header — no sidebar, tab strip, or editors.

## Problem / job to be done

Users should be able to switch product surfaces (HTTP client vs future MCP / GraphQL benches)
without losing the shared chrome (brand, search, settings). Coming-soon panes reserve those
entry points until the benches ship.

## User stories

- As a developer, I want `⌘⇧R` / header REST to return to the full HTTP client.
- As a developer, I want `⌘⇧M` / `⌘⇧G` to open clear placeholders for MCP and GraphQL.
- As a developer, I want GraphQL-over-HTTP to still work via REST body content types today.

## Functional requirements

1. Header workspace controls: `header-open-rest`, `header-open-mcp`, `header-open-graphql`.
2. `AppContent` keeps `workbench: "rest" | "mcp" | "graphql"`.
3. `workbench === "rest"` → full REST shell (sidebar + tabs + editor + response).
4. `workbench === "mcp" | "graphql"` → `ComingSoonWorkspace` with testids `mcp-coming-soon` /
   `graphql-coming-soon`.
5. Switching back to REST on desktop focuses the REST OS window via `open_workspace_window`
   (`kind: "rest"`).
6. `getWindowKind()` reads Tauri window label when present; browser/E2E always `"rest"`.
7. Tab store still types `Tab.kind` (`http` | `mcp` | `graphql`); restore forces tabs to `http`.
   Header/workbench path does **not** create kind tabs today (`openKindTab` retained but unused
   by the live shell).

## Non-functional requirements

- Coming-soon must not mount MCP sidebar or MCP panel.
- Bench implementation under `features/mcp` stays in-tree for later enablement (see [mcp.md](./mcp.md)).

## Acceptance criteria

- [ ] Header REST / `⌘⇧R` shows full REST UI.
- [ ] Header MCP / `⌘⇧M` shows `mcp-coming-soon`; no sidebar.
- [ ] Header GraphQL / `⌘⇧G` shows `graphql-coming-soon`; no sidebar.
- [ ] Tooltips mark MCP / GraphQL as coming soon.
- [ ] GraphQL MIME body types still available in REST (see [content-types.md](./content-types.md)).

## UI

Coming-soon: centered title + short copy inside a single bordered panel (`bg-card`). No fake
editor chrome or secondary marketing blocks.

## UX / interactions

- Active workspace tab is highlighted in the header.
- Export / save actions stay disabled on coming-soon surfaces.

## Keyboard

| Chord | Action |
|-------|--------|
| `⌘⇧R` | REST workbench |
| `⌘⇧M` | MCP coming-soon |
| `⌘⇧G` | GraphQL coming-soon |

## States & edge cases

- Legacy singleton OS windows for mcp/graphql may still exist in Rust; UI does not open them for
  the coming-soon path.
- Browser build: only in-page workbench swap.

## Manual test checklist

- [ ] Cycle REST → MCP → GraphQL → REST via header and shortcuts.
- [ ] Confirm sidebar/tabs hidden on coming-soon and restored on REST.
- [ ] Confirm search/settings still reachable from coming-soon header.

## Automation coverage

- Playwright: `e2e/find-and-kind-tabs.spec.ts` (coming-soon panes).

## Test ids

`header-open-rest`, `header-open-mcp`, `header-open-graphql`, `mcp-coming-soon`,
`graphql-coming-soon`.

## Key files

- `apps/desktop/src/features/workspaces/components/ComingSoonWorkspace.tsx`
- `apps/desktop/src/features/workspaces/index.ts`
- `apps/desktop/src/shared/lib/windowKind.ts`
- `apps/desktop/src/app/AppContent.tsx`
- `apps/desktop/src-tauri/src/windows.rs` (legacy multi-window)

## Open risks

- Docs / e2e names still say “kind tabs” in places — prefer “workbench” for current UI.
- Re-enabling MCP must decide: in-page panel vs OS window vs both.
