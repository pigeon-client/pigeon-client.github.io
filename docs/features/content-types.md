# Content types & body formats

Pigeon treats request `bodyType` as the Content-Type media type (curl `-H 'Content-Type: …'`),
except `none` and multipart (boundary set by the client). Catalog lives in
`apps/desktop/src/shared/lib/contentType.ts`.

Aligned with [curl manpage](https://curl.se/docs/manpage.html) body flags:
`-d` / `--data-raw`, `--data-urlencode`, `--data-binary @file`, `-F` multipart.

## Request body UI

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
| XML | `text/xml` / `application/xml` | RFC 7303 |
| YAML | `application/yaml` / `text/yaml` | RFC 9512 |
| NDJSON | `application/x-ndjson` | ndjson.org |
| Problem Details | `application/problem+json` | RFC 9457 |
| GraphQL | `application/graphql` | GraphQL Foundation |
| GraphQL JSON | `application/graphql+json` | GraphQL Foundation |
| SSE | `text/event-stream` | WHATWG HTML §9.2 |

### Binary formats

Octet-stream (RFC 2046), PDF (RFC 8118), ZIP, Protobuf, MessagePack, JPEG/PNG/GIF/WebP/SVG/AVIF,
MP4/WebM/Ogg/QuickTime, MP3/WAV/Ogg/AAC/WebM audio. Picking a file while on generic
`application/octet-stream` adopts `file.type` when it matches the catalog.

## Response rendering

`classifyResponse(contentType)` picks a render kind:

- **JSON / Problem Details / GraphQL+JSON** — pretty JSON
- **NDJSON** — per-line JSON pretty
- **HTML / CSV / YAML / text** — highlighted / plain text; **HTML** also has a Preview mode
  (sandboxed iframe) when `Content-Type` is `text/html`
- **SSE** — live event list
- **Image / SVG** — `<img>`
- **Audio / Video** — native players
- **PDF** — iframe preview
- **ZIP / Protobuf / MessagePack / octet** — download affordance

Unknown `+json` / `+xml` / `+yaml` suffixes follow RFC 6838 structured-syntax heuristics.

## Send path notes

- Desktop (Rust) sets `Content-Type` from `bodyType` unless the user already set the header.
- Browser transport does the same (parity with curl / Rust).
- GET/HEAD never send a body (RFC 9110), matching curl export.
- Binary wire format from the UI is comma-joined u8 decimals → `Vec<u8>` / `Uint8Array`.
- cURL export: `--data-raw` for text, `--data-urlencode` for forms, `-F` for multipart,
  `--data-binary @file` for binary.
