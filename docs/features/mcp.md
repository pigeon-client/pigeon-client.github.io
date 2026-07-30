# MCP Bench

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

1. Opened via the header's "MCP bench" icon button (`Plug` icon, `header-open-mcp`) or `⌘⇧M` — a
   real **workspace tab** (`Tab.kind === "mcp"`, singleton: reopening focuses the existing tab).
   The tab strip shows an `MCP` badge instead of an HTTP method; the tab hosts `McpPanel`
   full-pane with no URL bar / request editor / response panel.
2. Connect form: server URL + optional `Key: Value` headers, both run through the environments
   resolver **strictly** (`interpolateStrict` — same strictness as `execution.md`'s send path;
   an unresolved `{{var}}` blocks connecting with an in-pane error).
3. On connect: `McpSession` runs the Streamable-HTTP lifecycle — `initialize` →
   `notifications/initialized` → `tools/list` + `resources/list` — over `McpTransport`
   (Tauri `reqwest` / browser `fetch`, mirroring `execution/ports/HttpClient`). The `Mcp-Session-Id`
   response header is captured and replayed on every subsequent call automatically.
4. Left pane lists tools (name + description on hover) and resources (name/uri) once connected.
5. Selecting a tool renders a form from `inputSchema`: string/number/integer/boolean/enum become
   real fields (`isSimpleSchema`); anything with an object/array property falls back to one raw-JSON
   textarea for the whole `arguments` payload.
6. "Call" sends `tools/call`; the result renders pretty (syntax-highlighted JSON via the shared
   `HighlightedHtml` primitive, same highlighter `ResponsePanel` uses) or raw, plus elapsed ms.
7. Every failure — transport (`McpConnectError`), protocol/non-2xx (`McpProtocolError`), unresolved
   variables, invalid raw-JSON args — renders as `mcp-error` text in the pane. Nothing throws past
   the panel.

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

## UI

- Disconnected: single-column form (URL, headers textarea, Connect button, error banner).
- Connected: two-pane — 240px tool/resource list on the left, selected tool's form + Call + result
  on the right. "Disconnect" returns to the form.

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
  string arg → result rendered; a hard network failure → in-pane error, panel still usable.
- Vitest: `src/features/mcp/lib/jsonRpc.test.ts` (request/notification framing, bare-JSON and
  SSE-framed response parsing), `lib/toolSchema.test.ts` (simple-schema detection, arg coercion),
  `lib/interpolate.test.ts` (strict resolve + header-line parsing), `services/McpSession.test.ts`
  (full lifecycle against a fake transport: session-id capture, tools/resources list, tool call,
  protocol-error and transport-error mapping).

## Test ids

`mcp-panel`, `mcp-connect-url`, `mcp-connect-headers`, `mcp-connect-btn`, `mcp-tool-<name>`,
`mcp-arg-<key>`, `mcp-raw-args`, `mcp-call-btn`, `mcp-result`, `mcp-error`.

## Key files

`apps/desktop/src/features/mcp/ports/McpTransport.ts` (port), `services/TauriMcpTransport.ts` +
`services/BrowserMcpTransport.ts` + `services/mcpTransport.ts` (platform selection, mirrors
`execution`'s `HttpClient`), `services/McpSession.ts` (JSON-RPC lifecycle, session-id tracking),
`lib/jsonRpc.ts` (message framing), `lib/toolSchema.ts` (schema-to-form helpers), `lib/interpolate.ts`
(strict `{{var}}` resolve + header parsing), `components/McpPanel.tsx` (UI). Rust:
`send_mcp_request` in `src-tauri/src/lib.rs` (dumb POST, no JSON-RPC awareness). Wired via a header
button in `src/app/layout/Header.tsx` into a `Modal` in `src/app/AppContent.tsx`.

## Open risks

- **Resolved (2026-07-29):** MCP is now a real tab-store tab (`Tab.kind = "http" | "mcp" |
  "graphql"`, `openKindTab` singleton-focus) — the earlier modal compromise is gone. One MCP tab
  at a time by design; multiple concurrent MCP connections would need lifting the singleton rule
  and per-tab session state.
- No SSE *streaming* tool results (long-running tool calls that emit multiple `data:` frames) — only
  the last frame is read. Fine for request/response-style tools; would need real stream handling
  for progress-reporting tools.
- No session persistence across app restarts — reconnecting re-runs `initialize` from scratch, by
  design (explicitly out of scope: "no MCP session saving").
