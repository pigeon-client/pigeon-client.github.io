import type { AnalyticsEventPayload } from "./validation";

export interface EventEnv {
  DB: D1Database;
}

/**
 * Persist an analytics event.
 * Installations are idempotent via PRIMARY KEY + ON CONFLICT.
 * Never stores request IP, headers, or other Cloudflare metadata.
 */
export async function handleEvent(env: EventEnv, payload: AnalyticsEventPayload): Promise<void> {
  const now = new Date().toISOString();

  // Single batch: upsert installation then append event.
  // Duplicate install requests update last_seen only — still one row in installations.
  const statements = [
    env.DB.prepare(
      `INSERT INTO installations (
         install_id, first_seen_at, last_seen_at, first_version, last_version, platform, arch
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(install_id) DO UPDATE SET
         last_seen_at = excluded.last_seen_at,
         last_version = excluded.last_version,
         platform = COALESCE(excluded.platform, installations.platform),
         arch = COALESCE(excluded.arch, installations.arch)`,
    ).bind(
      payload.install_id,
      now,
      now,
      payload.version,
      payload.version,
      payload.platform,
      payload.arch,
    ),
    env.DB.prepare(
      `INSERT INTO events (install_id, event, version, platform, arch, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(payload.install_id, payload.event, payload.version, payload.platform, payload.arch, now),
  ];

  await env.DB.batch(statements);
}
