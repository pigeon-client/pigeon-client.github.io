# Design: Biome.js Lint + Format & Lefthook Git Hooks

## Concept Overview

Integrate Biome.js as a unified linter and formatter (replacing ESLint + Prettier) with Lefthook-managed git hooks for automatic code quality enforcement. The single `biome.json` at the project root covers both the main app (`src/`) and marketing site (`site/src/`), with VCS integration to respect `.gitignore`. Lefthook orchestrates pre-commit auto-fix and pre-push validation via the local Biome binary.

---

## Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| `biome.json` | **Create** | Root Biome configuration with VCS integration, lint rules, format settings |
| `lefthook.yml` | **Create** | Pre-commit (staged auto-fix) and pre-push (full validation) hooks |
| `package.json` | **Modify** | Add 7 npm scripts (`lint`, `lint:staged`, `format`, `format:check`, `check`, `check:write`, `ci:check`) |
| `Makefile` | **Modify** | Add 4 targets (`lint`, `format`, `format-check`, `ci-check`) |
| `.vscode/settings.json` | **Create** | Workspace-level Biome formatter settings (local-only, gitignored) |
| `.vscode/extensions.json` | **Modify** | Add Biome VS Code extension recommendation |

---

## 1. `biome.json` — Complete Configuration

**Location**: `/Users/k1n1/Desktop/pigeon/biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "organizeImports": {
    "enabled": true
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.js",
    "src/**/*.jsx",
    "site/src/**/*.ts",
    "site/src/**/*.tsx",
    "site/src/**/*.js",
    "site/src/**/*.jsx",
    "vite.config.ts",
    "site/vite.config.ts",
    "postcss.config.js",
    "scripts/**/*.js",
    "scripts/**/*.mjs"
  ],
  "ignore": [
    "node_modules",
    "dist",
    "site/node_modules",
    "site/dist",
    "src-tauri",
    ".git",
    ".vscode",
    ".claude",
    ".opencode",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.node.json",
    "site/tsconfig.json"
  ],
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "error",
        "useJsxKeyInIterable": "error",
        "noChildrenProp": "warn",
        "noPropTypes": "warn"
      },
      "style": {
        "noImplicitAnyLet": "error",
        "noVar": "error",
        "useConst": "error",
        "useTemplate": "error",
        "useSingleVarDeclarations": "off"
      },
      "complexity": {
        "noBannedTypes": "error",
        "noUselessConstructor": "error",
        "noUselessSwitchCase": "error",
        "noUselessTernary": "error",
        "useSimplifiedLogicExpression": "warn"
      },
      "suspicious": {
        "noConsoleLog": "warn",
        "noDebugger": "error",
        "noDoubleEquals": "error"
      },
      "a11y": {
        "useButtonType": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "jsxQuoteStyle": "double",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  },
  "json": {
    "formatter": {
      "enabled": true
    }
  }
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **`vcs.enabled: true`** with `useIgnoreFile: true` and `clientKind: "git"` | Biome automatically respects `.gitignore` entries (e.g., `dist/`, `node_modules/`), so we don't need to duplicate those in `ignore` explicitly. However, we keep them in `ignore` for clarity and as a safety net. |
| **`include` restricts to source dirs** | Explicitly limits Biome to `src/`, `site/src/`, config files, and `scripts/`. This prevents Biome from accidentally processing files in unrelated directories. |
| **`ignore` for Rust/non-TS dirs** | `src-tauri/` (Rust) is explicitly ignored since Biome is a JS/TS tool. `tsconfig.json` files are ignored because Biome's JSON formatter could reformat them in ways incompatible with TypeScript's schema expectations. `package-lock.json` is ignored because it's auto-generated and should not be modified. |
| **`organizeImports.enabled: true`** | Automatically sorts and organizes imports when `biome check --write` is run. |
| **`"recommended": true`** | Gives us all of Biome's recommended rules for correctness, style, complexity, and performance as a baseline. The custom rules below build on top of this. |
| **`a11y.useButtonType` under a11y** | Accessibility rule for button type, correctly grouped under the `a11y` category. |

### Rule Categorization Summary

| Category | Rules (severity) |
|----------|-----------------|
| **correctness** | `noUnusedVariables` (error), `noUnusedImports` (error), `useExhaustiveDependencies` (error), `useJsxKeyInIterable` (error), `noChildrenProp` (warn), `noPropTypes` (warn) |
| **style** | `noImplicitAnyLet` (error), `noVar` (error), `useConst` (error), `useTemplate` (error), `useSingleVarDeclarations` (off) |
| **complexity** | `noBannedTypes` (error), `noUselessConstructor` (error), `noUselessSwitchCase` (error), `noUselessTernary` (error), `useSimplifiedLogicExpression` (warn) |
| **suspicious** | `noConsoleLog` (warn), `noDebugger` (error), `noDoubleEquals` (error) |
| **a11y** | `useButtonType` (error) |

---

## 2. `lefthook.yml` — Complete Configuration

**Location**: `/Users/k1n1/Desktop/pigeon/lefthook.yml`

```yml
# lefthook.yml
# Managed by the Pigeon team. Do not edit unless you know what you're doing.

