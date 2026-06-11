# EM Review: Redesign Pigeon App — "Simple but Easy to Use"

## Feasibility Assessment

| Change | Feasibility | Effort | Risk |
|--------|-------------|--------|------|
| **Toolbar.tsx** (merge Header + TabBar) | ✅ Feasible | Small | Low |
| **Collapsible Sidebar** (3 sections, 48px strip) | ✅ Feasible | Medium | Low |
| **ResizablePanel** (vertical + horizontal split) | ✅ Feasible | Small | Low |
| **Collections feature** (store + SQLite + DnD) | ✅ Feasible | Large | Medium |
| **AuthEditor** (single-panel layout) | ✅ Feasible | Small | Low |
| **BodyEditor** (improved code editor) | ✅ Feasible | Medium | Low |
| **ResponsePanel** (new empty state, Console tab, collapse) | ✅ Feasible | Medium | Low |
| **EnvModal** (table editor) | ✅ Feasible | Small | Low |
| **Keyboard shortcuts** | ✅ Feasible | Small | Low |
| **CSS variables / typography refactor** | ✅ Feasible | Small | Low |
| **Rust backend: collections CRUD** | ⚠️ Requires investigation | Medium | Medium |
| **Drag-and-drop for collections** | ✅ Feasible | Medium | Medium |

**Overall: APPROVED with action items** — the redesign is technically feasible. All changes build on existing patterns and components.

---

## 1. Toolbar (Header + TabBar merge) — Feasible ✅

**Current state**: `Header.tsx` (35 lines) + `TabBar.tsx` (95 lines) = 130 lines total.

**Assessment**: Straightforward merge. The design's provided `Toolbar.tsx` code maps cleanly to the existing tab behavior (double-click rename, middle-click close, status dot, add button). The existing logo SVG from `Header.tsx` is reusable.

**Concerns**: None.

**Recommendation**: Create `Toolbar.tsx` and delete `Header.tsx` + `TabBar.tsx`. The URL bar moves down one row (from inside main content area to a dedicated second row), which is a simple layout change in `App.tsx`.

---

## 2. Collapsible Sidebar with 3 Sections — Feasible ✅

**Current state**: `Sidebar.tsx` (252 lines) has a Drafts/History tab toggle at the top with domain grouping.

**Assessment**: The design adds:
- Collapsible sections (Collections, History, Drafts) with `SidebarSection` component
- Collapse to 48px icon strip with smooth CSS `transition-all duration-200`
- Resizable sidebar width (200-400px) with drag handle
- Auto-focus search bar on Cmd+F

All of these are pure frontend changes using Zustand for state and CSS transitions. The existing domain-grouping logic for History/Drafts can be reused inside their respective sections.

**Concerns**:
- The sidebar collapse animation (`width` transition) can cause performance issues if content reflows during animation. Use `transform` or `will-change: width` as mitigations.
- The design doesn't specify how the sidebar handles the case where the user collapses all 3 sections internally (the sections themselves are collapsible). Should the sections remember their collapsed state? Recommend adding a `collapsedSections` set to localStorage.

---

## 3. ResizablePanel (Dual Orientation) — Feasible ✅

**Current state**: `App.tsx` lines 23-54 implement a vertical-only drag resize between request editor and response panel. The logic is already in place.

**Assessment**: The design wraps this into a component that supports both orientations. The resize logic is line-for-line portable from the current `App.tsx`. The orientation toggle button in the divider is a nice touch.

**Concerns**: None. This is the lowest-risk change in the entire redesign.

---

## 4. Collections Feature — Feasible ⚠️ (back-end work required)

**Current state**: No collections exist. Only `drafts` and `history` tables in SQLite.

**Assessment**: The design provides a complete `collectionStore.ts` with typed Zustand store. The collections data model (`Collection` + `CollectionItem`) is clean. The SQLite persistence must follow the existing Tauri invoke pattern.

**Backend work required** — new Rust commands to add:

