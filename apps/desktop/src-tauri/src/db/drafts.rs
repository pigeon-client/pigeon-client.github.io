use rusqlite::params;
use tauri::State;

use super::{now_ms, DbState};

#[tauri::command]
pub fn save_draft(state: State<DbState>, data: String) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = now_ms()?;

    conn.execute(
        "INSERT INTO rest_drafts (data, created_at) VALUES (?1, ?2)",
        params![data, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_drafts(state: State<DbState>) -> Result<Vec<(i64, String)>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, data FROM rest_drafts ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn delete_draft(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM rest_drafts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_draft(state: State<DbState>, id: i64, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE rest_drafts SET data = ?1 WHERE id = ?2",
        params![data, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
