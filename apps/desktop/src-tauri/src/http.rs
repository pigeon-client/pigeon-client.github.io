use futures_util::StreamExt;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use tauri::{State, WebviewWindow};

use base64::{engine::general_purpose::STANDARD, Engine as _};

use crate::sse::{self, CancelHandle, SseCancelState};

/// Hard cap on how much response body is buffered and sent to the webview.
/// Protects against OOM from hostile/huge endpoints; the UI flags truncation.
pub(crate) const MAX_RESPONSE_BYTES: usize = 50 * 1024 * 1024;

/// Distinct error string for a user-initiated cancel — the frontend matches on
/// this exact text to show a neutral "Cancelled" state instead of a real failure.
pub(crate) const CANCELLED_ERR: &str = "Request cancelled";

/// Buffer a response body up to `MAX_RESPONSE_BYTES`. Returns `(bytes, truncated)`.
/// When `cancel` is set, polls the flag between chunks so REST cancel stays live.
pub(crate) async fn read_body_capped(
    response: reqwest::Response,
    cancel: Option<&CancelHandle>,
) -> Result<(Vec<u8>, bool), String> {
    let cap_hint = response
        .content_length()
        .map(|n| (n as usize).min(MAX_RESPONSE_BYTES))
        .unwrap_or(0);
    let mut body_acc = Vec::<u8>::with_capacity(cap_hint);
    let mut truncated = false;
    let mut stream = response.bytes_stream();
    while let Some(item) = stream.next().await {
        if cancel.is_some_and(|h| h.flag.load(Ordering::SeqCst)) {
            return Err(CANCELLED_ERR.to_string());
        }
        let bytes = item.map_err(|e| format!("Failed to read response body: {}", e))?;
        let remaining = MAX_RESPONSE_BYTES.saturating_sub(body_acc.len());
        if bytes.len() > remaining {
            body_acc.extend_from_slice(&bytes[..remaining]);
            truncated = true;
            break;
        }
        body_acc.extend_from_slice(&bytes);
    }
    Ok((body_acc, truncated))
}

/// Race a request-sending future against cancellation. `handle` is `None` when the
/// caller supplied no stream id (nothing to cancel by), in which case this is just
/// a passthrough — every real send from the UI always supplies one.
async fn send_cancellable(
    fut: impl std::future::Future<Output = Result<reqwest::Response, reqwest::Error>>,
    handle: &Option<Arc<CancelHandle>>,
) -> Result<reqwest::Response, String> {
    match handle {
        Some(h) => {
            tokio::select! {
                res = fut => res.map_err(|e| format!("Request failed: {}", e)),
                _ = h.notify.notified() => Err(CANCELLED_ERR.to_string()),
            }
        }
        None => fut.await.map_err(|e| format!("Request failed: {}", e)),
    }
}

/// Default reqwest client with connection pooling & keep-alive.
/// Used when no per-request overrides (redirects / SSL / proxy) are supplied.
pub(crate) fn get_http_client() -> &'static reqwest::Client {
    static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .connect_timeout(Duration::from_secs(10))
            .pool_max_idle_per_host(32)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(30))
            .danger_accept_invalid_certs(false)
            .build()
            .expect("Failed to create HTTP client")
    })
}

fn build_client(
    follow_redirects: bool,
    ssl_verify: bool,
    proxy_url: Option<&str>,
    sse: bool,
) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .timeout(if sse {
            Duration::from_secs(60 * 60 * 24)
        } else {
            Duration::from_secs(60)
        })
        .connect_timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(if sse { 8 } else { 32 })
        .pool_idle_timeout(Duration::from_secs(90))
        .tcp_keepalive(Duration::from_secs(30))
        .danger_accept_invalid_certs(!ssl_verify);

    if !follow_redirects {
        builder = builder.redirect(reqwest::redirect::Policy::none());
    }

    if let Some(proxy) = proxy_url.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        let p = reqwest::Proxy::all(proxy)
            .map_err(|e| format!("Invalid proxy URL '{}': {}", proxy, e))?;
        builder = builder.proxy(p);
    }

    builder
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

#[derive(Clone, Hash, Eq, PartialEq)]
struct ClientKey {
    follow: bool,
    verify: bool,
    proxy: String,
    sse: bool,
}

