# response-viewer

Renders an `ApiResponse`. Pretty/raw body, syntax highlight, headers, image/binary,
download, copy-as-cURL.

## Public API (`index.ts`)
- `ResponsePanel`

## Consumes
`@/features/execution` (`ApiResponse` type only — it must not know how the request was
sent), `@/features/request-builder` (reads the active tab's response),
`@/features/import-export` (copy as cURL), `@/shared/ui`.

## Extend
Add a body renderer in `components/ResponsePanel.tsx`, keyed off content-type detection.
