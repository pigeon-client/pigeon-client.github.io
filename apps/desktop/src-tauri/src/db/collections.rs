use rusqlite::params;
use tauri::State;

use super::{exec_cached, now_ms, with_conn, DbState};

#[tauri::command]
pub async fn save_collection(
    state: State<'_, DbState>,
    id: String,
    data: String,
) -> Result<(), String> {
    let now = now_ms()?;
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "INSERT OR REPLACE INTO rest_collections (id, data, created_at) VALUES (?1, ?2, ?3)",
            params![id, data, now],
        )?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn get_collections(state: State<'_, DbState>) -> Result<Vec<(String, String)>, String> {
    with_conn(&*state, |conn| {
        let mut stmt = conn
            .prepare_cached("SELECT id, data FROM rest_collections ORDER BY created_at ASC")
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
    })
    .await
}

#[tauri::command]
pub async fn update_collection(
    state: State<'_, DbState>,
    id: String,
    data: String,
) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "UPDATE rest_collections SET data = ?1 WHERE id = ?2",
            params![data, id],
        )?;
        Ok(())
    })
    .await
}

/// Name-only update — avoids sending the full tree over IPC / re-stringifying it.
#[tauri::command]
pub async fn patch_collection_name(
    state: State<'_, DbState>,
    id: String,
    name: String,
) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "UPDATE rest_collections SET data = json_set(data, '$.name', ?1) WHERE id = ?2",
            params![name, id],
        )?;
        Ok(())
    })
    .await
}

/// Collection-level folder config — same as a name patch, no tree rewrite.
#[tauri::command]
pub async fn patch_collection_config(
    state: State<'_, DbState>,
    id: String,
    config: String,
) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "UPDATE rest_collections SET data = json_set(data, '$.config', json(?1)) WHERE id = ?2",
            params![config, id],
        )?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn delete_collection(state: State<'_, DbState>, id: String) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "DELETE FROM rest_collections WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    })
    .await
}
