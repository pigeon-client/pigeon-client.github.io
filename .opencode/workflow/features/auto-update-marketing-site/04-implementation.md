# Implementation: Auto-Update + Marketing Site

## Files Changed

### Phase 1 - Updater Plugins

- **`src-tauri/Cargo.toml`**: Added `tauri-plugin-updater = "2"` and `tauri-plugin-process = "2"`
- **`src-tauri/src/lib.rs`**: Registered both plugins via `.plugin(tauri_plugin_updater::Builder::new().build())` and `.plugin(tauri_plugin_process::init())`
- **`src-tauri/capabilities/default.json`**: Added `"updater:default"` and `"process:allow-restart"` permissions
- **`src-tauri/tauri.conf.json`**: Added `createUpdaterArtifacts: true` and `plugins.updater` config section
- **`package.json`**: Installed `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` npm packages; added `version:bump` script
- **`src/lib/updater.ts`**: New file - wraps `check()` from `@tauri-apps/plugin-updater` with a confirm dialog and `relaunch()` on completion
- **`src/App.tsx`**: Imports and calls `checkForUpdates(true)` silently on app startup
- **`scripts/version-bump.js`**: New file - Node.js script to atomically bump version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`

### Phase 2 - Release Workflow

- **`.github/workflows/release.yml`**: New file - builds Tauri app on push of `v*` tags, for four platforms: macOS x86_64 (`macos-latest`), macOS ARM64 (`macos-14`), Ubuntu 22.04, and Windows x86_64. Uploads artifacts to GitHub Release.

### Phase 3 - Marketing Site

- **`site/`**: New directory - standalone Vite + React + TypeScript app
  - `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
  - `src/main.tsx`, `src/App.tsx`, `src/App.css`
  - `src/components/Header.tsx`, `HeroSection.tsx`, `FeaturesSection.tsx`, `DownloadSection.tsx`, `PlatformCard.tsx`, `Footer.tsx`
  - `src/lib/github.ts` - OS detection and release parsing
  - `src/types/release.ts` - TypeScript interfaces
  - `src/release.json` - Placeholder; replaced at build time by deploy workflow
  - `public/favicon.svg`
- **`.github/workflows/deploy-site.yml`**: New file - fetches GitHub release at BUILD TIME (not runtime), writes to `src/release.json`, builds and deploys to GitHub Pages

## Code Summary

**Updater plugin registration** follows the existing pattern established by `tauri-plugin-opener`. The updater uses a `Builder` pattern:
```rust
.plugin(tauri_plugin_updater::Builder::new().build())
.plugin(tauri_plugin_process::init())
```

**Marketing site** uses plain CSS with CSS variables (no Tailwind), Inter + JetBrains Mono fonts, and imports pre-fetched release data at build time via Vite's JSON import. OS detection uses `navigator.platform` with `navigator.userAgent` fallback for ARM64 detection.

## API Changes

None - this is a client-side feature with no new API endpoints.

## New Components

- `src/lib/updater.ts` - Update check and install logic
- `scripts/version-bump.js` - Version synchronization utility
- `site/` - Entire marketing site application
  - `Header` - GitHub link + version badge
  - `HeroSection` - Title + primary CTA
  - `FeaturesSection` - 3-column feature cards
  - `DownloadSection` - OS-aware download with manual selector
  - `PlatformCard` - Individual platform button
  - `Footer` - GitHub link + tech badge

## Testing Commands

```bash
# Install updated dependencies
npm install

# Bump version across all files (replace x.y.z with actual version)
npm run version:bump -- x.y.z

# Test site locally (requires Node.js in site dir)
cd site && npm install && npm run dev

# Build site locally
cd site && npm run build
```

## Manual Setup Required

### 1. Generate Signing Keypair

The updater requires a signing keypair for security. Generate it with:

```bash
npm run tauri signer generate -- -w ~/.tauri/app.key
```

This creates:
- Private key at `~/.tauri/app.key` (NEVER commit this)
- Public key output to console

### 2. Configure tauri.conf.json

Replace `PLACEHOLDER_PUBLICATION_KEY` in `src-tauri/tauri.conf.json` with the public key from step 1.

### 3. Add GitHub Secrets

In your GitHub repository Settings → Secrets, add:
- `TAURI_SIGNING_PRIVATE_KEY` - the full private key text from `~/.tauri/app.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - the password you used when generating

### 4. Enable GitHub Pages

In repository Settings → Pages → Source: select **GitHub Actions**

### 5. Publish a Release

```bash
# After code changes:
git add . && git commit -m "feat: auto-update and marketing site"
git push

# Bump version:
npm run version:bump -- 0.2.0

# Commit and tag:
git add . && git commit -m "v0.2.0"
git tag v0.2.0
git push origin v0.2.0
```

## EM Critical Fixes Applied

1. **Marketing site fetch at build time**: `deploy-site.yml` fetches `https://api.github.com/repos/k1n1/pigeon/releases/latest` and writes to `src/release.json` before `npm run build`. No runtime API calls.
2. **macOS ARM64 uses `macos-14`**: `release.yml` matrix uses `macos-14` (ARM64 runner) for `aarch64-apple-darwin` builds, `macos-latest` (Intel) for x86_64 builds.
3. **`npm run version:bump` script**: Updates all three files atomically with validation.

## Notes

- The `pubkey` in `tauri.conf.json` is a placeholder. The real key is generated via `tauri signer generate` and must be configured manually.
- The updater endpoint references the `latest.json` artifact - Tauri generates this when `createUpdaterArtifacts: true` is set and signing is configured.
- macOS and Windows code signing are not yet implemented (identified as known limitations in requirements).
- The marketing site does not make any runtime GitHub API calls, avoiding rate limiting entirely.