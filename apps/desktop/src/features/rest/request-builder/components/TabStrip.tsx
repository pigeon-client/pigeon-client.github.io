import { METHOD_COLORS } from "@pigeon/ui";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTabStore } from "../store";

interface TabCtxMenu {
  tabId: string;
  x: number;
  y: number;
}

function TabContextMenu({ menu, onClose }: { menu: TabCtxMenu; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const addTab = useTabStore((s) => s.addTab);
  const duplicateTab = useTabStore((s) => s.duplicateTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const closeOther = useTabStore((s) => s.closeOtherTabs);
  const closeAll = useTabStore((s) => s.closeAllTabs);
  const tabs = useTabStore((s) => s.tabs);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      label: "Duplicate Request",
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
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      ),
      onClick: () => {
        duplicateTab(menu.tabId);
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
        tabIndex={-1}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: "var(--z-modal)",
          background: "none",
          border: "none",
          cursor: "default",
        }}
      />
      {/* Menu */}
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          left: menu.x,
          top: menu.y,
          zIndex: "var(--z-modal)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-modal)",
          padding: "4px",
          minWidth: 190,
          animation: "pgSlide 120ms ease-out",
        }}
      >
        {menuItems.map((item) => (
          <button
            type="button"
            role="menuitem"
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
              fontSize: "var(--text-code)",
              color: item.disabled
                ? "var(--text-placeholder)"
                : item.danger
                  ? "var(--status-5xx)"
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

export function TabStrip() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const addTab = useTabStore((s) => s.addTab);
  const setTabName = useTabStore((s) => s.setTabName);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

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
    if (v) {
      // Named manually → lock; path changes no longer touch it.
      setTabName(id, v);
    } else {
      // Cleared → back to auto; name follows the URL path again.
      const tab = tabs.find((t) => t.id === id);
      updateTabRequest(id, { url: tab?.request.url ?? "", nameLocked: false });
    }
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
        const isEditing = editingId === tab.id;
        // Non-http tabs show a kind badge where the method usually sits.
        const badge =
          tab.kind === "mcp" ? "MCP" : tab.kind === "graphql" ? "GQL" : tab.request.method;
        const mc =
          tab.kind === "http"
            ? (METHOD_COLORS[tab.request.method] ?? METHOD_COLORS.GET)
            : "var(--primary)";
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
              transition: "background 0.1s",
            }}
            className={!active ? "hover:bg-accent" : ""}
          >
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                fontWeight: 700,
                letterSpacing: "0.03em",
                color: mc,
              }}
            >
              {badge}
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
                  fontSize: "var(--text-xs)",
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
                  fontSize: "var(--text-xs)",
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
        className="hover:text-[var(--text-primary)] hover:bg-accent"
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

/* ── Main App ── */
