# Pigeon anonymous analytics worker

Cloudflare Worker + D1 backend for anonymous desktop installation telemetry.

Full design, privacy notes, and deployment steps: [`docs/analytics.md`](../../docs/analytics.md).

## Quick start

```bash
pnpm install
cd apps/analytics-worker

# Create D1 (once) — paste database_id into wrangler.jsonc
pnpm d1:create

pnpm d1:migrate:remote
pnpm deploy
```

Local:

```bash
pnpm d1:migrate:local
pnpm dev
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/events` | Record `install` / `launch` |
| `GET` | `/v1/stats` | Anonymous aggregates |
| `GET` | `/health` | Liveness |

**Public URL:** https://analytics.trypigeon.dev (Wrangler custom domain)
