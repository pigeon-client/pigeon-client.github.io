use futures_util::StreamExt;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::Mutex;

mod db;
mod oauth;

/// Hard cap on how much response body is buffered and sent to the webview.
/// Protects against OOM from hostile/huge endpoints; the UI flags truncation.
const MAX_RESPONSE_BYTES: usize = 50 * 1024 * 1024;

/// Per-stream cancel flags for long-lived SSE body reads.
struct SseCancelState {
    flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

/// Default reqwest client with connection pooling & keep-alive.
/// Used when no per-request overrides (redirects / SSL / proxy) are supplied.
fn get_http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
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
fn build_custom_client(
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

/// Raw HTTP response for the MCP transport — the frontend owns all JSON-RPC
/// framing (mirrors the `HttpClient` port pattern in `features/execution`).
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpHttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body_text: String,
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
async fn cancel_sse_stream(
    state: State<'_, Arc<SseCancelState>>,
    stream_id: String,
) -> Result<(), String> {
    let flags = state.flags.lock().await;
    if let Some(flag) = flags.get(&stream_id) {
        flag.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[tauri::command]
async fn send_api_request(
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
        let response = client
            .execute(req)
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        return finalize_response(response, start, app, cancel_state, stream_id).await;
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

    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    finalize_response(response, start, app, cancel_state, stream_id).await
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SseMetaPayload {
    stream_id: String,
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    content_type: String,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SseEventPayload {
    stream_id: String,
    event: String,
    data: String,
    id: Option<String>,
    raw: String,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SseDonePayload {
    stream_id: String,
    error: Option<String>,
}

struct SseParser {
    buffer: String,
    event_type: String,
    data_lines: Vec<String>,
    last_id: String,
    raw_lines: Vec<String>,
}

impl SseParser {
    fn new() -> Self {
        Self {
            buffer: String::new(),
            event_type: String::new(),
            data_lines: Vec::new(),
            last_id: String::new(),
            raw_lines: Vec::new(),
        }
    }

    fn push(&mut self, chunk: &str) -> Vec<SseEventPayload> {
        self.buffer.push_str(chunk);
        let mut out = Vec::new();
        loop {
            let Some(nl) = self.buffer.find('\n') else {
                break;
            };
            let mut line = self.buffer[..nl].to_string();
            if line.ends_with('\r') {
                line.pop();
            }
            self.buffer = self.buffer[nl + 1..].to_string();
            if let Some(ev) = self.handle_line(&line) {
                out.push(ev);
            }
        }
        out
    }

    fn flush(&mut self) -> Vec<SseEventPayload> {
        let mut out = Vec::new();
        if !self.buffer.is_empty() {
            let mut line = std::mem::take(&mut self.buffer);
            if line.ends_with('\r') {
                line.pop();
            }
            if let Some(ev) = self.handle_line(&line) {
                out.push(ev);
            }
        }
        if let Some(ev) = self.dispatch() {
            out.push(ev);
        }
        out
    }

    fn handle_line(&mut self, line: &str) -> Option<SseEventPayload> {
        if line.starts_with(':') {
            self.raw_lines.push(line.to_string());
            return None;
        }
        if line.is_empty() {
            return self.dispatch();
        }
        self.raw_lines.push(line.to_string());
        let (field, value) = match line.find(':') {
            Some(i) => {
                let field = &line[..i];
                let mut value = &line[i + 1..];
                if value.starts_with(' ') {
                    value = &value[1..];
                }
                (field, value)
            }
            None => (line, ""),
        };
        match field {
            "event" => self.event_type = value.to_string(),
            "data" => self.data_lines.push(value.to_string()),
            "id" => {
                if !value.contains('\0') {
                    self.last_id = value.to_string();
                }
            }
            _ => {}
        }
        None
    }

    fn dispatch(&mut self) -> Option<SseEventPayload> {
        if self.data_lines.is_empty() {
            self.event_type.clear();
            self.raw_lines.clear();
            return None;
        }
        let data = self.data_lines.join("\n");
        let event = if self.event_type.is_empty() {
            "message".to_string()
        } else {
            std::mem::take(&mut self.event_type)
        };
        let id = if self.last_id.is_empty() {
            None
        } else {
            Some(self.last_id.clone())
        };
        let raw = format!("{}\n", self.raw_lines.join("\n"));
        self.data_lines.clear();
        self.raw_lines.clear();
        Some(SseEventPayload {
            stream_id: String::new(), // filled by caller
            event,
            data,
            id,
            raw,
        })
    }
}

async fn stream_sse_response(
    response: reqwest::Response,
    start: std::time::Instant,
    app: AppHandle,
    cancel_state: Arc<SseCancelState>,
    stream_id: String,
    status: u16,
    status_text: String,
    resp_headers: HashMap<String, String>,
    content_type: String,
) -> Result<ApiResponse, String> {
    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut flags = cancel_state.flags.lock().await;
        flags.insert(stream_id.clone(), cancel_flag.clone());
    }

    let _ = app.emit(
        "sse-meta",
        SseMetaPayload {
            stream_id: stream_id.clone(),
            status,
            status_text: status_text.clone(),
            headers: resp_headers.clone(),
            content_type: content_type.clone(),
        },
    );

    let mut parser = SseParser::new();
    let mut body_acc = Vec::<u8>::new();
    let mut stream = response.bytes_stream();
    let mut stream_error: Option<String> = None;

    while let Some(item) = stream.next().await {
        if cancel_flag.load(Ordering::SeqCst) {
            break;
        }
        match item {
            Ok(bytes) => {
                // Cap the raw-transcript accumulator; events keep streaming to the
                // UI regardless — only the final buffered body stops growing.
                let remaining = MAX_RESPONSE_BYTES.saturating_sub(body_acc.len());
                if remaining > 0 {
                    body_acc.extend_from_slice(&bytes[..bytes.len().min(remaining)]);
                }
                let chunk = String::from_utf8_lossy(&bytes);
                for mut ev in parser.push(&chunk) {
                    ev.stream_id = stream_id.clone();
                    let _ = app.emit("sse-event", ev);
                }
            }
            Err(e) => {
                stream_error = Some(format!("SSE stream error: {}", e));
                break;
            }
        }
    }

    for mut ev in parser.flush() {
        ev.stream_id = stream_id.clone();
        let _ = app.emit("sse-event", ev);
    }

    let _ = app.emit(
        "sse-done",
        SseDonePayload {
            stream_id: stream_id.clone(),
            error: stream_error.clone(),
        },
    );

    {
        let mut flags = cancel_state.flags.lock().await;
        flags.remove(&stream_id);
    }

    let elapsed = start.elapsed().as_millis() as u64;
    let size = body_acc.len();
    let truncated = size >= MAX_RESPONSE_BYTES;
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

async fn finalize_response(
    response: reqwest::Response,
    start: std::time::Instant,
    app: AppHandle,
    cancel_state: Arc<SseCancelState>,
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
            return stream_sse_response(
                response,
                start,
                app,
                cancel_state,
                sid,
                status,
                status_text,
                resp_headers,
                content_type,
            )
            .await;
        }
    }

    // Stream the body with a hard size cap instead of buffering unbounded.
    let mut body_acc = Vec::<u8>::new();
    let mut truncated = false;
    let mut stream = response.bytes_stream();
    while let Some(item) = stream.next().await {
        let bytes = item.map_err(|e| format!("Failed to read response body: {}", e))?;
        let remaining = MAX_RESPONSE_BYTES.saturating_sub(body_acc.len());
        if bytes.len() > remaining {
            body_acc.extend_from_slice(&bytes[..remaining]);
            truncated = true;
            break;
        }
        body_acc.extend_from_slice(&bytes);
    }

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

// --- MCP transport ---
// Deliberately dumb: POST one JSON-RPC message, return status/headers/body text.
// The frontend (`features/mcp`) owns initialize/session-id/tool-call framing.
#[tauri::command]
async fn send_mcp_request(
    url: String,
    headers: Vec<RequestHeader>,
    body: String,
    follow_redirects: Option<bool>,
    proxy_url: Option<String>,
) -> Result<McpHttpResponse, String> {
    let follow = follow_redirects.unwrap_or(true);
    let proxy_trim = proxy_url
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());
    // Same client options as send_api_request, except TLS verification is
    // always on for MCP — there is no legitimate self-signed-MCP use case yet.
    let client = if follow && proxy_trim.is_none() {
        get_http_client().clone()
    } else {
        build_custom_client(follow, true, proxy_trim)?
    };
    let mut builder = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream")
        .body(body);
    for h in &headers {
        builder = builder.header(&h.key, &h.value);
    }

    let response = builder
        .send()
        .await
        .map_err(|e| format!("MCP request failed: {}", e))?;

    let status = response.status().as_u16();
    let mut resp_headers = HashMap::new();
    for (name, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(name.as_str().to_string(), v.to_string());
        }
    }
    let body_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read MCP response body: {}", e))?;

    Ok(McpHttpResponse {
        status,
        headers: resp_headers,
        body_text,
    })
}

// --- Database Commands ---

#[tauri::command]
fn save_draft(state: State<db::DbState>, data: String) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::save_draft(&conn, &data)
}

#[tauri::command]
fn get_drafts(state: State<db::DbState>) -> Result<Vec<(i64, String)>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_drafts(&conn)
}

#[tauri::command]
fn delete_draft(state: State<db::DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_draft(&conn, id)
}

#[tauri::command]
fn update_draft(state: State<db::DbState>, id: i64, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::update_draft(&conn, id, &data)
}

#[tauri::command]
fn update_history(state: State<db::DbState>, id: i64, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::update_history(&conn, id, &data)
}

#[tauri::command]
fn add_history(state: State<db::DbState>, data: String, timestamp: i64) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::add_history(&conn, &data, timestamp)
}

#[tauri::command]
fn get_history(state: State<db::DbState>) -> Result<Vec<(i64, String)>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_history(&conn)
}

