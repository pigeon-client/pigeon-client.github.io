# Anonymous installation analytics

Best-effort, **anonymous** telemetry for the Pigeon desktop app. Tracks installations
and launches without accounts, emails, IPs, machine names, or request content.

## What is collected

| Field | Purpose |
|-------|---------|
| `install_id` | Cryptographically random UUID generated on first launch |
| `event` | `install` (once per local id) or `launch` |
| `version` | App version |
| `platform` | `macos` \| `windows` \| `linux` |
| `arch` | e.g. `aarch64`, `x86_64` |

**Not collected:** email, username, IP, MAC, hostname, hardware serials, API traffic,
file contents, or other PII. Cloudflare request metadata (including IP) is never written
to D1.

Call the headline metric **Total Installations**, not Total Users — uninstall/reinstall
that clears local app data may mint a new UUID.

## Architecture

```text
Desktop app (Tauri webview)
  → localStorage pg_install_id
  → POST /v1/events  (fire-and-forget)
       ↓
Cloudflare Worker (apps/analytics-worker)
       ↓
Cloudflare D1 (installations + events)
```

Client code: `apps/desktop/src/core/analytics/`  
Worker: `apps/analytics-worker/`

## Desktop client

On REST window startup (idle callback):

1. Skip unless `TAURI_ENV_PLATFORM` is set (desktop build) and an API URL resolves
   (`VITE_ANALYTICS_API_URL`, or production default `https://analytics.trypigeon.dev`).
2. Load `pg_install_id` from localStorage; if missing, generate `crypto.randomUUID()` and save.
3. If install was never acknowledged (`pg_analytics_install_acked`), POST `install` (idempotent).
4. POST `launch`.
5. Failures are logged with `console.warn` only — startup is never blocked.

Environment:

```bash
# Optional override / local Wrangler. Production defaults to analytics.trypigeon.dev.
VITE_ANALYTICS_API_URL=https://analytics.trypigeon.dev
# Disable: VITE_ANALYTICS_API_URL=
```

CSP `connect-src` allows `https://analytics.trypigeon.dev` and local Wrangler
(`http://127.0.0.1:8787`).

## Worker API

### `POST /v1/events`

```json
{
  "install_id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "install",
  "version": "1.0.0",
  "platform": "macos",
  "arch": "aarch64"
}
```

Validation: UUID, event allow-list, version shape, platform/arch allow-lists, max ~2KB body,
no unexpected keys. Rate-limited per `install_id` (soft, per isolate).

`install` upserts `installations` (`ON CONFLICT DO UPDATE`) then appends an `events` row.
Repeating the same install 10× still yields **one** installation row.

### `GET /v1/stats`

```json
{
  "total_installs": 12430,
  "active_installations": 8920,
  "installs_today": 184,
  "installs_this_month": 3200,
  "platforms": { "macos": 6200, "windows": 5800, "linux": 430 },
  "installs_by_day": [{ "date": "2026-08-23", "count": 40 }],
  "installs_by_version": { "0.1.18": 8000 },
  "installs_by_platform": { "macos": 6200 },
  "launches_by_day": [{ "date": "2026-08-23", "count": 1200 }]
}
```

**active_installations** = rows with `last_seen_at` within the last **30 days**.

Optional: set Worker secret `STATS_TOKEN` and call with `Authorization: Bearer <token>`.

### `GET /health`

Liveness probe.

## Deploy (Cloudflare)

```bash
pnpm install
cd apps/analytics-worker

# 1. Create D1 once
pnpm d1:create
# Paste the printed database_id into wrangler.jsonc → d1_databases[0].database_id

# 2. Apply migrations
pnpm d1:migrate:remote

# 3. Optional stats auth
pnpm exec wrangler secret put STATS_TOKEN

# 4. Deploy
pnpm deploy
```

Local:

```bash
cd apps/analytics-worker
pnpm d1:migrate:local
pnpm dev
# → http://127.0.0.1:8787
```

Custom domain is configured in `wrangler.jsonc` as `analytics.trypigeon.dev` (`routes` +
`custom_domain: true`). Redeploy after changing routes:

```bash
pnpm run deploy
```

Production desktop builds default to `https://analytics.trypigeon.dev` when
`VITE_ANALYTICS_API_URL` is unset.

Root helpers:

```bash
pnpm --filter @pigeon/analytics-worker test
pnpm --filter @pigeon/analytics-worker deploy
```

## Security notes

- D1 is only reachable through the Worker binding — never exposed publicly.
- Event endpoint is intentionally unauthenticated (no login for analytics).
- Abuse controls: schema validation, payload size cap, event allow-list, soft rate limits.
- Prefer Cloudflare WAF / Rate Limiting rules on `/v1/events` for hard global quotas.
- Do not log or persist `CF-Connecting-IP` or similar headers into D1.

## Tests

```bash
# Desktop analytics module
pnpm --filter pigeon test -- src/core/analytics

# Worker validation, idempotency, stats, HTTP
pnpm --filter @pigeon/analytics-worker test
```
