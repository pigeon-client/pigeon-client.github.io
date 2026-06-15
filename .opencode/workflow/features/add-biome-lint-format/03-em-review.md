# EM Review: Add Biome.js for Linting and Formatting

## Feasibility Assessment

- [x] **Technically feasible** — with noted modifications (see below)
- [ ] Requires investigation
- [ ] Not feasible

**Overall verdict**: APPROVED with recommendations. The feature is sound and buildable, but the design targets Biome v1.9.4 while the current stable release is **Biome v2.5.0** (June 2026). Several breaking changes from v1→v2 affect the config format and rule names. These are well-documented and fixable, and the `biome migrate --write` command automates most of the migration.

---

## Key Findings

### ✅ What Works Well

| Aspect | Assessment |
|--------|-----------|
| **Biome + TypeScript 5.8 / 5.6** | Compatible. Biome v2.x supports TS up to v5.9. Both TS 5.6 (site) and TS 5.8 (main app) are fully supported. |
| **Biome + React 18 / 19** | Fully supported (JSX/TSX parsing, React-specific lint rules like `useButtonType`, `useJsxKeyInIterable`). |
| **Lefthook on macOS** | Works perfectly. Lefthook is a compiled Go binary with first-class macOS/darwin support, including Apple Silicon. |
| **No existing tool conflicts** | Confirmed: no `.eslintrc*`, `.prettierrc*`, `eslint.config.*` files exist anywhere in the project. No conflicts. |
| **Single config for two projects** | Feasible — `includes` (v2.x) or `include` (v1.x) can target both `src/**` and `site/src/**` from a root `biome.json`. |
| **Lefthook skip for fresh clones** | The `test ! -f node_modules/.bin/biome` skip logic is correct bash. |
| **VCS integration with `.gitignore`** | `.gitignore` already covers `node_modules`, `dist`, `.vscode/*`. VCS integration will correctly ignore these. |
| **Makefile / npm script design** | All commands are valid Biome CLI commands. No issues. |
| **Performance target (<2s)** | Realistic. Biome v2.x is even faster than v1.x and handles moderate codebases in under a second. |

### ⚠️ Critical Issue: Design Targets Biome v1.9.4 (Outdated)

The design was written against **Biome v1.9.4** (released Oct 2024), but we are now in **June 2026** and the current stable is **Biome v2.5.0** (released June 12, 2026). Biome v2.0 introduced several breaking changes that affect the config format in the design.

#### Breaking Changes That Impact `biome.json` Config

| Design (v1.9.4) | Required for v2.x | Fix |
|-----------------|-------------------|-----|
| `"$schema": ".../schemas/1.9.4/schema.json"` | Update to `"$schema": ".../schemas/latest/schema.json"` or `2.5.0` | Update URL |
| `"include": [...]` / `"ignore": [...]` | **Removed** — replaced by `"includes": [...]` (single field combining both include and ignore logic) | Use `"includes"` with different syntax |
| `"noConsoleLog": "warn"` | **Removed** in v2.0 — deprecated rule deleted | Replace with `"noConsole": "warn"` (or omit — `noConsole` covers all console methods, not just `.log`) |
| `"noPropTypes": "warn"` | Not found in v2.x schema — may have been removed | **Investigate**: either `noPropTypes` was removed or moved. If removed, drop this rule. |
| Style rules: `"noVar": "error"`, `"useConst": "error"`, etc. | In v2.x, `style` group rules no longer emit errors by default — must be explicitly set | The design already explicitly sets severities, so this should work. But verify with `biome migrate --write`. |
| Glob patterns: `"src/**/*.ts"` | In v2.x, `*` no longer matches path separators `/`. Patterns like `src/**/*.ts` should be `src/**/*.ts` (with `**`) which still works correctly. | Most patterns are fine, but `postcss.config.js` (a single file) should be listed directly, not as a glob. The design already does this. |

#### Version Constraint

- Design: `"@biomejs/biome": "^1.9.4"` → This locks to v1.x only
- Needed: `"@biomejs/biome": "^2.5.0"` (or latest 2.x)
- Lefthook: `"@evilmartians/lefthook": "^1.10.0"` → Lefthook v1.x is fine, but latest is likely higher. Should use `"^1.10.0"` or `"^2.x"` depending on current release.

