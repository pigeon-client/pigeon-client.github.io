# MCP Bench

> **UI status (current):** header / `⌘⇧M` opens a **coming-soon** pane
> (`ComingSoonWorkspace`, testid `mcp-coming-soon`). The MCP bench implementation under
> `src/features/mcp` is retained for when this ships; docs below describe that target UX.

## Overview

A deliberately tiny MCP (Model Context Protocol) client: connect to a server over Streamable
HTTP, list its tools/resources, call one tool with a form built from its input schema, and inspect
the result — without a scripting layer or session persistence.

## Problem / job to be done

Bruno has no native MCP support; Postman's is script-heavy. Pigeon's bench is the "durable edge" —
just enough to poke at an MCP server's tools during development, nothing more.

## User stories

- As a developer building an MCP server, I want to connect Pigeon to it and see what tools/resources
  it exposes without writing a client.
- As a developer, I want to call a tool with a couple of arguments and see the result immediately.
- As a developer, I want connection/protocol/tool errors to show up in the pane, never crash the app.

## Functional requirements

1. **Desktop app**: opened via the header's "MCP bench" icon button (`Plug` icon,
   `header-open-mcp`) or `⌘⇧M` — a separate, singleton **OS window** (label `"mcp"`,
   `open_workspace_window` in `src-tauri/src/windows.rs` — re-triggering focuses the existing window
   instead of opening a duplicate). That window keeps its own multi-tab strip, but every tab in
   it is MCP-kind (`Tab.kind === "mcp"`) — REST gets its own window the same
   way (see `docs/features/sidebar.md` and the "Workspace windows" note below).
   **Browser/E2E build**: no OS windows exist, so the same button/shortcut instead opens an
   in-page MCP tab in the single combined window (`openKindTab("mcp")`, singleton within that
   page) — this is what `e2e/mcp.spec.ts` drives.
   Either way the tab hosts `McpPanel` full-pane with no URL bar/request editor/response panel,
   and the sidebar swaps to `McpSidebar` (see UI below) whenever the active tab is MCP-kind.
2. Connect form: server URL + optional headers (shared `KeyValueEditor` rows, same primitive
   `RequestEditor` uses for REST headers), both run through the environments resolver **strictly**
   (`interpolateStrict` — same strictness as `execution.md`'s send path; an unresolved `{{var}}`
   blocks connecting with an in-pane error).
3. On connect: `McpSession` runs the Streamable-HTTP lifecycle — `initialize` →
   `notifications/initialized` → `tools/list` + `resources/list` — over `McpTransport`
   (Tauri `reqwest` / browser `fetch`, mirroring `core/http/ports/HttpClient`). The `Mcp-Session-Id`
   response header is captured and replayed on every subsequent call automatically.
4. Sidebar (`McpSidebar`) lists tools (name + description on hover) and resources (name/uri) for
   the *active* MCP tab once connected — see `features/mcp/store.ts` below for how state is
   shared between it and `McpPanel`.
5. Selecting a tool renders a form from `inputSchema`: string/number/integer/boolean/enum become
   real fields (`isSimpleSchema`); anything with an object/array property falls back to one raw-JSON
   textarea for the whole `arguments` payload.
6. "Call" sends `tools/call`; the result renders pretty (syntax-highlighted JSON via the shared
   `HighlightedHtml` primitive, same highlighter `ResponsePanel` uses) or raw, plus elapsed ms.
7. Every failure — transport (`McpConnectError`), protocol/non-2xx (`McpProtocolError`), unresolved
   variables, invalid raw-JSON args — renders as `mcp-error` text in the pane. Nothing throws past
   the panel.
8. **OAuth 2.1 authorization** (desktop app only — needs a system browser + loopback redirect):
   a 401 with a `WWW-Authenticate` header (`McpAuthRequiredError`) switches the pane to an
   "authorization required" state instead of a plain error. See the OAuth section below.

## Workspace windows & the per-tab MCP store

