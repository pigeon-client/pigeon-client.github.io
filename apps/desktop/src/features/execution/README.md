# execution

Turns a `RequestConfig` into a normalized `ApiResponse`. Knows how requests are sent;
nothing downstream does.

## Public API (`index.ts`)
- `useApiRequest()` — React hook; sends the active request, auto-saves draft + history
- `sendRequest`, `resolveRequest` — framework-free send + env/auth/param resolution
- `HttpClient`, `HttpRequest` (types) — transport seam
- `ApiResponse` (type) — the normalized response every viewer depends on

## Layered shape
`ports/HttpClient.ts` is the transport interface. `services/TauriHttpClient.ts` is the
only impl (thin `invoke("send_api_request")` wrapper — Rust owns the actual HTTP).
Swap the impl for tests or a web transport without touching `requestService`.

## Consumes
`@/features/environments` (var resolution), `@/features/history` (auto-save types),
`@/shared/*`.

## Extend
New transport = new `HttpClient` impl. Keep request/response shaping in `requestService`,
not in the client.
