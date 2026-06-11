# Feature: GitHub Releases Auto-Update + GitHub Pages Marketing Site

## Overview

Enable automated release publishing and over-the-air updates for the Pigeon desktop app, and deploy a marketing site to GitHub Pages with always-current download links. This feature covers Tauri updater plugin integration, a GitHub Actions CI/CD pipeline that builds cross-platform installers on tag push, and a companion marketing site that dynamically links to the latest release assets.

## User Stories

- As a **user**, I want the app to automatically notify me when a new version is available and update itself so I always have the latest features and fixes.
- As a **user**, I want to visit a website to download Pigeon for my operating system without having to manually find the right release asset.
- As a **maintainer**, I want to publish a new release by pushing a single git tag so the entire build, sign, and upload process is fully automated.
- As a **maintainer**, I want the marketing site's download links to always point to the latest release without me having to edit any files.
- As a **developer contributor**, I want a reproducible release workflow that builds for Windows, macOS (arm64 + x86_64), and Linux from a single trigger.

---

## Phase 1: Updater Plugin Integration

### Functional Requirements

1. **Install Dependencies**
   - Add `tauri-plugin-updater` to Cargo.toml (Rust).
   - Add `tauri-plugin-process` to Cargo.toml (Rust) for app restart after update.
   - Install the corresponding npm packages: `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` in the frontend.

2. **Register Plugins in Rust (`src-tauri/src/lib.rs`)**
   - Register `.plugin(tauri_plugin_updater::init())` in the Tauri builder.
   - Register `.plugin(tauri_plugin_process::init())` in the Tauri builder.

3. **Capability Permissions**
   - Add `"updater:default"` to the capability permissions in `src-tauri/capabilities/default.json`.
   - Add `"process:default"` to the capability permissions in `src-tauri/capabilities/default.json`.

