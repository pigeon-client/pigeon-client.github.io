# Import / Export (cURL)

cURL in and out. Paste a command to build a request; copy any request back to cURL.

## UI

- **Import modal** — opened from the sidebar Import button. A textarea for the cURL command, a live
  parse preview (method + URL), and an **Import Request** action.
- **Copy as cURL** — an icon button in the header; flips to a check ("Copied!") for ~2s on success.

## UX / interactions

- **Paste/type into the URL bar** — a `curl …` command is detected and parsed inline (method,
  headers, auth, body, params applied) with a confirmation toast. No modal needed.
- **Import modal** — parses the pasted command and opens the result in a **new** tab.
- **Copy as cURL** — generates a cURL string from the active request and writes it to the clipboard
  (disabled when there's no active request).

## Architecture (interchange)

`RequestModel` is the stable import/export boundary. Parser/library details stay behind adapters:

- `curlImporter.ts` — cURL → `RequestModel` (via `curlconverter`).
- `requestModelAdapter.ts` — `RequestModel` ↔ app `RequestConfig`.
- `curlService.ts` — `parseCurl()` compatibility wrapper (cURL → `Partial<RequestConfig>`).
- `generateCurl.ts` — `RequestConfig` → cURL string.

New formats (HTTPie, fetch) should target `RequestModel` first, then adapt.

## States & edge cases

- Non-cURL text pasted into the URL bar is treated as a plain URL, not parsed as a command.
- Import surfaces a parse error in the modal when the command can't be understood.

## Test ids

`sidebar-import` (open modal), `import-curl-textarea`, `import-curl-submit`. The header copy button
uses `title="Copy as cURL"` → `title="Copied!"` on success.

## Key files

`components/ImportModal.tsx`, `services/curlImporter.ts`, `services/requestModelAdapter.ts`,
`services/curlService.ts`, `lib/generateCurl.ts`, `model/RequestModel.ts`. Copy-as-cURL is wired in
`src/app/AppContent.tsx` + `src/app/layout/Header.tsx`.
