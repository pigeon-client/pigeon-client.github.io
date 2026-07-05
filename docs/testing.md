# Testing

Two layers, both automatable and both run in CI.

## Unit / integration — Vitest

```bash
pnpm test        # once (CI mode)
pnpm test:watch  # watch
pnpm test:cov    # coverage → coverage/
```

- Config: `vitest.config.ts` (happy-dom, `@`→`src`, setup `src/test/setup.ts`).
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

- Specs in `e2e/*.spec.ts`, shared actions in `e2e/helpers.ts`, config `playwright.config.ts`.
- Drives the **browser build** (no Tauri) on its browser adapters: DB → `localStorage`
  (`src/shared/lib/browserTable.ts`), send → `BrowserHttpClient` (fetch). Specs stub the network
  with `page.route` (`mockJson`) for determinism — no real APIs, no CORS.
- Covers UI + JS against a mock backend — **not** the real Rust send/SQLite (that needs
  `tauri-driver`, Linux/Windows only).

## Test ids

Stable, semantic `data-testid`s (never random UUIDs — those regenerate per render and can't be
selected deterministically). Convention:

| Pattern | Example |
|---------|---------|
| `<area>-<element>` | `sidebar-new-request`, `method-trigger`, `response-status` |
| `<area>-tab-<name>` | `sidebar-tab-draft`, `editor-tab-params` |
| `<area>-<element>-<key>` | `param-key-0`, `param-value-0`, `method-option-DELETE` |

Inactive workspace tabs stay mounted (`display:none`), so testids that repeat per tab
(`url-input`, `method-trigger`, `response-status`, `response-body`) are scoped to `:visible` in the
helpers.

## CI

`.github/workflows/e2e.yml` — on push/PR to `main` (ignoring `site/**`, `**.md`): install → Vitest
→ install chromium → Playwright → upload the HTML report artifact.

## The `tester` subagent

`.claude/agents/tester.md` codifies the Vitest strategy (targets, the Tauri/browser split,
conventions). Use it to add/run tests. Note: Claude Code loads agents at session start.
