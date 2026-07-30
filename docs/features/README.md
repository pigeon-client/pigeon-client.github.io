# Feature Docs

PM-style product reference for each Pigeon feature. Describes **what the user sees and does**,
acceptance criteria, edge cases, manual QA checklists, and `data-testid` hooks.

Code-level architecture notes may also live under `apps/desktop/src/features/<name>/`. Prefer
updating these docs when behavior changes — the `feature-qa` Claude Code agent
(`.claude/agents/feature-qa.md`) is responsible for keeping them honest after deep QA passes.

| Doc | Feature | Code (under `apps/desktop/`) |
|-----|---------|------------------------------|
| [request-builder.md](./request-builder.md) | Tabs, URL bar, Params/Auth/Headers/Body | `src/features/request-builder` |
| [content-types.md](./content-types.md) | Request/response body formats + curl CT parity | `src/shared/lib/contentType.ts` |
| [execution.md](./execution.md) | Send path, Rust vs browser transport | `src/features/execution` |
| [response-viewer.md](./response-viewer.md) | Status, body, headers, empty/SSE | `src/features/response-viewer` |
| [collections.md](./collections.md) | Saved tree, folders, save modal | `src/features/collections` |
| [history-drafts.md](./history-drafts.md) | History log + drafts | `src/features/history` |
| [environments.md](./environments.md) | `{{var}}` envs + interpolation | `src/features/environments` |
| [import-export.md](./import-export.md) | cURL import + copy-as-cURL | `src/features/import-export` |
| [settings.md](./settings.md) | Theme, request options, updates | `src/features/settings` |
| [sidebar.md](./sidebar.md) | Left nav shell | `src/app/layout/Sidebar.tsx` |
| [command-palette.md](./command-palette.md) | `⌘⇧K` global search across history/drafts/collections | `src/features/command-palette` |
| [mcp.md](./mcp.md) | Minimal MCP client — workspace tab (⌘⇧M): connect, list tools, call, inspect | `src/features/mcp` |
| [graphql.md](./graphql.md) | GraphQL workspace tab (⌘⇧G) — coming-soon placeholder | `src/features/graphql` |

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
- **Keyboard** — shortcuts for the feature.
- **States & edge cases** — empty/loading/error, overflow, boundaries.
- **Manual test checklist** — human / exploratory steps (used by `feature-qa`).
- **Automation coverage** — Vitest + Playwright pointers.
- **Test ids** — stable selectors (see [../testing.md](../testing.md)).

## Test ids

Stable, semantic `data-testid`s (never random UUIDs). Naming: `<area>-<element>`,
`<area>-tab-<name>`, `<area>-<element>-<key>` for list rows (e.g. `sidebar-tab-draft`,
`editor-tab-params`, `param-key-0`, `method-option-DELETE`).

Inactive workspace tabs stay mounted (`display:none`), so interactive testids that repeat per tab
(`url-input`, `method-trigger`, `response-status`, `response-body`) must be scoped to `:visible`.

## QA agent

`.claude/agents/feature-qa.md` is the sole project agent. It owns Vitest, Playwright, manual
user-like testing, bug reports, and feature documentation updates.
