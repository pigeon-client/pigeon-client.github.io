# Feature docs

PM-style product reference for each Pigeon feature. One file per feature: **what the user sees
and does**, acceptance criteria, edge cases, manual QA checklists, and `data-testid` hooks.

Code architecture notes also live under `apps/desktop/src/features/<name>/` (and `app/`, `core/`).
Update these docs when behavior changes.

## Feature list

### Application shell

| Doc | Feature | Status | Code |
|-----|---------|--------|------|
| [app-shell.md](./app-shell.md) | Layout, header, panels, modals, toasts | Shipped | `src/app/` |
| [workspaces.md](./workspaces.md) | REST / MCP / GraphQL workbench switching | REST shipped; MCP & GraphQL coming-soon | `src/features/workspaces`, `src/shared/lib/windowKind.ts` |
| [tabs.md](./tabs.md) | Request tab strip (name, close, reorder) | Shipped | `src/features/rest/request-builder` (`TabStrip`, store) |
| [sidebar.md](./sidebar.md) | Left nav: History / Drafts / Collections | Shipped (REST only) | `src/app/layout/Sidebar.tsx` |
| [keyboard-shortcuts.md](./keyboard-shortcuts.md) | Global chords + shortcuts modal | Shipped | `src/app/AppContent.tsx`, `KeyboardShortcutsModal` |

### REST workspace

| Doc | Feature | Status | Code |
|-----|---------|--------|------|
| [request-builder.md](./request-builder.md) | URL bar, Params / Auth / Headers / Body | Shipped | `src/features/rest/request-builder` |
| [content-types.md](./content-types.md) | Body formats + response classification | Shipped | `src/shared/lib/contentType.ts` |
| [execution.md](./execution.md) | Send path, Rust vs browser transport | Shipped | `src/core/http`, `useSendRequest` |
| [response-viewer.md](./response-viewer.md) | Status, body, headers, SSE | Shipped | `src/features/rest/response-viewer` |
| [collections.md](./collections.md) | Saved trees, folders, save modal | Shipped | `src/features/rest/collections` |
| [history-drafts.md](./history-drafts.md) | History log + auto drafts | Shipped | `src/features/rest/history` |
| [import-export.md](./import-export.md) | cURL + Postman Collection import; copy-as-cURL | Shipped | `src/features/rest/import-export` |

### Cross-cutting product features

| Doc | Feature | Status | Code |
|-----|---------|--------|------|
| [environments.md](./environments.md) | `{{var}}` envs + interpolation | Shipped | `src/features/environments`, `src/core/interpolation` |
| [command-palette.md](./command-palette.md) | Global search (`⌘K` / `⌘⇧K` / `⌘⇧P`) | Shipped | `src/features/command-palette` |
| [settings.md](./settings.md) | Theme, request options, updates, data | Shipped | `src/features/settings` |
| [persistence.md](./persistence.md) | SQLite vs localStorage dual backend | Shipped | `src/core/persistence` |
| [shared-ui.md](./shared-ui.md) | Shared composites + `@pigeon/ui` | Shipped | `src/shared/ui`, `packages/ui` |

### Coming soon / retained

| Doc | Feature | Status | Code |
|-----|---------|--------|------|
| [mcp.md](./mcp.md) | MCP bench (connect, tools, OAuth) | **Coming-soon UI**; bench code retained | `src/features/mcp` + `ComingSoonWorkspace` |
| [graphql.md](./graphql.md) | GraphQL workspace | **Coming-soon UI**; GraphQL-over-HTTP via content types | `ComingSoonWorkspace` |

### Marketing

| Doc | Feature | Status | Code |
|-----|---------|--------|------|
| [marketing-site.md](./marketing-site.md) | trypigeon.dev landing + blog | Shipped | `apps/site` |

## Doc shape (required sections)

Every feature doc follows:

1. Overview
2. Problem / job to be done
3. User stories
4. Functional requirements
5. Non-functional requirements
6. Acceptance criteria
7. UI
8. UX / interactions
9. Keyboard (if any)
10. States & edge cases
11. Manual test checklist
12. Automation coverage
13. Test ids
14. Key files
15. Open risks

## Conventions

- **UI** — layout, structure, visual states.
- **UX / interactions** — actions, feedback, real-time behaviors.
- **Keyboard** — shortcuts for the feature (canonical list: [keyboard-shortcuts.md](./keyboard-shortcuts.md)).
- **States & edge cases** — empty/loading/error, overflow, boundaries.
- **Manual test checklist** — human / exploratory steps.
- **Automation coverage** — Vitest + Playwright pointers.
- **Test ids** — stable selectors (see [../testing.md](../testing.md)).

## Test ids

Stable, semantic `data-testid`s (never random UUIDs). Naming: `<area>-<element>`,
`<area>-tab-<name>`, `<area>-<element>-<key>` for list rows (e.g. `sidebar-tab-draft`,
`editor-tab-params`, `param-key-0`, `method-option-DELETE`).

Inactive workspace tabs stay mounted (`display:none`), so interactive testids that repeat per tab
(`url-input`, `method-trigger`, `response-status`, `response-body`) must be scoped to `:visible`.

## Related

- Design inventory: [../feature-design-list.md](../feature-design-list.md)
- Design tokens: [../tokens.md](../tokens.md)
- Architecture (module APIs): [../architecture.md](../architecture.md)
- Testing: [../testing.md](../testing.md)
