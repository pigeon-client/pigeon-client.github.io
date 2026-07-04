use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::Duration;
use tauri::State;

mod db;

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
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct RequestHeader {
    pub key: String,
    pub value: String,
}

#[tauri::command]
async fn send_api_request(
    method: String,
    url: String,
    headers: Vec<RequestHeader>,
    body: Option<String>,
    body_type: String,
    follow_redirects: Option<bool>,
    ssl_verify: Option<bool>,
    proxy_url: Option<String>,
) -> Result<ApiResponse, String> {
    let follow = follow_redirects.unwrap_or(true);
    let verify = ssl_verify.unwrap_or(true);
    let proxy_trim = proxy_url
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    let client = if follow && verify && proxy_trim.is_none() {
        get_http_client().clone()
    } else {
        build_custom_client(follow, verify, proxy_trim)?
    };

    let reqwest_method = match method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "PATCH" => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };

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

    if let Some(body_content) = body {
        match body_type.as_str() {
            "application/json" | "text/plain" | "text/xml" => {
                if !user_overrides_ct {
                    request_builder = request_builder.header("Content-Type", &body_type);
                }
                request_builder = request_builder.body(body_content);
            }
            "application/x-www-form-urlencoded" => {
                if !user_overrides_ct {
                    request_builder =
                        request_builder.header("Content-Type", "application/x-www-form-urlencoded");
                }
                request_builder = request_builder.body(body_content);
            }
            "application/octet-stream" => {
                if !user_overrides_ct {
                    request_builder =
                        request_builder.header("Content-Type", "application/octet-stream");
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
            _ => {
                request_builder = request_builder.body(body_content);
            }
        }
    }

    let start = std::time::Instant::now();

    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let elapsed = start.elapsed().as_millis() as u64;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("Unknown").to_string();

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

    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    let size = body_bytes.len();

    Ok(ApiResponse {
        status,
        status_text,
        headers: resp_headers,
        body: body_bytes.to_vec(),
        content_type,
        response_time: elapsed,
        size,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_conn = db::init_db();
    let db_state = db::DbState {
        conn: std::sync::Mutex::new(db_conn),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            send_api_request,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
