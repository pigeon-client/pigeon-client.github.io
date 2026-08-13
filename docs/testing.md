# Testing

Three automated layers plus manual QA: unit/integration (Vitest), browser E2E (Playwright),
and manual feature QA against the checklists in `docs/features/*.md`.

## Unit / integration — Vitest

```bash
pnpm test        # once (CI mode)
pnpm test:watch  # watch
pnpm test:cov    # coverage → coverage/
```

- Config: `apps/desktop/vitest.config.ts` (happy-dom, `@`→`src`, setup `src/test/setup.ts`).
- Tests sit beside code as `*.test.ts(x)`.
- The Tauri backend is absent under test — `db.ts` no-ops via `isTauri()`, and `setup.ts` mocks
  `@tauri-apps/api/core`. Test **pure logic + Zustand stores** (URL parsing, `resolveRequest`,
  tab/name-lock, collection tree, cURL round-trip), not real HTTP/SQLite.

## E2E — Playwright (browser build)

```bash
pnpm e2e         # run all specs (auto-starts `pnpm dev` on :1420)
pnpm e2e:ui      # UI mode
pnpm e2e:report  # open last report
```

- Specs in `apps/desktop/e2e/*.spec.ts`, shared actions in `e2e/helpers.ts`, config
  `playwright.config.ts`.
- Drives the **browser build** (no Tauri) on browser adapters: DB → `localStorage`
  (`src/core/persistence/browserTable.ts`), send → `BrowserHttpClient` (fetch, in `src/core/http`).
  Specs stub the network with `page.route` (`mockJson`) — no real APIs, no CORS.
- Covers UI + JS against a mock backend — **not** the real Rust send/SQLite (that needs
  `tauri-driver`, Linux/Windows only).

## Feature QA — automation + manual

Use each feature doc's **Manual test checklist** and **Acceptance criteria** in
[`docs/features/`](./features/README.md). File findings in issues or a short note under
`docs/` if you need a durable report.

Mandatory edge cases (always on full / request-builder passes):

1. Long URL (≥2KB) — layout, caret, wheel scroll, overlay sync.
2. Many header/param rows — vertical list scroll.
3. Long header/param values — horizontal scroll + overlay sync.
4. Sidebar resize + narrow window — no page overflow.
5. Keyboard chords and modal Space-does-not-close.

Canonical chords: [`docs/features/keyboard-shortcuts.md`](./features/keyboard-shortcuts.md)
(source of truth: `AppContent.tsx`).

## Test catalog

Structured test cases (`TC-*`) and element IDs (`EL-*`) live in
[`@pigeon/test-catalog`](../packages/test-catalog/) — see
[docs/test-catalog/README.md](./test-catalog/README.md) for the full feature index,
manual QA workflow, and coverage summary.

**REST-only QA:** use `getRestTestCases()`. MCP and GraphQL workbenches are coming-soon
placeholders — keep those cases in the catalog but skip them for the current product pass.
Drag-and-drop (tabs, collection requests, layout split) and shortcut↔button pairs are first-class
REST cases (`dnd` and `button-pair` tags).

## Test ids

Stable, semantic `data-testid`s (never random UUIDs). Convention:

| Pattern | Example |
|---------|---------|
| `<area>-<element>` | `sidebar-new-request`, `method-trigger`, `response-status` |
| `<area>-tab-<name>` | `sidebar-tab-draft`, `editor-tab-params` |
| `<area>-<element>-<key>` | `param-key-0`, `param-value-0`, `method-option-DELETE` |

Inactive workspace tabs stay mounted (`display:none`), so testids that repeat per tab
(`url-input`, `method-trigger`, `response-status`, `response-body`) are scoped to `:visible` in the
helpers.

## CI

`.github/workflows/e2e.yml` — on push/PR to `main` (ignoring `apps/site/**`, `**.md`): install →
Vitest → install chromium → Playwright → upload HTML report artifact
(`apps/desktop/playwright-report/`).
