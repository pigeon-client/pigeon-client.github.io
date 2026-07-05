# Response Viewer

Renders an `ApiResponse`: status bar, pretty/raw body with syntax highlighting, headers,
image/binary handling, download, and copy.

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
- **Image / binary** — images render inline; other binary shows a download affordance.

## UX / interactions

- **Empty state (context-aware).** With no response yet: if a URL is present → "Ready to send" +
  a **Send request** button (⌘↵); if no URL → "No response yet / Enter a URL above". (It no longer
  offers "Try an example" here — that belongs to the request empty state.)
- **Pretty ↔ Raw** toggles formatting; JSON is re-indented in pretty mode.
- **Download** saves the raw body; **Copy** copies the body text.
- Long/wide bodies scroll inside their own container; the panel is vertically resizable against the
  editor via the drag handle.

## States & edge cases

- A `status: 0` transport error still renders (with the error text) rather than blanking.
- Content type drives rendering (`detectType`): json/html/xml highlight, image inline, else
  text/binary.

## Test ids

`response-empty` (empty state), `response-status` (status text), `response-body` (rendered body
container). Scope to `:visible` since inactive tabs keep their panel mounted.

## Key files

`components/ResponsePanel.tsx`, `types.ts` (`ApiResponse`), shared syntax vars in
`src/styles/index.css`.
