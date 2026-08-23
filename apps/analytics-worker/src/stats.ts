export interface StatsEnv {
  DB: D1Database;
}

export interface AnalyticsStats {
  total_installs: number;
  /** Installations with last_seen_at within the last 30 days. */
  active_installations: number;
  installs_today: number;
  installs_this_month: number;
  platforms: Record<string, number>;
  installs_by_day: Array<{ date: string; count: number }>;
  installs_by_version: Record<string, number>;
  installs_by_platform: Record<string, number>;
  launches_by_day: Array<{ date: string; count: number }>;
}

function startOfUtcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcMonth(d: Date): string {
  return `${d.toISOString().slice(0, 7)}-01`;
}

function daysAgoIso(days: number, now: Date): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

async function countOne(db: D1Database, sql: string, ...binds: string[]): Promise<number> {
  const row = await db
    .prepare(sql)
    .bind(...binds)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

async function countMap(
  db: D1Database,
  sql: string,
  ...binds: string[]
): Promise<Record<string, number>> {
  const result = await db
    .prepare(sql)
    .bind(...binds)
    .all<{ k: string | null; c: number }>();
  const out: Record<string, number> = {};
  for (const row of result.results ?? []) {
    if (row.k) out[row.k] = row.c;
  }
  return out;
}

async function countSeries(
  db: D1Database,
  sql: string,
  ...binds: string[]
): Promise<Array<{ date: string; count: number }>> {
  const result = await db
    .prepare(sql)
    .bind(...binds)
    .all<{ d: string; c: number }>();
  return (result.results ?? []).map((row) => ({ date: row.d, count: row.c }));
}

/** Aggregate anonymous installation statistics. */
export async function collectStats(env: StatsEnv, now = new Date()): Promise<AnalyticsStats> {
  const today = startOfUtcDay(now);
  const monthStart = startOfUtcMonth(now);
  const activeSince = daysAgoIso(30, now);
  const seriesSince = daysAgoIso(30, now);

  const [
    total_installs,
    active_installations,
    installs_today,
    installs_this_month,
    platforms,
    installs_by_version,
    installs_by_day,
    launches_by_day,
  ] = await Promise.all([
    countOne(env.DB, "SELECT COUNT(*) AS c FROM installations"),
    countOne(
      env.DB,
      "SELECT COUNT(*) AS c FROM installations WHERE last_seen_at >= ?",
      activeSince,
    ),
    countOne(
      env.DB,
      "SELECT COUNT(*) AS c FROM installations WHERE first_seen_at >= ?",
      `${today}T00:00:00.000Z`,
    ),
    countOne(
      env.DB,
      "SELECT COUNT(*) AS c FROM installations WHERE first_seen_at >= ?",
      `${monthStart}T00:00:00.000Z`,
    ),
    countMap(env.DB, "SELECT platform AS k, COUNT(*) AS c FROM installations GROUP BY platform"),
    countMap(
      env.DB,
      "SELECT last_version AS k, COUNT(*) AS c FROM installations WHERE last_version IS NOT NULL GROUP BY last_version",
    ),
    countSeries(
      env.DB,
      `SELECT substr(first_seen_at, 1, 10) AS d, COUNT(*) AS c
       FROM installations
       WHERE first_seen_at >= ?
       GROUP BY d
       ORDER BY d ASC`,
      seriesSince,
    ),
    countSeries(
      env.DB,
      `SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS c
       FROM events
       WHERE event = 'launch' AND created_at >= ?
       GROUP BY d
       ORDER BY d ASC`,
      seriesSince,
    ),
  ]);

  return {
    total_installs,
    active_installations,
    installs_today,
    installs_this_month,
    platforms,
    installs_by_day,
    installs_by_version,
    installs_by_platform: platforms,
    launches_by_day,
  };
}
