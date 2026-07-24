# Request Builder

Owns the workspace: the tab strip, the URL bar, and the request editors. A **tab** is one request
being composed plus its last response.

## UI

```
┌ Tab strip ─────────────────────────────────────────────┐
│ GET /users ✕ │ POST login ✕ │ + │                       │
├ URL bar ───────────────────────────────────────────────┤
│ [GET ▾] https://{{baseUrl}}/users?q=1        [ Send ➤ ] │
├ Editor tabs ───────────────────────────────────────────┤
│ Params ² · Auth · Headers ¹ · Body ●                    │
│ ─────────────────────────────────────────────────────  │
│ ☑ key            value                             🗑    │
└────────────────────────────────────────────────────────┘
```

- **Tab strip** — each tab shows its method (colored) + name, an ✕ close, and a trailing `+` to
  add a tab. The active tab is highlighted; inactive tabs stay mounted but hidden.
- **URL bar** — method dropdown (color-coded: GET, POST, PUT, PATCH, DELETE, HEAD,
  OPTIONS, QUERY), URL field with syntax tint (scheme muted, host normal, path in accent,
  query muted), and the Send button. GET/HEAD never send a body. `*` is preserved as an
  OPTIONS request-target (requires a `Host` header on send in the desktop app).
- **Editor tabs** — Params, Auth, Headers, Body. Each shows a count badge or dot when it has
  content (`Params²`, `Headers¹`, `Body●`). Body supports JSON, Raw (HTML/CSV/XML/YAML/NDJSON/
  Problem Details/GraphQL/SSE/text), Form Data, URL Encoded, and Binary (PDF/ZIP/protobuf/
  msgpack/image/audio/video). See `docs/features/content-types.md`.

## UX / interactions

- **Tab name — auto vs manual.** A new tab's name is auto-derived from the URL path and follows it
  as you type (`/users` → `/user`). Double-click a tab to rename; a manual name **locks** and no
  longer tracks the path. Clearing the rename input reverts to auto. The lock (`nameLocked`) is
  persisted with the request, so it survives save/reload.
- **URL ↔ Params real-time sync.** Typing a query string (`?a=1&b=2`) populates the Params editor
  live, on every keystroke; editing a param rewrites the URL's query. The query stays visible in
  the URL. On send, params are authoritative (the URL's own query is dropped to avoid duplication),
  but a raw query with no params is still sent as typed.
- **cURL paste/type.** Pasting or typing a `curl …` command into the URL bar parses method,
  headers, auth, body, and params and applies them (a toast confirms). Import via the modal opens
  the result in a **new** tab.
- **Method dropdown.** Click to open; pick a method; the trigger + tab color update.
- **Key/value rows.** Params/Headers use a checkbox (enabled), key, value, and a trash button. A
  blank trailing row auto-appears so there's always somewhere to type.

## Keyboard

- `⌘N` new tab · `⌘W` close tab · `⌘⇧1–9` switch to tab N
- `⌘↵` send · `⌘S` save to collection · `⌘F` focus sidebar search
- Double-click tab label → rename (Enter commit, Esc cancel)
- Right-click tab → New Request / Duplicate Request / Close Tab / Close Other / Close All

## States & edge cases

- **No URL** → the panel shows the empty-request state ("No request open", New Request / Try an
  example) instead of the editor + response.
- Auto-close pairs (`"`, `{`, …) in the Body editor write through React's native setter so the
  highlight overlay updates immediately.
- Disabled params are excluded from both the URL query and the sent request.

## Test ids

`url-input`, `method-trigger`, `method-option-<METHOD>` (e.g. `method-option-POST`),
`data-send-btn` (attribute), `editor-tab-params|auth|headers|body`, `param-key-<i>`,
`param-value-<i>`. Workspace tabs expose `role="tab"`; scope `url-input` / `method-trigger` to
`:visible`.

## Key files

`components/TabStrip.tsx`, `components/UrlBar.tsx`, `components/RequestEditor.tsx`,
`components/KeyValueEditor.tsx`, `components/BodyEditor.tsx`, `store.ts`, `hooks/useAutoClose.ts`.
