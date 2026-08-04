use rusqlite::params;
use tauri::State;

use super::{now_ms, DbState};

// `server_url` is the canonical MCP server URI (see `canonicalizeServerUrl` on the
// frontend) — one row per MCP server, holding its registered client + tokens as JSON.

#[tauri::command]
pub fn save_mcp_oauth(
    state: State<DbState>,
    server_url: String,
    data: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO mcp_oauth (server_url, data, updated_at) VALUES (?1, ?2, ?3)",
        params![server_url, data, now_ms()?],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_mcp_oauth(state: State<DbState>, server_url: String) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT data FROM mcp_oauth WHERE server_url = ?1",
        params![server_url],
        |row| row.get(0),
    )
    .map(Some)
    .or_else(|e| {
        if e == rusqlite::Error::QueryReturnedNoRows {
            Ok(None)
        } else {
            Err(e.to_string())
        }
    })
}

#[tauri::command]
pub fn delete_mcp_oauth(state: State<DbState>, server_url: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM mcp_oauth WHERE server_url = ?1",
        params![server_url],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