pre-commit:
  parallel: true
  commands:
    biome:
      glob: "*.{js,ts,jsx,tsx,json,jsonc,mjs,cjs}"
      run: npx --no-install biome check --write --unsafe --diagnostic-level=warn --no-errors-on-unmatched {staged_files}
      stage_fixed: true
      skip:
        - script: 'test ! -f node_modules/.bin/biome'

pre-push:
  parallel: true
  commands:
    biome:
      glob: "*.{js,ts,jsx,tsx,json,jsonc,mjs,cjs}"
      run: npx --no-install biome check --diagnostic-level=error --no-errors-on-unmatched {push_files}
      skip:
        - script: 'test ! -f node_modules/.bin/biome'
```

### How the Hooks Work

#### Pre-commit Hook
1. Lefthook intercepts `git commit`.
2. It collects staged files matching the `glob` pattern.
3. Before each file, it checks `test ! -f node_modules/.bin/biome` — if Biome is **not** installed, the command is **skipped** silently (safe for fresh clones).
4. If Biome **is** installed, it runs `npx --no-install biome check --write --unsafe --diagnostic-level=warn` on the staged files, which:
   - Auto-fixes lint issues (`--write`)
   - Applies unsafe fixes (`--unsafe` — e.g., organizing imports, removing unused imports)
   - Formats the code
   - Reports warnings but only fails on errors (`--diagnostic-level=warn`)
5. `stage_fixed: true` tells Lefthook to re-stage any files that were modified by Biome, so the auto-fixes are included in the commit.
6. If any errors remain (issues Biome cannot auto-fix), the commit is blocked.

#### Pre-push Hook
1. Lefthook intercepts `git push`.
2. It collects pushed files matching the `glob` pattern.
3. Same Biome-existence check as pre-commit.
4. If Biome is installed, it runs `npx --no-install biome check --diagnostic-level=error` on the pushed files — **read-only** (no `--write`), **fails on any error**.
5. This ensures no code with lint errors or formatting issues is pushed.

### Skip Logic for Fresh Clones

The `skip` script `test ! -f node_modules/.bin/biome` exits with:
- **0** (success) → biome binary NOT found → **skip** the command → hook passes silently
- **1** (failure) → biome binary IS found → **run** the command → normal behavior

This means:
- Fresh clone without `npm install`: hooks pass silently, no crash
- After `npm install`: hooks run normally

---

## 3. `package.json` — Scripts to Add

**File**: `/Users/k1n1/Desktop/pigeon/package.json`

Add to the `"scripts"` section (alphabetically, before `"dev"` if possible, or after `"build"`):

```json
{
  "scripts": {
    "check": "biome check",
    "check:write": "biome check --write --unsafe",
    "ci:check": "biome ci",
    "format": "biome format --write",
    "format:check": "biome format",
    "lint": "biome lint",
    "lint:staged": "biome lint --staged",
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "version:bump": "node scripts/version-bump.js"
  }
}
```

Also add the devDependencies:

```json
{
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@evilmartians/lefthook": "^1.10.0",
    "@tailwindcss/postcss": "^4.3.0",
    "@tauri-apps/cli": "^2",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.6.0",
    "autoprefixer": "^10.5.0",
    "postcss": "^8.5.15",
    "tailwindcss": "^4.3.0",
    "typescript": "~5.8.3",
    "vite": "^7.0.4"
  }
}
```

### Script Reference

| Script | Command | What It Does |
|--------|---------|-------------|
| `lint` | `biome lint` | Check all files for lint errors (read-only) |
| `lint:staged` | `biome lint --staged` | Check only git-staged files for lint errors |
| `format` | `biome format --write` | Format all files in-place |
| `format:check` | `biome format` | Check formatting without writing (dry-run; exits 1 if unformatted) |
| `check` | `biome check` | Run lint + format check on all files (read-only) |
| `check:write` | `biome check --write --unsafe` | Auto-fix lint issues + format all files |
| `ci:check` | `biome ci` | CI-ready check (fails on any warning+; stricter than `check`) |

---

## 4. `Makefile` — Targets to Add

**File**: `/Users/k1n1/Desktop/pigeon/Makefile`

Add to the `.PHONY` line:

```makefile
.PHONY: all dev build build-release clean install deps open lint format format-check ci-check
```

Add before the `dev:` target (or after `open:` at the end):

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

### Full Modified `.PHONY` Line

```makefile
.PHONY: all dev build build-release clean install deps open lint format format-check ci-check
```

---

## 5. `.vscode/settings.json` — Workspace Settings (Local Only)

**Location**: `/Users/k1n1/Desktop/pigeon/.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

