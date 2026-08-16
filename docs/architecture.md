# Architecture

Desktop app layering and package boundaries. Product behavior lives in
[`docs/features/`](./features/README.md). This file replaces the former per-folder `README.md`
files under `apps/` and `packages/`.

## Layering rules

Enforced dependency direction:

```
app → features → core → shared → @pigeon/*
```

- `app/` imports features; features must never import from `app/`.
- Features may import `core/`, `shared/`, and other features **only via barrels** (`@/features/<name>`).
- Cross-feature imports inside `features/rest/*` also go through each feature's barrel.
- `core/` never imports features. Side effects (auto-save, history) are the caller's job.
- `shared/` is for code used by 2+ features (or deliberate dep-free primitives). One-feature code stays in that feature.
- `@pigeon/ui` / `@pigeon/brand` depend on nothing but `@pigeon/*` (and React where needed).

Feature skeleton: `components/ hooks/ lib/ services/ store.ts types.ts index.ts` (+ barrel).

---

## `apps/desktop/src/app`

Bootstrap and layout shell only — no business logic.

| File | Role |
|------|------|
| `App.tsx` | Root bootstrap |
| `AppContent.tsx` | Layout orchestration, global keyboard shortcuts, panel resizing |
| `layout/Header.tsx`, `layout/Sidebar.tsx` | Top bar + navigation; wires features via barrels |

---

## `apps/desktop/src/shared`

Code used by 2+ features. Single-feature code belongs in that feature.

| Path | Contents |
|------|----------|
| `ui/` | Desktop composites: `FindBar`, `KeyValueEditor`, `HighlightedHtml`, `result-viewer`, … |
| `lib/url.ts` | URL parsing/normalization |
| `lib/template.ts` | Pure `{{var}}` `interpolate` + `parseEnvString` (no deps) |
| `lib/platform.ts` / `windowKind.ts` | `isTauri()`, window kind |
| `types.ts` | `RequestConfig`, `Header`, `KeyValue`, … |

`lib/template.ts` currently has a single consumer (`environments`) but stays shared as a dep-free
primitive. Desktop composites stay here (not in `@pigeon/ui`) — some depend on features
(`KeyValueEditor` → environments autocomplete).

---

## `apps/desktop/src/core/http`

Turns a `RequestConfig` into a normalized `ApiResponse`. Pure transport — no auto-save/history.
Orchestration: `features/rest/request-builder/hooks/useSendRequest.ts`.

### Public API

- `sendRequest`, `resolveRequest`
- `HttpClient`, `HttpRequest`, `ApiResponse`
- SSE helpers + per-tab stream lifecycle
- `Resolver`, `UnresolvedVariablesError` (re-exported from interpolation)

### Shape

`ports/HttpClient.ts` + `services/{Tauri,Browser}HttpClient.ts` via `selectImpl`.

### Extend

New transport = new `HttpClient` impl. Keep shaping in `requestService`.

---

## `apps/desktop/src/core/interpolation`

Resolver-agnostic `{{var}}` interpolation. Single `UnresolvedVariablesError` app-wide.

### Public API

- `interpolateStrict(str, resolve)`
- `createAccumulatingResolver(resolve)` → `{ sub, missing }`
- `UnresolvedVariablesError`, `Resolver`

Takes a plain `Resolver` — must not import `@/features/environments`. Callers pass
`makeResolver(activeEnv, globals)`.

---

## `apps/desktop/src/core/persistence`

Shared `isTauri() ? invoke() : localStorage` factories.

### Public API

- `createNumTableStore` — drafts, history
- `createStrTableStore` — collections (environments browser-only)
- `createKeyValueStore` — mcp_oauth
- `numTable`, `strTable` — raw browser primitives

New table = factory in the feature's `services/db.ts`. Product notes:
[features/persistence.md](./features/persistence.md).

---

## `apps/desktop/src/core/platform`

- `selectImpl({ tauri, browser })` — used by HTTP and MCP transports.

---

## Features

Product specs: [features/README.md](./features/README.md).

| Path | Role |
|------|------|
| `features/command-palette` | `⌘K` search; `CommandPalette`, `searchPalette` |
| `features/environments` | Envs + `{{var}}`; `useEnvStore`, `EnvModal`, `replaceEnvVariables` |
| `features/mcp` | Retained MCP bench + OAuth (UI coming-soon) |
| `features/workspaces` | `ComingSoonWorkspace` for MCP/GraphQL |
| `features/settings` | Theme, request options, updater, shortcuts modal |
| `features/rest/*` | Grouping only — request-builder, response-viewer, collections, history, import-export |

`features/rest` has no barrel; each child feature has its own `index.ts`.

### request-builder

`useTabStore`, `UrlBar`, `RequestEditor`, `TabStrip`, `EmptyRequestState`. Send via `useSendRequest`
→ `@/core/http` + history/drafts.

### response-viewer

`ResponsePanel` — renders `ApiResponse` only (must not know transport).

### collections

`useCollectionStore`, `SaveToCollectionModal`, `MAX_NESTING_DEPTH`. Tree ops immutable; strip
live `File` before persist.

### history

`useHistoryStore` — history + drafts. Persistence via `services/db.ts` → Rust/SQLite or browser.

### import-export

`ImportModal` (cURL | Postman), `RequestModel`, `generateCurl`. Spec:
[features/import-export.md](./features/import-export.md).

---

## `packages/ui` (`@pigeon/ui`)

Shared React primitives + design tokens for desktop and site. Source-only (no package build).

### Exports

- `.` — `Button`, badges, `Switch`, `Tabs*`, `Tooltip`, `cn`, resizable panels, …
- `./tokens.css` — `:root` + `.dark` + Tailwind `@theme inline` (spec: [tokens.md](./tokens.md))

### Consumer setup

```css
@import "tailwindcss";
@import "@pigeon/ui/tokens.css";
@source "<relative-path-to>/packages/ui/src";
```

`@source` is required for Tailwind 4. Leaf primitives only — no feature-dependent composites.

---

## `packages/brand` (`@pigeon/brand`)

Canonical brand assets via `package.json` `exports` (SVG marks, wordmark, logo).

Root `logo/` = design-source master (e.g. `tauri icon`). `packages/brand/assets/` = npm copies —
update both when art changes.

---

## Related docs

| Doc | Topic |
|-----|-------|
| [features/README.md](./features/README.md) | Product feature list |
| [tokens.md](./tokens.md) | Design token scales |
| [testing.md](./testing.md) | Vitest / Playwright |
| [release.md](./release.md) | Release + deploy |
| [ci-deploy.md](./ci-deploy.md) | GitHub Actions / Cloudflare |
