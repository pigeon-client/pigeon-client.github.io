use rusqlite::params;
use tauri::State;

use super::{now_ms, DbState};

#[tauri::command]
pub fn add_history(state: State<DbState>, data: String, timestamp: i64) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO rest_history (data, timestamp) VALUES (?1, ?2)",
        params![data, timestamp],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_history(state: State<DbState>) -> Result<Vec<(i64, String)>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, data FROM rest_history ORDER BY timestamp DESC")
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
pub fn update_history(state: State<DbState>, id: i64, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE rest_history SET data = ?1, timestamp = ?2 WHERE id = ?3",
        params![data, now_ms()?, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_history(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM rest_history WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
