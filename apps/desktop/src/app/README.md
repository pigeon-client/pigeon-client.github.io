# app

Bootstrap and layout shell only — no business logic.

- `App.tsx` — root bootstrap
- `AppContent.tsx` — layout orchestration, global keyboard shortcuts, panel resizing
- `layout/Header.tsx`, `layout/Sidebar.tsx` — top bar + navigation, wiring features via barrels

`app/` imports features; features must never import from `app/`.
