# Anonymous analytics (desktop)

See the full system doc: [docs/analytics.md](../../../docs/analytics.md).

## Overview

On first desktop launch, Pigeon generates a random UUID, stores it in localStorage
(`pg_install_id`), and POSTs anonymous `install` / `launch` events to the analytics
Worker. Telemetry never blocks startup and is disabled when `VITE_ANALYTICS_API_URL`
is unset or when running a non-Tauri (browser/E2E) build.

## Acceptance criteria

- [ ] First launch creates and persists `pg_install_id`.
- [ ] Install event sent once (retries until acknowledged); launch on every session.
- [ ] Network failures do not affect app UX.
- [ ] Browser / Playwright builds do not send events.
