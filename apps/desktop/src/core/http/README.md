# core/http

Turns a `RequestConfig` into a normalized `ApiResponse`. Knows how requests are sent;
nothing downstream does. Pure transport — no auto-save/history side effects (that
orchestration lives in `features/rest/request-builder/hooks/useSendRequest.ts`, which wraps
`sendRequest` from here with draft/history writes).

## Public API (`index.ts`)
- `sendRequest`, `resolveRequest` — framework-free send + env/auth/param resolution
- `HttpClient`, `HttpRequest` (types) — transport seam
- `ApiResponse` (type) — the normalized response every viewer depends on
- `SseEvent`, `SseMeta`, `SseParser`, `isEventStreamContentType`, `sseEventsToBody` — SSE support
- `beginTabStream`, `cancelTabStream`, `endTabStream`, `getTabStreamId`, `cancelSseStream` — per-tab
  stream lifecycle
- `Resolver`, `UnresolvedVariablesError` — re-exported from `@/core/interpolation` for callers that
  only need the http-adjacent pieces

## Layered shape
`ports/HttpClient.ts` is the transport interface. `services/{Tauri,Browser}HttpClient.ts` are the
two impls, picked via `@/core/platform`'s `selectImpl`. Swap the impl for tests or a new transport
without touching `requestService`.

## Consumes
`@/core/interpolation` (`createAccumulatingResolver`, `UnresolvedVariablesError`),
`@/core/platform` (`selectImpl`), `@/shared/*`. Core never imports features — auto-save/history
integration is the caller's job (see `useSendRequest`).

## Extend
New transport = new `HttpClient` impl. Keep request/response shaping in `requestService`,
not in the client.
