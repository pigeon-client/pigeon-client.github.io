import { useEffect, useRef, useState } from "react";
import pigeonLogo from "./assets/pigeon-logo-64.png";
import { EnvModal } from "./components/EnvModal";
import { ExportCurlModal } from "./components/ExportCurlModal";
import { ImportModal } from "./components/ImportModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { RequestEditor } from "./components/RequestEditor";
import { ResponsePanel } from "./components/ResponsePanel";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { UrlBar } from "./components/UrlBar";
import { METHOD_COLORS } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { checkForUpdates } from "./lib/updater";
import { useCollectionStore } from "./store/collectionStore";
import { useHistoryStore } from "./store/historyStore";
import { useTabStore } from "./store/tabStore";

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
          borderRadius: 9,
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
          borderRadius: 10,
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
                    borderRadius: 4,
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
          borderRadius: 9,
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
              borderRadius: 6,
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
                  borderRadius: 4,
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
                borderRadius: 4,
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
/* ── Theme swatch preview card ── */
const THEMES: {
  id: AppTheme;
  label: string;
  bg: string;
  surface: string;
  accent: string;
  text: string;
  border: string;
}[] = [
  {
    id: "dark",
    label: "Dark",
    bg: "#0F0F11",
    surface: "#17171C",
    accent: "#7C6EFA",
    text: "#E8E8F2",
    border: "#2A2A38",
  },
  {
    id: "light",
    label: "Light",
    bg: "#F4F4F8",
    surface: "#FFFFFF",
    accent: "#6B50F6",
    text: "#12121E",
    border: "#DCDCE8",
  },
  {
    id: "pink",
    label: "Pink",
    bg: "#0C0810",
    surface: "#140D1A",
    accent: "#F472B6",
    text: "#F5E8FF",
    border: "#3B1F4A",
  },
];

function ThemeSwatch({
  t,
  active,
  onClick,
}: {
  t: (typeof THEMES)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: 0,
        background: "none",
        border: `2px solid ${active ? t.accent : "transparent"}`,
        borderRadius: 10,
        cursor: "pointer",
        outline: "none",
        overflow: "hidden",
        transition: "border-color 0.15s",
        boxShadow: active ? `0 0 0 1px ${t.accent}40` : "none",
      }}
    >
      {/* Mini UI preview */}
      <div style={{ background: t.bg, borderRadius: 8, padding: 8 }}>
        {/* Fake topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: t.accent }} />
          <div
            style={{ height: 5, width: 28, borderRadius: 3, background: t.text, opacity: 0.7 }}
          />
        </div>
        {/* Fake content rows */}
        <div style={{ display: "flex", gap: 5 }}>
          <div
            style={{
              width: 36,
              background: t.surface,
              borderRadius: 4,
              border: `1px solid ${t.border}`,
              padding: 4,
            }}
          >
            {[1, 0.5, 0.8].map((o) => (
              <div
                key={o}
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: t.text,
                  opacity: o * 0.5,
                  marginBottom: o > 0.5 ? 3 : 0,
                }}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              background: t.surface,
              borderRadius: 4,
              border: `1px solid ${t.border}`,
              padding: 4,
            }}
          >
            <div
              style={{
                height: 3,
                borderRadius: 2,
                background: t.accent,
                opacity: 0.8,
                marginBottom: 4,
                width: "60%",
              }}
            />
            <div
              style={{
                height: 3,
                borderRadius: 2,
                background: t.text,
                opacity: 0.3,
                marginBottom: 3,
              }}
            />
            <div
              style={{ height: 3, borderRadius: 2, background: t.text, opacity: 0.2, width: "70%" }}
            />
          </div>
        </div>
      </div>
      {/* Label */}
      <div
        style={{
          padding: "6px 0 4px",
          fontSize: 11.5,
          fontWeight: active ? 600 : 500,
          color: active ? "var(--accent)" : "var(--text-secondary)",
          textAlign: "center",
          background: "var(--bg-elevated)",
        }}
      >
        {t.label}
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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,12,0.5)",
        backdropFilter: "blur(2px)",
        zIndex: 90,
        animation: "pgFade 120ms ease",
        border: "none",
        cursor: "default",
      }}
    >
      <div
        role="none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          animation: "pgSlide 200ms ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Settings
          </span>
          <Button variant="ghost-icon" size="icon" onClick={onClose}>
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

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* Theme picker */}
          <SectionLabel>Theme</SectionLabel>
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {THEMES.map((t) => (
              <ThemeSwatch
                key={t.id}
                t={t}
                active={theme === t.id}
                onClick={() => handleTheme(t.id)}
              />
            ))}
          </div>

          <SectionLabel>Requests</SectionLabel>
          <SettingRow label="Follow Redirects">
            <Toggle on={followRedirects} onClick={toggleFollowRedirects} />
          </SettingRow>
          <SettingRow label="SSL Verification">
            <Toggle on={sslVerify} onClick={toggleSslVerify} />
          </SettingRow>
          <SettingRow label="Proxy URL">
            <input
              value={proxyUrl}
              onChange={(e) => {
                setProxyUrl(e.target.value);
                localStorage.setItem("pg_proxy_url", e.target.value);
              }}
              placeholder="http://proxy:8080"
              style={{
                width: 170,
                height: 32,
                padding: "0 10px",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12.5,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                outline: "none",
              }}
            />
          </SettingRow>

          <SectionLabel style={{ marginTop: 24 }}>Data</SectionLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {[
              ["History", history.length],
              ["Drafts", drafts.length],
              ["Collections", collections.length],
            ].map(([label, val], i) => (
              <div
                key={String(label)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 13px",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

          <SectionLabel style={{ marginTop: 24 }}>About</SectionLabel>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Version</span>
            <span
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}
            >
              1.0.0
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 0",
      }}
    >
      <span style={{ fontSize: 13.5, color: "var(--text-primary)" }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        width: 38,
        height: 22,
        borderRadius: 20,
        background: on ? "var(--accent)" : "var(--border)",
        position: "relative",
        cursor: "pointer",
        display: "inline-block",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          right: on ? 2 : "auto",
          left: on ? "auto" : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
        }}
      />
    </span>
  );
}

/* ── Theme utility ── */
type AppTheme = "dark" | "light" | "pink";

function applyTheme(theme: AppTheme) {
  const html = document.documentElement;
  html.classList.remove("dark", "theme-light", "theme-pink");
  if (theme === "dark") html.classList.add("dark");
  if (theme === "light") html.classList.add("theme-light");
  if (theme === "pink") html.classList.add("theme-pink");
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
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        if (!meta) {
          e.preventDefault();
          setShowShortcutsModal(true);
          return;
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
        const searchInput = document.querySelector("[data-sidebar-search]") as HTMLInputElement;
        searchInput?.focus();
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {/* Topbar */}
      <Toolbar
        onOpenEnv={() => setShowEnvModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        onExportCurl={() => setShowExportModal(true)}
      />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Sidebar */}
        <Sidebar onImportClick={() => setShowImportModal(true)} />

        {/* Main panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            background: "var(--bg-base)",
          }}
        >
          {/* Tab strip */}
          <TabStrip />

          {/* Per-tab content */}
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const hasUrl = tab.request.url.trim().length > 0;
            return (
              <div
                key={tab.id}
                style={{
                  display: isActive ? "flex" : "none",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {hasUrl ? (
                  <>
                    <UrlBar />
                    <RequestEditor tabId={tab.id} />
                    <ResponsePanel tabId={tab.id} />
                  </>
                ) : (
                  <>
                    <UrlBar />
                    <EmptyRequestState />
                  </>
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
