import { AlertCircle, CheckCircle2, Download, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import pigeonLogo from "@/assets/pigeon-mark.svg";
import { useCollectionStore } from "@/features/collections";
import { useEnvStore } from "@/features/environments";
import { useHistoryStore } from "@/features/history";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Modal, ModalHeader } from "@/shared/ui/Modal";
import { Switch } from "@/shared/ui/switch";
import { useWordWrap } from "../hooks/useWordWrap";
import { type AppTheme, applyTheme } from "../lib/theme";
import {
  checkUpdateVersion,
  getCachedUpdateResult,
  getCurrentVersion,
  installUpdate,
  type UpdateCheckResult,
  type UpdateCheckStatus,
  type UpdateVersionModel,
} from "../lib/updater";

/* ── Settings Modal ── */
const THEMES: { id: AppTheme; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

const TABS = ["General", "Requests", "Data", "About"] as const;
type Tab = (typeof TABS)[number];

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
        <div className="mt-1 text-center text-2xs font-medium text-foreground/80">{label}</div>
      </div>
    </button>
  );
}

export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const history = useHistoryStore((s) => s.history);
  const drafts = useHistoryStore((s) => s.drafts);
  const collections = useCollectionStore((s) => s.collections);
  const environments = useEnvStore((s) => s.environments);
  const removeHistory = useHistoryStore((s) => s.removeHistory);
  const removeDraft = useHistoryStore((s) => s.removeDraft);
  const deleteEnvironment = useEnvStore((s) => s.deleteEnvironment);
  const clearHistory = async () => {
    for (let i = history.length - 1; i >= 0; i--) await removeHistory(i);
  };
  const clearDrafts = async () => {
    for (let i = drafts.length - 1; i >= 0; i--) await removeDraft(i);
  };
  const clearEnvironments = async () => {
    for (const e of [...environments]) await deleteEnvironment(e.id);
  };

  const [activeTab, setActiveTab] = useState<Tab>("General");
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
  const { wordWrap, setWordWrap } = useWordWrap();
  const [currentVersion, setCurrentVersion] = useState("0.1.0");
  const [updateStatus, setUpdateStatus] = useState<UpdateCheckStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateVersionModel | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<UpdateCheckResult["update"]>(undefined);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const checkIdRef = useRef(0);

  const updateAvailable = updateStatus === "available";

  useEffect(() => {
    let cancelled = false;
    getCurrentVersion().then((version) => {
      if (!cancelled) setCurrentVersion(version);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cached = getCachedUpdateResult();
    if (cached && updateStatus === "idle") {
      setUpdateInfo(cached.version);
      setCurrentVersion(cached.version.currentVersion);
      setPendingUpdate(cached.update);
      setUpdateStatus(
        cached.status === "available"
          ? "available"
          : cached.status === "error"
            ? "error"
            : "latest",
      );
      setUpdateError(cached.error ?? "");
    }
  }, [updateStatus]);

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
  const handleCheckUpdate = async () => {
    setUpdateStatus("checking");
    setUpdateError("");
    setPendingUpdate(undefined);
    setDownloadedBytes(0);

    const checkId = ++checkIdRef.current;
    const result = await checkUpdateVersion();
    if (checkId !== checkIdRef.current) return;

    setUpdateInfo(result.version);
    setCurrentVersion(result.version.currentVersion);
    setPendingUpdate(result.update);
    setUpdateStatus(result.status === "available" ? "available" : result.status);
    setUpdateError(result.error ?? "");
  };
  const handleInstallUpdate = async () => {
    if (!pendingUpdate) return;
    setUpdateStatus("installing");
    setUpdateError("");
    setDownloadedBytes(0);
    try {
      await installUpdate(pendingUpdate, (event) => {
        if (event.event === "Progress") {
          setDownloadedBytes((bytes) => bytes + event.data.chunkLength);
        }
      });
    } catch (err) {
      setUpdateStatus("error");
      setUpdateError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateLabel =
    updateStatus === "checking"
      ? "Checking..."
      : updateStatus === "available"
        ? `v${updateInfo?.latestVersion ?? ""} available`
        : updateStatus === "latest"
          ? "Up to date"
          : updateStatus === "installing"
            ? downloadedBytes > 0
              ? `Installing ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB`
              : "Installing..."
            : updateStatus === "error"
              ? "Update check failed"
              : "Automatic updates enabled";

  return (
    <Modal onClose={onClose} width={640}>
      <ModalHeader title="Settings" onClose={onClose} />

      <div className="flex h-[440px] overflow-hidden">
        <div className="flex w-[150px] shrink-0 flex-col gap-0.5 border-r border-border p-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center justify-between rounded px-3 py-2 text-left text-code transition-colors cursor-pointer",
                activeTab === tab
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {tab}
              {tab === "About" && updateAvailable && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-primary"
                  title="Update available"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "General" && (
            <>
              <div className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Theme
              </div>
              <div className="flex gap-2.5">
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

              <div className="mb-3 mt-5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Editor
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="min-w-0 pr-3">
                  <div className="text-code text-foreground">Word wrap</div>
                  <div className="text-2xs text-muted-foreground">
                    Wrap long lines in request body and response
                  </div>
                </div>
                <Switch
                  checked={wordWrap}
                  onCheckedChange={setWordWrap}
                  data-testid="settings-word-wrap"
                />
              </div>
            </>
          )}

          {activeTab === "Requests" && (
            <>
              <div className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requests
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-code text-foreground">Follow Redirects</span>
                <Switch checked={followRedirects} onCheckedChange={toggleFollowRedirects} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-code text-foreground">SSL Verification</span>
                <Switch checked={sslVerify} onCheckedChange={toggleSslVerify} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-code text-foreground">Proxy URL</span>
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
            </>
          )}

          {activeTab === "Data" && (
            <>
              <div className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Data
              </div>
              <div className="mb-3.5 overflow-hidden rounded border border-border bg-card">
                {[
                  ["History", history.length],
                  ["Drafts", drafts.length],
                  ["Collections", collections.length],
                  ["Environments", environments.length],
                ].map(([label, val], i) => (
                  <div
                    key={String(label)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5",
                      i > 0 && "border-t border-border",
                    )}
                  >
                    <span className="text-code text-muted-foreground">{label}</span>
                    <span className="font-mono text-code text-foreground">{val}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger-ghost"
                  className="w-full justify-start"
                  onClick={clearHistory}
                >
                  Clear History
                </Button>
                <Button
                  variant="danger-ghost"
                  className="w-full justify-start"
                  onClick={clearDrafts}
                >
                  Clear Drafts
                </Button>
                <Button
                  variant="danger-filled"
                  className="w-full justify-start"
                  onClick={() => {
                    clearHistory();
                    clearDrafts();
                    clearEnvironments();
                  }}
                >
                  Clear All Data
                </Button>
              </div>
            </>
          )}

          {activeTab === "About" && (
            <>
              <div className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                About
              </div>
              <div className="mb-3 flex items-center gap-3">
                <img src={pigeonLogo} alt="Pigeon" className="h-10 w-10 rounded object-contain" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Pigeon</div>
                  <div className="text-2xs text-muted-foreground">The fast, native API client</div>
                </div>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-code text-muted-foreground">Version</span>
                <span className="font-mono text-code text-foreground">v{currentVersion}</span>
              </div>
              {updateInfo?.latestVersion && updateInfo.latestVersion !== currentVersion && (
                <div className="flex justify-between py-1.5">
                  <span className="text-code text-muted-foreground">Latest</span>
                  <span className="font-mono text-code text-primary">
                    v{updateInfo.latestVersion}
                  </span>
                </div>
              )}
              <div className="mt-2.5 rounded border border-border bg-background/40 p-3">
                <div className="mb-2.5 flex items-center gap-2">
                  {updateStatus === "available" ? (
                    <Download className="h-3.5 w-3.5 text-primary" />
                  ) : updateStatus === "latest" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-2xx" />
                  ) : updateStatus === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground",
                        (updateStatus === "checking" || updateStatus === "installing") &&
                          "animate-spin",
                      )}
                    />
                  )}
                  <span className="text-xs text-foreground">{updateLabel}</span>
                </div>
                {updateStatus === "available" && updateInfo?.body && (
                  <div className="mb-2.5 max-h-20 overflow-y-auto whitespace-pre-wrap rounded border border-border bg-card px-2.5 py-2 text-2xs text-muted-foreground">
                    {updateInfo.body}
                  </div>
                )}
                {updateStatus === "error" && updateError && (
                  <div className="mb-2.5 rounded border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-2xs text-destructive">
                    {updateError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant={updateStatus === "available" ? "ghost" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={handleCheckUpdate}
                    disabled={updateStatus === "checking" || updateStatus === "installing"}
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", updateStatus === "checking" && "animate-spin")}
                    />
                    Check Update
                  </Button>
                  {updateStatus === "available" && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={handleInstallUpdate}
                      disabled={!pendingUpdate}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Install
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
