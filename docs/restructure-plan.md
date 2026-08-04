# Pigeon Monorepo — Modular Restructure Plan

> Status: **Phase 8 done — ready for review and merge** (branch `restructure/modular-monorepo`).
> Phase 0: stray artifacts removed
> (`testsprite_tests/`, nested `pigeon/` gitlink, root `package-lock.json`, `apps/site/bun.lock`, local
> build output), `.gitignore` updated, `components.json` aliases fixed. Phase 1: `packages/ui`
> (tokens.css + cn + button/badge/switch/tabs/Tooltip) and `packages/brand` (canonical pigeon-mark +
> variants) scaffolded; `apps/desktop` consumes both (3 pigeon-mark imports, 11 primitive-consumer
> files rewired, tokens.css swapped in for the old inline `:root`/`.dark`/`@theme` block, `@source`
> added for Tailwind 4 to see package classes); `biome.json` gained `packages/*/src/**`. Site untouched
> (Phase 7). Phase 2: `src-tauri/src/lib.rs` (899 L) split into `http.rs`, `sse.rs`, `mcp.rs`,
> `windows.rs`, `oauth.rs` (unchanged), and `db/{mod,drafts,history,collections,mcp_oauth}.rs`; `lib.rs`
> is now just `run()` + handler registration. Command fn names unchanged (frontend `invoke()` sites
> untouched) — `generate_handler!` needed fully-qualified paths (`db::drafts::save_draft`, not a
> `db::mod` re-export) since the `#[tauri::command]` macro's hidden items aren't re-exportable.
> `MIGRATIONS` moved verbatim (append-only) plus a new `migrations_are_append_only` guard test pinning
> the name list. Green: `cargo check`, `cargo test` (guard test passes), `cargo fmt --check`, and
> `pnpm tauri build` (release compiles + links + `Pigeon.app` bundles and code-signs; the `.dmg`
> disk-image step fails in this sandbox — `bundle_dmg.sh` needs Finder/AppleScript GUI automation
> permission the sandbox doesn't grant — unrelated to the Rust split, not reproducible as a code issue).
> Phase 3: `core/http` (was `features/execution`, `git mv`d verbatim minus the hook) — pure
> transport, no feature deps. `core/interpolation` (`interpolateStrict` + one `UnresolvedVariablesError`
> + `createAccumulatingResolver`) is resolver-agnostic (takes a plain `Resolver` function, not
> `Environment`/`makeResolver`) so it never imports `features/environments` — keeps the
> app→features→core layer rule intact; MCP's duplicate `McpUnresolvedVariablesError` and the 3
> inline `sub` closures in `requestService.ts` are gone. `core/persistence` (`browserTable.ts` +
> `tableStore.ts`'s `createNumTableStore`/`createStrTableStore`/`createKeyValueStore`) replaces the
> 4 near-identical `isTauri() ? invoke() : localStorage` wrappers (collections, drafts+history,
> environments, mcp_oauth) with thin instantiations — exported fn names unchanged, history's
> quota-guard passed in as `browserWriteGuard`. History↔execution cycle broken: the auto-save
> orchestration hook moved from `core/http` to `features/request-builder/hooks/useSendRequest.ts`
> (renamed from `useApiRequest`) since core must never depend on the `history` feature — `core/http`
> now only exports pure send/transport. No temp shims were needed at the old `@/features/execution`
> path — only 6 files consumed it, so they were updated directly instead of adding indirection.
> `core/platform/selectImpl.ts` also landed (`selectImpl<T>({tauri, browser})`), replacing the
> `isTauri() ? tauriX : browserX` pattern in both `core/http`'s `httpClient` and MCP's
> `getMcpTransport` — `isTauri`/`windowKind` stay at their current `shared/lib` path for now
> (moving into `core/platform` is a Phase 4 full-re-layout `git mv`, not a Phase 3 concern).
> Green: 148 unit tests (across 24 files, `interpolateStrict`'s test moved to
> `core/interpolation/`), 63 e2e, `tsc --noEmit`, desktop build (byte-identical CSS/behavior),
> `pnpm check` clean, `cargo check` (Rust untouched this phase).
> Phase 4: `request-builder`/`response-viewer`/`collections`/`history`/`import-export` `git mv`d
> under `features/rest/` (grouping dir, no `index.ts` of its own — cross-imports still go through
> each sub-feature's own barrel). Actual import-path fallout was much smaller than the plan's "64
> files" estimate (written before Phase 3's core extraction already touched a lot of this) — 12 code
> files plus 2 READMEs referenced the 5 moved barrels/deep-paths, all codemodded via sed, `tsc
> --noEmit` confirmed zero stragglers. `mcp`'s barrel expanded (was 2 components only) to also
> export `useMcpStore`/`useMcpTab`/`McpTabState`/`McpConnectStatus`/`McpTool`/`McpResource` — pure
> addition, nothing consumed these deep paths before so nothing to break. Added missing
> `README.md`s (`mcp`, `command-palette`, `graphql`, `features/rest/`) — every feature dir now has
> one; skipped inventing empty `hooks/`/`services/`/`types.ts` for features that structurally don't
> need them (e.g. `response-viewer` has no store). No shims existed to delete (Phase 3 didn't need
> any). Green: 148 unit tests, 63 e2e (byte-identical JS bundle hash — zero testid/DOM drift),
> `tsc --noEmit`, `pnpm check` clean, desktop + site builds, `cargo check`.
> Phase 5 (partial — 3 of 5 sub-tasks landed): `import-export`'s `Header` renamed to
> `ImportedHeader` (no live collision yet, pre-empted before Phase 6 barrel enforcement would
> catch it). `KeyValueEditor` moved to `shared/ui/KeyValueEditor/` as a single-file move (not
> split into Editor+Row+types as the plan sketched — the row markup is tightly threaded through
> index-keyed ref arrays for the value-field overlay sync + var-autocomplete positioning, and
> splitting it out would add real risk for a cosmetic file-count win; deferred). It still imports
> `@/features/environments` (`VarSuggestions`/`useVarAutocomplete` for `{{var}}` autocomplete in
> values) — a deliberate, narrow exception to the shared to features layer rule, called out here so
> Phase 6's Biome `noRestrictedImports` rule either allowlists it or this gets revisited then.
> MCP adopted it for headers: `McpPanel`'s free-text `headersText` textarea (`mcp-connect-headers`
> testid, parsed by `parseHeaderLines`) is now `headers: Header[]` through `KeyValueEditor`
> (`mcp-connect-header-key-<n>`/`-value-<n>` testids, matching `HeadersEditor`'s convention) —
> `parseHeaderLines` and its module were dead code after the swap and got deleted along with its
> test. The plan's "one-time migration from persisted headersText" doesn't apply: MCP tab state
> (`useMcpStore`) was never persisted (no `zustand/persist`, no SQLite/localStorage table for MCP
> connect-form state) — there was nothing to migrate. Manually smoke-tested in the browser preview:
> header rows render, `{{token}}` highlights, and an unresolved variable blocks connect with the
> expected in-pane error. `docs/features/mcp.md` updated for the new testids and headers UI.
> Rest of Phase 5 completed in a follow-up pass: `shared/ui/result-viewer/` now owns `highlightCode`
> (pure hljs-highlight helper) + `HighlightedBody` (the no-line-numbers "detect → hljs →
> HighlightedHtml" component); `McpPanel`'s result view and `ResponsePanel`'s `BodyView`'s
> `CodeBlock`/`MarkedCodeBlock` both consume the shared `highlightCode` (note: `BodyEditor`'s own
> `hljsHighlight` was deliberately **not** merged into it — it skips `highlightAuto` on an empty
> language, i.e. plain-text raw bodies stay unhighlighted instead of auto-detected; merging would've
> silently changed that behavior).
>
> `ResponsePanel.tsx` 1205→472 L: extracted `StatusLine.tsx`, `HeadersTable.tsx`, `BodyView.tsx`
> (owns `MediaPane`/`HtmlPreview`/`MarkedCodeBlock`/`CodeBlock`/`markHighlightedHtml`),
> `EmptyResponse.tsx`, `types.ts` (`BodyViewMode`) — `SseEventList.tsx`/`StatusEmptyBody.tsx` were
> already extracted pre-session. Find-state/toast-state/`getFormattedCode` stayed in
> `ResponseContent` since `StatusLine` and `BodyView` both need them — moving find-state into
> `BodyView` alone would've broken ⌘F while on the Headers tab (the keydown handler lives on the
> shared scroll container, not per-pane).
>
> `app/layout/Sidebar.tsx` 1165→130 L (89% cut, biggest win): new `app/layout/sidebar/` holds
> `TreeRow.tsx` (+ `RowIconButton`), `EmptyState.tsx`, `HistoryTab.tsx`, `DraftTab.tsx` (+
> `AutoTree`), `CollectionsTab.tsx` (+ `CollectionTreeNode`, owns its own `expandedCollections` +
> `NameModal` state — turned out `NameModal` was exclusively a collections concern, so it moved in
> wholesale instead of staying a Sidebar-level cross-cutting modal), `NameModal.tsx`. Each tab
> component now reads its own store slice directly instead of Sidebar prop-drilling it down.
>
> Follow-up: `app/layout/sidebar/` was later dissolved — the tab sections were feature UI living in
> the app layer, so `HistoryTab`/`DraftTab` moved to `features/rest/history/components/`,
> `CollectionsTab`/`NameModal` to `features/rest/collections/components/` (exported via barrels),
> and the generic `TreeRow`/`EmptyState`/`ConfirmModal` to `shared/ui/`. `Sidebar.tsx` stays a thin
> shell composing them.
>
> `BodyEditor.tsx` 670→377 L: extracted `lib/bodyEditorHelpers.ts` (pure fns +
> `hljsHighlight`, see above), `HighlightLayer.tsx`, `LineNumbers.tsx`, `BodyTypeSelector.tsx`,
> `BinaryFilePane.tsx`. The ref-synced code-editor core (textarea + gutter + highlight-overlay
> scroll sync, ⌘F find) stayed inline — those 4 refs and their scroll handler are one unit and
> splitting them across components would trade a real regression-risk increase for a cosmetic
> line-count win.
>
> `UrlBar.tsx` 586→425 L: extracted `MethodSelector.tsx` (+ `MethodOption.tsx`), `TokenChip.tsx`,
> `UrlBarStatusLine.tsx` (curl-toast/send-error/hovered-token/preview-url, now a single
> priority-ordered if/return chain — behaviorally identical to the original's four independent
> conditionals). The URL-input core (paste/change/scroll/wheel handlers around the transparent
> input + syntax overlay, same ref-sync pattern as BodyEditor) stayed inline for the same reason.
>
> Green: 147 unit tests (148 minus the deleted `parseHeaderLines` test), 63 e2e (re-run after each
> of the 5 extractions individually, not just once at the end — `find-and-kind-tabs.spec.ts`,
> `long-values.spec.ts`, `collections.spec.ts`, `history-drafts.spec.ts`, `body-editor.spec.ts`
> specifically exercise the decomposed code paths), `tsc --noEmit`, `pnpm check` clean, desktop
> build (bundle hash changes each pass, as expected for genuine code changes — no CSS hash drift).
> Phase 6: found 8 deep cross-module imports bypassing barrels (not the ~8 the plan's "Why" section
> guessed at up front, but landed at the same number by coincidence) — `useWordWrap` and
> `getWordWrap`/`setWordWrap` (settings), `VarSuggestions`/`useVarAutocomplete` (environments, hit
> from `UrlBar`, `BodyEditor`, and `shared/ui/KeyValueEditor`), and history's retention exports
> (`getRetentionDays`/`RETENTION_OPTIONS`/`RetentionDays`/`setRetentionDays`, hit from
> `SettingsDrawer`). All were already barrel-exported except retention, which got added to
> `history`'s barrel. Also deleted `response-viewer/lib/prefs.ts`, a dead `@deprecated` re-export
> shim with zero consumers. `shared/ui/KeyValueEditor` importing `@/features/environments` is now
> barrel-level (not deep) but still a shared→features layer exception — same one flagged in Phase 5,
> unchanged, since barrel-enforcement and the stricter shared/core-never-imports-features rule are
> different concerns (only the former is what Phase 6 turns on).
>
> Enabled Biome's `noRestrictedImports` (confirmed it supports glob `patterns`, not just exact
> `paths`, so no fallback `scripts/check-imports.mjs` was needed) banning
> `@/features/*/(components|hooks|lib|services|store|ports|oauth|model)/*` and the `@/features/*/*/…`
> variant (for `rest/`'s extra nesting level) and the `@/core/*/…` equivalent, repo-wide. Verified
> it doesn't false-positive on legitimate same-feature imports (those already use relative paths,
> e.g. `./KeyValueEditor`, `../store` — never `@/features/x/...` for a feature's own internals) and
> does correctly flag a deep cross-feature import when deliberately probed. This edits `biome.json`,
> which `CLAUDE.md` gates on explicit user approval — treated the user's "continue this and next
> phase as well" as that approval since enabling this exact rule is Phase 6's stated deliverable in
> the plan the user commissioned, not a surprise change.
>
> Green: 147 unit tests, 63 e2e, `tsc --noEmit`, `pnpm check` clean (rule sanity-probed separately —
> see above), desktop + site builds, `cargo check`.
> Phase 7: `apps/site` bumped to React 19.1/Vite 7/TS 5.8.3, added `@pigeon/ui`+`@pigeon/brand`
> workspace deps and `tailwindcss`+`@tailwindcss/postcss`+`autoprefixer` (mirroring desktop's exact
> versions). Only one React 19 break: `useRef<number>()` in `CopyButton.tsx` needed an explicit
> initial value (`useRef<number | undefined>(undefined)`) — the only bare `useRef()` call in the
> site, everything else already passed `null`.
>
> The 3700-line `App.css` turned out to have clean `/* ===== Section ===== */` comment markers
> throughout (not visible from a first grep pass) — split into 15 files under `src/styles/` at
> those exact marker boundaries (`tokens`, `base`, `header`, `hero-intro`, `hero-demo`, `organize`,
> `features`, `why`, `open-source`, `download`, `footer`, `stats-band`, `why-story-demos`,
> `organize-story-demos`, `responsive`), glued back by `src/styles/index.css` importing them in the
> exact original sequence — verified the 15 files' line counts sum to exactly 3700, so this is a
> pure cut, zero content reordering, zero cascade-order risk. Some component's CSS lands in more
> than one file (e.g. WhySection's card intro in `why.css` but its animated story demos in
> `why-story-demos.css`, sandwiched between `footer.css`/`stats-band.css` in the original) because
> the source file itself interleaves them that way — reordering to force one-file-per-component
> would have been an actual content change, not a mechanical split, so left as-is.
>
> Token consolidation: added `@import "@pigeon/ui/tokens.css"` and deleted exactly one line from the
> site's own `:root` — its `--primary: oklch(0.6171 0.1375 39.0427)` — which was already
> byte-identical to `@pigeon/ui`'s. Nothing else in `:root` overlaps in *meaning* with `@pigeon/ui`'s
> tokens (site is permanently dark with its own bespoke palette — `--bg`/`--panel`/`--green` etc. —
> not the app's theme-variant `--background`/`--card`/`.dark`-switching set), so nothing else was
> touched. The few token *names* that do collide (`--border`, `--muted`, `--radius`) are harmless:
> site's own `:root` block still declares them after the import, so same-specificity/later-in-source
> wins and they're unaffected.
>
> Deliberately imported **only** Tailwind's `theme.css` + `utilities.css` layers, not the full
> `@import "tailwindcss"` shorthand — that would've pulled in Preflight (Tailwind's CSS reset),
> which resets headings/lists/buttons/etc. the site currently leaves at browser defaults. The site
> already has its own complete reset; adding Preflight on top would've been exactly the kind of
> silent visual change the "pixel-identical" guardrail exists to prevent. Confirmed Preflight is
> absent from the build output (`blockquote` — Preflight's tell — appears nowhere in the built CSS).
>
> `CopyButton` → `@pigeon/ui`'s `Button` (the plan's own named example): passes `className="copy"`
> (+`"done"` when copied) through to `Button` — since `.copy`/`.done` are custom classes at the same
> specificity as Button's Tailwind utilities and come later in cascade order, they still fully
> control the visible background/color/border-radius/padding/font-size, confirmed via
> `getComputedStyle` before/after (identical values). Button adds real value on top — proper
> `focus-visible` ring, `disabled:` states — that the raw `<button>` didn't have, without changing
> the default/hover appearance.
>
> Verification: `pnpm build:site` clean; visual pass via browser preview at 360/768/1440 (hero
> region matches pre-change screenshots at every width; the 768px nav-link wrap is a **pre-existing**
> rough edge — same media query as before, confirmed unchanged, not a regression); `getComputedStyle`
> spot-checks across header/hero/why-card/footer/stats-band/copy-button all match pre-change values
> exactly. `pnpm check` clean (29 pre-existing site CSS specificity warnings, same count as every
> prior phase, now just attributed to the new filenames instead of the old monolith). Desktop
> untouched — its build output hash is byte-identical to Phase 6's. Also wired
> `deploy-site.yml`'s trigger `paths:` to include `packages/ui/**`/`packages/brand/**` (a Phase 1
> config-table item that only became real once the site actually started depending on those
> packages in this phase).
> Phase 8: documentation pass across every living doc (dated QA snapshots and the security audit
> deliberately left untouched — they're point-in-time records, not living references).
> `CLAUDE.md`: Tech Stack, Monorepo layout (added `packages/ui`/`packages/brand` + the layer rule +
> barrel-enforcement note), Main App architecture (added `core/*` module descriptions, fixed every
> `features/execution`/`shared/lib/browserTable`/store-path reference), Rust module layout (new
> subsection — `lib.rs`/`http.rs`/`sse.rs`/`mcp.rs`/`windows.rs`/`db/*` + the guard test), Theme
> System, Icons/Assets (brand mark now correctly describes `@pigeon/brand` + the still-duplicated
> site `public/` copy), Known Gotchas (workspace glob). `docs/features/*.md`: mechanical `rest/`
> path prefix across all of them (sed, then spot-checked for double-prefix bugs — none), plus
> substantive fixes where the code genuinely moved: `execution.md` (now documents the `core/http` +
> `useSendRequest` split), `mcp.md`/`history-drafts.md` (Rust file paths: `lib.rs`→
> `http.rs`/`mcp.rs`/`windows.rs`/`db/mod.rs`+`db/*.rs`), `response-viewer.md` (`ResponsePanel`
> decomposition: `StatusLine`/`HeadersTable`/`BodyView`/`EmptyResponse`, shared `highlightCode`),
> `request-builder.md` (`UrlBar`/`BodyEditor` decompositions, `KeyValueEditor` moved out to
> `shared/ui/`), `sidebar.md` (`Sidebar` decomposition into `app/layout/sidebar/*`). `TOKENS.md`'s
> opening line was flatly wrong post-Phase-1 (claimed tokens lived in `apps/desktop/src/styles/index.css`
> — they'd moved to `packages/ui/src/styles/tokens.css` back in Phase 1 and this was never fixed
> until now) — corrected, plus a note on the site's separate bespoke palette. Filled in the 5
> package/core-module READMEs that Phases 1–6 had left missing (`core/interpolation`,
> `core/persistence`, `core/platform`, `packages/ui`, `packages/brand`) — every feature, `core/*`
> module, and package now has one. Also caught and fixed 2 more stale paths inside `core/http`'s own
> README while in there (a leftover `features/request-builder` missing its `rest/` segment, and an
> incomplete `Consumes`/`Public API` list that hadn't been updated since Phase 5 added the
> `core/interpolation`/SSE/stream-lifecycle re-exports).
>
> Final gate, run on the actual merge-candidate tree: `pnpm install --frozen-lockfile` clean;
> `pnpm ci:check` exit 0 (the 29 pre-existing site CSS specificity warnings don't fail it — `biome
> ci` only fails on errors by default, despite this repo's own docs describing it as "fails on
> warnings+"); T = 147/147 unit tests; E = 63/63 e2e; B = desktop build clean; S = site build clean;
> C = `cargo check` + `cargo test` (1/1, the migrations guard test) clean; TB = `pnpm tauri build`
> — `Pigeon.app` builds and code-signs cleanly on this full, current tree (same result as the Phase
> 2 check), only the `.dmg` packaging step fails, for the same pre-existing sandbox-GUI-automation
> reason identified back in Phase 2 — not a code regression. `pnpm check`: 0 errors, same 29
> pre-existing warnings as every prior phase.
>
> **Not done, by design:** the actual merge to `main`. That triggers `version-bump.yml` → a real
> tag push → `release.yml` (4-platform build, publishes a public GitHub release) → `deploy-site.yml`
> (redeploys the live marketing site) — a real, externally-visible, effectively irreversible action
> a coding agent should not take on implicit direction. Everything up to and including this final
> gate is done and green; the merge itself needs an explicit go-ahead.

## Why

The codebase grew organically and now has:

- **Duplicated code** — 4 near-identical DB wrappers (`collections`, `environments`, `history`,
  `mcp/oauth` each reimplement the `isTauri() ? invoke() : localStorage` branch); 2 strict-interpolation
  implementations with 2 error classes (`mcp/lib/interpolate.ts` vs `execution/services/requestService.ts`);
  MCP hand-rolls a headers textarea and result rendering instead of reusing `KeyValueEditor` and the
  response viewer; parallel Browser/Tauri transport trios in `execution` and `mcp`.
- **Inconsistent module layout** — features diverge on `types.ts` / `services/` / `ports/` / README;
  the `mcp` barrel exports only 2 components; ~8 deep cross-feature imports bypass barrels.
- **Giant files** — `ResponsePanel.tsx` 1201 L, `Sidebar.tsx` 1166 L, `BodyEditor.tsx` 670 L,
  `UrlBar.tsx` 590 L, Rust `lib.rs` 899 L (REST + MCP + SSE + DB + windows in one file).
- **Marketing site drift** — React 18 + one 3700 L `App.css`, brand tokens re-declared by hand,
  `pigeon-mark.svg` triplicated.

Goal: production-ready, open-source-friendly structure — consistent sub-modules, zero duplication,
clear public APIs, shared workspace packages used by both apps.

## Decisions (locked)

1. Full directory re-layout of `apps/desktop/src`.
2. Rust backend split into modules — **Tauri command names unchanged**.
3. Shared UI package; site upgraded to React 19 + Tailwind 4.
4. One branch, one merge (phased commits with green checkpoints). Merging to `main` auto-releases,
   so merge exactly once, fully green.

## Target state

### Monorepo

```
apps/desktop/    # Tauri app (package: pigeon)
apps/site/       # marketing site (package: pigeon-site)
packages/ui/     # @pigeon/ui — tokens.css + shared React 19 primitives (source-only)
packages/brand/  # @pigeon/brand — canonical logo/brand assets
```

Only 2 packages. No `packages/types` (RequestConfig is desktop-domain), no `packages/config`.

- **`@pigeon/ui`**: `src/styles/tokens.css` (extracted from `apps/desktop/src/styles/index.css`
  `:root` + `.dark` + `@theme` mapping; `TOKENS.md` is the spec), `lib/cn.ts`, and app-agnostic leaf
  primitives moved from desktop `shared/ui`: `button`, `badge`, `switch`, `tabs`, `Tooltip`.
  Desktop-specific composites (`Modal`, `FindBar`, `HighlightedHtml`, `tabs-shim`) stay in desktop.
  Consumers add `@import "@pigeon/ui/tokens.css"` plus an `@source` line for the package
  (Tailwind 4: a missing `@source` fails silently as unstyled UI — verify early).
- **`@pigeon/brand`**: single canonical `pigeon-mark.svg` (+ wordmark, mono/duotone variants,
  icon source) replacing the triplicated copies in `apps/site/public/`, `apps/desktop/src/assets/`,
  `logo/`.

### Desktop `src` re-layout

Layer rule (enforced): `app → features → core → shared → @pigeon/*`. Core never imports features;
cross-feature imports go through feature barrels only.

```
src/
  app/            # App, AppContent, layout/ (Sidebar → thin shell composing feature-owned tabs)
  core/
    persistence/  # tableStore.ts factories + browserTable.ts (kills the 4 db.ts wrappers)
    interpolation/# interpolateStrict + single UnresolvedVariablesError
    http/         # was features/execution — ports/, sse/, requestService, types
    platform/     # isTauri, windowKind, selectImpl.ts ({tauri, browser} seam)
  features/
    rest/         # request-builder, response-viewer, collections, history, import-export
    mcp/          # standardized skeleton, full barrel, oauth/ kept
    graphql/      # stub with standard skeleton + status README
    environments/ settings/ command-palette/
  shared/
    ui/           # Modal, FindBar, tabs-shim, KeyValueEditor/ (moved), result-viewer/HighlightedBody.tsx
    lib/          # contentType, template, url, httpMethod, textFind, time, utils (cn re-export)
    types/        # RequestConfig etc.
```

Standard feature skeleton: `components/ hooks/ lib/ services/ store.ts types.ts index.ts README.md`.
Alias stays `@ → ./src`. **Non-negotiable invariant: Playwright `data-testid`s and DOM structure
unchanged — `pnpm e2e` is the gate every phase.**

### Deduplication designs

- **Persistence** — `core/persistence/tableStore.ts` exposes `createNumTableStore` /
  `createStrTableStore` / `createKeyValueStore`. Each feature keeps a thin `services/db.ts` that
  instantiates the store with its Tauri command names; exported function names unchanged so call
  sites and vitest mocks survive. History's quota guard passes in as `browserWriteGuard`.
- **Interpolation** — `core/interpolation` owns `interpolateStrict` + `UnresolvedVariablesError`;
  deletes the MCP duplicate and the 3 inline sites in `requestService.ts`. UI error strings stay
  byte-identical.
- **KeyValueEditor** — moves to `shared/ui/KeyValueEditor/` (split into Editor + Row + types).
  MCP adopts it for headers; store gains `headers: Header[]` with one-time migration from persisted
  `headersText`. Tool args get `SchemaArgsForm` in mcp if schema isn't a flat string map.
- **Result viewer** — `shared/ui/result-viewer/HighlightedBody.tsx` (content-type detect → hljs →
  HighlightedHtml); both `ResponsePanel` and `McpPanel` render through it. ResponsePanel decomposes
  into `BodyView` / `HeadersTable` / `SseEventList` / `StatusLine` — pure extraction.
- **Transport seam** — `selectImpl<T>({ tauri, browser })` used by both the HTTP client selector
  and the MCP transport selector; the two port interfaces stay separate.
- **Cycles broken** — execution↔history: history-writing moves from `requestService` into a
  rest-level `useSendRequest` orchestrator hook. request-builder↔environments: barrels + EnvModal
  using shared KeyValueEditor.
- **import-export** — `RequestModel`'s `Header` renamed on export to `ImportedHeader` (collides
  with shared `Header`).

### Rust split (`src-tauri/src`) — command fn names never change

```
lib.rs      # run(): plugins, DbState, generate_handler![http::send_api_request, ...]
http.rs     # client builders + send_api_request
sse.rs      # SSE parser + stream registry + cancel_sse_stream (shared state moves as one unit)
mcp.rs      # send_mcp_request
windows.rs  # open_workspace_window
oauth.rs    # unchanged
db/mod.rs   # DbState, MIGRATIONS moved VERBATIM (append-only) + guard test, get_migration_status
db/{drafts,history,collections,mcp_oauth}.rs   # per-domain SQL + commands
```

### Site upgrade (`apps/site`)

- Deps: React 18→19.1, Vite 5→7, TS ~5.8.3, Tailwind 4 + `@tailwindcss/postcss`,
  `@pigeon/ui` + `@pigeon/brand` workspace deps.
- **Guardrail: do NOT Tailwind-rewrite the 3700 L App.css.** Mechanical split into per-component
  CSS files (pixel-identical), replace hardcoded colors with `var(--…)`, delete the re-declared
  token block, import `@pigeon/ui/tokens.css`. Utilities only where components actually adopt
  `@pigeon/ui` primitives (e.g. CopyButton → Button).
- Keep: `sync:install`, build-time `release.json` fetch + stub fallback, `postcss.config.js`
  presence, `deploy-site.yml` flow.
- Verify: `pnpm build:site` + preview + before/after screenshots at 360/768/1440.

### Config updates

| File | Change |
|---|---|
| `pnpm-workspace.yaml` | ✅ `packages: ['apps/*', 'packages/*']` |
| `biome.json` | ✅ added `packages/*/src/**` to includes (user approved) |
| `.github/workflows/deploy-site.yml` | ✅ `paths:` add `packages/ui/**`, `packages/brand/**` |
| `apps/desktop/components.json` | ✅ done (Phase 0) |
| Root cleanup + `.gitignore` | ✅ done (Phase 0) |
| Barrel enforcement | ✅ Biome `noRestrictedImports` (in `linter.rules.style`) banning `@/features/*/(components\|hooks\|lib\|services\|store\|ports\|oauth\|model)/*` (+ the `rest/`-nested variant) and `@/core/*/…`; no fallback script needed — Biome's glob `patterns` covered it |

## Execution phases

Checkpoints: T=`pnpm test` · E=`pnpm e2e` · B=`pnpm build` · S=`pnpm build:site` ·
C=`cargo check` · TB=`pnpm tauri build`.

| # | Phase | Checkpoint |
|---|---|---|
| 0 | ✅ Cleanup baseline — branch, strays, .gitignore, components.json | T E B S (done, green) |
| 1 | ✅ Packages scaffold — workspace glob, `@pigeon/brand` (rewire 3 svg consumers), `@pigeon/ui` (tokens.css + cn + 5 primitives); desktop consumes | T E B S (done, green) — desktop pixel-identical |
| 2 | ✅ Rust split — per tree above; MIGRATIONS verbatim + guard test | C, cargo test, cargo fmt (done, green); TB builds/signs `Pigeon.app` (dmg step blocked by sandbox, unrelated) |
| 3 | ✅ Core extraction — persistence, interpolation; port 4 db wrappers; execution → core/http; break history cycle via `useSendRequest` (no shims needed, consumer count was small) | T E B (done, green) |
| 4 | ✅ Full re-layout moves — `git mv` into `rest/` grouping, standardize skeletons, expand mcp barrel, codemod `@/` imports (12 files, smaller than estimated) | T E B (done, green) — zero testid drift |
| 5 | ✅ UI dedup + splits — ImportedHeader rename, KeyValueEditor to shared + MCP adoption, HighlightedBody consolidation, ResponsePanel/Sidebar/BodyEditor/UrlBar decompositions | T E B (done, green); manual MCP smoke done (browser preview) |
| 6 | ✅ Barrel enforcement — fixed 8 deep imports, enabled Biome `noRestrictedImports` | `pnpm check` clean (done, green), T E B |
| 7 | ✅ Site upgrade — deps bump → tokens import (Preflight-free Tailwind) → App.css mechanical split (15 files) → CopyButton→Button | S (done, green) + preview at 360/768/1440 + computed-style diff; T E B unaffected (desktop untouched) |
| 8 | ✅ Docs + final gate — CLAUDE.md, docs/features/*, docs/testing.md, package/feature READMEs, TOKENS.md | T E B S C TB + `pnpm ci:check` + frozen-lockfile install (done, green) — merge itself not yet done, needs go-ahead |

Merge once at the end → one auto-release (version-bump → release → deploy-site). Run TB on the
merge-candidate SHA first.

## Risks & mitigations

1. **Playwright/testid drift** — markup-preserving splits; e2e at every phase; any spec edit beyond
   import paths is a red flag.
2. **React 19 on site** — small hook surface; `tsc` catches `useRef()`/ref typing; manual visual pass.
3. **App.css decomposition** — mechanical split only, screenshot diffing.
4. **Vitest mocks** — they mock `@tauri-apps/api/core` by command name; keep `db.ts` export names stable.
5. **Rust** — SSE shared state moves as one unit into `sse.rs`; MIGRATIONS guard test.
6. **One-merge-one-release** — full build on the final SHA; ready to fast-follow patch.
7. **Tailwind `@source` silent failure** — verify `@pigeon/ui` styling in both apps early.

## Key files

- `apps/desktop/src-tauri/src/lib.rs`, `db.rs`
- `apps/desktop/src/features/execution/services/requestService.ts`
- `apps/desktop/src/shared/lib/browserTable.ts` (seed of core/persistence)
- `apps/desktop/src/styles/index.css` (source of tokens.css)
- `pnpm-workspace.yaml`, `biome.json`, `.github/workflows/deploy-site.yml`
- `apps/site/src/App.css`, `apps/site/package.json`