/// Cached reqwest clients keyed by redirect / TLS / proxy / SSE timeout.
/// The default pooled client (`get_http_client`) covers the common case.
pub(crate) fn get_or_build_client(
    follow_redirects: bool,
    ssl_verify: bool,
    proxy_url: Option<&str>,
    sse: bool,
) -> Result<reqwest::Client, String> {
    if !sse && follow_redirects && ssl_verify && proxy_url.is_none() {
        return Ok(get_http_client().clone());
    }
    let key = ClientKey {
        follow: follow_redirects,
        verify: ssl_verify,
        proxy: proxy_url.unwrap_or("").to_string(),
        sse,
    };
    static CLIENTS: OnceLock<Mutex<HashMap<ClientKey, reqwest::Client>>> = OnceLock::new();
    let cache = CLIENTS.get_or_init(|| Mutex::new(HashMap::new()));
    {
        let map = cache.lock().map_err(|e| e.to_string())?;
        if let Some(c) = map.get(&key) {
            return Ok(c.clone());
        }
    }
    let client = build_client(follow_redirects, ssl_verify, proxy_url, sse)?;
    let mut map = cache.lock().map_err(|e| e.to_string())?;
    Ok(map.entry(key).or_insert(client).clone())
}

fn serialize_body_b64<S: serde::Serializer>(bytes: &[u8], s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&STANDARD.encode(bytes))
}

fn deserialize_body_b64<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Vec<u8>, D::Error> {
    let s = String::deserialize(d)?;
    STANDARD
        .decode(s.as_bytes())
        .map_err(serde::de::Error::custom)
}

fn looks_like_base64(s: &str) -> bool {
    let t = s.trim();
    t.len() >= 4
        && t.len() % 4 == 0
        && t.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'+' || b == b'/' || b == b'=')
}

