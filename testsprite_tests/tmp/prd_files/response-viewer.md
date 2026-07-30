# Response Viewer

## Overview

Renders an `ApiResponse`: status bar, pretty/raw (and HTML preview) body, response headers,
image/binary/media handling, download, copy-as-cURL, status-specific empty bodies, and SSE streams.

## Problem / job to be done

After send, users must understand status, timing, size, and body — including empty responses,
errors (`status: 0`), HTML, and live SSE — without the panel stealing layout from the editor.

## User stories

- As a developer, I want colored status + timing/size so I can triage failures quickly.
- As a developer, I want Pretty/Raw (and HTML Preview) toggles for inspection.
- As a developer, I want long JSON to scroll inside the response pane, not the whole window.
- As a developer, I want SSE events listed live with a Stop control.

## Functional requirements

1. Status bar: colored status, text, timing, size, Pretty/Raw/(Preview), word-wrap toggle,
   **Copy as cURL**, download.
2. Body / Headers tabs for payload vs response headers.
3. Content-type driven rendering via `detectType` / `classifyResponse`.
4. Empty body with non-zero status → status-specific placeholder (not blank).
5. Pre-send empty state: URL present → "Ready to send" + Send CTA; no URL → "No response yet" /
   "Enter a URL above".
6. SSE: live event list, newest on top, Stop control.
7. Panel vertically resizable against the request editor.
8. Word wrap preference shared with body editor via `pg_word_wrap`.

## Non-functional requirements

- Syntax colors from CSS vars (theme-aware `highlight.js`).
- HTML Preview sandboxed (`sandbox=""` — no scripts/forms).
- Select-all (`⌘A`) scoped to response body when focused in that pane.

## Acceptance criteria

- [ ] 2xx/3xx/4xx/5xx colors correct; `status: 0` shows error placeholder.
- [ ] Pretty JSON indents; Raw shows original text.
- [ ] HTML → Preview default; scripts do not execute in iframe.
- [ ] Tall body scrolls inside response container; editor still usable.
- [ ] Empty 204/404 placeholders appear when body length is 0.
- [ ] SSE stream appends events; Stop halts stream.
- [ ] Status-bar copy writes **cURL** (not raw body); toast confirms.
- [ ] Word-wrap toggle flips wrapping; preference survives reload.

## UI

```
┌ Status bar ────────────────────────────────────────────┐
│ ● 200 OK │ 38 ms │ 1.2 KB │  [Pretty/Raw] [wrap] [cURL] [⇩] │
├ Body ─ Headers ────────────────────────────────────────┤
│ { … }                                                   │
└────────────────────────────────────────────────────────┘
```

## UX / interactions

- Empty state: URL present → **Send request**; no URL → enter URL hint.
- **Download** saves raw body.
- **Copy as cURL** generates curl from the active request (same as header export) and toasts
  "Copied cURL to clipboard".
- Word-wrap toggle (`response-wrap-toggle`) shares `pg_word_wrap` with the body editor.

## Keyboard

Response-focused `⌘A` selects body content only (when handler active).

## States & edge cases

- `status: 0` ≠ pre-send empty.
- Image/SVG inline; audio/video players; PDF iframe; ZIP/protobuf/msgpack → download affordance.
- Inactive tab still mounts panel — scope testids `:visible`.

## Manual test checklist

- [ ] Mock 200 JSON — pretty + raw; Copy as cURL pastes a curl string.
- [ ] Mock 404 empty body — placeholder, not blank code pane.
- [ ] Mock HTML — Preview sandboxed; Pretty shows source.
- [ ] Huge JSON — vertical scroll only in response pane.
- [ ] Toggle word wrap on/off; reload — preference kept.
- [ ] Response Headers tab lists headers; long values readable/scrollable.
- [ ] SSE mock/stream — events appear; Stop works (desktop).
- [ ] Drag resize handle between editor and response.

## Automation coverage

- Playwright: `e2e/send.spec.ts` (`response-status`, `response-body`, `response-empty`).
- Vitest: SSE parsing in `execution/lib/sse.test.ts`.

## Test ids

`response-empty`, `response-empty-body`, `response-status`, `response-body`,
`response-html-preview`, `response-view-preview|pretty|raw`, `response-wrap-toggle`,
`response-sse`, `response-sse-stop`, `response-sse-event-<i>`. Scope `:visible`.

## Key files

`components/ResponsePanel.tsx`, `components/StatusEmptyBody.tsx`, `components/SseEventList.tsx`,
execution SSE helpers; word wrap via `settings/lib/wordWrap.ts` + `hooks/useWordWrap.ts`;
theme vars in `src/styles/index.css`.

## Open risks

- Very wide unwrapped lines need horizontal scroll when word-wrap off.
- SSE E2E coverage may be thin — prefer manual/desktop for long-lived streams.
- Dual Copy-as-cURL (header + response bar) can confuse — both copy request curl, not body.
