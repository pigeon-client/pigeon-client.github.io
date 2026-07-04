import { useEffect, useRef, useState } from "react";
import { useCollectionStore } from "@/features/collections";
import { EnvModal } from "@/features/environments";
import { useHistoryStore } from "@/features/history";
import { ExportCurlModal, ImportModal } from "@/features/import-export";
import { RequestEditor, UrlBar, useTabStore } from "@/features/request-builder";
import { ResponsePanel } from "@/features/response-viewer";
import { cn } from "@/shared/lib/utils";
import { METHOD_COLORS } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import pigeonLogo from "./assets/pigeon-logo-64.png";
import { Header } from "./components/Header";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { Sidebar } from "./components/Sidebar";
import { checkForUpdates } from "./lib/updater";

/* ── Empty state when no URL has been typed yet ── */
function EmptyRequestState() {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const hints = [
    { keys: ["⌘", "N"], label: "New tab" },
    { keys: ["⌘", "Enter"], label: "Send request" },
    { keys: ["⌘", "F"], label: "Search sidebar" },
    { keys: ["⌘", ","], label: "Settings" },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        gap: 0,
        userSelect: "none",
      }}
    >
      {/* Icon */}
      <img
        src={pigeonLogo}
        alt="Pigeon"
        className="pg-logo"
        style={{
          width: 72,
          height: 72,
          objectFit: "contain",
          marginBottom: 20,
        }}
      />

      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        No request open
      </div>
      <div
        style={{
          fontSize: 13.5,
          color: "var(--text-secondary)",
          marginBottom: 32,
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        Enter a URL in the bar above, open a request from the sidebar, or start a new one.
      </div>

      {/* New request CTA */}
      <button
        type="button"
        onClick={() => {
          const id = addTab();
          setActiveTab(id);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 20px",
          background: "var(--accent)",
          border: "none",
          borderRadius: "var(--radius)",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 40,
          boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 40%, transparent)",
          transition: "opacity 0.1s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Request
      </button>

      {/* Keyboard hints */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "16px 24px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        {hints.map(({ keys, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</span>
            <div style={{ display: "flex", gap: 4 }}>
              {keys.map((k) => (
                <span
                  key={k}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 22,
                    height: 20,
                    padding: "0 5px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab context menu ── */
interface TabCtxMenu {
  tabId: string;
  x: number;
  y: number;
}

function TabContextMenu({ menu, onClose }: { menu: TabCtxMenu; onClose: () => void }) {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const closeOther = useTabStore((s) => s.closeOtherTabs);
  const closeAll = useTabStore((s) => s.closeAllTabs);
  const tabs = useTabStore((s) => s.tabs);

  const menuItems: {
    label: string;
    icon: React.ReactNode;
    danger?: boolean;
    onClick: () => void;
    disabled?: boolean;
  }[] = [
    {
      label: "New Request",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
      onClick: () => {
        const id = addTab();
        setActiveTab(id);
      },
    },
    {
      label: "Close Tab",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
      onClick: () => closeTab(menu.tabId),
    },
    {
      label: "Close Other Tabs",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      ),
      disabled: tabs.length <= 1,
      onClick: () => closeOther(menu.tabId),
    },
    {
      label: "Close All Tabs",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      ),
      danger: true,
      onClick: () => closeAll(),
    },
  ];

  return (
    <>
      {/* Click-away backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "none",
          border: "none",
          cursor: "default",
        }}
      />
      {/* Menu */}
      <div
        style={{
          position: "fixed",
          left: menu.x,
          top: menu.y,
          zIndex: 1000,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          padding: "4px",
          minWidth: 190,
          animation: "pgSlide 120ms ease-out",
        }}
      >
        {menuItems.map((item) => (
          <button
            type="button"
            key={item.label}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "7px 12px",
              background: "none",
              border: "none",
              borderRadius: "var(--radius)",
              cursor: item.disabled ? "default" : "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              color: item.disabled
                ? "var(--text-placeholder)"
                : item.danger
                  ? "#F87171"
                  : "var(--text-primary)",
              textAlign: "left",
              opacity: item.disabled ? 0.5 : 1,
              transition: "background 0.08s",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled)
                (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-input)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
          >
            <span style={{ flexShrink: 0, opacity: 0.75 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Tab strip above request/response area ── */
function TabStrip() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const addTab = useTabStore((s) => s.addTab);
  const setTabName = useTabStore((s) => s.setTabName);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [ctxMenu, setCtxMenu] = useState<TabCtxMenu | null>(null);

  const startRename = (tab: { id: string; name: string }) => {
    setEditingId(tab.id);
    setEditValue(tab.name);
    setTimeout(() => {
      renameInputRef.current?.select();
    }, 0);
  };

  const commitRename = (id: string) => {
    const v = editValue.trim();
    if (v) setTabName(id, v);
    setEditingId(null);
  };

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        height: 38,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        const mc = METHOD_COLORS[tab.request.method] ?? "#94A3B8";
        const isEditing = editingId === tab.id;
        return (
          <div
            key={tab.id}
            role="tab"
            tabIndex={0}
            aria-selected={active}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveTab(tab.id);
              }
            }}
            onMouseDown={(e) => {
              if (e.button === 1) closeTab(tab.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu({ tabId: tab.id, x: e.clientX, y: e.clientY });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              minWidth: 124,
              maxWidth: 210,
              height: 38,
              padding: "0 8px 0 13px",
              borderRight: "1px solid var(--border)",
              cursor: "pointer",
              background: active ? "var(--bg-base)" : "transparent",
              boxShadow: active ? "inset 0 2px 0 var(--accent)" : "none",
              transition: "background 0.1s",
            }}
            className={!active ? "hover:bg-[#1b1b22]" : ""}
          >
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.03em",
                color: mc,
              }}
            >
              {tab.request.method}
            </span>

            {isEditing ? (
              <input
                ref={renameInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitRename(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename(tab.id);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  background: "var(--bg-input)",
                  border: "1px solid var(--accent)",
                  borderRadius: "var(--radius)",
                  outline: "none",
                  padding: "1px 5px",
                  height: 22,
                }}
              />
            ) : (
              <button
                type="button"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename(tab);
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  background: "none",
                  border: "none",
                  cursor: "inherit",
                  padding: 0,
                  textAlign: "left",
                }}
              >
                {tab.name}
              </button>
            )}

            <button
              type="button"
              aria-label="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: "var(--radius)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
              className="hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}

      {/* New tab button */}
      <button
        type="button"
        onClick={() => {
          const id = addTab();
          setActiveTab(id);
        }}
        title="New request"
        style={{
          flexShrink: 0,
          width: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          borderRight: "1px solid var(--border)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
        className="hover:text-[var(--text-primary)] hover:bg-[#1b1b22]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div style={{ flex: 1 }} />

      {ctxMenu && <TabContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />}
    </div>
  );
}

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

function SettingsDrawer({ onClose }: { onClose: () => void }) {
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
        className="absolute right-0 top-0 bottom-0 flex w-[360px] flex-col border-l border-border bg-card shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
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

/* ── Theme utility ── */
type AppTheme = "dark" | "light";

function applyTheme(theme: AppTheme) {
  const html = document.documentElement;
  html.classList.remove("dark", "theme-light");
  if (theme === "dark") html.classList.add("dark");
  if (theme === "light") html.classList.remove("dark");
  localStorage.setItem("pg_theme", theme);
}

/* ── Main App ── */
function AppContent() {
  useEffect(() => {
    const saved = (localStorage.getItem("pg_theme") as AppTheme) ?? "dark";
    applyTheme(saved);
    useHistoryStore.getState().load();
    useCollectionStore.getState().load();
    checkForUpdates(true);
  }, []);

  const [editorHeights, setEditorHeights] = useState<Record<string, number>>({});
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter") {
        e.preventDefault();
        const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement;
        sendBtn?.click();
        return;
      }
      if (e.shiftKey && (e.key === "?" || e.key === "/")) {
        if (!meta) {
          // Don't intercept `?` while typing in an input/textarea/contenteditable
          const target = e.target as HTMLElement | null;
          const tag = target?.tagName;
          const isEditable =
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            target?.isContentEditable === true;
          if (!isEditable) {
            e.preventDefault();
            setShowShortcutsModal(true);
            return;
          }
        }
      }
      if (e.key === "Escape") {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (showEnvModal) {
          setShowEnvModal(false);
          return;
        }
        if (showImportModal) {
          setShowImportModal(false);
          return;
        }
        if (showExportModal) {
          setShowExportModal(false);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        return;
      }
      if (meta && e.key === "n") {
        e.preventDefault();
        const id = addTab();
        setActiveTab(id);
        return;
      }
      if (meta && e.key === "w") {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        return;
      }
      if (meta && e.key === "f") {
        e.preventDefault();
        const input = searchInputRef.current;
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }
      if (meta && e.key === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("pigeon:save-to-collection"));
        return;
      }
      if (meta && e.shiftKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const tab = tabs[parseInt(e.key, 10) - 1];
        if (tab) setActiveTab(tab.id);
        return;
      }
      if (meta && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
        return;
      }
      if (meta && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        setShowEnvModal(true);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeTabId,
    tabs,
    addTab,
    closeTab,
    setActiveTab,
    showShortcutsModal,
    showEnvModal,
    showImportModal,
    showExportModal,
    showSettings,
  ]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      {/* Topbar */}
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onExportCurl={() => setShowExportModal(true)}
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchInputRef}
        searchFocused={searchFocused}
        onSearchFocus={() => setSearchFocused(true)}
        onSearchBlur={() => setSearchFocused(false)}
      />

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <div className="flex min-h-0 flex-shrink-0" style={{ width: sidebarWidth }}>
          <Sidebar onImportClick={() => setShowImportModal(true)} search={search} />
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-driven resize handle for the sidebar */}
        <div
          className="group flex w-1 flex-shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-accent/40 active:bg-accent/60 select-none border-l border-border"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMove = (ev: MouseEvent) => {
              const delta = ev.clientX - startX;
              setSidebarWidth(Math.min(480, Math.max(180, startWidth + delta)));
            };
            const onUp = () => {
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
              document.body.style.cursor = "";
              document.body.style.userSelect = "";
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />

        {/* Main panel */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {/* Tab strip */}
          <TabStrip />

          {/* Per-tab content */}
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const hasUrl = tab.request.url.trim().length > 0;
            const editorHeight = editorHeights[tab.id];
            return (
              <div
                key={tab.id}
                className="flex min-h-0 flex-1 flex-col"
                style={{ display: isActive ? "flex" : "none" }}
              >
                <UrlBar />
                {hasUrl ? (
                  <>
                    <div
                      style={editorHeight ? { height: editorHeight, flexShrink: 0 } : undefined}
                      className="flex flex-col overflow-hidden"
                    >
                      <RequestEditor tabId={tab.id} />
                    </div>
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-driven resize handle between request editor and response */}
                    <div
                      className="group flex h-1 flex-shrink-0 cursor-row-resize items-center justify-center border-t border-border bg-transparent transition-colors hover:bg-accent/40 active:bg-accent/60 select-none"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startY = e.clientY;
                        const startHeight = editorHeight || 200;
                        const onMove = (ev: MouseEvent) => {
                          const delta = ev.clientY - startY;
                          setEditorHeights((prev) => ({
                            ...prev,
                            [tab.id]: Math.max(150, startHeight + delta),
                          }));
                        };
                        const onUp = () => {
                          document.removeEventListener("mousemove", onMove);
                          document.removeEventListener("mouseup", onUp);
                          document.body.style.cursor = "";
                          document.body.style.userSelect = "";
                        };
                        document.addEventListener("mousemove", onMove);
                        document.addEventListener("mouseup", onUp);
                        document.body.style.cursor = "row-resize";
                        document.body.style.userSelect = "none";
                      }}
                    >
                      <div className="h-0.5 w-8 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <ResponsePanel tabId={tab.id} />
                  </>
                ) : (
                  <div className="flex-1">
                    <EmptyRequestState />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showEnvModal && <EnvModal onClose={() => setShowEnvModal(false)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
      {showExportModal && <ExportCurlModal onClose={() => setShowExportModal(false)} />}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
      {showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
