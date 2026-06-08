use std::collections::HashMap;
use tauri::State;

mod db;

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
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(false)
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let reqwest_method = match method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "PATCH" => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };

    let mut request_builder = client.request(reqwest_method, &url);

    for h in &headers {
        request_builder = request_builder.header(&h.key, &h.value);
    }

    if let Some(body_content) = body {
        match body_type.as_str() {
            "application/json" | "text/plain" | "text/xml" => {
                request_builder = request_builder
                    .header("Content-Type", &body_type)
                    .body(body_content);
            }
            "application/x-www-form-urlencoded" => {
                request_builder = request_builder
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .body(body_content);
            }
            "application/octet-stream" => {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_conn = db::init_db();
    let db_state = db::DbState {
        conn: std::sync::Mutex::new(db_conn),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            send_api_request,
            save_draft,
            get_drafts,
            delete_draft,
            add_history,
            get_history,
            delete_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
