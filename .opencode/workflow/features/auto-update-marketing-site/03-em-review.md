# EM Review: GitHub Releases Auto-Update + GitHub Pages Marketing Site

## Feasibility Assessment

- [x] **Phase 1: Updater Plugin Setup** - APPROVED (with minor concerns)
- [x] **Phase 2: GitHub Actions Release Workflow** - APPROVED (with minor concerns)
- [x] **Phase 3: Marketing Site** - APPROVED (with mitigations required)

---

## Phase 1: Updater Plugin Setup

### Feasibility: ✅ APPROVED

**Dependencies Check:**
| Dependency | Status | Notes |
|------------|--------|-------|
| `tauri-plugin-updater` | ✅ Available | crates.io package exists for Tauri v2 |
| `tauri-plugin-process` | ✅ Available | crates.io package exists for Tauri v2 |
| `@tauri-apps/plugin-updater` | ✅ Available | npm package exists, matches v2 API |
| `@tauri-apps/plugin-process` | ✅ Available | npm package exists, matches v2 API |

**Implementation Path:**
- Rust: Add to `Cargo.toml`, register via `.plugin(tauri_plugin_updater::init())` and `.plugin(tauri_plugin_process::init())` in `lib.rs`
- Frontend: Add npm packages, import `checkUpdate()` and `relaunch()`
- Capabilities: Add `"updater:default"` and `"process:default"` to `capabilities/default.json`
- Config: Add `"updater"` section to `tauri.conf.json` with pubkey and endpoint

**Existing Pattern Verified:**
The project already uses `tauri-plugin-opener` with the exact same pattern that will be used for updater plugins (`.plugin(tauri_plugin_opener::init())` in lib.rs). This is a proven pattern.

**Signing Key:**
- `tauri signer generate` produces Ed25519 keypair ✅
- GitHub Secrets integration is standard practice ✅

### Phase 1 Concerns

1. **Signing key rotation**: No automated rotation exists. If the key is compromised, the updater trust chain is broken. Recommendation: Document key rotation process and consider a calendar reminder for periodic rotation (every 6-12 months).

2. **Updater endpoint validation**: The requirements specify `https://api.github.com/repos/<owner>/<repo>/releases/latest`. The Tauri updater plugin expects a specific JSON format. Need to verify the GitHub Releases API response format matches what the plugin expects. **Action item**: Test the endpoint response during first implementation.

---

## Phase 2: GitHub Actions Release Workflow

### Feasibility: ✅ APPROVED

**Matrix Build Analysis:**

| Runner | Target | Status | Notes |
|--------|--------|--------|-------|
| `macos-latest` | macOS x86_64 | ✅ | Standard build |
| `macos-latest` | macOS ARM64 | ⚠️ | Requires cross-compilation or dedicated ARM64 runner |
| `ubuntu-22.04` | Linux x86_64 | ✅ | Standard build, needs system deps |
| `windows-latest` | Windows x86_64 | ✅ | Standard build |

**macOS ARM64 Build Complexity:**
The current `macos-latest` runner is Intel-based. Building ARM64 binaries requires:
- Option A: Cross-compilation with `aarch64-apple-darwin` target (requires Xcode toolchain support)
- Option B: Use `macos-14` runner (ARM64 GitHub-hosted runner) for ARM64 builds
- Recommendation: Use separate matrix entries with appropriate runners per architecture

**Workflow Structure Verified:**
- `.github/workflows/release.yml` does not exist yet - safe to create
- Tag trigger `push` with pattern `v*` is standard GitHub Actions syntax ✅
- Artifact upload via `softprops/action-gh-release` or GitHub's native upload is well-documented ✅

