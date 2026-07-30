# Testing

Three layers: unit/integration (Vitest), browser E2E (Playwright), and **feature QA** (automation
and manual user-like passes). One project agent owns all three.

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
  (`src/shared/lib/browserTable.ts`), send → `BrowserHttpClient` (fetch). Specs stub the network
  with `page.route` (`mockJson`) — no real APIs, no CORS.
- Covers UI + JS against a mock backend — **not** the real Rust send/SQLite (that needs
  `tauri-driver`, Linux/Windows only).

## Feature QA — automation + manual

**`.claude/agents/feature-qa.md`** is the sole project agent. It owns Vitest unit/store tests,
Playwright E2E, manual full-app / per-feature QA, documentation updates, and reports in
`docs/qa/<date>-report.md` (or `05-test-report.md` / `06-bugs.json` for historical workflow
folders).

Mandatory edge cases (always on full / request-builder passes):

1. Long URL (≥2KB) — layout, caret, wheel scroll, overlay sync.
2. Many header/param rows — vertical list scroll.
3. Long header/param values — horizontal scroll + overlay sync.
4. Sidebar resize + narrow window — no page overflow.
5. Keyboard chords and modal Space-does-not-close.

See checklists inside each `docs/features/*.md`.

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

Note: Claude Code loads agents at session start — restart session after adding/editing
`.claude/agents/*`.
