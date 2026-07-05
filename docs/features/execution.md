# Execution

Turns a `RequestConfig` into a normalized `ApiResponse`. Owns *how* a request is sent; nothing
downstream knows the transport.

## UI

No screen of its own — surfaced through the **Send** button in the URL bar and the loading state
in the response panel. Send shows a spinner while in flight.

## UX / interactions

- **Send** (`⌘↵` or the button) resolves the request (interpolates `{{env}}` vars, injects auth,
  merges params into the URL) and dispatches it. The result populates the response panel and is
  auto-saved to history + drafts.
- **Auth injection** — Basic (`Authorization: Basic …`), Bearer, or API key (header or query),
  applied at send time so the editor stays declarative.
- **Body handling** — JSON / text / XML sent as-is; `x-www-form-urlencoded` serialized;
  `multipart/form-data` uses `FormData`; binary reads the file bytes.

## Transport (the important part)

A `HttpClient` port with two implementations, chosen by platform:

- **Tauri (desktop)** → `TauriHttpClient` → Rust `send_api_request` (`reqwest`). No CORS,
  supports redirects/SSL-verify/proxy options.
- **Browser (dev server / Playwright)** → `BrowserHttpClient` → `fetch`. Subject to CORS for real
  cross-origin APIs; E2E tests stub the network with route mocks. `sslVerify`/`proxyUrl` have no
  browser equivalent and are ignored.

Selection is `isTauri() ? tauriHttpClient : browserHttpClient` in `requestService.ts`.

## States & edge cases

- A transport failure returns a synthetic `status: 0` response with the error text (never throws
  into the UI).
- Query de-dupe: when params exist, the URL's own query is stripped before params are appended, so
  a query shown in the URL isn't sent twice.
- Request options (follow redirects, SSL verify, proxy) are read from `localStorage`
  (`pg_follow_redirects`, `pg_ssl_verify`, `pg_proxy_url`) set in Settings.

## Test ids

Driven via the URL bar / response panel — see [request-builder.md](./request-builder.md) and
[response-viewer.md](./response-viewer.md). E2E stubs responses with the `mockJson` helper.

## Key files

`hooks/useApiRequest.ts`, `services/requestService.ts`, `services/TauriHttpClient.ts`,
`services/BrowserHttpClient.ts`, `ports/HttpClient.ts`.
