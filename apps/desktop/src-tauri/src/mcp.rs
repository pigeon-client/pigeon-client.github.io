use std::collections::HashMap;

use crate::http::{build_custom_client, get_http_client, RequestHeader};

/// Raw HTTP response for the MCP transport — the frontend owns all JSON-RPC
/// framing (mirrors the `HttpClient` port pattern in `features/execution`).
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpHttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body_text: String,
}

// --- MCP transport ---
// Deliberately dumb: POST one JSON-RPC message, return status/headers/body text.
// The frontend (`features/mcp`) owns initialize/session-id/tool-call framing.
#[tauri::command]
pub async fn send_mcp_request(
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