| Command | Signature | SQL |
|---------|-----------|-----|
| `save_collection` | `(data: String) -> i64` | `INSERT INTO collections (data, created_at) VALUES (?1, ?2)` |
| `get_collections` | `() -> Vec<(i64, String)>` | `SELECT id, data FROM collections ORDER BY name ASC` |
| `update_collection` | `(id: i64, data: String) -> ()` | `UPDATE collections SET data = ?1 WHERE id = ?2` |
| `delete_collection` | `(id: i64) -> ()` | `DELETE FROM collections WHERE id = ?1` |
| `reorder_collections` | `(ids: Vec<i64>) -> ()` | Optional — for drag reorder of collection folders |

**New SQLite table needed:**
```sql
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
```

**Drag-and-drop**: The HTML5 drag API (`draggable`, `onDragStart`, `onDrop`, `onDragOver`) is straightforward. The design doesn't specify whether items from History/Drafts can be dragged into Collections. Recommend clarifying this. If yes, we need to handle the conversion from HistoryItem format to CollectionItem format.

---

## 5. AuthEditor — Single Panel — Feasible ✅

**Current state**: Two-column layout with type selector on left, fields on right. "Learn more" link. Vault banner at bottom.

**Assessment**: Simple structural refactor. The design provides complete implementation code. The `AUTH_DESCRIPTIONS` map already exists. The vault banner becomes a `<details>` collapsible element.

**Concerns**: None.

---

## 6. BodyEditor — Improved Code Editor — Feasible ✅

**Current state**: Transparent textarea overlay approach (line 193-213 of BodyEditor.tsx). Uses highlight.js for syntax highlighting overlay. The overlay can get out of sync and line numbers don't scroll properly.

**Assessment**: The design replaces this with a synced-line-numbers approach without the overlay. A `ResizeObserver` syncs the line number scroll with the textarea scroll. This is simpler and more robust.

**Tradeoff noted**: The new approach removes real-time syntax highlighting in the editor. Syntax highlighting is only applied on copy/download via `highlight.js`. The design explicitly calls this out and recommends against CodeMirror/Monaco to keep the bundle small.

**Recommendation**: Accept the tradeoff. If real-time highlighting is desired later, add CodeMirror 6 (~30KB gzip) as a separate task.

---

## 7. ResponsePanel — Feasible ✅

**Current state**: Has astronaut SVG, 2 response tabs (Body, Headers), HeroUI `Button` components for actions.

**Assessment**:
- New empty state (rocket SVG inline) — simple
- Collapse/expand toggle — trivial
- Preview tab (HTML iframe) — already exists in conditional logic, just promoted to top-level tab
- Console tab — requires capturing `resolvedUrl` and `sentHeaders` from the request pipeline
- Icon-only action buttons with tooltips — minor refactor

**Concern — Console tab data**: The design assumes `resolvedUrl` and `sentHeaders` are passed to `ResponsePanel`. Currently, `useApiRequest.ts` sends requests and returns responses but doesn't return the resolved URL or sent headers. Need to:
1. Modify `useApiRequest.ts` to also return `{ resolvedUrl, sentHeaders }`
2. Or compute these in the ResponsePanel from the tab's request config
3. Update `ApiResponse` type or create a new wrapper type

This is medium-effort but well-scoped.

---

## 8. EnvModal — Table Editor — Feasible ✅

**Current state**: Textarea-based editing (`KEY=VALUE` lines). Uses HeroUI `Button` component.

**Assessment**: Replace textarea with the existing `KeyValueEditor` component. The design provides a helper function `toKeyValueItems()` to convert `Record<string, string>` to `KeyValue[]`. Very straightforward.

**Concerns**: The "Test Variables" button needs a small preview modal or inline tooltip. The design doesn't specify the UI for this. Recommend a simple tooltip or inline resolved preview.

---

## 9. Keyboard Shortcuts — Feasible ✅

**Current state**: Only `Cmd+Enter` is handled (in App.tsx useEffect).

**Assessment**: The design provides a complete keyboard handler implementation. All shortcuts are standard and well-documented. The `?` key modal is a simple overlay.

**⚠️ Note on `?` key**: The `?` character typically requires `Shift+/` on US keyboards. The handler checks `e.key === '?'` which works in modern browsers. For international keyboards, consider also handling `e.key === '/' && e.shiftKey`.

---

## 10. CSS Variables & Typography Refactor — Feasible ✅