Each MCP tab's live connection state (session, tools/resources, selected tool, call in-flight
state, authorized-server URL) lives in `features/mcp/store.ts` — a Zustand store keyed by tab id
— rather than component-local `useState`, because `McpPanel` (connect form, auth flow, selected
tool's form/call/result) and `McpSidebar` (tools/resources list, disconnect, forget-authorization)
are siblings, not parent/child, and both need it. `useMcpTab(tabId)` returns `{ state, patch,
remove }`; `patch`/`remove` are memoized per tab id (`useCallback`) — an earlier version returned
a fresh closure every render, which made an unmount-cleanup effect in `McpPanel` re-fire on
*every* state change and immediately wipe the tab's entry (caught by `e2e/mcp.spec.ts`, not by
Vitest — worth remembering if a future consumer of this hook sees state mysteriously reset).
Connect-form/auth-flow input ephemera (URL, headers text, manual client-id fields, pending-auth
state) stays local to `McpPanel` — the sidebar never needs it.

## Non-functional requirements

- `McpTransport` is a pure port (`post(url, headers, bodyText)`); all JSON-RPC framing lives in
  `McpSession`/`lib/jsonRpc.ts`, so Playwright can stub the network exactly like `HttpClient`'s
  browser tests do — no real MCP server needed for CI.
- Single in-flight tool call at a time (`calling` state disables the Call button); no request
  queueing/cancellation — out of scope for a bench this small.

## Acceptance criteria

- [ ] Connecting to a server that responds to `initialize` lists its tools and resources.
- [ ] A scalar-only tool schema renders real form fields; an object/array field falls back to raw
  JSON for that tool's whole argument payload.
- [ ] Calling a tool renders its result (pretty JSON by default, raw toggle) with a timing number.
- [ ] An unreachable URL, a non-2xx response, and a JSON-RPC error each show `mcp-error` text and
  leave the connect form usable — never a blank screen or thrown exception.
- [ ] `{{var}}` in the URL/headers resolves before connecting; an unresolved one blocks with an
  error naming the missing variable(s).

## OAuth 2.1 authorization

