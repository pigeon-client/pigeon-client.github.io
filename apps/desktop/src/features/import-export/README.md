# import-export

cURL in and out.

## Public API (`index.ts`)
- `ImportModal`
- `RequestModel` and related request-model types
- `importCurl(text)` — cURL → `RequestModel | null`
- `parseCurl(text)` — cURL → `Partial<RequestConfig> | null`
- `generateCurl(config)` — `RequestConfig` → cURL string
- `requestModelToRequestConfig(model)` / `requestConfigToRequestModel(config)`

Export is a direct clipboard copy, not a modal — the header cURL button calls
`generateCurl()` and writes straight to `navigator.clipboard`. See
`src/app/AppContent.tsx` (`handleExportCurl`) and `src/app/layout/Header.tsx`.

## Architecture
`RequestModel` is the stable import/export boundary. Parser details stay behind services:

- `services/curlImporter.ts` uses `curlconverter.toJsonObject()` and maps output into
  `RequestModel`.
- `services/requestModelAdapter.ts` maps between `RequestModel` and app `RequestConfig`.
- `services/curlService.ts` keeps the old `parseCurl()` API as a thin wrapper.

Do not depend on undocumented `curlconverter` parser AST. Add future importers by targeting
`RequestModel` first.

## Extend
Add a format (HTTPie, fetch) as a new `services/` importer/exporter, convert through
`RequestModel`, and export it from the barrel.