### ✅ Mitigation

The `biome migrate --write` command handles most v1→v2 config migrations automatically. During implementation, the dev should:
1. Create the v1.x-style config as specified in the design
2. Run `npx biome migrate --write` to auto-convert to v2.x
3. Manually address any remaining issues (removed rules, etc.)

This is a routine migration and does not block the feature.

---

## Questions / Concerns

1. **`noPropTypes` rule status**: The design specifies `"noPropTypes": "warn"` but this rule does not appear in the Biome v2.x schema. It may have been removed during the v1→v2 transition. **Action**: Verify during implementation. If removed, drop the rule or replace with an equivalent.
2. **`noConsoleLog` → `noConsole`**: The design uses `noConsoleLog` (removed in v2.0). `noConsole` is the correct v2.x replacement but is stricter (it bans all `console.*`, not just `.log`). The team should confirm if `noConsole` at "warn" level is acceptable, or if they prefer a more permissive approach.
3. **Lefthook version**: The design pins `@evilmartians/lefthook` at `^1.10.0`. The current Lefthook may have newer major versions. Verify that the latest version's YAML config format is compatible with the design.
4. **`.gitignore` for `dist/`**: `.gitignore` lists `dist` (no trailing slash). This matches `dist/` directories. VCS integration (`useIgnoreFile: true`) will correctly ignore these. No action needed — just confirming.
5. **`site/node_modules` and `site/dist` in `ignore`**: With v2.x's VCS integration, `.gitignore` entries are respected. However, `site/` is not in the root `.gitignore` — check if `site/.gitignore` exists. The explicit `includes` patterns in the design (only targeting `site/src/**`) already prevent Biome from processing `site/node_modules` or `site/dist`, so this is safe either way.

---

## Technical Recommendations

1. **Update Biome to v2.x during implementation** — use `@biomejs/biome@^2.5.0` and update the `$schema` URL to `https://biomejs.dev/schemas/latest/schema.json`.
2. **Use `biome migrate --write`** — create the v1.9.x-compatible `biome.json` from the design, then run migration to auto-convert to v2.x format. This handles the `include`→`includes` rename, rule category changes, and glob pattern updates.
3. **Replace `noConsoleLog` with `noConsole`** in the migrated config, or drop it if the team prefers to allow `console.warn`/`console.error`.
4. **Investigate `noPropTypes`** — check if it survived the v1→v2 migration. If not, remove the rule entry.
5. **Use the latest Lefthook** — update to `@evilmartians/lefthook@^1.10.0` or the latest available. The YAML config format in the design is compatible with Lefthook v1.x.
6. **Run `biome check --write --unsafe` first** before enforcing git hooks — this prevents the initial commit from being blocked by pre-existing formatting/lint issues across the codebase.
7. **Verify the `style` rule severities** after migration — ensure `noVar`, `useConst`, `useTemplate`, etc. still have `"error"` severity as intended, since v2.x defaults style rules to lower severity.

---

## Missing Information

- The exact latest Lefthook version available at install time (dev can resolve during `npm install`).
- Whether `site/` has its own `.gitignore` (not critical, but good to know for VCS integration edge cases).

---

## Decision

- [x] **APPROVED** — pass to development
- [ ] NEEDS REVISION — return to PM

### Implementation Notes for Dev Agent

1. Install dependencies with latest versions:
   ```bash
   npm install --save-dev @biomejs/biome @evilmartians/lefthook
   ```
2. Create `biome.json` per design, then run:
   ```bash
   npx biome migrate --write
   ```
3. Review the migrated config — fix `noConsoleLog` → `noConsole`, check `noPropTypes`.
4. Run initial auto-fix:
   ```bash
   npx biome check --write --unsafe
   ```
5. Create `lefthook.yml`, install hooks:
   ```bash
   npx lefthook install
   ```
6. Add npm scripts and Makefile targets per design.
7. Verify everything works with the verification steps in the design doc.
