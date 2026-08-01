use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
    pub migration_status: Option<MigrationStatus>,
}

fn db_path() -> PathBuf {
    // Fail hard rather than fall back to a world-visible location like "/".
    let pifeon_dir = dirs::home_dir()
        .expect("Cannot determine home directory for the Pigeon database")
        .join("Pifeon");
    std::fs::create_dir_all(&pifeon_dir).ok();
    // The DB holds request auth material in plaintext — keep it owner-only.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&pifeon_dir, std::fs::Permissions::from_mode(0o700));
    }
    pifeon_dir.join("pigeon.db")
}

pub fn init_db() -> (Connection, Option<MigrationStatus>) {
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
        );",
    )
    .expect("Failed to create tables");

    let status = run_migrations(&conn).expect("Failed to run schema migrations");

    (conn, status)
}

/// Ordered schema migrations. Each entry runs at most once per DB, in index order,
/// tracked by `schema_meta.schema_version`. Append new migrations to the end —
/// never reorder or remove past ones, since older installs may still be mid-list.
const MIGRATIONS: &[fn(&Connection) -> Result<(), String>] = &[
    migrate_collections_id_to_text,
    create_mcp_oauth_table,
    rename_rest_tables,
];

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationStatus {
    pub from_version: i64,
    pub to_version: i64,
}

fn schema_version(conn: &Connection) -> Result<i64, String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_meta (
            key TEXT PRIMARY KEY,
            value INTEGER NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT value FROM schema_meta WHERE key = 'schema_version'",
        [],
        |row| row.get(0),
    )
    .or_else(|_| {
        conn.execute(
            "INSERT INTO schema_meta (key, value) VALUES ('schema_version', 0)",
            [],
        )
        .map_err(|e| e.to_string())?;
        Ok(0)
    })
}

fn set_schema_version(conn: &Connection, version: i64) -> Result<(), String> {
    conn.execute(
        "INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?1)
         ON CONFLICT(key) DO UPDATE SET value = ?1",
        params![version],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Runs every pending migration in order, bumping `schema_version` one step at a time
/// so a crash mid-migration resumes from the last completed step on next launch.
fn run_migrations(conn: &Connection) -> Result<Option<MigrationStatus>, String> {
    let from_version = schema_version(conn)?;
    let target_version = MIGRATIONS.len() as i64;

    if from_version >= target_version {
        return Ok(None);
    }

    for (i, migration) in MIGRATIONS.iter().enumerate().skip(from_version as usize) {
        migration(conn)?;
        set_schema_version(conn, (i + 1) as i64)?;
    }

    Ok(Some(MigrationStatus {
        from_version,
        to_version: target_version,
    }))
}

fn migrate_collections_id_to_text(conn: &Connection) -> Result<(), String> {
    let table_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'collections'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if table_exists == 0 {
        return Ok(());
    }

    let mut stmt = conn
        .prepare("PRAGMA table_info(collections)")
        .map_err(|e| e.to_string())?;
    let columns = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?.to_uppercase(),
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut id_is_text = false;
    let mut has_created_at = false;
    for column in columns {
        let (name, data_type) = column.map_err(|e| e.to_string())?;
        if name == "id" {
            id_is_text = data_type.contains("TEXT");
        }
        if name == "created_at" {
            has_created_at = true;
        }
    }

    if id_is_text && has_created_at {
        return Ok(());
    }

    conn.execute_batch(
        "ALTER TABLE collections RENAME TO collections_legacy;
        CREATE TABLE collections (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;

    if has_created_at {
        conn.execute(
            "INSERT OR REPLACE INTO collections (id, data, created_at)
             SELECT CAST(id AS TEXT), data, created_at FROM collections_legacy",
            [],
        )
    } else {
        conn.execute(
            "INSERT OR REPLACE INTO collections (id, data, created_at)
             SELECT CAST(id AS TEXT), data, ?1 FROM collections_legacy",
            params![now_ms()?],
        )
    }
    .map_err(|e| e.to_string())?;

    conn.execute("DROP TABLE collections_legacy", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn create_mcp_oauth_table(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS mcp_oauth (
            server_url TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );",
    )
    .map_err(|e| e.to_string())
}

fn table_exists(conn: &Connection, name: &str) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            params![name],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

/// REST is the original feature — its tables predate the `rest_`/`mcp_` naming convention
/// (`mcp_oauth` already follows it). Renames in place; SQLite's `ALTER TABLE ... RENAME TO`
/// preserves all data, so no legacy-copy dance is needed like `migrate_collections_id_to_text`.
fn rename_rest_tables(conn: &Connection) -> Result<(), String> {
    for (old, new) in [
        ("drafts", "rest_drafts"),
        ("history", "rest_history"),
        ("collections", "rest_collections"),
    ] {
        if table_exists(conn, old)? {
            conn.execute(&format!("ALTER TABLE {} RENAME TO {}", old, new), [])
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn now_ms() -> Result<i64, String> {
    Ok(std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64)
}

pub fn save_draft(conn: &Connection, data: &str) -> Result<i64, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64;

    conn.execute(
        "INSERT INTO rest_drafts (data, created_at) VALUES (?1, ?2)",
        params![data, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

pub fn get_drafts(conn: &Connection) -> Result<Vec<(i64, String)>, String> {
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

pub fn delete_draft(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM rest_drafts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_draft(conn: &Connection, id: i64, data: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE rest_drafts SET data = ?1 WHERE id = ?2",
        params![data, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn add_history(conn: &Connection, data: &str, timestamp: i64) -> Result<i64, String> {
    conn.execute(
        "INSERT INTO rest_history (data, timestamp) VALUES (?1, ?2)",
        params![data, timestamp],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

pub fn get_history(conn: &Connection) -> Result<Vec<(i64, String)>, String> {
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

pub fn update_history(conn: &Connection, id: i64, data: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE rest_history SET data = ?1, timestamp = ?2 WHERE id = ?3",
        params![
            data,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_millis() as i64,
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_history(conn: &Connection, id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM rest_history WHERE id = ?1", params![id])
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
        "INSERT OR REPLACE INTO rest_collections (id, data, created_at) VALUES (?1, ?2, ?3)",
        params![id, data, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_collections(conn: &Connection) -> Result<Vec<(String, String)>, String> {
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

pub fn update_collection(conn: &Connection, id: &str, data: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE rest_collections SET data = ?1 WHERE id = ?2",
        params![data, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_collection(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM rest_collections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- MCP OAuth operations ---
// `server_url` is the canonical MCP server URI (see `canonicalizeServerUrl` on the
// frontend) — one row per MCP server, holding its registered client + tokens as JSON.

pub fn save_mcp_oauth(conn: &Connection, server_url: &str, data: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO mcp_oauth (server_url, data, updated_at) VALUES (?1, ?2, ?3)",
        params![server_url, data, now_ms()?],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_mcp_oauth(conn: &Connection, server_url: &str) -> Result<Option<String>, String> {
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

pub fn delete_mcp_oauth(conn: &Connection, server_url: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM mcp_oauth WHERE server_url = ?1",
        params![server_url],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

