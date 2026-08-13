# Request Builder — Test Cases

Feature code: **RB** · Source: `packages/test-catalog/src/test-cases/tabs-request-builder.ts`

Components covered: `TabStrip`, `UrlBar`, `MethodSelector`, `RequestEditor`, `HeadersEditor`, `BodyEditor`, `AuthEditor`, `EmptyRequestState`, `KeyValueEditor`

---

## Element IDs (EL-RB-*)

| ID | Name | Selector | Component |
|----|------|----------|-----------|
| EL-RB-001 | URL input | `[data-testid="url-input"]:visible` | UrlBar.tsx |
| EL-RB-002 | Method dropdown trigger | `[data-testid="method-trigger"]:visible` | MethodSelector.tsx |
| EL-RB-003 | Method option GET | `[data-testid="method-option-GET"]` | MethodOption.tsx |
| EL-RB-004 | Method option POST | `[data-testid="method-option-POST"]` | MethodOption.tsx |
| EL-RB-005 | Method option PUT | `[data-testid="method-option-PUT"]` | MethodOption.tsx |
| EL-RB-006 | Method option PATCH | `[data-testid="method-option-PATCH"]` | MethodOption.tsx |
| EL-RB-007 | Method option DELETE | `[data-testid="method-option-DELETE"]` | MethodOption.tsx |
| EL-RB-008 | Method option HEAD | `[data-testid="method-option-HEAD"]` | MethodOption.tsx |
| EL-RB-009 | Method option OPTIONS | `[data-testid="method-option-OPTIONS"]` | MethodOption.tsx |
| EL-RB-010 | Method option QUERY | `[data-testid="method-option-QUERY"]` | MethodOption.tsx |
| EL-RB-011 | Send button | `[data-send-btn]` | UrlBar.tsx |
| EL-RB-012 | Send error banner | `[data-testid="send-error"]` | UrlBarStatusLine.tsx |
| EL-RB-013 | Env token chip in URL | `[data-testid="env-token"]` | TokenChip.tsx |
| EL-RB-014 | Params editor tab | `[data-testid="editor-tab-params"]` | RequestEditor.tsx |
| EL-RB-015 | Auth editor tab | `[data-testid="editor-tab-auth"]` | RequestEditor.tsx |
| EL-RB-016 | Headers editor tab | `[data-testid="editor-tab-headers"]` | RequestEditor.tsx |
| EL-RB-017 | Body editor tab | `[data-testid="editor-tab-body"]` | RequestEditor.tsx |
| EL-RB-018 | Param key (row 0) | `[data-testid="param-key-0"]` | KeyValueEditor.tsx |
| EL-RB-019 | Param value (row 0) | `[data-testid="param-value-0"]` | KeyValueEditor.tsx |
| EL-RB-020 | Header key (row 0) | `[data-testid="header-key-0"]` | KeyValueEditor.tsx |
| EL-RB-021 | Header value (row 0) | `[data-testid="header-value-0"]` | KeyValueEditor.tsx |
| EL-RB-022 | Add param button | `button:has-text("Add param")` | KeyValueEditor.tsx |
| EL-RB-023 | Add header button | `button:has-text("Add header")` | KeyValueEditor.tsx |
| EL-RB-024 | Body word wrap toggle | `[data-testid="body-wrap-toggle"]` | BodyEditor.tsx |
| EL-RB-025 | Body find bar | `[data-testid="body-find"]` | FindBar.tsx |
| EL-RB-026 | Try an example CTA | `button:has-text("Try an example")` | EmptyRequestState.tsx |
| EL-RB-027 | Auth type selector | `[data-testid="auth-type-select"]` | AuthEditor.tsx *(planned)* |
| EL-RB-028 | Body type JSON | `[data-testid="body-type-json"]` | BodyTypeSelector.tsx *(planned)* |
| EL-RB-029 | Body type Form Data | `[data-testid="body-type-form-data"]` | BodyTypeSelector.tsx *(planned)* |
| EL-RB-030 | Body type URL Encoded | `[data-testid="body-type-urlencoded"]` | BodyTypeSelector.tsx *(planned)* |
| EL-RB-031 | Body type Binary | `[data-testid="body-type-binary"]` | BodyTypeSelector.tsx *(planned)* |
| EL-RB-032 | Body JSON textarea | `[data-testid="body-json-input"]` | BodyEditor.tsx *(planned)* |