/// Binary uploads arrive as standard base64. Older clients sent comma-joined u8 decimals.
fn decode_binary_body(body_content: &str) -> Vec<u8> {
    if looks_like_base64(body_content) {
        if let Ok(bytes) = STANDARD.decode(body_content.trim()) {
            return bytes;
        }
    }
    if body_content.contains(',') {
        if let Ok(bytes) = body_content
            .split(',')
            .map(|s| s.trim().parse::<u8>())
            .collect::<Result<Vec<u8>, _>>()
        {
            return bytes;
        }
    }
    body_content.as_bytes().to_vec()
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    #[serde(
        serialize_with = "serialize_body_b64",
        deserialize_with = "deserialize_body_b64"
    )]
    pub body: Vec<u8>,
    pub content_type: String,
    pub response_time: u64,
    pub size: usize,
    /// Body exceeded MAX_RESPONSE_BYTES and was cut off.
    #[serde(default)]
    pub truncated: bool,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct RequestHeader {
    pub key: String,
    pub value: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct MultipartField {
    key: String,
    text: Option<String>,
    file_name: Option<String>,
    mime: Option<String>,
    bytes: Option<Vec<u8>>,
    #[serde(default)]
    bytes_b64: Option<String>,
}

fn parse_http_method(method: &str) -> Result<reqwest::Method, String> {
    if method.eq_ignore_ascii_case("GET") {
        return Ok(reqwest::Method::GET);
    }
    if method.eq_ignore_ascii_case("POST") {
        return Ok(reqwest::Method::POST);
    }
    if method.eq_ignore_ascii_case("PUT") {
        return Ok(reqwest::Method::PUT);
    }
    if method.eq_ignore_ascii_case("PATCH") {
        return Ok(reqwest::Method::PATCH);
    }
    if method.eq_ignore_ascii_case("DELETE") {
        return Ok(reqwest::Method::DELETE);
    }
    if method.eq_ignore_ascii_case("HEAD") {
        return Ok(reqwest::Method::HEAD);
    }
    if method.eq_ignore_ascii_case("OPTIONS") {
        return Ok(reqwest::Method::OPTIONS);
    }
    if method.eq_ignore_ascii_case("QUERY") {
        return reqwest::Method::from_bytes(b"QUERY").map_err(|e| e.to_string());
    }
    Err(format!("Unsupported HTTP method: {}", method))
}

fn method_allows_body(method: &reqwest::Method) -> bool {
    method != reqwest::Method::GET && method != reqwest::Method::HEAD
}

/// Binary / file body types — wire format is standard base64 from the UI.
fn is_binary_body_type(body_type: &str) -> bool {
    matches!(
        body_type,
        "application/octet-stream"
            | "application/pdf"
            | "application/zip"
            | "application/protobuf"
            | "application/x-protobuf"
            | "application/msgpack"
            | "application/x-msgpack"
    ) || body_type.starts_with("image/")
        || body_type.starts_with("audio/")
        || body_type.starts_with("video/")
}

fn header_wants_sse(headers: &[RequestHeader]) -> bool {
    headers.iter().any(|h| {
        h.key.eq_ignore_ascii_case("accept")
            && contains_ignore_ascii_case(&h.value, "text/event-stream")
    })
}

fn content_type_is_sse(content_type: &str) -> bool {
    contains_ignore_ascii_case(content_type, "text/event-stream")
}

fn contains_ignore_ascii_case(haystack: &str, needle: &str) -> bool {
    let n = needle.as_bytes();
    if n.is_empty() || haystack.len() < n.len() {
        return false;
    }
    haystack
        .as_bytes()
        .windows(n.len())
        .any(|w| w.eq_ignore_ascii_case(n))
}

#[tauri::command]
pub async fn send_api_request(
    window: WebviewWindow,
    cancel_state: State<'_, Arc<SseCancelState>>,
    method: String,
    url: String,
    headers: Vec<RequestHeader>,
    body: Option<String>,
    body_type: String,
    follow_redirects: Option<bool>,
    ssl_verify: Option<bool>,
    proxy_url: Option<String>,
    stream_id: Option<String>,
) -> Result<ApiResponse, String> {
    let cancel_state = cancel_state.inner().clone();

    // Register a cancel handle for every request that supplies a stream id (every
    // real send from the UI does — see beginTabStream on the frontend), not just
    // SSE ones, so Cancel works for a plain buffered response too.
    let cancel_handle: Option<Arc<CancelHandle>> = match stream_id.as_deref() {
        Some(sid) if !sid.is_empty() => {
            let handle = Arc::new(CancelHandle::new());
            cancel_state
                .flags
                .lock()
                .map_err(|e| e.to_string())?
                .insert(sid.to_string(), handle.clone());
            Some(handle)
        }
        _ => None,
    };

    let follow = follow_redirects.unwrap_or(true);
    let verify = ssl_verify.unwrap_or(true);
    let proxy_trim = proxy_url
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    let wants_sse = header_wants_sse(&headers);
    let client = get_or_build_client(follow, verify, proxy_trim, wants_sse)?;

    let reqwest_method = parse_http_method(&method)?;
    let allow_body = method_allows_body(&reqwest_method);

    // RFC 9110 §9.3.7 — OPTIONS with asterisk-form request-target.
    if url == "*" {
        if reqwest_method != reqwest::Method::OPTIONS {
            return Err("Asterisk request-target (*) is only valid for OPTIONS".into());
        }
        let host = headers
            .iter()
            .find(|h| h.key.eq_ignore_ascii_case("host"))
            .map(|h| h.value.trim().to_string())
            .filter(|h| !h.is_empty())
            .ok_or_else(|| "OPTIONS * requires a Host header".to_string())?;

        let mut builder = http::Request::builder()
            .method(reqwest::Method::OPTIONS)
            .uri(http::Uri::from_static("*"))
            .header("host", &host);

        for h in &headers {
            if h.key.eq_ignore_ascii_case("host")
                || h.key.eq_ignore_ascii_case("content-length")
                || h.key.eq_ignore_ascii_case("content-type")
            {
                continue;
            }
            builder = builder.header(&h.key, &h.value);
        }

        let http_req = builder
            .body(reqwest::Body::default())
            .map_err(|e| format!("Failed to build OPTIONS * request: {}", e))?;
        let req = reqwest::Request::try_from(http_req)
            .map_err(|e| format!("Failed to convert OPTIONS * request: {}", e))?;

        let start = std::time::Instant::now();
        let response = match send_cancellable(client.execute(req), &cancel_handle).await {
            Ok(r) => r,
            Err(e) => {
                cleanup_cancel_handle(&cancel_state, &stream_id);
                return Err(e);
            }
        };
        let result =
            finalize_response(response, start, window, cancel_handle, stream_id.clone()).await;
        cleanup_cancel_handle(&cancel_state, &stream_id);
        return result;
    }

    let mut request_builder = client.request(reqwest_method, &url);

    let mut user_overrides_ct = false;
    for h in &headers {
        if h.key.eq_ignore_ascii_case("content-length") {
            continue;
        }
        if h.key.eq_ignore_ascii_case("content-type") {
            user_overrides_ct = true;
            request_builder = request_builder.header("Content-Type", &h.value);
            continue;
        }
        request_builder = request_builder.header(&h.key, &h.value);
    }

    // RFC 9110: never attach content on GET/HEAD.
    if allow_body {
        if let Some(body_content) = body {
            match body_type.as_str() {
                "application/x-www-form-urlencoded" => {
                    if !user_overrides_ct {
                        request_builder = request_builder
                            .header("Content-Type", "application/x-www-form-urlencoded");
                    }
                    request_builder = request_builder.body(body_content);
                }
                "multipart/form-data" => {
                    let fields: Vec<MultipartField> = serde_json::from_str(&body_content)
                        .map_err(|e| format!("Invalid multipart payload: {}", e))?;
                    let mut form = reqwest::multipart::Form::new();
                    for field in fields {
                        let file_bytes =
                            if let Some(b64) = field.bytes_b64 {
                                Some(STANDARD.decode(b64).map_err(|e| {
                                    format!("Invalid multipart file encoding: {}", e)
                                })?)
                            } else {
                                field.bytes
                            };
                        if let Some(bytes) = file_bytes {
                            let mut part = reqwest::multipart::Part::bytes(bytes);
                            if let Some(name) = field.file_name {
                                part = part.file_name(name);
                            }
                            if let Some(mime) = field.mime {
                                part = part
                                    .mime_str(&mime)
                                    .map_err(|e| format!("Invalid multipart MIME: {}", e))?;
                            }
                            form = form.part(field.key, part);
                        } else {
                            form = form.text(field.key, field.text.unwrap_or_default());
                        }
                    }
                    request_builder = request_builder.multipart(form);
                }
                other if is_binary_body_type(other) => {
                    if !user_overrides_ct {
                        request_builder = request_builder.header("Content-Type", other);
                    }
                    request_builder = request_builder.body(decode_binary_body(&body_content));
                }
                other => {
                    // Textual / structured bodies (JSON, XML, HTML, CSV, YAML, GraphQL, …).
                    if !user_overrides_ct && other != "none" {
                        request_builder = request_builder.header("Content-Type", other);
                    }
                    request_builder = request_builder.body(body_content);
                }
            }
        }
    }

    let start = std::time::Instant::now();

    let response = match send_cancellable(request_builder.send(), &cancel_handle).await {
        Ok(r) => r,
        Err(e) => {
            cleanup_cancel_handle(&cancel_state, &stream_id);
            return Err(e);
        }
    };

    let result = finalize_response(response, start, window, cancel_handle, stream_id.clone()).await;
    cleanup_cancel_handle(&cancel_state, &stream_id);
    result
}

fn cleanup_cancel_handle(cancel_state: &Arc<SseCancelState>, stream_id: &Option<String>) {
    if let Some(sid) = stream_id.as_deref().filter(|s| !s.is_empty()) {
        if let Ok(mut flags) = cancel_state.flags.lock() {
            flags.remove(sid);
        }
    }
}

pub(crate) async fn finalize_response(
    response: reqwest::Response,
    start: std::time::Instant,
    window: WebviewWindow,
    cancel_handle: Option<Arc<CancelHandle>>,
    stream_id: Option<String>,
) -> Result<ApiResponse, String> {
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    let mut resp_headers = HashMap::with_capacity(response.headers().len());
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(key.to_string(), v.to_string());
        }
    }

    let content_type = resp_headers
        .get("content-type")
        .cloned()
        .unwrap_or_else(|| "application/octet-stream".to_string());

    if let Some(sid) = stream_id.filter(|s| !s.is_empty()) {
        if content_type_is_sse(&content_type) {
            // Registered unconditionally alongside stream_id in send_api_request.
            let handle = cancel_handle.unwrap_or_else(|| Arc::new(CancelHandle::new()));
            return sse::stream_sse_response(
                response,
                start,
                window,
                handle,
                sid,
                status,
                status_text,
                resp_headers,
                content_type,
            )
            .await;
        }
    }

    let (body_acc, truncated) = read_body_capped(response, cancel_handle.as_deref()).await?;

    let elapsed = start.elapsed().as_millis() as u64;
    let size = body_acc.len();

    Ok(ApiResponse {
        status,
        status_text,
        headers: resp_headers,
        body: body_acc,
        content_type,
        response_time: elapsed,
        size,
        truncated,
    })
}