#[tauri::command]
fn delete_history(state: State<db::DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_history(&conn, id)
}

// --- Migration status ---

#[tauri::command]
fn get_migration_status(state: State<db::DbState>) -> Option<db::MigrationStatus> {
    state.migration_status.clone()
}

// --- Collection Commands ---

#[tauri::command]
fn save_collection(state: State<db::DbState>, id: String, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::save_collection(&conn, &id, &data)
}

#[tauri::command]
fn get_collections(state: State<db::DbState>) -> Result<Vec<(String, String)>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_collections(&conn)
}

#[tauri::command]
fn update_collection(state: State<db::DbState>, id: String, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::update_collection(&conn, &id, &data)
}

#[tauri::command]
fn delete_collection(state: State<db::DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_collection(&conn, &id)
}

// --- MCP OAuth Commands ---

#[tauri::command]
fn save_mcp_oauth(state: State<db::DbState>, server_url: String, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::save_mcp_oauth(&conn, &server_url, &data)
}

#[tauri::command]
fn get_mcp_oauth(state: State<db::DbState>, server_url: String) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_mcp_oauth(&conn, &server_url)
}

#[tauri::command]
fn delete_mcp_oauth(state: State<db::DbState>, server_url: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_mcp_oauth(&conn, &server_url)
}

