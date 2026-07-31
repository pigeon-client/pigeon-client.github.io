import { DatabaseZap, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentVersion, getMigrationStatus } from "@/features/settings";

/**
 * Shown once per launch when this session's startup ran pending schema
 * migrations (detected via `get_migration_status`, set during `init_db()`
 * before the window opens). Nothing to show on a fresh install or when
 * already up to date.
 */
export function MigrationToast() {
  const [status, setStatus] = useState<{ from: number; to: number; version: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const migration = await getMigrationStatus();
      if (!migration) return;
      const version = await getCurrentVersion();
      setStatus({ from: migration.fromVersion, to: migration.toVersion, version });
    })();
  }, []);

  if (!status || dismissed) return null;

  return (
    <div
      style={{ animation: "pgToast 200ms ease-out" }}
      className="fixed bottom-20 right-4 z-[var(--z-toast)] flex items-center gap-3 rounded-lg border border-primary/40 bg-card px-4 py-3 shadow-toast"
    >
      <DatabaseZap className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex flex-col">
        <span className="text-code font-semibold text-foreground">Database migrated</span>
        <span className="text-2xs text-muted-foreground">
          Updated to v{status.version} (schema {status.from} → {status.to})
        </span>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
