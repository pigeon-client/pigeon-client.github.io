# Spec: Environments v1 — Persistence & Management

**Status:** Implemented (R1–R8) — see [features/environments.md](../features/environments.md) · **Owner:** Parth · **Date:** 2026-07-05
**Feature area:** `src/features/environments` · Current behavior: [features/environments.md](../features/environments.md)

> **Implemented 2026-07-05.** Frontend green (tsc, Biome, Vitest, Playwright). Rust adds an
> `environments` table + CRUD commands (mirrors `collections`) — needs a `tauri build`/`dev` to
> compile. Follow-ups from "Future considerations" (JSON import/export, encrypted secrets,
> per-request preview) remain deferred.

---

## 1. Problem Statement

Environments (`{{var}}` sets for dev/staging/prod) exist today but are **in-memory only** — every
app restart wipes all environments and variables. This defeats the core use case: a developer who
sets up `baseUrl`, `token`, etc. must re-enter them every session, so in practice nobody can rely
on the feature. Every comparable tool (Postman, Insomnia, Bruno) persists environments; this is a
table-stakes gap.

## 2. Goals

1. Environments and variables **survive app restart** on desktop and browser builds (100% durability).
2. Users can **see and switch** the active environment without opening a modal — target: switch in ≤ 2 clicks from anywhere.
3. Variable editing feels consistent with the rest of the app (same key/value row pattern as Params/Headers).
4. Secret values (tokens, passwords) are **not shoulder-surfable** on screen.
5. Interpolation is **strict**: an unresolved `{{var}}` at send time blocks the request with a clear error (⚠️ behavior change — today unknown tokens pass through silently).
6. Users **always know when they're pointed at production** — an always-visible red cue whenever a production-flagged env is active.

## 3. Non-Goals

- **Encrypted-at-rest secrets / OS keychain integration** — masking is display-only in v1; real secret storage needs Tauri stronghold/keychain work and is a separate initiative (see P2).
- **Environment sync/sharing across machines** — no accounts/cloud in Pigeon; premature.
- **Per-collection or per-folder environment binding** — adds model complexity; global active env is enough for v1.
- **Scripting / computed variables beyond the fixed random set in R8** — timestamps, custom generators, and scripts belong to a future scripting initiative.
- **Postman full-workspace import** — only environment JSON import/export is considered, and only as P2.

## 4. User Stories

Priority order:

1. As an API developer, I want my environments saved automatically so that my `baseUrl`/`token` setup survives restarting the app. **(P0)**
2. As an API developer, I want to see which environment is active and switch it from the header so that I don't send a request to prod by accident. **(P0)**
3. As an API developer, I want to rename, duplicate, and delete environments so that I can create `staging` from `dev` in one click. **(P0 rename/delete, P1 duplicate)**
4. As an API developer, I want token-like variables masked on screen so that screen-sharing a demo doesn't leak credentials. **(P1)**
5. As an API developer, I want to mark an environment as **production** and see unmistakable red cues while it's active so that I never fire a destructive request at prod thinking I'm on dev. **(P0 flag + indicator, P1 stronger guardrails)**
6. As an API developer, I want global variables shared across all environments so that common values aren't duplicated per environment. **(P1)**
7. As a team member, I want to export/import an environment as JSON so that I can hand a teammate a working setup. **(P2)**

## 5. Requirements

**All requirements R1–R8 are required (P0) for this release.** Only §"Future considerations" is deferred.

**R1. Persistence**
- Follow the established dual-persistence pattern (`services/db.ts`): SQLite table `environments` on desktop (Tauri); `localStorage` key `pg_browser_environments` in the browser build.
- Active environment id persists as `pg_active_env` (localStorage, both builds — same pattern as `pg_theme`).
- Environment **names are free-text** — users create any name (`Dev`, `UAT`, `client-x-sandbox`, …); no fixed list.
- Schema per environment: `{ id: text, name: text, isProduction: boolean, variables: [{ key, value, enabled, secret }] }` — include `enabled`, `secret`, and `isProduction` flags now even where UI ships later (architectural insurance).
- Acceptance:
  - [ ] Create env + variables → quit → relaunch → env, variables, and active selection restored.
  - [ ] Works identically in browser build (Playwright-verifiable).
  - [ ] Data tab in Settings counts environments and "Clear All" wipes them.

