# CI & deploy (GitHub Actions)

Companion to [release.md](./release.md). Workflows live in `.github/workflows/` (YAML only — no
README there).

## Marketing site — `deploy-site.yml`

Deploys **https://trypigeon.dev**:

1. Triggers on push to `main` when `apps/site/**`, shared packages, or `scripts/install.sh` change.
2. Also runs via `workflow_dispatch`, or when `release.yml` dispatches it after a new release.
3. Fetches latest GitHub Release JSON into `apps/site/src/release.json` (build-time only).
4. Builds Astro → `apps/site/dist/`.
5. Creates R2 bucket `trypigeon-site` if it does not exist (`wrangler r2 bucket create`).
6. Uploads every file in `dist/` to R2 (`apps/site/scripts/sync-r2.mjs`).
7. Deploys Worker `trypigeon` (`wrangler deploy`) — **creates the Worker on first run**.

### Required repository secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler auth — Account → Workers R2 Storage → Edit and Workers Scripts → Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

Create the API token in Cloudflare → **My Profile → API Tokens → Create Token**. Use the
**Edit Cloudflare Workers** template (include R2), or a custom token with:

- Account / Workers R2 Storage / Edit
- Account / Workers Scripts / Edit
- Account / Account Settings / Read

### Public endpoints (trypigeon.dev)

| URL | Purpose |
|-----|---------|
| `https://trypigeon.dev/latest.json` | Desktop app auto-update check (Tauri updater) |
| `https://trypigeon.dev/release.json` | Latest release metadata (version + asset list) |
| `https://trypigeon.dev/download/latest/aarch64` | Latest Apple Silicon `.dmg` (302 → GitHub asset) |
| `https://trypigeon.dev/download/latest/x64` | Latest Intel `.dmg` (302 → GitHub asset) |
| `https://trypigeon.dev/install.sh` | One-line macOS installer script |

`deploy-site.yml` refreshes `release.json` and `latest.json` after every site deploy and when
dispatched by `release.yml`.

1. Attach custom domain **trypigeon.dev** in Cloudflare → Workers → `trypigeon` → Custom Domains.
2. First successful `deploy-site.yml` run creates the R2 bucket and Worker if missing.
3. Disable **Auto Minify** (HTML/JS/CSS) for the zone if React islands show hydration warnings.

### Local deploy

```bash
pnpm --filter pigeon-site exec wrangler login   # once
pnpm deploy:site                                 # build → R2 sync → worker deploy
```

---

## Desktop release — `release.yml`

On `v*` tag push:

1. Creates a draft GitHub Release.
2. Builds **macOS only** today (Apple Silicon + Intel `.dmg`). Windows/Linux matrix rows are
   commented out until those platforms are ready.
3. Publishes the release, then dispatches `deploy-site.yml` on `main` to refresh download links.

Signing / notarization details: [release.md](./release.md).

---

## Other workflows

| Workflow | Role |
|----------|------|
| `e2e.yml` | Vitest + Playwright on push/PR (ignores `**.md`, `apps/site/**`) |
| `ci.yml` | Lint / typecheck / format gate |
| `version-bump.yml` | Version bump automation |
