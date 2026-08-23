/**
 * Minimal in-memory D1 stand-in for unit tests.
 * Supports the SQL shapes used by events.ts and stats.ts — not a full SQLite.
 */

interface Installation {
  install_id: string;
  first_seen_at: string;
  last_seen_at: string;
  first_version: string | null;
  last_version: string | null;
  platform: string | null;
  arch: string | null;
}

interface EventRow {
  id: number;
  install_id: string;
  event: string;
  version: string | null;
  platform: string | null;
  arch: string | null;
  created_at: string;
}

export class MemoryDb {
  installations = new Map<string, Installation>();
  events: EventRow[] = [];
  nextEventId = 1;

  prepare(sql: string): MemoryStatement {
    return new MemoryStatement(this, sql);
  }

  async batch(statements: MemoryStatement[]): Promise<unknown[]> {
    const out: unknown[] = [];
    for (const stmt of statements) {
      out.push(await stmt.run());
    }
    return out;
  }
}

class MemoryStatement {
  private binds: unknown[] = [];

  constructor(
    private readonly db: MemoryDb,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): MemoryStatement {
    this.binds = values;
    return this;
  }

  async run(): Promise<{ success: boolean }> {
    this.execute();
    return { success: true };
  }

  async first<T>(): Promise<T | null> {
    const rows = this.execute();
    return (rows[0] as T) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.execute() as T[] };
  }

  private execute(): unknown[] {
    const sql = this.sql.replace(/\s+/g, " ").trim();

    if (sql.startsWith("INSERT INTO installations")) {
      const [install_id, first_seen_at, last_seen_at, first_version, last_version, platform, arch] =
        this.binds as string[];
      const existing = this.db.installations.get(install_id);
      if (!existing) {
        this.db.installations.set(install_id, {
          install_id,
          first_seen_at,
          last_seen_at,
          first_version,
          last_version,
          platform,
          arch,
        });
      } else {
        existing.last_seen_at = last_seen_at;
        existing.last_version = last_version;
        existing.platform = platform ?? existing.platform;
        existing.arch = arch ?? existing.arch;
      }
      return [];
    }

    if (sql.startsWith("INSERT INTO events")) {
      const [install_id, event, version, platform, arch, created_at] = this.binds as string[];
      this.db.events.push({
        id: this.db.nextEventId++,
        install_id,
        event,
        version,
        platform,
        arch,
        created_at,
      });
      return [];
    }

    if (sql === "SELECT COUNT(*) AS c FROM installations") {
      return [{ c: this.db.installations.size }];
    }

    if (sql.startsWith("SELECT COUNT(*) AS c FROM installations WHERE last_seen_at >=")) {
      const since = this.binds[0] as string;
      let c = 0;
      for (const row of this.db.installations.values()) {
        if (row.last_seen_at >= since) c += 1;
      }
      return [{ c }];
    }

    if (sql.startsWith("SELECT COUNT(*) AS c FROM installations WHERE first_seen_at >=")) {
      const since = this.binds[0] as string;
      let c = 0;
      for (const row of this.db.installations.values()) {
        if (row.first_seen_at >= since) c += 1;
      }
      return [{ c }];
    }

    if (sql.startsWith("SELECT platform AS k, COUNT(*) AS c FROM installations")) {
      const counts = new Map<string, number>();
      for (const row of this.db.installations.values()) {
        if (!row.platform) continue;
        counts.set(row.platform, (counts.get(row.platform) ?? 0) + 1);
      }
      return [...counts.entries()].map(([k, c]) => ({ k, c }));
    }

    if (sql.startsWith("SELECT last_version AS k, COUNT(*) AS c FROM installations")) {
      const counts = new Map<string, number>();
      for (const row of this.db.installations.values()) {
        if (!row.last_version) continue;
        counts.set(row.last_version, (counts.get(row.last_version) ?? 0) + 1);
      }
      return [...counts.entries()].map(([k, c]) => ({ k, c }));
    }

    if (sql.includes("FROM installations") && sql.includes("substr(first_seen_at")) {
      const since = this.binds[0] as string;
      const counts = new Map<string, number>();
      for (const row of this.db.installations.values()) {
        if (row.first_seen_at < since) continue;
        const d = row.first_seen_at.slice(0, 10);
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, c]) => ({ d, c }));
    }

    if (sql.includes("FROM events") && sql.includes("event = 'launch'")) {
      const since = this.binds[0] as string;
      const counts = new Map<string, number>();
      for (const row of this.db.events) {
        if (row.event !== "launch" || row.created_at < since) continue;
        const d = row.created_at.slice(0, 10);
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, c]) => ({ d, c }));
    }

    throw new Error(`Unsupported SQL in MemoryDb: ${sql}`);
  }
}

export function asD1(db: MemoryDb): D1Database {
  return db as unknown as D1Database;
}