**R2. Active environment selector (header)**
- Dropdown in the header (near Copy-as-cURL): shows active env name or "No environment"; lists all envs + "No environment" + "Manage environments…" (opens ⌘⇧E modal).
- Acceptance:
  - Given an active environment, when I send a request, then `{{var}}` resolves from it (existing behavior, now visible).
  - Given "No environment", then tokens pass through unchanged (unchanged behavior).
  - [ ] Test ids: `env-selector`, `env-option-<name>`, following `<area>-<element>-<key>` convention.

**R3. Manager modal parity & polish**
- Reuse the shared `KeyValueEditor` row pattern (checkbox / key / value / trash, auto blank trailing row) instead of the bespoke editor.
- Rename and delete environments via the shared name modal + delete confirm (same flow as collections).
- Empty state: "No environments yet" + create CTA, matching sidebar empty-state conventions.
- **No duplicate keys within one environment** — the editor rejects/flags a key that already exists (validate at input level, not save time).
- Acceptance:
  - [ ] Disabled variables are excluded from interpolation (mirrors disabled params behavior).
  - [ ] Deleting the active environment falls back to "No environment", never a dangling id.
  - [ ] Typing an existing key shows an inline duplicate error; the row can't be committed until unique.

**R3b. Strict interpolation errors**
- At send time, any `{{var}}` in URL, headers, or body that resolves to nothing (no match in active env, globals, or the R8 random set) **blocks the send** and surfaces an error naming the missing variable(s) (toast + inline where feasible).
- ⚠️ Contract change: replaces the current "leave unknown tokens intact and send anyway" behavior. Update `features/environments.md` and unit tests in `template.ts`/`resolve.ts`.
- Acceptance:
  - Given `{{baseUrl}}` is undefined, when I hit Send, then no request is dispatched and the error says `Unresolved variable: baseUrl`.
  - [ ] Multiple missing vars are reported together, not one-by-one.

**R4. Production flag & indicator**
- Manager modal: an **"This is a production environment"** checkbox per environment (`isProduction`).
- When a production environment is active:
  - Header env selector renders in **danger/red styling** (red dot + red-tinted trigger), not the neutral accent. Selector stays in the header (decided).
  - A persistent **red border around the request-builder panel** signals prod mode (decided over top-border/banner options).
- Acceptance:
  - Given `isProduction: true` env is active, when I look anywhere in the app, then at least one always-visible red cue is present.
  - Given I switch back to a non-production env, then all red cues clear immediately.
  - [ ] Red uses a theme-aware danger token (works in Dark and Light), not hardcoded hex.
  - [ ] Test ids: `env-prod-checkbox`, `env-prod-indicator`.

**R4b. Production guardrails**
- Send-time confirmation for **DELETE, PUT, and PATCH** when a production env is active, with a "don't ask again this session" escape hatch.
- Red-tinted Send button while in prod.

**R5. Duplicate environment** — hover action + "Duplicate" in manager; copies variables, name becomes `<name> copy` (production flag NOT copied — safer default).

**R6. Secret masking** — per-variable "secret" toggle; value renders masked (`•••`) by default; clicking the **eye icon reveals the full value**, clicking again re-masks. Copy-as-cURL still emits the real value. Storage is local plaintext (decided — no keychain work this release).

**R7. Globals** — a built-in "Globals" variable set always present in the manager; resolution precedence: **active environment > globals > random built-ins (R8) > error (R3b)**. Precedence must be unit-tested in `template.ts`/`resolve.ts`.

