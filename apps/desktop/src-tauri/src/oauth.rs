use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpListener;
use tokio::sync::Mutex;

use crate::http::read_body_capped;

/// Reject anything that isn't http(s) before native fetch / `open_url`.
/// Stops discovery metadata from driving `file:`, `javascript:`, or custom schemes.
fn allowed_http_url(url: &str) -> Result<url::Url, String> {
    let parsed = url::Url::parse(url).map_err(|e| format!("Invalid URL '{}': {}", url, e))?;
    match parsed.scheme() {
        "http" | "https" => Ok(parsed),
        other => Err(format!("Refusing non-HTTP URL (scheme '{other}')")),
    }
}

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
    #[serde(default)]
    pub truncated: bool,
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
    let parsed_url = allowed_http_url(&url)?;
    let reqwest_method = match method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        other => return Err(format!("Unsupported OAuth HTTP method: {}", other)),
    };

    // GET follows redirects (http→https discovery). POST (token / DCR) does not,
    // so a 302 cannot leak the authorization code or client secret.
    let client = if reqwest_method == reqwest::Method::POST {
        crate::http::get_or_build_client(false, true, None, false)?
    } else {
        crate::http::get_http_client().clone()
    };

    let mut builder = client.request(reqwest_method, parsed_url);
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
    let (bytes, truncated) = read_body_capped(response, None).await?;
    let body_text = String::from_utf8_lossy(&bytes).into_owned();

    Ok(OauthHttpResponse {
        status,
        headers: resp_headers,
        body_text,
        truncated,
    })
}

#[tauri::command]
pub fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    let parsed = allowed_http_url(&url)?;
    app.opener()
        .open_url(parsed.as_str(), None::<&str>)
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
const NOT_FOUND_HTML: &str = "<!doctype html><html><body>Not found</body></html>";
const MAX_CALLBACK_REQUEST_LINE: usize = 8192;

fn is_callback_path(path: &str) -> bool {
    path == "/callback" || path == "/callback/"
}

async fn write_simple_http(stream: &mut tokio::net::TcpStream, status: &str, body: &str) {
    let response = format!(
        "{status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len(),
    );
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.shutdown().await;
}

/// Waits for `GET /callback` on the loopback listener opened by `oauth_loopback_open`.
/// Probes such as `GET /favicon.ico` are ignored so they cannot consume the
/// one-shot listener. The listener is dropped when this returns, so a retry
/// must call `oauth_loopback_open` again.
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

    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err("Timed out waiting for the browser authorization redirect".into());
        }
        let accept_result = tokio::time::timeout(remaining, listener.accept())
            .await
            .map_err(|_| "Timed out waiting for the browser authorization redirect".to_string())?;
        let (stream, _addr) =
            accept_result.map_err(|e| format!("Loopback accept failed: {}", e))?;

        let mut reader = BufReader::new(stream);
        let mut request_line = String::new();
        if reader.read_line(&mut request_line).await.is_err() {
            continue;
        }
        if request_line.len() > MAX_CALLBACK_REQUEST_LINE {
            let mut stream = reader.into_inner();
            write_simple_http(&mut stream, "HTTP/1.1 414 URI Too Long", NOT_FOUND_HTML).await;
            continue;
        }

        let mut parts = request_line.split_whitespace();
        let method = parts.next().unwrap_or("");
        let path = parts.next().unwrap_or("");
        let dummy_base = url::Url::parse("http://127.0.0.1").map_err(|e| e.to_string())?;
        let Ok(parsed) = dummy_base.join(path) else {
            let mut stream = reader.into_inner();
            write_simple_http(&mut stream, "HTTP/1.1 400 Bad Request", NOT_FOUND_HTML).await;
            continue;
        };

        if !method.eq_ignore_ascii_case("GET") || !is_callback_path(parsed.path()) {
            let mut stream = reader.into_inner();
            write_simple_http(&mut stream, "HTTP/1.1 404 Not Found", NOT_FOUND_HTML).await;
            continue;
        }

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
        write_simple_http(&mut stream, "HTTP/1.1 200 OK", CALLBACK_HTML).await;

        return Ok(LoopbackResult {
            code,
            state: oauth_state,
            error,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::allowed_http_url;

    #[test]
    fn allows_http_and_https() {
        assert!(allowed_http_url("https://as.example.com/authorize").is_ok());
        assert!(allowed_http_url("http://127.0.0.1:8080/token").is_ok());
    }

    #[test]
    fn rejects_non_http_schemes() {
        assert!(allowed_http_url("file:///etc/passwd").is_err());
        assert!(allowed_http_url("javascript:alert(1)").is_err());
        assert!(allowed_http_url("smb://evil/share").is_err());
    }
}