**Current state**: `index.css` has well-organized CSS variables for light and dark themes, mapped via Tailwind `@theme`.

**Assessment**: The design changes 14 CSS variable values and adjusts font sizes. These are one-to-one value changes in `index.css`. The existing `@theme` mappings mean all Tailwind utility classes will automatically pick up the new values.

**⚠️ Compatibility note**: The design changes `--bg-tertiary` from `#1e1e1e` to `#1a1a1a`. This is currently used by `<Header>`, `<Sidebar>`, and `<TabBar>`. After the merge, the Toolbar will use `bg-bg-tertiary`. Verify the new color works well for all surfaces.

---

## Architecture & Cross-Cutting Concerns

### A. HeroUI Dependency vs. Custom Components

**Issue**: The current app uses HeroUI's `Button` component in `EnvModal.tsx`, `ResponsePanel.tsx`, and potentially elsewhere. The design specifies raw Tailwind-styled buttons throughout. Mixing these will cause visual inconsistency.

**Risk**: Low, but worth noting. HeroUI buttons have their own padding, font-size, and hover styles that differ from the design spec.

**Recommendation**: For this redesign, replace all HeroUI `Button` usage with custom Tailwind buttons matching the design's spec (consistent hover states, focus rings, sizing). This is a mechanical change across ~3 files.

### B. Persistence Strategy: localStorage vs SQLite

**Issue**: The requirements say "All user preferences must persist across restarts using the Rust backend/SQLite." The design uses `localStorage` for:
- `pigeon-sidebar-collapsed`
- `pigeon-sidebar-width`
- `pigeon-layout-orientation`
- `pigeon-response-size`

In Tauri apps, `localStorage` does persist across restarts (it's backed by the WebView's persistent storage). However, if the user clears browser data, preferences are lost.

**Recommendation**: Accept localStorage for UI preferences. They are not critical data. Adding Rust commands for preferences adds complexity with little benefit. Collections data, drafts, and history should use SQLite (as designed). Flag this as a design vs. requirements discrepancy.

### C. Collections: Single SQLite Table for All Data

**Current pattern**: Each collection is serialized as a JSON string in a single row. This matches the existing draft/history pattern in `db.rs`.

**Pros**: Simple, consistent with existing code, easy to add.
**Cons**: Can't query individual collection items in SQL; must parse JSON in frontend.

This is acceptable for MVP. If collection sizes grow large, we can normalize later.

### D. CollectionItem Data Model — `request` Field Scope

The `CollectionItem` interface in the design includes `request: Record<string, any>` — a serialized `RequestConfig`. This will store the full request configuration (method, url, headers, body, auth, etc.) as JSON. This is large but necessary for restoring requests from collections.

**⚠️ File fields**: `RequestConfig` has a `file: File | null` field. `File` objects cannot be serialized to JSON. The current `historyStore.ts` handles this with `stripFiles()` before saving. The same approach must be used for collections.

**Recommendation**: Add a `stripFiles()` call when saving to collections, just like the existing draft/history pattern.

### E. Module Size / Bundle Impact

The redesign doesn't add any new npm dependencies (no CodeMirror, no Monaco). The estimated bundle impact is:
- New components: ~4KB gzip (Toolbar, ResizablePanel, KeyboardShortcutsModal, StatusBar)
- Modified components: ~2KB delta (existing code restructured)
- No new runtime dependencies

### F. Test Strategy

This redesign changes 13+ components. Recommend:
1. **Per-component visual verification** — each modified component renders correctly
2. **Keyboard shortcut E2E test** — manual checklist of all 9 shortcuts
3. **Collections CRUD test** — create, rename, delete, add items, drag-and-drop
4. **Layout persistence test** — close and reopen app, verify sidebar width/orientation persists
5. **Regression test** — send requests with all body types, auth types, env variables

---

## Recommended Implementation Order