Follows the MCP authorization spec
(https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) — HTTP transport
only, desktop app only (needs a system browser + a loopback HTTP redirect; the browser/E2E build
can't do either, so `oauthHttp.ts`/`OauthFlow.ts` throw `OauthUnsupportedError` there).

1. `McpSession.send()` throws `McpAuthRequiredError` (carrying `WWW-Authenticate`) on a 401 instead
   of the generic `McpProtocolError`. `McpPanel` catches it on connect and switches to the
   `auth-required` state with an "Authorize in Browser" button.
2. `runAuthorizationCodeFlow` (`oauth/OauthFlow.ts`) does, in order: parse `resource_metadata` from
   `WWW-Authenticate` (or fall back to `<origin>/.well-known/oauth-protected-resource`) → fetch
   Protected Resource Metadata (RFC 9728) → fetch Authorization Server Metadata (RFC 8414,
   `.well-known/oauth-authorization-server`, with the well-known-path-insertion rule for issuers
   with a path component) → Dynamic Client Registration (RFC 7591) if the AS advertises
   `registration_endpoint`, else throws `OauthManualClientRequiredError` so the UI shows manual
   Client ID / Secret / Scope fields → PKCE (S256) + a one-shot loopback listener
   (`oauth_loopback_open`/`oauth_loopback_wait`, `127.0.0.1:<random port>/callback`) → opens the
   system browser (`open_external_url`) → validates `state` on the redirect → exchanges the code
   for a token (always includes the RFC 8707 `resource` parameter).
3. Tokens persist to SQLite (`mcp_oauth` table, keyed by the canonical MCP server URI —
   `oauth/canonicalUri.ts`), via `oauthDb.ts` / `save_mcp_oauth`/`get_mcp_oauth`/`delete_mcp_oauth`
   in `src-tauri`. Reconnecting to a known server attaches the cached token automatically before
   the first request, so a valid session never re-prompts. `refreshAccessToken` in `OauthFlow.ts`
   handles the `refresh_token` grant (not yet auto-invoked on token expiry — only on a fresh 401).
4. "Forget authorization" (shown next to Disconnect once connected with a cached token) deletes
   the stored record for that server.

## UI

`McpPanel` (main content) and `McpSidebar` (sidebar, swapped in by `AppContent.tsx` whenever the
active tab's kind is `"mcp"`, in place of the REST `Sidebar`) split what used to be one two-pane
component:

- Disconnected: `McpPanel` shows a single-column form (URL, headers textarea, Connect button,
  error banner); `McpSidebar` shows an idle placeholder ("Connect to an MCP server to see its
  tools here.").
- Authorization required: `McpPanel` shows "This MCP server requires authorization" banner,
  "Authorize in Browser" button (label becomes the live status text — "Discovering authorization
  server…", "Registering client…", "Waiting for browser authorization…", "Exchanging
  authorization code for a token…" — while running), a "Back" button, and — only after a
  `registration_endpoint`-less AS is detected — Client ID / Client Secret / Scope fields.
- Connected: `McpSidebar` shows the tool/resource list plus "Disconnect" and "Forget
  authorization" (when a cached token was used); `McpPanel` shows the selected tool's form + Call
  + result. Selecting a tool in the sidebar is what drives `McpPanel`'s content (both read/write
  the same per-tab store entry — see above).

## UX / interactions

- Selecting a different tool resets its argument values and any previous result/error.
- The session id header is invisible to the user — purely internal bookkeeping.

## Keyboard

None dedicated — standard tab/click through the form. (Out of scope per the Phase 4 brief: no
tool-chaining, no scripting, no session save/restore.)

## States & edge cases

- Zero tools exposed: "No tools exposed." instead of an empty blank pane.
- Server returns SSE framing (`text/event-stream`) instead of a bare JSON body:
  `lib/jsonRpc.ts#parseJsonRpcMessage` reads the last `data:` line, so both response styles work.
- Raw-JSON argument fallback with invalid JSON: caught and surfaced as `Invalid JSON: <message>` in
  `mcp-error`, not a crash.

## Manual test checklist

- [ ] Connect to a real local MCP server (if available) end-to-end — list tools, call one, inspect
  the result.
- [ ] Connect with a `{{var}}` in the URL that resolves vs. one that doesn't.
- [ ] Select a tool with a scalar schema, then one with an object/array property; confirm the
  form/raw-JSON split.
- [ ] Kill the server mid-session and try another call — confirm `mcp-error`, no crash.
- [ ] Disconnect and reconnect to a different URL in the same session.

## Automation coverage

- Playwright: `e2e/mcp.spec.ts` — stubbed server: connect → tools listed → call `echo` with a
  string arg → result rendered; a hard network failure → in-pane error, panel still usable. (No
  OAuth coverage here — the browser build can't open a system browser or a loopback listener.)
- Vitest: `src/features/mcp/lib/jsonRpc.test.ts` (request/notification framing, bare-JSON and
  SSE-framed response parsing), `lib/toolSchema.test.ts` (simple-schema detection, arg coercion),
  `lib/interpolate.test.ts` (strict resolve + header-line parsing), `services/McpSession.test.ts`
  (full lifecycle against a fake transport: session-id capture, tools/resources list, tool call,
  protocol-error/transport-error mapping, the 401 → `McpAuthRequiredError` path, and
  `setAuthorizationHeader`). OAuth pure-logic tests (no real network/Tauri, matching project
  convention): `oauth/pkce.test.ts` (RFC 7636 Appendix B vector), `oauth/canonicalUri.test.ts`
  (spec's valid/invalid URI examples), `oauth/metadata.test.ts` (`WWW-Authenticate` parsing, RFC
  8414 well-known URL construction, PRM/AS metadata validation), `oauth/OauthFlow.test.ts` (the
  pure authorize-URL / token-request-body / registration-body builders).

## Test ids

`mcp-panel`, `mcp-connect-url`, `mcp-connect-header-key-<n>`, `mcp-connect-header-value-<n>`,
`mcp-connect-btn`, `mcp-tool-<name>`,
`mcp-arg-<key>`, `mcp-raw-args`, `mcp-call-btn`, `mcp-result`, `mcp-error`, `mcp-authorize-btn`,
`mcp-oauth-client-id`, `mcp-oauth-client-secret`, `mcp-oauth-scope`, `mcp-forget-auth-btn`. The
last one and the tool buttons now render from `McpSidebar`, not `McpPanel` — same testids either
way.

## Key files

`apps/desktop/src/features/mcp/ports/McpTransport.ts` (port), `services/TauriMcpTransport.ts` +
`services/BrowserMcpTransport.ts` + `services/mcpTransport.ts` (platform selection, mirrors
`execution`'s `HttpClient`), `services/McpSession.ts` (JSON-RPC lifecycle, session-id tracking,
401 → `McpAuthRequiredError`), `lib/jsonRpc.ts` (message framing), `lib/toolSchema.ts`
(schema-to-form helpers), `lib/interpolate.ts` (strict `{{var}}` resolve + header parsing),
`store.ts` (per-tab connection state shared between the two components below),
`components/McpPanel.tsx` (connect form, auth flow, selected-tool form/call/result),
`components/McpSidebar.tsx` (tools/resources list, disconnect, forget-authorization). OAuth:
`oauth/pkce.ts` (PKCE + state), `oauth/canonicalUri.ts` (spec's canonical server URI),
`oauth/metadata.ts` (RFC 9728 / RFC 8414 types + parsers), `oauth/oauthHttp.ts` (Tauri-only
HTTP/browser-open/loopback wrappers), `oauth/oauthDb.ts` (SQLite-backed token persistence),
`oauth/OauthFlow.ts` (the orchestrator). Rust: `send_mcp_request` in `src-tauri/src/mcp.rs` (dumb
POST, no JSON-RPC awareness), `open_workspace_window` in `src-tauri/src/windows.rs`
(singleton-per-kind window creation/focus); `src-tauri/src/oauth.rs` (`oauth_http_request`,
`open_external_url`, `oauth_loopback_open`/`oauth_loopback_wait`); `mcp_oauth` table + CRUD in
`src-tauri/src/db/mcp_oauth.rs` (added via the `MIGRATIONS` schema-version runner in
`src-tauri/src/db/mod.rs`). Wired via header buttons (`header-open-mcp` etc.) in
`src/app/layout/Header.tsx`, dispatched from `src/app/AppContent.tsx`'s `openWorkspace()` helper
(`invoke("open_workspace_window", ...)` in Tauri, `openKindTab()` in the browser build). Window
kind itself is resolved once via `src/shared/lib/windowKind.ts`.

## Open risks

- **Resolved (2026-07-29):** MCP is now a real tab-store tab (`Tab.kind = "http" | "mcp"`,
  `openKindTab` singleton-focus) — the earlier modal compromise is gone.
- **Resolved (2026-07-31):** MCP now opens as its own singleton OS window in the desktop app
  (`open_workspace_window`), with its own multi-tab strip — multiple concurrent MCP connections
  work today (one tab per connection, per-tab state in `features/mcp/store.ts`). Browser/E2E build
  still uses the single in-page tab (no OS windows there).
- No SSE *streaming* tool results (long-running tool calls that emit multiple `data:` frames) — only
  the last frame is read. Fine for request/response-style tools; would need real stream handling
  for progress-reporting tools.
- No session persistence across app restarts — reconnecting re-runs `initialize` from scratch, by
  design (explicitly out of scope: "no MCP session saving"). OAuth *tokens* are the exception —
  they persist in SQLite and are reattached automatically on reconnect.
- Expired access tokens aren't proactively refreshed — `refreshAccessToken` exists but is only
  reachable by re-triggering the authorize flow after a fresh 401 (which itself doesn't yet try
  refresh-before-reauth). A follow-up could have `attemptConnect` try `refreshAccessToken` first
  when a cached record has a `refreshToken` and looks expired.
- The loopback listener has no user-facing cancel — clicking "Back" during "Waiting for browser
  authorization…" only resets the UI; the Rust-side listener keeps waiting until its 5-minute
  timeout (harmless, but not truly cancelled).
- Picks the *first* `authorization_servers` entry from Protected Resource Metadata when a server
  lists more than one, rather than offering a choice (RFC 9728 §7.6 leaves this to the client).
