# 003 — Cap MCP and OAuth response body buffering

**Against:** `0c24a27`  
**Effort:** S · **Risk:** Low · **Category:** security

## Why

Main REST path streams with `MAX_RESPONSE_BYTES` (50 MiB) in `apps/desktop/src-tauri/src/http.rs`. `send_mcp_request` and `oauth_http_request` still `response.text().await` unbounded. Hostile MCP/token endpoints can OOM the process.

## Current

`apps/desktop/src-tauri/src/mcp.rs` ~59–62 and `apps/desktop/src-tauri/src/oauth.rs` ~71–74:

```
let body_text = response.text().await.map_err(...)?;
```

REST cap (copy this pattern, extract a shared helper):

`apps/desktop/src-tauri/src/http.rs`:

```
pub(crate) const MAX_RESPONSE_BYTES: usize = 50 * 1024 * 1024;
// bytes_stream loop, remaining = MAX_RESPONSE_BYTES.saturating_sub(body_acc.len())
```

SSE already `use crate::http::MAX_RESPONSE_BYTES`.

## Scope

- IN: `apps/desktop/src-tauri/src/http.rs` (helper)
- IN: `apps/desktop/src-tauri/src/mcp.rs`
- IN: `apps/desktop/src-tauri/src/oauth.rs`
- OUT: changing the 50 MiB constant; frontend truncation UX for MCP (token/JSON bodies that hit the cap may be invalid JSON — return the truncated string; callers already handle parse errors)

## Steps

1. Extract `pub(crate) async fn read_body_capped(response: reqwest::Response) -> Result<(Vec<u8>, bool), String>` from the REST stream loop (`http.rs` around 431–450). REST `send` path should call the helper. Preserve cancel checks in the REST path: either keep cancel inside REST-only wrapping, or pass `Option<&CancelHandle>` into the helper. **Do not break cancel.** If threading cancel through the helper gets messy, duplicate a no-cancel stream loop in a `read_body_capped` used only by MCP/OAuth and leave REST as-is.

2. MCP/OAuth: after headers, `let (bytes, truncated) = read_body_capped(response).await?; let body_text = String::from_utf8_lossy(&bytes).into_owned();`. Truncation may be ignored at the struct level if `McpHttpResponse` / `OauthHttpResponse` have no `truncated` field — that is OK; still cap bytes.

3. No new crates. `futures_util::StreamExt` already used in `http.rs`. MCP/oauth may `use crate::http::read_body_capped` (or keep helper `pub(crate)` in `http.rs`).

## Verify

```
cd apps/desktop/src-tauri && cargo check
```

There is no `cargo test` in CI. At minimum `cargo check` must pass.

Optional: a tiny unit test with `#[cfg(test)]` that is **not** required if it needs a live server.

## Done when

Neither MCP nor OAuth calls `.text().await` on the full response. Helper (or duplicated loop) stops at `MAX_RESPONSE_BYTES`.

## Escape

If `oauth_http_request` needs the entire JWT/JWKS document and some IdP returns >50MB, STOP and report rather than raising the cap.

## Maintenance

Any new `reqwest` helper in this crate must use the same cap.
