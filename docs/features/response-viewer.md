# Response Viewer

Renders an `ApiResponse`: status bar, pretty/raw body with syntax highlighting, headers,
image/binary handling, download, copy, status-specific empty bodies, and SSE streams.

## UI

```
┌ Status bar ────────────────────────────────────────────┐
│ ● 200 OK │ 38 ms │ 1.2 KB │        [Pretty/Raw] [⇩] [⧉] │
├ Body ─ Headers ────────────────────────────────────────┤
│ {                                                       │
│   "users": [ … ]                                        │
│ }                                                       │
└────────────────────────────────────────────────────────┘
```

- **Status bar** — colored status dot + `code text` (2xx green, 3xx blue, 4xx orange, 5xx red),
  timing, response size, and body actions (pretty toggle, download, copy).
- **Body / Headers tabs** — Body shows highlighted JSON/HTML/XML (via `highlight.js`, themed CSS
  vars); Headers lists response headers.
- **Image / binary / media** — images and SVG render inline; audio/video use native players;
  PDF embeds in an iframe; ZIP/protobuf/msgpack/octet show a download affordance. See
  `docs/features/content-types.md` for the full media-type catalog.
- **Empty body** — when there is a response but zero body bytes, a status-specific placeholder
  (illustration + copy) is shown instead of a blank panel (e.g. 404, 204, 304, 5xx). If the body
  has content, that content is shown as usual.
- **SSE** — `Content-Type: text/event-stream` streams live into an event list (type / id / data),
  newest event on top, with a Stop control. Prefer `Accept: text/event-stream` for long-lived streams (disables the
  default request timeout on desktop).

## UX / interactions

- **Empty state (context-aware).** With no response yet: if a URL is present → "Ready to send" +
  a **Send request** button (⌘↵); if no URL → "No response yet / Enter a URL above".
- **Pretty ↔ Raw** toggles formatting; JSON is re-indented in pretty mode.
- **HTML Preview.** When `Content-Type` is `text/html`, the body toolbar offers
  **Preview | Pretty | Raw** (Preview default). Preview renders the HTML in a sandboxed
  iframe (`sandbox=""` — no scripts/forms). Pretty shows highlighted source; Raw is plain text.
- **Download** saves the raw body; **Copy** copies the body text.
- Long/wide bodies scroll inside their own container; the panel is vertically resizable against the
  editor via the drag handle.

## States & edge cases

- A `status: 0` transport error still renders (error placeholder + `statusText`) rather than the
  pre-send empty state.
- Content type drives rendering (`detectType`): json/html/xml highlight, image inline, SSE event
  list, else text/binary.
- SSE auto-detects from the response `Content-Type`; set `Accept: text/event-stream` for long streams.

## Test ids

`response-empty` (pre-send empty), `response-empty-body` (status placeholder), `response-status`,
`response-body`, `response-html-preview`, `response-view-preview|pretty|raw`, `response-sse`,
`response-sse-stop`, `response-sse-event-<i>`. Scope to `:visible` since inactive tabs keep their
panel mounted.

## Key files

`components/ResponsePanel.tsx`, `components/StatusEmptyBody.tsx`, `components/SseEventList.tsx`,
`features/execution/lib/sse.ts`, `features/execution/services/sseClient.ts`, shared syntax vars in
`src/styles/index.css`.
