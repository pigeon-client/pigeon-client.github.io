# Feature: Add Biome.js for Linting and Formatting

## Overview

Integrate [Biome.js](https://biomejs.dev/) as a unified linter and formatter for the Pigeon React/TypeScript project, replacing the need for separate ESLint + Prettier tooling. Set up git hooks via Lefthook to automatically lint and format code on push, ensuring consistent code quality across the main app and marketing site without manual intervention.

## User Stories

- As a **developer**, I want Biome to lint my TypeScript/React code so that I catch errors and enforce style rules without running multiple tools.
- As a **developer**, I want code to be automatically formatted on push so that I don't have to think about formatting manually.
- As a **maintainer**, I want CI-compatible lint+format checking so that PRs can be validated before merging.
- As a **developer**, I want consistent configuration across the main app and marketing site so that I don't have to manage two different linter setups.
- As a **developer**, I want `make lint` and `make format` commands so that I can run checks easily from the terminal.

## Functional Requirements

### 1. Biome Installation & Setup

1.1. Install `@biomejs/biome` as a devDependency in the **root** `package.json` (covers both main app and site).

1.2. Create a **root-level `biome.json`** configuration file that covers both:
   - Main app source: `src/**/*.{ts,tsx,js,jsx,mjs,cjs}`, config files (`vite.config.ts`, `postcss.config.js`)
   - Marketing site source: `site/src/**/*.{ts,tsx,js,jsx}`, config files (`site/vite.config.ts`)

1.3. The `biome.json` must **exclude**:
   - `node_modules/` (both root and site)
   - `dist/` (both root and site)
   - `src-tauri/` (Rust backend)
   - `.git/`, `.vscode/`, `.claude/`, `.opencode/`
   - `package-lock.json`, `tsconfig.json` (Biome should not format JSON that it might break)
   - ✅ However `tsconfig.json` can be linted for JSON validity — use careful includes

### 2. Biome Lint Rules

2.1. Enable the `recommended` lint ruleset as the base (includes correctness, style, complexity, and performance lint groups).

2.2. Configure **TypeScript-specific** lint rules:
   - `noUnusedVariables` — error (matches existing `tsconfig.json` settings)
   - `useExhaustiveDependencies` — error (React hooks correctness)
   - `noImplicitAnyLet` — error
   - `noUnusedImports` — error (keep imports clean)

2.3. Configure **React-specific** lint rules:
   - `useButtonType` — error (accessibility)
   - `useJsxKeyInIterable` — error (required keys in lists)
   - `noChildrenProp` — warn (prefer JSX children over `children` prop)
   - `noPropTypes` — warn (TypeScript types should be used instead)

2.4. Configure **style rules**:
   - `useConst` — error (prefer `const` for non-reassigned variables)
   - `noVar` — error (no `var` declarations)
   - `useSingleVarDeclarations` — off (allow multiple declarations per statement)
   - `useTemplate` — error (prefer template literals over string concatenation)

2.5. Configure **complexity rules**:
   - `noBannedTypes` — error (no `String`, `Number`, `Boolean`, etc.)
   - `noUselessConstructor` — error
   - `noUselessSwitchCase` — error
   - `noUselessTernary` — error
   - `useSimplifiedLogicExpression` — warn

2.6. Configure **suspicious rules**:
   - `noConsoleLog` — warn (prefer structured logging, but allow for development)
   - `noDebugger` — error (no debugger statements in production code)
   - `noDoubleEquals` — error (strict equality only)

### 3. Biome Format Configuration

3.1. **Indentation**: spaces, width 2 (matching existing project conventions).

3.2. **Line width**: 100 characters (Biome's default, balances readability with modern screens).

3.3. **Quotes**: double quotes (matching existing code style in `package.json`, `tsconfig.json`).

3.4. **Semicolons**: always use semicolons (TypeScript convention, matching existing code).

3.5. **Trailing commas**: "all" (standard for ESNext modules, cleaner diffs).

3.6. **JSX quotes**: double quotes (matching JSX attribute conventions).

3.7. **Arrow parens**: "always" (always include parentheses around arrow function parameters for consistency).

3.8. **Bracket spacing**: true (add spaces inside brackets `{ foo }`).

3.9. **Bracket same line**: false (put `>` of multi-line JSX/HTML on a new line).

3.10. **End of line**: "lf" (consistent with Unix/macOS and Git conventions).

3.11. **JSON formatter**: enabled for `.json` config files, but use `ignore` to skip `package-lock.json` and `tsconfig.json` (Biome may reformat JSON in ways incompatible with TypeScript's schema expectations — though actually, Biome handles JSON safely; let's keep it enabled for all JSON files except `package-lock.json`).

### 4. Git Hooks via Lefthook

4.1. Install `@evilmartians/lefthook` as a devDependency in the root `package.json`.

4.2. Create a **`lefthook.yml`** config file at the project root.

4.3. **Pre-push hook**: run `biome check --diagnostic-level=error` (lint + format check, fail on any error) on all relevant files. This ensures no breaking code is pushed.

4.4. **Pre-commit hook**: run `biome check --write --unsafe --diagnostic-level=warn` on staged files to auto-fix lint and format issues before committing. Use `git diff --name-only --cached` via lefthook's built-in `files` command to only check staged files.

4.5. Lefthook should use the **project's local Biome installation** (`node_modules/.bin/biome`) rather than a global one.

4.6. Lefthook must **skip** hook execution when Biome is not installed (e.g., fresh clone without `npm install`).

### 5. npm Scripts

5.1. Add the following scripts to the root `package.json`:

| Script | Command | Description |
|--------|---------|-------------|
| `lint` | `biome lint` | Check all files for lint errors |
| `lint:staged` | `biome lint --staged` | Check only staged files for lint errors |
| `format` | `biome format --write` | Format all files in-place |
| `format:check` | `biome format` | Check formatting without writing (dry-run, exits with 1 if unformatted) |
| `check` | `biome check` | Run lint + format check on all files (read-only) |
| `check:write` | `biome check --write --unsafe` | Auto-fix lint issues + format all files |
| `ci:check` | `biome ci` | CI-ready check (stricter, fails on any warning+) |

### 6. Makefile Integration

6.1. Add the following targets to the root `Makefile`:

```makefile
lint:
	npm run lint

format:
	npm run check:write

format-check:
	npm run format:check

ci-check:
	npm run ci:check
```

6.2. These targets should be added as `.PHONY` entries as well.

### 7. CI Compatibility

7.1. The `biome ci` command should be used in CI pipelines (GitHub Actions, etc.) — it runs lint + format checks and exits with a non-zero code on any issue, including warnings.

7.2. CI must install dependencies (`npm ci`) before running `biome ci`.

7.3. Biome's performance (sub-second on moderate codebases) makes it ideal for CI without needing caching.

7.4. No external dependencies (Docker, etc.) are needed — Biome is a single binary.

### 8. Editor Integration (Nice-to-Have)

8.1. Document how to install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) for in-editor linting and formatting.

8.2. Recommend setting Biome as the default formatter in `.vscode/settings.json` (workspace settings):

```json
{
  "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
  "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
  "[json]": { "editor.defaultFormatter": "biomejs.biome" },
  "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" }
}
```

## Non-Functional Requirements

- **Performance**: Biome must complete lint+format on the full codebase in under 2 seconds (Biome is written in Rust and benchmarks at 50-500x faster than ESLint+Prettier for comparable configs).
- **Usability**: Zero-config for developers after `npm install` — hooks should work automatically. All scripts should produce clear, actionable error messages.
- **Compatibility**: Must work with both the main app (React 19 + TS 5.8) and marketing site (React 18 + TS 5.6) without separate configurations. A single `biome.json` must handle both.
- **Safety**: Pre-push hooks must be non-blocking if `node_modules` is missing (new clone scenario). Pre-commit hooks should only modify staged files and leave unstaged changes untouched.
- **Maintainability**: Configuration should be minimal and follow Biome's recommended defaults wherever possible. Deviations should be explicitly commented.

## Acceptance Criteria

- [ ] `@biomejs/biome` is installed as a root devDependency with a working `biome.json` config
- [ ] `biome ci` runs successfully on the entire codebase with zero errors (after initial fixes)
- [ ] `biome check --write --unsafe` auto-fixes common lint/format issues
- [ ] `@evilmartians/lefthook` is installed and `lefthook.yml` is configured
- [ ] `git commit` triggers Biome auto-fix on staged files (pre-commit hook)
- [ ] `git push` triggers Biome validation (pre-push hook) and blocks push on errors
- [ ] `Makefile` has `lint`, `format`, `format-check`, and `ci-check` targets that work
- [ ] Root `package.json` has all required npm scripts working
- [ ] Both main app (`src/`) and site (`site/src/`) are covered by lint/format checks
- [ ] `src-tauri/` (Rust code) is **not** checked by Biome
- [ ] VS Code workspace settings are documented for Biome integration
