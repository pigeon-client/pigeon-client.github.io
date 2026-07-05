# settings

App preferences: theme, request options (redirects/SSL/proxy), update check, shortcuts.

## Public API (`index.ts`)
- `SettingsDrawer`, `KeyboardShortcutsModal`
- `applyTheme`, `AppTheme`
- `UpdateVersionModel`, `UpdateCheckResult`, `UpdateCheckStatus`
- `getCurrentVersion`, `checkUpdateVersion`, `installUpdate`, `checkForUpdates`

## Notes
Settings persist to `localStorage` (`pg_theme`, `pg_follow_redirects`, `pg_ssl_verify`,
`pg_proxy_url`); execution reads those keys when sending. `checkForUpdates` also runs
once on app start.

The update flow uses Tauri updater/process plugins. `SettingsDrawer` shows current version,
manual "Check Update" CTA, available update metadata, and install action. Startup checks are
silent; manual checks surface state/errors in the drawer.
