import { useState } from "react";
import { useCollectionStore } from "@/features/collections";
import { useHistoryStore } from "@/features/history";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { type AppTheme, applyTheme } from "../lib/theme";

/* ── Settings Drawer ── */
const THEMES: { id: AppTheme; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

function ThemeSwatch({
  active,
  onClick,
  label,
  swatchClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  swatchClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 overflow-hidden rounded border-2 transition-colors",
        active
          ? "border-primary shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
          : "border-transparent hover:border-border",
      )}
    >
      <div className={cn("rounded p-2", swatchClass)}>
        <div className="mb-1.5 flex items-center gap-1">
          <div className="h-3.5 w-3.5 rounded bg-primary" />
          <div className="h-1.5 w-7 rounded bg-foreground/70" />
        </div>
        <div className="flex gap-1">
          <div className="w-9 rounded border border-border bg-card p-1">
            {[0.5, 0.8, 0.3].map((o) => (
              <div
                key={o}
                className="mb-0.5 h-1 rounded bg-foreground last:mb-0"
                style={{ opacity: o }}
              />
            ))}
          </div>
          <div className="flex-1 rounded border border-border bg-card p-1">
            <div className="mb-0.5 h-1.5 rounded bg-primary" />
            <div className="h-1 rounded bg-foreground/50" />
          </div>
        </div>
        <div className="mt-1 text-center text-[10px] font-medium text-foreground/80">{label}</div>
      </div>
    </button>
  );
}

export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const history = useHistoryStore((s) => s.history);
  const drafts = useHistoryStore((s) => s.drafts);
  const collections = useCollectionStore((s) => s.collections);
  const removeHistory = useHistoryStore((s) => s.removeHistory);
  const removeDraft = useHistoryStore((s) => s.removeDraft);
  const clearHistory = async () => {
    for (let i = history.length - 1; i >= 0; i--) await removeHistory(i);
  };
  const clearDrafts = async () => {
    for (let i = drafts.length - 1; i >= 0; i--) await removeDraft(i);
  };

  const [theme, setThemeState] = useState<AppTheme>(
    () => (localStorage.getItem("pg_theme") as AppTheme) ?? "dark",
  );
  const [followRedirects, setFollowRedirects] = useState(
    () => localStorage.getItem("pg_follow_redirects") !== "false",
  );
  const [sslVerify, setSslVerify] = useState(
    () => localStorage.getItem("pg_ssl_verify") !== "false",
  );
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem("pg_proxy_url") ?? "");

  const handleTheme = (t: AppTheme) => {
    setThemeState(t);
    applyTheme(t);
  };
  const toggleFollowRedirects = () => {
    const n = !followRedirects;
    setFollowRedirects(n);
    localStorage.setItem("pg_follow_redirects", String(n));
  };
  const toggleSslVerify = () => {
    const n = !sslVerify;
    setSslVerify(n);
    localStorage.setItem("pg_ssl_verify", String(n));
  };

  return (
    <button
      type="button"
      aria-label="Close settings"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
      }}
      style={{ animation: "pgFade 120ms ease" }}
      className="fixed inset-0 z-[90] cursor-default border-none bg-black/40 backdrop-blur-[2px]"
    >
      <div
        role="none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        style={{ animation: "pgSlide 200ms ease-out" }}
        className="absolute right-0 top-0 bottom-0 flex w-[360px] flex-col border-l border-border bg-card shadow-drawer"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-[15px] font-semibold text-foreground">Settings</span>
          <Button variant="ghost-icon" size="icon" onClick={onClose} aria-label="Close settings">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Theme picker */}
          <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Theme
          </div>
          <div className="mb-6 flex gap-2.5">
            {THEMES.map((t) => (
              <ThemeSwatch
                key={t.id}
                active={theme === t.id}
                label={t.label}
                swatchClass={t.id === "dark" ? "bg-zinc-900" : "bg-zinc-100"}
                onClick={() => handleTheme(t.id)}
              />
            ))}
          </div>

          <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Requests
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13.5px] text-foreground">Follow Redirects</span>
            <Switch checked={followRedirects} onCheckedChange={toggleFollowRedirects} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13.5px] text-foreground">SSL Verification</span>
            <Switch checked={sslVerify} onCheckedChange={toggleSslVerify} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[13.5px] text-foreground">Proxy URL</span>
            <input
              value={proxyUrl}
              onChange={(e) => {
                setProxyUrl(e.target.value);
                localStorage.setItem("pg_proxy_url", e.target.value);
              }}
              placeholder="http://proxy:8080"
              className="h-8 w-[170px] rounded border border-border bg-card px-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="mb-3 mt-6 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Data
          </div>
          <div className="mb-3.5 overflow-hidden rounded border border-border bg-card">
            {[
              ["History", history.length],
              ["Drafts", drafts.length],
              ["Collections", collections.length],
            ].map(([label, val], i) => (
              <div
                key={String(label)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5",
                  i > 0 && "border-t border-border",
                )}
              >
                <span className="text-[13px] text-muted-foreground">{label}</span>
                <span className="font-mono text-[13px] text-foreground">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="danger-ghost" className="w-full justify-start" onClick={clearHistory}>
              Clear History
            </Button>
            <Button variant="danger-ghost" className="w-full justify-start" onClick={clearDrafts}>
              Clear Drafts
            </Button>
            <Button
              variant="danger-filled"
              className="w-full justify-start"
              onClick={() => {
                clearHistory();
                clearDrafts();
              }}
            >
              Clear All Data
            </Button>
          </div>

          <div className="mb-3 mt-6 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            About
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[13px] text-muted-foreground">Version</span>
            <span className="font-mono text-[13px] text-foreground">1.0.0</span>
          </div>
        </div>
      </div>
    </button>
  );
}
