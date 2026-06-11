use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

fn db_path() -> PathBuf {
    let pifeon_dir = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/"))
        .join("Pifeon");
    std::fs::create_dir_all(&pifeon_dir).ok();
    pifeon_dir.join("pigeon.db")
}

pub fn init_db() -> Connection {
    let path = db_path();
    let conn = Connection::open(&path).expect("Failed to open database");

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );"
    ).expect("Failed to create tables");

    conn
}

pub fn save_draft(conn: &Connection, data: &str) -> Result<i64, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64;

    conn.execute(
        "INSERT INTO drafts (data, created_at) VALUES (?1, ?2)",
        params![data, now],
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

pub fn get_drafts(conn: &Connection) -> Result<Vec<(i64, String)>, String> {
    let mut stmt = conn.prepare("SELECT id, data FROM drafts ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn delete_draft(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM drafts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_draft(conn: &Connection, id: i64, data: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE drafts SET data = ?1 WHERE id = ?2",
        params![data, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn add_history(conn: &Connection, data: &str, timestamp: i64) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO history (data, timestamp) VALUES (?1, ?2)",
        params![data, timestamp],
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

pub fn get_history(conn: &Connection) -> Result<Vec<(i64, String)>, String> {
    let mut stmt = conn.prepare("SELECT id, data FROM history ORDER BY timestamp DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn update_history(conn: &Connection, id: i64, data: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE history SET data = ?1, timestamp = ?2 WHERE id = ?3",
        params![data, std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis() as i64, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_history(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM history WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Collection operations ---

pub fn save_collection(conn: &Connection, id: &str, data: &str) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64;

    conn.execute(
        "INSERT OR REPLACE INTO collections (id, data, created_at) VALUES (?1, ?2, ?3)",
        params![id, data, now],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_collections(conn: &Connection) -> Result<Vec<(String, String)>, String> {
    let mut stmt = conn.prepare("SELECT id, data FROM collections ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn update_collection(conn: &Connection, id: &str, data: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE collections SET data = ?1 WHERE id = ?2",
        params![data, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_collection(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
