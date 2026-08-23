use rusqlite::params;
use tauri::State;

use super::{exec_cached, now_ms, with_conn, DbState};

#[tauri::command]
pub async fn save_draft(state: State<'_, DbState>, data: String) -> Result<i64, String> {
    let now = now_ms()?;
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "INSERT INTO rest_drafts (data, created_at) VALUES (?1, ?2)",
            params![data, now],
        )?;
        Ok(conn.last_insert_rowid())
    })
    .await
}

#[tauri::command]
pub async fn get_drafts(state: State<'_, DbState>) -> Result<Vec<(i64, String)>, String> {
    with_conn(&*state, |conn| {
        let mut stmt = conn
            .prepare_cached("SELECT id, data FROM rest_drafts ORDER BY created_at DESC")
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
    })
    .await
}

#[tauri::command]
pub async fn delete_draft(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(conn, "DELETE FROM rest_drafts WHERE id = ?1", params![id])?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn update_draft(state: State<'_, DbState>, id: i64, data: String) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "UPDATE rest_drafts SET data = ?1 WHERE id = ?2",
            params![data, id],
        )?;
        Ok(())
    })
    .await
}
