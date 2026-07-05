# Settings

App preferences: theme, request options, update check, and a shortcuts reference.

## UI

- **Settings** modal (gear icon, `⌘,`) — a centered modal with a left nav (General / Requests /
  Data / About), pop-in animation.
  - **General** — theme swatches (Dark / Light).
  - **Requests** — Follow Redirects, SSL Verification toggles, Proxy URL field.
  - **Data** — counts (History / Drafts / Collections) + Clear History / Clear Drafts / Clear All.
  - **About** — current version, update status, Check Update / Install actions.
- **Keyboard Shortcuts** modal — reference list (`⌘/`).

## UX / interactions

- **Theme** — Dark applies the `.dark` class on `<html>`; Light is the CSS default (class removed).
  Choice persists to `localStorage` (`pg_theme`) and is applied on startup. Syntax highlight colors
  are theme-aware CSS vars.
- **Request options** persist to `localStorage` (`pg_follow_redirects`, `pg_ssl_verify`,
  `pg_proxy_url`); execution reads them at send time.
- **Updates** (desktop) — Tauri updater. Startup runs a silent check; a badge dot appears on the
  gear **and on the About tab** when an update is available, and an in-app **toast** (`UpdateToast`,
  bottom-right) shows on app launch — "Update" opens Settings, dismissible. No OS notification. The
  About tab shows the app name/logo, current + latest version, status, and a manual Check/Install
  flow.
- **Data** — clear actions wipe history/drafts (and collections for "Clear All").

## Keyboard

- `⌘,` open Settings · `⌘/` open Keyboard Shortcuts.

## States & edge cases

- The update flow only functions in the packaged app (Tauri updater); the browser build shows
  version/UI but can't install.
- Settings and Execution are coupled only through `localStorage` keys, not a shared store.

## Test ids

Opened via `title="Settings (⌘,)"`. Nav + theme swatches are selected by their button labels
("Light", "Dark", "Requests", "About") in E2E.

## Key files

`components/SettingsDrawer.tsx`, `components/KeyboardShortcutsModal.tsx`, `lib/theme.ts`,
`lib/updater.ts`.
