# Release

This is the human-facing companion to `CLAUDE.md`'s CI/CD section — read that first for how
`version-bump.yml` → `release.yml` → `deploy-site.yml` chain together. This doc covers the parts
that need a person: code signing, notarization, proving auto-update, and the Homebrew cask.

## Current state (as of this doc, 2026-07-26) — **not yet notarized**

Checked `apps/desktop/src-tauri/tauri.conf.json` and `.github/workflows/release.yml` directly:

- `bundle.macOS.signingIdentity` is `"-"` — **ad-hoc signing**, not a real Apple Developer ID. This
  is enough for the app to run on the machine that built it, but a `.dmg` distributed to other
  people fails Gatekeeper ("Apple could not verify this app is free of malware").
- There is **no notarization step** anywhere in `release.yml` (no `xcrun notarytool`, no
  `APPLE_ID` / `APPLE_TEAM_ID` / `APPLE_PASSWORD` secrets referenced).
- `release.yml`'s own release-note template already documents the workaround for this
  (`xattr -cr /Applications/Pigeon.app`), and `scripts/install.sh` runs that command
  automatically after installing. **This is a known, intentional trade-off today, not a bug** —
  but it is the exact "unsigned .dmg dies at Gatekeeper" launch blocker called out in the launch
  plan, and per that plan it should be closed before a public v1.0 push.
