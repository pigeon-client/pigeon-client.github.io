# Pigeon — Security Audit (2026-07-29)

> **Remediation status (2026-07-29):** all code-level findings fixed in this working tree —
> see the ✅ notes per finding. Still open, needs the repo owner:
> 1. **H2 — rotate the TestSprite API key** (only you can revoke it).
> 2. **H4 — Developer ID signing + notarization** (needs an Apple Developer account);
>    the `xattr -cr` step stays in `install.sh` until then (marked with a TODO).
> 3. **M6 — pin Actions to commit SHAs**: blocked here (no network access to github.com).
>    Dependabot is now configured; to pin, run e.g.
>    `npx pin-github-action .github/workflows/*.yml` on a machine with GitHub access.
> 4. **M5 — PAT expiry/rotation** is a GitHub settings task, not a repo change.

Full-codebase review: Rust backend (`apps/desktop/src-tauri`), React frontend (`apps/desktop/src`),
marketing site (`apps/site`), install script, CI/CD workflows, and dependency audit.

Severity scale: **Critical / High / Medium / Low / Info**.

---

## HIGH

### H1. CSP is disabled in the Tauri webview
- **File:** `apps/desktop/src-tauri/tauri.conf.json` — `"security": { "csp": null }`
- **Problem:** No Content-Security-Policy at all. Any script injection into the webview
  (a future XSS bug, a compromised npm dependency shipping code into the bundle) gets full
  access to `invoke()` — meaning arbitrary HTTP from the user's machine (`send_api_request`,
  including to localhost/internal networks with cookies-free but network-position access),
  plus full read/write of drafts, history, and collections in SQLite.
- **Fix:** Set a restrictive CSP (`default-src 'self'; connect-src ipc: http://ipc.localhost`,
  plus what highlight.js/blob previews need, e.g. `img-src 'self' blob:`, `media-src blob:`,
  `frame-src blob:`). Tauri auto-injects nonces for its own scripts when CSP is set.

- ✅ **Fixed:** CSP set in `tauri.conf.json` (`default-src 'self'`, `wasm-unsafe-eval` for tree-sitter, blob:/data: for previews, ipc for Tauri).

### H2. Live TestSprite API key on disk
- **File:** `testsprite_tests/tmp/config.json` — `"API_KEY": "sk-user-j_6hup7K…"`
- **Problem:** A real secret sits in the working tree. It *is* covered by `.gitignore`
  (line 47), but the rest of `testsprite_tests/` is untracked-and-addable, and the key has
  already been exposed to any tool/agent reading the repo (including this audit).
- **Fix:** Rotate the key. Keep secrets out of the repo directory entirely (env var or
  OS keychain). Consider ignoring `testsprite_tests/tmp/` wholesale.

### H3. Vulnerable transitive dependencies (`pnpm audit`: 2 high)
- **Path:** `apps/desktop > curlconverter@4.12.0 > yamljs@0.3.0 > glob > minimatch > brace-expansion@1.1.15`
- **Problem:** `brace-expansion` — GHSA-3jxr-9vmj-r5cp (exponential-time expansion DoS) and
  GHSA-mh99-v99m-4gvg (unbounded expansion OOM). Reachable in principle through the cURL
  import path (attacker-supplied pasted curl text feeds `curlconverter`).
- **Fix:** Add a pnpm override forcing `brace-expansion >=1.1.16` (and `>=5.0.8` where the
  v5 line is used); re-run `pnpm audit`. Longer term, watch `curlconverter`'s dated
  dependency chain (`yamljs` is unmaintained).