---

## Test Cases (TC-RB-*)

### TC-RB-001 — URL query string syncs to Params editor on keystroke

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | functional |
| **Automation** | covered — `e2e/url-params.spec.ts` |

**Preconditions:** Empty tab; Params tab active

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | type | EL-RB-001 | URL `?q=hello&page=1` accepted |
| 2 | click | EL-RB-014 | Params tab active |
| 3 | verify | EL-RB-018 | Row 0 key = `q`, value = `hello` |
| 4 | verify | EL-RB-019 | Row 1 page = `1` |

**Expected result:** URL → Params live sync on every keystroke.

---

### TC-RB-002 — Editing Params rewrites URL query string

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | functional |
| **Automation** | covered — `e2e/url-params.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | click | EL-RB-014 | Params visible |
| 2 | fill | EL-RB-019 | Change param value to `updated` |
| 3 | verify | EL-RB-001 | URL query reflects new value |

---

### TC-RB-003 — Clear URL shows empty state with Try an example only

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | ui |
| **Automation** | partial |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | clear | EL-RB-001 | URL empty |
| 2 | verify | EL-RB-026 | "Try an example" CTA visible |
| 3 | verify | EL-RB-014 | Editor hidden or empty state covers pane |

---

### TC-RB-004 — Long URL (≥2KB) supports End key and horizontal scroll

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | edge |
| **Automation** | covered — `e2e/long-values.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | fill | EL-RB-001 | ~3KB URL; no layout break |
| 2 | keyboard | End | Caret at end |
| 3 | scroll | EL-RB-001 | Tint overlay aligned |

---

### TC-RB-005 — 25+ header rows scroll vertically inside editor

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | edge |
| **Automation** | covered — `e2e/long-values.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | click | EL-RB-016 | Headers tab |
| 2 | click | EL-RB-023 ×25 | Many rows added |
| 3 | scroll | EL-RB-021 | Last row reachable |

---

### TC-RB-006 — HTTP method dropdown lists all methods including QUERY

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | functional |
| **Automation** | covered — `e2e/method-and-actions.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | click | EL-RB-002 | Method list opens |
| 2 | verify | EL-RB-003 | GET visible |
| 3 | verify | EL-RB-010 | QUERY visible |
| 4 | click | EL-RB-004 | POST selected; tab label updates |

---

### TC-RB-007 — Bearer auth injects Authorization header on send

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | functional |
| **Automation** | covered — `e2e/send.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | click | EL-RB-015 | Auth tab |
| 2 | select | EL-RB-027 | Bearer type |
| 3 | type | EL-RB-027 | Token `test-token-123` |
| 4 | click | EL-RB-011 | Wire has `Authorization: Bearer` |

---

### TC-RB-008 — Paste curl into URL bar populates full request

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | functional |
| **Automation** | covered — `e2e/import-curl.spec.ts` |

---

### TC-RB-009 — Disabled param excluded from URL and send payload

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | functional |
| **Automation** | missing |

---

### TC-RB-010 — Body editor JSON input serializes on send

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | functional |
| **Automation** | covered — `e2e/body-editor.spec.ts` |

---

### TC-RB-011 — Unresolved {{var}} blocks send with error message

| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Type** | functional |
| **Automation** | covered — `e2e/environments.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | type | EL-RB-001 | `https://{{missingHost}}/path` |
| 2 | click | EL-RB-011 | Send blocked |
| 3 | verify | EL-RB-012 | Error lists missing variable |

---

### TC-RB-012 — {{var}} autocomplete in URL, params, and body

| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **Type** | ux |
| **Automation** | covered — `e2e/environments.spec.ts` |

| Step | Action | Element | Expected |
|------|--------|---------|----------|
| 1 | type | EL-RB-001 | `{{` opens suggestions |
| 2 | click | EL-ENV-008 | Variable inserted |
| 3 | type | EL-RB-019 | Autocomplete in param value |

---

## Related tab test cases (TC-TAB-*)

Tab strip behavior is documented under [tabs.md](../features/tabs.md) with cases `TC-TAB-001` through `TC-TAB-007` in the same source file.
