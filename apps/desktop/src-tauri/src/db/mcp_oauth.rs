use rusqlite::params;
use tauri::State;

use super::{exec_cached, now_ms, with_conn, DbState};

// `server_url` is the canonical MCP server URI (see `canonicalizeServerUrl` on the
// frontend) — one row per MCP server, holding its registered client + tokens as JSON.

#[tauri::command]
pub async fn save_mcp_oauth(
    state: State<'_, DbState>,
    server_url: String,
    data: String,
) -> Result<(), String> {
    let now = now_ms()?;
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "INSERT OR REPLACE INTO mcp_oauth (server_url, data, updated_at) VALUES (?1, ?2, ?3)",
            params![server_url, data, now],
        )?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn get_mcp_oauth(
    state: State<'_, DbState>,
    server_url: String,
) -> Result<Option<String>, String> {
    with_conn(&*state, move |conn| {
        let mut stmt = conn
            .prepare_cached("SELECT data FROM mcp_oauth WHERE server_url = ?1")
            .map_err(|e| e.to_string())?;
        stmt.query_row(params![server_url], |row| row.get(0))
            .map(Some)
            .or_else(|e| {
                if e == rusqlite::Error::QueryReturnedNoRows {
                    Ok(None)
                } else {
                    Err(e.to_string())
                }
            })
    })
    .await
}

#[tauri::command]
pub async fn delete_mcp_oauth(state: State<'_, DbState>, server_url: String) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "DELETE FROM mcp_oauth WHERE server_url = ?1",
            params![server_url],
        )?;
        Ok(())
    })
    .await
}
