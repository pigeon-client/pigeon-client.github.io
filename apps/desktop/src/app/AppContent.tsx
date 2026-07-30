import { PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SaveToCollectionModal, useCollectionStore } from "@/features/collections";
import { CommandPalette } from "@/features/command-palette";
import { EnvModal, selectActiveEnv, useEnvStore } from "@/features/environments";
import { GraphqlComingSoon } from "@/features/graphql";
import { useHistoryStore } from "@/features/history";
import { generateCurl, ImportModal } from "@/features/import-export";
import { McpPanel } from "@/features/mcp";
import {
  EmptyRequestState,
  RequestEditor,
  TabStrip,
  UrlBar,
  useTabStore,
} from "@/features/request-builder";
import { ResponsePanel } from "@/features/response-viewer";
import {
  applyTheme,
  checkForUpdates,
  getStoredTheme,
  KeyboardShortcutsModal,
  SettingsDrawer,
} from "@/features/settings";
import { Header } from "./layout/Header";
import { Sidebar } from "./layout/Sidebar";
import { UpdateToast } from "./layout/UpdateToast";

const MIN_EDITOR_HEIGHT = 150;
const MIN_RESPONSE_HEIGHT = 160;

/* ── Empty state when no URL has been typed yet ── */
export function AppContent() {
  useEffect(() => {
    applyTheme(getStoredTheme());
    useHistoryStore.getState().load();
    useCollectionStore.getState().load();
    useEnvStore.getState().load();
    checkForUpdates(true);
  }, []);

  const [editorHeights, setEditorHeights] = useState<Record<string, number>>({});
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const openKindTab = useTabStore((s) => s.openKindTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  // Only http tabs have an exportable/saveable request.
  const activeRequest = activeTab && activeTab.kind === "http" ? activeTab.request : null;
  const prodActive = useEnvStore((s) => selectActiveEnv(s)?.isProduction ?? false);

  const handleExportCurl = async () => {
    if (!activeRequest) return;
    await navigator.clipboard.writeText(generateCurl(activeRequest));
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  // Keyboard shortcuts. Every app-global chord is ⌘⇧+key; the two exceptions are
  // ⌘↵ (Send) and ⌘F (contextual find — body/response panels intercept it before
  // this window listener, so reaching here means "focus the header search").
  // Matching uses e.code because Shift changes e.key ("," → "<", "/" → "?").
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const metaShift = meta && e.shiftKey;
      if (metaShift && e.code === "KeyK") {
        e.preventDefault();
        setShowPalette((o) => !o);
        return;
      }
      // Palette owns its own arrow/Enter/Escape handling on its input; don't let
      // other shortcuts (⌘F, ⌘⇧N, ...) fire underneath it while it's open.
      if (showPalette) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowPalette(false);
        }
        return;
      }
      if (meta && !e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        const sendBtn = document.querySelector("[data-send-btn]") as HTMLButtonElement;
        sendBtn?.click();
        return;
      }
      // ⌘⇧/ opens the shortcuts help (leaves plain `?` free to type).
      if (metaShift && e.code === "Slash") {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
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
        if (showSaveModal) {
          setShowSaveModal(false);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        return;
      }
      if (metaShift && e.code === "KeyN") {
        e.preventDefault();
        const id = addTab();
        setActiveTab(id);
        return;
      }
      if (metaShift && e.code === "KeyW") {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        return;
      }
      if (meta && !e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        const input = searchInputRef.current;
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }
      if (metaShift && e.code === "KeyS") {
        e.preventDefault();
        if (activeRequest?.url.trim()) {
          setShowSaveModal(true);
        }
        return;
      }
      if (metaShift && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const tab = tabs[parseInt(e.code.slice(5), 10) - 1];
        if (tab) setActiveTab(tab.id);
        return;
      }
      if (metaShift && e.code === "Comma") {
        e.preventDefault();
        setShowSettings(true);
        return;
      }
      if (metaShift && e.code === "KeyE") {
        e.preventDefault();
        setShowEnvModal(true);
        return;
      }
      if (metaShift && e.code === "KeyM") {
        e.preventDefault();
        openKindTab("mcp");
        return;
      }
      if (metaShift && e.code === "KeyG") {
        e.preventDefault();
        openKindTab("graphql");
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
    openKindTab,
    showShortcutsModal,
    showEnvModal,
    showImportModal,
    showSaveModal,
    showSettings,
    showPalette,
    activeRequest,
  ]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      {/* Topbar */}
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onExportCurl={handleExportCurl}
        onManageEnv={() => setShowEnvModal(true)}
        onOpenMcp={() => openKindTab("mcp")}
        onOpenGraphql={() => openKindTab("graphql")}
        curlCopied={curlCopied}
        exportDisabled={!activeRequest}
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchInputRef}
        searchFocused={searchFocused}
        onSearchFocus={() => setSearchFocused(true)}
        onSearchBlur={() => setSearchFocused(false)}
      />

      {/* Body */}
      <div className="relative flex min-h-0 min-w-0 flex-1">
        {sidebarCollapsed ? (
          /* Fully hidden — a floating button to reopen the sidebar */
          <button
            type="button"
            data-testid="sidebar-expand"
            onClick={() => setSidebarCollapsed(false)}
            title="Show sidebar"
            aria-label="Show sidebar"
            className="absolute bottom-2 left-2 z-[var(--z-sticky)] flex h-7 w-7 items-center justify-center rounded border border-border bg-sidebar text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <>
            {/* Sidebar */}
            <div className="flex min-h-0 flex-shrink-0" style={{ width: sidebarWidth }}>
              <Sidebar
                onImportClick={() => setShowImportModal(true)}
                onCollapse={() => setSidebarCollapsed(true)}
                search={search}
              />
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
          </>
        )}

        {/* Main panel — in production the request bar's existing border turns red (R4) */}
        <div
          data-testid={prodActive ? "env-prod-indicator" : undefined}
          className="flex min-h-0 min-w-0 flex-1 flex-col bg-background"
        >
          {/* Tab strip */}
          <TabStrip />

          {/* Per-tab content */}
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const hasUrl = tab.request.url.trim().length > 0;
            const editorHeight = editorHeights[tab.id];
            // Non-http tab kinds get their own full-pane surface — no URL bar,
            // no request editor, no response panel.
            if (tab.kind === "mcp") {
              return (
                <div
                  key={tab.id}
                  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  style={{ display: isActive ? "flex" : "none" }}
                >
                  <McpPanel />
                </div>
              );
            }
            if (tab.kind === "graphql") {
              return (
                <div
                  key={tab.id}
                  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  style={{ display: isActive ? "flex" : "none" }}
                >
                  <GraphqlComingSoon />
                </div>
              );
            }
            return (
              <div
                key={tab.id}
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                style={{ display: isActive ? "flex" : "none" }}
              >
                <UrlBar />
                {hasUrl ? (
                  <>
                    <div
                      style={editorHeight ? { height: editorHeight, flexShrink: 0 } : undefined}
                      className={
                        editorHeight
                          ? "flex min-w-0 flex-col overflow-hidden"
                          : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                      }
                    >
                      <RequestEditor tabId={tab.id} />
                    </div>
                    <ResponsePanel
                      tabId={tab.id}
                      onResizeReset={() => {
                        setEditorHeights((prev) => {
                          const next = { ...prev };
                          delete next[tab.id];
                          return next;
                        });
                      }}
                      onResizeStart={(e) => {
                        e.preventDefault();
                        const startY = e.clientY;
                        const handle = e.currentTarget as HTMLElement;
                        const responsePanel = handle.parentElement;
                        const editorPanel =
                          responsePanel?.previousElementSibling as HTMLElement | null;
                        const startHeight =
                          editorPanel?.getBoundingClientRect().height ?? editorHeight ?? 200;
                        const splitHeight =
                          startHeight + (responsePanel?.getBoundingClientRect().height ?? 0);
                        const maxEditorHeight = Math.max(
                          MIN_EDITOR_HEIGHT,
                          splitHeight - MIN_RESPONSE_HEIGHT,
                        );
                        const onMove = (ev: MouseEvent) => {
                          const delta = ev.clientY - startY;
                          setEditorHeights((prev) => ({
                            ...prev,
                            [tab.id]: Math.min(
                              maxEditorHeight,
                              Math.max(MIN_EDITOR_HEIGHT, startHeight + delta),
                            ),
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
                    />
                  </>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col">
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
      {showSaveModal && activeRequest && (
        <SaveToCollectionModal request={activeRequest} onClose={() => setShowSaveModal(false)} />
      )}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
      {showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} />}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}

      <UpdateToast onOpenSettings={() => setShowSettings(true)} />
    </div>
  );
}