> **Note**: This file is gitignored by `.gitignore` (the repo only tracks `.vscode/extensions.json`). It must be created locally by each developer, or the `.gitignore` exception must be updated to also allow `settings.json`. The design keeps it as a local-only recommendation; teams can decide to update `.gitignore` to track it if desired.

---

## 6. `.vscode/extensions.json` — Add Biome Recommendation (Optional Touch)

**Current content**:
```json
{
  "recommendations": ["tauri-apps.tauri-vscode", "rust-lang.rust-analyzer"]
}
```

**Modified content**:
```json
{
  "recommendations": [
    "biomejs.biome",
    "tauri-apps.tauri-vscode",
    "rust-lang.rust-analyzer"
  ]
}
```

This prompts VS Code users to install the Biome extension when they open the workspace.

---

## Implementation Plan

### Step 1: Install Dependencies
```bash
npm install --save-dev @biomejs/biome @evilmartians/lefthook
```

### Step 2: Create `biome.json`
Write the full configuration file at the project root as specified above.

### Step 3: Add npm Scripts to `package.json`
Insert the 7 new scripts into the `"scripts"` object and add the 2 devDependencies if not already present.

### Step 4: Add Makefile Targets
Insert the `lint`, `format`, `format-check`, and `ci-check` targets and update `.PHONY`.

### Step 5: (Optional) Run Biome to Fix Existing Files
```bash
npx biome check --write --unsafe
```
This applies all auto-fixes and formatting to the existing codebase. Some issues may need manual fixes.

### Step 6: Create `lefthook.yml`
Write the hook configuration at the project root.

### Step 7: Install Lefthook Git Hooks
```bash
npx lefthook install
```
This registers the hooks in `.git/hooks/`.

### Step 8: Create `.vscode/settings.json` (Local)
Create the file with Biome as the default formatter.

### Step 9: Update `.vscode/extensions.json` (Optional)
Add `"biomejs.biome"` to the recommendations array.

### Step 10: Verify

---

## Edge Cases

### Fresh Clone Without `node_modules`
- **Problem**: Hooks fire but Biome binary doesn't exist.
- **Solution**: The `skip` script in `lefthook.yml` (`test ! -f node_modules/.bin/biome`) detects missing Biome and skips the command. Hooks pass silently.

### No `.vscode/` Directory Exists
- **Problem**: Creating `.vscode/settings.json` fails if the directory doesn't exist.
- **Solution**: The `.vscode/` directory already exists (confirmed — contains `extensions.json`). No action needed. If it didn't, `mkdir -p .vscode` would be required.

### Existing Staged Files with Errors
- **Problem**: Pre-commit hook finds lint errors it cannot auto-fix.
- **Solution**: The hook blocks the commit. The developer must fix the errors manually. `--diagnostic-level=warn` means warnings won't block, only errors will.
- **Recovery**: Run `npx biome check` locally to see all issues, fix them, re-stage, and commit.

### Pre-existing Codebase Has Many Violations
- **Problem**: Running `biome check` for the first time reveals many existing issues.
- **Solution**: Two approaches:
  1. **Fix all at once**: `npx biome check --write --unsafe` auto-fixes what it can, then manually fix the rest.
  2. **Incremental**: Use `--staged` flag to only check new/modified code, fixing the existing codebase over time.

### `tsconfig.json` Formatting
- **Problem**: Biome's JSON formatter might reformat `tsconfig.json` in ways that break TypeScript.
- **Solution**: `tsconfig.json`, `tsconfig.node.json`, and `site/tsconfig.json` are explicitly in the `ignore` list. They will not be formatted or linted.

### `package-lock.json` Modification
- **Problem**: Biome might try to format the lockfile.
- **Solution**: `package-lock.json` is in the `ignore` list and is also covered by `.gitignore` (via VCS integration).

