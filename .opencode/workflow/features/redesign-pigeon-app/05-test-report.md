# Test Report: Redesign Pigeon App — Bug Fix Round 3 (Draft Tree Rewrite + URL Normalization)

## Test Date
2026-06-12T20:45:00Z

## Test Environment
- Browser: Chromium (Playwright)
- Viewport: 1440x756
- App URL: http://localhost:1420
- Runtime: Vite dev server (browser-only, no Tauri backend)
- State: 3 drafts created, 1 deleted during testing

## Test Results

### 1. Draft Auto-Save (Primary Test)
- [x] Send GET request to `jsonplaceholder.typicode.com/posts/1` — **PASSED** (draft auto-saved)
- [x] Draft appears with auto-organized folders: `typicode.com > jsonplaceholder.typicode.com > posts > GET /posts/1` — **PASSED** (correct 3-level nesting)
- [x] Draft shows method badge (GET) and name — **PASSED**
- [x] Send SAME request again — **PASSED** (no duplicate draft, count stays at 1)
- [x] Click on draft in tree → loads request into editor tab — **PASSED**
- [x] Change request body, send again → draft updates in-place — **PASSED** (still 1 entry)

### 2. Multiple Drafts
- [x] Send GET to `/posts/2` — **PASSED** (2 entries under posts/, count goes to 2)
- [x] Send POST to `/posts` — **PASSED** (tree shows both GET and POST methods under posts/ level)

### 3. Draft Tree Structure (Critical Fix Verification)
- [x] Tree shows proper parent-child nesting at all depths — **PASSED** (typicode.com > jsonplaceholder.typicode.com > posts > request)
- [x] Leaf nodes show correct method badge and endpoint — **PASSED** (GET /posts/1, GET /posts/2, POST /posts)
- [x] Folder counts update correctly — **PASSED** (posts count: 2→1 after delete)

### 4. History (Regression)
- [x] Switch to History tab — **PASSED** (entries grouped under "Today")
- [x] Same URL → dedup — **PASSED** (3 entries instead of 4, duplicate GET /posts/1 merged)
- [x] Different URLs → separate entries — **PASSED** (POST /posts, GET /posts/2, GET /posts/1)
- [x] Each entry loads correct request when clicked — **PASSED** (verified all 3 load correct method+URL)

### 5. Collections (Regression)
- [x] Add collection via "+ Create one" — **PASSED** ("My Collection" created)
- [x] Collection shows action buttons (Add root folder, Add request, Delete) — **PASSED**
- [x] Create nested folder via prompt — **PASSED** ("API Endpoints" created under My Collection)
- [x] Expand/collapse works — **PASSED**
- [x] Status bar count updates — **PASSED** ("1 collection")

### 6. Draft Delete
- [x] Hover over draft entry — **PASSED** (trash icon appears)
- [x] Click trash icon — **PASSED** (draft disappears from tree)
- [x] Status bar count updates — **PASSED** (3 → 2 drafts)

## Bug Summary
- **0 new bugs found** in this round
- **All previous bugs** (Bug #1, #2, #3) remain **verified/fixed**
- The draft tree rewrite (array-based navigation) correctly eliminates the orphaned-nested-folders issue
- URL normalization in `saveOrUpdateDraft`, `findDraftByKey`, and `addToHistory` works correctly for consistent matching

## Test Evidence
```
=== DRAFT AUTO-SAVE ===
✓ Step 1: Filled URL "jsonplaceholder.typicode.com/posts/1", clicked Send
✓ Step 2: Draft tree shows typicode.com > jsonplaceholder.typicode.com > posts > GET /posts/1
✓ Step 3: Status bar shows "1 draft"
✓ Step 4: Sent same request again → still 1 draft (no duplicate)
✓ Step 5: Changed URL to /posts/2 → 2nd draft appears under posts/
✓ Step 6: Changed to POST method, URL /posts → POST /posts entry visible
✓ Step 7: Clicked draft entry → correct URL loads into editor (POST /posts, GET /posts/2, GET /posts/1 all verified)

=== DRAFT DELETE ===
✓ Step 1: Hovered over GET /posts/1 → trash icon appeared
✓ Step 2: Clicked trash icon → draft removed, status shows "2 drafts"

=== HISTORY (Regression) ===
✓ Step 1: Clicked History tab → entries grouped under "Today"
✓ Step 2: 3 entries shown (4 requests sent, 1 deduped)
✓ Step 3: Each entry loads correct method+URL (POST /posts, GET /posts/2, GET /posts/1)

=== COLLECTIONS (Regression) ===
✓ Step 1: Clicked Collections tab → "No collections yet" + "+ Create one"
✓ Step 2: Created "My Collection" → buttons and count appear
✓ Step 3: Added "API Endpoints" folder → nested structure works
```

## Conclusion
**ALL TESTS PASSED. ✅** The Bug Fix Round 3 (array-based draft tree building, URL normalization, draftIndex for delete) resolves the orphaned-nested-folder issue without introducing regressions. The draft tree correctly maintains parent-child relationships at all nesting levels, dedup works reliably, and delete operations target the correct leaf nodes. The feature is ready for final verification.
