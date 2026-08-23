pub mod collections;
pub mod drafts;
pub mod history;
pub mod mcp_oauth;

use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::State;

pub struct DbState {
    inner: OnceLock<(Arc<Mutex<Connection>>, Option<MigrationStatus>)>,
}

impl Default for DbState {
    fn default() -> Self {
        Self {
            inner: OnceLock::new(),
        }
    }
}

impl DbState {
    fn ensure(&self) -> &(Arc<Mutex<Connection>>, Option<MigrationStatus>) {
        self.inner.get_or_init(|| {
            let (conn, status) = init_db();
            (Arc::new(Mutex::new(conn)), status)
        })
    }
}

pub(crate) async fn with_conn<T, F>(state: &DbState, f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(&Connection) -> Result<T, String> + Send + 'static,
{
    let conn = Arc::clone(&state.ensure().0);
    tauri::async_runtime::spawn_blocking(move || {
        let guard = conn.lock().map_err(|e| e.to_string())?;
        f(&guard)
    })
    .await
    .map_err(|e| e.to_string())?
}

pub(crate) fn exec_cached(
    conn: &Connection,
    sql: &str,
    params: impl rusqlite::Params,
) -> Result<usize, String> {
    let mut stmt = conn.prepare_cached(sql).map_err(|e| e.to_string())?;
    stmt.execute(params).map_err(|e| e.to_string())
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
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         PRAGMA busy_timeout=5000;
         PRAGMA temp_store=MEMORY;
         PRAGMA cache_size=-64000;
         PRAGMA mmap_size=268435456;",
    )
    .expect("Failed to apply SQLite PRAGMAs");

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS rest_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rest_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rest_collections (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );",
    )
    .expect("Failed to create tables");

    let status = run_migrations(&conn).expect("Failed to run schema migrations");

    (conn, status)
}

type Migration = fn(&Connection) -> Result<(), String>;

/// Ordered schema migrations. Each entry runs at most once per DB, in index order,
/// tracked by `schema_meta.schema_version`. Append new migrations to the end —
/// never reorder or remove past ones, since older installs may still be mid-list.
/// The `migrations_are_append_only` test below pins the name list; update it in
/// the same commit as any addition.
const MIGRATIONS: &[(&str, Migration)] = &[
    (
        "migrate_collections_id_to_text",
        migrate_collections_id_to_text,
    ),
    ("create_mcp_oauth_table", create_mcp_oauth_table),
    ("rename_rest_tables", rename_rest_tables),
    ("create_list_indexes", create_list_indexes),
    (
        "drop_empty_legacy_rest_tables",
        drop_empty_legacy_rest_tables,
    ),
];

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationStatus {
    pub from_version: i64,
    pub to_version: i64,
}

#[tauri::command]
pub fn get_migration_status(state: State<DbState>) -> Option<MigrationStatus> {
    state.ensure().1.clone()
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

    for (i, (_name, migration)) in MIGRATIONS.iter().enumerate().skip(from_version as usize) {
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
        if !table_exists(conn, old)? {
            continue;
        }
        // init_db may already have created empty rest_* tables on an unmigrated DB.
        if table_exists(conn, new)? {
            continue;
        }
        conn.execute(&format!("ALTER TABLE {} RENAME TO {}", old, new), [])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// `init_db` used to CREATE the pre-rename names every launch, so empty `drafts` /
/// `history` / `collections` tables came back after `rename_rest_tables`. Drop them
/// (copying any leftover rows into `rest_*` first).
fn drop_empty_legacy_rest_tables(conn: &Connection) -> Result<(), String> {
    for (old, new) in [
        ("drafts", "rest_drafts"),
        ("history", "rest_history"),
        ("collections", "rest_collections"),
    ] {
        if !table_exists(conn, old)? {
            continue;
        }
        if table_exists(conn, new)? {
            let old_count: i64 = conn
                .query_row(&format!("SELECT COUNT(*) FROM {old}"), [], |row| row.get(0))
                .map_err(|e| e.to_string())?;
            let new_count: i64 = conn
                .query_row(&format!("SELECT COUNT(*) FROM {new}"), [], |row| row.get(0))
                .map_err(|e| e.to_string())?;
            if old_count > 0 && new_count == 0 {
                conn.execute(&format!("DROP TABLE {new}"), [])
                    .map_err(|e| e.to_string())?;
                conn.execute(&format!("ALTER TABLE {old} RENAME TO {new}"), [])
                    .map_err(|e| e.to_string())?;
                continue;
            }
            if old_count > 0 {
                conn.execute(
                    &format!("INSERT OR IGNORE INTO {new} SELECT * FROM {old}"),
                    [],
                )
                .map_err(|e| e.to_string())?;
            }
        } else {
            conn.execute(&format!("ALTER TABLE {old} RENAME TO {new}"), [])
                .map_err(|e| e.to_string())?;
            continue;
        }
        conn.execute(&format!("DROP TABLE {old}"), [])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn create_list_indexes(conn: &Connection) -> Result<(), String> {
    for (table, index, column) in [
        ("rest_history", "idx_rest_history_timestamp", "timestamp"),
        ("rest_drafts", "idx_rest_drafts_created_at", "created_at"),
        (
            "rest_collections",
            "idx_rest_collections_created_at",
            "created_at",
        ),
    ] {
        if !table_exists(conn, table)? {
            continue;
        }
        conn.execute(
            &format!(
                "CREATE INDEX IF NOT EXISTS {} ON {}({})",
                index, table, column
            ),
            [],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub(crate) fn now_ms() -> Result<i64, String> {
    Ok(std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64)
}

#[cfg(test)]
mod tests {
    use super::MIGRATIONS;

    /// Guards the append-only contract on `MIGRATIONS`: older installs resume mid-list by
    /// index, so reordering, renaming, or removing a past entry would desync them. Adding a
    /// migration is fine — update this list in the same commit.
    #[test]
    fn migrations_are_append_only() {
        let names: Vec<&str> = MIGRATIONS.iter().map(|(name, _)| *name).collect();
        assert_eq!(
            names,
            vec![
                "migrate_collections_id_to_text",
                "create_mcp_oauth_table",
                "rename_rest_tables",
                "create_list_indexes",
                "drop_empty_legacy_rest_tables",
            ]
        );
    }
}
