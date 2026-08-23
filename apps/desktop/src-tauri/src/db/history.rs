use rusqlite::params;
use tauri::State;

use super::{exec_cached, now_ms, with_conn, DbState};

/// Drop `snapshot.bodyText` from list payloads so boot IPC isn't 256KB × N rows.
/// Sets `snapshot.bodyOmitted` when a body was present so the UI can lazy-fetch.
pub(crate) fn strip_snapshot_body(data: &str) -> String {
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(data) else {
        return data.to_string();
    };
    let Some(snapshot) = value.get_mut("snapshot").and_then(|s| s.as_object_mut()) else {
        return data.to_string();
    };
    if snapshot.remove("bodyText").is_some() {
        snapshot.insert("bodyOmitted".into(), serde_json::Value::Bool(true));
    }
    serde_json::to_string(&value).unwrap_or_else(|_| data.to_string())
}

#[tauri::command]
pub async fn add_history(
    state: State<'_, DbState>,
    data: String,
    timestamp: i64,
) -> Result<i64, String> {
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "INSERT INTO rest_history (data, timestamp) VALUES (?1, ?2)",
            params![data, timestamp],
        )?;
        Ok(conn.last_insert_rowid())
    })
    .await
}

#[tauri::command]
pub async fn get_history(state: State<'_, DbState>) -> Result<Vec<(i64, String)>, String> {
    with_conn(&*state, |conn| {
        let mut stmt = conn
            .prepare_cached("SELECT id, data FROM rest_history ORDER BY timestamp DESC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for row in rows {
            let (id, data) = row.map_err(|e| e.to_string())?;
            result.push((id, strip_snapshot_body(&data)));
        }
        Ok(result)
    })
    .await
}

/// Full snapshot JSON for one history row (includes `bodyText` when stored).
#[tauri::command]
pub async fn get_history_snapshot(
    state: State<'_, DbState>,
    id: i64,
) -> Result<Option<String>, String> {
    with_conn(&*state, move |conn| {
        let mut stmt = conn
            .prepare_cached("SELECT data FROM rest_history WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let data: String = match stmt.query_row(params![id], |row| row.get(0)) {
            Ok(d) => d,
            Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
            Err(e) => return Err(e.to_string()),
        };
        let value: serde_json::Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;
        Ok(value.get("snapshot").map(|s| s.to_string()))
    })
    .await
}

#[tauri::command]
pub async fn update_history(
    state: State<'_, DbState>,
    id: i64,
    data: String,
) -> Result<(), String> {
    let now = now_ms()?;
    with_conn(&*state, move |conn| {
        exec_cached(
            conn,
            "UPDATE rest_history SET data = ?1, timestamp = ?2 WHERE id = ?3",
            params![data, now, id],
        )?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn delete_history(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    with_conn(&*state, move |conn| {
        exec_cached(conn, "DELETE FROM rest_history WHERE id = ?1", params![id])?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn prune_history_before(
    state: State<'_, DbState>,
    timestamp: i64,
) -> Result<u64, String> {
    with_conn(&*state, move |conn| {
        let n = exec_cached(
            conn,
            "DELETE FROM rest_history WHERE timestamp < ?1",
            params![timestamp],
        )?;
        Ok(n as u64)
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::strip_snapshot_body;

    #[test]
    fn strip_snapshot_body_drops_text_and_flags_omitted() {
        let input = r#"{"url":"https://x","snapshot":{"status":200,"statusText":"OK","contentType":"application/json","size":12,"bodyText":"{\"ok\":true}","truncated":false}}"#;
        let out = strip_snapshot_body(input);
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert!(v["snapshot"].get("bodyText").is_none());
        assert_eq!(v["snapshot"]["bodyOmitted"], true);
        assert_eq!(v["snapshot"]["status"], 200);
        assert_eq!(v["url"], "https://x");
    }

    #[test]
    fn strip_snapshot_body_leaves_metadata_only_snapshots() {
        let input = r#"{"snapshot":{"status":200,"truncated":false}}"#;
        let out = strip_snapshot_body(input);
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert!(v["snapshot"].get("bodyOmitted").is_none());
        assert_eq!(v["snapshot"]["status"], 200);
    }

    #[test]
    fn strip_snapshot_body_passthrough_on_invalid_json() {
        assert_eq!(strip_snapshot_body("not-json"), "not-json");
    }
}