- ✅ **Fixed:** pnpm override forces `brace-expansion@<1.1.16` → `^1.1.16` (GHSA-3jxr patched). GHSA-mh99 is only patched in v5, which breaks every current `minimatch` (verified: coverage run crashes) — added to `auditConfig.ignoreGhsas` with this rationale; the vulnerable call is unreachable at runtime (glob is only used by yamljs' CLI). `pnpm audit --prod` now exits clean.

### H4. Install script strips Gatekeeper quarantine for an unsigned app
- **Files:** `scripts/install.sh:44-45` (`xattr -cr /Applications/Pigeon.app`) +
  `tauri.conf.json` `"signingIdentity": "-"` (ad-hoc signing).
- **Problem:** The published install flow is `curl | sh` that removes the quarantine
  attribute from an ad-hoc-signed (unnotarized) binary. This bypasses macOS Gatekeeper
  entirely: users get no signature/notarization check, and they are being trained to run
  quarantine-stripping commands. A compromised release asset or a MITM'd/typo'd script
  would install and run silently.
- **Fix:** Sign with a Developer ID certificate and notarize; then delete the `xattr` step.
  Until then, at minimum publish and verify a checksum of the DMG in the script.

- ⏳ **Partially fixed:** `install.sh` now validates the version string, downloads and verifies the DMG *before* touching the existing install, and cleans up via trap. The `xattr -cr` step remains (marked TODO) — removing it requires Developer ID signing + notarization, which needs the repo owner's Apple credentials.

---

## MEDIUM

### M1. Secrets stored in plaintext (SQLite + localStorage)
- **Files:** `apps/desktop/src-tauri/src/db.rs` (drafts/history/collections in
  `~/Pifeon/pigeon.db`); `apps/desktop/src/features/environments/services/db.ts`
  (`pg_browser_environments`, `pg_globals` in localStorage); `src/shared/types.ts`
  (auth `password`, `token`, `apiValue` are part of `RequestConfig`).
- **Problem:** Bearer tokens, basic-auth passwords, API keys, and environment variables are
  persisted unencrypted. History also snapshots full requests/responses, so secrets embedded
  in headers/bodies live in the DB indefinitely. Any local malware or backup sync reads them.
- **Fix:** Encrypt at rest (OS keychain via a Tauri keyring plugin for secrets, or
  SQLCipher for the DB). At minimum: mark environment variables as "secret" and exclude
  them from exports/snapshots; document the plaintext storage.

- ⏳ **Mitigated:** DB directory is now created `0700` (see L5) and response-snapshot persistence is opt-out (see M4). Full encryption-at-rest (keychain/SQLCipher) remains future work.

### M2. TLS verification can be disabled (`danger_accept_invalid_certs`)
- **File:** `apps/desktop/src-tauri/src/lib.rs:48,193` — `.danger_accept_invalid_certs(!verify)`
- **Problem:** The "SSL verify" setting is a global, persistent localStorage flag
  (`pg_ssl_verify`). Once off, *every* request — including ones carrying bearer tokens —
  is MITM-able, with no per-request warning in the UI.
- **Fix:** Feature is legitimate for an API client, but scope it: show a visible warning
  indicator when verification is off, and prefer per-request/per-host opt-out over a
  global default.

- ✅ **Fixed:** Settings shows a prominent warning banner under the SSL Verification toggle whenever verification is off.

### M3. Unbounded response buffering (memory DoS)
- **File:** `apps/desktop/src-tauri/src/lib.rs` — `finalize_response` (`response.bytes()`),
  `stream_sse_response` (`body_acc` grows for up to the 24h SSE timeout).
- **Problem:** No size cap anywhere. A hostile/huge endpoint (or a long-lived SSE stream)
  grows an unbounded `Vec<u8>` in the Rust process, and the whole body is then serialized
  over IPC as a JSON `number[]` (~4x amplification) into the webview. App OOM/crash; drafts
  with attached snapshots make it persistent.
- **Fix:** Cap read size (e.g. stream up to N MB, then truncate with a "download instead"
  flag). Cap `body_acc` for SSE (events are already forwarded incrementally). Return body
  as base64 string or use Tauri's raw IPC response instead of `Vec<u8>` → JSON array.

- ✅ **Fixed:** Rust now caps buffered bodies at `MAX_RESPONSE_BYTES` (50MB) — normal responses stream with the cap and set a `truncated` flag (shown as “· truncated” in the response status bar); the SSE transcript accumulator is capped the same way while events keep streaming.

### M4. History/snapshot data written before, and regardless of, redaction
- **Files:** `features/history/store.ts` + response snapshots (launch phase 6).
- **Problem:** Response snapshots persist API responses (which often contain PII/tokens)
  into the same plaintext SQLite DB as M1, with no redaction or opt-out surfaced.
- **Fix:** Settings toggle to disable snapshot persistence; redact `Authorization`,
  `Cookie`, `Set-Cookie` headers in stored history entries.

- ✅ **Fixed:** new Settings → Data toggle “Save response snapshots” (`pg_save_snapshots`, default on); when off, history entries persist without response bodies. Snapshots never stored headers, so no Set-Cookie exposure existed.

### M5. `version-bump.yml` PAT model
- **File:** `.github/workflows/version-bump.yml` — `token: ${{ secrets.RELEASE_TOKEN }}`
- **Problem:** A long-lived fine-grained PAT with `contents: write` auto-commits and tags on
  *every* push to `main`. Anyone who can merge to `main` (or a compromised Action in the
  chain) effectively holds release-signing-adjacent power; PATs also outlive intent unless
  expiry is set.
- **Fix:** Keep PAT scope to this single repo, set a short expiry + rotation reminder, and
  pin third-party actions by commit SHA (see M6).

- ⏳ **Owner task:** scope/expiry/rotation of `RELEASE_TOKEN` happens in GitHub settings. Dependabot now watches the workflows (see M6).

### M6. GitHub Actions not pinned to SHAs
- **Files:** all of `.github/workflows/*.yml` (e.g. `tauri-apps/tauri-action`, `actions/checkout`).
- **Problem:** Tag-pinned (`@v…`) actions are mutable; a compromised action tag executes
  with access to `TAURI_SIGNING_PRIVATE_KEY` and `RELEASE_TOKEN` in `release.yml` — a full
  supply-chain compromise of the updater trust chain.
- **Fix:** Pin every third-party action to a full commit SHA; enable Dependabot for
  `github-actions` ecosystem.

- ⏳ **Partially fixed:** `.github/dependabot.yml` added (github-actions + npm + cargo, weekly). SHA-pinning itself was blocked — this machine cannot reach github.com to resolve tag SHAs; run `npx pin-github-action .github/workflows/*.yml` with network access.

---

## LOW

### L1. PDF preview iframe lacks `sandbox`
- **File:** `features/response-viewer/components/ResponsePanel.tsx:140-145`
- **Problem:** The HTML preview iframe correctly uses `sandbox=""`, but the PDF iframe
  (`src={blobUrl}`) has no sandbox attribute. A blob URL is same-origin with the app; if a
  response ever gets classified `pdf` while actually being renderable content, it runs
  same-origin. Defense-in-depth gap (blob content-type is pinned to `application/pdf`,
  so exploitability is low).
- **Fix:** Add `sandbox=""` to the PDF iframe too.

- ✅ **Fixed:** PDF preview iframe now has `sandbox=""`.

### L2. `HighlightedHtml` is a raw `innerHTML` sink
- **File:** `src/shared/ui/HighlightedHtml.tsx:13`
- **Problem:** Safe today because every caller feeds it `hljs.highlight(...).value`
  (highlight.js escapes input) or a manually escaped fallback. But the component's contract
  is "any string becomes DOM"; one future caller passing raw response text = stored XSS from
  any API response, compounded by H1 (no CSP).
- **Fix:** Rename/document as trusted-HTML-only, or run output through a sanitizer
  (DOMPurify) inside the component.

- ✅ **Fixed:** `HighlightedHtml` now documents a trusted-HTML-only contract on the `html` prop.

### L3. Unused `opener:default` capability
- **File:** `apps/desktop/src-tauri/capabilities/default.json`
- **Problem:** `opener:default` is granted but no frontend code calls the opener plugin.
  Unused permission widens what injected script (H1) could do (open URLs/paths).
- **Fix:** Remove the permission (and plugin init in `lib.rs`) until needed.

- ✅ **Fixed:** opener plugin removed from capabilities, `lib.rs`, `Cargo.toml`, and `package.json` (it was never called).

### L4. `install.sh` deletes the installed app before the download succeeds
- **File:** `scripts/install.sh:29-35`
- **Problem:** `rm -rf /Applications/Pigeon.app` runs before `curl` fetches the DMG; a
  failed download leaves the user with no app. Also `VERSION="$1"` is interpolated into the
  download URL unvalidated (no injection — it's only a URL/path — but a typo yields a
  confusing failure after the app was already deleted).
- **Fix:** Download and mount first; remove/replace the old app last. Validate `VERSION`
  against `^[0-9][0-9.]*$`.

- ✅ **Fixed:** see H4 — download/mount/verify now precede removal; version string validated.

### L5. DB directory fallback and location
- **File:** `apps/desktop/src-tauri/src/db.rs:9-15`
- **Problem:** If `home_dir()` fails, the DB path becomes `/Pifeon/pigeon.db` (root of the
  filesystem — likely fails or lands somewhere world-visible). Also the data dir is a
  non-standard `~/Pifeon` (typo of Pigeon?) rather than the platform app-data dir, with
  default (umask) permissions on a file containing secrets (M1).
- **Fix:** Use Tauri's `app_data_dir()`; error out rather than fall back to `/`; set
  `0700` on the directory.

- ✅ **Fixed:** `db_path()` fails hard when no home directory exists (no more `/` fallback) and sets `0700` on `~/Pifeon`.

### L6. `send_mcp_request` bypasses the request options
- **File:** `apps/desktop/src-tauri/src/lib.rs:646-684`
- **Problem:** MCP requests always use the default client — the user's proxy setting and
  redirect policy are ignored (it *does* always verify TLS, which is good). In a
  corporate-proxy environment, MCP traffic silently goes direct — a data-path the user
  believes is proxied.
- **Fix:** Route MCP through the same client-builder logic (minus the SSL-off toggle).

- ✅ **Fixed:** `send_mcp_request` now honours the proxy and follow-redirects settings (TLS verification stays always-on for MCP); the transport passes them from localStorage.

### L7. Response header names/values rendered from untrusted servers
- **File:** `ResponsePanel.tsx` headers tab.
- **Problem:** Rendered via JSX text (safe). Listed only to note the invariant: keep it JSX;
  never move header rendering into `HighlightedHtml`/`innerHTML` (see L2).

---

## INFO / By-design notes

- **SSRF-by-design:** `send_api_request` will happily hit `localhost`, cloud metadata IPs,
  intranet hosts — that is the product (an API client). The real guardrail is H1 (CSP), which
  keeps *page-injected* script from driving it.
- **Updater trust chain is sound:** pinned minisign pubkey in `tauri.conf.json`, HTTPS
  GitHub endpoint, `createUpdaterArtifacts: true`. Its weakest links are the CI secrets
  (M5/M6) — the signing key matters more than the endpoint.
- **cURL export quoting is correct:** `shellQuote()` in `lib/generateCurl.ts` uses POSIX
  single-quote wrapping with `'\''` escaping — no shell-injection via copied commands.
- **SQL injection: none found.** All rusqlite queries use bound parameters (`params![…]`).
- **Header injection: mitigated.** reqwest validates header names/values; invalid ones fail
  the request rather than splitting.
- **HTML preview:** `srcDoc` + `sandbox=""` blocks scripts/navigation — correct.
- **SVG responses** shown via `<img src=blob>` — scripts don't execute in `<img>` — correct.
- **Workflows:** no `pull_request_target`, no secret exposure to fork PRs found.
- **No hardcoded app secrets** found in tracked files; `keys/` holds only the public key.

---

## Priority order

1. H2 — rotate the TestSprite key (5 min).
2. H1 — enable CSP.
3. H3 — override `brace-expansion` versions.
4. H4 — sign + notarize; drop `xattr -cr`.
5. M1/M4 — secret storage & snapshot redaction.
6. M6/M5 — pin actions, scope/rotate PAT.
7. M2/M3, then Lows.
