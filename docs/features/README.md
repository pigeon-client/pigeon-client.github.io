# Feature Docs

In-depth UX/UI reference for each Pigeon feature. Code-level architecture lives in each
feature's `src/features/<name>/README.md`; these docs describe **what the user sees and does**,
the states a screen can be in, keyboard flows, edge cases, and the `data-testid` hooks used by
the E2E suite.

| Doc | Feature | Code |
|-----|---------|------|
| [request-builder.md](./request-builder.md) | Tabs, URL bar, request editors (Params/Auth/Headers/Body) | `src/features/request-builder` |
| [content-types.md](./content-types.md) | Request/response body formats (JSON…media) + curl CT parity | `src/shared/lib/contentType.ts` |
| [execution.md](./execution.md) | Sending requests, transport (Rust vs browser) | `src/features/execution` |
| [response-viewer.md](./response-viewer.md) | Response status, body, headers, empty/loading states | `src/features/response-viewer` |
| [collections.md](./collections.md) | Saved request tree, folders, save-to-collection | `src/features/collections` |
| [history-drafts.md](./history-drafts.md) | Auto-saved history + drafts, sidebar tree | `src/features/history` |
| [environments.md](./environments.md) | `{{var}}` environments + interpolation | `src/features/environments` |
| [import-export.md](./import-export.md) | cURL import (paste/modal) + copy-as-cURL | `src/features/import-export` |
| [settings.md](./settings.md) | Theme, request options, updates, shortcuts | `src/features/settings` |
| [sidebar.md](./sidebar.md) | Left navigation shell tying it together | `src/app/layout/Sidebar.tsx` |

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
- **UX / interactions** — what actions do, feedback, real-time behaviors.
- **Keyboard** — shortcuts relevant to the feature.
- **States & edge cases** — empty/loading/error, boundaries, gotchas.
- **Test ids** — stable `data-testid` selectors (see [../testing.md](../testing.md)).
- **Key files** — where the behavior lives.

## Test ids

Stable, semantic `data-testid`s (not random UUIDs — those change per render and can't be
selected). Naming: `<area>-<element>` and `<area>-<element>-<key>` for list rows
(e.g. `sidebar-tab-draft`, `editor-tab-params`, `param-key-0`, `method-option-DELETE`).
Inactive workspace tabs stay mounted (`display:none`), so interactive testids that repeat per tab
(`url-input`, `method-trigger`, `response-status`, `response-body`) must be scoped to `:visible`.
