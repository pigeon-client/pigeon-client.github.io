# Implementation: Biome.js Lint + Format & Lefthook Git Hooks

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `biome.json` | **Created** | Biome v2.5.0 configuration with VCS integration, custom lint rules, formatting settings, Tailwind CSS parser support |
| `lefthook.yml` | **Created** | Pre-commit (staged auto-fix) and pre-push (validation) hooks |
| `package.json` | **Modified** | Added 7 npm scripts (`check`, `check:write`, `ci:check`, `format`, `format:check`, `lint`, `lint:staged`) + 2 devDependencies |
| `Makefile` | **Modified** | Added 4 targets (`lint`, `format`, `format-check`, `ci-check`) + updated `.PHONY` |
| `.vscode/settings.json` | **Created** | Workspace Biome formatter settings (gitignored, local only) |
| `.vscode/extensions.json` | **Modified** | Added `biomejs.biome` to recommendations |
| `src/**/*.ts` | **Auto-fixed** | Formatting + lint fixes applied by `biome check --write --unsafe` |
| `site/src/**/*.tsx` | **Auto-fixed** | Formatting + lint fixes applied |
| `scripts/version-bump.js` | **Auto-fixed** | node: protocol imports, organize imports |

## Code Summary

### Biome v2.5.0 Integration

- Created a `biome.json` config starting from a v1.x-style config, then ran `npx biome migrate --write` to convert to v2.x format
- Fixed post-migration issues manually:
  - Moved `include`/`ignore` to v2.x `files.includes` array format (negated pattern approach was not needed since we just scope to source dirs)
  - Dropped `noPropTypes` (removed in v2.x)
  - Renamed `useSingleVarDeclarations` → `useSingleVarDeclarator`
  - Added `css.parser.tailwindDirectives: true` for Tailwind CSS v4 `@theme` support
- Config features:
  - VCS integration enabled (`vcs.useIgnoreFile: true` — respects `.gitignore`)
  - Linter with `recommended` preset + custom rules:
    - `noUnusedVariables`, `noUnusedImports`, `useExhaustiveDependencies`, `useJsxKeyInIterable` (error)
    - `noChildrenProp`, `noConsole` (warn — allows `console.log`)
    - `noVar`, `noImplicitAnyLet`, `noDebugger`, `noDoubleEquals`, `noBannedTypes`, etc. (error)
    - `useButtonType` (error) for a11y
    - `useSimplifiedLogicExpression` (warn)
    - `useSingleVarDeclarator` (off)
  - Formatter: 2-space indent, 100 char width, double quotes, trailing commas, LF line endings
  - `assist.organizeImports` enabled (auto-sort imports on `--write`)
  - Only processes files in `src/**`, `site/src/**`, `vite.config.ts`, `postcss.config.js`, `scripts/**`

### Lefthook v2.1.9 Integration

- Pre-commit hook: runs `biome check --write --unsafe --diagnostic-level=warn` on staged files, re-stages fixed files
- Pre-push hook: runs `biome check --diagnostic-level=error` on pushed files (read-only validation)
- Both hooks skip gracefully if biome binary is not installed (fresh clone safety)

### Package Scripts Added

```json
"check": "biome check",
"check:write": "biome check --write --unsafe",
"ci:check": "biome ci",
"format": "biome format --write",
"format:check": "biome format",
"lint": "biome lint",
"lint:staged": "biome lint --staged"
```

### Makefile Targets Added

```makefile
lint (# npm run lint)
format (# npm run check:write)
format-check (# npm run format:check)
ci-check (# npm run ci:check)
```

## Biome v1.x → v2.x Migration Notes

The design doc targeted Biome v1.9.4. Key v2.x changes handled:

1. **Schema URL**: `1.9.4` → `2.5.0`
2. **`include`/`ignore`**: Removed from top level. Replaced by `files.includes` (array of glob patterns) in v2.x. Used scoped includes like `src/**`, `site/src/**` instead of explicit extension patterns.
3. **`organizeImports.enabled`**: Replaced by `assist.actions.source.organizeImports: "on"`
4. **`recommended: true`**: Replaced by `preset: "recommended"`
5. **`noConsoleLog`**: Replaced by `noConsole` with `{ allow: ["log"] }` (allows `console.log`, warns on other console methods)
6. **`noPropTypes`**: Removed in v2.x — dropped from config
7. **`useSingleVarDeclarations`**: Renamed to `useSingleVarDeclarator`
8. **`noImplicitAnyLet`** and **`noVar`**: Moved from `style` to `suspicious` category
9. **CSS**: Added `css.parser.tailwindDirectives: true` for Tailwind v4 `@theme` support

## Remaining Issues

After auto-fixing 49 files, 103 errors and 21 warnings remain. These are all pre-existing code quality and accessibility issues requiring manual fixes:

| Category | Count | Description |
|----------|-------|-------------|
| `a11y/useButtonType` | ~58 | Buttons missing `type="button"` (defaults to `submit`) |
| `a11y/noStaticElementInteractions` | ~11 | Divs with onClick need `role` attribute |
| `a11y/noSvgWithoutTitle` | ~10 | Decorative SVGs missing `<title>` or `aria-label` |
| `a11y/noLabelWithoutControl` | ~8 | `<label>` elements not associated with inputs |
| `a11y/useKeyWithClickEvents` | ~8 | Click handlers missing keyboard event handlers |
| `suspicious/noArrayIndexKey` | ~4 | Array indices used as React keys |
| `style/noExplicitAny` | ~3 | `any` type usage |
| `correctness/useExhaustiveDependencies` | ~2 | Hook dependency arrays |
| Various others | ~5 | Minor issues |

These do not block the feature — the tooling is fully functional. The hooks will prevent NEW issues from being committed while the team fixes these pre-existing issues over time.

## API Changes

None — this is a developer tooling configuration change only.

## New Components

None — configuration-only change.

## Testing Commands

```bash
# Lint check
npm run lint

# Format check
npm run format:check

# Full check (lint + format)
npm run check

# CI-grade check (stricter)
npm run ci:check

# Auto-fix everything
npm run check:write

# Verify Makefile targets
make lint
make format-check
make ci-check

# Verify Lefthook hooks installed
ls -la .git/hooks/pre-commit .git/hooks/pre-push

# Run lefthook hooks manually
npx lefthook run pre-commit
npx lefthook run pre-push
```

## Notes

- **Format check passes cleanly** ✅ (`npx biome format` exits 0)
- **Lint check reports 103 errors + 21 warnings** (all pre-existing, auto-fixable issues were fixed)
- **Lefthook hooks installed and validated** ✅
- **NPM scripts and Makefile targets working** ✅
- **VS Code settings created** (local-only, gitignored)
- **VS Code extensions.json updated** with Biome recommendation
- The `files.includes` patterns in v2.x use directory-level globs (e.g., `src/**`) instead of per-extension patterns (e.g., `src/**/*.ts`). This is equivalent in practice — Biome only processes supported file types.
- The `noConsole` rule with `allow: ["log"]` means `console.log()` is allowed but `console.warn()`, `console.error()`, etc. are warned. This is the migration tool's conversion of the old `noConsoleLog` rule. If CLI scripts (like `scripts/version-bump.js`) need `console.error` for user-facing output, consider adding an override or using a `// biome-ignore` comment.
