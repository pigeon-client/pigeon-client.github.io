use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

// --- Workspace windows ---
// REST/MCP/GraphQL are separate OS windows, singleton per kind — reopening focuses the
// existing window instead of duplicating it. REST is always the app's default "main" window
// (created at startup by tauri.conf.json), never (re)created here.
#[tauri::command]
pub fn open_workspace_window(app: AppHandle, kind: String) -> Result<(), String> {
    let (label, title, width, height) = match kind.as_str() {
        "rest" => ("main", "Pigeon - API Tester", 1280.0, 800.0),
        "mcp" => ("mcp", "Pigeon - MCP", 1100.0, 720.0),
        "graphql" => ("graphql", "Pigeon - GraphQL", 1100.0, 720.0),
        other => return Err(format!("Unknown workspace kind: {}", other)),
    };

    if let Some(w) = app.get_webview_window(label) {
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, label, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(width, height)
        .min_inner_size(900.0, 600.0)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
