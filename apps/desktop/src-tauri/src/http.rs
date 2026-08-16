use futures_util::StreamExt;
use std::collections::HashMap;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, State};

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
    let mut body_acc = Vec::<u8>::new();
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

/// Build a one-off client that honours the user-requested overrides for
/// redirect policy, TLS verification, and proxy. Used when the defaults
/// need to be changed on a per-request basis (reqwest only exposes those
/// knobs on `ClientBuilder`, not on `RequestBuilder`).
pub(crate) fn build_custom_client(
    follow_redirects: bool,
    ssl_verify: bool,
    proxy_url: Option<&str>,
) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .connect_timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(32)
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

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
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
}

fn parse_http_method(method: &str) -> Result<reqwest::Method, String> {
    match method.to_uppercase().as_str() {
        "GET" => Ok(reqwest::Method::GET),
        "POST" => Ok(reqwest::Method::POST),
        "PUT" => Ok(reqwest::Method::PUT),
        "PATCH" => Ok(reqwest::Method::PATCH),
        "DELETE" => Ok(reqwest::Method::DELETE),
        "HEAD" => Ok(reqwest::Method::HEAD),
        "OPTIONS" => Ok(reqwest::Method::OPTIONS),
        // RFC 10008 — extension method (safe + idempotent + body).
        "QUERY" => reqwest::Method::from_bytes(b"QUERY").map_err(|e| e.to_string()),
        other => Err(format!("Unsupported HTTP method: {}", other)),
    }
}

fn method_allows_body(method: &reqwest::Method) -> bool {
    method != reqwest::Method::GET && method != reqwest::Method::HEAD
}

/// Binary / file body types — wire format is comma-joined u8 decimals from the UI.
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
            && h.value.to_ascii_lowercase().contains("text/event-stream")
    })
}

fn content_type_is_sse(content_type: &str) -> bool {
    content_type
        .to_ascii_lowercase()
        .contains("text/event-stream")
}

#[tauri::command]
pub async fn send_api_request(
    app: AppHandle,
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
                .await
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

    // Long-lived SSE needs no overall request timeout (connect timeout still applies).
    let wants_sse = header_wants_sse(&headers);
    let client = if wants_sse {
        let mut builder = reqwest::Client::builder()
            // No practical deadline for long-lived SSE (Stop cancels the stream).
            .timeout(Duration::from_secs(60 * 60 * 24))
            .connect_timeout(Duration::from_secs(10))
            .pool_max_idle_per_host(8)
            .danger_accept_invalid_certs(!verify);
        if !follow {
            builder = builder.redirect(reqwest::redirect::Policy::none());
        }
        if let Some(proxy) = proxy_trim {
            let p = reqwest::Proxy::all(proxy)
                .map_err(|e| format!("Invalid proxy URL '{}': {}", proxy, e))?;
            builder = builder.proxy(p);
        }
        builder
            .build()
            .map_err(|e| format!("Failed to build SSE HTTP client: {}", e))?
    } else if follow && verify && proxy_trim.is_none() {
        get_http_client().clone()
    } else {
        build_custom_client(follow, verify, proxy_trim)?
    };

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
                cleanup_cancel_handle(&cancel_state, &stream_id).await;
                return Err(e);
            }
        };
        let result =
            finalize_response(response, start, app, cancel_handle, stream_id.clone()).await;
        cleanup_cancel_handle(&cancel_state, &stream_id).await;
        return result;
    }

    let mut request_builder = client.request(reqwest_method, &url);

    // Collect user-supplied headers, skipping Content-Type / Content-Length
    // since reqwest appends those; we set them explicitly below.
    let user_overrides_ct = headers
        .iter()
        .any(|h| h.key.eq_ignore_ascii_case("content-type"));
    for h in &headers {
        if h.key.eq_ignore_ascii_case("content-type")
            || h.key.eq_ignore_ascii_case("content-length")
        {
            continue;
        }
        request_builder = request_builder.header(&h.key, &h.value);
    }
    if user_overrides_ct {
        for h in &headers {
            if h.key.eq_ignore_ascii_case("content-type") {
                request_builder = request_builder.header("Content-Type", &h.value);
                break;
            }
        }
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
                        if let Some(bytes) = field.bytes {
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
                    if body_content.contains(',') {
                        let bytes: Result<Vec<u8>, _> = body_content
                            .split(',')
                            .map(|s| s.trim().parse::<u8>())
                            .collect();
                        if let Ok(byte_vec) = bytes {
                            request_builder = request_builder.body(byte_vec);
                        } else {
                            request_builder = request_builder.body(body_content);
                        }
                    } else {
                        request_builder = request_builder.body(body_content);
                    }
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
            cleanup_cancel_handle(&cancel_state, &stream_id).await;
            return Err(e);
        }
    };

    let result = finalize_response(response, start, app, cancel_handle, stream_id.clone()).await;
    cleanup_cancel_handle(&cancel_state, &stream_id).await;
    result
}

async fn cleanup_cancel_handle(cancel_state: &Arc<SseCancelState>, stream_id: &Option<String>) {
    if let Some(sid) = stream_id.as_deref().filter(|s| !s.is_empty()) {
        cancel_state.flags.lock().await.remove(sid);
    }
}

pub(crate) async fn finalize_response(
    response: reqwest::Response,
    start: std::time::Instant,
    app: AppHandle,
    cancel_handle: Option<Arc<CancelHandle>>,
    stream_id: Option<String>,
) -> Result<ApiResponse, String> {
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    let mut resp_headers = HashMap::new();
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
                app,
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
