# Advisor plans

Written against `0c24a27` plus the uncommitted working tree (collections inheritance, macOS compositor keepalive, `@pigeon/ui` polish). Executors **must** work in the current workspace, not a clean `HEAD` worktree.

Status: all 12 finding plans executed and reviewed. `biome.json` was briefly overridden by plan 004; that override was reverted; cycle breaks use relative leaf imports.

## Execution order

```
001 history-db-index-maps     ─┐
002 strip-inherited-auth      ─┤  same files (history store) — run 001 then 002
003 cap-mcp-oauth-bodies         independent
006 macos-visibility-reload      independent
007 vitest-in-ci                 independent
011 pin-nanoid                   independent (lockfile)
010 restore-focus-rings          independent (packages/ui)
012 atomic-collection-move       independent
004 break-feature-import-cycles  after 001–002 (touches store imports)
005 tab-scoped-zustand           after 004 (touch same UI barrels)
008 folder-inheritance-e2e       after 002 (asserts stripped vs inherited)
009 virtualize-history-list      last — new dep, DnD out of scope
```

## Status

| Plan | Finding | Effort | Status |
|------|---------|--------|--------|
| 001 | History/draft `*DbIds` maps corrupt on prepend/remove | S | DONE |
| 002 | Inherited auth persisted into SQLite | S | DONE |
| 003 | MCP/OAuth responses unbounded | S | DONE |
| 004 | 7 barrel import cycles fail `check:cycles` | M | DONE |
| 005 | Inactive tabs remount-safe but re-render all editors | M | DONE |
| 006 | macOS visibility spoof breaks reload guard | S | DONE |
| 007 | Vitest missing from primary CI job | S | DONE |
| 008 | TC-COL-005 inheritance has no functional e2e | M | DONE |
| 009 | History sidebar unvirtualized | L (scoped to history) | DONE |
| 010 | UI primitives missing documented focus rings | S | DONE |
| 011 | `nanoid` GHSA via site Vite chain | S | DONE |
| 012 | Cross-collection `moveNode` two non-atomic writes | M | DONE |

## Dependency graph

- `002` after `001` (both edit `history/store.ts`)
- `004` after `001`/`002` (rewrites import paths in those stores)
- `005` after `004`
- `008` after `002`
- `009` last

## Considered and not planned

- Unmounting inactive HTTP tabs — **by design** (`docs/testing.md`: keep `display:none`).
- Editing `lefthook.yml` — **forbidden** without explicit approval (`AGENTS.md`).
- Direction items (Apple signing, re-enable MCP, collection-level docs rewrite, design-system “one PR” close-out) — product options, not bugs.
- Collection-tree virtualization + DnD — high risk; 009 covers history only.

## Rejected / already settled

- Prior `docs/security-audit.md` items still open for the owner (H4 signing, M1 encrypt-at-rest, M6 Actions SHA pin).
- `open_external_url` scheme allowlist — defense-in-depth, lower leverage.
