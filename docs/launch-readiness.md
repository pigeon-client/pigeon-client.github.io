# Launch Readiness — v1.0

Summary of the 8-phase launch plan's execution. Written at the end of the run; reflects the state
as of commit `dd851f0`.

## Phases completed

| Phase | Status | Commit(s) |
|---|---|---|
| 1 — `{{token}}` hover-preview fix | ✅ Done | `c8bc87b` |
| 2 — Remove silent history/draft caps | ✅ Done | `b8e9c89` |
| 3 — ⌘K global command palette | ✅ Done | `4bc9f77` |
| 4 — Minimal MCP testing bench | ✅ Done | `896f8d3` |
| 5 — Pre-launch QA sweep | ✅ Done | `82fba93`, `57fc916` (+ `6fcecf1`, pre-existing validated fixes folded in) |
| 6 — Response snapshots in history | ✅ Done | `e338077` |
| 7 — Release engineering | ✅ Docs/template done; **signing/notarization not done** | `e68d7de` |
| 8 — Landing page + README alignment | ✅ Done | `dd851f0` |

All eight phases were executed in order, as required. Phase 7 is the one phase whose *artifact*
(a signed, notarized, publicly-installable release) could not be produced in this environment —
see below.

## Test counts (final, this session)

- **Vitest**: 120/120 passing, 19 test files.
- **Playwright**: 53/53 passing, across 15 spec files (added this run: `command-palette.spec.ts`,
  `mcp.spec.ts`, `long-values.spec.ts`, `shortcuts.spec.ts`, `sidebar-search.spec.ts`, plus
  extensions to `history-drafts.spec.ts`, `settings-theme.spec.ts`, `collections.spec.ts`,
  `send.spec.ts`, `body-editor.spec.ts`, `import-curl.spec.ts`).
- `tsc --noEmit`: clean.
- `pnpm build:site`: clean.
- Rust: `cargo check` clean (new `send_mcp_request` command, `McpHttpResponse` struct).

These numbers were re-verified in the final turn of this session, not just claimed from earlier
in the run.

## Open known issues

- **Pre-launch QA leftovers** — a handful of manual checks were explicitly marked
  **unverified** rather than claimed-and-wrong: real file-picker multipart/binary upload, HTML
  preview sandbox visual check, word-wrap-persists-across-reload, response-headers-tab scroll,
  sidebar drag-resize bounds, light/dark icon contrast. None of these are launch blockers on their
  own, but a human should spot-check them before a public v1.0, ideally on the actual desktop
  (Tauri) build — every automated check in this run exercised the **browser build** (Playwright
  drives `pnpm dev`, not `tauri dev`); the Rust/SQLite/native-`reqwest` path is covered by unit
  tests around the code that calls it, not by an end-to-end desktop run.
- **`docs/features/*.md` "Open risks" sections** — each feature doc still carries a short,
  current list of known limitations (e.g. command-palette's recency tie-break only applies to
  history rows; history-drafts' retention prune deletes rows outright rather than degrading them
  to metadata-only the way the browser quota-guard does for snapshots). These are documented
  trade-offs, not bugs.
- **MCP bench is a header-button modal, not a tab-store tab** — see `docs/features/mcp.md` Open
  risks for the reasoning (retrofitting the tab union for one minimal feature was judged too much
  blast radius). Functionally complete (connect/list/call/inspect) either way.
- **Hero demo animation** — the site's hand-animated hero mock was left as-is (copy updated, demo
  sequence untouched) rather than rewritten to script a literal "seed → quit → reopen → ⌘K → find"
  beat; see the Phase 8 commit message for why.

## Signed-build verification — **not signed, not notarized**

Verified by reading `apps/desktop/src-tauri/tauri.conf.json` and `.github/workflows/release.yml`
directly (not by building):

- macOS signing identity is `"-"` (ad-hoc). No notarization step exists in the release workflow.
- This is a **known, already-documented trade-off today** — the release notes template and
  `scripts/install.sh` both already work around it with `xattr -cr`.
- Full detail, and the exact six `APPLE_*` secrets + steps needed to close it, are in
  `docs/release.md`. **This requires a real Apple Developer Program membership tied to a human's
  Apple ID — it cannot be done by an agent.**

## Homebrew cask

`Casks/pigeon.rb` is a template with placeholder checksums — not yet installable. No real
tap repo exists yet. See `docs/release.md` for the exact steps once a signed release exists.

## Exact release steps left for the human

1. **Close the signing/notarization gap** (`docs/release.md`, "Current state" section): enroll in
   the Apple Developer Program, generate a Developer ID Application certificate, add the six
   `APPLE_*` secrets to the repo, and pass them through in `release.yml`'s existing `Build Tauri
   app` step (same pattern as the already-present `TAURI_SIGNING_PRIVATE_KEY`).
2. **Prove auto-update end-to-end** (`docs/release.md`, "Auto-update" section): build/publish a
   `v0.9.9-test` then a `v1.0.0-test`, install the first, confirm the update UI and successful
   install of the second, then delete both test releases/tags.
3. **Stand up the Homebrew tap**: once a signed `.dmg` exists, compute its SHA256, fill in
   `Casks/pigeon.rb`, create `pigeon-client/homebrew-pigeon`, move the cask file there, and verify
   `brew install --cask pigeon-client/pigeon`.
4. **A desktop-build QA pass**: run the manual checklists in `docs/features/*.md` against a real
   `tauri dev` / packaged build (SQLite persistence, real `reqwest` sends, real file picker,
   real proxy/SSL settings) — this session's automation only covered the browser build.
5. **Tag and publish v1.0.0** once 1–4 are done, per the checklist in `docs/release.md`. This
   agent does not tag or publish releases.
