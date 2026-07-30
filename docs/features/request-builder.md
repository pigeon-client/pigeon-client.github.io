# Request Builder

## Overview

Owns the workspace: tab strip, URL bar, and request editors (Params / Auth / Headers / Body).
A **tab** is one request being composed plus its last response. This is the primary surface
users live in while calling APIs.

## Problem / job to be done

Users need a fast, Postman-like composer that stays readable with long URLs, many headers, and
environment tokens — without layout blowouts, stuck scrollbars, or losing sync between URL query
and Params.

## User stories

- As an API consumer, I want multiple request tabs so I can work on several calls without losing
  state.
- As a developer, I want the URL bar and Params editor to stay in sync so I never edit the same
  query twice.
- As a developer, I want to paste a long URL or JWT-sized header value and still scroll/edit it.
- As a developer, I want to paste `curl …` into the URL bar and get a fully populated request.
- As a power user, I want keyboard shortcuts for new/close/send/save/switch tabs.

## Functional requirements

1. Tab strip: create, rename (manual lock), close, duplicate, close others/all; method-colored label.
2. URL bar: method dropdown (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, QUERY), URL field with
   syntax tint, Send.
3. Editor tabs: Params, Auth, Headers, Body — with content badges/dots.
4. Auth types: none / bearer / basic / api-key (header or query — injected at send).
5. Real-time URL ↔ Params sync on every keystroke; on send, params are authoritative when present.
6. Key/value rows (Params/Headers): enable checkbox, key, value, delete; blank trailing row plus
   explicit **Add param** / **Add header** buttons.
7. Body types per [content-types.md](./content-types.md); GET/HEAD never send a body; body
   word-wrap toggle shares `pg_word_wrap`.
8. cURL paste/type into URL bar applies method/headers/auth/body/params with toast.
9. `{{var}}` autocomplete in URL, KV values, and body text.
10. Long URL / long KV values remain editable via native horizontal scroll + overlay sync.
11. Headers/Params lists taller than the panel scroll vertically inside the editor pane.

## Non-functional requirements

- **Layout**: URL shell and KV cells use `min-w-0` so flex children shrink; no page-level overflow
  from long strings.
- **Performance**: typing in URL/Params stays responsive; overlay scroll sync on rAF after text change.
- **Accessibility**: method trigger and KV checkboxes expose roles/labels; Send reachable by `⌘↵`.

## Acceptance criteria

- [ ] New tab via `+` or `⌘⇧N` shows editor (not a blank/hidden workspace).
- [ ] Typing `?a=1&b=2` in the URL fills Params; editing Params rewrites the URL query.
- [ ] URL ≥ ~2KB: caret, End key, and horizontal wheel reach the end; tint overlay stays aligned.
- [ ] Headers: 20+ rows → vertical scrollbar scrolls the list; long value scrolls horizontally.
- [ ] Disabled param excluded from URL query and from send payload.
- [ ] Manual rename locks tab name; clearing rename restores auto path name.
- [ ] `curl ` paste into URL bar populates request and shows toast.
- [ ] Method QUERY / OPTIONS selectable; GET/HEAD body not sent.
- [ ] Empty URL on active tab → empty state with **Try an example** only (no separate New Request CTA).

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

- `⌘⇧N` new tab · `⌘⇧W` close tab · `⌘⇧1–9` switch tab N
- `⌘↵` send · `⌘⇧S` save to collection
- `⌘F` contextual find: in the Body editor / response panel it opens an in-panel find bar;
  anywhere else it focuses the header search
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