4. **Signing Keypair Generation**
   - Generate an Ed25519 signing keypair using `tauri signer generate`.
   - Store the private key securely — it will be used as a GitHub Actions secret (`TAURI_SIGNING_PRIVATE_KEY`).
   - Store the password as a GitHub Actions secret (`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).
   - Save the public key for configuration in `tauri.conf.json`.

5. **Configure `tauri.conf.json`**
   - Add the `"updater"` section under `"bundle"`:
     - `"active": true`
     - `"pubkey": "<the generated public key>"`
     - `"endpoint": "https://api.github.com/repos/<owner>/<repo>/releases/latest"`
   - Note: The endpoint URL must resolve to a JSON response containing the release assets.

6. **Frontend Update Logic (`src/lib/updater.ts`)**
   - Create a new file `src/lib/updater.ts`.
   - Export a function `checkForUpdates()` that:
     - Calls `checkUpdate()` from `@tauri-apps/plugin-updater`.
     - If an update is available, displays a notification/dialog to the user.
     - On user consent, downloads and installs the update.
     - On completion, restarts the app using `exit(0)` or `relaunch()` from `@tauri-apps/plugin-process`.

7. **Wire on Startup (`src/App.tsx`)**
   - Import and call `checkForUpdates()` on app mount (inside a `useEffect`).
   - Show a non-blocking UI indicator (e.g., a toast or status bar message) during the update check.
   - If an update is being downloaded, display progress.

### Non-Functional Requirements

- **Security**: The signing private key must never be committed to the repository; it must only exist as a GitHub Actions encrypted secret.
- **User Experience**: Update checks should be silent and non-blocking; the user should only be interrupted if an update is actually available.
- **Reliability**: The updater must handle network failures gracefully (timeout, no internet) without crashing the app.

---

## Phase 2: GitHub Actions Release Workflow

### Functional Requirements

1. **Repository Secrets**
   - Configure two secrets in the GitHub repository:
     - `TAURI_SIGNING_PRIVATE_KEY` — the Ed25519 private key for signing updater artifacts.
     - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password protecting the private key.

2. **Create Release Workflow (`.github/workflows/release.yml`)**
   - Trigger: `push` event matching tags `v*` (e.g., `v1.0.0`, `v1.2.3-beta.1`).
   - Build matrix for three OS targets:

     | Runner | Target | Notes |
     |--------|--------|-------|
     | `macos-latest` | macOS (x86_64) | Build for Intel Macs |
     | `macos-latest` | macOS (ARM64) | Universal binary or separate artifact for Apple Silicon |
     | `ubuntu-22.04` | Linux (x86_64) | `.deb` + `.AppImage` bundles |
     | `windows-latest` | Windows (x86_64) | `.msi` + `.exe` installers |

3. **Job Steps (per OS)**
   - Check out repository.
   - Set up Node.js (use version from `.node-version` or LTS).
   - Install npm dependencies (`npm ci` or `npm install`).
   - Install Rust toolchain via `actions-rust/setup-rust`.
   - Install Linux system dependencies: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, etc. (for Ubuntu).
   - Install `tauri-cli` via cargo or npm.
   - Build the Tauri application (`npm run tauri build`).
   - Upload build artifacts as release assets.

4. **Version Bumping**
   - Before tagging, the maintainer must bump the version in:
     - `src-tauri/tauri.conf.json` (top-level `"version"` field).
     - `package.json` (top-level `"version"` field).
     - `src-tauri/Cargo.toml` (`[package] version` field).
   - Create a git tag matching the new version (prefixed with `v`).
   - Push the tag to trigger the workflow.

5. **Release Artifacts**
   - Each workflow run should:
     - Create a GitHub Release (if one doesn't exist for the tag).
     - Upload all installer bundles as release assets.
     - Generate checksum files for each installer.
     - Ensure the release body includes auto-generated release notes.

### Non-Functional Requirements

- **Build Time**: The workflow should complete within 30 minutes across all matrix runners.
- **Reproducibility**: Builds must be deterministic for a given tag; use lockfiles (`Cargo.lock`, `package-lock.json`).
- **Idempotency**: Rerunning the workflow for the same tag should not create duplicate releases or assets.
- **Cross-Platform**: Each OS build must produce a fully functional, signed installer.

---

## Phase 3: Marketing Site on GitHub Pages

### Functional Requirements

1. **Site Structure (`/site` directory)**
   - Create a new directory `/site` at the project root.
   - Scaffold a Vite + React + TypeScript application inside `/site`.
   - Do NOT reuse the main app's `package.json` or Vite config — this is a standalone web project.

2. **Site Content**
   - A single-page marketing site with:
     - Project name, tagline, and brief description.
     - "Download for [Your OS]" button that auto-detects the user's operating system and links to the correct latest release asset from GitHub.
     - Manual download options: dropdown or separate buttons for Windows, macOS (ARM64), macOS (x86_64), and Linux.
     - Links to the GitHub repository, documentation, and issue tracker.
     - Version number display (fetched from latest release).
     - Screenshots or hero image of the app.

3. **Dynamic Download Logic**
   - Fetch the latest release from the GitHub API: `https://api.github.com/repos/<owner>/<repo>/releases/latest`.
   - Parse the response to find download URLs for each platform's bundle.
   - Map OS detection (`navigator.platform` or user-agent) to the correct asset.
   - Handle rate limiting gracefully (cache the API response for a reasonable period).

4. **Deploy Workflow (`.github/workflows/deploy-site.yml`)**
   - Trigger: `push` to `main` (or `master`) when files in `/site/**` change, OR manually via `workflow_dispatch`.
   - Steps:
     - Check out repository.
     - Set up Node.js.
     - Install dependencies for the site (`cd site && npm ci`).
     - Build the Vite site (`cd site && npm run build`).
     - Deploy to GitHub Pages using `actions/deploy-pages` or `peaceiris/actions-gh-pages`.
   - Must use the `actions/upload-pages-artifact` and `actions/deploy-pages` actions for the modern GitHub Pages deployment flow.

5. **GitHub Pages Configuration**
   - In the repository Settings > Pages, set the source to "GitHub Actions" (not a branch).
   - Custom domain support is optional but should be easy to configure later.

### Non-Functional Requirements

- **Performance**: The site must load in under 3 seconds on a typical broadband connection; bundle size should be kept minimal.
- **SEO**: Basic meta tags, Open Graph tags, and a descriptive `<title>` should be included.
- **Mobile Responsive**: The site must work on mobile viewports (320px+).
- **Accessibility**: Download buttons must have proper ARIA labels, keyboard navigation must work, and color contrast must meet WCAG AA standards.

---

## Dependencies & Prerequisites

1. **Tauri v2** — The project already uses Tauri v2 (`@tauri-apps/api` v2, `@tauri-apps/cli` v2). The updater plugin requires Tauri v2 (confirmed compatible).
2. **GitHub Repository** — The project must be hosted on GitHub. The remote origin URL will determine the `endpoint` and deployment targets.
3. **Signing Keypair** — Must be generated before the workflow can sign builds. The developer must run `tauri signer generate` locally.
4. **GitHub Secrets** — The signing key and password must be added as repository secrets before the workflow runs.
5. **GitHub Pages** — Must be enabled in the repository settings (set to GitHub Actions deployment).
6. **Rust Stable** — CI runners require the Rust stable toolchain and `cargo` to compile the Tauri backend.
7. **System Dependencies** — Linux builds require `webkit2gtk-4.1` and other system libraries; the workflow must install these.

---

## Risks & Concerns

1. **Signing Key Security**: The private key is the single point of failure for the updater trust chain. If leaked, anyone can push malicious updates. Mitigation: Use GitHub encrypted secrets, rotate keys periodically, and restrict repo access.
2. **GitHub API Rate Limiting**: The marketing site fetches latest release info from the unauthenticated GitHub API (60 requests/hour per IP). Mitigation: Cache responses in localStorage with a TTL, or use a GitHub token in the build step to pre-fetch and embed release data.
3. **GitHub Actions Runner Limitations**: Free-tier GitHub Actions has usage quotas. Cross-platform builds (4 matrix jobs) consume significant minutes. Mitigation: Use caching for Rust/Cargo dependencies and npm `node_modules`.
4. **macOS Code Signing**: The current plan does not include Apple Developer ID signing. Without it, macOS users will see "unidentified developer" warnings when installing. Mitigation: Document this as a known limitation for future enhancement; users can Ctrl+click to override.
5. **Windows Code Signing**: Similarly, Windows installers will show SmartScreen warnings without an EV certificate. Mitigation: Document as a known limitation.
6. **`.github` Directory Clash**: No `.github` directory currently exists. Creating one for workflows is safe, but ensure `.gitignore` does not exclude it.
7. **Updater Endpoint URL**: The GitHub API endpoint returns a paginated list of assets. The updater plugin needs to match assets by name/pattern. The configuration must reference the correct asset naming convention.
8. **Version Bumping Fragmentation**: Versions are tracked in `package.json`, `Cargo.toml`, and `tauri.conf.json`. Forgetting to bump one will cause mismatches. Mitigation: Consider adding a script (`npm run version:bump`) that updates all three files.
9. **Cross-Platform Build Failures**: Tauri builds have platform-specific quirks (e.g., Linux requires specific system packages, macOS requires Xcode tools). The CI matrix must be thoroughly tested.

---

## Acceptance Criteria

- [ ] Phase 1: `tauri-plugin-updater` and `tauri-plugin-process` are installed and registered in Rust with no compile errors.
- [ ] Phase 1: Capability permissions include `"updater:default"` and `"process:default"`.
- [ ] Phase 1: Signing keypair is generated; public key is configured in `tauri.conf.json`.
- [ ] Phase 1: `src/lib/updater.ts` exists with a working `checkForUpdates()` function.
- [ ] Phase 1: App startup triggers a non-blocking update check; update dialog appears when an update is available.
- [ ] Phase 2: `.github/workflows/release.yml` builds the app on all three OS targets when a `v*` tag is pushed.
- [ ] Phase 2: Release artifacts (installers) are uploaded to GitHub Releases with proper names and checksums.
- [ ] Phase 2: Build artifacts are signed using the stored private key.
- [ ] Phase 3: `/site` directory contains a working Vite + React + TypeScript marketing site.
- [ ] Phase 3: Download buttons auto-detect the user's OS and link to the correct latest release asset.
- [ ] Phase 3: Manual OS selector is available for users who want a different platform's installer.
- [ ] Phase 3: `.github/workflows/deploy-site.yml` deploys updates to GitHub Pages on pushes to `main`.
- [ ] Phase 3: GitHub Pages is configured with GitHub Actions as the deployment source.
- [ ] End-to-end: A tag push (`v0.2.0`) triggers a full build, creates a release with installers, and the marketing site shows the new version's download links within minutes.
- [ ] End-to-end: The updater in an existing app installation detects the new version when the user launches the app.
