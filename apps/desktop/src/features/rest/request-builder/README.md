# request-builder

Owns the workspace tabs and the request-editing UI. A "tab" is one request being
composed, plus its last response.

## Public API (`index.ts`)
- `useTabStore` — tab lifecycle (add/close/rename), active tab, per-tab request + response
- `Tab` (type)
- `UrlBar` — method + URL + Send (uses `hooks/useSendRequest.ts` to send)
- `RequestEditor` — Params / Headers / Body / Auth editor
- `KeyValueEditor` — reusable key/value grid (also used by environments)
- `TabStrip`, `EmptyRequestState` — tab bar + no-request placeholder

## Consumes
`@/core/http` (pure send/transport, via `useSendRequest`), `@/features/rest/history`
(`useSendRequest` auto-saves draft + history after a send), `@/features/environments`
(var resolution in UrlBar), `@/features/rest/import-export` (paste-cURL), `@/shared/*`.

## Extend
Add a new body/auth mode inside `components/`. New per-tab state goes in `store.ts`
(narrow selectors — every field is hit on each keystroke).
