import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCachedUpdateResult, onUpdateCacheChange } from "@/features/settings";

/**
 * In-app toast shown when the startup update check finds a newer version.
 * Appears once per app launch (dismissible); "Update" opens Settings.
 */
export function UpdateToast({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const r = getCachedUpdateResult();
      setVersion(r?.status === "available" ? (r.version.latestVersion ?? null) : null);
    };
    sync();
    return onUpdateCacheChange(sync);
  }, []);

  if (!version || dismissed) return null;

  return (
    <div
      style={{ animation: "pgToast 200ms ease-out" }}
      className="fixed bottom-4 right-4 z-[var(--z-toast)] flex items-center gap-3 rounded-lg border border-primary/40 bg-card px-4 py-3 shadow-toast"
    >
      <Download className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex flex-col">
        <span className="text-code font-semibold text-foreground">Update available</span>
        <span className="text-2xs text-muted-foreground">Version {version} is ready</span>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          onOpenSettings();
        }}
        className="ml-1 rounded bg-primary px-3 py-1.5 text-2xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Update
      </button>
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