**Signing Integration:**
- Tauri v2 signing via `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets is the documented approach ✅
- The `tauri build` command automatically picks up signing config from `tauri.conf.json` when env vars are set ✅

### Phase 2 Concerns

1. **macOS Code Signing Missing**: The design document acknowledges this as a known limitation. Without Apple Developer ID signing, macOS users will see "unidentified developer" warnings. This is acceptable but should be documented prominently.

2. **Windows SmartScreen**: Similarly, without EV code signing, Windows SmartScreen warnings will appear. Acceptable for v1 but should be tracked as a future enhancement.

3. **Build idempotency**: Re-running the same tag workflow should not create duplicate releases. Need to ensure `softprops/action-gh-release` with `generate_release_notes: true` handles this correctly, or use `create-if-not-exists` logic.

4. **Version bumping fragmentation**: Three files need version updates:
   - `src-tauri/tauri.conf.json` (version)
   - `package.json` (version)
   - `src-tauri/Cargo.toml` (package.version)
   
   **Recommendation**: Create a `npm run version:bump` script that updates all three before tagging.

---

## Phase 3: Marketing Site on GitHub Pages

### Feasibility: ✅ APPROVED (with mitigations)

**Tech Stack Verified:**
- Vite + React + TypeScript in `/site` is straightforward ✅
- GitHub Pages deployment via `actions/deploy-pages` is the modern recommended approach ✅
- No routing needed (single-page) - simplifies implementation ✅

**GitHub API Rate Limiting Mitigation:**
The unauthenticated GitHub API has a 60 requests/hour limit per IP. For a marketing site, this is a real risk.

**Mitigations Required:**
1. **Caching in localStorage**: Cache the API response with a TTL (recommend 1 hour minimum)
2. **Fallback to embedded data**: Consider embedding release data at build time in the site, refreshed on each deploy
3. **Build-time fetch**: In the deploy workflow, fetch latest release and write to a JSON file that's baked into the site at build time

**Recommended approach for rate limiting:**
```yaml
# In deploy-site.yml, before build:
- name: Fetch latest release data
  run: |
    curl -s https://api.github.com/repos/<owner>/<repo>/releases/latest > src/lib/release.json
```

This way the site doesn't make API calls at runtime.

### Phase 3 Concerns

1. **Rate limiting at runtime**: Direct client-side API calls risk rate limiting. **Required fix**: Use build-time data fetching as described above.

2. **OS detection reliability**: `navigator.platform` is deprecated but still functional. Consider also checking `navigator.userAgent` as a fallback. The design should handle "unknown" OS gracefully.

3. **Asset naming convention**: The marketing site logic maps OS to asset filenames (e.g., `pigeon_1.2.3_aarch64.dmg`). This naming must match exactly what the release workflow produces. **Recommendation**: Document the naming convention and add a CI check that verifies release assets follow the convention.

4. **Custom domain considerations**: The design mentions custom domain support is optional. If added later, need to update DNS and GitHub Pages settings.

---

## Technical Recommendations

### Must Fix Before Development

1. **Phase 3 - GitHub API Rate Limiting**: Change the design to fetch release data at build time instead of runtime. Update `02-design.md` to reflect this.

2. **Phase 2 - macOS ARM64 build matrix**: Clarify that `macos-14` runner (ARM64) will be used for ARM64 builds separate from `macos-latest` (Intel) for x86_64 builds.

### Should Fix Before Development

3. **Version bumping script**: Create `npm run version:bump` script to update all three version files atomically.

4. **Asset naming documentation**: Explicitly document the release asset naming convention in `02-design.md` and add validation in the release workflow.

### Nice to Have (Post-MVP)

5. **Signing key rotation script**: Document the process for rotating the Ed25519 signing key.

6. **Apple Developer ID / Windows EV signing**: Track as future enhancement milestones.

---

## Missing Information

1. **GitHub repository owner/name**: The `endpoint` in `tauri.conf.json` and the GitHub Actions workflows need the actual `<owner>/<repo>` values. These can be derived from the git remote, but should be explicitly documented.

2. **Release asset naming confirmation**: Need to confirm the exact asset naming pattern that Tauri produces for each platform. Should be verified during first test build.

3. **Linux package formats**: The design mentions `.deb` + `.AppImage` for Linux. Need to confirm this is what's actually produced by `npm run tauri build` on Linux.

---

## Decision

**[x] APPROVED - pass to development**

All three phases are technically feasible with the noted concerns and mitigations. The project uses Tauri v2 with the correct plugin patterns already established in the codebase. The GitHub Actions workflow follows standard practices. The marketing site's rate limiting concern can be mitigated with build-time data fetching.

**Key conditions for approval:**
1. Phase 3 must implement build-time release data fetching (not runtime API calls)
2. macOS ARM64 build must use appropriate ARM64 runner (`macos-14`)
3. Version bumping must be consolidated into a single script

**Recommended next steps:**
1. PM reviews and approves the Phase 2/3 clarifications
2. Dev team creates `npm run version:bump` script
3. Dev team sets up signing keys in development environment
4. Dev team implements Phase 1 (updater plugins) first as the foundation