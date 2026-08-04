use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpListener;
use tokio::sync::Mutex;

/// Loopback listeners waiting for the browser to redirect back with an
/// authorization code (RFC 8252 native-app pattern — MCP auth redirect URIs
/// must be `localhost` or HTTPS; a desktop app has no HTTPS origin, so we use
/// a one-shot loopback HTTP server instead of a custom URI scheme).
#[derive(Default)]
pub struct OauthLoopbackState {
    listeners: Mutex<HashMap<String, TcpListener>>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OauthHttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body_text: String,
}

/// Generic HTTP request for OAuth discovery / dynamic client registration /
/// token exchange. Unlike `send_mcp_request`, the caller sets its own headers
/// (JSON for discovery/DCR, `application/x-www-form-urlencoded` for token
/// requests) — nothing is hardcoded here.
#[tauri::command]
pub async fn oauth_http_request(
    method: String,
    url: String,
    headers: Vec<crate::http::RequestHeader>,
    body: Option<String>,
) -> Result<OauthHttpResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let reqwest_method = match method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        other => return Err(format!("Unsupported OAuth HTTP method: {}", other)),
    };

    let mut builder = client.request(reqwest_method, &url);
    for h in &headers {
        builder = builder.header(&h.key, &h.value);
    }
    if let Some(b) = body {
        builder = builder.body(b);
    }

    let response = builder
        .send()
        .await
        .map_err(|e| format!("OAuth request to {} failed: {}", url, e))?;

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
        .map_err(|e| format!("Failed to read OAuth response body: {}", e))?;

    Ok(OauthHttpResponse {
        status,
        headers: resp_headers,
        body_text,
    })
}

#[tauri::command]
pub fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoopbackHandle {
    pub listener_id: String,
    pub port: u16,
}

#[tauri::command]
pub async fn oauth_loopback_open(
    state: State<'_, Arc<OauthLoopbackState>>,
) -> Result<LoopbackHandle, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to open loopback listener: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let listener_id = format!("oauth-{}", port);

    let mut listeners = state.listeners.lock().await;
    listeners.insert(listener_id.clone(), listener);

    Ok(LoopbackHandle { listener_id, port })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoopbackResult {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

const CALLBACK_HTML: &str = "<!doctype html><html><body style=\"font-family: sans-serif; \
padding: 2rem;\"><h3>Authorization complete</h3><p>You can close this tab and return to \
Pigeon.</p></body></html>";

/// Accepts exactly one connection on the loopback listener opened by
/// `oauth_loopback_open`, parses the redirect's query string, and returns it.
/// The listener is consumed either way (single-shot — matches one authorization
/// attempt), so a retry must call `oauth_loopback_open` again.
#[tauri::command]
pub async fn oauth_loopback_wait(
    state: State<'_, Arc<OauthLoopbackState>>,
    listener_id: String,
    timeout_ms: u64,
) -> Result<LoopbackResult, String> {
    let listener = {
        let mut listeners = state.listeners.lock().await;
        listeners
            .remove(&listener_id)
            .ok_or_else(|| "Unknown or already-consumed loopback listener".to_string())?
    };

    let accept_result = tokio::time::timeout(Duration::from_millis(timeout_ms), listener.accept())
        .await
        .map_err(|_| "Timed out waiting for the browser authorization redirect".to_string())?;
    let (stream, _addr) = accept_result.map_err(|e| format!("Loopback accept failed: {}", e))?;

    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    reader
        .read_line(&mut request_line)
        .await
        .map_err(|e| format!("Failed to read callback request: {}", e))?;

    // Request line looks like "GET /callback?code=...&state=... HTTP/1.1".
    let path = request_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "Malformed callback request line".to_string())?;
    let dummy_base = url::Url::parse("http://127.0.0.1").map_err(|e| e.to_string())?;
    let parsed = dummy_base.join(path).map_err(|e| e.to_string())?;

    let mut code = None;
    let mut oauth_state = None;
    let mut error = None;
    for (key, value) in parsed.query_pairs() {
        match key.as_ref() {
            "code" => code = Some(value.into_owned()),
            "state" => oauth_state = Some(value.into_owned()),
            "error" => error = Some(value.into_owned()),
            _ => {}
        }
    }

    let mut stream = reader.into_inner();
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        CALLBACK_HTML.len(),
        CALLBACK_HTML
    );
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.shutdown().await;

    Ok(LoopbackResult {
        code,
        state: oauth_state,
        error,
    })
}
