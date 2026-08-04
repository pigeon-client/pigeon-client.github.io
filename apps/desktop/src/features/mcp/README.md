# mcp

MCP (Model Context Protocol) bench — connect to a server, list tools/resources, call a tool,
render the result. A tab-scoped Zustand store (`store.ts`) shares connection state between
`McpPanel` (connect form, auth, selected-tool form/call/result) and `McpSidebar` (tools/resources
list, disconnect) since they're siblings, not parent/child.

## Public API (`index.ts`)
- `McpPanel`, `McpSidebar`
- `useMcpStore`, `useMcpTab(tabId)` — per-tab connection state + bound patch/remove actions
- `McpTabState`, `McpConnectStatus` (types)
- `McpTool`, `McpResource` (types)

## Layered shape
`ports/McpTransport.ts` is the transport interface; `services/{Tauri,Browser}McpTransport.ts` are
the two impls, picked via `@/core/platform`'s `selectImpl`. `oauth/` implements the RFC 8252
loopback authorization-code flow (dynamic client registration, PKCE, token exchange/refresh) —
self-contained, only touches `oauthDb.ts` for persistence.

## Consumes
`@/core/interpolation` (`interpolateStrict` for connect-time header/URL resolution),
`@/features/environments` (var resolution), `@/shared/*`.

## Extend
New transport = new `McpTransport` impl. Tool-call argument UI lives in `lib/toolSchema.ts` +
`McpPanel`; keep JSON-RPC framing in `services/McpSession.ts`.