- `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` — already configured — is the **updater manifest
  signature** (a minisign keypair, pubkey embedded in `tauri.conf.json`'s `plugins.updater.pubkey`).
  This is a *different* key from Apple code signing and is unrelated to Gatekeeper; don't confuse
  the two when reading the workflow.

### What's required to close this (needs a human — cannot be done in an agent sandbox)

Real Apple code signing + notarization needs an **Apple Developer Program membership** ($99/year,
tied to a real Apple ID) and a certificate that only that account can generate. Steps:

1. Enroll at [developer.apple.com](https://developer.apple.com/programs/) if not already.
2. In Xcode or the developer portal, create a **Developer ID Application** certificate. Export it
   from Keychain Access as a `.p12` file with a password.
3. Base64-encode the `.p12` and add these **repo secrets** (Settings → Secrets and variables →
   Actions):
   - `APPLE_CERTIFICATE` — `base64 -i cert.p12 | pbcopy`, paste the result.
   - `APPLE_CERTIFICATE_PASSWORD` — the password used when exporting.
   - `APPLE_SIGNING_IDENTITY` — the cert's common name, e.g. `Developer ID Application: Your Name (TEAMID)`.
   - `APPLE_ID` — the Apple ID email tied to the account.
   - `APPLE_PASSWORD` — an **app-specific password** for that Apple ID (generate at
     [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords),
     **not** the account password.
   - `APPLE_TEAM_ID` — found in the developer portal's membership page.
4. `tauri-action` (already used in `release.yml`) picks up all six of those env vars automatically
   and runs signing + `notarytool` submission + stapling as part of `tauri build` — **no workflow
   YAML changes needed**, just add the six secrets and pass them through as `env:` on the existing
   `Build Tauri app` step (mirror how `TAURI_SIGNING_PRIVATE_KEY` is already passed).
5. Update `tauri.conf.json`'s `bundle.macOS.signingIdentity` from `"-"` to the real identity string
   (or drop the key — `tauri-action` will use `APPLE_SIGNING_IDENTITY` either way, but keeping
   `tauri.conf.json` in sync avoids confusion for local `pnpm tauri build` runs).
6. Cut a release and confirm: download the `.dmg` on a **different** Mac than the one that built
   it, open it, and confirm **no** Gatekeeper warning appears (no `xattr -cr` needed anymore). Then
   remove the `xattr -cr` workaround from `release.yml`'s release-note template and
   `scripts/install.sh`.

## Auto-update — how it's wired, and what's unverified

**Wiring (verified by reading the code, not by running it):**

- `tauri.conf.json` → `plugins.updater.endpoints` points at
  `https://github.com/pigeon-client/pigeon-client.github.io/releases/latest/download/latest.json`
  — the **site repo's** releases, not the app repo's. `deploy-site.yml` is what publishes that
  `latest.json` (fetched from the app repo's GitHub API at build time — see `CLAUDE.md`).
- `src/features/settings/lib/updater.ts` (`checkForUpdates`, `checkUpdateVersion`,
  `installUpdate`) wraps `@tauri-apps/plugin-updater`. `AppContent.tsx` runs a silent
  `checkForUpdates(true)` on startup; `SettingsDrawer.tsx`'s About tab has the manual
  Check/Install UI and the gear-icon badge.
- The updater manifest is signed with the minisign keypair above
  (`TAURI_SIGNING_PRIVATE_KEY` / pubkey in `tauri.conf.json`) — a tampered `latest.json` pointing
  at a malicious binary would fail signature verification client-side.

**Not verified in this pass** — proving this end-to-end requires building and installing two real
signed versions, which needs the Apple signing secrets above (or at minimum a self-consistent
ad-hoc-signed pair, since the updater signature is independent of Apple notarization) plus a real
macOS machine to install/launch on. Procedure for whoever runs this:

1. Set `.version.json` to `0.9.9-test` (or bump the patch and tag manually:
   `git tag v0.9.9-test && git push origin v0.9.9-test`), let `release.yml` build and publish it,
   install the resulting `.dmg`.
2. Bump to `1.0.0-test`, tag, push — let it build and publish, and let `deploy-site.yml` refresh
   `latest.json` on the site repo (it's dispatched automatically by `release.yml`'s
   `publish-release` job).
3. Launch the `0.9.9-test` install. Confirm: the gear icon in Settings shows the update-available
   dot, `SettingsDrawer`'s About tab shows "v1.0.0-test available", and `UpdateToast` appears.
4. Click Install; confirm the app relaunches as `1.0.0-test`.
5. Delete both test tags/releases afterward so they don't linger as confusing real-looking
   versions in the release history.

## Homebrew cask

`Casks/pigeon.rb` is a template — **not yet installable**, because it needs real published
release artifacts to compute checksums against, and it isn't in a real tap repo yet:

```ruby
cask "pigeon" do
  arch arm: "aarch64", intel: "x64"
  version "0.1.9"
  sha256 arm:   "…", intel: "…"   # placeholders — see below
  url "https://github.com/pigeon-client/pigeon/releases/download/v#{version}/Pigeon_#{version}_#{arch}.dmg"
  ...
end
```

To make it real, once a signed `.dmg` is published for a version:

1. Download both `.dmg`s from the release and compute checksums:
   `shasum -a 256 Pigeon_<version>_aarch64.dmg` and `..._x64.dmg`.
2. Paste those into `Casks/pigeon.rb`'s `sha256 arm: / intel:` and bump `version` to match.
3. Homebrew casks are installed from a **tap** — either submit to `homebrew/homebrew-cask`
   (has its own review/eligibility bar) or create `pigeon-client/homebrew-pigeon` (a repo named
   exactly `homebrew-<tapname>`) and move `Casks/pigeon.rb` there.
4. `brew audit --cask pigeon` and `brew install --cask pigeon-client/pigeon` (or
   `brew tap pigeon-client/pigeon && brew install --cask pigeon`) to verify — **not run in this
   session**, no real release/tap exists yet to test against.
5. Update the README's Install section with the tap instructions (done — see below) once the tap
   is real.

## Release checklist

1. **Version bump locations** (all synced automatically by `version-bump.yml` on merge to `main`,
   from `.version.json`): `apps/desktop/package.json`, `apps/desktop/src-tauri/tauri.conf.json`,
   `apps/desktop/src-tauri/Cargo.toml`. Manual minor/major bump: edit `.version.json` directly.
2. **Changelog**: `generate_release_notes: true` in `release.yml` auto-generates it from merged
   PRs/commits; the hardcoded `body:` block (install instructions) is prepended via `append_body`.
3. **Tag format**: `v<major>.<minor>.<patch>` (e.g. `v0.1.10`), pushed automatically by
   `version-bump.yml` using `RELEASE_TOKEN`, or manually with `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. **Artifact names**: `Pigeon_<version>_aarch64.dmg` / `Pigeon_<version>_x64.dmg` (macOS),
   `.exe` (Windows NSIS), `.AppImage` + `.deb` (Linux) — see `scripts/install.sh` for the exact
   macOS naming this depends on.
5. **Manifest update**: automatic — `release.yml`'s `publish-release` job dispatches
   `deploy-site.yml` on `main`, which re-fetches the latest release JSON into
   `apps/site/src/release.json` and rebuilds the site (this is also what refreshes `latest.json`
   for the updater and the site's download buttons).
6. **Cask sha update**: manual, per the Homebrew section above — only relevant once the tap exists.
7. **Required secrets** for a from-scratch fork/setup: `RELEASE_TOKEN` (fine-grained PAT,
   `contents: write` — required because tag pushes with the default `GITHUB_TOKEN` don't trigger
   downstream workflows), `TAURI_SIGNING_PRIVATE_KEY` + `_PASSWORD` (updater manifest signing —
   already set up), and the six `APPLE_*` secrets above (**not yet set up** — see the notarization
   section).