// --- Workspace windows ---
// REST/MCP/GraphQL are separate OS windows, singleton per kind — reopening focuses the
// existing window instead of duplicating it. REST is always the app's default "main" window
// (created at startup by tauri.conf.json), never (re)created here.
#[tauri::command]
fn open_workspace_window(app: AppHandle, kind: String) -> Result<(), String> {
    let (label, title, width, height) = match kind.as_str() {
        "rest" => ("main", "Pigeon - API Tester", 1280.0, 800.0),
        "mcp" => ("mcp", "Pigeon - MCP Bench", 1100.0, 720.0),
        "graphql" => ("graphql", "Pigeon - GraphQL", 1100.0, 720.0),
        other => return Err(format!("Unknown workspace kind: {}", other)),
    };

    if let Some(w) = app.get_webview_window(label) {
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, label, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(width, height)
        .min_inner_size(900.0, 600.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (db_conn, migration_status) = db::init_db();
    let db_state = db::DbState {
        conn: std::sync::Mutex::new(db_conn),
        migration_status,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(db_state)
        .manage(Arc::new(SseCancelState {
            flags: Mutex::new(HashMap::new()),
        }))
        .manage(Arc::new(oauth::OauthLoopbackState::default()))
        .invoke_handler(tauri::generate_handler![
            send_api_request,
            cancel_sse_stream,
            send_mcp_request,
            save_draft,
            get_drafts,
            delete_draft,
            update_draft,
            update_history,
            add_history,
            get_history,
            delete_history,
            save_collection,
            get_collections,
            update_collection,
            delete_collection,
            get_migration_status,
            oauth::oauth_http_request,
            oauth::open_external_url,
            oauth::oauth_loopback_open,
            oauth::oauth_loopback_wait,
            save_mcp_oauth,
            get_mcp_oauth,
            delete_mcp_oauth,
            open_workspace_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
