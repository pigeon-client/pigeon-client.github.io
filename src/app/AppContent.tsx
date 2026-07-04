import { useEffect, useRef, useState } from "react";
import { useCollectionStore } from "@/features/collections";
import { EnvModal } from "@/features/environments";
import { useHistoryStore } from "@/features/history";
import { ExportCurlModal, ImportModal } from "@/features/import-export";
import {
  EmptyRequestState,
  RequestEditor,
  TabStrip,
  UrlBar,
  useTabStore,
} from "@/features/request-builder";
import { ResponsePanel } from "@/features/response-viewer";
import {
  type AppTheme,
  applyTheme,
  checkForUpdates,
  KeyboardShortcutsModal,
  SettingsDrawer,
} from "@/features/settings";
import { Header } from "./layout/Header";
import { Sidebar } from "./layout/Sidebar";

/* ── Empty state when no URL has been typed yet ── */
export function AppContent() {
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