**R8. Random data variables (built-in)**
- Exactly four built-in dynamic tokens, generated fresh per send: `{{$email}}`, `{{$firstName}}`, `{{$lastName}}`, `{{$uuid}}`. No other generators this release (see Non-Goals).
- User-defined variables with the same name take precedence? **No** — `$`-prefix is reserved; the editor rejects keys starting with `$` (avoids shadowing ambiguity).
- Acceptance:
  - Given `{{$uuid}}` in the body, when I send twice, then each request carries a different valid UUID v4.
  - [ ] `{{$email}}` produces a plausible fake email; `{{$firstName}}`/`{{$lastName}}` produce name-like strings (small built-in word lists, no new dependency required).
  - [ ] Tokens resolve in URL, headers, and body, same surfaces as env vars.

### Future considerations (deferred — design for, don't build)

- **Env import/export (JSON)** — target the existing `RequestModel` adapter philosophy: define a stable `EnvironmentModel`, adapt Postman env JSON behind an importer. Schema above should map cleanly.
- **Encrypted secret storage** — Tauri keychain/stronghold; the `secret` flag in the schema is the hook.
- **Per-request env preview** — hover a `{{token}}` in the URL bar to see the resolved value.
  ✅ **Built** (2026-07-05) — `TokenChip` in `UrlBar.tsx`, testid `env-token`.

## 6. Success Metrics

- **Leading:** % of sessions with ≥1 persisted environment (target: 40% of active users within 30 days); env-switcher clicks per session; zero data-loss bug reports.
- **Lagging:** retention of users who create an environment vs. those who don't; drop in "environments don't save" feedback to zero.
- Measurement is local-app telemetry-free today → evaluate via E2E coverage + user feedback until analytics exist (open question below).

## 7. Implementation Plan (phased)

All phases ship together in **this release** (phasing is build order, not release order):

| Phase | Scope | Key files | Est. |
|-------|-------|-----------|------|
| 1 | Persistence (R1): DB table + localStorage adapter, load-on-boot, persist active env, Settings Data-tab wiring, duplicate-key validation (R3) | `features/environments/store.ts`, `services/db.ts`, `SettingsDrawer.tsx` | 2–3 d |
| 2 | Header selector (R2) + manager polish (R3) + prod flag, red request-builder border (R4): dropdown, KeyValueEditor reuse, rename/delete/confirm, danger styling, testids | `app/layout/Header.tsx`, `components/EnvModal.tsx`, shared `KeyValueEditor`, theme tokens | 3–4 d |
| 3 | Resolution engine: strict errors (R3b), globals + precedence (R7), random built-ins (R8) | `shared/lib/template.ts`, `lib/resolve.ts`, `useApiRequest.ts` | 2–3 d |
| 4 | Prod guardrails DELETE/PUT/PATCH confirm (R4b), duplicate env (R5), secret masking with eye toggle (R6) | `EnvModal.tsx`, `UrlBar.tsx` (Send) | 2–3 d |
| — | Testing throughout: unit (precedence, strict errors, `$`-reserved keys, random tokens), E2E (create → restart → restore; prod border; blocked send on missing var) | `testing.md` conventions | in-phase |

Total ≈ **2–2.5 weeks** of build for the full required scope.

## 8. Decisions (open questions resolved 2026-07-05)

1. **Secret storage:** local plaintext is acceptable; masking is display-only with an eye icon to reveal/re-mask (R6).
2. **Migration of in-memory envs:** none needed.
3. **Selector placement:** stays in the header.
4. **Prod cue:** red border across the request-builder panel (R4).
5. **Prod confirmation methods:** DELETE, PUT, and PATCH (R4b).
6. **Local analytics:** not this release.

## 9. Edge Cases & Test Notes

- Unknown `{{token}}` → **send blocked with error** (R3b — replaces old "left intact" contract; update `features/environments.md`).
- Duplicate keys in one env → **rejected at input** with inline error (R3).
- Keys starting with `$` → rejected (reserved for R8 built-ins).
- Env named identically to another → allow (ids are canonical) but warn? — defer, ids are canonical.
- `{{$uuid}}` etc. regenerate **per send**, not per session — two sends differ.
- E2E: browser build persists via `localStorage`, so restart-persistence is testable in Playwright with a page reload.