| Phase | Items | Rationale |
|-------|-------|-----------|
| **Phase 1** (Foundation) | 1. CSS variables refactor | No behavior change, safe to start |
| | 2. `collectionStore.ts` + types | New store, independent of UI |
| | 3. Rust backend: collections table + commands | Backend work, independent of frontend |
| **Phase 2** (Layout) | 4. `Toolbar.tsx` | Replaces Header + TabBar, big visual change |
| | 5. `UrlBar.tsx` modifications | Import button + placeholder text |
| | 6. `ResizablePanel.tsx` | Encapsulates existing resize logic |
| | 7. `App.tsx` restructure | Wire toolbars, sidebar, resizable panel |
| **Phase 3** (Sidebar) | 8. `Sidebar.tsx` renovation | 3 sections, collapsible, search |
| | 9. Collections UI (sidebar sections) | Wire store to UI |
| **Phase 4** (Editors) | 10. `RequestEditor.tsx` (remove Cookies) | Trivial change |
| | 11. `AuthEditor.tsx` (single panel) | Well-scoped refactor |
| | 12. `BodyEditor.tsx` (fix code editor) | Remove overlay approach |
| | 13. `EnvModal.tsx` (table editor) | Replace textarea with KeyValueEditor |
| **Phase 5** (Response) | 14. `ResponsePanel.tsx` | New empty state, tabs, collapse |
| | 15. Console tab data capture | Modify useApiRequest to return metadata |
| **Phase 6** (Polish) | 16. Keyboard shortcuts handler | Wire in App.tsx |
| | 17. `KeyboardShortcutsModal.tsx` | New component |
| | 18. `StatusBar.tsx` | Optional, low priority |

---

## Design Adjustments Needed

| # | Issue | Recommendation |
|---|-------|---------------|
| 1 | **Persistence mismatch**: Requirements say SQLite, design uses localStorage for preferences | Accept localStorage for UI prefs. Document the tradeoff. The requirement may be overly strict — localStorage persists in Tauri WebView. |
| 2 | **HeroUI Button usage**: Design doesn't address HeroUI dependency | Refactor all HeroUI `Button` usage to custom Tailwind buttons across ~3 files for visual consistency. |
| 3 | **Console tab data origin**: Design assumes `resolvedUrl` and `sentHeaders` are available | Modify `useApiRequest.ts` to return these alongside the response. Update the return type or add a wrapper. |
| 4 | **Drag-and-drop scope**: What can be dragged where? | Clarify: Can history items be dragged into Collections? Can drafts be dragged? For MVP, restrict DnD to within Collections (reorder + add from sidebar context menu). |
| 5 | **File serialization for collections**: `RequestConfig.file` is non-serializable | Apply `stripFiles()` (same pattern as historyStore.ts) when saving to collections. |
| 6 | **Collections reorder**: The store has `reorderCollectionItems` but no reorder for collections themselves | Add `reorderCollections(ids: string[])` to the store and optionally a Rust command if persistence matters. |

---

## Questions/Concerns

1. **`@tauri-apps/plugin-sql` is in package.json but never used.** Is this a leftover, or should we use it for collections instead of writing new Rust commands? Using it would avoid backend changes but break the existing pattern.

2. **The `?` key shortcut for the shortcuts modal** — on international keyboard layouts, `?` may be typed differently. Should we also support `Shift+/` explicitly?

3. **Collection items limit?** History is capped at 100 and drafts at 50. Should collections have a limit?

4. **StatusBar is listed as optional/low priority.** Should we ship without it initially?

---

## Missing Information

- **Collections Drag-and-Drop spec**: Which source elements are draggable? Only within collections, or also from History/Drafts?
- **Console tab**: When no request has been sent yet, what does the Console tab show?
- **Sidebar section collapse state**: Should section collapse state persist across restarts?
- **Active collection indicator**: How does a user know which collection/request is "active" vs. the current tab?
- **Edge case**: What happens when a user deletes a collection that contains items? Confirm dialog?

---

## Decision

**APPROVED** — pass to development with the following action items for the dev team:

1. Prioritize Phase 1 (CSS vars, collectionStore, Rust backend commands) as they unblock everything else
2. Refactor HeroUI `Button` usage to custom Tailwind buttons for visual consistency
3. Modify `useApiRequest.ts` to capture and return resolved URL + sent headers for the Console tab
4. Apply `stripFiles()` pattern to collection saves (follow existing draft/history pattern)
5. Postpone StatusBar to a follow-up task

**Estimate**: 4-6 days for implementation, 1-2 days for QA, assuming a single developer working full-time.
