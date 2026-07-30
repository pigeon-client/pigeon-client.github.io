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

- Empty state: URL present → **Send request**; no URL → enter URL hint.
- **Download** saves raw body.
- **Copy as cURL** generates curl from the active request (same as header export) and toasts
  "Copied cURL to clipboard".
- Word-wrap toggle (`response-wrap-toggle`) shares `pg_word_wrap` with the body editor.

## Keyboard

- Response-focused `⌘A` selects body content only (when handler active).
- Response-focused `⌘F` opens an in-panel find bar (`response-find`): case-insensitive substring
  over the raw body text, match count (`n/m`), Enter/Shift+Enter (or arrows) cycles matches,
  current match highlighted and scrolled into view (`response-find-current`), Esc closes and
  restores the normal Pretty/Raw/Preview view. While the query is non-empty the body renders as a
  marked raw-text view (`response-find-text`).

## States & edge cases

- A `status: 0` transport error still renders (error placeholder + `statusText`) rather than the
  pre-send empty state.
- Content type drives rendering (`detectType`): json/html/xml highlight, image inline, SSE event
  list, else text/binary.
- SSE auto-detects from the response `Content-Type`; set `Accept: text/event-stream` for long streams.

## Test ids

`response-empty`, `response-empty-body`, `response-status`, `response-body`,
`response-html-preview`, `response-view-preview|pretty|raw`, `response-wrap-toggle`,
`response-sse`, `response-sse-stop`, `response-sse-event-<i>`, `response-snapshot-label`,
`response-find` (+ `-input`, `-count`, `-next`, `-prev`, `-close`), `response-find-text`,
`response-find-current`. Scope `:visible`.

## Key files

`components/ResponsePanel.tsx`, `components/StatusEmptyBody.tsx`, `components/SseEventList.tsx`,
`features/execution/lib/sse.ts`, `features/execution/services/sseClient.ts`, shared syntax vars in
`src/styles/index.css`.
