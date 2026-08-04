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

- **Tab strip** — method (colored) + name, ✕ close, trailing `+`. Active highlighted; inactive
  tabs stay mounted but hidden (`display:none`).
- **URL bar** — method dropdown, syntax-tinted URL (scheme muted, host normal, path accent, query
  muted), Send. `*` preserved as OPTIONS request-target (needs `Host` on desktop send).
- **Editor tabs** — count badge / body dot when content present.
- **Empty state** (`EmptyRequestState`) — headline "No request open"; single CTA **Try an example**;
  keyboard hints. Shown when the **active tab has no URL** (tabs still exist).

## UX / interactions

- **Tab name — auto vs manual.** Auto name tracks URL path until double-click rename locks
  (`nameLocked`). Clearing rename input reverts to auto. Lock persists with the request.
- **URL ↔ Params.** Query in URL ↔ Params live; send drops URL query when params exist to avoid
  duplication; raw query with empty params still sends as typed.
- **cURL paste/type.** `curl …` → parse apply + toast. Import modal opens result in a **new** tab.
- **Key/value rows.** Checkbox enable, key, value, trash; blank trailing row + Add button.
- **Long values.** Transparent input + tint overlay; `scrollLeft` synced (same pattern as URL bar).
  Wheel / shift+wheel scrolls horizontally when content overflows.
- **Body wrap.** `body-wrap-toggle` shares preference with response viewer.

## Keyboard

- `⌘⇧N` new tab · `⌘⇧W` close tab · `⌘⇧1–9` switch tab N
- `⌘↵` send · `⌘⇧S` save to collection
- `⌘F` contextual find: in the Body editor / response panel it opens an in-panel find bar;
  anywhere else it focuses the header search
- Double-click tab label → rename (Enter commit, Esc cancel)
- Right-click tab → New / Duplicate / Close / Close Other / Close All

## States & edge cases

- **No URL on active tab** → empty-request state ("No request open" + Try an example).
- Auto-close pairs in Body write through React's native setter so highlight updates.
- Disabled params excluded from URL query and sent request.
- Suggestion dropdowns for header keys must not trap vertical scroll of the list.
- Unresolved env vars surface via `send-error` under the URL bar.
- Inactive tab panels remain in DOM — testids need `:visible`.

## Manual test checklist

- [ ] Create 3 tabs; switch with click and `⌘⇧1–3`; close middle tab.
- [ ] Rename tab; change URL path — name stays locked; clear rename — unlocks.
- [ ] Clear URL → empty state shows Try an example only.
- [ ] Paste long URL (~3KB); End key + horizontal scroll; overlay matches caret.
- [ ] Paste URL with query → Params filled; edit value → URL updates.
- [ ] Headers: add 25 rows; scroll vertically to last row.
- [ ] Headers: paste long Bearer token; scroll horizontally; `{{token}}` tint tracks scroll.
- [ ] Disable a param; confirm removed from URL; re-enable.
- [ ] Auth: bearer / basic / api-key (header + query).
- [ ] Body wrap toggle; preference matches Settings / response wrap.
- [ ] Switch method through all options including QUERY; Send on GET with body text — body not sent.
- [ ] Paste `curl -X POST …` into URL bar — method/headers/body applied + toast.
- [ ] Right-click tab → Duplicate / Close Other / Close All.

## Automation coverage

- Vitest: `src/features/rest/request-builder/store.test.ts`, `src/shared/lib/url.test.ts`,
  `src/shared/lib/httpMethod.test.ts`.
- Playwright: `e2e/tabs.spec.ts`, `e2e/url-params.spec.ts`, `e2e/method-and-actions.spec.ts`,
  `e2e/body-editor.spec.ts`.
- `e2e/long-values.spec.ts` — ~3KB URL End-key + horizontal scroll, 600+ char header value
  End-key + horizontal scroll, 25 header rows scroll-to-last-row (all no-layout-break asserted).

## Test ids

`url-input`, `method-trigger`, `method-option-<METHOD>`, `data-send-btn` (attribute),
`send-error`, `env-token`, `editor-tab-params|auth|headers|body`, `param-key-<i>`,
`param-value-<i>`, `header-key-<i>`, `header-value-<i>`, `body-wrap-toggle`.
Workspace tabs: `role="tab"`. Scope `url-input` / `method-trigger` to `:visible`.

## Key files

`components/TabStrip.tsx`, `components/UrlBar.tsx` (+ `MethodSelector.tsx`, `MethodOption.tsx`,
`TokenChip.tsx`, `UrlBarStatusLine.tsx`), `components/RequestEditor.tsx`,
`components/BodyEditor.tsx` (+ `BodyTypeSelector.tsx`, `BinaryFilePane.tsx`, `HighlightLayer.tsx`,
`LineNumbers.tsx`, `lib/bodyEditorHelpers.ts`), `components/HeadersEditor.tsx`,
`components/AuthEditor.tsx`, `components/EmptyRequestState.tsx`, `store.ts`,
`hooks/useAutoClose.ts`, `hooks/useSendRequest.ts` (send + history/draft orchestration — see
[execution.md](./execution.md)). `KeyValueEditor` itself now lives in `shared/ui/KeyValueEditor/`
(shared with MCP's headers editor), not in this feature.

## Open risks

- Overlay `scrollLeft` sync can desync if rAF missed after huge paste — re-check after paste.
- **Fixed (2026-07-26):** header key suggestion dropdown now caps at `max-h-[220px]` with internal
  `overflow-y-auto` (was unbounded `overflow-hidden`) — safe if the `COMMON_HEADERS` catalog grows.
- **Fixed (2026-07-26):** the URL bar's `{{token}}` hover-preview regression from commit `9af2269`
  is closed — see `docs/features/environments.md` Open risks for detail.
- Long-URL / long-value overflow historically regressed; now covered by `e2e/long-values.spec.ts`
  as a permanent regression guard.