### Conflicts with Existing ESLint/Prettier Config
- **Problem**: The project might have remnants of ESLint or Prettier config files.
- **Solution**: Biome does not read ESLint/Prettier configs — it's standalone. Any existing ESLint/Prettier configs can be removed or left as dead files. They won't interfere.

---

## Verification Steps

After implementation, confirm everything works:

### 1. Biome Binary is Available
```bash
npx biome --version
```
Expected output: `1.9.4` (or similar)

### 2. All npm Scripts Work
```bash
# Lint check (should print results, exit 0 or non-zero depending on codebase state)
npm run lint

# Format check (dry-run, should list unformatted files or exit 0)
npm run format:check

# Full check (lint + format)
npm run check

# CI-grade check (stricter)
npm run ci:check

# Auto-fix everything
npm run check:write
```

### 3. Makefile Targets
```bash
make lint
make format-check
make ci-check
make format
```

### 4. Lefthook Hooks Are Installed
```bash
npx lefthook list
```
Expected output shows both `pre-commit` and `pre-push` hooks.

### 5. Pre-commit Hook Works
```bash
# Make a small change to a file
echo "// test" >> src/App.tsx

# Stage and try to commit
git add src/App.tsx
git commit -m "test: verify pre-commit hook"

# The hook should run, auto-fix if needed, and commit should succeed
# (or show errors if unfixable issues exist)

# Clean up
git reset --soft HEAD~1
git restore --staged src/App.tsx
```

### 6. Pre-push Hook Works
```bash
# Try to push (will run Biome on pushed files)
git push

# If there are errors, push will be blocked with Biome error output
```

### 7. Fresh Clone Safety
```bash
# Simulate by temporarily moving biome binary (don't do this in production)
# or:
npx lefthook run pre-commit
npx lefthook run pre-push
```
Both should run without crashing even if biome is not in `node_modules/.bin`.

### 8. Both Main App and Site Are Covered
```bash
# Check that site files are included
npx biome check site/src/main.tsx 2>/dev/null && echo "Site is covered" || echo "Site is NOT covered"

# Check that src-tauri is ignored
npx biome check src-tauri/Cargo.toml 2>&1 | grep -q "ignored" && echo "src-tauri is ignored" || echo "src-tauri check (should say ignored)"
```

### 9. VS Code Settings File Exists
```bash
ls -la .vscode/settings.json
```

### 10. VCS Integration Respects .gitignore
```bash
# Create a test file in an ignored dir to verify (clean up after)
echo "const x = 1" > dist/test.ts
npx biome check dist/test.ts 2>&1 | grep -q "ignored" && echo "VCS integration works" || echo "Check dist/test.ts"
rm -f dist/test.ts
```

---

## UI/UX Flow

This feature has no UI — it's a developer tooling integration. The "user" is the developer, and the "flow" is:

1. **Edit code** → save → VS Code formats via Biome (if extension installed)
2. **Stage files** → `git add`
3. **Commit** → Lefthook pre-commit triggers → Biome auto-fixes staged files → commit proceeds or blocks on errors
4. **Push** → Lefthook pre-push triggers → Biome validates pushed files → push proceeds or blocks on errors
5. **CI** → `biome ci` runs on the full codebase → PR is blocked if any warnings+ exist

## Component Structure

Not applicable — this is a configuration-only change with no UI components.

## Visual Design

Not applicable — this is a developer tooling change.

## Assets Needed

None.

## Implementation Notes

- The exact Biome version used is `1.9.4` (latest stable as of design time). The `^` prefix allows minor/patch updates.
- `npx --no-install` is used in Lefthook commands to ensure the project's local Biome is used, not a globally cached one. This guarantees consistent behavior across machines.
- The `--no-errors-on-unmatched` flag prevents Biome from erroring when no files match the glob (e.g., empty commit with no JS/TS files).
- After running `npx lefthook install`, the hooks are registered in `.git/hooks/`. Running it again after updates to `lefthook.yml` will re-sync.
- The `--staged` flag in `biome lint --staged` (in the `lint:staged` npm script) tells Biome to only check files that are staged in git, using Biome's own git integration rather than Lefthook's file passing.

### Post-Implementation Checklist

- [ ] `@biomejs/biome` installed as devDependency
- [ ] `@evilmartians/lefthook` installed as devDependency
- [ ] `biome.json` created at project root
- [ ] `lefthook.yml` created at project root
- [ ] `package.json` scripts added
- [ ] `Makefile` targets added
- [ ] `npx lefthook install` executed
- [ ] `.vscode/settings.json` created
- [ ] `.vscode/extensions.json` updated with Biome recommendation
- [ ] `npm run ci:check` passes (or known issues documented)
