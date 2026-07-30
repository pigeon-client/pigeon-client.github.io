# Import / Export (cURL)

## Overview

cURL in and out: paste/import a command to build a request; copy any request back to cURL.
Stable interchange model: `RequestModel`.

## Problem / job to be done

Users live in terminals and docs full of curl. Pigeon must import without losing method/headers/body
semantics and export something pasteable back.

## User stories

- As a developer, I want to paste `curl …` into the URL bar and get a filled request.
- As a developer, I want an Import modal that opens the result in a **new** tab.
- As a developer, I want Copy as cURL for the active request.

## Functional requirements

1. URL-bar `curl ` detection → parse → apply to **current** tab + toast.
2. Import modal → parse → **new** tab.
3. Copy as cURL → clipboard; disabled without active request; temporary "Copied!" state.
4. Adapters: `curlImporter` → `RequestModel` → `requestModelAdapter` → `RequestConfig`;
   `generateCurl` reverse. Do not depend on undocumented curlconverter AST.

## Non-functional requirements

- Parse errors surface in modal; bad paste in URL bar should not wipe unrelated state blindly.
- New formats (HTTPie, fetch) should target `RequestModel` first.

## Acceptance criteria

- [ ] Paste curl with `-H`, `-d`, `-X` → matching method/headers/body.
- [ ] Import modal opens new tab; URL-bar paste stays on current tab.
- [ ] Copy as cURL round-trips major body modes (JSON, urlencode, multipart, binary).
- [ ] Non-curl paste treated as URL/text, not force-parsed as curl.

## UI

- Import modal: textarea, live preview (method + URL), Import Request.
- Header icon: Copy as cURL → check "Copied!" ~2s.

## UX / interactions

See also URL-bar cURL handling in [request-builder.md](./request-builder.md).

## Keyboard

No unique shortcut beyond opening Import from sidebar control.

## States & edge cases

- Spaced non-URL pastes left alone; `?` query paste syncs Params when plain URL.
- Multipart file parts: metadata in model; live files may not survive export the same way.

## Manual test checklist

- [ ] URL-bar paste curl GET with headers.
- [ ] URL-bar paste curl POST JSON.
- [ ] Import modal same command → new tab.
- [ ] Copy as cURL → paste in terminal/docs — looks valid.
- [ ] Invalid curl in modal → error, no crash.
- [ ] Round-trip: import → tweak → copy → re-import.

## Automation coverage

- Vitest: `curlRoundtrip.test.ts`, `requestModelAdapter.test.ts`.
- Playwright: `e2e/import-curl.spec.ts` — URL-bar + modal parse, and an invalid-curl-in-modal
  error-not-crash case (2026-07-26 QA pass).

## Test ids

`sidebar-import`, `import-curl-textarea`, `import-curl-submit`. Copy button via
`title="Copy as cURL"` / `title="Copied!"`.

## Key files

`components/ImportModal.tsx`, `services/curlImporter.ts`, `services/requestModelAdapter.ts`,
`services/curlService.ts`, `lib/generateCurl.ts`, `model/RequestModel.ts`; header wiring in
`AppContent.tsx` / `Header.tsx`.

## Open risks

- curlconverter edge flags may not map 1:1 — document unsupported flags when found.
- Binary `@file` paths differ desktop vs browser.
