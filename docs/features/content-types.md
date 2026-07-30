# Content types & body formats

## Overview

Defines how Pigeon maps UI body modes to HTTP `Content-Type` (and curl flags), and how responses
are classified for rendering. Catalog: `apps/desktop/src/shared/lib/contentType.ts`.

## Problem / job to be done

Users send and inspect many media types (JSON, multipart, binary, SSE, GraphQL). The product must
pick the right wire format and response renderer without surprising curl/desktop/browser parity gaps.

## User stories

- As a developer, I want to pick JSON / form / binary / raw formats without hand-writing headers
  every time.
- As a developer, I want response rendering to match `Content-Type` (pretty JSON, HTML preview, SSE).
- As a developer, I want cURL export/import to preserve body semantics (`-d`, `-F`, `--data-binary`).

## Functional requirements

1. Request `bodyType` drives Content-Type except `none` and multipart (boundary by client).
2. UI modes: None, JSON, Raw (submenu), Form Data, URL Encoded, Binary (submenu).
3. GET/HEAD never send a body (RFC 9110), matching curl export.
4. Desktop and browser send paths set Content-Type from `bodyType` unless user already set header.
5. Response `classifyResponse(contentType)` selects render kind (JSON, HTML preview, SSE, media…).
6. Unknown `+json` / `+xml` / `+yaml` suffixes follow RFC 6838 structured-syntax heuristics.

## Non-functional requirements

- Catalog stays single-sourced in `contentType.ts` (no hardcoded CT strings in UI).
- Binary wire format: comma-joined u8 decimals ↔ `Vec<u8>` / `Uint8Array`.

## Acceptance criteria

- [ ] Each UI body mode sets expected Content-Type on send (unless overridden by Headers).
- [ ] Multipart sends boundary; URL-encoded serializes key/values.
- [ ] Binary file pick on octet-stream adopts `file.type` when catalog matches.
- [ ] HTML response offers Preview | Pretty | Raw; Preview is sandboxed (`sandbox=""`).
- [ ] SSE `text/event-stream` uses event list UI.
- [ ] cURL export uses `--data-raw` / `--data-urlencode` / `-F` / `--data-binary @file` appropriately.

## UI

| UI | Content-Type / behavior | Spec |
|----|-------------------------|------|
| None | no body | — |
| JSON | `application/json` | RFC 8259 |
| Raw ▾ | see raw formats below | — |
| Form Data | `multipart/form-data` (+ boundary) | RFC 7578 |
| URL Encoded | `application/x-www-form-urlencoded` | WHATWG URL |
| Binary ▾ | file bytes + chosen media type | — |

### Raw formats

| Label | Media type | Spec |
|-------|------------|------|
| Plain Text | `text/plain` | RFC 2046 §4.1.3 |
| HTML | `text/html` | WHATWG HTML |
| CSV | `text/csv` | RFC 4180 |
| XML | `text/xml` | RFC 7303 |
| XML (app) | `application/xml` | RFC 7303 |
| YAML | `application/yaml` | RFC 9512 |
| YAML (text) | `text/yaml` | RFC 9512 |
| NDJSON | `application/x-ndjson` | ndjson.org |
| Problem Details | `application/problem+json` | RFC 9457 |
| GraphQL | `application/graphql` | GraphQL Foundation |
| GraphQL JSON | `application/graphql+json` | GraphQL Foundation |
| SSE | `text/event-stream` | WHATWG HTML §9.2 |

Raw/Binary pickers expose duplicate mime labels (e.g. XML vs XML (app), YAML vs YAML (text),
Protobuf vs Protobuf (x-)) so users can pick the exact media type.

### Binary formats

Octet-stream, PDF, ZIP, Protobuf / Protobuf (x-), MessagePack / MessagePack (x-), common
image/audio/video types. Picking a file while on generic `application/octet-stream` adopts
`file.type` when it matches the catalog.

Aligned with [curl manpage](https://curl.se/docs/manpage.html) body flags: `-d` / `--data-raw`,
`--data-urlencode`, `--data-binary @file`, `-F` multipart.

## UX / interactions

- Body tab mode switcher changes editor (textarea vs KV form vs file picker).
- Form Data supports file parts via paperclip in KV editor when enabled.
- Word-wrap toggle (`body-wrap-toggle`) for code editors; preference `pg_word_wrap`.
- `{{var}}` autocomplete available in text body editors.
- Response side: see [response-viewer.md](./response-viewer.md).

## Keyboard

Body editor uses normal text editing; auto-close pairs for brackets/quotes where enabled.

## States & edge cases

- Empty body + method that allows body → still valid send.
- User-set `Content-Type` header wins over `bodyType` default.
- NDJSON responses pretty-print per line.

## Manual test checklist

- [ ] Send JSON; inspect request Content-Type.
- [ ] Form Data with text + file field; verify multipart.
- [ ] URL Encoded two fields; verify serialization.
- [ ] Binary PDF upload; response PDF iframe when applicable.
- [ ] Import curl `-F` / `--data-binary` / `--data-urlencode` round-trip.
- [ ] Response HTML → Preview sandboxed (scripts do not run).
- [ ] Response `text/event-stream` → SSE list (or mock in browser).

## Automation coverage

- Vitest: `src/shared/lib/contentType.test.ts`, import-export curl round-trip tests (now including
  `--data-binary @file` export for PDF/binary body types, 2026-07-26 QA pass).
- Playwright: `e2e/body-editor.spec.ts` — includes URL Encoded → `application/x-www-form-urlencoded`
  wire verification (2026-07-26 QA pass; this also caught and fixed a real Content-Type bug, see
  `execution.md` Open risks).
- Not driven in the 2026-07-26 QA pass (needs real file-picker interaction): Form Data with an
  actual file field, binary PDF upload/response iframe. Verified by code reading only (`stripFiles`
  in `collections/store.ts` and `history/store.ts` strip live `File` handles before persisting).

## Test ids

`body-wrap-toggle`. Body mode controls and editors — see body-editor E2E helpers; response view
toggles in [response-viewer.md](./response-viewer.md).

## Key files

`src/shared/lib/contentType.ts`, `request-builder/components/BodyEditor.tsx`,
`import-export/lib/generateCurl.ts`, execution send path body serialization.

## Open risks

- Browser CORS may block real media/SSE endpoints in `pnpm dev`; prefer mocks in E2E.
- Catalog drift if UI adds a format without updating `contentType.ts` / curl export.
