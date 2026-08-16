use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

mod db;
mod http;
mod mcp;
mod oauth;
mod sse;
mod windows;

#[cfg(target_os = "macos")]
mod macos;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (db_conn, migration_status) = db::init_db();
    let db_state = db::DbState {
        conn: std::sync::Mutex::new(db_conn),
        migration_status,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(webview_window) = window.get_webview_window(window.label()) {
                    match event {
                        tauri::WindowEvent::Focused(true) => {
                            macos::ensure_configured(&webview_window);
                        }
                        tauri::WindowEvent::Focused(false) => {
                            macos::flush_presentation(&webview_window);
                        }
                        _ => {}
                    }
                }
            }
        })
        .manage(db_state)
        .manage(Arc::new(sse::SseCancelState {
            flags: Mutex::new(HashMap::new()),
        }))
        .manage(Arc::new(oauth::OauthLoopbackState::default()))
        .invoke_handler(tauri::generate_handler![
            http::send_api_request,
            sse::cancel_sse_stream,
            mcp::send_mcp_request,
            db::drafts::save_draft,
            db::drafts::get_drafts,
            db::drafts::delete_draft,
            db::drafts::update_draft,
            db::history::update_history,
            db::history::add_history,
            db::history::get_history,
            db::history::delete_history,
            db::collections::save_collection,
            db::collections::get_collections,
            db::collections::update_collection,
            db::collections::delete_collection,
            db::get_migration_status,
            oauth::oauth_http_request,
            oauth::open_external_url,
            oauth::oauth_loopback_open,
            oauth::oauth_loopback_wait,
            db::mcp_oauth::save_mcp_oauth,
            db::mcp_oauth::get_mcp_oauth,
            db::mcp_oauth::delete_mcp_oauth,
            windows::open_workspace_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Ready = event {
                use tauri::Manager;
                for (_, window) in app.webview_windows() {
                    macos::ensure_configured(&window);
                }
            }
        });
}
