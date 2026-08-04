use futures_util::StreamExt;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{Mutex, Notify};

use crate::http::{ApiResponse, MAX_RESPONSE_BYTES};

/// Cancellation for one in-flight request: `flag` is polled by loops that read a
/// stream incrementally (SSE body, the plain-response body loop); `notify` wakes an
/// in-progress single-shot await (the initial `send()`/`execute()`) that can't poll a
/// flag on its own. Covers every request that supplies a `streamId`, not just SSE.
pub struct CancelHandle {
    pub flag: AtomicBool,
    pub notify: Notify,
}

impl CancelHandle {
    pub fn new() -> Self {
        Self {
            flag: AtomicBool::new(false),
            notify: Notify::new(),
        }
    }
}

/// Per-request cancel handles, keyed by the frontend-generated stream id.
pub struct SseCancelState {
    pub flags: Mutex<HashMap<String, Arc<CancelHandle>>>,
}

#[tauri::command]
pub async fn cancel_sse_stream(
    state: State<'_, Arc<SseCancelState>>,
    stream_id: String,
) -> Result<(), String> {
    let flags = state.flags.lock().await;
    if let Some(handle) = flags.get(&stream_id) {
        handle.flag.store(true, Ordering::SeqCst);
        handle.notify.notify_one();
    }
    Ok(())
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

pub(crate) async fn stream_sse_response(
    response: reqwest::Response,
    start: std::time::Instant,
    app: AppHandle,
    cancel_handle: Arc<CancelHandle>,
    stream_id: String,
    status: u16,
    status_text: String,
    resp_headers: HashMap<String, String>,
    content_type: String,
) -> Result<ApiResponse, String> {
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
        if cancel_handle.flag.load(Ordering::SeqCst) {
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
