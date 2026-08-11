# Import / Export

## Overview

Interop with terminals and other API clients:

1. **cURL import** — paste into the URL bar (current tab) or Import modal (new tab).
2. **Postman Collection v2.1** — paste or upload JSON → new collection in the Collections tree.
3. **Copy as cURL** — header button writes the active HTTP request to the clipboard.

Stable interchange model: `RequestModel`.

## Problem / job to be done

Users live in terminals, docs, and Postman. Pigeon must import without losing method/headers/auth/
body semantics and export something pasteable back.

## User stories

- As a developer, I want to paste `curl …` into the URL bar and get a filled request.
- As a developer, I want an Import modal that opens a parsed cURL in a **new** tab.
- As a developer, I want to import a Postman Collection v2.1 export into Collections.
- As a developer, I want Copy as cURL for the active request.

## Functional requirements

### cURL

1. URL-bar `curl ` detection → parse → apply to **current** tab + toast.
2. Import modal (mode `curl`) → parse → **new** tab via caller `onImportRequest`.
3. Adapters: `curlImporter` / `curlService.parseCurl` → `RequestModel` →
   `requestModelAdapter` → `RequestConfig`; `generateCurl` reverse.
4. Do not depend on undocumented curlconverter AST.

### Postman

5. Import modal (mode `postman`) accepts pasted JSON or `.json` file upload.
6. `parsePostmanCollection` → `importCollection(name, root)` on the collections store.
7. Maps common auth (bearer / basic / apikey) and body modes into Pigeon trees.
8. Invalid / non-v2.1 JSON shows a clear error; no crash.

### Export

9. Header Copy as cURL → clipboard; disabled without active HTTP request or on coming-soon
   workbenches; temporary "Copied!" state (~2s).

## Non-functional requirements

- Parse errors surface in modal; bad URL-bar paste must not wipe unrelated state blindly.
- New formats (HTTPie, fetch) should target `RequestModel` first.

## Acceptance criteria

- [ ] Paste curl with `-H`, `-d`, `-X` → matching method/headers/body.
- [ ] Import modal cURL opens **new** tab; URL-bar paste stays on **current** tab.
- [ ] Postman v2.1 paste/upload creates a collection visible under Collections.
- [ ] Copy as cURL round-trips major body modes (JSON, urlencode, multipart, binary metadata).
- [ ] Non-curl paste in URL bar treated as URL/text, not force-parsed as curl.
- [ ] Invalid Postman JSON → error string, modal stays open.

## UI

```
Import modal
┌─────────────────────────────────────┐
│ [ cURL | Postman Collection ]       │
│ textarea / file upload              │
│ live preview (method+URL or counts) │
│ [ Import ]                          │
└─────────────────────────────────────┘
```

Centered **Modal** (not a drawer). Title switches with mode: "Import from cURL" /
"Import Postman Collection".

## UX / interactions

- Mode toggle clears the error state.
- Postman file input reads as text via `FileReader`.
- Sidebar **Import** opens the modal (default mode cURL).

See also URL-bar cURL handling in [request-builder.md](./request-builder.md).

## Keyboard

No unique shortcut beyond opening Import from the sidebar control.

## States & edge cases

- Spaced non-URL pastes left alone; `?` query paste syncs Params when plain URL.
- Multipart file parts: metadata in model; live files may not survive export the same way.
- Postman items without URL may be skipped or imported as empty — verify importer behavior when
  extending.

## Manual test checklist

- [ ] URL-bar paste curl GET with headers.
- [ ] URL-bar paste curl POST JSON.
- [ ] Import modal cURL → new tab.
- [ ] Import modal Postman → collection appears; open a request.
- [ ] Upload Postman file via file picker.
- [ ] Invalid curl / invalid Postman → error, no crash.
- [ ] Copy as cURL → paste in terminal — looks valid.
- [ ] Round-trip: import curl → tweak → copy → re-import.

## Automation coverage

- Vitest: `curlRoundtrip.test.ts`, `requestModelAdapter.test.ts`, `postmanImporter.test.ts`.
- Playwright: `e2e/import-curl.spec.ts` (URL-bar + modal; invalid curl).

## Test ids

| Id | Surface |
|----|---------|
| `sidebar-import` | Opens modal |
| `import-mode-curl` / `import-mode-postman` | Mode toggle |
| `import-curl-textarea` / `import-curl-submit` | cURL flow |
| `import-postman-textarea` / `import-postman-upload` / `import-postman-submit` | Postman flow |

Copy button via `title="Copy as cURL"` / `title="Copied!"`.

## Key files

- `components/ImportModal.tsx`
- `services/curlImporter.ts`, `services/curlService.ts`
- `services/postmanImporter.ts`
- `services/requestModelAdapter.ts`
- `lib/generateCurl.ts`
- `model/RequestModel.ts`
- Header wiring: `AppContent.tsx` / `Header.tsx`

## Open risks

- curlconverter edge flags may not map 1:1 — document unsupported flags when found.
- Binary `@file` paths differ desktop vs browser.
- Postman folder auth/event scripts are out of scope; only structural request data is imported.
