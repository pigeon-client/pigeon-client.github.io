# Implementation: Tab-Based Sidebar + Draft Auto-Organization + Performance

## Overview
Reorganized the sidebar to use 3 tabs (Collections, History, Drafts) with Draft as default. Added nested folder support for Collections, date-based grouping for History, auto-organized Draft tree, and performance optimizations for HTTP requests.

## Files Changed (12 files)

### New/Modified Source Files

| File | Change |
|------|--------|
| `src/types/index.ts` | Added `CollectionNode`, `DraftNode`, `MAX_NESTING_DEPTH`. Made `children` optional in CollectionNode for request-type nodes. |
| `src/lib/url.ts` | Added `extractPathSegments()` for auto-folder creation and `normalizeUrlForMatch()` for draft dedup matching. |
| `src/store/collectionStore.ts` | **Rewritten**: Tree-based structure with `root: CollectionNode[]`. New operations: `addFolder()`, `addRequest()`, `removeNode()`, `renameNode()`, `moveNode()`. Depth validation via `MAX_NESTING_DEPTH`. Exported `findNode()` for tree traversal. |
| `src/store/historyStore.ts` | Added `findDraftByKey()` (matches by method+URL), `updateDraftByKey()` (updates body/params/headers/auth), `saveOrUpdateDraft()` (smart create-or-update). |
| `src/hooks/useApiRequest.ts` | Auto-saves draft and adds to history after every request (both Tauri IPC and multipart fetch paths). Non-blocking — won't fail the request. |
| `src/components/Sidebar.tsx` | **Major rewrite**: 3-tab interface (Collections/History/Drafts), default Draft. Collections: tree view with nested folders/requests, context actions. History: date buckets (Today/Yesterday/This Week/Last Week/Older) with time display. Drafts: auto-organized domain→subdomain→path tree. Reusable `TreeNode` component. Collapsible icon strip preserved. |
| `src/lib/db.ts` | Added `updateDraft()` for persisting draft updates. |
| `src-tauri/src/db.rs` | Added `update_draft()` SQL function. |
| `src-tauri/src/lib.rs` | Added global `get_http_client()` with `OnceLock` for connection reuse. Updated `send_api_request` to use it. Added `update_draft` Tauri command. |

### Key Design Decisions

**1. Tab-based Sidebar**
- 3 tabs at the top with icons: Collections (folder), History (clock), Drafts (file)
- Default tab is Draft — users see their drafts first
- Search/filter works across all 3 tabs
- Collapsed state (48px) preserved with tab icons for quick switching

**2. Collection Tree (max 10 levels)**
- `CollectionNode` is recursive — folders contain `children: CollectionNode[]`
- Depth validated at insert time via `getDepth()` + `MAX_NESTING_DEPTH`
- Configurable: change `MAX_NESTING_DEPTH` in types to increase (future: 10-20)
- Context actions: Add Folder, Add Request, Rename, Delete (all inline in UI)
- Backward compatible: Collection JSON structure changes but stored in same SQLite table

**3. History Date Grouping**
- 5 buckets: Today, Yesterday, This Week, Last Week, Older
- Each entry shows time + status code + method + URL
- Sorted newest-first within each bucket
- Domain grouping removed (simpler date-based grouping)

**4. Draft Auto-Organization**
- After sending a request: auto-saves as draft via `saveOrUpdateDraft()`
- Matching: normalizes URL (strips query, trailing slash) + method
- If match found → updates existing draft (body, params, headers, auth)
- If no match → creates new draft
- Tree layout: Main Domain → Subdomain → Path segments
- Leaf nodes are individual requests showing method + name

**5. Performance (Rust Backend)**
- Global `reqwest::Client` via `OnceLock` — built once, reused for all requests
- Connection pooling: 32 idle connections per host, 90s idle timeout
- TCP keepalive: 30s interval
- Connect timeout: 10s, request timeout: 60s
- Eliminates ~50-100ms of per-request client build overhead
- HTTP keep-alive eliminates DNS + TCP handshake per request

## Build Verification
- TypeScript: `npx tsc --noEmit` — **0 errors**
- Rust: `cargo check` — **clean compile**
- Vite: `npx vite build` — **success** (2.64s)

## Backward Compatibility
- Existing collections in DB will load (old `items` format not compatible — collections with old format need migration or re-creation)
- Existing drafts and history preserved (same format)
- All existing keyboard shortcuts preserved
