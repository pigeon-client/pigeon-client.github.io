# Settings

## Overview

App preferences: theme, word wrap, request options, response snapshots, data clearing, update
check, and keyboard shortcuts reference.

## Problem / job to be done

Users need durable preferences (theme, wrap, redirects/SSL/proxy) and a clear place for updates and
destructive data wipes — without a settings store coupled into every feature (localStorage keys).

## User stories

- As a user, I want Dark/Light theme that persists.
- As a user, I want word wrap for body/response editors that persists.
- As a desktop user, I want follow-redirects / SSL verify / proxy for sends.
- As a user, I want to toggle saving response snapshots into history.
- As a user, I want to clear history/drafts/all data deliberately.
- As a desktop user, I want to check and install updates in-app.

## Functional requirements

1. Settings modal (`⌘,`): General / Requests / Data / About.
2. Theme → `pg_theme` + `<html>` class `.dark` or light (class removed).
3. Word wrap (General) → `pg_word_wrap`; shared by body editor + response viewer.
4. Request options → `pg_follow_redirects`, `pg_ssl_verify`, `pg_proxy_url` (read at send).
5. Save response snapshots → `pg_save_snapshots` (default on); gates history snapshot writes.
6. Data: live counts (History / Drafts / Collections / Environments) + a "Keep history for"
   retention selector (30 days / 90 days / 1 year / Forever, default 90,
   `pg_history_retention_days` via `features/rest/history/lib/retention.ts`) + Clear History /
   Drafts / All (envs included on Clear All; collections **not** cleared by Clear All). Retention
   is pruned once on the *next* app start, never mid-session.
7. About: version, update status, Check / Install (Tauri updater).
8. Shortcuts modal (`⌘⇧/`) — must match [keyboard-shortcuts.md](./keyboard-shortcuts.md).
9. Startup silent update check; badge on gear + About; `UpdateToast` on launch.

## Non-functional requirements

- Browser build shows update UI but cannot install.
- Settings ↔ Execution coupled only via localStorage keys for request options.
- Word wrap is a shared preference, not per-tab.

## Acceptance criteria

- [ ] Toggle theme → UI tokens change; survives reload.
- [ ] Toggle word wrap in Settings → body + response wrap update; survives reload.
- [ ] Requests toggles persist; desktop send respects them.
- [ ] Snapshots toggle off → new history rows omit / skip large snapshot payloads per send path.
- [ ] Clear History removes history only; Clear All wipes history/drafts/envs (not collections).
- [ ] Update available → badge + toast (desktop packaged).
- [ ] `⌘,` / `⌘⇧/` open correct modals; Space in fields does not dismiss.

## UI

Centered modal, left nav, pop-in animation. Theme swatches; word-wrap toggle; request toggles;
About with logo/version.

## UX / interactions

Update toast: "Update" opens Settings → About; dismissible. Gear badge (when an update is
available) also opens About. No OS notification required.

## Keyboard

`⌘,` Settings · `⌘⇧/` Shortcuts. See [keyboard-shortcuts.md](./keyboard-shortcuts.md).

## States & edge cases

- Updater only in packaged Tauri app.
- Legacy `.theme-pink` / `.theme-light` may exist in CSS but UI only exposes Dark / Light.

## Manual test checklist

- [ ] Dark ↔ Light; reload persistence.
- [ ] Word wrap on/off in General; body + response reflect it.
- [ ] Set proxy URL; confirm stored (desktop send optional).
- [ ] Toggle save snapshots; send; inspect history reopen behavior.
- [ ] Clear History / Drafts / All — confirm counts; collections still present after Clear All.
- [ ] Open Shortcuts; verify listed chords match [keyboard-shortcuts.md](./keyboard-shortcuts.md).
- [ ] Desktop: Check Update flow (or graceful "up to date").

## Automation coverage

- Playwright: `e2e/settings-theme.spec.ts`.

## Test ids

`settings-word-wrap`, `settings-retention`, `settings-save-snapshots`,
`data-count-<history|drafts|collections|environments>`. Nav/theme by button labels ("Light",
"Dark", "Requests", "About") in E2E.

## Key files

`components/SettingsDrawer.tsx`, `components/KeyboardShortcutsModal.tsx`, `lib/theme.ts`,
`lib/wordWrap.ts`, `hooks/useWordWrap.ts`, `lib/updater.ts`,
`src/app/layout/UpdateToast.tsx`.

## Open risks

- SSL/proxy not testable in browser CI.
- Clear All is destructive — confirm copy must stay unambiguous; collections survive intentionally.
- Header tooltip copy for Settings must stay aligned with `⌘,`.
