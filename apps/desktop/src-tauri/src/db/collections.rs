use rusqlite::params;
use tauri::State;

use super::{now_ms, DbState};

#[tauri::command]
pub fn save_collection(state: State<DbState>, id: String, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO rest_collections (id, data, created_at) VALUES (?1, ?2, ?3)",
        params![id, data, now_ms()?],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_collections(state: State<DbState>) -> Result<Vec<(String, String)>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, data FROM rest_collections ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn update_collection(state: State<DbState>, id: String, data: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE rest_collections SET data = ?1 WHERE id = ?2",
        params![data, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_collection(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM rest_collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
