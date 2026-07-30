# Settings

## Overview

App preferences: theme, word wrap, request options, data clearing, update check, and keyboard
shortcuts reference.

## Problem / job to be done

Users need durable preferences (theme, wrap, redirects/SSL/proxy) and a clear place for updates and
destructive data wipes — without a settings store coupled into every feature (localStorage keys).

## User stories

- As a user, I want Dark/Light theme that persists.
- As a user, I want word wrap for body/response editors that persists.
- As a desktop user, I want follow-redirects / SSL verify / proxy for sends.
- As a user, I want to clear history/drafts/all data deliberately.
- As a desktop user, I want to check and install updates in-app.

## Functional requirements

1. Settings modal (`⌘⇧,`): General / Requests / Data / About.
2. Theme → `pg_theme` + `<html>` class `.dark` or light (class removed).
3. Word wrap (General) → `pg_word_wrap`; shared by body editor + response viewer.
4. Request options → `pg_follow_redirects`, `pg_ssl_verify`, `pg_proxy_url` (read at send).
5. Data: live counts (History / Drafts / Collections / Environments) + a "Keep history for"
   retention selector (30 days / 90 days / 1 year / Forever, default 90, `pg_history_retention_days`
   via `features/history/lib/retention.ts`) + Clear History / Drafts / All (envs included on Clear
   All; collections **not** cleared by Clear All). Retention is pruned once on the *next* app start,
   never mid-session.
6. About: version, update status, Check / Install (Tauri updater).
7. Shortcuts modal (`⌘⇧/`).
8. Startup silent update check; badge on gear + About; `UpdateToast` on launch.

## Non-functional requirements

- Browser build shows update UI but cannot install.
- Settings ↔ Execution coupled only via localStorage keys for request options.
- Word wrap is a shared preference, not per-tab.

## Acceptance criteria

- [ ] Toggle theme → UI tokens change; survives reload.
- [ ] Toggle word wrap in Settings → body + response wrap update; survives reload.
- [ ] Requests toggles persist; desktop send respects them.
- [ ] Clear History removes history only; Clear All wipes history/drafts/envs (not collections).
- [ ] Update available → badge + toast (desktop packaged).
- [ ] `⌘⇧,` / `⌘⇧/` open correct modals; Space in fields does not dismiss.

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

`⌘⇧,` Settings · `⌘⇧/` Shortcuts.

## States & edge cases

- The update flow only functions in the packaged app (Tauri updater); the browser build shows
  version/UI but can't install.
- Settings and Execution are coupled only through `localStorage` keys, not a shared store.

## Test ids

Opened via `title="Settings (⌘⇧,)"`. `settings-word-wrap`, `settings-retention`,
`data-count-<history|drafts|collections|environments>`. Nav/theme by button labels ("Light",
"Dark", "Requests", "About") in E2E.

## Key files

`components/SettingsDrawer.tsx`, `components/KeyboardShortcutsModal.tsx`, `lib/theme.ts`,
`lib/updater.ts`.
