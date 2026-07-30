# Execution

## Overview

Turns a `RequestConfig` into a normalized `ApiResponse`. Owns *how* a request is sent; response
UI and history consumers do not know the transport.

## Problem / job to be done

Users need reliable sends with env interpolation, auth injection, and desktop-class options
(redirects, SSL, proxy) — while browser/dev and E2E still work via a fetch adapter.

## User stories

- As a developer, I want Send (`⌘↵`) to resolve `{{vars}}`, inject auth, and return a normalized
  response (or a clear error).
- As a desktop user, I want no CORS limits and optional proxy / SSL verify / follow redirects.
- As QA, I want browser E2E to stub network deterministically without Rust.

## Functional requirements

1. Send resolves request: env interpolate (strict), auth inject, params merge / query de-dupe.
2. Unresolved `{{var}}` blocks send and surfaces all missing names (`UnresolvedVariablesError`).
3. Transport via `HttpClient` port: Tauri (`reqwest`) or Browser (`fetch`) chosen by `isTauri()`.
4. Transport failure → synthetic `status: 0` response with error text (UI never throws).
5. Successful send updates response panel and upserts history + drafts.
6. Request options from `localStorage`: `pg_follow_redirects`, `pg_ssl_verify`, `pg_proxy_url`.
7. Production env + mutating methods may prompt confirm (see environments).

## Non-functional requirements

- Send path must be fast to start; loading spinner on Send / tab.
- Browser ignores SSL/proxy (no equivalent); document as desktop-only.
- SSE long streams: prefer `Accept: text/event-stream` (desktop disables default timeout).

## Acceptance criteria

- [ ] Send with valid URL returns status/body in response panel.
- [ ] Missing `{{var}}` → no network call; error text lists names.
- [ ] Params present → URL query not duplicated on wire.
- [ ] Basic/Bearer/API-key auth appear on wire, not as editable magic in unrelated fields.
- [ ] Browser E2E with `mockJson` asserts status/body without real API.
- [ ] Desktop: follow redirects / SSL / proxy toggles affect send (manual Tauri).

## UI

No dedicated screen — Send button + spinner in URL bar; loading reflected in response panel.

## UX / interactions

- **Send** resolves then dispatches; result fills response + history/drafts.
- **Auth injection** at send time:
  - `basic` → `Authorization: Basic …` (from username/password)
  - `bearer` → `Authorization: Bearer <token>`
  - `api-key` → either a named header (`auth.apiKey` / `auth.apiValue`) or a query param
    (`auth.addTo === "query"`)
- **Body** — JSON/text/XML as-is; urlencoded serialized; multipart `FormData`; binary file bytes.

## Transport

| Build | Client | Backend | Notes |
|-------|--------|---------|-------|
| Tauri desktop | `TauriHttpClient` | Rust `send_api_request` (`reqwest`) | No CORS; redirects/SSL/proxy |
| Browser / Playwright | `BrowserHttpClient` | `fetch` | CORS on real APIs; E2E stubs routes |

Selection: `isTauri() ? tauriHttpClient : browserHttpClient` in `requestService.ts`.

## Keyboard

`⌘↵` triggers send from URL bar.

## States & edge cases

- `status: 0` transport error still renders in response viewer.
- Query de-dupe when params exist.
- Strict env resolution only on send (URL preview is non-strict).

## Manual test checklist

- [ ] Send GET mocked/real; status + timing + size show.
- [ ] Unresolved `{{missing}}` in URL — send blocked + error.
- [ ] Params `a=1` while URL also has `?a=2` — wire has single authoritative query.
- [ ] Auth Bearer set — Authorization header on wire (desktop inspector / mock).
- [ ] Toggle follow redirects (desktop) against a 302 endpoint.
- [ ] SSE Accept header — stream starts; Stop ends (desktop).

## Automation coverage

- Vitest: `requestService.test.ts`, `sse.test.ts`, env resolve tests.
- Playwright: `e2e/send.spec.ts` (route mocks).

## Test ids

`data-send-btn`, `send-error`; response ids in [response-viewer.md](./response-viewer.md).

## Key files

`hooks/useApiRequest.ts`, `services/requestService.ts`, `services/TauriHttpClient.ts`,
`services/BrowserHttpClient.ts`, `ports/HttpClient.ts`, `lib/sse.ts`, `services/sseClient.ts`.

## Open risks

- Browser E2E cannot certify Rust reqwest behavior.
- Proxy/SSL misconfig only visible on desktop — easy to miss in CI.
