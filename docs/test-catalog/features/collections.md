# Collections — Test Cases

Feature code: **COL** · Source: `packages/test-catalog/src/test-cases/response-collections-history.ts`

Components covered: `CollectionsTab`, `NameModal`, `SaveToCollectionModal`, `FolderConfigModal`, `TreeRow`

---

## Element IDs (EL-COL-*)

| ID | Name | Selector | Notes |
|----|------|----------|-------|
| EL-COL-001 | Create collection button | `button:has-text("Create Collection")` | Sidebar Collections tab |
| EL-COL-002 | Collection name modal input | `#collection-name-modal-input` | Create / rename |
| EL-COL-003 | Save to collection modal | `[data-testid="save-collection-modal"]` | *(planned)* |
| EL-COL-004 | Folder config — Headers tab | `[data-testid="folder-config-tab-headers"]` | Gear icon modal |
| EL-COL-005 | Folder config — Auth tab | `[data-testid="folder-config-tab-auth"]` | Gear icon modal |
| EL-COL-006 | Folder header key (row 0) | `[data-testid="folder-header-key-0"]` | Inherited headers |
| EL-COL-007 | DnD drop target highlight | `[data-testid="tree-row-drop-active"]` | During drag |
| EL-COL-008 | Confirm modal — confirm | `[data-testid="confirm-modal-confirm"]` | Delete confirms |

Shared sidebar elements: `EL-SID-005` (Collections tab), `EL-SID-010` (tree row)

---

## Test Cases (TC-COL-*)

### TC-COL-001 — Create collection persists across reload

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | crud |
| **Automation** | covered — `e2e/collections.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | click | EL-SID-005 | Collections tab |
| 2 | click | EL-COL-001 | Name modal opens |
| 3 | type | EL-COL-002 | Name `My API` |
| 4 | click | Create button | Collection in tree |
| 5 | reload | — | Page reloads |
| 6 | verify | EL-SID-010 | `My API` still visible |

---

### TC-COL-002 — Rename collection updates sidebar label

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | crud |
| **Automation** | covered — `e2e/collections.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | hover | EL-SID-010 | Row actions appear |
| 2 | click | Rename | Modal with current name |
| 3 | fill | EL-COL-002 | New name saved |

---

### TC-COL-003 — Save request into nested folder via ⌘⇧S modal

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | crud |
| **Automation** | partial — `e2e/collections.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | keyboard | ⌘⇧S | Save modal opens |
| 2 | click | EL-COL-003 | Pick folder destination |
| 3 | click | Save | Request under folder |
| 4 | click | EL-SID-010 | Reopen — same URL loads |

---

### TC-COL-004 — Delete folder removes nested requests from tree

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | crud |
| **Automation** | partial — **known failure** in `e2e/collections.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | hover | EL-SID-010 (folder) | Delete action visible |
| 2 | click | Delete | Confirm if prompted |
| 3 | click | EL-COL-008 | Confirm |
| 4 | verify | EL-SID-010 | Folder + children gone |

**Known issue:** Deleting folder may leave child request labels visible in sidebar.

---

### TC-COL-005 — Folder gear config inherits headers into nested request

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | functional |
| **Automation** | covered — `e2e/folder-config-layout.spec.ts` (`folder config headers appear in nested request editor`) |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | click | EL-COL-004 | Folder Headers tab |
| 2 | type | EL-COL-006 | `X-Custom: inherited` |
| 3 | click | EL-SID-010 (nested request) | Request opens |
| 4 | click | EL-RB-016 | Inherited header visible |

---

### TC-COL-006 — Drag request between folders reorganizes tree

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | ux |
| **Automation** | partial — `e2e/collections.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | drag | EL-SID-010 | Request onto target folder |
| 2 | verify | EL-COL-007 | Drop highlight during drag |
| 3 | drop | — | Request under new folder |
| 4 | reload | — | Move persisted |

---

## CRUD matrix

| Operation | Test case | Element hooks |
|-----------|-----------|---------------|
| **Create** collection | TC-COL-001 | EL-COL-001, EL-COL-002 |
| **Read** / reopen | TC-COL-003 | EL-SID-010, EL-RB-001 |
| **Update** rename | TC-COL-002 | EL-COL-002 |
| **Update** folder config | TC-COL-005 | EL-COL-004, EL-COL-006 |
| **Delete** folder | TC-COL-004 | EL-COL-008 |
| **Move** (drag) | TC-COL-006, TC-COL-013–028 | EL-COL-007, EL-SID-010 |

## Drag and drop (REST)

Only **requests** are draggable. Folders and collection roots are drop targets. Pointer threshold is ~6px so a click still opens the request.

| Case | What to verify |
|------|----------------|
| TC-COL-006 / TC-COL-013 | Request → another folder; destination expands; persist |
| TC-COL-014 / TC-COL-008 | Request → collection root (un-nest) |
| TC-COL-015 | Request → another collection |
| TC-COL-016 | Folders are **not** drag sources |
| TC-COL-017 | Nesting past depth 10 rejected |
| TC-COL-018 | Click vs drag threshold |
| TC-COL-019 | Esc cancels in-progress drag |
| TC-COL-020 | Hover auto-expands collapsed folder |
| TC-COL-021 | Rename/Delete/Add do not start a drag |
| TC-COL-025 | Drop onto another request is a no-op |
| TC-COL-026 | Drop onto current parent is a no-op |
| TC-COL-028 | Move while search filter is active |

Playwright: `e2e/collections.spec.ts`. Further cases: `packages/test-catalog/src/test-cases/rest-dnd-shortcuts.ts`.

